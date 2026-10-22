// v0.75 ดันเจี้ยนปาร์ตี้ "วิหารผนึกจันทรา" — ข้อมูล (เลือดบอส/รางวัล/โควตาตัดสินที่เซิร์ฟเวอร์: supabase/party_dungeon_v0.75.sql)
import { MONSTERS } from './monsters.js?v=0.93.0';

export const PD = {
  name: 'วิหารผนึกจันทรา',
  minLv: 30, minPlayers: 2, maxPlayers: 6, weekly: 2,
  prep: 10,          // วินาทีเตรียมตัวก่อนบอสตื่น (ตรงกับ starts_at ในเซิร์ฟเวอร์)
  time: 900,         // เวลาต่อสู้ทั้งหมด (15 นาที)
  enrage: 600,       // 10 นาทีขึ้นไป บอสคลั่ง
  joinWindow: 60,    // เข้าร่วมได้ภายในกี่วินาทีหลังบอสตื่น (และบอสยังไม่โดนตี)
  coin: 'pd_coin',
  arena: { W: 40, H: 40, cx: 20, cy: 20, R: 15 },
  // กลไกบอส (วินาทีนับจากบอสตื่น) — ทุกเครื่องคำนวณจากเวลาเซิร์ฟเวอร์ + seed เดียวกัน จึงเห็นตรงกัน
  rain:  { first: 6, every: 10, count: 5, radius: 2.4, windup: 2.2, dmg: 0.35 },            // วงอัญเชิญกระจาย: หลบออกจากวง
  spread:{ first: 15, every: 24, windup: 4, radius: 4, dmgOthers: 0.6, dmgSelf: 0.25 },     // ตราแยก: คนโดนตราต้องเดินออกห่างเพื่อน
  stack: { first: 27, every: 24, windup: 4, radius: 3, total: 1.2, min: 0.3 },              // ตราแบ่งรับ: ทุกคนต้องเข้าไปยืนรวมเพื่อหารดาเมจ
  bosses: ['aurex', 'nocthar', 'ignarok', 'glacia'],
};
export const PD_BOSS_NAME = { aurex: 'ผู้คุมผนึก · ออเร็กซ์', nocthar: 'ผู้คุมผนึก · น็อคธาร์', ignarok: 'ผู้คุมผนึก · อิกนาร็อก', glacia: 'ผู้คุมผนึก · กลาเซีย' };

// ร้านแลกเหรียญผนึก (ราคาเป็นเหรียญ · มูลค่าไม่เกินมูลค่าเหรียญในตาราง item_catalog กันระบบตรวจของผิดปกติ)
export const PD_SHOP = [
  { id: 'refine_w', n: 2, cost: 2 },
  { id: 'refine_a', n: 2, cost: 2 },
  { id: 'royal_jelly', n: 1, cost: 3 },
  { id: 'box_silver', n: 1, cost: 6 },
  { id: 'egg_moon', n: 1, cost: 10 },
  { id: 'refine_luck', n: 1, cost: 75 },   // v0.85 แพงขึ้น
  { id: 'refine_guard', n: 1, cost: 25 },
  { id: 'box_gold', n: 1, cost: 40 },
  { id: 'egg_galaxy', n: 1, cost: 60 },
  { id: 'eternal_shard', n: 1, cost: 40 },   // v0.77 วัตถุดิบหลอมอุปกรณ์นิรันดร์กาล
];

// รางวัลต่อรอบ (ส่งเข้าจดหมายโดยเซิร์ฟเวอร์ — ตัวเลขนี้ไว้แสดงในเกมเท่านั้น)
export const PD_REWARD_TEXT = 'เหรียญผนึก 4 เหรียญ (ดาเมจอันดับ 1 ได้ +1) + ผลึกตีบวกอาวุธ/เกราะอย่างละ 1';

export function pdMapDef(runId, bossType) {
  const { W, H, cx, cy, R } = PD.arena, objects = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; objects.push({ kind: 'pillar', x: Math.floor(cx + Math.cos(a) * (R - 1.4)), y: Math.floor(cy + Math.sin(a) * (R - 1.4)), seed: 60 + i }); }
  objects.push({ kind: 'lamp', x: cx - 4, y: cy + R - 3 }, { kind: 'lamp', x: cx + 4, y: cy + R - 3 });
  return {
    id: `pd_${runId}`, instance: 'party', name: PD.name, subtitle: `ดันเจี้ยนปาร์ตี้ · ${PD_BOSS_NAME[bossType] || ''}`,
    width: W, height: H, fill: 'DIRT', spawn: { x: cx + 0.5, y: cy + R - 3.5 }, music: 'haunted',
    theme: {
      fog: '#241a3a', fogNear: 22, fogFar: 64, outer: '#0c0818', noOuterTrees: true, wallColor: '#34284a', cobble: 'gray',
      dirt: { base: '#1a1230', blobs: ['#2c2050', '#1a1230', '#120c22'], pebble: '#b8a8ff', cracks: '#3a2c60' }, grass: { base: '#1a1230' },
      light: { hemi: 0.78, sky: '#b8a8ff', ground: '#2a2040', sun: 0.9, sunColor: '#e8dcff', exposure: 1.04 },
      tufts: false, motes: '#c8b8ff', moteCount: 120, moteSize: 0.06, fx: { gain: 0.95, glow: 0.9, flash: 0.85 },
      mini: { grass: '#34284a', dirt: '#8a80a8', water: '#4a6c9a', flowers: '#d6c8ff', bridge: '#8a80a8' },
    },
    regions: [{ tile: 'WALL', circle: [cx, cy, R + 1.4] }, { tile: 'PLAZA', circle: [cx, cy, R] }],
    objects, npcs: [], spawns: [], portals: [],
    arena: { cx, cy, R },
  };
}

// สุ่มแบบกำหนดค่าเริ่มต้น (ทุกเครื่องได้ค่าเดียวกัน)
export function pdRng(seed) {
  let h = (seed >>> 0) || 1;
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; };
}
export const pdBossOk = (t) => PD.bosses.includes(t) && !!MONSTERS[t];
