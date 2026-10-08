// หน้าต่างจดหมาย (v0.15 · ปุ่ม M / 📬) — อ่านจดหมาย · รับของ · เลือกชุดแฟชั่น/สัตว์เลี้ยง
// แอดมิน: แท็บ "ส่งจดหมาย (GM)" ส่งไอเทม/Zeny/ตัวเลือกถึงทุกคนหรือระบุชื่อตัวละคร
import { ITEMS } from '../data/items.js';
import { SETS } from '../data/costumes.js';
import { PETS, PET_ORDER, PET_RARITY } from '../data/pets.js';
import { FASHION_RARITY } from '../data/fashionBoxes.js';
import { PICK_LABEL, MAIL_MAX_ITEMS, MAIL_MAX_ZENY, setById, setTier, hasGift } from '../data/mail.js';
import { iconURL } from '../render/ItemIcons.js';
import { petThumb } from '../render/PetThumbs.js';
import { requestThumb } from '../render/CostumeThumbs.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
function leftText(t) {
  if (!t) return '';
  const d = t - Date.now();
  if (d <= 0) return 'หมดอายุแล้ว';
  const h = Math.floor(d / 3600000);
  return h >= 48 ? `เหลือ ${Math.floor(h / 24)} วัน` : h >= 1 ? `เหลือ ${h} ชม.` : `เหลือ ${Math.max(1, Math.round(d / 60000))} นาที`;
}

export class MailWindow {
  constructor(root, game) {
    this.g = game;
    this.open = false;
    this.sel = null;          // id จดหมายที่เปิดอยู่
    this.choice = {};         // { [mailId]: { set, pet } }
    this.view = 'mail';       // mail | gm
    this.gmItems = [];
    const anchor = root.querySelector('#petw');
    const host = (anchor && anchor.parentElement) || root;
    const el = this.el = document.createElement('section');
    el.className = 'panel mailw'; el.id = 'mailw'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'mlTitle');
    el.innerHTML = `
      <header class="st-head"><div><h2 id="mlTitle">จดหมาย</h2><p class="ml-sub"></p></div>
        <div class="ml-hbtns"><button type="button" class="ml-gm" hidden>✉ ส่งจดหมาย (GM)</button>
        <button type="button" class="st-close ml-close" aria-label="ปิดหน้าต่างจดหมาย">✕</button></div></header>
      <div class="ml-body"><div class="ml-list" role="list"></div><div class="ml-detail"></div></div>
      <div class="ml-gmpane" hidden></div>`;
    host.append(el);
    this.$ = (s) => el.querySelector(s);
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.$('.ml-close').addEventListener('click', () => this.toggle(false));
    this.$('.ml-gm').addEventListener('click', () => { this.view = this.view === 'gm' ? 'mail' : 'gm'; this.render(); });
  }

  get box() { return this.g.mailbox; }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) {
      this.view = 'mail';
      const list = this.box.list();
      if (!this.sel || !list.some((m) => String(m.id) === String(this.sel))) {
        const first = list.find((m) => !this.box.isClaimed(m)) || list[0];
        this.sel = first ? first.id : null;
        this.showDetail = !!(first && !this.box.isClaimed(first));
      }
      this.render();
      this.box.refresh();
    }
  }

  openMail(id) { this.sel = id; this.showDetail = true; if (!this.open) this.toggle(true); else this.render(); }

  render() {
    if (!this.open) return;
    const box = this.box, list = box.list(), n = box.unread();
    this.$('.ml-sub').textContent = n ? `ยังไม่ได้เปิดรับ ${n} ฉบับ` : list.length ? 'อ่านครบทุกฉบับแล้ว' : 'ยังไม่มีจดหมาย';
    const gmBtn = this.$('.ml-gm');
    gmBtn.hidden = !box.admin;
    gmBtn.textContent = this.view === 'gm' ? '← กล่องจดหมาย' : '✉ ส่งจดหมาย (GM)';
    this.$('.ml-body').hidden = this.view === 'gm';
    this.$('.ml-gmpane').hidden = this.view !== 'gm';
    if (this.view === 'gm') return this.renderGM();
    this.el.classList.toggle('detail', !!this.showDetail);

    const ul = this.$('.ml-list');
    ul.innerHTML = '';
    if (!list.length) ul.innerHTML = '<p class="ml-empty">ยังไม่มีจดหมาย — ของรางวัลจากแอดมินจะส่งมาที่นี่</p>';
    for (const m of list) {
      const got = box.isClaimed(m);
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'listitem');
      b.className = 'ml-item' + (got ? ' got' : ' new') + (String(m.id) === String(this.sel) ? ' sel' : '');
      b.innerHTML = `<span class="ml-ico" aria-hidden="true">${hasGift(m) ? '🎁' : '✉️'}</span><span class="ml-txt"><b></b><small></small></span>${got ? '<i class="ml-tag">รับแล้ว</i>' : '<i class="ml-tag on">ใหม่</i>'}`;
      b.querySelector('b').textContent = m.title;
      b.querySelector('small').textContent = [m.sender, m.local ? 'ของขวัญต้อนรับ' : fmtDate(m.at), m.expires && !got ? leftText(m.expires) : ''].filter(Boolean).join(' · ');
      b.addEventListener('click', () => { this.sel = m.id; this.showDetail = true; this.render(); if (!hasGift(m)) box.markRead(m.id); });
      ul.append(b);
    }
    this.renderDetail();
  }

  renderDetail() {
    const box = this.box, d = this.$('.ml-detail'), m = this.sel != null ? box.find(this.sel) : null;
    if (!m) { d.innerHTML = '<p class="ml-empty">เลือกจดหมายทางซ้ายเพื่ออ่าน</p>'; return; }
    const got = box.isClaimed(m), ch = this.choice[m.id] || (this.choice[m.id] = {});
    d.innerHTML = `
      <button type="button" class="ml-back">← จดหมายทั้งหมด</button>
      <h3 class="ml-title"></h3>
      <p class="ml-meta"></p>
      <p class="ml-text"></p>
      <div class="ml-att"></div>
      <div class="ml-picks"></div>
      <div class="ml-foot"><p class="ml-msg" aria-live="polite"></p><div class="ml-acts"></div></div>`;
    d.querySelector('.ml-back').addEventListener('click', () => { this.showDetail = false; this.render(); });
    d.querySelector('.ml-title').textContent = m.title;
    d.querySelector('.ml-meta').textContent = [`จาก ${m.sender}`, m.local ? '' : fmtDate(m.at), m.expires ? leftText(m.expires) : '', m.local || !hasGift(m) ? '' : m.per === 'char' ? 'รับได้ตัวละครละครั้ง' : 'รับได้บัญชีละครั้ง'].filter(Boolean).join(' · ');
    d.querySelector('.ml-text').textContent = m.body;

    // ของแนบ
    const att = d.querySelector('.ml-att');
    if (m.items.length || m.zeny) {
      att.innerHTML = '<h4>ของแนบ</h4><div class="ml-chips"></div>';
      const chips = att.querySelector('.ml-chips');
      for (const [id, q] of m.items) {
        const it = ITEMS[id], c = document.createElement('span');
        c.className = 'ml-chip r-' + (it.rarity || 'common'); c.title = it.desc || it.name;
        c.innerHTML = `<img alt="" src="${iconURL(id)}"><span></span><b>x${q}</b>`;
        c.querySelector('span').textContent = it.name;
        chips.append(c);
      }
      if (m.zeny) { const c = document.createElement('span'); c.className = 'ml-chip zeny'; c.innerHTML = `<i aria-hidden="true">💰</i><span>${m.zeny.toLocaleString('en-US')} Zeny</span>`; chips.append(c); }
    }

    // ตัวเลือก (ชุดแฟชั่น / สัตว์เลี้ยง)
    const pk = d.querySelector('.ml-picks');
    for (const p of m.picks) {
      const sec = document.createElement('section');
      sec.className = 'ml-pick';
      sec.innerHTML = `<h4>${PICK_LABEL[p.kind]}${got ? '' : ' <small>แตะเพื่อเลือก</small>'}</h4><div class="ml-opts ${p.kind}" role="radiogroup"></div>`;
      const grid = sec.querySelector('.ml-opts');
      for (const id of p.options) {
        const b = document.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'radio');
        const on = ch[p.kind] === id;
        b.setAttribute('aria-checked', String(on));
        b.className = 'ml-opt' + (on ? ' on' : '');
        b.disabled = got;
        if (p.kind === 'set') {
          const s = setById(id), tier = setTier(s), R = FASHION_RARITY[tier];
          b.style.setProperty('--rc', R.color);
          b.innerHTML = `<span class="ml-pic"><img alt=""></span><b></b><small>${R.name} · ${s.items.length} ชิ้น</small>`;
          b.querySelector('b').textContent = s.name;
          b.title = s.desc;
          const img = b.querySelector('img');
          setTimeout(() => requestThumb({ ...s, rarity: tier }, img), 0);
        } else {
          const P = PETS[id], R = PET_RARITY[P.tier], own = this.g.player.pets.owned[id] != null;
          b.style.setProperty('--rc', R.color);
          b.innerHTML = `<span class="ml-pic"><img alt=""></span><b></b><small>${R.name}${own ? ' · มีแล้ว (ดาว +1)' : ''}</small><em></em>`;
          b.querySelector('b').textContent = P.name;
          b.querySelector('em').textContent = P.skill.name;
          b.title = `${P.skill.name}: ${P.skill.desc}`;
          const img = b.querySelector('img');
          setTimeout(() => { const u = petThumb(id, 128); if (u) img.src = u; }, 0);
        }
        b.addEventListener('click', () => { if (got) return; ch[p.kind] = id; this.renderDetail(); });
        grid.append(b);
      }
      pk.append(sec);
    }

    // ปุ่มรับของ
    const acts = d.querySelector('.ml-acts'), msg = d.querySelector('.ml-msg');
    if (got) {
      msg.textContent = hasGift(m) ? '✔ รับของในจดหมายนี้แล้ว' : '✔ อ่านแล้ว';
      if (m.picks.some((p) => p.kind === 'set')) this.btn(acts, 'เปิดตู้แฟชั่น', () => { this.toggle(false); this.g.toggleWardrobe(true); });
      if (m.picks.some((p) => p.kind === 'pet')) this.btn(acts, 'หน้าต่างสัตว์เลี้ยง', () => { this.toggle(false); this.g.togglePets(true); });
      return;
    }
    if (!hasGift(m)) { msg.textContent = ''; return; }
    const missing = m.picks.filter((p) => !ch[p.kind]);
    msg.textContent = missing.length ? `เลือก${missing.map((p) => ({ set: 'ชุดแฟชั่น', pet: 'สัตว์เลี้ยง' }[p.kind])).join('และ')}ก่อน แล้วกดรับของ` : '';
    const b = this.btn(acts, '🎁 รับของ', async () => {
      b.disabled = true;
      const r = await this.box.claim(m.id, ch);
      if (!r.ok) { msg.textContent = r.msg; b.disabled = false; return; }
      this.render();
      const nm = this.$('.ml-detail .ml-msg'); if (nm) nm.textContent = '✔ ได้รับ: ' + r.msg;
    }, 'primary');
    b.disabled = missing.length > 0;
  }

  btn(parent, label, fn, cls = 'ghost') {
    const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label;
    b.addEventListener('click', fn); parent.append(b); return b;
  }

  /* ---------- แอดมิน: ส่งจดหมาย ---------- */

  renderGM() {
    const pane = this.$('.ml-gmpane');
    if (!pane.dataset.built) this.buildGM(pane);
    this.renderGMItems();
    this.renderSent();
  }

  buildGM(pane) {
    pane.dataset.built = '1';
    const itemOpts = Object.entries(ITEMS).map(([id, it]) => `<option value="${esc(it.name)} [${id}]"></option>`).join('');
    const setOpts = SETS.map((s) => `<label class="gm-ck"><input type="checkbox" name="gmSet" value="${s.id}"><span>${esc(s.name)} <small>${FASHION_RARITY[setTier(s)].name}</small></span></label>`).join('');
    const petOpts = PET_ORDER.map((id) => `<label class="gm-ck"><input type="checkbox" name="gmPet" value="${id}"><span>${esc(PETS[id].name)} <small>${PET_RARITY[PETS[id].tier].name}</small></span></label>`).join('');
    pane.innerHTML = `
      <p class="gm-note">ส่งได้เฉพาะบัญชีแอดมิน (ตรวจสิทธิ์ที่เซิร์ฟเวอร์) · ผู้เล่นจะเห็นจดหมายภายใน 3 นาที หรือทันทีเมื่อเปิดกล่องจดหมาย</p>
      <div class="gm-grid">
        <label>ผู้รับ<select name="to"><option value="">ทุกคน (รวมคนที่สมัครภายหลังจนจดหมายหมดอายุ)</option><option value="name">ระบุชื่อตัวละคร</option></select></label>
        <label class="gm-name" hidden>ชื่อตัวละคร<input name="toName" maxlength="16" placeholder="เช่น อาร์ม"></label>
        <label>รับได้<select name="per"><option value="account">บัญชีละ 1 ครั้ง</option><option value="char">ตัวละครละ 1 ครั้ง</option></select></label>
        <label>อายุจดหมาย<select name="exp"><option value="3">3 วัน</option><option value="7" selected>7 วัน</option><option value="30">30 วัน</option><option value="0">ไม่หมดอายุ</option></select></label>
        <label class="wide">หัวข้อ<input name="title" maxlength="60" placeholder="เช่น ของขวัญฉลองเปิดเซิร์ฟ"></label>
        <label class="wide">ข้อความ<textarea name="body" maxlength="600" rows="3" placeholder="ข้อความถึงผู้เล่น"></textarea></label>
      </div>
      <h4>ไอเทม (สูงสุด ${MAIL_MAX_ITEMS} ชนิด)</h4>
      <div class="gm-add"><input name="itemQ" list="gmItemList" placeholder="พิมพ์ชื่อไอเทม แล้วเลือกจากรายการ" autocomplete="off"><input name="qty" type="number" min="1" max="999" value="1" aria-label="จำนวน"><button type="button" class="ghost gm-additem">เพิ่ม</button></div>
      <datalist id="gmItemList">${itemOpts}</datalist>
      <div class="gm-chips"></div>
      <label class="gm-zeny">Zeny<input name="zeny" type="number" min="0" max="${MAIL_MAX_ZENY}" value="0"></label>
      <details class="gm-det"><summary>ให้ผู้เล่นเลือกชุดแฟชั่น 1 เซ็ต (ติ๊กเซ็ตที่เป็นตัวเลือก)</summary><div class="gm-cks">${setOpts}</div></details>
      <details class="gm-det"><summary>ให้ผู้เล่นเลือกสัตว์เลี้ยง 1 ตัว (ติ๊กตัวที่เป็นตัวเลือก)</summary><div class="gm-cks">${petOpts}</div></details>
      <div class="gm-send"><button type="button" class="primary gm-go">ส่งจดหมาย</button><p class="gm-msg" aria-live="polite"></p></div>
      <h4>จดหมายที่ส่งแล้ว</h4><div class="gm-sent"></div>`;
    const $ = (s) => pane.querySelector(s);
    $('[name=to]').addEventListener('change', (e) => { $('.gm-name').hidden = e.target.value !== 'name'; });
    $('.gm-additem').addEventListener('click', () => this.addGMItem());
    $('[name=itemQ]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addGMItem(); } });
    $('.gm-go').addEventListener('click', () => this.sendGM());
  }

  addGMItem() {
    const pane = this.$('.ml-gmpane'), q = pane.querySelector('[name=itemQ]'), msg = pane.querySelector('.gm-msg');
    const v = q.value.trim();
    let id = (v.match(/\[([a-z0-9_]+)\]$/) || [])[1];
    if (!id || !ITEMS[id]) id = Object.keys(ITEMS).find((k) => ITEMS[k].name === v || k === v);
    if (!id) { msg.textContent = 'ไม่พบไอเทมนี้ — พิมพ์ชื่อแล้วเลือกจากรายการ'; return; }
    const n = Math.max(1, Math.min(999, Math.floor(+pane.querySelector('[name=qty]').value) || 1));
    const ex = this.gmItems.find((e) => e[0] === id);
    if (ex) ex[1] = Math.min(999, ex[1] + n);
    else if (this.gmItems.length >= MAIL_MAX_ITEMS) { msg.textContent = `แนบได้สูงสุด ${MAIL_MAX_ITEMS} ชนิด`; return; }
    else this.gmItems.push([id, n]);
    q.value = ''; msg.textContent = '';
    this.renderGMItems();
  }

  renderGMItems() {
    const box = this.$('.ml-gmpane .gm-chips');
    box.innerHTML = '';
    for (const [id, n] of this.gmItems) {
      const c = document.createElement('span'); c.className = 'ml-chip';
      c.innerHTML = `<img alt="" src="${iconURL(id)}"><span></span><b>x${n}</b><button type="button" aria-label="เอาออก">✕</button>`;
      c.querySelector('span').textContent = ITEMS[id].name;
      c.querySelector('button').addEventListener('click', () => { this.gmItems = this.gmItems.filter((e) => e[0] !== id); this.renderGMItems(); });
      box.append(c);
    }
    if (!this.gmItems.length) box.innerHTML = '<small class="gm-none">ยังไม่ได้แนบไอเทม</small>';
  }

  async sendGM() {
    const pane = this.$('.ml-gmpane'), $ = (s) => pane.querySelector(s), msg = $('.gm-msg'), go = $('.gm-go');
    const toAll = $('[name=to]').value !== 'name';
    const to = toAll ? null : $('[name=toName]').value.trim();
    const title = $('[name=title]').value.trim(), body = $('[name=body]').value.trim();
    const zeny = Math.max(0, Math.min(MAIL_MAX_ZENY, Math.floor(+$('[name=zeny]').value) || 0));
    const sets = [...pane.querySelectorAll('[name=gmSet]:checked')].map((x) => x.value);
    const pets = [...pane.querySelectorAll('[name=gmPet]:checked')].map((x) => x.value);
    const picks = [];
    if (sets.length) picks.push({ kind: 'set', options: sets });
    if (pets.length) picks.push({ kind: 'pet', options: pets });
    if (!title) { msg.textContent = 'ใส่หัวข้อจดหมายก่อน'; return; }
    if (!toAll && (!to || to.length < 2)) { msg.textContent = 'ใส่ชื่อตัวละครผู้รับ'; return; }
    // กดครั้งแรก = ถามยืนยัน (ส่งถึงทุกคนแล้วลบได้ แต่คนที่รับไปแล้วจะไม่ถูกดึงของคืน)
    if (!this.confirmUntil || this.confirmUntil < Date.now()) {
      this.confirmUntil = Date.now() + 5000;
      msg.textContent = `กด "ส่งจดหมาย" อีกครั้งเพื่อยืนยันส่งถึง${toAll ? 'ผู้เล่นทุกคน' : ' ' + to}`;
      return;
    }
    this.confirmUntil = 0;
    const days = +$('[name=exp]').value;
    go.disabled = true; msg.textContent = 'กำลังส่ง…';
    const err = await this.g.online.sendMail({
      to, title, body, items: this.gmItems, zeny, picks, per: $('[name=per]').value,
      sender: 'GM', expires: days ? Date.now() + days * 86400000 : 0,
    });
    go.disabled = false;
    if (err) { msg.textContent = 'ส่งไม่สำเร็จ: ' + err; return; }
    msg.textContent = '✔ ส่งจดหมายแล้ว';
    this.g.hud.log(`✉ ส่งจดหมาย "${title}" ถึง${toAll ? 'ผู้เล่นทุกคน' : ' ' + to}แล้ว`, 'sys');
    this.gmItems = []; $('[name=title]').value = ''; $('[name=body]').value = ''; $('[name=zeny]').value = 0;
    for (const x of pane.querySelectorAll('.gm-cks input')) x.checked = false;
    this.renderGMItems();
    await this.box.refresh();
  }

  renderSent() {
    const box = this.$('.ml-gmpane .gm-sent');
    const list = this.box.server.slice(0, 30);
    box.innerHTML = list.length ? '' : '<small class="gm-none">ยังไม่มี</small>';
    for (const m of list) {
      const row = document.createElement('div'); row.className = 'gm-row';
      const exp = m.expires && m.expires < Date.now();
      row.innerHTML = `<span><b></b><small></small></span><button type="button" class="ghost">ลบ</button>`;
      row.querySelector('b').textContent = m.title;
      row.querySelector('small').textContent = [m.to ? `ถึง ${m.to}` : 'ถึงทุกคน', fmtDate(m.at), exp ? 'หมดอายุแล้ว' : m.expires ? leftText(m.expires) : 'ไม่หมดอายุ', `${m.items.length} ไอเทม${m.zeny ? ` · ${m.zeny} Zeny` : ''}${m.picks.length ? ' · มีตัวเลือก' : ''}`].join(' · ');
      const del = row.querySelector('button');
      del.addEventListener('click', async () => {
        if (del.dataset.ok !== '1') { del.dataset.ok = '1'; del.textContent = 'ยืนยันลบ?'; setTimeout(() => { del.dataset.ok = ''; del.textContent = 'ลบ'; }, 4000); return; }
        del.disabled = true;
        const err = await this.g.online.deleteMail(m.id);
        if (err) { del.disabled = false; del.textContent = 'ลบไม่ได้'; return; }
        await this.box.refresh();
      });
      box.append(row);
    }
  }
}
