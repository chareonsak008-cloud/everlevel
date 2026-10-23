// v0.67 สกิลสายดาบชุดใหม่ วาดเป็นเอฟเฟกต์ 3 มิติในฉากจริง (แทน sprite sheet มุมข้าง v0.64)
// ทุกชิ้นวางตามตำแหน่ง/ทิศจริงของผู้เล่นกับเป้า → ไม่ลอย ไม่เอียง ขนาดตามโลก · ดาเมจ/ฮีลยังมาจาก sk.nf ผ่าน fx_nf (จังหวะเดิม)
// สีสด: ทุกรอยฟันมีชั้นรองสีเข้มแบบผสมปกติ (อ่านออกบนพื้นหญ้า/ทรายสว่าง) + ชั้นเรืองแสงแบบบวกแสง 2 ชั้น
import { THREE } from './three.js?v=0.93.0-p2.14';
import * as TX from './FxTextures.js?v=0.93.0-p2.14';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const NORMAL = THREE.NormalBlending;

const FIRE = { deep: '#8a1606', main: '#ff4a12', mid: '#ff8a2a', light: '#ffc45a', hot: '#fff2c8', smoke: '#4a2a22' };
const STORM = { deep: '#0e1a66', main: '#2a5cff', mid: '#3a9cff', light: '#6cc8ff', hot: '#e4f6ff', acc: '#a868ff' };

export function installSwordFX(P) {
  /* ---------- ตัวช่วย ---------- */
  // เป้าหลัก (จุดโดน / พื้น) — ไม่มีเป้าใช้จุดหน้าผู้เล่น 2 ช่อง
  P.swTarget = function (c, ahead = 2) {
    const t = c.targets[c.main];
    if (t) return { t, tp: this.hitPos(t), gp: V(t.pos.x, 0, t.pos.z) };
    const gp = c.caster.pos.clone().setY(0).addScaledVector(c.caster.facing, ahead);
    return { t: null, tp: gp.clone().setY(1 * this.vs), gp };
  };

  // มุมของทิศ (โลก) เมื่อมองบนจอ (เรเดียน ทวนเข็มจากแกนขวา)
  P.swScreenAngle = function (pos, dir) {
    if (!this.camera) return 0;
    const a = pos.clone().project(this.camera), b = pos.clone().add(dir).project(this.camera);
    return Math.atan2(b.y - a.y, (b.x - a.x) * (this.camera.aspect || 1));
  };
  // แผ่นหันหากล้องเสมอ (ไม่เห็นเป็นเส้นบางตอนฟันด้านข้าง) หมุนในจอด้วยมุม rot
  P.swFace = function (m, rot) {
    if (this.camera) m.quaternion.copy(this.camera.quaternion);
    m.rotateZ(rot);
  };

  // รอยฟันหนา 4 ชั้น: ชั้นสีเข้ม (ผสมปกติ อ่านออกบนพื้นสว่าง) + สีหลัก + สีอ่อน + แกนขาวร้อน · หันหากล้อง โค้งไปทางที่ฟัน
  P.swSlash = function (pos, facing, pal, size, tilt, delay = 0, dur = 0.32) {
    this.after(delay, () => {
      const base = this.swScreenAngle(pos, facing) + tilt;
      const layers = [[pal.deep, 1.1, 0.8, NORMAL], [pal.main, 1.0, 1, THREE.AdditiveBlending], [pal.light, 0.9, 1, THREE.AdditiveBlending], [pal.hot, 0.74, 1, THREE.AdditiveBlending]];
      for (const [col, sc, op, blending] of layers) {
        const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.crescent(), opacity: 0, blending })));
        m.position.copy(pos); m.renderOrder = blending === NORMAL ? 8 : 9;
        this.anim(dur, (k) => { this.swFace(m, base + 0.9 * easeOut(k) - 0.45); m.scale.setScalar(size * sc * (0.7 + 0.45 * easeOut(k))); m.material.opacity = op * (1 - easeIn(k)); }, () => this.remove(m));
      }
      this.fx.emit({ pos, count: 26, vel: () => V(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(rand(3, 8)).addScaledVector(facing, 4), drag: 3, life: [0.2, 0.45], size: [0.1, 0.22], color: [pal.hot, pal.light, pal.mid], colorEnd: pal.main });
    });
  };

  // เส้นฟันตรงยาว (หันหากล้อง) — ใช้กับฟันทะลวง/ตาข่ายฟัน
  P.swLine = function (a, b, pal, width = 0.22, dur = 0.35, delay = 0) {
    this.after(delay, () => {
      const mid = a.clone().lerp(b, 0.5), len = a.distanceTo(b);
      for (const [col, w, op, blending] of [[pal.deep, 1.6, 0.5, NORMAL], [pal.main, 1.4, 0.9, THREE.AdditiveBlending], [pal.hot, 0.45, 1, THREE.AdditiveBlending]]) {
        const s = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.softDot(), opacity: 0, blending })));
        s.position.copy(mid); s.renderOrder = 7;
        const dir = b.clone().sub(a).normalize();
        this.anim(dur, (k) => {
          // วางแผ่นให้แกน x ตามเส้น และหันหน้าเข้าหากล้องมากที่สุด
          const cam = this.camera ? this.camera.position : V(mid.x, mid.y + 10, mid.z + 10), toCam = cam.clone().sub(mid).normalize();
          const up = new THREE.Vector3().crossVectors(toCam, dir).normalize(), fwd = new THREE.Vector3().crossVectors(dir, up);
          s.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, up, fwd));
          const g = easeOut(Math.min(1, k * 4));
          s.scale.set(len * g, width * w * (k < 0.2 ? 1 + k * 3 : 1.6 * (1 - k)), 1);
          s.material.opacity = op * (1 - k);
        }, () => this.remove(s));
      }
    });
  };

  // รวมพลังที่มือ
  P.swCharge = function (c, pal, dur = 0.4, n = 50) {
    this.anim(dur, (k, dt) => {
      const h = this.hand(c);
      this.fx.emit({ pos: () => h.clone().add(V(rand(-1.2, 1.2), rand(-0.6, 1.2), rand(-1.2, 1.2))), count: Math.max(1, Math.round(n * dt / dur * 3)), vel: (i, p) => h.clone().sub(p).multiplyScalar(5), life: 0.2, size: [0.12, 0.24], color: [pal.hot, pal.light, pal.mid] });
    });
    this.after(dur * 0.6, () => this.flash(this.hand(c), pal.light, 1.8, dur * 0.6));
  };

  // ระเบิดกระแทกที่จุด (ไม่ใหญ่เท่า explosion)
  P.swBurst = function (pos, pal, size = 1, { ring = true, up = true } = {}) {
    this.flash(pos, pal.hot, 2.2 * size, 0.22, TX.softDot(), 0.95);
    this.flash(pos, pal.main, 4 * size, 0.4, TX.softDot(), 0.55);
    this.star(pos, pal.hot, 2.4 * size, 0.28);
    this.sparks(pos, [pal.hot, pal.light, pal.mid], Math.round(40 * size), 7 * size, { colorEnd: pal.main, size: [0.07, 0.18] });
    if (up) this.fx.emit({ pos: V(pos.x, 0.15, pos.z), count: Math.round(24 * size), spread: 0.35 * size, flat: true, vel: () => V(rand(-0.6, 0.6), rand(2.5, 5.5) * size, rand(-0.6, 0.6)), drag: 2, life: [0.3, 0.6], size: [0.25, 0.5], sizeEnd: 0.15, color: [pal.light, pal.mid, pal.main], colorEnd: pal.deep });
    if (ring) { this.ring(V(pos.x, 0, pos.z), pal.light, 0.2, 1.6 * size, 0.4); this.ring(V(pos.x, 0, pos.z), pal.main, 0.2, 2.2 * size, 0.55, { opacity: 0.8 }); }
    this.light(pos, pal.mid, 6 * size, 0.3, 6 * size);
  };

  // คลื่นจันทร์เสี้ยวตั้งพุ่งไปตามทิศ (คลื่นดาบเพลิง / ลมปราณ)
  P.swWave = function (from, dir, len, speed, pal, size = 2.4, { tilt = 0, onPass = null, c = null } = {}) {
    const dur = len / speed, group = this.add(new THREE.Group()), mats = [];
    for (const [col, sc, op, blending] of [[pal.deep, 1.1, 0.8, NORMAL], [pal.main, 1, 1, THREE.AdditiveBlending], [pal.light, 0.88, 1, THREE.AdditiveBlending], [pal.hot, 0.7, 1, THREE.AdditiveBlending]]) {
      const m = new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.crescent(), opacity: op, blending }));
      m.scale.set(size * sc, size * sc * 1.25, 1); m.renderOrder = blending === NORMAL ? 8 : 9; group.add(m); mats.push([m.material, op]);
    }
    group.position.copy(from);
    const passed = new Set();
    this.anim(dur, (k, dt) => {
      group.position.copy(from).addScaledVector(dir, len * k);
      this.swFace(group, this.swScreenAngle(group.position, dir) + tilt);
      for (const [m, op] of mats) m.opacity = op * (k > 0.85 ? (1 - k) / 0.15 : 1);
      const p = group.position;
      this.fx.emit({ pos: () => p.clone().add(V(rand(-0.4, 0.4), rand(-size * 0.4, size * 0.4), rand(-0.4, 0.4))), count: 6, vel: () => dir.clone().multiplyScalar(-rand(1, 3)).add(V(0, rand(0, 1.5), 0)), drag: 2, life: [0.25, 0.5], size: [0.18, 0.36], sizeEnd: 0.1, color: [pal.light, pal.mid], colorEnd: pal.main });
      if (c && onPass) c.targets.forEach((t, i) => { if (passed.has(i)) return; const d = t.pos.clone().setY(0).sub(from.clone().setY(0)); if (d.dot(dir) <= len * k + 0.3 && d.dot(dir) > -0.3 && Math.abs(d.x * dir.z - d.z * dir.x) < 1.3) { passed.add(i); onPass(t); } });
    }, () => this.remove(group));
    return dur;
  };

  // ใบดาบเรืองแสง (ใช้กับดาบยักษ์/ดาบวิญญาณ)
  P.swBlade = function (pal, len = 4, width = 0.42) {
    const g = new THREE.Group();
    const edge = this.basic(pal.light, { opacity: 0.9 }), core = this.basic(pal.hot, { opacity: 1 }), dark = this.basic(pal.deep, { opacity: 0.6, blending: NORMAL });
    const back = new THREE.Mesh(new THREE.BoxGeometry(width * 1.25, len * 1.02, 0.06), dark); back.position.y = len / 2 + 0.3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(width, len, 0.1), edge); blade.position.y = len / 2 + 0.3;
    const mid = new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, len * 0.95, 0.12), core); mid.position.y = len / 2 + 0.3;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, 0.6, 4).rotateY(Math.PI / 4), edge); tip.rotation.x = Math.PI; tip.scale.z = 0.25; tip.position.y = 0.0;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(width * 3.4, 0.2, 0.22), this.basic(pal.mid, { opacity: 0.95 })); guard.position.y = len + 0.42;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, len * 0.2, 0.16), this.basic(pal.mid, { opacity: 0.9 })); grip.position.y = len * 1.13 + 0.42;
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0.5)); glow.scale.set(width * 7, len * 1.6, 1); glow.position.y = len / 2 + 0.3;
    g.add(back, blade, mid, tip, guard, grip, glow);
    g.userData.dispose = () => g.traverse((m) => { if (m.geometry && m.geometry !== this.geo.plane) m.geometry.dispose(); });
    return g;
  };
  P.swDrop = function (blade) { blade.userData.dispose(); this.remove(blade); };

  // วงไฟ/เสาไฟพุ่งจากพื้น
  P.swFlameColumn = function (gp, pal, h = 3, dur = 0.6, r = 0.25) {
    this.anim(dur, (k) => this.fx.emit({ pos: V(gp.x, 0.1, gp.z), count: 5, spread: r, flat: true, vel: () => V(rand(-0.4, 0.4), rand(h * 1.4, h * 2.4), rand(-0.4, 0.4)), drag: 1.8, life: [0.3, 0.55], size: [0.35, 0.65], sizeEnd: 0.12, color: [pal.hot, pal.light, pal.mid], colorEnd: pal.deep }));
    this.flash(V(gp.x, 0.4, gp.z), pal.mid, 1.8, dur * 0.6);
  };

  /* ================= Swordsman · ดาบเพลิง ================= */
  P.fx_sw_triple_slash = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing;
    const { tp, gp } = this.swTarget(c, 1.4);
    this.swCharge(c, FIRE, 0.14, 24);
    this.swSlash(tp, f, FIRE, 3.0, -0.8, 0.12);
    this.after(0.18, () => this.swBurst(tp, FIRE, 0.7, { ring: false }));
    this.swSlash(tp, f, FIRE, 3.0, 0.85, 0.34);
    this.after(0.4, () => this.swBurst(tp, FIRE, 0.8, { ring: false }));
    this.swSlash(tp.clone().add(V(0, 0.15, 0)), f, FIRE, 4.6, 0.02, 0.58, 0.4);
    this.after(0.65, () => {
      this.swBurst(tp, FIRE, 1.3);
      this.fx.emit({ pos: tp, count: 50, vel: () => f.clone().multiplyScalar(rand(6, 14)).add(V(rand(-2, 2), rand(-0.5, 3), rand(-2, 2))), drag: 3, life: [0.2, 0.5], size: [0.15, 0.3], color: [FIRE.hot, FIRE.light, FIRE.mid], colorEnd: FIRE.main });
      this.wall(gp, FIRE.mid, 0.3, 1.9, 1.1, 0.4, { opacity: 0.55 });
      this.cracks(gp, FIRE.mid, 2.6, 1.6, { glow: 1, dark: 0.6 });
    });
    return end;
  };

  P.fx_sw_flame_wave = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing, p0 = c.caster.pos.clone();
    this.swCharge(c, FIRE, 0.45, 60);
    this.anim(0.45, () => this.fx.emit({ pos: () => p0.clone().add(V(rand(-0.6, 0.6), 0.1, rand(-0.6, 0.6))), count: 2, vel: () => V(0, rand(1, 2.5), 0), life: 0.4, size: [0.2, 0.35], color: [FIRE.light, FIRE.mid], colorEnd: FIRE.main }));
    this.swSlash(this.hand(c).addScaledVector(f, 0.6), f, FIRE, 3.4, -0.2, 0.45, 0.3);
    this.after(0.48, () => {
      const from = c.caster.pos.clone().setY(1.05 * this.vs).addScaledVector(f, 1.0);
      this.flash(from, FIRE.hot, 3, 0.25); this.light(from, FIRE.mid, 8, 0.4, 8);
      this.swWave(from, f, 9, 22, FIRE, 3.2, { c, onPass: (t) => { const tp = this.hitPos(t); this.swBurst(tp, FIRE, 0.9); this.swFlameColumn(V(t.pos.x, 0, t.pos.z), FIRE, 2.2, 0.4); } });
      // รอยไหม้ตามแนวคลื่น
      for (let i = 1; i <= 9; i++) this.after(i / 22, () => { const gp = c.caster.pos.clone().setY(0); const q = p0.clone().setY(0).addScaledVector(f, i); this.decal(q, TX.scorch(), 1.6, 1.8); this.fx.emit({ pos: V(q.x, 0.1, q.z), count: 6, spread: 0.4, flat: true, vel: () => V(rand(-0.3, 0.3), rand(1.5, 3), rand(-0.3, 0.3)), drag: 2, life: [0.4, 0.8], size: [0.25, 0.45], sizeEnd: 0.1, color: [FIRE.light, FIRE.mid], colorEnd: FIRE.deep }); void gp; });
    });
    return end;
  };

  P.fx_sw_blazing_dash = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing;
    const start = (c.caster.start || c.caster.pos).clone().setY(0);
    this.flash(V(start.x, 0.8, start.z), FIRE.hot, 2.6, 0.25);
    // ลำเพลิงตามตัวระหว่างพุ่ง
    this.anim(0.25, () => { const p = c.caster.pos; this.fx.emit({ pos: () => V(p.x + rand(-0.3, 0.3), rand(0.2, 1.4), p.z + rand(-0.3, 0.3)), count: 12, vel: () => f.clone().multiplyScalar(-rand(2, 5)).add(V(0, rand(0, 1.5), 0)), drag: 2.5, life: [0.3, 0.6], size: [0.3, 0.6], sizeEnd: 0.1, color: [FIRE.hot, FIRE.light, FIRE.mid], colorEnd: FIRE.main }); });
    this.after(0.22, () => {
      const here = c.caster.pos.clone().setY(0);
      const a = V(start.x, 0.9, start.z), b = here.clone().setY(0.9).addScaledVector(f, 1.6);
      this.swLine(a, b, FIRE, 0.4, 0.5);
      for (let d = 0; d <= start.distanceTo(here) + 1.5; d += 0.9) this.decal(start.clone().addScaledVector(f, d), TX.scorch(), 1.4, 2.2);
    });
    // รอยเพลิงแนวยาว 7 ช่องเรืองก่อนระเบิด
    this.after(0.5, () => {
      const o = c.caster.pos.clone().setY(0);
      for (let d = 0.6; d <= 7; d += 0.7) { const q = o.clone().addScaledVector(f, d); this.after(d * 0.03, () => { this.fx.emit({ pos: V(q.x, 0.1, q.z), count: 6, spread: 0.3, flat: true, vel: () => V(rand(-0.2, 0.2), rand(0.8, 1.8), rand(-0.2, 0.2)), life: [0.3, 0.6], size: [0.2, 0.35], color: [FIRE.light, FIRE.mid] }); }); }
      this.cracks(o.clone().addScaledVector(f, 3.5), FIRE.mid, 5.5, 2, { glow: 1, dark: 0.55 });
    });
    this.after(0.8, () => {
      const o = c.caster.pos.clone().setY(1.0 * this.vs);
      this.swLine(o.clone().addScaledVector(f, -0.5), o.clone().addScaledVector(f, 7.5), FIRE, 0.6, 0.45);
      this.swSlash(o.clone().addScaledVector(f, 3), f, FIRE, 6, 0.05, 0, 0.42);
    });
    this.after(0.85, () => {
      const o = c.caster.pos.clone().setY(0);
      for (let d = 1; d <= 7; d += 1.2) { const q = o.clone().addScaledVector(f, d); this.after(d * 0.02, () => { this.swFlameColumn(q, FIRE, 2.6, 0.5, 0.35); this.flash(V(q.x, 0.8, q.z), FIRE.main, 2.6, 0.35); }); }
      for (const t of c.targets) { const d = t.pos.clone().setY(0).sub(o); if (d.dot(f) > -0.3 && d.dot(f) < 7.5 && Math.abs(d.x * f.z - d.z * f.x) < 1.5) this.swBurst(this.hitPos(t), FIRE, 1.1); }
      this.impact(c, o.clone().addScaledVector(f, 3).setY(1), 2, FIRE.light);
    });
    return end;
  };

  P.fx_sw_inferno_whirl = function (c) {
    const end = this.fx_nf(c);
    const P0 = () => c.caster.pos;
    [[0.45, 4.8, 16, FIRE.mid], [0.9, 5.8, -13, FIRE.hot], [1.35, 4.8, 19, FIRE.light], [1.8, 3.6, -22, FIRE.main]].forEach(([y, size, spd, col]) => {
      for (const [sc, op, blending, cc] of [[1.08, 0.85, NORMAL, FIRE.deep], [1, 1, THREE.AdditiveBlending, col], [0.9, 1, THREE.AdditiveBlending, FIRE.hot]]) {
        const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(cc, { tex: TX.crescent(), opacity: 0, blending })));
        m.rotation.x = -Math.PI / 2; m.renderOrder = blending === NORMAL ? 5 : 6;
        this.anim(1.0, (k, dt) => { const p = P0(); m.position.set(p.x, y, p.z); m.rotation.z += spd * dt; m.material.opacity = op * (k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1); const s = size * sc * (0.85 + 0.2 * Math.sin(k * Math.PI)); m.scale.set(s, s, 1); }, () => this.remove(m));
      }
    });
    this.disc(V(P0().x, 0, P0().z), TX.runeCircle('star'), FIRE.mid, 5.4, 1.15, { spin: 3 });
    this.disc(V(P0().x, 0, P0().z), TX.runeCircle('star'), FIRE.deep, 5.8, 1.15, { spin: 3, opacity: 0.6, blending: NORMAL, y: 0.05 });
    this.windTube(V(P0().x, 0, P0().z), FIRE.light, 1.6, 2.3, 1.0, { spin: 12, opacity: 0.55 });
    this.windTube(V(P0().x, 0, P0().z), FIRE.main, 1.0, 3.0, 1.0, { spin: -15, opacity: 0.45, shape: 'cone' });
    this.anim(0.95, (k, dt, tt) => {
      const p = P0(), a = tt * 15;
      for (const off of [0, Math.PI]) this.fx.emit({ pos: V(p.x + Math.cos(a + off) * 1.8, rand(0.2, 2), p.z + Math.sin(a + off) * 1.8), count: 5, vel: () => V(-Math.sin(a + off) * 7, rand(0.5, 2), Math.cos(a + off) * 7), drag: 3, life: [0.25, 0.5], size: [0.2, 0.42], sizeEnd: 0.1, color: [FIRE.hot, FIRE.light, FIRE.mid], colorEnd: FIRE.main });
    });
    for (const t of [0.28, 0.5, 0.71]) this.after(t, () => { for (const [tt] of this.inRadius(c, P0(), 2.8)) { const tp = this.hitPos(tt); this.swBurst(tp, FIRE, 0.6, { ring: false, up: false }); this.swSlash(tp, c.caster.facing, FIRE, 1.6, rand(-1.4, 1.4), 0, 0.2); } });
    this.after(0.96, () => this.explosion(V(P0().x, 0.7, P0().z), 2.4, { color: FIRE.main, core: FIRE.hot, ctx: c, lvl: 2, debris: true }));
    return end;
  };

  P.fx_sw_crimson_judgement = function (c) {
    const end = this.fx_nf(c);
    const { gp } = this.swTarget(c, 2.5);
    this.disc(gp, TX.runeCircle('cross'), FIRE.mid, 5.2, 2.6, { spin: 1.2 });
    this.disc(gp, TX.runeCircle('cross'), FIRE.deep, 5.6, 2.6, { spin: -0.6, opacity: 0.5, blending: NORMAL, y: 0.05 });
    this.disc(gp, TX.softRing(), FIRE.main, 6.4, 1.6, { spin: 0, opacity: 0.6 });
    this.anim(1.4, () => this.fx.emit({ pos: () => V(gp.x + rand(-2.6, 2.6), 0.1, gp.z + rand(-2.6, 2.6)), count: 3, vel: () => V(0, rand(1.5, 3.5), 0), life: [0.5, 0.9], size: [0.15, 0.3], color: [FIRE.light, FIRE.mid], colorEnd: FIRE.deep }));
    // ดาบเพลิงยักษ์ลงจากฟ้า
    const sw = this.swBlade(FIRE, 5.2, 0.6); sw.scale.setScalar(1.35); sw.position.set(gp.x, 9, gp.z); sw.rotation.y = Math.atan2(c.caster.facing.x, c.caster.facing.z); sw.visible = false; this.add(sw);
    this.after(0.55, () => { sw.visible = true; this.flash(V(gp.x, 8, gp.z), FIRE.hot, 5, 0.4); this.light(V(gp.x, 6, gp.z), FIRE.mid, 6, 1, 12); });
    this.anim(1.49, (k, dt, tt) => {
      if (tt < 0.55) return;
      const kk = Math.min(1, (tt - 0.55) / 0.94);
      sw.position.y = kk < 0.6 ? 7.2 + 0.4 * Math.sin(kk * 8) : 7.2 - 7.6 * easeIn((kk - 0.6) / 0.4);
      this.fx.emit({ pos: V(gp.x, sw.position.y + rand(0.5, 7), gp.z), count: 5, spread: 0.4, vel: () => V(0, kk > 0.6 ? 8 : rand(-0.5, 0.5), 0), life: 0.35, size: [0.2, 0.42], color: [FIRE.light, FIRE.mid], colorEnd: FIRE.main });
    });
    this.after(1.49, () => {
      sw.position.y = -0.4;
      const ip = V(gp.x, 0.6, gp.z);
      this.explosion(ip, 3.2, { color: FIRE.main, core: FIRE.hot, ctx: c, lvl: 3, scorchSize: 6.4 });
      this.pillar(gp, FIRE.mid, 1.4, 11, 0.7, { grow: 0.08, opacity: 0.55 });
      this.pillar(gp, FIRE.hot, 0.5, 11, 0.5, { grow: 0.06, opacity: 0.45 });
      this.spikes(gp, { count: 14, r0: 1.2, r1: 3.0, h: [0.7, 1.4], width: 0.26, dur: 1.6, mat: new THREE.MeshStandardMaterial({ color: '#4a2a22', emissive: FIRE.main, emissiveIntensity: 0.7, roughness: 0.9, flatShading: true }) });
      this.cracks(gp, FIRE.mid, 8, 3, { glow: 1 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.after(0.05 + i * 0.03, () => this.swFlameColumn(V(gp.x + Math.cos(a) * 2.6, 0, gp.z + Math.sin(a) * 2.6), FIRE, 2.4, 0.5)); }
    });
    // ฟันกากบาทปิดท้าย
    this.after(2.05, () => { const f = c.caster.facing, tp = V(gp.x, 1.4, gp.z); this.swSlash(tp, f, FIRE, 6.2, -0.75, 0, 0.45); this.swSlash(tp, f, FIRE, 6.2, 0.75, 0.14, 0.45); });
    this.after(2.4, () => {
      this.swBurst(V(gp.x, 1.2, gp.z), FIRE, 2.2);
      this.flash(V(gp.x, 1.4, gp.z), FIRE.hot, 9, 0.5, TX.softRing(), 0.9);
      for (let i = 0; i < 3; i++) this.after(i * 0.08, () => this.ring(gp, i ? FIRE.main : FIRE.hot, 0.4, 4.6 + i * 0.5, 0.7));
      this.wall(gp, FIRE.mid, 0.6, 4.4, 2.2, 0.6, { opacity: 0.6 });
    });
    this.after(2.7, () => this.anim(0.5, (k) => { sw.position.y = -0.4 - k * 1.6; sw.traverse((m) => { if (m.material) m.material.opacity *= 0.86; }); }, () => this.swDrop(sw)));
    return Math.max(end, 3.2);
  };

  /* ================= Knight · ดาบอัสนี ================= */
  P.fx_kn_thunder_cut = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing;
    const { tp, gp } = this.swTarget(c, 1.4);
    this.swCharge(c, STORM, 0.12, 20);
    this.swSlash(tp, f, STORM, 3.2, -0.85, 0.12, 0.26);
    this.after(0.21, () => { this.swBurst(tp, STORM, 0.7, { ring: false }); this.lightning(this.hand(c), tp, STORM.light, 0.18, { branches: 2, width: 0.05 }); });
    this.swSlash(tp, f, STORM, 3.4, 0.85, 0.2, 0.28);
    this.after(0.28, () => {
      this.lightning(V(gp.x + rand(-0.4, 0.4), 9, gp.z + rand(-0.4, 0.4)), V(gp.x, 0.1, gp.z), STORM.light, 0.3, { branches: 4, width: 0.09 });
      this.swBurst(tp, STORM, 1.2);
      this.cracks(gp, STORM.mid, 2.4, 1.4, { glow: 1, dark: 0.5 });
      for (let i = 0; i < 3; i++) this.lightning(tp, tp.clone().add(V(rand(-2, 2), rand(-0.8, 0.4), rand(-2, 2))), STORM.mid, 0.2, { branches: 0, width: 0.035 });
    });
    return end;
  };

  P.fx_kn_sword_qi_barrage = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing;
    [0.18, 0.28, 0.36, 0.46, 0.54, 0.64].forEach((t, i) => this.after(t, () => {
      const from = c.caster.pos.clone().setY((0.7 + (i % 3) * 0.35) * this.vs).addScaledVector(f, 0.8);
      const big = i === 5;
      this.swSlash(from, f, STORM, big ? 3.6 : 2.4, (i % 2 ? 0.9 : -0.9), 0, 0.2);
      this.swWave(from, f, 9, big ? 20 : 26, STORM, big ? 3.4 : 2.4, { tilt: (i % 2 ? 0.35 : -0.35), c, onPass: (tt) => this.swBurst(this.hitPos(tt), STORM, big ? 1 : 0.55, { ring: big, up: false }) });
      this.flash(from, STORM.hot, 1.6, 0.15);
    }));
    this.after(0.7, () => this.light(c.caster.pos.clone().setY(1).addScaledVector(f, 3), STORM.mid, 6, 0.5, 10));
    return end;
  };

  P.fx_kn_flash_step = function (c) {
    const end = this.fx_nf(c), f = c.caster.facing;
    const start = (c.caster.start || c.caster.pos).clone().setY(1 * this.vs);
    this.flash(start, STORM.hot, 3, 0.25); this.ring(start.clone().setY(0), STORM.light, 0.2, 1.6, 0.35);
    this.after(0.12, () => { const here = c.caster.pos.clone().setY(1 * this.vs); this.lightning(start, here, STORM.light, 0.3, { branches: 2, width: 0.08 }); this.swLine(start, here, STORM, 0.35, 0.4); });
    // ฟันทีละตัว 3 ครั้ง (ตัวใกล้สุดก่อน)
    const near = () => { const p = c.caster.pos; return c.targets.map((t) => [t, Math.hypot(t.pos.x - p.x, t.pos.z - p.z)]).filter(([, d]) => d < 3.2).sort((a, b) => a[1] - b[1]).map(([t]) => t); };
    let prev = null;
    [0.24, 0.45, 0.64].forEach((tm, i) => this.after(tm, () => {
      const list = near(), t = list[i % Math.max(1, list.length)];
      const tp = t ? this.hitPos(t) : c.caster.pos.clone().setY(1).addScaledVector(f, 1.5);
      const from = prev || c.caster.pos.clone().setY(1 * this.vs);
      this.lightning(from, tp, STORM.light, 0.22, { branches: 1, width: 0.06 });
      const dir = tp.clone().sub(from).setY(0); if (dir.lengthSq() < 1e-4) dir.copy(f); dir.normalize();
      this.swSlash(tp, dir, STORM, 4.4, i % 2 ? 0.9 : -0.9, 0.02, 0.28);
      this.swLine(tp.clone().addScaledVector(dir, -2.2).add(V(0, 0.8, 0)), tp.clone().addScaledVector(dir, 2.2).add(V(0, -0.5, 0)), STORM, 0.3, 0.3, 0.02);
      this.after(0.04, () => this.swBurst(tp, STORM, 1.0, { ring: false }));
      if (c.ghost) c.ghost({ color: STORM.mid, life: 0.35 });
      prev = tp;
    }));
    this.after(0.96, () => { this.flash(c.caster.pos.clone().setY(1), STORM.hot, 2.6, 0.3); if (c.ghost) c.ghost({ color: STORM.light, life: 0.4 }); });
    // สายฟ้าตามฟาดทุกตัว
    this.after(1.24, () => {
      const p = c.caster.pos;
      for (const [t] of this.inRadius(c, p, 3.2)) {
        const gp = V(t.pos.x, 0.05, t.pos.z);
        this.lightning(V(gp.x + rand(-0.6, 0.6), 9, gp.z + rand(-0.6, 0.6)), gp, STORM.light, 0.35, { branches: 4, width: 0.1 });
        this.swBurst(this.hitPos(t), STORM, 1);
        this.cracks(gp, STORM.mid, 2, 1.2, { glow: 1, dark: 0.4 });
      }
      this.impact(c, p.clone().setY(1), 2, STORM.light);
    });
    return end;
  };

  P.fx_kn_thousand_blades = function (c) {
    const end = this.fx_nf(c);
    const { gp } = this.swTarget(c, 2.5);
    this.disc(gp, TX.runeCircle('star'), STORM.mid, 6, 2.8, { spin: 0.5 });
    this.disc(gp, TX.runeCircle('star'), STORM.deep, 6.4, 2.8, { spin: -0.3, opacity: 0.45, blending: NORMAL, y: 0.05 });
    this.anim(2.6, (k, dt, tt) => { if (Math.random() < 0.5) this.stars.emit({ pos: V(gp.x + rand(-3, 3), rand(0.2, 4), gp.z + rand(-3, 3)), count: 1, speed: 0.2, life: 0.8, size: [0.15, 0.3], color: STORM.light }); });
    // ดาบวิญญาณ 16 เล่มลอยเป็นวงกลางฟ้า
    const N = 16, blades = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, b = this.swBlade(STORM, 1.6, 0.22);
      b.userData.home = V(gp.x + Math.cos(a) * 2.8, 4.4 + Math.sin(a * 2) * 0.25, gp.z + Math.sin(a) * 2.8);
      b.position.copy(b.userData.home).add(V(0, 3, 0)); b.rotation.y = a; b.scale.setScalar(0.01); this.add(b); blades.push(b);
      this.after(0.1 + i * 0.03, () => this.anim(0.4, (k) => { b.scale.setScalar(easeOut(k)); b.position.lerpVectors(b.userData.home.clone().add(V(0, 3, 0)), b.userData.home, easeOut(k)); }));
    }
    this.anim(2.4, (k, dt) => { for (const b of blades) if (!b.userData.fall) b.rotation.y += dt * 0.8; });
    const hits = [0.88, 1.01, 1.15, 1.29, 1.43, 1.58, 1.72, 1.86];
    hits.forEach((tm, h) => this.after(tm - 0.14, () => {
      for (const b of [blades[h * 2], blades[h * 2 + 1]]) {
        if (!b) continue; b.userData.fall = true;
        const live = c.targets.filter((t) => Math.hypot(t.pos.x - gp.x, t.pos.z - gp.z) < 3.2);
        const tt = live.length ? live[(Math.random() * live.length) | 0] : null;
        const dst = tt ? V(tt.pos.x + rand(-0.4, 0.4), 0, tt.pos.z + rand(-0.4, 0.4)) : V(gp.x + rand(-2, 2), 0, gp.z + rand(-2, 2));
        const src = b.position.clone();
        this.anim(0.14, (k) => { b.position.lerpVectors(src, dst, easeIn(k)); }, () => {
          this.swBurst(V(dst.x, 0.5, dst.z), STORM, 0.6, { up: false });
          this.cracks(dst, STORM.mid, 1.4, 1, { glow: 1, dark: 0.4 });
          this.after(0.3, () => this.anim(0.3, (k) => b.traverse((m) => { if (m.material) m.material.opacity *= 0.8; }), () => this.swDrop(b)));
        });
      }
    }));
    // ดาบยักษ์ปิดท้าย
    this.after(2.0, () => {
      const big = this.swBlade(STORM, 4.6, 0.6); big.position.set(gp.x, 9, gp.z); this.add(big);
      this.flash(V(gp.x, 8, gp.z), STORM.hot, 4.5, 0.35);
      this.anim(0.4, (k) => { big.position.y = 9 - 9.4 * easeIn(k); this.fx.emit({ pos: V(gp.x, big.position.y + rand(0.5, 5), gp.z), count: 4, spread: 0.3, vel: () => V(0, 8, 0), life: 0.25, size: [0.18, 0.35], color: STORM.light }); }, () => {
        this.explosion(V(gp.x, 0.6, gp.z), 2.8, { color: STORM.main, core: STORM.hot, ctx: c, lvl: 3, scorchSize: 0, debris: false });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.lightning(V(gp.x, 0.4, gp.z), V(gp.x + Math.cos(a) * 3.2, 0.1, gp.z + Math.sin(a) * 3.2), STORM.light, 0.35, { branches: 1, width: 0.06 }); }
        this.cracks(gp, STORM.mid, 6.4, 2.4, { glow: 1 });
        this.after(0.5, () => this.anim(0.4, (k) => big.traverse((m) => { if (m.material) m.material.opacity *= 0.85; }), () => this.swDrop(big)));
      });
    });
    this.after(3.2, () => blades.forEach((b) => { if (!b.userData.fall && b.parent) this.swDrop(b); }));
    return end;
  };

  P.fx_kn_heaven_splitter = function (c) {
    const end = this.fx_nf(c);
    const { gp } = this.swTarget(c, 2.5);
    const f = c.caster.facing, side = V(f.z, 0, -f.x);
    this.disc(gp, TX.runeCircle('star'), STORM.acc, 7.4, 3.2, { spin: 0.25, opacity: 0.8 });
    // ตาข่ายสายฟ้าระหว่างเวลาหยุด
    for (let i = 0; i < 10; i++) this.after(0.2 + i * 0.12, () => {
      const a = V(gp.x + rand(-4, 4), rand(5, 9), gp.z + rand(-4, 4)), b = V(gp.x + rand(-3, 3), rand(0, 2), gp.z + rand(-3, 3));
      this.lightning(a, b, i % 3 ? STORM.light : STORM.acc, 0.2, { branches: 2, width: 0.05 });
    });
    this.after(0.6, () => { this.flash(c.caster.pos.clone().setY(1), STORM.hot, 3, 0.3); if (c.ghost) c.ghost({ color: STORM.mid, life: 0.6 }); });
    // ฟันนับไม่ถ้วนรอบวง
    for (let i = 0; i < 16; i++) this.after(0.8 + i * 0.05, () => {
      const cx = gp.clone().add(V(rand(-2, 2), rand(0.6, 2.2), rand(-2, 2))), d = V(rand(-1, 1), rand(-0.6, 0.6), rand(-1, 1)).normalize(), L = rand(2.4, 3.8);
      this.swLine(cx.clone().addScaledVector(d, -L), cx.clone().addScaledVector(d, L), STORM, 0.14, 0.45);
      if (i % 4 === 0) this.sparks(cx, [STORM.hot, STORM.light], 12, 5);
    });
    // ฟันผ่าฟ้าเป็นสองซีก
    this.after(1.8, () => {
      const top = gp.clone().add(V(0, 9, 0)).addScaledVector(side, 3.5), bot = gp.clone().add(V(0, -0.3, 0)).addScaledVector(side, -3);
      this.swLine(top, bot, STORM, 0.7, 1.1);
      this.swLine(top, bot, { deep: STORM.deep, main: STORM.acc, hot: '#ffffff' }, 0.3, 1.0, 0.05);
      this.flash(gp.clone().setY(2), STORM.hot, 6, 0.3);
    });
    this.after(2.31, () => {
      const ip = V(gp.x, 0.8, gp.z);
      this.explosion(ip, 3.4, { color: STORM.main, core: STORM.hot, ctx: c, lvl: 3, scorchSize: 0, debris: false });
      this.pillar(gp, STORM.mid, 1.6, 12, 0.8, { grow: 0.06, opacity: 0.6 });
      this.pillar(gp, STORM.hot, 0.55, 12, 0.6, { grow: 0.05, opacity: 0.5 });
      for (let i = 0; i < 4; i++) this.lightning(V(gp.x + rand(-1.5, 1.5), 10, gp.z + rand(-1.5, 1.5)), V(gp.x + rand(-2.4, 2.4), 0.1, gp.z + rand(-2.4, 2.4)), i % 2 ? STORM.light : STORM.acc, 0.5, { branches: 4, width: 0.12 });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? STORM.mid : STORM.hot, 0.4, 5 + i * 0.5, 0.8));
      this.cracks(gp, STORM.light, 8.4, 3, { glow: 1 });
      this.flash(ip, STORM.acc, 10, 0.6, TX.softRing(), 0.8);
    });
    return end;
  };
}
