// สัตว์เลี้ยงช่วยเก็บของ (v0.13 preview) — สร้างโมเดลจากโค้ดทั้งหมด สไตล์ toon + เส้นขอบ เหมือนตัวละครในเกม
// ใช้:  const pet = new PetView('hamster', { world: scene });  scene.add(pet.root);
//       ทุกเฟรม pet.update(dt, { moving, speed })  ·  pet.pick() = ท่าเก็บของ  ·  pet.cheer() = ท่าดีใจ
//       pet.load = 0..1 (ของเต็มตัวแค่ไหน) · pet.mouth = จุดที่ของลอยเข้าไป · pet.range = รัศมี (หน่วยโลก ใช้กับเอฟเฟกต์)
import { THREE } from './three.js';
import { toon, bake, addOutline, gradientMap } from './Toon.js';
import { shadeHex, blobShadowTexture } from './Textures.js';
import * as TX from './FxTextures.js';
import { Particles } from './SkillFX.js';
import { PETS, PET_EGGS } from '../data/pets.js';

/* ================= ตัวช่วยพื้นฐาน ================= */
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
const PI = Math.PI;
const T = (c, o) => toon(c, o);
const G = (c, i = 1, o = {}) => toon(c, { emissive: c, emissiveIntensity: i, ...o });
const DS = (c, o = {}) => toon(c, { side: THREE.DoubleSide, ...o });
const metal = (c, glow = 0) => T(c, { emissive: shadeHex(c, -0.75), emissiveIntensity: 1 + glow });
const TM = (c, map, o = {}) => new THREE.MeshToonMaterial({ color: lin(c), map, gradientMap: gradientMap(), ...o });
const unlit = (color, { map = null, opacity = 1, add = false, side = THREE.DoubleSide } = {}) =>
  new THREE.MeshBasicMaterial({ color: lin(color), map, transparent: true, opacity, side, depthWrite: !add && opacity >= 1, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending });
const WHITE = new THREE.MeshBasicMaterial({ color: '#ffffff' });

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
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const sph = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt, rb, h, n = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, a = 8, b = 24, arc = PI * 2) => new THREE.TorusGeometry(r, t, a, b, arc);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);
const dodeca = (r) => { const g = new THREE.SphereGeometry(r, 7, 5); g.rotateY(0.4); g.rotateX(0.3); return g; };   // หินโลว์โพลีแบบผิวเรียบ (เส้นขอบสวยกว่าทรงเหลี่ยม)
const bez = (a, b, c, n = 8) => new THREE.QuadraticBezierCurve3(a, b, c).getPoints(n);
const bez3 = (a, b, c, d, n = 10) => new THREE.CubicBezierCurve3(a, b, c, d).getPoints(n);

// ท่อเรียว (หาง เขา หนวด) — ต่อทรงกระบอกตามจุด
function taper(parent, pts, r0, r1, mat, { cap = true, seg = 8 } = {}) {
  const n = pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1];
    const ra = r0 + (r1 - r0) * (i / n), rb = r0 + (r1 - r0) * ((i + 1) / n);
    const len = Math.max(1e-4, a.distanceTo(b));
    const geo = cap && i === n - 1 ? new THREE.ConeGeometry(ra, len, seg) : new THREE.CylinderGeometry(rb, ra, len, seg);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; parent.add(m);
    if (i > 0) { const j = new THREE.Mesh(sph(ra * 1.02, seg, 6), mat); j.position.copy(a); j.castShadow = true; parent.add(j); }
  }
}

// แผ่นรูปทรง 2 มิติ (ปีก ครีบ) — UV ยืดเต็มกรอบ
function shapeGeo(draw) {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ShapeGeometry(sh, 14);
  g.computeBoundingBox();
  const bb = g.boundingBox, pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1));
  return g;
}
const starShape = (sh, r1, r2, n = 5, rot = PI / 2) => {
  for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
};
const extrude = (draw, depth = 0.02, bevel = 0.006) => {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); return g;
};

/* ---------- เท็กซ์เจอร์วาดด้วย Canvas ---------- */
const texCache = new Map();
function ctex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
const radial = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
// สุ่มแบบกำหนดเมล็ด (ลายเหมือนเดิมทุกครั้ง)
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

const heartTex = () => ctex('heart', 64, 64, (g, s) => {
  const c = s / 2; g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(c, s * 0.82); g.bezierCurveTo(s * 0.05, s * 0.45, s * 0.2, s * 0.08, c, s * 0.3); g.bezierCurveTo(s * 0.8, s * 0.08, s * 0.95, s * 0.45, c, s * 0.82); g.fill();
});
const coinTex = () => ctex('coin', 64, 64, (g, s) => {
  const c = s / 2; g.fillStyle = '#fff'; g.beginPath(); g.arc(c, c, s * 0.42, 0, PI * 2); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, s * 0.3, 0, PI * 2); g.stroke(); g.fillRect(c - 2, c - 10, 4, 20);
});

// ลายทางช้างเผือกของวาฬดวงดาว
const galaxyTex = () => ctex('galaxy', 512, 256, (g, w, h) => {
  const r = seeded(7);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#141a52'); gr.addColorStop(0.45, '#26308a'); gr.addColorStop(1, '#3a54b8');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = r() * w, y = r() * h * 0.8, rr = 30 + r() * 70, col = ['rgba(170,90,255,', 'rgba(80,220,255,', 'rgba(255,120,210,'][i % 3];
    g.fillStyle = radial(g, x, y, rr, [[0, col + '0.45)'], [1, col + '0)']]); g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 320; i++) {
    const x = r() * w, y = r() * h, s = r() < 0.08 ? 2.2 : r() * 1.3 + 0.4;
    g.fillStyle = r() < 0.2 ? '#fff2b0' : '#ffffff'; g.globalAlpha = 0.5 + r() * 0.5;
    g.beginPath(); g.arc(x, y, s, 0, PI * 2); g.fill();
  }
  g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) { const x = r() * w, y = r() * h * 0.7, k = 5 + r() * 4; g.beginPath(); g.moveTo(x - k, y); g.lineTo(x + k, y); g.moveTo(x, y - k); g.lineTo(x, y + k); g.stroke(); }
});
// ท้องวาฬ: ร่องตามยาว
const bellyTex = () => ctex('wbelly', 256, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,130,220,0.35)'; g.lineWidth = 3;
  for (let x = 6; x < w; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
});
// เกล็ดทองของกิเลน
const qilinTex = () => ctex('qilin', 256, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(232,170,40,0.85)'; g.lineWidth = 2.2;
  for (let y = 10, row = 0; y < h + 10; y += 13, row++) for (let x = (row % 2) * 9; x < w + 10; x += 18) { g.beginPath(); g.arc(x, y, 8.5, 0.15 * PI, 0.85 * PI); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.0)';
});

/* ---------- ใบหน้า: ตาโต + แก้มแดง ---------- */
function eyes(P, parent, x, y, z, r, { color = '#1e1420', tilt = 0 } = {}) {
  for (const s of [-1, 1]) {
    const e = group(parent, s * x, y, z);
    e.rotation.y = s * tilt;
    mesh(sph(r, 12, 10), T(color), e, 0, 0, 0, { s: [1, 1.18, 0.55], keep: true, noOutline: true, shadow: false });
    mesh(sph(r * 0.36, 8, 6), WHITE, e, -r * 0.28, r * 0.38, r * 0.4, { keep: true, noOutline: true, shadow: false });
    mesh(sph(r * 0.16, 6, 4), WHITE, e, r * 0.3, -r * 0.3, r * 0.42, { keep: true, noOutline: true, shadow: false });
    P.eyes.push(e);
  }
}
const BLUSH = () => toon('#ff8aa8', { transparent: true, opacity: 0.55 });
function blush(parent, x, y, z, r) {
  for (const s of [-1, 1]) mesh(sph(r, 10, 6), BLUSH(), parent, s * x, y, z, { s: [1.3, 0.7, 0.4], keep: true, noOutline: true, shadow: false });
}
const glowSprite = (parent, color, size, opacity = 0.7, x = 0, y = 0, z = 0) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
};
// จุดบนผิวทรงรี (center, รัศมี 3 แกน, ทิศ)
const onEllipsoid = (c, rx, ry, rz, dx, dy, dz) => { const v = V(dx, dy, dz).normalize(); return V(c.x + v.x * rx, c.y + v.y * ry, c.z + v.z * rz); };
// ขาที่หมุนจากสะโพก
const legs4 = (parent, xs, y, zs, build) => [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => {
  const l = group(parent, sx * xs, y, sz * zs); build(l, sx, sz); bake(l); return l;
});

/* ================= สัตว์เลี้ยงแต่ละตัว ================= */
const BUILD = {
  /* ---------- ธรรมดา: แฮมสเตอร์แก้มตุ่ย ---------- */
  hamster(P) {
    const c = '#eab47a', cream = '#fff3df', pink = '#ffb4b8';
    const m = group(P.body);
    const b = group(m, 0, 0.2, 0);
    mesh(sph(0.2, 20, 14), T(c), b, 0, 0, 0, { s: [1, 0.92, 1.04] });
    mesh(sph(0.16, 16, 12), T(cream), b, 0, -0.045, 0.075, { s: [0.92, 0.85, 0.78] });
    mesh(sph(0.15, 14, 10), T(shadeHex(c, -0.14)), b, 0, 0.085, -0.06, { s: [0.92, 0.7, 1] });
    for (const s of [-1, 1]) {
      mesh(sph(0.056, 12, 8), T(c), b, s * 0.12, 0.155, -0.01, { s: [1, 1, 0.5], r: [0, 0, -s * 0.3] });
      mesh(sph(0.036, 10, 8), T(pink), b, s * 0.12, 0.155, 0.012, { s: [1, 1, 0.35], r: [0, 0, -s * 0.3] });
      mesh(sph(0.036, 10, 8), T(pink), b, s * 0.055, -0.1, 0.17, { s: [1, 0.8, 1] });
    }
    mesh(sph(0.022, 8, 6), T('#ff8a9a'), b, 0, 0.022, 0.2);
    mesh(box(0.026, 0.022, 0.01), T('#ffffff'), b, 0, -0.005, 0.193);
    mesh(sph(0.032, 8, 6), T(c), b, 0, -0.06, -0.2);
    bake(b);
    eyes(P, b, 0.075, 0.06, 0.172, 0.029);
    blush(b, 0.13, 0.0, 0.158, 0.03);
    const cheeks = [-1, 1].map((s) => { const ch = mesh(sph(0.058, 14, 10), T(cream), b, s * 0.13, -0.03, 0.105, { keep: true }); addOutline(ch); return ch; });
    const feet = [-1, 1].map((s) => { const f = group(m, s * 0.1, 0.03, 0.02); mesh(sph(0.045, 10, 8), T(pink), f, 0, 0, 0.02, { s: [1, 0.6, 1.4] }); bake(f); return f; });
    P.on(({ t, run, ph, pk, load }) => {
      m.position.y = Math.abs(Math.sin(ph)) * 0.06 * run;
      const br = Math.sin(t * 3) * 0.018 * (1 - run);
      b.scale.set(1 + br, 1 - br, 1);
      m.rotation.x = 0.12 * run + pk * 0.45;
      feet.forEach((f, i) => { const a = ph + i * PI; f.position.z = 0.02 + Math.sin(a) * 0.06 * run; f.position.y = 0.03 + Math.max(0, Math.sin(a)) * 0.03 * run; });
      const puff = 1 + load * 0.5 + pk * 0.25;
      cheeks.forEach((ch) => ch.scale.setScalar(puff));
    });
    return { size: 0.42, shadow: 0.55, mouth: group(b, 0, 0, 0.17) };
  },

  /* ---------- ธรรมดา: กระรอกกอดลูกโอ๊ค ---------- */
  squirrel(P) {
    const c = '#d9803e', cream = '#ffe9cc', dark = '#8a4a22';
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.12, 16, 12), T(c), b, 0, 0.17, -0.01, { s: [0.92, 1.1, 1] });
    mesh(sph(0.09, 14, 10), T(cream), b, 0, 0.155, 0.05, { s: [0.85, 1.05, 0.62] });
    for (const s of [-1, 1]) {
      mesh(sph(0.07, 12, 8), T(c), b, s * 0.085, 0.09, -0.03, { s: [0.7, 1, 1.1] });
      mesh(sph(0.04, 10, 8), T(dark), b, s * 0.085, 0.025, 0.03, { s: [0.8, 0.5, 1.5] });
      mesh(sph(0.03, 10, 8), T(c), b, s * 0.05, 0.195, 0.105, { s: [0.9, 0.8, 1.2] });
    }
    bake(b);
    const ac = group(m, 0, 0.17, 0.12);
    mesh(sph(0.045, 12, 10), T('#c88444'), ac, 0, -0.005, 0, { s: [1, 1.18, 1] });
    mesh(sph(0.05, 12, 8), T('#6e4424'), ac, 0, 0.03, 0, { s: [1, 0.55, 1] });
    mesh(cyl(0.006, 0.008, 0.03, 6), T('#5a3a1e'), ac, 0, 0.065, 0);
    bake(ac);
    const h = group(m, 0, 0.33, 0.03);
    mesh(sph(0.105, 16, 12), T(c), h, 0, 0, 0, { s: [1.05, 0.95, 1] });
    mesh(sph(0.065, 12, 10), T(cream), h, 0, -0.035, 0.062, { s: [1.1, 0.8, 0.85] });
    mesh(sph(0.016, 8, 6), T('#3a2016'), h, 0, -0.012, 0.118);
    for (const s of [-1, 1]) {
      mesh(cone(0.035, 0.085, 8), T(c), h, s * 0.06, 0.1, -0.015, { r: [0, 0, -s * 0.25] });
      mesh(cone(0.018, 0.05, 6), T(dark), h, s * 0.072, 0.16, -0.015, { r: [0, 0, -s * 0.35] });
    }
    bake(h);
    eyes(P, h, 0.045, 0.015, 0.09, 0.022);
    blush(h, 0.072, -0.03, 0.075, 0.02);
    const tl = group(m, 0, 0.12, -0.11);
    const pts = bez3(V(0, 0, 0), V(0, 0.12, -0.18), V(0, 0.4, -0.18), V(0, 0.44, 0.0), 9);
    pts.forEach((p, i) => { const k = i / (pts.length - 1); mesh(sph(0.055 + Math.sin(k * PI) * 0.055, 12, 10), T(i >= pts.length - 2 ? cream : i % 3 === 1 ? shadeHex(c, 0.08) : c), tl, p.x, p.y, p.z); });
    bake(tl);
    P.on(({ t, run, ph, pk }) => {
      m.position.y = Math.max(0, Math.sin(ph)) * 0.09 * run;
      m.rotation.x = Math.sin(ph) * 0.12 * run + pk * 0.5;
      tl.rotation.x = Math.sin(t * 2.2) * 0.08 - Math.sin(ph) * 0.25 * run;
      tl.rotation.z = Math.sin(t * 1.6) * 0.06;
      h.rotation.y = Math.sin(t * 0.9) * 0.25 * (1 - run);
      h.rotation.x = pk * 0.3;
      ac.position.y = 0.17 - pk * 0.03;
    });
    return { size: 0.56, shadow: 0.45, mouth: group(ac, 0, 0, 0.03) };
  },

  /* ---------- หายาก: เต่ากระดองหีบสมบัติ ---------- */
  turtle(P) {
    const g = '#7cc86a', wood = '#a8642e', gold = '#ffcf4a';
    const m = group(P.body);
    const W = 0.36, H = 0.15, D = 0.4, by = 0.17;
    const sh = group(m);
    mesh(box(W, H, D), T(wood), sh, 0, by, 0);
    for (const z of [-0.1, 0.1]) mesh(box(W + 0.004, H * 0.92, 0.012), T(shadeHex(wood, -0.28)), sh, 0, by, z);
    mesh(box(W + 0.02, 0.03, D + 0.02), metal(gold), sh, 0, by - H / 2 + 0.012, 0);
    mesh(box(W + 0.02, 0.022, D + 0.02), metal(gold), sh, 0, by + H / 2 - 0.009, 0);
    for (const s of [-1, 1]) mesh(box(0.032, H + 0.012, D + 0.022), metal(gold), sh, s * (W / 2 - 0.06), by, 0);
    mesh(box(W - 0.04, 0.03, D - 0.04), T('#d8e8a0'), sh, 0, by - H / 2 - 0.012, 0);
    mesh(cone(0.035, 0.08, 8), T(g), sh, 0, 0.12, -D / 2 - 0.03, { r: [-PI / 2 - 0.3, 0, 0] });
    bake(sh);
    // สมบัติข้างใน (เห็นตอนเปิดฝา)
    const tr = group(m, 0, by + H / 2, 0);
    for (let i = 0; i < 7; i++) mesh(cyl(0.03, 0.03, 0.01, 12), metal('#ffd84a', 0.3), tr, rand(-0.12, 0.12), 0.006 + i * 0.002, rand(-0.12, 0.12), { r: [rand(-0.2, 0.2), 0, rand(-0.2, 0.2)] });
    mesh(oct(0.035), G('#ff4a7a', 0.8), tr, 0.05, 0.03, 0.02, { s: [1, 1.3, 1] });
    mesh(oct(0.028), G('#4ad8ff', 0.8), tr, -0.06, 0.025, -0.04, { s: [1, 1.3, 1] });
    bake(tr, { outline: false });
    const trGlow = glowSprite(tr, '#ffd36b', 0.55, 0, 0, 0.05, 0);
    // ฝาหีบ (บานพับด้านหลัง)
    const lid = group(m, 0, by + H / 2, -D / 2);
    const dome = (r, w) => { const geo = new THREE.CylinderGeometry(r, r, w, 18, 1, false, 0, PI); geo.rotateZ(PI / 2); geo.scale(1, 0.55, 1); return geo; };
    mesh(dome(D / 2, W), T(wood), lid, 0, 0, D / 2);
    for (const s of [-1, 1]) mesh(dome(D / 2 + 0.008, 0.034), metal(gold), lid, s * (W / 2 - 0.06), 0, D / 2);
    mesh(box(W - 0.01, 0.01, D - 0.01), T(shadeHex(wood, -0.35)), lid, 0, 0.004, D / 2);
    mesh(box(0.06, 0.07, 0.024), metal(gold), lid, 0, -0.012, D + 0.012);
    mesh(box(0.014, 0.024, 0.01), T('#3a2410'), lid, 0, -0.018, D + 0.026);
    bake(lid);
    // หัว + ขา
    const hd = group(m, 0, 0.15, D / 2 + 0.03);
    mesh(cyl(0.048, 0.055, 0.1, 10), T(g), hd, 0, -0.01, -0.02, { r: [PI / 2.4, 0, 0] });
    mesh(sph(0.088, 14, 12), T(g), hd, 0, 0.04, 0.05, { s: [1, 0.92, 1.1] });
    bake(hd);
    eyes(P, hd, 0.044, 0.06, 0.13, 0.022);
    blush(hd, 0.065, 0.025, 0.115, 0.02);
    const legs = legs4(m, 0.16, 0.1, 0.13, (l) => mesh(sph(0.055, 10, 8), T(g), l, 0, -0.045, 0, { s: [1, 1.1, 1.2] }));
    P.on(({ t, run, ph, pk, hp }) => {
      m.rotation.z = Math.sin(ph) * 0.06 * run;
      m.position.y = Math.abs(Math.sin(ph)) * 0.02 * run;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : PI)) * 0.6 * run; });
      const peek = Math.max(0, Math.sin(t * 0.8) - 0.92) * 2;
      const open = Math.max(pk, hp >= 0 ? Math.sin(hp * PI) : 0, peek);
      lid.rotation.x = -open * 1.15;
      trGlow.material.opacity = open * 0.9;
      hd.position.z = D / 2 + 0.03 + Math.sin(t * 1.3) * 0.01 - pk * 0.03;
      hd.rotation.x = pk * 0.35;
    });
    return { size: 0.42, shadow: 0.75, mouth: group(tr, 0, 0.04, 0) };
  },

  /* ---------- หายาก: นกไปรษณีย์ ---------- */
  finch(P) {
    const c = '#5aaeff', belly = '#fff3d6', cap = '#2f4f9e';
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.11, 16, 12), T(c), b, 0, 0, 0, { s: [1, 0.95, 1.2] });
    mesh(sph(0.085, 14, 10), T(belly), b, 0, -0.025, 0.05, { s: [0.9, 0.85, 0.8] });
    mesh(sph(0.085, 16, 12), T(c), b, 0, 0.1, 0.07);
    mesh(cone(0.024, 0.06, 8), T('#ffb347'), b, 0, 0.085, 0.165, { r: [PI / 2, 0, 0] });
    for (const i of [-1, 0, 1]) mesh(box(0.034, 0.008, 0.12), T(shadeHex(c, -0.28)), b, i * 0.028, 0.02, -0.16, { r: [0.4, i * 0.32, 0] });
    for (const s of [-1, 1]) mesh(cyl(0.006, 0.006, 0.05, 5), T('#ff9a3a'), b, s * 0.035, -0.11, 0.01);
    // กระเป๋าพัสดุ + สาย
    mesh(box(0.07, 0.062, 0.034), T('#b07040'), b, 0.105, -0.05, 0.02, { r: [0, 0, 0.15] });
    mesh(box(0.072, 0.026, 0.037), T('#7a4a2a'), b, 0.108, -0.024, 0.02, { r: [0, 0, 0.15] });
    const strap = mesh(torus(0.113, 0.008, 6, 26), T('#7a4a2a'), b, 0.0, -0.005, 0.0);
    strap.quaternion.setFromUnitVectors(V(0, 0, 1), V(1, 0.75, 0).normalize());
    // หมวกบุรุษไปรษณีย์
    mesh(cyl(0.056, 0.062, 0.042, 14), T(cap), b, 0, 0.178, 0.06);
    mesh(cyl(0.062, 0.062, 0.008, 14), T(shadeHex(cap, -0.3)), b, 0, 0.158, 0.085, { s: [1, 1, 0.75] });
    mesh(sph(0.013, 8, 6), metal('#ffcf4a'), b, 0, 0.18, 0.118);
    bake(b);
    eyes(P, b, 0.042, 0.112, 0.138, 0.02);
    blush(b, 0.06, 0.08, 0.125, 0.017);
    const wings = [-1, 1].map((s) => {
      const w = group(b, s * 0.095, 0.03, 0);
      mesh(sph(0.07, 12, 8), T(shadeHex(c, -0.12)), w, s * 0.06, 0, -0.01, { s: [1, 0.25, 0.75] });
      mesh(sph(0.045, 10, 6), T(cap), w, s * 0.11, -0.004, -0.03, { s: [1, 0.2, 0.6] });
      bake(w); return w;
    });
    P.on(({ t, run, pk }) => {
      const a = Math.sin(t * (run > 0.5 ? 28 : 19)) * 0.9;
      wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * a; });
      m.position.y = Math.sin(t * 3) * 0.03 - pk * 0.3;
      m.rotation.x = 0.35 * run + pk * 0.55;
      m.rotation.z = Math.sin(t * 1.7) * 0.06;
    });
    return { hover: 0.55, size: 0.36, shadow: 0.35, mouth: group(b, 0, 0.08, 0.17) };
  },

  /* ---------- ล้ำค่า: โกเลมแม่เหล็ก ---------- */
  golem(P) {
    const glow = '#6ff4ff', red = '#ff4a5a';
    const SM = T('#8e8ba8'), SM2 = T('#a9a7c4');
    const m = group(P.body);
    const b = group(m);
    mesh(dodeca(0.15), SM, b, 0, 0.24, 0, { s: [1.05, 0.95, 0.9] });
    for (const s of [-1, 1]) {
      mesh(dodeca(0.062), SM2, b, s * 0.1, 0.33, 0.03);
      mesh(dodeca(0.062), SM, b, s * 0.075, 0.065, 0, { s: [1, 1.1, 1.05] });
    }
    mesh(sph(0.05, 8, 6), T('#7ac86a'), b, 0.06, 0.345, -0.06, { s: [1.3, 0.4, 1.1] });
    mesh(sph(0.04, 8, 6), T('#7ac86a'), b, -0.09, 0.2, -0.1, { s: [1, 0.5, 1.2] });
    bake(b);
    const core = mesh(oct(0.038), G(glow, 1.6), b, 0, 0.25, 0.132, { keep: true, s: [1, 1.3, 0.6], shadow: false });
    const coreGlow = glowSprite(b, glow, 0.22, 0.6, 0, 0.25, 0.15);
    const h = group(m, 0, 0.44, 0.01);
    mesh(dodeca(0.1), SM2, h, 0, 0, 0, { s: [1.12, 0.9, 1] });
    bake(h);
    for (const s of [-1, 1]) {
      const e = group(h, s * 0.042, 0.005, 0.09);
      mesh(box(0.036, 0.024, 0.012), G(glow, 1.8), e, 0, 0, 0, { keep: true, shadow: false });
      P.eyes.push(e);
    }
    // แม่เหล็กเกือกม้าบนหัว
    const mg = group(h, 0, 0.155, 0);
    const u = torus(0.07, 0.024, 8, 18, PI); u.rotateZ(PI);
    mesh(u, T(red), mg, 0, 0, 0);
    for (const s of [-1, 1]) mesh(cyl(0.024, 0.024, 0.05, 10), metal('#e8eef6', 0.2), mg, s * 0.07, 0.025, 0);
    bake(mg);
    const mgGlow = glowSprite(mg, glow, 0.25, 0, 0, 0.06, 0);
    const hands = [-1, 1].map((s) => { const hg = group(m, s * 0.24, 0.22, 0.03); mesh(dodeca(0.06), SM2, hg); bake(hg); return hg; });
    // วงแม่เหล็ก (หดเข้าหาตัว = ดูดของ)
    const rings = [0, 1, 2].map(() => mesh(torus(1, 0.012, 4, 64), unlit(glow, { add: true, opacity: 0 }), P.root, 0, 0.06, 0, { r: [PI / 2, 0, 0], keep: true, shadow: false }));
    let pulse = 9;
    P.on(({ t, dt, run, ph, pk, ev }) => {
      m.rotation.z = Math.sin(ph) * 0.08 * run;
      m.position.y = Math.abs(Math.sin(ph)) * 0.03 * run;
      hands.forEach((hg, i) => { hg.position.y = 0.22 + Math.sin(t * 2 + i * 1.5) * 0.03 + pk * 0.16; hg.position.z = 0.03 + Math.sin(ph + i * PI) * 0.08 * run + pk * 0.06; hg.rotation.y = t * (i ? 1 : -1); });
      core.rotation.y = t * 2; coreGlow.material.opacity = 0.45 + Math.sin(t * 4) * 0.15 + pk * 0.4;
      mgGlow.material.opacity = pk * 0.9;
      mg.rotation.z = Math.sin(t * 1.5) * 0.08 + Math.sin(t * 40) * 0.05 * pk;
      if (ev) pulse = 0;
      pulse += dt;
      const R = Math.max(0.8, P.range || 2);
      rings.forEach((r, i) => {
        const k = (pulse - i * 0.14) / 0.85;
        if (k < 0 || k > 1) { r.material.opacity = 0; return; }
        r.scale.setScalar(0.15 + (1 - k) * R);
        r.material.opacity = Math.sin(k * PI) * 0.75;
      });
    });
    return { size: 0.62, shadow: 0.65, mouth: group(m, 0, 0.26, 0.16) };
  },

  /* ---------- ล้ำค่า: จิ้งจอกโคมไฟ ---------- */
  fox(P) {
    const c = '#f7f1ff', ac = '#b88cff', dk = '#5a3a98', lantern = '#ffd36b';
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.12, 16, 12), T(c), b, 0, 0.22, -0.01, { s: [0.85, 0.85, 1.3] });
    mesh(sph(0.08, 12, 10), T('#ffffff'), b, 0, 0.24, 0.11, { s: [0.9, 1, 0.7] });
    bake(b);
    const h = group(m, 0, 0.36, 0.14);
    mesh(sph(0.105, 16, 12), T(c), h, 0, 0, 0, { s: [1.12, 0.95, 1] });
    for (const s of [-1, 1]) mesh(sph(0.042, 10, 8), T(c), h, s * 0.1, -0.035, 0.0, { s: [1.5, 0.7, 0.9], r: [0, 0, s * 0.35] });
    mesh(cone(0.05, 0.1, 10), T(c), h, 0, -0.03, 0.1, { r: [PI / 2, 0, 0] });
    mesh(sph(0.018, 8, 6), T('#2a1830'), h, 0, -0.03, 0.15);
    for (const s of [-1, 1]) {
      mesh(cone(0.05, 0.13, 8), T(c), h, s * 0.065, 0.1, -0.01, { r: [0, 0, -s * 0.3] });
      mesh(cone(0.03, 0.08, 8), T(ac), h, s * 0.063, 0.092, 0.008, { r: [0, 0, -s * 0.3], s: [1, 1, 0.4] });
      mesh(cone(0.024, 0.045, 8), T(dk), h, s * (0.065 + 0.046), 0.1 + 0.054, -0.01, { r: [0, 0, -s * 0.3] });
    }
    bake(h);
    mesh(oct(0.022), G(ac, 1.3), h, 0, 0.06, 0.09, { s: [0.7, 1.2, 0.4], keep: true, shadow: false });
    eyes(P, h, 0.045, 0.012, 0.092, 0.022, { color: '#4a2a7a' });
    blush(h, 0.07, -0.025, 0.08, 0.02);
    const legs = legs4(m, 0.055, 0.15, 0.1, (l) => { mesh(cyl(0.022, 0.019, 0.13, 8), T(c), l, 0, -0.065, 0); mesh(sph(0.027, 8, 6), T(ac), l, 0, -0.13, 0.008); });
    const tl = group(m, 0, 0.24, -0.15);
    const pts = bez3(V(0, 0, 0), V(0, 0.05, -0.13), V(0, 0.2, -0.22), V(0, 0.32, -0.18), 9);
    pts.forEach((p, i) => { const k = i / (pts.length - 1); mesh(sph(0.04 + Math.sin(k * PI * 0.9) * 0.04, 12, 10), T(k > 0.78 ? ac : c), tl, p.x, p.y, p.z); });
    bake(tl);
    const lg = group(tl, 0, 0.36, -0.16);
    mesh(cyl(0.004, 0.004, 0.05, 4), T('#4a3a2a'), lg, 0, -0.025, 0);
    const lb = group(lg, 0, -0.05, 0);
    mesh(cone(0.036, 0.026, 4), T(dk), lb, 0, 0.004, 0, { r: [0, PI / 4, 0] });
    mesh(box(0.05, 0.01, 0.05), T(dk), lb, 0, -0.07, 0);
    bake(lb);
    mesh(box(0.042, 0.058, 0.042), G(lantern, 1.6), lb, 0, -0.036, 0, { keep: true, shadow: false });
    const lglow = glowSprite(lb, lantern, 0.32, 0.75, 0, -0.036, 0);
    P.on(({ t, run, ph, pk }) => {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i < 2 ? 0 : PI) + (i % 2) * 0.5) * 0.75 * run; });
      m.position.y = Math.abs(Math.sin(ph)) * 0.04 * run;
      m.rotation.x = pk * 0.35;
      m.position.z = pk * 0.05;
      tl.rotation.x = -0.1 * run + Math.sin(t * 2) * 0.05;
      tl.rotation.y = Math.sin(t * 1.8) * 0.35 * (1 - run * 0.6);
      lg.rotation.x = Math.sin(t * 2.6) * 0.22 + run * 0.4;
      lg.rotation.z = Math.sin(t * 2) * 0.18;
      lglow.material.opacity = 0.65 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
      h.rotation.z = Math.sin(t * 0.8) * 0.08 * (1 - run);
      h.rotation.y = Math.sin(t * 0.5) * 0.2 * (1 - run);
    });
    return { size: 0.56, shadow: 0.55, mouth: group(h, 0, -0.03, 0.12) };
  },

  /* ---------- ตำนาน: มังกรออมสิน ---------- */
  wyrm(P) {
    const gold = '#ffcf4a', belly = '#fff1b8', red = '#e8483a', horn = '#fff6e0';
    const GM = T(gold, { emissive: '#5a3a00', emissiveIntensity: 0.6 });
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.16, 18, 14), GM, b, 0, 0, 0, { s: [1, 0.95, 1.08] });
    mesh(sph(0.13, 16, 12), T(belly), b, 0, -0.03, 0.06, { s: [0.9, 0.85, 0.75] });
    mesh(box(0.12, 0.012, 0.05), metal('#ffb020'), b, 0, 0.15, -0.02);
    mesh(box(0.09, 0.018, 0.022), T('#3a2410'), b, 0, 0.155, -0.02);
    for (const [y, z, s] of [[0.12, -0.1, 1], [0.065, -0.15, 0.85], [0.0, -0.17, 0.7]]) mesh(cone(0.025 * s, 0.05 * s, 6), T(red), b, 0, y, z, { r: [-0.9, 0, 0] });
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) mesh(sph(0.045, 10, 8), GM, b, sx * 0.09, -0.13, sz * 0.06, { s: [1, 0.8, 1.2] });
    bake(b);
    const h = group(m, 0, 0.13, 0.13);
    mesh(sph(0.11, 16, 12), GM, h, 0, 0.02, 0, { s: [1.05, 0.95, 1] });
    mesh(sph(0.065, 12, 10), GM, h, 0, -0.01, 0.09, { s: [1.15, 0.8, 1] });
    for (const s of [-1, 1]) {
      mesh(sph(0.009, 6, 4), T('#5a3a10'), h, s * 0.025, 0.01, 0.152);
      taper(h, bez(V(s * 0.05, 0.09, -0.02), V(s * 0.075, 0.15, -0.06), V(s * 0.05, 0.2, -0.12), 4), 0.022, 0.006, T(horn));
      taper(h, bez(V(s * 0.07, -0.02, 0.11), V(s * 0.12, -0.03, 0.12), V(s * 0.14, -0.1, 0.08), 4), 0.006, 0.002, GM);
    }
    bake(h);
    mesh(oct(0.022), G(red, 1.1), h, 0, 0.105, 0.07, { keep: true, s: [1, 1.2, 0.6], shadow: false });
    eyes(P, h, 0.05, 0.035, 0.085, 0.024);
    blush(h, 0.078, 0.0, 0.075, 0.02);
    const wingGeo = shapeGeo((sh) => { sh.moveTo(0, 0); sh.lineTo(0.06, 0.12); sh.quadraticCurveTo(0.1, 0.06, 0.16, 0.04); sh.quadraticCurveTo(0.1, 0.01, 0.12, -0.04); sh.quadraticCurveTo(0.06, 0, 0, -0.03); });
    const wings = [-1, 1].map((s) => { const pv = group(m, s * 0.1, 0.1, -0.05); mesh(wingGeo, DS(red, { emissive: '#5a0a0a', emissiveIntensity: 0.4 }), pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true }); return pv; });
    const tl = group(m, 0, -0.05, -0.15);
    taper(tl, bez3(V(0, 0, 0), V(0, -0.02, -0.12), V(0.08, 0.02, -0.2), V(0.1, 0.08, -0.2), 6), 0.05, 0.012, GM);
    mesh(cyl(0.04, 0.04, 0.012, 16), metal('#ffd84a', 0.3), tl, 0.1, 0.12, -0.2, { r: [PI / 2, 0, 0] });
    bake(tl);
    const orb = group(m);
    const coins = [0, 1, 2].map((i) => { const a = (i / 3) * PI * 2; return mesh(cyl(0.035, 0.035, 0.01, 14), metal('#ffd84a', 0.6), orb, Math.cos(a) * 0.27, 0.05, Math.sin(a) * 0.27, { keep: true, shadow: false }); });
    P.on(({ t, dt, run, pk, ev }) => {
      m.position.y = Math.sin(t * 2.4) * 0.03;
      m.rotation.x = 0.25 * run + pk * 0.3;
      wings.forEach((pv, i) => { pv.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * (run > 0.5 ? 18 : 11)) * 0.6); });
      tl.rotation.y = Math.sin(t * 1.6) * 0.3;
      orb.rotation.y = t * 1.6;
      coins.forEach((cn, i) => { cn.rotation.set(PI / 2, 0, t * 4 + i); cn.position.y = 0.05 + Math.sin(t * 2 + i * 2) * 0.03; });
      h.rotation.x = -pk * 0.35;
      if (ev) P.emit('coin', { pos: P.wp(h, 0, 0.1, 0.1), count: 10, vel: () => V(rand(-0.6, 0.6), rand(0.8, 1.4), rand(-0.6, 0.6)), gravity: -3, life: [0.6, 0.9], size: [0.07, 0.1], sizeEnd: 0.9, color: ['#ffe066', '#ffcf4a'] });
      if (Math.random() < dt * 3) P.emit('star', { pos: P.wp(m, rand(-0.25, 0.25), rand(-0.1, 0.25), rand(-0.25, 0.25)), count: 1, vel: () => V(0, 0.15, 0), life: [0.5, 0.9], size: [0.05, 0.09], color: '#ffe9a0' });
    });
    return { hover: 0.24, size: 0.5, shadow: 0.55, mouth: group(h, 0, 0, 0.12) };
  },

  /* ---------- ตำนาน: ลูกกวางเขาคริสตัล ---------- */
  fawn(P) {
    const c = '#efc9a2', cream = '#fff6ea';
    const CR = toon('#8af0ff', { emissive: '#3ad0ff', emissiveIntensity: 0.75 });
    const CR2 = toon('#ffb8ee', { emissive: '#ff6ad0', emissiveIntensity: 0.55 });
    const m = group(P.body);
    const b = group(m);
    const bc = V(0, 0.34, 0), rx = 0.104, ry = 0.106, rz = 0.172;
    mesh(sph(0.13, 16, 12), T(c), b, bc.x, bc.y, bc.z, { s: [0.8, 0.82, 1.32] });
    mesh(sph(0.1, 14, 10), T(cream), b, 0, 0.3, 0.02, { s: [0.75, 0.7, 1.2] });
    for (const d of [[0.6, 0.6, 0.2], [-0.5, 0.7, -0.3], [0.4, 0.8, -0.6], [-0.7, 0.5, 0.4], [0.1, 1, 0.1], [0.7, 0.4, -0.5], [-0.3, 0.8, 0.6], [-0.6, 0.6, -0.7]]) {
      const p = onEllipsoid(bc, rx, ry, rz, d[0], d[1], d[2]);
      mesh(sph(0.016, 8, 6), T(cream), b, p.x, p.y, p.z, { s: [1, 0.5, 1], noOutline: true });
    }
    mesh(cyl(0.045, 0.06, 0.16, 10), T(c), b, 0, 0.45, 0.12, { r: [0.45, 0, 0] });
    mesh(sph(0.03, 8, 6), T(cream), b, 0, 0.39, -0.17, { s: [1, 1.2, 0.8] });
    bake(b);
    const h = group(m, 0, 0.55, 0.17);
    mesh(sph(0.085, 16, 12), T(c), h, 0, 0, 0, { s: [0.92, 0.95, 1.05] });
    mesh(sph(0.05, 12, 10), T(cream), h, 0, -0.03, 0.065, { s: [0.9, 0.8, 1] });
    mesh(sph(0.015, 8, 6), T('#3a2020'), h, 0, -0.02, 0.112);
    for (const s of [-1, 1]) {
      mesh(sph(0.045, 10, 8), T(c), h, s * 0.09, 0.03, -0.02, { s: [1.5, 0.55, 0.8], r: [0, 0, s * 0.4] });
      mesh(sph(0.03, 10, 8), T('#ffc8c8'), h, s * 0.092, 0.033, -0.008, { s: [1.4, 0.45, 0.5], r: [0, 0, s * 0.4] });
    }
    bake(h);
    eyes(P, h, 0.042, 0.015, 0.072, 0.024, { color: '#2a4a6a' });
    blush(h, 0.062, -0.02, 0.06, 0.018);
    const ant = group(h, 0, 0.06, -0.01); ant.scale.setScalar(1.35);
    for (const s of [-1, 1]) {
      mesh(oct(0.035), CR, ant, s * 0.045, 0.06, 0, { s: [0.45, 1.7, 0.45], r: [0, 0, -s * 0.35] });
      mesh(oct(0.026), CR2, ant, s * 0.088, 0.07, 0.01, { s: [0.45, 1.3, 0.45], r: [0, 0, -s * 0.9] });
      mesh(oct(0.02), CR, ant, s * 0.035, 0.115, 0.02, { s: [0.4, 1.2, 0.4], r: [0.3, 0, -s * 0.15] });
    }
    bake(ant);
    const shard = mesh(oct(0.03), CR2, m, 0.22, 0.5, 0, { keep: true, s: [0.6, 1.2, 0.6] });
    addOutline(shard);
    const legs = legs4(m, 0.05, 0.28, 0.11, (l) => { mesh(cyl(0.026, 0.019, 0.24, 8), T(c), l, 0, -0.12, 0); mesh(cone(0.025, 0.04, 6), CR, l, 0, -0.255, 0.004, { r: [PI, 0, 0] }); });
    P.on(({ t, dt, run, ph, pk }) => {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : PI)) * 0.6 * run; });
      m.position.y = Math.abs(Math.sin(ph)) * 0.035 * run;
      h.rotation.x = pk * 0.9;
      h.position.y = 0.55 - pk * 0.08; h.position.z = 0.17 + pk * 0.05;
      h.rotation.y = Math.sin(t * 0.6) * 0.2 * (1 - run);
      const a = t * 0.9;
      shard.position.set(Math.cos(a) * 0.24, 0.5 + Math.sin(t * 2) * 0.04, Math.sin(a) * 0.24);
      shard.rotation.y = t * 2;
      if (Math.random() < dt * (4 + run * 10)) P.emit('star', { pos: P.wp(m, rand(-0.15, 0.15), rand(0.05, 0.6), rand(-0.2, 0.2)), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.15, 0.35), rand(-0.05, 0.05)), life: [0.6, 1.1], size: [0.04, 0.08], color: ['#8af0ff', '#ffb8ee', '#ffffff'] });
    });
    return { size: 0.74, shadow: 0.55, mouth: group(h, 0, -0.04, 0.1) };
  },

  /* ---------- Mythical: ลูกนกฟีนิกซ์ ---------- */
  phoenix(P) {
    const c = '#ff6a3a', y = '#ffd34d';
    const BM = T(c, { emissive: '#ff3a10', emissiveIntensity: 0.35 });
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.14, 18, 14), BM, b, 0, 0, 0, { s: [1, 0.95, 1.05] });
    mesh(sph(0.1, 14, 10), T('#ffe0a0', { emissive: '#ff8a3a', emissiveIntensity: 0.2 }), b, 0, -0.03, 0.07, { s: [0.9, 0.85, 0.75] });
    mesh(sph(0.1, 16, 12), BM, b, 0, 0.13, 0.04);
    mesh(cone(0.024, 0.05, 8), T(y), b, 0, 0.11, 0.145, { r: [PI / 2, 0, 0] });
    for (const s of [-1, 1]) mesh(cone(0.012, 0.05, 5), T('#ff9a3a'), b, s * 0.04, -0.13, 0.02, { r: [PI, 0, 0] });
    bake(b);
    eyes(P, b, 0.042, 0.15, 0.125, 0.021);
    blush(b, 0.065, 0.11, 0.115, 0.018);
    const cr = group(b, 0, 0.22, 0.02);
    for (const [x, hh, rz] of [[0, 0.12, 0], [-0.035, 0.09, 0.45], [0.035, 0.09, -0.45]]) mesh(cone(0.026, hh, 8), G(y, 1.3), cr, x, hh / 2 - 0.01, -0.01, { r: [-0.25, 0, rz] });
    bake(cr, { outline: false });
    const tl = group(m, 0, 0, -0.11);
    const tips = [-1, 0, 1].map((sx, i) => {
      taper(tl, bez3(V(0, 0, 0), V(sx * 0.06, -0.03, -0.12), V(sx * 0.16, 0.05, -0.22), V(sx * 0.22, 0.16 - Math.abs(sx) * 0.04, -0.3), 7), 0.03, 0.008, G(i === 1 ? y : c, 0.9));
      return group(tl, sx * 0.22, 0.16 - Math.abs(sx) * 0.04, -0.3);
    });
    bake(tl, { outline: false });
    const fgeo = shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.1, 0.2, 0.08); sh.lineTo(0.15, 0.04); sh.lineTo(0.19, 0.0); sh.lineTo(0.13, -0.01); sh.lineTo(0.15, -0.05); sh.quadraticCurveTo(0.06, -0.04, 0, -0.03); });
    const wings = [-1, 1].map((s) => { const pv = group(b, s * 0.12, 0.03, -0.01); mesh(fgeo, DS(y, { emissive: '#ff8a1a', emissiveIntensity: 0.7 }), pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true }); return pv; });
    const aura = glowSprite(b, '#ff8a3a', 0.85, 0.45, 0, 0.05, 0);
    P.on(({ t, dt, run, pk, ev }) => {
      m.position.y = Math.sin(t * 3) * 0.035 - pk * 0.22;
      m.rotation.x = 0.3 * run + pk * 0.6;
      const a = Math.sin(t * (run > 0.5 ? 24 : 16)) * 0.7;
      wings.forEach((pv, i) => { pv.rotation.z = (i ? 1 : -1) * a; });
      tl.rotation.x = Math.sin(t * 2) * 0.12 - run * 0.2;
      aura.material.opacity = 0.4 + Math.sin(t * 7) * 0.08 + pk * 0.3;
      if (Math.random() < dt * 22) P.emit('dot', { pos: P.wp(cr, rand(-0.03, 0.03), 0.1, 0), count: 1, vel: () => V(rand(-0.08, 0.08), rand(0.35, 0.6), rand(-0.08, 0.08)), life: [0.3, 0.55], size: [0.06, 0.1], sizeEnd: 0.2, color: ['#ffe066', '#ffb020'], colorEnd: '#ff3a10' });
      if (Math.random() < dt * 24) { const tp = tips[(Math.random() * 3) | 0]; P.emit('dot', { pos: P.wp(tp), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.4, 0.8], size: [0.05, 0.09], sizeEnd: 0.2, color: ['#ffd34d', '#ff8a3a'], colorEnd: '#ff2a10' }); }
      if (ev) P.emit('dot', { pos: P.wp(b), count: 26, speed: [0.6, 1.4], drag: 2, life: [0.4, 0.8], size: [0.07, 0.12], sizeEnd: 0.2, color: ['#ffe066', '#ff8a3a'], colorEnd: '#ff2a10' });
    });
    return { hover: 0.5, size: 0.44, shadow: 0.42, mouth: group(b, 0, 0.11, 0.16) };
  },

  /* ---------- Mythical: ปลาหมึกยักษ์ห้วงลึก ---------- */
  kraken(P) {
    const c = '#5a34a8', c2 = '#8a5ae0', glow = '#4af8ff';
    const KM = T(c, { emissive: '#1a0a40', emissiveIntensity: 0.5 }), KM2 = T(c2, { emissive: '#2a1060', emissiveIntensity: 0.4 });
    const m = group(P.body);
    const hd = group(m, 0, 0.16, 0);
    const hc = V(0, 0.04, -0.01);
    mesh(sph(0.16, 18, 14), KM, hd, hc.x, hc.y, hc.z, { s: [1, 1.2, 1] });
    for (const s of [-1, 1]) mesh(sph(0.06, 10, 8), KM2, hd, s * 0.13, 0.18, -0.04, { s: [1.2, 0.25, 0.9], r: [0, 0, s * 0.5] });
    mesh(sph(0.14, 16, 10), KM2, hd, 0, -0.06, 0, { s: [1, 0.5, 1] });
    bake(hd);
    for (const d of [[0.5, 0.8, -0.3], [-0.6, 0.7, -0.2], [0.2, 0.9, -0.6], [-0.3, 0.6, -0.8], [0.75, 0.3, -0.5], [-0.8, 0.4, -0.4], [0, 1, -0.1]]) {
      const p = onEllipsoid(hc, 0.16, 0.192, 0.16, d[0], d[1], d[2]);
      mesh(sph(0.014, 8, 6), G(glow, 1.6), hd, p.x, p.y, p.z, { keep: true, noOutline: true, shadow: false });
    }
    for (const s of [-1, 1]) {
      const e = group(hd, s * 0.07, 0.0, 0.125);
      mesh(sph(0.045, 14, 10), T('#ffffff'), e, 0, 0, 0, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.032, 12, 8), G(glow, 0.7), e, 0, -0.003, 0.012, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.017, 8, 6), T('#140a2a'), e, 0, -0.004, 0.02, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.008, 6, 4), WHITE, e, -0.01, 0.012, 0.025, { keep: true, noOutline: true });
      P.eyes.push(e);
    }
    blush(hd, 0.11, -0.04, 0.115, 0.022);
    // หนวด 8 เส้น: แต่ละเส้นเป็นข้อต่อ 5 ข้อ
    const N = 8, SEG = 5, tent = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * PI * 2 + PI / 8;
      const root = group(m, Math.sin(a) * 0.1, 0.11, Math.cos(a) * 0.1);
      root.rotation.y = a;
      let par = root; const segs = [];
      for (let j = 0; j < SEG; j++) {
        const r = 0.03 * (1 - j / SEG) + 0.008, len = 0.06 - j * 0.004;
        const sg = group(par, 0, j ? -(0.06 - (j - 1) * 0.004) : 0, 0);
        const mm = mesh(cyl(r * 0.85, r, len, 8), j > 2 ? KM2 : KM, sg, 0, -len / 2, 0); addOutline(mm);
        if (j < SEG - 1) mesh(sph(r * 0.86, 8, 6), j > 2 ? KM2 : KM, sg, 0, -len, 0); else { const tip = mesh(sph(r * 0.8, 8, 6), KM2, sg, 0, -len, 0); addOutline(tip); }
        if (j === SEG - 1 && i === 0) mesh(sph(0.03, 12, 10), G('#bff8ff', 0.8), sg, 0, -len - 0.01, 0.015, { keep: true });
        segs.push(sg); par = sg;
      }
      tent.push(segs);
    }
    P.on(({ t, dt, run, pk, ev }) => {
      const pul = Math.sin(t * 3.6);
      m.position.y = Math.sin(t * 1.8) * 0.04 + Math.max(0, pul) * 0.03 * (1 - run);
      hd.scale.set(1 + 0.04 * pul, 1 - 0.03 * pul, 1 + 0.04 * pul);
      m.rotation.x = 0.55 * run;
      tent.forEach((segs, i) => segs.forEach((sg, j) => {
        const curl = (0.2 + pk * 0.45) * (j === 0 ? 1.6 : 1) * (1 - run * 0.75);
        sg.rotation.x = -curl + Math.sin(t * 3 - j * 0.9 + i * 0.8) * 0.2 * (1 - run * 0.5) + (j > 0 ? pk * 0.25 * Math.sin(t * 9 + i) : 0);
      }));
      if (Math.random() < dt * 4) P.emit('ring', { pos: P.wp(m, rand(-0.12, 0.12), rand(0.0, 0.3), rand(-0.12, 0.12)), count: 1, vel: () => V(rand(-0.03, 0.03), rand(0.2, 0.35), 0), life: [0.9, 1.4], size: [0.04, 0.08], sizeEnd: 1.2, color: '#bff8ff', alpha: 0.8 });
      if (ev) P.emit('ring', { pos: P.wp(m, 0, 0.1, 0), count: 14, speed: [0.3, 0.8], drag: 2, life: [0.6, 1], size: [0.05, 0.1], sizeEnd: 1.3, color: '#bff8ff' });
    });
    return { hover: 0.55, size: 0.62, shadow: 0.55, mouth: group(m, 0, 0.05, 0.05) };
  },

  /* ---------- Celestial: วาฬดวงดาว ---------- */
  whale(P) {
    const tex = galaxyTex();
    const BM = new THREE.MeshToonMaterial({ color: lin('#ffffff'), map: tex, gradientMap: gradientMap(), emissive: lin('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.5 });
    const BL = TM('#e6f6ff', bellyTex(), { emissive: lin('#4a8aff'), emissiveIntensity: 0.25 });
    const FIN = DS('#6a8aff', { emissive: '#3a4ad8', emissiveIntensity: 0.7 });
    const gold = '#ffe08a';
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.3, 28, 20), BM, b, 0, 0, 0, { s: [0.8, 0.72, 1.55] });
    mesh(sph(0.27, 24, 16), BL, b, 0, -0.06, 0.04, { s: [0.72, 0.56, 1.42] });
    bake(b);
    eyes(P, b, 0.165, 0.0, 0.34, 0.03, { tilt: 0.55 });
    blush(b, 0.19, -0.05, 0.31, 0.03);
    const fin = shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.12, 0.0, 0.25, 0.07); sh.quadraticCurveTo(0.14, 0.09, 0, 0.08); });
    const fins = [-1, 1].map((s) => { const pv = group(b, s * 0.2, -0.09, 0.12); pv.scale.setScalar(1.25); mesh(fin, FIN, pv, 0, 0, 0, { s: [s, 1, 1], r: [-PI / 2, 0, 0], noOutline: true }); return pv; });
    const tl = group(m, 0, 0.02, -0.3);
    mesh(sph(0.15, 16, 12), BM, tl, 0, 0, -0.1, { s: [0.85, 0.7, 1.55] });
    bake(tl);
    const fk = group(tl, 0, 0.01, -0.3);
    fk.scale.setScalar(1.35);
    const fluke = shapeGeo((sh) => { sh.moveTo(0, 0); sh.quadraticCurveTo(0.14, 0.0, 0.27, 0.16); sh.quadraticCurveTo(0.18, 0.11, 0.12, 0.13); sh.quadraticCurveTo(0.05, 0.12, 0, 0.09); });
    for (const s of [-1, 1]) mesh(fluke, FIN, fk, 0, 0, 0, { s: [s, 1, 1], r: [-PI / 2, 0, 0], noOutline: true });
    const tip = group(fk, 0, 0, -0.12);
    // วงแหวนดาวลอยเหนือหัว
    const hl = group(m, 0, 0.33, 0.08);
    mesh(torus(0.12, 0.007, 6, 48), G(gold, 1.3), hl, 0, 0, 0, { r: [PI / 2, 0, 0], keep: true, shadow: false });
    const starGeo = extrude((sh) => starShape(sh, 0.035, 0.015), 0.012, 0.003);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; mesh(starGeo, G('#fff2b0', 1.4), hl, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, { keep: true, shadow: false }); }
    glowSprite(hl, gold, 0.5, 0.25);
    const spout = group(b, 0, 0.21, 0.12);
    let spoutT = 3;
    P.on(({ t, dt, run, pk, ev }) => {
      m.position.y = Math.sin(t * 1.2) * 0.06;
      m.rotation.x = Math.sin(t * 1.2 + 0.8) * 0.06 - pk * 0.25 + run * 0.08;
      tl.rotation.x = Math.sin(t * (1.6 + run * 2.4)) * 0.3;
      fk.rotation.x = Math.sin(t * (1.6 + run * 2.4) - 0.8) * 0.35;
      fins.forEach((pv, i) => { pv.rotation.z = (i ? 1 : -1) * Math.sin(t * 1.6) * 0.35; });
      hl.rotation.y = t * 0.6;
      hl.position.y = 0.33 + Math.sin(t * 2) * 0.015;
      if (Math.random() < dt * (8 + run * 22)) P.emit('star', { pos: P.wp(tip, rand(-0.1, 0.1), 0, 0), count: 1, vel: () => V(rand(-0.05, 0.05), rand(-0.05, 0.08), 0), life: [0.7, 1.3], size: [0.06, 0.12], color: ['#ffffff', '#8af0ff', '#ffe9a0'] });
      spoutT -= dt;
      if (spoutT <= 0 || ev) { spoutT = 4 + Math.random() * 2; P.emit('star', { pos: P.wp(spout), count: 18, vel: () => V(rand(-0.25, 0.25), rand(0.9, 1.5), rand(-0.25, 0.25)), gravity: -1.6, life: [0.8, 1.3], size: [0.07, 0.13], color: ['#ffffff', '#8af0ff', '#ffe9a0'] }); }
    });
    return { hover: 0.95, size: 0.62, shadow: 0.95, mouth: group(b, 0, 0, 0.45) };
  },

  /* ---------- Celestial: กิเลนเมฆาสวรรค์ ---------- */
  qilin(P) {
    const w = '#f7f6ff', gold = '#ffd36b';
    const BM = TM('#ffffff', qilinTex());
    const GOLD = metal(gold, 0.35);
    const MANE = T('#7ff0e0', { emissive: '#2ac8b8', emissiveIntensity: 0.7 });
    const CL = T('#ffffff', { emissive: '#8ab8ff', emissiveIntensity: 0.28 });
    const m = group(P.body);
    const b = group(m);
    mesh(sph(0.14, 18, 14), BM, b, 0, 0.42, 0, { s: [0.8, 0.8, 1.38] });
    mesh(sph(0.09, 14, 10), BM, b, 0, 0.47, 0.13, { s: [0.9, 1.05, 0.9] });
    mesh(cyl(0.05, 0.065, 0.18, 10), BM, b, 0, 0.55, 0.16, { r: [0.5, 0, 0] });
    mesh(torus(0.1, 0.012, 6, 24), GOLD, b, 0, 0.42, 0.06, { s: [1.12, 1.12, 1] });
    bake(b);
    const h = group(m, 0, 0.66, 0.22);
    mesh(sph(0.085, 16, 12), T(w), h, 0, 0, 0, { s: [0.95, 0.92, 1.05] });
    mesh(sph(0.055, 12, 10), T(w), h, 0, -0.025, 0.075, { s: [1.05, 0.8, 1.1] });
    mesh(sph(0.012, 6, 4), GOLD, h, 0, -0.008, 0.135);
    taper(h, [V(0, 0.07, 0.01), V(0, 0.13, -0.015), V(0, 0.19, -0.05)], 0.018, 0.004, G(gold, 0.8));
    for (const s of [-1, 1]) {
      mesh(cone(0.025, 0.07, 6), T(w), h, s * 0.07, 0.06, -0.03, { r: [0, 0, -s * 0.9] });
      taper(h, bez3(V(s * 0.05, -0.035, 0.1), V(s * 0.09, -0.04, 0.11), V(s * 0.12, -0.08, 0.08), V(s * 0.13, -0.14, 0.04), 5), 0.006, 0.002, GOLD);
      mesh(box(0.04, 0.008, 0.01), GOLD, h, s * 0.04, 0.05, 0.07, { r: [0, 0, s * 0.3] });
    }
    bake(h);
    eyes(P, h, 0.04, 0.015, 0.072, 0.02, { color: '#2a3a6a' });
    blush(h, 0.06, -0.02, 0.06, 0.016);
    const hornGlow = glowSprite(h, gold, 0.3, 0, 0, 0.17, -0.04);
    const mn = group(m);
    for (let i = 0; i < 6; i++) { const k = i / 5; mesh(cone(0.04 - k * 0.008, 0.15, 8), MANE, mn, 0, 0.73 - k * 0.23, 0.15 - k * 0.15, { r: [-1.2 + k * 0.2, 0, 0] }); }
    bake(mn);
    const legs = legs4(m, 0.055, 0.38, 0.12, (l) => {
      mesh(cyl(0.024, 0.018, 0.26, 8), T(w), l, 0, -0.13, 0);
      mesh(torus(0.02, 0.006, 5, 12), GOLD, l, 0, -0.22, 0, { r: [PI / 2, 0, 0] });
      mesh(cyl(0.022, 0.026, 0.03, 8), GOLD, l, 0, -0.27, 0);
      for (const [x, z, r] of [[0, 0.01, 0.035], [-0.03, -0.01, 0.026], [0.03, -0.01, 0.028]]) mesh(sph(r, 10, 8), CL, l, x, -0.3, z);
    });
    const tl = group(m, 0, 0.45, -0.18);
    const tp = bez3(V(0, 0, 0), V(0, 0.05, -0.12), V(0, 0.18, -0.16), V(0, 0.24, -0.08), 6);
    tp.forEach((p, i) => { if (i < tp.length - 1) mesh(sph(0.035 + i * 0.006, 10, 8), CL, tl, p.x, p.y, p.z); });
    mesh(cone(0.04, 0.12, 8), MANE, tl, 0, 0.27, -0.06, { r: [0.5, 0, 0] });
    bake(tl);
    const aura = glowSprite(P.root, gold, 1.1, 0.18, 0, 0.05, 0);
    P.on(({ t, dt, run, ph, pk, ev }) => {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i < 2 ? 0 : PI) + (i % 2) * 0.4) * 0.8 * run - (i < 2 ? pk * 1.1 : 0); });
      m.position.y = Math.sin(t * 1.5) * 0.015 + Math.abs(Math.sin(ph)) * 0.04 * run + pk * 0.08;
      m.rotation.x = -pk * 0.45;
      mn.rotation.x = Math.sin(t * 3) * 0.04;
      tl.rotation.y = Math.sin(t * 1.3) * 0.3;
      h.rotation.y = Math.sin(t * 0.5) * 0.18 * (1 - run);
      hornGlow.material.opacity = 0.2 + pk * 0.8 + Math.sin(t * 3) * 0.08;
      aura.material.opacity = 0.16 + Math.sin(t * 2) * 0.05;
      if (run > 0.3 && Math.random() < dt * 16) P.emit('puff', { pos: P.wp(m, rand(-0.06, 0.06), 0.06, rand(-0.15, 0.15)), count: 1, vel: () => V(rand(-0.1, 0.1), 0.08, rand(-0.1, 0.1)), life: [0.5, 0.9], size: [0.12, 0.2], sizeEnd: 1.6, color: '#ffffff', alpha: 0.8 });
      if (Math.random() < dt * 5) P.emit('star', { pos: P.wp(m, rand(-0.3, 0.3), rand(0.1, 0.8), rand(-0.3, 0.3)), count: 1, vel: () => V(0, rand(0.15, 0.3), 0), life: [0.7, 1.2], size: [0.05, 0.1], color: ['#ffe9a0', '#ffffff'] });
      if (ev) P.emit('star', { pos: P.wp(h, 0, 0.18, -0.04), count: 16, speed: [0.5, 1.1], drag: 2.5, life: [0.5, 0.9], size: [0.07, 0.12], color: ['#ffe9a0', '#ffffff', '#7ff0e0'] });
    });
    return { size: 0.86, shadow: 0.62, mouth: group(h, 0, -0.03, 0.1) };
  },
};

/* ================= ตัวสัตว์เลี้ยง ================= */
const PTEX = { dot: () => TX.softDot(), star: () => TX.star4(), puff: () => TX.puff(), ring: () => TX.softRing(), heart: () => heartTex(), coin: () => coinTex() };

export class PetView {
  constructor(id, { world = null, stars = 0 } = {}) {
    this.id = id; this.def = PETS[id];
    this.root = new THREE.Group();
    this.body = group(this.root);
    this.eyes = []; this.ticks = []; this.ps = new Map();
    this.world = world || this.root;
    this.t = Math.random() * 10; this.ph = 0; this.run = 0;
    this.pickT = 0; this.happyT = 0; this.load = 0; this.range = 2;
    this.evPick = false; this.evHappy = false;
    this.blinkAt = 1.5 + Math.random() * 2;
    this.pscale = 420;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
    sh.rotation.x = -PI / 2; sh.position.y = 0.01; this.root.add(sh); this.shadow = sh;
    const info = BUILD[this.def.kind](this) || {};
    this.hover = info.hover || 0;
    this.size = info.size || 0.5;
    this.mouth = info.mouth || this.body;
    this.shadowSize = info.shadow || 0.5;
    sh.scale.setScalar(this.shadowSize);
    this.root.traverse((o) => { if (o.isMesh && o !== sh) o.castShadow = o.castShadow && !o.material.transparent; });
    this.starFx = null;
    this.setStars(stars);
  }
  on(fn) { this.ticks.push(fn); }
  particles(kind) {
    if (!this.ps.has(kind)) {
      const p = new Particles(this.world, kind === 'dot' ? 400 : 220, PTEX[kind](), kind === 'puff' ? THREE.NormalBlending : THREE.AdditiveBlending);
      p.mat.uniforms.scale.value = this.pscale;
      p.points.renderOrder = 6;
      this.ps.set(kind, p);
    }
    return this.ps.get(kind);
  }
  emit(kind, o) { this.particles(kind).emit(o); }
  setViewport(height, fovDeg) { this.pscale = height / (2 * Math.tan((fovDeg * PI) / 360)); for (const p of this.ps.values()) p.mat.uniforms.scale.value = this.pscale; }
  wp(obj = this.body, x = 0, y = 0, z = 0) { return obj.localToWorld(V(x, y, z)); }
  mouthPos() { return this.wp(this.mouth); }
  // ทรงกลมที่ครอบตัวสัตว์เลี้ยง (ใช้จัดกล้อง/รูปย่อ) — นับเฉพาะ mesh ใน body ไม่นับสไปรต์เรืองแสง
  bounds() {
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3(), b = new THREE.Box3();
    this.body.traverse((o) => { if (o.isMesh && !o.userData.outline && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(b); } });
    const sp = new THREE.Sphere(); box.getBoundingSphere(sp);
    const inv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    sp.center.applyMatrix4(inv);
    return sp;
  }
  pick() { this.pickT = 1; this.evPick = true; }
  cheer() { this.happyT = 1; this.evHappy = true; }
  // ★5: ออร่าทองใต้เท้า + ประกายขึ้นรอบตัว
  setStars(n) {
    this.stars = n;
    if (n >= 5 && !this.starFx) {
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: TX.softRing(), color: lin('#ffd36b'), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -PI / 2; ring.position.y = 0.02; ring.scale.setScalar(this.shadowSize * 2.1);
      this.root.add(ring); this.starFx = ring;
    }
    if (this.starFx) this.starFx.visible = n >= 5;
  }
  update(dt, { moving = false, speed = 1 } = {}) {
    this.t += dt;
    this.run += ((moving ? 1 : 0) - this.run) * (1 - Math.exp(-10 * dt));
    this.ph += dt * 11 * speed * (0.3 + 0.7 * this.run);
    if (this.pickT > 0) this.pickT = Math.max(0, this.pickT - dt / 0.5);
    if (this.happyT > 0) this.happyT = Math.max(0, this.happyT - dt / 1.1);
    const pk = this.pickT > 0 ? Math.sin((1 - this.pickT) * PI) : 0;
    const hp = this.happyT > 0 ? 1 - this.happyT : -1;
    // ท่าดีใจ: กระโดด + หมุนรอบตัว
    const jump = hp >= 0 ? Math.abs(Math.sin(hp * PI * 2)) * 0.18 : 0;
    const spin = hp >= 0 ? (hp < 0.5 ? 0 : (1 - Math.cos((hp - 0.5) * 2 * PI)) / 2) * PI * 2 : 0;
    this.body.position.y = this.hover + jump;
    this.body.rotation.y = spin;
    // กะพริบตา
    this.blinkAt -= dt;
    const closed = this.blinkAt < 0 || hp >= 0 && hp < 0.5;
    for (const e of this.eyes) e.scale.y = closed ? 0.12 : 1;
    if (this.blinkAt < -0.12) this.blinkAt = 2 + Math.random() * 3;
    const ctx = { t: this.t, dt, run: this.run, ph: this.ph, pk, hp, load: this.load, ev: this.evPick };
    for (const fn of this.ticks) fn(ctx);
    if (this.evPick) this.emit('star', { pos: this.mouthPos(), count: 6, speed: [0.3, 0.7], drag: 3, life: [0.3, 0.6], size: [0.06, 0.1], color: ['#ffffff', '#ffe9a0'] });
    if (this.evHappy) this.emit('heart', { pos: this.wp(this.body, 0, this.size * 0.9, 0), count: 4, vel: () => V(rand(-0.35, 0.35), rand(0.6, 0.9), rand(-0.2, 0.2)), life: [0.8, 1.1], size: [0.1, 0.14], sizeEnd: 0.8, color: ['#ff6a9a', '#ff9ac0'] });
    if (this.starFx && this.starFx.visible) {
      this.starFx.material.opacity = 0.55 + Math.sin(this.t * 3) * 0.2;
      if (Math.random() < dt * 6) this.emit('star', { pos: this.wp(this.root, rand(-0.35, 0.35), rand(0.05, 0.2), rand(-0.35, 0.35)), count: 1, vel: () => V(0, rand(0.3, 0.6), 0), life: [0.6, 1], size: [0.05, 0.09], color: ['#ffe9a0', '#ffd36b'] });
    }
    this.evPick = this.evHappy = false;
    // เงาจางลงเมื่อลอยสูง
    this.shadow.material.opacity = 0.55 * (1 - Math.min(0.5, this.body.position.y * 0.35));
    for (const p of this.ps.values()) p.update(dt);
  }
  dispose() {
    for (const p of this.ps.values()) { p.points.parent && p.points.parent.remove(p.points); p.points.geometry.dispose(); p.mat.dispose(); }
    this.ps.clear();
    if (this.root.parent) this.root.parent.remove(this.root);
  }
}

/* ================= ไข่สัตว์เลี้ยง ================= */
const eggTex = (id) => ctex('egg' + id, 256, 256, (g, w, h) => {
  const e = PET_EGGS[id], r = seeded(id.length * 97 + 3);
  const gr = g.createLinearGradient(0, 0, 0, h);
  if (id === 'egg_spot') { gr.addColorStop(0, '#fff8e6'); gr.addColorStop(1, '#efdcb4'); }
  else if (id === 'egg_moon') { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#e2e8f6'); gr.addColorStop(1, '#b8c4e2'); }
  else { gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.45, '#ffd36b'); gr.addColorStop(1, '#e89a2a'); }
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (id === 'egg_spot') {
    for (let i = 0; i < 26; i++) { const x = r() * w, y = 20 + r() * (h - 40), s = 6 + r() * 16; g.fillStyle = r() < 0.6 ? e.spot : '#c89a5a'; g.beginPath(); g.ellipse(x, y, s, s * 0.8, r() * PI, 0, PI * 2); g.fill(); }
  } else if (id === 'egg_moon') {
    for (let i = 0; i < 12; i++) { const x = r() * w, y = 30 + r() * (h - 60), s = 10 + r() * 10; g.fillStyle = e.spot; g.beginPath(); g.arc(x, y, s, 0, PI * 2); g.fill(); g.fillStyle = '#e2e8f6'; g.beginPath(); g.arc(x + s * 0.45, y - s * 0.2, s * 0.9, 0, PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { g.globalAlpha = 0.6 + r() * 0.4; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 1.6, 0, PI * 2); g.fill(); }
  } else {
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 5;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(0, 40 + i * 45); g.bezierCurveTo(w * 0.3, 10 + i * 45, w * 0.6, 80 + i * 45, w, 30 + i * 45); g.stroke(); }
    for (let i = 0; i < 16; i++) {
      const x = r() * w, y = 20 + r() * (h - 40), s = 7 + r() * 9; g.fillStyle = r() < 0.7 ? e.spot : '#ff4a9a';
      g.beginPath(); for (let k = 0; k <= 10; k++) { const a = -PI / 2 + (k / 10) * PI * 2, rr = k % 2 ? s * 0.45 : s; k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill();
    }
  }
  // รอยหยักกลางไข่ (จุดที่จะแตก)
  g.strokeStyle = 'rgba(90,60,40,0.35)'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= w; x += 16) g.lineTo(x, h / 2 + ((x / 16) % 2 ? -6 : 6));
  g.stroke();
});

export class EggView {
  constructor(id) {
    this.id = id;
    this.root = new THREE.Group();
    this.body = group(this.root, 0, 0.32, 0);
    const mat = TM('#ffffff', eggTex(id), id === 'egg_galaxy' ? { emissive: lin('#5a3a00'), emissiveIntensity: 0.5 } : id === 'egg_moon' ? { emissive: lin('#2a3a6a'), emissiveIntensity: 0.35 } : {});
    const S = [0.85, 1.12, 0.85];
    this.top = group(this.body);
    this.bot = group(this.body);
    const tm = mesh(new THREE.SphereGeometry(0.28, 28, 14, 0, PI * 2, 0, PI / 2), mat, this.top, 0, 0, 0, { s: S });
    const bm = mesh(new THREE.SphereGeometry(0.28, 28, 14, 0, PI * 2, PI / 2, PI / 2), mat, this.bot, 0, 0, 0, { s: S });
    tm.material.side = THREE.DoubleSide;
    addOutline(tm, 0.012); addOutline(bm, 0.012);
    this.glow = glowSprite(this.body, id === 'egg_galaxy' ? '#ffd36b' : id === 'egg_moon' ? '#9ab8ff' : '#fff2c8', 1.0, id === 'egg_spot' ? 0.15 : 0.35);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.5 }));
    sh.rotation.x = -PI / 2; sh.position.y = 0.01; this.root.add(sh);
    this.t = Math.random() * 5; this.shake = 0; this.open = -1;
  }
  hatch() { this.open = 0; }
  update(dt) {
    this.t += dt;
    const s = this.shake;
    this.body.rotation.z = Math.sin(this.t * (8 + s * 30)) * (0.04 + s * 0.22);
    this.body.rotation.x = Math.sin(this.t * (6 + s * 24) + 1) * s * 0.08;
    this.body.position.y = 0.32 + Math.abs(Math.sin(this.t * 3)) * 0.02 + (s > 0.7 ? Math.abs(Math.sin(this.t * 20)) * 0.04 : 0);
    this.glow.material.opacity = (this.id === 'egg_spot' ? 0.15 : 0.35) + Math.sin(this.t * 2.5) * 0.08 + s * 0.6;
    if (this.open >= 0) {
      this.open += dt;
      const k = Math.min(1, this.open / 0.7);
      this.top.position.set(-k * 0.25, k * 0.55 - k * k * 0.25, 0);
      this.top.rotation.z = k * 1.4;
      this.bot.scale.setScalar(Math.max(0.001, 1 - Math.max(0, this.open - 0.35) * 1.6));
      this.top.scale.setScalar(Math.max(0.001, 1 - Math.max(0, this.open - 0.35) * 1.6));
      this.glow.material.opacity = Math.max(0, 1 - this.open) * 1.2;
    }
  }
}
