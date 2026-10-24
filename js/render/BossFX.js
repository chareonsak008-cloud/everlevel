// v0.94 ภาพของสกิลบอสชุดใหม่ (ดู systems/BossSkills.js) — สัญญาณเตือนบนพื้น (พัด · แนวตรง · วงแหวน · ตราตามตัว · วงปลอดภัย)
// และเอฟเฟกต์ตามธีม (พงไพร น้ำแข็ง เพลิง ศักดิ์สิทธิ์ โลหิต สายน้ำ ผลึก คราส) · พิกัดเข้า = พิกัดเกม (px) แปลงเป็นฉากด้วย S
import { THREE } from './three.js?v=0.93.0-p4.6';
import * as TX from './FxTextures.js?v=0.93.0-p4.6';
import { TILE } from '../config.js?v=0.93.0-p4.6';

const S = 1 / TILE;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const TAU = Math.PI * 2;
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;

// พาเลตต่อธีม (deep = ชั้นสีเข้มอ่านออกบนพื้นสว่าง)
const PAL = {
  nature: { deep: '#1e3a0a', main: '#5ab82a', mid: '#8ad84a', light: '#d8ffa0', hot: '#f4ffe0', smoke: '#2a3a1a', debris: '#5e4a30' },
  ice: { deep: '#0a3a78', main: '#2a9cff', mid: '#5ac8ff', light: '#b0eeff', hot: '#f2fdff', smoke: '#cfe8f4', debris: '#b8e0f0' },
  fire: { deep: '#6a1406', main: '#ff4a12', mid: '#ff8a2a', light: '#ffc45a', hot: '#fff2c8', smoke: '#3a2420', debris: '#3a2a24' },
  holy: { deep: '#6a4a08', main: '#ffb020', mid: '#ffd24a', light: '#fff0a0', hot: '#fffbe0', smoke: '#e8dcc0', debris: '#c8b088' },
  blood: { deep: '#3a0410', main: '#e01a3c', mid: '#ff4a6a', light: '#ffa0b4', hot: '#fff0f3', smoke: '#1c0408', debris: '#3a1a20' },
  water: { deep: '#06305a', main: '#1a8ae8', mid: '#3ab8ff', light: '#a8e8ff', hot: '#f0fcff', smoke: '#d8f0ff', debris: '#88b8d8' },
  crystal: { deep: '#3a0a72', main: '#9a3aff', mid: '#c08aff', light: '#e8c8ff', hot: '#fbf0ff', smoke: '#2a1640', debris: '#8a6ab8' },
  void: { deep: '#06030e', main: '#4a2aa8', mid: '#7a5aff', light: '#c4b0ff', hot: '#ffffff', smoke: '#08040e', debris: '#2a2436' },
};

export class BossFX {
  constructor(gfx) { this.g = gfx; }
  get fx() { return this.g.fx; }
  pal(th) { return PAL[th.fx] || PAL.fire; }
  vs() { return this.g.fx.vs || 1; }

  /* ================= สัญญาณเตือนบนพื้น ================= */
  // แผ่นเตือน: เส้นขอบกระพริบ + พื้นจาง + ชั้นที่ขยายตามเวลา (บอกจังหวะว่าเหลือกี่วิ)
  warn(group, edgeGeo, fillGeo, growMesh, dur, color, { grow = (m, k) => m.scale.setScalar(Math.max(0.01, k)) } = {}) {
    const fx = this.fx, mk = (geo, op, ro) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = ro; group.add(m); return m; };
    // พื้นแดงเข้ม (อ่านออกทุกพื้น) + ชั้นแดงที่ขยายตามเวลา · เส้นขอบใช้สีธีม
    const dark = mk(fillGeo, 0.3, 2); dark.material.color.set('#3a0606');
    const fill = mk(fillGeo, 0.2, 3); fill.material.color.set('#ff3a3a');
    const edge = mk(edgeGeo, 0.9, 4), g2 = growMesh ? mk(growMesh, 0.38, 3) : null; if (g2) g2.material.color.set('#ff5a3a');
    fx.add(group);
    fx.anim(dur, (k, dt, t) => { edge.material.opacity = 0.55 + Math.sin(t * (12 + k * 14)) * 0.35; if (g2) grow(g2, k); fill.material.opacity = 0.18 + 0.12 * k; }, () => fx.remove(group));
    return group;
  }
  tCone(cx, cy, a, range, arc, dur, th) {
    const g = new THREE.Group(); g.position.set(cx * S, 0.075, cy * S);
    const t0 = -a - arc / 2;
    const edge = new THREE.RingGeometry(range * 0.95, range, 48, 1, t0, arc);
    const sides = [t0, t0 + arc].map((tt) => new THREE.PlaneGeometry(range, 0.1).translate(range / 2, 0, 0).rotateZ(tt));
    const fill = new THREE.CircleGeometry(range, 48, t0, arc);
    const grp = this.warn(g, edge, fill, new THREE.CircleGeometry(range, 48, t0, arc), dur, th.warn);
    for (const sg of sides) { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: th.warn, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; grp.add(m); }
  }
  tLine(sx, sy, a, len, width, dur, th) {
    const g = new THREE.Group(); g.position.set(sx * S, 0.076, sy * S); g.rotation.y = -a;
    const fill = new THREE.PlaneGeometry(len, width).translate(len / 2, 0, 0);
    const edge = new THREE.BufferGeometry().copy(new THREE.PlaneGeometry(len, width * 0.1).translate(len / 2, width * 0.45, 0));
    const edge2 = new THREE.PlaneGeometry(len, width * 0.1).translate(len / 2, -width * 0.45, 0);
    const grp = this.warn(g, edge, fill, new THREE.PlaneGeometry(len, width).translate(len / 2, 0, 0), dur, th.warn, { grow: (m, k) => m.scale.set(Math.max(0.01, k), 1, 1) });
    const m2 = new THREE.Mesh(edge2, new THREE.MeshBasicMaterial({ color: th.warn, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); m2.rotation.x = -Math.PI / 2; m2.renderOrder = 4; grp.add(m2);
  }
  tDonut(cx, cy, r0, r1, dur, th) {
    const g = new THREE.Group(); g.position.set(cx * S, 0.074, cy * S);
    this.warn(g, new THREE.RingGeometry(r1 * 0.97, r1, 64), new THREE.RingGeometry(r0, r1, 64), new THREE.RingGeometry(r0, r1, 64), dur, th.warn, { grow: (m, k) => { m.material.opacity = 0.1 + 0.3 * k; } });
    // วงในปลอดภัย: เส้นขอบเขียวอ่อน
    const safe = new THREE.Mesh(new THREE.RingGeometry(r0 * 0.9, r0, 48), new THREE.MeshBasicMaterial({ color: '#7affb8', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })); safe.rotation.x = -Math.PI / 2; safe.renderOrder = 4; g.add(safe);
  }

  /* ================= ง้างท่า / เปลี่ยนเฟส ================= */
  windupAura(m, th) {
    const p = this.pal(th), pos = V(m.x * S, 0, m.y * S), fx = this.fx, h = (m.data.height || 3) * this.vs();
    fx.anim(0.7, () => fx.fx.emit({ pos: () => pos.clone().add(V(rand(-1.4, 1.4), rand(0, h), rand(-1.4, 1.4))), count: 2, vel: (i, q) => pos.clone().setY(h * 0.55).sub(q).multiplyScalar(2.5), life: 0.3, size: [0.14, 0.26], color: [p.hot, p.light, p.mid] }));
    fx.flash(pos.clone().setY(h * 0.55), p.light, 2.6, 0.5);
  }
  phaseUp(m, th, n) {
    const p = this.pal(th), x = m.x * S, z = m.y * S, pos = V(x, 0, z), fx = this.fx, h = (m.data.height || 3) * this.vs();
    fx.disc(pos, TX.runeCircle('star'), p.mid, 8, 1.6, { spin: 1.4, opacity: 0.9 });
    fx.pillar(pos, p.mid, 1.4, 14, 1.2, { spin: 4 });
    for (let i = 0; i < 3; i++) fx.after(0.15 + i * 0.15, () => fx.ring(pos, i % 2 ? p.hot : p.main, 0.4, 5 + i * 1.5, 0.6));
    fx.flash(pos.clone().setY(h * 0.6), p.hot, 6, 0.5);
    fx.sparks(pos.clone().setY(h * 0.6), [p.hot, p.light, p.mid], 70, 9, { colorEnd: p.main });
    this.g.shockAt(pos.clone().setY(1), 1.2); this.g.punch && this.g.punch(0.7);
    if (this.g.post) this.g.post.flash(p.light, 0.25);
  }

  /* ================= ระเบิดตามธีม ================= */
  burst(x, y, r, th, big) {
    const p = this.pal(th), g = this.g, px = x * S, pz = y * S, pos = V(px, 0, pz), fx = this.fx;
    g.bossImpact(px, pz, r, p.mid);
    const T = th.fx;
    if (T === 'fire' || T === 'blood' || T === 'void') fx.explosion(V(px, 0.4, pz), r * 0.55, { color: p.main, core: p.hot, scorchSize: r * 1.4 });
    if (T === 'ice' || T === 'crystal') { g.strikes.spikes(px, pz, r * 0.9, p.light, big ? 1.6 : 1.2); fx.snow && fx.snow.emit({ pos: V(px, 0.5, pz), count: 30, spread: r * 0.3, speed: [2, 6], gravity: -8, life: [0.5, 0.9], size: [0.18, 0.32], color: [p.hot, p.light] }); }
    if (T === 'nature') { g.rootSpikes(x, y, r); g.bursts.spawn(px, 0.4, pz, '#8ad84a', 24, 3, 1.6); }
    if (T === 'holy') { fx.pillar(pos, p.light, r * 0.45, 10, 0.6, { fromSky: true }); fx.star(V(px, 1, pz), p.hot, r * 2, 0.4); }
    if (T === 'water') { g.bursts.spawn(px, 0.3, pz, '#cff4ff', 40, 3.6, 2); fx.ring(pos, p.light, 0.3, r * 1.4, 0.7); fx.fx.emit({ pos: V(px, 0.1, pz), count: 40, spread: r * 0.4, flat: true, vel: () => V(rand(-1, 1), rand(3, 6), rand(-1, 1)), gravity: -12, life: [0.5, 0.9], size: [0.15, 0.3], color: [p.hot, p.light, p.mid] }); }
    if (T === 'void' || T === 'blood') fx.smoke.emit({ pos: V(px, 0.4, pz), count: 18, spread: r * 0.4, speed: [0.5, 2], up: [0.5, 1.5], life: [0.8, 1.4], size: [0.8, 1.4], sizeEnd: 2.2, color: p.smoke, alpha: 0.7 });
    if (big) { fx.light(V(px, 1.5, pz), p.mid, 6, 0.5, r * 5); g.shake(0.45); }
  }
  donut(cx, cy, r0, r1, th) {
    const p = this.pal(th), px = cx * S, pz = cy * S, pos = V(px, 0, pz), fx = this.fx;
    fx.wall(pos, p.mid, r0, r1, 1.6, 0.7, { opacity: 0.7 });
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, r = rand(r0 + 0.5, r1 - 0.3); fx.after(rand(0, 0.25), () => this.burst((px + Math.cos(a) * r) / S, (pz + Math.sin(a) * r) / S, 1.1, th, false)); }
    fx.ring(pos, p.light, r0, r1 * 1.05, 0.5);
    this.g.shake(0.6);
  }

  /* ================= พ่นลม / ฟันพัด ================= */
  breath(m, cx, cy, a, range, arc, th) {
    const p = this.pal(th), fx = this.fx, h = (m.data.height || 3) * this.vs() * 0.6, o = V(cx * S, h, cy * S), T = th.fx;
    const dir = (spread) => { const aa = a + rand(-arc / 2, arc / 2) * spread; return V(Math.cos(aa), 0, Math.sin(aa)); };
    fx.anim(0.7, (k) => {
      for (let i = 0; i < 10; i++) {
        const d = dir(1), sp = range * rand(1.2, 1.8);
        fx.fx.emit({ pos: o, count: 1, vel: () => d.clone().multiplyScalar(sp).add(V(0, -h * 1.6, 0)), drag: 0.6, life: [0.45, 0.65], size: [0.4, 0.8], sizeEnd: 1.8, color: [p.hot, p.light, p.mid], colorEnd: p.main });
      }
      if (T === 'fire' || T === 'void' || T === 'blood') fx.smoke.emit({ pos: o, count: 2, vel: () => dir(0.8).multiplyScalar(range * 1.2).add(V(0, -h, 0)), drag: 1, life: [0.6, 0.9], size: [0.8, 1.2], sizeEnd: 2.4, color: p.smoke, alpha: 0.55 });
      if (T === 'ice' || T === 'crystal') fx.snow.emit({ pos: o, count: 3, vel: () => dir(1).multiplyScalar(range * 1.4).add(V(0, -h * 1.4, 0)), drag: 0.6, life: [0.5, 0.7], size: [0.2, 0.36], color: [p.hot, p.light] });
      if (T === 'holy') fx.stars.emit({ pos: o, count: 2, vel: () => dir(1).multiplyScalar(range * 1.4).add(V(0, -h * 1.4, 0)), drag: 0.6, life: [0.5, 0.7], size: [0.3, 0.5], color: [p.hot, p.light] });
    });
    // รอยบนพื้นตามแนวพัด
    for (let i = 1; i <= 4; i++) fx.after(0.15 + i * 0.1, () => { const d = range * (i / 4.4), aa = a + rand(-arc / 3, arc / 3); const q = V(cx * S + Math.cos(aa) * d, 0, cy * S + Math.sin(aa) * d); fx.ring(q, p.mid, 0.2, 1.4, 0.4); fx.cracks(q, p.mid, 1.6, 1.4, { glow: 1, dark: 0.5 }); });
    fx.flash(o, p.hot, 3.4, 0.3);
    this.g.shake(0.3);
  }

  /* ================= พุ่งชน ================= */
  chargeTrail(m, sx, sy, ex, ey, dur, th) {
    const p = this.pal(th), fx = this.fx, a = V(sx * S, 0, sy * S), b = V(ex * S, 0, ey * S), h = (m.data.height || 3) * this.vs() * 0.5;
    fx.ring(a, p.light, 0.3, 2.4, 0.4);
    fx.anim(dur, (k) => {
      const q = a.clone().lerp(b, k);
      fx.fx.emit({ pos: () => q.clone().add(V(rand(-0.8, 0.8), rand(0.1, h * 1.6), rand(-0.8, 0.8))), count: 8, vel: () => a.clone().sub(b).normalize().multiplyScalar(rand(3, 6)), drag: 2, life: [0.25, 0.45], size: [0.3, 0.6], sizeEnd: 0.2, color: [p.hot, p.light, p.mid], colorEnd: p.main });
      fx.smoke.emit({ pos: q.clone().setY(0.3), count: 2, spread: 0.6, speed: [0.3, 1], up: [0.3, 1], life: [0.6, 0.9], size: [0.6, 1], sizeEnd: 2, color: p.smoke, alpha: 0.55 });
      if (Math.random() < 0.6) fx.decal(q, TX.scorch(), 1.6, 1.8, { color: p.deep, opacity: 0.55 });
    });
    if (this.g.post) this.g.post.speedLines(0.5, dur + 0.2);
  }

  /* ================= ของตกจากฟ้า (ใช้กับ rain) ================= */
  fallFrom(x, y, windup, th) {
    const p = this.pal(th), T = th.fx, to = V(x * S, 0.3, y * S), fx = this.fx, g = this.g;
    const t = Math.max(0, windup - 0.35);
    fx.after(t, () => {
      if (T === 'holy') { fx.pillar(V(to.x, 0, to.z), p.light, 0.35, 10, 0.4, { fromSky: true }); return; }
      const kind = 'orb', color = T === 'ice' || T === 'crystal' ? p.light : p.mid;
      g.projectiles.spawn({ from: [to.x - 2, 10, to.z - 1.5], to: [to.x, 0.3, to.z], kind, color, dur: 0.35, size: 0.6 });
      if (T === 'water') fx.pillar(V(to.x, 0, to.z), p.mid, 0.5, 4, 0.5, { spin: 6 });
    });
  }

  /* ================= ตราตามตัว ================= */
  markFollow(pl, r, follow, th) {
    const p = this.pal(th), fx = this.fx;
    const mk = (col, op, bl) => { const m = new THREE.Mesh(fx.geo.plane, fx.basic(col, { tex: TX.runeCircle('star'), opacity: 0, blending: bl })); m.rotation.x = -Math.PI / 2; m.renderOrder = 4; fx.add(m); return m; };
    const a = mk(p.deep, 0.7, NORMAL), b = mk(p.mid, 1, ADD);
    const head = new THREE.Sprite(fx.spriteMat(TX.star4(), p.light, 0)); head.renderOrder = 9; fx.add(head);
    let lock = null;
    fx.anim(follow + 1.2, (k, dt, t) => {
      const x = lock ? lock.x : pl.x * S, z = lock ? lock.z : pl.y * S, kk = lock ? Math.min(1, (t - follow) / lock.dur) : 0;
      for (const m of [a, b]) { m.position.set(x, 0.08, z); m.rotation.z += dt * (2 + kk * 10); m.scale.setScalar(r * 2 * (lock ? 1 + 0.15 * Math.sin(t * 30) : 0.7 + 0.3 * Math.min(1, t / 0.3))); }
      a.material.opacity = 0.6; b.material.opacity = 0.75 + Math.sin(t * 14) * 0.25;
      head.position.set(pl.x * S, (2.3 + Math.sin(t * 5) * 0.1) * this.vs(), pl.y * S); head.scale.setScalar(lock ? 0.01 : 0.9); head.material.opacity = lock ? 0 : 1; head.material.rotation += dt * 3;
    }, () => { fx.remove(a); fx.remove(b); fx.remove(head); });
    return { lockAt: (x, y, dur) => { lock = { x: x * S, z: y * S, dur }; } };
  }

  /* ================= ลูกพลังไล่ตาม ================= */
  orb(x, y, th) {
    const p = this.pal(th), fx = this.fx, g = new THREE.Group();
    const core = new THREE.Sprite(fx.spriteMat(TX.softDot(), p.hot, 1)); core.scale.setScalar(0.7);
    const glow = new THREE.Sprite(fx.spriteMat(TX.softDot(), p.main, 0.8)); glow.scale.setScalar(1.8);
    const dark = new THREE.Sprite(fx.spriteMat(TX.softDot(), p.deep, 0.5, NORMAL)); dark.scale.setScalar(2.2);
    for (const s of [dark, glow, core]) { s.renderOrder = 8; g.add(s); }
    const sh = new THREE.Mesh(fx.geo.plane, fx.basic('#000000', { tex: TX.softDot(), opacity: 0.35, blending: NORMAL })); sh.rotation.x = -Math.PI / 2; sh.scale.setScalar(1.4); sh.renderOrder = 2;
    fx.add(g); fx.add(sh); g.userData = { sh, p, t: 0 };
    this.orbMove(g, x, y);
    fx.flash(g.position, p.hot, 2, 0.3);
    return g;
  }
  orbMove(g, x, y) {
    const U = g.userData; U.t += 1 / 30;
    g.position.set(x * S, (1.1 + Math.sin(U.t * 5) * 0.15) * this.vs(), y * S); U.sh.position.set(x * S, 0.06, y * S);
    g.children[1].scale.setScalar(1.8 * (1 + 0.15 * Math.sin(U.t * 12)));
    if (Math.random() < 0.7) this.fx.fx.emit({ pos: g.position.clone(), count: 1, speed: 0.3, life: [0.3, 0.5], size: [0.2, 0.36], sizeEnd: 0.1, color: [U.p.light, U.p.mid], colorEnd: U.p.main });
  }
  orbPop(g, x, y, r, th) {
    this.fx.remove(g.userData.sh); this.fx.remove(g);
    this.burst(x, y, r, th, false);
  }

  /* ================= ดูดเข้าหาบอส ================= */
  vortex(cx, cy, r, dur, th) {
    const p = this.pal(th), fx = this.fx, pos = V(cx * S, 0, cy * S);
    fx.disc(pos, TX.runeCircle('star'), p.mid, r * 2, dur + 0.3, { spin: 4, opacity: 0.85 });
    fx.disc(pos, TX.runeCircle('star'), p.deep, r * 2.1, dur + 0.3, { spin: -2, opacity: 0.5, blending: NORMAL, y: 0.05 });
    fx.anim(dur, (k, dt, t) => {
      for (let j = 0; j < 4; j++) { const a = t * 6 + (j / 4) * TAU, rr = r * (1 - ((t * 0.9 + j / 4) % 1)); fx.fx.emit({ pos: V(pos.x + Math.cos(a) * rr, 0.3, pos.z + Math.sin(a) * rr), count: 2, vel: (i, q) => pos.clone().setY(0.6).sub(q).multiplyScalar(2.2), life: [0.35, 0.5], size: [0.2, 0.36], color: [p.hot, p.light, p.mid] }); }
      fx.smoke.emit({ pos: V(pos.x + rand(-r, r), 0.2, pos.z + rand(-r, r)), count: 1, vel: (i, q) => pos.clone().sub(q).multiplyScalar(1.5), life: [0.5, 0.8], size: [0.5, 0.9], sizeEnd: 1.4, color: p.smoke, alpha: 0.5 });
    });
  }

  /* ================= ลำแสงหลายแนว ================= */
  beams(cx, cy, angs, len, width, th) {
    const p = this.pal(th), fx = this.fx, o = V(cx * S, 0.4 * this.vs(), cy * S);
    for (const a of angs) {
      const d = V(Math.cos(a), 0, Math.sin(a)), e = o.clone().addScaledVector(d, len);
      fx.swLine(o, e, p, width * 0.55, 0.5);
      for (let i = 1; i <= 4; i++) fx.after(i * 0.04, () => { const q = V(cx * S, 0, cy * S).addScaledVector(d, len * (i / 4.5)); fx.cracks(q, p.mid, width * 1.4, 1.4, { glow: 1, dark: 0.5 }); fx.fx.emit({ pos: q.clone().setY(0.1), count: 10, spread: width * 0.3, flat: true, vel: () => V(rand(-0.5, 0.5), rand(2, 4), rand(-0.5, 0.5)), drag: 2, life: [0.3, 0.5], size: [0.2, 0.36], color: [p.hot, p.light, p.mid], colorEnd: p.main }); });
    }
    fx.flash(o, p.hot, 4, 0.3); fx.ring(V(cx * S, 0, cy * S), p.light, 0.3, 3, 0.4);
  }

  /* ================= โล่บอส ================= */
  shield(m, dur, th) {
    const p = this.pal(th), fx = this.fx, r = (m.data.radius || 1.2) * 1.9, h = (m.data.height || 3);
    const dome = new THREE.Mesh(fx.geo.sphere, fx.basic(p.mid, { opacity: 0.22 }));
    const hex = new THREE.Mesh(fx.geo.sphere, fx.basic(p.light, { tex: TX.hexGrid(), opacity: 0.35 }));
    dome.renderOrder = hex.renderOrder = 8; fx.add(dome); fx.add(hex);
    fx.anim(dur, (k, dt, t) => {
      const pos = V(m.x * S, h * 0.5 * this.vs(), m.y * S), pop = Math.min(1, t / 0.3), fo = Math.min(1, (dur - t) / 0.4);
      dome.position.copy(pos); hex.position.copy(pos); dome.scale.set(r * pop, h * 0.65 * this.vs() * pop, r * pop); hex.scale.copy(dome.scale).multiplyScalar(1.02); hex.rotation.y += dt * 0.6;
      hex.material.opacity = 0.35 * fo * (0.8 + 0.2 * Math.sin(t * 6)); dome.material.opacity = 0.22 * fo;
    }, () => { fx.remove(dome); fx.remove(hex); fx.sparks(V(m.x * S, h * 0.5 * this.vs(), m.y * S), [p.hot, p.light], 40, 6); });
    fx.flash(V(m.x * S, h * 0.5 * this.vs(), m.y * S), p.hot, r * 3, 0.4);
  }

  /* ================= ถล่มทั้งลาน (บอสโลก) ================= */
  cataclysm(cx, cy, R, safes, safeR, dur, th) {
    const p = this.pal(th), fx = this.fx, pos = V(cx * S, 0, cy * S);
    const g = new THREE.Group(); g.position.set(pos.x, 0.072, pos.z);
    this.warn(g, new THREE.RingGeometry(R * 0.985, R, 96), new THREE.CircleGeometry(R, 96), new THREE.CircleGeometry(R, 96), dur, '#ff3a3a');
    fx.disc(pos, TX.runeCircle('star'), p.mid, R * 2, dur + 0.4, { spin: 0.4, opacity: 0.6 });
    // วงปลอดภัย: วงแสงเขียวทอง + เสาแสงบอกตำแหน่ง
    for (const s of safes) {
      const q = V(s.x * S, 0, s.y * S);
      const m = new THREE.Mesh(new THREE.CircleGeometry(safeR, 48), new THREE.MeshBasicMaterial({ color: '#7affb8', transparent: true, opacity: 0.5, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(q.x, 0.09, q.z); m.renderOrder = 5;
      const e = new THREE.Mesh(new THREE.RingGeometry(safeR * 0.9, safeR, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })); e.rotation.x = -Math.PI / 2; e.position.set(q.x, 0.095, q.z); e.renderOrder = 6;
      fx.add(m); fx.add(e);
      fx.pillar(q, '#9affc8', safeR * 0.6, 8, dur + 0.3, { spin: 2, opacity: 0.6 });
      fx.anim(dur + 0.3, (k, dt, t) => { m.material.opacity = 0.35 + 0.2 * Math.sin(t * 6); e.scale.setScalar(1 + 0.05 * Math.sin(t * 10)); }, () => { fx.remove(m); fx.remove(e); });
    }
    // พลังรวมเหนือบอส
    fx.anim(dur, (k) => fx.fx.emit({ pos: () => pos.clone().add(V(rand(-R, R), 0.2, rand(-R, R))), count: 3, vel: (i, q) => pos.clone().setY(6 * this.vs()).sub(q).multiplyScalar(0.8), life: [0.6, 0.9], size: [0.2, 0.36], color: [p.hot, p.light, p.mid] }));
  }
  cataclysmBlast(cx, cy, R, safes, safeR, th) {
    const p = this.pal(th), fx = this.fx, pos = V(cx * S, 0, cy * S);
    fx.mgBlast ? fx.mgBlast(V(pos.x, 1.2, pos.z), p, 3.5, null, 3) : fx.explosion(V(pos.x, 1, pos.z), 3.5, { color: p.main, core: p.hot });
    for (let i = 0; i < 26; i++) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * R, x = pos.x + Math.cos(a) * r, z = pos.z + Math.sin(a) * r;
      if (safes.some((s) => Math.hypot(x - s.x * S, z - s.y * S) < safeR + 0.6)) continue;
      fx.after(rand(0, 0.35), () => this.burst(x / S, z / S, 1.6, th, false));
    }
    for (let i = 0; i < 4; i++) fx.after(i * 0.1, () => fx.ring(pos, i % 2 ? p.hot : p.main, 0.5, R * (0.6 + i * 0.2), 0.7));
    fx.pillar(pos, p.mid, 2.4, 16, 1, { spin: 6 });
    if (this.g.post) { this.g.post.flash('#ffffff', 0.5); this.g.post.aberrate(1.2); }
    this.g.shockAt(pos.clone().setY(1), 1.6);
  }
}
