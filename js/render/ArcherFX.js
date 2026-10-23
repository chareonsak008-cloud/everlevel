// v0.70 สกิลสายธนูชุดใหม่ วาดเป็นเอฟเฟกต์ 3 มิติในฉากจริง (แทน sprite sheet มุมข้าง v0.66)
// Archer = นักธนูแสงดาว ทอง-ขาว (fx_ar_*) · Hunter = พรานเงาจันทรา ม่วงเงา (fx_hn_*)
// ดาเมจ/สถานะยังมาจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/HealFX/MageFX (swCharge · swLine · swWave · hlCircle · mgHit · mgUnder · mgBlast · mgBolt)
import { THREE } from './three.js?v=0.93.0-p3.28';
import * as TX from './FxTextures.js?v=0.93.0-p3.28';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

const STAR = { deep: '#7a4a06', main: '#ffa814', mid: '#ffcc3a', light: '#ffe68a', hot: '#fffbe8', smoke: '#3a2a10', acc: '#8ab8ff' };
const MOON = { deep: '#2a0a4a', main: '#8a3aff', mid: '#b070ff', light: '#dcb8ff', hot: '#f6eeff', smoke: '#1a0a2a' };

export function installArcherFX(P) {
  /* ---------- ตัวช่วย ---------- */
  // ศรพลังงาน: ก้าน + หัว + หางแสง 3 ชั้น (ชั้นล่างสีเข้มผสมปกติ) — แกน +z ชี้ไปข้างหน้า
  P.arArrow = function (pal, s = 1) {
    if (!this.geo.arShaft) {
      this.geo.arShaft = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 5).rotateX(Math.PI / 2);
      this.geo.arHead = new THREE.ConeGeometry(0.1, 0.32, 5).rotateX(Math.PI / 2).translate(0, 0, 0.62);
    }
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(this.geo.arShaft, this.basic(pal.light, { opacity: 1 })); shaft.renderOrder = 8;
    const head = new THREE.Mesh(this.geo.arHead, this.basic(pal.hot, { opacity: 1 })); head.renderOrder = 8;
    g.add(shaft, head);
    for (const [col, w, h, z, op, blending, order] of [[pal.deep, 2.4, 0.6, -1.0, 0.5, NORMAL, 5], [pal.main, 2.2, 0.48, -0.95, 0.95, ADD, 6], [pal.hot, 1.6, 0.18, -0.7, 1, ADD, 7]]) {
      const st = new THREE.Mesh(this.geo.plane, this.basic(col, { tex: TX.flameStrip(), opacity: op, blending }));
      st.scale.set(w, h, 1); st.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); st.position.z = z; st.renderOrder = order; g.add(st);
    }
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), pal.mid, 0.9)); glow.scale.setScalar(1); glow.position.z = 0.6; g.add(glow);
    g.scale.setScalar(s);
    return g;
  };

  // ยิงศรจาก from (ค่าเริ่ม = มือ) ไปหา to (จุดหรือฟังก์ชัน)
  P.arShoot = function (c, pal, { from = null, to, dur = 0.2, arc = 0, s = 1, onHit = null, trail = true } = {}) {
    from = from || this.hand(c);
    this.flash(from, pal.light, 1.4 * s, 0.18);
    this.projectile(this.arArrow(pal, s), from, to, dur, { arc, orient: true, onFly: (p) => {
      if (trail) this.fx.emit({ pos: p, count: 3, spread: 0.06, speed: 0.4, life: [0.2, 0.35], size: [0.18 * s, 0.3 * s], sizeEnd: 0.1, color: [pal.hot, pal.light, pal.mid], colorEnd: pal.main });
    }, onHit });
  };

  // จุดหมายของเป้าหลัก (ตามเป้าที่เดินได้) หรือจุดหน้าผู้เล่น
  P.arDest = function (c, ahead = 6) {
    const t = c.targets[c.main];
    if (t) return () => this.hitPos(t);
    const p = c.caster.pos.clone().setY(1 * this.vs).addScaledVector(c.caster.facing, ahead);
    return () => p;
  };
  // ทิศจากผู้เล่นไปเป้า (แนวราบ)
  P.arDir = function (c) {
    const t = c.targets[c.main], d = t ? t.pos.clone().sub(c.caster.pos).setY(0) : c.caster.facing.clone().setY(0);
    return d.lengthSq() < 1e-4 ? c.caster.facing.clone().setY(0).normalize() : d.normalize();
  };

  // ดาวแปดแฉกแตกที่จุดโดน
  P.arStarPop = function (pos, pal, size = 1) {
    this.mgHit(pos, pal, size);
    this.star(pos, pal.hot, 3.2 * size, 0.4);
    const s2 = this.star(pos, pal.light, 2.6 * size, 0.45); s2.material.rotation = Math.PI / 4;
    this.stars.emit({ pos, count: Math.round(18 * size), speed: [2, 5 * size], drag: 2, life: [0.4, 0.8], size: [0.22, 0.4], color: [pal.hot, pal.light, pal.acc || pal.mid] });
  };

  // ร่างเงา (เงาดำทรงคน + ขอบเรือง + ควันเงา)
  P.hnClone = function (pos, pal, dur = 1, { follow = null } = {}) {
    const dark = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), pal.deep, 0, NORMAL))); dark.renderOrder = 5;
    const rim = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), pal.main, 0))); rim.renderOrder = 6;
    this.anim(dur, (k, dt, t) => {
      const p = follow ? follow() : pos, fade = Math.min(1, t / 0.12) * (k > 0.7 ? (1 - k) / 0.3 : 1), fl = 0.85 + Math.random() * 0.15;
      dark.position.set(p.x, 0.95 * this.vs, p.z); rim.position.copy(dark.position);
      dark.scale.set(0.9 * this.vs, 2.0 * this.vs, 1); rim.scale.set(1.3 * this.vs, 2.5 * this.vs, 1);
      dark.material.opacity = 0.8 * fade * fl; rim.material.opacity = 0.55 * fade * fl;
      if (Math.random() < 0.5) this.smoke.emit({ pos: V(p.x + rand(-0.3, 0.3), rand(0.2, 1.6) * this.vs, p.z + rand(-0.3, 0.3)), count: 1, speed: 0.2, up: 0.8, life: [0.4, 0.7], size: [0.4, 0.7], sizeEnd: 1.4, color: [pal.main, pal.deep], colorEnd: pal.smoke, alpha: 0.6 * fade });
    }, () => { this.remove(dark); this.remove(rim); });
  };

  // ร่างเงาหนุนข้างผู้เล่น (ซ้าย/ขวา/หลัง) — คืนฟังก์ชันตำแหน่ง
  P.hnClonePos = function (c, i) {
    const off = [[-1.4, -0.6], [1.4, -0.6], [0, -1.6]][i];
    return () => {
      const f = c.caster.facing, r = V(f.z, 0, -f.x);
      return c.caster.pos.clone().setY(0).addScaledVector(r, off[0]).addScaledVector(f, off[1]);
    };
  };

  // ภาพเงาเหยี่ยวกางปีก (หันขวา = ทิศบิน) วาดครั้งเดียว
  P.hnHawkTex = function () {
    if (this._hawkTex) return this._hawkTex;
    const s = 256, cv = document.createElement('canvas'); cv.width = cv.height = s;
    const g = cv.getContext('2d'), c = s / 2;
    g.shadowColor = '#fff'; g.shadowBlur = 10; g.fillStyle = '#fff';
    for (const side of [-1, 1]) {   // ปีกบน/ล่าง กวาดไปด้านหลัง
      g.beginPath(); g.moveTo(c + 18, c + side * 6);
      g.bezierCurveTo(c + 10, c + side * 60, c - 30, c + side * 110, c - 70, c + side * 122);
      g.lineTo(c - 52, c + side * 96); g.lineTo(c - 78, c + side * 100); g.lineTo(c - 58, c + side * 72); g.lineTo(c - 84, c + side * 70);
      g.bezierCurveTo(c - 50, c + side * 40, c - 20, c + side * 16, c - 16, c + side * 6); g.closePath(); g.fill();
    }
    g.beginPath(); g.ellipse(c + 4, c, 44, 15, 0, 0, Math.PI * 2); g.fill();          // ลำตัว
    g.beginPath(); g.arc(c + 50, c, 13, 0, Math.PI * 2); g.fill();                    // หัว
    g.beginPath(); g.moveTo(c + 62, c - 5); g.lineTo(c + 80, c + 2); g.lineTo(c + 62, c + 7); g.fill();   // จะงอย
    g.beginPath(); g.moveTo(c - 36, c - 8); g.lineTo(c - 96, c - 24); g.lineTo(c - 88, c); g.lineTo(c - 96, c + 24); g.lineTo(c - 36, c + 8); g.fill();   // หาง
    this._hawkTex = new THREE.CanvasTexture(cv);
    return this._hawkTex;
  };

  // เหยี่ยววิญญาณ (ภาพเงาเหยี่ยว 3 ชั้น หันหากล้องและหันหัวตามทิศบิน กระพือปีก)
  P.hnHawk = function (from, dir, len, dur, pal, span = 2.6, onPass = null, c = null) {
    const tex = this.hnHawkTex();
    const layers = [[pal.deep, 1.1, 0.7, NORMAL], [pal.main, 1, 0.95, ADD], [pal.light, 0.86, 0.9, ADD], [pal.hot, 0.6, 0.7, ADD]].map(([col, sc, op, blending]) => {
      const m = this.add(new THREE.Mesh(this.geo.plane, this.basic(col, { tex, opacity: 0, blending }))); m.renderOrder = blending === NORMAL ? 7 : 8; m.userData = { sc, op }; return m;
    });
    const body = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), pal.mid, 0.7))); body.scale.setScalar(span * 1.3);
    const passed = new Set();
    this.anim(dur, (k, dt, t) => {
      const p = from.clone().addScaledVector(dir, len * easeOut(k)).setY(from.y + Math.sin(k * Math.PI) * 0.5);
      body.position.copy(p);
      const ang = this.swScreenAngle(p, dir), flap = 0.55 + 0.45 * Math.abs(Math.sin(t * 14));
      const fade = Math.min(1, t / 0.06) * (k > 0.85 ? (1 - k) / 0.15 : 1);
      for (const m of layers) {
        const { sc, op } = m.userData;
        m.position.copy(p); this.swFace(m, ang);
        m.scale.set(span * sc, span * sc * flap, 1); m.material.opacity = op * fade;
      }
      this.feathers.emit({ pos: p, count: 2, spread: 0.4, vel: () => dir.clone().multiplyScalar(-rand(1, 3)).add(V(rand(-0.5, 0.5), rand(-0.6, 0.4), rand(-0.5, 0.5))), drag: 2, life: [0.4, 0.7], size: [0.25, 0.4], color: [pal.light, pal.mid] });
      if (c && onPass) c.targets.forEach((tg, i) => { if (passed.has(i)) return; const d = tg.pos.clone().setY(0).sub(from.clone().setY(0)); if (d.dot(dir) <= len * easeOut(k) + 0.3 && d.dot(dir) > -0.3 && Math.abs(d.x * dir.z - d.z * dir.x) < 1.4) { passed.add(i); onPass(tg); } });
    }, () => { layers.forEach((m) => this.remove(m)); this.remove(body); });
  };

  /* ================= Archer · นักธนูแสงดาว ================= */
  P.fx_ar_star_shot = function (c) {
    const end = this.fx_nf(c);
    this.swCharge(c, STAR, 0.36, 30);
    this.after(0.3, () => this.star(this.hand(c), STAR.hot, 1.6, 0.2));
    this.after(0.4, () => this.arShoot(c, STAR, { to: this.arDest(c), dur: 0.16, s: 1.5, onHit: (tp) => {
      this.arStarPop(tp, STAR, 1.1);
      this.ring(V(tp.x, 0, tp.z), STAR.light, 0.2, 1.4, 0.4);
    } }));
    return end;
  };

  P.fx_ar_comet_pierce = function (c) {
    const end = this.fx_nf(c), p0 = c.caster.pos.clone().setY(0);
    this.hlCircle(p0, STAR, 3.4, 1.1, 'star', 1.6);
    this.swCharge(c, STAR, 0.72, 60);
    // ดาวหมุนรวมเข้าคันธนู
    this.anim(0.72, (k, dt, t) => {
      const h = this.hand(c);
      for (let i = 0; i < 2; i++) { const a = t * 9 + i * Math.PI, r = 1.4 * (1 - k); this.stars.emit({ pos: h.clone().add(V(Math.cos(a) * r, Math.sin(a * 0.5) * 0.3, Math.sin(a) * r)), count: 1, speed: 0.1, life: 0.25, size: [0.25, 0.4], color: [STAR.hot, STAR.light] }); }
    });
    this.after(0.55, () => { const h = this.hand(c); this.flash(h, STAR.light, 2.4, 0.3); this.ring(h, STAR.light, 0.1, 1.2, 0.3, { vertical: true }); });
    this.after(0.78, () => {
      const from = this.hand(c), dir = this.arDir(c), to = from.clone().addScaledVector(dir, 11);
      this.mgUnder(from, STAR, 3, 0.4);
      this.swLine(from, to, STAR, 0.55, 0.5);
      this.swLine(from, to, { deep: STAR.deep, main: STAR.acc, hot: STAR.hot }, 0.22, 0.4, 0.05);
      this.projectile(this.arArrow(STAR, 3), from, to, 0.24, { orient: true, onFly: (p) => {
        this.fx.emit({ pos: p, count: 10, spread: 0.2, speed: 1, life: [0.25, 0.5], size: [0.3, 0.6], sizeEnd: 0.1, color: [STAR.hot, STAR.light, STAR.mid], colorEnd: STAR.main });
        this.stars.emit({ pos: p, count: 2, spread: 0.3, speed: 1.5, life: [0.4, 0.7], size: [0.25, 0.4], color: [STAR.hot, STAR.acc] });
      } });
      this.light(from, STAR.mid, 8, 0.4, 10);
      // ทุกตัวในแนวแตกเป็นดาวเมื่อดาวหางผ่าน
      c.targets.forEach((t) => {
        const d = t.pos.clone().setY(0).sub(c.caster.pos.clone().setY(0)), along = d.dot(dir);
        if (along >= -0.3 && along <= 11 && Math.abs(d.x * dir.z - d.z * dir.x) <= 1) this.after(0.24 * Math.max(0, along) / 11, () => this.arStarPop(this.hitPos(t), STAR, 1.0));
      });
    });
    return end;
  };

  P.fx_ar_starburst_volley = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4), sky = V(gp.x, 7, gp.z);
    this.swCharge(c, STAR, 0.36, 30);
    this.after(0.38, () => this.arShoot(c, STAR, { to: sky, dur: 0.23, s: 1.4 }));
    this.after(0.61, () => {
      this.flash(sky, STAR.hot, 4, 0.4); this.star(sky, STAR.light, 5, 0.5);
      this.stars.emit({ pos: sky, count: 40, speed: [2, 5], drag: 2, life: [0.5, 0.9], size: [0.25, 0.45], color: [STAR.hot, STAR.light, STAR.acc] });
      this.hlCircle(gp, STAR, 6.2, 1.2, 'star', 1.2);
    });
    [[1.03, 5, 0.9], [1.19, 5, 0.9], [1.37, 6, 1.2]].forEach(([th, n, s], wave) => {
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), r = wave === 2 && i === 0 ? 0 : rand(0.3, 2.8), at = V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r);
        this.after(th - 0.22 + rand(-0.03, 0.03), () => this.arShoot(c, STAR, { from: sky.clone().add(V(rand(-1, 1), rand(-0.5, 0.5), rand(-1, 1))), to: at, dur: 0.22, s: 1.3 * s, trail: i % 2 === 0, onHit: (p) => {
          this.ring(p, STAR.light, 0.1, 0.9 * s, 0.35);
          this.star(V(p.x, 0.4, p.z), STAR.hot, 1.6 * s, 0.3);
          this.mgUnder(V(p.x, 0.3, p.z), STAR, 1.8 * s, 0.35, 0.45);
          this.sparks(V(p.x, 0.2, p.z), [STAR.hot, STAR.light], 10, 3);
        } }));
      }
    });
    this.after(1.37, () => { this.arStarPop(V(gp.x, 0.6, gp.z), STAR, 1.3); this.ring(gp, STAR.main, 0.4, 3.2, 0.5, { opacity: 0.8 }); });
    return end;
  };

  P.fx_ar_constellation_mark = function (c) {
    const end = this.fx_nf(c), q0 = c.caster.pos.clone().setY(0);
    this.hlCircle(q0, STAR, 4.6, 1.6, 'star', 0.7);
    // ดาว 7 ดวงรอบตัว แล้วโยงเส้นเป็นกลุ่มดาว
    const pts = Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * TAU + rand(-0.2, 0.2), r = rand(1.6, 2.4); return V(q0.x + Math.cos(a) * r, rand(0.8, 2.6) * this.vs, q0.z + Math.sin(a) * r); });
    pts.forEach((p, i) => this.after(0.05 + i * 0.05, () => { this.star(p, STAR.hot, 1.4, 1.1); this.flash(p, STAR.light, 1.2, 0.5); }));
    pts.forEach((p, i) => this.after(0.15 + i * 0.05, () => this.swLine(p, pts[(i + 1) % pts.length], { deep: STAR.deep, main: STAR.acc, hot: STAR.hot }, 0.1, 0.9)));
    // ล็อกเป้าศัตรูรอบตัว
    this.after(0.45, () => {
      for (const [t] of this.inRadius(c, q0, 7).slice(0, 6)) {
        const tp = this.hitPos(t);
        this.swLine(pts[(Math.random() * pts.length) | 0], tp, { deep: STAR.deep, main: STAR.main, hot: STAR.hot }, 0.08, 0.6);
        this.ring(V(tp.x, 0, tp.z), STAR.light, 1.2, 0.4, 0.5);
        this.sigil(tp.clone().setY(tp.y + 0.2), TX.runeCircle('cross'), STAR.light, 1.2, 0.6, { rise: 0, spin: 4 });
      }
    });
    this.after(0.3, () => {
      const q = c.caster.pos;
      this.sigil(V(q.x, 2.6 * this.vs, q.z), TX.eyeSigil(), STAR.light, 1.6, 1, { rise: 0.4 });
      this.flash(V(q.x, 1.2, q.z), STAR.light, 3.5, 0.4);
      this.ring(V(q.x, 0, q.z), STAR.light, 0.3, 2.8, 0.5);
      this.stars.emit({ pos: V(q.x, 1, q.z), count: 30, speed: [1.5, 3.5], drag: 1.5, life: [0.6, 1], size: [0.2, 0.34], color: [STAR.hot, STAR.light, STAR.acc] });
      this.light(V(q.x, 1.5, q.z), STAR.mid, 5, 0.6, 6);
    });
    return Math.max(end, 1.4);
  };

  P.fx_ar_starfall_rain = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4), sky = V(gp.x, 8, gp.z);
    this.swCharge(c, STAR, 0.5, 50);
    [0.42, 0.52, 0.62].forEach((t, i) => this.after(t, () => this.arShoot(c, STAR, { to: sky.clone().add(V((i - 1) * 1.5, 0, 0)), dur: 0.25, s: 1.4 })));
    this.after(0.75, () => {
      this.hlCircle(gp, STAR, 7.4, 2.5, 'star', 0.5);
      this.disc(V(gp.x, 0, gp.z), TX.runeCircle('star'), STAR.light, 7, 2.3, { y: 8, spin: -0.6, opacity: 0.85 });
      this.flash(sky, STAR.hot, 6, 0.5); this.light(sky, STAR.mid, 6, 0.6, 14);
    });
    // ฝนศรดาว 1.15–2.55
    this.after(1.15, () => this.anim(1.4, () => {
      if (Math.random() < 0.75) {
        const a = rand(0, TAU), r = rand(0, 3), at = V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r);
        this.arShoot(c, STAR, { from: at.clone().add(V(rand(-1.2, -0.6), 8, rand(-1.2, -0.6))), to: at, dur: 0.24, s: 1.2, trail: false, onHit: (p) => {
          this.ring(p, STAR.light, 0.1, 0.8, 0.3); this.star(V(p.x, 0.3, p.z), STAR.hot, 1.3, 0.25); this.sparks(V(p.x, 0.2, p.z), [STAR.hot, STAR.light], 6, 3);
        } });
      }
    }));
    [1.39, 1.67, 1.94, 2.22, 2.5].forEach((t) => this.after(t, () => { this.ring(gp, STAR.main, 0.4, 3, 0.4, { opacity: 0.6 }); this.mgUnder(V(gp.x, 0.4, gp.z), STAR, 4, 0.3, 0.3); }));
    // ศรอุกกาบาตยักษ์
    this.after(2.25, () => { this.ring(gp, STAR.hot, 3.4, 0.3, 0.64, { opacity: 0.9 }); this.star(V(gp.x, 8, gp.z), STAR.hot, 6, 0.4); });
    this.after(2.39, () => this.projectile(this.arArrow(STAR, 5), V(gp.x - 2, 11, gp.z - 1.5), V(gp.x, 0.3, gp.z), 0.5, { orient: true, onFly: (p) => {
      this.fx.emit({ pos: p, count: 14, spread: 0.4, speed: 1, life: [0.3, 0.6], size: [0.5, 0.9], sizeEnd: 0.1, color: [STAR.hot, STAR.light, STAR.mid], colorEnd: STAR.main });
      this.stars.emit({ pos: p, count: 3, spread: 0.5, speed: 2, life: [0.5, 0.8], size: [0.3, 0.5], color: [STAR.hot, STAR.acc] });
    } }));
    this.after(2.89, () => {
      this.mgBlast(V(gp.x, 0.7, gp.z), STAR, 3.4, c, 3);
      this.star(V(gp.x, 1.5, gp.z), STAR.hot, 9, 0.6);
      this.pillar(gp, STAR.main, 1.4, 10, 0.8, { grow: 0.1, opacity: 0.8 });
      this.pillar(gp, STAR.hot, 0.5, 10, 0.7, { grow: 0.08, opacity: 0.8 });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? STAR.main : STAR.hot, 0.4, 5 + i * 0.6, 0.8));
      this.stars.emit({ pos: V(gp.x, 1.5, gp.z), count: 120, speed: [4, 10], gravity: -3, drag: 1.4, life: [0.8, 1.4], size: [0.3, 0.5], color: [STAR.hot, STAR.light, STAR.acc] });
    });
    return Math.max(end, 3.3);
  };

  /* ================= Hunter · พรานเงาจันทรา ================= */
  P.fx_hn_twin_shadow = function (c) {
    const end = this.fx_nf(c), dest = this.arDest(c);
    this.swCharge(c, MOON, 0.42, 30);
    // ศรเงา 2 ดอกพันเกลียว
    [[0.16, 1, (tp) => { this.mgHit(tp, MOON, 0.9); }], [0.23, -1, (tp) => {
      this.mgHit(tp, MOON, 1.1);
      this.swSlash(tp, this.arDir(c), MOON, 2.6, -0.5);
      this.ring(V(tp.x, 0, tp.z), MOON.light, 0.2, 1.5, 0.4);
    }]].forEach(([dur, side, onHit]) => this.after(0.45, () => {
      const from = this.hand(c), arrow = this.add(this.arArrow(MOON, 1.4)), p = V(), q = V();
      this.flash(from, MOON.light, 1.4, 0.18);
      const at = (k, out) => {
        const d = dest(), dir = d.clone().sub(from), len = dir.length(); dir.normalize();
        const r = V(dir.z, 0, -dir.x).normalize(), tw = k * 3 * Math.PI, amp = 0.45 * Math.sin(k * Math.PI);
        return out.copy(from).addScaledVector(dir, len * k).addScaledVector(r, side * Math.cos(tw) * amp).add(V(0, side * Math.sin(tw) * amp, 0));
      };
      this.anim(dur, (k) => {
        at(k, p); at(Math.min(1, k + 0.04), q); arrow.position.copy(p); if (q.distanceToSquared(p) > 1e-8) arrow.lookAt(q);
        this.smoke.emit({ pos: p, count: 1, spread: 0.05, speed: 0.2, life: [0.25, 0.4], size: [0.35, 0.55], sizeEnd: 0.3, color: [MOON.main, MOON.deep], colorEnd: MOON.smoke, alpha: 0.7 });
      }, () => { this.remove(arrow); onHit(dest().clone()); });
    }));
    return end;
  };

  P.fx_hn_moon_hawk = function (c) {
    const end = this.fx_nf(c);
    this.hlCircle(c.caster.pos.clone().setY(0), MOON, 3.2, 1.1, 'hex', 1.4);
    // ขนนกเงาวนรอบคันธนู
    this.anim(0.82, (k, dt, t) => {
      const h = this.hand(c);
      for (let i = 0; i < 2; i++) { const a = t * 8 + i * Math.PI, r = 1.2 * (1 - k * 0.6); this.feathers.emit({ pos: h.clone().add(V(Math.cos(a) * r, Math.sin(t * 6 + i) * 0.3, Math.sin(a) * r)), count: 1, speed: 0.1, life: 0.35, size: [0.3, 0.45], color: [MOON.light, MOON.mid] }); }
    });
    this.after(0.6, () => { const h = this.hand(c); this.flash(h, MOON.light, 2.2, 0.3); this.mgUnder(h, MOON, 2.4, 0.4); });
    this.after(0.85, () => {
      const from = this.hand(c), dir = this.arDir(c);
      this.swWave(from, dir, 11, 11 / 0.45, MOON, 2.6);
      this.hnHawk(from.clone().add(V(0, 0.4, 0)), dir, 11, 0.5, MOON, 3, (t) => {
        const tp = this.hitPos(t);
        this.mgHit(tp, MOON, 1.0);
        this.feathers.emit({ pos: tp, count: 14, speed: [2, 4], drag: 2, life: [0.6, 1], size: [0.25, 0.4], color: [MOON.light, MOON.mid] });
      }, c);
      this.light(from, MOON.mid, 6, 0.5, 10);
    });
    return end;
  };

  P.fx_hn_shadow_snare = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4);
    this.swCharge(c, MOON, 0.42, 30);
    this.after(0.45, () => this.arShoot(c, MOON, { to: V(gp.x, 0.1, gp.z), dur: 0.24, arc: 2.2, s: 1.4 }));
    this.after(0.69, () => {
      this.mgHit(V(gp.x, 0.3, gp.z), MOON, 1.0);
      this.hlCircle(gp, MOON, 6.6, 1.6, 'hex', -1.6);
      this.disc(gp, TX.softDot(), MOON.deep, 6.8, 1.55, { spin: 0, opacity: 0.7, blending: NORMAL, y: 0.04 });
      this.ring(gp, MOON.light, 3.4, 0.4, 0.5);
    });
    // เงาพันขา: โซ่เงาจากกลางวงไปหาศัตรู + ควันเงาลอย
    this.after(0.75, () => this.anim(1.3, () => {
      if (Math.random() < 0.6) { const a = rand(0, TAU), r = rand(0.3, 3); this.smoke.emit({ pos: V(gp.x + Math.cos(a) * r, 0.1, gp.z + Math.sin(a) * r), count: 1, vel: () => V(-Math.cos(a) * 1.2, rand(0.8, 1.6), -Math.sin(a) * 1.2), life: [0.5, 0.8], size: [0.5, 0.8], sizeEnd: 1.5, color: [MOON.main, MOON.deep], colorEnd: MOON.smoke, alpha: 0.7 }); }
    }));
    [0.81, 1.15, 1.5, 1.85].forEach((t) => this.after(t, () => {
      const list = this.inRadius(c, gp, 3.2);
      if (!list.length) for (let i = 0; i < 3; i++) { const a = rand(0, TAU); this.mgBolt(V(gp.x, 0.1, gp.z), V(gp.x + Math.cos(a) * 2, 0.1, gp.z + Math.sin(a) * 2), MOON, 0.3, 0.06, 1); }
      for (const [o] of list) { const tp = this.hitPos(o); this.mgBolt(V(gp.x, 0.1, gp.z), V(tp.x, 0.2, tp.z), MOON, 0.3, 0.07, 1); this.ring(V(tp.x, 0, tp.z), MOON.mid, 0.9, 0.3, 0.3); }
    }));
    this.after(2.02, () => this.ring(gp, MOON.hot, 3.2, 0.3, 0.1, { opacity: 0.9 }));
    this.after(2.1, () => { this.mgBlast(V(gp.x, 0.6, gp.z), MOON, 2.8, null, 2, { crack: true }); this.ring(gp, MOON.light, 0.4, 3.8, 0.6); });
    return end;
  };

  P.fx_hn_phantom_step = function (c) {
    const end = this.fx_nf(c);
    this.hnClone(c.caster.pos.clone().setY(0), MOON, 1.1);
    this.mgUnder(c.caster.pos.clone().setY(0.8), MOON, 2.6, 0.4);
    this.ring(c.caster.pos.clone().setY(0), MOON.light, 0.3, 2, 0.4);
    this.anim(0.32, () => { const q = c.caster.pos; this.feathers.emit({ pos: V(q.x, 1 * this.vs, q.z), count: 2, spread: 0.3, speed: 0.6, life: [0.5, 0.8], size: [0.25, 0.4], color: [MOON.light, MOON.mid] }); this.smoke.emit({ pos: V(q.x, 0.6 * this.vs, q.z), count: 1, spread: 0.2, speed: 0.2, life: 0.5, size: [0.6, 0.9], sizeEnd: 1.4, color: MOON.main, colorEnd: MOON.smoke, alpha: 0.6 }); });
    [0.38, 0.6, 0.76].forEach((t, i) => this.after(t - 0.14, () => this.arShoot(c, MOON, { to: this.arDest(c), dur: 0.14, s: 1.3, onHit: (tp) => {
      this.mgHit(tp, MOON, i === 2 ? 1.1 : 0.8);
      if (i === 2) this.ring(V(tp.x, 0, tp.z), MOON.light, 0.2, 1.8, 0.4);
    } })));
    this.after(0.33, () => { const q = c.caster.pos; this.sigil(V(q.x, 2.4 * this.vs, q.z), TX.feather(), MOON.light, 1.2, 0.7, { rise: 0.5 }); this.windTube(q.clone().setY(0), MOON.light, 0.9, 2, 0.6, { spin: 10, opacity: 0.5 }); });
    return Math.max(end, 1.1);
  };

  P.fx_hn_eclipse_barrage = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4), moonPos = V(gp.x, 8, gp.z);
    this.swCharge(c, MOON, 0.5, 40);
    // จันทร์ขึ้น → ถูกคราสเหลือวงแหวน
    const moon = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), MOON.hot, 0))), halo = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), MOON.mid, 0)));
    const shade = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), '#0a0414', 0, NORMAL))), corona = this.add(new THREE.Sprite(this.spriteMat(TX.softRing(), MOON.light, 0)));
    shade.renderOrder = 7; corona.renderOrder = 8;
    this.anim(3.4, (k, dt, t) => {
      const fall = t > 3.1 ? easeIn(Math.min(1, (t - 3.1) / 0.28)) : 0, y = 8 - 7.4 * fall, up = easeOut(Math.min(1, t / 0.6));
      const p = V(moonPos.x, y - 2 * (1 - up), moonPos.z), ecl = Math.min(1, Math.max(0, (t - 0.6) / 0.45));
      moon.position.copy(p); halo.position.copy(p); corona.position.copy(p);
      shade.position.copy(p).add(V(1.8 * (1 - ecl), 0.6 * (1 - ecl), 0));
      moon.scale.setScalar(2.4); halo.scale.setScalar(5 + Math.sin(t * 4) * 0.3); shade.scale.setScalar(2.3); corona.scale.setScalar(2.9 + ecl * 0.4);
      moon.material.opacity = up; halo.material.opacity = 0.6 * up; shade.material.opacity = up * 0.95; corona.material.opacity = ecl;
    }, () => [moon, halo, shade, corona].forEach((s) => this.remove(s)));
    this.after(0.2, () => this.hlCircle(gp, MOON, 7.4, 3.3, 'hex', 0.5));
    // ร่างเงา 3 ร่าง
    const cl = [0, 1, 2].map((i) => this.hnClonePos(c, i));
    this.after(0.5, () => cl.forEach((f) => { this.hnClone(null, MOON, 2.2, { follow: f }); this.flash(f().setY(1), MOON.light, 2, 0.3); }));
    // ยิงรัว 5 ระลอก จากผู้เล่นและร่างเงา
    [1.1, 1.35, 1.6, 1.85, 2.1].forEach((th) => [null, ...cl].forEach((f) => this.after(th - 0.18 + rand(-0.03, 0.02), () => {
      const a = rand(0, TAU), r = rand(0, 2.8), at = V(gp.x + Math.cos(a) * r, 0.3, gp.z + Math.sin(a) * r);
      const from = f ? f().setY(1.05 * this.vs) : this.hand(c);
      this.arShoot(c, MOON, { from, to: at, dur: 0.18, s: 1.2, trail: !!f, onHit: (p) => { this.mgUnder(V(p.x, 0.3, p.z), MOON, 1.8, 0.35, 0.5); this.flash(V(p.x, 0.4, p.z), MOON.light, 1.4, 0.25); this.ring(V(p.x, 0, p.z), MOON.mid, 0.1, 0.9, 0.3); } });
    })));
    // ศรเสี้ยวจันทร์ยักษ์ทะลุแนว
    this.after(2.5, () => this.swCharge(c, MOON, 0.5, 60));
    this.after(2.86, () => { const h = this.hand(c); this.mgUnder(h, MOON, 3.4, 0.4); this.flash(h, MOON.hot, 3, 0.3); });
    this.after(2.98, () => {
      const from = this.hand(c), dir = this.arDir(c);
      this.swWave(from, dir, 12, 12 / 0.3, MOON, 4.2);
      this.swLine(from, from.clone().addScaledVector(dir, 12), MOON, 0.5, 0.45);
    });
    // จันทร์แตกถล่ม
    this.after(3.38, () => {
      this.mgBlast(V(gp.x, 0.7, gp.z), MOON, 3.6, c, 3);
      this.flash(V(gp.x, 2, gp.z), MOON.hot, 10, 0.5);
      this.pillar(gp, MOON.main, 1.5, 10, 0.8, { grow: 0.1, opacity: 0.8 });
      for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(gp, i ? MOON.main : MOON.hot, 0.4, 5.2 + i * 0.6, 0.8));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; this.swSlash(V(gp.x + Math.cos(a) * 1.6, 1.2, gp.z + Math.sin(a) * 1.6), V(Math.cos(a), 0, Math.sin(a)), MOON, 2.4, 0, i * 0.02, 0.4); }
      this.stars.emit({ pos: V(gp.x, 1.5, gp.z), count: 80, speed: [4, 9], gravity: -3, drag: 1.4, life: [0.7, 1.2], size: [0.25, 0.45], color: [MOON.hot, MOON.light] });
    });
    return Math.max(end, 3.8);
  };
}
