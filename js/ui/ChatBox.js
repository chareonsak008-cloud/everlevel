// ช่องพิมพ์แชต (v0.11): พิมพ์คุยกับผู้เล่นในแผนที่เดียวกัน · Enter เพื่อเริ่มพิมพ์ · มือถือย่อ/ขยายกล่องแชตได้
const CHANNELS = [['s', 'ทั่วไป'], ['w', 'โลก'], ['p', 'ปาร์ตี้'], ['g', 'กิลด์'], ['t', 'กระซิบ']];
const HINT = { s: 'คุยกับคนในแผนที่นี้… (Enter)', w: 'แชตโลก — ทุกแผนที่เห็น…', p: 'คุยในปาร์ตี้…', g: 'คุยในกิลด์…', t: 'ข้อความกระซิบ…' };

const SIZES = [['s', 'เล็ก'], ['m', 'กลาง'], ['l', 'ใหญ่']];   // v0.86 ขนาดกล่องแชต

export class ChatBox {
  constructor(root, { onSend, onOpen, onChannel, settings, onSettings }) {
    this.root = root;
    this.settings = settings || {}; this.onSettings = onSettings || (() => {});
    this.onSend = onSend; this.onOpen = onOpen || (() => {}); this.onChannel = onChannel || (() => {});
    // v0.38: แถบเลือกช่องแชต — กดเลือกแล้วพิมพ์ได้เลย (หรือพิมพ์ /p /g /o /w ชื่อ นำหน้า)
    this.tabs = root.querySelector('#chatTabs');
    this.toInput = root.querySelector('#chatTo');
    this.ch = 's';
    if (this.tabs) {
      for (const [c, label] of CHANNELS) {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.ch = c; b.textContent = label; b.setAttribute('role', 'tab');
        b.addEventListener('pointerdown', (e) => e.preventDefault());   // ไม่ให้ช่องพิมพ์หลุดโฟกัส
        b.addEventListener('click', () => { this.setChannel(c); if (c === 't' && !this.toInput.value) this.toInput.focus(); else this.focus(); });
        this.tabs.append(b);
      }
      // v0.86 ปุ่มซ่อน/แสดงข้อความระบบ + ปุ่มขยาย/ย่อกล่องแชต
      const tools = document.createElement('span'); tools.className = 'chat-tools';
      tools.innerHTML = '<button type="button" class="ct-sys" title="ซ่อน/แสดงข้อความระบบ (เก็บของ ใช้สกิล ฯลฯ)"></button><button type="button" class="ct-size" title="ขยาย/ย่อกล่องแชต"></button>';
      for (const b of tools.children) b.addEventListener('pointerdown', (e) => e.preventDefault());
      tools.querySelector('.ct-sys').addEventListener('click', () => this.setSys(!this.showSys));
      tools.querySelector('.ct-size').addEventListener('click', () => { const i = SIZES.findIndex(([k]) => k === this.size); this.setSize(SIZES[(i + 1) % SIZES.length][0]); });
      this.tabs.append(tools); this.tools = tools;
      for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) this.tabs.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    }
    if (this.toInput) {
      this.toInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); this.input.focus(); } if (e.key === 'Escape') this.toInput.blur(); });
      this.toInput.addEventListener('focus', () => this.wrap.classList.add('typing'));
      this.toInput.addEventListener('blur', () => setTimeout(() => { if (!this.typing) this.wrap.classList.remove('typing'); }, 0));
    }
    this.box = root.querySelector('#chat');
    this.wrap = root.querySelector('#chatWrap');
    this.form = root.querySelector('#chatForm');
    this.input = root.querySelector('#chatInput');
    this.toggleBtn = root.querySelector('#chatToggle');
    this.expanded = false;
    this.lastSend = 0;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) this.wrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) { this.input.blur(); return; }
      const now = performance.now();
      if (now - this.lastSend < 900) return;   // กันส่งรัว
      this.lastSend = now;
      this.input.value = '';
      this.onSend(text);
      if (document.body.classList.contains('touch')) this.input.blur();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.input.value = ''; this.input.blur(); }
      e.stopPropagation();   // ไม่ให้ตัวอักษรที่พิมพ์ไปสั่งเกม (เช่น I เปิดกระเป๋า)
    });
    this.input.addEventListener('focus', () => { this.wrap.classList.add('typing'); this.onOpen(); });
    this.input.addEventListener('blur', () => this.wrap.classList.remove('typing'));
    this.toggleBtn.addEventListener('click', () => this.toggle());
    // แตะกล่องแชตบนมือถือ = ขยาย
    this.box.addEventListener('click', () => { if (document.body.classList.contains('touch') && !this.expanded) this.toggle(true); });
    // v0.13: มือถือ — ข้อความใหม่แสดงชัด แล้วจางลงหลัง 6 วินาที (ไม่บังจอ)
    this.fadeTimer = 0;
    new MutationObserver(() => {
      // v0.17.1: กล่องที่ขยายอยู่ + อ่านอยู่ล่างสุด → เลื่อนตามข้อความใหม่ (ถ้าเลื่อนขึ้นไปอ่านย้อนหลังอยู่จะไม่กระโดด)
      if (this.expanded && this.box.scrollHeight - this.box.scrollTop - this.box.clientHeight < 60) this.box.scrollTop = this.box.scrollHeight;
      this.wrap.classList.add('fresh');
      clearTimeout(this.fadeTimer);
      this.fadeTimer = setTimeout(() => this.wrap.classList.remove('fresh'), 6000);
    }).observe(this.box, { childList: true });
    this.setChannel('s');
    this.setSys(this.settings.chatSys !== false, false);
    this.setSize(['s', 'm', 'l'].includes(this.settings.chatSize) ? this.settings.chatSize : 'm', false);
  }

  // v0.86 แสดง/ซ่อนข้อความระบบในกล่องแชต (แชตผู้เล่นแสดงเสมอ)
  setSys(on, save = true) {
    this.showSys = on;
    this.wrap.classList.toggle('hide-sys', !on);
    const b = this.tools && this.tools.querySelector('.ct-sys');
    if (b) { b.textContent = on ? '🔔 ระบบ' : '🔕 ระบบ'; b.setAttribute('aria-pressed', String(!on)); }
    this.box.scrollTop = this.box.scrollHeight;
    if (save) { this.settings.chatSys = on; this.onSettings(); }
  }
  // v0.86 ขนาดกล่องแชต เล็ก/กลาง/ใหญ่ (ใหญ่ = เลื่อนอ่านย้อนหลังได้ยาว)
  setSize(k, save = true) {
    this.size = k;
    this.wrap.dataset.size = k;
    const b = this.tools && this.tools.querySelector('.ct-size');
    if (b) b.textContent = k === 'l' ? '⤡ ย่อ' : '⤢ ' + (k === 's' ? 'กลาง' : 'ใหญ่');
    this.box.scrollTop = this.box.scrollHeight;
    if (save) { this.settings.chatSize = k; this.onSettings(); }
  }

  // มือถือ: กล่องแชตที่ขยายแล้วไปอยู่ใต้แถบสถานะตัวละคร/แผนที่ย่อ ไม่บังตัวละครกลางจอ และคีย์บอร์ดไม่บังช่องพิมพ์
  placeOpen() {
    if (!document.body.classList.contains('touch')) return;
    let top = 0;
    for (const sel of ['.panel.char', '.panel.mini']) { const el = this.root.querySelector(sel); if (el && el.offsetParent) top = Math.max(top, el.getBoundingClientRect().bottom); }
    const host = this.root.getBoundingClientRect();
    if (top) this.wrap.style.setProperty('--chatTop', `${Math.round(top - host.top + 6)}px`);
  }

  toggle(force) {
    this.expanded = typeof force === 'boolean' ? force : !this.expanded;
    if (this.expanded) this.placeOpen();
    this.wrap.classList.toggle('open', this.expanded);
    this.toggleBtn.setAttribute('aria-expanded', String(this.expanded));
    if (this.expanded) this.box.scrollTop = this.box.scrollHeight;
  }

  setChannel(c) {
    this.ch = c;
    if (this.tabs) for (const b of this.tabs.children) b.setAttribute('aria-selected', String(b.dataset.ch === c));
    if (this.toInput) this.toInput.hidden = c !== 't';
    this.wrap.dataset.ch = c;
    this.input.placeholder = HINT[c] || HINT.s;
    this.onChannel(c);
  }
  // ชื่อผู้รับกระซิบ (เติมให้อัตโนมัติจากคนล่าสุดที่กระซิบมา)
  setWhisperTo(name, force = false) { if (this.toInput && name && (force || !this.toInput.value)) this.toInput.value = name; }
  get whisperTo() { return this.toInput ? this.toInput.value.trim() : ''; }

  focus() {
    if (!this.expanded) this.toggle(true);
    this.input.focus();
  }

  get typing() { return document.activeElement === this.input || document.activeElement === this.toInput; }
}
