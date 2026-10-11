// ข้อมูลไอเทมทั้งหมด (ออกแบบใหม่ทั้งหมด)
// type: usable = ใช้แล้วหมด | etc = ของสะสม/วัตถุดิบ | equip = สวมใส่ได้
// icon: รูปทรงไอคอน + สี (วาดด้วยโค้ดใน render/ItemIcons.js)
// price: ราคาซื้อจากร้านค้า (ขายคืนร้านได้ครึ่งราคา ดู data/shops.js)
// wtype: ชนิดอาวุธ (knife/sword/mace/staff/bow) · jobs: อาชีพที่สวมใส่ได้ (ไม่ระบุ = ทุกอาชีพ)
// v0.9: type box = กล่องแฟชั่นสุ่ม (ข้อมูลอยู่ใน data/fashionBoxes.js)
// v0.10: slots = ช่องการ์ด · type card = การ์ดมอนสเตอร์ (data/cards.js) · วัสดุตีบวก (data/refine.js)
//        อุปกรณ์ที่ตีบวก/ใส่การ์ดแล้วใช้ "คีย์" แทน id เช่น 'iron_blade*7*card_barkwolf' (ดู itemKey ด้านล่าง)
import { ENDGAME_ITEMS } from './endgameItems.js';
import { BOX_ITEMS } from './fashionBoxes.js';
import { CARD_ITEMS, CARDS } from './cards.js';
import { REFINE_ITEMS, refineBonus, REFINE_MAX } from './refine.js';
import { CONSUMABLES } from './consumables.js';   // v0.13: ใบวาร์ป ใบคูณ ยาบัฟ ไข่สัตว์เลี้ยง ฯลฯ

export const EQUIP_SLOTS = [
  { id: 'head', name: 'หัว' },
  { id: 'body', name: 'ชุด' },
  { id: 'weapon', name: 'อาวุธ' },
  { id: 'shield', name: 'โล่' },
  { id: 'garment', name: 'ผ้าคลุม' },
  { id: 'shoes', name: 'รองเท้า' },
  { id: 'accessory', name: 'เครื่องประดับ' },
];

export const RARITY = {
  common: { name: 'ธรรมดา', color: '#f2ece0' },
  uncommon: { name: 'ดี', color: '#8fe08a' },
  rare: { name: 'หายาก', color: '#7fc4ff' },
  epic: { name: 'ล้ำค่า', color: '#d49bff' },
  legend: { name: 'ตำนาน · ส้ม', color: '#ffb347' },
  mythic: { name: 'เทพนิยาย · ทอง', color: '#ffd85e' },
  celestial: { name: 'จันทร์โลหิต · แดง', color: '#ff5266' },   // v0.13
};

const BASE = {
  /* ---------- ใช้งาน ---------- */
  red_potion: { name: 'ยาแดง', type: 'usable', icon: ['potion', '#e8384f'], heal: { hp: [45, 65] }, price: 50, desc: 'ยาฟื้นฟูพื้นฐานของนักผจญภัย' },
  orange_potion: { name: 'ยาส้ม', type: 'usable', icon: ['potion', '#ff8a2a'], heal: { hp: [105, 145] }, price: 200, rarity: 'uncommon', desc: 'ยาฟื้นฟูสูตรเข้มข้น' },
  blue_potion: { name: 'ยาฟ้า', type: 'usable', icon: ['potion', '#3a8ef0'], heal: { sp: [30, 45] }, price: 400, rarity: 'uncommon', desc: 'ฟื้นพลังจิต (SP)' },
  herb: { name: 'สมุนไพรเขียว', type: 'usable', icon: ['leaf', '#4fb84a'], heal: { hp: [18, 28] }, price: 20, desc: 'สมุนไพรที่ขึ้นทั่วทุ่ง เคี้ยวแล้วสดชื่น' },
  glowcap: { name: 'เห็ดเรืองแสง', type: 'usable', icon: ['mushroom', '#4ad8ff'], heal: { sp: [10, 16] }, price: 60, desc: 'เห็ดที่เรืองแสงจาง ๆ ช่วยฟื้น SP เล็กน้อย' },
  honey: { name: 'รวงน้ำผึ้ง', type: 'usable', icon: ['honey', '#f2b632'], heal: { hp: [60, 80], sp: [10, 15] }, price: 160, rarity: 'uncommon', desc: 'หวานหอม ฟื้นทั้ง HP และ SP' },

  /* ---------- ของสะสม ---------- */
  thorn_quill: { name: 'ขนหนามธอร์นแบ็ก', type: 'etc', icon: ['spike', '#b8a46a'], price: 44, desc: 'ขนแข็งเป็นหนาม ช่างทำโล่ชอบมาก' },
  wisp_dust: { name: 'ผงแสงวิสป์', type: 'etc', icon: ['spore', '#9affc8'], price: 70, desc: 'ผงเรืองแสงที่เหลือจากวิสป์ อุ่นเล็กน้อยเมื่อจับ' },
  wolf_fang: { name: 'เขี้ยวบาร์กวูล์ฟ', type: 'etc', icon: ['fang', '#efe6d0'], price: 96, desc: 'เขี้ยวแข็งดั่งไม้เนื้อแข็ง' },
  ancient_bark: { name: 'เปลือกไม้โบราณ', type: 'etc', icon: ['bark', '#8a6a3e'], price: 900, rarity: 'rare', desc: 'เปลือกจากต้นไม้เฒ่าอายุนับพันปี ยังมีพลังชีวิตหลงเหลือ' },
  jelly_drop: { name: 'เมือกเยลลี่', type: 'etc', icon: ['blob', '#6fd8c8'], price: 12, desc: 'เมือกเหนียวหนึบจากบล็อบเล็ต ใช้ทำกาวได้' },
  cap_spore: { name: 'สปอร์หมวกเห็ด', type: 'etc', icon: ['spore', '#4a8fd8'], price: 28, desc: 'ผงสปอร์สีฟ้าจากหมวกของแคปปลิง' },
  stinger: { name: 'เหล็กไนผึ้ง', type: 'etc', icon: ['spike', '#e8e2d8'], price: 60, desc: 'เหล็กไนแหลมคม ระวังโดนนิ้ว' },

  /* ---------- อุปกรณ์ ---------- */
  knife: { name: 'มีดสั้น', type: 'equip', slots: 2, slot: 'weapon', wtype: 'knife', jobs: ['novice', 'swordsman', 'mage', 'archer'], icon: ['knife', '#dfe4ea'], visual: { weapon: 'knife' }, bonus: { atk: 10 }, price: 50, desc: 'มีดสั้นของ Novice ทุกคน' },
  cutter: { name: 'ดาบสั้นคัตเตอร์', type: 'equip', slots: 2, slot: 'weapon', wtype: 'sword', jobs: ['novice', 'swordsman'], icon: ['sword', '#cfd8e6'], visual: { weapon: 'sword', bladeGlow: '#9ad8ff' }, bonus: { atk: 18 }, reqLevel: 3, price: 600, rarity: 'uncommon', desc: 'ดาบสั้นคมกริบ น้ำหนักเบา' },
  iron_blade: { name: 'ดาบเหล็กเงา', type: 'equip', slots: 1, slot: 'weapon', wtype: 'sword', jobs: ['novice', 'swordsman'], icon: ['sword', '#a8c8ff'], visual: { weapon: 'sword', bladeGlow: '#6fd0ff' }, bonus: { atk: 28, hit: 3 }, reqLevel: 8, price: 2400, rarity: 'rare', desc: 'ใบดาบสะท้อนแสงสีฟ้า ตีแม่นขึ้น' },
  // อาวุธประจำอาชีพ (v0.6) — ได้รับฟรีตอนเปลี่ยนอาชีพ และซื้อเพิ่มได้ที่ร้านการ์ธ
  trainee_blade: { name: 'ดาบฝึกหัดนักดาบ', type: 'equip', slots: 1, slot: 'weapon', wtype: 'sword', jobs: ['swordsman'], icon: ['sword', '#e8d8b0'], visual: { weapon: 'sword', bladeGlow: '#ffd27a' }, bonus: { atk: 24 }, price: 300, desc: 'ดาบที่สมาคมมอบให้นักดาบหน้าใหม่ทุกคน' },
  oak_staff: { name: 'ไม้เท้าโอ๊ค', type: 'equip', slots: 1, slot: 'weapon', wtype: 'staff', jobs: ['mage', 'acolyte'], icon: ['staff', '#7fe0ff'], visual: { weapon: 'staff', gem: '#7fe0ff' }, bonus: { atk: 8, matk: 18, int: 1 }, price: 500, desc: 'ไม้เท้าฝังผลึกฟ้า ช่วยรวมพลังเวทย์' },
  hunter_bow: { name: 'ธนูนักล่า', type: 'equip', slots: 1, slot: 'weapon', wtype: 'bow', jobs: ['archer'], icon: ['bow', '#b8865a'], visual: { weapon: 'bow' }, bonus: { atk: 20 }, price: 600, desc: 'ธนูไม้ยืดหยุ่น ยิงได้ไกล 5 ช่อง' },
  chapel_mace: { name: 'คทาโบสถ์', type: 'equip', slots: 1, slot: 'weapon', wtype: 'mace', jobs: ['acolyte', 'swordsman'], icon: ['mace', '#e8c050'], visual: { weapon: 'mace' }, bonus: { atk: 18, matk: 8 }, price: 550, desc: 'คทาหัวทองเหลืองที่ผ่านการอวยพร' },
  // อุปกรณ์จาก Whisperwood Forest (v0.7)
  fang_dagger: { name: 'มีดเขี้ยวหมาป่า', type: 'equip', slots: 2, slot: 'weapon', wtype: 'knife', jobs: ['novice', 'swordsman', 'mage', 'archer'], icon: ['knife', '#efe6d0'], visual: { weapon: 'knife' }, bonus: { atk: 34, crit: 0.03 }, reqLevel: 10, price: 1400, rarity: 'rare', desc: 'มีดที่ทำจากเขี้ยวบาร์กวูล์ฟ คมจนน่ากลัว' },
  rootcleaver: { name: 'ดาบผ่ารากพฤกษา', type: 'equip', slots: 1, slot: 'weapon', wtype: 'sword', jobs: ['swordsman'], icon: ['sword', '#c8f0a0'], visual: { weapon: 'sword', bladeGlow: '#8aff6a' }, bonus: { atk: 58, str: 3, vit: 2 }, reqLevel: 15, price: 9000, rarity: 'epic', desc: 'ดาบที่ตีจากแก่นไม้ของกนาร์ลรูท ใบดาบเรืองแสงสีเขียว' },
  heartwood_staff: { name: 'ไม้เท้าแก่นพฤกษา', type: 'equip', slots: 1, slot: 'weapon', wtype: 'staff', jobs: ['mage', 'acolyte'], icon: ['staff', '#8aff6a'], visual: { weapon: 'staff', gem: '#8aff6a' }, bonus: { atk: 14, matk: 60, int: 4, maxSp: 30 }, reqLevel: 15, price: 9000, rarity: 'epic', desc: 'แก่นไม้ศักดิ์สิทธิ์ที่เก็บพลังชีวิตของป่าไว้ทั้งหมด' },
  sylvan_bow: { name: 'ธนูพงไพร', type: 'equip', slots: 1, slot: 'weapon', wtype: 'bow', jobs: ['archer'], icon: ['bow', '#6ac04a'], visual: { weapon: 'bow', bowColor: '#5a8a3a' }, bonus: { atk: 50, dex: 4, hit: 5 }, reqLevel: 15, price: 9000, rarity: 'epic', desc: 'ธนูที่มีใบไม้ผลิออกมาตามคัน ยิงแม่นราวกับลมนำทาง' },
  bark_mail: { name: 'เกราะเปลือกไม้', type: 'equip', slots: 1, slot: 'body', icon: ['shirt', '#6a4a2a'], visual: { tunic: '#6a4a2a' }, bonus: { def: 8, maxHp: 40 }, reqLevel: 12, price: 1200, rarity: 'uncommon', desc: 'เกราะที่สานจากเปลือกไม้แข็ง เบาแต่ทนทาน' },
  thorn_guard: { name: 'โล่หนาม', type: 'equip', slots: 1, slot: 'shield', icon: ['shield', '#5a7a3a'], visual: { shield: '#5a7a3a' }, bonus: { def: 6, atk: 4 }, reqLevel: 10, price: 1000, rarity: 'uncommon', desc: 'โล่ที่ประดับขนหนามธอร์นแบ็กไว้รอบขอบ' },
  wisp_lantern: { name: 'โคมวิสป์', type: 'equip', slots: 1, slot: 'accessory', icon: ['lantern', '#9affc8'], bonus: { int: 3, maxSp: 25 }, reqLevel: 10, price: 2400, rarity: 'rare', desc: 'โคมเล็ก ๆ ที่มีวิสป์ใจดีอาศัยอยู่' },
  gnarl_crown: { name: 'มงกุฎกิ่งไม้เฒ่า', type: 'equip', slots: 1, slot: 'head', icon: ['crown', '#8aff6a'], visual: { headgear: 'crown', headColor: '#6a4a2a' }, bonus: { def: 4, str: 2, vit: 2, int: 2, maxHp: 60 }, reqLevel: 15, price: 9000, rarity: 'epic', desc: 'มงกุฎที่งอกจากกิ่งของกนาร์ลรูท ใบไม้ไม่เคยร่วง' },
  cotton_shirt: { name: 'เสื้อผ้าฝ้าย', type: 'equip', slots: 1, slot: 'body', icon: ['shirt', '#3f6fc4'], bonus: { def: 1 }, price: 40, desc: 'เสื้อธรรมดาที่ใส่สบาย' },
  leather_vest: { name: 'เสื้อหนังกลับ', type: 'equip', slots: 1, slot: 'body', icon: ['shirt', '#8a5a32'], visual: { tunic: '#8a5a32' }, bonus: { def: 4 }, reqLevel: 4, price: 500, rarity: 'uncommon', desc: 'เสื้อหนังทนทาน กันกรงเล็บได้ดี' },
  bandana: { name: 'ผ้าโพกหัว', type: 'equip', slots: 0, slot: 'head', icon: ['bandana', '#d8433a'], visual: { headgear: 'bandana', headColor: '#d8433a' }, bonus: { def: 1 }, price: 150, desc: 'ผ้าโพกหัวสีแดงสด ใส่แล้วดูเท่' },
  flower_pin: { name: 'กิ๊บดอกไม้', type: 'equip', slots: 1, slot: 'head', icon: ['flower', '#ff8fb8'], visual: { headgear: 'flower', headColor: '#ff8fb8' }, bonus: { luk: 2 }, price: 600, rarity: 'uncommon', desc: 'ดอกไม้ที่ไม่มีวันเหี่ยว นำโชคมาให้' },
  wooden_shield: { name: 'โล่ไม้กลม', type: 'equip', slots: 1, slot: 'shield', icon: ['shield', '#9b6b3e'], visual: { shield: '#9b6b3e' }, bonus: { def: 3 }, price: 400, rarity: 'uncommon', desc: 'โล่ไม้เนื้อแข็งขอบเหล็ก' },
  traveler_cape: { name: 'ผ้าคลุมนักเดินทาง', type: 'equip', slots: 1, slot: 'garment', icon: ['cape', '#4a6a3a'], visual: { cape: '#4a6a3a' }, bonus: { def: 1, flee: 2 }, price: 1000, rarity: 'uncommon', desc: 'ผ้าคลุมกันลมกันฝน ทำให้ขยับคล่องขึ้น' },
  sandals: { name: 'รองเท้าแตะ', type: 'equip', slots: 1, slot: 'shoes', icon: ['boots', '#b8865a'], bonus: { def: 1, maxHp: 10 }, price: 160, desc: 'รองเท้าเดินสบาย' },
  jelly_ring: { name: 'แหวนเยลลี่', type: 'equip', slots: 0, slot: 'accessory', icon: ['ring', '#6fd8c8'], bonus: { vit: 2 }, price: 1600, rarity: 'rare', desc: 'แหวนใสที่ทำจากแกนของบล็อบเล็ต' },
  bee_brooch: { name: 'เข็มกลัดผึ้งทอง', type: 'equip', slots: 1, slot: 'accessory', icon: ['brooch', '#f2b632'], bonus: { agi: 2, flee: 2 }, price: 2400, rarity: 'rare', desc: 'เข็มกลัดรูปผึ้ง ทำให้ตัวเบาว่องไว' },
  clover_charm: { name: 'เครื่องรางสี่แฉก', type: 'equip', slots: 1, slot: 'accessory', icon: ['clover', '#5ad86a'], bonus: { luk: 3, crit: 0.02 }, price: 6000, rarity: 'epic', desc: 'ใบไม้สี่แฉกที่หายากที่สุดในทุ่ง' },

  /* ---------- v0.11: ยาระดับสูง + ของสะสมจากแผนที่ใหม่ ---------- */
  white_potion: { name: 'ยาขาว', type: 'usable', icon: ['potion', '#f4f4ff'], heal: { hp: [380, 460] }, price: 1200, rarity: 'uncommon', desc: 'ยาฟื้นฟูสูตรนักผจญภัยระดับสูง ฟื้น HP จำนวนมาก' },
  royal_jelly: { name: 'นมผึ้งหลวง', type: 'usable', icon: ['honey', '#ffe08a'], heal: { hp: [900, 1100], sp: [80, 100] }, price: 5000, rarity: 'rare', desc: 'ของล้ำค่าจากรังผึ้งหลวง ฟื้นทั้ง HP และ SP ได้มาก' },
  mana_potion: { name: 'ยาม่วงมานา', type: 'usable', icon: ['potion', '#a86aff'], heal: { sp: [110, 140] }, price: 2600, rarity: 'rare', desc: 'ยาฟื้นพลังจิตเข้มข้น สำหรับนักเวทย์ระดับสูง' },
  frost_fur: { name: 'ขนจิ้งจอกหิมะ', type: 'etc', icon: ['spore', '#e8f4ff'], price: 180, desc: 'ขนนุ่มเย็นเฉียบ ใช้ทำเสื้อกันหนาว' },
  bat_wing: { name: 'ปีกค้างคาวน้ำแข็ง', type: 'etc', icon: ['fang', '#9ad8ff'], price: 240, desc: 'ปีกบางใสราวแผ่นน้ำแข็ง' },
  yeti_fur: { name: 'ขนเยติ', type: 'etc', icon: ['bark', '#e8eef8'], price: 420, desc: 'ขนหนาสีขาวของเยติ ทนความหนาวได้ดี' },
  ice_core: { name: 'แกนน้ำแข็งนิรันดร์', type: 'etc', icon: ['crystal', '#7fe0ff'], price: 900, rarity: 'uncommon', desc: 'แกนพลังของไอซ์โกเลม ไม่ละลายแม้โดนไฟ' },
  glacia_scale: { name: 'เกล็ดราชินีหิมะ', type: 'etc', icon: ['crystal', '#bff4ff'], price: 6000, rarity: 'epic', desc: 'เกล็ดที่หลุดจากกลาเซีย เปล่งแสงเย็นยะเยือก' },
  magma_gel: { name: 'เจลแมกมา', type: 'etc', icon: ['blob', '#ff7a2a'], price: 520, desc: 'เจลร้อนระอุจากแมกม่าสไลม์ ยังคุกรุ่นอยู่' },
  imp_horn: { name: 'เขาอิมป์เพลิง', type: 'etc', icon: ['spike', '#ff5a3a'], price: 680, desc: 'เขาเล็กแหลมคม ยังมีประกายไฟ' },
  salamander_scale: { name: 'เกล็ดซาลาแมนเดอร์', type: 'etc', icon: ['bark', '#ff9a3a'], price: 900, desc: 'เกล็ดทนไฟสูง ช่างเกราะต้องการมาก' },
  obsidian_shard: { name: 'เศษออบซิเดียน', type: 'etc', icon: ['crystal', '#4a3a5a'], price: 1400, rarity: 'uncommon', desc: 'หินภูเขาไฟสีดำเงา คมกริบดั่งใบมีด' },
  dragon_flame: { name: 'เปลวไฟมังกร', type: 'etc', icon: ['crystal', '#ff6a2a'], price: 30000, rarity: 'epic', desc: 'เปลวไฟที่ไม่มีวันดับจากอิกนารอก' },

  /* ---------- v0.11: อุปกรณ์ Frostveil Peaks (Lv.25+) ---------- */
  frost_saber: { name: 'ดาบน้ำแข็งฟรอสต์', type: 'equip', slots: 1, slot: 'weapon', wtype: 'sword', jobs: ['swordsman'], icon: ['sword', '#bff0ff'], visual: { weapon: 'sword', bladeGlow: '#7fe0ff' }, bonus: { atk: 88, dex: 2 }, reqLevel: 25, price: 16000, rarity: 'rare', desc: 'ใบดาบที่ตีจากแกนน้ำแข็งนิรันดร์ เย็นจนไอขาวลอย' },
  icicle_staff: { name: 'ไม้เท้าย้อยน้ำแข็ง', type: 'equip', slots: 1, slot: 'weapon', wtype: 'staff', jobs: ['mage', 'acolyte'], icon: ['staff', '#9ae8ff'], visual: { weapon: 'staff', gem: '#9ae8ff' }, bonus: { atk: 22, matk: 98, int: 3, maxSp: 40 }, reqLevel: 25, price: 16000, rarity: 'rare', desc: 'ปลายไม้เท้าเป็นผลึกน้ำแข็งที่ไม่มีวันละลาย' },
  glacier_bow: { name: 'ธนูธารน้ำแข็ง', type: 'equip', slots: 1, slot: 'weapon', wtype: 'bow', jobs: ['archer'], icon: ['bow', '#9ad8ff'], visual: { weapon: 'bow', bowColor: '#7ab8d8' }, bonus: { atk: 84, dex: 3, hit: 6 }, reqLevel: 25, price: 16000, rarity: 'rare', desc: 'ธนูที่คันทำจากน้ำแข็งอัดแน่น ลูกศรเย็นยะเยือก' },
  frost_mace: { name: 'คทาฟรอสต์', type: 'equip', slots: 1, slot: 'weapon', wtype: 'mace', jobs: ['acolyte', 'swordsman'], icon: ['mace', '#bff0ff'], visual: { weapon: 'mace' }, bonus: { atk: 74, matk: 40, vit: 2 }, reqLevel: 25, price: 16000, rarity: 'rare', desc: 'หัวคทาเป็นก้อนน้ำแข็งแข็งดั่งเหล็ก' },
  frost_dagger: { name: 'มีดเกล็ดหิมะ', type: 'equip', slots: 2, slot: 'weapon', wtype: 'knife', jobs: ['novice', 'swordsman', 'mage', 'archer'], icon: ['knife', '#dff6ff'], visual: { weapon: 'knife' }, bonus: { atk: 64, crit: 0.04, agi: 2 }, reqLevel: 22, price: 12000, rarity: 'rare', desc: 'มีดใสดั่งเกล็ดหิมะ เบาและคมมาก' },
  yeti_coat: { name: 'เสื้อขนเยติ', type: 'equip', slots: 1, slot: 'body', icon: ['shirt', '#e8eef8'], visual: { tunic: '#dfe8f4' }, bonus: { def: 15, maxHp: 160, vit: 2 }, reqLevel: 30, price: 14000, rarity: 'rare', desc: 'เสื้อขนหนานุ่ม อุ่นสบายแม้กลางพายุหิมะ' },
  frost_boots: { name: 'รองเท้าลุยหิมะ', type: 'equip', slots: 1, slot: 'shoes', icon: ['boots', '#9ad8ff'], bonus: { def: 4, flee: 6, agi: 2 }, reqLevel: 28, price: 9000, rarity: 'rare', desc: 'พื้นรองเท้ามีหนามน้ำแข็ง เดินบนหิมะได้มั่นคง' },
  glacia_crown: { name: 'มงกุฎราชินีหิมะ', type: 'equip', slots: 1, slot: 'head', icon: ['crown', '#bff4ff'], visual: { headgear: 'crown', headColor: '#bff4ff' }, bonus: { def: 7, int: 4, dex: 3, maxSp: 60, mdef: 6 }, reqLevel: 40, price: 60000, rarity: 'epic', desc: 'มงกุฎผลึกน้ำแข็งของกลาเซีย พลังเวทย์ไหลเวียนรอบตัว' },
  glacia_mantle: { name: 'ผ้าคลุมธารน้ำแข็ง', type: 'equip', slots: 1, slot: 'garment', icon: ['cape', '#9ad8ff'], visual: { cape: '#7ab8e8' }, bonus: { def: 6, flee: 8, maxHp: 180, mdef: 4 }, reqLevel: 40, price: 50000, rarity: 'epic', desc: 'ผ้าคลุมทอจากเกล็ดราชินีหิมะ เบาราวสายลม' },

  /* ---------- v0.11: อุปกรณ์ Ember Caldera (Lv.50+) ---------- */
  flame_blade: { name: 'ดาบเปลวเพลิง', type: 'equip', slots: 1, slot: 'weapon', wtype: 'sword', jobs: ['swordsman'], icon: ['sword', '#ff9a5a'], visual: { weapon: 'sword', bladeGlow: '#ff7a2a' }, bonus: { atk: 165, str: 4 }, reqLevel: 55, price: 60000, rarity: 'epic', desc: 'ใบดาบลุกโชนด้วยไฟจากใจกลางภูเขาไฟ' },
  inferno_staff: { name: 'ไม้เท้านรกเพลิง', type: 'equip', slots: 1, slot: 'weapon', wtype: 'staff', jobs: ['mage', 'acolyte'], icon: ['staff', '#ff7a3a'], visual: { weapon: 'staff', gem: '#ff7a3a' }, bonus: { atk: 40, matk: 185, int: 6, maxSp: 80 }, reqLevel: 55, price: 60000, rarity: 'epic', desc: 'อัญมณีเพลิงบนยอดไม้เท้าเผาผลาญทุกสิ่ง' },
  phoenix_bow: { name: 'ธนูฟีนิกซ์', type: 'equip', slots: 1, slot: 'weapon', wtype: 'bow', jobs: ['archer'], icon: ['bow', '#ff8a3a'], visual: { weapon: 'bow', bowColor: '#c84a2a' }, bonus: { atk: 156, dex: 5, hit: 8 }, reqLevel: 55, price: 60000, rarity: 'epic', desc: 'ธนูที่ทำจากขนนกฟีนิกซ์ ลูกศรลุกเป็นไฟ' },
  magma_hammer: { name: 'ค้อนแมกมา', type: 'equip', slots: 1, slot: 'weapon', wtype: 'mace', jobs: ['acolyte', 'swordsman'], icon: ['mace', '#ff6a2a'], visual: { weapon: 'mace' }, bonus: { atk: 142, matk: 72, vit: 3 }, reqLevel: 55, price: 60000, rarity: 'epic', desc: 'หัวค้อนคือหินหลอมเหลวที่แข็งตัวไม่หมด' },
  cinder_dagger: { name: 'มีดถ่านเพลิง', type: 'equip', slots: 2, slot: 'weapon', wtype: 'knife', jobs: ['novice', 'swordsman', 'mage', 'archer'], icon: ['knife', '#ff8a5a'], visual: { weapon: 'knife' }, bonus: { atk: 118, crit: 0.06, agi: 3 }, reqLevel: 50, price: 42000, rarity: 'epic', desc: 'มีดที่ตีจากเศษออบซิเดียน ร้อนจนเรืองแดง' },
  obsidian_plate: { name: 'เกราะออบซิเดียน', type: 'equip', slots: 1, slot: 'body', icon: ['shirt', '#3a2a3a'], visual: { tunic: '#3a2a3a' }, bonus: { def: 28, maxHp: 420, vit: 3 }, reqLevel: 65, price: 70000, rarity: 'epic', desc: 'เกราะหินภูเขาไฟสีดำ มีรอยแยกเรืองแสงลาวา' },
  ember_cloak: { name: 'ผ้าคลุมถ่านเพลิง', type: 'equip', slots: 1, slot: 'garment', icon: ['cape', '#c84a2a'], visual: { cape: '#a83a2a' }, bonus: { def: 8, flee: 7, maxHp: 140 }, reqLevel: 60, price: 40000, rarity: 'epic', desc: 'ผ้าคลุมทนไฟ ชายผ้าลุกเป็นประกายเมื่อวิ่ง' },
  ember_shield: { name: 'โล่เกล็ดเพลิง', type: 'equip', slots: 1, slot: 'shield', icon: ['shield', '#c84a2a'], visual: { shield: '#a83a2a' }, bonus: { def: 14, mdef: 6, maxHp: 100 }, reqLevel: 60, price: 40000, rarity: 'epic', desc: 'โล่ที่หุ้มด้วยเกล็ดซาลาแมนเดอร์ ทนไฟได้ดีเยี่ยม' },
  dragon_heart: { name: 'หัวใจมังกรเพลิง', type: 'equip', slots: 1, slot: 'accessory', icon: ['brooch', '#ff5a2a'], bonus: { str: 5, int: 5, dex: 3, maxHpPct: 10, atk: 20, matk: 20 }, reqLevel: 80, price: 200000, rarity: 'epic', desc: 'หัวใจของอิกนารอกที่ยังเต้นอยู่ เปี่ยมด้วยพลังมังกร' },

  /* ---------- กล่องแฟชั่นสุ่ม (v0.9) ---------- */
  ...ENDGAME_ITEMS,
  ...BOX_ITEMS,

  /* ---------- การ์ด + วัสดุตีบวก (v0.10) ---------- */
  ...CARD_ITEMS,
  ...REFINE_ITEMS,
  ...Object.fromEntries(Object.entries(CONSUMABLES).map(([id, c]) => [id, { ...c, type: 'usable' }])),
};

/* ---------- อุปกรณ์ตีบวก/ใส่การ์ด (v0.10) ----------
   คีย์ = 'base*ระดับตีบวก*การ์ด1,การ์ด2' (ไม่มีการตีบวกหรือการ์ด = id เดิม) — เก็บในกระเป๋า/คลัง/ช่องสวมใส่ได้เหมือนไอเทมปกติ
   ITEMS[คีย์] คืนข้อมูลไอเทมที่รวมชื่อ (+7 ...) และโบนัส (ฐาน + ตีบวก + การ์ด) ไว้แล้ว โค้ดเดิมทั้งหมดใช้ได้ทันที */
export const BASE_ITEMS = BASE;

export function splitKey(key) {
  const [base, r, c] = String(key).split('*');
  return { base, refine: Math.max(0, Math.min(REFINE_MAX, Math.floor(+r) || 0)), cards: c ? c.split(',').filter(Boolean) : [] };
}

export function itemKey(base, refine = 0, cards = []) {
  const cs = [...cards].filter(Boolean).sort();
  return !refine && !cs.length ? base : `${base}*${refine}*${cs.join(',')}`;
}

const addBonus = (out, o) => { for (const [k, v] of Object.entries(o || {})) out[k] = +(((out[k] || 0) + v).toFixed(4)); return out; };
const variants = new Map();
function variant(key) {
  if (variants.has(key)) return variants.get(key);
  const { base, refine, cards } = splitKey(key);
  const b = BASE[base];
  let v;
  if (!b || b.type !== 'equip' || cards.length > (b.slots || 0) || cards.some((c) => !CARDS[c] || CARDS[c].on !== b.slot) || itemKey(base, refine, cards) !== key) v = undefined;
  else {
    const bonus = addBonus(addBonus({ ...(b.bonus || {}) }, refineBonus(b, refine)), {});
    for (const c of cards) addBonus(bonus, CARDS[c].bonus);
    v = { ...b, baseId: base, refine, cards, bonus, baseBonus: b.bonus || {}, name: (refine ? `+${refine} ` : '') + b.name };
  }
  variants.set(key, v);
  return v;
}

export const ITEMS = new Proxy(BASE, {
  get(t, k) {
    if (typeof k !== 'string' || Object.prototype.hasOwnProperty.call(t, k)) return t[k];
    return k.includes('*') ? variant(k) : undefined;   // v0.16: ชื่ออย่าง 'constructor' ไม่ใช่ไอเทม
  },
});

// ข้อมูลตีบวก/การ์ดของคีย์ใดก็ได้ (ไอเทมปกติ = ระดับ 0 ไม่มีการ์ด)
export function itemMods(key) {
  const { base, refine, cards } = splitKey(key);
  return { base, refine, cards, slots: (BASE[base] && BASE[base].slots) || 0 };
}

// ของเริ่มต้นสำหรับผู้เล่นใหม่
export const START_INVENTORY = [['red_potion', 5], ['herb', 4]];
export const START_EQUIP = { weapon: 'knife', body: 'cotton_shirt' };
export const START_HOTBAR = ['red_potion', 'herb', 'skill:first_aid', null, null, null, null, null, null];

export const BONUS_LABEL = {
  atk: 'ATK', matk: 'MATK', def: 'DEF', mdef: 'MDEF', hit: 'HIT', flee: 'FLEE', crit: 'CRIT', maxHp: 'Max HP', maxSp: 'Max SP',
  str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK',
  maxHpPct: 'Max HP', maxSpPct: 'Max SP', atkPct: 'ATK', defPct: 'DEF', aspdPct: 'ASPD',
  matkPct: 'MATK', mdefPct: 'MDEF', speedPct: 'ความเร็วเดิน', regenPct: 'ฟื้น HP', spRegenPct: 'ฟื้น SP',
};

// สวมใส่อาวุธ/อุปกรณ์นี้ได้ไหมตามอาชีพ
export const canJobUse = (it, job) => !it.jobs || it.jobs.includes(job);

export function describeBonus(bonus = {}) {
  return Object.entries(bonus).map(([k, v]) => `${BONUS_LABEL[k] || k} +${k === 'crit' ? +(v * 100).toFixed(1) + '%' : k.endsWith('Pct') ? v + '%' : v}`).join(' · ');
}
