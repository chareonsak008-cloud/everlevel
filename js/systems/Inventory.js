// กระเป๋าไอเทม: เก็บเป็นกอง (stack) ตามชนิดไอเทม
import { ITEMS, rollItem } from '../data/items.js?v=0.93.0-p4.6';

export const STACK_MAX = 999;

export class Inventory {
  constructor(capacity = 60) {
    this.capacity = capacity;   // จำนวนช่องสูงสุด (ชนิดไอเทม)
    this.stacks = [];           // [{ id, qty }]
  }

  // v0.94 ไอเทมชนิดเดียวกันมีได้หลายกอง (กองละไม่เกิน 999 · เต็มแล้วขึ้นกองใหม่)
  count(id) { let n = 0; for (const x of this.stacks) if (x.id === id) n += x.qty; return n; }

  // เพิ่มไอเทม คืนค่าจำนวนที่เพิ่มได้จริง (0 = กระเป๋าเต็ม)
  // force = ใส่ได้แม้ช่องเต็ม (ใช้ตอนคืนของที่เพิ่งถอด/สลับ/ยกเลิก — กันของหาย) · v0.16
  add(id, qty = 1, force = false) {
    qty = Math.floor(qty);
    if (!ITEMS[id] || !(qty > 0)) return 0;
    // v0.25: อาวุธที่มีค่าสุ่ม → แต่ละชิ้นสุ่มค่าของตัวเองตอนเข้ากระเป๋า (ไม่ซ้อนกัน)
    if (ITEMS[id].rolls && !String(id).includes('*')) { let n = 0; for (let i = 0; i < qty; i++) n += this.add(rollItem(id), 1, force); return n; }
    let left = qty;
    for (const s of this.stacks) {   // เติมกองเดิมที่ยังไม่เต็มก่อน
      if (s.id !== id || s.qty >= STACK_MAX) continue;
      const n = Math.min(left, STACK_MAX - s.qty); s.qty += n; left -= n;
      if (!left) break;
    }
    while (left > 0) {   // ที่เหลือ → กองใหม่ (ช่องเต็ม = หยุด · force ยอมเกินได้หนึ่งกอง)
      if (this.stacks.length >= this.capacity && !force) break;
      const n = Math.min(left, STACK_MAX);
      this.stacks.push({ id, qty: n }); left -= n;
      if (this.stacks.length > this.capacity) break;
    }
    const added = qty - left;
    if (added > 0 && !force && this.onAdd) { try { this.onAdd(id, added); } catch (e) { /* แจ้งเตือนพลาดไม่กระทบกระเป๋า */ } }
    return added;
  }

  // เอาออกจากกองท้ายสุดก่อน (กองเต็มด้านหน้าคงอยู่)
  remove(id, qty = 1) {
    let left = Math.floor(qty);
    for (let i = this.stacks.length - 1; i >= 0 && left > 0; i--) {
      const s = this.stacks[i]; if (s.id !== id) continue;
      const n = Math.min(left, s.qty); s.qty -= n; left -= n;
      if (s.qty <= 0) this.stacks.splice(i, 1);
    }
    return Math.floor(qty) - left;
  }

  canAdd(id) { return this.stacks.some((x) => x.id === id && x.qty < STACK_MAX) || this.stacks.length < this.capacity; }

  // ใส่ไอเทมชนิดนี้เพิ่มได้อีกกี่ชิ้น (ที่ว่างในกองเดิม + ช่องว่าง × 999)
  room(id) {
    let n = 0;
    for (const s of this.stacks) if (s.id === id) n += STACK_MAX - s.qty;
    return n + Math.max(0, this.capacity - this.stacks.length) * STACK_MAX;
  }

  // ตรวจว่ารับไอเทมหลายชนิดพร้อมกันได้ไหม (ใช้ตอนซื้อของ) [[id, qty], ...]
  fits(list) {
    let slots = this.capacity - this.stacks.length;
    const need = new Map();
    for (const [id, qty] of list) need.set(id, (need.get(id) || 0) + Math.max(0, Math.floor(qty)));
    for (const [id, q] of need) {
      let free = 0; for (const s of this.stacks) if (s.id === id) free += STACK_MAX - s.qty;
      const over = Math.max(0, q - free);
      slots -= Math.ceil(over / STACK_MAX);
      if (slots < 0) return false;
    }
    return true;
  }

  toSave() { return this.stacks.map((s) => [s.id, s.qty]); }

  fromSave(list) {
    this.stacks = [];
    const cb = this.onAdd; this.onAdd = null;   // โหลดเซฟ = ไม่แจ้งเตือน
    if (Array.isArray(list)) for (const [id, qty] of list) this.add(id, Math.max(0, Math.floor(qty) || 0));
    this.onAdd = cb;
  }
}
