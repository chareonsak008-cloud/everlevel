// คลังเอฟเฟกต์สกิล (v0.8 preview) — อนุภาค, วงเวทย์, ลำแสง, กระสุน, สายฟ้า, โล่พลัง
// ใช้ได้ทั้งหน้าพรีวิวและในเกม: เรียก play(id, ctx) แล้ว update(dt) ทุกเฟรม
// ctx = { caster:{pos,facing,height}, targets:[{pos,height}], main, center?, count?,
//         hit(i, info) → { stun, freeze } | undefined, heal(n), buff(text), anim(kind, dur), shake(a), sky(dark, dur),
//         hitstop?(t), shock?(pos, s), flash?(color, a), aberrate?(a), punch?(a), lines?(a, dur) }
import { THREE } from './three.js';
import * as TX from './FxTextures.js';
import { beamTexture } from './Textures.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => (Array.isArray(a) ? a[(Math.random() * a.length) | 0] : a);
const range = (v) => (Array.isArray(v) ? rand(v[0], v[1]) : v);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const ADD = THREE.AdditiveBlending;

// ระดับแรงกระแทก: สั่นกล้อง · หยุดภาพชั่วขณะ · คลื่นบนจอ · แสงวาบทั้งจอ · สีเหลื่อม · กล้องพุ่งเข้า
const IMPACT = [
  null,
  { shake: 0.14, stop: 0.03, shock: 0.4, flash: 0, ca: 0.35, punch: 0.15 },
  { shake: 0.32, stop: 0.055, shock: 0.75, flash: 0.05, ca: 0.65, punch: 0.4 },
  { shake: 0.62, stop: 0.1, shock: 1.2, flash: 0.12, ca: 1.0, punch: 0.9 },
];

/* ---------- ระบบอนุภาค (GPU points ขนาด/สี/ความโปร่งต่ออนุภาค) ---------- */
export class Particles {
  constructor(parent, max, tex, blending = ADD, { boost = 1, sizeBoost = 1 } = {}) {
    this.max = max; this.next = 0;
    this.boost = boost; this.sizeBoost = sizeBoost;   // ตัวคูณจำนวน/ขนาดอนุภาครวมทั้งระบบ
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.age = new Float32Array(max); this.life = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.a0 = new Float32Array(max);
    this.spin = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 420 }, gain: { value: 1 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha; uniform float scale;
        void main() { vColor = color; vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float gain; varying vec3 vColor; varying float vAlpha;
        void main() { vec4 t = texture2D(map, gl_PointCoord); float a = t.a * vAlpha; if (a < 0.004) discard; gl_FragColor = vec4(vColor * t.rgb * gain, a); }`,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 5;
    this.points.visible = false;   // v0.16: ไม่มีอนุภาค = ไม่วาด
    parent.add(this.points);
    this.tc = new THREE.Color(); this.tc2 = new THREE.Color(); this.tv = new THREE.Vector3();
  }

  // o: { pos(V|fn), count, spread, vel(fn), speed, up, gravity, drag, life, size, sizeEnd, color, colorEnd, alpha }
  emit(o) {
    const n = Math.max(1, Math.round((o.count || 1) * this.boost));
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      const p = typeof o.pos === 'function' ? o.pos(k) : o.pos;
      const sp = o.spread || 0;
      const ox = (Math.random() * 2 - 1) * sp, oy = (Math.random() * 2 - 1) * sp * (o.flat ? 0.15 : 1), oz = (Math.random() * 2 - 1) * sp;
      this.pos[i * 3] = p.x + ox; this.pos[i * 3 + 1] = p.y + oy; this.pos[i * 3 + 2] = p.z + oz;
      let v;
      if (o.vel) v = o.vel(k, p);
      else {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), s = range(o.speed ?? 1);
        v = this.tv.set(Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s, Math.sin(ph) * Math.sin(th) * s);
      }
      this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y + range(o.up ?? 0); this.vel[i * 3 + 2] = v.z;
      this.age[i] = 0; this.life[i] = range(o.life ?? 0.6);
      const s0 = range(o.size ?? 0.2) * this.sizeBoost; this.s0[i] = s0; this.s1[i] = s0 * (o.sizeEnd ?? 0.3);
      this.tc.set(pick(o.color ?? '#ffffff')); this.tc2.set(o.colorEnd ? pick(o.colorEnd) : this.tc);
      this.c0[i * 3] = this.tc.r; this.c0[i * 3 + 1] = this.tc.g; this.c0[i * 3 + 2] = this.tc.b;
      this.c1[i * 3] = this.tc2.r; this.c1[i * 3 + 1] = this.tc2.g; this.c1[i * 3 + 2] = this.tc2.b;
      this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 0; this.a0[i] = o.alpha ?? 1;
      this.size[i] = s0; this.alpha[i] = 0;
    }
    this.points.visible = true;
  }

  update(dt) {
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      alive++;
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      if (k >= 1) { this.life[i] = 0; this.alpha[i] = 0; this.size[i] = 0; this.pos[i * 3 + 1] = -1e4; continue; }   // v0.16: อนุภาคที่ตายแล้วไม่กินพิกเซล
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d + this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = this.c0[i * 3 + c] + (this.c1[i * 3 + c] - this.c0[i * 3 + c]) * k;
      this.alpha[i] = this.a0[i] * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
    }
    // ไม่มีอนุภาคเหลือ → ไม่ต้องส่งข้อมูลขึ้น GPU ทุกเฟรม (ประหยัดบนมือถือ)
    if (alive || this.wasAlive) {
      const g = this.points.geometry.attributes;
      g.position.needsUpdate = g.color.needsUpdate = g.size.needsUpdate = g.alpha.needsUpdate = true;
    }
    this.wasAlive = alive > 0;
    this.points.visible = alive > 0;
  }
}

/* ---------- โล่พลังแบบ fresnel + ลายรังผึ้ง ---------- */
function shieldMaterial(color, gain = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color).multiplyScalar(gain) }, opacity: { value: 1 }, map: { value: TX.hexGrid() }, time: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() { vUv = uv * vec2(6.0, 3.0); vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; uniform sampler2D map; uniform float time;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() { float f = pow(1.0 - abs(dot(vN, vV)), 2.0);
        float h = texture2D(map, vUv + vec2(time * 0.06, time * 0.02)).a;
        gl_FragColor = vec4(color, (f * 0.85 + h * (0.18 + f * 0.6)) * opacity); }`,
    transparent: true, depthWrite: false, blending: ADD,
  });
}

export class SkillFX {
  constructor(scene, { lights = 4, pool = 1 } = {}) {
    const P = (n) => Math.round(n * pool);
    this.root = new THREE.Group(); scene.add(this.root);
    this.vs = 1;   // v0.17.1: ตัวคูณความสูงจุดบนตัว (มือ/จุดโดน) ให้ตรงสไปรต์พิกเซลเมื่อกล้องก้มชัน — ตั้งจาก Renderer3D
    this.time = 0;
    this.gain = 1;
    this.timeline = [];
    this.anims = [];
    // ตัวคูณความแรง (v0.8: เพิ่มจำนวนและขนาดอนุภาคทั้งระบบ)
    this.fx = new Particles(this.root, P(9000), TX.softDot(), ADD, { boost: 1.3, sizeBoost: 1.05 });                // ประกายไฟ/แสง
    this.smoke = new Particles(this.root, P(1600), TX.puff(), THREE.NormalBlending, { boost: 1.3, sizeBoost: 1.1 }); // ควัน หมอก ฝุ่น
    this.snow = new Particles(this.root, P(1400), TX.snowflake(), ADD, { boost: 1.3, sizeBoost: 1.05 });             // เกล็ดน้ำแข็ง
    this.feathers = new Particles(this.root, P(600), TX.feather(), ADD, { boost: 1.25 });                             // ขนนก
    this.stars = new Particles(this.root, P(1000), TX.star4(), ADD, { boost: 1.25, sizeBoost: 1.05 });               // ประกายดาว
    this.systems = [this.fx, this.smoke, this.snow, this.feathers, this.stars];
    // แสงชั่วคราว (สร้างไว้ล่วงหน้า กันเชดเดอร์คอมไพล์ใหม่กลางเกม)
    this.lights = Array.from({ length: lights }, () => { const l = new THREE.PointLight('#ffffff', 0, 8, 2); this.root.add(l); return { l, t: 0, dur: 0, peak: 0 }; });
    this.geo = {
      plane: new THREE.PlaneGeometry(1, 1),
      sphere: new THREE.SphereGeometry(1, 24, 16),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 28, 1, true),
      cone: new THREE.CylinderGeometry(0.15, 1, 1, 28, 1, true),
      crystal: new THREE.OctahedronGeometry(1, 0),
      spike: new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0),
      rock: new THREE.DodecahedronGeometry(1, 0),
    };
  }

  setViewport(height, fovDeg) {
    this.pointScale = height / (2 * Math.tan((fovDeg * Math.PI) / 360));
    this.setPixelScale(1);
  }
  // ใช้ตอนเรนเดอร์รอบเรืองแสงที่ความละเอียดต่ำกว่า (ขนาดจุดเป็นพิกเซล)
  setPixelScale(k) { for (const p of this.systems) p.mat.uniforms.scale.value = (this.pointScale || 420) * k; }

  after(t, fn) { this.timeline.push({ at: this.time + t, fn }); }
  // มีเอฟเฟกต์กำลังเล่นอยู่ไหม (ใช้ตัดสินว่าต้องเปิดโพสต์โปรเซสหรือไม่)
  busy() { return this.anims.length > 0 || this.timeline.length > 0 || this.systems.some((p) => p.wasAlive) || this.lights.some((L) => L.t < L.dur); }
  anim(dur, fn, end) { this.anims.push({ t: 0, dur, fn, end }); }

  update(dt) {
    this.time += dt;
    if (this.timeline.length) {
      const due = this.timeline.filter((e) => e.at <= this.time);
      if (due.length) { this.timeline = this.timeline.filter((e) => e.at > this.time); for (const e of due) e.fn(); }
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k, dt, a.t);
      if (k >= 1) { this.anims.splice(i, 1); if (a.end) a.end(); }
    }
    for (const p of this.systems) p.update(dt);
    for (const L of this.lights) {
      if (L.t >= L.dur) { L.l.intensity = 0; continue; }
      L.t += dt; const k = L.t / L.dur;
      L.l.intensity = L.peak * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
    }
  }

  clear() {
    this.timeline = [];
    const list = this.anims; this.anims = [];
    for (const a of list) if (a.end) { try { a.end(); } catch (e) { /* ข้าม */ } }
    this.timeline = [];
    // ลบวัตถุที่ค้างอยู่ (เช่น ดาบยักษ์/กางเขนที่ยังไม่ถึงคิวลบ) เหลือไว้แค่ระบบอนุภาคและแสง
    const keep = new Set([...this.systems.map((p) => p.points), ...this.lights.map((L) => L.l)]);
    for (const o of [...this.root.children]) if (!keep.has(o)) this.remove(o);
    for (const L of this.lights) { L.t = L.dur = 0; L.l.intensity = 0; }
    for (const p of this.systems) { p.life.fill(0); p.alpha.fill(0); p.wasAlive = true; p.update(0); }
  }

  /* ================= ชิ้นส่วนพื้นฐาน ================= */

  add(obj) { this.root.add(obj); return obj; }
  remove(obj) {
    this.root.remove(obj);
    obj.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); } });
  }
  // gain = ความสว่างรวมของเอฟเฟกต์แบบบวกแสง (แผนที่กลางวันสว่างใช้ค่าต่ำกว่า ไม่ให้ขาวโพลน)
  basic(color, { tex = null, opacity = 1, blending = ADD, side = THREE.DoubleSide } = {}) {
    const m = new THREE.MeshBasicMaterial({ color, map: tex, transparent: true, opacity, blending, depthWrite: false, side });
    if (blending === ADD && this.gain !== 1) m.color.multiplyScalar(this.gain);
    return m;
  }
  spriteMat(tex, color, opacity = 1, blending = ADD) {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending });
    if (blending === ADD && this.gain !== 1) m.color.multiplyScalar(this.gain);
    return m;
  }
  setGain(g) {
    this.gain = g;
    for (const p of this.systems) if (p.mat.blending === ADD) p.mat.uniforms.gain.value = g;
  }

  // แสงวาบ (สไปรต์ขยายแล้วจาง)
  flash(pos, color, size = 2, dur = 0.35, tex = TX.softDot(), peak = 1) {
    peak *= 0.8;
    const s = this.add(new THREE.Sprite(this.spriteMat(tex, color)));
    s.position.copy(pos); s.renderOrder = 6;
    this.anim(dur, (k) => { s.scale.setScalar(size * (0.35 + 0.65 * easeOut(k))); s.material.opacity = peak * (1 - k); }, () => this.remove(s));
    return s;
  }
  star(pos, color, size = 1.4, dur = 0.4) {
    const s = this.flash(pos, color, size, dur, TX.star4());
    s.material.rotation = Math.random();
    return s;
  }

  // แสงจริงส่องฉาก (จากพูลที่สร้างไว้)
  light(pos, color, peak = 4, dur = 0.3, distance = 8) {
    const L = this.lights.reduce((a, b) => (a.t / (a.dur || 1) > b.t / (b.dur || 1) ? a : b));
    L.l.position.copy(pos); L.l.color.set(color); L.l.distance = distance; L.peak = peak * this.gain; L.t = 0; L.dur = dur;
  }

  // วงแหวนบนพื้นขยายออก
  ring(pos, color, r0, r1, dur = 0.45, { y = 0.07, opacity = 1, tex = TX.softRing(), vertical = false } = {}) {
    const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(color, { tex, opacity })));
    m.position.set(pos.x, vertical ? pos.y : y, pos.z);
    if (!vertical) m.rotation.x = -Math.PI / 2;
    m.renderOrder = 4;
    this.anim(dur, (k) => { const r = r0 + (r1 - r0) * easeOut(k); m.scale.set(r * 2, r * 2, 1); m.material.opacity = opacity * (1 - k); }, () => this.remove(m));
    return m;
  }

  // แผ่นวงเวทย์บนพื้น หมุน + เฟดเข้าออก
  disc(pos, tex, color, size, dur, { spin = 0.6, y = 0.06, opacity = 0.95, fadeIn = 0.2, fadeOut = 0.35, blending = ADD, rise = 0 } = {}) {
    const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(color, { tex, opacity, blending })));
    m.position.set(pos.x, y, pos.z); m.rotation.x = -Math.PI / 2; m.scale.set(size, size, 1); m.renderOrder = 3;
    this.anim(dur, (k, dt, t) => {
      m.rotation.z += spin * dt;
      const fi = Math.min(1, t / fadeIn), fo = Math.min(1, (dur - t) / fadeOut);
      m.material.opacity = opacity * Math.min(fi, fo);
      const pop = 0.6 + 0.4 * easeOut(Math.min(1, t / fadeIn));
      m.scale.set(size * pop, size * pop, 1);
      if (rise) m.position.y = y + rise * easeOut(k);
    }, () => this.remove(m));
    return m;
  }

  // รอยบนพื้น (ผสมสีปกติ เช่นรอยไหม้)
  decal(pos, tex, size, dur, { color = '#ffffff', opacity = 1, blending = THREE.NormalBlending } = {}) {
    const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(color, { tex, opacity, blending })));
    m.position.set(pos.x, 0.04, pos.z); m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); m.scale.set(size, size, 1); m.renderOrder = 2;
    this.anim(dur, (k) => { m.material.opacity = opacity * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3); }, () => this.remove(m));
    return m;
  }

  // เสาแสง (ลำแสงทรงกระบอก)
  pillar(pos, color, radius, height, dur, { spin = 2, grow = 0.18, fromSky = false, opacity = 0.9 } = {}) {
    opacity *= 0.8;
    const m = this.add(new THREE.Mesh(this.geo.cyl, this.basic(color, { tex: beamTexture(), opacity })));
    m.renderOrder = 4;
    this.anim(dur, (k, dt, t) => {
      const g = easeOut(Math.min(1, t / grow));
      const h = height * (fromSky ? 1 : g);
      m.scale.set(radius * (fromSky ? 1.3 - 0.3 * g : 1) * (1 - k * 0.3), h, radius * (fromSky ? 1.3 - 0.3 * g : 1) * (1 - k * 0.3));
      m.position.set(pos.x, (fromSky ? height * (1 - g) : 0) + h / 2, pos.z);
      m.rotation.y += spin * dt;
      m.material.opacity = opacity * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }, () => this.remove(m));
    return m;
  }

  // ประกายไฟกระเด็น
  sparks(pos, color, count = 30, speed = 5, { colorEnd = null, size = [0.06, 0.14], life = [0.25, 0.55], gravity = -9 } = {}) {
    this.fx.emit({ pos, count, speed: [speed * 0.4, speed], gravity, drag: 2, life, size, sizeEnd: 0.2, color, colorEnd: colorEnd || color });
  }

  // ระเบิดลูกไฟ (ใช้ซ้ำทั้งไฟร์บอล อุกกาบาต ฟีนิกซ์) — lvl = ระดับแรงกระแทก 1..3
  explosion(pos, radius = 2, { color = '#ff8a2a', core = '#fff1b0', smoke = true, scorchSize = null, shake = null, ctx = null, lvl = 2, debris = true } = {}) {
    const ground = V(pos.x, 0, pos.z);
    this.flash(pos, core, radius * 1.5, 0.26, TX.softDot(), 0.85);
    this.flash(pos, color, radius * 2.8, 0.5, TX.softDot(), 0.6);
    this.flash(pos, color, radius * 2.6, 0.45, TX.softRing(), 0.7);
    this.light(pos, color, 10, 0.5, radius * 5);
    const ball = this.add(new THREE.Mesh(this.geo.sphere, this.basic(color, { opacity: 0.5 })));
    const inner = this.add(new THREE.Mesh(this.geo.sphere, this.basic(core, { opacity: 0.5 })));
    ball.position.copy(pos); inner.position.copy(pos);
    this.anim(0.55, (k) => {
      ball.scale.setScalar(radius * (0.25 + 0.8 * easeOut(k))); ball.material.opacity = 0.4 * (1 - k) * (1 - k);
      inner.scale.setScalar(radius * 0.5 * (0.2 + 0.8 * easeOut(Math.min(1, k * 2)))); inner.material.opacity = Math.max(0, 0.7 - k * 2);
    }, () => { this.remove(ball); this.remove(inner); });
    // ลูกไฟ + ลิ้นไฟพุ่งขึ้น + สะเก็ดไฟ
    this.fx.emit({ pos, count: 90, speed: [radius * 2, radius * 4.6], gravity: 2, drag: 3, life: [0.35, 0.85], size: [0.3, 0.6], sizeEnd: 0.15, color: ['#ffd27a', color, color, '#ff5a1a'], colorEnd: '#c8281a' });
    this.fx.emit({ pos: ground, count: 40, spread: radius * 0.35, flat: true, vel: () => V(rand(-1, 1), rand(radius * 2.5, radius * 4.5), rand(-1, 1)), drag: 2.2, life: [0.35, 0.7], size: [0.35, 0.7], sizeEnd: 0.1, color: ['#ffd27a', color], colorEnd: '#a8201a' });
    this.fx.emit({ pos, count: 60, speed: [radius * 3, radius * 7], gravity: -9, drag: 1.2, life: [0.4, 0.9], size: [0.06, 0.13], color: '#ffe8a0', colorEnd: '#ff6a1a' });
    if (smoke) this.smoke.emit({ pos, count: 22, spread: radius * 0.4, speed: [0.3, 1.4], up: [0.8, 2], drag: 1.2, life: [1.0, 1.8], size: [1, 1.8], sizeEnd: 2.4, color: '#4a3a34', colorEnd: '#2a2422', alpha: 0.75 });
    this.ring(ground, color, radius * 0.3, radius * 1.9, 0.55);
    this.ring(ground, '#fff1b0', radius * 0.2, radius * 1.4, 0.35, { opacity: 0.9 });
    this.wall(ground, color, radius * 0.4, radius * 1.8, radius * 0.75, 0.5, { opacity: 0.55 });
    if (scorchSize !== 0) { this.decal(ground, TX.scorch(), scorchSize || radius * 1.8, 2.6); this.cracks(ground, '#ff8a3a', (scorchSize || radius * 1.8) * 1.15, 2.6, { glow: 0.9 }); }
    if (debris) this.debris(V(pos.x, 0.3, pos.z), { count: Math.round(4 + radius * 3), speed: [radius * 1.5, radius * 3], glow: '#ff5a1a' });
    if (ctx) { this.impact(ctx, pos, lvl, color); if (shake) ctx.shake(shake); }
  }

  // สายฟ้าซิกแซก (ทรงกระบอกบาง ๆ ต่อกันหลายท่อน + กิ่ง)
  lightning(from, to, color = '#bfe4ff', dur = 0.28, { branches = 3, width = 0.075 } = {}) {
    const g = this.add(new THREE.Group());
    const build = (a, b, segs, w, jag) => {
      const pts = [a.clone()];
      for (let i = 1; i < segs; i++) {
        const p = a.clone().lerp(b, i / segs);
        p.x += rand(-jag, jag); p.z += rand(-jag, jag); p.y += rand(-jag, jag) * 0.3;
        pts.push(p);
      }
      pts.push(b.clone());
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1], len = p0.distanceTo(p1);
        for (const [rad, c, op] of [[w, '#ffffff', 1], [w * 2.6, color, 0.7], [w * 6, color, 0.22]]) {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 5, 1, true), this.basic(c, { opacity: op }));
          m.position.copy(p0).lerp(p1, 0.5);
          m.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize());
          g.add(m);
        }
      }
      return pts;
    };
    const main = build(from, to, 9, width, 0.45);
    for (let b = 0; b < branches; b++) {
      const s = main[2 + ((Math.random() * (main.length - 4)) | 0)];
      build(s, s.clone().add(V(rand(-1.2, 1.2), -rand(0.8, 2), rand(-1.2, 1.2))), 4, width * 0.6, 0.3);
    }
    this.anim(dur, (k) => {
      const o = k < 0.2 ? 1 : (1 - k) * (Math.random() > 0.35 ? 1 : 0.25);
      g.traverse((m) => { if (m.material) { if (m.material.userData.op == null) m.material.userData.op = m.material.opacity; m.material.opacity = o * m.material.userData.op; } });
    }, () => { g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); this.remove(g); });
  }

  // กระสุนบินจาก a ไป b ใน dur วินาที (โค้งด้วย arc) — onFly(pos, k, dt) ไว้ปล่อยหางอนุภาค
  // to เป็นฟังก์ชันได้ → ตามเป้าที่เคลื่อนที่ (ใช้ในเกมจริงที่มอนเดินไปมา)
  projectile(obj, from, to, dur, { arc = 0, orient = true, onFly = null, onHit = null, keep = false } = {}) {
    this.add(obj);
    const p = V(), q = V();
    const dest = typeof to === 'function' ? to : () => to;
    const at = (k, out) => { const d = dest(); return out.lerpVectors(from, d, k).setY(from.y + (d.y - from.y) * k + Math.sin(k * Math.PI) * arc); };
    at(0, p); obj.position.copy(p);
    this.anim(dur, (k, dt) => {
      at(k, p); at(Math.min(1, k + 0.03), q);
      obj.position.copy(p);
      if (orient && q.distanceToSquared(p) > 1e-8) obj.lookAt(q);
      if (onFly) onFly(p, k, dt);
    }, () => { if (!keep) this.remove(obj); if (onHit) onHit(dest().clone()); });
    return obj;
  }

  // ลูกธนู (มีเส้นแสงด้านหลัง)
  arrow(color = '#ffd27a', glow = true, scale = 1) {
    if (!this.geo.shaft) {
      this.geo.shaft = new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5).rotateX(Math.PI / 2);
      this.geo.head = new THREE.ConeGeometry(0.045, 0.14, 5).rotateX(Math.PI / 2).translate(0, 0, 0.42);
      this.geo.fletch = new THREE.BoxGeometry(0.1, 0.005, 0.14).translate(0, 0, -0.3);
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(this.geo.shaft, new THREE.MeshBasicMaterial({ color: '#e8d2a8' })),
      new THREE.Mesh(this.geo.head, new THREE.MeshBasicMaterial({ color: '#ffffff' })),
      new THREE.Mesh(this.geo.fletch, new THREE.MeshBasicMaterial({ color: '#d8433a' })));
    if (glow) {
      const streak = new THREE.Mesh(this.geo.plane, this.basic(color, { tex: TX.flameStrip(), opacity: 0.9 }));
      streak.scale.set(1.6, 0.22, 1); streak.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); streak.position.z = -0.65;
      const tip = new THREE.Sprite(this.spriteMat(TX.softDot(), color)); tip.scale.setScalar(0.6); tip.position.z = 0.4;
      g.add(streak, tip);
    }
    g.scale.setScalar(scale);
    return g;
  }

  // ก้อนน้ำแข็งครอบมอน แล้วแตกกระจาย
  iceBlock(t, dur = 1.6) {
    const g = this.add(new THREE.Group());
    g.position.copy(t.pos);
    const mat = new THREE.MeshStandardMaterial({ color: '#bfeeff', emissive: '#3a8ad0', emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55, flatShading: true });
    const h = (t.height || 1) * this.vs;
    for (let i = 0; i < 7; i++) {
      const c = new THREE.Mesh(this.geo.crystal, mat);
      const a = (i / 7) * Math.PI * 2;
      c.position.set(Math.cos(a) * 0.32, h * (0.35 + Math.random() * 0.35), Math.sin(a) * 0.32);
      c.scale.set(0.32, h * (0.5 + Math.random() * 0.35), 0.32); c.rotation.set(rand(-0.3, 0.3), a, rand(-0.3, 0.3));
      g.add(c);
    }
    const core = new THREE.Mesh(this.geo.crystal, mat); core.scale.set(0.55, h * 0.75, 0.55); core.position.y = h * 0.5; g.add(core);
    g.scale.setScalar(0.01);
    this.anim(dur, (k, dt, tt) => { g.scale.setScalar(Math.min(1, tt / 0.15)); }, () => {
      this.snow.emit({ pos: V(t.pos.x, h * 0.6, t.pos.z), count: 30, speed: [2, 5], gravity: -9, drag: 1, life: [0.4, 0.9], size: [0.15, 0.3], color: ['#e8fbff', '#9ad8ff'] });
      this.fx.emit({ pos: V(t.pos.x, h * 0.6, t.pos.z), count: 30, speed: [2, 6], gravity: -10, life: [0.3, 0.6], size: [0.05, 0.12], color: '#e8fbff' });
      this.flash(V(t.pos.x, h * 0.6, t.pos.z), '#bfeeff', 2.2, 0.3);
      g.traverse((m) => { if (m.geometry && m.geometry !== this.geo.crystal) m.geometry.dispose(); });
      this.remove(g);
    });
  }

  // ดาวหมุนเหนือหัว (มึน)
  stunStars(t, dur = 1.6) {
    const ss = [0, 1, 2].map(() => this.add(new THREE.Sprite(this.spriteMat(TX.star4(), '#ffe08a'))));
    const top = ((t.height || 1) + 0.35) * this.vs;
    this.anim(dur, (k, dt, tt) => {
      ss.forEach((s, i) => { const a = tt * 6 + (i / 3) * Math.PI * 2; s.position.set(t.pos.x + Math.cos(a) * 0.35, top + Math.sin(tt * 8 + i) * 0.05, t.pos.z + Math.sin(a) * 0.35); s.scale.setScalar(0.35); s.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1; });
    }, () => ss.forEach((s) => this.remove(s)));
  }

  // รอยฟันเสี้ยวพระจันทร์ (หันหน้าเข้าหาผู้ใช้) + เงาตามหลัง
  slash(pos, facing, color, size, tilt = -0.6, delay = 0, dur = 0.3) {
    size *= 1.15;
    this.after(delay, () => {
      for (const [sc, op, rot, d] of [[1, 1, 0, 0], [1.18, 0.45, -0.18, 0.04]]) {
        const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(color, { tex: TX.crescent(), opacity: 0 })));
        m.position.copy(pos);
        m.lookAt(pos.clone().sub(facing));
        m.rotateZ(tilt + rot);
        m.renderOrder = 7;
        this.anim(dur + d, (k, dt, t) => {
          if (t < d) return;
          const kk = Math.min(1, (t - d) / dur);
          m.scale.setScalar(size * sc * (0.7 + 0.45 * easeOut(kk))); m.rotateZ(0.05); m.material.opacity = op * (1 - easeIn(kk));
        }, () => this.remove(m));
      }
    });
  }

  // แผ่นภาพลอยหันหากล้อง (สัญลักษณ์บัฟ, กางเขน)
  sigil(pos, tex, color, size, dur, { rise = 0.4, spin = 0 } = {}) {
    const s = this.add(new THREE.Sprite(this.spriteMat(tex, color)));
    s.position.copy(pos);
    this.anim(dur, (k) => {
      const pop = k < 0.15 ? easeOut(k / 0.15) * 1.2 : 1.2 - 0.2 * Math.min(1, (k - 0.15) / 0.2);
      s.scale.setScalar(size * pop); s.position.y = pos.y + rise * k;
      s.material.opacity = k > 0.75 ? (1 - k) / 0.25 : 1; s.material.rotation += spin * 0.016;
    }, () => this.remove(s));
    return s;
  }

  // ทรงกระบอกลม (เลื่อนลาย) ใช้กับลมหมุน/สายลม
  windTube(pos, color, radius, height, dur, { spin = 6, rise = 0, expand = 1, opacity = 0.75, shape = 'cyl' } = {}) {
    const tex = TX.windStreak().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1);
    const m = this.add(new THREE.Mesh(shape === 'cone' ? this.geo.cone : this.geo.cyl, this.basic(color, { tex, opacity })));
    m.renderOrder = 5;
    this.anim(dur, (k, dt) => {
      tex.offset.x -= spin * dt * 0.25;
      const r = radius * (1 + (expand - 1) * easeOut(k));
      m.scale.set(r, height, r);
      m.position.set(pos.x, pos.y + height / 2 + rise * easeOut(k), pos.z);
      m.material.opacity = opacity * (k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1);
    }, () => { tex.dispose(); this.remove(m); });
    return m;
  }

  // แรงกระแทกระดับ 1..3 (ctx อาจไม่มีบางฟังก์ชัน เช่นในเกมที่ปิดโพสต์โปรเซส)
  impact(c, pos, lvl = 1, color = '#ffffff') {
    const L = IMPACT[Math.max(1, Math.min(3, lvl))];
    c.shake(L.shake);
    if (c.hitstop) c.hitstop(L.stop);
    if (c.shock) c.shock(pos, L.shock);
    if (L.flash && c.flash) c.flash(color, L.flash);
    if (c.aberrate) c.aberrate(L.ca);
    if (c.punch) c.punch(L.punch);
  }
  lines(c, amount, dur) { if (c.lines) c.lines(amount, dur); }

  // เศษหินกระเด็น (เด้งบนพื้น) — glow = สีเรืองแสงของเศษ (เช่นหินลาวา)
  debris(pos, { count = 10, color = '#5a4a40', speed = [3, 6], size = [0.07, 0.16], life = 1.3, glow = null } = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, emissive: glow || '#000000', emissiveIntensity: glow ? 1.1 : 0, transparent: true });
    const g = this.add(new THREE.Group());
    const bits = Array.from({ length: count }, () => {
      const m = new THREE.Mesh(this.geo.rock, mat);
      m.scale.setScalar(range(size)); m.position.copy(pos);
      const a = Math.random() * Math.PI * 2, sp = range(speed);
      m.userData.v = V(Math.cos(a) * sp * 0.6, rand(sp * 0.7, sp * 1.3), Math.sin(a) * sp * 0.6);
      m.userData.w = V(rand(-12, 12), rand(-12, 12), rand(-12, 12));
      g.add(m); return m;
    });
    this.anim(life, (k, dt) => {
      for (const m of bits) {
        const v = m.userData.v, w = m.userData.w;
        v.y -= 18 * dt; m.position.addScaledVector(v, dt);
        const floor = m.scale.x * 0.7;
        if (m.position.y < floor) { m.position.y = floor; v.y *= -0.35; v.x *= 0.55; v.z *= 0.55; w.multiplyScalar(0.6); }
        m.rotation.x += w.x * dt; m.rotation.y += w.y * dt; m.rotation.z += w.z * dt;
        if (glow && Math.random() < 0.25) this.fx.emit({ pos: m.position, count: 1, speed: 0.2, life: 0.3, size: [0.08, 0.14], color: glow });
      }
      mat.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }, () => this.remove(g));
  }

  // รอยแตกบนพื้น: รอยดำ + รอยเรืองแสงที่ค่อย ๆ ดับ
  cracks(pos, color, size = 3, dur = 2.6, { glow = 1, dark = 0.8 } = {}) {
    const tex = TX.cracks(), rot = Math.random() * 6;
    const mk = (col, blending, order) => {
      const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex, opacity: 0, blending })));
      m.position.set(pos.x, 0.046 + order * 0.002, pos.z); m.rotation.set(-Math.PI / 2, 0, rot); m.renderOrder = order; return m;
    };
    const d = mk('#140c0a', THREE.NormalBlending, 2), g = glow ? mk(color, ADD, 3) : null;
    this.anim(dur, (k, dt, t) => {
      const sc = size * (0.5 + 0.5 * easeOut(Math.min(1, t / 0.14)));
      d.scale.set(sc, sc, 1); d.material.opacity = dark * (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
      if (g) { g.scale.set(sc, sc, 1); g.material.opacity = glow * Math.max(0, 1 - t / (dur * 0.6)); }
    }, () => { this.remove(d); if (g) this.remove(g); });
  }

  // กำแพงคลื่นกระแทก (ทรงกระบอกขยายออก ล่างทึบบนจาง)
  wall(pos, color, r0, r1, h = 1, dur = 0.5, { opacity = 0.6 } = {}) {
    opacity *= 0.42;
    const m = this.add(new THREE.Mesh(this.geo.cyl, this.basic(color, { tex: TX.vgrad(), opacity })));
    m.renderOrder = 4;
    this.anim(dur, (k) => {
      const r = r0 + (r1 - r0) * easeOut(k), hh = h * (1 - 0.45 * k);
      m.scale.set(r, hh, r); m.position.set(pos.x, hh / 2, pos.z);
      m.material.opacity = opacity * (1 - k);
    }, () => this.remove(m));
    return m;
  }

  // หนาม/แท่งพุ่งจากพื้นเป็นวง (หินหรือน้ำแข็ง)
  spikes(center, { count = 12, r0 = 0.3, r1 = 1.5, h = [0.7, 1.4], width = 0.16, dur = 1.4, mat, rise = 0.12, delay = 0 } = {}) {
    this.after(delay, () => {
      const list = Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4, r = rand(r0, r1);
        const m = this.add(new THREE.Mesh(this.geo.spike, mat));
        m.position.set(center.x + Math.cos(a) * r, 0, center.z + Math.sin(a) * r);
        const lean = 0.45 * (r / r1);
        m.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
        m.userData.h = range(h) * (1.5 - 0.6 * (r / r1)); m.userData.w = width * rand(0.8, 1.3);
        m.scale.set(m.userData.w, 0.01, m.userData.w);
        return m;
      });
      this.anim(dur, (k, dt, tt) => {
        const up = easeOut(Math.min(1, tt / rise)), down = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        for (const m of list) m.scale.set(m.userData.w, Math.max(0.01, m.userData.h * up * down), m.userData.w);
      }, () => list.forEach((m) => this.remove(m)));
    });
  }

  /* ================= ตัวช่วยตำแหน่ง ================= */
  hitPos(t) { return V(t.pos.x, (t.height || 1) * 0.6 * this.vs, t.pos.z); }
  hand(c) { return c.caster.pos.clone().add(V(0, 1.05 * this.vs, 0)).addScaledVector(c.caster.facing, 0.35); }
  inRadius(c, center, r) { return c.targets.map((t, i) => [t, i]).filter(([t]) => Math.hypot(t.pos.x - center.x, t.pos.z - center.z) <= r); }
  center(c) {
    if (c.center) return c.center.clone();
    const p = V(); c.targets.forEach((t) => p.add(t.pos)); return p.multiplyScalar(1 / Math.max(1, c.targets.length)).setY(0);
  }

  /* ================= สกิล ================= */
  play(id, c) {
    const f = this['fx_' + id];
    if (!f) { console.warn('ไม่มีเอฟเฟกต์', id); return 0; }
    return f.call(this, c);
  }

  /* ----- นักดาบ ----- */

  fx_power_slash(c) {
    const t = c.targets[c.main], tp = this.hitPos(t), f = c.caster.facing;
    c.anim('melee');
    // พลังรวมที่ดาบก่อนฟัน
    const hand = this.hand(c);
    this.fx.emit({ pos: () => hand.clone().add(V(rand(-0.7, 0.7), rand(-0.4, 0.9), rand(-0.7, 0.7))), count: 16, vel: (k, p) => hand.clone().sub(p).multiplyScalar(6), life: 0.14, size: [0.12, 0.22], color: ['#fff1b0', '#ffb347'] });
    this.flash(hand, '#ffb347', 1.2, 0.15);
    this.after(0.13, () => {
      // ฟันไขว้เป็นรูปกากบาท
      this.slash(tp, f, '#ffb347', 2.8, -0.7);
      this.slash(tp, f, '#ffffff', 2.0, -0.7, 0.03, 0.22);
      this.slash(tp, f, '#ff7a2a', 2.6, 0.8, 0.08);
      this.slash(tp, f, '#fff1b0', 1.8, 0.8, 0.1, 0.22);
      this.flash(tp, '#ffb347', 2.6, 0.3, TX.softDot(), 0.8); this.star(tp, '#fff1b0', 2.4, 0.3);
      this.flash(tp, '#ff6a1a', 4.5, 0.45, TX.softDot(), 0.4);
      this.flash(tp, '#ffb347', 3.4, 0.35, TX.softRing(), 1);
      this.sparks(tp, ['#ffe08a', '#ffb347', '#ffffff'], 70, 9, { colorEnd: '#ff5a1a', size: [0.06, 0.16] });
      // สะเก็ดพุ่งทะลุไปด้านหลังเป้า
      this.fx.emit({ pos: tp, count: 36, vel: () => f.clone().multiplyScalar(rand(6, 13)).add(V(rand(-2, 2), rand(-1, 3), rand(-2, 2))), drag: 3, life: [0.2, 0.45], size: [0.1, 0.22], color: ['#fff1b0', '#ffb347'], colorEnd: '#ff4a1a' });
      this.ring(t.pos, '#ffb347', 0.2, 2.1, 0.45);
      this.wall(t.pos, '#ff8a2a', 0.3, 1.7, 0.9, 0.4, { opacity: 0.45 });
      this.light(tp, '#ffa040', 6, 0.3, 7);
      this.impact(c, tp, 2, '#ffd27a');
      const r = c.hit(c.main, { mult: 2.8, stun: 1.6, knock: 0.5 });
      if (!r || r.stun) this.stunStars(t, (r && r.stun) || 1.6);
    });
    return 1.6;
  }

  fx_ground_burst(c) {
    const p = c.caster.pos;
    c.anim('jump', 0.36);
    this.lines(c, 0.45, 0.5);
    this.fx.emit({ pos: V(p.x, 0.1, p.z), count: 30, spread: 0.6, flat: true, vel: () => V(rand(-0.5, 0.5), rand(1, 3), rand(-0.5, 0.5)), life: [0.25, 0.4], size: [0.15, 0.3], color: ['#ffd27a', '#ff8a2a'] });
    this.after(0.36, () => {
      c.anim('melee');
      const center = V(p.x, 0.4, p.z);
      this.flash(center, '#fff1b0', 3, 0.28, TX.softDot(), 0.8); this.flash(center, '#ff6a1a', 6.5, 0.55, TX.softDot(), 0.55);
      this.flash(center, '#ffb347', 6, 0.4, TX.softRing(), 0.85);
      this.light(V(p.x, 1, p.z), '#ff8a2a', 9, 0.6, 9);
      this.ring(p, '#ffd27a', 0.3, 3.8, 0.55); this.ring(p, '#ff6a2a', 0.2, 3.1, 0.75, { opacity: 0.85 }); this.ring(p, '#fff1b0', 0.2, 2.2, 0.35);
      this.wall(p, '#ff8a2a', 0.5, 3.6, 1.6, 0.55, { opacity: 0.6 });
      // วงไฟปะทุออกรอบตัว
      this.fx.emit({ pos: V(p.x, 0.25, p.z), count: 170, vel: () => { const a = Math.random() * Math.PI * 2, s = rand(3.5, 8); return V(Math.cos(a) * s, rand(0.5, 3.5), Math.sin(a) * s); }, gravity: 1.5, drag: 2.6, life: [0.4, 0.9], size: [0.3, 0.65], sizeEnd: 0.2, color: ['#fff1b0', '#ffd27a', '#ff8a2a'], colorEnd: '#c8281a' });
      // เสาไฟพุ่งจากรอยแตกรอบตัว
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rand(-0.15, 0.15), r = rand(1.4, 2.8), fp = V(p.x + Math.cos(a) * r, 0.1, p.z + Math.sin(a) * r);
        this.after(r * 0.05, () => {
          this.anim(0.55, () => this.fx.emit({ pos: fp, count: 4, spread: 0.18, vel: () => V(rand(-0.3, 0.3), rand(3, 6), rand(-0.3, 0.3)), drag: 1.5, life: [0.25, 0.55], size: [0.3, 0.55], sizeEnd: 0.1, color: ['#fff1b0', '#ffd27a', '#ff8a2a'], colorEnd: '#a8201a' }));
          this.flash(V(fp.x, 0.3, fp.z), '#ff8a2a', 1.4, 0.3);
        });
      }
      // หินแหลมพุ่งขึ้นจากพื้น
      this.spikes(p, { count: 14, r0: 1.2, r1: 2.8, h: [0.6, 1.1], width: 0.22, dur: 1.2, mat: new THREE.MeshStandardMaterial({ color: '#6a5a50', emissive: '#ff5a1a', emissiveIntensity: 0.35, roughness: 0.9, flatShading: true }) });
      this.debris(V(p.x, 0.3, p.z), { count: 18, speed: [4, 7], glow: '#ff6a1a' });
      this.smoke.emit({ pos: V(p.x, 0.3, p.z), count: 26, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * 2.6, rand(0.4, 1.4), Math.sin(a) * 2.6); }, drag: 1.6, life: [0.9, 1.5], size: [0.8, 1.5], sizeEnd: 2.2, color: '#5a4a40', colorEnd: '#2a2220', alpha: 0.7 });
      this.decal(p, TX.scorch(), 5.2, 2.6);
      this.cracks(p, '#ff8a2a', 6.2, 2.6, { glow: 1 });
      this.impact(c, center, 3, '#ffb347');
      for (const [t, i] of this.inRadius(c, p, 3.6)) c.hit(i, { mult: 2.4, knock: 1.4 });
    });
    return 2;
  }

  fx_blade_cyclone(c) {
    const p = c.caster.pos;
    c.anim('spin', 1.0);
    [[0.45, 3.2, 18, '#ff9a4a'], [0.85, 3.9, -15, '#ffffff'], [1.25, 3.0, 21, '#ffb347'], [1.65, 2.4, -24, '#fff1b0']].forEach(([y, size, spd, col]) => {
      const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.crescent() })));
      m.rotation.x = -Math.PI / 2; m.position.set(p.x, y, p.z); m.scale.set(size, size, 1); m.renderOrder = 6;
      this.anim(1.1, (k, dt) => { m.rotation.z += spd * dt; m.material.opacity = k < 0.1 ? k / 0.1 : k > 0.75 ? (1 - k) / 0.25 : 1; m.scale.setScalar(size * (0.85 + 0.2 * Math.sin(k * Math.PI))); m.scale.z = 1; }, () => this.remove(m));
    });
    this.windTube(V(p.x, 0, p.z), '#ffd8a8', 1.5, 2.0, 1.1, { spin: 10, opacity: 0.6 });
    this.windTube(V(p.x, 0, p.z), '#ffb347', 0.9, 2.6, 1.1, { spin: -14, opacity: 0.45, shape: 'cone' });
    this.anim(1.0, (k, dt, tt) => {
      const a = tt * 16;
      for (const off of [0, Math.PI]) {
        this.fx.emit({ pos: V(p.x + Math.cos(a + off) * 1.6, rand(0.3, 1.8), p.z + Math.sin(a + off) * 1.6), count: 4, vel: () => V(-Math.sin(a + off) * 7, rand(0, 1), Math.cos(a + off) * 7), drag: 3, life: [0.2, 0.4], size: [0.12, 0.26], color: ['#ffe8c0', '#ffb347'], colorEnd: '#ff6a2a' });
      }
      if (Math.random() < 0.5) this.smoke.emit({ pos: V(p.x + Math.cos(-a) * 2, 0.2, p.z + Math.sin(-a) * 2), count: 1, vel: () => V(-Math.sin(-a) * 3, 0.6, Math.cos(-a) * 3), drag: 1, life: [0.6, 0.9], size: [0.6, 0.9], sizeEnd: 1.6, color: '#8a7a6a', alpha: 0.4 });
    });
    for (let h = 0; h < 4; h++) {
      this.after(0.18 + h * 0.2, () => {
        for (const [t, i] of this.inRadius(c, p, 3.1)) {
          const tp = this.hitPos(t);
          this.sparks(tp, ['#ffd27a', '#ffffff'], 18, 6); this.star(tp, '#ffffff', 1.2, 0.2);
          this.slash(tp, c.caster.facing, '#ffd27a', 1.2, rand(-1.4, 1.4), 0, 0.18);
          c.hit(i, { mult: 0.9, hitIndex: h, total: 4 });
        }
        this.impact(c, V(p.x, 1, p.z), 1, '#ffd27a');
      });
    }
    this.after(1.0, () => {
      this.ring(p, '#ffd27a', 0.5, 3.6, 0.45); this.wall(p, '#ffb347', 0.8, 3.4, 1.2, 0.45, { opacity: 0.5 });
      this.flash(V(p.x, 0.9, p.z), '#ffb347', 3.6, 0.35); this.flash(V(p.x, 0.9, p.z), '#fff1b0', 4, 0.3, TX.softRing(), 1);
      this.fx.emit({ pos: V(p.x, 0.9, p.z), count: 60, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * rand(5, 9), rand(-0.5, 1.5), Math.sin(a) * rand(5, 9)); }, drag: 3, life: [0.25, 0.5], size: [0.1, 0.2], color: ['#fff1b0', '#ffb347'], colorEnd: '#ff5a1a' });
      this.impact(c, V(p.x, 1, p.z), 2, '#ffb347');
    });
    return 1.8;
  }

  fx_sky_cleave(c) {
    const t = c.targets[c.main], gp = V(t.pos.x, 0, t.pos.z);
    c.anim('jump', 0.55);
    this.lines(c, 0.75, 0.75);
    this.disc(gp, TX.runeCircle('cross'), '#ffd36b', 3.8, 1.4, { spin: 1.4 });
    this.disc(gp, TX.softRing(), '#ff9a3a', 4.4, 1.0, { spin: 0, opacity: 0.6 });
    // ดาบยักษ์จากฟ้า
    const sw = new THREE.Group();
    const gold = this.basic('#ffd36b', { opacity: 0.9 }), white = this.basic('#fffbe8', { opacity: 1 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.2, 0.1), gold); blade.position.y = 2.6;
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.0, 0.12), white); core.position.y = 2.6;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4).rotateY(Math.PI / 4), gold); tip.position.y = 0.15; tip.rotation.x = Math.PI; tip.scale.z = 0.25;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.2), gold); guard.position.y = 4.75;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), gold); grip.position.y = 5.3;
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ffb347', 0.45)); glow.scale.set(3, 7.5, 1); glow.position.y = 2.8;
    sw.add(blade, core, tip, guard, grip, glow);
    sw.scale.setScalar(1.3);
    sw.position.set(gp.x, 3.2, gp.z); sw.rotation.y = Math.atan2(c.caster.facing.x, c.caster.facing.z);
    this.add(sw);
    sw.visible = false;
    this.after(0.2, () => { sw.visible = true; this.flash(V(gp.x, 6, gp.z), '#fff1b0', 4, 0.35); });
    this.anim(0.62, (k, dt, tt) => {
      if (tt < 0.2) return;
      const kk = Math.min(1, (tt - 0.2) / 0.42);
      sw.position.y = kk < 0.4 ? 3.2 - 0.5 * (kk / 0.4) : 2.7 - 3.3 * easeIn((kk - 0.4) / 0.6);
      if (kk < 1) {
        this.fx.emit({ pos: V(gp.x, sw.position.y + 3.2, gp.z), count: 6, spread: 0.35, speed: 0.5, life: 0.4, size: [0.22, 0.45], color: '#ffe8a0', colorEnd: '#ff9a3a' });
        if (kk > 0.4) this.fx.emit({ pos: V(gp.x, sw.position.y + rand(1, 6), gp.z), count: 4, spread: 0.25, vel: () => V(0, 6, 0), life: 0.25, size: [0.15, 0.3], color: '#fff1b0' });
      }
    });
    this.after(0.62, () => {
      const ip = V(gp.x, 0.5, gp.z);
      this.flash(ip, '#fffbe8', 4.4, 0.3, TX.softDot(), 0.8); this.flash(ip, '#ffb347', 7.5, 0.6, TX.softDot(), 0.5);
      this.flash(ip, '#ffd36b', 7, 0.45, TX.softRing(), 0.8); this.star(V(gp.x, 1, gp.z), '#fff1b0', 4.4, 0.35);
      this.light(V(gp.x, 1.2, gp.z), '#ffb347', 8, 0.5, 9);
      this.ring(gp, '#fff1b0', 0.3, 4.4, 0.55); this.ring(gp, '#ffb347', 0.2, 3.2, 0.75); this.ring(gp, '#ffffff', 0.2, 2.2, 0.3);
      this.wall(gp, '#ffd36b', 0.5, 4.2, 2.2, 0.6, { opacity: 0.6 });
      this.pillar(gp, '#ffb347', 1.0, 9, 0.6, { grow: 0.08, opacity: 0.4 });
      this.pillar(gp, '#fff1b0', 0.38, 9, 0.4, { grow: 0.06, opacity: 0.3 });
      this.smoke.emit({ pos: V(gp.x, 0.2, gp.z), count: 20, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * rand(1.5, 4), rand(1, 3), Math.sin(a) * rand(1.5, 4)); }, gravity: -3, drag: 1.8, life: [0.8, 1.4], size: [0.5, 1.0], sizeEnd: 2, color: '#6a5444', colorEnd: '#3a2e26', alpha: 0.65 });
      this.fx.emit({ pos: ip, count: 110, speed: [3, 9], gravity: -10, drag: 1, life: [0.4, 0.9], size: [0.08, 0.2], color: ['#fff1b0', '#ffd36b'], colorEnd: '#ff8a2a' });
      this.spikes(gp, { count: 12, r0: 1.0, r1: 2.4, h: [0.5, 0.9], width: 0.2, dur: 1.1, mat: new THREE.MeshStandardMaterial({ color: '#7a6a5a', emissive: '#ffb347', emissiveIntensity: 0.3, roughness: 0.9, flatShading: true }) });
      this.debris(V(gp.x, 0.3, gp.z), { count: 18, speed: [4, 8], color: '#6a5a4a', glow: '#ffb347' });
      this.decal(gp, TX.scorch(), 4.6, 2.6, { color: '#ffd8a0' });
      this.cracks(gp, '#ffd36b', 6.5, 2.8, { glow: 1 });
      this.impact(c, ip, 3, '#ffe8a0');
      for (const [tt2, i] of this.inRadius(c, gp, 2.6)) c.hit(i, { mult: 4.2, knock: 1.0 });
    });
    this.after(1.05, () => this.anim(0.5, (k) => { sw.position.y = -0.35 - k * 1.2; sw.traverse((m) => { if (m.material) m.material.opacity *= 0.88; }); }, () => { sw.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); this.remove(sw); }));
    return 2.1;
  }

  fx_battle_cry(c) {
    const p = c.caster.pos, chest = V(p.x, 1.0, p.z);
    c.anim('cast');
    this.lines(c, 0.55, 1.0);
    this.sigil(V(p.x, 2.7, p.z), TX.swordsSigil(), '#ff6a4a', 1.6, 1.5, { rise: 0.3 });
    // คลื่นเสียงคำรามแผ่ออก 4 ระลอก
    for (let i = 0; i < 4; i++) this.after(i * 0.14, () => {
      this.ring(chest, i % 2 ? '#ffb347' : '#ff3a2a', 0.4, 3.6, 0.5, { y: 0.7, opacity: 0.45 });
      this.flash(chest, '#ff5a3a', 3.2, 0.35, TX.softRing(), 0.8);
      if (c.shock) c.shock(chest, 0.55);
      c.shake(0.12);
    });
    this.ring(p, '#ff5a3a', 0.3, 2.8, 0.7);
    this.wall(p, '#ff3a2a', 0.4, 2.6, 1.4, 0.6, { opacity: 0.45 });
    this.windTube(V(p.x, 0, p.z), '#ff4a2a', 0.8, 2.6, 1.4, { spin: 8, opacity: 0.5, shape: 'cone' });
    this.pillar(p, '#ff3a2a', 0.7, 3.6, 1.3, { grow: 0.2, spin: 2, opacity: 0.3 });
    this.light(chest, '#ff5a3a', 6, 1.2, 7);
    if (c.flash) c.flash('#ff5a3a', 0.1);
    if (c.aberrate) c.aberrate(0.5);
    this.anim(1.4, () => {
      const a = Math.random() * Math.PI * 2, r = rand(0.35, 0.7);
      this.fx.emit({ pos: V(p.x + Math.cos(a) * r, rand(0, 0.6), p.z + Math.sin(a) * r), count: 4, vel: () => V(rand(-0.2, 0.2), rand(2, 3.8), rand(-0.2, 0.2)), drag: 1, life: [0.4, 0.8], size: [0.24, 0.45], sizeEnd: 0.1, color: ['#ffd27a', '#ff6a3a'], colorEnd: '#a8101a' });
    });
    this.smoke.emit({ pos: V(p.x, 0.15, p.z), count: 16, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * 3, 0.3, Math.sin(a) * 3); }, drag: 2, life: [0.6, 1], size: [0.5, 0.8], sizeEnd: 1.8, color: '#7a6a5a', alpha: 0.5 });
    c.buff('ATK ▲');
    return 1.6;
  }

  fx_iron_will(c) {
    const p = c.caster.pos, mid = V(p.x, 0.95 * this.vs, p.z);
    c.anim('cast');
    this.disc(p, TX.runeCircle('hex'), '#8ac8ff', 2.8, 2.0, { spin: 1.2 });
    const mat = new THREE.MeshStandardMaterial({ color: '#c8d8f0', emissive: '#3a6ab0', emissiveIntensity: 0.8, metalness: 0.8, roughness: 0.25, flatShading: true });
    const shards = Array.from({ length: 16 }, (_, i) => {
      const m = this.add(new THREE.Mesh(this.geo.crystal, mat)); m.scale.set(0.11, 0.26, 0.11);
      m.userData.a = (i / 16) * Math.PI * 2; m.userData.y = rand(0.2, 1.9); return m;
    });
    this.anim(0.7, (k, dt, tt) => {
      shards.forEach((m) => { const a = m.userData.a + tt * 7, r = 1.9 * (1 - easeIn(k)) + 0.25; m.position.set(p.x + Math.cos(a) * r, m.userData.y + (0.95 * this.vs - m.userData.y) * easeIn(k), p.z + Math.sin(a) * r); m.rotation.y += dt * 9; });
      this.fx.emit({ pos: () => V(p.x + rand(-1.6, 1.6), rand(0.2, 1.8), p.z + rand(-1.6, 1.6)), count: 2, vel: (j, q) => mid.clone().sub(q).multiplyScalar(2.5), life: 0.35, size: [0.06, 0.12], color: '#cfe6ff' });
    }, () => { shards.forEach((m) => this.remove(m)); });
    this.after(0.7, () => {
      const sh = this.add(new THREE.Mesh(this.geo.sphere, shieldMaterial('#8ac8ff', this.gain)));
      sh.position.copy(mid);
      this.anim(1.4, (k, dt, tt) => { sh.scale.setScalar(1.1 * (tt < 0.2 ? easeOut(tt / 0.2) * 1.15 : 1)); sh.material.uniforms.time.value += dt; sh.material.uniforms.opacity.value = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; }, () => this.remove(sh));
      this.flash(mid, '#cfe6ff', 2.8, 0.3, TX.softDot(), 0.8); this.flash(mid, '#6aa8ff', 4.2, 0.4, TX.softRing(), 1);
      this.pillar(p, '#5a98ff', 0.8, 4, 0.8, { grow: 0.1, opacity: 0.4 });
      this.ring(p, '#8ac8ff', 0.4, 2.6, 0.5); this.wall(p, '#8ac8ff', 0.6, 2.4, 1.2, 0.5, { opacity: 0.45 });
      this.fx.emit({ pos: mid, count: 50, speed: [2, 5], drag: 2.5, life: [0.3, 0.6], size: [0.06, 0.13], color: '#e8f4ff', colorEnd: '#6aa8ff' });
      this.stars.emit({ pos: () => V(p.x + rand(-0.9, 0.9), rand(0.3, 1.8), p.z + rand(-0.9, 0.9)), count: 10, speed: 0.2, life: [0.4, 0.8], size: [0.2, 0.35], color: '#cfe6ff' });
      this.light(mid, '#8ac8ff', 6, 0.7, 7);
      this.impact(c, mid, 1, '#cfe6ff');
    });
    c.buff('DEF ▲');
    return 2.2;
  }

  /* ----- นักเวทย์ ----- */

  fx_flame_bolt(c) {
    const t = c.targets[c.main], tp = this.hitPos(t), n = c.count || 7;
    c.anim('castHold');
    this.disc(c.caster.pos, TX.runeCircle('star'), '#ff6a2a', 2.5, 0.55 + n * 0.13, { spin: 1.8 });
    this.disc(V(t.pos.x, 0, t.pos.z), TX.runeCircle('star'), '#ff8a3a', 2.4, 0.5 + n * 0.13, { spin: -1.2, opacity: 0.7 });
    this.after(0.45, () => c.anim('cast'));
    for (let i = 0; i < n; i++) {
      this.after(0.4 + i * 0.12, () => {
        const from = V(tp.x + rand(-1.4, 1.4), 7, tp.z + rand(-1.4, 1.4) + 1.2);
        const obj = new THREE.Group();
        const core = new THREE.Sprite(this.spriteMat(TX.softDot(), '#fff1b0')); core.scale.setScalar(0.7);
        const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ff7a2a', 0.95)); glow.scale.setScalar(1.9);
        obj.add(glow, core);
        this.projectile(obj, from, () => this.hitPos(t), 0.22, {
          onFly: (pp) => this.fx.emit({ pos: pp, count: 8, spread: 0.1, speed: 0.5, life: [0.15, 0.35], size: [0.3, 0.55], sizeEnd: 0.1, color: ['#fff1b0', '#ffd27a', '#ff8a2a'], colorEnd: '#a8201a' }),
          onHit: (hp) => {
            this.flash(hp, '#ff9a3a', 2.4, 0.28); this.flash(hp, '#fff1b0', 1.8, 0.25, TX.softRing(), 1);
            this.sparks(hp, ['#ffe08a', '#ff8a2a'], 26, 5, { colorEnd: '#c8281a' });
            this.pillar(V(t.pos.x + rand(-0.2, 0.2), 0, t.pos.z + rand(-0.2, 0.2)), '#ff8a3a', 0.35, 2.4, 0.35, { grow: 0.06, opacity: 0.75 });
            this.ring(t.pos, '#ff8a3a', 0.2, 1.3, 0.3);
            this.light(hp, '#ff7a2a', 5, 0.2, 6);
            this.impact(c, hp, 1, '#ffb347');
            c.hit(c.main, { mult: 1, magic: true, hitIndex: i, total: n });
          },
        });
      });
    }
    this.after(0.4 + n * 0.12 + 0.1, () => { this.decal(t.pos, TX.scorch(), 2.4, 2); this.cracks(t.pos, '#ff8a3a', 2.6, 2, { glow: 0.9 }); });
    return 1.8;
  }

  fx_fire_ball(c) {
    const t = c.targets[c.main], tp = this.hitPos(t), hand = this.hand(c);
    c.anim('castHold');
    this.disc(c.caster.pos, TX.runeCircle('star'), '#ff5a2a', 3.0, 0.95, { spin: 2.4 });
    this.disc(c.caster.pos, TX.runeCircle('hex'), '#ffb347', 2.0, 0.95, { spin: -3, rise: 1.0, opacity: 0.6 });
    // พลังไฟรวมตัวที่มือ + วงไฟหมุนรอบ
    this.anim(0.7, (k, dt, tt) => {
      this.fx.emit({ pos: () => hand.clone().add(V(rand(-1.2, 1.2), rand(-0.7, 1.1), rand(-1.2, 1.2))), count: 4, vel: (j, q) => hand.clone().sub(q).multiplyScalar(2.4), life: [0.35, 0.45], size: [0.16, 0.28], sizeEnd: 0.5, color: ['#ffd27a', '#ff6a2a'] });
      for (let s = 0; s < 3; s++) { const a = tt * 10 + (s / 3) * Math.PI * 2; this.fx.emit({ pos: hand.clone().add(V(Math.cos(a) * 0.55 * (1 - k * 0.5), Math.sin(a * 0.5) * 0.15, Math.sin(a) * 0.55 * (1 - k * 0.5))), count: 1, speed: 0.1, life: 0.3, size: [0.2, 0.3], color: '#ffb347', colorEnd: '#ff4a1a' }); }
    });
    const charge = this.flash(hand, '#ff8a2a', 1.6, 0.75);
    this.after(0.72, () => {
      c.anim('cast');
      this.flash(hand, '#fff1b0', 2.2, 0.2, TX.softRing(), 1);
      const ball = new THREE.Group();
      const core = new THREE.Mesh(this.geo.sphere, this.basic('#fff6c8')); core.scale.setScalar(0.26);
      const g1 = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ffb347')); g1.scale.setScalar(1.8);
      const g2 = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ff4a1a', 0.75)); g2.scale.setScalar(3.2);
      ball.add(g2, g1, core);
      this.projectile(ball, hand.clone(), () => this.hitPos(t), 0.5, {
        arc: 0.8,
        onFly: (pp) => {
          g1.scale.setScalar(1.7 + Math.sin(this.time * 40) * 0.18);
          this.fx.emit({ pos: pp, count: 14, spread: 0.16, speed: 0.7, up: 0.5, life: [0.2, 0.5], size: [0.35, 0.65], sizeEnd: 0.1, color: ['#fff1b0', '#ffb347', '#ff6a2a'], colorEnd: '#8a1a10' });
          this.smoke.emit({ pos: pp, count: 1, speed: 0.2, up: 0.4, life: [0.5, 0.8], size: [0.4, 0.6], sizeEnd: 1.8, color: '#5a4a44', alpha: 0.5 });
        },
        onHit: (hp) => {
          this.explosion(hp, 2.6, { ctx: c, lvl: 3 });
          this.pillar(V(hp.x, 0, hp.z), '#ff8a3a', 1.0, 5, 0.55, { grow: 0.07, opacity: 0.7 });
          // เปลวไฟค้างบนพื้นครู่หนึ่ง
          this.anim(1.1, (k) => { if (Math.random() < 0.8) this.fx.emit({ pos: V(hp.x + rand(-1.5, 1.5), 0.1, hp.z + rand(-1.5, 1.5)), count: 1, vel: () => V(0, rand(1, 2.4), 0), life: [0.3, 0.6], size: [0.25, 0.45], sizeEnd: 0.1, color: ['#ffd27a', '#ff6a2a'], colorEnd: '#a8201a', alpha: 1 - k }); });
          for (const [tt, i] of this.inRadius(c, hp, 2.6)) c.hit(i, { mult: i === c.main ? 2.6 : 1.6, magic: true, knock: 0.6 });
        },
      });
    });
    return 2.4;
  }

  fx_meteor_storm(c) {
    const cen = this.center(c), N = 9;
    c.anim('castHold');
    c.sky(0.6, 4.8);
    this.lines(c, 0.6, 1.1);
    this.disc(cen, TX.runeCircle('star'), '#ff4a1a', 7.6, 4.6, { spin: 0.5, opacity: 0.9 });
    this.disc(cen, TX.runeCircle('hex'), '#ffb347', 4.4, 4.6, { spin: -0.9, opacity: 0.75 });
    this.disc(c.caster.pos, TX.runeCircle('star'), '#ff6a2a', 2.6, 1.2, { spin: 2.2 });
    this.pillar(c.caster.pos, '#ff6a2a', 0.7, 3.5, 1.1, { grow: 0.2, opacity: 0.45 });
    this.anim(4.6, () => this.fx.emit({ pos: () => V(cen.x + rand(-3.6, 3.6), 0.1, cen.z + rand(-3.6, 3.6)), count: 2, vel: () => V(0, rand(0.6, 1.6), 0), life: [0.6, 1.1], size: [0.08, 0.18], color: '#ffb347', colorEnd: '#ff3a1a' }));
    // ช่องฟ้าแดงเรืองเหนือลาน
    const sky = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), '#ff5a1a', 0)));
    sky.position.set(cen.x - 3, 9, cen.z + 2); sky.scale.set(12, 6, 1);
    this.anim(4.6, (k) => { sky.material.opacity = 0.55 * (k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1) * (0.85 + Math.random() * 0.15); }, () => this.remove(sky));
    this.after(0.9, () => c.anim('cast'));
    const mainT = c.targets[c.main];
    const drop = (ip, size, dur, onHit) => {
      const from = ip.clone().add(V(-3.8, 10, 2.4));
      const m = new THREE.Group();
      const rock = new THREE.Mesh(this.geo.rock, new THREE.MeshBasicMaterial({ color: '#2a0e06' }));
      rock.scale.setScalar(size);
      const g = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ff7a2a', 0.95)); g.scale.setScalar(size * 5);
      const g2 = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ffd27a', 0.55)); g2.scale.setScalar(size * 1.4);
      m.add(g, rock, g2);
      this.projectile(m, from, ip, dur, {
        onFly: (pp, k, dt) => {
          rock.rotation.x += dt * 6; rock.rotation.y += dt * 4;
          this.fx.emit({ pos: pp, count: Math.round(16 * size / 0.7), spread: 0.3 * size / 0.7, speed: 0.8, life: [0.25, 0.65], size: [0.45 * size / 0.7, 1.0 * size / 0.7], sizeEnd: 0.1, color: ['#fff1b0', '#ffb347', '#ff5a1a'], colorEnd: '#7a1008' });
          this.smoke.emit({ pos: pp, count: 2, spread: 0.2, speed: 0.3, life: [0.6, 1.0], size: [0.5, 0.9], sizeEnd: 2.2, color: '#3a2a26', alpha: 0.6 });
        },
        onHit,
      });
    };
    for (let i = 0; i < N; i++) {
      this.after(1.0 + i * 0.26, () => {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 3.0;
        const ip = i === 0 ? V(mainT.pos.x, 0.3, mainT.pos.z) : V(cen.x + Math.cos(a) * r, 0.3, cen.z + Math.sin(a) * r);
        drop(ip, 0.72, 0.5, (hp) => {
          this.explosion(hp, 2.1, { ctx: c, lvl: 2, scorchSize: 3.2 });
          this.smoke.emit({ pos: hp, count: 16, vel: () => V(rand(-3, 3), rand(3, 6), rand(-3, 3)), gravity: -12, drag: 0.6, life: [0.6, 1.0], size: [0.12, 0.22], sizeEnd: 0.8, color: '#5a3a2a', alpha: 1 });
          for (const [tt, j] of this.inRadius(c, hp, 2.1)) c.hit(j, { mult: 1.7, magic: true, hitIndex: i, total: N + 1, knock: 0.3 });
        });
      });
    }
    // อุกกาบาตยักษ์ลูกสุดท้ายถล่มกลางลาน
    const tBig = 1.0 + N * 0.26 + 0.25;
    this.after(tBig - 0.3, () => this.lines(c, 0.8, 0.6));
    this.after(tBig, () => {
      const ip = V(cen.x, 0.4, cen.z);
      drop(ip, 1.5, 0.7, (hp) => {
        this.explosion(hp, 3.8, { ctx: c, lvl: 3, scorchSize: 6.5 });
        this.pillar(V(hp.x, 0, hp.z), '#ff7a2a', 1.8, 8, 0.8, { grow: 0.08, opacity: 0.6 });
        this.pillar(V(hp.x, 0, hp.z), '#fff1b0', 0.7, 8, 0.55, { grow: 0.06, opacity: 0.7 });
        this.wall(V(hp.x, 0, hp.z), '#ffb347', 1, 6.5, 2.6, 0.8, { opacity: 0.55 });
        this.debris(V(hp.x, 0.4, hp.z), { count: 22, speed: [5, 9], glow: '#ff5a1a' });
        for (const [tt, j] of this.inRadius(c, hp, 4)) c.hit(j, { mult: 3.6, magic: true, knock: 1.2 });
      });
    });
    return tBig + 1.6;
  }

  fx_frost_storm(c) {
    const cen = this.center(c), R = 3.0;
    c.anim('castHold');
    c.sky(0.3, 5.2);
    this.disc(cen, TX.runeCircle('hex'), '#6ac8ff', 7, 4.0, { spin: 0.7, opacity: 0.9 });
    this.disc(cen, TX.snowflake(), '#bfeeff', 3.6, 4.0, { spin: -1.2, opacity: 0.6 });
    this.disc(c.caster.pos, TX.runeCircle('hex'), '#8ad8ff', 2.5, 0.9, { spin: 2.2 });
    this.after(0.7, () => c.anim('cast'));
    // พายุหิมะหมุนวน
    this.after(0.7, () => {
      this.windTube(V(cen.x, 0, cen.z), '#cfefff', R * 0.95, 3.4, 2.6, { spin: 9, opacity: 0.5 });
      this.windTube(V(cen.x, 0, cen.z), '#8ad8ff', R * 0.6, 4.2, 2.6, { spin: -12, opacity: 0.35, shape: 'cone' });
      this.anim(2.5, () => {
        for (let j = 0; j < 8; j++) {
          const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
          const p = V(cen.x + Math.cos(a) * r, rand(0.1, 3.2), cen.z + Math.sin(a) * r);
          this.snow.emit({ pos: p, count: 1, vel: () => V(-Math.sin(a) * 7 + Math.cos(a) * 0.5, rand(-0.5, 0.8), Math.cos(a) * 7 + Math.sin(a) * 0.5), drag: 0.6, life: [0.4, 0.8], size: [0.2, 0.38], color: ['#ffffff', '#cfefff', '#8ad8ff'] });
        }
        this.fx.emit({ pos: () => V(cen.x + rand(-R, R), rand(0.2, 2.8), cen.z + rand(-R, R)), count: 3, speed: 2, life: [0.3, 0.6], size: [0.05, 0.11], color: '#e8fbff' });
        if (Math.random() < 0.35) this.smoke.emit({ pos: V(cen.x + rand(-R, R), 0.3, cen.z + rand(-R, R)), count: 1, speed: 0.4, life: [0.8, 1.3], size: [1.2, 1.9], sizeEnd: 1.5, color: '#cfe8ff', alpha: 0.38 });
      });
      // ผลึกน้ำแข็งหมุนรอบ
      const mat = this.basic('#bfeeff', { opacity: 0.9 });
      const shards = Array.from({ length: 18 }, () => { const m = this.add(new THREE.Mesh(this.geo.crystal, mat)); m.scale.set(0.15, 0.45, 0.15); m.userData = { a: Math.random() * 6.28, r: rand(0.8, R), y: rand(0.4, 2.8), s: rand(3, 6) }; return m; });
      this.anim(2.5, (k, dt, tt) => { shards.forEach((m) => { const u = m.userData, a = u.a + tt * u.s; m.position.set(cen.x + Math.cos(a) * u.r, u.y + Math.sin(tt * 3 + u.a) * 0.2, cen.z + Math.sin(a) * u.r); m.rotation.set(tt * 5, a, 0.6); }); mat.opacity = k > 0.85 ? (1 - k) / 0.15 * 0.9 : 0.9; }, () => shards.forEach((m) => this.remove(m)));
    });
    for (let h = 0; h < 6; h++) this.after(0.95 + h * 0.38, () => {
      for (const [t, i] of this.inRadius(c, cen, R)) { const tp = this.hitPos(t); this.snow.emit({ pos: tp, count: 6, speed: [1, 3.5], life: 0.4, size: [0.15, 0.28], color: '#e8fbff' }); this.flash(tp, '#cfefff', 1.4, 0.2); c.hit(i, { mult: 0.6, magic: true, hitIndex: h, total: 7 }); }
      c.shake(0.08);
    });
    // ปิดท้าย: แช่แข็ง + หนามน้ำแข็งพุ่งทั่วลาน แล้วแตกกระจาย
    this.after(3.15, () => {
      const icy = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#4a9ae0', emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.1, flatShading: true });
      this.spikes(cen, { count: 26, r0: 0.4, r1: R, h: [0.6, 1.3], width: 0.2, dur: 1.7, mat: icy, rise: 0.1 });
      for (const [t, i] of this.inRadius(c, cen, R)) { const r = c.hit(i, { mult: 1.4, magic: true, freeze: 1.7 }); if (!r || r.freeze) this.iceBlock(t, (r && r.freeze) || 1.7); }
      const mid = V(cen.x, 1, cen.z);
      this.flash(mid, '#8ad8ff', 5.5, 0.5, TX.softDot(), 0.6); this.flash(mid, '#cfefff', 6, 0.4, TX.softRing(), 1);
      this.ring(cen, '#cfefff', 0.4, R * 1.4, 0.55); this.wall(cen, '#8ad8ff', 0.6, R * 1.3, 1.8, 0.6, { opacity: 0.55 });
      this.cracks(cen, '#8ad8ff', R * 2.2, 2.4, { glow: 1, dark: 0.5 });
      this.snow.emit({ pos: mid, count: 60, speed: [3, 7], gravity: -5, drag: 1.2, life: [0.5, 1.0], size: [0.2, 0.36], color: ['#ffffff', '#8ad8ff'] });
      this.light(mid, '#8ad8ff', 9, 0.6, 10);
      this.impact(c, mid, 2, '#cfefff');
    });
    return 5.0;
  }

  fx_thunder_storm(c) {
    const cen = this.center(c), R = 2.8, N = 11;
    c.anim('castHold');
    c.sky(0.55, 4.2);
    this.disc(cen, TX.runeCircle('star'), '#ffe680', 6.2, 4.0, { spin: 0.8, opacity: 0.85 });
    this.disc(c.caster.pos, TX.runeCircle('star'), '#ffe680', 2.5, 1.0, { spin: 2.2 });
    // ไฟฟ้าสถิตรอบตัวผู้ร่าย
    this.anim(0.8, () => { if (Math.random() < 0.3) { const a = Math.random() * 6.28, h = c.caster.pos.clone().add(V(0, 1.2 * this.vs, 0)); this.lightning(h, h.clone().add(V(Math.cos(a) * 0.9, rand(-0.6, 0.8), Math.sin(a) * 0.9)), '#ffe680', 0.12, { branches: 0, width: 0.03 }); } });
    // เมฆพายุ
    const clouds = Array.from({ length: 14 }, () => {
      const s = this.add(new THREE.Sprite(this.spriteMat(TX.puff(), '#3a3a4a', 0, THREE.NormalBlending)));
      s.userData = { a: Math.random() * 6.28, r: rand(0, 3.4), y: rand(5.2, 6.2), size: rand(2.6, 4.2) };
      return s;
    });
    const inner = Array.from({ length: 5 }, () => this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), '#9ac8ff', 0))));
    this.anim(4.0, (k, dt, tt) => {
      const o = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
      clouds.forEach((s) => { const u = s.userData, a = u.a + tt * 0.3; s.position.set(cen.x + Math.cos(a) * u.r, u.y, cen.z + Math.sin(a) * u.r); s.scale.setScalar(u.size); s.material.opacity = o * 0.88; });
      inner.forEach((s) => { s.position.set(cen.x + rand(-2.5, 2.5), 5.6, cen.z + rand(-2.5, 2.5)); s.scale.setScalar(rand(1.8, 3.4)); s.material.opacity = Math.random() < 0.22 ? o * 0.9 : 0; });
    }, () => { clouds.forEach((s) => this.remove(s)); inner.forEach((s) => this.remove(s)); });
    this.after(0.8, () => c.anim('cast'));
    const strike = (p, big) => {
      const w = big ? 0.16 : 0.08;
      this.lightning(V(p.x + rand(-0.6, 0.6), 5.4, p.z + rand(-0.6, 0.6)), V(p.x, 0.05, p.z), '#6aa8ff', big ? 0.5 : 0.3, { width: w, branches: big ? 6 : 3 });
      if (big) { this.lightning(V(p.x + 1, 5.6, p.z - 0.5), V(p.x, 0.05, p.z), '#8ab8ff', 0.4, { width: 0.07 }); this.lightning(V(p.x - 1, 5.6, p.z + 0.5), V(p.x, 0.05, p.z), '#8ab8ff', 0.4, { width: 0.07 }); }
      const gp = V(p.x, 0.4, p.z);
      this.flash(gp, '#cfe8ff', big ? 6 : 3, 0.28); this.star(V(p.x, 0.3, p.z), '#ffffff', big ? 3.4 : 1.8, 0.22);
      this.flash(gp, '#9ad0ff', big ? 5 : 2.4, 0.3, TX.softRing(), 1);
      this.fx.emit({ pos: V(p.x, 0.2, p.z), count: big ? 70 : 26, speed: [3, big ? 10 : 7], gravity: -6, drag: 2, life: [0.15, 0.4], size: [0.05, 0.11], color: ['#ffffff', '#9ad0ff'], colorEnd: '#4a6aff' });
      this.ring(p, '#9ad0ff', 0.1, big ? 3 : 1.3, 0.32);
      this.decal(p, TX.scorch(), big ? 3 : 1.3, 1.6, { color: '#a8c8ff', opacity: 0.7 });
      if (big) { this.cracks(p, '#9ad0ff', 4.5, 2, { glow: 1 }); this.wall(p, '#6aa8ff', 0.4, 3.2, 2, 0.5, { opacity: 0.5 }); this.pillar(p, '#5a98ff', 0.7, 7, 0.4, { fromSky: true, grow: 0.05, opacity: 0.35 }); }
      this.light(V(p.x, 2, p.z), '#9ac8ff', big ? 9 : 6, big ? 0.3 : 0.14, 9);
      if (c.flash && !big) c.flash('#bfe0ff', 0.05);
      this.impact(c, gp, big ? 3 : 1, '#cfe8ff');
    };
    for (let i = 0; i < N; i++) {
      this.after(0.9 + i * 0.22, () => {
        const tg = c.targets[i % c.targets.length];
        const p = i % 3 === 0 && tg ? V(tg.pos.x, 0, tg.pos.z) : (() => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R; return V(cen.x + Math.cos(a) * r, 0, cen.z + Math.sin(a) * r); })();
        strike(p, false);
        for (const [t, j] of this.inRadius(c, p, 1.3)) c.hit(j, { mult: 0.9, magic: true });
      });
    }
    // สายฟ้าใหญ่ปิดท้ายที่เป้าหลัก
    const tBig = 0.9 + N * 0.22 + 0.2, mt = c.targets[c.main];
    this.after(tBig - 0.25, () => this.lines(c, 0.6, 0.5));
    this.after(tBig, () => {
      const p = V(mt.pos.x, 0, mt.pos.z); strike(p, true);
      for (const [t, j] of this.inRadius(c, p, 2.2)) { const r = c.hit(j, { mult: 3.2, magic: true, stun: 1.2, knock: 0.6 }); if (j === c.main && (!r || r.stun)) this.stunStars(mt, (r && r.stun) || 1.2); }
    });
    return tBig + 1.3;
  }

  // หอกน้ำแข็ง (v0.8): ยิงหอกน้ำแข็งตามจำนวนเลเวล ลูกสุดท้ายอาจแช่แข็ง
  fx_frost_lance(c) {
    const t = c.targets[c.main], n = c.count || 5;
    c.anim('castHold');
    this.disc(c.caster.pos, TX.runeCircle('hex'), '#8ad8ff', 2.3, 0.4 + n * 0.12, { spin: 2 });
    this.after(0.3, () => c.anim('cast'));
    for (let i = 0; i < n; i++) {
      this.after(0.3 + i * 0.12, () => {
        const from = this.hand(c).add(V(rand(-0.4, 0.4), rand(-0.1, 0.5), rand(-0.4, 0.4)));
        const g = new THREE.Group();
        const lance = new THREE.Mesh(this.geo.crystal, this.basic('#cfefff', { opacity: 0.95 }));
        lance.scale.set(0.09, 0.09, 0.55);
        const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), '#6ac8ff', 0.9)); glow.scale.setScalar(1.1);
        g.add(glow, lance);
        this.flash(from, '#8ad8ff', 0.9, 0.15);
        this.projectile(g, from, () => this.hitPos(t), 0.26, {
          arc: 0.15,
          onFly: (pp) => this.snow.emit({ pos: pp, count: 2, spread: 0.06, speed: 0.3, life: [0.2, 0.4], size: [0.1, 0.18], color: ['#ffffff', '#bfeeff'] }),
          onHit: (hp) => {
            this.flash(hp, '#8ad8ff', 1.8, 0.25); this.flash(hp, '#e8fbff', 1.6, 0.22, TX.softRing(), 1);
            this.snow.emit({ pos: hp, count: 14, speed: [1.5, 4], gravity: -5, drag: 1.5, life: [0.3, 0.6], size: [0.12, 0.24], color: ['#ffffff', '#8ad8ff'] });
            this.fx.emit({ pos: hp, count: 10, speed: [2, 5], life: [0.2, 0.4], size: [0.05, 0.1], color: '#e8fbff' });
            this.light(hp, '#8ad8ff', 4, 0.2, 5);
            this.impact(c, hp, 1, '#cfefff');
            const last = i === n - 1;
            const r = c.hit(c.main, { mult: 1, magic: true, hitIndex: i, total: n, freeze: last ? 3 : 0 });
            if (last && (!r || r.freeze)) this.iceBlock(t, (r && r.freeze) || 2.4);
          },
        });
      });
    }
    return 0.7 + n * 0.12;
  }

  fx_arcane_shield(c) {
    const p = c.caster.pos, mid = V(p.x, 0.95 * this.vs, p.z);
    c.anim('cast');
    this.disc(p, TX.runeCircle('hex'), '#b48cff', 3.2, 1.9, { spin: 1.4 });
    this.disc(p, TX.runeCircle('star'), '#8ad8ff', 2.0, 0.9, { spin: -2.2, rise: 2.2, opacity: 0.85 });
    this.disc(p, TX.runeCircle('star'), '#d8c8ff', 1.5, 0.9, { spin: 2.6, rise: 1.2, opacity: 0.7 });
    const sh = this.add(new THREE.Mesh(this.geo.sphere, shieldMaterial('#b49cff', this.gain)));
    sh.position.copy(mid);
    const runes = Array.from({ length: 6 }, () => this.add(new THREE.Sprite(this.spriteMat(TX.star4(), '#d8c8ff'))));
    this.after(0.35, () => {
      this.flash(mid, '#b48cff', 3, 0.35, TX.softDot(), 0.8); this.flash(mid, '#b48cff', 4.4, 0.45, TX.softRing(), 1);
      this.light(mid, '#b48cff', 6, 0.8, 7);
      this.wall(p, '#b48cff', 0.6, 2.6, 1.4, 0.5, { opacity: 0.5 });
      this.stars.emit({ pos: mid, count: 24, speed: [1.5, 3.5], drag: 2, life: [0.4, 0.8], size: [0.2, 0.36], color: ['#ffffff', '#d8c8ff', '#8ad8ff'] });
      this.impact(c, mid, 1, '#d8c8ff');
    });
    this.anim(2.2, (k, dt, tt) => {
      const s = tt < 0.35 ? 0.01 : tt < 0.6 ? easeOut((tt - 0.35) / 0.25) * 1.25 : 1.25 - 0.12 * Math.min(1, (tt - 0.6) / 0.3);
      sh.scale.setScalar(Math.max(0.01, s)); sh.material.uniforms.time.value += dt;
      sh.material.uniforms.opacity.value = k > 0.75 ? 0.25 + 0.75 * (1 - k) / 0.25 : 1;
      runes.forEach((r, i) => { const a = tt * 3 + (i / 6) * Math.PI * 2; r.position.set(p.x + Math.cos(a) * 1.05, 0.5 + (i % 3) * 0.45 + Math.sin(tt * 4 + i) * 0.12, p.z + Math.sin(a) * 1.05); r.scale.setScalar(0.42); r.material.opacity = tt < 0.4 ? 0 : k > 0.8 ? (1 - k) / 0.2 : 1; });
      for (let j = 0; j < 2; j++) { const a = tt * 6 + j * Math.PI; this.fx.emit({ pos: V(p.x + Math.cos(a) * 0.9, (tt * 1.2 + j * 0.5) % 2, p.z + Math.sin(a) * 0.9), count: 1, vel: () => V(0, 0.9, 0), life: 0.6, size: [0.07, 0.12], color: j ? '#8ad8ff' : '#d8c8ff' }); }
    }, () => { this.remove(sh); runes.forEach((r) => this.remove(r)); });
    c.buff('MDEF ▲ · ดาเมจ -20%');
    return 2.4;
  }

  /* ----- นักธนู ----- */

  fx_twin_shot(c) {
    const t = c.targets[c.main], tp = this.hitPos(t);
    for (let i = 0; i < 2; i++) {
      this.after(i * 0.2, () => {
        c.anim('shoot');
        this.after(0.1, () => {
          const hand = this.hand(c);
          this.flash(hand, '#ffe08a', 1.2, 0.15);
          const a = this.arrow('#ffe08a', true, 1.25);
          this.projectile(a, hand, () => this.hitPos(t), 0.22, {
            arc: 0.12,
            onFly: (pp) => this.fx.emit({ pos: pp, count: 4, speed: 0.25, life: [0.15, 0.3], size: [0.1, 0.18], color: ['#fff1b0', '#ffe08a'] }),
            onHit: (hp) => {
              this.flash(hp, '#ffe08a', 2.2, 0.25); this.star(hp, '#ffffff', 1.6, 0.25); this.flash(hp, '#fff1b0', 2, 0.25, TX.softRing(), 1);
              this.sparks(hp, ['#ffe08a', '#ffffff'], 26, 5.5);
              this.fx.emit({ pos: hp, count: 14, vel: () => c.caster.facing.clone().multiplyScalar(rand(4, 8)).add(V(rand(-1.5, 1.5), rand(-0.5, 2), rand(-1.5, 1.5))), drag: 3, life: [0.2, 0.35], size: [0.08, 0.16], color: '#fff1b0', colorEnd: '#ffb347' });
              this.impact(c, hp, i === 1 ? 2 : 1, '#ffe08a');
              c.hit(c.main, { mult: 1.5, hitIndex: i, total: 2, knock: i === 1 ? 0.4 : 0 });
            },
          });
        });
      });
    }
    return 1.3;
  }

  fx_arrow_rain(c) {
    const cen = this.center(c), R = 2.8;
    c.anim('shoot');
    this.after(0.1, () => {
      const up = this.arrow('#ffe08a', true, 1.6);
      const top = this.hand(c).add(V(0, 7, 0)).addScaledVector(c.caster.facing, 1.2);
      this.projectile(up, this.hand(c), top, 0.3, {
        onFly: (pp) => this.fx.emit({ pos: pp, count: 5, speed: 0.25, life: 0.3, size: [0.12, 0.2], color: '#ffe8a0' }),
        onHit: (hp) => { this.flash(hp, '#fff1b0', 3, 0.35); this.star(hp, '#ffffff', 2.4, 0.3); this.stars.emit({ pos: hp, count: 16, speed: [1, 3], life: 0.5, size: [0.2, 0.35], color: '#ffe8a0' }); },
      });
    });
    this.after(0.35, () => { this.disc(cen, TX.softRing(), '#ffd27a', R * 2.1, 1.4, { spin: 0, opacity: 0.8 }); this.disc(cen, TX.runeCircle('star'), '#ffd27a', R * 1.8, 1.4, { spin: 0.8, opacity: 0.45 }); });
    for (let i = 0; i < 44; i++) {
      this.after(0.45 + Math.random() * 0.6, () => {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R, ip = V(cen.x + Math.cos(a) * r, 0.05, cen.z + Math.sin(a) * r);
        this.projectile(this.arrow('#ffd27a', true, 1.1), ip.clone().add(V(-0.9, 6, -0.5)), ip, 0.26, {
          onHit: (hp) => {
            this.smoke.emit({ pos: hp, count: 2, speed: [0.3, 0.8], up: 0.4, life: [0.4, 0.7], size: [0.3, 0.5], sizeEnd: 1.5, color: '#b89a78', alpha: 0.55 });
            this.fx.emit({ pos: hp, count: 6, speed: 3, gravity: -6, life: 0.3, size: [0.05, 0.1], color: '#ffe8a0' });
            if (Math.random() < 0.35) this.flash(V(hp.x, 0.2, hp.z), '#ffd27a', 1, 0.2);
          },
        });
      });
    }
    for (let h = 0; h < 3; h++) this.after(0.8 + h * 0.18, () => {
      for (const [t, i] of this.inRadius(c, cen, R)) { this.star(this.hitPos(t), '#ffffff', 1.1, 0.2); c.hit(i, { mult: 0.7, hitIndex: h, total: 3, knock: h === 2 ? 0.5 : 0 }); }
      this.impact(c, V(cen.x, 0.5, cen.z), h === 2 ? 2 : 1, '#ffe08a');
    });
    this.after(1.2, () => { this.ring(cen, '#ffd27a', 0.5, R * 1.2, 0.45); this.wall(cen, '#ffd27a', 0.8, R * 1.15, 1, 0.45, { opacity: 0.4 }); });
    return 1.9;
  }

  fx_gale_arrow(c) {
    const hand = this.hand(c), dir = c.caster.facing.clone().setY(0).normalize();
    c.anim('castHold');
    this.lines(c, 0.45, 0.9);
    // ชาร์จลมเข้าที่คันธนู
    this.windTube(V(c.caster.pos.x, 0, c.caster.pos.z), '#c8ffd8', 1.2, 2.2, 0.7, { spin: 12, expand: 0.45, opacity: 0.7 });
    this.disc(c.caster.pos, TX.runeCircle('star'), '#8affb0', 2.4, 0.9, { spin: 2.4 });
    this.anim(0.65, () => this.fx.emit({ pos: () => hand.clone().add(V(rand(-1.3, 1.3), rand(-0.8, 1.3), rand(-1.3, 1.3))), count: 5, vel: (k, p) => hand.clone().sub(p).multiplyScalar(2.6), life: [0.3, 0.4], size: [0.09, 0.18], sizeEnd: 0.6, color: ['#e8fff0', '#8affb0'] }));
    this.after(0.68, () => {
      c.anim('shoot');
      this.flash(hand, '#e8fff0', 2.8, 0.25, TX.softRing(), 1); this.flash(hand, '#8affb0', 2.4, 0.3);
      if (c.shock) c.shock(hand, 0.5);
      const end = hand.clone().addScaledVector(dir, 13);
      const dur = 0.55;
      const g = new THREE.Group();
      g.add(this.arrow('#c8ffd8', true, 1.8));
      const tex = TX.windStreak().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 1.05, 3.4, 20, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -1.3), this.basic('#bfffd0', { tex, opacity: 0.85 }));
      const tube2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.6, 2.4, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.9), this.basic('#ffffff', { tex, opacity: 0.6 }));
      g.add(tube, tube2);
      let ringT = 0;
      this.projectile(g, hand.clone(), end, dur, {
        onFly: (pp, k, dt) => {
          tex.offset.x += dt * 3; tube.rotation.z += dt * 18; tube2.rotation.z -= dt * 24;
          this.fx.emit({ pos: pp, count: 8, spread: 0.35, vel: () => V(rand(-1.2, 1.2), rand(-0.5, 1.2), rand(-1.2, 1.2)), drag: 2, life: [0.3, 0.6], size: [0.1, 0.22], color: ['#ffffff', '#9affc0'] });
          this.smoke.emit({ pos: V(pp.x, 0.15, pp.z), count: 1, vel: () => V(rand(-1, 1), 0.4, rand(-1, 1)), life: [0.5, 0.8], size: [0.5, 0.8], sizeEnd: 1.8, color: '#b8c8a8', alpha: 0.35 });
          ringT += dt;
          if (ringT > 0.07) { ringT = 0; this.flash(pp.clone(), '#bfffd0', 1.8, 0.3, TX.softRing(), 0.8); }
        },
        onHit: () => tex.dispose(),
      });
      // ลูกธนูเจาะทะลุทุกตัวที่อยู่ในแนว
      const len = 13;
      c.targets.forEach((t, i) => {
        const rel = t.pos.clone().setY(hand.y).sub(hand), s = rel.dot(dir);
        const off = rel.clone().addScaledVector(dir, -s).length();
        if (s > 0 && s < len && off < 1.1) this.after((s / len) * dur, () => {
          const tp = this.hitPos(t);
          this.flash(tp, '#c8ffd8', 2.8, 0.3); this.flash(tp, '#ffffff', 2.4, 0.3, TX.softRing(), 1);
          this.fx.emit({ pos: tp, count: 34, speed: [2, 6], drag: 2, life: [0.3, 0.6], size: [0.06, 0.15], color: '#e8fff0' });
          this.fx.emit({ pos: tp, count: 20, vel: () => dir.clone().multiplyScalar(rand(5, 10)).add(V(rand(-1.5, 1.5), rand(-0.5, 2), rand(-1.5, 1.5))), drag: 3, life: [0.2, 0.4], size: [0.1, 0.2], color: ['#ffffff', '#9affc0'] });
          this.impact(c, tp, 2, '#c8ffd8');
          c.hit(i, { mult: 2.6, knock: 0.9 });
        });
      });
    });
    return 1.8;
  }

  fx_phoenix_shot(c) {
    const t = c.targets[c.main], tp = this.hitPos(t), hand = this.hand(c);
    c.anim('castHold');
    this.lines(c, 0.5, 0.9);
    this.disc(c.caster.pos, TX.runeCircle('star'), '#ff8a2a', 2.6, 0.9, { spin: 2.2 });
    this.anim(0.6, (k, dt, tt) => {
      for (let s = 0; s < 2; s++) {
        const a = tt * 14 + s * Math.PI;
        this.fx.emit({ pos: hand.clone().add(V(Math.cos(a) * 0.6, Math.sin(tt * 7) * 0.2, Math.sin(a) * 0.6)), count: 3, speed: 0.3, life: 0.35, size: [0.22, 0.36], sizeEnd: 0.1, color: ['#ffd27a', '#ff6a2a'] });
      }
      this.fx.emit({ pos: () => hand.clone().add(V(rand(-1, 1), rand(-0.5, 1), rand(-1, 1))), count: 2, vel: (j, q) => hand.clone().sub(q).multiplyScalar(2.5), life: 0.4, size: [0.15, 0.25], color: '#ffb347' });
    });
    this.after(0.62, () => {
      c.anim('shoot');
      this.flash(hand, '#fff1b0', 2.6, 0.25, TX.softRing(), 1);
      if (c.shock) c.shock(hand, 0.45);
      const bird = new THREE.Group();
      const body = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ffb347')); body.scale.set(1.8, 1.8, 1);
      const heart = new THREE.Sprite(this.spriteMat(TX.softDot(), '#fff1b0')); heart.scale.setScalar(0.75);
      const wings = [-1, 1].map((s) => {
        const w = new THREE.Mesh(this.geo.plane, this.basic('#ff8a2a', { tex: TX.wing(), opacity: 0.95 }));
        const pivot = new THREE.Group(); pivot.add(w);
        w.position.set(s * 1.0, 0, 0); w.scale.set(s * 2.0, 1.5, 1); w.rotation.x = -Math.PI / 2;
        bird.add(pivot); return pivot;
      });
      const tail = new THREE.Mesh(this.geo.plane, this.basic('#ffb347', { tex: TX.flameStrip(), opacity: 0.95 }));
      tail.scale.set(2.8, 0.9, 1); tail.rotation.set(-Math.PI / 2, 0, Math.PI / 2); tail.position.z = -1.4;
      bird.add(body, heart, tail);
      this.projectile(bird, hand.clone(), () => this.hitPos(t), 0.75, {
        arc: 1.2,
        onFly: (pp) => {
          const f = Math.sin(this.time * 22) * 0.65;
          wings[0].rotation.z = f; wings[1].rotation.z = -f;
          this.fx.emit({ pos: pp, count: 16, spread: 0.35, speed: 0.9, life: [0.3, 0.65], size: [0.3, 0.6], sizeEnd: 0.1, color: ['#fff1b0', '#ffb347', '#ff5a1a'], colorEnd: '#8a1a10' });
          if (Math.random() < 0.6) this.feathers.emit({ pos: pp, count: 1, speed: 0.5, gravity: -1, life: [0.5, 0.9], size: [0.3, 0.45], sizeEnd: 0.6, color: '#ffb347', colorEnd: '#ff5a1a' });
        },
        onHit: (hp) => {
          this.explosion(hp, 2.4, { color: '#ff7a2a', ctx: c, lvl: 3 });
          this.pillar(V(hp.x, 0, hp.z), '#ff8a3a', 0.9, 6, 0.6, { grow: 0.07, opacity: 0.7 });
          // ปีกไฟกางออกกลางระเบิด
          for (const s of [-1, 1]) {
            const w = this.add(new THREE.Sprite(this.spriteMat(TX.wing(), '#ffb347', 0.9)));
            w.position.set(hp.x + s * 1.2, hp.y + 0.6, hp.z);
            this.anim(0.6, (k) => { w.scale.set(3.2 * (0.6 + 0.4 * easeOut(k)) * (s > 0 ? 1 : -1), 2.4 * (0.6 + 0.4 * easeOut(k)), 1); w.material.opacity = 0.9 * (1 - k); w.position.y = hp.y + 0.6 + k * 0.8; }, () => this.remove(w));
          }
          this.feathers.emit({ pos: hp, count: 36, speed: [2, 5], gravity: -1.5, drag: 2, life: [0.6, 1.3], size: [0.3, 0.55], sizeEnd: 0.7, color: ['#ffd27a', '#ff8a2a'], colorEnd: '#ff3a1a' });
          for (const [tt, i] of this.inRadius(c, hp, 2.4)) c.hit(i, { mult: i === c.main ? 3.2 : 1.4, knock: 0.7 });
        },
      });
    });
    return 2.3;
  }

  fx_frost_trap(c) {
    const t = c.targets[c.main], dir = c.caster.facing.clone().setY(0).normalize();
    const spot = V(t.pos.x, 0.05, t.pos.z).addScaledVector(dir, -0.2);
    c.anim('melee');
    const dev = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 10), new THREE.MeshStandardMaterial({ color: '#8a9ab0', emissive: '#3a8ad0', emissiveIntensity: 0.8, metalness: 0.7, roughness: 0.3 }));
    this.after(0.12, () => this.projectile(dev, this.hand(c), spot.clone(), 0.45, { arc: 1.4, orient: false, keep: true, onFly: (pp, k, dt) => { dev.rotation.x += dt * 12; this.snow.emit({ pos: pp, count: 1, speed: 0.2, life: 0.4, size: [0.1, 0.18], color: '#cfefff' }); } }));
    this.after(0.58, () => {
      dev.rotation.set(0, 0, 0);
      this.disc(spot, TX.snowflake(), '#8ad8ff', 1.8, 1.1, { spin: 1.5 });
      this.disc(spot, TX.runeCircle('hex'), '#6ac8ff', 2.6, 1.1, { spin: -1 });
      this.flash(V(spot.x, 0.2, spot.z), '#8ad8ff', 1.6, 0.3, TX.softRing(), 1);
      this.anim(0.6, (k, dt, tt) => { dev.material.emissiveIntensity = 0.8 + Math.sin(tt * 24) * 0.7; if (Math.random() < 0.4) this.fx.emit({ pos: V(spot.x, 0.15, spot.z), count: 1, speed: 1.2, life: 0.3, size: [0.06, 0.1], color: '#cfefff' }); });
    });
    this.after(1.2, () => {
      this.remove(dev); dev.geometry.dispose();
      const mat = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#4a9ae0', emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.1, flatShading: true });
      this.spikes(spot, { count: 22, r0: 0.2, r1: 1.7, h: [0.8, 1.6], width: 0.18, dur: 1.5, mat, rise: 0.1 });
      const mid = V(spot.x, 0.6, spot.z);
      this.flash(mid, '#cfefff', 4.2, 0.4); this.flash(mid, '#ffffff', 3.6, 0.35, TX.softRing(), 1);
      this.snow.emit({ pos: V(spot.x, 0.4, spot.z), count: 50, speed: [2, 6], gravity: -4, drag: 1.5, life: [0.5, 1.0], size: [0.2, 0.36], color: ['#ffffff', '#8ad8ff'] });
      this.smoke.emit({ pos: V(spot.x, 0.3, spot.z), count: 14, speed: [0.5, 1.8], up: 0.3, life: [0.8, 1.3], size: [0.8, 1.3], sizeEnd: 1.7, color: '#d8f0ff', alpha: 0.45 });
      this.ring(spot, '#8ad8ff', 0.2, 2.6, 0.45); this.wall(spot, '#8ad8ff', 0.4, 2.4, 1.4, 0.5, { opacity: 0.5 });
      this.cracks(spot, '#8ad8ff', 3.4, 2.2, { glow: 1, dark: 0.45 });
      this.light(V(spot.x, 1, spot.z), '#8ad8ff', 7, 0.45, 7);
      this.impact(c, mid, 2, '#cfefff');
      for (const [tt, i] of this.inRadius(c, spot, 1.8)) { const r = c.hit(i, { mult: 1.8, freeze: 2.0 }); if (!r || r.freeze) this.after(0.15, () => this.iceBlock(tt, (r && r.freeze) || 1.9)); }
    });
    return 3.2;
  }

  fx_eagle_focus(c) {
    const p = c.caster.pos;
    c.anim('cast');
    this.lines(c, 0.35, 0.9);
    this.disc(p, TX.runeCircle('star'), '#8affb0', 2.8, 1.6, { spin: 1.6 });
    this.disc(p, TX.softRing(), '#c8ffa0', 3.0, 1.2, { spin: 0, opacity: 0.6 });
    this.sigil(V(p.x, 2.75, p.z), TX.eyeSigil(), '#c8ffa0', 1.5, 1.6, { rise: 0.2 });
    this.after(0.15, () => { this.flash(V(p.x, 2.75, p.z), '#e8ffd0', 2.6, 0.3, TX.softRing(), 1); this.flash(V(p.x, 1, p.z), '#5aff8a', 2.4, 0.3, TX.softDot(), 0.6); });
    this.anim(1.4, (k, dt, tt) => {
      for (let s = 0; s < 3; s++) {
        const a = tt * 9 + (s / 3) * Math.PI * 2, y = (tt * 1.8 + s * 0.3) % 2.4;
        this.fx.emit({ pos: V(p.x + Math.cos(a) * 0.75, y, p.z + Math.sin(a) * 0.75), count: 2, speed: 0.1, life: [0.4, 0.6], size: [0.15, 0.26], color: s === 1 ? '#ffe08a' : '#8affb0', colorEnd: '#3ac06a' });
      }
    });
    this.feathers.emit({ pos: () => V(p.x + rand(-1.4, 1.4), rand(2.5, 3.8), p.z + rand(-1.4, 1.4)), count: 18, vel: () => V(rand(-0.3, 0.3), rand(-0.7, -0.3), rand(-0.3, 0.3)), life: [1.2, 1.8], size: [0.28, 0.42], sizeEnd: 1, color: ['#e8ffe0', '#c8ffa0'] });
    this.ring(p, '#8affb0', 0.3, 2.6, 0.6); this.wall(p, '#8affb0', 0.4, 2.2, 1.6, 0.6, { opacity: 0.45 });
    this.pillar(p, '#c8ffa0', 0.6, 3.6, 1.0, { grow: 0.2, opacity: 0.4 });
    this.light(V(p.x, 1.2, p.z), '#8affb0', 5, 0.9, 7);
    if (c.shock) c.shock(V(p.x, 1, p.z), 0.5);
    c.buff('DEX/AGI ▲');
    return 1.8;
  }

  /* ----- นักบวช ----- */

  fx_holy_heal(c) {
    const p = c.caster.pos;
    c.anim('cast');
    this.disc(p, TX.runeCircle('cross'), '#8affb0', 2.7, 1.4, { spin: 1.2 });
    this.pillar(p, '#5aff8a', 0.75, 4.4, 1.2, { grow: 0.25, spin: 1.5, opacity: 0.6 });
    this.pillar(p, '#d8ffe0', 0.32, 4.4, 1.0, { grow: 0.2, spin: -2, opacity: 0.45 });
    for (let i = 0; i < 10; i++) this.after(0.08 + i * 0.09, () => this.sigil(V(p.x + rand(-0.7, 0.7), rand(0.4, 1.3), p.z + rand(-0.7, 0.7)), TX.crossGlow(), '#b8ffc8', 0.5, 0.9, { rise: 1.3 }));
    this.anim(1.0, () => this.fx.emit({ pos: () => V(p.x + rand(-0.8, 0.8), rand(0, 0.4), p.z + rand(-0.8, 0.8)), count: 4, vel: () => V(0, rand(1, 2.6), 0), life: [0.6, 1.0], size: [0.09, 0.18], color: ['#ffffff', '#b8ffc8'], colorEnd: '#4ae07a' }));
    this.stars.emit({ pos: () => V(p.x + rand(-0.8, 0.8), rand(0.3, 2), p.z + rand(-0.8, 0.8)), count: 14, speed: 0.2, life: [0.5, 1], size: [0.2, 0.35], color: ['#ffffff', '#b8ffc8'] });
    this.after(0.25, () => { this.flash(V(p.x, 1, p.z), '#6aff9a', 2.6, 0.35, TX.softDot(), 0.6); this.flash(V(p.x, 1, p.z), '#b8ffc8', 3, 0.35, TX.softRing(), 0.9); this.ring(p, '#8affb0', 0.3, 2.4, 0.5); this.wall(p, '#8affb0', 0.4, 2.2, 1.4, 0.55, { opacity: 0.45 }); c.heal(240); });
    this.light(V(p.x, 1.2, p.z), '#8affb0', 5, 1.1, 6);
    return 1.6;
  }

  fx_blessing(c) {
    const p = c.caster.pos;
    c.anim('cast');
    this.pillar(p, '#ffb83a', 0.95, 8, 1.4, { fromSky: true, grow: 0.3, spin: 1, opacity: 0.45 });
    this.disc(p, TX.runeCircle('star'), '#ffe08a', 2.8, 1.6, { spin: 1.3 });
    this.disc(p, TX.runeCircle('cross'), '#fff3c8', 1.8, 1.6, { spin: -1.6, rise: 1.8, opacity: 0.6 });
    // ปีกเทวดากางออกด้านหลัง
    const wings = [-1, 1].map((s) => {
      const pivot = this.add(new THREE.Group());
      const w = new THREE.Mesh(this.geo.plane, this.basic('#ffd36b', { tex: TX.wing(), opacity: 0 }));
      w.renderOrder = 8;
      w.scale.set(s * 2.3, 2.3, 1); w.position.set(s * 1.05, 0.3, 0); pivot.add(w);
      pivot.position.set(p.x, 1.25, p.z).addScaledVector(c.caster.facing, -0.25);
      pivot.rotation.y = Math.atan2(c.caster.facing.x, c.caster.facing.z);
      return { pivot, w, s };
    });
    this.anim(1.8, (k, dt, tt) => {
      wings.forEach(({ w, s }) => {
        const open = easeOut(Math.min(1, tt / 0.45));
        w.rotation.y = s * (1.2 - open * 1.0) + Math.sin(tt * 5) * 0.08 * s;
        w.material.opacity = (tt < 0.1 ? tt / 0.1 : k > 0.7 ? (1 - k) / 0.3 : 1);
      });
    }, () => wings.forEach(({ pivot }) => this.remove(pivot)));
    this.after(0.35, () => {
      this.flash(V(p.x, 1.3, p.z), '#ffc84a', 2.8, 0.35, TX.softDot(), 0.55); this.flash(V(p.x, 1.3, p.z), '#ffe08a', 4.6, 0.45, TX.softRing(), 1);
      this.ring(p, '#ffe08a', 0.3, 2.8, 0.55); this.wall(p, '#ffe08a', 0.5, 2.6, 1.6, 0.55, { opacity: 0.45 });
      if (c.shock) c.shock(V(p.x, 1.2, p.z), 0.55);
      if (c.flash) c.flash('#ffe08a', 0.08);
    });
    this.feathers.emit({ pos: () => V(p.x + rand(-1.6, 1.6), rand(3, 4.8), p.z + rand(-1.6, 1.6)), count: 26, vel: () => V(rand(-0.3, 0.3), rand(-0.9, -0.4), rand(-0.3, 0.3)), life: [1.4, 2.2], size: [0.28, 0.44], sizeEnd: 1, color: ['#ffffff', '#fff3c8'] });
    this.stars.emit({ pos: () => V(p.x + rand(-1.1, 1.1), rand(0.3, 2.6), p.z + rand(-1.1, 1.1)), count: 22, speed: 0.25, life: [0.5, 1.0], size: [0.28, 0.5], sizeEnd: 0.1, color: ['#ffffff', '#ffe08a'] });
    this.light(V(p.x, 2, p.z), '#ffe8a0', 6, 1.3, 8);
    c.buff('STR/DEX/INT ▲');
    return 2.0;
  }

  fx_swift_wind(c) {
    const p = c.caster.pos;
    c.anim('cast');
    this.lines(c, 0.4, 0.9);
    for (let i = 0; i < 4; i++) this.after(i * 0.15, () => this.windTube(V(p.x, 0, p.z), i % 2 ? '#e8fff8' : '#8affd0', 0.8, 0.4, 0.9, { spin: 14, rise: 1.8, expand: 1.7, opacity: 0.9 }));
    this.windTube(V(p.x, 0, p.z), '#8affd0', 0.9, 2.4, 1.1, { spin: -10, opacity: 0.4, shape: 'cone' });
    this.feathers.emit({ pos: () => V(p.x, rand(0.2, 1.5), p.z), count: 20, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * 2.4, rand(0.3, 1.4), Math.sin(a) * 2.4); }, drag: 1.5, life: [0.8, 1.3], size: [0.24, 0.38], sizeEnd: 0.8, color: ['#e8fff8', '#8affd0'] });
    this.anim(1.0, (k, dt, tt) => { for (let s = 0; s < 2; s++) { const a = tt * 12 + s * Math.PI; this.fx.emit({ pos: V(p.x + Math.cos(a) * 0.85, tt * 2, p.z + Math.sin(a) * 0.85), count: 2, speed: 0.1, life: 0.5, size: [0.12, 0.2], color: '#c8fff0' }); } });
    this.ring(p, '#8affd0', 0.3, 2.4, 0.5); this.wall(p, '#8affd0', 0.4, 2.2, 1.2, 0.5, { opacity: 0.4 });
    this.flash(V(p.x, 1, p.z), '#c8fff0', 3, 0.35, TX.softRing(), 0.9);
    this.smoke.emit({ pos: V(p.x, 0.15, p.z), count: 12, vel: () => { const a = Math.random() * Math.PI * 2; return V(Math.cos(a) * 2.5, 0.3, Math.sin(a) * 2.5); }, drag: 2, life: [0.6, 1], size: [0.5, 0.8], sizeEnd: 1.6, color: '#c8d8c8', alpha: 0.35 });
    c.buff('AGI ▲ · ความเร็ว +25%');
    return 1.6;
  }

  fx_holy_smite(c) {
    const t = c.targets[c.main], gp = V(t.pos.x, 0, t.pos.z), tp = this.hitPos(t);
    c.anim('cast');
    this.sigil(V(gp.x, ((t.height || 1) + 1.7) * this.vs, gp.z), TX.crossGlow(), '#fff3c8', 1.7, 0.55, { rise: 0 });
    this.disc(gp, TX.runeCircle('cross'), '#ffe8a0', 2.8, 1.3, { spin: 1.2 });
    this.anim(0.38, () => this.stars.emit({ pos: () => V(gp.x + rand(-1, 1), rand(1.5, 3), gp.z + rand(-1, 1)), count: 1, vel: (k, q) => V(gp.x - q.x, -2, gp.z - q.z), life: 0.35, size: [0.15, 0.25], color: '#fff3c8' }));
    this.after(0.38, () => {
      this.pillar(gp, '#ffc84a', 0.9, 10, 0.65, { fromSky: true, grow: 0.08, spin: 0.5, opacity: 0.6 });
      this.pillar(gp, '#fff3c8', 0.35, 10, 0.45, { fromSky: true, grow: 0.06, spin: -0.5, opacity: 0.55 });
      this.flash(tp, '#fff3c8', 3.2, 0.3); this.star(tp, '#ffe8a0', 3, 0.4); this.flash(tp, '#ffc84a', 4, 0.4, TX.softRing(), 1);
      this.ring(gp, '#ffc84a', 0.2, 2.6, 0.45); this.wall(gp, '#ffb347', 0.4, 2.4, 1.6, 0.5, { opacity: 0.5 });
      this.cracks(gp, '#ffe08a', 3, 2, { glow: 1, dark: 0.5 });
      this.stars.emit({ pos: tp, count: 30, speed: [1.5, 4], drag: 2, life: [0.4, 0.8], size: [0.2, 0.42], sizeEnd: 0.1, color: ['#ffffff', '#ffe08a'] });
      this.light(V(gp.x, 2, gp.z), '#ffd36b', 7, 0.4, 8);
      this.impact(c, tp, 2, '#fff3c8');
      c.hit(c.main, { mult: 2.6, magic: true, holy: true, knock: 0.3 });
    });
    return 1.5;
  }

  fx_sanctuary(c) {
    const cen = c.caster.pos.clone().lerp(this.center(c), 0.55).setY(0), R = 3.4;
    c.anim('cast');
    this.disc(cen, TX.runeCircle('cross'), '#ffd36b', R * 2, 3.8, { spin: 0.25, opacity: 0.75 });
    this.disc(cen, TX.softRing(), '#ffe08a', R * 2.1, 3.8, { spin: 0, opacity: 0.45 });
    this.disc(cen, TX.runeCircle('star'), '#b8ffc8', R * 1.1, 3.8, { spin: -0.5, opacity: 0.5 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, pp = V(cen.x + Math.cos(a) * R * 0.92, 0, cen.z + Math.sin(a) * R * 0.92);
      this.after(0.15 + i * 0.05, () => { this.pillar(pp, '#ffd36b', 0.26, 3.4, 3.4, { grow: 0.4, spin: 1, opacity: 0.6 }); this.flash(V(pp.x, 0.4, pp.z), '#fff3c8', 1.6, 0.3, TX.softRing(), 0.9); });
    }
    this.after(0.2, () => { this.flash(V(cen.x, 0.5, cen.z), '#fff3c8', 5, 0.45, TX.softRing(), 0.9); this.wall(cen, '#ffe8a0', 0.6, R, 1.6, 0.6, { opacity: 0.4 }); if (c.shock) c.shock(V(cen.x, 0.3, cen.z), 0.6); });
    this.anim(3.6, () => { if (Math.random() < 0.9) this.fx.emit({ pos: V(cen.x + rand(-R, R) * 0.8, 0.1, cen.z + rand(-R, R) * 0.8), count: 1, vel: () => V(0, rand(0.6, 1.6), 0), life: [0.8, 1.4], size: [0.09, 0.17], color: ['#ffffff', '#ffe8a0'] }); });
    for (let pulse = 0; pulse < 4; pulse++) {
      this.after(0.6 + pulse * 0.8, () => {
        this.ring(cen, '#ffd36b', 0.3, R, 0.7, { opacity: 0.7 });
        this.wall(cen, '#ffc84a', 0.4, R, 0.9, 0.6, { opacity: 0.2 });
        this.sigil(V(c.caster.pos.x, 1.6, c.caster.pos.z), TX.crossGlow(), '#b8ffc8', 0.7, 0.8, { rise: 0.8 });
        this.stars.emit({ pos: () => V(cen.x + rand(-R, R) * 0.7, rand(0.2, 1.5), cen.z + rand(-R, R) * 0.7), count: 8, speed: 0.3, life: [0.5, 0.9], size: [0.2, 0.32], color: ['#ffffff', '#ffe8a0'] });
        c.heal(80);
        for (const [t, i] of this.inRadius(c, cen, R)) { const hp = this.hitPos(t); this.sigil(hp.clone().add(V(0, 0.4, 0)), TX.crossGlow(), '#fff3c8', 0.6, 0.6, { rise: 0.6 }); this.flash(hp, '#fff3c8', 1.6, 0.25); c.hit(i, { mult: 0.5, magic: true, holy: true, hitIndex: pulse, total: 4 }); }
      });
    }
    this.light(V(cen.x, 1.5, cen.z), '#ffe8a0', 3.5, 3.6, 10);
    return 4.0;
  }

  fx_divine_judgment(c) {
    const cen = this.center(c);
    c.anim('castHold');
    c.sky(0.5, 3.6);
    this.disc(cen, TX.runeCircle('cross'), '#ffe08a', 7, 3.6, { spin: 0.6, opacity: 0.95 });
    this.disc(cen, TX.runeCircle('star'), '#fff3c8', 4.4, 3.6, { spin: -0.9, opacity: 0.6 });
    this.disc(c.caster.pos, TX.runeCircle('cross'), '#fff3c8', 2.6, 1.2, { spin: 1.8 });
    this.after(0.45, () => this.lines(c, 0.7, 1.0));
    // ลำแสงจากฟ้าเปิดช่องก่อนกางเขนลง
    this.after(0.6, () => this.pillar(cen, '#ffc84a', 2.4, 12, 0.9, { fromSky: true, grow: 0.25, spin: 0.3, opacity: 0.14 }));
    // กางเขนแสงยักษ์ลงจากฟ้า
    const cross = new THREE.Group();
    const gold = this.basic('#ffc84a', { opacity: 0.9 }), white = this.basic('#fff3c8', { opacity: 0.7 });
    for (const [w, h, y, m] of [[0.7, 6, 3, gold], [0.32, 5.8, 3, white], [3.4, 0.7, 4.4, gold], [3.2, 0.32, 4.4, white]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), m); b.position.y = y; cross.add(b);
    }
    const halo = new THREE.Sprite(this.spriteMat(TX.softDot(), '#ffb347', 0.35)); halo.scale.set(5, 7, 1); halo.position.y = 3.6; cross.add(halo);
    const ringH = new THREE.Sprite(this.spriteMat(TX.softRing(), '#fff3c8', 0.9)); ringH.scale.setScalar(3.6); ringH.position.y = 4.4; cross.add(ringH);
    cross.scale.setScalar(1.25);
    cross.position.set(cen.x, 3.4, cen.z); cross.rotation.y = Math.atan2(c.caster.facing.x, c.caster.facing.z);
    cross.visible = false; this.add(cross);
    this.after(0.8, () => { c.anim('cast'); cross.visible = true; this.flash(V(cen.x, 7, cen.z), '#fffbe8', 5, 0.4); });
    this.anim(1.35, (k, dt, tt) => {
      if (tt < 0.8) return;
      // ลอยค้างกลางฟ้าครู่หนึ่ง แล้วกระแทกลง
      const kk = Math.min(1, (tt - 0.8) / 0.55);
      cross.position.y = kk < 0.55 ? 3.4 - 0.6 * (kk / 0.55) : 2.8 - 3.5 * easeIn((kk - 0.55) / 0.45);
      cross.traverse((m) => { if (m.material && m.material.userData.op == null) m.material.userData.op = m.material.opacity; if (m.material) m.material.opacity = m.material.userData.op * Math.min(1, (tt - 0.8) / 0.15); });
      ringH.material.rotation += dt * 2;
      this.stars.emit({ pos: V(cen.x + rand(-1.8, 1.8), cross.position.y + 3.6, cen.z), count: 3, speed: 0.5, life: 0.5, size: [0.22, 0.38], color: '#fff3c8' });
    });
    this.after(1.35, () => {
      const ip = V(cen.x, 0.8, cen.z);
      this.flash(ip, '#fff3c8', 4, 0.3, TX.softDot(), 0.6); this.flash(ip, '#ffb347', 8, 0.7, TX.softDot(), 0.35);
      this.flash(ip, '#ffc84a', 8, 0.5, TX.softRing(), 0.75);
      this.star(V(cen.x, 1.6, cen.z), '#fff3c8', 5.5, 0.45);
      this.light(V(cen.x, 2, cen.z), '#ffc84a', 9, 0.8, 12);
      const cd = this.add(new THREE.Mesh(this.geo.plane, this.basic('#ffe08a', { tex: TX.crossGlow(), opacity: 1 })));
      cd.position.set(cen.x, 0.08, cen.z); cd.rotation.set(-Math.PI / 2, 0, cross.rotation.y); cd.renderOrder = 4;
      this.anim(2.0, (k) => { cd.scale.setScalar(8.5 * (0.6 + 0.4 * easeOut(Math.min(1, k * 4)))); cd.material.opacity = 0.7 * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4); }, () => this.remove(cd));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3; this.after(i * 0.05, () => this.pillar(V(cen.x + Math.cos(a) * 2.8, 0, cen.z + Math.sin(a) * 2.8), '#ffc84a', 0.4, 7, 0.9, { grow: 0.1, opacity: 0.5 })); }
      this.ring(cen, '#fffbe8', 0.3, 4.8, 0.6); this.ring(cen, '#ffd36b', 0.2, 3.6, 0.9);
      this.wall(cen, '#ffb347', 0.6, 4.6, 2.4, 0.7, { opacity: 0.35 });
      this.cracks(cen, '#ffe08a', 7, 2.8, { glow: 1, dark: 0.55 });
      this.debris(V(cen.x, 0.3, cen.z), { count: 16, speed: [4, 8], color: '#7a6a5a', glow: '#ffd36b' });
      this.stars.emit({ pos: ip, count: 45, speed: [2, 7], drag: 1.5, life: [0.6, 1.2], size: [0.22, 0.45], sizeEnd: 0.1, color: ['#fff3c8', '#ffc84a'] });
      this.impact(c, ip, 3, '#fff3c8');
    });
    for (let h = 0; h < 3; h++) this.after(1.35 + h * 0.4, () => { for (const [t, i] of this.inRadius(c, cen, 3.4)) { const hp = this.hitPos(t); this.star(hp, '#fff3c8', 2, 0.3); this.flash(hp, '#ffe8a0', 1.8, 0.25, TX.softRing(), 0.9); c.hit(i, { mult: 1.6, magic: true, holy: true, hitIndex: h, total: 3, knock: h === 0 ? 0.6 : 0 }); } });
    this.after(2.7, () => this.anim(0.5, (k) => { cross.traverse((m) => { if (m.material) m.material.opacity *= 0.85; }); cross.position.y -= 0.02; }, () => { cross.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); this.remove(cross); }));
    return 3.6;
  }
}
