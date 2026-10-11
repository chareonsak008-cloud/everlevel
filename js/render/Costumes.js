// ชุดแฟชั่น (v0.9 preview): ปีก · ชุด · หมวก · หน้า · หลัง/หาง · อาวุธ · ออร่า · ผู้ติดตาม
// ทุกชิ้นสร้างจากโค้ด (ไม่มีไฟล์โมเดล) แล้วติดเข้ากับโครงของ CharacterView
// ใช้:  const look = costumeLook(baseLook, items);  const view = new CharacterView(look);
//       const rt = wearCostume(view, items, { world: scene });  ทุกเฟรม rt.update(dt, view)
import { THREE } from './three.js';
import { toon, toonOwn, bake, gradientMap } from './Toon.js';
import { shadeHex } from './Textures.js';
import * as TX from './FxTextures.js';
import { Particles } from './SkillFX.js';
import { COSTUME_PETS } from './CostumePets.js';   // v0.17: ผู้ติดตามแฟชั่นแบบใหม่ (หน้าเป็นโมเดล เห็นชัดในสไปรต์พิกเซล)

/* ================= ตัวช่วยพื้นฐาน ================= */
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
const T = (c, o) => toon(c, o);
const G = (c, i = 1.2, o = {}) => toon(c, { emissive: c, emissiveIntensity: i, ...o });          // เรืองแสงในตัว
const DS = (c, o = {}) => toon(c, { side: THREE.DoubleSide, ...o });
// วัสดุ toon ที่มีลายเท็กซ์เจอร์ (ไม่แคช เพราะแต่ละชิ้นใช้ลายต่างกัน)
const TM = (c, map, o = {}) => new THREE.MeshToonMaterial({ color: lin(c), map, gradientMap: gradientMap(), ...o });
const unlit = (color, { map = null, opacity = 1, add = false, side = THREE.DoubleSide } = {}) =>
  new THREE.MeshBasicMaterial({ color: lin(color), map, transparent: true, opacity, side, depthWrite: !add && opacity >= 1, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });

function mesh(geo, mat, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.r) m.rotation.set(o.r[0] || 0, o.r[1] || 0, o.r[2] || 0);
  if (o.s != null) { if (typeof o.s === 'number') m.scale.setScalar(o.s); else m.scale.set(o.s[0], o.s[1], o.s[2]); }
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  if (o.noOutline || mat.transparent) m.userData.noOutline = true;
  if (o.keep) m.userData.keep = true;
  parent.add(m);
  return m;
}
const group = (parent, x = 0, y = 0, z = 0, r = null) => { const g = new THREE.Group(); g.position.set(x, y, z); if (r) g.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); parent.add(g); return g; };
const sph = (r = 1, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt, rb, h, n = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, a = 8, b = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, a, b, arc);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);
const bez = (a, b, c, n = 8) => new THREE.QuadraticBezierCurve3(a, b, c).getPoints(n);
const bez3 = (a, b, c, d, n = 10) => new THREE.CubicBezierCurve3(a, b, c, d).getPoints(n);

// ท่อเรียว (เขา หาง กิ่งไม้ กระดูกปีก) — ต่อทรงกระบอกตามจุด
function taper(parent, pts, r0, r1, mat, { cap = true, joints = true, seg = 8 } = {}) {
  const g = parent, out = [];
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    const len = Math.max(1e-4, a.distanceTo(b));
    const geo = cap && i === n - 1 ? new THREE.ConeGeometry(ra, len, seg) : new THREE.CylinderGeometry(rb, ra, len, seg);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; g.add(m); out.push(m);
    if (joints && i > 0) { const j = new THREE.Mesh(sph(ra * 1.02, seg, 6), mat); j.position.copy(a); j.castShadow = true; g.add(j); out.push(j); }
  }
  return out;
}

// แผ่นรูปทรงจากเส้น 2 มิติ (ปีก ใบไม้ หน้ากาก) — UV ยืดเต็มกรอบรูป
function shapeGeo(draw, { flipX = false } = {}) {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ShapeGeometry(sh, 16);
  g.computeBoundingBox();
  const bb = g.boundingBox, pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1));
  if (flipX) g.scale(-1, 1, 1);
  return g;
}
const starShape = (sh, r1, r2, n = 5, rot = Math.PI / 2) => {
  for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * Math.PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
};
const extrude = (draw, depth = 0.02, bevel = 0.008) => {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -depth / 2); return g;
};

/* ---------- เท็กซ์เจอร์วาดด้วย Canvas ---------- */
const texCache = new Map();
function ctex(key, w, h, draw, { repeat = false } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t); return t;
}
const radial = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };

// ลายปีกผีเสื้อ: สีไล่ + เส้นปีก + ขอบเข้ม + จุดขาว
const butterflyTex = (key, c1, c2, edge, dots = '#ffffff') => ctex('bf' + key, 256, 256, (g, s) => {
  const gr = g.createLinearGradient(0, s, s, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = edge; g.globalAlpha = 0.55; g.lineWidth = 4;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(0, s); g.quadraticCurveTo(s * (0.2 + i * 0.1), s * 0.6, s * (0.25 + i * 0.13), s * (0.05 + i * 0.02)); g.stroke(); }
  g.globalAlpha = 1; g.lineWidth = 26; g.strokeStyle = edge; g.strokeRect(0, 0, s, s);
  g.fillStyle = dots; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(s * (0.55 + (i % 3) * 0.14), s * (0.12 + Math.floor(i / 3) * 0.1), 5 + (i % 2) * 3, 0, Math.PI * 2); g.fill(); }
});
const cosmicTex = () => ctex('cosmic', 256, 256, (g, s) => {
  const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#1a1050'); gr.addColorStop(0.5, '#3a1e7a'); gr.addColorStop(1, '#0c1a4a');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6; i++) { g.fillStyle = radial(g, Math.random() * s, Math.random() * s, 40 + Math.random() * 50, [[0, `rgba(${180 + Math.random() * 60},${90 + Math.random() * 80},255,0.35)`], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, s, s); }
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; const r = Math.random() < 0.08 ? 2.2 : 0.9; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(200,190,255,0.9)'; g.lineWidth = 6; g.strokeRect(0, 0, s, s);
});
const holoTex = (c = '#7ff8ff') => ctex('holo' + c, 256, 256, (g, s) => {
  g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, s, s);
  g.strokeStyle = c; g.globalAlpha = 0.35; g.lineWidth = 1.5;
  for (let i = 0; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
  g.globalAlpha = 1; g.lineWidth = 10; g.strokeRect(0, 0, s, s);
  g.fillStyle = radial(g, s * 0.2, s * 0.8, s, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s);
});
const starsTex = (bg = '#1a1a4a', fg = '#ffe9a8') => ctex('stars' + bg + fg, 128, 128, (g, s) => {
  g.fillStyle = bg; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = Math.random() < 0.3 ? fg : '#ffffff'; const x = Math.random() * s, y = Math.random() * s, r = Math.random() < 0.2 ? 4 : 1.3;
    g.beginPath(); for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 2, rr = k % 2 ? r * 0.4 : r; k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
  }
}, { repeat: true });
// ลายผ้าแบบโปร่ง (ซ้อนทับเสื้อ): ดอกไม้ · ลายสก็อต · ลายไทย · ซากุระ · ลายทาง · เกล็ด · ดาว
// bg = สีพื้นผ้า (ถ้าไม่ระบุจะโปร่งใส ใช้ซ้อนทับเสื้อ)
const patternTex = (kind, c1, c2 = '#ffffff', bg = null) => ctex('pat' + kind + c1 + c2 + bg, 128, 128, (g, s) => {
  g.clearRect(0, 0, s, s);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, s, s); }
  if (kind === 'flower') {
    for (const [x, y, r] of [[30, 34, 13], [92, 24, 10], [70, 86, 15], [16, 104, 9], [112, 108, 11]]) {
      g.fillStyle = c1; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, r * 0.35, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = c2; g.beginPath(); g.arc(x, y, r * 0.3, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'plaid') {
    g.fillStyle = c1; g.globalAlpha = 0.55; for (let i = 0; i < s; i += 32) { g.fillRect(i, 0, 12, s); g.fillRect(0, i, s, 12); }
    g.globalAlpha = 0.8; g.fillStyle = c2; for (let i = 16; i < s; i += 32) { g.fillRect(i, 0, 2, s); g.fillRect(0, i, s, 2); }
  } else if (kind === 'thai') {
    g.strokeStyle = c1; g.lineWidth = 3;
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      const x = col * 64 + 32, y = row * 64 + 32;
      g.beginPath(); g.moveTo(x, y - 24); g.quadraticCurveTo(x + 22, y - 6, x, y + 24); g.quadraticCurveTo(x - 22, y - 6, x, y - 24); g.stroke();
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * 8, y + 4); g.quadraticCurveTo(x + sx * 26, y + 2, x + sx * 22, y - 14); g.stroke(); }
    }
    g.fillStyle = c2; g.fillRect(0, 0, s, 5); g.fillRect(0, s - 5, s, 5);
  } else if (kind === 'sakura') {
    for (const [x, y, r] of [[26, 30, 12], [90, 40, 9], [60, 96, 13], [112, 100, 8], [12, 84, 7]]) {
      g.fillStyle = c1; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = c2; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
    }
  } else if (kind === 'stripe') {
    g.fillStyle = c1; for (let i = 0; i < s; i += 32) g.fillRect(0, i, s, 14);
  } else if (kind === 'scale') {
    g.strokeStyle = c1; g.lineWidth = 3;
    for (let y = 0; y < s + 16; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < s + 16; x += 16) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI); g.stroke(); }
  } else if (kind === 'star') {
    g.fillStyle = c1;
    for (const [x, y, r] of [[24, 24, 10], [88, 36, 7], [56, 84, 11], [110, 104, 6], [18, 100, 6]]) { g.beginPath(); for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? r * 0.42 : r; k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  } else if (kind === 'bones') {
    g.fillStyle = c1;
    for (const [x, y] of [[32, 32], [96, 96]]) { g.beginPath(); g.arc(x, y - 6, 12, 0, Math.PI * 2); g.fill(); g.fillRect(x - 6, y + 2, 12, 8); g.fillStyle = c2; g.beginPath(); g.arc(x - 5, y - 7, 3.5, 0, Math.PI * 2); g.arc(x + 5, y - 7, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = c1; }
  } else if (kind === 'dots') {
    g.fillStyle = c1; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 32 + (y % 2) * 16 + 8, y * 32 + 16, 6, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'cloud') {
    g.strokeStyle = c1; g.lineWidth = 3; g.lineCap = 'round';
    for (const [x, y] of [[34, 34], [94, 94]]) {
      for (const r of [13, 7]) { g.beginPath(); g.arc(x, y, r, Math.PI * 0.15, Math.PI * 1.75); g.stroke(); }
      g.beginPath(); g.arc(x + 20, y + 3, 9, Math.PI, Math.PI * 2.15); g.stroke();
      g.beginPath(); g.moveTo(x - 26, y + 12); g.quadraticCurveTo(x, y + 20, x + 32, y + 12); g.stroke();
    }
  } else if (kind === 'rose') {
    for (const [x, y, r] of [[30, 30, 11], [94, 70, 12], [52, 104, 9]]) {
      g.fillStyle = c2; g.beginPath(); g.ellipse(x + r, y + r * 0.7, r * 0.7, r * 0.32, 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = c1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r * 0.55, 0.3, Math.PI * 1.6); g.stroke(); g.beginPath(); g.arc(x + 1, y - 1, r * 0.25, 0, Math.PI * 1.5); g.stroke();
    }
  } else if (kind === 'tiger') {
    g.fillStyle = c1;
    for (let i = 0; i < 6; i++) { const y = i * 22 + 6; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(30, y - 8, 64, y + 3); g.quadraticCurveTo(96, y + 10, 128, y); g.lineTo(128, y + 6); g.quadraticCurveTo(90, y + 14, 60, y + 9); g.quadraticCurveTo(28, y + 2, 0, y + 8); g.fill(); }
  } else if (kind === 'circuit') {
    g.strokeStyle = c1; g.fillStyle = c1; g.lineWidth = 2.5;
    const paths = [[[8, 0], [8, 40], [40, 40], [40, 72]], [[72, 0], [72, 24], [104, 24], [104, 128]], [[0, 96], [56, 96], [56, 128]], [[24, 128], [24, 112], [88, 112], [88, 64], [128, 64]]];
    for (const pth of paths) { g.beginPath(); pth.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); const [ex, ey] = pth[pth.length - 1]; g.beginPath(); g.arc(ex, ey, 4, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'rune') {
    g.strokeStyle = c1; g.lineWidth = 2.5; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const x = 22 + (k % 3) * 42, y = 32 + Math.floor(k / 3) * 64;
      g.beginPath(); g.arc(x, y, 9, k * 0.7, k * 0.7 + 4.2); g.stroke();
      g.beginPath(); g.moveTo(x - 12, y + 14); g.lineTo(x, y - 16); g.lineTo(x + 12, y + 14); g.stroke();
      g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x + 6, y + 4); g.stroke();
    }
  } else if (kind === 'filigree') {
    g.strokeStyle = c1; g.lineWidth = 2.5; g.lineCap = 'round';
    for (const [x, y, f] of [[32, 32, 1], [96, 96, -1], [96, 32, 1], [32, 96, -1]]) { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i * 0.28 * f, r = 2 + i * 0.45; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
    g.beginPath(); g.moveTo(0, 64); g.bezierCurveTo(32, 40, 96, 88, 128, 64); g.stroke();
  } else if (kind === 'wave') {
    g.strokeStyle = c1; g.lineWidth = 4;
    for (let y = 16; y < s; y += 32) { g.beginPath(); for (let x = 0; x <= s; x += 4) { const yy = y + Math.sin((x / s) * Math.PI * 4) * 6; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
  }
}, { repeat: true });

// สไปรต์อนุภาคสีขาว (ย้อมสีทีหลัง)
const spriteTex = (kind) => ctex('sp' + kind, 64, 64, (g, s) => {
  const c = s / 2; g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  if (kind === 'heart') { g.beginPath(); g.moveTo(c, s * 0.82); g.bezierCurveTo(s * 0.05, s * 0.45, s * 0.2, s * 0.08, c, s * 0.3); g.bezierCurveTo(s * 0.8, s * 0.08, s * 0.95, s * 0.45, c, s * 0.82); g.fill(); }
  else if (kind === 'note') { g.beginPath(); g.ellipse(s * 0.36, s * 0.72, 11, 8, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(s * 0.47, s * 0.16, 5, s * 0.56); g.beginPath(); g.moveTo(s * 0.5, s * 0.16); g.quadraticCurveTo(s * 0.8, s * 0.24, s * 0.74, s * 0.46); g.lineWidth = 5; g.stroke(); }
  else if (kind === 'petal') { g.beginPath(); g.moveTo(c, s * 0.1); g.bezierCurveTo(s * 0.85, s * 0.3, s * 0.7, s * 0.85, c, s * 0.9); g.bezierCurveTo(s * 0.3, s * 0.85, s * 0.15, s * 0.3, c, s * 0.1); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(c - 6, s * 0.06); g.lineTo(c, s * 0.2); g.lineTo(c + 6, s * 0.06); g.fill(); }
  else if (kind === 'leaf') { g.beginPath(); g.moveTo(c, s * 0.05); g.quadraticCurveTo(s * 0.95, s * 0.45, c, s * 0.95); g.quadraticCurveTo(s * 0.05, s * 0.45, c, s * 0.05); g.fill(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 2; g.beginPath(); g.moveTo(c, s * 0.1); g.lineTo(c, s * 0.9); g.stroke(); }
  else if (kind === 'bubble') { g.lineWidth = 3; g.globalAlpha = 0.9; g.beginPath(); g.arc(c, c, s * 0.4, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1; g.beginPath(); g.ellipse(s * 0.38, s * 0.34, 6, 4, -0.6, 0, Math.PI * 2); g.fill(); }
  else if (kind === 'coin') { g.beginPath(); g.arc(c, c, s * 0.42, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, s * 0.3, 0, Math.PI * 2); g.stroke(); g.fillRect(c - 2, c - 10, 4, 20); }
  else if (kind === 'butterfly') { for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(c + sx * 13, c - 8, 13, 15, sx * 0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(c + sx * 10, c + 12, 8, 10, -sx * 0.4, 0, Math.PI * 2); g.fill(); } }
  else if (kind === 'square') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(14, 14, 36, 36); g.lineWidth = 5; g.strokeRect(14, 14, 36, 36); }
  else if (kind === 'sprinkle') { g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 44); g.lineTo(44, 20); g.stroke(); }
  else if (kind === 'bolt') { g.beginPath(); g.moveTo(38, 0); g.lineTo(18, 30); g.lineTo(31, 30); g.lineTo(20, 64); g.lineTo(47, 23); g.lineTo(34, 23); g.lineTo(46, 0); g.fill(); }
  else if (kind === 'smoke') { g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s); }
  else if (kind === 'flame') { g.fillStyle = radial(g, c, s * 0.62, s * 0.4, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]); g.beginPath(); g.moveTo(c, s * 0.04); g.bezierCurveTo(s * 0.86, s * 0.48, s * 0.82, s * 0.96, c, s * 0.96); g.bezierCurveTo(s * 0.18, s * 0.96, s * 0.14, s * 0.48, c, s * 0.04); g.fill(); }
});

// ใบหน้าเล็ก ๆ ของสัตว์เลี้ยง (ตาโต + แก้มแดง)
const petFaceTex = (eye = '#2a1830', mouth = true) => ctex('pf' + eye + mouth, 128, 64, (g) => {
  for (const x of [40, 88]) { g.fillStyle = eye; g.beginPath(); g.ellipse(x, 30, 10, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3, 25, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,120,150,0.55)'; for (const x of [22, 106]) { g.beginPath(); g.ellipse(x, 44, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
  if (mouth) { g.strokeStyle = eye; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(58, 44); g.quadraticCurveTo(64, 50, 70, 44); g.stroke(); }
});

/* ---------- อนุภาคของชุด (ปล่อยในพื้นที่โลก ให้ทิ้งร่องรอยตามตัวละคร) ---------- */
const PTEX = { dot: () => TX.softDot(), star: () => TX.star4(), snow: () => TX.snowflake(), feather: () => TX.feather(), heart: () => spriteTex('heart'), note: () => spriteTex('note'), petal: () => spriteTex('petal'), leaf: () => spriteTex('leaf'), bubble: () => spriteTex('bubble'), coin: () => spriteTex('coin'), smoke: () => spriteTex('smoke'), flame: () => spriteTex('flame'), square: () => spriteTex('square'), sprinkle: () => spriteTex('sprinkle') };

class Runtime {
  constructor(world) {
    this.world = world; this.anims = []; this.systems = new Map(); this.time = 0; this.scale = 420; this.tmp = V();
  }
  ps(kind, blending = THREE.AdditiveBlending, max = 400) {
    const key = kind + blending;
    if (!this.systems.has(key)) {
      const p = new Particles(this.world, max, PTEX[kind](), blending);
      p.mat.uniforms.scale.value = this.scale;
      p.points.renderOrder = 6;
      this.systems.set(key, p);
    }
    return this.systems.get(key);
  }
  pixelScale(k) { for (const p of this.systems.values()) p.mat.uniforms.scale.value = this.scale * k; }
  setViewport(height, fovDeg) { this.scale = height / (2 * Math.tan((fovDeg * Math.PI) / 360)); for (const p of this.systems.values()) p.mat.uniforms.scale.value = this.scale; }
  on(fn) { this.anims.push(fn); }
  worldPos(obj) { return obj.getWorldPosition(V()); }
  update(dt, view) {
    this.time += dt;
    const ctx = { t: this.time, dt, walk: view ? view.walkBlend || 0 : 0 };
    for (const fn of this.anims) fn(ctx);
    for (const p of this.systems.values()) p.update(dt);
  }
  dispose() {
    for (const p of this.systems.values()) { this.world.remove(p.points); p.points.geometry.dispose(); p.mat.dispose(); }
    this.systems.clear(); this.anims = [];
  }
}

/* ================= ปีก ================= */
// จุดยึดปีก: กลางหลังระดับสะบัก
function wingRoot(rig, rt, { spread = 0.45, flap = 1, speed = 1, lift = 0 } = {}) {
  const root = group(rig.torso, 0, 0.3 + lift, -0.19);
  const sides = [-1, 1].map((s) => ({ s, pivot: group(root, s * 0.05, 0, 0, [0, s * spread, 0]) }));
  rt.on(({ t, walk }) => {
    const w = (2.2 + walk * 3.5) * speed;
    for (const { s, pivot } of sides) {
      pivot.rotation.y = s * (spread + Math.sin(t * w) * (0.1 + walk * 0.12) * flap);
      pivot.rotation.z = s * Math.sin(t * w + 0.7) * 0.05 * flap;
    }
    root.position.y = 0.3 + lift + Math.sin(t * w) * 0.012;
  });
  return sides;
}

const featherGeo = sph(1, 10, 6).translate(0, -1, 0);
// ปีกขนนก 3 แถว (เทวดา อีกา ฟีนิกซ์ ซากุระ ใบไม้ ปีกเล็ก)
function wingFeather(rig, p, rt) {
  const size = p.size || 1, width = p.width || 1;
  const cols = p.colors || ['#ffffff', '#f2f4ff', '#dfe6ff'];
  const mats = cols.map((c) => (p.glow ? G(c, p.glow) : T(c)));
  const boneMat = p.glow ? G(p.bone || cols[0], p.glow) : T(p.bone || shadeHex(cols[0], -0.15));
  const rows = p.rows || [[7, 0.12, 0.17], [8, 0.2, 0.33], [9, 0.3, 0.6]];
  const tips = [];
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.45, flap: p.flap ?? 1, speed: p.speed ?? 1, lift: p.lift || 0 })) {
    const W = group(pivot);
    const bone = (t) => V(s * (0.03 + 0.62 * t) * size, (0.05 + 0.42 * Math.sin(t * Math.PI * 0.62)) * size - 0.12 * t * t * size, -0.03 * t);
    taper(W, Array.from({ length: 7 }, (_, i) => bone(i / 6)), 0.026 * size, 0.008 * size, boneMat);
    rows.forEach(([n, l0, l1], r) => {
      for (let i = 0; i < n; i++) {
        const t = (r === 2 ? 0.12 : 0.04) + (r === 2 ? 0.88 : 0.9) * (i / (n - 1));
        const pp = bone(t);
        const L = (l0 + (l1 - l0) * Math.pow(t, 1.2)) * size;
        const m = mesh(featherGeo, mats[r], W, pp.x, pp.y - r * 0.02 * size, -0.012 * (2 - r) - 0.004 * i, { s: [0.042 * size * width * (r === 2 ? 1.05 : 1), L / 2, 0.012 * size] });
        m.rotation.z = s * (0.12 + 1.1 * Math.pow(t, 1.5)) - s * 0.08 * r;
        if (r === 2 && i >= n - 3) { const tip = new THREE.Object3D(); tip.position.set(Math.sin(m.rotation.z) * L, -Math.cos(m.rotation.z) * L, 0).add(pp); W.add(tip); tips.push(tip); }
      }
    });
    bake(W, { thick: 0.008 });
  }
  if (p.particle) {
    const { kind, color, rate = 0.5, blending, up = 0.4, gravity = 0, size: ps = [0.1, 0.2], life = [0.6, 1.1] } = p.particle;
    rt.on(({ dt }) => {
      if (Math.random() > rate * dt * 60) return;
      const tip = tips[(Math.random() * tips.length) | 0];
      rt.ps(kind, blending).emit({ pos: rt.worldPos(tip), count: 1, speed: 0.2, up, gravity, drag: 0.5, life, size: ps, sizeEnd: 0.4, color, colorEnd: p.particle.colorEnd || color });
    });
  }
}

// ปีกพังผืด (ปีศาจ มังกร ค้างคาวน้อย)
function wingMembrane(rig, p, rt) {
  const size = p.size || 1;
  const memMat = DS(p.membrane || '#5a2a6a', p.memGlow ? { emissive: p.membrane, emissiveIntensity: p.memGlow } : {});
  const boneMat = T(p.bone || '#2a1830'), clawMat = T(p.claw || '#e8e0d0');
  const P = { S: [0, 0], E: [0.22, 0.24], W: [0.42, 0.36], F: [[0.8, 0.46], [0.9, 0.06], [0.7, -0.32], [0.38, -0.44]], B: [0.04, -0.14] };
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.5, flap: p.flap ?? 1.2, speed: p.speed ?? 0.9 })) {
    const W = group(pivot);
    const v = ([x, y], z = 0) => V(s * x * size, y * size, z);
    const geo = shapeGeo((sh) => {
      sh.moveTo(...P.S); sh.lineTo(...P.E); sh.lineTo(...P.W); sh.lineTo(...P.F[0]);
      for (let i = 1; i < P.F.length; i++) {
        const a = P.F[i - 1], b = P.F[i];
        const mx = (a[0] + b[0]) / 2 * 0.62 + P.W[0] * 0.38, my = (a[1] + b[1]) / 2 * 0.62 + P.W[1] * 0.38;
        sh.quadraticCurveTo(mx, my, b[0], b[1]);
      }
      sh.quadraticCurveTo(0.24, -0.16, ...P.B); sh.lineTo(...P.S);
    });
    const m = mesh(geo, memMat, W, 0, 0, -0.005, { s: [s * size, size, 1], noOutline: true });
    m.castShadow = true;
    taper(W, [v(P.S), v(P.E), v(P.W)], 0.034 * size, 0.024 * size, boneMat, { cap: false });
    for (const f of P.F) taper(W, [v(P.W), v([(P.W[0] + f[0]) / 2 + 0.02, (P.W[1] + f[1]) / 2 + 0.03]), v(f)], 0.02 * size, 0.006 * size, boneMat);
    const claw = mesh(cone(0.026 * size, 0.1 * size, 6), clawMat, W, ...v([P.W[0], P.W[1] + 0.06]).toArray());
    claw.rotation.z = -s * 0.3;
    if (p.spikes) for (let i = 1; i <= 3; i++) { const q = v([P.S[0] + (P.W[0] - P.S[0]) * i / 4, P.S[1] + (P.W[1] - P.S[1]) * i / 4 + 0.03]); mesh(cone(0.02 * size, 0.08 * size, 5), clawMat, W, q.x, q.y, q.z, { r: [0, 0, -s * 0.5] }); }
    if (p.edgeGlow) {
      const edge = mesh(geo, unlit(p.edgeGlow, { opacity: p.edgeOpacity ?? 0.35, add: true }), W, 0, 0, -0.018, { s: [s * size * 1.04, size * 1.04, 1], keep: true });
      edge.renderOrder = 4;
    }
    bake(W, { thick: 0.008 });
  }
}

// ปีกแผ่นภาพ (ผีเสื้อ จักรวาล โฮโลแกรม)
function wingShape(rig, p, rt) {
  const size = p.size || 1;
  const texFor = () => (p.tex === 'cosmic' ? cosmicTex() : p.tex === 'holo' ? holoTex(p.color) : p.tex === 'candy' ? candyTex(p.c1, p.c2) : butterflyTex(p.key, p.c1, p.c2, p.edge, p.dots));
  const mat = unlit(p.tex === 'holo' ? p.color : '#ffffff', { map: texFor(), opacity: p.opacity ?? 0.95, add: p.tex === 'holo' });
  const glow = p.glowColor ? unlit(p.glowColor, { map: TX.softDot(), opacity: 0.5, add: true }) : null;
  const lobes = p.lobes || 'butterfly';
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.35, flap: p.flap ?? 2.6, speed: p.speed ?? 1.6 })) {
    const W = group(pivot);
    const geos = lobes === 'butterfly' ? [
      shapeGeo((sh) => { sh.moveTo(0, 0.02); sh.bezierCurveTo(0.2, 0.55, 0.62, 0.72, 0.8, 0.5); sh.bezierCurveTo(0.86, 0.3, 0.55, 0.06, 0.04, -0.02); }),
      shapeGeo((sh) => { sh.moveTo(0.02, -0.04); sh.bezierCurveTo(0.42, -0.06, 0.62, -0.32, 0.46, -0.52); sh.bezierCurveTo(0.3, -0.62, 0.1, -0.36, 0.02, -0.04); }),
    ] : [shapeGeo((sh) => { sh.moveTo(0, 0); sh.bezierCurveTo(0.25, 0.55, 0.7, 0.68, 0.95, 0.62); sh.bezierCurveTo(0.8, 0.4, 0.86, 0.1, 0.72, -0.08); sh.bezierCurveTo(0.6, -0.18, 0.64, -0.38, 0.42, -0.52); sh.bezierCurveTo(0.3, -0.36, 0.14, -0.2, 0, -0.06); })];
    for (const geo of geos) {
      const m = mesh(geo, mat, W, 0, 0, 0, { s: [s * size, size, 1], keep: true, shadow: false });
      m.renderOrder = 3;
    }
    if (glow) { const gl = mesh(new THREE.PlaneGeometry(1, 1), glow, W, s * 0.4 * size, 0.1 * size, -0.01, { s: [1.3 * size, 1.4 * size, 1], keep: true, shadow: false }); gl.renderOrder = 2; }
    const tip = new THREE.Object3D(); tip.position.set(s * 0.7 * size, 0.4 * size, 0); W.add(tip);
    if (p.sparkle) rt.on(({ dt }) => { if (Math.random() < dt * 8) rt.ps('star').emit({ pos: rt.worldPos(tip).add(V(rand(-0.3, 0.3), rand(-0.6, 0.1), rand(-0.1, 0.1))), count: 1, speed: 0.1, life: [0.5, 0.9], size: [0.12, 0.22], color: p.sparkle }); });
  }
}

// ปีกเศษผลึก/ใบมีด (คริสตัล น้ำแข็ง จักรกล)
function wingShard(rig, p, rt) {
  const size = p.size || 1, n = p.count || 7;
  const metal = p.style === 'metal';
  const mat = metal ? T(p.color, { emissive: '#1a1206' }) : toon(p.color, { emissive: p.color, emissiveIntensity: p.glow ?? 0.8, transparent: true, opacity: p.opacity ?? 0.88 });
  const trim = metal ? T(p.trim || '#e8c050', { emissive: '#2a1e00' }) : G(p.trim || '#ffffff', 1.4);
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.5, flap: p.flap ?? 0.6, speed: p.speed ?? 0.7 })) {
    const W = group(pivot);
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const a = 0.95 - k * 1.9;                       // จากชี้ขึ้นเฉียงไปชี้ลงเฉียง
      const L = (0.62 - Math.abs(k - 0.25) * 0.45) * size;
      const dir = V(s * Math.cos(a), Math.sin(a), 0);
      const g = metal ? box(0.07 * size, L, 0.02 * size).translate(0, L / 2, 0) : oct(1).scale(0.055 * size, L / 2, 0.022 * size).translate(0, L / 2, 0);
      const m = mesh(g, mat, W, dir.x * 0.08 * size, dir.y * 0.08 * size, -0.01 * i, { noOutline: !metal });
      m.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
      if (metal) { const e = mesh(box(0.012 * size, L * 0.9, 0.024 * size).translate(0, L * 0.47, 0), trim, W, m.position.x, m.position.y, m.position.z); e.quaternion.copy(m.quaternion); }
    }
    if (metal) {
      const gear = group(W, 0, 0, 0.01);
      mesh(torus(0.08 * size, 0.022 * size, 6, 16), trim, gear);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mesh(box(0.03 * size, 0.04 * size, 0.03 * size), trim, gear, Math.cos(a) * 0.105 * size, Math.sin(a) * 0.105 * size, 0, { r: [0, 0, a] }); }
      mesh(cyl(0.03 * size, 0.03 * size, 0.04 * size), T('#5a4a3a'), gear, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
      bake(gear);
      rt.on(({ t }) => { gear.rotation.z = t * 1.6 * s; });
    } else mesh(oct(0.06 * size), trim, W, 0, 0, 0.01, { noOutline: true });
    if (metal) bake(W, { thick: 0.007 });
    if (p.particle) {
      const tip = new THREE.Object3D(); tip.position.set(s * 0.45 * size, 0.2 * size, 0); W.add(tip);
      rt.on(({ dt }) => { if (Math.random() < dt * 6) rt.ps(p.particle.kind).emit({ pos: rt.worldPos(tip).add(V(rand(-0.25, 0.25), rand(-0.5, 0.3), 0)), count: 1, speed: 0.15, gravity: p.particle.gravity || 0, life: [0.6, 1.1], size: p.particle.size || [0.1, 0.18], color: p.particle.color }); });
    }
  }
}

// ปีกจักรกลไอน้ำ: แขนโลหะโค้ง + ขนนกแผ่นทองเหลืองเรียงเป็นชั้น + เฟืองหมุนที่ไหล่และข้อศอก + ไอน้ำพ่นเป็นระยะ
function wingClock(rig, p, rt) {
  const size = p.size || 1;
  const brass = T(p.color || '#c8a060', { emissive: '#2a1a06' }), copper = T(p.copper || '#c87a4a', { emissive: '#2a1006' });
  const trim = T(p.trim || '#f0d070', { emissive: '#3a2a00' }), dark = T('#4a3a30');
  // แผ่นขนนกโลหะ: ใบเรียวปลายมน มีร่องกลาง
  const plate = (L, w) => extrude((sh) => { sh.moveTo(-w * 0.5, 0); sh.lineTo(w * 0.5, 0); sh.quadraticCurveTo(w * 0.62, -L * 0.6, 0, -L); sh.quadraticCurveTo(-w * 0.62, -L * 0.6, -w * 0.5, 0); }, 0.012, 0.004);
  const vents = [];
  const gearAt = (W, x, y, r, teeth, mat, spin) => {
    const g = group(W, x, y, 0.025);
    mesh(cyl(r, r, 0.03, 18), mat, g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; mesh(box(r * 0.3, r * 0.34, 0.03), mat, g, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, 0, { r: [0, 0, a] }); }
    mesh(cyl(r * 0.35, r * 0.35, 0.04, 10), dark, g, 0, 0, 0.004, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; mesh(box(r * 0.16, r * 0.62, 0.034), dark, g, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, 0, { r: [0, 0, a + Math.PI / 2] }); }
    bake(g, { thick: 0.006 });
    rt.on(({ t }) => { g.rotation.z = t * spin; });
    return g;
  };
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.5, flap: p.flap ?? 0.5, speed: p.speed ?? 0.8 })) {
    const W = group(pivot);
    const arm = (t) => V(s * (0.04 + 0.66 * t) * size, (0.04 + 0.4 * Math.sin(t * Math.PI * 0.6)) * size - 0.1 * t * t * size, -0.02 * t);
    taper(W, Array.from({ length: 7 }, (_, i) => arm(i / 6)), 0.03 * size, 0.014 * size, brass, { cap: false });
    // หมุดย้ำตามแขน
    for (let i = 1; i < 6; i++) { const q = arm(i / 6); mesh(sph(0.018 * size, 8, 6), trim, W, q.x, q.y, q.z + 0.02); }
    // ขนโลหะสองชั้น (ชั้นในทองแดงสั้น ชั้นนอกทองเหลืองยาว)
    for (const [n, l0, l1, mat, z, w] of [[6, 0.16, 0.3, copper, 0.004, 0.075], [8, 0.24, 0.58, brass, -0.012, 0.09]]) {
      for (let i = 0; i < n; i++) {
        const t = 0.08 + 0.9 * (i / (n - 1)), q = arm(t), L = (l0 + (l1 - l0) * Math.pow(t, 1.1)) * size;
        const m = mesh(plate(L, w * size), mat, W, q.x, q.y, q.z + z - 0.006 * i);
        m.rotation.z = s * (0.1 + 1.05 * Math.pow(t, 1.4));
        if (mat === brass) { const line = mesh(box(0.01 * size, L * 0.72, 0.02), trim, W, q.x, q.y, q.z + z - 0.006 * i + 0.004); line.geometry.translate(0, -L * 0.36, 0); line.rotation.z = m.rotation.z; }
      }
    }
    bake(W, { thick: 0.007 });
    gearAt(W, s * 0.02 * size, 0.02 * size, 0.085 * size, 10, trim, 1.4 * s);
    const elbow = arm(0.55);
    gearAt(W, elbow.x, elbow.y, 0.05 * size, 8, copper, -2.2 * s);
    const tip = arm(1), v = new THREE.Object3D(); v.position.set(tip.x, tip.y, tip.z); W.add(v); vents.push(v);
  }
  // ไอน้ำพ่นจากปลายปีกเป็นจังหวะ
  let puff = 0;
  rt.on(({ dt }) => {
    puff -= dt; if (puff > 0) return; puff = 1.4 + Math.random() * 0.8;
    for (const v of vents) rt.ps('smoke', THREE.NormalBlending).emit({ pos: rt.worldPos(v), count: 4, vel: () => V(rand(-0.15, 0.15), rand(0.25, 0.5), rand(-0.15, 0.15)), drag: 0.8, life: [0.8, 1.3], size: [0.12, 0.2], sizeEnd: 2.2, color: '#f2eee8', alpha: 0.5 });
  });
}

export const WING_BUILDERS = { feather: wingFeather, membrane: wingMembrane, shape: wingShape, shard: wingShard, clock: wingClock };

/* ================= หมวก / เครื่องประดับหัว (พิกัดของหัว: ศูนย์กลางหัว y=0.2 รัศมี 0.26) ================= */
const metal = (c, glow = 0) => { const m = T(c, { emissive: shadeHex(c, -0.75), emissiveIntensity: 1 + glow }); m.userData.pxMetal = true; return m; };   // v0.17: สไปรต์พิกเซลลงเงาแบบโลหะมันวาว
const gem = (c, i = 1.1) => G(c, i);
function flower(parent, x, y, z, color, r = 0.04, center = '#ffd34d', rot = [0, 0, 0]) {
  const f = group(parent, x, y, z, rot);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mesh(sph(r, 8, 6), T(color), f, Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05, 0, { s: [1, 1, 0.45] }); }
  mesh(sph(r * 0.6, 8, 6), T(center), f, 0, 0, r * 0.25);
  return f;
}

const HEAD = {
  crown(rig, p) {
    const gold = metal(p.gold || '#ffcf4a'), g = group(rig.head, 0, 0.43, -0.01, [-0.16, 0, 0]);
    mesh(cyl(0.2, 0.19, 0.1, 24, true), toon(p.gold || '#ffcf4a', { side: THREE.DoubleSide, emissive: '#3a2a00' }), g, 0, 0, 0, { noOutline: true });
    for (const y of [-0.05, 0.05]) mesh(torus(0.2, 0.013, 6, 28), gold, g, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    const pts = p.points || 8;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      mesh(cone(0.034, 0.12, 6), gold, g, Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2);
      mesh(sph(0.02, 8, 6), gem(i % 2 ? p.gem2 || '#7fd0ff' : p.gem || '#ff4a6a'), g, Math.sin(a) * 0.2, 0.17, Math.cos(a) * 0.2, { noOutline: true });
    }
    mesh(oct(0.045), gem(p.gem || '#ff4a6a', 1.4), g, 0, 0, 0.205, { s: [1, 1.3, 0.6], noOutline: true });
    bake(g);
  },
  flowerCrown(rig, p) {
    const g = group(rig.head, 0, 0.34, -0.01, [Math.PI / 2 - 0.22, 0, 0]);
    mesh(torus(0.268, 0.022, 6, 28), T(p.vine || '#4a8a3a'), g);
    const cols = p.colors || ['#ff8fb8', '#ffffff', '#ffd34d', '#b48cff'];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      flower(g, Math.cos(a) * 0.27, Math.sin(a) * 0.27, -0.02, cols[i % cols.length], 0.038, '#ffe08a', [0, 0, a]);
      mesh(sph(0.03, 6, 4), T('#5aa04a'), g, Math.cos(a + 0.33) * 0.275, Math.sin(a + 0.33) * 0.275, 0, { s: [1.6, 0.6, 0.4] });
    }
    bake(g);
  },
  halo(rig, p, rt) {
    const g = group(rig.head, 0, 0.7, -0.04, [Math.PI / 2 - 0.3, 0, 0]);
    mesh(torus(0.17, 0.022, 10, 32), G(p.color || '#ffe08a', 1.6), g, 0, 0, 0, { noOutline: true });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softRing(), color: lin(p.color || '#ffe08a'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(0.62); rig.head.add(glow); glow.position.set(0, 0.7, -0.04);
    rt.on(({ t }) => { const y = 0.7 + Math.sin(t * 2) * 0.02; g.position.y = y; glow.position.y = y; g.rotation.z = t * 0.6; glow.material.opacity = 0.55 + Math.sin(t * 3) * 0.15; });
  },
  horns(rig, p) {
    const m = T(p.color || '#3a1a2a', { emissive: p.glow || '#000000', emissiveIntensity: p.glow ? 0.5 : 0 });
    const tipM = T(p.tip || '#e8e0d0');
    const g = group(rig.head);
    for (const s of [-1, 1]) {
      const b = V(s * 0.16, 0.42, 0.03);
      const pts = bez3(b, b.clone().add(V(s * 0.06, 0.12, -0.02)), b.clone().add(V(s * 0.17, 0.18, -0.12)), b.clone().add(V(s * (p.curl ? 0.08 : 0.15), 0.3, p.curl ? -0.28 : -0.22)), 9);
      const parts = taper(g, pts, 0.05, 0.006, m);
      parts[parts.length - 1].material = tipM;
      for (let i = 2; i < 7; i += 2) mesh(torus(0.05 - i * 0.005, 0.008, 5, 12), tipM, g, pts[i].x, pts[i].y, pts[i].z, { r: [Math.PI / 2, 0, 0] });
    }
    bake(g);
  },
  catEars(rig, p, rt, L) {
    const c = p.color || L.hair, g = group(rig.head);
    for (const s of [-1, 1]) {
      const e = group(g, s * 0.17, 0.5, -0.02, [0.1, 0, -s * 0.38]);
      mesh(cone(0.1, 0.22, 3), T(c), e, 0, 0, 0, { r: [0, Math.PI / 6, 0], s: [1, 1, 0.55] });
      mesh(cone(0.062, 0.14, 3), T(p.inner || '#ffb0c8'), e, 0, -0.015, 0.03, { r: [0, Math.PI / 6, 0], s: [1, 1, 0.3] });
      if (p.tip) mesh(cone(0.04, 0.07, 3), T(p.tip), e, 0, 0.078, 0.002, { r: [0, Math.PI / 6, 0], s: [1.02, 1, 0.57] });
      bake(e);
    }
    if (p.bell) mesh(sph(0.035, 10, 8), metal('#ffcf4a'), rig.head, 0, -0.06, 0.2);
  },
  bunnyEars(rig, p, rt, L) {
    const c = p.color || '#ffffff', g = group(rig.head);
    const ears = [-1, 1].map((s) => {
      const e = group(g, s * 0.08, 0.46, -0.05, [-0.15, 0, -s * 0.18]);
      mesh(sph(1, 12, 8), T(c), e, 0, 0.17, 0, { s: [0.055, 0.19, 0.035] });
      mesh(sph(1, 10, 6), T(p.inner || '#ffb0c8'), e, 0, 0.17, 0.02, { s: [0.032, 0.15, 0.02] });
      bake(e);
      return e;
    });
    ears[1].rotation.z = -0.5; ears[1].position.x += 0.02;
    rt.on(({ t }) => { ears[0].rotation.x = -0.15 + Math.sin(t * 2.4) * 0.05; ears[1].rotation.x = -0.15 + Math.sin(t * 2.4 + 1) * 0.07; });
    if (p.bow) { const b = group(rig.head, 0.02, 0.48, -0.04); for (const s of [-1, 1]) mesh(sph(0.04, 8, 6), T(p.bow), b, s * 0.045, 0, 0, { s: [1.3, 0.8, 0.5] }); mesh(sph(0.02, 8, 6), T(p.bow), b); bake(b); }
  },
  foxEars(rig, p, rt, L) {
    HEAD.catEars(rig, { color: p.color || '#f08a3a', inner: p.inner || '#fff2e0', tip: p.tip || '#3a2a20' }, rt, L);
  },
  witchHat(rig, p) {
    const c = p.color || '#3a2a5a', g = group(rig.head, 0, 0.38, -0.01, [-0.12, 0, 0.06]);
    mesh(cyl(0.44, 0.44, 0.022, 32), T(c), g);
    mesh(cyl(0.13, 0.22, 0.26, 22), T(c), g, 0, 0.14, 0);
    const tip = group(g, 0, 0.27, 0, [0, 0, -0.55]);
    mesh(cone(0.13, 0.34, 18), T(c), tip, 0.05, 0.13, 0);
    mesh(cyl(0.222, 0.224, 0.055, 22), T(p.band || '#c94a7a'), g, 0, 0.04, 0);
    mesh(box(0.08, 0.06, 0.02), metal('#ffcf4a'), g, 0, 0.04, 0.22);
    if (p.star) mesh(extrude((sh) => starShape(sh, 0.045, 0.02), 0.012, 0.004), gem(p.star, 1.3), g, 0.1, 0.2, 0.12, { r: [0, 0.4, 0] });
    bake(tip); bake(g);
  },
  tricorn(rig, p) {
    const c = p.color || '#2a2230', trim = metal('#ffcf4a'), g = group(rig.head, 0, 0.42, -0.01, [-0.1, 0, 0]);
    mesh(cyl(0.22, 0.24, 0.12, 20), T(c), g, 0, 0.04, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const f = group(g, Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2, [0, a, 0]);
      mesh(box(0.34, 0.13, 0.025), T(c), f, 0, 0.04, 0, { r: [-0.55, 0, 0] });
      mesh(box(0.34, 0.016, 0.03), trim, f, 0, 0.1, -0.035, { r: [-0.55, 0, 0] });
      bake(f);
    }
    mesh(sph(0.04, 10, 8), T('#f2ece0'), g, 0, 0.06, 0.24, { s: [1, 1.1, 0.4] });
    const plume = group(g, -0.16, 0.12, -0.05, [0.6, 0, 0.5]);
    for (let i = 0; i < 6; i++) mesh(sph(0.045, 8, 6), T(p.plume || '#d8433a'), plume, 0, i * 0.05, -i * i * 0.006, { s: [1, 1.6, 0.4] });
    bake(plume); bake(g);
  },
  topHat(rig, p) {
    const c = p.color || '#1e1a26', g = group(rig.head, 0, 0.44, 0, [-0.12, 0, -0.1]);
    mesh(cyl(0.3, 0.3, 0.02, 28), T(c), g);
    mesh(cyl(0.17, 0.16, 0.3, 24), T(c), g, 0, 0.16, 0);
    mesh(cyl(0.165, 0.165, 0.055, 24), T(p.band || '#c93a4a'), g, 0, 0.04, 0);
    flower(g, 0.15, 0.06, 0.06, p.rose || '#d8233a', 0.03, '#a8102a', [0, 0.9, 0]);
    bake(g);
  },
  strawHat(rig, p) {
    const straw = TM(p.color || '#f0d48a', ctex('straw', 64, 64, (gg, s) => { gg.fillStyle = '#fff'; gg.fillRect(0, 0, s, s); gg.strokeStyle = 'rgba(160,120,60,0.45)'; gg.lineWidth = 2; for (let i = 0; i < s; i += 6) { gg.beginPath(); gg.moveTo(i, 0); gg.lineTo(i, s); gg.stroke(); gg.beginPath(); gg.moveTo(0, i); gg.lineTo(s, i); gg.stroke(); } }, { repeat: true }));
    const g = group(rig.head, 0, 0.39, 0, [-0.1, 0, 0.05]);
    mesh(cyl(0.46, 0.46, 0.016, 32), straw, g);
    mesh(new THREE.SphereGeometry(0.21, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), straw, g, 0, 0.0, 0, { s: [1, 0.75, 1] });
    mesh(cyl(0.212, 0.212, 0.05, 22), T(p.band || '#d8433a'), g, 0, 0.03, 0);
    if (p.flower) flower(g, 0.18, 0.06, 0.1, p.flower, 0.04);
    bake(g);
  },
  beret(rig, p) {
    const c = p.color || '#c93a4a', g = group(rig.head, -0.03, 0.4, -0.02, [0.1, 0, 0.22]);
    mesh(sph(0.29, 22, 10), T(c), g, 0, 0, 0, { s: [1.1, 0.42, 1.1] });
    mesh(cyl(0.012, 0.012, 0.06, 6), T(shadeHex(c, -0.3)), g, 0, 0.13, 0);
    if (p.pin) mesh(extrude((sh) => starShape(sh, 0.035, 0.016), 0.01, 0.003), gem(p.pin, 1.2), g, 0.18, 0.04, 0.2, { r: [0, 0.6, 0] });
    bake(g);
  },
  mushroom(rig, p) {
    const g = group(rig.head, 0, 0.45, -0.01, [-0.1, 0, 0.08]);
    mesh(new THREE.SphereGeometry(0.33, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), T(p.color || '#e8433a'), g, 0, 0, 0, { s: [1, 0.62, 1] });
    mesh(cyl(0.33, 0.24, 0.03, 24), T('#f2e6d0'), g, 0, -0.01, 0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, e = i % 3 === 0 ? 0.35 : 0.85;
      const n = V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
      const d = mesh(sph(0.045, 8, 6), T(p.dots || '#ffffff'), g, n.x * 0.33, n.y * 0.205, n.z * 0.33, { s: [1, 0.35, 1] });
      d.lookAt(d.position.clone().multiplyScalar(2));
    }
    bake(g);
  },
  pumpkin(rig, p, rt) {
    const g = group(rig.head, 0.05, 0.52, -0.02, [-0.08, 0, 0.12]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; mesh(sph(0.1, 12, 10), T('#f08a2a'), g, Math.sin(a) * 0.09, 0, Math.cos(a) * 0.09, { s: [0.75, 0.82, 0.75] }); }
    mesh(cyl(0.02, 0.03, 0.08, 6), T('#4a7a2a'), g, 0, 0.1, 0, { r: [0, 0, 0.3] });
    mesh(sph(0.05, 8, 6), T('#5aa03a'), g, 0.05, 0.11, 0, { s: [1.3, 0.3, 0.8] });
    const face = G('#ffd34d', 1.5);
    for (const s of [-1, 1]) mesh(cone(0.026, 0.04, 3), face, g, s * 0.045, 0.02, 0.16, { r: [Math.PI / 2, 0, 0], noOutline: true });
    mesh(box(0.09, 0.02, 0.02), face, g, 0, -0.035, 0.16, { noOutline: true });
    bake(g);
  },
  antlers(rig, p, rt) {
    const m = T(p.color || '#8a6a4a'), g = group(rig.head);
    const lights = [];
    for (const s of [-1, 1]) {
      const b = V(s * 0.13, 0.43, -0.02);
      const main = bez3(b, b.clone().add(V(s * 0.08, 0.12, 0)), b.clone().add(V(s * 0.12, 0.24, -0.06)), b.clone().add(V(s * 0.2, 0.36, -0.1)), 7);
      taper(g, main, 0.028, 0.008, m);
      for (const [i, dx, dy] of [[2, 0.1, 0.1], [4, -0.02, 0.14], [5, 0.12, 0.06]]) taper(g, bez(main[i], main[i].clone().add(V(s * dx * 0.5, dy * 0.6, 0.02)), main[i].clone().add(V(s * dx, dy, 0.03)), 4), 0.016, 0.005, m);
      for (const i of [1, 3, 6]) lights.push(main[i]);
    }
    bake(g);
    if (p.glow) {
      const mats = lights.map((q) => { const l = mesh(sph(0.022, 8, 6), G(p.glow, 1.6), rig.head, q.x, q.y + 0.02, q.z + 0.02, { noOutline: true }); return l; });
      rt.on(({ t }) => mats.forEach((l, i) => l.scale.setScalar(0.8 + Math.sin(t * 3 + i) * 0.25)));
    }
    if (p.leaves) for (const s of [-1, 1]) mesh(sph(0.05, 8, 6), T(p.leaves), rig.head, s * 0.22, 0.6, -0.08, { s: [1.4, 0.4, 0.8], r: [0, 0, s * 0.6] });
  },
  iceTiara(rig, p, rt) {
    const g = group(rig.head, 0, 0.35, 0.02, [-0.25, 0, 0]);
    const band = G(p.trim || '#e8f8ff', 0.6), ice = toon(p.color || '#8ad8ff', { emissive: p.color || '#8ad8ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.88 });
    mesh(torus(0.275, 0.014, 6, 28, Math.PI * 1.1), band, g, 0, 0, 0, { r: [Math.PI / 2, 0, Math.PI * -0.05 + Math.PI], noOutline: true });
    const n = 9;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), a = (k - 0.5) * Math.PI * 0.95, h = 0.08 + (1 - Math.abs(k - 0.5) * 2) * 0.14;
      mesh(oct(1), ice, g, Math.sin(a) * 0.275, h / 2, Math.cos(a) * 0.275, { s: [0.022, h / 2, 0.012], r: [0, a, 0] });
    }
    const center = mesh(oct(0.04), G('#ffffff', 1.6), g, 0, 0.26, 0.27, { s: [1, 1.4, 0.6], noOutline: true });
    rt.on(({ t }) => { center.rotation.y = t * 1.5; });
  },
  knightHelm(rig, p) {
    const steel = metal(p.color || '#c8ced8'), trim = metal(p.trim || '#ffcf4a');
    const g = group(rig.head);
    mesh(new THREE.SphereGeometry(0.31, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), steel, g, 0, 0.27, -0.005, { s: [1, 1.0, 1.04] });
    mesh(torus(0.312, 0.022, 6, 28), trim, g, 0, 0.27, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(box(0.035, 0.2, 0.03), trim, g, 0, 0.44, 0.26, { r: [0.55, 0, 0] });
    mesh(box(0.028, 0.07, 0.03), steel, g, 0, 0.25, 0.315);
    for (const s of [-1, 1]) mesh(box(0.05, 0.16, 0.18), steel, g, s * 0.27, 0.13, 0.05, { r: [0, 0, s * 0.08] });
    const plume = group(g, 0, 0.5, -0.02, [-0.3, 0, 0]);
    for (let i = 0; i < 8; i++) mesh(sph(0.05, 8, 6), T(p.plume || '#d8433a'), plume, 0, 0.04 + Math.sin(i * 0.3) * 0.08, -i * 0.05, { s: [0.8, 1.2, 1.4] });
    bake(plume); bake(g);
  },
  aviator(rig, p) {
    const lea = T(p.color || '#7a4a2a'), g = group(rig.head);
    mesh(new THREE.SphereGeometry(0.292, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), lea, g, 0, 0.22, -0.01, { s: [1.02, 1.02, 1.04] });
    for (const s of [-1, 1]) mesh(sph(0.08, 10, 8), lea, g, s * 0.265, 0.13, 0.0, { s: [0.45, 1.2, 1] });
    mesh(torus(0.29, 0.018, 6, 28), T('#3a2a20'), g, 0, 0.36, 0, { r: [Math.PI / 2 - 0.25, 0, 0] });
    const gg = group(g, 0, 0.4, 0.2, [-0.5, 0, 0]);
    for (const s of [-1, 1]) {
      mesh(torus(0.055, 0.016, 8, 16), metal('#c9a24a'), gg, s * 0.075, 0, 0);
      mesh(cyl(0.05, 0.05, 0.01, 16), toon(p.lens || '#7fe0ff', { emissive: p.lens || '#7fe0ff', emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }), gg, s * 0.075, 0, 0, { r: [Math.PI / 2, 0, 0] });
    }
    mesh(box(0.05, 0.02, 0.02), metal('#c9a24a'), gg, 0, 0, 0);
    bake(gg); bake(g);
  },
  bigBow(rig, p) {
    const c = p.color || '#ff5a8a', g = group(rig.head, 0, 0.44, -0.12, [-0.5, 0, 0]);
    for (const s of [-1, 1]) {
      mesh(sph(0.09, 12, 8), T(c), g, s * 0.1, 0.02, 0, { s: [1.3, 0.85, 0.45], r: [0, 0, s * 0.35] });
      mesh(box(0.05, 0.16, 0.015), T(c), g, s * 0.05, -0.1, -0.03, { r: [0.2, 0, s * 0.35] });
    }
    mesh(sph(0.04, 10, 8), T(shadeHex(c, -0.2)), g, 0, 0.02, 0.02);
    if (p.dots) for (const [x, y] of [[-0.12, 0.04], [0.1, 0.0], [0.13, 0.06]]) mesh(sph(0.012, 6, 4), T(p.dots), g, x, y, 0.04, { noOutline: true });
    bake(g);
  },
  bearHood(rig, p) {
    const c = p.color || '#8a5a3a', g = group(rig.head);
    mesh(new THREE.SphereGeometry(0.31, 24, 14, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.62), DS(c), g, 0, 0.2, -0.01, { noOutline: true });
    for (const s of [-1, 1]) {
      mesh(sph(0.075, 12, 8), T(c), g, s * 0.2, 0.46, -0.03, { s: [1, 1, 0.6] });
      mesh(sph(0.045, 10, 6), T(p.inner || '#f2c8a8'), g, s * 0.2, 0.46, 0.005, { s: [1, 1, 0.4] });
    }
    bake(g);
  },
  chada(rig, p, rt) {
    const gold = metal('#ffcf4a', 0.2), red = gem('#e83a4a'), green = gem('#3ac07a');
    const g = group(rig.head, 0, 0.4, -0.01, [-0.1, 0, 0]);
    mesh(cyl(0.215, 0.22, 0.07, 24), gold, g);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mesh(sph(0.016, 6, 4), i % 2 ? red : green, g, Math.sin(a) * 0.222, 0, Math.cos(a) * 0.222, { noOutline: true }); }
    let y = 0.06, r = 0.18;
    for (let k = 0; k < 5; k++) { mesh(cyl(r * 0.85, r, 0.06, 20), gold, g, 0, y, 0); mesh(torus(r * 0.92, 0.01, 5, 18), gold, g, 0, y - 0.03, 0, { r: [Math.PI / 2, 0, 0] }); y += 0.065; r *= 0.74; }
    mesh(cone(r, 0.24, 12), gold, g, 0, y + 0.1, 0);
    mesh(sph(0.018, 8, 6), red, g, 0, y + 0.24, 0, { noOutline: true });
    // กรรเจียกข้างหู
    for (const s of [-1, 1]) {
      const k = mesh(extrude((sh) => { sh.moveTo(0, 0); sh.bezierCurveTo(0.06, 0.04, 0.08, 0.14, 0.02, 0.24); sh.bezierCurveTo(0.0, 0.14, -0.02, 0.08, 0, 0); }, 0.012, 0.004), gold, g, s * 0.22, -0.12, 0.02, { r: [0, s * 1.3, s * 0.35] });
      k.scale.x = s;
    }
    bake(g);
  },
  sprout(rig, p, rt) {
    const g = group(rig.head, 0.03, 0.47, 0);
    taper(g, bez(V(0, 0, 0), V(0.02, 0.06, 0), V(0, 0.12, 0.01), 4), 0.01, 0.008, T('#5aa03a'), { cap: false });
    for (const s of [-1, 1]) mesh(sph(0.055, 10, 6), T(p.color || '#7ad85a'), g, s * 0.05, 0.13, 0, { s: [1, 0.35, 0.6], r: [0, 0, s * 0.5] });
    if (p.flower) flower(g, 0, 0.16, 0.02, p.flower, 0.025);
    bake(g);
    rt.on(({ t }) => { g.rotation.z = Math.sin(t * 2.2) * 0.15; });
  },
  catPhones(rig, p, rt) {
    const c = p.color || '#f2f2f8', glow = p.glow || '#ff7ab8', g = group(rig.head);
    mesh(torus(0.31, 0.028, 6, 24, Math.PI), T(c), g, 0, 0.2, -0.02, { r: [0, 0, 0] });
    for (const s of [-1, 1]) {
      mesh(cyl(0.095, 0.095, 0.07, 18), T(c), g, s * 0.3, 0.2, -0.02, { r: [0, 0, Math.PI / 2] });
      mesh(cyl(0.065, 0.065, 0.075, 16), G(glow, 1.1), g, s * 0.305, 0.2, -0.02, { r: [0, 0, Math.PI / 2], noOutline: true });
      const e = group(g, s * 0.2, 0.5, -0.02, [0, 0, -s * 0.42]);
      mesh(cone(0.09, 0.18, 3), T(c), e, 0, 0, 0, { r: [0, Math.PI / 6, 0], s: [1, 1, 0.5] });
      mesh(cone(0.052, 0.11, 3), G(glow, 1.0), e, 0, -0.012, 0.026, { r: [0, Math.PI / 6, 0], s: [1, 1, 0.3], noOutline: true });
    }
    bake(g);
  },
};

/* ================= ของบนใบหน้า (ตาอยู่ราว y=0.19, x=±0.08, ผิวหน้า z≈0.25) ================= */
const FACE = {
  roundGlasses(rig, p) {
    const fr = metal(p.color || '#c9a24a'), g = group(rig.head, 0, 0.19, 0.262);
    for (const s of [-1, 1]) {
      mesh(torus(0.055, 0.008, 6, 20), fr, g, s * 0.085, 0, 0);
      mesh(cyl(0.05, 0.05, 0.004, 18), toon(p.lens || '#dff4ff', { transparent: true, opacity: 0.35 }), g, s * 0.085, 0, -0.002, { r: [Math.PI / 2, 0, 0] });
      mesh(box(0.008, 0.008, 0.2), fr, g, s * 0.145, 0.01, -0.1, { r: [0, s * 0.25, 0] });
    }
    mesh(torus(0.02, 0.006, 5, 10, Math.PI), fr, g, 0, 0.0, 0);
    bake(g);
  },
  shades(rig, p) {
    const g = group(rig.head, 0, 0.2, 0.258);
    const lens = toon(p.lens || '#1a1a2a', { emissive: p.tint || '#000000', emissiveIntensity: p.tint ? 0.4 : 0 });
    for (const s of [-1, 1]) {
      mesh(sph(1, 14, 8), lens, g, s * 0.085, 0, 0, { s: [0.07, 0.045, 0.012], r: [0, s * 0.18, s * -0.05] });
      mesh(box(0.008, 0.008, 0.2), T('#2a2a30'), g, s * 0.15, 0.015, -0.1, { r: [0, s * 0.25, 0] });
    }
    mesh(box(0.05, 0.012, 0.012), T('#2a2a30'), g, 0, 0.02, 0);
    bake(g);
  },
  foxMask(rig, p) {
    const map = ctex('foxmask' + (p.mark || '#d8233a'), 128, 128, (g, s) => {
      g.fillStyle = '#fffaf2'; g.fillRect(0, 0, s, s);
      g.strokeStyle = p.mark || '#d8233a'; g.fillStyle = p.mark || '#d8233a'; g.lineWidth = 6; g.lineCap = 'round';
      for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(64 + sx * 14, 58); g.quadraticCurveTo(64 + sx * 30, 46, 64 + sx * 44, 56); g.stroke(); g.beginPath(); g.moveTo(64 + sx * 18, 28); g.lineTo(64 + sx * 26, 44); g.stroke(); }
      g.beginPath(); g.ellipse(64, 92, 9, 6, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(64, 14); g.lineTo(58, 30); g.lineTo(70, 30); g.fill();
    });
    const g = group(rig.head, 0.2, 0.3, 0.12, [0, 0.95, 0.25]);
    mesh(sph(1, 16, 12), TM('#ffffff', map), g, 0, 0, 0, { s: [0.11, 0.12, 0.06] });
    mesh(sph(0.05, 10, 8), TM('#ffffff', map), g, 0, -0.04, 0.05, { s: [0.9, 0.7, 1.1] });
    for (const s of [-1, 1]) mesh(cone(0.04, 0.08, 3), T('#fffaf2'), g, s * 0.07, 0.11, 0, { r: [0, 0, -s * 0.3], s: [1, 1, 0.5] });
    bake(g);
  },
  ninjaMask(rig, p) {
    const c = p.color || '#2a2438', g = group(rig.head);
    mesh(new THREE.SphereGeometry(0.268, 24, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.27), DS(c), g, 0, 0.2, 0, { noOutline: true });
    for (const s of [-1, 1]) mesh(box(0.05, 0.18, 0.015), T(c), g, s * 0.04, 0.05, -0.28, { r: [0.4, 0, s * 0.35] });
    bake(g);
  },
  eyePatch(rig, p) {
    const g = group(rig.head);
    mesh(cyl(0.05, 0.05, 0.015, 16), T(p.color || '#1e1a22'), g, -0.085, 0.2, 0.258, { r: [Math.PI / 2, 0, 0] });
    mesh(torus(0.27, 0.007, 5, 32), T('#1e1a22'), g, 0, 0.24, 0, { r: [Math.PI / 2 - 0.35, 0, 0.28] });
    if (p.skull) mesh(sph(0.015, 6, 4), T('#f2ece0'), g, -0.085, 0.2, 0.268, { noOutline: true });
    bake(g);
  },
  masquerade(rig, p) {
    const c = p.color || '#5a2a8a', g = group(rig.head, 0, 0.2, 0.25);
    const geo = extrude((sh) => {
      sh.moveTo(-0.17, 0.02); sh.bezierCurveTo(-0.16, 0.08, -0.06, 0.07, 0, 0.03); sh.bezierCurveTo(0.06, 0.07, 0.16, 0.08, 0.17, 0.02);
      sh.bezierCurveTo(0.15, -0.06, 0.06, -0.06, 0, -0.02); sh.bezierCurveTo(-0.06, -0.06, -0.15, -0.06, -0.17, 0.02);
      for (const s of [-1, 1]) { const h = new THREE.Path(); h.absellipse(s * 0.085, 0.01, 0.038, 0.022, 0, Math.PI * 2, false); sh.holes.push(h); }
    }, 0.012, 0.004);
    const m = mesh(geo, T(c), g);
    m.geometry.computeBoundingBox();
    const bend = m.geometry.attributes.position; for (let i = 0; i < bend.count; i++) bend.setZ(i, bend.getZ(i) - bend.getX(i) * bend.getX(i) * 1.6);
    m.geometry.computeVertexNormals();
    mesh(torus(0.02, 0.006, 5, 10), metal('#ffcf4a'), g, 0.17, 0.02, -0.04);
    const fe = group(g, 0.17, 0.04, -0.04, [0, 0, -0.5]);
    for (let i = 0; i < 4; i++) mesh(sph(0.03, 8, 6), T(p.feather || '#c8a0ff'), fe, 0, 0.03 + i * 0.045, -i * 0.006, { s: [0.7, 1.5, 0.3] });
    bake(fe); bake(g);
  },
  monocle(rig, p) {
    const fr = metal('#ffcf4a'), g = group(rig.head, 0.085, 0.2, 0.266);
    mesh(torus(0.05, 0.008, 6, 20), fr, g);
    mesh(cyl(0.046, 0.046, 0.004, 18), toon('#dff4ff', { transparent: true, opacity: 0.3 }), g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    taper(g, bez3(V(0.04, -0.03, 0), V(0.08, -0.12, 0.0), V(0.12, -0.2, -0.04), V(0.1, -0.3, -0.06), 8), 0.004, 0.004, fr, { cap: false, joints: false });
    bake(g);
  },
  mustache(rig, p) {
    const g = group(rig.head, 0, 0.115, 0.255);
    const m = mesh(extrude((sh) => { sh.moveTo(0, 0.01); sh.bezierCurveTo(0.03, 0.03, 0.07, 0.01, 0.09, 0.03); sh.bezierCurveTo(0.11, 0.04, 0.12, 0.02, 0.11, 0.0); sh.bezierCurveTo(0.09, -0.03, 0.04, -0.02, 0, -0.005); sh.bezierCurveTo(-0.04, -0.02, -0.09, -0.03, -0.11, 0.0); sh.bezierCurveTo(-0.12, 0.02, -0.11, 0.04, -0.09, 0.03); sh.bezierCurveTo(-0.07, 0.01, -0.03, 0.03, 0, 0.01); }, 0.015, 0.005), T(p.color || '#3a2418'), g);
    m.rotation.x = -0.1;
    bake(g);
  },
};

/* ================= หลัง / หาง (พิกัดลำตัว: หลังอยู่ราว z=-0.2, คออยู่ y≈0.38) ================= */
function capeBase(rig, p, rt) {
  const g = group(rig.torso, 0, 0.37, -0.03);
  const len = p.len || 0.66;
  const outer = p.tex ? TM(p.color, p.tex, { side: THREE.FrontSide }) : toon(p.color || '#a8233a');
  const geo = new THREE.CylinderGeometry(0.17, 0.36, len, 22, 4, true, Math.PI - 1.2, 2.4);
  mesh(geo, outer, g, 0, -len / 2, -0.02, { noOutline: true });
  mesh(new THREE.CylinderGeometry(0.165, 0.352, len * 0.99, 22, 4, true, Math.PI - 1.2, 2.4), toon(p.lining || shadeHex(p.color || '#a8233a', -0.35), { side: THREE.BackSide }), g, 0, -len / 2, -0.02, { noOutline: true });
  rt.on(({ t, walk }) => { g.rotation.x = 0.07 + 0.42 * walk + Math.sin(t * 2.1) * 0.03 + Math.sin(t * 7) * 0.04 * walk; });
  return g;
}
const BACK = {
  royalCape(rig, p, rt) {
    capeBase(rig, p, rt);
    const fur = T(p.fur || '#f6f2ea'), g = group(rig.torso, 0, 0.385, 0);
    mesh(torus(0.15, 0.05, 8, 20), fur, g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 9; i++) { const a = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9; mesh(sph(0.04, 8, 6), T(i % 3 ? p.fur || '#f6f2ea' : '#2a2430'), g, Math.cos(a) * 0.17, -0.01, -Math.sin(a) * 0.17); }
    mesh(sph(0.03, 8, 6), metal('#ffcf4a'), g, 0, -0.02, 0.17);
    bake(g);
  },
  starCape(rig, p, rt) {
    const tex = starsTex(p.bg || '#1a1650', p.fg || '#ffe9a8').clone(); tex.needsUpdate = true; tex.isOwned = true; tex.repeat.set(3, 2);
    capeBase(rig, { ...p, color: '#ffffff', tex, lining: p.lining || '#3a2a7a' }, rt);
    const clasp = group(rig.torso, 0, 0.385, 0);
    mesh(torus(0.14, 0.03, 8, 18), T(p.trim || '#3a2a7a'), clasp, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(extrude((sh) => starShape(sh, 0.04, 0.018), 0.012, 0.004), gem('#ffe08a', 1.3), clasp, 0, -0.01, 0.15);
    bake(clasp);
  },
  catTail(rig, p, rt, L) {
    const g = group(rig.torso, 0, 0.03, -0.19);
    const pts = bez3(V(0, 0, 0), V(0, -0.08, -0.22), V(0, 0.18, -0.36), V(0.06, 0.36, -0.28), 10);
    taper(g, pts, 0.032, 0.026, T(p.color || L.hair), { cap: false });
    mesh(sph(0.03, 10, 8), T(p.tip || p.color || L.hair), g, pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z);
    if (p.bow) mesh(torus(0.035, 0.012, 6, 12), T(p.bow), g, pts[2].x, pts[2].y, pts[2].z, { r: [0.6, 0, 0] });
    bake(g);
    rt.on(({ t, walk }) => { g.rotation.z = Math.sin(t * 2.2) * (0.25 + walk * 0.2); g.rotation.x = Math.sin(t * 1.3) * 0.08; });
  },
  foxTails(rig, p, rt) {
    const n = p.count || 3, tails = [];
    for (let k = 0; k < n; k++) {
      const g = group(rig.torso, 0, 0.04, -0.18, [0, 0, (k - (n - 1) / 2) * 0.55]);
      const pts = bez3(V(0, 0, 0), V(0, -0.05, -0.18), V(0, 0.12, -0.32), V(0, 0.3, -0.36), 8);
      const prof = [0.04, 0.06, 0.08, 0.095, 0.1, 0.095, 0.08, 0.06, 0.04];
      pts.forEach((q, i) => mesh(sph(prof[i], 12, 8), T(i >= 6 ? p.tip || '#fff8ee' : p.color || '#f0a040'), g, q.x, q.y, q.z));
      bake(g); tails.push(g);
    }
    rt.on(({ t, walk }) => tails.forEach((g, k) => { g.rotation.x = Math.sin(t * 2 + k) * 0.12; g.rotation.y = Math.sin(t * 1.6 + k * 1.3) * (0.2 + walk * 0.15); }));
  },
  dragonTail(rig, p, rt) {
    const g = group(rig.torso, 0, 0.02, -0.18);
    const pts = bez3(V(0, 0, 0), V(0, -0.28, -0.22), V(0, -0.36, -0.55), V(0.12, -0.32, -0.88), 10);
    taper(g, pts, 0.075, 0.012, T(p.color || '#b8323a'));
    for (let i = 1; i < 9; i++) mesh(cone(0.026 - i * 0.002, 0.08 - i * 0.004, 4), T(p.spike || '#ffcf6a'), g, pts[i].x, pts[i].y + 0.06 - i * 0.004, pts[i].z, { r: [-0.4, 0, 0] });
    bake(g);
    rt.on(({ t, walk }) => { g.rotation.y = Math.sin(t * 1.8) * (0.22 + walk * 0.2); });
  },
  teddyPack(rig, p) {
    const c = p.color || '#c8905a', g = group(rig.torso, 0, 0.2, -0.25);
    mesh(sph(0.13, 14, 10), T(c), g, 0, -0.02, 0, { s: [1, 1.05, 0.8] });
    mesh(sph(0.1, 14, 10), T(c), g, 0, 0.16, -0.02);
    for (const s of [-1, 1]) { mesh(sph(0.04, 10, 8), T(c), g, s * 0.075, 0.24, -0.02); mesh(sph(0.022, 8, 6), T('#f2c8a8'), g, s * 0.075, 0.24, -0.045); }
    mesh(sph(0.04, 10, 8), T('#f2d8b8'), g, 0, 0.14, -0.1, { s: [1.2, 0.9, 0.8] });
    mesh(sph(0.014, 6, 4), T('#2a1a1a'), g, 0, 0.155, -0.135);
    for (const s of [-1, 1]) { mesh(sph(0.014, 6, 4), T('#2a1a1a'), g, s * 0.04, 0.19, -0.09); mesh(sph(0.04, 8, 6), T(c), g, s * 0.13, 0.03, 0.04, { s: [0.8, 1.6, 0.8], r: [0.6, 0, s * 0.3] }); }
    mesh(torus(0.035, 0.012, 6, 12), T(p.bow || '#ff5a8a'), g, 0, 0.08, -0.08);
    bake(g);
  },
  orbs(rig, p, rt) {
    const g = group(rig.body, 0, 0.75, 0);
    const orbs = (p.colors || ['#7fe0ff', '#ff7ab8', '#ffe08a']).map((c, i) => {
      const o = group(g);
      mesh(sph(0.045, 14, 10), G(c, 1.6), o, 0, 0, 0, { noOutline: true });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(c), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.22); o.add(sp);
      return o;
    });
    rt.on(({ t }) => orbs.forEach((o, i) => { const a = t * 1.4 + (i / orbs.length) * Math.PI * 2; o.position.set(Math.cos(a) * 0.38, Math.sin(t * 2 + i) * 0.06, Math.sin(a) * 0.38); }));
  },
  floatSwords(rig, p, rt) {
    const g = group(rig.torso, 0, 0.32, -0.34);
    const steel = metal(p.color || '#dfe6f2'), edge = G(p.glow || '#7fd0ff', 1.4), hilt = metal('#ffcf4a');
    const swords = [];
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.42, sw = group(g, Math.sin(a) * 0.32, Math.cos(a) * 0.32 - 0.24, 0, [0, 0, -a]);
      mesh(box(0.05, 0.34, 0.012), steel, sw, 0, 0.17, 0);
      mesh(cone(0.035, 0.08, 4), steel, sw, 0, 0.38, 0, { s: [1, 1, 0.3] });
      mesh(box(0.012, 0.32, 0.016), edge, sw, 0, 0.17, 0, { noOutline: true });
      mesh(box(0.12, 0.02, 0.025), hilt, sw, 0, 0, 0);
      mesh(cyl(0.012, 0.012, 0.08, 6), T('#3a2a20'), sw, 0, -0.05, 0);
      bake(sw); swords.push(sw);
    }
    rt.on(({ t }) => { g.position.y = 0.32 + Math.sin(t * 1.8) * 0.03; swords.forEach((sw, i) => { sw.position.z = Math.sin(t * 2 + i) * 0.03; }); });
  },
  lute(rig, p) {
    const wood = T(p.color || '#b8743a'), g = group(rig.torso, 0.02, 0.2, -0.25, [0, 0, 0.75]);
    mesh(sph(1, 16, 12), wood, g, 0, -0.04, 0, { s: [0.12, 0.15, 0.05] });
    mesh(cyl(0.035, 0.035, 0.012, 14), T('#2a1a10'), g, 0, -0.02, -0.048, { r: [Math.PI / 2, 0, 0] });
    mesh(box(0.045, 0.32, 0.025), T('#5a3a20'), g, 0, 0.24, 0);
    mesh(box(0.05, 0.08, 0.025), T('#5a3a20'), g, 0, 0.42, 0.015, { r: [0.5, 0, 0] });
    for (const s of [-1, 1]) mesh(box(0.004, 0.42, 0.004), T('#f2ece0'), g, s * 0.01, 0.16, -0.03, { noOutline: true });
    bake(g);
  },
  parasol(rig, p) {
    const tex = patternTex('sakura', p.flower || '#ff8fb8', '#ffffff', p.color || '#ffe8f0').clone(); tex.needsUpdate = true; tex.isOwned = true; tex.repeat.set(3, 1);
    const g = group(rig.torso, 0, 0.26, -0.27, [-0.55, 0, 0.5]);
    mesh(new THREE.ConeGeometry(0.34, 0.13, 24, 1, true), TM('#ffffff', tex, { side: THREE.DoubleSide }), g, 0, 0.3, 0, { noOutline: true });
    // ซี่ร่มอยู่ใต้ผืนผ้า (จากยอดถึงขอบ) + ขอบระบายสีเข้ม
    const apex = V(0, 0.365, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, edge = V(Math.sin(a) * 0.33, 0.235, Math.cos(a) * 0.33), dir = edge.clone().sub(apex);
      const r = mesh(box(0.01, 0.01, dir.length()), T('#8a5a3a'), g, 0, 0, 0, { noOutline: true });
      r.position.copy(apex).lerp(edge, 0.5).y -= 0.012; r.quaternion.setFromUnitVectors(V(0, 0, 1), dir.normalize());
    }
    mesh(torus(0.34, 0.01, 4, 32), T(p.trim || '#ff8fb8'), g, 0, 0.235, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(cyl(0.01, 0.01, 0.62, 6), T('#8a5a3a'), g, 0, 0.06, 0);
    mesh(sph(0.025, 8, 6), T('#c94a3a'), g, 0, 0.38, 0);
    bake(g);
  },
  longScarf(rig, p, rt) {
    const c = p.color || '#e8433a';
    mesh(torus(0.13, 0.05, 8, 18), T(c), rig.torso, 0, 0.385, 0, { r: [Math.PI / 2, 0, 0] });
    const chains = [-1, 1].map((s) => {
      let parent = group(rig.torso, s * 0.06, 0.37, -0.13, [0.5, 0, s * 0.15]);
      const segs = [];
      for (let i = 0; i < 9; i++) {
        const seg = group(parent, 0, -0.085, 0);
        mesh(box(0.075 - i * 0.002, 0.09, 0.014), T(i === 8 && p.tip ? p.tip : c), seg, 0, -0.045, 0);
        if (p.stripe && i % 3 === 1) mesh(box(0.077 - i * 0.002, 0.02, 0.016), T(p.stripe), seg, 0, -0.045, 0);
        segs.push(seg); parent = seg;
      }
      return segs;
    });
    rt.on(({ t, walk }) => chains.forEach((segs, k) => segs.forEach((sg, i) => { sg.rotation.x = 0.1 + Math.sin(t * 3.4 - i * 0.6 + k) * (0.08 + walk * 0.12) + walk * 0.12; sg.rotation.z = Math.sin(t * 2.1 - i * 0.5 + k * 2) * 0.06; })));
  },
  magicRing(rig, p, rt) {
    const g = group(rig.torso, 0, 0.3, -0.42);
    const ring = mesh(new THREE.PlaneGeometry(0.95, 0.95), unlit(p.color || '#b48cff', { map: TX.runeCircle(p.rune || 'hex'), opacity: 0.9, add: true }), g, 0, 0, 0, { keep: true, shadow: false });
    const inner = mesh(new THREE.PlaneGeometry(0.55, 0.55), unlit(p.color2 || '#7fe0ff', { map: TX.runeCircle('star'), opacity: 0.8, add: true }), g, 0, 0, 0.01, { keep: true, shadow: false });
    ring.renderOrder = inner.renderOrder = 3;
    rt.on(({ t }) => { ring.rotation.z = t * 0.5; inner.rotation.z = -t * 0.9; ring.material.opacity = 0.75 + Math.sin(t * 3) * 0.15; });
  },
  jetWings(rig, p, rt) {
    const g = group(rig.torso, 0, 0.22, -0.24);
    const body = metal(p.color || '#8a96a8'), trim = metal('#ffcf4a');
    for (const s of [-1, 1]) {
      mesh(cyl(0.05, 0.06, 0.24, 14), body, g, s * 0.07, 0, 0);
      mesh(cyl(0.062, 0.05, 0.05, 14), trim, g, s * 0.07, -0.14, 0);
    }
    mesh(box(0.14, 0.16, 0.06), body, g, 0, 0.02, 0.03);
    bake(g);
    const flames = [-1, 1].map((s) => { const o = new THREE.Object3D(); o.position.set(s * 0.07, -0.19, 0); g.add(o); return o; });
    rt.on(({ dt }) => flames.forEach((o) => { if (Math.random() < dt * 30) rt.ps('flame').emit({ pos: rt.worldPos(o), count: 1, vel: () => V(rand(-0.1, 0.1), -rand(0.6, 1), rand(-0.1, 0.1)), life: [0.15, 0.3], size: [0.1, 0.16], sizeEnd: 0.2, color: ['#9ae8ff', '#ffffff'], colorEnd: '#3a6aff' }); }));
  },
};

/* ================= อาวุธ (มือขวา = arms[0], ธนูถือมือซ้าย = arms[1]) ================= */
const swordHand = (rig) => group(rig.arms[0], -0.036, -0.275, 0.02, [0.55, 0, 0]);
const staffHand = (rig) => group(rig.arms[0], -0.05, -0.27, 0.04, [-0.05, 0, 0.3]);
const leftHand = (rig) => group(rig.arms[1], 0.036, -0.275, 0.02, [0.55, 0, 0]);
// ใบมีด 2 มิติ (u = ตามความยาว, v = ความกว้าง) → หมุนให้ยาวตามแกน +z ของมือ
function blade(parent, draw, mat, { z0 = 0.08, depth = 0.022, bevel = 0.006 } = {}) {
  const g = extrude(draw, depth, bevel).rotateY(-Math.PI / 2);
  return mesh(g, mat, parent, 0, 0, z0);
}
function hilt(parent, { guard = '#ffcf4a', grip = '#3a2418', style = 'bar', w = 0.2 } = {}) {
  const gm = metal(guard);
  if (style === 'bar') { mesh(box(w, 0.035, 0.045), gm, parent, 0, 0, 0.07); for (const s of [-1, 1]) mesh(sph(0.026, 8, 6), gm, parent, s * w / 2, 0, 0.07); }
  else if (style === 'round') mesh(torus(0.06, 0.018, 6, 16), gm, parent, 0, 0, 0.07, { r: [0, 0, 0] });
  else if (style === 'wings') { for (const s of [-1, 1]) { const wg = mesh(extrude((sh) => { sh.moveTo(0, 0); sh.bezierCurveTo(0.05, 0.02, 0.12, 0.06, 0.15, 0.12); sh.bezierCurveTo(0.1, 0.06, 0.06, 0.05, 0.02, -0.02); }, 0.012, 0.004), gm, parent, 0, 0, 0.07, { r: [0, Math.PI / 2, 0] }); wg.scale.set(1, 1, s); wg.rotation.x = s > 0 ? 0 : Math.PI; } mesh(sph(0.03, 10, 8), gem('#7fd0ff', 1.3), parent, 0, 0, 0.075); }
  else if (style === 'flake') { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mesh(box(0.016, 0.1, 0.016), gm, parent, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.07, { r: [0, 0, a - Math.PI / 2] }); } }
  const gr = mesh(cyl(0.02, 0.02, 0.13, 8), T(grip), parent, 0, 0, -0.01); gr.rotation.x = Math.PI / 2;
  mesh(sph(0.03, 10, 8), gm, parent, 0, 0, -0.085);
}
const wavy = (L, w, waves, amp) => (sh) => {
  const n = 24; sh.moveTo(0, -w);
  for (let i = 1; i <= n; i++) { const u = (i / n) * L, k = 1 - Math.pow(i / n, 3); sh.lineTo(u, -(w * k + Math.sin(i * waves) * amp * k)); }
  sh.lineTo(L + 0.08, 0);
  for (let i = n; i >= 0; i--) { const u = (i / n) * L, k = 1 - Math.pow(i / n, 3); sh.lineTo(u, w * k + Math.sin(i * waves + 1.2) * amp * k); }
};
function weaponParticles(rt, parent, pts, p) {
  const anchors = pts.map(([x, y, z]) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; });
  rt.on(({ dt }) => { if (Math.random() < dt * (p.rate || 14)) rt.ps(p.kind, p.blending).emit({ pos: rt.worldPos(anchors[(Math.random() * anchors.length) | 0]), count: 1, speed: 0.15, up: p.up ?? 0.4, gravity: p.gravity || 0, life: p.life || [0.3, 0.6], size: p.size || [0.06, 0.12], sizeEnd: 0.3, color: p.color, colorEnd: p.colorEnd || p.color }); });
}
const WEAPON = {
  flameBlade(rig, p, rt) {
    const h = swordHand(rig);
    blade(h, wavy(0.6, 0.042, 1.1, 0.012), G('#ff7a2a', 1.1));
    blade(h, wavy(0.56, 0.018, 1.1, 0.006), G('#ffe08a', 1.6), { depth: 0.03, bevel: 0 });
    hilt(h, { guard: '#3a2a2a', style: 'bar', w: 0.22 });
    mesh(oct(0.035), gem('#ff4a1a', 1.5), h, 0, 0, 0.07, { noOutline: true });
    bake(h);
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0, 0.45], [0, 0, 0.6]], { kind: 'flame', color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a', up: 0.8, size: [0.08, 0.14] });
  },
  frostBlade(rig, p, rt) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.03); const pts = [[0.12, -0.045], [0.18, -0.03], [0.3, -0.05], [0.36, -0.03], [0.5, -0.045], [0.66, 0]]; for (const q of pts) sh.lineTo(...q); for (const [u, v] of pts.slice(0, -1).reverse()) sh.lineTo(u, -v); sh.lineTo(0, 0.03); }, toon('#9ae8ff', { emissive: '#4ab0ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }), { depth: 0.03 });
    blade(h, (sh) => { sh.moveTo(0, -0.008); sh.lineTo(0.6, 0); sh.lineTo(0, 0.008); }, G('#ffffff', 1.5), { depth: 0.036, bevel: 0 });
    hilt(h, { guard: '#dff4ff', grip: '#3a5a8a', style: 'flake' });
    bake(h);
    weaponParticles(rt, h, [[0, 0, 0.25], [0, 0, 0.55]], { kind: 'snow', color: ['#ffffff', '#bfeeff'], up: -0.1, gravity: -0.4, size: [0.06, 0.1], rate: 8, life: [0.6, 1] });
  },
  holySword(rig, p, rt) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.055); sh.lineTo(0.52, -0.05); sh.lineTo(0.66, 0); sh.lineTo(0.52, 0.05); sh.lineTo(0, 0.055); }, metal('#f4f6ff', 0.3));
    mesh(box(0.03, 0.016, 0.48), G('#ffe08a', 1.3), h, 0, 0, 0.33, { noOutline: true });
    hilt(h, { guard: '#ffcf4a', grip: '#f2ece0', style: 'wings' });
    bake(h);
    weaponParticles(rt, h, [[0, 0, 0.4], [0, 0, 0.7]], { kind: 'star', color: ['#ffffff', '#ffe08a'], up: 0.1, size: [0.06, 0.12], rate: 6 });
  },
  moonSword(rig, p) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.03); sh.bezierCurveTo(0.25, -0.07, 0.5, -0.02, 0.66, 0.14); sh.bezierCurveTo(0.48, 0.04, 0.26, 0.02, 0, 0.03); }, metal('#c8d8ff', 0.4), { depth: 0.024 });
    blade(h, (sh) => { sh.moveTo(0.02, -0.026); sh.bezierCurveTo(0.25, -0.064, 0.5, -0.016, 0.63, 0.12); sh.bezierCurveTo(0.5, -0.0, 0.25, -0.04, 0.02, -0.016); }, G('#9ad0ff', 1.4), { depth: 0.028, bevel: 0 });
    hilt(h, { guard: '#7a8ab8', grip: '#2a2a4a', style: 'round' });
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.04, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0.016, 0.01, 0.034, 0, Math.PI * 2, true); sh.holes.push(hole); }, 0.01, 0.003), G('#ffe9a8', 1.3), h, 0, 0, 0.07, { r: [0, Math.PI / 2, 0] });
    bake(h);
  },
  leafBlade(rig, p) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, 0); sh.bezierCurveTo(0.15, -0.09, 0.5, -0.06, 0.66, 0); sh.bezierCurveTo(0.5, 0.06, 0.15, 0.09, 0, 0); }, T(p.color || '#5ac85a', { emissive: '#1a4a1a', emissiveIntensity: 0.6 }));
    mesh(box(0.028, 0.006, 0.58), T('#2a6a2a'), h, 0, 0, 0.36, { noOutline: true });
    for (let i = 1; i < 5; i++) for (const s of [-1, 1]) mesh(box(0.028, 0.004, 0.08), T('#2a6a2a'), h, 0, s * 0.02, 0.1 + i * 0.12, { r: [s * 0.5, 0, 0], noOutline: true });
    hilt(h, { guard: '#6a4a2a', grip: '#4a8a3a', style: 'round' });
    flower(h, 0, 0.0, 0.07, '#ff8fb8', 0.03, '#ffd34d', [0, Math.PI / 2, 0]);
    bake(h);
  },
  candySword(rig, p) {
    const h = swordHand(rig);
    const stripes = ctex('candy' + (p.color || '#e8334a'), 64, 64, (g, s) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s); g.fillStyle = p.color || '#e8334a'; for (let i = -s; i < s * 2; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 8, 0); g.lineTo(i + 8 + s, s); g.lineTo(i + s, s); g.fill(); } }, { repeat: true });
    const st = stripes.clone(); st.needsUpdate = true; st.isOwned = true; st.repeat.set(2, 6);
    mesh(cyl(0.036, 0.036, 0.52, 14).rotateX(Math.PI / 2), TM('#ffffff', st), h, 0, 0, 0.34);
    mesh(cone(0.036, 0.1, 14).rotateX(Math.PI / 2), TM('#ffffff', st), h, 0, 0, 0.65);
    const wrap = group(h, 0, 0, 0.07);
    mesh(sph(0.045, 12, 8), T(p.wrap || '#ffd34d'), wrap, 0, 0, 0, { s: [1.2, 1, 0.9] });
    for (const s of [-1, 1]) mesh(cone(0.04, 0.07, 8), T(p.wrap || '#ffd34d'), wrap, s * 0.08, 0, 0, { r: [0, 0, s * Math.PI / 2] });
    const gr = mesh(cyl(0.018, 0.018, 0.14, 8), T('#ffffff'), h, 0, 0, -0.02); gr.rotation.x = Math.PI / 2;
    bake(wrap); bake(h);
  },
  greatsword(rig, p) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.08); sh.lineTo(0.85, -0.075); sh.lineTo(0.98, 0); sh.lineTo(0.85, 0.075); sh.lineTo(0, 0.08); }, metal(p.color || '#4a4e5a', 0.2), { depth: 0.04, bevel: 0.01 });
    for (let i = 0; i < 5; i++) mesh(box(0.046, 0.03, 0.06), G(p.rune || '#ff4a3a', 1.4), h, 0, 0, 0.2 + i * 0.14, { noOutline: true });
    hilt(h, { guard: '#2a2a30', grip: '#5a1a1a', style: 'bar', w: 0.3 });
    mesh(cone(0.04, 0.1, 4), metal('#2a2a30'), h, 0, 0.17, 0.07, { r: [0, 0, 0] });
    mesh(cone(0.04, 0.1, 4), metal('#2a2a30'), h, 0, -0.17, 0.07, { r: [0, 0, Math.PI] });
    bake(h);
  },
  shadowBlade(rig, p, rt) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.02); sh.bezierCurveTo(0.3, -0.03, 0.55, 0.0, 0.7, 0.07); sh.bezierCurveTo(0.5, 0.04, 0.3, 0.03, 0, 0.02); }, metal('#2a2236', 0.2), { depth: 0.018 });
    blade(h, (sh) => { sh.moveTo(0.02, -0.022); sh.bezierCurveTo(0.3, -0.032, 0.55, -0.002, 0.68, 0.064); sh.bezierCurveTo(0.55, 0.01, 0.3, -0.016, 0.02, -0.012); }, G(p.glow || '#b46aff', 1.5), { depth: 0.022, bevel: 0 });
    mesh(cyl(0.04, 0.04, 0.012, 12), metal('#5a4a6a'), h, 0, 0, 0.07, { r: [Math.PI / 2, 0, 0] });
    const gr = mesh(cyl(0.02, 0.02, 0.18, 8), T('#1e1a26'), h, 0, 0, -0.03); gr.rotation.x = Math.PI / 2;
    bake(h);
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0.03, 0.6]], { kind: 'smoke', blending: THREE.NormalBlending, color: '#3a1a5a', up: 0.3, size: [0.12, 0.2], rate: 8, life: [0.6, 1] });
  },
  moonStaff(rig, p, rt) {
    const st = staffHand(rig);
    mesh(cyl(0.018, 0.022, 1.15, 8), metal('#c8d0e8'), st, 0, 0.3, 0);
    for (const y of [0.62, 0.86]) mesh(torus(0.026, 0.009, 6, 12), metal('#e8ecff', 0.3), st, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    bake(st);
    // หัวคทา: จันทร์เสี้ยวใหญ่ + ปีกเงินเล็ก ๆ หมุนช้า ๆ รอบแกน ให้เห็นได้ทุกมุม
    const head = group(st, 0, 1.02, 0);
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.16, Math.PI * 0.15, Math.PI * 1.85, false); sh.absarc(0.06, 0, 0.125, Math.PI * 1.75, Math.PI * 0.25, true); }, 0.03, 0.01), metal('#eef2ff', 0.5), head, 0, 0, 0, { r: [0, 0, Math.PI / 2] });
    for (const s of [-1, 1]) mesh(extrude((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.05, 0.14, 0.02); sh.quadraticCurveTo(0.09, -0.01, 0.1, -0.04); sh.quadraticCurveTo(0.05, -0.02, 0, -0.02); }, 0.012, 0.004), metal('#c8d0e8'), head, s * 0.03, -0.17, 0, { s: [s, 1, 1] });
    bake(head);
    const orb = mesh(sph(0.065, 16, 12), G(p.orb || '#9ad0ff', 1.8), st, 0, 1.0, 0, { noOutline: true, keep: true });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(p.orb || '#9ad0ff'), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(0.36); orb.add(halo);
    rt.on(({ t }) => { head.rotation.y = t * 0.7; orb.position.y = 1.0 + Math.sin(t * 2.5) * 0.025; });
    weaponParticles(rt, st, [[0, 1.0, 0]], { kind: 'star', color: ['#ffffff', p.orb || '#9ad0ff'], up: -0.1, gravity: -0.3, size: [0.06, 0.11], rate: 7, life: [0.5, 0.9] });
  },
  sunStaff(rig, p, rt) {
    const st = staffHand(rig);
    mesh(cyl(0.02, 0.024, 1.15, 8), metal('#ffcf4a'), st, 0, 0.3, 0);
    mesh(cone(0.05, 0.12, 8), metal('#ffcf4a'), st, 0, 0.86, 0, { r: [Math.PI, 0, 0] });
    bake(st);
    const sun = group(st, 0, 1.03, 0), rays = group(sun);
    mesh(sph(0.075, 16, 12), G('#ffe27a', 1.7), sun, 0, 0, 0, { noOutline: true, s: [1, 1, 0.55] });
    mesh(torus(0.095, 0.014, 6, 24), metal('#ffcf4a', 0.4), sun, 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, L = i % 2 ? 0.08 : 0.13; mesh(cone(0.026, L, 4), G(i % 2 ? '#ffb347' : '#ffd34d', 1.4), rays, Math.cos(a) * (0.11 + L / 2), Math.sin(a) * (0.11 + L / 2), 0, { r: [0, 0, a - Math.PI / 2], s: [1, 1, 0.4], noOutline: true }); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin('#ffb347'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.55); sun.add(glow);
    rt.on(({ t }) => { rays.rotation.z = t * 0.8; sun.rotation.y = Math.sin(t * 0.6) * 0.9; });
    weaponParticles(rt, st, [[0, 1.03, 0]], { kind: 'dot', color: ['#fff2b0', '#ffb347'], colorEnd: '#ff6a1a', up: 0.3, size: [0.04, 0.08], rate: 12, life: [0.4, 0.8] });
  },
  spiritBranch(rig, p, rt) {
    const st = staffHand(rig);
    const wood = T('#7a5a3a');
    taper(st, bez3(V(0, -0.27, 0), V(0.04, 0.2, 0.02), V(-0.05, 0.6, -0.02), V(0, 0.95, 0), 10), 0.026, 0.016, wood, { cap: false });
    taper(st, bez(V(0, 0.9, 0), V(0.08, 1.0, 0), V(0.12, 1.08, 0.02), 4), 0.014, 0.005, wood);
    taper(st, bez(V(0, 0.88, 0), V(-0.07, 0.98, 0), V(-0.1, 1.04, -0.02), 4), 0.014, 0.005, wood);
    bake(st);
    const leaves = [0, 1, 2, 3].map((i) => mesh(sph(0.035, 8, 6), G(p.leaf || '#7aff9a', 1.0), st, 0, 1.0, 0, { s: [1.4, 0.4, 0.7], noOutline: true }));
    rt.on(({ t }) => leaves.forEach((l, i) => { const a = t * 1.5 + (i / 4) * Math.PI * 2; l.position.set(Math.cos(a) * 0.14, 1.0 + Math.sin(t * 2 + i) * 0.04, Math.sin(a) * 0.14); l.rotation.y = -a; }));
  },
  starWand(rig, p, rt) {
    const st = staffHand(rig);
    mesh(cyl(0.016, 0.02, 0.6, 8), T('#ffffff'), st, 0, 0.05, 0);
    mesh(torus(0.022, 0.008, 6, 12), metal('#ffcf4a'), st, 0, 0.33, 0, { r: [Math.PI / 2, 0, 0] });
    const star = mesh(extrude((sh) => starShape(sh, 0.11, 0.05), 0.04, 0.012), G(p.color || '#ffd34d', 1.3), st, 0, 0.45, 0);
    for (const s of [-1, 1]) mesh(box(0.03, 0.14, 0.006), T(p.ribbon || '#ff7ab8'), st, s * 0.03, 0.3, 0, { r: [0, 0, s * 0.4] });
    bake(st);
    weaponParticles(rt, st, [[0, 0.45, 0]], { kind: 'star', color: ['#ffffff', p.color || '#ffd34d', '#ff9ad0'], up: -0.2, gravity: -0.5, size: [0.06, 0.12], rate: 10, life: [0.4, 0.8] });
  },
  crystalStaff(rig, p, rt) {
    const st = staffHand(rig);
    mesh(cyl(0.02, 0.024, 1.15, 8), T('#2a2238'), st, 0, 0.3, 0);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; taper(st, bez(V(Math.cos(a) * 0.02, 0.85, Math.sin(a) * 0.02), V(Math.cos(a) * 0.09, 0.92, Math.sin(a) * 0.09), V(Math.cos(a) * 0.05, 1.02, Math.sin(a) * 0.05), 4), 0.014, 0.004, metal('#8a7aa8')); }
    bake(st);
    const cr = mesh(oct(0.07), toon(p.color || '#c08aff', { emissive: p.color || '#c08aff', emissiveIntensity: 1.1, transparent: true, opacity: 0.9 }), st, 0, 1.04, 0, { s: [1, 1.7, 1] });
    rt.on(({ t }) => { cr.rotation.y = t * 1.8; cr.position.y = 1.06 + Math.sin(t * 2.4) * 0.03; });
  },
  // ธนู: arc ในระนาบ XY ของกลุ่มธนู (ปลายบน/ล่าง = ±y)
  bowSkin(rig, p, rt) {
    const r = p.r || 0.36, half = 1.05;
    const bw = group(rig.arms[1], 0.04, -0.27, 0.06, [0, -Math.PI / 2, 0]);
    rig.arms[1].userData.holding = true;
    const arcMat = p.glow ? G(p.color, p.glow) : metal(p.color || '#9b6b3e', 0.1);
    mesh(torus(r, p.thick || 0.022, 6, 24, half * 2), arcMat, bw, -r, 0, 0, { r: [0, 0, -half] });
    const chord = r - r * Math.cos(half), tipY = r * Math.sin(half);
    const strMat = p.string ? G(p.string, 1.8) : T('#f2ece0');
    mesh(cyl(0.005, 0.005, 2 * tipY, 4), strMat, bw, -chord, 0, 0, { noOutline: true });
    mesh(cyl(0.032, 0.032, 0.1, 8), T('#3a2a20'), bw);
    for (const sy of [-1, 1]) {
      const tip = V(-chord, sy * tipY, 0);
      if (p.deco === 'wing') { for (let i = 0; i < 4; i++) mesh(featherGeo, T(i % 2 ? '#ffffff' : '#e8f0ff'), bw, tip.x + 0.02, tip.y - sy * 0.04 * i, 0, { s: [0.03, 0.08 + i * 0.012, 0.01], r: [0, 0, sy > 0 ? Math.PI - 0.9 + i * 0.25 : 0.9 - i * 0.25] }); }
      else if (p.deco === 'horn') taper(bw, bez(tip, tip.clone().add(V(0.06, sy * 0.06, 0)), tip.clone().add(V(0.02, sy * 0.14, 0)), 4), 0.022, 0.004, T('#e8e0d0'));
      else if (p.deco === 'flower') flower(bw, tip.x, tip.y, 0, '#ff8fb8', 0.032, '#ffd34d');
      else if (p.deco === 'crescent') mesh(torus(0.05, 0.012, 6, 14, Math.PI * 1.3), G('#e8ecff', 1.2), bw, tip.x, tip.y, 0, { r: [0, 0, sy > 0 ? 0.6 : -2.5], noOutline: true });
      else if (p.deco === 'coral') { for (const k of [-1, 1]) taper(bw, bez(tip, tip.clone().add(V(0.03 * k + 0.02, sy * 0.05, 0)), tip.clone().add(V(0.05 * k + 0.03, sy * 0.1, 0)), 3), 0.016, 0.005, T(p.coral || '#ff7a8a')); mesh(sph(0.02, 8, 6), toon('#fffaf2', { emissive: '#3a3040' }), bw, tip.x, tip.y, 0); }
      else mesh(sph(0.022, 8, 6), metal('#ffcf4a'), bw, tip.x, tip.y, 0);
    }
    if (p.deco === 'flower') for (const a of [-0.5, 0.5]) flower(bw, -r + r * Math.cos(a), r * Math.sin(a), 0.01, '#ffffff', 0.025, '#ff8fb8');
    if (p.center) mesh(oct(0.04), gem(p.center, 1.4), bw, 0.01, 0, 0, { noOutline: true });
    bake(bw);
    if (p.string) { const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(p.string), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(0.12, 0.7, 1); glow.position.set(-chord, 0, 0); bw.add(glow); rt.on(({ t }) => { glow.material.opacity = 0.35 + Math.sin(t * 5) * 0.15; }); }
  },
  starHammer(rig, p) {
    const h = swordHand(rig);
    const gr = mesh(cyl(0.02, 0.022, 0.42, 8), T('#ffffff'), h, 0, 0, 0.13); gr.rotation.x = Math.PI / 2;
    mesh(extrude((sh) => starShape(sh, 0.13, 0.065), 0.09, 0.02), T(p.color || '#ff9ad0', { emissive: '#3a1020' }), h, 0, 0, 0.38, { r: [0, Math.PI / 2, 0] });
    mesh(sph(0.03, 8, 6), metal('#ffcf4a'), h, 0, 0, -0.09);
    bake(h);
  },
  bellMace(rig, p, rt) {
    const h = swordHand(rig);
    const gr = mesh(cyl(0.02, 0.022, 0.4, 8), T('#7a3a2a'), h, 0, 0, 0.12); gr.rotation.x = Math.PI / 2;
    const bell = group(h, 0, 0, 0.36, [Math.PI / 2, 0, 0]);
    const prof = [V(0, 0.09, 0), V(0.03, 0.085, 0), V(0.05, 0.05, 0), V(0.06, -0.02, 0), V(0.085, -0.06, 0), V(0.08, -0.07, 0)];
    mesh(new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(q.x, q.y)), 18), toon('#ffcf4a', { emissive: '#3a2a00', side: THREE.DoubleSide }), bell, 0, 0, 0, { noOutline: true });
    mesh(sph(0.025, 8, 6), metal('#c9a24a'), bell, 0, -0.07, 0);
    mesh(torus(0.04, 0.012, 6, 12), T(p.ribbon || '#d8233a'), h, 0, 0, 0.27);
    bake(bell); bake(h);
  },
  carrotHammer(rig, p) {
    const h = swordHand(rig);
    const gr = mesh(cyl(0.02, 0.022, 0.42, 8), T('#8a5a3a'), h, 0, 0, 0.13); gr.rotation.x = Math.PI / 2;
    mesh(cone(0.08, 0.34, 12), T('#ff8a2a'), h, 0.12, 0, 0.38, { r: [0, 0, -Math.PI / 2] });
    for (let i = 0; i < 4; i++) mesh(torus(0.07 - i * 0.012, 0.006, 4, 12), T('#d86a1a'), h, 0.05 + i * 0.05, 0, 0.38, { r: [0, Math.PI / 2, 0] });
    for (let i = 0; i < 3; i++) mesh(sph(0.04, 8, 6), T('#5ac83a'), h, -0.08, (i - 1) * 0.04, 0.38, { s: [1.6, 0.4, 0.6], r: [0, 0, (i - 1) * 0.5] });
    bake(h);
  },
  thunderHammer(rig, p, rt) {
    const h = swordHand(rig);
    const gr = mesh(cyl(0.022, 0.024, 0.42, 8), T('#3a3a4a'), h, 0, 0, 0.13); gr.rotation.x = Math.PI / 2;
    mesh(box(0.26, 0.14, 0.14), metal('#8a96a8'), h, 0, 0, 0.38);
    for (const s of [-1, 1]) mesh(box(0.03, 0.15, 0.15), metal('#ffcf4a'), h, s * 0.12, 0, 0.38);
    mesh(extrude((sh) => { sh.moveTo(0.01, 0.06); sh.lineTo(-0.03, 0); sh.lineTo(0, 0); sh.lineTo(-0.015, -0.06); sh.lineTo(0.03, 0.01); sh.lineTo(0, 0.01); }, 0.008, 0), G('#7fd8ff', 1.6), h, 0, 0, 0.455, { r: [0, 0, 0] });
    bake(h);
    weaponParticles(rt, h, [[0.13, 0, 0.38], [-0.13, 0, 0.38], [0, 0.07, 0.38]], { kind: 'dot', color: ['#ffffff', '#9ae8ff'], colorEnd: '#3a6aff', up: 0.2, size: [0.04, 0.08], rate: 18, life: [0.12, 0.25] });
  },
  twinDaggers(rig, p, rt) {
    for (const hand of [swordHand(rig), leftHand(rig)]) {
      blade(hand, (sh) => { sh.moveTo(0, -0.025); sh.bezierCurveTo(0.12, -0.035, 0.24, -0.01, 0.32, 0.03); sh.bezierCurveTo(0.22, 0.02, 0.1, 0.03, 0, 0.025); }, metal('#3a3448', 0.2), { depth: 0.016, z0: 0.06 });
      blade(hand, (sh) => { sh.moveTo(0.02, -0.022); sh.bezierCurveTo(0.12, -0.03, 0.24, -0.008, 0.31, 0.026); sh.bezierCurveTo(0.22, 0.0, 0.1, -0.02, 0.02, -0.014); }, G(p.glow || '#ff4a7a', 1.4), { depth: 0.02, bevel: 0, z0: 0.06 });
      mesh(box(0.12, 0.025, 0.03), metal('#5a4a6a'), hand, 0, 0, 0.05);
      const gr = mesh(cyl(0.017, 0.017, 0.09, 8), T('#1e1a26'), hand, 0, 0, 0); gr.rotation.x = Math.PI / 2;
      bake(hand);
    }
    rig.arms[1].userData.holding = true;
  },
};

/* ================= ออร่า (ปล่อยอนุภาคในพื้นที่โลกรอบเท้า/ตัว) ================= */
const NB = THREE.NormalBlending;
function auraEmitter(rig, rt, rate, fn) {
  let acc = 0;
  rt.on((c) => { acc += rate * c.dt; const base = rt.worldPos(rig.root); while (acc >= 1) { acc -= 1; fn(base, c); } });
}
const ringPos = (base, r, y = 0.05) => { const a = Math.random() * Math.PI * 2, rr = r * (0.75 + Math.random() * 0.25); return V(base.x + Math.cos(a) * rr, base.y + y, base.z + Math.sin(a) * rr); };
const discPos = (base, r, y0, y1) => { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r; return V(base.x + Math.cos(a) * rr, base.y + rand(y0, y1), base.z + Math.sin(a) * rr); };
const AURA = {
  fire(rig, p, rt) {
    auraEmitter(rig, rt, 55, (b) => rt.ps('flame').emit({ pos: ringPos(b, 0.5), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.7, 1.3), rand(-0.1, 0.1)), drag: 0.6, life: [0.5, 0.9], size: [0.26, 0.44], sizeEnd: 0.15, color: p.colors || ['#ffd27a', '#ff8a2a'], colorEnd: p.end || '#c8281a' }));
    auraEmitter(rig, rt, 10, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.5, 0.2), count: 1, vel: () => V(rand(-0.3, 0.3), rand(1, 2), rand(-0.3, 0.3)), life: [0.6, 1.1], size: [0.04, 0.07], color: '#ffe8a0', colorEnd: '#ff5a1a' }));
  },
  petals(rig, p, rt) {
    auraEmitter(rig, rt, 13, (b) => rt.ps(p.kind || 'petal', NB).emit({ pos: discPos(b, 1.2, 2.2, 2.7), count: 1, vel: () => V(rand(0.1, 0.4), rand(-0.45, -0.3), rand(-0.2, 0.2)), life: [4, 5], size: [0.1, 0.16], sizeEnd: 0.9, color: p.colors || ['#ffb0c8', '#ff8fb8', '#ffd0e0'] }));
  },
  snow(rig, p, rt) {
    auraEmitter(rig, rt, 16, (b) => rt.ps('snow').emit({ pos: discPos(b, 1.2, 2.2, 2.7), count: 1, vel: () => V(rand(-0.1, 0.1), rand(-0.5, -0.3), rand(-0.1, 0.1)), life: [4, 5], size: [0.08, 0.15], sizeEnd: 0.8, color: ['#ffffff', '#cfefff'] }));
    auraEmitter(rig, rt, 6, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.55, 0.08), count: 1, vel: () => V(0, rand(0.1, 0.3), 0), life: [0.8, 1.4], size: [0.12, 0.2], sizeEnd: 0.2, color: '#bfeeff' }));
  },
  stars(rig, p, rt) {
    auraEmitter(rig, rt, 22, (b) => rt.ps('star').emit({ pos: discPos(b, 0.6, 0.1, 1.9), count: 1, speed: 0.05, life: [0.5, 1.1], size: [0.12, 0.28], sizeEnd: 0.2, color: p.colors || ['#ffffff', '#ffe08a', '#bfe0ff'] }));
  },
  hearts(rig, p, rt) {
    auraEmitter(rig, rt, 7, (b) => rt.ps('heart', NB).emit({ pos: ringPos(b, 0.5, 0.2), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.4, 0.7), rand(-0.1, 0.1)), life: [1.6, 2.2], size: [0.12, 0.2], sizeEnd: 1.1, color: p.colors || ['#ff5a8a', '#ff8fb8', '#ff3a6a'] }));
  },
  notes(rig, p, rt) {
    auraEmitter(rig, rt, 6, (b) => rt.ps('note', NB).emit({ pos: ringPos(b, 0.45, 0.6), count: 1, vel: () => V(rand(-0.25, 0.25), rand(0.35, 0.6), rand(-0.25, 0.25)), life: [1.6, 2.2], size: [0.14, 0.2], sizeEnd: 1, color: ['#ff7ab8', '#7fc8ff', '#ffd34d', '#8affb0'] }));
  },
  bubbles(rig, p, rt) {
    auraEmitter(rig, rt, 7, (b) => rt.ps('bubble').emit({ pos: ringPos(b, 0.55, 0.1), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.3, 0.6), rand(-0.1, 0.1)), life: [2, 3], size: [0.08, 0.18], sizeEnd: 1.3, color: ['#bfefff', '#d8c8ff', '#ffffff'] }));
  },
  sparks(rig, p, rt) {
    auraEmitter(rig, rt, 60, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.5, rand(0.02, 0.6)), count: 1, speed: [0.5, 1.5], gravity: -3, life: [0.15, 0.35], size: [0.05, 0.1], color: p.colors || ['#ffffff', '#9ae8ff'], colorEnd: '#3a6aff' }));
    auraEmitter(rig, rt, 6, (b) => rt.ps('star').emit({ pos: ringPos(b, 0.45, rand(0.1, 1.2)), count: 1, speed: 0, life: [0.1, 0.2], size: [0.3, 0.5], color: '#cfefff' }));
  },
  butterflies(rig, p, rt) {
    const g = group(rig.root, 0, 0, 0);
    const flies = (p.colors || ['#7fc8ff', '#ff9ad0', '#ffe08a', '#b48cff', '#8affd0', '#ffffff']).map((c, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('butterfly'), color: lin(c), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.16); g.add(s); s.userData = { a: (i / 6) * Math.PI * 2, r: 0.55 + (i % 3) * 0.12, y: 0.5 + (i % 4) * 0.35, sp: 0.6 + (i % 3) * 0.25 };
      return s;
    });
    rt.on(({ t }) => flies.forEach((s) => { const u = s.userData, a = u.a + t * u.sp; s.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 2 + u.a) * 0.12, Math.sin(a) * u.r); s.scale.x = 0.16 * (0.35 + Math.abs(Math.sin(t * 14 + u.a)) * 0.65); }));
    auraEmitter(rig, rt, 6, (b) => rt.ps('dot').emit({ pos: discPos(b, 0.7, 0.3, 1.8), count: 1, speed: 0.05, life: [0.6, 1], size: [0.05, 0.09], color: '#ffffff' }));
  },
  magicCircle(rig, p, rt) {
    const disc = mesh(new THREE.PlaneGeometry(1.7, 1.7), unlit(p.color || '#b48cff', { map: TX.runeCircle(p.rune || 'star'), opacity: 0.85, add: true }), rig.root, 0, 0.025, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    const disc2 = mesh(new THREE.PlaneGeometry(1.1, 1.1), unlit(p.color2 || '#7fe0ff', { map: TX.runeCircle('hex'), opacity: 0.6, add: true }), rig.root, 0, 0.03, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    disc.renderOrder = disc2.renderOrder = 2;
    rt.on(({ t }) => { disc.rotation.z = t * 0.4; disc2.rotation.z = -t * 0.7; disc.material.opacity = 0.7 + Math.sin(t * 2.5) * 0.15; });
    auraEmitter(rig, rt, 14, (b) => rt.ps('dot').emit({ pos: discPos(b, 0.75, 0.02, 0.05), count: 1, vel: () => V(0, rand(0.5, 1.1), 0), life: [0.8, 1.4], size: [0.05, 0.1], color: [p.color || '#b48cff', p.color2 || '#7fe0ff'] }));
  },
  leaves(rig, p, rt) {
    auraEmitter(rig, rt, 11, (b) => rt.ps('leaf', NB).emit({ pos: discPos(b, 1.2, 2.2, 2.7), count: 1, vel: () => V(rand(0.1, 0.4), rand(-0.5, -0.35), rand(-0.2, 0.2)), life: [4, 5], size: [0.12, 0.18], sizeEnd: 0.9, color: p.colors || ['#ff8a2a', '#e8433a', '#ffc83a', '#c8682a'] }));
  },
  coins(rig, p, rt) {
    auraEmitter(rig, rt, 9, (b) => rt.ps('coin', NB).emit({ pos: ringPos(b, 0.35, 0.1), count: 1, vel: () => V(rand(-0.5, 0.5), rand(2, 3), rand(-0.5, 0.5)), gravity: -6, life: [0.8, 1.0], size: [0.1, 0.14], sizeEnd: 0.9, color: ['#ffd34d', '#ffbf2a'] }));
    auraEmitter(rig, rt, 8, (b) => rt.ps('star').emit({ pos: discPos(b, 0.6, 0.1, 1.2), count: 1, speed: 0, life: [0.3, 0.6], size: [0.1, 0.18], color: '#fff1b0' }));
  },
  shadow(rig, p, rt) {
    auraEmitter(rig, rt, 16, (b) => rt.ps('smoke', NB).emit({ pos: ringPos(b, 0.45, 0.05), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.4, 0.8), rand(-0.1, 0.1)), drag: 0.5, life: [0.9, 1.4], size: [0.25, 0.4], sizeEnd: 1.8, color: p.color || '#2a1240', alpha: 0.55 }));
    auraEmitter(rig, rt, 8, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.5, rand(0.1, 0.8)), count: 1, vel: () => V(0, rand(0.3, 0.6), 0), life: [0.6, 1], size: [0.05, 0.08], color: p.glow || '#b46aff' }));
  },
};

/* ================= ผู้ติดตาม (ลอยข้างตัว) ================= */
const faceSprite = (parent, x, y, z, w = 0.16, eye) => mesh(new THREE.PlaneGeometry(w, w / 2), unlit('#ffffff', { map: petFaceTex(eye), opacity: 1 }), parent, x, y, z, { keep: true, shadow: false });
function petRoot(rig, rt, { height = 1.15, side = 0.62, bob = 0.06, speed = 2 } = {}) {
  const g = group(rig.root, side, height, -0.15);
  rt.on(({ t }) => { g.position.y = height + Math.sin(t * speed) * bob; g.rotation.y = Math.sin(t * 0.7) * 0.35; });
  return g;
}
const PET = {
  dragon(rig, p, rt) {
    const g = petRoot(rig, rt), c = p.color || '#5ac85a', belly = T(p.belly || '#fff0b0');
    const b = group(g);
    mesh(sph(0.11, 14, 10), T(c), b, 0, 0, 0, { s: [1, 0.95, 1.15] });
    mesh(sph(0.085, 12, 8), belly, b, 0, -0.01, 0.04, { s: [0.9, 1, 0.8] });
    mesh(sph(0.095, 14, 10), T(c), b, 0, 0.12, 0.07);
    mesh(sph(0.055, 10, 8), T(c), b, 0, 0.1, 0.15, { s: [1, 0.8, 1] });
    for (const s of [-1, 1]) { mesh(cone(0.022, 0.07, 6), T(p.horn || '#fff0c8'), b, s * 0.05, 0.21, 0.04, { r: [-0.4, 0, s * -0.3] }); mesh(sph(0.018, 8, 6), T('#1e1420'), b, s * 0.042, 0.14, 0.155); mesh(sph(0.007, 6, 4), T('#ffffff'), b, s * 0.038, 0.148, 0.17, { noOutline: true }); }
    taper(b, bez3(V(0, -0.02, -0.08), V(0, -0.08, -0.18), V(0.06, -0.02, -0.26), V(0.1, 0.04, -0.28), 6), 0.04, 0.008, T(c));
    bake(b);
    const wm = DS(p.wing || shadeHex(c, -0.2));
    const wings = [-1, 1].map((s) => { const pv = group(g, s * 0.06, 0.06, -0.04); const w = mesh(shapeGeo((sh) => { sh.moveTo(0, 0); sh.lineTo(0.08, 0.1); sh.quadraticCurveTo(0.12, 0.04, 0.16, 0.02); sh.quadraticCurveTo(0.1, -0.0, 0.12, -0.06); sh.quadraticCurveTo(0.06, -0.02, 0, -0.03); }), wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true }); return pv; });
    rt.on(({ t }) => wings.forEach((pv, i) => { pv.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * 14) * 0.6); }));
  },
  slime(rig, p, rt) {
    const g = petRoot(rig, rt, { height: 0.95, bob: 0 }), c = p.color || '#6ad8ff';
    const body = group(g);
    mesh(sph(0.14, 18, 12), toon(c, { transparent: true, opacity: 0.86, emissive: c, emissiveIntensity: 0.25 }), body, 0, 0, 0, { s: [1, 0.85, 1] });
    mesh(sph(0.03, 8, 6), unlit('#ffffff', { opacity: 0.8 }), body, -0.05, 0.07, 0.09, { keep: true });
    faceSprite(body, 0, 0.0, 0.143, 0.14);
    if (p.crown) { mesh(cyl(0.04, 0.035, 0.035, 10, true), DS('#ffcf4a', { emissive: '#3a2a00' }), body, 0, 0.13, 0); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mesh(cone(0.012, 0.03, 4), metal('#ffcf4a'), body, Math.sin(a) * 0.04, 0.16, Math.cos(a) * 0.04); } }
    rt.on(({ t }) => { const k = Math.abs(Math.sin(t * 3.2)); body.position.y = k * 0.12; body.scale.set(1 + (1 - k) * 0.12, 0.88 + k * 0.18, 1 + (1 - k) * 0.12); });
  },
  ghost(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.08, speed: 1.6 }), white = toon('#f6f4ff', { emissive: '#3a3a5a', emissiveIntensity: 0.5 });
    mesh(sph(0.11, 16, 12), white, g, 0, 0.04, 0);
    mesh(new THREE.ConeGeometry(0.11, 0.16, 16, 1, true), toon('#f6f4ff', { emissive: '#3a3a5a', emissiveIntensity: 0.5, side: THREE.DoubleSide }), g, 0, -0.07, 0, { r: [Math.PI, 0, 0], noOutline: true });
    faceSprite(g, 0, 0.04, 0.105, 0.13);
    const lantern = group(g, 0.12, -0.04, 0.04);
    mesh(box(0.05, 0.065, 0.05), toon('#ffd34d', { emissive: '#ffb347', emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), lantern);
    for (const y of [-0.036, 0.036]) mesh(box(0.06, 0.012, 0.06), T('#3a2a20'), lantern, 0, y, 0);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin('#ffb347'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.3); lantern.add(glow);
    mesh(sph(0.03, 8, 6), white, g, 0.1, -0.0, 0.03);
    rt.on(({ t }) => { lantern.rotation.z = Math.sin(t * 2) * 0.2; glow.material.opacity = 0.55 + Math.sin(t * 6) * 0.15; });
  },
  starSprite(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.07 });
    const s = mesh(extrude((sh) => starShape(sh, 0.15, 0.07), 0.06, 0.02), G(p.color || '#ffd34d', 1.1), g);
    faceSprite(g, 0, -0.005, 0.052, 0.11);
    const tip = new THREE.Object3D(); g.add(tip);
    rt.on(({ t, dt }) => { g.rotation.z = Math.sin(t * 1.5) * 0.2; if (Math.random() < dt * 14) rt.ps('star').emit({ pos: rt.worldPos(tip).add(V(rand(-0.08, 0.08), rand(-0.08, 0.08), rand(-0.05, 0.05))), count: 1, vel: () => V(rand(-0.1, 0.1), -rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.5, 0.9], size: [0.06, 0.12], color: ['#ffffff', p.color || '#ffd34d', '#ff9ad0'] }); });
  },
  owl(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.04, speed: 1.4 }), c = p.color || '#8a6a4a';
    const b = group(g);
    mesh(sph(0.12, 14, 10), T(c), b, 0, 0, 0, { s: [1, 1.1, 0.95] });
    mesh(sph(0.09, 12, 8), T(p.belly || '#f2dcb8'), b, 0, -0.03, 0.05, { s: [0.9, 1, 0.7] });
    for (const s of [-1, 1]) {
      mesh(sph(0.045, 12, 8), T('#ffffff'), b, s * 0.048, 0.05, 0.095, { s: [1, 1, 0.5] });
      mesh(sph(0.025, 10, 8), T(p.eye || '#e8a020'), b, s * 0.048, 0.05, 0.115, { s: [1, 1, 0.5] });
      mesh(sph(0.013, 8, 6), T('#1e1420'), b, s * 0.048, 0.05, 0.124);
      mesh(cone(0.025, 0.07, 4), T(shadeHex(c, -0.2)), b, s * 0.07, 0.14, 0.0, { r: [0, 0, s * -0.3] });
    }
    mesh(cone(0.016, 0.04, 4), T('#ffb347'), b, 0, 0.01, 0.12, { r: [Math.PI / 2 + 0.6, 0, 0] });
    if (p.hat) { mesh(cyl(0.08, 0.08, 0.012, 4), T('#2a2430'), b, 0, 0.14, 0, { r: [0, Math.PI / 4, 0] }); mesh(cyl(0.035, 0.04, 0.04, 10), T('#2a2430'), b, 0, 0.125, 0); }
    bake(b);
    const wings = [-1, 1].map((s) => { const w = mesh(sph(0.05, 10, 8), T(shadeHex(c, -0.15)), g, s * 0.11, 0, -0.01, { s: [0.5, 1.3, 1], keep: true }); return w; });
    rt.on(({ t }) => { const f = Math.max(0, Math.sin(t * 1.3)) > 0.9 ? Math.sin(t * 30) * 0.6 : 0; wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + f); }); });
  },
  cloudCat(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.05, speed: 1.2 }), c = p.color || '#ffffff';
    const b = group(g);
    for (const [x, y, z, r] of [[0, 0, 0, 0.1], [-0.08, -0.02, 0, 0.075], [0.08, -0.02, 0, 0.075], [-0.04, -0.05, 0.05, 0.065], [0.04, -0.05, 0.05, 0.065], [0, -0.04, -0.06, 0.08]]) mesh(sph(r, 12, 8), T(c), b, x, y, z);
    for (const s of [-1, 1]) mesh(cone(0.035, 0.06, 3), T(c), b, s * 0.055, 0.1, 0, { r: [0, Math.PI / 6, -s * 0.3], s: [1, 1, 0.55] });
    for (const s of [-1, 1]) mesh(cone(0.02, 0.035, 3), T('#ffb0c8'), b, s * 0.055, 0.095, 0.012, { r: [0, Math.PI / 6, -s * 0.3], s: [1, 1, 0.3] });
    bake(b);
    faceSprite(g, 0, 0.0, 0.1, 0.12);
    auraEmitter(rig, rt, 3, () => rt.ps('dot').emit({ pos: rt.worldPos(g).add(V(rand(-0.1, 0.1), -0.1, 0)), count: 1, vel: () => V(0, -0.2, 0), life: [0.6, 1], size: [0.06, 0.1], color: '#dff4ff' }));
  },
};

/* ================= ชุด (เปลี่ยนสีตัว + ชิ้นส่วนเพิ่ม) ================= */
function overlay(rig, tex, color, rep = [3, 2], glow = false) {
  const t = tex.clone(); t.needsUpdate = true; t.isOwned = true; t.repeat.set(rep[0], rep[1]);
  const extra = glow ? { emissive: new THREE.Color('#ffffff'), emissiveMap: t } : {};
  mesh(new THREE.CylinderGeometry(0.153, 0.218, 0.37, 20, 1, true), TM(color || '#ffffff', t, { transparent: true, alphaTest: 0.35, ...extra }), rig.torso, 0, 0.18, 0, { noOutline: true });
}
function outfitParts(rig, p, rt, L) {
  const P = p.parts || {};
  const add = group(rig.torso);
  // คอ + ปกเสื้อ (แทนผ้าพันคอเดิมที่ถูกซ่อน ไม่ให้เห็นช่องระหว่างหัวกับลำตัว)
  mesh(cyl(0.072, 0.085, 0.11, 12), T(L.skin || '#f6d2b0'), add, 0, 0.42, 0);
  if (!P.collar) mesh(torus(0.118, 0.04, 8, 20), T(P.neck || shadeHex(L.tunic || '#3f6fc4', 0.35)), add, 0, 0.385, 0, { r: [Math.PI / 2, 0, 0] });
  if (P.pattern) overlay(rig, patternTex(P.pattern.kind, P.pattern.c1, P.pattern.c2), '#ffffff', P.pattern.rep, P.pattern.glow);
  if (P.skirt) {
    const s = P.skirt, len = s.len || 0.26, rb = s.flare || 0.28;
    const mat = s.starfield ? (() => { const t = starfieldTex().clone(); t.needsUpdate = true; t.isOwned = true; t.repeat.set(3, 1); return new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: t, emissive: new THREE.Color('#ffffff'), emissiveMap: t, emissiveIntensity: s.glow ?? 0.8, gradientMap: gradientMap(), side: THREE.DoubleSide }); })() : s.pattern ? TM('#ffffff', (() => { const t = patternTex(s.pattern.kind, s.pattern.c1, s.pattern.c2, s.color).clone(); t.needsUpdate = true; t.isOwned = true; t.repeat.set(4, 1); return t; })(), { side: THREE.DoubleSide }) : DS(s.color);
    mesh(new THREE.CylinderGeometry(0.212, rb, len, 22, 1, true), mat, add, 0, -len / 2 + 0.02, 0, { noOutline: true });
    if (s.trim) mesh(torus(rb, 0.016, 6, 26), T(s.trim), add, 0, -len + 0.02, 0, { r: [Math.PI / 2, 0, 0] });
    if (s.glowHem) mesh(torus(rb + 0.004, 0.009, 4, 32), G(s.glowHem, 1.9), add, 0, -len + 0.035, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    if (s.frill) for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; mesh(sph(0.03, 8, 6), T(s.frill), add, Math.cos(a) * rb, -len + 0.01, Math.sin(a) * rb, { s: [1, 0.7, 0.6], r: [0, -a, 0] }); }
    if (s.layer) { mesh(new THREE.CylinderGeometry(0.214, rb * 0.92, len * 0.62, 22, 1, true), DS(s.layer), add, 0, -len * 0.31 + 0.02, 0, { noOutline: true }); mesh(torus(rb * 0.92, 0.012, 6, 26), T(s.trim || '#ffffff'), add, 0, -len * 0.62 + 0.02, 0, { r: [Math.PI / 2, 0, 0] }); }
  }
  if (P.armor) {
    const a = P.armor, steel = metal(a.color || '#d8dee8'), trim = metal(a.trim || '#ffcf4a');
    mesh(new THREE.CylinderGeometry(0.163, 0.205, 0.27, 20, 1, true, -1.15, 2.3), toon(a.color || '#d8dee8', { emissive: '#10141a', side: THREE.DoubleSide }), add, 0, 0.24, 0.006, { noOutline: true });
    mesh(extrude((sh) => starShape(sh, 0.04, 0.018, 4), 0.01, 0.003), trim, add, 0, 0.26, 0.2);
    for (const arm of rig.arms) {
      const side = arm === rig.arms[0] ? -1 : 1;
      const pd = mesh(new THREE.SphereGeometry(0.095, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), steel, arm, side * 0.02, 0.01, 0, { s: [1.2, 0.85, 1.15], r: [0, 0, side * -0.35] });
      mesh(torus(0.088, 0.013, 6, 16), trim, arm, side * 0.025, -0.02, 0, { r: [Math.PI / 2, side * 0.35, 0] });
      mesh(cyl(0.056, 0.05, 0.1, 10), steel, arm, side * 0.03, -0.19, 0);
    }
    for (const leg of rig.legs || []) mesh(cyl(0.075, 0.07, 0.13, 12), steel, leg, 0, -0.2, 0.01);
  }
  if (P.epaulettes) for (const arm of rig.arms) { const side = arm === rig.arms[0] ? -1 : 1; mesh(box(0.11, 0.025, 0.1), metal(P.epaulettes), arm, side * 0.02, 0.03, 0); for (let i = 0; i < 4; i++) mesh(cyl(0.006, 0.006, 0.05, 4), metal(P.epaulettes), arm, side * 0.06, 0.0, -0.04 + i * 0.027); }
  if (P.coatTails) for (const s of [-1, 1]) mesh(box(0.1, 0.3, 0.016), T(P.coatTails), add, s * 0.07, -0.08, -0.19, { r: [0.12, 0, s * 0.06] });
  if (P.sash) { const sa = mesh(torus(0.2, 0.025, 6, 24), T(P.sash), add, 0, 0.22, 0, { s: [1, 1, 0.75] }); sa.rotation.set(Math.PI / 2, -0.5, 0); }
  if (P.collar) { mesh(torus(0.14, 0.045, 8, 20), T(P.collar), add, 0, 0.38, 0, { r: [Math.PI / 2, 0, 0] }); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; mesh(sph(0.035, 8, 6), T(P.collar), add, Math.cos(a) * 0.16, 0.38, Math.sin(a) * 0.16); } }
  if (P.buttons) for (let i = 0; i < 3; i++) mesh(sph(0.015, 8, 6), metal(P.buttons), add, 0, 0.32 - i * 0.07, 0.17 + i * 0.012);
  if (P.tie) { mesh(box(0.035, 0.03, 0.02), T(P.tie), add, 0, 0.35, 0.155); mesh(box(0.04, 0.13, 0.012), T(P.tie), add, 0, 0.27, 0.17, { r: [-0.15, 0, 0] }); }
  if (P.gloves) for (const arm of rig.arms) { const side = arm === rig.arms[0] ? -1 : 1; mesh(sph(0.056, 10, 8), T(P.gloves), arm, side * 0.036, -0.275, 0); mesh(cyl(0.052, 0.05, 0.06, 10), T(P.gloves), arm, side * 0.034, -0.23, 0); }
  if (P.mantle) mesh(new THREE.CylinderGeometry(0.13, 0.27, 0.18, 22, 1, true), DS(P.mantle), add, 0, 0.32, 0, { noOutline: true });
  if (P.wraps) { for (const arm of rig.arms) for (let i = 0; i < 3; i++) mesh(torus(0.05, 0.008, 4, 12), T(P.wraps), arm, (arm === rig.arms[0] ? -1 : 1) * 0.03, -0.12 - i * 0.04, 0, { r: [Math.PI / 2, 0, 0] }); for (const leg of rig.legs || []) for (let i = 0; i < 3; i++) mesh(torus(0.063, 0.008, 4, 12), T(P.wraps), leg, 0, -0.08 - i * 0.05, 0, { r: [Math.PI / 2, 0, 0] }); }
  if (P.puffPants) for (const leg of rig.legs || []) mesh(sph(0.1, 12, 8), T(P.puffPants), leg, 0, -0.12, 0, { s: [0.95, 1.4, 0.95] });
  if (P.pendant) { mesh(torus(0.1, 0.006, 4, 16), metal('#ffcf4a'), add, 0, 0.36, 0.06, { r: [Math.PI / 2 - 0.5, 0, 0] }); mesh(oct(0.03), gem(P.pendant, 1.4), add, 0, 0.29, 0.17, { noOutline: true }); }
  if (P.belt) mesh(box(0.08, 0.06, 0.02), metal(P.belt), add, 0, 0.08, 0.215);
  if (P.vest) mesh(new THREE.CylinderGeometry(0.155, 0.2, 0.3, 20, 1, true, -0.95, 1.9), DS(P.vest), add, 0, 0.21, 0.004, { noOutline: true });
  if (P.gears) for (const [x, y, r] of [[0.12, 0.25, 0.04], [-0.1, 0.12, 0.03]]) { const gg = group(add, x, y, 0.2); mesh(torus(r, 0.01, 4, 12), metal('#c9a24a'), gg); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mesh(box(0.012, 0.016, 0.01), metal('#c9a24a'), gg, Math.cos(a) * (r + 0.01), Math.sin(a) * (r + 0.01), 0, { r: [0, 0, a] }); } rt.on(({ t }) => { gg.rotation.z = t * (x > 0 ? 1 : -1.4); }); }
  if (P.shoulderPuffs) for (const arm of rig.arms) { const side = arm === rig.arms[0] ? -1 : 1; mesh(sph(0.078, 12, 10), T(P.shoulderPuffs), arm, side * 0.015, -0.015, 0, { s: [1, 0.9, 1] }); mesh(torus(0.055, 0.013, 4, 14), T(P.puffTrim || '#ffffff'), arm, side * 0.022, -0.075, 0, { r: [Math.PI / 2, 0, 0] }); }
  if (P.neon) {
    const nm = G(P.neon, 1.9);
    mesh(torus(0.216, 0.01, 4, 30), nm, add, 0, 0.005, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    for (const sx of [-1, 1]) mesh(box(0.012, 0.3, 0.012), nm, add, sx * 0.06, 0.19, 0.188, { r: [-0.17, 0, 0], noOutline: true });
    for (const arm of rig.arms) mesh(torus(0.052, 0.007, 4, 14), nm, arm, (arm === rig.arms[0] ? -1 : 1) * 0.03, -0.16, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    for (const leg of rig.legs || []) mesh(torus(0.068, 0.007, 4, 14), nm, leg, 0, -0.16, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
  }
  if (P.chestPlate) {
    const a = P.chestPlate;
    mesh(new THREE.CylinderGeometry(0.164, 0.206, 0.27, 20, 1, true, -1.15, 2.3), toon(a.color, { emissive: shadeHex(a.color, -0.7), side: THREE.DoubleSide }), add, 0, 0.24, 0.006, { noOutline: true });
    if (a.trim) for (const [y, r] of [[0.11, 0.201], [0.37, 0.168]]) mesh(new THREE.TorusGeometry(r, 0.008, 4, 24, 2.3), G(a.trim, 1.4), add, 0, y, 0.006, { r: [Math.PI / 2, 0, Math.PI / 2 - 1.15], noOutline: true });
  }
  if (P.pauldrons) {
    const d = P.pauldrons, pm = metal(d.color), tm = d.trim ? G(d.trim, 1.3) : metal('#ffcf4a');
    for (const arm of rig.arms) {
      const side = arm === rig.arms[0] ? -1 : 1, g = group(arm, side * 0.02, 0.01, 0, [0, 0, side * -0.35]);
      mesh(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), pm, g, 0, 0, 0, { s: [1.2, 0.85, 1.15] });
      mesh(torus(0.096, 0.012, 5, 18), tm, g, 0, -0.005, 0, { r: [Math.PI / 2, 0, 0], s: [1.2, 1.15, 1], noOutline: !!d.trim });
      if (d.style === 'spike') for (let k = 0; k < 3; k++) mesh(cone(0.022, k === 1 ? 0.15 : 0.1, 5), pm, g, side * 0.05, 0.05, (k - 1) * 0.05, { r: [0, 0, -side * 0.6] });
      else if (d.style === 'feather' || d.style === 'wing') {
        const cols = d.feathers || (d.style === 'wing' ? ['#ffffff', '#fff4dc'] : ['#ff5a1a', '#ffcf4a', '#ff8a2a']);
        const n = d.style === 'wing' ? 4 : 3;
        for (let k = 0; k < n; k++) { const a0 = (d.style === 'wing' ? 0.9 : 0.55) + k * 0.28; featherXY(g, side * 0.05, 0.04, 0.02 - k * 0.012, side > 0 ? a0 : Math.PI - a0, (d.style === 'wing' ? 0.13 : 0.11) + k * 0.012, 0.03, d.glow ? G(cols[k % cols.length], d.glow) : T(cols[k % cols.length], { emissive: '#3a3040' }), 0.01); }
      }
      bake(g);
    }
  }
  if (P.tassets) {
    const d = P.tassets, n = d.n || 10, pm = metal(d.color), tm = G(d.trim || '#ffcf4a', 1.4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const pl = mesh(box(0.1, 0.17, 0.014), pm, add, Math.sin(a) * 0.222, -0.075, Math.cos(a) * 0.222); pl.rotation.set(0.28, a, 0, 'YXZ');
      const tr = mesh(box(0.1, 0.016, 0.02), tm, add, Math.sin(a) * 0.245, -0.152, Math.cos(a) * 0.245, { noOutline: true }); tr.rotation.set(0.28, a, 0, 'YXZ');
    }
  }
  if (P.highCollar) {
    mesh(new THREE.CylinderGeometry(0.21, 0.13, 0.2, 22, 1, true, Math.PI - 1.4, 2.8), DS(P.highCollar), add, 0, 0.47, -0.01, { noOutline: true });
    if (P.glowTrim) mesh(new THREE.TorusGeometry(0.21, 0.007, 4, 28, 2.8), G(P.glowTrim, 1.8), add, 0, 0.57, -0.01, { r: [Math.PI / 2, 0, -Math.PI / 2 - 1.4], noOutline: true });
  }
  if (P.chainsBelt) for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; mesh(torus(0.014, 0.0045, 4, 10), metal(P.chainsBelt), add, Math.sin(a) * 0.222, 0.055 - Math.abs(Math.sin(a * 0.5)) * 0.03, Math.cos(a) * 0.222, { r: [i % 2 ? 0 : Math.PI / 2, a, 0] }); }
  if (P.glowTrim) {
    const gm = G(P.glowTrim, 1.8);
    mesh(torus(0.218, 0.008, 4, 30), gm, add, 0, 0.0, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    mesh(torus(0.156, 0.007, 4, 26), gm, add, 0, 0.36, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    mesh(box(0.011, 0.34, 0.011), gm, add, 0, 0.18, 0.19, { r: [-0.17, 0, 0], noOutline: true });
    for (const arm of rig.arms) mesh(torus(0.052, 0.007, 4, 14), gm, arm, (arm === rig.arms[0] ? -1 : 1) * 0.033, -0.23, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
  }
  if (P.coreGem) {
    const gg = group(add, 0, 0.255, 0.19);
    const gm = mesh(oct(0.04), G(P.coreGem, 2.2), gg, 0, 0, 0, { s: [1, 1.3, 0.6], noOutline: true });
    mesh(torus(0.05, 0.008, 4, 18), metal('#ffcf4a', 0.4), gg);
    const gl = glowSprite(gg, P.coreGem, 0.22, 0.45);
    rt.on(({ t }) => { gm.rotation.z = Math.sin(t * 1.5) * 0.2; gl.material.opacity = 0.35 + Math.sin(t * 3) * 0.12; });
  }
  if (P.hemFx && P.skirt) {
    const f = P.hemFx, len = P.skirt.len || 0.26, rb = P.skirt.flare || 0.28, q = V();
    rt.on(({ dt }) => { if (Math.random() > dt * (f.rate || 14)) return; const a = Math.random() * Math.PI * 2; q.set(Math.cos(a) * rb, -len + 0.03, Math.sin(a) * rb); rig.torso.localToWorld(q); rt.ps(f.kind || 'flame', f.blending).emit({ pos: q.clone(), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.3, 0.7), rand(-0.05, 0.05)), life: f.life || [0.4, 0.7], size: f.size || [0.08, 0.14], sizeEnd: 0.2, color: f.color, colorEnd: f.colorEnd || f.color }); });
  }
  if (P.shells) for (const [x, y] of [[0.09, 0.3], [-0.08, 0.22], [0.0, 0.14]]) mesh(sph(0.025, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), T(P.shells), add, x, y, 0.19, { r: [Math.PI / 2, 0, 0], s: [1, 0.5, 1] });
  bake(add);
}

/* ================= ชุดแฟชั่นชุดที่ 2 ================= */
// เท็กซ์เจอร์เพิ่มเติม
const candyTex = (c1 = '#ffb0d0', c2 = '#b8e8ff') => ctex('candy' + c1 + c2, 256, 256, (g, s) => {
  const gr = g.createLinearGradient(0, s, s, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.globalAlpha = 0.35; g.fillStyle = '#ffffff';
  for (let i = -s; i < s * 2; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 18, 0); g.lineTo(i + 18 - s, s); g.lineTo(i - s, s); g.fill(); }
  g.globalAlpha = 1;
  const dots = ['#ff5a8a', '#ffd34d', '#7fd0ff', '#8affb0', '#ffffff'];
  for (let i = 0; i < 26; i++) { g.fillStyle = dots[i % dots.length]; g.beginPath(); g.arc((i * 73) % s, (i * 41 + (i % 3) * 30) % s, 6 + (i % 3) * 2, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = 18; g.strokeStyle = '#ffffff'; g.strokeRect(0, 0, s, s);
});
const sleepFaceTex = () => ctex('sleepface', 128, 64, (g) => {
  g.strokeStyle = '#3a2a30'; g.lineWidth = 4; g.lineCap = 'round';
  for (const x of [40, 88]) { g.beginPath(); g.arc(x, 24, 9, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  g.fillStyle = 'rgba(255,120,150,0.6)'; for (const x of [22, 106]) { g.beginPath(); g.ellipse(x, 40, 9, 5, 0, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = 3; g.beginPath(); g.arc(64, 44, 4, 0, Math.PI * 2); g.stroke();
});
const decal = (parent, x, y, z, w, tex, color = '#ffffff') => mesh(new THREE.PlaneGeometry(w, w * (tex.image.height / tex.image.width)), unlit(color, { map: tex, opacity: 1 }), parent, x, y, z, { keep: true, shadow: false });
const glowSprite = (parent, color, scale, opacity = 0.6, x = 0, y = 0, z = 0) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale); s.position.set(x, y, z); parent.add(s); return s;
};
// กุหลาบ (กลีบสองชั้น หันหน้าไป +z ของกลุ่ม)
function rose(parent, x, y, z, color = '#c8102a', r = 0.05, rot = [0, 0, 0]) {
  const g = group(parent, x, y, z, rot), dark = T(shadeHex(color, -0.25)), main = T(color);
  mesh(sph(r * 0.55, 10, 8), dark, g, 0, 0, r * 0.15);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mesh(sph(r * 0.5, 8, 6), main, g, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.05, { s: [1, 1, 0.5], r: [0, 0, a] }); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; mesh(sph(r * 0.6, 8, 6), main, g, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, -r * 0.15, { s: [1, 0.85, 0.4], r: [0, 0, a] }); }
  bake(g);
  return g;
}
// โซ่ห้อยแกว่ง (พู่ ระย้า หนวดแมงกะพรุน) — คืนรายการข้อต่อให้ขยับเอง
function chain(parent, n, len, makeSeg) {
  const segs = []; let par = parent;
  for (let i = 0; i < n; i++) { const sg = group(par, 0, i ? -len : 0, 0); makeSeg(sg, i); segs.push(sg); par = sg; }
  return segs;
}

/* ---------- ปีก ---------- */
// ปีกนีออน: กรอบเส้นแสงเรขาคณิต + แผ่นโปร่งเรืองแสง + พิกเซลหล่น
function wingNeon(rig, p, rt) {
  const c = p.color || '#4af8ff', c2 = p.color2 || '#ff4ad8', size = p.size || 1;
  const line = G(c, 2.2), node = G(c2, 2);
  const O = [[0, 0], [0.25, 0.32], [0.62, 0.52], [0.92, 0.46], [0.72, 0.22], [0.84, 0.02], [0.6, -0.08], [0.66, -0.34], [0.36, -0.38], [0.08, -0.12]];
  const ribs = [[[0.04, 0.02], [0.72, 0.4]], [[0.05, 0], [0.7, 0.07]], [[0.05, -0.03], [0.5, -0.27]]];
  const fills = [];
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.42, flap: p.flap ?? 0.5, speed: p.speed ?? 0.8 })) {
    const W = group(pivot);
    const v = ([x, y], z = 0) => V(s * x * size, y * size, z);
    taper(W, [...O, O[0]].map((q) => v(q)), 0.013 * size, 0.013 * size, line, { cap: false, seg: 6 });
    for (const [a, b] of ribs) taper(W, [v(a), v(b)], 0.009 * size, 0.009 * size, line, { cap: false, joints: false, seg: 6 });
    for (const q of O.slice(1)) mesh(oct(0.026 * size), node, W, ...v(q, 0.006).toArray(), { noOutline: true });
    const fill = mesh(shapeGeo((sh) => { sh.moveTo(...O[0]); for (const q of O.slice(1)) sh.lineTo(...q); }), unlit(c, { opacity: 0.2, add: true }), W, 0, 0, -0.004, { s: [s * size, size, 1], keep: true, shadow: false });
    fill.renderOrder = 3; fills.push(fill);
    const tip = new THREE.Object3D(); tip.position.copy(v(O[3])); W.add(tip);
    rt.on(({ dt }) => { if (Math.random() < dt * 6) rt.ps('square').emit({ pos: rt.worldPos(tip).add(V(rand(-0.25, 0.1), rand(-0.6, 0.05), 0)), count: 1, vel: () => V(0, rand(-0.18, -0.06), 0), life: [0.6, 1.1], size: [0.05, 0.09], color: [c, c2, '#ffffff'] }); });
  }
  rt.on(({ t }) => fills.forEach((f) => { f.material.opacity = 0.16 + Math.sin(t * 3) * 0.06; }));
}

// ผ้าแพรเทพธิดา: แถบผ้าไหมสองเส้นลอยวนหลังตัว ปลิวพลิ้วตลอดเวลา
function wingRibbon(rig, p, rt) {
  const N = 44, Wd = p.width || 0.14;
  const tex = ctex('silk' + p.c1 + p.c2 + p.edge, 256, 32, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, p.c1 || '#ffe0f0'); gr.addColorStop(0.5, p.c2 || '#ffb0d8'); gr.addColorStop(1, p.c1 || '#ffe0f0');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = p.edge || '#ffd27a'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
    g.globalAlpha = 0.6; g.fillStyle = '#ffffff'; for (let x = 8; x < w; x += 22) { g.beginPath(); g.arc(x, h / 2, 2.2, 0, Math.PI * 2); g.fill(); }
  });
  const mat = TM('#ffffff', tex, { side: THREE.DoubleSide, emissive: lin(p.glow || '#4a2a40') });
  const base = [[0.12, 0.34, -0.12], [0.3, 0.74, -0.3], [0.62, 0.8, -0.34], [0.74, 0.4, -0.26], [0.62, -0.06, -0.18], [0.5, -0.44, -0.08]];
  const ribbons = [-1, 1].map((s) => {
    const geo = new THREE.PlaneGeometry(1, 1, N - 1, 1);
    const m = mesh(geo, mat, rig.torso, 0, 0, 0, { keep: true, noOutline: true });
    m.frustumCulled = false;
    return { s, m, geo };
  });
  const tmp = V(), wv = V(), Z = V(0, 0, 1);
  const anchors = [];
  const step = (t) => {
    for (const { s, geo } of ribbons) {
      const pts = base.map(([x, y, z], i) => V(s * x + s * Math.sin(t * 1.3 + i * 0.9) * 0.05 * i / 5, y + Math.sin(t * 1.7 + i) * 0.04 * i / 5, z + Math.cos(t * 1.1 + i) * 0.05 * i / 5));
      const curve = new THREE.CatmullRomCurve3(pts);
      const pos = geo.attributes.position;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1), c = curve.getPoint(u), tg = curve.getTangent(u);
        wv.crossVectors(tg, Z); if (wv.lengthSq() < 1e-4) wv.set(1, 0, 0); wv.normalize();
        wv.applyAxisAngle(tg, Math.sin(t * 2.2 + u * 7 + s) * 0.7);
        const w = Wd * (0.55 + 0.45 * Math.sin(Math.min(1, u * 1.15) * Math.PI));
        tmp.copy(c).addScaledVector(wv, w / 2); pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        tmp.copy(c).addScaledVector(wv, -w / 2); pos.setXYZ(N + i, tmp.x, tmp.y, tmp.z);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      anchors[s > 0 ? 1 : 0] = curve;
    }
  };
  step(0);
  rt.on(({ t }) => step(t));
  rt.on(({ dt }) => {
    if (Math.random() > dt * 5 || !anchors[0]) return;
    const cv = anchors[(Math.random() * 2) | 0];
    rt.ps('star').emit({ pos: rig.torso.localToWorld(cv.getPoint(Math.random())), count: 1, speed: 0.05, life: [0.5, 0.9], size: [0.08, 0.14], color: ['#ffffff', p.c2 || '#ffb0d8', p.edge || '#ffd27a'] });
  });
}

// ปีกเถากุหลาบ: เถาหนามโค้ง ใบไม้ กุหลาบแดงดำ กลีบปลิว
function wingThorn(rig, p, rt) {
  const vineM = T(p.vine || '#2a3a26'), thornM = T(p.thorn || '#6a5a40'), leafM = T(p.leaf || '#2f6a3a'), size = p.size || 1;
  const tips = [];
  for (const { s, pivot } of wingRoot(rig, rt, { spread: p.spread ?? 0.48, flap: p.flap ?? 0.7, speed: p.speed ?? 0.7 })) {
    const W = group(pivot);
    const v = (x, y, z = 0) => V(s * x * size, y * size, z);
    const vines = [
      bez3(v(0, 0), v(0.22, 0.36, -0.01), v(0.55, 0.62, -0.02), v(0.88, 0.5, -0.03), 9),
      bez3(v(0, -0.01), v(0.3, 0.12, -0.01), v(0.62, 0.08, -0.02), v(0.92, -0.08, -0.03), 9),
      bez3(v(0, -0.03), v(0.18, -0.2, -0.01), v(0.42, -0.36, -0.02), v(0.6, -0.58, -0.03), 8),
    ];
    for (const pts of vines) {
      taper(W, pts, 0.034 * size, 0.008 * size, vineM);
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i], d = pts[i + 1].clone().sub(a).normalize();
        const n = V(-d.y, d.x, 0).multiplyScalar(i % 2 ? 1 : -1);
        const th = mesh(cone(0.013 * size, 0.055 * size, 4), thornM, W, a.x + n.x * 0.022, a.y + n.y * 0.022, a.z);
        th.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().add(d.clone().multiplyScalar(0.5)).normalize());
        if (i % 2 === 0) { const lf = mesh(sph(0.05 * size, 8, 6), leafM, W, a.x - n.x * 0.045, a.y - n.y * 0.045, a.z, { s: [1.5, 0.6, 0.25] }); lf.rotation.z = Math.atan2(-n.y, -n.x); }
      }
      tips.push({ W, p: pts[pts.length - 1] });
    }
    bake(W, { thick: 0.007 });
    const back = [0, Math.PI, 0];
    for (const [x, y, r, dark] of [[0.5, 0.58, 0.07, 0], [0.84, 0.5, 0.055, 0], [0.64, 0.07, 0.065, 0], [0.4, -0.34, 0.06, 1], [0.12, 0.03, 0.075, 0], [0.78, -0.04, 0.045, 1]]) rose(W, ...v(x, y, -0.02).toArray(), dark ? p.rose2 || '#2a1420' : p.rose || '#c8102a', r * size, back);
  }
  rt.on(({ dt }) => {
    if (Math.random() > dt * 3) return;
    const k = tips[(Math.random() * tips.length) | 0];
    rt.ps('petal', NB).emit({ pos: k.W.localToWorld(k.p.clone()), count: 1, vel: () => V(rand(-0.2, 0.2), rand(-0.35, -0.1), rand(-0.2, 0.1)), life: [1.2, 1.8], size: [0.08, 0.12], sizeEnd: 0.8, color: [p.rose || '#c8102a', '#ff5a6a'] });
  });
}

Object.assign(WING_BUILDERS, { neon: wingNeon, ribbon: wingRibbon, thorn: wingThorn });

/* ---------- หมวก ---------- */
Object.assign(HEAD, {
  // ไวเซอร์ไซเบอร์: แผ่นแสงคาดตา เส้นสแกนเลื่อน หูฟังวงแหวนเรือง เสาอากาศกะพริบ
  visor(rig, p, rt) {
    const c = p.color || '#4af8ff', c2 = p.color2 || '#ff4ad8', g = group(rig.head);
    const scan = ctex('visorscan', 64, 64, (gg, s) => { gg.fillStyle = 'rgba(255,255,255,0.4)'; gg.fillRect(0, 0, s, s); gg.fillStyle = 'rgba(255,255,255,1)'; for (let y = 2; y < s; y += 8) gg.fillRect(0, y, s, 2); }, { repeat: true });
    const t = scan.clone(); t.needsUpdate = true; t.isOwned = true; t.repeat.set(1, 1.5);
    // ชั้นล่างเป็นกระจกสีเข้ม ชั้นบนเป็นเส้นสแกนเรืองแสง
    mesh(new THREE.CylinderGeometry(0.29, 0.286, 0.1, 28, 1, true, -1.15, 2.3), new THREE.MeshBasicMaterial({ color: lin(p.glass || '#0e1830'), transparent: true, opacity: 0.88, side: THREE.DoubleSide }), g, 0, 0.2, 0, { keep: true, shadow: false }).renderOrder = 3;
    const vis = mesh(new THREE.CylinderGeometry(0.293, 0.289, 0.1, 28, 1, true, -1.15, 2.3), new THREE.MeshBasicMaterial({ color: lin(c), map: t, transparent: true, opacity: 0.8, side: THREE.FrontSide, blending: THREE.AdditiveBlending, depthWrite: false }), g, 0, 0.2, 0, { keep: true, shadow: false });
    vis.renderOrder = 4;
    const frame = T(p.frame || '#2a2a3a');
    for (const y of [0.255, 0.145]) mesh(new THREE.TorusGeometry(0.29, 0.011, 5, 30, 2.3), frame, g, 0, y, 0, { r: [Math.PI / 2, 0, Math.PI / 2 - 1.15] });
    for (const s of [-1, 1]) {
      mesh(cyl(0.065, 0.065, 0.05, 16), frame, g, s * 0.285, 0.2, 0, { r: [0, 0, Math.PI / 2] });
      mesh(torus(0.042, 0.009, 5, 16), G(c2, 1.8), g, s * 0.312, 0.2, 0, { r: [0, Math.PI / 2, 0], noOutline: true });
    }
    mesh(cyl(0.006, 0.006, 0.16, 5), frame, g, 0.3, 0.3, 0, { r: [0, 0, -0.25] });
    const led = mesh(sph(0.018, 8, 6), G(c2, 2), g, 0.32, 0.38, 0, { noOutline: true, keep: true });
    bake(g);
    rt.on(({ t: tt }) => { t.offset.y = -tt * 0.6; vis.material.opacity = 0.7 + Math.sin(tt * 4) * 0.12; led.visible = Math.sin(tt * 5) > -0.3; });
  },
  // มงกุฎปะการัง: กิ่งปะการังแตกแขนง มุกรอบวง และดาวทะเล
  coral(rig, p) {
    const g = group(rig.head, 0, 0.41, -0.01, [-0.15, 0, 0]);
    const cols = p.colors || ['#ff7a8a', '#ffa86a', '#ff5a9a'];
    mesh(torus(0.215, 0.022, 6, 28), metal(p.band || '#ffe9c8'), g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    // กิ่งหนึ่งกิ่ง: ลำหลักโค้งออกนอก + กิ่งย่อยสลับซ้ายขวา + กิ่งหลานที่ปลาย
    const branch = (base, out, side, h, m, depth = 0) => {
      const top = base.clone().addScaledVector(out, h * 0.35).add(V(0, h, 0));
      const pts = bez(base, base.clone().add(V(0, h * 0.55, 0)), top, 5);
      taper(g, pts, depth ? 0.012 : 0.02, 0.005, m);
      if (depth > 1) return;
      for (let k = 1; k <= 3; k++) {
        const q = pts[k + 1], sd = k % 2 ? 1 : -1;
        const sub = q.clone().addScaledVector(side, sd * h * 0.32).addScaledVector(out, h * 0.12).add(V(0, h * 0.32, 0));
        taper(g, bez(q, q.clone().addScaledVector(side, sd * h * 0.22), sub, 3), depth ? 0.008 : 0.012, 0.004, m);
        if (!depth && k === 2) branch(sub, out, side, h * 0.4, m, depth + 2);
      }
    };
    for (let i = 0; i < 7; i++) {
      const a = -1.25 + (i / 6) * 2.5, base = V(Math.sin(a) * 0.21, 0, Math.cos(a) * 0.21), out = V(Math.sin(a), 0, Math.cos(a)), side = V(Math.cos(a), 0, -Math.sin(a));
      branch(base, out, side, 0.13 + (i === 3 ? 0.08 : (i % 2) * 0.04), T(cols[i % cols.length]));
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(sph(0.02, 8, 6), toon('#fffaf2', { emissive: '#3a3040' }), g, Math.sin(a) * 0.215, -0.004, Math.cos(a) * 0.215); }
    mesh(extrude((sh) => starShape(sh, 0.05, 0.022), 0.014, 0.005), T(p.star || '#ffb84a'), g, 0.17, 0.05, 0.15, { r: [0, 0.8, 0.3] });
    bake(g);
  },
  // มงกุฎดอกบัว: กลีบสองชั้นสีชมพูไล่เฉด ฝักบัวทอง แสงเรืองอ่อน ๆ
  lotus(rig, p, rt) {
    const g = group(rig.head, 0.03, 0.46, -0.02, [-0.18, 0, 0.12]);
    mesh(cyl(0.13, 0.11, 0.02, 18), T(p.pad || '#4aa05a'), g, 0, -0.02, 0);
    for (const [n, d, len, w, tilt, col, ph, y] of [[9, 0.03, 0.14, 0.05, 1.05, p.outer || '#ff8ab8', 0, 0], [8, 0.02, 0.12, 0.045, 0.55, p.inner || '#ffd0e4', 0.4, 0.012]]) {
      const m = T(col);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ph;
        const up = V(Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
        const pt = mesh(sph(1, 10, 8), m, g, Math.sin(a) * d + up.x * len * 0.5, y + up.y * len * 0.5, Math.cos(a) * d + up.z * len * 0.5, { s: [w, len * 0.5, w * 0.4] });
        pt.rotation.set(tilt, a, 0, 'YXZ');
      }
    }
    mesh(cyl(0.035, 0.028, 0.035, 12), metal('#ffcf4a', 0.3), g, 0, 0.03, 0);
    bake(g);
    glowSprite(g, p.glow || '#ffb0d8', 0.45, 0.4, 0, 0.06, 0);
    const tip = new THREE.Object3D(); tip.position.set(0, 0.1, 0); g.add(tip);
    rt.on(({ dt }) => { if (Math.random() < dt * 4) rt.ps('star').emit({ pos: rt.worldPos(tip).add(V(rand(-0.12, 0.12), 0, rand(-0.12, 0.12))), count: 1, vel: () => V(0, rand(0.1, 0.25), 0), life: [0.6, 1], size: [0.05, 0.09], color: ['#ffffff', '#ffd0e4'] }); });
  },
  // ปิ่นปักผมบูรพา: มวยผม ปิ่นทองไขว้ ดอกไม้ และพู่ระย้าแกว่ง
  hairpin(rig, p, rt, L) {
    const g = group(rig.head, 0, 0.38, -0.2);
    mesh(sph(0.11, 14, 10), T(L.hair || '#e8a838'), g, 0, 0, 0, { s: [1, 0.85, 0.9] });
    mesh(torus(0.09, 0.018, 6, 18), T(p.band || '#c8283a'), g, 0, -0.03, 0.02, { r: [Math.PI / 2 - 0.3, 0, 0] });
    const gold = metal(p.gold || '#ffcf4a');
    for (const s of [-1, 1]) mesh(cyl(0.008, 0.008, 0.34, 6), gold, g, 0, 0.02, 0, { r: [0, 0, s * 1.1] });
    bake(g);
    const ends = [-1, 1].map((s) => V(-s * 0.15, 0.097, 0));
    flower(g, ends[0].x, ends[0].y, ends[0].z + 0.02, p.flower || '#d8233a', 0.032, '#ffcf4a');
    flower(g, ends[1].x, ends[1].y, ends[1].z + 0.02, p.flower2 || '#ff8fb8', 0.026, '#ffcf4a');
    const hang = group(g, ends[0].x, ends[0].y - 0.02, ends[0].z);
    const segs = chain(hang, 4, 0.032, (sg, i) => mesh(i % 2 ? sph(0.011, 6, 4) : cyl(0.004, 0.004, 0.032, 4), i % 2 ? gem(p.bead || '#7fe0d0', 0.6) : gold, sg, 0, -0.016, 0));
    mesh(cone(0.022, 0.07, 8), T(p.tassel || '#d8233a'), segs[segs.length - 1], 0, -0.07, 0, { r: [Math.PI, 0, 0] });
    flower(rig.head, 0.23, 0.33, 0.06, p.flower || '#d8233a', 0.04, '#ffcf4a', [0, 1.2, 0]);
    rt.on(({ t }) => segs.forEach((sg, i) => { sg.rotation.z = Math.sin(t * 2.4 + i * 0.5) * 0.2; sg.rotation.x = Math.sin(t * 1.7 + i) * 0.12; }));
  },
  // ช่อกุหลาบประดับข้างศีรษะ + โบว์ลูกไม้ดำ
  roseHead(rig, p) {
    const g = group(rig.head, -0.17, 0.39, 0.06, [0.2, -0.55, 0.5]);
    rose(g, 0, 0, 0, p.color || '#c8102a', 0.075);
    rose(g, 0.1, -0.04, -0.03, p.color2 || '#2a1420', 0.06);
    rose(g, -0.065, -0.08, 0, p.color || '#c8102a', 0.05);
    for (const [x, y, a] of [[0.06, 0.08, 0.6], [-0.11, 0.03, 2.2], [0.15, -0.1, -0.5]]) mesh(sph(0.05, 8, 6), T('#2f6a3a'), g, x, y, -0.03, { s: [1.5, 0.6, 0.25], r: [0, 0, a] });
    const b = group(g, 0.02, -0.03, -0.06);
    for (const s of [-1, 1]) { mesh(sph(0.06, 10, 8), T(p.bow || '#1e1a22'), b, s * 0.075, 0, 0, { s: [1.4, 0.8, 0.4], r: [0, 0, s * 0.3] }); mesh(box(0.03, 0.13, 0.01), T(p.bow || '#1e1a22'), b, s * 0.03, -0.08, 0, { r: [0, 0, s * 0.3] }); }
    bake(b); bake(g);
  },
  // หมวกคัพเค้ก: ถ้วยจีบ วิปครีมสามชั้น เชอร์รี่ และเม็ดน้ำตาลสี
  cupcake(rig, p) {
    const g = group(rig.head, 0.04, 0.44, -0.02, [-0.12, 0, -0.15]);
    const cup = p.cup || '#ff8fb8';
    mesh(cyl(0.15, 0.12, 0.1, 18), T(cup), g);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; mesh(box(0.012, 0.1, 0.012), T(shadeHex(cup, -0.15)), g, Math.sin(a) * 0.137, 0, Math.cos(a) * 0.137, { r: [0, a, 0] }); }
    const cream = T(p.cream || '#fff4f8');
    for (const [r, t, y] of [[0.13, 0.05, 0.07], [0.095, 0.045, 0.13], [0.06, 0.04, 0.18]]) mesh(torus(r, t, 8, 20), cream, g, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(sph(0.045, 10, 8), cream, g, 0, 0.215, 0);
    mesh(sph(0.042, 12, 10), T(p.cherry || '#e8233a'), g, 0, 0.27, 0);
    taper(g, bez(V(0, 0.3, 0), V(0.02, 0.34, 0), V(0.05, 0.36, 0), 3), 0.006, 0.004, T('#5a8a3a'), { cap: false });
    const spr = ['#ff5a8a', '#ffd34d', '#7fd0ff', '#8affb0', '#c08aff'];
    for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 0.06 + (i % 3) * 0.03, y = 0.2 - (r - 0.06) * 1.6; mesh(box(0.008, 0.008, 0.026), T(spr[i % spr.length]), g, Math.cos(a) * r, y, Math.sin(a) * r, { r: [i, a, 0], noOutline: true }); }
    bake(g);
  },
  // หมวกไหมพรมปอมปอม (คลุมผม)
  beanie(rig, p) {
    const c = p.color || '#d8433a', g = group(rig.head, 0, 0.22, -0.01, [-0.2, 0, 0]);
    const knit = ctex('knit', 64, 64, (gg, s) => { gg.fillStyle = '#fff'; gg.fillRect(0, 0, s, s); gg.strokeStyle = 'rgba(0,0,0,0.18)'; gg.lineWidth = 3; for (let x = 4; x < s; x += 8) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, s); gg.stroke(); } }, { repeat: true });
    const t = knit.clone(); t.needsUpdate = true; t.isOwned = true; t.repeat.set(10, 2);
    mesh(new THREE.SphereGeometry(0.3, 26, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), TM(c, t), g, 0, 0, 0, { s: [1.02, 1.08, 1.04] });
    mesh(torus(0.302, 0.045, 8, 30), TM(p.cuff || shadeHex(c, -0.12), t), g, 0, 0.02, 0, { r: [Math.PI / 2, 0, 0] });
    if (p.stripe) mesh(torus(0.285, 0.02, 6, 28), T(p.stripe), g, 0, 0.12, 0, { r: [Math.PI / 2, 0, 0] });
    const pom = group(g, 0, 0.34, 0);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? 0.035 : 0; mesh(sph(0.05, 10, 8), T(p.pom || '#ffffff'), pom, Math.cos(a) * r, (i % 3) * 0.012, Math.sin(a) * r); }
    bake(pom); bake(g);
  },
  // เขาอสูรสั้นคู่ + วงทองที่โคนเขา
  oniHorns(rig, p) {
    const g = group(rig.head), m = T(p.color || '#e8433a', { emissive: '#3a0a0a' }), gold = metal(p.ring || '#ffcf4a');
    for (const s of [-1, 1]) {
      const b = V(s * 0.12, 0.43, 0.09), dir = V(s * 0.25, 1, 0.12).normalize();
      taper(g, [b, b.clone().addScaledVector(dir, 0.09), b.clone().addScaledVector(dir, 0.17).add(V(s * 0.015, 0, 0)), b.clone().addScaledVector(dir, 0.24).add(V(s * 0.045, 0, -0.01))], 0.048, 0.006, m);
      mesh(torus(0.048, 0.012, 6, 14), gold, g, b.x, b.y + 0.012, b.z, { r: [Math.PI / 2 - 0.15, 0, -s * 0.25] });
    }
    bake(g);
  },
  // รัดเกล้าดารา: วงทองคาดหน้าผาก อัญมณีรูปดาว และดาวดวงเล็กโคจรเหนือหัว
  starTiara(rig, p, rt) {
    const g = group(rig.head, 0, 0.35, 0, [-0.32, 0, 0]);
    const gold = metal(p.gold || '#ffe08a', 0.2);
    mesh(torus(0.288, 0.014, 6, 36), gold, g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(extrude((sh) => starShape(sh, 0.07, 0.03), 0.02, 0.006), gem(p.gem || '#7fd0ff', 1.4), g, 0, 0.03, 0.29);
    for (const s of [-1, 1]) mesh(oct(0.022), gem(p.gem2 || '#ffe08a', 1.2), g, s * 0.13, 0.0, 0.26, { noOutline: true });
    bake(g);
    const orbit = group(rig.head, 0, 0.66, -0.02);
    const stars = [0, 1, 2, 3, 4].map((i) => mesh(extrude((sh) => starShape(sh, 0.035, 0.015), 0.012, 0.004), G(i % 2 ? '#ffffff' : p.gold || '#ffe08a', 1.6), orbit, 0, 0, 0, { noOutline: true }));
    rt.on(({ t }) => stars.forEach((st, i) => { const a = t * 0.9 + (i / 5) * Math.PI * 2; st.position.set(Math.cos(a) * 0.24, Math.sin(t * 2 + i) * 0.03, Math.sin(a) * 0.24); st.rotation.y = t * 2; }));
  },
  // หมวกแมงกะพรุน: กระดิ่งโปร่งเรืองแสง ขอบระบาย หนวดพลิ้วด้านหลัง
  jellyHat(rig, p, rt) {
    const c = p.color || '#ff9ad8', c2 = p.color2 || '#9ad8ff';
    const g = group(rig.head, 0, 0.26, -0.01, [-0.15, 0, 0]);
    mesh(new THREE.SphereGeometry(0.31, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(c, { transparent: true, opacity: 0.78, emissive: c, emissiveIntensity: 0.35, side: THREE.DoubleSide }), g, 0, 0, 0, { s: [1, 0.92, 1], keep: true });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; mesh(sph(0.032, 8, 6), toon(i % 2 ? c2 : c, { emissive: i % 2 ? c2 : c, emissiveIntensity: 0.5 }), g, Math.sin(a) * 0.31, -0.005, Math.cos(a) * 0.31, { s: [1, 0.6, 1] }); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3, e = 0.5 + (i % 2) * 0.25; mesh(sph(0.022, 8, 6), G(c2, 1.3), g, Math.sin(a) * Math.cos(e) * 0.3, Math.sin(e) * 0.28, Math.cos(a) * Math.cos(e) * 0.3, { noOutline: true }); }
    bake(g);
    const tm = toon(c, { transparent: true, opacity: 0.8, emissive: c, emissiveIntensity: 0.4 });
    const tents = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.55 + (i / 5) * Math.PI * 0.9, root = group(g, Math.sin(a) * 0.29, -0.02, Math.cos(a) * 0.29);
      tents.push(chain(root, 5, 0.055, (sg, k) => mesh(cyl(0.012 - k * 0.0018, 0.01 - k * 0.0018, 0.055, 5), tm, sg, 0, -0.027, 0)));
    }
    rt.on(({ t }) => tents.forEach((segs, i) => segs.forEach((sg, k) => { sg.rotation.x = Math.sin(t * 2.2 - k * 0.7 + i) * 0.22; sg.rotation.z = Math.cos(t * 1.8 - k * 0.6 + i * 1.3) * 0.18; })));
  },
});

/* ---------- หน้า ---------- */
Object.assign(FACE, {
  // แว่นรูปหัวใจ / รูปดาว
  heartGlasses(rig, p) {
    const g = group(rig.head, 0, 0.2, 0.262), fr = T(p.frame || '#ff5a8a');
    const lens = toon(p.lens || '#ff9ac8', { transparent: true, opacity: 0.55, emissive: p.lens || '#ff9ac8', emissiveIntensity: 0.3 });
    const heart = (sh, r) => { sh.moveTo(0, -r); sh.bezierCurveTo(r * 1.5, -r * 0.05, r * 0.95, r * 1.15, 0, r * 0.45); sh.bezierCurveTo(-r * 0.95, r * 1.15, -r * 1.5, -r * 0.05, 0, -r); };
    const draw = p.shape === 'star' ? (sh, r) => starShape(sh, r * 1.2, r * 0.58) : heart;
    for (const s of [-1, 1]) {
      const lg = group(g, s * 0.088, -0.005, 0, [0, s * 0.2, 0]);
      mesh(extrude((sh) => { draw(sh, 0.058); const h = new THREE.Path(); draw(h, 0.044); sh.holes.push(h); }, 0.012, 0.004), fr, lg);
      mesh(shapeGeo((sh) => draw(sh, 0.046)), lens, lg, 0, 0, -0.004);
      bake(lg);
      mesh(box(0.008, 0.008, 0.2), fr, g, s * 0.15, 0.012, -0.1, { r: [0, s * 0.25, 0] });
    }
    mesh(box(0.045, 0.012, 0.012), fr, g, 0, 0.012, 0);
    bake(g);
  },
  // หน้ากากอสูรแดง (สวมเอียงข้างศีรษะ)
  oniMask(rig, p) {
    const col = p.color || '#d8333a';
    const map = ctex('onimask' + col, 128, 128, (g, s) => {
      g.fillStyle = col; g.fillRect(0, 0, s, s);
      g.fillStyle = '#1e1014'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(64 + sx * 8, 42); g.quadraticCurveTo(64 + sx * 30, 24, 64 + sx * 48, 36); g.lineTo(64 + sx * 46, 46); g.quadraticCurveTo(64 + sx * 28, 36, 64 + sx * 10, 50); g.fill(); }
      for (const sx of [-1, 1]) { g.fillStyle = '#ffcf4a'; g.beginPath(); g.ellipse(64 + sx * 24, 60, 12, 8, sx * 0.25, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1e1014'; g.beginPath(); g.arc(64 + sx * 24, 60, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#1e1014'; g.beginPath(); g.moveTo(32, 86); g.quadraticCurveTo(64, 116, 96, 86); g.quadraticCurveTo(64, 98, 32, 86); g.fill();
      g.fillStyle = '#ffffff'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(64 + sx * 16, 92); g.lineTo(64 + sx * 23, 110); g.lineTo(64 + sx * 29, 92); g.fill(); }
    });
    const g = group(rig.head, -0.21, 0.31, 0.1, [0, -0.95, -0.25]);
    const geo = sph(1, 16, 12).rotateY(-Math.PI / 2);
    mesh(geo, TM('#ffffff', map), g, 0, 0, 0, { s: [0.115, 0.125, 0.06] });
    for (const s of [-1, 1]) taper(g, [V(s * 0.05, 0.09, 0.012), V(s * 0.068, 0.14, 0.004), V(s * 0.062, 0.19, -0.006)], 0.022, 0.004, T(p.horn || '#ffe9c8'));
    bake(g);
  },
  // สติกเกอร์แก้ม: หัวใจและดาว
  blush(rig, p) {
    const c = V(0, 0.2, 0);
    const deco = (kind, color, dir, w) => { const d = dir.normalize(); const m = mesh(new THREE.PlaneGeometry(w, w), unlit(color, { map: spriteTex(kind), opacity: 0.98 }), rig.head, c.x + d.x * 0.268, c.y + d.y * 0.268, c.z + d.z * 0.268, { keep: true, shadow: false }); m.quaternion.setFromUnitVectors(V(0, 0, 1), d); m.renderOrder = 2; };
    for (const s of [-1, 1]) deco('heart', p.color || '#ff6a9a', V(s * 0.52, -0.33, 0.79), 0.075);
    deco('heart', p.color2 || '#ffd34d', V(0.62, -0.02, 0.78), 0.045);
    deco('heart', p.color2 || '#ffd34d', V(-0.6, 0.05, 0.8), 0.035);
  },
  // ผ้าคลุมหน้านางรำ: ผ้าโปร่งปิดปาก โซ่ลูกปัด และเหรียญทองห้อย
  veil(rig, p, rt) {
    const g = group(rig.head), c = p.color || '#ff8fb8';
    mesh(new THREE.CylinderGeometry(0.272, 0.305, 0.13, 26, 1, true, -1.25, 2.5), toon(c, { transparent: true, opacity: 0.62, side: THREE.DoubleSide }), g, 0, 0.08, 0, { keep: true, shadow: false });
    const gold = metal(p.gold || '#ffcf4a');
    const coins = group(g);
    for (let k = 0; k <= 12; k++) { const th = -1.2 + k * 0.2; mesh(sph(0.009, 6, 4), gold, g, Math.sin(th) * 0.276, 0.145, Math.cos(th) * 0.276); }
    for (let k = 0; k <= 10; k++) { const th = -1.15 + k * 0.23; const m = mesh(cyl(0.015, 0.015, 0.004, 10), gold, coins, Math.sin(th) * 0.31, 0.008, Math.cos(th) * 0.31); m.rotation.set(Math.PI / 2, th, 0, 'YXZ'); }
    bake(g); bake(coins);
    rt.on(({ t }) => { coins.rotation.y = Math.sin(t * 2.6) * 0.02; coins.position.y = Math.sin(t * 5.2) * 0.003; });
  },
});

/* ---------- หลัง ---------- */
Object.assign(BACK, {
  // พัดจีนใหญ่กางหลัง: ผืนกระดาษลายดอกไม้ ซี่ไม้ หมุดทอง พู่ห้อย
  fan(rig, p, rt) {
    const g = group(rig.torso, 0, 0.14, -0.27, [0.18, 0, 0]);
    const R0 = 0.1, R1 = 0.5, A = 1.25;
    const tex = patternTex(p.pattern || 'sakura', p.c1 || '#ff8fb8', p.c2 || '#ffffff', p.color || '#fff4e8').clone(); tex.needsUpdate = true; tex.isOwned = true; tex.repeat.set(2, 1);
    mesh(shapeGeo((sh) => { sh.absarc(0, 0, R1, Math.PI / 2 + A, Math.PI / 2 - A, true); sh.lineTo(Math.cos(Math.PI / 2 - A) * R0, Math.sin(Math.PI / 2 - A) * R0); sh.absarc(0, 0, R0, Math.PI / 2 - A, Math.PI / 2 + A, false); }), TM('#ffffff', tex, { side: THREE.DoubleSide }), g, 0, 0, 0, { keep: true });
    mesh(new THREE.TorusGeometry(R1, 0.012, 4, 30, 2 * A), T(p.edge || '#c8283a'), g, 0, 0, 0, { r: [0, 0, Math.PI / 2 - A] });
    const slat = T(p.slat || '#3a2418');
    for (let i = 0; i <= 12; i++) { const a = -A + (i / 12) * 2 * A; for (const z of [0.008, -0.008]) mesh(box(0.014, R1, 0.006), slat, g, Math.sin(a) * R1 * 0.5, Math.cos(a) * R1 * 0.5, z, { r: [0, 0, -a] }); }
    mesh(sph(0.03, 10, 8), metal('#ffcf4a'), g, 0, 0, 0.012);
    bake(g);
    const segs = chain(group(g, 0, -0.02, 0.01), 3, 0.035, (sg) => mesh(sph(0.012, 6, 4), gem(p.bead || '#7fe0d0', 0.6), sg, 0, -0.018, 0));
    mesh(cone(0.024, 0.08, 8), T(p.tassel || '#c8283a'), segs[2], 0, -0.07, 0, { r: [Math.PI, 0, 0] });
    rt.on(({ t }) => { g.rotation.z = Math.sin(t * 0.8) * 0.05; segs.forEach((sg, i) => { sg.rotation.z = Math.sin(t * 2.2 + i) * 0.2; }); });
  },
  // วงกลองเทพสายฟ้า: กลองแปดใบบนวงทองหมุนช้า ๆ ประกายไฟฟ้า
  drums(rig, p, rt) {
    const g = group(rig.torso, 0, 0.32, -0.4), ring = group(g);
    mesh(torus(0.42, 0.022, 6, 40), metal(p.ring || '#ffcf4a'), ring);
    const drums = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, d = group(ring, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      mesh(cyl(0.07, 0.07, 0.06, 16), T(p.body || '#c8283a'), d, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
      for (const z of [-0.032, 0.032]) { mesh(cyl(0.064, 0.064, 0.006, 16), T('#f2e4c8'), d, 0, 0, z, { r: [Math.PI / 2, 0, 0] }); mesh(torus(0.07, 0.008, 4, 16), metal('#ffcf4a'), d, 0, 0, z); }
      for (let k = 0; k < 3; k++) { const b = (k / 3) * Math.PI * 2; mesh(sph(0.016, 6, 4), T('#1e1014'), d, Math.cos(b) * 0.03, Math.sin(b) * 0.03, -0.036, { s: [1, 1, 0.3] }); }
      bake(d); drums.push(d);
    }
    bake(ring);
    rt.on(({ t, dt }) => {
      ring.rotation.z = t * 0.5;
      if (Math.random() < dt * 4) rt.ps('dot').emit({ pos: rt.worldPos(drums[(Math.random() * 8) | 0]), count: 6, speed: [0.3, 0.9], gravity: -1, life: [0.15, 0.3], size: [0.04, 0.07], color: ['#ffffff', p.spark || '#9ae8ff'], colorEnd: '#6a5aff' });
      if (Math.random() < dt * 1.2) rt.ps('star').emit({ pos: rt.worldPos(drums[(Math.random() * 8) | 0]), count: 1, speed: 0, life: [0.1, 0.16], size: [0.3, 0.45], color: '#e8f4ff' });
    });
  },
  // ดาวเคราะห์จิ๋วโคจรรอบตัว (มีวงแหวน + เส้นวงโคจรจาง ๆ)
  planets(rig, p, rt) {
    const g = group(rig.body, 0, 1.0, 0);
    const defs = [{ c: '#e8b05a', r: 0.07, orbit: 0.56, sp: 0.6, tilt: 0.35, ring: '#f2dca0' }, { c: '#5ab0ff', r: 0.05, orbit: 0.46, sp: 1.0, tilt: -0.5 }, { c: '#ff6a5a', r: 0.04, orbit: 0.64, sp: 0.8, tilt: 0.9 }, { c: '#e0e0f0', r: 0.03, orbit: 0.38, sp: 1.6, tilt: -1.1 }];
    const items = defs.map((d, i) => {
      const plane = group(g, 0, 0, 0, [d.tilt, i, 0]);
      mesh(torus(d.orbit, 0.003, 3, 64), unlit(p.line || '#c8d8ff', { opacity: 0.22, add: true }), plane, 0, 0, 0, { r: [Math.PI / 2, 0, 0], keep: true, shadow: false });
      const pl = group(plane);
      mesh(sph(d.r, 16, 12), toon(d.c, { emissive: d.c, emissiveIntensity: 0.35 }), pl);
      if (d.ring) mesh(torus(d.r * 1.75, d.r * 0.24, 3, 28), toon(d.ring, { emissive: d.ring, emissiveIntensity: 0.3 }), pl, 0, 0, 0, { r: [Math.PI / 2 - 0.4, 0, 0.3], s: [1, 1, 0.25] });
      bake(pl);
      return { pl, d, a: i * 1.7 };
    });
    rt.on(({ t }) => items.forEach((o) => { const a = o.a + t * o.d.sp; o.pl.position.set(Math.cos(a) * o.d.orbit, 0, Math.sin(a) * o.d.orbit); o.pl.rotation.y = t; }));
  },
  // กระเป๋าเปลือกหอยมุก: ฝาเปิดแง้มเห็นไข่มุกเรืองแสง
  shellPack(rig, p, rt) {
    const c = p.color || '#ffd0dc', g = group(rig.torso, 0, 0.16, -0.24, [0.12, 0, 0]);
    const scallop = (R) => (sh) => {
      sh.moveTo(0, 0); const n = 8, a0 = Math.PI * 0.08, a1 = Math.PI * 0.92;
      for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; const x = Math.cos(a) * R, y = Math.sin(a) * R; if (!i) sh.lineTo(x, y); else { const am = a - (a1 - a0) / n / 2; sh.quadraticCurveTo(Math.cos(am) * R * 1.12, Math.sin(am) * R * 1.12, x, y); } }
      sh.lineTo(0, 0);
    };
    const shellM = T(c), ridge = T(shadeHex(c, -0.18));
    const makeShell = (parent) => { mesh(extrude(scallop(0.2), 0.03, 0.01), shellM, parent); for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.08 + (Math.PI * 0.84 * i) / 8; mesh(box(0.01, 0.19, 0.01), ridge, parent, Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.022, { r: [0, 0, a - Math.PI / 2] }); } };
    makeShell(g);
    const lid = group(g, 0, 0, -0.03, [-0.7, 0, 0]); makeShell(lid);
    mesh(cyl(0.035, 0.035, 0.09, 10), T(shadeHex(c, -0.3)), g, 0, 0, -0.015, { r: [0, 0, Math.PI / 2] });
    bake(lid); bake(g);
    const pearl = mesh(sph(0.045, 14, 10), G(p.pearl || '#fffaf2', 0.7), g, 0, 0.07, -0.05, { noOutline: true, keep: true });
    const glow = glowSprite(g, '#ffe8f4', 0.3, 0.5, 0, 0.07, -0.06);
    rt.on(({ t, dt }) => { glow.material.opacity = 0.35 + Math.sin(t * 3) * 0.15; lid.rotation.x = -0.7 + Math.sin(t * 1.2) * 0.08; if (Math.random() < dt * 2) rt.ps('star').emit({ pos: rt.worldPos(pearl), count: 1, speed: 0.15, life: [0.4, 0.8], size: [0.06, 0.1], color: ['#ffffff', '#ffd0e8'] }); });
  },
  // ถุงของขวัญ: กล่องโผล่จากปากถุง เชือกผูก ปะลายดาว
  sack(rig, p) {
    const c = p.color || '#a8323a', g = group(rig.torso, 0.05, 0.2, -0.28, [0.25, 0, -0.35]);
    mesh(sph(0.17, 16, 12), T(c), g, 0, 0, 0, { s: [1, 1.1, 0.85] });
    mesh(cyl(0.07, 0.1, 0.07, 14), T(c), g, 0, 0.19, 0);
    mesh(cyl(0.11, 0.07, 0.05, 14, true), DS(shadeHex(c, 0.1)), g, 0, 0.245, 0, { noOutline: true });
    mesh(torus(0.072, 0.014, 6, 14), T(p.rope || '#e8c050'), g, 0, 0.18, 0, { r: [Math.PI / 2, 0, 0] });
    for (const [x, y, z, s, col, rb, ry] of [[0.03, 0.28, 0.01, 0.085, '#3aa05a', '#ffd34d', 0.4], [-0.045, 0.27, -0.02, 0.065, '#4a7ad8', '#ffffff', -0.3]]) {
      const b = group(g, x, y, z, [0.2, ry, 0.15]);
      mesh(box(s, s, s), T(col), b); mesh(box(s * 1.02, s * 1.02, s * 0.2), T(rb), b); mesh(box(s * 0.2, s * 1.02, s * 1.02), T(rb), b);
      bake(b);
    }
    for (const [x, y, r] of [[0.06, 0.02, 0.035], [-0.07, -0.06, 0.025]]) mesh(extrude((sh) => starShape(sh, r, r * 0.45), 0.01, 0.003), T('#ffd34d'), g, x, y, -0.15, { r: [0, Math.PI, 0] });
    bake(g);
  },
});

/* ---------- อาวุธ ---------- */
Object.assign(WEAPON, {
  // ดาบพลังงานนีออน: แกนขาวจ้า ห่อแสงสี กระพริบเบา ๆ
  neonBlade(rig, p, rt) {
    const h = swordHand(rig), c = p.color || '#4af8ff';
    const gr = mesh(cyl(0.022, 0.022, 0.16, 10), T('#2a2a36'), h, 0, 0, 0); gr.rotation.x = Math.PI / 2;
    for (const z of [-0.055, -0.015, 0.025]) mesh(torus(0.024, 0.006, 4, 12), G(c, 1.8), h, 0, 0, z, { noOutline: true });
    mesh(box(0.05, 0.1, 0.03), T('#3a3a48'), h, 0, 0, 0.09);
    mesh(sph(0.026, 8, 6), T('#2a2a36'), h, 0, 0, -0.09);
    const core = blade(h, (sh) => { sh.moveTo(0, -0.012); sh.lineTo(0.62, -0.01); sh.quadraticCurveTo(0.68, 0, 0.66, 0.02); sh.lineTo(0, 0.012); }, G('#ffffff', 2.4), { depth: 0.014, bevel: 0.004, z0: 0.1 });
    core.userData.noOutline = true;
    const glow = blade(h, (sh) => { sh.moveTo(-0.01, -0.034); sh.lineTo(0.62, -0.032); sh.quadraticCurveTo(0.73, 0, 0.67, 0.045); sh.lineTo(-0.01, 0.034); }, unlit(c, { opacity: 0.55, add: true }), { depth: 0.032, bevel: 0.012, z0: 0.1 });
    glow.userData.keep = true; glow.renderOrder = 4;
    bake(h);
    rt.on(({ t }) => { glow.material.opacity = 0.45 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04; });
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0, 0.5], [0, 0, 0.68]], { kind: 'square', color: [c, '#ffffff'], up: 0.15, size: [0.03, 0.06], rate: 10, life: [0.3, 0.6] });
  },
  // ตรีศูลทองสมุทร: ง่ามสามแฉก มุกเรืองแสง ฟองอากาศลอย
  trident(rig, p, rt) {
    const st = staffHand(rig), gold = metal(p.gold || '#ffcf4a', 0.2), c = p.color || '#3ac8c8';
    mesh(cyl(0.018, 0.022, 1.15, 8), metal(c, 0.2), st, 0, 0.3, 0);
    for (const y of [0.0, 0.6]) mesh(torus(0.026, 0.009, 6, 12), gold, st, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(sph(0.05, 12, 10), gold, st, 0, 0.88, 0, { s: [1.2, 0.7, 1] });
    mesh(cone(0.03, 0.28, 6), gold, st, 0, 1.06, 0);
    for (const s of [-1, 1]) {
      taper(st, bez(V(0, 0.9, 0), V(s * 0.14, 0.9, 0), V(s * 0.13, 1.08, 0), 5), 0.02, 0.015, gold, { cap: false });
      mesh(cone(0.024, 0.13, 6), gold, st, s * 0.13, 1.14, 0);
      mesh(cone(0.016, 0.05, 4), gold, st, s * 0.115, 1.06, 0, { r: [0, 0, s * 0.9] });
    }
    bake(st);
    mesh(sph(0.04, 14, 10), G(p.pearl || '#bff8ff', 1.4), st, 0, 0.88, 0.05, { noOutline: true, keep: true });
    glowSprite(st, p.pearl || '#bff8ff', 0.3, 0.5, 0, 0.88, 0.05);
    weaponParticles(rt, st, [[0, 1.12, 0], [0.13, 1.16, 0], [-0.13, 1.16, 0]], { kind: 'bubble', color: ['#bfefff', '#ffffff'], up: 0.3, size: [0.04, 0.08], rate: 6, life: [0.6, 1.0] });
  },
  // เคียวกุหลาบรัตติกาล: ด้ามพันเถา ใบเคียวโค้ง คมเรืองแดง
  scythe(rig, p, rt) {
    const st = staffHand(rig);
    mesh(cyl(0.018, 0.022, 1.2, 8), T(p.shaft || '#2a1a2a'), st, 0, 0.32, 0);
    const helix = []; for (let i = 0; i <= 24; i++) { const a = i * 0.7; helix.push(V(Math.cos(a) * 0.024, -0.1 + i * 0.04, Math.sin(a) * 0.024)); }
    taper(st, helix, 0.008, 0.006, T('#2f6a3a'), { cap: false, joints: false, seg: 5 });
    mesh(extrude((sh) => { sh.moveTo(0, 0.02); sh.bezierCurveTo(-0.15, 0.1, -0.38, 0.06, -0.54, -0.13); sh.bezierCurveTo(-0.36, -0.02, -0.16, -0.02, 0, -0.04); }, 0.016, 0.006), metal(p.blade || '#4a4458', 0.2), st, 0, 0.92, 0);
    mesh(extrude((sh) => { sh.moveTo(-0.02, -0.034); sh.bezierCurveTo(-0.16, -0.02, -0.36, -0.03, -0.54, -0.13); sh.bezierCurveTo(-0.38, -0.05, -0.18, -0.046, -0.02, -0.05); }, 0.02, 0), G(p.glow || '#ff3a5a', 1.5), st, 0, 0.92, 0, { noOutline: true });
    mesh(box(0.06, 0.08, 0.04), metal('#5a4a6a'), st, 0, 0.92, 0);
    mesh(cone(0.02, 0.09, 6), metal('#5a4a6a'), st, 0, 1.0, 0);
    bake(st);
    rose(st, 0, 0.85, 0.035, p.rose || '#c8102a', 0.045);
    weaponParticles(rt, st, [[-0.3, 0.9, 0], [-0.5, 0.82, 0]], { kind: 'petal', blending: NB, color: ['#c8102a', '#ff5a6a'], up: -0.2, gravity: -0.3, size: [0.06, 0.1], rate: 4, life: [0.8, 1.2] });
  },
  // อมยิ้มยักษ์: ลายก้นหอยสามสี ริบบิ้นที่ด้าม
  lollipop(rig, p, rt) {
    const h = swordHand(rig);
    const stick = mesh(cyl(0.016, 0.016, 0.52, 8), T('#ffffff'), h, 0, 0, 0.16); stick.rotation.x = Math.PI / 2;
    const cols = [p.c1 || '#ff5a8a', p.c2 || '#7fd0ff', p.c3 || '#ffd34d'];
    const swirl = ctex('swirl' + cols.join(''), 128, 128, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128); g.lineWidth = 9; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) { g.strokeStyle = cols[k]; g.beginPath(); for (let i = 0; i <= 120; i++) { const a = i * 0.11 + k * 2.09, r = i * 0.52; const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    });
    const candy = TM('#ffffff', swirl);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 32), [T(cols[0]), candy, candy]);
    disc.position.set(0, 0, 0.57); disc.rotation.z = Math.PI / 2; disc.castShadow = true; disc.userData.keep = true; h.add(disc);
    mesh(torus(0.17, 0.008, 4, 40), T(shadeHex(cols[0], -0.45)), h, 0.031, 0, 0.57, { r: [0, Math.PI / 2, 0], noOutline: true });
    mesh(torus(0.17, 0.008, 4, 40), T(shadeHex(cols[0], -0.45)), h, -0.031, 0, 0.57, { r: [0, Math.PI / 2, 0], noOutline: true });
    const bw = group(h, 0, 0, 0.36);
    for (const s of [-1, 1]) mesh(sph(0.04, 8, 6), T(p.ribbon || '#ff8fb8'), bw, 0, s * 0.045, 0, { s: [0.5, 1.3, 0.8] });
    mesh(sph(0.02, 8, 6), T(p.ribbon || '#ff8fb8'), bw);
    bake(bw); bake(h);
    weaponParticles(rt, h, [[0, 0.12, 0.6], [0, -0.12, 0.54]], { kind: 'star', color: ['#ffffff', ...cols], up: 0.1, size: [0.05, 0.1], rate: 5, life: [0.5, 0.8] });
  },
  // กระบี่หยก: ใบตรงสองคม สันกลาง โกร่งหยก พู่แดงแกว่ง
  jian(rig, p, rt) {
    const h = swordHand(rig);
    blade(h, (sh) => { sh.moveTo(0, -0.03); sh.lineTo(0.6, -0.026); sh.lineTo(0.68, 0); sh.lineTo(0.6, 0.026); sh.lineTo(0, 0.03); }, metal(p.blade || '#e8eef8', 0.3), { depth: 0.016 });
    mesh(box(0.022, 0.01, 0.56), metal('#b8c8d8'), h, 0, 0, 0.36, { noOutline: true });
    const jade = toon(p.jade || '#3ac88a', { emissive: '#0a3a20', emissiveIntensity: 0.6 });
    mesh(box(0.05, 0.13, 0.03), jade, h, 0, 0, 0.07);
    for (const s of [-1, 1]) mesh(sph(0.03, 8, 6), jade, h, 0, s * 0.07, 0.07, { s: [1, 1, 0.8] });
    const gr = mesh(cyl(0.02, 0.02, 0.13, 8), T('#6a1a1a'), h, 0, 0, -0.01); gr.rotation.x = Math.PI / 2;
    mesh(sph(0.03, 10, 8), jade, h, 0, 0, -0.085);
    bake(h);
    const segs = chain(group(h, 0, 0, -0.11), 3, 0.035, (sg) => mesh(sph(0.012, 6, 4), T(p.tassel || '#d8233a'), sg, 0, -0.018, 0));
    mesh(cone(0.024, 0.09, 8), T(p.tassel || '#d8233a'), segs[2], 0, -0.07, 0, { r: [Math.PI, 0, 0] });
    rt.on(({ t }) => segs.forEach((s, i) => { s.rotation.x = Math.sin(t * 3 + i) * 0.25; s.rotation.z = Math.sin(t * 2.3 + i * 0.7) * 0.2; }));
  },
  // ไม้เท้าโคมกระดาษ: ปลายงอเป็นตะขอ แขวนโคมเรืองแสงแกว่งไปมา
  lanternStaff(rig, p, rt) {
    const st = staffHand(rig), wood = T(p.wood || '#6a3a22');
    taper(st, bez3(V(0, -0.27, 0), V(0.02, 0.4, 0), V(-0.02, 0.85, 0), V(0, 1.0, 0), 8), 0.022, 0.018, wood, { cap: false });
    taper(st, bez3(V(0, 1.0, 0), V(0.02, 1.12, 0), V(0.16, 1.15, 0), V(0.21, 1.05, 0), 6), 0.018, 0.012, wood);
    bake(st);
    const hang = group(st, 0.21, 1.04, 0);
    mesh(cyl(0.004, 0.004, 0.07, 4), T('#3a2418'), hang, 0, -0.035, 0);
    const lan = group(hang, 0, -0.16, 0), c = p.color || '#ff8a3a';
    mesh(sph(0.08, 16, 12), toon(c, { emissive: p.glow || '#ff6a1a', emissiveIntensity: 1.1 }), lan, 0, 0, 0, { s: [1, 1.15, 1] });
    const rib = T(shadeHex(c, -0.45));
    for (let k = 0; k < 6; k++) mesh(torus(0.081, 0.004, 4, 20), rib, lan, 0, 0, 0, { r: [0, (k / 6) * Math.PI, 0], s: [1, 1.15, 1] });
    for (const y of [-0.1, 0.1]) mesh(cyl(0.04, 0.045, 0.025, 12), T('#2a1a1a'), lan, 0, y, 0);
    mesh(cone(0.025, 0.08, 8), T(p.tassel || '#d8233a'), lan, 0, -0.16, 0, { r: [Math.PI, 0, 0] });
    bake(lan);
    const glow = glowSprite(lan, p.glow || '#ff9a3a', 0.5, 0.6);
    rt.on(({ t }) => { hang.rotation.z = Math.sin(t * 1.8) * 0.2; hang.rotation.x = Math.sin(t * 1.3) * 0.1; glow.material.opacity = 0.5 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.04; });
    weaponParticles(rt, st, [[0.21, 0.88, 0]], { kind: 'dot', color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a', up: 0.4, size: [0.03, 0.06], rate: 8, life: [0.5, 0.9] });
  },
  // กระบองอสูรหนามทอง: ทรงเรียวใหญ่ปลาย หมุดทองรอบตัว ประกายไฟฟ้า
  oniClub(rig, p, rt) {
    const h = swordHand(rig), iron = metal(p.color || '#3a3448', 0.1), gold = metal('#ffcf4a');
    const gr = mesh(cyl(0.022, 0.024, 0.18, 8), T('#5a2a2a'), h, 0, 0, 0); gr.rotation.x = Math.PI / 2;
    const body = mesh(cyl(0.078, 0.042, 0.46, 12), iron, h, 0, 0, 0.32); body.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const z = 0.16 + i * 0.09, r = 0.042 + ((z - 0.09) / 0.46) * 0.036;
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + (i % 2) * 0.45; const m = mesh(cone(0.013, 0.04, 4), gold, h, Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012), z); m.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.cos(a), Math.sin(a), 0)); }
    }
    for (const z of [0.1, 0.55]) mesh(torus(z > 0.3 ? 0.078 : 0.045, 0.012, 5, 16), gold, h, 0, 0, z);
    mesh(sph(0.078, 12, 8), iron, h, 0, 0, 0.55, { s: [1, 1, 0.4] });
    bake(h);
    weaponParticles(rt, h, [[0, 0, 0.35], [0, 0, 0.55]], { kind: 'dot', color: ['#ffffff', p.spark || '#c08aff'], colorEnd: '#5a3aff', up: 0.2, size: [0.04, 0.07], rate: 12, life: [0.15, 0.3] });
  },
});

/* ---------- ออร่า ---------- */
Object.assign(AURA, {
  // พิกเซลดิจิทัล: สี่เหลี่ยมแสงลอยขึ้น วงสแกนไล่จากเท้าถึงหัว ตารางหกเหลี่ยมบนพื้น
  pixels(rig, p, rt) {
    const cols = p.colors || ['#4af8ff', '#ff4ad8', '#ffffff'];
    auraEmitter(rig, rt, 18, (b) => rt.ps('square').emit({ pos: ringPos(b, 0.55, rand(0.02, 0.3)), count: 1, vel: () => V(0, rand(0.4, 0.8), 0), life: [0.8, 1.4], size: [0.07, 0.13], sizeEnd: 0.5, color: cols }));
    const scan = mesh(new THREE.RingGeometry(0.42, 0.48, 40), unlit(cols[0], { opacity: 0.6, add: true }), rig.root, 0, 0.05, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    const grid = mesh(new THREE.PlaneGeometry(1.6, 1.6), unlit(cols[0], { map: TX.hexGrid(), opacity: 0.4, add: true }), rig.root, 0, 0.02, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    scan.renderOrder = 3; grid.renderOrder = 2;
    rt.on(({ t }) => { const k = (t * 0.55) % 1; scan.position.y = 0.05 + k * 2.1; scan.material.opacity = 0.55 * (1 - k); const s = 1 - k * 0.25; scan.scale.set(s, s, 1); grid.material.opacity = 0.3 + Math.sin(t * 2) * 0.1; });
  },
  // ฝูงปลาหลากสีว่ายวนรอบตัว + ฟองอากาศ
  fish(rig, p, rt) {
    const g = group(rig.root);
    const cols = p.colors || ['#ff8a2a', '#ffffff', '#ffd34d', '#5ab0ff', '#ff5a6a', '#ff8a2a', '#8affd0'];
    const fishes = cols.map((c, i) => {
      const f = group(g);
      mesh(sph(0.05, 10, 8), T(c), f, 0, 0, 0, { s: [0.6, 0.85, 1.4] });
      mesh(cone(0.045, 0.07, 4), T(shadeHex(c, -0.15)), f, 0, 0, -0.085, { r: [-Math.PI / 2, 0, 0], s: [0.25, 1, 1] });
      for (const s of [-1, 1]) mesh(sph(0.01, 6, 4), T('#1e1420'), f, s * 0.026, 0.012, 0.042);
      bake(f);
      f.userData = { a: (i / cols.length) * Math.PI * 2, r: 0.5 + (i % 3) * 0.12, y: 0.35 + (i % 4) * 0.42, sp: (0.7 + (i % 3) * 0.2) * (i % 2 ? 1 : -1) };
      return f;
    });
    rt.on(({ t }) => fishes.forEach((f) => { const u = f.userData, a = u.a + t * u.sp; f.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 1.6 + u.a) * 0.08, Math.sin(a) * u.r); const s = Math.sign(u.sp); f.rotation.y = Math.atan2(-Math.sin(a) * s, Math.cos(a) * s) + Math.sin(t * 12 + u.a) * 0.15; }));
    auraEmitter(rig, rt, 4, (b) => rt.ps('bubble').emit({ pos: discPos(b, 0.7, 0.2, 1.6), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.25, 0.45), rand(-0.05, 0.05)), life: [1.5, 2.2], size: [0.06, 0.12], sizeEnd: 1.2, color: ['#bfefff', '#ffffff'] }));
  },
  // ดอกไม้ไฟ: จรวดพุ่งขึ้นแล้วแตกกระจายเป็นดาวหลากสี
  fireworks(rig, p, rt) {
    const rockets = []; let timer = 0.2;
    const cols = p.colors || [['#ff5a8a', '#ffd34d'], ['#7fd0ff', '#ffffff'], ['#8affb0', '#ffe08a'], ['#c08aff', '#ff9ad0']];
    rt.on(({ dt }) => {
      timer -= dt;
      if (timer <= 0) { timer = 0.6 + Math.random() * 0.5; const b = rt.worldPos(rig.root), a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.5; rockets.push({ pos: V(b.x + Math.cos(a) * r, b.y + 0.3, b.z + Math.sin(a) * r), life: 0.55 + Math.random() * 0.2, c: cols[(Math.random() * cols.length) | 0] }); }
      for (let i = rockets.length - 1; i >= 0; i--) {
        const k = rockets[i]; k.life -= dt; k.pos.y += dt * 3.6;
        rt.ps('dot').emit({ pos: k.pos.clone(), count: 1, speed: 0.05, life: [0.2, 0.35], size: [0.05, 0.07], color: '#fff2c0', colorEnd: k.c[0] });
        if (k.life <= 0) {
          rt.ps('star').emit({ pos: k.pos.clone(), count: 28, speed: [0.9, 1.5], gravity: -1.2, drag: 1.6, life: [0.6, 1.0], size: [0.08, 0.15], sizeEnd: 0.2, color: k.c, colorEnd: k.c[1] });
          rt.ps('dot').emit({ pos: k.pos.clone(), count: 1, speed: 0, life: [0.15, 0.2], size: [0.6, 0.7], color: k.c[1] });
          rockets.splice(i, 1);
        }
      }
    });
  },
  // เม็ดน้ำตาลสีพาสเทลโปรยลงมา + ประกายวิบวับ
  sprinkles(rig, p, rt) {
    const cols = p.colors || ['#ff5a8a', '#ffd34d', '#7fd0ff', '#8affb0', '#c08aff', '#ffffff'];
    auraEmitter(rig, rt, 16, (b) => rt.ps('sprinkle', NB).emit({ pos: discPos(b, 1.1, 2.2, 2.6), count: 1, vel: () => V(rand(-0.1, 0.1), rand(-0.6, -0.4), rand(-0.1, 0.1)), life: [3.5, 4.5], size: [0.08, 0.11], sizeEnd: 0.9, color: cols }));
    auraEmitter(rig, rt, 6, (b) => rt.ps('star').emit({ pos: discPos(b, 0.6, 0.2, 1.8), count: 1, speed: 0.05, life: [0.4, 0.8], size: [0.1, 0.18], color: ['#ffffff', '#ffd0e8'] }));
  },
  // สายฟ้าแลบรอบเท้า + ประกายไฟ + แสงพื้นสั่นไหว
  lightning(rig, p, rt) {
    const c = p.color || '#c08aff';
    const bolts = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('bolt'), color: lin(c), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(0.35, 0.7, 1); rig.root.add(s); s.userData = { t: Math.random() * 0.5, f: 0 }; return s; });
    const core = bolts.map((b) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('bolt'), color: lin('#ffffff'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); b.add(s); s.scale.set(0.6, 0.9, 1); return s; });
    rt.on(({ dt }) => bolts.forEach((s, i) => {
      const u = s.userData; u.t -= dt;
      if (u.t <= 0) {
        u.t = 0.45 + Math.random() * 0.8; u.f = 0.14;
        const a = Math.random() * Math.PI * 2, r = 0.45 + Math.random() * 0.25;
        s.position.set(Math.cos(a) * r, 0.36 + Math.random() * 0.2, Math.sin(a) * r); s.material.rotation = core[i].material.rotation = rand(-0.3, 0.3);
        rt.ps('dot').emit({ pos: rt.worldPos(rig.root).add(V(Math.cos(a) * r, 0.03, Math.sin(a) * r)), count: 8, speed: [0.4, 1.0], gravity: -2, life: [0.15, 0.3], size: [0.04, 0.07], color: ['#ffffff', c] });
      }
      u.f = Math.max(0, u.f - dt);
      s.material.opacity = u.f > 0 ? 0.6 + Math.random() * 0.4 : 0; core[i].material.opacity = s.material.opacity;
    }));
    auraEmitter(rig, rt, 10, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.5, rand(0.05, 0.4)), count: 1, vel: () => V(0, rand(0.2, 0.5), 0), life: [0.3, 0.6], size: [0.04, 0.07], color: [c, '#ffffff'] }));
    const glow = mesh(new THREE.PlaneGeometry(1.5, 1.5), unlit(c, { map: TX.softDot(), opacity: 0.3, add: true }), rig.root, 0, 0.02, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    rt.on(() => { glow.material.opacity = 0.2 + Math.random() * 0.08; });
  },
});

/* ---------- ผู้ติดตาม ---------- */
Object.assign(PET, {
  // โดรนจิ๋ว: ใบพัดสี่ตัว ตาไฟ LED เสาอากาศกะพริบ
  drone(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.04, speed: 2.6 }), c = p.color || '#e8ecf4', glow = p.glow || '#4af8ff';
    const b = group(g);
    mesh(sph(0.1, 16, 12), T(c), b, 0, 0, 0, { s: [1, 0.72, 1] });
    mesh(new THREE.CylinderGeometry(0.101, 0.101, 0.05, 20, 1, true, -0.95, 1.9), DS(p.visor || '#1a1a2a'), b, 0, 0.005, 0, { noOutline: true });
    for (const s of [-1, 1]) mesh(box(0.026, 0.02, 0.01), G(glow, 2), b, s * 0.032, 0.005, 0.1, { noOutline: true });
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2, x = Math.cos(a) * 0.14, z = Math.sin(a) * 0.14;
      const arm = mesh(box(0.14, 0.014, 0.02), T('#9aa4b4'), b, x * 0.5, 0.02, z * 0.5); arm.rotation.y = -a;
      mesh(cyl(0.022, 0.022, 0.03, 10), T('#5a6474'), b, x, 0.03, z);
      const r = group(g, x, 0.05, z); rotors.push(r);
      mesh(cyl(0.06, 0.06, 0.003, 18), unlit('#dfe8ff', { opacity: 0.3 }), r, 0, 0, 0, { keep: true, shadow: false });
      for (const k of [0, 1]) mesh(box(0.11, 0.004, 0.014), T('#3a4454'), r, 0, 0.003, 0, { r: [0, k * Math.PI / 2, 0], keep: true });
    }
    mesh(cyl(0.004, 0.004, 0.07, 4), T('#5a6474'), b, 0.03, 0.09, -0.02);
    bake(b);
    const led = mesh(sph(0.014, 8, 6), G('#ff4a6a', 2), g, 0.03, 0.13, -0.02, { noOutline: true, keep: true });
    rt.on(({ t }) => { rotors.forEach((r, i) => { r.rotation.y = t * 40 * (i % 2 ? 1 : -1); }); b.rotation.z = Math.sin(t * 1.3) * 0.08; b.rotation.x = Math.sin(t * 1.1) * 0.06; led.visible = (t * 2) % 1 < 0.6; });
  },
  // แมงกะพรุนเรืองแสง: กระดิ่งหดขยาย หนวดพลิ้ว
  jelly(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.07, speed: 1.4, height: 1.2 }), c = p.color || '#b8a0ff', c2 = p.color2 || '#7ff8ff';
    const bell = group(g);
    mesh(new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), toon(c, { transparent: true, opacity: 0.72, emissive: c, emissiveIntensity: 0.5, side: THREE.DoubleSide }), bell, 0, 0, 0, { keep: true });
    mesh(sph(0.05, 12, 8), G(c2, 1.3), bell, 0, 0.03, 0, { noOutline: true, keep: true });
    decal(bell, 0, 0.035, 0.121, 0.11, petFaceTex());
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(sph(0.022, 6, 4), toon(c2, { emissive: c2, emissiveIntensity: 0.6 }), bell, Math.cos(a) * 0.112, -0.02, Math.sin(a) * 0.112, { s: [1, 0.6, 1], keep: true }); }
    const tm = toon(c, { transparent: true, opacity: 0.8, emissive: c, emissiveIntensity: 0.4 });
    const tents = [0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2; return chain(group(bell, Math.cos(a) * 0.06, -0.03, Math.sin(a) * 0.06), 5, 0.05, (sg, k) => mesh(cyl(0.01 - k * 0.0015, 0.0085 - k * 0.0015, 0.05, 5), tm, sg, 0, -0.025, 0)); });
    glowSprite(bell, c2, 0.4, 0.4, 0, 0.02, 0);
    rt.on(({ t }) => { const k = Math.sin(t * 3); bell.scale.set(1 + k * 0.06, 1 - k * 0.08, 1 + k * 0.06); tents.forEach((segs, i) => segs.forEach((sg, j) => { sg.rotation.x = Math.sin(t * 2.5 - j * 0.7 + i) * 0.25; sg.rotation.z = Math.cos(t * 2 - j * 0.6 + i * 1.3) * 0.2; })); });
  },
  // ภูตโคมลอย: โคมกระดาษเรืองแสง ใบหน้ายิ้ม เปลวไฟในโคม สะเก็ดไฟหล่น
  lanternPet(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.06, speed: 1.3 }), c = p.color || '#ffd8a0';
    const paper = ctex('lanternpaper' + c, 64, 64, (gg, w, h) => { const gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, shadeHex(c, 0.15)); gr.addColorStop(1, c); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); gg.fillStyle = '#d8402a'; gg.fillRect(0, h - 10, w, 10); gg.fillStyle = '#ffcf4a'; gg.fillRect(0, 0, w, 5); gg.globalAlpha = 0.25; gg.fillStyle = '#c86a2a'; for (let x = 0; x < w; x += 8) gg.fillRect(x, 0, 1.5, h); });
    const body = mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.2, 18, 1, true), TM('#ffffff', paper, { emissive: lin(p.glow || '#ff8a3a'), emissiveIntensity: 0.55, side: THREE.DoubleSide }), g, 0, 0, 0, { noOutline: true });
    mesh(new THREE.SphereGeometry(0.1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), TM('#ffffff', paper, { emissive: lin(p.glow || '#ff8a3a'), emissiveIntensity: 0.55 }), g, 0, 0.1, 0, { s: [1, 0.45, 1], noOutline: true });
    mesh(torus(0.075, 0.006, 4, 18), T('#5a3a20'), g, 0, -0.1, 0, { r: [Math.PI / 2, 0, 0] });
    for (const k of [0, 1]) mesh(box(0.15, 0.004, 0.004), T('#5a3a20'), g, 0, -0.1, 0, { r: [0, k * Math.PI / 2, 0] });
    decal(g, 0, 0.01, 0.091, 0.11, petFaceTex('#5a2a1a'));
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('flame'), color: lin('#ffd27a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.scale.set(0.06, 0.09, 1); flame.position.y = -0.08; g.add(flame);
    const glow = glowSprite(g, p.glow || '#ffb347', 0.55, 0.55);
    const bottom = new THREE.Object3D(); bottom.position.y = -0.1; g.add(bottom);
    rt.on(({ t, dt }) => { flame.scale.y = 0.08 + Math.sin(t * 17) * 0.015; glow.material.opacity = 0.45 + Math.sin(t * 7) * 0.08; if (Math.random() < dt * 5) rt.ps('dot').emit({ pos: rt.worldPos(bottom), count: 1, vel: () => V(rand(-0.05, 0.05), rand(-0.3, -0.1), rand(-0.05, 0.05)), life: [0.4, 0.8], size: [0.03, 0.05], color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); });
  },
  // ค้างคาวน้อย: หูใหญ่ เขี้ยวจิ๋ว ปีกพังผืดกระพือถี่
  bat(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.08, speed: 3 }), c = p.color || '#3a2a4a';
    const b = group(g);
    mesh(sph(0.1, 14, 10), T(c), b);
    for (const s of [-1, 1]) { mesh(cone(0.045, 0.11, 4), T(c), b, s * 0.055, 0.1, 0, { r: [0, 0, -s * 0.35] }); mesh(cone(0.025, 0.065, 4), T(p.inner || '#ff8ab0'), b, s * 0.055, 0.095, 0.014, { r: [0, 0, -s * 0.35], s: [1, 1, 0.5] }); }
    mesh(sph(0.045, 10, 8), T(p.belly || '#5a4a6a'), b, 0, -0.045, 0.06, { s: [1.3, 1, 0.6] });
    for (const s of [-1, 1]) mesh(cone(0.007, 0.022, 4), T('#ffffff'), b, s * 0.016, -0.025, 0.097, { r: [Math.PI, 0, 0], noOutline: true });
    bake(b);
    decal(b, 0, 0.012, 0.101, 0.12, petFaceTex(p.eye || '#2a1830', false));
    const wm = DS(p.wing || shadeHex(c, 0.1));
    const wings = [-1, 1].map((s) => { const pv = group(g, s * 0.08, 0.02, -0.02); mesh(shapeGeo((sh) => { sh.moveTo(0, 0.02); sh.lineTo(0.08, 0.09); sh.lineTo(0.18, 0.06); sh.quadraticCurveTo(0.15, 0.0, 0.17, -0.04); sh.quadraticCurveTo(0.12, -0.0, 0.1, -0.05); sh.quadraticCurveTo(0.06, -0.01, 0.02, -0.04); sh.lineTo(0, -0.02); }), wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true }); return pv; });
    rt.on(({ t }) => wings.forEach((pv, i) => { pv.rotation.y = (i ? -1 : 1) * (0.2 + Math.sin(t * 18) * 0.7); }));
  },
  // ตุ๊กตาหิมะจิ๋ว: ผ้าพันคอแดง หมวกถัง จมูกแครอท แขนกิ่งไม้
  snowman(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.05, speed: 1.6, height: 1.0 }), snow = toon('#ffffff', { emissive: '#3a4a6a', emissiveIntensity: 0.25 });
    const b = group(g);
    mesh(sph(0.1, 14, 10), snow, b, 0, -0.06, 0);
    mesh(sph(0.075, 14, 10), snow, b, 0, 0.09, 0);
    mesh(cone(0.014, 0.07, 6), T('#ff8a2a'), b, 0, 0.085, 0.108, { r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) mesh(sph(0.012, 6, 4), T('#1e1a22'), b, s * 0.03, 0.115, 0.064);
    for (const [y, z] of [[-0.02, 0.092], [-0.06, 0.1], [-0.1, 0.092]]) mesh(sph(0.011, 6, 4), T('#1e1a22'), b, 0, y, z);
    mesh(torus(0.062, 0.02, 6, 14), T(p.scarf || '#d8433a'), b, 0, 0.03, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(box(0.032, 0.08, 0.012), T(p.scarf || '#d8433a'), b, 0.04, -0.01, 0.055, { r: [0.2, 0, 0.3] });
    mesh(cyl(0.05, 0.055, 0.06, 12), T(p.hat || '#2a2a3a'), b, 0.012, 0.185, 0, { r: [0, 0, -0.2] });
    mesh(cyl(0.075, 0.075, 0.01, 14), T(p.hat || '#2a2a3a'), b, 0.006, 0.155, 0, { r: [0, 0, -0.2] });
    for (const s of [-1, 1]) taper(b, bez(V(s * 0.09, -0.03, 0), V(s * 0.15, 0.0, 0), V(s * 0.18, 0.05, 0.01), 3), 0.008, 0.004, T('#6a4428'));
    bake(b);
    rt.on(({ t, dt }) => { b.rotation.z = Math.sin(t * 2) * 0.08; if (Math.random() < dt * 3) rt.ps('snow').emit({ pos: rt.worldPos(g).add(V(rand(-0.12, 0.12), 0.2, rand(-0.12, 0.12))), count: 1, vel: () => V(0, rand(-0.2, -0.1), 0), life: [0.8, 1.2], size: [0.05, 0.08], color: '#ffffff' }); });
  },
  // ปลาคาร์ปลอยฟ้า: ว่ายวนรอบตัว หางพลิ้ว ทิ้งฟองอากาศ
  koi(rig, p, rt) {
    const anchor = group(rig.root, 0, 1.25, 0), f = group(anchor);
    const tex = ctex('koi' + (p.spot || '#ff5a1a'), 128, 64, (g, w, h) => { g.fillStyle = p.color || '#fffaf2'; g.fillRect(0, 0, w, h); g.fillStyle = p.spot || '#ff5a1a'; for (const [x, y, r] of [[30, 20, 14], [70, 42, 16], [100, 18, 10], [52, 54, 9]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } });
    const body = group(f);
    mesh(sph(0.07, 16, 10), TM('#ffffff', tex), body, 0, 0, 0, { s: [0.75, 0.8, 1.7] });
    for (const s of [-1, 1]) { mesh(sph(0.011, 6, 4), T('#1e1420'), body, s * 0.04, 0.02, 0.085); mesh(sph(0.03, 8, 6), DS(p.fin || '#ffe0c8'), body, s * 0.05, -0.03, 0.03, { s: [0.2, 0.6, 1.2], r: [0, s * 0.5, s * 0.6] }); taper(body, bez(V(s * 0.02, -0.02, 0.11), V(s * 0.05, -0.04, 0.13), V(s * 0.07, -0.07, 0.12), 3), 0.004, 0.002, T('#c86a3a'), { cap: false }); }
    mesh(shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.03, 0.06, 0.012, 0.1); sh.lineTo(-0.02, 0); }).rotateY(Math.PI / 2), DS(p.fin || '#ffe0c8'), body, 0, 0.05, -0.02, { noOutline: true });
    bake(body);
    const tail = group(body, 0, 0, -0.11);
    mesh(shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.06, -0.06, 0.1, -0.13); sh.quadraticCurveTo(0.03, -0.085, 0, -0.07); sh.quadraticCurveTo(-0.03, -0.085, -0.1, -0.13); sh.quadraticCurveTo(-0.06, -0.06, 0, 0); }).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), toon(p.fin || '#ffe0c8', { transparent: true, opacity: 0.88, side: THREE.DoubleSide }), tail, 0, 0, 0, { noOutline: true });
    rt.on(({ t, dt }) => {
      const a = t * 0.7, R = 0.75;
      f.position.set(Math.cos(a) * R, Math.sin(t * 1.2) * 0.08, Math.sin(a) * R);
      f.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      tail.rotation.y = Math.sin(t * 8) * 0.45; body.rotation.y = Math.sin(t * 8 + 1) * 0.08;
      if (Math.random() < dt * 3) rt.ps('bubble').emit({ pos: rt.worldPos(tail), count: 1, vel: () => V(0, rand(0.1, 0.25), 0), life: [0.8, 1.3], size: [0.04, 0.07], sizeEnd: 1.2, color: ['#bfefff', '#ffffff'] });
    });
  },
  // จันทร์เสี้ยวง่วงนอน: หมวกนอนปอมปอม แสงนวล ดาวระยิบ
  moonPet(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.06, speed: 1.2 });
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.13, Math.PI * 0.3, Math.PI * 1.7, false); sh.absarc(0.07, 0, 0.1, Math.PI * 1.55, Math.PI * 0.45, true); }, 0.06, 0.02), G(p.color || '#ffe9a8', 0.9), g);
    decal(g, -0.075, 0, 0.052, 0.09, sleepFaceTex());
    const cap = group(g, -0.03, 0.12, 0, [0, 0, 0.5]);
    mesh(cone(0.05, 0.13, 12), T(p.cap || '#5a6ad8'), cap, 0, 0.05, 0);
    mesh(torus(0.05, 0.014, 6, 14), T('#ffffff'), cap, 0, -0.012, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(sph(0.024, 8, 6), T('#ffffff'), cap, 0.01, 0.12, 0);
    bake(cap);
    glowSprite(g, p.color || '#ffe9a8', 0.5, 0.45);
    rt.on(({ t, dt }) => { g.rotation.z = Math.sin(t * 0.9) * 0.12; if (Math.random() < dt * 3) rt.ps('star').emit({ pos: rt.worldPos(g).add(V(rand(-0.2, 0.2), rand(-0.15, 0.15), rand(-0.1, 0.1))), count: 1, speed: 0.04, life: [0.5, 0.9], size: [0.05, 0.1], color: ['#ffffff', '#ffe9a8'] }); });
  },
});

/* ================= อาวุธระดับ Mythical / Celestial ================= */
// พิกัดอาวุธ: ดาบ/ค้อน (swordHand) ใบยาวตาม +z หน้าแบนหันแกน x · คทา (staffHand) ยาวตาม +y · ธนู (arms[1]) โค้งในระนาบ XY
const starfieldTex = () => ctex('starfield', 256, 256, (g, s) => {
  const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#140a3e'); gr.addColorStop(0.5, '#2e1866'); gr.addColorStop(1, '#0a2256');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  for (const [x, y, c] of [[60, 80, '#b45aff'], [180, 60, '#3ab8ff'], [140, 190, '#ff5ab4'], [40, 210, '#5affd8'], [220, 230, '#8a6aff']]) { g.globalAlpha = 0.4; g.fillStyle = radial(g, x, y, 70, [[0, c], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, s, s); }
  g.globalAlpha = 1;
  for (let i = 0; i < 170; i++) { const x = (i * 97.31) % s, y = (i * 57.77 + (i % 7) * 31) % s, r = i % 23 === 0 ? 2.6 : 0.6 + (i % 3) * 0.4; g.fillStyle = `rgba(255,255,255,${0.5 + (i % 5) * 0.1})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
}, { repeat: true });
const prismTex = () => ctex('prism', 256, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); ['#ff6ad5', '#ffd36a', '#6affb0', '#6ad8ff', '#b46aff', '#ff6ad5'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { repeat: true });
const auroraTex = () => ctex('aurora', 256, 32, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.12, 'rgba(120,255,200,1)'); gr.addColorStop(0.5, 'rgba(110,200,255,1)'); gr.addColorStop(0.85, 'rgba(200,120,255,0.9)'); gr.addColorStop(1, 'rgba(255,140,220,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in'; const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.5, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
});
const auroraBladeTex = () => ctex('aurorablade', 32, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#5affc0'); gr.addColorStop(0.45, '#5ad8ff'); gr.addColorStop(0.8, '#a87aff'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
// หินลาวา: map = เนื้อหิน · glow = รอยแตกเรืองแสง (ใช้เป็น emissiveMap)
const lavaTex = (glow) => ctex('lava' + glow, 128, 128, (g, s) => {
  g.fillStyle = glow ? '#000000' : '#2e262c'; g.fillRect(0, 0, s, s);
  if (!glow) for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${70 + (i % 4) * 12},${58 + (i % 3) * 8},64,0.5)`; g.beginPath(); g.arc((i * 53) % s, (i * 37) % s, 6 + (i % 5) * 3, 0, Math.PI * 2); g.fill(); }
  const paths = [[[0, 30], [24, 38], [40, 26], [70, 44], [96, 36], [128, 50]], [[20, 128], [30, 100], [56, 88], [62, 64], [90, 70], [110, 92], [128, 96]], [[56, 88], [44, 70], [40, 26]], [[90, 70], [100, 40], [96, 36], [100, 0]], [[0, 80], [16, 76], [30, 100]]];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const draw = (w, c) => { g.strokeStyle = c; g.lineWidth = w; for (const p of paths) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
  if (glow) { draw(7, '#c83a0a'); draw(4, '#ff9a2a'); draw(1.5, '#fff0b0'); } else draw(4, '#ff7a2a');
}, { repeat: true });

// ขนนกเรียว (ยาวตาม +x) มีรอยหยักเล็กด้านล่าง
const featherShape = (L, w) => (sh) => {
  sh.moveTo(0, 0);
  sh.quadraticCurveTo(L * 0.35, w, L * 0.75, w * 0.75);
  sh.quadraticCurveTo(L * 0.98, w * 0.35, L, 0);
  sh.quadraticCurveTo(L * 0.8, -w * 0.45, L * 0.45, -w * 0.55);
  sh.lineTo(L * 0.42, -w * 0.3); sh.lineTo(L * 0.36, -w * 0.5);
  sh.quadraticCurveTo(L * 0.15, -w * 0.4, 0, 0);
};
// ขนนกในระนาบหน้าใบดาบ (YZ): ชี้ไปทาง s (±y) แล้วกวาดถอยหลัง (-z) เป็นมุม phi (ติดลบ = เฉียงไปหน้า)
function featherYZ(parent, x, y, z, s, phi, L, w, mat, depth = 0.008) {
  const m = mesh(extrude(featherShape(L, w), depth, 0.003).rotateY(-Math.PI / 2), mat, parent, x, y, z);
  m.rotation.x = -s * (Math.PI / 2 + phi);
  return m;
}
// ขนนกในระนาบ XY (คทา/ธนู): ชี้ไปตามมุม a (เรเดียน จากแกน +x)
function featherXY(parent, x, y, z, a, L, w, mat, depth = 0.008) {
  const m = mesh(extrude(featherShape(L, w), depth, 0.003), mat, parent, x, y, z);
  m.rotation.z = a;
  return m;
}
// แถบแสงพลิ้ว (ริบบิ้นออโรรา) — path(u, t, out) เขียนตำแหน่งลง out
function flowStrip(parent, rt, N, width, path, mat, twist = 0.6) {
  const geo = new THREE.PlaneGeometry(1, 1, N - 1, 1);
  const m = mesh(geo, mat, parent, 0, 0, 0, { keep: true, noOutline: true, shadow: false });
  m.frustumCulled = false; m.renderOrder = 4;
  const P = Array.from({ length: N }, () => V()), tg = V(), wv = V(), Z = V(0, 0, 1), tmp = V();
  const step = (t) => {
    for (let i = 0; i < N; i++) path(i / (N - 1), t, P[i]);
    const pos = geo.attributes.position;
    for (let i = 0; i < N; i++) {
      tg.subVectors(P[Math.min(N - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
      wv.crossVectors(tg, Z); if (wv.lengthSq() < 1e-4) wv.set(1, 0, 0); wv.normalize();
      wv.applyAxisAngle(tg, Math.sin(t * 2 + i * 0.25) * twist);
      const w = width * Math.sin(Math.min(1, (i / (N - 1)) * 1.05 + 0.06) * Math.PI);
      tmp.copy(P[i]).addScaledVector(wv, w / 2); pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      tmp.copy(P[i]).addScaledVector(wv, -w / 2); pos.setXYZ(N + i, tmp.x, tmp.y, tmp.z);
    }
    pos.needsUpdate = true;
  };
  step(0); rt.on(({ t }) => step(t));
  return m;
}
// เปลือกเรืองแสงรอบรูปทรงใบดาบ (ชั้นบวกแสง ไม่เขียนความลึก)
const glowShell = (h, draw, color, { depth = 0.012, z0 = 0.1, opacity = 0.4, map = null } = {}) => {
  const m = blade(h, draw, unlit(color, { opacity, add: true, map }), { depth, bevel: 0.006, z0 });
  m.userData.keep = true; m.renderOrder = 4; m.castShadow = false;
  return m;
};
const boltSprite = (parent, color, sx = 0.12, sy = 0.24) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex('bolt'), color: lin(color), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(sx, sy, 1); parent.add(s); return s;
};

Object.assign(WEAPON, {
  /* ---------------- Mythical ---------------- */
  // ดาบหงส์เพลิงนิรันดร์: ใบเพลิงสองชั้น ขนนกทองแดงตามสันดาบ โกร่งปีกหงส์ หางขนนกห้อยแกว่ง ขนไฟโคจรรอบใบ
  phoenixBlade(rig, p, rt) {
    const h = swordHand(rig);
    const bladeOut = (sh) => { sh.moveTo(0, -0.04); sh.bezierCurveTo(0.3, -0.05, 0.6, -0.07, 0.86, 0.0); sh.bezierCurveTo(0.66, 0.05, 0.4, 0.075, 0, 0.045); };
    blade(h, bladeOut, G('#ff5a1a', 1.3), { depth: 0.024, z0: 0.1 });
    const core = blade(h, (sh) => { sh.moveTo(0.02, -0.018); sh.bezierCurveTo(0.3, -0.026, 0.58, -0.04, 0.82, 0.0); sh.bezierCurveTo(0.6, 0.02, 0.36, 0.035, 0.02, 0.02); }, G('#ffeaa0', 2.2), { depth: 0.03, bevel: 0, z0: 0.1 });
    core.userData.noOutline = true;
    const gold = metal('#ffcf4a', 0.5), red = G('#ff3a1a', 1.4), deep = G('#c8180a', 1.0);
    for (let i = 0; i < 6; i++) featherYZ(h, 0, 0.045 + Math.sin((i / 6) * Math.PI) * 0.02, 0.17 + i * 0.1, 1, 0.95 - i * 0.06, 0.1 + i * 0.01, 0.03, i % 2 ? red : gold);
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) featherYZ(h, 0, s * 0.03, 0.095 - k * 0.012, s, -0.35 + k * 0.26, 0.15 + Math.min(k, 5 - k) * 0.035, 0.042, k % 2 ? red : k % 3 ? deep : gold, 0.012);
    mesh(oct(0.045), G('#ff2a1a', 2.2), h, 0, 0, 0.095, { s: [1.2, 1, 1.2], noOutline: true });
    mesh(box(0.05, 0.07, 0.05), gold, h, 0, 0, 0.08);
    const gr = mesh(cyl(0.021, 0.021, 0.14, 8), T('#6a1a10'), h, 0, 0, -0.01); gr.rotation.x = Math.PI / 2;
    for (const z of [-0.06, 0.02]) mesh(torus(0.024, 0.006, 4, 12), gold, h, 0, 0, z);
    mesh(sph(0.032, 10, 8), gold, h, 0, 0, -0.09);
    bake(h);
    glowShell(h, (sh) => { sh.moveTo(-0.02, -0.06); sh.bezierCurveTo(0.3, -0.075, 0.62, -0.1, 0.93, 0.0); sh.bezierCurveTo(0.68, 0.08, 0.4, 0.1, -0.02, 0.065); }, '#ff7a2a', { opacity: 0.35, depth: 0.014 });
    // หางขนนกสามเส้นที่ด้าม
    const tails = [-1, 0, 1].map((k) => {
      const g = group(h, 0, 0, -0.1);
      taper(g, bez3(V(0, 0, 0), V(0, -0.05 + k * 0.03, -0.08), V(0, -0.12 + k * 0.05, -0.12), V(0, -0.22 + k * 0.06, -0.12), 7), 0.014, 0.004, k ? red : gold);
      featherYZ(g, 0, -0.2 + k * 0.06, -0.12, -1, 0.6, 0.08, 0.026, k ? gold : red);
      bake(g); return g;
    });
    // ขนไฟโคจรเป็นเกลียวรอบใบดาบ
    const orbit = group(h);
    const shards = [0, 1, 2, 3].map((i) => featherYZ(orbit, 0, 0, 0, 1, 0.2, 0.07, 0.022, i % 2 ? G('#ffd27a', 2) : red));
    rt.on(({ t }) => {
      tails.forEach((g, i) => { g.rotation.x = Math.sin(t * 2.2 + i) * 0.18; g.rotation.y = Math.sin(t * 1.6 + i * 1.7) * 0.22; });
      shards.forEach((m, i) => { const k = (t * 0.22 + i / 4) % 1, a = t * 2.4 + i * 1.57; m.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.14 + k * 0.72); m.scale.setScalar(Math.sin(k * Math.PI) + 0.05); });
    });
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0, 0.5], [0, 0, 0.72], [0, 0, 0.86]], { kind: 'flame', color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a', up: 0.9, size: [0.1, 0.17], rate: 24, life: [0.35, 0.6] });
    weaponParticles(rt, h, [[0, 0.05, 0.4], [0, -0.04, 0.6]], { kind: 'dot', color: ['#fff2b0', '#ffb347'], colorEnd: '#ff3a1a', up: 0.6, size: [0.03, 0.06], rate: 14, life: [0.5, 0.9] });
  },
  // ดาบมหันตภัยจันทร์โลหิต: ดาบใหญ่ใบดำฟันเลื่อย ร่องเลือดเรืองแดงเต้นตามจังหวะ วงจันทร์โลหิตหมุนหลังโกร่ง โซ่ห้อย
  bloodmoonBlade(rig, p, rt) {
    const h = swordHand(rig);
    const steel = metal('#2c2434', 0.15), rune = toonOwn('#ff2a3a', { emissive: '#ff1a2a', emissiveIntensity: 1.6 });
    blade(h, (sh) => { sh.moveTo(0, -0.07); sh.lineTo(0.16, -0.085); sh.lineTo(0.2, -0.06); sh.lineTo(0.36, -0.08); sh.lineTo(0.4, -0.06); sh.lineTo(0.66, -0.075); sh.lineTo(0.94, 0); sh.lineTo(0.66, 0.075); sh.lineTo(0.5, 0.07); sh.lineTo(0.46, 0.098); sh.lineTo(0.4, 0.07); sh.lineTo(0.22, 0.08); sh.lineTo(0.18, 0.102); sh.lineTo(0.12, 0.075); sh.lineTo(0, 0.07); }, steel, { depth: 0.03, z0: 0.12 });
    blade(h, (sh) => { sh.moveTo(0.04, -0.012); sh.lineTo(0.72, -0.008); sh.lineTo(0.78, 0); sh.lineTo(0.72, 0.008); sh.lineTo(0.04, 0.012); }, rune, { depth: 0.036, bevel: 0, z0: 0.12 }).userData.noOutline = true;
    for (let i = 0; i < 5; i++) mesh(oct(0.022), rune, h, 0, (i % 2 ? 1 : -1) * 0.042, 0.22 + i * 0.12, { s: [1.3, 1, 1.6], noOutline: true });
    // โกร่งหนาม
    const dark = metal('#3a2a3a', 0.1);
    mesh(box(0.06, 0.2, 0.06), dark, h, 0, 0, 0.09);
    for (const s of [-1, 1]) { mesh(cone(0.03, 0.14, 5), dark, h, 0, s * 0.15, 0.12, { r: [s * -1.1, 0, 0] }); mesh(cone(0.02, 0.09, 5), dark, h, 0, s * 0.1, 0.05, { r: [s * -2.2, 0, 0] }); }
    const gr = mesh(cyl(0.024, 0.024, 0.18, 8), T('#3a0a14'), h, 0, 0, -0.02); gr.rotation.x = Math.PI / 2;
    for (const z of [-0.08, -0.03, 0.02]) mesh(torus(0.026, 0.006, 4, 12), rune, h, 0, 0, z, { noOutline: true });
    mesh(cone(0.03, 0.09, 5), dark, h, 0, 0, -0.14, { r: [-Math.PI / 2, 0, 0] });
    bake(h);
    for (const sx of [-1, 1]) { const e = mesh(new THREE.PlaneGeometry(0.11, 0.11), unlit('#ff3a4a', { map: TX.eyeSigil(), opacity: 0.95, add: true }), h, sx * 0.032, 0, 0.09, { r: [0, sx * Math.PI / 2, 0], keep: true, shadow: false }); e.renderOrder = 5; }
    glowShell(h, (sh) => { sh.moveTo(-0.02, -0.1); sh.lineTo(0.7, -0.1); sh.lineTo(1.0, 0); sh.lineTo(0.7, 0.12); sh.lineTo(-0.02, 0.1); }, '#ff1a3a', { opacity: 0.22, depth: 0.016, z0: 0.12 });
    // วงจันทร์โลหิต (ระนาบเดียวกับหน้าใบดาบ)
    const moon = group(h, 0, 0, 0.14, [0, Math.PI / 2, 0]);
    mesh(torus(0.19, 0.014, 6, 40), rune, moon, 0, 0, 0, { noOutline: true });
    mesh(torus(0.215, 0.006, 4, 40), G('#ff6a7a', 1.6), moon, 0, 0, 0, { noOutline: true });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(cone(0.016, 0.06, 4), dark, moon, Math.cos(a) * 0.225, Math.sin(a) * 0.225, 0, { r: [0, 0, a - Math.PI / 2] }); }
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.17, Math.PI * 0.25, Math.PI * 1.75, false); sh.absarc(0.08, 0.02, 0.15, Math.PI * 1.6, Math.PI * 0.4, true); }, 0.01, 0), unlit('#ff2a3a', { opacity: 0.5, add: true }), moon, 0, 0, -0.02, { keep: true, shadow: false });
    bake(moon);
    const mist = glowSprite(h, '#ff1a3a', 0.6, 0.25, 0, 0, 0.45);
    // โซ่ห้อยจากโกร่ง
    const links = chain(group(h, 0, -0.1, 0.07), 6, 0.032, (sg, i) => mesh(torus(0.017, 0.005, 4, 10), dark, sg, 0, -0.016, 0, { r: [0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2] }));
    rt.on(({ t }) => {
      rune.emissiveIntensity = 1.2 + Math.sin(t * 3.2) * 0.6;
      moon.rotation.x = t * 0.5; mist.material.opacity = 0.18 + Math.sin(t * 3.2) * 0.08;
      links.forEach((l, i) => { l.rotation.x = Math.sin(t * 2.5 + i * 0.5) * 0.18; l.rotation.z = Math.sin(t * 1.9 + i) * 0.12; });
    });
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0, 0.6], [0, 0, 0.85]], { kind: 'smoke', blending: NB, color: ['#5a0a1a', '#2a0a12'], up: 0.35, size: [0.14, 0.22], rate: 10, life: [0.7, 1.1] });
    weaponParticles(rt, h, [[0, 0.06, 0.4], [0, -0.06, 0.7]], { kind: 'dot', color: ['#ff6a7a', '#ff1a3a'], colorEnd: '#5a0010', up: 0.5, size: [0.03, 0.06], rate: 14, life: [0.4, 0.8] });
  },
  // คทาพฤกษาจักรวาล: ลำต้นสามเกลียวมีเส้นเลือดแสง กิ่งโค้งเป็นกรงรอบเมล็ดพันธุ์เรืองแสง หิ่งห้อยโคจร ใบไม้ร่วง
  yggdrasilStaff(rig, p, rt) {
    const st = staffHand(rig), wood = T('#6a4a2a'), vein = G('#8aff9a', 1.6);
    for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 16; i++) { const a = i * 0.55 + k * 2.09; pts.push(V(Math.cos(a) * 0.016, -0.27 + i * 0.075, Math.sin(a) * 0.016)); } taper(st, pts, 0.018, 0.014, wood, { cap: false, seg: 6 }); }
    const vp = []; for (let i = 0; i <= 30; i++) { const a = i * 0.45 + 1; vp.push(V(Math.cos(a) * 0.03, -0.2 + i * 0.037, Math.sin(a) * 0.03)); }
    taper(st, vp, 0.005, 0.005, vein, { cap: false, joints: false, seg: 4 });
    const leafG = T('#4ab05a'), leafY = G('#ffe08a', 0.6);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const pts = bez3(V(0, 0.9, 0), V(c * 0.08, 0.98, s * 0.08), V(c * 0.17, 1.14, s * 0.17), V(c * 0.05, 1.32, s * 0.05), 7);
      taper(st, pts, 0.016, 0.004, wood);
      for (const j of [2, 4]) mesh(sph(0.03, 8, 6), j === 2 ? leafG : leafY, st, pts[j].x * 1.15, pts[j].y, pts[j].z * 1.15, { s: [1.5, 0.5, 0.9], r: [0, -a, 0.5] });
      if (k % 2 === 0) flower(st, pts[5].x * 1.1, pts[5].y, pts[5].z * 1.1, k === 2 ? '#ffffff' : '#ff9ac8', 0.02, '#ffe08a', [0, -a + Math.PI / 2, 0]);
    }
    bake(st);
    const seed = mesh(sph(0.07, 18, 14), G('#c8ff7a', 2.4), st, 0, 1.1, 0, { noOutline: true, keep: true });
    glowSprite(st, '#b8ff8a', 0.55, 0.6, 0, 1.1, 0);
    const ring = group(st, 0, 1.1, 0, [0.5, 0, 0.3]);
    mesh(torus(0.11, 0.006, 4, 36), G('#9affb0', 2), ring, 0, 0, 0, { noOutline: true });
    mesh(new THREE.PlaneGeometry(0.24, 0.24), unlit('#9affb0', { map: TX.runeCircle('hex'), opacity: 0.55, add: true }), ring, 0, 0, 0, { r: [Math.PI / 2, 0, 0], keep: true, shadow: false });
    const flies = [0, 1, 2, 3, 4, 5].map(() => glowSprite(st, '#e8ff8a', 0.07, 0.95));
    rt.on(({ t }) => {
      seed.scale.setScalar(1 + Math.sin(t * 2.4) * 0.06); ring.rotation.y = t * 0.8;
      flies.forEach((f, i) => { const a = t * (0.8 + i * 0.1) + i; f.position.set(Math.cos(a) * (0.2 + (i % 2) * 0.06), 1.1 + Math.sin(t * 1.7 + i * 2) * 0.12, Math.sin(a) * (0.2 + (i % 2) * 0.06)); f.material.opacity = 0.6 + Math.sin(t * 6 + i) * 0.35; });
    });
    weaponParticles(rt, st, [[0.12, 1.15, 0], [-0.12, 1.12, 0.05], [0, 1.25, -0.1]], { kind: 'leaf', blending: NB, color: ['#7ad86a', '#ffe08a', '#4ab05a'], up: -0.25, gravity: -0.15, size: [0.06, 0.1], rate: 4, life: [1.2, 1.8] });
    weaponParticles(rt, st, [[0, 1.1, 0]], { kind: 'dot', color: ['#d8ffb0', '#8aff9a'], up: 0.4, size: [0.03, 0.06], rate: 10, life: [0.6, 1.1] });
  },
  // ธนูอัสนีพิโรธ: คันเงินมีครีบสายฟ้า ลูกแก้วพายุที่ด้าม สายฟ้าแลบระหว่างแขนธนู
  stormBow(rig, p, rt) {
    const r = 0.4, half = 1.1;
    const bw = group(rig.arms[1], 0.04, -0.27, 0.06, [0, -Math.PI / 2, 0]); rig.arms[1].userData.holding = true;
    const silver = metal('#b8c8e8', 0.3), bolt = G('#7ae8ff', 2), navy = metal('#2a3a6a', 0.2);
    mesh(torus(r, 0.026, 6, 30, half * 2), silver, bw, -r, 0, 0, { r: [0, 0, -half] });
    mesh(torus(r + 0.03, 0.008, 4, 30, half * 1.8), bolt, bw, -r, 0, 0, { r: [0, 0, -half * 0.9], noOutline: true });
    const zig = (sh) => { sh.moveTo(0, -0.01); sh.lineTo(0.05, 0.008); sh.lineTo(0.036, 0.024); sh.lineTo(0.1, 0.045); sh.lineTo(0.03, 0.04); sh.lineTo(0.045, 0.024); sh.lineTo(0, 0.012); };
    const limbPt = (a) => V(-r + Math.cos(a) * r, Math.sin(a) * r, 0);
    for (const sy of [-1, 1]) {
      for (let i = 1; i <= 4; i++) { const a = sy * (i / 4.8) * half, q = limbPt(a); mesh(extrude(zig, 0.01, 0.003), bolt, bw, q.x + Math.cos(a) * 0.02, q.y + Math.sin(a) * 0.02, 0, { r: [0, 0, a], noOutline: true }); }
      const a = sy * half, q = limbPt(a);
      for (let k = 0; k < 3; k++) featherXY(bw, q.x, q.y, -0.004 * k, a + sy * (0.5 + k * 0.35), 0.13 - k * 0.025, 0.03, k % 2 ? silver : navy);
    }
    const chord = r - r * Math.cos(half), tipY = r * Math.sin(half);
    mesh(cyl(0.005, 0.005, 2 * tipY, 4), G('#9af0ff', 2.4), bw, -chord, 0, 0, { noOutline: true });
    mesh(cyl(0.034, 0.034, 0.11, 8), navy, bw);
    for (const k of [0, 1]) mesh(torus(0.062, 0.006, 4, 20), silver, bw, 0.04, 0, 0, { r: [k ? Math.PI / 2 : 0, Math.PI / 2, 0] });
    bake(bw);
    const orb = mesh(sph(0.045, 16, 12), G('#cff6ff', 2.6), bw, 0.04, 0, 0, { noOutline: true, keep: true });
    const halo = glowSprite(bw, '#7ae8ff', 0.3, 0.6, 0.04, 0, 0);
    const arcs = [0, 1, 2, 3].map(() => boltSprite(bw, '#bff6ff', 0.1, 0.22));
    const ends = [limbPt(half * 0.95), limbPt(-half * 0.95), limbPt(half * 0.5), limbPt(-half * 0.5)];
    let tick = 0;
    rt.on(({ t, dt }) => {
      tick -= dt; orb.scale.setScalar(1 + Math.sin(t * 9) * 0.06); halo.material.opacity = 0.5 + Math.random() * 0.25;
      arcs.forEach((s) => { s.material.opacity = Math.max(0, s.material.opacity - dt * 6); });
      if (tick <= 0) { tick = 0.08 + Math.random() * 0.25; const s = arcs[(Math.random() * 4) | 0], e = ends[(Math.random() * 4) | 0]; s.position.copy(e).lerp(V(0.04, 0, 0), 0.5); s.material.rotation = Math.atan2(e.y, e.x - 0.04) + Math.PI / 2; s.scale.y = e.length() * 0.9; s.material.opacity = 1; }
    });
    weaponParticles(rt, bw, ends.map((e) => [e.x, e.y, e.z]), { kind: 'dot', color: ['#ffffff', '#7ae8ff'], colorEnd: '#3a6aff', up: 0.2, size: [0.03, 0.06], rate: 18, life: [0.15, 0.3] });
    weaponParticles(rt, bw, [[0.04, 0, 0]], { kind: 'smoke', blending: NB, color: ['#3a4a6a', '#5a6a8a'], up: 0.25, size: [0.12, 0.18], rate: 3, life: [0.8, 1.2] });
  },
  // ค้อนไททันลาวา: หัวค้อนหินภูเขาไฟรอยแตกเรืองส้ม หัวท้ายครอบทองมีหนาม หินลาวาลอยโคจร
  titanHammer(rig, p, rt) {
    const h = swordHand(rig), gold = metal('#ffb84a', 0.3);
    const stone = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: lavaTex(false), emissive: new THREE.Color('#ffffff'), emissiveMap: lavaTex(true), gradientMap: gradientMap() });
    const hd = mesh(cyl(0.024, 0.028, 0.6, 10), T('#3a2a24'), h, 0, 0, 0.2); hd.rotation.x = Math.PI / 2;
    for (const z of [-0.06, 0.12, 0.32, 0.46]) mesh(torus(0.03, 0.008, 4, 14), gold, h, 0, 0, z);
    const head = group(h, 0, 0, 0.62);
    mesh(box(0.22, 0.36, 0.24), stone, head);
    for (const s of [-1, 1]) {
      mesh(cyl(0.135, 0.135, 0.05, 18), gold, head, 0, s * 0.2, 0);
      mesh(cyl(0.1, 0.12, 0.03, 18), stone, head, 0, s * 0.24, 0);
      mesh(cone(0.05, 0.12, 6), gold, head, 0, s * 0.31, 0, { r: [s > 0 ? 0 : Math.PI, 0, 0] });
      for (const z of [-1, 1]) for (const x of [-1, 1]) mesh(sph(0.018, 6, 4), gold, head, x * 0.11, s * 0.13, z * 0.12);
    }
    mesh(cone(0.045, 0.14, 6), gold, head, 0, 0, 0.18, { r: [Math.PI / 2, 0, 0] });
    bake(head); bake(h);
    glowSprite(head, '#ff7a2a', 0.7, 0.35);
    const rocks = [0, 1, 2, 3, 4].map((i) => mesh(new THREE.DodecahedronGeometry(0.035 + (i % 3) * 0.012, 0), stone, head, 0, 0, 0));
    rt.on(({ t }) => rocks.forEach((m, i) => { const a = t * (0.9 + i * 0.12) + i * 1.26; m.position.set(Math.cos(a) * 0.3, Math.sin(a * 1.3) * 0.06 + (i % 2 ? 0.05 : -0.05), Math.sin(a) * 0.3); m.rotation.set(t * (1 + i * 0.3), t * 0.7, i); }));
    weaponParticles(rt, h, [[0.12, 0, 0.62], [-0.12, 0, 0.62], [0, 0.15, 0.7], [0, -0.15, 0.7]], { kind: 'flame', color: ['#ffd27a', '#ff6a1a'], colorEnd: '#8a1a0a', up: 0.9, size: [0.08, 0.14], rate: 20, life: [0.35, 0.6] });
    weaponParticles(rt, h, [[0, 0, 0.75]], { kind: 'smoke', blending: NB, color: ['#3a2a2a', '#5a4a44'], up: 0.5, size: [0.15, 0.24], rate: 5, life: [0.8, 1.3] });
  },
  // มีดคู่สุริยคราส: เล่มขวาทองสุริยะโกร่งรัศมีตะวัน เล่มซ้ายเงินจันทราโกร่งเสี้ยวจันทร์ วงแหวนแสงไล่ตามใบ
  eclipseFangs(rig, p, rt) {
    const defs = [{ h: swordHand(rig), c: '#ffd34d', metalC: '#fff0c8', sun: true }, { h: leftHand(rig), c: '#b8a8ff', metalC: '#dcdcf4', sun: false }];
    for (const d of defs) {
      const h = d.h;
      blade(h, (sh) => { sh.moveTo(0, -0.03); sh.bezierCurveTo(0.14, -0.05, 0.3, -0.03, 0.44, 0.06); sh.bezierCurveTo(0.3, 0.025, 0.12, 0.04, 0, 0.03); }, metal(d.metalC, 0.4), { depth: 0.018, z0: 0.07 });
      blade(h, (sh) => { sh.moveTo(0.02, -0.026); sh.bezierCurveTo(0.15, -0.046, 0.3, -0.026, 0.42, 0.052); sh.bezierCurveTo(0.3, -0.006, 0.15, -0.02, 0.02, -0.014); }, G(d.c, 2), { depth: 0.022, bevel: 0, z0: 0.07 }).userData.noOutline = true;
      const gm = G(d.c, 1.6);
      if (d.sun) { mesh(cyl(0.05, 0.05, 0.03, 18), gm, h, 0, 0, 0.065, { r: [0, 0, Math.PI / 2], noOutline: true }); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(cone(0.014, i % 2 ? 0.05 : 0.08, 4), metal('#ffcf4a', 0.5), h, 0, Math.cos(a) * 0.07, 0.065 + Math.sin(a) * 0.07, { r: [a, 0, 0] }); } }
      else { mesh(extrude((sh) => { sh.absarc(0, 0, 0.075, Math.PI * 0.3, Math.PI * 1.7, false); sh.absarc(0.035, 0, 0.06, Math.PI * 1.55, Math.PI * 0.45, true); }, 0.02, 0.006), gm, h, 0, 0, 0.065, { r: [0, Math.PI / 2, 0], noOutline: true }); for (const s of [-1, 1]) mesh(oct(0.016), G('#ffffff', 2), h, 0, s * 0.07, 0.03, { noOutline: true }); }
      const gr = mesh(cyl(0.018, 0.018, 0.1, 8), T('#2a2234'), h, 0, 0, -0.005); gr.rotation.x = Math.PI / 2;
      mesh(oct(0.026), G(d.c, 2), h, 0, 0, -0.07, { noOutline: true });
      bake(h);
      glowShell(h, (sh) => { sh.moveTo(-0.01, -0.05); sh.bezierCurveTo(0.14, -0.07, 0.32, -0.05, 0.5, 0.08); sh.bezierCurveTo(0.3, 0.05, 0.12, 0.06, -0.01, 0.05); }, d.c, { opacity: 0.3, z0: 0.07 });
      const halo = mesh(torus(0.05, 0.006, 4, 24), G(d.c, 2.4), h, 0, 0, 0.2, { noOutline: true, keep: true });
      rt.on(({ t }) => { const k = (t * 0.45 + (d.sun ? 0 : 0.5)) % 1; halo.position.z = 0.1 + k * 0.38; halo.scale.setScalar(1.3 - k * 0.7); halo.material.opacity = 1; });
      weaponParticles(rt, h, [[0, 0, 0.2], [0, 0.03, 0.38]], { kind: d.sun ? 'flame' : 'star', color: [d.c, '#ffffff'], colorEnd: d.sun ? '#ff6a1a' : '#5a4aff', up: 0.3, size: [0.05, 0.1], rate: 12, life: [0.3, 0.6] });
    }
    rig.arms[1].userData.holding = true;
  },

  /* ---------------- Celestial ---------------- */
  // ดาบจักรพรรดิดารา: ใบคริสตัลมีห้วงดาวในตัว ขอบแสงรุ้ง ปีกทองคู่ใหญ่ วงรัศมีอักขระหลังโกร่ง เศษผลึกหมุนเกลียวรอบใบ
  astralBlade(rig, p, rt) {
    const h = swordHand(rig);
    const sf = starfieldTex().clone(); sf.needsUpdate = true; sf.isOwned = true; sf.repeat.set(1.3, 5);
    const crystal = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: sf, emissive: new THREE.Color('#ffffff'), emissiveMap: sf, emissiveIntensity: 0.95, gradientMap: gradientMap() });
    blade(h, (sh) => { sh.moveTo(0, -0.05); sh.lineTo(0.56, -0.066); sh.lineTo(0.94, 0); sh.lineTo(0.56, 0.066); sh.lineTo(0, 0.05); }, crystal, { depth: 0.028, z0: 0.12 });
    mesh(box(0.034, 0.008, 0.74), G('#ffffff', 2.6), h, 0, 0, 0.48, { noOutline: true });
    const gold = metal('#ffe08a', 0.6), white = G('#fffaf0', 0.7);
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) featherYZ(h, 0, s * 0.04, 0.11 - k * 0.012, s, -0.55 + k * 0.24, 0.17 + Math.min(k, 6 - k) * 0.04, 0.045, k % 2 ? gold : white, 0.012);
    mesh(extrude((sh) => starShape(sh, 0.065, 0.03), 0.03, 0.008), G('#8af0ff', 2.2), h, 0, 0, 0.11, { r: [0, Math.PI / 2, 0], noOutline: true });
    const gr = mesh(cyl(0.021, 0.021, 0.15, 8), T('#f2f0ff'), h, 0, 0, 0.0); gr.rotation.x = Math.PI / 2;
    for (const z of [-0.05, 0.0, 0.05]) mesh(torus(0.024, 0.006, 4, 12), gold, h, 0, 0, z);
    mesh(extrude((sh) => starShape(sh, 0.04, 0.018), 0.02, 0.006), G('#ffe08a', 2), h, 0, 0, -0.1, { r: [0, Math.PI / 2, 0], noOutline: true });
    bake(h);
    glowShell(h, (sh) => { sh.moveTo(-0.01, -0.074); sh.lineTo(0.57, -0.09); sh.lineTo(1.0, 0); sh.lineTo(0.57, 0.09); sh.lineTo(-0.01, 0.074); }, '#ffffff', { opacity: 0.6, map: prismTex(), depth: 0.014, z0: 0.12 });
    glowShell(h, (sh) => { sh.moveTo(-0.02, -0.1); sh.lineTo(0.58, -0.12); sh.lineTo(1.06, 0); sh.lineTo(0.58, 0.12); sh.lineTo(-0.02, 0.1); }, '#9ad8ff', { opacity: 0.18, depth: 0.01, z0: 0.12 });
    // วงรัศมีหลังโกร่ง
    const halo = group(h, 0, 0, 0.1, [0, Math.PI / 2, 0]);
    mesh(torus(0.2, 0.01, 6, 48), G('#ffe9a8', 2.2), halo, 0, 0, 0, { noOutline: true });
    mesh(torus(0.23, 0.004, 4, 48), G('#ffffff', 2), halo, 0, 0, 0, { noOutline: true });
    const runes = mesh(new THREE.PlaneGeometry(0.5, 0.5), unlit('#ffe08a', { map: TX.runeCircle('star'), opacity: 0.75, add: true }), halo, 0, 0, -0.01, { keep: true, shadow: false });
    runes.renderOrder = 4;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mesh(oct(0.014), G('#ffffff', 2), halo, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0, { noOutline: true }); }
    const shardMat = toon('#bff4ff', { emissive: '#8ae8ff', emissiveIntensity: 1.4, transparent: true, opacity: 0.9 });
    const shards = [0, 1, 2, 3, 4, 5].map(() => mesh(oct(1), shardMat, h, 0, 0, 0, { s: [0.014, 0.014, 0.06], keep: true }));
    const shine = glowSprite(h, '#cfe8ff', 0.5, 0.35, 0, 0, 0.55);
    rt.on(({ t }) => {
      halo.rotation.x = t * 0.35; runes.rotation.z = -t * 0.6;
      shards.forEach((m, i) => { const k = (t * 0.14 + i / 6) % 1, a = t * 1.6 + (i / 6) * Math.PI * 2; m.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.16 + k * 0.78); const s = Math.sin(k * Math.PI); m.scale.set(0.014 * s, 0.014 * s, 0.06 * s + 0.001); });
      shine.material.opacity = 0.28 + Math.sin(t * 2.5) * 0.1;
    });
    weaponParticles(rt, h, [[0, 0, 0.3], [0, 0, 0.55], [0, 0, 0.8], [0, 0, 1.0]], { kind: 'star', color: ['#ffffff', '#8af0ff', '#ffe08a', '#ff9ad8'], up: 0.15, size: [0.06, 0.12], rate: 22, life: [0.4, 0.8] });
    weaponParticles(rt, h, [[0, 0.2, 0.1], [0, -0.2, 0.1]], { kind: 'dot', color: ['#ffe9a8', '#ffffff'], up: 0.3, size: [0.03, 0.05], rate: 10, life: [0.5, 0.9] });
  },
  // คทาจักรวาลนิรันดร์: ทรงกลมดาราศาสตร์สามวงหมุนต่างแกน ดาวแกนกลางเรืองจ้า ดาวเคราะห์จิ๋วบนวง ม่านเนบิวลา
  orreryStaff(rig, p, rt) {
    const st = staffHand(rig), gold = metal('#ffe08a', 0.5), white = T('#f6f4ff', { emissive: '#3a3a5a' });
    mesh(cyl(0.02, 0.024, 1.15, 10), white, st, 0, 0.3, 0);
    const hp = []; for (let i = 0; i <= 40; i++) { const a = i * 0.5; hp.push(V(Math.cos(a) * 0.026, -0.2 + i * 0.026, Math.sin(a) * 0.026)); }
    taper(st, hp, 0.006, 0.006, gold, { cap: false, joints: false, seg: 5 });
    for (const y of [-0.24, 0.3, 0.84]) mesh(torus(0.032, 0.009, 5, 16), gold, st, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); taper(st, bez3(V(0, 0.86, 0), V(c * 0.05, 0.9, s * 0.05), V(c * 0.13, 0.98, s * 0.13), V(c * 0.1, 1.06, s * 0.1), 6), 0.014, 0.005, gold); }
    mesh(cone(0.03, 0.08, 8), gold, st, 0, -0.31, 0, { r: [Math.PI, 0, 0] });
    bake(st);
    const core = group(st, 0, 1.14, 0);
    mesh(sph(0.05, 18, 14), G('#ffe9a8', 1.5), core, 0, 0, 0, { noOutline: true, keep: true });
    glowSprite(core, '#ffd88a', 0.36, 0.45);
    const cross = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.crossGlow(), color: lin('#fff2c0'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); cross.scale.setScalar(0.42); core.add(cross);
    glowSprite(core, '#8a5aff', 0.8, 0.22);
    const rings = [[0.16, 0.009, '#ffe08a', '#8ad0ff'], [0.13, 0.008, '#9ae8ff', '#ff9a7a'], [0.105, 0.007, '#ffb0e0', '#c8ff9a']].map(([r, th, c, pc]) => {
      const g = group(core);
      mesh(torus(r, th * 1.3, 6, 48), metal(c, 0.6), g, 0, 0, 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mesh(sph(th * 1.6, 6, 4), G('#ffffff', 2), g, Math.cos(a) * r, Math.sin(a) * r, 0, { noOutline: true }); }
      const pl = mesh(sph(0.02, 12, 8), G(pc, 1.3), g, r, 0, 0, { noOutline: true });
      return { g, pl, r };
    });
    rt.on(({ t }) => {
      rings[0].g.rotation.set(t * 0.7, t * 0.3, 0); rings[1].g.rotation.set(0.9, -t * 0.9, t * 0.4); rings[2].g.rotation.set(t * 1.1, 1.3, t * 0.5);
      rings.forEach((o, i) => { const a = t * (1.5 + i * 0.6); o.pl.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0); });
      cross.material.rotation = t * 0.3; cross.material.opacity = 0.42 + Math.sin(t * 3) * 0.1;
    });
    weaponParticles(rt, st, [[0, 1.14, 0], [0.12, 1.1, 0], [-0.12, 1.18, 0]], { kind: 'star', color: ['#ffffff', '#ffe08a', '#8ad0ff', '#ff9ad8'], up: -0.1, gravity: -0.25, size: [0.05, 0.11], rate: 16, life: [0.6, 1.1] });
  },
  // ธนูสุริยันจันทรา: แขนธนูเป็นปีกขนนกขาวทองสองชั้น ปลายบนดวงอาทิตย์ ปลายล่างจันทร์เสี้ยว สายธนูแสง วงรัศมีที่ด้าม
  heavenBow(rig, p, rt) {
    const r = 0.42, half = 1.08;
    const bw = group(rig.arms[1], 0.04, -0.27, 0.06, [0, -Math.PI / 2, 0]); rig.arms[1].userData.holding = true;
    const gold = metal('#ffe08a', 0.6), white = T('#ffffff', { emissive: '#5a5a7a' }), glowW = G('#fff6dc', 0.7);
    mesh(torus(r, 0.022, 6, 30, half * 2), gold, bw, -r, 0, 0, { r: [0, 0, -half] });
    const limb = (a) => V(-r + Math.cos(a) * r, Math.sin(a) * r, 0);
    for (const sy of [-1, 1]) {
      for (let i = 0; i < 8; i++) { const a = sy * (0.1 + (i / 7) * (half - 0.14)), q = limb(a); featherXY(bw, q.x, q.y, -0.004 * i, a + sy * (0.4 + i * 0.07), 0.12 + i * 0.024, 0.036, i % 2 ? white : glowW); }
      for (let i = 0; i < 6; i++) { const a = sy * (0.16 + (i / 5) * (half - 0.3)), q = limb(a); featherXY(bw, q.x, q.y, 0.006, a + sy * (0.3 + i * 0.06), 0.07 + i * 0.015, 0.025, gold, 0.01); }
    }
    const chord = r - r * Math.cos(half), tipY = r * Math.sin(half);
    mesh(cyl(0.005, 0.005, 2 * tipY, 4), G('#fff2c0', 2.6), bw, -chord, 0, 0, { noOutline: true });
    mesh(cyl(0.032, 0.032, 0.1, 8), T('#f2ece0'), bw);
    for (const y of [-0.05, 0.05]) mesh(torus(0.034, 0.007, 4, 12), gold, bw, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    // ดวงอาทิตย์ (บน) จันทร์เสี้ยว (ล่าง)
    const top = limb(half), bot = limb(-half);
    const sun = group(bw, top.x, top.y + 0.02, 0);
    mesh(sph(0.045, 16, 12), G('#ffe27a', 2.4), sun, 0, 0, 0, { noOutline: true });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(cone(0.016, i % 2 ? 0.05 : 0.085, 4), G('#ffb347', 1.8), sun, Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0, { r: [0, 0, a - Math.PI / 2], s: [1, 1, 0.4], noOutline: true }); }
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.06, Math.PI * 0.3, Math.PI * 1.7, false); sh.absarc(0.03, 0, 0.048, Math.PI * 1.55, Math.PI * 0.45, true); }, 0.02, 0.006), G('#d8e8ff', 1.8), bw, bot.x, bot.y - 0.02, 0, { r: [0, 0, -0.6], noOutline: true });
    bake(sun); bake(bw);
    glowSprite(sun, '#ffcf6a', 0.4, 0.7);
    glowSprite(bw, '#a8c8ff', 0.3, 0.6, bot.x, bot.y - 0.02, 0);
    const ring = group(bw, 0.03, 0, 0, [0, Math.PI / 2, 0]);
    mesh(torus(0.08, 0.007, 4, 32), G('#ffe9a8', 2.2), ring, 0, 0, 0, { noOutline: true });
    mesh(oct(0.03), G('#8af0ff', 2.2), bw, 0.04, 0, 0, { noOutline: true, keep: true });
    const rays = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.crossGlow(), color: lin('#fff2c0'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); rays.scale.setScalar(0.32); sun.add(rays);
    rt.on(({ t }) => { sun.rotation.z = t * 0.6; ring.rotation.x = t * 0.9; rays.material.rotation = -t * 0.4; });
    weaponParticles(rt, bw, [limb(half * 0.7), limb(-half * 0.7), limb(half * 0.35), limb(-half * 0.35)].map((q) => [q.x + 0.08, q.y, 0]), { kind: 'feather', blending: NB, color: ['#ffffff', '#fff2c8'], up: -0.2, gravity: -0.3, size: [0.08, 0.12], rate: 4, life: [1.0, 1.5] });
    weaponParticles(rt, bw, [[top.x, top.y, 0], [bot.x, bot.y, 0], [0.04, 0, 0]], { kind: 'star', color: ['#ffffff', '#ffe08a', '#bfe0ff'], up: 0.1, size: [0.05, 0.1], rate: 12, life: [0.4, 0.8] });
  },
  // ค้อนพิพากษาเทวา: หัวค้อนหินอ่อนขาวขลิบทอง ปีกทองสองข้าง มงกุฎรัศมีลอยหมุนเหนือหัวค้อน
  seraphHammer(rig, p, rt) {
    const h = swordHand(rig), gold = metal('#ffd86a', 0.6), marble = T('#f8f6ff', { emissive: '#2a2a44' });
    const hd = mesh(cyl(0.024, 0.026, 0.6, 10), marble, h, 0, 0, 0.2); hd.rotation.x = Math.PI / 2;
    for (const z of [-0.07, 0.1, 0.3, 0.46]) mesh(torus(0.03, 0.008, 4, 14), gold, h, 0, 0, z);
    const gw = mesh(cyl(0.028, 0.028, 0.12, 8), T('#3a5ab8'), h, 0, 0, -0.01); gw.rotation.x = Math.PI / 2;
    mesh(oct(0.03), G('#8af0ff', 2), h, 0, 0, -0.11, { noOutline: true });
    const head = group(h, 0, 0, 0.62);
    mesh(cyl(0.105, 0.105, 0.34, 22), marble, head);
    for (const y of [-0.12, 0.12]) mesh(torus(0.107, 0.012, 5, 26), gold, head, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) { mesh(cyl(0.12, 0.12, 0.035, 22), gold, head, 0, s * 0.18, 0); mesh(cyl(0.055, 0.055, 0.02, 16), G('#8af0ff', 2), head, 0, s * 0.2, 0, { noOutline: true }); }
    for (const sx of [-1, 1]) mesh(extrude((sh) => starShape(sh, 0.07, 0.03, 4), 0.016, 0.005), G('#ffe08a', 1.8), head, sx * 0.105, 0, 0, { r: [0, Math.PI / 2, 0], noOutline: true });
    bake(head);
    const white = T('#ffffff', { emissive: '#5a5a7a' });
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) featherYZ(h, 0, s * 0.06, 0.66 + k * 0.012, s, -1.25 + k * 0.2, 0.18 + Math.min(k, 5 - k) * 0.04, 0.045, k % 2 ? gold : white, 0.012);
    bake(h);
    const crown = group(h, 0, 0, 0.86);
    mesh(torus(0.1, 0.013, 6, 36), G('#ffd86a', 1.3), crown, 0, 0, 0, { noOutline: true });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mesh(cone(0.016, 0.06, 4), G('#ffd86a', 1.1), crown, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.03, { r: [Math.PI / 2, 0, 0], noOutline: true }); }
    glowSprite(crown, '#fff2c0', 0.32, 0.25);
    const pillar = mesh(new THREE.PlaneGeometry(0.16, 0.6), unlit('#fff2c0', { map: TX.vgrad(), opacity: 0.22, add: true }), h, 0, 0, 1.05, { r: [Math.PI / 2, 0, 0], keep: true, shadow: false });
    const pillar2 = mesh(new THREE.PlaneGeometry(0.16, 0.6), pillar.material, h, 0, 0, 1.05, { r: [Math.PI / 2, Math.PI / 2, 0], keep: true, shadow: false });
    pillar.renderOrder = pillar2.renderOrder = 4;
    rt.on(({ t }) => { crown.rotation.z = t * 0.9; crown.position.z = 0.86 + Math.sin(t * 2) * 0.02; pillar.material.opacity = 0.14 + Math.sin(t * 2.6) * 0.07; });
    weaponParticles(rt, h, [[0.1, 0, 0.62], [-0.1, 0, 0.62], [0, 0, 0.86]], { kind: 'star', color: ['#ffffff', '#ffe9a8'], up: 0.8, size: [0.05, 0.1], rate: 16, life: [0.4, 0.8] });
  },
  // หอกแสงออโรรา: หัวหอกคริสตัลไล่สีออโรรา ปีกขนนกที่คอหอก ริบบิ้นแสงออโรราสองสายพลิ้ว วงแหวนลอยรอบด้าม
  auroraLance(rig, p, rt) {
    const st = staffHand(rig), silver = metal('#e8eef8', 0.4), gold = metal('#ffe08a', 0.5);
    mesh(cyl(0.017, 0.021, 1.32, 10), silver, st, 0, 0.39, 0);
    for (const y of [-0.26, 0.3, 0.98]) mesh(torus(0.026, 0.008, 4, 14), gold, st, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) featherXY(st, s * 0.02, 1.03, 0.004 * k, s > 0 ? -0.5 - k * 0.32 : Math.PI + 0.5 + k * 0.32, 0.13 - k * 0.012, 0.032, k % 2 ? gold : T('#ffffff', { emissive: '#4a5a7a' }));
    mesh(sph(0.04, 12, 10), gold, st, 0, 1.06, 0, { s: [1, 0.8, 1] });
    bake(st);
    const at = auroraBladeTex().clone(); at.needsUpdate = true; at.isOwned = true; at.repeat.set(4, 2.3);
    const crystal = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: at, emissive: new THREE.Color('#ffffff'), emissiveMap: at, emissiveIntensity: 0.65, gradientMap: gradientMap() });
    const head = mesh(extrude((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.09, 0.1, 0.06, 0.2); sh.lineTo(0, 0.44); sh.lineTo(-0.06, 0.2); sh.quadraticCurveTo(-0.09, 0.1, 0, 0); }, 0.03, 0.01), crystal, st, 0, 1.08, 0);
    mesh(box(0.008, 0.36, 0.036), G('#dffff4', 1.4), st, 0, 1.28, 0, { noOutline: true });
    bake(st);
    const shell = mesh(extrude((sh) => { sh.moveTo(0, -0.02); sh.quadraticCurveTo(0.12, 0.1, 0.08, 0.21); sh.lineTo(0, 0.5); sh.lineTo(-0.08, 0.21); sh.quadraticCurveTo(-0.12, 0.1, 0, -0.02); }, 0.012, 0.006), unlit('#9affe0', { opacity: 0.18, add: true }), st, 0, 1.08, 0, { keep: true, shadow: false });
    shell.renderOrder = 4;
    const ribMat = unlit('#ffffff', { map: auroraTex(), opacity: 0.9, add: true });
    for (const s of [-1, 1]) flowStrip(st, rt, 30, 0.06, (u, t, o) => o.set(s * (0.04 + u * 0.18) + Math.sin(t * 2.2 + u * 7 + s) * 0.035 * u, 1.02 - u * 0.66, Math.cos(t * 1.8 + u * 6 + s) * 0.06 * u - 0.02), ribMat, 0.5);
    const rings = [[0.6, '#7affd0'], [0.82, '#b48cff']].map(([y, c]) => { const g = group(st, 0, y, 0); mesh(torus(0.06, 0.006, 4, 28), G(c, 2.2), g, 0, 0, 0, { r: [Math.PI / 2, 0, 0], noOutline: true }); return g; });
    glowSprite(st, '#9affe0', 0.45, 0.2, 0, 1.3, 0);
    rt.on(({ t }) => rings.forEach((g, i) => { g.position.y = (i ? 0.82 : 0.6) + Math.sin(t * 1.8 + i * 2) * 0.05; g.rotation.set(Math.sin(t + i) * 0.3, t * (i ? -1.2 : 1.2), 0); }));
    weaponParticles(rt, st, [[0, 1.3, 0], [0, 1.45, 0], [0.05, 1.15, 0]], { kind: 'star', color: ['#9affe0', '#8ad8ff', '#c8a0ff', '#ffffff'], up: 0.15, size: [0.05, 0.1], rate: 16, life: [0.5, 0.9] });
  },
  // มีดคู่ขนนกเทวา: ใบมีดรูปขนนกขาว แกนขนเรืองทอง/ฟ้า ปีกเล็กที่โกร่ง วงรัศมีลอยรอบปลายมีด
  seraphPlumes(rig, p, rt) {
    for (const [h, c, edge, warm] of [[swordHand(rig), '#fff8e8', '#ffd86a', true], [leftHand(rig), '#eef8ff', '#8ae8ff', false]]) {
      blade(h, featherShape(0.5, 0.065), T(c, { emissive: warm ? '#5a4a3a' : '#3a4a5a' }), { depth: 0.014, z0: 0.07 });
      mesh(box(0.02, 0.008, 0.46), G(edge, 2.2), h, 0, 0.012, 0.3, { noOutline: true });
      const gm = metal(warm ? '#ffe08a' : '#dce8f8', 0.5);
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) featherYZ(h, 0, s * 0.02, 0.065 - k * 0.01, s, -0.2 + k * 0.35, 0.08 + (k === 1 ? 0.02 : 0), 0.024, gm, 0.01);
      const gr = mesh(cyl(0.018, 0.018, 0.1, 8), T(warm ? '#c8a050' : '#5a7ab8'), h, 0, 0, 0); gr.rotation.x = Math.PI / 2;
      mesh(oct(0.024), G(edge, 2), h, 0, 0, -0.065, { noOutline: true });
      bake(h);
      glowShell(h, featherShape(0.56, 0.09), edge, { opacity: 0.3, z0: 0.06, depth: 0.008 });
      const halo = group(h, 0, 0, 0.5);
      mesh(torus(0.045, 0.006, 4, 24), G(edge, 2.4), halo, 0, 0, 0, { noOutline: true });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; mesh(oct(0.01), G('#ffffff', 2), halo, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0, { noOutline: true }); }
      rt.on(({ t }) => { halo.rotation.z = t * (warm ? 1.5 : -1.5); halo.position.z = 0.5 + Math.sin(t * 2 + (warm ? 0 : 1)) * 0.04; });
      weaponParticles(rt, h, [[0, 0.03, 0.3], [0, 0.03, 0.5]], { kind: 'feather', blending: NB, color: [c, '#ffffff'], up: -0.15, gravity: -0.3, size: [0.06, 0.1], rate: 4, life: [0.8, 1.3] });
      weaponParticles(rt, h, [[0, 0, 0.45]], { kind: 'star', color: [edge, '#ffffff'], up: 0.1, size: [0.05, 0.09], rate: 10, life: [0.3, 0.6] });
    }
    rig.arms[1].userData.holding = true;
  },
});

/* ================= ชิ้นแฟชั่นระดับ Mythical / Celestial (ปีก ชุด หมวก หน้า หลัง ออร่า ผู้ติดตาม) ================= */
const sunburstTex = () => ctex('sunburst', 256, 256, (g, s) => {
  const c = s / 2;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, w = i % 2 ? 0.045 : 0.085, L = i % 2 ? c * 0.72 : c * 0.98;
    const gr = g.createRadialGradient(c, c, c * 0.12, c, c, L); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(c, c); g.arc(c, c, L, a - w, a + w); g.closePath(); g.fill();
  }
  g.fillStyle = radial(g, c, c, c * 0.42, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s);
});
const bloodMoonTex = () => ctex('bloodmoontex', 256, 256, (g, s) => {
  const c = s / 2;
  g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,110,100,1)'], [0.6, 'rgba(210,24,44,1)'], [0.66, 'rgba(130,0,24,1)'], [0.68, 'rgba(255,60,70,0.9)'], [0.8, 'rgba(255,20,40,0.3)'], [1, 'rgba(255,0,0,0)']]);
  g.fillRect(0, 0, s, s);
  for (const [x, y, r] of [[0.42, 0.4, 0.09], [0.6, 0.56, 0.12], [0.45, 0.64, 0.06], [0.62, 0.36, 0.05], [0.34, 0.54, 0.04]]) { g.fillStyle = 'rgba(100,0,24,0.45)'; g.beginPath(); g.arc(x * s, y * s, r * s, 0, Math.PI * 2); g.fill(); }
});
const tearsTex = () => ctex('bloodtears', 32, 64, (g, w, h) => {
  for (const [x, len] of [[10, 0.85], [20, 0.6]]) { const gr = g.createLinearGradient(0, 0, 0, h * len); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - 2, 0, 4, h * len); g.beginPath(); g.arc(x, h * len * 0.7, 3.2, 0, Math.PI * 2); g.fill(); }
});
const spriteOf = (map, color, scale, opacity = 0.9) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: lin(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(scale); return s; };
// ปีกขนนกหลายแถว — คืนตำแหน่งปลายขนแถวนอกสุด (พิกัดของ W)
function featherWing(W, s, size, rows, mats, boneMat, { reach = 0.66, arch = 0.5, droop = 0.14 } = {}) {
  const bone = (t) => V(s * (0.03 + reach * t) * size, (0.06 + arch * Math.sin(t * Math.PI * 0.62)) * size - droop * t * t * size, -0.03 * t);
  taper(W, Array.from({ length: 7 }, (_, i) => bone(i / 6)), 0.03 * size, 0.009 * size, boneMat);
  const tips = [], R = rows.length - 1;
  rows.forEach(([n, l0, l1], r) => {
    for (let i = 0; i < n; i++) {
      const t = (r >= R - 1 ? 0.1 : 0.04) + 0.9 * (i / (n - 1));
      const pp = bone(t), L = (l0 + (l1 - l0) * Math.pow(t, 1.2)) * size;
      const m = mesh(featherGeo, mats[r], W, pp.x, pp.y - r * 0.02 * size, -0.012 * (R - r) - 0.004 * i, { s: [0.046 * size, L / 2, 0.012 * size] });
      m.rotation.z = s * (0.12 + 1.15 * Math.pow(t, 1.5)) - s * 0.07 * r;
      if (r === R) tips.push(V(Math.sin(m.rotation.z) * L, -Math.cos(m.rotation.z) * L, 0).add(pp));
    }
  });
  bake(W, { thick: 0.008 });
  return tips;
}
// หน้ากากครึ่งหน้า (ใช้ร่วม: หงส์เพลิง / เทวา)
function maskGeo() {
  const geo = extrude((sh) => {
    sh.moveTo(-0.17, 0.02); sh.bezierCurveTo(-0.16, 0.08, -0.06, 0.07, 0, 0.03); sh.bezierCurveTo(0.06, 0.07, 0.16, 0.08, 0.17, 0.02);
    sh.bezierCurveTo(0.15, -0.06, 0.06, -0.06, 0, -0.02); sh.bezierCurveTo(-0.06, -0.06, -0.15, -0.06, -0.17, 0.02);
    for (const s of [-1, 1]) { const h = new THREE.Path(); h.absellipse(s * 0.085, 0.01, 0.038, 0.022, 0, Math.PI * 2, false); sh.holes.push(h); }
  }, 0.012, 0.004);
  const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) - pos.getX(i) * pos.getX(i) * 1.6);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- ปีก ---------- */
// ปีกราชันหงส์เพลิง: ขนสี่แถวไล่สีทอง-ส้ม-แดงเรืองแสง ปลายขนมีเปลวไฟ ลุกไหม้ตลอดเวลา
function wingPhoenixKing(rig, p, rt) {
  const size = p.size || 1.3;
  const cols = p.colors || ['#fff2a0', '#ffc24a', '#ff7a2a', '#e8341a'];
  const mats = cols.map((c, i) => G(c, 0.45 + i * 0.18)), boneMat = G(p.bone || '#ffe08a', 0.8);
  const tips = [];
  for (const { s, pivot } of wingRoot(rig, rt, { spread: 0.5, flap: 1.1, speed: 0.9, lift: 0.04 })) {
    const W = group(pivot);
    for (const q of featherWing(W, s, size, [[8, 0.12, 0.2], [9, 0.2, 0.36], [10, 0.3, 0.62], [12, 0.42, 0.95]], mats, boneMat)) {
      const f = spriteOf(spriteTex('flame'), '#ffb347', 1, 0.85); f.scale.set(0.11, 0.18, 1); f.position.copy(q); W.add(f); tips.push({ W, q, f });
    }
    glowSprite(W, '#ff7a2a', 1.15 * size, 0.2, s * 0.4 * size, 0, -0.02);
  }
  rt.on(({ t, dt }) => {
    tips.forEach((k, i) => { k.f.scale.y = 0.16 + Math.sin(t * 13 + i * 1.7) * 0.05; k.f.material.opacity = 0.7 + Math.sin(t * 9 + i) * 0.2; });
    for (let n = 0; n < 2; n++) if (Math.random() < dt * 20) { const k = tips[(Math.random() * tips.length) | 0]; rt.ps('flame').emit({ pos: k.W.localToWorld(k.q.clone()), count: 1, vel: () => V(rand(-0.15, 0.15), rand(0.4, 0.9), rand(-0.15, 0.15)), drag: 0.6, life: [0.35, 0.7], size: [0.12, 0.22], sizeEnd: 0.2, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); }
    if (Math.random() < dt * 3) { const k = tips[(Math.random() * tips.length) | 0]; rt.ps('feather').emit({ pos: k.W.localToWorld(k.q.clone()), count: 1, vel: () => V(rand(-0.2, 0.2), rand(-0.3, -0.1), rand(-0.2, 0.2)), life: [1.2, 1.8], size: [0.12, 0.18], sizeEnd: 0.5, color: ['#ffb347', '#ff6a2a'] }); }
  });
}
// ปีกอสูรจันทร์โลหิต: ปีกพังผืดใหญ่ขอบแดงเรือง จันทร์โลหิตลอยหลังตัว วงหนาม วงอักขระ โซ่ห้อย
function wingBloodmoon(rig, p, rt) {
  wingMembrane(rig, { membrane: p.membrane || '#2a0a16', bone: '#12060c', claw: '#ff3a4a', memGlow: 0.25, edgeGlow: '#ff1a3a', edgeOpacity: 0.16, spikes: true, size: 1.4, spread: 0.5, flap: 0.9, speed: 0.7 }, rt);
  const g = group(rig.torso, 0, 0.52, -0.44);
  const moon = mesh(new THREE.PlaneGeometry(0.78, 0.78), unlit('#ffffff', { map: bloodMoonTex(), opacity: 1 }), g, 0, 0, 0, { keep: true, shadow: false });
  moon.material.depthWrite = false; moon.renderOrder = 1;
  const runes = mesh(new THREE.PlaneGeometry(1.15, 1.15), unlit('#ff2a3a', { map: TX.runeCircle('star'), opacity: 0.55, add: true }), g, 0, 0, -0.01, { keep: true, shadow: false });
  const ring = group(g);
  mesh(torus(0.4, 0.012, 6, 48), G('#ff2a3a', 1.6), ring, 0, 0, 0.01, { noOutline: true });
  const dark = metal('#2a1a22', 0.1);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; mesh(cone(0.02, i % 2 ? 0.07 : 0.12, 4), dark, ring, Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0.01, { r: [0, 0, a - Math.PI / 2] }); }
  bake(ring);
  const chains = [-1, 1].map((s) => chain(group(g, s * 0.3, -0.28, 0.02), 7, 0.035, (sg, i) => mesh(torus(0.017, 0.005, 4, 10), dark, sg, 0, -0.017, 0, { r: [0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2] })));
  glowSprite(g, '#ff2a3a', 1.1, 0.25);
  rt.on(({ t, dt }) => {
    ring.rotation.z = t * 0.25; runes.rotation.z = -t * 0.4; g.position.y = 0.52 + Math.sin(t * 1.1) * 0.025;
    chains.forEach((c, k) => c.forEach((sg, i) => { sg.rotation.z = Math.sin(t * 1.8 + i * 0.5 + k) * 0.12; }));
    if (Math.random() < dt * 6) rt.ps('smoke', NB).emit({ pos: rt.worldPos(g).add(V(rand(-0.3, 0.3), rand(-0.3, 0.3), 0)), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.15, 0.35), 0), life: [0.9, 1.4], size: [0.2, 0.3], sizeEnd: 1.8, color: ['#5a0a1a', '#3a0a14'], alpha: 0.45 });
  });
}
// ปีกเซราฟหกปีก: ปีกขาวทองสามคู่ (บน-กลาง-ล่าง) วงรัศมีอักขระทองหลังศีรษะ ขนนกแสงร่วง
function wingSeraph6(rig, p, rt) {
  const cols = p.colors || ['#ffffff', '#fffaf0', '#fff2d8', '#ffe9b8'];
  const mats = cols.map((c) => T(c, { emissive: '#4a4a66' })), boneMat = metal('#ffd86a', 0.6);
  const tips = [];
  const pairs = [
    { lift: 0.16, tilt: 0.75, size: 0.72, spread: 0.55, rows: [[6, 0.1, 0.16], [7, 0.16, 0.3], [8, 0.24, 0.5]] },
    { lift: 0.02, tilt: 0.05, size: 1.3, spread: 0.48, rows: [[8, 0.12, 0.2], [9, 0.2, 0.36], [11, 0.3, 0.64], [12, 0.4, 0.9]] },
    { lift: -0.14, tilt: -0.7, size: 0.85, spread: 0.42, rows: [[6, 0.1, 0.16], [7, 0.16, 0.3], [9, 0.24, 0.55]] },
  ];
  pairs.forEach((c, pi) => {
    for (const { s, pivot } of wingRoot(rig, rt, { spread: c.spread, flap: 0.9, speed: 0.8 + pi * 0.15, lift: c.lift })) {
      const W = group(pivot, 0, 0, -0.012 * pi, [0, 0, s * c.tilt]);
      for (const q of featherWing(W, s, c.size, c.rows, c.rows.length === 4 ? mats : mats.slice(1), boneMat)) tips.push({ W, q });
    }
  });
  const halo = group(rig.torso, 0, 0.66, -0.32);
  mesh(torus(0.3, 0.012, 6, 48), G('#ffe08a', 2), halo, 0, 0, 0, { noOutline: true });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mesh(oct(0.016), G('#ffffff', 2), halo, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, { noOutline: true }); }
  const runes = mesh(new THREE.PlaneGeometry(0.72, 0.72), unlit('#ffe08a', { map: TX.runeCircle('star'), opacity: 0.6, add: true }), halo, 0, 0, -0.01, { keep: true, shadow: false });
  rt.on(({ t, dt }) => {
    halo.rotation.z = t * 0.3; runes.rotation.z = -t * 0.5;
    if (Math.random() < dt * 4) { const k = tips[(Math.random() * tips.length) | 0]; rt.ps('feather', NB).emit({ pos: k.W.localToWorld(k.q.clone()), count: 1, vel: () => V(rand(-0.2, 0.2), rand(-0.3, -0.1), rand(-0.2, 0.2)), life: [1.5, 2.2], size: [0.12, 0.18], sizeEnd: 0.6, color: ['#ffffff', '#fff2c8'] }); }
    if (Math.random() < dt * 10) { const k = tips[(Math.random() * tips.length) | 0]; rt.ps('star').emit({ pos: k.W.localToWorld(k.q.clone()), count: 1, speed: 0.1, life: [0.4, 0.8], size: [0.08, 0.14], color: ['#ffffff', '#ffe08a'] }); }
  });
}
// ปีกห้วงจักรวาล: ปีกคริสตัลสามแฉกที่มีดาราจักรเลื่อนไหลอยู่ข้างใน ขอบแสงฟ้า ดาวระยิบบนปีก
function wingGalaxy(rig, p, rt) {
  const size = p.size || 1.15;
  const sf = starfieldTex().clone(); sf.needsUpdate = true; sf.isOwned = true; sf.repeat.set(1.4, 1.4);
  const mat = new THREE.MeshBasicMaterial({ map: sf, side: THREE.DoubleSide, transparent: true, opacity: 0.96 });
  const edge = G(p.edge || '#bff4ff', 1.8);
  const lobes = [
    (sh) => { sh.moveTo(0, 0.04); sh.bezierCurveTo(0.2, 0.5, 0.62, 0.86, 1.0, 0.8); sh.bezierCurveTo(0.86, 0.56, 0.7, 0.3, 0.06, 0); },
    (sh) => { sh.moveTo(0.02, 0); sh.bezierCurveTo(0.35, 0.2, 0.75, 0.26, 1.06, 0.12); sh.bezierCurveTo(0.8, 0.0, 0.5, -0.05, 0.04, -0.04); },
    (sh) => { sh.moveTo(0.02, -0.04); sh.bezierCurveTo(0.3, -0.2, 0.55, -0.46, 0.72, -0.64); sh.bezierCurveTo(0.45, -0.4, 0.2, -0.2, 0.02, -0.08); },
  ];
  const motes = [];
  for (const { s, pivot } of wingRoot(rig, rt, { spread: 0.42, flap: 0.6, speed: 0.7 })) {
    const W = group(pivot);
    lobes.forEach((draw, k) => {
      const m = mesh(shapeGeo(draw), mat, W, 0, 0, -0.004 * k, { s: [s * size, size, 1], keep: true, shadow: false }); m.renderOrder = 2;
      const sh = new THREE.Shape(); draw(sh);
      taper(W, sh.getPoints(30).map((q) => V(s * q.x * size, q.y * size, 0.002)), 0.007, 0.007, edge, { cap: false, joints: false, seg: 5 });
    });
    for (const [x, y] of [[0.7, 0.62], [0.45, 0.36], [0.85, 0.1], [0.5, -0.3], [0.25, 0.15]]) { const st = spriteOf(TX.star4(), '#ffffff', 0.12); st.position.set(s * x * size, y * size, 0.01); W.add(st); motes.push(st); }
    glowSprite(W, '#8a7aff', 1.0 * size, 0.18, s * 0.45 * size, 0.15, -0.02);
  }
  rt.on(({ t, dt }) => {
    sf.offset.x = t * 0.02; sf.offset.y = t * 0.006;
    motes.forEach((m, i) => { const k = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.9); m.scale.setScalar(0.06 + k * 0.12); m.material.rotation = t * 0.5; });
    if (Math.random() < dt * 8) { const m = motes[(Math.random() * motes.length) | 0]; rt.ps('star').emit({ pos: rt.worldPos(m), count: 1, speed: 0.12, life: [0.5, 0.9], size: [0.06, 0.12], color: ['#ffffff', '#9ad8ff', '#ff9ad8'] }); }
  });
}
Object.assign(WING_BUILDERS, { phoenixKing: wingPhoenixKing, bloodmoon: wingBloodmoon, seraph6: wingSeraph6, galaxy: wingGalaxy });

/* ---------- หมวก ---------- */
Object.assign(HEAD, {
  // มงกุฎหงส์เพลิง: วงทองประดับทับทิม หัวหงส์ทองด้านหน้า ปีกทองสองข้าง พู่ขนเพลิงสูงด้านหลัง
  phoenixCrown(rig, p, rt) {
    const g = group(rig.head, 0, 0.42, -0.01, [-0.16, 0, 0]);
    const gold = metal('#ffcf4a', 0.5), red = G('#ff3a1a', 1.5), orange = G('#ff8a2a', 1.3);
    mesh(cyl(0.21, 0.2, 0.08, 26, true), toon('#ffcf4a', { side: THREE.DoubleSide, emissive: '#4a2a00' }), g, 0, 0, 0, { noOutline: true });
    for (const y of [-0.04, 0.04]) mesh(torus(0.21, 0.012, 6, 28), gold, g, 0, y, 0, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.5; mesh(oct(0.02), G('#ff2a1a', 1.8), g, Math.sin(a) * 0.212, 0, Math.cos(a) * 0.212, { noOutline: true }); }
    for (let k = 0; k < 7; k++) mesh(featherGeo, k % 2 ? red : orange, g, (k - 3) * 0.03, 0.04, -0.18, { s: [0.025, 0.1 + (3 - Math.abs(k - 3)) * 0.035, 0.008], r: [Math.PI - 0.35, 0, (k - 3) * 0.22] });
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) mesh(featherGeo, k % 2 ? gold : red, g, s * 0.2, 0.03, 0.02, { s: [0.02, 0.06 + k * 0.016, 0.006], r: [Math.PI - 0.2, 0, s * (0.75 + k * 0.28)] });
    bake(g);
    const e = group(g, 0, 0.07, 0.22);
    mesh(sph(0.04, 12, 10), gold, e, 0, 0, 0, { s: [1, 1.1, 1] });
    mesh(cone(0.016, 0.06, 6), gold, e, 0, -0.012, 0.05, { r: [Math.PI / 2 + 0.35, 0, 0] });
    for (const s of [-1, 1]) mesh(sph(0.009, 6, 4), G('#ff2a1a', 2), e, s * 0.022, 0.012, 0.03, { noOutline: true });
    for (let k = 0; k < 5; k++) mesh(featherGeo, k % 2 ? red : orange, e, (k - 2) * 0.012, 0.03, -0.01, { s: [0.016, 0.07 + (2 - Math.abs(k - 2)) * 0.02, 0.006], r: [Math.PI - 0.4, 0, (k - 2) * 0.35] });
    bake(e);
    glowSprite(g, '#ff8a2a', 0.5, 0.3, 0, 0.12, -0.18);
    const top = new THREE.Object3D(); top.position.set(0, 0.2, -0.2); g.add(top);
    rt.on(({ dt }) => { if (Math.random() < dt * 14) rt.ps('flame').emit({ pos: rt.worldPos(top).add(V(rand(-0.1, 0.1), rand(-0.05, 0.05), rand(-0.04, 0.04))), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.3, 0.6), rand(-0.05, 0.05)), life: [0.3, 0.55], size: [0.07, 0.12], sizeEnd: 0.2, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); });
  },
  // มงกุฎเขาอสูรโลหิต: เขาโค้งดำเรืองแดง มงกุฎผลึกเลือดลอยหมุนเหนือหัว อัญมณีตาอสูรกลางหน้าผาก
  bloodCrown(rig, p, rt) {
    HEAD.horns(rig, { color: '#1a0a10', glow: '#ff1a2a', tip: '#ff3a4a', curl: true }, rt);
    const orbit = group(rig.head, 0, 0.64, -0.02);
    mesh(torus(0.2, 0.008, 4, 36), G('#ff2a3a', 1.8), orbit, 0, 0, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    const spikes = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; spikes.push(mesh(oct(1), G('#ff2a3a', 1.6), orbit, Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2, { s: [0.022, i % 3 === 0 ? 0.1 : 0.07, 0.022], noOutline: true })); }
    glowSprite(orbit, '#ff1a2a', 0.6, 0.22);
    const eg = group(rig.head, 0, 0.42, 0.25, [-0.5, 0, 0]);
    mesh(torus(0.03, 0.007, 4, 14), metal('#3a2a30'), eg);
    mesh(oct(0.025), G('#ff1a2a', 2.2), eg, 0, 0, 0.006, { s: [1, 1.3, 0.6], noOutline: true });
    bake(eg);
    rt.on(({ t, dt }) => {
      orbit.rotation.y = t * 0.6; spikes.forEach((m, i) => { m.position.y = 0.05 + Math.sin(t * 2 + i) * 0.02; });
      if (Math.random() < dt * 8) rt.ps('dot').emit({ pos: rt.worldPos(orbit).add(V(rand(-0.2, 0.2), 0, rand(-0.2, 0.2))), count: 1, vel: () => V(0, rand(0.2, 0.4), 0), life: [0.5, 0.9], size: [0.03, 0.06], color: ['#ff6a7a', '#ff1a3a'] });
    });
  },
  // มงกุฎจักรวาล: วงทองคาดหน้าผาก ผลึกดาวเจ็ดดวงโคจรเหนือหัวพร้อมเส้นกลุ่มดาว วงอักขระฟ้าหลังศีรษะ
  astralCrown(rig, p, rt) {
    const g = group(rig.head, 0, 0.36, 0, [-0.3, 0, 0]);
    mesh(torus(0.288, 0.013, 6, 36), metal('#ffe08a', 0.5), g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(extrude((sh) => starShape(sh, 0.06, 0.026), 0.022, 0.006), G('#8af0ff', 2), g, 0, 0.03, 0.29);
    for (const s of [-1, 1]) mesh(oct(0.02), G('#ffe08a', 1.6), g, s * 0.14, 0, 0.255, { noOutline: true });
    bake(g);
    const orbit = group(rig.head, 0, 0.68, -0.03, [0.25, 0, 0]);
    const cols = ['#8af0ff', '#ffffff', '#ffe08a', '#c8a0ff'];
    const crystals = Array.from({ length: 7 }, (_, i) => { const m = mesh(oct(1), G(cols[i % 4], 1.8), orbit, 0, 0, 0, { s: [0.02, 0.055, 0.02], noOutline: true }); const sp = spriteOf(TX.softDot(), cols[i % 4], 0.12, 0.55); m.add(sp); sp.scale.set(5, 2, 1); return m; });
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: lin('#9ad8ff'), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false; orbit.add(line);
    const disc = mesh(new THREE.PlaneGeometry(0.75, 0.75), unlit('#8ad8ff', { map: TX.runeCircle('star'), opacity: 0.55, add: true }), rig.head, 0, 0.3, -0.38, { keep: true, shadow: false });
    rt.on(({ t }) => {
      const pos = lineGeo.attributes.position;
      crystals.forEach((m, i) => { const a = t * 0.5 + (i / 7) * Math.PI * 2, r = 0.24 + (i % 2) * 0.04; m.position.set(Math.cos(a) * r, Math.sin(t * 1.6 + i * 2) * 0.035 + (i % 3) * 0.02, Math.sin(a) * r); m.rotation.y = t * 2; pos.setXYZ(i, m.position.x, m.position.y, m.position.z); });
      pos.setXYZ(7, crystals[0].position.x, crystals[0].position.y, crystals[0].position.z); pos.needsUpdate = true;
      disc.rotation.z = t * 0.35;
    });
  },
  // รัศมีเทวสุริยะ: วงแสงอาทิตย์ใหญ่หลังศีรษะ ลำแสงหมุน มงกุฎใบลอเรลทอง
  sunHalo(rig, p, rt) {
    const g = group(rig.head, 0, 0.35, -0.01, [-0.25, 0, 0]);
    mesh(torus(0.286, 0.011, 6, 36), metal('#ffd86a', 0.5), g, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 14; i++) { const a = -1.4 + (i / 13) * 2.8, sd = i < 7 ? -1 : 1; mesh(sph(0.03, 8, 6), metal('#ffe08a', 0.5), g, Math.sin(a) * 0.29, 0.015, Math.cos(a) * 0.29, { s: [0.5, 1.4, 0.25], r: [0, a, sd * 0.5] }); }
    bake(g);
    const halo = group(rig.head, 0, 0.32, -0.38);
    const rays = mesh(new THREE.PlaneGeometry(1.0, 1.0), unlit(p.color || '#ffd86a', { map: sunburstTex(), opacity: 0.7, add: true }), halo, 0, 0, -0.01, { keep: true, shadow: false });
    mesh(torus(0.26, 0.014, 6, 48), G('#ffd86a', 1.8), halo, 0, 0, 0, { noOutline: true });
    mesh(torus(0.21, 0.005, 4, 48), G('#ffffff', 2), halo, 0, 0, 0, { noOutline: true });
    const spikes = group(halo);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; mesh(cone(0.018, i % 2 ? 0.06 : 0.11, 4), G('#ffe08a', 1.6), spikes, Math.cos(a) * (0.29 + (i % 2 ? 0.03 : 0.055)), Math.sin(a) * (0.29 + (i % 2 ? 0.03 : 0.055)), 0, { r: [0, 0, a - Math.PI / 2], s: [1, 1, 0.4], noOutline: true }); }
    glowSprite(halo, '#fff2c0', 0.7, 0.3);
    rt.on(({ t }) => { rays.rotation.z = t * 0.2; spikes.rotation.z = -t * 0.15; halo.position.y = 0.32 + Math.sin(t * 1.5) * 0.015; });
  },
});

/* ---------- หน้า ---------- */
Object.assign(FACE, {
  // หน้ากากหงส์เพลิง: หน้ากากทอง ทับทิมกลาง พู่ขนเพลิงด้านขวา
  phoenixMask(rig, p) {
    const g = group(rig.head, 0, 0.2, 0.25);
    mesh(maskGeo(), metal('#ffcf4a', 0.5), g);
    mesh(oct(0.02), G('#ff2a1a', 2), g, 0, 0.045, 0.012, { noOutline: true });
    for (const s of [-1, 1]) mesh(oct(0.012), G('#ff6a1a', 2), g, s * 0.15, 0.04, -0.02, { noOutline: true });
    for (let k = 0; k < 5; k++) mesh(featherGeo, k % 2 ? G('#ff3a1a', 1.5) : G('#ffb347', 1.3), g, 0.16, 0.05, -0.04, { s: [0.022, 0.08 + k * 0.014, 0.006], r: [Math.PI - 0.15, 0, 0.1 + k * 0.28] });
    for (let k = 0; k < 2; k++) mesh(featherGeo, G('#ff8a2a', 1.4), g, -0.16, 0.05, -0.04, { s: [0.018, 0.06 + k * 0.012, 0.006], r: [Math.PI - 0.15, 0, -(0.2 + k * 0.3)] });
    bake(g);
  },
  // เนตรอสูรโลหิต: ดวงตาเรืองแดง รอยน้ำตาเลือดเรืองแสงใต้ตา
  bloodEye(rig, p, rt) {
    const c = V(0, 0.2, 0), col = p.color || '#ff1a3a', glow = [];
    for (const s of [-1, 1]) {
      // ม่านตาเรืองแดงทับดวงตา + วงแหวนรอบม่านตา
      const iris = mesh(sph(0.024, 12, 8), G(col, 2.2), rig.head, s * 0.08, 0.183, 0.252, { s: [1, 1.15, 0.3], noOutline: true, keep: true });
      iris.quaternion.setFromUnitVectors(V(0, 0, 1), V(s * 0.3, -0.03, 0.95).normalize());
      mesh(sph(0.008, 8, 6), T('#1a0006'), rig.head, s * 0.08, 0.183, 0.262, { s: [0.6, 1.6, 0.5], noOutline: true, keep: true });
      // รอยน้ำตาเลือดใต้ตา (ทึบ เห็นชัดบนผิว)
      const d = V(s * 0.31, -0.18, 0.93).normalize();
      const m = mesh(new THREE.PlaneGeometry(0.045, 0.09), new THREE.MeshBasicMaterial({ color: lin('#c8102a'), map: tearsTex(), transparent: true, depthWrite: false }), rig.head, c.x + d.x * 0.266, c.y + d.y * 0.266 - 0.025, c.z + d.z * 0.266, { keep: true, shadow: false });
      m.quaternion.setFromUnitVectors(V(0, 0, 1), d); m.renderOrder = 3;
      const e = spriteOf(TX.softDot(), col, 0.12, 0.6); e.position.set(s * 0.08, 0.185, 0.28); rig.head.add(e); glow.push(e);
    }
    rt.on(({ t, dt }) => { glow.forEach((e) => { e.material.opacity = 0.45 + Math.sin(t * 3.4) * 0.2; }); if (Math.random() < dt * 2.5) rt.ps('dot').emit({ pos: rt.worldPos(glow[(Math.random() * 2) | 0]), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.1, 0.25), 0.05), life: [0.4, 0.7], size: [0.03, 0.05], color: ['#ff6a7a', col] }); });
  },
  // ประกายดาราใต้เนตร: ดาวเรืองแสงที่หางตา อัญมณีหยดน้ำใต้ตา ประกายวิบวับ
  starMark(rig, p, rt) {
    const c = V(0, 0.2, 0), stars = [];
    const put = (obj, dir, r = 0.268) => { const d = dir.normalize(); obj.position.set(c.x + d.x * r, c.y + d.y * r, c.z + d.z * r); obj.quaternion.setFromUnitVectors(V(0, 0, 1), d); rig.head.add(obj); return obj; };
    for (const s of [-1, 1]) {
      stars.push(put(new THREE.Mesh(extrude((sh) => starShape(sh, 0.038, 0.016), 0.01, 0.003), G(p.color || '#4ad8ff', 1.8)), V(s * 0.55, 0.02, 0.83)));
      put(new THREE.Mesh(extrude((sh) => starShape(sh, 0.018, 0.008), 0.008, 0.002), G('#ffffff', 2)), V(s * 0.6, 0.16, 0.78));
      for (const k of [0, 1, 2]) put(new THREE.Mesh(oct(0.011 - k * 0.002), G(p.gem || '#ffcf4a', 1.6)), V(s * (0.27 + k * 0.07), -0.2 - k * 0.07, 0.93), 0.27);
    }
    rt.on(({ t, dt }) => { stars.forEach((m, i) => { m.rotation.z = Math.sin(t * 2 + i) * 0.3; }); if (Math.random() < dt * 3) rt.ps('star').emit({ pos: rt.worldPos(stars[(Math.random() * 2) | 0]), count: 1, speed: 0.08, life: [0.4, 0.7], size: [0.06, 0.1], color: ['#ffffff', p.color || '#8af0ff'] }); });
  },
  // หน้ากากเทวา: หน้ากากขาวขลิบทอง ปีกเล็กสองข้าง อัญมณีฟ้า
  seraphMask(rig, p) {
    const g = group(rig.head, 0, 0.2, 0.25);
    mesh(maskGeo(), T('#ffffff', { emissive: '#5a5a7a' }), g);
    mesh(torus(0.02, 0.005, 4, 12), metal('#ffd86a', 0.5), g, 0, 0.045, 0.012);
    mesh(oct(0.018), G('#8af0ff', 2), g, 0, 0.045, 0.016, { noOutline: true });
    const gold = metal('#ffd86a', 0.5), white = T('#ffffff', { emissive: '#5a5a7a' });
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) featherXY(g, s * 0.16, 0.035, -0.035 - k * 0.004, s > 0 ? 0.35 + k * 0.32 : Math.PI - 0.35 - k * 0.32, 0.09 + (k === 1 ? 0.025 : 0), 0.024, k % 2 ? gold : white, 0.008);
    bake(g);
  },
});

/* ---------- หลัง ---------- */
Object.assign(BACK, {
  // หางหงส์เพลิง: ขนหางยาวเจ็ดเส้นไล่สีทองถึงแดง ปลายเป็นดวงตาขนนกทอง พลิ้วเป็นคลื่น มีเปลวไฟที่ปลาย
  phoenixTail(rig, p, rt) {
    const root = group(rig.torso, 0, 0.06, -0.19);
    const mats = ['#ffe08a', '#ffc24a', '#ff9a3a', '#ff6a2a', '#ff4a1a', '#e8341a', '#c8241a'].map((c, i) => G(c, 1.0 + i * 0.08));
    const rach = metal('#ffd27a', 0.4), gold = G('#ffcf4a', 1.6), eye = G('#d81a1a', 1.8);
    const plumes = [], ends = [];
    for (let k = 0; k < 7; k++) {
      const a = (k - 3) * 0.24, base = group(root, Math.sin(a) * 0.06, 0, 0, [0.35, a, 0]);
      const segs = chain(base, 7, 0.11, (sg, i) => { mesh(cyl(0.006, 0.006, 0.11, 4), rach, sg, 0, -0.055, 0); mesh(sph(1, 8, 6), mats[i], sg, 0, -0.055, 0, { s: [0.028 + i * 0.006, 0.066, 0.008] }); bake(sg); });
      const last = segs[segs.length - 1];
      const e = group(last, 0, -0.16, 0);
      mesh(sph(1, 12, 8), gold, e, 0, 0, 0, { s: [0.075, 0.1, 0.012] });
      for (const z of [-0.008, 0.008]) mesh(sph(1, 10, 8), eye, e, 0, 0.005, z, { s: [0.035, 0.045, 0.006], noOutline: true });
      bake(e);
      const f = spriteOf(spriteTex('flame'), '#ffb347', 1, 0.8); f.scale.set(0.12, 0.2, 1); f.position.y = -0.08; e.add(f);
      plumes.push(segs); ends.push({ e, f });
    }
    rt.on(({ t, dt, walk }) => {
      plumes.forEach((segs, k) => segs.forEach((sg, i) => { sg.rotation.x = 0.1 + Math.sin(t * 1.6 - i * 0.5 + k) * (0.07 + walk * 0.06) + walk * 0.08; sg.rotation.z = Math.sin(t * 1.2 - i * 0.4 + k * 1.3) * 0.05; }));
      ends.forEach(({ f }, i) => { f.scale.y = 0.18 + Math.sin(t * 12 + i) * 0.04; });
      if (Math.random() < dt * 14) { const k = ends[(Math.random() * ends.length) | 0]; rt.ps('flame').emit({ pos: rt.worldPos(k.e), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.3, 0.7), rand(-0.1, 0.1)), life: [0.35, 0.6], size: [0.1, 0.16], sizeEnd: 0.2, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); }
    });
  },
  // ดาบอสูรลอยหกเล่ม: ใบดาบดำคมแดงเรืองกางเป็นพัดหลังตัว ลอยขึ้นลง วงอักขระเลือดหมุนตรงกลาง
  bloodBlades(rig, p, rt) {
    const g = group(rig.torso, 0, 0.42, -0.4);
    const steel = metal('#2c2434', 0.15), edge = G('#ff2a3a', 1.8), dark = metal('#3a2a3a', 0.1);
    const jag = (sh) => { sh.moveTo(-0.045, 0); sh.lineTo(-0.05, 0.12); sh.lineTo(-0.035, 0.14); sh.lineTo(-0.048, 0.28); sh.lineTo(0, 0.48); sh.lineTo(0.048, 0.28); sh.lineTo(0.036, 0.2); sh.lineTo(0.05, 0.18); sh.lineTo(0.045, 0); };
    const blades = [];
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.36, sw = group(g, Math.sin(a) * 0.4, Math.cos(a) * 0.4 - 0.32, 0, [0, 0, -a]);
      mesh(extrude(jag, 0.018, 0.005), steel, sw);
      mesh(extrude((sh) => { sh.moveTo(-0.006, 0.02); sh.lineTo(0, 0.44); sh.lineTo(0.006, 0.02); }, 0.024, 0), edge, sw, 0, 0, 0, { noOutline: true });
      mesh(box(0.14, 0.025, 0.035), dark, sw, 0, -0.005, 0);
      mesh(cyl(0.013, 0.013, 0.09, 6), T('#3a0a14'), sw, 0, -0.06, 0);
      mesh(oct(0.02), G('#ff1a2a', 2), sw, 0, -0.005, 0.02, { noOutline: true });
      bake(sw); blades.push(sw);
    }
    const sig = mesh(new THREE.PlaneGeometry(0.62, 0.62), unlit('#ff2a3a', { map: TX.runeCircle('hex'), opacity: 0.7, add: true }), g, 0, -0.32, -0.02, { keep: true, shadow: false });
    mesh(torus(0.2, 0.008, 4, 36), G('#ff2a3a', 1.8), g, 0, -0.32, -0.015, { noOutline: true });
    glowSprite(g, '#ff1a2a', 0.8, 0.2, 0, -0.2, -0.03);
    rt.on(({ t, dt }) => {
      g.rotation.z = Math.sin(t * 0.6) * 0.08; sig.rotation.z = t * 0.6;
      blades.forEach((sw, i) => { sw.position.z = Math.sin(t * 2 + i) * 0.035; });
      if (Math.random() < dt * 8) rt.ps('dot').emit({ pos: blades[(Math.random() * 6) | 0].localToWorld(V(0, 0.46, 0)), count: 1, vel: () => V(0, rand(0.2, 0.4), 0), life: [0.4, 0.8], size: [0.03, 0.06], color: ['#ff6a7a', '#ff1a3a'] });
    });
  },
  // รัศมีสุริยมณฑล: จานแสงอาทิตย์ใหญ่หลังตัว ลำแสงสองชั้นหมุนสวน วงทองประดับอัญมณี วงอักขระ
  mandorla(rig, p, rt) {
    const g = group(rig.torso, 0, 0.5, -0.36);
    const rays = mesh(new THREE.PlaneGeometry(1.55, 1.55), unlit(p.color || '#ffc040', { map: sunburstTex(), opacity: 0.38, add: true }), g, 0, 0, -0.03, { keep: true, shadow: false });
    const rays2 = mesh(new THREE.PlaneGeometry(1.05, 1.05), unlit('#ffd86a', { map: sunburstTex(), opacity: 0.25, add: true }), g, 0, 0, -0.025, { keep: true, shadow: false });
    const rune = mesh(new THREE.PlaneGeometry(0.95, 0.95), unlit('#ffd86a', { map: TX.runeCircle('star'), opacity: 0.45, add: true }), g, 0, 0, -0.02, { keep: true, shadow: false });
    const ring = group(g);
    mesh(torus(0.5, 0.016, 6, 64), G('#ffd86a', 1.7), ring, 0, 0, 0, { noOutline: true });
    mesh(torus(0.57, 0.006, 4, 64), G('#ffffff', 1.8), ring, 0, 0, 0, { noOutline: true });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; mesh(oct(i % 3 ? 0.012 : 0.02), G(i % 3 ? '#ffffff' : '#8af0ff', 2), ring, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.004, { noOutline: true }); }
    glowSprite(g, '#ffd86a', 1.2, 0.14);
    rt.on(({ t, dt }) => {
      rays.rotation.z = t * 0.15; rays2.rotation.z = -t * 0.25; rune.rotation.z = t * 0.3; ring.rotation.z = -t * 0.08; g.position.y = 0.5 + Math.sin(t * 1.2) * 0.02;
      if (Math.random() < dt * 8) { const a = Math.random() * Math.PI * 2; rt.ps('star').emit({ pos: g.localToWorld(V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0)), count: 1, speed: 0.1, life: [0.5, 0.9], size: [0.08, 0.14], color: ['#ffffff', '#ffe08a'] }); }
    });
  },
  // ผ้าคลุมเนบิวลา: ผ้าคลุมที่มีห้วงดาวเลื่อนไหลอยู่บนผืนผ้า ขอบทองเรือง ดาวร่วงจากชายผ้า
  nebulaCape(rig, p, rt) {
    const g = group(rig.torso, 0, 0.37, -0.03), len = p.len || 0.74;
    const sf = starfieldTex().clone(); sf.needsUpdate = true; sf.isOwned = true; sf.repeat.set(2.5, 2);
    const outer = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: sf, emissive: new THREE.Color('#ffffff'), emissiveMap: sf, emissiveIntensity: 0.75, gradientMap: gradientMap() });
    mesh(new THREE.CylinderGeometry(0.17, 0.4, len, 24, 4, true, Math.PI - 1.25, 2.5), outer, g, 0, -len / 2, -0.02, { noOutline: true });
    mesh(new THREE.CylinderGeometry(0.165, 0.392, len * 0.99, 24, 4, true, Math.PI - 1.25, 2.5), toon(p.lining || '#2a1a5a', { side: THREE.BackSide }), g, 0, -len / 2, -0.02, { noOutline: true });
    mesh(new THREE.TorusGeometry(0.4, 0.012, 4, 36, 2.5), G('#ffe08a', 1.7), g, 0, -len, -0.02, { r: [Math.PI / 2, 0, -Math.PI / 2 - 1.25], noOutline: true });
    const clasp = group(rig.torso, 0, 0.385, 0);
    mesh(torus(0.14, 0.03, 8, 18), metal('#ffe08a', 0.4), clasp, 0, 0, 0, { r: [Math.PI / 2, 0, 0] });
    mesh(extrude((sh) => starShape(sh, 0.045, 0.02), 0.014, 0.004), G('#8af0ff', 2), clasp, 0, -0.01, 0.15);
    bake(clasp);
    const q = V();
    rt.on(({ t, dt, walk }) => {
      g.rotation.x = 0.07 + 0.42 * walk + Math.sin(t * 2.1) * 0.03 + Math.sin(t * 7) * 0.04 * walk;
      sf.offset.x = t * 0.02;
      if (Math.random() < dt * 10) { const th = Math.PI - 1.2 + Math.random() * 2.4; q.set(Math.sin(th) * 0.4, -len, Math.cos(th) * 0.4 - 0.02); rt.ps('star').emit({ pos: g.localToWorld(q).clone(), count: 1, vel: () => V(rand(-0.05, 0.05), rand(-0.2, -0.05), rand(-0.05, 0.05)), life: [0.6, 1.0], size: [0.06, 0.11], color: ['#ffffff', '#9ad8ff', '#ff9ad8'] }); }
    });
  },
});

/* ---------- ออร่า ---------- */
Object.assign(AURA, {
  // วงเพลิงนรกา: วงอักขระไฟบนพื้น เสาเพลิงแปดต้นหมุนรอบตัว ประกายไฟลอยขึ้น
  inferno(rig, p, rt) {
    const disc = mesh(new THREE.PlaneGeometry(1.95, 1.95), unlit('#ff6a1a', { map: TX.runeCircle('star'), opacity: 0.85, add: true }), rig.root, 0, 0.025, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    const glow = mesh(new THREE.PlaneGeometry(2.6, 2.6), unlit('#ff3a0a', { map: TX.softDot(), opacity: 0.35, add: true }), rig.root, 0, 0.02, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    disc.renderOrder = glow.renderOrder = 2;
    auraEmitter(rig, rt, 80, (b, c) => { const k = (Math.random() * 8) | 0, a = (k / 8) * Math.PI * 2 + c.t * 0.4; rt.ps('flame').emit({ pos: V(b.x + Math.cos(a) * 0.85, b.y + 0.05, b.z + Math.sin(a) * 0.85), count: 1, vel: () => V(rand(-0.06, 0.06), rand(1.2, 2.0), rand(-0.06, 0.06)), drag: 0.5, life: [0.45, 0.75], size: [0.2, 0.34], sizeEnd: 0.15, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#a8180a' }); });
    auraEmitter(rig, rt, 30, (b) => rt.ps('flame').emit({ pos: ringPos(b, 0.45), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.6, 1.1), rand(-0.1, 0.1)), drag: 0.6, life: [0.4, 0.7], size: [0.18, 0.3], sizeEnd: 0.15, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }));
    auraEmitter(rig, rt, 16, (b) => rt.ps('dot').emit({ pos: discPos(b, 0.9, 0.1, 0.5), count: 1, vel: () => V(rand(-0.2, 0.2), rand(1, 2), rand(-0.2, 0.2)), life: [0.7, 1.2], size: [0.04, 0.07], color: ['#ffe8a0', '#ffb347'], colorEnd: '#ff3a1a' }));
    rt.on(({ t }) => { disc.rotation.z = t * 0.5; glow.material.opacity = 0.3 + Math.random() * 0.08; });
  },
  // สังเวียนจันทร์โลหิต: วงอักขระเลือดสองชั้นหมุนสวน จันทร์โลหิตลอยเหนือศีรษะ หมอกเลือด สายฟ้าแดง
  bloodRing(rig, p, rt) {
    const d1 = mesh(new THREE.PlaneGeometry(1.9, 1.9), unlit('#ff1a3a', { map: TX.runeCircle('hex'), opacity: 0.8, add: true }), rig.root, 0, 0.025, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    const d2 = mesh(new THREE.PlaneGeometry(1.15, 1.15), unlit('#ff5a6a', { map: TX.runeCircle('star'), opacity: 0.7, add: true }), rig.root, 0, 0.03, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    d1.renderOrder = d2.renderOrder = 2;
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: bloodMoonTex(), transparent: true, depthWrite: false })); moon.scale.setScalar(0.55); moon.position.set(0, 2.75, -0.15); rig.root.add(moon);
    const bolts = [0, 1].map(() => { const s = boltSprite(rig.root, '#ff3a4a', 0.3, 0.6); s.userData = { t: Math.random(), f: 0 }; return s; });
    auraEmitter(rig, rt, 12, (b) => rt.ps('smoke', NB).emit({ pos: ringPos(b, 0.6, 0.05), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.3, 0.6), rand(-0.1, 0.1)), drag: 0.5, life: [1, 1.5], size: [0.25, 0.4], sizeEnd: 1.8, color: ['#5a0a1a', '#3a0812'], alpha: 0.5 }));
    auraEmitter(rig, rt, 10, (b) => rt.ps('dot').emit({ pos: ringPos(b, 0.75, rand(0.05, 0.6)), count: 1, vel: () => V(0, rand(0.3, 0.6), 0), life: [0.6, 1], size: [0.04, 0.07], color: ['#ff6a7a', '#ff1a3a'] }));
    rt.on(({ t, dt }) => {
      d1.rotation.z = t * 0.4; d2.rotation.z = -t * 0.7; moon.position.y = 2.75 + Math.sin(t * 1.3) * 0.04;
      bolts.forEach((s) => { const u = s.userData; u.t -= dt; if (u.t <= 0) { u.t = 0.6 + Math.random() * 1.0; u.f = 0.12; const a = Math.random() * Math.PI * 2; s.position.set(Math.cos(a) * 0.65, 0.35, Math.sin(a) * 0.65); } u.f = Math.max(0, u.f - dt); s.material.opacity = u.f > 0 ? 0.7 + Math.random() * 0.3 : 0; });
    });
  },
  // กลุ่มดาวนิรันดร์: ดาวเก้าดวงโคจรเป็นเกลียวรอบตัว เชื่อมกันด้วยเส้นแสง วงแผนที่ดาวบนพื้น
  constellation(rig, p, rt) {
    const g = group(rig.root), n = 9, cols = ['#ffffff', '#9ad8ff', '#ffe08a', '#ff9ad8'];
    const stars = Array.from({ length: n }, (_, i) => { const s = spriteOf(TX.star4(), cols[i % 4], 0.2, 0.95); s.userData = { a: (i / n) * Math.PI * 2, r: 0.62 + (i % 3) * 0.1, y: 0.25 + (i / n) * 1.9, sp: 0.35 + (i % 2) * 0.15 }; g.add(s); return s; });
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: lin('#9ad8ff'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false; g.add(line);
    const map = mesh(new THREE.PlaneGeometry(1.8, 1.8), unlit('#8ad8ff', { map: TX.runeCircle('hex'), opacity: 0.45, add: true }), rig.root, 0, 0.025, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    map.renderOrder = 2;
    rt.on(({ t, dt }) => {
      const pos = lineGeo.attributes.position;
      stars.forEach((s, i) => { const u = s.userData, a = u.a + t * u.sp; s.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 1.2 + i) * 0.06, Math.sin(a) * u.r); s.scale.setScalar(0.14 + Math.abs(Math.sin(t * 2.5 + i * 1.3)) * 0.1); s.material.rotation = t * 0.4; pos.setXYZ(i, s.position.x, s.position.y, s.position.z); });
      pos.needsUpdate = true; map.rotation.z = t * 0.2;
      if (Math.random() < dt * 6) rt.ps('star').emit({ pos: rt.worldPos(stars[(Math.random() * n) | 0]), count: 1, speed: 0.08, life: [0.4, 0.8], size: [0.06, 0.1], color: cols });
    });
  },
  // ลำแสงสวรรค์: ลำแสงทองสาดลงมาจากฟ้า ขนนกแสงโปรยลง วงอักขระทองบนพื้น
  heavenLight(rig, p, rt) {
    const vt = TX.vgrad().clone(); vt.needsUpdate = true; vt.isOwned = true; vt.repeat.set(2, 1);
    const beam = mesh(new THREE.CylinderGeometry(0.62, 0.72, 4.2, 32, 1, true), unlit(p.color || '#ffd86a', { map: vt, opacity: 0.22, add: true }), rig.root, 0, 2.1, 0, { keep: true, shadow: false });
    const beam2 = mesh(new THREE.CylinderGeometry(0.38, 0.45, 4.2, 24, 1, true), unlit('#ffc84a', { map: vt, opacity: 0.16, add: true }), rig.root, 0, 2.1, 0, { keep: true, shadow: false });
    const ring = mesh(new THREE.PlaneGeometry(1.8, 1.8), unlit('#ffe08a', { map: TX.runeCircle('star'), opacity: 0.75, add: true }), rig.root, 0, 0.025, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    beam.renderOrder = beam2.renderOrder = 3; ring.renderOrder = 2;
    auraEmitter(rig, rt, 4, (b) => rt.ps('feather', NB).emit({ pos: discPos(b, 0.6, 2.4, 3.0), count: 1, vel: () => V(rand(-0.08, 0.08), rand(-0.45, -0.3), rand(-0.08, 0.08)), life: [4, 5], size: [0.12, 0.18], sizeEnd: 0.8, color: ['#ffffff', '#fff2c8'] }));
    auraEmitter(rig, rt, 14, (b) => rt.ps('star').emit({ pos: discPos(b, 0.55, 0.1, 1.2), count: 1, vel: () => V(0, rand(0.3, 0.7), 0), life: [0.8, 1.4], size: [0.06, 0.12], color: ['#ffffff', '#ffe08a'] }));
    rt.on(({ t }) => { vt.offset.x = t * 0.05; ring.rotation.z = t * 0.3; beam.material.opacity = 0.19 + Math.sin(t * 2) * 0.04; });
  },
});

/* ---------- ผู้ติดตาม ---------- */
Object.assign(PET, {
  // ลูกหงส์เพลิง: ตัวเรืองแสงส้มแดง หงอนขนเพลิง หางยาวปลายไฟ ปีกเล็กกระพือ ทิ้งเปลวไฟ
  phoenixChick(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.06, speed: 2.2 });
    const b = group(g), body = G('#ff7a2a', 0.8), gold = G('#ffd27a', 1.0), red = G('#ff3a1a', 1.4);
    mesh(sph(0.09, 14, 10), body, b, 0, 0, 0, { s: [1, 0.95, 1.05] });
    mesh(sph(0.065, 12, 8), gold, b, 0, -0.01, 0.045, { s: [0.9, 1, 0.7] });
    mesh(sph(0.072, 14, 10), body, b, 0, 0.1, 0.04);
    mesh(cone(0.018, 0.045, 6), metal('#ffcf4a', 0.4), b, 0, 0.09, 0.115, { r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) { mesh(sph(0.014, 8, 6), T('#1e1420'), b, s * 0.032, 0.115, 0.098); mesh(sph(0.005, 6, 4), T('#ffffff'), b, s * 0.028, 0.121, 0.11, { noOutline: true }); }
    for (let k = 0; k < 3; k++) mesh(featherGeo, k === 1 ? red : gold, b, (k - 1) * 0.02, 0.16, 0.02, { s: [0.014, 0.05 + (k === 1 ? 0.02 : 0), 0.006], r: [Math.PI - 0.5, 0, (k - 1) * 0.4] });
    for (let k = 0; k < 3; k++) mesh(featherGeo, k === 1 ? red : body, b, (k - 1) * 0.02, -0.02, -0.08, { s: [0.016, 0.1 + (k === 1 ? 0.04 : 0), 0.006], r: [0.9, 0, (k - 1) * 0.35] });
    bake(b);
    const tail = new THREE.Object3D(); tail.position.set(0, -0.1, -0.16); b.add(tail);
    const wings = [-1, 1].map((s) => { const pv = group(g, s * 0.08, 0.02, -0.01); mesh(featherGeo, red, pv, 0, 0, 0, { s: [0.02, 0.07, 0.008], r: [0, 0, s * 1.2] }); mesh(featherGeo, gold, pv, 0, 0.01, 0.005, { s: [0.016, 0.055, 0.006], r: [0, 0, s * 0.8] }); return pv; });
    glowSprite(g, '#ff8a2a', 0.45, 0.35);
    rt.on(({ t, dt }) => { wings.forEach((pv, i) => { pv.rotation.z = (i ? -1 : 1) * (Math.sin(t * 16) * 0.5); }); if (Math.random() < dt * 18) rt.ps('flame').emit({ pos: rt.worldPos(tail), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.1, 0.3), rand(-0.05, 0.05)), life: [0.3, 0.5], size: [0.07, 0.11], sizeEnd: 0.2, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); });
  },
  // มังกรเงาโลหิต: มังกรน้อยสีดำแดง ตาเรืองแดง จันทร์เสี้ยวเลือดโคจรรอบตัว
  bloodDrake(rig, p, rt) {
    const g = petRoot(rig, rt), c = '#2a1420', belly = T('#5a1a2a');
    const b = group(g);
    mesh(sph(0.11, 14, 10), T(c), b, 0, 0, 0, { s: [1, 0.95, 1.15] });
    mesh(sph(0.085, 12, 8), belly, b, 0, -0.01, 0.04, { s: [0.9, 1, 0.8] });
    mesh(sph(0.095, 14, 10), T(c), b, 0, 0.12, 0.07);
    mesh(sph(0.055, 10, 8), T(c), b, 0, 0.1, 0.15, { s: [1, 0.8, 1] });
    for (const s of [-1, 1]) { mesh(cone(0.024, 0.09, 6), T('#1a0a10'), b, s * 0.05, 0.22, 0.03, { r: [-0.5, 0, s * -0.35] }); mesh(sph(0.018, 8, 6), G('#ff1a2a', 2.2), b, s * 0.042, 0.14, 0.155, { noOutline: true }); }
    for (let i = 0; i < 4; i++) mesh(cone(0.014, 0.04, 4), G('#ff2a3a', 1.4), b, 0, 0.16 - i * 0.06, 0.02 - i * 0.04, { r: [-0.6, 0, 0], noOutline: true });
    taper(b, bez3(V(0, -0.02, -0.08), V(0, -0.08, -0.18), V(0.06, -0.02, -0.26), V(0.1, 0.04, -0.28), 6), 0.04, 0.008, T(c));
    bake(b);
    const wm = DS('#5a0a1a', { emissive: '#3a0010', emissiveIntensity: 0.6 });
    const wings = [-1, 1].map((s) => { const pv = group(g, s * 0.06, 0.06, -0.04); mesh(shapeGeo((sh) => { sh.moveTo(0, 0); sh.lineTo(0.09, 0.12); sh.quadraticCurveTo(0.14, 0.05, 0.19, 0.02); sh.quadraticCurveTo(0.12, 0, 0.14, -0.07); sh.quadraticCurveTo(0.07, -0.02, 0, -0.03); }), wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true }); return pv; });
    const moon = mesh(extrude((sh) => { sh.absarc(0, 0, 0.045, Math.PI * 0.3, Math.PI * 1.7, false); sh.absarc(0.022, 0, 0.036, Math.PI * 1.55, Math.PI * 0.45, true); }, 0.012, 0.004), G('#ff2a3a', 1.8), g, 0, 0, 0, { noOutline: true });
    glowSprite(g, '#ff1a2a', 0.45, 0.25);
    rt.on(({ t, dt }) => { wings.forEach((pv, i) => { pv.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * 13) * 0.6); }); const a = t * 1.6; moon.position.set(Math.cos(a) * 0.2, 0.05 + Math.sin(t * 2) * 0.03, Math.sin(a) * 0.2); moon.rotation.z = t * 2; if (Math.random() < dt * 6) rt.ps('dot').emit({ pos: rt.worldPos(g), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.4, 0.8], size: [0.03, 0.05], color: ['#ff6a7a', '#ff1a3a'] }); });
  },
  // วาฬดารา: วาฬน้อยหลังเป็นห้วงดาว ว่ายวนรอบตัวกลางอากาศ พ่นละอองดาว ทิ้งเส้นทางดาว
  starWhale(rig, p, rt) {
    const anchor = group(rig.root, 0, 1.75, 0), f = group(anchor);
    const sf = starfieldTex().clone(); sf.needsUpdate = true; sf.isOwned = true; sf.repeat.set(2, 1);
    const top = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: sf, emissive: new THREE.Color('#ffffff'), emissiveMap: sf, emissiveIntensity: 0.8, gradientMap: gradientMap() });
    const body = group(f);
    mesh(sph(0.11, 20, 14), top, body, 0, 0, 0, { s: [0.85, 0.72, 1.8] });
    mesh(sph(0.1, 18, 12), T('#dfe8ff', { emissive: '#3a4a6a' }), body, 0, -0.03, 0.01, { s: [0.76, 0.5, 1.66] });
    for (const s of [-1, 1]) { mesh(sph(0.012, 8, 6), T('#1e1430'), body, s * 0.078, 0.0, 0.12); mesh(sph(0.004, 6, 4), T('#ffffff'), body, s * 0.08, 0.006, 0.128, { noOutline: true }); mesh(sph(0.04, 10, 6), T('#cfdcff', { emissive: '#3a4a6a' }), body, s * 0.1, -0.04, 0.05, { s: [1.4, 0.25, 0.8], r: [0, s * 0.4, s * 0.4] }); }
    bake(body);
    const tail = group(body, 0, 0, -0.2);
    mesh(cyl(0.03, 0.05, 0.08, 10), top, tail, 0, 0, 0.02, { r: [Math.PI / 2, 0, 0] });
    mesh(shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.02, 0.13, 0.08); sh.quadraticCurveTo(0.06, 0.06, 0, 0.04); sh.quadraticCurveTo(-0.06, 0.06, -0.13, 0.08); sh.quadraticCurveTo(-0.08, 0.02, 0, 0); }).rotateX(-Math.PI / 2), toon('#cfdcff', { emissive: '#4a5a8a', side: THREE.DoubleSide }), tail, 0, 0, -0.02, { noOutline: true });
    glowSprite(f, '#9ad8ff', 0.6, 0.25);
    const spout = new THREE.Object3D(); spout.position.set(0, 0.08, 0.06); body.add(spout);
    rt.on(({ t, dt }) => {
      const a = t * 0.45, R = 0.95;
      f.position.set(Math.cos(a) * R, Math.sin(t * 0.9) * 0.1, Math.sin(a) * R); f.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      body.rotation.x = Math.sin(t * 2) * 0.08; tail.rotation.x = Math.sin(t * 2 + 1) * 0.4; sf.offset.x = t * 0.03;
      if (Math.random() < dt * 8) rt.ps('star').emit({ pos: rt.worldPos(tail), count: 1, speed: 0.05, life: [0.6, 1.1], size: [0.05, 0.1], color: ['#ffffff', '#9ad8ff', '#ffe08a'] });
      if ((t % 3) < dt * 1.5) rt.ps('star').emit({ pos: rt.worldPos(spout), count: 10, vel: () => V(rand(-0.15, 0.15), rand(0.5, 0.9), rand(-0.15, 0.15)), gravity: -1.2, life: [0.6, 0.9], size: [0.05, 0.09], color: ['#ffffff', '#9ad8ff'] });
    });
  },
  // ภูตเทวาสุริยะ: ลูกแสงยิ้มแป้น ปีกเล็กสองคู่ วงรัศมีทองหมุนบนหัว ทิ้งประกายดาว
  cherub(rig, p, rt) {
    const g = petRoot(rig, rt, { bob: 0.07, speed: 1.8 });
    mesh(sph(0.08, 16, 12), G('#fff4d0', 1.1), g, 0, 0, 0, { noOutline: true });
    decal(g, 0, 0.0, 0.082, 0.1, petFaceTex('#6a4a2a'));
    const halo = group(g, 0, 0.12, -0.01, [0.3, 0, 0]);
    mesh(torus(0.055, 0.009, 6, 24), G('#ffe08a', 1.8), halo, 0, 0, 0, { r: [Math.PI / 2, 0, 0], noOutline: true });
    const white = T('#ffffff', { emissive: '#5a5a7a' }), gold = metal('#ffe08a', 0.5);
    const wings = [];
    for (const [y, sc] of [[0.03, 1], [-0.04, 0.7]]) for (const s of [-1, 1]) { const pv = group(g, s * 0.07, y, -0.03); for (let k = 0; k < 3; k++) mesh(featherGeo, k === 1 ? gold : white, pv, 0, 0, -k * 0.004, { s: [0.016 * sc, (0.05 + k * 0.012) * sc, 0.006], r: [0, 0, s * (1.2 + k * 0.3) * (y < 0 ? 1.4 : 1)] }); wings.push({ pv, s }); }
    glowSprite(g, '#ffe9a8', 0.4, 0.4);
    rt.on(({ t, dt }) => { wings.forEach(({ pv, s }, i) => { pv.rotation.y = s * (0.2 + Math.sin(t * 14 + i) * 0.5); }); halo.rotation.y = t * 1.2; if (Math.random() < dt * 8) rt.ps('star').emit({ pos: rt.worldPos(g).add(V(rand(-0.06, 0.06), rand(-0.06, 0.06), -0.05)), count: 1, vel: () => V(0, rand(-0.15, -0.05), 0), life: [0.5, 0.9], size: [0.05, 0.09], color: ['#ffffff', '#ffe08a'] }); });
  },
});

Object.assign(PET, COSTUME_PETS);

/* ================= API ================= */
export const SLOT_INFO = {
  wings: { name: 'ปีก', en: 'Wings' }, outfit: { name: 'ชุด', en: 'Outfit' }, head: { name: 'หมวก', en: 'Headgear' }, face: { name: 'หน้า', en: 'Face' },
  back: { name: 'หลัง/หาง', en: 'Back' }, weapon: { name: 'อาวุธ', en: 'Weapon' }, aura: { name: 'ออร่า', en: 'Aura' }, pet: { name: 'ผู้ติดตาม', en: 'Companion' },
};
const BUILD = {
  wings: (rig, it, rt, L) => WING_BUILDERS[it.kind](rig, it.p || {}, rt, L),
  head: (rig, it, rt, L) => HEAD[it.kind](rig, it.p || {}, rt, L),
  face: (rig, it, rt, L) => FACE[it.kind](rig, it.p || {}, rt, L),
  back: (rig, it, rt, L) => BACK[it.kind](rig, it.p || {}, rt, L),
  weapon: (rig, it, rt, L) => WEAPON[it.kind](rig, it.p || {}, rt, L),
  aura: (rig, it, rt, L) => AURA[it.kind](rig, it.p || {}, rt, L),
  pet: (rig, it, rt, L) => PET[it.kind](rig, it.p || {}, rt, L),
  outfit: (rig, it, rt, L) => outfitParts(rig, it.p || {}, rt, L),
};
const DICT = { wings: WING_BUILDERS, head: HEAD, face: FACE, back: BACK, weapon: WEAPON, aura: AURA, pet: PET };
export const hasBuilder = (it) => it.slot === 'outfit' || !!(DICT[it.slot] && DICT[it.slot][it.kind]);

// ปรับหน้าตาพื้นฐานก่อนสร้างตัวละคร (สีชุด · ซ่อนชุดอาชีพ/หมวกอาชีพ/อาวุธเดิม)
export function costumeLook(base, items = {}) {
  const L = { ...base, equipment: { ...(base.equipment || {}) } };
  if (items.outfit) for (const slot of ['body','shoes','accessory','garment']) delete L.equipment[slot];
  if (items.weapon) delete L.equipment.weapon;
  if (items.head) delete L.equipment.head;
  if (items.wings || items.back) delete L.equipment.garment;
  if (items.weapon?.wtype === 'dual') delete L.equipment.shield;
  const o = items.outfit;
  if (o) { Object.assign(L, (o.p && o.p.look) || {}); L.jobGear = 'none'; if (L.accessory === 'quiver' || L.accessory === 'backpack') L.accessory = 'none'; if (!(o.p && o.p.look && 'scarf' in o.p.look)) L.scarf = null; L.cape = null; }
  if (items.weapon) L.weapon = 'none';
  if (items.head) { L.hideJobHat = true; L.hideAhoge = true; if (items.head.tight) L.hatTight = true; }
  if ((items.wings || items.back) && (L.accessory === 'backpack' || L.accessory === 'quiver')) L.accessory = 'none';
  // ในเกม (v0.9): แฟชั่นทับอุปกรณ์จริง → ซ่อนหมวก/ผ้าคลุม/โล่ที่จะทะลุกัน
  if (items.head) L.headgear = null;
  if (items.wings || items.back) L.cape = null;
  if (items.weapon && items.weapon.wtype === 'dual') L.shield = null;
  return L;
}

const ORDER = ['outfit', 'wings', 'back', 'head', 'face', 'weapon', 'aura', 'pet'];
export function wearCostume(view, items = {}, { world, look = {}, rt = null } = {}) {
  rt = rt || new Runtime(world || view.root);
  const rig = { root: view.root, body: view.body, torso: view.torso, head: view.head, arms: view.arms, legs: view.legs };
  for (const slot of ORDER) {
    const it = items[slot];
    if (!it) continue;
    try { BUILD[slot](rig, it, rt, look); } catch (e) { console.warn('สร้างชิ้นแฟชั่นไม่สำเร็จ', it.id, e); }
  }
  return rt;
}

// โครงเปล่าสำหรับถ่ายภาพไอคอนเฉพาะชิ้น (ตำแหน่งเดียวกับ CharacterView)
export function makeRig() {
  const root = new THREE.Group(), body = group(root); body.scale.setScalar(1.3);
  const torso = group(body, 0, 0.36, 0), head = group(torso, 0, 0.5, 0);
  const arms = [-1, 1].map((s) => group(torso, s * 0.19, 0.33, 0));
  arms[0].rotation.z = -0.08; arms[1].rotation.z = 0.08;
  const legs = [-1, 1].map((s) => group(body, s * 0.085, 0.36, 0));
  return { root, body, torso, head, arms, legs };
}
export function buildOnRig(rig, item, rt, look = {}) { BUILD[item.slot](rig, item, rt, look); }
export { Runtime as CostumeRuntime };
