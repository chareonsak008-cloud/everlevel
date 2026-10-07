// ระบบเลเวลและค่าสถานะ: ตาราง EXP, แต้มสเตตัส และสูตรคำนวณค่าต่อสู้
// ปรับสมดุลทั้งเกมได้จากไฟล์นี้ไฟล์เดียว

export const MAX_BASE_LEVEL = 99;
export const MAX_STAT = 99;
export const START_STAT_POINTS = 24;   // แต้มเริ่มต้นให้ผู้เล่นใหม่ลองอัปได้ทันที

// อาชีพ: hp/sp = ตัวคูณการเติบโตของ HP/SP · jobExp = ตัวคูณ EXP อาชีพ
// jobStats = สเตตัสโบนัสที่ได้ต่อ 1 Job Level (ปัดลง) · weapons = ชนิดอาวุธที่ใช้ได้
export const JOBS = {
  novice: {
    name: 'Novice', thai: 'เด็กฝึกหัด', crest: 'N', color: '#e8c050', maxJobLevel: 10, hp: 1, sp: 1, jobExp: 1,
    jobStats: {}, weapons: ['none', 'knife', 'sword'],
  },
  swordsman: {
    name: 'Swordsman', thai: 'นักดาบ', crest: 'S', color: '#ff8a6a', maxJobLevel: 99, hp: 1.75, sp: 0.8, jobExp: 2.4,
    jobStats: { str: 0.16, vit: 0.12, dex: 0.06, agi: 0.04 }, weapons: ['none', 'knife', 'sword', 'mace'], gift: 'trainee_blade',
    role: 'แนวหน้า HP สูง ตีหนัก', desc: 'นักรบแนวหน้าผู้ถือดาบ ทนทานที่สุดในบรรดาอาชีพแรก ฟันศัตรูทีละตัวหรือระเบิดพลังใส่ทั้งกลุ่ม',
  },
  mage: {
    name: 'Mage', thai: 'นักเวทย์', crest: 'M', color: '#b48cff', maxJobLevel: 99, hp: 0.8, sp: 2.4, jobExp: 2.4,
    jobStats: { int: 0.18, dex: 0.08, agi: 0.04 }, weapons: ['none', 'knife', 'staff'], gift: 'oak_staff',
    role: 'เวทย์ระยะไกล ดาเมจสูง', desc: 'ผู้ใช้เวทย์ธาตุจากระยะไกล ร่างกายบอบบางแต่พลังทำลายล้างสูง ต้องร่ายเวทย์ก่อนยิง',
  },
  archer: {
    name: 'Archer', thai: 'นักธนู', crest: 'A', color: '#8fe08a', maxJobLevel: 99, hp: 1.1, sp: 1.2, jobExp: 2.4,
    jobStats: { dex: 0.18, agi: 0.08, str: 0.04, luk: 0.04 }, weapons: ['none', 'knife', 'bow'], gift: 'hunter_bow',
    role: 'โจมตีระยะไกล ยิงเร็ว', desc: 'นักแม่นธนูที่โจมตีปกติจากระยะไกลได้ ยิ่ง DEX สูงยิ่งยิงแรงและแม่น',
  },
  acolyte: {
    name: 'Acolyte', thai: 'นักบวช', crest: 'C', color: '#ffe08a', maxJobLevel: 99, hp: 1.15, sp: 1.8, jobExp: 2.4,
    jobStats: { int: 0.12, vit: 0.08, luk: 0.06, dex: 0.04 }, weapons: ['none', 'mace', 'staff'], gift: 'chapel_mace',
    role: 'ฟื้นฟู · เสริมพลัง', desc: 'ผู้รับใช้แสงศักดิ์สิทธิ์ รักษาตัวเองได้ เสริมพลังให้แข็งแกร่งขึ้น และลงทัณฑ์ศัตรูด้วยแสง',
  },
};
export const FIRST_JOBS = ['swordsman', 'mage', 'archer', 'acolyte'];
export const JOB_CHANGE_JOB_LEVEL = 10;

// โบนัสสเตตัสจาก Job Level
export function jobStatBonus(job, jobLevel) {
  const out = {};
  for (const [k, r] of Object.entries((JOBS[job] || JOBS.novice).jobStats)) out[k] = Math.floor(jobLevel * r);
  return out;
}

// EXP ที่ต้องใช้เพื่อขึ้นเลเวลถัดไป (โค้งชันขึ้นเรื่อย ๆ แบบเกมเก็บเลเวล)
export function baseExpToNext(level) {
  if (level >= MAX_BASE_LEVEL) return Infinity;
  return Math.round(12 * Math.pow(level, 1.9) + 6);
}

export function jobExpToNext(level, job = 'novice') {
  const max = (JOBS[job] || JOBS.novice).maxJobLevel;
  if (level >= max) return Infinity;
  return Math.round((10 * Math.pow(level, 1.75) + 4) * ((JOBS[job] || JOBS.novice).jobExp || 1));
}

// แต้มสเตตัสที่ได้เมื่อขึ้นถึงเลเวลนั้น
export const statPointsForLevel = (newLevel) => Math.floor(newLevel / 5) + 3;

// ราคาแต้มในการเพิ่มค่าสเตตัส 1 หน่วย (ยิ่งสูงยิ่งแพง)
export const statCost = (value) => Math.floor((value - 1) / 10) + 2;

export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];

// รีเซ็ตสเตตัส (v0.10): ฟรีจนถึง Base Lv.40 จากนั้นเสีย Zeny ตามเลเวล
export const STAT_RESET_FREE_LEVEL = 40;
export const statResetCost = (lv) => (lv <= STAT_RESET_FREE_LEVEL ? 0 : (lv - STAT_RESET_FREE_LEVEL) * 1500);

export const STAT_INFO = {
  str: { label: 'STR', name: 'พลังกาย', desc: 'เพิ่มพลังโจมตีระยะประชิด' },
  agi: { label: 'AGI', name: 'ความว่องไว', desc: 'เพิ่มการหลบหลีก (FLEE) และความเร็วโจมตี (ASPD)' },
  vit: { label: 'VIT', name: 'ความอึด', desc: 'เพิ่ม HP สูงสุด พลังป้องกัน และการฟื้น HP' },
  int: { label: 'INT', name: 'สติปัญญา', desc: 'เพิ่ม SP สูงสุด และพลังเวทย์ (MATK)' },
  dex: { label: 'DEX', name: 'ความแม่นยำ', desc: 'เพิ่มความแม่น (HIT) และความเร็วโจมตีเล็กน้อย' },
  luk: { label: 'LUK', name: 'โชค', desc: 'เพิ่มโอกาสคริติคอล และพลังโจมตีเล็กน้อย' },
};

// คำนวณค่าต่อสู้ทั้งหมดจากเลเวล + สเตตัส + โบนัส (อุปกรณ์ / อาชีพ / สกิลติดตัว / บัฟ)
// bonus = { atk, matk, def, mdef, hit, flee, crit, str..luk, maxHp, maxSp, maxHpPct, maxSpPct, aspdPct, atkPct, defPct, dmgReduce }
// weaponType: none | knife | sword | mace | staff | bow (ธนูใช้ DEX เป็นหลักแทน STR)
const WEAPON_DELAY = { none: 0, knife: 0, sword: 0, mace: 0.04, staff: 0.1, bow: 0.06 };
export function derive({ baseLevel: lv, attr, bonus = {}, weaponName = 'มือเปล่า', weaponType = 'none', job = 'novice' }) {
  const b = (k) => bonus[k] || 0;
  const J = JOBS[job] || JOBS.novice;
  const a = {};
  for (const k of STAT_KEYS) a[k] = attr[k] + b(k);       // สเตตัสรวมโบนัส
  const wAtk = b('atk');
  const main = weaponType === 'bow' ? a.dex : a.str, sub = weaponType === 'bow' ? a.str : a.dex;
  const statusAtk = main + Math.floor(main / 10) ** 2 + Math.floor(sub / 5) + Math.floor(a.luk / 5);
  const delay = Math.max(0.35, (0.92 + (WEAPON_DELAY[weaponType] || 0) - a.agi * 0.0065 - a.dex * 0.0015) * (1 - b('aspdPct') / 100));
  const mat = b('matk');
  return {
    total: a,
    // atkPct/defPct = บัฟเปอร์เซ็นต์ (v0.8: เสียงคำรามศึก, ใจเหล็ก)
    atk: [statusAtk + Math.round(wAtk * 0.75) + b('atkFlat'), statusAtk + Math.round(wAtk * 1.15) + b('atkFlat')].map((v) => Math.round(v * (1 + b('atkPct') / 100))),
    matk: [a.int + Math.floor(a.int / 7) ** 2 + mat, a.int + Math.floor(a.int / 5) ** 2 + Math.round(mat * 1.2)],
    def: Math.floor((Math.floor(a.vit / 2) + Math.floor(lv / 10) + b('def')) * (1 + b('defPct') / 100)),
    mdef: Math.floor(a.int / 2) + Math.floor(a.vit / 5) + b('mdef'),
    hit: 90 + a.dex + Math.floor(lv / 2) + b('hit'),
    flee: 5 + a.agi + Math.floor(lv / 2) + b('flee'),
    crit: 0.03 + a.luk * 0.004 + b('crit'),
    delay,                                   // วินาทีต่อการโจมตี 1 ครั้ง
    aspd: Math.round(200 - delay * 50),      // ตัวเลขแสดงผลแบบเกมคลาสสิก
    maxHp: Math.floor(Math.floor((50 + lv * 10 * J.hp) * (1 + a.vit * 0.01)) * (1 + b('maxHpPct') / 100)) + b('maxHp'),
    maxSp: Math.floor(Math.floor((10 + lv * 2 * J.sp) * (1 + a.int * 0.01) + Math.floor(a.int / 2)) * (1 + b('maxSpPct') / 100)) + b('maxSp'),
    regen: (1 + a.vit * 0.02) * (1 + b('regenPct') / 100),   // ตัวคูณการฟื้น HP
    spRegen: (1 + a.int * 0.02) * (1 + b('spRegenPct') / 100),
    weapon: { name: weaponName, atk: wAtk, type: weaponType },
  };
}
