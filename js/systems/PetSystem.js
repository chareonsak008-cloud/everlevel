// สัตว์เลี้ยงช่วยเก็บของ (v0.13) — เดินตามเจ้าของ · วิ่งไปเก็บของที่ตกในรัศมี · นำกลับมาใส่กระเป๋า · ความสามารถพิเศษตามตัว
// ข้อมูลอยู่ใน data/pets.js · โมเดลอยู่ใน render/Pets.js · ผู้เล่นคนอื่นเห็นสัตว์เลี้ยงของกันผ่าน presence (pt, ps)
import { TILE, PLAYER_SPEED } from '../config.js';
import { PETS, petStats, STAR_MAX } from '../data/pets.js';
import { ITEMS } from '../data/items.js';
import { findPath, smoothPath, lineClear } from '../core/Pathfinder.js';
import { THREE } from '../render/three.js';

const RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legend: 4 };
export const PET_FILTERS = [
  ['all', 'เก็บทุกอย่าง'],
  ['skipCommon', 'ข้ามของธรรมดา'],
  ['rare', 'เฉพาะของหายากขึ้นไป'],
];
const rankOf = (it) => (it.type === 'card' || it.type === 'box' ? 3 : RANK[it.rarity] ?? 0);
const isRare = (it) => rankOf(it) >= 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class PetSystem {
  constructor(game) {
    this.g = game;
    this.pet = null;            // สัตว์เลี้ยงของเรา { id, x, y, angle, moving, state, carry, ... }
    this.view = null;
    this.remote = new Map();    // RemotePlayer → { ent, id, stars }
    this.reviveReadyAt = 0;     // เอมเบอร์: เวลาเกมที่ชุบชีวิตได้อีกครั้ง
    this.fullWarnAt = -99;
  }

  get active() { return this.g.player.pets.active; }
  get def() { return this.pet ? PETS[this.pet.id] : null; }
  get mods() { const d = this.def; return (d && d.mods) || {}; }
  get name() { const d = this.def; return d ? d.name : ''; }

  // ค่าจริง = ระดับ + ดาว + ความสามารถ + ขนมสัตว์เลี้ยง
  stats(id = this.active) {
    const pl = this.g.player;
    if (!id) return null;
    const s = petStats(id, pl.pets.owned[id] || 0);
    return { ...s, radius: s.radius + pl.itemBuffSum('petRadius'), speed: Math.round(s.speed * (1 + pl.itemBuffSum('petSpeedPct') / 100)) };
  }

  /* ---------- เรียก / เก็บ ---------- */
  summon(id) {
    const pl = this.g.player;
    if (id && pl.pets.owned[id] == null) return 'ยังไม่มีสัตว์เลี้ยงตัวนี้';
    this.despawn();
    pl.pets.active = id || null;
    pl.updateBagCap();
    if (id) this.spawn();
    this.g.gfx.setRareBeam(!!(id && PETS[id].mods.rareBeam));
    return null;
  }

  spawn() {
    const pl = this.g.player, id = pl.pets.active;
    if (!id || !PETS[id]) return;
    const a = pl.angle || 0;
    const e = {
      id, x: pl.x - Math.sin(a) * 22 + Math.cos(a) * 12, y: pl.y - Math.cos(a) * 22 - Math.sin(a) * 12, angle: a, moving: false, speedK: 1,
      state: 'follow', carry: [], timer: 0, path: [], pathFor: null, target: null, magnetT: 1.5, grabCd: 1, vacuumT: 4, orbit: 0, skip: new Set(), repath: 0,
    };
    this.pet = e;
    this.view = this.g.gfx.addPet(e, id, pl.pets.owned[id] || 0);
    this.fly = this.view.hover > 0;
    this.g.gfx.setRareBeam(!!PETS[id].mods.rareBeam);
  }

  // เก็บสัตว์เลี้ยงกลับ: ของที่ขนอยู่เข้ากระเป๋าทันที
  despawn() {
    if (!this.pet) return;
    this.deliver(true);
    this.g.gfx.removePet(this.pet);
    this.pet = null; this.view = null;
  }

  // ดาวเปลี่ยน (ฟักได้ตัวซ้ำ) → อัปเดตออร่า ★5
  refreshStars() { if (this.view && this.pet) this.view.setStars(this.g.player.pets.owned[this.pet.id] || 0); }

  // เปลี่ยนแผนที่: ของบนพื้นหายหมด → ของที่ขนอยู่เข้ากระเป๋า แล้ววางสัตว์เลี้ยงข้างเจ้าของ
  onMapLoaded() {
    if (!this.active) return;
    if (!this.pet) { this.spawn(); return; }
    this.deliver(true);
    const pl = this.g.player, e = this.pet;
    e.x = pl.x - 18; e.y = pl.y + 10; e.path = []; e.state = 'follow'; e.target = null; e.skip.clear();
  }

  /* ---------- ส่งของให้เจ้าของ ---------- */
  deliver(silent = false) {
    const e = this.pet; if (!e || !e.carry.length) return;
    const list = e.carry; e.carry = [];
    if (this.view) this.view.load = 0;
    this.g.petDeliver(list, this.name, { silent, heal: this.mods.healPerItem || 0, autoSell: !!this.mods.autoSell, sell: this.mods.sell || 0 });
    if (!silent && this.view && (list.length >= 3 || Math.random() < 0.3)) this.view.cheer();
  }

  // หยิบของ: ลบออกจากพื้นทันที (ผู้เล่นเก็บซ้ำไม่ได้) แล้วให้ไอเทมลอยเข้าปากสัตว์เลี้ยง / ตัวเจ้าของ
  grab(d, toOwner = false) {
    const g = this.g;
    g.drops = g.drops.filter((x) => x !== d);
    if (g.player.pendingPickup === d) g.player.pendingPickup = null;
    if (toOwner) {
      // ของลอยเข้าหาเจ้าของ (ภาพ) · เข้ากระเป๋าตามเวลาเกม (ไม่ขึ้นกับการวาดภาพ)
      g.gfx.collectDrop(d, () => new THREE.Vector3(g.player.x / TILE, 1.1, g.player.y / TILE), 0.6);
      this.pending = (this.pending || 0) + 1;
      (this.batch = this.batch || []).push(d.id);
      if (!this.batchTimer) {
        this.batchTimer = true;
        g.schedule(0.65, () => { const list = this.batch; this.batch = []; this.batchTimer = false; g.petDeliver(list, this.name, { heal: this.mods.healPerItem || 0, autoSell: !!this.mods.autoSell, sell: this.mods.sell || 0 }); });
      }
      return;
    }
    const v = this.view;
    g.gfx.collectDrop(d, () => (v ? v.mouthPos() : new THREE.Vector3(d.x / TILE, 0.4, d.y / TILE)), 0.3);
    this.pet.carry.push(d.id);
  }

  // ของชิ้นนี้ควรเก็บไหม (ตามตัวกรองที่ผู้เล่นตั้ง)
  wants(d) {
    if (d.noPet || this.pet.skip.has(d.uid)) return false;
    const it = ITEMS[d.id]; if (!it) return false;
    const f = this.g.player.pets.filter;
    return f === 'rare' ? rankOf(it) >= 2 : f === 'skipCommon' ? rankOf(it) >= 1 || it.type === 'usable' : true;
  }

  /* ---------- อัปเดตทุกเฟรม ---------- */
  update(dt) {
    this.updateRemote(dt);
    const e = this.pet; if (!e || !this.view) return;
    const g = this.g, pl = g.player, m = this.mods, st = this.stats();
    const R = st.radius * TILE, spd = PLAYER_SPEED * st.speed / 100;
    e.moving = false; e.speedK = st.speed / 100;
    this.view.range = Math.min(st.radius, 14);
    // ไกลเจ้าของเกินไป (วาร์ป/ติดสิ่งกีดขวาง) → กระโดดไปหา
    if (dist(e, pl) > 15 * TILE) { e.x = pl.x - 16; e.y = pl.y + 8; e.path = []; if (e.state !== 'follow') { e.state = 'follow'; e.target = null; } }
    if (pl.dead) { this.follow(dt, spd); return; }
    // เอมเบอร์: ของในรัศมีอยู่บนพื้นได้นานขึ้น
    if (m.dropLife) for (const d of g.drops) if (!d.phx && dist(d, pl) <= R) { d.phx = true; d.expireAt += 90 * (m.dropLife - 1); }
    const want = (d) => this.wants(d) && dist(d, pl) <= R;

    // วาฬดวงดาว: ว่ายวนรอบเจ้าของ แล้วดูดของทั้งแผนที่เป็นรอบ ๆ
    if (m.vacuum) {
      e.orbit += dt * 0.6;
      this.moveToward(e, pl.x + Math.cos(e.orbit) * 2.4 * TILE, pl.y + Math.sin(e.orbit) * 2.4 * TILE, 2, spd * 1.3, dt, true);
      e.vacuumT -= dt;
      if (e.vacuumT <= 0) {
        const all = g.drops.filter((d) => this.wants(d));
        e.vacuumT = all.length ? m.vacuum : 1;
        if (all.length) {
          this.view.pick(); this.view.cheer();
          all.forEach((d) => this.grab(d, true));
          g.petNotice(`${this.name} ใช้ฝนดาวตก ดูดของ ${all.length} ชิ้นทั้งแผนที่!`);
        }
      }
      return;
    }
    // โกเลมแม่เหล็ก / ปลาหมึก: อยู่ข้างเจ้าของ แล้วดึงของในรัศมีมาพร้อมกัน
    if (m.magnet || m.grab) {
      this.follow(dt, spd);
      if (m.magnet) {
        e.magnetT -= dt;
        if (e.magnetT <= 0) {
          const list = g.drops.filter(want);
          e.magnetT = list.length ? m.magnet : 0.5;
          if (list.length) { this.view.pick(); list.forEach((d) => this.grab(d)); g.schedule(0.7, () => this.deliver()); }
        }
      } else {
        e.grabCd -= dt;
        if (e.grabCd <= 0) {
          const list = g.drops.filter(want).sort((a, b) => dist(a, e) - dist(b, e)).slice(0, m.grab);
          e.grabCd = list.length ? 2 : 0.4;
          if (list.length) { this.view.pick(); list.forEach((d) => this.grab(d)); g.schedule(0.6, () => this.deliver()); }
        }
      }
      this.view.load = 0;
      return;
    }

    // ปกติ: วิ่งไปเก็บทีละชิ้นจนเต็มตัว แล้วนำกลับมาส่ง
    const cap = st.carry;   // 0 = ไม่จำกัด
    const full = () => cap > 0 && e.carry.length >= cap;
    const choose = () => {
      const list = g.drops.filter(want);
      if (!list.length) return null;
      list.sort((a, b) => (m.rareFirst ? (isRare(ITEMS[b.id]) - isRare(ITEMS[a.id])) * 1e6 : 0) + dist(a, e) - dist(b, e));
      return list[0];
    };
    if (e.state === 'follow') {
      const t = !full() && choose();
      if (t) { e.target = t; e.state = 'seek'; e.path = []; e.pathFor = null; }
      else if (e.carry.length) e.state = 'return';
      else this.follow(dt, spd);
    }
    if (e.state === 'seek') {
      const t = e.target;
      if (!t || !g.drops.includes(t) || dist(t, pl) > R + TILE) { e.state = e.carry.length ? 'return' : 'follow'; e.target = null; }
      else {
        const r = this.moveToward(e, t.x, t.y, 5, spd, dt);
        if (r === 'blocked') { e.skip.add(t.uid); e.state = 'follow'; e.target = null; }
        else if (r) { this.view.pick(); this.grab(t); e.state = 'picking'; e.timer = 0.4; }
      }
    }
    if (e.state === 'picking') {
      e.timer -= dt;
      if (e.timer <= 0) {
        const t = !full() && choose();
        if (t) { e.target = t; e.state = 'seek'; e.path = []; e.pathFor = null; }
        else e.state = e.carry.length ? 'return' : 'follow';
      }
    }
    if (e.state === 'return') {
      const r = this.moveToward(e, pl.x, pl.y, 14, spd * 1.1, dt);
      if (r) { this.deliver(); e.state = 'follow'; }
    }
    this.view.load = cap ? e.carry.length / cap : Math.min(1, e.carry.length / 6);
  }

  // เดินตามเจ้าของ (ด้านหลังเยื้องขวา) · ยืนนิ่งเมื่อใกล้พอ
  follow(dt, spd) {
    const e = this.pet, pl = this.g.player, a = pl.angle || 0;
    const fx = pl.x - Math.sin(a) * 20 + Math.cos(a) * 14, fy = pl.y - Math.cos(a) * 20 - Math.sin(a) * 14;
    const d = Math.hypot(fx - e.x, fy - e.y);
    if (d > 12) this.moveToward(e, fx, fy, 6, spd * (d > 5 * TILE ? 1.6 : 1.15), dt);
    else e.angle = Math.atan2(pl.x - e.x, pl.y - e.y);
  }

  // เคลื่อนที่เข้าหาเป้าหมาย: สัตว์บินไปตรง ๆ · สัตว์เดินหาทางอ้อมสิ่งกีดขวาง (A*)
  // คืน true เมื่อถึง · 'blocked' ถ้าไปไม่ได้ · false ระหว่างทาง
  moveToward(e, tx, ty, stop, speed, dt, flyOverride = false) {
    const map = this.g.map;
    if (Math.hypot(tx - e.x, ty - e.y) <= stop) return true;
    let gx = tx, gy = ty;
    if (!this.fly && !flyOverride && map) {
      const key = Math.round(tx / 8) + ',' + Math.round(ty / 8);
      if (!lineClear(map, e, { x: tx, y: ty })) {
        e.repath -= dt;
        if (e.pathFor !== key || (!e.path.length && e.repath <= 0)) {
          e.pathFor = key; e.repath = 0.6;
          const p = findPath(map, Math.floor(e.x / TILE), Math.floor(e.y / TILE), Math.floor(tx / TILE), Math.floor(ty / TILE), 3000);
          if (!p || p.length > 60) { e.path = []; return 'blocked'; }
          e.path = smoothPath(map, { x: e.x, y: e.y }, p.slice(1).map((q) => ({ x: q.x * TILE + 8, y: q.y * TILE + 8 })));
        }
        if (e.path.length) { gx = e.path[0].x; gy = e.path[0].y; if (Math.hypot(gx - e.x, gy - e.y) < 4) { e.path.shift(); if (e.path.length) { gx = e.path[0].x; gy = e.path[0].y; } } }
      } else { e.path = []; e.pathFor = null; }
    }
    const dx = gx - e.x, dy = gy - e.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) return false;
    const step = Math.min(d, speed * dt);
    e.x += (dx / d) * step; e.y += (dy / d) * step;
    e.angle = Math.atan2(dx, dy);
    e.moving = true;
    return Math.hypot(tx - e.x, ty - e.y) <= stop;
  }

  /* ---------- ความสามารถที่ระบบเกมเรียกใช้ ---------- */
  dropMul() { return 1 + (this.mods.drop || 0) / 100; }
  cardMul() { return this.mods.card || 1; }
  boxUpChance() { return (this.mods.boxUp || 0) / 100; }
  meteorChance() { return (this.mods.meteor || 0) / 100; }

  // เอมเบอร์ชุบชีวิตเจ้าของ (1 ครั้งทุก 10 นาที) — คืน true ถ้าจะชุบให้
  tryRevive() {
    const m = this.mods;
    if (!m.revive || !this.pet || this.g.time < this.reviveReadyAt) return false;
    this.reviveReadyAt = this.g.time + m.revive;
    if (this.view) { this.view.pick(); this.view.cheer(); }
    return true;
  }
  reviveLeft() { return Math.max(0, this.reviveReadyAt - this.g.time); }

  /* ---------- สัตว์เลี้ยงของผู้เล่นคนอื่น (เดินตามเจ้าของอย่างเดียว) ---------- */
  syncRemote(players) {
    const g = this.g, alive = new Set();
    for (const r of players) {
      const id = r.petId && PETS[r.petId] ? r.petId : null;
      const cur = this.remote.get(r);
      if (!id) { if (cur) { g.gfx.removePet(cur.ent); this.remote.delete(r); } continue; }
      alive.add(r);
      const stars = Math.max(0, Math.min(STAR_MAX, r.petStars || 0));
      if (cur && cur.id === id && cur.stars === stars) continue;
      if (cur) g.gfx.removePet(cur.ent);
      const ent = { x: r.x - 18, y: r.y + 10, angle: r.angle || 0, moving: false, speedK: 1 };
      g.gfx.addPet(ent, id, stars);
      this.remote.set(r, { ent, id, stars });
    }
    for (const [r, cur] of [...this.remote]) if (!alive.has(r)) { g.gfx.removePet(cur.ent); this.remote.delete(r); }
  }

  updateRemote(dt) {
    for (const [r, cur] of this.remote) {
      const e = cur.ent, a = r.angle || 0;
      const fx = r.x - Math.sin(a) * 20 + Math.cos(a) * 14, fy = r.y - Math.cos(a) * 20 - Math.sin(a) * 14;
      const dx = fx - e.x, dy = fy - e.y, d = Math.hypot(dx, dy);
      e.moving = false;
      if (d > 12 * TILE) { e.x = fx; e.y = fy; }
      else if (d > 10) { const s = Math.min(d, PLAYER_SPEED * 1.25 * dt); e.x += (dx / d) * s; e.y += (dy / d) * s; e.angle = Math.atan2(dx, dy); e.moving = true; }
      else e.angle = Math.atan2(r.x - e.x, r.y - e.y);
      e.hidden = !!r.dead;
    }
  }

  clearRemote() { for (const cur of this.remote.values()) this.g.gfx.removePet(cur.ent); this.remote.clear(); }
}
