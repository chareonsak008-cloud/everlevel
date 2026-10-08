// ไอคอนไอเทมใช้งาน (v0.13 preview): ใบวาร์ป · ใบคูณ EXP/ดรอป · ยาบัฟ · ของฟื้นฟู · ของระบบ · กิ่งไม้เรียกมอน
// วาดด้วย Canvas ในพื้นที่ 64×64 เหมือน ItemIcons.js (ขยายเป็นขนาดไหนก็คมเพราะวาดเป็นเส้น)
// ตอนใส่เกม: Object.assign(DRAW ใน ItemIcons.js, UTIL_DRAW) แล้วใช้ icon: [kind, color, color2] ตามข้อมูลใน data/consumables.js
// ไม่พึ่ง Three.js (ใช้ได้ทั้งในเกมและหน้า UI ล้วน) — shadeHex สูตรเดียวกับ render/Textures.js
export function shadeHex(hex, amt) {
  const h = hex.replace('#', '');
  const f = (i) => { const v = parseInt(h.slice(i, i + 2), 16); const o = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt); return Math.max(0, Math.min(255, Math.round(o))).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(2) + f(4);
}

const LINE = '#2a1d2c';
const TAU = Math.PI * 2;

function path(g, fn, fill, lw = 3) {
  g.beginPath(); fn(g);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = LINE; g.lineWidth = lw; g.stroke();
  if (fill) { g.fillStyle = fill; g.fill(); }
}
// เติมสีก่อนแล้วตัดเส้น (ให้เส้นขอบอยู่บนสุด)
function shape(g, fn, fill, lw = 3) {
  g.beginPath(); fn(g);
  g.fillStyle = fill; g.fill();
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = LINE; g.lineWidth = lw; g.stroke();
}
const grad = (g, x0, y0, x1, y1, ...stops) => { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; };
const radial = (g, x, y, r, a, b) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const shine = (g, x, y, rx, ry, a = 0.7, rot = -0.5) => { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
const rr = (g, x, y, w, h, r) => { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function glow(g, x, y, r, c, a = 0.5) { g.fillStyle = radial(g, x, y, r, rgba(c, a), rgba(c, 0)); g.fillRect(x - r, y - r, r * 2, r * 2); }
// ประกายดาว 4 แฉก
function sparkle(g, x, y, r, c = '#ffffff') {
  g.fillStyle = c; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, q = i % 2 ? r * 0.26 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fill();
}
function star5(g, x, y, r, fill, lw = 2) {
  shape(g, (g) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }, fill, lw);
}
// ตัวหนังสือมีขอบ (ตัวเลขบนใบคูณ)
function label(g, text, x, y, size, fill, stroke = LINE, lw = 4) {
  g.font = `900 ${size}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = stroke; g.lineWidth = lw; g.strokeText(text, x, y);
  g.fillStyle = fill; g.fillText(text, x, y);
}
// ป้ายบวก (ขยายกระเป๋า/คลัง)
function plusBadge(g, x, y, c) {
  shape(g, (g) => g.arc(x, y, 9, 0, TAU), grad(g, x, y - 9, x, y + 9, shadeHex(c, 0.35), shadeHex(c, -0.2)), 2.5);
  g.fillStyle = '#ffffff'; g.fillRect(x - 5, y - 1.6, 10, 3.2); g.fillRect(x - 1.6, y - 5, 3.2, 10);
}

/* ---------- สัญลักษณ์เล็ก ๆ (บนม้วนกระดาษ / ฉลากขวดยา) ---------- */
const SYM = {
  home(g, x, y, c) {
    shape(g, (g) => { g.moveTo(x - 10, y - 1); g.lineTo(x, y - 10); g.lineTo(x + 10, y - 1); g.closePath(); }, shadeHex(c, -0.05), 2);
    shape(g, (g) => g.rect(x - 7, y - 1, 14, 10), '#fff6e0', 2);
    shape(g, (g) => g.rect(x - 2.5, y + 2.5, 5, 6.5), shadeHex(c, -0.2), 1.5);
  },
  map(g, x, y, c) {
    g.setLineDash([2.5, 3]); g.strokeStyle = shadeHex(c, -0.3); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x - 11, y + 9); g.quadraticCurveTo(x - 4, y + 2, x + 2, y + 7); g.stroke(); g.setLineDash([]);
    shape(g, (g) => { g.moveTo(x + 4, y + 7); g.bezierCurveTo(x - 6, y - 3, x - 2, y - 12, x + 4, y - 12); g.bezierCurveTo(x + 10, y - 12, x + 14, y - 3, x + 4, y + 7); }, c, 2);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + 4, y - 5, 2.6, 0, TAU); g.fill();
  },
  friend(g, x, y, c) {
    for (const [dx, col] of [[-5, shadeHex(c, -0.15)], [5, c]]) {
      shape(g, (g) => g.arc(x + dx, y - 5, 4, 0, TAU), col, 1.8);
      shape(g, (g) => { g.moveTo(x + dx - 7, y + 8); g.quadraticCurveTo(x + dx, y - 4, x + dx + 7, y + 8); g.closePath(); }, col, 1.8);
    }
    g.fillStyle = '#ff5a7a'; g.beginPath(); g.moveTo(x, y - 9); g.bezierCurveTo(x - 4, y - 13, x - 7, y - 9, x, y - 4); g.bezierCurveTo(x + 7, y - 9, x + 4, y - 13, x, y - 9); g.fill();
  },
  reset(g, x, y, c) {
    g.lineCap = 'round';
    for (const [a0, a1] of [[0.25, 2.9], [3.4, 6.05]]) {
      g.strokeStyle = LINE; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 8, a0, a1); g.stroke();
      g.strokeStyle = c; g.lineWidth = 3.4; g.beginPath(); g.arc(x, y, 8, a0, a1); g.stroke();
      const ex = x + Math.cos(a1) * 8, ey = y + Math.sin(a1) * 8, t = a1 + Math.PI / 2;
      shape(g, (g) => { g.moveTo(ex + Math.cos(t) * 5, ey + Math.sin(t) * 5); g.lineTo(ex + Math.cos(t + 2.3) * 4.5, ey + Math.sin(t + 2.3) * 4.5); g.lineTo(ex + Math.cos(t - 2.3) * 4.5, ey + Math.sin(t - 2.3) * 4.5); g.closePath(); }, c, 1.5);
    }
  },
  stat(g, x, y, c) {
    for (const [i, h] of [[0, 8], [1, 13], [2, 18]]) shape(g, (g) => g.rect(x - 10 + i * 7, y + 9 - h, 5.5, h), i === 2 ? c : shadeHex(c, -0.25 + i * 0.1), 1.6);
    shape(g, (g) => { g.moveTo(x + 9, y - 12); g.lineTo(x + 13, y - 6); g.lineTo(x + 5, y - 6); g.closePath(); }, '#7dffb0', 1.5);
  },
  skill(g, x, y, c) { star5(g, x, y, 10, grad(g, x, y - 10, x, y + 10, shadeHex(c, 0.4), c), 2); sparkle(g, x + 10, y - 8, 4); },
  name(g, x, y, c) {
    shape(g, (g) => { g.moveTo(x + 11, y - 12); g.quadraticCurveTo(x + 2, y - 8, x - 6, y + 6); g.lineTo(x - 3, y + 8); g.quadraticCurveTo(x + 8, y - 2, x + 11, y - 12); }, '#ffffff', 1.8);
    g.strokeStyle = shadeHex(c, -0.2); g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 9, y - 10); g.lineTo(x - 4, y + 6); g.stroke();
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12, y + 10); g.quadraticCurveTo(x - 6, y + 6, x - 1, y + 10); g.stroke();
  },
  sword(g, x, y) {
    shape(g, (g) => { g.moveTo(x + 9, y - 11); g.lineTo(x + 11, y - 9); g.lineTo(x - 3, y + 5); g.lineTo(x - 5, y + 3); g.closePath(); }, '#eef4ff', 1.6);
    shape(g, (g) => { g.moveTo(x - 9, y + 1); g.lineTo(x - 1, y + 9); }, null, 3.5);
    g.strokeStyle = '#ffcf4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 9, y + 1); g.lineTo(x - 1, y + 9); g.stroke();
    shape(g, (g) => { g.moveTo(x - 4, y + 6); g.lineTo(x - 9, y + 11); }, null, 3);
  },
  shield(g, x, y, c) {
    shape(g, (g) => { g.moveTo(x, y - 11); g.lineTo(x + 9, y - 7); g.quadraticCurveTo(x + 9, y + 6, x, y + 11); g.quadraticCurveTo(x - 9, y + 6, x - 9, y - 7); g.closePath(); }, grad(g, x, y - 11, x, y + 11, '#e8eef8', '#8a98b8'), 1.8);
    g.fillStyle = c; g.fillRect(x - 1.5, y - 8, 3, 16); g.fillRect(x - 6, y - 3, 12, 3);
  },
  wing(g, x, y, c) {
    shape(g, (g) => { g.moveTo(x - 9, y + 6); g.quadraticCurveTo(x - 6, y - 10, x + 11, y - 9); g.quadraticCurveTo(x + 6, y - 5, x + 9, y - 2); g.quadraticCurveTo(x + 3, y, x + 6, y + 3); g.quadraticCurveTo(x - 1, y + 4, x - 9, y + 6); }, '#ffffff', 1.8);
    g.strokeStyle = shadeHex(c, -0.1); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 6, y + 3); g.lineTo(x + 6, y - 6); g.stroke();
  },
  clock(g, x, y, c) {
    shape(g, (g) => g.arc(x, y, 10, 0, TAU), '#fffaf0', 2);
    g.strokeStyle = c; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 7.5, y + Math.sin(a) * 7.5); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); }
    g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 6.5); g.moveTo(x, y); g.lineTo(x + 5, y + 2); g.stroke();
  },
  eye(g, x, y, c) {
    shape(g, (g) => { g.moveTo(x - 11, y); g.quadraticCurveTo(x, y - 10, x + 11, y); g.quadraticCurveTo(x, y + 10, x - 11, y); }, '#ffffff', 1.8);
    shape(g, (g) => g.arc(x, y, 4.6, 0, TAU), c, 1.5);
    g.fillStyle = LINE; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 1.6, y - 1.6, 1.2, 0, TAU); g.fill();
  },
  snow(g, x, y, c) {
    g.lineCap = 'round';
    for (const [lw, col] of [[4.5, LINE], [2.2, '#ffffff']]) {
      g.strokeStyle = col; g.lineWidth = lw;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI + Math.PI / 2; g.beginPath(); g.moveTo(x - Math.cos(a) * 10, y - Math.sin(a) * 10); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke(); }
    }
    g.fillStyle = c; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
  },
  flame(g, x, y) {
    shape(g, (g) => { g.moveTo(x, y - 12); g.bezierCurveTo(x + 10, y - 2, x + 9, y + 10, x, y + 10); g.bezierCurveTo(x - 9, y + 10, x - 10, y - 2, x - 3, y - 6); g.quadraticCurveTo(x - 2, y - 1, x, y - 12); }, grad(g, x, y - 12, x, y + 10, '#ffe066', '#ff5a1a'), 1.8);
    g.fillStyle = '#fff6c0'; g.beginPath(); g.ellipse(x, y + 4, 3, 4.5, 0, 0, TAU); g.fill();
  },
  star(g, x, y, c) { star5(g, x, y, 9.5, grad(g, x, y - 10, x, y + 10, '#fff6c0', c), 1.8); },
};

/* ================= ชุดวาดไอคอน ================= */
export const UTIL_DRAW = {
  // ใบวาร์ปสุ่ม: ใบไม้วิเศษมีวังวนแสง (ใบ = ใบไม้ + ใบวาร์ป)
  warpleaf(g, c = '#6ad8ff') {
    glow(g, 32, 32, 30, c, 0.45);
    shape(g, (g) => { g.moveTo(11, 54); g.bezierCurveTo(6, 26, 26, 8, 54, 9); g.bezierCurveTo(56, 36, 38, 56, 11, 54); }, grad(g, 11, 54, 54, 9, '#2f9e7a', '#58d6a8', '#b8fff0'));
    g.strokeStyle = '#1f6e58'; g.lineWidth = 2; g.beginPath(); g.moveTo(13, 52); g.quadraticCurveTo(30, 36, 50, 13); g.stroke();
    // วังวนแสง
    g.lineCap = 'round';
    for (const [lw, col] of [[4.5, rgba(c, 0.55)], [2.2, '#ffffff']]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      for (let t = 0; t <= 3.1 * Math.PI; t += 0.12) { const r = 1.5 + t * 1.55; const px = 33 + Math.cos(t + 1) * r, py = 31 + Math.sin(t + 1) * r; t ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
    shine(g, 22, 30, 3, 6, 0.4, 0.6);
    sparkle(g, 52, 44, 6); sparkle(g, 12, 16, 4.5, '#e8fbff'); sparkle(g, 56, 24, 3.5, c);
  },

  // ม้วนกระดาษ: c = สีตรา/สัญลักษณ์, sym = ชนิดสัญลักษณ์ (home/map/friend/reset/stat/skill/name)
  scroll(g, c = '#e8384f', sym = 'home') {
    const paper = grad(g, 0, 12, 0, 52, '#fffaf0', '#f0dfb4', '#e2c98e');
    shape(g, (g) => { g.moveTo(14, 14); g.lineTo(50, 14); g.quadraticCurveTo(47, 32, 50, 50); g.lineTo(14, 50); g.quadraticCurveTo(17, 32, 14, 14); }, paper, 2.5);
    g.strokeStyle = 'rgba(150,110,50,0.35)'; g.lineWidth = 1.2; g.strokeRect(18.5, 18.5, 27, 27);
    for (const y of [13, 51]) {
      shape(g, (g) => rr(g, 9, y - 4.5, 46, 9, 4.5), grad(g, 0, y - 4.5, 0, y + 4.5, '#fff4dc', '#d9bc82', '#b8955a'), 2.5);
      for (const x of [7, 57]) shape(g, (g) => g.arc(x, y, 3.6, 0, TAU), grad(g, x, y - 4, x, y + 4, '#c08850', '#6e4424'), 2);
    }
    (SYM[sym] || SYM.home)(g, 32, 31, c);
    // ริบบิ้น + ตราครั่ง
    shape(g, (g) => { g.moveTo(44, 46); g.lineTo(41, 60); g.lineTo(45, 57); g.lineTo(48, 61); g.lineTo(49, 47); g.closePath(); }, shadeHex(c, -0.15), 2);
    shape(g, (g) => { for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, q = i % 2 ? 6.2 : 7.4; g.lineTo(46 + Math.cos(a) * q, 45 + Math.sin(a) * q); } g.closePath(); }, grad(g, 40, 38, 52, 52, shadeHex(c, 0.3), shadeHex(c, -0.25)), 2);
    g.strokeStyle = shadeHex(c, 0.45); g.lineWidth = 1.4; g.beginPath(); g.arc(46, 45, 3.6, 0, TAU); g.stroke();
    shine(g, 22, 22, 4, 1.8, 0.6);
  },

  // ใบคูณ: c = สีธีม, spec = 'EXP|×2' (ป้ายบน | ตัวเลข)
  booster(g, c = '#ffb020', spec = 'EXP|×2') {
    const [top, mult] = spec.split('|'), big = mult === '×3';
    glow(g, 32, 33, 31, c, big ? 0.75 : 0.45);
    if (big) { g.save(); g.globalAlpha = 0.5; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.fillStyle = i % 2 ? '#fff6c0' : rgba(c, 0.8); g.beginPath(); g.moveTo(32, 33); g.arc(32, 33, 31, a, a + 0.18); g.closePath(); g.fill(); } g.restore(); }
    // ม้วนป้ายแบนเนอร์ ปลายม้วนสองข้าง
    for (const s of [-1, 1]) shape(g, (g) => { const x = 32 + s * 25; g.moveTo(x, 18); g.lineTo(x + s * 5.5, 25); g.lineTo(x, 32); g.lineTo(x + s * 5.5, 39); g.lineTo(x, 47); g.closePath(); }, shadeHex(c, -0.35), 2.5);
    shape(g, (g) => rr(g, 7, 14, 50, 36, 6), grad(g, 0, 14, 0, 50, shadeHex(c, 0.5), c, shadeHex(c, -0.25)), 2.8);
    g.setLineDash([3, 2.5]); g.strokeStyle = rgba('#ffffff', 0.7); g.lineWidth = 1.3; g.beginPath(); rr(g, 10.5, 17.5, 43, 29, 3.5); g.stroke(); g.setLineDash([]);
    label(g, top, 32, 23.5, top.length > 3 ? 9.5 : 11, '#ffffff', shadeHex(c, -0.6), 3);
    label(g, mult, 32, 38, mult.length > 2 ? 17.5 : 20, big ? '#fff0a0' : '#ffffff', LINE, 5);
    shine(g, 15, 17.5, 5, 1.6, 0.65, 0);
    sparkle(g, 53, 13, big ? 7 : 5); sparkle(g, 11, 51, big ? 5 : 3.5, '#fff6c0');
    if (big) sparkle(g, 55, 52, 4.5, '#ffffff');
  },

  // ใบโคลเวอร์การ์ด: การ์ดด้านหลัง + โคลเวอร์ทองสี่แฉก
  cardclover(g, c = '#7ad86a') {
    glow(g, 34, 34, 30, '#ffd36b', 0.4);
    g.save(); g.translate(26, 30); g.rotate(-0.2);
    shape(g, (g) => rr(g, -13, -19, 26, 38, 4), grad(g, 0, -19, 0, 19, '#fff4d0', '#e0b860'), 2.5);
    shape(g, (g) => rr(g, -9.5, -15.5, 19, 31, 2.5), grad(g, 0, -15, 0, 15, '#5a6ad8', '#2a2a7a'), 1.8);
    sparkle(g, 0, 0, 7, '#ffe9a0');
    g.restore();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4, x = 42 + Math.cos(a) * 9.5, y = 42 + Math.sin(a) * 9.5;
      shape(g, (g) => { g.moveTo(42, 42); g.bezierCurveTo(x + Math.cos(a - 1.25) * 11.5, y + Math.sin(a - 1.25) * 11.5, x + Math.cos(a + 1.25) * 11.5, y + Math.sin(a + 1.25) * 11.5, 42, 42); }, grad(g, x - 6, y - 6, x + 6, y + 6, '#fff3a0', '#e8b830'), 2);
    }
    
    shine(g, 38, 35, 2.5, 1.4, 0.8);
    sparkle(g, 56, 30, 5); sparkle(g, 10, 54, 3.5, '#fff6c0');
  },

  // ขวดยาบัฟ 4 ทรง · c = สีน้ำยา · sym = ฉลาก
  flask_round(g, c = '#e8384f', sym = 'sword') { flask(g, c, sym, 'round'); },
  flask_square(g, c = '#6a8ad8', sym = 'shield') { flask(g, c, sym, 'square'); },
  flask_tall(g, c = '#4fd88a', sym = 'wing') { flask(g, c, sym, 'tall'); },
  flask_bulb(g, c = '#ff9a3a', sym = 'clock') { flask(g, c, sym, 'bulb'); },

  // ชาปราชญ์: ถ้วยชา ไอร้อน ใบชา
  teacup(g, c = '#7ac86a') {
    g.lineCap = 'round';
    for (const [x, d] of [[25, 0], [33, 1.4], [41, 0.7]]) { g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, 24); g.bezierCurveTo(x - 4, 19 - d, x + 4, 15, x, 9 + d); g.stroke(); }
    shape(g, (g) => g.ellipse(32, 52, 24, 6, 0, 0, TAU), grad(g, 0, 46, 0, 58, '#f8f4ff', '#b8b0d8'), 2.5);
    shape(g, (g) => { g.moveTo(48, 32); g.bezierCurveTo(60, 30, 60, 46, 46, 44); }, null, 4.5);
    g.strokeStyle = '#f2eefc'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(48, 33); g.bezierCurveTo(57, 32, 57, 43, 46, 43); g.stroke();
    shape(g, (g) => { g.moveTo(12, 28); g.lineTo(52, 28); g.quadraticCurveTo(50, 50, 32, 51); g.quadraticCurveTo(14, 50, 12, 28); }, grad(g, 12, 28, 52, 28, '#ffffff', '#ece6fa', '#c8bfe6'), 2.8);
    shape(g, (g) => g.ellipse(32, 28, 20, 4.5, 0, 0, TAU), grad(g, 0, 24, 0, 33, shadeHex(c, 0.35), shadeHex(c, -0.2)), 2);
    g.strokeStyle = '#8a7ab8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(16, 38); g.quadraticCurveTo(32, 42, 48, 38); g.stroke();
    shape(g, (g) => { g.moveTo(26, 40); g.quadraticCurveTo(32, 33, 38, 40); g.quadraticCurveTo(32, 46, 26, 40); }, '#6ab85a', 1.5);
    shine(g, 18, 34, 2, 4.5, 0.6, 0.2);
  },

  // เค้กเทศกาล: ชิ้นเค้กหลายชั้น ครีม สตรอว์เบอร์รี เทียน
  cake(g, c = '#ff8ab0') {
    glow(g, 32, 36, 28, '#ffd36b', 0.35);
    shape(g, (g) => { g.moveTo(8, 34); g.lineTo(44, 24); g.lineTo(58, 32); g.lineTo(58, 52); g.lineTo(22, 58); g.lineTo(8, 50); g.closePath(); }, '#fff2e0', 2.8);
    shape(g, (g) => { g.moveTo(22, 42); g.lineTo(58, 34); g.lineTo(58, 52); g.lineTo(22, 58); g.closePath(); }, grad(g, 22, 40, 22, 58, '#ffe8c8', '#f2c890'), 2.5);
    g.fillStyle = shadeHex(c, -0.05); g.beginPath(); g.moveTo(22, 48); g.lineTo(58, 41); g.lineTo(58, 45); g.lineTo(22, 52); g.closePath(); g.fill();
    shape(g, (g) => { g.moveTo(8, 34); g.lineTo(44, 24); g.lineTo(58, 32); g.lineTo(22, 42); g.closePath(); }, grad(g, 8, 24, 58, 42, '#ffffff', shadeHex(c, 0.5)), 2.5);
    g.fillStyle = '#ffffff'; for (const [x, y] of [[24, 42], [32, 40.4], [40, 38.6], [48, 36.8], [56, 34.8]]) { g.beginPath(); g.arc(x, y + 1.5, 2.6, 0, Math.PI); g.fill(); }
    // สตรอว์เบอร์รี
    shape(g, (g) => { g.moveTo(30, 33); g.bezierCurveTo(24, 26, 28, 18, 34, 20); g.bezierCurveTo(40, 18, 42, 27, 30, 33); }, grad(g, 26, 18, 40, 32, '#ff6a7a', '#c81e3a'), 2.2);
    g.fillStyle = '#ffe9a0'; for (const [x, y] of [[31, 24], [35, 23], [33, 28], [29, 27]]) { g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); }
    shape(g, (g) => { g.moveTo(30, 20.5); g.lineTo(34, 17); g.lineTo(36, 21); g.closePath(); }, '#5ab84a', 1.5);
    // เทียน
    shape(g, (g) => g.rect(44, 14, 4, 14), grad(g, 44, 0, 48, 0, '#8ad8ff', '#4a8ad8'), 1.8);
    shape(g, (g) => { g.moveTo(46, 5); g.bezierCurveTo(50, 9, 49, 13, 46, 13); g.bezierCurveTo(43, 13, 42, 9, 46, 5); }, grad(g, 46, 5, 46, 13, '#fff6a0', '#ff8a1a'), 1.5);
    sparkle(g, 55, 12, 4.5); sparkle(g, 12, 22, 3.5, '#fff6c0');
  },

  // ขนนกฟีนิกซ์ชุบชีวิต
  phoenix(g, c = '#ff6a3a') {
    glow(g, 32, 32, 31, '#ffb040', 0.55);
    for (const [x, y, s] of [[14, 40, 1], [48, 50, 0.7], [20, 14, 0.8]]) shape(g, (g) => { g.moveTo(x, y - 7 * s); g.bezierCurveTo(x + 5 * s, y - 1 * s, x + 4 * s, y + 5 * s, x, y + 5 * s); g.bezierCurveTo(x - 4 * s, y + 5 * s, x - 5 * s, y - 1 * s, x, y - 7 * s); }, grad(g, x, y - 7, x, y + 5, '#ffe066', '#ff5a1a'), 1.5);
    shape(g, (g) => { g.moveTo(14, 56); g.bezierCurveTo(14, 34, 30, 10, 54, 6); g.bezierCurveTo(50, 22, 46, 26, 50, 30); g.bezierCurveTo(42, 34, 44, 38, 38, 42); g.bezierCurveTo(32, 46, 26, 50, 14, 56); }, grad(g, 14, 56, 54, 6, '#c81e1e', c, '#ffd34d', '#fff6c0'));
    g.strokeStyle = '#fff0a0'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(12, 58); g.bezierCurveTo(22, 40, 34, 24, 52, 8); g.stroke();
    g.strokeStyle = 'rgba(160,30,10,0.55)'; g.lineWidth = 1.3;
    for (const t of [0.3, 0.45, 0.6, 0.75]) { const x = 12 + 40 * t, y = 58 - 50 * t; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 3); g.stroke(); }
    shine(g, 30, 30, 2, 7, 0.5, 0.7);
    sparkle(g, 54, 34, 5.5); sparkle(g, 8, 26, 4, '#fff6c0');
  },

  // น้ำทิพย์ฟื้นเต็ม: ขวดหรู ฝาทอง น้ำยาสีรุ้ง
  elixir(g, c = '#ff6ad0') {
    glow(g, 32, 38, 30, '#ffe9a0', 0.5);
    shape(g, (g) => { g.moveTo(26, 8); g.lineTo(38, 8); g.lineTo(37, 16); g.lineTo(27, 16); g.closePath(); }, grad(g, 26, 8, 38, 8, '#fff2a0', '#c8901e'), 2.2);
    shape(g, (g) => g.arc(32, 6, 4, 0, TAU), '#ff4a7a', 2);
    shape(g, (g) => { g.moveTo(28, 16); g.lineTo(36, 16); g.lineTo(36, 22); g.bezierCurveTo(54, 26, 56, 48, 44, 56); g.lineTo(20, 56); g.bezierCurveTo(8, 48, 10, 26, 28, 22); g.closePath(); }, '#eaf6ff', 2.8);
    g.save(); g.beginPath(); g.moveTo(29, 23); g.bezierCurveTo(12, 27, 11, 47, 21, 54); g.lineTo(43, 54); g.bezierCurveTo(53, 47, 52, 27, 35, 23); g.closePath(); g.clip();
    g.fillStyle = grad(g, 12, 30, 52, 56, '#ffe066', c, '#8a6aff', '#4ad8ff'); g.fillRect(8, 30, 48, 30);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(8, 30, 48, 2.5);
    g.fillStyle = 'rgba(255,255,255,0.7)'; for (const [x, y, r] of [[24, 44, 2.2], [36, 40, 1.6], [40, 49, 1.3], [28, 50, 1.2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.restore();
    shape(g, (g) => rr(g, 22, 52, 20, 6, 2), grad(g, 22, 52, 42, 52, '#fff2a0', '#c8901e'), 2);
    shine(g, 21, 32, 2.6, 7, 0.65, 0.35);
    sparkle(g, 52, 16, 6); sparkle(g, 10, 22, 4, '#fff6c0'); sparkle(g, 54, 46, 3.5, c);
  },

  // ลูกอม (ฟื้นฟูต่อเนื่อง)
  candy(g, c = '#ff6a9a') {
    for (const s of [-1, 1]) shape(g, (g) => { const x = 32 + s * 13; g.moveTo(x, 32); g.lineTo(x + s * 15, 20); g.quadraticCurveTo(x + s * 11, 32, x + s * 15, 44); g.closePath(); }, grad(g, 32 + s * 13, 20, 32 + s * 28, 44, shadeHex(c, 0.4), shadeHex(c, -0.15)), 2.5);
    shape(g, (g) => g.ellipse(32, 32, 15, 13, 0, 0, TAU), '#ffffff', 2.8);
    g.save(); g.beginPath(); g.ellipse(32, 32, 13.6, 11.6, 0, 0, TAU); g.clip();
    g.strokeStyle = c; g.lineWidth = 4.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(22 + i * 8, 46); g.lineTo(34 + i * 8, 18); g.stroke(); }
    g.restore();
    shine(g, 26, 26, 4, 2.2, 0.8);
  },

  // กระเป๋าขยาย
  backpack(g, c = '#b0703a') {
    shape(g, (g) => { g.moveTo(22, 14); g.quadraticCurveTo(32, 2, 42, 14); }, null, 4.5);
    g.strokeStyle = shadeHex(c, -0.2); g.lineWidth = 2.5; g.beginPath(); g.moveTo(22, 14); g.quadraticCurveTo(32, 3, 42, 14); g.stroke();
    shape(g, (g) => rr(g, 12, 12, 40, 44, 10), grad(g, 0, 12, 0, 56, shadeHex(c, 0.25), shadeHex(c, -0.25)), 2.8);
    shape(g, (g) => { g.moveTo(12, 30); g.quadraticCurveTo(32, 20, 52, 30); g.lineTo(52, 24); g.quadraticCurveTo(52, 12, 42, 12); g.lineTo(22, 12); g.quadraticCurveTo(12, 12, 12, 24); g.closePath(); }, grad(g, 0, 12, 0, 30, shadeHex(c, 0.4), shadeHex(c, 0.05)), 2.5);
    shape(g, (g) => rr(g, 19, 36, 26, 15, 4), shadeHex(c, -0.1), 2.2);
    shape(g, (g) => rr(g, 28, 24, 8, 9, 2), '#ffcf4a', 2);
    g.strokeStyle = shadeHex(c, -0.45); g.lineWidth = 1.2; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(21, 43); g.lineTo(43, 43); g.stroke(); g.setLineDash([]);
    shine(g, 18, 20, 2, 4, 0.5, 0.3);
    plusBadge(g, 50, 50, '#3ac85a');
  },

  // ใบขยายคลัง: หีบไม้ + ป้ายบวก
  chest(g, c = '#a8642e') {
    shape(g, (g) => rr(g, 8, 28, 48, 26, 3), grad(g, 0, 28, 0, 54, shadeHex(c, 0.1), shadeHex(c, -0.3)), 2.8);
    shape(g, (g) => { g.moveTo(8, 30); g.lineTo(8, 22); g.quadraticCurveTo(32, 6, 56, 22); g.lineTo(56, 30); g.closePath(); }, grad(g, 0, 10, 0, 30, shadeHex(c, 0.35), shadeHex(c, -0.05)), 2.8);
    g.fillStyle = '#ffcf4a'; for (const x of [16, 44]) { g.fillRect(x - 2.5, 13, 5, 41); }
    g.strokeStyle = LINE; g.lineWidth = 1.5; for (const x of [16, 44]) g.strokeRect(x - 2.5, 14, 5, 40);
    shape(g, (g) => rr(g, 27, 26, 10, 11, 2), '#ffcf4a', 2);
    g.fillStyle = LINE; g.fillRect(31, 30, 2, 4);
    shine(g, 22, 18, 5, 1.6, 0.55, -0.2);
    plusBadge(g, 52, 50, '#4a9aff');
  },

  // โทรโข่งประกาศทั้งเซิร์ฟเวอร์
  megaphone(g, c = '#e8384f') {
    g.lineCap = 'round';
    for (const [r, a] of [[8, 1], [13, 0.75], [18, 0.5]]) { g.strokeStyle = `rgba(255,236,160,${a})`; g.lineWidth = 2.6; g.beginPath(); g.arc(44, 26, r, -0.7, 0.7); g.stroke(); }
    shape(g, (g) => { g.moveTo(12, 30); g.lineTo(40, 12); g.quadraticCurveTo(48, 26, 40, 40); g.lineTo(12, 38); g.closePath(); }, grad(g, 12, 12, 12, 40, shadeHex(c, 0.35), shadeHex(c, -0.2)), 2.8);
    shape(g, (g) => g.ellipse(40, 26, 5, 14, 0, 0, TAU), grad(g, 35, 12, 45, 40, '#ffffff', '#c8c8d8'), 2.5);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(16, 31); g.lineTo(36, 18); g.lineTo(37, 22); g.lineTo(17, 34); g.closePath(); g.fill();
    shape(g, (g) => rr(g, 6, 28, 9, 12, 2.5), '#5a4a6a', 2.2);
    shape(g, (g) => { g.moveTo(20, 39); g.lineTo(18, 52); g.lineTo(25, 52); g.lineTo(27, 39); }, '#5a4a6a', 2.2);
  },

  // ขนมสัตว์เลี้ยง: บิสกิตกระดูก + รอยเท้า (วาดเส้นขอบหนาทุกชิ้นก่อน แล้วค่อยเติมสี = ขอบรวมเป็นชิ้นเดียว)
  petsnack(g, c = '#e8a85a') {
    g.save(); g.translate(32, 32); g.rotate(-0.55);
    const parts = [(g) => rr(g, -16, -6.5, 32, 13, 3), ...[[-17, -7], [-17, 7], [17, -7], [17, 7]].map(([x, y]) => (g) => g.arc(x, y, 7.2, 0, TAU))];
    g.strokeStyle = LINE; g.lineWidth = 5.6; g.lineJoin = 'round';
    for (const p of parts) { g.beginPath(); p(g); g.stroke(); }
    g.fillStyle = grad(g, 0, -14, 0, 14, shadeHex(c, 0.35), c, shadeHex(c, -0.25));
    for (const p of parts) { g.beginPath(); p(g); g.fill(); }
    g.restore();
    g.fillStyle = shadeHex(c, -0.5);
    g.beginPath(); g.ellipse(32, 35, 5, 4, 0, 0, TAU); g.fill();
    for (const [x, y] of [[25.5, 28.5], [29.5, 25], [34.5, 25], [38.5, 28.5]]) { g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); }
    shine(g, 20, 22, 4, 1.5, 0.55, -0.6);
    sparkle(g, 53, 50, 4.5, '#fff6c0'); sparkle(g, 12, 50, 3, '#ffffff');
  },

  // กิ่งไม้เรียกมอนสเตอร์: c = สีพลัง (ม่วง = ธรรมดา · แดง = MVP)
  branch(g, c = '#a86aff', kind = 'dead') {
    const blood = kind === 'blood';
    glow(g, 32, 32, 30, c, blood ? 0.6 : 0.45);
    const wood = blood ? ['#7a2430', '#3a0e18'] : ['#9a7048', '#4a3020'];
    shape(g, (g) => { g.moveTo(14, 58); g.bezierCurveTo(20, 46, 18, 38, 26, 30); g.bezierCurveTo(32, 24, 30, 16, 40, 8); g.lineTo(44, 11); g.bezierCurveTo(36, 18, 38, 26, 31, 33); g.bezierCurveTo(24, 40, 26, 48, 19, 60); g.closePath(); }, grad(g, 14, 58, 44, 8, wood[1], wood[0]), 2.5);
    shape(g, (g) => { g.moveTo(27, 34); g.bezierCurveTo(36, 32, 42, 36, 50, 30); g.lineTo(51, 34); g.bezierCurveTo(43, 40, 36, 37, 29, 38); g.closePath(); }, grad(g, 27, 34, 51, 30, wood[1], wood[0]), 2.2);
    shape(g, (g) => { g.moveTo(22, 44); g.bezierCurveTo(14, 40, 12, 32, 8, 30); g.lineTo(10, 27); g.bezierCurveTo(16, 31, 18, 37, 24, 40); g.closePath(); }, grad(g, 8, 28, 24, 44, wood[0], wood[1]), 2);
    if (blood) { g.fillStyle = '#ff2a3a'; for (const [x, y, r] of [[30, 40, 2], [42, 15, 1.6], [20, 50, 1.7]]) { g.beginPath(); g.moveTo(x, y - r * 2.2); g.bezierCurveTo(x + r, y - r * 0.4, x + r, y + r, x, y + r); g.bezierCurveTo(x - r, y + r, x - r, y - r * 0.4, x, y - r * 2.2); g.fill(); } }
    else for (const [x, y, a] of [[40, 8, -0.6], [50, 30, 0.4], [8, 28, 2.6]]) { g.save(); g.translate(x, y); g.rotate(a); shape(g, (g) => { g.moveTo(0, 0); g.quadraticCurveTo(5, -6, 11, -2); g.quadraticCurveTo(5, 3, 0, 0); }, '#7ac86a', 1.5); g.restore(); }
    // ดวงตา/แสงลึกลับที่ปมไม้
    shape(g, (g) => g.ellipse(27, 31, 3.6, 2.6, -0.5, 0, TAU), c, 1.5);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(26.3, 30.4, 1, 0, TAU); g.fill();
    sparkle(g, 48, 46, 5, blood ? '#ffb0b8' : '#e8d8ff'); sparkle(g, 12, 14, 3.5, c);
  },
  branch_blood(g, c = '#ff3a4a') { UTIL_DRAW.branch(g, c, 'blood'); },

  // ไข่สัตว์เลี้ยง: c = สีเปลือก · spot = สีลาย (ทองดาราจักรมีดาว · เงินมีพระจันทร์เสี้ยว · ลายจุดเป็นจุด)
  egg(g, c = '#f6ead0', spot = '#8ac86a') {
    const gold = c === '#ffd36b', moon = spot === '#7fa8ff';
    glow(g, 32, 36, 28, gold ? '#ffd36b' : moon ? '#9ab8ff' : '#fff2c8', gold ? 0.55 : moon ? 0.45 : 0.25);
    const egg = (g) => { g.moveTo(32, 7); g.bezierCurveTo(48, 7, 54, 32, 52, 42); g.bezierCurveTo(50, 54, 42, 59, 32, 59); g.bezierCurveTo(22, 59, 14, 54, 12, 42); g.bezierCurveTo(10, 32, 16, 7, 32, 7); g.closePath(); };
    shape(g, egg, grad(g, 14, 8, 50, 58, shadeHex(c, 0.45), c, shadeHex(c, -0.22)), 2.8);
    g.save(); g.beginPath(); egg(g); g.clip();
    if (gold) {
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2.5;
      for (const y of [22, 36, 50]) { g.beginPath(); g.moveTo(10, y); g.bezierCurveTo(24, y - 7, 40, y + 7, 56, y - 2); g.stroke(); }
      for (const [x, y, r] of [[24, 20, 5], [40, 30, 4.2], [28, 44, 4.6], [43, 49, 3.4]]) star5(g, x, y, r, spot, 1.4);
    } else if (moon) {
      for (const [x, y, r] of [[25, 24, 5.5], [41, 36, 5], [27, 48, 4.2]]) { g.fillStyle = spot; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = shadeHex(c, 0.1); g.beginPath(); g.arc(x + r * 0.45, y - r * 0.25, r * 0.9, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff'; for (const [x, y] of [[38, 18], [19, 38], [46, 46], [33, 54]]) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
    } else {
      for (const [x, y, r, col] of [[24, 22, 5, spot], [40, 28, 4, '#c89a5a'], [22, 40, 4.4, '#c89a5a'], [38, 46, 5.6, spot], [31, 33, 2.6, spot], [45, 39, 2.4, spot]]) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0.4, 0, TAU); g.fill(); }
    }
    g.restore();
    shine(g, 23, 20, 3.4, 7, 0.65, 0.35);
    sparkle(g, 53, 14, gold ? 6 : 4.5, gold ? '#fff6c0' : '#ffffff');
    if (gold) sparkle(g, 11, 52, 4, '#ffffff');
  },

  // กล่องสุ่มนักผจญภัย: กล่องมีเครื่องหมายคำถาม + กระดาษสี
  luckybox(g, c = '#8a5ad8') {
    for (const [x, y, col, a] of [[10, 12, '#ffcf4a', 0.4], [54, 10, '#4ad8ff', -0.5], [56, 30, '#ff6a9a', 0.8], [8, 34, '#7ad86a', -0.3]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = col; g.fillRect(-3, -1.5, 6, 3); g.restore(); }
    shape(g, (g) => g.rect(11, 28, 42, 28), grad(g, 0, 28, 0, 56, shadeHex(c, 0.15), shadeHex(c, -0.3)), 2.8);
    shape(g, (g) => g.rect(8, 20, 48, 10), grad(g, 0, 20, 0, 30, shadeHex(c, 0.45), shadeHex(c, 0.05)), 2.8);
    g.fillStyle = '#ffcf4a'; g.fillRect(29, 20, 6, 36); g.strokeStyle = LINE; g.lineWidth = 1.5; g.strokeRect(29, 20, 6, 36);
    label(g, '?', 21, 43, 17, '#ffffff', LINE, 4);
    label(g, '?', 44, 43, 17, '#ffffff', LINE, 4);
    shape(g, (g) => { g.moveTo(32, 19); g.bezierCurveTo(24, 6, 14, 12, 20, 19); g.closePath(); }, '#ffcf4a', 2.2);
    shape(g, (g) => { g.moveTo(32, 19); g.bezierCurveTo(40, 6, 50, 12, 44, 19); g.closePath(); }, '#ffcf4a', 2.2);
    shine(g, 16, 23, 5, 1.5, 0.6, 0);
  },
};

// ขวดยา 4 ทรง ใช้ร่วมกัน
function flask(g, c, sym, form) {
  const liquid = (clip) => { g.save(); g.beginPath(); clip(g); g.clip(); g.fillStyle = grad(g, 0, 22, 0, 58, shadeHex(c, 0.3), c, shadeHex(c, -0.3)); g.fillRect(4, 23, 56, 37); g.fillStyle = shadeHex(c, 0.5); g.fillRect(4, 23, 56, 2.4); g.fillStyle = 'rgba(255,255,255,0.55)'; for (const [x, y, r] of [[22, 44, 1.8], [40, 48, 1.4], [30, 52, 1.1]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.restore(); };
  const glass = '#eaf4fb';
  if (form === 'round') {
    shape(g, (g) => g.rect(26, 8, 12, 14), glass, 2.5);
    shape(g, (g) => g.arc(32, 40, 19, 0, TAU), glass, 2.8);
    liquid((g) => g.arc(32, 40, 17, 0, TAU));
  } else if (form === 'square') {
    shape(g, (g) => g.rect(25, 9, 14, 10), glass, 2.5);
    shape(g, (g) => rr(g, 12, 18, 40, 40, 7), glass, 2.8);
    liquid((g) => rr(g, 14, 20, 36, 36, 5.5));
  } else if (form === 'tall') {
    shape(g, (g) => g.rect(27, 6, 10, 10), glass, 2.5);
    shape(g, (g) => { g.moveTo(25, 15); g.lineTo(39, 15); g.lineTo(44, 56); g.quadraticCurveTo(32, 60, 20, 56); g.closePath(); }, glass, 2.8);
    liquid((g) => { g.moveTo(26.5, 17); g.lineTo(37.5, 17); g.lineTo(42, 55); g.quadraticCurveTo(32, 58, 22, 55); g.closePath(); });
  } else {
    shape(g, (g) => g.rect(27, 8, 10, 10), glass, 2.5);
    shape(g, (g) => { g.moveTo(27, 17); g.lineTo(37, 17); g.bezierCurveTo(37, 24, 54, 28, 52, 44); g.bezierCurveTo(50, 58, 14, 58, 12, 44); g.bezierCurveTo(10, 28, 27, 24, 27, 17); g.closePath(); }, glass, 2.8);
    liquid((g) => { g.moveTo(28.5, 19); g.lineTo(35.5, 19); g.bezierCurveTo(36, 26, 52, 29, 50, 44); g.bezierCurveTo(48, 56, 16, 56, 14, 44); g.bezierCurveTo(12, 29, 28, 26, 28.5, 19); g.closePath(); });
  }
  // จุกไม้ก๊อก
  shape(g, (g) => rr(g, 24.5, form === 'tall' ? 3 : 4, 15, 7, 2), grad(g, 0, 3, 0, 11, '#c89a62', '#7a5230'), 2.2);
  // ฉลากกลม + สัญลักษณ์
  const ly = form === 'tall' ? 42 : form === 'square' ? 38 : 41, lr = form === 'tall' ? 9 : 11.5;
  shape(g, (g) => g.arc(32, ly, lr, 0, TAU), grad(g, 0, ly - lr, 0, ly + lr, '#fffaf0', '#e8d6aa'), 2);
  g.save(); g.translate(32, ly); g.scale(lr / 14, lr / 14); (SYM[sym] || SYM.star)(g, 0, 0, shadeHex(c, -0.1)); g.restore();
  shine(g, form === 'tall' ? 27 : 19, form === 'tall' ? 26 : 30, 2, 6, 0.6, form === 'tall' ? 0.1 : 0.4);
}

// วาดไอคอนตามข้อมูล icon: [kind, color, color2] ลงผืน Canvas ขนาด size
export function drawUtilIcon(icon, size = 64, canvas = null) {
  const c = canvas || document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.save(); g.scale(size / 64, size / 64);
  const [kind, color, color2] = icon;
  (UTIL_DRAW[kind] || UTIL_DRAW.scroll)(g, color, color2);
  g.restore();
  return c;
}
