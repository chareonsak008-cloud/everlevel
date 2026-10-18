// ตัวละครผู้เล่นแบบสไปรต์ชีตวาดมือ — แผ่นป้ายหันหากล้อง · เปลี่ยนเฟรมตามท่า · หันได้ 8 ทิศจริง (เทียบกับมุมกล้อง)
// แผ่นละอาชีพ = 8 คอลัมน์ × 8 แถว (ช่องละ 128px)
//   แถว: N · NE · E · SE · S · SW · W · NW  (ทิศตัวละครหันเทียบจอ)
//   คอลัมน์ 0–3 = เดิน 4 เฟรม · 4–7 = โจมตี 4 เฟรม (นักบวช = ท่าร่าย/ฮีล)
import { THREE } from './three.js?v=0.43.2';
import { VERSION } from '../config.js?v=0.43.2';

// แผ่นวาดมือ 8×8 (ช่อง 128px): คอลัมน์ 0–3 เดิน · 4–7 โจมตี
const HAND = { cols: 8, size: 2.75, pixel: false, anim: { idle: [7], walk: [0, 1, 2, 3], attack: [4, 5, 6, 7] } };
// แผ่นจาก PixelLab 13×8 (ช่อง 96px): คอลัมน์ 0 = ยืน · 1–8 เดิน · 9–12 โจมตี
const PXLAB = { cols: 13, size: 3.55, pixel: true, anim: { idle: [0], walk: [1, 2, 3, 4, 5, 6, 7, 8], attack: [9, 10, 11, 12] } };
// v0.39: แผ่นชุดใหม่ (ช่อง 128px · อาวุธใหญ่เห็นชัด · ท่ายืนหายใจ 8 เฟรม · เดิน 8 · ฟัน 8 · ร่ายสกิล 8) — ทำทีละอาชีพ
// แผ่น 16×16 ช่อง 144px: ทิศละ 2 แถว — แถวบน คอลัมน์ 0–7 ยืน · 8–15 เดิน / แถวล่าง 0–7 โจมตี · 8–15 สกิล (ขนาดบนจอเทียบความละเอียดเดิม 96px = 3.55 หน่วย)
const PX_UNIT = 3.55 / 96;   // หน่วยโลกต่อพิกเซลของแผ่นพิกเซล
const R = (a, n) => Array.from({ length: n }, (_, i) => a + i);
const PX2 = { cols: 16, rows: 16, rowsPerDir: 2, size: 3.55 * 144 / 96, pixel: true, foot: 96 / 144, head: 24 / 144,
  anim: { idle: R(0, 8), walk: R(8, 8), attack: R(0, 8), skill: R(8, 8) }, row: { idle: 0, walk: 0, attack: 1, skill: 1 },
  fps: { idle: { fps: 6, loop: true }, walk: { fps: 11, loop: true }, attack: { fps: 14, loop: false }, skill: { fps: 12, loop: false } } };   // v0.40.2 ฟันชัดขึ้น
// แผ่นช่องใหญ่กว่า 144 (เอฟเฟกต์/ปีกกว้าง) — ขนาดพิกเซลต่อหน่วยเท่าเดิม · foot = แถวพิกเซลเท้าจากขอบบน
const PXC = (cell, foot) => ({ ...PX2, size: 3.55 * cell / 96, foot: foot / cell, head: (foot - 72) / cell });
export const SHEETS = {
  swordsman: { ...PX2, src: 'assets/sprites/swordsman_v2.png' },   // v0.39 ดาบใหญ่ · ท่าละ 8 เฟรม
  archer: { ...PX2, src: 'assets/sprites/archer_v2.png' },   // v0.40 อาวุธใหญ่ · ท่าละ 8 เฟรม
  mage: { ...PX2, src: 'assets/sprites/mage_v2.png' },   // v0.40 อาวุธใหญ่ · ท่าละ 8 เฟรม
  acolyte: { ...PXC(208, 112), src: 'assets/sprites/acolyte_v2.png' },   // v0.40 อาวุธใหญ่ (ช่องกว้าง: คทาเหวี่ยงไกล)
  novice: { ...PX2, src: 'assets/sprites/novice_v2.png' },
  // v0.43 ชุดเกราะมังกร (ร้านเพชร) — สวมช่อง "ชุด" แล้วเปลี่ยนแผ่นทั้งตัวตามสายอาชีพ
  swordsman_dragon: { ...PX2, base: 'swordsman', src: 'assets/sprites/swordsman_dragon.png' },
  archer_dragon: { ...PX2, base: 'archer', src: 'assets/sprites/archer_dragon.png' },
  mage_dragon: { ...PX2, base: 'mage', src: 'assets/sprites/mage_dragon.png' },
  acolyte_dragon: { ...PXC(208, 112), base: 'acolyte', src: 'assets/sprites/acolyte_dragon.png' },   // v0.41 Novice ตัวพิกเซล (ดาบไม้ฝึก · เป้ผ้าใบ)
};
// v0.39 สกินอาวุธ (แผ่นทั้งตัวที่ถืออาวุธลายอื่น) — key = ชื่อแผ่น · เลือกได้จากชิ้นแฟชั่นอาวุธ { sheet: key, job }
export const SKIN_SHEETS = {};
export function registerSheet(key, def) { SHEETS[key] = def; }
const LINE = { knight: 'swordsman', wizard: 'mage', hunter: 'archer', priest: 'acolyte' };
export const sheetOf = (job) => (SHEETS[job] ? job : LINE[job] || null);
// อาชีพที่ใช้ตัวละครพิกเซลในเกมจริงแล้ว (v0.41: Novice ด้วย)
export const liveSheet = (job) => { const k = sheetOf(job); return k && SHEETS[k].pixel ? k : null; };

// 8 ทิศเทียบจอ (0 = หันหน้าเข้าหากล้อง หมุนตามเข็มไปทางขวา) → แถวในแผ่น
export const DIR8 = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };

// ทิศหันของตัวละครเทียบจอ → ดัชนี DIR8 (ใช้ร่วมกับปีกพิกเซลของตัวละครที่ยังเป็นโมเดล)
const _r = new THREE.Vector3(), _b = new THREE.Vector3();
export function screenDir(angle, camera) {
  const right = _r.setFromMatrixColumn(camera.matrixWorld, 0);
  const back = _b.setFromMatrixColumn(camera.matrixWorld, 2); back.y = 0; back.normalize();
  const fx = Math.sin(angle), fz = Math.cos(angle);
  const ang = Math.atan2(fx * right.x + fz * right.z, fx * back.x + fz * back.z);
  return ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
}

const FPS = { idle: { fps: 1, loop: true }, walk: { fps: 8, loop: true }, attack: { fps: 11, loop: false }, skill: { fps: 9, loop: false } };
const framesOf = (S, name) => S.anim[name] || S.anim.attack;
const fpsOf = (S, name) => (S.fps && S.fps[name]) || FPS[name];

function sheetTexture(S) {
  const t = new THREE.TextureLoader().load(`${S.src}?v=${VERSION}`);   // v0.40.2 กันภาพเก่าค้างแคช
  const f = S.pixel ? THREE.NearestFilter : THREE.LinearFilter;
  t.encoding = THREE.sRGBEncoding; t.magFilter = f; t.minFilter = f; t.generateMipmaps = false;
  t.repeat.set(1 / S.cols, 1 / (S.rows || 8));
  return t;
}

export class SheetSprite {
  constructor(scene, job) {
    this.scene = scene; this.job = null; this.tex = null;
    const geo = new THREE.PlaneGeometry(1, 1);
    // วาดหลังชิ้นแฟชั่นโปร่ง (ปีกไฟ/ออร่า) เสมอ → ตัวละครอยู่หน้าปีก ไม่โดนปีกบังจนจาง
    this.mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, depthWrite: true, toneMapped: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.renderOrder = 40; this.mesh.frustumCulled = false;
    // ส่วนที่ถูกต้นไม้/บ้านบัง → เงาโปร่งทะลุ (แบบเดียวกับสไปรต์ตัวละครเดิม)
    this.xmat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, alphaTest: 0.5, depthWrite: false, depthFunc: THREE.GreaterDepth, toneMapped: false, color: new THREE.Color(0.75, 0.82, 1.0), side: THREE.DoubleSide });
    this.xray = new THREE.Mesh(geo, this.xmat); this.xray.renderOrder = 30; this.xray.frustumCulled = false;
    this.pivot = new THREE.Group(); this.pivot.add(this.mesh, this.xray); scene.add(this.pivot);
    this._c = new THREE.Vector3();
    this.anim = 'idle'; this.t = 0; this.life = 0; this.lastAtk = 0; this.dir = 0;
    this._r = new THREE.Vector3(); this._b = new THREE.Vector3();
    this.setJob(job);
  }

  // skin = แผ่นสกินอาวุธ (ถ้ามีและเป็นของสายอาชีพนี้)
  setJob(job, skin = null) {
    const base = sheetOf(job); if (!base) return false;
    const k = skin && SHEETS[skin] && SHEETS[skin].base === base ? skin : base;
    if (k === this.job) return true;
    this.job = k;
    if (this.tex) this.tex.dispose();
    this.S = SHEETS[k];
    this.tex = sheetTexture(this.S);
    this.mat.map = this.tex; this.mat.needsUpdate = true; this.xmat.map = this.tex; this.xmat.needsUpdate = true;
    this.headH = this.S.size * (this.S.foot - (this.S.head || 12 / 96)) + 0.6;   // ความสูงถึงปลายผม (วางป้ายฉายา)
    // v0.40.5 จุดหลังของตัวละครทุกเฟรม (ไฟล์ .json คู่กับแผ่น) → ปีกขยับตามตัว
    const S = this.S;
    if (S.pixel && S.anch === undefined && S.rowsPerDir) {
      S.anch = null;
      fetch(`${S.src.replace(/\.png$/, '.json')}?v=${VERSION}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.a) S.anch = j.a; }).catch(() => {});
    }
    return true;
  }

  play(name) { if (this.anim !== name) { this.anim = name; this.t = 0; } }

  update(dt, ent, view, camera, tint) {
    if (!this.job) return;
    // ท่า
    const atk = view && view.attackT > 0;
    const S = this.S;
    // v0.40.2 โจมตีรัว: เล่นท่าด้วยความเร็วปกติ (อ่านท่าออก) · ระหว่างท่ายังไม่จบไม่เริ่มใหม่ — จบแล้วตีต่อก็เล่นรอบใหม่
    if (atk && view.lastAttackAt !== this.lastAtk) {
      this.lastAtk = view.lastAttackAt;
      const name = view.attackKind === 'cast' ? 'skill' : 'attack';
      const playing = (this.anim === 'attack' || this.anim === 'skill') && this.t < this.dur;
      if (!playing) { this.dur = framesOf(S, name).length / fpsOf(S, name).fps; this.play(name); this.t = 0; }
    }
    const busy = (this.anim === 'attack' || this.anim === 'skill') && this.t < (this.dur || framesOf(S, this.anim).length / fpsOf(S, this.anim).fps) + 0.04;
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
    const A = fpsOf(S, this.anim), cols = framesOf(S, this.anim), n = cols.length;
    let f = Math.floor(this.t * A.fps);
    // v0.40.2 ยืนนิ่ง: ค้างเฟรมแรก แล้วขยับท่ายืนรอบเดียวทุก ~5 วิ (ไม่ไหวตลอดเวลา)
    if (this.anim === 'idle' && n > 1) { const cyc = n / A.fps, per = cyc + 4; const ph = (this.t + cyc) % per; f = ph < cyc ? Math.floor(ph * A.fps) : 0; }
    if (this.anim === 'skill' && (ent.cast || ent.castPose) && f >= 1 && n > 2) { const h = n >= 8 ? [n - 4, n - 3] : [1, 2]; if (f >= h[0]) f = h[Math.floor(this.t * 5) % 2]; }   // ร่ายค้าง (สลับ 2 เฟรมช่วงท้าย)
    f = A.loop ? f % n : Math.min(n - 1, f);
    const col = cols[f], row = ROW[d] * (S.rowsPerDir || 1) + ((S.row && S.row[this.anim]) || 0), NR = S.rows || 8;
    this.tex.offset.set(col / S.cols, 1 - (row + 1) / NR);
    // ปีกเกาะหลัง: ระยะที่จุดหลังเฟรมนี้ต่างจากท่ายืนเฟรมแรกของทิศเดียวกัน (หน่วยโลก)
    const AN = S.anch, cur = AN && AN[row] && AN[row][col], base = AN && AN[ROW[d] * (S.rowsPerDir || 1)] && AN[ROW[d] * (S.rowsPerDir || 1)][0];
    if (cur && base) { this.wdx = (cur[0] - base[0]) * PX_UNIT; this.wdy = (cur[1] - base[1]) * PX_UNIT; } else { this.wdx = 0; this.wdy = 0; }
    // วางตำแหน่ง · หันหากล้อง
    const bob = this.anim === 'idle' && !ent.dead && S.anim.idle.length < 2 ? 1 + Math.sin(this.life * 2.6) * 0.012 : 1;   // แผ่นที่มีท่าหายใจแล้วไม่ต้องยืดหด
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
