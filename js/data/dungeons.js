// v0.32: ดันเจี้ยนถ้ำ + หอคอยไต่ชั้น — ข้อมูล · สูตรปรับความยากมอนสเตอร์ · สร้างแผนที่แต่ละชั้น (สุ่มตาม seed)
// ปรับสมดุลได้จากไฟล์นี้ไฟล์เดียว
import { MONSTERS } from './monsters.js?v=0.43.0';

/* ---------- ค่าหลัก ---------- */
export const CAVE = {
  id: 'cave', name: 'ถ้ำผลึกก้องลึก', en: 'Echoing Crystal Cave',
  floors: 5,            // จำนวนชั้น (ชั้นสุดท้ายมีบอสใหญ่)
  daily: 3,             // เข้าได้กี่รอบต่อวัน
  minLv: 15,
  clearPct: 0.8,        // กำจัดมอนครบกี่ % แล้วบอสท้ายชั้นจะปรากฏ
  elite: { hp: 1.6, atk: 1.12, exp: 1.6 },
  boss: { hp: 14, atk: 1.3, exp: 12 }, finalBoss: { hp: 22, atk: 1.4, exp: 25 },
};
export const TOWER = {
  id: 'tower', name: 'หอคอยนิรันดร์', en: 'Endless Spire',
  minLv: 10,
  time: 150, bossTime: 210,   // วินาทีต่อชั้น (ชั้นบอส)
  checkpoint: 10,             // เริ่มใหม่จากชั้นเช็กพอยต์ได้ทุก 10 ชั้น
  heal: 0.25,                 // ผ่านชั้นแล้วฟื้น HP/SP กี่ %
};

// วันที่ปัจจุบันตามเวลาประเทศไทย (รีเซ็ตรอบประจำวันตอนเที่ยงคืน)
export function todayKey(now = Date.now()) {
  try { return new Date(now).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }); }
  catch (e) { const d = new Date(now + 7 * 3600e3); return d.toISOString().slice(0, 10); }
}

// สถิติดันเจี้ยนในเซฟตัวละคร
export function normDungeon(d) {
  const o = { day: '', cave: 0, tPaid: 0, tToday: 0, best: 0, bestAt: 0, clears: 0, caveTime: 0, runs: 0 };
  if (d && typeof d === 'object') for (const k of Object.keys(o)) if (typeof d[k] === typeof o[k]) o[k] = d[k];
  o.cave = Math.max(0, Math.min(99, Math.floor(o.cave))); o.best = Math.max(0, Math.min(9999, Math.floor(o.best)));
  return o;
}

/* ---------- สูตรความแรงอ้างอิงตามเลเวล (ฟิตจากมอนในเกม Lv.1–98) ---------- */
const f = (L) => (Math.max(1, L) + 4) / 5;
const over = (L, k) => (L > 99 ? Math.pow(k, L - 99) : 1);          // เกิน Lv.99 (หอคอยชั้นสูง) แรงขึ้นทวีคูณ
export const refHp = (L) => 32 * Math.pow(f(L), 1.85) * over(L, 1.055);
export const refAtk = (L) => 5 * Math.pow(f(L), 1.55) * over(L, 1.03);
export const refExp = (L) => 8 * Math.pow(f(Math.min(L, 99)), 2.0);

export const NORMAL_MOBS = Object.keys(MONSTERS).filter((k) => { const m = MONSTERS[k]; return !m.mvp && !m.worldBoss && !m.boss && m.level; })
  .sort((a, b) => MONSTERS[a].level - MONSTERS[b].level);
export const BOSS_MOBS = ['gnarlroot', 'glacia', 'ignarok', 'aurex', 'nocthar'].filter((k) => MONSTERS[k]);

// ชุดมอนที่เลเวลใกล้เป้าหมาย (สุ่มตาม rnd) — ใช้ตัวที่เลเวลไม่เกินเป้า + 6 เป็นหลัก
export function pickRoster(L, n, rnd) {
  const scored = NORMAL_MOBS.map((k) => ({ k, d: Math.abs(MONSTERS[k].level - Math.min(L, 98)) + (MONSTERS[k].level > L + 6 ? 40 : 0) }))
    .sort((a, b) => a.d - b.d).slice(0, Math.max(n + 2, 5));
  const out = [];
  while (out.length < n && scored.length) out.push(scored.splice(Math.floor(rnd() * Math.min(scored.length, n + 1)), 1)[0].k);
  return out;
}

// ข้อมูลมอนที่ปรับเลเวลแล้ว (คงนิสัยเดิมของมอน: ตัวไหนอึด/แรง/หลบเก่งยังเป็นแบบนั้น)
export function scaledData(type, L, mul = {}) {
  const b = MONSTERS[type], Lb = b.level || 1, dl = L - Lb;
  const kh = refHp(L) / refHp(Lb), ka = refAtk(L) / refAtk(Lb), ke = refExp(L) / refExp(Lb);
  const atk = b.atk.map((v) => Math.max(1, Math.round(v * ka * (mul.atk || 1))));
  const d = {
    ...b, level: L,
    hp: Math.max(10, Math.round((mul.hpAbs || b.hp * kh) * (mul.hp || 1))),
    atk, def: Math.max(0, Math.round(b.def + dl * 0.6)), mdef: Math.max(0, Math.round((b.mdef || 0) + dl * 0.5)),
    hit: Math.round(b.hit + dl * 1.1), flee: Math.max(1, Math.round(b.flee + dl * 0.9)),
    baseExp: Math.round((mul.expAbs || b.baseExp * ke) * (mul.exp || 1)), jobExp: Math.round((mul.expAbs ? mul.expAbs * 0.72 : b.jobExp * ke) * (mul.exp || 1)),
    aggressive: true, aggroRange: Math.max(b.aggroRange || 0, 104), respawn: [9999, 9999],
    mvp: false, mvpReward: null,
  };
  if (b.boss) d.boss = { ...b.boss, summon: null };
  return d;
}

/* ---------- ของรางวัล ---------- */
// ของตกจากมอนในดันเจี้ยน (ต่อตัว) · บอสท้ายชั้น · กล่องรางวัลเมื่อผ่านครบ
export const CAVE_MOB_DROPS = [['refine_w', 0.03], ['refine_a', 0.03], ['white_potion', 0.06]];
export const CAVE_BOSS_DROPS = [['refine_w', 0.7], ['refine_a', 0.7], ['refine_guard', 0.04], ['exp_15', 0.12], ['drop_15', 0.08], ['box_wood', 0.12]];
export const CAVE_FINAL_DROPS = [['refine_w', 1], ['refine_a', 1], ['refine_guard', 0.12], ['exp_2', 0.15], ['box_silver', 0.12], ['card_clover', 0.04]];
export function caveChest(lv) {
  return { zeny: 1500 + lv * 220, items: [['refine_w', 2], ['refine_a', 2], ...(lv >= 50 ? [['refine_guard', 1]] : []), ['exp_15', 1]] };
}
// หอคอย: จ่ายเงินทุกชั้นที่ผ่าน (ครั้งแรกของวัน) · ทุก 5 ชั้นได้ผลึก · ทุก 10 ชั้นได้ของพิเศษ
export function towerFloorReward(floor) {
  const L = towerLevel(floor), items = [];
  if (floor % 5 === 0) items.push([floor % 10 === 0 ? 'refine_w' : 'refine_a', 1 + Math.floor(floor / 30)]);
  if (floor % 10 === 0) items.push([floor >= 50 ? 'box_silver' : 'box_wood', 1], [floor >= 30 ? 'exp_2' : 'exp_15', 1]);
  if (floor % 25 === 0) items.push(['refine_guard', 1]);
  return { zeny: Math.round(40 * L * (floor % 10 === 0 ? 4 : floor % 5 === 0 ? 2 : 1)), items };
}
export const TOWER_MOB_DROPS = [['refine_w', 0.015], ['refine_a', 0.015]];

/* ---------- หอคอย: เลเวลและองค์ประกอบของแต่ละชั้น ---------- */
export const towerLevel = (floor) => floor + 4;
export function towerFloorPlan(floor, rnd) {
  const L = towerLevel(floor), boss = floor % 10 === 0 ? 'big' : floor % 5 === 0 ? 'mini' : null;
  const roster = pickRoster(L, 2, rnd);
  const count = boss === 'big' ? 3 : boss ? 4 : Math.min(12, 6 + Math.floor(floor / 8));
  return { L, boss, roster, count, time: boss ? TOWER.bossTime : TOWER.time, bossType: boss ? BOSS_MOBS[Math.floor(floor / 5) % BOSS_MOBS.length] : null };
}

/* ---------- สร้างแผนที่ ---------- */
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
export const rngOf = (seed) => seeded((Math.abs(Math.floor(seed)) % 2147483646) + 1);

const CAVE_THEMES = [
  { fog: '#1c1830', outer: '#0e0c16', dirt: { base: '#4b4258', blobs: ['#433a50', '#564c63', '#3e3a4e'], pebble: '#7b7290', cracks: '#2a2436' }, wall: '#211d2b', crystal: '#8fd8ff', mote: '#9ad8ff', water: 'water', name: 'โถงผลึกคราม' },
  { fog: '#26182a', outer: '#120a14', dirt: { base: '#584058', blobs: ['#4c3650', '#644a62', '#46324a'], pebble: '#8a7090', cracks: '#2e1c30' }, wall: '#251827', crystal: '#e89aff', mote: '#e6a8ff', water: 'water', name: 'อุโมงค์ผลึกม่วง' },
  { fog: '#2a1810', outer: '#140a06', dirt: { base: '#5a4234', blobs: ['#4e382c', '#664c3c', '#46322a'], pebble: '#8a7060', cracks: '#ff8a3a' }, wall: '#26170f', crystal: '#ffb060', mote: '#ffb070', water: 'lava', name: 'ห้องหินร้อน' },
  { fog: '#16242a', outer: '#08100e', dirt: { base: '#3e5054', blobs: ['#36474a', '#4a5c60', '#334044'], pebble: '#7a9094', cracks: '#1e2a2c' }, wall: '#18211f', crystal: '#7affd8', mote: '#8affe0', water: 'ice', name: 'ถ้ำน้ำแข็งลึก' },
];

// ถ้ำ 1 ชั้น: ห้องเริ่ม (ซ้าย) → ห้องกลาง 3–4 ห้อง → ห้องบอส (ขวา) เชื่อมด้วยอุโมงค์ · ผนังหินขรุขระ
export function caveFloorDef(runId, floor, seed) {
  const r = rngOf(seed * 131 + floor * 977), W = 50, H = 38;
  const th = CAVE_THEMES[(floor - 1 + Math.floor(seed)) % CAVE_THEMES.length];
  const start = { x: 6.5, y: 8 + r() * (H - 16), r: 4.6 };
  const bossC = { x: W - 8.5, y: 8 + r() * (H - 16), r: 6.6 };
  const mids = [];
  const nMid = 3 + (floor >= 3 ? 1 : 0);
  for (let i = 0; i < nMid; i++) {
    const t = (i + 1) / (nMid + 1);
    mids.push({ x: 8 + t * (W - 18) + (r() - 0.5) * 4, y: 6 + r() * (H - 12), r: 3.8 + r() * 2.2 });
  }
  const rooms = [start, ...mids, bossC];
  const regions = [], paths = [];
  for (const c of rooms) regions.push({ tile: 'DIRT', circle: [c.x, c.y, c.r, c.r * (0.8 + r() * 0.3)] });
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i], b = rooms[i + 1], mx = (a.x + b.x) / 2 + (r() - 0.5) * 3, my = (a.y + b.y) / 2 + (r() - 0.5) * 6;
    const p = [[a.x, a.y], [mx, my], [b.x, b.y]]; paths.push(p);
    regions.push({ tile: 'DIRT', path: p, w: 3.4 });
  }
  // ทางเชื่อมเสริม (วนได้ ไม่ต้องเดินย้อน)
  if (mids.length >= 3) { const p = [[mids[0].x, mids[0].y], [mids[2].x, mids[2].y]]; paths.push(p); regions.push({ tile: 'DIRT', path: p, w: 2.6 }); }
  // บ่อน้ำ/ลาวาในห้องกลาง
  for (const c of mids) if (r() < 0.5) regions.push({ tile: 'WATER', circle: [c.x + (r() - 0.5) * c.r, c.y + (r() - 0.5) * c.r, 1.2 + r(), 1 + r() * 0.8] });
  // v0.32.1: วาดอุโมงค์ทับบ่อน้ำ/ลาวาอีกรอบ — บ่อไม่ตัดทางเดินอีก (ทางผ่านห้องกลางเสมอ)
  for (const p of paths) regions.push({ tile: 'DIRT', path: p, w: 3.2 });
  // ของตกแต่ง: ผลึกเรืองแสง · เห็ดยักษ์ · หิน · กระดูก (วางชิดผนังห้อง ไม่ขวางอุโมงค์)
  const near = (x, y) => paths.some((p) => p.some(([px, py], k) => {
    if (k === p.length - 1) return false;
    const [qx, qy] = p[k + 1], L2 = (qx - px) ** 2 + (qy - py) ** 2 || 1, u = Math.max(0, Math.min(1, ((x - px) * (qx - px) + (y - py) * (qy - py)) / L2));
    return Math.hypot(x - px - u * (qx - px), y - py - u * (qy - py)) < 2.6;
  }));
  const objects = [], used = new Set();
  const put = (kind, c, extra = {}) => {
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2, d = c.r - 1.4 - r() * 0.8, x = Math.floor(c.x + Math.cos(a) * d), y = Math.floor(c.y + Math.sin(a) * d * 0.9);
      const key = x + ',' + y;
      if (used.has(key) || near(x + 0.5, y + 0.5) || Math.hypot(x + 0.5 - start.x, y + 0.5 - start.y) < 3) continue;
      used.add(key); objects.push({ kind, x, y, ...extra }); return;
    }
  };
  for (const c of rooms) {
    const big = c === bossC ? 2 : 1;
    for (let i = 0; i < 2 * big; i++) put('icecrystal', c, { color: th.crystal });
    if (r() < 0.7) put('bigshroom', c, { color: th.crystal });
    for (let i = 0; i < big; i++) put('boulder', c);
    if (r() < 0.5) put('bones', c);
  }
  for (const c of mids) if (r() < 0.6) put('pillar', c, { seed: Math.floor(r() * 999) });
  objects.push({ kind: 'campfire', x: Math.floor(start.x) - 2, y: Math.floor(start.y) - 2 });
  if (th.water === 'lava') for (const c of mids) if (r() < 0.6) put('vent', c);
  return {
    id: `dg_${runId}_${floor}`, instance: 'cave', name: `${CAVE.name} · B${floor}`, subtitle: `${th.name} · ชั้นที่ ${floor}/${CAVE.floors}`,
    width: W, height: H, fill: 'WALL', spawn: { x: start.x, y: start.y }, music: floor === CAVE.floors ? 'haunted' : 'ruins',
    theme: {
      fog: th.fog, fogNear: 14, fogFar: 46, outer: th.outer, rockWall: true, noOuterTrees: true, wallColor: th.wall, water: th.water,
      light: { hemi: 0.62, sky: '#9a98c8', ground: '#2a2234', sun: 0.72, sunColor: '#c8c4ff', exposure: 1.0 },
      dirt: th.dirt, grass: { base: '#3c3a48' }, tufts: false, flowers: [th.crystal],
      motes: th.mote, moteCount: 70, moteSize: 0.05, fx: { gain: 0.85, glow: 0.9, flash: 0.8 },
      mini: { grass: '#2a2632', dirt: '#6a5c78', water: th.water === 'lava' ? '#c8501a' : '#4a6c9a', flowers: th.crystal, bridge: '#6a5c78' },
    },
    regions, objects, npcs: [], spawns: [], portals: [],
    rooms: { start, mids, boss: bossC },
  };
}

// หอคอย 1 ชั้น: ลานวงกลมบนยอดหอ · เสารอบลาน · กำแพงหินรอบนอก
const TOWER_THEMES = [
  { fog: '#2a2448', outer: '#100c22', sky: '#c8b8ff', mote: '#d6c8ff', name: 'ลานดาวม่วง' },
  { fog: '#1e2c46', outer: '#0a1020', sky: '#a8d0ff', mote: '#a8e0ff', name: 'ลานลมเหนือ' },
  { fog: '#3a2230', outer: '#1a0c14', sky: '#ffb8c8', mote: '#ffc0d0', name: 'ลานแสงสนธยา' },
];
export function towerFloorDef(runId, floor) {
  const W = 32, H = 32, cx = 16, cy = 16, R = 11.5, th = TOWER_THEMES[Math.floor((floor - 1) / 10) % TOWER_THEMES.length];
  const objects = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; objects.push({ kind: 'pillar', x: Math.floor(cx + Math.cos(a) * (R - 1.6)), y: Math.floor(cy + Math.sin(a) * (R - 1.6)), seed: 40 + i }); }
  objects.push({ kind: 'lamp', x: cx - 3, y: cy + 8 }, { kind: 'lamp', x: cx + 3, y: cy + 8 });
  return {
    id: `tw_${runId}_${floor}`, instance: 'tower', name: `${TOWER.name} · ชั้น ${floor}`, subtitle: `${th.name} · Lv.${towerLevel(floor)}`,
    width: W, height: H, fill: 'DIRT', spawn: { x: cx + 0.5, y: cy + 6.5 }, music: floor % 10 === 0 ? 'haunted' : 'ruins',
    theme: {
      fog: th.fog, fogNear: 20, fogFar: 58, outer: th.outer, noOuterTrees: true, wallColor: '#3a3448', cobble: 'gray',
      dirt: { base: th.outer, blobs: [th.fog, th.outer, th.outer], pebble: th.mote, cracks: th.fog }, grass: { base: th.outer },
      light: { hemi: 0.8, sky: th.sky, ground: '#2e2840', sun: 0.95, sunColor: '#fff0d8', exposure: 1.04 },
      tufts: false, motes: th.mote, moteCount: 90, moteSize: 0.06, fx: { gain: 0.9, glow: 0.85, flash: 0.85 },
      mini: { grass: '#3a3448', dirt: '#8a84a0', water: '#4a6c9a', flowers: '#d6c8ff', bridge: '#8a84a0' },
    },
    regions: [{ tile: 'WALL', circle: [cx, cy, R + 1.4] }, { tile: 'PLAZA', circle: [cx, cy, R] }],   // ลานวงกลม + กำแพงเตี้ยรอบขอบ · นอกนั้นเป็นความมืดใต้หอ
    objects, npcs: [], spawns: [], portals: [],
    arena: { cx, cy, R },
  };
}
