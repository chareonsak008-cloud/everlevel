// หน้าต่างเปิดกล่องแฟชั่น (v0.9): กล่องสั่น → แสงเปลี่ยนสีไล่ระดับ → ระเบิดแสง → เผยชิ้นแฟชั่น
// ผลสุ่มถูกบันทึกให้ผู้เล่นก่อนเล่นแอนิเมชัน (ปิดหน้าต่างกลางคันก็ไม่เสียของ)
import { iconURL } from '../render/ItemIcons.js';
import { thumbNow, requestThumb } from '../render/CostumeThumbs.js';
import { SLOT_INFO } from '../render/Costumes.js';
import { FASHION_RARITY, FASHION_TIERS, TIER_RANK } from '../data/fashionBoxes.js';
import { ITEMS } from '../data/items.js';
import { fmtZ } from '../data/shops.js';

// เวลาลุ้น (วินาที) ตามระดับที่ดีที่สุดในรอบนั้น — ยิ่งหายากยิ่งลุ้นนาน
const SUSPENSE = { common: 1.0, rare: 1.2, epic: 1.45, legend: 1.9, mythic: 2.6, celestial: 3.2 };
const WTYPE = { sword: 'ดาบ/มีด', dual: 'มีด/ดาบ', staff: 'ไม้เท้า', mace: 'คทา/กระบอง', bow: 'ธนู' };

export class BoxOpenWindow {
  constructor(root, actions) {
    this.act = actions;   // { wear(id), again(boxId, n), wardrobe(id), closed(results), sound(name, opts) }
    this.open = false;
    this.phase = 'idle';
    const el = this.el = document.createElement('div');
    el.className = 'gacha'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'เปิดกล่องแฟชั่น');
    el.innerHTML = `
      <div class="g-rays" aria-hidden="true"></div>
      <div class="g-stage"><img class="g-box" alt=""><div class="g-ring" aria-hidden="true"></div></div>
      <div class="g-flash" aria-hidden="true"></div>
      <div class="g-sparks" aria-hidden="true"></div>
      <div class="g-result" aria-live="polite"></div>
      <div class="g-actions"></div>
      <p class="g-hint">แตะเพื่อข้าม</p>`;
    root.append(el);
    this.$ = (s) => el.querySelector(s);
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.addEventListener('click', (e) => { if (this.phase === 'suspense' && !e.target.closest('button')) this.reveal(); });
    window.addEventListener('keydown', (e) => {
      if (!this.open) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (this.phase === 'suspense') this.reveal(); else this.close(); }
      else if ((e.code === 'Space' || e.code === 'Enter') && this.phase === 'suspense') { e.preventDefault(); e.stopImmediatePropagation(); this.reveal(); }
    });
  }

  // results: [{ item, tier, isNew, zeny }] · left = จำนวนกล่องชนิดนี้ที่เหลือ
  show(boxId, results, left, { weaponFits } = {}) {
    clearTimeout(this.timer); for (const t of this.timers || []) clearTimeout(t);
    this.timers = [];
    this.boxId = boxId; this.results = results; this.left = left; this.weaponFits = weaponFits || (() => true);
    this.best = results.reduce((b, r) => (TIER_RANK[r.tier] > TIER_RANK[b] ? r.tier : b), 'common');
    this.open = true; this.phase = 'suspense';
    const el = this.el;
    el.hidden = false;
    el.className = 'gacha suspense'; delete el.dataset.lvl;
    el.style.setProperty('--gc', '#ffffff');
    this.$('.g-box').src = iconURL(boxId, 256);
    this.$('.g-box').alt = ITEMS[boxId].name;
    this.$('.g-result').innerHTML = '';
    this.$('.g-actions').innerHTML = '';
    this.$('.g-sparks').innerHTML = '';
    this.$('.g-hint').hidden = false;
    // เตรียมภาพชิ้นแฟชั่นก่อนเริ่มนับเวลาลุ้น (เรนเดอร์ครั้งแรกอาจใช้เวลา ไม่ให้กินช่วงลุ้น)
    this.bigThumb = null;
    this.timers.push(setTimeout(() => {
      if (!this.open || this.phase !== 'suspense') return;
      if (results.length === 1) this.bigThumb = thumbNow(results[0].item, 256);
      this.runSuspense();
    }, 40));
  }

  // ไล่สีแสงทีละขั้นจนถึงระดับที่ได้ (ขาว → ฟ้า → ม่วง → ทอง → แดง → รุ้ง)
  runSuspense() {
    const el = this.el;
    const steps = FASHION_TIERS.slice(0, TIER_RANK[this.best]);
    const dur = SUSPENSE[this.best] * 1000;
    el.style.setProperty('--shake', `${Math.max(0.12, 0.34 - steps.length * 0.035)}s`);
    steps.forEach((t, i) => {
      this.timers.push(setTimeout(() => {
        el.style.setProperty('--gc', FASHION_RARITY[t].color);
        el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
        el.dataset.lvl = String(i + 1);
        if (this.act.sound) this.act.sound('boxShake');
        if (t === 'mythic' || t === 'celestial') el.classList.add('t-' + t);
      }, (i / steps.length) * dur * 0.85));
    });
    this.timer = setTimeout(() => this.reveal(), dur);
  }

  reveal() {
    if (this.phase !== 'suspense') return;
    clearTimeout(this.timer); for (const t of this.timers) clearTimeout(t);
    this.phase = 'reveal';
    const el = this.el, best = this.best;
    el.style.setProperty('--gc', FASHION_RARITY[best].color);
    el.className = `gacha reveal r-${best}` + (TIER_RANK[best] >= 5 ? ' t-' + best : '');
    this.$('.g-hint').hidden = true;
    this.sparks(best);
    if (this.act.sound) this.act.sound('boxReveal', { tier: TIER_RANK[best], gap: 0 });
    const box = this.$('.g-result');
    if (this.results.length === 1) box.append(this.bigCard(this.results[0]));
    else {
      const grid = document.createElement('div'); grid.className = 'g-grid';
      this.results.forEach((r, i) => grid.append(this.smallCard(r, i)));
      box.append(grid);
      const sum = this.results.reduce((a, r) => a + r.zeny, 0), fresh = this.results.filter((r) => r.isNew).length;
      const p = document.createElement('p'); p.className = 'g-sum';
      p.textContent = `ได้ชิ้นใหม่ ${fresh} ชิ้น` + (sum ? ` · ชิ้นซ้ำแปลงเป็น ${fmtZ(sum)}` : '');
      box.append(p);
    }
    this.renderActions();
  }

  bigCard(r) {
    const it = r.item, R = FASHION_RARITY[r.tier];
    const c = document.createElement('div');
    c.className = 'g-card big'; c.dataset.rarity = r.tier; c.style.setProperty('--rc', R.color);
    const fit = it.slot !== 'weapon' || this.weaponFits(it);
    c.innerHTML = `
      ${r.isNew ? '<span class="g-new">NEW!</span>' : ''}
      <img alt="" class="g-thumb">
      <span class="g-rar" data-rarity="${r.tier}">${R.name}</span>
      <b class="g-name"></b><small class="g-en"></small>
      <span class="g-slot">${SLOT_INFO[it.slot].name}${it.wtype ? ' · ' + WTYPE[it.wtype] : ''}</span>
      <p class="g-dup">${r.isNew ? 'เพิ่มเข้าตู้แฟชั่นแล้ว' : `มีอยู่แล้ว → แปลงเป็น <b>+${fmtZ(r.zeny)}</b>`}</p>
      ${!fit ? `<p class="g-note">ถืออาวุธประเภท${WTYPE[it.wtype]}เพื่อให้แฟชั่นนี้แสดงบนตัว</p>` : ''}`;
    c.querySelector('.g-name').textContent = it.name;
    c.querySelector('.g-en').textContent = it.en;
    const img = c.querySelector('.g-thumb');
    const url = this.bigThumb || thumbNow(it, 256);
    this.bigThumb = null;
    if (url) img.src = url;
    return c;
  }

  smallCard(r, i) {
    const it = r.item, R = FASHION_RARITY[r.tier];
    const c = document.createElement('div');
    c.className = 'g-card'; c.dataset.rarity = r.tier; c.style.setProperty('--rc', R.color);
    c.style.animationDelay = `${0.06 + i * 0.07}s`;
    c.innerHTML = `${r.isNew ? '<span class="g-new">NEW</span>' : ''}<img alt=""><small>${R.name}</small><b></b><em>${r.isNew ? 'ใหม่!' : '+' + fmtZ(r.zeny)}</em>`;
    c.querySelector('b').textContent = it.name;
    c.title = `${it.name} · ${R.name}`;
    setTimeout(() => requestThumb(it, c.querySelector('img')), 0);
    return c;
  }

  renderActions() {
    const a = this.$('.g-actions'); a.innerHTML = '';
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label; b.addEventListener('click', fn); a.append(b); return b; };
    if (this.results.length === 1) {
      const r = this.results[0];
      btn('สวมใส่ทันที', () => { this.act.wear(r.item.id); this.close(); }, 'primary');
      btn('ดูในตู้แฟชั่น', () => { const id = r.item.id; this.close(); this.act.wardrobe(id); });
    } else btn('เปิดตู้แฟชั่น', () => { this.close(); this.act.wardrobe(null); });
    if (this.left > 0) {
      btn(`เปิดอีก 1 กล่อง (เหลือ ${this.left})`, () => this.act.again(this.boxId, 1), 'again');
      if (this.left > 1) btn(`เปิด ${Math.min(10, this.left)} กล่อง`, () => this.act.again(this.boxId, Math.min(10, this.left)), 'again');
    }
    btn('ปิด', () => this.close(), 'ghost');
    const first = a.querySelector('.again') || a.querySelector('.primary');
    if (first && !document.body.classList.contains('touch')) first.focus({ preventScroll: true });
  }

  // ประกายระเบิดรอบกล่อง (DOM ล้วน ไม่กินเฟรม 3 มิติ)
  sparks(tier) {
    const box = this.$('.g-sparks'); box.innerHTML = '';
    const n = 18 + TIER_RANK[tier] * 8;
    const cols = tier === 'celestial' ? ['#8af0ff', '#fff2b0', '#ff9ad8', '#b48cff', '#ffffff'] : tier === 'mythic' ? ['#ff4a6a', '#ffb347', '#ffffff', '#ff8a5a'] : [FASHION_RARITY[tier].color, '#ffffff'];
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * (180 + TIER_RANK[tier] * 40);
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      s.style.setProperty('--s', `${4 + Math.random() * 8}px`);
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = `${Math.random() * 0.12}s`;
      s.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
      box.append(s);
    }
  }

  close() {
    if (!this.open) return;
    clearTimeout(this.timer); for (const t of this.timers || []) clearTimeout(t);
    const res = this.results;
    this.open = false; this.phase = 'idle';
    this.el.hidden = true; this.el.className = 'gacha';
    this.$('.g-result').innerHTML = ''; this.$('.g-sparks').innerHTML = '';
    if (this.act.closed) this.act.closed(res);
  }
}
