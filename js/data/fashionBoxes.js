// กล่องแฟชั่นสุ่ม (v0.9) — มอนสเตอร์ดรอปกล่อง → เปิดกล่องสุ่มได้ชิ้นแฟชั่น 1 ชิ้น
// สุ่ม 2 ขั้น: (1) สุ่มระดับความหายากตาม odds ของกล่อง (2) สุ่มชิ้นในระดับนั้นแบบเท่ากันทุกชิ้น
// ได้ชิ้นซ้ำ → แปลงเป็น Zeny ตามระดับ (DUP_ZENY)
import { COSTUMES, RARITY as FASHION_RARITY } from './costumes.js';

export { FASHION_RARITY };
export const FASHION_TIERS = ['common', 'rare', 'epic', 'legend', 'mythic', 'celestial'];
export const TIER_RANK = { common: 1, rare: 2, epic: 3, legend: 4, mythic: 5, celestial: 6 };

// โอกาสเป็นเปอร์เซ็นต์ (รวม = 100) — ยิ่งระดับสูงยิ่งยากมาก ๆ
export const BOX_ODDS = {
  box_wood: { common: 72, rare: 22, epic: 5, legend: 0.9, mythic: 0.09, celestial: 0.01 },
  box_silver: { common: 30, rare: 45, epic: 19, legend: 5.5, mythic: 0.45, celestial: 0.05 },
  box_gold: { common: 0, rare: 35, epic: 42, legend: 19, mythic: 3.4, celestial: 0.6 },
};

// ได้ชิ้นที่มีอยู่แล้ว → รับ Zeny แทน
export const DUP_ZENY = { common: 200, rare: 800, epic: 3000, legend: 12000, mythic: 60000, celestial: 250000 };

export function fmtPct(p) {
  if (p >= 1) return +p.toFixed(1) + '%';
  if (p >= 0.01) return +p.toFixed(2) + '%';
  return +p.toPrecision(2) + '%';   // เช่น 0.0005%
}

// ไอเทมกล่อง (รวมเข้า ITEMS ใน data/items.js) — ไม่มีขายในร้าน ได้จากมอนสเตอร์เท่านั้น (ขายคืนร้านได้ครึ่งราคา)
export const BOX_ITEMS = {
  box_wood: {
    name: 'กล่องแฟชั่นไม้', type: 'box', icon: ['giftbox', '#b07a42', '#ffd27a'], price: 1000, rarity: 'uncommon', tier: 1,
    desc: 'กล่องไม้ผูกโบว์ทอง มอนสเตอร์ทุกตัวมีโอกาสดรอป เปิดแล้วได้ชิ้นแฟชั่นสุ่ม 1 ชิ้น',
  },
  box_silver: {
    name: 'กล่องแฟชั่นเงิน', type: 'box', icon: ['giftbox', '#c8d4e4', '#5aa8ff'], price: 6000, rarity: 'rare', tier: 2,
    desc: 'กล่องเงินขลิบฟ้า หายาก ดรอปจากมอนสเตอร์เลเวลสูงและบอส MVP โอกาสได้ของระดับสูงมากกว่ากล่องไม้',
  },
  box_gold: {
    name: 'กล่องแฟชั่นทองคำ', type: 'box', icon: ['giftbox', '#f2c24a', '#e8384f'], price: 40000, rarity: 'epic', tier: 3,
    desc: 'กล่องทองคำประดับทับทิม หายากที่สุด! การันตีระดับหายากขึ้นไป ลุ้น Mythical และ Celestial',
  },
};
export const BOX_IDS = Object.keys(BOX_ITEMS);

// รายชื่อชิ้นแฟชั่นแยกตามระดับ
const POOL = Object.fromEntries(FASHION_TIERS.map((t) => [t, COSTUMES.filter((c) => c.rarity === t)]));
export const poolSize = (tier) => POOL[tier].length;
// v0.13: สุ่ม 1 ชิ้นจากระดับที่กำหนด (กิเลนเมฆาสวรรค์อัประดับกล่อง)
export const pickOfTier = (tier, rnd = Math.random) => { const p = POOL[tier]; return p && p.length ? p[Math.floor(rnd() * p.length) % p.length] : null; };

// สุ่มระดับ แล้วสุ่มชิ้นในระดับนั้น
export function rollBox(boxId, rnd = Math.random) {
  const odds = BOX_ODDS[boxId] || BOX_ODDS.box_wood;
  const tiers = FASHION_TIERS.filter((t) => (odds[t] || 0) > 0);
  const total = tiers.reduce((a, t) => a + odds[t], 0);
  let r = rnd() * total, tier = tiers[0];   // ปัดเศษทศนิยมเกิน → ได้ระดับต่ำสุด (ไม่มีทางหลุดไประดับสูงโดยบังเอิญ)
  for (const t of tiers) {
    if (r < odds[t]) { tier = t; break; }
    r -= odds[t];
  }
  const pool = POOL[tier];
  return { tier, item: pool[Math.floor(rnd() * pool.length) % pool.length] };
}

// โอกาสดรอปกล่องจากมอนสเตอร์ (ต่อการกำจัด 1 ตัว) — เลเวลสูงดรอปบ่อยขึ้นเล็กน้อย
export function boxDrops(mob) {
  const lv = mob.level || 1;
  if (mob.mvp) return [['box_wood', 1], ['box_wood', 0.5], ['box_silver', 1], ['box_gold', 0.3]];
  return [
    ['box_wood', 0.02 + lv * 0.002],
    ['box_silver', 0.003 + lv * 0.0004],
    ['box_gold', 0.0004],
  ];
}
