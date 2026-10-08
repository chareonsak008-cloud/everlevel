// ระบบตีมอนออโต้ (v0.14)
// · ตีเฉพาะมอนที่ติ๊กไว้ ในวงรอบจุดที่กดเริ่ม (ตั้งระยะได้) · ติ๊ก "ตีตัวที่โจมตีเราก่อน" ได้
// · ใช้ยาเพิ่ม HP / SP อัตโนมัติตามเปอร์เซ็นต์ที่ตั้ง · ใช้สกิลที่ติ๊กไว้ (โจมตี / รอบตัว / บัฟ / รักษา)
// · เดินเก็บของ · ยาเลือดหมดหรือกระเป๋าเต็ม → ใช้ใบกลับเมืองแล้วหยุด
// · เดินเองระหว่างออโต้ = ย้ายจุดตีไปที่ที่หยุดเดิน · แตะมอนเอง = ตีตัวนั้นก่อน
import { TILE } from '../config.js';
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';
import { SKILLS, skillSp } from '../data/skills.js';

export const AUTO_RANGE = [3, 25];          // ช่อง
export const AUTO_DEFAULT = {
  hpOn: true, hpPct: 50, hpItem: 'auto',
  spOn: true, spPct: 30, spItem: 'auto',
  potAlways: false,                         // ใช้ยาอัตโนมัติแม้ไม่ได้เปิดออโต้
  range: 10, retaliate: true, loot: true, goHome: true,
  pick: {},                                 // { ชนิดมอน: true/false } (ไม่ระบุ = ตี ยกเว้น MVP)
  skills: [],                               // สกิลที่ติ๊กให้ใช้
};

const avg = (r) => (Array.isArray(r) ? (r[0] + r[1]) / 2 : r || 0);
const potsOf = (k) => Object.keys(ITEMS).filter((id) => ITEMS[id].type === 'usable' && ITEMS[id].heal && ITEMS[id].heal[k]).sort((a, b) => avg(ITEMS[a].heal[k]) - avg(ITEMS[b].heal[k]));
export const HP_POTS = potsOf('hp');
export const SP_POTS = potsOf('sp');
export const potHeal = (id, k) => Math.round(avg(ITEMS[id].heal[k]));

// ตรวจค่าที่โหลดจากเซฟ
export function normAuto(a) {
  const o = { ...AUTO_DEFAULT, pick: {}, skills: [] };
  if (!a || typeof a !== 'object') return o;
  const pct = (v, d) => (Number.isFinite(v) ? Math.max(5, Math.min(95, Math.round(v))) : d);
  for (const k of ['hpOn', 'spOn', 'potAlways', 'retaliate', 'loot', 'goHome']) if (typeof a[k] === 'boolean') o[k] = a[k];
  o.hpPct = pct(a.hpPct, o.hpPct); o.spPct = pct(a.spPct, o.spPct);
  o.hpItem = HP_POTS.includes(a.hpItem) ? a.hpItem : 'auto';
  o.spItem = SP_POTS.includes(a.spItem) ? a.spItem : 'auto';
  if (Number.isFinite(a.range)) o.range = Math.max(AUTO_RANGE[0], Math.min(AUTO_RANGE[1], Math.round(a.range)));
  if (a.pick && typeof a.pick === 'object') for (const [k, v] of Object.entries(a.pick)) if (MONSTERS[k] && typeof v === 'boolean') o.pick[k] = v;
  if (Array.isArray(a.skills)) o.skills = a.skills.filter((id) => SKILLS[id] && autoSkillRole(SKILLS[id])).slice(0, 30);
  return o;
}

// ประเภทสกิลสำหรับออโต้: attack = ใส่เป้าหมาย · aoe = รอบตัว · buff = บัฟตัวเอง · heal = รักษา
export function autoSkillRole(sk) {
  if (!sk || sk.kind !== 'active') return null;
  if (sk.target === 'enemy') return 'attack';
  if (sk.duration && sk.bonus) return 'buff';
  if (sk.mult || sk.radius) return 'aoe';
  if (sk.heal) return 'heal';
  return null;
}
export const ROLE_NAME = { attack: 'โจมตี', aoe: 'รอบตัว', buff: 'บัฟ', heal: 'รักษา' };

// มอนที่ปรากฏในแผนที่ (จุดเกิด + ลูกน้องบอส + ตัวที่ถูกเรียกมา)
export function mapMonsters(def, mobs) {
  const set = new Set();
  for (const s of (def && def.spawns) || []) if (MONSTERS[s.mob]) {
    set.add(s.mob);
    const B = MONSTERS[s.mob].boss;
    if (B && B.summon && MONSTERS[B.summon.mob]) set.add(B.summon.mob);
  }
  if (mobs) for (const m of mobs.list) if (MONSTERS[m.type]) set.add(m.type);
  return [...set].sort((a, b) => (MONSTERS[a].mvp ? 1 : 0) - (MONSTERS[b].mvp ? 1 : 0) || MONSTERS[a].level - MONSTERS[b].level);
}

export class AutoHunt {
  constructor(game) {
    this.g = game;
    this.on = false;
    this.anchor = null;
    this.think = 0;
    this.ban = new Map();         // มอน/ไอเทมที่ไปไม่ถึง → ข้ามชั่วคราว
    this.forced = null;           // มอนที่ผู้เล่นแตะเลือกเอง
    this.pauseUntil = 0; this.moved = false;
    this.leaving = null;          // { reason } กำลังกลับเมือง
    this.track = null;            // ตรวจว่าตีเป้าหมายไม่เข้า (ติดสิ่งกีดขวาง)
    this.lootTry = null;
    this.warned = {};
    this.status = '';
    this.onChange = null;         // UI อัปเดตสถานะ
  }

  get cfg() { return this.g.player.auto; }

  setStatus(s) { if (s !== this.status) { this.status = s; if (this.onChange) this.onChange(); } }

  canStart() {
    const g = this.g, pl = g.player;
    if (pl.dead) return 'หมดสติอยู่ เริ่มออโต้ไม่ได้';
    if (!g.mobs || g.map.def.safe) return 'ตีออโต้ได้เฉพาะนอกเมือง — ออกไปที่ทุ่งหรือดันเจี้ยนก่อน';
    if (g.warping) return 'กำลังวาร์ปอยู่';
    return null;
  }

  start() {
    const err = this.canStart();
    const g = this.g, pl = g.player;
    if (err) { g.hud.log(err, 'sys'); this.setStatus(''); if (this.onChange) this.onChange(); return false; }
    this.on = true;
    this.anchor = { x: pl.x, y: pl.y };
    this.ban.clear(); this.forced = null; this.leaving = null; this.track = null; this.lootTry = null; this.warned = {};
    this.pauseUntil = 0; this.moved = false; this.think = 0;
    g.gfx.setAutoZone(this.anchor.x, this.anchor.y, this.cfg.range);
    const c = this.cfg, n = Object.keys(MONSTERS).filter((t) => this.pickOk(t)).length;
    g.hud.log(`▶ เริ่มตีมอนออโต้ · ระยะ ${c.range} ช่องรอบจุดนี้${c.skills.length ? ` · ใช้สกิล ${c.skills.length} อย่าง` : ''}`, 'lv');
    if (!n) g.hud.log('ยังไม่ได้ติ๊กมอนสเตอร์ที่จะตีเลย — เปิดหน้าต่างออโต้ (H) แล้วติ๊กก่อน', 'sys');
    if (c.hpOn && !this.potion('hp', true)) g.hud.log('ไม่มียาเพิ่มเลือดในกระเป๋า — ออโต้จะใช้ยาไม่ได้', 'sys');
    g.sfx('questDone');
    this.setStatus('เริ่มทำงาน');
    if (this.onChange) this.onChange();
    return true;
  }

  stop(reason = '', { silent = false } = {}) {
    if (!this.on) return;
    const g = this.g, pl = g.player;
    this.on = false; this.leaving = null; this.forced = null; this.track = null; this.lootTry = null;
    g.gfx.hideAutoZone();
    if (pl.target && !pl.dead) g.clearTarget();
    if (!silent) g.hud.log(`■ หยุดตีมอนออโต้${reason ? ` (${reason})` : ''}`, 'info');
    this.setStatus('');
    if (this.onChange) this.onChange();
  }

  toggle() { if (this.on) this.stop('กดหยุดเอง'); else this.start(); }

  // ผู้เล่นเดินเอง → พักออโต้ แล้วย้ายจุดตีไปที่ที่หยุดเดิน
  manual() {
    if (!this.on) return;
    this.pauseUntil = this.g.time + 1.6;
    this.moved = true; this.forced = null;
  }

  // ผู้เล่นแตะมอนเอง → ตีตัวนั้นก่อน (แม้ไม่ได้ติ๊ก)
  manualTarget(m) { if (this.on && m && m.isMonster) { this.forced = m; this.moved = false; this.pauseUntil = 0; } }

  // เปลี่ยนแผนที่ (วาร์ป/กลับเมือง) → หยุด
  onMapLoaded() {
    if (!this.on) return;
    const why = this.leaving ? `กลับถึงเมืองแล้ว — ${this.leaving.reason}` : 'เปลี่ยนแผนที่';
    this.stop(why);
  }

  // ตั้งค่าเปลี่ยน (จาก UI)
  changed(key) {
    if (this.on && key === 'range') this.g.gfx.setAutoZone(this.anchor.x, this.anchor.y, this.cfg.range);
    if (key === 'hpItem' || key === 'spItem') this.warned = {};
    this.g.dirty = true;
  }

  pickOk(type) { const p = this.cfg.pick[type]; return p != null ? p : !(MONSTERS[type] && MONSTERS[type].mvp); }

  allows(m) {
    if (!m || m.dead) return false;
    if (m === this.forced) return true;
    return this.pickOk(m.type);
  }

  // damagePlayer: ยืนเฉย ๆ โดนตีแล้วสู้กลับ — ปิด "ตีตัวที่โจมตีก่อน" แล้วจะไม่สู้กลับตัวที่ไม่ได้ติ๊ก
  allowFightBack(src) { return !this.on || this.cfg.retaliate || this.allows(src); }

  inZone(e, extra = 0) {
    const a = this.anchor;
    return !!a && Math.hypot(e.x - a.x, e.y - a.y) <= this.cfg.range * TILE + extra;
  }

  banned(key) { const t = this.ban.get(key); if (t == null) return false; if (t <= this.g.time) { this.ban.delete(key); return false; } return true; }

  /* ---------- ลูปหลัก ---------- */

  update(dt) {
    const g = this.g, pl = g.player;
    this.think -= dt;
    if (this.think > 0) return;
    this.think = 0.15;
    if (this.on && (pl.dead || !g.mobs)) { this.stop(pl.dead ? 'หมดสติ' : 'อยู่ในเมือง'); return; }
    if (pl.dead || g.warping) return;
    if (this.on || this.cfg.potAlways) this.potions();
    if (!this.on) return;

    // เดินเองอยู่ → รอจนหยุดเดิน แล้วค่อยย้ายจุดตี
    if (this.pauseUntil > g.time || (this.moved && pl.path.length && !pl.target)) { this.setStatus('ควบคุมเอง…'); return; }
    if (this.moved) {
      this.moved = false;
      if (Math.hypot(pl.x - this.anchor.x, pl.y - this.anchor.y) > TILE) {
        this.anchor = { x: pl.x, y: pl.y };
        g.gfx.setAutoZone(this.anchor.x, this.anchor.y, this.cfg.range);
        g.hud.log('ย้ายจุดตีออโต้มาที่ตำแหน่งนี้', 'info');
      }
    }

    const c = this.cfg;
    if (!this.leaving && c.goHome && pl.inventory.stacks.length >= pl.inventory.capacity) this.leave('กระเป๋าเต็ม');
    if (this.leaving) { this.updateLeaving(); return; }
    if (pl.cast) { this.setStatus(pl.cast.item ? `กำลังใช้ ${pl.cast.name}` : 'กำลังร่ายสกิล'); return; }
    if (pl.pendingSkill || pl.lockUntil > g.time) return;
    if (this.useBuffs()) return;

    // เป้าหมายปัจจุบันยังใช้ได้ไหม
    let t = pl.target && !pl.target.dead ? pl.target : null;
    if (this.forced && (this.forced.dead || this.forced !== t)) this.forced = null;
    if (t && t !== this.forced) {
      const ok = (this.allows(t) || (c.retaliate && t.target === pl)) && this.inZone(t, 5 * TILE) && !this.banned(t);
      if (!ok) { g.clearTarget(); t = null; }
    }
    // ตัวที่กำลังตีเราอยู่มาก่อน
    if (c.retaliate && (!t || (t !== this.forced && t.target !== pl))) {
      const a = this.nearest((m) => m.target === pl && this.inZone(m, 6 * TILE));
      if (a) { t = a; g.setTarget(a); }
    }
    if (t) { this.fight(t); return; }

    // เก็บของ
    if (pl.pendingPickup) { this.setStatus('เก็บของ'); return; }
    if (this.lootTry) {
      const d = this.lootTry;
      if (g.drops.includes(d)) this.ban.set('d' + d.uid, g.time + 15);   // ไปไม่ถึง/เก็บไม่ได้ → ข้ามไปก่อน
      this.lootTry = null;
    }
    if (c.loot) {
      const d = this.nearestDrop();
      if (d) { g.approachDrop(d); this.lootTry = d; this.setStatus(`เก็บ ${ITEMS[d.id].name}`); return; }
    }

    // หาเป้าใหม่
    t = this.nearest((m) => this.allows(m) && this.inZone(m), (m) => (m.target === pl ? -4 * TILE : 0));
    if (t) { g.setTarget(t); this.fight(t); return; }

    // ไม่มีมอน → กลับจุดตีแล้วรอ
    if (Math.hypot(pl.x - this.anchor.x, pl.y - this.anchor.y) > 1.5 * TILE && !pl.path.length) g.moveTo(this.anchor.x, this.anchor.y, false);
    this.setStatus('รอมอนเกิดใหม่…');
  }

  nearest(filter, bias = () => 0) {
    const g = this.g, pl = g.player;
    if (!g.mobs) return null;
    let best = null, bs = Infinity;
    for (const m of g.mobs.list) {
      if (m.dead || this.banned(m) || !filter(m)) continue;
      const s = Math.hypot(m.x - pl.x, m.y - pl.y) + bias(m);
      if (s < bs) { bs = s; best = m; }
    }
    return best;
  }

  nearestDrop() {
    const g = this.g, pl = g.player;
    let best = null, bd = Infinity;
    for (const d of g.drops) {
      if (this.banned('d' + d.uid) || !this.inZone(d, 2 * TILE) || !pl.inventory.canAdd(d.id)) continue;
      const dd = Math.hypot(d.x - pl.x, d.y - pl.y);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  fight(t) {
    const g = this.g, pl = g.player;
    pl.engage = true;
    // ตีไม่เข้านานเกินไป (ไปไม่ถึง/ติดสิ่งกีดขวาง) → ข้ามตัวนี้ชั่วคราว
    if (!this.track || this.track.m !== t || this.track.hp !== t.hp) this.track = { m: t, hp: t.hp, at: g.time };
    else if (g.time - this.track.at > 7) {
      this.ban.set(t, g.time + 12); this.track = null; if (this.forced === t) this.forced = null;
      g.clearTarget(); this.setStatus('เข้าไม่ถึงเป้าหมาย หาตัวใหม่'); return;
    }
    this.useAttackSkill(t);
    this.setStatus(`กำลังตี ${t.name}`);
  }

  /* ---------- สกิล ---------- */

  ready(id) {
    const g = this.g, pl = g.player, sk = SKILLS[id], lv = pl.skillLv(id);
    if (!sk || !lv) return false;
    if (pl.cooldowns[id] != null && g.time < pl.cooldowns[id]) return false;
    if (sk.bow && pl.weaponType !== 'bow') return false;
    return pl.sp >= skillSp(sk, lv);
  }

  useAttackSkill(t) {
    const g = this.g, pl = g.player;
    if (pl.skillDelayUntil > g.time || this.wantHeal) return false;
    for (const id of this.cfg.skills) {
      const sk = SKILLS[id], role = autoSkillRole(sk);
      if ((role !== 'attack' && role !== 'aoe') || !this.ready(id)) continue;
      // ใช้เมื่อเป้าอยู่ในระยะสกิลแล้ว (ระหว่างเดินเข้าหาใช้การตีปกติพาเข้าไป ไม่สแปมข้อความ "เข้าใกล้ไม่ได้")
      const d = Math.hypot(t.x - pl.x, t.y - pl.y);
      if (d > (role === 'aoe' ? (sk.radius || 3) * TILE : g.skillRange(sk))) continue;
      g.useSkill(id);
      return true;
    }
    return false;
  }

  useBuffs() {
    const g = this.g, pl = g.player;
    if (pl.skillDelayUntil > g.time) return false;
    for (const id of this.cfg.skills) {
      if (autoSkillRole(SKILLS[id]) !== 'buff' || !this.ready(id)) continue;
      if (pl.buffs.some((b) => b.id === id && b.left > 2)) continue;
      g.useSkill(id);
      this.setStatus(`ใช้ ${SKILLS[id].name}`);
      return true;
    }
    return false;
  }

  // สกิลรักษาที่ติ๊กไว้และพร้อมใช้ (SP พอ · คูลดาวน์หมด)
  healSkillReady() {
    for (const id of this.cfg.skills) if (autoSkillRole(SKILLS[id]) === 'heal' && this.ready(id)) return id;
    return null;
  }

  idle() { const g = this.g, pl = g.player; return !pl.cast && !pl.pendingSkill && pl.lockUntil <= g.time && pl.skillDelayUntil <= g.time; }

  /* ---------- ยา ---------- */

  // เลือกยาที่จะใช้: ยาที่ตั้งไว้ · หรืออัตโนมัติ = ยาที่ฟื้นได้มากสุดโดยไม่ล้นเกินไป
  potion(k, any = false) {
    const pl = this.g.player, inv = pl.inventory, c = this.cfg;
    const list = (k === 'hp' ? HP_POTS : SP_POTS).filter((id) => inv.count(id) > 0);
    if (!list.length) return null;
    const pick = c[k + 'Item'];
    if (pick !== 'auto' && inv.count(pick) > 0) return pick;
    if (pick !== 'auto' && !any && !this.warned['sw' + k]) {
      this.warned['sw' + k] = true;
      this.g.hud.log(`${ITEMS[pick].name} หมดแล้ว — ใช้ยาอื่นในกระเป๋าแทน`, 'sys');
    }
    const miss = k === 'hp' ? pl.maxHp - pl.hp : pl.maxSp - pl.sp;
    let best = list[0];
    for (const id of list) if (potHeal(id, k) <= miss) best = id;
    return best;
  }

  potions() {
    const g = this.g, pl = g.player, c = this.cfg;
    this.wantHeal = false;
    if (c.hpOn && pl.hp < (pl.maxHp * c.hpPct) / 100) {
      // ติ๊กสกิลรักษาไว้ → ใช้สกิลก่อน (ประหยัดยา) · ถ้า HP ต่ำกว่าครึ่งของค่าที่ตั้ง ใช้ยาเลย
      const hs = this.on ? this.healSkillReady() : null;
      if (hs && this.idle()) { g.useSkill(hs); return; }
      if (hs && pl.hp > (pl.maxHp * c.hpPct) / 200) this.wantHeal = true;
      else if (g.useCd <= 0) {
        const id = this.potion('hp');
        if (id) { this.warned.hp = false; g.useItem(id); return; }
        if (this.on && c.goHome && !this.leaving) { this.leave('ยาเพิ่มเลือดหมด'); return; }
        if (!this.warned.hp && !this.leaving) { this.warned.hp = true; g.hud.log('⚠ ยาเพิ่มเลือดหมดแล้ว!', 'sys'); }
      }
    }
    if (c.spOn && g.useCd <= 0 && pl.sp < (pl.maxSp * c.spPct) / 100) {
      const id = this.potion('sp');
      if (id) { this.warned.sp = false; g.useItem(id); return; }
      if (!this.warned.sp) { this.warned.sp = true; g.hud.log('ยาเพิ่ม SP หมดแล้ว — ตีธรรมดาต่อไป', 'sys'); }
    }
  }

  /* ---------- กลับเมือง ---------- */

  leave(reason) {
    const g = this.g, pl = g.player;
    if (pl.inventory.count('return_scroll') <= 0) {
      g.hud.log(`⚠ ${reason} — ไม่มีใบกลับเมือง จึงหยุดออโต้อยู่ที่นี่`, 'sys');
      this.stop(reason, { silent: true });
      return;
    }
    this.leaving = { reason };
    g.hud.log(`⚠ ${reason} — ใช้ใบกลับเมืองแล้วจะหยุดออโต้`, 'sys');
  }

  updateLeaving() {
    const g = this.g, pl = g.player;
    if (pl.cast) { this.setStatus('กำลังร่ายใบกลับเมือง'); return; }
    if (pl.pendingSkill || pl.lockUntil > g.time) return;
    // ยังมีตัวตีเราอยู่ → สู้ให้หลุดก่อน (โดนตีจะหยุดร่าย)
    const a = this.nearest((m) => m.target === pl && Math.hypot(m.x - pl.x, m.y - pl.y) < 6 * TILE);
    if (a) { if (pl.target !== a) g.setTarget(a); pl.engage = true; this.useAttackSkill(a); this.setStatus(`สู้ให้หลุดก่อนกลับเมือง (${a.name})`); return; }
    if (pl.inventory.count('return_scroll') <= 0) { this.stop(`${this.leaving.reason} · ใบกลับเมืองหมด`); return; }
    if (pl.target) g.clearTarget();
    pl.path = []; pl.pendingPickup = null;
    g.useItem('return_scroll');
    this.setStatus('กำลังกลับเมือง');
  }
}
