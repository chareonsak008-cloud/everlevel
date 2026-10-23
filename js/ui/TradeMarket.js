// v0.42 แลกของตัวต่อตัว + ตลาดฝากขาย
// ทุกอย่างผ่านฟังก์ชันบนเซิร์ฟเวอร์ (supabase/trade.sql) — เครื่องผู้เล่นแค่ส่งคำขอ แล้วดึงผล (ledger) มาปรับกระเป๋า
import { ITEMS, RARITY, describeBonus } from '../data/items.js?v=0.93.0-p1.9';
import { rollScore, rollGrade } from '../data/affixes.js?v=0.93.0-p1.9';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.9';
import { buyPrice, sellPrice } from '../data/shops.js?v=0.93.0-p1.9';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const itemName = (id) => (ITEMS[id] ? ITEMS[id].name : id);
const rarityOf = (id) => (ITEMS[id] && ITEMS[id].rarity) || 'common';
const MAX_KINDS = 10;
// v0.44.5 แปลรหัสสาเหตุจากเซิร์ฟเวอร์ (มีชื่อไอเทม)
function tradeNote(n) {
  if (!n) return '';
  const [k, id, x] = String(n).split(':');
  if (k === 'peer_full') return `กระเป๋าอีกฝ่ายรับ ${itemName(id)} ได้อีกแค่ ${fmt(x)} ชิ้น (ชนิดเดียวกันถือได้สูงสุด 999) — ลดจำนวนแล้ววางใหม่`;
  if (k === 'stack_full') return `${itemName(id)} ในกระเป๋าฝ่ายรับจะเกิน 999 ชิ้น — ลดจำนวนแล้ววางใหม่`;
  if (k === 'not_enough') return id ? `${itemName(id)} ในกระเป๋าไม่พอแล้ว — วางของใหม่อีกครั้ง` : 'ของในกระเป๋าไม่พอ';
  if (k === 'not_enough_zeny') return 'Zeny ไม่พอแล้ว — แก้จำนวนแล้ววางใหม่';
  if (k === 'zeny_full') return 'Zeny ของฝ่ายรับจะเกินเพดาน';
  return n;
}

function panel(root, cls, title, sub) {
  const el = document.createElement('section');
  el.className = `panel tm ${cls}`; el.hidden = true;
  el.innerHTML = `<header class="st-head"><div><h2></h2><p></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body"></div>`;
  el.querySelector('h2').textContent = title; el.querySelector('p').textContent = sub;
  for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  (root.querySelector('.hud') || root).append(el);
  return el;
}

function slotBtn(id, qty, { sel = false, title = '' } = {}) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `slot r-${rarityOf(id)}${sel ? ' sel' : ''}`;
  b.innerHTML = `<img alt="" src="${iconURL(id)}">${qty > 1 ? `<span class="qty">${qty}</span>` : ''}`;
  b.title = title || `${itemName(id)} ×${qty}`;
  b.setAttribute('aria-label', `${itemName(id)} ${qty} ชิ้น`);
  return b;
}

// ตัวช่วยร่วม: เช็กว่าพร้อมใช้ระบบเซิร์ฟเวอร์ + เซฟให้ล่าสุดก่อนส่งคำขอ
export async function ready(g) {
  if (!g.cloud || !g.online || !g.online.tradeRPC) return 'ต้องเล่นออนไลน์และเซฟบนคลาวด์จึงจะใช้ได้';
  g.dirty = true;
  await g.saveNow(false, true);
  await g.online.flush();
  if (g.online.lastError) return 'เซฟไม่สำเร็จ ลองใหม่อีกครั้ง';
  if (g.online.serverSave === false) return 'เซิร์ฟเวอร์ยังไม่เปิดระบบนี้ (แอดมินต้องรัน supabase/trade.sql)';
  return null;
}

/* =====================================================================
   แลกของตัวต่อตัว
   ===================================================================== */
export class TradeWindow {
  constructor(root, game) {
    this.g = game; this.t = null; this.draft = []; this.zeny = 0; this.busy = false; this.pollAt = 0; this.closeAt = 0;
    this.el = panel(root, 'tm-trade', 'แลกเปลี่ยน', 'วางของ → ทั้งสองฝ่ายกดยืนยัน → ของย้ายทันที');
    this.el.querySelector('.st-close').addEventListener('click', () => this.cancel());
    this.body = this.el.querySelector('.tm-body');
    this.sel = null;
  }

  get open() { return !this.el.hidden; }
  get peerName() { if (!this.t) return ''; return this.t.me === 'a' ? this.t.b.name : this.t.a.name; }
  ping(extra = {}) { const k = this.g.online.keyByName(this.peerName); if (k) this.g.online.lobbySend('tr', { to: k, id: this.t.id, n: this.g.player.name, ...extra }); }
  log(m) { this.g.hud.log(m, 'sys'); }

  // v0.89 แลกเปลี่ยนได้เฉพาะ VIP กับ VIP — ไม่มี VIP กดแลกแล้วขึ้นหน้าต่างเตือน
  vipWarn(text) {
    const g = this.g, root = g.root.querySelector('.hud') || g.root;
    let m = root.querySelector('.vip-warn');
    if (!m) {
      m = document.createElement('div'); m.className = 'vip-warn'; m.setAttribute('role', 'alertdialog'); m.setAttribute('aria-modal', 'true');
      m.innerHTML = '<div class="panel vw-box"><div class="vw-ic" aria-hidden="true">👑</div><h3>แลกเปลี่ยนไอเทมสำหรับ VIP</h3><p class="vw-t"></p><div class="vw-act"><button type="button" class="primary" data-a="vip">ดูสิทธิ์ VIP</button><button type="button" data-a="x">ปิด</button></div></div>';
      for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) m.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      m.addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (e.target === m || a) m.hidden = true; if (a && a.dataset.a === 'vip') g.cash.show('vip'); });
      root.append(m);
    }
    m.querySelector('.vw-t').textContent = text;
    m.hidden = false;
    g.sfx('chat');
  }

  async invite(name) {
    const g = this.g;
    if (this.open) return this.log('ปิดหน้าต่างแลกเปลี่ยนเดิมก่อน');
    if (!g.vipActive) return this.vipWarn('การแลกเปลี่ยนไอเทมกับผู้เล่นเปิดให้เฉพาะผู้มี VIP ทั้งสองฝ่าย — ซื้อบัตร VIP ได้ที่ร้านเพชร แท็บ VIP · ถ้าต้องการขายของให้ผู้เล่นอื่น ใช้ตลาดฝากขายได้ตามปกติ');
    const key = g.online && g.online.keyByName ? g.online.keyByName(name) : null;
    if (!key) return this.log(`${name} ไม่ได้ออนไลน์อยู่`);
    const err = await ready(g);
    if (err) return this.log(err);
    const r = await g.online.tradeRPC('trade_invite', { p_name: name });
    if (r.error) return this.log(r.error);
    this.t = r.data; this.draft = []; this.zeny = 0; this.msg = ''; this.lastNote = null;
    g.online.lobbySend('tr', { to: key, id: this.t.id, n: g.player.name, inv: 1 });
    this.log(`ส่งคำขอแลกเปลี่ยนให้ ${name} แล้ว รออีกฝ่ายตอบรับ…`);
    this.show();
  }

  // ข้อความจากอีกฝ่าย (lobby 'tr')
  onPing(p) {
    const g = this.g, id = +p.id, from = String(p.n || 'ผู้เล่น').slice(0, 16);
    if (!(id > 0)) return;
    if (p.inv) {
      if (this.open) return;
      if (!g.vipActive) { g.online.tradeRPC('trade_respond', { p_id: id, p_accept: false }); this.log(`${from} ขอแลกเปลี่ยนกับคุณ แต่การแลกเปลี่ยนเปิดให้เฉพาะ VIP — ระบบปฏิเสธให้อัตโนมัติ`); return; }   // v0.89
      g.social.prompt({
        id: 'tr' + id, kind: 'trade', text: `${from} ขอแลกเปลี่ยนไอเทมกับคุณ`,
        yes: async () => {
          const err = await ready(g);
          if (err) return this.log(err);
          const r = await g.online.tradeRPC('trade_respond', { p_id: id, p_accept: true });
          if (r.error) return this.log(r.error);
          this.t = r.data; this.draft = []; this.zeny = 0; this.msg = ''; this.lastNote = null; this.show(); this.ping();
        },
        no: () => { g.online.tradeRPC('trade_respond', { p_id: id, p_accept: false }); },
      });
      return;
    }
    if (this.open && this.t && this.t.id === id) this.poll(true);
  }

  show() { this.el.hidden = false; this.sel = null; this.render(); }
  hide() { this.el.hidden = true; this.t = null; this.closeAt = 0; }

  async cancel() {
    if (this.t && (this.t.status === 'invite' || this.t.status === 'open')) {
      await this.g.online.tradeRPC('trade_cancel', { p_id: this.t.id });
      this.ping();
    }
    this.hide();
  }

  async poll(now = false) {
    if (!this.open || !this.t || this.polling) return;
    this.polling = true;
    try {
      const r = await this.g.online.tradeRPC('trade_current', {});
      if (r.error) return;
      const t = r.data;
      if (!t || t.id !== this.t.id) { if (this.t.status !== 'done') this.finish('cancel', 'อีกฝ่ายปิดการแลกแล้ว'); return; }
      const was = this.t.status;
      this.t = t;
      if (t.status === 'done' && was !== 'done') return this.finish('done');
      if (t.status === 'cancel' && was !== 'cancel') return this.finish('cancel', t.note);
      this.noteCheck();
      const sig = JSON.stringify(t); if (sig !== this.sig) { this.sig = sig; this.render(); }   // ไม่วาดใหม่ถ้าไม่เปลี่ยน (ช่องพิมพ์ไม่หลุด)
    } finally { this.polling = false; }
  }

  // ย้ายของไม่สำเร็จ → โต๊ะยังเปิด · แจ้งสาเหตุครั้งเดียว
  noteCheck() {
    const n = this.t && this.t.status === 'open' ? this.t.note : null;
    if (n && n !== this.lastNote) { this.msg = 'ย้ายของไม่สำเร็จ: ' + tradeNote(n); this.log(this.msg); }
    if (!n && this.lastNote && this.t && this.t.status === 'open') this.msg = '';
    this.lastNote = n;
  }

  async finish(kind, note) {
    if (kind === 'done') {
      try { await this.g.online.syncLedger(); } catch (e) { /* เซฟครั้งถัดไปจะดึงเอง */ }
      this.log(`แลกเปลี่ยนกับ ${this.peerName} สำเร็จ`);
      this.g.sfx('coin');
    } else {
      const why = { declined: 'อีกฝ่ายปฏิเสธ', timeout: 'หมดเวลา', cancelled: 'ยกเลิกแล้ว', replaced: 'อีกฝ่ายเริ่มการแลกใหม่' }[note] || (note && note.startsWith('trade_locked') ? 'บัญชีถูกระงับการแลกชั่วคราว' : tradeNote(note) || 'ยกเลิกแล้ว');
      this.log(`การแลกเปลี่ยนถูกยกเลิก: ${why}`);
      if (this.t) this.t.status = 'cancel';
    }
    this.render();
    this.closeAt = performance.now() + 1800;
  }

  update() {
    if (!this.open) return;
    const now = performance.now();
    if (this.closeAt && now > this.closeAt) return this.hide();
    if (!this.closeAt && now > this.pollAt) { this.pollAt = now + 2000; this.poll(); }
  }

  side(k) { return this.t ? this.t[k] : { items: [], zeny: 0, ok: false, name: '' }; }

  async sendOffer() {
    if (this.busy) return;
    this.busy = true; this.render();
    try {
      const err = await ready(this.g);
      if (err) return this.log(err);
      const r = await this.g.online.tradeRPC('trade_offer', { p_id: this.t.id, p_items: this.draft, p_zeny: this.zeny });
      if (r.error) { this.msg = tradeNote(r.error); return this.log(this.msg); }
      this.msg = '';
      this.t = r.data; this.ping();
    } finally { this.busy = false; this.render(); }
  }

  async confirm() {
    if (this.busy) return;
    this.busy = true; this.render();
    try {
      const r = await this.g.online.tradeRPC('trade_confirm', { p_id: this.t.id, p_ver: this.t.ver });
      if (r.error) { this.msg = tradeNote(r.error); this.log(this.msg); return this.poll(true); }
      const was = this.t.status; this.t = r.data; this.ping();
      if (this.t.status === 'done' && was !== 'done') await this.finish('done');
      else if (this.t.status === 'cancel') await this.finish('cancel', this.t.note);
      else this.noteCheck();
    } finally { this.busy = false; this.render(); }
  }

  render() {
    if (!this.open || !this.t) return;
    const t = this.t, me = this.side(t.me), you = this.side(t.me === 'a' ? 'b' : 'a'), pl = this.g.player;
    const st = t.status === 'invite' ? 'รอ ' + esc(this.peerName) + ' ตอบรับ…' : t.status === 'done' ? '✔ แลกสำเร็จ' : t.status === 'cancel' ? 'ยกเลิกแล้ว' : me.ok && you.ok ? 'กำลังย้ายของ…' : me.ok ? 'ยืนยันแล้ว รออีกฝ่าย' : you.ok ? 'อีกฝ่ายยืนยันแล้ว' : 'วางของแล้วกดยืนยัน (ให้ฝ่ายเดียวได้ อีกฝ่ายไม่ต้องวางของ แค่กดยืนยัน)';
    const changed = JSON.stringify(this.draft) !== JSON.stringify(me.items || []) || this.zeny !== (+me.zeny || 0);
    this.body.innerHTML = `
      <p class="tm-status">${st}</p>${this.msg && t.status === 'open' ? `<p class="tm-msg tm-warn">${esc(this.msg)}</p>` : ''}
      <div class="tm-sides">
        <div class="tm-side"><h3>คุณ <small>${me.ok ? '✔ ยืนยัน' : ''}</small></h3><div class="tm-offer" data-k="me"></div><p class="tm-z">Zeny <b>${fmt(me.zeny)}</b></p></div>
        <div class="tm-side"><h3>${esc(you.name || this.peerName)} <small>${you.ok ? '✔ ยืนยัน' : ''}</small></h3><div class="tm-offer" data-k="you"></div><p class="tm-z">Zeny <b>${fmt(you.zeny)}</b></p></div>
      </div>
      <div class="tm-draft">
        <h3>ของที่จะวาง <small>${this.draft.length}/${MAX_KINDS} ชนิด · แตะของในกระเป๋าด้านล่าง · แก้จำนวนได้ · ไม่วางก็ได้</small></h3>
        <div class="tm-offer tm-mine"></div>
        <label class="tm-zin">Zeny ที่จะให้ <input id="tmZeny" type="number" min="0" max="${pl.zeny}" step="1" value="${this.zeny}" inputmode="numeric"></label>
        <div class="inv-grid tm-bag"></div>
      </div>
      <footer class="tm-foot">
        <button type="button" class="ghost" data-a="cancel">ยกเลิก</button>
        <button type="button" data-a="offer" ${t.status !== 'open' || this.busy || !changed ? 'disabled' : ''}>วางของ</button>
        <button type="button" class="primary" data-a="ok" ${t.status !== 'open' || this.busy || changed || me.ok ? 'disabled' : ''}>ยืนยันแลก</button>
      </footer>`;
    const fill = (el, items) => { el.innerHTML = ''; for (const [id, q] of items || []) el.append(slotBtn(id, q)); if (!(items || []).length) el.innerHTML = '<span class="tm-empty">—</span>'; };
    fill(this.body.querySelector('[data-k="me"]'), me.items);
    fill(this.body.querySelector('[data-k="you"]'), you.items);
    // ของที่เลือกไว้ (แตะเพื่อเอาออก)
    const mine = this.body.querySelector('.tm-mine'); mine.innerHTML = '';
    for (const d of this.draft) {
      const [id, q] = d, have = pl.inventory.count(id);
      const w = document.createElement('div'); w.className = 'tm-dq';
      const b = slotBtn(id, q, { title: `${itemName(id)} ×${q} · แตะเพื่อเอาออก` }); b.addEventListener('click', () => { this.draft = this.draft.filter((x) => x[0] !== id); this.render(); });
      w.append(b);
      if (have > 1) {   // v0.44.5 เลือกจำนวนที่จะให้
        const inp = document.createElement('input'); inp.type = 'number'; inp.min = '1'; inp.max = String(have); inp.step = '1'; inp.value = String(q); inp.inputMode = 'numeric';
        inp.setAttribute('aria-label', `จำนวน ${itemName(id)}`);
        inp.addEventListener('change', () => { d[1] = Math.max(1, Math.min(have, Math.floor(+inp.value) || 1)); this.render(); });
        w.append(inp);
      }
      mine.append(w);
    }
    if (!this.draft.length) mine.innerHTML = '<span class="tm-empty">ยังไม่ได้เลือก</span>';
    // กระเป๋า (ไม่รวมของที่สวมใส่)
    const bag = this.body.querySelector('.tm-bag');
    for (const s of pl.inventory.stacks) {
      const inDraft = this.draft.find((x) => x[0] === s.id);
      const b = slotBtn(s.id, s.qty, { sel: !!inDraft, title: `${itemName(s.id)} ×${s.qty} · แตะเพื่อวางทั้งกอง` });
      b.addEventListener('click', () => {
        if (inDraft) this.draft = this.draft.filter((x) => x[0] !== s.id);
        else if (this.draft.length < MAX_KINDS) this.draft.push([s.id, s.qty]);
        this.render();
      });
      bag.append(b);
    }
    const z = this.body.querySelector('#tmZeny');
    z.addEventListener('change', () => { this.zeny = Math.max(0, Math.min(pl.zeny, Math.floor(+z.value) || 0)); this.render(); });
    this.body.querySelector('[data-a="cancel"]').addEventListener('click', () => this.cancel());
    this.body.querySelector('[data-a="offer"]').addEventListener('click', () => this.sendOffer());
    this.body.querySelector('[data-a="ok"]').addEventListener('click', () => this.confirm());
  }
}

/* =====================================================================
   ตลาดฝากขาย
   ===================================================================== */
export class MarketWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'buy'; this.rows = []; this.mine = []; this.q = ''; this.sel = null; this.price = 0; this.qty = 1; this.busy = false; this.msg = '';
    this.el = panel(root, 'tm-market', 'ตลาดนักผจญภัย', 'ฝากขายได้แม้ออฟไลน์ · ขายได้เงินเข้ากระเป๋าทันที (หักค่าธรรมเนียม 3%)');
    this.el.querySelector('.st-close').addEventListener('click', () => this.close());
    this.body = this.el.querySelector('.tm-body');
  }

  get open() { return !this.el.hidden; }
  close() { this.el.hidden = true; if (this.onClose) this.onClose(); }
  // v0.45 เงื่อนไขตลาดของฉัน: ทั่วไป 2 รายการ 7% · VIP 5 รายการ 3% (ค่าจริงมาจากเซิร์ฟเวอร์)
  terms() { const m = this.g.vip && this.g.vip.market, v = this.g.vipActive; return { max: (m && +m.max) || (v ? 5 : 2), tax: (m && +m.tax) || (v ? 3 : 7), vip: v }; }
  syncTerms() { const T = this.terms(); this.el.querySelector('.st-head p').textContent = `ฝากขายได้แม้ออฟไลน์ · ขายได้เงินเข้ากระเป๋าทันที (หักค่าธรรมเนียม ${T.tax}%${T.vip ? ' · 👑 VIP' : ' · VIP เหลือ 3%'})`; }
  log(m) { this.msg = m; this.render(); }

  async show() {
    this.el.hidden = false; this.msg = '';
    this.syncTerms();
    if (!this.g.cloud) { this.msg = 'ตลาดใช้ได้เมื่อเล่นออนไลน์และเซฟบนคลาวด์'; return this.render(); }
    this.render();
    try { await this.g.online.syncLedger(); } catch (e) { /* ยังไม่ติดตั้งก็ไม่เป็นไร */ }
    this.load();
  }

  // ชื่อที่พิมพ์ → รายการรหัสไอเทม
  idsFor(q) {
    q = q.trim().toLowerCase();
    if (!q) return null;
    const out = [];
    for (const [id, it] of Object.entries(ITEMS)) if (it && (String(it.name).toLowerCase().includes(q) || String(it.en || '').toLowerCase().includes(q) || id.includes(q))) out.push(id);
    return out.slice(0, 200);
  }

  async load() {
    if (!this.open || !this.g.cloud) return;
    this.busy = true; this.render();
    if (this.tab === 'buy') {
      const ids = this.idsFor(this.q);
      if (ids && !ids.length) { this.rows = []; this.busy = false; return this.render(); }
      const r = await this.g.online.tradeRPC('market_search', { p_ids: ids, p_limit: 60, p_offset: 0 });
      this.rows = r.error ? [] : r.data || []; if (r.error) this.msg = r.error;
    } else if (this.tab === 'mine') {
      const r = await this.g.online.tradeRPC('market_mine', {});
      this.mine = r.error ? [] : r.data || []; if (r.error) this.msg = r.error;
    }
    this.busy = false; this.render();
  }

  async act(fn) {
    if (this.busy) return;
    this.busy = true; this.msg = ''; this.render();
    try { await fn(); } finally { this.busy = false; this.render(); }
  }

  buy(row, qty) {
    return this.act(async () => {
      if (row.price * qty > this.g.player.zeny) { this.msg = 'Zeny ไม่พอ'; return; }
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('market_buy', { p_id: row.id, p_qty: qty });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.g.sfx('coin');
      this.msg = `ซื้อ ${itemName(row.item)} ×${qty} แล้ว (${fmt(r.data.cost)} z)`;
      this.busy = false; await this.load();
    });
  }

  list() {
    return this.act(async () => {
      const { id } = this.sel || {};
      if (!id) return;
      const have = this.g.player.inventory.count(id), qty = Math.max(1, Math.min(have, this.qty)), price = Math.floor(this.price);
      if (!(price >= 1)) { this.msg = 'ใส่ราคาต่อชิ้นก่อน'; return; }
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('market_list', { p_item: id, p_qty: qty, p_price: price });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.msg = `ลงขาย ${itemName(id)} ×${qty} ราคาชิ้นละ ${fmt(price)} z แล้ว`;
      this.sel = null;
    });
  }

  cancelListing(row) {
    return this.act(async () => {
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('market_cancel', { p_id: row.id });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.msg = `ปิดรายการ ${itemName(row.item)} · ของที่เหลือกลับเข้ากระเป๋าแล้ว`;
      this.busy = false; await this.load();
    });
  }

  setTab(t) { this.tab = t; this.msg = ''; this.sel = null; this.render(); this.load(); }

  render() {
    if (!this.open) return;
    const pl = this.g.player;
    const tabs = [['buy', 'ซื้อ'], ['sell', 'ลงขาย'], ['mine', 'รายการของฉัน']];
    this.body.innerHTML = `
      <div class="inv-tabs tm-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.tab === k}">${n}</button>`).join('')}</div>
      <p class="tm-msg" ${this.msg ? '' : 'hidden'}></p>
      <div class="tm-pane"></div>
      <p class="tm-z tm-wallet">Zeny ของคุณ <b>${fmt(pl.zeny)}</b></p>`;
    if (this.msg) this.body.querySelector('.tm-msg').textContent = this.msg;
    for (const b of this.body.querySelectorAll('[data-t]')) b.addEventListener('click', () => this.setTab(b.dataset.t));
    const pane = this.body.querySelector('.tm-pane');
    if (this.tab === 'buy') this.renderBuy(pane);
    else if (this.tab === 'sell') this.renderSell(pane);
    else this.renderMine(pane);
  }

  row(id, right, sub) {
    const it = ITEMS[id] || {}, rar = RARITY[rarityOf(id)] || RARITY.common;
    const r = document.createElement('div'); r.className = 'tm-row';
    r.innerHTML = `<span class="slot r-${rarityOf(id)}"><img alt="" src="${iconURL(id)}"></span><div class="tm-info"><b></b><small></small></div><div class="tm-right"></div>`;
    r.querySelector('b').textContent = itemName(id); r.querySelector('b').style.color = rar.color;
    r.querySelector('small').textContent = sub || (it.bonus ? (it.rolled && it.rolled.length ? `ค่าสุ่ม${rollGrade(rollScore(it, it.rolled))[0]} · ` : '') + describeBonus(it.bonus) : it.desc || '');
    r.querySelector('.tm-right').append(...right);
    return r;
  }

  renderBuy(pane) {
    pane.innerHTML = `<form class="tm-search"><input id="tmQ" type="search" placeholder="ค้นหาชื่อไอเทม เช่น ยาขาว, การ์ด, ดาบ" aria-label="ค้นหาไอเทม"><button type="submit">ค้นหา</button></form><div class="tm-list"></div>`;
    const q = pane.querySelector('#tmQ'); q.value = this.q;
    pane.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); this.q = q.value; this.load(); });
    const list = pane.querySelector('.tm-list');
    if (this.busy && !this.rows.length) { list.innerHTML = '<p class="tm-empty">กำลังโหลด…</p>'; return; }
    if (!this.rows.length) { list.innerHTML = `<p class="tm-empty">${this.q ? 'ไม่มีของที่ตรงกับคำค้น' : 'ยังไม่มีใครลงขาย'}</p>`; return; }
    for (const row of this.rows) {
      const qty = document.createElement('input'); qty.type = 'number'; qty.min = 1; qty.max = row.qty; qty.value = 1; qty.className = 'tm-qty'; qty.setAttribute('aria-label', 'จำนวน');
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = row.mine ? 'ของคุณ' : 'ซื้อ'; btn.disabled = row.mine || this.busy;
      btn.addEventListener('click', () => this.buy(row, Math.max(1, Math.min(row.qty, Math.floor(+qty.value) || 1))));
      const price = document.createElement('span'); price.className = 'tm-price'; price.innerHTML = `${fmt(row.price)} z<small>/ชิ้น</small>`;
      list.append(this.row(row.item, [price, ...(row.qty > 1 && !row.mine ? [qty] : []), btn], `เหลือ ${fmt(row.qty)} ชิ้น · ผู้ขาย ${row.seller}`));
    }
  }

  renderSell(pane) {
    const pl = this.g.player;
    pane.innerHTML = `<p class="tm-hint">เลือกของในกระเป๋า แล้วตั้งราคาต่อชิ้น · ของจะออกจากกระเป๋าทันที ปิดรายการเมื่อไหร่ได้ของคืน · ลงขายได้ ${this.terms().max} รายการ${this.terms().vip ? ' (VIP)' : ' (VIP ได้ 5)'} · ค่าธรรมเนียม ${this.terms().tax}% · อยู่ในตลาด 7 วัน</p><div class="inv-grid tm-bag"></div><div class="tm-sell"></div>`;
    const bag = pane.querySelector('.tm-bag');
    for (const s of pl.inventory.stacks) {
      const b = slotBtn(s.id, s.qty, { sel: this.sel && this.sel.id === s.id });
      b.addEventListener('click', () => { this.sel = { id: s.id }; this.qty = s.qty; this.price = Math.max(1, buyPrice(s.id)); this.render(); });
      bag.append(b);
    }
    const box = pane.querySelector('.tm-sell');
    if (!this.sel || pl.inventory.count(this.sel.id) <= 0) { box.innerHTML = ''; this.sel = null; return; }
    const id = this.sel.id, have = pl.inventory.count(id);
    const fee = Math.floor(this.price * this.qty * 0.03);
    box.innerHTML = `<label>จำนวน <input id="tmSQ" type="number" min="1" max="${have}" value="${Math.min(have, this.qty)}"></label>
      <label>ราคาต่อชิ้น <input id="tmSP" type="number" min="1" max="999999999" value="${this.price}"></label>
      <p class="tm-hint">ร้าน NPC: ซื้อ ${fmt(buyPrice(id))} z · รับซื้อ ${fmt(sellPrice(id))} z · ขายหมดได้รับ ${fmt(this.price * this.qty - fee)} z (ค่าธรรมเนียม ${fmt(fee)} z)</p>
      <button type="button" class="primary" ${this.busy ? 'disabled' : ''}>ลงขาย</button>`;
    box.prepend(this.row(id, [], `มีในกระเป๋า ${fmt(have)} ชิ้น`));
    const sq = box.querySelector('#tmSQ'), sp = box.querySelector('#tmSP');
    sq.addEventListener('change', () => { this.qty = Math.max(1, Math.min(have, Math.floor(+sq.value) || 1)); this.render(); });
    sp.addEventListener('change', () => { this.price = Math.max(1, Math.min(999999999, Math.floor(+sp.value) || 1)); this.render(); });
    box.querySelector('.primary').addEventListener('click', () => this.list());
  }

  renderMine(pane) {
    pane.innerHTML = '<div class="tm-list"></div>';
    const list = pane.querySelector('.tm-list');
    if (!this.mine.length) { list.innerHTML = `<p class="tm-empty">${this.busy ? 'กำลังโหลด…' : 'ยังไม่มีของที่ลงขาย'}</p>`; return; }
    for (const row of this.mine) {
      const btn = document.createElement('button'); btn.type = 'button'; btn.disabled = this.busy;
      btn.textContent = row.qty > 0 ? (row.expired ? 'รับของคืน' : 'ปิดรายการ') : 'ปิด';
      btn.addEventListener('click', () => this.cancelListing(row));
      const days = Math.max(0, Math.ceil(row.left / 86400));
      list.append(this.row(row.item, [btn], `${fmt(row.price)} z/ชิ้น · เหลือ ${fmt(row.qty)} · ขายแล้ว ${fmt(row.sold)} · ${row.expired ? 'หมดเวลาแล้ว' : `อีก ${days} วัน`}`));
    }
  }
}
