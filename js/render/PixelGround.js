// v0.17: พื้นแผนที่แบบภาพพิกเซล — แผ่นลายพิกเซล 48×48 ต่อช่อง (1 พิกเซลลาย = 1 พิกเซลภาพที่ระยะกล้องปกติ)
// วาดลายทุกชนิดพื้น × 4 แบบลงแผ่นรวม (atlas) แล้วให้เชดเดอร์เลือกลายตามชนิดพื้นของแต่ละช่อง
// ขอบระหว่างพื้นต่างชนิดเป็นหยักแบบพิกเซล (สุ่มเลื่อนทีละกลุ่ม 3×3) · เงาใต้วัตถุเป็นขั้นแบบพิกเซล
import { THREE } from './three.js';
import { T } from '../data/tileTypes.js';
import { rng } from '../core/util.js';

export const TP = 48;          // พิกเซลลายต่อ 1 ช่อง
const NV = 4, NT = 8;          // แบบต่อชนิด · จำนวนชนิดพื้น
const AO_PPT = 8;              // ความละเอียดแผนที่เงาใต้วัตถุ

const hex = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// แรเงาแบบนักวาดพิกเซล: มืดลง → อมม่วงน้ำเงิน · สว่างขึ้น → อมเหลือง
const sh = (c, k) => (k >= 0 ? mix(c, [255, 248, 214], k) : mix(c, [34, 26, 64], -k));

/* ---------- เครื่องมือวาดทีละพิกเซล (วนรอบขอบช่อง ลายต่อกันไร้รอย) ---------- */
function painter(img, W, ox, oy) {
  const d = img.data;
  const P = (x, y, c) => {
    x = ((Math.round(x) % TP) + TP) % TP; y = ((Math.round(y) % TP) + TP) % TP;
    const i = ((oy + y) * W + ox + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  };
  const fill = (c) => { for (let y = 0; y < TP; y++) for (let x = 0; x < TP; x++) P(x, y, c); };
  // ก้อนสีขอบดิทเธอร์ (ลายด่างบนหญ้า/ดิน)
  const blob = (cx, cy, r, c) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const q = Math.hypot(x, y * 1.25);
      if (q < r - 1.2 || (q < r && ((x + y) & 1) === 0)) P(cx + x, cy + y, c);
    }
  };
  return { P, fill, blob };
}

/* ---------- ลายแต่ละชนิดพื้น ---------- */
function grassTile(p, r, G, flowers) {
  const base = hex(G.base || '#62a245');
  const cols = (G.blobs || []).map(hex);
  const dark = sh(base, -0.2), dark2 = sh(base, -0.34), light = sh(base, 0.16), light2 = sh(base, 0.3);
  p.fill(base);
  for (let i = 0; i < 7; i++) p.blob(r() * TP, r() * TP, 4 + r() * 6, cols.length ? cols[(r() * cols.length) | 0] : (i % 2 ? dark : light));
  for (let i = 0; i < 5; i++) p.blob(r() * TP, r() * TP, 3 + r() * 4, i % 2 ? sh(base, -0.1) : sh(base, 0.08));
  // ใบหญ้า: เส้นตั้ง 2–4 พิกเซล ปลายสว่าง (บางต้นเป็นรูป V)
  for (let i = 0; i < 46; i++) {
    const x = r() * TP, y = r() * TP, len = 2 + ((r() * 3) | 0);
    for (let k = 0; k < len; k++) p.P(x, y - k, k === 0 ? dark2 : dark);
    p.P(x, y - len, light);
    if (r() < 0.35) { p.P(x - 1, y - 1, dark); p.P(x - 1, y - 2, light); }
  }
  for (let i = 0; i < 18; i++) p.P(r() * TP, r() * TP, light2);
  for (let i = 0; i < 10; i++) p.P(r() * TP, r() * TP, dark2);
  if (G.litter) for (let i = 0; i < 9; i++) { const c = hex(G.litter[(r() * G.litter.length) | 0]), x = r() * TP, y = r() * TP; p.P(x, y, c); p.P(x + 1, y, c); p.P(x, y + 1, sh(c, -0.3)); }
  if (flowers) {
    const fc = flowers.map(hex);
    for (let i = 0; i < 9; i++) {
      const x = 3 + r() * (TP - 6), y = 3 + r() * (TP - 6), c = fc[(r() * fc.length) | 0];
      p.P(x, y + 2, dark2); p.P(x, y + 1, dark);                       // ก้าน
      p.P(x - 1, y, c); p.P(x + 1, y, c); p.P(x, y - 1, sh(c, 0.25)); p.P(x, y + 1, sh(c, -0.2));
      p.P(x, y, [255, 214, 90]);
    }
  }
}
function dirtTile(p, r, D) {
  const base = hex(D.base || '#a98058'), cols = (D.blobs || []).map(hex);
  const dark = sh(base, -0.2), light = sh(base, 0.16), peb = hex(D.pebble || '#8a7a68');
  p.fill(base);
  for (let i = 0; i < 8; i++) p.blob(r() * TP, r() * TP, 3 + r() * 6, cols.length ? cols[(r() * cols.length) | 0] : (i % 2 ? dark : light));
  for (let i = 0; i < 40; i++) p.P(r() * TP, r() * TP, r() < 0.5 ? dark : light);
  // ก้อนกรวด: เงาล่างขวา ไฮไลต์บนซ้าย
  for (let i = 0; i < 7; i++) {
    const x = r() * TP, y = r() * TP, w = 2 + ((r() * 2) | 0), h = 2;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.P(x + xx, y + yy, peb);
    p.P(x, y, sh(peb, 0.35)); p.P(x + w, y + 1, sh(base, -0.35)); for (let xx = 0; xx < w; xx++) p.P(x + xx, y + h, sh(base, -0.3));
  }
  if (D.cracks) {
    const cc = hex(D.cracks), hot = sh(cc, 0.45);
    for (let i = 0; i < 3; i++) {
      let x = r() * TP, y = r() * TP;
      for (let k = 0; k < 12; k++) { p.P(x, y, k % 3 ? cc : hot); p.P(x, y + 1, sh(base, -0.4)); x += r() < 0.6 ? 1 : 0; y += r() < 0.5 ? (r() < 0.5 ? 1 : -1) : 0; if (r() < 0.25) x += 1; }
    }
  }
}
function cobbleTile(p, r, gray) {
  const mortar = gray ? hex('#5a5c68') : hex('#7a6448');
  const stones = (gray ? ['#b3b6c0', '#a6a9b5', '#bec1ca', '#9b9eab', '#aeb2bd'] : ['#c9b391', '#bea883', '#d2bd9a', '#b59d78', '#c4ae8a']).map(hex);
  p.fill(mortar);
  const RH = 12;
  for (let row = 0; row < 4; row++) {
    let x = row % 2 ? -((r() * 6) | 0) - 4 : -((r() * 4) | 0);
    while (x < TP) {
      const w = 9 + ((r() * 7) | 0), y0 = row * RH, c = stones[(r() * stones.length) | 0];
      for (let yy = 1; yy < RH - 1; yy++) for (let xx = 1; xx < w - 1; xx++) {
        if ((xx === 1 || xx === w - 2) && (yy === 1 || yy === RH - 2)) continue;    // มุมมน
        let cc = c;
        if (yy === 1 || xx === 1) cc = sh(c, 0.22); else if (yy === RH - 2 || xx === w - 2) cc = sh(c, -0.22);
        p.P(x + xx, y0 + yy, cc);
      }
      if (r() < 0.5) p.P(x + 3 + r() * (w - 6), y0 + 3 + r() * (RH - 6), sh(c, -0.15));
      x += w;
    }
  }
}
function plazaTile(p, r, gray) {
  const mortar = gray ? hex('#62646f') : hex('#6f675a');
  const slabs = (gray ? ['#b9bcc6', '#aeb1bc', '#c2c5ce', '#a7aab6'] : ['#c2b8a4', '#b9ae99', '#c8bfac', '#b2a792']).map(hex);
  p.fill(mortar);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const c = slabs[(r() * slabs.length) | 0], ox = i * 24, oy = j * 24;
    for (let y = 1; y < 24; y++) for (let x = 1; x < 24; x++) {
      let cc = c;
      if (y === 1 || x === 1) cc = sh(c, 0.18); else if (y === 23 || x === 23) cc = sh(c, -0.2);
      p.P(ox + x, oy + y, cc);
    }
    for (let k = 0; k < 6; k++) p.P(ox + 3 + r() * 18, oy + 3 + r() * 18, sh(c, (r() - 0.5) * 0.25));
    if (r() < 0.3) { let x = ox + 4 + r() * 14, y = oy + 3; for (let k = 0; k < 9; k++) { p.P(x, y + k, sh(c, -0.3)); if (r() < 0.4) x += r() < 0.5 ? 1 : -1; } }   // รอยร้าว
  }
}
function bedTile(p, r, lava) {
  const base = lava ? hex('#3a1410') : hex('#2b5a63');
  p.fill(base);
  for (let i = 0; i < 6; i++) p.blob(r() * TP, r() * TP, 3 + r() * 5, sh(base, r() < 0.5 ? -0.15 : 0.12));
  for (let i = 0; i < 20; i++) p.P(r() * TP, r() * TP, sh(base, 0.2));
}
function wallTile(p, r) {
  const base = hex('#5a5560'); p.fill(base);
  for (let i = 0; i < 30; i++) p.P(r() * TP, r() * TP, sh(base, (r() - 0.5) * 0.3));
}

// แผ่นรวมลายของแผนที่นี้ (ขึ้นกับธีม) · แถว = แบบ, คอลัมน์ = ชนิดพื้น
function buildAtlas(map) {
  const th = map.def.theme || {};
  const W = NT * TP, H = NV * TP;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H);
  const gray = th.cobble === 'gray', lava = th.water === 'lava';
  const flowers = th.flowers || ['#ffe36b', '#ff8fb8', '#ffffff', '#a9c8ff', '#ffb36b', '#d59bff'];
  for (let v = 0; v < NV; v++) {
    const at = (t) => painter(img, W, t * TP, v * TP);
    const R = (t) => rng(1000 + t * 97 + v * 13);
    grassTile(at(T.GRASS), R(T.GRASS), th.grass || {}, null);
    grassTile(at(T.FLOWERS), R(T.FLOWERS), th.grass || {}, flowers);
    dirtTile(at(T.DIRT), R(T.DIRT), th.dirt || {});
    cobbleTile(at(T.PATH), R(T.PATH), gray);
    plazaTile(at(T.PLAZA), R(T.PLAZA), gray);
    bedTile(at(T.WATER), R(T.WATER), lava);
    bedTile(at(T.BRIDGE), R(T.BRIDGE), lava);
    wallTile(at(T.WALL), R(T.WALL));
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
  return t;
}

// ชนิดพื้นรายช่อง (ข้อมูลให้เชดเดอร์อ่าน)
function typeTexture(map) {
  const d = new Uint8Array(map.w * map.h * 4);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { const i = (y * map.w + x) * 4; d[i] = Math.max(0, map.tileAt(x, y)); d[i + 3] = 255; }
  const t = new THREE.DataTexture(d, map.w, map.h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

// เงานุ่มใต้วัตถุ (เชดเดอร์ตัดเป็นขั้น ๆ แบบพิกเซล)
function aoTexture(map) {
  const P = AO_PPT, c = document.createElement('canvas'); c.width = map.w * P; c.height = map.h * P;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  const ROUND = { tree: 0.55, pine: 0.5, fountain: 1.7, tower: 1.1, lamp: 0.22, sign: 0.2, barrel: 0.35, crate: 0.4, well: 0.75, bush: 0.5, stump: 0.4, campfire: 0.45, pillar: 0.5, boulder: 0.6, snowman: 0.35, icecrystal: 0.4, obsidian: 0.6, bigshroom: 0.6, warpstone: 0.6, chest: 0.4 };
  g.filter = 'blur(' + (P * 0.35) + 'px)';
  for (const o of map.objects) {
    if (o.kind === 'fence') continue;
    g.fillStyle = 'rgba(0,0,0,0.55)';
    if (ROUND[o.kind]) { const rad = ROUND[o.kind] * P * (o.kind === 'boulder' ? o.fw || 1 : 1) * 1.15; g.beginPath(); g.arc(o.cx * P, o.cy * P, rad, 0, 7); g.fill(); }
    else { const pad = o.kind === 'house' ? 0.3 : 0.12; g.fillRect((o.def.x - pad) * P, (o.def.y - pad) * P, (o.fw + pad * 2) * P, (o.fh + pad * 2) * P); }
  }
  g.fillStyle = 'rgba(0,0,0,0.6)';
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.tileAt(x, y) === T.WALL) g.fillRect(x * P - 2, y * P - 2, P + 4, P + 4);
  g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

/* ---------- วัสดุพื้น (Lambert + ลายพิกเซลจากเชดเดอร์) ---------- */
export function pixelGround(map) {
  const atlas = buildAtlas(map), types = typeTexture(map), ao = aoTexture(map);
  const fill = map.def.fill && T[map.def.fill] != null ? T[map.def.fill] : T.GRASS;
  const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const U = {
    tAtlas: { value: atlas }, tTypes: { value: types }, tAO: { value: ao },
    mapSize: { value: new THREE.Vector2(map.w, map.h) }, outerType: { value: fill },
  };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = 'varying vec2 vGW;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    s.fragmentShader = `uniform sampler2D tAtlas; uniform sampler2D tTypes; uniform sampler2D tAO; uniform vec2 mapSize; uniform float outerType;
varying vec2 vGW;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tileType(vec2 t) {
  if (t.x < 0.0 || t.y < 0.0 || t.x >= mapSize.x || t.y >= mapSize.y) return outerType;
  return floor(texture2D(tTypes, (t + 0.5) / mapSize).r * 255.0 + 0.5);
}
// ชนิดพื้นของพิกเซลลาย: เลื่อนจุดอ่านเป็นกลุ่ม 3×3 → ขอบหยักแบบพิกเซล
float texelType(vec2 tp) {
  vec2 b = floor(tp / 3.0);
  vec2 j = vec2(h21(b), h21(b + 17.31)) - 0.5;
  return tileType(floor((tp + 0.5) / ${TP.toFixed(1)} + j * 0.42));
}
` + s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  {
    vec2 tp = floor(vGW * ${TP.toFixed(1)});
    float ty = texelType(tp);
    vec2 tile = floor(tp / ${TP.toFixed(1)});
    float v = floor(h21(tile * 1.37 + 3.1) * ${NV.toFixed(1)});
    vec2 inT = mod(tp, ${TP.toFixed(1)});
    vec2 auv = (vec2(ty, ${(NV - 1).toFixed(1)} - v) * ${TP.toFixed(1)} + vec2(inT.x, ${TP.toFixed(1)} - 1.0 - inT.y) + 0.5) / vec2(${(NT * TP).toFixed(1)}, ${(NV * TP).toFixed(1)});
    vec3 tc = sRGBToLinear(texture2D(tAtlas, auv)).rgb;
    // ขอบรอยต่อพื้นต่างชนิด: เส้นเข้ม 1 พิกเซล
    if (texelType(tp + vec2(0.0, -1.0)) != ty || texelType(tp + vec2(-1.0, 0.0)) != ty) tc *= 0.8;
    // เงาใต้วัตถุเป็นขั้น
    vec2 aw = vGW / mapSize;
    float a = (aw.x < 0.0 || aw.y < 0.0 || aw.x > 1.0 || aw.y > 1.0) ? 1.0 : texture2D(tAO, vec2(aw.x, 1.0 - aw.y)).r;
    a = 1.0 - floor((1.0 - a) * 4.0 + 0.35) / 4.0;
    diffuseColor.rgb *= tc * mix(0.55, 1.0, a);
  }`);
  };
  mat.customProgramCacheKey = () => 'pixelGround';
  return { material: mat, dispose() { atlas.dispose(); types.dispose(); ao.dispose(); mat.dispose(); } };
}

/* ---------- ผิวน้ำ/น้ำแข็ง/ลาวาแบบพิกเซล: สีเป็นชั้น + ขีดประกายสั้น ๆ กะพริบเคลื่อนไหว ---------- */
const WATER_COLS = {
  water: ['#2a6694', '#3a86b4', '#6cc0e4', '#e6f8ff'],
  ice: ['#9ccce6', '#bfe2f4', '#e4f6ff', '#ffffff'],
  lava: ['#b8280a', '#ec4a10', '#ff9a24', '#ffe66a'],
};
export class PixelWater {
  constructor(kind = 'water') {
    this.kind = kind;
    const cols = (WATER_COLS[kind] || WATER_COLS.water).map((c) => new THREE.Color(c));
    this.time = { value: 0 };
    this.base = new THREE.ShaderMaterial({
      uniforms: { uT: this.time, c0: { value: cols[0] }, c1: { value: cols[1] }, c2: { value: cols[2] }, c3: { value: cols[3] }, speed: { value: kind === 'lava' ? 0.35 : kind === 'ice' ? 0.05 : 1 } },
      vertexShader: 'varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT; uniform float speed; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; varying vec2 vW;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          float t = uT * speed;
          vec2 tp = floor(vW * ${TP.toFixed(1)});
          // แถบสีเป็นคลื่นช้า ๆ (2 เฉดหลัก)
          float w = sin(tp.x * 0.045 + tp.y * 0.11 + t * 0.9) + sin(tp.x * 0.11 - tp.y * 0.05 - t * 0.7) * 0.6;
          vec3 col = w > 0.35 ? c1 : c0;
          // ขีดประกายสั้น: ช่องละ 14×6 พิกเซล มีขีดยาว 3–7 พิกเซลกะพริบตามเวลา
          vec2 cell = floor(vec2(tp.x + floor(t * 6.0 + tp.y * 0.0), tp.y) / vec2(14.0, 6.0));
          float r = h21(cell), on = step(0.55, fract(r * 7.0 + t * 0.35));
          float lx = mod(tp.x + floor(t * 6.0), 14.0), ly = mod(tp.y, 6.0);
          float len = 3.0 + floor(r * 5.0), x0 = floor(h21(cell + 3.1) * (14.0 - len));
          if (ly < 1.0 && lx >= x0 && lx < x0 + len && on > 0.5) col = (r > 0.8) ? c3 : c2;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.l1 = new THREE.MeshBasicMaterial({ visible: false }); this.l2 = this.l1;
  }
  add(parent, geo, y) { const m = new THREE.Mesh(geo, this.base); m.position.y = y; parent.add(m); return m; }
  update(t) { this.time.value = t; }
}
