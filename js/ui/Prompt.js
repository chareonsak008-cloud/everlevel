// กล่องพิมพ์ข้อความสั้น ๆ (v0.13) — ใช้กับใบเปลี่ยนชื่อและโทรโข่งประกาศ · คืน Promise<string|null>
export function askText(root, { title, hint = '', placeholder = '', max = 80, ok = 'ตกลง' }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'ask-modal';
    wrap.innerHTML = `<form class="panel ask-box"><b class="ask-title"></b><p class="ask-hint"></p><input type="text" autocomplete="off" enterkeyhint="done"><div class="ask-btns"><button type="submit" class="primary"></button><button type="button" class="ghost">ยกเลิก</button></div></form>`;
    wrap.querySelector('.ask-title').textContent = title;
    const hintEl = wrap.querySelector('.ask-hint'); hintEl.textContent = hint; hintEl.hidden = !hint;
    const inp = wrap.querySelector('input'); inp.maxLength = max; inp.placeholder = placeholder;
    wrap.querySelector('.primary').textContent = ok;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) wrap.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') done(null); });
    const done = (v) => { wrap.remove(); resolve(v); };
    wrap.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.replace(/\s+/g, ' ').trim(); if (!v) { inp.focus(); return; } done(v.slice(0, max)); });
    wrap.querySelector('.ghost').addEventListener('click', () => done(null));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) done(null); });
    root.append(wrap);
    setTimeout(() => inp.focus(), 30);
  });
}
