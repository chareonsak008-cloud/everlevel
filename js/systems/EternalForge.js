// v0.77 หลอมอุปกรณ์นิรันดร์กาล — ตรวจวัตถุดิบ · หักของ · สุ่มสำเร็จ/ล้มเหลว
// ล้มเหลว = เสียวัตถุดิบ + Zeny ทั้งหมด แต่อุปกรณ์ฐาน (เทพสวรรค์) ยังอยู่ · สำเร็จ = ฐานถูกใช้ไป (ระดับตีบวก/การ์ดของฐานหายไปด้วย)
import { ITEMS } from '../data/items.js?v=0.88.0';
import { baseOf, recipeOf, eternalId, LUCK_STEP, LUCK_MAX } from '../data/eternal.js?v=0.88.0';

export const invHave = (inv, id) => inv.stacks.filter((s) => s.id === id).reduce((a, s) => a + s.qty, 0);
const refineOf = (key) => Math.floor(+String(key).split('*')[1] || 0);

// ฐานที่จะใช้: ชิ้นที่ตีบวกน้อยที่สุด (ไม่เอาชิ้นที่สวมอยู่)
export function pickBase(pl, line, slot) {
  const b = baseOf(line, slot);
  const list = pl.inventory.stacks.filter((s) => String(s.id).split('*')[0] === b).sort((x, y) => refineOf(x.id) - refineOf(y.id));
  return list[0] ? list[0].id : null;
}

export function forgeCheck(pl, line, slot, luck = 0) {
  const R = recipeOf(slot), base = pickBase(pl, line, slot), out = eternalId(line, slot);
  const mats = R.mats.map(([id, n]) => ({ id, n, have: invHave(pl.inventory, id) }));
  luck = Math.max(0, Math.min(LUCK_MAX, Math.floor(luck), invHave(pl.inventory, 'refine_luck')));
  const missing = [];
  if (!base) missing.push(`${ITEMS[baseOf(line, slot)] ? ITEMS[baseOf(line, slot)].name : baseOf(line, slot)} (อุปกรณ์ฐาน)`);
  for (const m of mats) if (m.have < m.n) missing.push(`${ITEMS[m.id] ? ITEMS[m.id].name : m.id} ${m.have}/${m.n}`);
  if (pl.zeny < R.zeny) missing.push(`Zeny ${pl.zeny.toLocaleString('en-US')}/${R.zeny.toLocaleString('en-US')}`);
  const lvOk = pl.baseLevel >= (ITEMS[out] ? ITEMS[out].reqLevel : 145);
  return { out, base, mats, zeny: R.zeny, rate: luck ? Math.max(R.rate, Math.min(0.8, R.rate + luck * LUCK_STEP)) : R.rate,   // v0.85 หินนำโชคดันได้สูงสุด 80%
    luck, missing, lvOk, ok: !missing.length && lvOk };
}

export function doForge(pl, line, slot, luck = 0, rnd = Math.random) {
  const c = forgeCheck(pl, line, slot, luck);
  if (!c.lvOk) return { error: `ต้องมี Base Lv.${ITEMS[c.out].reqLevel} ขึ้นไปจึงหลอมได้` };
  if (!c.ok) return { error: `วัตถุดิบไม่พอ: ${c.missing.join(' · ')}` };
  if (!pl.inventory.canAdd(c.out) && !pl.inventory.stacks.some((s) => s.id === c.base && s.qty === 1)) return { error: 'กระเป๋าเต็ม' };
  // หักของ (ล้มเหลวก็หัก)
  if (!pl.spendZeny(c.zeny)) return { error: 'Zeny ไม่พอ' };
  for (const m of c.mats) pl.inventory.remove(m.id, m.n);
  if (c.luck) pl.inventory.remove('refine_luck', c.luck);
  const ok = rnd() < c.rate;
  if (ok) { pl.inventory.remove(c.base, 1); pl.inventory.add(c.out, 1, true); }
  return { ok, out: c.out, base: c.base, rate: c.rate };
}
