// v0.17: ตัวละคร/มอนสเตอร์/สัตว์เลี้ยง/NPC เป็นสไปรต์พิกเซลอาร์ต 2 มิติ (แบบเกม RO) บนฉาก 3 มิติเดิม
// วิธีทำ: โมเดล 3 มิติของแต่ละตัวยังขยับท่าทางเหมือนเดิม แต่ไม่ถูกวาดลงฉากหลัก (อยู่เลเยอร์ PX_LAYER)
// ทุก ~1/12 วินาที (หรือเมื่อหันทิศใหม่) จะถ่ายโมเดลด้วยกล้องมุมก้มคงที่ ความละเอียดต่ำ 2 รอบ
//   รอบ 1 = สีพื้นของแต่ละชิ้น · รอบ 2 = ทิศพื้นผิว + ความลึก
// แล้วลงสีแบบพิกเซลอาร์ตด้วยเชดเดอร์: แรเงา 4 ระดับ (เงาอมม่วง ไฮไลต์อมเหลือง) · เส้นขอบนอกสีเข้มของชิ้นนั้น ·
// เส้นในระหว่างชิ้นที่ซ้อนกัน · ลบจุดแสงเดี่ยว ๆ · วาดตาอนิเมะทีละพิกเซล · กระพริบขาวตอนโดนตี
// ผลลัพธ์เป็นภาพเล็กแปะบนแผ่นป้ายที่หันหาหน้ากล้องเสมอ (ขยายแบบไม่เบลอ) · หันได้ 8 ทิศตามมุมกล้อง
import { THREE } from './three.js';

export const PX_LAYER = 1;
export const PIXEL = { on: true };            // โหมดภาพพิกเซล (ตั้งค่า → กราฟิก) · ใช้กับรูปย่อในหน้าต่างด้วย
const SNAPS = new WeakMap();
export const PX = 1 / 48;                     // หน่วยโลกต่อ 1 พิกเซลของสไปรต์ (ตัวละครสูง ~85 พิกเซล) · 1 ช่องแผนที่ = 48 พิกเซลพอดี
const SCRATCH = 256;                          // ขนาดภาพทดสอบชั่วคราว (สไปรต์ใหญ่สุด)
const PITCH = 20 * Math.PI / 180;             // มุมก้มของ "ช่างวาด" (คงที่ทุกแผนที่) — มองค่อนข้างตรงแบบสไปรต์เกม
const RANGE = 24;                             // ระยะความลึกที่เก็บ (หน่วยโลก)
const STEP = 1 / 12;                          // แอนิเมชันแบบเฟรมพิกเซล 12 เฟรม/วินาที
const DIR = Math.PI / 4;

const ND_VS = `varying vec3 vN; varying float vZ;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vZ = -mv.z; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
const ND_FS = `varying vec3 vN; varying float vZ; uniform float uNear;
void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float d = clamp((vZ - uNear) / ${RANGE.toFixed(1)}, 0.0, 1.0) * 65535.0; float hi = floor(d / 256.0); float lo = d - hi * 256.0;
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, hi / 255.0, lo / 255.0); }`;

// รอบสีพื้น: สีเรียบ + รหัสชนิดชิ้นในช่องอัลฟา (1 ปกติ · 0.75 เรืองแสง · 0.6 ผม) · uBias = ดันชิ้นจิ๋ว (ตา/ปุ่ม) เข้าหากล้องให้โผล่พ้นผิวที่คลุมบาง ๆ
const ALB_VS = `uniform float uBias; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.z += uBias; gl_Position = projectionMatrix * mv; }`;
const ALB_FS = `uniform vec3 uColor; uniform float uCode; void main(){ gl_FragColor = vec4(uColor, uCode); }`;
const ND_VS_B = `varying vec3 vN; varying float vZ; uniform float uBias;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.z += uBias; vZ = -mv.z; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;

const POST_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const POST_FS = `
uniform sampler2D tA; uniform sampler2D tN; uniform vec2 uSize; uniform vec3 uL;
uniform vec4 uEye0; uniform vec4 uEye1; uniform vec4 uMouth; uniform vec3 uEyeCol; uniform float uEyeShut; uniform float uFlash; uniform vec3 uFlashCol;
varying vec2 vUv;
const float TEX = ${SCRATCH.toFixed(1)};
vec4 A(vec2 p){ if (p.x < 0.0 || p.y < 0.0 || p.x >= uSize.x || p.y >= uSize.y) return vec4(0.0); return texture2D(tA, (p + 0.5) / TEX); }
vec4 N(vec2 p){ return texture2D(tN, (p + 0.5) / TEX); }
float dep(vec4 n){ return (n.z * 255.0 * 256.0 + n.w * 255.0) / 65535.0 * ${RANGE.toFixed(1)}; }
vec3 nrm(vec4 n){ vec2 xy = n.xy * 2.0 - 1.0; return vec3(xy, sqrt(max(0.0, 1.0 - dot(xy, xy)))); }
vec3 toS(vec3 c){ return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
// ชนิดวัสดุจากช่องอัลฟา: 1 ผ้า/ทั่วไป · 2 โลหะ · 3 ผิว · 4 เรืองแสง · 5 ผม
float kind(float a){ return a > 0.95 ? 1.0 : a > 0.86 ? 2.0 : a > 0.79 ? 3.0 : a > 0.7 ? 4.0 : 5.0; }
float bayer(vec2 p){ float x = mod(p.x, 2.0), y = mod(p.y, 2.0); return (x + 2.0 * y == 0.0 ? 0.125 : x + 2.0 * y == 1.0 ? 0.625 : x + 2.0 * y == 2.0 ? 0.875 : 0.375); }
// ระดับแสง 0 มืด · 1 เงา · 2 สีหลัก · 3 สว่าง · 4 ไฮไลต์ (ไล่ระดับด้วยจุดสลับแบบพิกเซลอาร์ตตรงรอยต่อ)
float step3(float t, vec2 p, float a, float b, float c, float dith){
  float d = (bayer(p) - 0.5) * dith;
  float u = t + d;
  return u < a ? 0.0 : u < b ? 1.0 : u < c ? 2.0 : 3.0;
}
float level(vec4 n, float k, vec2 p){
  vec3 nn = nrm(n); float t = dot(nn, uL) * 0.5 + 0.5;
  if (k == 3.0) return max(1.0, step3(t, p, 0.24, 0.47, 0.9, 0.06));            // ผิว: เงานุ่ม ไม่มีมืดจัด
  if (k == 2.0) {                                                                    // โลหะ: ตัดแสงแรง + จุดสะท้อน
    vec3 h = normalize(uL + vec3(0.0, 0.0, 1.0)); float sp = pow(max(dot(nn, h), 0.0), 22.0);
    if (sp > 0.55) return 4.0;
    return step3(t, p, 0.38, 0.55, 0.8, 0.0);
  }
  if (k == 5.0) {                                                                    // ผม: แถบเงาวาวโค้งบนหัว
    float lv = step3(t, p, 0.3, 0.5, 2.0, 0.05);
    if (nn.y > 0.3 && nn.y < 0.58 && nn.x < 0.4 && lv >= 2.0) return 4.0;
    return lv;
  }
  return step3(t, p, 0.32, 0.52, 0.86, 0.07);
}
vec3 ramp(vec3 c, float k, float m){
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  if (m == 3.0) {                                                                    // ผิว: เงาอมชมพูอุ่น
    if (k > 4.5) return c * vec3(0.48, 0.3, 0.32);
    if (k > 3.5) return c + (vec3(1.0, 0.98, 0.94) - c) * 0.5;
    if (k > 2.5) return c + (vec3(1.0, 0.96, 0.9) - c) * 0.22;
    if (k > 1.5) return c;
    if (k > 0.5) return c * vec3(0.93, 0.8, 0.8);
    return c * vec3(0.8, 0.62, 0.66);
  }
  if (m == 2.0) {                                                                    // โลหะ: คอนทราสต์สูง
    if (k > 4.5) return c * vec3(0.26, 0.26, 0.34);
    if (k > 3.5) return vec3(1.0);
    if (k > 2.5) return c + (vec3(1.0) - c) * 0.35;
    if (k > 1.5) return c;
    if (k > 0.5) return c * vec3(0.66, 0.67, 0.78);
    return c * vec3(0.42, 0.43, 0.55);
  }
  if (k > 4.5) return c * vec3(0.3, 0.25, 0.36) + vec3(0.025, 0.015, 0.04);
  if (k > 3.5) return c + (vec3(1.0, 0.98, 0.9) - c) * 0.55;
  if (k > 2.5) return c + (vec3(1.0, 0.97, 0.86) - c) * 0.24;
  if (k > 1.5) return c;
  if (k > 0.5) return mix(c * vec3(0.82, 0.76, 0.88), vec3(lum) * vec3(0.8, 0.75, 0.88), 0.1);
  return mix(c * vec3(0.6, 0.53, 0.72), vec3(lum) * vec3(0.56, 0.5, 0.7), 0.12);
}
// ลายตา 3x5 (y ลง): 1 ขนตา · 2 ตาดำ · 3 จุดเงา · 4 ตาล่างสว่าง · 5 ตาขาว
float eyeCode(vec2 q, float narrow, float side){
  if (uEyeShut > 0.5) return (q.y == 3.0 && (narrow > 0.5 ? q.x < 2.0 : true)) ? 1.0 : 0.0;
  float x = side > 0.0 ? (narrow > 0.5 ? 1.0 - q.x : 2.0 - q.x) : q.x;   // x = 0 ด้านใน (หัวตา)
  if (narrow > 0.5) {
    if (q.x > 1.0) return 0.0;
    if (q.y == 0.0) return 1.0;
    if (q.y == 1.0) return x == 0.0 ? 2.0 : 1.0;
    if (q.y == 2.0) return x == 0.0 ? 3.0 : 2.0;
    if (q.y == 3.0) return 2.0;
    return x == 0.0 ? 4.0 : 0.0;
  }
  if (q.y == 0.0) return x == 0.0 ? 0.0 : 1.0;
  if (q.y == 1.0) return x == 2.0 ? 1.0 : 2.0;
  if (q.y == 2.0) return x == 1.0 ? 3.0 : 2.0;
  if (q.y == 3.0) return x == 0.0 ? 5.0 : 2.0;
  return x == 1.0 ? 4.0 : 0.0;
}
void main(){
  vec2 p = floor(vUv * uSize);
  vec4 a = A(p);
  vec2 o[4]; o[0] = vec2(1.0, 0.0); o[1] = vec2(-1.0, 0.0); o[2] = vec2(0.0, 1.0); o[3] = vec2(0.0, -1.0);
  if (a.a < 0.5) {
    // เส้นขอบนอก (เลือกสี): ขอบด้านรับแสงใช้สีเงาเข้มของชิ้นนั้น ขอบด้านมืดใช้สีเส้นเข้มสุด
    float best = 1e9; vec4 bc = vec4(0.0); vec2 bq = p;
    for (int i = 0; i < 4; i++) { vec2 q = p + o[i]; vec4 b = A(q); if (b.a > 0.5) { float d = dep(N(q)); if (d < best) { best = d; bc = b; bq = q; } } }
    if (best > 1e8) discard;
    float m = kind(bc.a);
    vec3 base = toS(bc.rgb);
    float lv = m == 4.0 ? 2.0 : level(N(bq), m, bq);
    vec3 col = lv >= 3.0 ? ramp(base, 0.0, m) * 0.85 : ramp(base, 5.0, m);
    gl_FragColor = vec4(mix(col, uFlashCol * 0.55, uFlash * 0.5), 1.0);
    return;
  }
  float m = kind(a.a);
  vec3 base = toS(a.rgb);
  vec4 n = N(p); float d = dep(n);
  vec3 col;
  if (m == 4.0) col = base;                    // ชิ้นเรืองแสง: ไม่ลงเงา
  else {
    float lv = level(n, m, p);
    float line = 0.0;
    vec3 np = nrm(n);
    for (int i = 0; i < 4; i++) {
      vec2 q = p + o[i]; vec4 b = A(q);
      if (b.a < 0.5) continue;
      vec4 nq = N(q); float dq = dep(nq);
      bool other = distance(b.rgb, a.rgb) > 0.02;
      if (d - dq > (other ? 0.04 : m == 5.0 ? 0.05 : 0.12)) line = 1.0;
      else if (!other && m != 5.0 && d - dq > 0.004 && dot(np, nrm(nq)) < 0.3) line = 1.0;   // รอยพับคม
    }
    // เงาซอก (ใต้ผม ใต้แขน รอยต่อชุด): จุดที่ล้อมด้วยของที่อยู่ใกล้กล้องกว่า → มืดลง 1 ระดับ
    float occ = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 q = p + vec2(i < 2 ? -2.0 : 2.0, mod(float(i), 2.0) < 0.5 ? -2.0 : 2.0);
      vec4 b = A(q); if (b.a > 0.5 && d - dep(N(q)) > 0.05) occ += 1.0;
    }
    if (occ >= 2.0 && lv > 0.0 && lv < 4.0) lv -= 1.0;
    col = line > 0.5 ? (lv <= 1.0 ? mix(ramp(base, 5.0, m), ramp(base, 0.0, m), 0.45) : ramp(base, 0.0, m)) : ramp(base, lv, m);
  }
  // ตา
  vec2 py = vec2(p.x, uSize.y - 1.0 - p.y);
  for (int e = 0; e < 2; e++) {
    vec4 E = e == 0 ? uEye0 : uEye1;
    if (E.w < 0.25) continue;
    float narrow = E.w < 0.6 ? 1.0 : 0.0;
    vec2 q = py - vec2(E.x - (narrow > 0.5 ? 0.0 : 1.0), E.y - 2.0);
    if (q.x < 0.0 || q.y < 0.0 || q.x > 2.0 || q.y > 4.0) continue;
    if (d < E.z - 0.06) continue;              // ผม/หมวกบังตา
    float k = eyeCode(q, narrow, e == 0 ? -1.0 : 1.0);
    if (k == 1.0) col = vec3(0.12, 0.07, 0.12);
    else if (k == 2.0) col = uEyeCol * 0.6;
    else if (k == 3.0) col = vec3(1.0);
    else if (k == 4.0) col = min(vec3(1.0), uEyeCol * 1.2 + 0.14);
    else if (k == 5.0) col = vec3(0.96, 0.94, 0.95);
  }
  // ปาก: เส้นสั้น 1–2 พิกเซล สีผิวเข้ม
  if (uMouth.w > 0.4 && d >= uMouth.z - 0.06) {
    vec2 q = py - uMouth.xy;
    if (q.y == 0.0 && q.x >= 0.0 && q.x < (uMouth.w > 0.75 ? 2.0 : 1.0)) col = col * vec3(0.62, 0.42, 0.44);
  }
  gl_FragColor = vec4(mix(col, uFlashCol, uFlash), 1.0);
}`;

function nearestRT(w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true, stencilBuffer: false });
  rt.texture.generateMipmaps = false;
  return rt;
}

const hexOf = (c) => (typeof c === 'string' ? new THREE.Color(c) : c);
// สีเฉลี่ยของเท็กซ์เจอร์ (ผ้าลายตาราง/ลายดาว ฯลฯ) — สไปรต์ใช้สีเดียวต่อวัสดุ จึงเอาค่าเฉลี่ยมาคูณแทนสีขาว
const TEX_AVG = new WeakMap();
function texAvg(t) {
  if (TEX_AVG.has(t)) return TEX_AVG.get(t);
  let out = null;
  try {
    const img = t.image;
    if (img && (img.width || img.videoWidth)) {
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8);
      const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, bb = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
      if (n) { out = new THREE.Color(r / n / 255, gg / n / 255, bb / n / 255); if (t.encoding === THREE.sRGBEncoding) out.convertSRGBToLinear(); }
    }
  } catch (e) { out = null; }
  TEX_AVG.set(t, out); return out;
}

export class PixelSprites {
  constructor(renderer, scene, camera, { mobile = false } = {}) {
    this.r = renderer; this.scene = scene; this.camera = camera; this.mobile = mobile;
    this.list = new Map();          // key → sprite
    this.alb = nearestRT(SCRATCH, SCRATCH);
    this.nd = nearestRT(SCRATCH, SCRATCH);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
    this.cam.layers.set(PX_LAYER);
    this.ndMat = new THREE.ShaderMaterial({ vertexShader: ND_VS, fragmentShader: ND_FS, uniforms: { uNear: { value: 0.1 } }, side: THREE.DoubleSide });
    this.ndBias = new Map();   // ระยะดัน → วัสดุ
    this.post = new THREE.ShaderMaterial({
      vertexShader: POST_VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
      uniforms: {
        tA: { value: this.alb.texture }, tN: { value: this.nd.texture }, uSize: { value: new THREE.Vector2() },
        uL: { value: new THREE.Vector3(-0.38, 0.55, 0.74).normalize() },
        uEye0: { value: new THREE.Vector4() }, uEye1: { value: new THREE.Vector4() }, uMouth: { value: new THREE.Vector4() }, uEyeCol: { value: new THREE.Color() }, uEyeShut: { value: 0 },
        uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) },
      },
    });
    this.postScene = new THREE.Scene();
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post); q.frustumCulled = false; this.postScene.add(q);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.albCache = new WeakMap();
    this.tmpV = new THREE.Vector3(); this.tmpV2 = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion();
    this.frustum = new THREE.Frustum(); this.pm = new THREE.Matrix4();
    this.budget = mobile ? 5 : 10;  // จำนวนสไปรต์ที่วาดใหม่ได้ต่อเฟรม
    this.tint = new THREE.Color(1, 1, 1);   // สีแสงของแผนที่ (สไปรต์ไม่รับแสงจริง จึงคูณสีนี้แทน)
    this.enabled = true;
  }

  // ผูกโมเดลเข้ากับสไปรต์ · kind: char | npc | remote | mob | pet · opts: { eyes: [Object3D, Object3D], eyeColor, face }
  attach(key, view, kind, opts = {}) {
    this.detach(key);
    const root = view.root;
    const size = opts.size || this.measure(root, kind);
    const s = {
      key, view, root, kind, w: size.w, h: size.h, ax: size.ax, ay: size.ay,
      rt: nearestRT(size.w, size.h), t: Math.random() * STEP, dirty: true, meshes: [], scanN: -1, hidden: [], moved: [],
      eyes: opts.eyes || null, eyeColor: new THREE.Color(opts.eyeColor || '#3a2440'), face: opts.face || null,
      lastDir: null, lastYaw: null, px: opts.px || 0,
    };
    s.rt.texture.encoding = THREE.sRGBEncoding;
    const Q = s.px || PX;
    const geo = new THREE.PlaneGeometry(s.w * Q, s.h * Q);
    geo.translate((s.w / 2 - s.ax) * Q, (s.ay - s.h / 2) * Q, 0);
    s.board = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: s.rt.texture, transparent: false, alphaTest: 0.5, toneMapped: false, fog: true }));
    s.board.frustumCulled = false; s.board.renderOrder = 1;
    s.board.userData.pxBoard = true;
    this.scene.add(s.board);
    this.scan(s);
    this.list.set(key, s);
    return s;
  }

  detach(key) {
    const s = this.list.get(key); if (!s) return;
    this.scene.remove(s.board); s.board.geometry.dispose(); s.board.material.dispose(); s.rt.dispose();
    for (const o of s.hidden) o.visible = true;                 // คืนสภาพโมเดล (กรณีปิดโหมดพิกเซล)
    for (const o of s.moved) o.layers.set(0);
    this.list.delete(key);
  }

  // ขนาดภาพ: ประมาณจากกล่องรอบโมเดล (ท่ายืน) แล้วปัดขึ้นเป็นทวีคูณ 8
  measure(root, kind) {
    if (kind === 'char' || kind === 'npc' || kind === 'remote') return { w: 176, h: 184, ax: 88, ay: 156 };
    const box = new THREE.Box3();
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), b = new THREE.Box3();
    root.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.outline && o.visible) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); box.union(b); } });
    if (box.isEmpty()) return { w: 64, h: 64, ax: 32, ay: 52 };
    const rad = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z));
    const up = box.max.y * Math.cos(PITCH) + rad * Math.sin(PITCH);
    const w = Math.min(SCRATCH, Math.ceil(((rad * 2 + 0.7) / PX) / 8) * 8);
    const above = Math.ceil((up + 0.45) / PX), below = Math.ceil((rad * Math.sin(PITCH) + 0.35) / PX);
    const h = Math.min(SCRATCH, Math.ceil((above + below) / 8) * 8);
    return { w: Math.max(48, w), h: Math.max(48, h), ax: Math.max(48, w) / 2, ay: Math.min(h - 4, above) };
  }

  // แยกชิ้น: ชิ้นทึบ → วาดเป็นพิกเซล (ซ่อนจากฉากหลัก) · เส้นขอบเดิม/หน้าเดิม → ซ่อน · โปร่งแสงจาง ๆ/อนุภาค → คงเป็น 3D
  scan(s) {
    const meshes = [];
    let n = 0;
    s.root.traverse((o) => {
      n++;
      if (o.userData.pxSkip) return;
      if (o.userData.outline) { if (o.visible) { o.visible = false; s.hidden.push(o); } return; }
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      const m = o.material;
      if (o === s.face || (m.map && m.map.isTexture && o.userData.keep)) { if (o.visible) { o.visible = false; s.hidden.push(o); } return; }   // ใบหน้าเดิม → วาดตาเป็นพิกเซลแทน
      if (m.transparent && m.map) return;                          // เงาวงกลม/ภาพเรือง → คงเป็น 3D
      if (m.blending === THREE.AdditiveBlending || m.isShaderMaterial || m.isPointsMaterial) return;
      if (m.transparent && (m.opacity ?? 1) < 0.45) return;
      if (m.visible === false) return;
      if (o.layers.mask !== (1 << PX_LAYER)) { o.layers.set(PX_LAYER); s.moved.push(o); }
      if (o.userData.pxTiny === undefined) {               // ชิ้นจิ๋ว (ตา ปุ่ม จุดเงา) → ดันมาข้างหน้าเล็กน้อยตอนวาด
        const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        o.getWorldScale(this.tmpV2); const sc = Math.max(this.tmpV2.x, this.tmpV2.y, this.tmpV2.z);
        o.userData.pxTiny = g.boundingSphere.radius * sc < 0.075 ? 0.035 : 0;
      }
      meshes.push(o);
    });
    s.meshes = meshes; s.scanN = n; s.dirty = true;
  }

  albedo(m, tiny) {
    let pair = this.albCache.get(m);
    if (!pair) {
      const c = m.color ? m.color.clone() : new THREE.Color(1, 1, 1);
      const ta = m.map ? texAvg(m.map) : null; if (ta) c.multiply(ta);
      const e = m.emissive ? m.emissive.clone().multiplyScalar(m.emissiveIntensity ?? 1) : null;
      if (e && m.emissiveMap) { const ea = texAvg(m.emissiveMap); if (ea) e.multiply(ea); }
      const glow = !!e && e.r + e.g + e.b > 0.55;
      if (glow) c.add(e.multiplyScalar(0.35));
      if (m.transparent && (m.opacity ?? 1) < 0.8) c.lerp(new THREE.Color(1, 1, 1), 0.3);   // ปีกใส/วุ้นใส → สีอ่อนลงแทนความโปร่ง
      const U = m.userData || {};
      const code = glow ? 0.75 : U.pxHair ? 0.6 : U.pxSkin ? 0.82 : U.pxMetal ? 0.9 : 1;
      const mk = (bias) => new THREE.ShaderMaterial({ vertexShader: ALB_VS, fragmentShader: ALB_FS, side: THREE.DoubleSide,
        uniforms: { uColor: { value: c.clone() }, uCode: { value: code }, uBias: { value: bias } } });
      pair = new Map([[0, mk(0)]]); pair.mk = mk;
      pair.base = c;
      this.albCache.set(m, pair);
    }
    const b = tiny || 0;
    let a = pair.get(b); if (!a) pair.set(b, (a = pair.mk(b)));
    // วัสดุที่กระพริบ/แช่แข็ง (เปลี่ยน emissive ระหว่างเล่น)
    if (m.userData && m.userData.baseEmissive && m.emissive) {
      const be = m.userData.baseEmissive, col = a.uniforms.uColor.value;
      col.copy(pair.base);
      const dr = m.emissive.r - be.r, dg = m.emissive.g - be.g, db = m.emissive.b - be.b;
      if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) > 0.02) { col.r += dr; col.g += dg; col.b += db; }
    }
    return a;
  }

  ndFor(b) {
    let m = this.ndBias.get(b);
    if (!m) { m = new THREE.ShaderMaterial({ vertexShader: ND_VS_B, fragmentShader: ND_FS, uniforms: { uNear: this.ndMat.uniforms.uNear, uBias: { value: b } }, side: THREE.DoubleSide }); this.ndBias.set(b, m); }
    return m;
  }

  // วาดสไปรต์ทุกตัวที่ถึงรอบ (เรียกก่อนวาดฉากหลัก)
  update(dt) {
    if (!this.enabled || !this.list.size) return;
    const r = this.r, cam = this.camera;
    cam.getWorldDirection(this.tmpV); const yaw = Math.atan2(-this.tmpV.x, -this.tmpV.z);   // มุมกล้องรอบแกนตั้ง
    this.pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.pm);
    const due = [];
    for (const s of this.list.values()) {
      // แผ่นป้าย: ตามตำแหน่งเท้า หันหากล้อง ดันเข้าหากล้องเล็กน้อยกันจมพื้น
      const vis = s.root.visible && this.visibleUp(s.root);
      s.board.visible = vis;
      if (!vis) continue;
      s.board.material.color.copy(this.tint);
      s.root.getWorldPosition(this.tmpV);
      const toCam = this.tmpV2.copy(cam.position).sub(this.tmpV); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
      const push = 0.45;
      s.board.position.copy(this.tmpV).addScaledVector(toCam, push);
      s.board.quaternion.copy(cam.quaternion);
      s.board.scale.setScalar((dist - push) / dist);
      if (!this.frustum.intersectsSphere(new THREE.Sphere(this.tmpV, 2.5))) continue;
      s.t += dt;
      const rel = s.root.rotation.y - yaw;
      const dir = Math.round(rel / DIR);
      if (dir !== s.lastDir || Math.abs(yaw - (s.lastYaw ?? 99)) > 0.02) s.dirty = true;
      if (s.dirty || s.t >= STEP) due.push(s);
    }
    if (!due.length) return;
    due.sort((a, b) => (b.dirty - a.dirty) || (b.t - a.t));
    const prevRT = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevAlpha = r.getClearAlpha(), prevAuto = r.autoClear;
    const prevTone = r.toneMapping, prevEnc = r.outputEncoding, prevShadow = r.shadowMap.autoUpdate;
    r.toneMapping = THREE.NoToneMapping; r.autoClear = false; r.shadowMap.autoUpdate = false;
    r.setClearColor(0x000000, 0);
    let n = 0;
    for (const s of due) {
      if (n++ >= this.budget) break;
      this.draw(s, yaw);
      s.t = s.t % STEP; s.dirty = false;
    }
    r.setRenderTarget(prevRT); r.setClearColor(prevClear, prevAlpha); r.autoClear = prevAuto;
    r.toneMapping = prevTone; r.outputEncoding = prevEnc; r.shadowMap.autoUpdate = prevShadow;
  }

  visibleUp(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }

  draw(s, yaw) {
    const r = this.r, cam = this.cam, root = s.root;
    // มีชิ้นใหม่ (เปลี่ยนชุด/อาวุธ) → แยกชิ้นใหม่
    let n = 0; root.traverse(() => { n++; }); if (n !== s.scanN) this.scan(s);
    // หันได้ 8 ทิศเทียบกับกล้อง (แบบ RO)
    const keepYaw = root.rotation.y;
    const rel = keepYaw - yaw, dir = Math.round(rel / DIR);
    root.rotation.y = yaw + dir * DIR;
    root.updateMatrixWorld(true);
    s.lastDir = dir; s.lastYaw = yaw;
    root.getWorldPosition(this.tmpV);
    const P = this.tmpV;
    const Q = s.px || PX;
    cam.left = -s.ax * Q; cam.right = (s.w - s.ax) * Q; cam.top = s.ay * Q; cam.bottom = -(s.h - s.ay) * Q;
    const D = 12;
    cam.position.set(P.x + Math.sin(yaw) * Math.cos(PITCH) * D, P.y + Math.sin(PITCH) * D, P.z + Math.cos(yaw) * Math.cos(PITCH) * D);
    cam.up.set(0, 1, 0); cam.lookAt(P);
    cam.near = D - 8; cam.far = D + 16; this.ndMat.uniforms.uNear.value = cam.near;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    // รอบ 1: สีพื้น
    const ms = s.meshes, keep = new Array(ms.length);
    for (let i = 0; i < ms.length; i++) { const o = ms[i]; keep[i] = o.material; o.material = this.albedo(keep[i], o.userData.pxTiny); }
    for (const T of [this.alb, this.nd]) { T.viewport.set(0, 0, s.w, s.h); T.scissor.set(0, 0, s.w, s.h); T.scissorTest = true; }
    r.outputEncoding = THREE.LinearEncoding;
    r.setRenderTarget(this.alb); r.clear(true, true, false); r.render(root, cam);
    // รอบ 2: ทิศพื้นผิว + ความลึก
    for (let i = 0; i < ms.length; i++) ms[i].material = ms[i].userData.pxTiny ? this.ndFor(ms[i].userData.pxTiny) : this.ndMat;
    r.setRenderTarget(this.nd); r.clear(true, true, false); r.render(root, cam);
    for (let i = 0; i < ms.length; i++) ms[i].material = keep[i];
    root.rotation.y = keepYaw; root.updateMatrixWorld(true);
    // ตา: ฉายตำแหน่งจุดตาลงพิกเซล
    const U = this.post.uniforms;
    U.uEye0.value.set(0, 0, 0, 0); U.uEye1.value.set(0, 0, 0, 0); U.uMouth.value.set(0, 0, 0, 0);
    if (s.eyes) {
      root.rotation.y = yaw + dir * DIR; root.updateMatrixWorld(true);
      const toCam = new THREE.Vector3().subVectors(cam.position, P).normalize();
      const mark = (e, out) => {
        const p = e.getWorldPosition(new THREE.Vector3());
        const f = new THREE.Vector3(0, 0, 1).transformDirection(e.matrixWorld);
        const v = p.clone().project(cam);
        const x = Math.round((v.x * 0.5 + 0.5) * s.w - 0.5), y = Math.round((1 - (v.y * 0.5 + 0.5)) * s.h - 0.5);
        const dz = p.clone().applyMatrix4(cam.matrixWorldInverse).z;
        out.set(x, y, -dz - cam.near, f.dot(toCam));
      };
      s.eyes.forEach((e, i) => mark(e, (i === 0 ? U.uEye0 : U.uEye1).value));
      if (s.view.mouth) { mark(s.view.mouth, U.uMouth.value); U.uMouth.value.x -= U.uMouth.value.w > 0.75 ? 1 : 0; }
      root.rotation.y = keepYaw; root.updateMatrixWorld(true);
      U.uEyeCol.value.copy(s.eyeColor);
      U.uEyeShut.value = s.view.face && s.view.faceClosed && s.view.face.material === s.view.faceClosed ? 1 : 0;
    }
    const hv = s.view;
    const hurt = hv.hurtT > 0 ? Math.min(1, hv.hurtT / 0.22) : 0;
    U.uFlash.value = s.kind === 'mob' ? 0 : hurt * 0.55;   // มอน: กระพริบผ่านสีวัสดุอยู่แล้ว
    U.uSize.value.set(s.w, s.h);
    // ลงสีพิกเซลอาร์ตลงภาพของตัวนี้
    r.setRenderTarget(s.rt); r.clear(true, true, false); r.render(this.postScene, this.postCam);
  }

  // จุดตาของตัวละคร (อ้างอิงตำแหน่งลายหน้าเดิมบนหัว)
  static eyeMarkers(view) {
    if (!view.head) return null;
    if (view.pxEyes) return view.pxEyes;
    const r0 = 0.2625, mk = [];
    for (const [u, side] of [[82 / 256, -1], [174 / 256, 1]]) {
      const v = 84 / 180, phi = Math.PI * 0.22 + u * Math.PI * 0.56, th = Math.PI * 0.33 + v * Math.PI * 0.4;
      const pos = new THREE.Vector3(-r0 * Math.cos(phi) * Math.sin(th), r0 * Math.cos(th) + 0.2, r0 * Math.sin(phi) * Math.sin(th));
      const o = new THREE.Object3D(); o.position.copy(pos);
      const out = pos.clone().sub(new THREE.Vector3(0, 0.2, 0)).normalize();
      o.lookAt(o.position.clone().add(out));
      o.userData.side = side; o.userData.pxSkip = true;
      view.head.add(o); mk.push(o);
    }
    // ด้านซ้ายจอก่อน (เมื่อหันหน้าเข้ากล้อง แกน x ของโมเดลชี้ไปขวาจอ)
    view.pxEyes = mk;
    return mk;
  }

  // ภาพนิ่งพิกเซล (รูปย่อในหน้าต่างต่าง ๆ) · R = ตัวเรนเดอร์ของหน้าต่างนั้น · คืน canvas ขนาด n×n
  static snap(R, root, { n = 64, fill = 0.88, angle = -Math.PI / 4, view = null, kind = 'mob', eyes = null, eyeColor, face = null, eyesOf = null } = {}) {
    let px = SNAPS.get(R);
    if (!px) { px = new PixelSprites(R, new THREE.Scene(), null); px.enabled = true; SNAPS.set(R, px); }
    const keepRot = root.rotation.y;
    root.rotation.y = angle; root.updateMatrixWorld(true);
    // กรอบภาพตามมุมกล้องพิกเซล (yaw 0, ก้ม 30°)
    const P = root.getWorldPosition(new THREE.Vector3());
    const ux = new THREE.Vector3(1, 0, 0), uy = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const v = new THREE.Vector3(), box = new THREE.Box3();
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || o.userData.outline || !o.geometry || !o.material || Array.isArray(o.material)) return;
      const m = o.material; if ((m.transparent && (m.map || (m.opacity ?? 1) < 0.45)) || m.blending === THREE.AdditiveBlending || m.visible === false) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      for (let i = 0; i < 8; i++) { v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(P);
        const a = v.dot(ux), b = v.dot(uy); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    });
    if (x1 < x0) { root.rotation.y = keepRot; return null; }
    const q = Math.max((x1 - x0) / (n * fill), (y1 - y0) / (n * fill), 0.004);
    const size = { w: n, h: n, ax: Math.round(n / 2 - (x0 + x1) / 2 / q), ay: Math.round(n / 2 + (y0 + y1) / 2 / q) };
    const vw = view || { root };
    const s = px.attach(vw, vw, kind, { size, px: q, eyes: eyes || (eyesOf ? PixelSprites.eyeMarkers(eyesOf) : null), eyeColor, face });
    const prev = { tm: R.toneMapping, ac: R.autoClear, enc: R.outputEncoding, rt: R.getRenderTarget(), cc: R.getClearColor(new THREE.Color()), ca: R.getClearAlpha(), sh: R.shadowMap.autoUpdate };
    R.toneMapping = THREE.NoToneMapping; R.autoClear = false; R.shadowMap.autoUpdate = false; R.setClearColor(0x000000, 0);
    let out = null;
    try {
      px.draw(s, 0);
      const buf = new Uint8Array(n * n * 4); R.readRenderTargetPixels(s.rt, 0, 0, n, n, buf);
      out = document.createElement('canvas'); out.width = out.height = n;
      const g = out.getContext('2d'), im = g.createImageData(n, n);
      for (let y = 0; y < n; y++) im.data.set(buf.subarray((n - 1 - y) * n * 4, (n - y) * n * 4), y * n * 4);
      g.putImageData(im, 0, 0);
    } finally {
      R.setRenderTarget(prev.rt); R.toneMapping = prev.tm; R.autoClear = prev.ac; R.outputEncoding = prev.enc; R.setClearColor(prev.cc, prev.ca); R.shadowMap.autoUpdate = prev.sh;
      px.detach(vw); root.rotation.y = keepRot; root.updateMatrixWorld(true);
    }
    return out;
  }

  // วาดภาพนิ่งลงผืนผ้าใบขนาด size (ขยายแบบพิกเซลคม ๆ จัดกลาง) · bg = canvas พื้นหลัง (ถ้ามี)
  static compose(sprite, size, bg = null) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (bg) g.drawImage(bg, 0, 0, size, size);
    if (sprite) { const k = Math.max(1, Math.floor(size / sprite.width)); const w = sprite.width * k; g.drawImage(sprite, (size - w) / 2, (size - w) / 2, w, w); }
    return c;
  }

  setFocus(v) { this.focus = v; }
  dispose() { for (const k of [...this.list.keys()]) this.detach(k); this.alb.dispose(); this.nd.dispose(); }
}
