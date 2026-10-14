// ตัวละครผู้เล่นแบบสไปรต์ชีตวาดมือ — แผ่นป้ายหันหากล้อง · เปลี่ยนเฟรมตามท่า · หันได้ 8 ทิศจริง (เทียบกับมุมกล้อง)
// แผ่นละอาชีพ = 8 คอลัมน์ × 8 แถว (ช่องละ 128px)
//   แถว: N · NE · E · SE · S · SW · W · NW  (ทิศตัวละครหันเทียบจอ)
//   คอลัมน์ 0–3 = เดิน 4 เฟรม · 4–7 = โจมตี 4 เฟรม (นักบวช = ท่าร่าย/ฮีล)
import { THREE } from './three.js';

// แผ่นวาดมือ 8×8 (ช่อง 128px): คอลัมน์ 0–3 เดิน · 4–7 โจมตี
const HAND = { cols: 8, size: 2.75, pixel: false, anim: { idle: [7], walk: [0, 1, 2, 3], attack: [4, 5, 6, 7] } };
// แผ่นจาก PixelLab 13×8 (ช่อง 96px): คอลัมน์ 0 = ยืน · 1–8 เดิน · 9–12 โจมตี
const PXLAB = { cols: 13, size: 3.55, pixel: true, anim: { idle: [0], walk: [1, 2, 3, 4, 5, 6, 7, 8], attack: [9, 10, 11, 12] } };
export const SHEETS = {
  swordsman: { ...PXLAB, src: 'assets/sprites/swordsman_px.png', foot: 75.5 / 96 },
  archer: { ...PXLAB, src: 'assets/sprites/archer_px.png', foot: 75.5 / 96 },
  mage: { ...HAND, src: 'assets/sprites/mage8.png', foot: 121.5 / 128 },
  acolyte: { ...HAND, src: 'assets/sprites/acolyte8.png', foot: 121.5 / 128 },
};
const LINE = { knight: 'swordsman', wizard: 'mage', hunter: 'archer', priest: 'acolyte' };
export const sheetOf = (job) => (SHEETS[job] ? job : LINE[job] || null);
// อาชีพที่ใช้ตัวละครพิกเซลในเกมจริงแล้ว (ที่เหลือยังเป็นโมเดลเดิม)
export const liveSheet = (job) => { const k = sheetOf(job); return k && SHEETS[k].pixel ? k : null; };

// 8 ทิศเทียบจอ (0 = หันหน้าเข้าหากล้อง หมุนตามเข็มไปทางขวา) → แถวในแผ่น
export const DIR8 = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };

const FPS = { idle: { fps: 1, loop: true }, walk: { fps: 8, loop: true }, attack: { fps: 11, loop: false }, skill: { fps: 9, loop: false } };
const framesOf = (S, name) => S.anim[name] || S.anim.attack;

function sheetTexture(S) {
  const t = new THREE.TextureLoader().load(S.src);
  const f = S.pixel ? THREE.NearestFilter : THREE.LinearFilter;
  t.encoding = THREE.sRGBEncoding; t.magFilter = f; t.minFilter = f; t.generateMipmaps = false;
  t.repeat.set(1 / S.cols, 1 / 8);
  return t;
}

export class SheetSprite {
  constructor(scene, job) {
    this.scene = scene; this.job = null; this.tex = null;
    const geo = new THREE.PlaneGeometry(1, 1);
    this.mat = new THREE.MeshBasicMaterial({ transparent: false, alphaTest: 0.5, toneMapped: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.renderOrder = 2; this.mesh.frustumCulled = false;
    // ส่วนที่ถูกต้นไม้/บ้านบัง → เงาโปร่งทะลุ (แบบเดียวกับสไปรต์ตัวละครเดิม)
    this.xmat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, alphaTest: 0.5, depthWrite: false, depthFunc: THREE.GreaterDepth, toneMapped: false, color: new THREE.Color(0.75, 0.82, 1.0), side: THREE.DoubleSide });
    this.xray = new THREE.Mesh(geo, this.xmat); this.xray.renderOrder = 30; this.xray.frustumCulled = false;
    this.pivot = new THREE.Group(); this.pivot.add(this.mesh, this.xray); scene.add(this.pivot);
    this._c = new THREE.Vector3();
    this.anim = 'idle'; this.t = 0; this.life = 0; this.lastAtk = 0; this.dir = 0;
    this._r = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.setJob(job);
  }

  setJob(job) {
    const k = sheetOf(job); if (!k || k === this.job) return !!k;
    this.job = k;
    if (this.tex) this.tex.dispose();
    this.S = SHEETS[k];
    this.tex = sheetTexture(this.S);
    this.mat.map = this.tex; this.mat.needsUpdate = true; this.xmat.map = this.tex; this.xmat.needsUpdate = true;
    this.headH = this.S.size * (this.S.foot - 12 / 96) + 0.6;   // ความสูงถึงปลายผม (วางป้ายฉายา)
    return true;
  }

  play(name) { if (this.anim !== name) { this.anim = name; this.t = 0; } }

  update(dt, ent, view, camera, tint) {
    if (!this.job) return;
    // ท่า
    const atk = view && view.attackT > 0;
    if (atk && view.lastAttackAt !== this.lastAtk) { this.lastAtk = view.lastAttackAt; this.play(view.attackKind === 'cast' ? 'skill' : 'attack'); this.t = 0; }
    const S = this.S;
    const busy = (this.anim === 'attack' || this.anim === 'skill') && this.t < framesOf(S, this.anim).length / FPS[this.anim].fps + 0.06;
    if (!busy) this.play(ent.cast || ent.castPose ? 'skill' : (ent.moving ?? ent.mv) ? 'walk' : 'idle');
    this.t += dt; this.life += dt;
    // ทิศเทียบกล้อง: ฉายทิศหันของตัวละครลงแกนจอ (ขวา / ลึกเข้าจอ)
    const right = this._r.setFromMatrixColumn(camera.matrixWorld, 0);
    const back = this._b.setFromMatrixColumn(camera.matrixWorld, 2); back.y = 0; back.normalize();   // ชี้ออกจากจอหาผู้เล่น
    const fx = Math.sin(ent.angle), fz = Math.cos(ent.angle);
    const sx = fx * right.x + fz * right.z, sy = fx * back.x + fz * back.z;   // sy > 0 = หันเข้าหากล้อง
    const ang = Math.atan2(sx, sy);                                           // 0 = หันหน้าเข้าจอ · +90° = ขวา
    const raw = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
    const centre = raw * Math.PI / 4, diff = Math.abs(Math.atan2(Math.sin(ang - centre), Math.cos(ang - centre)));
    if (raw !== this.dir && diff < Math.PI / 8 - 0.06) this.dir = raw;            // กันสั่นตรงรอยต่อทิศ
    const d = DIR8[this.dir];
    // เฟรม
    const A = FPS[this.anim], cols = framesOf(S, this.anim), n = cols.length;
    let f = Math.floor(this.t * A.fps);
    if (this.anim === 'skill' && (ent.cast || ent.castPose) && f >= 1 && n > 2) f = 1 + (Math.floor(this.t * 5) % 2);   // ร่ายค้าง (เฟรม 2–3 สลับ)
    f = A.loop ? f % n : Math.min(n - 1, f);
    const col = cols[f], row = ROW[d];
    this.tex.offset.set(col / S.cols, 1 - (row + 1) / 8);
    // วางตำแหน่ง · หันหากล้อง
    const bob = this.anim === 'idle' && !ent.dead ? 1 + Math.sin(this.life * 2.6) * 0.012 : 1;
    // แผ่นป้าย: ตามตำแหน่งเท้า หันหากล้อง ดันเข้าหากล้องเล็กน้อยกันจมพื้น/สะพาน/รั้ว (ย่อชดเชยให้ขนาดบนจอเท่าเดิม)
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._b.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    const push = 0.5, k = (dist - push) / dist;
    this.pivot.position.copy(foot).addScaledVector(toCam, push);
    this.pivot.quaternion.copy(camera.quaternion);
    this.pivot.scale.setScalar(k);
    this.mesh.scale.set(S.size, S.size * bob, 1);
    this.mesh.position.y = S.size * (S.foot - 0.5) * bob;
    this.mesh.rotation.z = ent.dead ? (sx < 0 ? -1 : 1) * Math.PI / 2 : 0;
    this.xray.scale.copy(this.mesh.scale); this.xray.position.copy(this.mesh.position); this.xray.rotation.z = this.mesh.rotation.z;
    this.xray.visible = !!ent.isPlayer || ent === (globalThis.asteria && globalThis.asteria.player);
    this.mat.color.copy(tint || new THREE.Color(1, 1, 1));
    if (view && view.hurtT > 0) this.mat.color.setRGB(1, 0.45, 0.45);
    this.info = { dir: d, anim: this.anim, col };
  }

  dispose() { this.scene.remove(this.pivot); this.mesh.geometry.dispose(); this.mat.dispose(); this.xmat.dispose(); if (this.tex) this.tex.dispose(); }
}
