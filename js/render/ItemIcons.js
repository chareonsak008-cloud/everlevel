import { equipmentPortrait } from './EquipmentPortraits.js';
import { drawMonsterCard, onPortraitReady } from './CardPortraits.js';
// ไอคอนไอเทม วาดด้วย Canvas (ใช้ทั้งในหน้าต่าง UI และของที่ตกบนพื้น)
import { ITEMS } from '../data/items.js';
import { shadeHex } from './Textures.js';
import { UTIL_DRAW } from './UtilityIcons.js';   // v0.13: ไอคอนไอเทมใช้งานชุดใหม่

const S = 64;
const LINE = '#2a1d2c';
const cache = new Map();

function path(g, fn, fill, lw = 3) {
  g.beginPath(); fn(g);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = LINE; g.lineWidth = lw; g.stroke();
  g.fillStyle = fill; g.fill();
}
const grad = (g, x0, y0, x1, y1, a, b) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
const shine = (g, x, y, rx, ry, a = 0.7) => { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); g.fill(); };

const DRAW = {
  potion(g, c) {
    path(g, (g) => g.rect(26, 10, 12, 12), '#e8e2d8');
    path(g, (g) => g.rect(25, 6, 14, 7), '#8a5a32');
    path(g, (g) => g.arc(32, 38, 18, 0, Math.PI * 2), '#e6f2f8');
    g.save(); g.beginPath(); g.arc(32, 38, 16.5, 0, Math.PI * 2); g.clip();
    g.fillStyle = grad(g, 0, 26, 0, 56, shadeHex(c, 0.25), shadeHex(c, -0.25)); g.fillRect(10, 30, 44, 30);
    g.fillStyle = shadeHex(c, 0.4); g.fillRect(10, 30, 44, 3);
    g.restore();
    shine(g, 25, 31, 6, 3.5);
  },
  leaf(g, c) {
    path(g, (g) => { g.moveTo(14, 52); g.bezierCurveTo(10, 24, 30, 10, 52, 10); g.bezierCurveTo(52, 34, 38, 52, 14, 52); }, grad(g, 14, 52, 52, 10, shadeHex(c, -0.2), shadeHex(c, 0.25)));
    g.strokeStyle = shadeHex(c, -0.45); g.lineWidth = 2; g.beginPath(); g.moveTo(16, 50); g.quadraticCurveTo(30, 34, 48, 14); g.stroke();
    for (const t of [0.35, 0.55, 0.75]) { g.beginPath(); const x = 16 + 32 * t, y = 50 - 36 * t; g.moveTo(x, y); g.lineTo(x + 8, y + 4); g.moveTo(x, y); g.lineTo(x - 3, y - 8); g.stroke(); }
  },
  mushroom(g, c) {
    path(g, (g) => g.rect(26, 32, 12, 20), '#f1e6cc');
    path(g, (g) => { g.moveTo(8, 36); g.quadraticCurveTo(10, 10, 32, 10); g.quadraticCurveTo(54, 10, 56, 36); g.closePath(); }, grad(g, 0, 10, 0, 36, shadeHex(c, 0.3), shadeHex(c, -0.2)));
    for (const [x, y, r] of [[22, 22, 4], [36, 18, 3.5], [44, 28, 3], [28, 31, 2.5]]) { g.fillStyle = '#e8fbff'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  },
  honey(g, c) {
    const hex = (x, y, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); };
    for (const [x, y] of [[22, 24], [38, 24], [30, 38], [46, 38], [14, 38]]) {
      hex(x, y, 9); g.fillStyle = grad(g, x, y - 9, x, y + 9, shadeHex(c, 0.35), shadeHex(c, -0.2)); g.fill(); g.strokeStyle = LINE; g.lineWidth = 2.5; g.stroke();
    }
    path(g, (g) => { g.moveTo(28, 46); g.quadraticCurveTo(30, 58, 33, 46); }, shadeHex(c, 0.1), 2);
    shine(g, 20, 21, 3, 2);
  },
  blob(g, c) {
    path(g, (g) => { g.moveTo(32, 8); g.bezierCurveTo(46, 24, 54, 34, 50, 44); g.bezierCurveTo(46, 56, 18, 56, 14, 44); g.bezierCurveTo(10, 34, 18, 24, 32, 8); }, grad(g, 0, 8, 0, 56, shadeHex(c, 0.35), shadeHex(c, -0.2)));
    shine(g, 24, 34, 5, 7, 0.75);
  },
  spore(g, c) {
    path(g, (g) => g.ellipse(32, 44, 20, 10, 0, 0, Math.PI * 2), shadeHex(c, -0.45));
    for (const [x, y, r] of [[24, 36, 7], [36, 32, 8], [44, 40, 6], [30, 44, 6], [18, 44, 5]]) {
      path(g, (g) => g.arc(x, y, r, 0, Math.PI * 2), grad(g, x, y - r, x, y + r, shadeHex(c, 0.45), c), 2);
    }
    for (const [x, y] of [[14, 20], [26, 14], [46, 18], [52, 28], [36, 10]]) { g.fillStyle = shadeHex(c, 0.6); g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  },
  spike(g, c) {
    path(g, (g) => { g.moveTo(54, 10); g.lineTo(22, 34); g.lineTo(30, 42); g.closePath(); }, grad(g, 54, 10, 22, 40, '#ffffff', c));
    path(g, (g) => g.ellipse(22, 42, 10, 8, -0.6, 0, Math.PI * 2), '#3a2a1a');
    g.strokeStyle = '#f2b632'; g.lineWidth = 3; g.beginPath(); g.ellipse(22, 42, 6, 4.5, -0.6, 0, Math.PI * 2); g.stroke();
  },
  knife(g, c) {
    path(g, (g) => { g.moveTo(50, 10); g.lineTo(54, 14); g.lineTo(30, 38); g.lineTo(26, 34); g.closePath(); }, grad(g, 50, 10, 28, 36, '#ffffff', c));
    path(g, (g) => { g.moveTo(20, 32); g.lineTo(32, 44); g.lineTo(28, 48); g.lineTo(16, 36); g.closePath(); }, '#d8ad4a');
    path(g, (g) => { g.moveTo(24, 42); g.lineTo(12, 54); g.lineTo(8, 50); g.lineTo(20, 38); g.closePath(); }, '#5e3f27');
  },
  sword(g, c) {
    path(g, (g) => { g.moveTo(54, 6); g.lineTo(58, 10); g.lineTo(26, 42); g.lineTo(22, 38); g.closePath(); }, grad(g, 56, 8, 24, 40, '#ffffff', c));
    g.strokeStyle = shadeHex(c, 0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(55, 9); g.lineTo(25, 39); g.stroke();
    path(g, (g) => { g.moveTo(14, 32); g.lineTo(32, 50); g.lineTo(28, 54); g.lineTo(10, 36); g.closePath(); }, '#3a3442');
    path(g, (g) => { g.moveTo(22, 44); g.lineTo(12, 54); g.lineTo(8, 50); g.lineTo(18, 40); g.closePath(); }, '#3a2418');
    path(g, (g) => g.arc(9, 55, 4, 0, Math.PI * 2), '#d8ad4a', 2);
  },
  staff(g, c) {
    path(g, (g) => { g.moveTo(44, 18); g.lineTo(48, 22); g.lineTo(14, 58); g.lineTo(10, 54); g.closePath(); }, grad(g, 46, 20, 12, 56, '#a87a4a', '#5e3f27'));
    path(g, (g) => { g.moveTo(40, 14); g.quadraticCurveTo(46, 4, 54, 10); g.quadraticCurveTo(60, 18, 50, 24); }, 'rgba(0,0,0,0)', 3);
    g.strokeStyle = '#d8ad4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 14); g.quadraticCurveTo(46, 4, 54, 10); g.quadraticCurveTo(60, 18, 50, 24); g.stroke();
    path(g, (g) => g.arc(48, 15, 7, 0, Math.PI * 2), grad(g, 42, 8, 54, 22, '#ffffff', c), 2.5);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(48, 15, 12, 0, Math.PI * 2); g.fill();
  },
  bow(g, c) {
    g.lineCap = 'round';
    g.strokeStyle = LINE; g.lineWidth = 8; g.beginPath(); g.moveTo(14, 8); g.quadraticCurveTo(58, 12, 56, 52); g.stroke();
    g.strokeStyle = c; g.lineWidth = 5; g.beginPath(); g.moveTo(14, 8); g.quadraticCurveTo(58, 12, 56, 52); g.stroke();
    g.strokeStyle = '#f2ece0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 8); g.lineTo(56, 52); g.stroke();
    path(g, (g) => { g.moveTo(8, 54); g.lineTo(46, 18); }, 'rgba(0,0,0,0)', 3);
    g.strokeStyle = '#8a5a32'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(10, 52); g.lineTo(46, 18); g.stroke();
    path(g, (g) => { g.moveTo(50, 14); g.lineTo(42, 16); g.lineTo(48, 22); g.closePath(); }, '#dfe4ea', 2);
    path(g, (g) => { g.moveTo(10, 52); g.lineTo(6, 48); g.lineTo(14, 50); g.closePath(); }, '#d8433a', 2);
    path(g, (g) => g.rect(31, 24, 6, 10), '#5e3f27', 2);
  },
  mace(g, c) {
    path(g, (g) => { g.moveTo(36, 26); g.lineTo(40, 30); g.lineTo(14, 56); g.lineTo(10, 52); g.closePath(); }, grad(g, 38, 28, 12, 54, '#9a6a3e', '#5e3f27'));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; path(g, (g) => { g.moveTo(44 + Math.cos(a) * 9, 20 + Math.sin(a) * 9); g.lineTo(44 + Math.cos(a + 0.35) * 15, 20 + Math.sin(a + 0.35) * 15); g.lineTo(44 + Math.cos(a + 0.7) * 9, 20 + Math.sin(a + 0.7) * 9); g.closePath(); }, shadeHex(c, -0.1), 2); }
    path(g, (g) => g.arc(44, 20, 10, 0, Math.PI * 2), grad(g, 36, 12, 52, 28, shadeHex(c, 0.4), shadeHex(c, -0.2)), 2.5);
    shine(g, 40, 16, 3, 2);
    path(g, (g) => g.arc(12, 54, 4, 0, Math.PI * 2), '#d8ad4a', 2);
  },
  fang(g, c) {
    path(g, (g) => { g.moveTo(20, 10); g.quadraticCurveTo(44, 10, 46, 24); g.quadraticCurveTo(48, 44, 30, 58); g.quadraticCurveTo(36, 40, 30, 28); g.quadraticCurveTo(26, 20, 20, 10); }, grad(g, 20, 10, 40, 56, '#ffffff', shadeHex(c, -0.25)));
    shine(g, 34, 20, 4, 2);
    path(g, (g) => { g.moveTo(14, 8); g.quadraticCurveTo(22, 4, 28, 10); g.lineTo(22, 16); g.closePath(); }, '#8a5a32', 2);
  },
  bark(g, c) {
    path(g, (g) => { g.moveTo(10, 22); g.lineTo(40, 10); g.lineTo(56, 22); g.lineTo(54, 44); g.lineTo(24, 56); g.lineTo(8, 44); g.closePath(); }, grad(g, 10, 10, 54, 56, shadeHex(c, 0.25), shadeHex(c, -0.3)));
    g.strokeStyle = shadeHex(c, -0.45); g.lineWidth = 2;
    for (const [x0, y0, x1, y1] of [[16, 26, 20, 48], [26, 20, 30, 50], [38, 16, 42, 46], [48, 22, 50, 40]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 3, (y0 + y1) / 2, x1, y1); g.stroke(); }
    g.fillStyle = '#6ac04a'; for (const [x, y] of [[20, 20], [44, 14], [50, 38]]) { g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); }
  },
  lantern(g, c) {
    path(g, (g) => g.arc(32, 10, 5, Math.PI, 0), 'rgba(0,0,0,0)', 3);
    path(g, (g) => g.rect(22, 14, 20, 6), '#8a6a3a', 2.5);
    path(g, (g) => { g.moveTo(20, 20); g.lineTo(44, 20); g.lineTo(46, 46); g.lineTo(18, 46); g.closePath(); }, 'rgba(230,250,240,0.9)', 3);
    g.fillStyle = 'rgba(255,255,255,0.0)';
    const gr = g.createRadialGradient(32, 34, 2, 32, 34, 14); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(32, 34, 13, 0, Math.PI * 2); g.fill();
    path(g, (g) => g.rect(18, 46, 28, 6), '#8a6a3a', 2.5);
  },
  crown(g, c) {
    path(g, (g) => { g.moveTo(8, 44); g.lineTo(12, 18); g.lineTo(22, 32); g.lineTo(32, 10); g.lineTo(42, 32); g.lineTo(52, 18); g.lineTo(56, 44); g.closePath(); }, grad(g, 0, 10, 0, 44, '#a8805a', '#5e3f27'));
    path(g, (g) => g.rect(8, 42, 48, 9), '#6a4a2a', 2.5);
    for (const [x, y] of [[12, 18], [32, 10], [52, 18]]) path(g, (g) => { g.ellipse(x, y, 6, 4, -0.6, 0, Math.PI * 2); }, grad(g, x, y - 4, x, y + 4, shadeHex(c, 0.3), shadeHex(c, -0.25)), 2);
    path(g, (g) => g.arc(32, 46, 4, 0, Math.PI * 2), '#9affc8', 2);
  },
  shirt(g, c) {
    path(g, (g) => { g.moveTo(22, 10); g.lineTo(10, 18); g.lineTo(6, 32); g.lineTo(16, 34); g.lineTo(18, 54); g.lineTo(46, 54); g.lineTo(48, 34); g.lineTo(58, 32); g.lineTo(54, 18); g.lineTo(42, 10); g.quadraticCurveTo(32, 18, 22, 10); }, grad(g, 0, 10, 0, 54, shadeHex(c, 0.2), shadeHex(c, -0.2)));
    g.strokeStyle = shadeHex(c, 0.5); g.lineWidth = 3; g.beginPath(); g.moveTo(22, 11); g.quadraticCurveTo(32, 19, 42, 11); g.stroke();
    g.fillStyle = shadeHex(c, -0.35); g.fillRect(18, 40, 28, 4);
  },
  bandana(g, c) {
    path(g, (g) => { g.moveTo(8, 22); g.quadraticCurveTo(32, 12, 56, 22); g.lineTo(40, 50); g.lineTo(32, 44); g.lineTo(24, 50); g.closePath(); }, grad(g, 0, 14, 0, 50, shadeHex(c, 0.2), shadeHex(c, -0.2)));
    for (const [x, y] of [[20, 26], [32, 30], [44, 26], [28, 38], [38, 38]]) { g.fillStyle = '#fff4e8'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); }
  },
  flower(g, c) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      path(g, (g) => g.ellipse(32 + Math.cos(a) * 13, 30 + Math.sin(a) * 13, 11, 8, a, 0, Math.PI * 2), grad(g, 0, 10, 0, 50, shadeHex(c, 0.3), shadeHex(c, -0.1)), 2.5);
    }
    path(g, (g) => g.arc(32, 30, 7, 0, Math.PI * 2), '#ffd34d', 2.5);
    path(g, (g) => { g.moveTo(32, 44); g.lineTo(30, 58); }, '#4f8a36', 3);
  },
  shield(g, c) {
    path(g, (g) => g.arc(32, 32, 24, 0, Math.PI * 2), '#8a8f9a', 3);
    path(g, (g) => g.arc(32, 32, 19, 0, Math.PI * 2), grad(g, 0, 12, 0, 52, shadeHex(c, 0.25), shadeHex(c, -0.25)), 2);
    g.fillStyle = shadeHex(c, -0.45); g.fillRect(29, 13, 6, 38); g.fillRect(13, 29, 38, 6);
    path(g, (g) => g.arc(32, 32, 6, 0, Math.PI * 2), '#d8dde4', 2);
  },
  cape(g, c) {
    path(g, (g) => { g.moveTo(22, 8); g.lineTo(42, 8); g.quadraticCurveTo(54, 30, 56, 56); g.quadraticCurveTo(32, 50, 8, 56); g.quadraticCurveTo(10, 30, 22, 8); }, grad(g, 0, 8, 0, 56, shadeHex(c, 0.25), shadeHex(c, -0.25)));
    path(g, (g) => g.arc(32, 12, 5, 0, Math.PI * 2), '#d8ad4a', 2);
    g.strokeStyle = shadeHex(c, -0.4); g.lineWidth = 2; g.beginPath(); g.moveTo(26, 20); g.quadraticCurveTo(22, 40, 20, 52); g.moveTo(38, 20); g.quadraticCurveTo(42, 40, 44, 52); g.stroke();
  },
  boots(g, c) {
    path(g, (g) => { g.moveTo(16, 12); g.lineTo(32, 12); g.lineTo(32, 38); g.lineTo(52, 42); g.quadraticCurveTo(58, 46, 54, 52); g.lineTo(14, 52); g.closePath(); }, grad(g, 0, 12, 0, 52, shadeHex(c, 0.2), shadeHex(c, -0.25)));
    g.fillStyle = shadeHex(c, -0.5); g.fillRect(14, 48, 41, 4);
    g.strokeStyle = shadeHex(c, 0.4); g.lineWidth = 2; for (const y of [20, 28]) { g.beginPath(); g.moveTo(17, y); g.lineTo(31, y); g.stroke(); }
  },
  ring(g, c) {
    g.lineWidth = 9; g.strokeStyle = LINE; g.beginPath(); g.arc(32, 38, 16, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 5.5; g.strokeStyle = '#e8c050'; g.beginPath(); g.arc(32, 38, 16, 0, Math.PI * 2); g.stroke();
    path(g, (g) => { g.moveTo(32, 8); g.lineTo(42, 18); g.lineTo(32, 28); g.lineTo(22, 18); g.closePath(); }, grad(g, 0, 8, 0, 28, shadeHex(c, 0.5), c), 2.5);
    shine(g, 29, 15, 3, 2);
  },
  brooch(g, c) {
    for (const s of [-1, 1]) path(g, (g) => g.ellipse(32 + s * 13, 22, 10, 7, s * 0.5, 0, Math.PI * 2), 'rgba(230,244,255,0.9)', 2);
    path(g, (g) => g.ellipse(32, 36, 13, 17, 0, 0, Math.PI * 2), grad(g, 0, 20, 0, 52, shadeHex(c, 0.35), shadeHex(c, -0.15)));
    g.fillStyle = '#3a2a1a'; g.fillRect(20, 32, 24, 4); g.fillRect(21, 41, 22, 4);
    path(g, (g) => g.arc(32, 18, 6, 0, Math.PI * 2), '#3a2a1a', 2);
  },
  clover(g, c) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = 32 + Math.cos(a) * 11, y = 28 + Math.sin(a) * 11;
      path(g, (g) => g.arc(x, y, 10, 0, Math.PI * 2), grad(g, x, y - 10, x, y + 10, shadeHex(c, 0.35), shadeHex(c, -0.2)), 2.5);
    }
    path(g, (g) => { g.moveTo(32, 30); g.quadraticCurveTo(36, 46, 30, 58); }, '#3a7a2a', 3.5);
    shine(g, 26, 18, 3, 2);
  },
  // v0.20: exact monster portrait, graded frame.
  card(g,c,mob,rarity){drawMonsterCard(g,mob,rarity);},
  // ผลึกตีบวก (v0.10)
  crystal(g, c) {
    path(g, (g) => { g.moveTo(32, 6); g.lineTo(48, 22); g.lineTo(42, 54); g.lineTo(22, 54); g.lineTo(16, 22); g.closePath(); }, grad(g, 16, 6, 48, 54, shadeHex(c, 0.45), shadeHex(c, -0.3)));
    g.strokeStyle = shadeHex(c, -0.45); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(16, 22); g.lineTo(32, 28); g.lineTo(48, 22); g.moveTo(32, 28); g.lineTo(32, 54); g.moveTo(32, 6); g.lineTo(32, 28); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(32, 8); g.lineTo(20, 22); g.lineTo(31, 26); g.closePath(); g.fill();
    shine(g, 24, 34, 2, 6, 0.55);
  },
  // กล่องแฟชั่นสุ่ม (v0.9): c = สีกล่อง, c2 = สีริบบิ้น, tier 1 ไม้ · 2 เงิน · 3 ทองคำ
  giftbox(g, c, c2 = '#ffd27a', tier = 1) {
    const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.28 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    if (tier >= 2) { const gr = g.createRadialGradient(32, 38, 4, 32, 38, 32); gr.addColorStop(0, tier >= 3 ? 'rgba(255,220,120,0.55)' : 'rgba(150,200,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    // ตัวกล่อง
    path(g, (g) => g.rect(12, 30, 40, 26), grad(g, 0, 30, 0, 56, shadeHex(c, 0.05), shadeHex(c, -0.35)));
    if (tier === 1) { g.strokeStyle = shadeHex(c, -0.45); g.lineWidth = 1.5; for (const y of [38, 46]) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); } }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(13.5, 31.5, 37, 3);
    // ฝากล่อง
    path(g, (g) => g.rect(9, 22, 46, 10), grad(g, 0, 22, 0, 32, shadeHex(c, 0.35), shadeHex(c, -0.1)));
    // ริบบิ้นแนวตั้ง
    path(g, (g) => g.rect(28, 22, 8, 34), grad(g, 28, 0, 36, 0, shadeHex(c2, 0.25), shadeHex(c2, -0.2)), 2);
    // โบว์
    path(g, (g) => { g.moveTo(32, 21); g.bezierCurveTo(22, 4, 10, 14, 18, 21); g.closePath(); }, grad(g, 10, 8, 30, 22, shadeHex(c2, 0.3), shadeHex(c2, -0.15)), 2.5);
    path(g, (g) => { g.moveTo(32, 21); g.bezierCurveTo(42, 4, 54, 14, 46, 21); g.closePath(); }, grad(g, 54, 8, 34, 22, shadeHex(c2, 0.3), shadeHex(c2, -0.15)), 2.5);
    path(g, (g) => g.arc(32, 21, 4.5, 0, Math.PI * 2), shadeHex(c2, 0.1), 2);
    shine(g, 17, 25, 5, 1.6, 0.55);
    if (tier >= 2) shine(g, 16, 36, 2.5, 6, 0.3);
    if (tier >= 3) { path(g, (g) => { g.moveTo(32, 38); g.lineTo(37, 44); g.lineTo(32, 50); g.lineTo(27, 44); g.closePath(); }, '#ff4a6a', 2); shine(g, 30.5, 42, 1.6, 1.2, 0.9); }
    if (tier >= 2) { star(52, 12, 6, '#ffffff'); star(8, 44, 4, tier >= 3 ? '#fff0b0' : '#d8ecff'); }
    if (tier >= 3) { star(56, 40, 4.5, '#ffe9a0'); star(10, 10, 3.5, '#ffffff'); }
  },
};

Object.assign(DRAW, UTIL_DRAW);

export function iconCanvas(id, size = S) {
  if (typeof id === 'string' && id.includes('*')) id = id.split('*')[0];   // อุปกรณ์ตีบวก/ใส่การ์ดใช้ไอคอนเดียวกับของเดิม
  const key = size === S ? id : id + '@' + size;
  if (cache.has(key)) return cache.get(key);
  const it = ITEMS[id];
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const g = c.getContext('2d');
  if (size !== S) g.scale(size / S, size / S);
  const [kind, color, color2] = (it && it.icon) || ['blob', '#cccccc'];
  const portrait=it?.type==='equip' && equipmentPortrait(id);
  if(portrait){g.imageSmoothingEnabled=false;g.drawImage(portrait,0,0,S,S);}
  else if(kind==='card') DRAW.card(g,color,it?.monster,it?.rarity);
  else (DRAW[kind] || DRAW.blob)(g, color, color2, it && it.tier);
  cache.set(key, c);
  return c;
}

const urlCache = new Map();
export function iconURL(id, size = S) {
  if (typeof id === 'string' && id.includes('*')) id = id.split('*')[0];
  const key = id + '@' + size;
  if (!urlCache.has(key)) urlCache.set(key, iconCanvas(id, size).toDataURL());
  return urlCache.get(key);
}

onPortraitReady(() => { cache.clear(); urlCache.clear(); });
