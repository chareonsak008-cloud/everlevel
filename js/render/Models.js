// โมเดล 3 มิติของสิ่งปลูกสร้างและของตกแต่ง (สร้างจากรูปทรงพื้นฐาน)
// หน่วย: 1 = 1 ช่องแผนที่ | ด้านหน้าของโมเดลหันไปทาง +z (ทิศใต้)
import { THREE } from './three.js';
import { std, box, cyl, sphere, mesh, boxGeo, mergeGeometries, paint } from './Geo.js';
import { stoneTexture, plasterTexture, shingleTexture, woodTexture, crateTexture, stripeTexture, signTexture, glowTexture, shadeHex } from './Textures.js';
import { rng } from '../core/util.js';

/* ---------- วัสดุ ---------- */
const M = {
  stone: () => std('stone', { map: stoneTexture('#a29ca4'), roughness: 0.92 }),
  stoneLight: () => std('stoneLight', { map: stoneTexture('#d2cbbd'), roughness: 0.85 }),
  wallStone: () => std('wallStone', { map: stoneTexture('#9c97a3'), roughness: 0.95 }),
  beam: () => std('beam', { map: woodTexture('#5e3f27'), roughness: 0.8 }),
  wood: () => std('wood', { map: woodTexture('#9b6b3e'), roughness: 0.8 }),
  woodLight: () => std('woodLight', { map: woodTexture('#b98a58', false), roughness: 0.75 }),
  door: () => std('door', { map: woodTexture('#8a5530'), roughness: 0.7 }),
  metal: () => std('metal', { color: '#3a3b44', roughness: 0.45, metalness: 0.6 }),
  gold: () => std('gold', { color: '#e8c050', roughness: 0.35, metalness: 0.8 }),
  glass: () => std('glass', { color: '#a6d4ea', emissive: '#ffcf7a', emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.1 }),
  lantern: () => std('lantern', { color: '#ffe2a0', emissive: '#ffbf55', emissiveIntensity: 1.6, roughness: 0.3 }),
  plaster: (c) => std('plaster' + c, { map: plasterTexture(c), roughness: 0.95 }),
  roof: (c) => std('roof' + c, { map: shingleTexture(c), roughness: 0.75 }),
  color: (c, rough = 0.8) => std('c' + c + rough, { color: c, roughness: rough }),
  crate: () => std('crate', { map: crateTexture(), roughness: 0.8 }),
  stripe: (c) => std('stripe' + c, { map: stripeTexture(c), roughness: 0.9, side: THREE.DoubleSide }),
};

/* ---------- บ้าน ---------- */
export function house(o) {
  const g = new THREE.Group();
  const w = o.w || 5, W = w - 0.35, D = 3 - 0.55, Hw = 1.65, base = 0.28;
  const plaster = M.plaster(o.wall || '#ecdcb8'), beam = M.beam();
  const top = base + Hw;

  box(g, W + 0.16, base, D + 0.16, M.stone(), 0, base / 2, 0, 1.2);
  box(g, W, Hw, D, plaster, 0, base + Hw / 2, 0);

  // โครงไม้ (half-timber)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.16, Hw, 0.16, beam, sx * W / 2, base + Hw / 2, sz * D / 2);
  for (const sz of [-1, 1]) {
    box(g, W + 0.04, 0.11, 0.07, beam, 0, base + Hw * 0.52, sz * (D / 2 + 0.02));
    box(g, W + 0.06, 0.13, 0.08, beam, 0, top - 0.05, sz * (D / 2 + 0.02));
  }
  for (const sx of [-1, 1]) {
    box(g, 0.07, 0.11, D + 0.04, beam, sx * (W / 2 + 0.02), base + Hw * 0.52, 0);
    box(g, 0.08, 0.13, D + 0.06, beam, sx * (W / 2 + 0.02), top - 0.05, 0);
  }
  for (const px of [-W / 4, W / 4]) box(g, 0.1, Hw, 0.06, beam, px * 1.0, base + Hw / 2, D / 2 + 0.02);

  // ประตู + กันสาด + บันได
  const fz = D / 2;
  box(g, 0.7, 1.08, 0.1, beam, 0, base + 0.54, fz + 0.03);
  box(g, 0.56, 0.98, 0.1, M.door(), 0, base + 0.49, fz + 0.06, 0.6);
  sphere(g, 0.035, M.gold(), 0.18, base + 0.5, fz + 0.13, 8, 6);
  box(g, 0.95, 0.12, 0.38, M.stone(), 0, 0.06, fz + 0.27);
  const awn = box(g, 0.95, 0.06, 0.42, M.roof(o.roof || '#b5473a'), 0, base + 1.2, fz + 0.2);
  awn.rotation.x = 0.35;

  // หน้าต่าง + กระบะดอกไม้
  const r = rng(o.seed || 1);
  const win = (x, z, rotY) => {
    const wg = new THREE.Group(); wg.position.set(x, base + 0.98, z); wg.rotation.y = rotY; g.add(wg);
    box(wg, 0.62, 0.56, 0.08, beam, 0, 0, 0);
    box(wg, 0.5, 0.44, 0.09, M.glass(), 0, 0, 0.01);
    box(wg, 0.04, 0.44, 0.1, beam, 0, 0, 0.02); box(wg, 0.5, 0.04, 0.1, beam, 0, 0, 0.02);
    box(wg, 0.7, 0.13, 0.2, M.wood(), 0, -0.35, 0.08);
    const cols = ['#ff7aa8', '#ffd65a', '#ffffff', '#ff8a4a', '#b48cff'];
    for (let i = 0; i < 4; i++) sphere(wg, 0.06, M.color(cols[(r() * cols.length) | 0], 0.6), -0.24 + i * 0.16, -0.26, 0.1, 8, 6);
    for (let i = 0; i < 3; i++) sphere(wg, 0.07, M.color('#4f8f3a'), -0.16 + i * 0.16, -0.29, 0.06, 8, 6);
  };
  if (w >= 5) { win(-W / 2 + 0.72, fz + 0.03, 0); win(W / 2 - 0.72, fz + 0.03, 0); }
  win(-W / 2 - 0.03, 0, -Math.PI / 2); win(W / 2 + 0.03, 0, Math.PI / 2);

  // หลังคาจั่ว
  const ov = 0.32, rh = 1.3, half = D / 2 + ov, rw = W + ov * 2;
  const slope = Math.hypot(half, rh), ang = Math.atan2(rh, half);
  const roofMat = M.roof(o.roof || '#b5473a');
  for (const s of [1, -1]) {
    const slab = mesh(boxGeo(rw, 0.1, slope + 0.05, 0.5), roofMat, 0, top + rh / 2 + 0.05, (s * half) / 2, g);
    slab.rotation.x = s * ang;
  }
  const ridge = box(g, rw + 0.06, 0.14, 0.14, M.color(shadeHex(o.roof || '#b5473a', -0.35)), 0, top + rh + 0.06, 0);
  ridge.rotation.x = Math.PI / 4;
  // หน้าจั่ว
  const shape = new THREE.Shape();
  shape.moveTo(-D / 2 - 0.04, 0); shape.lineTo(D / 2 + 0.04, 0); shape.lineTo(0, rh - 0.02); shape.closePath();
  const gable = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const m = mesh(gable, plaster, s > 0 ? W / 2 - 0.06 : -W / 2, top, 0, g);
    m.rotation.y = Math.PI / 2;
    box(g, 0.05, rh * 0.85, 0.08, beam, s * (W / 2 + 0.01), top + rh * 0.42, 0);
  }
  // ปล่องไฟ
  box(g, 0.42, 1.15, 0.42, M.stone(), W * 0.26, top + rh * 0.62, -half * 0.42, 0.8);
  box(g, 0.52, 0.09, 0.52, M.color('#6a6470'), W * 0.26, top + rh * 0.62 + 0.6, -half * 0.42);
  return g;
}

/* ---------- หอคอย ---------- */
export function tower(o) {
  const g = new THREE.Group();
  const h = 2.9;
  const body = mesh(new THREE.CylinderGeometry(0.92, 1.0, h, 20), M.wallStone(), 0, h / 2, 0, g);
  scaleCylUV(body.geometry, 6, 3);
  cyl(g, 1.06, 1.06, 0.22, 20, M.stone(), 0, h, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = box(g, 0.28, 0.32, 0.22, M.stone(), Math.cos(a) * 0.95, h + 0.27, Math.sin(a) * 0.95);
    m.rotation.y = -a;
  }
  const cone = mesh(new THREE.ConeGeometry(1.22, 1.5, 20), M.roof(o.roof || '#b5473a'), 0, h + 1.05, 0, g);
  cyl(g, 0.025, 0.025, 0.9, 6, M.metal(), 0, h + 2.1, 0);
  const flag = mesh(new THREE.PlaneGeometry(0.55, 0.32), M.color(o.roof || '#b5473a', 0.7), 0.29, h + 2.38, 0, g);
  flag.material = std('flag' + (o.roof || ''), { color: o.roof || '#b5473a', side: THREE.DoubleSide });
  flag.userData.dynamic = true; flag.userData.flag = true;
  // ช่องหน้าต่าง
  for (const a of [0.5, 2.6, 4.2]) {
    const m = box(g, 0.18, 0.36, 0.1, M.color('#2a2530'), Math.sin(a) * 0.97, h * 0.62, Math.cos(a) * 0.97);
    m.rotation.y = a;
  }
  return g;
}

function scaleCylUV(geo, su, sv) {
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}

/* ---------- น้ำพุ (ส่วนนิ่ง) ---------- */
export function fountain() {
  const g = new THREE.Group();
  const prof = [[0, 0.3], [1.36, 0.3], [1.38, 0.05], [1.52, 0], [1.56, 0.06], [1.56, 0.5], [1.62, 0.55], [1.62, 0.64], [1.42, 0.66], [1.36, 0.62], [1.32, 0.34]];
  const basin = mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48), M.stoneLight(), 0, 0, 0, g);
  scaleCylUV(basin.geometry, 8, 1);
  const col = [[0, 0.3], [0.26, 0.3], [0.22, 0.45], [0.16, 0.6], [0.14, 1.1], [0.2, 1.25], [0.12, 1.32], [0, 1.32]];
  mesh(new THREE.LatheGeometry(col.map(([x, y]) => new THREE.Vector2(x, y)), 24), M.stoneLight(), 0, 0, 0, g);
  const bowl = [[0, 1.3], [0.2, 1.3], [0.55, 1.42], [0.62, 1.52], [0.56, 1.54], [0.2, 1.42], [0, 1.42]];
  mesh(new THREE.LatheGeometry(bowl.map(([x, y]) => new THREE.Vector2(x, y)), 32), M.stoneLight(), 0, 0, 0, g);
  const spout = [[0, 1.42], [0.1, 1.44], [0.06, 1.62], [0.1, 1.72], [0.05, 1.8], [0, 1.8]];
  mesh(new THREE.LatheGeometry(spout.map(([x, y]) => new THREE.Vector2(x, y)), 16), M.stoneLight(), 0, 0, 0, g);
  return g;
}

/* ---------- ตะเกียง ---------- */
export function lamp() {
  // เสาไฟคู่สีเขียวหยก แบบเมืองหลวง
  const g = new THREE.Group();
  const teal = M.color('#2f6f6a', 0.45), tealDark = M.color('#1f4a47', 0.5);
  cyl(g, 0.14, 0.18, 0.2, 12, tealDark, 0, 0.1, 0);
  cyl(g, 0.045, 0.055, 1.95, 10, teal, 0, 1.1, 0);
  cyl(g, 0.075, 0.075, 0.06, 12, tealDark, 0, 0.5, 0);
  box(g, 0.74, 0.05, 0.06, teal, 0, 2.06, 0);
  sphere(g, 0.06, tealDark, 0, 2.12, 0, 10, 8);
  for (const sx of [-1, 1]) {
    cyl(g, 0.012, 0.012, 0.1, 6, tealDark, sx * 0.32, 2.0, 0);
    box(g, 0.17, 0.22, 0.17, M.lantern(), sx * 0.32, 1.85, 0);
    for (const ox of [-1, 1]) for (const oz of [-1, 1]) box(g, 0.02, 0.24, 0.02, tealDark, sx * 0.32 + ox * 0.085, 1.85, oz * 0.085);
    const cap = mesh(new THREE.ConeGeometry(0.15, 0.12, 4), teal, sx * 0.32, 2.0, 0, g); cap.rotation.y = Math.PI / 4;
  }
  return g;
}

export function glowSprite(color = '#ffcc77', scale = 1.4, opacity = 0.55) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(scale, scale, 1);
  return s;
}

/* ---------- แผงตลาด ---------- */
export function stall(o) {
  const g = new THREE.Group();
  const c = o.color || '#d84a4a', r = rng(o.seed || 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.045, 0.05, sz > 0 ? 1.45 : 1.75, 8, M.wood(), sx * 1.3, (sz > 0 ? 1.45 : 1.75) / 2, sz * 0.32);
  box(g, 2.7, 0.62, 0.62, M.woodLight(), 0, 0.31, 0.05, 0.6);
  box(g, 2.8, 0.06, 0.7, M.wood(), 0, 0.64, 0.05);
  const awn = mesh(boxGeo(2.95, 0.04, 1.05, 1), M.stripe(c), 0, 1.62, 0, g); awn.rotation.x = 0.32;
  const val = mesh(new THREE.PlaneGeometry(2.95, 0.2), M.stripe(c), 0, 1.38, 0.52, g);
  val.castShadow = false;
  const goods = ['#d83a3a', '#f0c040', '#6ab04a', '#f07a30', '#a0522d', '#ffe9a8'];
  for (let i = 0; i < 14; i++) sphere(g, 0.07 + r() * 0.03, M.color(goods[(r() * goods.length) | 0], 0.55), -1.15 + (i % 7) * 0.38 + r() * 0.05, 0.73, -0.12 + Math.floor(i / 7) * 0.24, 10, 8);
  box(g, 0.4, 0.3, 0.4, M.crate(), 1.05, 0.15, 0.5, 0.4);
  return g;
}

/* ---------- บ่อน้ำ ---------- */
export function well() {
  const g = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.62, 20, 1, true), M.stone(), 0, 0.31, 0, g);
  ring.material = std('stoneDouble', { map: stoneTexture('#a29ca4'), roughness: 0.92, side: THREE.DoubleSide });
  scaleCylUV(ring.geometry, 3.5, 0.6);
  const rim = mesh(new THREE.TorusGeometry(0.56, 0.08, 8, 24), M.stoneLight(), 0, 0.63, 0, g); rim.rotation.x = Math.PI / 2;
  const water = mesh(new THREE.CircleGeometry(0.52, 20), M.color('#1d3f52', 0.2), 0, 0.42, 0, g); water.rotation.x = -Math.PI / 2;
  for (const sx of [-1, 1]) box(g, 0.1, 1.3, 0.1, M.wood(), sx * 0.62, 0.65, 0);
  box(g, 1.4, 0.07, 0.07, M.wood(), 0, 1.2, 0);
  for (const s of [1, -1]) { const sl = box(g, 1.55, 0.05, 0.62, M.roof('#8a4a3a'), 0, 1.5, s * 0.24, 0.5); sl.rotation.x = s * 0.62; }
  cyl(g, 0.1, 0.08, 0.16, 10, M.wood(), 0, 0.95, 0);
  return g;
}

export function crate() {
  const g = new THREE.Group();
  const m = box(g, 0.72, 0.72, 0.72, M.crate(), 0, 0.36, 0, 0.72); m.rotation.y = 0.2;
  return g;
}

export function barrel() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.26, 0], [0.31, 0.2], [0.33, 0.38], [0.31, 0.58], [0.26, 0.76], [0, 0.76]];
  const b = mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 16), M.wood(), 0, 0, 0, g);
  scaleCylUV(b.geometry, 2, 0.8);
  for (const y of [0.16, 0.6]) { const t = mesh(new THREE.TorusGeometry(0.315, 0.02, 6, 20), M.metal(), 0, y, 0, g); t.rotation.x = Math.PI / 2; }
  return g;
}

export function bench() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) box(g, 1.7, 0.05, 0.12, M.woodLight(), 0, 0.42, -0.14 + i * 0.14);
  for (let i = 0; i < 2; i++) box(g, 1.7, 0.1, 0.04, M.woodLight(), 0, 0.62 + i * 0.16, -0.26);
  for (const sx of [-1, 1]) { box(g, 0.07, 0.42, 0.4, M.metal(), sx * 0.75, 0.21, 0); box(g, 0.06, 0.5, 0.05, M.metal(), sx * 0.75, 0.66, -0.26); }
  return g;
}

export function sign(o) {
  const g = new THREE.Group();
  cyl(g, 0.05, 0.06, 1.4, 8, M.wood(), 0, 0.7, 0);
  const tex = signTexture(o.text || 'Beginner Field ➜');
  const mat = std('sign' + (o.text || ''), { map: tex, roughness: 0.8 });
  const board = box(g, 1.0, 0.38, 0.06, [M.wood(), M.wood(), M.wood(), M.wood(), mat, mat], 0, 1.12, 0.06);
  board.rotation.y = -0.25;
  board.userData.dynamic = true; // วัสดุหลายชนิด ไม่รวมกับชิ้นอื่น
  return g;
}

/* ---------- กำแพงเมือง (สร้างจากช่อง WALL ของแผนที่) ---------- */
export function cityWalls(map, wallType) {
  const g = new THREE.Group();
  const H = 1.55;
  const used = new Uint8Array(map.w * map.h);
  const isWall = (x, y) => map.tileAt(x, y) === wallType;
  // รวมช่องเป็นสี่เหลี่ยมใหญ่ (greedy) ลดจำนวนชิ้น
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (!isWall(x, y) || used[map.idx(x, y)]) continue;
    let w = 1; while (isWall(x + w, y) && !used[map.idx(x + w, y)]) w++;
    let h = 1;
    outer: for (; y + h < map.h; h++) { for (let i = 0; i < w; i++) if (!isWall(x + i, y + h) || used[map.idx(x + i, y + h)]) break outer; }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[map.idx(x + i, y + j)] = 1;
    box(g, w, H, h, M.wallStone(), x + w / 2, H / 2, y + h / 2, 1.4);
    box(g, w + 0.08, 0.12, h + 0.08, M.stone(), x + w / 2, H + 0.06, y + h / 2, 1.4);
  }
  // ใบเสมาบนขอบกำแพง
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (!isWall(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (isWall(x + dx, y + dy)) continue;
      const along = dx === 0 ? x : y;
      if (along % 2) continue;
      const px = x + 0.5 + dx * 0.36, pz = y + 0.5 + dy * 0.36;
      box(g, dx ? 0.26 : 0.55, 0.34, dx ? 0.55 : 0.26, M.wallStone(), px, H + 0.29, pz, 1.4);
    }
  }
  return g;
}

/* ---------- ต้นไม้ (ใช้ InstancedMesh: วาดหลายร้อยต้นในครั้งเดียว) ---------- */
function jitter(geo, amt, seed) {
  const p = geo.attributes.position, r = rng(seed), map = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!map.has(k)) map.set(k, [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]);
    const [a, b, c] = map.get(k);
    p.setXYZ(i, p.getX(i) + a, p.getY(i) + b, p.getZ(i) + c);
  }
  geo.computeVertexNormals();
  return geo;
}

export function roundTreeGeometry(seed) {
  const r = rng(seed);
  const trunk = paint(new THREE.CylinderGeometry(0.09, 0.15, 1.1, 7).translate(0, 0.55, 0), (c, x, y) => c.set(y > 0.9 ? '#6b4a2e' : '#7b5534'));
  const blobs = [[0, 1.55, 0, 0.64], [-0.4, 1.3, 0.12, 0.44], [0.38, 1.34, -0.06, 0.46], [0.05, 1.98, -0.05, 0.46]];
  const leaves = blobs.map(([x, y, z, rad], i) => {
    const s = rad * (0.9 + r() * 0.25);
    const geo = jitter(new THREE.IcosahedronGeometry(s, 1), s * 0.18, seed * 10 + i);
    geo.translate(x, y, z);
    return paint(geo, (c, px, py, pz) => {
      const t = Math.max(0, Math.min(1, (py - 0.9) / 1.5));
      c.set('#2f6d33').lerp(new THREE.Color('#79b84f'), t * 0.9 + (px + pz) * 0.05);
    });
  });
  return mergeGeometries([trunk, ...leaves], { uv: false, color: true });
}

export function pineGeometry(seed) {
  const trunk = paint(new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6).translate(0, 0.35, 0), (c) => c.set('#6b4a2e'));
  const tiers = [[0.75, 0.62, 0.7], [1.2, 0.5, 0.65], [1.6, 0.38, 0.6], [1.95, 0.24, 0.5]].map(([y, rad, h], i) => {
    const geo = jitter(new THREE.ConeGeometry(rad, h, 8, 1), 0.04, seed * 7 + i).translate(0, y + h / 2 - 0.1, 0);
    return paint(geo, (c, px, py) => {
      const t = Math.max(0, Math.min(1, (py - 0.6) / 1.8));
      c.set('#1f4f34').lerp(new THREE.Color('#5d9a58'), t * 0.8);
    });
  });
  return mergeGeometries([trunk, ...tiers], { uv: false, color: true });
}

export function treeMaterial() {
  return std('tree', { vertexColors: true, roughness: 0.9 });
}

/* ---------- หญ้าเป็นกอ ๆ ---------- */
export function grassTuftGeometry() {
  const blades = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, h = 0.16 + (i % 3) * 0.05;
    const geo = new THREE.BufferGeometry();
    const bx = Math.cos(a) * 0.04, bz = Math.sin(a) * 0.04, tx = Math.cos(a) * 0.1, tz = Math.sin(a) * 0.1;
    const px = -Math.sin(a) * 0.022, pz = Math.cos(a) * 0.022;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz,
    ]), 3));
    geo.computeVertexNormals();
    blades.push(paint(geo, (c, x, y) => c.set('#3f7a2c').lerp(new THREE.Color('#9ccf68'), y / 0.26)));
  }
  const g = mergeGeometries(blades, { uv: false, color: true });
  // ให้แสงตกเหมือนพื้นราบ ดูนุ่มกว่า
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

export function flowerGeometry() {
  const stem = paint(new THREE.CylinderGeometry(0.008, 0.01, 0.2, 4).translate(0, 0.1, 0), (c) => c.set('#4a8a34'));
  const head = paint(new THREE.IcosahedronGeometry(0.045, 0).translate(0, 0.21, 0), (c) => c.set('#ffffff'));
  return mergeGeometries([stem, head], { uv: false, color: true });
}

export function rockGeometry(seed) {
  const g = jitter(new THREE.DodecahedronGeometry(0.16, 0), 0.06, seed);
  g.scale(1, 0.6, 1);
  return paint(g, (c, x, y) => c.set('#8f8a80').lerp(new THREE.Color('#c2bcb0'), Math.max(0, y * 4)));
}

/* ---------- ของในทุ่ง ---------- */
export function boulder(o) {
  const g = new THREE.Group();
  const w = o.w || 1, r = rng(o.seed || 1);
  const n = w > 1 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const size = (w > 1 ? 0.55 : 0.42) * (0.8 + r() * 0.4) * (i === 0 ? 1.15 : 0.8);
    const geo = jitter(new THREE.DodecahedronGeometry(size, 1), size * 0.22, (o.seed || 1) * 10 + i);
    geo.scale(1, 0.72, 1);
    const m = mesh(paint(geo, (c, x, y) => c.set('#8d877e').lerp(new THREE.Color('#c4beb2'), Math.max(0, Math.min(1, y / size + 0.3)))), std('boulder', { vertexColors: true, roughness: 0.95 }),
      (i === 0 ? 0 : (r() - 0.5) * w * 0.6), size * 0.5, (i === 0 ? 0 : (r() - 0.5) * w * 0.5), g);
    m.rotation.y = r() * 6;
    m.userData.dynamic = true; // vertex color: ไม่รวมกับ batch
  }
  // มอสเขียวบนหิน
  const moss = mesh(new THREE.SphereGeometry(0.2 * w, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), M.color('#5e8f3a', 0.95), 0.05, (w > 1 ? 0.55 : 0.42) * 0.72 + 0.02, 0, g);
  moss.scale.set(1.2, 0.5, 1);
  return g;
}

export function bush(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 3);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const s = 0.28 + r() * 0.14;
    const geo = jitter(new THREE.IcosahedronGeometry(s, 1), s * 0.2, (o.seed || 3) * 7 + i);
    geo.translate((r() - 0.5) * 0.4, s * 0.8, (r() - 0.5) * 0.4);
    parts.push(paint(geo, (c, x, y) => c.set('#2f6a30').lerp(new THREE.Color('#6eaa48'), Math.min(1, y / 0.7))));
  }
  const berries = [];
  for (let i = 0; i < 6; i++) berries.push(paint(new THREE.SphereGeometry(0.045, 8, 6).translate((r() - 0.5) * 0.55, 0.25 + r() * 0.35, 0.2 + r() * 0.15), (c) => c.set(o.seed % 2 ? '#e8384f' : '#6a5aff')));
  const m = mesh(mergeGeometries([...parts, ...berries], { uv: false, color: true }), std('bush', { vertexColors: true, roughness: 0.9 }), 0, 0, 0, g);
  m.userData.dynamic = true;
  return g;
}

export function fence(o) {
  const g = new THREE.Group();
  const w = o.w || 3;
  for (let i = 0; i <= w; i++) {
    const x = -w / 2 + i;
    box(g, 0.12, 0.8, 0.12, M.wood(), x, 0.4, 0, 0.5);
    box(g, 0.14, 0.05, 0.14, M.beam(), x, 0.82, 0, 0.5);
  }
  box(g, w, 0.08, 0.05, M.woodLight(), 0, 0.62, 0.05);
  box(g, w, 0.08, 0.05, M.woodLight(), 0, 0.34, 0.05);
  return g;
}

export function stump() {
  const g = new THREE.Group();
  const m = mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.42, 12), M.wood(), 0, 0.21, 0, g);
  scaleCylUV(m.geometry, 2, 0.5);
  mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 14), M.color('#d8b47a', 0.8), 0, 0.43, 0, g);
  mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 16), M.color('#a07a48', 0.8), 0, 0.445, 0, g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    const root = mesh(new THREE.ConeGeometry(0.1, 0.4, 6), M.wood(), Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32, g);
    root.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3);
  }
  return g;
}

export function pillar(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1);
  const h = 0.9 + r() * 1.5;
  box(g, 0.8, 0.22, 0.8, M.stoneLight(), 0, 0.11, 0, 1);
  const col = mesh(new THREE.CylinderGeometry(0.26, 0.29, h, 14), M.stoneLight(), 0, 0.22 + h / 2, 0, g);
  scaleCylUV(col.geometry, 2, h);
  col.rotation.z = (r() - 0.5) * 0.08;
  if (h > 1.8) box(g, 0.66, 0.16, 0.66, M.stoneLight(), 0, 0.3 + h, 0, 1);
  // เศษหิน
  for (let i = 0; i < 3; i++) {
    const s = 0.1 + r() * 0.12;
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), M.stoneLight(), (r() - 0.5) * 1.2, s * 0.6, (r() - 0.5) * 1.2, g);
    m.rotation.set(r() * 3, r() * 3, 0);
  }
  // เถาวัลย์
  const vine = mesh(new THREE.TorusGeometry(0.29, 0.03, 6, 16, Math.PI * 1.3), M.color('#4f8a36', 0.9), 0, 0.22 + h * 0.4, 0, g);
  vine.rotation.set(Math.PI / 2 + 0.3, 0, r() * 6);
  return g;
}

export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const st = mesh(new THREE.DodecahedronGeometry(0.11, 0), M.stone(), Math.cos(a) * 0.36, 0.07, Math.sin(a) * 0.36, g);
    st.rotation.set(a, a * 2, 0);
  }
  for (let i = 0; i < 3; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 8), M.wood(), 0, 0.12, 0, g);
    log.rotation.set(Math.PI / 2 - 0.35, i * 2.1, 0);
  }
  mesh(new THREE.CircleGeometry(0.3, 16), M.color('#2a1a12', 1), 0, 0.02, 0, g).rotation.x = -Math.PI / 2;
  return g;
}

/* ---------- สะพานไม้ข้ามลำธาร (สร้างจากช่อง BRIDGE) ---------- */
export function bridges(map, bridgeType, waterType) {
  const g = new THREE.Group();
  const seen = new Uint8Array(map.w * map.h);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (map.tileAt(x, y) !== bridgeType || seen[map.idx(x, y)]) continue;
    // หาเขตสะพานที่ติดกัน
    let x0 = x, x1 = x, y0 = y, y1 = y; const stack = [[x, y]]; seen[map.idx(x, y)] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (map.tileAt(nx, ny) === bridgeType && !seen[map.idx(nx, ny)]) { seen[map.idx(nx, ny)] = 1; stack.push([nx, ny]); }
      }
    }
    // น้ำไหลแนวตั้ง (มีน้ำด้านบน/ล่าง) → สะพานพาดแนวนอน
    const alongX = map.tileAt(x0, y0 - 1) === waterType || map.tileAt(x0, y1 + 1) === waterType;
    const len = (alongX ? x1 - x0 + 1 : y1 - y0 + 1) + 1.4;
    const wid = alongX ? y1 - y0 + 1 : x1 - x0 + 1;
    const b = new THREE.Group();
    b.position.set((x0 + x1 + 1) / 2, 0, (y0 + y1 + 1) / 2);
    if (!alongX) b.rotation.y = Math.PI / 2;
    const n = Math.round(len / 0.26);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), px = -len / 2 + u * len;
      const arch = 0.08 + Math.sin(u * Math.PI) * 0.22;
      const plank = box(b, 0.23, 0.07, wid - 0.15, M.woodLight(), px, arch, 0, 0.6);
      plank.rotation.z = Math.cos(u * Math.PI) * -0.28;
    }
    for (const s of [-1, 1]) {
      const z = s * (wid / 2 - 0.12);
      for (let i = 0; i <= 4; i++) {
        const u = i / 4, px = -len / 2 + 0.2 + u * (len - 0.4);
        const arch = 0.08 + Math.sin((px / len + 0.5) * Math.PI) * 0.22;
        box(b, 0.1, 0.62, 0.1, M.wood(), px, arch + 0.31, z, 0.5);
      }
      const rail = box(b, len - 0.3, 0.08, 0.08, M.beam(), 0, 0.72, z, 0.5);
      rail.position.y = 0.66;
    }
    for (const sx of [-1, 1]) box(b, 0.18, 0.5, wid - 0.4, M.wood(), sx * (len / 2 - 0.9), -0.1, 0, 0.5);
    g.add(b);
  }
  return g;
}


/* ---------- แท่นผลึกวาร์ป (ตัวผลึกเรืองแสงอยู่ใน Effects.WarpCrystal) ---------- */
export function warpstone() {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.55, 0], [0.55, 0.12], [0.44, 0.18], [0.3, 0.24], [0.24, 0.62], [0.32, 0.7], [0.36, 0.78], [0, 0.78]];
  const base = mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 8), M.stoneLight(), 0, 0, 0, g);
  scaleCylUV(base.geometry, 2, 0.8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const p = box(g, 0.08, 0.28, 0.08, M.gold(), Math.cos(a) * 0.3, 0.86, Math.sin(a) * 0.3);
    p.rotation.y = -a;
  }
  return g;
}

/* ---------- หีบเก็บของ (ผู้ดูแลคลัง) ---------- */
export function chest() {
  const g = new THREE.Group();
  box(g, 0.86, 0.46, 0.56, M.wood(), 0, 0.23, 0, 0.8);
  const lid = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.86, 14, 1, false, 0, Math.PI), M.wood(), 0, 0.46, 0, g);
  lid.rotation.z = Math.PI / 2;
  for (const sx of [-0.3, 0.3]) {
    box(g, 0.07, 0.48, 0.58, M.metal(), sx, 0.24, 0);
    const band = mesh(new THREE.TorusGeometry(0.285, 0.022, 6, 16, Math.PI), M.metal(), sx, 0.46, 0, g); band.rotation.y = Math.PI / 2;
  }
  box(g, 0.14, 0.16, 0.05, M.gold(), 0, 0.42, 0.29);
  return g;
}

/* ---------- เห็ดยักษ์เรืองแสง (ป่า Whisperwood) ---------- */
export function bigshroom(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1);
  const h = 0.6 + r() * 0.7, rad = 0.38 + r() * 0.22, c = o.color || '#4ac8ff';
  const stem = mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 10), M.color('#efe2c8', 0.9), 0, h / 2, 0, g);
  stem.rotation.z = (r() - 0.5) * 0.15;
  const cap = mesh(new THREE.SphereGeometry(rad, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('shroom' + c, { color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.5 }), 0, h - 0.02, 0, g);
  cap.scale.y = 0.6;
  const under = mesh(new THREE.CircleGeometry(rad, 18), M.color('#e8d6b0', 0.9), 0, h - 0.02, 0, g); under.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, e = 0.4 + r() * 0.9;
    sphere(g, 0.04 + r() * 0.03, M.color('#f6fbff', 0.5), Math.cos(a) * Math.cos(e) * rad, h + Math.sin(e) * rad * 0.6, Math.sin(a) * Math.cos(e) * rad, 8, 6);
  }
  g.userData.glow = { y: h + 0.15, color: c };
  return g;
}


/* ---------- v0.11: ต้นไม้ตามธีม (ยอดเขาหิมะ / ภูเขาไฟ) ---------- */
// สนหิมะ: ยอดแต่ละชั้นมีหิมะเกาะ (ไล่สีจากเขียวเข้มที่ฐานชั้น → ขาวที่ยอดชั้น)
export function snowPineGeometry(seed) {
  const trunk = paint(new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6).translate(0, 0.35, 0), (c) => c.set('#5a4030'));
  const tiers = [[0.75, 0.64, 0.72], [1.22, 0.52, 0.66], [1.62, 0.4, 0.6], [1.98, 0.26, 0.5]].map(([y, rad, h], i) => {
    const y0 = y - 0.1, geo = jitter(new THREE.ConeGeometry(rad, h, 9, 2), 0.035, seed * 7 + i).translate(0, y + h / 2 - 0.1, 0);
    return paint(geo, (c, px, py) => {
      const t = Math.max(0, Math.min(1, (py - y0) / h));
      c.set('#1d4434').lerp(new THREE.Color('#f4f9ff'), t > 0.42 ? 0.92 : t * 0.5);
    });
  });
  return mergeGeometries([trunk, ...tiers], { uv: false, color: true });
}

export function snowTreeGeometry(seed) {
  const r = rng(seed);
  const trunk = paint(new THREE.CylinderGeometry(0.08, 0.14, 1.05, 7).translate(0, 0.52, 0), (c) => c.set('#5e4636'));
  const blobs = [[0, 1.5, 0, 0.6], [-0.38, 1.26, 0.1, 0.42], [0.36, 1.3, -0.06, 0.44], [0.04, 1.9, -0.04, 0.42]];
  const leaves = blobs.map(([x, y, z, rad], i) => {
    const sz = rad * (0.9 + r() * 0.25);
    const geo = jitter(new THREE.IcosahedronGeometry(sz, 1), sz * 0.16, seed * 10 + i).translate(x, y, z);
    return paint(geo, (c, px, py) => { c.set('#2a5a4a').lerp(new THREE.Color('#f2f8ff'), py > y + sz * 0.15 ? 0.95 : 0.15); });
  });
  return mergeGeometries([trunk, ...leaves], { uv: false, color: true });
}

// ต้นไม้ไหม้เกรียม (ภูเขาไฟ): กิ่งแห้งดำ ปลายกิ่งมีถ่านคุแดง
export function deadTreeGeometry(seed) {
  const r = rng(seed), parts = [];
  parts.push(paint(jitter(new THREE.CylinderGeometry(0.07, 0.16, 1.5, 7, 3), 0.04, seed).translate(0, 0.75, 0), (c, x, y) => c.set('#2a2020').lerp(new THREE.Color('#4a3428'), y / 1.5 * 0.5)));
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, len = 0.4 + r() * 0.5, y = 0.7 + r() * 0.7;
    const g = new THREE.CylinderGeometry(0.02, 0.05, len, 5).translate(0, len / 2, 0).rotateZ(0.7 + r() * 0.5).rotateY(a).translate(0, y, 0);
    parts.push(paint(g, (c, px, py) => c.set('#2e2222').lerp(new THREE.Color('#ff5a1a'), Math.max(0, (py - y - len * 0.55) / (len * 0.5)) * 0.9)));
  }
  return mergeGeometries(parts, { uv: false, color: true });
}

/* ---------- v0.11: ของตกแต่งยอดเขาหิมะ ---------- */
export function icecrystal(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1), c = o.color || '#7fe0ff';
  const mat = std('ice' + c, { color: '#dff6ff', emissive: c, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 });
  const n = 4 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const h = 0.5 + r() * (i === 0 ? 1.1 : 0.6), w = 0.1 + r() * 0.08;
    const m = mesh(new THREE.OctahedronGeometry(1, 0).scale(w, h, w), mat, (r() - 0.5) * 0.5, h * 0.75, (r() - 0.5) * 0.5, g);
    m.rotation.set((r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6);
  }
  mesh(new THREE.DodecahedronGeometry(0.28, 0).scale(1.3, 0.4, 1.3), M.color('#c8d6e4', 0.9), 0, 0.08, 0, g);
  g.userData.glow = { y: 0.9, color: c };
  return g;
}

export function snowman(o) {
  const g = new THREE.Group();
  const snow = M.color('#f4f8fc', 0.95);
  sphere(g, 0.34, snow, 0, 0.3, 0, 16, 12); sphere(g, 0.25, snow, 0, 0.76, 0, 14, 10); sphere(g, 0.18, snow, 0, 1.1, 0, 12, 10);
  const nose = mesh(new THREE.ConeGeometry(0.04, 0.18, 8), M.color('#ff8a2a', 0.6), 0, 1.1, 0.24, g); nose.rotation.x = Math.PI / 2;
  for (const sx of [-1, 1]) sphere(g, 0.025, M.color('#1c1424', 0.5), sx * 0.07, 1.16, 0.16, 6, 5);
  const sc = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), M.color(o.color || '#d8433a', 0.8), 0, 0.95, 0, g); sc.rotation.x = Math.PI / 2;
  box(g, 0.08, 0.26, 0.05, M.color(o.color || '#d8433a', 0.8), 0.12, 0.82, 0.18).rotation.z = 0.3;
  for (const sx of [-1, 1]) { const arm = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.45, 5), M.color('#5a3a22', 0.9), sx * 0.36, 0.86, 0, g); arm.rotation.z = sx * 1.0; }
  mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12), M.color('#2a2430', 0.6), 0, 1.3, 0, g);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 14), M.color('#2a2430', 0.6), 0, 1.22, 0, g);
  return g;
}

export function tent(o) {
  const g = new THREE.Group(); const c = o.color || '#c8643a';
  const cloth = std('tent' + c, { color: c, roughness: 0.9, side: THREE.DoubleSide });
  const roof = mesh(new THREE.CylinderGeometry(0.02, 1.1, 1.3, 4, 1, true), cloth, 0, 0.65, 0, g); roof.rotation.y = Math.PI / 4;
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), M.beam(), 0, 0.8, 0, g);
  box(g, 0.5, 0.75, 0.02, M.color('#2a1e18', 1), 0, 0.37, 0.79);
  sphere(g, 0.06, M.color('#ffe08a', 0.5), 0, 1.62, 0, 8, 6);
  // หิมะเกาะยอดเต็นท์
  if (o.snow) { const cap = mesh(new THREE.CylinderGeometry(0.02, 0.5, 0.45, 4, 1, true), M.color('#f4f8fc', 0.95), 0, 1.1, 0, g); cap.rotation.y = Math.PI / 4; }
  return g;
}

/* ---------- v0.11: ของตกแต่งภูเขาไฟ ---------- */
export function obsidian(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1);
  const rock = std('obsidian', { color: '#241c28', roughness: 0.3, metalness: 0.3 });
  const vein = std('lavaVein', { color: '#ff6a1a', emissive: '#ff4a0a', emissiveIntensity: 1.4, roughness: 0.6 });
  const n = 3 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const h = 0.6 + r() * (i === 0 ? 1.6 : 0.8), w = 0.16 + r() * 0.12;
    const m = mesh(new THREE.ConeGeometry(w, h, 5), rock, (r() - 0.5) * 0.6, h / 2, (r() - 0.5) * 0.6, g);
    m.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4);
    if (i === 0) { const v = mesh(new THREE.ConeGeometry(w * 0.4, h * 0.7, 5), vein, m.position.x + 0.02, h * 0.35, m.position.z + w * 0.55, g); v.rotation.copy(m.rotation); }
  }
  g.userData.glow = { y: 0.4, color: '#ff6a1a' };
  return g;
}

export function vent(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1);
  const rock = std('ventRock', { color: '#3a2e2c', roughness: 0.95 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, s = 0.18 + r() * 0.1;
    const m = mesh(new THREE.DodecahedronGeometry(s, 0), rock, Math.cos(a) * 0.36, s * 0.6, Math.sin(a) * 0.36, g); m.rotation.set(r() * 3, r() * 3, 0);
  }
  mesh(new THREE.CircleGeometry(0.3, 16), std('ventCore', { color: '#ffb03a', emissive: '#ff6a0a', emissiveIntensity: 1.8 }), 0, 0.05, 0, g).rotation.x = -Math.PI / 2;
  g.userData.glow = { y: 0.5, color: '#ff7a2a' };
  return g;
}

export function bones(o) {
  const g = new THREE.Group(); const r = rng(o.seed || 1);
  const bone = M.color('#e8dcc4', 0.8);
  // กะโหลกมังกรครึ่งจมดิน + ซี่โครง
  const skull = mesh(new THREE.SphereGeometry(0.42, 14, 10), bone, 0, 0.18, 0, g); skull.scale.set(1, 0.7, 1.4);
  for (const sx of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.08, 0.6, 7), bone, sx * 0.25, 0.5, -0.25, g); h.rotation.set(-0.7, 0, sx * -0.4); }
  for (const sx of [-1, 1]) sphere(g, 0.08, M.color('#2a1a14', 1), sx * 0.16, 0.28, 0.38, 8, 6);
  for (let i = 0; i < 4; i++) { const rib = mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12, Math.PI), bone, 0, 0, -0.9 - i * 0.32, g); rib.rotation.y = Math.PI / 2; rib.scale.set(1, 1 - i * 0.1, 1); }
  for (const ch of g.children) ch.position.z += 0.62;   // จัดให้อยู่กลางพื้นที่ 2×3 ช่อง
  return g;
}

export const BUILDERS = { icecrystal, snowman, tent, obsidian, vent, bones, bigshroom, warpstone, chest, house, tower, fountain, lamp, stall, well, crate, barrel, bench, sign, boulder, bush, fence, stump, pillar, campfire };
