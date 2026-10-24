// v0.91 ตัวเลือกสีชุด + ภาพตัวอย่างตัวละคร (ใช้ตอนสร้างตัวละคร และในตู้แฟชั่น)
import { OUTFIT_COLORS, OUTFIT_BY_ID, recolorPixels } from '../data/outfits.js?v=0.93.0-p4.2';
import { SHEETS, sheetOf } from '../render/SheetChars.js?v=0.93.0-p4.2';
import { VERSION } from '../config.js?v=0.93.0-p4.2';

const imgs = new Map();
const sheetImg = (src) => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = `${src}?v=${VERSION}`; imgs.set(src, im); } return im; };

// วาดท่ายืนหันหน้า (แถว S) ของแผ่นอาชีพลงแคนวาส แล้วย้อมสีชุด
export function drawOutfitPreview(cv, job, outfit) {
  const base = sheetOf(job) || 'novice', S = SHEETS[base]; if (!S) return;
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, im = sheetImg(S.src);
  if (!im.complete || !im.naturalWidth) { im.addEventListener('load', () => drawOutfitPreview(cv, job, outfit), { once: true }); return; }
  const rows = S.rows || 8, cw = im.naturalWidth / S.cols, ch = im.naturalHeight / rows, row = 4 * (S.rowsPerDir || 1);
  const foot = S.foot || 0.9, head = S.head != null ? S.head : 0.2;
  const k = Math.max(1, Math.floor(((H * 0.86) / (ch * (foot - head))) * 2) / 2);
  const dw = Math.round(cw * k), dh = Math.round(ch * k), dx = Math.round((W - dw) / 2), dy = Math.round(H - 6 - dh * foot);
  ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, 0, row * ch, cw, ch, dx, dy, dw, dh);
  if (OUTFIT_BY_ID[outfit] && OUTFIT_BY_ID[outfit].m) {
    const x0 = Math.max(0, dx), y0 = Math.max(0, dy), w = Math.min(W, dx + dw) - x0, h = Math.min(H, dy + dh) - y0;
    if (w > 0 && h > 0) { const d = ctx.getImageData(x0, y0, w, h); recolorPixels(d.data, outfit, base); ctx.putImageData(d, x0, y0); }
  }
}

// แถบปุ่มสี · onPick(id)
export function outfitSwatches(cur, onPick) {
  const wrap = document.createElement('div'); wrap.className = 'oc-sw'; wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', 'สีชุด');
  for (const c of OUTFIT_COLORS) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.oc = c.id; b.title = c.name; b.setAttribute('aria-label', c.name);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(c.id === cur));
    b.className = 'oc-b' + (c.sw ? '' : ' oc-def'); if (c.sw) b.style.setProperty('--oc', c.sw);
    b.addEventListener('click', () => { wrap.querySelectorAll('.oc-b').forEach((x) => x.setAttribute('aria-checked', String(x === b))); onPick(c.id); });
    wrap.append(b);
  }
  return wrap;
}
