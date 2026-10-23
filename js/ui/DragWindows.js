// v0.94 ลากหน้าต่างได้ — กดค้างที่แถบหัวหน้าต่าง (ชื่อหน้าต่าง) แล้วเลื่อนไปวางตรงไหนก็ได้ · ใช้ได้ทั้งเมาส์และนิ้ว
// ดับเบิลคลิก/แตะสองครั้งที่หัวหน้าต่าง = กลับตำแหน่งเดิม · จำตำแหน่งไว้จนกว่าจะรีโหลดหน้า (ปิดแล้วเปิดใหม่อยู่ที่เดิม)
const HEAD = '.st-head, .dlg-head, .mp-head, header';
const SKIP = 'button, input, select, textarea, a, label, [role=tab], .tb-btn';

export function enableWindowDrag(root) {
  const hud = root.querySelector('.hud') || root;
  let drag = null;
  const panelOf = (t) => {
    const head = t.closest(HEAD); if (!head || t.closest(SKIP)) return null;
    const el = head.closest('section.panel, .panel.tm, .menu-panel');
    if (!el || !hud.contains(el) || el.classList.contains('char') || el.classList.contains('mini')) return null;
    return { el, head };
  };
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const hit = panelOf(e.target); if (!hit) return;
    const { el } = hit, r = el.getBoundingClientRect(), op = el.offsetParent || hud, h = op.getBoundingClientRect();
    const k = op.offsetWidth ? h.width / op.offsetWidth : 1;   // หน้าต่างถูกย่อ/ขยายตามขนาด UI (--ui) → แปลงพิกเซลจอเป็นพิกเซล CSS
    // ตรึงตำแหน่งปัจจุบันเป็นพิกเซล (เลิกใช้ left:50% + translate ของ CSS)
    const set = (k, v) => el.style.setProperty(k, v, 'important');   // ชนะกฎจัดกลางจอของ CSS (บางหน้าต่างใช้ !important)
    set('left', `${(r.left - h.left) / k}px`); set('top', `${(r.top - h.top) / k}px`); set('right', 'auto'); set('bottom', 'auto'); set('transform', 'none'); set('translate', 'none'); set('scale', 'none'); set('margin', '0');
    drag = { el, id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, h, k, w: r.width, ht: r.height, moved: false, sx: e.clientX, sy: e.clientY };
    el.classList.add('dragging');
    try { hit.head.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    e.preventDefault();
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    drag.moved = true;
    const { h, k } = drag, keep = 60;   // เหลือหัวหน้าต่างให้เห็นอย่างน้อย 60px เสมอ (ลากหลุดจอไม่ได้)
    const vw = innerWidth, vh = innerHeight;
    const sx = Math.min(vw - keep, Math.max(keep - drag.w, e.clientX - drag.dx));   // ตำแหน่งบนจอ (จำกัดไม่ให้หลุดจอ)
    const sy = Math.min(vh - 40, Math.max(0, e.clientY - drag.dy));
    const x = (sx - h.left) / k, y = (sy - h.top) / k;
    drag.el.style.setProperty('left', `${Math.round(x)}px`, 'important'); drag.el.style.setProperty('top', `${Math.round(y)}px`, 'important');
    e.preventDefault();
  }, true);
  const end = (e) => { if (!drag || (e && e.pointerId !== drag.id)) return; drag.el.classList.remove('dragging'); drag = null; };
  document.addEventListener('pointerup', end, true);
  document.addEventListener('pointercancel', end, true);
  document.addEventListener('dblclick', (e) => {
    const hit = panelOf(e.target); if (!hit) return;
    for (const k of ['left', 'top', 'right', 'bottom', 'transform', 'translate', 'scale', 'margin']) hit.el.style.removeProperty(k);
  }, true);
}
