// ตั้งค่าการเก็บของของสัตว์เลี้ยง (v0.24.1) — ไม่มีส่วนที่ต้องใช้หน้าเว็บ (โหลดจาก Player ได้)
import { ITEMS } from '../data/items.js';

// v0.24.1: ตั้งค่าการเก็บของแบบละเอียด — หมวดไอเทม · ระดับความหายากขั้นต่ำ · รายการไอเทมที่ไม่เก็บ
export const PICK_CATS = [['usable', 'ยา/ของใช้'], ['etc', 'วัตถุดิบ'], ['equip', 'อุปกรณ์'], ['card', 'การ์ด'], ['box', 'กล่องแฟชั่น']];
export const PICK_RANKS = [[0, 'ทุกระดับ'], [1, 'ไม่ธรรมดาขึ้นไป'], [2, 'หายากขึ้นไป'], [3, 'ระดับตำนานขึ้นไป']];
export function normPick(P, legacy = 'all') {
  const o = { usable: true, etc: true, equip: true, card: true, box: true, min: legacy === 'rare' ? 2 : legacy === 'skipCommon' ? 1 : 0, usableAny: legacy === 'skipCommon', skip: [] };
  if (!P || typeof P !== 'object') return o;
  for (const [k] of PICK_CATS) if (typeof P[k] === 'boolean') o[k] = P[k];
  if (Number.isFinite(P.min)) o.min = Math.max(0, Math.min(3, Math.floor(P.min)));
  if (typeof P.usableAny === 'boolean') o.usableAny = P.usableAny;
  if (Array.isArray(P.skip)) o.skip = [...new Set(P.skip.filter((id) => typeof id === 'string' && ITEMS[id]))].slice(0, 60);
  return o;
}
