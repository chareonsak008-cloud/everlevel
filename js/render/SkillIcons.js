// ไอคอนสกิล วาดด้วย Canvas: เหรียญสีประจำสกิล + สัญลักษณ์สีขาวตัดเส้นเข้ม
import { SKILLS } from '../data/skills.js?v=0.93.0-p4.4';
import { shadeHex } from './Textures.js?v=0.93.0-p4.4';
import { PIXEL } from './PixelSprites.js?v=0.93.0-p4.4';
import { pixelizeCanvas } from './PixelArt.js?v=0.93.0-p4.4';

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
  // ---------- v0.64 สายดาบชุดใหม่ ----------
  tripleslash(g) {   // รอยฟันโค้ง 3 เส้นไขว้
    for (const [y, w] of [[18, 3], [32, 4], [46, 5]]) stroke(g, (g) => { g.moveTo(10, y + 8); g.quadraticCurveTo(32, y - 10, 54, y + 2); }, '#fff2d8', w);
    stroke(g, (g) => { g.moveTo(14, 56); g.lineTo(50, 10); }, '#ffb060', 3);
  },
  flamewave(g) {   // คลื่นเพลิงจันทร์เสี้ยวพุ่งไปขวา
    glyph(g, (g) => { g.moveTo(30, 8); g.quadraticCurveTo(60, 32, 30, 56); g.quadraticCurveTo(46, 32, 30, 8); g.closePath(); }, '#ffe0b0');
    stroke(g, (g) => { g.moveTo(6, 24); g.lineTo(24, 24); g.moveTo(4, 32); g.lineTo(28, 32); g.moveTo(6, 40); g.lineTo(24, 40); }, '#ff8a3a', 3);
  },
  blazedash(g) {   // ดาบพุ่ง + เส้นความเร็วเพลิง
    stroke(g, (g) => { g.moveTo(6, 22); g.lineTo(26, 22); g.moveTo(4, 32); g.lineTo(22, 32); g.moveTo(6, 42); g.lineTo(26, 42); }, '#ff8a3a', 3);
    glyph(g, (g) => { g.moveTo(58, 32); g.lineTo(44, 27); g.lineTo(26, 28); g.lineTo(26, 36); g.lineTo(44, 37); g.closePath(); }, '#eef4ff');
    glyph(g, (g) => g.rect(21, 23, 5, 18), '#e8c050', 4);
    glyph(g, (g) => g.rect(13, 29, 8, 6), '#7a5232', 4);
  },
  firewhirl(g) {   // วงไฟหมุนรอบดาบ
    stroke(g, (g) => g.ellipse(32, 40, 24, 10, 0, 0, Math.PI * 2), '#ff8a3a', 4);
    stroke(g, (g) => g.ellipse(32, 40, 15, 6, 0, 0.3, Math.PI * 1.7), '#ffd08a', 3);
    glyph(g, (g) => { g.moveTo(32, 6); g.lineTo(36, 12); g.lineTo(35, 38); g.lineTo(29, 38); g.lineTo(28, 12); g.closePath(); }, '#eef4ff');
    glyph(g, (g) => g.rect(24, 38, 16, 4), '#e8c050', 3);
  },
  crimsonsword(g) {   // ดาบยักษ์ปักพื้น + พื้นแตก
    stroke(g, (g) => { g.moveTo(32, 56); g.lineTo(18, 60); g.moveTo(32, 56); g.lineTo(48, 60); g.moveTo(32, 56); g.lineTo(10, 54); g.moveTo(32, 56); g.lineTo(54, 53); }, '#ff5a2a', 3);
    glyph(g, (g) => { g.moveTo(32, 58); g.lineTo(26, 48); g.lineTo(26, 20); g.lineTo(38, 20); g.lineTo(38, 48); g.closePath(); }, '#ffd8b8');
    glyph(g, (g) => g.rect(16, 15, 32, 6), '#e8a030', 4);
    glyph(g, (g) => g.rect(29, 5, 6, 10), '#7a3a22', 4);
  },
  thundercut(g) {   // รอยฟันโค้ง + สายฟ้า
    stroke(g, (g) => { g.moveTo(8, 48); g.quadraticCurveTo(26, 6, 56, 14); }, '#eaf6ff', 5);
    glyph(g, (g) => { g.moveTo(40, 22); g.lineTo(30, 38); g.lineTo(37, 38); g.lineTo(28, 56); g.lineTo(46, 34); g.lineTo(39, 34); g.lineTo(46, 22); g.closePath(); }, '#ffe24a', 3);
  },
  swordqi(g) {   // คลื่นจันทร์เสี้ยว 3 ลูกเรียงกัน
    for (const [x, k] of [[16, 0.7], [30, 0.85], [44, 1]]) glyph(g, (g) => { g.moveTo(x, 32 - 20 * k); g.quadraticCurveTo(x + 18 * k, 32, x, 32 + 20 * k); g.quadraticCurveTo(x + 9 * k, 32, x, 32 - 20 * k); g.closePath(); }, '#d8f0ff', 3);
  },
  flashstep(g) {   // เงาร่างจางหลายร่าง + สายฟ้า
    for (const [x, a] of [[14, '#5a7aa0'], [26, '#8ab0d8']]) glyph(g, (g) => { g.arc(x, 20, 5, 0, Math.PI * 2); g.moveTo(x - 6, 52); g.lineTo(x - 4, 28); g.lineTo(x + 4, 28); g.lineTo(x + 6, 52); g.closePath(); }, a, 3);
    glyph(g, (g) => { g.arc(42, 20, 6, 0, Math.PI * 2); g.moveTo(35, 54); g.lineTo(37, 28); g.lineTo(47, 28); g.lineTo(49, 54); g.closePath(); }, '#eef6ff');
    glyph(g, (g) => { g.moveTo(56, 10); g.lineTo(48, 24); g.lineTo(54, 24); g.lineTo(46, 40); g.lineTo(60, 20); g.lineTo(54, 20); g.closePath(); }, '#ffe24a', 2);
  },
  thousandblades(g) {   // ดาบหลายเล่มชี้ลง
    for (const [x, y] of [[14, 10], [26, 4], [38, 4], [50, 10], [20, 26], [44, 26], [32, 22]]) glyph(g, (g) => { g.moveTo(x, y + 26); g.lineTo(x - 3, y + 18); g.lineTo(x - 3, y + 4); g.lineTo(x + 3, y + 4); g.lineTo(x + 3, y + 18); g.closePath(); g.rect(x - 6, y + 2, 12, 3); }, '#e6f2ff', 3);
  },
  heavensplit(g) {   // รอยฟันเฉียงผ่าวงกลมฟ้า
    glyph(g, (g) => g.arc(32, 32, 22, 0, Math.PI * 2), '#203a6a', 4);
    stroke(g, (g) => { g.moveTo(14, 20); g.lineTo(22, 30); g.moveTo(44, 46); g.lineTo(52, 40); g.moveTo(40, 14); g.lineTo(46, 22); }, '#7ab4ff', 2);
    stroke(g, (g) => { g.moveTo(6, 58); g.lineTo(58, 6); }, '#ffffff', 6);
    stroke(g, (g) => { g.moveTo(10, 54); g.lineTo(54, 10); }, '#9ad8ff', 2);
  },
  rays(g) {   // ลำแสง 3 เส้นฟาดลงพื้น
    for (const [x, w] of [[16, 8], [32, 12], [48, 8]]) glyph(g, (g) => { g.moveTo(x - w / 2, 4); g.lineTo(x + w / 2, 4); g.lineTo(x + w / 3, 46); g.lineTo(x - w / 3, 46); g.closePath(); }, '#fff2b8', 3);
    stroke(g, (g) => g.ellipse(32, 50, 26, 7, 0, 0, Math.PI * 2), '#ffd86b', 3);
    glyph(g, (g) => star(g, 32, 48, 7, 2.5, 4, 0), '#ffffff', 2);
  },
  thornbloom(g) {   // ดอกไม้กลาง + เถาหนามพุ่งขึ้น
    for (const [x, h] of [[12, 30], [52, 30], [22, 38], [42, 38]]) glyph(g, (g) => { g.moveTo(x - 4, 58); g.lineTo(x, 58 - h); g.lineTo(x + 4, 58); g.closePath(); }, '#4ac06a', 3);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; glyph(g, (g) => g.ellipse(32 + Math.cos(a) * 9, 26 + Math.sin(a) * 9, 7, 5, a, 0, Math.PI * 2), '#ff9ad0', 3); }
    glyph(g, (g) => g.arc(32, 26, 5, 0, Math.PI * 2), '#ffe08a', 3);
  },
  // ---------- v0.66 สายธนูชุดใหม่ ----------
  starshot(g) {   // ศรทองพุ่งเฉียงขึ้น ปลายศรเป็นดาว
    stroke(g, (g) => { g.moveTo(10, 54); g.lineTo(40, 24); }, '#fff2c8', 4);
    stroke(g, (g) => { g.moveTo(10, 54); g.lineTo(6, 46); g.moveTo(10, 54); g.lineTo(18, 58); g.moveTo(15, 49); g.lineTo(11, 41); g.moveTo(15, 49); g.lineTo(23, 53); }, '#ffd06a', 3);
    glyph(g, (g) => star(g, 44, 20, 13, 4, 4, 0), '#fffbe6', 4);
  },
  comet(g) {   // ดาวหางหัวโต หางยาวพาดจอ
    for (const [o, w, c] of [[0, 5, '#ffe8aa'], [7, 3, '#ffc04a'], [-7, 3, '#ffc04a']]) stroke(g, (g) => { g.moveTo(6, 52 + o * 0.6); g.lineTo(38, 26 + o * 0.3); }, c, w);
    glyph(g, (g) => g.arc(44, 22, 10, 0, Math.PI * 2), '#fffbe6');
    glyph(g, (g) => star(g, 44, 22, 6, 2.2, 4, Math.PI / 4), '#ffd06a', 2);
  },
  starburst(g) {   // ดาวกลางฟ้า ศรแตกตกลงเป็นพัด
    glyph(g, (g) => star(g, 32, 16, 11, 4, 4, 0), '#fffbe6', 4);
    for (const x of [12, 22, 32, 42, 52]) stroke(g, (g) => { g.moveTo(32 + (x - 32) * 0.3, 26); g.lineTo(x, 54); }, '#ffd06a', 3);
    for (const x of [12, 22, 32, 42, 52]) glyph(g, (g) => { g.moveTo(x, 58); g.lineTo(x - 3, 52); g.lineTo(x + 3, 52); g.closePath(); }, '#fff2c8', 2);
  },
  constellation(g) {   // จุดดาว 5 ดวงต่อเส้น + วงล็อกเป้า
    const P = [[12, 44], [24, 20], [38, 30], [50, 14], [52, 46]];
    stroke(g, (g) => { P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); }, '#bcd2ff', 2);
    stroke(g, (g) => g.arc(52, 46, 8, 0, Math.PI * 2), '#ffd06a', 2);
    for (const [x, y] of P) glyph(g, (g) => star(g, x, y, 6, 2, 4, 0), '#ffffff', 2);
  },
  starfall(g) {   // วงกลุ่มดาวบนฟ้า + ศรใหญ่ดิ่งลง
    stroke(g, (g) => g.ellipse(32, 14, 26, 8, 0, 0, Math.PI * 2), '#ffd06a', 3);
    for (const x of [14, 26, 40, 52]) stroke(g, (g) => { g.moveTo(x - 4, 20); g.lineTo(x, 44); }, '#fff2c8', 2);
    glyph(g, (g) => { g.moveTo(32, 60); g.lineTo(24, 44); g.lineTo(29, 44); g.lineTo(29, 18); g.lineTo(35, 18); g.lineTo(35, 44); g.lineTo(40, 44); g.closePath(); }, '#fffbe6');
  },
  twinshadow(g) {   // ศร 2 ดอกพันเกลียว
    stroke(g, (g) => { g.moveTo(8, 50); g.bezierCurveTo(22, 20, 32, 56, 52, 18); }, '#e2b8ff', 3);
    stroke(g, (g) => { g.moveTo(8, 50); g.bezierCurveTo(26, 54, 30, 18, 52, 18); }, '#a070ff', 3);
    glyph(g, (g) => { g.moveTo(58, 12); g.lineTo(46, 16); g.lineTo(52, 22); g.closePath(); }, '#ffffff', 3);
  },
  moonhawk(g) {   // เหยี่ยวกางปีก + เสี้ยวจันทร์
    glyph(g, (g) => { g.arc(44, 16, 10, 0, Math.PI * 2); }, '#f4ecff', 3);
    glyph(g, (g) => { g.arc(49, 13, 9, 0, Math.PI * 2); }, '#3a2066', 0.01);
    glyph(g, (g) => { g.moveTo(32, 30); g.quadraticCurveTo(18, 18, 6, 26); g.lineTo(18, 32); g.lineTo(10, 38); g.lineTo(28, 38); g.lineTo(32, 52); g.lineTo(36, 38); g.lineTo(54, 38); g.lineTo(46, 32); g.lineTo(58, 26); g.quadraticCurveTo(46, 18, 32, 30); g.closePath(); }, '#d8b0ff');
  },
  snare(g) {   // ศรปักพื้น + เงาพันขึ้น
    stroke(g, (g) => g.ellipse(32, 50, 24, 8, 0, 0, Math.PI * 2), '#a070ff', 3);
    for (const [x, s] of [[18, 1], [32, -1], [46, 1]]) stroke(g, (g) => { g.moveTo(x, 52); g.bezierCurveTo(x + 8 * s, 40, x - 8 * s, 30, x + 2 * s, 18); }, '#d8b0ff', 3);
    glyph(g, (g) => { g.moveTo(32, 50); g.lineTo(29, 8); g.lineTo(35, 8); g.closePath(); }, '#ffffff', 3);
  },
  phantom(g) {   // ร่างกระโดดถอย + เงาจาง 2 ร่าง
    for (const [x, c] of [[44, '#4a3070'], [34, '#7a58b0']]) glyph(g, (g) => { g.arc(x, 18, 5, 0, Math.PI * 2); g.moveTo(x - 6, 50); g.lineTo(x - 4, 26); g.lineTo(x + 4, 26); g.lineTo(x + 6, 50); g.closePath(); }, c, 3);
    glyph(g, (g) => { g.arc(20, 16, 6, 0, Math.PI * 2); g.moveTo(13, 48); g.lineTo(15, 25); g.lineTo(25, 25); g.lineTo(27, 48); g.closePath(); }, '#f4ecff');
    stroke(g, (g) => { g.moveTo(28, 30); g.lineTo(58, 30); }, '#e2b8ff', 2);
  },
  eclipse(g) {   // วงแหวนคราส + ศรเสี้ยวจันทร์
    glyph(g, (g) => g.arc(36, 24, 16, 0, Math.PI * 2), '#ff78c8', 3);
    glyph(g, (g) => g.arc(36, 24, 13, 0, Math.PI * 2), '#140820', 0.01);
    glyph(g, (g) => { g.moveTo(10, 30); g.quadraticCurveTo(30, 44, 10, 58); g.quadraticCurveTo(20, 44, 10, 30); g.closePath(); }, '#e2b8ff', 3);
    stroke(g, (g) => { g.moveTo(16, 44); g.lineTo(58, 44); }, '#ffffff', 2);
  },
  // ---------- v0.63 สายนักบวชชุดใหม่ ----------
  holyorb(g) {   // ลูกแสงพุ่ง มีหางแสง
    stroke(g, (g) => { g.moveTo(10, 50); g.lineTo(28, 36); g.moveTo(14, 56); g.lineTo(30, 42); g.moveTo(8, 42); g.lineTo(24, 32); }, '#fff2b0', 3);
    glyph(g, (g) => g.arc(38, 26, 13, 0, Math.PI * 2), '#fffbe6');
    glyph(g, (g) => star(g, 38, 26, 9, 3.5, 4, 0), '#ffd86b', 3);
  },
  pillar(g) {   // ลำแสงจากฟ้าลงพื้น + กากบาทฟื้นฟู
    glyph(g, (g) => { g.moveTo(24, 6); g.lineTo(40, 6); g.lineTo(44, 50); g.lineTo(20, 50); g.closePath(); }, '#fff6c8');
    glyph(g, (g) => g.ellipse(32, 51, 20, 6, 0, 0, Math.PI * 2), '#ffe08a', 4);
    stroke(g, (g) => { g.moveTo(32, 18); g.lineTo(32, 38); g.moveTo(22, 28); g.lineTo(42, 28); }, '#5ad87a', 4);
  },
  bless(g) {   // ดาบชูขึ้น + ลูกศรพลังขึ้น + ประกาย
    glyph(g, (g) => { g.moveTo(26, 8); g.lineTo(30, 14); g.lineTo(30, 40); g.lineTo(22, 40); g.lineTo(22, 14); g.closePath(); }, '#eef4ff');
    glyph(g, (g) => g.rect(15, 40, 22, 5), '#e8c050', 4);
    glyph(g, (g) => g.rect(23, 45, 6, 10), '#7a5232', 4);
    glyph(g, (g) => { g.moveTo(46, 14); g.lineTo(56, 26); g.lineTo(50, 26); g.lineTo(50, 40); g.lineTo(42, 40); g.lineTo(42, 26); g.lineTo(36, 26); g.closePath(); }, '#ffd86b', 4);
    glyph(g, (g) => star(g, 48, 50, 6, 2, 4, 0), '#ffffff', 3);
  },
  sanctumshield(g) {   // โดมแสงครอบ + โล่กางเขน
    stroke(g, (g) => { g.arc(32, 46, 26, Math.PI, 0); }, '#fff2b0', 3);
    stroke(g, (g) => { g.moveTo(6, 46); g.lineTo(58, 46); }, '#ffe08a', 3);
    glyph(g, (g) => { g.moveTo(32, 16); g.lineTo(46, 21); g.quadraticCurveTo(46, 42, 32, 52); g.quadraticCurveTo(18, 42, 18, 21); g.closePath(); }, '#fffbe6');
    stroke(g, (g) => { g.moveTo(32, 24); g.lineTo(32, 44); g.moveTo(25, 31); g.lineTo(39, 31); }, '#e8a830', 3);
  },
  divine(g) {   // ปีกคู่ + วงแหวนเทวดา + แสงลง
    for (const sgn of [-1, 1]) glyph(g, (g) => { g.moveTo(32, 34); g.quadraticCurveTo(32 + sgn * 18, 14, 32 + sgn * 28, 16); g.quadraticCurveTo(32 + sgn * 22, 26, 32 + sgn * 26, 30); g.quadraticCurveTo(32 + sgn * 18, 34, 32 + sgn * 22, 42); g.quadraticCurveTo(32 + sgn * 12, 44, 32, 40); g.closePath(); }, '#fff6dc', 4);
    stroke(g, (g) => g.ellipse(32, 12, 9, 3.5, 0, 0, Math.PI * 2), '#ffd86b', 3);
    glyph(g, (g) => { g.moveTo(28, 22); g.lineTo(36, 22); g.lineTo(38, 56); g.lineTo(26, 56); g.closePath(); }, '#ffe9a0', 3);
  },
  seed(g) {   // เมล็ดเรืองแสง + ต้นอ่อนงอก
    stroke(g, (g) => { g.moveTo(32, 40); g.quadraticCurveTo(30, 26, 32, 16); }, '#4ac06a', 4);
    glyph(g, (g) => { g.moveTo(32, 22); g.quadraticCurveTo(18, 12, 12, 20); g.quadraticCurveTo(20, 30, 32, 24); g.closePath(); }, '#8ae88a', 3);
    glyph(g, (g) => { g.moveTo(32, 18); g.quadraticCurveTo(46, 6, 52, 14); g.quadraticCurveTo(44, 26, 32, 20); g.closePath(); }, '#8ae88a', 3);
    glyph(g, (g) => g.ellipse(32, 46, 11, 9, 0, 0, Math.PI * 2), '#d8ffc8');
    glyph(g, (g) => star(g, 32, 46, 5, 2, 4, 0), '#ffffff', 2);
  },
  bloom(g) {   // ดอกไม้บาน 6 กลีบ
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; glyph(g, (g) => g.ellipse(32 + Math.cos(a) * 13, 32 + Math.sin(a) * 13, 9, 6, a, 0, Math.PI * 2), '#e8fff0', 4); }
    glyph(g, (g) => g.arc(32, 32, 8, 0, Math.PI * 2), '#ffe08a', 4);
    stroke(g, (g) => { g.moveTo(32, 28); g.lineTo(32, 36); g.moveTo(28, 32); g.lineTo(36, 32); }, '#4ac06a', 2);
  },
  healrain(g) {   // เมฆ + หยดฝนรูปหัวใจ/หยด
    glyph(g, (g) => { g.moveTo(14, 30); g.arc(20, 26, 8, Math.PI * 0.5, Math.PI * 1.5); g.arc(32, 18, 11, Math.PI, 0); g.arc(45, 26, 8, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); }, '#eaffff');
    for (const [x, y] of [[20, 44], [32, 50], [44, 44]]) glyph(g, (g) => { g.moveTo(x, y - 9); g.quadraticCurveTo(x + 6, y, x, y + 4); g.quadraticCurveTo(x - 6, y, x, y - 9); g.closePath(); }, '#8ae8ff', 3);
  },
  lotus(g) {   // ดอกบัวบนผิวน้ำ
    stroke(g, (g) => { g.ellipse(32, 50, 24, 6, 0, 0, Math.PI * 2); }, '#8ae8d8', 3);
    glyph(g, (g) => { g.moveTo(32, 46); g.quadraticCurveTo(10, 40, 10, 26); g.quadraticCurveTo(24, 30, 32, 46); }, '#c8ffe8', 4);
    glyph(g, (g) => { g.moveTo(32, 46); g.quadraticCurveTo(54, 40, 54, 26); g.quadraticCurveTo(40, 30, 32, 46); }, '#c8ffe8', 4);
    glyph(g, (g) => { g.moveTo(32, 46); g.quadraticCurveTo(20, 30, 32, 10); g.quadraticCurveTo(44, 30, 32, 46); }, '#f0fff8', 4);
  },
  lifetree(g) {   // ต้นไม้แห่งชีวิต พุ่มกลม + ลำต้น + รากเรืองแสง
    glyph(g, (g) => { g.moveTo(28, 56); g.lineTo(29, 36); g.lineTo(35, 36); g.lineTo(36, 56); g.closePath(); }, '#a8784a', 4);
    stroke(g, (g) => { g.moveTo(28, 56); g.quadraticCurveTo(20, 56, 14, 58); g.moveTo(36, 56); g.quadraticCurveTo(44, 56, 50, 58); }, '#5ae0a0', 3);
    glyph(g, (g) => { g.arc(32, 22, 15, 0, Math.PI * 2); g.moveTo(20, 32); g.arc(20, 30, 9, 0, Math.PI * 2); g.moveTo(53, 30); g.arc(44, 30, 9, 0, Math.PI * 2); }, '#8af0b0');
    glyph(g, (g) => star(g, 32, 22, 6, 2.4, 4, 0), '#ffffff', 2);
  },
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
  /* ---------- v0.31: อาชีพขั้นที่ 2 ---------- */
  lance(g) {
    stroke(g, (g) => { g.moveTo(12, 54); g.lineTo(44, 22); }, '#e8d2a8', 5);
    glyph(g, (g) => { g.moveTo(56, 8); g.lineTo(50, 28); g.lineTo(44, 22); g.lineTo(36, 14); g.closePath(); }, '#eef6ff');
    glyph(g, (g) => { g.moveTo(34, 26); g.lineTo(40, 32); g.lineTo(30, 36); g.lineTo(28, 30); g.closePath(); }, '#9ac8ff', 4);
  },
  chain(g) {
    glyph(g, (g) => { g.moveTo(14, 10); g.lineTo(28, 26); g.lineTo(22, 28); g.lineTo(36, 42); g.lineTo(30, 44); g.lineTo(50, 58); g.lineTo(40, 40); g.lineTo(46, 38); g.lineTo(32, 24); g.lineTo(38, 22); g.closePath(); }, '#fff6c0');
    for (const [x, y] of [[14, 10], [36, 42], [50, 58]]) glyph(g, (g) => g.arc(x, y, 4, 0, Math.PI * 2), '#ffe24a', 3);
  },
  crystal(g) {
    glyph(g, (g) => { g.moveTo(32, 6); g.lineTo(44, 24); g.lineTo(38, 56); g.lineTo(26, 56); g.lineTo(20, 24); g.closePath(); }, '#e8fbff');
    glyph(g, (g) => { g.moveTo(14, 30); g.lineTo(20, 38); g.lineTo(18, 54); g.lineTo(10, 46); g.closePath(); }, '#bfeeff', 4);
    glyph(g, (g) => { g.moveTo(50, 30); g.lineTo(54, 46); g.lineTo(46, 54); g.lineTo(44, 38); g.closePath(); }, '#bfeeff', 4);
  },
  comet(g) {
    stroke(g, (g) => { g.moveTo(8, 8); g.lineTo(34, 34); g.moveTo(8, 22); g.lineTo(28, 40); g.moveTo(22, 8); g.lineTo(40, 28); }, '#e8d8ff', 4);
    glyph(g, (g) => star(g, 40, 40, 17, 7), '#ffffff');
  },
  hawk(g) {
    glyph(g, (g) => { g.moveTo(32, 22); g.bezierCurveTo(22, 10, 8, 12, 4, 20); g.bezierCurveTo(14, 20, 20, 26, 24, 32); g.lineTo(28, 46); g.lineTo(32, 56); g.lineTo(36, 46); g.lineTo(40, 32); g.bezierCurveTo(44, 26, 50, 20, 60, 20); g.bezierCurveTo(56, 12, 42, 10, 32, 22); }, '#f0fff4');
    glyph(g, (g) => g.arc(32, 26, 4, 0, Math.PI * 2), '#ffd27a', 3);
  },
  bomb(g) {
    glyph(g, (g) => g.arc(28, 38, 17, 0, Math.PI * 2), '#5a4a3a');
    stroke(g, (g) => { g.moveTo(38, 24); g.quadraticCurveTo(46, 12, 54, 14); }, '#e8d2a8', 3);
    glyph(g, (g) => star(g, 54, 12, 8, 3, 6), '#ffd27a', 3);
    glyph(g, (g) => g.arc(22, 32, 4, 0, Math.PI * 2), '#ffffff', 2);
  },
  fan(g) {
    for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.28; stroke(g, (g) => { g.moveTo(32, 56); g.lineTo(32 + Math.cos(a) * 46, 56 + Math.sin(a) * 46); }, i % 2 ? '#ffd27a' : '#ffffff', 3); }
    glyph(g, (g) => g.arc(32, 56, 6, 0, Math.PI * 2), '#ffd27a', 3);
  },
  heart(g) {
    glyph(g, (g) => { g.moveTo(32, 56); g.bezierCurveTo(4, 36, 8, 10, 24, 12); g.bezierCurveTo(30, 13, 32, 18, 32, 20); g.bezierCurveTo(32, 18, 34, 13, 40, 12); g.bezierCurveTo(56, 10, 60, 36, 32, 56); }, '#ffffff');
    stroke(g, (g) => { g.moveTo(32, 24); g.lineTo(32, 44); g.moveTo(22, 34); g.lineTo(42, 34); }, '#4ae07a', 4);
  },
  barrier(g) {
    glyph(g, (g) => { g.moveTo(6, 52); g.bezierCurveTo(6, 14, 58, 14, 58, 52); g.closePath(); }, 'rgba(255,248,210,0.9)');
    stroke(g, (g) => { g.moveTo(32, 18); g.lineTo(32, 52); g.moveTo(14, 30); g.lineTo(50, 30); g.moveTo(10, 42); g.lineTo(54, 42); }, '#e8c050', 2.5);
  },
  spears(g) {
    for (const [x, y] of [[18, 12], [32, 4], [46, 12]]) {
      stroke(g, (g) => { g.moveTo(x, y); g.lineTo(x, y + 36); }, '#fff6c8', 3.5);
      glyph(g, (g) => { g.moveTo(x - 5, y + 34); g.lineTo(x + 5, y + 34); g.lineTo(x, y + 48); g.closePath(); }, '#ffffff', 3);
    }
    stroke(g, (g) => g.ellipse(32, 56, 22, 5, 0, 0, Math.PI * 2), '#ffd27a', 2.5);
  },
  // ---------- v0.85 อาชีพคลาส 3 (ไอคอนเฉพาะ 20 สกิล) ----------
  c3_gate(g) {   // วงเวทประตูทอง + ดาบพุ่งออกกลางวง
    stroke(g, (g) => g.arc(26, 30, 18, 0, Math.PI * 2), '#ffd24a', 3);
    stroke(g, (g) => g.arc(26, 30, 11, 0, Math.PI * 2), '#fff0a0', 2);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(g, (g) => { g.moveTo(26 + Math.cos(a) * 14, 30 + Math.sin(a) * 14); g.lineTo(26 + Math.cos(a) * 18, 30 + Math.sin(a) * 18); }, '#ffd24a', 2); }
    glyph(g, (g) => { g.moveTo(24, 34); g.lineTo(52, 12); g.lineTo(56, 8); g.lineTo(54, 16); g.lineTo(28, 38); g.closePath(); }, '#ffffff', 3.5);
    stroke(g, (g) => { g.moveTo(22, 30); g.lineTo(30, 40); }, '#ffd24a', 3);
  },
  c3_armrain(g) {   // ประตูทอง 3 บานบนฟ้า + ศาสตราตกลง
    for (const x of [14, 32, 50]) stroke(g, (g) => g.ellipse(x, 12, 8, 3.5, 0, 0, Math.PI * 2), '#ffd24a', 2.5);
    for (const [x, y] of [[14, 20], [32, 28], [50, 22]]) glyph(g, (g) => { g.moveTo(x - 2.5, y - 6); g.lineTo(x + 2.5, y - 6); g.lineTo(x + 2.5, y + 14); g.lineTo(x, y + 20); g.lineTo(x - 2.5, y + 14); g.closePath(); }, '#ffffff', 3);
    stroke(g, (g) => { g.moveTo(8, 58); g.lineTo(56, 58); }, '#ffb020', 2.5);
  },
  c3_chain(g) {   // โซ่ทองไขว้ตรึงกลาง
    for (const [a, b] of [[[8, 10], [56, 54]], [[56, 10], [8, 54]]]) {
      for (let i = 0; i < 5; i++) { const k = (i + 0.5) / 5, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        stroke(g, (g) => g.ellipse(x, y, 6, 3.5, ang + (i % 2 ? Math.PI / 2 : 0), 0, Math.PI * 2), i % 2 ? '#fff0a0' : '#ffc838', 2.5); }
    }
    glyph(g, (g) => g.arc(32, 32, 6, 0, Math.PI * 2), '#ffffff', 3);
  },
  c3_crown(g) {   // มงกุฎ + รัศมีทอง
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; stroke(g, (g) => { g.moveTo(32 + Math.cos(a) * 18, 34 + Math.sin(a) * 18); g.lineTo(32 + Math.cos(a) * 28, 34 + Math.sin(a) * 28); }, '#fff0a0', 2); }
    glyph(g, (g) => { g.moveTo(14, 50); g.lineTo(12, 26); g.lineTo(22, 36); g.lineTo(32, 20); g.lineTo(42, 36); g.lineTo(52, 26); g.lineTo(50, 50); g.closePath(); }, '#ffffff', 4);
    for (const x of [22, 32, 42]) glyph(g, (g) => g.arc(x, 44, 2.5, 0, Math.PI * 2), '#ffd24a', 2);
  },
  c3_drill(g) {   // ดาบทรงสว่านเกลียว + ลมหมุน
    glyph(g, (g) => { g.moveTo(10, 54); g.lineTo(18, 38); g.lineTo(50, 10); g.lineTo(26, 46); g.closePath(); }, '#ffffff', 4);
    for (const k of [0.3, 0.5, 0.7]) { const x = 10 + 40 * k, y = 54 - 44 * k; stroke(g, (g) => g.ellipse(x, y, 9 - k * 7, 3, -0.84, 0, Math.PI * 2), '#ff4a3a', 2.5); }
    stroke(g, (g) => { g.moveTo(6, 58); g.lineTo(14, 50); }, '#ffd24a', 4);
  },
  c3_ray(g) {   // วงเวท 3 ชั้นเรียง + ลำแสง
    for (const [x, r] of [[14, 12], [24, 10], [33, 8]]) stroke(g, (g) => g.ellipse(x, 32, 3.5, r, 0, 0, Math.PI * 2), '#9ad4ff', 2.5);
    glyph(g, (g) => { g.moveTo(34, 27); g.lineTo(60, 29); g.lineTo(60, 35); g.lineTo(34, 37); g.closePath(); }, '#ffffff', 3.5);
    stroke(g, (g) => { g.moveTo(4, 46); g.lineTo(12, 38); }, '#e8c050', 4);
  },
  c3_lightlance(g) {   // วงเวทบนฟ้า + หอกแสงพุ่งลง
    stroke(g, (g) => g.ellipse(32, 12, 22, 6, 0, 0, Math.PI * 2), '#bfe8ff', 2.5);
    stroke(g, (g) => g.ellipse(32, 12, 12, 3, 0, 0, Math.PI * 2), '#ffffff', 2);
    for (const [x, y] of [[16, 24], [32, 30], [48, 24], [24, 40], [40, 40]]) glyph(g, (g) => { g.moveTo(x, y + 16); g.lineTo(x + 3, y + 6); g.lineTo(x + 1.2, y + 6); g.lineTo(x + 1.2, y - 4); g.lineTo(x - 1.2, y - 4); g.lineTo(x - 1.2, y + 6); g.lineTo(x - 3, y + 6); g.closePath(); }, '#ffffff', 2.5);
  },
  c3_hexdome(g) {   // โดมแผ่นหกเหลี่ยม
    const hex = (g, x, y, r) => { for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } };
    for (const [x, y] of [[32, 18], [22, 30], [42, 30], [14, 44], [32, 42], [50, 44]]) glyph(g, (g) => hex(g, x, y, 7.5), '#e2f4ff', 3);
    stroke(g, (g) => { g.moveTo(6, 54); g.lineTo(58, 54); }, '#9ad4ff', 3);
  },
  c3_flowerfield(g) {   // ทุ่งดอกไม้บานรอบวง
    stroke(g, (g) => g.ellipse(32, 46, 26, 9, 0, 0, Math.PI * 2), '#bfffd0', 2.5);
    for (const [x, y, r] of [[32, 26, 8], [16, 40, 5.5], [48, 40, 5.5], [24, 52, 4.5], [42, 52, 4.5]]) {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; glyph(g, (g) => g.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.55, 0, Math.PI * 2), '#ffd0e4', 2.5); }
      glyph(g, (g) => g.arc(x, y, r * 0.4, 0, Math.PI * 2), '#fff6a0', 2);
    }
  },
  c3_circles(g) {   // วงเวทล้อมรอบเป้า + ลำแสงลงกลาง
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(g, (g) => g.arc(32 + Math.cos(a) * 21, 34 + Math.sin(a) * 15, 5, 0, Math.PI * 2), '#e2f4ff', 2.5); }
    glyph(g, (g) => { g.moveTo(27, 2); g.lineTo(37, 2); g.lineTo(35, 40); g.lineTo(29, 40); g.closePath(); }, '#ffffff', 3);
    glyph(g, (g) => g.arc(32, 40, 6, 0, Math.PI * 2), '#fff6c8', 3);
  },
  c3_spiralarrow(g) {   // ศรเกลียวพุ่งเฉียง
    glyph(g, (g) => { g.moveTo(56, 8); g.lineTo(42, 14); g.lineTo(50, 22); g.closePath(); }, '#ffffff', 3);
    stroke(g, (g) => { g.moveTo(10, 54); g.lineTo(48, 16); }, '#ffffff', 3);
    for (const k of [0.25, 0.45, 0.65]) { const x = 10 + 38 * k, y = 54 - 38 * k; stroke(g, (g) => g.ellipse(x, y, 7, 3, -0.78, 0, Math.PI * 2), '#9ad8ff', 2.5); }
  },
  c3_twinblades(g) {   // ดาบสั้นโค้งขาวดำไขว้กัน
    glyph(g, (g) => { g.moveTo(10, 50); g.quadraticCurveTo(18, 14, 52, 10); g.quadraticCurveTo(26, 22, 18, 52); g.closePath(); }, '#ffffff', 3.5);
    glyph(g, (g) => { g.moveTo(54, 50); g.quadraticCurveTo(46, 14, 12, 10); g.quadraticCurveTo(38, 22, 46, 52); g.closePath(); }, '#3a3a48', 3.5);
    stroke(g, (g) => { g.moveTo(8, 56); g.lineTo(16, 48); g.moveTo(56, 56); g.lineTo(48, 48); }, '#c8a050', 4);
  },
  c3_petals(g) {   // ม่านกลีบแสงบานเป็นโล่
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 - Math.PI / 2; g.save(); g.translate(32, 32); g.rotate(a);
      glyph(g, (g) => { g.moveTo(0, -2); g.quadraticCurveTo(9, -14, 0, -27); g.quadraticCurveTo(-9, -14, 0, -2); }, '#ffd8ee', 2.5); g.restore(); }
    glyph(g, (g) => g.arc(32, 32, 5, 0, Math.PI * 2), '#ffffff', 2.5);
  },
  c3_bladerain(g) {   // ดาบเส้นโครงแสงพุ่งลง
    for (const [x, y] of [[16, 8], [32, 4], [48, 10], [24, 26], [42, 28]]) {
      stroke(g, (g) => { g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x + 3, y + 16); g.lineTo(x, y + 22); g.lineTo(x - 3, y + 16); g.closePath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); }, '#9ad8ff', 2);
    }
    stroke(g, (g) => { g.moveTo(6, 58); g.lineTo(58, 58); }, '#ffffff', 2);
  },
  c3_bladefield(g) {   // ทุ่งดาบปักพื้น + เฟืองบนฟ้า
    stroke(g, (g) => g.arc(44, 16, 10, 0, Math.PI * 2), '#ffb04a', 2.5);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(g, (g) => { g.moveTo(44 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.lineTo(44 + Math.cos(a) * 14, 16 + Math.sin(a) * 14); }, '#ffb04a', 3); }
    for (const [x, y, t] of [[12, 30, -0.2], [26, 26, 0.1], [40, 34, -0.1], [54, 32, 0.2]]) { g.save(); g.translate(x, y); g.rotate(t);
      glyph(g, (g) => { g.moveTo(-2.5, 0); g.lineTo(2.5, 0); g.lineTo(2.5, 20); g.lineTo(-2.5, 20); g.closePath(); }, '#ffffff', 2.5);
      stroke(g, (g) => { g.moveTo(-6, 2); g.lineTo(6, 2); }, '#c8a050', 2.5); g.restore(); }
    stroke(g, (g) => { g.moveTo(4, 54); g.lineTo(60, 54); }, '#ff7a3a', 3);
  },
  c3_lightorb(g) {   // ลูกแสงระหว่างสองมือ
    glyph(g, (g) => g.arc(32, 28, 11, 0, Math.PI * 2), '#fff6c8', 3.5);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stroke(g, (g) => { g.moveTo(32 + Math.cos(a) * 14, 28 + Math.sin(a) * 14); g.lineTo(32 + Math.cos(a) * 19, 28 + Math.sin(a) * 19); }, '#ffe8a0', 2); }
    glyph(g, (g) => { g.moveTo(8, 56); g.quadraticCurveTo(10, 40, 20, 38); g.lineTo(24, 44); g.quadraticCurveTo(18, 48, 18, 56); g.closePath(); }, '#ffffff', 3);
    glyph(g, (g) => { g.moveTo(56, 56); g.quadraticCurveTo(54, 40, 44, 38); g.lineTo(40, 44); g.quadraticCurveTo(46, 48, 46, 56); g.closePath(); }, '#ffffff', 3);
  },
  c3_featherblade(g) {   // ขนนกแสงตกลงเป็นใบมีด
    for (const [x, y, t] of [[18, 10, 0.4], [36, 16, -0.3], [26, 34, 0.2], [46, 36, -0.4]]) { g.save(); g.translate(x, y); g.rotate(t);
      glyph(g, (g) => { g.moveTo(0, -10); g.quadraticCurveTo(7, 0, 0, 14); g.quadraticCurveTo(-7, 0, 0, -10); }, '#fff2c8', 2.5);
      stroke(g, (g) => { g.moveTo(0, -8); g.lineTo(0, 12); }, '#ffc070', 1.5); g.restore(); }
    stroke(g, (g) => { g.moveTo(10, 58); g.lineTo(54, 58); }, '#ffe8a0', 2.5);
  },
  c3_goddessheal(g) {   // หัวใจมีปีก
    glyph(g, (g) => { g.moveTo(22, 30); g.bezierCurveTo(10, 14, 0, 26, 4, 34); g.bezierCurveTo(10, 32, 14, 38, 20, 40); }, '#fff2c8', 3);
    glyph(g, (g) => { g.moveTo(42, 30); g.bezierCurveTo(54, 14, 64, 26, 60, 34); g.bezierCurveTo(54, 32, 50, 38, 44, 40); }, '#fff2c8', 3);
    glyph(g, (g) => { g.moveTo(32, 52); g.bezierCurveTo(16, 40, 16, 22, 26, 22); g.bezierCurveTo(30, 22, 32, 26, 32, 28); g.bezierCurveTo(32, 26, 34, 22, 38, 22); g.bezierCurveTo(48, 22, 48, 40, 32, 52); }, '#ffffff', 3.5);
    stroke(g, (g) => { g.moveTo(32, 32); g.lineTo(32, 44); g.moveTo(26, 38); g.lineTo(38, 38); }, '#ffc070', 3);
  },
  c3_wingcocoon(g) {   // ปีกโอบห่อเป็นโดม
    glyph(g, (g) => { g.moveTo(32, 56); g.bezierCurveTo(8, 56, 4, 30, 18, 12); g.bezierCurveTo(20, 26, 24, 40, 32, 46); }, '#fff2c8', 3.5);
    glyph(g, (g) => { g.moveTo(32, 56); g.bezierCurveTo(56, 56, 60, 30, 46, 12); g.bezierCurveTo(44, 26, 40, 40, 32, 46); }, '#fff2c8', 3.5);
    glyph(g, (g) => g.arc(32, 34, 6, 0, Math.PI * 2), '#ffffff', 3);
    stroke(g, (g) => { g.moveTo(14, 24); g.lineTo(20, 30); g.moveTo(50, 24); g.lineTo(44, 30); }, '#ffd890', 2);
  },
  c3_awaken(g) {   // ปีก 3 คู่ + รัศมีเทวดา
    for (const [y, w] of [[22, 26], [32, 22], [42, 16]]) {
      glyph(g, (g) => { g.moveTo(30, y); g.quadraticCurveTo(30 - w, y - 12, 30 - w - 2, y + 2); g.quadraticCurveTo(22, y + 2, 30, y + 6); }, '#fff2c8', 2.5);
      glyph(g, (g) => { g.moveTo(34, y); g.quadraticCurveTo(34 + w, y - 12, 34 + w + 2, y + 2); g.quadraticCurveTo(42, y + 2, 34, y + 6); }, '#fff2c8', 2.5);
    }
    glyph(g, (g) => { g.moveTo(32, 20); g.lineTo(37, 56); g.lineTo(27, 56); g.closePath(); }, '#ffffff', 3);
    stroke(g, (g) => g.ellipse(32, 9, 10, 3, 0, 0, Math.PI * 2), '#ffd27a', 2.5);
  },
  angel(g) {
    glyph(g, (g) => { g.moveTo(30, 30); g.bezierCurveTo(16, 8, 4, 16, 4, 30); g.bezierCurveTo(10, 28, 14, 34, 18, 40); g.bezierCurveTo(22, 40, 26, 38, 30, 36); }, '#fff6dc');
    glyph(g, (g) => { g.moveTo(34, 30); g.bezierCurveTo(48, 8, 60, 16, 60, 30); g.bezierCurveTo(54, 28, 50, 34, 46, 40); g.bezierCurveTo(42, 40, 38, 38, 34, 36); }, '#fff6dc');
    glyph(g, (g) => { g.moveTo(32, 22); g.lineTo(38, 56); g.lineTo(26, 56); g.closePath(); }, '#ffffff');
    glyph(g, (g) => g.arc(32, 20, 5, 0, Math.PI * 2), '#ffffff', 3);
    stroke(g, (g) => g.ellipse(32, 10, 10, 3, 0, 0, Math.PI * 2), '#ffd27a', 2.5);
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
