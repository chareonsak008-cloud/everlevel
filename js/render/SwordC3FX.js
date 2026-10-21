// v0.85 สกิลราชันย์คลังศาสตรา (นักดาบคลาส 3): ประตูวงเวททองยิงศาสตรา · ห่าศาสตรา · โซ่ทองตรึงศัตรู · สว่านฟ้าพิภพแตก
// fx_s3_* · ดาเมจ/จังหวะจาก sk.nf ผ่าน fx_nf · ใช้ตัวช่วยจาก SwordFX/MageFX/MageC3FX
import { THREE } from './three.js?v=0.86.0';
import * as TX from './FxTextures.js?v=0.86.0';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const NORMAL = THREE.NormalBlending, ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

const GOLD = { deep: '#6a3a04', main: '#ffb020', mid: '#ffd24a', light: '#fff0a0', hot: '#fffbe0', smoke: '#3a2a10', acc: '#ffffff' };
const EA = { deep: '#2a0306', main: '#e01e1e', mid: '#ff4a3a', light: '#ff9a7a', hot: '#ffe8d8', smoke: '#1a0606', acc: '#ffd24a' };

const cache = new Map();
function tex(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t;
}
const easeOutBack = (k) => { const c1 = 1.7; return 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const smooth = (k) => k * k * (3 - 2 * k);
// วงเวทประตูคลังสมบัติ (วงนอก): วงแหวนคู่ · แถบอักขระโบราณ 60 ตัว · ขีดบอกองศา · จุดประดับ
const gateRuneTex = () => tex('s3rune', 512, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 6;
  for (const [r, w] of [[0.97, 6], [0.93, 2], [0.76, 2], [0.72, 4]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, c * r, 0, TAU); g.stroke(); }
  let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // อักขระ: ประกอบจากเส้นตรง/โค้งสั้น ๆ แบบรูนสุ่ม (คงที่ทุกครั้ง)
  g.lineWidth = 4.5;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU; g.save(); g.translate(c + Math.cos(a) * c * 0.845, c + Math.sin(a) * c * 0.845); g.rotate(a + Math.PI / 2);
    const h = 15, w = 8; g.beginPath(); g.moveTo(0, -h); g.lineTo(0, h);   // ก้านกลาง
    const k = (rnd() * 6) | 0;
    if (k === 0) { g.moveTo(0, -h); g.lineTo(w, -h + 7); g.moveTo(0, -2); g.lineTo(w, 5); }
    else if (k === 1) { g.moveTo(-w, -h); g.lineTo(w, h); }
    else if (k === 2) { g.moveTo(0, -4); g.lineTo(-w, 4); g.lineTo(0, 12); }
    else if (k === 3) { g.moveTo(-w, -6); g.lineTo(w, -6); g.moveTo(-w, 6); g.lineTo(w, 6); }
    else if (k === 4) { g.moveTo(0, -h); g.quadraticCurveTo(w * 1.6, -2, 0, 4); }
    else { g.moveTo(-w, -h); g.lineTo(0, -4); g.lineTo(w, -h); }
    g.stroke(); g.restore();
  }
  g.lineWidth = 2;
  for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU, L = i % 10 === 0 ? 0.05 : 0.025; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.93, c + Math.sin(a) * c * 0.93); g.lineTo(c + Math.cos(a) * c * (0.93 - L), c + Math.sin(a) * c * (0.93 - L)); g.stroke(); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.13; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.74, c + Math.sin(a) * c * 0.74, c * 0.022, 0, TAU); g.fill(); }
});
// วงเวทชั้นใน: ดาวหกแฉกในวงกลม · วงเล็กหกวงที่ปลายแฉก · แกนกลางสว่าง
const gateCoreTex = () => tex('s3core', 512, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 8;
  g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * 0.92, 0, TAU); g.stroke();
  g.lineWidth = 4;
  for (const off of [0, Math.PI]) { g.beginPath(); for (let i = 0; i <= 3; i++) { const a = off - Math.PI / 2 + (i / 3) * TAU, x = c + Math.cos(a) * c * 0.9, y = c + Math.sin(a) * c * 0.9; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU - Math.PI / 2; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9, c * 0.08, 0, TAU); g.stroke(); }
  g.beginPath(); g.arc(c, c, c * 0.45, 0, TAU); g.stroke();
  g.beginPath(); g.arc(c, c, c * 0.38, 0, TAU); g.stroke();
  const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.4); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, c * 0.4, 0, TAU); g.fill();
});
// ลายเส้นแดงพันเกลียว (ท่อนของดาบสว่าน)
const drillTex = () => { const t = tex('s3drill', 256, (g, s) => { g.fillStyle = '#000'; g.fillRect(0, 0, s, s); g.strokeStyle = '#fff'; for (let i = -4; i < 8; i++) { g.lineWidth = 6 + (i % 3) * 4; g.beginPath(); g.moveTo(i * 40, 0); g.lineTo(i * 40 + 120, s); g.stroke(); } g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect((i * 37) % s, (i * 53) % s, 6, 2); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

export function installSwordC3FX(P) {
  /* ---------- ตัวช่วย ---------- */
  // ประตูคลังสมบัติ หันหน้าไปทาง dir (ทิศที่อาวุธพุ่งออก)
  // วงเวทประตูคลังสมบัติ: วงอักขระนอก (หมุนตามเข็ม) + ดาวหกแฉกใน (หมุนทวน) + แกนเรือง + คลื่นระลอกวิ่งออกเป็นจังหวะ
  // เปิดแบบเด้งนุ่ม (ease-out-back) หมุนเร็วตอนเปิดแล้วช้าลง · ปิดด้วยการหดเข้าพร้อมหมุนเร่ง
  P.s3Gate = function (pos, dir, size, dur, { delay = 0, cam = false } = {}) {   // cam = หันหน้าเข้ากล้อง (ประตูหลังตัว ไม่ให้เห็นเป็นเส้นบาง)
    const g = new THREE.Group(), RT = gateRuneTex(), CT = gateCoreTex();
    const mk = (T, col, sc, blending, ro) => { const m = new THREE.Mesh(this.geo.plane, this.basic(col, { tex: T, opacity: 0, blending })); m.scale.setScalar(sc); m.renderOrder = ro; g.add(m); return m; };
    const under = mk(RT, GOLD.deep, 1.05, NORMAL, 6), ring = mk(RT, GOLD.mid, 1, ADD, 7), inner = mk(CT, GOLD.light, 0.62, ADD, 8);
    const core = mk(TX.softDot(), GOLD.hot, 0.42, ADD, 9), ripple = mk(TX.softRing(), GOLD.light, 0.3, ADD, 8);
    const OPEN = 0.26, CLOSE = 0.24, spin0 = rand(0, TAU);
    this.after(delay, () => {
      this.add(g); g.position.copy(pos); g.lookAt(pos.clone().add(dir));
      this.anim(dur, (k, dt, t) => {
        const o = Math.min(1, t / OPEN), cl = Math.max(0, (t - (dur - CLOSE)) / CLOSE);
        const sc = easeOutBack(o) * (1 - 0.45 * smooth(cl)), vis = smooth(Math.min(1, o * 1.6)) * (1 - smooth(cl));
        if (cam) this.swFace(g, 0);
        g.scale.setScalar(size * Math.max(0.001, sc));
        const sp = 0.7 + 7 * (1 - easeOut(o)) + 9 * cl * cl;
        ring.rotation.z = spin0 + (ring.userData.a = (ring.userData.a || 0) + dt * sp); under.rotation.z = ring.rotation.z;
        inner.rotation.z = -spin0 - (inner.userData.a = (inner.userData.a || 0) + dt * sp * 1.4);
        const rp = (t * 1.6) % 1; ripple.scale.setScalar(0.3 + rp * 0.9); ripple.material.opacity = 0.7 * (1 - rp) * vis;
        under.material.opacity = 0.5 * vis; ring.material.opacity = 0.95 * vis; inner.material.opacity = 0.9 * vis;
        core.material.opacity = (0.6 + 0.25 * Math.sin(t * 9)) * vis; core.scale.setScalar(0.42 * (1 + 0.08 * Math.sin(t * 9)));
        if (Math.random() < 0.35 * vis) { const a = rand(0, TAU), rr = size * 0.48; this.stars.emit({ pos: g.position.clone().add(V(Math.cos(a) * rr, Math.sin(a) * rr, 0).applyQuaternion(g.quaternion)), count: 1, speed: 0.25, life: [0.35, 0.6], size: [0.1, 0.18], color: [GOLD.hot, GOLD.light] }); }
      }, () => this.remove(g));
    });
  };

  // อาวุธสมบัติ (ดาบ/หอก/ขวาน) แกน +z = ปลายอาวุธ · สีโลหะสุ่ม
  P.s3Weapon = function (s = 1) {
    if (!this.geo.s3blade) {
      this.geo.s3blade = new THREE.BoxGeometry(0.12, 0.03, 1.0).translate(0, 0, 0.1);
      this.geo.s3tip = new THREE.ConeGeometry(0.085, 0.3, 4).rotateX(Math.PI / 2).translate(0, 0, 0.75);
      this.geo.s3guard = new THREE.BoxGeometry(0.42, 0.07, 0.07).translate(0, 0, -0.42);
      this.geo.s3grip = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6).rotateX(Math.PI / 2).translate(0, 0, -0.62);
      this.geo.s3shaft = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6).rotateX(Math.PI / 2).translate(0, 0, -0.3);
      this.geo.s3head = new THREE.ConeGeometry(0.09, 0.5, 4).rotateX(Math.PI / 2).translate(0, 0, 0.7);
    }
    const metal = ['#e8ecf4', '#ffd24a', '#c8d0e0', '#ff6a4a', '#9ad8ff'][(Math.random() * 5) | 0];
    const bladeM = new THREE.MeshStandardMaterial({ color: metal, emissive: metal, emissiveIntensity: 0.45, metalness: 0.6, roughness: 0.25, flatShading: true });
    const goldM = new THREE.MeshStandardMaterial({ color: '#ffc030', emissive: '#a86a10', emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.3, flatShading: true });
    const g = new THREE.Group();
    if (Math.random() < 0.65) g.add(new THREE.Mesh(this.geo.s3blade, bladeM), new THREE.Mesh(this.geo.s3tip, bladeM), new THREE.Mesh(this.geo.s3guard, goldM), new THREE.Mesh(this.geo.s3grip, goldM));
    else g.add(new THREE.Mesh(this.geo.s3shaft, goldM), new THREE.Mesh(this.geo.s3head, bladeM));
    const glow = new THREE.Sprite(this.spriteMat(TX.softDot(), GOLD.mid, 0.7)); glow.scale.setScalar(0.9); glow.position.z = 0.3; g.add(glow);
    const streak = new THREE.Mesh(this.geo.plane, this.basic(GOLD.light, { tex: TX.flameStrip(), opacity: 0.8 })); streak.scale.set(1.6, 0.18, 1); streak.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); streak.position.z = -0.9; g.add(streak);
    g.scale.setScalar(s);
    return g;
  };

  // อาวุธค่อย ๆ ก่อตัวออกจากกลางวงเวท (ขยายแบบเด้ง เล็งเป้า สั่นเล็กน้อย) แล้วพุ่งแบบเร่งความเร็ว ทิ้งหางแสงต่อเนื่อง
  // เวลารวมจากเรียก → โดนเป้า = EMERGE + HOLD + fly
  const EMERGE = 0.2, HOLD = 0.05;
  P.s3Launch = function (gatePos, to, { fly = 0.16, s = 1.4, stick = false, onHit = null } = {}) {
    const dest = typeof to === 'function' ? to : () => to, w = this.add(this.s3Weapon(s)), start = V();
    this.flash(gatePos, GOLD.hot, 1.2 * s, 0.25);
    this.anim(EMERGE + HOLD, (k, dt, t) => {
      const e = Math.min(1, t / EMERGE), d = dest().clone().sub(gatePos).normalize();
      w.position.copy(gatePos).addScaledVector(d, 0.55 * s * easeOut(e) + (t > EMERGE ? rand(-0.02, 0.02) : 0));
      w.lookAt(dest()); w.scale.setScalar(s * Math.max(0.01, easeOutBack(e)));
      if (Math.random() < 0.6) this.fx.emit({ pos: w.position, count: 1, spread: 0.15 * s, speed: 0.3, life: 0.3, size: [0.12, 0.2], color: [GOLD.hot, GOLD.light] });
    }, () => {
      start.copy(w.position);
      this.anim(fly, (k) => {
        const kk = k * (0.35 + 0.65 * k);   // เร่งความเร็วนุ่ม ๆ
        const p = start.clone().lerp(dest(), kk); w.position.copy(p); w.lookAt(dest().clone().add(dest().clone().sub(start)));
        this.fx.emit({ pos: p, count: 3, spread: 0.05, speed: 0.15, life: [0.16, 0.28], size: [0.22 * s * 0.5, 0.34 * s * 0.5], sizeEnd: 0.1, color: [GOLD.hot, GOLD.light, GOLD.mid], colorEnd: GOLD.main });
      }, () => {
        const p = dest().clone();
        this.mgUnder(p, GOLD, 1.6 * s, 0.4, 0.45); this.star(p, GOLD.hot, 1.5 * s, 0.3); this.sparks(p, [GOLD.hot, GOLD.light], 14, 5);
        this.ring(V(p.x, 0, p.z), GOLD.light, 0.1, 0.7 * s, 0.35);
        if (stick) { w.position.copy(p); this.anim(0.8, (k) => { w.scale.setScalar(s * (k > 0.6 ? 1 - smooth((k - 0.6) / 0.4) : 1)); }, () => this.remove(w)); }
        else this.remove(w);
        if (onHit) onHit(p);
      });
    });
  };
  P.s3LaunchTime = (fly = 0.16) => EMERGE + HOLD + fly;

  // เปิดประตูแล้วยิงอาวุธ: อาวุธเริ่มก่อตัวเมื่อวงเวทกางเกือบเต็ม
  P.s3Fire = function (gatePos, to, { delay = 0, fly = 0.16, s = 1.4, gate = 1.2, cam = false, onHit = null } = {}) {
    const dir = (typeof to === 'function' ? to() : to).clone().sub(gatePos).normalize();
    this.s3Gate(gatePos, dir, gate, 0.2 + EMERGE + HOLD + fly + 0.35, { delay, cam });
    this.after(delay + 0.2, () => this.s3Launch(gatePos, to, { fly, s, onHit }));
  };

  // ตำแหน่งประตูหลังผู้ร่าย (กระจายเป็นพัดครึ่งวงกลม)
  P.s3BackGate = function (c, i, n, { R = 2.2, lift = 1.6 } = {}) {
    // พัดครึ่งวงกลมบนจอ (ใช้แกนขวาของกล้อง) เหนือ-หลังตัวละคร → เห็นเต็มบานทุกทิศที่หัน
    const q = c.caster.pos, r = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize() : V(1, 0, 0), back = this.camera ? V().setFromMatrixColumn(this.camera.matrixWorld, 2).setY(0).normalize().multiplyScalar(-0.8) : V();
    const a = Math.PI * (0.08 + 0.84 * (n === 1 ? 0.5 : i / (n - 1)));
    return V(q.x, 0, q.z).addScaledVector(r, Math.cos(a) * R).add(back).setY((lift + Math.sin(a) * R * 0.55) * this.vs);
  };

  // โซ่ทอง: ข้อโซ่เรียงจาก a ไป b ยืดออกภายใน grow วินาที
  P.s3Chain = function (a, b, dur, { grow = 0.25, sag = 0.4 } = {}) {
    if (!this.geo.s3link) this.geo.s3link = new THREE.TorusGeometry(0.14, 0.045, 6, 12);
    const len = a.distanceTo(b), n = Math.max(6, Math.round(len / 0.2)), mat = new THREE.MeshStandardMaterial({ color: '#ffc838', emissive: '#c88010', emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.3 });
    const g = this.add(new THREE.Group()), links = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(this.geo.s3link, mat); m.visible = false; g.add(m); links.push(m); }
    const glow = this.add(new THREE.Group());
    this.anim(dur, (k, dt, t) => {
      const shown = Math.min(n, Math.ceil(n * Math.min(1, t / grow))), fade = k > 0.85 ? (1 - k) / 0.15 : 1;
      const dir = b.clone().sub(a).normalize();
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), p = a.clone().lerp(b, u); p.y -= Math.sin(u * Math.PI) * sag * (1 - Math.min(1, t / (grow + 0.3)));
        const m = links[i]; m.visible = i < shown; m.position.copy(p);
        m.quaternion.setFromUnitVectors(V(1, 0, 0), dir); if (i % 2) m.rotateX(Math.PI / 2);
        m.scale.setScalar(fade);
      }
      if (shown < n && Math.random() < 0.8) this.fx.emit({ pos: links[shown - 1 > 0 ? shown - 1 : 0].position, count: 2, speed: 0.6, life: 0.3, size: [0.12, 0.2], color: [GOLD.hot, GOLD.light] });
    }, () => { this.remove(g); this.remove(glow); });
  };

  /* ================= 1 · ประตูคลังสมบัติ ================= */
  P.fx_s3_treasury = function (c) {
    const end = this.fx_nf(c), { t, tp } = this.swTarget(c, 5);
    const to = t ? () => this.hitPos(t).add(V(rand(-0.3, 0.3), rand(-0.2, 0.2), rand(-0.3, 0.3))) : () => tp;
    // 9 วงเวทกางเป็นพัด เปิดไล่จากกลางออกข้าง · อาวุธเล่มที่ i โดนเป้าที่ 0.65 + 0.06i วิ (ตรงกับ nf.hits)
    const N = 9, order = [4, 3, 5, 2, 6, 1, 7, 0, 8];
    order.forEach((gi, i) => this.s3Fire(this.s3BackGate(c, gi, N, { R: 3.4, lift: 1.9 }), to, { delay: 0.04 + i * 0.06, fly: 0.16, s: 2.1, gate: 1.6, cam: true }));
    return Math.max(end, 1.5);
  };

  /* ================= 2 · ห่าอาวุธราชันย์ ================= */
  P.fx_s3_arsenal_rain = function (c) {
    const end = this.fx_nf(c), { gp } = this.swTarget(c, 4);
    this.disc(gp, TX.runeCircle('star'), GOLD.mid, 6.4, 2.2, { spin: 0.3, opacity: 0.6 });
    this.disc(gp, TX.softDot(), GOLD.deep, 6.4, 2.2, { spin: 0, opacity: 0.35, blending: NORMAL, y: 0.04 });
    const gates = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU + rand(-0.2, 0.2), r = i < 2 ? rand(0, 0.8) : rand(1.2, 3.2); return V(gp.x + Math.cos(a) * r, rand(4.2, 5.4), gp.z + Math.sin(a) * r); });
    gates.forEach((p, i) => this.s3Gate(p, V(0, -1, 0), rand(1.4, 1.9), 2.0 - i * 0.03, { delay: 0.1 + i * 0.03 }));
    // อาวุธก่อตัวจากวงเวทบนฟ้าแล้วพุ่งปักพื้น ค้างไว้ครู่หนึ่งก่อนสลาย (ปล่อยเป็นจังหวะสม่ำเสมอ ~16 เล่ม/วิ)
    for (let i = 0; i < 22; i++) this.after(0.35 + i * 0.062, () => {
      const from = gates[i % gates.length], a = rand(0, TAU), r = Math.sqrt(Math.random()) * 3.2, to = V(gp.x + Math.cos(a) * r, 0.25, gp.z + Math.sin(a) * r);
      this.s3Launch(from, to, { fly: 0.14, s: 2.0, stick: true, onHit: (p) => this.debris(p, { count: 3, speed: [2, 3.5] }) });
    });
    this.after(1.9, () => { this.mgBlast(V(gp.x, 0.6, gp.z), GOLD, 3, c, 2, { crack: true }); });
    return Math.max(end, 2.4);
  };

  /* ================= 3 · โซ่สวรรค์ผูกเทพ ================= */
  P.fx_s3_chains = function (c) {
    const end = this.fx_nf(c), { t, gp } = this.swTarget(c, 4);
    const list = this.inRadius(c, t ? t.pos : gp, 3).map(([o]) => o).slice(0, 5);
    const victims = list.length ? list : [null];
    victims.forEach((o, vi) => {
      const center = o ? this.hitPos(o) : V(gp.x, 0.9, gp.z);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + vi, gpos = V(center.x + Math.cos(a) * 2.6, center.y + rand(0.8, 2.2), center.z + Math.sin(a) * 2.6), d = 0.1 + vi * 0.06 + k * 0.05;
        this.s3Gate(gpos, center.clone().sub(gpos).normalize(), 0.9, 2.3 - d, { delay: d });
        this.after(d + 0.18, () => this.s3Chain(gpos, center.clone().add(V(rand(-0.15, 0.15), rand(-0.2, 0.2), rand(-0.15, 0.15))), 2.0 - d, { grow: 0.25 }));
      }
      this.after(0.55 + vi * 0.06, () => { this.mgHit(center, GOLD, 0.8, { ring: false }); this.ring(V(center.x, 0, center.z), GOLD.light, 1.2, 0.3, 0.4); });
    });
    this.after(2.1, () => { for (const o of list) { const p = this.hitPos(o); this.sparks(p, [GOLD.hot, GOLD.light], 24, 5); this.flash(p, GOLD.light, 2, 0.3); } });
    return Math.max(end, 2.4);
  };

  /* ================= 4 · ราชันย์ผู้ไร้เทียมทาน (บัฟ) ================= */
  P.fx_s3_king_aura = function (c) {
    const end = this.fx_nf(c), P0 = c.caster.pos.clone().setY(0);
    this.disc(P0, TX.runeCircle('star'), GOLD.mid, 4, 1.8, { spin: 0.8, opacity: 0.85 });
    this.disc(P0, TX.softDot(), GOLD.deep, 4, 1.8, { spin: 0, opacity: 0.4, blending: NORMAL, y: 0.04 });
    // ประตูทองเก้าบานกางเป็นรัศมีพัดหลังตัว
    for (let i = 0; i < 9; i++) { const p = this.s3BackGate(c, i, 9, { R: 2.5, lift: 1.7 }); this.s3Gate(p, c.caster.facing.clone(), 1.35, 1.6 - i * 0.02, { delay: 0.05 + i * 0.04, cam: true }); }
    this.after(0.4, () => {
      const q = c.caster.pos;
      this.pillar(V(q.x, 0, q.z), GOLD.main, 0.9, 6, 0.9, { grow: 0.15, opacity: 0.6 });
      this.flash(V(q.x, 1.3, q.z), GOLD.light, 4.5, 0.45);
      this.ring(V(q.x, 0, q.z), GOLD.light, 0.3, 3, 0.5);
      this.sigil(V(q.x, 2.7 * this.vs, q.z), TX.swordsSigil(), GOLD.mid, 1.5, 1.0, { rise: 0.4 });
      this.light(V(q.x, 1.5, q.z), GOLD.main, 6, 0.7, 8);
    });
    this.anim(1.6, () => { const q = c.caster.pos; if (Math.random() < 0.7) this.stars.emit({ pos: V(q.x + rand(-1.4, 1.4), rand(0.1, 0.4), q.z + rand(-1.4, 1.4)), count: 1, vel: () => V(0, rand(1.5, 3), 0), life: [0.6, 1], size: [0.2, 0.32], color: [GOLD.hot, GOLD.light, GOLD.mid] }); });
    return Math.max(end, 1.7);
  };

  /* ================= 5 · ไม้ตาย: ดาบแยกฟ้าดิน ================= */
  P.fx_s3_world_cleave = function (c) {
    const end = this.fx_nf(c), f = (() => { const t = c.targets[c.main], d = t ? t.pos.clone().sub(c.caster.pos).setY(0) : c.caster.facing.clone(); return d.lengthSq() < 1e-4 ? c.caster.facing.clone().setY(0).normalize() : d.normalize(); })();
    // ดาบทรงสว่าน: ท่อนกระบอก 3 ท่อนหมุนสวนกัน ชี้ไปข้างหน้า
    const T = drillTex(), drill = new THREE.Group(), parts = [];
    [[0.26, 0.44, 0.55, 1], [0.2, 0.32, 0.5, -1.4], [0.13, 0.22, 0.6, 1.8]].forEach(([r0, r1, h, sp], i) => {
      for (const [col, op, blending, k] of [[EA.deep, 0.85, NORMAL, 1.02], [EA.main, 0.9, ADD, 1]]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r0 * k, r1 * k, h, 24, 1, true), this.basic(col, { tex: T, opacity: 0, blending })); m.renderOrder = blending === NORMAL ? 6 : 7;
        m.position.y = 0.35 + i * 0.58; m.userData = { sp, op }; drill.add(m); parts.push(m);
      }
    });
    const tipM = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 12), this.basic(EA.hot, { opacity: 0 })); tipM.position.y = 2.15; drill.add(tipM); parts.push(tipM); tipM.userData = { sp: 0, op: 1 };
    const gripM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#ffc030', emissive: '#a86a10', emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.3 })); gripM.position.y = -0.15; drill.add(gripM);
    this.add(drill);
    const glow = this.add(new THREE.Sprite(this.spriteMat(TX.softDot(), EA.main, 0)));
    this.s3Gate(this.hand(c).add(V(0, 0.6, 0)), f, 1.6, 0.6, { delay: 0 });
    // ฟ้ามืดแดง · ลมวนดูดเข้าดาบ
    this.anim(2.4, (k, dt, t) => {
      const h = this.hand(c), pos = h.clone().addScaledVector(f, 0.25).add(V(0, 0.15, 0)), charge = Math.min(1, t / 1.2), pop = easeOut(Math.min(1, Math.max(0, t - 0.3) / 0.3));
      drill.position.copy(pos);
      const aim = t < 1.6 ? V(0, 1, 0).lerp(f.clone().add(V(0, 0.25, 0)), Math.min(1, Math.max(0, (t - 1.0) / 0.5))).normalize() : f.clone().add(V(0, 0.05, 0)).normalize();
      drill.quaternion.setFromUnitVectors(V(0, 1, 0), aim);
      drill.scale.setScalar(pop * (1 + charge * 0.5));
      const fade = k > 0.9 ? (1 - k) / 0.1 : 1;
      for (const m of parts) { m.rotation.y += m.userData.sp * dt * (6 + charge * 18); m.material.opacity = m.userData.op * pop * fade; }
      if (T) T.offset.y -= dt * (2 + charge * 6);
      glow.position.copy(pos).addScaledVector(aim, 1.2); glow.scale.setScalar(2 + charge * 3); glow.material.opacity = (0.4 + charge * 0.5) * pop * fade;
      if (t > 0.3 && t < 1.8) for (let n = 0; n < 3; n++) { const a = rand(0, TAU), r = rand(2.5, 4.5), P0 = pos.clone().add(V(Math.cos(a) * r, rand(-0.5, 2.5), Math.sin(a) * r)), tan = V(-Math.sin(a), 0, Math.cos(a)); this.fx.emit({ pos: P0, count: 1, vel: () => pos.clone().sub(P0).multiplyScalar(2.2).addScaledVector(tan, 4), life: 0.45, size: [0.18, 0.3], color: [EA.light, EA.mid, EA.acc] }); }
      if (t > 0.3 && t < 1.8 && Math.random() < 0.25) this.mgBolt(pos.clone().add(V(rand(-1.5, 1.5), rand(0.5, 2.5), rand(-1.5, 1.5))), pos, EA, 0.12, 0.05, 0);
    }, () => { [...parts, gripM].forEach((m) => m.geometry.dispose()); this.remove(drill); this.remove(glow); });
    // ปลดปล่อย: ลำลมแดงดำทรงเกลียวพุ่งตามแนว ฉีกพื้นเป็นทาง
    this.after(1.75, () => {
      const a = this.hand(c).addScaledVector(f, 1.2).setY(1.1 * this.vs), b = a.clone().addScaledVector(f, 12);
      this.m3Beam(a, b, 0.75, 0.9, { pal: EA });
      const tube = this.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32, 1, true), this.basic(EA.mid, { tex: TX.windStreak().clone(), opacity: 0 }))); tube.material.map.needsUpdate = true; tube.material.map.wrapS = tube.material.map.wrapT = THREE.RepeatWrapping; tube.material.map.repeat.set(3, 4); tube.renderOrder = 8;
      tube.position.copy(a.clone().lerp(b, 0.5)); tube.quaternion.setFromUnitVectors(V(0, 1, 0), f);
      this.anim(0.95, (k, dt) => { const g = easeOut(Math.min(1, k * 4)), r = 0.6 + k * 1.4; tube.scale.set(r, 12 * g, r); tube.position.copy(a).lerp(b, 0.5 * g); tube.material.map.offset.x -= dt * 4; tube.material.opacity = 0.8 * (k > 0.6 ? (1 - k) / 0.4 : 1); }, () => { tube.geometry.dispose(); tube.material.map.dispose(); this.remove(tube); });
      for (let i = 0; i < 8; i++) this.after(i * 0.06, () => { const p = a.clone().addScaledVector(f, 1.5 + i * 1.4).setY(0); this.cracks(p, EA.mid, 2.6, 2.4, { glow: 1, dark: 0.85 }); this.debris(V(p.x, 0.3, p.z), { count: 6, speed: [3, 6], color: '#3a1a14', glow: EA.main }); this.mgUnder(V(p.x, 0.6, p.z), EA, 3, 0.6, 0.5); });
      this.sparks(a, [EA.hot, EA.light], 40, 8);
    });
    this.after(2.05, () => { const t = c.targets[c.main], p = t ? this.hitPos(t) : this.hand(c).addScaledVector(f, 5); this.mgBlast(p, EA, 3.4, c, 3, { crack: false }); for (let i = 0; i < 3; i++) this.after(i * 0.1, () => this.ring(V(p.x, 0, p.z), i ? EA.main : EA.hot, 0.4, 5 + i * 0.6, 0.8)); });
    return Math.max(end, 2.8);
  };
}
