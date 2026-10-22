// v0.69 สกิลสายเวท วาดเป็นเอฟเฟกต์ 3 มิติในฉากจริง (แทน sprite sheet)
// Mage = จอมเวทอาคม ม่วง + สายฟ้าม่วง (fx_ma_* · v0.71) · Wizard = น้ำแข็งล้วน (fx_wz_*)
// ดาเมจ/สถานะยังมาจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/HealFX (swBurst · swCharge · swTarget · hlCircle · hlDome)
import { THREE } from './three.js?v=0.93.0';
import * as TX from './FxTextures.js?v=0.93.0';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const NORMAL = THREE.NormalBlending;
const TAU = Math.PI * 2;

const ARC = { deep: '#3a0a72', main: '#9a3aff', mid: '#c06aff', light: '#e4b8ff', hot: '#fbf0ff', smoke: '#2a1640' };
const ICE = { deep: '#0a3a78', main: '#2a9cff', mid: '#5ac8ff', light: '#b0eeff', hot: '#f2fdff' };
const VOLT = { deep: '#2a0a66', main: '#8a4aff', mid: '#b48aff', light: '#e8d4ff', hot: '#ffffff', acc: '#ffe24a' };

export function installMageFX(P) {
  /* ---------- ตัวช่วย ---------- */
  // รัศมีสีเข้ม (ผสมปกติ) ใต้แสงวาบ — ไม่ให้แสงบวกกลายเป็นขาวโพลนบนพื้นสว่าง
  P.mgUnder = function (pos, pal, size, dur = 0.45, op = 0.6) {
    const s = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), pal.deep, 0, NORMAL)));
    s.position.copy(pos); s.renderOrder = 4;
    this.anim(dur, (k) => { s.scale.setScalar(size * (0.5 + 0.5 * easeOut(k))); s.material.opacity = op * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85); }, () => this.remove(s));
  };
  // จุดโดน: รัศมีเข้ม + ระเบิดเล็ก
  P.mgHit = function (pos, pal, size = 1, o) { this.mgUnder(pos, pal, 3.2 * size, 0.5); this.swBurst(pos, pal, size, o); };

  // ผลึกน้ำแข็งพุ่งจากพื้นเป็นวง (เนื้อทึบเงาเหลี่ยม + เปลือกเรืองแสง) · shatter = แตกกระจายตอนจบ
  P.mgCrystals = function (gp, pal, { count = 10, r0 = 0.3, r1 = 2.4, h = [0.8, 1.6], width = 0.22, dur = 1.2, delay = 0, rise = 0.1, shatter = true, center = 0 } = {}) {
    this.after(delay, () => {
      const solid = new THREE.MeshStandardMaterial({ color: pal.main, emissive: pal.deep, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.35, flatShading: true, transparent: true, opacity: 0.95 });
      const list = [];
      const mk = (x, z, hh, w, a, lean) => {
        const m = this.add(new THREE.Mesh(this.geo.spike, solid));
        const shell = new THREE.Mesh(this.geo.spike, this.basic(pal.main, { opacity: 0.3 })); shell.scale.set(1.4, 1.06, 1.4); m.add(shell);
        m.position.set(x, 0, z); m.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean); m.renderOrder = 5;
        m.userData.h = hh; m.userData.w = w; m.scale.set(w, 0.01, w); list.push(m);
      };
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + rand(0, 0.4), r = rand(r0, r1);
        mk(gp.x + Math.cos(a) * r, gp.z + Math.sin(a) * r, rand(h[0], h[1]) * (1.35 - 0.45 * (r / r1)), width * rand(0.8, 1.3), a, 0.45 * (r / r1));
      }
      if (center) mk(gp.x, gp.z, center, width * 2.2, 0, 0);
      this.anim(dur, (k, dt, t) => {
        const up = easeOut(Math.min(1, t / rise)), down = !shatter && k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        for (const m of list) m.scale.set(m.userData.w, Math.max(0.01, m.userData.h * up * down), m.userData.w);
      }, () => {
        if (shatter) for (const m of list) {
          const p = V(m.position.x, m.userData.h * 0.5, m.position.z);
          this.snow.emit({ pos: p, count: 4, spread: 0.2, speed: [2, 5], gravity: -9, drag: 1, life: [0.4, 0.8], size: [0.18, 0.32], color: [pal.hot, pal.light] });
          this.fx.emit({ pos: p, count: 5, spread: m.userData.h * 0.3, speed: [2, 6], gravity: -10, life: [0.3, 0.6], size: [0.07, 0.14], color: [pal.hot, pal.light], colorEnd: pal.mid });
        }
        list.forEach((m) => this.remove(m));
      });
    });
  };

  // ระเบิดเวท (คล้าย explosion แต่ทุกสีตามพาเลต + ทรงกลมสีเข้มให้อ่านออกบนพื้นสว่าง)
  P.mgBlast = function (pos, pal, r = 2, c = null, lvl = 2, { crack = true } = {}) {
    const gp = V(pos.x, 0, pos.z);
    this.mgUnder(pos, pal, r * 3.4, 0.7, 0.6);
    this.flash(pos, pal.hot, r * 1.6, 0.28, TX.softDot(), 1);
    this.flash(pos, pal.main, r * 3, 0.5, TX.softDot(), 0.7);
    this.flash(pos, pal.light, r * 2.6, 0.45, TX.softRing(), 0.8);
    this.light(pos, pal.mid, 10, 0.5, r * 5);
    const dark = this.add(new THREE.Mesh(this.geo.sphere, this.basic(pal.deep, { opacity: 0, blending: NORMAL })));
    const ball = this.add(new THREE.Mesh(this.geo.sphere, this.basic(pal.main, { opacity: 0.5 })));
    const inner = this.add(new THREE.Mesh(this.geo.sphere, this.basic(pal.hot, { opacity: 0.6 })));
    for (const m of [dark, ball, inner]) m.position.copy(pos);
    dark.renderOrder = 4; ball.renderOrder = inner.renderOrder = 5;
    this.anim(0.6, (k) => {
      dark.scale.setScalar(r * (0.3 + 0.85 * easeOut(k))); dark.material.opacity = 0.45 * (1 - k) * (1 - k);
      ball.scale.setScalar(r * (0.25 + 0.8 * easeOut(k))); ball.material.opacity = 0.5 * (1 - k) * (1 - k);
      inner.scale.setScalar(r * 0.5 * (0.2 + 0.8 * easeOut(Math.min(1, k * 2)))); inner.material.opacity = Math.max(0, 0.7 - k * 2);
    }, () => { this.remove(dark); this.remove(ball); this.remove(inner); });
    this.fx.emit({ pos, count: 90, speed: [r * 2, r * 4.6], gravity: 2, drag: 3, life: [0.35, 0.85], size: [0.3, 0.6], sizeEnd: 0.15, color: [pal.hot, pal.light, pal.mid, pal.main], colorEnd: pal.deep });
    this.fx.emit({ pos: gp, count: 40, spread: r * 0.35, flat: true, vel: () => V(rand(-1, 1), rand(r * 2.5, r * 4.5), rand(-1, 1)), drag: 2.2, life: [0.35, 0.7], size: [0.35, 0.7], sizeEnd: 0.1, color: [pal.light, pal.mid], colorEnd: pal.deep });
    this.sparks(pos, [pal.hot, pal.light], 60, r * 6, { colorEnd: pal.main });
    this.smoke.emit({ pos, count: 18, spread: r * 0.4, speed: [0.3, 1.4], up: [0.8, 2], drag: 1.2, life: [1.0, 1.6], size: [1, 1.8], sizeEnd: 2.4, color: pal.smoke || '#2a2a3a', colorEnd: '#1a1622', alpha: 0.6 });
    this.ring(gp, pal.main, r * 0.3, r * 1.9, 0.55);
    this.ring(gp, pal.hot, r * 0.2, r * 1.4, 0.35, { opacity: 0.9 });
    this.wall(gp, pal.mid, r * 0.4, r * 1.8, r * 0.75, 0.5, { opacity: 0.6 });
    if (crack) { this.decal(gp, TX.scorch(), r * 1.8, 2.4, { opacity: 0.8 }); this.cracks(gp, pal.mid, r * 2.1, 2.4, { glow: 1, dark: 0.7 }); }
    this.debris(V(pos.x, 0.3, pos.z), { count: Math.round(4 + r * 3), speed: [r * 1.5, r * 3], color: '#3a2a48', glow: pal.main });
    if (c) this.impact(c, pos, lvl, pal.main);
  };

  // สายฟ้าคู่ (เส้นหลักสีม่วง + เส้นในสีเหลือง)
  // ซิกแซกหลายชั้น: ชั้นสีเข้มผสมปกติ (อ่านออกบนพื้นสว่าง) + สีหลัก + แกนสว่าง
  P.mgBolt = function (from, to, pal, dur = 0.3, width = 0.1, branches = 3) {
    const g = this.add(new THREE.Group());
    const layers = [[pal.deep, width * 4.5, 0.55, NORMAL, 4], [pal.main, width * 3, 0.85, THREE.AdditiveBlending, 6], [pal.acc || pal.light, width * 1.3, 1, THREE.AdditiveBlending, 7], [pal.hot, width * 0.55, 1, THREE.AdditiveBlending, 8]];
    const build = (a, b, segs, w, jag) => {
      const pts = [a.clone()];
      for (let i = 1; i < segs; i++) { const p = a.clone().lerp(b, i / segs); p.x += rand(-jag, jag); p.z += rand(-jag, jag); p.y += rand(-jag, jag) * 0.4; pts.push(p); }
      pts.push(b.clone());
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1], len = p0.distanceTo(p1);
        for (const [col, rad, op, blending, order] of layers) {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(rad * w, rad * w, len + rad * w, 5, 1, true), this.basic(col, { opacity: op, blending }));
          m.position.copy(p0).lerp(p1, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), p1.clone().sub(p0).normalize()); m.renderOrder = order; m.userData.op = op;
          g.add(m);
        }
      }
      return pts;
    };
    const main = build(from, to, 9, 1, 0.4);
    for (let b = 0; b < branches; b++) { const s = main[2 + ((Math.random() * (main.length - 4)) | 0)]; build(s, s.clone().add(V(rand(-1.2, 1.2), -rand(0.6, 1.6), rand(-1.2, 1.2))), 4, 0.55, 0.3); }
    this.anim(dur, (k) => {
      const o = k < 0.25 ? 1 : (1 - k) * (Math.random() > 0.3 ? 1 : 0.3);
      g.children.forEach((m) => { m.material.opacity = o * m.userData.op; });
    }, () => { g.children.forEach((m) => m.geometry.dispose()); this.remove(g); });
    this.light(from.clone().lerp(to, 0.5), pal.mid, 6, dur, 8);
  };

  // เกล็ดน้ำแข็งแหลม (ผลึกยาว + แสง + หาง)
  P.mgShard = function (pal, s = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: pal.main, emissive: pal.mid, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.3, flatShading: true });
    const body = new THREE.Mesh(this.geo.crystal, mat); body.scale.set(0.14, 0.14, 0.6);
    const shell = new THREE.Mesh(this.geo.crystal, this.basic(pal.mid, { opacity: 0.4 })); shell.scale.set(0.24, 0.24, 0.75);
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.mid, 0.8)); glow.scale.setScalar(1.1);
    const streak = new THREE.Mesh(this.geo.plane, this.basic(pal.light, { tex: TX.flameStrip(), opacity: 0.8 }));
    streak.scale.set(1.8, 0.3, 1); streak.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); streak.position.z = -0.9;
    g.add(body, shell, glow, streak);
    g.scale.setScalar(s);
    return g;
  };

  // อุกกาบาต (หินเรืองแสง + รัศมีเข้ม/สว่าง)
  P.mgMeteor = function (pal, size) {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(this.geo.rock, new THREE.MeshStandardMaterial({ color: '#2a1440', emissive: pal.main, emissiveIntensity: 0.7, roughness: 0.8, flatShading: true }));
    rock.scale.setScalar(size);
    const dark = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.deep, 0.55, NORMAL)); dark.scale.setScalar(size * 3.4); dark.renderOrder = 4;
    const halo = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0.9)); halo.scale.setScalar(size * 4.2);
    const core = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.hot, 0.8)); core.scale.setScalar(size * 1.9);
    g.add(dark, rock, halo, core);
    g.userData.rock = rock;
    return g;
  };

  // พายุหมุนทรงกรวยบานด้านบน
  P.mgTornado = function (gp, color, r, h, dur, { spin = 10, opacity = 0.5, blending = THREE.AdditiveBlending } = {}) {
    if (!this.geo.funnel) this.geo.funnel = new THREE.CylinderGeometry(1, 0.2, 1, 28, 1, true);
    const tex = TX.windStreak().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1);
    const m = this.add(new THREE.Mesh(this.geo.funnel, this.basic(color, { tex, opacity: 0, blending }))); m.renderOrder = blending === NORMAL ? 4 : 5;
    this.anim(dur, (k, dt, t) => {
      tex.offset.x -= spin * dt * 0.25;
      const g = easeOut(Math.min(1, t / 0.3));
      m.scale.set(r * g, h * g, r * g); m.position.set(gp.x, (h * g) / 2, gp.z);
      m.material.opacity = opacity * Math.min(1, t / 0.2) * (k > 0.85 ? (1 - k) / 0.15 : 1);
    }, () => { tex.dispose(); this.remove(m); });
  };

  /* ================= Mage · จอมเวทอาคม (v0.71) ================= */
  // อุกกาบาตเวทตกลงที่ at ให้ถึงพื้นตอน tHit (มีวงเตือนบนพื้นก่อนตก)
  P.mgMeteorDrop = function (c, at, pal, tHit, { size = 0.5, dur = 0.45, R = 1.6, big = false } = {}) {
    this.after(Math.max(0, tHit - dur - 0.25), () => {
      this.ring(at, pal.mid, R, 0.3, dur + 0.25, { opacity: 0.85 });
      this.disc(at, TX.runeCircle('hex'), pal.light, R * 1.5, dur + 0.35, { spin: 2, opacity: 0.7 });
    });
    this.after(tHit - dur, () => {
      const m = this.mgMeteor(pal, size), from = at.clone().add(V(-3, 12, -2)), rock = m.userData.rock;
      this.projectile(m, from, V(at.x, size * 0.5, at.z), dur, { orient: false, onFly: (p, k, dt) => {
        rock.rotation.x += dt * 6; rock.rotation.z += dt * 4;
        this.fx.emit({ pos: p, count: big ? 14 : 8, spread: size * 0.4, speed: 0.5, life: [0.3, 0.6], size: [size * 0.8, size * 1.4], sizeEnd: 0.2, color: [pal.hot, pal.light, pal.mid], colorEnd: pal.deep });
        this.smoke.emit({ pos: p, count: big ? 3 : 2, spread: size * 0.3, speed: 0.3, life: [0.6, 1], size: [size * 1.2, size * 2], sizeEnd: 1.6, color: pal.smoke, colorEnd: '#140a20', alpha: 0.55 });
      }, onHit: () => {
        this.mgBlast(V(at.x, 0.6, at.z), pal, R, c, big ? 3 : 2);
        if (big) {
          this.pillar(at, pal.main, 1.4, 9, 0.8, { grow: 0.1, opacity: 0.8 });
          this.pillar(at, pal.hot, 0.5, 9, 0.7, { grow: 0.08, opacity: 0.8 });
          for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(at, i ? pal.main : pal.hot, 0.4, 5 + i * 0.6, 0.8));
          this.cracks(at, pal.mid, 8, 2.6, { glow: 1, dark: 0.7 });
        }
      } });
    });
  };

  // ลูกพลังเวท (แกนดาว + รัศมี + ประกาย 3 ดวงโคจร)
  P.maOrb = function (pal, s = 1) {
    const g = new THREE.Group();
    const dark = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.deep, 0.55, NORMAL)); dark.scale.setScalar(1.6 * s); dark.renderOrder = 5;
    const halo = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0.95)); halo.scale.setScalar(1.9 * s);
    const core = new THREE.Sprite(this.spriteMat(TX.star4(), pal.hot, 1)); core.scale.setScalar(1.4 * s);
    g.add(dark, halo, core);
    const motes = [0, 1, 2].map(() => { const m = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.light, 1)); m.scale.setScalar(0.45 * s); g.add(m); return m; });
    g.userData.spin = (t) => {
      core.material.rotation = t * 9;
      motes.forEach((m, i) => { const a = t * 18 + (i / 3) * TAU; m.position.set(Math.cos(a) * 0.55 * s, Math.sin(a) * 0.55 * s, Math.sin(a * 0.5) * 0.3 * s); });
    };
    return g;
  };

  P.fx_ma_arcane_bolt = function (c) {
    const end = this.fx_nf(c);
    this.swCharge(c, ARC, 0.2, 24);
    this.after(0.02, () => this.sigil(this.hand(c), TX.runeCircle('hex'), ARC.light, 1.3, 0.3, { rise: 0, spin: 8 }));
    this.after(0.2, () => {
      const from = this.hand(c), t = c.targets[c.main], fixed = from.clone().addScaledVector(c.caster.facing, 6);
      const orb = this.maOrb(ARC, 1.5);
      this.flash(from, ARC.light, 1.8, 0.2);
      let tt = 0;
      this.projectile(orb, from, t ? () => this.hitPos(t) : () => fixed, 0.18, { arc: 0.4, orient: false, onFly: (p, k, dt) => {
        tt += dt; orb.userData.spin(tt);
        this.fx.emit({ pos: p, count: 6, spread: 0.1, speed: 0.5, life: [0.25, 0.4], size: [0.25, 0.45], sizeEnd: 0.1, color: [ARC.hot, ARC.light, ARC.mid], colorEnd: ARC.main });
        this.smoke.emit({ pos: p, count: 1, spread: 0.05, speed: 0.2, life: 0.3, size: [0.45, 0.6], sizeEnd: 0.3, color: ARC.main, colorEnd: ARC.deep, alpha: 0.7 });
      }, onHit: (tp) => {
        this.mgHit(tp, ARC, 1.1);
        this.disc(V(tp.x, 0, tp.z), TX.runeCircle('hex'), ARC.light, 2.4, 0.6, { spin: 3, opacity: 0.85 });
        this.stars.emit({ pos: tp, count: 18, speed: [2, 4.5], drag: 2, life: [0.4, 0.7], size: [0.2, 0.34], color: [ARC.hot, ARC.light, ARC.mid] });
      } });
    });
    return end;
  };

  P.fx_ma_rune_burst = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, ARC, 0.4, 36);
    this.hlCircle(gp, ARC, 6.2, 1.5, 'hex', 1.2);
    this.disc(gp, TX.softDot(), ARC.deep, 6, 1.3, { spin: 0, opacity: 0.45, blending: NORMAL, y: 0.04 });
    // อักขระรูนลอยหมุนขึ้นรอบวง
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      this.after(0.08 + i * 0.04, () => this.sigil(V(gp.x + Math.cos(a) * 2.1, 0.5, gp.z + Math.sin(a) * 2.1), TX.runeCircle('star'), ARC.light, 0.9, 0.8, { rise: 1.4, spin: 5 }));
    }
    this.anim(0.85, () => { if (Math.random() < 0.7) { const a = rand(0, TAU), r = rand(0.3, 2.6); this.stars.emit({ pos: V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(2, 4), 0), life: [0.5, 0.8], size: [0.2, 0.32], color: [ARC.light, ARC.hot] }); } });
    // ลำแสงเวท 6 สายตกรอบวง
    this.after(0.49, () => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.5; this.hlBeam(V(gp.x + Math.cos(a) * 1.8, 0, gp.z + Math.sin(a) * 1.8), ARC, 0.35, 0.35, 9); } this.ring(gp, ARC.light, 0.3, 2.6, 0.4); });
    // ลำแสงใหญ่กลางวง + ระเบิด
    this.after(0.82, () => this.hlBeam(gp, ARC, 1.3, 0.6, 12));
    this.after(0.9, () => {
      this.mgBlast(V(gp.x, 0.6, gp.z), ARC, 2.6, null, 2);
      this.sigil(V(gp.x, 1.8, gp.z), TX.runeCircle('hex'), ARC.hot, 4.5, 0.6, { rise: 1, spin: 3 });
      this.stars.emit({ pos: V(gp.x, 1, gp.z), count: 50, speed: [3, 7], gravity: -3, drag: 1.4, life: [0.6, 1.1], size: [0.24, 0.4], color: [ARC.hot, ARC.light, ARC.mid] });
    });
    return end;
  };

  P.fx_ma_thunder_pillar = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, VOLT, 0.42, 36);
    this.hlCircle(gp, VOLT, 5.8, 1.5, 'star', 1.6);
    // ประกายไฟฟ้าวิ่งบนวงก่อนเสาพุ่ง
    this.anim(0.45, () => { if (Math.random() < 0.45) { const a = rand(0, TAU), b = a + rand(0.4, 1.2), r = rand(1, 2.6); this.mgBolt(V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r), V(gp.x + Math.cos(b) * r, 0.1, gp.z + Math.sin(b) * r), VOLT, 0.14, 0.04, 0); } });
    this.after(0.45, () => {
      this.pillar(gp, VOLT.main, 0.95, 10, 0.8, { grow: 0.07, opacity: 0.85 });
      this.pillar(gp, VOLT.hot, 0.38, 10, 0.75, { grow: 0.06, opacity: 0.85 });
      this.mgUnder(V(gp.x, 1.2, gp.z), VOLT, 4, 0.8, 0.5);
      this.wall(gp, VOLT.light, 0.3, 2.4, 1.6, 0.4);
      this.light(V(gp.x, 2, gp.z), VOLT.mid, 10, 0.8, 12);
    });
    // 3 จังหวะ: สายฟ้าแตกจากเสาไปหาศัตรู
    [0.5, 0.75, 1.0].forEach((t, n) => this.after(t - 0.02, () => {
      const src = V(gp.x, 1.6, gp.z);
      for (let i = 0; i < 2; i++) this.mgBolt(V(gp.x + rand(-0.3, 0.3), 0.1, gp.z + rand(-0.3, 0.3)), V(gp.x + rand(-0.6, 0.6), 10, gp.z + rand(-0.6, 0.6)), VOLT, 0.25, 0.1, 2);
      const list = this.inRadius(c, gp, 2.8).map(([o]) => this.hitPos(o));
      const pts = list.length ? list : [0, 1, 2].map(() => { const a = rand(0, TAU), d = rand(1.2, 2.6); return V(gp.x + Math.cos(a) * d, 0.1, gp.z + Math.sin(a) * d); });
      for (const p of pts) { this.mgBolt(src, p, VOLT, 0.28, 0.08, 1); this.flash(p, VOLT.light, 1.6, 0.25); this.sparks(p, [VOLT.hot, VOLT.acc, VOLT.light], 14, 4); }
      this.ring(gp, VOLT.mid, 0.3, 2.8, 0.4, { opacity: 0.8 });
      if (n === 2) {
        this.mgBolt(V(gp.x, 12, gp.z), V(gp.x, 0.05, gp.z), VOLT, 0.45, 0.22, 3);
        this.mgHit(V(gp.x, 0.8, gp.z), VOLT, 1.5);
        this.cracks(gp, VOLT.mid, 5, 1.8, { glow: 1, dark: 0.6 });
        this.ring(gp, VOLT.hot, 0.4, 3.6, 0.55);
      }
    }));
    return end;
  };

  P.fx_ma_mana_shield = function (c) {
    const end = this.fx_nf(c), P0 = () => c.caster.pos.clone().setY(0);
    this.hlCircle(P0(), ARC, 3.6, 1.6, 'hex', 1);
    this.disc(P0(), TX.runeCircle('star'), ARC.light, 2.6, 1.0, { spin: -2, rise: 1.8 * this.vs, opacity: 0.8 });
    // ผลึกมานา 6 ชิ้นโคจรรอบตัวแล้วหดเข้าหา
    const items = Array.from({ length: 6 }, () => {
      const g = this.add(new THREE.Group());
      const m = new THREE.Mesh(this.geo.crystal, new THREE.MeshStandardMaterial({ color: ARC.main, emissive: ARC.mid, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3, flatShading: true }));
      m.scale.set(0.2, 0.38, 0.2);
      const s = new THREE.Sprite(this.spriteMat(TX.softDot(), ARC.mid, 0.8)); s.scale.setScalar(1.1);
      g.add(m, s); g.userData.m = m; return g;
    });
    this.anim(1.3, (k, dt, t) => {
      const q = c.caster.pos, r = 1.6 * (1 - easeIn(k) * 0.5), g = Math.min(1, t / 0.2);
      items.forEach((it, i) => {
        const a = t * 4 + (i / 6) * TAU;
        it.position.set(q.x + Math.cos(a) * r, (0.7 + 0.35 * Math.sin(t * 3 + i)) * this.vs, q.z + Math.sin(a) * r);
        it.scale.setScalar(g); it.userData.m.rotation.y += dt * 5;
        if (Math.random() < 0.4) this.fx.emit({ pos: it.position, count: 1, speed: 0.2, life: 0.35, size: [0.15, 0.25], color: [ARC.light, ARC.mid] });
      });
    }, () => items.forEach((it) => { this.flash(it.position, ARC.light, 1.2, 0.25); this.remove(it); }));
    this.after(0.45, () => this.hlDome(() => c.caster.pos, ARC, 1.9, 1.5));
    this.after(0.5, () => {
      const q = c.caster.pos;
      this.flash(V(q.x, 1.2, q.z), ARC.light, 4, 0.4);
      this.sigil(V(q.x, 2.6 * this.vs, q.z), TX.runeCircle('hex'), ARC.light, 1.4, 0.9, { rise: 0.4, spin: 2 });
      this.ring(V(q.x, 0, q.z), ARC.light, 0.3, 2.6, 0.5); this.ring(V(q.x, 0, q.z), ARC.main, 0.3, 3.2, 0.7, { opacity: 0.8 });
      this.light(V(q.x, 1.5, q.z), ARC.mid, 5, 0.6, 6);
    });
    // ประกายดาวลอยขึ้นรอบโดม
    this.after(0.5, () => this.anim(1.2, () => { const q = c.caster.pos; if (Math.random() < 0.6) this.stars.emit({ pos: V(q.x + rand(-1.6, 1.6), rand(0.1, 0.6), q.z + rand(-1.6, 1.6)), count: 1, vel: () => V(0, rand(1.5, 3), 0), life: [0.6, 1], size: [0.2, 0.32], color: [ARC.light, ARC.hot] }); }));
    return Math.max(end, 1.7);
  };

  P.fx_ma_arcane_cataclysm = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, ARC, 0.8, 70);
    // วงเวทยักษ์ 2 ชั้นหมุนสวนกัน
    this.after(0.15, () => {
      this.disc(gp, TX.softDot(), ARC.deep, 9.5, 3.2, { spin: 0, opacity: 0.5, blending: NORMAL, y: 0.04 });
      this.hlCircle(gp, ARC, 9.4, 3.2, 'hex', 0.6);
      this.disc(gp, TX.runeCircle('star'), ARC.light, 6, 3.1, { spin: -1.4, opacity: 0.9, y: 0.09 });
      this.disc(gp, TX.runeCircle('cross'), ARC.hot, 3, 3.0, { spin: 2.2, opacity: 0.7, y: 0.1 });
    });
    // แสงเวทส่องจากฟ้า
    this.after(0.4, () => { this.flash(V(gp.x, 9, gp.z), ARC.light, 8, 1.2); this.light(V(gp.x, 8, gp.z), ARC.mid, 6, 1.4, 14); });
    [0.5, 0.7, 0.9, 1.1].forEach((t) => this.after(t, () => { for (let i = 0; i < 2; i++) { const a = rand(0, TAU), r = rand(0.8, 3.2); this.hlBeam(V(gp.x + Math.cos(a) * r, 0, gp.z + Math.sin(a) * r), ARC, 0.3, 0.35, 10); } }));
    this.anim(3.0, () => { if (Math.random() < 0.6) { const a = rand(0, TAU), r = rand(0.5, 4.2); this.stars.emit({ pos: V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(1.5, 3.5), 0), life: [0.6, 1], size: [0.2, 0.34], color: [ARC.light, ARC.hot] }); } });
    // อุกกาบาตเวทลูกเล็ก 2 ลูก แล้วลูกยักษ์
    [1.4, 2.0].forEach((t) => { const a = rand(0, TAU), d = rand(0.6, 1.4); this.mgMeteorDrop(c, V(gp.x + Math.cos(a) * d, 0, gp.z + Math.sin(a) * d), ARC, t, { size: 0.6, dur: 0.45, R: 2 }); });
    this.mgMeteorDrop(c, gp, ARC, 3.0, { size: 1.5, dur: 0.8, R: 3.6, big: true });
    this.after(3.0, () => {
      this.sigil(V(gp.x, 2.2, gp.z), TX.runeCircle('hex'), ARC.hot, 8, 0.8, { rise: 1.5, spin: 2 });
      this.stars.emit({ pos: V(gp.x, 1.5, gp.z), count: 120, speed: [4, 10], gravity: -3, drag: 1.4, life: [0.8, 1.4], size: [0.3, 0.5], color: [ARC.hot, ARC.light, ARC.mid] });
    });
    return Math.max(end, 3.6);
  };

  /* ================= Wizard · จอมเวทน้ำแข็ง ================= */
  P.fx_wz_frost_shards = function (c) {
    const end = this.fx_nf(c), { t } = this.swTarget(c, 5);
    this.hlCircle(c.caster.pos.clone().setY(0), ICE, 3, 1.2, 'hex', 1.4);
    this.anim(0.5, () => { const q = c.caster.pos; this.snow.emit({ pos: V(q.x + rand(-1.2, 1.2), 0.1, q.z + rand(-1.2, 1.2)), count: 1, vel: () => V(0, rand(1.5, 3), 0), life: [0.5, 0.8], size: [0.15, 0.26], color: [ICE.hot, ICE.light] }); });
    const fixed = c.caster.pos.clone().setY(1 * this.vs).addScaledVector(c.caster.facing, 6);
    const dest = () => (t ? this.hitPos(t) : fixed);
    [0.58, 0.65, 0.75, 0.81, 0.9].forEach((th, i) => {
      const fly = 0.26, spawn = 0.1 + i * 0.04, off = (i - 2) * 0.6, big = i >= 3, S = big ? 1.9 : 1.6;
      this.after(spawn, () => {
        const sh = this.add(this.mgShard(ICE, S));
        sh.scale.setScalar(0.01);
        this.anim(th - fly - spawn, (k, dt, tt) => {
          const q = c.caster.pos, right = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 0) : V(1, 0, 0);
          sh.position.set(q.x, (1.9 + Math.abs(off) * -0.25 + Math.sin(tt * 10 + i) * 0.05) * this.vs, q.z).addScaledVector(right, off).addScaledVector(c.caster.facing, -0.2);
          sh.lookAt(dest()); sh.scale.setScalar(S * easeOut(Math.min(1, tt / 0.12)));
        }, () => {
          this.projectile(sh, sh.position.clone(), dest, fly, { orient: true, onFly: (p) => this.snow.emit({ pos: p, count: 2, spread: 0.1, speed: 0.4, life: [0.25, 0.4], size: [0.15, 0.25], color: [ICE.hot, ICE.light] }), onHit: (tp) => {
            this.mgHit(tp, ICE, big ? 1.0 : 0.6, { ring: big });
            this.snow.emit({ pos: tp, count: big ? 24 : 12, speed: [2, 5], gravity: -6, life: [0.4, 0.7], size: [0.15, 0.3], color: [ICE.hot, ICE.light] });
            if (i === 4) this.mgCrystals(V(tp.x, 0, tp.z), ICE, { count: 7, r0: 0.3, r1: 1.4, h: [0.5, 0.9], width: 0.15, dur: 0.6 });
          } });
        });
      });
    });
    return end;
  };

  P.fx_wz_glacier_spike = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, ICE, 0.25, 30);
    this.hlCircle(gp, ICE, 5.6, 1.3, 'hex', 1.6);
    this.ring(gp, ICE.light, 2.8, 0.4, 0.3, { opacity: 0.8 });
    this.after(0.12, () => this.cracks(gp, ICE.light, 5.4, 1.6, { glow: 1, dark: 0.35 }));
    this.after(0.24, () => this.mgCrystals(gp, ICE, { count: 16, r0: 0.3, r1: 2.4, h: [1.4, 2.4], width: 0.32, dur: 1.1, rise: 0.09, center: 3.4 }));
    this.after(0.33, () => {
      this.mgHit(V(gp.x, 0.8, gp.z), ICE, 1.5);
      this.snow.emit({ pos: V(gp.x, 1, gp.z), count: 80, spread: 1.4, speed: [3, 8], gravity: -6, drag: 1.2, life: [0.6, 1.1], size: [0.22, 0.42], color: [ICE.hot, ICE.light] });
      this.ring(gp, ICE.hot, 0.3, 3, 0.45); this.ring(gp, ICE.main, 0.3, 3.6, 0.6, { opacity: 0.8 });
      this.wall(gp, ICE.light, 0.4, 2.6, 1.4, 0.5);
      this.smoke.emit({ pos: V(gp.x, 0.3, gp.z), count: 14, spread: 1.6, flat: true, speed: [0.5, 1.5], life: [0.8, 1.3], size: [1, 1.6], sizeEnd: 2, color: '#d8f2ff', colorEnd: '#9ac8e8', alpha: 0.45 });
    });
    return end;
  };

  P.fx_wz_blizzard_vortex = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, ICE, 0.3, 30);
    this.hlCircle(gp, ICE, 7.2, 2.5, 'hex', -1.5);
    this.after(0.05, () => {
      this.mgTornado(gp, ICE.deep, 2.4, 4.4, 2.15, { spin: 12, opacity: 0.45, blending: NORMAL });
      this.mgTornado(gp, ICE.main, 2.2, 4.4, 2.15, { spin: 14, opacity: 0.7 });
      this.mgTornado(gp, ICE.light, 1.0, 5.2, 2.15, { spin: 18, opacity: 0.5 });
      this.windTube(gp, ICE.mid, 3.0, 1.4, 2.15, { spin: -10, opacity: 0.4 });
    });
    // หิมะหมุนวนเข้าหาจุดกลาง
    this.anim(2.15, () => {
      for (let i = 0; i < 5; i++) {
        const a = rand(0, TAU), r = rand(1, 3.6), tan = V(-Math.sin(a), 0, Math.cos(a)), inw = V(-Math.cos(a), 0, -Math.sin(a));
        this.snow.emit({ pos: V(gp.x + Math.cos(a) * r, rand(0.2, 3), gp.z + Math.sin(a) * r), count: 1, vel: () => tan.clone().multiplyScalar(6).addScaledVector(inw, 2.5).add(V(0, 1, 0)), life: [0.45, 0.7], size: [0.22, 0.4], color: [ICE.hot, ICE.light] });
      }
      const a = rand(0, TAU), r = rand(0.6, 2.6);
      this.fx.emit({ pos: V(gp.x + Math.cos(a) * r, rand(0.3, 3.5), gp.z + Math.sin(a) * r), count: 1, vel: () => V(-Math.sin(a) * 10, 1, Math.cos(a) * 10), life: 0.22, size: [0.12, 0.2], color: ICE.light });
    });
    [0.15, 0.6, 1.05, 1.5, 1.9].forEach((t) => this.after(t, () => {
      this.ring(gp, ICE.light, 3, 0.5, 0.35, { opacity: 0.6 });
      for (const [o] of this.inRadius(c, gp, 3)) { const p = this.hitPos(o); this.flash(p, ICE.light, 1.3, 0.2); this.snow.emit({ pos: p, count: 6, speed: [2, 4], gravity: -6, life: 0.45, size: [0.14, 0.26], color: ICE.hot }); }
    }));
    this.after(2.12, () => this.mgCrystals(gp, ICE, { count: 16, r0: 1.0, r1: 3.2, h: [1, 1.7], width: 0.26, dur: 0.8, rise: 0.08, center: 2.6 }));
    this.after(2.21, () => {
      this.mgHit(V(gp.x, 1, gp.z), ICE, 1.6);
      this.flash(V(gp.x, 1.5, gp.z), ICE.hot, 7, 0.45);
      this.snow.emit({ pos: V(gp.x, 1, gp.z), count: 110, spread: 0.6, vel: () => { const a = rand(0, TAU), s = rand(5, 10); return V(Math.cos(a) * s, rand(0, 3), Math.sin(a) * s); }, gravity: -5, drag: 1.6, life: [0.6, 1.1], size: [0.22, 0.42], color: [ICE.hot, ICE.light] });
      this.ring(gp, ICE.hot, 0.4, 3.8, 0.55); this.ring(gp, ICE.main, 0.4, 4.4, 0.75, { opacity: 0.8 });
      this.wall(gp, ICE.light, 0.5, 3.2, 1.6, 0.55);
    });
    return Math.max(end, 2.6);
  };

  P.fx_wz_frost_armor = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0);
    this.hlCircle(P0, ICE, 3.4, 1.6, 'hex', 1);
    this.mgCrystals(P0, ICE, { count: 9, r0: 1.0, r1: 1.15, h: [0.6, 1.0], width: 0.17, dur: 1.4, rise: 0.25 });
    this.anim(1.3, () => { const q = c.caster.pos, a = rand(0, TAU); this.snow.emit({ pos: V(q.x + Math.cos(a) * 1.4, rand(0.2, 0.6), q.z + Math.sin(a) * 1.4), count: 2, vel: () => V(-Math.sin(a) * 2, rand(1.5, 2.5), Math.cos(a) * 2), life: [0.6, 0.9], size: [0.18, 0.3], color: [ICE.hot, ICE.light] }); });
    this.after(0.35, () => this.hlDome(() => c.caster.pos, ICE, 1.9, 1.3));
    this.after(0.4, () => {
      const q = c.caster.pos;
      this.flash(V(q.x, 1.2, q.z), ICE.light, 4, 0.4);
      this.sigil(V(q.x, 2.6 * this.vs, q.z), TX.snowflake(), ICE.light, 1.5, 0.9, { rise: 0.4, spin: 1.5 });
      this.ring(V(q.x, 0, q.z), ICE.light, 0.3, 2.6, 0.5); this.ring(V(q.x, 0, q.z), ICE.main, 0.3, 3.2, 0.7, { opacity: 0.8 });
      this.light(V(q.x, 1.5, q.z), ICE.mid, 5, 0.6, 6);
    });
    return Math.max(end, 1.5);
  };

  P.fx_wz_absolute_zero = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, ICE, 0.7, 60);
    this.hlCircle(gp, ICE, 10, 3.0, 'hex', 0.3);
    this.after(0.2, () => this.disc(gp, TX.runeCircle('star'), ICE.light, 6, 2.5, { spin: -0.8, opacity: 0.7, y: 0.08 }));
    // หมอกเย็นเลียดพื้น + หิมะร่วง
    this.anim(2.45, () => {
      const a = rand(0, TAU), r = rand(0.5, 4.4);
      this.smoke.emit({ pos: V(gp.x + Math.cos(a) * r, 0.25, gp.z + Math.sin(a) * r), count: 1, speed: 0.3, life: [1, 1.5], size: [1.2, 1.8], sizeEnd: 1.6, color: '#d8f2ff', colorEnd: '#9ac8e8', alpha: 0.35 });
      this.snow.emit({ pos: V(gp.x + rand(-4.4, 4.4), rand(3, 5), gp.z + rand(-4.4, 4.4)), count: 2, vel: () => V(rand(-0.5, 0.5), -rand(2, 3.5), rand(-0.5, 0.5)), life: [1, 1.5], size: [0.22, 0.4], color: [ICE.hot, ICE.light] });
    });
    // ผลึกงอกทีละชั้นจากขอบเข้าหากลาง ค้างไว้จนแตกพร้อมกันที่ 2.46
    const layers = [[0.75, 3.4, 4.4, 18], [1.25, 2.4, 3.4, 16], [1.7, 1.3, 2.4, 12], [2.1, 0.3, 1.3, 7]];
    layers.forEach(([t, r0, r1, n], i) => this.after(t - 0.1, () => {
      this.mgCrystals(gp, ICE, { count: n, r0, r1, h: [1.0 + i * 0.4, 1.8 + i * 0.5], width: 0.26 + i * 0.04, dur: 2.46 - t + 0.1, rise: 0.14, center: i === 3 ? 4.5 : 0 });
      this.ring(gp, ICE.light, r1, r0, 0.4);
      this.light(V(gp.x, 1.5, gp.z), ICE.mid, 5, 0.4, 10);
    }));
    this.after(2.2, () => { this.flash(V(gp.x, 3, gp.z), ICE.hot, 5, 0.3); this.star(V(gp.x, 5, gp.z), ICE.hot, 4, 0.3); });
    this.after(2.46, () => {
      this.flash(V(gp.x, 2, gp.z), '#ffffff', 14, 0.6, TX.softDot(), 1);
      this.mgHit(V(gp.x, 1, gp.z), ICE, 2.2);
      this.snow.emit({ pos: V(gp.x, 1.2, gp.z), count: 220, spread: 2.5, speed: [4, 12], gravity: -6, drag: 1.2, life: [0.8, 1.6], size: [0.25, 0.5], color: [ICE.hot, ICE.light] });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? ICE.main : ICE.hot, 0.4, 5.5 + i * 0.6, 0.8));
      this.wall(gp, ICE.light, 0.6, 4.6, 2, 0.6);
      this.pillar(gp, ICE.light, 1.2, 10, 0.7, { grow: 0.1, opacity: 0.8 });
      this.cracks(gp, ICE.light, 10, 2.6, { glow: 1, dark: 0.35 });
      this.smoke.emit({ pos: V(gp.x, 0.4, gp.z), count: 30, spread: 3, flat: true, speed: [1, 3], life: [1, 1.6], size: [1.4, 2.2], sizeEnd: 2, color: '#e8f8ff', colorEnd: '#a8d4f0', alpha: 0.45 });
    });
    return Math.max(end, 3.2);
  };
}
