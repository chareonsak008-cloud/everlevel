// สกิลทั้งหมด — ปรับสมดุลสกิลได้จากไฟล์นี้
// kind: passive = ติดตัว | active = กดใช้
// target: enemy = เลือกศัตรู (ใช้เป้าหมายปัจจุบัน หรือตัวที่ใกล้ที่สุด) | self = ใช้กับตัวเอง/รอบตัว
// ค่าที่เป็นฟังก์ชันรับ (lv, player) แล้วคืนค่าตามเลเวลสกิล
// v0.8: vfx = ชื่อเอฟเฟกต์ใน SkillFX (จังหวะดาเมจเข้าตามภาพ) · ref = ตัวคูณอ้างอิงของฮิตหลักในเอฟเฟกต์
//       ดาเมจจริงต่อฮิต = (ตัวคูณของฮิตนั้นในเอฟเฟกต์ / ref) × mult(lv)
//       lock = วินาทีที่ยืนนิ่งระหว่างท่า · delay = หน่วงก่อนใช้สกิลถัดไป (after-cast delay)
// fx (แบบเก่า v0.6) ยังใช้กับสกิลที่ไม่มี vfx: strike | nova | bolt | storm | arrows | rain | heal | buff
import { JOBS } from './progression.js';

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

  /* ---------- Swordsman ---------- */
  sword_mastery: {
    job: 'swordsman', name: 'เชี่ยวชาญดาบ', maxLv: 10, kind: 'passive', icon: ['swordup', '#ff8a6a'],
    desc: 'ฝึกฝนการใช้ดาบและมีดจนชำนาญ',
    effect: (lv) => `ATK +${lv * 4} เมื่อใช้ดาบหรือมีด`,
    passive: (lv, pl) => (['sword', 'knife'].includes(pl.weaponType) ? { atkFlat: lv * 4 } : {}),
  },
  iron_body: {
    job: 'swordsman', name: 'ร่างเหล็ก', maxLv: 10, kind: 'passive', icon: ['shield', '#c3c9d3'],
    desc: 'ฝึกร่างกายให้แกร่งดั่งเหล็กกล้า',
    effect: (lv) => `Max HP +${lv * 3}% · DEF +${lv} · ฟื้น HP +${lv * 5}%`,
    passive: (lv) => ({ maxHpPct: lv * 3, def: lv, regenPct: lv * 5 }),
  },
  power_slash: {
    job: 'swordsman', name: 'ฟาดสะท้าน', maxLv: 10, kind: 'active', target: 'enemy', icon: ['slash', '#ff6a3a'],
    sp: (lv) => (lv <= 5 ? 8 : 15), cast: 0, cd: 0.6, range: 'weapon', fx: 'strike',
    vfx: 'power_slash', ref: 2.8, lock: 0.35, delay: 0.3, engage: true, stunSecs: 2.5,
    mult: (lv) => 1.3 + lv * 0.3, hitBonus: (lv) => lv * 5, stun: (lv) => (lv >= 6 ? (lv - 5) * 0.06 : 0),
    desc: 'ฟันไขว้เป็นรูปกากบาทใส่ศัตรูหนึ่งตัว ตั้งแต่ Lv.6 มีโอกาสทำให้ศัตรูมึน',
    effect: (lv) => `ดาเมจ ${130 + lv * 30}% · HIT +${lv * 5}${lv >= 6 ? ` · มึน ${(lv - 5) * 6}%` : ''}`,
  },
  ground_burst: {
    job: 'swordsman', name: 'คลื่นปะทุ', maxLv: 10, kind: 'active', target: 'self', icon: ['burst', '#ffb03a'], req: { power_slash: 5 },
    sp: 30, cast: 0.3, cd: 2, fx: 'nova', vfx: 'ground_burst', ref: 2.4, lock: 0.75, delay: 0.6,
    mult: (lv) => 2 + lv * 0.2, radius: 3.5, knock: 2, hitBonus: () => 20,
    desc: 'กระโดดทุบพื้น วงไฟระเบิดออกรอบตัว เสาเพลิงพุ่งขึ้นเป็นวง และผลักศัตรูกระเด็น',
    effect: (lv) => `ดาเมจ ${200 + lv * 20}% รอบตัว 3.5 ช่อง · ผลักกระเด็น`,
  },
  blade_cyclone: {
    job: 'swordsman', name: 'พายุใบมีด', maxLv: 10, kind: 'active', target: 'self', icon: ['cyclone', '#ff8a4a'], req: { power_slash: 5 },
    sp: 24, cast: 0, cd: 1.5, vfx: 'blade_cyclone', ref: 0.9, lock: 1.05, delay: 0.7, hitBonus: () => 10,
    mult: (lv) => 0.8 + lv * 0.1,
    desc: 'หมุนตัวฟันรอบทิศจนเกิดพายุใบมีด ตีศัตรูรอบตัวต่อเนื่อง 4 ครั้ง',
    effect: (lv) => `4 ครั้ง × ${pct(0.8 + lv * 0.1)}% รอบตัว 3 ช่อง`,
  },
  sky_cleave: {
    job: 'swordsman', name: 'ดาบสวรรค์', maxLv: 5, kind: 'active', target: 'enemy', icon: ['skysword', '#e0a640'], req: { ground_burst: 5, blade_cyclone: 3 },
    sp: (lv) => 40 + lv * 2, cast: 0.3, cd: 8, range: 4, vfx: 'sky_cleave', ref: 4.2, lock: 1.0, delay: 1.0, hitBonus: () => 30,
    mult: (lv) => 3.5 + lv * 0.7,
    desc: 'กระโดดขึ้นฟ้าเรียกดาบทองยักษ์ฟาดลงใส่เป้าหมาย พื้นแตกระเบิด ทำร้ายศัตรูรอบจุดตก (ไม้ตาย)',
    effect: (lv) => `${pct(3.5 + lv * 0.7)}% รอบเป้า 2.5 ช่อง · คูลดาวน์ 8 วิ`,
  },
  battle_cry: {
    job: 'swordsman', name: 'เสียงคำรามศึก', maxLv: 10, kind: 'active', target: 'self', icon: ['roar', '#e8483a'], req: { sword_mastery: 3 },
    sp: 20, cast: 0, cd: 1, vfx: 'battle_cry', lock: 0.6, delay: 0.5,
    duration: (lv) => span(lv, 10, 60, 120), bonus: (lv) => ({ atkPct: span(lv, 10, 5, 25) }),
    desc: 'คำรามปลุกไฟแห่งการต่อสู้ ออร่าเพลิงลุกโชน เพิ่มพลังโจมตีชั่วคราว',
    effect: (lv) => `ATK +${span(lv, 10, 5, 25)}% นาน ${span(lv, 10, 60, 120)} วิ`,
  },
  iron_will: {
    job: 'swordsman', name: 'ใจเหล็ก', maxLv: 10, kind: 'active', target: 'self', icon: ['steel', '#6a8ac8'], req: { iron_body: 5 },
    sp: 18, cast: 0, cd: 1, vfx: 'iron_will', lock: 0.8, delay: 0.6,
    duration: () => 30, bonus: (lv) => ({ defPct: span(lv, 10, 10, 30), def: lv }),
    desc: 'เศษเหล็กหมุนวนรอบตัวแล้วประกอบเป็นเกราะพลังสีฟ้า เพิ่มพลังป้องกันชั่วคราว',
    effect: (lv) => `DEF +${span(lv, 10, 10, 30)}% และ +${lv} นาน 30 วิ`,
  },

  /* ---------- Mage ---------- */
  flame_bolt: {
    job: 'mage', name: 'ลูกไฟ', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['flame', '#ff6a2a'],
    sp: (lv) => 10 + lv * 2, cast: (lv) => 0.3 + lv * 0.15, cd: 0.8, range: 9, fx: 'bolt', color: '#ff7a2a',
    vfx: 'flame_bolt', ref: 1, count: (lv) => lv, lock: 0.4, delay: 0.35,
    hits: (lv) => lv, mult: () => 1,
    desc: 'ลูกไฟร่วงจากฟ้าใส่ศัตรู จำนวนลูกเท่ากับเลเวลสกิล ทุกลูกที่ตกเป็นเสาไฟพุ่งขึ้น',
    effect: (lv) => `${lv} ลูก × 100% MATK · ร่าย ${(0.3 + lv * 0.15).toFixed(2)} วิ`,
  },
  frost_lance: {
    job: 'mage', name: 'หอกน้ำแข็ง', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['ice', '#7fd8ff'],
    sp: (lv) => 10 + lv * 2, cast: (lv) => 0.4 + lv * 0.15, cd: 1, range: 9, fx: 'bolt', color: '#9ae8ff',
    vfx: 'frost_lance', ref: 1, count: (lv) => lv, lock: 0.4, delay: 0.35, freezeSecs: 3,
    hits: (lv) => lv, mult: () => 1, freeze: (lv) => 0.3 + lv * 0.04,
    desc: 'ยิงหอกน้ำแข็ง มีโอกาสแช่แข็งศัตรูจนขยับไม่ได้ 3 วินาที',
    effect: (lv) => `${lv} ลูก × 100% MATK · แช่แข็ง ${30 + lv * 4}%`,
  },
  fire_ball: {
    job: 'mage', name: 'ไฟร์บอล', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['fireball', '#ff7a2a'], req: { flame_bolt: 4 },
    sp: (lv) => 20 + lv, cast: 0.8, cd: 1, range: 9, color: '#ff7a2a', vfx: 'fire_ball', ref: 2.6, lock: 0.8, delay: 0.6, knock: 1,
    mult: (lv) => 1.6 + lv * 0.1,
    desc: 'รวบรวมพลังไฟที่ฝ่ามือ ปาลูกไฟใหญ่โค้งไปหาเป้า ระเบิดเป็นลูกเพลิงลามถึงศัตรูรอบข้าง',
    effect: (lv) => `${pct(1.6 + lv * 0.1)}% MATK · รอบข้าง ${pct(((1.6 + lv * 0.1) * 1.6) / 2.6)}% รัศมี 2.5 ช่อง`,
  },
  meteor_storm: {
    job: 'mage', name: 'อุกกาบาตถล่ม', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['meteor', '#c8381a'], req: { fire_ball: 5 },
    sp: (lv) => 60 + lv * 4, cast: (lv) => 2.2 - lv * 0.2, cd: 6, range: 9, color: '#ff5a2a', vfx: 'meteor_storm', ref: 1.7, lock: 1.0, delay: 1.5,
    mult: (lv) => 1 + lv * 0.14,
    desc: 'ท้องฟ้ามืดลง อุกกาบาตเพลิง 9 ลูกถล่มรอบเป้าหมาย แล้วปิดท้ายด้วยอุกกาบาตยักษ์กลางวง (ไม้ตาย)',
    effect: (lv) => `9 ลูก × ${pct(1 + lv * 0.14)}% + ลูกยักษ์ ${pct(((1 + lv * 0.14) * 3.6) / 1.7)}% · ร่าย ${(2.2 - lv * 0.2).toFixed(1)} วิ`,
  },
  frost_storm: {
    job: 'mage', name: 'พายุหิมะ', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['snow', '#4ab0e8'], req: { frost_lance: 5 },
    sp: (lv) => 40 + lv * 2, cast: 1.5, cd: 4, range: 9, color: '#8ad8ff', vfx: 'frost_storm', ref: 0.6, lock: 0.8, delay: 1.0, freezeSecs: 2,
    mult: (lv) => 0.33 + lv * 0.027,
    desc: 'พายุหิมะหมุนวนพร้อมผลึกน้ำแข็ง ตีต่อเนื่อง 6 ครั้ง แล้วหนามน้ำแข็งพุ่งทั่ววง แช่แข็งศัตรูทั้งหมด',
    effect: (lv) => `6 ครั้ง × ${pct(0.33 + lv * 0.027)}% + ปิดท้าย ${pct(((0.33 + lv * 0.027) * 1.4) / 0.6)}% · แช่แข็ง 2 วิ`,
  },
  thunder_storm: {
    job: 'mage', name: 'พายุสายฟ้า', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['bolt', '#ffe24a'], req: { flame_bolt: 4 },
    sp: (lv) => 24 + lv * 4, cast: (lv) => 1 + lv * 0.2, cd: 3, range: 9, fx: 'storm', color: '#ffe680',
    vfx: 'thunder_storm', ref: 0.9, lock: 0.9, delay: 0.8,
    hits: (lv) => Math.ceil(lv / 2) + 1, mult: (lv) => 0.6 + lv * 0.04, radius: 3,
    desc: 'เมฆพายุก่อตัวเหนือเป้าหมาย สายฟ้าฟาดลง 11 ครั้ง ปิดท้ายด้วยสายฟ้าใหญ่ใส่เป้าหลักจนมึน',
    effect: (lv) => `11 ครั้ง × ${pct(0.6 + lv * 0.04)}% + สายฟ้าใหญ่ ${pct(((0.6 + lv * 0.04) * 3.2) / 0.9)}% · รัศมี 3 ช่อง`,
  },
  arcane_mind: {
    job: 'mage', name: 'สมาธิเวทย์', maxLv: 10, kind: 'passive', icon: ['orb', '#b48cff'],
    desc: 'ทำจิตใจให้สงบนิ่ง เพิ่มพลังจิตและฟื้นตัวเร็วขึ้น',
    effect: (lv) => `Max SP +${lv * 2}% · ฟื้น SP +${lv * 10}%`,
    passive: (lv) => ({ maxSpPct: lv * 2, spRegenPct: lv * 10 }),
  },
  arcane_shield: {
    job: 'mage', name: 'ม่านพลังเวทย์', maxLv: 5, kind: 'active', target: 'self', icon: ['hexshield', '#9a6ae0'], req: { arcane_mind: 3 },
    sp: 30, cast: 0, cd: 1, vfx: 'arcane_shield', lock: 0.7, delay: 0.5,
    duration: () => 90, bonus: (lv) => ({ dmgReduce: 10 + lv * 2, mdef: lv * 2 }),
    desc: 'วงเวทย์ลอยขึ้นจากพื้น สร้างโล่ฟองพลังลายรังผึ้งสีม่วงครอบตัว ลดดาเมจที่ได้รับ',
    effect: (lv) => `ดาเมจที่ได้รับ -${10 + lv * 2}% · MDEF +${lv * 2} นาน 90 วิ`,
  },

  /* ---------- Archer ---------- */
  hawk_eye: {
    job: 'archer', name: 'ตาเหยี่ยว', maxLv: 10, kind: 'passive', icon: ['eye', '#8fe08a'],
    desc: 'ฝึกสายตาให้คมดั่งเหยี่ยว', effect: (lv) => `DEX +${lv}`,
    passive: (lv) => ({ dex: lv }),
  },
  far_sight: {
    job: 'archer', name: 'สายตาไกล', maxLv: 10, kind: 'passive', icon: ['scope', '#6fc8ff'], req: { hawk_eye: 3 },
    desc: 'ยิงธนูได้ไกลและแม่นยำขึ้น', effect: (lv) => `ระยะยิงธนู +${lv * 0.5} ช่อง · HIT +${lv}`,
    passive: (lv) => ({ hit: lv, rangeTiles: lv * 0.5 }),
  },
  twin_shot: {
    job: 'archer', name: 'ยิงคู่', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['arrow2', '#ffd27a'],
    sp: 12, cast: 0, cd: 0.5, range: 'weapon', fx: 'arrows', vfx: 'twin_shot', ref: 1.5, lock: 0.45, delay: 0.3, engage: true, hitBonus: () => 10,
    hits: () => 2, mult: (lv) => 1 + lv * 0.1,
    desc: 'ยิงลูกธนูเรืองแสงสองดอกติดกันอย่างรวดเร็ว (ต้องใช้ธนู)',
    effect: (lv) => `2 ดอก × ${100 + lv * 10}% ATK`,
  },
  arrow_rain: {
    job: 'archer', name: 'ฝนลูกธนู', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['rain', '#ffb36b'], req: { twin_shot: 5 },
    sp: 15, cast: 0.2, cd: 1.2, range: 'weapon', fx: 'rain', vfx: 'arrow_rain', ref: 0.7, lock: 0.4, delay: 0.5, hitBonus: () => 15,
    mult: (lv) => 0.65 + lv * 0.055, radius: 3, knock: 1,
    desc: 'ยิงธนูนำทางขึ้นฟ้า แล้วลูกธนูกว่า 40 ดอกตกลงเป็นห่าฝนรอบเป้าหมาย ผลักศัตรูกระเด็น (ต้องใช้ธนู)',
    effect: (lv) => `3 ครั้ง × ${pct(0.65 + lv * 0.055)}% ATK รัศมี 3 ช่อง`,
  },
  gale_arrow: {
    job: 'archer', name: 'ศรวายุ', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['gale', '#3ac06a'], req: { arrow_rain: 3 },
    sp: 22, cast: 0, cd: 2, range: 'weapon', vfx: 'gale_arrow', ref: 2.6, lock: 0.8, delay: 0.6, hitBonus: () => 25,
    mult: (lv) => 1.5 + lv * 0.11,
    desc: 'ชาร์จลมเข้าคันธนู ยิงลูกธนูห่อพายุพุ่งทะลุศัตรูทุกตัวในแนวตรงและผลักกระเด็น (ต้องใช้ธนู)',
    effect: (lv) => `${pct(1.5 + lv * 0.11)}% ATK ทุกตัวในแนว 13 ช่อง`,
  },
  phoenix_shot: {
    job: 'archer', name: 'ศรวิหคเพลิง', maxLv: 5, kind: 'active', target: 'enemy', bow: true, icon: ['phoenix', '#ff6a2a'], req: { gale_arrow: 3, twin_shot: 7 },
    sp: 40, cast: 0, cd: 6, range: 'weapon', vfx: 'phoenix_shot', ref: 3.2, lock: 0.75, delay: 0.8, hitBonus: () => 30,
    mult: (lv) => 2 + lv * 0.24,
    desc: 'ลูกธนูกลายเป็นนกเพลิงบินโค้งไปหาเป้า ระเบิดพร้อมขนนกไฟลามถึงศัตรูรอบข้าง (ไม้ตาย · ต้องใช้ธนู)',
    effect: (lv) => `${pct(2 + lv * 0.24)}% · รอบข้าง ${pct(((2 + lv * 0.24) * 1.4) / 3.2)}% · คูลดาวน์ 6 วิ`,
  },
  frost_trap: {
    job: 'archer', name: 'กับดักน้ำแข็ง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['trap', '#4a9ae0'], req: { hawk_eye: 3 },
    sp: 15, cast: 0, cd: 2, range: 6, vfx: 'frost_trap', ref: 1.8, lock: 0.6, delay: 0.5, hitBonus: () => 40,
    mult: (lv) => 1 + lv * 0.08, freezeSecs: (lv) => 1.5 + lv * 0.1,
    desc: 'โยนกับดักไปที่เท้าศัตรู หนามน้ำแข็งพุ่งขึ้นจากพื้น แช่แข็งศัตรูรอบจุดนั้น',
    effect: (lv) => `${pct(1 + lv * 0.08)}% ATK รัศมี 1.5 ช่อง · แช่แข็ง ${(1.5 + lv * 0.1).toFixed(1)} วิ`,
  },
  eagle_focus: {
    job: 'archer', name: 'สมาธิเหยี่ยว', maxLv: 10, kind: 'active', target: 'self', icon: ['eye', '#4ab86a'], req: { hawk_eye: 5 },
    sp: 25, cast: 0, cd: 1, vfx: 'eagle_focus', lock: 0.6, delay: 0.5,
    duration: (lv) => 50 + lv * 10, bonus: (lv) => ({ dex: 2 + lv, agi: 2 + lv, crit: lv * 0.004 }),
    desc: 'ตั้งสมาธิดั่งเหยี่ยว เพิ่มความแม่นยำ ความว่องไว และโอกาสคริติคอล',
    effect: (lv) => `DEX/AGI +${2 + lv} · คริ +${(lv * 0.4).toFixed(1)}% นาน ${50 + lv * 10} วิ`,
  },

  /* ---------- Acolyte ---------- */
  holy_heal: {
    job: 'acolyte', name: 'ฟื้นฟูศักดิ์สิทธิ์', maxLv: 10, kind: 'active', target: 'self', icon: ['cross', '#7aff9a'],
    sp: (lv) => 10 + lv * 3, cast: 0, cd: 1, fx: 'heal', vfx: 'holy_heal', lock: 0.4, delay: 0.3, heal: (lv, pl) => healAmount(lv, pl),
    desc: 'ลำแสงสีเขียวโอบล้อม กางเขนแสงลอยขึ้น รักษาบาดแผลของตนเอง ยิ่ง Base Lv และ INT สูงยิ่งฟื้นมาก',
    effect: (lv, pl) => `ฟื้น HP ${healAmount(lv, pl)}`,
  },
  blessing: {
    job: 'acolyte', name: 'พรแห่งดวงดาว', maxLv: 10, kind: 'active', target: 'self', icon: ['star', '#ffe08a'],
    sp: (lv) => 24 + lv * 4, cast: 0, cd: 1, fx: 'buff', vfx: 'blessing', lock: 0.6, delay: 0.5,
    duration: (lv) => 60 + lv * 20, bonus: (lv) => ({ str: lv, dex: lv, int: lv }),
    desc: 'ลำแสงทองส่องลงจากฟ้า ปีกเทวดากางออก อวยพรเพิ่ม STR DEX INT ชั่วคราว',
    effect: (lv) => `STR/DEX/INT +${lv} นาน ${60 + lv * 20} วิ`,
  },
  swift_wind: {
    job: 'acolyte', name: 'สายลมเร่งฝีเท้า', maxLv: 10, kind: 'active', target: 'self', icon: ['wing', '#9ae8c8'], req: { holy_heal: 3 },
    sp: (lv) => 18 + lv * 3, cast: 0, cd: 1, fx: 'buff', vfx: 'swift_wind', lock: 0.5, delay: 0.4,
    duration: (lv) => 60 + lv * 20, bonus: (lv) => ({ agi: 2 + lv, speedPct: 25 }),
    desc: 'ห่อหุ้มตัวด้วยวงลมหมุน เดินเร็วขึ้นและหลบหลีกเก่งขึ้น',
    effect: (lv) => `AGI +${2 + lv} · ความเร็ว +25% นาน ${60 + lv * 20} วิ`,
  },
  holy_smite: {
    job: 'acolyte', name: 'แสงพิพากษา', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['sun', '#fff2a0'], req: { holy_heal: 1 },
    sp: (lv) => 12 + lv * 2, cast: 0.5, cd: 1, range: 8, fx: 'bolt', color: '#fff2a0', vfx: 'holy_smite', ref: 2.6, lock: 0.45, delay: 0.4,
    hits: () => 1, mult: (lv) => 1.25 + lv * 0.15,
    desc: 'ลำแสงศักดิ์สิทธิ์ผ่าลงจากฟ้าใส่ศัตรู',
    effect: (lv) => `ดาเมจ ${125 + lv * 15}% MATK`,
  },
  sanctuary: {
    job: 'acolyte', name: 'วงศักดิ์สิทธิ์', maxLv: 10, kind: 'active', target: 'self', magic: true, icon: ['sanctum', '#e8c050'], req: { holy_heal: 5 },
    sp: (lv) => 36 + lv, cast: 1, cd: 6, color: '#ffe08a', vfx: 'sanctuary', ref: 0.5, lock: 0.6, delay: 0.8,
    mult: (lv) => 0.3 + lv * 0.02, heal: (lv, pl) => Math.round(healAmount(lv, pl) * 0.35),
    desc: 'กางวงเวทย์ศักดิ์สิทธิ์รอบตัว เสาแสงล้อมรอบ ฟื้น HP ต่อเนื่อง 4 ครั้ง และแผดเผาศัตรูในวง',
    effect: (lv, pl) => `ฟื้น HP ${Math.round(healAmount(lv, pl) * 0.35)} × 4 · ดาเมจ 4 × ${pct(0.3 + lv * 0.02)}% MATK รัศมี 3.5 ช่อง`,
  },
  divine_judgment: {
    job: 'acolyte', name: 'กางเขนพิพากษา', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['judgment', '#e0a640'], req: { holy_smite: 5 },
    sp: (lv) => 55 + lv * 2, cast: 1.2, cd: 8, range: 8, color: '#ffe08a', vfx: 'divine_judgment', ref: 1.6, lock: 1.0, delay: 1.2,
    mult: (lv) => 1 + lv * 0.12,
    desc: 'กางเขนแสงยักษ์ลอยค้างกลางฟ้าแล้วกระแทกลงใส่ศัตรู แสงพิพากษาแผ่ไปทั่ววง (ไม้ตาย)',
    effect: (lv) => `3 ครั้ง × ${pct(1 + lv * 0.12)}% MATK รัศมี 3.5 ช่อง · คูลดาวน์ 8 วิ`,
  },
};

// ตัวช่วยอ่านค่าที่อาจเป็นตัวเลขหรือฟังก์ชัน
export const sval = (v, lv, pl) => (typeof v === 'function' ? v(lv, pl) : v);
export const skillSp = (sk, lv) => sval(sk.sp, lv) || 0;
export const skillCast = (sk, lv) => sval(sk.cast, lv) || 0;

// สกิลของสายอาชีพนั้น (เรียงตามที่ประกาศ)
export const jobSkills = (job) => Object.keys(SKILLS).filter((id) => SKILLS[id].job === job);

// สกิลที่อาชีพนี้เรียนได้ (อาชีพแรกเรียนสกิล Novice ได้ด้วย)
export const skillTrees = (job) => (job === 'novice' ? ['novice'] : ['novice', job]);

export const KIND_NAME = { passive: 'ติดตัว', active: 'กดใช้' };
export const jobName = (job) => (JOBS[job] || JOBS.novice).name;
