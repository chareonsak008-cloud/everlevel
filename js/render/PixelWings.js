// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js';

const PXW = 3.55 / 96;   // หน่วยโลกต่อพิกเซล (เท่าตัวละครพิกเซล)
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
// โหลดแยกต่อตัว (offset ต่างกัน · เบราว์เซอร์แคชไฟล์ให้อยู่แล้ว — ห้าม clone ก่อนภาพโหลดเสร็จ)
function wingTexture(p) {
  const t = new THREE.TextureLoader().load(`assets/fashion/wings/${p.px}.png`);
  t.encoding = THREE.sRGBEncoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

export class PixelWingSprite {
  constructor(scene, p) {
    this.scene = scene; this.p = p; this.t = Math.random() * 10;
    const tex = wingTexture(p);
    tex.repeat.set(1 / (p.frames || 1), 1 / 8);
    this.tex = tex;
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: true, toneMapped: false, side: THREE.DoubleSide });
    const w = (p.cell || 96) * PXW * (p.scale || 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w), this.mat); this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 38;
    scene.add(this.mesh);
    this._c = new THREE.Vector3(); this._d = new THREE.Vector3();
  }

  // v0.36: หมุนปีกแบบต่อเนื่องตามมุมที่ตัวละครหันเทียบกล้อง (ไม่กระโดดตาม 8 ทิศ)
  // ใช้ภาพ 2 มุมที่วาดออกมาดีที่สุด: แถว N = ปีกกางหลังตัวที่หันหน้าเข้าจอ · แถว S = แผ่นหลังที่หันหนีจอ
  // หันข้าง = บีบความกว้างปีก + เลื่อนไปทางหลังตัว → เปลี่ยนภาพตอนปีกแคบสุดจึงไม่สะดุด
  update(dt, ent, dirIdx, camera, visible) {
    this.mesh.visible = !!visible && !ent.dead;
    if (!this.mesh.visible) return;
    const p = this.p;
    // มุมหันเทียบจอ: 0 = หันหน้าเข้าจอ · +90° = หันขวา
    const right = this._r || (this._r = new THREE.Vector3()), back = this._b || (this._b = new THREE.Vector3());
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    back.setFromMatrixColumn(camera.matrixWorld, 2); back.y = 0; back.normalize();
    const fx = Math.sin(ent.angle || 0), fz = Math.cos(ent.angle || 0);
    const target = Math.atan2(fx * right.x + fz * right.z, fx * back.x + fz * back.z);
    if (this.ang === undefined) this.ang = target;
    const diff = Math.atan2(Math.sin(target - this.ang), Math.cos(target - this.ang));
    this.ang += diff * Math.min(1, dt * 12);   // หมุนตามนุ่ม ๆ
    const c = Math.cos(this.ang), sn = Math.sin(this.ang);
    const row = c >= 0 ? ROW.n : ROW.s, behind = c > -0.3;
    this.t += dt;
    const F = p.frames || 1, f = Math.floor(this.t * (p.fps || 8)) % F;
    this.tex.offset.set(f / F, 1 - (row + 1) / 8);
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    // ตัวสไปรต์ถูกดันเข้าหากล้อง 0.5 → ปีกหลังตัว 0.3 · ปีกหน้าตัว (หันหลังให้กล้อง) 0.7
    const push = behind ? 0.3 : 0.7, k = (dist - push) / dist;
    this.mesh.renderOrder = behind ? 38 : 42;
    const lift = (p.lift ?? 1.2) * (p.scale || 1);
    const sx = 0.32 + 0.68 * Math.abs(c);            // หันข้าง = ปีกแคบลง (เห็นจากด้านข้าง)
    this.mesh.position.copy(foot).addScaledVector(toCam, push);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.translateY(lift * k);
    this.mesh.translateX(-sn * (p.back ?? 0.45) * k);  // เลื่อนไปทางแผ่นหลังของตัวละคร
    this.mesh.scale.set(k * sx, k, 1);
  }

  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
