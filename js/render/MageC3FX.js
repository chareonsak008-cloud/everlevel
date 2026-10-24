// v0.85 สกิลจอมเวทพันปี (นักเวทคลาส 3): วงเวทเรขาคณิตขาวทอง · ลำแสงเวท · ม่านหกเหลี่ยม · ทุ่งดอกไม้
// fx_m3_* · ดาเมจ/จังหวะจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/HealFX/MageFX
import { THREE } from './three.js?v=0.93.0-p3.35';
import * as TX from './FxTextures.js?v=0.93.0-p3.35';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

// ขาว-ฟ้าใส ขอบทอง (แสงเวทบริสุทธิ์)
const FRI = { deep: '#1a2e6a', main: '#5aaeff', mid: '#9ad4ff', light: '#e2f4ff', hot: '#ffffff', gold: '#ffe08a', smoke: '#2a3450' };
const BLOOM = ['#ffffff', '#ffd0e4', '#d8c8ff', '#bfe8ff', '#fff0a8'];

/* ---------- เท็กซ์เจอร์วาดเอง ---------- */
const cache = new Map();
function tex(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t;
}
// วงเวทเรขาคณิต: วงแหวนซ้อน · แถวอักขระเส้นบาง · ดาวหกแฉก · ซี่ 12 · วงเล็กโคจร
const circleTex = () => tex('m3circle', 512, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 5;
  for (const [r, w] of [[0.97, 5], [0.92, 2], [0.74, 3], [0.69, 1.5], [0.36, 2.5], [0.14, 2]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, c * r, 0, TAU); g.stroke(); }
  let seed = 3; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.lineWidth = 2;
  for (let i = 0; i < 72; i++) {   // อักขระโบราณ (ขีดสั้นต่อกัน)
    const a = (i / 72) * TAU; g.save(); g.translate(c + Math.cos(a) * c * 0.83, c + Math.sin(a) * c * 0.83); g.rotate(a + Math.PI / 2);
    g.beginPath(); const k = (r() * 4) | 0;
    if (k === 0) { g.moveTo(-6, -7); g.lineTo(0, 7); g.lineTo(6, -7); } else if (k === 1) { g.moveTo(-6, 0); g.lineTo(6, 0); g.moveTo(0, -7); g.lineTo(0, 7); }
    else if (k === 2) { g.arc(0, 0, 5, 0, Math.PI * 1.5); } else { g.moveTo(-5, -7); g.lineTo(5, -7); g.lineTo(-5, 7); g.lineTo(5, 7); }
    g.stroke(); g.restore();
  }
  g.lineWidth = 2.5;
  for (const off of [0, Math.PI]) { g.beginPath(); for (let i = 0; i <= 3; i++) { const a = off - Math.PI / 2 + (i / 3) * TAU; const x = c + Math.cos(a) * c * 0.69, y = c + Math.sin(a) * c * 0.69; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.14, c + Math.sin(a) * c * 0.14); g.lineTo(c + Math.cos(a) * c * 0.36, c + Math.sin(a) * c * 0.36); g.stroke(); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.52, c + Math.sin(a) * c * 0.52, c * 0.06, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(c, c, c * 0.05, 0, TAU); g.fill();
});
// แผ่นหกเหลี่ยม (ขอบสว่าง เนื้อโปร่ง)
const hexTex = () => tex('m3hex', 128, (g, s) => {
  const c = s / 2, pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU + Math.PI / 6; return [c + Math.cos(a) * c * 0.92, c + Math.sin(a) * c * 0.92]; });
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  g.fillStyle = 'rgba(255,255,255,0.28)'; path(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = '#fff'; g.shadowBlur = 6; path(); g.stroke();
  g.lineWidth = 2; g.shadowBlur = 0; g.beginPath(); g.arc(c, c, c * 0.3, 0, TAU); g.stroke();
});
// ดอกไม้ห้ากลีบ (กลีบตามสี เกสรทอง)
const flowerTex = (col) => tex('m3fl' + col, 64, (g, s) => {
  const c = s / 2; g.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU - Math.PI / 2; g.beginPath(); g.ellipse(c + Math.cos(a) * s * 0.2, c + Math.sin(a) * s * 0.2, s * 0.17, s * 0.12, a, 0, TAU); g.fill(); }
  g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(c, c, s * 0.1, 0, TAU); g.fill();
  g.fillStyle = '#4a9a3a'; g.fillRect(c - 1, c + s * 0.12, 2, s * 0.36);
});

export function installMageC3FX(P) {
  /* ---------- ตัวช่วย ---------- */
  // วงเวทลอยหันไปทาง normal (ตั้งฉากกับลำแสง) · คืนวัตถุไว้สั่งจางเอง
  P.m3Circle = function (pos, normal, size, dur, { delay = 0, spin = 1.2, pal = FRI, gold = true } = {}) {
    const g = new THREE.Group(), T0 = circleTex();
    const under = new THREE.Mesh(this.geo.plane, this.basic(pal.deep, { tex: T0, opacity: 0, blending: NORMAL })); under.scale.setScalar(1.04); under.renderOrder = 6;
    const main = new THREE.Mesh(this.geo.plane, this.basic(gold ? pal.gold : pal.mid, { tex: T0, opacity: 0 })); main.renderOrder = 7;
    const inner = new THREE.Mesh(this.geo.plane, this.basic(pal.light, { tex: T0, opacity: 0 })); inner.scale.setScalar(0.55); inner.renderOrder = 8;
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0)); glow.scale.setScalar(0.6);
    g.add(under, main, inner, glow);
    this.after(delay, () => {
      this.add(g); g.position.copy(pos); g.lookAt(pos.clone().add(normal));
      this.anim(dur, (k, dt, t) => {
        const pop = easeOut(Math.min(1, t / 0.18)), fade = k > 0.82 ? (1 - k) / 0.18 : 1;
        g.scale.setScalar(size * (0.4 + 0.6 * pop));
        main.rotation.z += spin * dt; under.rotation.z = main.rotation.z; inner.rotation.z -= spin * 1.8 * dt;
        under.material.opacity = 0.65 * fade * pop; main.material.opacity = 0.95 * fade * pop; inner.material.opacity = 0.85 * fade * pop; glow.material.opacity = (0.35 + (g.userData.charge || 0)) * fade * pop;
      }, () => this.remove(g));
    });
    return g;
  };

  // ลำแสงตรง (ทรงกระบอก 3 ชั้น: เงาเข้ม · ขอบฟ้า · แกนขาว) จาก a ไป b
  P.m3Beam = function (a, b, width, dur, { pal = FRI, delay = 0 } = {}) {
    this.after(delay, () => {
      const len = a.distanceTo(b), mid = a.clone().lerp(b, 0.5), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
      const parts = [[pal.deep, 1.45, 0.35, NORMAL, 5], [pal.main, 1, 0.9, ADD, 6], [pal.light, 0.62, 0.95, ADD, 7], [pal.hot, 0.3, 1, ADD, 8]].map(([col, w, op, blending, ro]) => {
        const m = this.add(new THREE.Mesh(this.geo.cyl, this.basic(col, { opacity: 0, blending }))); m.position.copy(mid); m.quaternion.copy(q); m.renderOrder = ro; m.userData = { w, op }; return m;
      });
      this.anim(dur, (k) => {
        const grow = Math.min(1, k * 8), thin = k < 0.25 ? 1 + (0.25 - k) * 1.6 : 1 - (k - 0.25) / 0.75 * 0.85;
        for (const m of parts) { const r = width * m.userData.w * thin; m.scale.set(r, len * grow, r); m.position.copy(a).lerp(b, 0.5 * grow); m.material.opacity = m.userData.op * (k > 0.7 ? (1 - k) / 0.3 : 1) * (0.85 + Math.random() * 0.15); }
      }, () => parts.forEach((m) => this.remove(m)));
      this.flash(a, pal.hot, width * 7, 0.3); this.flash(b, pal.light, width * 6, 0.3);
      this.light(mid, pal.main, 8, dur, len + 4);
    });
  };

  // หอกแสงพุ่ง (เส้นแสงสั้นวิ่งเร็ว) จาก a ไป b แล้วแตกเป็นประกาย
  P.m3Lance = function (a, b, dur = 0.14, s = 1, onHit) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(this.geo.cyl, this.basic(FRI.hot, { opacity: 1 })); core.scale.set(0.035 * s, 0.9 * s, 0.035 * s); core.rotation.x = Math.PI / 2;
    const edge = new THREE.Mesh(this.geo.cyl, this.basic(FRI.main, { opacity: 0.8 })); edge.scale.set(0.08 * s, 1.1 * s, 0.08 * s); edge.rotation.x = Math.PI / 2;
    const tip = new THREE.Sprite(this.spriteMat(TX.softDot(), FRI.light, 0.9)); tip.scale.setScalar(0.5 * s); tip.position.z = 0.45 * s;
    g.add(edge, core, tip);
    this.projectile(g, a, b, dur, { orient: true, onHit: (p) => { this.ring(V(p.x, 0, p.z), FRI.light, 0.1, 0.7 * s, 0.3); this.star(V(p.x, 0.25, p.z), FRI.hot, 1.3 * s, 0.25); this.mgUnder(V(p.x, 0.25, p.z), FRI, 1.4 * s, 0.3, 0.45); if (onHit) onHit(p); } });
  };

  // วงเวทบนพื้น 2 ชั้นหมุนสวน
  P.m3Ground = function (gp, size, dur, { delay = 0 } = {}) {
    this.after(delay, () => {
      this.disc(gp, circleTex(), FRI.deep, size * 1.03, dur, { spin: -0.25, opacity: 0.45, blending: NORMAL, y: 0.05 });
      this.disc(gp, circleTex(), FRI.gold, size, dur, { spin: 0.35, opacity: 0.9, y: 0.06 });
      this.disc(gp, circleTex(), FRI.light, size * 0.5, dur, { spin: -0.8, opacity: 0.8, y: 0.07 });
    });
  };

  const lineDir = (c) => { const t = c.targets[c.main], d = t ? t.pos.clone().sub(c.caster.pos).setY(0) : c.caster.facing.clone(); return d.lengthSq() < 1e-4 ? c.caster.facing.clone().setY(0).normalize() : d.normalize(); };

  /* ================= 1 · ลำแสงพิฆาต ================= */
  P.fx_m3_ray = function (c) {
    const end = this.fx_nf(c), dir = lineDir(c), h = this.hand(c);
    this.swCharge(c, FRI, 0.5, 40);
    const rings = [[0.45, 1.2, 0], [0.9, 1.65, 0.08], [1.4, 2.1, 0.16]].map(([d, s, dl]) => this.m3Circle(h.clone().addScaledVector(dir, d), dir, s, 1.15 - dl, { delay: dl, spin: 1.5 + dl * 6 }));
    this.after(0.4, () => rings.forEach((g) => { g.userData.charge = 0.6; }));
    this.after(0.5, () => {
      const a = this.hand(c).addScaledVector(dir, 1.4), b = a.clone().addScaledVector(dir, 9.5);
      this.m3Beam(a, b, 0.34, 0.5);
      this.sparks(a, [FRI.hot, FRI.light], 30, 6);
      c.targets.forEach((t) => {
        const d = t.pos.clone().setY(0).sub(c.caster.pos.clone().setY(0)), along = d.dot(dir);
        if (along >= -0.3 && along <= 11 && Math.abs(d.x * dir.z - d.z * dir.x) <= 1.1) this.after(0.05, () => this.mgHit(this.hitPos(t), FRI, 1.0));
      });
    });
    return Math.max(end, 1.2);
  };

  /* ================= 2 · ห่าศรแสงพันดอก ================= */
  P.fx_m3_arrow_rain = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4);
    this.swCharge(c, FRI, 0.5, 40);
    this.m3Ground(gp, 6.8, 2.2);
    const sky = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * TAU + rand(-0.2, 0.2), r = i === 0 ? 0 : rand(1.6, 2.8); return V(gp.x + Math.cos(a) * r, 4.2 + rand(-0.3, 0.5), gp.z + Math.sin(a) * r); });
    sky.forEach((p, i) => this.m3Circle(p, V(0, -1, 0), i === 0 ? 2.6 : rand(1.3, 1.8), 1.9 - i * 0.04, { delay: 0.2 + i * 0.05, spin: i % 2 ? 1.4 : -1.4 }));
    // ฝนหอกแสง
    this.after(0.6, () => this.anim(1.0, () => {
      for (let n = 0; n < 2; n++) {
        if (Math.random() > 0.8) continue;
        const from = sky[(Math.random() * sky.length) | 0], a = rand(0, TAU), r = Math.sqrt(Math.random()) * 3, to = V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r);
        this.m3Lance(from.clone().add(V(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))), to, 0.12, 1.7);
      }
    }));
    // ทุกวงยิงลำแสงรวมกลางวง
    this.after(1.6, () => sky.forEach((p) => this.m3Beam(p, V(gp.x, 0.1, gp.z), 0.16, 0.35)));
    this.after(1.7, () => { this.mgBlast(V(gp.x, 0.6, gp.z), FRI, 3.0, c, 2, { crack: false }); this.star(V(gp.x, 1.4, gp.z), FRI.hot, 6, 0.5); });
    return Math.max(end, 2.3);
  };

  /* ================= 3 · ม่านปราการหกเหลี่ยม ================= */
  P.fx_m3_hex_ward = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0);
    this.m3Ground(P0, 4.2, 2.0);
    const R = 1.9, tiles = [], ht = hexTex();
    for (let ring = 0; ring < 4; ring++) {   // ชั้นตามมุมเงย
      const el = 0.12 + ring * 0.36, n = Math.max(1, Math.round(14 * Math.cos(el)));
      for (let i = 0; i < n; i++) {
        const az = (i / n) * TAU + ring * 0.35, dirv = V(Math.cos(az) * Math.cos(el), Math.sin(el) * 0.92, Math.sin(az) * Math.cos(el));
        const m = new THREE.Mesh(this.geo.plane, this.basic(FRI.main, { tex: ht, opacity: 0 })); m.renderOrder = 6;
        m.userData = { dirv, from: dirv.clone().multiplyScalar(R * rand(2.2, 3.2)).add(V(0, rand(0.5, 2), 0)), t0: 0.05 + Math.random() * 0.4, ring };
        tiles.push(m); this.add(m);
      }
    }
    const top = new THREE.Mesh(this.geo.plane, this.basic(FRI.mid, { tex: ht, opacity: 0 })); top.userData = { dirv: V(0, 1, 0), from: V(0, 5, 0), t0: 0.45, ring: 4 }; tiles.push(top); this.add(top);
    this.anim(1.9, (k, dt, t) => {
      const q = c.caster.pos.clone().setY(0), fade = k > 0.85 ? (1 - k) / 0.15 : 1;
      for (const m of tiles) {
        const u = m.userData, kk = Math.min(1, Math.max(0, (t - u.t0) / 0.28)), e = easeOut(kk);
        const goal = u.dirv.clone().multiplyScalar(R);
        m.position.copy(q).add(u.from.clone().lerp(goal, e));
        m.lookAt(q.clone().add(u.dirv.clone().multiplyScalar(R * 3)));
        const wave = Math.max(0, 1 - Math.abs(t - 0.95 - u.ring * 0.08) * 6);
        m.scale.setScalar(0.92 * (0.5 + 0.5 * e) * (1 + wave * 0.15));
        m.material.opacity = (kk > 0 ? 0.45 + 0.55 * e : 0) * fade + wave * 0.6;
        if (kk > 0 && kk < 1 && Math.random() < 0.15) this.fx.emit({ pos: m.position, count: 1, speed: 0.2, life: 0.3, size: [0.12, 0.2], color: [FRI.light, FRI.hot] });
      }
    }, () => tiles.forEach((m) => this.remove(m)));
    this.after(0.75, () => this.hlDome(() => c.caster.pos, { deep: FRI.deep, main: FRI.main, mid: FRI.mid, light: FRI.light, hot: FRI.hot }, R * 1.02, 1.15));
    this.after(0.78, () => { const q = c.caster.pos; this.flash(V(q.x, 1.2, q.z), FRI.light, 4.5, 0.4); this.ring(V(q.x, 0, q.z), FRI.light, 0.4, 3, 0.5); this.light(V(q.x, 1.5, q.z), FRI.main, 6, 0.6, 7); });
    return Math.max(end, 1.9);
  };

  /* ================= 4 · ทุ่งดอกไม้นิรันดร์ ================= */
  P.fx_m3_flower_field = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0), RMAX = 4.6;
    this.m3Ground(P0, 3.2, 2.8);
    this.ring(P0, '#fff4c8', 0.3, RMAX, 0.9, { opacity: 0.9 });
    this.after(0.12, () => this.ring(P0, '#ffd0e4', 0.3, RMAX * 0.9, 0.9, { opacity: 0.6 }));
    const flowers = Array.from({ length: 95 }, () => {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * RMAX, col = BLOOM[(Math.random() * BLOOM.length) | 0];
      const s = new THREE.Sprite(this.spriteMat(flowerTex(col), '#ffffff', 0, NORMAL)); s.renderOrder = 5;
      s.userData = { x: P0.x + Math.cos(a) * r, z: P0.z + Math.sin(a) * r, t0: 0.08 + (r / RMAX) * 0.75 + rand(0, 0.08), sz: rand(0.55, 0.85), ph: rand(0, TAU) };
      this.add(s); return s;
    });
    this.anim(2.8, (k, dt, t) => {
      const fade = k > 0.82 ? (1 - k) / 0.18 : 1;
      for (const s of flowers) {
        const u = s.userData, g = easeOut(Math.min(1, Math.max(0, (t - u.t0) / 0.3)));
        s.position.set(u.x, 0.08 + u.sz * 0.45 * g, u.z); s.scale.setScalar(u.sz * g * (1 + Math.sin(t * 2 + u.ph) * 0.04));
        s.material.opacity = g * fade; s.material.rotation = Math.sin(t * 1.6 + u.ph) * 0.12;
        if (g > 0 && g < 0.4 && Math.random() < 0.06) this.stars.emit({ pos: s.position, count: 1, speed: 0.3, life: 0.5, size: [0.12, 0.2], color: ['#ffffff', '#fff0a8'] });
      }
      if (Math.random() < 0.7 * fade) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * RMAX; this.feathers.emit({ pos: V(P0.x + Math.cos(a) * r, 0.2, P0.z + Math.sin(a) * r), count: 1, vel: () => V(rand(-0.3, 0.3), rand(0.4, 0.9), rand(-0.3, 0.3)), life: [1.2, 1.8], size: [0.2, 0.3], color: ['#ffd0e4', '#ffffff', '#d8c8ff'] }); }
    }, () => flowers.forEach((s) => this.remove(s)));
    // แสงฟื้นฟูสองจังหวะ (ตรงกับ heals)
    [0.6, 1.2].forEach((t) => this.after(t, () => {
      const q = c.caster.pos;
      this.pillar(V(q.x, 0, q.z), '#fff4c8', 0.8, 4, 0.6, { grow: 0.12, opacity: 0.55 });
      this.sigil(V(q.x, 2.4 * this.vs, q.z), TX.crossGlow(), '#fff0a8', 1.3, 0.6, { rise: 0.4 });
      this.stars.emit({ pos: V(q.x, 0.4, q.z), count: 20, spread: 1.4, flat: true, vel: () => V(0, rand(1.2, 2.4), 0), life: [0.7, 1.1], size: [0.18, 0.3], color: ['#ffffff', '#fff0a8', '#ffd0e4'] });
    }));
    return Math.max(end, 2.8);
  };

  /* ================= 5 · ไม้ตาย: ปิดล้อมพันวงเวท ================= */
  P.fx_m3_thousand_circles = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4), core = V(gp.x, 1.0, gp.z);
    this.swCharge(c, FRI, 0.8, 70);
    this.m3Ground(gp, 9.2, 3.8, { delay: 0.1 });
    // 24 วงเวทล้อมเป้าเป็นครึ่งทรงกลม หันเข้าหาศูนย์กลาง ปรากฏเป็นเกลียว
    const N = 24, circ = [];
    for (let i = 0; i < N; i++) {
      const u = i / N, az = u * TAU * 3, el = 0.15 + u * 1.0, R = 3.4;
      const p = V(gp.x + Math.cos(az) * Math.cos(el) * R, 1.0 + Math.sin(el) * R * 0.9, gp.z + Math.sin(az) * Math.cos(el) * R);
      circ.push(p); this.m3Circle(p, core.clone().sub(p).normalize(), rand(1.4, 1.8), 3.2 - u * 0.9, { delay: 0.3 + u * 1.0, spin: i % 2 ? 2 : -2 });
    }
    // ระดมยิงลำแสงเข้ากลาง
    this.after(1.5, () => this.anim(1.1, () => { if (Math.random() < 0.75) { const p = circ[(Math.random() * N) | 0]; this.m3Beam(p, core.clone().add(V(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3))), 0.07, 0.18); } }));
    [1.6, 1.9, 2.2, 2.5].forEach((t) => this.after(t, () => { this.mgHit(core, FRI, 1.0, { ring: false }); }));
    // วงเวทยักษ์บนฟ้า + ลำแสงสวรรค์
    this.after(2.3, () => { this.m3Circle(V(gp.x, 9, gp.z), V(0, -1, 0), 6.5, 1.5, { spin: 0.8 }); this.m3Circle(V(gp.x, 8.6, gp.z), V(0, -1, 0), 3.6, 1.4, { spin: -1.6, gold: false }); this.flash(V(gp.x, 9, gp.z), FRI.light, 8, 0.8); });
    this.after(3.0, () => {
      this.m3Beam(V(gp.x, 9, gp.z), V(gp.x, 0, gp.z), 1.5, 0.75);
      circ.forEach((p, i) => this.m3Beam(p, core, 0.09, 0.4, { delay: i * 0.004 }));
    });
    this.after(3.2, () => {
      this.mgBlast(V(gp.x, 0.8, gp.z), FRI, 4.2, c, 3);
      this.star(V(gp.x, 2, gp.z), FRI.hot, 12, 0.6);
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? FRI.main : FRI.hot, 0.4, 6 + i * 0.6, 0.8));
      this.stars.emit({ pos: V(gp.x, 2, gp.z), count: 140, speed: [4, 11], gravity: -2, drag: 1.3, life: [0.9, 1.5], size: [0.28, 0.48], color: [FRI.hot, FRI.light, FRI.gold] });
    });
    return Math.max(end, 4.0);
  };
}
