// หน้าต่างคลังเก็บของ: ฝาก/ถอนระหว่างกระเป๋ากับคลัง (คลังใช้ร่วมกันทั้งบัญชี)
import { ITEMS, RARITY } from '../data/items.js';
import { iconURL } from '../render/ItemIcons.js';

export class StorageWindow {
  constructor(root, player, storage, { onMove, onClose } = {}) {
    this.player = player;
    this.storage = storage;
    this.onMove = onMove; this.onClose = onClose;
    this.el = root.querySelector('#stor');
    this.$ = (id) => root.querySelector('#' + id);
    this.sel = null;          // { from: 'bag' | 'stor', id }
    this.qty = 1;
    this.$('storClose').addEventListener('click', () => this.close());
    this.$('storAllEtc').addEventListener('click', () => {
      const etc = this.player.inventory.stacks.filter((s) => ITEMS[s.id].type === 'etc').map((s) => [s.id, s.qty]);
      for (const [id, q] of etc) this.onMove('bag', id, q);
      this.sel = null; this.render();
    });
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  get open() { return !this.el.hidden; }

  show() { this.el.hidden = false; this.sel = null; this.render(); }

  close() {
    if (!this.open) return;
    this.el.hidden = true; this.sel = null;
    if (this.onClose) this.onClose();
  }

  src(from) { return from === 'bag' ? this.player.inventory : this.storage; }

  select(from, id) {
    this.sel = { from, id };
    this.qty = this.src(from).count(id);   // ค่าเริ่มต้น = ทั้งกอง
    this.render();
  }

  grid(el, inv, from) {
    el.innerHTML = '';
    for (const s of inv.stacks) {
      const it = ITEMS[s.id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `slot r-${it.rarity || 'common'}`;
      b.innerHTML = `<img alt="" src="${iconURL(s.id)}">` + (s.qty > 1 ? `<span class="qty">${s.qty}</span>` : '');
      b.title = `${it.name} x${s.qty} · ดับเบิลคลิกเพื่อ${from === 'bag' ? 'ฝาก' : 'ถอน'}ทั้งหมด`;
      b.setAttribute('aria-label', `${it.name} ${s.qty} ชิ้น`);
      if (this.sel && this.sel.from === from && this.sel.id === s.id) b.classList.add('sel');
      b.addEventListener('click', () => this.select(from, s.id));
      b.addEventListener('dblclick', () => { this.onMove(from, s.id, s.qty); this.sel = null; this.render(); });
      el.append(b);
    }
    // ช่องว่างจาง ๆ ให้เห็นความจุ
    const pad = Math.max(0, Math.min(inv.capacity, Math.ceil((inv.stacks.length + 1) / 6) * 6, 30) - inv.stacks.length);
    for (let i = 0; i < pad; i++) { const e = document.createElement('div'); e.className = 'slot empty'; el.append(e); }
  }

  render() {
    if (!this.open) return;
    const bag = this.player.inventory, st = this.storage;
    this.$('storBagCount').textContent = `${bag.stacks.length}/${bag.capacity}`;
    this.$('storCount').textContent = `${st.stacks.length}/${st.capacity}`;
    if (this.sel && this.src(this.sel.from).count(this.sel.id) <= 0) this.sel = null;
    this.grid(this.$('storBag'), bag, 'bag');
    this.grid(this.$('storGrid'), st, 'stor');
    this.$('storAllEtc').disabled = !bag.stacks.some((s) => ITEMS[s.id].type === 'etc');

    const act = this.$('storAct');
    if (!this.sel) {
      act.innerHTML = '<p class="hint">เลือกไอเทมฝั่งกระเป๋าเพื่อฝาก หรือฝั่งคลังเพื่อถอน · ดับเบิลคลิกเพื่อย้ายทั้งกอง</p>';
      return;
    }
    const { from, id } = this.sel, it = ITEMS[id], have = this.src(from).count(id);
    this.qty = Math.max(1, Math.min(have, this.qty));
    const rar = RARITY[it.rarity || 'common'];
    act.innerHTML = `<img alt="" src="${iconURL(id)}">
      <div class="sa-info"><b style="color:${rar.color}">${it.name}</b><small>${from === 'bag' ? 'ในกระเป๋า' : 'ในคลัง'} ${have} ชิ้น</small></div>
      <div class="stepper"><button type="button" class="mn" aria-label="ลดจำนวน">−</button><span class="q">${this.qty}</span><button type="button" class="pl" aria-label="เพิ่มจำนวน">+</button><button type="button" class="mx" aria-label="ทั้งหมด" title="ทั้งหมด">≫</button></div>
      <button type="button" class="primary go">${from === 'bag' ? 'ฝากเข้าคลัง' : 'ถอนออกมา'}</button>`;
    const set = (q) => { this.qty = Math.max(1, Math.min(have, q)); act.querySelector('.q').textContent = this.qty; };
    act.querySelector('.mn').addEventListener('click', (e) => set(this.qty - (e.shiftKey ? 10 : 1)));
    act.querySelector('.pl').addEventListener('click', (e) => set(this.qty + (e.shiftKey ? 10 : 1)));
    act.querySelector('.mx').addEventListener('click', () => set(have));
    act.querySelector('.go').addEventListener('click', () => { this.onMove(from, id, this.qty); this.render(); });
  }
}
