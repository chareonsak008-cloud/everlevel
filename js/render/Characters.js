// v0.17: ตัวละครออกแบบใหม่ทั้งหมด — สัดส่วนอนิเมะแบบเกมพิกเซล (สูง ~4 หัว ขายาว) · ชุดละเอียด (เกราะ/เสื้อคลุม/ผ้าคลุม)
// โมเดลนี้ใช้ถ่ายเป็นสไปรต์พิกเซล (render/PixelSprites.js) และใช้แสดงแบบ 3 มิติได้ด้วยเมื่อปิดโหมดพิกเซล
// โครงกระดูกเข้ากันได้กับชุดแฟชั่นเดิม: root › body › torso (สะโพก) › head / arms[0..1] · body › legs[0..1]
//   arms/legs = จุดหมุนไหล่/สะโพก (ยืดแกน y ให้ชิ้นแฟชั่นเดิมไปอยู่ตำแหน่งข้อมือ/แข้งใหม่พอดี) · hands = จุดถืออาวุธ (ไม่ยืด)
import { THREE } from './three.js';
import { blobShadowTexture, shadeHex } from './Textures.js';
import { toon, bake, addOutline, faceMaterial } from './Toon.js';
import { lerpAngle, damp } from '../core/util.js';

const LEG = 0.6, LS = LEG / 0.34;       // ความยาวขาใหม่ · อัตรายืดเทียบโครงเดิม
const AS = 1.35;                        // แขนยาวขึ้น
const HS = 0.69;                        // หัวเล็กลง (สัดส่วนผู้ใหญ่ขึ้น)

function part(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
const cyl = (rt, rb, h, n = 14) => new THREE.CylinderGeometry(rt, rb, h, n);
const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
// ทรงหมุนรอบแกน (ลำตัว เสื้อคลุม) · pts = [[รัศมี, y], ...] · flat = บีบหน้า-หลัง
function lathe(pts, n = 22, flat = 0.82, open = null) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n, open ? open[0] : 0, open ? open[1] : Math.PI * 2);
  g.scale(1, 1, flat);
  return g;
}

// ผ้าจับจีบ: ทรงหมุนรอบแกนที่ขอบเป็นลอน (ให้เกิดรอยพับแนวตั้งเวลาลงเงาแบบพิกเซล)
function pleats(geo, n = 10, amp = 0.012, from = 0) {
  const pos = geo.attributes.position, v = new THREE.Vector3();
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < pos.count; i++) { y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); }
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z); if (r < 1e-4) continue;
    const a = Math.atan2(v.z, v.x), k = Math.max(0, (y1 - v.y) / (y1 - y0 || 1) - from);   // ยิ่งต่ำยิ่งเป็นลอนชัด
    const s = 1 + (Math.sin(a * n) * amp * k) / r;
    pos.setXYZ(i, v.x * s, v.y, v.z * s);
  }
  geo.computeVertexNormals();
  return geo;
}

// ช่อผม 1 ช่อ: กรวยแบน วางบนผิวหัวแล้วชี้ไปตามทิศ dir
function strand(base, dir, normal, len, rad, flat = 0.55) {
  const g = new THREE.ConeGeometry(rad, len, 6, 1);
  g.translate(0, len / 2, 0);
  g.scale(1, 1, flat);
  const x = new THREE.Vector3().crossVectors(dir, normal).normalize();
  const z = new THREE.Vector3().crossVectors(x, dir).normalize();
  const m = new THREE.Matrix4().makeBasis(x, dir, z);
  m.setPosition(base);
  return g.applyMatrix4(m);
}

// จุดบนผิวหัว (มุม a รอบตัว 0 = หน้า, มุม e = เงยขึ้นจากแนวตา)
function onHead(a, e, r = 0.27, cy = 0.2) {
  const n = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const down = new THREE.Vector3(Math.sin(a) * Math.sin(e), -Math.cos(e), Math.cos(a) * Math.sin(e));
  return { p: n.clone().multiplyScalar(r).add(new THREE.Vector3(0, cy, 0)), n, down };
}

export class CharacterView {
  constructor(look = {}) {
    const L = { hair: '#5e3f27', skin: '#f6d6b8', eye: '#3a2440', tunic: '#4a7ac8', pants: '#4b3b2f', boot: '#2e2420', belt: '#7a5230', ...look };
    this.L = L;
    this.root = new THREE.Group();
    this.body = new THREE.Group();          // ส่วนที่เด้งตอนเดิน
    this.root.add(this.body);
    this.body.scale.setScalar((L.scale || 1) * 1.3);
    this.phase = Math.random() * 10;
    this.walkBlend = 0;
    this.time = Math.random() * 10;
    this.blinkAt = 1 + Math.random() * 3;
    const gear = L.jobGear;
    const robed = gear === 'mage' || gear === 'acolyte';
    this.robed = robed;

    const skin = toon(L.skin), cloth = toon(L.tunic), clothDk = toon(shadeHex(L.tunic, -0.22));
    const trim = toon(shadeHex(L.tunic, 0.42)), pants = toon(L.pants), boot = toon(L.boot), bootTrim = toon(shadeHex(L.boot, 0.25));
    const belt = toon(L.belt), leather = toon('#6e4a30'), gold = toon('#e8c050', { emissive: '#2a1e00' });
    const hair = toon(L.hair, { side: THREE.DoubleSide });
    hair.userData.pxHair = true;                // สไปรต์พิกเซลลงเงาผมแบบอนิเมะ
    skin.userData.pxSkin = true;
    const steel = toon('#c9ced8', { emissive: '#0e1218' }); steel.userData.pxMetal = true;
    gold.userData.pxMetal = true;

    /* ---------- ขา (หมุนที่สะโพก) ---------- */
    this.legInner = [];
    this.legs = [-1, 1].map((side) => {
      const hip = new THREE.Group(); hip.position.set(side * 0.082, LEG, 0); hip.scale.set(1, LS, 1); this.body.add(hip);
      const g = new THREE.Group(); g.scale.set(1, 1 / LS, 1); hip.add(g); this.legInner.push(g);
      part(cyl(0.072, 0.056, 0.3), pants, g, 0, -0.15, 0);
      part(sph(0.057, 12, 8), pants, g, 0, -0.3, 0.004);
      part(cyl(0.054, 0.046, 0.14), pants, g, 0, -0.37, 0);
      part(cyl(0.06, 0.052, 0.17), boot, g, 0, -0.5, 0);
      part(cyl(0.064, 0.064, 0.035), bootTrim, g, 0, -0.42, 0);
      const foot = part(sph(0.058, 14, 10), boot, g, 0, -0.575, 0.045); foot.scale.set(0.95, 0.55, 1.65);
      if (gear === 'swordsman') {                 // สนับแข้งเหล็ก
        const gr = part(cyl(0.064, 0.058, 0.2, 14), steel, g, 0, -0.47, 0.006); gr.scale.z = 1.08;
        const kn = part(sph(0.06, 12, 8), steel, g, 0, -0.32, 0.03); kn.scale.set(1, 0.9, 0.8);
      }
      return hip;
    });

    /* ---------- ลำตัว (จุดหมุน = สะโพก) ---------- */
    this.torso = new THREE.Group(); this.torso.position.y = LEG; this.body.add(this.torso);
    const T = this.torso;
    // เสื้อตัวใน: เอวคอด อกผาย ชายเสื้อบานคลุมสะโพก
    part(pleats(lathe([[0.001, -0.15], [0.2, -0.15], [0.178, -0.05], [0.16, 0.05], [0.148, 0.13], [0.162, 0.22], [0.172, 0.3], [0.166, 0.35], [0.125, 0.395], [0.06, 0.42], [0.001, 0.42]], 40), 7, 0.01, 0.55), cloth, T);
    part(new THREE.TorusGeometry(0.198, 0.014, 6, 26).rotateX(Math.PI / 2).scale(1, 1, 0.82), trim, T, 0, -0.148, 0);
    // เข็มขัด + หัวเข็มขัด + กระเป๋าคาดเอว
    part(cyl(0.156, 0.16, 0.05, 22).scale(1, 1, 0.84), belt, T, 0, 0.09, 0);
    part(new THREE.BoxGeometry(0.06, 0.05, 0.02), gold, T, 0, 0.09, 0.136);
    if (!robed) { const pouch = part(new THREE.BoxGeometry(0.07, 0.08, 0.05), leather, T, 0.13, 0.05, 0.07); pouch.rotation.y = 0.9; }
    // คอ
    part(cyl(0.044, 0.05, 0.1, 12), skin, T, 0, 0.44, 0);
    part(new THREE.TorusGeometry(0.075, 0.022, 6, 18).rotateX(Math.PI / 2), trim, T, 0, 0.405, 0);
    if (L.scarf && gear !== 'swordsman') {
      const sm = toon(L.scarf);
      part(new THREE.TorusGeometry(0.09, 0.04, 8, 18).rotateX(Math.PI / 2), sm, T, 0, 0.41, 0);
      const tail = part(new THREE.BoxGeometry(0.06, 0.22, 0.025), sm, T, 0.07, 0.3, -0.13); tail.rotation.set(0.25, 0, -0.18);
    }

    /* ---------- แขน (หมุนที่ไหล่) ---------- */
    this.hands = [];
    const sleeve = robed ? cloth : clothDk;
    this.armInner = [];
    this.arms = [-1, 1].map((side) => {
      const sh = new THREE.Group(); sh.position.set(side * 0.19, 0.345, 0); sh.scale.set(1, AS, 1); T.add(sh);
      const g = new THREE.Group(); g.scale.set(1, 1 / AS, 1); sh.add(g); this.armInner.push(g);
      part(sph(0.062, 12, 10), sleeve, g, 0, -0.01, 0);
      part(cyl(0.058, 0.049, 0.2, 12), sleeve, g, side * 0.006, -0.11, 0);
      part(sph(0.046, 10, 8), sleeve, g, side * 0.01, -0.21, 0);
      if (robed) { part(cyl(0.048, 0.078, 0.15, 14), cloth, g, side * 0.014, -0.29, 0); part(new THREE.TorusGeometry(0.078, 0.01, 4, 16).rotateX(Math.PI / 2), gold, g, side * 0.016, -0.365, 0); }
      else { part(cyl(0.044, 0.037, 0.15, 12), skin, g, side * 0.014, -0.29, 0); part(cyl(0.047, 0.047, 0.035, 12), trim, g, side * 0.013, -0.225, 0); }
      const hd = part(sph(0.042, 10, 8), skin, g, side * 0.02, -0.38, 0.005); hd.scale.set(0.9, 1.15, 0.95);
      const hand = new THREE.Group(); hand.position.set(side * 0.02, -0.38, 0.012); g.add(hand); this.hands.push(hand);
      return sh;
    });
    const [armR, armL] = this.armInner;      // arms[0] = มือขวา (ถืออาวุธ)

    /* ---------- หัว + ใบหน้า ---------- */
    this.head = new THREE.Group(); this.head.position.y = 0.46; this.head.scale.setScalar(HS); T.add(this.head);
    const H = this.head;
    const skull = part(sph(0.26, 28, 20), skin, H, 0, 0.2, 0); skull.scale.set(0.93, 1.04, 0.98);
    const chin = part(sph(0.17, 18, 12), skin, H, 0, 0.055, 0.08); chin.scale.set(0.9, 0.9, 0.9);   // คางเรียวแบบอนิเมะ
    for (const sx of [-1, 1]) { const e = part(sph(0.045, 10, 8), skin, H, sx * 0.25, 0.17, -0.01); e.scale.set(0.45, 1, 0.75); }
    const faceGeo = new THREE.SphereGeometry(0.2625, 26, 14, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.33, Math.PI * 0.4);
    const faceOpts = { brow: L.hair, small: true };
    this.faceOpen = faceMaterial(L.eye, false, faceOpts);
    this.faceClosed = faceMaterial(L.eye, true, faceOpts);
    this.face = part(faceGeo, this.faceOpen, H, 0, 0.2, 0);
    this.face.castShadow = false; this.face.renderOrder = 2; this.face.userData.keep = true;
    this.mouth = new THREE.Object3D(); this.mouth.position.set(0, 0.075, 0.245); this.mouth.lookAt(0, 0.075, 1); this.mouth.userData.pxSkip = true; H.add(this.mouth);   // จุดปาก (สไปรต์พิกเซล)

    // ผม
    const style = L.hairStyle || 'short';
    const tight = !!L.hatTight;
    if (style !== 'none') {
      const cap = part(new THREE.SphereGeometry(0.284, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, H, 0, 0.212, -0.012);
      cap.rotation.x = -0.24; cap.scale.set(1.02, 1.02, 1.04);
      const back = part(new THREE.SphereGeometry(0.29, 22, 14, Math.PI, Math.PI, Math.PI * 0.2, Math.PI * 0.56), hair, H, 0, 0.2, -0.014);
      back.scale.set(1.0, 1.05, 1.05);
    }
    const geos = [];
    const clump = (a, e, len, rad, out = 0.28, flat = 0.55, push = 0.025) => {
      const { p, n, down } = onHead(a, e, 0.27);
      const dir = down.clone().add(n.clone().multiplyScalar(out)).normalize();
      geos.push(strand(p.sub(n.clone().multiplyScalar(push)), dir, n, len, rad, flat));
    };
    if (style !== 'none') {
      // หน้าม้า 9 ช่อ ยาวไม่เท่ากัน (ปัดข้างเล็กน้อย)
      const bangs = [[-1.3, 0.24], [-1.0, 0.3], [-0.72, 0.33], [-0.44, 0.3], [-0.16, 0.35], [0.12, 0.29], [0.4, 0.33], [0.7, 0.28], [1.0, 0.26], [1.3, 0.24]];
      bangs.forEach(([a, len], i) => clump(a, 1.0, len, 0.082 + (i % 2) * 0.014, 0.32, 0.5));
      // จอนผมยาวลงมาข้างแก้ม
      const lock = style === 'long' ? 0.62 : style === 'ponytail' ? 0.42 : 0.36;
      for (const sx of [-1, 1]) { clump(sx * 1.36, 0.62, lock, 0.075, 0.1, 0.5, 0.02); clump(sx * 1.6, 0.5, lock * 0.85, 0.07, 0.12, 0.5, 0.02); }
      // ด้านหลัง
      if (style === 'long') {
        for (let i = 0; i < 11; i++) { const k = i - 5, a = Math.PI + k * 0.22; clump(a, 0.55 - Math.abs(k) * 0.03, 0.78 + (i % 2) * 0.12 - Math.abs(k) * 0.03, 0.11, 0.12, 0.45, 0.03); }
      } else {
        const nape = style === 'short' ? 7 : 9;
        for (let i = 0; i < nape; i++) { const k = i - (nape - 1) / 2, a = Math.PI + k * (style === 'short' ? 0.3 : 0.26); clump(a, 0.2, (style === 'short' ? 0.2 : 0.28) + (i % 2) * 0.07, 0.095, 0.34, 0.6, 0.03); }
      }
      if (!tight) for (const [a, e] of [[Math.PI * 0.6, 0.8], [-Math.PI * 0.6, 0.8], [Math.PI, 0.92], [Math.PI * 0.8, 0.5], [-Math.PI * 0.8, 0.5]]) clump(a, e, 0.22, 0.1, 0.55, 0.62, 0.03);
    }
    if (style === 'spiky') {
      // ผมตั้งแหลมแบบนักผจญภัย
      const spikes = [[Math.PI, 0.95, 0.21], [Math.PI - 0.7, 0.85, 0.19], [Math.PI + 0.7, 0.85, 0.19], [2.05, 0.4, 0.17], [-2.05, 0.4, 0.17], [Math.PI, 0.42, 0.19], [Math.PI - 0.38, 1.22, 0.16], [Math.PI + 0.38, 1.22, 0.16],
        [0.55, 1.15, 0.15], [-0.55, 1.15, 0.15], [1.35, 0.95, 0.14], [-1.35, 0.95, 0.14], [0, 1.3, 0.13]];
      for (const [a, e, len] of spikes) {
        if (tight && e > 0.7) continue;
        const { p, n } = onHead(a, e, 0.27);
        const dir = n.clone().add(new THREE.Vector3(0, 0.25, 0)).add(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.4)).normalize();
        geos.push(strand(p.sub(n.clone().multiplyScalar(0.04)), dir, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), len, 0.088, 0.6));
      }
    }
    if (style !== 'none' && L.accessory !== 'guard' && L.accessory !== 'hat' && !L.hideAhoge) {
      const { p, n } = onHead(0.2, 1.35, 0.27);
      geos.push(strand(p, new THREE.Vector3(0.1, 0.8, 0.6).normalize(), n, 0.17, 0.03, 0.4));
    }
    for (const g of geos) part(g, hair, H);
    if (style === 'ponytail') {
      // หางม้าสูง เป็นช่อ ๆ ห้อยไปด้านหลัง
      const tail = new THREE.Group(); tail.position.set(0, 0.36, -0.25); tail.rotation.x = 0.55; H.add(tail);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const s = part(new THREE.ConeGeometry(0.075, 0.5, 7).translate(0, -0.22, 0), hair, tail, Math.cos(a) * 0.035, 0, Math.sin(a) * 0.035);
        s.rotation.set(Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18); s.scale.z = 0.7;
      }
      bake(tail);
      part(new THREE.TorusGeometry(0.05, 0.022, 6, 12), toon(L.accessory === 'ribbon' ? '#ffd34d' : '#c94a3a'), H, 0, 0.36, -0.25).rotation.x = 1.2;
      this.tail = tail;
    }

    /* ---------- อุปกรณ์เสริม (NPC / สะพายหลัง) ---------- */
    const acc = L.accessory;
    const inHand = (i, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, rz); this.hands[i].add(g); return g; };
    if (acc === 'backpack') {
      const bag = part(sph(0.13, 16, 12), toon('#9a6a3a'), T, 0, 0.2, -0.19); bag.scale.set(1.05, 1.1, 0.6);
      const flap = part(new THREE.SphereGeometry(0.135, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), toon('#7a4c26'), T, 0, 0.22, -0.19); flap.scale.set(1.08, 0.9, 0.66);
      part(new THREE.BoxGeometry(0.04, 0.05, 0.02), toon('#c9a24a'), T, 0, 0.21, -0.27);
      const roll = part(cyl(0.05, 0.05, 0.3, 12), toon('#c8b48a'), T, 0, 0.35, -0.18); roll.rotation.z = Math.PI / 2;
      for (const sx of [-1, 1]) { const st = part(new THREE.BoxGeometry(0.03, 0.3, 0.012), leather, T, sx * 0.09, 0.24, 0.125); st.rotation.x = -0.1; }
    } else if (acc === 'ribbon') {
      for (const sx of [-1, 1]) { const rb = part(sph(0.065, 12, 8), toon('#ffd34d'), H, sx * 0.07, 0.42, -0.2); rb.scale.set(1.3, 0.8, 0.5); }
    } else if (acc === 'hat') {
      const hc = toon('#8a5a32'), band = toon('#c94a3a');
      part(cyl(0.38, 0.38, 0.03, 28), hc, H, 0, 0.37, 0);
      part(cyl(0.19, 0.23, 0.2, 22), hc, H, 0, 0.48, 0);
      part(cyl(0.232, 0.232, 0.045, 22), band, H, 0, 0.405, 0);
    } else if (acc === 'guard') {
      const helm = part(new THREE.SphereGeometry(0.295, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), steel, H, 0, 0.22, 0); helm.scale.set(1, 1.05, 1);
      part(cyl(0.3, 0.3, 0.04, 22), steel, H, 0, 0.23, 0);
      part(new THREE.ConeGeometry(0.045, 0.18, 8), toon('#d8433a'), H, 0, 0.57, 0);
      const sp = inHand(1, 0, 0, 0.02);
      part(cyl(0.018, 0.018, 1.7, 6), toon('#7a5232'), sp, 0, 0.5, 0);
      part(new THREE.ConeGeometry(0.048, 0.2, 6), steel, sp, 0, 1.43, 0);
      bake(sp);
      this.arms[1].userData.holding = true;
      for (const g of this.armInner) { const pd = part(sph(0.085, 12, 8), steel, g, 0, 0.0, 0); pd.scale.set(1.15, 0.85, 1.1); }
    } else if (acc === 'smith') {
      const apron = part(new THREE.CylinderGeometry(0.17, 0.215, 0.42, 18, 1, true, -0.95, 1.9), toon('#5a3a26', { side: THREE.DoubleSide }), T, 0, 0.14, 0.004);
      apron.userData.noOutline = true; apron.scale.z = 0.86;
      const hm = inHand(0, 0, 0, 0, 0.35, 0, 0);
      const handle = part(cyl(0.018, 0.02, 0.38, 8), toon('#7a5232'), hm, 0, 0, 0.1); handle.rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.16, 0.085, 0.09), toon('#5c616c', { emissive: '#0c0e12' }), hm, 0, 0, 0.29);
      bake(hm);
      this.arms[0].userData.holding = true;
    } else if (acc === 'wizard') {
      const hc = toon(L.hatColor || '#4a3a8a');
      part(cyl(0.42, 0.42, 0.025, 30), hc, H, 0, 0.37, 0);
      const cone = part(new THREE.ConeGeometry(0.22, 0.55, 22, 3), hc, H, 0, 0.64, -0.04); cone.rotation.x = -0.25;
      part(cyl(0.228, 0.228, 0.05, 22), gold, H, 0, 0.4, 0);
      part(new THREE.OctahedronGeometry(0.05, 0), gold, H, 0.12, 0.62, 0.16);
      const st = inHand(1, 0, 0, 0.02);
      part(cyl(0.02, 0.024, 1.45, 7), toon('#6a4428'), st, 0, 0.42, 0);
      part(new THREE.TorusGeometry(0.075, 0.016, 6, 14), gold, st, 0, 1.15, 0);
      const orb = part(sph(0.07, 16, 12), toon(L.orbColor || '#7fe0ff', { emissive: L.orbColor || '#7fe0ff', emissiveIntensity: 1.4 }), st, 0, 1.15, 0);
      orb.userData.noOutline = true;
      bake(st);
      this.arms[1].userData.holding = true;
    } else if (acc === 'clerk') {
      const bc = toon(L.hatColor || '#2f6a5a');
      const beret = part(new THREE.SphereGeometry(0.27, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), bc, H, -0.03, 0.27, -0.02);
      beret.scale.set(1.12, 0.62, 1.12); beret.rotation.z = 0.18;
      const bk = inHand(1, 0.02, 0.03, 0.09, -0.5, 0.3, 0);
      part(new THREE.BoxGeometry(0.17, 0.22, 0.045), toon('#8a3b3b'), bk);
      part(new THREE.BoxGeometry(0.155, 0.205, 0.035), toon('#f2ead6'), bk, 0.012, 0, 0);
      bake(bk);
      this.arms[1].userData.holding = true;
    }
    if (acc === 'quiver') {
      const q = new THREE.Group(); q.position.set(0.08, 0.24, -0.19); q.rotation.set(0.25, 0, -0.45); T.add(q);
      part(cyl(0.065, 0.055, 0.36, 12), leather, q);
      part(cyl(0.068, 0.068, 0.04, 12), toon('#c9a24a'), q, 0, 0.17, 0);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        part(cyl(0.008, 0.008, 0.16, 5), toon('#d8c49a'), q, Math.cos(a) * 0.03, 0.25, Math.sin(a) * 0.03);
        const f = part(new THREE.BoxGeometry(0.03, 0.07, 0.006), toon(i % 2 ? '#f2ece0' : '#d8433a'), q, Math.cos(a) * 0.03, 0.33, Math.sin(a) * 0.03); f.rotation.y = a;
      }
      bake(q);
      const strap = part(new THREE.BoxGeometry(0.035, 0.5, 0.012), leather, T, 0, 0.24, 0.13); strap.rotation.z = 0.72;
    }

    /* ---------- ชุดประจำอาชีพ ---------- */
    if (gear === 'swordsman') {
      // เกราะเต็มตัว: เกราะอก + แผ่นท้อง + เกราะไหล่ซ้อน 2 ชั้น + ปลอกแขน + กระโปรงเกราะ
      part(lathe([[0.152, 0.13], [0.168, 0.2], [0.182, 0.29], [0.176, 0.35], [0.13, 0.392], [0.075, 0.41]], 24, 0.85), steel, T);
      for (const y of [0.115, 0.07]) part(new THREE.TorusGeometry(0.157, 0.016, 6, 24).rotateX(Math.PI / 2).scale(1, 1, 0.85), steel, T, 0, y, 0);
      part(new THREE.TorusGeometry(0.18, 0.011, 4, 26).rotateX(Math.PI / 2).scale(1, 1, 0.85), gold, T, 0, 0.29, 0);
      const crest = part(new THREE.OctahedronGeometry(0.035, 0), gold, T, 0, 0.27, 0.165); crest.scale.set(0.8, 1.2, 0.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const pl = part(new THREE.BoxGeometry(0.11, 0.17, 0.016), steel, T, Math.sin(a) * 0.175, -0.04, Math.cos(a) * 0.15); pl.rotation.set(0.22, a, 0, 'YXZ');
      }
      for (const [i, g] of this.armInner.entries()) {
        const side = i === 0 ? -1 : 1;
        const p1 = part(new THREE.SphereGeometry(0.105, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), steel, g, side * 0.02, 0.015, 0); p1.scale.set(1.25, 0.85, 1.15); p1.rotation.z = side * -0.35;
        const p2 = part(new THREE.SphereGeometry(0.095, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), steel, g, side * 0.04, -0.05, 0); p2.scale.set(1.2, 0.7, 1.12); p2.rotation.z = side * -0.5;
        part(new THREE.TorusGeometry(0.1, 0.011, 4, 18).rotateX(Math.PI / 2), gold, g, side * 0.03, -0.02, 0).rotation.z = side * -0.35;
        part(cyl(0.05, 0.044, 0.15, 12), steel, g, side * 0.014, -0.29, 0);
        const fist = part(sph(0.047, 10, 8), steel, g, side * 0.02, -0.38, 0.005); fist.scale.set(0.95, 1.1, 1);
      }
    } else if (gear === 'mage') {
      // เสื้อคลุมยาวถึงข้อเท้า ขลิบทอง + ผ้าคลุมไหล่ปกสูง + มงกุฎผลึก
      const robe = toon(L.tunic, { side: THREE.DoubleSide });
      part(pleats(lathe([[0.16, 0.12], [0.175, 0.0], [0.2, -0.15], [0.25, -0.35], [0.29, -0.53]], 48, 0.86), 9, 0.018, 0.15), robe, T).userData.noOutline = true;
      part(new THREE.TorusGeometry(0.29, 0.016, 6, 30).rotateX(Math.PI / 2).scale(1, 1, 0.86), gold, T, 0, -0.53, 0);
      part(new THREE.BoxGeometry(0.035, 0.62, 0.012), gold, T, 0, -0.2, 0.2).rotation.x = -0.12;
      const mantle = part(lathe([[0.1, 0.43], [0.17, 0.38], [0.24, 0.27], [0.27, 0.18]], 24, 0.9), toon(shadeHex(L.tunic, -0.28), { side: THREE.DoubleSide }), T);
      mantle.userData.noOutline = true;
      part(new THREE.TorusGeometry(0.27, 0.012, 4, 30).rotateX(Math.PI / 2).scale(1, 1, 0.9), gold, T, 0, 0.18, 0);
      const collar = part(new THREE.CylinderGeometry(0.15, 0.11, 0.16, 20, 1, true, Math.PI - 1.3, 2.6), toon(shadeHex(L.tunic, -0.28), { side: THREE.DoubleSide }), T, 0, 0.5, -0.01);
      collar.userData.noOutline = true;
      if (!L.hideJobHat) {
        const circ = part(new THREE.TorusGeometry(0.27, 0.014, 6, 28), gold, H, 0, 0.3, 0); circ.rotation.x = Math.PI / 2 - 0.3;
        part(new THREE.OctahedronGeometry(0.04, 0), toon('#9ae8ff', { emissive: '#4ac8ff', emissiveIntensity: 1.2 }), H, 0, 0.36, 0.26);
      }
    } else if (gear === 'archer') {
      // เสื้อกั๊กหนัง + ผ้าคลุมไหล่มีฮู้ดพับหลัง + ปลอกแขน
      part(lathe([[0.155, 0.08], [0.17, 0.2], [0.178, 0.3], [0.17, 0.35], [0.13, 0.385]], 22, 0.84, [Math.PI * 0.3, Math.PI * 1.4]), toon('#6a4a30', { side: THREE.DoubleSide }), T).userData.noOutline = true;
      const cl = toon(shadeHex(L.tunic, -0.15), { side: THREE.DoubleSide });
      part(lathe([[0.1, 0.42], [0.18, 0.37], [0.24, 0.26], [0.25, 0.16]], 22, 0.9), cl, T).userData.noOutline = true;
      const hood = part(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.6), cl, T, 0, 0.43, -0.13); hood.scale.set(1.1, 0.8, 0.9);
      hood.userData.noOutline = true;
      for (const g of this.armInner) part(cyl(0.05, 0.044, 0.12, 12), leather, g, 0, -0.29, 0);
      if (!L.hideJobHat) {
        const feather = part(new THREE.ConeGeometry(0.03, 0.3, 6), toon('#d8433a'), H, 0.22, 0.4, -0.08); feather.rotation.set(-0.9, 0, -0.5); feather.scale.z = 0.35;
      }
    } else if (gear === 'acolyte') {
      // ชุดนักบวชยาว + ผ้าคลุมไหล่ + ผ้าสโตล + จี้กางเขน + หมวกนักบวช
      const robe = toon(L.tunic, { side: THREE.DoubleSide });
      part(pleats(lathe([[0.16, 0.12], [0.172, 0.0], [0.19, -0.15], [0.23, -0.35], [0.265, -0.53]], 48, 0.86), 8, 0.016, 0.15), robe, T).userData.noOutline = true;
      part(new THREE.TorusGeometry(0.265, 0.014, 6, 30).rotateX(Math.PI / 2).scale(1, 1, 0.86), gold, T, 0, -0.53, 0);
      const stole = toon(L.scarf || '#c94a3a');
      for (const sx of [-1, 1]) { const st = part(new THREE.BoxGeometry(0.05, 0.85, 0.012), stole, T, sx * 0.07, -0.02, 0.18); st.rotation.x = -0.14; }
      part(lathe([[0.1, 0.42], [0.18, 0.37], [0.23, 0.28], [0.235, 0.22]], 22, 0.9), toon(L.scarf || '#c94a3a', { side: THREE.DoubleSide }), T).userData.noOutline = true;
      part(new THREE.BoxGeometry(0.024, 0.1, 0.015), gold, T, 0, 0.3, 0.19);
      part(new THREE.BoxGeometry(0.072, 0.024, 0.015), gold, T, 0, 0.32, 0.19);
      if (!L.hideJobHat) { const zc = part(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), toon(L.scarf || '#c94a3a'), H, 0, 0.36, -0.06); zc.rotation.x = -0.3; }
    }

    // ผ้าคลุมหลังยาว (ปลิวตามการเดิน) — อัศวินมีผ้าคลุมแดงเป็นค่าเริ่มต้น
    const capeColor = L.cape !== undefined ? L.cape : gear === 'swordsman' ? '#8a2630' : null;
    if (capeColor) {
      this.cape = new THREE.Group(); this.cape.position.set(0, 0.38, -0.06); T.add(this.cape);
      const cm = toon(capeColor, { side: THREE.DoubleSide });
      const cp = part(pleats(new THREE.CylinderGeometry(0.18, 0.36, 0.86, 40, 4, true, Math.PI - 1.2, 2.4), 9, 0.022, 0.1), cm, this.cape, 0, -0.42, -0.03);
      cp.userData.noOutline = true;
      part(new THREE.CylinderGeometry(0.362, 0.362, 0.03, 20, 1, true, Math.PI - 1.2, 2.4), toon(shadeHex(capeColor, -0.3), { side: THREE.DoubleSide }), this.cape, 0, -0.85, -0.03).userData.noOutline = true;
      bake(this.cape, { outline: false });
      for (const sx of [-1, 1]) part(sph(0.03, 8, 6), gold, T, sx * 0.13, 0.37, 0.09);
    }

    /* ---------- อาวุธ (มือขวา = hands[0]) ---------- */
    if (L.weapon === 'knife') {
      const h = inHand(0);
      const st = toon('#e4e8ee', { emissive: '#1a1e24' }); st.userData.pxMetal = true;
      part(new THREE.BoxGeometry(0.022, 0.065, 0.27), st, h, 0, 0, 0.17);
      const tip = part(new THREE.ConeGeometry(0.033, 0.07, 4), st, h, 0, 0, 0.34); tip.rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.14, 0.028, 0.035), toon('#d8ad4a'), h, 0, 0, 0.035);
      const grip = part(cyl(0.019, 0.019, 0.1, 8), toon('#5e3f27'), h, 0, 0, -0.03); grip.rotation.x = Math.PI / 2;
      bake(h);
    }
    if (L.weapon === 'sword') {
      // ดาบยาวสองคม การ์ดทอง
      const h = inHand(0, 0, 0, 0, 0.55, 0, 0);
      const st = toon('#e6eaf2', { emissive: '#1a2030' }); st.userData.pxMetal = true;
      part(new THREE.BoxGeometry(0.03, 0.08, 0.7), st, h, 0, 0, 0.45);
      const tip = part(new THREE.ConeGeometry(0.048, 0.14, 4), st, h, 0, 0, 0.87); tip.rotation.x = Math.PI / 2; tip.scale.set(1, 1, 0.45);
      const glow = part(new THREE.BoxGeometry(0.008, 0.02, 0.64), toon(L.bladeGlow || '#9ad8ff', { emissive: L.bladeGlow || '#9ad8ff', emissiveIntensity: 1.3 }), h, 0.017, 0, 0.44);
      glow.userData.noOutline = true;
      part(new THREE.BoxGeometry(0.24, 0.04, 0.05), gold, h, 0, 0, 0.08);
      for (const sx of [-1, 1]) part(sph(0.028, 8, 6), gold, h, sx * 0.12, 0, 0.08);
      const grip = part(cyl(0.021, 0.021, 0.15, 8), toon('#3a2418'), h, 0, 0, -0.01); grip.rotation.x = Math.PI / 2;
      part(sph(0.032, 10, 8), gold, h, 0, 0, -0.095);
      bake(h);
    }
    if (L.weapon === 'staff') {
      const s = inHand(0, -0.015, 0.0, 0.02, -0.05, 0, 0.25);
      part(cyl(0.019, 0.023, 1.4, 7), toon('#7a5232'), s, 0, 0.36, 0);
      part(new THREE.TorusGeometry(0.065, 0.015, 6, 14), gold, s, 0, 1.08, 0);
      const gem = part(new THREE.OctahedronGeometry(0.065, 0), toon(L.gem || '#7fe0ff', { emissive: L.gem || '#7fe0ff', emissiveIntensity: 1.3 }), s, 0, 1.1, 0);
      gem.scale.y = 1.45; gem.userData.noOutline = true;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const pr = part(new THREE.ConeGeometry(0.014, 0.12, 4), gold, s, Math.cos(a) * 0.05, 1.12, Math.sin(a) * 0.05); pr.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
      bake(s);
    }
    if (L.weapon === 'mace') {
      const h = inHand(0, 0, 0, 0, 0.55, 0, 0);
      const grip = part(cyl(0.02, 0.022, 0.44, 8), toon('#5e3f27'), h, 0, 0, 0.14); grip.rotation.x = Math.PI / 2;
      part(sph(0.078, 12, 10), gold, h, 0, 0, 0.4);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const sp = part(new THREE.ConeGeometry(0.022, 0.065, 5), gold, h, Math.cos(a) * 0.083, Math.sin(a) * 0.083, 0.4); sp.rotation.z = a - Math.PI / 2; }
      part(sph(0.028, 8, 6), gold, h, 0, 0, -0.09);
      bake(h);
    }
    if (L.weapon === 'bow') {
      const r = 0.42, half = 1.05;
      const bw = inHand(1, 0.02, 0.0, 0.04, 0, -Math.PI / 2, 0);
      const arc = part(new THREE.TorusGeometry(r, 0.021, 6, 22, half * 2), toon(L.bowColor || '#9b6b3e'), bw, -r, 0, 0); arc.rotation.z = -half;
      const chord = r - r * Math.cos(half);
      const str = part(cyl(0.004, 0.004, 2 * r * Math.sin(half), 4), toon('#f2ece0'), bw, -chord, 0, 0); str.userData.noOutline = true;
      part(cyl(0.03, 0.03, 0.11, 8), toon('#5e3f27'), bw, 0, 0, 0);
      for (const sy of [-1, 1]) part(sph(0.022, 8, 6), gold, bw, -chord, sy * r * Math.sin(half), 0);
      bake(bw);
      this.arms[1].userData.holding = true;
    }

    /* ---------- อุปกรณ์ที่มองเห็นได้ ---------- */
    if (L.shield) {
      const sh = new THREE.Group(); sh.position.set(0.07, -0.25, 0.03); sh.rotation.set(0, Math.PI / 2 - 0.25, 0); armL.add(sh);
      const disc = part(cyl(0.18, 0.18, 0.035, 22), toon(L.shield), sh); disc.rotation.x = Math.PI / 2;
      part(new THREE.TorusGeometry(0.18, 0.018, 6, 22), steel, sh);
      const boss = part(sph(0.045, 12, 8), steel, sh, 0, 0, 0.02); boss.scale.z = 0.6;
      for (const a of [0, Math.PI / 2]) { const b = part(new THREE.BoxGeometry(0.34, 0.03, 0.01), toon('#6a4428'), sh, 0, 0, 0.02); b.rotation.z = a; }
      bake(sh);
    }
    if (L.headgear === 'bandana') {
      const c = toon(L.headColor || '#d8433a');
      const band = part(new THREE.TorusGeometry(0.276, 0.04, 8, 28), c, H, 0, 0.3, -0.01); band.rotation.x = Math.PI / 2 - 0.25; band.scale.set(1, 1, 0.9);
      part(sph(0.05, 10, 8), c, H, 0, 0.27, -0.29);
      for (const sx of [-1, 1]) { const t = part(new THREE.BoxGeometry(0.06, 0.2, 0.025), c, H, sx * 0.05, 0.17, -0.31); t.rotation.set(0.4, 0, sx * 0.4); }
    } else if (L.headgear === 'crown') {
      const wood = toon(L.headColor || '#6a4a2a'), leaf = toon('#7ae05a', { emissive: '#2a6a1a', emissiveIntensity: 0.6 });
      const ring = part(new THREE.TorusGeometry(0.275, 0.03, 6, 26), wood, H, 0, 0.33, -0.01); ring.rotation.x = Math.PI / 2 - 0.2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const tw = part(new THREE.ConeGeometry(0.03, 0.17, 5), wood, H, Math.sin(a) * 0.26, 0.42 + Math.cos(a) * 0.05, Math.cos(a) * 0.26 - 0.01);
        tw.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
        const lf = part(sph(0.045, 8, 6), leaf, H, Math.sin(a) * 0.29, 0.5 + Math.cos(a) * 0.05, Math.cos(a) * 0.29 - 0.01); lf.scale.set(1, 0.6, 1.4);
      }
    } else if (L.headgear === 'flower') {
      const fl = new THREE.Group(); fl.position.set(-0.22, 0.36, 0.08); fl.rotation.set(0.2, 0.6, 0.3); H.add(fl);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const pt = part(sph(0.045, 10, 8), toon(L.headColor || '#ff8fb8'), fl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); pt.scale.z = 0.45; }
      part(sph(0.03, 8, 6), toon('#ffd34d'), fl, 0, 0, 0.015);
      bake(fl);
    }

    bake(T);
    for (const g of this.armInner) bake(g);
    for (const g of this.legInner) bake(g);
    bake(H);

    this.attackT = 0; this.hurtT = 0; this.deadBlend = 0;

    // เงานุ่มใต้เท้า
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; blob.renderOrder = 1;
    this.root.add(blob);
  }

  attack(kind = 'melee') { this.attackT = 0.34; this.attackKind = kind; }
  hurt() { this.hurtT = 0.25; }

  // อัปเดตท่าทางทุกเฟรม: moving/speedFactor มาจาก Entity
  update(dt, entity) {
    this.time += dt;
    const target = entity.moving ? 1 : 0;
    this.walkBlend += (target - this.walkBlend) * damp(10, dt);
    const wb = this.walkBlend;
    this.phase += dt * 9.5 * (0.35 + 0.65 * (entity.speedFactor || (entity.moving ? 1 : 0)));

    const amp = this.robed ? 0.42 : 0.62;     // ชุดยาว: ก้าวสั้นลง ขาไม่ทะลุชายเสื้อ
    const swing = Math.sin(this.phase) * amp * wb;
    this.legs[0].rotation.x = swing; this.legs[1].rotation.x = -swing;
    this.legs[0].rotation.z = -0.05 * (1 - wb); this.legs[1].rotation.z = 0.05 * (1 - wb);   // ยืนแยกเท้าเล็กน้อย
    this.arms[0].rotation.x = -swing * 0.9;
    if (!this.arms[1].userData.holding) this.arms[1].rotation.x = swing * 0.9;
    else this.arms[1].rotation.x = swing * 0.25;
    this.arms[0].rotation.z = -0.14 - 0.03 * Math.sin(this.time * 2) * (1 - wb);
    this.arms[1].rotation.z = 0.14 + 0.03 * Math.sin(this.time * 2) * (1 - wb);
    if (wb < 0.5) this.arms[0].rotation.x += -0.22 * (1 - wb * 2);     // ยืนพัก: ยื่นมือถืออาวุธไปข้างหน้าเล็กน้อย

    const bob = Math.abs(Math.sin(this.phase)) * 0.04 * wb;
    const breathe = Math.sin(this.time * 2.2) * 0.006 * (1 - wb);
    this.body.position.y = bob;
    this.torso.scale.y = 1 + breathe;
    this.torso.rotation.x = 0.06 * wb;
    this.head.rotation.z = Math.sin(this.phase * 0.5) * 0.04 * wb;
    this.head.rotation.x = -0.05 * wb + Math.sin(this.time * 1.3) * 0.02 * (1 - wb);
    if (this.tail) this.tail.rotation.x = 0.55 + Math.sin(this.phase) * 0.15 * wb + Math.sin(this.time * 1.7) * 0.03;
    if (this.cape) this.cape.rotation.x = 0.04 + 0.36 * wb + Math.sin(this.time * 2.1) * 0.03 + Math.sin(this.phase * 2) * 0.05 * wb;

    // กะพริบตา
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.face.material = this.faceClosed;
      if (this.blinkAt < -0.12) { this.face.material = this.faceOpen; this.blinkAt = 2 + Math.random() * 3.5; }
    }

    // ท่าร่ายเวทย์ค้างไว้ระหว่างร่าย
    const casting = (!!entity.cast || !!entity.castPose) && !entity.dead;
    if (casting && this.attackT <= 0) {
      const w = Math.sin(this.time * 6) * 0.08;
      this.arms[0].rotation.x = -1.35 + w; this.arms[1].rotation.x = -1.2 - w;
      this.arms[0].rotation.z = -0.25; this.arms[1].rotation.z = 0.25;
    }
    if (this.attackT > 0 && this.attackKind === 'shoot') {
      this.attackT = Math.max(0, this.attackT - dt);
      const p = 1 - this.attackT / 0.34, k = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5);
      this.arms[1].rotation.x = -1.5 * k; this.arms[1].rotation.z = 0.1;
      this.arms[0].rotation.x = -1.3 * k * (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3);
      this.arms[0].rotation.z = -0.5 * k;
      this.torso.rotation.y = -0.45 * k;
    } else if (this.attackT > 0 && this.attackKind === 'cast') {
      this.attackT = Math.max(0, this.attackT - dt);
      const p = 1 - this.attackT / 0.34, k = Math.sin(p * Math.PI);
      this.arms[0].rotation.x = -1.4 - 0.9 * k; this.arms[1].rotation.x = -1.3 - 0.6 * k;
      this.arms[0].rotation.z = -0.3 * k; this.arms[1].rotation.z = 0.3 * k;
      this.torso.rotation.y *= 1 - damp(12, dt);
    } else if (this.attackT > 0) {
      // ท่าฟัน: เงื้อขึ้น แล้วฟันลงเฉียง
      this.attackT = Math.max(0, this.attackT - dt);
      const p = 1 - this.attackT / 0.34;
      const arm = this.arms[0];
      if (p < 0.38) arm.rotation.x = -2.5 * (p / 0.38);
      else { const k = (p - 0.38) / 0.62; arm.rotation.x = -2.5 + 3.0 * (1 - (1 - k) * (1 - k)); }
      arm.rotation.z = -0.25 * Math.sin(p * Math.PI);
      this.torso.rotation.y = Math.sin(p * Math.PI) * 0.35;
      this.arms[1].rotation.x = 0.4 * Math.sin(p * Math.PI);
    } else this.torso.rotation.y *= 1 - damp(12, dt);
    // โดนตี: สั่น + หลับตาปี๋
    if (this.hurtT > 0) {
      this.hurtT = Math.max(0, this.hurtT - dt);
      this.body.position.x = Math.sin(this.time * 80) * 0.05 * (this.hurtT / 0.25);
      this.face.material = this.faceClosed;
      if (this.hurtT === 0) this.face.material = this.faceOpen;
    } else this.body.position.x = 0;
    // หมดสติ: ล้มลงนอน
    this.deadBlend += ((entity.dead ? 1 : 0) - this.deadBlend) * damp(6, dt);
    if (this.deadBlend > 0.001) {
      this.body.rotation.x = -this.deadBlend * Math.PI / 2;
      this.body.position.y = this.deadBlend * 0.18;
      if (entity.dead) this.face.material = this.faceClosed;
    } else this.body.rotation.x = 0;

    this.root.position.set(entity.x / 16, entity.lift || 0, entity.y / 16);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, entity.angle, damp(14, dt));
  }
}

export const CHAR_HEAD = 1.4;   // ความสูงถึงศีรษะ (หน่วยก่อนคูณขนาดตัว 1.3) ใช้วางป้ายชื่อ
