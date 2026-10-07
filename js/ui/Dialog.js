// กล่องสนทนา NPC แบบมีตัวเลือก (ร้านค้า คลัง วาร์ป)
export class NpcDialog {
  constructor(root, { onClose } = {}) {
    this.el = root.querySelector('#dlg');
    this.nameEl = root.querySelector('#dlgName');
    this.titleEl = root.querySelector('#dlgTitle');
    this.textEl = root.querySelector('#dlgText');
    this.optsEl = root.querySelector('#dlgOpts');
    this.onClose = onClose;
    this.npc = null;
    root.querySelector('#dlgClose').addEventListener('click', () => this.close());
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  get open() { return !this.el.hidden; }

  // options: [{ label, sub, cls, disabled, keepOpen, onSelect }]
  show(npc, text, options) {
    this.npc = npc;
    this.nameEl.textContent = npc.name;
    this.titleEl.textContent = npc.title || '';
    this.textEl.textContent = text;
    this.optsEl.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dlg-opt' + (o.cls ? ' ' + o.cls : '');
      b.innerHTML = `<span class="n">${i + 1}</span><span class="l">${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}</span>${o.right ? `<span class="r">${o.right}</span>` : ''}`;
      b.disabled = !!o.disabled;
      b.addEventListener('click', () => {
        if (!o.keepOpen) this.hide();
        if (o.onSelect) o.onSelect();
      });
      this.optsEl.append(b);
    });
    this.el.hidden = false;
    const first = this.optsEl.querySelector('button:not(:disabled)');
    if (first && !document.body.classList.contains('touch')) first.focus({ preventScroll: true });
  }

  // เลือกตัวเลือกด้วยปุ่มตัวเลข (คืน true ถ้าใช้ปุ่มนั้นไปแล้ว)
  pick(n) {
    if (!this.open) return false;
    const b = this.optsEl.querySelectorAll('button')[n];
    if (b && !b.disabled) { b.click(); return true; }
    return false;
  }

  hide() { this.el.hidden = true; }

  close() {
    if (!this.open) return;
    this.hide();
    if (this.onClose) this.onClose();
  }
}
