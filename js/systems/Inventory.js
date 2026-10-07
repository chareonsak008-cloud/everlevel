// กระเป๋าไอเทม: เก็บเป็นกอง (stack) ตามชนิดไอเทม
import { ITEMS } from '../data/items.js';

export const STACK_MAX = 999;

export class Inventory {
  constructor(capacity = 60) {
    this.capacity = capacity;   // จำนวนช่องสูงสุด (ชนิดไอเทม)
    this.stacks = [];           // [{ id, qty }]
  }

  count(id) { const s = this.stacks.find((x) => x.id === id); return s ? s.qty : 0; }

  // เพิ่มไอเทม คืนค่าจำนวนที่เพิ่มได้จริง (0 = กระเป๋าเต็ม)
  add(id, qty = 1) {
    if (!ITEMS[id] || qty <= 0) return 0;
    let s = this.stacks.find((x) => x.id === id);
    if (!s) {
      if (this.stacks.length >= this.capacity) return 0;
      s = { id, qty: 0 };
      this.stacks.push(s);
    }
    const n = Math.min(qty, STACK_MAX - s.qty);
    s.qty += n;
    return n;
  }

  remove(id, qty = 1) {
    const i = this.stacks.findIndex((x) => x.id === id);
    if (i < 0) return 0;
    const n = Math.min(qty, this.stacks[i].qty);
    this.stacks[i].qty -= n;
    if (this.stacks[i].qty <= 0) this.stacks.splice(i, 1);
    return n;
  }

  canAdd(id) { return !!this.stacks.find((x) => x.id === id && x.qty < STACK_MAX) || this.stacks.length < this.capacity; }

  // ใส่ไอเทมชนิดนี้เพิ่มได้อีกกี่ชิ้น
  room(id) {
    const s = this.stacks.find((x) => x.id === id);
    if (s) return STACK_MAX - s.qty;
    return this.stacks.length < this.capacity ? STACK_MAX : 0;
  }

  // ตรวจว่ารับไอเทมหลายชนิดพร้อมกันได้ไหม (ใช้ตอนซื้อของ) [[id, qty], ...]
  fits(list) {
    let newSlots = 0;
    for (const [id, qty] of list) {
      const s = this.stacks.find((x) => x.id === id);
      if (s) { if (s.qty + qty > STACK_MAX) return false; } else { newSlots++; if (qty > STACK_MAX) return false; }
    }
    return this.stacks.length + newSlots <= this.capacity;
  }

  toSave() { return this.stacks.map((s) => [s.id, s.qty]); }

  fromSave(list) {
    this.stacks = [];
    if (Array.isArray(list)) for (const [id, qty] of list) this.add(id, Math.max(0, Math.floor(qty) || 0));
  }
}
