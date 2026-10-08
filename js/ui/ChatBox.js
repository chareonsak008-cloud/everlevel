// ช่องพิมพ์แชต (v0.11): พิมพ์คุยกับผู้เล่นในแผนที่เดียวกัน · Enter เพื่อเริ่มพิมพ์ · มือถือย่อ/ขยายกล่องแชตได้
export class ChatBox {
  constructor(root, { onSend, onOpen }) {
    this.root = root;
    this.onSend = onSend; this.onOpen = onOpen || (() => {});
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
      this.wrap.classList.add('fresh');
      clearTimeout(this.fadeTimer);
      this.fadeTimer = setTimeout(() => this.wrap.classList.remove('fresh'), 6000);
    }).observe(this.box, { childList: true });
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

  focus() {
    if (!this.expanded) this.toggle(true);
    this.input.focus();
  }

  get typing() { return document.activeElement === this.input; }
}
