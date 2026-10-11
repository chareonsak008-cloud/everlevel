// ระบบสะสมและเป้าหมายระยะยาว (v0.18)
// · สมุดมอนสเตอร์: กำจัดครบ 100 / 500 / 1,000 ตัว (MVP 5 / 20 / 50 ตัว) → ค่าสเตตัสถาวร
// · ความสำเร็จ: ทำครบแล้วได้ฉายา (ใส่โชว์เหนือหัว) + โบนัสเล็กน้อย (ได้ทุกอันที่ปลดล็อก ไม่ต้องใส่ฉายา)
// · อัลบั้มการ์ด: เคยได้การ์ดครบชุด → โบนัสชุด (ไม่ต้องใส่การ์ด ไม่เสียการ์ด)
// · เช็กอินรายวัน: เข้าเกมวันละครั้ง → รางวัลวันที่ 1–7 วนรอบ ส่งเข้ากล่องจดหมาย
import { ENDGAME_MONSTERS } from './endgameMonsters.js';
import { MONSTERS } from './monsters.js';
import { CARDS } from './cards.js';
import { MAPS } from './maps/index.js';

/* ---------- สมุดมอนสเตอร์ ---------- */
export const BOOK_TIERS = [100, 500, 1000];
export const BOOK_TIERS_MVP = [5, 20, 50];
// รางวัลแต่ละขั้น: [ขั้น 1, ขั้น 2, ขั้น 3]
const T = (stat, sub) => [{ [stat]: 1 }, sub, { [stat]: 1, ...sub }];
export const BOOK = {
  bloblet: T('agi', { flee: 3 }),
  capling: T('int', { maxSp: 20 }),
  stinglet: T('dex', { hit: 3 }),
  thornback: T('vit', { def: 2 }),
  wisp: T('int', { matk: 5 }),
  barkwolf: T('str', { atk: 5 }),
  gnarlroot: [{ maxHpPct: 2 }, { vit: 2 }, { maxHpPct: 3, def: 3 }],
  frostfox: T('agi', { flee: 4 }),
  frostbat: T('dex', { hit: 4 }),
  yeti: T('vit', { maxHp: 80 }),
  icegolem: T('vit', { mdef: 3 }),
  glacia: [{ maxSpPct: 3 }, { int: 2 }, { matk: 15, mdef: 3 }],
  magmaslime: T('vit', { maxHp: 120 }),
  emberimp: T('luk', { crit: 0.01 }),
  salamander: T('str', { atk: 8 }),
  obsidiangolem: T('vit', { def: 4 }),
  ...Object.fromEntries(Object.keys(ENDGAME_MONSTERS).map((id) => [id, ENDGAME_MONSTERS[id].mvp ? [{ maxHp: 100 }, { atk: 6, matk: 6 }, { def: 4, mdef: 4 }] : T('dex', { hit: 3 })])),
  ignarok: [{ atkPct: 2 }, { str: 2 }, { atk: 15, crit: 0.01 }],
};
export const BOOK_ORDER = Object.keys(MONSTERS).filter((t) => BOOK[t]);
export const bookTiers = (type) => (MONSTERS[type] && MONSTERS[type].mvp ? BOOK_TIERS_MVP : BOOK_TIERS);
// ขั้นที่ได้แล้ว (0–3)
export const bookTier = (type, kills) => bookTiers(type).filter((n) => kills >= n).length;
const NORMAL = BOOK_ORDER.filter((t) => !MONSTERS[t].mvp);
const MVPS = BOOK_ORDER.filter((t) => MONSTERS[t].mvp);

/* ---------- อัลบั้มการ์ด ---------- */
const mapCards = (mapId) => Object.keys(CARDS).filter((id) => (MAPS[mapId].spawns || []).some((s) => s.mob === CARDS[id].mob));
export const CARD_SETS = [
  { id: 'field', name: 'ทุ่งหญ้าแอสทีเรีย', cards: mapCards('beginner_field'), bonus: { maxHp: 80, hit: 3 } },
  { id: 'forest', name: 'ป่ากระซิบ', cards: mapCards('whisper_forest'), bonus: { atk: 8, matk: 8 } },
  { id: 'frost', name: 'ยอดเขาหิมะ', cards: mapCards('frostveil'), bonus: { mdef: 5, maxSpPct: 5 } },
  { id: 'ember', name: 'ปล่องภูเขาไฟ', cards: mapCards('ember_caldera'), bonus: { def: 5, atkPct: 3 } },
  { id: 'ancient', name: 'ผู้พิทักษ์ซากโบราณ', cards: mapCards('ancient_ruins'), bonus: { atk: 10, matk: 10, hit: 4 } },
  { id: 'haunted', name: 'จันทร์เหนือป่าวิญญาณ', cards: mapCards('haunted_forest'), bonus: { maxHp: 180, mdef: 5 } },
  { id: 'mvp', name: 'ราชันย์ทั้งห้า (การ์ด MVP)', cards: Object.keys(CARDS).filter((id) => MONSTERS[CARDS[id].mob]?.mvp), bonus: { str: 2, vit: 2, int: 2 } },
];
export const CARD_TOTAL = Object.keys(CARDS).length;

/* ---------- ความสำเร็จ + ฉายา ----------
   need(S) คืน [ทำได้, เป้าหมาย] · S = สถานะที่ระบบรวบรวมให้ (ดู systems/Collection.js)
   tier: common / rare / epic / legend (สีฉายา) */
const A = (id, cat, title, desc, tier, bonus, need) => ({ id, cat, title, desc, tier, bonus, need });
const maxOf = (n) => (S) => [Math.min(S.lv, n), n];
export const ACH_CATS = [['level', 'เลเวลและอาชีพ'], ['hunt', 'การล่า'], ['mvp', 'บอส MVP'], ['book', 'สมุดมอนสเตอร์'], ['card', 'การ์ด'], ['life', 'การผจญภัย'], ['daily', 'เช็กอิน']];
export const ACHIEVEMENTS = [
  A('lv10', 'level', 'นักผจญภัยหน้าใหม่', 'Base Lv. 10', 'common', { maxHp: 20 }, maxOf(10)),
  A('lv30', 'level', 'นักผจญภัยผู้ช่ำชอง', 'Base Lv. 30', 'common', { maxHp: 40, maxSp: 10 }, maxOf(30)),
  A('lv50', 'level', 'วีรชนแห่งแอสทีเรีย', 'Base Lv. 50', 'rare', { atk: 3, matk: 3 }, maxOf(50)),
  A('lv70', 'level', 'ผู้กล้าแห่งยุค', 'Base Lv. 70', 'rare', { def: 3, mdef: 3 }, maxOf(70)),
  A('lv90', 'level', 'ตำนานมีชีวิต', 'Base Lv. 90', 'epic', { maxHpPct: 2, maxSpPct: 2 }, maxOf(90)),
  A('lv99', 'level', 'ผู้อยู่เหนือขีดจำกัด', 'Base Lv. 99', 'legend', { atk: 5, matk: 5, maxHpPct: 2 }, maxOf(99)),
  A('job1', 'level', 'ผู้เลือกเส้นทาง', 'เปลี่ยนอาชีพครั้งแรก', 'common', { hit: 2 }, (S) => [S.job !== 'novice' ? 1 : 0, 1]),
  A('jlv30', 'level', 'ผู้ฝึกฝนอาชีพ', 'Job Lv. 30 (อาชีพขั้นที่ 1)', 'rare', { flee: 2, hit: 2 }, (S) => [S.job !== 'novice' ? Math.min(S.jlv, 30) : 0, 30]),
  A('jlv60', 'level', 'ปรมาจารย์อาชีพ', 'Job Lv. 60 (อาชีพขั้นที่ 1)', 'epic', { crit: 0.01, maxSp: 20 }, (S) => [S.job !== 'novice' ? Math.min(S.jlv, 60) : 0, 60]),

  A('k100', 'hunt', 'นักล่ามือใหม่', 'กำจัดมอนสเตอร์รวม 100 ตัว', 'common', { atk: 1 }, (S) => [Math.min(S.kills, 100), 100]),
  A('k1000', 'hunt', 'นักล่าผู้ช่ำชอง', 'กำจัดมอนสเตอร์รวม 1,000 ตัว', 'common', { atk: 2, hit: 2 }, (S) => [Math.min(S.kills, 1000), 1000]),
  A('k10000', 'hunt', 'เพชฌฆาตแห่งทุ่ง', 'กำจัดมอนสเตอร์รวม 10,000 ตัว', 'rare', { atk: 4, matk: 4 }, (S) => [Math.min(S.kills, 10000), 10000]),
  A('k50000', 'hunt', 'ตำนานนักล่า', 'กำจัดมอนสเตอร์รวม 50,000 ตัว', 'legend', { atkPct: 2, matkPct: 2 }, (S) => [Math.min(S.kills, 50000), 50000]),

  A('mvp1', 'mvp', 'ผู้ล้มยักษ์', 'กำจัดบอส MVP ตัวไหนก็ได้', 'rare', { maxHp: 50 }, (S) => [Math.min(S.mvpKills, 1), 1]),
  A('mvp_gnarl', 'mvp', 'ผู้โค่นต้นไม้เฒ่า', 'กำจัดกนาร์ลรูท ต้นไม้เฒ่า', 'rare', { vit: 1 }, (S) => [Math.min(S.k('gnarlroot'), 1), 1]),
  A('mvp_glacia', 'mvp', 'ผู้ละลายราชินีหิมะ', 'กำจัดกลาเซีย ราชินีหิมะ', 'epic', { int: 1 }, (S) => [Math.min(S.k('glacia'), 1), 1]),
  A('mvp_ignarok', 'mvp', 'ผู้ปราบมังกรเพลิง', 'กำจัดอิกนารอก มังกรเพลิง', 'epic', { str: 1 }, (S) => [Math.min(S.k('ignarok'), 1), 1]),
  A('mvp_all', 'mvp', 'ผู้พิชิตทั้งสามราชันย์', 'กำจัดบอส MVP ครบทั้ง 3 ตัว', 'legend', { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, (S) => [MVPS.filter((t) => S.k(t) > 0).length, MVPS.length]),

  A('book5', 'book', 'นักบันทึกสัตว์ประหลาด', 'สมุดมอนสเตอร์ขั้นที่ 1 ครบ 5 ชนิด', 'common', { hit: 2, flee: 2 }, (S) => [Math.min(S.bookAt(1), 5), 5]),
  A('book_t1', 'book', 'นักชีววิทยา', `สมุดมอนสเตอร์ขั้นที่ 1 ครบทุกชนิด (${NORMAL.length + MVPS.length} ชนิด)`, 'rare', { maxHp: 60, maxSp: 15 }, (S) => [S.bookAt(1), NORMAL.length + MVPS.length]),
  A('book_t2', 'book', 'ผู้เชี่ยวชาญสัตว์ประหลาด', 'สมุดมอนสเตอร์ขั้นที่ 2 ครบทุกชนิด', 'epic', { def: 3, mdef: 3 }, (S) => [S.bookAt(2), NORMAL.length + MVPS.length]),
  A('book_t3', 'book', 'สารานุกรมมีชีวิต', 'สมุดมอนสเตอร์ขั้นที่ 3 ครบทุกชนิด', 'legend', { atkPct: 2, matkPct: 2, maxHpPct: 2 }, (S) => [S.bookAt(3), NORMAL.length + MVPS.length]),

  A('card1', 'card', 'นักสะสมการ์ด', 'ได้การ์ดใบแรก', 'rare', { luk: 1 }, (S) => [Math.min(S.cards, 1), 1]),
  A('card5', 'card', 'นักล่าการ์ด', `สะสมการ์ด 5 ชนิด`, 'epic', { luk: 2 }, (S) => [Math.min(S.cards, 5), 5]),
  A('cardset', 'card', 'ผู้ครบชุด', 'สะสมการ์ดครบ 1 ชุดในอัลบั้ม', 'epic', { crit: 0.01 }, (S) => [Math.min(S.sets, 1), 1]),
  A('cardall', 'card', 'เจ้าแห่งอัลบั้ม', `สะสมการ์ดครบทุกใบ (${CARD_TOTAL} ใบ)`, 'legend', { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, (S) => [S.cards, CARD_TOTAL]),

  A('q10', 'life', 'มือช่วยแห่งเมือง', 'ส่งเควสครบ 10 ครั้ง', 'common', { maxSp: 15 }, (S) => [Math.min(S.quests, 10), 10]),
  A('q50', 'life', 'ที่พึ่งของชาวบ้าน', 'ส่งเควสครบ 50 ครั้ง', 'rare', { maxHp: 50, maxSp: 20 }, (S) => [Math.min(S.quests, 50), 50]),
  A('explore', 'life', 'นักสำรวจ', `ไปให้ครบทุกแผนที่ (${Object.keys(MAPS).length} แผนที่)`, 'rare', { speedPct: 3 }, (S) => [S.maps, Object.keys(MAPS).length]),
  A('zeny100k', 'life', 'เศรษฐีหน้าใหม่', 'มี Zeny ติดตัว 100,000', 'common', { luk: 1 }, (S) => [Math.min(S.zeny, 100000), 100000]),
  A('zeny1m', 'life', 'มหาเศรษฐี', 'มี Zeny ติดตัว 1,000,000', 'epic', { luk: 2 }, (S) => [Math.min(S.zeny, 1000000), 1000000]),
  A('pet3', 'life', 'เพื่อนรักสัตว์', 'มีสัตว์เลี้ยง 3 ตัว', 'common', { maxHp: 30 }, (S) => [Math.min(S.pets, 3), 3]),
  A('pet8', 'life', 'ผู้เลี้ยงสัตว์ตัวยง', 'มีสัตว์เลี้ยง 8 ตัว', 'rare', { flee: 3 }, (S) => [Math.min(S.pets, 8), 8]),
  A('fash10', 'life', 'แฟชั่นนิสต้า', 'มีชุดแฟชั่น 10 ชิ้น', 'common', { maxSp: 15 }, (S) => [Math.min(S.fashion, 10), 10]),
  A('fash40', 'life', 'ไอคอนแห่งแฟชั่น', 'มีชุดแฟชั่น 40 ชิ้น', 'epic', { mdef: 3 }, (S) => [Math.min(S.fashion, 40), 40]),
  A('ref7', 'life', 'ช่างตีมือทอง', 'มีอุปกรณ์ตีบวก +7 ขึ้นไป', 'rare', { def: 2 }, (S) => [Math.min(S.refine, 7), 7]),
  A('ref10', 'life', 'ช่างตีในตำนาน', 'มีอุปกรณ์ตีบวก +10', 'legend', { atk: 5, matk: 5 }, (S) => [Math.min(S.refine, 10), 10]),

  A('ci7', 'daily', 'ผู้มาเยือนประจำ', 'เช็กอินรวม 7 วัน', 'common', { maxHp: 30 }, (S) => [Math.min(S.checkins, 7), 7]),
  A('ci30', 'daily', 'ขาประจำแห่งแอสทีเรีย', 'เช็กอินรวม 30 วัน', 'rare', { maxHpPct: 1, maxSpPct: 1 }, (S) => [Math.min(S.checkins, 30), 30]),
  A('ci100', 'daily', 'ผู้พิทักษ์แอสทีเรีย', 'เช็กอินรวม 100 วัน', 'epic', { regenPct: 15, spRegenPct: 15 }, (S) => [Math.min(S.checkins, 100), 100]),
  A('streak7', 'daily', 'ไม่เคยขาดสักวัน', 'เช็กอินติดต่อกัน 7 วัน', 'rare', { regenPct: 10 }, (S) => [Math.min(S.bestStreak, 7), 7]),
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const TIER_LABEL = { common: 'ธรรมดา', rare: 'หายาก', epic: 'ระดับตำนาน', legend: 'ในตำนาน' };

/* ---------- เช็กอินรายวัน (รอบละ 7 วัน) ----------
   ไม่ต้องเข้าติดกัน: เข้าเกมวันไหนก็นับเป็นวันถัดไปของรอบ · วันที่ 7 รางวัลใหญ่แล้วเริ่มรอบใหม่
   lv = เลเวลตัวละคร (ยาเปลี่ยนตามเลเวล) */
export function loginReward(day, lv) {
  const hp = lv >= 60 ? 'white_potion' : lv >= 25 ? 'orange_potion' : 'red_potion';
  const sp = lv >= 50 ? 'mana_potion' : 'blue_potion';
  const z = (n) => Math.round((n * (1 + lv / 25)) / 100) * 100;
  return [
    { items: [[hp, 10]], zeny: z(1000) },
    { items: [['return_scroll', 2], ['warp_leaf', 5]], zeny: 0 },
    { items: [['exp_15', 1], [hp, 5]], zeny: 0 },
    { items: [[sp, 5]], zeny: z(3000) },
    { items: [['drop_15', 1], ['refine_w', 1], ['refine_a', 1]], zeny: 0 },
    { items: [['exp_2', 1], ['festival_cake', 1]], zeny: 0 },
    { items: [['box_silver', 1], ['card_clover', 1], [hp, 20]], zeny: z(10000) },
  ][Math.max(0, Math.min(6, day - 1))];
}
export const LOGIN_DAYS = 7;
