// v0.25.0: ผลของอาวุธระหว่างต่อสู้ — ธาตุ/เผ่า/ขนาด, Melee/Ranged DMG%, ดูดเลือด/ดูด SP, พาสซีฟเกรดทอง/แดง
import { ITEMS } from '../data/items.js?v=0.93.0-p3.35';
import { mobTraits, elementMul, ELEMENT_COLOR } from '../data/affixes.js?v=0.93.0-p3.35';

const weaponOf = (pl) => (pl.equip.weapon && ITEMS[pl.equip.weapon]) || null;
const avg = (r) => (r ? (r[0] + r[1]) / 2 : 0);

// ปรับดาเมจขาออก (เรียกก่อนหัก HP มอน) — opts: { magic, element, proc, basic }
export function outgoing(game, m, r, opts = {}) {
  const pl = game.player, B = pl.bonus || {};
  if (!r || r.miss || !(r.amount > 0)) return;
  const w = weaponOf(pl), tr = mobTraits(m.type, m.data);
  const ranged = !opts.magic && pl.weaponType === 'bow';
  let pct = (opts.magic ? 0 : ranged ? B.rangedPct || 0 : B.meleePct || 0)
    + Math.min(60, (B['vs_' + tr.race] || 0) + (B['vs_' + tr.element] || 0) + (B['vs_' + tr.size] || 0));   // v0.29: เพดาน +60%
  const P = w && w.passive;
  if (P && P.kind === 'execute' && m.hp / m.maxHp < P.hp / 100) pct += P.value;
  const el = opts.element || (opts.magic ? null : w && w.element);
  const mul = (1 + pct / 100) * elementMul(el, tr.element, tr.race);
  if (mul !== 1) r.amount = Math.max(1, Math.round(r.amount * mul));
  r.weak = mul >= 1.2;
}

// หลังดาเมจเข้า: ดูดเลือด/SP + พาสซีฟ
export function afterHit(game, m, r, opts = {}) {
  const pl = game.player, B = pl.bonus || {};
  if (!r || r.miss || pl.dead || opts.proc) return;
  let healed = false;
  if (B.lifesteal) { const h = Math.max(1, Math.round(r.amount * B.lifesteal / 100)); pl.hp = Math.min(pl.maxHp, pl.hp + h); healed = true; }
  if (B.spDrain && Math.random() < 0.5) { pl.sp = Math.min(pl.maxSp, pl.sp + Math.max(1, Math.round(r.amount * B.spDrain / 100))); healed = true; }
  const w = weaponOf(pl), P = w && w.passive;
  if (P) {
    const roll = () => Math.random() * 100 < (P.chance || 0);
    if (P.kind === 'bolt' && !opts.magic && roll() && !m.dead) {
      const amt = Math.max(1, Math.round(avg(pl.stats.atk) * P.mult));
      game.schedule(0.12, () => {
        if (m.dead) return;
        game.gfx.lightning?.(m.x, m.y, ELEMENT_COLOR[P.element] || '#9ad8ff');
        game.damageMonster(m, { miss: false, crit: false, amount: amt }, { magic: true, element: P.element, proc: true });
      });
      game.hud.log(`⚡ ${w.name}: สายฟ้าฟาด!`, 'info');
    }
    if (P.kind === 'heal_on_hit' && roll()) {
      const h = Math.round(pl.maxHp * P.value / 100); pl.hp = Math.min(pl.maxHp, pl.hp + h);
      game.gfx.floatText(pl, `+${h}`, 'heal', { h: 1.6, drift: false }); healed = true;
    }
    if (P.kind === 'nova' && opts.magic && roll()) {
      const amt = Math.max(1, Math.round(avg(pl.stats.matk) * P.mult));
      const list = (game.mobs?.list || []).filter((o) => !o.dead && Math.hypot(o.x - m.x, o.y - m.y) <= P.radius);
      game.gfx.strikeFx?.(m, ELEMENT_COLOR[P.element] || '#ff3a5a');
      game.schedule(0.15, () => { for (const o of list) if (!o.dead) game.damageMonster(o, { miss: false, crit: false, amount: amt }, { magic: true, element: P.element, proc: true }); });
    }
    if (P.kind === 'multishot' && opts.basic && roll()) {
      const o = (game.mobs?.list || []).filter((x) => x !== m && !x.dead && Math.hypot(x.x - m.x, x.y - m.y) < 110).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))[0];
      if (o) {
        game.gfx.projectile?.(m, o, { kind: 'arrow', dur: 0.18, arc: 0.1 });
        game.schedule(0.2, () => { if (!o.dead) game.damageMonster(o, { miss: false, crit: false, amount: Math.max(1, Math.round(r.amount * P.mult)) }, { proc: true }); });
      }
    }
    if (P.kind === 'crit_rush' && r.crit) buff(pl, w, { aspdPct: P.value }, P.dur);
  }
  if (healed) game.hud.setPlayer(pl);
}

function buff(pl, w, bonus, dur) {
  pl.addBuff('wp_' + (w.baseId || 'weapon'), 1, bonus, dur);
  const b = pl.buffs[pl.buffs.length - 1]; b.itemId = pl.equip.weapon; b.title = `${w.name} · ${w.passive.text}`;
}

// ฆ่ามอน
export function onKill(game) {
  const pl = game.player, w = weaponOf(pl), P = w && w.passive;
  if (P && P.kind === 'sp_on_kill') { pl.sp = Math.min(pl.maxSp, pl.sp + Math.round(pl.maxSp * P.value / 100)); game.hud.setPlayer(pl); }
}
// ใช้สกิลเสร็จ: echo รีเซ็ตดีเลย์ · aura เมื่อฮีล
export function onSkill(game, sk, kind) {
  const pl = game.player, w = weaponOf(pl), P = w && w.passive;
  if (!P) return;
  if (P.kind === 'echo' && Math.random() * 100 < P.chance) { pl.skillDelayUntil = game.time; game.gfx.floatText(pl, 'ECHO!', 'heal-sp', { h: 1.9, drift: false }); }
  if (P.kind === 'aura' && kind === 'heal') buff(pl, w, { matkPct: P.value, aspdPct: 5 }, P.dur);
}
// ดาเมจขาเข้า: guard
export function incoming(game, amount) {
  const pl = game.player, w = weaponOf(pl), P = w && w.passive;
  if (P && P.kind === 'guard' && pl.hp / pl.maxHp < P.hp / 100) return Math.max(1, Math.round(amount * (1 - P.value / 100)));
  return amount;
}
