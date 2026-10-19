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

  /* ================= Wizard · จอมเวทดารา · v0.60 ชุดใหม่ "วันสิ้นดารา" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ================= */
  astral_insight: {
    job: 'wizard', name: 'ญาณแห่งดวงดาว', maxLv: 10, kind: 'passive', icon: ['orb', '#c89aff'],
    desc: 'อ่านการโคจรของดวงดาว เวทแรงขึ้น ร่ายเร็วขึ้น และต้านเวทได้ดีขึ้น',
    effect: (lv) => `MATK +${lv * 2}% · เวลาร่าย -${lv * 2}% · MDEF +${lv}`,
    passive: (lv) => ({ matkPct: lv * 2, castPct: lv * 2, mdef: lv }),
  },
  mana_wellspring: {
    job: 'wizard', name: 'บ่อน้ำมานา', maxLv: 10, kind: 'passive', icon: ['crystal', '#7ad8ff'],
    desc: 'มานาไหลเข้าร่างไม่ขาดสาย ใช้สกิลได้ถี่กว่าใคร',
    effect: (lv) => `Max SP +${lv * 3}% · ฟื้น SP +${lv * 10}% · ดีเลย์หลังร่าย -${lv}%`,
    passive: (lv) => ({ maxSpPct: lv * 3, spRegenPct: lv * 10, delayPct: lv }),
  },
  comet_strike: {
    job: 'wizard', name: 'ดาวหางกระหน่ำ', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['comet', '#b090ff'], req: { astral_insight: 1 },
    sp: (lv) => 16 + lv * 2, cast: 0.3, cd: 0.8, range: 10, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.35, engage: true, element: 'fire',
    mult: (lv) => 1.4 + lv * 0.16,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.4, r: 1.6, m: 1, shake: 0.12 }, { t: 0.65, r: 2, m: 0.45 }] },
    desc: 'เรียกดาวหางม่วงพุ่งลงจากฟ้ากระแทกเป้า ระเบิดเป็นวงไฟดาราลามศัตรูข้าง ๆ — สกิลโจมตีหลักของจอมเวท',
    effect: (lv) => `${pct(1.4 + lv * 0.16)}% + คลื่น ${pct((1.4 + lv * 0.16) * 0.45)}% MATK รอบเป้า 1.6–2 ช่อง`,
  },
  black_hole: {
    job: 'wizard', name: 'หลุมดำกลืนกิน', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['eye', '#6a40d0'], req: { comet_strike: 3 },
    sp: (lv) => 34 + lv * 3, cast: 0.8, cd: 6, range: 10, vfx: 'nf', ref: 1, lock: 0.9, delay: 0.7, element: 'shadow', knock: 1.8,
    mult: (lv) => 0.45 + lv * 0.05,
    nf: { magic: true, anim: 'castHold', pull: { from: 0.4, to: 2.4, r: 4, step: 4.5 }, hits: [{ t: 0.8, r: 2.6, m: 1, slow: { pct: 0.5, secs: 3 } }, { t: 1.3, r: 2.6, m: 1 }, { t: 1.8, r: 2.6, m: 1 }, { t: 2.3, r: 2.6, m: 1 }, { t: 2.75, r: 3.4, m: 3.2, knock: 1, shake: 0.3 }] },
    desc: 'เปิดหลุมดำเหนือเป้า ดูดศัตรูในระยะ 4 ช่องเข้าหาจุดกลางพร้อมบดขยี้ 4 ระลอก แล้วยุบตัวระเบิดผลักทุกอย่างกระเด็น',
    effect: (lv) => `ดูด 4 × ${pct(0.45 + lv * 0.05)}% + ยุบตัว ${pct((0.45 + lv * 0.05) * 3.2)}% MATK · ดูดไกล 4 ช่อง · ช้าลง 50%`,
  },
  astral_blades: {
    job: 'wizard', name: 'ดาบดาราโคจร', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['spears', '#d0b8ff'], req: { comet_strike: 3 },
    sp: (lv) => 26 + lv * 2, cast: 0.4, cd: 3, range: 9, vfx: 'nf', ref: 1, lock: 0.8, delay: 0.5, element: 'holy',
    mult: (lv) => 0.55 + lv * 0.07, stun: () => 1, stunSecs: (lv) => 1 + lv * 0.1,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.4, m: 1 }, { t: 0.6, m: 1 }, { t: 0.8, m: 1 }, { t: 1.0, m: 1 }, { t: 1.5, r: 2.4, m: 2.2, stun: 1, shake: 0.22 }] },
    desc: 'ดาบแสง 4 เล่มโคจรรอบตัวแล้วพุ่งปักเป้าทีละเล่ม ปิดท้ายด้วยดาบใหญ่ตกจากฟ้าปักกลางวง ทำให้ศัตรูรอบ ๆ มึนงง',
    effect: (lv) => `4 เล่ม × ${pct(0.55 + lv * 0.07)}% + ดาบใหญ่ ${pct((0.55 + lv * 0.07) * 2.2)}% MATK รอบเป้า 2.4 ช่อง · มึน ${(1 + lv * 0.1).toFixed(1)} วิ`,
  },
  astral_ascension: {
    job: 'wizard', name: 'ร่างเทพดารา', maxLv: 10, kind: 'active', target: 'self', icon: ['angel', '#e0c8ff'], req: { mana_wellspring: 3 },
    sp: 45, cast: 0, cd: 1, vfx: 'nf', lock: 0.8, delay: 0.5,
    nf: { at: 'self', anim: 'cast', lift: { t: 0.2, h: 0.9, dur: 0.6, hold: 1.2 } },
    duration: (lv) => 60 + lv * 12, bonus: (lv) => ({ castPct: 10 + lv * 3, matkPct: 3 + lv * 1.5, dmgReduce: 3 + lv, spRegenPct: lv * 5, hover: 1 }),
    desc: 'ปีกแสงดารากางออก ร่างลอยเหนือพื้นตลอดบัฟ ร่ายเร็วขึ้น เวทแรงขึ้น ทนทานขึ้น และมานาฟื้นเร็วขึ้น',
    effect: (lv) => `ร่าย -${10 + lv * 3}% · MATK +${(3 + lv * 1.5).toFixed(1)}% · ดาเมจที่ได้รับ -${3 + lv}% · ฟื้น SP +${lv * 5}% · ลอยตัว นาน ${60 + lv * 12} วิ`,
  },
  starfall_cataclysm: {
    job: 'wizard', name: 'วันสิ้นดารา', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['meteor', '#b07aff'], req: { black_hole: 5, astral_blades: 5 },
    sp: (lv) => 95 + lv * 6, cast: (lv) => 2.0 - lv * 0.15, cd: 12, range: 10, vfx: 'nf', ref: 1, lock: 1.8, delay: 1.5, element: 'holy', knock: 2,
    mult: (lv) => 1.1 + lv * 0.2,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.7, dur: 4 }, lift: { t: 0, h: 0.7, dur: 0.5, hold: 3 }, hits: [{ t: 0.6, r: 3.6, m: 1, shake: 0.1 }, { t: 1.0, r: 3.6, m: 1, shake: 0.1 }, { t: 1.4, r: 3.6, m: 1, shake: 0.1 }, { t: 1.8, r: 3.6, m: 1, shake: 0.1 }, { t: 2.2, r: 3.6, m: 1, shake: 0.1 }, { t: 2.6, r: 3.6, m: 1, shake: 0.1 }, { t: 3.2, r: 4.5, m: 4.5, knock: 1, shake: 0.4 }] },
    desc: 'ฟ้ามืดมิด จอมเวทลอยขึ้น ดาวตก 6 ระลอกถล่มทั่ววงกว้าง แล้วดาราดวงสุดท้ายพุ่งลงกลางวง ระเบิดเป็นแสงขาว-ม่วงเต็มจอ (ไม้ตาย)',
    effect: (lv) => `6 × ${pct(1.1 + lv * 0.2)}% + ระเบิด ${pct((1.1 + lv * 0.2) * 4.5)}% MATK รอบเป้า 3.6–4.5 ช่อง · คูลดาวน์ 12 วิ`,
  },

  /* ================= Hunter · นักล่า · v0.60 ชุดใหม่ "เหยี่ยวเงา" ================= */
  hunter_sense: {
    job: 'hunter', name: 'ประสาทนักล่า', maxLv: 10, kind: 'passive', icon: ['eye', '#6ad08a'],
    desc: 'สัมผัสของนักล่าที่ไม่พลาดเหยื่อ เพิ่ม DEX AGI และคริติคอล',
    effect: (lv) => `DEX/AGI +${Math.ceil(lv / 2)} · คริ +${(lv * 0.5).toFixed(1)}% · คริดาเมจ +${lv * 2}%`,
    passive: (lv) => ({ dex: Math.ceil(lv / 2), agi: Math.ceil(lv / 2), crit: lv * 0.005, critDmgPct: lv * 2 }),
  },
  hawk_bond: {
    job: 'hunter', name: 'พันธะเหยี่ยว', maxLv: 10, kind: 'passive', icon: ['wing', '#8ae0a8'], req: { hunter_sense: 1 },
    desc: 'เหยี่ยวคู่ใจบินเคียงข้าง เพิ่มพลังโจมตีระยะไกลและระยะยิง',
    effect: (lv) => `ดาเมจระยะไกล +${lv * 2}% · HIT +${lv * 2} · ระยะยิง +${(lv * 0.2).toFixed(1)} ช่อง`,
    passive: (lv) => ({ rangedPct: lv * 2, hit: lv * 2, rangeTiles: lv * 0.2 }),
  },
  shadow_hawk: {
    job: 'hunter', name: 'เหยี่ยวเงาโฉบ', maxLv: 10, kind: 'active', target: 'enemy', icon: ['hawk', '#9a7aff'], req: { hawk_bond: 1 },
    sp: (lv) => 14 + lv, cast: 0, cd: 0.8, range: 9, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.35, engage: true, element: 'shadow', hitBonus: (lv) => 10 + lv * 2,
    mult: (lv) => 0.7 + lv * 0.1,
    nf: { anim: 'shoot', hits: [{ t: 0.2, r: 1.4, m: 1 }, { t: 0.55, r: 1.4, m: 1 }, { t: 0.9, r: 1.6, m: 1.3, shake: 0.12 }] },
    desc: 'สั่งเหยี่ยวเงาโฉบตะปบศัตรู 3 ครั้งติด ครั้งสุดท้ายกรงเล็บใหญ่โดนรอบเป้า — สกิลโจมตีหลัก',
    effect: (lv) => `2 × ${pct(0.7 + lv * 0.1)}% + ${pct((0.7 + lv * 0.1) * 1.3)}% รอบเป้า 1.6 ช่อง`,
  },
  meteor_trap: {
    job: 'hunter', name: 'กับดักอุกกาบาต', maxLv: 10, kind: 'active', target: 'enemy', icon: ['trap', '#ff6a2a'], req: { shadow_hawk: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0.2, cd: 4, range: 9, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.5, element: 'fire', hitBonus: () => 25, knock: 1.5,
    mult: (lv) => 2 + lv * 0.22,
    nf: { hits: [{ t: 0.65, r: 2.6, m: 1, knock: 1, shake: 0.25 }] },
    desc: 'วางตราสามเหลี่ยมเรียกอุกกาบาตตกใส่เป้า ระเบิดไฟ พื้นแตก ผลักศัตรูกระเด็น',
    effect: (lv) => `${pct(2 + lv * 0.22)}% รอบเป้า 2.6 ช่อง · ผลักกระเด็น`,
  },
  crystal_scatter: {
    job: 'hunter', name: 'ศรผลึกแตกกระจาย', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['spears', '#5ff6e0'], req: { shadow_hawk: 3 },
    sp: (lv) => 26 + lv * 2, cast: 0.3, cd: 3, range: 9, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'water', hitBonus: () => 20,
    mult: (lv) => 0.8 + lv * 0.1,
    nf: { anim: 'shoot', hits: [{ t: 0.4, m: 1.4, shake: 0.12 }, { t: 0.5, r: 2.8, m: 1, slow: { pct: 0.3, secs: 2 } }, { t: 0.7, r: 2.8, m: 1 }] },
    desc: 'ยิงศรผลึกน้ำแข็งเจาะเป้าแล้วแตกกระจายเป็นเศษผลึกนับสิบ ใส่ศัตรูรอบข้างและทำให้ช้าลง',
    effect: (lv) => `เป้าหลัก ${pct((0.8 + lv * 0.1) * 1.4)}% + เศษผลึก 2 × ${pct(0.8 + lv * 0.1)}% รอบเป้า 2.8 ช่อง · ช้าลง 30%`,
  },
  predator_instinct: {
    job: 'hunter', name: 'สัญชาตญาณนักล่า', maxLv: 10, kind: 'active', target: 'self', icon: ['eye', '#ff6a6a'], req: { hunter_sense: 3 },
    sp: 30, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ crit: 0.02 + lv * 0.006, critDmgPct: 5 + lv * 2, aspdPct: Math.ceil(lv / 2) * 2 }),
    desc: 'ปลุกสัญชาตญาณนักล่า ตราเพชรแดงล้อมตัว เพิ่มโอกาสคริ ดาเมจคริ และความเร็วโจมตี',
    effect: (lv) => `คริ +${(2 + lv * 0.6).toFixed(1)}% · คริดาเมจ +${5 + lv * 2}% · ASPD +${Math.ceil(lv / 2) * 2}% นาน ${60 + lv * 6} วิ`,
  },
  talon_storm: {
    job: 'hunter', name: 'พายุเหยี่ยวสวรรค์', maxLv: 5, kind: 'active', target: 'enemy', icon: ['hawk', '#ffd27a'], req: { meteor_trap: 5, crystal_scatter: 5 },
    sp: (lv) => 56 + lv * 4, cast: 0.6, cd: 10, range: 9, vfx: 'nf', ref: 1, lock: 1.2, delay: 1.0, element: 'wind', hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 0.9 + lv * 0.18,
    nf: { anim: 'castHold', hits: [{ t: 0.45, r: 3.2, m: 1 }, { t: 0.7, r: 3.2, m: 1 }, { t: 0.95, r: 3.2, m: 1 }, { t: 1.2, r: 3.2, m: 1 }, { t: 1.45, r: 3.2, m: 1 }, { t: 1.7, r: 3.2, m: 1 }, { t: 2.1, r: 3.6, m: 3, knock: 1, shake: 0.35 }] },
    desc: 'เรียกพายุเหยี่ยวสวรรค์ ลมหมุน ห่าศร และกรงเล็บถล่มศัตรูในวง 6 ระลอก แล้วแสงสวรรค์ระเบิดปิดท้าย (ไม้ตาย)',
    effect: (lv) => `6 × ${pct(0.9 + lv * 0.18)}% + ระเบิด ${pct((0.9 + lv * 0.18) * 3)}% รอบเป้า 3.2 ช่อง · คูลดาวน์ 10 วิ`,
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
