// v0.85 สกิลอาชีพคลาส 3 (5 สกิลต่ออาชีพ) — รวมจากไฟล์ต้นแบบ 4 สาย · ชื่อสกิลตั้งใหม่เป็นของ Everlevel
// ภาพอยู่ใน render/SwordC3FX.js · MageC3FX.js · ArcherC3FX.js · HealC3FX.js (vfx = fx_<ชื่อ>) · จังหวะดาเมจ/ฮีลอยู่ใน nf (ระบบ fx_nf)
// ค่าตัวเลข (sp, cd, mult) ปรับสมดุลได้ที่ไฟล์นี้
const pct = (v) => Math.round(v * 100);

export const SWORD3_SKILLS = {
  s3_treasury: {
    job: 'heroking', name: 'ห่าศาสตราประตูทอง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['c3_gate', '#ffd24a'],
    sp: (lv) => 14 + lv * 2, cast: 0, cd: 0.8, range: 9, vfx: 's3_treasury', ref: 1, lock: 0.5, delay: 0.4, engage: true,
    mult: (lv) => 0.28 + lv * 0.04,
    nf: { anim: 'cast', hits: Array.from({ length: 9 }, (_, i) => ({ t: 0.65 + i * 0.06, m: 1, ...(i === 8 ? { r: 1.2, shake: 0.2, stop: 0.04 } : {}) })) },
    desc: 'วงเวทอักขระทองเก้าวงเปิดกางเป็นพัดหลังตัว อาวุธสมบัติค่อย ๆ ก่อตัวออกจากกลางวงแล้วพุ่งเข้าเป้าทีละเล่ม 9 ครั้ง — สกิลโจมตีหลัก',
    effect: (lv) => `9 × ${pct(0.28 + lv * 0.04)}% ATK (รวม ${pct((0.28 + lv * 0.04) * 9)}%) · เล่มสุดท้ายลามรอบเป้า 1.2 ช่อง`,
  },
  s3_arsenal_rain: {
    job: 'heroking', name: 'ห่าอาวุธราชันย์', maxLv: 10, kind: 'active', target: 'enemy', icon: ['c3_armrain', '#ffd24a'], req: { s3_treasury: 3 },
    sp: (lv) => 36 + lv * 3, cast: 0.5, cd: 6, range: 10, vfx: 's3_arsenal_rain', ref: 1, lock: 0.9, delay: 0.8, knock: 1,
    mult: (lv) => 0.6 + lv * 0.08,
    nf: { anim: 'castHold', hits: [0.8, 1.1, 1.4, 1.7].map((t) => ({ t, r: 3.2, m: 0.6 })).concat([{ t: 1.9, r: 3.4, m: 1.8, knock: 1, shake: 0.4, stop: 0.06 }]) },
    desc: 'ประตูทองสิบสี่บานเปิดกลางฟ้าเหนือศัตรู ดาบและหอกนับไม่ถ้วนตกปักพื้น แล้วระเบิดแสงทองกลางวงผลักกระเด็น — สกิลโจมตีหมู่',
    effect: (lv) => `4 × ${pct((0.6 + lv * 0.08) * 0.6)}% + ${pct((0.6 + lv * 0.08) * 1.8)}% ATK รอบเป้า 3.2–3.4 ช่อง · ผลักถอย`,
  },
  s3_chains: {
    job: 'heroking', name: 'โซ่ทองตรึงฟ้า', maxLv: 10, kind: 'active', target: 'enemy', icon: ['c3_chain', '#ffc838'], req: { s3_treasury: 3 },
    sp: (lv) => 30 + lv * 2, cast: 0.2, cd: 12, range: 9, vfx: 's3_chains', ref: 1, lock: 0.6, delay: 0.5,
    mult: (lv) => 0.5 + lv * 0.06, stun: () => 1, stunSecs: (lv) => 1.8 + lv * 0.1,
    nf: { anim: 'cast', pull: { from: 0.4, to: 1.4, r: 3.2, step: 2 }, hits: [{ t: 0.55, r: 3, m: 0.8, stun: 2.5, shake: 0.15 }] },
    desc: 'ประตูทองเปิดรอบศัตรูทุกทิศ โซ่ทองพุ่งออกมามัดศัตรูไว้กลางอากาศ ดึงเข้ารวมกันและขยับไม่ได้ — ใช้รวมฝูงก่อนไม้ตาย',
    effect: (lv) => `${pct((0.5 + lv * 0.06) * 0.8)}% ATK รอบเป้า 3 ช่อง · ดึงเข้ากลาง · มัด ${(1.8 + lv * 0.1).toFixed(1)} วิ (แน่นอน)`,
  },
  s3_king_aura: {
    job: 'heroking', name: 'ราชันย์ผู้ไร้เทียมทาน', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_crown', '#ffd24a'],
    sp: 50, cast: 0, cd: 1, vfx: 's3_king_aura', lock: 0.5, delay: 0.4,
    nf: { at: 'self', anim: 'cast', texts: [{ t: 0.45, text: 'KING ▲' }] },
    duration: (lv) => 60 + lv * 6, bonus: (lv) => ({ atkPct: 5 + lv, critDmgPct: lv * 3, def: lv * 3 }),
    desc: 'ประตูศาสตราทองเก้าบานกางเป็นรัศมีหลังตัว เสาแสงทองพุ่งขึ้น ราชันย์ปลดปล่อยออร่า เพิ่มพลังโจมตีและความแรงคริติคอล',
    effect: (lv) => `ATK +${5 + lv}% · คริดาเมจ +${lv * 3}% · DEF +${lv * 3} นาน ${60 + lv * 6} วิ`,
  },
  s3_world_cleave: {
    job: 'heroking', name: 'สว่านฟ้าพิภพแตก', maxLv: 5, kind: 'active', target: 'enemy', icon: ['c3_drill', '#e01e1e'], req: { s3_arsenal_rain: 5, s3_chains: 3 },
    sp: (lv) => 100 + lv * 6, cast: (lv) => 1.6 - lv * 0.12, cd: 15, range: 12, vfx: 's3_world_cleave', ref: 1, lock: 1.6, delay: 1.4, knock: 2,
    mult: (lv) => 1.6 + lv * 0.35,
    nf: { anim: 'castHold', sky: { t: 0, dark: 0.65, dur: 3 }, flashes: [{ t: 1.75, a: 0.7, color: '#ff8a7a' }], hits: [{ t: 1.8, line: { len: 13, w: 1.6 }, m: 1, shake: 0.5, stop: 0.08 }, { t: 2.05, line: { len: 13, w: 1.6 }, m: 3.5, knock: 1, shake: 1, stop: 0.14 }] },
    desc: 'ฟ้ามืดแดง ดึงดาบทรงสว่านสามท่อนออกจากประตูทอง ท่อนดาบหมุนสวนกันดูดลมรอบทิศ แล้วปลดปล่อยลำลมแดงดำทรงเกลียว ฉีกพื้นเป็นทางยาว 13 ช่อง (ไม้ตาย)',
    effect: (lv) => `${pct(1.6 + lv * 0.35)}% + ${pct((1.6 + lv * 0.35) * 3.5)}% ATK ทุกตัวในแนว 13 ช่อง · ผลักกระเด็น · คูลดาวน์ 15 วิ`,
  },
};

export const SWORD3_SFX = { s3_treasury: 'shoot', s3_arsenal_rain: 'cast', s3_chains: 'skill', s3_king_aura: 'skill', s3_world_cleave: 'cast' };
export const SWORD3_IMPACT_SFX = { s3_treasury: 'slam', s3_arsenal_rain: 'explosion', s3_chains: 'slam', s3_world_cleave: 'explosion' };

export const MAGE3_SKILLS = {
  m3_ray: {
    job: 'archmage', name: 'ลำแสงพิฆาต', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['c3_ray', '#9ad4ff'],
    sp: (lv) => 20 + lv * 2, cast: 0.5, cd: 2, range: 11, vfx: 'm3_ray', ref: 1, lock: 0.6, delay: 0.5, engage: true,
    mult: (lv) => 2.2 + lv * 0.25,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.55, line: { len: 11, w: 1.1 }, m: 1, shake: 0.2, stop: 0.04 }] },
    desc: 'วงเวทสามชั้นเรียงตัวหน้าไม้เท้า หมุนเร็วขึ้นทีละชั้น แล้วยิงลำแสงสังหารสีขาวทะลุทุกตัวในแนวยาว 11 ช่อง — สกิลโจมตีหลัก',
    effect: (lv) => `${pct(2.2 + lv * 0.25)}% MATK ทุกตัวในแนว 11 ช่อง`,
  },
  m3_arrow_rain: {
    job: 'archmage', name: 'ห่าศรแสงพันดอก', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['c3_lightlance', '#bfe8ff'], req: { m3_ray: 3 },
    sp: (lv) => 36 + lv * 3, cast: 0.8, cd: 6, range: 10, vfx: 'm3_arrow_rain', ref: 1, lock: 0.9, delay: 0.8, knock: 1,
    mult: (lv) => 0.55 + lv * 0.07,
    nf: { magic: true, anim: 'castHold', hits: [0.8, 1.0, 1.2, 1.4].map((t) => ({ t, r: 3, m: 0.6 })).concat([{ t: 1.7, r: 3.2, m: 1.6, knock: 1, shake: 0.35, stop: 0.05 }]) },
    desc: 'วงเวทเจ็ดวงลอยเหนือศัตรู โปรยหอกแสงลงมานับไม่ถ้วน แล้วทุกวงยิงลำแสงรวมกันกลางวงระเบิดผลักกระเด็น — สกิลโจมตีหมู่',
    effect: (lv) => `4 × ${pct((0.55 + lv * 0.07) * 0.6)}% + ${pct((0.55 + lv * 0.07) * 1.6)}% MATK รอบเป้า 3–3.2 ช่อง · ผลักถอย`,
  },
  m3_hex_ward: {
    job: 'archmage', name: 'ม่านปราการหกเหลี่ยม', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_hexdome', '#9ad4ff'],
    sp: 50, cast: 0, cd: 20, vfx: 'm3_hex_ward', lock: 0.6, delay: 0.5,
    nf: { at: 'self', anim: 'cast', texts: [{ t: 0.8, text: 'BARRIER' }] },
    duration: (lv) => 8 + lv, bonus: (lv) => ({ dmgReduce: 20 + lv * 3, mdef: lv * 4 }),
    desc: 'แผ่นหกเหลี่ยมนับสิบบินมาต่อกันเป็นโดมเกราะรอบตัว คลื่นแสงวิ่งไล่ทั่วโดม ลดดาเมจที่ได้รับอย่างมากชั่วครู่',
    effect: (lv) => `ดาเมจที่ได้รับ -${20 + lv * 3}% · MDEF +${lv * 4} นาน ${8 + lv} วิ · คูลดาวน์ 20 วิ`,
  },
  m3_flower_field: {
    job: 'archmage', name: 'ทุ่งดอกไม้นิรันดร์', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_flowerfield', '#ffd0e4'],
    sp: (lv) => 30 + lv * 2, cast: 0.3, cd: 12, vfx: 'm3_flower_field', lock: 0.6, delay: 0.5,
    heal: (lv, pl) => Math.round((pl.stats ? pl.stats.matk : 100) * (0.6 + lv * 0.08)),
    nf: { at: 'self', anim: 'castHold', heals: [0.6, 1.2] },
    desc: 'คลื่นแสงแผ่จากเท้า ดอกไม้หลากสีบานเต็มทุ่งรอบตัวเป็นวงกว้าง ฟื้นฟู HP ตัวเองและเพื่อนในปาร์ตี้ 2 ครั้ง — เวทที่จอมเวทชอบที่สุด',
    effect: (lv) => `ฟื้นฟู 2 × ${pct(0.6 + lv * 0.08)}% MATK · เพื่อนในปาร์ตี้รอบตัว 5 ช่องได้ด้วย`,
  },
  m3_thousand_circles: {
    job: 'archmage', name: 'ปิดล้อมพันวงเวท', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['c3_circles', '#e2f4ff'], req: { m3_ray: 5, m3_arrow_rain: 5 },
    sp: (lv) => 90 + lv * 6, cast: (lv) => 1.8 - lv * 0.15, cd: 12, range: 10, vfx: 'm3_thousand_circles', ref: 1, lock: 1.6, delay: 1.4, knock: 2,
    mult: (lv) => 1.2 + lv * 0.22,
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.55, dur: 4 }, flashes: [{ t: 3.2, a: 0.7, color: '#e8f6ff' }], hits: [1.6, 1.9, 2.2, 2.5].map((t) => ({ t, r: 3.2, m: 0.6, shake: 0.12 })).concat([{ t: 3.2, r: 4, m: 4, knock: 1, shake: 1, stop: 0.14 }]) },
    desc: 'ฟ้ามืดลง วงเวท 24 วงผุดเป็นเกลียวล้อมศัตรูเป็นครึ่งทรงกลม ระดมยิงลำแสงเข้ากลาง วงเวทยักษ์เปิดบนฟ้า แล้วทุกวงยิงพร้อมกันพร้อมลำแสงสวรรค์ (ไม้ตาย)',
    effect: (lv) => `4 × ${pct((1.2 + lv * 0.22) * 0.6)}% + ${pct((1.2 + lv * 0.22) * 4)}% MATK รอบเป้า 3.2–4 ช่อง · คูลดาวน์ 12 วิ`,
  },
};

export const MAGE3_SFX = { m3_ray: 'cast', m3_arrow_rain: 'cast', m3_hex_ward: 'skill', m3_flower_field: 'heal', m3_thousand_circles: 'cast' };
export const MAGE3_IMPACT_SFX = { m3_ray: 'thunder', m3_arrow_rain: 'explosion', m3_thousand_circles: 'explosion' };
export const MAGE3_PARTY = { m3_flower_field: 5 };

export const ARCHER3_SKILLS = {
  e3_spiral: {
    job: 'bladearcher', name: 'ศรดาบเกลียวทะลวง', maxLv: 10, kind: 'active', target: 'enemy', bow: true, icon: ['c3_spiralarrow', '#9ad8ff'],
    sp: (lv) => 12 + lv * 2, cast: 0.2, cd: 0.6, range: 11, vfx: 'e3_spiral', ref: 1, lock: 0.5, delay: 0.35, engage: true,
    mult: (lv) => 1.3 + lv * 0.17,
    nf: { anim: 'shoot', hits: [{ t: 0.62, m: 1, shake: 0.15 }, { t: 0.66, r: 1.6, m: 0.8, shake: 0.25, stop: 0.05 }] },
    desc: 'เส้นโครงสีฟ้าก่อตัวเป็นศรดาบทรงเกลียวบนคันธนู ยิงพุ่งหมุนเข้าเป้า แล้วระเบิดพลังของอาวุธออกรอบตัว — สกิลยิงหลัก',
    effect: (lv) => `${pct(1.3 + lv * 0.17)}% + ระเบิด ${pct((1.3 + lv * 0.17) * 0.8)}% ATK รอบเป้า 1.6 ช่อง`,
  },
  e3_twin_blades: {
    job: 'bladearcher', name: 'ดาบคู่ขาวดำวงจันทร์', maxLv: 10, kind: 'active', target: 'enemy', icon: ['c3_twinblades', '#e8ecf4'], req: { e3_spiral: 3 },
    sp: (lv) => 24 + lv * 2, cast: 0, cd: 4, range: 8, vfx: 'e3_twin_blades', ref: 1, lock: 0.7, delay: 0.6, knock: 1,
    mult: (lv) => 0.7 + lv * 0.09,
    nf: { anim: 'melee', animDur: 0.5, hits: [0.55, 0.75, 0.95].map((t) => ({ t, m: 1, r: 0.8, stop: 0.03 })).concat([{ t: 1.28, r: 1.8, m: 2, knock: 1, shake: 0.3, stop: 0.06 }]) },
    desc: 'จำลองดาบสั้นคู่ขาวดำในสองมือ ขว้างหมุนแบบบูมเมอแรงโค้งจากซ้ายขวาเข้าหากันที่เป้า 3 คู่ ทุกคู่ฟันไขว้เป็นรูป X คู่สุดท้ายขยายเป็นดาบปีกนกยักษ์แล้วระเบิด',
    effect: (lv) => `3 × ${pct(0.7 + lv * 0.09)}% + ${pct((0.7 + lv * 0.09) * 2)}% ATK รอบเป้า 0.8–1.8 ช่อง · ผลักถอย`,
  },
  e3_aegis: {
    job: 'bladearcher', name: 'ม่านกลีบแสงพิทักษ์', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_petals', '#ff9ad8'], req: { e3_spiral: 3 },
    sp: 55, cast: 0, cd: 25, vfx: 'e3_aegis', lock: 0.4, delay: 0.4,
    nf: { at: 'self', anim: 'cast', texts: [{ t: 0.4, text: 'AEGIS' }] },
    duration: (lv) => 6 + lv * 0.5, bonus: (lv) => ({ dmgReduce: 40 + lv * 3 }),
    desc: 'กลีบแสงสีชมพูบานออกเป็นดอกไม้ตรงหน้า ป้องกันการโจมตีแทบทั้งหมดชั่วครู่ — โล่ฉุกเฉิน',
    effect: (lv) => `ดาเมจที่ได้รับ -${40 + lv * 3}% นาน ${(6 + lv * 0.5).toFixed(1)} วิ · คูลดาวน์ 25 วิ`,
  },
  e3_blade_barrage: {
    job: 'bladearcher', name: 'ห่าดาบเส้นแสง', maxLv: 10, kind: 'active', target: 'enemy', icon: ['c3_bladerain', '#9ad8ff'], req: { e3_twin_blades: 3 },
    sp: (lv) => 36 + lv * 3, cast: 0.5, cd: 6, range: 10, vfx: 'e3_blade_barrage', ref: 1, lock: 0.9, delay: 0.8, knock: 1,
    mult: (lv) => 0.6 + lv * 0.08,
    nf: { anim: 'castHold', hits: [1.45, 1.55, 1.65, 1.75].map((t) => ({ t, r: 3.2, m: 0.6 })).concat([{ t: 1.9, r: 3.4, m: 1.6, knock: 1, shake: 0.35, stop: 0.05 }]) },
    desc: 'ดาบยี่สิบสี่เล่มก่อตัวจากเส้นโครงสีฟ้าลอยเหนือศัตรู แล้วพุ่งลงปักพื้นต่อเนื่อง ปิดท้ายด้วยระเบิดกลางวง — สกิลโจมตีหมู่',
    effect: (lv) => `4 × ${pct((0.6 + lv * 0.08) * 0.6)}% + ${pct((0.6 + lv * 0.08) * 1.6)}% ATK รอบเป้า 3.2–3.4 ช่อง · ผลักถอย`,
  },
  e3_blade_field: {
    job: 'bladearcher', name: 'สมรภูมิพันศาสตรา', maxLv: 5, kind: 'active', target: 'enemy', icon: ['c3_bladefield', '#ff9a3a'], req: { e3_blade_barrage: 5, e3_aegis: 3 },
    sp: (lv) => 110 + lv * 6, cast: (lv) => 1.8 - lv * 0.15, cd: 16, range: 10, vfx: 'e3_blade_field', ref: 1, lock: 1.6, delay: 1.4, knock: 2,
    mult: (lv) => 1.2 + lv * 0.25,
    nf: { anim: 'castHold', sky: { t: 0, dark: 0.6, dur: 4.2 }, flashes: [{ t: 0.1, a: 0.3, color: '#ffb05a' }, { t: 3.48, a: 0.75, color: '#ffe0b0' }], hits: [2.4, 2.7, 3.0, 3.25].map((t) => ({ t, r: 4, m: 0.6, shake: 0.15 })).concat([{ t: 3.48, r: 4.6, m: 4, knock: 1, shake: 1, stop: 0.14 }]) },
    desc: 'วงไฟวิ่งออกจากตัวเปลี่ยนสนามเป็นทุ่งแดงส้ม เฟืองยักษ์หมุนบนฟ้า ดาบนับสิบปักทั่วทุ่ง แล้วลอยขึ้นพุ่งเข้าศัตรูทีละเล่ม ปิดฉากด้วยศรดาบเกลียวยักษ์ระเบิด (ไม้ตาย)',
    effect: (lv) => `4 × ${pct((1.2 + lv * 0.25) * 0.6)}% + ${pct((1.2 + lv * 0.25) * 4)}% ATK รอบเป้า 4–4.6 ช่อง · คูลดาวน์ 16 วิ`,
  },
};

export const ARCHER3_SFX = { e3_spiral: 'shoot', e3_twin_blades: 'swing', e3_aegis: 'skill', e3_blade_barrage: 'cast', e3_blade_field: 'cast' };
export const ARCHER3_IMPACT_SFX = { e3_spiral: 'explosion', e3_twin_blades: 'slam', e3_blade_barrage: 'explosion', e3_blade_field: 'explosion' };

export const HEAL3_SKILLS = (healAmount) => ({
  h3_ark: {
    job: 'goddess', name: 'ลูกแสงชำระบาป', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['c3_lightorb', '#ffe8a0'], element: 'holy',
    sp: (lv) => 14 + lv * 2, cast: 0.2, cd: 0.8, range: 9, vfx: 'h3_ark', ref: 1, lock: 0.4, delay: 0.3, engage: true,
    mult: (lv) => 1.4 + lv * 0.18,
    nf: { magic: true, anim: 'cast', hits: [{ t: 0.56, m: 1, shake: 0.15 }, { t: 0.62, r: 1.5, m: 0.6, shake: 0.12, stop: 0.04 }] },
    desc: 'รวมแสงเทพธิดาเป็นลูกแสงระหว่างสองมือ แล้วปล่อยเข้าเป้า ขยายเป็นทรงกลมแสงชำระล้างพร้อมตราเทพธิดาบนพื้น — สกิลโจมตีหลัก',
    effect: (lv) => `${pct(1.4 + lv * 0.18)}% + ทรงกลมแสง ${pct((1.4 + lv * 0.18) * 0.6)}% MATK รอบเป้า 1.5 ช่อง · ธาตุศักดิ์สิทธิ์`,
  },
  h3_wing_judgement: {
    job: 'goddess', name: 'ปีกเทพธิดาพิพากษา', maxLv: 10, kind: 'active', target: 'enemy', magic: true, icon: ['c3_featherblade', '#fff2c8'], element: 'holy', req: { h3_ark: 3 },
    sp: (lv) => 30 + lv * 3, cast: 0.6, cd: 5, range: 9, vfx: 'h3_wing_judgement', ref: 1, lock: 0.8, delay: 0.7, knock: 1,
    mult: (lv) => 0.7 + lv * 0.09,
    nf: { magic: true, anim: 'castHold', hits: [0.6, 0.85, 1.1].map((t) => ({ t, r: 3, m: 0.6 })).concat([{ t: 1.4, r: 3.2, m: 1.8, knock: 1, shake: 0.35, stop: 0.05 }]) },
    desc: 'กางปีกเทพธิดาสองคู่ ขนนกแสงพุ่งเป็นใบมีดตกใส่ศัตรู 3 ระลอก แล้วลำแสงจากฟ้าตกกลางวงระเบิดผลักกระเด็น — สกิลโจมตีหมู่',
    effect: (lv) => `3 × ${pct((0.7 + lv * 0.09) * 0.6)}% + ${pct((0.7 + lv * 0.09) * 1.8)}% MATK รอบเป้า 3–3.2 ช่อง · ผลักถอย`,
  },
  h3_goddess_heal: {
    job: 'goddess', name: 'พรรักษาแห่งเทพธิดา', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_goddessheal', '#ffc070'],
    sp: (lv) => 30 + lv * 3, cast: 0.3, cd: 4, vfx: 'h3_goddess_heal', lock: 0.5, delay: 0.4,
    heal: (lv, pl) => Math.round(healAmount(lv, pl) * 1.1),
    nf: { at: 'self', anim: 'castHold', heals: [0.5, 1.1] },
    desc: 'แสงอบอุ่นสีส้มทองห่อหุ้มตัว ตราเทพธิดาเปิดบนพื้น ปีกคู่หนึ่งกางออก รักษาตัวเองและเพื่อนในปาร์ตี้รอบตัว 2 ครั้ง — ฮีลหลัก',
    effect: (lv) => `ฟื้นฟู HP 2 ครั้ง (ครั้งละ ~110% ของฮีลพื้นฐาน) · เพื่อนในปาร์ตี้รอบตัว 6 ช่องได้ด้วย`,
  },
  h3_wing_guard: {
    job: 'goddess', name: 'อ้อมปีกคุ้มครอง', maxLv: 10, kind: 'active', target: 'self', icon: ['c3_wingcocoon', '#fff2c8'], req: { h3_goddess_heal: 3 },
    sp: 50, cast: 0, cd: 18, vfx: 'h3_wing_guard', lock: 0.5, delay: 0.5,
    nf: { at: 'self', anim: 'cast', texts: [{ t: 0.8, text: 'BARRIER' }] },
    duration: (lv) => 10 + lv, bonus: (lv) => ({ dmgReduce: 20 + lv * 3, mdef: lv * 3, def: lv * 2 }),
    desc: 'ปีกขาวกางออกแล้วโอบห่อตัวเป็นรังไหม ก่อนคลี่เป็นโดมแสงคุ้มครอง ลดดาเมจที่ได้รับอย่างมาก ใช้กับเพื่อนในปาร์ตี้รอบตัวได้ด้วย',
    effect: (lv) => `ดาเมจที่ได้รับ -${20 + lv * 3}% · DEF +${lv * 2} · MDEF +${lv * 3} นาน ${10 + lv} วิ · คูลดาวน์ 18 วิ`,
  },
  h3_awakening: {
    job: 'goddess', name: 'เทพธิดาตื่นรู้', maxLv: 5, kind: 'active', target: 'enemy', magic: true, icon: ['c3_awaken', '#ffe8a0'], element: 'holy', req: { h3_wing_judgement: 5, h3_wing_guard: 3 },
    sp: (lv) => 100 + lv * 6, cast: (lv) => 1.6 - lv * 0.12, cd: 14, range: 10, vfx: 'h3_awakening', ref: 1, lock: 1.6, delay: 1.4, knock: 2,
    mult: (lv) => 1.2 + lv * 0.22, heal: (lv, pl) => Math.round(healAmount(lv, pl) * 0.8),
    nf: { magic: true, anim: 'castHold', sky: { t: 0, dark: 0.55, dur: 4.2 }, flashes: [{ t: 3.0, a: 0.75, color: '#fff2c8' }], heals: [1.2, 2.2], hits: [1.0, 1.4, 1.8, 2.2].map((t) => ({ t, r: 4, m: 0.5, shake: 0.12 })).concat([{ t: 3.0, r: 4.6, m: 4, knock: 1, shake: 1, stop: 0.14 }]) },
    desc: 'ฟ้ามืดลง พลังเทพธิดาตื่นเต็มที่ ปีกแสงสามคู่กางสยาย เสาแสงพุ่งจากตัว ลำแสงชำระตกทั่วสนาม รักษาเพื่อน 2 ครั้ง แล้วลูกแสงยักษ์รวมตัวเหนือศัตรู ระเบิดเป็นทรงกลมแสงชำระครอบทั้งวง (ไม้ตาย)',
    effect: (lv) => `4 × ${pct((1.2 + lv * 0.22) * 0.5)}% + ${pct((1.2 + lv * 0.22) * 4)}% MATK รอบเป้า 4–4.6 ช่อง · ฮีลปาร์ตี้ 2 ครั้ง · คูลดาวน์ 14 วิ`,
  },
});

export const HEAL3_SFX = { h3_ark: 'cast', h3_wing_judgement: 'cast', h3_goddess_heal: 'heal', h3_wing_guard: 'skill', h3_awakening: 'cast' };
export const HEAL3_IMPACT_SFX = { h3_ark: 'thunder', h3_wing_judgement: 'explosion', h3_awakening: 'explosion' };
export const HEAL3_PARTY = { h3_goddess_heal: 6, h3_wing_guard: 5, h3_awakening: 6 };

// รวมทั้ง 4 สาย (skills.js / Game.js ใช้)
export const job3Skills = (healAmount) => ({ ...SWORD3_SKILLS, ...MAGE3_SKILLS, ...ARCHER3_SKILLS, ...HEAL3_SKILLS(healAmount) });
export const JOB3_SFX = { ...SWORD3_SFX, ...MAGE3_SFX, ...ARCHER3_SFX, ...HEAL3_SFX };
export const JOB3_IMPACT_SFX = { ...SWORD3_IMPACT_SFX, ...MAGE3_IMPACT_SFX, ...ARCHER3_IMPACT_SFX, ...HEAL3_IMPACT_SFX };
export const JOB3_PARTY = { ...MAGE3_PARTY, ...HEAL3_PARTY };
