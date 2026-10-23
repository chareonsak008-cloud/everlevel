// v0.93 fix7 เอฟเฟกต์อลังการ: วงเวทจุดวาร์ป (ถาวรบนแผนที่) · ตอนวาร์ปมาถึง · ตอนเลเวลอัป
// ทุกชิ้นใช้ภาพที่วาดด้วยโค้ด (สีขาว แล้วย้อมสีด้วยวัสดุ) + อนุภาคเชดเดอร์ (ขนาด/สี/ความจางต่อเม็ด) วาดเป็นชุดเดียว
import { THREE } from './three.js?v=0.93.0-p1.9';
import { LightSpot } from './Effects.js?v=0.93.0-p1.9';

const TAU = Math.PI * 2;
const ADD = THREE.AdditiveBlending;
// "แสงกึ่งบวก": เรืองแบบบวกแสงบนพื้นมืด แต่บังพื้นหลังครึ่งหนึ่ง → บนพื้นสว่าง (เมือง/หิมะ) ยังเห็นสีชัด ไม่ขาวโพลน
const OCC = 0.6;
const soft = (m) => {
  m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(/\}\s*$/, `gl_FragColor = vec4(gl_FragColor.rgb * gl_FragColor.a, gl_FragColor.a * ${OCC.toFixed(2)});\n}`); };
  m.customProgramCacheKey = () => 'gfx-soft';
  return m;
};
const cache = new Map();
const tex = (key, draw, N = 512) => {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'); g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = g.lineJoin = 'round';
  draw(g, N / 2, N);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; cache.set(key, t); return t;
};
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const ring = (g, C, r, w) => { g.lineWidth = w; g.beginPath(); g.arc(C, C, r, 0, TAU); g.stroke(); };
const poly = (g, C, r, n, step, rot = -Math.PI / 2, w = 3) => {
  g.lineWidth = w; g.beginPath();
  for (let i = 0; i <= n; i++) { const a = rot + ((i * step) % n) / n * TAU; const x = C + Math.cos(a) * r, y = C + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
};
const glyph = (g, k, s) => {
  g.beginPath();
  switch (k % 7) {
    case 0: g.moveTo(-s, -s); g.lineTo(0, s); g.lineTo(s, -s); g.moveTo(-s * 0.5, 0); g.lineTo(s * 0.5, 0); break;
    case 1: g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(-s, -s * 0.4); g.lineTo(s, -s * 0.4); g.moveTo(-s * 0.6, s * 0.5); g.lineTo(s * 0.6, s * 0.5); break;
    case 2: g.arc(0, 0, s * 0.8, 0.5, TAU - 0.5); g.moveTo(0, -s * 1.2); g.lineTo(0, s * 1.2); break;
    case 3: g.moveTo(-s, s); g.lineTo(-s, -s); g.lineTo(s, 0); g.lineTo(-s, s); break;
    case 4: g.moveTo(-s, -s); g.lineTo(s, s); g.moveTo(s, -s); g.lineTo(-s, s); g.moveTo(0, -s * 1.2); g.lineTo(0, -s * 0.4); break;
    case 5: g.arc(0, -s * 0.3, s * 0.5, 0, TAU); g.moveTo(0, s * 0.2); g.lineTo(0, s * 1.2); g.moveTo(-s * 0.6, s * 0.7); g.lineTo(s * 0.6, s * 0.7); break;
    default: g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 1.6, s, 0); g.quadraticCurveTo(0, s * 1.6, -s, 0); g.moveTo(0, -s * 0.3); g.lineTo(0, s * 0.3);
  }
  g.stroke();
};
const softFill = (g, C, r, a0, a1) => {
  const gr = g.createRadialGradient(C, C, 0, C, C, r);
  gr.addColorStop(0, `rgba(255,255,255,${a0})`); gr.addColorStop(0.65, `rgba(255,255,255,${a1})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, C * 2, C * 2); g.fillStyle = '#fff';
};

/* ---------- ภาพวงเวท 3 ชั้น ---------- */
// ชั้นนอก: วงแหวนคู่ ขีดสเกล อักขระรูน 36 ตัว จุดประดับ 12 จุด
export const sigilOuter = () => tex('gfx-sigilA', (g, C) => {
  seed = 11;
  ring(g, C, 250, 5); ring(g, C, 240, 1.6); ring(g, C, 196, 3); ring(g, C, 186, 1.4);
  for (let i = 0; i < 120; i++) { const a = i / 120 * TAU, l = i % 5 ? 6 : 14; g.lineWidth = i % 5 ? 1.4 : 2.6; g.beginPath(); g.moveTo(C + Math.cos(a) * 240, C + Math.sin(a) * 240); g.lineTo(C + Math.cos(a) * (240 - l), C + Math.sin(a) * (240 - l)); g.stroke(); }
  g.lineWidth = 2.6;
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; g.save(); g.translate(C + Math.cos(a) * 212, C + Math.sin(a) * 212); g.rotate(a + Math.PI / 2); glyph(g, (rnd() * 7) | 0, 8); g.restore(); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.arc(C + Math.cos(a) * 250, C + Math.sin(a) * 250, i % 3 ? 5 : 9, 0, TAU); g.fill(); }
  // ซุ้มโค้งเชื่อมระหว่างวง
  g.lineWidth = 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + TAU / 24; g.beginPath(); g.arc(C + Math.cos(a) * 186, C + Math.sin(a) * 186, 22, a + Math.PI * 0.5, a + Math.PI * 1.5); g.stroke(); }
  softFill(g, C, 252, 0, 0.06);
});
// ชั้นกลาง: ดาวเจ็ดแฉก + หกเหลี่ยม + วงย่อย 7 วงที่ปลายแฉก
export const sigilMid = () => tex('gfx-sigilB', (g, C) => {
  ring(g, C, 246, 4); ring(g, C, 226, 1.5);
  poly(g, C, 226, 7, 3, -Math.PI / 2, 3.2); poly(g, C, 226, 7, 2, -Math.PI / 2, 1.6);
  poly(g, C, 150, 6, 1, 0, 2.4); ring(g, C, 132, 2);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + i / 7 * TAU, x = C + Math.cos(a) * 226, y = C + Math.sin(a) * 226;
    g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, 17, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
  }
  seed = 23; g.lineWidth = 2.2;
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; g.save(); g.translate(C + Math.cos(a) * 112, C + Math.sin(a) * 112); g.rotate(a + Math.PI / 2); glyph(g, (rnd() * 7) | 0, 6); g.restore(); }
});
// แกนกลาง: วงซ้อน + ดาวห้าแฉก + จันทร์เสี้ยว 4 ทิศ + ดวงตาเรืองแสงกลางวง
export const sigilCore = () => tex('gfx-sigilC', (g, C) => {
  ring(g, C, 244, 5); ring(g, C, 206, 2); ring(g, C, 92, 3);
  poly(g, C, 206, 5, 2, -Math.PI / 2, 4); poly(g, C, 206, 4, 1, -Math.PI / 4, 2);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU, x = C + Math.cos(a) * 150, y = C + Math.sin(a) * 150;
    g.beginPath(); g.arc(x, y, 22, 0, TAU); g.fill(); g.save(); g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 19, 0, TAU); g.fill(); g.restore();
  }
  softFill(g, C, 120, 0.9, 0.25);
});
// ลำแสงอาทิตย์ (รังสีแผ่ออก)
export const raysTex = () => tex('gfx-rays', (g, C) => {
  seed = 41;
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU + rnd() * 0.05, w = (i % 2 ? 0.018 : 0.04) + rnd() * 0.02, L = C * (i % 2 ? 0.7 : 0.98) * (0.75 + rnd() * 0.25);
    const gr = g.createRadialGradient(C, C, 0, C, C, L); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(C, C); g.arc(C, C, L, a - w, a + w); g.closePath(); g.fill();
  }
  softFill(g, C, C * 0.45, 0.9, 0.2);
});
// วงคลื่นกระแทก (ขอบนุ่ม)
export const shockTex = () => tex('gfx-shock', (g, C) => {
  const gr = g.createRadialGradient(C, C, C * 0.62, C, C, C);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.9, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, C * 2, C * 2);
}, 256);
// ประกายดาวสี่แฉก
export const starTex = () => tex('gfx-star2', (g, C) => {
  softFill(g, C, C * 0.62, 1, 0.45);
  for (const [w, L] of [[C * 0.09, C], [C * 0.06, C * 0.62]]) {
    for (let k = 0; k < (L === C ? 2 : 2); k++) {
      const rot = (L === C ? 0 : Math.PI / 4) + k * Math.PI / 2;
      g.save(); g.translate(C, C); g.rotate(rot);
      const gr = g.createLinearGradient(-L, 0, L, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.closePath(); g.fill(); g.restore();
    }
  }
}, 128);
export const softTex = () => tex('gfx-soft', (g, C) => softFill(g, C, C, 1, 0.3), 64);
// ลำแสง: ริ้วแนวตั้ง จางขึ้นด้านบน (ใช้พันรอบทรงกระบอก)
export const streakTex = () => tex('gfx-streak', (g, C, N) => {
  seed = 57;
  for (let i = 0; i < 40; i++) {
    const x = rnd() * N, w = 2 + rnd() * 10, gr = g.createLinearGradient(0, N, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.25 + rnd() * 0.6; g.fillStyle = gr; g.fillRect(x, 0, w, N);
  }
  g.globalAlpha = 1;
}, 256);
// เกลียวหมุนวน (เลื่อน UV ให้ดูเหมือนพลังไหลขึ้น)
export const spiralTex = () => {
  const t = tex('gfx-spiral', (g, C, N) => {
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 8 + (i % 2) * 10; g.globalAlpha = i % 2 ? 0.35 : 0.85; g.beginPath();
      for (let y = 0; y <= N; y += 4) { const x = ((i / 6) * N + y * 0.9) % (N * 1.2) - N * 0.1; y ? g.lineTo(x, N - y) : g.moveTo(x, N); }
      g.stroke();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, N, 0, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
  }, 256);
  t.wrapS = THREE.RepeatWrapping; return t;
};

// สายฟ้า (ภาพแนวตั้ง 128×512 · 3 แบบ)
const boltTex = (k) => {
  const key = 'gfx-bolt' + k; if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  seed = 101 + k * 17; g.lineCap = g.lineJoin = 'round';
  const path = (x, y, len, w, depth) => {
    const pts = [[x, y]]; let cx = x, cy = y;
    while (cy < y + len && cy < 508) { cx += (rnd() - 0.5) * 34; cx = Math.max(8, Math.min(120, cx)); cy += 14 + rnd() * 22; pts.push([cx, cy]); if (depth < 2 && rnd() < 0.16) path(cx, cy, 60 + rnd() * 90, w * 0.55, depth + 1); }
    for (const [lw, a] of [[w * 5, 0.18], [w * 2.4, 0.45], [w, 1]]) { g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = lw; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
  };
  path(64, 0, 512, 4, 0);
  const t = new THREE.CanvasTexture(c); cache.set(key, t); return t;
};
// อักษรรูนเรืองแสงทีละตัว
const glyphTex = (k) => tex('gfx-glyph' + (k % 7), (g, C) => {
  softFill(g, C, C, 0.55, 0.12);
  g.save(); g.translate(C, C); g.lineWidth = 9; glyph(g, k, 34); g.restore();
  ring(g, C, C * 0.86, 4);
}, 128);
// ปีกแสง (ฝั่งขวา · จุดยึดอยู่ซ้ายกลางภาพ)
const wingTex = () => tex('gfx-wing2', (g, C, N) => {
  const ox = 14, oy = N * 0.6;
  // เงาปีกทึบนุ่ม (ทรงปีกนก: ขอบบนโค้งขึ้นไปปลายปีก ขอบล่างเป็นหยักขนนก)
  const shape = () => {
    g.beginPath(); g.moveTo(ox, oy - 10);
    g.bezierCurveTo(N * 0.25, N * 0.2, N * 0.6, N * 0.02, N * 0.98, N * 0.04);
    const tips = 9;
    for (let i = 0; i <= tips; i++) {
      const k = i / tips, x = N * (0.98 - k * 0.8), y = N * (0.04 + k * 0.62) + Math.sin(k * Math.PI) * N * 0.18;
      const px = N * (0.98 - (k - 0.5 / tips) * 0.8) - 18, py = y - N * 0.07;
      i ? g.quadraticCurveTo(px, py, x, y) : g.lineTo(x, y);
    }
    g.quadraticCurveTo(N * 0.12, N * 0.75, ox, oy + 10); g.closePath();
  };
  const gr = g.createLinearGradient(ox, oy, N, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)');
  g.fillStyle = gr; shape(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 4; shape(); g.stroke();
  // ก้านขนนกแต่ละเส้น
  for (let i = 0; i < 10; i++) {
    const k = i / 9, ex = N * (0.96 - k * 0.78), ey = N * (0.05 + k * 0.62) + Math.sin(k * Math.PI) * N * 0.18;
    g.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.3})`; g.lineWidth = 3 - k; g.beginPath(); g.moveTo(ox + 20, oy - 6); g.quadraticCurveTo((ox + ex) / 2, (oy + ey) / 2 - N * 0.12, ex - 10, ey - 12); g.stroke();
  }
  // แถวขนคลุม (เกล็ดโค้ง)
  for (let row = 0; row < 3; row++) for (let i = 0; i < 7 - row; i++) {
    const x = ox + 50 + i * (48 - row * 4) + row * 20, y = oy - 70 - i * (26 - row * 3) + row * 40;
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 20 - row * 3, 0.2, Math.PI - 0.2); g.stroke();
  }
  const gl = g.createRadialGradient(ox, oy, 0, ox, oy, N * 0.4); gl.addColorStop(0, 'rgba(255,255,255,1)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, N, N);
});
// ปีกซ้าย = ภาพกลับด้าน (สไปรต์ใช้สเกลติดลบกลับด้านไม่ได้)
const wingTexL = () => { const k = 'gfx-wing2L'; if (cache.has(k)) return cache.get(k); const t = wingTex().clone(); t.repeat.x = -1; t.offset.x = 1; t.needsUpdate = true; cache.set(k, t); return t; };
// ขนนกแสงเล็ก
const featherTex = () => tex('gfx-feather', (g, C) => {
  g.save(); g.translate(C, C); g.rotate(-0.5);
  const gr = g.createLinearGradient(0, -C, 0, C); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.4)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -C * 0.9); g.quadraticCurveTo(C * 0.38, -C * 0.1, 0, C * 0.85); g.quadraticCurveTo(-C * 0.38, -C * 0.1, 0, -C * 0.9); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -C * 0.8); g.lineTo(0, C * 0.95); g.stroke(); g.restore();
}, 128);
// ตาข่ายหกเหลี่ยม (โดมพลังงาน)
const hexTex = () => {
  const t = tex('gfx-hex', (g, C, N) => {
    const r = N / 8, h = r * Math.sqrt(3) / 2; g.lineWidth = 3;
    for (let row = -1; row < 10; row++) for (let col = -1; col < 7; col++) {
      const x = col * r * 1.5, y = row * h * 2 + (col % 2 ? h : 0);
      g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; const px = x + Math.cos(a) * r * 0.92, py = y + Math.sin(a) * r * 0.92; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    }
  }, 256);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};

/* ---------- อนุภาคเชดเดอร์ (สี/ขนาด/ความจางต่อเม็ด) ---------- */
const VS = `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float scale; varying vec3 vC; varying float vA;
void main(){ vC=aColor; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`;
const FS = `uniform sampler2D map; varying vec3 vC; varying float vA;
void main(){ vec4 t=texture2D(map,gl_PointCoord); float a=t.a*vA; if(a<0.004) discard; gl_FragColor=vec4(vC*t.rgb*a,a*0.6); }`;
const SCALE = { value: 420 };
export class PointCloud {
  constructor(parent, n, map) {
    this.n = n;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, scale: SCALE }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 6;
    parent.add(this.points);
  }
  flush() { const a = this.points.geometry.attributes; a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true; }
  dispose() { this.points.parent?.remove(this.points); this.points.geometry.dispose(); this.mat.dispose(); }
}
// ทุกชุดอนุภาคใช้ตัวแปรขนาดจอร่วมกัน (เปลี่ยนที่เดียว มีผลทุกชุด)
export const setGrandViewport = (height, fovDeg) => { SCALE.value = height / (2 * Math.tan((fovDeg * Math.PI) / 360)); };

const C3 = new THREE.Color();
const mix = (a, b, k) => C3.set(a).lerp(new THREE.Color(b), k);
// สีเข้มจัด (ใช้กับลวดลายบนพื้น — สีพาสเทลบวกแสงบนพื้นสว่างจะกลายเป็นขาวโพลน)
const deep = (c, l = 0.55) => { const h = {}; new THREE.Color(c).getHSL(h); return new THREE.Color().setHSL(h.h, 1, l).getStyle(); };
// แผ่นเงาเข้มใต้วงเวท (ผสมแบบปกติ) ให้ลวดลายเรืองแสงตัดกับพื้นสว่าง
const underlay = (size, color = '#0b0624') => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: softTex(), color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.renderOrder = 1; return m;
};
const flatPlane = (size, map, color, y = 0.04) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), soft(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 2; return m;
};
const tube = (rTop, rBot, h, map, color) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 36, 1, true), soft(new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
  m.position.y = h / 2; m.renderOrder = 5; return m;
};
const sprite = (map, color, s) => { const sp = new THREE.Sprite(soft(new THREE.SpriteMaterial({ map, color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }))); sp.scale.set(s, s, 1); sp.renderOrder = 7; return sp; };
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const back = (x) => { x = Math.min(1, Math.max(0, x)); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const fade = (t, a, b, c, d) => (t < a ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : t < d ? 1 - (t - c) / (d - c) : 0);

/* =========================================================
   1) วงเวทจุดวาร์ป (อยู่ถาวรบนแผนที่) — แทนประตูมิติแบบเดิม
   ========================================================= */
// วังวนประตูมิติ (แขนเกลียว 5 แขน + แกนสว่าง) — หมุนด้วย material.rotation
const vortexTex = () => tex('gfx-vortex', (g, C) => {
  softFill(g, C, C * 0.95, 0.35, 0.18);
  for (let arm = 0; arm < 5; arm++) {
    const a0 = arm / 5 * TAU;
    for (let k = 0; k < 120; k++) {
      const q = k / 120, th = a0 + q * 5.2, r = C * (0.06 + q * 0.9);
      const x = C + Math.cos(th) * r, y = C + Math.sin(th) * r, w = (1 - q) * 30 + 6;
      g.globalAlpha = (1 - q) * 0.5 + 0.08; g.beginPath(); g.arc(x, y, w, 0, TAU); g.fill();
    }
  }
  g.globalAlpha = 1;
  const core = g.createRadialGradient(C, C, 0, C, C, C * 0.35); core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.5, 'rgba(255,255,255,0.6)'); core.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = core; g.fillRect(0, 0, C * 2, C * 2);
  g.globalCompositeOperation = 'destination-in';
  const edge = g.createRadialGradient(C, C, C * 0.7, C, C, C); edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = edge; g.fillRect(0, 0, C * 2, C * 2);
});
// กรอบประตูวงแหวน (วงคู่ + ซี่รอบวง + อัญมณี 8 เม็ด)
const gateRingTex = () => tex('gfx-gate2', (g, C) => {
  ring(g, C, 236, 20); ring(g, C, 212, 7); ring(g, C, 252, 5);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.lineWidth = i % 6 ? 3 : 7; g.beginPath(); g.moveTo(C + Math.cos(a) * 214, C + Math.sin(a) * 214); g.lineTo(C + Math.cos(a) * (i % 6 ? 200 : 186), C + Math.sin(a) * (i % 6 ? 200 : 186)); g.stroke(); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, x = C + Math.cos(a) * 238, y = C + Math.sin(a) * 238; g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-16, 0); g.lineTo(0, -12); g.lineTo(16, 0); g.lineTo(0, 12); g.closePath(); g.fill(); g.restore(); }
  seed = 77; g.lineWidth = 3;
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + 0.13; g.save(); g.translate(C + Math.cos(a) * 226, C + Math.sin(a) * 226); g.rotate(a + Math.PI / 2); glyph(g, (rnd() * 7) | 0, 6); g.restore(); }
});

export class GrandPortal {
  constructor(parent, x, z, locked = false) {
    const P = locked
      ? { a: '#ff9a5e', b: '#ffc27a', c: '#ffe0b0', beam: '#ff9a62', core: '#ffd9a8', light: '#ff9a5a' }
      : { a: '#9b7bff', b: '#5fd0ff', c: '#e6dcff', beam: '#8f7bff', core: '#bff2ff', light: '#a07bff' };
    this.P = P; this.locked = locked;
    const g = this.group = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
    const add = (o) => { g.add(o); return o; };
    this.GY = 1.75;   // ความสูงศูนย์กลางประตู
    // --- พื้น: เงา · แสง · รังสี · วงเวท 3 ชั้น
    this.shade = add(underlay(7)); this.shade.material.opacity = locked ? 0.4 : 0.68; g.scale.setScalar(1.15);
    this.glow = add(flatPlane(5.6, softTex(), deep(P.a, 0.4), 0.02));
    this.rays = add(flatPlane(6.2, raysTex(), deep(P.b, 0.5), 0.028));
    this.outer = add(flatPlane(5.0, sigilOuter(), deep(P.a, 0.5), 0.035));
    this.mid = add(flatPlane(3.4, sigilMid(), deep(P.b, 0.5), 0.045));
    this.core = add(flatPlane(1.8, sigilCore(), deep(P.c, 0.75), 0.055));
    this.waves = [0, 0.33, 0.66].map((ph) => ({ m: add(flatPlane(1, shockTex(), deep(P.b, 0.6), 0.065)), ph }));   // คลื่นแสงแผ่บนพื้นเป็นจังหวะ
    // --- ประตูวังวนตั้งตรง (หันหาจอ)
    this.vortex = add(sprite(vortexTex(), deep(P.a, 0.42), 2.6)); this.vortex.renderOrder = 4;
    this.vortex2 = add(sprite(vortexTex(), deep(P.b, 0.48), 2.0)); this.vortex2.renderOrder = 5;
    this.gate = add(sprite(gateRingTex(), deep(P.b, 0.62), 3.0)); this.gate.renderOrder = 6;
    this.gate2 = add(sprite(sigilOuter(), deep(P.b, 0.62), 3.7)); this.gate2.renderOrder = 6;
    this.eye = add(sprite(starTex(), deep(P.core, 0.75), 1.0)); this.eye.renderOrder = 7;
    for (const o of [this.vortex, this.vortex2, this.gate, this.gate2, this.eye]) o.position.y = this.GY;
    // --- เสาแสงจากพื้นถึงฟ้า (บางลง ไม่บังประตู)
    this.beam = add(tube(0.55, 0.75, 6, streakTex(), deep(P.beam, 0.6)));
    this.coreBeam = add(tube(0.08, 0.14, 7, streakTex(), deep(P.core, 0.8)));
    // --- ผลึกลอย 6 แท่งรอบวง + สายพลังงานโยงเข้าประตู
    const cg = new THREE.OctahedronGeometry(0.3, 0); cg.scale(0.75, 2.6, 0.75);
    const tg = new THREE.CylinderGeometry(0.035, 0.035, 1, 6, 1, true); tg.translate(0, 0.5, 0); tg.rotateX(Math.PI / 2);
    this.crystals = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + Math.PI / 6;
      const m = add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: deep(i % 2 ? P.a : P.b, 0.62), transparent: true, opacity: 0.95, toneMapped: false })));
      const inner = add(new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, toneMapped: false }))); inner.scale.setScalar(0.5);
      const halo = add(sprite(softTex(), deep(i % 2 ? P.a : P.b, 0.6), 1.1)); halo.material.opacity = 0.9;
      const base = add(flatPlane(1.1, sigilCore(), deep(P.b, 0.65), 0.07));
      const tether = add(new THREE.Mesh(tg, soft(new THREE.MeshBasicMaterial({ map: streakTex(), color: deep(P.c, 0.7), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })))); tether.renderOrder = 5;
      this.crystals.push({ m, inner, halo, base, tether, a, r: 2.35 });
    }
    // --- อักษรรูนโคจร 8 ตัว + วงลอยขึ้น 3 วง
    this.orbit = [];
    for (let i = 0; i < 8; i++) { const sp = add(sprite(glyphTex(i), deep(i % 2 ? P.a : P.b, 0.66), 0.5)); this.orbit.push({ sp, a: i / 8 * TAU }); }
    this.halos = [0, 0.33, 0.66].map((ph) => ({ m: add(flatPlane(2.6, sigilMid(), deep(P.b, 0.62), 0)), ph }));
    // --- สายฟ้าเล็กแลบระหว่างผลึกเป็นระยะ
    this.bolt = add(sprite(boltTex(0), deep(P.c, 0.8), 1)); this.bolt.center.set(0.5, 0); this.boltT = 1 + Math.random() * 2;
    this.light = new LightSpot(x, 1.4, z, P.light, 1.5, 8);
    // --- อนุภาค: ถูกดูดเข้าประตูเป็นเกลียว · ไต่ขึ้นเสา · ละอองลอยรอบ · ประกายพ่นจากประตู
    this.n = locked ? 90 : 200; this.cloud = new PointCloud(g, this.n, starTex());
    this.seed = new Float32Array(this.n); for (let i = 0; i < this.n; i++) this.seed[i] = ((Math.sin(i * 91.7) * 43758.5) % 1 + 1) % 1;
    const ca = new THREE.Color(deep(P.a, 0.62)), cb = new THREE.Color(deep(P.b, 0.62)), cw = new THREE.Color('#f4f0ff');
    for (let i = 0; i < this.n; i++) { const c = i % 5 === 0 ? cw : i % 2 ? cb : ca; this.cloud.col.set([c.r, c.g, c.b], i * 3); }
    this.lt = 0;
  }

  update(t) {
    const L = this.locked, sp = L ? 0.4 : 1, k = L ? 0.45 : 1, pulse = 0.82 + Math.sin(t * 2.4) * 0.18, dt = Math.min(0.1, Math.max(0, t - this.lt)); this.lt = t;
    // พื้น
    this.outer.rotation.z = t * 0.16 * sp; this.mid.rotation.z = -t * 0.4 * sp; this.core.rotation.z = t * 0.9 * sp; this.rays.rotation.z = -t * 0.08;
    this.outer.material.opacity = k; this.mid.material.opacity = k * (0.85 + 0.15 * pulse); this.core.material.opacity = k;
    this.glow.material.opacity = 0.25 * k * pulse; this.rays.material.opacity = 0.35 * k * (0.7 + 0.3 * Math.sin(t * 1.3));
    for (const w of this.waves) { const q = (t * 0.45 * sp + w.ph) % 1; w.m.scale.setScalar(0.6 + q * 5.2); w.m.material.opacity = (1 - q) * 0.6 * k; }
    // ประตูวังวน
    const gy = this.GY + Math.sin(t * 1.2) * 0.06;
    this.vortex.material.rotation = -t * 1.2 * sp; this.vortex.material.opacity = 0.95 * k; this.vortex.scale.setScalar(2.6 * (0.97 + Math.sin(t * 3) * 0.03));
    this.vortex2.material.rotation = t * 1.9 * sp; this.vortex2.material.opacity = 0.8 * k;
    this.gate.material.rotation = t * 0.3 * sp; this.gate.material.opacity = 0.95 * k;
    this.gate2.material.rotation = -t * 0.15 * sp; this.gate2.material.opacity = 0.55 * k * pulse;
    this.eye.material.opacity = (0.75 + Math.sin(t * 4.2) * 0.25) * k; this.eye.material.rotation = t * 0.6; this.eye.scale.setScalar(0.8 + Math.sin(t * 2.6) * 0.2);
    for (const o of [this.vortex, this.vortex2, this.gate, this.gate2, this.eye]) o.position.y = gy;
    this.beam.material.opacity = (L ? 0.08 : 0.2) * pulse; this.beam.rotation.y = t * 0.4;
    this.coreBeam.material.opacity = (L ? 0.15 : 0.5) * (0.75 + Math.sin(t * 5.3) * 0.25);
    // ผลึก + สายพลังงาน
    const C = this.tmpC || (this.tmpC = new THREE.Vector3()), T = this.tmpT || (this.tmpT = new THREE.Vector3());
    for (const c of this.crystals) {
      const a = c.a + t * 0.12 * sp, y = 1.1 + Math.sin(t * 1.5 + c.a * 2) * 0.16;
      c.m.position.set(Math.cos(a) * c.r, y, Math.sin(a) * c.r); c.m.rotation.y = t * 1.2 + c.a; c.inner.position.copy(c.m.position); c.inner.rotation.y = -t * 2;
      c.halo.position.copy(c.m.position); c.halo.material.opacity = (0.6 + 0.3 * Math.sin(t * 3 + c.a)) * k;
      c.base.position.x = Math.cos(a) * c.r; c.base.position.z = Math.sin(a) * c.r; c.base.rotation.z = t * 1.5; c.base.material.opacity = 0.85 * k;
      c.m.material.opacity = L ? 0.55 : 0.95;
      C.copy(c.m.position).setY(y + 0.45); T.set(0, gy, 0);
      c.tether.position.copy(C); c.tether.lookAt(T.x + this.group.position.x, T.y, T.z + this.group.position.z); c.tether.scale.set(1, 1, C.distanceTo(T));
      c.tether.material.opacity = L ? 0 : (0.45 + 0.35 * Math.sin(t * 6 + c.a * 3)); c.tether.material.map.offset.y = -t * 1.5;
    }
    for (const o of this.orbit) { const a = o.a + t * 0.6 * sp; o.sp.position.set(Math.cos(a) * 1.85, 0.5 + Math.sin(t * 2 + o.a * 3) * 0.2, Math.sin(a) * 1.85); o.sp.material.opacity = (0.7 + 0.3 * Math.sin(t * 3 + o.a)) * k; o.sp.material.rotation = t; }
    for (const h of this.halos) { const q = (t * 0.3 * sp + h.ph) % 1; h.m.position.y = 0.1 + q * 3.2; h.m.scale.setScalar(1 - q * 0.55); h.m.rotation.z = t * 0.8 + h.ph * 3; h.m.material.opacity = (L ? 0.1 : 0.45) * Math.sin(q * Math.PI); }
    // สายฟ้าแลบ
    this.boltT -= dt;
    if (this.boltT <= 0 && !L) { this.boltT = 1.5 + Math.random() * 2.5; this.boltOn = 0.18; const c = this.crystals[(Math.random() * 6) | 0]; this.bolt.position.set(c.m.position.x * 0.5, 0, c.m.position.z * 0.5); this.bolt.material.map = boltTex((Math.random() * 3) | 0); this.bolt.scale.set(0.9, 3.4, 1); }
    this.boltOn = Math.max(0, (this.boltOn || 0) - dt); this.bolt.material.opacity = this.boltOn > 0 ? 0.6 + Math.random() * 0.4 : 0;
    this.light.intensity = (L ? 0.45 : 1.0) * pulse;
    // อนุภาค
    const P = this.cloud.pos, S = this.cloud.size, A = this.cloud.alpha;
    for (let i = 0; i < this.n; i++) {
      const s = this.seed[i], kind = i % 6;
      if (kind < 3) {   // ถูกดูดเข้าประตู (เกลียวเข้าหาศูนย์กลาง)
        const q = (t * (0.22 + s * 0.1) * sp + s) % 1, a = s * 40 + q * 6, r = (1 - q) * (2.6 + s * 0.8);
        P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = gy + (s * 2 - 1) * (1 - q) * 1.4; P[i * 3 + 2] = Math.sin(a) * r * 0.6;
        S[i] = (0.16 + s * 0.22) * (0.4 + (1 - q) * 0.6); A[i] = Math.min(1, q * 4) * (1 - q * q) * k;
      } else if (kind === 3) {   // ไต่ขึ้นเสา
        const q = (t * (0.3 + s * 0.12) * sp + s) % 1, a = s * 30 + q * 9 + t, r = 0.75 - q * 0.45;
        P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = q * 5.5; P[i * 3 + 2] = Math.sin(a) * r;
        S[i] = (0.25 + s * 0.25) * (1 - q * 0.5); A[i] = Math.sin(q * Math.PI) * k;
      } else if (kind === 4) {   // ละอองลอยรอบวง
        const a = s * 40 + t * 0.3, r = 1.5 + (s * 7 % 1) * 1.4;
        P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = 0.15 + (s * 13 % 1) * 1.6 + Math.sin(t * 1.3 + s * 20) * 0.15; P[i * 3 + 2] = Math.sin(a) * r;
        S[i] = 0.2 + s * 0.18; A[i] = (0.4 + 0.6 * Math.abs(Math.sin(t * 3 + s * 50))) * 0.85 * k;
      } else {   // ประกายพ่นออกจากประตูแล้วร่วง
        const q = (t * 0.35 * sp + s) % 1, a = s * 60, v = 1.2 + s * 1.2;
        P[i * 3] = Math.cos(a) * v * q; P[i * 3 + 1] = Math.max(0.05, gy + q * 1.2 - q * q * 3.2); P[i * 3 + 2] = Math.sin(a) * v * q;
        S[i] = 0.32 * (1 - q * 0.6); A[i] = Math.sin(q * Math.PI) * 0.8 * k;
      }
    }
    this.cloud.flush();
  }
}

/* =========================================================
   2) เอฟเฟกต์ครั้งเดียว (วาร์ปมาถึง / เลเวลอัป) — ตามตัวละครได้
   ========================================================= */
class Burst {
  constructor(parent, getPos) {
    this.parent = parent; this.getPos = getPos; this.t = 0;
    this.g = new THREE.Group(); parent.add(this.g); this.parts = [];
    this.follow();
  }
  follow() { const p = this.getPos(); if (p) this.g.position.set(p.x, 0, p.z); }
  add(o) { this.g.add(o); return o; }
  dispose() {
    this.parent.remove(this.g);
    this.g.traverse((o) => { if (o.isPoints) return; if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.cloud?.dispose();
  }
  // ไทม์ไลน์: เรียกฟังก์ชันตามเวลา (กล้องสั่น คลื่นบิดภาพ แสงวาบเต็มจอ)
  at(time, fn) { (this.events || (this.events = [])).push({ time, fn }); }
  tick() { if (!this.events) return; for (const e of this.events) if (!e.done && this.t >= e.time) { e.done = true; try { e.fn(); } catch (x) { /* ไม่มีโพสต์โปรเซส */ } } }
  hook(name, ...a) { const h = this.hooks && this.hooks[name]; if (h) h(this.g.position.x, this.g.position.z, ...a); }
  // ดันชิ้นที่หันหาจอไปอยู่ "หลัง" ตัวละคร (ตามแกนกล้อง) ไม่ให้บังตัว
  behind(o, y, d = 0.5) { const cam = this.cam; if (!cam) { o.position.y = y; return; } const F = this.tmpF || (this.tmpF = new THREE.Vector3()); F.setFromMatrixColumn(cam.matrixWorld, 2).setY(0).normalize(); o.position.set(-F.x * d, y, -F.z * d); }
  // วงเวทตั้งตรงหันหาจอ (ลอยกลางอากาศ หลังตัวละคร)
  vsigil(map, color, y) { const sp = this.add(sprite(map, color, 1)); sp.position.y = y; sp.renderOrder = 3; return sp; }
  // สายฟ้าฟาดลงรอบวง
  bolts(n, color, r0, r1) {
    this.boltList = [];
    for (let i = 0; i < n; i++) { const sp = this.add(sprite(boltTex(i % 3), color, 1)); sp.center.set(0.5, 0); this.boltList.push({ sp, r0, r1, next: 0 }); }
  }
  stepBolts(t, t0, t1) {
    for (const b of this.boltList || []) {
      const on = t > t0 && t < t1;
      if (on && t >= b.next) { b.next = t + 0.05 + Math.random() * 0.09; const a = Math.random() * TAU, r = b.r0 + Math.random() * (b.r1 - b.r0); b.sp.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); b.sp.material.map = boltTex((Math.random() * 3) | 0); b.sp.scale.set(0.8 + Math.random() * 0.8, 6 + Math.random() * 3, 1); b.lit = Math.random() < 0.7 ? 1 : 0.3; }
      b.sp.material.opacity = on ? b.lit * (0.6 + Math.random() * 0.4) : 0;
    }
  }
  // เสารูนพุ่งขึ้นรอบวง + อักษรรูนลอยบนยอด
  runePillars(n, r, color, t0) {
    this.pillars = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, m = this.add(tube(0.09, 0.16, 3.4, streakTex(), color)); m.position.set(Math.cos(a) * r, 1.7, Math.sin(a) * r);
      const gl = this.add(sprite(glyphTex(i), color, 0.7)); gl.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const base = this.add(flatPlane(0.9, sigilCore(), color, 0.06)); base.position.x = Math.cos(a) * r; base.position.z = Math.sin(a) * r;
      this.pillars.push({ m, gl, base, d: t0 + i * 0.06 });
    }
  }
  stepPillars(t, tEnd) {
    for (const p of this.pillars || []) {
      const q = ease((t - p.d) / 0.3), o = fade(t, p.d, p.d + 0.08, tEnd - 0.6, tEnd);
      p.m.scale.set(1, Math.max(0.001, q), 1); p.m.position.y = 1.7 * q; p.m.material.opacity = o * 0.9;
      p.gl.position.y = 0.3 + q * 3.2 + Math.max(0, t - p.d - 0.3) * 0.25; p.gl.material.opacity = o; p.gl.material.rotation = t * 0.6;
      p.base.material.opacity = o; p.base.rotation.z = t * 2; p.base.scale.setScalar(0.4 + 0.6 * back((t - p.d) / 0.35));
    }
  }
  // อักษรรูนลอยวนขึ้นเป็นเกลียว
  floatGlyphs(n, color, t0) {
    this.glyphs = [];
    for (let i = 0; i < n; i++) { const sp = this.add(sprite(glyphTex(i + 3), color, 0.55)); this.glyphs.push({ sp, a: i / n * TAU, d: t0 + (i % 5) * 0.12, r: 1.6 + (i % 3) * 0.35 }); }
  }
  stepGlyphs(t, life) {
    for (const g of this.glyphs || []) {
      const q = (t - g.d) / life; if (q < 0 || q > 1) { g.sp.material.opacity = 0; continue; }
      const a = g.a + q * 4; g.sp.position.set(Math.cos(a) * g.r * (1 - q * 0.4), 0.3 + q * 3.6, Math.sin(a) * g.r * (1 - q * 0.4));
      g.sp.material.opacity = Math.sin(q * Math.PI); g.sp.material.rotation = -a; g.sp.scale.setScalar(0.45 + Math.sin(q * Math.PI) * 0.25);
    }
  }
  // อนุภาคทั่วไป: kind 0 = ยิงออก (มีแรงโน้มถ่วง/ต้านลม) · 1 = เกลียวไต่ขึ้น · 2 = ตกลงช้า ๆ
  particles(n, map) {
    this.cloud = new PointCloud(this.g, n, map);
    this.p = { n, used: 0, life: new Float32Array(n), age: new Float32Array(n), kind: new Uint8Array(n), v: new Float32Array(n * 3), base: new Float32Array(n), d: new Float32Array(n * 4) };
    this.cloud.alpha.fill(0);
  }
  emit(count, kind, f) {
    const p = this.p;
    for (let k = 0; k < count && p.used < p.n; k++) {
      const i = p.used++; const o = f(k / Math.max(1, count - 1), Math.random);
      p.kind[i] = kind; p.life[i] = o.life; p.age[i] = -(o.delay || 0); p.base[i] = o.size * 3.6;
      this.cloud.pos.set(o.pos, i * 3); this.cloud.col.set([o.color.r, o.color.g, o.color.b], i * 3);
      if (o.vel) p.v.set(o.vel, i * 3);
      if (o.d) p.d.set(o.d, i * 4);
    }
  }
  stepParticles(dt) {
    const p = this.p; if (!p) return; const P = this.cloud.pos, S = this.cloud.size, A = this.cloud.alpha, V = p.v, D = p.d;
    for (let i = 0; i < p.used; i++) {
      p.age[i] += dt; const a = p.age[i];
      if (a < 0 || a > p.life[i]) { A[i] = 0; continue; }
      const q = a / p.life[i];
      if (p.kind[i] === 0) {
        const drag = Math.pow(0.18, dt); V[i * 3] *= drag; V[i * 3 + 2] *= drag; V[i * 3 + 1] = V[i * 3 + 1] * drag - D[i * 4] * dt;
        P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] = Math.max(0.03, P[i * 3 + 1] + V[i * 3 + 1] * dt); P[i * 3 + 2] += V[i * 3 + 2] * dt;
        S[i] = p.base[i] * (1 - q * 0.7); A[i] = (q < 0.1 ? q / 0.1 : 1 - (q - 0.1) / 0.9) * (0.7 + 0.3 * Math.sin(a * 30 + i));
      } else if (p.kind[i] === 1) {   // d = [มุมเริ่ม, รัศมีเริ่ม, รัศมีปลาย, ความสูง]
        const ang = D[i * 4] + q * 7.5, r = D[i * 4 + 1] + (D[i * 4 + 2] - D[i * 4 + 1]) * q;
        P[i * 3] = Math.cos(ang) * r; P[i * 3 + 1] = 0.05 + ease(q) * D[i * 4 + 3]; P[i * 3 + 2] = Math.sin(ang) * r;
        S[i] = p.base[i] * (1 - q * 0.5); A[i] = Math.sin(Math.min(1, q * 1.15) * Math.PI);
      } else {
        P[i * 3] += Math.sin(a * 2 + i) * dt * 0.3; P[i * 3 + 1] = Math.max(0.03, P[i * 3 + 1] - V[i * 3 + 1] * dt); P[i * 3 + 2] += Math.cos(a * 1.7 + i) * dt * 0.3;
        S[i] = p.base[i]; A[i] = Math.sin(q * Math.PI) * (0.5 + 0.5 * Math.abs(Math.sin(a * 9 + i * 3)));
      }
    }
    this.cloud.flush();
  }
}

// ---- วาร์ปมาถึง: แสงวาบ + เสาแสงจากฟ้า + วงเวท 3 ชั้นกางออก + คลื่นกระแทก 2 ระลอก + วงลอยขึ้น + อนุภาค ~300 เม็ด
export class WarpBurst extends Burst {
  constructor(parent, getPos, color = '#8fd8ff', scale = 1) {
    super(parent, getPos);
    const hot = '#ffffff', c2 = mix(color, '#d6b8ff', 0.45).getStyle();
    this.life = 2.8; this.k = scale;
    this.g.scale.setScalar(scale);
    this.shade = this.add(underlay(6.5));
    this.outer = this.add(flatPlane(5.4, sigilOuter(), deep(color), 0.04));
    this.mid = this.add(flatPlane(3.8, sigilMid(), deep(c2), 0.05));
    this.core = this.add(flatPlane(2.1, sigilCore(), deep(color, 0.75), 0.06));
    this.floor = this.add(flatPlane(6, softTex(), deep(color, 0.35), 0.025));
    this.shocks = [0, 0.22, 0.5].map((d) => ({ m: this.add(flatPlane(1, shockTex(), d ? color : hot, 0.07)), d }));
    this.halos = [0.15, 0.35, 0.55].map((d, i) => ({ m: this.add(flatPlane(2.6 - i * 0.4, sigilMid(), i === 1 ? hot : color, 0)), d }));
    this.beam = this.add(tube(1.1, 1.3, 12, streakTex(), deep(color, 0.6)));
    this.vortex = this.add(tube(0.7, 1.0, 5, spiralTex(), deep(c2, 0.6)));
    this.coreBeam = this.add(tube(0.22, 0.32, 14, streakTex(), hot));
    this.flash = this.add(sprite(softTex(), hot, 1)); this.flash.position.y = 1;
    this.star = this.add(sprite(starTex(), deep(color, 0.65), 1)); this.star.position.y = 1.1;
    // v2: วงเวทตั้งตรงกลางอากาศ · โดมหกเหลี่ยม · สายฟ้า · เสารูน 8 ต้น · อักษรรูนลอย
    this.vs = this.vsigil(sigilOuter(), deep(color, 0.6), 1.3);
    this.vs2 = this.vsigil(sigilCore(), deep(c2, 0.7), 1.3);
    const dm = new THREE.MeshBasicMaterial({ map: hexTex(), color: deep(color, 0.6), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    dm.map.repeat.set(6, 3); soft(dm);
    this.dome = this.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI / 2), dm)); this.dome.renderOrder = 4;
    this.bolts(6, deep(color, 0.75), 0.3, 2.6);
    this.runePillars(8, 2.75, deep(color, 0.62), 0.15);
    this.floatGlyphs(12, deep(c2, 0.7), 0.25);
    this.life = 3.2;
    this.at(0, () => { this.hook('impact', color, 1.7, 0.55); });
    this.at(0.5, () => { this.hook('pulse', 1.0); });
    this.particles(420, starTex());
    const col = new THREE.Color(deep(color, 0.62)), cc2 = new THREE.Color(deep(c2, 0.66)), cw = new THREE.Color('#e8fbff');
    const pick = (r) => (r < 0.33 ? cw : r < 0.66 ? col : cc2);
    this.emit(140, 1, (u, R) => ({ life: 1.3 + R() * 0.9, delay: R() * 0.6, size: 0.12 + R() * 0.14, color: pick(R()), pos: [0, 0, 0], d: [R() * TAU, 1.6 + R() * 0.8, 0.15 + R() * 0.3, 2.6 + R() * 1.8] }));
    this.emit(110, 0, (u, R) => { const a = R() * TAU, s = 3 + R() * 4.5; return { life: 0.8 + R() * 0.7, delay: R() * 0.12, size: 0.09 + R() * 0.12, color: pick(R()), pos: [0, 0.15, 0], vel: [Math.cos(a) * s, 1 + R() * 3.5, Math.sin(a) * s], d: [6, 0, 0, 0] }; });
    this.emit(70, 2, (u, R) => { const a = R() * TAU, r = R() * 2.2; return { life: 1.6 + R() * 1, delay: 0.2 + R() * 0.7, size: 0.1 + R() * 0.12, color: pick(R()), pos: [Math.cos(a) * r, 2.8 + R() * 2.4, Math.sin(a) * r], vel: [0, 0.9 + R() * 0.9, 0] }; });
    // ระลอกสอง: ประกายพุ่งจากยอดเสารูน
    this.emit(100, 0, (u, R) => { const a = ((u * 8) | 0) / 8 * TAU, s = 0.6 + R() * 1.4, b = R() * TAU; return { life: 0.9 + R() * 0.6, delay: 0.5 + R() * 0.2, size: 0.1 + R() * 0.1, color: pick(R()), pos: [Math.cos(a) * 2.75, 3.4, Math.sin(a) * 2.75], vel: [Math.cos(b) * s, 1 + R() * 2, Math.sin(b) * s], d: [5, 0, 0, 0] }; });
  }
  update(dt) {
    this.t += dt; const t = this.t; this.follow();
    const out = fade(t, 0, 0.12, 1.7, 2.6);
    this.outer.scale.setScalar(0.2 + 0.8 * back(t / 0.5)); this.outer.rotation.z = t * 0.5; this.outer.material.opacity = out * 0.9;
    this.mid.scale.setScalar(0.2 + 0.8 * back((t - 0.1) / 0.5)); this.mid.rotation.z = -t * 1.3; this.mid.material.opacity = fade(t, 0.1, 0.25, 1.6, 2.5) * 0.95;
    this.core.scale.setScalar(0.2 + 0.8 * back((t - 0.2) / 0.45)); this.core.rotation.z = t * 2.6; this.core.material.opacity = fade(t, 0.2, 0.32, 1.5, 2.4);
    this.floor.material.opacity = out * 0.5; this.shade.material.opacity = out * 0.5;
    for (const s of this.shocks) { const q = (t - s.d) / 0.9; s.m.material.opacity = q > 0 && q < 1 ? (1 - q) * 0.95 : 0; s.m.scale.setScalar(0.6 + ease(q) * 8); }
    for (const h of this.halos) { const q = (t - h.d) / 1.5; h.m.material.opacity = q > 0 && q < 1 ? Math.sin(q * Math.PI) * 0.75 : 0; h.m.position.y = 0.1 + ease(q) * 3.4; h.m.scale.setScalar(1.2 - q * 0.7); h.m.rotation.z = t * 2; }
    // เสาแสงพุ่งลงจากฟ้า: บางมาก → กว้าง → หดเป็นเส้นแล้วจาง
    const bq = Math.min(1, t / 0.18), shrink = t < 0.5 ? 1 : Math.max(0.05, 1 - (t - 0.5) / 1.4);
    this.beam.scale.set((0.25 + 0.75 * ease(t / 0.35)) * shrink, bq, (0.25 + 0.75 * ease(t / 0.35)) * shrink); this.beam.position.y = 6 * bq + (1 - bq) * 12;
    this.beam.material.opacity = fade(t, 0, 0.08, 0.9, 1.9) * 0.6; this.beam.rotation.y = t * 1.5;
    this.coreBeam.scale.set(shrink, bq, shrink); this.coreBeam.position.y = 7 * bq + (1 - bq) * 14; this.coreBeam.material.opacity = fade(t, 0, 0.06, 0.8, 1.6) * 0.95;
    this.vortex.material.opacity = fade(t, 0.1, 0.3, 1.2, 2) * 0.55; this.vortex.material.map.offset.x = -t * 0.9; this.vortex.rotation.y = -t * 3; this.vortex.scale.set(1 + t * 0.2, ease(t / 0.4), 1 + t * 0.2);
    // แสงวาบ
    this.flash.scale.setScalar(1 + ease(t / 0.25) * 7); this.flash.material.opacity = fade(t, 0, 0.04, 0.08, 0.5) * 0.95;
    this.star.scale.setScalar(0.5 + ease(t / 0.3) * 4.2 * (t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.8))); this.star.material.opacity = fade(t, 0, 0.05, 0.5, 1.3); this.star.material.rotation = t * 0.8;
    this.tick();
    const vq = back((t - 0.05) / 0.5);
    this.behind(this.vs, 1.3, 0.8); this.behind(this.vs2, 1.3, 0.7);
    this.vs.scale.setScalar(0.2 + 4.4 * vq); this.vs.material.rotation = t * 0.7; this.vs.material.opacity = fade(t, 0.05, 0.2, 1.8, 2.7) * 0.85;
    this.vs2.scale.setScalar(0.2 + 2.2 * vq); this.vs2.material.rotation = -t * 1.6; this.vs2.material.opacity = fade(t, 0.1, 0.25, 1.6, 2.5) * 0.9;
    const dq = ease(t / 0.9); this.dome.scale.set(0.5 + dq * 3.2, 0.3 + dq * 2.4, 0.5 + dq * 3.2); this.dome.material.opacity = fade(t, 0, 0.06, 0.35, 1.1) * 0.8; this.dome.material.map.offset.y = -t * 0.5; this.dome.rotation.y = t * 0.6;
    this.stepBolts(t, 0, 0.75);
    this.stepPillars(t, 2.8);
    this.stepGlyphs(t, 2.1);
    this.stepParticles(dt);
    return t < this.life + 0.6;
  }
}

// ---- เลเวลอัป: เสาแสงทอง + วงเวท/รังสีอาทิตย์บนพื้น + วงแหวนไต่ขึ้นรอบตัว 5 วง + เกลียวดาวคู่ + น้ำพุประกาย + ดวงอาทิตย์หลังตัว
export class LevelBurst extends Burst {
  constructor(parent, getPos, job = false) {
    super(parent, getPos);
    const C = job ? { a: '#6fd0ff', b: '#b6f0ff', c: '#7f9bff' } : { a: '#ffc94a', b: '#fff1b0', c: '#ff9a3c' };
    this.life = 3.4; this.job = job;
    const sc = job ? 0.85 : 1; this.g.scale.setScalar(sc);
    this.shade = this.add(underlay(6.5, job ? '#040c22' : '#1c0c02'));
    this.floor = this.add(flatPlane(6.5, softTex(), deep(C.a, 0.35), 0.025));
    this.rays = this.add(flatPlane(7, raysTex(), deep(C.a, 0.5), 0.035));
    this.outer = this.add(flatPlane(4.8, sigilOuter(), deep(C.a), 0.045));
    this.core = this.add(flatPlane(2.4, sigilCore(), deep(C.b, 0.7), 0.055));
    this.shocks = [0, 0.3].map((d) => ({ m: this.add(flatPlane(1, shockTex(), d ? C.a : '#fff', 0.07)), d }));
    this.rings = [0, 0.16, 0.32, 0.48, 0.64].map((d, i) => ({ m: this.add(flatPlane(1.9, i % 2 ? sigilMid() : shockTex(), i % 2 ? C.a : C.b, 0)), d }));
    this.beam = this.add(tube(0.8, 1.0, 13, streakTex(), deep(C.a, 0.6)));
    this.coreBeam = this.add(tube(0.16, 0.26, 15, streakTex(), '#ffffff'));
    this.sun = this.add(sprite(raysTex(), deep(C.a, 0.6), 1)); this.sun.position.y = 1.05;
    this.sun2 = this.add(sprite(raysTex(), deep(C.c, 0.55), 1)); this.sun2.position.y = 1.05;
    this.flash = this.add(sprite(softTex(), '#ffffff', 1)); this.flash.position.y = 1;
    this.crown = this.add(sprite(starTex(), deep(C.b, 0.7), 1)); this.crown.position.y = 2.25;
    // v2: ปีกแสงกางหลังตัว · วงเวทตั้งตรง · ม่านแสงจากฟ้า 6 สาย · ขนนกแสงร่วง · อักษรรูนลอย
    this.wings = [1, -1].map((sd) => { const w = this.add(sprite(sd > 0 ? wingTex() : wingTexL(), deep(C.a, 0.62), 1)); w.center.set(sd > 0 ? 0 : 1, 0.4); w.material.side = THREE.DoubleSide; w.renderOrder = 3; return { w, sd }; });
    this.wings2 = [1, -1].map((sd) => { const w = this.add(sprite(sd > 0 ? wingTex() : wingTexL(), deep(C.b, 0.8), 1)); w.center.set(sd > 0 ? 0 : 1, 0.4); w.material.side = THREE.DoubleSide; w.renderOrder = 3; return { w, sd }; });
    this.vs = this.vsigil(sigilMid(), deep(C.a, 0.6), 1.35);
    this.curtain = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, m = this.add(tube(0.12, 0.35, 10, streakTex(), deep(i % 2 ? C.a : C.c, 0.6))); m.position.set(Math.cos(a) * 1.5, 5, Math.sin(a) * 1.5); m.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); this.curtain.push({ m, d: 0.1 + i * 0.07 }); }
    this.feathers = [];
    for (let i = 0; i < 16; i++) { const f = this.add(sprite(featherTex(), deep(i % 3 ? C.a : C.b, 0.7), 0.35)); const a = Math.random() * TAU, r = 0.4 + Math.random() * 2; this.feathers.push({ f, x: Math.cos(a) * r, z: Math.sin(a) * r, y0: 3.4 + Math.random() * 1.6, d: 0.5 + Math.random() * 1, sp: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 }); }
    this.floatGlyphs(10, deep(C.b, 0.72), 0.3);
    this.runePillars(6, 2.4, deep(C.a, 0.6), 0.2);
    this.life = 3.8;
    this.at(0, () => { this.hook('impact', C.a, 1.4, 0.4); this.hook('lines', 0.6, 1.4); });
    this.at(1.0, () => { this.hook('pulse', 0.9); });
    this.particles(420, starTex());
    const ca = new THREE.Color(deep(C.a, 0.58)), cb = new THREE.Color(deep(C.b, 0.72)), cc = new THREE.Color(deep(C.c, 0.55)), cw = new THREE.Color('#fffbe8');
    const pick = (r) => (r < 0.25 ? cw : r < 0.6 ? ca : r < 0.85 ? cb : cc);
    // เกลียวคู่ (2 สายตรงข้ามกัน)
    this.emit(150, 1, (u, R) => ({ life: 1.5 + R() * 0.6, delay: u * 1.1, size: 0.12 + R() * 0.1, color: pick(R()), pos: [0, 0, 0], d: [(R() < 0.5 ? 0 : Math.PI) + u * 2, 1.15, 0.45, 3.2 + R() * 0.6] }));
    // น้ำพุประกายพุ่งขึ้นแล้วร่วง
    this.emit(130, 0, (u, R) => { const a = R() * TAU, s = 1 + R() * 2.6; return { life: 1.6 + R() * 0.9, delay: 0.15 + R() * 0.35, size: 0.1 + R() * 0.13, color: pick(R()), pos: [0, 1.2, 0], vel: [Math.cos(a) * s, 6 + R() * 5, Math.sin(a) * s], d: [16, 0, 0, 0] }; });
    // คลื่นประกายแผ่ตามพื้น
    this.emit(50, 0, (u, R) => { const a = u * TAU, s = 5 + R() * 2; return { life: 0.7 + R() * 0.3, delay: 0.05, size: 0.14, color: pick(R()), pos: [0, 0.08, 0], vel: [Math.cos(a) * s, 0.4, Math.sin(a) * s], d: [1, 0, 0, 0] }; });
    // ดาวกะพริบลอยรอบตัว
    this.emit(30, 2, (u, R) => { const a = R() * TAU, r = 0.6 + R() * 1.6; return { life: 2 + R(), delay: 0.4 + R() * 0.8, size: 0.2 + R() * 0.16, color: pick(R()), pos: [Math.cos(a) * r, 0.4 + R() * 2.4, Math.sin(a) * r], vel: [0, -0.15, 0] }; });
    // ระลอกสอง (1 วิ): วงประกายแผ่ออกอีกรอบ
    this.emit(60, 0, (u, R) => { const a = u * TAU, s = 4 + R() * 2; return { life: 0.8 + R() * 0.3, delay: 1.0, size: 0.13, color: pick(R()), pos: [0, 1.3, 0], vel: [Math.cos(a) * s, (R() - 0.5) * 2, Math.sin(a) * s], d: [2, 0, 0, 0] }; });
  }
  update(dt) {
    this.t += dt; const t = this.t; this.follow();
    const out = fade(t, 0, 0.15, 2.3, 3.3);
    this.floor.material.opacity = out * 0.5; this.shade.material.opacity = out * 0.5;
    this.rays.material.opacity = out * 0.55; this.rays.rotation.z = t * 0.35; this.rays.scale.setScalar(0.3 + 0.7 * ease(t / 0.6));
    this.outer.material.opacity = out * 0.95; this.outer.rotation.z = -t * 0.45; this.outer.scale.setScalar(0.2 + 0.8 * back(t / 0.55));
    this.core.material.opacity = fade(t, 0.1, 0.25, 2.1, 3); this.core.rotation.z = t * 1.8; this.core.scale.setScalar(0.2 + 0.8 * back((t - 0.1) / 0.5));
    for (const s of this.shocks) { const q = (t - s.d) / 1; s.m.material.opacity = q > 0 && q < 1 ? (1 - q) : 0; s.m.scale.setScalar(0.5 + ease(q) * 7.5); }
    for (const r of this.rings) { const q = (t - r.d) / 1.4; r.m.material.opacity = q > 0 && q < 1 ? Math.sin(q * Math.PI) * 0.85 : 0; r.m.position.y = 0.05 + ease(q) * 2.7; r.m.scale.setScalar(1.25 - q * 0.65); r.m.rotation.z = t * 1.6; }
    const bq = Math.min(1, t / 0.2), shrink = t < 0.7 ? 1 : Math.max(0.05, 1 - (t - 0.7) / 1.6);
    this.beam.scale.set(shrink, bq, shrink); this.beam.position.y = 6.5 * bq + (1 - bq) * 13; this.beam.material.opacity = fade(t, 0, 0.1, 1.2, 2.4) * 0.55; this.beam.rotation.y = t;
    this.coreBeam.scale.set(shrink, bq, shrink); this.coreBeam.position.y = 7.5 * bq + (1 - bq) * 15; this.coreBeam.material.opacity = fade(t, 0, 0.08, 1, 2) * 0.95;
    const sunS = (2.2 + ease(t / 0.5) * 2.4) * (1 + Math.sin(t * 4) * 0.04);
    this.sun.scale.setScalar(sunS); this.sun.material.rotation = t * 0.5; this.sun.material.opacity = fade(t, 0.05, 0.3, 1.8, 2.8) * 0.75;
    this.sun2.scale.setScalar(sunS * 0.8); this.sun2.material.rotation = -t * 0.8; this.sun2.material.opacity = fade(t, 0.1, 0.35, 1.6, 2.6) * 0.55;
    this.flash.scale.setScalar(1 + ease(t / 0.3) * 6); this.flash.material.opacity = fade(t, 0, 0.05, 0.1, 0.55) * 0.9;
    this.crown.scale.setScalar((0.4 + ease((t - 0.3) / 0.4) * 1.3) * (1 + Math.sin(t * 6) * 0.08)); this.crown.material.rotation = t * 1.2; this.crown.material.opacity = fade(t, 0.3, 0.5, 2.2, 3);
    this.tick();
    // ปีก: กางออกแบบเด้ง แล้วกระพือช้า ๆ (หันตามกล้องเสมอ — ย้ายจุดยึดไปซ้าย/ขวาตามแกนขวาของกล้อง)
    const cam = this.cam, R = this.tmpR || (this.tmpR = new THREE.Vector3(1, 0, 0));
    if (cam) R.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
    const wq = back((t - 0.15) / 0.6), flap = Math.sin(t * 5.5) * 0.1, wo = fade(t, 0.15, 0.3, 2.6, 3.4);
    for (const [list, sz, op, lift] of [[this.wings, 3.1, 0.85, 0], [this.wings2, 2.2, 0.75, 0.1]]) for (const { w, sd } of list) {
      w.scale.set(sz * Math.max(0.01, wq), sz * Math.max(0.01, wq), 1); this.behind(w, 1.35 + lift, 0.35); w.position.x += R.x * sd * 0.12; w.position.z += R.z * sd * 0.12;
      w.material.rotation = sd * (0.12 + flap); w.material.opacity = wo * op;
    }
    this.behind(this.vs, 1.35, 0.8);
    this.vs.scale.setScalar(0.2 + 3.6 * back((t - 0.1) / 0.5)); this.vs.material.rotation = -t * 0.8; this.vs.material.opacity = fade(t, 0.1, 0.25, 2, 3);
    for (const c of this.curtain) { const q = ease((t - c.d) / 0.25); c.m.scale.set(1, Math.max(0.001, q), 1); c.m.position.y = 10 - 5 * q; c.m.material.opacity = fade(t, c.d, c.d + 0.1, 1.2, 2.2) * 0.7; c.m.rotation.y = t * 0.5; }
    for (const f of this.feathers) {
      const a = t - f.d; if (a < 0) { f.f.material.opacity = 0; continue; }
      f.f.position.set(f.x + Math.sin(a * 2.2 + f.ph) * 0.35, Math.max(0.05, f.y0 - a * f.sp), f.z + Math.cos(a * 1.8 + f.ph) * 0.25);
      f.f.material.rotation = Math.sin(a * 3 + f.ph) * 0.8; f.f.material.opacity = Math.min(1, a * 4) * fade(t, 0, 0.01, 3, 3.8) * 0.95;
    }
    this.stepPillars(t, 3.0);
    this.stepGlyphs(t, 2.3);
    this.stepParticles(dt);
    return t < this.life + 0.6;
  }
}

// ตัวจัดการ: เล่นพร้อมกันได้หลายอัน (จำกัด 6 อันกันเครื่องอืด)
export class GrandFx {
  constructor(parent, camera = null, hooks = null) { this.parent = parent; this.items = []; this.camera = camera; this.hooks = hooks; }
  add(fx) { fx.cam = this.camera; fx.hooks = this.hooks; this.items.push(fx); while (this.items.length > 6) this.items.shift().dispose(); return fx; }
  warp(getPos, color, scale) { return this.add(new WarpBurst(this.parent, getPos, color, scale)); }
  levelUp(getPos, job) { return this.add(new LevelBurst(this.parent, getPos, job)); }
  get active() { return this.items.length > 0; }
  update(dt) { for (let i = this.items.length - 1; i >= 0; i--) if (!this.items[i].update(dt)) { this.items[i].dispose(); this.items.splice(i, 1); } }
}

// แสงวาบเต็มจอ (DOM) ตอนวาร์ป / เลเวลอัป
export function screenFlash(color = '#bfe8ff', strong = 0.55) {
  try {
    const el = document.createElement('div'); el.className = 'scr-flash';
    el.style.setProperty('--fc', color); el.style.setProperty('--fo', strong);
    document.body.append(el); setTimeout(() => el.remove(), 900);
  } catch (e) { /* ไม่มี DOM */ }
}
