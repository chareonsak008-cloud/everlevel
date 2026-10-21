// v0.79 อีเวนต์ตามเทศกาล — เปิด/ปิดเองตามปฏิทิน (เวลาไทยจากเซิร์ฟเวอร์)
// ช่วงเทศกาล: มอนพิเศษเกิดทุกแผนที่ล่า (ปรับเลเวลตามแผนที่) + บอสเทศกาลแผนที่ละ 1 ตัว → ดรอปของสะสม → แลกออร่าเทศกาล (ได้ถาวร) และของดีที่หน้าต่างเทศกาล
// ไม่ import ไฟล์อื่น (monsters.js / items.js นำข้อมูลจากไฟล์นี้ไปรวม)

const DAY = 86400000;
const bkk = (y, m, d) => Date.UTC(y, m - 1, d) - 7 * 3600000;   // 00:00 น. เวลาไทยของวันนั้น
// วันลอยกระทง (ขึ้น 15 ค่ำ เดือน 12) — ปฏิทินล่วงหน้า
const LOY = { 2025: [11, 6], 2026: [11, 25], 2027: [11, 14], 2028: [11, 2], 2029: [11, 21], 2030: [11, 10], 2031: [10, 31], 2032: [11, 18] };

export const FEST_GRACE = 3 * DAY;   // หลังจบเทศกาลยังแลกออร่าได้อีก 3 วัน

export const FESTIVALS = {
  halloween: {
    name: 'ฮาโลวีนราตรีหลอน', icon: '🎃', color: '#ff8a1a', token: 'fest_candy', aura: 'a_fest_halloween', mob: 'fest_pumpkin', boss: 'fest_pumpking',
    range: (y) => [bkk(y, 10, 24), bkk(y, 11, 3)],
    when: '24 ต.ค. – 2 พ.ย.', desc: 'ฟักทองหลอนบุกทุกแผนที่! ปราบแล้วเก็บลูกอมฮาโลวีนไปแลกของ',
  },
  loykrathong: {
    name: 'ลอยกระทงแสงจันทร์', icon: '🪷', color: '#ff9ad0', token: 'fest_lotus', aura: 'a_fest_krathong', mob: 'fest_krathong', boss: 'fest_krathong_queen',
    range: (y) => { const L = LOY[y]; if (!L) return null; const d = bkk(y, L[0], L[1]); return [d - 4 * DAY, d + 4 * DAY]; },
    when: 'คืนเพ็ญเดือน 12 (±4 วัน)', desc: 'ภูตกระทงล่องลอยทั่วดินแดน เก็บกลีบบัวแสงจันทร์ไปแลกออร่าสายธารกระทง',
  },
  songkran: {
    name: 'สงกรานต์สาดความสุข', icon: '💦', color: '#5ac8ff', token: 'fest_bowl', aura: 'a_fest_songkran', mob: 'fest_splash', boss: 'fest_splash_king',
    range: (y) => [bkk(y, 4, 10), bkk(y, 4, 18)],
    when: '10 – 17 เม.ย.', desc: 'ช้างน้อยสาดน้ำออกมาเล่นทั่วแผนที่ เก็บขันน้ำเงินไปแลกของ',
  },
  newyear: {
    name: 'ส่งท้ายปีเก่า ต้อนรับปีใหม่', icon: '🎁', color: '#ff5a6a', token: 'fest_gift', aura: 'a_fest_newyear', mob: 'fest_snowman', boss: 'fest_frostking',
    range: (y) => [bkk(y, 12, 20), bkk(y + 1, 1, 4)],
    when: '20 ธ.ค. – 3 ม.ค.', desc: 'ตุ๊กตาหิมะซนแจกของขวัญ เก็บกล่องของขวัญจิ๋วไปแลกออร่าค่ำคืนส่งท้ายปี',
  },
};

// เทศกาลที่กำลังเปิด ณ เวลา ms → [{ id, ...F, start, end }]  (grace = รวมช่วงแลกออร่าหลังจบ)
export function festivalsAt(ms, grace = 0) {
  const y = new Date(ms + 7 * 3600000).getUTCFullYear(), out = [];
  for (const [id, F] of Object.entries(FESTIVALS)) {
    for (const yy of [y - 1, y]) {
      const r = F.range(yy); if (!r) continue;
      if (ms >= r[0] && ms < r[1] + grace) { out.push({ id, ...F, start: r[0], end: r[1] }); break; }
    }
  }
  return out;
}
// เทศกาลถัดไป (ไว้แสดงในหน้าต่าง)
export function nextFestivals(ms) {
  const y = new Date(ms + 7 * 3600000).getUTCFullYear(), out = [];
  for (const [id, F] of Object.entries(FESTIVALS)) for (const yy of [y, y + 1]) { const r = F.range(yy); if (r && r[1] > ms) { out.push({ id, ...F, start: r[0], end: r[1] }); break; } }
  return out.sort((a, b) => a.start - b.start);
}

// ร้านแลกของสะสม (ใช้ได้ทุกเวลา ยกเว้นออร่าแลกได้เฉพาะช่วงเทศกาล + 3 วัน) · มูลค่าไม่เกินมูลค่าของสะสมในแคตตาล็อก
export const FEST_AURA_COST = 400;
export const FEST_SHOP = [
  { id: 'refine_w', n: 2, cost: 2 },
  { id: 'refine_a', n: 2, cost: 2 },
  { id: 'royal_jelly', n: 1, cost: 5 },
  { id: 'phoenix_feather', n: 1, cost: 5 },
  { id: 'box_silver', n: 1, cost: 6 },
  { id: 'egg_moon', n: 1, cost: 12 },
  { id: 'refine_luck', n: 1, cost: 90 },   // v0.85 แพงขึ้น
  { id: 'refine_guard', n: 1, cost: 30 },
  { id: 'box_gold', n: 1, cost: 40 },
];

/* ---------- ของสะสม ---------- */
const tok = (name, icon, desc) => ({ name, type: 'etc', keep: true, icon, price: 1000, rarity: 'epic', fest: true, desc: `${desc} · แลกของที่หน้าต่างเทศกาล (ปุ่ม "กิจกรรม") · แลกเปลี่ยน/ลงตลาดไม่ได้` });
export const FEST_ITEMS = {
  fest_candy: tok('ลูกอมฮาโลวีน', ['candy', '#ff8a1a', '#7a3aff'], 'ลูกอมห่อกระดาษลายฟักทอง ดรอปจากมอนฮาโลวีน'),
  fest_lotus: tok('กลีบบัวแสงจันทร์', ['lotus', '#ff9ad0'], 'กลีบบัวเรืองแสงจากกระทงคืนเพ็ญ ดรอปจากมอนลอยกระทง'),
  fest_bowl: tok('ขันน้ำเงิน', ['silverbowl', '#d8e4f0', '#5ac8ff'], 'ขันเงินลายกนกใส่น้ำอบ ดรอปจากมอนสงกรานต์'),
  fest_gift: tok('กล่องของขวัญจิ๋ว', ['giftbox', '#d8283a', '#3ac86a'], 'กล่องของขวัญผูกโบว์เขียว ดรอปจากมอนปีใหม่'),
};

/* ---------- มอนเทศกาล (ค่าฐาน Lv.1 — ตอนเกิดจะปรับเลเวลตามแผนที่ด้วย scaledData) ---------- */
const mob = (name, model, color, token, extra = {}) => ({
  name, level: 1, hp: 46, baseExp: 12, jobExp: 9, atk: [5, 8], def: 0, mdef: 0, hit: 80, flee: 4, crit: 0,
  speed: 40, attackDelay: 1.5, attackRange: 24, aggressive: false, respawn: [8, 12],
  model, color, height: 1.0, fest: true, drops: [[token, 0.55], [token, 0.2], ['refine_w', 0.01], ['refine_a', 0.01]], ...extra,
});
const boss = (name, model, color, token, extra = {}) => ({
  name, level: 1, hp: 1400, baseExp: 360, jobExp: 260, atk: [9, 13], def: 1, mdef: 1, hit: 95, flee: 6, crit: 0.05,
  speed: 34, attackDelay: 1.7, attackRange: 34, aggressive: true, aggroRange: 110, respawn: [600, 900],
  model, color, height: 2.4, radius: 0.9, modelScale: 2.2, leash: 20, hat: true, fest: true, festBoss: true,
  boss: { slam: { cd: [7, 10], radius: 2.6, windup: 1.3, mult: 1.4, knock: 2 }, roots: { cd: [9, 13], radius: 1.5, windup: 1.1, mult: 1.1, secs: 1.4 }, enrage: 0.3 },
  drops: [...Array.from({ length: 12 }, () => [token, 1]), ...Array.from({ length: 8 }, () => [token, 0.5]), ['refine_w', 0.5], ['refine_a', 0.5], ['refine_luck', 0.01], ['refine_guard', 0.03]],
  ...extra,
});
export const FEST_MONSTERS = {
  fest_pumpkin: mob('ฟักทองหลอน', 'pumpkin', '#ff8a1a', 'fest_candy', { height: 0.9 }),
  fest_pumpking: boss('ราชันฟักทองไร้เงา', 'pumpkin', '#ff6a0a', 'fest_candy', { boss: { slam: { cd: [7, 10], radius: 2.6, windup: 1.3, mult: 1.4, knock: 2, fx: 'fire', color: '#ff8a1a' }, roots: { cd: [9, 13], radius: 1.5, windup: 1.1, mult: 1.1, secs: 1.4, effect: 'burn', fx: 'meteor' }, enrage: 0.3 } }),
  fest_krathong: mob('ภูตกระทงน้อย', 'krathong', '#ff9ad0', 'fest_lotus', { height: 1.0, speed: 34 }),
  fest_krathong_queen: boss('นางพญากระทงแสงจันทร์', 'krathong', '#ffc8ea', 'fest_lotus', { modelScale: 2.4, boss: { slam: { cd: [7, 10], radius: 2.6, windup: 1.3, mult: 1.4, knock: 2, color: '#ff9ad0' }, roots: { cd: [9, 13], radius: 1.5, windup: 1.1, mult: 1.1, secs: 1.4, fx: 'icefall', color: '#bfe0ff' }, enrage: 0.3 } }),
  fest_splash: mob('ช้างน้อยสาดน้ำ', 'babyele', '#9ab8d8', 'fest_bowl', { height: 1.0 }),
  fest_splash_king: boss('พญาช้างเผือกสายน้ำ', 'babyele', '#eef2f8', 'fest_bowl', { modelScale: 2.0, boss: { slam: { cd: [7, 10], radius: 2.6, windup: 1.3, mult: 1.4, knock: 2, fx: 'ice', color: '#5ac8ff' }, roots: { cd: [9, 13], radius: 1.5, windup: 1.1, mult: 1.1, secs: 1.4, fx: 'icefall', color: '#7fd8ff' }, enrage: 0.3 } }),
  fest_snowman: mob('ตุ๊กตาหิมะซน', 'snowman', '#d8283a', 'fest_gift', { height: 1.4 }),
  fest_frostking: boss('ราชาหิมะของขวัญ', 'snowman', '#2a8a4a', 'fest_gift', { modelScale: 1.9, height: 2.8, boss: { slam: { cd: [7, 10], radius: 2.6, windup: 1.3, mult: 1.4, knock: 2, fx: 'ice', color: '#bfeeff' }, roots: { cd: [9, 13], radius: 1.5, windup: 1.1, mult: 1.1, secs: 1.4, fx: 'icefall', color: '#bfeeff' }, enrage: 0.3 } }),
};
