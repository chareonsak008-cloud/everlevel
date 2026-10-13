// v0.31 สกิลอาชีพขั้นที่ 2 — Knight · Wizard · Hunter · Priest (รูปแบบเดียวกับ skills.js)
// เอฟเฟกต์อยู่ใน render/Job2FX.js (vfx = ชื่อฟังก์ชัน fx_<ชื่อ>) · ดาเมจต่อฮิต = (ตัวคูณในเอฟเฟกต์ / ref) × mult(lv)
const pct = (x) => Math.round(x * 100);
const span = (lv, max, a, b) => Math.round(a + ((b - a) * (lv - 1)) / (max - 1));
const healBase = (lv, pl) => {
  const int = pl && pl.derived ? pl.derived.total.int : 1, base = pl ? pl.baseLevel : 1;
  return (Math.floor((base + int) / 8) + 1) * (4 + lv * 8);
};
const LONG = (pl) => pl && ['spear', 'sword_2h'].includes(pl.weaponForm);

export const JOB2_SKILLS = {
  /* ================= Knight · อัศวิน ================= */
  knight_spirit: {
    job: 'knight', name: 'จิตวิญญาณอัศวิน', maxLv: 10, kind: 'passive', icon: ['shield', '#7ab4ff'],
    desc: 'ปณิธานแห่งผู้พิทักษ์ ร่างกายแข็งแกร่งและยืนหยัดได้นานกว่าใคร',
    effect: (lv) => `Max HP +${lv * 2}% · DEF +${lv * 2} · ฟื้น HP +${lv * 4}%`,
    passive: (lv) => ({ maxHpPct: lv * 2, def: lv * 2, regenPct: lv * 4 }),
  },
  lance_mastery: {
    job: 'knight', name: 'เชี่ยวชาญหอกและดาบใหญ่', maxLv: 10, kind: 'passive', icon: ['lance', '#9ac8ff'],
    desc: 'ฝึกใช้หอกและดาบสองมือจนชำนาญ ใช้อาวุธอื่นได้โบนัสน้อยลง',
    effect: (lv) => `หอก/ดาบสองมือ: ATK +${lv * 6} · HIT +${lv * 2} (อาวุธอื่น ATK +${lv * 2})`,
    passive: (lv, pl) => (LONG(pl) ? { atkFlat: lv * 6, hit: lv * 2 } : { atkFlat: lv * 2 }),
  },
  lance_pierce: {
    job: 'knight', name: 'หอกทะลวงฟ้า', maxLv: 10, kind: 'active', target: 'enemy', icon: ['lance', '#5a9aff'], req: { lance_mastery: 1 },
    sp: (lv) => 16 + lv, cast: 0, cd: 0.7, range: 'weapon', vfx: 'lance_pierce', ref: 1, lock: 0.45, delay: 0.35, engage: true, hitBonus: (lv) => 10 + lv * 2,
    mult: (lv) => 0.85 + lv * 0.11, stun: (lv) => lv * 0.02, stunSecs: 1.5,
    desc: 'พุ่งแทงหอกพลังสายฟ้าฟ้าทะลุแนวศัตรู 3 ครั้งติดกัน โดนทุกตัวในแนวยาว 5 ช่อง',
    effect: (lv) => `3 ครั้ง × ${pct(0.85 + lv * 0.11)}% ทุกตัวในแนว · มึน ${lv * 2}%`,
  },
  steel_charge: {
    job: 'knight', name: 'พุ่งทะยานเหล็กกล้า', maxLv: 10, kind: 'active', target: 'enemy', icon: ['steel', '#7ab4ff'], req: { lance_pierce: 3 },
    sp: (lv) => 24 + lv * 2, cast: 0, cd: 2.5, range: 7, dash: true, vfx: 'steel_charge', ref: 2.4, lock: 0.7, delay: 0.5, engage: true, hitBonus: () => 25, knock: 2,
    mult: (lv) => 2.2 + lv * 0.22,
    desc: 'พุ่งเข้าหาเป้าหมายพร้อมโล่พลังงาน กระแทกระเบิดรอบจุดชน ผลักศัตรูกระเด็น',
    effect: (lv) => `${pct(2.2 + lv * 0.22)}% รัศมี 2.2 ช่อง · พุ่งไกล 7 ช่อง · ผลักกระเด็น`,
  },
  crescent_sweep: {
    job: 'knight', name: 'วงจันทร์ฟาดกวาด', maxLv: 10, kind: 'active', target: 'self', icon: ['cyclone', '#8ab8ff'], req: { lance_pierce: 3 },
    sp: (lv) => 30 + lv * 2, cast: 0.2, cd: 2, vfx: 'crescent_sweep', ref: 1.2, lock: 0.8, delay: 0.6, hitBonus: () => 20, knock: 1.5,
    mult: (lv) => 1.1 + lv * 0.12,
    desc: 'หมุนอาวุธกวาดเป็นวงพระจันทร์เสี้ยวสองชั้น ฟันทุกตัวรอบตัว 2 ครั้งแล้วผลักออก',
    effect: (lv) => `2 ครั้ง × ${pct(1.1 + lv * 0.12)}% รอบตัว 3.8 ช่อง · ผลักกระเด็น`,
  },
  aegis_aura: {
    job: 'knight', name: 'ออร่าโล่ราชันย์', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#5a8aff'], req: { knight_spirit: 3 },
    sp: 40, cast: 0, cd: 1, vfx: 'aegis_aura', lock: 0.7, delay: 0.5,
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ dmgReduce: 6 + lv, def: lv * 2, atkPct: lv }),
    desc: 'โล่พลังงานหกเหลี่ยมหมุนรอบตัว ลดดาเมจที่ได้รับ เพิ่มพลังป้องกันและพลังโจมตี',
    effect: (lv) => `ดาเมจที่ได้รับ -${6 + lv}% · DEF +${lv * 2} · ATK +${lv}% นาน ${60 + lv * 6} วิ`,
  },
  heavens_lance: {
    job: 'knight', name: 'หอกมังกรสวรรค์', maxLv: 5, kind: 'active', target: 'enemy', icon: ['skysword', '#4a8aff'], req: { steel_charge: 5, crescent_sweep: 5 },
    sp: (lv) => 60 + lv * 4, cast: 0.5, cd: 10, range: 6, vfx: 'heavens_lance', ref: 4.5, lock: 1.1, delay: 1.0, hitBonus: () => 40, knock: 1.5,
    mult: (lv) => 4.6 + lv * 0.9,
    desc: 'ชี้หอกขึ้นฟ้า หอกพลังงานยักษ์รูปหัวมังกรพุ่งลงปักเป้าหมาย คลื่นกระแทกกวาดทั่ววง (ไม้ตาย)',
    effect: (lv) => `${pct(4.6 + lv * 0.9)}% รัศมี 3 ช่อง + คลื่นตาม ${pct(((4.6 + lv * 0.9) * 1.5) / 4.5)}% · คูลดาวน์ 10 วิ`,
  },

  /* ================= Wizard · จอมเวท ================= */
  elemental_mastery: {
    job: 'wizard', name: 'ปรมาจารย์ธาตุ', maxLv: 10, kind: 'passive', icon: ['orb', '#c89aff'],
    desc: 'เข้าใจธาตุทั้งห้าอย่างลึกซึ้ง เวทแรงขึ้นและร่ายเร็วขึ้น',
    effect: (lv) => `MATK +${lv * 1.5}% · เวลาร่าย -${lv * 2}%`,
    passive: (lv) => ({ matkPct: lv * 1.5, castPct: lv * 2 }),
  },
  mana_tide: {
    job: 'wizard', name: 'กระแสมานา', maxLv: 10, kind: 'passive', icon: ['orb', '#7ad8ff'],
    desc: 'ดึงมานาจากรอบตัวเข้ามาไม่ขาดสาย',
    effect: (lv) => `Max SP +${lv * 3}% · ฟื้น SP +${lv * 10}% · ดีเลย์หลังร่าย -${lv}%`,
    passive: (lv) => ({ maxSpPct: lv * 3, spRegenPct: lv * 10, delayPct: lv }),
  },
  chain_lightning: {
    job: 'wizard', name: 'สายฟ้าโซ่ทวีคูณ', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['chain', '#ffe24a'], req: { elemental_mastery: 1 },
    sp: (lv) => 18 + lv * 3, cast: (lv) => 0.5 + lv * 0.06, cd: 0.8, range: 9, color: '#ffe680', vfx: 'chain_lightning', ref: 1, lock: 0.45, delay: 0.4,
    mult: (lv) => 1.2 + lv * 0.12, count: (lv) => 3 + Math.floor(lv / 2),
    desc: 'ยิงสายฟ้าที่กระโดดต่อจากศัตรูตัวหนึ่งไปอีกตัว แรงลดลงทีละน้อยทุกครั้งที่กระโดด',
    effect: (lv) => `${pct(1.2 + lv * 0.12)}% MATK · กระโดด ${3 + Math.floor(lv / 2)} ตัว (ลดทีละ 10%)`,
  },
  inferno_pillars: {
    job: 'wizard', name: 'เสาเพลิงนรกันต์', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['flame', '#ff5a2a'], req: { chain_lightning: 3 },
    sp: (lv) => 34 + lv * 3, cast: 1.2, cd: 3, range: 9, color: '#ff7a2a', vfx: 'inferno_pillars', ref: 1, lock: 0.8, delay: 0.8,
    mult: (lv) => 0.75 + lv * 0.08,
    desc: 'วงเวทเพลิงใต้เท้าศัตรู เสาไฟ 8 ต้นพุ่งขึ้นสามระลอกแล้วระเบิดใจกลาง',
    effect: (lv) => `3 ระลอก × ${pct(0.75 + lv * 0.08)}% + ระเบิดกลาง ${pct((0.75 + lv * 0.08) * 1.8)}% รัศมี 3 ช่อง`,
  },
  glacial_prison: {
    job: 'wizard', name: 'คุกธารน้ำแข็ง', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['crystal', '#7fd8ff'], req: { chain_lightning: 3 },
    sp: (lv) => 36 + lv * 3, cast: 1.0, cd: 4, range: 9, color: '#9ae8ff', vfx: 'glacial_prison', ref: 1.8, lock: 0.8, delay: 0.8,
    mult: (lv) => 1.6 + lv * 0.14, freeze: (lv) => 0.5 + lv * 0.05, freezeSecs: (lv) => 2.5 + lv * 0.2,
    desc: 'ผลึกน้ำแข็งงอกขังศัตรูทุกตัวในวง แช่แข็งแล้วระเบิดเป็นเศษน้ำแข็ง',
    effect: (lv) => `${pct(1.6 + lv * 0.14)}% MATK รัศมี 2.8 ช่อง · แช่แข็ง ${50 + lv * 5}% นาน ${(2.5 + lv * 0.2).toFixed(1)} วิ`,
  },
  arcane_haste: {
    job: 'wizard', name: 'ร่ายเวทพริบตา', maxLv: 10, kind: 'active', target: 'self', icon: ['hexshield', '#c89aff'], req: { mana_tide: 3 },
    sp: 45, cast: 0, cd: 1, vfx: 'arcane_haste', lock: 0.6, delay: 0.4,
    duration: (lv) => 60 + lv * 12, bonus: (lv) => ({ castPct: 10 + lv * 3, delayPct: 5 + lv * 2, matkPct: lv }),
    desc: 'วงเวทนาฬิกาหมุนรอบตัว เร่งจังหวะการร่ายเวท',
    effect: (lv) => `ร่าย -${10 + lv * 3}% · ดีเลย์ -${5 + lv * 2}% · MATK +${lv}% นาน ${60 + lv * 12} วิ`,
  },
  starfall_cataclysm: {
    job: 'wizard', name: 'ดาวตกวันสิ้นโลก', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['comet', '#b07aff'], req: { inferno_pillars: 5, glacial_prison: 5 },
    sp: (lv) => 90 + lv * 6, cast: (lv) => 2.6 - lv * 0.2, cd: 12, range: 9, color: '#c89aff', vfx: 'starfall_cataclysm', ref: 1, lock: 1.2, delay: 1.5,
    mult: (lv) => 0.9 + lv * 0.12,
    desc: 'ฟ้าเปิดเป็นห้วงดารา ดาวตก 16 ดวงถล่มรอบเป้า แล้วดาวหางยักษ์ปิดฉาก (ไม้ตาย)',
    effect: (lv) => `16 ลูก × ${pct(0.9 + lv * 0.12)}% + ดาวหาง ${pct((0.9 + lv * 0.12) * 4)}% รัศมี 3.5 ช่อง · คูลดาวน์ 12 วิ`,
  },

  /* ================= Hunter · นักล่า ================= */
  hunter_instinct: {
    job: 'hunter', name: 'สัญชาตญาณนักล่า', maxLv: 10, kind: 'passive', icon: ['eye', '#6ad08a'],
    desc: 'สัมผัสได้ถึงจุดอ่อนของเหยื่อ',
    effect: (lv) => `DEX +${Math.ceil(lv / 2)} · AGI +${Math.ceil(lv / 2)} · คริ +${(lv * 0.5).toFixed(1)}%`,
    passive: (lv) => ({ dex: Math.ceil(lv / 2), agi: Math.ceil(lv / 2), crit: lv * 0.005 }),
  },
  falconry: {
    job: 'hunter', name: 'สายสัมพันธ์เหยี่ยว', maxLv: 10, kind: 'passive', icon: ['hawk', '#9ae8a8'],
    desc: 'เหยี่ยววิญญาณคู่ใจคอยบินระวังภัย เพิ่มพลังโจมตีและความแม่นยำ',
    effect: (lv) => `ATK +${lv}% · HIT +${lv * 2} · ระยะยิง +${(lv * 0.2).toFixed(1)} ช่อง`,
    passive: (lv) => ({ atkPct: lv, hit: lv * 2, rangeTiles: lv * 0.2 }),
  },
  falcon_assault: {
    job: 'hunter', name: 'เหยี่ยววิญญาณจู่โจม', maxLv: 10, kind: 'active', target: 'enemy', icon: ['hawk', '#4ac06a'], req: { falconry: 1 },
    sp: (lv) => 16 + lv * 2, cast: 0, cd: 1, range: 9, vfx: 'falcon_assault', ref: 1, lock: 0.4, delay: 0.35, hitBonus: () => 30,
    mult: (lv) => 0.95 + lv * 0.12,
    desc: 'ผิวปากเรียกเหยี่ยววิญญาณโฉบใส่เป้าหมาย 3 ครั้ง กรงเล็บลมฉีกศัตรูรอบข้างด้วย (ไม่ต้องใช้ธนู)',
    effect: (lv) => `3 ครั้ง × ${pct(0.95 + lv * 0.12)}% ATK · รอบเป้า 1.4 ช่อง`,
  },
  blast_trap: {
    job: 'hunter', name: 'กับดักระเบิดเพลิง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['bomb', '#ff8a3a'], req: { falcon_assault: 1 },
    sp: (lv) => 20 + lv, cast: 0, cd: 2, range: 7, vfx: 'blast_trap', ref: 2.2, lock: 0.5, delay: 0.45, hitBonus: () => 40, knock: 1.2,
    mult: (lv) => 2 + lv * 0.2, stun: (lv) => 0.2 + lv * 0.03, stunSecs: 2,
    desc: 'โยนกับดักไปที่เท้าศัตรู ระเบิดเป็นเปลวไฟวงกว้าง มีโอกาสทำให้มึน',
    effect: (lv) => `${pct(2 + lv * 0.2)}% ATK รัศมี 2.4 ช่อง · มึน ${20 + lv * 3}%`,
  },
  split_volley: {
    job: 'hunter', name: 'ศรแยกเจ็ดสาย', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['fan', '#ffd27a'], req: { hunter_instinct: 3 },
    sp: (lv) => 22 + lv * 2, cast: 0, cd: 1.2, range: 'weapon', vfx: 'split_volley', ref: 1, lock: 0.5, delay: 0.45, engage: true, hitBonus: () => 15,
    mult: (lv) => 1 + lv * 0.1,
    desc: 'ยิงลูกธนูเรืองแสง 7 ดอกแยกเป็นรูปพัด กระจายไปโดนศัตรูรอบเป้าหมาย (ต้องใช้ธนู)',
    effect: (lv) => `7 ดอก × ${pct(1 + lv * 0.1)}% ATK · กระจายรอบเป้า 4 ช่อง`,
  },
  predator_focus: {
    job: 'hunter', name: 'สายตานักล่า', maxLv: 10, kind: 'active', target: 'self', icon: ['scope', '#4ac06a'], req: { hunter_instinct: 3 },
    sp: 38, cast: 0, cd: 1, vfx: 'predator_focus', lock: 0.6, delay: 0.4,
    duration: (lv) => 60 + lv * 10, bonus: (lv) => ({ atkPct: 5 + Math.round(lv * 1.5), crit: lv * 0.006, speedPct: 10 + lv }),
    desc: 'ดวงตาเรืองแสงสีเขียว ล็อกเป้าหมายได้ทุกการเคลื่อนไหว',
    effect: (lv) => `ATK +${5 + Math.round(lv * 1.5)}% · คริ +${(lv * 0.6).toFixed(1)}% · ความเร็ว +${10 + lv}% นาน ${60 + lv * 10} วิ`,
  },
  talon_tempest: {
    job: 'hunter', name: 'พายุกรงเล็บเหยี่ยว', maxLv: 5, kind: 'active', target: 'enemy', icon: ['hawk', '#2a9a5a'], req: { falcon_assault: 5, split_volley: 5 },
    sp: (lv) => 70 + lv * 5, cast: 0.3, cd: 10, range: 9, vfx: 'talon_tempest', ref: 1, lock: 1.1, delay: 1.0, hitBonus: () => 40,
    mult: (lv) => 0.75 + lv * 0.12,
    desc: 'ฝูงเหยี่ยววิญญาณ 12 ตัวหมุนเป็นพายุรอบเป้าหมาย ฉีกทึ้งต่อเนื่องแล้วโฉบรวมเป็นหนึ่ง (ไม้ตาย)',
    effect: (lv) => `10 ครั้ง × ${pct(0.75 + lv * 0.12)}% + โฉบปิด ${pct((0.75 + lv * 0.12) * 3.5)}% รัศมี 3.2 ช่อง · คูลดาวน์ 10 วิ`,
  },

  /* ================= Priest · นักบวชชั้นสูง ================= */
  divine_grace: {
    job: 'priest', name: 'พระคุณแห่งสรวงสวรรค์', maxLv: 10, kind: 'passive', icon: ['sun', '#ffe9a0'],
    desc: 'ได้รับพรจากเทวทูต พลังรักษาแรงขึ้นมาก',
    effect: (lv) => `พลังรักษา +${lv * 4}% · Max SP +${lv * 2}%`,
    passive: (lv) => ({ healPct: lv * 4, maxSpPct: lv * 2 }),
  },
  faith_ward: {
    job: 'priest', name: 'เกราะศรัทธา', maxLv: 10, kind: 'passive', icon: ['shield', '#fff2c0'],
    desc: 'ศรัทธาอันแน่วแน่กลายเป็นเกราะที่มองไม่เห็น',
    effect: (lv) => `MDEF +${lv * 2} · Max HP +${Math.round(lv * 1.5)}% · ฟื้น HP +${lv * 5}%`,
    passive: (lv) => ({ mdef: lv * 2, maxHpPct: Math.round(lv * 1.5), regenPct: lv * 5 }),
  },
  grand_heal: {
    job: 'priest', name: 'ฟื้นฟูมหาศาล', maxLv: 10, kind: 'active', target: 'self', icon: ['heart', '#7aff9a'], req: { divine_grace: 1 },
    sp: (lv) => 30 + lv * 4, cast: 0.4, cd: 1.5, vfx: 'grand_heal', lock: 0.5, delay: 0.4,
    heal: (lv, pl) => Math.round(healBase(lv, pl) * 2.2),
    desc: 'ดอกบัวแสงบานใต้เท้า กลีบแสงโปรยลงมา ฟื้นฟูบาดแผลมหาศาล',
    effect: (lv, pl) => `ฟื้น HP ${Math.round(healBase(lv, pl) * 2.2)}`,
  },
  sacred_barrier: {
    job: 'priest', name: 'ม่านแสงพิทักษ์', maxLv: 10, kind: 'active', target: 'self', icon: ['barrier', '#fff2a0'], req: { faith_ward: 3 },
    sp: (lv) => 40 + lv * 2, cast: 0, cd: 20, vfx: 'sacred_barrier', lock: 0.6, delay: 0.5,
    duration: (lv) => 30 + lv * 3, bonus: (lv) => ({ dmgReduce: 10 + Math.round(lv * 1.5), def: lv * 2, mdef: lv * 2 }),
    desc: 'ม่านแสงทรงโดมพร้อมขนนกหมุนรอบตัว ป้องกันดาเมจได้มาก (คูลดาวน์ 20 วิ)',
    effect: (lv) => `ดาเมจที่ได้รับ -${10 + Math.round(lv * 1.5)}% · DEF/MDEF +${lv * 2} นาน ${30 + lv * 3} วิ`,
  },
  radiant_spears: {
    job: 'priest', name: 'หอกแสงพิพากษา', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['spears', '#fff2a0'], req: { divine_grace: 3 },
    sp: (lv) => 26 + lv * 3, cast: 0.8, cd: 2, range: 8, color: '#fff2a0', vfx: 'radiant_spears', ref: 1, lock: 0.6, delay: 0.6,
    mult: (lv) => 0.8 + lv * 0.08,
    desc: 'หอกแสงศักดิ์สิทธิ์ 9 เล่มพุ่งลงจากฟ้าหาศัตรูรอบเป้าหมาย ศัตรูแต่ละตัวโดนได้สูงสุด 3 เล่ม',
    effect: (lv) => `9 เล่ม × ${pct(0.8 + lv * 0.08)}% MATK รัศมี 3 ช่อง (ตัวละไม่เกิน 3 เล่ม)`,
  },
  purge_circle: {
    job: 'priest', name: 'วงชำระบาป', maxLv: 10, kind: 'active', target: 'self', magic: true, icon: ['sanctum', '#ffe08a'], req: { grand_heal: 3 },
    sp: (lv) => 30 + lv * 2, cast: 0.6, cd: 3, color: '#ffe08a', vfx: 'purge_circle', ref: 1, lock: 0.7, delay: 0.7,
    mult: (lv) => 0.9 + lv * 0.09, heal: (lv, pl) => Math.round(healBase(lv, pl) * 0.25),
    desc: 'กางวงแสงชำระบาปรอบตัว คลื่นแสง 3 ระลอกแผดเผาศัตรูและฟื้น HP ทุกระลอก',
    effect: (lv, pl) => `3 ระลอก × ${pct(0.9 + lv * 0.09)}% MATK รัศมี 3.5 ช่อง · ฟื้น HP ${Math.round(healBase(lv, pl) * 0.25)} × 3`,
  },
  seraph_descent: {
    job: 'priest', name: 'การเสด็จของเทวทูต', maxLv: 5, kind: 'active', target: 'self', magic: true, icon: ['angel', '#ffd36b'], req: { radiant_spears: 5, sacred_barrier: 3 },
    sp: (lv) => 90 + lv * 6, cast: 1.5, cd: 14, color: '#ffe08a', vfx: 'seraph_descent', ref: 1, lock: 1.2, delay: 1.2,
    mult: (lv) => 1.2 + lv * 0.2, heal: (lv, pl) => Math.round(healBase(10, pl) * (1.5 + lv * 0.3)),
    duration: () => 60, bonus: (lv) => ({ str: 4 + lv, int: 4 + lv, dex: 4 + lv, matkPct: lv * 2 }),
    desc: 'เทวทูตกางปีกลงมาเหนือร่าง เสาแสงสวรรค์พิพากษาศัตรูรอบตัว ฟื้น HP และอวยพรพลัง (ไม้ตาย)',
    effect: (lv, pl) => `5 ครั้ง × ${pct(1.2 + lv * 0.2)}% + ปิดท้าย ${pct((1.2 + lv * 0.2) * 3.5)}% รัศมี 4 ช่อง · ฟื้น HP ${Math.round(healBase(10, pl) * (1.5 + lv * 0.3))} · STR/INT/DEX +${4 + lv} 60 วิ`,
  },
};
