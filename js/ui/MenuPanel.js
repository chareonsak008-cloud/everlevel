// เมนู ☰ (v0.11) — มือถือ: รวมปุ่มหน้าต่างทั้งหมดไว้ที่เดียว ปุ่มใหญ่ กดง่าย
const ITEMS = [
  ['status', '📊', 'สถานะ'], ['inv', '🎒', 'กระเป๋า'], ['skill', '✨', 'สกิล'], ['ward', '👗', 'แฟชั่น'],
  ['quest', '📜', 'เควส'], ['pet', '🐾', 'สัตว์เลี้ยง'], ['auto', '⚔️', 'ตีออโต้'], ['mail', '📬', 'จดหมาย'], ['online', '👥', 'ออนไลน์'], ['settings', '⚙️', 'ตั้งค่า'], ['save', '💾', 'บันทึก'],
];

export class MenuPanel {
  constructor(root, onAction) {
    this.el = root.querySelector('#menuPanel');
    this.btn = root.querySelector('#btnMenu');
    this.onAction = onAction;
    this.open = false;
    const grid = this.el.querySelector('.mp-grid');
    for (const [act, ico, label] of ITEMS) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.act = act;
      b.innerHTML = `<span class="mp-ico" aria-hidden="true">${ico}</span><span>${label}</span><i class="badge" hidden></i>`;
      b.addEventListener('click', () => { this.toggle(false); this.onAction(act); });
      grid.append(b);
    }
    this.btn.addEventListener('click', () => this.toggle());
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) { this.el.addEventListener(ev, (e) => e.stopPropagation()); this.btn.addEventListener(ev, (e) => e.stopPropagation()); }
    this.el.querySelector('.mp-close').addEventListener('click', () => this.toggle(false));
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    this.btn.setAttribute('aria-expanded', String(this.open));
  }

  // ตัวเลขแต้มที่ยังไม่ได้ใช้ (บนปุ่มสถานะ/สกิล และจุดแจ้งเตือนบนปุ่ม ☰)
  badges({ stat = 0, skill = 0, mail = 0 }) {
    const set = (act, n) => { const b = this.el.querySelector(`[data-act="${act}"] .badge`); if (b) { b.hidden = n <= 0; b.textContent = n; } };
    set('status', stat); set('skill', skill); set('mail', mail);
    this.btn.classList.toggle('dot', stat > 0 || skill > 0 || mail > 0);
  }
}
