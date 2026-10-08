// รูปย่อสัตว์เลี้ยง (v0.13) — เรนเดอร์โมเดล 3 มิติลงผืนผ้าใบเล็ก แล้วเก็บเป็น dataURL ใช้ซ้ำในหน้าต่างสัตว์เลี้ยง
// สร้าง WebGL renderer แยกเฉพาะตอนเปิดหน้าต่างครั้งแรก
import { THREE } from './three.js';
import { PetView } from './Pets.js';

let R = null, scene = null, cam = null;
const cache = new Map();

function init() {
  if (R) return true;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 160;
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { console.warn('สร้างตัวเรนเดอร์รูปสัตว์เลี้ยงไม่ได้', e); R = null; return false; }
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  R.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#e8f0ff', '#5a4a6a', 0.9));
  const key = new THREE.DirectionalLight('#fff0d6', 1.3); key.position.set(3, 7, 4.5); scene.add(key);
  const rim = new THREE.DirectionalLight('#c0a8ff', 0.5); rim.position.set(-4, 3, -5); scene.add(rim);
  cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  return true;
}

// v0.14: ถ่ายรูปโมเดลใด ๆ (ใช้ร่วมกับรูปมอนสเตอร์ในหน้าต่างออโต้) · build(scene) คืน { bounds: Sphere, dispose(), fill? }
export function snapThumb(key, size, build) {
  if (cache.has(key)) return cache.get(key);
  if (!init()) return '';
  let made = null;
  try { made = build(scene); } catch (e) { console.warn('สร้างรูปย่อไม่สำเร็จ', key, e); }
  if (!made) return '';
  R.setSize(size, size, false);
  const bs = made.bounds;
  const d = (bs.radius / Math.sin((cam.fov * Math.PI) / 360)) * (made.fill || 1.0);
  cam.position.set(bs.center.x + Math.sin(0.55) * d, bs.center.y + d * 0.28, bs.center.z + Math.cos(0.55) * d);
  cam.lookAt(bs.center);
  R.render(scene, cam);
  const url = R.domElement.toDataURL('image/png');
  made.dispose();
  cache.set(key, url);
  return url;
}

// คืน dataURL ของรูปสัตว์เลี้ยง (หรือ '' ถ้าเครื่องนี้สร้าง WebGL เพิ่มไม่ได้)
export function petThumb(id, size = 160) {
  return snapThumb(id + '@' + size, size, (sc) => {
    const p = new PetView(id, { world: sc });
    p.t = 0.6; p.update(0.016);
    sc.add(p.root);
    return { bounds: p.bounds(), dispose: () => p.dispose() };
  });
}
