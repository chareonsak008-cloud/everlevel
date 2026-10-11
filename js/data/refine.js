// การตีบวกอุปกรณ์ +1 ถึง +10 (v0.10) — ปรับสมดุลการตีบวกได้จากไฟล์นี้ไฟล์เดียว
// +1~+4 สำเร็จ 100% · +5~+7 ล้มเหลวลดลง 1 ระดับ · +8~+10 ล้มเหลวของแตก (ใช้คริสตัลพิทักษ์กันแตกได้ แต่ยังลดลง 1)

export const REFINE_MAX = 10;
export const SAFE_LIMIT = 4;      // ตีถึงระดับนี้สำเร็จแน่นอน
export const BREAK_FROM = 8;      // ตีขึ้นระดับนี้ขึ้นไป ล้มเหลวแล้วของแตก
// โอกาสสำเร็จ (%) ตามระดับเป้าหมาย [index = ระดับที่จะได้]
export const REFINE_RATE = [0, 100, 100, 100, 100, 75, 60, 50, 35, 25, 15];
// ช่องที่ตีบวกได้ (เครื่องประดับตีไม่ได้)
export const REFINABLE = ['weapon', 'head', 'body', 'shield', 'garment', 'shoes'];

// วัสดุตีบวก (ขายที่โรงตีเหล็กการ์ธ และดรอปจากมอนสเตอร์)
export const REFINE_ITEMS = {
  refine_w: { name: 'ผลึกตีบวกอาวุธ', type: 'etc', keep: true, icon: ['crystal', '#ff8a5a'], price: 600, rarity: 'uncommon', desc: 'ผลึกร้อนระอุที่ช่างใช้หลอมเสริมคมอาวุธ ใช้ 1 ก้อนต่อการตีบวกอาวุธ 1 ครั้ง' },
  refine_a: { name: 'ผลึกตีบวกเกราะ', type: 'etc', keep: true, icon: ['crystal', '#6ab8ff'], price: 900, rarity: 'uncommon', desc: 'ผลึกเย็นเฉียบที่ทำให้เกราะแข็งแกร่งขึ้น ใช้ 1 ก้อนต่อการตีบวกเกราะ/หมวก/โล่/ผ้าคลุม/รองเท้า 1 ครั้ง' },
  refine_guard: { name: 'คริสตัลพิทักษ์', type: 'etc', keep: true, icon: ['crystal', '#ffe08a'], price: 30000, rarity: 'rare', desc: 'ใช้คู่กับการตีบวก +8 ขึ้นไป ถ้าล้มเหลวอุปกรณ์จะไม่แตก (แต่ระดับยังลดลง 1) ใช้แล้วหมดไป' },
};

export const canRefine = (it) => !!it && it.type === 'equip' && REFINABLE.includes(it.slot);
export const refineMaterial = (it) => (it.slot === 'weapon' ? 'refine_w' : 'refine_a');
export const refineFee = (target) => 200 * target + 60 * target * target;   // +1 = 260 z · +5 = 2,500 z · +10 = 8,000 z
export const refineRate = (target) => REFINE_RATE[target] || 0;
export const failResult = (target, guarded) => (target <= SAFE_LIMIT ? 'none' : target >= BREAK_FROM && !guarded ? 'break' : 'down');

// โบนัสจากการตีบวก: อาวุธเพิ่ม ATK ตามความหายาก (ไม้เท้าเพิ่ม MATK ด้วย) และได้โบนัสสองเท่าตั้งแต่ +8
// ชุดเกราะเพิ่ม DEF ระดับละ 1 (ชุดตั้งแต่ +5 ได้ MDEF) และตั้งแต่ +8 ได้ Max HP เพิ่ม
export function refineBonus(it, n) {
  if (!n || !it) return {};
  if (it.slot === 'weapon') {
    const per = { celestial: 13, mythic: 11, legend: 9, epic: 7, rare: 5 }[it.rarity] || 3;
    const v = per * n + per * Math.max(0, n - 7);
    return it.wtype === 'staff' ? { atk: v, matk: v } : { atk: v };
  }
  const o = { def: n };
  if (it.slot === 'body' && n >= 5) o.mdef = n - 4;
  if (n >= 8) o.maxHp = (n - 7) * 30;
  return o;
}

// ทอยผลการตีบวก: 'success' | 'down' | 'break' (rnd ให้ทดสอบได้)
export function rollRefine(target, guarded, rnd = Math.random) {
  if (rnd() * 100 < refineRate(target)) return 'success';
  return failResult(target, guarded);
}
