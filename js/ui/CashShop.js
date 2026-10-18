// v0.43 ร้านเพชร + เติมเพชร (โอนพร้อมเพย์ → ส่งสลิป → แอดมินอนุมัติ)
// ราคา/สินค้า/แพ็กมาจากเซิร์ฟเวอร์ (supabase/cashshop.sql) · ซื้อแล้วของเข้าเซฟบนเซิร์ฟเวอร์ → ดึง ledger มาปรับในเครื่อง
import { ITEMS, RARITY } from '../data/items.js?v=0.43.0';
import { COSTUME_BY_ID, RARITY as FASHION_RARITY } from '../data/costumes.js?v=0.43.0';
import { iconURL } from '../render/ItemIcons.js?v=0.43.0';
import { requestThumb } from '../render/CostumeThumbs.js?v=0.43.0';
import { ready } from './TradeMarket.js?v=0.43.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const QR_SRC = 'assets/ui/topup_qr.png';   // ภาพ QR พร้อมเพย์ของเจ้าของเกม (ใส่ไฟล์นี้เอง)
const TABS = [['fashion', 'แฟชั่น'], ['box', 'กล่อง & สัตว์เลี้ยง'], ['convenience', 'สะดวกสบาย'], ['boost', 'เร่งเลเวล'], ['topup', '💎 เติมเพชร']];

// ย่อรูปสลิปเป็น JPEG ไม่เกิน 1400px (ไฟล์เล็ก อัปโหลดเร็ว)
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.85));
}

export class CashShopWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'fashion'; this.st = null; this.busy = false; this.msg = ''; this.pack = null; this.file = null; this.adminRows = null; this.slips = {};
    const el = this.el = document.createElement('section');
    el.className = 'panel tm cs'; el.hidden = true;
    el.innerHTML = `<header class="st-head"><div><h2>ร้านเพชร</h2><p>แฟชั่น · กล่องสุ่ม · ไอเทมสะดวกสบาย · เพชรใช้ร่วมทุกตัวละครในบัญชี</p></div><div class="cs-gems" title="เพชรของคุณ">💎 <b>0</b></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.close());
    this.body = el.querySelector('.tm-body');
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { if (on) this.show(); else this.close(); }
  close() { this.el.hidden = true; }
  log(m) { this.msg = m; this.render(); }

  async show() {
    this.el.hidden = false; this.msg = '';
    if (!this.g.cloud || !this.g.online || !this.g.online.tradeRPC) { this.msg = 'ร้านเพชรใช้ได้เมื่อเล่นออนไลน์และเซฟบนคลาวด์'; return this.render(); }
    this.render();
    await this.load();
  }

  async load() {
    this.busy = true; this.render();
    const r = await this.g.online.tradeRPC('cash_state', {});
    this.busy = false;
    if (r.error) { this.msg = r.error; return this.render(); }
    this.st = r.data;
    this.news(this.st.requests || []);
    this.render();
  }

  // แจ้งผลคำขอเติมที่เพิ่งตัดสิน
  news(reqs) {
    for (const q of reqs) if (q.new) this.g.hud.log(q.status === 'approved' ? `💎 เติมเพชรสำเร็จ +${fmt(q.gems)} เพชร (โอน ${fmt(q.thb)} บาท)${q.reply ? ' · ' + q.reply : ''}` : `💎 คำขอเติม ${fmt(q.thb)} บาท ไม่ผ่าน${q.reply ? ': ' + q.reply : ''}`, 'sys');
  }

  // เรียกตอนเข้าเกมออนไลน์: เช็กผลการเติมแบบเงียบ ๆ
  async checkNews() {
    if (!this.g.cloud || !this.g.online || !this.g.online.tradeRPC) return;
    const r = await this.g.online.tradeRPC('cash_state', {});
    if (!r.error && r.data) { this.st = r.data; this.news(r.data.requests || []); }
  }

  async buy(p) {
    if (this.busy) return;
    const name = this.nameOf(p);
    if ((this.st.gems || 0) < p.price) { this.msg = `เพชรไม่พอ (มี ${fmt(this.st.gems)} ต้องใช้ ${fmt(p.price)}) · เติมได้ที่แท็บ 💎 เติมเพชร`; return this.render(); }
    if (this.confirmId !== p.id) { this.confirmId = p.id; this.msg = `กด "ยืนยัน" อีกครั้งเพื่อซื้อ ${name} ราคา ${fmt(p.price)} เพชร`; return this.render(); }
    this.confirmId = null; this.busy = true; this.msg = ''; this.render();
    try {
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('cash_buy', { p_product: p.id, p_count: 1 });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.st.gems = r.data.gems;
      this.g.sfx('coin');
      this.msg = p.kind === 'fashion' ? `ได้รับ ${name} แล้ว · เปิดตู้แฟชั่น (O) เพื่อสวมใส่` : `ได้รับ ${name}${p.qty > 1 ? ' ×' + p.qty : ''} แล้ว · อยู่ในกระเป๋า`;
    } finally { this.busy = false; this.render(); }
  }

  async submitTopup() {
    if (this.busy || !this.pack || !this.file) return;
    this.busy = true; this.msg = 'กำลังอัปโหลดสลิป…'; this.render();
    try {
      const blob = await shrink(this.file);
      const up = await this.g.online.uploadSlip(blob);
      if (up.error) { this.msg = up.error; return; }
      const note = (this.body.querySelector('#csNote') || {}).value || '';
      const r = await this.g.online.tradeRPC('topup_request', { p_thb: this.pack.thb, p_slip: up.path, p_note: note });
      if (r.error) { this.msg = r.error; return; }
      this.msg = `ส่งคำขอเติม ${fmt(this.pack.thb)} บาท (${fmt(this.pack.gems)} เพชร) แล้ว · แอดมินตรวจแล้วเพชรจะเข้าบัญชีอัตโนมัติ`;
      this.pack = null; this.file = null;
      this.busy = false; await this.load();
    } catch (e) { this.msg = 'อ่านรูปสลิปไม่ได้ ลองเลือกรูปใหม่'; } finally { this.busy = false; this.render(); }
  }

  async loadAdmin() {
    const r = await this.g.online.tradeRPC('gm_topups', { p_status: 'pending' });
    this.adminRows = r.error ? [] : r.data || [];
    if (r.error) this.msg = r.error;
    this.render();
  }

  async decide(row, ok) {
    if (this.busy) return;
    const reply = (this.body.querySelector(`#csReply${row.id}`) || {}).value || '';
    this.busy = true; this.render();
    const r = await this.g.online.tradeRPC('gm_topup_decide', { p_id: row.id, p_approve: ok, p_reply: reply });
    this.busy = false;
    this.msg = r.error || (ok ? `อนุมัติ ${row.name} +${fmt(row.gems)} เพชรแล้ว` : `ปฏิเสธคำขอของ ${row.name} แล้ว`);
    await this.loadAdmin();
  }

  nameOf(p) {
    if (p.kind === 'fashion') return (COSTUME_BY_ID[p.ref] || {}).name || p.ref;
    return (ITEMS[p.ref] || {}).name || p.ref;
  }

  setTab(t) { this.tab = t; this.msg = ''; this.confirmId = null; this.render(); if (t === 'admin') this.loadAdmin(); }

  render() {
    if (!this.open) return;
    const st = this.st;
    this.el.querySelector('.cs-gems b').textContent = fmt(st ? st.gems : 0);
    const tabs = [...TABS, ...(st && st.admin ? [['admin', 'อนุมัติเติม']] : [])];
    this.body.innerHTML = `<div class="inv-tabs tm-tabs cs-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.tab === k}">${n}</button>`).join('')}</div>
      <p class="tm-msg" ${this.msg ? '' : 'hidden'}></p><div class="tm-pane"></div>`;
    if (this.msg) this.body.querySelector('.tm-msg').textContent = this.msg;
    for (const b of this.body.querySelectorAll('[data-t]')) b.addEventListener('click', () => this.setTab(b.dataset.t));
    const pane = this.body.querySelector('.tm-pane');
    if (!st) { pane.innerHTML = `<p class="tm-empty">${this.busy ? 'กำลังโหลด…' : ''}</p>`; return; }
    if (this.tab === 'topup') return this.renderTopup(pane);
    if (this.tab === 'admin') return this.renderAdmin(pane);
    this.renderProducts(pane);
  }

  renderProducts(pane) {
    const list = (this.st.products || []).filter((p) => p.cat === this.tab);
    const grid = document.createElement('div'); grid.className = 'cs-grid';
    if (!list.length) grid.innerHTML = '<p class="tm-empty">ยังไม่มีสินค้าในหมวดนี้</p>';
    const owned = this.g.player.fashion.owned;
    for (const p of list) {
      const fashion = p.kind === 'fashion', it = fashion ? COSTUME_BY_ID[p.ref] : ITEMS[p.ref];
      if (!it) continue;
      const rar = fashion ? (FASHION_RARITY[it.rarity] || {}) : (RARITY[it.rarity || 'common'] || {});
      const card = document.createElement('div'); card.className = 'cs-card';
      card.innerHTML = `${p.tag ? '<span class="cs-tag"></span>' : ''}<div class="cs-pic"><img alt=""></div><b class="cs-name"></b><small class="cs-desc"></small><button type="button" class="primary"></button>`;
      if (p.tag) card.querySelector('.cs-tag').textContent = p.tag;
      const img = card.querySelector('img');
      if (fashion) requestThumb(it, img, 96); else img.src = iconURL(p.ref);
      const nm = card.querySelector('.cs-name'); nm.textContent = it.name + (p.qty > 1 ? ` ×${p.qty}` : ''); if (rar.color) nm.style.color = rar.color;
      card.querySelector('.cs-desc').textContent = fashion ? it.desc : (it.effect ? it.effect + (it.desc ? ' · ' : '') : '') + (it.desc || '');
      const btn = card.querySelector('button');
      const have = fashion && owned.has(p.ref);
      btn.textContent = have ? 'มีแล้ว' : this.confirmId === p.id ? `ยืนยัน 💎 ${fmt(p.price)}` : `💎 ${fmt(p.price)}`;
      btn.disabled = have || this.busy;
      btn.addEventListener('click', () => this.buy(p));
      grid.append(card);
    }
    pane.append(grid);
  }

  renderTopup(pane) {
    const st = this.st;
    pane.innerHTML = `<p class="tm-hint">1 บาท = 1 เพชร · แพ็กใหญ่แถมเพิ่ม · เลือกแพ็ก → สแกน QR พร้อมเพย์โอนตามยอด → แนบสลิป → แอดมินตรวจยอดเงินเข้าแล้วเพชรเข้าบัญชีอัตโนมัติ</p>
      <div class="cs-packs"></div><div class="cs-pay"></div>
      <h3>ประวัติการเติม</h3><div class="tm-list cs-hist"></div>
      <p class="tm-hint cs-terms">เพชรใช้ซื้อของในเกมเท่านั้น แลกคืนเป็นเงินไม่ได้ · โอนไม่ตรงยอดหรือสลิปไม่ถูกต้อง คำขอจะไม่ผ่าน</p>`;
    const packs = pane.querySelector('.cs-packs');
    for (const pk of st.packs || []) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cs-pack' + (this.pack && this.pack.thb === pk.thb ? ' sel' : '');
      const bonus = pk.gems - pk.thb;
      b.innerHTML = `<b>💎 ${fmt(pk.gems)}</b><span>${fmt(pk.thb)} บาท</span>${bonus > 0 ? `<em>แถม ${fmt(bonus)}</em>` : ''}`;
      b.addEventListener('click', () => { this.pack = pk; this.render(); });
      packs.append(b);
    }
    const pay = pane.querySelector('.cs-pay');
    if (this.pack) {
      pay.innerHTML = `<div class="cs-qr"><img alt="QR พร้อมเพย์สำหรับโอนเงิน" src="${QR_SRC}"><p class="tm-empty" hidden>แอดมินยังไม่ได้ใส่ QR (ไฟล์ assets/ui/topup_qr.png)</p></div>
        <div class="cs-form"><p class="cs-amt">โอน <b>${fmt(this.pack.thb)} บาท</b> ได้ <b>💎 ${fmt(this.pack.gems)}</b></p>
          <label class="cs-file">แนบสลิป <input id="csSlip" type="file" accept="image/*"></label>
          <label>หมายเหตุ (ไม่บังคับ) <input id="csNote" type="text" maxlength="120" placeholder="เช่น เวลาโอน 14:05"></label>
          <button type="button" class="primary" id="csSend" ${!this.file || this.busy ? 'disabled' : ''}>ส่งคำขอเติมเพชร</button></div>`;
      const im = pay.querySelector('.cs-qr img');
      im.addEventListener('error', () => { im.hidden = true; pay.querySelector('.cs-qr p').hidden = false; });
      const f = pay.querySelector('#csSlip');
      f.addEventListener('change', () => { this.file = f.files && f.files[0] && /^image\//.test(f.files[0].type) ? f.files[0] : null; pay.querySelector('#csSend').disabled = !this.file || this.busy; });
      pay.querySelector('#csSend').addEventListener('click', () => this.submitTopup());
    }
    const hist = pane.querySelector('.cs-hist');
    const reqs = st.requests || [];
    if (!reqs.length) hist.innerHTML = '<p class="tm-empty">ยังไม่เคยเติม</p>';
    for (const q of reqs) {
      const r = document.createElement('div'); r.className = 'tm-row cs-req';
      const s = { pending: '⏳ รอตรวจ', approved: '✔ สำเร็จ', rejected: '✕ ไม่ผ่าน' }[q.status] || q.status;
      r.innerHTML = `<span class="cs-st cs-${q.status}"></span><div class="tm-info"><b></b><small></small></div><span class="tm-price"></span>`;
      r.querySelector('.cs-st').textContent = s;
      r.querySelector('b').textContent = `${fmt(q.thb)} บาท → 💎 ${fmt(q.gems)}`;
      r.querySelector('small').textContent = new Date(q.at).toLocaleString('th-TH') + (q.reply ? ' · ' + q.reply : '');
      hist.append(r);
    }
  }

  renderAdmin(pane) {
    pane.innerHTML = `<p class="tm-hint">ตรวจยอดเงินเข้าในแอปธนาคารจริงทุกครั้งก่อนอนุมัติ (สลิปปลอมได้) · อนุมัติแล้วเพชรเข้าบัญชีผู้เล่นทันที ย้อนไม่ได้</p><div class="tm-list cs-admin"></div>`;
    const list = pane.querySelector('.cs-admin');
    if (this.adminRows === null) { list.innerHTML = '<p class="tm-empty">กำลังโหลด…</p>'; return; }
    if (!this.adminRows.length) { list.innerHTML = '<p class="tm-empty">ไม่มีคำขอรอตรวจ</p>'; return; }
    for (const row of this.adminRows) {
      const box = document.createElement('div'); box.className = 'cs-adm';
      box.innerHTML = `<div class="tm-info"><b></b><small></small></div><div class="cs-slip"><button type="button" data-a="slip">ดูสลิป</button></div>
        <input id="csReply${row.id}" type="text" maxlength="120" placeholder="ข้อความถึงผู้เล่น (ไม่บังคับ)">
        <div class="tm-foot"><button type="button" class="ghost" data-a="no">ปฏิเสธ</button><button type="button" class="primary" data-a="ok">อนุมัติ +💎 ${fmt(row.gems)}</button></div>`;
      box.querySelector('b').textContent = `${row.name} · ${fmt(row.thb)} บาท`;
      box.querySelector('small').textContent = new Date(row.at).toLocaleString('th-TH') + (row.note ? ' · ' + row.note : '');
      const slip = box.querySelector('.cs-slip');
      const showSlip = (url) => { slip.innerHTML = url ? `<a href="${url}" target="_blank" rel="noopener"><img alt="สลิปโอนเงิน" src="${url}"></a>` : '<span class="tm-empty">เปิดสลิปไม่ได้</span>'; };
      if (this.slips[row.slip] !== undefined) showSlip(this.slips[row.slip]);
      else box.querySelector('[data-a="slip"]').addEventListener('click', async () => { this.slips[row.slip] = await this.g.online.slipUrl(row.slip); showSlip(this.slips[row.slip]); });
      for (const b of box.querySelectorAll('[data-a="ok"], [data-a="no"]')) { b.disabled = this.busy; b.addEventListener('click', () => this.decide(row, b.dataset.a === 'ok')); }
      list.append(box);
    }
  }
}
