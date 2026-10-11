// ผู้เล่นคนอื่นในแผนที่เดียวกัน (v0.11) — สร้างจาก presence ของห้องออนไลน์
// ข้อมูลจากผู้เล่นอื่นเชื่อถือไม่ได้: กรองทุกช่องก่อนใช้ (สี ชื่อ ตัวเลข ไอดีแฟชั่น ข้อความ)
import { COSTUME_BY_ID } from '../data/costumes.js';
import { MAPS } from '../data/maps/index.js';
import { JOBS } from '../data/progression.js';
import { PETS } from '../data/pets.js';
import { ACH_BY_ID } from '../data/collection.js';

const COLOR = /^#[0-9a-f]{6}$/i;
const ENUMS = {
  hairStyle: ['spiky', 'short', 'ponytail', 'none'], accessory: ['backpack', 'quiver', 'none', 'ribbon', 'hat', 'guard', 'smith', 'clerk', 'wizard'],
  weapon: ['none', 'knife', 'sword', 'staff', 'mace', 'bow'], jobGear: ['none', 'swordsman', 'mage', 'archer', 'acolyte'], headgear: ['bandana', 'crown', 'flower'],
};
const COLOR_KEYS = ['hair', 'skin', 'eye', 'tunic', 'pants', 'boot', 'belt', 'scarf', 'headColor', 'shield', 'cape', 'bladeGlow', 'gem', 'bowColor', 'hatColor', 'orbColor'];
const clampNum = (v, lo, hi, d = 0) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const cleanText = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').slice(0, n);

export function cleanLook(lk) {
  const L = { hair: '#e8a838', skin: '#f6d2b0', eye: '#2a2030', tunic: '#3f6fc4', pants: '#5a4634', boot: '#3a2a20', belt: '#8a5a30', accessory: 'none', hairStyle: 'spiky', weapon: 'none', scarf: null };
  if (!lk || typeof lk !== 'object') return L;
  for (const k of COLOR_KEYS) if (typeof lk[k] === 'string' && COLOR.test(lk[k])) L[k] = lk[k]; else if (lk[k] === null && k in L) L[k] = null;
  for (const [k, list] of Object.entries(ENUMS)) if (list.includes(lk[k])) L[k] = lk[k];
  return L;
}

class RemotePlayer {
  constructor(peer) {
    this.peer = peer;
    this.isRemote = true;
    this.angle = 0; this.moving = false; this.speedFactor = 0; this.dead = false; this.lift = 0; this.cast = null;
    this.hp = 100; this.maxHp = 100;
    this.bubble = null;
    // v0.16.1: ผู้ส่งบอกตำแหน่ง + ความเร็ว + เวลา (s) เป็นระยะ — ระหว่างแพ็กเก็ตเดินต่อเองด้วยความเร็วนั้น แล้วค่อย ๆ ปรับเข้าหาตำแหน่งจริง
    this.clock = 0; this.anchor = null; this.off = undefined; this.timed = false; this.movingFor = 0;
    this.apply(peer.presence, true);
  }

  apply(P, first = false) {
    const map = MAPS[P.m];
    this.maxX = map ? map.width * 16 : 9999; this.maxY = map ? map.height * 16 : 9999;
    const x = clampNum(P.x, 0, this.maxX), y = clampNum(P.y, 0, this.maxY);
    if (first) { this.x = x; this.y = y; }
    this.tx = x; this.ty = y;
    if (Number.isFinite(P.s)) this.pushSample(P.s, x, y, P.vx, P.vy, P.tp, P.e); else this.timed = false;
    this.angle = clampNum(P.a, -10, 10, 0);
    this.mv = !!P.mv;
    this.dead = !!P.dead;
    this.hp = clampNum(P.h, 0, 1, 1) * 100;
    const lv = clampNum(Math.floor(P.lv), 1, 99, 1);
    const job = JOBS[P.j] ? JOBS[P.j].name : 'Novice';
    this.name = `${cleanText(P.n, 16) || 'นักผจญภัย'}`;
    this.title = `Lv.${lv} ${job}`;
    const lookSig = JSON.stringify(P.lk || {}) + '|' + (Array.isArray(P.fw) ? P.fw.join(',') : '');
    this.lookChanged = !first && lookSig !== this.lookSig;
    this.lookSig = lookSig;
    this.look = cleanLook(P.lk);
    this.fw = (Array.isArray(P.fw) ? P.fw : []).filter((id) => typeof id === 'string' && COSTUME_BY_ID[id]).slice(0, 8);
    if (P.say && typeof P.say === 'object' && P.say.t !== this.sayT) {
      // เห็นกันครั้งแรก: แสดงเฉพาะข้อความล่าสุดไม่เกิน 15 วินาที (นาฬิกาแต่ละเครื่องอาจต่างกัน) · หลังจากนั้นแสดงทุกข้อความใหม่
      const fresh = !first || Math.abs(Date.now() - clampNum(P.say.t, 0, 9e15)) < 15000;
      this.sayT = P.say.t;
      const text = cleanText(P.say.m, 120);
      if (text && fresh) { this.bubble = { text, t: 5 }; this.newSay = text; }
    }
    // v0.18: ฉายา — รับเฉพาะรหัสที่มีในเกม (แสดงชื่อจากข้อมูลในเครื่องเรา ไม่ใช้ข้อความจากคนอื่นตรง ๆ)
    const ach = typeof P.tt === 'string' && ACH_BY_ID[P.tt] ? ACH_BY_ID[P.tt] : null;
    this.honor = ach ? ach.title : ''; this.honorTier = ach ? ach.tier : '';
    this.petId = typeof P.pt === 'string' && PETS[P.pt] ? P.pt : null;   // v0.13: สัตว์เลี้ยงของผู้เล่นคนนี้
    this.petStars = clampNum(Math.floor(P.ps), 0, 5, 0);
    if (P.at !== this.atkSeq) { if (this.atkSeq !== undefined) this.attacked = P.ak === 'shoot' || P.ak === 'cast' ? P.ak : 'melee'; this.atkSeq = P.at; }
  }

  fashionItems() {
    const out = {};
    for (const id of this.fw) { const it = COSTUME_BY_ID[id]; if (it) out[it.slot] = it; }
    return out;
  }

  // จุดอ้างอิงล่าสุดจากผู้ส่ง (s = เวลาของผู้ส่ง มิลลิวินาที) — เวลาเครื่องเราเทียบด้วย offset ที่เล็กที่สุดที่เคยเห็น (= แพ็กเก็ตที่มาเร็วสุด)
  pushSample(s, x, y, vx, vy, tp, e) {
    this.timed = true;
    const A = this.anchor;
    if (A && s <= A.s) return;                              // ซ้ำ / มาช้ากว่าที่เคยได้
    if (Number.isFinite(tp)) { if (this.tp !== undefined && tp !== this.tp) { this.x = x; this.y = y; } this.tp = tp; }   // ผู้ส่งวาร์ปในแมพ: ย้ายตามทันที
    const off = this.clock * 1000 - s;
    this.off = this.off === undefined ? off : Math.min(off, this.off + 1);
    this.anchor = { s, x, y, vx: Number.isFinite(vx) ? vx : 0, vy: Number.isFinite(vy) ? vy : 0, cap: Math.min(3500, Math.max(1500, (Number.isFinite(e) ? e : 1500) + 500)) };   // เดินต่อได้นานสุดเท่าที่ผู้ส่งสัญญา (+0.5 วินาที) · วิ่งเลยสูงสุด ~280 px
  }

  update(dt) {
    this.clock += dt;
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
    const A = this.anchor;
    if (!this.timed || !A) {                                // ผู้ส่งแบบเก่า (ไม่มีเวลา): เดินตามเป้าแบบเดิม
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d > 160) { this.x = this.tx; this.y = this.ty; }
      else { const k = Math.min(1, dt * 9); this.x += dx * k; this.y += dy * k; }
      this.moving = this.mv || d > 2;
      this.speedFactor = this.moving ? Math.min(1, 0.4 + d / 20) : 0;
      return;
    }
    // ตำแหน่งที่ควรเป็น = จุดอ้างอิง + ความเร็ว × เวลาที่ผ่านไป (เดินต่อได้ไม่เกินที่ผู้ส่งสัญญา กันวิ่งเลยถ้าแพ็กเก็ต "หยุด" หาย)
    const ext = Math.min(Math.max(0, this.clock * 1000 - this.off - A.s), A.cap) / 1000;
    const px = Math.min(this.maxX, Math.max(0, A.x + A.vx * ext)), py = Math.min(this.maxY, Math.max(0, A.y + A.vy * ext));   // ไม่เดินต่อออกนอกแผนที่
    const ox = this.x, oy = this.y;
    const ex = px - ox, ey = py - oy, d = Math.hypot(ex, ey);
    if (d > 400) { this.x = px; this.y = py; }              // ห่างผิดปกติ: กระโดดไปเลย
    else if (d > 0) {                                       // ค่อย ๆ ปรับเข้าหา (จำกัดความเร็วไม่เกิน 300 px/วินาที) ไม่กระตุกเวลาแพ็กเก็ตใหม่แก้ตำแหน่ง
      const st = Math.min(d * (1 - Math.exp(-dt / 0.18)), 300 * dt);
      this.x += ex / d * st; this.y += ey / d * st;
    }
    const sp = dt > 0 ? Math.hypot(this.x - ox, this.y - oy) / dt : 0;
    this.movingFor = sp > 5 ? 0.15 : this.movingFor - dt;
    this.moving = this.movingFor > 0;
    this.speedFactor = this.moving ? Math.min(1, 0.4 + sp / 120) : 0;
  }
}

export class RemotePlayers {
  constructor(game) {
    this.game = game;
    this.list = new Map();   // peer → RemotePlayer
    this.visible = true;
  }

  // เรียกจาก room.onPeers และหลังเปลี่ยนแผนที่
  sync(peers) {
    const g = this.game, mapId = g.map && g.map.id;
    const seen = new Set();
    for (const p of peers || []) {
      if (p.isMe || p.kind !== 'viewer') continue;
      const P = p.presence || {};
      if (!P.m || P.m !== mapId || !this.visible || !P.n || !Number.isFinite(P.x) || !Number.isFinite(P.y)) continue;
      seen.add(p.peer);
      let r = this.list.get(p.peer);
      if (!r) {
        r = new RemotePlayer(p);
        r.P = P;
        this.list.set(p.peer, r);
        g.gfx.addCharacter(r, { remote: true });
        g.hud.log(`${r.name} (${r.title}) อยู่ในแผนที่นี้`, 'net');
      } else if (r.P !== P) {          // presence ที่ไม่เปลี่ยนเป็นออบเจ็กต์เดิม → ข้าม
        r.P = P;
        r.apply(P);
        if (r.lookChanged) g.gfx.refreshLook(r);
      }
      if (r.newSay) { g.hud.log(r.newSay, 'pc', r.name); if (g.settings.chatSound) g.sfx('chat'); r.newSay = null; }
      if (r.attacked) { g.gfx.playAttack(r, r.attacked === 'melee' ? undefined : r.attacked); r.attacked = null; }
    }
    for (const [peer, r] of [...this.list]) if (!seen.has(peer)) { g.gfx.removeActor(r); this.list.delete(peer); if (this.visible) g.hud.log(`${r.name} ออกจากแผนที่`, 'net'); }
    if (g.pets) g.pets.syncRemote([...this.list.values()]);
  }

  // แชตที่มาถึงโดยตรง (v0.16.1): แสดงบอลลูนเหนือหัวถ้าเห็นตัวผู้พูดอยู่
  say(peer, text) { const r = this.list.get(peer); if (r) r.bubble = { text: String(text).slice(0, 120), t: 5 }; }

  clear() { for (const r of this.list.values()) this.game.gfx.removeActor(r); this.list.clear(); if (this.game.pets) this.game.pets.clearRemote(); }

  update(dt) { for (const r of this.list.values()) r.update(dt); }

  count() { return this.list.size; }
}
