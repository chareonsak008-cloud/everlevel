// v0.17: ผู้ติดตามแฟชั่น (สัตว์เลี้ยงแฟชั่น) ออกแบบใหม่ทั้งหมด — ตัวใหญ่ขึ้น หน้าตาเป็นโมเดลจริง (ไม่ใช้ภาพแปะ)
// จึงเห็นชัดทั้งโหมด 3D และโหมดสไปรต์พิกเซล · ใช้แทนชุด PET เดิมใน Costumes.js (Object.assign)
// สัญญาเดิม: builder(rig, p, rt) · rig.root = ตัวละคร · rt.on(fn({t, dt})) · rt.ps(kind).emit(...) · rt.worldPos(obj)
import { THREE } from './three.js';
import { toon, bake } from './Toon.js';
import { shadeHex } from './Textures.js';
import { mergeGeometries } from './Geo.js';
import * as TX from './FxTextures.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const lin = (c) => new THREE.Color(c).convertSRGBToLinear();
const T = (c, o) => toon(c, o);
const G = (c, i = 1.2, o = {}) => toon(c, { emissive: c, emissiveIntensity: i, ...o });
const DS = (c, o = {}) => toon(c, { side: THREE.DoubleSide, ...o });
const metal = (c, glow = 0) => { const m = T(c, { emissive: shadeHex(c, -0.75), emissiveIntensity: 1 + glow }); m.userData.pxMetal = true; return m; };

function mesh(geo, mat, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.r) m.rotation.set(o.r[0] || 0, o.r[1] || 0, o.r[2] || 0);
  if (o.s != null) { if (typeof o.s === 'number') m.scale.setScalar(o.s); else m.scale.set(o.s[0], o.s[1], o.s[2]); }
  m.castShadow = o.shadow !== false; m.receiveShadow = true;
  if (o.noOutline || mat.transparent) m.userData.noOutline = true;
  if (o.keep) m.userData.keep = true;
  if (o.tiny) m.userData.pxTiny = o.tiny;
  parent.add(m);
  return m;
}
const group = (parent, x = 0, y = 0, z = 0, r = null) => { const g = new THREE.Group(); g.position.set(x, y, z); if (r) g.rotation.set(r[0] || 0, r[1] || 0, r[2] || 0); parent.add(g); return g; };
const sph = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt, rb, h, n = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, n, 1, open);
const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
const torus = (r, t, a = 8, b = 20, arc = PI * 2) => new THREE.TorusGeometry(r, t, a, b, arc);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);
const merged = (list) => mergeGeometries(list);
const lathe = (pts, n = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), n);
function ridges(geo, n = 10, amp = 0.02, yMax = Infinity) {
  const p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const r = Math.hypot(v.x, v.z); if (r < 1e-4 || v.y > yMax) continue;
    const s = 1 + (Math.sin(Math.atan2(v.z, v.x) * n) * amp) / r; p.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  geo.computeVertexNormals(); return geo;
}
function tube(points, radii, radial = 10, seg = 20, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : V(...p))));
  const fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  const rAt = (u) => { const k = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(k)), f = k - i; return radii[i] * (1 - f) + radii[i + 1] * f; };
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), r = rAt(u), N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) { const a = (j / radial) * PI * 2, cx = Math.cos(a) * r, cy = Math.sin(a) * r * flat; pos.push(P.x + cx * N.x + cy * B.x, P.y + cx * N.y + cy * B.y, P.z + cx * N.z + cy * B.z); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function spike(base, dir, len, rad, n = 6, flat = 1) {
  const g = cone(rad, len, n).translate(0, len / 2, 0); if (flat !== 1) g.scale(1, 1, flat);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  return g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)).translate(base.x, base.y, base.z);
}
function fur(center, rx, ry, rz, count, len, rad, { keep = () => true, droop = 0.3, seed = 1 } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + seed, d = V(Math.cos(a) * r, y, Math.sin(a) * r);
    if (!keep(d)) continue;
    out.push(spike(V(center.x + d.x * rx * 0.9, center.y + d.y * ry * 0.9, center.z + d.z * rz * 0.9), d.clone().add(V(0, -droop, 0)).normalize(), len * (0.8 + ((i * 0.37) % 0.4)), rad, 5, 0.6));
  }
  return out;
}
// ปีกพังผืด (ค้างคาว/มังกร): ขอบเว้าระหว่างนิ้ว
function membrane(span, height, fingers = 3, sag = 0.3) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  const tips = [];
  for (let i = 0; i <= fingers; i++) { const a = 0.55 - (i / fingers) * 1.3; tips.push([Math.cos(a) * span * (1 - i * 0.1), Math.sin(a) * height]); }
  s.lineTo(tips[0][0] * 0.45, tips[0][1] * 1.1); s.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) { const [x0, y0] = tips[i - 1], [x1, y1] = tips[i]; s.quadraticCurveTo(((x0 + x1) / 2) * (1 - sag), ((y0 + y1) / 2) * (1 - sag), x1, y1); }
  s.quadraticCurveTo(tips[fingers][0] * 0.3, tips[fingers][1] * 0.2, 0, -height * 0.05);
  return { geo: new THREE.ShapeGeometry(s, 6), tips };
}
// ปีกขนนก: แผ่นซ้อนเป็นพัด (บิดแต่ละเส้นเล็กน้อยให้มองเห็นได้ทุกมุม)
function featherFan(n, len, wid, spread, twist = 0.25) {
  const gs = [];
  for (let i = 0; i < n; i++) { const a = 0.4 - (i / (n - 1)) * spread, L = len * (1 - i * 0.08); gs.push(new THREE.PlaneGeometry(wid, L).translate(0, L / 2, 0).rotateY(twist * (i - (n - 1) / 2)).rotateZ(-PI / 2 + a)); }
  return merged(gs);
}
const extrude = (draw, depth = 0.02, bevel = 0.006) => {
  const sh = new THREE.Shape(); draw(sh);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -depth / 2); return g;
};
const starShape = (sh, r1, r2, n = 5, rot = PI / 2) => { for (let i = 0; i <= n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + (i / (n * 2)) * PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } };
const glowSprite = (parent, color, scale, opacity = 0.6, x = 0, y = 0, z = 0) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.softDot(), color: lin(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale); s.position.set(x, y, z); parent.add(s); return s;
};

/* ---------- ใบหน้าเป็นโมเดล: ตาโต + ประกาย + ปาก + แก้ม (ดันมาหน้าสุดตอนถ่ายพิกเซล) ---------- */
const EYE_W = new THREE.MeshBasicMaterial({ color: '#ffffff' });
function face(parent, { y = 0, z = 0.1, gap = 0.04, r = 0.022, color = '#1e1420', mouth = 'smile', blush = '#ff8aa8', tilt = 0, closed = false } = {}) {
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = group(parent, s * gap, y, z); e.rotation.y = s * tilt;
    if (closed) mesh(torus(r * 0.8, r * 0.28, 4, 10, PI), T(color), e, 0, -r * 0.2, 0, { keep: true, noOutline: true, shadow: false, tiny: 0.1 });
    else {
      mesh(sph(r, 10, 8), T(color), e, 0, 0, 0, { s: [1, 1.2, 0.5], keep: true, noOutline: true, shadow: false, tiny: 0.1 });
      mesh(sph(r * 0.38, 6, 4), EYE_W, e, -r * 0.3, r * 0.42, r * 0.4, { keep: true, noOutline: true, shadow: false, tiny: 0.11 });
    }
    eyes.push(e);
  }
  if (mouth === 'smile') mesh(torus(r * 0.75, r * 0.2, 4, 10, PI), T('#5a2030'), parent, 0, y - r * 1.5, z + 0.004, { r: [0, 0, PI], keep: true, noOutline: true, shadow: false, tiny: 0.1 });
  else if (mouth === 'o') mesh(sph(r * 0.45, 8, 6), T('#5a2030'), parent, 0, y - r * 1.7, z, { s: [1, 1.2, 0.4], keep: true, noOutline: true, shadow: false, tiny: 0.1 });
  else if (mouth === 'cat') for (const s of [-1, 1]) mesh(torus(r * 0.42, r * 0.16, 4, 8, PI), T('#5a2030'), parent, s * r * 0.42, y - r * 1.5, z + 0.004, { r: [0, 0, PI], keep: true, noOutline: true, shadow: false, tiny: 0.1 });
  if (blush) for (const s of [-1, 1]) mesh(sph(r * 0.9, 8, 6), toon(blush, { transparent: true, opacity: 0.6 }), parent, s * (gap + r * 1.1), y - r * 1.2, z - 0.006, { s: [1.3, 0.7, 0.4], keep: true, noOutline: true, shadow: false, tiny: 0.06 });
  return eyes;
}
// กะพริบตาเป็นระยะ
function blinker(rt, eyes) { let at = rand(1.5, 3.5); rt.on(({ dt }) => { at -= dt; const c = at < 0; for (const e of eyes) e.scale.y = c ? 0.15 : 1; if (at < -0.12) at = rand(2, 4.5); }); }
// จุดลอยข้างไหล่ผู้เล่น (ขยายตัวให้เห็นชัดในสไปรต์)
function petRoot(rig, rt, { height = 1.2, side = 0.66, bob = 0.06, speed = 2, scale = 1.5 } = {}) {
  const g = group(rig.root, side, height, -0.15);
  const m = group(g); m.scale.setScalar(scale);
  rt.on(({ t }) => { g.position.y = height + Math.sin(t * speed) * bob; g.rotation.y = Math.sin(t * 0.7) * 0.35; });
  return m;
}
// โซ่ห้อยแกว่ง (หนวด พู่)
function chain(parent, n, len, makeSeg) { const segs = []; let par = parent; for (let i = 0; i < n; i++) { const sg = group(par, 0, i ? -len : 0, 0); makeSeg(sg, i); segs.push(sg); par = sg; } return segs; }

/* ================= ผู้ติดตามแฟชั่น ================= */
export const COSTUME_PETS = {
  // ลูกมังกร: หัวโต พุงเป็นปล้อง เขาโค้ง ปีกพังผืดมีกระดูก หางปลายโพดำ
  dragon(rig, p, rt) {
    const m = petRoot(rig, rt), c = p.color || '#5ac85a', BM = T(c), BL = T(p.belly || '#fff0b0'), HN = T(p.horn || '#fff0c8'), dk = shadeHex(c, -0.25);
    const b = group(m);
    mesh(sph(0.1, 16, 12), BM, b, 0, 0, 0, { s: [1, 0.95, 1.1] });
    mesh(sph(0.08, 14, 10), BL, b, 0, -0.01, 0.045, { s: [0.9, 1, 0.75] });
    for (const y of [-0.05, -0.015, 0.02]) mesh(box(0.11 - Math.abs(y) * 0.6, 0.005, 0.02), T(shadeHex(p.belly || '#fff0b0', -0.12)), b, 0, y, 0.1 - Math.abs(y) * 0.3);
    mesh(sph(0.095, 16, 12), BM, b, 0, 0.13, 0.05);
    mesh(sph(0.058, 12, 10), BM, b, 0, 0.1, 0.13, { s: [1.05, 0.8, 1] });
    mesh(sph(0.045, 10, 8), BL, b, 0, 0.083, 0.14, { s: [1, 0.55, 0.9] });
    for (const s of [-1, 1]) {
      mesh(sph(0.006, 6, 4), T('#2a1a20'), b, s * 0.018, 0.112, 0.188);
      mesh(merged([spike(V(s * 0.045, 0.2, 0.03), V(s * 0.35, 1, -0.6), 0.075, 0.02, 6)]), HN, b);
      mesh(cone(0.026, 0.06, 4), T(dk), b, s * 0.09, 0.15, 0.02, { r: [0, 0, -s * 1.2], s: [1, 1, 0.3] });
      mesh(sph(0.026, 8, 6), BM, b, s * 0.07, -0.08, 0.05, { s: [0.9, 0.7, 1.2] });
    }
    mesh(merged([0, 1, 2].map((i) => spike(V(0, 0.21 - i * 0.07, 0.0 - i * 0.05), V(0, 0.6, -1), 0.04, 0.015, 4))), T(dk), b);
    mesh(tube([[0, -0.02, -0.08], [0, -0.08, -0.16], [0.06, -0.04, -0.24], [0.1, 0.02, -0.26]], [0.045, 0.032, 0.018, 0.008], 8, 14), BM, b);
    mesh(cone(0.03, 0.05, 4), T(dk), b, 0.11, 0.04, -0.26, { r: [0, 0, -0.5], s: [1, 1, 0.3] });
    bake(b);
    blinker(rt, face(b, { y: 0.15, z: 0.13, gap: 0.045, r: 0.022, mouth: null, blush: '#ff8aa8' }));
    const wm = DS(p.wing || dk), bone = T(shadeHex(p.wing || dk, -0.2));
    const wings = [-1, 1].map((s) => {
      const pv = group(m, s * 0.07, 0.07, -0.04); const { geo, tips } = membrane(0.17, 0.14, 3, 0.35);
      mesh(geo, wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true });
      mesh(merged(tips.map(([x, y]) => tube([[0, 0, 0], [s * x * 0.5, y * 0.55 + 0.01, 0], [s * x, y, 0]], [0.007, 0.005, 0.002], 5, 6))), bone, pv);
      return pv;
    });
    rt.on(({ t }) => wings.forEach((pv, i) => { pv.rotation.y = (i ? 1 : -1) * (0.45 + Math.sin(t * 12) * 0.45); }));
  },
  // สไลม์หยดน้ำ: ปลายจุกม้วน ตัวใส เงาวาว (ราชา: มงกุฎทอง + เสื้อคลุมเล็ก)
  slime(rig, p, rt) {
    const m = petRoot(rig, rt, { height: 0.98, bob: 0 }), c = p.color || '#6ad8ff';
    const body = group(m);
    mesh(lathe([[0, 0], [0.11, 0.005], [0.145, 0.04], [0.14, 0.09], [0.105, 0.145], [0.055, 0.19], [0.02, 0.225], [0, 0.235]], 26), toon(c, { emissive: c, emissiveIntensity: 0.22 }), body, 0, -0.12, 0);
    mesh(tube([[0, 0.1, 0], [0.012, 0.13, 0.0], [0.035, 0.135, -0.01], [0.04, 0.115, -0.02]], [0.018, 0.012, 0.008, 0.005], 6, 8), toon(c, { emissive: c, emissiveIntensity: 0.22 }), body);
    mesh(sph(0.028, 8, 6), T('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), body, -0.06, 0.02, 0.1, { s: [0.8, 1.3, 0.5], noOutline: true });
    mesh(sph(0.012, 6, 4), T('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), body, -0.04, -0.03, 0.13, { noOutline: true });
    blinker(rt, face(body, { y: -0.04, z: 0.135, gap: 0.042, r: 0.022, mouth: 'smile', blush: '#ff7aa0' }));
    if (p.crown) {
      const cr = group(body, 0, 0.095, 0); const gold = metal('#ffcf4a');
      mesh(cyl(0.05, 0.045, 0.035, 10, true), DS('#ffcf4a', { emissive: '#3a2a00' }), cr);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; mesh(cone(0.014, 0.035, 4), gold, cr, Math.sin(a) * 0.048, 0.033, Math.cos(a) * 0.048); mesh(sph(0.007, 6, 4), G('#ff3a6a', 1), cr, Math.sin(a) * 0.05, 0.0, Math.cos(a) * 0.05, { noOutline: true }); }
      mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 18, 1, true, PI * 0.6, PI * 0.8), DS('#c83a5a'), body, 0, -0.06, 0, { noOutline: true });
      mesh(torus(0.163, 0.01, 4, 20, PI * 0.8), T('#ffffff'), body, 0, -0.03, 0, { r: [PI / 2, 0, PI * 0.6 + PI / 2], keep: true });
    }
    rt.on(({ t }) => { const k = Math.abs(Math.sin(t * 3.2)); body.position.y = k * 0.1; body.scale.set(1 + (1 - k) * 0.12, 0.88 + k * 0.16, 1 + (1 - k) * 0.12); });
  },
  // ผีน้อย: ผ้าคลุมชายหยัก มือจิ๋ว ถือตะเกียงเรืองแสง
  ghost(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.08, speed: 1.6 }), W = toon('#f6f4ff', { emissive: '#3a3a5a', emissiveIntensity: 0.4 });
    const b = group(m);
    mesh(ridges(lathe([[0.1, -0.12], [0.115, -0.07], [0.115, 0.0], [0.1, 0.06], [0.07, 0.1], [0, 0.115]], 24), 7, 0.012, -0.06), W, b);
    mesh(merged([0, 1, 2, 3, 4, 5, 6].map((i) => { const a = (i / 7) * PI * 2; return spike(V(Math.cos(a) * 0.1, -0.11, Math.sin(a) * 0.1), V(Math.cos(a) * 0.3, -1, Math.sin(a) * 0.3), 0.04, 0.025, 5); })), W, b);
    mesh(sph(0.025, 8, 6), W, b, -0.1, -0.02, 0.04);
    bake(b);
    blinker(rt, face(b, { y: 0.02, z: 0.108, gap: 0.04, r: 0.022, mouth: 'o', blush: '#ffa0c0' }));
    const lantern = group(m, 0.11, -0.03, 0.05);
    mesh(cyl(0.002, 0.002, 0.04, 4), T('#3a2a20'), lantern, 0, 0.02, 0);
    mesh(ridges(lathe([[0.02, -0.035], [0.032, -0.02], [0.034, 0.0], [0.03, 0.02], [0.018, 0.032]], 12), 6, 0.003), G('#ffd34d', 1.4), lantern, 0, -0.02, 0, { keep: true });
    for (const y of [-0.057, 0.014]) mesh(cyl(0.022, 0.022, 0.01, 10), T('#3a2a20'), lantern, 0, y, 0);
    mesh(sph(0.026, 8, 6), W, lantern, -0.01, 0.03, 0.0);
    const glow = glowSprite(lantern, '#ffb347', 0.32, 0.7, 0, -0.02, 0);
    rt.on(({ t }) => { lantern.rotation.z = Math.sin(t * 2) * 0.2; glow.material.opacity = 0.55 + Math.sin(t * 6) * 0.15; b.rotation.z = Math.sin(t * 1.3) * 0.06; });
  },
  // ภูตดาว: ดาวห้าแฉกนูน หน้ายิ้ม ดาวจิ๋วโคจร
  starSprite(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.07 }), c = p.color || '#ffd34d';
    const s = group(m);
    mesh(extrude((sh) => starShape(sh, 0.13, 0.065), 0.05, 0.022), G(c, 0.7), s);
    blinker(rt, face(s, { y: 0.0, z: 0.05, gap: 0.03, r: 0.017, mouth: 'smile', blush: '#ff9a7a' }));
    const orb = group(m); const mini = extrude((sh) => starShape(sh, 0.03, 0.014), 0.012, 0.004);
    const ms = [0, 1].map((i) => mesh(mini, G(i ? '#ffffff' : '#ff9ad0', 1.2), orb, 0, 0, 0, { noOutline: true }));
    glowSprite(m, c, 0.5, 0.35);
    const tip = new THREE.Object3D(); m.add(tip);
    rt.on(({ t, dt }) => {
      s.rotation.z = Math.sin(t * 1.5) * 0.2;
      ms.forEach((x, i) => { const a = t * 2 + i * PI; x.position.set(Math.cos(a) * 0.17, Math.sin(a * 0.5) * 0.05, Math.sin(a) * 0.17); x.rotation.z = t * 3; });
      if (Math.random() < dt * 12) rt.ps('star').emit({ pos: rt.worldPos(tip).add(V(rand(-0.1, 0.1), rand(-0.1, 0.1), rand(-0.05, 0.05))), count: 1, vel: () => V(rand(-0.1, 0.1), -rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.5, 0.9], size: [0.06, 0.12], color: ['#ffffff', c, '#ff9ad0'] });
    });
  },
  // นกฮูกนักปราชญ์: ตาโตกลมสองวง หูขนตั้ง หมวกบัณฑิตพู่ทอง หนังสือเล่มเล็ก
  owl(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.04, speed: 1.4 }), c = p.color || '#8a6a4a', dk = shadeHex(c, -0.2);
    const b = group(m);
    mesh(lathe([[0, -0.12], [0.08, -0.115], [0.115, -0.06], [0.12, 0.02], [0.11, 0.08], [0.08, 0.12], [0, 0.135]], 22), T(c), b);
    mesh(sph(0.085, 12, 10), T(p.belly || '#f2dcb8'), b, 0, -0.04, 0.055, { s: [0.95, 1, 0.65] });
    mesh(merged([-0.07, -0.03, 0.01].map((y) => spike(V(0, y, 0.11), V(0, -1, 0.3), 0.025, 0.02, 4, 0.5))), T(shadeHex(p.belly || '#f2dcb8', -0.18)), b);
    for (const s of [-1, 1]) {
      mesh(sph(0.045, 12, 8), T('#ffffff'), b, s * 0.047, 0.045, 0.092, { s: [1, 1, 0.45] });
      mesh(merged([spike(V(s * 0.07, 0.11, 0.0), V(s * 0.5, 1, -0.1), 0.06, 0.02, 4)]), T(dk), b);
      mesh(sph(0.05, 10, 8), T(dk), b, s * 0.11, -0.02, -0.01, { s: [0.45, 1.25, 0.9] });   // ปีกพับ
      mesh(cone(0.008, 0.02, 4), T('#e8a020'), b, s * 0.03, -0.125, 0.04, { r: [PI, 0, 0] });
    }
    mesh(cone(0.016, 0.04, 4), T('#ffb347'), b, 0, 0.012, 0.125, { r: [PI / 2 + 0.6, 0, 0] });
    bake(b);
    const eyes = [-1, 1].map((s) => { const e = group(b, s * 0.047, 0.045, 0.112); mesh(sph(0.026, 10, 8), T(p.eye || '#e8a020'), e, 0, 0, 0, { s: [1, 1, 0.4], keep: true, noOutline: true, tiny: 0.1 }); mesh(sph(0.014, 8, 6), T('#1e1420'), e, 0, 0, 0.006, { s: [1, 1, 0.4], keep: true, noOutline: true, tiny: 0.11 }); mesh(sph(0.005, 6, 4), EYE_W, e, -0.007, 0.008, 0.01, { keep: true, noOutline: true, tiny: 0.12 }); return e; });
    blinker(rt, eyes);
    if (p.hat !== false) {
      const h = group(b, 0, 0.14, 0, [0.1, 0, 0.12]);
      mesh(box(0.13, 0.012, 0.13), T('#2a2430'), h, 0, 0.03, 0, { r: [0, PI / 4, 0] });
      mesh(cyl(0.05, 0.055, 0.035, 10), T('#2a2430'), h, 0, 0.01, 0);
      mesh(sph(0.008, 6, 4), metal('#ffcf4a'), h, 0, 0.04, 0);
      mesh(cyl(0.003, 0.003, 0.05, 4), metal('#ffcf4a'), h, 0.04, 0.015, 0.04, { r: [0, 0, 0.3] });
      mesh(cone(0.008, 0.025, 5), metal('#ffcf4a'), h, 0.05, -0.015, 0.04, { r: [PI, 0, 0] });
      bake(h);
    }
    const book = group(m, -0.11, -0.08, 0.06, [0.3, 0.4, 0.2]);
    mesh(box(0.06, 0.075, 0.018), T('#7a2a3a'), book); mesh(box(0.056, 0.07, 0.02), T('#fff6e0'), book, 0.004, 0, 0); mesh(box(0.004, 0.077, 0.02), metal('#ffcf4a'), book, -0.03, 0, 0); bake(book);
    rt.on(({ t }) => { b.rotation.z = Math.sin(t * 1.1) * 0.08; b.rotation.y = Math.sin(t * 0.45) * 0.3; });
  },
  // แมวเมฆ: ตัวเป็นก้อนเมฆปุย หูแมว ตายิ้มหยี หางเมฆม้วน
  cloudCat(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.05, speed: 1.2 }), c = p.color || '#ffffff', CM = T(c, { emissive: '#8ab0d8', emissiveIntensity: 0.12 });
    const b = group(m);
    for (const [x, y, z, r] of [[0, 0, 0, 0.1], [-0.085, -0.025, 0, 0.07], [0.085, -0.025, 0, 0.07], [-0.045, -0.06, 0.05, 0.06], [0.045, -0.06, 0.05, 0.06], [0, -0.05, -0.06, 0.08], [-0.06, 0.04, -0.04, 0.06], [0.06, 0.04, -0.04, 0.06]]) mesh(sph(r, 14, 10), CM, b, x, y, z);
    for (const s of [-1, 1]) { mesh(cone(0.036, 0.065, 4), CM, b, s * 0.058, 0.1, 0.0, { r: [0, PI / 4, -s * 0.3], s: [1, 1, 0.6] }); mesh(cone(0.02, 0.04, 4), T('#ffb0c8'), b, s * 0.058, 0.095, 0.014, { r: [0, PI / 4, -s * 0.3], s: [1, 1, 0.35] }); }
    mesh(sph(0.009, 6, 4), T('#ff8aa8'), b, 0, 0.005, 0.1);
    for (const [x, y, z, r] of [[0.0, -0.04, -0.13, 0.04], [0.03, 0.0, -0.16, 0.035], [0.04, 0.045, -0.15, 0.03]]) mesh(sph(r, 10, 8), CM, b, x, y, z);
    bake(b);
    face(b, { y: 0.02, z: 0.097, gap: 0.04, r: 0.02, mouth: 'cat', blush: '#ffa0c0', closed: true });
    const drops = group(m);
    rt.on(({ t, dt }) => { b.rotation.z = Math.sin(t * 1.2) * 0.06; if (Math.random() < dt * 3) rt.ps('dot').emit({ pos: rt.worldPos(m).add(V(rand(-0.1, 0.1), -0.1, 0)), count: 1, vel: () => V(0, -0.2, 0), life: [0.6, 1], size: [0.06, 0.1], color: '#dff4ff' }); });
  },
  // โดรนจิ๋ว: ตาจอ LED เป็นหน้า ใบพัดสี่ตัว เสาอากาศกะพริบ
  drone(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.04, speed: 2.6 }), c = p.color || '#e8ecf4', glow = p.glow || '#4af8ff';
    const b = group(m);
    mesh(lathe([[0, -0.06], [0.08, -0.055], [0.105, -0.02], [0.105, 0.02], [0.085, 0.055], [0, 0.07]], 20), T(c), b);
    mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.055, 20, 1, true, -0.95, 1.9), DS(p.visor || '#1a1a2a'), b, 0, 0.0, 0, { noOutline: true });
    for (const s of [-1, 1]) mesh(box(0.024, 0.026, 0.01), G(glow, 2), b, s * 0.03, 0.002, 0.103, { noOutline: true, tiny: 0.1 });
    mesh(box(0.03, 0.006, 0.01), G(glow, 2), b, 0, -0.018, 0.103, { noOutline: true, tiny: 0.1 });
    const rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + (i / 4) * PI * 2, x = Math.cos(a) * 0.15, z = Math.sin(a) * 0.15;
      const arm = mesh(box(0.15, 0.014, 0.022), T('#9aa4b4'), b, x * 0.5, 0.02, z * 0.5); arm.rotation.y = -a;
      mesh(cyl(0.024, 0.024, 0.03, 10), T('#5a6474'), b, x, 0.03, z);
      const r = group(m, x, 0.05, z); rotors.push(r);
      mesh(cyl(0.065, 0.065, 0.004, 18), toon('#dfe8ff', { transparent: true, opacity: 0.5 }), r, 0, 0, 0, { keep: true, shadow: false });
      for (const k of [0, 1]) mesh(box(0.12, 0.005, 0.016), T('#3a4454'), r, 0, 0.004, 0, { r: [0, k * PI / 2, 0], keep: true });
    }
    mesh(cyl(0.004, 0.004, 0.07, 4), T('#5a6474'), b, 0.03, 0.1, -0.02);
    bake(b);
    const led = mesh(sph(0.014, 8, 6), G('#ff4a6a', 2), m, 0.03, 0.14, -0.02, { noOutline: true, keep: true });
    rt.on(({ t }) => { rotors.forEach((r, i) => { r.rotation.y = t * 40 * (i % 2 ? 1 : -1); }); b.rotation.z = Math.sin(t * 1.3) * 0.08; b.rotation.x = Math.sin(t * 1.1) * 0.06; led.visible = (t * 2) % 1 < 0.6; });
  },
  // แมงกะพรุนเรืองแสง: กระดิ่งขอบหยัก แกนเรือง หน้ายิ้ม หนวดพลิ้ว
  jelly(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.07, speed: 1.4, height: 1.25 }), c = p.color || '#b8a0ff', c2 = p.color2 || '#7ff8ff';
    const bell = group(m);
    mesh(ridges(lathe([[0.125, -0.02], [0.13, 0.02], [0.12, 0.06], [0.09, 0.1], [0.05, 0.12], [0, 0.125]], 26), 10, 0.008), toon(c, { emissive: c, emissiveIntensity: 0.4, side: THREE.DoubleSide }), bell);
    mesh(sph(0.06, 12, 8), G(c2, 1.1), bell, 0, 0.045, 0, { noOutline: true, s: [1, 0.8, 1] });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; mesh(sph(0.022, 6, 4), toon(c2, { emissive: c2, emissiveIntensity: 0.6 }), bell, Math.cos(a) * 0.125, -0.022, Math.sin(a) * 0.125, { s: [1, 0.6, 1], keep: true }); }
    blinker(rt, face(bell, { y: 0.045, z: 0.112, gap: 0.038, r: 0.019, mouth: 'smile', blush: '#ff9ad0' }));
    const tm = toon(c, { emissive: c, emissiveIntensity: 0.45 });
    const tents = [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * PI * 2; return chain(group(bell, Math.cos(a) * 0.07, -0.03, Math.sin(a) * 0.07), 5, 0.05, (sg, k) => mesh(cyl(0.012 - k * 0.0018, 0.01 - k * 0.0018, 0.05, 5), tm, sg, 0, -0.025, 0)); });
    glowSprite(bell, c2, 0.45, 0.4, 0, 0.02, 0);
    rt.on(({ t }) => { const k = Math.sin(t * 3); bell.scale.set(1 + k * 0.06, 1 - k * 0.08, 1 + k * 0.06); tents.forEach((segs, i) => segs.forEach((sg, j) => { sg.rotation.x = Math.sin(t * 2.5 - j * 0.7 + i) * 0.25; sg.rotation.z = Math.cos(t * 2 - j * 0.6 + i * 1.3) * 0.2; })); });
  },
  // ภูตโคมลอย: โคมกระดาษซี่โครง แถบแดงทอง หน้ายิ้ม พู่ห้อย
  lanternPet(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.06, speed: 1.3 }), c = p.color || '#ffd8a0', glowC = p.glow || '#ff8a3a';
    const g = group(m);
    mesh(ridges(lathe([[0.07, -0.1], [0.1, -0.07], [0.115, -0.02], [0.115, 0.03], [0.1, 0.08], [0.07, 0.1]], 24), 12, 0.006), T(c, { emissive: glowC, emissiveIntensity: 0.55 }), g);
    for (const [y, r] of [[-0.1, 0.072], [0.1, 0.072]]) mesh(cyl(r, r, 0.022, 16), T('#d8402a'), g, 0, y, 0);
    for (const y of [-0.087, 0.087]) mesh(torus(0.09, 0.005, 4, 18), metal('#ffcf4a'), g, 0, y, 0, { r: [PI / 2, 0, 0] });
    mesh(cyl(0.004, 0.004, 0.05, 4), T('#5a3a20'), g, 0, 0.13, 0);
    mesh(cone(0.016, 0.05, 6), T('#d8402a'), g, 0, -0.14, 0, { r: [PI, 0, 0] });
    bake(g);
    blinker(rt, face(g, { y: 0.0, z: 0.115, gap: 0.038, r: 0.02, mouth: 'smile', blush: '#ff7a5a', color: '#5a2a1a' }));
    const glow = glowSprite(g, glowC, 0.6, 0.55);
    const bottom = new THREE.Object3D(); bottom.position.y = -0.12; g.add(bottom);
    rt.on(({ t, dt }) => { g.rotation.z = Math.sin(t * 1.4) * 0.08; glow.material.opacity = 0.45 + Math.sin(t * 7) * 0.08; if (Math.random() < dt * 5) rt.ps('dot').emit({ pos: rt.worldPos(bottom), count: 1, vel: () => V(rand(-0.05, 0.05), rand(-0.3, -0.1), rand(-0.05, 0.05)), life: [0.4, 0.8], size: [0.03, 0.05], color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); });
  },
  // ค้างคาวน้อย: ตัวกลมขนฟู หูใหญ่ เขี้ยวจิ๋ว ปีกพังผืดมีกระดูก
  bat(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.08, speed: 3 }), c = p.color || '#3a2a4a';
    const b = group(m);
    mesh(sph(0.095, 14, 10), T(c), b);
    mesh(merged(fur(V(0, 0, 0), 0.095, 0.095, 0.095, 18, 0.03, 0.02, { keep: (d) => d.z < 0.3, droop: 0.2 })), T(c), b);
    for (const s of [-1, 1]) { mesh(cone(0.045, 0.12, 5), T(c), b, s * 0.055, 0.1, 0, { r: [0, 0, -s * 0.35] }); mesh(cone(0.026, 0.07, 5), T(p.inner || '#ff8ab0'), b, s * 0.055, 0.095, 0.016, { r: [0, 0, -s * 0.35], s: [1, 1, 0.45] }); }
    mesh(sph(0.05, 10, 8), T(p.belly || '#5a4a6a'), b, 0, -0.04, 0.06, { s: [1.3, 1, 0.6] });
    for (const s of [-1, 1]) { mesh(cone(0.008, 0.024, 4), T('#ffffff'), b, s * 0.016, -0.03, 0.093, { r: [PI, 0, 0], noOutline: true, tiny: 0.1 }); mesh(sph(0.014, 6, 4), T(c), b, s * 0.03, -0.1, 0.0); }
    bake(b);
    blinker(rt, face(b, { y: 0.015, z: 0.088, gap: 0.035, r: 0.02, color: p.eye || '#ffd84a', mouth: null, blush: '#ff8ab0' }));
    const wm = DS(p.wing || shadeHex(c, 0.12)), bone = T(shadeHex(c, -0.2));
    const wings = [-1, 1].map((s) => {
      const pv = group(m, s * 0.08, 0.02, -0.02); const { geo, tips } = membrane(0.19, 0.12, 3, 0.4);
      mesh(geo, wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true });
      mesh(merged(tips.map(([x, y]) => tube([[0, 0, 0], [s * x * 0.5, y * 0.6 + 0.012, 0], [s * x, y, 0]], [0.007, 0.005, 0.002], 5, 6))), bone, pv);
      return pv;
    });
    rt.on(({ t }) => wings.forEach((pv, i) => { pv.rotation.y = (i ? 1 : -1) * (0.3 + Math.sin(t * 16) * 0.6); }));
  },
  // ตุ๊กตาหิมะ: หมวกทรงสูง ผ้าพันคอ จมูกแครอท แขนกิ่งไม้ใส่ถุงมือ
  snowman(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.05, speed: 1.6, height: 1.05 }), snow = toon('#ffffff', { emissive: '#3a4a6a', emissiveIntensity: 0.22 });
    const b = group(m);
    mesh(sph(0.1, 14, 10), snow, b, 0, -0.06, 0);
    mesh(sph(0.078, 14, 10), snow, b, 0, 0.09, 0);
    mesh(cone(0.016, 0.075, 6), T('#ff8a2a'), b, 0, 0.088, 0.11, { r: [PI / 2, 0, 0] });
    for (const [y, z] of [[-0.02, 0.093], [-0.06, 0.1], [-0.1, 0.092]]) mesh(sph(0.011, 6, 4), T('#1e1a22'), b, 0, y, z);
    mesh(torus(0.064, 0.022, 6, 14), T(p.scarf || '#d8433a'), b, 0, 0.03, 0, { r: [PI / 2, 0, 0] });
    mesh(box(0.034, 0.085, 0.014), T(p.scarf || '#d8433a'), b, 0.045, -0.012, 0.055, { r: [0.2, 0, 0.3] });
    mesh(cyl(0.05, 0.055, 0.07, 12), T(p.hat || '#2a2a3a'), b, 0.012, 0.19, 0, { r: [0, 0, -0.2] });
    mesh(cyl(0.056, 0.056, 0.014, 12), T('#d8433a'), b, 0.008, 0.168, 0, { r: [0, 0, -0.2] });
    mesh(cyl(0.078, 0.078, 0.01, 14), T(p.hat || '#2a2a3a'), b, 0.006, 0.157, 0, { r: [0, 0, -0.2] });
    for (const s of [-1, 1]) { mesh(tube([[s * 0.09, -0.03, 0], [s * 0.14, 0.0, 0], [s * 0.18, 0.05, 0.01]], [0.009, 0.007, 0.005], 5, 6), T('#6a4428'), b); mesh(sph(0.02, 8, 6), T(p.scarf || '#d8433a'), b, s * 0.185, 0.06, 0.012); }
    bake(b);
    blinker(rt, face(b, { y: 0.115, z: 0.072, gap: 0.03, r: 0.015, mouth: 'smile', blush: '#ffa0b0' }));
    rt.on(({ t, dt }) => { b.rotation.z = Math.sin(t * 2) * 0.08; if (Math.random() < dt * 3) rt.ps('snow').emit({ pos: rt.worldPos(m).add(V(rand(-0.12, 0.12), 0.25, rand(-0.12, 0.12))), count: 1, vel: () => V(0, rand(-0.2, -0.1), 0), life: [0.8, 1.2], size: [0.05, 0.08], color: '#ffffff' }); });
  },
  // ปลาคาร์ปลอยฟ้า: ลายแต้มส้ม ครีบพลิ้วยาว หนวดคู่ ว่ายวนรอบตัว
  koi(rig, p, rt) {
    const anchor = group(rig.root, 0, 1.25, 0), f = group(anchor); f.scale.setScalar(1.75);
    const body = group(f), W = T(p.color || '#fffaf2'), SP = T(p.spot || '#ff5a1a'), FIN = toon(p.fin || '#ffe0c8', { side: THREE.DoubleSide });
    mesh(tube([[0, 0, 0.1], [0, 0.005, 0.04], [0, 0, -0.04], [0, -0.005, -0.1]], [0.04, 0.055, 0.045, 0.02], 12, 16, 0.85), W, body);
    mesh(sph(0.042, 12, 10), W, body, 0, 0, 0.1, { s: [0.95, 0.85, 1] });
    for (const [x, y, z, r] of [[0, 0.04, 0.04, 0.03], [0.03, 0.03, -0.03, 0.025], [-0.03, 0.035, -0.01, 0.022], [0, 0.03, 0.11, 0.02], [0.02, 0.02, -0.08, 0.016]]) mesh(sph(r, 10, 8), SP, body, x, y, z, { s: [1, 0.45, 1.3] });
    for (const s of [-1, 1]) {
      mesh(sph(0.03, 8, 6), FIN, body, s * 0.045, -0.03, 0.04, { s: [0.2, 0.7, 1.3], r: [0, s * 0.5, s * 0.7] });
      mesh(tube([[s * 0.02, -0.02, 0.135], [s * 0.05, -0.04, 0.15], [s * 0.07, -0.08, 0.13]], [0.004, 0.003, 0.002], 4, 6), T('#c86a3a'), body);
    }
    mesh(merged([0, 1, 2].map((i) => spike(V(0, 0.045, 0.03 - i * 0.04), V(0, 1, -0.8), 0.05, 0.016, 4, 0.3))), FIN, body);
    bake(body);
    face(body, { y: 0.015, z: 0.13, gap: 0.03, r: 0.012, mouth: null, blush: null, tilt: 0.8 });
    const tail = group(body, 0, 0, -0.1);
    for (const s of [-1, 1]) mesh(tube([[0, 0, 0], [0, s * 0.03, -0.05], [0, s * 0.07, -0.1], [0, s * 0.09, -0.13]], [0.012, 0.03, 0.025, 0.004], 8, 10, 0.25), FIN, tail);
    bake(tail, { outline: false });
    rt.on(({ t, dt }) => {
      const a = t * 0.7, R = 0.8;
      f.position.set(Math.cos(a) * R, Math.sin(t * 1.2) * 0.08, Math.sin(a) * R);
      f.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      tail.rotation.y = Math.sin(t * 8) * 0.45; body.rotation.y = Math.sin(t * 8 + 1) * 0.08;
      if (Math.random() < dt * 3) rt.ps('bubble').emit({ pos: rt.worldPos(tail), count: 1, vel: () => V(0, rand(0.1, 0.25), 0), life: [0.8, 1.3], size: [0.04, 0.07], sizeEnd: 1.2, color: ['#bfefff', '#ffffff'] });
    });
  },
  // จันทร์เสี้ยวง่วงนอน: หลับตายิ้ม หมวกนอนปอมปอม ดาวห้อย
  moonPet(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.06, speed: 1.2 }), c = p.color || '#ffe9a8';
    const g = group(m);
    mesh(extrude((sh) => { sh.absarc(0, 0, 0.13, PI * 0.3, PI * 1.7, false); sh.absarc(0.07, 0, 0.1, PI * 1.55, PI * 0.45, true); }, 0.06, 0.022), G(c, 0.65), g);
    face(group(g, -0.08, 0, 0), { y: -0.005, z: 0.055, gap: 0.024, r: 0.016, mouth: 'smile', blush: '#ffa0a0', closed: true });
    const cap = group(g, -0.03, 0.12, 0, [0, 0, 0.5]);
    mesh(cone(0.055, 0.14, 12), T(p.cap || '#5a6ad8'), cap, 0, 0.05, 0);
    mesh(torus(0.055, 0.016, 6, 14), T('#ffffff'), cap, 0, -0.012, 0, { r: [PI / 2, 0, 0] });
    mesh(sph(0.026, 8, 6), T('#ffffff'), cap, 0.01, 0.125, 0);
    bake(cap);
    const dang = group(g, 0.06, -0.08, 0);
    mesh(cyl(0.002, 0.002, 0.06, 4), T('#c8a860'), dang, 0, -0.03, 0);
    mesh(extrude((sh) => starShape(sh, 0.025, 0.011), 0.01, 0.003), G('#fff2b0', 1.2), dang, 0, -0.07, 0, { noOutline: true });
    glowSprite(g, c, 0.55, 0.4);
    rt.on(({ t, dt }) => { g.rotation.z = Math.sin(t * 0.9) * 0.12; dang.rotation.z = Math.sin(t * 1.7) * 0.3; if (Math.random() < dt * 3) rt.ps('star').emit({ pos: rt.worldPos(g).add(V(rand(-0.2, 0.2), rand(-0.15, 0.15), rand(-0.1, 0.1))), count: 1, speed: 0.04, life: [0.5, 0.9], size: [0.05, 0.1], color: ['#ffffff', '#ffe9a8'] }); });
  },
  // ลูกหงส์เพลิง: ขนฟูเรืองไฟ หงอนเปลวสามแฉก หางขนนกยาวปลายทอง ทิ้งเปลวไฟ
  phoenixChick(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.06, speed: 2.2 });
    const b = group(m), BODY = G('#ff7a2a', 0.55), GOLD = G('#ffd27a', 0.8), RED = G('#ff3a1a', 1.1);
    mesh(sph(0.09, 14, 10), BODY, b, 0, 0, 0, { s: [1, 0.95, 1.05] });
    mesh(merged(fur(V(0, 0, 0), 0.09, 0.085, 0.095, 22, 0.035, 0.022, { keep: (d) => d.y < 0.5, droop: 0.1 })), BODY, b);
    mesh(sph(0.065, 12, 8), GOLD, b, 0, -0.01, 0.045, { s: [0.9, 1, 0.7] });
    mesh(sph(0.075, 14, 10), BODY, b, 0, 0.1, 0.035);
    mesh(cone(0.018, 0.045, 6), metal('#ffcf4a', 0.4), b, 0, 0.09, 0.115, { r: [PI / 2, 0, 0] });
    mesh(tube([[0, 0.16, 0.03], [0, 0.22, 0.01], [0, 0.26, -0.04]], [0.022, 0.014, 0.003], 6, 8), RED, b);
    for (const s of [-1, 1]) mesh(tube([[s * 0.015, 0.16, 0.03], [s * 0.04, 0.2, 0.0], [s * 0.05, 0.22, -0.04]], [0.016, 0.01, 0.002], 6, 8), GOLD, b);
    for (let k = -1; k <= 1; k++) mesh(tube([[0, -0.02, -0.07], [k * 0.04, -0.06, -0.15], [k * 0.08, -0.04, -0.24], [k * 0.1, 0.02, -0.28]], [0.022, 0.018, 0.012, 0.003], 6, 12), k === 0 ? RED : GOLD, b);
    bake(b, { outline: false });
    blinker(rt, face(b, { y: 0.115, z: 0.098, gap: 0.032, r: 0.017, mouth: null, blush: '#ffb0a0' }));
    const tail = new THREE.Object3D(); tail.position.set(0, 0.02, -0.28); b.add(tail);
    const wings = [-1, 1].map((s) => { const pv = group(m, s * 0.085, 0.02, -0.01); mesh(sph(0.05, 10, 8), RED, pv, s * 0.04, 0, 0, { s: [1, 0.3, 0.7] }); mesh(sph(0.04, 10, 8), GOLD, pv, s * 0.075, -0.004, -0.015, { s: [1, 0.25, 0.6] }); return pv; });
    glowSprite(m, '#ff8a2a', 0.5, 0.35);
    rt.on(({ t, dt }) => { wings.forEach((pv, i) => { pv.rotation.z = (i ? -1 : 1) * (Math.sin(t * 16) * 0.5); }); if (Math.random() < dt * 18) rt.ps('flame').emit({ pos: rt.worldPos(tail), count: 1, vel: () => V(rand(-0.05, 0.05), rand(0.1, 0.3), rand(-0.05, 0.05)), life: [0.3, 0.5], size: [0.07, 0.11], sizeEnd: 0.2, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' }); });
  },
  // มังกรเงาโลหิต: เกล็ดดำ ลายเรืองแดง ตาแดงเรือง ปีกแดงเลือด จันทร์เสี้ยวเลือดโคจร
  bloodDrake(rig, p, rt) {
    const m = petRoot(rig, rt), c = '#2a1420', BM = T(c), BL = T('#5a1a2a'), RG = G('#ff2a3a', 1.4);
    const b = group(m);
    mesh(sph(0.1, 16, 12), BM, b, 0, 0, 0, { s: [1, 0.95, 1.12] });
    mesh(sph(0.08, 14, 10), BL, b, 0, -0.01, 0.045, { s: [0.9, 1, 0.75] });
    mesh(sph(0.092, 16, 12), BM, b, 0, 0.13, 0.05);
    mesh(sph(0.058, 12, 10), BM, b, 0, 0.1, 0.13, { s: [1.05, 0.78, 1] });
    for (const s of [-1, 1]) {
      mesh(merged([spike(V(s * 0.045, 0.19, 0.02), V(s * 0.4, 1, -0.8), 0.09, 0.02, 6)]), T('#120810'), b);
      mesh(merged([spike(V(s * 0.065, 0.16, 0.02), V(s * 0.9, 0.4, -0.6), 0.05, 0.012, 5)]), T('#120810'), b);
      mesh(cone(0.006, 0.018, 4), T('#ffffff'), b, s * 0.02, 0.065, 0.165, { r: [PI, 0, 0], noOutline: true, tiny: 0.1 });
    }
    mesh(merged([0, 1, 2, 3].map((i) => spike(V(0, 0.2 - i * 0.065, 0.0 - i * 0.045), V(0, 0.5, -1), 0.045, 0.014, 4))), RG, b);
    mesh(tube([[0, -0.02, -0.08], [0, -0.08, -0.17], [0.06, -0.04, -0.25], [0.1, 0.03, -0.27]], [0.045, 0.032, 0.018, 0.006], 8, 14), BM, b);
    mesh(cone(0.032, 0.06, 4), RG, b, 0.11, 0.06, -0.27, { r: [0, 0, -0.5], s: [1, 1, 0.3] });
    bake(b);
    face(b, { y: 0.15, z: 0.125, gap: 0.044, r: 0.02, color: '#ff1a2a', mouth: null, blush: null, tilt: 0.2 }).forEach((e) => e.children.forEach((x) => { if (x.material !== EYE_W) x.material = G('#ff1a2a', 2.2); }));
    const wm = DS('#5a0a1a', { emissive: '#3a0010', emissiveIntensity: 0.6 }), bone = T('#1a0a10');
    const wings = [-1, 1].map((s) => {
      const pv = group(m, s * 0.07, 0.07, -0.04); const { geo, tips } = membrane(0.2, 0.16, 3, 0.35);
      mesh(geo, wm, pv, 0, 0, 0, { s: [s, 1, 1], noOutline: true });
      mesh(merged(tips.map(([x, y]) => tube([[0, 0, 0], [s * x * 0.5, y * 0.55 + 0.012, 0], [s * x, y, 0]], [0.008, 0.005, 0.002], 5, 6))), bone, pv);
      return pv;
    });
    const moon = mesh(extrude((sh) => { sh.absarc(0, 0, 0.05, PI * 0.3, PI * 1.7, false); sh.absarc(0.025, 0, 0.04, PI * 1.55, PI * 0.45, true); }, 0.014, 0.005), G('#ff2a3a', 1.6), m, 0, 0, 0, { noOutline: true });
    glowSprite(m, '#ff1a2a', 0.45, 0.25);
    rt.on(({ t, dt }) => { wings.forEach((pv, i) => { pv.rotation.y = (i ? 1 : -1) * (0.45 + Math.sin(t * 12) * 0.45); }); const a = t * 1.6; moon.position.set(Math.cos(a) * 0.22, 0.05 + Math.sin(t * 2) * 0.03, Math.sin(a) * 0.22); moon.rotation.z = t * 2; if (Math.random() < dt * 6) rt.ps('dot').emit({ pos: rt.worldPos(m), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.1, 0.3), rand(-0.1, 0.1)), life: [0.4, 0.8], size: [0.03, 0.05], color: ['#ff6a7a', '#ff1a3a'] }); });
  },
  // วาฬดารา: หลังน้ำเงินเข้มมีดาว ท้องลายร่อง ครีบเรือง ว่ายวนรอบตัว พ่นละอองดาว
  starWhale(rig, p, rt) {
    const anchor = group(rig.root, 0, 1.75, 0), f = group(anchor); f.scale.setScalar(1.35);
    const BM = T('#3a48c8', { emissive: '#1a2470', emissiveIntensity: 0.6 }), BL = T('#dff0ff', { emissive: '#4a6ac8', emissiveIntensity: 0.15 }), FIN = T('#7a9aff', { emissive: '#3a4ad8', emissiveIntensity: 0.6 }), STAR = G('#fff2b0', 1.4);
    const body = group(f);
    const prof = [[0, -0.2], [0.05, -0.185], [0.095, -0.135], [0.118, -0.05], [0.12, 0.035], [0.108, 0.1], [0.075, 0.15], [0, 0.18]];
    const bg = (rg) => { const g = lathe(prof, 26); if (rg) ridges(g, 30, 0.0025); g.rotateX(PI / 2); g.scale(1, 0.85, 1); return g; };
    mesh(bg(), BM, body);
    mesh(bg(true), BL, body, 0, -0.03, 0.006, { s: [0.9, 0.8, 0.97] });
    const stars = []; const sg = extrude((sh) => starShape(sh, 0.02, 0.009), 0.008, 0.002);
    for (const [x, z, s] of [[0, 0.04, 1], [0.05, -0.05, 0.8], [-0.05, -0.0, 0.75], [-0.02, -0.11, 0.7]]) { const r = 0.115; stars.push(sg.clone().scale(s, s, s).rotateX(-PI / 2).translate(x, Math.sqrt(Math.max(0, r * r - x * x)) * 0.85 + 0.002, z)); }
    mesh(merged(stars), STAR, body, 0, 0, 0, { noOutline: true });
    for (const s of [-1, 1]) mesh(sph(0.05, 10, 6), FIN, body, s * 0.11, -0.05, 0.05, { s: [1.4, 0.22, 0.7], r: [0, s * 0.45, -s * 0.35] });
    bake(body);
    face(body, { y: 0.0, z: 0.12, gap: 0.075, r: 0.016, mouth: null, blush: '#ff9ab8', tilt: 0.65 });
    const tail = group(body, 0, 0.005, -0.18);
    mesh(tube([[0, 0, 0], [0, 0.01, -0.06], [0, 0.02, -0.11]], [0.05, 0.035, 0.022], 10, 8, 0.8), BM, tail);
    for (const s of [-1, 1]) mesh(sph(0.055, 10, 6), FIN, tail, s * 0.055, 0.02, -0.13, { s: [1.4, 0.2, 0.65], r: [0, s * 0.45, 0] });
    bake(tail);
    glowSprite(f, '#9ad8ff', 0.6, 0.25);
    const spout = new THREE.Object3D(); spout.position.set(0, 0.09, 0.06); body.add(spout);
    rt.on(({ t, dt }) => {
      const a = t * 0.45, R = 0.95;
      f.position.set(Math.cos(a) * R, Math.sin(t * 0.9) * 0.1, Math.sin(a) * R); f.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      body.rotation.x = Math.sin(t * 2) * 0.08; tail.rotation.x = Math.sin(t * 2 + 1) * 0.4;
      if (Math.random() < dt * 8) rt.ps('star').emit({ pos: rt.worldPos(tail), count: 1, speed: 0.05, life: [0.6, 1.1], size: [0.05, 0.1], color: ['#ffffff', '#9ad8ff', '#ffe08a'] });
      if ((t % 3) < dt * 1.5) rt.ps('star').emit({ pos: rt.worldPos(spout), count: 10, vel: () => V(rand(-0.15, 0.15), rand(0.5, 0.9), rand(-0.15, 0.15)), gravity: -1.2, life: [0.6, 0.9], size: [0.05, 0.09], color: ['#ffffff', '#9ad8ff'] });
    });
  },
  // ภูตเทวาสุริยะ: ลูกแสงยิ้ม แฉกรัศมีรอบตัว ปีกขนนกสองคู่ วงรัศมีทองหมุนบนหัว
  cherub(rig, p, rt) {
    const m = petRoot(rig, rt, { bob: 0.07, speed: 1.8 });
    const b = group(m);
    mesh(sph(0.085, 16, 12), G('#fff4d0', 0.9), b, 0, 0, 0);
    mesh(merged([...Array(10)].map((_, i) => { const a = (i / 10) * PI * 2; return spike(V(Math.cos(a) * 0.08, Math.sin(a) * 0.08, -0.02), V(Math.cos(a), Math.sin(a), -0.3), 0.04, 0.018, 4, 0.4); })), G('#ffd27a', 1.1), b, 0, 0, 0, { noOutline: true });
    blinker(rt, face(b, { y: 0.005, z: 0.08, gap: 0.03, r: 0.017, mouth: 'smile', blush: '#ffa0a0', color: '#6a4a2a' }));
    const halo = group(m, 0, 0.13, -0.01, [0.3, 0, 0]);
    mesh(torus(0.055, 0.01, 6, 24), G('#ffe08a', 1.6), halo, 0, 0, 0, { r: [PI / 2, 0, 0], noOutline: true });
    const WF = DS('#ffffff', { emissive: '#8a8aa8', emissiveIntensity: 0.4 }), GF = DS('#ffe08a', { emissive: '#8a6a20', emissiveIntensity: 0.4 });
    const wings = [];
    for (const [y, sc] of [[0.03, 1], [-0.045, 0.7]]) for (const s of [-1, 1]) {
      const pv = group(m, s * 0.07, y, -0.035); const w = group(pv); w.scale.set(s * sc, sc, sc);
      mesh(featherFan(4, 0.13, 0.04, 0.9), WF, w, 0, 0, 0, { noOutline: true });
      mesh(featherFan(3, 0.08, 0.035, 0.7), GF, w, 0, 0.005, 0.004, { noOutline: true });
      wings.push({ pv, s });
    }
    glowSprite(m, '#ffe9a8', 0.45, 0.4);
    rt.on(({ t, dt }) => { wings.forEach(({ pv, s }, i) => { pv.rotation.y = s * (0.35 + Math.sin(t * 12 + i) * 0.4); }); halo.rotation.y = t * 1.2; b.rotation.z = Math.sin(t * 1.4) * 0.1; if (Math.random() < dt * 8) rt.ps('star').emit({ pos: rt.worldPos(m).add(V(rand(-0.06, 0.06), rand(-0.06, 0.06), -0.05)), count: 1, vel: () => V(0, rand(-0.15, -0.05), 0), life: [0.5, 0.9], size: [0.05, 0.09], color: ['#ffffff', '#ffe08a'] }); });
  },
};
