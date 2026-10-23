// โรงตีเหล็ก (v0.10): ตีบวกอุปกรณ์ + ใส่การ์ด — ตรรกะล้วน ไม่ยุ่งกับ UI
// ref = ตำแหน่งของชิ้นอุปกรณ์ { where: 'equip', slot, key } หรือ { where: 'bag', key }
import { ITEMS, itemKey, itemMods, EQUIP_SLOTS } from '../data/items.js?v=0.93.0-p2.11';
import { canRefine, refineMaterial, refineFee, refineRate, rollRefine, failResult, REFINE_MAX, BREAK_FROM, SAFE_LIMIT, LUCK_BONUS, boostedRate } from '../data/refine.js?v=0.93.0-p2.11';
import { CARDS } from '../data/cards.js?v=0.93.0-p2.11';
import { unsocketCost, keyWithout } from '../data/durability.js?v=0.93.0-p2.11';   // v0.89

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
export function refineCheck(player, ref, guard = false, luck = false, extra = 0) {
  // v0.38: ชิ้นที่เลือกต้องยังอยู่ที่เดิม (กันสวม/ถอดระหว่างรอค้อนตี → ของงอกเป็น 2 ชิ้น)
  if (!gearOwned(player, ref)) return { ok: false, reason: 'ไม่พบอุปกรณ์ชิ้นนี้แล้ว (ถูกสวม/ถอดไป) เลือกใหม่อีกครั้ง' };
  const it = ITEMS[ref.key];
  if (!canRefine(it)) return { ok: false, reason: 'อุปกรณ์ชิ้นนี้ตีบวกไม่ได้' };
  const { refine } = itemMods(ref.key);
  const target = refine + 1;
  const mat = refineMaterial(it), fee = refineFee(target);
  const useGuard = guard && target >= BREAK_FROM;
  const useLuck = luck && target > SAFE_LIMIT;
  const bonus = target > SAFE_LIMIT ? (useLuck ? LUCK_BONUS : 0) + extra : 0;
  const rate = boostedRate(refineRate(target), bonus);   // v0.85 สูงสุด 80%
  const info = { target, mat, fee, rate, bonus, useGuard, useLuck, fail: failResult(target, useGuard) };
  if (refine >= REFINE_MAX) return { ...info, ok: false, reason: `ตีบวกสูงสุด +${REFINE_MAX} แล้ว` };
  if (player.inventory.count(mat) < 1) return { ...info, ok: false, reason: `ต้องใช้${ITEMS[mat].name} 1 ก้อน` };
  if (player.zeny < fee) return { ...info, ok: false, reason: 'Zeny ไม่พอสำหรับค่าตีบวก' };
  if (useGuard && player.inventory.count('refine_guard') < 1) return { ...info, ok: false, reason: 'ไม่มีคริสตัลพิทักษ์' };
  if (useLuck && player.inventory.count('refine_luck') < 1) return { ...info, ok: false, reason: 'ไม่มีหินนำโชค' };
  // ของในกระเป๋าที่ซ้อนกันหลายชิ้น: ชิ้นที่ตีแล้วต้องมีช่องว่างแยก
  if (ref.where === 'bag' && player.inventory.count(ref.key) > 1 && player.inventory.stacks.length >= player.inventory.capacity) return { ...info, ok: false, reason: 'กระเป๋าเต็ม ต้องมีช่องว่าง 1 ช่อง' };
  return { ...info, ok: true };
}

// ตีบวก 1 ครั้ง → { result: 'success'|'down'|'break', oldKey, newKey, from, to }
export function doRefine(player, ref, guard = false, rnd = Math.random, luck = false, extra = 0) {
  const chk = refineCheck(player, ref, guard, luck, extra);
  if (!chk.ok) return { error: chk.reason };
  const { base, refine, cards, roll } = itemMods(ref.key);
  player.inventory.remove(chk.mat, 1);
  player.spendZeny(chk.fee);
  if (chk.useGuard) player.inventory.remove('refine_guard', 1);
  if (chk.useLuck) player.inventory.remove('refine_luck', 1);
  const result = rollRefine(chk.target, chk.useGuard, rnd, chk.bonus);
  const to = result === 'success' ? chk.target : result === 'down' ? Math.max(0, refine - 1) : result === 'none' ? refine : -1;
  const newKey = to < 0 ? null : itemKey(base, to, cards, roll);   // v0.25: เก็บค่าสุ่มไว้
  replaceGear(player, ref, newKey);
  return { result, oldKey: ref.key, newKey, from: refine, to, guarded: chk.useGuard, lucky: chk.useLuck };
}

export const gearOwned = (player, ref) => !!ref && !!ref.key && (ref.where === 'equip' ? player.equip[ref.slot] === ref.key : player.inventory.count(ref.key) > 0);

// แทนที่ชิ้นอุปกรณ์ (newKey = null คืออุปกรณ์แตกหาย) แล้วอัปเดตปุ่มลัดที่ชี้ชิ้นเดิม
export function replaceGear(player, ref, newKey) {
  const oldDura = player.dura && player.dura[ref.key];   // v0.89 ความทนทานตามคีย์ใหม่
  if (ref.where === 'equip') player.equip[ref.slot] = newKey;
  else { player.inventory.remove(ref.key, 1); if (newKey) player.inventory.add(newKey, 1, true); }   // v0.16: ชิ้นเดิมกลับเข้ากระเป๋าเสมอ
  const left = player.inventory.count(ref.key) + (Object.values(player.equip).includes(ref.key) ? 1 : 0);
  if (!left) player.hotbar = player.hotbar.map((k) => (k === ref.key ? newKey : k));
  if (oldDura != null && newKey) player.dura[newKey] = oldDura;
  if (!left && player.dura) delete player.dura[ref.key];
  player.afterEquipChange();
  if (ref.where === 'equip') ref.key = newKey;
}

// v0.89 ถอดการ์ด (จ่าย Zeny แพงมาก) — idx = ลำดับการ์ดในชิ้น · การ์ดกลับเข้ากระเป๋า อุปกรณ์ไม่เสีย
export function doUnsocket(player, ref, idx) {
  const it = ITEMS[ref.key];
  if (!it) return { error: 'ไม่พบอุปกรณ์' };
  if (!gearOwned(player, ref)) return { error: 'ไม่พบอุปกรณ์ชิ้นนี้แล้ว เลือกใหม่อีกครั้ง' };
  const { cards } = itemMods(ref.key), cardId = cards[idx];
  if (!cardId || !CARDS[cardId]) return { error: 'ไม่พบการ์ดในช่องนี้' };
  const cost = unsocketCost(cardId);
  if (player.zeny < cost) return { error: `Zeny ไม่พอ (ค่าถอด ${cost.toLocaleString('en-US')} z)` };
  const bagLeft = player.inventory.capacity - player.inventory.stacks.length;
  const needSlot = (player.inventory.count(cardId) ? 0 : 1) + (ref.where === 'bag' && player.inventory.count(ref.key) > 1 ? 1 : 0);
  if (bagLeft < needSlot) return { error: 'กระเป๋าเต็ม ต้องมีช่องว่างสำหรับการ์ดที่ถอดออก' };
  if (!player.spendZeny(cost)) return { error: 'Zeny ไม่พอ' };
  const newKey = keyWithout(ref.key, idx), oldKey = ref.key;
  replaceGear(player, ref, newKey);
  player.inventory.add(cardId, 1, true);
  return { oldKey, newKey, cardId, cost };
}

/* ---------- การ์ด ---------- */

// อุปกรณ์ที่ใส่การ์ดใบนี้ได้ (ช่องตรงกันและยังมีช่องการ์ดว่าง)
export function socketTargets(player, cardId) {
  const c = CARDS[cardId];
  if (!c) return [];
  return gearList(player, (it, key) => { const cs = itemMods(key).cards; return it.slot === c.on && cs.length < (it.slots || 0) && cs.filter((x) => x === cardId).length < (c.maxStack || 9); });
}

export function doSocket(player, ref, cardId) {
  const c = CARDS[cardId], it = ITEMS[ref.key];
  if (!c || !it) return { error: 'ไม่พบการ์ดหรืออุปกรณ์' };
  if (!gearOwned(player, ref)) return { error: 'ไม่พบอุปกรณ์ชิ้นนี้แล้ว เลือกใหม่อีกครั้ง' };
  if (player.inventory.count(cardId) < 1) return { error: 'ไม่มีการ์ดใบนี้' };
  const { base, refine, cards, roll } = itemMods(ref.key);
  if (it.slot !== c.on) return { error: `การ์ดใบนี้ใส่ได้เฉพาะ${c.on}` };
  if (cards.length >= (it.slots || 0)) return { error: 'อุปกรณ์ชิ้นนี้ไม่มีช่องการ์ดว่าง' };
  if (cards.filter((x) => x === cardId).length >= (c.maxStack || 9)) return { error: c.maxStack > 1 ? `การ์ดใบนี้เสียบซ้ำในชิ้นเดียวได้สูงสุด ${c.maxStack} ใบ` : 'การ์ดใบนี้ไม่ซ้อน เสียบได้ชิ้นละ 1 ใบ' };
  if (ref.where === 'bag' && player.inventory.count(ref.key) > 1 && player.inventory.stacks.length >= player.inventory.capacity && player.inventory.count(cardId) > 1) return { error: 'กระเป๋าเต็ม ต้องมีช่องว่าง 1 ช่อง' };
  player.inventory.remove(cardId, 1);
  const newKey = itemKey(base, refine, [...cards, cardId], roll);
  const oldKey = ref.key;
  replaceGear(player, ref, newKey);
  return { oldKey, newKey };
}
