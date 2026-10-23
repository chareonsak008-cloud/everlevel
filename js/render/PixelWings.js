// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js?v=0.93.0-p1.10';
import { VERSION } from '../config.js?v=0.93.0-p1.10';

const PXW = 3.55 / 96;   // หน่วยโลกต่อพิกเซล (เท่าตัวละครพิกเซล)
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
const DIR8 = ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'];   // ดัชนีทิศเทียบจอ (เหมือน SheetChars)
// โหลดแยกต่อตัว (offset ต่างกัน · เบราว์เซอร์แคชไฟล์ให้อยู่แล้ว — ห้าม clone ก่อนภาพโหลดเสร็จ)
function wingTexture(p) {
  const t = new THREE.TextureLoader().load(`assets/fashion/wings/${p.px}.png?v=${VERSION}`);
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

  // v0.40.1: ใช้ภาพปีกครบ 8 ทิศ เปลี่ยนทิศพร้อมตัวละคร (ทิศเดียวกับแผ่นตัวละคร → ไม่ลอย/ไม่บีบภาพ)
  update(dt, ent, dirIdx, camera, visible) {
    this.mesh.visible = !!visible && !ent.dead;
    if (!this.mesh.visible) return;
    const p = this.p;
    const di = ((dirIdx | 0) % 8 + 8) % 8, d = DIR8[di];
    const row = d === 's' ? ROW.n : d === 'n' ? ROW.s : ROW[d];   // หน้า/หลัง = ภาพปีกกางเต็ม · ข้าง/เฉียง = ภาพทิศเดียวกับตัว (ปีกอยู่ฝั่งหลังพอดี)
    const sn = Math.sin(di * Math.PI / 4);                  // +1 = หันขวา · -1 = หันซ้าย
    const behind = d !== 'n' && d !== 'ne' && d !== 'nw';   // หันหลังให้จอ → ปีกอยู่หน้าตัว
    this.t += dt;
    const F = p.frames || 1, f = Math.floor(this.t * (p.fps || 8)) % F;
    this.tex.offset.set(f / F, 1 - (row + 1) / 8);
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    // ตัวสไปรต์ถูกดันเข้าหากล้อง 0.5 → ปีกหลังตัว 0.3 · ปีกหน้าตัว 0.7
    const push = behind ? 0.3 : 0.7, k = (dist - push) / dist;
    this.mesh.renderOrder = behind ? 38 : 42;
    const side = Math.abs(sn) > 0.9 ? 1 : 0;   // หันข้างเท่านั้นที่ขยับปีกไปทางหลัง (เฉียง/หน้า/หลัง = กลางตัว)
    const diag = !side && Math.abs(sn) > 0.5 ? 1 : 0;
    const sc = side ? 0.72 : diag ? 0.88 : 0.94;   // v0.40.4 หันข้าง = ปีกเล็กลงแนบหลัง (ไม่ชูสูงเกินหัว)
    const lift = (p.lift ?? 1.2) * (p.scale || 1) * (this.liftK || 1) * (side ? 0.86 : diag ? 0.94 : 1);
    this.mesh.position.copy(foot).addScaledVector(toCam, push);
    this.mesh.quaternion.copy(camera.quaternion);
    this.mesh.translateY((lift + (this.ay || 0)) * k);   // v0.40.5 ขยับตามตัว (เดินโยก/ฟันพุ่ง)
    this.mesh.translateX((-Math.sign(sn) * side * (p.back ?? 0.14) + (this.ax || 0)) * k);   // ชิดแผ่นหลังของตัวละคร
    this.mesh.scale.set(k * sc, k * sc, 1);
  }

  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
