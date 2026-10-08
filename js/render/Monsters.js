// โมเดล 3 มิติของมอนสเตอร์ + ท่าทาง (กระโดด, เดินเตาะแตะ, บินโฉบ, โดนตี, ตาย, เกิดใหม่)
import { THREE } from './three.js';
import { lin, mergeGeometries } from './Geo.js';
import { toon, toonOwn, addOutline } from './Toon.js';
import { blobShadowTexture, shadeHex, glowTexture } from './Textures.js';
import { lerpAngle, damp } from '../core/util.js';

function add(parent, geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
  parent.add(m); return m;
}

const WHITE_C = new THREE.Color(1, 1, 1);   // v0.16: ไม่สร้างสีใหม่ทุกเฟรมตอนกระพริบ
const eyeMat = () => toon('#1c1424');
const shineMat = () => toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 });

// ตาคู่ (รวมเป็นชิ้นเดียวเพื่อลด draw call)
function eyes(parent, x, y, z, r = 0.05, gap = 0.1) {
  const e = [-1, 1].map((s) => new THREE.SphereGeometry(r, 12, 10).scale(0.8, 1.2, 0.55).translate(s * gap, y, z));
  add(parent, mergeGeometries(e), eyeMat(), x, 0, 0, false);
  const h = [-1, 1].map((s) => new THREE.SphereGeometry(r * 0.32, 8, 6).translate(s * gap + r * 0.3, y + r * 0.45, z + r * 0.45));
  add(parent, mergeGeometries(h), shineMat(), x, 0, 0, false);
}

export class MonsterView {
  constructor(mob) {
    this.mob = mob;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.flashMats = [];
    this.time = Math.random() * 10;
    this.phase = Math.random() * 10;
    this.hurtT = 0; this.attackT = 0; this.deadT = -1; this.spawnT = 0;
    const build = {
      bloblet: this.buildBloblet, capling: this.buildCapling, stinglet: this.buildStinglet,
      thornback: this.buildThornback, wisp: this.buildWisp, barkwolf: this.buildBarkwolf, gnarlroot: this.buildGnarlroot,
      // v0.11: ยอดเขาหิมะ + ภูเขาไฟ
      frostfox: this.buildFrostfox, frostbat: this.buildFrostbat, yeti: this.buildYeti, icegolem: this.buildIcegolem, glacia: this.buildGlacia,
      magmaslime: this.buildMagmaslime, emberimp: this.buildEmberimp, salamander: this.buildSalamander, obsidiangolem: this.buildObsidiangolem, ignarok: this.buildIgnarok,
    }[mob.data.model];
    build.call(this, mob.data);

    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.014; blob.renderOrder = 1;
    this.shadow = blob; this.root.add(blob);
    if (mob.data.radius) blob.scale.setScalar(mob.data.radius * 2.2);
    // เส้นขอบการ์ตูนให้ชิ้นหลัก
    const solid = [];
    this.body.traverse((o) => { if (o.isMesh && o.castShadow && !o.material.transparent) solid.push(o); });
    for (const o of solid) addOutline(o, 0.012);
  }

  // วัสดุเฉพาะตัว ใช้กระพริบขาวตอนโดนตี
  own(color, opts = {}) {
    const o = { ...opts }; delete o.roughness; delete o.metalness;
    const m = toonOwn(color, o);
    m.userData.baseEmissive = m.emissive.clone();
    this.flashMats.push(m);
    return m;
  }

  buildBloblet(d) {
    const g = this.jelly = new THREE.Group(); this.body.add(g);
    const mat = this.own(d.color, { transparent: true, opacity: 0.86, roughness: 0.12, emissive: lin(d.color).multiplyScalar(0.12) });
    const b = add(g, new THREE.SphereGeometry(0.34, 28, 20), mat, 0, 0.29, 0);
    b.scale.set(1, 0.86, 1);
    add(g, new THREE.IcosahedronGeometry(0.09, 1), toon('#fff3a0', { emissive: '#ffd34d', emissiveIntensity: 1.2 }), 0, 0.27, -0.02, false);
    const hl = add(g, new THREE.SphereGeometry(0.07, 12, 8), toon('#ffffff', { transparent: true, opacity: 0.75 }), -0.13, 0.48, 0.12, false);
    hl.scale.set(1.3, 0.6, 1);
    eyes(g, 0, 0.34, 0.27, 0.05, 0.1);
    const blush = [-1, 1].map((s) => new THREE.SphereGeometry(0.035, 10, 8).scale(1.4, 0.7, 0.4).translate(s * 0.18, 0.27, 0.25));
    add(g, mergeGeometries(blush), toon('#ff9ab0', { transparent: true, opacity: 0.6 }), 0, 0, 0, false);
  }

  buildCapling(d) {
    const g = this.shroom = new THREE.Group(); this.body.add(g);
    add(g, new THREE.CylinderGeometry(0.15, 0.19, 0.38, 16), toon('#f1e6cc'), 0, 0.26, 0);
    eyes(g, 0, 0.3, 0.155, 0.045, 0.075);
    const capMat = this.own(d.color, { roughness: 0.45 });
    const cap = add(g, new THREE.SphereGeometry(0.4, 26, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat, 0, 0.42, 0);
    cap.scale.set(1, 0.72, 1);
    const under = add(g, new THREE.CircleGeometry(0.4, 26), toon('#e8d6b0', { side: THREE.DoubleSide }), 0, 0.42, 0, false);
    under.rotation.x = Math.PI / 2;
    // จุดเรืองแสงบนหมวก
    const spots = [];
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3 + 0.4, el = i === 0 ? 1.45 : 0.55 + (i % 3) * 0.25;
      const sx = Math.cos(a) * Math.cos(el) * 0.4, sy = Math.sin(el) * 0.4 * 0.72, sz = Math.sin(a) * Math.cos(el) * 0.4;
      spots.push(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.5, 1).translate(sx, 0.42 + sy, sz));
    }
    add(g, mergeGeometries(spots), toon('#d8f8ff', { emissive: '#7fe0ff', emissiveIntensity: 0.9 }), 0, 0, 0, false);
    this.feet = [-1, 1].map((s) => {
      const f = add(this.body, new THREE.SphereGeometry(0.075, 12, 8), toon('#7a5232'), s * 0.1, 0.05, 0.03);
      f.scale.set(1, 0.7, 1.3); return f;
    });
  }

  buildStinglet(d) {
    const g = this.bee = new THREE.Group(); g.position.y = 0.85; this.body.add(g);
    const bodyMat = this.own(d.color, { roughness: 0.55 });
    const ab = add(g, new THREE.SphereGeometry(0.2, 22, 16), bodyMat, 0, 0, -0.13);
    ab.scale.set(1, 0.95, 1.35);
    const stripe = toon('#3a2a1a');
    for (const [z, r] of [[-0.07, 0.196], [-0.21, 0.183]]) add(g, new THREE.TorusGeometry(r, 0.035, 8, 22), stripe, 0, 0, z);
    add(g, new THREE.SphereGeometry(0.15, 18, 14), toon('#4a3424'), 0, 0.03, 0.12);
    const eyeG = [-1, 1].map((s) => new THREE.SphereGeometry(0.065, 12, 10).translate(s * 0.085, 0.06, 0.22));
    add(g, mergeGeometries(eyeG), toon('#6a1428'), 0, 0, 0, false);
    const ant = [];
    for (const s of [-1, 1]) {
      ant.push(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5).rotateX(-0.6).rotateZ(s * 0.35).translate(s * 0.06, 0.22, 0.2));
      ant.push(new THREE.SphereGeometry(0.025, 8, 6).translate(s * 0.095, 0.3, 0.27));
    }
    add(g, mergeGeometries(ant), stripe, 0, 0, 0, false);
    const st = add(g, new THREE.ConeGeometry(0.04, 0.16, 8), toon('#e8e2d8'), 0, -0.02, -0.5, false);
    st.rotation.x = -Math.PI / 2;
    const wingMat = toon('#e6f4ff', { transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.wings = [-1, 1].map((s) => {
      const w = add(g, new THREE.PlaneGeometry(0.46, 0.22).translate(s * 0.23, 0, 0).rotateX(-Math.PI / 2), wingMat, s * 0.06, 0.15, -0.02, false);
      return w;
    });
  }

  /* ---------- Whisperwood Forest (v0.7) ---------- */

  // ธอร์นแบ็ก: เม่นหลังหนามเดินต้วมเตี้ยม
  buildThornback(d) {
    const g = this.hog = new THREE.Group(); this.body.add(g);
    const belly = this.own('#d8b88a', { roughness: 0.7 }), back = this.own(d.color, { roughness: 0.8 });
    const b = add(g, new THREE.SphereGeometry(0.34, 24, 16), belly, 0, 0.3, 0.02); b.scale.set(1, 0.82, 1.15);
    const shell = add(g, new THREE.SphereGeometry(0.39, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), back, 0, 0.3, -0.06);
    shell.scale.set(1.04, 0.98, 1.16); shell.rotation.x = -0.4;
    // หนามบนหลัง (รวมเป็นชิ้นเดียว)
    const spikes = [], up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    for (let i = 0; i < 56; i++) {
      const a = (i * 2.399) % (Math.PI * 2), e = 0.15 + ((i * 0.618) % 1) * 1.3;
      const n = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
      n.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.4);
      if (n.z > 0.35 && n.y < 0.75) continue;          // เว้นหน้าไว้
      const len = 0.24 + ((i * 0.37) % 1) * 0.12;
      const geo = new THREE.ConeGeometry(0.04, len, 5).translate(0, len / 2 - 0.04, 0);
      q.setFromUnitVectors(up, n); geo.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
      geo.translate(n.x * 0.38, 0.3 + n.y * 0.36, -0.06 + n.z * 0.42);
      spikes.push(geo);
    }
    add(g, mergeGeometries(spikes), toon('#5a4a24'), 0, 0, 0);
    const snout = add(g, new THREE.SphereGeometry(0.12, 14, 10), belly, 0, 0.27, 0.36); snout.scale.set(1, 0.85, 1.25);
    add(g, new THREE.SphereGeometry(0.045, 10, 8), toon('#2a1a1a'), 0, 0.29, 0.5, false);
    eyes(g, 0, 0.4, 0.3, 0.042, 0.12);
    const blush = [-1, 1].map((sx) => new THREE.SphereGeometry(0.03, 8, 6).scale(1.4, 0.7, 0.4).translate(sx * 0.17, 0.33, 0.3));
    add(g, mergeGeometries(blush), toon('#ff9ab0', { transparent: true, opacity: 0.6 }), 0, 0, 0, false);
    this.feet = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const f = add(this.body, new THREE.SphereGeometry(0.07, 10, 8), toon('#6a4a2a'), sx * 0.17, 0.05, sz * 0.17);
      f.scale.set(1, 0.7, 1.3); return f;
    });
  }

  // วิสป์: ดวงไฟภูตลอยได้ มีหางเปลวไฟ
  buildWisp(d) {
    const g = this.wisp = new THREE.Group(); g.position.y = 0.85; this.body.add(g);
    const c = d.color;
    add(g, new THREE.SphereGeometry(0.2, 22, 16), this.own(c, { emissive: lin(c).multiplyScalar(0.9), transparent: true, opacity: 0.88 }), 0, 0, 0, false);
    add(g, new THREE.SphereGeometry(0.11, 14, 10), toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 1 }), 0, 0.01, 0.02, false);
    const tail = this.wtail = add(g, new THREE.ConeGeometry(0.16, 0.38, 14, 1, true).translate(0, 0.19, 0), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), 0, 0.06, -0.08, false);
    tail.rotation.x = -1.0;
    eyes(g, 0, 0.03, 0.17, 0.035, 0.07);
    const glow = this.wglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: c, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1.5, 1.5, 1); g.add(glow);
    this.sparks = [0, 1, 2].map((i) => add(g, new THREE.SphereGeometry(0.03, 8, 6), toon('#ffffff', { emissive: c, emissiveIntensity: 1.4 }), 0, 0, 0, false));
  }

  // บาร์กวูล์ฟ: หมาป่าเปลือกไม้ หลังมีมอส ตาเรืองเขียว
  buildBarkwolf(d) {
    const g = this.wolf = new THREE.Group(); this.body.add(g);
    const bark = this.own(d.color, { roughness: 0.85 }), dark = toon(shadeHex(d.color, -0.35)), moss = toon('#5a8a3a');
    const torso = add(g, new THREE.SphereGeometry(0.3, 20, 14), bark, 0, 0.55, -0.05); torso.scale.set(0.78, 0.72, 1.45);
    add(g, new THREE.SphereGeometry(0.25, 18, 12), bark, 0, 0.62, 0.27);
    for (const [z, sc] of [[-0.25, 0.9], [0.0, 1.1], [0.25, 0.85]]) { const m = add(g, new THREE.SphereGeometry(0.12 * sc, 10, 8), moss, 0, 0.78, z); m.scale.set(1.3, 0.45, 1.2); }
    const ridges = [];
    for (let i = 0; i < 5; i++) ridges.push(new THREE.BoxGeometry(0.05, 0.08, 0.1).translate(0, 0.8, -0.38 + i * 0.16));
    add(g, mergeGeometries(ridges), dark, 0, 0, 0);
    const head = this.whead = new THREE.Group(); head.position.set(0, 0.74, 0.44); g.add(head);
    const skull = add(head, new THREE.SphereGeometry(0.19, 18, 14), bark, 0, 0, 0); skull.scale.set(1, 0.92, 1.1);
    const snout = add(head, new THREE.CylinderGeometry(0.07, 0.1, 0.24, 10), bark, 0, -0.05, 0.2); snout.rotation.x = Math.PI / 2;
    add(head, new THREE.SphereGeometry(0.045, 10, 8), toon('#1c1424'), 0, -0.02, 0.33, false);
    const ears = [-1, 1].map((sx) => new THREE.ConeGeometry(0.06, 0.16, 6).rotateZ(sx * -0.25).translate(sx * 0.11, 0.18, -0.03));
    add(head, mergeGeometries(ears), dark, 0, 0, 0);
    const ey = [-1, 1].map((sx) => new THREE.SphereGeometry(0.035, 10, 8).scale(1, 0.7, 0.6).translate(sx * 0.085, 0.04, 0.155));
    add(head, mergeGeometries(ey), toon('#c8ff6a', { emissive: '#9aff3a', emissiveIntensity: 1.5 }), 0, 0, 0, false);
    this.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.15, 0.5, sz * 0.28 - 0.02); g.add(hip);
      add(hip, new THREE.CylinderGeometry(0.06, 0.05, 0.42, 8), bark, 0, -0.21, 0);
      const paw = add(hip, new THREE.SphereGeometry(0.065, 10, 8), dark, 0, -0.44, 0.02); paw.scale.set(1, 0.6, 1.3);
      return hip;
    });
    const tail = this.wtailWolf = new THREE.Group(); tail.position.set(0, 0.64, -0.46); g.add(tail);
    const tc = add(tail, new THREE.ConeGeometry(0.08, 0.42, 8).translate(0, 0.21, 0), bark, 0, 0, 0); tc.rotation.x = -2.2;
    add(tail, new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.25, -0.25), moss, 0, 0, 0);
  }

  // กนาร์ลรูท (MVP): ต้นไม้เฒ่าเดินได้ ตาเรืองแสง แขนเป็นกิ่งไม้
  buildGnarlroot(d) {
    const g = this.tree = new THREE.Group(); this.body.add(g);
    const bark = this.own(d.color, { roughness: 0.9 }), dark = toon(shadeHex(d.color, -0.4)), leaf = this.own('#4f8a3a', { roughness: 0.8 });
    const leafLight = toon('#6aa84a'), eyeMat = toon('#e8ff8a', { emissive: '#b8ff3a', emissiveIntensity: 1.8 });
    // ลำต้น
    const trunk = add(g, new THREE.CylinderGeometry(0.5, 0.78, 2.1, 14, 3), bark, 0, 1.15, 0);
    const ridges = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      ridges.push(new THREE.BoxGeometry(0.09, 1.7, 0.08).rotateZ(Math.sin(i * 1.7) * 0.08).rotateY(-a).translate(Math.sin(a) * 0.64, 1.1, Math.cos(a) * 0.64));
    }
    add(g, mergeGeometries(ridges), dark, 0, 0, 0);
    // หน้า: ตาเรืองแสง คิ้วขมวด ปากเป็นโพรง
    add(g, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.11, 12, 10).scale(1.2, 0.75, 0.5).translate(sx * 0.21, 1.62, 0.55))), eyeMat, 0, 0, 0, false);
    add(g, mergeGeometries([-1, 1].map((sx) => new THREE.BoxGeometry(0.3, 0.07, 0.1).rotateZ(sx * 0.35).translate(sx * 0.21, 1.78, 0.56))), dark, 0, 0, 0);
    const mouth = add(g, new THREE.SphereGeometry(0.2, 14, 10), toon('#1c120c'), 0, 1.22, 0.6, false); mouth.scale.set(1.5, 0.75, 0.35);
    this.treeEyes = eyeMat;
    // รากเป็นขา
    this.roots = [0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rg = new THREE.Group(); rg.position.set(Math.sin(a) * 0.55, 0.25, Math.cos(a) * 0.55); rg.rotation.y = a; g.add(rg);
      const r = add(rg, new THREE.CylinderGeometry(0.16, 0.08, 0.8, 8).translate(0, -0.4, 0), bark, 0, 0, 0); r.rotation.x = 1.0;
      return rg;
    });
    // แขนกิ่งไม้
    this.tarms = [-1, 1].map((sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * 0.62, 1.85, 0.05); g.add(sh);
      const up = add(sh, new THREE.CylinderGeometry(0.14, 0.11, 0.8, 8).translate(0, -0.4, 0), bark, 0, 0, 0); up.rotation.z = sx * 0.55;
      const fore = new THREE.Group(); fore.position.set(sx * 0.42, -0.66, 0); sh.add(fore);
      add(fore, new THREE.CylinderGeometry(0.1, 0.07, 0.75, 8).translate(0, -0.37, 0), bark, 0, 0, 0).rotation.z = sx * 0.1;
      const claws = [-1, 0, 1].map((k) => new THREE.ConeGeometry(0.04, 0.22, 5).rotateX(Math.PI).translate(k * 0.06, -0.82, k === 0 ? 0.06 : 0));
      add(fore, mergeGeometries(claws), dark, 0, 0, 0);
      const twig = add(sh, new THREE.CylinderGeometry(0.03, 0.05, 0.45, 6).translate(0, 0.22, 0), bark, sx * 0.2, -0.15, 0); twig.rotation.z = sx * -0.6;
      add(sh, new THREE.IcosahedronGeometry(0.2, 0), leaf, sx * 0.42, 0.18, 0);
      return sh;
    });
    // พุ่มใบ
    const crown = this.canopy = new THREE.Group(); crown.position.y = 2.35; g.add(crown);
    for (const [x, y, z, r] of [[0, 0.55, 0, 0.75], [-0.55, 0.25, 0.1, 0.55], [0.58, 0.3, -0.05, 0.58], [0.1, 0.25, -0.5, 0.55], [-0.15, 0.3, 0.45, 0.5], [0.25, 0.95, 0.1, 0.45]]) {
      const m = add(crown, new THREE.IcosahedronGeometry(r, 1), leaf, x, y, z); m.rotation.set(x * 3, y * 2, z);
    }
    const fruit = [];
    for (let i = 0; i < 9; i++) { const a = i * 2.4, e = 0.2 + (i % 3) * 0.3; fruit.push(new THREE.SphereGeometry(0.06, 8, 6).translate(Math.cos(a) * 0.72 * Math.cos(e), 0.5 + Math.sin(e) * 0.6, Math.sin(a) * 0.72 * Math.cos(e))); }
    add(crown, mergeGeometries(fruit), toon('#ffe680', { emissive: '#ffcc33', emissiveIntensity: 1.2 }), 0, 0, 0, false);
    // เห็ดและมอสบนลำต้น
    for (const [x, y, z, r] of [[0.52, 0.7, 0.3, 0.12], [0.6, 0.55, 0.05, 0.09], [-0.5, 1.4, -0.3, 0.1]]) {
      const cap = add(g, new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#e85a4a'), x, y, z); cap.scale.y = 0.6;
    }
    for (const [x, y, z] of [[0.35, 2.05, 0.35], [-0.4, 2.0, 0.3], [0.0, 0.35, 0.72]]) { const m = add(g, new THREE.SphereGeometry(0.16, 10, 8), leafLight, x, y, z); m.scale.set(1.3, 0.5, 1); }
  }

  /* ================= v0.11: Frostveil Peaks ================= */

  // ฟรอสต์ฟ็อกซ์: จิ้งจอกหิมะขนฟู หางพวงใหญ่ ปลายหูฟ้า (ใช้ท่าเดินสี่ขาแบบหมาป่า)
  buildFrostfox(d) {
    const g = this.wolf = new THREE.Group(); this.body.add(g);
    const fur = this.own(d.color, { roughness: 0.9 }), tip = toon('#8ad0ff', { emissive: '#4ab0ff', emissiveIntensity: 0.4 }), cream = toon('#fff8ee');
    const torso = add(g, new THREE.SphereGeometry(0.26, 18, 12), fur, 0, 0.45, -0.04); torso.scale.set(0.8, 0.78, 1.4);
    add(g, new THREE.SphereGeometry(0.16, 14, 10), cream, 0, 0.42, 0.22).scale.set(1, 1, 0.8);
    const head = this.whead = new THREE.Group(); head.position.set(0, 0.62, 0.36); g.add(head);
    const skull = add(head, new THREE.SphereGeometry(0.17, 16, 12), fur, 0, 0, 0); skull.scale.set(1.05, 0.9, 1);
    const snout = add(head, new THREE.ConeGeometry(0.09, 0.22, 10), fur, 0, -0.03, 0.18); snout.rotation.x = Math.PI / 2;
    add(head, new THREE.SphereGeometry(0.035, 8, 6), toon('#1c1424'), 0, -0.03, 0.3, false);
    for (const sx of [-1, 1]) {
      const ear = add(head, new THREE.ConeGeometry(0.07, 0.2, 6), fur, sx * 0.1, 0.18, -0.02); ear.rotation.z = sx * -0.25;
      const et = add(head, new THREE.ConeGeometry(0.035, 0.08, 6), tip, sx * 0.13, 0.27, -0.02, false); et.rotation.z = sx * -0.25;
    }
    add(head, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.032, 10, 8).scale(1, 0.75, 0.6).translate(sx * 0.075, 0.03, 0.14))), toon('#6ad0ff', { emissive: '#3ab0ff', emissiveIntensity: 1.2 }), 0, 0, 0, false);
    this.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.12, 0.38, sz * 0.22 - 0.04); g.add(hip);
      add(hip, new THREE.CylinderGeometry(0.045, 0.04, 0.34, 8), fur, 0, -0.17, 0);
      add(hip, new THREE.SphereGeometry(0.05, 8, 6), tip, 0, -0.35, 0.02).scale.set(1, 0.6, 1.3);
      return hip;
    });
    const tail = this.wtailWolf = new THREE.Group(); tail.position.set(0, 0.5, -0.36); g.add(tail);
    const tb = add(tail, new THREE.SphereGeometry(0.14, 14, 10), fur, 0, 0.12, -0.2); tb.scale.set(0.9, 0.9, 2.0); tb.rotation.x = 0.5;
    add(tail, new THREE.SphereGeometry(0.08, 10, 8), tip, 0, 0.26, -0.44);
  }

  // ฟรอสต์แบท: ค้างคาวน้ำแข็ง ปีกผลึกใส บินโฉบ
  buildFrostbat(d) {
    const g = this.bat = new THREE.Group(); g.position.y = 1.0; g.scale.setScalar(1.6); this.body.add(g); this.flyer = true;
    const fur = this.own(d.color, { roughness: 0.7 });
    add(g, new THREE.SphereGeometry(0.17, 16, 12), fur, 0, 0, 0).scale.set(1, 1.1, 0.95);
    add(g, new THREE.SphereGeometry(0.13, 14, 10), fur, 0, 0.17, 0.05);
    for (const sx of [-1, 1]) { const ear = add(g, new THREE.ConeGeometry(0.05, 0.16, 6), fur, sx * 0.07, 0.31, 0.03); ear.rotation.z = sx * -0.3; }
    add(g, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.03, 8, 6).translate(sx * 0.05, 0.19, 0.16))), toon('#bff4ff', { emissive: '#6ad8ff', emissiveIntensity: 1.6 }), 0, 0, 0, false);
    add(g, mergeGeometries([-1, 1].map((sx) => new THREE.ConeGeometry(0.012, 0.05, 5).rotateX(Math.PI).translate(sx * 0.025, 0.11, 0.16))), toon('#ffffff'), 0, 0, 0, false);
    const wingMat = toon('#bfe8ff', { transparent: true, opacity: 0.72, side: THREE.DoubleSide, emissive: '#4ab0ff', emissiveIntensity: 0.35, depthWrite: false });
    const shape = new THREE.Shape(); shape.moveTo(0, 0.05); shape.lineTo(0.5, 0.18); shape.lineTo(0.42, 0.02); shape.lineTo(0.34, -0.08); shape.lineTo(0.24, 0.0); shape.lineTo(0.14, -0.1); shape.lineTo(0.05, -0.06); shape.closePath();
    this.batWings = [-1, 1].map((sx) => {
      const pv = new THREE.Group(); pv.position.set(sx * 0.12, 0.05, -0.02); g.add(pv);
      const w = add(pv, new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2 + 0.2), wingMat, 0, 0, 0, false); w.scale.x = sx;
      return pv;
    });
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#8ad8ff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.set(1.0, 1.0, 1); g.add(this.glowSprite);
  }

  // โครงร่างยักษ์สองขา (ใช้ท่าทางเดียวกับกนาร์ลรูท: ก้าวขา แกว่งแขน ทุบพื้น)
  titanRig(mat, { legR = 0.13, legH = 0.6, hipX = 0.2, hipY = 0.62, armR = 0.12, armL = 0.75, shX = 0.42, shY = 1.35, head = null }) {
    const g = this.tree = new THREE.Group(); this.body.add(g);
    this.roots = [-1, 1].map((sx) => {
      const hip = new THREE.Group(); hip.position.set(sx * hipX, hipY, 0); g.add(hip);
      add(hip, new THREE.CylinderGeometry(legR, legR * 0.85, legH, 10).translate(0, -legH / 2, 0), mat, 0, 0, 0);
      add(hip, new THREE.SphereGeometry(legR * 1.25, 10, 8), mat, 0, -legH, 0.04).scale.set(1, 0.6, 1.3);
      return hip;
    });
    this.tarms = [-1, 1].map((sx) => {
      const sh = new THREE.Group(); sh.position.set(sx * shX, shY, 0.02); g.add(sh);
      add(sh, new THREE.SphereGeometry(armR * 1.4, 12, 10), mat, 0, 0, 0);
      const arm = add(sh, new THREE.CylinderGeometry(armR, armR * 0.9, armL, 10).translate(0, -armL / 2, 0), mat, 0, 0, 0); arm.rotation.z = sx * 0.12;
      add(sh, new THREE.SphereGeometry(armR * 1.35, 12, 10), mat, sx * 0.09, -armL - 0.02, 0.02);
      return sh;
    });
    const hd = this.canopy = new THREE.Group(); hd.position.y = head || shY + 0.25; g.add(hd);
    return g;
  }

  // เยติ: ยักษ์ขนขาว หน้าสีฟ้าเทา
  buildYeti(d) {
    const fur = this.own(d.color, { roughness: 0.95 }), skin = toon('#8aa0b8');
    const g = this.titanRig(fur, { legR: 0.15, legH: 0.55, hipX: 0.22, hipY: 0.58, armR: 0.14, armL: 0.78, shX: 0.48, shY: 1.3, head: 1.55 });
    const torso = add(g, new THREE.SphereGeometry(0.5, 20, 14), fur, 0, 1.0, 0); torso.scale.set(1, 1.05, 0.85);
    const tufts = [];
    for (let i = 0; i < 16; i++) { const a = i * 2.4, y = 0.7 + (i % 5) * 0.14; tufts.push(new THREE.ConeGeometry(0.07, 0.18, 5).rotateZ(Math.PI / 2 + Math.sin(a) * 0.4).rotateY(a).translate(Math.cos(a) * 0.48, y, Math.sin(a) * 0.4)); }
    add(g, mergeGeometries(tufts), fur, 0, 0, 0);
    const hd = this.canopy;
    add(hd, new THREE.SphereGeometry(0.28, 16, 12), fur, 0, 0, 0);
    const face = add(hd, new THREE.SphereGeometry(0.2, 14, 10), skin, 0, -0.03, 0.12); face.scale.set(1, 0.9, 0.7);
    const eyeM = toon('#bff4ff', { emissive: '#6ad8ff', emissiveIntensity: 1.3 }); this.treeEyes = eyeM;
    add(hd, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.04, 10, 8).translate(sx * 0.08, 0.03, 0.25))), eyeM, 0, 0, 0, false);
    const mouth = add(hd, new THREE.SphereGeometry(0.07, 10, 8), toon('#2a1a24'), 0, -0.1, 0.24, false); mouth.scale.set(1.4, 0.6, 0.4);
    add(hd, mergeGeometries([-1, 1].map((sx) => new THREE.ConeGeometry(0.02, 0.06, 5).rotateX(Math.PI).translate(sx * 0.05, -0.08, 0.27))), toon('#ffffff'), 0, 0, 0, false);
    for (const sx of [-1, 1]) { const h = add(hd, new THREE.ConeGeometry(0.05, 0.22, 7), toon('#d8d0c0'), sx * 0.2, 0.2, -0.02); h.rotation.z = sx * -0.6; }
  }

  // ไอซ์โกเลม: ก้อนน้ำแข็งเหลี่ยม แกนเรืองแสงกลางอก
  buildIcegolem(d) {
    const ice = this.own(d.color, { roughness: 0.2, emissive: lin('#4ab0ff').multiplyScalar(0.12) });
    const g = this.titanRig(ice, { legR: 0.17, legH: 0.6, hipX: 0.25, hipY: 0.62, armR: 0.16, armL: 0.8, shX: 0.55, shY: 1.42, head: 1.78 });
    const torso = add(g, new THREE.DodecahedronGeometry(0.55, 0), ice, 0, 1.1, 0); torso.scale.set(1.05, 1.1, 0.85);
    const core = toon('#ffffff', { emissive: '#4ad8ff', emissiveIntensity: 2.0 }); this.treeEyes = core;
    add(g, new THREE.OctahedronGeometry(0.14, 0), core, 0, 1.15, 0.42, false);
    const spikes = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; spikes.push(new THREE.ConeGeometry(0.07, 0.38, 5).translate(0, 0.19, 0).rotateX(-0.5).rotateY(a).translate(Math.sin(a) * 0.3, 1.5, Math.cos(a) * 0.2 - 0.1)); }
    add(g, mergeGeometries(spikes), toon('#dff6ff', { emissive: '#6ad8ff', emissiveIntensity: 0.4 }), 0, 0, 0);
    const hd = this.canopy;
    add(hd, new THREE.DodecahedronGeometry(0.24, 0), ice, 0, 0, 0);
    add(hd, mergeGeometries([-1, 1].map((sx) => new THREE.BoxGeometry(0.09, 0.04, 0.04).translate(sx * 0.09, 0.02, 0.2))), core, 0, 0, 0, false);
  }

  // กลาเซีย (MVP): มังกรน้ำแข็งลำตัวยาวขดเป็นวง มงกุฎหนามผลึก ปีกน้ำแข็ง
  buildGlacia(d) {
    const g = this.wyrm = new THREE.Group(); this.body.add(g);
    const scale = this.own(d.color, { roughness: 0.25, emissive: lin('#4ab0ff').multiplyScalar(0.15) });
    const belly = toon('#f4fbff'), crystal = toon('#e8faff', { emissive: '#6ad8ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.9 });
    // ลำตัวขด
    this.coils = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 0.72, r = 1.15 - i * 0.05, sz = 0.42 - i * 0.03;
      const seg = add(g, new THREE.SphereGeometry(sz, 16, 12), scale, Math.cos(a) * r, sz * 0.85, Math.sin(a) * r - 0.4);
      seg.scale.set(1.2, 0.85, 1.2);
      if (i % 2 === 0) add(seg, new THREE.ConeGeometry(0.1, 0.32, 5), crystal, 0, sz * 0.9, 0, false);
      this.coils.push(seg);
    }
    // ช่วงคอยกตัวขึ้น
    const neck = this.wneck = new THREE.Group(); neck.position.set(0, 0.6, 0.55); g.add(neck);
    for (let i = 0; i < 4; i++) add(neck, new THREE.SphereGeometry(0.36 - i * 0.03, 14, 10), i % 2 ? belly : scale, 0, 0.35 + i * 0.42, -i * 0.05).scale.set(1.1, 1, 1);
    const head = this.whead = new THREE.Group(); head.position.set(0, 2.1, 0.2); neck.add(head);
    const skull = add(head, new THREE.SphereGeometry(0.42, 18, 12), scale, 0, 0, 0); skull.scale.set(1, 0.85, 1.25);
    const snout = add(head, new THREE.BoxGeometry(0.42, 0.24, 0.55), scale, 0, -0.08, 0.5);
    snout.geometry.translate(0, 0, 0);
    add(head, new THREE.BoxGeometry(0.36, 0.08, 0.45), belly, 0, -0.22, 0.45);
    const eyeM = toon('#ffffff', { emissive: '#7ff0ff', emissiveIntensity: 2.2 }); this.treeEyes = eyeM;
    add(head, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.07, 10, 8).scale(1.3, 0.7, 0.6).translate(sx * 0.22, 0.08, 0.36))), eyeM, 0, 0, 0, false);
    // มงกุฎหนามน้ำแข็ง
    const crown = [];
    for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4, h = i === 3 ? 0.75 : 0.42 + (3 - Math.abs(i - 3)) * 0.08; crown.push(new THREE.ConeGeometry(0.06, h, 5).translate(0, h / 2, 0).rotateZ(a * 0.5).translate(Math.sin(a) * 0.3, 0.25, -0.12)); }
    add(head, mergeGeometries(crown), crystal, 0, 0, 0, false);
    for (const sx of [-1, 1]) { const horn = add(head, new THREE.ConeGeometry(0.07, 0.6, 7), crystal, sx * 0.3, 0.15, -0.35, false); horn.rotation.set(-1.0, 0, sx * -0.4); }
    // ปีกผลึก
    const wingM = toon('#cff4ff', { transparent: true, opacity: 0.6, side: THREE.DoubleSide, emissive: '#4ab0ff', emissiveIntensity: 0.4, depthWrite: false });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.4, 0.9); sh.lineTo(1.6, 0.3); sh.lineTo(1.25, 0.1); sh.lineTo(1.3, -0.35); sh.lineTo(0.85, -0.2); sh.lineTo(0.7, -0.6); sh.lineTo(0.35, -0.3); sh.closePath();
    this.wWings = [-1, 1].map((sx) => {
      const pv = new THREE.Group(); pv.position.set(sx * 0.3, 1.25, 0.3); neck.add(pv);
      const w = add(pv, new THREE.ShapeGeometry(sh), wingM, 0, 0, 0, false); w.scale.x = sx; w.rotation.y = sx * 0.3;
      return pv;
    });
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#8ae8ff', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.set(5, 5, 1); this.glowSprite.position.y = 1.6; g.add(this.glowSprite);
  }

  /* ================= v0.11: Ember Caldera ================= */

  // แมกม่าสไลม์: เยลลี่ลาวาเรืองแสง มีก้อนหินลอยในตัว (ใช้ท่ากระโดดแบบบล็อบเล็ต)
  buildMagmaslime(d) {
    const g = this.jelly = new THREE.Group(); this.body.add(g);
    const mat = this.own(d.color, { transparent: true, opacity: 0.92, emissive: lin('#ff4a0a').multiplyScalar(0.55) });
    const b = add(g, new THREE.SphereGeometry(0.4, 28, 20), mat, 0, 0.34, 0); b.scale.set(1, 0.86, 1);
    const crust = toon('#2a1e1e');
    for (const [x, y, z, r] of [[0.15, 0.62, -0.05, 0.1], [-0.2, 0.55, 0.1, 0.08], [0.05, 0.45, -0.3, 0.09], [-0.25, 0.32, -0.2, 0.07]]) add(g, new THREE.DodecahedronGeometry(r, 0), crust, x, y, z);
    add(g, new THREE.IcosahedronGeometry(0.12, 1), toon('#fff2a0', { emissive: '#ffd23a', emissiveIntensity: 1.8 }), 0, 0.3, -0.02, false);
    eyes(g, 0, 0.4, 0.32, 0.055, 0.12);
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7a2a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.set(1.4, 1.4, 1); this.glowSprite.position.y = 0.35; g.add(this.glowSprite);
  }

  // เอมเบอร์อิมป์: ปีศาจตัวน้อยมีเขา หางแหลม ปีกค้างคาว บินโฉบ
  buildEmberimp(d) {
    const g = this.bat = new THREE.Group(); g.position.y = 0.95; this.body.add(g); this.flyer = true;
    const skin = this.own(d.color, { roughness: 0.6 }), dark = toon('#3a1414');
    add(g, new THREE.SphereGeometry(0.17, 16, 12), skin, 0, 0, 0).scale.set(1, 1.15, 0.9);
    add(g, new THREE.SphereGeometry(0.15, 16, 12), skin, 0, 0.22, 0.03);
    for (const sx of [-1, 1]) { const h = add(g, new THREE.ConeGeometry(0.035, 0.16, 6), dark, sx * 0.08, 0.38, 0.0); h.rotation.z = sx * -0.45; }
    add(g, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.035, 8, 6).scale(1.2, 0.7, 0.6).translate(sx * 0.055, 0.25, 0.14))), toon('#fff28a', { emissive: '#ffd23a', emissiveIntensity: 2 }), 0, 0, 0, false);
    const grin = add(g, new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), dark, 0, 0.17, 0.15, false); grin.rotation.z = Math.PI;
    const tail = add(g, new THREE.CylinderGeometry(0.012, 0.025, 0.38, 6).translate(0, -0.19, 0), dark, 0, -0.1, -0.12); tail.rotation.x = -0.9;
    add(tail, new THREE.ConeGeometry(0.04, 0.08, 4), dark, 0, -0.4, 0, false);
    const wingMat = toon('#5a1a1a', { side: THREE.DoubleSide });
    const shape = new THREE.Shape(); shape.moveTo(0, 0.04); shape.lineTo(0.36, 0.2); shape.lineTo(0.3, 0.0); shape.lineTo(0.22, -0.06); shape.lineTo(0.14, 0.0); shape.lineTo(0.06, -0.06); shape.closePath();
    this.batWings = [-1, 1].map((sx) => {
      const pv = new THREE.Group(); pv.position.set(sx * 0.1, 0.06, -0.08); g.add(pv);
      const w = add(pv, new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2 + 0.3), wingMat, 0, 0, 0, false); w.scale.x = sx;
      return pv;
    });
    this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a1a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flame.scale.set(0.7, 0.7, 1); g.add(this.flame); this.glowSprite = this.flame;
  }

  // ซาลาแมนเดอร์: กิ้งก่าเพลิงตัวเตี้ย หางยาวลุกเป็นไฟ (ท่าเดินสี่ขา)
  buildSalamander(d) {
    const g = this.wolf = new THREE.Group(); this.body.add(g);
    const skin = this.own(d.color, { roughness: 0.5 }), dark = toon('#5a1a0a'), glow = toon('#ffe08a', { emissive: '#ffb02a', emissiveIntensity: 1.6 });
    const torso = add(g, new THREE.SphereGeometry(0.28, 18, 12), skin, 0, 0.32, -0.05); torso.scale.set(0.9, 0.55, 1.7);
    const spots = [];
    for (let i = 0; i < 7; i++) spots.push(new THREE.SphereGeometry(0.05, 8, 6).scale(1, 0.4, 1).translate((i % 2 ? 0.1 : -0.1), 0.47, -0.35 + i * 0.1));
    add(g, mergeGeometries(spots), glow, 0, 0, 0, false);
    const head = this.whead = new THREE.Group(); head.position.set(0, 0.36, 0.48); g.add(head);
    const skull = add(head, new THREE.SphereGeometry(0.18, 16, 12), skin, 0, 0, 0); skull.scale.set(1.1, 0.7, 1.35);
    add(head, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.045, 10, 8).translate(sx * 0.12, 0.08, 0.08))), glow, 0, 0, 0, false);
    add(head, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.02, 6, 5).translate(sx * 0.12, 0.09, 0.12))), toon('#1c1424'), 0, 0, 0, false);
    this.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.22, 0.28, sz * 0.25 - 0.05); g.add(hip);
      const leg = add(hip, new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8).translate(0, -0.14, 0), skin, 0, 0, 0); leg.rotation.z = sx * 0.5;
      add(hip, new THREE.SphereGeometry(0.06, 8, 6), dark, sx * 0.12, -0.24, 0.03).scale.set(1.3, 0.5, 1.4);
      return hip;
    });
    const tail = this.wtailWolf = new THREE.Group(); tail.position.set(0, 0.3, -0.5); g.add(tail);
    for (let i = 0; i < 4; i++) add(tail, new THREE.SphereGeometry(0.12 - i * 0.025, 10, 8), skin, 0, -i * 0.02, -i * 0.17).scale.set(1, 0.7, 1.3);
    this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a2a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flame.scale.set(0.6, 0.8, 1); this.flame.position.set(0, 0.05, -0.75); tail.add(this.flame);
  }

  // ออบซิเดียนโกเลม: หินภูเขาไฟสีดำ รอยแยกลาวาเรืองแสง
  buildObsidiangolem(d) {
    const rock = this.own(d.color, { roughness: 0.35 });
    const g = this.titanRig(rock, { legR: 0.19, legH: 0.62, hipX: 0.27, hipY: 0.66, armR: 0.18, armL: 0.88, shX: 0.6, shY: 1.55, head: 1.95 });
    const torso = add(g, new THREE.DodecahedronGeometry(0.62, 0), rock, 0, 1.2, 0); torso.scale.set(1.1, 1.05, 0.85);
    const lava = toon('#ffd23a', { emissive: '#ff5a0a', emissiveIntensity: 2.0 }); this.treeEyes = lava;
    const cracks = [];
    for (let i = 0; i < 9; i++) { const a = i * 0.9; cracks.push(new THREE.BoxGeometry(0.05, 0.4 + (i % 3) * 0.1, 0.03).rotateZ(Math.sin(a) * 0.8).translate(Math.sin(a) * 0.35, 1.05 + Math.cos(a * 1.3) * 0.25, 0.5)); }
    add(g, mergeGeometries(cracks), lava, 0, 0, 0, false);
    const sh = [];
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) sh.push(new THREE.ConeGeometry(0.08, 0.4, 5).translate(0, 0.2, 0).rotateZ(sx * (-0.6 - k * 0.3)).translate(sx * (0.55 + k * 0.08), 1.7 - k * 0.05, -0.05 + k * 0.08));
    add(g, mergeGeometries(sh), rock, 0, 0, 0);
    const hd = this.canopy;
    add(hd, new THREE.DodecahedronGeometry(0.25, 0), rock, 0, 0, 0);
    add(hd, mergeGeometries([-1, 1].map((sx) => new THREE.BoxGeometry(0.1, 0.05, 0.04).translate(sx * 0.09, 0.03, 0.22))), lava, 0, 0, 0, false);
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a1a', transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.set(2.2, 2.2, 1); this.glowSprite.position.y = 1.2; g.add(this.glowSprite);
  }

  // อิกนารอก (MVP): มังกรเพลิงสี่ขา ปีกใหญ่ เขาโค้ง รอยแยกแมกมาทั่วตัว
  buildIgnarok(d) {
    const g = this.drake = new THREE.Group(); this.body.add(g);
    const scale = this.own(d.color, { roughness: 0.5 }), dark = toon('#2a0e0a'), bellyM = toon('#e8a050');
    const magma = toon('#ffe08a', { emissive: '#ff6a0a', emissiveIntensity: 2.2 }); this.treeEyes = magma;
    const torso = this.dTorso = new THREE.Group(); torso.position.y = 1.35; g.add(torso);
    add(torso, new THREE.SphereGeometry(0.85, 22, 16), scale, 0, 0, 0).scale.set(1, 0.85, 1.55);
    add(torso, new THREE.SphereGeometry(0.62, 18, 12), bellyM, 0, -0.25, 0.25).scale.set(1, 0.7, 1.3);
    const ridge = [];
    for (let i = 0; i < 7; i++) ridge.push(new THREE.ConeGeometry(0.1, 0.35, 5).translate(0, 0.17, 0).translate(0, 0.68, -0.9 + i * 0.3));
    add(torso, mergeGeometries(ridge), dark, 0, 0, 0);
    const veins = [];
    for (let i = 0; i < 10; i++) { const a = i * 0.65; veins.push(new THREE.BoxGeometry(0.05, 0.45, 0.04).rotateZ(Math.sin(a) * 0.7).rotateY(Math.PI / 2).translate(Math.sign(Math.sin(a * 3) || 1) * 0.82, Math.cos(a) * 0.25, -0.8 + i * 0.17)); }
    add(torso, mergeGeometries(veins), magma, 0, 0, 0, false);
    // คอ + หัว
    const neck = this.wneck = new THREE.Group(); neck.position.set(0, 0.3, 1.1); torso.add(neck);
    for (let i = 0; i < 3; i++) add(neck, new THREE.SphereGeometry(0.34 - i * 0.03, 14, 10), scale, 0, 0.25 + i * 0.32, 0.15 + i * 0.18);
    const head = this.whead = new THREE.Group(); head.position.set(0, 1.15, 0.75); neck.add(head);
    add(head, new THREE.SphereGeometry(0.4, 18, 12), scale, 0, 0, 0).scale.set(1, 0.8, 1.2);
    add(head, new THREE.BoxGeometry(0.4, 0.22, 0.6), scale, 0, -0.06, 0.48);
    this.jaw = add(head, new THREE.BoxGeometry(0.36, 0.1, 0.55), dark, 0, -0.22, 0.42);
    add(head, mergeGeometries([-1, 1].map((sx) => new THREE.SphereGeometry(0.07, 10, 8).scale(1.3, 0.7, 0.6).translate(sx * 0.22, 0.1, 0.32))), magma, 0, 0, 0, false);
    for (const sx of [-1, 1]) {
      const horn = add(head, new THREE.ConeGeometry(0.09, 0.8, 8), dark, sx * 0.25, 0.3, -0.25); horn.rotation.set(-1.1, 0, sx * -0.35);
      add(head, new THREE.ConeGeometry(0.03, 0.12, 5), toon('#ffffff'), sx * 0.12, -0.18, 0.7, false).rotation.x = Math.PI;
    }
    this.mouthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a1a', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.mouthGlow.scale.set(1.6, 1.6, 1); this.mouthGlow.position.set(0, -0.12, 0.85); head.add(this.mouthGlow);
    // ขา
    this.legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.62, 1.15, sz * 0.75); g.add(hip);
      add(hip, new THREE.CylinderGeometry(0.2, 0.16, 0.75, 10).translate(0, -0.37, 0), scale, 0, 0, 0);
      add(hip, new THREE.CylinderGeometry(0.15, 0.13, 0.5, 10).translate(0, -0.25, 0), scale, 0, -0.7, 0.05);
      const foot = add(hip, new THREE.SphereGeometry(0.2, 10, 8), dark, 0, -1.12, 0.1); foot.scale.set(1, 0.45, 1.4);
      return hip;
    });
    // หาง
    const tail = this.wtailWolf = new THREE.Group(); tail.position.set(0, 1.25, -1.2); g.add(tail);
    for (let i = 0; i < 6; i++) add(tail, new THREE.SphereGeometry(0.32 - i * 0.045, 12, 10), scale, 0, -i * 0.12, -i * 0.32);
    add(tail, new THREE.ConeGeometry(0.15, 0.5, 6), dark, 0, -0.78, -2.05, false).rotation.x = -Math.PI / 2 - 0.4;
    // ปีกพังผืด
    const wingM = toon('#7a1e12', { side: THREE.DoubleSide, emissive: '#3a0a04', emissiveIntensity: 0.6 });
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.0, 1.0); sh.lineTo(2.2, 1.2); sh.lineTo(1.9, 0.5); sh.lineTo(2.0, -0.1); sh.lineTo(1.5, 0.05); sh.lineTo(1.3, -0.5); sh.lineTo(0.8, -0.2); sh.lineTo(0.55, -0.6); sh.closePath();
    this.wWings = [-1, 1].map((sx) => {
      const pv = new THREE.Group(); pv.position.set(sx * 0.5, 0.55, 0.2); torso.add(pv);
      const w = add(pv, new THREE.ShapeGeometry(sh), wingM, 0, 0, 0, false); w.scale.x = sx; w.rotation.y = sx * 0.25;
      return pv;
    });
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff5a1a', transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.set(6, 6, 1); this.glowSprite.position.y = 1.4; g.add(this.glowSprite);
  }

  hurt() { this.hurtT = 0.22; }
  attack() { this.attackT = 0.45; }
  slam(dur = 1.3) { this.slamT = dur; this.slamDur = dur; }
  die() { this.deadT = 0; }
  respawn() { this.deadT = -1; this.spawnT = 0.0001; this.root.visible = true; this.body.scale.set(0.01, 0.01, 0.01); }

  update(dt, mob) {
    this.time += dt; const t = this.time;
    this.root.position.set(mob.x / 16, 0, mob.y / 16);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, mob.angle, damp(10, dt));

    // กระพริบขาวตอนโดนตี
    if (this.hurtT > 0 || this.flashing) {
      this.hurtT = Math.max(0, this.hurtT - dt);
      const k = this.hurtT / 0.22;
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive).lerp(WHITE_C, k * 0.8);
      this.flashing = this.hurtT > 0;
    }
    const shake = this.hurtT > 0 ? Math.sin(t * 90) * 0.05 * (this.hurtT / 0.22) : 0;
    this.body.position.x = shake;

    // ตาย: ยุบตัว + จมลง แล้วหายไป
    if (this.deadT >= 0) {
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.7);
      this.body.scale.set(1 + k * 0.4, Math.max(0.02, 1 - k), 1 + k * 0.4);
      this.body.position.y = mob.data.model === 'stinglet' || this.flyer ? -0.75 * Math.min(1, this.deadT / 0.4) : 0;
      this.shadow.material.opacity = 1 - k;
      if (this.deadT > 0.9) this.root.visible = false;
      return;
    }
    // เกิดใหม่: เด้งขยายขึ้นมา
    if (this.spawnT > 0) {
      this.spawnT += dt;
      const k = Math.min(1, this.spawnT / 0.5);
      const s = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) + (k - 1) * (1 - k) : 1;
      this.body.scale.setScalar(Math.max(0.01, k * s));
      this.shadow.material.opacity = k;
      if (k >= 1) { this.spawnT = 0; this.body.scale.setScalar(1); }
    }

    // แช่แข็ง: ตัวเป็นสีฟ้าน้ำแข็งและหยุดนิ่ง (v0.6)
    if (mob.frozen) {
      if (!this.iceColor) this.iceColor = new THREE.Color('#7fd0ff');
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive).lerp(this.iceColor, this.hurtT > 0 ? 0.85 : 0.6);
      this.wasFrozen = true;
      return;
    } else if (this.wasFrozen) {
      for (const m of this.flashMats) m.emissive.copy(m.userData.baseEmissive);
      this.wasFrozen = false;
    }
    // มึน: โยกตัวไปมา
    this.body.rotation.z = mob.stunned ? Math.sin(t * 9) * 0.14 : 0;

    let atk = 0;
    if (this.attackT > 0) { this.attackT = Math.max(0, this.attackT - dt); atk = Math.sin((1 - this.attackT / 0.45) * Math.PI); }
    const moving = mob.moving;
    this.phase += dt * (moving ? 9 * (0.5 + 0.5 * (mob.speedFactor || 1)) : 0);

    if (this.jelly) {
      const h = moving ? Math.abs(Math.sin(this.phase)) : 0;
      const sy = moving ? 0.88 + h * 0.3 : 1 + Math.sin(t * 3) * 0.04;
      const s = 1 / Math.sqrt(sy);
      this.jelly.scale.set(s * (1 + atk * 0.1), sy * (1 + atk * 0.2), s * (1 + atk * 0.15));
      this.jelly.position.y = h * 0.24 + atk * 0.12;
      this.jelly.position.z = atk * 0.35;
      this.shadow.scale.setScalar(1 - h * 0.3);
    } else if (this.shroom) {
      this.shroom.rotation.z = moving ? Math.sin(this.phase) * 0.14 : Math.sin(t * 1.8) * 0.03;
      this.shroom.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.05 : 0;
      this.shroom.rotation.x = atk * 0.6;
      this.shroom.position.z = atk * 0.2;
      this.feet[0].position.y = 0.05 + (moving ? Math.max(0, Math.sin(this.phase)) * 0.07 : 0);
      this.feet[1].position.y = 0.05 + (moving ? Math.max(0, -Math.sin(this.phase)) * 0.07 : 0);
    } else if (this.hog) {
      // เดินต้วมเตี้ยม + ขดตัวพุ่งชนตอนโจมตี
      this.hog.rotation.z = moving ? Math.sin(this.phase) * 0.12 : Math.sin(t * 1.6) * 0.02;
      this.hog.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.04 : 0;
      this.hog.position.z = atk * 0.3; this.hog.rotation.x = atk * 0.5;
      const k = 1 + atk * 0.12; this.hog.scale.set(k, 1 - atk * 0.1, k);
      this.feet.forEach((f, i) => { f.position.y = 0.05 + (moving ? Math.max(0, Math.sin(this.phase + (i % 3 === 0 ? 0 : Math.PI))) * 0.06 : 0); });
    } else if (this.wisp) {
      // ลอยวนไปมา หางเปลวไฟไหว ประกายหมุนรอบ
      this.wisp.position.y = 0.85 + Math.sin(t * 2.6) * 0.1 + atk * 0.1;
      this.wisp.position.z = atk * 0.5;
      this.wtail.rotation.x = -1.0 - (moving ? 0.35 : 0) + Math.sin(t * 9) * 0.08;
      this.wtail.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 7) * 0.12, 1);
      this.wglow.material.opacity = 0.55 + Math.sin(t * 5) * 0.12 + atk * 0.3;
      this.sparks.forEach((sp, i) => { const a = t * 2.4 + (i / 3) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.32, Math.sin(t * 3 + i) * 0.12, Math.sin(a) * 0.32); });
      this.shadow.scale.setScalar(0.7 + Math.sin(t * 2.6) * 0.05);
    } else if (this.wolf) {
      // วิ่งสี่ขา + กัด
      const sw = moving ? Math.sin(this.phase * 1.3) * 0.7 : 0;
      this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
      this.wolf.position.y = moving ? Math.abs(Math.sin(this.phase * 1.3)) * 0.05 : Math.sin(t * 2) * 0.01;
      this.whead.rotation.x = -atk * 0.5 + (moving ? 0 : Math.sin(t * 1.3) * 0.05);
      this.whead.position.z = 0.44 + atk * 0.2;
      this.wolf.position.z = atk * 0.25;
      this.wtailWolf.rotation.y = Math.sin(t * (moving ? 14 : 4)) * 0.35;
    } else if (this.tree) {
      // ย่ำรากเดิน แขนกิ่งไม้ฟาด ทุบพื้นสองมือ
      this.canopy.rotation.z = Math.sin(t * 0.9) * 0.04; this.canopy.rotation.x = Math.sin(t * 0.7) * 0.03;
      const st = moving ? Math.sin(this.phase * 0.7) : 0;
      this.roots.forEach((r, i) => { r.rotation.x = (i % 2 ? st : -st) * 0.25; });
      this.tree.position.y = moving ? Math.abs(st) * 0.08 : 0;
      this.tree.rotation.z = moving ? st * 0.04 : Math.sin(t * 0.8) * 0.015;
      let a0 = Math.sin(t * 1.1) * 0.06, a1 = -a0;
      if (atk > 0) a0 = -1.6 * atk;
      if (this.slamT > 0) {
        this.slamT = Math.max(0, this.slamT - dt);
        const p = 1 - this.slamT / this.slamDur;
        const lift = p < 0.75 ? Math.sin((p / 0.75) * Math.PI * 0.5) : 1 - (p - 0.75) / 0.25 * 1.6;
        a0 = a1 = -2.6 * Math.max(-0.4, lift);
        this.tree.rotation.x = p < 0.75 ? -0.12 * (p / 0.75) : 0.2 * (1 - (p - 0.75) / 0.25);
      } else this.tree.rotation.x *= 1 - damp(8, dt);
      this.tarms[0].rotation.x = a0; this.tarms[1].rotation.x = a1;
      this.treeEyes.emissiveIntensity = 1.6 + Math.sin(t * 4) * 0.3 + (this.slamT > 0 ? 1.2 : 0);
    } else if (this.bat) {
      // บินโฉบ: กระพือปีก + โฉบลงตอนโจมตี
      const flap = Math.sin(t * 16) * 0.7;
      this.batWings[0].rotation.z = 0.2 + flap; this.batWings[1].rotation.z = -0.2 - flap;
      this.bat.position.y = (this.bat.userData.baseY ??= this.bat.position.y) + Math.sin(t * 3) * 0.08 - atk * 0.3;
      this.bat.position.z = atk * 0.45;
      this.bat.rotation.x = atk * 0.5 + (moving ? 0.2 : 0);
      if (this.glowSprite) this.glowSprite.material.opacity = 0.35 + Math.sin(t * 6) * 0.1 + atk * 0.3;
      this.shadow.scale.setScalar(0.65 + Math.sin(t * 3) * 0.04);
    } else if (this.wyrm) {
      // ราชินีหิมะ: ลำตัวขดพลิ้ว คอโยก ปีกกระพือช้า · ทุบพื้น = ยืดตัวสูงแล้วฟาดลง
      this.coils.forEach((c, i) => { c.position.y = c.scale.y * 0.4 + Math.sin(t * 2 + i * 0.7) * 0.05; });
      let neckX = Math.sin(t * 1.1) * 0.05, wing = Math.sin(t * 1.6) * 0.25;
      this.whead.rotation.x = -atk * 0.5 + Math.sin(t * 1.4) * 0.05;
      this.whead.position.z = 0.2 + atk * 0.5;
      if (this.slamT > 0) {
        this.slamT = Math.max(0, this.slamT - dt);
        const p = 1 - this.slamT / this.slamDur;
        neckX = p < 0.7 ? -0.35 * (p / 0.7) : -0.35 + 1.0 * ((p - 0.7) / 0.3);
        wing = p < 0.7 ? 0.9 * (p / 0.7) : 0.9 - ((p - 0.7) / 0.3) * 1.2;
      }
      this.wneck.rotation.x += (neckX - this.wneck.rotation.x) * Math.min(1, dt * 10);
      this.wWings[0].rotation.y = 0.3 + wing; this.wWings[1].rotation.y = -0.3 - wing;
      this.wWings[0].rotation.z = Math.sin(t * 1.6) * 0.1; this.wWings[1].rotation.z = -Math.sin(t * 1.6) * 0.1;
      this.treeEyes.emissiveIntensity = 2 + Math.sin(t * 3) * 0.4 + (this.slamT > 0 ? 1.5 : 0);
      this.glowSprite.material.opacity = 0.35 + Math.sin(t * 2) * 0.08;
    } else if (this.drake) {
      // มังกรเพลิง: เดินสี่ขา หางสะบัด ปีกกระพือ · กัด · ทุบพื้น = ยืนสองขาหลังแล้วกระทืบ
      const sw = moving ? Math.sin(this.phase * 0.8) * 0.45 : 0;
      this.legs[0].rotation.x = sw; this.legs[3].rotation.x = sw; this.legs[1].rotation.x = -sw; this.legs[2].rotation.x = -sw;
      this.wtailWolf.rotation.y = Math.sin(t * (moving ? 3 : 1.2)) * 0.3;
      this.wneck.rotation.y = Math.sin(t * 0.7) * 0.15;
      this.whead.rotation.x = -atk * 0.6 + Math.sin(t * 1.2) * 0.05;
      this.jaw.rotation.x = atk * 0.5;
      this.mouthGlow.material.opacity = 0.25 + atk * 0.7 + Math.sin(t * 5) * 0.1;
      let rear = 0, wing = Math.sin(t * 1.3) * 0.2;
      if (this.slamT > 0) {
        this.slamT = Math.max(0, this.slamT - dt);
        const p = 1 - this.slamT / this.slamDur;
        rear = p < 0.7 ? -0.55 * Math.sin((p / 0.7) * Math.PI * 0.5) : -0.55 * (1 - (p - 0.7) / 0.3);
        wing = p < 0.7 ? 0.9 : 0.9 - ((p - 0.7) / 0.3);
        this.mouthGlow.material.opacity = 0.9;
      }
      this.dTorso.rotation.x += (rear - this.dTorso.rotation.x) * Math.min(1, dt * 10);
      this.dTorso.position.y = 1.35 - rear * 0.6;
      this.legs[0].position.y = this.legs[1].position.y = 1.15 - rear * 1.1;
      this.wWings[0].rotation.y = 0.25 + wing; this.wWings[1].rotation.y = -0.25 - wing;
      this.wWings[0].rotation.z = Math.sin(t * 1.3) * 0.15; this.wWings[1].rotation.z = -Math.sin(t * 1.3) * 0.15;
      this.treeEyes.emissiveIntensity = 2 + Math.sin(t * 4) * 0.5 + (this.slamT > 0 ? 1.5 : 0);
      this.glowSprite.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.1;
    } else if (this.bee) {
      const flap = Math.sin(t * 42) * 0.55;
      this.wings[0].rotation.z = 0.25 + flap; this.wings[1].rotation.z = -0.25 - flap;
      this.bee.position.y = 0.85 + Math.sin(t * 3.2) * 0.07 - atk * 0.3;
      this.bee.position.z = atk * 0.45;
      this.bee.rotation.x = 0.15 + atk * 0.5 + (moving ? 0.12 : 0);
      this.shadow.scale.setScalar(0.75 + Math.sin(t * 3.2) * 0.04);
    }
  }

  dispose() {
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of this.flashMats) m.dispose();
    this.shadow.material.dispose();
  }
}
