// สไตล์อนิเมะ: แรเงาแบบเซล (toon), เส้นขอบดำ (outline), ใบหน้าตาโต และกะพริบตา
import { THREE } from './three.js';
import { lin, mergeGeometries } from './Geo.js';
import { shadeHex } from './Textures.js';

/* ---------- แรเงา 3 ระดับแบบการ์ตูน ---------- */
let grad = null;
export function gradientMap() {
  if (!grad) {
    grad = new THREE.DataTexture(new Uint8Array([92, 160, 228]), 3, 1, THREE.LuminanceFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter;
    grad.generateMipmaps = false;
    grad.needsUpdate = true;
  }
  return grad;
}

const cache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isColor ? '#' + v.getHexString() : v));
  if (!cache.has(key)) {
    const o = { ...opts };
    if (typeof o.emissive === 'string') o.emissive = lin(o.emissive);
    cache.set(key, new THREE.MeshToonMaterial({ color: lin(color), gradientMap: gradientMap(), ...o }));
  }
  return cache.get(key);
}

// วัสดุ toon เฉพาะตัว (ใช้กับมอนสเตอร์ที่ต้องกระพริบขาวตอนโดนตี)
export function toonOwn(color, opts = {}) {
  const o = { ...opts };
  if (typeof o.emissive === 'string') o.emissive = lin(o.emissive);
  return new THREE.MeshToonMaterial({ color: lin(color), gradientMap: gradientMap(), ...o });
}

/* ---------- เส้นขอบ: วาดด้านหลังของโมเดลที่ขยายออกตาม normal ---------- */
const outlineCache = new Map();
export function outlineMaterial(thick = 0.011, color = '#2a1d2c') {
  const key = thick + color;
  if (!outlineCache.has(key)) {
    const m = new THREE.MeshBasicMaterial({ color: lin(color), side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thick.toFixed(4)};`);
    };
    m.customProgramCacheKey = () => 'outline' + thick;
    outlineCache.set(key, m);
  }
  return outlineCache.get(key);
}

export function addOutline(mesh, thick) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(thick));
  o.castShadow = false; o.receiveShadow = false;
  o.userData.outline = true;
  mesh.add(o);
  return o;
}

// รวม mesh ลูกที่ใช้วัสดุเดียวกันเป็นชิ้นเดียว แล้วใส่เส้นขอบ (ลด draw call มาก)
export function bake(group, { outline = true, thick } = {}) {
  const buckets = new Map();
  for (const c of [...group.children]) {
    if (!c.isMesh || c.userData.keep) continue;
    c.updateMatrix();
    const k = c.material.uuid;
    if (!buckets.has(k)) buckets.set(k, { mat: c.material, geos: [], cast: c.castShadow, line: !c.userData.noOutline });
    const b = buckets.get(k);
    b.geos.push(c.geometry.clone().applyMatrix4(c.matrix));
    if (c.userData.noOutline) b.line = false;
    group.remove(c); c.geometry.dispose();
  }
  const out = [];
  for (const { mat, geos, cast, line } of buckets.values()) {
    const m = new THREE.Mesh(geos.length === 1 ? geos[0] : mergeGeometries(geos), mat);
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m); out.push(m);
    if (outline && line && !mat.transparent) addOutline(m, thick);
  }
  return out;
}

/* ---------- ใบหน้าอนิเมะ (วาดลง canvas แล้วแปะบนหัว) ---------- */
const faceCache = new Map();
export function faceTexture(eye = '#3a2440', closed = false, opts = {}) {
  const key = eye + closed + JSON.stringify(opts);
  if (faceCache.has(key)) return faceCache.get(key);
  const W = 256, H = 180;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const line = '#2a1820';
  const ell = (x, y, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

  const drawEye = (cx, cy, side) => {           // side: -1 = ตาซ้ายบนจอ, +1 = ตาขวา
    const w = opts.small ? 40 : 48, h = opts.small ? 54 : 64;
    if (!closed) {
      ell(cx, cy + 3, w * 0.52, h * 0.47, '#fffdf8');
      const gr = g.createLinearGradient(0, cy - h * 0.4, 0, cy + h * 0.45);
      gr.addColorStop(0, shadeHex(eye, -0.55)); gr.addColorStop(0.45, eye); gr.addColorStop(1, shadeHex(eye, 0.45));
      ell(cx, cy + 6, w * 0.42, h * 0.43, gr);
      ell(cx, cy + 7, w * 0.2, h * 0.24, shadeHex(eye, -0.65));
      g.strokeStyle = shadeHex(eye, 0.55); g.lineWidth = 2.5;
      g.beginPath(); g.arc(cx, cy + 9, w * 0.3, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      ell(cx - w * 0.15, cy - h * 0.08, w * 0.15, h * 0.13, '#ffffff');
      ell(cx + w * 0.14, cy + h * 0.2, w * 0.07, h * 0.06, '#ffffff');
      // ขนตาบน หนา + ปลายตวัด
      g.strokeStyle = line; g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(cx - side * w * 0.56, cy - h * 0.02);
      g.quadraticCurveTo(cx, cy - h * 0.62, cx + side * w * 0.56, cy - h * 0.16);
      g.stroke();
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx + side * w * 0.5, cy - h * 0.14); g.lineTo(cx + side * w * 0.72, cy - h * 0.24); g.stroke();
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(cx - w * 0.28, cy + h * 0.47); g.quadraticCurveTo(cx, cy + h * 0.53, cx + w * 0.28, cy + h * 0.47); g.stroke();
    } else {
      g.strokeStyle = line; g.lineCap = 'round'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(cx - w * 0.5, cy + 6); g.quadraticCurveTo(cx, cy + 18, cx + w * 0.5, cy + 6); g.stroke();
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx + side * w * 0.45, cy + 8); g.lineTo(cx + side * w * 0.65, cy + 2); g.stroke();
    }
    // คิ้ว
    g.strokeStyle = shadeHex(opts.brow || '#5a3a2a', -0.1); g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - side * w * 0.38, cy - h * 0.72); g.quadraticCurveTo(cx, cy - h * 0.86, cx + side * w * 0.42, cy - h * 0.74); g.stroke();
  };

  drawEye(82, 84, -1);
  drawEye(174, 84, 1);
  // แก้มแดง
  for (const x of [62, 194]) {
    const gr = g.createRadialGradient(x, 124, 1, x, 124, 18);
    gr.addColorStop(0, 'rgba(255,130,150,0.55)'); gr.addColorStop(1, 'rgba(255,130,150,0)');
    g.fillStyle = gr; g.fillRect(x - 20, 104, 40, 40);
    g.strokeStyle = 'rgba(230,90,110,0.5)'; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 8 + i * 6, 128); g.lineTo(x - 5 + i * 6, 120); g.stroke(); }
  }
  // ปาก
  g.strokeStyle = line; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath();
  if (opts.mouth === 'open') { g.fillStyle = '#8a2a36'; g.ellipse(128, 146, 8, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
  else { g.moveTo(118, 142); g.quadraticCurveTo(128, 150, 138, 142); g.stroke(); }

  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  faceCache.set(key, t);
  return t;
}

const faceMatCache = new Map();
export function faceMaterial(eye, closed, opts) {
  const key = eye + closed + JSON.stringify(opts || {});
  if (!faceMatCache.has(key)) {
    faceMatCache.set(key, new THREE.MeshToonMaterial({
      map: faceTexture(eye, closed, opts), gradientMap: gradientMap(), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
  }
  return faceMatCache.get(key);
}
