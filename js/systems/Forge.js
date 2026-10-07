// โรงตีเหล็ก (v0.10): ตีบวกอุปกรณ์ + ใส่การ์ด — ตรรกะล้วน ไม่ยุ่งกับ UI
// ref = ตำแหน่งของชิ้นอุปกรณ์ { where: 'equip', slot, key } หรือ { where: 'bag', key }
import { ITEMS, itemKey, itemMods, EQUIP_SLOTS } from '../data/items.js';
import { canRefine, refineMaterial, refineFee, refineRate, rollRefine, failResult, REFINE_MAX, BREAK_FROM } from '../data/refine.js';
import { CARDS } from '../data/cards.js';

// อุปกรณ์ทั้งหมดของผู้เล่น (สวมอยู่ก่อน แล้วตามด้วยในกระเป๋า)
export function gearList(player, test = () => true) {
  const out = [];
  for (const sl of EQUIP_SLOTS) {
    const key = player.equip[sl.id];
    if (key && ITEMS[key] && test(ITEMS[key], key)) out.push({ where: 'equip', slot: sl.id, key });
  }
  for (const s of player.inventory.stacks) {
    const it = ITEMS[s.id];
    if (it && it.type === 'equip' && test(it, s.id)) out.push({ where: 'bag', key: s.id, qty: s.qty });
  }
  return out;
}

export const refineTargets = (player) => gearList(player, (it) => canRefine(it));

// ตรวจเงื่อนไขก่อนตีบวก → { ok, reason, target, mat, fee, rate, fail }
export function refineCheck(player, ref, guard = false) {
  const it = ITEMS[ref.key];
  if (!canRefine(it)) return { ok: false, reason: 'อุปกรณ์ชิ้นนี้ตีบวกไม่ได้' };
  const { refine } = itemMods(ref.key);
  const target = refine + 1;
  const mat = refineMaterial(it), fee = refineFee(target), rate = refineRate(target);
  const useGuard = guard && target >= BREAK_FROM;
  const info = { target, mat, fee, rate, useGuard, fail: failResult(target, useGuard) };
  if (refine >= REFINE_MAX) return { ...info, ok: false, reason: `ตีบวกสูงสุด +${REFINE_MAX} แล้ว` };
  if (player.inventory.count(mat) < 1) return { ...info, ok: false, reason: `ต้องใช้${ITEMS[mat].name} 1 ก้อน` };
  if (player.zeny < fee) return { ...info, ok: false, reason: 'Zeny ไม่พอสำหรับค่าตีบวก' };
  if (useGuard && player.inventory.count('refine_guard') < 1) return { ...info, ok: false, reason: 'ไม่มีคริสตัลพิทักษ์' };
  // ของในกระเป๋าที่ซ้อนกันหลายชิ้น: ชิ้นที่ตีแล้วต้องมีช่องว่างแยก
  if (ref.where === 'bag' && player.inventory.count(ref.key) > 1 && player.inventory.stacks.length >= player.inventory.capacity) return { ...info, ok: false, reason: 'กระเป๋าเต็ม ต้องมีช่องว่าง 1 ช่อง' };
  return { ...info, ok: true };
}

// ตีบวก 1 ครั้ง → { result: 'success'|'down'|'break', oldKey, newKey, from, to }
export function doRefine(player, ref, guard = false, rnd = Math.random) {
  const chk = refineCheck(player, ref, guard);
  if (!chk.ok) return { error: chk.reason };
  const { base, refine, cards } = itemMods(ref.key);
  player.inventory.remove(chk.mat, 1);
  player.spendZeny(chk.fee);
  if (chk.useGuard) player.inventory.remove('refine_guard', 1);
  const result = rollRefine(chk.target, chk.useGuard, rnd);
  const to = result === 'success' ? chk.target : result === 'down' ? Math.max(0, refine - 1) : result === 'none' ? refine : -1;
  const newKey = to < 0 ? null : itemKey(base, to, cards);
  replaceGear(player, ref, newKey);
  return { result, oldKey: ref.key, newKey, from: refine, to, guarded: chk.useGuard };
}

// แทนที่ชิ้นอุปกรณ์ (newKey = null คืออุปกรณ์แตกหาย) แล้วอัปเดตปุ่มลัดที่ชี้ชิ้นเดิม
export function replaceGear(player, ref, newKey) {
  if (ref.where === 'equip') player.equip[ref.slot] = newKey;
  else { player.inventory.remove(ref.key, 1); if (newKey) player.inventory.add(newKey, 1); }
  const left = player.inventory.count(ref.key) + (Object.values(player.equip).includes(ref.key) ? 1 : 0);
  if (!left) player.hotbar = player.hotbar.map((k) => (k === ref.key ? newKey : k));
  player.afterEquipChange();
  if (ref.where === 'equip') ref.key = newKey;
}

/* ---------- การ์ด ---------- */

// อุปกรณ์ที่ใส่การ์ดใบนี้ได้ (ช่องตรงกันและยังมีช่องการ์ดว่าง)
export function socketTargets(player, cardId) {
  const c = CARDS[cardId];
  if (!c) return [];
  return gearList(player, (it, key) => it.slot === c.on && itemMods(key).cards.length < (it.slots || 0));
}

export function doSocket(player, ref, cardId) {
  const c = CARDS[cardId], it = ITEMS[ref.key];
  if (!c || !it) return { error: 'ไม่พบการ์ดหรืออุปกรณ์' };
  if (player.inventory.count(cardId) < 1) return { error: 'ไม่มีการ์ดใบนี้' };
  const { base, refine, cards } = itemMods(ref.key);
  if (it.slot !== c.on) return { error: `การ์ดใบนี้ใส่ได้เฉพาะ${c.on}` };
  if (cards.length >= (it.slots || 0)) return { error: 'อุปกรณ์ชิ้นนี้ไม่มีช่องการ์ดว่าง' };
  if (ref.where === 'bag' && player.inventory.count(ref.key) > 1 && player.inventory.stacks.length >= player.inventory.capacity && player.inventory.count(cardId) > 1) return { error: 'กระเป๋าเต็ม ต้องมีช่องว่าง 1 ช่อง' };
  player.inventory.remove(cardId, 1);
  const newKey = itemKey(base, refine, [...cards, cardId]);
  const oldKey = ref.key;
  replaceGear(player, ref, newKey);
  return { oldKey, newKey };
}
