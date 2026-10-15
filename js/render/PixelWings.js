// v0.35: ปีกแฟชั่นภาพพิกเซล 8 ทิศ (จาก PixelLab) — แผ่นป้ายหันหากล้อง วางซ้อนหลัง/หน้าตัวละครพิกเซลตามทิศที่หัน
// แผ่นภาพ assets/fashion/wings/<key>.png : 8 แถว (N·NE·E·SE·S·SW·W·NW) × F คอลัมน์ (เฟรมกระพือ) · ช่องละ cell px
// ค่าในชิ้นแฟชั่น p = { px: key, cell, frames, fps, lift, scale }
import { THREE } from './three.js';
import { DIR8 } from './SheetChars.js';

const PXW = 3.55 / 96;   // หน่วยโลกต่อพิกเซล (เท่าตัวละครพิกเซล)
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
const BEHIND = { s: 1, se: 1, sw: 1, e: 1, w: 1 };   // หันเข้าหากล้อง/ด้านข้าง → ปีกอยู่หลังตัว · หันหลัง → ปีกอยู่หน้าตัว
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

  // dir = ดัชนีทิศของตัวละคร (ตาม DIR8 ใน SheetChars) · foot = จุดเท้าตัวละคร (โลก)
  update(dt, ent, dirIdx, camera, visible) {
    this.mesh.visible = !!visible && !ent.dead;
    if (!this.mesh.visible) return;
    // ภาพปีกจาก PixelLab "หัน" ออกจากตัวผู้สวม (ปลายปีกชี้ไปทางทิศของภาพ) → ใช้แถวทิศตรงข้ามกับทิศที่ตัวละครหัน
    const p = this.p, d = DIR8[dirIdx] || 's', behind = !!BEHIND[d], od = DIR8[(dirIdx + 4) % 8] || 'n';
    this.t += dt;
    const F = p.frames || 1, f = Math.floor(this.t * (p.fps || 8)) % F;
    this.tex.offset.set(f / F, 1 - (ROW[od] + 1) / 8);
    const foot = this._c.set(ent.x / 16, ent.lift || 0, ent.y / 16);
    const toCam = this._d.copy(camera.position).sub(foot); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
    // ตัวสไปรต์ถูกดันเข้าหากล้อง 0.5 → ปีกหลังตัว 0.3 · ปีกหน้าตัว (หันหลังให้กล้อง) 0.7
    const push = behind ? 0.3 : 0.7, k = (dist - push) / dist;
    this.mesh.renderOrder = behind ? 38 : 42;
    const lift = (p.lift ?? 1.45) * (p.scale || 1);
    this.mesh.position.copy(foot).addScaledVector(toCam, push);
    this.mesh.quaternion.copy(camera.quaternion);
    // ยกขึ้นไปที่ระดับไหล่ตามแกนตั้งของจอ (ชดเชยการดันเข้าหากล้อง)
    this.mesh.translateY(lift * k);
    this.mesh.scale.setScalar(k);
  }

  dispose() { this.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
