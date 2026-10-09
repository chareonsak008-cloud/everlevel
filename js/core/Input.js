// รับอินพุต: คีย์บอร์ด, เมาส์/แตะ, จอยสติ๊กเสมือน, ควบคุมกล้อง (หมุน/ซูม)
// v0.11: กำลังพิมพ์ในช่องข้อความ (แชต/ชื่อ) → ไม่นับเป็นปุ่มควบคุมเกม
export const isTyping = (e) => { const t = e && e.target; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); };

const KEYMAP = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};

export class Input {
  constructor(canvas, joyEl) {
    this.canvas = canvas;
    this.keys = new Set();
    this.taps = [];
    this.pointer = { down: false, x: 0, y: 0, id: null, held: 0 };
    this.joy = { x: 0, y: 0, active: false };
    this.rotate = 0;      // เรเดียนที่สะสมไว้ รอให้เกมนำไปใช้
    this.zoom = 1;        // ตัวคูณระยะกล้อง
    this.tilt = 0;        // v0.17.1: ปรับมุมก้มกล้อง (เรเดียน · บวก = ก้มชันขึ้น)
    this.touches = new Map();
    this.gesture = null;
    this.hover = null;        // ตำแหน่งเมาส์ (ไม่กด) สำหรับไฮไลต์มอนสเตอร์
    this.attackKey = false;
    this.presses = [];        // v0.16: จุดที่เริ่มแตะ (นิ้ว) — เกมใช้ตัดสินว่ากดค้างเพื่อเดินหรือแตะมอน

    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) { this.keys.clear(); return; }
      if (KEYMAP[e.code]) { this.keys.add(e.code); e.preventDefault(); }
      if (e.code === 'KeyQ' && !e.repeat) this.rotate -= Math.PI / 4;
      if (e.code === 'KeyE' && !e.repeat) this.rotate += Math.PI / 4;
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoom *= 0.9;
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoom *= 1.1;
      if (e.code === 'PageUp') { this.tilt += 0.09; e.preventDefault(); }
      if (e.code === 'PageDown') { this.tilt -= 0.09; e.preventDefault(); }
      if ((e.code === 'Space' || e.code === 'KeyF') && !e.repeat) { this.attackKey = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    // v0.16: สลับแอป/ล็อกจอ → ล้างสถานะนิ้ว จอย ท่าซูม ทั้งหมด (กันค้างเป็นสองนิ้ว/เดินเอง)
    const clearAll = () => { this.keys.clear(); this.pointer.down = false; this.dragRotate = null; this.touches.clear(); this.gesture = null; this.taps = []; this.presses = []; if (this.joyReset) this.joyReset(); };
    window.addEventListener('blur', clearAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearAll(); });

    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ไม่รองรับก็ไม่เป็นไร */ }
      if (e.pointerType === 'touch') {
        this.touches.set(e.pointerId, p);
        if (this.touches.size === 2) { // นิ้วที่สอง = เริ่มท่าซูม/หมุน ยกเลิกการเดิน
          this.pointer.down = false; this.taps = [];
          this.gesture = this.measure();
          return;
        }
        if (this.touches.size > 2) return;
      }
      if (e.button === 2 || (e.button === 0 && e.altKey)) { this.dragRotate = { x: p.x, y: p.y, id: e.pointerId }; return; }
      if (e.button > 0) return;
      this.pointer = { down: true, x: p.x, y: p.y, sx: p.x, sy: p.y, id: e.pointerId, held: 0, touch: e.pointerType === 'touch', t0: performance.now(), walked: false };
      // เมาส์: เดินทันที | นิ้ว: รอยกนิ้วก่อน (กันชนกับท่าซูม/หมุนสองนิ้ว) แต่แจ้งจุดเริ่มแตะให้เกมรู้ทันที
      if (!this.pointer.touch) this.taps.push(p); else this.presses.push(p);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (e.pointerType === 'mouse') this.hover = p;
      if (this.touches.has(e.pointerId)) {
        this.touches.set(e.pointerId, p);
        if (this.touches.size === 2 && this.gesture) {
          const g = this.measure();
          this.zoom *= this.gesture.dist / Math.max(20, g.dist);
          let da = g.angle - this.gesture.angle;
          if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
          this.rotate -= da;
          this.tilt += (g.my - this.gesture.my) * 0.004;   // v0.17.1: สองนิ้วลากขึ้นลง = ปรับมุมก้ม
          this.gesture = g;
          return;
        }
      }
      if (this.dragRotate && e.pointerId === this.dragRotate.id) {
        this.rotate -= (p.x - this.dragRotate.x) * 0.008; this.dragRotate.x = p.x;
        this.tilt += (p.y - this.dragRotate.y) * 0.005; this.dragRotate.y = p.y; return;   // v0.17.1: ลากขึ้นลง = ปรับมุมก้ม
      }
      if (this.pointer.down && e.pointerId === this.pointer.id) { this.pointer.x = p.x; this.pointer.y = p.y; }
    });
    const up = (e) => {
      const pt = this.pointer;
      // v0.16: ยกนิ้วโดยยังไม่ได้เริ่มเดินแบบกดค้าง = แตะ (แตะค้างนานบนมอนก็เลือกเป้าได้)
      if (e.type === 'pointerup' && pt.touch && pt.down && e.pointerId === pt.id && !this.gesture && !pt.walked
        && Math.hypot(pt.x - pt.sx, pt.y - pt.sy) < 18 && performance.now() - pt.t0 < 1200) this.taps.push({ x: pt.sx, y: pt.sy });
      this.touches.delete(e.pointerId);
      this.gesture = this.touches.size === 2 ? this.measure() : null;   // เหลือสองนิ้ว (จากสามนิ้ว) → วัดใหม่ ไม่กระตุก
      if (this.dragRotate && e.pointerId === this.dragRotate.id) this.dragRotate = null;
      if (e.pointerId === this.pointer.id) this.pointer.down = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerleave', () => { this.hover = null; });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom *= Math.exp(e.deltaY * 0.0012); }, { passive: false });

    if (joyEl) this.setupJoystick(joyEl);
  }

  measure() {
    const [a, b] = [...this.touches.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x), my: (a.y + b.y) / 2 };
  }

  setupJoystick(el) {
    const knob = el.querySelector('.knob');
    const enableTouch = () => { document.body.classList.add('touch'); el.classList.add('show'); };
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) enableTouch();
    window.addEventListener('touchstart', enableTouch, { once: true, passive: true });

    let id = null;
    const update = (e) => {
      const r = el.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.joy.x = dx; this.joy.y = dy;
      const Rl = el.offsetWidth / 2;   // รัศมีในหน่วยของตัวจอย (v0.11: หน้าจอย่อ/ขยายด้วย zoom ได้)
      knob.style.transform = `translate(${dx * Rl * 0.6}px, ${dy * Rl * 0.6}px)`;
    };
    const reset = () => { id = null; this.joy.active = false; this.joy.x = this.joy.y = 0; knob.style.transform = ''; };
    this.joyReset = reset;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      id = e.pointerId; this.joy.active = true;
      try { el.setPointerCapture(id); } catch { /* ไม่เป็นไร */ }
      update(e);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) update(e); });
    el.addEventListener('pointerup', (e) => { if (e.pointerId === id) reset(); });
    el.addEventListener('pointercancel', reset);
  }

  // เวกเตอร์การเดินตามจอ (x ขวา, y ลง) — เกมจะหมุนตามมุมกล้องเอง
  moveVector() {
    let x = 0, y = 0;
    for (const k of this.keys) { const v = KEYMAP[k]; if (v) { x += v[0]; y += v[1]; } }
    if (x || y) return { x: Math.sign(x), y: Math.sign(y) };
    if (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.2) return { x: this.joy.x, y: this.joy.y };
    return { x: 0, y: 0 };
  }

  consumeTaps() { const t = this.taps; this.taps = []; return t; }
  consumePresses() { const t = this.presses; this.presses = []; return t; }
  consumeAttack() { const a = this.attackKey; this.attackKey = false; return a; }
  consumeCamera() { const r = { rotate: this.rotate, zoom: this.zoom, tilt: this.tilt }; this.rotate = 0; this.zoom = 1; this.tilt = 0; return r; }
}
