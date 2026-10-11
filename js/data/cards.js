// การ์ดมอนสเตอร์ (v0.10) — ใส่ในช่องการ์ดของอุปกรณ์ เพิ่มค่าสถานะถาวร (ใส่แล้วถอดไม่ได้)
// on = ช่องอุปกรณ์ที่ใส่ได้ · drop = โอกาสดรอปต่อการกำจัด 1 ตัว (หายากมาก)

const C = (mob, name, on, color, bonus, drop, desc, rarity = 'rare') => ({ mob, name, on, color, bonus, drop, desc, rarity });

import { ENDGAME_CARDS } from './endgameCards.js';
export const CARDS = {
  ...ENDGAME_CARDS,
  card_bloblet: C('bloblet', 'การ์ดบล็อบเล็ต', 'shoes', '#6fd8c8', { agi: 1, flee: 5 }, 0.002, 'บล็อบเล็ตเด้งดึ๋งไม่หยุด ทำให้ฝีเท้าเบาและหลบหลีกเก่งขึ้น'),
  card_capling: C('capling', 'การ์ดแคปปลิง', 'head', '#4a8fd8', { int: 1, maxSp: 15 }, 0.0015, 'สปอร์เรืองแสงของแคปปลิงทำให้จิตใจปลอดโปร่ง'),
  card_stinglet: C('stinglet', 'การ์ดสติงเล็ต', 'weapon', '#f2b632', { crit: 0.05, hit: 3 }, 0.0012, 'เหล็กไนแหลมคมเล็งจุดอ่อนได้แม่นยำ'),
  card_thornback: C('thornback', 'การ์ดธอร์นแบ็ก', 'shield', '#b8a46a', { def: 3, atk: 5 }, 0.001, 'ขนหนามแข็งแกร่ง ทั้งกันและแทงสวนศัตรู'),
  card_wisp: C('wisp', 'การ์ดวิสป์', 'accessory', '#9affc8', { int: 2, matk: 12 }, 0.0008, 'แสงวิญญาณป่าช่วยขยายพลังเวทย์'),
  card_barkwolf: C('barkwolf', 'การ์ดบาร์กวูล์ฟ', 'weapon', '#8a6a4a', { str: 2, atk: 12 }, 0.0005, 'เขี้ยวแข็งดั่งไม้เนื้อแข็ง เพิ่มพลังโจมตีอย่างดุดัน'),
  card_gnarlroot: C('gnarlroot', 'การ์ดกนาร์ลรูท', 'body', '#7ac85a', { maxHpPct: 12, vit: 3, def: 2 }, 0.02, 'การ์ด MVP! พลังชีวิตของต้นไม้เฒ่าพันปีปกป้องผู้สวมใส่', 'epic'),
  // v0.11: Frostveil Peaks
  card_frostfox: C('frostfox', 'การ์ดฟรอสต์ฟ็อกซ์', 'shoes', '#e8f4ff', { agi: 2, flee: 8, maxHp: 60 }, 0.0012, 'จิ้งจอกหิมะวิ่งไวดั่งสายลมหนาว'),
  card_frostbat: C('frostbat', 'การ์ดฟรอสต์แบท', 'garment', '#9ad8ff', { flee: 10, dex: 2 }, 0.001, 'ปีกบางใสช่วยให้หลบหลีกราวกับเงา'),
  card_yeti: C('yeti', 'การ์ดเยติ', 'body', '#dfe8f4', { vit: 4, maxHp: 300 }, 0.0008, 'ร่างกายของเยติทนทานทุกพายุ'),
  card_icegolem: C('icegolem', 'การ์ดไอซ์โกเลม', 'shield', '#7fe0ff', { def: 6, mdef: 8 }, 0.0006, 'เกราะน้ำแข็งนิรันดร์ป้องกันทั้งกายและเวทย์'),
  card_glacia: C('glacia', 'การ์ดกลาเซีย', 'head', '#bff4ff', { int: 5, dex: 3, maxSpPct: 15, matk: 25 }, 0.015, 'การ์ด MVP! พลังเวทย์ของราชินีหิมะ', 'epic'),
  // v0.11: Ember Caldera
  card_magmaslime: C('magmaslime', 'การ์ดแมกม่าสไลม์', 'body', '#ff7a2a', { vit: 3, def: 4, maxHp: 250 }, 0.0008, 'เจลแมกมาที่ร้อนระอุ หุ้มตัวไว้ราวเกราะ'),
  card_emberimp: C('emberimp', 'การ์ดเอมเบอร์อิมป์', 'weapon', '#ff5a3a', { atk: 25, crit: 0.06 }, 0.0006, 'อิมป์เจ้าเล่ห์ทำให้ทุกการโจมตีร้อนแรง'),
  card_salamander: C('salamander', 'การ์ดซาลาแมนเดอร์', 'garment', '#ff9a3a', { maxHp: 350, def: 4, str: 2 }, 0.0005, 'เกล็ดทนไฟของซาลาแมนเดอร์ปกป้องผู้สวมใส่'),
  card_obsidiangolem: C('obsidiangolem', 'การ์ดออบซิเดียนโกเลม', 'shield', '#4a3a5a', { def: 10, maxHpPct: 8 }, 0.0004, 'ร่างหินภูเขาไฟที่แทบไม่มีอะไรทำลายได้'),
  card_ignarok: C('ignarok', 'การ์ดอิกนารอก', 'weapon', '#ff4a1a', { atk: 45, str: 5, atkPct: 8 }, 0.01, 'การ์ด MVP! พลังทำลายล้างของมังกรเพลิง', 'epic'),
};

// v0.20: grade existing cards by region; preserve IDs and stat bonuses.
for (const id of ['card_bloblet','card_capling']) CARDS[id].rarity = 'common';
for (const id of ['card_stinglet','card_thornback','card_wisp']) CARDS[id].rarity = 'uncommon';
CARDS.card_ignarok.rarity = 'mythic';

const SLOT_THAI = { weapon: 'อาวุธ', head: 'หมวก', body: 'ชุด', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', accessory: 'เครื่องประดับ' };
export const cardSlotName = (on) => SLOT_THAI[on] || on;

// ไอเทมการ์ด (รวมเข้า ITEMS ใน data/items.js)
export const CARD_ITEMS = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, {
  name: c.name, type: 'card', monster: c.mob, icon: ['card', c.color], price: c.rarity === 'epic' ? 20000 : 4000, rarity: c.rarity,
  on: c.on, bonus: c.bonus, desc: `${c.desc} · ใส่ได้กับ${SLOT_THAI[c.on]}ที่มีช่องการ์ดว่าง`,
}]));

// ตารางดรอปการ์ดของมอนสเตอร์แต่ละชนิด
const BY_MOB = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [c.mob, [id, c.drop]]));
export const cardDrops = (mobType) => (BY_MOB[mobType] ? [BY_MOB[mobType]] : []);
