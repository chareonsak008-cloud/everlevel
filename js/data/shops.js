// ร้านค้า · เงิน Zeny · คลังเก็บของ · เส้นทางวาร์ป
// ปรับเศรษฐกิจของเกมได้จากไฟล์นี้
import { ITEMS } from './items.js';
import { CONSUMABLES } from './consumables.js';

export const START_ZENY = 200;          // เงินเริ่มต้นของตัวละครใหม่
export const MAX_ZENY = 999999999;
export const SELL_RATE = 0.5;           // ขายคืนร้านได้ครึ่งราคา
export const STORAGE_CAPACITY = 100;    // ช่องคลังเก็บของ (ใช้ร่วมกันทั้งบัญชี)

export const sellPrice = (id) => Math.floor(((ITEMS[id] && ITEMS[id].price) || 0) * SELL_RATE);
export const buyPrice = (id) => (ITEMS[id] && ITEMS[id].price) || 0;
export const fmtZ = (n) => `${Math.floor(n).toLocaleString('en-US')} z`;

// สินค้าของแต่ละร้าน (ทุกร้านรับซื้อของทุกชนิด)
export const SHOPS = {
  tools: {
    name: 'ร้านของใช้โทเบน',
    items: ['red_potion', 'orange_potion', 'blue_potion', 'herb', 'white_potion'],
  },
  // v0.11: ร้านเสบียงบนแผนที่ใหม่
  frost: {
    name: 'ร้านเสบียงยอดเขาของเฮลก้า',
    items: ['white_potion', 'orange_potion', 'blue_potion', 'mana_potion', 'refine_w', 'refine_a'],
  },
  ember: {
    name: 'ร้านเสบียงภูเขาไฟของโรซ่า',
    items: ['white_potion', 'royal_jelly', 'mana_potion', 'blue_potion', 'refine_w', 'refine_a', 'refine_guard'],
  },
  arms: {
    name: 'โรงตีเหล็กการ์ธ',
    items: ['knife', 'cutter', 'trainee_blade', 'oak_staff', 'hunter_bow', 'chapel_mace', 'cotton_shirt', 'leather_vest', 'bandana', 'wooden_shield', 'sandals', 'refine_w', 'refine_a', 'refine_guard'],
  },
};

// v0.13: ไอเทมใช้งานที่ขายในร้าน (กำหนด shop ไว้ใน data/consumables.js)
for (const [id, c] of Object.entries(CONSUMABLES)) for (const sh of [].concat(c.shop || [])) if (SHOPS[sh] && !SHOPS[sh].items.includes(id)) SHOPS[sh].items.push(id);

// เส้นทางวาร์ปของนักเวทย์แต่ละคน (arrive เป็นหน่วยช่อง)
export const WARP_ROUTES = {
  frost: [
    { label: 'Asteria Town · ลานน้ำพุ', hint: 'กลับเมือง', map: 'asteria_town', arrive: { x: 31.5, y: 27.5, angle: 0 }, cost: 300 },
    { label: 'Whisperwood Forest · ทางเข้า', hint: 'ป่ากระซิบ', map: 'whisper_forest', arrive: { x: 7.5, y: 28.5, angle: Math.PI / 2 }, cost: 150 },
    { label: 'Ember Caldera · ค่ายผู้กล้า', hint: 'ภูเขาไฟ · แนะนำ Lv.40+', map: 'ember_caldera', arrive: { x: 8.5, y: 31.5, angle: Math.PI / 2 }, cost: 800 },
  ],
  ember: [
    { label: 'Asteria Town · ลานน้ำพุ', hint: 'กลับเมือง', map: 'asteria_town', arrive: { x: 31.5, y: 27.5, angle: 0 }, cost: 600 },
    { label: 'Frostveil Peaks · ค่ายนักสำรวจ', hint: 'ยอดเขาหิมะ', map: 'frostveil', arrive: { x: 42, y: 57.5, angle: Math.PI }, cost: 400 },
  ],
  town: [
    { label: 'Beginner Field · ทางเข้าตะวันตก', hint: 'บล็อบเล็ต · แนะนำ Lv.1+', map: 'beginner_field', arrive: { x: 5.5, y: 27.5, angle: Math.PI / 2 }, cost: 10 },
    { label: 'Beginner Field · ทางแยกใต้', hint: 'แคปปลิง · แนะนำ Lv.3+', map: 'beginner_field', arrive: { x: 53.5, y: 32.5, angle: 0 }, cost: 40 },
    { label: 'Beginner Field · ลานซากโบราณ', hint: 'สติงเล็ต (ดุร้าย) · แนะนำ Lv.6+', map: 'beginner_field', arrive: { x: 56.5, y: 13.5, angle: 0 }, cost: 60 },
    { label: 'Whisperwood Forest · ทางเข้า', hint: 'ธอร์นแบ็ก วิสป์ บาร์กวูล์ฟ · แนะนำ Lv.9+', map: 'whisper_forest', arrive: { x: 7.5, y: 28.5, angle: Math.PI / 2 }, cost: 90 },
    { label: 'Frostveil Peaks · ค่ายนักสำรวจ', hint: 'ยอดเขาหิมะ · แนะนำ Lv.20+', map: 'frostveil', arrive: { x: 42, y: 57.5, angle: Math.PI }, cost: 600 },
    { label: 'Ember Caldera · ค่ายผู้กล้า', hint: 'ภูเขาไฟ · แนะนำ Lv.40+', map: 'ember_caldera', arrive: { x: 8.5, y: 31.5, angle: Math.PI / 2 }, cost: 1500 },
  ],
  ruins: [
    { label: 'Asteria Town · ลานน้ำพุ', hint: 'กลับเมือง', map: 'asteria_town', arrive: { x: 31.5, y: 27.5, angle: 0 }, cost: 30 },
    { label: 'Beginner Field · ทางเข้าตะวันตก', hint: 'ข้างกองไฟของลีน่า', map: 'beginner_field', arrive: { x: 5.5, y: 27.5, angle: Math.PI / 2 }, cost: 10 },
    { label: 'Beginner Field · ทางแยกใต้', hint: 'แคปปลิง', map: 'beginner_field', arrive: { x: 53.5, y: 32.5, angle: 0 }, cost: 20 },
    { label: 'Whisperwood Forest · ทางเข้า', hint: 'ป่าทางตะวันออก · แนะนำ Lv.9+', map: 'whisper_forest', arrive: { x: 7.5, y: 28.5, angle: Math.PI / 2 }, cost: 30 },
  ],
  forest: [
    { label: 'Asteria Town · ลานน้ำพุ', hint: 'กลับเมือง', map: 'asteria_town', arrive: { x: 31.5, y: 27.5, angle: 0 }, cost: 40 },
    { label: 'Frostveil Peaks · ค่ายนักสำรวจ', hint: 'ยอดเขาหิมะทางเหนือ · แนะนำ Lv.20+', map: 'frostveil', arrive: { x: 42, y: 57.5, angle: Math.PI }, cost: 300 },
    { label: 'Beginner Field · ลานซากโบราณ', hint: 'ข้างไอริส', map: 'beginner_field', arrive: { x: 56.5, y: 13.5, angle: 0 }, cost: 20 },
    { label: 'Beginner Field · ทางเข้าตะวันตก', hint: 'ข้างกองไฟของลีน่า', map: 'beginner_field', arrive: { x: 5.5, y: 27.5, angle: Math.PI / 2 }, cost: 20 },
  ],
};

// v0.20: high-level waypoints, visible from town and both new camps.
const ancientRoute={label:'Ancient Ruins · ค่ายนักสำรวจ',hint:'Lv.60–75',map:'ancient_ruins',arrive:{x:5.5,y:29.5,angle:Math.PI/2},cost:2200};
const hauntedRoute={label:'Haunted Forest · ค่ายจันทร์',hint:'Lv.75–90 / เขตลึก 90–99',map:'haunted_forest',arrive:{x:5.5,y:31.5,angle:Math.PI/2},cost:3200};
WARP_ROUTES.town.push(ancientRoute,hauntedRoute);
WARP_ROUTES.ember.push(ancientRoute,hauntedRoute);
WARP_ROUTES.ancient=[WARP_ROUTES.ember[0],WARP_ROUTES.town.find(r=>r.map==='ember_caldera'),hauntedRoute];
WARP_ROUTES.haunted=[WARP_ROUTES.ember[0],ancientRoute];
SHOPS.endgame={...SHOPS.ember,name:'เสบียงดินแดนระดับสูง'};
