// v0.93 fix17 ลูกเล่นตอนฟาร์ม
//   1) มอนแชมเปี้ยน — มอนธรรมดามีโอกาส 1/80 เกิดเป็นแชมเปี้ยน (ฉายา + ออร่าสี) · ถึกและแรงขึ้น · EXP ×3 · ดรอปเสมอ ×3
//   2) มอนทองคำ — ทุก 7–12 นาทีในแผนที่ล่า: มอนทองคำวิ่งหนีผู้เล่น ไม่ตีกลับ อยู่ 90 วิ · ฆ่าทัน = Zeny ก้อนใหญ่ + EXP ×5 + ดรอป ×6
//   3) หีบสมบัติซ่อน — แผนที่ล่าละ 3 หีบ (ตำแหน่งตายตัวต่อแผนที่) · เปิดได้วันละครั้งต่อหีบ · 20% เป็น "มิมิค" กระโดดกัด!
import { TILE } from '../config.js?v=0.93.0-p3.25';
import { MONSTERS } from '../data/monsters.js?v=0.93.0-p3.25';
import { ITEMS } from '../data/items.js?v=0.93.0-p3.25';

/* ---------------- 1) แชมเปี้ยน ---------------- */
export const CHAMP_CHANCE = 1 / 80;
export const CHAMPS = {
  berserk: { name: 'บ้าคลั่ง', color: '#ff4a3a', hp: 2.4, atk: 2.0, def: 1, flee: 1, speed: 1.2, delay: 0.75, desc: 'ตีแรง ตีเร็ว' },
  stone: { name: 'เกราะหิน', color: '#c8a46a', hp: 4.0, atk: 1.4, def: 2.2, flee: 0.8, speed: 0.9, delay: 1, desc: 'ถึกมาก เกราะหนา' },
  shadow: { name: 'เงา', color: '#9a5aff', hp: 2.6, atk: 1.6, def: 1, flee: 2.2, speed: 1.35, delay: 0.9, desc: 'หลบเก่ง เคลื่อนไหวไว' },
  frost: { name: 'น้ำแข็ง', color: '#5ad8ff', hp: 3.0, atk: 1.6, def: 1.4, flee: 1, speed: 1, delay: 1, desc: 'ตัวเย็นเฉียบ ถึก' },
};
const eligible = (m, def) => !m.summoned && !m.worldRun && !m.arenaProxy && !m.shared && !(def && (def.instance || def.safe)) && !(m.data.mvp || m.data.boss || m.data.worldBoss || m.data.fest || m.data.dgBoss);

function restore(m) {
  if (!m.eliteBase) return;
  const b = m.eliteBase; m.maxHp = b.maxHp; m.stats = { ...b.stats }; m.speed = b.speed; m.attackDelay = b.attackDelay;
  m.champ = null; m.hp = Math.min(m.hp, m.maxHp);
}
export function makeChampion(m, kind) {
  const C = CHAMPS[kind]; if (!C) return;
  if (!m.eliteBase) m.eliteBase = { maxHp: m.maxHp, stats: { ...m.stats }, speed: m.speed, attackDelay: m.attackDelay || 0 };
  const b = m.eliteBase, mul = (v, k) => (Array.isArray(v) ? v.map((x) => Math.round(x * k)) : Math.round(v * k));
  m.champ = { kind, ...C };
  m.maxHp = Math.round(b.maxHp * C.hp); m.hp = m.maxHp;
  m.stats = { ...b.stats, atk: mul(b.stats.atk, C.atk), def: Math.round((b.stats.def || 0) * C.def + 2), mdef: Math.round((b.stats.mdef || 0) * C.def + 1), flee: Math.round((b.stats.flee || 0) * C.flee + 3), hit: Math.round((b.stats.hit || 0) * 1.1) };
  m.speed = b.speed * C.speed; m.attackDelay = (m.data.attackDelay || 1.5) * C.delay;
}
// เรียกตอนมอนเกิด/เกิดใหม่ (MonsterManager) — คืนค่าปกติก่อน แล้วสุ่มเป็นแชมเปี้ยน
export function rollChampion(m, def) {
  restore(m);
  if (!eligible(m, def) || Math.random() >= CHAMP_CHANCE) return false;
  const ks = Object.keys(CHAMPS); makeChampion(m, ks[(Math.random() * ks.length) | 0]);
  return true;
}

/* ---------------- 2) มอนทองคำ ---------------- */
export class GoldenRun {
  constructor(game) { this.g = game; this.next = 420 + Math.random() * 300; this.mob = null; }
  onMapLoaded() { this.mob = null; this.next = Math.min(this.next, 240 + Math.random() * 240); }
  update(dt) {
    const g = this.g, def = g.map && g.map.def;
    if (!g.started || !g.mobs || !def || def.safe || def.instance) return;
    if (this.mob) {
      const m = this.mob;
      if (m.dead || !g.mobs.list.includes(m)) { this.mob = null; return; }
      m.goldLeft -= dt;
      if (m.goldLeft <= 0) {   // หนีไปแล้ว
        g.gfx.playRespawn(m); g.mobs.remove(m); g.gfx.removeActor(m); this.mob = null;
        if (g.player.target === m) g.clearTarget();
        g.hud.log('✨ มอนทองคำหนีไปแล้ว… รอบหน้าต้องเร็วกว่านี้!', 'sys');
      }
      return;
    }
    this.next -= dt; if (this.next > 0) return;
    this.next = 420 + Math.random() * 300;
    this.spawn();
  }
  spawn() {
    const g = this.g, pool = (g.map.def.spawns || []).filter((s) => { const d = MONSTERS[s.mob]; return d && !d.mvp && !d.boss && !d.fest && !d.worldBoss; });
    if (!pool.length) return null;
    const s = pool[(Math.random() * pool.length) | 0], [ax, ay, aw, ah] = s.areas[(Math.random() * s.areas.length) | 0];
    let p = null;
    for (let i = 0; i < 60 && !p; i++) { const tx = ax + ((Math.random() * aw) | 0), ty = ay + ((Math.random() * ah) | 0); if (!g.map.isSolidTile(tx, ty)) p = { x: tx * TILE + 8, y: ty * TILE + 8 }; }
    if (!p) return null;
    const m = g.mobs.spawnAt(s.mob, p.x, p.y);
    m.golden = true; m.goldLeft = 90; m.name = `✨ ${m.data.name}ทองคำ`;
    m.maxHp = Math.round(m.maxHp * 5); m.hp = m.maxHp; m.speed = m.speed * 1.55;
    m.stats = { ...m.stats, def: Math.round((m.stats.def || 0) * 0.5), flee: Math.round((m.stats.flee || 0) * 1.5 + 4) };
    g.gfx.addMonster(m); g.gfx.playRespawn(m);
    this.mob = m;
    g.hud.log(`✨ มอนทองคำ "${m.data.name}ทองคำ" ปรากฏที่ (${Math.floor(p.x / TILE)}, ${Math.floor(p.y / TILE)})! มันจะหนีภายใน 90 วิ — ดูตำแหน่งบนแผนที่ย่อ`, 'r-legend');
    g.hud.levelBanner('✨ มอนทองคำปรากฏ!', 'ไล่ล่าให้ทันก่อนมันหนีไป · ดูตำแหน่งบนแผนที่');
    g.sfx && g.sfx('questDone');
    return m;
  }
}
// AI วิ่งหนี (เรียกจาก MonsterManager แทน AI ปกติ)
export function goldenAI(mgr, m, player, dt) {
  const d = player && !player.dead ? Math.hypot(player.x - m.x, player.y - m.y) : Infinity;
  if (d < 8 * TILE) {
    const ax = m.x - player.x, ay = m.y - player.y, L = Math.hypot(ax, ay) || 1;
    let tx = m.x + (ax / L) * 4 * TILE, ty = m.y + (ay / L) * 4 * TILE;
    if (mgr.map.isSolidTile(Math.floor(tx / TILE), Math.floor(ty / TILE))) { tx = m.x + (-ay / L) * 4 * TILE; ty = m.y + (ax / L) * 4 * TILE; }   // ชนกำแพง → หักหลบด้านข้าง
    m.path = []; mgr.steer(m, tx, ty, 1, dt);
  } else {
    m.timer = (m.timer || 0) - dt;
    if (!m.wander || m.timer <= 0) { m.wander = mgr.wanderPoint(m) || { x: m.x, y: m.y }; m.timer = 2 + Math.random() * 2; }
    if (mgr.steer(m, m.wander.x, m.wander.y, 0.5, dt) < 2) m.moving = false;
  }
}

/* ---------------- 3) หีบสมบัติ ---------------- */
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rngOf = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export function chestSpots(map) {
  const def = map.def; if (!def || def.safe || def.instance || !Array.isArray(def.spawns) || !def.spawns.length) return [];
  const r = rngOf(hash(String(def.id || map.id || 'map'))), out = [];
  const areas = def.spawns.flatMap((s) => s.areas || []); if (!areas.length) return [];
  for (let n = 0; n < 400 && out.length < 3; n++) {
    const [ax, ay, aw, ah] = areas[(r() * areas.length) | 0], tx = ax + ((r() * aw) | 0), ty = ay + ((r() * ah) | 0);
    if (map.isSolidTile(tx, ty) || map.isSolidTile(tx + 1, ty) || map.isSolidTile(tx, ty + 1)) continue;
    if (out.some((o) => Math.hypot(o.tx - tx, o.ty - ty) < 12)) continue;
    if ((map.portals || []).some((p) => Math.hypot(p.x - tx, p.y - ty) < 6)) continue;
    out.push({ tx, ty, x: tx * TILE + 8, y: ty * TILE + 8, key: `${def.id}#${out.length}`, mimic: r() < 0.2 });
  }
  return out;
}
// ของในหีบ (ตามเลเวลแผนที่)
export function chestLoot(lv, equipPool) {
  const items = [];
  const pot = lv < 30 ? 'red_potion' : lv < 70 ? 'orange_potion' : 'white_potion';
  items.push([pot, 3 + ((Math.random() * 4) | 0)]);
  if (Math.random() < 0.5) items.push(['blue_potion', 2 + ((Math.random() * 3) | 0)]);
  if (Math.random() < 0.25) items.push(['box_silver', 1]);
  if (Math.random() < 0.12) items.push([Math.random() < 0.5 ? 'refine_w' : 'refine_a', 1]);
  if (Math.random() < 0.08) items.push(['exp_15', 1]);
  if (equipPool.length && Math.random() < 0.18) items.push([equipPool[(Math.random() * equipPool.length) | 0], 1]);
  const zeny = Math.round((lv * 150 + 300) * (0.8 + Math.random() * 0.6));
  return { items: items.filter(([id]) => ITEMS[id]), zeny };
}
