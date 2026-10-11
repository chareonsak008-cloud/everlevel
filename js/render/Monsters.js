// v0.17: มอนสเตอร์ออกแบบใหม่ทั้งหมด (ใช้ถ่ายเป็นสไปรต์พิกเซลแบบเกม RPG — render/PixelSprites.js)
// แต่ละชนิด = build (สร้างโมเดลจากชิ้นรูปทรง) + anim (ท่าทางต่อเฟรม) · ส่วนกลาง: กระพริบตอนโดนตี ตาย เกิดใหม่ แช่แข็ง มึน ทุบพื้น
import { THREE } from './three.js';
import { lin, mergeGeometries } from './Geo.js';
import { toon, toonOwn, addOutline } from './Toon.js';
import { blobShadowTexture, shadeHex, glowTexture } from './Textures.js';
import { lerpAngle, damp } from '../core/util.js';

const PI = Math.PI;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const WHITE_C = new THREE.Color(1, 1, 1);

/* ---------- เครื่องมือสร้างรูปทรง ---------- */
function add(parent, geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
  parent.add(m); return m;
}
function grp(parent, x = 0, y = 0, z = 0, r = null) { const g = new THREE.Group(); g.position.set(x, y, z); if (r) g.rotation.set(r[0], r[1], r[2]); parent.add(g); return g; }
const sph = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt, rb, h, n = 14) => new THREE.CylinderGeometry(rt, rb, h, n);
const cone = (r, h, n = 8) => new THREE.ConeGeometry(r, h, n);
const oct = (r) => new THREE.OctahedronGeometry(r, 0);
function lathe(pts, n = 24) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)), n); }
// ผิวเป็นลอน/ร่อง (เปลือกไม้ ผ้า เกล็ด) — ให้เกิดรอยพับเวลาลงเงาพิกเซล
function ridges(geo, n = 10, amp = 0.02) {
  const p = geo.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const s = 1 + (Math.sin(Math.atan2(v.z, v.x) * n) * amp) / r; p.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  geo.computeVertexNormals(); return geo;
}
// ท่อเรียวตามเส้นโค้ง (หาง คอ เขา ราก งู) · radii = รัศมีตามความยาว
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
  for (let i = 0; i < seg; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// กรวยแหลมวางตามทิศ (หนาม เขา ขน)
function spike(base, dir, len, rad, n = 6, flat = 1) {
  const g = cone(rad, len, n).translate(0, len / 2, 0); if (flat !== 1) g.scale(1, 1, flat);
  const d = dir.clone().normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d);
  return g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)).translate(base.x, base.y, base.z);
}
// ขนเป็นช่อ ๆ รอบทรงรี (center, รัศมี 3 แกน) · keep(n) = เลือกตำแหน่ง · droop = ห้อยลง
function fur(center, rx, ry, rz, count, len, rad, { keep = () => true, droop = 0.35, seed = 1 } = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + seed;
    const n = V(Math.cos(a) * r, y, Math.sin(a) * r);
    if (!keep(n)) continue;
    const base = V(center.x + n.x * rx * 0.92, center.y + n.y * ry * 0.92, center.z + n.z * rz * 0.92);
    const dir = n.clone().add(V(0, -droop, 0)).normalize();
    out.push(spike(base, dir, len * (0.8 + ((i * 0.37) % 0.4)), rad, 5, 0.6));
  }
  return out;
}
// ปีกพังผืด (ค้างคาว/มังกร/ปีศาจ): แผ่นรูปร่างจากนิ้วกระดูก ขอบเว้า
function membrane(span, height, fingers = 4, sag = 0.25) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  const tips = [];
  for (let i = 0; i <= fingers; i++) { const a = 0.5 - (i / fingers) * 1.25; tips.push([Math.cos(a) * span * (1 - i * 0.08), Math.sin(a) * height]); }
  s.lineTo(tips[0][0] * 0.45, tips[0][1] * 1.1);
  s.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) {
    const [x0, y0] = tips[i - 1], [x1, y1] = tips[i];
    s.quadraticCurveTo((x0 + x1) / 2 * (1 - sag), (y0 + y1) / 2 * (1 - sag), x1, y1);
  }
  s.quadraticCurveTo(tips[fingers][0] * 0.3, tips[fingers][1] * 0.2, 0, -height * 0.05);
  return { geo: new THREE.ShapeGeometry(s, 6), tips };
}
// ปีกขนนก/ผลึก: แผ่นเรียงซ้อน
function featherFan(n, len, wid, spread, droop = 0, twist = 0) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const a = 0.35 - (i / (n - 1)) * spread, L = len * (1 - i * 0.07);
    const g = new THREE.PlaneGeometry(wid, L).translate(0, L / 2, 0).rotateY(twist * (i - (n - 1) / 2)).rotateZ(-PI / 2 + a).translate(0, -droop * i, 0);   // twist: บิดขนแต่ละเส้น ไม่ให้ปีกแบนจนเห็นเป็นเส้นเดียว
    gs.push(g);
  }
  return mergeGeometries(gs);
}

const eyeMat = () => toon('#1c1424');
// วัสดุมันวาว (น้ำแข็ง ผลึก โลหะ) — สไปรต์พิกเซลจะมีจุดสะท้อนแสง
const shiny = (c, e) => { const m = toon(c, { emissive: e, emissiveIntensity: 0.25 }); m.userData.pxMetal = true; return m; };
const shineMat = () => toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 });
// ตาคู่ (ตาดำ + จุดเงา 2 จุด) · ดันมาข้างหน้าเล็กน้อยตอนถ่ายพิกเซล ให้โผล่พ้นผิวเสมอ
function eyes(parent, y, z, r = 0.05, gap = 0.1, { color, x = 0, tilt = 0, shine = true, glow = false } = {}) {
  const m = glow ? toon(color, { emissive: color, emissiveIntensity: 1.6 }) : color ? toon(color) : eyeMat();
  const e = [-1, 1].map((s) => new THREE.SphereGeometry(r, 12, 10).scale(0.85, 1.15, 0.5).rotateZ(s * tilt).translate(x + s * gap, y, z));
  const em = add(parent, mergeGeometries(e), m, 0, 0, 0, false); em.userData.pxTiny = 0.12;
  if (shine && !glow) {
    const h = [-1, 1].map((s) => new THREE.SphereGeometry(r * 0.34, 8, 6).translate(x + s * gap - r * 0.3, y + r * 0.45, z + r * 0.42));
    const hm = add(parent, mergeGeometries(h), shineMat(), 0, 0, 0, false); hm.userData.pxTiny = 0.13;
  }
  return em;
}

export class MonsterView {
  constructor(mob) {
    this.mob = mob;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.flashMats = [];
    this.time = Math.random() * 10;
    this.phase = Math.random() * 10;
    this.hurtT = 0; this.attackT = 0; this.deadT = -1; this.spawnT = 0; this.slamT = 0; this.slamDur = 1;
    const def = DEFS[mob.data.model] || DEFS.bloblet;
    this.P = def.build(this, mob.data) || {};
    this.animFn = def.anim;

    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
    blob.rotation.x = -PI / 2; blob.position.y = 0.014; blob.renderOrder = 1;
    this.shadow = blob; this.root.add(blob);
    blob.scale.setScalar((mob.data.radius || 0.45) * 2.2);
    // Every flyer needs a finite baseline before animFly updates its shadow.
    if (!Number.isFinite(this.P.shadow0)) this.P.shadow0 = blob.scale.x;
    // เส้นขอบการ์ตูน (โหมด 3 มิติ)
    const solid = [];
    this.body.traverse((o) => { if (o.isMesh && o.castShadow && !o.material.transparent) solid.push(o); });
    for (const o of solid) addOutline(o, 0.012);
  }

  // วัสดุเฉพาะตัว ใช้กระพริบขาวตอนโดนตี
  own(color, opts = {}) {
    const o = { ...opts }; delete o.roughness; delete o.metalness;
    const m = toonOwn(color, o);
    m.userData.baseEmissive = m.emissive.clone();
    this.flashMats.push(m);
    return m;
  }

  hurt() { this.hurtT = 0.22; }
  die() { this.deadT = 0; }
  respawn() { this.deadT = -1; this.spawnT = 0.0001; this.root.visible = true; this.body.scale.set(0.01, 0.01, 0.01); }
  attack() { this.attackT = 0.45; }
  slam(dur = 1.3) { this.slamT = dur; this.slamDur = dur; }

  update(dt, mob) {
    this.time += dt; const t = this.time;
    this.root.position.set(mob.x / 16, 0, mob.y / 16);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, mob.angle, damp(10, dt));

    if (this.hurtT > 0 || this.flashing) {
      this.hurtT = Math.max(0, this.hurtT - dt);
      const k = this.hurtT / 0.22;
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive).lerp(WHITE_C, k * 0.8);
      this.flashing = this.hurtT > 0;
    }
    this.body.position.x = this.hurtT > 0 ? Math.sin(t * 90) * 0.05 * (this.hurtT / 0.22) : 0;

    // ตาย: ยุบตัว + จมลง แล้วหายไป
    if (this.deadT >= 0) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.7);
      this.body.scale.set(1 + k * 0.4, Math.max(0.02, 1 - k), 1 + k * 0.4);
      if (this.flyer) this.body.position.y = -0.75 * Math.min(1, this.deadT / 0.4);
      this.shadow.material.opacity = 1 - k;
      if (this.deadT > 0.9) this.root.visible = false;
      return;
    }
    if (this.spawnT > 0) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 0.5);
      const s = k < 1 ? 1 + Math.sin(k * PI) * 0.25 * (1 - k) + (k - 1) * (1 - k) : 1;
      this.body.scale.setScalar(Math.max(0.01, k * s));
      this.shadow.material.opacity = k;
      if (k >= 1) { this.spawnT = 0; this.body.scale.setScalar(1); }
    }
    if (mob.frozen) {
      if (!this.iceColor) this.iceColor = new THREE.Color('#7fd0ff');
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive).lerp(this.iceColor, this.hurtT > 0 ? 0.85 : 0.6);
      this.wasFrozen = true;
      return;
    } else if (this.wasFrozen) {
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive);
      this.wasFrozen = false;
    }
    this.body.rotation.z = mob.stunned ? Math.sin(t * 9) * 0.14 : 0;

    let atk = 0;
    if (this.attackT > 0) { this.attackT = Math.max(0, this.attackT - dt); atk = Math.sin((1 - this.attackT / 0.45) * PI); }
    const moving = !!mob.moving;
    this.phase += dt * (moving ? 9 * (0.5 + 0.5 * (mob.speedFactor || 1)) : 0);
    let slam = -1;
    if (this.slamT > 0) { this.slamT = Math.max(0, this.slamT - dt); slam = 1 - this.slamT / this.slamDur; }
    if (this.animFn) this.animFn(this, this.P, { t, dt, moving, atk, slam, ph: this.phase });
  }

  dispose() {
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.flashMats) m.dispose();
    this.shadow.material.dispose();
  }
}

/* ---------- ท่าทางพื้นฐานที่ใช้ร่วมกัน ---------- */
// เยลลี่: ยุบ-เด้ง กระโดดไปข้างหน้า
function animBlob(v, P, { t, moving, atk, ph }) {
  const h = moving ? Math.abs(Math.sin(ph)) : 0;
  const sy = moving ? 0.86 + h * 0.32 : 1 + Math.sin(t * 3) * 0.04;
  const s = 1 / Math.sqrt(sy);
  P.blob.scale.set(s * (1 + atk * 0.1), sy * (1 + atk * 0.2), s * (1 + atk * 0.15));
  P.blob.position.y = h * 0.24 + atk * 0.12;
  P.blob.position.z = atk * 0.35;
  v.shadow.scale.setScalar(P.shadow0 * (1 - h * 0.3));
}
// สี่ขา: ก้าวสลับทแยง หัวกัด หางแกว่ง
function animQuad(v, P, { t, moving, atk, ph }, { stride = 0.7, rate = 1.3, bob = 0.05 } = {}) {
  const sw = moving ? Math.sin(ph * rate) * stride : 0;
  if (P.legs) { P.legs[0].rotation.x = sw; P.legs[3].rotation.x = sw; P.legs[1].rotation.x = -sw; P.legs[2].rotation.x = -sw; }
  if (P.knees) P.knees.forEach((k, i) => { k.rotation.x = moving ? Math.max(0, Math.sin(ph * rate + (i === 0 || i === 3 ? 0 : PI))) * 0.7 : 0.05; });
  P.torso.position.y = P.y0 + (moving ? Math.abs(Math.sin(ph * rate)) * bob : Math.sin(t * 2) * 0.008);
  P.torso.position.z = atk * 0.25;
  if (P.head) { P.head.rotation.x = -atk * 0.45 + (moving ? 0 : Math.sin(t * 1.3) * 0.05); }
  if (P.jaw) P.jaw.rotation.x = atk * 0.6;
  if (P.tail) P.tail.rotation.y = Math.sin(t * (moving ? 12 : 3.5)) * 0.32;
}
// บิน: กระพือปีก ลอยขึ้นลง โฉบลงตอนโจมตี
function animFly(v, P, { t, moving, atk }, { rate = 16, amp = 0.7, base = 0.2, hover = 0.08 } = {}) {
  const flap = Math.sin(t * rate) * amp;
  P.wings[0].rotation.z = base + flap; P.wings[1].rotation.z = -base - flap;
  if (P.wings2) { P.wings2[0].rotation.z = base * 0.6 + flap * 0.8; P.wings2[1].rotation.z = -base * 0.6 - flap * 0.8; }
  P.core.position.y = P.y0 + Math.sin(t * 3) * hover - atk * 0.3;
  P.core.position.z = atk * 0.45;
  P.core.rotation.x = (P.tilt || 0) + atk * 0.5 + (moving ? 0.18 : 0);
  v.shadow.scale.setScalar(P.shadow0 * (1 + Math.sin(t * 3) * 0.04));
}
// สองขาตัวใหญ่: ย่ำเดิน แขนแกว่ง ต่อยแขนขวา ทุบพื้นสองมือ
function animBrute(v, P, { t, dt, moving, atk, slam, ph }, { stride = 0.45, armSwing = 0.4 } = {}) {
  const st = moving ? Math.sin(ph * 0.75) : 0;
  P.legs[0].rotation.x = st * stride; P.legs[1].rotation.x = -st * stride;
  P.torso.position.y = P.y0 + (moving ? Math.abs(st) * 0.06 : Math.sin(t * 1.5) * 0.012);
  P.torso.rotation.z = moving ? st * 0.05 : 0;
  let a0 = -st * armSwing + Math.sin(t * 1.4) * 0.04, a1 = st * armSwing - Math.sin(t * 1.4) * 0.04;
  if (atk > 0) a0 = -2.0 * atk;
  if (slam >= 0) {
    const lift = slam < 0.72 ? Math.sin((slam / 0.72) * PI * 0.5) : 1 - ((slam - 0.72) / 0.28) * 1.6;
    a0 = a1 = -2.7 * Math.max(-0.4, lift);
    P.torso.rotation.x = slam < 0.72 ? -0.14 * (slam / 0.72) : 0.22 * (1 - (slam - 0.72) / 0.28);
  } else P.torso.rotation.x *= 1 - damp(8, dt);
  P.arms[0].rotation.x = a0; P.arms[1].rotation.x = a1;
  if (P.head) P.head.rotation.y = Math.sin(t * 0.8) * 0.12;
}

/* ================= มอนสเตอร์แต่ละชนิด ================= */
const DEFS = {
  /* ---------- ทุ่งหญ้าฝึกมือ ---------- */
  // บล็อบเล็ต: เยลลี่ทรงหยดน้ำ ปลายยอดม้วน ตาโต แก้มแดง
  bloblet: {
    build(v, d) {
      const P = {}, g = P.blob = grp(v.body);
      const mat = v.own(d.color, { emissive: lin(d.color).multiplyScalar(0.1) });
      add(g, ridges(lathe([[0, 0], [0.26, 0.01], [0.35, 0.09], [0.36, 0.2], [0.31, 0.33], [0.22, 0.44], [0.12, 0.52], [0.05, 0.58], [0, 0.6]], 30), 1, 0), mat);
      add(g, tube([[0, 0.56, 0], [0.02, 0.66, -0.04], [-0.02, 0.72, -0.1], [-0.06, 0.68, -0.14]], [0.055, 0.04, 0.025, 0.012], 8, 12), mat);
      const hl = add(g, sph(0.08, 12, 8), toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.3 }), -0.15, 0.4, 0.17, false); hl.scale.set(1.1, 0.6, 0.5); hl.rotation.z = 0.5;
      add(g, sph(0.03, 8, 6), toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.3 }), -0.05, 0.47, 0.17, false);
      eyes(g, 0.25, 0.3, 0.058, 0.11);
      const mouth = add(g, new THREE.TorusGeometry(0.035, 0.012, 6, 12, PI), toon('#3a1a2a'), 0, 0.15, 0.33, false); mouth.rotation.z = PI; mouth.userData.pxTiny = 0.1;
      const bl = [-1, 1].map((s) => sph(0.035, 10, 8).scale(1.5, 0.7, 0.4).translate(s * 0.2, 0.18, 0.29));
      add(g, mergeGeometries(bl), toon('#ff8aa8'), 0, 0, 0, false).userData.pxTiny = 0.08;
      P.shadow0 = 1;
      return P;
    },
    anim: (v, P, s) => animBlob(v, P, s),
  },

  // แคปปลิง: เห็ดเดินได้ หมวกบานขอบหยัก ใต้หมวกเป็นครีบ จุดเรืองแสง มีแขนขาสั้น
  capling: {
    build(v, d) {
      const P = {}, g = P.root = grp(v.body);
      const stem = toon('#f2e6cc'), gill = toon('#d8c4a0');
      add(g, lathe([[0, 0.08], [0.17, 0.09], [0.2, 0.18], [0.19, 0.3], [0.15, 0.42], [0.13, 0.48], [0, 0.5]], 22), stem);
      eyes(g, 0.32, 0.18, 0.045, 0.07);
      add(g, new THREE.TorusGeometry(0.025, 0.009, 6, 10, PI), toon('#5a3a2a'), 0, 0.24, 0.19, false).rotation.z = PI;
      const cap = P.cap = grp(g, 0, 0.47, 0);
      const capMat = v.own(d.color);
      add(cap, ridges(lathe([[0.44, -0.02], [0.45, 0.04], [0.42, 0.12], [0.34, 0.22], [0.2, 0.3], [0.08, 0.33], [0, 0.335]], 36), 14, 0.018), capMat);
      add(cap, ridges(lathe([[0.43, -0.02], [0.3, -0.05], [0.14, -0.05], [0.12, -0.03]], 36), 24, 0.012), gill);
      const spots = [];
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3 + 0.4, el = i === 0 ? 1.45 : 0.45 + (i % 3) * 0.28, R = 0.4;
        spots.push(sph(0.055, 10, 8).scale(1, 0.45, 1).translate(Math.cos(a) * Math.cos(el) * R * 1.02, Math.sin(el) * 0.33 * 1.02 + 0.02, Math.sin(a) * Math.cos(el) * R * 1.02));
      }
      add(cap, mergeGeometries(spots), toon('#e0faff', { emissive: '#7fe0ff', emissiveIntensity: 1.0 }), 0, 0, 0, false);
      const sprout = grp(cap, 0.04, 0.32, 0);
      add(sprout, cyl(0.008, 0.01, 0.1, 5), toon('#4a8a3a'), 0, 0.05, 0);
      for (const s of [-1, 1]) { const lf = add(sprout, sph(0.04, 8, 6), toon('#6ac85a'), s * 0.04, 0.1, 0); lf.scale.set(1.3, 0.35, 0.7); lf.rotation.z = s * 0.5; }
      P.arms = [-1, 1].map((s) => { const a = grp(g, s * 0.19, 0.28, 0.02); add(a, cyl(0.035, 0.03, 0.14, 8), stem, s * 0.02, -0.06, 0).rotation.z = s * 0.3; add(a, sph(0.035, 8, 6), stem, s * 0.05, -0.13, 0); return a; });
      P.feet = [-1, 1].map((s) => { const f = add(v.body, sph(0.08, 12, 8), toon('#7a5232'), s * 0.1, 0.05, 0.03); f.scale.set(1, 0.65, 1.35); return f; });
      return P;
    },
    anim(v, P, { t, moving, atk, ph }) {
      P.root.rotation.z = moving ? Math.sin(ph) * 0.14 : Math.sin(t * 1.8) * 0.03;
      P.root.position.y = moving ? Math.abs(Math.cos(ph)) * 0.05 : 0;
      P.cap.rotation.x = atk * 0.6; P.root.position.z = atk * 0.2;
      P.arms[0].rotation.x = moving ? Math.sin(ph) * 0.6 : 0; P.arms[1].rotation.x = moving ? -Math.sin(ph) * 0.6 : 0;
      P.feet[0].position.y = 0.05 + (moving ? Math.max(0, Math.sin(ph)) * 0.07 : 0);
      P.feet[1].position.y = 0.05 + (moving ? Math.max(0, -Math.sin(ph)) * 0.07 : 0);
    },
  },

  // สติงเล็ต: แตนยักษ์ อกขนฟู ตารวม ท้องเป็นปล้องลายเหลืองดำ ปีก 2 คู่ เหล็กใน
  stinglet: {
    build(v, d) {
      const P = {}; v.flyer = true;
      const c = P.core = grp(v.body, 0, 0.85, 0); P.y0 = 0.85; P.tilt = 0.12;
      const yel = v.own(d.color), blk = toon('#2e2018'), fuzz = toon(shadeHex(d.color, 0.25));
      add(c, sph(0.16, 18, 14), yel, 0, 0, 0.02).scale.set(1, 0.95, 1.05);
      add(c, mergeGeometries(fur(V(0, 0, 0.02), 0.16, 0.15, 0.17, 26, 0.07, 0.03, { droop: 0.1, keep: (n) => n.y > -0.3 })), fuzz);
      const head = grp(c, 0, 0.04, 0.2);
      add(head, sph(0.12, 16, 12), blk).scale.set(1.05, 0.95, 0.9);
      const ce = [-1, 1].map((s) => sph(0.07, 12, 10).scale(0.8, 1.2, 0.8).translate(s * 0.075, 0.02, 0.06));
      const em = add(head, mergeGeometries(ce), toon('#8a1a2a', { emissive: '#2a0008' })); em.userData.pxTiny = 0.04;
      for (const s of [-1, 1]) { add(head, tube([[s * 0.04, 0.08, 0.06], [s * 0.08, 0.2, 0.1], [s * 0.13, 0.26, 0.14]], [0.011, 0.008, 0.006], 5, 8), blk); add(head, sph(0.02, 8, 6), blk, s * 0.13, 0.26, 0.14); }
      for (const s of [-1, 1]) { const m = add(head, cone(0.02, 0.07, 5), toon('#c8a060'), s * 0.03, -0.08, 0.08); m.rotation.set(0.8, 0, s * 0.4); }
      const ab = P.abdomen = grp(c, 0, -0.02, -0.12, [0.45, 0, 0]);
      const segs = [[0.16, 0, yel], [0.17, -0.11, blk], [0.155, -0.21, yel], [0.13, -0.3, blk], [0.1, -0.37, yel]];
      for (const [r, z, m] of segs) add(ab, sph(r, 16, 12), m, 0, 0, z).scale.set(1, 0.92, 0.85);
      const st = add(ab, cone(0.03, 0.14, 6), toon('#e8e2d8'), 0, 0, -0.47); st.rotation.x = -PI / 2;
      const wingMat = toon('#dff2ff', { transparent: true, opacity: 0.62, side: THREE.DoubleSide, emissive: '#203040', emissiveIntensity: 0.2 });
      const wshape = (L, W) => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(L * 0.3, W, L * 0.85, W * 0.9, L, 0); sh.bezierCurveTo(L * 0.7, -W * 0.5, L * 0.2, -W * 0.4, 0, 0); return new THREE.ShapeGeometry(sh, 8).rotateX(-PI / 2); };
      P.wings = [-1, 1].map((s) => { const w = grp(c, s * 0.08, 0.13, 0.0); add(w, wshape(0.42, 0.14).scale(s, 1, 1), wingMat, 0, 0, 0, false).rotation.y = s * -0.35; return w; });
      P.wings2 = [-1, 1].map((s) => { const w = grp(c, s * 0.08, 0.11, -0.06); add(w, wshape(0.3, 0.1).scale(s, 1, 1), wingMat, 0, 0, 0, false).rotation.y = s * -0.7; return w; });
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) add(c, tube([[s * 0.06, -0.1, 0.05 - i * 0.06], [s * 0.12, -0.2, 0.06 - i * 0.07], [s * 0.1, -0.32, 0.08 - i * 0.07]], [0.012, 0.009, 0.006], 5, 8), blk);
      P.shadow0 = v.shadow ? 1 : 1;
      return P;
    },
    anim(v, P, s) { animFly(v, P, s, { rate: 42, amp: 0.55, base: 0.25, hover: 0.07 }); P.abdomen.rotation.x = 0.45 + s.atk * 0.7 + Math.sin(s.t * 3) * 0.04; },
  },

  // ธอร์นแบ็ก: เม่นป่า หนามหลังเป็นกระจุกสองโทน จมูกชมพู ขาสั้นสี่ขา
  thornback: {
    build(v, d) {
      const P = {}, g = P.hog = grp(v.body);
      const belly = v.own('#e0c49a'), back = v.own(d.color), tip = toon('#efe2c0'), dark = toon(shadeHex(d.color, -0.35));
      add(g, sph(0.32, 22, 16), belly, 0, 0.29, 0.03).scale.set(1, 0.85, 1.12);
      add(g, sph(0.355, 22, 14), back, 0, 0.33, -0.07).scale.set(1.05, 0.95, 1.1);
      const qs = [], qt = [];
      for (let i = 0; i < 90; i++) {
        const y = 1 - ((i + 0.5) / 90) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        const n = V(Math.cos(a) * r, y, Math.sin(a) * r);
        if (n.z > 0.25 || n.y < -0.25) continue;
        const base = V(n.x * 0.34, 0.33 + n.y * 0.31, -0.07 + n.z * 0.37);
        const dir = n.clone().add(V(0, 0.15, -0.55)).normalize();
        const L = 0.2 + ((i * 0.37) % 0.12);
        qs.push(spike(base, dir, L * 0.75, 0.04, 5));
        qt.push(spike(base.clone().addScaledVector(dir, L * 0.72), dir, L * 0.3, 0.018, 4));
      }
      add(g, mergeGeometries(qs), dark); add(g, mergeGeometries(qt), tip);
      const snout = grp(g, 0, 0.26, 0.33);
      add(snout, cone(0.11, 0.2, 12), belly, 0, 0, 0.06).rotation.x = PI / 2;
      add(snout, sph(0.035, 10, 8), toon('#3a2020'), 0, 0.01, 0.17);
      eyes(g, 0.36, 0.31, 0.04, 0.12, { tilt: 0.2 });
      for (const s of [-1, 1]) { const e = add(g, sph(0.05, 10, 8), belly, s * 0.2, 0.47, 0.14); e.scale.set(0.8, 1, 0.4); }
      P.feet = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => { const f = add(v.body, sph(0.07, 10, 8), toon('#5a3a26'), sx * 0.17, 0.05, sz * 0.15); f.scale.set(1, 0.6, 1.3); return f; });
      return P;
    },
    anim(v, P, { t, moving, atk, ph }) {
      P.hog.rotation.z = moving ? Math.sin(ph) * 0.12 : Math.sin(t * 1.6) * 0.02;
      P.hog.position.y = moving ? Math.abs(Math.cos(ph)) * 0.04 : 0;
      P.hog.position.z = atk * 0.3; P.hog.rotation.x = atk * 0.5;
      const k = 1 + atk * 0.12; P.hog.scale.set(k, 1 - atk * 0.1, k);
      P.feet.forEach((f, i) => { f.position.y = 0.05 + (moving ? Math.max(0, Math.sin(ph + (i % 3 === 0 ? 0 : PI))) * 0.06 : 0); });
    },
  },

  /* ---------- ป่ากระซิบ ---------- */
  // วิสป์: ภูตเปลวไฟลอยได้ ตัวเป็นเปลวหลายชั้น มือเล็ก ๆ หางเปลวยาว ประกายวนรอบตัว
  wisp: {
    build(v, d) {
      const P = {}; v.flyer = true;
      const c = P.core = grp(v.body, 0, 0.85, 0); P.y0 = 0.85;
      const outer = v.own(d.color, { emissive: lin(d.color).multiplyScalar(0.18) }), inner = toon('#f4fff8', { emissive: '#bfffe0', emissiveIntensity: 1.2 });
      add(c, ridges(lathe([[0, -0.2], [0.14, -0.16], [0.2, -0.04], [0.19, 0.08], [0.13, 0.2], [0.06, 0.3], [0, 0.42]], 26), 6, 0.025), outer);
      for (const [x, y, r] of [[-0.12, 0.2, 0.18], [0.1, 0.24, 0.16], [0, 0.32, 0.14]]) { const f = add(c, cone(0.06, r, 8), outer, x, y, -0.04); f.rotation.z = -x * 2; }
      add(c, sph(0.1, 12, 10), inner, 0, -0.04, 0.09, false);
      eyes(c, 0.06, 0.18, 0.04, 0.07);
      add(c, sph(0.018, 8, 6), toon('#2a3a3a'), 0, -0.02, 0.2, false).userData.pxTiny = 0.08;
      P.hands = [-1, 1].map((s) => add(c, sph(0.045, 10, 8), outer, s * 0.21, -0.06, 0.06));
      const tail = P.wtail = grp(c, 0, -0.14, -0.06);
      add(tail, tube([[0, 0, 0], [0, -0.12, -0.14], [0.04, -0.18, -0.32], [-0.02, -0.16, -0.46]], [0.12, 0.08, 0.04, 0.008], 10, 16), outer);
      P.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: d.color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.glow.scale.set(0.9, 0.9, 1); c.add(P.glow);
      P.sparks = [0, 1, 2].map(() => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#d8fff0', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(0.12, 0.12, 1); c.add(sp); return sp; });
      return P;
    },
    anim(v, P, { t, moving, atk }) {
      P.core.position.y = 0.85 + Math.sin(t * 2.6) * 0.1 + atk * 0.1;
      P.core.position.z = atk * 0.5;
      P.core.rotation.z = Math.sin(t * 1.7) * 0.08;
      P.wtail.rotation.x = (moving ? -0.35 : 0) + Math.sin(t * 9) * 0.1;
      P.wtail.rotation.y = Math.sin(t * 4) * 0.25;
      P.hands[0].position.y = -0.06 + Math.sin(t * 3) * 0.03; P.hands[1].position.y = -0.06 - Math.sin(t * 3) * 0.03;
      P.glow.material.opacity = 0.5 + Math.sin(t * 5) * 0.12 + atk * 0.3;
      P.sparks.forEach((sp, i) => { const a = t * 2.4 + (i / 3) * PI * 2; sp.position.set(Math.cos(a) * 0.34, Math.sin(t * 3 + i) * 0.14, Math.sin(a) * 0.34); });
      v.shadow.scale.setScalar(0.7 + Math.sin(t * 2.6) * 0.05);
    },
  },

  // บาร์กวูล์ฟ: หมาป่าเปลือกไม้ แผงคอเป็นใบไม้ หลังมีแผ่นเปลือกไม้กับมอส หางพุ่ม ตาเหลืองเรือง
  barkwolf: {
    build(v, d) {
      const P = {};
      const fur0 = v.own(d.color), furL = v.own(shadeHex(d.color, 0.28)), bark = toon('#4a3422'), moss = toon('#6aa84a'), mossD = toon('#4a7a34');
      const T = P.torso = grp(v.body, 0, 0.52, 0); P.y0 = 0.52;
      add(T, sph(0.24, 20, 14), fur0, 0, 0, 0.02).scale.set(0.95, 0.9, 1.7);
      add(T, sph(0.2, 16, 12), furL, 0, -0.05, 0.22).scale.set(0.95, 1, 1);
      add(T, mergeGeometries(fur(V(0, 0.02, 0.28), 0.17, 0.2, 0.12, 30, 0.12, 0.045, { droop: 0.5, keep: (n) => n.z > -0.1 })), furL);
      const plates = [];
      for (let i = 0; i < 6; i++) { const z = 0.25 - i * 0.12; plates.push(new THREE.BoxGeometry(0.2 - i * 0.012, 0.05, 0.13).rotateX(-0.2).translate(0, 0.22 - Math.abs(z) * 0.08, z)); }
      add(T, mergeGeometries(plates), bark);
      add(T, mergeGeometries(fur(V(0, 0.2, 0), 0.12, 0.06, 0.3, 26, 0.06, 0.05, { droop: -0.2, keep: (n) => n.y > 0.3 })), moss);
      const sap = grp(T, 0.02, 0.26, -0.05);
      add(sap, cyl(0.01, 0.014, 0.16, 5), bark, 0, 0.08, 0);
      for (const [x, y, s] of [[-0.05, 0.14, 1], [0.05, 0.17, -1], [0, 0.2, 1]]) { const lf = add(sap, sph(0.04, 8, 6), mossD, x, y, 0); lf.scale.set(1.3, 0.4, 0.8); lf.rotation.z = s * 0.5; }
      const H = P.head = grp(T, 0, 0.12, 0.46);
      add(H, sph(0.15, 16, 12), fur0, 0, 0.02, 0).scale.set(1, 0.95, 1.05);
      add(H, cyl(0.06, 0.09, 0.2, 12), furL, 0, -0.03, 0.15).rotation.x = PI / 2;
      add(H, sph(0.035, 10, 8), toon('#1a1414'), 0, -0.01, 0.26);
      const jaw = P.jaw = grp(H, 0, -0.07, 0.05);
      add(jaw, cyl(0.045, 0.07, 0.17, 10), furL, 0, -0.01, 0.1).rotation.x = PI / 2;
      for (const s of [-1, 1]) { const f = add(jaw, cone(0.012, 0.035, 4), toon('#f4eee0'), s * 0.03, 0.025, 0.17); f.rotation.x = PI; }
      eyes(H, 0.06, 0.12, 0.028, 0.065, { color: '#ffd84a', glow: true, tilt: 0.3 });
      for (const s of [-1, 1]) { const e = add(H, cone(0.06, 0.15, 6), fur0, s * 0.08, 0.17, -0.03); e.rotation.set(-0.2, 0, s * -0.25); add(H, cone(0.03, 0.08, 5), toon('#c89a7a'), s * 0.08, 0.16, -0.0).rotation.set(-0.2, 0, s * -0.25); }
      P.legs = []; P.knees = [];
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const L = grp(T, sx * 0.13, -0.08, sz * 0.24);
        add(L, cyl(0.06, 0.045, 0.24, 10), fur0, 0, -0.11, 0);
        const K = grp(L, 0, -0.22, 0);
        add(K, cyl(0.04, 0.035, 0.2, 8), fur0, 0, -0.1, 0);
        add(K, sph(0.045, 8, 6), toon('#3a2a1e'), 0, -0.2, 0.03).scale.set(1, 0.6, 1.3);
        P.legs.push(L); P.knees.push(K);
      }
      const tail = P.tail = grp(T, 0, 0.08, -0.38);
      add(tail, tube([[0, 0, 0], [0, 0.06, -0.12], [0, 0.04, -0.26], [0, -0.04, -0.38]], [0.07, 0.1, 0.08, 0.02], 10, 14), fur0);
      add(tail, mergeGeometries(fur(V(0, 0.03, -0.25), 0.07, 0.07, 0.12, 14, 0.06, 0.035, { droop: 0.2 })), mossD);
      return P;
    },
    anim: (v, P, s) => { animQuad(v, P, s); P.head.position.z = 0.46 + s.atk * 0.18; },
  },

  // กนาร์ลรูท (MVP): ต้นไม้เฒ่าเดินได้ ลำต้นบิดมีร่องเปลือก หน้าโพรงตาเรือง กิ่งเป็นแขน รากเป็นขา พุ่มใบหนา
  gnarlroot: {
    build(v, d) {
      const P = {};
      const bark = v.own(d.color), barkD = toon(shadeHex(d.color, -0.3)), leaf = v.own('#4e9a3e'), leafL = toon('#74c058'), leafD = toon('#2e6a2a'), mossM = toon('#7ab84a');
      const T = P.torso = grp(v.body); P.y0 = 0;
      const trunk = ridges(lathe([[0.62, 0.0], [0.55, 0.2], [0.46, 0.6], [0.44, 1.2], [0.47, 1.7], [0.42, 2.1], [0.3, 2.35], [0, 2.4]], 40), 11, 0.06);
      add(T, trunk, bark);
      const eyeM = toon('#ffe066', { emissive: '#ffc020', emissiveIntensity: 1.8 }); P.eyeM = eyeM;
      for (const s of [-1, 1]) {
        add(T, sph(0.12, 12, 10), toon('#1e140c'), s * 0.17, 1.62, 0.38).scale.set(1.2, 0.8, 0.5);
        const e = add(T, sph(0.07, 10, 8), eyeM, s * 0.17, 1.62, 0.42, false); e.scale.set(1.3, 0.75, 0.5); e.userData.pxTiny = 0.06;
        const br = add(T, new THREE.BoxGeometry(0.26, 0.07, 0.1), barkD, s * 0.17, 1.76, 0.42); br.rotation.z = s * 0.25;
      }
      add(T, sph(0.17, 14, 10), toon('#140c08'), 0, 1.3, 0.37).scale.set(1.4, 0.55, 0.45);
      for (const [x, y] of [[-0.3, 0.9], [0.32, 1.25], [-0.2, 0.4]]) add(T, sph(0.12, 10, 8), mossM, x, y, Math.sqrt(Math.max(0, 0.22 - x * x)) + 0.02).scale.set(1.2, 0.6, 0.5);
      for (const [x, y, r] of [[0.42, 0.7, 0.09], [0.47, 0.82, 0.06]]) { add(T, cyl(0.025, 0.03, 0.08, 6), toon('#efe0c0'), x, y - 0.04, 0.12); add(T, sph(r, 10, 6, ), toon('#c84a3a'), x, y, 0.12).scale.set(1, 0.5, 1); }
      const canopy = P.canopy = grp(T, 0, 2.35, 0);
      for (const [x, y, z, r, m] of [[0, 0.35, 0, 0.7, leaf], [0.55, 0.1, 0.1, 0.5, leaf], [-0.55, 0.12, 0, 0.52, leaf], [0.1, 0.15, 0.5, 0.48, leafL], [-0.15, 0.2, -0.5, 0.5, leafD], [0.35, 0.55, -0.2, 0.42, leafL], [-0.35, 0.5, 0.25, 0.4, leafL], [0, -0.1, -0.2, 0.55, leafD]])
        add(canopy, ridges(sph(r, 18, 12), 7, 0.04), m, x, y, z).scale.set(1, 0.82, 1);
      for (const [x, z, L] of [[-0.5, 0.3, 0.7], [0.45, 0.35, 0.55], [0.2, -0.45, 0.6]]) add(canopy, tube([[x, -0.1, z], [x * 1.05, -0.35, z * 1.05], [x * 1.1, -L, z * 1.1]], [0.03, 0.025, 0.012], 5, 8), leafD);
      P.arms = [-1, 1].map((s) => {
        const A = grp(T, s * 0.42, 1.55, 0.05);
        add(A, tube([[0, 0, 0], [s * 0.35, -0.15, 0.05], [s * 0.55, -0.55, 0.12], [s * 0.58, -0.95, 0.18]], [0.13, 0.1, 0.08, 0.06], 8, 16), bark);
        for (const k of [-1, 0, 1]) add(A, tube([[s * 0.58, -0.93, 0.18], [s * (0.6 + k * 0.08), -1.1, 0.2 + k * 0.04], [s * (0.62 + k * 0.14), -1.24, 0.24 + k * 0.08]], [0.045, 0.03, 0.008], 5, 8), barkD);
        add(A, sph(0.1, 8, 6), leafL, s * 0.3, -0.05, 0.1).scale.set(1, 0.5, 0.8);
        return A;
      });
      P.legs = [-1, 1].map((s) => {
        const L = grp(v.body, s * 0.3, 0.25, 0);
        for (const k of [-0.5, 0.3, 1]) add(L, tube([[0, 0, 0], [s * 0.18, -0.1, k * 0.25], [s * 0.38, -0.24, k * 0.42]], [0.16, 0.1, 0.03], 7, 10), barkD);
        return L;
      });
      return P;
    },
    anim(v, P, s) {
      animBrute(v, P, s, { stride: 0.25, armSwing: 0.25 });
      P.canopy.rotation.z = Math.sin(s.t * 0.9) * 0.04; P.canopy.rotation.x = Math.sin(s.t * 0.7) * 0.03;
      P.eyeM.emissiveIntensity = 1.6 + Math.sin(s.t * 4) * 0.3 + (s.slam >= 0 ? 1.2 : 0);
    },
  },
  /* ---------- ยอดเขาหิมะ ---------- */
  // ฟรอสต์ฟ็อกซ์: จิ้งจอกหิมะ หางฟูสามหางปลายเป็นผลึกน้ำแข็ง ขนคอฟู ลายฟ้าบนหน้า
  frostfox: {
    build(v, d) {
      const P = {};
      const furW = v.own(d.color), furB = toon('#a8c8e8'), ice = shiny('#c8f0ff', '#3a8ac8'), inner = toon('#f0c8d8');
      const T = P.torso = grp(v.body, 0, 0.44, 0); P.y0 = 0.44;
      add(T, sph(0.23, 18, 12), furW, 0, 0, 0).scale.set(0.9, 0.9, 1.6);
      add(T, mergeGeometries(fur(V(0, 0.02, 0.24), 0.15, 0.17, 0.1, 28, 0.11, 0.04, { droop: 0.55, keep: (n) => n.z > -0.2 })), furW);
      const H = P.head = grp(T, 0, 0.14, 0.36);
      add(H, sph(0.13, 16, 12), furW, 0, 0.02, 0).scale.set(1, 0.95, 1);
      add(H, cone(0.075, 0.22, 10), furW, 0, -0.02, 0.17).rotation.x = PI / 2;
      add(H, sph(0.025, 8, 6), toon('#2a2a3a'), 0, -0.02, 0.28);
      const jaw = P.jaw = grp(H, 0, -0.06, 0.05); add(jaw, cone(0.05, 0.17, 8), furW, 0, 0, 0.1).rotation.x = PI / 2;
      eyes(H, 0.05, 0.11, 0.03, 0.06, { color: '#3a7ad8', tilt: 0.35 });
      for (const sx of [-1, 1]) {
        const e = add(H, cone(0.065, 0.2, 6), furW, sx * 0.075, 0.18, -0.02); e.rotation.set(-0.15, 0, sx * -0.3);
        add(H, cone(0.035, 0.12, 5), inner, sx * 0.075, 0.17, 0.0).rotation.set(-0.15, 0, sx * -0.3);
        const mk = add(H, new THREE.BoxGeometry(0.012, 0.06, 0.01), furB, sx * 0.05, 0.1, 0.12); mk.rotation.z = sx * 0.4;
      }
      P.legs = []; P.knees = [];
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const L = grp(T, sx * 0.11, -0.08, sz * 0.22);
        add(L, cyl(0.06, 0.045, 0.2, 8), furW, 0, -0.08, 0);
        const K = grp(L, 0, -0.17, 0);
        add(K, cyl(0.04, 0.034, 0.18, 8), furW, 0, -0.09, 0);
        add(K, sph(0.045, 8, 6), furB, 0, -0.19, 0.02).scale.set(1, 0.6, 1.3);
        P.legs.push(L); P.knees.push(K);
      }
      const tail = P.tail = grp(T, 0, 0.06, -0.32);
      for (const k of [-1, 0, 1]) {
        add(tail, tube([[0, 0, 0], [k * 0.08, 0.1, -0.15], [k * 0.18, 0.24, -0.26], [k * 0.22, 0.4, -0.3]], [0.05, 0.11, 0.09, 0.03], 10, 14), furW);
        const tipC = add(tail, oct(0.06), ice, k * 0.22, 0.44, -0.3); tipC.scale.set(0.7, 1.5, 0.7);
      }
      return P;
    },
    anim: (v, P, s) => { animQuad(v, P, s, { stride: 0.75, rate: 1.4, bob: 0.06 }); P.head.position.z = 0.36 + s.atk * 0.15; },
  },

  // ฟรอสต์แบท: ค้างคาวน้ำแข็ง ขนฟู หูใหญ่ เขี้ยว ปีกพังผืดมีนิ้วกระดูก หยดน้ำแข็งห้อยใต้ปีก
  frostbat: {
    build(v, d) {
      const P = {}; v.flyer = true;
      const c = P.core = grp(v.body, 0, 1.0, 0); P.y0 = 1.0;
      const furM = v.own(d.color), belly = toon('#d8eefa'), memb = toon('#5a7ab8', { side: THREE.DoubleSide }), bone = toon('#3a4a7a'), ice = shiny('#d8f6ff', '#3a8ac8');
      add(c, sph(0.2, 18, 14), furM, 0, 0, 0).scale.set(1, 1.05, 0.9);
      add(c, sph(0.15, 14, 10), belly, 0, -0.05, 0.08).scale.set(0.9, 1, 0.6);
      add(c, mergeGeometries(fur(V(0, 0.02, 0), 0.2, 0.21, 0.18, 34, 0.08, 0.035, { droop: 0.4, keep: (n) => n.z < 0.5 })), furM);
      for (const sx of [-1, 1]) { const e = add(c, cone(0.08, 0.24, 6), furM, sx * 0.11, 0.24, 0); e.rotation.z = sx * -0.35; add(c, cone(0.04, 0.15, 5), toon('#c8a8d8'), sx * 0.11, 0.23, 0.03).rotation.z = sx * -0.35; }
      eyes(c, 0.06, 0.17, 0.035, 0.07, { color: '#7ae8ff', glow: true, tilt: 0.3 });
      for (const sx of [-1, 1]) { const f = add(c, cone(0.014, 0.05, 4), toon('#ffffff'), sx * 0.03, -0.04, 0.18); f.rotation.x = PI; f.userData.pxTiny = 0.05; }
      add(c, sph(0.025, 8, 6), toon('#2a2a4a'), 0, 0.01, 0.2);
      P.wings = [-1, 1].map((s) => {
        const w = grp(c, s * 0.15, 0.05, -0.02);
        const { geo, tips } = membrane(0.62, 0.38, 4, 0.3);
        const m = add(w, geo.scale(s, 1, 1), memb, 0, 0, 0, false); m.rotation.x = -0.25;
        for (const [x, y] of tips) add(w, tube([[0, 0, 0], [s * x * 0.5, y * 0.6 + 0.04, -0.02], [s * x, y, 0]], [0.018, 0.012, 0.005], 5, 8), bone).rotation.x = -0.25;
        for (const [x, y] of tips.slice(1)) { const ic = add(w, cone(0.02, 0.1, 5), ice, s * x * 0.9, y * 0.9 - 0.06, 0.02); ic.rotation.x = PI; }
        return w;
      });
      for (const sx of [-1, 1]) add(c, sph(0.03, 8, 6), bone, sx * 0.06, -0.22, 0);
      return P;
    },
    anim(v, P, s) { animFly(v, P, s, { rate: 14, amp: 0.75, base: 0.15, hover: 0.08 }); },
  },

  // เยติ: มนุษย์หิมะร่างยักษ์ ขนเป็นกระจุก หน้าสีฟ้าหม่น เขาโค้ง แขนใหญ่ หมัดหนา ผลึกน้ำแข็งบนไหล่
  yeti: {
    build(v, d) {
      const P = {};
      const furM = v.own(d.color), furS = toon(shadeHex(d.color, -0.12)), face = toon('#7a9ab8'), horn = toon('#d8cfc0'), ice = shiny('#c8f0ff', '#3a8ac8');
      const T = P.torso = grp(v.body, 0, 0.62, 0); P.y0 = 0.62;
      add(T, sph(0.46, 22, 16), furM, 0, 0.42, 0).scale.set(1, 1.05, 0.8);
      add(T, sph(0.3, 16, 12), toon('#c8d8e8'), 0, 0.3, 0.2).scale.set(1, 1.15, 0.6);
      add(T, mergeGeometries(fur(V(0, 0.45, 0), 0.47, 0.5, 0.38, 70, 0.14, 0.05, { droop: 0.6 })), furS);
      const H = P.head = grp(T, 0, 0.92, 0.12);
      add(H, sph(0.24, 18, 14), furM, 0, 0, 0).scale.set(1, 0.95, 0.95);
      add(H, sph(0.17, 14, 10), face, 0, -0.04, 0.12).scale.set(1, 0.85, 0.6);
      eyes(H, 0.0, 0.2, 0.035, 0.07);
      add(H, new THREE.BoxGeometry(0.12, 0.025, 0.02), toon('#2a3040'), 0, -0.1, 0.21);
      for (const sx of [-1, 1]) { const f = add(H, cone(0.016, 0.05, 4), toon('#ffffff'), sx * 0.04, -0.11, 0.21); f.rotation.x = PI; }
      add(H, mergeGeometries(fur(V(0, 0.08, 0), 0.24, 0.2, 0.22, 30, 0.11, 0.05, { droop: 0.3, keep: (n) => n.z < 0.55 || n.y > 0.5 })), furS);
      for (const sx of [-1, 1]) add(H, tube([[sx * 0.18, 0.12, -0.02], [sx * 0.32, 0.2, -0.06], [sx * 0.36, 0.36, -0.02], [sx * 0.3, 0.44, 0.05]], [0.06, 0.05, 0.035, 0.01], 8, 12), horn);
      P.arms = [-1, 1].map((s) => {
        const A = grp(T, s * 0.48, 0.6, 0.02);
        add(A, sph(0.18, 14, 10), furM, 0, 0, 0);
        add(A, cyl(0.14, 0.12, 0.42, 12), furM, s * 0.03, -0.25, 0);
        add(A, mergeGeometries(fur(V(s * 0.03, -0.2, 0), 0.14, 0.24, 0.13, 22, 0.1, 0.045, { droop: 0.7 })), furS);
        add(A, sph(0.15, 14, 10), face, s * 0.04, -0.52, 0.03).scale.set(1, 0.9, 1.05);
        for (const [x, y, z] of [[0, 0.12, 0], [0.05, 0.08, 0.08], [-0.06, 0.1, -0.06]]) { const cr = add(A, oct(0.07), ice, s * (0.06 + x), y, z); cr.scale.set(0.6, 1.4, 0.6); cr.rotation.z = s * -0.3; }
        return A;
      });
      P.legs = [-1, 1].map((s) => {
        const L = grp(v.body, s * 0.22, 0.62, 0);
        add(L, cyl(0.16, 0.14, 0.4, 12), furM, 0, -0.2, 0);
        add(L, mergeGeometries(fur(V(0, -0.2, 0), 0.16, 0.2, 0.15, 16, 0.09, 0.045, { droop: 0.8 })), furS);
        add(L, sph(0.15, 12, 8), face, 0, -0.55, 0.06).scale.set(1, 0.5, 1.4);
        return L;
      });
      return P;
    },
    anim: (v, P, s) => animBrute(v, P, s, { stride: 0.42, armSwing: 0.35 }),
  },

  // ไอซ์โกเลม: โกเลมผลึกน้ำแข็ง ลำตัวเป็นก้อนผลึกเหลี่ยมล้อมแกนเรืองแสง แขนเป็นกองผลึก
  icegolem: {
    build(v, d) {
      const P = {};
      const iceM = v.own(d.color, { emissive: lin('#1a4a7a').multiplyScalar(0.6) }), iceL = shiny('#e0f8ff', '#3a7ab8'), iceD = shiny('#5a9ac8', '#0a2a4a');
      iceM.userData.pxMetal = true;
      const core = toon('#bff8ff', { emissive: '#4ae0ff', emissiveIntensity: 1.6 });
      const T = P.torso = grp(v.body, 0, 0.7, 0); P.y0 = 0.7;
      const chunks = [];
      for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; chunks.push(new THREE.DodecahedronGeometry(0.22 + (i % 3) * 0.04, 0).scale(1, 1.2, 0.9).rotateY(a).translate(Math.cos(a) * 0.3, 0.42 + Math.sin(i * 1.7) * 0.15, Math.sin(a) * 0.22)); }
      add(T, mergeGeometries(chunks), iceM);
      add(T, oct(0.16), core, 0, 0.45, 0.24, false).scale.set(1, 1.3, 0.7);
      const spk = [];
      for (let i = 0; i < 7; i++) { const a = -0.9 + (i / 6) * 1.8; spk.push(new THREE.ConeGeometry(0.07, 0.36 + (i % 2) * 0.15, 5).translate(0, 0.18, 0).rotateX(-0.5).rotateZ(a * 0.6).translate(Math.sin(a) * 0.25, 0.7, -0.2)); }
      add(T, mergeGeometries(spk), iceL);
      const H = P.head = grp(T, 0, 0.95, 0.06);
      add(H, new THREE.DodecahedronGeometry(0.19, 0), iceL).scale.set(1.1, 0.9, 1);
      for (const sx of [-1, 1]) { const e = add(H, sph(0.04, 8, 6), core, sx * 0.07, 0.0, 0.16, false); e.scale.set(1.3, 0.7, 0.5); e.userData.pxTiny = 0.05; }
      P.arms = [-1, 1].map((s) => {
        const A = grp(T, s * 0.52, 0.62, 0);
        add(A, new THREE.DodecahedronGeometry(0.2, 0), iceD, s * 0.02, 0, 0);
        add(A, new THREE.BoxGeometry(0.2, 0.34, 0.2).rotateY(0.4), iceM, s * 0.04, -0.28, 0);
        add(A, new THREE.DodecahedronGeometry(0.2, 0), iceL, s * 0.06, -0.55, 0.04).scale.set(1, 1.1, 1);
        const sp = add(A, cone(0.05, 0.22, 5), iceL, s * 0.12, 0.12, 0); sp.rotation.z = s * -0.7;
        return A;
      });
      P.legs = [-1, 1].map((s) => {
        const L = grp(v.body, s * 0.22, 0.7, 0);
        add(L, new THREE.BoxGeometry(0.22, 0.42, 0.24).rotateY(0.3), iceD, 0, -0.25, 0);
        add(L, new THREE.DodecahedronGeometry(0.17, 0), iceM, 0, -0.58, 0.05).scale.set(1.2, 0.6, 1.3);
        return L;
      });
      P.core = core;
      return P;
    },
    anim(v, P, s) { animBrute(v, P, s, { stride: 0.35, armSwing: 0.3 }); P.core.emissiveIntensity = 1.4 + Math.sin(s.t * 3) * 0.4 + s.atk; },
  },

  // กลาเซีย (MVP): ราชินีหิมะครึ่งนาค ท่อนบนเป็นหญิงสวมมงกุฎผลึก ผมยาวสีฟ้า ท่อนล่างหางงูขด ปีกผลึกด้านหลัง
  glacia: {
    build(v, d) {
      const P = {};
      const scale = v.own(d.color), belly = toon('#e8f6ff'), skin = toon('#dceefc'), hair = toon('#9ad8ff'), gown = v.own('#5a8ad8');
      const ice = shiny('#e0faff', '#4ab0ff'), glowE = toon('#ffffff', { emissive: '#7ae8ff', emissiveIntensity: 2 });
      P.eyeM = glowE;
      // หางงูขดเป็นวง
      const pts = [], radii = [];
      for (let i = 0; i <= 16; i++) { const a = 1.14 + (i / 16) * PI * 2.3, r = 0.95 - i * 0.034; pts.push([Math.cos(a) * r, 0.28 + i * 0.014, Math.sin(a) * r * 0.9 - 0.15]); radii.push(Math.max(0.035, 0.37 - i * 0.021)); }   // เริ่มใต้ลำตัว → ขดวน → ปลายหางเรียวแหลม
      P.coil = grp(v.body);
      add(P.coil, tube(pts, radii, 14, 64, 0.85), scale);
      const belP = pts.map(([x, y, z]) => [x * 0.98, y - 0.12, z * 0.98]);
      add(P.coil, tube(belP, radii.map((r) => r * 0.7), 10, 64, 0.5), belly);
      const fins = [];
      for (let i = 1; i < 15; i += 2) { const [x, y, z] = pts[i]; fins.push(spike(V(x, y + radii[i] * 0.85, z), V(-x * 0.2, 1, -z * 0.2), 0.07 + radii[i] * 0.45, 0.02 + radii[i] * 0.12, 4, 0.4)); }
      add(P.coil, mergeGeometries(fins), ice);
      add(P.coil, sph(radii[0], 14, 10), scale, ...pts[0]).scale.set(1, 0.85, 1);   // ปิดปลายท่อด้านลำตัว
      // ลำตัวท่อนบน
      const T = P.torso = grp(v.body, 0.3, 0.55, 0.55); P.y0 = 0.55;
      add(T, tube([[0, -0.3, -0.15], [0, 0.1, 0], [0, 0.6, 0.05]], [0.34, 0.27, 0.22], 14, 16), scale);
      add(T, ridges(lathe([[0.3, 0.42], [0.25, 0.58], [0.17, 0.76], [0.19, 0.92], [0.21, 1.02], [0.17, 1.14], [0.1, 1.22], [0.05, 1.26]], 30), 9, 0.01), gown);   // ชุดรัดเอว
      add(T, ridges(lathe([[0.36, 0.3], [0.3, 0.48], [0.24, 0.6], [0.0, 0.62]], 30), 12, 0.02), gown, 0, -0.02, 0);   // ชายกระโปรงคลุมรอยต่อหาง
      add(T, new THREE.TorusGeometry(0.18, 0.025, 6, 24), ice, 0, 0.77, 0).rotation.x = PI / 2;   // เข็มขัดน้ำแข็ง
      { const col = []; for (let i = 0; i < 9; i++) { const a = -1.3 + (i / 8) * 2.6; col.push(spike(V(Math.sin(a) * 0.12, 1.22, -Math.cos(a) * 0.1), V(Math.sin(a) * 0.5, 1, -0.6), 0.2 + (i % 2) * 0.08, 0.035, 4, 0.35)); } add(T, mergeGeometries(col), ice); }   // ปกคอผลึกน้ำแข็งด้านหลัง
      add(T, cyl(0.06, 0.07, 0.14, 10), skin, 0, 1.3, 0);
      const H = P.head = grp(T, 0, 1.48, 0.02);
      add(H, sph(0.16, 18, 14), skin, 0, 0, 0).scale.set(0.92, 1.05, 0.95);
      eyes(H, -0.015, 0.143, 0.026, 0.052, { color: '#2a4ab0' });
      add(H, sph(0.012, 6, 4), toon('#c86a8a'), 0, -0.085, 0.145, false).userData.pxTiny = 0.12;   // ปาก
      add(T, new THREE.OctahedronGeometry(0.06, 0), glowE, 0, 1.12, 0.21, false).scale.set(0.8, 1.2, 0.5);   // อัญมณีกลางอก (เรืองตอนร่ายท่า)
      const hs = [];
      for (let i = 0; i < 13; i++) { const a = PI * 0.45 + (i / 12) * PI * 1.1; hs.push(tube([[Math.cos(a) * 0.12, 0.12, Math.sin(a) * -0.12 - 0.02], [Math.cos(a) * 0.2, -0.1, -Math.abs(Math.sin(a)) * 0.2 - 0.05], [Math.cos(a) * 0.22, -0.45 - (i % 3) * 0.08, -0.25]], [0.05, 0.05, 0.015], 6, 10)); }
      add(H, mergeGeometries(hs), hair);
      add(H, new THREE.SphereGeometry(0.175, 18, 10, 0, PI * 2, 0, PI * 0.3), hair, 0, 0.02, -0.01).scale.set(0.95, 1.05, 1);   // หน้าม้าเหนือคิ้ว
      add(H, new THREE.SphereGeometry(0.178, 14, 10, PI, PI, 0, PI * 0.62), hair, 0, 0.02, -0.01).scale.set(0.95, 1.05, 1);   // ผมด้านหลัง
      const crown = [];
      for (let i = 0; i < 7; i++) { const a = -0.9 + (i / 6) * 1.8; crown.push(spike(V(Math.sin(a) * 0.13, 0.15, Math.cos(a) * 0.09), V(Math.sin(a) * 0.3, 1, 0.1), i === 3 ? 0.2 : 0.13 - Math.abs(i - 3) * 0.015, 0.045, 4)); }
      { const fl = [-1, 1].map((s) => tube([[s * 0.13, 0.06, 0.07], [s * 0.18, -0.18, 0.1], [s * 0.17, -0.42, 0.12]], [0.045, 0.04, 0.012], 6, 10)); add(H, mergeGeometries(fl), hair); }   // ปอยผมหน้า
      add(H, mergeGeometries(crown), ice);
      P.arms = [-1, 1].map((s) => {
        const A = grp(T, s * 0.27, 1.12, 0);
        add(A, tube([[0, 0, 0], [s * 0.12, -0.25, 0.05], [s * 0.16, -0.5, 0.15]], [0.06, 0.05, 0.04], 8, 12), skin);
        add(A, new THREE.DodecahedronGeometry(0.085, 0), ice, s * 0.02, 0.02, 0).scale.set(1.2, 0.8, 1);   // บ่าผลึก
        add(A, cyl(0.1, 0.05, 0.2, 10), gown, s * 0.15, -0.44, 0.13).rotation.set(-0.3, 0, s * 0.25);   // แขนเสื้อบาน
        add(A, sph(0.045, 8, 6), skin, s * 0.17, -0.56, 0.17);
        return A;
      });
      P.wings = [-1, 1].map((s) => { const w = grp(T, s * 0.12, 0.95, -0.25); add(w, featherFan(6, 1.3, 0.22, 1.0, 0, 0.32), toon('#c8f0ff', { side: THREE.DoubleSide, emissive: '#3a8ac8', emissiveIntensity: 0.3 })).scale.set(s, 1, 1); return w; });
      P.glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#8ae8ff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.glowS.scale.set(4.5, 4.5, 1); P.glowS.position.y = 1.6; v.body.add(P.glowS);
      return P;
    },
    anim(v, P, { t, dt, atk, slam }) {
      P.coil.rotation.y = Math.sin(t * 0.6) * 0.06;
      let lean = Math.sin(t * 1.1) * 0.05, wing = Math.sin(t * 1.6) * 0.2, ar = -0.2 + Math.sin(t * 1.4) * 0.08;
      if (atk > 0) { lean = 0.35 * atk; ar = -1.4 * atk; }
      if (slam >= 0) { lean = slam < 0.7 ? -0.3 * (slam / 0.7) : -0.3 + 0.9 * ((slam - 0.7) / 0.3); ar = slam < 0.7 ? -2.6 * (slam / 0.7) : -2.6 + 3.2 * ((slam - 0.7) / 0.3); wing = slam < 0.7 ? 0.8 : 0.2; }
      P.torso.rotation.x += (lean - P.torso.rotation.x) * Math.min(1, dt * 10);
      P.arms[0].rotation.x = ar; P.arms[1].rotation.x = ar;
      P.wings[0].rotation.y = -0.62 - wing; P.wings[1].rotation.y = 0.62 + wing; P.wings[0].rotation.z = -0.12; P.wings[1].rotation.z = 0.12;
      P.head.rotation.y = Math.sin(t * 0.7) * 0.2;
      P.eyeM.emissiveIntensity = 2 + Math.sin(t * 3) * 0.4 + (slam >= 0 ? 1.5 : 0);
      P.glowS.material.opacity = 0.32 + Math.sin(t * 2) * 0.08;
    },
  },

  /* ---------- ปล่องภูเขาไฟ ---------- */
  // แมกม่าสไลม์: ก้อนลาวามีเปลือกหินแตกลาย รอยแตกเรืองแสง หยดลาวาไหล
  magmaslime: {
    build(v, d) {
      const P = {}, g = P.blob = grp(v.body);
      const lava = v.own(d.color, { emissive: lin('#ff4a0a').multiplyScalar(0.25) }), rock = toon('#3a2a2a'), hot = toon('#ffe080', { emissive: '#ff8a1a', emissiveIntensity: 1.5 });
      add(g, ridges(lathe([[0, 0], [0.3, 0.01], [0.4, 0.1], [0.41, 0.22], [0.35, 0.36], [0.24, 0.46], [0.1, 0.52], [0, 0.53]], 30), 5, 0.02), lava);
      const crust = [];
      for (let i = 0; i < 9; i++) { const a = i * 2.2, e = 0.35 + (i % 3) * 0.3; const n = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)); if (n.z > 0.55 && n.y < 0.7) continue; crust.push(new THREE.DodecahedronGeometry(0.11 + (i % 2) * 0.03, 0).scale(1.3, 0.5, 1.2).translate(n.x * 0.37, 0.22 + n.y * 0.3, n.z * 0.37)); }
      add(g, mergeGeometries(crust), rock);
      const cr = [];
      for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.3; cr.push(new THREE.BoxGeometry(0.02, 0.16, 0.02).rotateZ(0.4 * (i % 2 ? 1 : -1)).translate(Math.cos(a) * 0.36, 0.2 + (i % 3) * 0.07, Math.sin(a) * 0.36)); }
      add(g, mergeGeometries(cr), hot, 0, 0, 0, false);
      for (const [x, z, h] of [[0.25, 0.25, 0.1], [-0.3, 0.15, 0.08]]) { const dr = add(g, sph(0.04, 8, 6), lava, x, h, z); dr.scale.set(1, 1.5, 1); }
      eyes(g, 0.28, 0.35, 0.05, 0.11, { color: '#fff4b0', glow: true, tilt: -0.25 });
      add(g, new THREE.TorusGeometry(0.06, 0.014, 6, 12, PI), toon('#2a0a0a'), 0, 0.17, 0.37, false).rotation.z = PI;
      P.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7a2a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.glow.scale.set(1.4, 1.4, 1); P.glow.position.y = 0.35; g.add(P.glow);
      P.shadow0 = 1;
      return P;
    },
    anim(v, P, s) { animBlob(v, P, s); P.glow.material.opacity = 0.4 + Math.sin(s.t * 4) * 0.08; },
  },

  // เอมเบอร์อิมป์: ปีศาจไฟตัวเล็ก เขาโค้ง หูแหลม ปีกค้างคาว ผมเป็นเปลวไฟ หางปลายลูกศรติดไฟ ถือส้อมสามง่าม
  emberimp: {
    build(v, d) {
      const P = {}; v.flyer = true;
      const c = P.core = grp(v.body, 0, 0.95, 0); P.y0 = 0.95;
      const skin = v.own(d.color), dark = toon('#5a1414'), horn = toon('#2a1a1a'), memb = toon('#8a2a2a', { side: THREE.DoubleSide }), fire = toon('#ffd060', { emissive: '#ff7a1a', emissiveIntensity: 1.5 });
      add(c, sph(0.14, 16, 12), skin, 0, -0.05, 0).scale.set(1, 1.15, 0.85);
      add(c, sph(0.08, 10, 8), toon('#ff9a7a'), 0, -0.08, 0.08).scale.set(1, 1.2, 0.5);
      const H = P.head = grp(c, 0, 0.18, 0.02);
      add(H, sph(0.13, 16, 12), skin).scale.set(1.05, 0.95, 0.95);
      eyes(H, 0.01, 0.11, 0.03, 0.055, { color: '#ffee66', glow: true, tilt: -0.4 });
      add(H, new THREE.TorusGeometry(0.045, 0.01, 6, 12, PI), dark, 0, -0.05, 0.11, false).rotation.z = PI;
      for (const sx of [-1, 1]) {
        add(H, tube([[sx * 0.08, 0.08, 0], [sx * 0.15, 0.18, -0.04], [sx * 0.13, 0.28, -0.1]], [0.035, 0.025, 0.006], 6, 10), horn);
        const e = add(H, cone(0.04, 0.14, 5), skin, sx * 0.14, 0.02, -0.02); e.rotation.z = sx * -1.2;
      }
      const fl = [];
      for (let i = 0; i < 5; i++) { const a = -0.8 + (i / 4) * 1.6; fl.push(spike(V(Math.sin(a) * 0.06, 0.1, -0.03 + Math.cos(a) * 0.02), V(Math.sin(a) * 0.5, 1, -0.3), 0.16 + (i % 2) * 0.06, 0.035, 5)); }
      add(H, mergeGeometries(fl), fire, 0, 0, 0, false);
      P.wings = [-1, 1].map((s) => { const w = grp(c, s * 0.08, 0.04, -0.08); const { geo } = membrane(0.36, 0.24, 3, 0.3); add(w, geo.scale(s, 1, 1), memb, 0, 0, 0, false).rotation.y = s * -0.5; return w; });
      const tail = P.tail = grp(c, 0, -0.16, -0.08);
      add(tail, tube([[0, 0, 0], [0, -0.1, -0.12], [0.05, -0.05, -0.26], [0.02, 0.06, -0.32]], [0.025, 0.02, 0.014, 0.01], 6, 12), skin);
      add(tail, cone(0.04, 0.08, 4), fire, 0.02, 0.1, -0.33, false);
      for (const s of [-1, 1]) add(c, tube([[s * 0.1, 0.04, 0], [s * 0.18, -0.08, 0.06], [s * 0.16, -0.18, 0.12]], [0.03, 0.025, 0.02], 6, 8), skin);
      const fork = grp(c, 0.16, -0.18, 0.12, [0.2, 0, 0.2]);
      add(fork, cyl(0.01, 0.01, 0.5, 5), horn, 0, 0.1, 0);
      for (const k of [-1, 0, 1]) add(fork, cone(0.014, 0.08, 4), toon('#c8c8d0', { emissive: '#101010' }), k * 0.035, 0.38, 0);
      for (const s of [-1, 1]) add(c, sph(0.04, 8, 6), skin, s * 0.06, -0.24, 0.02).scale.set(0.8, 1.2, 0.8);
      P.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a1a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.flame.scale.set(0.7, 0.7, 1); P.flame.position.y = 0.3; c.add(P.flame);
      P.shadow0 = 1;
      return P;
    },
    anim(v, P, s) { animFly(v, P, s, { rate: 13, amp: 0.6, base: 0.2, hover: 0.1 }); P.tail.rotation.y = Math.sin(s.t * 5) * 0.4; P.flame.material.opacity = 0.45 + Math.sin(s.t * 9) * 0.1; },
  },

  // ซาลาแมนเดอร์: กิ้งก่าไฟตัวยาว หงอนเปลวไฟตามหลัง ขาแบะสี่ขา หางยาวปลายติดไฟ
  salamander: {
    build(v, d) {
      const P = {};
      const skin = v.own(d.color), belly = toon('#ffd08a'), spots = toon('#a83a1a'), fire = toon('#ffe070', { emissive: '#ff7a1a', emissiveIntensity: 1.5 });
      const T = P.torso = grp(v.body, 0, 0.26, 0); P.y0 = 0.26;
      add(T, tube([[0, 0, 0.42], [0, 0.03, 0.15], [0, 0.02, -0.15], [0, 0, -0.35]], [0.13, 0.18, 0.16, 0.11], 12, 18, 0.75), skin);
      add(T, tube([[0, -0.07, 0.38], [0, -0.06, 0.1], [0, -0.07, -0.3]], [0.08, 0.12, 0.08], 8, 12, 0.5), belly);
      const sp = [];
      for (let i = 0; i < 8; i++) sp.push(sph(0.03, 6, 4).scale(1.4, 0.4, 1).translate((i % 2 ? 1 : -1) * 0.08, 0.12, 0.3 - i * 0.09));
      add(T, mergeGeometries(sp), spots);
      const crest = [];
      for (let i = 0; i < 9; i++) crest.push(spike(V(0, 0.13 - Math.abs(i - 3) * 0.004, 0.32 - i * 0.08), V(0, 1, -0.35), 0.13 + (i < 4 ? i * 0.02 : (8 - i) * 0.015), 0.045, 4, 0.4));
      add(T, mergeGeometries(crest), fire, 0, 0, 0, false);
      const H = P.head = grp(T, 0, 0.04, 0.5);
      add(H, sph(0.13, 14, 10), skin, 0, 0, 0.04).scale.set(1, 0.7, 1.4);
      eyes(H, 0.08, 0.06, 0.035, 0.08, { color: '#ffee66', glow: false, tilt: 0.2 });
      const jaw = P.jaw = grp(H, 0, -0.03, -0.02); add(jaw, sph(0.1, 12, 8), belly, 0, -0.02, 0.1).scale.set(0.95, 0.4, 1.3);
      P.legs = []; P.knees = [];
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const L = grp(T, sx * 0.14, -0.02, sz * 0.2);
        add(L, tube([[0, 0, 0], [sx * 0.12, -0.04, 0], [sx * 0.16, -0.22, 0.03]], [0.05, 0.04, 0.035], 6, 8), skin);
        for (const k of [-1, 0, 1]) add(L, cone(0.012, 0.06, 4), skin, sx * 0.17 + k * 0.02, -0.24, 0.07).rotation.x = PI / 2;
        P.legs.push(L);
      }
      const tail = P.tail = grp(T, 0, 0, -0.35);
      add(tail, tube([[0, 0, 0], [0.05, 0.02, -0.25], [-0.04, 0.05, -0.5], [0.02, 0.12, -0.7]], [0.11, 0.07, 0.04, 0.015], 10, 18, 0.8), skin);
      add(tail, cone(0.06, 0.2, 6), fire, 0.02, 0.2, -0.72, false);
      return P;
    },
    anim(v, P, s) {
      animQuad(v, P, s, { stride: 0.5, rate: 1.6, bob: 0.02 });
      P.torso.rotation.y = s.moving ? Math.sin(s.ph * 1.6) * 0.15 : 0;
      P.head.position.z = 0.5 + s.atk * 0.15;
    },
  },

  // ออบซิเดียนโกเลม: โกเลมหินแก้วดำมันวาว เส้นลาวาเรืองตามรอยต่อ แกนลาวาที่อก หนามหินบนไหล่
  obsidiangolem: {
    build(v, d) {
      const P = {};
      const obs = v.own(d.color, { emissive: lin('#14101a').multiplyScalar(1.4) }), obsL = toon('#4a3e5a', { emissive: '#14101a' }), lava = toon('#ffb050', { emissive: '#ff5a10', emissiveIntensity: 1.7 });
      const T = P.torso = grp(v.body, 0, 0.8, 0); P.y0 = 0.8;
      const body = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; body.push(new THREE.DodecahedronGeometry(0.26 + (i % 3) * 0.04, 0).scale(1, 1.15, 0.85).rotateY(a * 1.3).translate(Math.cos(a) * 0.3, 0.45 + Math.sin(i * 2.1) * 0.16, Math.sin(a) * 0.22)); }
      add(T, mergeGeometries(body), obs);
      add(T, oct(0.17), lava, 0, 0.48, 0.26, false).scale.set(1.2, 1, 0.6);
      const vein = [];
      for (let i = 0; i < 10; i++) { const a = i * 0.63; vein.push(new THREE.BoxGeometry(0.025, 0.24, 0.025).rotateZ(Math.sin(i) * 0.8).translate(Math.cos(a) * 0.4, 0.35 + (i % 4) * 0.1, Math.sin(a) * 0.3 + 0.02)); }
      add(T, mergeGeometries(vein), lava, 0, 0, 0, false);
      const H = P.head = grp(T, 0, 1.0, 0.05);
      add(H, new THREE.DodecahedronGeometry(0.2, 0), obsL).scale.set(1.15, 0.9, 1);
      for (const sx of [-1, 1]) { const e = add(H, sph(0.045, 8, 6), lava, sx * 0.08, 0.0, 0.17, false); e.scale.set(1.3, 0.6, 0.5); e.userData.pxTiny = 0.05; }
      P.arms = [-1, 1].map((s) => {
        const A = grp(T, s * 0.58, 0.68, 0);
        add(A, new THREE.DodecahedronGeometry(0.23, 0), obsL, s * 0.02, 0, 0);
        for (const k of [0, 1, 2]) { const sp = add(A, cone(0.06, 0.28 - k * 0.05, 5), obs, s * (0.06 + k * 0.05), 0.15, -0.06 + k * 0.06); sp.rotation.z = s * (-0.5 - k * 0.25); }
        add(A, new THREE.BoxGeometry(0.22, 0.38, 0.22).rotateY(0.5), obs, s * 0.05, -0.32, 0);
        add(A, new THREE.BoxGeometry(0.03, 0.3, 0.03), lava, s * 0.05, -0.32, 0.12, false);
        add(A, new THREE.DodecahedronGeometry(0.21, 0), obsL, s * 0.07, -0.62, 0.04);
        return A;
      });
      P.legs = [-1, 1].map((s) => {
        const L = grp(v.body, s * 0.25, 0.8, 0);
        add(L, new THREE.BoxGeometry(0.25, 0.5, 0.27).rotateY(0.35), obs, 0, -0.28, 0);
        add(L, new THREE.DodecahedronGeometry(0.19, 0), obsL, 0, -0.66, 0.06).scale.set(1.25, 0.6, 1.35);
        return L;
      });
      P.lava = lava;
      P.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a1a', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.glow.scale.set(2.2, 2.2, 1); P.glow.position.y = 1.25; v.body.add(P.glow);
      return P;
    },
    anim(v, P, s) { animBrute(v, P, s, { stride: 0.35, armSwing: 0.3 }); P.lava.emissiveIntensity = 1.5 + Math.sin(s.t * 2.5) * 0.4 + s.atk; },
  },

  // อิกนารอก (MVP): มังกรเพลิงสี่ขา คอยาว เขาโค้งคู่ หนามตามแนวหลังถึงหาง ปีกพังผืดใหญ่ อกเรืองไฟ
  ignarok: {
    build(v, d) {
      const P = {};
      const scale = v.own(d.color), belly = toon('#f0b060'), dark = toon('#5a1a10'), horn = toon('#e8dcc8'), memb = toon('#8a2a1a', { side: THREE.DoubleSide });
      const fire = toon('#ffe080', { emissive: '#ff7a1a', emissiveIntensity: 1.6 });
      P.eyeM = toon('#ffffff', { emissive: '#ffd040', emissiveIntensity: 2 });
      const T = P.torso = grp(v.body, 0, 1.2, 0); P.y0 = 1.2;
      add(T, tube([[0, -0.05, 0.75], [0, 0.05, 0.25], [0, 0.0, -0.35], [0, -0.1, -0.75]], [0.5, 0.62, 0.55, 0.38], 16, 20, 0.85), scale);
      add(T, ridges(tube([[0, -0.38, 0.65], [0, -0.42, 0.1], [0, -0.35, -0.55]], [0.3, 0.38, 0.25], 12, 16, 0.45), 1, 0), belly);
      add(T, sph(0.22, 12, 10), fire, 0, -0.1, 0.62, false).scale.set(1, 1.2, 0.5);
      const spk = [];
      for (let i = 0; i < 9; i++) spk.push(spike(V(0, 0.52 - Math.abs(i - 3) * 0.02, 0.65 - i * 0.17), V(0, 1, -0.4), 0.3 - Math.abs(i - 3) * 0.02, 0.08, 4, 0.5));
      add(T, mergeGeometries(spk), dark);
      // คอ + หัว
      const N = P.neck = grp(T, 0, 0.25, 0.75);
      add(N, tube([[0, 0, 0], [0, 0.45, 0.25], [0, 0.85, 0.35]], [0.32, 0.24, 0.2], 12, 14, 0.9), scale);
      const ns = [];
      for (let i = 0; i < 4; i++) ns.push(spike(V(0, 0.18 + i * 0.2, 0.05 + i * 0.08), V(0, 0.6, -1), 0.2, 0.05, 4, 0.5));
      add(N, mergeGeometries(ns), dark);
      const H = P.head = grp(N, 0, 0.95, 0.42);
      add(H, sph(0.3, 18, 14), scale, 0, 0, 0).scale.set(0.95, 0.8, 1.15);
      add(H, sph(0.22, 14, 10), scale, 0, -0.04, 0.32).scale.set(0.85, 0.65, 1.1);
      for (const sx of [-1, 1]) {
        add(H, tube([[sx * 0.14, 0.12, -0.1], [sx * 0.3, 0.3, -0.3], [sx * 0.32, 0.5, -0.55], [sx * 0.22, 0.62, -0.7]], [0.08, 0.06, 0.04, 0.008], 8, 14), horn);
        const e = add(H, sph(0.05, 8, 6), P.eyeM, sx * 0.17, 0.08, 0.2, false); e.scale.set(1.3, 0.7, 0.6); e.userData.pxTiny = 0.05;
        add(H, new THREE.BoxGeometry(0.16, 0.05, 0.1), dark, sx * 0.17, 0.15, 0.2).rotation.z = sx * -0.35;
        add(H, sph(0.03, 6, 4), dark, sx * 0.07, 0.02, 0.6);
      }
      const jaw = P.jaw = grp(H, 0, -0.14, 0.05);
      add(jaw, sph(0.2, 12, 8), belly, 0, -0.03, 0.3).scale.set(0.8, 0.4, 1.2);
      const teeth = [];
      for (let i = 0; i < 6; i++) teeth.push(cone(0.018, 0.06, 4).translate((i % 2 ? 1 : -1) * 0.1, 0.03, 0.22 + Math.floor(i / 2) * 0.1));
      add(jaw, mergeGeometries(teeth), horn);
      P.mouthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a1a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.mouthGlow.scale.set(0.8, 0.8, 1); P.mouthGlow.position.set(0, -0.1, 0.55); H.add(P.mouthGlow);
      // ขา
      P.legs = []; P.knees = [];
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const L = grp(T, sx * 0.5, -0.22, sz * 0.45);
        add(L, sph(0.3, 14, 10), scale, sx * 0.02, 0.05, 0).scale.set(0.85, 1.1, 1);
        add(L, tube([[0, 0.1, 0], [sx * 0.06, -0.25, sz * 0.05], [0, -0.45, 0]], [0.26, 0.21, 0.16], 10, 10), scale);
        const K = grp(L, 0, -0.45, 0);
        add(K, cyl(0.16, 0.14, 0.42, 10), scale, 0, -0.2, 0.04);
        add(K, sph(0.19, 10, 8), dark, 0, -0.48, 0.12).scale.set(1, 0.5, 1.3);
        for (const k of [-1, 0, 1]) { const cl = add(K, cone(0.035, 0.12, 4), horn, k * 0.08, -0.52, 0.32); cl.rotation.x = PI / 2; }
        P.legs.push(L); P.knees.push(K);
      }
      // หาง
      const tail = P.tail = grp(T, 0, -0.05, -0.75);
      add(tail, tube([[0, 0, 0], [0.15, -0.25, -0.5], [-0.1, -0.55, -1.0], [0.2, -0.75, -1.45]], [0.36, 0.25, 0.14, 0.05], 12, 24), scale);
      const ts = [];
      for (let i = 0; i < 6; i++) { const u = i / 6; ts.push(spike(V(0.05 - u * 0.1, 0.3 - u * 0.95, -0.25 - u * 1.1), V(0, 1, -0.5), 0.2 - u * 0.1, 0.06, 4, 0.5)); }
      add(tail, mergeGeometries(ts), dark);
      add(tail, oct(0.16), dark, 0.22, -0.78, -1.5).scale.set(0.4, 1, 1.4);
      // ปีก
      P.wWings = [-1, 1].map((s) => {
        const w = grp(T, s * 0.35, 0.45, 0.2);
        const { geo, tips } = membrane(2.2, 1.4, 4, 0.28);
        add(w, geo.scale(s, 1, 1), memb, 0, 0, 0, false).rotation.x = -0.15;
        for (const [x, y] of tips) add(w, tube([[0, 0, 0], [s * x * 0.5, y * 0.55 + 0.15, -0.05], [s * x, y, 0]], [0.06, 0.04, 0.012], 6, 10), dark).rotation.x = -0.15;
        return w;
      });
      P.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff5a1a', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
      P.glow.scale.set(6, 6, 1); P.glow.position.y = 1.4; v.body.add(P.glow);
      return P;
    },
    anim(v, P, s) {
      const { t, dt, atk, slam } = s;
      animQuad(v, P, s, { stride: 0.42, rate: 0.85, bob: 0.06 });
      P.neck.rotation.y = Math.sin(t * 0.7) * 0.15;
      P.mouthGlow.material.opacity = 0.2 + atk * 0.7 + Math.sin(t * 5) * 0.1;
      let rear = 0, wing = Math.sin(t * 1.3) * 0.2;
      if (slam >= 0) { rear = slam < 0.7 ? -0.55 * Math.sin((slam / 0.7) * PI * 0.5) : -0.55 * (1 - (slam - 0.7) / 0.3); wing = slam < 0.7 ? 0.9 : 0.9 - ((slam - 0.7) / 0.3); P.mouthGlow.material.opacity = 0.9; }
      P.torso.rotation.x += (rear - P.torso.rotation.x) * Math.min(1, dt * 10);
      P.wWings[0].rotation.y = 0.25 + wing; P.wWings[1].rotation.y = -0.25 - wing;
      P.wWings[0].rotation.z = Math.sin(t * 1.3) * 0.15; P.wWings[1].rotation.z = -Math.sin(t * 1.3) * 0.15;
      P.eyeM.emissiveIntensity = 2 + Math.sin(t * 4) * 0.5 + (slam >= 0 ? 1.5 : 0);
      P.glow.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.1;
    },
  },
};

export { DEFS as MONSTER_DEFS };

/* ---------- v0.20: original creatures of ruins and the haunted forest ---------- */
function relicScarab(v,d){
 const shell=v.own(d.color),edge=v.own('#485b48'),gold=v.own('#d4b265'),core=grp(v.body,0,.25);core.scale.setScalar(d.modelScale||1);
 add(core,sph(.48,14,10).scale(1,.65,1.2),shell,0,.24,-.1);
 add(core,cyl(.025,.025,.58,6).rotateX(PI/2),gold,0,.56,-.1);
 const head=grp(core,0,.2,.48);add(head,sph(.23,12,8).scale(1,.8,1),edge);eyes(head,.05,.21,.045,.10,{color:'#bdebb3',glow:true});
 const legs=[];
 for(const side of [-1,1])for(let j=0;j<3;j++){const l=grp(core,side*.33,0,(j-1)*.27);add(l,tube([[0,0,0],[side*.25,.06,.03],[side*.39,-.21,.12]],[.045,.035,.02],6,8),edge);legs.push(l);}
 for(const side of [-1,1])add(head,tube([[side*.12,.10,.1],[side*.24,.18,.28],[side*.17,.2,.42]],[.028,.025,.015],6,8),gold);
 return {core,head,legs};
}
DEFS.scarab={build:relicScarab,anim(v,P,{t,moving,ph,atk}){P.legs.forEach((l,i)=>l.rotation.y=moving?Math.sin(ph+i*PI)*.4:0);P.core.position.y=.25+(moving?Math.abs(Math.sin(ph))*.04:0);P.head.rotation.x=-atk*.4;P.core.position.z=atk*.18;}};
function relicGuardian(v,d){
 const stone=v.own(d.color),dark=v.own(shadeHex(d.color,-.35)),rune=v.own('#8cf4d5',{emissive:'#8cf4d5',emissiveIntensity:.5}),gold=v.own('#d5c084');
 const base=grp(v.body);base.scale.setScalar(d.modelScale||1);
 const torso=grp(base,0,1.15),head=grp(torso,0,.68,.01),arms=[],legs=[];
 add(torso,ridges(lathe([[.30,-.40],[.46,-.20],[.48,.28],[.33,.42]],12),8,.018),stone);
 add(torso,cyl(.11,.11,.04,6).rotateX(PI/2),rune,0,.15,.47);
 add(head,new THREE.BoxGeometry(.56,.38,.44),dark,0,.10,0);
 add(head,new THREE.BoxGeometry(.60,.13,.46),stone,0,.25,0);
 eyes(head,.14,.238,.045,.14,{color:'#9bffe1',glow:true});
 for(const side of [-1,1]){
  const leg=grp(base,side*.22,.65);add(leg,cyl(.14,.18,.54,8),dark,0,-.25);add(leg,new THREE.BoxGeometry(.30,.15,.40),stone,0,-.52,.08);legs.push(leg);
  const arm=grp(torso,side*.55,.26);add(arm,sph(.22,10,8),gold);add(arm,cyl(.13,.18,.70,8),stone,0,-.38);add(arm,new THREE.BoxGeometry(.31,.24,.30),dark,0,-.79);arms.push(arm);
 }
 if(d.mvp){for(const side of [-1,1])add(head,spike(V(side*.22,.3,0),V(side*.1,1,0),.55,.08),gold);add(torso,new THREE.BoxGeometry(.16,.65,.05),gold,0,0,.46);}
 return{base,torso,head,arms,legs,y0:1.15};
}
DEFS.sentinel={build:relicGuardian,anim(v,P,a){animBrute(v,P,a,{stride:.45,armSwing:.4});}};
function shadowBeast(v,d){
 const wolf=d.model==='hollowwolf',skin=v.own(d.color),belly=v.own(shadeHex(d.color,.2)),claw=v.own('#e1d4b8');
 const torso=grp(v.body,0,.68),head=grp(torso,0,.12,.62);add(torso,sph(.53,14,10).scale(.68,.63,1.25),skin);
 add(head,sph(.28,12,10).scale(.88,.80,1.1),skin);add(head,sph(.20,10,8).scale(.72,.55,1.25),belly,0,-.08,.26);
 eyes(head,.10,.26,.045,.12,{color:wolf?'#e596c2':'#ffcf7b',glow:true});
 const jaw=grp(head,0,-.17,.20);add(jaw,new THREE.BoxGeometry(.24,.08,.26),belly);
 const legs=[],knees=[];
 for(const side of [-1,1])for(const z of [-.4,.4]){const l=grp(torso,side*.28,-.16,z),k=grp(l,0,-.25);add(l,cyl(.09,.10,.30,8),skin,0,-.12);add(k,cyl(.06,.08,.26,8),belly,0,-.11);add(k,sph(.11,8,6).scale(1,.7,1.4),claw,0,-.23,.08);legs.push(l);knees.push(k);}
 const tail=grp(torso,0,-.07,-.61);add(tail,tube([[0,0,0],[.12,.1,-.35],[.2,.2,-.7]],[.14,.09,.015],8,14),skin);
 if(wolf){for(const side of [-1,1])add(head,spike(V(side*.16,.17,0),V(side*.22,1,0),.3,.13),skin);add(torso,mergeGeometries(fur(V(0,.08,.45),.29,.3,.25,24,.16,.06,{seed:29})),skin);}
 else{for(let j=0;j<6;j++)add(torso,spike(V(0,.28,-.43+j*.17),V(0,1,-.2),.18,.06),claw);}
 return{torso,head,jaw,legs,knees,tail,y0:.68};
}
DEFS.basilisk={build:shadowBeast,anim(v,P,a){animQuad(v,P,a);}};
DEFS.hollowwolf=DEFS.basilisk;
DEFS.spider={build(v,d){const mat=v.own(d.color),dark=v.own('#35283f'),eye=v.own('#efb0df',{emissive:'#ef7aa8',emissiveIntensity:.45}),core=grp(v.body,0,.43);add(core,sph(.4,12,8).scale(1,.8,1.2),mat,0,0,-.18);add(core,sph(.23,12,8),dark,0,0,.31);eyes(core,.04,.54,.037,.08,{color:'#e8a0ca',glow:true});const legs=[];for(const side of [-1,1])for(let i=0;i<4;i++){const z=-.4+i*.22,l=grp(core,side*.2,0,z);add(l,tube([[0,0,0],[side*.43,.17,(i-1.5)*.14],[side*.66,-.38,(i-1.5)*.19]],[.046,.03,.02],6,9),mat);legs.push(l);}for(const side of [-1,1])add(core,spike(V(side*.07,-.07,.50),V(side*.25,-.2,1),.18,.03),eye);return{core,legs};},anim(v,P,{ph,moving,atk}){P.legs.forEach((l,i)=>l.rotation.y=moving?Math.sin(ph+(i%2)*PI)*.38:0);P.core.position.z=atk*.25;P.core.position.y=.43+(moving?Math.abs(Math.sin(ph))*.035:0);}};
function spectralShade(v,d){
 v.flyer=true;const cloth=v.own(d.color),dark=v.own('#27243a'),ivory=v.own('#dcd4ca'),gold=v.own('#cdb788'),core=grp(v.body,0,.32);core.scale.setScalar(d.modelScale||1);
 add(core,ridges(lathe([[.5,.10],[.43,.35],[.32,.80],[.26,1.05]],16),10,.035),cloth);
 const head=grp(core,0,1.24);add(head,sph(.34,14,10).scale(1,1.15,.82),cloth);add(head,sph(.23,12,8).scale(1,1,.45),dark,0,-.015,.26);eyes(head,.05,.37,.05,.105,{color:d.color,glow:true});
 const arms=[];for(const side of [-1,1]){const arm=grp(core,side*.34,.87);add(arm,cyl(.12,.18,.55,10).rotateZ(side*.45),cloth,side*.1,-.21);add(arm,sph(.08,8,6),ivory,side*.20,-.43);arms.push(arm);}
 if(d.model==='reaper'){const hand=arms[0];add(hand,cyl(.025,.025,1.8,8),gold,-.2,-.05,.12);add(hand,tube([[-.2,.8,.12],[.2,.76,.12],[.65,.4,.12]],[.075,.06,.004],6,12),ivory);if(d.mvp){for(let i=-1;i<=1;i++)add(head,spike(V(i*.2,.25,0),V(i*.1,1,0),.38,.06),gold);}}
 else{add(core,oct(.14),gold,0,.68,.31);}
 return{core,head,arms,y0:.32};
}
DEFS.shade={build:spectralShade,anim(v,P,{t,moving,atk,slam}){P.core.position.y=.32+Math.sin(t*2.6)*.10;P.core.position.z=atk*.3;P.core.rotation.z=Math.sin(t*1.7)*.04;P.arms.forEach((a,i)=>a.rotation.x=-atk*1.4+(slam>=0?-Math.sin(slam*PI)*1.8:Math.sin(t*1.3+i)*.08));}};
DEFS.reaper=DEFS.shade;
DEFS.stag={build(v,d){const P=shadowBeast(v,{...d,model:'basilisk'}),antler=v.own('#d3b996');for(const side of [-1,1]){const h=grp(P.head,side*.19,.18,0);add(h,tube([[0,0,0],[side*.18,.35,0],[side*.30,.60,-.05]],[.045,.032,.009],6,12),antler);for(const [y,z] of [[.22,.18],[.38,-.16]])add(h,tube([[side*.1,y,0],[side*.22,y+.15,z]],[.025,.008],6,6),antler);}return P;},anim(v,P,a){animQuad(v,P,a,{stride:.8,rate:1.1});}};
export const MONSTER_MODEL_IDS = Object.keys(DEFS);
