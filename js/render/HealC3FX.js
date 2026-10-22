// v0.85 สกิลเทพธิดาแห่งแสง (สายฮีลคลาส 3): แสงส้มทอง · ปีกขนนกหลายคู่ · ทรงกลมแสงชำระ
// fx_h3_* · ดาเมจ/ฮีลจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/HealFX/MageFX/MageC3FX
import { THREE } from './three.js?v=0.93.0-p1';
import * as TX from './FxTextures.js?v=0.93.0-p1';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

// แสงรักษาอบอุ่น (ส้มทอง) · แสงชำระ (ขาวทอง)
const WARM = { deep: '#7a3a0a', main: '#ff9a3a', mid: '#ffc070', light: '#ffe6b0', hot: '#fffaf0', gold: '#ffd86a' };
const PURE = { deep: '#6a5a2a', main: '#ffe8a0', mid: '#fff2c8', light: '#fffaf0', hot: '#ffffff', gold: '#ffd86a', smoke: '#6a5a3a' };

const cache = new Map();
function tex(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t;
}
// ตราเทพธิดา: สามกลีบโค้งเกี่ยวกัน (ทริเคทรา) ในวงแหวน + ประกายแปดทิศ
const crestTex = () => tex('h3crest', 512, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 8;
  for (const [r, w] of [[0.96, 6], [0.88, 2], [0.6, 3]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, c * r, 0, TAU); g.stroke(); }
  g.lineWidth = 12;
  for (let i = 0; i < 3; i++) {   // กลีบ: ส่วนโค้งของวงกลมสามวงที่ซ้อนกัน
    const a = (i / 3) * TAU - Math.PI / 2, ox = c + Math.cos(a) * c * 0.2, oy = c + Math.sin(a) * c * 0.2;
    g.beginPath(); g.arc(ox, oy, c * 0.36, a + Math.PI * 0.68, a + Math.PI * 1.32 + Math.PI); g.stroke();
  }
  g.lineWidth = 4;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.64, c + Math.sin(a) * c * 0.64); g.lineTo(c + Math.cos(a) * c * 0.84, c + Math.sin(a) * c * 0.84); g.stroke(); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU + 0.13; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.92, c + Math.sin(a) * c * 0.92, c * 0.012, 0, TAU); g.fill(); }
});

// ปีกขนนกเทพธิดา (สีจริงในภาพ: ขนครีม ปลายทอง เส้นขอบน้ำตาล) — ชี้ออกทางขวา โคนปีกอยู่ซ้ายกลาง
const wingTex = () => tex('h3wing', 512, (g, s) => {
  const root = [s * 0.06, s * 0.6];
  const rows = [[11, 0.95, 0.13, -1.05, 0.2], [9, 0.68, 0.11, -0.7, 0.32], [7, 0.42, 0.09, -0.35, 0.45]];   // ขนแถวนอก → ใน
  for (const [n, L, w, a0, spread] of rows) for (let i = 0; i < n; i++) {
    const a = a0 + (i / (n - 1)) * (1.15 + spread), len = s * L * (1 - i / n * 0.45);
    g.save(); g.translate(root[0], root[1]); g.rotate(a);
    const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, '#fff6e0'); gr.addColorStop(0.7, '#ffffff'); gr.addColorStop(1, '#ffe08a');
    g.fillStyle = gr; g.strokeStyle = '#8a5a20'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -s * w * 0.55, len, 0); g.quadraticCurveTo(len * 0.5, s * w * 0.55, 0, 0); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(200,150,80,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(len * 0.08, 0); g.lineTo(len * 0.92, 0); g.stroke();
    g.restore();
  }
  g.fillStyle = '#fff2d0'; g.strokeStyle = '#8a5a20'; g.lineWidth = 3; g.beginPath(); g.ellipse(root[0] + s * 0.1, root[1] - s * 0.05, s * 0.13, s * 0.09, -0.4, 0, TAU); g.fill(); g.stroke();
});
const glowWingTex = () => tex('h3wingGlow', 256, (g, s) => {
  g.filter = 'blur(10px)'; g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(s * 0.06, s * 0.6); g.quadraticCurveTo(s * 0.4, s * 0.0, s * 0.98, s * 0.12); g.quadraticCurveTo(s * 0.7, s * 0.6, s * 0.5, s * 0.95); g.closePath(); g.fill();
});

export function installHealC3FX(P) {  /* ---------- ตัวช่วย ---------- */
  // ปีกเทพธิดาหลายคู่ (คู่ใหญ่บน + คู่เล็กล่าง) · open = ฟังก์ชัน 0..1 ควบคุมการกาง
  P.h3Wings = function (c, dur, { span = 3.6, pairs = 2, pal = PURE, beat = 4 } = {}) {
    const sets = [];
    for (let p = 0; p < pairs; p++) for (const side of [-1, 1]) {
      const sc = p === 0 ? 1 : p === 1 ? 0.72 : 0.5, y = p === 0 ? 1.7 : p === 1 ? 1.05 : 2.3, tilt = p === 0 ? 0.25 : p === 1 ? -0.45 : 0.85;
      const ms = [[pal.main, 1.18, 0.75, ADD, glowWingTex()], [ '#ffffff', 1, 1, NORMAL, wingTex()]].map(([col, k, op, blending, T]) => {
        const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: T, opacity: 0, blending }))); m.renderOrder = blending === NORMAL ? 4 : 3; m.userData = { k, op }; return m;
      });
      sets.push({ side, sc, y, tilt, ms, d: p * 0.12 });
    }
    this.anim(dur, (k, dt, t) => {
      const q = c.caster.pos, fade = k > 0.85 ? (1 - k) / 0.15 : 1;
      const right = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 0) : V(1, 0, 0), back = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 2).multiplyScalar(-0.35) : V();
      for (const S of sets) {
        const open = easeOut(Math.min(1, Math.max(0, (t - S.d) / 0.5))), flap = Math.sin(t * beat + S.d * 6) * 0.07, sp = span * S.sc;
        for (const m of S.ms) {
          m.position.set(q.x, q.y + S.y * this.vs, q.z).addScaledVector(right, S.side * sp * 0.42 * open).add(back);
          this.swFace(m, S.side * (S.tilt + flap));
          m.scale.set(S.side * sp * m.userData.k * open, sp * 0.95 * m.userData.k * open, 1);   // ภาพปีกโคนอยู่ซ้าย ปลายชี้ขวา → ข้างขวาไม่กลับ ข้างซ้ายกลับด้าน
          m.material.opacity = m.userData.op * fade * Math.min(1, t / 0.15);
        }
      }
      if (Math.random() < 0.6 * fade) this.feathers.emit({ pos: V(q.x + rand(-span * 0.6, span * 0.6), q.y + rand(1.2, 2.8), q.z), count: 1, vel: () => V(rand(-0.4, 0.4), rand(-0.8, -0.2), rand(-0.4, 0.4)), life: [0.9, 1.5], size: [0.26, 0.42], color: [pal.light, WARM.light] });
    }, () => sets.forEach((S) => S.ms.forEach((m) => this.remove(m))));
  };

  // ทรงกลมแสงชำระล้าง: ขยายจากศูนย์กลาง (ทรงกลมสว่าง + เปลือกเข้ม + วงแหวนตั้ง)
  P.h3Sphere = function (pos, r, dur, { pal = PURE } = {}) {
    const shell = this.add(new THREE.Mesh(this.geo.sphere, this.basic(WARM.deep, { opacity: 0, blending: NORMAL, side: THREE.BackSide }))); shell.renderOrder = 4;
    const ball = this.add(new THREE.Mesh(this.geo.sphere, this.basic(pal.main, { opacity: 0 }))); ball.renderOrder = 5;
    const core = this.add(new THREE.Mesh(this.geo.sphere, this.basic(pal.hot, { opacity: 0 }))); core.renderOrder = 6;
    for (const m of [shell, ball, core]) m.position.copy(pos);
    this.anim(dur, (k) => {
      const e = easeOut(Math.min(1, k * 1.6)), fade = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
      shell.scale.setScalar(r * e * 1.04); ball.scale.setScalar(r * e); core.scale.setScalar(r * 0.45 * e);
      shell.material.opacity = 0.35 * fade; ball.material.opacity = 0.5 * fade; core.material.opacity = 0.75 * fade * (1 - k);
    }, () => [shell, ball, core].forEach((m) => this.remove(m)));
    this.ring(pos.clone(), pal.light, r * 0.3, r * 1.2, dur * 0.7, { vertical: true });
    this.ring(V(pos.x, 0, pos.z), WARM.main, r * 0.3, r * 1.3, dur * 0.8);
    this.light(pos, pal.main, 10, dur, r * 4);
  };

  // ลูกแสงรวมระหว่างสองมือ (ชาร์จ)
  P.h3Orb = function (c, dur, size = 0.7, pal = PURE) {
    const halo = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0))), core = this.add(new THREE.Sprite(this.spriteMat(TX.star4(), pal.hot, 0)));
    const dark = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), WARM.deep, 0, NORMAL))); dark.renderOrder = 5;
    this.anim(dur, (k, dt, t) => {
      const p = this.hand(c).add(V(0, 0.25, 0)), s = size * (0.25 + 0.75 * easeOut(k));
      for (const x of [halo, core, dark]) x.position.copy(p);
      halo.scale.setScalar(s * 2.6); core.scale.setScalar(s * 1.8); dark.scale.setScalar(s * 2.2); core.material.rotation = t * 4;
      halo.material.opacity = 0.9; core.material.opacity = 1; dark.material.opacity = 0.45;
      this.fx.emit({ pos: () => p.clone().add(V(rand(-1, 1), rand(-0.6, 1), rand(-1, 1))), count: 2, vel: (i, q) => p.clone().sub(q).multiplyScalar(5), life: 0.2, size: [0.12, 0.22], color: [pal.hot, pal.main] });
    }, () => [halo, core, dark].forEach((x) => this.remove(x)));
  };

  // ตราเทพธิดาบนพื้น/ลอย
  P.h3Crest = function (pos, size, dur, { flat = true, pal = WARM, spin = 0.6 } = {}) {
    if (flat) {
      this.disc(pos, crestTex(), pal.deep, size * 1.04, dur, { spin: -spin * 0.6, opacity: 0.5, blending: NORMAL, y: 0.05 });
      this.disc(pos, crestTex(), pal.main, size, dur, { spin, opacity: 0.95, y: 0.06 });
      this.disc(pos, TX.softRing(), pal.light, size * 1.2, dur * 0.8, { spin: 0, opacity: 0.5, y: 0.07 });
    } else this.sigil(pos, crestTex(), pal.gold || pal.main, size, dur, { rise: 0.3, spin });
  };

  /* ================= 1 · อาร์คแสงชำระ ================= */
  P.fx_h3_ark = function (c) {
    const end = this.fx_nf(c), { t } = this.swTarget(c, 5);
    this.h3Orb(c, 0.4, 0.75);
    this.after(0.4, () => {
      const from = this.hand(c).add(V(0, 0.25, 0)), fixed = from.clone().addScaledVector(c.caster.facing, 6), to = t ? () => this.hitPos(t) : () => fixed;
      const g = new THREE.Group(), halo = new THREE.Sprite(this.spriteMat(TX.softDot(), PURE.main, 0.95)), core = new THREE.Sprite(this.spriteMat(TX.star4(), PURE.hot, 1));
      halo.scale.setScalar(1.9); core.scale.setScalar(1.3); g.add(halo, core);
      this.projectile(g, from, to, 0.16, { arc: 0.3, orient: false, onFly: (p, k, dt) => { core.material.rotation += dt * 10; this.fx.emit({ pos: p, count: 6, spread: 0.1, speed: 0.5, life: [0.25, 0.4], size: [0.3, 0.5], sizeEnd: 0.1, color: [PURE.hot, PURE.main, WARM.mid] }); }, onHit: (tp) => {
        this.mgUnder(tp, WARM, 3.6, 0.6, 0.55);
        this.h3Sphere(tp, 1.4, 0.7);
        this.sparks(tp, [PURE.hot, PURE.main], 40, 6);
        this.h3Crest(V(tp.x, 0, tp.z), 2.4, 0.8);
      } });
    });
    return end;
  };

  /* ================= 2 · ปีกเทพธิดาพิพากษา ================= */
  P.fx_h3_wing_judgement = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4);
    this.h3Wings(c, 1.9, { span: 3.8, pairs: 2, beat: 3 });
    this.h3Crest(gp, 6.4, 1.8, { pal: PURE });
    // ขนนกแสงพุ่งเป็นใบมีด 3 ระลอก
    [0.6, 0.85, 1.1].forEach((t0, wv) => this.after(t0 - 0.2, () => {
      for (let i = 0; i < 9; i++) {
        const q = c.caster.pos, from = V(q.x + rand(-1.8, 1.8), q.y + rand(1.4, 2.8) * this.vs, q.z + rand(-0.4, 0.4)), a = rand(0, TAU), r = Math.sqrt(Math.random()) * 2.8;
        const to = V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r), f = new THREE.Group();
        const s = new THREE.Sprite(this.spriteMat(TX.feather(), PURE.hot, 1)); s.scale.setScalar(0.75); const gl = new THREE.Sprite(this.spriteMat(TX.softDot(), WARM.mid, 0.7)); gl.scale.setScalar(0.9); f.add(gl, s);
        this.after(i * 0.02, () => this.projectile(f, from, to, 0.2, { arc: 1.2, orient: false, onFly: (p) => { this.feathers.emit({ pos: p, count: 1, speed: 0.3, life: 0.35, size: [0.2, 0.3], color: [PURE.light, WARM.light] }); }, onHit: (p) => { this.ring(p, PURE.light, 0.1, 0.8, 0.3); this.star(V(p.x, 0.3, p.z), PURE.hot, 1.3, 0.25); this.mgUnder(V(p.x, 0.3, p.z), WARM, 1.5, 0.3, 0.45); } }));
      }
    }));
    this.after(1.4, () => { this.hlBeam(gp, PURE, 1.4, 0.6, 11); this.mgBlast(V(gp.x, 0.6, gp.z), PURE, 2.8, c, 2, { crack: false }); this.feathers.emit({ pos: V(gp.x, 1.2, gp.z), count: 50, speed: [3, 7], gravity: -1, drag: 1.5, life: [1, 1.6], size: [0.28, 0.45], color: [PURE.hot, WARM.light] }); });
    return Math.max(end, 1.9);
  };

  /* ================= 3 · พรรักษาแห่งเทพธิดา (ฮีลหมู่) ================= */
  P.fx_h3_goddess_heal = function (c) {
    const end = this.fx_nf(c), P0 = () => c.caster.pos.clone().setY(0);
    this.h3Crest(P0(), 5.6, 2.0);
    this.h3Orb(c, 0.35, 0.6, WARM);
    this.after(0.3, () => this.h3Wings(c, 1.6, { span: 2.8, pairs: 1, pal: WARM, beat: 2.5 }));
    this.after(0.35, () => {
      const q = c.caster.pos;
      this.hlDome(() => c.caster.pos, { deep: WARM.deep, main: WARM.main, mid: WARM.mid, light: WARM.light, hot: WARM.hot }, 3.0, 1.5);
      this.flash(V(q.x, 1.4, q.z), WARM.light, 6, 0.6);
      this.h3Crest(V(q.x, 2.7 * this.vs, q.z), 1.8, 1.2, { flat: false, pal: WARM, spin: 1 });
    });
    // แสงอบอุ่นลอยขึ้นต่อเนื่อง + จังหวะฮีลสองครั้ง
    this.after(0.35, () => this.anim(1.5, () => { const q = c.caster.pos, a = rand(0, TAU), r = Math.sqrt(Math.random()) * 2.8; this.fx.emit({ pos: V(q.x + Math.cos(a) * r, 0.1, q.z + Math.sin(a) * r), count: 2, vel: () => V(0, rand(1.2, 2.6), 0), life: [0.7, 1.1], size: [0.2, 0.34], color: [WARM.light, WARM.mid, WARM.hot], colorEnd: WARM.main }); }));
    [0.5, 1.1].forEach((t) => this.after(t, () => { const q = c.caster.pos; this.ring(V(q.x, 0, q.z), WARM.light, 0.3, 3.4, 0.6); this.stars.emit({ pos: V(q.x, 1, q.z), count: 30, speed: [1.5, 3.5], drag: 1.5, life: [0.6, 1], size: [0.2, 0.32], color: [WARM.hot, WARM.light] }); this.light(V(q.x, 1.5, q.z), WARM.main, 6, 0.5, 8); }));
    return Math.max(end, 2.0);
  };

  /* ================= 4 · อ้อมปีกคุ้มครอง (บัฟโล่) ================= */
  P.fx_h3_wing_guard = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0);
    this.h3Crest(P0, 3.8, 1.8, { pal: PURE });
    // ปีกสองข้างโอบห่อตัว (กางออกแล้วหุบมาหน้า)
    const wings = [-1, 1].map((side) => [[PURE.main, 1.18, 0.75, ADD, glowWingTex()], ['#ffffff', 1, 1, NORMAL, wingTex()]].map(([col, k, op, blending, T]) => { const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: T, opacity: 0, blending }))); m.renderOrder = blending === NORMAL ? 8 : 7; m.userData = { k, op, side }; return m; }));
    this.anim(1.4, (k, dt, t) => {
      const q = c.caster.pos, right = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 0) : V(1, 0, 0), fwd = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 2).multiplyScalar(0.4) : V();
      const open = easeOut(Math.min(1, t / 0.35)), wrap = t > 0.4 ? easeOut(Math.min(1, (t - 0.4) / 0.35)) : 0, fade = k > 0.75 ? (1 - k) / 0.25 : 1;
      for (const set of wings) for (const m of set) {
        const u = m.userData, sp = 2.8 * (1 - wrap * 0.35);
        m.position.set(q.x, q.y + 1.3 * this.vs, q.z).addScaledVector(right, u.side * sp * 0.42 * (1 - wrap * 1.55) * open).addScaledVector(fwd, wrap);
        // โอบ: ปีกหมุนตามโคนพับมาด้านหน้า (ความกว้างหดแล้วกลับด้านข้ามหน้าตัว)
        this.swFace(m, u.side * (0.25 + wrap * 0.35));
        m.scale.set(u.side * sp * u.k * open * (1 - wrap * 1.55), sp * 0.95 * u.k * open, 1);
        m.material.opacity = u.op * fade;
      }
    }, () => wings.flat().forEach((m) => this.remove(m)));
    this.after(0.75, () => {
      const q = c.caster.pos;
      this.hlDome(() => c.caster.pos, { deep: WARM.deep, main: PURE.main, mid: PURE.mid, light: PURE.light, hot: PURE.hot }, 1.9, 1.3);
      this.flash(V(q.x, 1.2, q.z), PURE.light, 4.5, 0.4);
      this.feathers.emit({ pos: V(q.x, 1.3, q.z), count: 40, speed: [2, 5], drag: 1.8, life: [0.8, 1.3], size: [0.26, 0.42], color: [PURE.hot, WARM.light] });
      this.ring(V(q.x, 0, q.z), PURE.light, 0.3, 2.8, 0.5);
    });
    return Math.max(end, 1.8);
  };

  /* ================= 5 · ไม้ตาย: เทพธิดาตื่นรู้ ================= */
  P.fx_h3_awakening = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4), mid = c.caster.pos.clone().setY(0).lerp(gp, 0.5);
    this.h3Wings(c, 4.0, { span: 4.6, pairs: 3, beat: 2 });
    this.after(0.1, () => { const q = c.caster.pos; this.pillar(V(q.x, 0, q.z), WARM.main, 0.9, 12, 3.6, { grow: 0.5, opacity: 0.45 }); this.pillar(V(q.x, 0, q.z), PURE.hot, 0.3, 12, 3.4, { grow: 0.45, opacity: 0.5 }); this.h3Crest(c.caster.pos.clone().setY(0), 4, 3.8); });
    this.after(0.3, () => this.h3Crest(gp, 9.5, 3.5, { pal: PURE, spin: 0.3 }));
    // แสงชำระตกลงนับร้อยสาย
    this.after(0.9, () => this.anim(1.6, () => { if (Math.random() < 0.35) { const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 4.2; this.hlBeam(V(gp.x + Math.cos(a) * r, 0, gp.z + Math.sin(a) * r), WARM, rand(0.22, 0.36), 0.35, 10); } }));
    [1.0, 1.4, 1.8, 2.2].forEach((t) => this.after(t, () => this.ring(gp, PURE.light, 0.4, 4, 0.5, { opacity: 0.7 })));
    // ฮีลเพื่อนรอบตัวผู้ร่ายระหว่างทาง (ตรงกับ heals)
    [1.2, 2.2].forEach((t) => this.after(t, () => { const q = c.caster.pos; this.stars.emit({ pos: V(q.x, 0.4, q.z), count: 30, spread: 2, flat: true, vel: () => V(0, rand(1.5, 3), 0), life: [0.7, 1.1], size: [0.2, 0.34], color: [WARM.hot, WARM.light, WARM.mid] }); this.ring(V(q.x, 0, q.z), WARM.light, 0.3, 4, 0.6); }));
    // อาร์คมหึมา: ลูกแสงยักษ์ก่อตัวเหนือเป้า แล้วระเบิดเป็นทรงกลมชำระครอบทั้งวง
    this.after(2.2, () => { const top = V(gp.x, 4.5, gp.z), o = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), PURE.main, 0))), k2 = this.add(new THREE.Sprite(this.spriteMat(TX.star4(), PURE.hot, 0))); o.position.copy(top); k2.position.copy(top); this.anim(0.75, (k, dt, t) => { o.scale.setScalar(1 + k * 4); k2.scale.setScalar(1 + k * 3); o.material.opacity = 0.9; k2.material.opacity = 1; k2.material.rotation = t * 5; this.fx.emit({ pos: () => top.clone().add(V(rand(-3, 3), rand(-2, 2), rand(-3, 3))), count: 3, vel: (i, q) => top.clone().sub(q).multiplyScalar(4), life: 0.25, size: [0.2, 0.34], color: [PURE.hot, WARM.light] }); }, () => { this.remove(o); this.remove(k2); }); });
    this.after(3.0, () => {
      this.hlBeam(gp, PURE, 2.4, 0.9, 14);
      this.h3Sphere(V(gp.x, 1, gp.z), 4.6, 1.2);
      this.mgBlast(V(gp.x, 0.8, gp.z), PURE, 4, c, 3, { crack: false });
      this.feathers.emit({ pos: V(gp.x, 2, gp.z), count: 100, speed: [4, 9], gravity: -1, drag: 1.4, life: [1.2, 2], size: [0.3, 0.5], color: [PURE.hot, WARM.light] });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? WARM.main : PURE.hot, 0.4, 6 + i * 0.6, 0.8));
    });
    return Math.max(end, 4.2);
  };
}
