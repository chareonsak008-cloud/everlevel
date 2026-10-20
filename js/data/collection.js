// ระบบสะสมและเป้าหมายระยะยาว (v0.18)
// · สมุดมอนสเตอร์: กำจัดครบ 100 / 500 / 1,000 ตัว (MVP 5 / 20 / 50 ตัว) → ค่าสเตตัสถาวร
// · ความสำเร็จ: ทำครบแล้วได้ฉายา (ใส่โชว์เหนือหัว) + โบนัสเล็กน้อย (ได้ทุกอันที่ปลดล็อก ไม่ต้องใส่ฉายา)
// · อัลบั้มการ์ด: เคยได้การ์ดครบชุด → โบนัสชุด (ไม่ต้องใส่การ์ด ไม่เสียการ์ด)
// · เช็กอินรายวัน: เข้าเกมวันละครั้ง → รางวัลวันที่ 1–7 วนรอบ ส่งเข้ากล่องจดหมาย
import { ZENY_INCOME } from '../config.js?v=0.66.0';
import { ENDGAME_MONSTERS } from './endgameMonsters.js?v=0.66.0';
import { ASCEND_MONSTERS } from './ascendData.js?v=0.66.0';
import { MONSTERS } from './monsters.js?v=0.66.0';
import { CARDS } from './cards.js?v=0.66.0';
import { MAPS } from './maps/index.js?v=0.66.0';

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
  // v0.46 มอน Lv.100–150
  ...Object.fromEntries(Object.keys(ASCEND_MONSTERS).map((id) => [id, ASCEND_MONSTERS[id].mvp ? [{ maxHp: 200 }, { atk: 10, matk: 10 }, { def: 6, mdef: 6 }] : T(['str', 'int', 'dex', 'vit', 'agi'][ASCEND_MONSTERS[id].level % 5], { maxHp: 60 })])),
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
  { id: 'coast', name: 'บุตรแห่งหาดปะการัง', cards: mapCards('sunken_coast'), bonus: { maxHp: 300, flee: 6 } },   // v0.46
  { id: 'crystal', name: 'แสงเจ็ดสีแห่งหุบเขา', cards: mapCards('crystal_valley'), bonus: { atk: 15, matk: 15, def: 6 } },
  { id: 'sky', name: 'ผู้ขึ้นถึงฟากฟ้า', cards: mapCards('sky_citadel'), bonus: { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 } },
  { id: 'mvp', name: 'ราชันย์ทั้งห้า (การ์ด MVP)', cards: Object.keys(CARDS).filter((id) => MONSTERS[CARDS[id].mob]?.mvp && MONSTERS[CARDS[id].mob].level < 100), bonus: { str: 2, vit: 2, int: 2 } },
];
export const CARD_TOTAL = Object.keys(CARDS).length;
export const MVP_CARDS = Object.keys(CARDS).filter((id) => MONSTERS[CARDS[id].mob]?.mvp);

/* ---------- ความสำเร็จ + ฉายา ----------
   need(S) คืน [ทำได้, เป้าหมาย] · S = สถานะที่ระบบรวบรวมให้ (ดู systems/Collection.js)
   tier: common / rare / epic / legend / mythic (v0.30: เอฟเฟ็กฉายาดู ui/TitleFx.js) · fx = ธีมสีของ legend/mythic */
const A = (id, cat, title, desc, tier, bonus, need, fx, only) => ({ id, cat, title, desc, tier, bonus, need, fx: fx || '', only: only || null });
const kN = (t, n) => (S) => [Math.min(S.k(t), n), n];
const jobN = (job, n) => (S) => [S.job === job ? Math.min(S.jlv, n) : 0, n];
const maxOf = (n) => (S) => [Math.min(S.lv, n), n];
export const ACH_CATS = [['legend', 'ฉายาสูงสุด'], ['level', 'เลเวลและอาชีพ'], ['hunt', 'การล่า'], ['nemesis', 'ศัตรูคู่แค้น'], ['mvp', 'บอส MVP'], ['dungeon', 'ดันเจี้ยน/หอคอย'], ['book', 'สมุดมอนสเตอร์'], ['card', 'การ์ด'], ['life', 'การผจญภัย'], ['daily', 'เช็กอิน']];
export const ACHIEVEMENTS = [
  A('lv10', 'level', 'นักผจญภัยหน้าใหม่', 'Base Lv. 10', 'common', { maxHp: 20 }, maxOf(10)),
  A('lv30', 'level', 'นักผจญภัยผู้ช่ำชอง', 'Base Lv. 30', 'common', { maxHp: 40, maxSp: 10 }, maxOf(30)),
  A('lv50', 'level', 'วีรชนแห่งแอสทีเรีย', 'Base Lv. 50', 'rare', { atk: 3, matk: 3 }, maxOf(50)),
  A('lv70', 'level', 'ผู้กล้าแห่งยุค', 'Base Lv. 70', 'rare', { def: 3, mdef: 3 }, maxOf(70)),
  A('lv90', 'level', 'ตำนานมีชีวิต', 'Base Lv. 90', 'epic', { maxHpPct: 2, maxSpPct: 2 }, maxOf(90)),
  A('lv99', 'level', 'ผู้อยู่เหนือขีดจำกัด', 'Base Lv. 99', 'legend', { atk: 5, matk: 5, maxHpPct: 2 }, maxOf(99), 'frost'),
  A('lv120', 'level', 'ผู้ก้าวข้ามโชคชะตา', 'Base Lv. 120', 'legend', { atk: 6, matk: 6, def: 4, mdef: 4 }, maxOf(120), 'frost'),
  A('lv150', 'level', 'ผู้อยู่เหนือสวรรค์', 'Base Lv. 150', 'mythic', { atkPct: 3, matkPct: 3, maxHpPct: 3, maxSpPct: 3 }, maxOf(150), 'celestial'),
  A('job1', 'level', 'ผู้เลือกเส้นทาง', 'เปลี่ยนอาชีพครั้งแรก', 'common', { hit: 2 }, (S) => [S.job !== 'novice' ? 1 : 0, 1]),
  A('jlv30', 'level', 'ผู้ฝึกฝนอาชีพ', 'Job Lv. 30 (อาชีพขั้นที่ 1)', 'rare', { flee: 2, hit: 2 }, (S) => [Math.min(S.jlv1, 30), 30]),
  A('jlv60', 'level', 'ปรมาจารย์อาชีพ', 'Job Lv. 60 (อาชีพขั้นที่ 1)', 'epic', { crit: 0.01, maxSp: 20 }, (S) => [Math.min(S.jlv1, 60), 60]),

  A('k100', 'hunt', 'นักล่ามือใหม่', 'กำจัดมอนสเตอร์รวม 100 ตัว', 'common', { atk: 1 }, (S) => [Math.min(S.kills, 100), 100]),
  A('k1000', 'hunt', 'นักล่าผู้ช่ำชอง', 'กำจัดมอนสเตอร์รวม 1,000 ตัว', 'common', { atk: 2, hit: 2 }, (S) => [Math.min(S.kills, 1000), 1000]),
  A('k10000', 'hunt', 'เพชฌฆาตแห่งทุ่ง', 'กำจัดมอนสเตอร์รวม 10,000 ตัว', 'rare', { atk: 4, matk: 4 }, (S) => [Math.min(S.kills, 10000), 10000]),
  A('k100000', 'hunt', 'ผู้เผาผลาญสมรภูมิ', 'กำจัดมอนสเตอร์รวม 100,000 ตัว', 'mythic', { atkPct: 2, matkPct: 2, crit: 0.01 }, (S) => [Math.min(S.kills, 100000), 100000], 'inferno'),
  A('k50000', 'hunt', 'ตำนานนักล่า', 'กำจัดมอนสเตอร์รวม 50,000 ตัว', 'legend', { atkPct: 2, matkPct: 2 }, (S) => [Math.min(S.kills, 50000), 50000], 'crimson'),

  A('mvp1', 'mvp', 'ผู้ล้มยักษ์', 'กำจัดบอส MVP ตัวไหนก็ได้', 'rare', { maxHp: 50 }, (S) => [Math.min(S.mvpKills, 1), 1]),
  A('mvp_gnarl', 'mvp', 'ผู้โค่นต้นไม้เฒ่า', 'กำจัดกนาร์ลรูท ต้นไม้เฒ่า', 'rare', { vit: 1 }, (S) => [Math.min(S.k('gnarlroot'), 1), 1]),
  A('mvp_glacia', 'mvp', 'ผู้ละลายราชินีหิมะ', 'กำจัดกลาเซีย ราชินีหิมะ', 'epic', { int: 1 }, (S) => [Math.min(S.k('glacia'), 1), 1]),
  A('mvp_ignarok', 'mvp', 'ผู้ปราบมังกรเพลิง', 'กำจัดอิกนารอก มังกรเพลิง', 'epic', { str: 1 }, (S) => [Math.min(S.k('ignarok'), 1), 1]),
  A('mvp_all', 'mvp', 'ผู้พิชิตเหล่าราชันย์', `กำจัดบอส MVP ครบทุกตัว (${MVPS.length} ตัว)`, 'legend', { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 }, (S) => [MVPS.filter((t) => S.k(t) > 0).length, MVPS.length], 'flame'),

  A('book5', 'book', 'นักบันทึกสัตว์ประหลาด', 'สมุดมอนสเตอร์ขั้นที่ 1 ครบ 5 ชนิด', 'common', { hit: 2, flee: 2 }, (S) => [Math.min(S.bookAt(1), 5), 5]),
  A('book_t1', 'book', 'นักชีววิทยา', `สมุดมอนสเตอร์ขั้นที่ 1 ครบทุกชนิด (${NORMAL.length + MVPS.length} ชนิด)`, 'rare', { maxHp: 60, maxSp: 15 }, (S) => [S.bookAt(1), NORMAL.length + MVPS.length]),
  A('book_t2', 'book', 'ผู้เชี่ยวชาญสัตว์ประหลาด', 'สมุดมอนสเตอร์ขั้นที่ 2 ครบทุกชนิด', 'epic', { def: 3, mdef: 3 }, (S) => [S.bookAt(2), NORMAL.length + MVPS.length]),
  A('book_t3', 'book', 'สารานุกรมมีชีวิต', 'สมุดมอนสเตอร์ขั้นที่ 3 ครบทุกชนิด', 'legend', { atkPct: 2, matkPct: 2, maxHpPct: 2 }, (S) => [S.bookAt(3), NORMAL.length + MVPS.length], 'arcane'),

  A('card1', 'card', 'นักสะสมการ์ด', 'ได้การ์ดใบแรก', 'rare', { luk: 1 }, (S) => [Math.min(S.cards, 1), 1]),
  A('card5', 'card', 'นักล่าการ์ด', `สะสมการ์ด 5 ชนิด`, 'epic', { luk: 2 }, (S) => [Math.min(S.cards, 5), 5]),
  A('cardset', 'card', 'ผู้ครบชุด', 'สะสมการ์ดครบ 1 ชุดในอัลบั้ม', 'epic', { crit: 0.01 }, (S) => [Math.min(S.sets, 1), 1]),
  A('mvpcards', 'card', 'ผู้ครองดวงวิญญาณราชันย์', `สะสมการ์ด MVP ครบทุกใบ (${MVP_CARDS.length} ใบ)`, 'mythic', { atkPct: 3, matkPct: 3 }, (S) => [S.mvpCards, MVP_CARDS.length], 'void'),
  A('cardall', 'card', 'เจ้าแห่งอัลบั้ม', `สะสมการ์ดครบทุกใบ (${CARD_TOTAL} ใบ)`, 'mythic', { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, (S) => [S.cards, CARD_TOTAL], 'celestial'),

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
  A('ref10', 'life', 'ช่างตีในตำนาน', 'มีอุปกรณ์ตีบวก +10', 'legend', { atk: 5, matk: 5 }, (S) => [Math.min(S.refine, 10), 10], 'gold'),

  
  A('ci7', 'daily', 'ผู้มาเยือนประจำ', 'เช็กอินรวม 7 วัน', 'common', { maxHp: 30 }, (S) => [Math.min(S.checkins, 7), 7]),
  A('ci30', 'daily', 'ขาประจำแห่งแอสทีเรีย', 'เช็กอินรวม 30 วัน', 'rare', { maxHpPct: 1, maxSpPct: 1 }, (S) => [Math.min(S.checkins, 30), 30]),
  A('ci100', 'daily', 'ผู้พิทักษ์แอสทีเรีย', 'เช็กอินรวม 100 วัน', 'epic', { regenPct: 15, spRegenPct: 15 }, (S) => [Math.min(S.checkins, 100), 100]),
  A('streak7', 'daily', 'ไม่เคยขาดสักวัน', 'เช็กอินติดต่อกัน 7 วัน', 'rare', { regenPct: 10 }, (S) => [Math.min(S.bestStreak, 7), 7]),

  // ---------- v0.30: ฉายาเพิ่มเติม ----------
  A('lv80', 'level', 'ผู้ไต่ถึงยอดเขา', 'Base Lv. 80', 'epic', { maxHp: 120, maxSp: 30 }, maxOf(80)),
  A('jsw99', 'level', 'จ้าวแห่งคมดาบ', 'Knight Job Lv. 70', 'legend', { atk: 12, hit: 6 }, jobN('knight', 70), 'crimson', 'knight'),
  A('jmg99', 'level', 'มหาจอมเวทแห่งดวงดาว', 'Wizard Job Lv. 70', 'legend', { matk: 15, maxSpPct: 5 }, jobN('wizard', 70), 'shadow', 'wizard'),
  A('jar99', 'level', 'เนตรเหยี่ยวไร้พลาด', 'Hunter Job Lv. 70', 'legend', { hit: 10, crit: 0.02 }, jobN('hunter', 70), 'arcane', 'hunter'),
  A('jac99', 'level', 'นักบุญแห่งรุ่งอรุณ', 'Priest Job Lv. 70', 'legend', { maxHpPct: 4, mdef: 6 }, jobN('priest', 70), 'celestial', 'priest'),
  A('job2', 'level', 'ผู้ก้าวข้ามขีดจำกัด', 'เลื่อนขั้นเป็นอาชีพขั้นที่ 2', 'epic', { maxHp: 150, maxSp: 40 }, (S) => [S.tier >= 2 ? 1 : 0, 1]),
  A('job2_40', 'level', 'ปรมาจารย์ชั้นสูง', 'Job Lv. 40 (อาชีพขั้นที่ 2)', 'legend', { atkPct: 2, matkPct: 2 }, (S) => [S.tier >= 2 ? Math.min(S.jlv, 40) : 0, 40], 'gold'),
  A('perfect', 'level', 'ผู้บรรลุสุดขีด', 'Base Lv. 99 และ Job Lv. 70 (อาชีพขั้นที่ 2)', 'mythic', { atkPct: 3, matkPct: 3, maxHpPct: 3 }, (S) => [Math.min(S.lv, 99) + (S.tier >= 2 ? Math.min(S.jlv, 70) : 0), 169], 'celestial'),

  A('k5000', 'hunt', 'นักรบแห่งทุ่งกว้าง', 'กำจัดมอนสเตอร์รวม 5,000 ตัว', 'rare', { atk: 3, matk: 3 }, (S) => [Math.min(S.kills, 5000), 5000]),
  A('k25000', 'hunt', 'พายุแห่งสมรภูมิ', 'กำจัดมอนสเตอร์รวม 25,000 ตัว', 'epic', { atk: 5, matk: 5, hit: 3 }, (S) => [Math.min(S.kills, 25000), 25000]),
  A('k250000', 'legend', 'ราชันแห่งอเวจี', 'กำจัดมอนสเตอร์รวม 250,000 ตัว', 'divine', { atkPct: 4, matkPct: 4, crit: 0.02, maxHpPct: 3 }, (S) => [Math.min(S.kills, 250000), 250000], 'abyss'),

  A('n_bloblet', 'nemesis', 'ผู้ปราบเยลลี่เด้งดึ๋ง', 'กำจัดบล็อบเล็ต 1,000 ตัว', 'rare', { agi: 1, flee: 2 }, kN('bloblet', 1000)),
  A('n_capling', 'nemesis', 'นักเก็บเห็ดมือฉมัง', 'กำจัดแคปปลิง 1,000 ตัว', 'rare', { int: 1, maxSp: 15 }, kN('capling', 1000)),
  A('n_stinglet', 'nemesis', 'ไม้ตีแมลงทองคำ', 'กำจัดสติงเล็ต 1,000 ตัว', 'rare', { dex: 1, hit: 2 }, kN('stinglet', 1000)),
  A('n_wisp', 'nemesis', 'ผู้จับดวงไฟ', 'กำจัดวิสป์ 1,000 ตัว', 'rare', { matk: 4 }, kN('wisp', 1000)),
  A('n_barkwolf', 'nemesis', 'จ่าฝูงหมาป่าเปลือกไม้', 'กำจัดบาร์กวูล์ฟ 2,000 ตัว', 'epic', { str: 2, atk: 4 }, kN('barkwolf', 2000)),
  A('n_frostfox', 'nemesis', 'นักล่าจิ้งจอกหิมะ', 'กำจัดฟรอสต์ฟ็อกซ์ 2,000 ตัว', 'epic', { agi: 2, flee: 3 }, kN('frostfox', 2000)),
  A('n_yeti', 'nemesis', 'ผู้ทลายภูเขาน้ำแข็ง', 'กำจัดเยติ 2,000 ตัว', 'epic', { vit: 2, maxHp: 100 }, kN('yeti', 2000)),
  A('n_emberimp', 'nemesis', 'ผู้ดับไฟปีศาจน้อย', 'กำจัดเอมเบอร์อิมป์ 2,000 ตัว', 'epic', { luk: 2, crit: 0.01 }, kN('emberimp', 2000)),
  A('n_salamander', 'nemesis', 'ผู้สยบซาลาแมนเดอร์', 'กำจัดซาลาแมนเดอร์ 2,000 ตัว', 'epic', { str: 2, atk: 6 }, kN('salamander', 2000)),
  A('n_obsidian', 'nemesis', 'ผู้บดหินอัคนี', 'กำจัดออบซิเดียนโกเลม 2,000 ตัว', 'legend', { def: 6, vit: 2 }, kN('obsidiangolem', 2000), 'flame'),
  A('n_astral', 'nemesis', 'ผู้เก็บดาวตก', 'กำจัดวิสป์ดารา 2,000 ตัว', 'legend', { int: 3, matk: 8 }, kN('astral_wisp', 2000), 'storm'),
  A('n_relic', 'nemesis', 'ผู้สยบอัศวินโบราณ', 'กำจัดอัศวินซากโบราณ 2,000 ตัว', 'legend', { atk: 10, def: 4 }, kN('relic_knight', 2000), 'gold'),
  A('n_shade', 'nemesis', 'ผู้ปลดปล่อยวิญญาณ', 'กำจัดภูตคร่ำครวญ 2,000 ตัว', 'legend', { mdef: 6, maxSpPct: 4 }, kN('mourning_shade', 2000), 'shadow'),
  A('n_reaper', 'nemesis', 'ผู้เก็บเกี่ยวยมทูต', 'กำจัดยมทูตคราส 3,000 ตัว', 'mythic', { atkPct: 2, crit: 0.02 }, kN('eclipse_reaper', 3000), 'void'),
  A('n_bloodmoon', 'nemesis', 'อัศวินพิฆาตจันทร์โลหิต', 'กำจัดอัศวินจันทร์โลหิต 3,000 ตัว', 'mythic', { atkPct: 2, matkPct: 2, maxHpPct: 2 }, kN('bloodmoon_knight', 3000), 'crimson'),

  A('mvp10', 'mvp', 'นักล่าบอส', 'กำจัดบอส MVP รวม 10 ตัว', 'rare', { maxHp: 80 }, (S) => [Math.min(S.mvpKills, 10), 10]),
  A('mvp100', 'mvp', 'ผู้สยบเหล่าราชันย์', 'กำจัดบอส MVP รวม 100 ตัว', 'legend', { atk: 8, matk: 8, maxHpPct: 2 }, (S) => [Math.min(S.mvpKills, 100), 100], 'storm'),
  A('mvp500', 'legend', 'จักรพรรดิแห่งดวงดาว', 'กำจัดบอส MVP รวม 500 ตัว', 'divine', { str: 3, agi: 3, vit: 3, int: 3, dex: 3, luk: 3, atkPct: 2, matkPct: 2 }, (S) => [Math.min(S.mvpKills, 500), 500], 'astral'),
  A('m_gnarl50', 'mvp', 'ผู้ตัดรากแห่งพงไพร', 'กำจัดกนาร์ลรูท 50 ครั้ง', 'legend', { vit: 3, maxHpPct: 2 }, kN('gnarlroot', 50), 'arcane'),
  A('m_glacia50', 'mvp', 'ผู้ทลายบัลลังก์น้ำแข็ง', 'กำจัดกลาเซีย 50 ครั้ง', 'legend', { int: 3, mdef: 5 }, kN('glacia', 50), 'frost'),
  A('m_ignarok50', 'mvp', 'นักฆ่ามังกร', 'กำจัดอิกนารอก 50 ครั้ง', 'legend', { str: 3, atk: 10 }, kN('ignarok', 50), 'flame'),
  A('m_ignarok100', 'mvp', 'ผู้กลืนกินเปลวมังกร', 'กำจัดอิกนารอก 100 ครั้ง', 'mythic', { atkPct: 3, crit: 0.01 }, kN('ignarok', 100), 'inferno'),
  A('m_aurex30', 'mvp', 'ผู้โค่นราชันผู้พิทักษ์', 'กำจัดออเร็กซ์ 30 ครั้ง', 'legend', { def: 5, mdef: 5, maxHp: 200 }, kN('aurex', 30), 'gold'),
  A('m_nocthar30', 'mvp', 'ผู้ดับจันทร์โลหิต', 'กำจัดน็อคธาร์ 30 ครั้ง', 'mythic', { matkPct: 3, maxSpPct: 4 }, kN('nocthar', 30), 'void'),
  A('w_aurex', 'mvp', 'ผู้ต้านจอมทัพโลก', 'ร่วมกำจัดออเร็กซ์ จอมทัพโลก', 'legend', { maxHpPct: 3 }, kN('world_aurex', 1), 'storm'),
  A('w_nocthar', 'mvp', 'ผู้ปิดฉากคราสโลก', 'ร่วมกำจัดน็อคธาร์ ราชันคราสโลก', 'mythic', { atkPct: 2, matkPct: 2 }, kN('world_nocthar', 1), 'shadow'),

  A('book_mvp', 'book', 'ผู้จารึกนามราชันย์', 'สมุดมอนสเตอร์ขั้นที่ 3 ของบอส MVP ครบทุกตัว', 'mythic', { atkPct: 2, matkPct: 2, def: 4 }, (S) => [S.bookMvp3, MVPS.length], 'arcane'),

  A('card1mvp', 'card', 'ผู้ครอบครองวิญญาณราชันย์', 'ได้การ์ด MVP ใบแรก', 'epic', { luk: 2, maxHp: 60 }, (S) => [Math.min(S.mvpCards, 1), 1]),
  A('card10', 'card', 'นักสะสมตัวยง', 'สะสมการ์ด 10 ชนิด', 'epic', { luk: 3 }, (S) => [Math.min(S.cards, 10), 10]),
  A('card20', 'card', 'ผู้หลงใหลการ์ด', 'สะสมการ์ด 20 ชนิด', 'legend', { luk: 4, crit: 0.01 }, (S) => [Math.min(S.cards, 20), 20], 'sakura'),
  A('sets3', 'card', 'นักจัดชุดการ์ด', 'สะสมการ์ดครบ 3 ชุดในอัลบั้ม', 'legend', { maxHpPct: 2, maxSpPct: 2 }, (S) => [Math.min(S.sets, 3), 3], 'gold'),

  A('q100', 'life', 'วีรบุรุษของประชาชน', 'ส่งเควสครบ 100 ครั้ง', 'epic', { maxHp: 80, maxSp: 25 }, (S) => [Math.min(S.quests, 100), 100]),
  A('q300', 'life', 'ตำนานแห่งเมือง', 'ส่งเควสครบ 300 ครั้ง', 'legend', { maxHpPct: 2, regenPct: 10 }, (S) => [Math.min(S.quests, 300), 300], 'gold'),
  A('zeny10m', 'life', 'ราชาทองคำ', 'มี Zeny ติดตัว 10,000,000', 'legend', { luk: 3 }, (S) => [Math.min(S.zeny, 1e7), 1e7], 'gold'),
  A('zeny100m', 'life', 'จักรพรรดิทองคำ', 'มี Zeny ติดตัว 100,000,000', 'mythic', { luk: 5, crit: 0.01 }, (S) => [Math.min(S.zeny, 1e8), 1e8], 'gold'),
  A('pet12', 'life', 'ราชาแห่งสัตว์เลี้ยง', 'มีสัตว์เลี้ยงครบ 12 ตัว', 'legend', { flee: 5, maxHp: 120 }, (S) => [Math.min(S.pets, 12), 12], 'sakura'),
  A('fash80', 'life', 'เทพีแห่งแฟชั่น', 'มีชุดแฟชั่น 80 ชิ้น', 'legend', { mdef: 4, maxSp: 30 }, (S) => [Math.min(S.fashion, 80), 80], 'sakura'),
  A('fash200', 'life', 'ราชันแห่งรันเวย์', 'มีชุดแฟชั่น 200 ชิ้น', 'mythic', { maxHpPct: 3, maxSpPct: 3 }, (S) => [Math.min(S.fashion, 200), 200], 'prism'),

  A('streak30', 'daily', 'ไฟไม่เคยมอด', 'เช็กอินติดต่อกัน 30 วัน', 'epic', { regenPct: 15 }, (S) => [Math.min(S.bestStreak, 30), 30]),
  A('ci200', 'daily', 'ผู้พิทักษ์ประจำแผ่นดิน', 'เช็กอินรวม 200 วัน', 'legend', { maxHpPct: 2, regenPct: 10 }, (S) => [Math.min(S.checkins, 200), 200], 'celestial'),
  A('streak100', 'daily', 'หัวใจเหล็กกล้า', 'เช็กอินติดต่อกัน 100 วัน', 'legend', { vit: 3, regenPct: 15 }, (S) => [Math.min(S.bestStreak, 100), 100], 'flame'),
  A('ci365', 'daily', 'ผู้ภักดีชั่วนิรันดร์', 'เช็กอินรวม 365 วัน', 'mythic', { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2 }, (S) => [Math.min(S.checkins, 365), 365], 'sakura'),

  // v0.32: ดันเจี้ยนถ้ำ + หอคอยนิรันดร์
  A('cave1', 'dungeon', 'นักสำรวจถ้ำ', 'พิชิตถ้ำผลึกก้องลึกครบทุกชั้น 1 ครั้ง', 'rare', { vit: 1 }, (S) => [Math.min(S.caveClears, 1), 1], 'frost'),
  A('cave10', 'dungeon', 'นักล่าใต้พิภพ', 'พิชิตถ้ำผลึกก้องลึก 10 ครั้ง', 'epic', { maxHp: 150, def: 3 }, (S) => [Math.min(S.caveClears, 10), 10], 'arcane'),
  A('cave50', 'dungeon', 'จ้าวแห่งถ้ำผลึก', 'พิชิตถ้ำผลึกก้องลึก 50 ครั้ง', 'legend', { atk: 6, matk: 6, maxHpPct: 2 }, (S) => [Math.min(S.caveClears, 50), 50], 'abyss'),
  A('tower10', 'dungeon', 'ผู้ไต่หอคอย', 'ผ่านหอคอยนิรันดร์ถึงชั้น 10', 'rare', { agi: 1 }, (S) => [Math.min(S.towerBest, 10), 10], 'storm'),
  A('tower30', 'dungeon', 'ผู้ทะลวงเมฆา', 'ผ่านหอคอยนิรันดร์ถึงชั้น 30', 'epic', { dex: 2, hit: 5 }, (S) => [Math.min(S.towerBest, 30), 30], 'storm'),
  A('tower60', 'dungeon', 'ผู้ท้าทายนิรันดร์', 'ผ่านหอคอยนิรันดร์ถึงชั้น 60', 'legend', { atkPct: 2, matkPct: 2 }, (S) => [Math.min(S.towerBest, 60), 60], 'celestial'),
  A('tower100', 'dungeon', 'ราชันหอคอยนิรันดร์', 'ผ่านหอคอยนิรันดร์ถึงชั้น 100', 'mythic', { str: 2, agi: 2, vit: 2, int: 2, dex: 2, luk: 2, atkPct: 2, matkPct: 2 }, (S) => [Math.min(S.towerBest, 100), 100], 'astral'),
  A('ach_all', 'legend', 'นิรันดร์แห่งเอเวอร์เลเวล', 'ปลดล็อกความสำเร็จอื่นครบทุกอัน (ไม่นับฉายาเฉพาะอาชีพ)', 'divine', { str: 5, agi: 5, vit: 5, int: 5, dex: 5, luk: 5, atkPct: 3, matkPct: 3 }, (S) => [S.achDone, ACH_OTHERS], 'genesis'),
];
const ACH_OTHERS = ACHIEVEMENTS.filter((a) => a.id !== 'ach_all' && !a.only).length;
export const ACH_COUNTED = (id) => id !== 'ach_all' && ACH_BY_ID[id] && !ACH_BY_ID[id].only;
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
export const TIER_LABEL = { common: 'ธรรมดา', rare: 'หายาก', epic: 'ระดับตำนาน', legend: 'ในตำนาน', mythic: 'เหนือตำนาน', divine: 'เทพนิรันดร์' };

/* ---------- เช็กอินรายวัน (รอบละ 7 วัน) ----------
   ไม่ต้องเข้าติดกัน: เข้าเกมวันไหนก็นับเป็นวันถัดไปของรอบ · วันที่ 7 รางวัลใหญ่แล้วเริ่มรอบใหม่
   lv = เลเวลตัวละคร (ยาเปลี่ยนตามเลเวล) */
export function loginReward(day, lv) {
  const hp = lv >= 60 ? 'white_potion' : lv >= 25 ? 'orange_potion' : 'red_potion';
  const sp = lv >= 50 ? 'mana_potion' : 'blue_potion';
  const z = (n) => Math.round((n * (1 + lv / 25) * ZENY_INCOME) / 100) * 100;
  return [
    { items: [[hp, 10]], zeny: z(1000) },
    { items: [['return_scroll', 2], ['warp_leaf', 5]], zeny: 0 },
    { items: [['exp_15', 1], [hp, 5]], zeny: 0 },
    { items: [[sp, 5]], zeny: z(3000) },
    { items: [['drop_15', 1], ['refine_w', 1], ['refine_a', 1]], zeny: 0 },
    { items: [['exp_2', 1], ['festival_cake', 1]], zeny: 0 },
    { items: [['refine_luck', 1], ['card_clover', 1], [hp, 20]], zeny: z(10000) },
  ][Math.max(0, Math.min(6, day - 1))];
}
export const LOGIN_DAYS = 7;
