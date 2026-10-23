// v0.91 สภาพอากาศ/บรรยากาศตามแผนที่ — ฝน · หิมะเกล็ดใหญ่ · ใบไม้ปลิว · หิ่งห้อยกลางคืน · เถ้าถ่าน
// ทุกอย่างวนรอบจุดที่กล้องมอง (ไม่ต้องกระจายทั้งแผนที่) · ฝนตกเป็นช่วง ๆ ตามเวลาจริง (ทุกคนเห็นตรงกันโดยประมาณ)
import { THREE } from './three.js?v=0.93.0-p1.7';
import { glowTexture } from './Textures.js?v=0.93.0-p1.7';

// rain: ความแรงสูงสุด · rainCycle: คาบ (นาที) และสัดส่วนเวลาที่ฝนตก · leaves: จำนวน · fire: หิ่งห้อยกลางคืน · snow · ash
// v0.93.1 เหลือเฉพาะหิ่งห้อยตอนกลางคืน (เอาใบไม้ ฝน หิมะ เถ้าออกตามที่ขอ)
const CFG = {
  asteria_town: { fire: 34 },
  beginner_field: { fire: 46 },
  whisper_forest: { fire: 60 },
  haunted_forest: { fire: 40, fireCol: '#c2a4ff' },
  crystal_valley: { fire: 30, fireCol: '#bfa8ff' },
};
const BOX = { w: 30, d: 24, h: 9 };
const wrap = (v, c, size) => ((((v - c) % size) + size * 1.5) % size) - size / 2 + c;
const rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ใบไม้พิกเซล 8×8 (สีขาว แล้วย้อมด้วยสีอินสแตนซ์)
function leafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  const rows = ['...##...', '..####..', '.######.', '.######.', '..####..', '...##...', '...#....', '...#....'];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') { g.fillStyle = x < 4 ? '#ffffff' : '#d8d8d8'; g.fillRect(x, y, 1, 1); } }));
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}
// เกล็ดหิมะพิกเซล
function flakeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#8aa6d0';
  for (const [x, y] of [[3, 0], [4, 0], [3, 7], [4, 7], [0, 3], [0, 4], [7, 3], [7, 4], [1, 1], [6, 1], [1, 6], [6, 6]]) g.fillRect(x, y, 1, 1);
  g.fillRect(2, 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(3, 3, 2, 2); g.fillRect(3, 1, 2, 1); g.fillRect(3, 6, 2, 1); g.fillRect(1, 3, 1, 2); g.fillRect(6, 3, 1, 2);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t;
}

export class Weather {
  constructor(parent, mapId, { mobile = false } = {}) {
    const C = this.cfg = CFG[mapId] || {}; this.mobile = mobile; this.t = 0; this.parts = [];
    this.group = new THREE.Group(); this.group.name = 'weather'; parent.add(this.group);
    const K = mobile ? 0.55 : 1;
    if (C.rain) this.makeRain(Math.round(420 * K));
    if (C.snow) this.makeSnow(Math.round(C.snow * K));
    if (C.leaves) this.makeLeaves(Math.max(6, Math.round(C.leaves * K)), C.leafCols);
    if (C.fire) this.makeFireflies(Math.round(C.fire * K), C.fireCol || '#e8ff7a');
    if (C.ash) this.makeAsh(Math.round(C.ash * K));
    this.rainK = 0;
  }

  get raining() { return this.rainK > 0.05; }

  // ฝน: เส้นสั้นเอียง · จุดกระเซ็นที่พื้น
  makeRain(n) {
    const pos = new Float32Array(n * 6), seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed[i * 3] = rnd() * BOX.w; seed[i * 3 + 1] = rnd() * BOX.h; seed[i * 3 + 2] = rnd() * BOX.d; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#b8d4ff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 6; this.group.add(lines);
    const sn = Math.round(n / 6), sp = new Float32Array(sn * 3), sl = new Float32Array(sn);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const smat = new THREE.PointsMaterial({ map: glowTexture(), color: '#dfeaff', size: 0.7, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const spl = new THREE.Points(sg, smat); spl.frustumCulled = false; this.group.add(spl);
    for (let i = 0; i < sn; i++) sl[i] = rnd();
    this.rain = { n, pos, seed, lines, mat, sn, sp, sl, spl, smat, sx: [] };
  }
  makeSnow(n) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed[i * 3] = rnd() * BOX.w; seed[i * 3 + 1] = rnd() * BOX.h; seed[i * 3 + 2] = rnd() * BOX.d; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: flakeTexture(), color: '#ffffff', size: 2.1, transparent: true, opacity: 0.95, alphaTest: 0.3, depthWrite: false, toneMapped: false });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 6; this.group.add(p);
    this.snow = { n, pos, seed, p };
  }
  makeAsh(n) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed[i * 3] = rnd() * BOX.w; seed[i * 3 + 1] = rnd() * BOX.h; seed[i * 3 + 2] = rnd() * BOX.d; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ map: glowTexture(), color: '#ffb070', size: 0.55, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; this.group.add(p);
    // เถ้าสีเทาร่วงลงช้า ๆ
    const pos2 = new Float32Array(n * 3), g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    const m2 = new THREE.PointsMaterial({ color: '#8a8580', size: 0.3, transparent: true, opacity: 0.7, depthWrite: false });
    const p2 = new THREE.Points(g2, m2); p2.frustumCulled = false; this.group.add(p2);
    this.ash = { n, pos, seed, p, pos2 , p2 };
  }
  // ใบไม้: InstancedMesh แผ่นเล็กหมุนควงขณะปลิวลง
  makeLeaves(n, cols) {
    const geo = new THREE.PlaneGeometry(0.62, 0.62);
    const mat = new THREE.MeshBasicMaterial({ map: leafTexture(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.renderOrder = 5;
    const col = new THREE.Color(), seed = [];
    for (let i = 0; i < n; i++) { m.setColorAt(i, col.set(cols[i % cols.length])); seed.push({ x: rnd() * BOX.w, y: rnd() * BOX.h, z: rnd() * BOX.d, sp: 0.5 + rnd() * 0.6, ph: rnd() * 6.28, spin: 1.5 + rnd() * 2.5 }); }
    m.instanceColor.needsUpdate = true; this.group.add(m);
    this.leaves = { n, m, seed, o: new THREE.Object3D() };
  }
  // หิ่งห้อย: จุดเรือง (สีต่อจุด = ความสว่างตอนกะพริบ) · มองเห็นเฉพาะตอนเย็น/กลางคืน
  makeFireflies(n, color) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n), seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed[i * 3] = rnd() * BOX.w; seed[i * 3 + 1] = 0.3 + rnd() * 2.4; seed[i * 3 + 2] = rnd() * BOX.d; ph[i] = rnd() * 6.28; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ map: glowTexture(), size: 1.6, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 7; this.group.add(p);
    this.fire = { n, pos, col, ph, seed, p, c: new THREE.Color(color) };
  }

  // ความแรงฝนตามเวลาจริง: ตกช่วงต้นของทุกคาบ (ค่อย ๆ เริ่ม/หยุด 40 วิ)
  rainLevel(now) {
    const C = this.cfg; if (!C.rain) return 0;
    const [mins, frac] = C.rainCycle || [10, 0.5], per = mins * 60, ph = (now / 1000) % per, on = per * frac, ramp = 40;
    const k = ph < on ? Math.min(1, ph / ramp, (on - ph) / ramp) : 0;
    return Math.max(0, k) * C.rain;
  }

  update(dt, cx, cz, night = 0, now = Date.now(), camQ = null) {
    if (!this.group.visible) return;
    this.t += dt; const t = this.t;
    if (this.rain) {
      const R = this.rain, target = this.rainLevel(now); this.rainK += (target - this.rainK) * Math.min(1, dt * 0.8);
      const k = this.rainK; R.lines.visible = R.spl.visible = k > 0.02;
      if (k > 0.02) {
        R.mat.opacity = 0.42 * k; R.smat.opacity = 0.7 * k;
        const fall = 14, len = 0.55, sl = 0.18, act = Math.floor(R.n * Math.min(1, 0.25 + k));
        for (let i = 0; i < R.n; i++) {
          const o = i * 6;
          if (i >= act) { R.pos[o] = R.pos[o + 3] = 0; R.pos[o + 1] = R.pos[o + 4] = -50; R.pos[o + 2] = R.pos[o + 5] = 0; continue; }
          const y = ((((R.seed[i * 3 + 1] - t * fall) % BOX.h) + BOX.h) % BOX.h);
          const x = wrap(R.seed[i * 3] + y * sl, cx, BOX.w), z = wrap(R.seed[i * 3 + 2], cz, BOX.d);
          R.pos[o] = x; R.pos[o + 1] = y; R.pos[o + 2] = z; R.pos[o + 3] = x - sl * len; R.pos[o + 4] = y + len; R.pos[o + 5] = z;
        }
        R.lines.geometry.attributes.position.needsUpdate = true;
        for (let i = 0; i < R.sn; i++) {
          R.sl[i] -= dt * 3; if (R.sl[i] <= 0) { R.sl[i] = 0.4 + rnd() * 0.5; R.sx[i] = [cx + (rnd() - 0.5) * BOX.w * 0.8, cz + (rnd() - 0.5) * BOX.d * 0.8]; }
          const p = R.sx[i] || [0, 0], vis = R.sl[i] > 0.25 ? 1 : 0;
          R.sp[i * 3] = p[0]; R.sp[i * 3 + 1] = vis ? 0.06 : -50; R.sp[i * 3 + 2] = p[1];
        }
        R.spl.geometry.attributes.position.needsUpdate = true;
      }
    }
    if (this.snow) {
      const W = this.snow;
      for (let i = 0; i < W.n; i++) {
        const sp = 0.7 + (i % 5) * 0.12, y = ((((W.seed[i * 3 + 1] - t * sp) % BOX.h) + BOX.h) % BOX.h);
        W.pos[i * 3] = wrap(W.seed[i * 3] + Math.sin(t * 0.8 + i) * 0.6 + t * 0.35, cx, BOX.w); W.pos[i * 3 + 1] = y; W.pos[i * 3 + 2] = wrap(W.seed[i * 3 + 2] + Math.cos(t * 0.6 + i * 1.3) * 0.5, cz, BOX.d);
      }
      W.p.geometry.attributes.position.needsUpdate = true;
    }
    if (this.ash) {
      const A = this.ash;
      for (let i = 0; i < A.n; i++) {
        const sp = 0.6 + (i % 6) * 0.15, y = ((A.seed[i * 3 + 1] + t * sp) % BOX.h);
        A.pos[i * 3] = wrap(A.seed[i * 3] + Math.sin(t * 1.3 + i) * 0.5, cx, BOX.w); A.pos[i * 3 + 1] = y; A.pos[i * 3 + 2] = wrap(A.seed[i * 3 + 2] + Math.cos(t + i) * 0.4, cz, BOX.d);
        const y2 = ((((A.seed[i * 3 + 2] * 0.37 - t * 0.35 * (0.6 + (i % 4) * 0.2)) % BOX.h) + BOX.h) % BOX.h);
        A.pos2[i * 3] = wrap(A.seed[i * 3 + 2] + t * 0.4 + Math.sin(t * 0.7 + i) * 0.8, cx, BOX.w); A.pos2[i * 3 + 1] = y2; A.pos2[i * 3 + 2] = wrap(A.seed[i * 3], cz, BOX.d);
      }
      A.p.geometry.attributes.position.needsUpdate = true; A.p2.geometry.attributes.position.needsUpdate = true;
    }
    if (this.leaves) {
      const L = this.leaves, o = L.o, gust = 0.6 + Math.sin(t * 0.25) * 0.4;
      for (let i = 0; i < L.n; i++) {
        const s = L.seed[i], y = ((((s.y - t * s.sp) % BOX.h) + BOX.h) % BOX.h);
        o.position.set(wrap(s.x + t * (0.9 + gust) + Math.sin(t * 1.4 + s.ph) * 0.7, cx, BOX.w), y, wrap(s.z + Math.cos(t * 1.1 + s.ph) * 0.5, cz, BOX.d));
        // หันหากล้อง + หมุนควง (พลิกด้วยการบีบแกน x ให้ดูเหมือนใบไม้พลิกตัว)
        if (camQ) o.quaternion.copy(camQ); else o.quaternion.identity();
        o.rotateZ(t * s.spin * 0.7 + s.ph);
        const fl = Math.cos(t * s.spin + s.ph); o.scale.set(0.35 + Math.abs(fl) * 0.65, 1, 1);
        o.updateMatrix(); L.m.setMatrixAt(i, o.matrix);
      }
      L.m.instanceMatrix.needsUpdate = true;
    }
    if (this.fire) {
      const F = this.fire, k = Math.max(0, Math.min(1, (night - 0.15) / 0.5)) * (this.raining ? 0.3 : 1);
      F.p.visible = k > 0.01;
      if (k > 0.01) {
        for (let i = 0; i < F.n; i++) {
          const a = k * (0.55 + Math.pow(Math.max(0, Math.sin(t * 1.7 + F.ph[i] * 3)), 3) * 1.6);
          F.col[i * 3] = F.c.r * a; F.col[i * 3 + 1] = F.c.g * a; F.col[i * 3 + 2] = F.c.b * a;
          F.pos[i * 3] = wrap(F.seed[i * 3] + Math.sin(t * 0.35 + i) * 1.2, cx, BOX.w); F.pos[i * 3 + 1] = F.seed[i * 3 + 1] + Math.sin(t * 0.8 + i * 1.7) * 0.35; F.pos[i * 3 + 2] = wrap(F.seed[i * 3 + 2] + Math.cos(t * 0.3 + i * 0.7) * 1.2, cz, BOX.d);
        }
        F.p.geometry.attributes.position.needsUpdate = true; F.p.geometry.attributes.color.needsUpdate = true;
      }
    }
  }
}
