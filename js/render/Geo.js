// เครื่องมือเรขาคณิต: กล่องที่ UV ตามขนาดจริง, รวม geometry, วัสดุแคช
import { THREE } from './three.js';

const matCache = new Map();
export function material(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

// สีที่เขียนเป็น hex คือค่า sRGB → แปลงเป็น linear ให้ตรงกับที่ตาเห็น (ไม่ซีด)
export const lin = (c) => new THREE.Color(c).convertSRGBToLinear();

export function std(key, opts) {
  return material(key, () => {
    const o = { roughness: 0.85, metalness: 0, ...opts };
    if (o.color !== undefined) o.color = lin(o.color);
    if (o.emissive !== undefined) o.emissive = lin(o.emissive);
    return new THREE.MeshStandardMaterial(o);
  });
}

// ปรับ UV ของ BoxGeometry ให้เท็กซ์เจอร์ไม่ยืด (1 รอบ = uvScale หน่วยโลก)
// v0.17: โหมดพิกเซลบังคับ 1 รอบลาย = 1 หน่วยโลก (ความละเอียดลายเท่ากันทุกชิ้น)
export const GEO = { pxUV: false };
export function boxGeo(w, h, d, uvScale = 1) {
  if (GEO.pxUV) uvScale = 1;
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) {
    const [a, b] = dims[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * a) / uvScale, (uv.getY(i) * b) / uvScale);
    }
  }
  return g;
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

export function box(parent, w, h, d, mat, x, y, z, uvScale = 1) {
  return mesh(boxGeo(w, h, d, uvScale), mat, x, y, z, parent);
}

export function cyl(parent, rt, rb, h, seg, mat, x, y, z) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent);
}

export function sphere(parent, r, mat, x, y, z, ws = 16, hs = 12) {
  return mesh(new THREE.SphereGeometry(r, ws, hs), mat, x, y, z, parent);
}

// รวม geometry หลายชิ้นเป็นชิ้นเดียว (ต้องมี position/normal และ uv หรือ color ตามที่ระบุ)
export function mergeGeometries(list, { uv = true, color = false } = {}) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const uvs = uv ? new Float32Array(n * 2) : null, cols = color ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (!g.attributes.normal) g.computeVertexNormals();
    nor.set(g.attributes.normal.array, o * 3);
    if (uvs && g.attributes.uv) uvs.set(g.attributes.uv.array, o * 2);
    if (cols && g.attributes.color) cols.set(g.attributes.color.array, o * 3);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uvs) out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (cols) out.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return out;
}

// ใส่สีให้ทุกจุดของ geometry (ใช้กับต้นไม้/หญ้าที่ใช้ vertex color)
export function paint(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), i); col.convertSRGBToLinear(); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// รวมทุก mesh นิ่งในกลุ่มตามวัสดุ เพื่อลด draw call (ลื่นขึ้นมาก โดยเฉพาะมือถือ)
export function batchStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map(), remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.dynamic || o.material.vertexColors) return;
    const key = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    buckets.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  const out = new THREE.Group();
  for (const { mat, cast, geos } of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = cast; m.receiveShadow = true;
    out.add(m);
  }
  return out;
}
