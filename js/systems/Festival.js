// v0.79 อีเวนต์ตามเทศกาล — เปิดเองตามปฏิทิน (เวลาไทยจากเซิร์ฟเวอร์ผ่าน EventService)
// · ช่วงเทศกาล: ทุกแผนที่ล่า (ไม่ใช่เมือง/ดันเจี้ยน) มีมอนเทศกาลเพิ่ม (ปรับเลเวลตามมอนในแผนที่) + บอสเทศกาลแผนที่ละ 1 ตัว
// · ของสะสมเทศกาลแลกของที่หน้าต่างเทศกาลได้ทุกเมื่อ · ออร่าเทศกาลแลกได้เฉพาะช่วงเทศกาล (+3 วัน) แล้วเป็นของเราถาวร
import { MONSTERS } from '../data/monsters.js?v=0.88.0';
import { ITEMS } from '../data/items.js?v=0.88.0';
import { COSTUME_BY_ID } from '../data/costumes.js?v=0.88.0';
import { scaledData } from '../data/dungeons.js?v=0.88.0';
import { FESTIVALS, FEST_GRACE, FEST_SHOP, FEST_AURA_COST, festivalsAt, nextFestivals } from '../data/festivals.js?v=0.88.0';

export class Festival {
  constructor(game) { this.g = game; this.seen = new Set(); this.t = 3; this.ids = ''; }

  now() { const f = window.__festForce; if (f && FESTIVALS[f]) { const y = new Date().getUTCFullYear(); const r = FESTIVALS[f].range(y) || FESTIVALS[f].range(y + 1); return r ? r[0] + 3600000 : Date.now(); } return this.g.events ? this.g.events.now() : Date.now(); }
  active() { return festivalsAt(this.now()); }
  shopOpen() { return festivalsAt(this.now(), FEST_GRACE); }
  upcoming() { return nextFestivals(this.now()); }
  isOn(id) { return this.active().some((f) => f.id === id); }
  auraOpen(id) { return this.shopOpen().some((f) => f.id === id); }

  // มอนเทศกาลเพิ่มเข้าแผนที่ (เรียกตอนโหลดแผนที่)
  extraSpawns(def) {
    if (!def || def.safe || def.instance || !Array.isArray(def.spawns)) return [];
    const act = this.active(); if (!act.length) return [];
    const norm = def.spawns.filter((s) => MONSTERS[s.mob] && !MONSTERS[s.mob].mvp && !MONSTERS[s.mob].boss && !MONSTERS[s.mob].fest);
    if (!norm.length) return [];
    const lv = norm.map((s) => MONSTERS[s.mob].level), L = Math.max(1, Math.min(150, Math.round((Math.min(...lv) + Math.max(...lv)) / 2)));
    const areas = norm.flatMap((s) => s.areas || []);
    const out = [];
    for (const F of act) {
      if (!MONSTERS[F.mob] || !MONSTERS[F.boss]) continue;
      out.push({ mob: F.mob, count: 4, areas, festL: L, fest: F.id }, { mob: F.boss, count: 1, areas, festL: Math.min(150, L + 3), fest: F.id });
    }
    return out;
  }

  // ปรับเลเวล/ค่าพลังมอนเทศกาลตามแผนที่
  scale(mobs) {
    for (const m of (mobs && mobs.list) || []) {
      const base = MONSTERS[m.type]; if (!base || !base.fest || m.festScaled) continue;
      const L = (m.spawnDef && m.spawnDef.festL) || 10;
      const d = scaledData(m.type, L, base.festBoss ? { exp: 1.2 } : { exp: 1.3 });
      d.respawn = base.respawn; d.aggressive = base.aggressive; d.aggroRange = base.aggroRange || 0;
      d.name = `${base.name}`;
      m.data = d; m.level = L; m.name = d.name; m.maxHp = d.hp; m.hp = d.hp; m.speed = d.speed;
      m.stats = { atk: d.atk, def: d.def, mdef: d.mdef || 0, hit: d.hit, flee: d.flee, crit: d.crit };
      m.festScaled = true;
    }
  }

  // ทุก ~30 วินาที: ประกาศตอนเทศกาลเริ่ม (เห็นครั้งแรกในรอบนี้)
  update(dt) {
    this.t -= dt; if (this.t > 0 || !this.g.started) return;
    this.t = 30;
    const act = this.active(), ids = act.map((f) => f.id).join(',');
    for (const F of act) if (!this.seen.has(F.id)) {
      this.seen.add(F.id);
      this.g.hud.log(`${F.icon} อีเวนต์ "${F.name}" เปิดแล้ว! ${F.desc} · เปิดดูที่ปุ่ม "กิจกรรม"`, 'r-epic');
      if (this.ids !== '' || !this.announced) { this.g.hud.levelBanner(`${F.icon} ${F.name}`, 'มอนเทศกาลออกมาแล้วทุกแผนที่ล่า!'); this.announced = true; }
    }
    if (ids !== this.ids) { const first = this.ids === ''; this.ids = ids; if (!first && this.g.map && !this.g.map.def.safe) this.g.hud.log('เทศกาลเปลี่ยนแล้ว — มอนเทศกาลจะเปลี่ยนเมื่อย้ายแผนที่', 'sys'); }
    if (this.g.festWin && this.g.festWin.open) this.g.festWin.render();
  }

  count(token) { return this.g.player.inventory.count(token); }

  // แลกของด้วยของสะสม (เลือกชนิดของสะสมที่ใช้จ่าย)
  exchange(token, id) {
    const g = this.g, pl = g.player, x = FEST_SHOP.find((s) => s.id === id);
    if (!x || !ITEMS[id] || !ITEMS[token] || !ITEMS[token].fest) return;
    if (this.count(token) < x.cost) { g.hud.log(`${ITEMS[token].name}ไม่พอ`, 'sys'); return; }
    if (!pl.inventory.fits([[id, x.n]])) { g.hud.log('กระเป๋าเต็ม ทำช่องว่างก่อนแลกของ', 'sys'); return; }
    pl.inventory.remove(token, x.cost); pl.inventory.add(id, x.n);
    g.hud.log(`🎉 แลก ${ITEMS[id].name} ×${x.n} (ใช้${ITEMS[token].name} ${x.cost})`, 'r-' + (ITEMS[id].rarity || 'common'));
    g.sfx('coin'); g.refreshItemsUI(); g.saveNow(false);
    if (g.festWin) g.festWin.render();
  }

  buyAura(fid) {
    const g = this.g, pl = g.player, F = FESTIVALS[fid], it = F && COSTUME_BY_ID[F.aura];
    if (!it) return;
    if (!this.auraOpen(fid)) { g.hud.log('ออร่านี้แลกได้เฉพาะช่วงเทศกาลเท่านั้น', 'sys'); return; }
    if (pl.fashion.owned.has(it.id)) { g.hud.log('คุณมีออร่านี้แล้ว', 'info'); return; }
    if (this.count(F.token) < FEST_AURA_COST) { g.hud.log(`${ITEMS[F.token].name}ไม่พอ (ต้องใช้ ${FEST_AURA_COST})`, 'sys'); return; }
    pl.inventory.remove(F.token, FEST_AURA_COST);
    pl.addFashion(it.id);
    g.hud.log(`✨ ได้รับออร่าเทศกาล "${it.name}" (ถาวร) · สวมใส่ได้ที่ตู้แฟชั่น`, 'f-legend');
    g.sfx('levelUp', { gap: 0 });
    g.refreshItemsUI(); g.dirty = true; g.saveNow(false);
    if (g.festWin) g.festWin.render();
  }
}
