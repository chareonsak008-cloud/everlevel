// เอฟเฟกต์เคลื่อนไหว: ผิวน้ำ, ละอองน้ำพุ, ประตูมิติ, ละอองแสง, จุดหมายคลิก
import { THREE } from './three.js';
import { waterTexture, glowTexture, beamTexture, magicCircleTexture } from './Textures.js';
import { rng } from '../core/util.js';
import { lin, mergeGeometries } from './Geo.js';

/* ---------- ผิวน้ำ: 2 ชั้นเลื่อนสวนทางกัน ดูเป็นคลื่นระยิบ ---------- */
export class Water {
  // kind: water น้ำ | ice ทะเลสาบน้ำแข็ง (v0.11) | lava ลาวาไหล (v0.11)
  constructor(kind = 'water') {
    this.kind = kind;
    const t1 = waterTexture(1).clone(); t1.needsUpdate = true;
    const t2 = waterTexture(2).clone(); t2.needsUpdate = true;
    if (kind === 'ice') {
      this.base = new THREE.MeshPhongMaterial({ color: lin('#bfe6f6'), specular: lin('#ffffff'), shininess: 120, transparent: true, opacity: 0.92, depthWrite: false });
      this.l1 = new THREE.MeshBasicMaterial({ map: t1, color: '#ffffff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      this.l2 = new THREE.MeshBasicMaterial({ map: t2, color: '#9ad8ff', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
      this.speed = 0.05;
    } else if (kind === 'lava') {
      this.base = new THREE.MeshBasicMaterial({ color: '#e8400a', toneMapped: false });
      this.l1 = new THREE.MeshBasicMaterial({ map: t1, color: '#ffd23a', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.l2 = new THREE.MeshBasicMaterial({ map: t2, color: '#ff8a1a', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.speed = 0.35;
    } else {
      this.base = new THREE.MeshPhongMaterial({ color: lin('#3a86a8'), specular: lin('#d8f2ff'), shininess: 90, transparent: true, opacity: 0.8, depthWrite: false });
      this.l1 = new THREE.MeshBasicMaterial({ map: t1, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      this.l2 = new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
      this.speed = 1;
    }
    this.textures = [t1, t2];
  }

  // สร้างผิวน้ำจากรูปทรง geometry ที่ให้มา (หมุนให้นอนแล้ว)
  add(parent, geo, y, repeat = 1) {
    const group = new THREE.Group();
    const m0 = new THREE.Mesh(geo, this.base); m0.position.y = y; m0.receiveShadow = true;
    const m1 = new THREE.Mesh(geo, this.l1); m1.position.y = y + 0.005;
    const m2 = new THREE.Mesh(geo, this.l2); m2.position.y = y + 0.01;
    for (const t of this.textures) t.repeat.set(repeat, repeat);
    group.add(m0, m1, m2); parent.add(group);
    return group;
  }

  update(t) {
    const k = this.speed;
    this.textures[0].offset.set(t * 0.03 * k, t * 0.017 * k);
    this.textures[1].offset.set(-t * 0.022 * k, t * 0.028 * k);
    if (this.kind === 'lava') this.l1.opacity = 0.7 + Math.sin(t * 1.3) * 0.15;
  }
}

/* ---------- ละอองน้ำพุ ---------- */
export class FountainSpray {
  constructor(parent, x, z) {
    this.n = 180; this.origin = new THREE.Vector3(x, 1.8, z);
    this.pos = new Float32Array(this.n * 3); this.vel = new Float32Array(this.n * 3); this.life = new Float32Array(this.n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), color: '#dff4ff', size: 0.09, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    parent.add(this.points);
    this.r = rng(42);
    for (let i = 0; i < this.n; i++) this.spawn(i, this.r() * 1.4);
    // วงน้ำกระเพื่อม
    this.ripples = [];
    const rm = new THREE.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), rm.clone());
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.555, z); parent.add(ring);
      this.ripples.push(ring);
    }
  }

  spawn(i, age = 0) {
    const a = this.r() * Math.PI * 2, sp = 0.55 + this.r() * 0.35;
    this.pos[i * 3] = this.origin.x; this.pos[i * 3 + 1] = this.origin.y; this.pos[i * 3 + 2] = this.origin.z;
    this.vel[i * 3] = Math.cos(a) * sp; this.vel[i * 3 + 1] = 1.1 + this.r() * 0.6; this.vel[i * 3 + 2] = Math.sin(a) * sp;
    this.life[i] = -age;
  }

  update(dt, t) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.n; i++) {
      this.life[i] += dt;
      if (this.life[i] < 0) { p[i * 3 + 1] = -10; continue; }
      v[i * 3 + 1] -= 4.2 * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const dx = p[i * 3] - this.origin.x, dz = p[i * 3 + 2] - this.origin.z;
      const floor = dx * dx + dz * dz < 0.36 ? 1.48 : 0.56;
      if (p[i * 3 + 1] < floor && v[i * 3 + 1] < 0) this.spawn(i);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.ripples.forEach((ring, i) => {
      const k = (t * 0.45 + i / this.ripples.length) % 1;
      const s = 0.25 + k * 1.0; ring.scale.set(s, s, s);
      ring.material.opacity = 0.45 * (1 - k);
    });
  }
}

/* ---------- ประตูมิติ ---------- */
export class Portal {
  constructor(parent, x, z, locked = false) {
    const C = locked ? { ring: '#ff9a6b', disc: '#ff7a4a', beam: '#ffb38a', beam2: '#ffd9a0', light: '#ff9a5a', pts: '#ffd2b0' }
      : { ring: '#b48cff', disc: '#8f6bff', beam: '#a98bff', beam2: '#8fe3ff', light: '#a07bff', pts: '#d6c4ff' };
    this.locked = locked;
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); parent.add(this.group);
    const glow = glowTexture();
    const add = (m) => { this.group.add(m); return m; };
    this.ring = add(new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color: C.ring, transparent: true, opacity: locked ? 0.35 : 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03;
    this.disc = add(new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshBasicMaterial({ map: glow, color: C.disc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.disc.rotation.x = -Math.PI / 2; this.disc.position.y = 0.02;
    const bt = beamTexture();
    this.beam = add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.8, 32, 1, true), new THREE.MeshBasicMaterial({ map: bt, color: C.beam, transparent: true, opacity: locked ? 0.1 : 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    this.beam.position.y = 1.4;
    this.beam2 = add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.2, 32, 1, true), new THREE.MeshBasicMaterial({ map: bt, color: C.beam2, transparent: true, opacity: locked ? 0.07 : 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
    this.beam2.position.y = 1.1;
    this.light = new THREE.PointLight(C.light, 1.2, 6, 2); this.light.position.y = 1; this.group.add(this.light);
    // อนุภาคลอยขึ้นเป็นเกลียว
    this.n = 70; this.seed = new Float32Array(this.n); const r = rng(5);
    for (let i = 0; i < this.n; i++) this.seed[i] = r();
    this.pos = new Float32Array(this.n * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = add(new THREE.Points(geo, new THREE.PointsMaterial({ map: glow, color: C.pts, size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    this.points.frustumCulled = false;
  }

  update(t) {
    this.ring.rotation.z = t * 0.8;
    this.beam.rotation.y = t * 0.6; this.beam2.rotation.y = -t * 0.9;
    const pulse = 0.85 + Math.sin(t * 3) * 0.15;
    this.disc.material.opacity = (this.locked ? 0.18 : 0.32) * pulse; this.light.intensity = (this.locked ? 0.35 : 0.7) * pulse;
    for (let i = 0; i < this.n; i++) {
      const s = this.seed[i], k = (t * 0.35 + s) % 1, a = s * 40 + t * 2.4;
      const rad = 0.85 - k * 0.45;
      this.pos[i * 3] = Math.cos(a) * rad; this.pos[i * 3 + 1] = k * 2.8; this.pos[i * 3 + 2] = Math.sin(a) * rad;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/* ---------- ละอองแสงลอยรอบกล้อง (บรรยากาศ) ---------- */
export class Motes {
  // mode: float ลอยวน (เดิม) | snow หิมะตก (v0.11) | rise ประกายไฟลอยขึ้น (v0.11)
  constructor(parent, color = '#fff3c4', n = 90, size = 0.1, mode = 'float') {
    this.mode = mode;
    this.n = n; this.base = new Float32Array(this.n * 3); this.pos = new Float32Array(this.n * 3);
    const r = rng(77);
    for (let i = 0; i < this.n; i++) { this.base[i * 3] = (r() - 0.5) * 28; this.base[i * 3 + 1] = 0.3 + r() * 2.8; this.base[i * 3 + 2] = (r() - 0.5) * 22; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), color, size, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; parent.add(this.points);
    this.blink = color !== '#fff3c4' && mode === 'float';   // หิ่งห้อยกะพริบ
    if (mode !== 'float') for (let i = 0; i < this.n; i++) this.base[i * 3 + 1] = r() * 6;
  }

  update(t, cx, cz) {
    if (this.blink) this.points.material.opacity = 0.55 + Math.sin(t * 2.2) * 0.25;
    for (let i = 0; i < this.n; i++) {
      const bx = this.base[i * 3], by = this.base[i * 3 + 1], bz = this.base[i * 3 + 2];
      // วนรอบตำแหน่งกล้องเพื่อให้มีละอองอยู่ใกล้ ๆ เสมอ
      const wx = ((bx + t * 0.15 - cx) % 28 + 42) % 28 - 14 + cx;
      const wz = ((bz - cz) % 22 + 33) % 22 - 11 + cz;
      if (this.mode === 'snow' || this.mode === 'rise') {
        const sp = this.mode === 'snow' ? -(0.55 + (i % 7) * 0.06) : 0.5 + (i % 5) * 0.12;
        this.pos[i * 3] = wx + Math.sin(t * 0.9 + i) * 0.45;
        this.pos[i * 3 + 1] = (((by + t * sp) % 6) + 6) % 6;
        this.pos[i * 3 + 2] = wz + Math.cos(t * 0.7 + i * 1.3) * 0.4;
        continue;
      }
      this.pos[i * 3] = wx + Math.sin(t * 0.7 + i) * 0.3;
      this.pos[i * 3 + 1] = by + Math.sin(t * 0.9 + i * 1.7) * 0.25;
      this.pos[i * 3 + 2] = wz + Math.cos(t * 0.6 + i) * 0.3;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/* ---------- เครื่องหมายจุดหมายเมื่อคลิก ---------- */
export class ClickMarker {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.visible = false; parent.add(this.group);
    const m = new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.36, 32), m);
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.03; this.group.add(this.ring);
    this.ring2 = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 24), m.clone());
    this.ring2.rotation.x = -Math.PI / 2; this.ring2.position.y = 0.03; this.group.add(this.ring2);
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), new THREE.MeshBasicMaterial({ color: '#ffd34d' }));
    this.arrow.rotation.x = Math.PI; this.group.add(this.arrow);
  }

  show(x, z) { this.group.visible = true; this.group.position.set(x, 0, z); this.t = 0; }
  hide() { this.group.visible = false; }

  update(dt) {
    if (!this.group.visible) return;
    this.t += dt;
    const k = (this.t * 1.8) % 1;
    const s = 0.6 + k * 0.9; this.ring.scale.set(s, s, s);
    this.ring.material.opacity = 0.95 * (1 - k);
    this.arrow.position.y = 0.42 + Math.abs(Math.sin(this.t * 5)) * 0.15;
    this.arrow.rotation.y = this.t * 3;
  }
}

/* ---------- ประกายตอนโจมตีโดน / ควันตอนมอนตาย (ใช้ pool อนุภาคร่วมกัน) ---------- */
export class Bursts {
  constructor(parent, n = 260) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) this.pos[k * 3 + 1] = -50;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; parent.add(this.points);
  }

  spawn(x, y, z, color = '#fff2b0', count = 12, speed = 2.2, up = 1.5) {
    const c = new THREE.Color(color);
    for (let k = 0; k < count; k++) {
      const i = this.i; this.i = (this.i + 1) % this.n;
      const a = Math.random() * Math.PI * 2, sp = speed * (0.4 + Math.random() * 0.6);
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * sp; this.vel[i * 3 + 1] = up * (0.5 + Math.random()); this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.life[i] = 0.45 + Math.random() * 0.3;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    }
  }

  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -50; continue; }
      this.vel[i * 3 + 1] -= 5 * dt;
      const drag = 1 - 2.5 * dt;
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fade = Math.min(1, this.life[i] * 3);
      this.col[i * 3] *= 0.985 + 0.015 * fade; this.col[i * 3 + 1] *= 0.985 + 0.015 * fade; this.col[i * 3 + 2] *= 0.985 + 0.015 * fade;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/* ---------- วงแหวนเป้าหมายใต้มอนที่เลือก ---------- */
export class TargetRing {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.visible = false; parent.add(this.group);
    const m = new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), m);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; this.group.add(ring);
    this.ticks = new THREE.Group(); this.group.add(this.ticks);
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 3), m);
      const a = (i / 4) * Math.PI * 2;
      t.position.set(Math.cos(a) * 0.72, 0.03, Math.sin(a) * 0.72);
      t.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2);
      this.ticks.add(t);
    }
  }
  follow(x, z, t) {
    this.group.visible = true; this.group.position.set(x, 0, z);
    this.ticks.rotation.y = t * 1.6;
    const s = 1 + Math.sin(t * 6) * 0.05; this.ticks.scale.set(s, 1, s);
  }
  hide() { this.group.visible = false; }
}

/* ---------- วงเขตตีออโต้ (v0.14): เส้นประวงกลมบนพื้น + จุดศูนย์กลาง ---------- */
export class AutoZone {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.visible = false; parent.add(this.group);
    this.r = 0; this.t = 0;
    this.mat = new THREE.MeshBasicMaterial({ color: '#3ec8ff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.fill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: '#3ec8ff', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    this.fill.rotation.x = -Math.PI / 2; this.fill.position.y = 0.018; this.group.add(this.fill);
    this.dash = new THREE.Group(); this.group.add(this.dash);
    const c = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 4), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    c.rotation.x = -Math.PI / 2; c.position.y = 0.03; this.center = c; this.group.add(c);
  }

  show(x, z, r) {
    this.group.visible = true; this.group.position.set(x, 0, z);
    if (r !== this.r) {
      this.r = r;
      for (const m of this.dash.children) m.geometry.dispose();
      this.dash.clear();
      const n = Math.max(24, Math.round(r * 5)), seg = (Math.PI * 2) / n, parts = [];
      for (let i = 0; i < n; i++) parts.push(new THREE.RingGeometry(r - 0.08, r + 0.08, 3, 1, i * seg, seg * 0.55));
      const ring = new THREE.Mesh(mergeGeometries(parts), this.mat);
      for (const g of parts) g.dispose();
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; this.dash.add(ring);
      this.fill.scale.setScalar(r);
    }
  }
  hide() { this.group.visible = false; }

  update(dt) {
    if (!this.group.visible) return;
    this.t += dt;
    this.dash.rotation.y = this.t * 0.12;
    this.mat.opacity = 0.72 + Math.sin(this.t * 2.4) * 0.16;
    this.center.rotation.z = this.t * 1.5;
  }
}

/* ---------- กองไฟ: เปลวไฟอนุภาค + แสงวูบวาบ ---------- */
export class Campfire {
  constructor(parent, x, z) {
    this.x = x; this.z = z;
    this.n = 60; this.seed = new Float32Array(this.n); const r = rng(13);
    for (let i = 0; i < this.n; i++) this.seed[i] = r();
    this.pos = new Float32Array(this.n * 3); this.col = new Float32Array(this.n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTexture(), size: 0.28, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; parent.add(this.points);
    this.light = new THREE.PointLight('#ff9a40', 1.4, 7, 2); this.light.position.set(x, 0.8, z); parent.add(this.light);
    this.c0 = new THREE.Color('#ffe7a0'); this.c1 = new THREE.Color('#ff5a1a');
  }
  update(t) {
    const c = new THREE.Color();
    for (let i = 0; i < this.n; i++) {
      const s = this.seed[i], k = (t * (0.9 + s * 0.6) + s) % 1;
      const a = s * 50;
      const rad = 0.16 * (1 - k) + 0.02;
      this.pos[i * 3] = this.x + Math.cos(a + t) * rad;
      this.pos[i * 3 + 1] = 0.18 + k * (0.75 + s * 0.3);
      this.pos[i * 3 + 2] = this.z + Math.sin(a + t) * rad;
      c.copy(this.c0).lerp(this.c1, k).multiplyScalar(1 - k * 0.8);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.light.intensity = 1.3 + Math.sin(t * 13) * 0.2 + Math.sin(t * 7.3) * 0.15;
  }
}

/* ---------- วงเวทย์ + ลำแสง (ตอนวาร์ปเข้า/ฟื้น/มอนเกิด) ---------- */
export class MagicCircles {
  constructor(parent) { this.parent = parent; this.items = []; }

  spawn(x, z, { color = '#8fd8ff', size = 2.4, life = 1.6, pillar = true } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.045; g.add(disc);
    let beam = null;
    if (pillar) {
      beam = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.3, size * 0.36, 3.4, 28, 1, true), new THREE.MeshBasicMaterial({ map: beamTexture(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 1.7; g.add(beam);
    }
    this.parent.add(g);
    this.items.push({ g, disc, beam, t: 0, life });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        this.parent.remove(it.g);
        it.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.items.splice(i, 1); continue;
      }
      const o = Math.min(1, it.t / 0.2) * (k > 0.55 ? (1 - k) / 0.45 : 1);
      const grow = 1 - Math.pow(1 - Math.min(1, it.t / 0.45), 3);
      it.disc.material.opacity = o * 0.95;
      it.disc.rotation.z += dt * 1.4;
      it.disc.scale.setScalar(0.4 + 0.6 * grow);
      if (it.beam) {
        it.beam.material.opacity = o * 0.55;
        it.beam.scale.set(1 - k * 0.4, 0.2 + 0.8 * grow, 1 - k * 0.4);
        it.beam.position.y = 1.7 * (0.2 + 0.8 * grow);
        it.beam.rotation.y += dt * 2;
      }
    }
  }
}

/* ---------- ผลึกวาร์ปลอยหมุน (ข้างนักเวทย์วาร์ป) ---------- */
export class WarpCrystal {
  constructor(parent, x, z, color = '#7fe0ff') {
    this.g = new THREE.Group(); this.g.position.set(x, 0, z); parent.add(this.g);
    const c = lin(color);
    const geo = new THREE.OctahedronGeometry(0.26, 0); geo.scale(0.75, 1.5, 0.75);
    this.crystal = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }));
    this.crystal.castShadow = true; this.g.add(this.crystal);
    const inner = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0).scale(0.75, 1.5, 0.75), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    this.crystal.add(inner);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow.scale.set(1.6, 1.6, 1); this.g.add(this.glow);
    this.disc = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.disc.rotation.x = -Math.PI / 2; this.disc.position.y = 0.05; this.g.add(this.disc);
    // ละอองแสงลอยขึ้นรอบผลึก
    this.n = 24; this.seed = new Float32Array(this.n); const r = rng(31);
    for (let i = 0; i < this.n; i++) this.seed[i] = r();
    this.pos = new Float32Array(this.n * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.points = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTexture(), color, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false; this.g.add(this.points);
  }
  update(t) {
    const y = 1.55 + Math.sin(t * 1.6) * 0.1;
    this.crystal.position.y = y; this.crystal.rotation.y = t * 0.9;
    this.glow.position.y = y; this.glow.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.12;
    this.disc.rotation.z = t * 0.35;
    for (let i = 0; i < this.n; i++) {
      const s = this.seed[i], k = (t * (0.25 + s * 0.2) + s) % 1, a = s * 40 + t * 0.6;
      const rad = 0.35 + s * 0.35;
      this.pos[i * 3] = Math.cos(a) * rad; this.pos[i * 3 + 1] = 0.2 + k * 2.0; this.pos[i * 3 + 2] = Math.sin(a) * rad;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = 0.75;
  }
}

/* ---------- กระสุนสกิล: ลูกเวทย์ / ลูกธนู / หอกน้ำแข็ง (v0.6) ---------- */
// ตรรกะดาเมจอยู่ฝั่งเกม — ที่นี่แค่วาดให้ไปถึงเป้าตรงเวลา dur
export class Projectiles {
  constructor(parent, bursts) {
    this.parent = parent; this.bursts = bursts; this.items = [];
    this.geo = {
      orb: new THREE.SphereGeometry(1, 12, 10),
      ice: new THREE.OctahedronGeometry(1, 0).scale(0.45, 0.45, 1.6),
      shaft: new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5).rotateX(Math.PI / 2),
      head: new THREE.ConeGeometry(0.03, 0.09, 5).rotateX(Math.PI / 2).translate(0, 0, 0.31),
      fletch: new THREE.BoxGeometry(0.06, 0.004, 0.1).translate(0, 0, -0.24),
    };
  }

  spawn({ from, to, dur = 0.4, kind = 'orb', color = '#ff7a2a', size = 0.14, arc = 0 }) {
    const g = new THREE.Group();
    const c = new THREE.Color(color);
    if (kind === 'arrow') {
      const wood = new THREE.MeshBasicMaterial({ color: '#c9a070' });
      g.add(new THREE.Mesh(this.geo.shaft, wood));
      g.add(new THREE.Mesh(this.geo.head, new THREE.MeshBasicMaterial({ color: '#e4e8ee' })));
      const f = new THREE.Mesh(this.geo.fletch, new THREE.MeshBasicMaterial({ color: '#d8433a', side: THREE.DoubleSide }));
      g.add(f); const f2 = f.clone(); f2.rotation.z = Math.PI / 2; g.add(f2);
    } else {
      const core = new THREE.Mesh(kind === 'ice' ? this.geo.ice : this.geo.orb, new THREE.MeshBasicMaterial({ color: kind === 'ice' ? '#e8fbff' : '#fffbe8' }));
      core.scale.setScalar(size * (kind === 'ice' ? 1.4 : 0.6));
      g.add(core);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: c, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(size * 7); g.add(glow);
    }
    g.position.set(...from);
    this.parent.add(g);
    this.items.push({ g, from: new THREE.Vector3(...from), to: new THREE.Vector3(...to), t: 0, dur, kind, color, arc, trail: 0 });
  }

  update(dt) {
    const p = new THREE.Vector3(), ahead = new THREE.Vector3();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = Math.min(1, it.t / it.dur);
      const pos = (kk, out) => out.lerpVectors(it.from, it.to, kk).setY(it.from.y + (it.to.y - it.from.y) * kk + Math.sin(kk * Math.PI) * it.arc);
      pos(k, p); pos(Math.min(1, k + 0.02), ahead);
      it.g.position.copy(p);
      if (ahead.distanceToSquared(p) > 1e-6) it.g.lookAt(ahead);
      if (it.kind !== 'arrow') {
        it.trail -= dt;
        if (it.trail <= 0 && this.bursts) { it.trail = 0.03; this.bursts.spawn(p.x, p.y, p.z, it.color, 2, 0.25, 0.05); }
      }
      if (k >= 1) {
        if (this.bursts) this.bursts.spawn(p.x, p.y, p.z, it.color, it.kind === 'arrow' ? 5 : 14, it.kind === 'arrow' ? 1 : 2, 0.8);
        this.parent.remove(it.g);
        it.g.traverse((o) => { if (o.material) { if (o.material.map) o.material.map = null; o.material.dispose(); } });
        this.items.splice(i, 1);
      }
    }
  }
}

/* ---------- สายฟ้าฟาด + คลื่นกระแทก (v0.6) ---------- */
export class Strikes {
  constructor(parent) { this.parent = parent; this.items = []; }

  // สายฟ้าซิกแซกจากฟ้าลงพื้น
  lightning(x, z, color = '#ffe680') {
    const pts = []; let px = x, pz = z;
    for (let i = 0; i <= 10; i++) {
      const y = 7 - i * 0.7;
      pts.push(new THREE.Vector3(px, Math.max(0.05, y), pz));
      px = x + (Math.random() - 0.5) * 0.6 * (1 - i / 10); pz = z + (Math.random() - 0.5) * 0.6 * (1 - i / 10);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const g = new THREE.Group();
    const core = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true }));
    const glowLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
    glowLine.scale.set(1.04, 1, 1.04);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flash.position.set(x, 0.4, z); flash.scale.set(2.6, 2.6, 1);
    g.add(core, glowLine, flash);
    this.parent.add(g);
    this.items.push({ g, t: 0, life: 0.32, mats: [core.material, glowLine.material, flash.material], geo, kind: 'bolt' });
  }

  // วงคลื่นกระแทกขยายออกบนพื้น
  shockwave(x, z, color = '#ffb03a', radius = 2.5) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.06, z);
    this.parent.add(ring);
    this.items.push({ g: ring, t: 0, life: 0.45, mats: [ring.material], geo: ring.geometry, kind: 'ring', radius });
  }

  // หนามรากไม้พุ่งขึ้นจากพื้น (บอส v0.7)
  spikes(x, z, radius = 1.5, color = '#5e4a30', life = 1.5) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const mat = new THREE.MeshStandardMaterial({ color: lin(color), roughness: 0.9 });
    const geo = new THREE.ConeGeometry(0.12, 1, 6).translate(0, 0.5, 0);
    const parts = [];
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
      const m = new THREE.Mesh(geo, mat); m.castShadow = true;
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      m.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
      m.userData.h = 0.6 + Math.random() * 0.8; m.scale.set(1, 0.01, 1);
      g.add(m); parts.push(m);
    }
    this.parent.add(g);
    this.items.push({ g, t: 0, life, mats: [mat], geo, kind: 'spikes', parts });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        this.parent.remove(it.g);
        it.geo.dispose(); for (const m of it.mats) m.dispose();
        this.items.splice(i, 1); continue;
      }
      if (it.kind === 'spikes') {
        const up = Math.min(1, it.t / 0.12), down = k > 0.78 ? 1 - (k - 0.78) / 0.22 : 1;
        for (const m of it.parts) m.scale.set(1, Math.max(0.01, m.userData.h * up * down * (up < 1 ? 1.2 : 1)), 1);
        continue;
      }
      if (it.kind === 'bolt') { const o = k < 0.15 ? 1 : (1 - k) * (Math.random() > 0.3 ? 1 : 0.4); for (const m of it.mats) m.opacity = o; }
      else { const s = 0.3 + (1 - Math.pow(1 - k, 2.5)) * it.radius; it.g.scale.set(s, s, s); it.mats[0].opacity = 0.9 * (1 - k); }
    }
  }
}

/* ---------- วงเตือนท่าโจมตีของบอส: ขอบแดง + พื้นที่ค่อย ๆ เต็มจนถึงเวลาโจมตี (v0.7) ---------- */
export class Telegraphs {
  constructor(parent) { this.parent = parent; this.items = []; }

  spawn(x, z, radius, dur, color = '#ff3a3a') {
    const g = new THREE.Group(); g.position.set(x, 0.07, z);
    const mk = (geo, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; g.add(m); return m; };
    const ring = mk(new THREE.RingGeometry(radius * 0.93, radius, 56), 0.9);
    const fill = mk(new THREE.CircleGeometry(radius, 56), 0.16);
    const grow = mk(new THREE.CircleGeometry(radius, 56), 0.32);
    grow.scale.setScalar(0.01); grow.position.y = 0.005;
    this.parent.add(g);
    this.items.push({ g, t: 0, dur, ring, fill, grow });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = Math.min(1, it.t / it.dur);
      it.grow.scale.setScalar(Math.max(0.01, k));
      it.ring.material.opacity = 0.6 + Math.sin(it.t * 18) * 0.3;
      if (it.t >= it.dur) {
        this.parent.remove(it.g);
        it.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.items.splice(i, 1);
      }
    }
  }
}
