// สกิลทั้งหมด — ปรับสมดุลสกิลได้จากไฟล์นี้
// kind: passive = ติดตัว | active = กดใช้
// target: enemy = เลือกศัตรู (ใช้เป้าหมายปัจจุบัน หรือตัวที่ใกล้ที่สุด) | self = ใช้กับตัวเอง/รอบตัว
// ค่าที่เป็นฟังก์ชันรับ (lv, player) แล้วคืนค่าตามเลเวลสกิล
// v0.8: vfx = ชื่อเอฟเฟกต์ใน SkillFX (จังหวะดาเมจเข้าตามภาพ) · ref = ตัวคูณอ้างอิงของฮิตหลักในเอฟเฟกต์
//       ดาเมจจริงต่อฮิต = (ตัวคูณของฮิตนั้นในเอฟเฟกต์ / ref) × mult(lv)
//       lock = วินาทีที่ยืนนิ่งระหว่างท่า · delay = หน่วงก่อนใช้สกิลถัดไป (after-cast delay)
// fx (แบบเก่า v0.6) ยังใช้กับสกิลที่ไม่มี vfx: strike | nova | bolt | storm | arrows | rain | heal | buff
import { JOBS } from './progression.js?v=0.93.0-p3.35';
import { JOB2_SKILLS, LEGACY_JOB2 } from './job2Skills.js?v=0.93.0-p3.35';
import { job3Skills, JOB3_PARTY } from './job3Skills.js?v=0.93.0-p3.35';   // v0.85 อาชีพคลาส 3
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

  /* ---------- Swordsman · v0.64 ชุดใหม่ (ภาพ sprite sheet จากผู้พัฒนา) · เดิม v0.60 "เพลิงชาด" (ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ---------- */
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
  triple_slash: {
    job: 'swordsman', name: 'ฟันสามจังหวะ', maxLv: 10, kind: 'active', target: 'enemy', icon: ['tripleslash', '#ff7a3a'],
    sp: (lv) => 7 + lv, cast: 0, cd: 0.6, range: 'weapon', vfx: 'sw_triple_slash', ref: 1, lock: 0.6, delay: 0.35, engage: true, element: 'fire', hitBonus: (lv) => lv * 4,
    mult: (lv) => 0.6 + lv * 0.08,
    nf: { anim: 'melee', animDur: 0.6, hits: [{ t: 0.18, m: 1 }, { t: 0.4, m: 1 }, { t: 0.65, r: 1.6, m: 2.6, shake: 0.35, stop: 0.07 }] },
    desc: 'ก้าวเข้าประชิดแล้วฟันเพลิง 3 จังหวะ ฟันสุดท้ายแรงที่สุดและลามโดนศัตรูข้างเป้า — สกิลโจมตีหลัก',
    effect: (lv) => `${pct(0.6 + lv * 0.08)}% + ${pct(0.6 + lv * 0.08)}% + ${pct((0.6 + lv * 0.08) * 2.6)}% ATK (ฟันสุดท้ายรอบเป้า 1.6 ช่อง) · HIT +${lv * 4}`,
  },
  flame_wave: {
    job: 'swordsman', name: 'คลื่นดาบเพลิง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['flamewave', '#ff5a2a'], req: { triple_slash: 3 },
    sp: (lv) => 18 + lv * 2, cast: 0.2, cd: 2.5, range: 6, vfx: 'sw_flame_wave', ref: 1, lock: 0.7, delay: 0.5, element: 'fire', hitBonus: () => 25, knock: 1,
    mult: (lv) => 1.6 + lv * 0.18,
    nf: { anim: 'melee', animDur: 0.6, hits: [{ t: 0.53, line: { len: 4, w: 1.2 }, m: 0.4 }, { t: 0.69, line: { len: 9, w: 1.2 }, m: 1, knock: 1, shake: 0.35, stop: 0.06 }] },
    desc: 'ฟันดาบส่งคลื่นเพลิงรูปจันทร์เสี้ยวพุ่งไปข้างหน้า เผาทุกตัวในแนวยาว 9 ช่อง และผลักถอย — สกิลโจมตีระยะกลาง',
    effect: (lv) => `${pct(1.6 + lv * 0.18)}% ATK ทุกตัวในแนว 9 ช่อง (+${pct((1.6 + lv * 0.18) * 0.4)}% ตัวที่อยู่ใกล้) · ผลักถอย`,
  },
  blazing_dash: {
    job: 'swordsman', name: 'พุ่งทะลวงเพลิง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['blazedash', '#ff8a3a'], req: { triple_slash: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0, cd: 3.5, range: 7, dash: true, vfx: 'sw_blazing_dash', ref: 1, lock: 0.8, delay: 0.5, engage: true, element: 'fire', hitBonus: () => 30, knock: 2,
    mult: (lv) => 2.2 + lv * 0.26,
    nf: { anim: 'melee', flashes: [{ t: 0.85, a: 0.25, color: '#ffac46' }], hits: [{ t: 0.85, line: { len: 7, w: 1.4 }, m: 1, knock: 1, shake: 0.35, stop: 0.09 }] },
    desc: 'พุ่งตัวเป็นลำเพลิงทะลุแนวศัตรูไกล 7 ช่อง ทิ้งรอยเพลิงไว้ แล้วทุกตัวที่โดนพุ่งผ่านระเบิดพร้อมกัน — ใช้ปิดระยะ',
    effect: (lv) => `${pct(2.2 + lv * 0.26)}% ATK ทุกตัวในแนว 7 ช่อง · พุ่งเข้าหาเป้า · ผลักกระเด็น`,
  },
  inferno_whirl: {
    job: 'swordsman', name: 'วงเวียนดาบไฟ', maxLv: 10, kind: 'active', target: 'enemy', icon: ['firewhirl', '#ff6a2a'], req: { flame_wave: 3 },
    sp: (lv) => 30 + lv * 2, cast: 0, cd: 3, range: 'weapon', vfx: 'sw_inferno_whirl', ref: 1, lock: 1.0, delay: 0.6, engage: true, element: 'fire', hitBonus: () => 20, knock: 1.5,
    mult: (lv) => 0.6 + lv * 0.07,
    nf: { anim: 'spin', animDur: 0.9, flashes: [{ t: 0.96, a: 0.25, color: '#ffac46' }], hits: [{ t: 0.28, r: 2.8, m: 1 }, { t: 0.5, r: 2.8, m: 1 }, { t: 0.71, r: 2.8, m: 1 }, { t: 0.96, r: 3, m: 2.2, knock: 1, shake: 0.35, stop: 0.06 }] },
    desc: 'หมุนดาบเป็นวงเพลิงกลางกลุ่มศัตรู ฟัน 3 รอบแล้วระเบิดวงไฟผลักทุกตัวกระเด็น — เก็บมอนเป็นกลุ่ม',
    effect: (lv) => `3 × ${pct(0.6 + lv * 0.07)}% + ระเบิด ${pct((0.6 + lv * 0.07) * 2.2)}% ATK รอบเป้า 2.8 ช่อง · ผลักกระเด็น`,
  },
  crimson_judgement: {
    job: 'swordsman', name: 'ดาบเพลิงพิพากษา', maxLv: 5, kind: 'active', target: 'enemy', icon: ['crimsonsword', '#ff3a1a'], req: { blazing_dash: 5, inferno_whirl: 3 },
    sp: (lv) => 55 + lv * 4, cast: 0.3, cd: 10, range: 6, vfx: 'sw_crimson_judgement', ref: 1, lock: 2.6, delay: 0.9, element: 'fire', hitBonus: () => 40, knock: 2,
    mult: (lv) => 2.6 + lv * 0.5,
    nf: { anim: 'jump', animDur: 0.6, sky: { t: 0, dark: 0.55, dur: 3.6 }, lift: { t: 0.36, h: 1.6, dur: 0.35, hold: 0.8 }, flashes: [{ t: 1.49, a: 0.5, color: '#ffac46' }, { t: 2.4, a: 0.6, color: '#ffac46' }], hits: [{ t: 1.49, r: 3.2, m: 1, shake: 1, stop: 0.12 }, { t: 2.4, r: 3.4, m: 0.7, knock: 1, shake: 0.6, stop: 0.08 }] },
    desc: 'ฟ้ามืดลง กระโดดขึ้นฟ้าแล้วอัญเชิญดาบเพลิงยักษ์ปักลงกลางศัตรู พื้นแตกระเบิด แล้วดาบระเบิดซ้ำอีกครั้งผลักทุกอย่างกระเด็น (ไม้ตาย)',
    effect: (lv) => `${pct(2.6 + lv * 0.5)}% + ${pct((2.6 + lv * 0.5) * 0.7)}% ATK รอบเป้า 3.2–3.4 ช่อง · ผลักกระเด็น · คูลดาวน์ 10 วิ`,
  },

  /* ---------- Mage · สกิลติดตัว (v0.60) + ชุดกดใช้ "จอมเวทอาคม" (v0.71) ---------- */
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
  /* v0.71 Mage ชุดใหม่ "จอมเวทอาคม" (เอฟเฟกต์ 3 มิติในฉาก fx_ma_*) — แทนชุด "เวทพิศวงสีม่วง" v0.60 (หอกเพลิง/น้ำแข็ง/สายฟ้า/พายุหิมะ/เกราะ/อุกกาบาต) */
  arcane_bolt: {
    job: 'mage', name: 'ลูกพลังเวท', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['orb', '#c06aff'],
    sp: (lv) => 8 + lv, cast: 0.2, cd: 0.5, range: 9, vfx: 'ma_arcane_bolt', ref: 1, lock: 0.4, delay: 0.3, engage: true,
    mult: (lv) => 1.25 + lv * 0.16,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.38, m: 1, shake: 0.06 }, { t: 0.46, r: 1, m: 0.3 }] },
    desc: 'วาดอักขระเวทที่ปลายไม้เท้า แล้วยิงลูกพลังเวทหมุนวนพุ่งเข้าเป้า ระเบิดเป็นเกล็ดอักขระ ลามศัตรูชิดเป้า — สกิลเวทหลัก ร่ายไว',
    effect: (lv) => `${pct(1.25 + lv * 0.16)}% MATK + ลาม ${pct((1.25 + lv * 0.16) * 0.3)}% รอบเป้า 1 ช่อง · คูลดาวน์ 0.5 วิ`,
  },
  rune_burst: {
    job: 'mage', name: 'ระเบิดรูน', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['burst', '#b06aff'], req: { arcane_bolt: 3 },
    sp: (lv) => 18 + lv * 2, cast: 0.5, cd: 3, range: 9, vfx: 'ma_rune_burst', ref: 1, lock: 0.6, delay: 0.5, knock: 1,
    mult: (lv) => 1.0 + lv * 0.12,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.55, r: 2.4, m: 0.6, shake: 0.1 }, { t: 0.9, r: 2.8, m: 1.4, knock: 1, shake: 0.3, stop: 0.05 }] },
    desc: 'วงรูนเปิดใต้ศัตรู อักขระลอยหมุนขึ้น ลำแสงเวท 6 สายตกลงรอบวง แล้วลำแสงใหญ่กลางวงระเบิดผลักศัตรูกระเด็น — สกิลโจมตีหมู่',
    effect: (lv) => `${pct((1.0 + lv * 0.12) * 0.6)}% + ${pct((1.0 + lv * 0.12) * 1.4)}% MATK รอบเป้า 2.4–2.8 ช่อง · ผลักถอย`,
  },
  thunder_pillar: {
    job: 'mage', name: 'เสาสายฟ้า', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['bolt', '#d0a0ff'], req: { arcane_bolt: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0.6, cd: 4, range: 9, vfx: 'ma_thunder_pillar', ref: 1, lock: 0.7, delay: 0.5, element: 'wind',
    mult: (lv) => 0.8 + lv * 0.1, stun: (lv) => 0.15 + lv * 0.03, stunSecs: 1.2,
    nf: { magic: true, anim: 'cast', flashes: [{ t: 1.0, a: 0.25, color: '#e2c8ff' }], hits: [{ t: 0.5, r: 2.6, m: 0.7 }, { t: 0.75, r: 2.6, m: 0.7 }, { t: 1.0, r: 2.8, m: 1.4, stun: 1.2, shake: 0.3, stop: 0.05 }] },
    desc: 'วงเรียกสายฟ้าเปิดใต้ศัตรู เสาสายฟ้าม่วงพุ่งจากพื้นขึ้นฟ้า แตกสายฟ้าฟาดศัตรูรอบ ๆ 3 จังหวะ จังหวะสุดท้ายมีโอกาสทำให้มึน',
    effect: (lv) => `2 × ${pct((0.8 + lv * 0.1) * 0.7)}% + ${pct((0.8 + lv * 0.1) * 1.4)}% MATK รอบเป้า 2.6–2.8 ช่อง · มึน ${15 + lv * 3}% 1.2 วิ`,
  },
  mana_shield: {
    job: 'mage', name: 'โล่มานา', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#a070ff'], req: { arcane_focus: 3 },
    sp: 28, cast: 0, cd: 1, vfx: 'ma_mana_shield', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast', flashes: [{ t: 0.35, a: 0.12, color: '#e2c8ff' }], texts: [{ t: 0.4, text: 'SHIELD ▲' }] },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ dmgReduce: 8 + lv * 1.5, mdef: lv * 2, matkPct: lv }),
    desc: 'วงรูนใต้เท้าหมุน ผลึกมานาโคจรรอบตัวแล้วรวมเป็นโดมพลังลายรังผึ้ง ลดดาเมจที่ได้รับและเพิ่มพลังเวท',
    effect: (lv) => `ดาเมจที่ได้รับ -${(8 + lv * 1.5).toFixed(1)}% · MDEF +${lv * 2} · MATK +${lv}% นาน ${60 + lv * 6} วิ`,
  },
  arcane_cataclysm: {
    job: 'mage', name: 'มหาวิบัติเวท', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['meteor', '#9a4aff'], req: { rune_burst: 3, thunder_pillar: 3 },
    sp: (lv) => 55 + lv * 5, cast: (lv) => 1.6 - lv * 0.12, cd: 10, range: 9, vfx: 'ma_arcane_cataclysm', ref: 1, lock: 1.2, delay: 1.0, knock: 1.5,
    mult: (lv) => 1.3 + lv * 0.25,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.6, dur: 3.8 }, flashes: [{ t: 3.0, a: 0.6, color: '#e2c8ff' }], hits: [{ t: 1.4, r: 2.6, m: 0.8, shake: 0.2 }, { t: 2.0, r: 2.6, m: 0.8, shake: 0.2 }, { t: 3.0, r: 3.6, m: 3, knock: 1, shake: 1, stop: 0.12 }] },
    desc: 'ฟ้ามืดลง วงเวทยักษ์ 2 ชั้นหมุนสวนกันใต้ศัตรู แสงเวทส่องจากฟ้า อุกกาบาตเวทลูกเล็ก 2 ลูกถล่มก่อน แล้วอุกกาบาตยักษ์ตกกลางวงระเบิดผลักทุกตัวกระเด็น (ไม้ตาย)',
    effect: (lv) => `2 × ${pct((1.3 + lv * 0.25) * 0.8)}% + ลูกยักษ์ ${pct((1.3 + lv * 0.25) * 3)}% MATK รอบเป้า 2.6–3.6 ช่อง · ร่าย ${(1.6 - lv * 0.12).toFixed(2)} วิ · คูลดาวน์ 10 วิ`,
  },

  /* ---------- Archer · v0.60.1 ชุดใหม่ "พรานศรทะลวง" (ลูกธนูจริง + ภาพ Night Forge · ดาเมจตามจังหวะใน sk.nf) ---------- */
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
  /* v0.66 Archer ชุดใหม่ "นักธนูแสงดาว" (sprite sheet มุมข้าง 24 fps จากผู้พัฒนา · วางที่เท้าผู้ร่าย หันหาเป้า) — แทนชุด "พรานศรทะลวง" */
  star_shot: {
    job: 'archer', name: 'ยิงดารา', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['starshot', '#ffd06a'],
    sp: (lv) => 6 + lv, cast: 0, cd: 0.4, range: 9, vfx: 'ar_star_shot', ref: 1, lock: 0.4, delay: 0.25, engage: true, hitBonus: (lv) => lv * 5,
    mult: (lv) => 1.3 + lv * 0.16,
    nf: { anim: 'shoot', hits: [{ t: 0.56, r: 1, m: 1, shake: 0.1, stop: 0.05 }] },
    desc: 'รวมแสงดาวที่คันธนูแล้วปล่อยศรทองพุ่งเข้าเป้า ปักแล้วแตกเป็นดาวแปดแฉก — สกิลยิงหลัก ใช้ได้ถี่',
    effect: (lv) => `${pct(1.3 + lv * 0.16)}% ATK (ลามรอบเป้า 1 ช่อง) · HIT +${lv * 5} · คูลดาวน์ 0.4 วิ`,
  },
  comet_pierce: {
    job: 'archer', name: 'ศรดาวหาง', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['comet', '#ffc04a'], req: { star_shot: 3 },
    sp: (lv) => 16 + lv * 2, cast: 0.3, cd: 2.5, range: 10, vfx: 'ar_comet_pierce', ref: 1, lock: 0.7, delay: 0.4, hitBonus: () => 40, knock: 1,
    mult: (lv) => 2.4 + lv * 0.26,
    nf: { anim: 'shoot', animDur: 0.6, sky: { t: 0, dark: 0.3, dur: 1.4 }, hits: [{ t: 0.86, line: { len: 11, w: 1 }, m: 1, knock: 1, shake: 0.3, stop: 0.05 }] },
    desc: 'ฟ้ามืดลง ชาร์จแสงดาวเต็มแรงแล้วยิงศรดาวหาง ทะลุทุกตัวในแนวยาว 11 ช่อง แต่ละตัวที่โดนแตกเป็นดาว — ศรเดียวที่แรงที่สุด',
    effect: (lv) => `${pct(2.4 + lv * 0.26)}% ATK ทุกตัวในแนว 11 ช่อง · HIT +40 · ผลักถอย`,
  },
  starburst_volley: {
    job: 'archer', name: 'ศรกระจายดารา', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['starburst', '#ffe08a'], req: { star_shot: 3 },
    sp: (lv) => 20 + lv * 2, cast: 0.2, cd: 3, range: 10, vfx: 'ar_starburst_volley', ref: 1, lock: 0.5, delay: 0.45, hitBonus: () => 20,
    mult: (lv) => 0.7 + lv * 0.09,
    nf: { anim: 'shoot', flashes: [{ t: 0.61, a: 0.15, color: '#ffe8aa' }], hits: [{ t: 1.03, r: 2.8, m: 1 }, { t: 1.19, r: 2.8, m: 1 }, { t: 1.37, r: 3, m: 1.2, shake: 0.15 }] },
    desc: 'ยิงศรขึ้นฟ้า ศรแตกเป็นดาว แล้วกลายเป็นศร 14 ดอกโค้งตกใส่ศัตรูรอบเป้า 3 ระลอก — สกิลยิงหมู่',
    effect: (lv) => `2 × ${pct(0.7 + lv * 0.09)}% + ${pct((0.7 + lv * 0.09) * 1.2)}% ATK รอบเป้า 2.8–3 ช่อง`,
  },
  constellation_mark: {
    job: 'archer', name: 'ผูกกลุ่มดาว', maxLv: 10, kind: 'active', target: 'self', icon: ['constellation', '#bcd2ff'], req: { keen_eye: 3 },
    sp: 24, cast: 0, cd: 1, vfx: 'ar_constellation_mark', lock: 0.4, delay: 0.4,
    nf: { at: 'self', anim: 'cast', texts: [{ t: 0.31, text: 'CRIT ▲' }] },
    duration: (lv) => 90 + lv * 9, bonus: (lv) => ({ dex: 2 + lv, crit: lv * 0.006, critDmgPct: lv * 3, rangeTiles: 1 + Math.floor(lv / 4), rangedPct: lv }),
    desc: 'วงกลุ่มดาวหมุนใต้เท้า เส้นแสงผูกศัตรูรอบตัวเป็นกลุ่มดาวแล้วล็อกเป้า คริติคอลบ่อยขึ้น แรงขึ้น และยิงได้ไกลขึ้น',
    effect: (lv) => `DEX +${2 + lv} · คริ +${(lv * 0.6).toFixed(1)}% · คริดาเมจ +${lv * 3}% · ระยะยิง +${1 + Math.floor(lv / 4)} ช่อง · ดาเมจระยะไกล +${lv}% นาน ${90 + lv * 9} วิ`,
  },
  starfall_rain: {
    job: 'archer', name: 'ฝนดาวตก', maxLv: 5, kind: 'active', target: 'enemy', bow: true, icon: ['starfall', '#ffd06a'], req: { comet_pierce: 5, starburst_volley: 3 },
    sp: (lv) => 55 + lv * 4, cast: 0.6, cd: 10, range: 10, vfx: 'ar_starfall_rain', ref: 1, lock: 1.2, delay: 0.9, element: 'holy', hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 0.9 + lv * 0.18, stun: () => 0.5, stunSecs: 1.5,
    nf: { anim: 'shoot', animDur: 0.6, sky: { t: 0, dark: 0.6, dur: 4 }, flashes: [{ t: 0.61, a: 0.15, color: '#ffe8aa' }, { t: 2.89, a: 0.5, color: '#ffe8aa' }],
      hits: [{ t: 1.39, r: 3, m: 0.6 }, { t: 1.67, r: 3, m: 0.6 }, { t: 1.94, r: 3, m: 0.6 }, { t: 2.22, r: 3, m: 0.6, shake: 0.1 }, { t: 2.5, r: 3, m: 0.6, shake: 0.1 }, { t: 2.89, r: 3.4, m: 4, knock: 1, stun: 1, shake: 1, stop: 0.14 }] },
    desc: 'ฟ้ามืดลง ยิงศร 3 ดอกขึ้นฟ้าเปิดวงกลุ่มดาว ฝนศรดาวหลายสิบดอกเทลงทั่ววง แล้วศรอุกกาบาตยักษ์ดิ่งลงกลางวง ระเบิดแสงดาวผลักทุกตัวกระเด็น (ไม้ตาย)',
    effect: (lv) => `5 × ${pct((0.9 + lv * 0.18) * 0.6)}% + อุกกาบาต ${pct((0.9 + lv * 0.18) * 4)}% ATK รอบเป้า 3–3.4 ช่อง · ธาตุศักดิ์สิทธิ์ · มึน 50% · คูลดาวน์ 10 วิ`,
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
  /* v0.68 Acolyte "นักบวชแสง" จัดใหม่: โจมตี 2 (แสงศักดิ์สิทธิ์ · ลำแสงพิพากษา) · ฮีล/บัฟ 2 (ลำแสงฟื้นฟู · พรแห่งแสง) · ไม้ตายโจมตี 1 (เทพพิทักษ์จุติ)
     ภาพเป็นเอฟเฟกต์ 3 มิติในฉาก (js/render/HealFX.js) · สกิลโจมตีไม่ฮีล · สกิลฮีล/บัฟไม่ตีศัตรู */
  holy_light: {
    job: 'acolyte', name: 'แสงศักดิ์สิทธิ์', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['holyorb', '#ffd86b'], req: { faith_heart: 1 },
    sp: (lv) => 10 + lv * 2, cast: 0.18, cd: 0.7, range: 9, vfx: 'ac_holy_light', ref: 1, lock: 0.3, delay: 0.24, engage: true, element: 'holy',
    mult: (lv) => 1.4 + lv * 0.17,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.48, r: 1.2, m: 1, shake: 0.14 }] },
    desc: 'ปั้นลูกแสงทองในมือแล้วปล่อยพุ่งโค้งเข้าเป้า ระเบิดเป็นกางเขนแสงทับศัตรูรอบข้าง — สกิลโจมตีหลัก (แรงพิเศษต่ออันเดด)',
    effect: (lv) => `${pct(1.4 + lv * 0.17)}% MATK รอบเป้า 1.2 ช่อง · ธาตุศักดิ์สิทธิ์`,
  },
  judgement_rays: {
    job: 'acolyte', name: 'ลำแสงพิพากษา', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['rays', '#ffe08a'], req: { holy_light: 3 },
    sp: (lv) => 24 + lv * 2, cast: 0.3, cd: 3, range: 9, vfx: 'ac_judgement_rays', ref: 1, lock: 0.45, delay: 0.35, element: 'holy', knock: 1,
    mult: (lv) => 0.6 + lv * 0.08,
    nf: { magic: true, anim: 'cast', flashes: [{ t: 1.0, a: 0.3, color: '#ffe496' }], hits: [{ t: 0.4, r: 2.8, m: 1, shake: 0.12 }, { t: 0.6, r: 2.8, m: 1, shake: 0.12 }, { t: 0.8, r: 2.8, m: 1, shake: 0.14 }, { t: 1.0, r: 3.2, m: 2.2, knock: 1, shake: 0.4, stop: 0.06 }] },
    desc: 'วงพิพากษาเปิดใต้กลุ่มศัตรู ลำแสงจากฟ้าฟาดลง 3 ระลอก แล้วเสาแสงใหญ่ระเบิดกลางวงผลักทุกตัวถอย — สกิลโจมตีหมู่ (แรงพิเศษต่ออันเดด)',
    effect: (lv) => `3 × ${pct(0.6 + lv * 0.08)}% + ${pct((0.6 + lv * 0.08) * 2.2)}% MATK รอบเป้า 2.8–3.2 ช่อง · ธาตุศักดิ์สิทธิ์ · ผลักถอย`,
  },
  healing_pillar: {
    job: 'acolyte', name: 'ลำแสงฟื้นฟู', maxLv: 10, kind: 'active', target: 'self', icon: ['pillar', '#fff0a0'],
    sp: (lv) => 12 + lv * 3, cast: 0, cd: 1, vfx: 'ac_healing_pillar', lock: 0.3, delay: 0.21, heal: (lv, pl) => Math.round(healAmount(lv, pl) * 1.4),
    nf: { at: 'self', anim: 'cast', flashes: [{ t: 0.28, a: 0.12, color: '#ffe496' }], heals: [0.32] },
    desc: 'ลำแสงทองส่องลงจากฟ้าตรงร่าง ขนนกแสงโปรยรอบตัว ฟื้นฟูบาดแผลก้อนใหญ่ ยิ่ง Base Lv และ INT สูงยิ่งฟื้นมาก — ฮีลหลัก',
    effect: (lv, pl) => `ฟื้น HP ${Math.round(healAmount(lv, pl) * 1.4)}`,
  },
  light_blessing: {
    job: 'acolyte', name: 'พรแห่งแสง', maxLv: 10, kind: 'active', target: 'self', icon: ['bless', '#ffe08a'], req: { healing_pillar: 3 },
    sp: (lv) => 24 + lv * 3, cast: 0, cd: 1, vfx: 'ac_light_blessing', lock: 0.3, delay: 0.28,
    nf: { at: 'self', anim: 'cast', flashes: [{ t: 0.25, a: 0.12, color: '#ffe496' }], texts: [{ t: 0.3, text: 'ATK ▲' }] },
    duration: (lv) => 90 + lv * 15, bonus: (lv) => ({ str: lv, dex: lv, int: lv, atkPct: lv, matkPct: lv, dmgReduce: 4 + lv }),
    desc: 'วงแสงทองแผ่ออกจากเท้าแล้วโปรยประกายขึ้นฟ้า อวยพรเพิ่ม STR DEX INT พลังโจมตีทั้งกายภาพและเวท และลดดาเมจที่ได้รับ',
    effect: (lv) => `STR/DEX/INT +${lv} · ATK/MATK +${lv}% · ดาเมจที่ได้รับ -${4 + lv}% นาน ${90 + lv * 15} วิ`,
  },
  divine_descent: {
    job: 'acolyte', name: 'เทพพิทักษ์จุติ', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['divine', '#ffd36b'], req: { judgement_rays: 5, light_blessing: 3 },
    sp: (lv) => 60 + lv * 5, cast: 0.6, cd: 12, range: 9, vfx: 'ac_divine_descent', ref: 1, lock: 1.2, delay: 0.8, element: 'holy', knock: 1.5,
    mult: (lv) => 1.4 + lv * 0.3, stun: () => 0.6, stunSecs: 1.5,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.6, dur: 3 }, flashes: [{ t: 0.1, a: 0.2, color: '#ffba46' }, { t: 2.1, a: 0.7, color: '#ffe496' }],
      hits: [{ t: 0.95, r: 3.2, m: 0.6, shake: 0.15 }, { t: 1.25, r: 3.2, m: 0.6, shake: 0.15 }, { t: 1.55, r: 3.2, m: 0.6, shake: 0.2 }, { t: 2.1, r: 3.8, m: 3.2, knock: 1, stun: 1, shake: 1, stop: 0.12 }] },
    desc: 'ฟ้ามืดลง ปีกแสงทองกางออกหลังร่าง วงพิพากษายักษ์เปิดกลางศัตรู ลำแสงสวรรค์ถล่มลง 3 ระลอก แล้วกางเขนแสงยักษ์ระเบิดกลางวง ผลักทุกตัวกระเด็นและมีโอกาสมึน (ไม้ตาย)',
    effect: (lv) => `3 × ${pct((1.4 + lv * 0.3) * 0.6)}% + ${pct((1.4 + lv * 0.3) * 3.2)}% MATK รอบเป้า 3.2–3.8 ช่อง · ธาตุศักดิ์สิทธิ์ · มึน 60% · คูลดาวน์ 12 วิ`,
  },
};

Object.assign(SKILLS, JOB2_SKILLS);
Object.assign(SKILLS, job3Skills(healAmount));   // v0.85

// v0.65.2 ฮีล/บัฟ/โล่ของสายนักบวช ส่งถึงเพื่อนในปาร์ตี้ที่อยู่แมพเดียวกันในรัศมี (ช่อง) — Game.supportParty / Social.sendSupport
// ลูกแสง/เมล็ดชีวิต (ดูดเลือดกลับตัวเอง) ไม่อยู่ในรายการ
// v0.68 สายฮีลแยกโจมตี/ฮีลแล้ว → เฉพาะสกิลฮีล/บัฟ 4 สกิล (ไม้ตายเป็นโจมตีล้วน)
export const PARTY_SUPPORT = { healing_pillar: 6, light_blessing: 6, healing_rain: 6, lotus_sanctuary: 5, ...JOB3_PARTY };
for (const [id, r] of Object.entries(PARTY_SUPPORT)) {
  const sk = SKILLS[id]; if (!sk) continue;
  sk.party = r;
  const ef = sk.effect;
  if (typeof ef === 'function') sk.effect = (lv, pl) => `${ef(lv, pl)} · มีผลกับเพื่อนในปาร์ตี้ในรัศมี ${r} ช่องด้วย`;
}

// ตัวช่วยอ่านค่าที่อาจเป็นตัวเลขหรือฟังก์ชัน
export const sval = (v, lv, pl) => (typeof v === 'function' ? v(lv, pl) : v);
export const skillSp = (sk, lv) => sval(sk.sp, lv) || 0;
export const skillCast = (sk, lv) => sval(sk.cast, lv) || 0;

// สกิลของสายอาชีพนั้น (เรียงตามที่ประกาศ)
export const jobSkills = (job) => Object.keys(SKILLS).filter((id) => SKILLS[id].job === job);

// สกิลที่อาชีพนี้เรียนได้ (อาชีพแรกเรียนสกิล Novice ได้ด้วย)
export const skillTrees = (job) => {   // v0.31: ขั้น 2 เรียนสกิลขั้น 1 ต่อได้ · v0.85: คลาส 3 เรียนได้ทั้งสาย
  if (job === 'novice' || !JOBS[job]) return ['novice'];
  const line = [job]; let j = job;
  while (JOBS[j] && JOBS[j].parent) { j = JOBS[j].parent; line.unshift(j); }
  return ['novice', ...line];
};   // v0.31: ขั้น 2 เรียนสกิลขั้น 1 ต่อได้

export const KIND_NAME = { passive: 'ติดตัว', active: 'กดใช้' };
export const jobName = (job) => (JOBS[job] || JOBS.novice).name;
