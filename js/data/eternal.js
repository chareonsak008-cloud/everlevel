// v0.77 อุปกรณ์นิรันดร์กาล — ระดับสูงสุดของเกม (เกรดใหม่ 'eternal' เหนือเทพสวรรค์) · ได้จากการหลอมเท่านั้น
// · 4 สายอาชีพ × 7 ชิ้น (อาวุธ + มือรองประจำสาย + หัว ชุด ผ้าคลุม รองเท้า เครื่องประดับ) · ใส่ได้เฉพาะสายตัวเอง (รวมอาชีพขั้น 2)
// · ไม่มีค่าสุ่ม (ค่าพลังตายตัวสูงสุด) · ตีบวก/ใส่การ์ดได้ตามปกติ · โบนัสเซ็ต 2/4/6 ชิ้น (ผูกกับอาวุธของสาย)
// · หลอมที่การ์ธ (ช่างตีเหล็ก) : ใช้อุปกรณ์เทพสวรรค์ช่องเดียวกันเป็นฐาน + เศษนิรันดร์ + ของสะสม MVP + วัตถุดิบ Lv.135 + Zeny · มีโอกาสล้มเหลว
//   ต้องรัน supabase/eternal_v0.77.sql (เพิ่มไอเทมใหม่เข้าแคตตาล็อก ไม่งั้นระบบกันโกงจะล็อกการแลก)

export const ETERNAL_LV = 145;
export const ETERNAL_COLOR = '#fff4ff';

const W = (name, wtype, jobs, form, shape, c1, c2, glow, bonus, visual, set) => ({
  name, type: 'equip', slot: 'weapon', slots: 2, wtype, jobs, icon: [wtype, c1], look: { form, shape, c1, c2, glow }, visual,
  bonus, reqLevel: ETERNAL_LV, price: 3000000, rarity: 'eternal', noRoll: true, eternal: true, set,
  desc: 'อาวุธระดับนิรันดร์กาล ได้จากการหลอมที่การ์ธเท่านั้น · ไม่มีค่าสุ่ม ค่าพลังสูงสุดในเกม',
});
const A = (name, slot, jobs, form, c1, c2, glow, bonus, extra = {}, shape) => ({
  name, type: 'equip', slot, slots: 1, jobs, icon: [slot === 'body' ? 'shirt' : slot === 'head' ? 'crown' : slot === 'garment' ? 'cape' : slot === 'shoes' ? 'boots' : slot === 'accessory' ? 'ring' : 'shield', c1, c2],
  look: { form, shape, c1, c2, glow }, bonus, reqLevel: ETERNAL_LV, price: 1500000, rarity: 'eternal', noRoll: true, eternal: true,
  desc: 'อุปกรณ์ระดับนิรันดร์กาล ได้จากการหลอมที่การ์ธเท่านั้น · ไม่มีค่าสุ่ม ค่าพลังสูงสุดในเกม', ...extra,
});

// สายอาชีพ: key · ชื่อเซ็ต · อาชีพขั้น 1 (ขั้น 2 ใช้ได้ด้วย) · สี
export const ETERNAL_LINES = {
  blade:  { name: 'ราชันย์สุริยันต์', job: 'swordsman', job2: 'knight', c1: '#ffe9a0', c2: '#8a3a12', glow: '#ff9a3a', icon: '⚔' },
  astral: { name: 'ดาราพิภพ', job: 'mage', job2: 'wizard', c1: '#d8c8ff', c2: '#2a1a5a', glow: '#9ae8ff', icon: '✦' },
  gale:   { name: 'พายุนภากาศ', job: 'archer', job2: 'hunter', c1: '#c8fff0', c2: '#1a4a3a', glow: '#8affb0', icon: '➶' },
  sanct:  { name: 'ประภาศักดิ์สิทธิ์', job: 'acolyte', job2: 'priest', c1: '#fff8e0', c2: '#6a5a2a', glow: '#ffe08a', icon: '✚' },
};
// ทรงไอคอนของแต่ละชิ้นตามสาย
const SHAPE = {
  blade:  { shield: 'tower', head: 'crown', body: 'plate', garment: 'mantle', shoes: 'greave', accessory: 'signet' },
  astral: { shield: 'galaxy', head: 'circlet', body: 'robe', garment: 'feather', shoes: 'winged', accessory: 'pendant' },
  gale:   { shield: 'feather', head: 'circlet', body: 'coat', garment: 'scarf', shoes: 'winged', accessory: 'band' },
  sanct:  { shield: 'grimoire', head: 'crown', body: 'robe', garment: 'feather', shoes: 'winged', accessory: 'pendant' },
};
export const ETERNAL_SLOTS = ['weapon', 'shield', 'head', 'body', 'garment', 'shoes', 'accessory'];
const SLOT_ID = { weapon: 'wpn', shield: 'off', head: 'head', body: 'body', garment: 'garment', shoes: 'shoes', accessory: 'acc' };
export const eternalId = (line, slot) => `et_${line}_${SLOT_ID[slot]}`;
const pieces = (line) => ETERNAL_SLOTS.filter((s) => s !== 'weapon').map((s) => eternalId(line, s));

export const ETERNAL_ITEMS = {};
function line(key, wpn, off, focus, setBonus) {
  const L = ETERNAL_LINES[key], jobs = [L.job], n = L.name;
  ETERNAL_ITEMS[eternalId(key, 'weapon')] = W(wpn.name, wpn.wtype, jobs, wpn.form, wpn.shape, L.c1, L.c2, L.glow, wpn.bonus, wpn.visual,
    { id: `eternal_${key}`, name: n, pieces: pieces(key), bonus: setBonus });
  ETERNAL_ITEMS[eternalId(key, 'shield')] = A(off.name, 'shield', jobs, off.form, L.c1, L.c2, L.glow, off.bonus, off.form === 'shield' ? {} : { offhand: off.form }, SHAPE[key].shield);
  ETERNAL_ITEMS[eternalId(key, 'head')] = A(`มงกุฎ${n}`, 'head', jobs, 'head', L.c1, L.c2, L.glow, { def: 34, mdef: 12, maxSp: 247, ...focus.head }, {}, SHAPE[key].head);
  ETERNAL_ITEMS[eternalId(key, 'body')] = A(`เกราะ${n}`, 'body', jobs, 'body', L.c1, L.c2, L.glow, { def: 143, mdef: 36, maxHp: 2964, vit: 16, ...focus.body }, {}, SHAPE[key].body);
  ETERNAL_ITEMS[eternalId(key, 'garment')] = A(`ผ้าคลุม${n}`, 'garment', jobs, 'garment', L.c1, L.c2, L.glow, { def: 34, mdef: 29, flee: 34, maxHp: 1235, ...focus.garment }, {}, SHAPE[key].garment);
  ETERNAL_ITEMS[eternalId(key, 'shoes')] = A(`รองเท้า${n}`, 'shoes', jobs, 'shoes', L.c1, L.c2, L.glow, { def: 29, agi: 18, flee: 29, speedPct: 6, ...focus.shoes }, {}, SHAPE[key].shoes);
  ETERNAL_ITEMS[eternalId(key, 'accessory')] = A(`แหวน${n}`, 'accessory', jobs, 'accessory', L.c1, L.c2, L.glow, { atk: 57, matk: 57, maxHpPct: 9, ...focus.acc }, {}, SHAPE[key].accessory);
}

line('blade',
  { name: 'ดาบราชันย์สุริยันต์', wtype: 'sword', form: 'sword_2h', shape: 'flame', bonus: { atk: 957, str: 18, hit: 21, meleePct: 10, critDmgPct: 15 }, visual: { weapon: 'sword', bladeGlow: '#ffb84a' } },
  { name: 'โล่ราชันย์สุริยันต์', form: 'shield', bonus: { def: 75, mdef: 36, maxHp: 988, dmgReduce: 5 } },
  { head: { str: 12 }, body: { maxHpPct: 5 }, garment: { str: 6 }, shoes: { str: 6 }, acc: { meleePct: 5 } },
  { 2: { 'ATK%': 5 }, 4: { 'Melee DMG%': 8, 'CRIT DMG%': 15 }, 6: { 'ดูดเลือด%': 3, 'MaxHP%': 10, 'ลดดาเมจรับ%': 6, 'ATK%': 8 } });
line('astral',
  { name: 'ไม้เท้าดาราพิภพ', wtype: 'staff', form: 'staff', shape: 'orbcage', bonus: { atk: 240, matk: 1071, int: 31, maxSp: 572, castPct: 10, matkPct: 8 }, visual: { weapon: 'staff', gem: '#9ae8ff' } },
  { name: 'ลูกแก้วดาราพิภพ', form: 'orbOff', bonus: { mdef: 40, matk: 160, int: 15, castPct: 10, maxSpPct: 8 } },
  { head: { int: 14 }, body: { maxSpPct: 8 }, garment: { int: 6 }, shoes: { dex: 6 }, acc: { matkPct: 5 } },
  { 2: { 'MATK%': 5 }, 4: { 'Cast Time -%': 12, 'MaxSP%': 10 }, 6: { 'MATK%': 12, 'After-cast Delay -%': 10, 'ลดดาเมจรับ%': 5, 'ดูด SP%': 2 } });
line('gale',
  { name: 'ธนูพายุนภากาศ', wtype: 'bow', form: 'longbow', shape: 'eclipse', bonus: { atk: 910, dex: 18, hit: 36, rangedPct: 12, critDmgPct: 15 }, visual: { weapon: 'bow', bowColor: '#8affb0' } },
  { name: 'ซองลูกธนูพายุนภากาศ', form: 'quiver', bonus: { def: 30, atk: 120, dex: 15, rangedPct: 8, critDmgPct: 12 } },
  { head: { dex: 14 }, body: { flee: 15 }, garment: { agi: 6 }, shoes: { dex: 6 }, acc: { rangedPct: 5 } },
  { 2: { 'ATK%': 5 }, 4: { 'Ranged DMG%': 10, 'ASPD%': 8 }, 6: { 'Ranged DMG%': 12, CRIT: 10, 'CRIT DMG%': 20, Range: 1 } });
line('sanct',
  { name: 'คทาประภาศักดิ์สิทธิ์', wtype: 'staff', form: 'scepter', shape: 'seraph', bonus: { atk: 300, matk: 950, int: 25, maxSp: 500, healPct: 25, delayPct: 8 }, visual: { weapon: 'staff', gem: '#ffe08a' } },
  { name: 'คัมภีร์ประภาศักดิ์สิทธิ์', form: 'tome', bonus: { mdef: 40, int: 15, healPct: 20, spRegenPct: 30, delayPct: 6 } },
  { head: { int: 12 }, body: { healPct: 8 }, garment: { vit: 6 }, shoes: { int: 6 }, acc: { healPct: 8 } },
  { 2: { 'MATK%': 5 }, 4: { 'Heal Power%': 20, 'SP Regen%': 30 }, 6: { 'Heal Power%': 30, 'MATK%': 10, 'ลดดาเมจรับ%': 8, 'MaxHP%': 8 } });

// วัตถุดิบใหม่ (หายากที่สุดในเกม)
export const ETERNAL_MATS = {
  eternal_shard: { name: 'เศษนิรันดร์กาล', type: 'etc', keep: true, icon: ['crystal', '#ffe8ff'], rarity: 'eternal', price: 200000,
    desc: 'เศษผลึกที่ยังจำแสงของกาลเวลาไว้ได้ · ใช้หลอมอุปกรณ์นิรันดร์กาล · ดรอปยากมากจากมอน Sky Citadel และ MVP Lv.117+ · แลกได้ที่ร้านเหรียญผนึก' },
};

// สูตรหลอม (ใช้ทุกสายเหมือนกัน · ฐาน = อุปกรณ์เทพสวรรค์ช่องเดียวกัน)
export const ETERNAL_BASE = { blade: 'divine_sword', astral: 'divine_staff', gale: 'divine_bow', sanct: 'divine_staff' };
export const baseOf = (line, slot) => (slot === 'weapon' ? ETERNAL_BASE[line] : `divine_${slot}`);
export const ETERNAL_RECIPE = {
  weapon: { mats: [['eternal_shard', 20], ['seraph_halo', 5], ['crystal_heart', 5], ['leviathan_scale', 5], ['storm_core', 250], ['sky_feather', 300]], zeny: 50000000, rate: 0.15 },
  armor:  { mats: [['eternal_shard', 10], ['seraph_halo', 2], ['crystal_heart', 2], ['leviathan_scale', 2], ['storm_core', 120], ['sky_feather', 150]], zeny: 25000000, rate: 0.2 },
};
export const recipeOf = (slot) => (slot === 'weapon' ? ETERNAL_RECIPE.weapon : ETERNAL_RECIPE.armor);
export const LUCK_STEP = 0.1, LUCK_MAX = 2;   // หินนำโชคเพิ่มโอกาสครั้งละ 10% ใช้ได้สูงสุด 2 ก้อน

// แหล่งดรอปเศษนิรันดร์ (ผูกเข้าตารางดรอปใน maps/index.js)
export const SHARD_DROPS = { mapMobs: 'sky_citadel', normal: 0.0003, mvp: { aurelion: 0.03, crysthar: 0.02, tidalos: 0.01 } };
