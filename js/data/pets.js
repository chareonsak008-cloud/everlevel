// สัตว์เลี้ยงช่วยเก็บของ (v0.13 preview) — 12 ตัว · ระดับละ 2 ตัว ตั้งแต่ ธรรมดา ถึง Celestial
// ได้จาก "ไข่สัตว์เลี้ยง" ที่ดรอปจากมอนสเตอร์ → ใช้ไข่ในกระเป๋าเพื่อฟัก (สุ่มระดับตาม EGG_ODDS แล้วสุ่ม 1 ใน 2 ตัวของระดับนั้น)
// สัตว์เลี้ยงเดินตามเจ้าของ วิ่งไปเก็บของที่ตกในรัศมี แล้วนำกลับมาใส่กระเป๋า · ไม่ต่อสู้ ไม่ตาย
// ฟักได้ตัวซ้ำ → ดาว ★1–★5 (รัศมี/ความเร็วเพิ่ม) · ครบ ★5 แล้วซ้ำอีก → รับ Zeny แทน (PET_DUP_ZENY)

export const PET_TIERS = ['common', 'rare', 'epic', 'legend', 'mythic', 'celestial'];

// สีและชื่อระดับเดียวกับชุดแฟชั่น (data/costumes.js)
export const PET_RARITY = {
  common: { name: 'ธรรมดา', color: '#c8d0dc' },
  rare: { name: 'หายาก', color: '#6fc8ff' },
  epic: { name: 'ล้ำค่า', color: '#c08aff' },
  legend: { name: 'ตำนาน', color: '#ffb347' },
  mythic: { name: 'Mythical', color: '#ff4a6a' },
  celestial: { name: 'Celestial', color: '#8af0ff' },
};

// ค่าพื้นฐานตามระดับ: radius = รัศมีมองหาของ (ช่อง) · speed = ความเร็ววิ่ง (% ของผู้เล่น) · carry = ขนได้กี่ชิ้นต่อรอบ (0 = ไม่จำกัด)
export const TIER_STATS = {
  common: { radius: 3, speed: 100, carry: 1 },
  rare: { radius: 4, speed: 115, carry: 2 },
  epic: { radius: 6, speed: 130, carry: 3 },
  legend: { radius: 8, speed: 150, carry: 4 },
  mythic: { radius: 12, speed: 175, carry: 6 },
  celestial: { radius: 20, speed: 200, carry: 0 },
};

// ดาว: แต่ละดาว รัศมี +10% และความเร็ว +5% · ★5 ได้ออร่าทองรอบตัวสัตว์เลี้ยง
export const STAR_MAX = 5;
export const STAR_BONUS = { radius: 0.1, speed: 0.05 };
export const PET_DUP_ZENY = { common: 300, rare: 1500, epic: 6000, legend: 25000, mythic: 120000, celestial: 500000 };

// mods: ค่าที่ระบบเกมจะอ่านไปใช้ (preview ยังไม่ผูกกับเกม)
export const PETS = {
  /* ---------- ธรรมดา ---------- */
  hamster: {
    name: 'ปุกปุย', en: 'Pouch Hamster', tier: 'common', kind: 'hamster',
    flavor: 'แฮมสเตอร์แก้มยุ้ย ชอบอมของเต็มแก้มแล้ววิ่งดุ๊กดิ๊กกลับมาหาเจ้าของ',
    skill: { name: 'แก้มตุ่ย', desc: 'อมของไว้ในแก้มได้ 2 ชิ้นต่อรอบ (ระดับธรรมดาปกติขนได้ 1 ชิ้น)' },
    mods: { carry: 2 },
  },
  squirrel: {
    name: 'โอ๊คกี้', en: 'Acorn Squirrel', tier: 'common', kind: 'squirrel',
    flavor: 'กระรอกขาไวกอดลูกโอ๊คไว้ไม่ยอมปล่อย หางฟูใหญ่กว่าตัว',
    skill: { name: 'ขาไวไม่มีหยุด', desc: 'วิ่งเร็วขึ้นอีก 20% เก็บของทันก่อนเจ้าของเดินจากไป' },
    mods: { speed: 20 },
  },
  /* ---------- หายาก ---------- */
  turtle: {
    name: 'บ็อกซี่', en: 'Chestback Turtle', tier: 'rare', kind: 'turtle',
    flavor: 'เต่าที่กระดองเป็นหีบสมบัติจริง ๆ เปิดฝาออกได้ ใส่ของได้เยอะมาก',
    skill: { name: 'หีบกระดอง', desc: 'กระเป๋าของเจ้าของเพิ่ม 10 ช่อง (60 → 70) ตลอดเวลาที่เรียกออกมา' },
    mods: { bag: 10 },
  },
  finch: {
    name: 'ปิ๊บ', en: 'Parcel Finch', tier: 'rare', kind: 'finch',
    flavor: 'นกไปรษณีย์ใส่หมวกบุรุษไปรษณีย์ สะพายกระเป๋าพัสดุใบจิ๋ว',
    skill: { name: 'ส่งด่วนทางอากาศ', desc: 'บินข้ามน้ำ กำแพง และหน้าผาได้ เก็บของที่ตกในจุดที่เดินไปไม่ถึง' },
    mods: { fly: true },
  },
  /* ---------- ล้ำค่า ---------- */
  golem: {
    name: 'แม็กนี่', en: 'Magnet Golem', tier: 'epic', kind: 'golem',
    flavor: 'โกเลมหินจิ๋วมีแม่เหล็กเกือกม้าบนหัว อะไรที่เป็นของตกจะลอยมาติดหมด',
    skill: { name: 'สนามแม่เหล็ก', desc: 'ดูดของทุกชิ้นในรัศมีเข้าหาตัวพร้อมกันทีเดียว ทุก 4 วินาที ไม่ต้องวิ่งไปเก็บทีละชิ้น' },
    mods: { magnet: 4 },
  },
  fox: {
    name: 'ลูมิ', en: 'Lantern Fox', tier: 'epic', kind: 'fox',
    flavor: 'จิ้งจอกขาวแขวนโคมไฟที่ปลายหาง แสงโคมนำทางไปหาของล้ำค่าเสมอ',
    skill: { name: 'โคมส่องสมบัติ', desc: 'ของหายาก การ์ด และกล่องแฟชั่น มีลำแสงชี้ให้เห็นจากไกล และลูมิจะเก็บชิ้นพวกนี้ก่อนเสมอ' },
    mods: { rareBeam: true, rareFirst: true },
  },
  /* ---------- ตำนาน ---------- */
  wyrm: {
    name: 'ออมทอง', en: 'Coin Wyrmling', tier: 'legend', kind: 'wyrm',
    flavor: 'มังกรน้อยตัวกลมสีทองที่มีช่องหยอดเหรียญบนหลัง เหมือนกระปุกออมสิน',
    skill: { name: 'มังกรออมสิน', desc: 'ขายของให้ร้านค้าได้ราคา +5% · ถ้ากระเป๋าเต็ม จะแปลงของ etc ที่เก็บได้เป็น Zeny ให้อัตโนมัติ' },
    mods: { sell: 5, autoSell: true },
  },
  fawn: {
    name: 'เซเรน', en: 'Crystal Fawn', tier: 'legend', kind: 'fawn',
    flavor: 'ลูกกวางที่เขาเป็นผลึกคริสตัล ทุกก้าวที่เดินมีประกายแสงร่วงลงพื้น',
    skill: { name: 'พรแห่งผลึก', desc: 'ทุกครั้งที่นำของมาส่ง เจ้าของฟื้น HP และ SP 1% ของค่าสูงสุด' },
    mods: { healPerItem: 1 },
  },
  /* ---------- Mythical ---------- */
  phoenix: {
    name: 'เอมเบอร์', en: 'Phoenix Chick', tier: 'mythic', kind: 'phoenix',
    flavor: 'ลูกนกฟีนิกซ์ขนเป็นเปลวไฟอุ่น ๆ ไม่เคยร้อนมือเจ้าของ',
    skill: { name: 'เปลวไฟคืนชีพ', desc: 'เมื่อเจ้าของล้ม จะชุบชีวิตกลับมาพร้อม HP 30% (1 ครั้งทุก 10 นาที) · ของที่ตกในรัศมีอยู่บนพื้นได้นานขึ้น 3 เท่า' },
    mods: { revive: 600, dropLife: 3 },
  },
  kraken: {
    name: 'อบิส', en: 'Abyss Kraken', tier: 'mythic', kind: 'kraken',
    flavor: 'ปลาหมึกยักษ์จิ๋วจากห้วงลึก ลอยไปมากลางอากาศ หนวดทั้งแปดคว้าของได้พร้อมกัน',
    skill: { name: 'หนวดแปดทิศ', desc: 'ยื่นหนวดคว้าของได้ 8 ชิ้นพร้อมกันจากระยะไกล ไม่ต้องลอยไปเก็บทีละชิ้น · โอกาสดรอปไอเทมของเจ้าของ +2%' },
    mods: { grab: 8, drop: 2 },
  },
  /* ---------- Celestial ---------- */
  whale: {
    name: 'โนวา', en: 'Star Whale', tier: 'celestial', kind: 'whale',
    flavor: 'วาฬดวงดาวที่ว่ายอยู่บนฟ้า ลำตัวเป็นทางช้างเผือก ร้องเพลงทีไรดาวตกลงมา',
    skill: { name: 'ฝนดาวตก', desc: 'ทุก 10 วินาที ดูดของทั้งแผนที่มาหาเจ้าของทันที · ดรอป +3% · มอนที่ล้มมีโอกาส 2% เรียกดาวตกให้ดรอปของเพิ่มอีก 1 ชิ้น' },
    mods: { vacuum: 10, drop: 3, meteor: 2 },
  },
  qilin: {
    name: 'เทียนหยุน', en: 'Skycloud Qilin', tier: 'celestial', kind: 'qilin',
    flavor: 'กิเลนเมฆาสวรรค์ เกล็ดทองคำ เหยียบเมฆแทนพื้น ว่ากันว่าใครได้เป็นเจ้าของจะโชคดีไปตลอดกาล',
    skill: { name: 'โชคลาภสวรรค์', desc: 'โอกาสดรอปการ์ด ×1.5 · เปิดกล่องแฟชั่นมีโอกาส 5% ได้ของระดับสูงขึ้น 1 ขั้น' },
    mods: { card: 1.5, boxUp: 5 },
  },
};

export const PET_ORDER = Object.keys(PETS);
export const petsOfTier = (tier) => PET_ORDER.filter((id) => PETS[id].tier === tier);

/* ---------- ไข่สัตว์เลี้ยง (ไอเทมในกระเป๋า) ---------- */
// odds เป็นเปอร์เซ็นต์ (รวม = 100) · from = แหล่งดรอป
export const PET_EGGS = {
  egg_spot: {
    name: 'ไข่ลายจุด', en: 'Speckled Egg', color: '#f4e6c8', spot: '#8ac86a',
    from: 'มอนสเตอร์ทุกตัว 0.3% · MVP 10%',
    odds: { common: 78, rare: 18, epic: 3.5, legend: 0.45, mythic: 0.045, celestial: 0.005 },
  },
  egg_moon: {
    name: 'ไข่เงินแสงจันทร์', en: 'Moonsilver Egg', color: '#dfe6f4', spot: '#7fa8ff',
    from: 'มอนสเตอร์ Lv.20 ขึ้นไป 0.08% · MVP 5%',
    odds: { common: 30, rare: 45, epic: 19, legend: 5.5, mythic: 0.45, celestial: 0.05 },
  },
  egg_galaxy: {
    name: 'ไข่ทองดาราจักร', en: 'Galaxy Gold Egg', color: '#ffd36b', spot: '#7a4aff',
    from: 'มอนสเตอร์ Lv.45 ขึ้นไป 0.02% · MVP 2%',
    odds: { common: 0, rare: 35, epic: 40, legend: 20, mythic: 4.2, celestial: 0.8 },
  },
};
export const EGG_ORDER = Object.keys(PET_EGGS);

// ฟักไข่ → { id, tier }
export function hatchEgg(eggId, rnd = Math.random) {
  const odds = (PET_EGGS[eggId] || PET_EGGS.egg_spot).odds;
  const tiers = PET_TIERS.filter((t) => (odds[t] || 0) > 0);
  const total = tiers.reduce((a, t) => a + odds[t], 0);
  let r = rnd() * total, tier = tiers[0];
  for (const t of tiers) { if (r < odds[t]) { tier = t; break; } r -= odds[t]; }
  const list = petsOfTier(tier);
  return { id: list[Math.floor(rnd() * list.length) % list.length], tier };
}

// ค่าจริงหลังรวมดาว + ความสามารถพิเศษ
export function petStats(id, stars = 0) {
  const p = PETS[id], base = TIER_STATS[p.tier], m = p.mods || {};
  const s = Math.max(0, Math.min(STAR_MAX, stars));
  return {
    radius: +(base.radius * (1 + STAR_BONUS.radius * s)).toFixed(1),
    speed: Math.round((base.speed + (m.speed || 0)) * (1 + STAR_BONUS.speed * s)),
    carry: m.grab || m.carry || base.carry,
  };
}

export function fmtPct(p) {
  if (!p) return '—';
  if (p >= 1) return +p.toFixed(1) + '%';
  if (p >= 0.01) return +p.toFixed(3) + '%';
  return +p.toPrecision(2) + '%';
}
