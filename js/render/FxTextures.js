// เท็กซ์เจอร์สำหรับเอฟเฟกต์สกิล (วาดด้วย Canvas สีขาว แล้วย้อมสีด้วยวัสดุ)
import { THREE } from './three.js';

const cache = new Map();
function make(key, size, draw, { repeat = false } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}
const radial = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };

// จุดแสงนุ่ม (อนุภาค)
export const softDot = () => make('dot', 64, (g, s) => {
  g.fillStyle = radial(g, s / 2, s / 2, s / 2, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.8)'], [0.6, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
});

// ประกายสี่แฉก
export const star4 = () => make('star4', 128, (g, s) => {
  const c = s / 2;
  g.fillStyle = radial(g, c, c, c * 0.35, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[s, 6], [6, s]]) {
    const gr = w > h ? g.createLinearGradient(0, 0, s, 0) : g.createLinearGradient(0, 0, 0, s);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(c - w / 2, c - h / 2, w, h);
  }
});

// วงแหวนนุ่ม (คลื่นกระแทก)
export const softRing = () => make('ring', 256, (g, s) => {
  const c = s / 2;
  g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,0)'], [0.62, 'rgba(255,255,255,0)'], [0.84, 'rgba(255,255,255,1)'], [0.9, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
});

// พระจันทร์เสี้ยว (รอยฟัน)
export const crescent = () => make('crescent', 256, (g, s) => {
  const c = s / 2;
  g.save();
  g.beginPath(); g.arc(c, c, c * 0.95, 0, Math.PI * 2); g.clip();
  g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,0)'], [0.78, 'rgba(255,255,255,0.65)'], [0.9, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = radial(g, c * 0.62, c * 1.1, c * 0.95, [[0, 'rgba(0,0,0,1)'], [0.8, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, s, s);
  g.restore();
});

// วงเวทย์ธาตุไฟ / ทั่วไป: วงแหวนซ้อน + อักษรรูน + ดาวห้าแฉก
export const runeCircle = (kind = 'star') => make('rune' + kind, 512, (g, s) => {
  const c = s / 2;
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  g.shadowColor = '#fff'; g.shadowBlur = 8;
  for (const [r, w] of [[0.96, 6], [0.86, 3], [0.6, 3], [0.52, 2]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, c * r, 0, Math.PI * 2); g.stroke(); }
  g.font = `bold ${s * 0.05}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.save(); g.translate(c + Math.cos(a) * c * 0.91, c + Math.sin(a) * c * 0.91); g.rotate(a + Math.PI / 2);
    g.fillText(runes[i % runes.length], 0, 0); g.restore();
  }
  g.lineWidth = 3;
  const pts = kind === 'hex' ? 6 : kind === 'cross' ? 4 : 5;
  const step = kind === 'star' ? 2 : 1;
  g.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = -Math.PI / 2 + ((i * step) / pts) * Math.PI * 2;
    const x = c + Math.cos(a) * c * 0.6, y = c + Math.sin(a) * c * 0.6;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  if (kind === 'hex') { g.beginPath(); for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI * 2 + Math.PI / 6; const x = c + Math.cos(a) * c * 0.6, y = c + Math.sin(a) * c * 0.6; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  if (kind === 'cross') { g.lineWidth = 10; g.beginPath(); g.moveTo(c, c - c * 0.5); g.lineTo(c, c + c * 0.5); g.moveTo(c - c * 0.36, c - c * 0.12); g.lineTo(c + c * 0.36, c - c * 0.12); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.73, c + Math.sin(a) * c * 0.73, c * 0.035, 0, Math.PI * 2); g.fill(); }
});

// กางเขนเรืองแสง
export const crossGlow = () => make('cross', 256, (g, s) => {
  const c = s / 2;
  g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,0.55)'], [0.5, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
  g.shadowColor = '#fff'; g.shadowBlur = 18; g.fillStyle = '#fff';
  const w = s * 0.12;
  g.fillRect(c - w / 2, s * 0.12, w, s * 0.76);
  g.fillRect(s * 0.22, c - s * 0.12 - w / 2, s * 0.56, w);
});

// ขนนก
export const feather = () => make('feather', 128, (g, s) => {
  g.translate(s / 2, s / 2); g.rotate(-0.6);
  const gr = g.createLinearGradient(0, -s * 0.45, 0, s * 0.45);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.5)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, -s * 0.45); g.bezierCurveTo(s * 0.22, -s * 0.2, s * 0.18, s * 0.25, 0, s * 0.4); g.bezierCurveTo(-s * 0.18, s * 0.25, -s * 0.22, -s * 0.2, 0, -s * 0.45); g.fill();
  g.strokeStyle = 'rgba(200,210,230,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(0, s * 0.46); g.stroke();
});

// ปีกเทวดา (ข้างเดียว ใช้กลับด้านเป็นอีกข้าง)
export const wing = () => make('wing', 256, (g, s) => {
  g.fillStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    g.save(); g.translate(s * 0.08, s * 0.55); g.rotate(-1.25 + t * 1.1);
    const L = s * (0.85 - t * 0.38);
    g.beginPath(); g.ellipse(L / 2, 0, L / 2, s * 0.06, 0, 0, Math.PI * 2);
    g.globalAlpha = 0.55 + (1 - t) * 0.45; g.fill(); g.restore();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, s, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,240,200,0.5)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});

// ลายรังผึ้งสำหรับโล่เวทย์
export const hexGrid = () => make('hex', 256, (g, s) => {
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
  const r = s / 10, h = Math.sqrt(3) * r;
  for (let row = -1; row < 8; row++) for (let col = -1; col < 8; col++) {
    const x = col * r * 1.5, y = row * h + (col % 2 ? h / 2 : 0);
    g.beginPath();
    for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.stroke();
  }
}, { repeat: true });

// เกล็ดหิมะ
export const snowflake = () => make('snow', 128, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 10;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, x = Math.cos(a), y = Math.sin(a);
    g.beginPath(); g.moveTo(c, c); g.lineTo(c + x * c * 0.85, c + y * c * 0.85); g.stroke();
    for (const k of [0.45, 0.65]) { const bx = c + x * c * k, by = c + y * c * k; for (const sgn of [-1, 1]) { const b = a + sgn * 0.7; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(b) * c * 0.2, by + Math.sin(b) * c * 0.2); g.stroke(); } }
  }
});

// ควัน/เมฆก้อนนุ่ม
export const puff = () => make('puff', 128, (g, s) => {
  for (let i = 0; i < 9; i++) {
    const x = s * (0.3 + Math.random() * 0.4), y = s * (0.3 + Math.random() * 0.4), r = s * (0.18 + Math.random() * 0.15);
    g.fillStyle = radial(g, x, y, r, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, s, s);
  }
});

// รอยไหม้แตกร้าวบนพื้น (ใช้แบบผสมปกติ)
export const scorch = () => make('scorch', 256, (g, s) => {
  const c = s / 2;
  g.fillStyle = radial(g, c, c, c, [[0, 'rgba(20,12,8,0.85)'], [0.55, 'rgba(30,18,10,0.55)'], [1, 'rgba(30,18,10,0)']]);
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,150,60,0.9)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + Math.random() * 0.3, x = c, y = c, r = 0;
    g.beginPath(); g.moveTo(x, y);
    while (r < c * 0.8) { r += 10 + Math.random() * 14; a += (Math.random() - 0.5) * 0.6; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
    g.stroke();
  }
});

// ดวงตาสัญลักษณ์ (บัฟสมาธิ)
export const eyeSigil = () => make('eye', 256, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 8; g.shadowColor = '#fff'; g.shadowBlur = 14;
  g.beginPath(); g.moveTo(s * 0.08, c); g.quadraticCurveTo(c, s * 0.12, s * 0.92, c); g.quadraticCurveTo(c, s * 0.88, s * 0.08, c); g.stroke();
  g.beginPath(); g.arc(c, c, s * 0.15, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(c, c, s * 0.06, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * s * 0.36, c + Math.sin(a) * s * 0.36); g.lineTo(c + Math.cos(a) * s * 0.46, c + Math.sin(a) * s * 0.46); g.stroke(); }
});

// สัญลักษณ์ดาบไขว้ (บัฟคำรามศึก)
export const swordsSigil = () => make('swords', 256, (g, s) => {
  const c = s / 2; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12;
  for (const sg of [-1, 1]) {
    g.save(); g.translate(c, c); g.rotate(sg * 0.7);
    g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(s * 0.045, -s * 0.32); g.lineTo(s * 0.035, s * 0.18); g.lineTo(-s * 0.035, s * 0.18); g.lineTo(-s * 0.045, -s * 0.32); g.closePath(); g.fill();
    g.fillRect(-s * 0.12, s * 0.18, s * 0.24, s * 0.035); g.fillRect(-s * 0.02, s * 0.2, s * 0.04, s * 0.14);
    g.restore();
  }
  g.lineWidth = 6; g.strokeStyle = '#fff'; g.beginPath(); g.arc(c, c, s * 0.46, 0, Math.PI * 2); g.stroke();
});

// เปลวไฟเรียว (ใบปีกไฟ / หางไฟ)
export const flameStrip = () => make('flame', 128, (g, s) => {
  const gr = g.createLinearGradient(0, 0, s, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, s / 2); g.quadraticCurveTo(s * 0.4, s * 0.05, s, s * 0.35); g.quadraticCurveTo(s * 0.55, s * 0.5, s, s * 0.65); g.quadraticCurveTo(s * 0.4, s * 0.95, 0, s / 2); g.fill();
});

// ริ้วลมเกลียว (เลื่อน UV ให้หมุน)
export const windStreak = () => make('wind', 256, (g, s) => {
  for (let i = 0; i < 7; i++) {
    const y = (i + 0.5) * (s / 7) + (Math.random() - 0.5) * 8, w = s * (0.35 + Math.random() * 0.5), x = Math.random() * s;
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x, y - 3, w, 6); g.fillRect(x - s, y - 3, w, 6);
  }
}, { repeat: true });

// รอยแตกร้าวบนพื้น (สีขาว ใช้ได้ทั้งแบบรอยดำและแบบเรืองแสง)
export const cracks = () => make('cracks', 512, (g, s) => {
  const c = s / 2;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff';
  const branch = (x, y, a, len, w, depth) => {
    let r = 0;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y);
    while (r < len) {
      const step = 10 + Math.random() * 16; r += step; a += (Math.random() - 0.5) * 0.7;
      x += Math.cos(a) * step; y += Math.sin(a) * step; g.lineTo(x, y);
      if (depth < 2 && Math.random() < 0.18) { g.stroke(); branch(x, y, a + (Math.random() < 0.5 ? -1 : 1) * rand2(0.5, 1.1), (len - r) * 0.6, w * 0.6, depth + 1); g.lineWidth = w; g.beginPath(); g.moveTo(x, y); }
      g.lineWidth = Math.max(1, w * (1 - r / len));
    }
    g.stroke();
  };
  const rand2 = (a, b) => a + Math.random() * (b - a);
  const n = 11;
  for (let i = 0; i < n; i++) branch(c, c, (i / n) * Math.PI * 2 + Math.random() * 0.4, c * rand2(0.55, 0.92), 7, 0);
  // วงแตกรอบจุดกระแทก
  g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = c * (0.18 + Math.random() * 0.05); g[i ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c + Math.sin(a) * r); }
  g.stroke();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = radial(g, c, c, c * 0.28, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
  g.fillRect(0, 0, s, s);
});

// ไล่ระดับแนวตั้ง (ล่างทึบ บนจาง) มีริ้วฝุ่น — ใช้กับกำแพงคลื่นกระแทก
export const vgrad = () => make('vgrad', 128, (g, s) => {
  const gr = g.createLinearGradient(0, s, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.08, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.5})`; g.fillRect(Math.random() * s, 0, 2 + Math.random() * 5, s * (0.4 + Math.random() * 0.6)); }
}, { repeat: true });
