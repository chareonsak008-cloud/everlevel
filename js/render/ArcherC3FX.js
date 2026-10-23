// v0.85 สกิลนักธนูถักศาสตรา (นักธนูคลาส 3): ศาสตราก่อตัวจากเส้นโครงแสงสีฟ้า · ดาบคู่ขาวดำ · ม่านกลีบแสง · สมรภูมิพันศาสตรา
// fx_e3_* · ดาเมจ/จังหวะจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/MageFX/MageC3FX
import { THREE } from './three.js?v=0.93.0-p1.3';
import * as TX from './FxTextures.js?v=0.93.0-p1.3';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k) => { const c1 = 1.7; return 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const smooth = (k) => k * k * (3 - 2 * k);
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

const TRACE = { deep: '#0a2a5a', main: '#2a9cff', mid: '#6ac8ff', light: '#bfe8ff', hot: '#f0faff', smoke: '#1a2a3a', acc: '#ffffff' };
const FIRE = { deep: '#5a1404', main: '#ff6a1a', mid: '#ff9a3a', light: '#ffd27a', hot: '#fff2d0', smoke: '#3a1a10', acc: '#ffe08a' };
const AIAS = { deep: '#4a1040', main: '#ff6ac8', mid: '#ff9ad8', light: '#ffd0ee', hot: '#fff0fa' };

const cache = new Map();
function tex(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t;
}
// กลีบโล่: วงรีปลายแหลม ขอบสว่าง เส้นใบ
const petalTex = () => tex('e3petal', 256, (g, s) => {
  const path = () => { g.beginPath(); g.moveTo(s / 2, s * 0.98); g.bezierCurveTo(s * 0.02, s * 0.7, s * 0.12, s * 0.12, s / 2, s * 0.02); g.bezierCurveTo(s * 0.88, s * 0.12, s * 0.98, s * 0.7, s / 2, s * 0.98); g.closePath(); };
  const gr = g.createLinearGradient(0, s, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0.55)');
  g.fillStyle = gr; path(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 8; g.shadowColor = '#fff'; g.shadowBlur = 10; path(); g.stroke();
  g.lineWidth = 3; g.shadowBlur = 0; g.beginPath(); g.moveTo(s / 2, s * 0.92); g.lineTo(s / 2, s * 0.12); g.stroke();
  for (let i = 1; i < 5; i++) { const y = s * (0.85 - i * 0.15); g.beginPath(); g.moveTo(s / 2, y); g.quadraticCurveTo(s * 0.3, y - s * 0.06, s * 0.2, y - s * 0.14); g.moveTo(s / 2, y); g.quadraticCurveTo(s * 0.7, y - s * 0.06, s * 0.8, y - s * 0.14); g.stroke(); }
});
// เฟืองสำริดบนฟ้า
const gearTex = (n) => tex('e3gear' + n, 256, (g, s) => {
  const c = s / 2, ro = c * 0.95, ri = c * 0.8; g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a0 = (i / (n * 2)) * TAU, a1 = ((i + 1) / (n * 2)) * TAU; g.arc(c, c, i % 2 ? ri : ro, a0 + 0.02, a1 - 0.02); }
  g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c, c, c * 0.6, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over'; g.lineWidth = s * 0.06; g.strokeStyle = '#fff';
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.62, c + Math.sin(a) * c * 0.62); g.stroke(); }
  g.beginPath(); g.arc(c, c, c * 0.18, 0, TAU); g.fill();
});

export function installArcherC3FX(P) {
  /* ---------- อาวุธจำลอง (เส้นโครงฟ้า → ของจริง) ---------- */
  // สร้างกลุ่มจากรายการ [geometry, สี, emissive] — แต่ละชิ้นมีทั้งเนื้อทึบและโครงเส้น · g.userData.trace(k) 0→1 = ก่อตัว
  P.e3Build = function (parts, s = 1) {
    const g = new THREE.Group(), solids = [], wires = [];
    for (const [geo, col, em] of parts) {
      const sm = new THREE.MeshStandardMaterial({ color: col, emissive: em || col, emissiveIntensity: 0.35, metalness: 0.65, roughness: 0.3, flatShading: true, transparent: true, opacity: 0 });
      const wm = new THREE.MeshBasicMaterial({ color: TRACE.mid, wireframe: true, transparent: true, opacity: 0, blending: ADD, depthWrite: false });
      const a = new THREE.Mesh(geo, sm), b = new THREE.Mesh(geo, wm); b.scale.setScalar(1.04); g.add(a, b); solids.push(sm); wires.push(wm);
    }
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), TRACE.mid, 0)); glow.scale.setScalar(1.1); g.add(glow);
    g.userData.trace = (k) => {   // 0–0.5 เส้นโครงปรากฏ · 0.35–1 เนื้อจริงเติมเต็ม เส้นโครงจางลง
      const w = smooth(Math.min(1, k / 0.4)) * (1 - smooth(Math.max(0, (k - 0.55) / 0.45)) * 0.85), sld = smooth(Math.max(0, (k - 0.35) / 0.65));
      wires.forEach((m) => { m.opacity = 0.95 * w; }); solids.forEach((m) => { m.opacity = sld; m.transparent = sld < 0.99; }); glow.material.opacity = 0.6 * w + 0.25 * sld;
    };
    g.userData.trace(0); g.scale.setScalar(s);
    return g;
  };
  // ดาบยาวธรรมดา (แกน +z = ปลาย)
  P.e3Sword = function (s = 1) {
    if (!this.geo.e3blade) {
      this.geo.e3blade = new THREE.BoxGeometry(0.13, 0.03, 1.0, 1, 1, 4).translate(0, 0, 0.1);
      this.geo.e3tip = new THREE.ConeGeometry(0.09, 0.3, 4).rotateX(Math.PI / 2).translate(0, 0, 0.75);
      this.geo.e3guard = new THREE.BoxGeometry(0.4, 0.06, 0.06).translate(0, 0, -0.42);
      this.geo.e3grip = new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6).rotateX(Math.PI / 2).translate(0, 0, -0.6);
    }
    const metal = ['#dfe6f2', '#c8d4e8', '#e8d8b0', '#b8c0d8'][(Math.random() * 4) | 0];
    return this.e3Build([[this.geo.e3blade, metal], [this.geo.e3tip, metal], [this.geo.e3guard, '#8a6a3a', '#3a2a10'], [this.geo.e3grip, '#3a2a2a', '#100808']], s);
  };
  // ดาบสั้นโค้ง (ขาว/ดำ) ลายคลื่นตามใบ · แกน +z = ปลาย
  P.e3Falchion = function (white, s = 1) {
    const key = 'e3fal';
    if (!this.geo[key]) {
      const sh = new THREE.Shape(); sh.moveTo(-0.05, -0.45); sh.lineTo(0.06, -0.45); sh.quadraticCurveTo(0.2, 0.05, 0.12, 0.55); sh.quadraticCurveTo(0.05, 0.25, -0.05, 0.1); sh.closePath();
      this.geo[key] = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0, 0.05);
      this.geo[key + 'g'] = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6).rotateX(Math.PI / 2).translate(0, 0, -0.5);
      this.geo[key + 'r'] = new THREE.TorusGeometry(0.08, 0.02, 6, 12).translate(0, 0, -0.45);
    }
    return this.e3Build([[this.geo[key], white ? '#f2f4fa' : '#1a1a24', white ? '#8ab8ff' : '#3a0a10'], [this.geo[key + 'g'], white ? '#c8d4e8' : '#2a2a30'], [this.geo[key + 'r'], white ? '#6ac8ff' : '#e83a3a', white ? '#2a9cff' : '#a81a1a']], s);
  };
  // ศรดาบเกลียว: กรวยสามเหลี่ยมยาวที่บิดเป็นเกลียว · แกน +z = ปลาย
  P.e3Spiral = function (s = 1) {
    if (!this.geo.e3spiral) {
      const geo = new THREE.ConeGeometry(0.16, 1.8, 3, 24); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = (y + 0.9) * 4.2, x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * Math.cos(a) - z * Math.sin(a), y, x * Math.sin(a) + z * Math.cos(a)); }
      geo.computeVertexNormals(); this.geo.e3spiral = geo.rotateX(Math.PI / 2).translate(0, 0, 0.3);
      this.geo.e3spgrip = new THREE.CylinderGeometry(0.035, 0.035, 0.4, 6).rotateX(Math.PI / 2).translate(0, 0, -0.75);
    }
    return this.e3Build([[this.geo.e3spiral, '#c8dcff', '#4a7aff'], [this.geo.e3spgrip, '#2a2a3a']], s);
  };

  // ก่อตัวอาวุธที่ตำแหน่ง from (เส้นโครง → ของจริง) แล้วพุ่งเร่งความเร็วไปยัง to · คืนเวลาทั้งหมด
  // spinY = หมุนแบบบูมเมอแรงรอบแกนตั้งของอาวุธ (เรเดียน/วิ) · tilt = เอียงหน้าใบเข้าหากล้อง
  P.e3Launch = function (obj, from, to, { trace = 0.3, hold = 0.05, fly = 0.18, arc = 0, spin = 0, spinY = 0, tilt = 0, stick = false, trail = TRACE, onHit = null } = {}) {
    const dest = typeof to === 'function' ? to : () => to, w = this.add(obj), start = V();
    w.position.copy(from); w.lookAt(dest());
    this.anim(trace + hold, (k, dt, t) => {
      const e = Math.min(1, t / trace); w.userData.trace(e); w.lookAt(dest());
      if (Math.random() < 0.5 * (1 - e)) this.fx.emit({ pos: w.position, count: 1, spread: 0.3 * w.scale.x, speed: 0.3, life: 0.3, size: [0.1, 0.18], color: [TRACE.light, TRACE.mid] });
    }, () => {
      start.copy(w.position); const side = V().crossVectors(dest().clone().sub(start), V(0, 1, 0)).normalize();
      this.anim(fly, (k, dt, tt) => {
        const kk = k * (0.35 + 0.65 * k), p = start.clone().lerp(dest(), kk).addScaledVector(side, Math.sin(k * Math.PI) * arc).add(V(0, Math.sin(k * Math.PI) * Math.abs(arc) * 0.3, 0));
        const ahead = start.clone().lerp(dest(), Math.min(1, kk + 0.05)).addScaledVector(side, Math.sin(Math.min(1, k + 0.05) * Math.PI) * arc);
        w.position.copy(p); w.lookAt(ahead); if (spin) w.rotateZ(spin * k * 10);
        if (tilt) w.rotateX(tilt); if (spinY) w.rotateY(spinY * tt);
        this.fx.emit({ pos: p, count: 2, spread: 0.04, speed: 0.12, life: [0.15, 0.28], size: [0.14, 0.24], sizeEnd: 0.1, color: [trail.hot, trail.light, trail.mid], colorEnd: trail.main });
      }, () => {
        const p = dest().clone();
        if (stick) { w.position.copy(p); this.anim(0.7, (k) => { w.scale.setScalar(w.userData.s0 * (k > 0.6 ? 1 - smooth((k - 0.6) / 0.4) : 1)); }, () => this.remove(w)); } else this.remove(w);
        if (onHit) onHit(p);
      });
    });
    obj.userData.s0 = obj.scale.x;
    return trace + hold + fly;
  };

  const aimDir = (c) => { const t = c.targets[c.main], d = t ? t.pos.clone().sub(c.caster.pos).setY(0) : c.caster.facing.clone(); return d.lengthSq() < 1e-4 ? c.caster.facing.clone().setY(0).normalize() : d.normalize(); };
  const camRight = (self) => (self.camera ? V().setFromMatrixColumn(self.camera.matrixWorld, 0).setY(0).normalize() : V(1, 0, 0));

  /* ================= 1 · ศรดาบเกลียวทะลวง ================= */
  P.fx_e3_spiral = function (c) {
    const end = this.fx_nf(c), { t, tp } = this.swTarget(c, 6), to = t ? () => this.hitPos(t) : () => tp;
    this.swCharge(c, TRACE, 0.4, 30);
    // วงเวทเกลียวเล็กหน้ามือ + ศรก่อตัวบนคันธนู
    const from = this.hand(c).addScaledVector(aimDir(c), 0.5);
    this.disc(V(c.caster.pos.x, 0, c.caster.pos.z), TX.runeCircle('hex'), TRACE.mid, 2.4, 0.9, { spin: 2, opacity: 0.7 });
    this.e3Launch(this.e3Spiral(1.9), from, to, { trace: 0.35, hold: 0.1, fly: 0.17, spin: 1.2, onHit: (p) => {
      // ระเบิดอาวุธ (ปลดปล่อยพลังเกลียว)
      this.mgBlast(p, { ...TRACE, deep: '#1a2a6a' }, 1.6, c, 2, { crack: false });
      for (let i = 0; i < 3; i++) this.after(i * 0.05, () => this.ring(p.clone(), i ? TRACE.mid : TRACE.hot, 0.2, 1.6 + i * 0.4, 0.4, { vertical: true }));
    } });
    return Math.max(end, 1.1);
  };

  /* ================= 2 · ดาบคู่ปีกกระเรียน ================= */
  // วงแสงหมุนติดใต้ใบดาบ (เหมือนภาพเบลอตอนหมุน) — อยู่ในระนาบเดียวกับใบ จึงหมุนไปพร้อมกัน
  P.e3SpinTrail = function (blade, col, size = 1.5) {
    for (const [c2, sc, op, blending] of [['#120c18', 1.06, 0.25, NORMAL], [col, 1, 0.55, ADD]]) {
      const m = new THREE.Mesh(this.geo.plane, this.basic(c2, { tex: TX.crescent(), opacity: op, blending })); m.rotation.x = -Math.PI / 2; m.scale.setScalar(size * sc); m.renderOrder = 5; blade.add(m);
    }
    return blade;
  };

  // X-cut: เส้นฟันสองเส้นไขว้กันที่จุดโดน (ขาว-ฟ้า กับ แดง-ดำ) ตั้งฉากกับมุมกล้อง
  P.e3XCut = function (p, size, delay = 0) {
    const r = camRight(this), up = V(0, 1, 0), a = r.clone().add(up).normalize().multiplyScalar(size / 2), b = r.clone().sub(up).normalize().multiplyScalar(size / 2);
    this.swLine(p.clone().sub(a), p.clone().add(a), TRACE, 0.3 * size, 0.42, delay);
    this.swLine(p.clone().sub(b), p.clone().add(b), { deep: '#1a0408', main: '#e83a4a', hot: '#ffe0e0' }, 0.3 * size, 0.42, delay + 0.03);
  };

  P.fx_e3_twin_blades = function (c) {
    const end = this.fx_nf(c), { t, tp } = this.swTarget(c, 5), to = t ? () => this.hitPos(t) : () => tp, r = camRight(this);
    const RED = { hot: '#ffd0d0', light: '#ff7a7a', mid: '#c83a4a', main: '#6a1a2a' };
    // ก่อตัวคู่ดาบในมือสองข้าง → ขว้างหมุนแบบบูมเมอแรง โค้งออกกว้างแล้วตีวงเข้าหากันที่เป้าพร้อมกัน (โดนที่ 0.55 / 0.75 / 0.95 วิ)
    const throwPair = (L, scale, arc, final) => [-1, 1].forEach((side) => this.after(L, () => {
      const from = this.hand(c).addScaledVector(r, side * 0.45).add(V(0, 0.1, 0)), white = side > 0;
      const blade = this.e3SpinTrail(this.e3Falchion(white, scale), white ? TRACE.mid : '#e83a4a', 1.05);
      this.e3Launch(blade, from, to, { trace: final ? 0.12 : 0.15, hold: 0.03, fly: 0.32, arc: side * arc, spinY: side * 26, tilt: -0.45, trail: white ? TRACE : RED, onHit: (p) => {
        if (!white) return;   // คู่มาถึงพร้อมกัน → เอฟเฟกต์จุดโดนทำครั้งเดียว
        this.e3XCut(p, final ? 4.2 : 2.8);
        this.star(p, TRACE.hot, final ? 3 : 1.8, 0.25); this.mgUnder(p, TRACE, final ? 3 : 1.8, 0.35, 0.5);
        this.sparks(p, [TRACE.hot, '#ff8a8a', TRACE.light], final ? 40 : 18, final ? 7 : 5);
        if (final) { this.mgBlast(p, TRACE, 1.4, c, 2, { crack: false }); this.ring(V(p.x, 0, p.z), '#ff8a8a', 0.3, 3, 0.5); }
      } });
    }));
    throwPair(0.05, 2.4, 1.3); throwPair(0.25, 2.4, 1.7); throwPair(0.45, 2.4, 1.1);
    throwPair(0.81, 3.6, 2.0, true);   // คู่สุดท้ายขยายเป็นดาบปีกนกยักษ์ (โดนที่ 1.28 วิ)
    return Math.max(end, 1.7);
  };

  /* ================= 3 · โล่บุปผาเจ็ดกลีบ ================= */
  P.fx_e3_aegis = function (c) {
    const end = this.fx_nf(c), dir = aimDir(c), T = petalTex();
    const center = () => c.caster.pos.clone().setY(1.0 * this.vs).addScaledVector(dir, 0.9 * this.vs);
    const petals = Array.from({ length: 7 }, (_, i) => {
      const g = new THREE.Group();
      const dark = new THREE.Mesh(this.geo.plane, this.basic(AIAS.deep, { tex: T, opacity: 0, blending: NORMAL })); dark.scale.set(1.04, 1.04, 1); dark.renderOrder = 6;
      const main = new THREE.Mesh(this.geo.plane, this.basic(AIAS.main, { tex: T, opacity: 0 })); main.renderOrder = 7;
      const edge = new THREE.Mesh(this.geo.plane, this.basic(AIAS.hot, { tex: T, opacity: 0 })); edge.scale.setScalar(0.8); edge.renderOrder = 8;
      for (const m of [dark, main, edge]) m.position.y = 0.5;   // โคนกลีบที่กึ่งกลางดอก
      g.add(dark, main, edge); this.add(g); return { g, mats: [[dark, 0.45], [main, 0.75], [edge, 0.6]], a: (i / 7) * TAU };
    });
    const core = this.add(new THREE.Sprite(this.spriteMat(TX.star4(), AIAS.hot, 0)));
    this.anim(2.2, (k, dt, t) => {
      const C = center(), fade = 1 - smooth(Math.max(0, (t - 1.8) / 0.4));
      petals.forEach((P0, i) => {
        const o = easeOutBack(Math.min(1, Math.max(0, (t - i * 0.06) / 0.32))), g = P0.g;
        const camB = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 2).normalize() : V(0, 1, 1).normalize();
        // หันระหว่างทิศศัตรูกับกล้อง → เห็นดอกเต็ม · ขนาดตามตัวละคร (vs)
        g.position.copy(C); g.lookAt(C.clone().add(dir.clone().multiplyScalar(0.55).add(camB).normalize()));
        g.rotateZ(P0.a + t * 0.15); g.scale.setScalar(Math.max(0.001, 1.25 * this.vs * o));
        const hit = Math.max(0, 1 - Math.abs(t - 0.9 - i * 0.03) * 8) * 0.4;   // คลื่นแสงวิ่งทั่วกลีบ
        for (const [m, op] of P0.mats) m.material.opacity = (op + hit) * Math.min(1, o) * fade;
      });
      core.position.copy(C); core.scale.setScalar((1.2 + Math.sin(t * 6) * 0.1) * this.vs); core.material.opacity = 0.8 * fade * Math.min(1, t / 0.3); core.material.rotation = t;
      if (Math.random() < 0.4 * fade) this.stars.emit({ pos: C.clone().add(V(rand(-1, 1), rand(-1, 1), rand(-1, 1))), count: 1, speed: 0.3, life: 0.6, size: [0.14, 0.24], color: [AIAS.light, AIAS.hot] });
    }, () => { petals.forEach((P0) => this.remove(P0.g)); this.remove(core); });
    this.after(0.35, () => { this.flash(center(), AIAS.light, 3.5 * this.vs, 0.4); this.ring(center(), AIAS.light, 0.3, 2.4 * this.vs, 0.5, { vertical: true }); });
    return Math.max(end, 2.2);
  };

  /* ================= 4 · ห่าดาบจำลอง ================= */
  P.fx_e3_blade_barrage = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 5);
    this.swCharge(c, TRACE, 0.5, 40);
    this.disc(gp, TX.runeCircle('hex'), TRACE.mid, 6.6, 2.2, { spin: 0.3, opacity: 0.7 });
    this.disc(gp, TX.softDot(), TRACE.deep, 6.6, 2.2, { spin: 0, opacity: 0.35, blending: NORMAL, y: 0.04 });
    // ดาบ 24 เล่มก่อตัวเป็นวงลอยบนฟ้า (เส้นโครงฟ้า) แล้วพุ่งลงทีละเล่มเป็นจังหวะ ปักพื้น
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU * 2 + rand(-0.1, 0.1), r = 1.2 + (i % 3) * 0.9, from = V(gp.x + Math.cos(a) * r, 4.2 + (i % 4) * 0.35, gp.z + Math.sin(a) * r);
      const aa = rand(0, TAU), rr = Math.sqrt(Math.random()) * 3.2, to = V(gp.x + Math.cos(aa) * rr, 0.3, gp.z + Math.sin(aa) * rr);
      this.after(0.2 + i * 0.025, () => this.e3Launch(this.e3Sword(1.9), from, to, { trace: 0.5 + (23 - i) * 0.025 + i * 0.012, hold: 0.02, fly: 0.15, stick: true, onHit: (p) => { this.star(p, TRACE.hot, 1.3, 0.2); this.mgUnder(p, TRACE, 1.4, 0.3, 0.4); this.sparks(p, [TRACE.hot, TRACE.light], 8, 4); this.debris(p, { count: 2, speed: [2, 3] }); } }));
    }
    this.after(1.9, () => this.mgBlast(V(gp.x, 0.6, gp.z), TRACE, 3, c, 2, { crack: true }));
    return Math.max(end, 2.3);
  };

  /* ================= 5 · ไม้ตาย: ทุ่งดาบไร้ขีดจำกัด ================= */
  P.fx_e3_blade_field = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0), { gp } = this.swTarget(c, 5), R = 6.5;
    // 1) วงไฟวิ่งออกจากผู้ร่าย เปลี่ยนพื้นเป็นทุ่งแดงส้ม
    this.disc(P0, TX.softDot(), '#3a1a0a', R * 2.3, 4.2, { spin: 0, opacity: 0.55, blending: NORMAL, y: 0.035, fadeIn: 0.8 });
    this.disc(P0, TX.runeCircle('star'), FIRE.main, 4, 4.0, { spin: 0.2, opacity: 0.6 });
    this.anim(0.9, (k) => {
      const r = 0.5 + R * easeOut(k);
      for (let i = 0; i < 10; i++) { const a = rand(0, TAU); this.smoke.emit({ pos: V(P0.x + Math.cos(a) * r, 0.1, P0.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(1.6, 3), 0), drag: 2, life: [0.35, 0.6], size: [0.5, 0.85], sizeEnd: 0.2, color: [FIRE.main, FIRE.mid], colorEnd: FIRE.deep, alpha: 0.85 }); this.fx.emit({ pos: V(P0.x + Math.cos(a) * r, 0.2, P0.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(2, 3.5), 0), life: [0.3, 0.5], size: [0.25, 0.4], color: [FIRE.hot, FIRE.light] }); }
    });
    this.ring(P0, FIRE.light, 0.5, R, 0.9, { opacity: 0.9 }); this.ring(P0, FIRE.main, 0.5, R * 1.05, 1.0, { opacity: 0.8 });
    // 2) เฟืองสำริดหมุนช้าบนฟ้า + ถ่านไฟลอย
    const gears = [[3.2, -3, 5.2, -2, 14, 0.15], [2.2, 2.6, 5.6, -2.6, 10, -0.22], [1.6, 0.4, 6.4, -3.4, 8, 0.3], [2.6, -0.8, 4.6, -4.2, 12, -0.12]].map(([size, x, y, z, n, sp]) => {
      const s = this.add(new THREE.Sprite(this.spriteMat(gearTex(n), '#c8902a', 0, NORMAL))); s.position.set(P0.x + x, y, P0.z + z); s.userData = { size, sp }; s.renderOrder = 2; return s;
    });
    this.anim(4.2, (k, dt, t) => {
      const v = smooth(Math.min(1, Math.max(0, t - 0.6) / 0.6)) * (1 - smooth(Math.max(0, (t - 3.7) / 0.5)));
      for (const s of gears) { s.scale.setScalar(s.userData.size); s.material.rotation += s.userData.sp * dt; s.material.opacity = 0.55 * v; }
      if (Math.random() < 0.6 * v) { const a = rand(0, TAU), r = rand(1, R); this.fx.emit({ pos: V(P0.x + Math.cos(a) * r, 0.2, P0.z + Math.sin(a) * r), count: 1, vel: () => V(rand(-0.2, 0.2), rand(0.6, 1.2), rand(-0.2, 0.2)), life: [1, 1.6], size: [0.1, 0.16], color: [FIRE.light, FIRE.mid] }); }
    }, () => gears.forEach((s) => this.remove(s)));
    // 3) ดาบนับสิบปักทั่วทุ่ง (ก่อตัวจากเส้นโครงในพื้น)
    const planted = [];
    for (let i = 0; i < 30; i++) {
      const a = rand(0, TAU), r = rand(1.2, R * 0.95), p = V(P0.x + Math.cos(a) * r, 0, P0.z + Math.sin(a) * r), w = this.add(this.e3Sword(1.8));
      w.position.copy(p).add(V(0, 0.75 * 1.8, 0)); w.lookAt(p.clone().add(V(rand(-0.3, 0.3), -1, rand(-0.3, 0.3)))); w.visible = false; planted.push(w);
      this.after(0.5 + (r / R) * 0.5, () => { w.visible = true; this.anim(0.4, (k) => w.userData.trace(k)); this.fx.emit({ pos: p, count: 4, speed: 0.6, up: 0.6, life: 0.4, size: [0.15, 0.25], color: [TRACE.light, FIRE.light] }); });
    }
    // 4) ดาบทั้งทุ่งลอยขึ้นแล้วพุ่งเข้าเป้าทีละเล่ม (2.2–3.1 วิ)
    const shuffled = planted.slice().sort(() => Math.random() - 0.5);
    shuffled.forEach((w, i) => this.after(2.0 + i * 0.03, () => {
      const p0 = w.position.clone(), lift = p0.clone().add(V(0, 1.6 + rand(0, 0.8), 0));
      this.anim(0.18, (k) => { w.position.copy(p0).lerp(lift, easeOut(k)); w.lookAt(V(gp.x, 1, gp.z)); }, () => {
        const to = V(gp.x + rand(-1.2, 1.2), 0.6, gp.z + rand(-1.2, 1.2)), from = w.position.clone();
        this.anim(0.2, (k) => { const kk = k * (0.35 + 0.65 * k); w.position.copy(from).lerp(to, kk); w.lookAt(to.clone().add(to.clone().sub(from))); this.fx.emit({ pos: w.position, count: 2, speed: 0.1, life: 0.22, size: [0.16, 0.26], color: [TRACE.hot, TRACE.light, FIRE.light] }); }, () => { this.star(to, TRACE.hot, 1.4, 0.2); this.mgUnder(to, FIRE, 1.4, 0.3, 0.4); this.remove(w); });
      });
    }));
    // 5) ศรเกลียวยักษ์ปิดฉาก
    this.after(2.95, () => { const from = this.hand(c).add(V(0, 0.5, 0)); this.e3Launch(this.e3Spiral(2.6), from, V(gp.x, 0.8, gp.z), { trace: 0.25, hold: 0.06, fly: 0.2, spin: 1.5, trail: FIRE }); });
    this.after(3.48, () => {
      this.mgBlast(V(gp.x, 0.8, gp.z), FIRE, 4.2, c, 3, { crack: true });
      this.mgBlast(V(gp.x, 1.2, gp.z), TRACE, 2.6, null, 2, { crack: false });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? FIRE.main : FIRE.hot, 0.4, 6 + i * 0.6, 0.8));
    });
    return Math.max(end, 4.3);
  };
}
