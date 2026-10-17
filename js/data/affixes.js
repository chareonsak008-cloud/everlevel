// v0.25.0: สเตตัสรอง (ค่าสุ่ม) · ธาตุ/เผ่า/ขนาดมอนสเตอร์ · แปลงอาวุธจาก weapons.js เป็นไอเทมในเกม
import { WEAPON_DEFS, WEAPON_FORMS } from './weapons.js?v=0.40.5';
import { OFFHAND_BLOODMOON } from './offhand.js?v=0.40.5';

// ชื่อสเตตัสในสเปก → คีย์โบนัสในเกม (scale = ตัวคูณตอนแปลง)
export const STAT_DEF = {
  STR: { key: 'str' }, AGI: { key: 'agi' }, VIT: { key: 'vit' }, INT: { key: 'int' }, DEX: { key: 'dex' }, LUK: { key: 'luk' },
  ATK: { key: 'atk' }, MATK: { key: 'matk' }, atk: { key: 'atk' }, matk: { key: 'matk' }, 'ATK%': { key: 'atkPct' }, 'MATK%': { key: 'matkPct' },
  HIT: { key: 'hit' }, FLEE: { key: 'flee' }, DEF: { key: 'def' }, CRIT: { key: 'crit', scale: 0.01 }, 'CRIT DMG%': { key: 'critDmgPct' },
  'ASPD%': { key: 'aspdPct' }, 'Cast Time -%': { key: 'castPct' }, 'After-cast Delay -%': { key: 'delayPct' },
  MaxHP: { key: 'maxHp' }, 'MaxHP%': { key: 'maxHpPct' }, MaxSP: { key: 'maxSp' }, 'MaxSP%': { key: 'maxSpPct' },
  'HP Regen%': { key: 'regenPct' }, 'SP Regen%': { key: 'spRegenPct' }, 'Heal Power%': { key: 'healPct' },
  'Ranged DMG%': { key: 'rangedPct' }, 'Melee DMG%': { key: 'meleePct' }, 'ลดดาเมจรับ%': { key: 'dmgReduce' },
  'ดูดเลือด%': { key: 'lifesteal' }, 'ดูด SP%': { key: 'spDrain' }, Range: { key: 'rangeTiles' },
};
export const TRAIT_TH = {
  beast: 'สัตว์', plant: 'พืช', insect: 'แมลง', formless: 'ไร้รูป', undead: 'อันเดด', demon: 'ปีศาจ', dragon: 'มังกร',
  neutral: 'ไร้ธาตุ', earth: 'ดิน', water: 'น้ำ', fire: 'ไฟ', wind: 'ลม', holy: 'ศักดิ์สิทธิ์', shadow: 'มืด',
  small: 'ขนาดเล็ก', medium: 'ขนาดกลาง', large: 'ขนาดใหญ่',
};
export const ELEMENT_COLOR = { neutral: '#d8dde4', earth: '#c8a060', water: '#6ac8ff', fire: '#ff7a3a', wind: '#8affb0', holy: '#ffe08a', shadow: '#b48cff' };
export function statToBonus(stat, v, out = {}) {
  let key, val = v;
  if (stat.startsWith('DMG vs ')) key = 'vs_' + stat.slice(7);
  else { const d = STAT_DEF[stat]; if (!d) return out; key = d.key; val = v * (d.scale || 1); }
  out[key] = +(((out[key] || 0) + val).toFixed(4));
  return out;
}
export const statsToBonus = (o, out = {}) => { for (const [k, v] of Object.entries(o || {})) statToBonus(k, v, out); return out; };

// ---------- มอนสเตอร์: เผ่า / ธาตุ / ขนาด ----------
const T = (race, element, size) => ({ race, element, size });
export const MOB_TRAITS = {
  bloblet: T('formless', 'water', 'small'), capling: T('plant', 'earth', 'small'), stinglet: T('insect', 'wind', 'small'),
  thornback: T('beast', 'earth', 'small'), wisp: T('formless', 'holy', 'medium'), barkwolf: T('beast', 'earth', 'medium'), gnarlroot: T('plant', 'earth', 'large'),
  frostfox: T('beast', 'water', 'small'), frostbat: T('beast', 'water', 'medium'), yeti: T('beast', 'water', 'large'), icegolem: T('formless', 'water', 'large'), glacia: T('demon', 'water', 'large'),
  magmaslime: T('formless', 'fire', 'small'), emberimp: T('demon', 'fire', 'medium'), salamander: T('dragon', 'fire', 'small'), obsidiangolem: T('formless', 'earth', 'large'), ignarok: T('dragon', 'fire', 'large'),
  ruin_scarab: T('insect', 'earth', 'small'), sand_basilisk: T('dragon', 'earth', 'medium'), rune_sentinel: T('formless', 'neutral', 'large'), astral_wisp: T('formless', 'holy', 'medium'), relic_knight: T('undead', 'shadow', 'large'), aurex: T('formless', 'holy', 'large'),
  haunt_spider: T('insect', 'shadow', 'small'), hollow_wolf: T('undead', 'shadow', 'medium'), mourning_shade: T('undead', 'shadow', 'medium'), cursed_stag: T('beast', 'shadow', 'large'), eclipse_reaper: T('demon', 'shadow', 'large'), bloodmoon_knight: T('undead', 'shadow', 'large'), nocthar: T('demon', 'shadow', 'large'),
};
MOB_TRAITS.world_aurex = MOB_TRAITS.aurex; MOB_TRAITS.world_nocthar = MOB_TRAITS.nocthar;
export function mobTraits(type, data = {}) {
  return MOB_TRAITS[type] || T('formless', 'neutral', (data.height || 1) < 1 ? 'small' : (data.height || 1) < 1.8 ? 'medium' : 'large');
}
// ธาตุโจมตี → ธาตุเป้า: แพ้ทาง ×1.25 · ธาตุเดียวกัน ×0.75
const STRONG = { fire: ['earth'], water: ['fire'], wind: ['water'], earth: ['wind'], holy: ['shadow'], shadow: ['holy'] };
export function elementMul(atk, def, race) {
  if (!atk || atk === 'neutral') return 1;
  if ((STRONG[atk] || []).includes(def) || (atk === 'holy' && race === 'undead')) return 1.25;
  if (atk === def) return 0.75;
  return 1;
}
// ธาตุของสกิลเวท/สกิลกายภาพ (จากชื่อสกิล)
export function skillElement(id = '') {
  if (/flame|fire|meteor|phoenix|inferno|blast_trap/.test(id)) return 'fire';
  if (/frost|glacial/.test(id)) return 'water';
  if (/thunder|gale|wind|lightning|talon|falcon/.test(id)) return 'wind';
  if (/ground/.test(id)) return 'earth';
  if (/holy|divine|sanct|radiant|purge|seraph|heavens/.test(id)) return 'holy';
  return null;
}

// ---------- แปลงอาวุธเป็นไอเทม ----------
const ICON = { sword_1h: 'sword', sword_2h: 'sword', spear: 'sword', rod: 'staff', staff: 'staff', orb: 'staff', mace: 'mace', scepter: 'mace', book: 'mace', shortbow: 'bow', longbow: 'bow', crossbow: 'bow' };
export const FORM_TH = { sword_1h: 'ดาบมือเดียว', sword_2h: 'ดาบสองมือ', spear: 'หอก', rod: 'คทา', staff: 'ไม้เท้า', orb: 'ออร์บ', mace: 'กระบอง', scepter: 'คทาศักดิ์สิทธิ์', book: 'หนังสือ', shortbow: 'ธนูสั้น', longbow: 'ธนูยาว', crossbow: 'หน้าไม้', knife: 'มีด', sword: 'ดาบ', bow: 'ธนู' };
const TIERMUL = { common: 1, uncommon: 1.15, rare: 1.35, epic: 1.6, legend: 1.8, mythic: 2, celestial: 2.5 };
export const WEAPON_ITEMS = {};
for (const d of WEAPON_DEFS) if (d.set && d.set.id === 'bloodmoon') for (const id of OFFHAND_BLOODMOON) if (!d.set.pieces.includes(id)) d.set.pieces.push(id);   // v0.25.2: ของมือรองจันทร์โลหิตนับเป็นชิ้นเซ็ต
for (const d of WEAPON_DEFS) {
  const F = WEAPON_FORMS[d.type];
  const bonus = statsToBonus(d.fixed_stats, { atk: d.base.atk, ...(d.base.matk ? { matk: d.base.matk } : {}) });
  const jobs = [...d.class];
  if (d.req_level <= 5 && F.wtype === 'sword') jobs.unshift('novice');
  WEAPON_ITEMS[d.id] = {
    name: d.name_th, en: d.name_en, type: 'equip', slot: 'weapon', wtype: F.wtype, form: d.type, twoHand: F.twoHand, reach: F.reach,
    jobs, icon: [ICON[d.type], d.look.c1, d.look.c2], look: d.look, visual: { weapon: F.wtype },
    bonus, element: d.base.element, weight: d.base.weight, reqLevel: d.req_level, rarity: d.rarity, slots: d.slots,
    price: Math.round((60 + d.req_level * d.req_level * 14) * TIERMUL[d.rarity]),
    rolls: { pool: d.random_stats, count: d.random_count }, passive: d.passive, set: d.set, drops: d.drop,
    refinePer: statsToBonus(d.refine_per_level), refineSpec: d.refine_per_level, style: d.style, tradeoff: d.tradeoff, hybrid: d.hybrid,
    desc: d.description,
  };
}

// ---------- ค่าสุ่ม: เก็บในคีย์ไอเทมช่องที่ 4 เช่น 'wpn_sword_002*0**0a.3c' ('~' = สุ่มแล้วไม่ได้สักค่า) ----------
const b36 = (n) => n.toString(36);
export function rollCode(it, rnd = Math.random) {
  const R = it && it.rolls; if (!R) return '';
  const [lo, hi] = R.count;
  // ได้จำนวนน้อยบ่อยกว่า: ค่าสูงสุดของช่วงโอกาส 35%
  const n = Math.min(R.pool.length, lo + (hi > lo && rnd() < 0.35 ? hi - lo : 0));
  const idx = R.pool.map((_, i) => i).sort(() => rnd() - 0.5).slice(0, n).sort((a, b) => a - b);
  const parts = idx.map((i) => { const p = R.pool[i]; return b36(i) + b36(p.min + Math.floor(rnd() * (p.max - p.min + 1))); });
  return parts.length ? parts.join('.') : '~';
}
export function decodeRoll(it, code) {
  const out = [];
  if (!code || code === '~' || !it || !it.rolls) return out;
  for (const s of code.split('.')) {
    const p = it.rolls.pool[parseInt(s[0], 36)], v = parseInt(s.slice(1), 36);
    if (!p || !Number.isFinite(v) || v < p.min || v > p.max) return null;
    out.push({ stat: p.stat, value: v, min: p.min, max: p.max });
  }
  return out;
}
export const rollBonus = (rolls) => { const o = {}; for (const r of rolls || []) statToBonus(r.stat, r.value, o); return o; };

// ---------- โบนัสเซ็ต (อาวุธแดง + ชุดจันทร์โลหิต) ----------
export function setInfo(weapon, equip) {
  const s = weapon && weapon.set; if (!s) return null;
  const worn = Object.values(equip || {}).filter(Boolean).map((k) => String(k).split('*')[0]);
  const have = s.pieces.filter((p) => worn.includes(p)).length;
  const bonus = {};
  for (const [need, b] of Object.entries(s.bonus)) if (have >= +need) statsToBonus(b, bonus);
  return { name: s.name, have, total: s.pieces.length, tiers: s.bonus, bonus };
}
