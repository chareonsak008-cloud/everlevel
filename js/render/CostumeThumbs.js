// ภาพไอคอนชิ้นแฟชั่น (v0.9) — เรนเดอร์ 3 มิติของชิ้นนั้นลงผืนผ้าใบเล็ก แล้วเก็บเป็น dataURL ไว้ใช้ซ้ำ
// ใช้ในตู้แฟชั่นและหน้าต่างเปิดกล่อง · สร้าง WebGL renderer แยกเฉพาะตอนที่ต้องใช้ครั้งแรก
import { THREE } from './three.js';
import { CharacterView } from './Characters.js';
import { PLAYER_LOOK, JOB_LOOK } from '../entities/Player.js';
import { costumeLook, wearCostume, makeRig, buildOnRig, CostumeRuntime } from './Costumes.js';
import { COSTUME_BY_ID } from '../data/costumes.js';

let R = null, tScene = null, tCam = null, BG = null;
const cache = new Map();

function thumbBg(c0, c1, c2, rays) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 58, 6, 64, 64, 92); gr.addColorStop(0, c0); gr.addColorStop(0.6, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  if (rays) { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = rays; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 96, a, a + 0.18); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

function init() {
  if (R) return true;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { console.warn('สร้างตัวเรนเดอร์ไอคอนแฟชั่นไม่ได้', e); R = null; return false; }
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1;
  tScene = new THREE.Scene();
  BG = {
    base: thumbBg('#4a3c6e', '#2c2344', '#1b1529'),
    legend: thumbBg('#6e5232', '#3a2a1e', '#1e1610', 'rgba(255,190,90,0.05)'),
    mythic: thumbBg('#7a2a3e', '#3a1428', '#1a0a14', 'rgba(255,90,110,0.07)'),
    celestial: thumbBg('#4a7a9a', '#2a3a6a', '#141a3a', 'rgba(200,240,255,0.08)'),
  };
  tScene.add(new THREE.HemisphereLight('#ffffff', '#6a5a7a', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 1.1); key.position.set(2, 4, 5); tScene.add(key);
  tCam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
  return true;
}

const VIEW_DIR = { wings: [0.55, 0.3, -1], back: [0.7, 0.3, -1], head: [0.45, 0.55, 1], face: [0.35, 0.08, 1], weapon: [1, 0.2, 0.25], pet: [0.3, 0.15, 1], outfit: [0.35, 0.1, 1], aura: [0.3, 0.6, 1], set: [0.45, 0.12, 1] };

function frameTo(box, dir, pad) {
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * 0.5 * pad + 0.02;
  const d = r / Math.tan((tCam.fov * Math.PI) / 360);
  tCam.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(d));
  tCam.lookAt(c);
}

function disposeTree(o) { o.traverse((m) => { if (m.geometry && !m.isSprite) m.geometry.dispose(); }); }

// it = ชิ้นแฟชั่น หรือชุดเซ็ต ({ items:[id] }) · size = ขนาดพิกเซล
function render(it, size) {
  const slot = it.items ? 'set' : it.slot;
  R.setSize(size, size, false);
  const holder = new THREE.Group(); tScene.add(holder);
  const rt = new CostumeRuntime(tScene); rt.setViewport(slot === 'aura' ? size * 2 : size, tCam.fov);
  let box;
  try {
    if (slot === 'outfit' || slot === 'set') {
      const items = slot === 'set'
        ? Object.fromEntries(it.items.map((id) => COSTUME_BY_ID[id]).filter((c) => c && c.slot !== 'aura' && c.slot !== 'pet').map((c) => [c.slot, c]))
        : { outfit: it };
      const look = costumeLook({ ...PLAYER_LOOK, ...JOB_LOOK.novice, weapon: 'none' }, items);
      const v = new CharacterView(look); holder.add(v.root);
      wearCostume(v, items, { world: holder, look, rt });
      v.update(0, { x: 0, y: 0, angle: 0, moving: false });
      box = new THREE.Box3().setFromObject(v.root);
      if (slot === 'outfit') { box.min.set(-0.45, 0.1, -0.3); box.max.set(0.45, 1.75, 0.3); }
    } else {
      const rig = makeRig(); holder.add(rig.root);
      buildOnRig(rig, it, rt, { hair: PLAYER_LOOK.hair });
      for (let i = 0; i < (slot === 'aura' ? 90 : 2); i++) rt.update(0.05, null);
      holder.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(rig.root);
      if (slot === 'aura' || box.isEmpty()) box = new THREE.Box3(new THREE.Vector3(-0.7, 0.2, -0.7), new THREE.Vector3(0.7, 1.9, 0.7));
      else if (it.wtype === 'staff') box.min.y = box.max.y - (box.max.y - box.min.y) * 0.45;   // คทายาว: เล็งหัวคทา
    }
    tScene.background = BG[it.rarity] || BG.base;
    frameTo(box, it.wtype === 'staff' ? [0.35, 0.15, 1] : VIEW_DIR[slot] || [0.4, 0.2, 1], slot === 'aura' ? 0.95 : slot === 'outfit' || slot === 'set' || slot === 'wings' ? 1.05 : 1.2);
    R.render(tScene, tCam);
    return R.domElement.toDataURL();
  } finally {
    tScene.remove(holder); disposeTree(holder); rt.dispose();
  }
}

// ได้ภาพทันที (ใช้ตอนเปิดกล่อง) — คืน '' ถ้าเรนเดอร์ไม่ได้
export function thumbNow(it, size = 128) {
  const k = it.id + '@' + size;
  if (cache.has(k)) return cache.get(k);
  let url = '';
  if (init()) { try { url = render(it, size); } catch (e) { console.warn('ไอคอนแฟชั่น', it.id, e); } }
  cache.set(k, url);
  return url;
}

export const hasThumb = (it, size = 128) => cache.has(it.id + '@' + size);

// ทยอยเรนเดอร์ทีละชิ้น ไม่ให้เกมกระตุก · img ที่ถูกถอดออกจากหน้าแล้วจะถูกข้าม
let queue = [], busy = false;
export function requestThumb(it, img, size = 128) {
  const k = it.id + '@' + size;
  if (cache.has(k)) { img.src = cache.get(k); return; }
  queue.push({ it, img, size });
  if (!busy) { busy = true; setTimeout(pump, 0); }
}
export function clearThumbQueue() { queue = []; }
function pump() {
  const t0 = performance.now();
  while (queue.length && performance.now() - t0 < 12) {
    const job = queue.shift();
    if (!job.img.isConnected) continue;
    const url = thumbNow(job.it, job.size);
    if (url) job.img.src = url;
  }
  if (queue.length) setTimeout(pump, 16); else busy = false;
}
