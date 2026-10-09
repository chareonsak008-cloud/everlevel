// สัตว์เลี้ยงช่วยเก็บของ — v0.17 ออกแบบใหม่ทั้งหมดสำหรับสไปรต์พิกเซล (render/PixelSprites.js) · สร้างโมเดลจากโค้ด
// ใช้:  const pet = new PetView('hamster', { world: scene });  scene.add(pet.root);
//       ทุกเฟรม pet.update(dt, { moving, speed })  ·  pet.pick() = ท่าเก็บของ  ·  pet.cheer() = ท่าดีใจ
//       pet.load = 0..1 (ของเต็มตัวแค่ไหน) · pet.mouth = จุดที่ของลอยเข้าไป · pet.range = รัศมี (หน่วยโลก ใช้กับเอฟเฟกต์)
import { THREE } from './three.js';
import { toon, bake, addOutline, gradientMap } from './Toon.js';
import { shadeHex, blobShadowTexture } from './Textures.js';
import { mergeGeometries } from './Geo.js';
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
// โลหะ/อัญมณี: สไปรต์พิกเซลจะลงเงาตัดจัด + จุดสะท้อนแสง
const metal = (c, glow = 0) => { const m = T(c, { emissive: shadeHex(c, -0.75), emissiveIntensity: 1 + glow }); m.userData.pxMetal = true; return m; };
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
const rock = (r) => new THREE.DodecahedronGeometry(r, 0);   // หินเหลี่ยม (เงาพิกเซลเป็นระนาบชัด)
const bez = (a, b, c, n = 8) => new THREE.QuadraticBezierCurve3(a, b, c).getPoints(n);
const bez3 = (a, b, c, d, n = 10) => new THREE.CubicBezierCurve3(a, b, c, d).getPoints(n);
const lathe = (pts, n = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), n);
// ผิวเป็นลอน (ขน เกล็ด ผ้า) — เกิดรอยพับเวลาลงเงาพิกเซล
function ridges(geo, n = 10, amp = 0.02) {
  const p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const s = 1 + (Math.sin(Math.atan2(v.z, v.x) * n) * amp) / r; p.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  geo.computeVertexNormals(); return geo;
}
// ท่อเรียวตามเส้นโค้ง (หาง คอ หนวด แผงคอ) · radii = รัศมีตามความยาว · flat = บีบแบน
function tube(points, radii, radial = 10, seg = 24, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : V(...p))));
  const fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  const rAt = (u) => { const k = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(k)), f = k - i; return radii[i] * (1 - f) + radii[i + 1] * f; };
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), r = rAt(u), N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * PI * 2, cx = Math.cos(a) * r, cy = Math.sin(a) * r * flat;
      pos.push(P.x + cx * N.x + cy * B.x, P.y + cx * N.y + cy * B.y, P.z + cx * N.z + cy * B.z);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.userData.curve = curve; g.userData.rAt = rAt;
  return g;
}
// กรวยแหลมวางตามทิศ (ขนเป็นช่อ เขา หนาม เปลวไฟ)
function spike(base, dir, len, rad, n = 6, flat = 1) {
  const g = cone(rad, len, n).translate(0, len / 2, 0); if (flat !== 1) g.scale(1, 1, flat);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)).translate(base.x, base.y, base.z);
}
// ขนฟูเป็นช่อรอบทรงรี · keep(n) = เลือกทิศ · droop = ห้อยลง
function fur(center, rx, ry, rz, count, len, rad, { keep = () => true, droop = 0.3, seed = 1, n = 5 } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + seed;
    const d = V(Math.cos(a) * r, y, Math.sin(a) * r);
    if (!keep(d)) continue;
    const base = V(center.x + d.x * rx * 0.9, center.y + d.y * ry * 0.9, center.z + d.z * rz * 0.9);
    out.push(spike(base, d.clone().add(V(0, -droop, 0)).normalize(), len * (0.8 + ((i * 0.37) % 0.4)), rad, n, 0.6));
  }
  return out;
}
// ขนฟูตามแนวท่อ (หางกระรอก หางจิ้งจอก แผงคอ)
function tubeFur(geo, count, len, rad, { from = 0.1, to = 0.95, side = 1, up = V(0, 1, 0) } = {}) {
  const cv = geo.userData.curve, out = [];
  for (let i = 0; i < count; i++) {
    const u = from + (to - from) * (i / Math.max(1, count - 1)), p = cv.getPointAt(u), t = cv.getTangentAt(u), r = geo.userData.rAt(u);
    const n0 = up.clone().sub(t.clone().multiplyScalar(up.dot(t))).normalize();
    for (const k of [-1, 0, 1]) {
      const d = n0.clone().applyAxisAngle(t, k * 1.1 * side).add(t.clone().multiplyScalar(-0.35)).normalize();
      out.push(spike(p.clone().add(d.clone().multiplyScalar(r * 0.8)), d, len * (0.85 + ((i * 0.31 + k) % 0.3)), rad, 5, 0.6));
    }
  }
  return out;
}
const merged = (list) => mergeGeometries(list);
// ท่อเรียวต่อเป็นข้อ (เขา หนวด กระดูกปีก) — ต่อทรงกระบอกตามจุด
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
// แผ่นรูปทรง 2 มิติ (ปีกพังผืด ครีบ)
function shapeGeo(draw) { const sh = new THREE.Shape(); draw(sh); return new THREE.ShapeGeometry(sh, 10); }
// จุดบนผิวทรงรี (center, รัศมี 3 แกน, ทิศ)
const onEllipsoid = (c, rx, ry, rz, dx, dy, dz) => { const v = V(dx, dy, dz).normalize(); return V(c.x + v.x * rx, c.y + v.y * ry, c.z + v.z * rz); };

/* ---------- เท็กซ์เจอร์วาดด้วย Canvas ---------- */
const texCache = new Map();
function ctex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
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
const starShape = (sh, r1, r2, n = 5, rot = PI / 2) => {
  for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
};
const extrude = (draw, depth = 0.02, bevel = 0.006) => {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -depth / 2); return g;
};

/* ---------- ใบหน้า: ตาโต + แก้มแดง ---------- */
function eyes(P, parent, x, y, z, r, { color = '#1e1420', tilt = 0 } = {}) {
  for (const s of [-1, 1]) {
    const e = group(parent, s * x, y, z);
    e.rotation.y = s * tilt;
    mesh(sph(r, 12, 10), T(color), e, 0, 0, 0, { s: [1, 1.18, 0.55], keep: true, noOutline: true, shadow: false });
    mesh(sph(r * 0.38, 8, 6), WHITE, e, -r * 0.3, r * 0.4, r * 0.4, { keep: true, noOutline: true, shadow: false });
    mesh(sph(r * 0.17, 6, 4), WHITE, e, r * 0.3, -r * 0.32, r * 0.42, { keep: true, noOutline: true, shadow: false });
    P.eyes.push(e);
  }
}
const BLUSH = () => toon('#ff8aa8', { transparent: true, opacity: 0.6 });
function blush(parent, x, y, z, r) {
  for (const s of [-1, 1]) mesh(sph(r, 10, 6), BLUSH(), parent, s * x, y, z, { s: [1.3, 0.7, 0.4], keep: true, noOutline: true, shadow: false });
}
const glowSprite = (parent, color, size, opacity = 0.7, x = 0, y = 0, z = 0) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); s.position.set(x, y, z); parent.add(s); return s;
};
// ขาที่หมุนจากสะโพก
const legs4 = (parent, xs, y, zs, build) => [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => {
  const l = group(parent, sx * xs, y, sz * zs); build(l, sx, sz); bake(l); return l;
});

/* ================= สัตว์เลี้ยงแต่ละตัว ================= */
const BUILD = {
  /* ---------- ธรรมดา: แฮมสเตอร์แก้มตุ่ย นั่งกอดเมล็ดทานตะวัน ---------- */
  hamster(P) {
    const c = '#eaa65c', c2 = '#c8803a', cream = '#fff4e0', pink = '#ffa8b4';
    const m = group(P.body); m.scale.setScalar(1.3);
    const b = group(m);
    mesh(ridges(lathe([[0, 0], [0.15, 0.01], [0.2, 0.07], [0.215, 0.15], [0.2, 0.23], [0.16, 0.3], [0.1, 0.345], [0, 0.36]], 28), 14, 0.004), T(c), b, 0, 0, 0, { s: [1, 1, 0.95] });
    mesh(sph(0.17, 16, 12), T(c2), b, 0, 0.22, -0.055, { s: [0.95, 0.78, 0.9] });   // ขนหลังสีเข้ม
    mesh(sph(0.15, 16, 12), T(cream), b, 0, 0.13, 0.085, { s: [0.92, 1, 0.8] });    // พุงขาว
    mesh(sph(0.075, 14, 10), T(cream), b, 0, 0.2, 0.15, { s: [1.2, 0.82, 0.8] });   // ปาก/จมูกขาว
    mesh(sph(0.022, 8, 6), T('#ff7a8e'), b, 0, 0.226, 0.205);
    mesh(sph(0.009, 6, 4), T('#5a2a30'), b, 0, 0.197, 0.208);
    for (const s of [-1, 1]) {
      mesh(sph(0.062, 12, 8), T(c), b, s * 0.115, 0.325, -0.01, { s: [1, 1, 0.45], r: [0, 0, -s * 0.35] });
      mesh(sph(0.042, 10, 8), T(pink), b, s * 0.115, 0.325, 0.012, { s: [1, 1, 0.3], r: [0, 0, -s * 0.35] });
      mesh(sph(0.042, 10, 8), T(pink), b, s * 0.09, 0.015, 0.12, { s: [0.9, 0.5, 1.4] });   // เท้า
    }
    for (const [x, a] of [[-0.025, 0.35], [0, 0], [0.025, -0.35]]) mesh(cone(0.016, 0.06, 5), T(c2), b, x, 0.355, 0.0, { r: [-0.4, 0, a] });   // ขนจุกบนหัว
    mesh(sph(0.032, 8, 6), T(c), b, 0, 0.05, -0.2);
    bake(b);
    eyes(P, b, 0.07, 0.252, 0.165, 0.034);
    blush(b, 0.125, 0.205, 0.15, 0.028);
    const cheeks = [-1, 1].map((s) => { const ch = mesh(sph(0.06, 14, 10), T(cream), b, s * 0.125, 0.185, 0.11, { keep: true }); addOutline(ch); return ch; });
    // อุ้งมือกอดเมล็ดทานตะวัน
    const pw = group(m, 0, 0.15, 0.19);
    for (const s of [-1, 1]) mesh(sph(0.03, 10, 8), T(pink), pw, s * 0.045, 0, 0, { s: [1, 0.9, 1] });
    mesh(sph(0.028, 10, 8), T('#3a3236'), pw, 0, 0.012, 0.012, { s: [0.8, 1.55, 0.6] });
    mesh(sph(0.028, 10, 8), T('#ece4d6'), pw, 0, 0.012, 0.014, { s: [0.28, 1.5, 0.62] });
    bake(pw);
    P.on(({ t, run, ph, pk, load }) => {
      m.position.y = Math.abs(Math.sin(ph)) * 0.06 * run;
      const br = Math.sin(t * 3) * 0.018 * (1 - run);
      b.scale.set(1 + br, 1 - br, 1);
      m.rotation.x = 0.12 * run + pk * 0.45;
      m.rotation.z = Math.sin(ph) * 0.08 * run;
      pw.position.y = 0.15 + Math.sin(t * 5) * 0.006 + pk * 0.05;
      pw.rotation.x = -pk * 0.6;
      const puff = 1 + load * 0.5 + pk * 0.25;
      cheeks.forEach((ch) => ch.scale.setScalar(puff));
    });
    return { size: 0.48, shadow: 0.62, mouth: group(b, 0, 0.2, 0.19) };
  },

  /* ---------- ธรรมดา: กระรอกกอดลูกโอ๊ค หางฟูเป็นตัว S ---------- */
  squirrel(P) {
    const c = '#d97a3a', c2 = '#b55a26', cream = '#ffe8c8', dark = '#5e321a';
    const m = group(P.body); m.scale.setScalar(1.25);
    const b = group(m);
    mesh(ridges(lathe([[0, 0.02], [0.09, 0.03], [0.125, 0.09], [0.13, 0.16], [0.11, 0.23], [0.07, 0.27], [0, 0.28]], 24), 12, 0.003), T(c), b);
    mesh(sph(0.095, 14, 10), T(cream), b, 0, 0.14, 0.055, { s: [0.85, 1.05, 0.72] });
    for (const s of [-1, 1]) {
      mesh(sph(0.07, 12, 10), T(c), b, s * 0.09, 0.07, -0.01, { s: [0.75, 0.95, 1.15] });
      mesh(sph(0.036, 10, 8), T(c2), b, s * 0.07, 0.016, 0.075, { s: [0.8, 0.5, 1.6] });
    }
    bake(b);
    const ac = group(m, 0, 0.17, 0.115);
    mesh(sph(0.044, 12, 10), T('#c98a46'), ac, 0, -0.012, 0, { s: [1, 1.2, 1] });
    mesh(ridges(sph(0.049, 14, 8), 10, 0.003), T('#6e4424'), ac, 0, 0.026, 0, { s: [1, 0.55, 1] });
    mesh(cyl(0.006, 0.008, 0.03, 6), T(dark), ac, 0, 0.058, 0);
    for (const s of [-1, 1]) mesh(sph(0.027, 10, 8), T(c), ac, s * 0.048, 0.0, 0.012, { s: [0.8, 1.3, 0.9] });
    bake(ac);
    const h = group(m, 0, 0.33, 0.03);
    mesh(sph(0.1, 16, 12), T(c), h, 0, 0, 0, { s: [1.08, 0.95, 1] });
    mesh(sph(0.062, 12, 10), T(cream), h, 0, -0.035, 0.064, { s: [1.18, 0.78, 0.82] });
    mesh(sph(0.016, 8, 6), T('#3a2016'), h, 0, -0.012, 0.116);
    const hf = [];
    for (const s of [-1, 1]) {
      mesh(cone(0.036, 0.095, 8), T(c), h, s * 0.06, 0.1, -0.02, { r: [0, 0, -s * 0.25] });
      mesh(cone(0.02, 0.055, 6), T('#ffb0a0'), h, s * 0.06, 0.095, -0.002, { r: [0, 0, -s * 0.25], s: [1, 1, 0.4] });
      hf.push(spike(V(s * 0.075, 0.14, -0.02), V(s * 0.45, 1, -0.1), 0.07, 0.016, 5));    // ขนพู่ปลายหู
      hf.push(spike(V(s * 0.085, -0.03, 0.03), V(s, -0.35, 0.25), 0.045, 0.02, 5));       // ขนแก้ม
    }
    mesh(merged(hf.filter((_, i) => i % 2 === 0)), T(dark), h);
    mesh(merged(hf.filter((_, i) => i % 2 === 1)), T(cream), h);
    bake(h);
    eyes(P, h, 0.046, 0.012, 0.087, 0.028);
    blush(h, 0.072, -0.03, 0.074, 0.02);
    // หางฟู: ท่อโค้ง + ขนเป็นช่อ + ปลายสีครีม
    const tl = group(m, 0, 0.08, -0.1);
    const tg = tube([[0, 0, 0], [0, 0.06, -0.12], [0, 0.22, -0.2], [0, 0.4, -0.16], [0, 0.48, -0.04], [0, 0.44, 0.05]], [0.045, 0.085, 0.11, 0.105, 0.08, 0.045], 12, 32);
    mesh(tg, T(c), tl);
    mesh(merged(tubeFur(tg, 9, 0.07, 0.035, { from: 0.15, to: 0.8, up: V(0, 0.3, -1) })), T(c2), tl);
    mesh(sph(0.055, 12, 10), T(cream), tl, 0, 0.455, 0.035);
    mesh(merged(fur(V(0, 0.455, 0.035), 0.05, 0.05, 0.05, 10, 0.045, 0.026, { keep: (d) => d.z > -0.2, droop: 0.1 })), T(cream), tl);
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
    return { size: 0.7, shadow: 0.5, mouth: group(ac, 0, 0, 0.03) };
  },

  /* ---------- หายาก: เต่ากระดองหีบสมบัติ ผ้าพันคอแดง ---------- */
  turtle(P) {
    const g = '#6cc070', g2 = '#4e9a52', belly = '#efe6a8', wood = '#b06a32', wood2 = '#7a4220', gold = '#ffcf4a';
    const GOLD = metal(gold);
    const m = group(P.body); m.scale.setScalar(1.25);
    const W = 0.36, H = 0.14, D = 0.38, by = 0.17;
    const sh = group(m);
    mesh(box(W, H, D), T(wood), sh, 0, by, 0);
    for (const x of [-0.06, 0.06]) mesh(box(0.008, H * 0.86, D + 0.004), T(wood2), sh, x, by, 0);
    for (const z of [-0.09, 0.09]) mesh(box(W + 0.004, H * 0.86, 0.008), T(wood2), sh, 0, by, z);
    mesh(box(W + 0.02, 0.026, D + 0.02), GOLD, sh, 0, by - H / 2 + 0.012, 0);
    mesh(box(W + 0.02, 0.02, D + 0.02), GOLD, sh, 0, by + H / 2 - 0.008, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      mesh(box(0.05, H + 0.012, 0.05), GOLD, sh, sx * (W / 2 - 0.014), by, sz * (D / 2 - 0.014));
      mesh(sph(0.011, 6, 4), GOLD, sh, sx * (W / 2 + 0.01), by + 0.01, sz * (D / 2 - 0.05));
    }
    mesh(box(W - 0.04, 0.03, D - 0.04), T(belly), sh, 0, by - H / 2 - 0.012, 0);
    mesh(cone(0.032, 0.08, 6), T(g), sh, 0, 0.11, -D / 2 - 0.03, { r: [-PI / 2 - 0.35, 0, 0] });
    bake(sh);
    // สมบัติข้างใน (เห็นตอนเปิดฝา)
    const tr = group(m, 0, by + H / 2, 0);
    for (let i = 0; i < 7; i++) mesh(cyl(0.03, 0.03, 0.01, 12), metal('#ffd84a', 0.3), tr, rand(-0.12, 0.12), 0.006 + i * 0.002, rand(-0.12, 0.12), { r: [rand(-0.2, 0.2), 0, rand(-0.2, 0.2)] });
    mesh(oct(0.035), G('#ff4a7a', 0.8), tr, 0.05, 0.03, 0.02, { s: [1, 1.3, 1] });
    mesh(oct(0.028), G('#4ad8ff', 0.8), tr, -0.06, 0.025, -0.04, { s: [1, 1.3, 1] });
    bake(tr, { outline: false });
    const trGlow = glowSprite(tr, '#ffd36b', 0.55, 0, 0, 0.05, 0);
    // ฝาหีบโค้ง (บานพับด้านหลัง)
    const lid = group(m, 0, by + H / 2, -D / 2);
    const dome = (r, w) => { const geo = new THREE.CylinderGeometry(r, r, w, 18, 1, false, 0, PI); geo.rotateZ(PI / 2); geo.scale(1, 0.55, 1); return geo; };
    mesh(dome(D / 2, W), T(wood), lid, 0, 0, D / 2);
    for (const x of [-0.06, 0.06]) mesh(dome(D / 2 + 0.003, 0.008), T(wood2), lid, x, 0, D / 2);
    for (const s of [-1, 1]) mesh(dome(D / 2 + 0.008, 0.034), GOLD, lid, s * (W / 2 - 0.03), 0, D / 2);
    mesh(box(W - 0.01, 0.01, D - 0.01), T(shadeHex(wood, -0.35)), lid, 0, 0.004, D / 2);
    mesh(box(0.07, 0.08, 0.024), GOLD, lid, 0, -0.012, D + 0.012);
    mesh(box(0.014, 0.026, 0.01), T('#3a2410'), lid, 0, -0.018, D + 0.026);
    bake(lid);
    // หัว + ผ้าพันคอ + ขา
    const hd = group(m, 0, 0.17, D / 2 + 0.02);
    mesh(cyl(0.05, 0.058, 0.1, 10), T(g), hd, 0, -0.02, -0.02, { r: [PI / 2.4, 0, 0] });
    mesh(sph(0.1, 16, 12), T(g), hd, 0, 0.05, 0.06, { s: [1, 0.92, 1.08] });
    mesh(sph(0.075, 14, 10), T(belly), hd, 0, 0.015, 0.1, { s: [1.05, 0.62, 0.9] });   // คางสีอ่อน
    mesh(sph(0.006, 6, 4), T('#2a3a20'), hd, 0.022, 0.06, 0.162);
    mesh(sph(0.006, 6, 4), T('#2a3a20'), hd, -0.022, 0.06, 0.162);
    mesh(torus(0.06, 0.02, 8, 18), T('#e04a4a'), hd, 0, -0.02, 0.0, { r: [PI / 2 - 0.4, 0, 0] });
    mesh(sph(0.03, 8, 6), T('#e04a4a'), hd, 0.05, -0.04, 0.035, { s: [1, 0.6, 1.4], r: [0, 0, 0.5] });
    bake(hd);
    eyes(P, hd, 0.048, 0.075, 0.138, 0.028);
    blush(hd, 0.07, 0.035, 0.125, 0.022);
    const legs = legs4(m, 0.16, 0.1, 0.13, (l) => {
      mesh(sph(0.058, 10, 8), T(g), l, 0, -0.045, 0, { s: [1, 1.1, 1.2] });
      for (const x of [-0.025, 0, 0.025]) mesh(sph(0.014, 6, 4), T(belly), l, x, -0.085, 0.055);
    });
    P.on(({ t, run, ph, pk, hp }) => {
      m.rotation.z = Math.sin(ph) * 0.06 * run;
      m.position.y = Math.abs(Math.sin(ph)) * 0.02 * run;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : PI)) * 0.6 * run; });
      const peek = Math.max(0, Math.sin(t * 0.8) - 0.92) * 2;
      const open = Math.max(pk, hp >= 0 ? Math.sin(hp * PI) : 0, peek);
      lid.rotation.x = -open * 1.15;
      trGlow.material.opacity = open * 0.9;
      hd.position.z = D / 2 + 0.02 + Math.sin(t * 1.3) * 0.01 - pk * 0.03;
      hd.rotation.x = pk * 0.35;
    });
    return { size: 0.5, shadow: 0.85, mouth: group(tr, 0, 0.04, 0) };
  },

  /* ---------- หายาก: นกไปรษณีย์ หมวก + กระเป๋าจดหมาย ---------- */
  finch(P) {
    const c = '#4f9cf0', c2 = '#2f68c4', belly = '#fff1d0', cap = '#2b3f8a', beak = '#ffab3a';
    const m = group(P.body); m.scale.setScalar(1.3);
    const b = group(m);
    mesh(sph(0.13, 18, 14), T(c), b, 0, 0, 0, { s: [1, 0.95, 1.1] });
    mesh(sph(0.105, 16, 12), T(belly), b, 0, -0.03, 0.05, { s: [0.92, 0.88, 0.86] });
    mesh(sph(0.1, 16, 12), T(c), b, 0, 0.11, 0.06);
    mesh(sph(0.07, 12, 10), T(belly), b, 0, 0.085, 0.105, { s: [1.15, 0.8, 0.7] });
    mesh(cone(0.028, 0.065, 8), T(beak), b, 0, 0.1, 0.18, { r: [PI / 2, 0, 0] });
    mesh(cone(0.02, 0.035, 8), T('#e0802a'), b, 0, 0.083, 0.165, { r: [PI / 2 + 0.3, 0, 0] });
    const tf = [];
    for (const i of [-1, 0, 1]) tf.push(spike(V(i * 0.022, 0.0, -0.12), V(i * 0.35, 0.35, -1), 0.15, 0.03, 4, 0.3));
    mesh(merged(tf), T(c2), b);
    for (const s of [-1, 1]) { mesh(cyl(0.006, 0.006, 0.05, 5), T(beak), b, s * 0.035, -0.12, 0.01); mesh(sph(0.012, 6, 4), T(beak), b, s * 0.035, -0.145, 0.02, { s: [1, 0.5, 1.6] }); }
    // กระเป๋าพัสดุ + จดหมาย + สาย
    mesh(box(0.075, 0.066, 0.036), T('#b07040'), b, 0.112, -0.05, 0.02, { r: [0, 0, 0.15] });
    mesh(box(0.078, 0.028, 0.04), T('#7a4a2a'), b, 0.115, -0.022, 0.02, { r: [0, 0, 0.15] });
    mesh(box(0.05, 0.034, 0.008), T('#ffffff'), b, 0.105, -0.004, 0.032, { r: [0, 0, 0.35] });
    mesh(sph(0.009, 6, 4), T('#e03a3a'), b, 0.106, -0.004, 0.037);
    const strap = mesh(torus(0.118, 0.008, 6, 26), T('#7a4a2a'), b, 0.0, -0.005, 0.0);
    strap.quaternion.setFromUnitVectors(V(0, 0, 1), V(1, 0.75, 0).normalize());
    // หมวกบุรุษไปรษณีย์
    mesh(cyl(0.058, 0.064, 0.045, 14), T(cap), b, 0, 0.185, 0.055);
    mesh(cyl(0.064, 0.064, 0.008, 14), T(shadeHex(cap, -0.3)), b, 0, 0.166, 0.085, { s: [1, 1, 0.8] });
    mesh(cyl(0.06, 0.06, 0.008, 14), T('#ffcf4a'), b, 0, 0.17, 0.055);
    mesh(sph(0.014, 8, 6), metal('#ffcf4a'), b, 0, 0.19, 0.115);
    bake(b);
    eyes(P, b, 0.048, 0.125, 0.14, 0.026);
    blush(b, 0.068, 0.09, 0.128, 0.018);
    // ปีก: ก้อนขนแบน 3 ชั้น (มองเห็นได้ทุกมุม)
    const wings = [-1, 1].map((s) => {
      const w = group(b, s * 0.11, 0.03, -0.005);
      mesh(sph(0.075, 12, 8), T(c), w, s * 0.05, 0, 0, { s: [1, 0.3, 0.8] });
      mesh(sph(0.06, 12, 8), T(c2), w, s * 0.1, -0.006, -0.02, { s: [1, 0.25, 0.7] });
      mesh(sph(0.04, 10, 6), T(cap), w, s * 0.14, -0.01, -0.035, { s: [1, 0.22, 0.6] });
      bake(w); return w;
    });
    P.on(({ t, run, pk }) => {
      const a = Math.sin(t * (run > 0.5 ? 28 : 19)) * 0.9;
      wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * a; });
      m.position.y = Math.sin(t * 3) * 0.03 - pk * 0.3;
      m.rotation.x = 0.35 * run + pk * 0.55;
      m.rotation.z = Math.sin(t * 1.7) * 0.06;
    });
    return { hover: 0.55, size: 0.42, shadow: 0.4, mouth: group(b, 0, 0.08, 0.18) };
  },

  /* ---------- ล้ำค่า: โกเลมหินแม่เหล็ก มือหินลอย ---------- */
  golem(P) {
    const glow = '#6ff4ff', red = '#ff4a5a';
    const SM = T('#8e8ba8'), SM2 = T('#aaa8c6'), SM3 = T('#6e6a8a'), MOSS = T('#7ac86a');
    const m = group(P.body); m.scale.setScalar(1.2);
    const b = group(m);
    mesh(rock(0.15), SM, b, 0, 0.25, 0, { s: [1.1, 1, 0.9] });
    for (const s of [-1, 1]) {
      mesh(rock(0.066), SM2, b, s * 0.12, 0.34, 0.0);          // ไหล่
      mesh(rock(0.07), SM3, b, s * 0.075, 0.07, 0.01, { s: [1, 1.1, 1.1] });   // ขา
    }
    mesh(rock(0.05), SM2, b, 0.07, 0.17, 0.11, { s: [1, 0.6, 0.6] });
    mesh(new THREE.SphereGeometry(0.075, 10, 6, 0, PI * 2, 0, PI * 0.45), MOSS, b, 0.02, 0.3, -0.04, { s: [1.3, 0.8, 1.1] });
    mesh(sph(0.04, 8, 6), MOSS, b, -0.1, 0.2, -0.1, { s: [1, 0.5, 1.2] });
    mesh(oct(0.03), G('#8af0ff', 0.5), b, -0.13, 0.4, -0.02, { s: [0.6, 1.5, 0.6], r: [0, 0, 0.4] });   // ผลึกงอกบนไหล่
    bake(b);
    const core = mesh(oct(0.04), G(glow, 1.6), b, 0, 0.25, 0.135, { keep: true, s: [1, 1.3, 0.6], shadow: false });
    const coreGlow = glowSprite(b, glow, 0.24, 0.6, 0, 0.25, 0.16);
    const h = group(m, 0, 0.45, 0.01);
    mesh(rock(0.105), SM2, h, 0, 0, 0, { s: [1.15, 0.9, 1] });
    mesh(box(0.1, 0.012, 0.02), SM3, h, 0, -0.045, 0.085);
    bake(h);
    for (const s of [-1, 1]) {
      const e = group(h, s * 0.045, 0.008, 0.09);
      mesh(box(0.04, 0.026, 0.014), G(glow, 1.8), e, 0, 0, 0, { keep: true, shadow: false });
      P.eyes.push(e);
    }
    // แม่เหล็กเกือกม้าบนหัว
    const mg = group(h, 0, 0.16, 0);
    const u = torus(0.072, 0.026, 8, 18, PI); u.rotateZ(PI);
    mesh(u, T(red), mg, 0, 0, 0);
    for (const s of [-1, 1]) mesh(cyl(0.026, 0.026, 0.05, 10), metal('#e8eef6', 0.2), mg, s * 0.072, 0.025, 0);
    bake(mg);
    const mgGlow = glowSprite(mg, glow, 0.25, 0, 0, 0.06, 0);
    const hands = [-1, 1].map((s) => { const hg = group(m, s * 0.26, 0.22, 0.03); mesh(rock(0.065), SM2, hg); mesh(rock(0.03), SM3, hg, s * 0.02, -0.05, 0.03); bake(hg); return hg; });
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
    return { size: 0.74, shadow: 0.72, mouth: group(m, 0, 0.26, 0.16) };
  },

  /* ---------- ล้ำค่า: จิ้งจอกโคมไฟ หางฟูถือโคมกระดาษ ---------- */
  fox(P) {
    const c = '#f8f3ff', c2 = '#e4d8f6', ac = '#b48aff', dk = '#5a3a98', lantern = '#ffcf6a';
    const m = group(P.body); m.scale.setScalar(1.25);
    const b = group(m);
    mesh(sph(0.12, 16, 12), T(c), b, 0, 0.22, -0.01, { s: [0.85, 0.85, 1.35] });
    mesh(sph(0.1, 14, 10), T(c2), b, 0, 0.255, -0.03, { s: [0.75, 0.6, 1.25] });
    mesh(merged(fur(V(0, 0.25, 0.1), 0.085, 0.09, 0.06, 18, 0.065, 0.03, { keep: (d) => d.z > 0.15 && d.y > -0.6, droop: 0.5 })), T('#ffffff'), b);   // ขนคอฟู
    mesh(torus(0.068, 0.014, 6, 18), T(ac), b, 0, 0.3, 0.1, { r: [PI / 2 - 0.5, 0, 0] });
    mesh(sph(0.024, 8, 6), metal('#ffd36b'), b, 0, 0.262, 0.165);
    bake(b);
    const h = group(m, 0, 0.37, 0.14);
    mesh(sph(0.105, 16, 12), T(c), h, 0, 0, 0, { s: [1.12, 0.95, 1] });
    mesh(cone(0.05, 0.1, 10), T(c), h, 0, -0.03, 0.095, { r: [PI / 2, 0, 0] });
    mesh(sph(0.018, 8, 6), T('#2a1830'), h, 0, -0.03, 0.148);
    const hf = [];
    for (const s of [-1, 1]) {
      mesh(cone(0.055, 0.15, 8), T(c), h, s * 0.066, 0.11, -0.015, { r: [0, 0, -s * 0.28] });
      mesh(cone(0.033, 0.09, 8), T(ac), h, s * 0.064, 0.1, 0.006, { r: [0, 0, -s * 0.28], s: [1, 1, 0.4] });
      mesh(cone(0.026, 0.05, 8), T(dk), h, s * (0.066 + 0.054), 0.11 + 0.06, -0.015, { r: [0, 0, -s * 0.28] });
      for (const k of [0, 1]) hf.push(spike(V(s * 0.1, -0.03 - k * 0.03, 0.0), V(s, -0.25 - k * 0.3, 0.15), 0.06, 0.028, 5));   // ขนแก้มฟู
    }
    mesh(merged(hf), T(c), h);
    bake(h);
    mesh(oct(0.022), G(ac, 1.3), h, 0, 0.06, 0.092, { s: [0.7, 1.2, 0.4], keep: true, shadow: false });
    eyes(P, h, 0.046, 0.012, 0.09, 0.028, { color: '#4a2a7a' });
    blush(h, 0.072, -0.028, 0.08, 0.02);
    const legs = legs4(m, 0.055, 0.15, 0.1, (l) => { mesh(cyl(0.024, 0.02, 0.13, 8), T(c), l, 0, -0.065, 0); mesh(sph(0.029, 8, 6), T(ac), l, 0, -0.13, 0.008, { s: [1, 0.8, 1.2] }); });
    // หางใหญ่โค้งขึ้น ปลายม่วง + โคมกระดาษ
    const tl = group(m, 0, 0.24, -0.15);
    const tg = tube([[0, 0, 0], [0, 0.04, -0.12], [0, 0.18, -0.22], [0, 0.33, -0.2], [0, 0.4, -0.1]], [0.04, 0.075, 0.088, 0.075, 0.04], 12, 30);
    mesh(tg, T(c), tl);
    mesh(merged(tubeFur(tg, 7, 0.06, 0.03, { from: 0.15, to: 0.75, up: V(0, 0.2, -1) })), T(c2), tl);
    mesh(sph(0.05, 12, 10), T(ac), tl, 0, 0.39, -0.11, { s: [1, 1, 1.1] });
    mesh(merged(fur(V(0, 0.39, -0.11), 0.045, 0.045, 0.05, 9, 0.04, 0.022, { droop: 0 })), T(ac), tl);
    bake(tl);
    const lg = group(tl, 0, 0.42, -0.07);
    mesh(cyl(0.004, 0.004, 0.05, 4), T('#4a3a2a'), lg, 0, -0.025, 0);
    const lb = group(lg, 0, -0.05, 0);
    mesh(cyl(0.022, 0.03, 0.014, 10), T(dk), lb, 0, 0.0, 0);
    mesh(cyl(0.03, 0.022, 0.014, 10), T(dk), lb, 0, -0.082, 0);
    mesh(cone(0.012, 0.04, 6), T(ac), lb, 0, -0.11, 0, { r: [PI, 0, 0] });
    bake(lb);
    mesh(ridges(lathe([[0.02, -0.075], [0.038, -0.06], [0.045, -0.04], [0.038, -0.018], [0.02, -0.006]], 16), 8, 0.003), G(lantern, 1.5), lb, 0, 0, 0, { keep: true, shadow: false });
    const lglow = glowSprite(lb, lantern, 0.34, 0.75, 0, -0.04, 0);
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
    return { size: 0.72, shadow: 0.6, mouth: group(h, 0, -0.03, 0.12) };
  },

  /* ---------- ตำนาน: มังกรน้อยออมสิน ตัวทอง กอดเหรียญ ---------- */
  wyrm(P) {
    const gold = '#ffc93a', belly = '#fff0b8', red = '#e8483a', horn = '#fff6e0';
    const GM = T(gold, { emissive: '#6a4400', emissiveIntensity: 0.5 }); GM.userData.pxMetal = true;
    const COIN = metal('#f0a830', 0.3), COIN2 = metal('#ffe070', 0.3);
    const m = group(P.body); m.scale.setScalar(1.2);
    const b = group(m);
    mesh(lathe([[0, -0.15], [0.12, -0.14], [0.165, -0.08], [0.17, 0.0], [0.15, 0.07], [0.1, 0.12], [0, 0.13]], 26), GM, b);
    const bc = V(0, -0.03, 0.06), bry = 0.124, brz = 0.094;
    mesh(sph(0.13, 16, 12), T(belly), b, bc.x, bc.y, bc.z, { s: [0.85, 0.95, 0.72] });
    for (const y of [-0.1, -0.055, -0.01, 0.035]) { const k = Math.sqrt(Math.max(0, 1 - ((y - bc.y) / bry) ** 2)); mesh(box(0.2 * k, 0.008, 0.02), T('#e8c060'), b, 0, y, bc.z + brz * k - 0.004); }   // ลายปล้องท้อง
    mesh(box(0.11, 0.012, 0.045), COIN, b, 0, 0.1, -0.075, { r: [-0.75, 0, 0] });   // ช่องหยอดเหรียญบนหลัง
    mesh(box(0.08, 0.016, 0.02), T('#3a2410'), b, 0, 0.104, -0.078, { r: [-0.75, 0, 0] });
    const sp = [];
    for (const [y, z, k] of [[0.04, -0.15, 1], [-0.02, -0.168, 0.9], [-0.08, -0.17, 0.75]]) sp.push(spike(V(0, y, z), V(0, 0.25, -1), 0.06 * k, 0.025 * k, 5));
    mesh(merged(sp), T(red), b);
    for (const s of [-1, 1]) {
      mesh(sph(0.05, 10, 8), GM, b, s * 0.1, -0.14, 0.07, { s: [1, 0.6, 1.3] });
      for (const x of [-0.02, 0, 0.02]) mesh(sph(0.011, 6, 4), T(horn), b, s * 0.1 + x, -0.15, 0.13);
    }
    bake(b);
    // แขนเล็ก ๆ กอดเหรียญใหญ่
    const cn = group(m, 0, -0.03, 0.155);
    mesh(cyl(0.062, 0.062, 0.018, 20), COIN, cn, 0, 0, 0, { r: [PI / 2, 0, 0] });
    mesh(cyl(0.044, 0.044, 0.022, 18), COIN2, cn, 0, 0, 0.0, { r: [PI / 2, 0, 0] });
    mesh(box(0.012, 0.045, 0.026), T('#c08410'), cn, 0, 0, 0.002);
    for (const s of [-1, 1]) mesh(sph(0.032, 10, 8), GM, cn, s * 0.062, 0.01, -0.012, { s: [0.8, 1.2, 0.9] });
    bake(cn);
    const h = group(m, 0, 0.21, 0.035);
    mesh(sph(0.115, 16, 12), GM, h, 0, 0, 0, { s: [1.05, 0.95, 1] });
    mesh(sph(0.07, 12, 10), GM, h, 0, -0.03, 0.085, { s: [1.15, 0.8, 1] });
    mesh(sph(0.056, 12, 10), T(belly), h, 0, -0.052, 0.09, { s: [1.1, 0.55, 0.95] });
    for (const s of [-1, 1]) {
      mesh(sph(0.008, 6, 4), T('#5a3a10'), h, s * 0.026, -0.012, 0.154);
      taper(h, bez(V(s * 0.05, 0.075, -0.035), V(s * 0.09, 0.13, -0.08), V(s * 0.075, 0.15, -0.16), 4), 0.024, 0.006, T(horn));
      mesh(cone(0.035, 0.08, 4), T(red), h, s * 0.105, 0.025, -0.03, { r: [0, 0, -s * 1.1], s: [1, 1, 0.3] });   // ครีบหู
      taper(h, bez3(V(s * 0.07, -0.03, 0.12), V(s * 0.12, -0.04, 0.13), V(s * 0.15, -0.1, 0.1), V(s * 0.15, -0.14, 0.07), 5), 0.007, 0.002, GM);   // หนวด
    }
    bake(h);
    mesh(oct(0.022), G(red, 1.1), h, 0, 0.09, 0.085, { keep: true, s: [1, 1.2, 0.6], shadow: false });
    eyes(P, h, 0.052, 0.03, 0.088, 0.03);
    blush(h, 0.08, -0.01, 0.078, 0.022);
    const wingGeo = shapeGeo((sh) => { sh.moveTo(0, 0); sh.lineTo(0.06, 0.13); sh.quadraticCurveTo(0.1, 0.07, 0.17, 0.05); sh.quadraticCurveTo(0.11, 0.015, 0.13, -0.035); sh.quadraticCurveTo(0.065, 0.0, 0, -0.03); });
    const wings = [-1, 1].map((s) => {
      const pv = group(m, s * 0.1, 0.08, -0.08);
      mesh(wingGeo, DS(red, { emissive: '#5a0a0a', emissiveIntensity: 0.4 }), pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true });
      taper(pv, [V(0, 0, 0), V(s * 0.06, 0.13, 0), V(s * 0.17, 0.05, 0)], 0.012, 0.005, GM);
      return pv;
    });
    const tl = group(m, 0, -0.11, -0.13);
    mesh(tube([[0, 0, 0], [0.02, -0.03, -0.12], [0.1, 0.0, -0.2], [0.15, 0.08, -0.18]], [0.06, 0.045, 0.03, 0.015], 10, 20), GM, tl);
    mesh(cyl(0.04, 0.04, 0.012, 16), COIN, tl, 0.155, 0.12, -0.17, { r: [PI / 2, 0, 0.3] });
    bake(tl);
    const orb = group(m);
    const coins = [0, 1, 2].map((i) => { const a = (i / 3) * PI * 2; return mesh(cyl(0.035, 0.035, 0.01, 14), metal('#ffd84a', 0.6), orb, Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.28, { keep: true, shadow: false }); });
    P.on(({ t, dt, run, pk, ev }) => {
      m.position.y = Math.sin(t * 2.4) * 0.03;
      m.rotation.x = 0.25 * run + pk * 0.3;
      wings.forEach((pv, i) => { pv.rotation.y = (i ? 1 : -1) * (0.55 + Math.sin(t * (run > 0.5 ? 18 : 11)) * 0.45); });   // กวาดไปด้านหลัง
      tl.rotation.y = Math.sin(t * 1.6) * 0.3;
      orb.rotation.y = t * 1.6;
      coins.forEach((c, i) => { c.rotation.set(PI / 2, 0, t * 4 + i); c.position.y = 0.05 + Math.sin(t * 2 + i * 2) * 0.03; });
      h.rotation.x = -pk * 0.35;
      cn.position.y = -0.03 + pk * 0.04;
      if (ev) P.emit('coin', { pos: P.wp(h, 0, 0.1, 0.1), count: 10, vel: () => V(rand(-0.6, 0.6), rand(0.8, 1.4), rand(-0.6, 0.6)), gravity: -3, life: [0.6, 0.9], size: [0.07, 0.1], sizeEnd: 0.9, color: ['#ffe066', '#ffcf4a'] });
      if (Math.random() < dt * 3) P.emit('star', { pos: P.wp(m, rand(-0.25, 0.25), rand(-0.1, 0.25), rand(-0.25, 0.25)), count: 1, vel: () => V(0, 0.15, 0), life: [0.5, 0.9], size: [0.05, 0.09], color: '#ffe9a0' });
    });
    return { hover: 0.24, size: 0.62, shadow: 0.62, mouth: group(h, 0, -0.03, 0.14) };
  },

  /* ---------- ตำนาน: ลูกกวางเขาคริสตัล พวงมาลัยดอกไม้ ---------- */
  fawn(P) {
    const c = '#e8b98a', c2 = '#c98e5c', cream = '#fff6ea';
    const CR = toon('#8af0ff', { emissive: '#3ad0ff', emissiveIntensity: 0.75 }); CR.userData.pxMetal = true;
    const CR2 = toon('#ffb8ee', { emissive: '#ff6ad0', emissiveIntensity: 0.55 }); CR2.userData.pxMetal = true;
    const m = group(P.body); m.scale.setScalar(1.15);
    const b = group(m);
    const bc = V(0, 0.34, 0), rx = 0.107, ry = 0.107, rz = 0.172;
    mesh(sph(0.13, 16, 12), T(c), b, bc.x, bc.y, bc.z, { s: [0.82, 0.82, 1.32] });
    mesh(sph(0.12, 16, 12), T(c2), b, 0, 0.375, -0.01, { s: [0.72, 0.55, 1.28] });
    mesh(sph(0.1, 14, 10), T(cream), b, 0, 0.3, 0.02, { s: [0.75, 0.7, 1.2] });
    for (const d of [[0.6, 0.6, 0.2], [-0.5, 0.7, -0.3], [0.4, 0.8, -0.6], [-0.7, 0.5, 0.4], [0.15, 1, 0.1], [0.7, 0.45, -0.5], [-0.3, 0.8, 0.55], [-0.6, 0.6, -0.7], [0.3, 0.9, 0.5]]) {
      const p = onEllipsoid(V(0, 0.36, -0.01), 0.09, 0.07, 0.155, d[0], d[1], d[2]);
      mesh(sph(0.017, 8, 6), T(cream), b, p.x, p.y, p.z, { s: [1, 0.5, 1], noOutline: true });
    }
    mesh(merged(fur(V(0, 0.36, 0.13), 0.06, 0.07, 0.05, 14, 0.05, 0.026, { keep: (d) => d.z > 0.2 && d.y < 0.5, droop: 0.4 })), T(cream), b);   // ขนอก
    mesh(tube([[0, 0.4, 0.12], [0, 0.48, 0.15], [0, 0.55, 0.17]], [0.055, 0.046, 0.04], 10, 10), T(c), b);
    mesh(sph(0.032, 8, 6), T(cream), b, 0, 0.4, -0.175, { s: [1, 1.3, 0.8] });
    mesh(merged(fur(V(0, 0.42, -0.18), 0.03, 0.03, 0.03, 8, 0.04, 0.02, { keep: (d) => d.y > -0.2, droop: -0.3 })), T(cream), b);
    bake(b);
    // พวงมาลัยดอกไม้รอบคอ
    const gl = group(m, 0, 0.455, 0.14); gl.rotation.x = -0.55;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; mesh(sph(0.018, 8, 6), T(['#ff8ac8', '#ffffff', '#ffd84a'][i % 3]), gl, Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06, { s: [1, 0.7, 1] }); }
    mesh(torus(0.06, 0.008, 5, 18), T('#5ab85a'), gl, 0, -0.004, 0, { r: [PI / 2, 0, 0] });
    bake(gl);
    const h = group(m, 0, 0.58, 0.19);
    mesh(sph(0.088, 16, 12), T(c), h, 0, 0, 0, { s: [0.92, 0.95, 1.05] });
    mesh(sph(0.052, 12, 10), T(cream), h, 0, -0.032, 0.066, { s: [0.92, 0.8, 1.02] });
    mesh(sph(0.016, 8, 6), T('#3a2020'), h, 0, -0.02, 0.116);
    for (const s of [-1, 1]) {
      mesh(sph(0.048, 10, 8), T(c), h, s * 0.095, 0.03, -0.02, { s: [1.6, 0.55, 0.8], r: [0, 0, s * 0.4] });
      mesh(sph(0.032, 10, 8), T('#ffc8c8'), h, s * 0.097, 0.033, -0.006, { s: [1.5, 0.45, 0.5], r: [0, 0, s * 0.4] });
    }
    mesh(merged([-1, 0, 1].map((k) => spike(V(k * 0.02, 0.075, 0.02), V(k * 0.3, 1, 0.5), 0.04, 0.016, 5))), T(c2), h);
    bake(h);
    eyes(P, h, 0.044, 0.014, 0.073, 0.028, { color: '#2a4a6a' });
    blush(h, 0.064, -0.022, 0.062, 0.018);
    const ant = group(h, 0, 0.065, -0.01); ant.scale.setScalar(1.35);
    for (const s of [-1, 1]) {
      mesh(oct(0.035), CR, ant, s * 0.045, 0.06, 0, { s: [0.45, 1.8, 0.45], r: [0, 0, -s * 0.35] });
      mesh(oct(0.026), CR2, ant, s * 0.09, 0.075, 0.01, { s: [0.45, 1.3, 0.45], r: [0, 0, -s * 0.9] });
      mesh(oct(0.022), CR, ant, s * 0.035, 0.12, 0.02, { s: [0.4, 1.3, 0.4], r: [0.3, 0, -s * 0.15] });
      mesh(oct(0.016), CR2, ant, s * 0.075, 0.125, -0.01, { s: [0.4, 1.2, 0.4], r: [-0.2, 0, -s * 0.6] });
    }
    bake(ant);
    const shard = mesh(oct(0.03), CR2, m, 0.22, 0.5, 0, { keep: true, s: [0.6, 1.2, 0.6] });
    addOutline(shard);
    const legs = legs4(m, 0.055, 0.29, 0.11, (l) => {
      mesh(cyl(0.028, 0.02, 0.15, 8), T(c), l, 0, -0.07, 0);
      mesh(sph(0.021, 8, 6), T(c), l, 0, -0.145, 0);
      mesh(cyl(0.02, 0.017, 0.11, 8), T(c), l, 0, -0.2, 0);
      mesh(cone(0.024, 0.04, 6), CR, l, 0, -0.265, 0.004, { r: [PI, 0, 0] });
    });
    P.on(({ t, dt, run, ph, pk }) => {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : PI)) * 0.6 * run; });
      m.position.y = Math.abs(Math.sin(ph)) * 0.035 * run;
      h.rotation.x = pk * 0.9;
      h.position.y = 0.58 - pk * 0.08; h.position.z = 0.19 + pk * 0.05;
      h.rotation.y = Math.sin(t * 0.6) * 0.2 * (1 - run);
      const a = t * 0.9;
      shard.position.set(Math.cos(a) * 0.25, 0.52 + Math.sin(t * 2) * 0.04, Math.sin(a) * 0.25);
      shard.rotation.y = t * 2;
      if (Math.random() < dt * (4 + run * 10)) P.emit('star', { pos: P.wp(m, rand(-0.15, 0.15), rand(0.05, 0.6), rand(-0.2, 0.2)), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.15, 0.35), rand(-0.05, 0.05)), life: [0.6, 1.1], size: [0.04, 0.08], color: ['#8af0ff', '#ffb8ee', '#ffffff'] });
    });
    return { size: 0.9, shadow: 0.6, mouth: group(h, 0, -0.04, 0.1) };
  },

  /* ---------- Mythical: ลูกนกฟีนิกซ์ ขนฟู หงอนกับหางเป็นเปลวไฟ ---------- */
  phoenix(P) {
    const c = '#ff6a3a', y = '#ffd34d';
    const BM = T(c, { emissive: '#ff3a10', emissiveIntensity: 0.35 });
    const BL = T('#ffe0a0', { emissive: '#ff8a3a', emissiveIntensity: 0.2 });
    const m = group(P.body); m.scale.setScalar(1.3);
    const b = group(m);
    mesh(sph(0.14, 18, 14), BM, b, 0, 0, 0, { s: [1, 0.95, 1.05] });
    mesh(merged(fur(V(0, -0.01, -0.01), 0.14, 0.13, 0.145, 30, 0.05, 0.03, { keep: (d) => d.y < 0.55, droop: 0.15 })), BM, b);   // ขนฟูรอบตัว
    mesh(sph(0.1, 14, 10), BL, b, 0, -0.03, 0.075, { s: [0.92, 0.86, 0.75] });
    mesh(sph(0.105, 16, 12), BM, b, 0, 0.13, 0.04);
    mesh(cone(0.026, 0.055, 8), T(y), b, 0, 0.11, 0.15, { r: [PI / 2, 0, 0] });
    mesh(cone(0.018, 0.03, 8), T('#e8a020'), b, 0, 0.094, 0.138, { r: [PI / 2 + 0.3, 0, 0] });
    for (const s of [-1, 1]) { mesh(cone(0.012, 0.05, 5), T('#ff9a3a'), b, s * 0.045, -0.14, 0.02, { r: [PI, 0, 0] }); mesh(sph(0.014, 6, 4), T('#ff9a3a'), b, s * 0.045, -0.165, 0.035, { s: [1, 0.5, 1.6] }); }
    bake(b);
    eyes(P, b, 0.044, 0.15, 0.128, 0.026);
    blush(b, 0.068, 0.11, 0.118, 0.02);
    // หงอนเปลวไฟ
    const cr = group(b, 0, 0.22, 0.02);
    mesh(tube([[0, -0.02, 0.01], [0, 0.06, 0.0], [0, 0.12, -0.04], [0, 0.15, -0.1]], [0.032, 0.026, 0.016, 0.004], 8, 14), G(y, 1.3), cr);
    for (const s of [-1, 1]) mesh(tube([[s * 0.02, -0.02, 0.0], [s * 0.04, 0.04, -0.02], [s * 0.06, 0.08, -0.07]], [0.024, 0.016, 0.004], 8, 10), G('#ffa03a', 1.1), cr);
    bake(cr, { outline: false });
    // หางขนนกเปลวไฟ 3 เส้น
    const tl = group(m, 0, 0, -0.11);
    const tips = [-1, 0, 1].map((sx, i) => {
      const end = V(sx * 0.2, 0.16 - Math.abs(sx) * 0.04, -0.3);
      mesh(tube([V(0, 0, 0), V(sx * 0.05, -0.03, -0.11), V(sx * 0.14, 0.04, -0.22), end], [0.035, 0.03, 0.02, 0.005], 8, 18), G(i === 1 ? y : c, 0.9), tl);
      return group(tl, end.x, end.y, end.z);
    });
    bake(tl, { outline: false });
    const wings = [-1, 1].map((s) => {
      const pv = group(b, s * 0.12, 0.02, -0.01);
      mesh(sph(0.07, 12, 8), BM, pv, s * 0.05, 0, 0, { s: [1, 0.3, 0.8] });
      mesh(sph(0.06, 12, 8), T(y, { emissive: '#ff8a1a', emissiveIntensity: 0.6 }), pv, s * 0.1, -0.008, -0.02, { s: [1, 0.25, 0.65] });
      bake(pv, { outline: false }); return pv;
    });
    const aura = glowSprite(b, '#ff8a3a', 0.9, 0.45, 0, 0.05, 0);
    P.on(({ t, dt, run, pk, ev }) => {
      m.position.y = Math.sin(t * 3) * 0.035 - pk * 0.22;
      m.rotation.x = 0.3 * run + pk * 0.6;
      const a = Math.sin(t * (run > 0.5 ? 24 : 16)) * 0.7;
      wings.forEach((pv, i) => { pv.rotation.z = (i ? 1 : -1) * a; });
      tl.rotation.x = Math.sin(t * 2) * 0.12 - run * 0.2;
      cr.rotation.x = Math.sin(t * 5) * 0.08;
      aura.material.opacity = 0.4 + Math.sin(t * 7) * 0.08 + pk * 0.3;
      if (Math.random() < dt * 22) P.emit('dot', { pos: P.wp(cr, rand(-0.03, 0.03), 0.12, -0.06), count: 1, vel: () => V(rand(-0.08, 0.08), rand(0.35, 0.6), rand(-0.08, 0.08)), life: [0.3, 0.55], size: [0.06, 0.1], sizeEnd: 0.2, color: ['#ffe066', '#ffb020'], colorEnd: '#ff3a10' });
      if (Math.random() < dt * 24) { const tp = tips[(Math.random() * 3) | 0]; P.emit('dot', { pos: P.wp(tp), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.4, 0.8], size: [0.05, 0.09], sizeEnd: 0.2, color: ['#ffd34d', '#ff8a3a'], colorEnd: '#ff2a10' }); }
      if (ev) P.emit('dot', { pos: P.wp(b), count: 26, speed: [0.6, 1.4], drag: 2, life: [0.4, 0.8], size: [0.07, 0.12], sizeEnd: 0.2, color: ['#ffe066', '#ff8a3a'], colorEnd: '#ff2a10' });
    });
    return { hover: 0.5, size: 0.62, shadow: 0.48, mouth: group(b, 0, 0.11, 0.17) };
  },

  /* ---------- Mythical: ปลาหมึกห้วงลึก ใส่หมวกกัปตันสามมุม ---------- */
  kraken(P) {
    const c = '#5a34a8', c2 = '#8a5ae0', glow = '#4af8ff', hat = '#2a2050';
    const KM = T(c, { emissive: '#1a0a40', emissiveIntensity: 0.5 }), KM2 = T(c2, { emissive: '#2a1060', emissiveIntensity: 0.4 }), SUCK = T('#e0ccff');
    const m = group(P.body); m.scale.setScalar(1.2);
    const hd = group(m, 0, 0.16, 0);
    mesh(ridges(lathe([[0, -0.1], [0.13, -0.09], [0.165, -0.02], [0.167, 0.07], [0.14, 0.15], [0.09, 0.21], [0, 0.235]], 26), 8, 0.006), KM, hd);
    mesh(sph(0.145, 16, 10), KM2, hd, 0, -0.075, 0, { s: [1, 0.45, 1] });
    for (const s of [-1, 1]) mesh(sph(0.065, 10, 8), KM2, hd, s * 0.14, 0.16, -0.04, { s: [1.2, 0.25, 0.9], r: [0, 0, s * 0.55] });
    bake(hd);
    for (const d of [[0.5, 0.8, -0.3], [-0.6, 0.7, -0.2], [0.2, 0.9, -0.6], [-0.3, 0.6, -0.8], [0.75, 0.3, -0.5], [-0.8, 0.4, -0.4], [0.6, 0.1, -0.75]]) {
      const p = onEllipsoid(V(0, 0.06, -0.005), 0.163, 0.16, 0.163, d[0], d[1], d[2]);
      mesh(sph(0.015, 8, 6), G(glow, 1.6), hd, p.x, p.y, p.z, { keep: true, noOutline: true, shadow: false });
    }
    for (const s of [-1, 1]) {
      const e = group(hd, s * 0.072, 0.01, 0.14);
      mesh(sph(0.05, 14, 10), T('#ffffff'), e, 0, 0, 0, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.036, 12, 8), G(glow, 0.7), e, 0, -0.004, 0.012, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.019, 8, 6), T('#140a2a'), e, 0, -0.005, 0.02, { s: [1, 1.1, 0.5], keep: true, noOutline: true });
      mesh(sph(0.009, 6, 4), WHITE, e, -0.012, 0.014, 0.026, { keep: true, noOutline: true });
      P.eyes.push(e);
    }
    blush(hd, 0.115, -0.035, 0.125, 0.024);
    // หมวกสามมุม (ปีกหมวกเป็นสามเหลี่ยม) + ขอบทอง + ดาว
    const ht = group(hd, 0.0, 0.235, -0.01); ht.rotation.set(-0.1, 0.0, 0.18);
    mesh(cyl(0.125, 0.125, 0.018, 3), T(hat), ht, 0, 0, 0, { r: [0, PI / 6 + PI, 0] });
    mesh(cyl(0.132, 0.132, 0.01, 3), metal('#ffcf4a'), ht, 0, -0.006, 0, { r: [0, PI / 6 + PI, 0] });
    mesh(cyl(0.058, 0.072, 0.07, 12), T(hat), ht, 0, 0.04, 0);
    mesh(sph(0.058, 12, 8), T(hat), ht, 0, 0.075, 0, { s: [1, 0.5, 1] });
    mesh(oct(0.018), metal('#ffcf4a', 0.3), ht, 0, 0.04, 0.068, { s: [1, 1, 0.4] });
    bake(ht);
    // หนวด 8 เส้น: ข้อต่อ 5 ข้อ + ปุ่มดูดด้านล่าง
    const N = 8, SEG = 5, tent = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * PI * 2 + PI / 8;
      const root = group(m, Math.sin(a) * 0.1, 0.11, Math.cos(a) * 0.1);
      root.rotation.y = a;
      let par = root; const segs = [];
      for (let j = 0; j < SEG; j++) {
        const r = 0.036 * (1 - j / SEG) + 0.01, len = 0.062 - j * 0.004;
        const sg = group(par, 0, j ? -(0.062 - (j - 1) * 0.004) : 0, 0);
        const mm = mesh(cyl(r * 0.85, r, len, 8), j > 2 ? KM2 : KM, sg, 0, -len / 2, 0); addOutline(mm);
        if (j < SEG - 1) mesh(sph(r * 0.86, 8, 6), j > 2 ? KM2 : KM, sg, 0, -len, 0); else { const tip = mesh(sph(r * 0.8, 8, 6), KM2, sg, 0, -len, 0); addOutline(tip); }
        if (j > 0) mesh(sph(r * 0.38, 6, 4), SUCK, sg, 0, -len * 0.5, r * 0.85, { s: [1, 1, 0.5] });
        segs.push(sg); par = sg;
      }
      tent.push(segs);
    }
    P.on(({ t, dt, run, pk, ev }) => {
      const pul = Math.sin(t * 3.6);
      m.position.y = Math.sin(t * 1.8) * 0.04 + Math.max(0, pul) * 0.03 * (1 - run);
      hd.scale.set(1 + 0.04 * pul, 1 - 0.03 * pul, 1 + 0.04 * pul);
      m.rotation.x = 0.55 * run;
      ht.rotation.z = 0.18 + Math.sin(t * 1.8) * 0.05;
      tent.forEach((segs, i) => segs.forEach((sg, j) => {
        const curl = (0.2 + pk * 0.45) * (j === 0 ? 1.6 : 1) * (1 - run * 0.75);
        sg.rotation.x = -curl + Math.sin(t * 3 - j * 0.9 + i * 0.8) * 0.2 * (1 - run * 0.5) + (j > 0 ? pk * 0.25 * Math.sin(t * 9 + i) : 0);
      }));
      if (Math.random() < dt * 4) P.emit('ring', { pos: P.wp(m, rand(-0.12, 0.12), rand(0.0, 0.3), rand(-0.12, 0.12)), count: 1, vel: () => V(rand(-0.03, 0.03), rand(0.2, 0.35), 0), life: [0.9, 1.4], size: [0.04, 0.08], sizeEnd: 1.2, color: '#bff8ff', alpha: 0.8 });
      if (ev) P.emit('ring', { pos: P.wp(m, 0, 0.1, 0), count: 14, speed: [0.3, 0.8], drag: 2, life: [0.6, 1], size: [0.05, 0.1], sizeEnd: 1.3, color: '#bff8ff' });
    });
    return { hover: 0.55, size: 0.78, shadow: 0.6, mouth: group(m, 0, 0.05, 0.05) };
  },

  /* ---------- Celestial: วาฬดวงดาว หลังมีดาว ท้องลายร่อง ---------- */
  whale(P) {
    const BM = T('#3a48c8', { emissive: '#1a2470', emissiveIntensity: 0.6 });
    const NEB = T('#8a5ae8', { emissive: '#3a2a90', emissiveIntensity: 0.6 });
    const BL = T('#dff0ff', { emissive: '#4a6ac8', emissiveIntensity: 0.15 });
    const FIN = T('#6a8aff', { emissive: '#3a4ad8', emissiveIntensity: 0.7 });
    const STAR = G('#fff2b0', 1.4), gold = '#ffe08a';
    const m = group(P.body); m.scale.setScalar(1.35);
    const b = group(m);
    const prof = [[0, -0.4], [0.1, -0.37], [0.19, -0.27], [0.235, -0.1], [0.24, 0.07], [0.215, 0.2], [0.15, 0.3], [0, 0.36]];
    const bodyG = (rg) => { const g = lathe(prof, 32); if (rg) ridges(g, 40, 0.004); g.rotateX(PI / 2); g.scale(1, 0.85, 1); return g; };
    mesh(bodyG(), BM, b);
    mesh(bodyG(true), BL, b, 0, -0.06, 0.012, { s: [0.9, 0.8, 0.97] });
    const rAt = (z) => { for (let i = 1; i < prof.length; i++) { const [r0, z0] = prof[i - 1], [r1, z1] = prof[i]; if (z <= z1) return r0 + (r1 - r0) * ((z - z0) / (z1 - z0)); } return 0; };
    const onTop = (x, z, lift = 0) => { const r = rAt(z); return V(x, Math.sqrt(Math.max(0, r * r - x * x)) * 0.85 + lift, z); };
    for (const [x, z, s] of [[0.12, 0.0, 1], [-0.13, -0.12, 0.8], [0.05, -0.24, 0.7], [-0.06, 0.12, 0.6]]) { const p = onTop(x, z, -0.02); mesh(sph(0.08 * s, 10, 8), NEB, b, p.x, p.y, p.z, { s: [1.3, 0.35, 1.4] }); }   // ลายเนบิวลา
    const starGeo = extrude((sh) => starShape(sh, 0.034, 0.015), 0.014, 0.003);
    const stars = [];
    for (const [x, z, s] of [[0, 0.06, 1], [0.09, -0.08, 0.8], [-0.1, 0.0, 0.75], [-0.04, -0.2, 0.7], [0.11, 0.16, 0.6], [-0.12, -0.28, 0.55], [0.06, -0.3, 0.5]]) { const p = onTop(x, z, 0.004); stars.push(starGeo.clone().scale(s, s, s).rotateX(-PI / 2).translate(p.x, p.y, p.z)); }
    mesh(merged(stars), STAR, b, 0, 0, 0, { noOutline: true });
    for (const s of [-1, 1]) { const p = onTop(s * 0.2, 0.2, 0); mesh(sph(0.012, 6, 4), STAR, b, p.x * 0.98, p.y - 0.06, p.z + 0.02, { noOutline: true }); }
    bake(b);
    eyes(P, b, 0.165, 0.005, 0.236, 0.036, { tilt: 0.65 });
    blush(b, 0.19, -0.05, 0.215, 0.032);
    const fins = [-1, 1].map((s) => { const pv = group(b, s * 0.2, -0.11, 0.1); mesh(sph(0.1, 12, 8), FIN, pv, s * 0.08, 0, -0.03, { s: [1.3, 0.22, 0.7], r: [0, s * 0.5, -s * 0.35] }); bake(pv); return pv; });
    const tl = group(m, 0, 0.0, -0.33);
    mesh(tube([[0, 0, 0], [0, 0.02, -0.12], [0, 0.04, -0.24]], [0.12, 0.08, 0.05], 12, 12, 0.8), BM, tl);
    bake(tl);
    const fk = group(tl, 0, 0.04, -0.25);
    for (const s of [-1, 1]) mesh(sph(0.11, 12, 8), FIN, fk, s * 0.11, 0, -0.04, { s: [1.4, 0.2, 0.65], r: [0, s * 0.45, 0] });
    bake(fk);
    const tip = group(fk, 0, 0, -0.08);
    // วงแหวนดาวลอยเหนือหัว
    const hl = group(m, 0, 0.33, 0.08);
    mesh(torus(0.12, 0.008, 6, 48), G(gold, 1.3), hl, 0, 0, 0, { r: [PI / 2, 0, 0], keep: true, shadow: false });
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
    return { hover: 0.95, size: 0.8, shadow: 1.2, mouth: group(b, 0, 0, 0.4) };
  },

  /* ---------- Celestial: กิเลนเมฆาสวรรค์ เกล็ดทอง แผงคอเขียวมรกต ---------- */
  qilin(P) {
    const w = '#f7f6ff', w2 = '#dcdcf2', gold = '#ffd36b';
    const GOLD = metal(gold, 0.35);
    const MANE = T('#7ff0e0', { emissive: '#2ac8b8', emissiveIntensity: 0.6 });
    const CL = T('#ffffff', { emissive: '#8ab8ff', emissiveIntensity: 0.25 });
    const m = group(P.body); m.scale.setScalar(1.15);
    const b = group(m);
    mesh(sph(0.14, 18, 14), T(w), b, 0, 0.42, 0, { s: [0.8, 0.8, 1.38] });
    mesh(sph(0.12, 16, 12), T(w2), b, 0, 0.39, 0.0, { s: [0.75, 0.6, 1.3] });
    const sc = [];
    for (const s of [-1, 1]) for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
      const z = -0.12 + k * 0.06 + r * 0.03, y = 0.45 - r * 0.045, dy = (y - 0.42) / 0.112, dz = z / 0.193;
      const x = 0.112 * Math.sqrt(Math.max(0, 1 - dy * dy - dz * dz));
      sc.push(new THREE.SphereGeometry(0.022, 8, 6).scale(0.35, 0.8, 1).translate(s * (x + 0.002), y, z));
    }
    mesh(merged(sc), GOLD, b, 0, 0, 0, { noOutline: true });
    mesh(sph(0.09, 14, 10), T(w), b, 0, 0.47, 0.13, { s: [0.9, 1.05, 0.9] });
    mesh(tube([[0, 0.48, 0.13], [0, 0.57, 0.17], [0, 0.65, 0.21]], [0.062, 0.05, 0.042], 10, 10), T(w), b);
    mesh(torus(0.062, 0.012, 6, 20), GOLD, b, 0, 0.55, 0.165, { r: [PI / 2 - 0.45, 0, 0] });
    mesh(sph(0.02, 8, 6), GOLD, b, 0, 0.52, 0.225);
    bake(b);
    const h = group(m, 0, 0.68, 0.23);
    mesh(sph(0.085, 16, 12), T(w), h, 0, 0, 0, { s: [0.95, 0.92, 1.05] });
    mesh(sph(0.056, 12, 10), T(w), h, 0, -0.026, 0.076, { s: [1.05, 0.8, 1.15] });
    mesh(sph(0.011, 6, 4), GOLD, h, 0.02, -0.01, 0.138); mesh(sph(0.011, 6, 4), GOLD, h, -0.02, -0.01, 0.138);
    for (const s of [-1, 1]) {
      mesh(cone(0.026, 0.075, 6), T(w), h, s * 0.072, 0.055, -0.03, { r: [0, 0, -s * 0.95] });
      mesh(cone(0.016, 0.05, 6), T('#ffc8d8'), h, s * 0.074, 0.055, -0.022, { r: [0, 0, -s * 0.95], s: [1, 1, 0.4] });
      taper(h, bez3(V(s * 0.03, 0.07, -0.01), V(s * 0.05, 0.14, -0.03), V(s * 0.04, 0.2, -0.08), V(s * 0.06, 0.25, -0.12), 6), 0.016, 0.004, GOLD);   // เขากวางทอง
      taper(h, [V(s * 0.045, 0.15, -0.035), V(s * 0.08, 0.18, -0.03), V(s * 0.1, 0.2, -0.05)], 0.009, 0.003, GOLD);
      taper(h, bez3(V(s * 0.05, -0.035, 0.11), V(s * 0.1, -0.04, 0.12), V(s * 0.13, -0.09, 0.09), V(s * 0.14, -0.15, 0.05), 5), 0.006, 0.002, GOLD);   // หนวดมังกร
      mesh(box(0.04, 0.008, 0.012), GOLD, h, s * 0.04, 0.045, 0.07, { r: [0, 0, s * 0.3] });
    }
    bake(h);
    eyes(P, h, 0.042, 0.016, 0.072, 0.025, { color: '#2a3a6a' });
    blush(h, 0.062, -0.02, 0.062, 0.017);
    const hornGlow = glowSprite(h, gold, 0.3, 0, 0, 0.2, -0.06);
    // แผงคอเป็นเส้นพลิ้ว
    const mn = group(m);
    for (let i = 0; i < 6; i++) {
      const k = i / 5, x = (i % 2 ? 1 : -1) * 0.012;
      mesh(tube([[x, 0.76 - k * 0.2, 0.2 - k * 0.12], [x * 2, 0.72 - k * 0.2, 0.14 - k * 0.12], [x * 3, 0.64 - k * 0.2, 0.1 - k * 0.12], [x * 3, 0.56 - k * 0.22, 0.08 - k * 0.14]], [0.03, 0.026, 0.016, 0.004], 8, 10), MANE, mn);
    }
    mesh(tube([[0, 0.75, 0.25], [0, 0.78, 0.29], [0, 0.74, 0.32]], [0.025, 0.018, 0.004], 8, 8), MANE, mn);
    bake(mn);
    const legs = legs4(m, 0.058, 0.38, 0.12, (l) => {
      mesh(cyl(0.026, 0.02, 0.15, 8), T(w), l, 0, -0.07, 0);
      mesh(sph(0.021, 8, 6), T(w), l, 0, -0.145, 0);
      mesh(cyl(0.02, 0.018, 0.1, 8), T(w), l, 0, -0.2, 0);
      mesh(torus(0.021, 0.006, 5, 12), GOLD, l, 0, -0.235, 0, { r: [PI / 2, 0, 0] });
      mesh(cyl(0.022, 0.026, 0.03, 8), GOLD, l, 0, -0.265, 0);
      mesh(merged([-1, 1].map((k) => spike(V(0, -0.2, -0.015), V(k * 0.4, 0.1, -1), 0.05, 0.016, 5))), MANE, l);
      for (const [x, z, r] of [[0, 0.012, 0.036], [-0.03, -0.01, 0.027], [0.03, -0.01, 0.029]]) mesh(sph(r, 10, 8), CL, l, x, -0.295, z);
    });
    const tl = group(m, 0, 0.45, -0.18);
    mesh(tube([[0, 0, 0], [0, 0.05, -0.1], [0, 0.15, -0.15]], [0.03, 0.026, 0.02], 8, 10), T(w), tl);
    mesh(merged([0, 1, 2, 3, 4].map((i) => spike(V(0, 0.14, -0.15), V((i - 2) * 0.25, 1, -0.6 + (i % 2) * 0.3), 0.12 - Math.abs(i - 2) * 0.02, 0.03, 5))), MANE, tl);
    bake(tl);
    const aura = glowSprite(P.root, gold, 1.2, 0.18, 0, 0.05, 0);
    P.on(({ t, dt, run, ph, pk, ev }) => {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i < 2 ? 0 : PI) + (i % 2) * 0.4) * 0.8 * run - (i < 2 ? pk * 1.1 : 0); });
      m.position.y = Math.sin(t * 1.5) * 0.015 + Math.abs(Math.sin(ph)) * 0.04 * run + pk * 0.08;
      m.rotation.x = -pk * 0.45;
      mn.rotation.x = Math.sin(t * 3) * 0.03;
      tl.rotation.y = Math.sin(t * 1.3) * 0.3;
      h.rotation.y = Math.sin(t * 0.5) * 0.18 * (1 - run);
      hornGlow.material.opacity = 0.2 + pk * 0.8 + Math.sin(t * 3) * 0.08;
      aura.material.opacity = 0.16 + Math.sin(t * 2) * 0.05;
      if (run > 0.3 && Math.random() < dt * 16) P.emit('puff', { pos: P.wp(m, rand(-0.06, 0.06), 0.06, rand(-0.15, 0.15)), count: 1, vel: () => V(rand(-0.1, 0.1), 0.08, rand(-0.1, 0.1)), life: [0.5, 0.9], size: [0.12, 0.2], sizeEnd: 1.6, color: '#ffffff', alpha: 0.8 });
      if (Math.random() < dt * 5) P.emit('star', { pos: P.wp(m, rand(-0.3, 0.3), rand(0.1, 0.8), rand(-0.3, 0.3)), count: 1, vel: () => V(0, rand(0.15, 0.3), 0), life: [0.7, 1.2], size: [0.05, 0.1], color: ['#ffe9a0', '#ffffff'] });
      if (ev) P.emit('star', { pos: P.wp(h, 0, 0.2, -0.06), count: 16, speed: [0.5, 1.1], drag: 2.5, life: [0.5, 0.9], size: [0.07, 0.12], color: ['#ffe9a0', '#ffffff', '#7ff0e0'] });
    });
    return { size: 1.0, shadow: 0.7, mouth: group(h, 0, -0.03, 0.1) };
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
    // v0.16: คืนหน่วยความจำ GPU ของโมเดล (เดิมค้างทุกครั้งที่เรียก/เก็บสัตว์เลี้ยงหรือเปลี่ยนแผนที่)
    this.root.traverse((o) => { if (o.geometry && !o.isSprite) o.geometry.dispose(); });
    if (this.shadow && this.shadow.material) this.shadow.material.dispose();
    if (this.starFx && this.starFx.material) this.starFx.material.dispose();
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
