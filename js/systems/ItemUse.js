// ใช้ไอเทมใช้งานชุดใหม่ (v0.13): วาร์ป · บัฟ/ใบคูณ · ฟื้นฟู · ขยายกระเป๋า/คลัง · รีเซ็ต · เปลี่ยนชื่อ · ประกาศ · เรียกมอน · กล่องสุ่ม · ฟักไข่
import { TILE } from '../config.js';
import { ITEMS } from '../data/items.js';
import { CONSUMABLES, ADVENTURER_BOX, fmtDur } from '../data/consumables.js';
import { MAPS, START_MAP } from '../data/maps/index.js';
import { MONSTERS } from '../data/monsters.js';
import { STORAGE_CAPACITY } from '../data/shops.js';
import { validName } from '../net/Online.js';
import { askText } from '../ui/Prompt.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const STORAGE_UP = 20;

export function useConsumable(g, id) {
  const pl = g.player, it = CONSUMABLES[id], u = it && it.use;
  if (!it || !u) return;
  if (pl.inventory.count(id) <= 0) { g.hud.log(`${it.name} หมดแล้ว`, 'sys'); return; }
  if (pl.dead && !u.revive) return;
  if (u.revive && !pl.dead) { g.hud.log(`${it.name} ใช้ได้ตอนหมดสติเท่านั้น (ฟื้นตรงจุดที่ล้ม ไม่ต้องกลับเมือง)`, 'info'); return; }
  if (g.useCd > 0 || g.warping) return;
  g.itemCd = g.itemCd || {};
  if (it.cd && (g.itemCd[id] || 0) > g.time) { g.hud.log(`${it.name} ยังใช้ไม่ได้ รออีก ${Math.ceil(g.itemCd[id] - g.time)} วินาที`, 'info'); return; }
  if (pl.cast) { g.hud.log('กำลังร่ายอยู่ ใช้ไอเทมไม่ได้', 'info'); return; }
  const take = () => {
    pl.inventory.remove(id, 1);
    g.useCd = 0.35;
    if (it.cd) g.itemCd[id] = g.time + it.cd;
    g.refreshItemsUI();
    g.dirty = true;
  };
  // ไอเทมที่ต้องร่าย (ใบกลับเมือง ใบวาร์ป) — เดินหรือโดนตีระหว่างร่ายจะยกเลิก
  const cast = (secs, fn) => {
    pl.path = []; pl.target = null;
    pl.cast = { id: 'item:' + id, item: true, name: it.name, t: 0, total: secs, color: '#9adcff', fn };
    g.hud.log(`กำลังร่าย ${it.name}… (${secs} วินาที · เดินหรือโดนตีจะยกเลิก)`, 'info');
    g.sfx('cast');
  };

  /* ---------- บัฟ / ใบคูณ ---------- */
  if (u.buff) {
    const r = pl.addItemBuff(id);
    if (r.error) { g.hud.log(r.error, 'sys'); return; }
    take();
    const t = fmtDur(Math.round(r.left));
    g.hud.log(r.kind === 'extend' ? `ต่อเวลา ${it.name} → เหลือ ${t}` : r.kind === 'replace' ? `${it.name} แทนที่ ${ITEMS[r.prev].name} (${t})` : `ใช้ ${it.name}: ${it.effect} · ${t}`, 'r-' + it.rarity);
    g.sfx(it.cat === 'boost' ? 'levelUp' : 'heal', { gap: 0 });
    g.gfx.buffFx(pl, it.cat === 'boost' ? '#ffd36b' : it.cat === 'pet' ? '#ffb8e8' : '#9affb8');
    g.gfx.floatText(pl, it.cat === 'boost' && typeof it.icon[2] === 'string' ? it.icon[2].split('|').join(' ') : it.name, 'dmg buff', { h: 2.2, life: 1.6, rise: 0.6, drift: false });
    g.hud.setPlayer(pl); g.hud.setBuffs(pl.buffs); g.status.render();
    return;
  }

  /* ---------- วาร์ป ---------- */
  if (u.warp === 'random') {
    if (!g.randomTeleport()) { g.hud.log('หาจุดวาร์ปไม่ได้ ลองใหม่อีกครั้ง', 'sys'); return; }
    take();
    g.hud.log(`ใช้ ${it.name} — ฟึ่บ!`, 'info');
    return;
  }
  if (u.warp === 'town') {
    if (g.map.id === START_MAP && g.map.def.safe) { g.hud.log('อยู่ในเมืองแล้ว', 'info'); return; }
    cast(it.cast, () => { if (pl.inventory.count(id) <= 0) return; take(); g.hud.log('กลับเมือง Asteria Town', 'sys'); g.warp(START_MAP, null); });
    return;
  }
  if (u.warp === 'choose') {
    const maps = Object.keys(MAPS).filter((m) => pl.visited.has(m) && m !== g.map.id);
    if (!maps.length) { g.hud.log('ยังไม่มีแผนที่อื่นที่เคยไป — เดินทางไปแผนที่ใหม่ก่อน แล้วใบวาร์ปจะจำไว้ให้', 'sys'); return; }
    g.dialog.show({ name: it.name, title: 'เลือกแผนที่ที่เคยไป' }, 'จะไปที่ไหนดี? (ร่าย 1.5 วินาที)', [
      ...maps.map((m) => ({ label: esc(MAPS[m].name), sub: MAPS[m].safe ? 'เมือง' : 'ทุ่ง/ดันเจี้ยน', onSelect: () => cast(it.cast, () => { if (pl.inventory.count(id) <= 0) return; take(); g.hud.log(`วาร์ปไป ${MAPS[m].name}`, 'sys'); g.warp(m, null); }) })),
      { label: 'ยกเลิก', cls: 'ghost' },
    ]);
    return;
  }
  if (u.warp === 'friend') {
    if (g.mode !== 'online') { g.hud.log('ใบตามหาเพื่อนใช้ได้เฉพาะตอนเล่นออนไลน์', 'sys'); return; }
    const seen = new Set(), list = [];
    for (const p of g.online.peers() || []) {
      const P = p.presence || {};
      if (p.isMe || !P.n || !MAPS[P.m] || seen.has(P.n)) continue;
      seen.add(P.n); list.push(P);
    }
    if (!list.length) { g.hud.log('ยังไม่มีผู้เล่นคนอื่นออนไลน์อยู่', 'sys'); return; }
    g.dialog.show({ name: it.name, title: 'ผู้เล่นที่ออนไลน์อยู่' }, 'จะวาร์ปไปหาใคร? (ร่าย 2 วินาที)', [
      ...list.slice(0, 8).map((P) => ({ label: esc(String(P.n).slice(0, 16)), sub: `Lv.${Math.max(1, Math.min(99, Math.floor(P.lv) || 1))} · ${esc(MAPS[P.m].name)}`, onSelect: () => cast(it.cast, () => { if (pl.inventory.count(id) <= 0) return; take(); g.warpToFriend(String(P.n).slice(0, 16), P.m); }) })),
      { label: 'ยกเลิก', cls: 'ghost' },
    ]);
    return;
  }

  /* ---------- ฟื้นฟู ---------- */
  if (u.heal) {
    if (pl.hp >= pl.maxHp && pl.sp >= pl.maxSp) { g.hud.log('HP และ SP เต็มอยู่แล้ว', 'info'); return; }
    take();
    const hp = Math.round(pl.maxHp * (u.heal.hpPct || 0) / 100), sp = Math.round(pl.maxSp * (u.heal.spPct || 0) / 100);
    const dh = Math.min(hp, pl.maxHp - pl.hp), ds = Math.min(sp, pl.maxSp - pl.sp);
    pl.hp += dh; pl.sp += ds;
    g.sfx('heal');
    if (dh) g.gfx.floatText(pl, `+${Math.round(dh)}`, 'heal', { h: 1.6, drift: false });
    if (ds) g.gfx.floatText(pl, `+${Math.round(ds)}`, 'heal-sp', { h: 1.35, drift: false });
    g.gfx.healFx(pl, '#ff9ae0');
    g.hud.setPlayer(pl); g.status.render();
    return;
  }
  if (u.revive) { take(); g.reviveHere(u.revive, it.name); return; }

  /* ---------- ขยายพื้นที่ ---------- */
  if (u.bag) {
    if (pl.bagUps >= u.max) { g.hud.log('กระเป๋าขยายครบแล้ว (100 ช่อง)', 'sys'); return; }
    take(); pl.bagUps++; pl.updateBagCap();
    g.hud.log(`กระเป๋าขยายเป็น ${60 + pl.bagUps * 10} ช่อง (${pl.bagUps}/${u.max})`, 'lv');
    g.sfx('levelUp'); g.gfx.buffFx(pl, '#c8a0ff');
    g.refreshItemsUI(); g.saveNow(false);
    return;
  }
  if (u.storage) {
    if (g.storageUps >= u.max) { g.hud.log(`คลังขยายครบแล้ว (${STORAGE_CAPACITY + u.max * STORAGE_UP} ช่อง)`, 'sys'); return; }
    take(); g.storageUps++; g.storage.capacity = STORAGE_CAPACITY + g.storageUps * STORAGE_UP;
    g.hud.log(`คลังเก็บของของบัญชีขยายเป็น ${g.storage.capacity} ช่อง (${g.storageUps}/${u.max})`, 'lv');
    g.sfx('levelUp'); g.gfx.buffFx(pl, '#c8a0ff');
    g.refreshItemsUI(); g.saveNow(false);
    return;
  }

  /* ---------- รีเซ็ต ---------- */
  if (u.reset === 'stats') {
    if (!pl.statRefund()) { g.hud.log('ยังไม่ได้อัปสเตตัส ไม่ต้องรีเซ็ต', 'info'); return; }
    take();
    const n = pl.resetStats();
    g.hud.log(`ใช้ ${it.name}: ได้แต้มสถานะคืน ${n} แต้ม — กด C เพื่อลงใหม่`, 'lv');
    g.gfx.levelUp(pl, true);
    g.hud.setPlayer(pl); g.status.render(); g.saveNow(false);
    return;
  }
  if (u.reset === 'skills') {
    const before = pl.skillPoints;
    const n = pl.resetSkills();
    if (!n) { g.hud.log('ยังไม่ได้อัปสกิล ไม่ต้องรีเซ็ต', 'info'); pl.skillPoints = before; return; }
    take();
    g.hud.log(`ใช้ ${it.name}: ได้แต้มสกิลคืน ${n} แต้ม — กด K เพื่อเลือกสกิลใหม่`, 'lv');
    g.gfx.levelUp(pl, true);
    g.hud.setPlayer(pl); g.hud.setBuffs(pl.buffs); g.status.render(); g.skillWin.render(); g.hotbar.render(); g.saveNow(false);
    return;
  }

  /* ---------- เปลี่ยนชื่อ ---------- */
  if (u.rename) {
    askText(g.root, { title: 'ตั้งชื่อตัวละครใหม่', hint: `ชื่อปัจจุบัน: ${pl.name} · 2–16 ตัวอักษร ห้ามซ้ำกับผู้เล่นอื่น`, placeholder: 'ชื่อใหม่', max: 16, ok: 'เปลี่ยนชื่อ' }).then(async (name) => {
      if (!name || pl.inventory.count(id) <= 0) return;
      const bad = validName(name);
      if (bad) { g.hud.log(bad, 'sys'); return; }
      if (name === pl.name) { g.hud.log('ชื่อเดิมอยู่แล้ว', 'info'); return; }
      if (g.cloud && g.online.renameChar) {
        g.hud.log('กำลังตรวจชื่อ…', 'sys');
        const err = await g.online.renameChar(name, pl.name);
        if (err) { g.hud.log(err, 'sys'); return; }
      }
      take();
      const old = pl.name;
      pl.name = name;
      g.gfx.setName(pl, name);
      g.hud.setPlayer(pl);
      g.hud.log(`เปลี่ยนชื่อจาก ${old} เป็น ${name} แล้ว`, 'lv');
      g.saveNow(false, true);
    });
    return;
  }

  /* ---------- ประกาศทั้งเซิร์ฟเวอร์ ---------- */
  if (u.shout) {
    if (g.mode !== 'online') { g.hud.log('โทรโข่งประกาศใช้ได้เฉพาะตอนเล่นออนไลน์', 'sys'); return; }
    askText(g.root, { title: 'ประกาศถึงผู้เล่นทุกคน', hint: 'ทุกคนที่ออนไลน์ทุกแผนที่จะเห็นข้อความนี้ (สูงสุด 80 ตัวอักษร)', placeholder: 'เช่น หาปาร์ตี้ไปตีบอสภูเขาไฟ', max: u.shout, ok: 'ประกาศ' }).then((text) => {
      if (!text || pl.inventory.count(id) <= 0) return;
      take();
      g.sendShout(text);
    });
    return;
  }

  /* ---------- เรียกมอนสเตอร์ ---------- */
  if (u.summon) {
    if (!g.mobs) { g.hud.log('ใช้ในเมืองไม่ได้ ต้องออกไปที่ทุ่งหรือดันเจี้ยนก่อน', 'sys'); return; }
    let type;
    if (u.summon === 'mvp') {
      const all = Object.keys(MONSTERS).filter((k) => MONSTERS[k].mvp);
      type = all[Math.floor(Math.random() * all.length)];
    } else {
      const here = [...new Set((g.map.def.spawns || []).map((s) => s.mob))].filter((k) => MONSTERS[k] && !MONSTERS[k].mvp);
      if (!here.length) { g.hud.log('แผนที่นี้เรียกมอนสเตอร์ไม่ได้', 'sys'); return; }
      type = here[Math.floor(Math.random() * here.length)];
    }
    take();
    const m = g.summonMonster(type, u.summon === 'mvp' ? 3 : 1.6);
    if (!m) return;
    if (u.summon === 'mvp') {
      g.hud.log(`⚠ ${pl.name} หักกิ่งไม้โลหิต — MVP ${m.name} ปรากฏตัว!`, 'r-epic');
      g.hud.levelBanner('MVP!', `${m.name} ปรากฏตัว`);
      g.gfx.shake(0.4); g.sfx('bossWindup');
    } else g.hud.log(`กิ่งไม้หักดังกร๊อบ… ${m.name} โผล่ออกมา!`, 'r-uncommon');
    return;
  }

  /* ---------- กล่องสุ่ม ---------- */
  if (u.box) {
    take();
    let r = Math.random() * ADVENTURER_BOX.reduce((a, [, w]) => a + w, 0), got = ADVENTURER_BOX[0][0];
    for (const [k, w] of ADVENTURER_BOX) { if ((r -= w) <= 0) { got = k; break; } }
    const gi = ITEMS[got];
    if (pl.inventory.add(got, 1) <= 0) { g.spawnDrop(got, pl.x, pl.y); g.hud.log(`เปิด${it.name}ได้ ${gi.name} (กระเป๋าเต็ม จึงวางไว้ที่พื้น)`, 'r-' + (gi.rarity || 'common')); }
    else g.hud.log(`เปิด${it.name}ได้ ${gi.name}!`, 'r-' + (gi.rarity || 'common'));
    g.sfx('coin');
    g.gfx.bursts.spawn(pl.x / TILE, 1.0, pl.y / TILE, '#c8a0ff', 18, 1.0, 1.8);
    g.gfx.floatText(pl, `+ ${gi.name}`, 'loot r-' + (gi.rarity || 'common'), { h: 2.0, life: 1.6, rise: 0.6, drift: false });
    g.refreshItemsUI();
    return;
  }

  /* ---------- ฟักไข่สัตว์เลี้ยง ---------- */
  if (u.hatch) { g.hatchEgg(id); return; }
}
