// ไอคอนสกิล วาดด้วย Canvas: เหรียญสีประจำสกิล + สัญลักษณ์สีขาวตัดเส้นเข้ม
import { SKILLS } from '../data/skills.js';
import { shadeHex } from './Textures.js';
import { PIXEL } from './PixelSprites.js';
import { pixelizeCanvas } from './PixelArt.js';

const S = 64;
const LINE = '#1c1222';
const cache = new Map();

function badge(g, c) {
  const gr = g.createRadialGradient(24, 18, 4, 32, 32, 34);
  gr.addColorStop(0, shadeHex(c, 0.25)); gr.addColorStop(0.6, shadeHex(c, -0.25)); gr.addColorStop(1, shadeHex(c, -0.6));
  g.fillStyle = gr;
  g.beginPath(); g.roundRect ? g.roundRect(3, 3, 58, 58, 13) : g.rect(3, 3, 58, 58); g.fill();
  g.strokeStyle = 'rgba(255,240,200,0.55)'; g.lineWidth = 2; g.stroke();
}

// วาดรูปทรงแล้วลงสีขาวพร้อมเส้นขอบ
function glyph(g, fn, fill = '#ffffff', lw = 5) {
  g.save();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); fn(g); g.strokeStyle = LINE; g.lineWidth = lw; g.stroke();
  g.fillStyle = fill; g.fill();
  g.restore();
}
function stroke(g, fn, color = '#ffffff', w = 4) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); fn(g); g.strokeStyle = LINE; g.lineWidth = w + 3; g.stroke();
  g.beginPath(); fn(g); g.strokeStyle = color; g.lineWidth = w; g.stroke();
  g.restore();
}
const star = (g, cx, cy, r1, r2, n = 5, rot = -Math.PI / 2) => {
  for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * Math.PI * 2; i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.closePath();
};

const DRAW = {
  book(g) {
    glyph(g, (g) => { g.moveTo(14, 18); g.lineTo(31, 22); g.lineTo(31, 50); g.lineTo(14, 46); g.closePath(); }, '#fff6dc');
    glyph(g, (g) => { g.moveTo(50, 18); g.lineTo(33, 22); g.lineTo(33, 50); g.lineTo(50, 46); g.closePath(); }, '#fff6dc');
    stroke(g, (g) => { g.moveTo(18, 28); g.lineTo(27, 30); g.moveTo(18, 35); g.lineTo(27, 37); g.moveTo(37, 30); g.lineTo(46, 28); }, '#c9a24a', 2);
  },
  bandage(g) {
    g.save(); g.translate(32, 32); g.rotate(-0.7);
    glyph(g, (g) => g.rect(-22, -8, 44, 16), '#fff6ea');
    glyph(g, (g) => g.rect(-6, -8, 12, 16), '#ffd0c8', 3);
    g.restore();
    stroke(g, (g) => { g.moveTo(32, 24); g.lineTo(32, 40); g.moveTo(24, 32); g.lineTo(40, 32); }, '#ff5a5a', 3);
  },
  swordup(g) {
    glyph(g, (g) => { g.moveTo(32, 8); g.lineTo(37, 16); g.lineTo(36, 42); g.lineTo(28, 42); g.lineTo(27, 16); g.closePath(); }, '#eef4ff');
    glyph(g, (g) => g.rect(20, 42, 24, 5), '#e8c050', 4);
    glyph(g, (g) => g.rect(29, 47, 6, 9), '#7a5232', 4);
    glyph(g, (g) => { g.moveTo(48, 22); g.lineTo(54, 14); g.lineTo(60, 22); g.lineTo(56, 22); g.lineTo(56, 30); g.lineTo(52, 30); g.lineTo(52, 22); g.closePath(); }, '#8fe08a', 3);
  },
  shield(g) {
    glyph(g, (g) => { g.moveTo(32, 9); g.lineTo(52, 16); g.quadraticCurveTo(52, 44, 32, 56); g.quadraticCurveTo(12, 44, 12, 16); g.closePath(); }, '#e6ebf2');
    glyph(g, (g) => { g.moveTo(32, 16); g.lineTo(45, 21); g.quadraticCurveTo(45, 41, 32, 49); g.closePath(); }, '#b8c0cc', 0.1);
    stroke(g, (g) => { g.moveTo(32, 22); g.lineTo(32, 44); g.moveTo(24, 30); g.lineTo(40, 30); }, '#e8c050', 3);
  },
  slash(g) {
    glyph(g, (g) => { g.moveTo(10, 50); g.quadraticCurveTo(26, 12, 56, 8); g.quadraticCurveTo(34, 22, 18, 54); g.closePath(); }, '#fff2d0');
    stroke(g, (g) => { g.moveTo(44, 40); g.lineTo(54, 50); g.moveTo(40, 48); g.lineTo(46, 56); g.moveTo(50, 32); g.lineTo(58, 36); }, '#ffd27a', 3);
  },
  burst(g) {
    glyph(g, (g) => star(g, 32, 34, 25, 11, 8), '#fff2c0');
    glyph(g, (g) => g.arc(32, 34, 8, 0, Math.PI * 2), '#ffb03a', 3);
  },
  flame(g) {
    glyph(g, (g) => { g.moveTo(32, 6); g.bezierCurveTo(46, 20, 54, 32, 48, 46); g.bezierCurveTo(44, 56, 20, 56, 16, 46); g.bezierCurveTo(12, 34, 22, 28, 24, 18); g.bezierCurveTo(28, 26, 30, 28, 32, 6); }, '#ffe08a');
    glyph(g, (g) => { g.moveTo(32, 26); g.bezierCurveTo(40, 34, 42, 42, 38, 48); g.bezierCurveTo(34, 52, 26, 52, 24, 46); g.bezierCurveTo(22, 40, 28, 36, 32, 26); }, '#ff8a2a', 3);
  },
  ice(g) {
    glyph(g, (g) => { g.moveTo(52, 8); g.lineTo(58, 14); g.lineTo(24, 48); g.lineTo(16, 40); g.closePath(); }, '#e8fbff');
    glyph(g, (g) => { g.moveTo(16, 40); g.lineTo(24, 48); g.lineTo(8, 58); g.closePath(); }, '#9ae8ff', 4);
    stroke(g, (g) => { g.moveTo(14, 18); g.lineTo(14, 30); g.moveTo(8, 24); g.lineTo(20, 24); g.moveTo(42, 46); g.lineTo(42, 56); g.moveTo(37, 51); g.lineTo(47, 51); }, '#ffffff', 2.5);
  },
  bolt(g) {
    glyph(g, (g) => { g.moveTo(38, 4); g.lineTo(16, 34); g.lineTo(30, 34); g.lineTo(22, 60); g.lineTo(48, 26); g.lineTo(34, 26); g.closePath(); }, '#fff6b0');
  },
  orb(g) {
    glyph(g, (g) => g.arc(32, 32, 17, 0, Math.PI * 2), '#e8d8ff');
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(26, 26, 5, 0, Math.PI * 2); g.fill();
    stroke(g, (g) => { g.ellipse(32, 32, 26, 9, -0.5, 0, Math.PI * 2); }, '#ffd27a', 2.5);
  },
  eye(g) {
    glyph(g, (g) => { g.moveTo(6, 32); g.quadraticCurveTo(32, 8, 58, 32); g.quadraticCurveTo(32, 56, 6, 32); }, '#ffffff');
    glyph(g, (g) => g.arc(32, 32, 10, 0, Math.PI * 2), '#e8c050', 3);
    g.fillStyle = LINE; g.beginPath(); g.arc(32, 32, 4.5, 0, Math.PI * 2); g.fill();
  },
  scope(g) {
    stroke(g, (g) => g.arc(32, 32, 19, 0, Math.PI * 2), '#ffffff', 4);
    stroke(g, (g) => { g.moveTo(32, 6); g.lineTo(32, 22); g.moveTo(32, 42); g.lineTo(32, 58); g.moveTo(6, 32); g.lineTo(22, 32); g.moveTo(42, 32); g.lineTo(58, 32); }, '#ffffff', 3);
    glyph(g, (g) => g.arc(32, 32, 4, 0, Math.PI * 2), '#ff5a5a', 3);
  },
  arrow2(g) {
    for (const dy of [-8, 8]) {
      stroke(g, (g) => { g.moveTo(10, 44 + dy); g.lineTo(46, 22 + dy); }, '#f2e6c8', 3.5);
      glyph(g, (g) => { g.moveTo(54, 17 + dy); g.lineTo(42, 19 + dy); g.lineTo(48, 28 + dy); g.closePath(); }, '#ffffff', 3);
      glyph(g, (g) => { g.moveTo(10, 44 + dy); g.lineTo(6, 38 + dy); g.lineTo(15, 41 + dy); g.closePath(); }, '#ff6a5a', 2.5);
    }
  },
  rain(g) {
    for (const [x, y] of [[16, 10], [30, 18], [44, 8], [22, 32], [40, 30], [54, 22]]) {
      stroke(g, (g) => { g.moveTo(x, y); g.lineTo(x - 4, y + 16); }, '#f2e6c8', 2.5);
      glyph(g, (g) => { g.moveTo(x - 6, y + 22); g.lineTo(x - 7.5, y + 14); g.lineTo(x - 1.5, y + 16); g.closePath(); }, '#ffffff', 2.5);
    }
    stroke(g, (g) => { g.ellipse(32, 54, 22, 5, 0, 0, Math.PI * 2); }, '#ffd27a', 2.5);
  },
  cross(g) {
    glyph(g, (g) => { g.moveTo(26, 8); g.lineTo(38, 8); g.lineTo(38, 24); g.lineTo(54, 24); g.lineTo(54, 36); g.lineTo(38, 36); g.lineTo(38, 56); g.lineTo(26, 56); g.lineTo(26, 36); g.lineTo(10, 36); g.lineTo(10, 24); g.lineTo(26, 24); g.closePath(); }, '#f2fff4');
    g.fillStyle = 'rgba(122,255,154,0.6)'; g.beginPath(); g.arc(32, 30, 5, 0, Math.PI * 2); g.fill();
  },
  star(g) {
    glyph(g, (g) => star(g, 32, 33, 26, 11), '#fff6c8');
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(27, 26, 3.5, 0, Math.PI * 2); g.fill();
  },
  wing(g) {
    glyph(g, (g) => { g.moveTo(14, 48); g.bezierCurveTo(8, 26, 30, 8, 56, 10); g.bezierCurveTo(48, 18, 50, 22, 44, 26); g.bezierCurveTo(50, 28, 48, 34, 40, 36); g.bezierCurveTo(44, 40, 38, 44, 30, 44); g.closePath(); }, '#f2fffa');
    stroke(g, (g) => { g.moveTo(20, 42); g.quadraticCurveTo(28, 26, 48, 14); g.moveTo(24, 44); g.quadraticCurveTo(32, 34, 42, 28); }, '#9ae8c8', 2);
  },
  sun(g) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      stroke(g, (g) => { g.moveTo(32 + Math.cos(a) * 16, 32 + Math.sin(a) * 16); g.lineTo(32 + Math.cos(a) * (i % 2 ? 23 : 27), 32 + Math.sin(a) * (i % 2 ? 23 : 27)); }, '#fff6c8', 3);
    }
    glyph(g, (g) => g.arc(32, 32, 12, 0, Math.PI * 2), '#ffffff', 4);
  },
  cyclone(g) {
    for (let i = 0; i < 3; i++) stroke(g, (g) => { g.ellipse(32, 18 + i * 13, 22 - i * 4, 6, 0, 0.3, Math.PI * 1.9); }, i === 1 ? '#ffd27a' : '#ffffff', 3.5);
    glyph(g, (g) => { g.moveTo(32, 8); g.lineTo(35, 14); g.lineTo(34, 54); g.lineTo(30, 54); g.lineTo(29, 14); g.closePath(); }, '#eef4ff', 3);
  },
  skysword(g) {
    glyph(g, (g) => { g.moveTo(32, 58); g.lineTo(26, 46); g.lineTo(27, 12); g.lineTo(37, 12); g.lineTo(38, 46); g.closePath(); }, '#fff6c8');
    glyph(g, (g) => g.rect(18, 8, 28, 6), '#e8c050', 3.5);
    stroke(g, (g) => { g.moveTo(10, 58); g.lineTo(22, 50); g.moveTo(54, 58); g.lineTo(42, 50); g.moveTo(32, 62); g.lineTo(32, 60); }, '#ffd27a', 3);
  },
  roar(g) {
    glyph(g, (g) => g.arc(22, 32, 9, 0, Math.PI * 2), '#ffffff', 4);
    for (let i = 0; i < 3; i++) stroke(g, (g) => { g.arc(22, 32, 16 + i * 8, -0.7, 0.7); }, i === 1 ? '#ffd27a' : '#ffffff', 3.5);
  },
  steel(g) {
    glyph(g, (g) => { g.moveTo(32, 8); g.lineTo(52, 20); g.lineTo(52, 42); g.lineTo(32, 56); g.lineTo(12, 42); g.lineTo(12, 20); g.closePath(); }, '#e6eef8');
    glyph(g, (g) => { g.moveTo(32, 18); g.lineTo(42, 24); g.lineTo(42, 38); g.lineTo(32, 46); g.lineTo(22, 38); g.lineTo(22, 24); g.closePath(); }, '#9ab8e0', 3);
  },
  fireball(g) {
    glyph(g, (g) => { g.moveTo(8, 50); g.quadraticCurveTo(20, 30, 30, 22); g.lineTo(36, 30); g.quadraticCurveTo(22, 38, 8, 50); }, '#ffb347', 3);
    glyph(g, (g) => g.arc(40, 22, 14, 0, Math.PI * 2), '#ffe08a');
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(36, 18, 5, 0, Math.PI * 2); g.fill();
  },
  meteor(g) {
    for (const [x, y, s] of [[14, 14, 0.6], [44, 10, 0.5]]) stroke(g, (g) => { g.moveTo(x, y); g.lineTo(x + 10 * s, y + 10 * s); }, '#ffd27a', 3);
    stroke(g, (g) => { g.moveTo(10, 8); g.lineTo(30, 30); }, '#ffb347', 6);
    glyph(g, (g) => { g.moveTo(30, 24); g.lineTo(44, 22); g.lineTo(52, 34); g.lineTo(46, 48); g.lineTo(32, 50); g.lineTo(24, 38); g.closePath(); }, '#8a4a2a');
    stroke(g, (g) => { g.moveTo(32, 32); g.lineTo(40, 36); g.lineTo(44, 44); }, '#ffb347', 2.5);
  },
  snow(g) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; stroke(g, (g) => { g.moveTo(32, 32); g.lineTo(32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); g.moveTo(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14); g.lineTo(32 + Math.cos(a + 0.5) * 20, 32 + Math.sin(a + 0.5) * 20); g.moveTo(32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14); g.lineTo(32 + Math.cos(a - 0.5) * 20, 32 + Math.sin(a - 0.5) * 20); }, '#ffffff', 3); }
  },
  hexshield(g) {
    glyph(g, (g) => g.arc(32, 32, 22, 0, Math.PI * 2), 'rgba(230,220,255,0.55)');
    for (const [x, y] of [[32, 22], [24, 36], [40, 36]]) glyph(g, (g) => { for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7) : g.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } }, '#ffffff', 3);
  },
  gale(g) {
    stroke(g, (g) => { g.moveTo(8, 50); g.lineTo(50, 14); }, '#f2e6c8', 3.5);
    glyph(g, (g) => { g.moveTo(56, 8); g.lineTo(44, 12); g.lineTo(52, 20); g.closePath(); }, '#ffffff', 3);
    for (let i = 0; i < 3; i++) stroke(g, (g) => { g.ellipse(22 + i * 10, 40 - i * 9, 9, 4, -0.7, 0, Math.PI * 1.6); }, '#9affc0', 2.5);
  },
  phoenix(g) {
    glyph(g, (g) => { g.moveTo(32, 18); g.bezierCurveTo(20, 4, 6, 14, 4, 26); g.bezierCurveTo(14, 22, 22, 26, 28, 32); g.lineTo(26, 54); g.lineTo(32, 46); g.lineTo(38, 54); g.lineTo(36, 32); g.bezierCurveTo(42, 26, 50, 22, 60, 26); g.bezierCurveTo(58, 14, 44, 4, 32, 18); }, '#ffd27a');
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(32, 22, 4, 0, Math.PI * 2); g.fill();
  },
  trap(g) {
    glyph(g, (g) => g.ellipse(32, 42, 22, 9, 0, 0, Math.PI * 2), '#9ab8e0');
    for (let i = 0; i < 5; i++) { const x = 16 + i * 8; glyph(g, (g) => { g.moveTo(x - 4, 40); g.lineTo(x, 14 + (i % 2) * 8); g.lineTo(x + 4, 40); g.closePath(); }, '#e8fbff', 2.5); }
  },
  sanctum(g) {
    stroke(g, (g) => g.ellipse(32, 44, 24, 10, 0, 0, Math.PI * 2), '#fff3c8', 3);
    for (const x of [12, 32, 52]) stroke(g, (g) => { g.moveTo(x, x === 32 ? 48 : 44); g.lineTo(x, 12); }, '#ffffff', 3);
    glyph(g, (g) => { g.rect(28, 14, 8, 22); g.rect(22, 20, 20, 7); }, '#ffe08a', 3);
  },
  judgment(g) {
    glyph(g, (g) => { g.rect(27, 4, 10, 46); g.rect(14, 14, 36, 9); }, '#fff6c8');
    stroke(g, (g) => { g.ellipse(32, 54, 22, 6, 0, 0, Math.PI * 2); }, '#ffd27a', 3);
    for (const x of [10, 54]) stroke(g, (g) => { g.moveTo(x, 50); g.lineTo(x + (x < 32 ? 8 : -8), 40); }, '#ffffff', 2.5);
  },
};

/* ---------- v0.17: ไอคอนแบบภาพพิกเซล 32×32 (ขยาย 2 เท่าแบบ nearest) ---------- */
const hexRGB = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
function pixelBadge(color) {
  const N = 32, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  const col = (k) => hexRGB(shadeHex(color, k));
  const ink = hexRGB(shadeHex(color, -0.78)), hi = col(0.45), lt = col(0.14), mid = col(0), dk = col(-0.2), sh = col(-0.42);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ex = Math.min(x, N - 1 - x), ey = Math.min(y, N - 1 - y);
    if (ex + ey < 2) continue;                               // มุมตัด
    let c0;
    if (ex === 0 || ey === 0 || ex + ey === 2) c0 = ink;
    else if (y === 1 || x === 1 || (ex + ey === 3 && (x < N / 2 || y < N / 2))) c0 = hi;
    else if (y === N - 2 || x === N - 2) c0 = sh;
    else { const band = y < 11 ? lt : y < 21 ? mid : dk; c0 = band; if ((y === 11 || y === 21) && (x + y) % 2) c0 = y === 11 ? lt : mid; }
    const i = (y * N + x) * 4; d[i] = c0[0]; d[i + 1] = c0[1]; d[i + 2] = c0[2]; d[i + 3] = 255;
  }
  const put = (x, y, c0) => { const i = (y * N + x) * 4; d[i] = c0[0]; d[i + 1] = c0[1]; d[i + 2] = c0[2]; d[i + 3] = 255; };
  put(4, 4, [255, 255, 255]); put(5, 4, hi); put(4, 5, hi);  // ประกายมุมซ้ายบน
  g.putImageData(img, 0, 0);
  return c;
}
function pixelIcon(kind, color) {
  const src = document.createElement('canvas'); src.width = src.height = S;
  (DRAW[kind] || DRAW.star)(src.getContext('2d'));
  const gl = pixelizeCanvas(src, 32, 32, { alpha: 1 });
  const b = pixelBadge(color), g = b.getContext('2d');
  // เงาตกกระทบ 1 พิกเซล แล้ววางสัญลักษณ์ทับ
  const shd = document.createElement('canvas'); shd.width = shd.height = 32;
  const sg = shd.getContext('2d'); sg.drawImage(gl, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(20,10,30,0.55)'; sg.fillRect(0, 0, 32, 32);
  g.drawImage(shd, 1, 1); g.drawImage(gl, 0, 0);
  const out = document.createElement('canvas'); out.width = out.height = S;
  const og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(b, 0, 0, S, S);
  return out;
}

export function skillIconCanvas(id) {
  const key = (PIXEL.on ? 'px:' : '') + id;
  if (cache.has(key)) return cache.get(key);
  const sk = SKILLS[id];
  const [kind, color] = (sk && sk.icon) || ['star', '#888888'];
  let c;
  if (PIXEL.on) c = pixelIcon(kind, color);
  else {
    c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    badge(g, color);
    (DRAW[kind] || DRAW.star)(g);
  }
  cache.set(key, c);
  return c;
}

const urlCache = new Map();
export function skillIconURL(id) {
  const key = (PIXEL.on ? 'px:' : '') + id;
  if (!urlCache.has(key)) urlCache.set(key, skillIconCanvas(id).toDataURL());
  return urlCache.get(key);
}

// ไอคอนจากสเปก [ชนิด, สี] โดยตรง (ใช้ในหน้าพรีวิวสกิลที่ยังไม่ลงเกม)
export function iconFromSpec(key, kind, color) {
  const k = (PIXEL.on ? 'px:' : '') + 'spec:' + key;
  if (urlCache.has(k)) return urlCache.get(k);
  let c;
  if (PIXEL.on) c = pixelIcon(kind, color);
  else {
    c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d');
    badge(g, color);
    (DRAW[kind] || DRAW.star)(g);
  }
  urlCache.set(k, c.toDataURL());
  return urlCache.get(k);
}
