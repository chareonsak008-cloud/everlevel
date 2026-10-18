// v0.46 ดินแดนเหนือขีดจำกัด (Lv.100–150) — ไอเทม + มอนสเตอร์ 3 แผนที่ (ออกแบบใหม่ทั้งหมด)
// · Sunken Coast (หาดปะการังจม) Lv.100–117 · Crystal Valley (หุบเขาคริสตัล) Lv.118–134 · Sky Citadel (ปราสาทลอยฟ้า) Lv.135–150
// · อุปกรณ์ 2 ชุด: ห้วงสมุทร Lv.110 (abyssal) · เทพสวรรค์ Lv.135 (divine)
// ค่าพลังมอนต่อยอดจากมอน Lv.98 เดิม (HP ~เลเวล^2.05 · ATK ~เลเวล^1.5 · EXP ตามสูตร MOB_EXP ของเกม)

/* =================== ไอเทม =================== */
const ETC = (name, icon, color, rarity, price, desc) => ({ name, type: 'etc', icon: [icon, color], rarity, price, desc });
const W = (name, wtype, jobs, icon, color, bonus, reqLevel, price, rarity, desc, visual) => ({ name, type: 'equip', slot: 'weapon', slots: 1, wtype, jobs, icon: [icon, color], visual, bonus, reqLevel, price, rarity, desc });
const A = (name, slot, icon, color, bonus, reqLevel, price, rarity, desc) => ({ name, type: 'equip', slot, slots: 1, icon: [icon, color], bonus, reqLevel, price, rarity, desc });

function gearSet(key, th, color, glow, lv, k, price, rarity, src) {
  const R = (n) => Math.round(n * k);
  const d = `อุปกรณ์ชุด${th} สำหรับนักผจญภัย Lv.${lv}+ · ดรอปจาก${src}`;
  return {
    [`${key}_sword`]: W(`ดาบ${th}`, 'sword', ['swordsman'], 'sword', color, { atk: R(368), str: R(7), hit: R(8) }, lv, price, rarity, d, { weapon: 'sword', bladeGlow: glow }),
    [`${key}_staff`]: W(`ไม้เท้า${th}`, 'staff', ['mage', 'acolyte'], 'staff', color, { atk: R(92), matk: R(412), int: R(12), maxSp: R(220) }, lv, price, rarity, d, { weapon: 'staff', gem: glow }),
    [`${key}_bow`]: W(`ธนู${th}`, 'bow', ['archer'], 'bow', color, { atk: R(350), dex: R(7), hit: R(14) }, lv, price, rarity, d, { weapon: 'bow', bowColor: color }),
    [`${key}_mace`]: W(`คทา${th}`, 'mace', ['acolyte', 'swordsman'], 'mace', color, { atk: R(313), matk: R(202), vit: R(6) }, lv, price, rarity, d, { weapon: 'mace' }),
    [`${key}_knife`]: W(`มีด${th}`, 'knife', ['novice', 'swordsman', 'mage', 'archer'], 'knife', color, { atk: R(269), agi: R(7), crit: 0.06 }, lv, price, rarity, d, { weapon: 'knife' }),
    [`${key}_body`]: A(`เกราะ${th}`, 'body', 'shirt', color, { def: R(55), mdef: R(14), maxHp: R(1140), vit: R(6) }, lv, Math.round(price / 2), rarity, d),
    [`${key}_shield`]: A(`โล่${th}`, 'shield', 'shield', color, { def: R(29), mdef: R(14), maxHp: R(380) }, lv, Math.round(price / 2), rarity, d),
    [`${key}_head`]: A(`มงกุฎ${th}`, 'head', 'crown', color, { def: R(13), int: R(6), dex: R(5), maxSp: R(95) }, lv, Math.round(price / 2), rarity, d),
    [`${key}_garment`]: A(`ผ้าคลุม${th}`, 'garment', 'cape', color, { def: R(13), mdef: R(11), flee: R(13), maxHp: R(475) }, lv, Math.round(price / 2), rarity, d),
    [`${key}_shoes`]: A(`รองเท้า${th}`, 'shoes', 'boots', color, { def: R(11), agi: R(7), flee: R(11) }, lv, Math.round(price / 2), rarity, d),
    [`${key}_accessory`]: A(`แหวน${th}`, 'accessory', 'ring', color, { atk: R(22), matk: R(22), maxHpPct: lv >= 130 ? 7 : 6 }, lv, Math.round(price / 2), rarity, d),
  };
}

export const ASCEND_ITEMS = {
  // วัตถุดิบ / ของสะสม
  tide_pearl: ETC('ไข่มุกกระแสน้ำ', 'crystal', '#bff4ff', 'uncommon', 2400, 'ไข่มุกที่เก็บเสียงคลื่นไว้ข้างใน · วัตถุดิบจาก Sunken Coast'),
  coral_shard: ETC('เศษปะการังแสง', 'spike', '#ff8a7a', 'rare', 3200, 'ปะการังเรืองแสงที่ไม่เคยดับแม้พ้นน้ำ'),
  leviathan_scale: ETC('เกล็ดราชันย์คลื่น', 'fang', '#3fe6d0', 'legend', 80000, 'เกล็ดของไทดาลอส แข็งกว่าเหล็กกล้า · ของสะสมหายาก'),
  prism_shard: ETC('เศษปริซึม', 'crystal', '#d8b0ff', 'uncommon', 3000, 'ผลึกที่แยกแสงเป็นเจ็ดสี · วัตถุดิบจาก Crystal Valley'),
  geode_core: ETC('แกนจีโอด', 'crystal', '#8a6ac8', 'rare', 4000, 'แกนหินที่มีผลึกม่วงซ่อนอยู่ข้างใน'),
  crystal_heart: ETC('หัวใจมังกรผลึก', 'crystal', '#9ae8ff', 'legend', 100000, 'หัวใจของคริสธาร์ ยังเต้นเป็นจังหวะแสง · ของสะสมหายาก'),
  sky_feather: ETC('ขนนกฟากฟ้า', 'leaf', '#fff6d8', 'uncommon', 3600, 'ขนนกสีขาวที่ลอยอยู่เองได้ · วัตถุดิบจาก Sky Citadel'),
  storm_core: ETC('แกนพายุ', 'crystal', '#7ab4ff', 'rare', 5000, 'ลูกแก้วที่มีสายฟ้าเล็ก ๆ วิ่งวนอยู่ข้างใน'),
  seraph_halo: ETC('วงรัศมีเทพบุตร', 'ring', '#fff1b0', 'legend', 140000, 'วงแสงของออเรลิออน · ของสะสมหายากที่สุดในเกม'),
  // ชุดอุปกรณ์
  ...gearSet('abyssal', 'ห้วงสมุทร', '#3fe6d0', '#9afff0', 110, 1.35, 420000, 'abyssal', 'Sunken Coast / Crystal Valley'),
  ...gearSet('divine', 'เทพสวรรค์', '#fff1b0', '#ffffff', 135, 1.9, 700000, 'divine', 'Crystal Valley / Sky Citadel'),
};

/* =================== มอนสเตอร์ =================== */
const MOB_EXP = (L) => Math.round(6 + 2.2 * Math.pow(L, 1.6));
const r10 = (n) => Math.round(n / 10) * 10;
const G = (key) => ['sword', 'staff', 'bow', 'mace', 'knife'].map((w) => `${key}_${w}`);
const ARM = (key) => ['body', 'shield', 'head', 'garment', 'shoes', 'accessory'].map((s) => `${key}_${s}`);
const OLD_BEST = ['bloodmoon_sword', 'bloodmoon_staff', 'bloodmoon_bow', 'bloodmoon_mace', 'bloodmoon_knife'];

// มอนธรรมดา: o = { hp, atk, def, mdef, flee } เป็นตัวคูณ/ตัวบวกจากค่ามาตรฐานของเลเวล
function mob(name, L, model, color, o = {}) {
  const k = L / 98, atkAvg = 535 * Math.pow(k, 1.5) * (o.atk || 1), hp = r10(8900 * Math.pow(k, 2.05) * (o.hp || 1));
  return {
    name, level: L, hp, baseExp: Math.round(MOB_EXP(L) * (o.exp || 1)), jobExp: Math.round(MOB_EXP(L) * 0.72 * (o.exp || 1)),
    atk: [Math.round(atkAvg * 0.89), Math.round(atkAvg * 1.11)],
    def: Math.round(65 + (L - 98) * 0.75 + (o.def || 0)), mdef: Math.round(58 + (L - 98) * 0.7 + (o.mdef || 0)),
    hit: Math.round(199 + (L - 98) * 0.75), flee: Math.round(72 + (L - 98) * 0.45 + (o.flee || 0)), crit: o.crit ?? 0.04,
    speed: o.speed || 44, attackDelay: o.delay || 1.5, attackRange: o.range || 28, aggressive: o.aggro ?? true, aggroRange: 92, respawn: [12, 18],
    model, color, height: o.height || 1.4, radius: o.radius || 0.6, ...(o.scale ? { modelScale: o.scale } : {}),
    drops: o.drops || [],
  };
}
// MVP: hp/exp ตามสูตร MVP เดิม (exp ≈ 150 เท่าของมอนเลเวลเดียวกัน)
function mvp(name, L, model, color, o) {
  const k = L / 98, atkAvg = 665 * Math.pow(L / 99, 1.5);
  return {
    name, level: L, hp: r10(230000 * Math.pow(L / 99, 2.6)), baseExp: MOB_EXP(L) * 150, jobExp: Math.round(MOB_EXP(L) * 108),
    atk: [Math.round(atkAvg * 0.89), Math.round(atkAvg * 1.11)], def: Math.round(92 + (L - 99) * 0.8), mdef: Math.round(88 + (L - 99) * 0.75),
    hit: Math.round(220 + (L - 99) * 0.8), flee: Math.round(78 + (L - 99) * 0.4), crit: 0.06,
    speed: 40, attackDelay: 1.8, attackRange: o.range || 42, aggressive: true, aggroRange: 120, respawn: [600, 840],
    model, color, height: o.height || 3.8, radius: o.radius || 1.4, leash: 22, mvp: true, modelScale: o.scale || 2,
    boss: o.boss, drops: o.drops, mvpReward: o.reward,
  };
}
const reward = (key) => ({ novice: `${key}_knife`, swordsman: `${key}_sword`, mage: `${key}_staff`, archer: `${key}_bow`, acolyte: `${key}_mace` });
// ดรอปมาตรฐาน: วัตถุดิบ + ยา + ผลึกตีบวก + อุปกรณ์ (เรตต่ำ)
const D = (mat1, mat2, gear, gearRate, extra = []) => [
  [mat1, 0.6], [mat2, 0.12], ['white_potion', 0.2], ['mana_potion', 0.12], ['refine_w', 0.1], ['refine_a', 0.1], ['refine_guard', 0.004],
  ...G(gear).map((id) => [id, gearRate]), ...ARM(gear).map((id) => [id, gearRate * 0.8]), ...extra,
];

export const ASCEND_MONSTERS = {
  /* ---------- Sunken Coast · หาดปะการังจม Lv.100–117 ---------- */
  reef_crab: mob('แครบปะการัง', 100, 'crab', '#ff7a5a', { hp: 1.1, def: 12, aggro: false, height: 1.0, radius: 0.7, speed: 40, drops: D('tide_pearl', 'coral_shard', 'abyssal', 0.0008, OLD_BEST.map((id) => [id, 0.0015])) }),
  shell_turtle: mob('เต่ากระดองหอย', 104, 'turtle', '#4fb3a0', { hp: 1.4, atk: 0.85, def: 24, mdef: 6, aggro: false, height: 1.1, radius: 0.8, speed: 30, delay: 1.7, drops: D('tide_pearl', 'coral_shard', 'abyssal', 0.001) }),
  abyss_jelly: mob('แมงกะพรุนห้วงลึก', 107, 'jelly', '#b48cff', { hp: 0.8, def: -18, mdef: 28, flee: 14, height: 1.5, speed: 38, range: 64, drops: D('coral_shard', 'tide_pearl', 'abyssal', 0.0012) }),
  drowned_knight: mob('อัศวินจมทะเล', 111, 'sentinel', '#3f7f86', { hp: 1.2, def: 10, height: 2.0, drops: D('coral_shard', 'tide_pearl', 'abyssal', 0.0015) }),
  siren_eel: mob('ไซเรนอีล', 114, 'eel', '#2fd0c8', { atk: 1.15, flee: 10, crit: 0.06, height: 1.3, radius: 0.7, speed: 52, drops: D('coral_shard', 'tide_pearl', 'abyssal', 0.0018) }),
  tidalos: mvp('ไทดาลอส ราชันย์คลื่น', 117, 'eel', '#1fa0c0', {
    scale: 2.3, height: 3.4, radius: 1.6,
    boss: { slam: { cd: [8, 11], radius: 3.6, windup: 1.5, mult: 1.5, knock: 2, color: '#3fe6d0', fx: 'ice' }, roots: { cd: [10, 14], radius: 1.8, windup: 1.4, mult: 1.25, secs: 1.4, color: '#3fe6d0', fx: 'icefall', effect: 'freeze' }, summon: { at: [0.65, 0.3], mob: 'siren_eel', count: 2 }, enrage: 0.25 },
    drops: [['leviathan_scale', 0.95], ['royal_jelly', 0.9], ['mana_potion', 0.8], ['refine_w', 1], ['refine_a', 1], ['refine_guard', 0.4], ...G('abyssal').map((id) => [id, 0.25]), ...ARM('abyssal').map((id) => [id, 0.12])],
    reward: reward('abyssal'),
  }),

  /* ---------- Crystal Valley · หุบเขาคริสตัล Lv.118–134 ---------- */
  shard_beetle: mob('ด้วงผลึก', 118, 'scarab', '#7fe0ff', { hp: 1.05, def: 16, aggro: false, height: 1.0, radius: 0.7, drops: D('prism_shard', 'geode_core', 'abyssal', 0.002) }),
  prism_golem: mob('โกเลมปริซึม', 121, 'icegolem', '#c8a8ff', { hp: 1.5, atk: 0.9, def: 30, mdef: 10, speed: 32, delay: 1.8, height: 2.0, radius: 0.8, drops: D('geode_core', 'prism_shard', 'abyssal', 0.0022) }),
  geode_wolf: mob('หมาป่าจีโอด', 125, 'hollowwolf', '#8a6ac8', { atk: 1.1, flee: 12, speed: 56, height: 1.2, drops: D('prism_shard', 'geode_core', 'divine', 0.0005, G('abyssal').map((id) => [id, 0.0015])) }),
  crystal_drake: mob('ดราคผลึก', 129, 'drake', '#6ad8ff', { hp: 1.15, atk: 1.05, mdef: 12, height: 1.5, radius: 0.8, drops: D('geode_core', 'prism_shard', 'divine', 0.0007, G('abyssal').map((id) => [id, 0.0015])) }),
  prism_wisp: mob('วิญญาณปริซึม', 132, 'shade', '#ff9ae8', { hp: 0.85, def: -15, mdef: 30, flee: 16, range: 60, height: 1.8, drops: D('prism_shard', 'geode_core', 'divine', 0.0008) }),
  crysthar: mvp('คริสธาร์ มังกรผลึก', 134, 'drake', '#9ae8ff', {
    scale: 2.4, height: 3.6, radius: 1.6,
    boss: { slam: { cd: [8, 11], radius: 3.8, windup: 1.5, mult: 1.55, knock: 2, color: '#d8b0ff', fx: 'ice' }, roots: { cd: [10, 13], radius: 2.0, windup: 1.3, mult: 1.3, secs: 1.4, color: '#9ae8ff', fx: 'icefall', effect: 'freeze' }, summon: { at: [0.65, 0.3], mob: 'crystal_drake', count: 2 }, enrage: 0.25 },
    drops: [['crystal_heart', 0.95], ['royal_jelly', 0.9], ['mana_potion', 0.8], ['refine_w', 1], ['refine_a', 1], ['refine_guard', 0.45], ...G('divine').map((id) => [id, 0.12]), ...G('abyssal').map((id) => [id, 0.3]), ...ARM('divine').map((id) => [id, 0.06]), ...ARM('abyssal').map((id) => [id, 0.15])],
    reward: reward('abyssal'),
  }),

  /* ---------- Sky Citadel · ปราสาทลอยฟ้า Lv.135–150 ---------- */
  cloud_sentinel: mob('ผู้พิทักษ์เมฆา', 136, 'sentinel', '#e8e4d8', { hp: 1.2, def: 18, aggro: false, height: 2.0, drops: D('sky_feather', 'storm_core', 'divine', 0.0009) }),
  storm_griffin: mob('กริฟฟินพายุ', 139, 'griffin', '#c8a060', { atk: 1.1, flee: 14, speed: 58, height: 1.6, radius: 0.8, drops: D('sky_feather', 'storm_core', 'divine', 0.001) }),
  seraph_knight: mob('อัศวินเซราฟ', 143, 'seraph', '#f4ecd8', { hp: 1.15, def: 12, mdef: 12, height: 2.0, drops: D('storm_core', 'sky_feather', 'divine', 0.0012) }),
  tempest_shade: mob('วิญญาณพายุ', 146, 'shade', '#7ab4ff', { hp: 0.85, def: -12, mdef: 32, flee: 16, range: 60, height: 1.8, drops: D('storm_core', 'sky_feather', 'divine', 0.0014) }),
  celestial_titan: mob('ไททันสวรรค์', 149, 'sentinel', '#d8c48a', { hp: 1.6, atk: 1.1, def: 30, mdef: 16, speed: 34, delay: 1.9, scale: 1.4, height: 2.8, radius: 0.9, drops: D('storm_core', 'sky_feather', 'divine', 0.0018) }),
  aurelion: mvp('ออเรลิออน เทพบุตรสวรรค์', 150, 'seraph', '#fff0c0', {
    scale: 2.2, height: 4.2, radius: 1.5,
    boss: { slam: { cd: [7, 10], radius: 4, windup: 1.5, mult: 1.6, knock: 2.2, color: '#fff1b0', fx: 'fire' }, roots: { cd: [9, 12], radius: 2.1, windup: 1.3, mult: 1.35, secs: 1.5, color: '#ffe08a', fx: 'meteor', effect: 'burn' }, summon: { at: [0.7, 0.4, 0.15], mob: 'seraph_knight', count: 2 }, enrage: 0.3 },
    drops: [['seraph_halo', 0.95], ['royal_jelly', 0.95], ['mana_potion', 0.9], ['refine_w', 1], ['refine_a', 1], ['refine_guard', 0.5], ...G('divine').map((id) => [id, 0.28]), ...ARM('divine').map((id) => [id, 0.14])],
    reward: reward('divine'),
  }),
};
