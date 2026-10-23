// ตั้งค่าการเก็บของของสัตว์เลี้ยง (v0.24.1 · ปรับใหม่ v0.31.1) — ไม่มีส่วนที่ต้องใช้หน้าเว็บ (โหลดจาก Player ได้)
// v0.31.1: เลือกระดับได้เฉพาะ "อุปกรณ์" (ขาว → แดง) · ของตีบวกแยกหมวดและเก็บทั้งหมด · ของอื่นมีแค่ เก็บ/ไม่เก็บ + ติ๊กไม่เก็บรายชิ้น
import { ITEMS } from '../data/items.js?v=0.93.0-p1.8';
import { REFINE_ITEMS } from '../data/refine.js?v=0.93.0-p1.8';

export const PICK_CATS = [['usable', 'ยา/ของใช้'], ['etc', 'วัตถุดิบ'], ['refine', 'ของตีบวก'], ['equip', 'อุปกรณ์'], ['card', 'การ์ด'], ['box', 'กล่องแฟชั่น']];
// ระดับอุปกรณ์ขั้นต่ำ (ตรงกับสีความหายาก)
export const PICK_GRADES = [['common', 'ขาว'], ['uncommon', 'เขียว'], ['rare', 'ฟ้า'], ['epic', 'ม่วง'], ['legend', 'ส้ม'], ['mythic', 'ทอง'], ['celestial', 'แดง'], ['abyssal', 'คราม'], ['divine', 'ขาวทอง'], ['eternal', 'รุ้ง']];   // v0.48: +ห้วงสมุทร/เทพสวรรค์
export const PICK_RANKS = PICK_GRADES.map(([, n], i) => [i, n]);   // เข้ากันได้กับโค้ดเก่า
export const GRADE_RANK = Object.fromEntries(PICK_GRADES.map(([k], i) => [k, i]));

// หมวดของไอเทม (ของตีบวกแยกจากวัตถุดิบ)
export function pickCat(id) {
  const base = String(id).split('*')[0], it = ITEMS[base] || ITEMS[id];
  if (!it) return null;
  if (REFINE_ITEMS[base]) return 'refine';
  return PICK_CATS.some(([k]) => k === it.type) ? it.type : 'etc';
}

export function normPick(P, legacy = 'all') {
  const o = { v: 2, usable: true, etc: true, refine: true, equip: true, card: true, box: true, eqMin: legacy === 'rare' ? 2 : legacy === 'skipCommon' ? 1 : 0, skip: [] };
  if (!P || typeof P !== 'object') return o;
  for (const [k] of PICK_CATS) if (typeof P[k] === 'boolean') o[k] = P[k];
  if (P.v !== 2) {                               // ค่าจากรุ่นเก่า: ระดับขั้นต่ำเดิม → ใช้กับอุปกรณ์ · ของตีบวกตามหมวดวัตถุดิบเดิม
    if (Number.isFinite(P.min)) o.eqMin = Math.max(0, Math.min(PICK_GRADES.length - 1, Math.floor(P.min)));
    if (typeof P.etc === 'boolean') o.refine = true;
  } else if (Number.isFinite(P.eqMin)) o.eqMin = Math.max(0, Math.min(PICK_GRADES.length - 1, Math.floor(P.eqMin)));
  if (Array.isArray(P.skip)) o.skip = [...new Set(P.skip.filter((id) => typeof id === 'string' && ITEMS[id]))].slice(0, 60);
  return o;
}
