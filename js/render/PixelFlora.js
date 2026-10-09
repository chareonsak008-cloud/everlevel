// v0.17: ต้นไม้ พุ่มไม้ หญ้า ดอกไม้ หิน แบบภาพพิกเซล
// ทรงพุ่มเป็นก้อนใบนูนไม่เรียบ (ขอบภาพหยักแบบวาดมือ) · แสงเป็นขั้นแบบ toon · จุดใบไม้ระดับพิกเซลจากเชดเดอร์
import { THREE } from './three.js';
import { mergeGeometries, paint } from './Geo.js';
import { gradientMap } from './Toon.js';
import { rng } from '../core/util.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// noise แบบผลรวมคลื่น (ต่อเนื่อง · ขึ้นกับตำแหน่งเท่านั้น → รอยต่อของทรงกลมไม่แยก)
const noise3 = (x, y, z, s) => Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 1.3) * Math.sin(z * 1.9 + s * 0.7) + 0.5 * Math.sin(x * 3.7 - y * 2.9 + s) * Math.sin(z * 3.3 + y * 1.1 - s * 0.4);
// ก้อนนูน: ดันผิวออกจากจุดศูนย์กลางตาม noise
function lumpy(geo, amp, freq, seed, center = V()) {
  const p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(center);
    const n = noise3((v.x + center.x) * freq, (v.y + center.y) * freq, (v.z + center.z) * freq, seed);
    v.multiplyScalar(1 + amp * n).add(center); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
// ท่อโค้งเรียว (ลำต้น กิ่ง ราก)
function tube(points, radii, radial = 8, seg = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : V(...p))));
  const fr = curve.computeFrenetFrames(seg, false), pos = [], idx = [];
  const rAt = (u) => { const k = u * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(k)), f = k - i; return radii[i] * (1 - f) + radii[i + 1] * f; };
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, P = curve.getPointAt(u), r = rAt(u), N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) { const a = (j / radial) * Math.PI * 2, cx = Math.cos(a) * r, cy = Math.sin(a) * r; pos.push(P.x + cx * N.x + cy * B.x, P.y + cx * N.y + cy * B.y, P.z + cx * N.z + cy * B.z); }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const merge = (list) => mergeGeometries(list, { uv: false, color: true });

/* ---------- ลำต้น: เปลือกไม้เป็นริ้ว รากแผ่ ---------- */
function trunk(r, { h = 1.3, r0 = 0.17, r1 = 0.1, bark = '#7b5534', lean = 0.06, roots = 3, seed = 1 } = {}) {
  const parts = [];
  const lx = (r() - 0.5) * lean * 2, lz = (r() - 0.5) * lean * 2;
  const b = C(bark), bd = b.clone().multiplyScalar(0.62), bl = b.clone().lerp(C('#d8b48a'), 0.25);
  const stem = tube([[0, 0, 0], [lx * 0.3, h * 0.35, lz * 0.3], [lx, h * 0.75, lz], [lx * 1.2, h, lz * 1.2]], [r0, r0 * 0.82, r1 * 1.05, r1], 9, 10);
  parts.push(paint(stem, (c, x, y, z) => { const a = Math.atan2(z, x); const s = Math.sin(a * 7 + y * 3 + seed); c.copy(s > 0.55 ? bd : s < -0.7 ? bl : b); }));
  for (let i = 0; i < roots; i++) {
    const a = (i / roots) * Math.PI * 2 + r();
    parts.push(paint(tube([[0, 0.25, 0], [Math.cos(a) * r0 * 1.4, 0.07, Math.sin(a) * r0 * 1.4], [Math.cos(a) * r0 * 2.4, -0.02, Math.sin(a) * r0 * 2.4]], [r0 * 0.55, r0 * 0.35, 0.02], 6, 5), (c) => c.copy(b).multiplyScalar(0.85)));
  }
  return { parts, top: V(lx * 1.2, h, lz * 1.2) };
}

/* ---------- ต้นไม้ใบกว้าง: พุ่มก้อนใบ 7–9 ก้อน · บางต้นมีผล/ดอก ---------- */
export function roundTreePx(seed, { snow = false } = {}) {
  const r = rng(seed * 31 + 7);
  const { parts, top } = trunk(r, { h: 1.25 + r() * 0.2, seed, bark: snow ? '#5e4636' : '#7b5534' });
  // กิ่งแยกขึ้นไปหาพุ่ม
  for (let i = 0; i < 2; i++) {
    const a = r() * Math.PI * 2;
    parts.push(paint(tube([[top.x * 0.6, 0.85, top.z * 0.6], [Math.cos(a) * 0.25, 1.15, Math.sin(a) * 0.25], [Math.cos(a) * 0.42, 1.38, Math.sin(a) * 0.42]], [0.06, 0.04, 0.025], 6, 6), (c) => c.set(snow ? '#5e4636' : '#6b4a2e')));
  }
  const cy = top.y + 0.5;
  const clumps = [[0, cy, 0, 0.62]];
  const n = 5 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.5; clumps.push([Math.cos(a) * 0.48 + top.x, cy - 0.18 + r() * 0.12, Math.sin(a) * 0.48 + top.z, 0.4 + r() * 0.12]); }
  clumps.push([top.x + 0.05, cy + 0.48, top.z - 0.04, 0.44], [top.x - 0.22, cy + 0.32, top.z + 0.2, 0.34]);
  const dark = C(snow ? '#1e4436' : '#173f24'), mid = C(snow ? '#2f5f4a' : '#2c6a2a'), light = C(snow ? '#4a7a62' : '#4b8a32'), hi = C(snow ? '#f4f9ff' : '#86bf48');
  const tilt = (r() - 0.5) * 0.06, cc = V(top.x, cy + 0.12, top.z);
  clumps.forEach(([x, y, z, rad], i) => {
    const s = rad * (0.92 + r() * 0.16);
    const g = lumpy(new THREE.SphereGeometry(s, 20, 14), 0.13, 5.5, seed * 3 + i, V()).translate(x, y, z);
    lumpy(g, 0.05, 13, seed * 5 + i, V(x, y, z));
    const hue = (r() - 0.5) * 0.05 + tilt, sat = (r() - 0.5) * 0.08;
    parts.push(paint(g, (c, px, py, pz) => {
      const o = Math.hypot(px - cc.x, (py - cc.y) * 1.15, pz - cc.z) / 0.95;   // ใกล้แกนพุ่ม = เงาใน
      const up = (py - y) / s;
      c.copy(dark).lerp(mid, sstep(0.45, 0.95, o) * 0.8 + sstep(-0.4, 0.4, up) * 0.2).lerp(light, sstep(0.3, 0.85, up) * sstep(0.7, 1.05, o) * 0.75);
      if (snow && up > 0.38) c.lerp(hi, up > 0.5 ? 0.95 : 0.6);
      else if (!snow && up > 0.72 && py > cy + 0.2) c.lerp(hi, 0.45);
      c.offsetHSL(hue, sat, 0);
    }));
  });
  // ผลไม้/ดอก (บางต้น)
  const fruit = !snow && seed % 3 === 0 ? '#e8384f' : !snow && seed % 5 === 1 ? '#ffb0d0' : null;
  if (fruit) for (let i = 0; i < 9; i++) {
    const [x, y, z, rad] = clumps[1 + (i % (clumps.length - 1))], a = r() * Math.PI * 2, e = 0.15 + r() * 0.5;
    parts.push(paint(new THREE.SphereGeometry(0.055, 6, 4).translate(x + Math.cos(a) * Math.cos(e) * rad, y + Math.sin(e) * rad * 0.8, z + Math.sin(a) * Math.cos(e) * rad), (c) => c.set(fruit)));
  }
  return merge(parts);
}

/* ---------- สน: ชั้นใบเป็นกระโปรงหยักฟันเลื่อย ---------- */
function skirt(rad, h, teeth, seed, droop = 0.07) {
  const g = new THREE.ConeGeometry(rad, h, teeth * 2, 3);
  const p = g.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const rr = Math.hypot(v.x, v.z); if (rr < 1e-4) continue;
    const a = Math.atan2(v.z, v.x), k = Math.round(((a + Math.PI) / (Math.PI * 2)) * teeth * 2);
    const bottom = v.y < -h / 2 + 1e-3;
    if (bottom) { const tooth = k % 2 === 0; v.x *= tooth ? 1.08 : 0.8; v.z *= tooth ? 1.08 : 0.8; v.y -= tooth ? droop : 0; }
    else { const w = 1 + 0.06 * Math.sin(a * 5 + seed + v.y * 7); v.x *= w; v.z *= w; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
export function pinePx(seed, { snow = false } = {}) {
  const r = rng(seed * 17 + 3);
  const { parts } = trunk(r, { h: 0.75, r0: 0.13, r1: 0.08, roots: 3, lean: 0.02, seed, bark: '#5e4030' });
  const tiers = [[0.62, 0.72, 0.8], [1.05, 0.6, 0.72], [1.45, 0.48, 0.64], [1.8, 0.36, 0.56], [2.1, 0.22, 0.46]];
  const dark = C(snow ? '#1d4434' : '#1c4a33'), mid = C(snow ? '#2c5c48' : '#2f6e45'), light = C(snow ? '#4a7a64' : '#5c9a5a'), white = C('#f2f8ff');
  tiers.forEach(([y, rad, h], i) => {
    const s = rad * (0.95 + r() * 0.12);
    const g = skirt(s, h, 6 + (i < 2 ? 2 : 0), seed + i).rotateY(r() * 3).translate(0, y + h / 2 - 0.1, 0);
    const y0 = y - 0.1;
    parts.push(paint(g, (c, px, py, pz) => {
      const t = (py - y0) / h, side = (px * -0.6 + pz * 0.4) / s;   // ด้านรับแสง (บนซ้าย)
      c.copy(dark).lerp(mid, sstep(0.0, 0.45, t)).lerp(light, sstep(0.35, 0.9, t) * 0.6 + Math.max(0, side) * 0.25);
      if (snow && t > 0.38) c.lerp(white, t > 0.5 ? 0.95 : 0.6);
    }));
  });
  return merge(parts);
}
export const snowTreePx = (seed) => roundTreePx(seed, { snow: true });
export const snowPinePx = (seed) => pinePx(seed, { snow: true });

/* ---------- ต้นไม้ไหม้เกรียม: กิ่งแห้งบิดงอ ปลายกิ่งถ่านแดง ---------- */
export function deadTreePx(seed) {
  const r = rng(seed * 13 + 5), parts = [];
  const h = 1.5 + r() * 0.4, lx = (r() - 0.5) * 0.3, lz = (r() - 0.5) * 0.3;
  parts.push(paint(tube([[0, 0, 0], [lx * 0.3, h * 0.4, lz * 0.3], [lx, h * 0.8, lz], [lx * 1.3, h, lz * 1.1]], [0.17, 0.12, 0.08, 0.05], 8, 10), (c, x, y, z) => { const s = Math.sin(Math.atan2(z, x) * 6 + y * 4 + seed); c.set(s > 0.5 ? '#1a1414' : '#2e2422'); if (s < -0.97 && y < h * 0.6) c.set('#ff5a1a'); }));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + r(); parts.push(paint(tube([[0, 0.22, 0], [Math.cos(a) * 0.24, 0.05, Math.sin(a) * 0.24], [Math.cos(a) * 0.4, -0.02, Math.sin(a) * 0.4]], [0.09, 0.05, 0.02], 6, 5), (c) => c.set('#241c1c'))); }
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, y = h * (0.45 + r() * 0.5), len = 0.45 + r() * 0.45;
    const b0 = V(lx * (y / h), y, lz * (y / h)), b1 = V(b0.x + Math.cos(a) * len * 0.5, y + len * 0.35, b0.z + Math.sin(a) * len * 0.5), b2 = V(b0.x + Math.cos(a + 0.4) * len, y + len * 0.5 + r() * 0.2, b0.z + Math.sin(a + 0.4) * len);
    parts.push(paint(tube([b0, b1, b2], [0.05, 0.03, 0.012], 5, 6), (c, x, y2) => c.set('#2a2020').lerp(C('#ff5a1a'), Math.max(0, (y2 - (y + len * 0.35)) / (len * 0.3)) * 0.9)));
  }
  return merge(parts);
}

/* ---------- พุ่มไม้ / หญ้า / ดอกไม้ / หิน ---------- */
export function bushPx(seed) {
  const r = rng(seed * 7 + 1), parts = [];
  const dark = C('#2a6230'), mid = C('#4a8e38'), light = C('#86c252');
  for (let i = 0; i < 5; i++) {
    const s = 0.26 + r() * 0.12, x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 0.45, y = s * 0.75 + (i === 0 ? 0.08 : 0);
    const g = lumpy(new THREE.SphereGeometry(s, 12, 9), 0.14, 1.3 / s, seed + i).translate(x, y, z);
    parts.push(paint(g, (c, px, py) => { const up = (py - y) / s; c.copy(dark).lerp(mid, sstep(-0.7, 0.1, up)).lerp(light, sstep(0.35, 0.85, up) * 0.7); }));
  }
  const berry = seed % 2 ? '#e8384f' : '#6a5aff';
  for (let i = 0; i < 7; i++) parts.push(paint(new THREE.SphereGeometry(0.045, 6, 4).translate((r() - 0.5) * 0.6, 0.22 + r() * 0.35, 0.18 + r() * 0.16), (c) => c.set(berry)));
  return merge(parts);
}
export function grassTuftPx() {
  const blades = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, h = 0.14 + (i % 3) * 0.05;
    const bx = Math.cos(a) * 0.035, bz = Math.sin(a) * 0.035, tx = Math.cos(a) * 0.09, tz = Math.sin(a) * 0.09;
    const px = -Math.sin(a) * 0.026, pz = Math.cos(a) * 0.026;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz]), 3));
    g.computeVertexNormals();
    blades.push(paint(g, (c, x, y) => c.set(y > 0.1 ? '#a6d86a' : y > 0.05 ? '#6aa848' : '#3f7a2c')));
  }
  const g = merge(blades);
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
export function flowerPx() {
  const stem = paint(new THREE.CylinderGeometry(0.01, 0.012, 0.2, 4).translate(0, 0.1, 0), (c) => c.set('#3f7a2c'));
  const petals = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; petals.push(new THREE.SphereGeometry(0.03, 5, 4).scale(1, 0.5, 1).translate(Math.cos(a) * 0.035, 0.21, Math.sin(a) * 0.035)); }
  const head = paint(mergeGeometries(petals), (c) => c.set('#ffffff'));
  const eye = paint(new THREE.SphereGeometry(0.02, 5, 4).translate(0, 0.22, 0), (c) => c.set('#ffd23a'));
  return merge([stem, head, eye]);
}
export function rockPx(seed) {
  const g = new THREE.DodecahedronGeometry(0.17, 0), p = g.attributes.position, r = rng(seed * 5 + 2), v = V(), seen = new Map();
  for (let i = 0; i < p.count; i++) {   // เหลี่ยมหินไม่สม่ำเสมอ (จุดเดียวกันขยับเท่ากัน)
    v.fromBufferAttribute(p, i); const k = v.x.toFixed(3) + v.y.toFixed(3) + v.z.toFixed(3);
    if (!seen.has(k)) seen.set(k, 0.8 + r() * 0.4); v.multiplyScalar(seen.get(k)); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); g.scale(1, 0.6, 1);
  return paint(g, (c, x, y) => { c.set('#6e6a64').lerp(C('#a8a296'), sstep(-0.04, 0.08, y)); });
}

/* ---------- วัสดุพืช: แสงขั้น toon + จุดใบไม้ระดับพิกเซล ---------- */
let floraMat = null;
export function floraMaterial() {
  if (floraMat) return floraMat;
  const m = floraMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() });
  m.userData.obc = (s) => {
    s.vertexShader = 'varying vec3 vFW;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vFW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vFW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`);
    s.fragmentShader = 'varying vec3 vFW;\n' + s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float fh = fract(sin(dot(floor(vFW * 24.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        diffuseColor.rgb *= fh > 0.9 ? 1.12 : (fh < 0.16 ? 0.8 : 1.0); }`);
  };
  m.onBeforeCompile = m.userData.obc;
  m.customProgramCacheKey = () => 'flora';
  return m;
}
// วัสดุ toon สีตามจุด (พุ่มไม้ หิน หญ้า) — ไม่มีจุดใบไม้
let vcMat = null;
export function vcToon() { return vcMat || (vcMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() })); }
