// v0.43 ร้านเพชร + เติมเพชร (โอนพร้อมเพย์ → ส่งสลิป → v0.80 ตรวจสลิปอัตโนมัติ / แอดมินอนุมัติเมื่อไม่ชัวร์)
// ราคา/สินค้า/แพ็กมาจากเซิร์ฟเวอร์ (supabase/cashshop.sql) · ซื้อแล้วของเข้าเซฟบนเซิร์ฟเวอร์ → ดึง ledger มาปรับในเครื่อง
import { ITEMS, RARITY } from '../data/items.js?v=0.87.0';
import { COSTUME_BY_ID, RARITY as FASHION_RARITY } from '../data/costumes.js?v=0.87.0';
import { iconURL } from '../render/ItemIcons.js?v=0.87.0';
import { requestThumb } from '../render/CostumeThumbs.js?v=0.87.0';
import { ready } from './TradeMarket.js?v=0.87.0';
import { WARP_ROUTES } from '../data/shops.js?v=0.87.0';
import { PETS, PET_RARITY } from '../data/pets.js?v=0.87.0';
import { petThumb } from '../render/PetThumbs.js?v=0.87.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const QR_SRC = 'assets/ui/topup_qr.png';
// v0.45 สิทธิ์ VIP (ข้อความแสดงในแท็บ VIP)
export const VIP_PERKS = [
  ['🧪', 'ซื้อยาอัตโนมัติระหว่างบอท', 'ยาใกล้หมดกระเป๋า ระบบซื้อเติมให้เองด้วย Zeny (ตั้งค่าที่หน้าต่างออโต้)'],
  ['🏪', 'ตลาด 5 รายการ · ค่าธรรมเนียม 3%', 'คนทั่วไปลงขายได้ 2 รายการ ค่าธรรมเนียม 7%'],
  ['🌀', 'วาร์ป · คลัง · ร้านค้า ได้ทุกที่', 'กดจากแท็บนี้ ไม่ต้องเดินไปหา NPC · วาร์ปฟรี'],
  ['🎁', 'รางวัลรายวัน', 'ขนนกคืนชีพ ×5 ทุกวัน · รางวัลเช็กอินคูณ 2'],
  ['⚡', 'EXP / ดรอป +20%', 'ซ้อนกับใบคูณและอีเวนต์ได้'],
  ['👑', 'ป้าย VIP + ชื่อสีทอง', 'ทั้งบนป้ายชื่อและในแชต'],
];
const dateTH = (ms) => new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
// ปลายทางวาร์ป VIP: รวมทุกเส้นทางของนักเวทย์ (ไม่ซ้ำ)
const VIP_WARPS = (() => { const seen = new Set(), out = []; for (const list of Object.values(WARP_ROUTES)) for (const r of list) { const k = r.map + '|' + r.label; if (!seen.has(k)) { seen.add(k); out.push(r); } } return out; })();   // ภาพ QR พร้อมเพย์ของเจ้าของเกม (ใส่ไฟล์นี้เอง)
const TABS = [['vip', '👑 VIP'], ['fashion', 'แฟชั่น'], ['pet', '🐾 สัตว์เลี้ยง'], ['refine', '🔨 ตีบวก'], ['convenience', 'สะดวกสบาย'], ['boost', 'เร่งเลเวล'], ['topup', '💎 เติมเพชร']];

// ย่อรูปสลิปเป็น JPEG ไม่เกิน 1400px (ไฟล์เล็ก อัปโหลดเร็ว)
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));   // v0.80 คมพอให้อ่าน QR บนสลิปได้
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.92));
}

export class CashShopWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'vip'; this.st = null; this.busy = false; this.msg = ''; this.pack = null; this.file = null; this.adminRows = null; this.slips = {};
    const el = this.el = document.createElement('section');
    el.className = 'panel tm cs'; el.hidden = true;
    el.innerHTML = `<header class="st-head"><div><h2>ร้านเพชร</h2><p>แฟชั่น · สัตว์เลี้ยง · หินตีบวก · ไอเทมสะดวกสบาย · เพชรใช้ร่วมทุกตัวละครในบัญชี</p></div><div class="cs-gems" title="เพชรของคุณ">💎 <b>0</b></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.close());
    this.body = el.querySelector('.tm-body');
    // v0.51 แถบลองใส่แฟชั่น (ซ่อนร้านไว้ให้เห็นตัวละคร)
    const bar = this.tryBar = document.createElement('div');
    bar.className = 'panel cs-try'; bar.hidden = true;
    bar.innerHTML = `<div class="cs-try-info"><b></b><small>กำลังลองใส่ · กด Q / E หมุนกล้องดูรอบตัว · ผู้เล่นอื่นไม่เห็น</small></div><button type="button" class="primary cs-try-buy"></button><button type="button" class="cs-try-back">กลับร้าน</button><button type="button" class="st-close cs-try-x" aria-label="ถอดและปิด">✕</button>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) bar.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(bar);
    bar.querySelector('.cs-try-back').addEventListener('click', () => { this.endTry(); this.el.hidden = false; this.render(); });
    bar.querySelector('.cs-try-x').addEventListener('click', () => this.endTry());
    bar.querySelector('.cs-try-buy').addEventListener('click', () => { const p = this.trying; this.endTry(); this.el.hidden = false; this.tab = 'fashion'; if (p) this.buy(p); });
  }

  tryOn(p) {
    const it = COSTUME_BY_ID[p.ref]; if (!it) return;
    this.trying = p;
    this.g.tryFashion(p.ref);
    this.el.hidden = true;
    const b = this.tryBar; b.hidden = false;
    const nm = b.querySelector('.cs-try-info b'); nm.textContent = it.name; nm.style.color = (FASHION_RARITY[it.rarity] || {}).color || '';
    b.querySelector('.cs-try-buy').textContent = `ซื้อ 💎 ${fmt(p.price)}`;
  }
  endTry() { if (this.trying) this.g.tryFashion(null); this.trying = null; this.tryBar.hidden = true; }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { if (on) this.show(); else this.close(); }
  close() { this.el.hidden = true; this.endTry(); }
  log(m) { this.msg = m; this.render(); }

  async show(tab) {
    if (tab) { this.tab = tab; this.confirmId = null; }
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
    this.g.setVip(this.st);
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
    if (!r.error && r.data) { this.st = r.data; this.g.setVip(r.data); this.news(r.data.requests || []); if (this.g.vipActive && !r.data.vip_claimed) this.g.hud.log('👑 รางวัลรายวัน VIP พร้อมรับแล้ว — เปิดร้านเพชร แท็บ VIP', 'lv'); }
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
      if (p.kind === 'vip') {
        this.st.vip_until = r.data.vip_until; this.st.now = Date.now() + (this.g.vip.skew || 0); this.g.setVip(this.st);
        await this.load();
        this.msg = `👑 เป็น VIP แล้ว ถึง ${dateTH(this.g.vip.until)}`;
        return;
      }
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
      // v0.80 ตรวจสลิปอัตโนมัติ — ผ่าน = เพชรเข้าทันที · ไม่ชัวร์ = ส่งให้แอดมินตรวจเหมือนเดิม
      this.msg = 'กำลังตรวจสลิปกับธนาคาร…'; this.render();
      const v = r.data && r.data.id ? await this.g.online.verifyTopup(r.data.id) : { status: 'pending' };
      if (v.status === 'approved') { this.msg = `✅ ตรวจสลิปผ่าน! ได้รับ ${fmt(this.pack.gems)} เพชรแล้ว`; this.g.sfx('coin'); }
      else if (v.status === 'rejected') this.msg = `❌ สลิปไม่ผ่าน: ${v.reason || 'สลิปไม่ถูกต้อง'} · ถ้าคิดว่าผิดพลาด ติดต่อแอดมิน`;
      else this.msg = `ส่งคำขอเติม ${fmt(this.pack.thb)} บาท (${fmt(this.pack.gems)} เพชร) แล้ว · ${v.reason && v.reason !== 'offline' ? 'ตรวจอัตโนมัติไม่ผ่าน (' + v.reason + ') ' : ''}แอดมินจะตรวจให้ แล้วเพชรเข้าบัญชีอัตโนมัติ`;
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

  // v0.82 รายการกันโกง (supabase/anticheat_v0.82.sql)
  async loadCheat() {
    const r = await this.g.online.tradeRPC('gm_cheat_log', { p_status: this.cheatAll ? 'all' : 'open' });
    this.cheatRows = r.error ? [] : r.data || [];
    if (r.error) this.msg = r.error;
    this.render();
  }

  async cheatAct(row, act) {
    if (this.busy) return;
    if (this.confirmId !== `${act}${row.id}`) { this.confirmId = `${act}${row.id}`; return this.render(); }
    this.confirmId = null; this.busy = true; this.render();
    const r = act === 'rb'
      ? await this.g.online.tradeRPC('gm_cheat_rollback', { p_id: row.id })
      : await this.g.online.tradeRPC('gm_cheat_close', { p_id: row.id, p_clear: true });
    this.busy = false;
    this.msg = r.error || (act === 'rb' ? `ย้อนเซฟของ ${row.name} กลับเป็น Lv.${row.snap_lv} แล้ว (ธงยังอยู่ · กด "ไม่ได้โกง" ถ้าจะปลด)` : `ปลดธง/ปลดล็อก ${row.name} แล้ว`);
    await this.loadCheat();
  }

  renderCheat(pane) {
    pane.innerHTML = `<p class="tm-hint"><b>ปฏิเสธเซฟ</b> = ค่าตัวละครเป็นไปไม่ได้ (ระบบไม่บันทึกให้แล้ว · ติดธง ซ่อนจากอันดับ ห้ามเข้าอารีน่า) · <b>ต้องตรวจ</b> = ได้ของ/เลเวลเร็วผิดปกติ (บันทึกแล้วแต่ล็อกการแลก) · ย้อนเซฟ = คืนตัวละครเป็นเซฟก่อนพบความผิดปกติ</p>
      <label class="cs-cheat-all"><input type="checkbox" ${this.cheatAll ? 'checked' : ''}> แสดงรายการที่จัดการแล้วด้วย</label><div class="tm-list cs-admin"></div>`;
    pane.querySelector('.cs-cheat-all input').addEventListener('change', (e) => { this.cheatAll = e.target.checked; this.cheatRows = null; this.render(); this.loadCheat(); });
    const list = pane.querySelector('.cs-admin');
    if (!this.cheatRows) { list.innerHTML = '<p class="tm-empty">กำลังโหลด…</p>'; return; }
    if (!this.cheatRows.length) { list.innerHTML = '<p class="tm-empty">ไม่มีรายการที่ต้องตรวจ 👍</p>'; return; }
    const ST = { open: 'รอตรวจ', ok: 'ไม่ได้โกง', rollback: 'ย้อนเซฟแล้ว' };
    for (const row of this.cheatRows) {
      const box = document.createElement('div'); box.className = 'cs-adm cs-cheat ' + (row.kind === 'hard' ? 'hard' : 'soft');
      box.innerHTML = `<div class="tm-info"><b></b><small class="cs-reason"></small><small class="cs-meta"></small></div><div class="tm-foot"></div>`;
      box.querySelector('b').textContent = `${row.kind === 'hard' ? '⛔ ปฏิเสธเซฟ' : '⚠ ต้องตรวจ'} · ${row.name || '-'} (ช่อง ${row.slot})`;
      box.querySelector('.cs-reason').textContent = row.reason;
      box.querySelector('.cs-meta').textContent = `${new Date(row.at).toLocaleString('th-TH')} · ตอนนี้ Lv.${row.lv ?? '-'}${row.snap ? ` · มีเซฟสำรอง Lv.${row.snap_lv}` : ''} · ${ST[row.status] || row.status}${row.cheat ? ' · ติดธง' : ''}${row.lock ? ' · ล็อกการแลก' : ''}`;
      const foot = box.querySelector('.tm-foot');
      if (row.status === 'open' && row.snap && row.kind !== 'hard') {   // ปฏิเสธเซฟ = ข้อมูลบนเซิร์ฟเวอร์ยังสะอาดอยู่แล้ว
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.disabled = this.busy;
        b.textContent = this.confirmId === `rb${row.id}` ? `ยืนยันย้อนเป็น Lv.${row.snap_lv}?` : 'ย้อนเซฟ';
        b.addEventListener('click', () => this.cheatAct(row, 'rb')); foot.append(b);
      }
      if (row.cheat || row.lock || row.status === 'open') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'primary'; b.disabled = this.busy;
        b.textContent = this.confirmId === `ok${row.id}` ? 'ยืนยันปลดธง + ปลดล็อก?' : 'ไม่ได้โกง · ปลดล็อก';
        b.addEventListener('click', () => this.cheatAct(row, 'ok')); foot.append(b);
      }
      list.append(box);
    }
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

  async claimDaily() {
    if (this.busy) return;
    this.busy = true; this.msg = ''; this.render();
    try {
      const err = await ready(this.g); if (err) { this.msg = err; return; }
      const r = await this.g.online.tradeRPC('vip_daily', {});
      if (r.error) { this.msg = r.error; return; }
      await this.g.online.syncLedger();
      this.st.gems = r.data.gems; this.st.vip_claimed = true; this.g.vip.claimed = true;
      this.g.sfx('coin');
      this.msg = '🎁 รับรางวัลรายวัน VIP แล้ว: ขนนกคืนชีพ ×5';
    } finally { this.busy = false; this.render(); }
  }

  renderVip(pane) {
    const g = this.g, st = this.st, on = g.vipActive, list = (st.products || []).filter((p) => p.kind === 'vip');
    pane.innerHTML = `<div class="vip-card${on ? ' on' : ''}"><div class="vip-crown" aria-hidden="true">👑</div><div class="vip-st"><b>${on ? 'คุณเป็น VIP' : 'ยังไม่ได้เป็น VIP'}</b><small></small></div></div>
      <div class="vip-buy"></div>
      ${on ? `<div class="vip-acts"><h3>ใช้สิทธิ์ VIP</h3><div class="vip-row"><button type="button" class="primary" data-v="daily"></button><button type="button" data-v="stor">📦 เปิดคลัง</button><button type="button" data-v="shop">🧪 ร้านของใช้</button><button type="button" data-v="sell">💰 ขายของ</button></div>
        <h3>วาร์ปฟรี</h3><div class="vip-warps"></div></div>` : ''}
      <h3>สิทธิ์ VIP</h3><ul class="vip-perks"></ul>`;
    pane.querySelector('.vip-st small').textContent = on ? `หมดอายุ ${dateTH(g.vip.until)} · ซื้อเพิ่มต่ออายุสะสมได้` : 'ซื้อบัตร VIP ด้วยเพชร · ซื้อซ้ำต่ออายุสะสม';
    const buy = pane.querySelector('.vip-buy');
    for (const p of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vip-pass' + (this.confirmId === p.id ? ' sel' : '');
      b.innerHTML = `${p.tag ? '<span class="cs-tag"></span>' : ''}<b>บัตร VIP ${p.qty} วัน</b><span>${this.confirmId === p.id ? 'กดอีกครั้งเพื่อยืนยัน' : on ? 'ต่ออายุ +' + p.qty + ' วัน' : 'เริ่มทันทีหลังซื้อ'}</span><em>💎 ${fmt(p.price)}</em>`;
      if (p.tag) b.querySelector('.cs-tag').textContent = p.tag;
      b.disabled = this.busy;
      b.addEventListener('click', () => this.buy(p));
      buy.append(b);
    }
    if (!list.length) buy.innerHTML = '<p class="tm-empty">ยังไม่เปิดขาย VIP (แอดมินต้องรัน supabase/vip.sql)</p>';
    const ul = pane.querySelector('.vip-perks');
    for (const [ic, t, d] of VIP_PERKS) { const li = document.createElement('li'); li.innerHTML = '<i></i><div><b></b><small></small></div>'; li.querySelector('i').textContent = ic; li.querySelector('b').textContent = t; li.querySelector('small').textContent = d; ul.append(li); }
    if (!on) return;
    const daily = pane.querySelector('[data-v="daily"]');
    daily.textContent = st.vip_claimed ? '✔ รับรางวัลวันนี้แล้ว' : '🎁 รับรางวัลรายวัน';
    daily.disabled = this.busy || !!st.vip_claimed;
    daily.addEventListener('click', () => this.claimDaily());
    pane.querySelector('[data-v="stor"]').addEventListener('click', () => { this.close(); g.vipService('storage'); });
    pane.querySelector('[data-v="shop"]').addEventListener('click', () => { this.close(); g.vipService('shop'); });
    pane.querySelector('[data-v="sell"]').addEventListener('click', () => { this.close(); g.vipService('sell'); });
    const wr = pane.querySelector('.vip-warps');
    for (const r of VIP_WARPS) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vip-warp';
      b.innerHTML = '<b></b><small></small>'; b.querySelector('b').textContent = r.label; b.querySelector('small').textContent = r.hint || '';
      b.addEventListener('click', () => { this.close(); g.vipWarp(r); });
      wr.append(b);
    }
  }

  nameOf(p) {
    if (p.kind === 'vip') return `บัตร VIP ${p.qty} วัน`;
    if (p.kind === 'fashion') return (COSTUME_BY_ID[p.ref] || {}).name || p.ref;
    return (ITEMS[p.ref] || {}).name || p.ref;
  }

  setTab(t) { this.tab = t; this.msg = ''; this.confirmId = null; this.render(); if (t === 'admin') this.loadAdmin(); if (t === 'cheat') this.loadCheat(); }

  render() {
    if (!this.open) return;
    const st = this.st;
    this.el.querySelector('.cs-gems b').textContent = fmt(st ? st.gems : 0);
    const tabs = [...TABS, ...(st && st.admin ? [['admin', 'อนุมัติเติม'], ['cheat', 'กันโกง']] : [])];
    this.body.innerHTML = `<div class="inv-tabs tm-tabs cs-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.tab === k}">${n}</button>`).join('')}</div>
      <p class="tm-msg" ${this.msg ? '' : 'hidden'}></p><div class="tm-pane"></div>`;
    if (this.msg) this.body.querySelector('.tm-msg').textContent = this.msg;
    for (const b of this.body.querySelectorAll('[data-t]')) b.addEventListener('click', () => this.setTab(b.dataset.t));
    const pane = this.body.querySelector('.tm-pane');
    if (!st) { pane.innerHTML = `<p class="tm-empty">${this.busy ? 'กำลังโหลด…' : ''}</p>`; return; }
    if (this.tab === 'vip') return this.renderVip(pane);
    if (this.tab === 'topup') return this.renderTopup(pane);
    if (this.tab === 'admin') return this.renderAdmin(pane);
    if (this.tab === 'cheat') return this.renderCheat(pane);
    this.renderProducts(pane);
  }

  renderProducts(pane) {
    const list = (this.st.products || []).filter((p) => p.cat === this.tab);
    const grid = document.createElement('div'); grid.className = 'cs-grid';
    if (!list.length) grid.innerHTML = '<p class="tm-empty">ยังไม่มีสินค้าในหมวดนี้</p>';
    const owned = this.g.player.fashion.owned;
    for (const p of list) {
      const fashion = p.kind === 'fashion'; let it = fashion ? COSTUME_BY_ID[p.ref] : ITEMS[p.ref];
      if (!it) continue;
      const rar = fashion ? (FASHION_RARITY[it.rarity] || {}) : (RARITY[it.rarity || 'common'] || {});
      const card = document.createElement('div'); card.className = 'cs-card';
      card.innerHTML = `${p.tag ? '<span class="cs-tag"></span>' : ''}<div class="cs-pic"><img alt=""></div><b class="cs-name"></b><small class="cs-desc"></small><button type="button" class="primary"></button>`;
      if (p.tag) card.querySelector('.cs-tag').textContent = p.tag;
      const img = card.querySelector('img');
      const petId = !fashion && it.use && it.use.pet;
      if (fashion) requestThumb(it, img, 96); else img.src = (petId && petThumb(petId)) || iconURL(p.ref);
      const nm = card.querySelector('.cs-name'); nm.textContent = it.name + (p.qty > 1 ? ` ×${p.qty}` : ''); if (rar.color) nm.style.color = rar.color;
      if (petId) { const P = PETS[petId], st = this.g.player.pets.owned[petId]; it = { ...it, name: P.name, effect: `${PET_RARITY[P.tier].name} · ${P.skill.name}: ${P.skill.desc}`, desc: st == null ? '' : `มีแล้ว ★${st} — ซื้อซ้ำได้ดาว +1` }; nm.textContent = P.name; nm.style.color = PET_RARITY[P.tier].color; }
      card.querySelector('.cs-desc').textContent = fashion ? it.desc : (it.effect ? it.effect + (it.desc ? ' · ' : '') : '') + (it.desc || '');
      const btn = card.querySelector('button');
      const have = fashion && owned.has(p.ref);
      btn.textContent = have ? 'มีแล้ว' : this.confirmId === p.id ? `ยืนยัน 💎 ${fmt(p.price)}` : `💎 ${fmt(p.price)}`;
      btn.disabled = have || this.busy;
      btn.addEventListener('click', () => this.buy(p));
      if (fashion) {   // v0.51 ลองใส่ก่อนซื้อ
        const t = document.createElement('button'); t.type = 'button'; t.className = 'cs-tryb'; t.textContent = '👁 ลองใส่';
        t.addEventListener('click', () => this.tryOn(p));
        btn.before(t);
      }
      grid.append(card);
    }
    pane.append(grid);
  }

  renderTopup(pane) {
    const st = this.st;
    if (this.g.online && this.g.online.guest) { pane.innerHTML = '<p class="tm-empty">บัญชีชั่วคราว (เล่นแบบไม่สมัคร) เติมเพชรไม่ได้ เพื่อไม่ให้เพชรหายถ้าล้างข้อมูลเบราว์เซอร์<br>ผูกบัญชีกับ Google หรืออีเมลก่อน: ออกจากเกม → หน้าเลือกตัวละคร → <b>ผูกบัญชี</b> (ตัวละครอยู่ครบ)</p>'; return; }   // v0.81
    pane.innerHTML = `<p class="tm-hint">1 บาท = 1 เพชร · แพ็กใหญ่แถมเพิ่ม · เลือกแพ็ก → สแกน QR พร้อมเพย์โอนตามยอด → แนบสลิป → ระบบตรวจสลิปกับธนาคารอัตโนมัติ ผ่านแล้วเพชรเข้าทันที (โอนให้ตรงยอดแพ็ก · ใช้สลิปที่มี QR ชัด ๆ · ถ้าตรวจไม่ผ่านแอดมินจะตรวจให้)</p>
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
      pay.innerHTML = `<div class="cs-qr"><img alt="QR พร้อมเพย์สำหรับโอนเงิน" src="${QR_SRC}?t=${Math.floor(Date.now() / 60000)}"><p class="tm-empty" hidden>แอดมินยังไม่ได้ใส่ QR (ไฟล์ assets/ui/topup_qr.png)</p></div>
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
      box.querySelector('small').textContent = new Date(row.at).toLocaleString('th-TH') + (row.note ? ' · ' + row.note : '') + (row.auto ? ' · ระบบ: ' + row.auto : '');   // v0.80 เหตุผลที่ตรวจอัตโนมัติไม่ผ่าน
      const slip = box.querySelector('.cs-slip');
      const showSlip = (url) => { slip.innerHTML = url ? `<a href="${url}" target="_blank" rel="noopener"><img alt="สลิปโอนเงิน" src="${url}"></a>` : '<span class="tm-empty">เปิดสลิปไม่ได้</span>'; };
      if (this.slips[row.slip] !== undefined) showSlip(this.slips[row.slip]);
      else box.querySelector('[data-a="slip"]').addEventListener('click', async () => { this.slips[row.slip] = await this.g.online.slipUrl(row.slip); showSlip(this.slips[row.slip]); });
      for (const b of box.querySelectorAll('[data-a="ok"], [data-a="no"]')) { b.disabled = this.busy; b.addEventListener('click', () => this.decide(row, b.dataset.a === 'ok')); }
      list.append(box);
    }
  }
}
