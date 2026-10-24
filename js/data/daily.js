// v0.74 กระดานภารกิจรายวัน — ข้อมูลภารกิจ (สุ่มวันละ 4 อย่าง · รีเซ็ตเที่ยงคืนเวลาไทย)
// type = เหตุการณ์ที่นับความคืบหน้า (เรียก DailyBoard.bump(type, ...) จากระบบเกม)
// n(lv) = จำนวนเป้าหมาย · minLv = เลเวลขั้นต่ำที่สุ่มเจอ · online = ต้องเล่นออนไลน์ (ปาร์ตี้)
import { MAPS } from './maps/index.js?v=0.93.0-p4.2';
import { MONSTERS } from './monsters.js?v=0.93.0-p4.2';

export const DAILY_COUNT = 4;          // ภารกิจต่อวัน
export const DAILY_REROLLS = 1;        // เปลี่ยนภารกิจฟรีวันละกี่ครั้ง
export const DAILY_STREAK_BIG = 7;     // ทำครบต่อเนื่องทุก ๆ 7 วัน ได้กล่องใหญ่

export const DAILY_TASKS = {
  hunt:    { icon: '⚔', name: 'นักล่าประจำวัน', text: (n) => `กำจัดมอนสเตอร์ปกติ ${n} ตัว`, n: () => 120, main: true },
  huntMap: { icon: '🗺', name: 'กวาดล้างพื้นที่', text: (n, t) => `กำจัดมอนสเตอร์ใน ${MAPS[t.map] ? MAPS[t.map].name : t.map} ${n} ตัว`, n: () => 80, main: true },
  killMob: { icon: '🎯', name: 'เป้าหมายประจำวัน', text: (n, t) => `กำจัด ${MONSTERS[t.mob] ? MONSTERS[t.mob].name : t.mob} ${n} ตัว`, n: () => 40 },
  party:   { icon: '🤝', name: 'ล่าเป็นทีม', text: (n) => `กำจัดมอนสเตอร์ขณะอยู่ในปาร์ตี้ ${n} ตัว`, n: () => 50, minLv: 10, online: true },
  mvp:     { icon: '👑', name: 'ผู้ท้าชิง MVP', text: () => 'ร่วมปราบบอส MVP 1 ตัว', n: () => 1, minLv: 20 },
  refine:  { icon: '🔨', name: 'ช่างตีเหล็ก', text: (n) => `ตีบวกอุปกรณ์ ${n} ครั้ง (สำเร็จหรือไม่ก็นับ)`, n: () => 2, minLv: 15 },
  pickup:  { icon: '💎', name: 'นักเก็บของ', text: (n) => `เก็บไอเทมจากพื้น ${n} ชิ้น`, n: () => 30 },
  arena:   { icon: '⚔', name: 'นักประลอง', text: (n) => `ลงแข่งในสนามประลอง ${n} นัด (แพ้ชนะก็นับ)`, n: () => 2, minLv: 30, online: true },   // v0.78
  floor:   { icon: '🏰', name: 'นักผจญภัยใต้ดิน', text: (n) => `ผ่านชั้นถ้ำหรือหอคอย ${n} ชั้น`, n: () => 3, minLv: 10 },
};

// รางวัลต่อภารกิจ / กล่องทำครบ (exp เป็นสัดส่วนของ EXP ที่ต้องใช้ขึ้นเลเวลถัดไป)
export const DAILY_REWARD = {
  task: (lv) => ({ expPct: 0.03, zeny: 2000 + lv * 300 }),
  bonus: (lv) => ({ expPct: 0.06, zeny: 5000 + lv * 500, items: [['refine_w', 1], ['refine_a', 1], ...(lv >= 60 ? [['royal_jelly', 2]] : [[lv >= 25 ? 'orange_potion' : 'red_potion', 10]])] }),
  big: (lv) => ({ items: [['refine_guard', 1], ...(lv >= 60 ? [['royal_jelly', 5]] : [])] }),
};

// แผนที่ล่าที่เหมาะกับเลเวล (ช่วงเลเวลมอนปกติในแผนที่)
const RANGES = Object.entries(MAPS).map(([id, d]) => {
  const lv = (d.spawns || []).map((s) => MONSTERS[s.mob]).filter((m) => m && !m.mvp && !m.boss).map((m) => m.level);
  return lv.length ? { id, lo: Math.min(...lv), hi: Math.max(...lv) } : null;
}).filter(Boolean);
// มอนเป้าหมาย: มอนปกติในแผนที่ล่าที่เหมาะกับเลเวล (เลือกตัวที่เลเวลใกล้ผู้เล่นที่สุด แต่ไม่เกิน +5)
export function killMobFor(lv, rnd = Math.random) {
  const def = MAPS[huntMapFor(lv)];
  const mobs = [...new Set((def && def.spawns || []).map((s) => s.mob))].filter((id) => MONSTERS[id] && !MONSTERS[id].mvp && !MONSTERS[id].boss && MONSTERS[id].level <= lv + 5);
  const list = mobs.length ? mobs : [...new Set((def && def.spawns || []).map((s) => s.mob))].filter((id) => MONSTERS[id] && !MONSTERS[id].mvp);
  return list.length ? list[Math.floor(rnd() * list.length)] : 'bloblet';
}
export function huntMapFor(lv) {
  let best = null, bd = Infinity;
  for (const r of RANGES) {
    const d = lv < r.lo ? r.lo - lv : lv > r.hi + 5 ? lv - r.hi - 5 : 0;   // ยอมให้เลยช่วงไป 5 เลเวล (ยังล่าได้สบาย)
    if (d < bd || (d === bd && best && r.lo > best.lo)) { bd = d; best = r; }
  }
  return best ? best.id : 'beginner_field';
}
