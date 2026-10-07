// หน้าต่างร้านค้า NPC: แท็บซื้อ / ขาย พร้อมตะกร้าเลือกจำนวน
import { ITEMS, RARITY, EQUIP_SLOTS, describeBonus, canJobUse } from '../data/items.js';
import { JOBS } from '../data/progression.js';
import { SHOPS, buyPrice, sellPrice, fmtZ } from '../data/shops.js';
import { STACK_MAX } from '../systems/Inventory.js';
import { iconURL } from '../render/ItemIcons.js';

const slotName = (id) => (EQUIP_SLOTS.find((s) => s.id === id) || {}).name || '';

export class ShopWindow {
  constructor(root, player, { onBuy, onSell, onClose } = {}) {
    this.player = player;
    this.onBuy = onBuy; this.onSell = onSell; this.onClose = onClose;
    this.el = root.querySelector('#shop');
    this.$ = (id) => root.querySelector('#' + id);
    this.shopId = null;
    this.tab = 'buy';
    this.cart = new Map();
    this.rows = [];
    this.confirmRare = false;

    this.$('shopTabs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => this.setTab(b.dataset.tab)));
    this.$('shopClose').addEventListener('click', () => this.close());
    this.$('shopClear').addEventListener('click', () => { this.cart.clear(); this.refresh(); });
    this.$('shopQuick').addEventListener('click', () => this.selectAllEtc());
    this.$('shopOk').addEventListener('click', () => this.confirm());
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  get open() { return !this.el.hidden; }

  show(shopId, tab = 'buy') {
    this.shopId = shopId;
    this.el.hidden = false;
    this.$('shopTitle').textContent = SHOPS[shopId].name;
    this.setTab(tab);
  }

  close() {
    if (!this.open) return;
    this.el.hidden = true;
    this.cart.clear();
    if (this.onClose) this.onClose();
  }

  setTab(tab) {
    this.tab = tab;
    this.cart.clear();
    this.confirmRare = false;
    this.$('shopTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    this.$('shopSub').textContent = tab === 'buy' ? 'เลือกจำนวนแล้วกด "ซื้อ"' : 'ขายคืนได้ครึ่งราคา · ของที่สวมใส่อยู่จะไม่แสดง';
    this.build();
  }

  price(id) { return this.tab === 'buy' ? buyPrice(id) : sellPrice(id); }

  // รายการสินค้าตามแท็บ
  list() {
    const inv = this.player.inventory;
    if (this.tab === 'buy') return SHOPS[this.shopId].items.map((id) => ({ id, have: inv.count(id) }));
    return inv.stacks.filter((s) => sellPrice(s.id) > 0).map((s) => ({ id: s.id, have: s.qty }));
  }

  detail(id) {
    const it = ITEMS[id], p = this.player, bits = [];
    if (it.heal) {
      if (it.heal.hp) bits.push(`HP +${it.heal.hp[0]}~${it.heal.hp[1]}`);
      if (it.heal.sp) bits.push(`SP +${it.heal.sp[0]}~${it.heal.sp[1]}`);
    }
    if (it.type === 'equip') bits.push(slotName(it.slot));
    if (it.bonus) bits.push(describeBonus(it.bonus));
    if (it.reqLevel) bits.push(`<span class="${p.baseLevel < it.reqLevel ? 'bad' : ''}">Lv.${it.reqLevel}</span>`);
    if (it.jobs) bits.push(`<span class="${canJobUse(it, p.jobId) ? '' : 'bad'}">${it.jobs.map((j) => JOBS[j].name).join('/')}</span>`);
    if (it.type === 'etc') bits.push('ของสะสม');
    return bits.join(' · ');
  }

  build() {
    const box = this.$('shopList');
    box.innerHTML = '';
    this.rows = [];
    const items = this.list();
    if (!items.length) {
      box.innerHTML = `<p class="inv-empty">${this.tab === 'sell' ? 'ไม่มีของที่ขายได้ในกระเป๋า' : 'ร้านนี้ยังไม่มีสินค้า'}</p>`;
    }
    for (const { id, have } of items) {
      const it = ITEMS[id], rar = it.rarity || 'common';
      const row = document.createElement('div');
      row.className = `sh-row r-${rar}`;
      row.innerHTML = `<img alt="" src="${iconURL(id)}">
        <div class="sh-info"><b style="color:${RARITY[rar].color}">${it.name}</b><small>${this.detail(id)}</small></div>
        <div class="sh-price"><b>${fmtZ(this.price(id))}</b><small>${this.tab === 'sell' ? `มี ${have}` : have ? `มีอยู่ ${have}` : ''}</small></div>
        <div class="stepper"><button type="button" class="mn" aria-label="ลดจำนวน">−</button><span class="q">0</span><button type="button" class="pl" aria-label="เพิ่มจำนวน">+</button><button type="button" class="mx" title="สูงสุด" aria-label="จำนวนสูงสุด">≫</button></div>`;
      const r = { id, have, row, q: row.querySelector('.q'), mn: row.querySelector('.mn'), pl: row.querySelector('.pl'), mx: row.querySelector('.mx') };
      const add = (n) => this.setQty(id, (this.cart.get(id) || 0) + n);
      row.querySelector('.sh-info').addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      row.querySelector('img').addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      r.pl.addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      r.mn.addEventListener('click', (e) => add(e.shiftKey ? -10 : -1));
      r.mx.addEventListener('click', () => this.setQty(id, (this.cart.get(id) || 0) > 0 && (this.cart.get(id) === this.maxFor(id)) ? 0 : this.maxFor(id)));
      box.append(row);
      this.rows.push(r);
    }
    this.$('shopQuick').hidden = this.tab !== 'sell';
    this.refresh();
  }

  // จำนวนสูงสุดที่เลือกได้ของไอเทมนี้ (คิดจากเงิน/ช่องกระเป๋าที่เหลือ)
  maxFor(id) {
    const p = this.player;
    if (this.tab === 'sell') return p.inventory.count(id);
    const others = this.total() - (this.cart.get(id) || 0) * buyPrice(id);
    const byZeny = Math.floor((p.zeny - others) / Math.max(1, buyPrice(id)));
    const inv = p.inventory;
    let byRoom = inv.room(id);
    if (!inv.count(id)) {
      // ช่องว่างที่เหลือหลังหักสินค้าชนิดใหม่อื่น ๆ ในตะกร้า
      let newOthers = 0;
      for (const [k, q] of this.cart) if (k !== id && q > 0 && !inv.count(k)) newOthers++;
      byRoom = inv.stacks.length + newOthers < inv.capacity ? STACK_MAX : 0;
    }
    return Math.max(0, Math.min(byZeny, byRoom, STACK_MAX));
  }

  setQty(id, q) {
    const cap = this.tab === 'sell' ? this.player.inventory.count(id) : STACK_MAX;
    q = Math.max(0, Math.min(cap, Math.floor(q)));
    if (q) this.cart.set(id, q); else this.cart.delete(id);
    this.confirmRare = false;
    this.refresh();
  }

  total() { let t = 0; for (const [id, q] of this.cart) t += this.price(id) * q; return t; }

  selectAllEtc() {
    for (const r of this.rows) if (ITEMS[r.id].type === 'etc' && !ITEMS[r.id].keep) this.cart.set(r.id, this.player.inventory.count(r.id));
    this.confirmRare = false;
    this.refresh();
  }

  problem() {
    const p = this.player, total = this.total();
    if (!this.cart.size) return '';
    if (this.tab === 'buy') {
      if (total > p.zeny) return `Zeny ไม่พอ (ขาดอีก ${fmtZ(total - p.zeny)})`;
      if (!p.inventory.fits([...this.cart])) return 'กระเป๋าไม่มีช่องว่างพอ';
    }
    return '';
  }

  refresh() {
    if (!this.open) return;
    const p = this.player;
    for (const r of this.rows) {
      const q = this.cart.get(r.id) || 0;
      r.q.textContent = q;
      r.row.classList.toggle('sel', q > 0);
      r.mn.disabled = q <= 0;
      r.pl.disabled = this.tab === 'sell' ? q >= p.inventory.count(r.id) : false;
    }
    const total = this.total();
    this.$('shopZeny').textContent = fmtZ(p.zeny);
    this.$('shopTotalLbl').textContent = this.tab === 'buy' ? 'ราคารวม' : 'ได้รับ';
    this.$('shopTotal').textContent = (this.tab === 'buy' ? '' : '+') + fmtZ(total);
    const prob = this.problem();
    const msg = this.$('shopMsg');
    const rare = this.tab === 'sell' && [...this.cart.keys()].some((id) => ['rare', 'epic'].includes(ITEMS[id].rarity));
    msg.textContent = prob || (this.confirmRare ? 'มีของหายากในรายการขาย กดยืนยันอีกครั้งเพื่อขาย' : '');
    msg.classList.toggle('bad', !!prob);
    const ok = this.$('shopOk');
    ok.disabled = !this.cart.size || !!prob;
    ok.textContent = this.tab === 'buy' ? 'ซื้อ' : (rare && this.confirmRare ? 'ยืนยันขาย' : 'ขาย');
    ok.classList.toggle('danger', rare && this.confirmRare);
    this.$('shopClear').disabled = !this.cart.size;
  }

  confirm() {
    if (!this.cart.size || this.problem()) return;
    const list = [...this.cart];
    if (this.tab === 'sell') {
      const rare = list.some(([id]) => ['rare', 'epic'].includes(ITEMS[id].rarity));
      if (rare && !this.confirmRare) { this.confirmRare = true; this.refresh(); return; }
      this.onSell(list);
    } else {
      this.onBuy(list);
    }
    this.cart.clear();
    this.confirmRare = false;
    this.build();
  }

  // เรียกเมื่อกระเป๋าเปลี่ยนจากที่อื่น (เช่น เก็บของ ใช้ยา)
  sync() {
    if (!this.open) return;
    if (this.tab === 'sell') {
      for (const [id, q] of [...this.cart]) { const n = this.player.inventory.count(id); if (n <= 0) this.cart.delete(id); else if (q > n) this.cart.set(id, n); }
      const keep = new Map(this.cart); this.build(); this.cart = keep; this.refresh();
    } else this.refresh();
  }
}
