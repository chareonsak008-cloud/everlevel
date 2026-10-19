// สกิลทั้งหมด — ปรับสมดุลสกิลได้จากไฟล์นี้
// kind: passive = ติดตัว | active = กดใช้
// target: enemy = เลือกศัตรู (ใช้เป้าหมายปัจจุบัน หรือตัวที่ใกล้ที่สุด) | self = ใช้กับตัวเอง/รอบตัว
// ค่าที่เป็นฟังก์ชันรับ (lv, player) แล้วคืนค่าตามเลเวลสกิล
// v0.8: vfx = ชื่อเอฟเฟกต์ใน SkillFX (จังหวะดาเมจเข้าตามภาพ) · ref = ตัวคูณอ้างอิงของฮิตหลักในเอฟเฟกต์
//       ดาเมจจริงต่อฮิต = (ตัวคูณของฮิตนั้นในเอฟเฟกต์ / ref) × mult(lv)
//       lock = วินาทีที่ยืนนิ่งระหว่างท่า · delay = หน่วงก่อนใช้สกิลถัดไป (after-cast delay)
// fx (แบบเก่า v0.6) ยังใช้กับสกิลที่ไม่มี vfx: strike | nova | bolt | storm | arrows | rain | heal | buff
import { JOBS } from './progression.js?v=0.60.0';
import { JOB2_SKILLS, LEGACY_JOB2 } from './job2Skills.js?v=0.60.0';   // v0.31: อาชีพขั้นที่ 2 · v0.35: ชุดใหม่
export { LEGACY_JOB2 };

export function healAmount(lv, pl) {
  const int = pl && pl.derived ? pl.derived.total.int : 1;
  const base = pl ? pl.baseLevel : 1;
  return (Math.floor((base + int) / 8) + 1) * (4 + lv * 8);
}

const pct = (x) => Math.round(x * 100);
const span = (lv, max, a, b) => Math.round(a + ((b - a) * (lv - 1)) / (max - 1));

export const SKILLS = {
  /* ---------- Novice ---------- */
  basic: {
    job: 'novice', name: 'ทักษะพื้นฐาน', maxLv: 9, kind: 'passive', icon: ['book', '#e8c050'],
    desc: 'ความรู้พื้นฐานของนักผจญภัย ต้องฝึกถึง Lv.9 จึงจะเปลี่ยนอาชีพได้',
    effect: (lv) => `Max HP +${lv * 3} · Max SP +${lv}`,
    passive: (lv) => ({ maxHp: lv * 3, maxSp: lv }),
  },
  first_aid: {
    job: 'novice', name: 'ปฐมพยาบาล', maxLv: 1, kind: 'active', target: 'self', free: true, icon: ['bandage', '#ff8a8a'],
    sp: 3, cast: 0, cd: 1.5, fx: 'heal', heal: () => 15,
    desc: 'พันแผลด้วยผ้าสะอาด ฟื้นฟู HP เล็กน้อย (ได้รับฟรี)',
    effect: () => 'ฟื้น HP 15',
  },

  /* ---------- Swordsman · v0.60 ชุดใหม่ "เพลิงชาด" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ---------- */
  blade_heart: {
    job: 'swordsman', name: 'หัวใจดาบ', maxLv: 10, kind: 'passive', icon: ['swordup', '#ff8a6a'],
    desc: 'ใจกับดาบเป็นหนึ่งเดียว ฟันแรงและแม่นขึ้นกับอาวุธทุกชนิด',
    effect: (lv) => `ATK +${lv * 3} · HIT +${lv} · ASPD +${lv}%`,
    passive: (lv) => ({ atkFlat: lv * 3, hit: lv, aspdPct: lv }),
  },
  warrior_body: {
    job: 'swordsman', name: 'กายนักรบ', maxLv: 10, kind: 'passive', icon: ['shield', '#c3c9d3'],
    desc: 'ร่างกายที่ผ่านศึกนับร้อย ทนทานและฟื้นตัวเร็ว',
    effect: (lv) => `Max HP +${lv * 3}% · DEF +${lv} · ฟื้น HP +${lv * 5}%`,
    passive: (lv) => ({ maxHpPct: lv * 3, def: lv, regenPct: lv * 5 }),
  },
  crimson_cleave: {
    job: 'swordsman', name: 'ฟันเพลิงชาด', maxLv: 10, kind: 'active', target: 'enemy', icon: ['slash', '#ff4a2a'],
    sp: (lv) => 7 + lv, cast: 0, cd: 0.6, range: 'weapon', vfx: 'nf', ref: 1, lock: 0.4, delay: 0.35, engage: true, element: 'fire',
    mult: (lv) => 0.9 + lv * 0.12, hitBonus: (lv) => lv * 4, stun: (lv) => (lv >= 6 ? (lv - 5) * 0.06 : 0), stunSecs: 1.5,
    nf: { anim: 'melee', hits: [{ t: 0.15, m: 1 }, { t: 0.32, r: 1.2, m: 1, stun: 1.5, shake: 0.12 }] },
    desc: 'ฟันไขว้สองจังหวะเป็นคมเพลิงสีชาด จังหวะที่สองแตกเป็นสะเก็ดไฟโดนศัตรูรอบเป้า ตั้งแต่ Lv.6 มีโอกาสทำให้มึน',
    effect: (lv) => `2 ครั้ง × ${pct(0.9 + lv * 0.12)}% (ครั้งที่ 2 โดนรอบเป้า 1.2 ช่อง)${lv >= 6 ? ` · มึน ${(lv - 5) * 6}%` : ''}`,
  },
  flame_dash: {
    job: 'swordsman', name: 'ทะยานเพลิง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['burst', '#ffb03a'], req: { crimson_cleave: 3 },
    sp: (lv) => 18 + lv * 2, cast: 0, cd: 3, range: 7, dash: true, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.4, engage: true, element: 'fire', knock: 1.6,
    mult: (lv) => 1.8 + lv * 0.2, hitBonus: () => 20,
    nf: { anim: 'melee', hits: [{ t: 0.25, r: 2.2, m: 1, knock: 1, shake: 0.18 }] },
    desc: 'พุ่งตัวเป็นลำเพลิงเข้าหาศัตรูไกล 7 ช่อง ฟันระเบิดไฟรอบจุดชน ผลักศัตรูกระเด็น — ใช้ปิดระยะ',
    effect: (lv) => `${pct(1.8 + lv * 0.2)}% รอบจุดชน 2.2 ช่อง · พุ่ง 7 ช่อง · ผลักกระเด็น`,
  },
  inferno_spin: {
    job: 'swordsman', name: 'วงพายุเพลิง', maxLv: 10, kind: 'active', target: 'self', icon: ['cyclone', '#ff6a2a'], req: { crimson_cleave: 5 },
    sp: (lv) => 26 + lv * 2, cast: 0, cd: 2, vfx: 'nf', ref: 1, lock: 1.0, delay: 0.6, element: 'fire', hitBonus: () => 10,
    mult: (lv) => 0.6 + lv * 0.08,
    nf: { at: 'self', anim: 'spin', animDur: 0.9, hits: [{ t: 0.15, r: 3, m: 1 }, { t: 0.4, r: 3, m: 1 }, { t: 0.65, r: 3, m: 1 }, { t: 0.9, r: 3.2, m: 1, knock: 1, shake: 0.15 }] },
    desc: 'หมุนดาบจนเกิดทอร์นาโดเพลิงรอบตัว ฟันศัตรูรอบทิศ 4 ครั้ง ครั้งสุดท้ายระเบิดผลักออก — เก็บมอนเป็นกลุ่ม',
    effect: (lv) => `4 ครั้ง × ${pct(0.6 + lv * 0.08)}% รอบตัว 3 ช่อง · ครั้งสุดท้ายผลักกระเด็น`,
  },
  war_cry: {
    job: 'swordsman', name: 'คำรามสงคราม', maxLv: 10, kind: 'active', target: 'self', icon: ['roar', '#e8483a'], req: { blade_heart: 3 },
    sp: (lv) => 18 + lv, cast: 0, cd: 1, vfx: 'nf', lock: 0.5, delay: 0.4,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ atkPct: span(lv, 10, 5, 25), aspdPct: Math.ceil(lv / 2) * 2 }),
    desc: 'คำรามปลุกเลือดนักรบ เปลวไฟสีชาดลุกท่วมตัว เพิ่มพลังโจมตีและความเร็วโจมตี',
    effect: (lv) => `ATK +${span(lv, 10, 5, 25)}% · ASPD +${Math.ceil(lv / 2) * 2}% นาน ${60 + lv * 6} วิ`,
  },
  iron_bastion: {
    job: 'swordsman', name: 'ป้อมเหล็ก', maxLv: 10, kind: 'active', target: 'self', icon: ['steel', '#e8c050'], req: { warrior_body: 5 },
    sp: 24, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 40 + lv * 2, bonus: (lv) => ({ dmgReduce: 4 + lv, def: lv * 2 }),
    desc: 'โซ่ทองพันรอบตัวแล้วประกอบเป็นโดมป้อมปราการ ลดดาเมจที่ได้รับและเพิ่มพลังป้องกัน',
    effect: (lv) => `ดาเมจที่ได้รับ -${4 + lv}% · DEF +${lv * 2} นาน ${40 + lv * 2} วิ`,
  },
  meteor_blade: {
    job: 'swordsman', name: 'ดาบอุกกาบาต', maxLv: 5, kind: 'active', target: 'enemy', icon: ['skysword', '#ff7a2a'], req: { flame_dash: 5, inferno_spin: 5 },
    sp: (lv) => 50 + lv * 4, cast: 0.3, cd: 10, range: 5, vfx: 'nf', ref: 1, lock: 1.1, delay: 1.0, element: 'fire', hitBonus: () => 30, knock: 1.8,
    mult: (lv) => 4 + lv * 0.8,
    nf: { anim: 'jump', animDur: 0.6, hits: [{ t: 0.9, r: 3, m: 1, knock: 1, shake: 0.3 }, { t: 1.3, r: 3.4, m: 0.3, shake: 0.12 }] },
    desc: 'เรียกดาบยักษ์เพลิงลาวาจากฟ้าปักลงกลางศัตรู พื้นแตกระเบิดเป็นวงไฟ ตามด้วยคลื่นกระแทก (ไม้ตาย)',
    effect: (lv) => `${pct(4 + lv * 0.8)}% รอบเป้า 3 ช่อง + คลื่นตาม ${pct((4 + lv * 0.8) * 0.3)}% · คูลดาวน์ 10 วิ`,
  },

  /* ---------- Mage · v0.60 ชุดใหม่ "เวทพิศวงสีม่วง" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ---------- */
  arcane_focus: {
    job: 'mage', name: 'สมาธิอาคม', maxLv: 10, kind: 'passive', icon: ['orb', '#b48cff'],
    desc: 'ดวงจิตนิ่งดั่งผลึก พลังเวทแรงขึ้นและมานาฟื้นเร็วขึ้น',
    effect: (lv) => `MATK +${lv * 1.5}% · Max SP +${lv * 2}% · ฟื้น SP +${lv * 8}%`,
    passive: (lv) => ({ matkPct: lv * 1.5, maxSpPct: lv * 2, spRegenPct: lv * 8 }),
  },
  swift_incantation: {
    job: 'mage', name: 'คาถาเร่งรุด', maxLv: 10, kind: 'passive', icon: ['eye', '#d8b8ff'], req: { arcane_focus: 3 },
    desc: 'ท่องคาถาสั้นลงโดยพลังไม่ลด ร่ายเร็วและต่อสกิลไวขึ้น',
    effect: (lv) => `เวลาร่าย -${lv * 3}% · ดีเลย์หลังร่าย -${lv}% · MDEF +${lv}`,
    passive: (lv) => ({ castPct: lv * 3, delayPct: lv, mdef: lv }),
  },
  violet_flare: {
    job: 'mage', name: 'หอกเพลิงม่วง', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['flame', '#c06aff'],
    sp: (lv) => 8 + lv, cast: 0.25, cd: 0.6, range: 9, vfx: 'nf', ref: 1, lock: 0.45, delay: 0.3, engage: true, element: 'fire',
    mult: (lv) => 1.1 + lv * 0.14,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.3, m: 1 }, { t: 0.5, r: 1.2, m: 0.5, shake: 0.08 }] },
    desc: 'ชี้ไม้เท้า หอกเพลิงสีม่วงพุ่งเสียบเป้า แล้วแตกเป็นเปลวเพลิงลามศัตรูข้าง ๆ — สกิลเวทหลัก ร่ายไว',
    effect: (lv) => `${pct(1.1 + lv * 0.14)}% MATK + ลาม ${pct((1.1 + lv * 0.14) * 0.5)}% รอบเป้า 1.2 ช่อง`,
  },
  glacial_spikes: {
    job: 'mage', name: 'หนามน้ำแข็งระเบิด', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['ice', '#7fd8ff'], req: { violet_flare: 3 },
    sp: (lv) => 18 + lv * 2, cast: 0.6, cd: 3, range: 9, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'water',
    mult: (lv) => 0.9 + lv * 0.1, freeze: (lv) => 0.35 + lv * 0.05, freezeSecs: (lv) => 1.5 + lv * 0.15,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.45, r: 2.4, m: 1, slow: { pct: 0.4, secs: 3 } }, { t: 0.85, r: 2.6, m: 1, freeze: 2, shake: 0.14 }] },
    desc: 'น้ำแข็งก่อตัวใต้เป้า ผลึกหนามพุ่งขึ้น 2 ระลอก ศัตรูในวงช้าลง และระลอกที่สองมีโอกาสแช่แข็ง',
    effect: (lv) => `2 × ${pct(0.9 + lv * 0.1)}% MATK รอบเป้า 2.4 ช่อง · ช้าลง 40% · แช่แข็ง ${35 + lv * 5}% นาน ${(1.5 + lv * 0.15).toFixed(1)} วิ`,
  },
  chain_lightning: {
    job: 'mage', name: 'สายฟ้าลูกโซ่', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['bolt', '#ffe24a'], req: { violet_flare: 3 },
    sp: (lv) => 20 + lv * 2, cast: 0.5, cd: 2.5, range: 9, vfx: 'nf', ref: 1, lock: 0.7, delay: 0.5, element: 'wind',
    mult: (lv) => 0.7 + lv * 0.09, stun: (lv) => 0.1 + lv * 0.03, stunSecs: 1.2,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.3, m: 1.3 }, { t: 0.6, r: 2.6, m: 1 }, { t: 0.9, r: 2.6, m: 1 }, { t: 1.2, r: 2.8, m: 1, stun: 1.2, shake: 0.14 }] },
    desc: 'สายฟ้าสีม่วงฟาดเป้าหลัก แล้วแตกลูกโซ่ไปศัตรูรอบข้าง 3 ระลอก ระลอกสุดท้ายมีโอกาสทำให้มึน',
    effect: (lv) => `เป้าหลัก ${pct((0.7 + lv * 0.09) * 1.3)}% + ลูกโซ่ 3 × ${pct(0.7 + lv * 0.09)}% MATK รอบ 2.6 ช่อง · มึน ${10 + lv * 3}%`,
  },
  blizzard: {
    job: 'mage', name: 'พายุหิมะขั้วโลก', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['snow', '#9ae8ff'], req: { glacial_spikes: 3 },
    sp: (lv) => 30 + lv * 3, cast: 1.0, cd: 6, range: 9, vfx: 'nf', ref: 1, lock: 0.9, delay: 0.8, element: 'water',
    mult: (lv) => 0.42 + lv * 0.05, freeze: (lv) => 0.5 + lv * 0.04, freezeSecs: 2,
    nf: { magic: true, anim: 'castHold', hits: [{ t: 0.5, r: 3.4, m: 1, slow: { pct: 0.5, secs: 4 } }, { t: 1.0, r: 3.4, m: 1 }, { t: 1.5, r: 3.4, m: 1 }, { t: 2.0, r: 3.4, m: 1 }, { t: 2.5, r: 3.4, m: 1 }, { t: 3.0, r: 3.6, m: 1.6, freeze: 2, shake: 0.2 }] },
    desc: 'เรียกพายุหิมะกว้าง 3.4 ช่องหมุนวน 3 วินาที ตีต่อเนื่อง 5 ครั้ง ศัตรูช้าลงครึ่งหนึ่ง แล้วปิดท้ายด้วยผลึกยักษ์แช่แข็งทั้งวง',
    effect: (lv) => `5 × ${pct(0.42 + lv * 0.05)}% + ปิดท้าย ${pct((0.42 + lv * 0.05) * 1.6)}% MATK รอบเป้า 3.4 ช่อง · ช้าลง 50% · แช่แข็ง ${50 + lv * 4}% 2 วิ`,
  },
  arcane_ward: {
    job: 'mage', name: 'เกราะเวทอาคม', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#9a6ae0'], req: { arcane_focus: 3 },
    sp: 28, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ dmgReduce: 8 + lv * 1.5, mdef: lv * 2, matkPct: lv }),
    desc: 'วงอักขระลอยขึ้นจากพื้น ผลึกเวทหมุนล้อมรอบตัวแล้วรวมเป็นโดมเกราะสีม่วง ลดดาเมจที่ได้รับและเพิ่มพลังเวท',
    effect: (lv) => `ดาเมจที่ได้รับ -${(8 + lv * 1.5).toFixed(1)}% · MDEF +${lv * 2} · MATK +${lv}% นาน ${60 + lv * 6} วิ`,
  },
  void_meteor: {
    job: 'mage', name: 'ห่าอุกกาบาตม่วง', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['meteor', '#8a3aff'], req: { chain_lightning: 3, blizzard: 3 },
    sp: (lv) => 55 + lv * 5, cast: (lv) => 1.6 - lv * 0.12, cd: 10, range: 9, vfx: 'nf', ref: 1, lock: 1.2, delay: 1.0, element: 'fire', knock: 1.5,
    mult: (lv) => 1.3 + lv * 0.25,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.55, dur: 3.2 }, hits: [{ t: 0.55, r: 2.4, m: 1, shake: 0.1 }, { t: 0.95, r: 2.4, m: 1, shake: 0.1 }, { t: 1.35, r: 2.4, m: 1, shake: 0.1 }, { t: 2.0, r: 3.4, m: 2.6, knock: 1, shake: 0.35 }] },
    desc: 'ฟ้ามืดลง อุกกาบาตเพลิงม่วง 3 ลูกถล่มรอบเป้า แล้วอุกกาบาตยักษ์ลูกสุดท้ายกระแทกกลางวง ระเบิดผลักศัตรูกระเด็น (ไม้ตาย)',
    effect: (lv) => `3 × ${pct(1.3 + lv * 0.25)}% + ลูกยักษ์ ${pct((1.3 + lv * 0.25) * 2.6)}% MATK รอบเป้า 3.4 ช่อง · ร่าย ${(1.6 - lv * 0.12).toFixed(2)} วิ · คูลดาวน์ 10 วิ`,
  },

  /* ---------- Archer · v0.60 ชุดใหม่ "ศรดารา" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ---------- */
  keen_eye: {
    job: 'archer', name: 'ตาคม', maxLv: 10, kind: 'passive', icon: ['eye', '#8fe08a'],
    desc: 'สายตาที่มองเห็นจุดอ่อนของทุกสิ่ง แม่นยำและคริติคอลบ่อยขึ้น',
    effect: (lv) => `DEX +${lv} · คริ +${(lv * 0.3).toFixed(1)}%`,
    passive: (lv) => ({ dex: lv, crit: lv * 0.003 }),
  },
  wind_step: {
    job: 'archer', name: 'ย่างก้าวสายลม', maxLv: 10, kind: 'passive', icon: ['scope', '#6fc8ff'], req: { keen_eye: 3 },
    desc: 'เท้าเบาดั่งลม ยิงได้ไกลขึ้นและหลบหลีกเก่งขึ้น',
    effect: (lv) => `ระยะยิง +${lv * 0.5} ช่อง · FLEE +${lv * 2} · ASPD +${Math.ceil(lv / 2)}%`,
    passive: (lv) => ({ rangeTiles: lv * 0.5, flee: lv * 2, aspdPct: Math.ceil(lv / 2) }),
  },
  piercing_light: {
    job: 'archer', name: 'ศรเจาะแสง', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['arrow2', '#ffe08a'],
    sp: (lv) => 9 + lv, cast: 0, cd: 0.6, range: 9, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.3, engage: true, element: 'holy',
    mult: (lv) => 0.85 + lv * 0.11, hitBonus: (lv) => lv * 4, knock: 0.4,
    nf: { anim: 'shoot', hits: [{ t: 0.3, m: 1 }, { t: 0.52, m: 1, knock: 1, shake: 0.1 }] },
    desc: 'ยิงศรแสงทองหมุนเกลียว 2 ดอกติดกันใส่ศัตรู ดอกที่สองระเบิดเป็นแฉกดาวผลักถอย — สกิลยิงหลัก',
    effect: (lv) => `2 ดอก × ${pct(0.85 + lv * 0.11)}% · HIT +${lv * 4} · ดอกที่ 2 ผลักถอย`,
  },
  starfall_volley: {
    job: 'archer', name: 'ห่าฝนดาวตก', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['rain', '#c9b8ff'], req: { piercing_light: 5 },
    sp: (lv) => 20 + lv * 2, cast: 0.4, cd: 3, range: 9, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'holy', hitBonus: () => 15,
    mult: (lv) => 0.5 + lv * 0.07,
    nf: { hits: [{ t: 0.45, r: 2.6, m: 1 }, { t: 0.7, r: 2.6, m: 1 }, { t: 0.95, r: 2.6, m: 1 }, { t: 1.2, r: 2.6, m: 1 }, { t: 1.4, r: 2.8, m: 1, shake: 0.12 }] },
    desc: 'ยิงศรขึ้นฟ้า กลายเป็นห่าฝนดาวตกบนดาวห้าแฉก ตกใส่ศัตรูในวง 5 ระลอก — เก็บกลุ่มระยะไกล',
    effect: (lv) => `5 ระลอก × ${pct(0.5 + lv * 0.07)}% รอบเป้า 2.6 ช่อง`,
  },
  cyclone_arrow: {
    job: 'archer', name: 'ศรพายุหมุน', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['gale', '#3ac06a'], req: { starfall_volley: 3 },
    sp: (lv) => 24 + lv * 2, cast: 0.3, cd: 5, range: 10, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'wind', hitBonus: () => 20, knock: 2,
    mult: (lv) => 0.55 + lv * 0.08,
    nf: { hits: [{ t: 0.35, r: 2, m: 1 }, { t: 0.7, r: 2.2, m: 1, slow: { pct: 0.4, secs: 2 } }, { t: 1.05, r: 2.2, m: 1 }, { t: 1.4, r: 2.4, m: 1 }, { t: 1.55, r: 2.8, m: 1.5, knock: 1, shake: 0.18 }] },
    desc: 'ศรลมเจาะเป้าแล้วแตกเป็นทอร์นาโด ดูดศัตรูไว้ ตีต่อเนื่อง 4 ครั้งแล้วระเบิดผลักกระเด็น ศัตรูช้าลง',
    effect: (lv) => `4 × ${pct(0.55 + lv * 0.08)}% + ระเบิด ${pct((0.55 + lv * 0.08) * 1.5)}% รอบเป้า 2.4 ช่อง · ช้าลง 40% · ผลักกระเด็น`,
  },
  thunder_snare: {
    job: 'archer', name: 'กับดักสายฟ้า', maxLv: 10, kind: 'active', target: 'enemy', icon: ['trap', '#5ab8ff'], req: { keen_eye: 3 },
    sp: (lv) => 16 + lv * 2, cast: 0.2, cd: 4, range: 8, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.5, element: 'wind', hitBonus: () => 30,
    mult: (lv) => 1.2 + lv * 0.12, stun: () => 1, stunSecs: (lv) => 1.5 + lv * 0.15,
    nf: { hits: [{ t: 0.68, r: 2, m: 1, stun: 1, shake: 0.15 }] },
    desc: 'วางตราสายฟ้าใต้เป้า เสาสายฟ้าฟาดลง โซ่พลังรัดศัตรูในวงให้มึนงง — ใช้คุมศัตรูก่อนยิงซ้ำ',
    effect: (lv) => `${pct(1.2 + lv * 0.12)}% รอบเป้า 2 ช่อง · มึน ${(1.5 + lv * 0.15).toFixed(1)} วิ`,
  },
  starlit_eye: {
    job: 'archer', name: 'สายตาดาว', maxLv: 10, kind: 'active', target: 'self', icon: ['eye', '#ffe9b8'], req: { keen_eye: 5 },
    sp: 22, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ dex: 2 + lv, agi: 2 + lv, crit: lv * 0.004, rangedPct: lv }),
    desc: 'ดาวห้าแฉกลอยขึ้นหน้าดวงตา เพิ่มความแม่นยำ ความว่องไว โอกาสคริติคอล และดาเมจระยะไกล',
    effect: (lv) => `DEX/AGI +${2 + lv} · คริ +${(lv * 0.4).toFixed(1)}% · ดาเมจระยะไกล +${lv}% นาน ${60 + lv * 6} วิ`,
  },
  phoenix_barrage: {
    job: 'archer', name: 'หงส์เพลิงทะยาน', maxLv: 5, kind: 'active', target: 'enemy', bow: true, icon: ['phoenix', '#ff6a2a'], req: { cyclone_arrow: 3, piercing_light: 7 },
    sp: (lv) => 45 + lv * 3, cast: 0.5, cd: 9, range: 9, vfx: 'nf', ref: 1, lock: 1.0, delay: 0.9, element: 'fire', hitBonus: () => 30, knock: 1.5,
    mult: (lv) => 1.4 + lv * 0.3,
    nf: { anim: 'shoot', hits: [{ t: 0.5, m: 1 }, { t: 0.8, r: 3, m: 1.5, knock: 1, shake: 0.3 }, { t: 1.2, r: 3.2, m: 0.6, shake: 0.1 }] },
    desc: 'ยิงศรที่กลายเป็นหงส์เพลิงพุ่งทะยานใส่เป้า พร้อมห่าศรเพลิงตกตาม แล้วดอกบัวไฟบานระเบิดทั่ววง (ไม้ตาย)',
    effect: (lv) => `${pct(1.4 + lv * 0.3)}% + ระเบิด ${pct((1.4 + lv * 0.3) * 1.5)}% + คลื่น ${pct((1.4 + lv * 0.3) * 0.6)}% รอบเป้า 3 ช่อง · คูลดาวน์ 9 วิ`,
  },

  /* ---------- Acolyte · v0.60 ชุดใหม่ "แสงศรัทธา" (ภาพ Night Forge · ดาเมจ/ฮีลตามจังหวะใน sk.nf) ---------- */
  faith_heart: {
    job: 'acolyte', name: 'หัวใจศรัทธา', maxLv: 10, kind: 'passive', icon: ['cross', '#ffe9a0'],
    desc: 'ศรัทธาที่มั่นคงทำให้พลังรักษาแรงขึ้นและมานาลึกขึ้น',
    effect: (lv) => `พลังรักษา +${lv * 3}% · Max SP +${lv * 2}% · INT +${Math.ceil(lv / 2)}`,
    passive: (lv) => ({ healPct: lv * 3, maxSpPct: lv * 2, int: Math.ceil(lv / 2) }),
  },
  holy_vigor: {
    job: 'acolyte', name: 'กายศักดิ์สิทธิ์', maxLv: 10, kind: 'passive', icon: ['shield', '#fff2c0'], req: { faith_heart: 3 },
    desc: 'ร่างกายได้รับพรให้ทนทานและฟื้นตัวไวกว่าใคร',
    effect: (lv) => `MDEF +${lv * 2} · Max HP +${lv}% · ฟื้น HP +${lv * 6}%`,
    passive: (lv) => ({ mdef: lv * 2, maxHpPct: lv, regenPct: lv * 6 }),
  },
  lumen_heal: {
    job: 'acolyte', name: 'ฟื้นฟูแสงนวล', maxLv: 10, kind: 'active', target: 'self', icon: ['heart', '#9affb0'],
    sp: (lv) => 10 + lv * 3, cast: 0, cd: 1, vfx: 'nf', lock: 0.5, delay: 0.3, heal: (lv, pl) => healAmount(lv, pl),
    nf: { at: 'self', anim: 'cast', heals: [0.5] },
    desc: 'ลำแสงนวลส่องลงจากฟ้า ประกายแสงลอยขึ้นรอบตัว รักษาบาดแผลของตนเอง ยิ่ง Base Lv และ INT สูงยิ่งฟื้นมาก',
    effect: (lv, pl) => `ฟื้น HP ${healAmount(lv, pl)}`,
  },
  radiant_lance: {
    job: 'acolyte', name: 'หอกแสงรัศมี', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['sun', '#fff2a0'], req: { faith_heart: 1 },
    sp: (lv) => 11 + lv * 2, cast: 0.35, cd: 0.9, range: 8, vfx: 'nf', ref: 1, lock: 0.5, delay: 0.35, engage: true, element: 'holy',
    mult: (lv) => 1.3 + lv * 0.16,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.55, m: 1, shake: 0.1 }, { t: 0.7, r: 1.4, m: 0.4 }] },
    desc: 'วงเล็งเป้าปรากฏใต้ศัตรู หอกแสงทองพุ่งลงจากฟ้าปักเป้า ระเบิดเป็นดาวแสงลามศัตรูข้าง ๆ — สกิลโจมตีหลัก (แรงพิเศษต่ออันเดด)',
    effect: (lv) => `${pct(1.3 + lv * 0.16)}% + ลาม ${pct((1.3 + lv * 0.16) * 0.4)}% MATK รอบเป้า 1.4 ช่อง · ธาตุศักดิ์สิทธิ์`,
  },
  star_blessing: {
    job: 'acolyte', name: 'พรดารา', maxLv: 10, kind: 'active', target: 'self', icon: ['star', '#ffe08a'],
    sp: (lv) => 22 + lv * 3, cast: 0, cd: 1, vfx: 'nf', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast' },
    duration: (lv) => 90 + lv * 15, bonus: (lv) => ({ str: lv, dex: lv, int: lv, agi: Math.ceil(lv / 2), speedPct: 10 + lv * 1.5 }),
    desc: 'ดาวห้าแฉกลอยเหนือศีรษะ เกลียวแสงพุ่งขึ้นรอบตัว อวยพรเพิ่ม STR DEX INT AGI และความเร็วเดิน',
    effect: (lv) => `STR/DEX/INT +${lv} · AGI +${Math.ceil(lv / 2)} · ความเร็ว +${(10 + lv * 1.5).toFixed(0)}% นาน ${90 + lv * 15} วิ`,
  },
  holy_ground: {
    job: 'acolyte', name: 'ปฐพีศักดิ์สิทธิ์', maxLv: 10, kind: 'active', target: 'self', magic: true, icon: ['sanctum', '#e8c050'], req: { lumen_heal: 3 },
    sp: (lv) => 32 + lv * 2, cast: 0.8, cd: 6, vfx: 'nf', ref: 1, lock: 0.7, delay: 0.8, element: 'holy',
    mult: (lv) => 0.5 + lv * 0.05, heal: (lv, pl) => Math.round(healAmount(lv, pl) * 0.4),
    nf: { at: 'self', magic: true, anim: 'castHold', hits: [{ t: 0.7, r: 3.4, m: 1 }, { t: 1.5, r: 3.4, m: 1 }, { t: 2.3, r: 3.4, m: 1, shake: 0.1 }], heals: [0.6, 1.4, 2.2, 3.0] },
    desc: 'กางวงเวทศักดิ์สิทธิ์กว้าง 3.4 ช่อง ม่านแสงล้อมรอบ ลำแสงฟาดศัตรูในวง 3 ระลอก และฟื้น HP ให้ตัวเอง 4 ครั้ง',
    effect: (lv, pl) => `3 × ${pct(0.5 + lv * 0.05)}% MATK รอบตัว 3.4 ช่อง · ฟื้น HP ${Math.round(healAmount(lv, pl) * 0.4)} × 4`,
  },
  sacred_chains: {
    job: 'acolyte', name: 'โซ่ศักดิ์สิทธิ์', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['chain', '#ffd27a'], req: { radiant_lance: 3 },
    sp: (lv) => 20 + lv * 2, cast: 0.4, cd: 5, range: 8, vfx: 'nf', ref: 1, lock: 0.6, delay: 0.5, element: 'holy',
    mult: (lv) => 1 + lv * 0.1, stun: () => 1, stunSecs: (lv) => 1.6 + lv * 0.14,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.4, r: 2, m: 0.5 }, { t: 0.72, r: 2.2, m: 1, stun: 1, shake: 0.14 }] },
    desc: 'โซ่แสงพุ่งออกจากวงผนึกรัดศัตรูในวง แล้วเสาแสงฟาดลงกลางวง ศัตรูทั้งหมดมึนงง — ใช้คุมศัตรูก่อนฮีลหรือโจมตี',
    effect: (lv) => `${pct(0.5 + lv * 0.05)}% + ${pct(1 + lv * 0.1)}% MATK รอบเป้า 2.2 ช่อง · มึน ${(1.6 + lv * 0.14).toFixed(1)} วิ`,
  },
  heavens_cross: {
    job: 'acolyte', name: 'กางเขนสวรรค์', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['judgment', '#e0a640'], req: { radiant_lance: 5, holy_ground: 3 },
    sp: (lv) => 55 + lv * 4, cast: 1.0, cd: 9, range: 8, vfx: 'nf', ref: 1, lock: 1.1, delay: 1.0, element: 'holy', knock: 1.2,
    mult: (lv) => 0.9 + lv * 0.18,
    nf: { magic: true, anim: 'castHold', hits: [{ t: 0.6, r: 2.6, m: 1 }, { t: 0.85, r: 2.6, m: 1 }, { t: 1.1, r: 2.6, m: 1 }, { t: 1.35, r: 2.6, m: 1 }, { t: 1.95, r: 3.2, m: 3, knock: 1, shake: 0.35 }] },
    desc: 'ลำแสงสวรรค์สาดลง เข็มแสง 4 เล่มปักรอบเป้า แล้วเสากางเขนยักษ์กระแทกลงกลางวง ระเบิดแสงผลักศัตรูกระเด็น (ไม้ตาย)',
    effect: (lv) => `4 × ${pct(0.9 + lv * 0.18)}% + เสากางเขน ${pct((0.9 + lv * 0.18) * 3)}% MATK รอบเป้า 3.2 ช่อง · คูลดาวน์ 9 วิ`,
  },
};

Object.assign(SKILLS, JOB2_SKILLS);

// ตัวช่วยอ่านค่าที่อาจเป็นตัวเลขหรือฟังก์ชัน
export const sval = (v, lv, pl) => (typeof v === 'function' ? v(lv, pl) : v);
export const skillSp = (sk, lv) => sval(sk.sp, lv) || 0;
export const skillCast = (sk, lv) => sval(sk.cast, lv) || 0;

// สกิลของสายอาชีพนั้น (เรียงตามที่ประกาศ)
export const jobSkills = (job) => Object.keys(SKILLS).filter((id) => SKILLS[id].job === job);

// สกิลที่อาชีพนี้เรียนได้ (อาชีพแรกเรียนสกิล Novice ได้ด้วย)
export const skillTrees = (job) => (job === 'novice' ? ['novice'] : JOBS[job] && JOBS[job].parent ? ['novice', JOBS[job].parent, job] : ['novice', job]);   // v0.31: ขั้น 2 เรียนสกิลขั้น 1 ต่อได้

export const KIND_NAME = { passive: 'ติดตัว', active: 'กดใช้' };
export const jobName = (job) => (JOBS[job] || JOBS.novice).name;
