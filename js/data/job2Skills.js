// v0.35 สกิลอาชีพขั้นที่ 2 — Wizard ชุดใหม่ (สไตล์อนิเมะ) · Knight/Hunter/Priest ชุด v0.31 (รูปแบบเดียวกับ skills.js)
// เอฟเฟกต์อยู่ใน render/Job2FX.js (vfx = ชื่อฟังก์ชัน fx_<ชื่อ>) · ดาเมจต่อฮิต = (ตัวคูณในเอฟเฟกต์ / ref) × mult(lv)
const pct = (x) => Math.round(x * 100);
const span = (lv, max, a, b) => Math.round(a + ((b - a) * (lv - 1)) / (max - 1));
const healBase = (lv, pl) => {
  const int = pl && pl.derived ? pl.derived.total.int : 1, base = pl ? pl.baseLevel : 1;
  return (Math.floor((base + int) / 8) + 1) * (4 + lv * 8);
};
const LONG = (pl) => pl && ['spear', 'sword_2h'].includes(pl.weaponForm);

export const JOB2_SKILLS = {
  /* ================= Knight · อัศวิน · v0.60 ชุดใหม่ "อัสนีราชันย์" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ================= */
  royal_oath: {
    job: 'knight', name: 'ปฏิญาณราชันย์', maxLv: 10, kind: 'passive', icon: ['shield', '#7ab4ff'],
    desc: 'คำสาบานของอัศวินผู้พิทักษ์ ร่างกายแข็งแกร่ง ทนทานกว่าใคร',
    effect: (lv) => `Max HP +${lv * 2}% · DEF +${lv * 2} · ดาเมจที่ได้รับ -${(lv * 0.5).toFixed(1)}%`,
    passive: (lv) => ({ maxHpPct: lv * 2, def: lv * 2, dmgReduce: lv * 0.5 }),
  },
  spear_art: {
    job: 'knight', name: 'ศิลปะหอก', maxLv: 10, kind: 'passive', icon: ['lance', '#9ac8ff'],
    desc: 'วิชาหอกและดาบใหญ่ของอัศวิน ใช้อาวุธอื่นได้โบนัสน้อยลง',
    effect: (lv) => `หอก/ดาบสองมือ: ATK +${lv * 6} · HIT +${lv * 2} (อาวุธอื่น ATK +${lv * 2})`,
    passive: (lv, pl) => (LONG(pl) ? { atkFlat: lv * 6, hit: lv * 2 } : { atkFlat: lv * 2 }),
  },
  thunder_thrust: {
    job: 'knight', name: 'แทงสายฟ้า', maxLv: 10, kind: 'active', target: 'enemy', icon: ['lance', '#5ab8ff'], req: { spear_art: 1 },
    sp: (lv) => 14 + lv, cast: 0, cd: 0.7, range: 'weapon', vfx: 'nf', ref: 1, lock: 0.5, delay: 0.35, engage: true, element: 'wind', hitBonus: (lv) => 10 + lv * 2,
    mult: (lv) => 0.75 + lv * 0.1, stun: (lv) => lv * 0.02, stunSecs: 1.5,
    nf: { anim: 'melee', hits: [{ t: 0.2, line: { len: 5, w: 1 }, m: 1 }, { t: 0.35, line: { len: 5, w: 1 }, m: 1 }, { t: 0.5, line: { len: 5, w: 1 }, m: 1, stun: 1.5, shake: 0.12 }] },
    desc: 'แทงหอกอัดสายฟ้า 3 ครั้งติด ทะลุทุกตัวในแนวยาว 5 ช่อง ครั้งสุดท้ายมีโอกาสทำให้มึน',
    effect: (lv) => `3 ครั้ง × ${pct(0.75 + lv * 0.1)}% ทุกตัวในแนว 5 ช่อง · มึน ${lv * 2}%`,
  },
  storm_rush: {
    job: 'knight', name: 'พายุบุกทะลวง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['steel', '#7ab4ff'], req: { thunder_thrust: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0, cd: 2.5, range: 7, dash: true, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.4, engage: true, element: 'wind', hitBonus: () => 25, knock: 2,
    mult: (lv) => 2 + lv * 0.22,
    nf: { anim: 'melee', hits: [{ t: 0.22, r: 2.2, m: 1, knock: 1, shake: 0.2 }] },
    desc: 'พุ่งเป็นสายฟ้าเข้าหาเป้าหมายไกล 7 ช่อง ฟ้าผ่าลงจุดชน ระเบิดรอบตัวและผลักศัตรูกระเด็น — ใช้ปิดระยะ',
    effect: (lv) => `${pct(2 + lv * 0.22)}% รอบจุดชน 2.2 ช่อง · พุ่ง 7 ช่อง · ผลักกระเด็น`,
  },
  judgement_wheel: {
    job: 'knight', name: 'วงล้อพิพากษา', maxLv: 10, kind: 'active', target: 'self', icon: ['cyclone', '#8ab8ff'], req: { thunder_thrust: 5 },
    sp: (lv) => 28 + lv * 2, cast: 0.2, cd: 2, vfx: 'nf', ref: 1, lock: 0.8, delay: 0.6, element: 'wind', hitBonus: () => 20, knock: 1.5,
    mult: (lv) => 1 + lv * 0.12,
    nf: { at: 'self', anim: 'spin', animDur: 0.7, hits: [{ t: 0.3, r: 3.8, m: 1 }, { t: 0.65, r: 3.8, m: 1, knock: 1, shake: 0.18 }] },
    desc: 'กวาดหอกเป็นวงล้อสายฟ้าสองชั้นบนดาวหกแฉก ฟันทุกตัวรอบตัว 2 ครั้ง แล้วสายฟ้าแตกทั่วพื้นผลักศัตรูออก',
    effect: (lv) => `2 ครั้ง × ${pct(1 + lv * 0.12)}% รอบตัว 3.8 ช่อง · ผลักกระเด็น`,
  },
  aegis_crown: {
    job: 'knight', name: 'มงกุฎโล่ราชันย์', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#5ae0e0'], req: { royal_oath: 3 },
    sp: 36, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ dmgReduce: 6 + lv, def: lv * 2, atkPct: lv }),
    desc: 'ผลึกราชันย์งอกล้อมรอบตัวแล้วรวมเป็นทรงกลมโล่หกเหลี่ยม ลดดาเมจที่ได้รับ เพิ่มพลังป้องกันและพลังโจมตี',
    effect: (lv) => `ดาเมจที่ได้รับ -${6 + lv}% · DEF +${lv * 2} · ATK +${lv}% นาน ${60 + lv * 6} วิ`,
  },
  sky_dragon_lance: {
    job: 'knight', name: 'หอกมังกรอัสนี', maxLv: 5, kind: 'active', target: 'enemy', icon: ['skysword', '#7a5aff'], req: { storm_rush: 5, judgement_wheel: 5 },
    sp: (lv) => 60 + lv * 4, cast: 0.5, cd: 10, range: 6, vfx: 'nf', ref: 1, lock: 1.2, delay: 1.0, element: 'wind', hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 4.4 + lv * 0.9,
    nf: { anim: 'castHold', hits: [{ t: 1.0, r: 3.2, m: 1, knock: 1, shake: 0.32 }, { t: 1.3, r: 3.4, m: 0.35, shake: 0.12 }] },
    desc: 'เมฆพายุก่อตัว มังกรอัสนีพุ่งขึ้นฟ้า แล้วหอกสายฟ้ายักษ์ปักลงกลางศัตรู เสาสายฟ้าและคลื่นกระแทกกวาดทั่ววง (ไม้ตาย)',
    effect: (lv) => `${pct(4.4 + lv * 0.9)}% รอบเป้า 3.2 ช่อง + คลื่นตาม ${pct((4.4 + lv * 0.9) * 0.35)}% · คูลดาวน์ 10 วิ`,
  },

  /* ================= Wizard · จอมเวท · v0.62 ชุดใหม่ "จอมเวทน้ำแข็ง" (ภาพ sprite sheet ที่ผู้พัฒนาออกแบบเอง) ================= */
  astral_insight: {
    job: 'wizard', name: 'ญาณเยือกแข็ง', maxLv: 10, kind: 'passive', icon: ['ice', '#9ad8ff'],
    desc: 'จิตใจเย็นเฉียบดั่งธารน้ำแข็ง เวทแรงขึ้น ร่ายเร็วขึ้น และต้านเวทได้ดีขึ้น',
    effect: (lv) => `MATK +${lv * 2}% · เวลาร่าย -${lv * 2}% · MDEF +${lv}`,
    passive: (lv) => ({ matkPct: lv * 2, castPct: lv * 2, mdef: lv }),
  },
  mana_wellspring: {
    job: 'wizard', name: 'บ่อน้ำมานา', maxLv: 10, kind: 'passive', icon: ['crystal', '#7ad8ff'],
    desc: 'มานาไหลเข้าร่างไม่ขาดสาย ใช้สกิลได้ถี่กว่าใคร',
    effect: (lv) => `Max SP +${lv * 3}% · ฟื้น SP +${lv * 10}% · ดีเลย์หลังร่าย -${lv}%`,
    passive: (lv) => ({ maxSpPct: lv * 3, spRegenPct: lv * 10, delayPct: lv }),
  },
  frost_shards: {
    job: 'wizard', name: 'เกล็ดน้ำแข็ง', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['ice', '#9ae8ff'], req: { astral_insight: 1 },
    sp: (lv) => 14 + lv * 2, cast: 0.3, cd: 0.8, range: 10, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.35, engage: true, element: 'water',
    mult: (lv) => 0.45 + lv * 0.06,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.58, m: 1 }, { t: 0.65, m: 1 }, { t: 0.75, m: 1 }, { t: 0.81, r: 1.2, m: 1 }, { t: 0.9, r: 1.4, m: 1, slow: { pct: 0.3, secs: 2 }, shake: 0.08 }] },
    desc: 'วงเวทใต้เท้าปล่อยเกล็ดน้ำแข็ง 5 ชิ้นพุ่งเป็นสายเข้าเป้า ชิ้นท้าย ๆ แตกกระจายโดนศัตรูข้างเป้าและทำให้ช้าลง — สกิลโจมตีหลัก',
    effect: (lv) => `5 ชิ้น × ${pct(0.45 + lv * 0.06)}% MATK (รวม ${pct((0.45 + lv * 0.06) * 5)}%) · ช้าลง 30% 2 วิ`,
  },
  glacier_spike: {
    job: 'wizard', name: 'หนามธารน้ำแข็ง', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['crystal', '#7fd0ff'], req: { frost_shards: 3 },
    sp: (lv) => 26 + lv * 2, cast: 0.5, cd: 3, range: 10, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'water', knock: 1,
    mult: (lv) => 2 + lv * 0.22, freeze: (lv) => 0.4 + lv * 0.04, freezeSecs: (lv) => 1.5 + lv * 0.15,
    nf: { magic: true, anim: 'cast', flashes: [{ t: 0.33, a: 0.3 }], hits: [{ t: 0.33, r: 2.4, m: 1, knock: 1, freeze: 2, shake: 0.4 }] },
    desc: 'วงเวทเปิดใต้เป้า หนามธารน้ำแข็งพุ่งทะลุพื้นทั่ววง ศัตรูกระเด็นและมีโอกาสถูกแช่แข็ง',
    effect: (lv) => `${pct(2 + lv * 0.22)}% MATK รอบเป้า 2.4 ช่อง · แช่แข็ง ${40 + lv * 4}% นาน ${(1.5 + lv * 0.15).toFixed(1)} วิ`,
  },
  blizzard_vortex: {
    job: 'wizard', name: 'พายุหิมะหมุน', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['snow', '#bfeeff'], req: { frost_shards: 3 },
    sp: (lv) => 36 + lv * 3, cast: 0.8, cd: 6, range: 10, vfx: 'nf', ref: 1, lock: 0.9, delay: 0.7, element: 'water', knock: 1.5,
    mult: (lv) => 0.4 + lv * 0.05, freeze: (lv) => 0.5 + lv * 0.04, freezeSecs: 2,
    nf: { magic: true, anim: 'castHold', pull: { from: 0.2, to: 2.1, r: 3.6, step: 3 }, flashes: [{ t: 2.21, a: 0.25 }], hits: [{ t: 0.15, r: 3, m: 1, slow: { pct: 0.5, secs: 3 } }, { t: 0.6, r: 3, m: 1 }, { t: 1.05, r: 3, m: 1 }, { t: 1.5, r: 3, m: 1 }, { t: 1.9, r: 3, m: 1 }, { t: 2.21, r: 3.2, m: 3, knock: 1, freeze: 2, shake: 0.35 }] },
    desc: 'พายุหิมะหมุนวนกลางวงเวท ดูดศัตรูรอบ ๆ เข้าหาจุดกลางและบาดลึก 5 ครั้ง แล้วระเบิดผลักกระเด็น มีโอกาสแช่แข็งทั้งวง',
    effect: (lv) => `ดูด 3.6 ช่อง · 5 × ${pct(0.4 + lv * 0.05)}% + ระเบิด ${pct((0.4 + lv * 0.05) * 3)}% MATK รอบเป้า 3 ช่อง · ช้าลง 50% · แช่แข็ง ${50 + lv * 4}%`,
  },
  frost_armor: {
    job: 'wizard', name: 'เกราะน้ำแข็ง', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#9ad8ff'], req: { mana_wellspring: 3 },
    sp: 45, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.4,
    nf: { at: 'self', anim: 'cast', flashes: [{ t: 0.11, a: 0.15 }] },
    duration: (lv) => 60 + lv * 12, bonus: (lv) => ({ dmgReduce: 6 + lv * 1.5, mdef: lv * 3, def: lv * 2, castPct: 5 + lv * 2, matkPct: lv }),
    desc: 'ผลึกน้ำแข็งงอกเป็นมงกุฎรอบเท้าแล้วปิดเป็นโดมเกราะ ลดดาเมจที่ได้รับ เพิ่มพลังป้องกัน ร่ายเร็วขึ้น และเวทแรงขึ้น',
    effect: (lv) => `ดาเมจที่ได้รับ -${(6 + lv * 1.5).toFixed(1)}% · DEF +${lv * 2} · MDEF +${lv * 3} · ร่าย -${5 + lv * 2}% · MATK +${lv}% นาน ${60 + lv * 12} วิ`,
  },
  absolute_zero: {
    job: 'wizard', name: 'ศูนย์องศาสัมบูรณ์', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['snow', '#7fd0ff'], req: { glacier_spike: 5, blizzard_vortex: 5 },
    sp: (lv) => 95 + lv * 6, cast: (lv) => 1.8 - lv * 0.15, cd: 12, range: 10, vfx: 'nf', ref: 1, lock: 1.6, delay: 1.4, element: 'water', knock: 2,
    mult: (lv) => 1 + lv * 0.18, freeze: () => 1, freezeSecs: (lv) => 2.5 + lv * 0.3,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.5, dur: 4.4 }, flashes: [{ t: 2.46, a: 0.9 }], hits: [{ t: 0.75, r: 4, m: 1, slow: { pct: 0.6, secs: 4 } }, { t: 1.25, r: 4, m: 1, shake: 0.06 }, { t: 1.7, r: 4, m: 1, shake: 0.15 }, { t: 2.1, r: 4, m: 1, shake: 0.25 }, { t: 2.46, r: 4.6, m: 4.5, knock: 1, freeze: 3, shake: 1 }] },
    desc: 'ฟ้ามืดลง วงเวทยักษ์เปิดใต้ศัตรู ผลึกน้ำแข็งงอกขึ้นทั่ววงทีละชั้นจนกลายเป็นป่าน้ำแข็ง แล้วทุกอย่างแตกพร้อมกันในแสงขาว แช่แข็งศัตรูทั้งวง (ไม้ตาย)',
    effect: (lv) => `4 × ${pct(1 + lv * 0.18)}% + ระเบิด ${pct((1 + lv * 0.18) * 4.5)}% MATK รอบเป้า 4–4.6 ช่อง · แช่แข็งแน่นอน ${(2.5 + lv * 0.3).toFixed(1)} วิ · คูลดาวน์ 12 วิ`,
  },

  /* ================= Hunter · นักล่า · v0.60 ชุดใหม่ "เหยี่ยวเงา" ================= */
  hunter_sense: {
    job: 'hunter', name: 'ประสาทนักล่า', maxLv: 10, kind: 'passive', icon: ['eye', '#6ad08a'],
    desc: 'สัมผัสของนักล่าที่ไม่พลาดเหยื่อ เพิ่ม DEX AGI และคริติคอล',
    effect: (lv) => `DEX/AGI +${Math.ceil(lv / 2)} · คริ +${(lv * 0.5).toFixed(1)}% · คริดาเมจ +${lv * 2}%`,
    passive: (lv) => ({ dex: Math.ceil(lv / 2), agi: Math.ceil(lv / 2), crit: lv * 0.005, critDmgPct: lv * 2 }),
  },
  hawk_bond: {
    job: 'hunter', name: 'พันธะสายลม', maxLv: 10, kind: 'passive', icon: ['gale', '#8ae0a8'], req: { hunter_sense: 1 },
    desc: 'สายลมคอยหนุนลูกศรทุกดอก เพิ่มพลังโจมตีระยะไกลและระยะยิง',
    effect: (lv) => `ดาเมจระยะไกล +${lv * 2}% · HIT +${lv * 2} · ระยะยิง +${(lv * 0.2).toFixed(1)} ช่อง`,
    passive: (lv) => ({ rangedPct: lv * 2, hit: lv * 2, rangeTiles: lv * 0.2 }),
  },
  double_shot: {
    job: 'hunter', name: 'ศรคู่สายลม', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['arrow2', '#6ae0b0'], req: { hawk_bond: 1 },
    sp: (lv) => 12 + lv, cast: 0, cd: 0.6, range: 10, vfx: 'nf', ref: 1, lock: 0.45, delay: 0.3, engage: true, element: 'wind', hitBonus: (lv) => 10 + lv * 3,
    mult: (lv) => 0.95 + lv * 0.13,
    nf: { anim: 'shoot', hits: [{ t: 0.38, m: 1 }, { t: 0.56, r: 1.4, m: 1, shake: 0.1 }] },
    desc: 'ปล่อยศรเกลียวลม 2 ดอกติดกัน ดอกที่สองระเบิดแฉกลมโดนศัตรูข้างเป้า — สกิลยิงหลักของนักล่า',
    effect: (lv) => `2 ดอก × ${pct(0.95 + lv * 0.13)}% ATK (ดอกที่ 2 โดนรอบเป้า 1.4 ช่อง) · HIT +${10 + lv * 3}`,
  },
  gale_rift_arrow: {
    job: 'hunter', name: 'ศรพายุแยกพสุธา', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['lance', '#3ac0a0'], req: { double_shot: 3 },
    sp: (lv) => 24 + lv * 2, cast: 0.3, cd: 4, range: 10, vfx: 'nf', ref: 1, lock: 0.9, delay: 0.5, element: 'wind', hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 1.2 + lv * 0.14,
    nf: { anim: 'shoot', animDur: 0.7, hits: [{ t: 0.85, line: { len: 11, w: 1 }, m: 1, slow: { pct: 0.4, secs: 3 } }, { t: 1.05, r: 2.4, m: 1.4, knock: 1, shake: 0.22 }] },
    desc: 'รวมพลังลมรอบตัวแล้วยิงศรพายุ พื้นแยกตามแนวทะลุทุกตัวที่ขวางทาง จากนั้นลมหมุนระเบิดที่เป้า ผลักศัตรูกระเด็นและช้าลง',
    effect: (lv) => `${pct(1.2 + lv * 0.14)}% ทุกตัวในแนว 11 ช่อง + ระเบิด ${pct((1.2 + lv * 0.14) * 1.4)}% รอบเป้า 2.4 ช่อง · ช้าลง 40% 3 วิ`,
  },
  cyclone_trap: {
    job: 'hunter', name: 'กับดักพายุหมุน', maxLv: 10, kind: 'active', target: 'enemy', icon: ['trap', '#4ae0b0'], req: { hawk_bond: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0.2, cd: 6, range: 9, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.5, element: 'wind', hitBonus: () => 30,
    mult: (lv) => 0.45 + lv * 0.06, stun: () => 1, stunSecs: (lv) => 1.2 + lv * 0.12,
    nf: { anim: 'cast', pull: { from: 0.25, to: 1.3, r: 3.2, step: 3.5 }, hits: [{ t: 0.35, r: 2.4, m: 1, slow: { pct: 0.5, secs: 2 } }, { t: 0.65, r: 2.4, m: 1 }, { t: 0.95, r: 2.4, m: 1 }, { t: 1.3, r: 2.6, m: 1.5, stun: 1, shake: 0.14 }] },
    desc: 'โยนกับดักลงใต้เป้า พายุหมุนพร้อมใบไม้ดูดศัตรูรอบ ๆ เข้ากลางวง ตี 4 ครั้งแล้วรัดจนมึน — ใช้รวมฝูงก่อนยิงไม้ตาย',
    effect: (lv) => `ดูด 3 ช่อง · 3 × ${pct(0.45 + lv * 0.06)}% + ${pct((0.45 + lv * 0.06) * 1.5)}% ATK รอบเป้า 2.4 ช่อง · มึน ${(1.2 + lv * 0.12).toFixed(1)} วิ`,
  },
  tailwind_step: {
    job: 'hunter', name: 'ก้าวลมส่ง', maxLv: 10, kind: 'active', target: 'self', icon: ['wing', '#9ae8c8'], req: { hunter_sense: 3 },
    sp: 20, cast: 0, cd: 6, vfx: 'nf', lock: 0.3, delay: 0.2,
    nf: { at: 'self', anim: 'jump', dash: { t: 0, dist: 4.5, dur: 0.25, back: true } },
    duration: (lv) => 8 + lv, bonus: (lv) => ({ speedPct: 20 + lv * 2, flee: 10 + lv * 3, aspdPct: 5 + lv }),
    desc: 'กระโดดถอยหลังไปกับสายลม (หนีออกจากศัตรูที่ใกล้ที่สุด) แล้วได้ลมส่งท้าย เดินเร็ว หลบเก่ง และยิงเร็วขึ้นชั่วครู่ — สกิลเคลื่อนที่',
    effect: (lv) => `กระโดดถอย ~3 ช่อง · ความเร็ว +${20 + lv * 2}% · FLEE +${10 + lv * 3} · ASPD +${5 + lv}% นาน ${8 + lv} วิ · คูลดาวน์ 6 วิ`,
  },
  storm_king_volley: {
    job: 'hunter', name: 'ห่าศรราชันพายุ', maxLv: 5, kind: 'active', target: 'enemy', bow: true, icon: ['rain', '#3ae0a0'], req: { gale_rift_arrow: 5, cyclone_trap: 5 },
    sp: (lv) => 65 + lv * 5, cast: 0.6, cd: 11, range: 10, vfx: 'nf', ref: 1, lock: 1.2, delay: 1.0, element: 'wind', hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 1.1 + lv * 0.2, stun: () => 0.6, stunSecs: 1.6,
    nf: { anim: 'shoot', animDur: 0.6, pull: { from: 0.4, to: 2.3, r: 4, step: 3 }, hits: [{ t: 0.55, r: 3, m: 1 }, { t: 0.85, r: 3, m: 1 }, { t: 1.17, r: 3, m: 1 }, { t: 1.5, r: 3, m: 1 }, { t: 1.85, r: 3, m: 1 }, { t: 2.47, r: 3.4, m: 3.4, knock: 1, stun: 1, shake: 0.4 }] },
    desc: 'ยิงศรขึ้นฟ้า โดมลมและพายุหมุนดูดศัตรูเข้ากลางวง ห่าศร 2 ระลอกเทลงถล่ม แล้วเสาพายุจากฟ้ากระแทกลง ระเบิดสายฟ้าผลักทุกอย่างกระเด็น (ไม้ตาย)',
    effect: (lv) => `ดูด 4 ช่อง · 5 × ${pct(1.1 + lv * 0.2)}% + เสาพายุ ${pct((1.1 + lv * 0.2) * 3.4)}% ATK รอบเป้า 3–3.4 ช่อง · มึน 60% · คูลดาวน์ 11 วิ`,
  },

  /* ================= Priest · นักบวชชั้นสูง · v0.60 ชุดใหม่ "เทวทูตทองคำ" (ภาพ Night Forge · ดาเมจ/ฮีลตามจังหวะใน sk.nf) ================= */
  seraph_grace: {
    job: 'priest', name: 'พระคุณเทวทูต', maxLv: 10, kind: 'passive', icon: ['sun', '#ffe9a0'],
    desc: 'ได้รับพรจากเทวทูต พลังรักษาและพลังเวทศักดิ์สิทธิ์แรงขึ้นมาก',
    effect: (lv) => `พลังรักษา +${lv * 4}% · MATK +${lv}% · Max SP +${lv * 2}%`,
    passive: (lv) => ({ healPct: lv * 4, matkPct: lv, maxSpPct: lv * 2 }),
  },
  halo_ward: {
    job: 'priest', name: 'รัศมีพิทักษ์', maxLv: 10, kind: 'passive', icon: ['barrier', '#fff2c0'],
    desc: 'รัศมีแสงที่มองไม่เห็นห่อหุ้มร่าง ลดดาเมจที่ได้รับและสะท้อนกลับบางส่วน',
    effect: (lv) => `ดาเมจที่ได้รับ -${lv}% · MDEF +${lv * 2} · Max HP +${Math.round(lv * 1.5)}% · สะท้อน ${lv}%`,
    passive: (lv) => ({ dmgReduce: lv, mdef: lv * 2, maxHpPct: Math.round(lv * 1.5), reflectPct: lv }),
  },
  lotus_renewal: {
    job: 'priest', name: 'บัวฟื้นชีพ', maxLv: 10, kind: 'active', target: 'self', icon: ['heart', '#7aff9a'], req: { seraph_grace: 1 },
    sp: (lv) => 30 + lv * 4, cast: 0.4, cd: 1.5, vfx: 'nf', lock: 0.6, delay: 0.4,
    heal: (lv, pl) => Math.round(healBase(lv, pl) * 1.4),
    nf: { at: 'self', anim: 'cast', heals: [0.45, 1.1] },
    desc: 'ดอกบัวทองบานใต้เท้า กลีบแสงโปรยลงมา ฟื้นฟูบาดแผลมหาศาล 2 ครั้งติด',
    effect: (lv, pl) => `ฟื้น HP ${Math.round(healBase(lv, pl) * 1.4)} × 2`,
  },
  aegis_of_light: {
    job: 'priest', name: 'ปราการแสงสวรรค์', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#fff2a0'], req: { halo_ward: 3 },
    sp: (lv) => 40 + lv * 2, cast: 0, cd: 15, vfx: 'nf', lock: 0.7, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 30 + lv * 4, bonus: (lv) => ({ dmgReduce: 12 + Math.round(lv * 1.8), def: lv * 2, mdef: lv * 3, healPct: lv * 2 }),
    desc: 'ม่านแสงทองพุ่งขึ้นแล้วรวมเป็นโดมเกราะล้อมตัว ป้องกันดาเมจได้มากและเพิ่มพลังรักษา (คูลดาวน์ 15 วิ)',
    effect: (lv) => `ดาเมจที่ได้รับ -${12 + Math.round(lv * 1.8)}% · DEF +${lv * 2} · MDEF +${lv * 3} · พลังรักษา +${lv * 2}% นาน ${30 + lv * 4} วิ`,
  },
  judgement_blades: {
    job: 'priest', name: 'ดาบพิพากษาสวรรค์', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['spears', '#fff2a0'], req: { seraph_grace: 3 },
    sp: (lv) => 26 + lv * 3, cast: 0.6, cd: 2.5, range: 8, vfx: 'nf', ref: 1, lock: 0.7, delay: 0.6, element: 'holy',
    mult: (lv) => 0.6 + lv * 0.08, stun: () => 1, stunSecs: (lv) => 1 + lv * 0.1,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.45, r: 2.4, m: 1 }, { t: 0.61, r: 2.4, m: 1 }, { t: 0.77, r: 2.4, m: 1 }, { t: 1.3, r: 2.6, m: 2.4, stun: 1, shake: 0.24 }] },
    desc: 'ดาบแสง 5 เล่มปักรอบเป้าทีละเล่ม แล้วดาบใหญ่ตกจากฟ้าปักกลางวง พื้นแตกเป็นรอยแสง ศัตรูรอบ ๆ มึนงง',
    effect: (lv) => `3 × ${pct(0.6 + lv * 0.08)}% + ดาบใหญ่ ${pct((0.6 + lv * 0.08) * 2.4)}% MATK รอบเป้า 2.6 ช่อง · มึน ${(1 + lv * 0.1).toFixed(1)} วิ`,
  },
  purifying_dawn: {
    job: 'priest', name: 'อรุณชำระบาป', maxLv: 10, kind: 'active', target: 'self', magic: true, icon: ['sanctum', '#ffe08a'], req: { lotus_renewal: 3 },
    sp: (lv) => 32 + lv * 2, cast: 0.6, cd: 4, vfx: 'nf', ref: 1, lock: 0.8, delay: 0.7, element: 'holy',
    mult: (lv) => 0.9 + lv * 0.09, heal: (lv, pl) => Math.round(healBase(lv, pl) * 0.3),
    nf: { at: 'self', magic: true, anim: 'castHold', hits: [{ t: 0.6, r: 3.4, m: 1 }, { t: 1.4, r: 3.4, m: 1 }, { t: 2.2, r: 3.4, m: 1, shake: 0.12 }], heals: [0.6, 1.4, 2.2] },
    desc: 'ลำแสงอรุณสาดลงรอบตัว คลื่นแสง 3 ระลอกแผดเผาศัตรูในวงกว้าง 3.4 ช่อง และฟื้น HP ทุกระลอก',
    effect: (lv, pl) => `3 ระลอก × ${pct(0.9 + lv * 0.09)}% MATK รอบตัว 3.4 ช่อง · ฟื้น HP ${Math.round(healBase(lv, pl) * 0.3)} × 3`,
  },
  seraph_judgement: {
    job: 'priest', name: 'พิพากษาเทวทูต', maxLv: 5, kind: 'active', target: 'self', magic: true, icon: ['angel', '#ffd36b'], req: { judgement_blades: 5, aegis_of_light: 3 },
    sp: (lv) => 90 + lv * 6, cast: 1.5, cd: 14, vfx: 'nf', ref: 1, lock: 1.4, delay: 1.2, element: 'holy', knock: 1.5,
    mult: (lv) => 1 + lv * 0.18, heal: (lv, pl) => Math.round(healBase(10, pl) * (1.5 + lv * 0.3)),
    duration: () => 60, bonus: (lv) => ({ str: 4 + lv, int: 4 + lv, dex: 4 + lv, matkPct: lv * 2, healPct: lv * 3 }),
    nf: { at: 'self', magic: true, anim: 'castHold', sky: { t: 0, dark: 0.5, dur: 4 }, lift: { t: 0.2, h: 0.8, dur: 0.5, hold: 2.8 }, hits: [{ t: 0.8, r: 3.6, m: 1 }, { t: 1.3, r: 3.6, m: 1 }, { t: 1.8, r: 3.6, m: 1 }, { t: 2.3, r: 3.6, m: 1 }, { t: 3.05, r: 4.2, m: 3.6, knock: 1, shake: 0.4 }], heals: [3.1] },
    desc: 'ฟ้ามืดลง นักบวชลอยขึ้นพร้อมวงแหวนเทวทูต ลำแสงพิพากษาฟาดศัตรูรอบตัว 4 ระลอก แล้วเสาแสงสวรรค์กระแทกลง ฟื้น HP และอวยพรพลัง (ไม้ตาย)',
    effect: (lv, pl) => `4 × ${pct(1 + lv * 0.18)}% + เสาแสง ${pct((1 + lv * 0.18) * 3.6)}% รอบตัว 3.6–4.2 ช่อง · ฟื้น HP ${Math.round(healBase(10, pl) * (1.5 + lv * 0.3))} · STR/INT/DEX +${4 + lv} 60 วิ`,
  },
};

// สกิล Wizard ชุด v0.31 ที่ถูกแทนที่ — ตอนโหลดเซฟจะคืนแต้มสกิลให้
export const LEGACY_JOB2 = ['elemental_mastery', 'mana_tide', 'inferno_pillars', 'glacial_prison', 'arcane_haste'];   // v0.60: chain_lightning / starfall_cataclysm กลับมาเป็นสกิลจริงแล้ว
