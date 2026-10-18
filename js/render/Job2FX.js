// v0.35 เอฟเฟกต์สกิลอาชีพขั้นที่ 2 — Wizard ชุดใหม่ (สไตล์อนิเมะ) · อาชีพอื่นชุด v0.31.1 — ติดตั้งเป็นเมธอดของ SkillFX
// ภาษาภาพใหม่ต่างจากขั้น 1: วาดบนเลเยอร์ HD ความละเอียดเต็มจอ · ริบบิ้นแสงนุ่ม · วงเวทเฉพาะอาชีพที่วาดตัวเอง
// · เปลวไฟ/โล่/ลำแสงแบบเชดเดอร์ · อนุภาคขอบนุ่ม — ดาเมจยังเข้าตามจังหวะเดิมผ่าน c.hit()
import { THREE } from './three.js?v=0.44.0';
import * as TX from './FxTextures.js?v=0.44.0';
import { T, Ribbon, sigilMat, ribbonMat, flameMat, energyMat, beamMat, vortexMat } from './Job2Kit.js?v=0.44.0';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;
const PAL = {
  knight: { a: '#5aa8ff', b: '#ffd36b', c: '#e8f4ff' },
  wizard: { a: '#a070ff', b: '#6ae0ff', c: '#f0e4ff' },
  hunter: { a: '#3ee08a', b: '#ffd36b', c: '#eafff2' },
  priest: { a: '#ffbe3a', b: '#5ad0ff', c: '#fff2c8' },
};

const FX = {
  /* ================= เลเยอร์ HD ================= */
  hdInit() {
    if (this.hd) return;
    this.hdScene = new THREE.Scene();
    this.hd = new THREE.Group(); this.hdScene.add(this.hd);
    const P = this._Particles, mk = (n, t) => { const p = new P(this.hd, n, t, ADD, { boost: 1, sizeBoost: 1 }); p.points.renderOrder = 30; p.mat.depthTest = false; p.mat.uniforms.gain.value = this.gain; return p; };
    this.hdFx = mk(2600, T.dot()); this.hdStars = mk(700, T.star()); this.hdFeathers = mk(360, T.feather());
    this.hdSys = [this.hdFx, this.hdStars, this.hdFeathers];
  },
  hdAdd(o) { this.hdInit(); this.hd.add(o); return o; },
  hdRemove(o) {
    if (!o || !o.parent) return;
    o.parent.remove(o);
    o.traverse((m) => { if (m.material) m.material.dispose(); if (m.geometry && m.userData.own) m.geometry.dispose(); });
  },
  // วาดเลเยอร์ HD ทับภาพหลัก (เรียกจาก Renderer3D หลังรวมภาพ)
  hdRender(renderer, camera) {
    if (!this.hd) return;
    const live = this.hd.children.length > this.hdSys.length || this.hdSys.some((p) => p.wasAlive);
    if (!live) return;
    const h = renderer.domElement.height, sc = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (const p of this.hdSys) p.mat.uniforms.scale.value = sc;
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.setRenderTarget(null); renderer.render(this.hdScene, camera);
    renderer.autoClear = ac;
  },
  camPos() { return this.camera ? this.camera.position : V(0, 30, 20); },
  hdMat(color, { map = T.dot(), opacity = 1 } = {}) {
    const m = new THREE.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: ADD, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    m.color.multiplyScalar(this.gain); return m;
  },
  hdSpriteMat(map, color, opacity = 1) {
    const m = new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: ADD, depthWrite: false, depthTest: false });
    m.color.multiplyScalar(this.gain); return m;
  },
  // แสงวาบนุ่ม
  hdFlash(pos, color, size = 2, dur = 0.4, map = T.dot(), peak = 1) {
    peak *= 0.7;
    const s = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(map, color))); s.position.copy(pos); s.renderOrder = 26;
    const rot = Math.random() * TAU;
    this.anim(dur, (k) => { s.scale.setScalar(size * (0.3 + 0.7 * easeOut(k))); s.material.opacity = peak * (1 - easeIn(k)); s.material.rotation = rot + k * 0.6; }, () => this.hdRemove(s));
    return s;
  },
  // วงแหวนนุ่ม (แนวนอน หรือหันตามทิศ)
  hdRing(pos, color, r0, r1, dur = 0.5, { y = null, face = null, opacity = 1, width = 1 } = {}) {
    const m = this.hdAdd(new THREE.Mesh(this.geo.plane, this.hdMat(color, { map: T.ring(), opacity })));
    m.position.set(pos.x, y ?? 0.05, pos.z); m.renderOrder = 24;
    if (face) m.lookAt(m.position.clone().add(face)); else m.rotation.x = -Math.PI / 2;
    this.anim(dur, (k) => { const r = r0 + (r1 - r0) * easeOut(k); m.scale.set(r * 2, r * 2 * width, 1); m.material.opacity = opacity * (1 - k) * (k < 0.08 ? k / 0.08 : 1); }, () => this.hdRemove(m));
    return m;
  },
  // วงเวทเฉพาะอาชีพ: วาดตัวเองตามเข็มนาฬิกา หมุนช้า ๆ แล้วจาง
  sigil2(pos, kind, cA, cB, size, dur, { spin = 0.5, y = 0.06, draw = 0.4, fade = 0.4, face = null, opacity = 1 } = {}) {
    const m = this.hdAdd(new THREE.Mesh(this.geo.plane, sigilMat(T.sigil(kind), cA, cB, this.gain)));
    m.position.set(pos.x, y, pos.z); m.renderOrder = 22;
    if (face) m.lookAt(m.position.clone().add(face)); else m.rotation.x = -Math.PI / 2;
    const U = m.material.uniforms;
    // เงาเข้มนุ่มใต้วงเวท (ให้เห็นชัดบนพื้นสว่าง)
    const under = face ? null : this.hdAdd(new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ color: '#0a0616', map: T.dot(), transparent: true, opacity: 0, depthTest: false, depthWrite: false })));
    if (under) { under.position.set(pos.x, y - 0.01, pos.z); under.rotation.x = -Math.PI / 2; under.renderOrder = 19; }
    this.anim(dur, (k, dt, t) => {
      U.time.value = t; U.progress.value = easeIO(Math.min(1, t / draw));
      const o = opacity * Math.min(1, t / 0.12) * Math.min(1, (dur - t) / fade);
      U.opacity.value = o;
      const s = size * (0.86 + 0.14 * easeOut(Math.min(1, t / draw))); m.scale.set(s, s, 1);
      if (under) { under.scale.set(s * 1.25, s * 1.25, 1); under.material.opacity = 0.5 * o; }
      m.rotateZ(spin * dt);
    }, () => { this.hdRemove(m); this.hdRemove(under); });
    return m;
  },
  // ริบบิ้นวิ่งตามเส้นโค้ง curve(u) (u: 0→1) — หัววิ่งภายใน sweep วินาที หางยาว len แล้วไล่เก็บหาง
  streak(curve, { color, core = '#ffffff', width = 0.3, sweep = 0.35, len = 0.45, dur = null, n = 36, taper = 0.15, opacity = 1 } = {}) {
    const R = new Ribbon(n, ribbonMat(color, core, this.gain)); R.mesh.userData.own = true; this.hdAdd(R.mesh);
    const pts = Array.from({ length: n }, () => V()), D = dur ?? sweep * (1 + len) + 0.05, U = R.mesh.material.uniforms;
    const step = (t) => {
      const p = t / sweep, hu = Math.min(1, p), tu = Math.min(1, Math.max(0, p - len));
      for (let i = 0; i < n; i++) pts[i].copy(curve(tu + (hu - tu) * (i / (n - 1))));
      R.set(pts, (u) => width * 1.6 * (taper + (1 - taper) * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5)), this.camPos());
      U.time.value = t; U.opacity.value = opacity * (t > D - 0.12 ? Math.max(0, (D - t) / 0.12) : 1);
    };
    step(0.001);
    this.anim(D, (k, dt, t) => step(t), () => this.hdRemove(R.mesh));
    return R;
  },
  // หางแสงตามวัตถุเคลื่อนที่ (getPos() ทุกเฟรม)
  trail(getPos, { color, core = '#ffffff', width = 0.25, n = 22, dur = 1, opacity = 1 } = {}) {
    const R = new Ribbon(n, ribbonMat(color, core, this.gain)); R.mesh.userData.own = true; this.hdAdd(R.mesh);
    const p0 = getPos().clone(), hist = Array.from({ length: n }, () => p0.clone()), U = R.mesh.material.uniforms;
    this.anim(dur, (k, dt, t) => {
      hist.shift(); hist.push(getPos().clone());
      R.set(hist, (u) => width * 1.5 * u, this.camPos());
      U.time.value = t; U.opacity.value = opacity * (k > 0.85 ? (1 - k) / 0.15 : 1);
    }, () => this.hdRemove(R.mesh));
    return R;
  },
  // สายฟ้า HD (ริบบิ้นหยัก กะพริบเปลี่ยนรูปทุก 0.05 วิ)
  bolt(from, to, { color = '#ffe680', core = '#ffffff', width = 0.18, dur = 0.3, jag = 0.5, n = 16 } = {}) {
    const R = new Ribbon(n, ribbonMat(color, core, this.gain)); R.mesh.userData.own = true; this.hdAdd(R.mesh);
    const pts = Array.from({ length: n }, () => V()), U = R.mesh.material.uniforms;
    let next = 0;
    const shape = () => { for (let i = 0; i < n; i++) { const u = i / (n - 1), p = pts[i].copy(from).lerp(to, u), j = Math.sin(u * Math.PI) * jag; p.x += rand(-j, j); p.y += rand(-j, j) * 0.5; p.z += rand(-j, j); } R.set(pts, (u) => width * 1.6 * (0.5 + 0.5 * Math.sin(u * Math.PI)), this.camPos()); };
    shape();
    this.anim(dur, (k, dt, t) => { if (t > next) { shape(); next = t + 0.05; } U.opacity.value = k < 0.2 ? 1 : (1 - k) * (Math.random() > 0.3 ? 1 : 0.4); U.time.value = t; }, () => this.hdRemove(R.mesh));
    return R;
  },
  // เสาไฟเชดเดอร์ / กรวยไฟ
  flameCol(pos, { r = 0.5, h = 3, dur = 0.8, core = '#ffd27a', edge = '#ff3a0a', grow = 0.15, cone = false, speed = 2.2, twist = 0 } = {}) {
    if (!this.geo.flameCyl) { this.geo.flameCyl = new THREE.CylinderGeometry(0.55, 1, 1, 28, 8, true).translate(0, 0.5, 0); this.geo.flameCone = new THREE.CylinderGeometry(0.05, 1, 1, 28, 8, true).translate(0, 0.5, 0); }
    const m = this.hdAdd(new THREE.Mesh(cone ? this.geo.flameCone : this.geo.flameCyl, flameMat(core, edge, this.gain))); m.renderOrder = 23;
    m.position.set(pos.x, 0, pos.z); const U = m.material.uniforms; U.speed.value = speed;
    this.anim(dur, (k, dt, t) => { const g = easeOut(Math.min(1, t / grow)); m.scale.set(r * (1.15 - 0.15 * g), h * g, r * (1.15 - 0.15 * g)); m.rotation.y += twist * dt; U.time.value = t + pos.x; U.opacity.value = k < 0.7 ? 1 : (1 - k) / 0.3; }, () => this.hdRemove(m));
    return m;
  },
  // โดม/ทรงกลมพลังงาน fresnel
  dome(pos, color, r, dur, { map = T.hex(), half = true, y = 0, grow = 0.3, hold = null, rep = [6, 3] } = {}) {
    const geo = new THREE.SphereGeometry(1, 36, 18, 0, TAU, 0, half ? Math.PI / 2 : Math.PI);
    const m = this.hdAdd(new THREE.Mesh(geo, energyMat(color, map, this.gain, rep))); m.userData.own = true; m.renderOrder = 21;
    m.position.set(pos.x, y, pos.z); const U = m.material.uniforms;
    this.anim(dur, (k, dt, t) => { const g = easeOut(Math.min(1, t / grow)), s = hold ? hold(k, t) : 1; m.scale.set(r * g * s, r * g * s * (half ? 1.1 : 1), r * g * s); U.time.value = t; U.opacity.value = k < 0.75 ? 1 : (1 - k) / 0.25; m.rotation.y += dt * 0.4; }, () => this.hdRemove(m));
    return m;
  },
  // ลำแสง (สวรรค์/พลังงาน) ทรงกระบอกขอบนุ่ม
  beam2(pos, color, r, h, dur, { fromSky = false, grow = 0.18, speed = 1.4, y0 = 0, opacity = 1 } = {}) {
    if (!this.geo.beamCyl) this.geo.beamCyl = new THREE.CylinderGeometry(1, 1, 1, 28, 6, true).translate(0, 0.5, 0);
    const m = this.hdAdd(new THREE.Mesh(this.geo.beamCyl, beamMat(color, this.gain))); m.renderOrder = 21;
    const U = m.material.uniforms; U.speed.value = speed;
    this.anim(dur, (k, dt, t) => { const g = easeOut(Math.min(1, t / grow)), hh = h * (fromSky ? 1 : g); m.scale.set(r * (1 - 0.35 * k), hh, r * (1 - 0.35 * k)); m.position.set(pos.x, y0 + (fromSky ? h * (1 - g) : 0), pos.z); U.time.value = t; U.opacity.value = opacity * (k < 0.6 ? 1 : (1 - k) / 0.4); }, () => this.hdRemove(m));
    return m;
  },
  vortex(pos, color, r, h, dur, { spin = 3, grow = 0.25 } = {}) {
    if (!this.geo.vortexCone) this.geo.vortexCone = new THREE.CylinderGeometry(1, 0.25, 1, 32, 8, true).translate(0, 0.5, 0);
    const m = this.hdAdd(new THREE.Mesh(this.geo.vortexCone, vortexMat(color, this.gain))); m.renderOrder = 22;
    m.position.set(pos.x, 0, pos.z); const U = m.material.uniforms;
    this.anim(dur, (k, dt, t) => { const g = easeOut(Math.min(1, t / grow)); m.scale.set(r * g, h * g, r * g); m.rotation.y += spin * dt; U.time.value = t; U.opacity.value = k < 0.75 ? 1 : (1 - k) / 0.25; }, () => this.hdRemove(m));
    return m;
  },
  hdBurst(pos, colors, count = 40, speed = [3, 8], { gravity = -4, life = [0.35, 0.8], size = [0.1, 0.22], sys = 'hdFx', drag = 1.6, colorEnd = null } = {}) {
    this.hdInit(); this[sys].emit({ pos, count, speed, gravity, drag, life, size, sizeEnd: 0.1, color: colors, colorEnd: colorEnd || colors });
  },
  // เหยี่ยว HD (ปีกขนนกนุ่ม) — คืน { g, flap(t) }
  hawk2(color, scale = 1) {
    const g = new THREE.Group();
    const wings = [-1, 1].map((s) => { const piv = new THREE.Group(); const w = new THREE.Mesh(this.geo.plane, this.hdMat(color, { map: T.wing(), opacity: 0.95 })); w.scale.set(s * 1.3, 1.3, 1); w.position.set(s * 0.55, 0.45, 0); w.rotation.x = -Math.PI / 2; piv.add(w); g.add(piv); return { piv, s }; });
    const body = new THREE.Sprite(this.hdSpriteMat(T.dot(), '#ffffff', 1)); body.scale.setScalar(0.55);
    const aura = new THREE.Sprite(this.hdSpriteMat(T.dot(), color, 0.75)); aura.scale.setScalar(1.6);
    g.add(body, aura); g.scale.setScalar(scale); this.hdAdd(g);
    return { g, flap: (t) => { for (const w of wings) w.piv.rotation.z = w.s * Math.sin(t * 20) * 0.65; } };
  },
  lineTargets(c, from, dir, len, w) {
    return c.targets.map((t, i) => [t, i]).filter(([t]) => { const dx = t.pos.x - from.x, dz = t.pos.z - from.z, al = dx * dir.x + dz * dir.z; return al >= -0.3 && al <= len && Math.abs(dx * dir.z - dz * dir.x) <= w; });
  },
  hitStun(c, t, i, info) { const r = c.hit(i, info); if (r && r.stun) this.stunStars(t, r.stun); if (r && r.freeze) this.iceBlock(t, Math.min(2.4, r.freeze)); return r; },

  /* ================= Knight · ฟ้าเหล็กกล้า + ทอง ================= */
  fx_lance_pierce(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const K = PAL.knight, from = c.caster.pos.clone(), dir = t.pos.clone().sub(from).setY(0).normalize(), side = V(dir.z, 0, -dir.x), h = 1.0 * this.vs;
    this.sigil2(from, 'knight', K.a, K.b, 2.6, 0.9, { draw: 0.25, spin: 1.2 });
    for (let n = 0; n < 3; n++) this.after(0.1 + n * 0.15, () => {
      c.anim('melee');
      const a = V(from.x, h, from.z).addScaledVector(dir, 0.5), L = 5.4, tip = a.clone().addScaledVector(dir, L);
      // สว่านแสงเกลียวสามสาย + แกนกลาง
      for (let s = 0; s < 3; s++) this.streak((u) => { const ang = u * 7 * Math.PI + (s / 3) * TAU, r = 0.42 * (1 - u * 0.85); return a.clone().addScaledVector(dir, u * L).addScaledVector(side, Math.cos(ang) * r).add(V(0, Math.sin(ang) * r, 0)); }, { color: s === 1 ? K.b : K.a, width: 0.26, sweep: 0.17, len: 0.7, n: 40 });
      this.streak((u) => a.clone().addScaledVector(dir, u * (L + 0.6)), { color: K.a, core: '#ffffff', width: 0.5 + n * 0.12, sweep: 0.14, len: 0.8, n: 16 });
      this.hdFlash(tip, K.a, 2.2, 0.3); this.hdFlash(tip, '#ffffff', 1.2, 0.2, T.star());
      this.hdRing(tip, K.c, 0.2, 1.3 + n * 0.3, 0.35, { face: dir, y: tip.y });
      this.hdBurst(tip, ['#ffffff', K.c, K.a], 28, [4, 9], { gravity: -6, life: [0.2, 0.45] });
      if (n === 2) { this.sigil2(tip, 'knight', K.b, K.a, 2.2, 0.55, { face: dir.clone().negate(), draw: 0.12, spin: 2, y: tip.y }); this.hdRing(tip, K.b, 0.3, 2.6, 0.5, { face: dir, y: tip.y }); }
      this.light(a.clone().lerp(tip, 0.5), K.a, 4, 0.2, 7);
      for (const [tt, i] of this.lineTargets(c, from, dir, 5.8, 0.95)) { const tp = this.hitPos(tt); this.hdFlash(tp, K.c, 1.4, 0.2, T.star()); this.hitStun(c, tt, i, { mult: 1, stun: n === 2 ? 1.5 : 0 }); }
      this.impact(c, tip, n === 2 ? 2 : 1, K.c);
    });
    return 1.2;
  },

  fx_steel_charge(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const K = PAL.knight, from = c.caster.pos.clone(), to = c.dashTo || from.clone(), dir = t.pos.clone().sub(from).setY(0).normalize();
    c.anim('melee'); this.lines(c, 0.7, 0.4);
    // ภาพติดตาของการพุ่ง (ริบบิ้นสามระดับ + เงาแสง)
    for (const [y, col, w] of [[0.45, K.a, 0.55], [1.15, K.c, 0.4], [0.8, K.b, 0.22]]) this.streak((u) => from.clone().lerp(to, u).add(V(0, y * this.vs, 0)).addScaledVector(dir, 0.6), { color: col, width: w, sweep: 0.2, len: 0.9, n: 20 });
    for (let i = 0; i < 4; i++) this.after(i * 0.05, () => this.hdFlash(from.clone().lerp(to, i / 3).add(V(0, 0.9 * this.vs, 0)), K.a, 1.6, 0.35));
    // ตราโล่นำหน้า
    const shield = this.hdAdd(new THREE.Mesh(this.geo.plane, sigilMat(T.sigil('knight'), K.c, K.a, this.gain)));
    shield.material.uniforms.progress.value = 1; shield.renderOrder = 27;
    this.anim(0.26, (k, dt, tt) => { const p = from.clone().lerp(to, easeOut(k)).addScaledVector(dir, 0.75); shield.position.set(p.x, 0.95 * this.vs, p.z); shield.lookAt(shield.position.clone().sub(dir)); shield.scale.setScalar(1.7 * (0.7 + 0.3 * easeOut(k))); shield.material.uniforms.time.value = tt; }, () => this.hdRemove(shield));
    this.after(0.22, () => {
      const gp = V(t.pos.x, 0, t.pos.z), ip = V(gp.x, 0.7 * this.vs, gp.z);
      this.sigil2(gp, 'knight', K.b, K.a, 5, 1.2, { draw: 0.14, spin: 0.8 });
      this.hdFlash(ip, '#ffffff', 3.4, 0.3); this.hdFlash(ip, K.a, 6.5, 0.6, T.dot(), 0.7); this.hdFlash(ip, K.c, 3, 0.35, T.star());
      this.hdRing(gp, K.c, 0.3, 3.2, 0.5); this.hdRing(gp, K.b, 0.2, 2.4, 0.7, { opacity: 0.8 });
      this.beam2(gp, K.a, 0.9, 4, 0.5, { grow: 0.06 });
      this.hdBurst(ip, ['#ffffff', K.c, K.b], 70, [4, 10], { gravity: -8 });
      this.debris(V(gp.x, 0.3, gp.z), { count: 12, speed: [3, 6], glow: K.a }); this.cracks(gp, K.a, 4.4, 2.2);
      this.light(ip, K.a, 7, 0.4, 8); this.impact(c, ip, 3, K.c);
      for (const [tt, i] of this.inRadius(c, gp, 2.2)) this.hitStun(c, tt, i, { mult: 2.4, knock: 1.2 });
    });
    return 1.3;
  },

  fx_crescent_sweep(c) {
    const K = PAL.knight, p = c.caster.pos.clone(), a0 = Math.atan2(c.caster.facing.z, c.caster.facing.x);
    c.anim('spin', 0.75); this.lines(c, 0.4, 0.6);
    this.sigil2(p, 'knight', K.a, K.b, 7.6, 1.1, { draw: 0.3, spin: 3 });
    const circ = (R, y0, tilt, dirn, start) => (u) => { const a = start + dirn * u * TAU * 1.08; return V(p.x + Math.cos(a) * R, (y0 + Math.sin(a + tilt) * 0.35) * this.vs, p.z + Math.sin(a) * R); };
    this.streak(circ(2.6, 0.8, 0, 1, a0), { color: K.a, width: 1.1, sweep: 0.26, len: 0.55, n: 48, taper: 0.05 });
    this.streak(circ(2.2, 1.0, 1.2, 1, a0 + 0.4), { color: K.c, width: 0.5, sweep: 0.26, len: 0.45, n: 48 });
    this.after(0.3, () => { this.streak(circ(3.3, 0.6, 2.2, -1, a0 + Math.PI), { color: K.b, width: 1.2, sweep: 0.28, len: 0.55, n: 48, taper: 0.05 }); this.streak(circ(2.9, 0.85, 0.4, -1, a0 + Math.PI + 0.3), { color: '#ffffff', width: 0.35, sweep: 0.28, len: 0.4, n: 48 }); });
    for (let hIdx = 0; hIdx < 2; hIdx++) this.after(0.14 + hIdx * 0.3, () => {
      this.hdRing(p, hIdx ? K.b : K.a, 0.6, 4.4, 0.5); this.hdRing(p, '#ffffff', 0.4, 3.4, 0.35, { opacity: 0.6 });
      this.hdBurst(V(p.x, 0.8 * this.vs, p.z), ['#ffffff', K.c, hIdx ? K.b : K.a], 60, [6, 11], { gravity: -2, drag: 3 });
      for (const [tt, i] of this.inRadius(c, p, 3.8)) { const tp = this.hitPos(tt); this.hdFlash(tp, hIdx ? K.b : K.c, 1.5, 0.25, T.star()); c.hit(i, { mult: 1.2, knock: hIdx ? 1.2 : 0, hitIndex: hIdx, total: 2 }); }
      this.impact(c, V(p.x, 1, p.z), hIdx ? 2 : 1, K.c);
    });
    return 1.2;
  },

  fx_aegis_aura(c) {
    const K = PAL.knight, p = c.caster.pos.clone(), ch = V(p.x, 0.95 * this.vs, p.z);
    c.anim('cast');
    this.sigil2(p, 'knight', K.a, K.b, 4.4, 1.9, { draw: 0.6, spin: 0.6 });
    // ตราโล่ 3 อันโคจรแล้วรวมเข้าตัว
    const crest = [0, 1, 2].map(() => this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.sigil('knight'), K.c, 0.95))));
    this.anim(1.2, (k, dt, tt) => { const r = 1.9 * (1 - easeIn(k)), y = ch.y + 0.4 - k * 0.3; crest.forEach((s, i) => { const a = tt * 4 + (i / 3) * TAU; s.position.set(p.x + Math.cos(a) * r, y + Math.sin(tt * 5 + i) * 0.15, p.z + Math.sin(a) * r); s.scale.setScalar(0.9 * (1 - k * 0.4)); s.material.opacity = k > 0.85 ? (1 - k) / 0.15 : 0.95; }); }, () => crest.forEach((s) => this.hdRemove(s)));
    for (let i = 0; i < 3; i++) this.streak((u) => { const a = u * TAU * 1.5 + i * 2.1; return V(p.x + Math.cos(a) * 1.5, (0.2 + u * 1.9) * this.vs, p.z + Math.sin(a) * 1.5); }, { color: i === 1 ? K.b : K.a, width: 0.22, sweep: 0.9, len: 0.4, n: 40 });
    this.after(1.05, () => {
      this.dome(V(p.x, 0, p.z), K.a, 1.55, 1.1, { grow: 0.25, hold: (k) => 1 + 0.05 * Math.sin(k * 20) });
      this.hdFlash(ch, '#ffffff', 3.5, 0.4); this.hdRing(p, K.c, 0.3, 3, 0.5);
      this.hdBurst(ch, ['#ffffff', K.c], 30, [1, 3], { sys: 'hdStars', gravity: 0.5, life: [0.6, 1.1], size: [0.2, 0.36] });
      c.buff('โล่ราชันย์ ▲');
    });
    this.light(ch, K.a, 5, 1.8, 6);
    return 2;
  },

  fx_heavens_lance(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const K = PAL.knight, gp = V(t.pos.x, 0, t.pos.z);
    c.anim('castHold'); this.lines(c, 0.8, 1.1);
    if (c.sky) c.sky(0.4, 2.6);
    this.sigil2(gp, 'knight', K.a, K.b, 7, 2.3, { draw: 0.5, spin: 0.7 });
    this.sigil2(gp, 'knight', K.b, K.a, 6, 1.4, { draw: 0.35, spin: -1.2, y: 8.5, face: V(0, -1, 0) });
    // หอกยักษ์: แกนลำแสง + ปลายเพชร
    const L = new THREE.Group(); this.hdAdd(L);
    if (!this.geo.beamCyl) this.geo.beamCyl = new THREE.CylinderGeometry(1, 1, 1, 28, 6, true).translate(0, 0.5, 0);
    const shaft = new THREE.Mesh(this.geo.beamCyl, beamMat(K.c, this.gain)); shaft.scale.set(0.32, 5.5, 0.32); shaft.position.y = 0.6; shaft.material.uniforms.speed.value = -3;
    const tipGeo = new THREE.ConeGeometry(0.55, 1.6, 4), tip = new THREE.Mesh(tipGeo, this.hdMat('#ffffff', { map: null })); tip.rotation.x = Math.PI;
    const glow = new THREE.Sprite(this.hdSpriteMat(T.dot(), K.a, 0.8)); glow.scale.set(2.4, 7.5, 1); glow.position.y = 3;
    L.add(shaft, tip, glow); L.position.set(gp.x, 10, gp.z);
    this.anim(0.8, (k, dt, tt) => { L.position.y = 10 - 9.6 * easeIn(k); L.rotation.y += dt * 4; shaft.material.uniforms.time.value = tt; });
    // มังกรแสงพันหอกเป็นเกลียวลงมา
    for (const [ph, col, w] of [[0, K.a, 0.7], [Math.PI, K.b, 0.5]]) this.streak((u) => { const y = 10.5 - u * 10, a = u * 16 + ph, r = 1.3 * (1 - u * 0.6); return V(gp.x + Math.cos(a) * r, y, gp.z + Math.sin(a) * r); }, { color: col, width: w, sweep: 0.8, len: 0.35, n: 60 });
    this.after(0.8, () => {
      const ip = V(gp.x, 0.6, gp.z);
      this.hdFlash(ip, '#ffffff', 7, 0.35); this.hdFlash(ip, K.a, 12, 0.8, T.dot(), 0.6); this.hdFlash(V(gp.x, 1.4, gp.z), K.c, 6, 0.5, T.star());
      for (let i = 0; i < 4; i++) this.hdRing(gp, i % 2 ? K.b : K.c, 0.4, 3 + i * 1.2, 0.5 + i * 0.12, { opacity: 0.9 - i * 0.15 });
      this.beam2(gp, K.a, 1.6, 14, 0.7, { grow: 0.05 }); this.beam2(gp, '#ffffff', 0.6, 14, 0.5, { grow: 0.04 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; this.streak((u) => V(gp.x + Math.cos(a) * u * 4.2, (0.3 + Math.sin(u * Math.PI) * 1.4) * this.vs, gp.z + Math.sin(a) * u * 4.2), { color: i % 2 ? K.b : K.a, width: 0.35, sweep: 0.3, len: 0.5, n: 20 }); }
      this.hdBurst(ip, ['#ffffff', K.c, K.a, K.b], 140, [5, 13], { gravity: -7 });
      this.spikes(gp, { count: 14, r0: 1, r1: 3, h: [0.7, 1.4], width: 0.22, dur: 1.4, mat: new THREE.MeshStandardMaterial({ color: '#bfe0ff', emissive: '#3a7ae0', emissiveIntensity: 0.6, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.85 }) });
      this.debris(V(gp.x, 0.3, gp.z), { count: 18, speed: [4, 9], color: '#5a6a7a', glow: K.a }); this.cracks(gp, K.a, 7, 3);
      if (c.flash) c.flash('#dff0ff', 0.14);
      this.light(V(gp.x, 1.5, gp.z), K.a, 9, 0.6, 10); this.impact(c, ip, 3, K.c);
      for (const [tt, i] of this.inRadius(c, gp, 3)) c.hit(i, { mult: 4.5 });
    });
    this.after(1.1, () => {
      this.hdRing(gp, K.c, 1, 6, 0.6, { opacity: 0.8 });
      for (const [tt, i] of this.inRadius(c, gp, 3.6)) c.hit(i, { mult: 1.5, knock: 1.4 });
      this.impact(c, V(gp.x, 1, gp.z), 2, K.c);
    });
    this.after(1.25, () => this.anim(0.45, (k) => L.traverse((m) => { if (m.material) { if (m.material.uniforms) m.material.uniforms.opacity.value = 1 - k; else m.material.opacity = 1 - k; } }), () => { tipGeo.dispose(); this.hdRemove(L); }));
    return 2.3;
  },


  /* ================= ชิ้นส่วนใหม่ v0.35 (ใช้โดย Wizard) ================= */
  // หอก/ดาบแสง: แกนลำแสง + ปลายเพชร + ออร่า — คืน group (แกน +Y ชี้ปลาย)
  lance2(color, core = '#ffffff', len = 2.2, r = 0.1) {
    if (!this.geo.beamCyl) this.geo.beamCyl = new THREE.CylinderGeometry(1, 1, 1, 28, 6, true).translate(0, 0.5, 0);
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(this.geo.beamCyl, beamMat(core, this.gain)); shaft.scale.set(r, len, r); shaft.material.uniforms.speed.value = -3;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 2.2, len * 0.3, 4), this.hdMat('#ffffff', { map: null })); tip.position.y = len + len * 0.12; tip.userData.own = true;
    const glow = new THREE.Sprite(this.hdSpriteMat(T.dot(), color, 0.8)); glow.scale.set(r * 9, len * 1.3, 1); glow.position.y = len * 0.55;
    g.add(shaft, tip, glow); this.hdAdd(g);
    g.userData.tick = (t) => { shaft.material.uniforms.time.value = t; };
    g.userData.fade = (k) => { shaft.material.uniforms.opacity.value = 1 - k; tip.material.opacity = 1 - k; glow.material.opacity = 0.8 * (1 - k); };
    return g;
  },
  // หันแกน +Y ของ group ไปตามทิศ dir
  aim(g, dir) { g.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize()); },
  /* ================= Wizard · จอมเวทดารา ================= */
  // ดาบเวทโคจร: วงเวท 6 วงเปิดด้านหลัง ดาบแสงโผล่โคจร → ชี้ไม้เท้า ดาบพุ่งทีละเล่ม
  fx_arcane_blades(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const W = PAL.wizard, p = c.caster.pos.clone(), f = c.caster.facing.clone(), side = V(f.z, 0, -f.x), ch = V(p.x, 1.2 * this.vs, p.z);
    c.anim('castHold');
    const blades = [];
    for (let n = 0; n < 6; n++) {
      const sp = ch.clone().addScaledVector(f, -1.3).addScaledVector(side, (n - 2.5) * 0.7).add(V(0, (n % 2) * 0.6 - 0.2, 0));
      this.sigil2(sp, 'wizard', W.a, W.b, 1.1, 0.9, { draw: 0.15, spin: 3, face: f, y: sp.y, opacity: 0.9 });
      const B = this.lance2(W.a, W.c, 1.4, 0.07); B.position.copy(sp); this.aim(B, f); B.visible = false; blades.push({ B, sp, hit: false });
      this.after(0.1 + n * 0.05, () => { B.visible = true; this.hdFlash(sp, W.c, 1, 0.25, T.star()); });
    }
    this.anim(1.2, (k, dt, tt) => { blades.forEach((b, n) => { if (b.hit) return; b.B.position.copy(b.sp).add(V(0, Math.sin(tt * 4 + n) * 0.08, 0)).addScaledVector(f, Math.min(0.5, tt)); b.B.userData.tick(tt); }); });
    for (let n = 0; n < 6; n++) this.after(0.4 + n * 0.11, () => {
      const b = blades[n]; b.hit = true; c.anim('cast');
      const tp = this.hitPos(t), a = b.B.position.clone(), d = tp.clone().sub(a), dir = d.clone().setY(0).normalize(), len = d.length();
      this.aim(b.B, d); const cur = a.clone();
      this.trail(() => cur, { color: W.a, width: 0.35, dur: 0.35, n: 16 });
      this.anim(0.12, (k, dt, tt) => { cur.copy(a).lerp(tp, easeIn(k)); b.B.position.copy(cur); b.B.userData.tick(tt); });
      this.after(0.12, () => {
        this.hdFlash(tp, n === 5 ? '#ffffff' : W.c, n === 5 ? 3 : 1.6, 0.3, T.star()); this.hdFlash(tp, W.a, 2.2, 0.35);
        this.hdBurst(tp, ['#ffffff', W.c, W.a], 16 + n * 3, [2, 6], { gravity: -4, life: [0.2, 0.45] });
        for (const [tt, i] of this.lineTargets(c, a, dir, len + 0.6, 0.8)) c.hit(i, { mult: 1, hitIndex: n, total: 6 });
        if (n === 5) { this.sigil2(t.pos, 'wizard', W.b, W.a, 3, 0.6, { draw: 0.1, spin: 4 }); this.hdRing(t.pos, W.a, 0.3, 2.6, 0.45); if (c.flash) c.flash('#e8d8ff', 0.08); }
        this.impact(c, tp, n === 5 ? 2 : 1, W.c);
        this.anim(0.2, (k) => b.B.userData.fade(k), () => this.hdRemove(b.B));
      });
    });
    this.light(ch, W.a, 5, 1.0, 7);
    return 1.4;
  },

  // หลุมแรงโน้มถ่วง: ทรงกลมมืดขอบแสง ดูดศัตรูเข้าหาจุดกลาง 4 ระลอก → ยุบตัวแผ่คลื่น
  fx_gravity_well(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const W = PAL.wizard, gp = V(t.pos.x, 0, t.pos.z), ip = V(gp.x, 1.3, gp.z);
    c.anim('cast');
    this.sigil2(gp, 'wizard', W.a, '#4a2a8a', 6.5, 2.0, { draw: 0.3, spin: -1.2 });
    const core = this.hdAdd(new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: '#06030f', transparent: true, opacity: 0, depthTest: false, depthWrite: false }))); core.position.copy(ip); core.renderOrder = 25;
    const rim = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.ring(), W.b, 1))); rim.position.copy(ip); rim.renderOrder = 26;
    const glow = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.dot(), W.a, 0.6))); glow.position.copy(ip); glow.renderOrder = 24;
    this.anim(1.55, (k, dt, tt) => {
      const g = easeOut(Math.min(1, tt / 0.3)), r = 0.9 * g * (1 + 0.06 * Math.sin(tt * 18));
      core.scale.setScalar(r); core.material.opacity = 0.95 * g; rim.scale.setScalar(r * 2.6); rim.material.rotation += dt * 2; glow.scale.setScalar(r * 4.5);
      if (tt > 0.3) { c.pull && c.pull(gp, 3, 5 * dt); if (c.aberrate && Math.random() < 0.3) c.aberrate(0.25); }
      if (Math.random() < 0.8) { const a = rand(0, TAU), rr = rand(2.5, 3.5); this.streak((u) => V(gp.x + Math.cos(a) * rr * (1 - u), 0.2 + u * 1.1, gp.z + Math.sin(a) * rr * (1 - u)), { color: Math.random() < 0.5 ? W.a : W.b, width: 0.12, sweep: 0.25, len: 0.5, n: 10, opacity: 0.8 }); }
    });
    for (let n = 0; n < 4; n++) this.after(0.5 + n * 0.3, () => {
      this.hdRing(gp, W.a, 3.2, 0.4, 0.3, { opacity: 0.7 });
      for (const [tt, i] of this.inRadius(c, gp, 3)) { this.hdFlash(this.hitPos(tt), W.c, 0.9, 0.2); c.hit(i, { mult: 1, hitIndex: n, total: 5 }); }
      this.impact(c, ip, 1, W.c);
    });
    // ยุบตัว → ระเบิดคลื่น
    this.after(1.55, () => {
      this.anim(0.12, (k) => { const r = 0.9 * (1 - easeIn(k)); core.scale.setScalar(Math.max(0.01, r)); rim.scale.setScalar(r * 2.6 + 0.1); glow.scale.setScalar(r * 4.5 + 0.1); }, () => { this.hdRemove(core); this.hdRemove(rim); this.hdRemove(glow); });
      if (c.hitstop) c.hitstop(0.12);
    });
    this.after(1.68, () => {
      this.hdFlash(ip, '#ffffff', 5, 0.3); this.hdFlash(ip, W.a, 9, 0.7, T.dot(), 0.6); this.hdFlash(ip, W.b, 4, 0.4, T.star());
      for (let i = 0; i < 3; i++) this.hdRing(gp, i % 2 ? W.b : W.c, 0.3, 3.4 + i, 0.45 + i * 0.1, { opacity: 0.9 - i * 0.2 });
      this.hdRing(gp, W.a, 0.3, 3, 0.5, { y: 1.3, face: V(0, 1, 0) });
      this.hdBurst(ip, ['#ffffff', W.c, W.a, W.b], 90, [4, 10], { gravity: -5 });
      this.cracks(gp, W.a, 5, 2.4); if (c.flash) c.flash('#e0d0ff', 0.14);
      this.light(ip, W.a, 8, 0.5, 9); this.impact(c, ip, 3, W.c);
      for (const [tt, i] of this.inRadius(c, gp, 3)) c.hit(i, { mult: 3.3, slow: { pct: 0.4, secs: 3 }, hitIndex: 4, total: 5 });
    });
    return 2.0;
  },

  // รอยแยกกาลเวลา: ดีดนิ้ว นาฬิกาแสงใต้ศัตรู เวลาหยุด → ดีดอีกครั้ง รอยร้าวแตกทั่ววง
  fx_chrono_rift(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const W = PAL.wizard, gp = V(t.pos.x, 0, t.pos.z), ip = V(gp.x, 1.0, gp.z), B = '#9ae8ff';
    // 1 ดีดนิ้ว
    c.anim('cast'); this.hdFlash(this.hand(c), '#ffffff', 1.2, 0.2, T.star());
    this.sigil2(gp, 'wizard', B, W.a, 6.2, 1.3, { draw: 0.3, spin: 0 });
    // เข็มนาฬิกา 2 เข็มหมุนย้อน
    const hands = [[2.4, 0.18, 1.5], [1.7, 0.26, 12]].map(([len, w, sp]) => { const m = this.hdAdd(new THREE.Mesh(this.geo.plane, this.hdMat(B, { map: T.dot() }))); m.rotation.x = -Math.PI / 2; m.position.set(gp.x, 0.1, gp.z); m.renderOrder = 25; m.userData = { len, w, sp }; return m; });
    this.anim(1.1, (k, dt, tt) => { for (const m of hands) { const a = -tt * m.userData.sp; m.rotation.z = a; m.position.set(gp.x + Math.cos(a) * m.userData.len / 2, 0.1, gp.z + Math.sin(a) * m.userData.len / 2); m.scale.set(m.userData.len, m.userData.w, 1); m.material.opacity = k > 0.9 ? (1 - k) / 0.1 : 1; } }, () => hands.forEach((m) => this.hdRemove(m)));
    // 2 เวลาหยุด: โดมแสงฟ้าใส ศัตรูในวงแช่แข็ง
    this.after(0.3, () => {
      this.dome(gp, B, 2.9, 0.85, { grow: 0.2, map: T.hex(), rep: [8, 4] });
      this.hdRing(gp, '#ffffff', 0.3, 3, 0.4); this.hdFlash(ip, B, 4, 0.4, T.dot(), 0.5);
      if (c.aberrate) c.aberrate(0.4); if (c.hitstop) c.hitstop(0.06);
      for (const [tt, i] of this.inRadius(c, gp, 2.8)) { this.hdFlash(this.hitPos(tt), '#ffffff', 1.2, 0.3, T.star()); c.freeze && c.freeze(i); }
      this.hdBurst(ip, ['#ffffff', B], 24, [0.5, 1.5], { sys: 'hdStars', gravity: 0, life: [0.5, 0.9], size: [0.12, 0.25] });
    });
    // 3 ดีดนิ้วครั้งที่สอง: รอยร้าวแสง → แตก
    this.after(1.0, () => {
      c.anim('cast'); this.hdFlash(this.hand(c), '#ffffff', 1.2, 0.2, T.star());
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + rand(-0.2, 0.2); this.bolt(ip, V(gp.x + Math.cos(a) * 2.9, rand(0.1, 2.2), gp.z + Math.sin(a) * 2.9), { color: '#ffffff', core: B, width: 0.14, dur: 0.3, jag: 0.25, n: 10 }); }
    });
    this.after(1.2, () => {
      if (c.hitstop) c.hitstop(0.12); if (c.flash) c.flash('#dff6ff', 0.3); if (c.aberrate) c.aberrate(0.8);
      this.hdFlash(ip, '#ffffff', 6, 0.35); this.hdFlash(ip, B, 10, 0.7, T.dot(), 0.6);
      for (let i = 0; i < 3; i++) this.hdRing(gp, i % 2 ? W.a : B, 0.3, 3.2 + i * 0.8, 0.45 + i * 0.1);
      this.hdBurst(ip, ['#ffffff', B, W.c], 80, [3, 9], { sys: 'hdStars', gravity: -6, size: [0.15, 0.35], life: [0.4, 0.9] });
      this.hdBurst(ip, ['#ffffff', B], 50, [4, 10], { gravity: -8 });
      this.cracks(gp, B, 5.5, 2.4); this.light(ip, B, 8, 0.5, 9); this.impact(c, ip, 3, '#ffffff');
      for (const [tt, i] of this.inRadius(c, gp, 2.8)) { this.hdFlash(this.hitPos(tt), B, 1.8, 0.3, T.star()); c.hit(i, { mult: 2.2 }); }
    });
    return 1.6;
  },

  // ร่างดารา: วงเวทซ้อน 3 ชั้นลอยผ่านร่าง ดาวระยิบ ลอยตัว
  fx_astral_form(c) {
    const W = PAL.wizard, p = c.caster.pos.clone(), ch = V(p.x, 1.0 * this.vs, p.z);
    c.anim('castHold');
    for (let i = 0; i < 3; i++) this.after(i * 0.22, () => this.sigil2(p, 'wizard', i % 2 ? W.b : W.a, W.c, 3.2 - i * 0.5, 0.9, { draw: 0.15, spin: 2 + i, y: 0.05, opacity: 0.9 }));
    for (let i = 0; i < 3; i++) this.after(i * 0.22, () => { const s = this.sigil2(p, 'wizard', W.a, W.b, 2.6 - i * 0.4, 0.9, { draw: 0.1, spin: -3, y: 0.05 }); this.anim(0.9, (k) => { s.position.y = 0.05 + easeOut(k) * 2.6 * this.vs; }); });
    for (let s = 0; s < 3; s++) this.streak((u) => { const a = u * TAU * 2 + s * 2.1, r = 1.2; return V(p.x + Math.cos(a) * r, (0.1 + u * 2.2) * this.vs, p.z + Math.sin(a) * r); }, { color: s === 1 ? W.b : W.a, width: 0.22, sweep: 0.9, len: 0.4, n: 44 });
    this.after(0.85, () => {
      this.hdFlash(ch, '#ffffff', 3.5, 0.4); this.hdFlash(ch, W.a, 5, 0.6, T.dot(), 0.6); this.hdRing(p, W.c, 0.3, 3, 0.5);
      this.hdBurst(ch, ['#ffffff', W.c, W.b], 40, [1, 3], { sys: 'hdStars', gravity: 0.3, life: [0.7, 1.3], size: [0.18, 0.34] });
      c.buff('ร่างดารา ▲');
    });
    this.light(ch, W.a, 5, 1.4, 6);
    return 1.3;
  },

  // มหานวดารา (ไม้ตาย): ดาวก่อตัวเหนือเป้า ดูดศัตรู → ยุบเป็นจุดดำ → ระเบิดเต็มจอ
  fx_supernova(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const W = PAL.wizard, gp = V(t.pos.x, 0, t.pos.z), sp = V(gp.x, 2.6, gp.z), p = c.caster.pos.clone();
    c.anim('castHold'); if (c.sky) c.sky(0.6, 3.4); c.lift && c.lift(1.4, 1.0, 1.8); this.lines(c, 0.35, 2.0);
    this.sigil2(p, 'wizard', W.a, W.b, 4, 2.6, { draw: 0.4, spin: 1 });
    this.sigil2(gp, 'wizard', W.b, W.a, 9, 2.8, { draw: 0.5, spin: -0.8 });
    this.sigil2(gp, 'wizard', '#ffffff', W.a, 6, 2.2, { draw: 0.4, spin: 1.2, y: 7, face: V(0, -1, 0), opacity: 0.7 });
    // ดาว
    const star = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.dot(), '#ffffff', 1))); star.position.copy(sp); star.renderOrder = 27;
    const halo = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.dot(), W.a, 0.7))); halo.position.copy(sp); halo.renderOrder = 26;
    const rings = [0, 1, 2].map((i) => { const m = this.hdAdd(new THREE.Mesh(this.geo.plane, this.hdMat(i ? W.b : W.c, { map: T.ring(), opacity: 0.9 }))); m.position.copy(sp); m.renderOrder = 26; m.userData.ax = V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(); return m; });
    this.anim(1.75, (k, dt, tt) => {
      const g = 0.4 + 2.4 * easeIO(Math.min(1, tt / 1.5)) * (1 + 0.05 * Math.sin(tt * 20));
      star.scale.setScalar(g); halo.scale.setScalar(g * 2.2);
      rings.forEach((m, i) => { m.scale.setScalar(g * (1.6 + i * 0.5)); m.rotateOnAxis(m.userData.ax, dt * (1.5 + i)); });
      if (tt > 0.5) { c.pull && c.pull(gp, 4, 4 * dt); if (c.aberrate && Math.random() < 0.3) c.aberrate(0.3); }
      if (Math.random() < 0.9) { const a = rand(0, TAU), rr = rand(3, 5); this.streak((u) => V(gp.x + Math.cos(a) * rr * (1 - u), 0.2 + u * 2.4, gp.z + Math.sin(a) * rr * (1 - u)), { color: Math.random() < 0.5 ? W.a : W.c, width: 0.14, sweep: 0.3, len: 0.5, n: 10, opacity: 0.8 }); }
    });
    for (let n = 0; n < 6; n++) this.after(0.55 + n * 0.2, () => {
      this.hdRing(gp, n % 2 ? W.b : W.a, 4.4, 0.4, 0.3, { opacity: 0.7 });
      for (const [tt, i] of this.inRadius(c, gp, 4)) { this.hdFlash(this.hitPos(tt), W.c, 0.9, 0.2); c.hit(i, { mult: 0.65, hitIndex: n, total: 7 }); }
      this.impact(c, sp, 1, W.c);
    });
    // ยุบเป็นจุดดำ
    this.after(1.75, () => {
      const dark = this.hdAdd(new THREE.Mesh(this.geo.sphere, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 1, depthTest: false, depthWrite: false }))); dark.position.copy(sp); dark.renderOrder = 28;
      this.anim(0.22, (k) => { const r = 2.8 * (1 - easeIn(k)); star.scale.setScalar(Math.max(0.05, r)); halo.scale.setScalar(Math.max(0.1, r * 2.2)); rings.forEach((m) => m.scale.setScalar(Math.max(0.05, r * 1.8))); dark.scale.setScalar(0.1 + k * 0.5); }, () => { [star, halo, dark, ...rings].forEach((m) => this.hdRemove(m)); });
      if (c.hitstop) c.hitstop(0.22); this.hdRing(gp, '#ffffff', 5, 0.3, 0.25, { y: 2.6, face: V(0, 1, 0) });
    });
    // ระเบิด
    this.after(2.0, () => {
      if (c.flash) c.flash('#f4ecff', 1.0); if (c.aberrate) c.aberrate(1.2); if (c.hitstop) c.hitstop(0.1);
      this.hdFlash(sp, '#ffffff', 12, 0.5); this.hdFlash(sp, W.a, 20, 1.0, T.dot(), 0.6); this.hdFlash(sp, W.b, 9, 0.6, T.star());
      for (let i = 0; i < 4; i++) this.hdRing(gp, i % 2 ? W.b : '#ffffff', 0.5, 4.5 + i * 1.6, 0.55 + i * 0.15, { opacity: 0.9 - i * 0.15 });
      for (let i = 0; i < 3; i++) this.hdRing(gp, W.c, 0.5, 6 + i, 0.6 + i * 0.1, { y: 2.6, face: V(rand(-1, 1), 1, rand(-1, 1)).normalize(), opacity: 0.6 });
      this.beam2(gp, W.a, 2.0, 7, 0.9, { grow: 0.05 }); this.beam2(gp, '#ffffff', 0.8, 7, 0.7, { grow: 0.04 });
      this.hdBurst(sp, ['#ffffff', W.c, W.a, W.b], 180, [5, 14], { gravity: -6 });
      this.hdBurst(sp, ['#ffffff', W.c], 60, [2, 6], { sys: 'hdStars', gravity: -1, life: [0.8, 1.5], size: [0.2, 0.4] });
      this.debris(V(gp.x, 0.3, gp.z), { count: 20, speed: [4, 9], color: '#3a2a5a', glow: W.a }); this.cracks(gp, W.a, 9, 3.2);
      this.light(sp, W.a, 12, 0.7, 14); this.impact(c, sp, 3, '#ffffff');
      for (const [tt, i] of this.inRadius(c, gp, 4.5)) c.hit(i, { mult: 5, knock: 1.5, hitIndex: 6, total: 7 });
    });
    return 2.9;
  },

  /* ================= Hunter · มรกตแห่งลม + ทอง ================= */
  fx_falcon_assault(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const H = PAL.hunter; c.anim('cast');
    const B = this.hawk2(H.a, 1.25), start = c.caster.pos.clone().add(V(0, 2.4 * this.vs, 0)).addScaledVector(c.caster.facing, -0.4);
    B.g.position.copy(start);
    this.trail(() => B.g.position, { color: H.a, width: 0.7, dur: 1.4, n: 26 });
    this.trail(() => B.g.position.clone().add(V(0, 0.15, 0)), { color: H.b, width: 0.25, dur: 1.4, n: 26 });
    const dur = 1.25;
    this.anim(dur, (k, dt, tt) => {
      B.flap(tt);
      const tp = t.pos, seg = Math.min(2, Math.floor(k * 3)), kk = (k * 3) % 1, a = seg * 2.1 + 0.6;
      const hi = V(tp.x + Math.cos(a) * 2.4, 2.8 * this.vs, tp.z + Math.sin(a) * 2.4), lo = V(tp.x, 0.7 * this.vs, tp.z);
      const pos = kk < 0.55 ? (seg === 0 ? start.clone().lerp(hi, easeIO(kk / 0.55)) : B.g.position.clone().lerp(hi, 0.22)) : hi.clone().lerp(lo, easeIn((kk - 0.55) / 0.45));
      const prev = B.g.position.clone(); B.g.position.copy(pos);
      if (pos.distanceToSquared(prev) > 1e-6) B.g.lookAt(pos.clone().add(pos.clone().sub(prev)));
      if (Math.random() < 0.35) this.hdBurst(pos, ['#ffffff', H.c], 1, [0.3, 0.8], { sys: 'hdFeathers', gravity: -1, life: [0.6, 1], size: [0.3, 0.5] });
    }, () => this.hdRemove(B.g));
    for (let n = 0; n < 3; n++) this.after(((n + 1) / 3) * dur - 0.02, () => {
      const tp = this.hitPos(t);
      this.sigil2(t.pos, 'hunter', H.a, H.b, 2.6, 0.6, { draw: 0.12, spin: 3 });
      this.hdFlash(tp, H.a, 2.6, 0.35); this.hdFlash(tp, '#ffffff', 1.5, 0.22, T.star());
      for (let s = 0; s < 3; s++) { const a = rand(0, TAU); this.streak((u) => tp.clone().add(V(Math.cos(a) * (u - 0.5) * 2.2, (u - 0.5) * 1.2 * (s - 1), Math.sin(a) * (u - 0.5) * 2.2)), { color: s === 1 ? '#ffffff' : H.a, width: 0.22, sweep: 0.1, len: 0.6, n: 10 }); }
      this.hdBurst(tp, ['#ffffff', H.c], 10, [1.5, 3.5], { sys: 'hdFeathers', gravity: -1.5, life: [0.6, 1.1], size: [0.3, 0.5] });
      for (const [tt, i] of this.inRadius(c, t.pos, 1.4)) c.hit(i, { mult: 1 });
      this.impact(c, tp, n === 2 ? 2 : 1, H.a);
    });
    return 1.5;
  },

  fx_blast_trap(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const gp = V(t.pos.x, 0, t.pos.z); c.anim('shoot');
    const pod = this.hdAdd(new THREE.Sprite(this.hdSpriteMat(T.star(), '#ffb347'))); pod.scale.setScalar(0.7);
    const from = this.hand(c), cur = from.clone();
    this.trail(() => cur, { color: '#ffb347', width: 0.25, dur: 0.55, n: 14 });
    this.anim(0.3, (k) => { cur.lerpVectors(from, V(gp.x, 0.15, gp.z), k); cur.y += Math.sin(k * Math.PI) * 1.4; pod.position.copy(cur); pod.material.rotation += 0.3; });
    this.after(0.3, () => this.sigil2(gp, 'hunter', '#ffb347', '#ff3a1a', 4.4, 0.9, { draw: 0.25, spin: 4 }));
    for (let b = 0; b < 3; b++) this.after(0.36 + b * 0.1, () => { this.hdFlash(V(gp.x, 0.3, gp.z), '#ff3a1a', 1.6 + b * 0.4, 0.12); this.hdRing(gp, '#ff6a2a', 0.2, 1 + b * 0.3, 0.15); });
    this.after(0.68, () => {
      this.hdRemove(pod);
      this.flameCol(gp, { r: 2.2, h: 3.2, dur: 0.8, grow: 0.08, cone: true, twist: 7, speed: 3.5 });
      this.dome(gp, '#ff8a3a', 2.4, 0.5, { grow: 0.1, rep: [5, 3] });
      this.hdFlash(V(gp.x, 0.6, gp.z), '#fff1b0', 4.5, 0.35); this.hdFlash(V(gp.x, 0.6, gp.z), '#ff5a1a', 7, 0.7, T.dot(), 0.6);
      this.hdRing(gp, '#ffd27a', 0.3, 3.2, 0.5);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; this.streak((u) => V(gp.x + Math.cos(a) * u * 3, (0.3 + Math.sin(u * Math.PI) * 1.8) * this.vs, gp.z + Math.sin(a) * u * 3), { color: i % 2 ? '#ffb347' : '#ff5a1a', width: 0.22, sweep: 0.35, len: 0.5, n: 16 }); }
      this.hdBurst(V(gp.x, 0.5, gp.z), ['#fff1b0', '#ffb347', '#ff6a2a'], 90, [4, 10], { gravity: -8, colorEnd: '#a8201a' });
      this.decal(gp, TX.scorch(), 4.4, 2.4); this.light(V(gp.x, 1, gp.z), '#ff6a2a', 7, 0.4, 8);
      this.impact(c, V(gp.x, 0.6, gp.z), 2, '#ffb347');
      for (const [tt, i] of this.inRadius(c, gp, 2.4)) this.hitStun(c, tt, i, { mult: 2.2, stun: 2, knock: 1 });
    });
    return 1.3;
  },

  fx_split_volley(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const H = PAL.hunter; c.anim('shoot');
    const hand = this.hand(c), f = c.caster.facing, side = V(f.z, 0, -f.x);
    const near = c.targets.map((tt, i) => [tt, i]).filter(([tt, i]) => i !== c.main && Math.hypot(tt.pos.x - t.pos.x, tt.pos.z - t.pos.z) <= 4).sort((a, b) => Math.hypot(a[0].pos.x - t.pos.x, a[0].pos.z - t.pos.z) - Math.hypot(b[0].pos.x - t.pos.x, b[0].pos.z - t.pos.z));
    const plan = [c.main, ...near.slice(0, 6).map((x) => x[1])];
    while (plan.length < 7) plan.push(plan.length < 3 ? c.main : -1);   // เป้าน้อย: เข้าเป้าหลักได้ 3 ดอก ที่เหลือปักพื้น
    this.sigil2(c.caster.pos, 'hunter', H.a, H.b, 2.6, 0.8, { draw: 0.18, spin: 2 });
    this.hdFlash(hand, H.b, 2, 0.3); this.hdRing(hand, H.b, 0.2, 1.2, 0.3, { face: f, y: hand.y });
    plan.forEach((idx, k) => this.after(0.03 + k * 0.03, () => {
      const tt = idx >= 0 ? c.targets[idx] : null, fan = (k - 3) * 0.55;
      const end = tt ? this.hitPos(tt) : t.pos.clone().addScaledVector(side, fan * 1.6).add(V(rand(-0.5, 0.5), 0.1, rand(-0.5, 0.5)));
      const mid = hand.clone().lerp(end, 0.5).addScaledVector(side, fan * 1.4).add(V(0, 1 + Math.abs(fan) * 0.4, 0));
      const curve = (u) => { const a = hand.clone().lerp(mid, u), b = mid.clone().lerp(end, u); return a.lerp(b, u); };
      this.streak(curve, { color: k % 2 ? H.b : H.a, width: 0.2, sweep: 0.2, len: 0.4, n: 24 });
      this.after(0.2, () => {
        this.hdFlash(end, k % 2 ? H.b : H.a, 1.8, 0.25); this.hdFlash(end, '#ffffff', 1, 0.18, T.star());
        this.hdBurst(end, ['#ffffff', H.c], 8, [2, 4], { gravity: -6, life: [0.2, 0.4] });
        if (tt) c.hit(idx, { mult: 1, hitIndex: k, total: 7 });
      });
    }));
    this.after(0.3, () => this.impact(c, this.hitPos(t), 1, H.b));
    return 0.8;
  },

  fx_predator_focus(c) {
    const H = PAL.hunter, p = c.caster.pos.clone(), head = V(p.x, 2.4 * this.vs, p.z);
    c.anim('cast');
    this.sigil2(p, 'hunter', H.a, H.b, 3.6, 1.5, { draw: 0.4, spin: 1.4 });
    for (let s = 0; s < 3; s++) this.streak((u) => { const a = u * TAU * 1.4 + (s / 3) * TAU, r = 1.3 - u * 0.6; return V(p.x + Math.cos(a) * r, (0.1 + u * 2.4) * this.vs, p.z + Math.sin(a) * r); }, { color: s === 1 ? H.b : H.a, width: 0.25, sweep: 0.7, len: 0.45, n: 40 });
    for (let i = 0; i < 3; i++) this.after(0.2 + i * 0.16, () => this.hdRing(p, H.a, 0.3, 2.2 + i * 0.5, 0.45, { y: 1 * this.vs, opacity: 0.7 }));
    this.after(0.55, () => {
      this.sigil2(head, 'hunter', '#ffffff', H.a, 1.3, 0.9, { draw: 0.15, spin: -3, face: this.camPos().clone().sub(head).normalize(), y: head.y });
      this.hdFlash(head, H.a, 2.6, 0.4); c.buff('ล็อกเป้า ▲');
    });
    this.light(head, H.a, 4, 1.4, 6);
    return 1.4;
  },

  fx_talon_tempest(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const H = PAL.hunter, gp = V(t.pos.x, 0, t.pos.z);
    c.anim('castHold'); this.lines(c, 0.6, 1.8);
    this.sigil2(gp, 'hunter', H.a, H.b, 7, 2.6, { draw: 0.4, spin: 2 });
    this.vortex(gp, H.a, 3.2, 5, 2.1, { spin: 7 });
    this.vortex(gp, '#ffffff', 1.8, 6, 2.0, { spin: -9 });
    const flock = Array.from({ length: 12 }, (_, i) => { const B = this.hawk2(i % 3 ? H.a : H.b, 1.05); B.a = (i / 12) * TAU; B.r = 2.4 + (i % 2) * 0.7; B.y = 0.8 + (i % 4) * 0.55; if (i % 2 === 0) this.trail(() => B.g.position, { color: i % 3 ? H.a : H.b, width: 0.45, dur: 2.1, n: 18 }); return B; });
    this.anim(1.75, (k, dt, tt) => flock.forEach((B, i) => {
      B.flap(tt + i); const a = B.a + tt * (4.5 + (i % 3)), r = B.r * (1 - 0.15 * Math.sin(tt * 3 + i)), y = (B.y + Math.sin(tt * 4 + i) * 0.4 + k * 0.9) * this.vs;
      const prev = B.g.position.clone(); B.g.position.set(gp.x + Math.cos(a) * r, y, gp.z + Math.sin(a) * r);
      if (tt > 0) B.g.lookAt(B.g.position.clone().add(B.g.position.clone().sub(prev)));
    }));
    for (let h = 0; h < 10; h++) this.after(0.15 + h * 0.15, () => {
      for (const [tt, i] of this.inRadius(c, gp, 3.2)) { const tp = this.hitPos(tt); this.hdFlash(tp, H.c, 1.3, 0.18, T.star()); c.hit(i, { mult: 1, hitIndex: h, total: 10 }); }
      if (h % 3 === 0) this.impact(c, V(gp.x, 1, gp.z), 1, H.a);
    });
    this.after(1.75, () => flock.forEach((B) => { const from = B.g.position.clone(); this.anim(0.22, (k) => B.g.position.copy(from).lerp(V(gp.x, 0.5, gp.z), easeIn(k)), () => this.hdRemove(B.g)); }));
    this.after(1.97, () => {
      const ip = V(gp.x, 0.7, gp.z);
      this.hdFlash(ip, '#ffffff', 6, 0.35); this.hdFlash(ip, H.a, 11, 0.8, T.dot(), 0.6); this.hdFlash(ip, H.b, 5, 0.5, T.star());
      this.beam2(gp, H.a, 1.6, 10, 0.7, { grow: 0.06 });
      for (let i = 0; i < 3; i++) this.hdRing(gp, [H.b, H.a, '#ffffff'][i], 0.4, 4 + i * 1.3, 0.55 + i * 0.12);
      this.hdBurst(ip, ['#ffffff', H.c, '#ffe08a'], 70, [3, 8], { sys: 'hdFeathers', gravity: -2, life: [0.9, 1.6], size: [0.35, 0.6] });
      this.hdBurst(ip, ['#ffffff', H.a], 80, [5, 12], { gravity: -6 });
      this.light(V(gp.x, 1.5, gp.z), H.a, 8, 0.6, 9); this.impact(c, ip, 3, H.a);
      for (const [tt, i] of this.inRadius(c, gp, 3.2)) c.hit(i, { mult: 3.5, knock: 1.2 });
    });
    return 2.5;
  },

  /* ================= Priest · ทองอ่อน + ฟ้าสวรรค์ ================= */
  fx_grand_heal(c) {
    const P = PAL.priest, p = c.caster.pos.clone(), ch = V(p.x, 1 * this.vs, p.z);
    c.anim('cast');
    this.sigil2(p, 'priest', '#9affc0', P.a, 4.2, 1.8, { draw: 0.4, spin: 0.7 });
    this.beam2(p, '#c8ffd8', 1.1, 10, 1.6, { fromSky: true, grow: 0.35, speed: -1.2 });
    // ดอกบัวแสงสองชั้นบาน
    const petals = [];
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 10; i++) {
      const piv = this.hdAdd(new THREE.Group()); piv.position.set(p.x, 0.08, p.z); piv.rotation.y = (i / 10) * TAU + layer * 0.31;
      const m = new THREE.Mesh(this.geo.plane, this.hdMat(layer ? '#fff6c8' : '#9affc0', { map: T.feather(), opacity: 0 }));
      m.position.set(0, 0.55, 0.5 + layer * 0.3); m.scale.set(0.8, 1.5 - layer * 0.35, 1); piv.add(m); petals.push({ piv, m, layer });
    }
    this.anim(1.7, (k, dt) => petals.forEach((Q) => { const o = easeOut(Math.min(1, k * 2.4)); Q.m.rotation.x = -0.15 - o * (0.95 + Q.layer * 0.35); Q.m.material.opacity = (k > 0.75 ? (1 - k) / 0.25 : 1) * 0.85 * o; Q.piv.rotation.y += dt * 0.4; }), () => petals.forEach((Q) => this.hdRemove(Q.piv)));
    for (let s = 0; s < 4; s++) this.streak((u) => { const a = u * TAU + (s / 4) * TAU, r = 1.4 * (1 - u * 0.5); return V(p.x + Math.cos(a) * r, (0.1 + u * 2.6) * this.vs, p.z + Math.sin(a) * r); }, { color: s % 2 ? '#9affc0' : P.c, width: 0.2, sweep: 0.8, len: 0.45, n: 36 });
    this.after(0.4, () => {
      this.hdFlash(ch, '#9affc0', 4, 0.5); this.hdFlash(ch, '#ffffff', 2.4, 0.4, T.star());
      this.hdRing(p, '#c8ffd8', 0.3, 3.2, 0.6);
      this.hdBurst(V(p.x, 0.3, p.z), ['#ffffff', '#c8ffd8', P.c], 40, [0.5, 1.5], { gravity: 2.5, life: [0.9, 1.6], size: [0.12, 0.24], drag: 0.6 });
      this.hdBurst(V(p.x, 3, p.z), ['#ffffff', P.c], 16, [0.4, 1], { sys: 'hdFeathers', gravity: -0.8, life: [1.3, 2], size: [0.3, 0.5] });
      c.heal();
    });
    this.light(ch, '#9affc0', 6, 1.6, 7);
    return 1.8;
  },

  fx_sacred_barrier(c) {
    const P = PAL.priest, p = c.caster.pos.clone(), ch = V(p.x, 0.9 * this.vs, p.z);
    c.anim('cast');
    this.sigil2(p, 'priest', P.a, P.b, 4.6, 1.9, { draw: 0.4, spin: 0.9 });
    this.dome(V(p.x, 0, p.z), P.a, 2, 1.8, { grow: 0.35, rep: [7, 3] });
    for (let s = 0; s < 3; s++) this.streak((u) => { const a = u * TAU * 1.6 + s * 2.1; return V(p.x + Math.cos(a) * 1.9, (0.3 + u * 1.8 + Math.sin(u * 9) * 0.1) * this.vs, p.z + Math.sin(a) * 1.9); }, { color: s === 1 ? P.b : P.a, width: 0.24, sweep: 1.1, len: 0.35, n: 50 });
    this.anim(1.4, (k, dt, tt) => { if (Math.random() < 0.5) { const a = tt * 5 + Math.random() * TAU; this.hdBurst(V(p.x + Math.cos(a) * 1.8, (0.3 + k * 1.8) * this.vs, p.z + Math.sin(a) * 1.8), ['#ffffff', P.c], 1, [0.1, 0.3], { sys: 'hdFeathers', gravity: 0, life: [0.7, 1.1], size: [0.3, 0.45] }); } });
    this.after(0.45, () => { this.hdFlash(ch, P.a, 4, 0.5); this.hdRing(p, P.c, 0.3, 3, 0.55); this.hdBurst(ch, ['#ffffff', P.c], 26, [1, 3], { sys: 'hdStars', gravity: 0.5, life: [0.6, 1.2], size: [0.18, 0.32] }); c.buff('ม่านแสง ▲'); });
    this.light(ch, P.a, 5, 1.8, 6);
    return 1.9;
  },

  fx_radiant_spears(c) {
    const t = c.targets[c.main]; if (!t) return 0.5;
    const P = PAL.priest, gp = V(t.pos.x, 0, t.pos.z); c.anim('cast');
    this.sigil2(gp, 'priest', P.a, P.b, 6, 1.9, { draw: 0.35, spin: 1 });
    const near = this.inRadius(c, gp, 3).map(([tt]) => tt);   // หอกแสงพุ่งหาศัตรู (ตัวเดียวโดนได้ 3 เล่ม ที่เหลือปักรอบ ๆ)
    for (let i = 0; i < 9; i++) this.after(0.12 + i * 0.08, () => {
      const a = Math.random() * TAU, r = 1.6 + Math.random() * 1.2, tg = i < near.length * 3 ? near[i % near.length] : null;
      const to = tg ? V(tg.pos.x + rand(-0.25, 0.25), 0, tg.pos.z + rand(-0.25, 0.25)) : V(gp.x + Math.cos(a) * r, 0, gp.z + Math.sin(a) * r);
      const top = to.clone().add(V(rand(-0.6, 0.6), 8, rand(-0.6, 0.6)));
      this.streak((u) => top.clone().lerp(V(to.x, 0.1, to.z), u), { color: P.a, width: 0.42, sweep: 0.2, len: 0.35, n: 14, taper: 0.4 });   // หอกแสง = ริบบิ้นพุ่งลงจากฟ้า
      this.after(0.2, () => {
        const ip = V(to.x, 0.4, to.z);
        this.hdFlash(ip, '#ffffff', 2.6, 0.3); this.hdFlash(ip, P.a, 3.6, 0.5, T.dot(), 0.7); this.hdFlash(V(to.x, 0.9, to.z), '#ffffff', 1.6, 0.3, T.star());
        this.hdRing(to, P.a, 0.2, 1.7, 0.45); this.beam2(to, P.c, 0.32, 4.5, 0.5, { grow: 0.05 });
        this.hdBurst(ip, ['#ffffff', P.c, P.a], 16, [2, 5], { gravity: -5 });
        for (const [tt, j] of this.inRadius(c, to, 0.9)) c.hit(j, { mult: 1 });
        if (i % 3 === 0) this.impact(c, to, 1, P.a);
      });
    });
    this.light(V(gp.x, 2, gp.z), P.a, 6, 1.3, 9);
    return 1.7;
  },

  fx_purge_circle(c) {
    const P = PAL.priest, p = c.caster.pos.clone();
    c.anim('cast');
    this.sigil2(p, 'priest', P.a, P.b, 7.6, 1.8, { draw: 0.3, spin: 0.6 });
    for (let w = 0; w < 3; w++) this.after(0.15 + w * 0.35, () => {
      this.hdRing(p, P.a, 0.4, 4, 0.55); this.hdRing(p, '#ffffff', 0.3, 3.4, 0.4, { opacity: 0.6 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + w * 0.4, r = 3.2; this.streak((u) => V(p.x + Math.cos(a) * r * (1 - u * 0.2), (u * 2.6) * this.vs, p.z + Math.sin(a) * r * (1 - u * 0.2)), { color: i % 2 ? P.b : P.a, width: 0.28, sweep: 0.3, len: 0.6, n: 14 }); }
      this.hdBurst(V(p.x, 0.2, p.z), ['#ffffff', P.c], 30, [0.5, 1.2], { gravity: 3, life: [0.6, 1], size: [0.1, 0.2] });
      for (const [tt, i] of this.inRadius(c, p, 3.5)) { const tp = this.hitPos(tt); this.hdFlash(tp, P.a, 1.8, 0.3); c.hit(i, { mult: 1, hitIndex: w, total: 3 }); }
      c.heal(); this.impact(c, V(p.x, 1, p.z), 1, P.a);
    });
    this.light(V(p.x, 1.2, p.z), P.a, 6, 1.4, 8);
    return 1.6;
  },

  fx_seraph_descent(c) {
    const P = PAL.priest, p = c.caster.pos.clone(), fwd = c.caster.facing;
    c.anim('castHold'); if (c.sky) c.sky(0.35, 3.6); this.lines(c, 0.5, 2);
    this.sigil2(p, 'priest', P.a, P.b, 9.5, 3, { draw: 0.6, spin: 0.4 });
    this.sigil2(p, 'priest', '#ffffff', P.a, 7, 2.6, { draw: 0.5, spin: -0.6, y: 7.5, face: V(0, -1, 0), opacity: 0.8 });
    this.beam2(p, P.a, 2.6, 13, 2.6, { fromSky: true, grow: 0.5, speed: -1 });
    // เทวทูต: ปีกนุ่ม 3 คู่ + วงแหวน + แกนแสง
    const angel = this.hdAdd(new THREE.Group()); angel.position.set(p.x, 7, p.z); angel.rotation.y = Math.atan2(fwd.x, fwd.z);
    const wings = [];
    for (const [s, sc, y, rot] of [[-1, 3.4, 0.3, 0.2], [1, 3.4, 0.3, -0.2], [-1, 2.6, -0.4, -0.25], [1, 2.6, -0.4, 0.25], [-1, 2, 1.0, 0.55], [1, 2, 1.0, -0.55]]) {
      const piv = new THREE.Group(); piv.position.y = y; angel.add(piv);
      const w = new THREE.Mesh(this.geo.plane, this.hdMat('#fff2c0', { map: T.wing(), opacity: 0 })); w.scale.set(s * sc, sc, 1); w.position.set(s * sc * 0.42, sc * 0.3, -0.2); piv.add(w);
      wings.push({ piv, w, s, rot });
    }
    const halo = new THREE.Mesh(this.geo.plane, this.hdMat('#fff6c8', { map: T.ring(), opacity: 0.95 })); halo.rotation.x = -Math.PI / 2; halo.position.y = 2; halo.scale.set(1.5, 1.5, 1); angel.add(halo);
    const body = new THREE.Sprite(this.hdSpriteMat(T.dot(), '#fff6c8', 0.95)); body.scale.set(1.8, 3.4, 1); angel.add(body);
    this.anim(2.7, (k, dt, tt) => {
      angel.position.y = (2.8 + 4.4 * (1 - easeOut(Math.min(1, tt / 0.9)))) * this.vs;
      const fo = k > 0.85 ? (1 - k) / 0.15 : 1;
      for (const W2 of wings) { W2.piv.rotation.z = W2.rot + W2.s * Math.sin(tt * 2.6) * 0.14; W2.w.material.opacity = Math.min(0.9, tt * 2) * fo; }
      halo.material.opacity = body.material.opacity = 0.95 * fo; halo.rotation.z += dt;
      if (Math.random() < 0.5) this.hdBurst(V(p.x + rand(-2.5, 2.5), angel.position.y + rand(-0.5, 1.5), p.z + rand(-2.5, 2.5)), ['#ffffff', P.c], 1, [0.2, 0.6], { sys: 'hdFeathers', gravity: -0.8, life: [1.2, 1.8], size: [0.35, 0.55] });
    }, () => this.hdRemove(angel));
    for (let s = 0; s < 4; s++) this.streak((u) => { const a = u * TAU * 1.5 + (s / 4) * TAU, r = 3 * (1 - u * 0.6); return V(p.x + Math.cos(a) * r, u * 6 * this.vs, p.z + Math.sin(a) * r); }, { color: s % 2 ? P.b : P.a, width: 0.35, sweep: 1.2, len: 0.4, n: 50 });
    for (let h = 0; h < 5; h++) this.after(0.95 + h * 0.22, () => {
      const a = (h / 5) * TAU, bp = V(p.x + Math.cos(a) * 2.4, 0, p.z + Math.sin(a) * 2.4);
      this.beam2(bp, P.c, 0.55, 9, 0.5, { fromSky: true, grow: 0.08 });
      this.hdFlash(V(bp.x, 0.6, bp.z), '#ffffff', 3, 0.35); this.hdRing(bp, P.a, 0.2, 2, 0.45);
      for (const [tt, i] of this.inRadius(c, p, 4)) c.hit(i, { mult: 1, hitIndex: h, total: 5 });
      this.impact(c, V(p.x, 1, p.z), 1, P.a);
    });
    this.after(2.15, () => {
      const ip = V(p.x, 1, p.z);
      this.hdFlash(ip, '#ffffff', 8, 0.45); this.hdFlash(ip, P.a, 15, 1, T.dot(), 0.55); this.hdFlash(V(p.x, 1.6, p.z), '#ffffff', 6, 0.5, T.star());
      for (let i = 0; i < 4; i++) this.hdRing(p, [P.c, P.a, P.b, '#ffffff'][i], 0.5, 4 + i * 1.4, 0.6 + i * 0.15);
      this.beam2(p, '#ffffff', 1.6, 16, 0.7, { grow: 0.05 });
      this.hdBurst(ip, ['#ffffff', P.c], 70, [3, 8], { sys: 'hdFeathers', gravity: -1.5, life: [1, 1.8], size: [0.35, 0.6] });
      this.hdBurst(ip, ['#ffffff', P.a], 60, [2, 7], { sys: 'hdStars', drag: 1, life: [0.6, 1.2], size: [0.25, 0.45] });
      if (c.flash) c.flash('#fff6c8', 0.2);
      this.light(V(p.x, 2, p.z), P.a, 10, 0.8, 12); this.impact(c, ip, 3, P.a);
      for (const [tt, i] of this.inRadius(c, p, 4)) c.hit(i, { mult: 3.5, knock: 1.2 });
      c.heal(); c.buff('พรเทวทูต ▲');
    });
    return 3.0;
  },

  /* ================= เลื่อนขั้นอาชีพ ================= */
  fx_class_ascend(c) {
    const kind = c.sigil || 'knight', P = PAL[kind] || PAL.knight, p = c.caster.pos.clone(), ch = V(p.x, 1 * this.vs, p.z);
    c.anim('castHold');
    this.sigil2(p, kind, P.a, P.b, 6, 3.2, { draw: 1.0, spin: 0.6 });
    this.sigil2(p, kind, '#ffffff', P.a, 3.2, 2.8, { draw: 0.8, spin: -1, y: 3.2, face: V(0, -1, 0), opacity: 0.7 });
    this.beam2(p, P.a, 1.4, 14, 3, { fromSky: true, grow: 0.5, speed: -1 });
    for (let s = 0; s < 4; s++) this.streak((u) => { const a = u * TAU * 2.2 + (s / 4) * TAU, r = 1.6 * (1 - u * 0.5); return V(p.x + Math.cos(a) * r, u * 4.5 * this.vs, p.z + Math.sin(a) * r); }, { color: s % 2 ? P.b : P.a, width: 0.3, sweep: 1.8, len: 0.4, n: 60 });
    for (let i = 0; i < 4; i++) this.after(0.8 + i * 0.4, () => this.hdRing(p, i % 2 ? '#ffffff' : P.a, 0.4, 4.2, 0.65));
    this.after(2.4, () => { this.hdFlash(ch, '#ffffff', 7, 0.5); this.hdFlash(ch, P.a, 11, 0.9, T.dot(), 0.6); this.hdBurst(ch, ['#ffffff', P.c, P.b], 80, [2, 7], { sys: 'hdStars', size: [0.22, 0.4], life: [0.7, 1.4] }); if (c.flash) c.flash('#fff6c8', 0.15); });
    this.light(ch, P.a, 8, 2.8, 10);
    return 3.2;
  },
};

export function installJob2FX(proto, { Particles } = {}) {
  Object.assign(proto, FX);
  proto._Particles = Particles;
  const up = proto.update, cl = proto.clear, bz = proto.busy, sg = proto.setGain;
  proto.update = function (dt) { up.call(this, dt); if (this.hdSys) for (const p of this.hdSys) p.update(dt); };
  proto.clear = function () {
    cl.call(this);
    if (!this.hd) return;
    const keep = new Set(this.hdSys.map((p) => p.points));
    for (const o of [...this.hd.children]) if (!keep.has(o)) this.hdRemove(o);
    for (const p of this.hdSys) { p.life.fill(0); p.alpha.fill(0); p.wasAlive = true; p.update(0); }
  };
  proto.busy = function () { return bz.call(this) || (!!this.hdSys && this.hdSys.some((p) => p.wasAlive)); };
  proto.setGain = function (g) { sg.call(this, g); if (this.hdSys) for (const p of this.hdSys) p.mat.uniforms.gain.value = g; };
}
