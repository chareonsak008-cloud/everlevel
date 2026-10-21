// v0.50 ตลาดแลกเพชร — ผู้เล่นซื้อขายเพชรกันด้วย Zeny (ต้องรัน supabase/gem_exchange.sql)
// ราคาเฉลี่ย + กราฟ 24 ชม./7 วัน/4 สัปดาห์ · ความลึกตลาด · ซื้อ/ขายทันที หรือตั้งคำสั่งรอ · คำสั่งของฉัน (ยกเลิกได้)
import { ready } from './TradeMarket.js?v=0.84.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const feeOf = (z, pct) => Math.ceil((z * pct) / 100);
const RANGES = [['24h', '24 ชม.'], ['7d', '7 วัน'], ['4w', '4 สัปดาห์']];

export class GemExchange {
  constructor(root, game) {
    this.g = game; this.st = null; this.range = '24h'; this.busy = false; this.msg = '';
    this.mode = { buy: 'now', sell: 'now' };
    const el = this.el = document.createElement('section');
    el.className = 'panel tm gxw'; el.hidden = true;
    el.innerHTML = `<header class="st-head"><div><h2>💱 ตลาดแลกเพชร</h2><p>ซื้อขายเพชรกับผู้เล่นคนอื่นด้วย Zeny ได้จากทุกที่</p></div><div class="gx-bal"><span>💎 <b class="gx-gems">0</b></span><span>🪙 <b class="gx-zeny">0</b></span></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body gx-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart', 'keydown']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'keydown' });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    this.body = el.querySelector('.gx-body');
    this.tick = 0;
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) { this.msg = ''; this.render(); this.load(); } }
  update(dt) { if (!this.open) return; this.tick -= dt; if (this.tick <= 0) { this.tick = 15; if (!this.busy) this.load(true); } }

  get fee() { return (this.st && +this.st.fee) || (this.g.vipActive ? 3 : 7); }

  async load(quiet = false) {
    const g = this.g;
    if (!g.cloud || !g.online || !g.online.tradeRPC) { this.st = null; this.msg = 'ต้องเล่นออนไลน์และเซฟบนคลาวด์จึงจะใช้ตลาดแลกเพชรได้'; return this.render(); }
    const r = await g.online.tradeRPC('gx_state', { p_range: this.range });
    if (r.error) { if (!quiet) { this.msg = r.error; this.render(); } return; }
    this.st = r.data;
    if (g.cash && g.cash.st) g.cash.st.gems = r.data.gems;
    this.render(true);
  }

  // keep = รักษาค่าที่พิมพ์ในช่องจำนวน/ราคาไว้ (รีเฟรชอัตโนมัติ)
  render(keep = false) {
    const st = this.st || {}, fee = this.fee;
    this.el.querySelector('.gx-gems').textContent = fmt(st.gems || 0);
    this.el.querySelector('.gx-zeny').textContent = fmt(this.g.player.zeny);
    const saved = keep ? Object.fromEntries([...this.body.querySelectorAll('input[data-k]')].map((i) => [i.dataset.k, i.value])) : {};
    const pts = st.points || [], prices = pts.map((p) => +p[1]);
    const hi = prices.length ? Math.max(...prices) : 0, lo = prices.length ? Math.min(...prices) : 0;
    const dep = st.depth || { bid: [], ask: [] };
    const depRow = (side, arr, best) => [5, 10, 15].map((p, i) => {
      const n = +((arr[i] || [])[1] || 0), max = Math.max(1, ...arr.map((x) => +x[1] || 0));
      const lim = best ? (side === 'bid' ? Math.floor(best * (100 - p) / 100) : Math.ceil(best * (100 + p) / 100)) : 0;
      return `<div class="gx-dr ${side}" style="--w:${Math.round((n / max) * 100)}%"><small>${p}%</small><span>${best ? (side === 'bid' ? '≥ ' : '≤ ') + fmt(lim) : '-'}</span><b>${fmt(n)}</b></div>`;
    }).join('');
    this.body.innerHTML = `
      <p class="tm-msg" ${this.msg ? '' : 'hidden'}></p>
      <section class="gx-card"><div class="gx-ch"><b>💎 ราคาเฉลี่ย</b><span>${st.avg ? `${fmt(st.avg)} Zeny / เพชร · ซื้อขาย 24 ชม. ${fmt(st.vol)} เพชร` : 'ยังไม่มีการซื้อขาย'}</span></div>
        <div class="gx-chart"><div class="gx-plot">${this.chart(pts)}${prices.length ? `<i class="gx-hi">${fmt(hi)}</i><i class="gx-lo">${fmt(lo)}</i>` : '<p class="tm-empty">ยังไม่มีข้อมูลในช่วงนี้</p>'}</div>
          <div class="gx-rng">${RANGES.map(([k, n]) => `<button type="button" data-r="${k}" class="${this.range === k ? 'primary' : ''}">${n}</button>`).join('')}</div></div></section>
      <section class="gx-card"><div class="gx-ch"><b>📊 ความลึกตลาด</b><span>จำนวนเพชรที่รออยู่ในช่วงราคาจากราคาดีที่สุด</span></div>
        <div class="gx-depth"><div><p class="gx-dh"><span>ราคาซื้อสูงสุด</span><b class="gx-g">${st.bid ? fmt(st.bid) : '-'}</b></p>${depRow('bid', dep.bid || [], st.bid)}</div>
          <div><p class="gx-dh"><span>ราคาขายต่ำสุด</span><b class="gx-r">${st.ask ? fmt(st.ask) : '-'}</b></p>${depRow('ask', dep.ask || [], st.ask)}</div></div></section>
      <div class="gx-trade">${this.panel('buy', st)}${this.panel('sell', st)}</div>
      <section class="gx-card"><div class="gx-ch"><b>📋 คำสั่งของฉัน</b><span>ผู้ซื้อและผู้ขายจ่ายค่าธรรมเนียมฝั่งละ ${st.fees ? st.fees.fee_pct : 7}% ของ Zeny ที่ซื้อขาย · 👑 VIP ${st.fees ? st.fees.vip_fee_pct : 3}% · คุณจ่าย ${fee}%</span></div><div class="gx-mine"></div></section>`;
    if (this.msg) this.body.querySelector('.tm-msg').textContent = this.msg;
    for (const b of this.body.querySelectorAll('[data-r]')) b.addEventListener('click', () => { this.range = b.dataset.r; this.load(); });
    for (const [k, v] of Object.entries(saved)) { const i = this.body.querySelector(`input[data-k="${k}"]`); if (i) i.value = v; }
    for (const side of ['buy', 'sell']) this.bindPanel(side);
    const mine = this.body.querySelector('.gx-mine');
    const list = st.mine || [];
    if (!list.length) mine.innerHTML = '<p class="tm-empty">ยังไม่มีคำสั่งที่ค้างอยู่</p>';
    for (const o of list) {
      const r = document.createElement('div'); r.className = 'gx-o';
      r.innerHTML = `<span class="gx-tag ${o.side}">${o.side === 'buy' ? 'ซื้อ' : 'ขาย'}</span><span><b>${fmt(o.qty - o.filled)} / ${fmt(o.qty)} เพชร</b><small>ราคา ${fmt(o.price)} Zeny · ค่าธรรมเนียม ${o.fee}%</small></span><button type="button">ยกเลิก</button>`;
      r.querySelector('button').addEventListener('click', () => this.cancel(o));
      mine.append(r);
    }
  }

  chart(pts) {
    if (!pts.length) return '';
    const W = 560, H = 150, pad = 12, ps = pts.map((p) => +p[1]);
    const lo = Math.min(...ps), hi = Math.max(...ps), span = Math.max(1, hi - lo);
    const x = (i) => pad + (pts.length === 1 ? (W - pad * 2) / 2 : (i * (W - pad * 2)) / (pts.length - 1));
    const y = (v) => H - pad - ((v - lo) / span) * (H - pad * 2.6);
    const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(+p[1]).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" class="gx-ax"/><polyline points="${line}" class="gx-ln"/>${pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(+p[1]).toFixed(1)}" r="4.5" class="gx-pt"><title>${new Date(+p[0]).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${fmt(p[1])} Zeny · ${fmt(p[2])} เพชร</title></circle>`).join('')}</svg>`;
  }

  panel(side, st) {
    const buy = side === 'buy', m = this.mode[side];
    const best = buy ? st.ask : st.bid;
    return `<section class="gx-card gx-side ${side}"><div class="gx-ch"><b>${buy ? '🛒 ซื้อเพชรด้วย Zeny' : '💰 ขายเพชรรับ Zeny'}</b></div>
      <p class="gx-best">${buy ? 'ราคาขายต่ำสุด' : 'ราคาซื้อสูงสุด'} <b>${best ? fmt(best) + ' Zeny' : 'ยังไม่มี'}</b></p>
      <div class="inv-tabs tm-tabs gx-mode"><button type="button" role="tab" data-m="now" aria-selected="${m === 'now'}">${buy ? 'ซื้อทันที' : 'ขายทันที'}</button><button type="button" role="tab" data-m="order" aria-selected="${m === 'order'}">${buy ? 'ตั้งซื้อ' : 'ตั้งขาย'}</button></div>
      <label class="gx-in">จำนวนเพชร <input type="number" min="1" max="100000" step="1" inputmode="numeric" data-k="${side}q" placeholder="0"></label>
      ${m === 'order' ? `<label class="gx-in">ราคาต่อเพชร (Zeny) <input type="number" min="1" max="99999999" step="1" inputmode="numeric" data-k="${side}p" placeholder="${best || ''}"></label>` : ''}
      <p class="gx-sum"></p>
      <button type="button" class="primary gx-go">${m === 'now' ? (buy ? 'ซื้อทันที' : 'ขายทันที') : (buy ? 'ตั้งคำสั่งซื้อ' : 'ตั้งคำสั่งขาย')}</button></section>`;
  }

  bindPanel(side) {
    const box = this.body.querySelector(`.gx-side.${side}`), st = this.st || {}, buy = side === 'buy';
    for (const b of box.querySelectorAll('[data-m]')) b.addEventListener('click', () => { this.mode[side] = b.dataset.m; this.render(true); });
    const qi = box.querySelector(`[data-k="${side}q"]`), pi = box.querySelector(`[data-k="${side}p"]`), sum = box.querySelector('.gx-sum'), go = box.querySelector('.gx-go');
    const calc = () => {
      const q = Math.floor(+qi.value || 0), now = this.mode[side] === 'now';
      const price = now ? +(buy ? st.ask : st.bid) || 0 : Math.floor(+(pi && pi.value) || 0);
      if (q < 1 || price < 1) { sum.textContent = now && !price ? 'ยังไม่มีคำสั่งฝั่งตรงข้าม — ลองตั้งคำสั่งรอแทน' : ''; go.disabled = this.busy || q < 1 || price < 1; return; }
      const z = price * q, f = feeOf(z, this.fee);
      sum.textContent = buy ? `${now ? 'ประมาณ ' : ''}จ่าย ${fmt(z + f)} Zeny (รวมค่าธรรมเนียม ${fmt(f)})` : `${now ? 'ประมาณ ' : ''}ได้รับ ${fmt(z - Math.floor((z * this.fee) / 100))} Zeny (หักค่าธรรมเนียม ${fmt(Math.floor((z * this.fee) / 100))})`;
      go.disabled = this.busy;
    };
    qi.addEventListener('input', calc); if (pi) pi.addEventListener('input', calc); calc();
    go.addEventListener('click', () => this.place(side, Math.floor(+qi.value || 0), pi ? Math.floor(+pi.value || 0) : null));
  }

  async place(side, qty, price) {
    if (this.busy || qty < 1) return;
    const mode = this.mode[side];
    if (mode === 'order' && !(price >= 1)) { this.msg = 'ใส่ราคาต่อเพชรก่อน'; return this.render(true); }
    if (side === 'sell' && qty > ((this.st && this.st.gems) || 0)) { this.msg = 'เพชรไม่พอ'; return this.render(true); }
    this.busy = true; this.msg = 'กำลังส่งคำสั่ง…'; this.render(true);
    try {
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('gx_place', { p_side: side, p_qty: qty, p_price: mode === 'order' ? price : null, p_mode: mode });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      const d = r.data;
      this.g.sfx('coin');
      this.msg = side === 'buy'
        ? `✔ ${d.filled ? `ได้เพชร ${fmt(d.filled)} เม็ด` : ''}${d.rest ? `${d.filled ? ' · ' : ''}ตั้งซื้อรออีก ${fmt(d.rest)} เม็ด` : ''} · ใช้ Zeny ${fmt(d.spent)}`
        : `✔ ${d.filled ? `ขายได้ ${fmt(d.filled)} เม็ด รับ ${fmt(d.earned)} Zeny` : ''}${d.rest ? `${d.filled ? ' · ' : ''}ตั้งขายรออีก ${fmt(d.rest)} เม็ด` : ''}${mode === 'now' && d.filled < qty ? ` · คืนเพชรที่ขายไม่หมด ${fmt(qty - d.filled)} เม็ด` : ''}`;
      for (const i of this.body.querySelectorAll(`input[data-k^="${side}"]`)) i.value = '';
      this.g.hud.log(`💱 ตลาดแลกเพชร: ${this.msg.replace('✔ ', '')}`, 'zeny');
    } finally { this.busy = false; await this.load(true); this.render(true); }
  }

  async cancel(o) {
    if (this.busy) return;
    this.busy = true;
    try {
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('gx_cancel', { p_id: o.id });
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.msg = o.side === 'buy' ? '✔ ยกเลิกคำสั่งซื้อแล้ว คืน Zeny ที่กันไว้' : `✔ ยกเลิกคำสั่งขายแล้ว คืนเพชร ${fmt(o.qty - o.filled)} เม็ด`;
    } finally { this.busy = false; await this.load(true); }
  }
}
