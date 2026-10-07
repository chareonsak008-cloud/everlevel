// ตัวละคร 3 มิติสไตล์อนิเมะหัวโต: แรเงาแบบเซล + เส้นขอบ + ตาโตกะพริบได้ + ผมเป็นช่อ
import { THREE } from './three.js';
import { blobShadowTexture, shadeHex } from './Textures.js';
import { toon, bake, addOutline, faceMaterial } from './Toon.js';
import { lerpAngle, damp } from '../core/util.js';

function part(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
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
    this.root = new THREE.Group();
    this.body = new THREE.Group();          // ส่วนที่เด้งตอนเดิน
    this.root.add(this.body);
    const s = (L.scale || 1) * 1.3;
    this.body.scale.setScalar(s);
    this.phase = Math.random() * 10;
    this.walkBlend = 0;
    this.time = Math.random() * 10;
    this.blinkAt = 1 + Math.random() * 3;

    const skin = toon(L.skin), tunic = toon(L.tunic), dark = toon(shadeHex(L.tunic, -0.18));
    const pants = toon(L.pants), boot = toon(L.boot), hair = toon(L.hair, { side: THREE.DoubleSide }), belt = toon(L.belt);
    const trim = toon(shadeHex(L.tunic, 0.45));

    // ขา (หมุนจากสะโพก)
    this.legs = [-1, 1].map((side) => {
      const hip = new THREE.Group(); hip.position.set(side * 0.085, 0.36, 0); this.body.add(hip);
      part(new THREE.CylinderGeometry(0.066, 0.056, 0.28, 12), pants, hip, 0, -0.14, 0);
      const b = part(new THREE.SphereGeometry(0.078, 14, 10), boot, hip, 0, -0.305, 0.028);
      b.scale.set(1, 0.78, 1.38);
      part(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 12), boot, hip, 0, -0.25, 0);
      bake(hip);
      return hip;
    });

    // ลำตัว
    this.torso = new THREE.Group(); this.torso.position.y = 0.36; this.body.add(this.torso);
    part(new THREE.CylinderGeometry(0.15, 0.215, 0.38, 18), tunic, this.torso, 0, 0.18, 0);
    const hem = part(new THREE.TorusGeometry(0.212, 0.018, 6, 22), trim, this.torso, 0, 0.0, 0); hem.rotation.x = Math.PI / 2;
    part(new THREE.CylinderGeometry(0.205, 0.212, 0.05, 18), belt, this.torso, 0, 0.08, 0);
    part(new THREE.BoxGeometry(0.06, 0.05, 0.02), toon('#f0c850', { emissive: '#3a2a00' }), this.torso, 0, 0.08, 0.21);
    const collar = part(new THREE.TorusGeometry(0.115, 0.032, 8, 18), trim, this.torso, 0, 0.37, 0); collar.rotation.x = Math.PI / 2;
    if (L.scarf) {
      const sm = toon(L.scarf);
      const sc = part(new THREE.TorusGeometry(0.125, 0.045, 8, 18), sm, this.torso, 0, 0.385, 0); sc.rotation.x = Math.PI / 2;
      const tail = part(new THREE.BoxGeometry(0.07, 0.2, 0.03), sm, this.torso, 0.07, 0.29, -0.17); tail.rotation.set(0.35, 0, -0.2);
    }

    // แขน (หมุนจากไหล่)
    this.arms = [-1, 1].map((side) => {
      const sh = new THREE.Group(); sh.position.set(side * 0.19, 0.33, 0); this.torso.add(sh);
      const a = part(new THREE.CylinderGeometry(0.05, 0.044, 0.25, 10), dark, sh, side * 0.02, -0.12, 0);
      a.rotation.z = side * 0.12;
      const cuff = part(new THREE.CylinderGeometry(0.048, 0.048, 0.035, 10), trim, sh, side * 0.033, -0.235, 0); cuff.rotation.z = side * 0.12;
      part(new THREE.SphereGeometry(0.052, 12, 10), skin, sh, side * 0.036, -0.275, 0);
      return sh;
    });

    // หัว + ใบหน้า
    this.head = new THREE.Group(); this.head.position.y = 0.5; this.torso.add(this.head);
    part(new THREE.SphereGeometry(0.26, 28, 20), skin, this.head, 0, 0.2, 0);
    const ears = [-1, 1].map((sx) => { const e = part(new THREE.SphereGeometry(0.045, 10, 8), skin, this.head, sx * 0.255, 0.18, 0.0); e.scale.set(0.5, 1, 0.8); return e; });
    const faceGeo = new THREE.SphereGeometry(0.2625, 26, 14, Math.PI * 0.22, Math.PI * 0.56, Math.PI * 0.33, Math.PI * 0.4);
    const faceOpts = { brow: L.hair, small: L.scale && L.scale < 0.9 };
    this.faceOpen = faceMaterial(L.eye, false, faceOpts);
    this.faceClosed = faceMaterial(L.eye, true, faceOpts);
    this.face = part(faceGeo, this.faceOpen, this.head, 0, 0.2, 0);
    this.face.castShadow = false; this.face.renderOrder = 2; this.face.userData.keep = true;

    // ผม: หมวกผม + ผมหลัง + หน้าม้าเป็นช่อ ๆ
    const cap = part(new THREE.SphereGeometry(0.282, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, this.head, 0, 0.212, -0.012);
    cap.rotation.x = -0.24; cap.scale.set(1.03, 1, 1.04);
    const back = part(new THREE.SphereGeometry(0.288, 22, 14, Math.PI, Math.PI, Math.PI * 0.2, Math.PI * 0.56), hair, this.head, 0, 0.2, -0.012);
    back.scale.set(1.02, 1.04, 1.04);
    const geos = [];
    const bangs = [[-0.95, 0.17, 0.068], [-0.55, 0.19, 0.072], [-0.18, 0.16, 0.07], [0.18, 0.18, 0.07], [0.55, 0.19, 0.072], [0.95, 0.17, 0.068]];
    for (const [a, len, rad] of bangs) {
      const { p, n, down } = onHead(a, 0.98, 0.27);
      const dir = down.clone().add(n.clone().multiplyScalar(0.28)).normalize();
      geos.push(strand(p.sub(n.clone().multiplyScalar(0.025)), dir, n, len, rad));
    }
    for (const sx of [-1, 1]) {              // จอนผมข้างแก้ม
      const { p, n, down } = onHead(sx * 1.28, 0.55, 0.27);
      const dir = down.clone().add(n.clone().multiplyScalar(0.08)).normalize();
      geos.push(strand(p.sub(n.clone().multiplyScalar(0.02)), dir, n, 0.27, 0.06, 0.5));
    }
    if (L.hairStyle === 'spiky') {
      const spikes = [[Math.PI, 0.95, 0.17], [Math.PI - 0.75, 0.85, 0.16], [Math.PI + 0.75, 0.85, 0.16], [2.1, 0.45, 0.15], [-2.1, 0.45, 0.15], [Math.PI, 0.45, 0.16], [Math.PI - 0.4, 1.2, 0.13], [Math.PI + 0.4, 1.2, 0.13]];
      for (const [a, e, len] of spikes) {
        if (L.hatTight && e > 0.7) continue;     // หมวกแฟชั่นคลุมหัว: ซ่อนผมชี้ด้านบนไม่ให้ทะลุหมวก
        const { p, n } = onHead(a, e, 0.27);
        const dir = n.clone().add(new THREE.Vector3(0, 0.12, 0)).add(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.45)).normalize();
        geos.push(strand(p.sub(n.clone().multiplyScalar(0.04)), dir, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), len, 0.075, 0.6));
      }
    }
    if (L.hairStyle !== 'none' && L.accessory !== 'guard' && L.accessory !== 'hat' && !L.hideAhoge) {
      // ผมชี้เด้งบนหัว (อาโฮเกะ)
      const { p, n } = onHead(0.2, 1.35, 0.27);
      const dir = new THREE.Vector3(0.1, 0.8, 0.6).normalize();
      geos.push(strand(p, dir, n, 0.17, 0.03, 0.4));
    }
    for (const g of geos) part(g, hair, this.head);
    if (L.hairStyle === 'ponytail') {
      const tail = part(new THREE.ConeGeometry(0.1, 0.36, 10).translate(0, -0.15, 0), hair, this.head, 0, 0.33, -0.27);
      tail.rotation.x = 0.55; tail.userData.keep = true;
      addOutline(tail);
      part(new THREE.TorusGeometry(0.05, 0.022, 6, 12), toon(L.accessory === 'ribbon' ? '#ffd34d' : '#c94a3a'), this.head, 0, 0.33, -0.27).rotation.x = 1.2;
      this.tail = tail;
    }

    // อุปกรณ์เสริม
    const acc = L.accessory;
    if (acc === 'backpack') {
      part(new THREE.BoxGeometry(0.24, 0.26, 0.12), toon('#9a6a3a'), this.torso, 0, 0.2, -0.22);
      part(new THREE.BoxGeometry(0.26, 0.07, 0.13), toon('#7a4c26'), this.torso, 0, 0.3, -0.22);
      const roll = part(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 12), toon('#d8c49a'), this.torso, 0, 0.37, -0.22); roll.rotation.z = Math.PI / 2;
    } else if (acc === 'ribbon') {
      for (const sx of [-1, 1]) {
        const rb = part(new THREE.SphereGeometry(0.065, 12, 8), toon('#ffd34d'), this.head, sx * 0.07, 0.42, -0.2);
        rb.scale.set(1.3, 0.8, 0.5);
      }
    } else if (acc === 'hat') {
      const hc = toon('#8a5a32'), band = toon('#c94a3a');
      part(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 28), hc, this.head, 0, 0.37, 0);
      part(new THREE.CylinderGeometry(0.19, 0.23, 0.2, 22), hc, this.head, 0, 0.48, 0);
      part(new THREE.CylinderGeometry(0.232, 0.232, 0.045, 22), band, this.head, 0, 0.405, 0);
    } else if (acc === 'guard') {
      const steel = toon('#c3c9d3', { emissive: '#101418' });
      const helm = part(new THREE.SphereGeometry(0.295, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), steel, this.head, 0, 0.22, 0);
      helm.scale.set(1, 1.05, 1);
      part(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 22), steel, this.head, 0, 0.23, 0);
      part(new THREE.ConeGeometry(0.045, 0.18, 8), toon('#d8433a'), this.head, 0, 0.57, 0);
      const spear = new THREE.Group(); spear.position.set(0.04, -0.27, 0.05); this.arms[1].add(spear);
      part(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 6), toon('#7a5232'), spear, 0, 0.45, 0);
      part(new THREE.ConeGeometry(0.048, 0.2, 6), toon('#e2e6ec', { emissive: '#202428' }), spear, 0, 1.29, 0);
      bake(spear);
      this.arms[1].userData.holding = true;
      for (const arm of this.arms) part(new THREE.SphereGeometry(0.078, 12, 8), steel, arm, 0, 0.0, 0);
    } else if (acc === 'smith') {
      // ช่างตีเหล็ก: ผ้ากันเปื้อนหนัง + ค้อนในมือ
      const leather = toon('#5a3a26');
      const apron = part(new THREE.CylinderGeometry(0.158, 0.222, 0.36, 18, 1, true, -0.95, 1.9), toon('#5a3a26', { side: THREE.DoubleSide }), this.torso, 0, 0.17, 0.006);
      apron.userData.noOutline = true;
      part(new THREE.BoxGeometry(0.1, 0.07, 0.02), toon('#8a6a4a'), this.torso, 0, 0.12, 0.215);
      const hm = new THREE.Group(); hm.position.set(-0.036, -0.275, 0.02); hm.rotation.x = 0.35; this.arms[0].add(hm);
      const handle = part(new THREE.CylinderGeometry(0.018, 0.02, 0.34, 8), toon('#7a5232'), hm, 0, 0, 0.1); handle.rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.16, 0.085, 0.09), toon('#5c616c', { emissive: '#0c0e12' }), hm, 0, 0, 0.27);
      bake(hm);
      this.arms[0].userData.holding = true;
      for (const arm of this.arms) part(new THREE.CylinderGeometry(0.056, 0.056, 0.07, 10), leather, arm, arm === this.arms[0] ? -0.03 : 0.03, -0.2, 0);
    } else if (acc === 'wizard') {
      // นักเวทย์วาร์ป: หมวกปลายแหลม + ไม้เท้าลูกแก้ว
      const hc = toon(L.hatColor || '#4a3a8a'), trimC = toon('#e8c050', { emissive: '#2a1e00' });
      part(new THREE.CylinderGeometry(0.42, 0.42, 0.025, 30), hc, this.head, 0, 0.37, 0);
      const cone = part(new THREE.ConeGeometry(0.22, 0.5, 22, 3), hc, this.head, 0, 0.62, -0.03); cone.rotation.x = -0.22;
      part(new THREE.CylinderGeometry(0.228, 0.228, 0.05, 22), trimC, this.head, 0, 0.4, 0);
      part(new THREE.OctahedronGeometry(0.05, 0), trimC, this.head, 0.12, 0.62, 0.16);
      const st = new THREE.Group(); st.position.set(0.04, -0.27, 0.05); this.arms[1].add(st);
      part(new THREE.CylinderGeometry(0.02, 0.024, 1.25, 7), toon('#6a4428'), st, 0, 0.35, 0);
      part(new THREE.TorusGeometry(0.075, 0.016, 6, 14), trimC, st, 0, 1.0, 0);
      const orb = part(new THREE.SphereGeometry(0.07, 16, 12), toon(L.orbColor || '#7fe0ff', { emissive: L.orbColor || '#7fe0ff', emissiveIntensity: 1.4 }), st, 0, 1.0, 0);
      orb.userData.noOutline = true;
      bake(st);
      this.arms[1].userData.holding = true;
    } else if (acc === 'clerk') {
      // ผู้ดูแลคลัง: หมวกเบเรต์ + สมุดบัญชี
      const bc = toon(L.hatColor || '#2f6a5a');
      const beret = part(new THREE.SphereGeometry(0.27, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), bc, this.head, -0.03, 0.27, -0.02);
      beret.scale.set(1.12, 0.62, 1.12); beret.rotation.z = 0.18;
      part(new THREE.SphereGeometry(0.03, 8, 6), bc, this.head, -0.02, 0.45, 0);
      const bk = new THREE.Group(); bk.position.set(0.05, -0.25, 0.1); bk.rotation.set(-0.5, 0.3, 0); this.arms[1].add(bk);
      part(new THREE.BoxGeometry(0.17, 0.22, 0.045), toon('#8a3b3b'), bk, 0, 0, 0);
      part(new THREE.BoxGeometry(0.155, 0.205, 0.035), toon('#f2ead6'), bk, 0.012, 0, 0);
      part(new THREE.BoxGeometry(0.03, 0.03, 0.05), toon('#e8c050'), bk, -0.06, 0.06, 0.005);
      bake(bk);
      this.arms[1].userData.holding = true;
    }

    if (acc === 'quiver') {
      // กระบอกลูกธนูสะพายหลัง
      const q = new THREE.Group(); q.position.set(0.08, 0.22, -0.2); q.rotation.set(0.25, 0, -0.45); this.torso.add(q);
      part(new THREE.CylinderGeometry(0.065, 0.055, 0.34, 12), toon('#7a4c26'), q, 0, 0, 0);
      part(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 12), toon('#c9a24a'), q, 0, 0.16, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        part(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), toon('#d8c49a'), q, Math.cos(a) * 0.03, 0.24, Math.sin(a) * 0.03);
        const f = part(new THREE.BoxGeometry(0.03, 0.06, 0.006), toon(i === 1 ? '#f2ece0' : '#d8433a'), q, Math.cos(a) * 0.03, 0.31, Math.sin(a) * 0.03); f.rotation.y = a;
      }
      bake(q);
    }

    /* ---------- ชุดประจำอาชีพ (v0.6) ---------- */
    const gear = L.jobGear;
    if (gear === 'swordsman') {
      // เกราะไหล่ + เกราะอก
      const steel = toon('#c3c9d3', { emissive: '#101418' }), gold = toon('#e8c050', { emissive: '#2a1e00' });
      for (const arm of this.arms) {
        const side = arm === this.arms[0] ? -1 : 1;
        const pd = part(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), steel, arm, side * 0.02, 0.01, 0); pd.scale.set(1.15, 0.85, 1.1); pd.rotation.z = side * -0.35;
        const rim = part(new THREE.TorusGeometry(0.083, 0.012, 6, 16), gold, arm, side * 0.025, -0.02, 0); rim.rotation.x = Math.PI / 2; rim.rotation.y = side * 0.35;
      }
      const plate = part(new THREE.CylinderGeometry(0.162, 0.2, 0.26, 18, 1, true, -1.1, 2.2), toon('#c3c9d3', { emissive: '#101418', side: THREE.DoubleSide }), this.torso, 0, 0.24, 0.008);
      plate.userData.noOutline = true;
      part(new THREE.BoxGeometry(0.05, 0.05, 0.02), gold, this.torso, 0, 0.27, 0.19);
    } else if (gear === 'mage') {
      // เสื้อคลุมยาว + ผ้าคลุมไหล่ + มงกุฎผลึก (hideJobHat = สวมหมวกแฟชั่นทับ)
      const robe = toon(L.tunic, { side: THREE.DoubleSide });
      const skirt = part(new THREE.CylinderGeometry(0.212, 0.27, 0.24, 20, 1, true), robe, this.torso, 0, -0.1, 0); skirt.userData.noOutline = true;
      part(new THREE.TorusGeometry(0.27, 0.016, 6, 24), toon('#e8c050'), this.torso, 0, -0.22, 0).rotation.x = Math.PI / 2;
      const mantle = part(new THREE.CylinderGeometry(0.13, 0.26, 0.2, 20, 1, true), toon(shadeHex(L.tunic, -0.25), { side: THREE.DoubleSide }), this.torso, 0, 0.32, -0.005);
      mantle.userData.noOutline = true;
      if (!L.hideJobHat) {
        const circ = part(new THREE.TorusGeometry(0.268, 0.014, 6, 28), toon('#e8c050', { emissive: '#2a1e00' }), this.head, 0, 0.3, 0.0); circ.rotation.x = Math.PI / 2 - 0.3;
        part(new THREE.OctahedronGeometry(0.035, 0), toon('#9ae8ff', { emissive: '#4ac8ff', emissiveIntensity: 1.2 }), this.head, 0, 0.36, 0.25);
      }
    } else if (gear === 'archer') {
      // หมวกขนนก + ปลอกแขน
      // หมวกนักล่าทรงกรวยพับไปด้านหลัง
      const capM = toon('#3f6a32');
      if (!L.hideJobHat) {
      const cap = part(new THREE.ConeGeometry(0.255, 0.36, 22, 1, true), toon('#3f6a32', { side: THREE.DoubleSide }), this.head, 0, 0.47, -0.07);
      cap.rotation.x = -0.6; cap.scale.set(1.08, 1, 1.18);
      const band = part(new THREE.TorusGeometry(0.262, 0.03, 6, 24), capM, this.head, 0, 0.36, -0.01); band.rotation.x = Math.PI / 2 - 0.22;
      const feather = part(new THREE.ConeGeometry(0.035, 0.38, 6), toon('#d8433a'), this.head, 0.21, 0.47, -0.1); feather.rotation.set(-1.0, 0, -0.45); feather.scale.z = 0.35;
      }
      part(new THREE.CylinderGeometry(0.055, 0.052, 0.09, 10), toon('#7a4c26'), this.arms[1], 0.03, -0.19, 0);
    } else if (gear === 'acolyte') {
      // ชุดนักบวชยาว + ผ้าสโตล + จี้รูปดาว
      const robe = toon(L.tunic, { side: THREE.DoubleSide });
      const skirt = part(new THREE.CylinderGeometry(0.212, 0.28, 0.26, 20, 1, true), robe, this.torso, 0, -0.11, 0); skirt.userData.noOutline = true;
      const stole = toon(L.scarf || '#c94a3a');
      for (const sx of [-1, 1]) { const st = part(new THREE.BoxGeometry(0.045, 0.5, 0.012), stole, this.torso, sx * 0.07, 0.1, 0.205); st.rotation.x = -0.12; }
      const gold = toon('#e8c050', { emissive: '#2a1e00' });
      part(new THREE.BoxGeometry(0.022, 0.09, 0.015), gold, this.torso, 0, 0.27, 0.215);
      part(new THREE.BoxGeometry(0.07, 0.022, 0.015), gold, this.torso, 0, 0.29, 0.215);
    }

    // อาวุธ (มือขวาของตัวละคร = arms[0])
    if (L.weapon === 'knife') {
      const hand = new THREE.Group(); hand.position.set(-0.036, -0.275, 0.02); this.arms[0].add(hand);
      const steel = toon('#e4e8ee', { emissive: '#1a1e24' });
      const blade = part(new THREE.BoxGeometry(0.022, 0.065, 0.27), steel, hand, 0, 0, 0.17); blade.castShadow = false;
      const tip = part(new THREE.ConeGeometry(0.033, 0.07, 4), steel, hand, 0, 0, 0.34); tip.rotation.x = Math.PI / 2;
      part(new THREE.BoxGeometry(0.14, 0.028, 0.035), toon('#d8ad4a'), hand, 0, 0, 0.035);
      const grip = part(new THREE.CylinderGeometry(0.019, 0.019, 0.1, 8), toon('#5e3f27'), hand, 0, 0, -0.03); grip.rotation.x = Math.PI / 2;
      bake(hand);
    }

    if (L.weapon === 'sword') {
      const hand = new THREE.Group(); hand.position.set(-0.036, -0.275, 0.02); hand.rotation.x = 0.55; this.arms[0].add(hand);
      const steel = toon('#e6eaf2', { emissive: '#1a2030' });
      part(new THREE.BoxGeometry(0.03, 0.075, 0.56), steel, hand, 0, 0, 0.37);
      const tip = part(new THREE.ConeGeometry(0.045, 0.12, 4), steel, hand, 0, 0, 0.71); tip.rotation.x = Math.PI / 2; tip.scale.set(1, 1, 0.45);
      const glow = part(new THREE.BoxGeometry(0.008, 0.02, 0.52), toon(L.bladeGlow || '#9ad8ff', { emissive: L.bladeGlow || '#9ad8ff', emissiveIntensity: 1.3 }), hand, 0.017, 0, 0.37);
      glow.userData.noOutline = true;
      part(new THREE.BoxGeometry(0.2, 0.035, 0.045), toon('#3a3442'), hand, 0, 0, 0.07);
      for (const sx of [-1, 1]) part(new THREE.SphereGeometry(0.025, 8, 6), toon('#d8ad4a'), hand, sx * 0.1, 0, 0.07);
      const grip = part(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 8), toon('#3a2418'), hand, 0, 0, -0.01); grip.rotation.x = Math.PI / 2;
      part(new THREE.SphereGeometry(0.03, 10, 8), toon('#d8ad4a'), hand, 0, 0, -0.085);
      bake(hand);
    }

    if (L.weapon === 'staff') {
      // ไม้เท้า: ถือตั้งในมือขวา ปลายมีผลึกเรืองแสง
      const st = new THREE.Group(); st.position.set(-0.05, -0.27, 0.04); st.rotation.set(-0.05, 0, 0.3); this.arms[0].add(st);
      part(new THREE.CylinderGeometry(0.018, 0.022, 1.15, 7), toon('#7a5232'), st, 0, 0.3, 0);
      part(new THREE.TorusGeometry(0.06, 0.014, 6, 14), toon('#d8ad4a', { emissive: '#2a1e00' }), st, 0, 0.9, 0);
      const gem = part(new THREE.OctahedronGeometry(0.06, 0), toon(L.gem || '#7fe0ff', { emissive: L.gem || '#7fe0ff', emissiveIntensity: 1.3 }), st, 0, 0.92, 0);
      gem.scale.y = 1.4; gem.userData.noOutline = true;
      bake(st);
    }
    if (L.weapon === 'mace') {
      // คทาหัวหนาม
      const hand = new THREE.Group(); hand.position.set(-0.036, -0.275, 0.02); hand.rotation.x = 0.55; this.arms[0].add(hand);
      const grip = part(new THREE.CylinderGeometry(0.02, 0.022, 0.4, 8), toon('#5e3f27'), hand, 0, 0, 0.12); grip.rotation.x = Math.PI / 2;
      const brass = toon('#e8c050', { emissive: '#2a1e00' });
      part(new THREE.SphereGeometry(0.075, 12, 10), brass, hand, 0, 0, 0.36);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sp = part(new THREE.ConeGeometry(0.022, 0.06, 5), brass, hand, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.36);
        sp.rotation.z = a - Math.PI / 2;
      }
      part(new THREE.SphereGeometry(0.028, 8, 6), brass, hand, 0, 0, -0.08);
      bake(hand);
    }
    if (L.weapon === 'bow') {
      // ธนูถือมือซ้าย: คันโค้งไปด้านหน้า สายอยู่ฝั่งลำตัว
      const r = 0.34, half = 1.05;
      const bw = new THREE.Group(); bw.position.set(0.04, -0.27, 0.06); bw.rotation.y = -Math.PI / 2; this.arms[1].add(bw);
      const arc = part(new THREE.TorusGeometry(r, 0.02, 6, 20, half * 2), toon(L.bowColor || '#9b6b3e'), bw, -r, 0, 0); arc.rotation.z = -half;
      const chord = r - r * Math.cos(half);
      const str = part(new THREE.CylinderGeometry(0.004, 0.004, 2 * r * Math.sin(half), 4), toon('#f2ece0'), bw, -chord, 0, 0); str.userData.noOutline = true;
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8), toon('#5e3f27'), bw, 0, 0, 0);
      for (const sy of [-1, 1]) part(new THREE.SphereGeometry(0.022, 8, 6), toon('#d8ad4a'), bw, -chord, sy * r * Math.sin(half), 0);
      bake(bw);
      this.arms[1].userData.holding = true;
    }

    /* ---------- อุปกรณ์ที่มองเห็นได้ ---------- */
    if (L.shield) {
      // โล่กลมที่แขนซ้าย
      const sh = new THREE.Group(); sh.position.set(0.075, -0.17, 0.03); sh.rotation.set(0, Math.PI / 2 - 0.25, 0); this.arms[1].add(sh);
      const disc = part(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 22), toon(L.shield), sh, 0, 0, 0); disc.rotation.x = Math.PI / 2;
      const rim = part(new THREE.TorusGeometry(0.17, 0.018, 6, 22), toon('#8a8f9a', { emissive: '#101418' }), sh, 0, 0, 0);
      const boss = part(new THREE.SphereGeometry(0.045, 12, 8), toon('#b8bec8', { emissive: '#101418' }), sh, 0, 0, 0.02); boss.scale.z = 0.6;
      for (const a of [0, Math.PI / 2]) { const b = part(new THREE.BoxGeometry(0.32, 0.03, 0.01), toon('#6a4428'), sh, 0, 0, 0.02); b.rotation.z = a; }
      bake(sh);
    }
    if (L.headgear === 'bandana') {
      const c = toon(L.headColor || '#d8433a');
      const band = part(new THREE.TorusGeometry(0.272, 0.04, 8, 28), c, this.head, 0, 0.3, -0.01); band.rotation.x = Math.PI / 2 - 0.25; band.scale.set(1, 1, 0.9);
      part(new THREE.SphereGeometry(0.05, 10, 8), c, this.head, 0, 0.27, -0.29);
      for (const sx of [-1, 1]) { const t = part(new THREE.BoxGeometry(0.06, 0.16, 0.025), c, this.head, sx * 0.05, 0.19, -0.31); t.rotation.set(0.4, 0, sx * 0.4); }
    } else if (L.headgear === 'crown') {
      // มงกุฎกิ่งไม้ + ใบไม้เรืองแสง
      const wood = toon(L.headColor || '#6a4a2a'), leaf = toon('#7ae05a', { emissive: '#2a6a1a', emissiveIntensity: 0.6 });
      const ring = part(new THREE.TorusGeometry(0.27, 0.03, 6, 26), wood, this.head, 0, 0.33, -0.01); ring.rotation.x = Math.PI / 2 - 0.2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const tw = part(new THREE.ConeGeometry(0.03, 0.17, 5), wood, this.head, Math.sin(a) * 0.26, 0.42 + Math.cos(a) * 0.05, Math.cos(a) * 0.26 - 0.01);
        tw.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
        const lf = part(new THREE.SphereGeometry(0.045, 8, 6), leaf, this.head, Math.sin(a) * 0.29, 0.5 + Math.cos(a) * 0.05, Math.cos(a) * 0.29 - 0.01);
        lf.scale.set(1, 0.6, 1.4);
      }
    } else if (L.headgear === 'flower') {
      const fl = new THREE.Group(); fl.position.set(-0.22, 0.36, 0.08); fl.rotation.set(0.2, 0.6, 0.3); this.head.add(fl);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const pt = part(new THREE.SphereGeometry(0.045, 10, 8), toon(L.headColor || '#ff8fb8'), fl, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); pt.scale.z = 0.45;
      }
      part(new THREE.SphereGeometry(0.03, 8, 6), toon('#ffd34d'), fl, 0, 0, 0.015);
      bake(fl);
    }
    if (L.cape) {
      // ผ้าคลุมหลัง ปลิวตามการเดิน
      this.cape = new THREE.Group(); this.cape.position.set(0, 0.37, -0.03); this.torso.add(this.cape);
      const cp = part(new THREE.CylinderGeometry(0.17, 0.33, 0.55, 18, 3, true, Math.PI - 1.15, 2.3), toon(L.cape, { side: THREE.DoubleSide }), this.cape, 0, -0.27, -0.02);
      cp.userData.noOutline = true;
      bake(this.cape, { outline: false });
      const clasp = part(new THREE.TorusGeometry(0.14, 0.03, 8, 18), toon(L.cape), this.torso, 0, 0.385, 0); clasp.rotation.x = Math.PI / 2;
    }

    bake(this.torso);
    for (const arm of this.arms) bake(arm);
    bake(this.head);

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
    this.phase += dt * 10.5 * (0.35 + 0.65 * (entity.speedFactor || (entity.moving ? 1 : 0)));

    const swing = Math.sin(this.phase) * 0.75 * wb;
    this.legs[0].rotation.x = swing; this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.85;
    if (!this.arms[1].userData.holding) this.arms[1].rotation.x = swing * 0.85;
    else this.arms[1].rotation.x = swing * 0.25;
    this.arms[0].rotation.z = -0.08 - 0.04 * Math.sin(this.time * 2) * (1 - wb);
    this.arms[1].rotation.z = 0.08 + 0.04 * Math.sin(this.time * 2) * (1 - wb);

    const bob = Math.abs(Math.sin(this.phase)) * 0.045 * wb;
    const breathe = Math.sin(this.time * 2.2) * 0.008 * (1 - wb);
    this.body.position.y = bob;
    this.torso.scale.y = 1 + breathe;
    this.torso.rotation.x = 0.08 * wb;
    this.head.rotation.z = Math.sin(this.phase * 0.5) * 0.04 * wb;
    this.head.rotation.x = -0.06 * wb + Math.sin(this.time * 1.3) * 0.02 * (1 - wb);
    if (this.tail) this.tail.rotation.x = 0.55 + Math.sin(this.phase) * 0.15 * wb + Math.sin(this.time * 1.7) * 0.03;
    if (this.cape) this.cape.rotation.x = 0.06 + 0.42 * wb + Math.sin(this.time * 2.1) * 0.03 + Math.sin(this.phase * 2) * 0.05 * wb;

    // กะพริบตา
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) {
      this.face.material = this.faceClosed;
      if (this.blinkAt < -0.12) { this.face.material = this.faceOpen; this.blinkAt = 2 + Math.random() * 3.5; }
    }

    // ท่าร่ายเวทย์ค้างไว้ระหว่างร่าย
    const casting = (!!entity.cast || !!entity.castPose) && !entity.dead;   // castPose = ท่าค้างระหว่างเอฟเฟกต์สกิล
    if (casting && this.attackT <= 0) {
      const w = Math.sin(this.time * 6) * 0.08;
      this.arms[0].rotation.x = -1.35 + w; this.arms[1].rotation.x = -1.2 - w;
      this.arms[0].rotation.z = -0.25; this.arms[1].rotation.z = 0.25;
    }
    // ท่ายิงธนู: ยื่นแขนซ้ายถือคันธนู ดึงสายด้วยแขนขวา
    if (this.attackT > 0 && this.attackKind === 'shoot') {
      this.attackT = Math.max(0, this.attackT - dt);
      const p = 1 - this.attackT / 0.34, k = Math.sin(Math.min(1, p * 1.6) * Math.PI * 0.5);
      this.arms[1].rotation.x = -1.5 * k; this.arms[1].rotation.z = 0.1;
      this.arms[0].rotation.x = -1.3 * k * (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3);
      this.arms[0].rotation.z = -0.5 * k;
      this.torso.rotation.y = -0.45 * k;
    } else if (this.attackT > 0 && this.attackKind === 'cast') {
      // ปล่อยเวทย์: ยกแขนขึ้นแล้วผลักไปข้างหน้า
      this.attackT = Math.max(0, this.attackT - dt);
      const p = 1 - this.attackT / 0.34, k = Math.sin(p * Math.PI);
      this.arms[0].rotation.x = -1.4 - 0.9 * k; this.arms[1].rotation.x = -1.3 - 0.6 * k;
      this.arms[0].rotation.z = -0.3 * k; this.arms[1].rotation.z = 0.3 * k;
      this.torso.rotation.y *= 1 - damp(12, dt);
    } else
    // ท่าฟัน: เงื้อขึ้น แล้วฟันลงเฉียง
    if (this.attackT > 0) {
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

    // ตำแหน่งและการหันหน้าแบบนุ่มนวล
    this.root.position.set(entity.x / 16, entity.lift || 0, entity.y / 16);   // lift = กระโดด (สกิล)
    this.root.rotation.y = lerpAngle(this.root.rotation.y, entity.angle, damp(14, dt));
  }
}
