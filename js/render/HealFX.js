// v0.68 สกิลสายฮีลชุดใหม่ วาดเป็นเอฟเฟกต์ 3 มิติในฉากจริง (แทน sprite sheet)
// Acolyte = ทองศักดิ์สิทธิ์ (fx_ac_*) · Priest = เขียวหยก + บัวชมพู (fx_pr_*)
// ดาเมจ/ฮีล/บัฟยังมาจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX (swBurst · swFace · swLine · swFlameColumn)
import { THREE } from './three.js?v=0.76.0';
import * as TX from './FxTextures.js?v=0.76.0';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;

const HOLY = { deep: '#7a4206', main: '#ffa418', mid: '#ffc63a', light: '#ffe17a', hot: '#fffbe6' };
const LIFE = { deep: '#0a5432', main: '#1ed27a', mid: '#4aeca0', light: '#a8ffd4', hot: '#effff7' };
const PINK = { deep: '#7a1a4a', main: '#ff4fa0', mid: '#ff7ab8', light: '#ffb8da', hot: '#fff0f8' };

export function installHealFX(P) {
  /* ---------- ตัวช่วย ---------- */
  // วงเวทบนพื้น 2 ชั้น (ชั้นสีเข้มผสมปกติ อ่านออกบนพื้นสว่าง)
  P.hlCircle = function (gp, pal, size, dur, kind = 'star', spin = 0.8) {
    this.disc(gp, TX.runeCircle(kind), pal.deep, size * 1.06, dur, { spin: -spin * 0.5, opacity: 0.6, blending: NORMAL, y: 0.05 });
    this.disc(gp, TX.runeCircle(kind), pal.mid, size, dur, { spin });
    this.disc(gp, TX.softRing(), pal.main, size * 1.15, dur * 0.8, { spin: 0, opacity: 0.55 });
  };

  // ลำแสงจากฟ้า (ทรงกระบอก + แกนขาว + จุดกระแทก)
  P.hlBeam = function (gp, pal, r = 0.6, dur = 0.5, h = 10) {
    this.pillar(gp, pal.main, r, h, dur, { grow: 0.06, fromSky: true, opacity: 0.85 });
    this.pillar(gp, pal.hot, r * 0.42, h, dur * 0.8, { grow: 0.05, fromSky: true, opacity: 0.8 });
    this.after(0.06, () => this.swBurst(V(gp.x, 0.5, gp.z), pal, 0.8 + r * 0.5));
  };

  // โดมครึ่งทรงกลมลายรังผึ้ง
  P.hlDome = function (pos, pal, r, dur) {
    if (!this.geo.dome) this.geo.dome = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const tex = TX.hexGrid().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 3);
    const outer = this.add(new THREE.Mesh(this.geo.dome, this.basic(pal.mid, { tex, opacity: 0 })));
    const tint = this.add(new THREE.Mesh(this.geo.dome, this.basic(pal.light, { opacity: 0, side: THREE.BackSide })));
    outer.renderOrder = tint.renderOrder = 5;
    this.anim(dur, (k, dt, t) => {
      const p = typeof pos === 'function' ? pos() : pos, g = easeOut(Math.min(1, t / 0.35)), fade = k > 0.8 ? (1 - k) / 0.2 : 1;
      for (const m of [outer, tint]) { m.position.set(p.x, 0, p.z); m.scale.set(r * g, r * 0.9 * g, r * g); }
      tex.offset.y += dt * 0.15;
      outer.material.opacity = 0.75 * fade; tint.material.opacity = 0.12 * fade;
    }, () => { tex.dispose(); this.remove(outer); this.remove(tint); });
  };

  // ปีกแสงคู่หลังผู้ร่าย (หันหากล้อง กางออกแล้วกระพือ)
  P.hlWings = function (c, pal, dur, span = 3.2) {
    const make = (side) => {
      const ms = [[pal.deep, 1.05, 0.55, NORMAL], [pal.main, 1, 0.9, ADD], [pal.hot, 0.8, 0.8, ADD]].map(([col, sc, op, blending]) => {
        const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.wing(), opacity: 0, blending }))); m.renderOrder = 3; m.userData = { sc, op }; return m;
      });
      return { side, ms };
    };
    const W = [make(-1), make(1)];
    this.anim(dur, (k, dt, t) => {
      const p = c.caster.pos, open = easeOut(Math.min(1, t / 0.6)), fade = k > 0.82 ? (1 - k) / 0.18 : Math.min(1, t / 0.2), flap = Math.sin(t * 5) * 0.08;
      const right = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 0) : V(1, 0, 0), back = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 2).multiplyScalar(-0.3) : V();
      for (const { side, ms } of W) for (const m of ms) {
        m.position.set(p.x, p.y + 1.55 * this.vs, p.z).addScaledVector(right, side * span * 0.42 * open).add(back);
        this.swFace(m, side * (0.25 + flap));
        m.scale.set(-side * span * m.userData.sc * open, span * 0.95 * m.userData.sc * open, 1);
        m.material.opacity = m.userData.op * fade;
      }
      if (Math.random() < 0.5) this.feathers.emit({ pos: V(p.x + rand(-span * 0.6, span * 0.6), p.y + rand(1.2, 2.6), p.z), count: 1, vel: () => V(rand(-0.4, 0.4), rand(-0.8, -0.2), rand(-0.4, 0.4)), life: [0.8, 1.4], size: [0.25, 0.4], color: pal.light });
    }, () => W.forEach(({ ms }) => ms.forEach((m) => this.remove(m))));
  };

  // ลูกพลังโค้งไปหาเป้า (ฮีล/เมล็ด)
  P.hlOrb = function (c, pal, dur, { arc = 1, size = 0.5, trail = 'fx', onHit } = {}) {
    const from = this.hand(c), t = c.targets[c.main], to = t ? () => this.hitPos(t) : () => from.clone().addScaledVector(c.caster.facing, 4);
    const g = new THREE.Group();
    const halo = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0.9)); halo.scale.setScalar(size * 3.2);
    const core = new THREE.Sprite(this.spriteMat(TX.star4(), pal.hot, 1)); core.scale.setScalar(size * 2.2);
    const dark = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.deep, 0.5, NORMAL)); dark.scale.setScalar(size * 2.4); dark.renderOrder = 6;
    g.add(dark, halo, core);
    this.projectile(g, from, to, dur, { arc, orient: false, onFly: (p, k, dt) => {
      core.material.rotation += dt * 8;
      this.fx.emit({ pos: p, count: 4, spread: 0.12, speed: 0.4, life: [0.25, 0.45], size: [0.2, 0.35], sizeEnd: 0.1, color: [pal.light, pal.mid], colorEnd: pal.main });
      if (trail === 'feather' && Math.random() < 0.35) this.feathers.emit({ pos: p, count: 1, speed: 0.6, life: 0.7, size: [0.2, 0.3], color: pal.light });
      if (trail === 'petal' && Math.random() < 0.5) this.stars.emit({ pos: p, count: 1, speed: 0.8, life: 0.6, size: [0.18, 0.28], color: [PINK.light, PINK.mid] });
    }, onHit });
  };

  P.hlSpikes = function (gp, pal, o = {}) {
    // เถาหนามสีเขียวเข้ม ปลายเรืองนิด ๆ (ไม่ให้ดูเป็นน้ำแข็งขาว)
    this.spikes(gp, { count: 12, r0: 0.3, r1: 2.6, h: [0.9, 1.6], width: 0.22, dur: 1.1, rise: 0.12, ...o, mat: new THREE.MeshBasicMaterial({ color: pal === LIFE ? '#1a8a4a' : pal.deep, transparent: true }) });
    this.after(o.delay || 0, () => this.fx.emit({ pos: V(gp.x, 0.2, gp.z), count: 30, spread: (o.r1 || 2.6) * 0.8, flat: true, vel: () => V(0, rand(2, 4), 0), drag: 2, life: [0.3, 0.6], size: [0.18, 0.32], color: [pal.light, pal.mid, PINK.mid], colorEnd: pal.main }));
  };

  P.hlPetals = function (pos, n = 60, spd = 6) {
    this.stars.emit({ pos, count: n, speed: [spd * 0.4, spd], gravity: -3, drag: 1.4, life: [0.7, 1.3], size: [0.22, 0.4], sizeEnd: 0.4, color: [PINK.light, PINK.mid, PINK.hot, LIFE.light] });
  };

  /* ================= Acolyte · นักบวชแสง ================= */
  P.fx_ac_holy_light = function (c) {
    const end = this.fx_nf(c);
    this.swCharge(c, HOLY, 0.24, 30);
    this.after(0.22, () => this.hlOrb(c, HOLY, 0.26, { arc: 0.9, size: 0.45, trail: 'feather', onHit: (tp) => {
      this.swBurst(tp, HOLY, 1.1);
      this.sigil(tp.clone().add(V(0, 0.3, 0)), TX.crossGlow(), HOLY.light, 2.8, 0.55, { rise: 0.6 });
      this.pillar(V(tp.x, 0, tp.z), HOLY.mid, 0.45, 4, 0.4, { grow: 0.08, opacity: 0.7 });
      this.ring(V(tp.x, 0, tp.z), HOLY.light, 0.2, 1.6, 0.45);
    } }));
    return end;
  };

  P.fx_ac_judgement_rays = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, HOLY, 0.3, 30);
    this.hlCircle(gp, HOLY, 6.4, 1.6, 'cross', 1);
    this.anim(1.2, () => { if (Math.random() < 0.6) this.stars.emit({ pos: V(gp.x + rand(-2.6, 2.6), rand(0.3, 3), gp.z + rand(-2.6, 2.6)), count: 1, speed: 0.3, life: 0.7, size: [0.2, 0.35], color: HOLY.light }); });
    [0.4, 0.6, 0.8].forEach((t, i) => this.after(t - 0.06, () => {
      const pts = [0, 1].map(() => V(gp.x + rand(-2, 2), 0, gp.z + rand(-2, 2)));
      for (const q of pts) this.hlBeam(q, HOLY, 0.45 + i * 0.05, 0.4);
    }));
    this.after(0.94, () => {
      this.hlBeam(gp, HOLY, 1.4, 0.7, 12);
      this.sigil(V(gp.x, 1.6, gp.z), TX.crossGlow(), HOLY.hot, 5, 0.7, { rise: 1 });
      this.explosion(V(gp.x, 0.6, gp.z), 2.4, { color: HOLY.main, core: HOLY.hot, smoke: false, scorchSize: 0, debris: false });
      this.feathers.emit({ pos: V(gp.x, 1.5, gp.z), count: 40, speed: [2, 5], gravity: -1.2, drag: 1.5, life: [1, 1.6], size: [0.25, 0.4], color: [HOLY.light, HOLY.hot] });
    });
    return end;
  };

  P.fx_ac_healing_pillar = function (c) {
    const end = this.fx_nf(c), p0 = c.caster.pos.clone().setY(0);
    this.hlCircle(p0, HOLY, 3.6, 1.3, 'cross', 1.2);
    this.after(0.12, () => {
      const P0 = () => c.caster.pos.clone().setY(0);
      this.pillar(P0(), HOLY.main, 1.1, 10, 0.9, { grow: 0.08, fromSky: true, opacity: 0.8 });
      this.pillar(P0(), HOLY.hot, 0.45, 10, 0.75, { grow: 0.06, fromSky: true, opacity: 0.8 });
      this.anim(0.9, () => { const q = c.caster.pos; this.fx.emit({ pos: V(q.x + rand(-0.8, 0.8), rand(0, 0.4), q.z + rand(-0.8, 0.8)), count: 3, vel: () => V(0, rand(1.5, 3.5), 0), life: [0.5, 0.9], size: [0.18, 0.3], color: [HOLY.light, HOLY.hot] }); });
      this.feathers.emit({ pos: V(p0.x, 3.5, p0.z), count: 22, spread: 1.4, vel: () => V(rand(-0.5, 0.5), rand(-1.2, -0.6), rand(-0.5, 0.5)), life: [1.1, 1.6], size: [0.25, 0.4], color: [HOLY.light, HOLY.hot] });
    });
    this.after(0.32, () => { const q = c.caster.pos; this.sigil(V(q.x, 2.4 * this.vs, q.z), TX.crossGlow(), HOLY.light, 1.8, 0.8, { rise: 0.5 }); this.ring(V(q.x, 0, q.z), HOLY.light, 0.2, 2.4, 0.5); this.light(V(q.x, 1.5, q.z), HOLY.mid, 6, 0.5, 6); });
    return end;
  };

  P.fx_ac_light_blessing = function (c) {
    const end = this.fx_nf(c), p0 = c.caster.pos.clone().setY(0);
    this.hlCircle(p0, HOLY, 4.8, 1.5, 'star', 0.6);
    for (let i = 0; i < 3; i++) this.after(i * 0.12, () => this.ring(c.caster.pos.clone().setY(0), i % 2 ? HOLY.main : HOLY.light, 0.3, 3.4, 0.6));
    this.after(0.2, () => {
      this.windTube(c.caster.pos.clone().setY(0), HOLY.light, 1.1, 2.6, 1.0, { spin: 8, opacity: 0.55 });
      this.sigil(c.caster.pos.clone().setY(2.6 * this.vs), TX.swordsSigil(), HOLY.light, 1.6, 1.1, { rise: 0.4 });
      this.anim(1.0, () => { const q = c.caster.pos; this.stars.emit({ pos: V(q.x + rand(-1.4, 1.4), rand(0, 0.5), q.z + rand(-1.4, 1.4)), count: 2, vel: () => V(0, rand(2, 4), 0), life: [0.6, 1], size: [0.22, 0.36], color: [HOLY.light, HOLY.hot] }); });
      this.light(c.caster.pos.clone().setY(1.5), HOLY.mid, 5, 0.6, 6);
    });
    return end;
  };

  P.fx_ac_divine_descent = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, HOLY, 0.6, 50);
    this.hlWings(c, HOLY, 2.8, 3.4);
    this.after(0.25, () => this.hlCircle(gp, HOLY, 8, 2.4, 'cross', 0.5));
    this.after(0.4, () => this.anim(1.9, () => { if (Math.random() < 0.7) this.feathers.emit({ pos: V(gp.x + rand(-3.5, 3.5), rand(4, 6), gp.z + rand(-3.5, 3.5)), count: 1, vel: () => V(rand(-0.3, 0.3), rand(-1.6, -0.8), rand(-0.3, 0.3)), life: [1.4, 2], size: [0.3, 0.45], color: [HOLY.light, HOLY.hot] }); }));
    [0.95, 1.25, 1.55].forEach((t) => this.after(t - 0.06, () => { for (let k = 0; k < 3; k++) this.hlBeam(V(gp.x + rand(-2.6, 2.6), 0, gp.z + rand(-2.6, 2.6)), HOLY, 0.55, 0.45); }));
    this.after(1.75, () => { this.sigil(V(gp.x, 7, gp.z), TX.crossGlow(), HOLY.hot, 3, 0.4, { rise: 0 }); this.light(V(gp.x, 6, gp.z), HOLY.mid, 6, 0.4, 12); });
    this.after(2.04, () => {
      this.hlBeam(gp, HOLY, 2.2, 0.9, 14);
      this.sigil(V(gp.x, 2.2, gp.z), TX.crossGlow(), HOLY.hot, 8, 0.9, { rise: 1.5 });
      this.explosion(V(gp.x, 0.7, gp.z), 3.4, { color: HOLY.main, core: HOLY.hot, ctx: c, lvl: 3, smoke: false, scorchSize: 0, debris: false });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? HOLY.main : HOLY.hot, 0.4, 5 + i * 0.6, 0.8));
      this.feathers.emit({ pos: V(gp.x, 1.5, gp.z), count: 80, speed: [3, 8], gravity: -1, drag: 1.4, life: [1.2, 2], size: [0.3, 0.5], color: [HOLY.light, HOLY.hot] });
      this.cracks(gp, HOLY.light, 7, 2.4, { glow: 1, dark: 0.4 });
    });
    return Math.max(end, 2.8);
  };

  /* ================= Priest · ผู้พิทักษ์ชีวิต ================= */
  P.fx_pr_life_seed = function (c) {
    const end = this.fx_nf(c);
    this.swCharge(c, LIFE, 0.24, 30);
    this.after(0.2, () => this.hlOrb(c, LIFE, 0.35, { arc: 1.6, size: 0.42, trail: 'petal', onHit: (tp) => {
      const gp = V(tp.x, 0, tp.z);
      this.swBurst(tp, LIFE, 1.0);
      this.hlSpikes(gp, LIFE, { count: 9, r0: 0.2, r1: 1.3, h: [0.8, 1.4], width: 0.18, dur: 0.9 });
      this.hlPetals(tp, 30, 4);
      this.flash(tp, PINK.mid, 3, 0.4);
      this.ring(gp, LIFE.light, 0.2, 1.8, 0.45);
    } }));
    return end;
  };

  P.fx_pr_thorn_bloom = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, LIFE, 0.3, 30);
    this.hlCircle(gp, LIFE, 6.4, 1.6, 'star', 0.8);
    this.after(0.3, () => this.cracks(gp, LIFE.mid, 6.4, 1.8, { glow: 1, dark: 0.55 }));
    this.after(0.38, () => {
      this.hlSpikes(gp, LIFE, { count: 16, r0: 0.4, r1: 2.8, h: [1.0, 1.8], width: 0.24, dur: 1.1 });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; this.lightning(V(gp.x, 0.15, gp.z), V(gp.x + Math.cos(a) * 3, 0.1, gp.z + Math.sin(a) * 3), LIFE.mid, 0.45, { branches: 1, width: 0.05 }); }
      this.swBurst(V(gp.x, 0.5, gp.z), LIFE, 1.2, { up: true });
    });
    this.after(0.92, () => {
      // ดอกไม้ยักษ์บาน: กลีบชมพูแผ่ออก + แสงกลาง
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, m = this.add(new THREE.Mesh(this.geo.plane, this.basic(i % 2 ? PINK.mid : PINK.light, { tex: TX.crescent(), opacity: 0 })));
        m.rotation.x = -Math.PI / 2; m.rotation.z = a; m.renderOrder = 6;
        this.anim(0.7, (k) => { const r = 0.4 + 2.2 * easeOut(k); m.position.set(gp.x + Math.cos(a) * r * 0.5, 0.2 + k * 0.6, gp.z + Math.sin(a) * r * 0.5); m.scale.setScalar(1 + 2.4 * easeOut(k)); m.material.opacity = 0.95 * (1 - easeIn(k)); }, () => this.remove(m));
      }
      this.flash(V(gp.x, 0.8, gp.z), PINK.light, 6, 0.5);
      this.hlPetals(V(gp.x, 1, gp.z), 90, 8);
      this.hlSpikes(gp, LIFE, { count: 12, r0: 1.4, r1: 3.2, h: [1.2, 2.0], width: 0.26, dur: 0.9 });
      this.explosion(V(gp.x, 0.6, gp.z), 2.4, { color: LIFE.main, core: LIFE.hot, smoke: false, scorchSize: 0, debris: false });
    });
    return end;
  };

  P.fx_pr_healing_rain = function (c) {
    const end = this.fx_nf(c), P0 = () => c.caster.pos.clone().setY(0);
    this.hlCircle(P0(), LIFE, 6, 2.1, 'star', 0.5);
    // เมฆหยกเหนือหัว
    this.anim(1.9, (k) => { const q = c.caster.pos; if (k < 0.8) this.smoke.emit({ pos: V(q.x + rand(-2.4, 2.4), 4.2 + rand(-0.3, 0.3), q.z + rand(-2.4, 2.4)), count: 3, speed: 0.2, life: [0.8, 1.2], size: [1.6, 2.4], sizeEnd: 1.4, color: '#3aa880', colorEnd: '#1a6a58', alpha: 0.6 }); });
    this.after(0.3, () => this.disc(V(0, 0, 0).copy(P0()).setY(0), TX.softRing(), LIFE.mid, 6.4, 1.6, { spin: 0, y: 4.1, opacity: 0.7 }));
    [0.45, 0.95, 1.45].forEach((t) => this.after(t, () => this.anim(0.4, () => {
      const q = c.caster.pos;
      this.fx.emit({ pos: () => V(q.x + rand(-3, 3), 4.2, q.z + rand(-3, 3)), count: 14, vel: () => V(0, -rand(9, 12), 0), life: 0.42, size: [0.22, 0.34], sizeEnd: 1, color: [LIFE.mid, LIFE.light, '#6ad8ff'] });
    })));
    [0.6, 1.1, 1.6].forEach((t) => this.after(t, () => {
      const q = P0();
      for (let i = 0; i < 6; i++) this.ring(V(q.x + rand(-2.6, 2.6), 0, q.z + rand(-2.6, 2.6)), LIFE.light, 0.05, 0.6, 0.4, { opacity: 0.8 });
      this.stars.emit({ pos: V(q.x, 0.3, q.z), count: 16, spread: 1.6, flat: true, vel: () => V(0, rand(1.5, 3), 0), life: [0.6, 1], size: [0.22, 0.35], color: [LIFE.light, LIFE.hot] });
      this.sigil(V(q.x, 2.4 * this.vs, q.z), TX.crossGlow(), LIFE.light, 1.4, 0.5, { rise: 0.4 });
    }));
    return end;
  };

  P.fx_pr_lotus_sanctuary = function (c) {
    const end = this.fx_nf(c), P0 = () => c.caster.pos.clone().setY(0);
    this.hlCircle(P0(), LIFE, 5, 2.2, 'star', 0.4);
    // กลีบบัวรอบตัว (แผ่นกลีบตั้งขึ้นเป็นวง)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, col = i % 2 ? PINK.mid : LIFE.mid, m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.crescent(), opacity: 0 })));
      m.renderOrder = 6;
      this.anim(2.2, (k, dt, t) => { const q = c.caster.pos, g = easeOut(Math.min(1, t / 0.4)); m.position.set(q.x + Math.cos(a) * 1.8, 0.6 * g, q.z + Math.sin(a) * 1.8); m.rotation.set(0, -a + Math.PI / 2, Math.PI / 2 + 0.4); m.scale.setScalar(1.6 * g); m.material.opacity = 0.85 * (k > 0.8 ? (1 - k) / 0.2 : 1); }, () => this.remove(m));
    }
    this.after(0.12, () => this.hlDome(() => c.caster.pos, LIFE, 2.4, 2.1));
    this.after(0.15, () => { this.flash(c.caster.pos.clone().setY(1.2), LIFE.light, 4, 0.4); this.hlPetals(c.caster.pos.clone().setY(1), 40, 4); });
    this.anim(2, () => { const q = c.caster.pos; if (Math.random() < 0.5) this.stars.emit({ pos: V(q.x + rand(-2, 2), rand(0.2, 2.2), q.z + rand(-2, 2)), count: 1, speed: 0.3, life: 0.8, size: [0.18, 0.3], color: [PINK.light, LIFE.light] }); });
    return end;
  };

  P.fx_pr_tree_of_life = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 3);
    this.swCharge(c, LIFE, 0.6, 50);
    this.after(0.2, () => this.hlCircle(gp, LIFE, 8, 2.6, 'star', 0.4));
    // รากแผ่ออก
    this.after(0.5, () => { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + rand(-0.2, 0.2); this.after(i * 0.02, () => this.lightning(V(gp.x, 0.12, gp.z), V(gp.x + Math.cos(a) * 3.8, 0.08, gp.z + Math.sin(a) * 3.8), i % 2 ? LIFE.mid : LIFE.light, 1.4, { branches: 2, width: 0.07 })); } this.cracks(gp, LIFE.mid, 8, 2.4, { glow: 1, dark: 0.55 }); });
    [0.9, 1.3, 1.7].forEach((t, i) => this.after(t - 0.08, () => {
      this.hlSpikes(gp, LIFE, { count: 14, r0: 0.8 + i * 0.6, r1: 2.4 + i * 0.6, h: [1.4, 2.4], width: 0.3, dur: 0.9 });
      this.swBurst(V(gp.x + rand(-1.5, 1.5), 0.6, gp.z + rand(-1.5, 1.5)), LIFE, 1.2);
      this.hlPetals(V(gp.x, 0.8, gp.z), 30, 5);
    }));
    // ต้นไม้แสงพุ่งขึ้นกลางวง
    this.after(1.85, () => {
      this.pillar(gp, LIFE.main, 1.0, 9, 1.0, { grow: 0.35, opacity: 0.8 });
      this.pillar(gp, LIFE.hot, 0.35, 9, 0.9, { grow: 0.3, opacity: 0.75 });
      this.anim(0.35, (k) => { for (let b = 0; b < 3; b++) { const a = rand(0, Math.PI * 2), h = 2 + k * 6; this.fx.emit({ pos: V(gp.x, h, gp.z), count: 2, vel: () => V(Math.cos(a) * rand(2, 4), rand(0.5, 2), Math.sin(a) * rand(2, 4)), drag: 1.5, life: [0.6, 1], size: [0.25, 0.45], color: [LIFE.light, PINK.light], colorEnd: LIFE.main }); } });
    });
    this.after(2.14, () => {
      this.explosion(V(gp.x, 0.8, gp.z), 3.4, { color: LIFE.main, core: LIFE.hot, ctx: c, lvl: 3, smoke: false, scorchSize: 0, debris: false });
      this.hlPetals(V(gp.x, 2, gp.z), 160, 10);
      this.hlSpikes(gp, LIFE, { count: 20, r0: 2.0, r1: 3.8, h: [1.6, 2.8], width: 0.34, dur: 1.2 });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? PINK.mid : LIFE.hot, 0.4, 5 + i * 0.6, 0.8));
      this.flash(V(gp.x, 2, gp.z), PINK.light, 10, 0.6, TX.softRing(), 0.8);
    });
    return Math.max(end, 3);
  };
}
