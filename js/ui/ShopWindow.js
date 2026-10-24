// หน้าต่างร้านค้า NPC: แท็บซื้อ / ขาย พร้อมตะกร้าเลือกจำนวน
import { ITEMS, RARITY, EQUIP_SLOTS, describeBonus, canJobUse, itemMods } from '../data/items.js?v=0.93.0-p4.6';
import { JOBS } from '../data/progression.js?v=0.93.0-p4.6';
import { SHOPS, buyPrice, sellPrice, fmtZ } from '../data/shops.js?v=0.93.0-p4.6';
import { STACK_MAX } from '../systems/Inventory.js?v=0.93.0-p4.6';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p4.6';

// v0.93 แท็บขายแยกหมวด: ขยะ/ของสะสม · อุปกรณ์ · ของใช้ · การ์ด/อื่น ๆ
const SELL_CATS = [['etc', 'ขยะ'], ['equip', 'อุปกรณ์'], ['usable', 'ของใช้'], ['other', 'วัสดุ / การ์ด'], ['all', 'ทั้งหมด']];
const catOf = (it) => (it.type === 'etc' ? (it.keep ? 'other' : 'etc') : it.type === 'equip' || it.type === 'usable' ? it.type : 'other');
const plainEquip = (id) => { const it = ITEMS[id]; if (!it || it.type !== 'equip' || !['common', 'uncommon'].includes(it.rarity || 'common')) return false; const m = itemMods(id); return !m.refine && !(m.cards && m.cards.length); };
const GRADES = Object.keys(RARITY);   // v0.94 ลำดับระดับ ธรรมดา → นิรันดร์
const gradeOf = (it) => Math.max(0, GRADES.indexOf((it && it.rarity) || 'common'));
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
    this.sellCat = 'etc';
    this.grade = 0;   // v0.94 ระดับสูงสุดที่ "เลือกตามระดับ" จะเลือก (0 = ธรรมดา)
    this.filt = document.createElement('div'); this.filt.className = 'shop-filter'; this.filt.setAttribute('role', 'tablist');
    this.$('shopTabs').after(this.filt);

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
    const seen = new Set(), out = [];   // v0.94 หลายกองชนิดเดียวกัน = แถวเดียว (รวมจำนวน)
    for (const st of inv.stacks) {
      if (seen.has(st.id) || !(sellPrice(st.id) > 0)) continue;
      seen.add(st.id);
      if (this.sellCat === 'all' || catOf(ITEMS[st.id]) === this.sellCat) out.push({ id: st.id, have: inv.count(st.id) });
    }
    return out;
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
    this.filt.hidden = this.tab !== 'sell';
    if (this.tab === 'sell') {
      const st = [...new Map(this.player.inventory.stacks.filter((x) => sellPrice(x.id) > 0).map((x) => [x.id, x])).values()], n = (c) => (c === 'all' ? st.length : st.filter((x) => catOf(ITEMS[x.id]) === c).length);
      this.filt.innerHTML = SELL_CATS.map(([c, name]) => `<button type="button" role="tab" data-c="${c}" aria-selected="${this.sellCat === c}">${name} <small>${n(c)}</small></button>`).join('');
      this.filt.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.sellCat = b.dataset.c; this.cart.clear(); this.confirmRare = false; this.build(); }));
      this.$('shopQuick').textContent = this.sellCat === 'equip' ? 'เลือกอุปกรณ์ธรรมดาทั้งหมด' : 'เลือกขยะทั้งหมด';
      // v0.94 เลือกขายตามระดับ: ทุกชิ้นในหมวดนี้ที่ระดับไม่เกินที่เลือก (ข้ามของตีบวก/ใส่การ์ด และของสะสมสำคัญ)
      const g = document.createElement('div'); g.className = 'shop-grade';
      g.innerHTML = `<label>เลือกตามระดับ <select aria-label="ระดับสูงสุดที่จะเลือก">${GRADES.map((r, i) => `<option value="${i}"${i === this.grade ? ' selected' : ''}>≤ ${RARITY[r].name}</option>`).join('')}</select></label><button type="button" class="ghost">เลือก</button>`;
      g.querySelector('select').addEventListener('change', (e) => { this.grade = +e.target.value; });
      g.querySelector('button').addEventListener('click', () => this.selectByGrade());
      this.filt.append(g);
    }
    this.rows = [];
    const items = this.list();
    if (!items.length) {
      box.innerHTML = `<p class="inv-empty">${this.tab === 'sell' ? 'ไม่มีของที่ขายได้ในหมวดนี้' : 'ร้านนี้ยังไม่มีสินค้า'}</p>`;
    }
    for (const { id, have } of items) {
      const it = ITEMS[id], rar = it.rarity || 'common';
      const row = document.createElement('div');
      row.className = `sh-row r-${rar}`;
      row.innerHTML = `<img alt="" src="${iconURL(id)}">
        <div class="sh-info"><b style="color:${RARITY[rar].color}">${it.name}</b><small>${this.detail(id)}</small></div>
        <div class="sh-price"><b>${fmtZ(this.price(id))}</b><small>${this.tab === 'sell' ? `มี ${have}` : have ? `มีอยู่ ${have}` : ''}</small></div>
        <div class="stepper"><button type="button" class="mn" aria-label="ลดจำนวน">−</button><input class="q" type="number" min="0" inputmode="numeric" value="0" aria-label="จำนวน"><button type="button" class="pl" aria-label="เพิ่มจำนวน">+</button><button type="button" class="mx" title="สูงสุด" aria-label="จำนวนสูงสุด">≫</button></div>`;
      const r = { id, have, row, q: row.querySelector('.q'), mn: row.querySelector('.mn'), pl: row.querySelector('.pl'), mx: row.querySelector('.mx') };
      const add = (n) => this.setQty(id, (this.cart.get(id) || 0) + n);
      r.q.addEventListener('pointerdown', (e) => e.stopPropagation());
      r.q.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') r.q.blur(); });   // พิมพ์ตัวเลขได้ ไม่ไปกดปุ่มลัดในเกม
      r.q.addEventListener('focus', () => r.q.select());
      r.q.addEventListener('change', () => this.setQty(id, Math.min(+r.q.value || 0, this.tab === 'sell' ? this.player.inventory.count(id) : this.maxFor(id))));
      row.querySelector('.sh-info').addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      row.querySelector('img').addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      r.pl.addEventListener('click', (e) => add(e.shiftKey ? 10 : 1));
      r.mn.addEventListener('click', (e) => add(e.shiftKey ? -10 : -1));
      r.mx.addEventListener('click', () => this.setQty(id, (this.cart.get(id) || 0) > 0 && (this.cart.get(id) === this.maxFor(id)) ? 0 : this.maxFor(id)));
      box.append(row);
      this.rows.push(r);
    }
    this.$('shopQuick').hidden = this.tab !== 'sell' || !['etc', 'equip', 'all'].includes(this.sellCat);
    this.refresh();
  }

  // จำนวนสูงสุดที่เลือกได้ของไอเทมนี้ (คิดจากเงิน/ช่องกระเป๋าที่เหลือ)
  maxFor(id) {
    const p = this.player;
    if (this.tab === 'sell') return p.inventory.count(id);
    const others = this.total() - (this.cart.get(id) || 0) * buyPrice(id);
    const byZeny = Math.floor((p.zeny - others) / Math.max(1, buyPrice(id)));
    const inv = p.inventory;
    // v0.94 หลายกองได้: ที่ว่างในกองเดิม + ช่องว่างที่เหลือหลังหักของอื่นในตะกร้า × 999
    let free = 0; for (const st of inv.stacks) if (st.id === id) free += STACK_MAX - st.qty;
    const rest = [...this.cart].filter(([k, q]) => k !== id && q > 0);
    let slots = inv.capacity - inv.stacks.length;
    for (const [k, q] of rest) { let f = 0; for (const st of inv.stacks) if (st.id === k) f += STACK_MAX - st.qty; slots -= Math.ceil(Math.max(0, q - f) / STACK_MAX); }
    const byRoom = free + Math.max(0, slots) * STACK_MAX;
    return Math.max(0, Math.min(byZeny, byRoom, 9999));
  }

  setQty(id, q) {
    const cap = this.tab === 'sell' ? this.player.inventory.count(id) : 9999;
    q = Math.max(0, Math.min(cap, Math.floor(q)));
    if (q) this.cart.set(id, q); else this.cart.delete(id);
    this.confirmRare = false;
    this.refresh();
  }

  total() { let t = 0; for (const [id, q] of this.cart) t += this.price(id) * q; return t; }

  selectAllEtc() {
    const eq = this.sellCat === 'equip';
    for (const r of this.rows) if (eq ? plainEquip(r.id) : ITEMS[r.id].type === 'etc' && !ITEMS[r.id].keep) this.cart.set(r.id, this.player.inventory.count(r.id));
    this.confirmRare = false;
    this.refresh();
  }

  // v0.94 เลือกทุกชิ้นในหมวดที่เปิดอยู่ ที่ระดับไม่เกินที่เลือก
  selectByGrade() {
    let n = 0;
    for (const r of this.rows) {
      const it = ITEMS[r.id], m = itemMods(r.id);
      if (!it || gradeOf(it) > this.grade || m.refine || (m.cards && m.cards.length) || it.keep) continue;
      this.cart.set(r.id, this.player.inventory.count(r.id)); n++;
    }
    this.confirmRare = false;
    this.refresh();
    if (!n) { const msg = this.$('shopMsg'); msg.textContent = 'ไม่มีของระดับนี้ในหมวดที่เลือก (ของตีบวก/ใส่การ์ดจะไม่ถูกเลือก)'; msg.classList.remove('bad'); }
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
      if (document.activeElement !== r.q) r.q.value = q;
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
    const rare = this.tab === 'sell' && [...this.cart.keys()].some((id) => gradeOf(ITEMS[id]) >= 2);
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
      const rare = list.some(([id]) => gradeOf(ITEMS[id]) >= 2);
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
