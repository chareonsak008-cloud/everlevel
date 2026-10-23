// v0.78 สนามประลอง (อารีน่า PvP) — ข้อมูล · ผลแพ้ชนะ/แต้ม/ราคาร้าน ตัดสินที่เซิร์ฟเวอร์ (supabase/arena_v0.78.sql)
import { statPointsForLevel, statCost, START_STAT_POINTS, MAX_STAT, STAT_KEYS } from './progression.js?v=0.93.0-p3.31';

export const AR = {
  name: 'สนามประลอง',
  minLv: 30,
  syncLv: 150,        // ในสนามทุกคนถูกปรับเป็น Lv.150 (สัดส่วนสเตตัสเดิม · อุปกรณ์จริง)
  hpMul: 3,           // เลือดในสนาม = HP สูงสุด ×3 (ตรงกับเซิร์ฟเวอร์)
  dmgMul: 0.6,        // ดาเมจใส่ผู้เล่น ×0.6
  prep: 12,           // วินาทีเตรียมตัวก่อนเริ่ม (ตรงกับเซิร์ฟเวอร์)
  modes: {
    '1v1': { name: 'ดวล 1v1', size: 1, time: 180, icon: '⚔' },
    '3v3': { name: 'ทีม 3v3', size: 3, time: 300, icon: '🛡' },
  },
  dayCap: 300,
  points: { win: 30, loss: 10, draw: 12, firstWin: 20 },
};

// ขั้นตามแต้มอันดับ
export const AR_TIERS = [
  { id: 'bronze',   name: 'บรอนซ์',     min: 0,    color: '#c98a5a', icon: '🥉' },
  { id: 'silver',   name: 'ซิลเวอร์',    min: 1200, color: '#cfd8e6', icon: '🥈' },
  { id: 'gold',     name: 'โกลด์',      min: 1400, color: '#ffd45a', icon: '🥇' },
  { id: 'platinum', name: 'แพลตินัม',    min: 1600, color: '#7fe6d8', icon: '💠' },
  { id: 'diamond',  name: 'ไดมอนด์',    min: 1800, color: '#8ab8ff', icon: '💎' },
  { id: 'gladiator',name: 'เทพสงคราม',   min: 2100, color: '#ff6a5a', icon: '👑' },
];
export const tierOf = (r) => { let t = AR_TIERS[0]; for (const x of AR_TIERS) if ((+r || 0) >= x.min) t = x; return t; };

// รางวัลจบฤดูกาลตามขั้น (แต้มสูงสุดของเดือน · ต้องเล่นอย่างน้อย 10 นัด) — แสดงผลเท่านั้น เซิร์ฟเวอร์เป็นคนส่ง
export const AR_SEASON_REWARD = {
  bronze:    { items: [['box_silver', 1]], zeny: 30000 },
  silver:    { items: [['box_silver', 2]], zeny: 60000 },
  gold:      { items: [['box_gold', 1], ['refine_luck', 1]], zeny: 120000 },
  platinum:  { items: [['box_gold', 1], ['refine_guard', 2]], zeny: 200000 },
  diamond:   { items: [['box_gold', 2], ['eternal_shard', 1], ['refine_guard', 2]], zeny: 300000 },
  gladiator: { items: [['box_gold', 3], ['eternal_shard', 3], ['refine_guard', 3]], zeny: 500000 },
};

// ร้านแต้มอารีน่า (ต้องตรงกับ arena_buy ในเซิร์ฟเวอร์) · week = จำกัดต่อสัปดาห์
export const AR_SHOP = [
  { id: 'refine_w', n: 2, cost: 40 },
  { id: 'refine_a', n: 2, cost: 40 },
  { id: 'royal_jelly', n: 1, cost: 30 },
  { id: 'box_silver', n: 1, cost: 80 },
  { id: 'refine_luck', n: 1, cost: 300, week: 5 },
  { id: 'refine_guard', n: 1, cost: 300, week: 5 },
  { id: 'box_gold', n: 1, cost: 500, week: 3 },
  { id: 'egg_galaxy', n: 1, cost: 900, week: 1 },
  { id: 'eternal_shard', n: 1, cost: 600, week: 2 },
];

/* ---------- ปรับเลเวล (Level Sync) ---------- */
const ptsAt = (lv) => { let n = START_STAT_POINTS; for (let l = 2; l <= lv; l++) n += statPointsForLevel(l); return n; };
const spent = (v) => { let n = 0; for (let u = 1; u < v; u++) n += statCost(u); return n; };
// สเตตัสที่ปรับแล้ว: แต้มที่ลงไปในแต่ละค่าถูกขยายตามสัดส่วนแต้มทั้งหมดของ Lv.150
export function syncAttr(attr, lv) {
  const k = ptsAt(AR.syncLv) / Math.max(1, ptsAt(Math.max(1, Math.min(AR.syncLv, lv))));
  const out = {};
  for (const s of STAT_KEYS) {
    const target = spent(attr[s] || 1) * k;
    let v = 1, c = 0;
    while (v < MAX_STAT && c + statCost(v) <= target) { c += statCost(v); v++; }
    out[s] = Math.max(attr[s] || 1, v);
  }
  return out;
}

/* ---------- แผนที่สนาม ---------- */
export const AR_ARENA = { W: 38, H: 26 };
export function arMapDef(matchId, mode, team, idx) {
  const { W, H } = AR_ARENA, cy = Math.floor(H / 2);
  const objects = [];
  // เสากำบังกลางสนาม
  for (const [x, y] of [[W / 2 - 1, cy - 5], [W / 2 - 1, cy + 4], [W / 2 - 6, cy - 1], [W / 2 + 4, cy - 1]]) objects.push({ kind: 'pillar', x: Math.floor(x), y: Math.floor(y), seed: 80 + x + y });
  objects.push({ kind: 'lamp', x: 4, y: 3 }, { kind: 'lamp', x: 4, y: H - 4 }, { kind: 'lamp', x: W - 5, y: 3 }, { kind: 'lamp', x: W - 5, y: H - 4 });
  const sx = team === 1 ? 5.5 : W - 5.5, sy = cy + 0.5 + (idx - 1) * 2.5;
  return {
    id: `ar_${matchId}`, instance: 'arena', name: AR.name, subtitle: AR.modes[mode] ? AR.modes[mode].name : '',
    width: W, height: H, fill: 'DIRT', spawn: { x: sx, y: sy }, music: 'boss',
    theme: {
      fog: '#2a1a14', fogNear: 24, fogFar: 70, outer: '#140c0a', noOuterTrees: true, wallColor: '#4a3428', cobble: 'warm',
      dirt: { base: '#6a4a30', blobs: ['#7a5636', '#5e4029', '#4e3522'], pebble: '#d8b890', cracks: '#3e2a1a' }, grass: { base: '#6a4a30' },
      light: { hemi: 0.85, sky: '#ffe2b8', ground: '#3a2618', sun: 1.05, sunColor: '#fff0d8', exposure: 1.05 },
      tufts: false, motes: '#ffcf8a', moteCount: 60, moteSize: 0.05, fx: { gain: 0.95, glow: 0.9, flash: 0.85 },
      mini: { grass: '#4a3428', dirt: '#a8865e', water: '#4a6c9a', flowers: '#ffd8a0', bridge: '#a8865e' },
    },
    regions: [{ tile: 'WALL', ring: [0, 0, W, H, 2] }, { tile: 'PLAZA', rect: [W / 2 - 3, cy - 3, 6, 6] }],
    objects, npcs: [], spawns: [], portals: [],
    arena: { W, H, cy },
  };
}

// สีทีม
export const TEAM_COLOR = { 1: '#5aa8ff', 2: '#ff6a5a' };
export const TEAM_NAME = { 1: 'ทีมน้ำเงิน', 2: 'ทีมแดง' };
