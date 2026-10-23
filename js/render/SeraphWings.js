// v0.95 ปีกเทวทูต 6 ปีก (เซราฟ) — โมเดล 3 มิติจากแผ่นขนนกวาดด้วยโค้ด (ไม่ใช้ภาพจากที่อื่น)
// · ติดกลางแผ่นหลังตัวละครพิกเซลพอดี: วางบนระนาบเดียวกับแผ่นตัวละคร แล้วยื่นไปด้านหลังตามทิศที่ตัวละครหัน
// · หันตามตัวละครแบบลื่น (หมุนต่อเนื่อง ไม่กระโดด 8 ทิศ) · หันหลังให้กล้อง ปีกอยู่หน้าตัว · หันหน้า ปีกอยู่หลังตัว
// · 3 คู่: คู่บนชูสูงเหนือศีรษะ · คู่กลางกางกว้างที่สุด · คู่ล่างโค้งลงคลุมขา · กระพือคนละจังหวะ เดิน = กระพือเร็วขึ้นและหุบเล็กน้อย
// · รัศมีทองหลังปีก ขนนกแสงร่วงโปรย ประกายทองที่ปลายปีก
// อินเทอร์เฟซเดียวกับ PixelWingSprite: update(dt, ent, dirIdx, camera, visible) · ax/ay (จุดหลังขยับตามท่า) · liftK
import { THREE } from './three.js?v=0.93.0-p2.11';
import { lerpAngle, damp } from '../core/util.js?v=0.93.0-p2.11';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
let TEX = null;
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
// ขนนก 1 เส้น (ฐานอยู่ล่างของภาพ): ทรงใบหอกเรียว ขาวไล่ฟ้าอ่อน ขอบทองที่ปลาย ก้านขนกลาง
function featherTex(kind) {
  return canvasTex(32, 128, (g, w, h) => {
    const tip = kind === 'p' ? 0.04 : 0.1;
    const shape = () => {
      g.beginPath(); g.moveTo(w / 2, h * tip);
      g.bezierCurveTo(w * 0.98, h * 0.22, w * 0.92, h * 0.8, w * 0.58, h - 2);
      g.lineTo(w * 0.42, h - 2);
      g.bezierCurveTo(w * 0.08, h * 0.8, w * 0.02, h * 0.22, w / 2, h * tip); g.closePath();
    };
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (kind === 'p') { gr.addColorStop(0, '#fff2c4'); gr.addColorStop(0.18, '#ffffff'); gr.addColorStop(0.7, '#eaf1ff'); gr.addColorStop(1, '#c8d6f4'); }
    else if (kind === 's') { gr.addColorStop(0, '#fff6dc'); gr.addColorStop(0.25, '#ffffff'); gr.addColorStop(1, '#d8e2f8'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e4ecfc'); }
    g.fillStyle = gr; shape(); g.fill();
    g.strokeStyle = kind === 'p' ? '#c9a24a' : '#a8b8dc'; g.lineWidth = 2.5; shape(); g.stroke();   // ขอบ (ทองที่ขนบินหลัก)
    g.strokeStyle = 'rgba(150,170,210,0.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(w / 2, h * (tip + 0.06)); g.lineTo(w / 2, h - 2); g.stroke();   // ก้านขน
    g.strokeStyle = 'rgba(170,186,220,0.45)'; g.lineWidth = 1;   // ริ้วขน
    for (let y = h * 0.2; y < h * 0.9; y += 9) { g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * 0.18, y - 6); g.moveTo(w / 2, y); g.lineTo(w * 0.82, y - 6); g.stroke(); }
    if (kind === 'p') { const t = g.createLinearGradient(0, 0, 0, h * 0.2); t.addColorStop(0, 'rgba(255,214,110,0.95)'); t.addColorStop(1, 'rgba(255,214,110,0)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = t; g.fillRect(0, 0, w, h * 0.2); g.globalCompositeOperation = 'source-over'; }
  });
}
function glowTex() {
  return canvasTex(128, 128, (g, w) => { const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
}
function haloTex() {
  return canvasTex(256, 256, (g, w) => {
    const c = w / 2; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; g.strokeStyle = `rgba(255,255,255,${i % 2 ? 0.25 : 0.5})`; g.lineWidth = i % 2 ? 2 : 4; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.25, c + Math.sin(a) * c * 0.25); g.lineTo(c + Math.cos(a) * c * (i % 2 ? 0.72 : 0.95), c + Math.sin(a) * c * (i % 2 ? 0.72 : 0.95)); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * 0.5, 0, TAU); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.arc(c, c, c * 0.58, 0, TAU); g.stroke();
  });
}
const textures = () => TEX || (TEX = { p: featherTex('p'), s: featherTex('s'), c: featherTex('c'), glow: glowTex(), halo: haloTex() });

// ปีกขวา 1 ข้าง (กรอบปีก: x ออกด้านข้าง · y ขึ้น · ขนนกห้อยลงจากแขนปีก ปลายปีกชี้ออกนอก)
function buildWing(len, mats) {
  const W = new THREE.Group();
  const arm = (t) => new THREE.Vector3(t * len, Math.sin(t * Math.PI * 0.85) * len * 0.16 - t * t * len * 0.06, 0);
  const plane = (w, h) => { const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, -h / 2, 0); return geo; };   // ฐานขนอยู่ที่จุดหมุน
  const rows = [
    // [ชนิด, จำนวน, t เริ่ม, t จบ, ความยาว (สัดส่วน len) เริ่ม→จบ, มุม (องศา จากชี้ลง) เริ่ม→จบ, z]
    ['p', 9, 0.42, 1.0, 0.52, 0.86, 8, 78, -0.012],
    ['s', 10, 0.04, 0.6, 0.42, 0.56, 0, 16, 0.0],
    ['c', 11, 0.02, 0.9, 0.2, 0.3, 4, 52, 0.012],
  ];
  for (const [k, n, t0, t1, l0, l1, a0, a1, z] of rows) {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1), t = t0 + (t1 - t0) * u;
      const L = len * (l0 + (l1 - l0) * Math.pow(u, 1.2)), Wd = L * (k === 'p' ? 0.24 : k === 's' ? 0.28 : 0.34);
      const m = new THREE.Mesh(plane(Wd, L), mats[k]);
      const p = arm(t); m.position.set(p.x, p.y, z + (i % 2) * 0.003);
      m.rotation.z = THREE.MathUtils.degToRad(a0 + (a1 - a0) * u);   // หมุนจากชี้ลง (−y) ไปทางนอก (+x)
      m.renderOrder = 37; m.frustumCulled = false; W.add(m);
    }
  }
  // ประกายทองที่ปลายปีก (จุดอ้างอิงสำหรับละอองแสง)
  const tip = new THREE.Object3D(); const pt = arm(1); tip.position.set(pt.x + len * 0.25, pt.y - len * 0.55, 0); W.add(tip); W.userData.tip = tip;
  return W;
}

export class SeraphWings {
  constructor(scene, p = {}) {
    this.scene = scene; this.p = p; this.t = Math.random() * 10; this.yaw = null; this.open = 1;
    const T = textures();
    const mk = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.45, depthWrite: true, side: THREE.DoubleSide, toneMapped: false });
    this.mats = { p: mk(T.p), s: mk(T.s), c: mk(T.c) };
    this.root = new THREE.Group(); scene.add(this.root);        // เอียงตามแผ่นตัวละคร (แกนตั้ง = แกนขึ้นของกล้อง แบบเดียวกับสไปรต์)
    this.turn = new THREE.Group(); this.root.add(this.turn);     // หันตามทิศที่ตัวละครหัน
    this.back = new THREE.Group(); this.turn.add(this.back);     // จุดกลางแผ่นหลัง
    const S = p.scale || 1;
    // 3 คู่: [ชื่อ, สูงจากหลัง, ความยาว, มุมยกแขนปีก (องศา), เอียงไปหลัง (องศา), เฟส]
    const PAIRS = [['up', 0.2, 1.05, 52, 26, 0.0], ['mid', 0.02, 1.32, 12, 18, 0.35], ['low', -0.2, 0.86, -30, 12, 0.7]];
    this.pairs = PAIRS.map(([name, y, len, raise, sweep, ph]) => {
      const sides = [1, -1].map((s) => {
        const pivot = new THREE.Group(); pivot.position.set(s * 0.07 * S, y * S, -0.02 * S); this.back.add(pivot);
        const w = buildWing(len * S, this.mats); if (s < 0) w.scale.x = -1;
        pivot.add(w);
        return { pivot, w, s };
      });
      return { name, raise: THREE.MathUtils.degToRad(raise), sweep: THREE.MathUtils.degToRad(sweep), ph, sides };
    });
    // รัศมีทองหลังปีก
    const sp = (map, color, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.scale.set(size, size, 1); s.renderOrder = 36; this.back.add(s); return s; };
    this.glow = sp(T.glow, new THREE.Color('#ffe9b0'), 3.4 * S, 0.45); this.glow.position.set(0, 0.25 * S, -0.1 * S);
    this.halo = sp(T.halo, new THREE.Color('#ffd76a'), 1.5 * S, 0.55); this.halo.position.set(0, 0.95 * S, -0.08 * S);
    // ขนนกแสงร่วง (จุดในพื้นที่โลก)
    this.N = 26; this.pos = new Float32Array(this.N * 3); this.vel = []; this.life = new Float32Array(this.N);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: T.glow, color: '#fff1b8', size: 0.55, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.pts.frustumCulled = false; this.pts.renderOrder = 39; scene.add(this.pts);
    for (let i = 0; i < this.N; i++) { this.vel.push(new THREE.Vector3()); this.life[i] = 0; this.pos[i * 3 + 1] = -99; }
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3(); this._w = new THREE.Vector3(); this.spawn = 0;
  }

  update(dt, ent, dirIdx, camera, visible) {
    const on = !!visible && !ent.dead;
    this.root.visible = on; this.pts.visible = on;
    if (!on) return;
    const S = this.p.scale || 1;
    this.t += dt;
    // ทิศ: หมุนตามทิศที่ตัวละครหันแบบลื่น (หน่วงเล็กน้อย)
    const target = ent.angle || 0;
    this.yaw = this.yaw == null ? target : lerpAngle(this.yaw, target, damp(10, dt));
    // ตำแหน่ง: ระนาบเดียวกับแผ่นตัวละคร (ดันเข้าหากล้อง 0.5 แบบเดียวกับ SheetSprite) · สูงระดับสะบัก
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    const push = 0.5, k = (dist - push) / dist;
    this.root.position.copy(foot).addScaledVector(toCam, push);
    this.root.scale.setScalar(k);
    // แผ่นตัวละครหันหากล้อง (เอนไปด้านหลังตามมุมก้มกล้อง) → ปีกเอนตามแกนเดียวกัน ไม่ทะลุมาหน้าตัว
    this.root.quaternion.setFromUnitVectors(UP, this._w.set(0, 1, 0).applyQuaternion(camera.quaternion));
    this.turn.rotation.set(0, this.yaw, 0);
    // จุดหลัง: สูงระดับสะบัก + ขยับตามท่าของแผ่นตัวละคร (ax/ay เป็นแกนจอ → แปลงเป็นแกนโลกคร่าว ๆ ผ่านกล้อง)
    const lift = (this.p.lift ?? 1.75) * (this.liftK || 1);
    this.back.position.set(0, lift + (this.ay || 0), -0.16 * S);
    // จุดหลังขยับตามท่า (แกนขวาของจอ) → แปลงเข้ากรอบที่หันตามตัว
    if (this.ax) { this._w.set(this.ax, 0, 0).applyAxisAngle(UP, -this.yaw); this.back.position.x += this._w.x; this.back.position.z += this._w.z; }
    // กระพือ: แต่ละคู่คนละจังหวะ · เดิน = เร็วขึ้นและหุบเข้าเล็กน้อย
    const mv = (ent.moving ?? ent.mv) ? 1 : 0;
    this.open += ((mv ? 0.86 : 1) - this.open) * damp(4, dt);
    const sp = mv ? 2.6 : 1.5;
    for (const P of this.pairs) {
      const f = Math.sin(this.t * sp * TAU * 0.5 + P.ph * TAU);
      for (const { pivot, s } of P.sides) {
        pivot.rotation.set(0, 0, 0);
        pivot.rotateY(s * (P.sweep * (2 - this.open) + f * 0.12));   // เอียงไปด้านหลัง (หุบมากขึ้นเมื่อเดิน)
        pivot.rotateZ(s * (P.raise * this.open + f * 0.16));           // ยกขึ้น/ลงตามจังหวะกระพือ
      }
    }
    this.glow.material.opacity = 0.32 + 0.1 * Math.sin(this.t * 2.2);
    this.halo.material.rotation = this.t * 0.4; this.halo.material.opacity = 0.45 + 0.15 * Math.sin(this.t * 3);
    // ขนนกแสงร่วงจากปลายปีก
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.12;
      const i = (Math.random() * this.N) | 0, P = this.pairs[(Math.random() * 3) | 0], sd = P.sides[(Math.random() * 2) | 0];
      sd.w.userData.tip.getWorldPosition(this._w);
      this.pos[i * 3] = this._w.x; this.pos[i * 3 + 1] = this._w.y; this.pos[i * 3 + 2] = this._w.z;
      this.vel[i].set((Math.random() - 0.5) * 0.3, -0.35 - Math.random() * 0.3, (Math.random() - 0.5) * 0.3); this.life[i] = 1.6 + Math.random();
    }
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -99; continue; }
      this.life[i] -= dt; const v = this.vel[i];
      this.pos[i * 3] += (v.x + Math.sin(this.t * 3 + i) * 0.2) * dt; this.pos[i * 3 + 1] += v.y * dt; this.pos[i * 3 + 2] += v.z * dt;
    }
    this.pts.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.root); this.scene.remove(this.pts);
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); });
    for (const m of Object.values(this.mats)) m.dispose();
    this.pts.geometry.dispose(); this.pts.material.dispose();
  }
}
