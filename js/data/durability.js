// v0.89 ความทนทานของอุปกรณ์ — ใช้แล้วสึก · ถึง 0 = พัง (ไม่ให้ค่าสถานะ เหมือนไม่ได้สวม) · ซ่อมที่ช่างตีเหล็กในเมือง (VIP ซ่อมได้ทุกที่)
// เก็บเป็น player.dura = { [คีย์ไอเทม]: 0–100 } (ไม่มีในรายการ = 100 เต็ม)
import { ITEMS, BASE_ITEMS, itemMods, itemKey } from './items.js?v=0.93.0-p1.9';
import { CARDS } from './cards.js?v=0.93.0-p1.9';

export const DURA_MAX = 100;
export const DURA_LOW = 20;   // ต่ำกว่านี้เตือน
// สึกต่อครั้ง: อาวุธเมื่อโจมตี/ใช้สกิล · ชิ้นอื่นทุกชิ้นเมื่อถูกตี · ตาย = ทุกชิ้นลดเพิ่ม 10%
export const DURA_LOSS = { attack: 0.012, hit: 0.015, death: 10 };

export const duraOf = (pl, key) => (key && pl.dura && Number.isFinite(pl.dura[key]) ? pl.dura[key] : DURA_MAX);
export const isBroken = (pl, key) => !!key && duraOf(pl, key) <= 0;

// ค่าซ่อม (Zeny) — ตามราคาของ × ส่วนที่เสียไป · ตีบวกสูงแพงขึ้น · พังแล้ว ×2
export function repairCost(key, dura) {
  const it = ITEMS[key]; if (!it || dura >= DURA_MAX) return 0;
  const { base, refine } = itemMods(key), b = BASE_ITEMS[base] || it;
  const price = Math.max(800, b.price || (b.reqLevel || 1) * 1500);
  const lost = (DURA_MAX - Math.max(0, dura)) / DURA_MAX;
  let c = Math.max(50, price * 0.25 * lost * (1 + (refine || 0) * 0.08));
  if (dura <= 0) c *= 2;
  return Math.ceil(c / 10) * 10;
}

// ถอดการ์ดคืน (Zeny แพงมาก) — การ์ดกลับเข้ากระเป๋า อุปกรณ์ไม่เสีย
export const UNSOCKET_COST = { normal: 500000, elite: 1000000, mvp: 1500000 };
export const unsocketCost = (cardId) => UNSOCKET_COST[(CARDS[cardId] && CARDS[cardId].rank) || 'normal'] || UNSOCKET_COST.normal;
export const keyWithout = (key, idx) => { const m = itemMods(key), cards = m.cards.slice(); cards.splice(idx, 1); return itemKey(m.base, m.refine, cards, m.roll); };
