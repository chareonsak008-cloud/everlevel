// v0.25.0: ไอคอนอุปกรณ์ — ทุกชิ้นมีทรงของตัวเอง (form + shape) และสีของตัวเอง
// form = ประเภท 12 แบบตามสเปก (ดาบมือเดียว/สองมือ/หอก, คทา/ไม้เท้า/ออร์บ, กระบอง/คทาศักดิ์สิทธิ์/หนังสือ, ธนูสั้น/ยาว/หน้าไม้)
// เกรดสูงขึ้นเพิ่มลายทอง อัญมณี ปีก รัศมี ประกาย — วาดบนพิกัด 64x64
import { shadeHex } from './Textures.js?v=0.89.0';
import { equipmentDesign } from '../data/equipmentDesigns.js?v=0.89.0';

const LINE = '#21151f';
const TAU = Math.PI * 2;
export const GRADE_GLOW = ['#e8ecf2', '#7fe07a', '#62b6ff', '#c58bff', '#ffa43a', '#ffd84a', '#ff4058', '#3fe6d0', '#fff1b0', '#ffd8ff'];

const lg = (g, x0, y0, x1, y1, stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const rg = (g, x, y, r0, r1, stops) => { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
function shape(g, pts, fill, lw = 2.2) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.lineJoin = 'round'; g.strokeStyle = LINE; g.lineWidth = lw; g.stroke(); if (fill) { g.fillStyle = fill; g.fill(); }
}
function draw(g, fn, fill, lw = 2.2) { g.beginPath(); fn(g); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = LINE; g.lineWidth = lw; g.stroke(); if (fill) { g.fillStyle = fill; g.fill(); } }
function line(g, pts, c, w) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = c; g.lineWidth = w; g.stroke(); }
const mirror = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
const circ = (x, y, r) => (g) => g.arc(x, y, r, 0, TAU);
function gem(g, x, y, r, c, cut = 'round') {
  if (cut === 'diamond') shape(g, [[x, y - r * 1.25], [x + r, y], [x, y + r * 1.25], [x - r, y]], lg(g, x - r, y - r, x + r, y + r, ['#ffffff', shadeHex(c, 0.25), shadeHex(c, -0.35)]), 1.5);
  else draw(g, circ(x, y, r), rg(g, x - r * 0.35, y - r * 0.35, r * 0.1, r * 1.2, ['#ffffff', shadeHex(c, 0.2), shadeHex(c, -0.4)]), 1.5);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, Math.max(0.7, r * 0.28), 0, TAU); g.fill();
}
function star(g, x, y, r, c = '#ffffff', n = 4, inner = 0.28) {
  g.fillStyle = c; g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, rr = i % 2 ? r * inner : r; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function wing(g, x, y, s, size, c1, c2, n = 4) {
  for (let i = n - 1; i >= 0; i--) {
    const L = size * (1 - i * 0.17), a = -0.35 - i * 0.32;
    const tx = x + s * Math.cos(a) * L, ty = y + Math.sin(a) * L;
    draw(g, (g) => { g.moveTo(x, y); g.quadraticCurveTo(x + s * L * 0.55, ty - size * 0.18, tx, ty); g.quadraticCurveTo(x + s * L * 0.45, y + size * 0.05 - i * 1.5, x, y + size * 0.16); }, lg(g, x, y, tx, ty, [c2, c1]), 1.4);
  }
}
function halo(g, x, y, rx, ry, c) {
  g.save(); g.lineWidth = 4.5; g.strokeStyle = LINE; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = 2.6; g.strokeStyle = lg(g, x - rx, y, x + rx, y, ['#fff6c8', c, '#fff6c8']); g.stroke(); g.restore();
}
const metalGrad = (g, x0, x1, c) => lg(g, x0, 0, x1, 0, ['#ffffff', shadeHex(c, 0.1), shadeHex(c, -0.4)]);

// ---------- พื้นหลังตามเกรด ----------
function aura(g, d) {
  const r = d.rank, c = d.rank >= 4 ? GRADE_GLOW[r] : d.glow;
  if (r >= 3) { g.fillStyle = rg(g, 32, 32, 2, 30, [c + 'aa', c + '33', c + '00']); g.fillRect(0, 0, 64, 64); }
  if (r >= 5) {
    g.save(); g.translate(32, 32); g.globalAlpha = r >= 6 ? 0.5 : 0.35; g.fillStyle = '#ffffff';
    const n = r >= 6 ? 12 : 8;
    for (let i = 0; i < n; i++) { g.rotate(TAU / n); g.beginPath(); g.moveTo(-1.6, 0); g.lineTo(0, -31); g.lineTo(1.6, 0); g.fill(); }
    g.restore();
  }
  if (r >= 9) {   // v0.77 นิรันดร์กาล: วงแหวนรุ้งสองชั้น
    g.save(); g.translate(32, 32); g.lineWidth = 2.2; g.globalAlpha = 0.85;
    const hues = ['#ff7ab8', '#ffd86a', '#8affb0', '#7ad8ff', '#c89aff', '#ff7ab8'];
    for (let i = 0; i < 6; i++) { g.strokeStyle = hues[i]; g.beginPath(); g.arc(0, 0, 29, (i / 6) * TAU, ((i + 1) / 6) * TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 24, ((i + 0.5) / 6) * TAU, ((i + 1.5) / 6) * TAU); g.stroke(); }
    g.restore();
  }
}
function sparkle(g, d) {
  const r = d.rank, c = GRADE_GLOW[r];
  if (r >= 2) star(g, 54, 10, 3 + r * 0.5, '#ffffff');
  if (r >= 3) star(g, 10, 52, 2.5 + r * 0.4, c);
  if (r >= 4) { star(g, 56, 46, 3, '#fff3c0'); g.fillStyle = '#ffffff'; for (const [x, y] of [[12, 14], [48, 56], [40, 6]]) { g.beginPath(); g.arc(x, y, 1, 0, TAU); g.fill(); } }
  if (r >= 6) { star(g, 8, 26, 3.5, '#ffffff'); star(g, 46, 30, 2.4, '#fff0f2'); }
  if (r >= 9) { star(g, 56, 28, 4.2, '#ffd8ff', 6); star(g, 30, 6, 3.2, '#c8f4ff', 6); star(g, 22, 58, 3, '#fff3a0', 6); }
}
function palette(d) {
  const r = d.rank;
  return { c1: d.c1, c2: d.c2, glow: d.glow, gold: r >= 4 ? '#ffd56a' : r >= 2 ? '#e2b85a' : '#b9a27a', wood: '#8a5a32', dark: shadeHex(d.c2, -0.3), grade: GRADE_GLOW[r] };
}
function diag(g, fn, s = 1.16) { g.save(); g.translate(32, 32); g.rotate(Math.PI / 4); g.scale(s, s); fn(); g.restore(); }

// ================= ดาบ =================
function bladePts(sh, w, tip, base) {
  const L = base - tip, at = (f) => tip + L * f;
  switch (sh) {
    case 'saber': return [[w * 0.4, tip], [w * 1.3, at(0.25)], [w * 1.2, at(0.6)], [w, base], [-w, base], [-w * 0.8, at(0.55)], [-w * 0.1, at(0.15)]];
    case 'rapier': return mirror([[0, tip - 2], [w * 0.55, at(0.1)], [w * 0.55, base]]);
    case 'broad': return mirror([[0, tip], [w * 1.5, at(0.14)], [w * 1.5, base]]);
    case 'cleaver': return [[-w, base], [-w, at(0.12)], [w * 2.3, tip], [w * 2.3, at(0.62)], [w, base]];
    case 'jagged': return mirror([[0, tip - 1], [w, at(0.16)], [w * 1.7, at(0.26)], [w * 0.9, at(0.38)], [w * 1.8, at(0.52)], [w, at(0.66)], [w * 1.6, at(0.82)], [w, base]]);
    case 'flame': return mirror([[0, tip - 1], [w * 1.35, at(0.18)], [w * 0.7, at(0.34)], [w * 1.5, at(0.52)], [w * 0.8, at(0.68)], [w * 1.4, at(0.86)], [w, base]]);
    case 'crescent': return mirror([[0, tip], [w * 1.7, at(0.12)], [w * 1.9, at(0.5)], [w * 1.3, base]]);
    case 'dagger': return mirror([[0, tip], [w, at(0.3)], [w * 0.9, base]]);
    case 'kris': return mirror([[0, tip], [w * 1.2, at(0.2)], [w * 0.5, at(0.42)], [w * 1.2, at(0.64)], [w * 0.8, base]]);
    case 'tanto': return [[-w, tip + 3], [w * 0.4, tip], [w, at(0.2)], [w, base], [-w, base]];
    case 'fang': return [[w * 1.5, tip], [w * 1.4, at(0.4)], [w, base], [-w, base], [-w * 0.2, at(0.4)]];
    default: return mirror([[0, tip], [w * 1.3, at(0.3)], [w * 1.1, at(0.75)], [w * 0.8, base]]);   // leaf
  }
}
function sword(g, d, P, kind) {
  const r = d.rank, sh = d.shape, two = kind === 'sword_2h', knife = kind === 'knife';
  const tip = knife ? -18 : two ? -31 : -29, base = knife ? 4 : two ? 0 : 4;
  const w = (knife ? 3.4 : two ? 4.6 : 3.4) + r * 0.25;
  if (two) g.translate(0, 2);
  const pts = bladePts(sh, w, tip, base);
  const hot = sh === 'flame' || r >= 5;
  const steel = sh === 'crescent' ? ['#3a2a3a', shadeHex(P.c2, 0.1), '#140a12'] : hot ? ['#ffffff', shadeHex(P.c1, 0.2), shadeHex(P.c1, -0.3)] : ['#ffffff', P.c1, shadeHex(P.c1, -0.4)];
  shape(g, pts, lg(g, -w * 1.6, 0, w * 1.6, 0, steel));
  // รายละเอียดตามทรง
  if (sh === 'saber' || sh === 'fang') for (let i = 0; i < 4; i++) { const y = tip + 6 + i * 6; shape(g, [[-w * 0.8, y], [-w * 1.6, y + 1.5], [-w * 0.8, y + 3]], shadeHex(P.c1, -0.2), 1.1); }
  if (sh === 'jagged') { line(g, [[0, tip + 4], [0, base - 2]], 'rgba(255,255,255,0.75)', 1.4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-w * 0.4, tip + 6, w * 0.4, (base - tip) * 0.6); }
  else if (sh === 'flame') { line(g, [[0, tip + 4], [-1.5, tip + 12], [1.5, tip + 18], [0, base - 2]], P.glow, 1.6); line(g, [[0, tip + 4], [-1.5, tip + 12], [1.5, tip + 18], [0, base - 2]], '#fff4c0', 0.6); }
  else if (sh === 'crescent') { const cy = tip + (base - tip) * 0.45; draw(g, circ(0, cy, w * 1.1), P.glow, 1.4); g.fillStyle = shadeHex(P.c2, 0.1); g.beginPath(); g.arc(w * 0.45, cy - 0.6, w * 0.95, 0, TAU); g.fill(); line(g, pts.slice(0, 4), P.glow, 1); }
  else if (sh === 'broad') { draw(g, circ(0, base - 9, 3.2), P.gold, 1.2); star(g, 0, base - 9, 2.6, '#fff4c0', 6, 0.45); line(g, [[0, tip + 5], [0, base - 13]], shadeHex(P.c1, 0.35), 1.3); }
  else if (sh === 'cleaver') { draw(g, circ(w * 1.2, tip + 6, 1.6), '#2a2028', 1); line(g, [[-w * 0.4, base - 2], [-w * 0.4, tip + 6]], 'rgba(255,255,255,0.6)', 1.2); }
  else if (sh === 'kris') line(g, [[0, tip + 3], [0, base - 1]], shadeHex(P.c1, 0.4), 1);
  else line(g, [[0, tip + 4], [0, base - 1]], shadeHex(P.c1, 0.35), 1.3);
  if (r >= 3 && sh !== 'crescent') { g.strokeStyle = P.gold; g.lineWidth = 1.1; for (let i = 0; i < Math.min(3, r - 2); i++) { const y = base - 5 - i * 5; g.beginPath(); g.moveTo(-w * 0.5, y); g.quadraticCurveTo(0, y - 2.5, w * 0.5, y); g.stroke(); } }
  // การ์ด
  const gy = base, gw = (knife ? 5 : two ? 9 : 7) + r * 0.9;
  const guard = d.guard || (sh === 'rapier' ? 'ring' : sh === 'flame' || sh === 'cleaver' ? 'gear' : r >= 4 ? 'wing' : sh === 'broad' ? 'disk' : 'bar');
  if (r >= 5) { wing(g, -3, gy + 2, -1, 7 + r * 0.8, '#ffffff', P.gold); wing(g, 3, gy + 2, 1, 7 + r * 0.8, '#ffffff', P.gold); }
  if (guard === 'ring') { g.lineWidth = 4; g.strokeStyle = LINE; g.beginPath(); g.ellipse(2, gy + 4, 6, 5, 0, 0.3, TAU - 0.3); g.stroke(); g.lineWidth = 2; g.strokeStyle = P.gold; g.stroke(); draw(g, (g) => g.rect(-gw * 0.6, gy, gw * 1.2, 3), P.gold, 1.4); }
  else if (guard === 'gear') { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; draw(g, (g) => g.rect(Math.cos(a) * 6 - 1.4, gy + 2 + Math.sin(a) * 6 - 1.4, 2.8, 2.8), shadeHex(P.c2, 0.3), 1); } draw(g, circ(0, gy + 2, 5.5), lg(g, 0, gy - 4, 0, gy + 8, [shadeHex(P.c2, 0.5), P.c2]), 1.6); }
  else if (guard === 'wing') shape(g, [[-gw, gy - 4], [-gw * 0.4, gy], [0, gy - 1], [gw * 0.4, gy], [gw, gy - 4], [gw * 0.8, gy + 2], [0, gy + 5], [-gw * 0.8, gy + 2]], lg(g, 0, gy - 4, 0, gy + 5, ['#fff2b8', P.gold, shadeHex(P.gold, -0.35)]));
  else if (guard === 'disk') { draw(g, (g) => g.rect(-gw, gy, gw * 2, 3.4), P.gold, 1.6); draw(g, circ(0, gy + 1.7, 4.4), lg(g, 0, gy - 3, 0, gy + 6, ['#fff6cc', P.gold]), 1.5); }
  else draw(g, (g) => g.rect(-gw, gy, gw * 2, 3.6), lg(g, 0, gy, 0, gy + 4, [shadeHex(sh === 'leaf' ? P.c2 : P.gold, 0.3), shadeHex(sh === 'leaf' ? P.c2 : P.gold, -0.3)]), 1.8);
  if (r >= 2) gem(g, 0, gy + 1.8, 1.8 + r * 0.25, P.glow);
  // ด้าม
  const gl = knife ? 9 : two ? 18 : 12;
  draw(g, (g) => g.rect(-2.2, gy + 4, 4.4, gl), lg(g, -2, 0, 2, 0, [shadeHex(P.c2, 0.25), P.c2]), 1.8);
  g.strokeStyle = shadeHex(P.c2, -0.5); g.lineWidth = 1; for (let y = gy + 7; y < gy + 3 + gl; y += 3) { g.beginPath(); g.moveTo(-2.2, y); g.lineTo(2.2, y - 1.5); g.stroke(); }
  const py = gy + gl + 6;
  if (r >= 3) shape(g, [[0, py - 3], [3.5, py], [0, py + 4], [-3.5, py]], P.gold, 1.6); else draw(g, circ(0, py, 2.8), P.gold, 1.6);
  if (r >= 1) gem(g, 0, py, 1.3 + r * 0.15, P.glow);
  if (sh === 'leaf' && r < 3) { draw(g, (g) => g.ellipse(4, py + 2, 3, 1.6, 0.6, 0, TAU), '#6ac04a', 1); }
}

// ================= หอก =================
function spear(g, d, P) {
  const r = d.rank, sh = d.shape, hy = -14;
  const shaft = sh === 'pike' ? ['#d8d08a', '#8a8040'] : [shadeHex(P.c2, 0.25), P.c2];
  draw(g, (g) => g.rect(-1.8, hy, 3.6, 46), lg(g, -2, 0, 2, 0, shaft), 1.8);
  if (sh === 'pike') for (const y of [-2, 10, 22]) line(g, [[-1.8, y], [1.8, y]], '#6a6030', 1.1);
  if (r >= 2) draw(g, (g) => g.rect(-2.8, hy + 2, 5.6, 3), P.gold, 1.3);
  // พู่/ริบบิ้น
  const tc = sh === 'pike' ? '#d8433a' : sh === 'fang' ? '#e8e0d0' : P.glow;
  draw(g, (g) => { g.moveTo(-1, hy + 5); g.quadraticCurveTo(-8, hy + 10, -6, hy + 17); g.quadraticCurveTo(-3, hy + 11, 1, hy + 6); }, tc, 1.3);
  if (r >= 4) { wing(g, -2, hy + 1, -1, 9 + r, '#ffffff', P.gold); wing(g, 2, hy + 1, 1, 9 + r, '#ffffff', P.gold); }
  const steel = (x0, x1) => metalGrad(g, x0, x1, P.c1);
  if (sh === 'fang') {
    draw(g, (g) => { g.moveTo(-1, hy); g.quadraticCurveTo(-8, hy - 10, -1, hy - 22); g.quadraticCurveTo(-3, hy - 10, 1, hy); }, lg(g, 0, hy - 22, 0, hy, ['#ffffff', P.c1]), 1.6);
    draw(g, (g) => { g.moveTo(1, hy); g.quadraticCurveTo(8, hy - 9, 2, hy - 19); g.quadraticCurveTo(3, hy - 9, -1, hy); }, lg(g, 0, hy - 19, 0, hy, ['#ffffff', shadeHex(P.c1, -0.15)]), 1.6);
    draw(g, (g) => g.rect(-3, hy - 2, 6, 4), P.c2, 1.4);
  } else if (sh === 'glaive') {
    shape(g, [[-2, hy], [-2, hy - 6], [-1, hy - 26], [5, hy - 22], [9, hy - 12], [7, hy - 4], [2, hy]], steel(-2, 9));
    g.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(3, hy - 8 - i * 5, 2, Math.PI, TAU); g.fill(); }
    line(g, [[-1, hy - 24], [8, hy - 11]], P.glow, 1.2);
  } else if (sh === 'halberd') {
    shape(g, mirror([[0, hy - 30], [2.4, hy - 22], [1.6, hy - 6]]), steel(-3, 3), 1.6);
    draw(g, (g) => { g.moveTo(2, hy - 18); g.quadraticCurveTo(14, hy - 20, 15, hy - 10); g.quadraticCurveTo(14, hy - 2, 2, hy - 4); g.closePath(); }, steel(2, 15), 1.8);
    shape(g, [[-2, hy - 14], [-8, hy - 12], [-2, hy - 9]], steel(-8, -2), 1.4);
    line(g, [[3, hy - 16], [9, hy - 15], [6, hy - 11], [11, hy - 9]], P.glow, 1.3);
  } else {
    shape(g, mirror([[0, hy - 24], [3.4 + r * 0.2, hy - 14], [1.6, hy - 2]]), steel(-4, 4), 1.8);
    line(g, [[0, hy - 21], [0, hy - 4]], shadeHex(P.c1, 0.35), 1);
  }
  if (r >= 2) gem(g, 0, hy + 3.5, 1.6 + r * 0.2, P.glow, r >= 4 ? 'diamond' : 'round');
  draw(g, circ(0, 32, 2.4), P.gold, 1.4);
}

// ================= คทา / ไม้เท้า =================
function rod(g, d, P) {
  const r = d.rank, sh = d.shape, hy = -12;
  const shaftC = sh === 'twig' ? ['#c89a62', '#7a5030'] : sh === 'icicle' ? ['#5a6a8a', '#1a2a4a'] : [shadeHex(P.c2, 0.3), P.c2];
  draw(g, (g) => { g.moveTo(-1.6, hy + 4); g.lineTo(1.6, hy + 4); g.lineTo(2.2, 24); g.lineTo(-2.2, 24); g.closePath(); }, lg(g, -2, 0, 2, 0, shaftC), 1.6);
  draw(g, circ(0, 25, 2.6), P.gold, 1.3);
  if (r >= 1) draw(g, (g) => g.rect(-2.6, hy + 6, 5.2, 2.4), P.gold, 1.2);
  if (r >= 4) { wing(g, -2, hy + 5, -1, 8 + r, '#ffffff', P.gold); wing(g, 2, hy + 5, 1, 8 + r, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 0, hy - 4, 10, 10, P.grade);
  if (sh === 'mushroom') {
    draw(g, (g) => g.rect(-2, hy - 2, 4, 7), '#f1e6cc', 1.3);
    draw(g, (g) => { g.moveTo(-10, hy); g.quadraticCurveTo(-9, hy - 14, 0, hy - 14); g.quadraticCurveTo(9, hy - 14, 10, hy); g.closePath(); }, lg(g, 0, hy - 14, 0, hy, [shadeHex(P.c1, 0.4), shadeHex(P.c1, -0.25)]), 1.8);
    for (const [x, y, s] of [[-4, hy - 7, 2], [3, hy - 9, 1.6], [6, hy - 3, 1.2], [-6, hy - 2, 1.1]]) { g.fillStyle = '#e8fbff'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
    g.fillStyle = P.glow + '88'; for (const [x, y] of [[-12, hy - 10], [11, hy - 15], [13, hy - 4]]) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
  } else if (sh === 'icicle') {
    for (const [x, l, a] of [[-4, 16, -0.25], [0, 22, 0], [4, 15, 0.25]]) { g.save(); g.translate(x * 0.4, hy); g.rotate(a); shape(g, [[-2.2, 0], [2.2, 0], [0, -l]], lg(g, -2, 0, 2, 0, ['#ffffff', P.c1, shadeHex(P.c1, -0.3)]), 1.4); g.restore(); }
    draw(g, (g) => g.rect(-4, hy - 1, 8, 3.4), '#c8d0dc', 1.3);
  } else if (sh === 'star') {
    for (let i = 0; i < 3; i++) line(g, [[-2 - i * 2, hy + 2 + i * 3], [-9 - i * 3, hy + 10 + i * 4]], [P.glow, '#ffffffaa', P.glow + '66'][i], 2 - i * 0.5);
    g.save(); g.translate(0, hy - 7); star(g, 0, 0, 10.5, LINE, 5, 0.48); star(g, 0, 0, 8.6, lg(g, 0, -9, 0, 9, ['#fff8d8', P.c1, P.gold]), 5, 0.48); g.restore();
    gem(g, 0, hy - 7, 2, P.glow);
  } else { // twig
    draw(g, (g) => { g.moveTo(0, hy + 4); g.quadraticCurveTo(-2, hy - 4, -5, hy - 10); }, null, 3.2); line(g, [[0, hy + 4], [-2, hy - 4], [-5, hy - 10]], '#a8794a', 1.8);
    draw(g, (g) => { g.moveTo(0, hy + 4); g.quadraticCurveTo(2, hy - 6, 3, hy - 14); }, null, 3.2); line(g, [[0, hy + 4], [2, hy - 6], [3, hy - 14]], '#a8794a', 1.8);
    for (const [x, y, a] of [[-7, hy - 12, -0.8], [5, hy - 16, 0.5], [-2, hy - 4, -2.2]]) draw(g, (g) => g.ellipse(x, y, 4.2, 2.1, a, 0, TAU), lg(g, x - 3, y, x + 3, y, ['#c8ffb0', P.c2]), 1.2);
    if (r >= 2) gem(g, 3, hy - 14, 1.8, P.glow);
  }
}
function staff(g, d, P) {
  const r = d.rank, sh = d.shape, hy = -19;
  const wood = sh === 'crook' ? ['#c89a62', '#7a5030'] : sh === 'crescent' ? ['#3a2a3a', '#140a12'] : sh === 'maw' ? ['#4a3a3a', '#1a1010'] : [shadeHex(P.c2, 0.3), P.c2];
  draw(g, (g) => g.rect(-2, hy + 4, 4, 46), lg(g, -2, 0, 2, 0, wood), 1.8);
  if (r >= 1) for (const y of [6, 20]) draw(g, (g) => g.rect(-2.8, y, 5.6, 2.4), P.gold, 1.2);
  if (r >= 6) halo(g, 0, hy, 14, 14, P.grade);
  if (r >= 4) { wing(g, -3, hy + 7, -1, 10 + r, '#ffffff', P.gold); wing(g, 3, hy + 7, 1, 10 + r, '#ffffff', P.gold); }
  if (sh === 'crook') {
    g.lineCap = 'round'; line(g, [[0, hy + 6], [0, hy - 4]], LINE, 6.2); g.beginPath(); g.arc(-5, hy - 4, 5, 0, Math.PI, true); g.strokeStyle = LINE; g.lineWidth = 6.2; g.stroke(); line(g, [[-10, hy - 4], [-10, hy + 1]], LINE, 6.2);
    g.strokeStyle = '#b8865a'; g.lineWidth = 3.6; g.beginPath(); g.moveTo(0, hy + 6); g.lineTo(0, hy - 4); g.arc(-5, hy - 4, 5, 0, Math.PI, true); g.lineTo(-10, hy + 1); g.stroke();
    draw(g, (g) => { g.moveTo(-12, hy + 8); g.quadraticCurveTo(-12, hy + 2, -10, hy + 2); g.quadraticCurveTo(-8, hy + 2, -8, hy + 8); g.closePath(); }, P.gold, 1.3);
    if (r >= 2) gem(g, -5, hy - 9, 2, P.glow);
  } else if (sh === 'roots') {
    gem(g, 0, hy - 3, 6 + r * 0.4, P.glow, 'diamond');
    for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1, o = i < 2 ? 0 : 3; draw(g, (g) => { g.moveTo(s * 1, hy + 8 + o); g.bezierCurveTo(s * 9, hy + 2, s * 8, hy - 8, s * (2 + o), hy - 12 - o); }, null, 3.8); line(g, [[s * 1, hy + 8 + o], [s * 7, hy + 1], [s * 6, hy - 7], [s * (2 + o), hy - 12 - o]], shadeHex(P.c1, -0.05 * i), 2.2); }
    g.fillStyle = '#6ac04a'; for (const [x, y] of [[8, hy - 2], [-8, hy - 6], [5, hy - 12]]) { g.beginPath(); g.ellipse(x, y, 2.4, 1.3, 0.5, 0, TAU); g.fill(); }
  } else if (sh === 'maw') {
    g.fillStyle = rg(g, 0, hy - 6, 0, 12, [P.glow + 'cc', P.glow + '00']); g.beginPath(); g.arc(0, hy - 6, 12, 0, TAU); g.fill();
    draw(g, (g) => { g.moveTo(-7, hy + 6); g.quadraticCurveTo(-11, hy - 8, -2, hy - 17); g.lineTo(2, hy - 14); g.quadraticCurveTo(-5, hy - 6, -3, hy + 4); g.closePath(); }, lg(g, -10, 0, 0, 0, ['#e8dcc8', '#9a8a78']), 1.6);
    draw(g, (g) => { g.moveTo(7, hy + 6); g.quadraticCurveTo(10, hy + 0, 6, hy - 3); g.lineTo(3, hy - 1); g.quadraticCurveTo(5, hy + 3, 3, hy + 6); g.closePath(); }, '#c8bca8', 1.4);
    for (const x of [-3, 0, 3]) shape(g, [[x - 1, hy - 1], [x + 1, hy - 1], [x, hy + 2]], '#ffffff', 0.8);
    g.fillStyle = '#ff3a1a'; g.beginPath(); g.arc(-5, hy - 9, 1.3, 0, TAU); g.fill();
    gem(g, 1, hy - 6, 4.2 + r * 0.3, P.glow);
  } else if (sh === 'crescent') {
    g.fillStyle = rg(g, 0, hy - 4, 0, 14, [P.glow + 'aa', P.glow + '00']); g.beginPath(); g.arc(0, hy - 4, 14, 0, TAU); g.fill();
    draw(g, (g) => { g.arc(0, hy - 4, 10, Math.PI * 0.15, Math.PI * 1.85, false); g.arc(4, hy - 5, 8, Math.PI * 1.75, Math.PI * 0.25, true); g.closePath(); }, lg(g, -10, 0, 10, 0, ['#ffffff', P.c1, shadeHex(P.glow, -0.2)]), 1.8);
    for (const [x, y] of [[-6, hy + 9], [3, hy + 12], [8, hy + 7]]) { draw(g, (g) => { g.moveTo(x, y - 3); g.quadraticCurveTo(x + 2, y, x, y + 1.6); g.quadraticCurveTo(x - 2, y, x, y - 3); }, P.glow, 1); }
    gem(g, -2, hy - 4, 2.2, P.glow, 'diamond');
  } else { // orbcage
    for (let i = 0; i < 4; i++) { const a = Math.PI * (0.15 + i * 0.233); draw(g, (g) => { g.moveTo(Math.cos(a) * 2, hy + 6); g.quadraticCurveTo(Math.cos(a) * 11, hy, Math.cos(a) * 7, hy - Math.sin(a) * 10); }, null, 3.4); line(g, [[Math.cos(a) * 2, hy + 6], [Math.cos(a) * 9, hy], [Math.cos(a) * 7, hy - Math.sin(a) * 10]], P.gold, 1.8); }
    gem(g, 0, hy - 1, 5.6 + r * 0.5, P.glow);
  }
}
function orb(g, d, P) {
  const r = d.rank, sh = d.shape, cx = 32, cy = 27, R = 13 + Math.min(2, r * 0.3);
  if (r >= 6) halo(g, cx, cy, R + 7, R + 7, P.grade);
  if (r >= 4) { wing(g, cx - 10, 48, -1, 12 + r, '#ffffff', P.gold); wing(g, cx + 10, 48, 1, 12 + r, '#ffffff', P.gold); }
  // ฐาน
  if (sh === 'sandstorm') shape(g, [[20, 56], [44, 56], [40, 46], [24, 46]], lg(g, 0, 46, 0, 56, ['#d8c8a8', '#8a7a5a']), 1.8);
  else if (sh === 'galaxy') { draw(g, (g) => g.ellipse(cx, 52, 13, 4, 0, 0, TAU), lg(g, 0, 48, 0, 56, ['#5a5a9a', '#1a1a3a']), 1.8); }
  else draw(g, (g) => { g.moveTo(22, 56); g.lineTo(42, 56); g.quadraticCurveTo(40, 46, 32, 44); g.quadraticCurveTo(24, 46, 22, 56); }, lg(g, 0, 44, 0, 56, [shadeHex(P.c2, 0.3), P.c2]), 1.8);
  for (const s of [-1, 1]) draw(g, (g) => { g.moveTo(cx + s * 5, 46); g.quadraticCurveTo(cx + s * 13, 42, cx + s * 11, 34); }, null, 3);
  for (const s of [-1, 1]) line(g, [[cx + s * 5, 46], [cx + s * 12, 41], [cx + s * 11, 34]], r >= 2 ? P.gold : shadeHex(P.c2, 0.4), 1.8);
  g.fillStyle = rg(g, cx, cy, R * 0.5, R + 8, [P.glow + '66', P.glow + '00']); g.beginPath(); g.arc(cx, cy, R + 8, 0, TAU); g.fill();
  // ลูกแก้ว
  const inside = sh === 'galaxy' ? ['#3a2a6a', '#0a0a24'] : sh === 'sandstorm' ? ['#f8e8c0', '#b8904a'] : sh === 'wisp' ? ['#f0fff8', '#4a8a7a'] : ['#ffffff', shadeHex(P.c1, -0.1)];
  draw(g, circ(cx, cy, R), rg(g, cx - 4, cy - 4, 1, R + 2, inside), 2.2);
  g.save(); g.beginPath(); g.arc(cx, cy, R - 1, 0, TAU); g.clip();
  if (sh === 'galaxy') {
    for (let a = 0; a < 2; a++) { g.strokeStyle = a ? '#b48cff' : '#ffd8ff'; g.lineWidth = 2.4 - a; g.beginPath(); for (let t = 0; t < 7; t += 0.15) { const rr = t * 1.6, x = cx + Math.cos(t + a * Math.PI) * rr, y = cy + Math.sin(t + a * Math.PI) * rr * 0.75; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    g.fillStyle = '#ffffff'; for (const [x, y] of [[-6, -5], [7, 3], [-3, 7], [5, -8], [9, -2]]) { g.beginPath(); g.arc(cx + x, cy + y, 0.8, 0, TAU); g.fill(); }
    star(g, cx, cy, 3, '#ffffff');
  } else if (sh === 'sandstorm') {
    for (let i = 0; i < 4; i++) { g.strokeStyle = ['#a8783a', '#e8c88a', '#8a5a2a', '#ffe8b0'][i]; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy + 2 - i * 3, 11 - i * 1.5, 3, -0.2, 0, TAU); g.stroke(); }
  } else if (sh === 'wisp') {
    g.strokeStyle = '#9affc8'; g.lineWidth = 1.8; g.beginPath(); for (let t = 0; t < 9; t += 0.2) { const x = cx + Math.cos(t * 1.4) * (2 + t), y = cy + 6 - t * 1.4; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  } else { // bubble + ปลา
    draw(g, (g) => { g.ellipse(cx + 1, cy + 3, 4, 2.4, 0, 0, TAU); }, '#ff9a4a', 1); shape(g, [[cx - 3, cy + 3], [cx - 6, cy + 1], [cx - 6, cy + 5]], '#ff7a2a', 1);
    g.fillStyle = 'rgba(255,255,255,0.8)'; for (const [x, y, s] of [[4, -6, 1.4], [6, -9, 0.9], [-5, 4, 1]]) { g.beginPath(); g.arc(cx + x, cy + y, s, 0, TAU); g.fill(); }
  }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(cx - 5, cy - 6, 4, 2.4, -0.6, 0, TAU); g.fill();
  if (sh === 'wisp') for (const [a, s] of [[0.4, 3], [2.5, 2.4], [4.4, 2.8]]) { const x = cx + Math.cos(a) * (R + 4), y = cy + Math.sin(a) * (R + 2); g.fillStyle = rg(g, x, y, 0, s * 2, ['#ffffff', '#9affc8', '#9affc800']); g.beginPath(); g.arc(x, y, s * 2, 0, TAU); g.fill(); }
  if (sh === 'galaxy' || r >= 5) { g.save(); g.lineWidth = 3; g.strokeStyle = LINE; g.beginPath(); g.ellipse(cx, cy, R + 5, 4.5, -0.3, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); g.lineWidth = 1.6; g.strokeStyle = P.gold; g.stroke(); g.restore(); }
}

// ================= สายฮีล =================
function mace(g, d, P) {
  const r = d.rank, sh = d.shape, hy = -15;
  if (sh !== 'morningstar') draw(g, (g) => g.rect(-2.2, hy + 5, 4.4, 38), lg(g, -2, 0, 2, 0, sh === 'cudgel' ? ['#b8865a', '#6a4426'] : [shadeHex(P.c2, 0.3), P.c2]), 1.8);
  draw(g, (g) => g.rect(-3, hy + 30, 6, 3), P.gold, 1.3); draw(g, circ(0, hy + 45, 2.8), P.gold, 1.4);
  if (r >= 4) { wing(g, -4, hy + 4, -1, 10 + r, '#ffffff', P.gold); wing(g, 4, hy + 4, 1, 10 + r, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 0, hy - 3, 14, 14, P.grade);
  const metal = (y0, y1) => lg(g, 0, y0, 0, y1, ['#ffffff', P.c1, shadeHex(P.c1, -0.4)]);
  if (sh === 'cudgel') {
    draw(g, (g) => { g.moveTo(-3, hy + 6); g.bezierCurveTo(-10, hy, -9, hy - 14, 0, hy - 15); g.bezierCurveTo(9, hy - 14, 10, hy, 3, hy + 6); g.closePath(); }, lg(g, -9, 0, 9, 0, ['#d8a870', '#8a5a32', '#5a3a1e']), 2);
    for (const y of [hy - 8, hy - 1]) draw(g, (g) => g.rect(-8.5, y, 17, 2.8), P.gold, 1.2);
    g.fillStyle = '#5a3a1e'; for (const [x, y] of [[-4, hy - 11], [4, hy - 4], [-3, hy + 2]]) { g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); }
  } else if (sh === 'bell') {
    draw(g, (g) => { g.moveTo(-3, hy - 12); g.quadraticCurveTo(-4, hy - 4, -10, hy + 4); g.lineTo(10, hy + 4); g.quadraticCurveTo(4, hy - 4, 3, hy - 12); g.closePath(); }, metal(hy - 12, hy + 4), 2);
    draw(g, (g) => g.ellipse(0, hy + 4, 10, 2.6, 0, 0, TAU), shadeHex(P.c1, -0.3), 1.6); draw(g, circ(0, hy + 7, 2), shadeHex(P.c1, -0.4), 1.2);
    draw(g, (g) => g.arc(0, hy - 13, 3, Math.PI, 0), null, 2); line(g, [[-6, hy - 2], [6, hy - 2]], shadeHex(P.c1, 0.4), 1.2);
  } else if (sh === 'maul') {
    draw(g, (g) => g.rect(-12, hy - 9, 24, 13), lg(g, 0, hy - 9, 0, hy + 4, ['#e8e2d8', P.c1, shadeHex(P.c1, -0.4)]), 2);
    for (const x of [-12, 9]) draw(g, (g) => g.rect(x, hy - 10, 3, 15), shadeHex(P.c2, 0.2), 1.4);
    draw(g, (g) => g.rect(-4, hy - 6, 8, 7), lg(g, 0, hy - 6, 0, hy + 1, [P.gold, shadeHex(P.gold, -0.3)]), 1.4);
    draw(g, (g) => { g.moveTo(-4, hy - 6); g.lineTo(0, hy - 9); g.lineTo(4, hy - 6); }, P.gold, 1.2); gem(g, 0, hy - 2.6, 1.6, P.glow);
  } else if (sh === 'morningstar') {
    draw(g, (g) => g.rect(-2.2, hy + 17, 4.4, 26), lg(g, -2, 0, 2, 0, [shadeHex(P.c2, 0.3), P.c2]), 1.8);
    for (let i = 0; i < 4; i++) { g.lineWidth = 3; g.strokeStyle = LINE; g.beginPath(); g.ellipse(i % 2 ? 0.6 : -0.6, hy + 15 - i * 4, 1.6, 2.4, 0, 0, TAU); g.stroke(); g.lineWidth = 1.4; g.strokeStyle = P.gold; g.stroke(); }
    const R = 7.5 + r * 0.3;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; shape(g, [[Math.cos(a - 0.2) * R, hy - 6 + Math.sin(a - 0.2) * R], [Math.cos(a) * (R + 5), hy - 6 + Math.sin(a) * (R + 5)], [Math.cos(a + 0.2) * R, hy - 6 + Math.sin(a + 0.2) * R]], i % 2 ? P.gold : '#fff4c0', 1.2); }
    draw(g, circ(0, hy - 6, R), rg(g, -3, hy - 9, 1, R + 2, ['#ffffff', P.c1, P.gold]), 1.8); star(g, 0, hy - 6, R * 0.6, '#fff6d0', 8, 0.5);
  } else { // flanged
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; shape(g, [[0, hy - 5], [Math.cos(a) * 11, hy - 5 + Math.sin(a) * 9], [Math.cos(a + 0.35) * 8, hy - 5 + Math.sin(a + 0.35) * 7]], metal(hy - 14, hy + 4), 1.6); }
    draw(g, circ(0, hy - 5, 5.5), metal(hy - 11, hy + 1), 1.8);
  }
  if (r >= 1 && sh !== 'maul') gem(g, 0, sh === 'bell' ? hy - 6 : hy - 6, 1.8 + r * 0.3, P.glow);
}
function scepter(g, d, P) {
  const r = d.rank, sh = d.shape, hy = -10;
  draw(g, (g) => { g.moveTo(-1.6, hy + 4); g.lineTo(1.6, hy + 4); g.lineTo(2.2, 26); g.lineTo(-2.2, 26); g.closePath(); }, lg(g, -2, 0, 2, 0, sh === 'seraph' ? ['#ffffff', '#d8d0d8'] : ['#f4e4b0', P.gold]), 1.6);
  for (const y of [hy + 10, hy + 20]) draw(g, (g) => g.rect(-2.8, y, 5.6, 2.2), sh === 'seraph' ? P.c2 : shadeHex(P.gold, -0.2), 1.1);
  draw(g, circ(0, 27, 2.6), P.gold, 1.3);
  if (sh === 'seraph') { for (const s of [-1, 1]) for (let k = 0; k < 3; k++) wing(g, s * 2, hy - 4 + k * 4, s, 13 - k * 2.5, '#ffffff', k === 1 ? P.glow : '#ffe8ec', 3); }
  else if (r >= 4) { wing(g, -2, hy + 2, -1, 9 + r, '#ffffff', P.gold); wing(g, 2, hy + 2, 1, 9 + r, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 0, hy - 14, 8, 2.6, P.grade);
  if (sh === 'candle') {
    draw(g, (g) => { g.moveTo(-8, hy - 2); g.quadraticCurveTo(0, hy + 6, 8, hy - 2); g.closePath(); }, lg(g, 0, hy - 2, 0, hy + 4, ['#fff4c0', P.gold]), 1.6);
    draw(g, (g) => g.rect(-3, hy - 14, 6, 12), lg(g, -3, 0, 3, 0, ['#ffffff', P.c1]), 1.5);
    g.fillStyle = rg(g, 0, hy - 19, 0, 8, ['#ffffffcc', P.glow + '66', P.glow + '00']); g.beginPath(); g.arc(0, hy - 19, 8, 0, TAU); g.fill();
    draw(g, (g) => { g.moveTo(0, hy - 25); g.quadraticCurveTo(4, hy - 18, 0, hy - 15); g.quadraticCurveTo(-4, hy - 18, 0, hy - 25); }, lg(g, 0, hy - 25, 0, hy - 15, ['#fff8d0', '#ffb03a']), 1.2);
  } else if (sh === 'lotus') {
    for (const [a, l] of [[-1.1, 9], [1.1, 9], [-0.55, 12], [0.55, 12], [0, 14]]) { g.save(); g.translate(0, hy); g.rotate(a); draw(g, (g) => { g.moveTo(0, 0); g.quadraticCurveTo(-4.5, -l * 0.5, 0, -l); g.quadraticCurveTo(4.5, -l * 0.5, 0, 0); }, lg(g, 0, 0, 0, -l, [shadeHex(P.c2, 0.2), P.c1, '#ffffff']), 1.3); g.restore(); }
    gem(g, 0, hy - 4, 2.2, P.glow);
  } else if (sh === 'plume') {
    for (const [a, c] of [[-0.45, '#ff8a3a'], [0.45, '#ffb03a'], [0, '#ffd27a']]) { g.save(); g.translate(0, hy); g.rotate(a); draw(g, (g) => { g.moveTo(0, 0); g.quadraticCurveTo(-6, -10, 0, -22); g.quadraticCurveTo(6, -10, 0, 0); }, lg(g, 0, 0, 0, -22, [P.c2, c, '#fff4c0']), 1.4); line(g, [[0, -1], [0, -19]], shadeHex(P.c2, -0.2), 0.9); g.restore(); }
    draw(g, circ(0, hy, 3.6), P.gold, 1.4); gem(g, 0, hy, 1.8, P.glow);
  } else { // seraph — อัญมณีหยดน้ำ
    draw(g, (g) => { g.moveTo(0, hy - 16); g.quadraticCurveTo(6, hy - 6, 0, hy); g.quadraticCurveTo(-6, hy - 6, 0, hy - 16); }, rg(g, -1.5, hy - 8, 0.5, 8, ['#ffffff', P.glow, P.c2]), 1.6);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(-1.6, hy - 9, 1, 2, 0.3, 0, TAU); g.fill();
  }
}
function book(g, d, P) {
  const r = d.rank, sh = d.shape;
  g.save(); g.translate(32, 33); g.rotate(-0.12);
  if (r >= 6) halo(g, 0, -26, 10, 2.8, P.grade);
  if (sh === 'grimoire' || r >= 4) { wing(g, -16, -8, -1, 11 + r, '#ffffff', P.gold); wing(g, 16, -8, 1, 11 + r, '#ffffff', P.gold); }
  // หน้ากระดาษ + ปก
  draw(g, (g) => g.rect(-14, -19, 30, 38), '#f4ead2', 1.8);
  for (let i = 0; i < 4; i++) line(g, [[16, -17 + i * 10], [16, -13 + i * 10]], '#c8b890', 1);
  const cover = sh === 'codex' ? ['#8aa86a', '#3a5a2a'] : sh === 'tome' ? ['#3a4a8a', '#141a3a'] : sh === 'grimoire' ? ['#fff0b0', '#b88a2a'] : [shadeHex(P.c2, 0.25), shadeHex(P.c2, -0.2)];
  draw(g, (g) => g.rect(-16, -21, 29, 41), lg(g, -16, -21, 13, 20, cover), 2);
  draw(g, (g) => g.rect(-16, -21, 5, 41), shadeHex(cover[1], -0.2), 1.4);
  if (sh === 'hymnal') {
    for (const [x, y] of [[13, -21], [13, 20], [-11, -21], [-11, 20]]) shape(g, [[x - (x > 0 ? 5 : 0), y], [x + (x > 0 ? 0 : 5), y], [x + (x > 0 ? 0 : 0), y + (y > 0 ? -5 : 5)]], P.gold, 1);
    draw(g, (g) => g.rect(-4, -10, 4, 16), P.gold, 1.2); draw(g, (g) => g.rect(-8, -6, 12, 4), P.gold, 1.2);
    draw(g, (g) => { g.moveTo(4, 20); g.lineTo(4, 28); g.lineTo(6, 26); g.lineTo(8, 28); g.lineTo(8, 20); }, '#d8433a', 1.2);
  } else if (sh === 'codex') {
    g.strokeStyle = '#2a4a1a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-11, 18); g.bezierCurveTo(4, 10, -6, -4, 10, -18); g.stroke(); g.strokeStyle = '#7ad04a'; g.lineWidth = 1.2; g.stroke();
    for (const [x, y, a] of [[-4, 9, -0.6], [2, 0, 0.7], [-1, -7, -0.5], [8, -14, 0.4]]) draw(g, (g) => g.ellipse(x, y, 3.4, 1.8, a, 0, TAU), lg(g, x - 3, y, x + 3, y, ['#c8ffb0', '#4a8a2a']), 1);
    gem(g, -1, 0, 2, P.glow);
  } else if (sh === 'tome') {
    const pts = [[-6, -12], [3, -8], [7, 2], [-2, 8], [5, 13]];
    line(g, pts, '#9ad8ff88', 1); for (const [x, y] of pts) star(g, x, y, 2.4, '#ffffff');
    draw(g, (g) => g.rect(-10, -19, 20, 3), P.gold, 1); draw(g, (g) => g.rect(-10, 15, 20, 3), P.gold, 1);
  } else { // grimoire
    draw(g, circ(0, 0, 8), lg(g, 0, -8, 0, 8, ['#ffffff', '#ffd56a']), 1.6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; line(g, [[Math.cos(a) * 9, Math.sin(a) * 9], [Math.cos(a) * 12, Math.sin(a) * 12]], '#b88a2a', 1.4); }
    gem(g, 0, 0, 3.2, P.glow, 'diamond');
  }
  if (r >= 2 && sh !== 'grimoire') gem(g, -13.5, 0, 1.6, P.glow);
  g.restore();
}

// ================= ธนู =================
function bowLimbs(g, d, P, long) {
  const r = d.rank, sh = d.shape, H = long ? 31 : 26, bulge = long ? 14 : 20;
  const limb = sh === 'crescent' || sh === 'eclipse' ? ['#4a3a5a', '#120a18'] : sh === 'antler' ? ['#ffffff', P.c1] : sh === 'wing' ? ['#6a4a2a', '#2a1a0a'] : [shadeHex(P.c1, 0.15), shadeHex(P.c1, -0.35)];
  const arc = (g) => { g.moveTo(-3, -H); g.quadraticCurveTo(bulge, -H * 0.5, 11, 0); g.quadraticCurveTo(bulge, H * 0.5, -3, H); };
  g.lineCap = 'round'; g.strokeStyle = LINE; g.lineWidth = sh === 'crescent' ? 10 : long ? 6.5 : 8; g.beginPath(); arc(g); g.stroke();
  g.strokeStyle = lg(g, 0, -H, 0, H, limb); g.lineWidth = sh === 'crescent' ? 7 : long ? 3.8 : 5; g.beginPath(); arc(g); g.stroke();
  if (r >= 3) { g.strokeStyle = P.gold; g.lineWidth = 1.1; g.beginPath(); arc(g); g.stroke(); }
  // ปลายคันตามทรง
  for (const s of [-1, 1]) {
    const y = s * H;
    if (sh === 'simple' || sh === 'ranger') draw(g, (g) => g.ellipse(-6, y - s * 1, 3.6, 1.8, s * 0.8, 0, TAU), lg(g, -9, y, -3, y, ['#c8ffb0', sh === 'ranger' ? '#4a6a3a' : '#6ac04a']), 1);
    else if (sh === 'wing') { draw(g, (g) => { g.moveTo(-3, y); g.quadraticCurveTo(-14, y - s * 2, -13, y - s * 10); g.quadraticCurveTo(-7, y - s * 7, -3, y); }, 'rgba(230,244,255,0.85)', 1.3); line(g, [[-4, y], [-11, y - s * 7]], '#3a2a1a', 0.8); }
    else if (sh === 'hawk' || sh === 'feather') { for (let k = 0; k < 3; k++) draw(g, (g) => { const yy = y - s * k * 5; g.moveTo(1 + k * 2, yy); g.quadraticCurveTo(-8, yy - s * 3, -12 + k, yy - s * 8); g.quadraticCurveTo(-4, yy - s * 5, 1 + k * 2, yy); }, lg(g, 0, yy0(y, s, k), -12, yy0(y, s, k), ['#ffffff', sh === 'feather' ? '#ff8a3a' : P.c1]), 1); }
    else if (sh === 'antler') { line(g, [[-3, y], [-9, y - s * 3], [-12, y - s * 9]], LINE, 3.2); line(g, [[-3, y], [-9, y - s * 3], [-12, y - s * 9]], P.c1, 1.6); line(g, [[-8, y - s * 3], [-5, y - s * 10]], LINE, 3); line(g, [[-8, y - s * 3], [-5, y - s * 10]], P.c1, 1.4); }
    else if (sh === 'crescent') shape(g, [[-3, y], [-8, y - s * 2], [-4, y - s * 6]], P.glow, 1.1);
    else draw(g, circ(-3, y, 2.2), P.gold, 1.2);
  }
  // สาย + ด้ามจับ
  g.strokeStyle = r >= 5 || sh === 'eclipse' ? P.glow : '#f4ead2'; g.lineWidth = r >= 5 ? 2 : 1.1; g.beginPath(); g.moveTo(-3, -H); g.lineTo(-3, H); g.stroke();
  draw(g, (g) => g.rect(9, -5, 6, 10), lg(g, 9, 0, 15, 0, [shadeHex(P.c2, 0.3), P.c2]), 1.6);
  if (sh === 'eclipse') { draw(g, circ(12, 0, 6.5), '#140a12', 1.6); g.lineWidth = 2; g.strokeStyle = P.glow; g.beginPath(); g.arc(12, 0, 6, 0, TAU); g.stroke(); draw(g, circ(13.5, -1, 4.6), '#000', 0); }
  if (r >= 1 && sh !== 'eclipse') gem(g, 12, 0, 1.5 + r * 0.25, P.glow, r >= 4 ? 'diamond' : 'round');
  if (r >= 4) { wing(g, 9, -12, 1, 8 + r, '#ffffff', P.gold, 3); wing(g, 9, 12, 1, 8 + r, '#ffffff', P.gold, 3); }
  if (r >= 3) { line(g, [[-3, 0], [24, 0]], LINE, 3); line(g, [[-3, 0], [24, 0]], '#d9c39a', 1.4); shape(g, [[28, 0], [22, -3], [22, 3]], r >= 5 ? P.glow : '#e8edf2', 1.2); }
}
const yy0 = (y, s, k) => y - s * k * 5;
function crossbow(g, d, P) {
  const r = d.rank, sh = d.shape;
  // ราง (stock) ตามแกน y, คันขวาง (prod) ใกล้ด้านบน
  const stock = sh === 'plank' ? ['#c89a62', '#7a5030'] : [shadeHex(P.c2, 0.3), P.c2];
  draw(g, (g) => { g.moveTo(-3, -22); g.lineTo(3, -22); g.lineTo(4, 14); g.lineTo(6, 26); g.lineTo(-2, 28); g.lineTo(-4, 14); g.closePath(); }, lg(g, -4, 0, 4, 0, stock), 1.8);
  draw(g, (g) => g.rect(-1.2, 4, 2.4, 8), '#3a3038', 1);
  if (sh === 'plank') for (const y of [-14, -2, 18]) draw(g, circ(0, y, 1), '#8a8f9a', 0.8);
  const py = -16, pw = 22;
  if (sh === 'fang') {
    for (const s of [-1, 1]) draw(g, (g) => { g.moveTo(0, py); g.quadraticCurveTo(s * 12, py - 8, s * pw, py + 6); g.quadraticCurveTo(s * 12, py - 3, 0, py + 3); }, lg(g, 0, py, s * pw, py, ['#e8e0d0', '#ffffff']), 1.6);
    draw(g, (g) => g.ellipse(0, py + 4, 5, 3.4, 0, 0, TAU), '#f4f4f8', 1.3);
  } else {
    g.lineCap = 'round'; g.strokeStyle = LINE; g.lineWidth = 6; g.beginPath(); g.moveTo(-pw, py + 6); g.quadraticCurveTo(0, py - 9, pw, py + 6); g.stroke();
    g.strokeStyle = sh === 'cog' ? '#c8a860' : sh === 'star' ? lg(g, -pw, 0, pw, 0, ['#fff6cc', P.c1, '#fff6cc']) : lg(g, -pw, 0, pw, 0, [shadeHex(P.c1, -0.2), P.c1, shadeHex(P.c1, -0.2)]); g.lineWidth = 3.4; g.stroke();
  }
  line(g, [[-pw, py + 6], [0, py + 12], [pw, py + 6]], r >= 5 ? P.glow : '#f4ead2', 1.1);
  if (sh === 'cog') for (const [x, y, R] of [[-7, py + 18, 5], [6, py + 24, 4]]) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; draw(g, (g) => g.rect(x + Math.cos(a) * R - 1.2, y + Math.sin(a) * R - 1.2, 2.4, 2.4), '#c8a860', 0.8); } draw(g, circ(x, y, R - 0.5), lg(g, x, y - R, x, y + R, ['#fff0c0', '#a8884a']), 1.3); draw(g, circ(x, y, 1.2), '#5a4a3a', 0.8); }
  if (sh === 'star') { g.save(); g.translate(0, py - 6); star(g, 0, 0, 8, LINE, 8, 0.4); star(g, 0, 0, 6.6, lg(g, 0, -6, 0, 6, ['#ffffff', P.c1]), 8, 0.4); g.restore(); }
  // ลูกดอก
  line(g, [[0, py + 12], [0, py - 12]], LINE, 2.6); line(g, [[0, py + 12], [0, py - 12]], '#d9c39a', 1.2); shape(g, [[0, py - 16], [-2.6, py - 10], [2.6, py - 10]], r >= 5 || sh === 'star' ? P.glow : '#e8edf2', 1.1);
  if (r >= 2) gem(g, 0, 0, 1.6 + r * 0.25, P.glow, r >= 4 ? 'diamond' : 'round');
  if (r >= 4) { wing(g, -5, 10, -1, 8 + r, '#ffffff', P.gold, 3); wing(g, 5, 10, 1, 8 + r, '#ffffff', P.gold, 3); }
}

// ================= ชุดและอุปกรณ์อื่น =================
function body(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  if (r >= 5) { wing(g, 20, 22, -1, 22, '#ffffff', P.grade); wing(g, 44, 22, 1, 22, '#ffffff', P.grade); }
  const fill = (y0, y1, k = 0) => lg(g, 16, y0, 48, y1, [shadeHex(c, 0.35 + k), c, shadeHex(c, -0.38)]);
  if (sh === 'robe') {
    shape(g, [[23, 10], [41, 10], [47, 22], [50, 56], [14, 56], [17, 22]], fill(10, 56));
    shape(g, [[28, 10], [36, 10], [38, 56], [26, 56]], lg(g, 0, 10, 0, 56, [shadeHex(P.c2, 0.3), P.c2]), 1.3);
    line(g, [[14, 54], [50, 54]], P.gold, 1.8); for (const x of [32]) gem(g, x, 22, 2 + r * 0.3, P.glow);
    for (const s of [-1, 1]) draw(g, (g) => { g.moveTo(32 + s * 9, 11); g.quadraticCurveTo(32 + s * 20, 14, 32 + s * 18, 30); g.lineTo(32 + s * 12, 22); }, fill(10, 30), 1.6);
  } else if (sh === 'scale') {
    shape(g, [[21, 12], [43, 12], [47, 24], [45, 50], [32, 55], [19, 50], [17, 24]], shadeHex(c, -0.35));
    g.save(); g.beginPath(); g.moveTo(21, 12); g.lineTo(43, 12); g.lineTo(47, 24); g.lineTo(45, 50); g.lineTo(32, 55); g.lineTo(19, 50); g.lineTo(17, 24); g.closePath(); g.clip();
    for (let y = 14; y < 56; y += 5) for (let x = 16 + ((y / 5) % 2) * 3; x < 50; x += 6) { g.fillStyle = lg(g, x, y, x, y + 5, [shadeHex(c, 0.45), shadeHex(c, -0.2)]); g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI); g.fill(); g.strokeStyle = shadeHex(c, -0.5); g.lineWidth = 0.8; g.stroke(); }
    g.restore(); draw(g, (g) => g.rect(18, 42, 28, 5), P.c2, 1.5); gem(g, 32, 44.5, 2 + r * 0.25, P.glow, 'diamond');
  } else if (sh === 'plate' || sh === 'coat') {
    const coat = sh === 'coat';
    shape(g, [[22, 12], [42, 12], [46, 22], [45, 50], [32, 56], [19, 50], [18, 22]], fill(12, 56));
    if (coat) { for (const s of [-1, 1]) draw(g, (g) => { g.moveTo(32 + s * 10, 12); g.quadraticCurveTo(32 + s * 6, 20, 32, 22); g.quadraticCurveTo(32 + s * 3, 14, 32 + s * 10, 12); }, '#f4f4f8', 1.4); line(g, [[19, 50], [32, 55], [45, 50]], '#f4f4f8', 3); line(g, [[32, 24], [32, 54]], shadeHex(c, -0.45), 1.3); for (const y of [30, 38, 46]) draw(g, circ(35, y, 1.4), P.gold, 0.9); }
    else { shape(g, [[23, 22], [32, 19], [41, 22], [40, 34], [32, 39], [24, 34]], lg(g, 0, 19, 0, 39, ['#ffffff', shadeHex(c, 0.1), shadeHex(c, -0.25)]), 1.5); for (const y of [42, 47]) line(g, [[21, y], [43, y]], shadeHex(c, -0.45), 1.3); }
  } else if (sh === 'vest') {
    shape(g, [[22, 12], [42, 12], [45, 24], [44, 50], [20, 50], [19, 24]], fill(12, 50));
    shape(g, [[28, 12], [36, 12], [34, 30], [32, 34], [30, 30]], '#e8dcc0', 1.2);
    for (let y = 18; y < 48; y += 4) { line(g, [[21, y], [27, y + 1]], shadeHex(c, -0.4), 0.8); line(g, [[43, y], [37, y + 1]], shadeHex(c, -0.4), 0.8); }
    for (const y of [36, 42]) draw(g, circ(32, y, 1.3), P.gold, 0.8);
  } else { // tunic
    shape(g, [[22, 10], [10, 18], [8, 30], [17, 32], [18, 54], [46, 54], [47, 32], [56, 30], [54, 18], [42, 10], [32, 16]], fill(10, 54));
    line(g, [[22, 11], [32, 17], [42, 11]], shadeHex(c, 0.5), 2.4); draw(g, (g) => g.rect(18, 40, 28, 4), P.c2, 1.3);
  }
  if (sh !== 'tunic' && sh !== 'robe') for (const s of [-1, 1]) {
    const x = 32 + s * 15;
    if (sh === 'plate' || sh === 'scale') draw(g, (g) => g.ellipse(x, 17, 8.5, 5.5 + r * 0.3, s * 0.35, 0, TAU), lg(g, x, 11, x, 23, [shadeHex(c, 0.45), shadeHex(c, -0.25)]), 1.8);
    else draw(g, (g) => g.ellipse(x, 16, 6.5, 4, s * 0.35, 0, TAU), lg(g, x, 11, x, 21, [shadeHex(P.c2, 0.4), P.c2]), 1.6);
    if (r >= 2) { g.strokeStyle = P.gold; g.lineWidth = 1.3; g.beginPath(); g.ellipse(x, 17, 6, 3.4, s * 0.35, Math.PI, TAU); g.stroke(); }
    for (let i = 0; i < Math.min(3, r - 1); i++) shape(g, [[x + s * (i * 3 - 3), 13 - i * 0.5], [x + s * (i * 3 - 1), 6 - r * 0.4], [x + s * (i * 3 + 1), 13]], P.gold, 1.2);
  }
  if (r >= 2 && sh !== 'robe' && sh !== 'scale') gem(g, 32, 28, 2.2 + r * 0.35, P.glow, r >= 4 ? 'diamond' : 'round');
  if (r >= 6) halo(g, 32, 6, 9, 2.6, P.grade);
}
function helm(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  if (r >= 4) { wing(g, 15, 34, -1, 12 + r, '#ffffff', P.gold); wing(g, 49, 34, 1, 12 + r, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 32, 9, 13, 3.5, P.grade);
  const fill = lg(g, 14, 14, 50, 50, [shadeHex(c, 0.45), c, shadeHex(c, -0.35)]);
  if (sh === 'hood') {
    draw(g, (g) => { g.moveTo(12, 52); g.bezierCurveTo(8, 18, 28, 4, 40, 10); g.quadraticCurveTo(50, 16, 52, 52); g.closePath(); }, fill, 2.2);
    draw(g, (g) => g.ellipse(32, 38, 11, 12, 0, 0, TAU), '#1b1622', 1.6);
    g.fillStyle = P.glow; for (const x of [28, 36]) { g.beginPath(); g.ellipse(x, 37, 1.6, 1, 0, 0, TAU); g.fill(); }
  } else if (sh === 'cap') {
    draw(g, (g) => { g.moveTo(14, 40); g.bezierCurveTo(14, 16, 50, 16, 50, 40); g.closePath(); }, fill, 2.2);
    draw(g, (g) => g.ellipse(32, 40, 22, 5, 0, 0, TAU), shadeHex(c, -0.2), 1.8);
    draw(g, (g) => { g.moveTo(40, 22); g.quadraticCurveTo(52, 6, 56, 10); g.quadraticCurveTo(50, 16, 44, 26); }, '#e8433a', 1.4);
  } else if (sh === 'circlet') {
    draw(g, (g) => g.ellipse(32, 38, 20, 8, 0, 0, TAU), null, 5.5); g.lineWidth = 3.2; g.strokeStyle = lg(g, 12, 0, 52, 0, ['#fff4c0', P.gold, '#9a6a1e']); g.stroke();
    shape(g, [[26, 31], [32, 18 - r], [38, 31]], lg(g, 0, 18, 0, 31, ['#fff6cc', P.gold]), 1.6);
    gem(g, 32, 28, 3 + r * 0.3, P.glow, 'diamond'); for (const s of [-1, 1]) gem(g, 32 + s * 12, 33, 1.8, c);
  } else if (sh === 'crown') {
    shape(g, [[12, 46], [14, 22], [22, 32], [32, 14], [42, 32], [50, 22], [52, 46]], lg(g, 0, 14, 0, 46, ['#fff4c0', P.gold, shadeHex(P.gold, -0.4)]));
    draw(g, (g) => g.rect(12, 42, 40, 8), shadeHex(P.gold, -0.2), 1.8);
    for (const [x, y] of [[14, 22], [32, 14], [50, 22]]) gem(g, x, y, 2.6, c);
    gem(g, 32, 46, 2.4, P.glow);
    if (/leaf|gnarl/.test(d.id)) g.fillStyle = '#6ac04a', [[20, 40], [44, 40]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 3, 1.6, 0.5, 0, TAU); g.fill(); });
  } else { // helm / horned
    if (sh === 'horned') for (const s of [-1, 1]) draw(g, (g) => { g.moveTo(32 + s * 14, 28); g.bezierCurveTo(32 + s * 26, 24, 32 + s * 28, 12, 32 + s * 22, 4); g.quadraticCurveTo(32 + s * 22, 16, 32 + s * 10, 22); g.closePath(); }, lg(g, 0, 4, 0, 28, ['#fff4e0', '#b8a888']), 1.6);
    if (r >= 3 && sh === 'helm') draw(g, (g) => { g.moveTo(30, 16); g.quadraticCurveTo(30, 4, 42, 4 - r * 0.5); g.quadraticCurveTo(38, 10, 36, 17); }, lg(g, 30, 4, 40, 17, [shadeHex(P.glow, 0.3), shadeHex(P.glow, -0.3)]), 1.5);
    draw(g, (g) => { g.moveTo(14, 44); g.bezierCurveTo(12, 12, 52, 12, 50, 44); g.lineTo(44, 50); g.lineTo(20, 50); g.closePath(); }, fill);
    draw(g, (g) => { g.moveTo(19, 34); g.lineTo(45, 34); g.lineTo(42, 40); g.lineTo(22, 40); g.closePath(); }, '#1b1622', 1.5);
    line(g, [[32, 40], [32, 49]], shadeHex(c, -0.3), 1.5);
    g.strokeStyle = r >= 1 ? P.gold : shadeHex(c, -0.3); g.lineWidth = 2.4; g.beginPath(); g.moveTo(16, 30); g.quadraticCurveTo(32, 25, 48, 30); g.stroke();
    if (r >= 2) gem(g, 32, 27, 2.4 + r * 0.3, P.glow, 'diamond');
  }
}
function cape(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  const hem = sh === 'tattered' ? [[54, 56], [49, 50], [45, 58], [39, 52], [33, 59], [27, 51], [21, 57], [16, 50], [10, 56]] : sh === 'feather' ? [[54, 54], [48, 58], [42, 54], [36, 59], [30, 54], [24, 59], [18, 54], [12, 57]] : [[54, 56], [43, 53], [32, 57], [21, 53], [10, 56]];
  if (sh === 'scarf') {
    draw(g, (g) => { g.moveTo(14, 18); g.quadraticCurveTo(32, 30, 50, 18); g.lineTo(50, 26); g.quadraticCurveTo(32, 38, 14, 26); g.closePath(); }, lg(g, 0, 18, 0, 34, [shadeHex(c, 0.3), c]), 2);
    for (const [x, a] of [[40, 0.25], [46, 0.45]]) { g.save(); g.translate(x, 28); g.rotate(a); draw(g, (g) => g.rect(-3.5, 0, 7, 24), lg(g, 0, 0, 0, 24, [c, shadeHex(c, -0.35)]), 1.8); for (let i = 0; i < 3; i++) line(g, [[-2 + i * 2, 24], [-2 + i * 2, 28]], c, 1.4); g.restore(); }
    for (let i = 0; i < 3; i++) line(g, [[18 + i * 10, 22 + (i === 1 ? 3 : 1)], [22 + i * 10, 26 + (i === 1 ? 3 : 1)]], shadeHex(c, -0.35), 1.2);
    if (r >= 2) gem(g, 24, 26, 2, P.glow);
    return;
  }
  if (sh === 'mantle') {
    shape(g, [[14, 14], [50, 14], [56, 36], [46, 40], [32, 36], [18, 40], [8, 36]], lg(g, 8, 14, 56, 40, [shadeHex(c, 0.35), c, shadeHex(c, -0.35)]));
    for (let x = 12; x < 54; x += 6) draw(g, circ(x, 37 + Math.abs(32 - x) * 0.1, 2.6), '#f4f4f8', 1);
    shape(g, [[20, 40], [44, 40], [48, 58], [16, 58]], lg(g, 0, 40, 0, 58, [shadeHex(c, -0.2), shadeHex(c, -0.5)]), 1.6);
  } else {
    shape(g, [[23, 9], [41, 9], [48, 28], ...hem, [16, 28]], lg(g, 10, 9, 54, 57, [shadeHex(c, 0.35), c, shadeHex(c, -0.4)]));
    shape(g, [[26, 12], [38, 12], [42, 30], [44, 50], [32, 52], [20, 50], [22, 30]], lg(g, 0, 12, 0, 52, [shadeHex(P.c2, 0.1), shadeHex(P.c2, -0.3)]), 1.1);
    if (sh === 'feather') for (let i = 0; i < 7; i++) draw(g, (g) => { const x = 14 + i * 6; g.moveTo(x, 44); g.quadraticCurveTo(x - 3, 52, x, 57); g.quadraticCurveTo(x + 3, 52, x, 44); }, lg(g, 0, 44, 0, 57, ['#ffffff', P.glow]), 1);
  }
  if (r >= 1 && sh !== 'feather') { g.strokeStyle = P.gold; g.lineWidth = 1.7; g.beginPath(); hem.forEach(([x, y], i) => (i ? g.lineTo(x, y - 1.5) : g.moveTo(x, y - 1.5))); g.stroke(); }
  if (r >= 3) { g.strokeStyle = P.gold; g.lineWidth = 1.2; g.beginPath(); g.moveTo(32, 22); g.lineTo(36, 30); g.lineTo(32, 38); g.lineTo(28, 30); g.closePath(); g.stroke(); gem(g, 32, 30, 2, P.glow, 'diamond'); }
  if (r >= 5) for (const [x, y] of [[24, 40], [40, 36], [30, 46], [37, 48], [26, 30]]) star(g, x, y, 1.8, r >= 6 ? '#ffe0e6' : '#fff3c0');
  draw(g, (g) => g.rect(21, 7, 22, 5), P.c2, 1.5);
  for (const s of [-1, 1]) { draw(g, circ(32 + s * 9, 10, 3.4), P.gold, 1.4); if (r >= 2) gem(g, 32 + s * 9, 10, 1.7, P.glow); }
  if (r >= 6) halo(g, 32, 4, 10, 2.6, P.grade);
}
function boots(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  if (sh === 'winged' || r >= 4) wing(g, 20, 22, -1, 13 + r, '#ffffff', sh === 'winged' ? P.glow : P.gold);
  const fill = lg(g, 16, 10, 54, 52, [shadeHex(c, 0.4), c, shadeHex(c, -0.35)]);
  if (sh === 'sandal') {
    draw(g, (g) => { g.moveTo(10, 48); g.lineTo(54, 48); g.quadraticCurveTo(58, 52, 54, 54); g.lineTo(10, 54); g.quadraticCurveTo(7, 51, 10, 48); }, lg(g, 0, 48, 0, 54, ['#d8b080', '#8a5a32']), 1.8);
    for (const x of [20, 32, 44]) draw(g, (g) => { g.moveTo(x - 6, 48); g.quadraticCurveTo(x, 36, x + 6, 48); }, null, 3.4), line(g, [[x - 6, 48], [x, 40], [x + 6, 48]], c, 2);
    draw(g, (g) => { g.moveTo(14, 48); g.quadraticCurveTo(14, 30, 22, 26); }, null, 3.2); line(g, [[14, 48], [15, 34], [22, 26]], c, 1.8);
    return;
  }
  const top = sh === 'fur' ? 14 : 10;
  shape(g, [[18, top], [36, top], [36, 36], [52, 40], [56, 46], [54, 52], [16, 52]], fill);
  draw(g, (g) => g.rect(15, 48, 41, 5), shadeHex(P.c2, -0.3), 1.5);
  if (sh === 'fur') { for (let i = 0; i < 6; i++) draw(g, circ(17 + i * 4, 13 + (i % 2), 3.4), '#f4f4f8', 1); }
  else draw(g, (g) => g.rect(16, 9, 22, 6), r >= 1 ? P.gold : shadeHex(c, 0.2), 1.5);
  if (sh === 'greave') { shape(g, [[19, 18], [35, 18], [35, 34], [27, 38], [19, 34]], lg(g, 0, 18, 0, 38, ['#ffffff', shadeHex(c, -0.2)]), 1.3); shape(g, [[38, 40], [50, 42], [46, 46], [38, 45]], shadeHex(c, 0.3), 1.1); }
  else if (sh === 'boot') { g.strokeStyle = '#e8d8b0'; g.lineWidth = 1.3; for (const y of [20, 26, 32]) { g.beginPath(); g.moveTo(21, y); g.lineTo(33, y + 2); g.moveTo(33, y); g.lineTo(21, y + 2); g.stroke(); } }
  else if (sh === 'winged') line(g, [[36, 38], [46, 40], [54, 46]], P.glow, 1.6);
  if (r >= 2) gem(g, 27, 12, 1.8 + r * 0.2, P.glow);
  if (r >= 5) gem(g, 27, 28, 2.2, P.glow, 'diamond');
}
function shield(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  if (r >= 5) { wing(g, 14, 28, -1, 16, '#ffffff', P.gold); wing(g, 50, 28, 1, 16, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 32, 6, 12, 3, P.grade);
  const rim = r >= 2 ? P.gold : shadeHex(c, -0.25), face = lg(g, 0, 8, 0, 56, [shadeHex(c, 0.35), shadeHex(c, -0.3)]);
  const O = { heater: [[12, 12], [52, 12], [52, 32], [32, 58], [12, 32]], kite: [[32, 5], [50, 16], [46, 38], [32, 59], [18, 38], [14, 16]], tower: [[14, 8], [50, 8], [52, 52], [32, 58], [12, 52]] }[sh];
  if (!O) {
    const R = sh === 'buckler' ? 17 : 24;
    draw(g, circ(32, 32, R), rim, 2.4); draw(g, circ(32, 32, R - 4.5), face, 1.6);
    if (sh === 'round') { line(g, [[32, 12], [32, 52]], shadeHex(c, -0.45), 3); line(g, [[12, 32], [52, 32]], shadeHex(c, -0.45), 3); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; draw(g, circ(32 + Math.cos(a) * 21.5, 32 + Math.sin(a) * 21.5, 1.2), '#e8e8f0', 0.6); } }
    else { draw(g, circ(32, 32, 7), lg(g, 0, 25, 0, 39, ['#ffffff', shadeHex(c, -0.1)]), 1.6); }
  } else {
    shape(g, O, rim, 2.4);
    const inner = O.map(([x, y]) => [32 + (x - 32) * 0.8, 33 + (y - 33) * 0.8]);
    shape(g, inner, face, 1.5);
    if (sh === 'tower') { for (const y of [20, 34, 46]) line(g, [[18, y], [46, y]], shadeHex(c, -0.45), 1.6); }
    else if (sh === 'kite') { line(g, [[32, 12], [32, 54]], P.glow, 2.2); }
    else { g.fillStyle = r >= 3 ? P.gold : shadeHex(c, 0.15); g.beginPath(); g.rect(29.5, 17, 5, 30); g.rect(19, 27, 26, 5); g.fill(); }
  }
  if (r >= 4) { wing(g, 29, 34, -1, 12, '#ffffff', P.gold); wing(g, 35, 34, 1, 12, '#ffffff', P.gold); }
  if (r >= 1) gem(g, 32, 32, 2.6 + r * 0.3, P.glow, r >= 4 ? 'diamond' : 'round');
}
function accessory(g, d, P) {
  const r = d.rank, sh = d.shape, c = P.c1;
  if (r >= 4) { wing(g, 22, 22, -1, 10 + r, '#ffffff', P.gold); wing(g, 42, 22, 1, 10 + r, '#ffffff', P.gold); }
  if (r >= 6) halo(g, 32, 6, 10, 2.6, P.grade);
  if (sh === 'pendant') {
    g.strokeStyle = LINE; g.lineWidth = 3.4; g.beginPath(); g.moveTo(14, 8); g.quadraticCurveTo(32, 34, 50, 8); g.stroke(); g.strokeStyle = P.gold; g.lineWidth = 1.8; g.stroke();
    shape(g, [[32, 26], [41, 36], [32, 56], [23, 36]], lg(g, 23, 26, 41, 56, ['#ffffff', c, shadeHex(c, -0.4)]), 2);
    draw(g, circ(32, 25, 3), P.gold, 1.3); gem(g, 32, 38, 2.4 + r * 0.3, P.glow);
    return;
  }
  const band = r >= 2 ? ['#fff4c0', '#e8b84a', '#9a6a1e'] : ['#ffffff', '#c9ccd4', '#7a7f8a'];
  g.lineWidth = sh === 'band' ? 11 : 9; g.strokeStyle = LINE; g.beginPath(); g.ellipse(32, 40, 15, 14, 0, 0, TAU); g.stroke();
  g.lineWidth = sh === 'band' ? 7.5 : 5.5; g.strokeStyle = lg(g, 17, 26, 47, 54, band); g.stroke();
  if (sh === 'band') { g.strokeStyle = shadeHex(c, -0.1); g.lineWidth = 1.4; g.beginPath(); g.ellipse(32, 40, 15, 14, 0, 0.2, Math.PI - 0.2); g.stroke(); for (const a of [0.6, 1.57, 2.5]) gem(g, 32 + Math.cos(a) * 15, 40 + Math.sin(a) * 14, 1.6, c); }
  else if (sh === 'signet') { draw(g, (g) => g.ellipse(32, 26, 10, 7, 0, 0, TAU), lg(g, 0, 19, 0, 33, band), 2); draw(g, (g) => g.ellipse(32, 26, 7, 4.6, 0, 0, TAU), shadeHex(c, -0.2), 1.2); star(g, 32, 26, 3.6, P.glow, 4, 0.4); }
  else { shape(g, [[24, 26], [40, 26], [36, 31], [28, 31]], P.gold, 1.5); gem(g, 32, 21, 4 + r * 0.6, c, r >= 3 ? 'diamond' : 'round'); if (r >= 3) for (const s of [-1, 1]) gem(g, 32 + s * 8, 25, 1.8, P.glow); }
}

// ================= ซองลูกธนู (มือรองสายธนู) =================
function quiver(g, d, P) {
  const r = d.rank, sh = d.shape;
  g.save(); g.translate(32, 34); g.rotate(0.55);
  // ลูกธนูโผล่ด้านบน
  const fc = [P.glow, '#ffffff', shadeHex(P.glow, -0.2), '#ffe8c0'];
  for (let i = 0; i < 4 + Math.min(2, r); i++) {
    const x = -7 + i * 3.4, top = -27 - (i % 2) * 3;
    line(g, [[x, -12], [x, top]], LINE, 2.6); line(g, [[x, -12], [x, top]], '#c8a878', 1.2);
    shape(g, [[x, top - 1], [x - 2.6, top + 6], [x, top + 4], [x + 2.6, top + 6]], fc[i % 4], 1);
  }
  // ตัวซอง
  const body = sh === 'crystal' ? ['#ffffff', P.c1, shadeHex(P.c1, -0.3)] : sh === 'blood' ? [shadeHex(P.c2, 0.3), P.c2, '#100810'] : [shadeHex(P.c1, 0.3), P.c1, shadeHex(P.c1, -0.4)];
  draw(g, (g) => { g.moveTo(-10, -14); g.lineTo(10, -14); g.lineTo(8, 24); g.quadraticCurveTo(0, 29, -8, 24); g.closePath(); }, lg(g, -10, 0, 10, 0, body), 2.2);
  draw(g, (g) => g.rect(-11, -16, 22, 5), r >= 2 ? P.gold : shadeHex(P.c2, 0.2), 1.6);
  for (const y of [2, 16]) draw(g, (g) => g.rect(-9.5, y, 19, 3), shadeHex(P.c2, 0.15), 1.3);
  if (sh === 'feather') for (const [x, y] of [[-4, 8], [3, 6]]) draw(g, (g) => g.ellipse(x, y, 2, 4.5, 0.3, 0, TAU), '#e8f4d8', 1);
  if (sh === 'ember') line(g, [[-3, -8], [1, 0], [-2, 8], [2, 18]], P.glow, 1.6);
  if (sh === 'rune' || sh === 'moon') { draw(g, circ(0, 7, 4.2), P.gold, 1.3); star(g, 0, 7, 3, P.glow, sh === 'moon' ? 4 : 6, 0.4); }
  if (sh === 'blood') { g.lineWidth = 1.6; g.strokeStyle = P.glow; g.beginPath(); g.arc(0, 8, 4.5, 0.4, Math.PI * 1.6); g.stroke(); }
  if (sh === 'crystal') line(g, [[-5, -10], [-5, 20]], 'rgba(255,255,255,0.7)', 1.6);
  if (r >= 1) gem(g, 0, -13.5, 1.6 + r * 0.25, P.glow, r >= 4 ? 'diamond' : 'round');
  // สายสะพาย
  g.strokeStyle = LINE; g.lineWidth = 3.4; g.beginPath(); g.moveTo(10, -10); g.quadraticCurveTo(22, 4, 9, 22); g.stroke();
  g.strokeStyle = shadeHex(P.c2, 0.3); g.lineWidth = 1.8; g.stroke();
  if (r >= 4) { wing(g, -9, 0, -1, 9 + r, '#ffffff', P.gold, 3); }
  g.restore();
}

const SPECIAL = new Set(['flower', 'bandana', 'lantern', 'brooch', 'clover']);
const DIAG = { sword_1h: 1, sword_2h: 1, knife: 1, spear: 1, rod: 1, staff: 1, mace: 1, scepter: 1, shortbow: 1, longbow: 1, crossbow: 1 };

export function drawEquipmentIcon(g, id, item, fallback) {
  const d = equipmentDesign(id, item), P = palette(d), k = item.icon?.[0];
  aura(g, d);
  if (SPECIAL.has(k)) { fallback(g); sparkle(g, d); return; }
  const f = d.form;
  if (DIAG[f]) diag(g, () => {
    if (f === 'sword_1h' || f === 'sword_2h') sword(g, d, P, f);
    else if (f === 'knife') { g.translate(0, -3); sword(g, d, P, 'knife'); }
    else if (f === 'spear') spear(g, d, P);
    else if (f === 'rod') rod(g, d, P);
    else if (f === 'staff') staff(g, d, P);
    else if (f === 'mace') mace(g, d, P);
    else if (f === 'scepter') scepter(g, d, P);
    else if (f === 'shortbow') bowLimbs(g, d, P, false);
    else if (f === 'longbow') bowLimbs(g, d, P, true);
    else crossbow(g, d, P);
  }, f === 'longbow' ? 1.05 : f === 'crossbow' ? 1.1 : 1.16);
  else {
    g.save(); g.translate(32, 33); g.scale(1.06, 1.06); g.translate(-32, -33);
    if (f === 'orb' || f === 'orbOff') orb(g, d, P);
    else if (f === 'book' || f === 'tome') book(g, d, P);
    else if (f === 'quiver') quiver(g, d, P);
    else if (f === 'body') body(g, d, P);
    else if (f === 'head') helm(g, d, P);
    else if (f === 'garment') cape(g, d, P);
    else if (f === 'shoes') boots(g, d, P);
    else if (f === 'shield') shield(g, d, P);
    else if (f === 'accessory') accessory(g, d, P);
    else fallback(g);
    g.restore();
  }
  sparkle(g, d);
}
