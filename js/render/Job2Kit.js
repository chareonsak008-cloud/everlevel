// v0.31.1 ชุดเครื่องมือเอฟเฟกต์ HD ของอาชีพขั้นที่ 2
// วาดบน "เลเยอร์ HD" ความละเอียดเต็มจอ ทับภาพพิกเซล → ขอบนุ่ม ไล่สีเนียน เคลื่อนไหวลื่น ต่างจากเอฟเฟกต์ขั้น 1 ชัดเจน
// มี: ริบบิ้นแสง (หางนุ่มตามเส้นทาง) · วงเวทวาดตัวเอง · เปลวไฟเชดเดอร์ · โล่ fresnel · ลำแสงสวรรค์ · อนุภาค HD
import { THREE } from './three.js?v=0.83.0';

const ADD = THREE.AdditiveBlending;
const cache = new Map();
function tex(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, size, size / 2);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  cache.set(key, t); return t;
}
const radial = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); for (const [o, c] of stops) gr.addColorStop(o, c); return gr; };
const ring = (g, c, r, w) => { g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); };
const poly = (g, c, r, n, rot = -Math.PI / 2, step = 1) => { g.beginPath(); for (let i = 0; i <= n; i++) { const a = rot + ((i * step) / n) * Math.PI * 2; const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
const ticks = (g, c, r0, r1, n, w) => { g.lineWidth = w; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke(); } };
const around = (g, c, r, n, fn, rot = 0) => { for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a + Math.PI / 2); fn(g, i); g.restore(); } };
const glowStroke = (g) => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; };

/* ================= เท็กซ์เจอร์ HD (ขาวล้วน ย้อมสีด้วยเชดเดอร์/วัสดุ) ================= */
export const T = {
  dot: () => tex('dot', 64, (g, s, c) => { g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,255,255,0.85)'], [0.5, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s); }),
  star: () => tex('star', 128, (g, s, c) => {
    g.fillStyle = radial(g, c, c, c * 0.5, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s);
    for (const [w, l] of [[0.06, 1], [0.035, 0.62]]) for (let i = 0; i < (l === 1 ? 2 : 2); i++) {
      g.save(); g.translate(c, c); g.rotate(i * Math.PI / 2 + (l === 1 ? 0 : Math.PI / 4));
      const gr = g.createLinearGradient(0, -c * l, 0, c * l); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -c * l); g.lineTo(s * w, 0); g.lineTo(0, c * l); g.lineTo(-s * w, 0); g.closePath(); g.fill(); g.restore();
    }
  }),
  ring: () => tex('ring', 256, (g, s, c) => { g.fillStyle = radial(g, c, c, c, [[0, 'rgba(255,255,255,0)'], [0.72, 'rgba(255,255,255,0)'], [0.86, 'rgba(255,255,255,1)'], [0.92, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s); }),
  feather: () => tex('feather', 128, (g, s, c) => {
    g.translate(c, c); g.rotate(-0.5);
    const gr = g.createLinearGradient(0, -c * 0.9, 0, c * 0.9); gr.addColorStop(0, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0.4)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -c * 0.9); g.bezierCurveTo(c * 0.45, -c * 0.4, c * 0.35, c * 0.5, 0, c * 0.85); g.bezierCurveTo(-c * 0.35, c * 0.5, -c * 0.45, -c * 0.4, 0, -c * 0.9); g.fill();
    g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -c * 0.85); g.lineTo(0, c * 0.95); g.stroke();
  }),
  wing: () => tex('wing', 512, (g, s) => {
    // ปีกขนนกหลายชั้น (ด้านขวา · ราก = มุมล่างซ้าย)
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 9; i++) {
      const a = -1.15 + i * 0.16 + layer * 0.05, L = s * (0.42 + i * 0.05 - layer * 0.1), w = s * (0.05 - layer * 0.008);
      g.save(); g.translate(s * 0.12, s * 0.82); g.rotate(a);
      const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, `rgba(255,255,255,${0.95 - layer * 0.2})`); gr.addColorStop(0.75, `rgba(255,255,255,${0.75 - layer * 0.15})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w * 0.3); g.quadraticCurveTo(L * 0.6, -w * 1.4, L, 0); g.quadraticCurveTo(L * 0.6, w * 1.2, 0, w * 0.4); g.fill(); g.restore();
    }
  }),
  hex: () => tex('hex', 256, (g, s) => {
    g.strokeStyle = '#fff'; g.lineWidth = 3; const R = s / 8;
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) { const x = col * R * 1.73 + (row % 2 ? R * 0.866 : 0), y = row * R * 1.5; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i / 6) * Math.PI * 2; i ? g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R) : g.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } g.stroke(); }
  }),
  // ---------- วงเวทเฉพาะอาชีพ ----------
  sigil: (kind) => tex('sigil-' + kind, 1024, (g, s, c) => {
    glowStroke(g); g.shadowBlur = 10;
    ring(g, c, c * 0.97, 7); ring(g, c, c * 0.9, 3); ring(g, c, c * 0.62, 4); ring(g, c, c * 0.56, 2);
    ticks(g, c, c * 0.9, c * 0.97, 96, 2);
    if (kind === 'knight') {
      around(g, c, c * 0.935, 16, (g, i) => { g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 0); g.lineTo(0, 14); g.lineTo(-9, 0); g.closePath(); g.fill(); });
      g.lineWidth = 5; poly(g, c, c * 0.56, 8, -Math.PI / 2, 3); poly(g, c, c * 0.84, 4, -Math.PI / 4);
      // โล่ + หอกไขว้ + ช่อลอเรล
      g.lineWidth = 9; g.beginPath(); g.moveTo(c, c - c * 0.36); g.lineTo(c + c * 0.27, c - c * 0.26); g.quadraticCurveTo(c + c * 0.27, c + c * 0.2, c, c + c * 0.38); g.quadraticCurveTo(c - c * 0.27, c + c * 0.2, c - c * 0.27, c - c * 0.26); g.closePath(); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.moveTo(c, c - c * 0.24); g.lineTo(c, c + c * 0.24); g.moveTo(c - c * 0.15, c - c * 0.05); g.lineTo(c + c * 0.15, c - c * 0.05); g.stroke();
      for (const sgn of [-1, 1]) { g.lineWidth = 7; g.beginPath(); g.moveTo(c + sgn * c * 0.5, c + c * 0.5); g.lineTo(c - sgn * c * 0.5, c - c * 0.5); g.stroke(); g.beginPath(); g.moveTo(c - sgn * c * 0.5, c - c * 0.5); g.lineTo(c - sgn * c * 0.42, c - c * 0.36); g.lineTo(c - sgn * c * 0.36, c - c * 0.42); g.closePath(); g.fill(); }
      around(g, c, c * 0.74, 24, (g) => { g.beginPath(); g.ellipse(0, 0, 7, 16, 0.6, 0, Math.PI * 2); g.fill(); });
    } else if (kind === 'wizard') {
      g.lineWidth = 6; poly(g, c, c * 0.56, 5, -Math.PI / 2, 2); poly(g, c, c * 0.56, 5, -Math.PI / 2);
      ring(g, c, c * 0.28, 3);
      around(g, c, c * 0.75, 5, (g, i) => {
        g.lineWidth = 4; g.beginPath(); g.arc(0, 0, c * 0.11, 0, Math.PI * 2); g.stroke(); g.lineWidth = 5; g.beginPath();
        if (i === 0) { g.moveTo(0, -30); g.quadraticCurveTo(26, 4, 0, 30); g.quadraticCurveTo(-26, 4, 0, -30); }        // ไฟ
        else if (i === 1) { g.moveTo(0, -30); g.quadraticCurveTo(24, 10, 0, 28); g.quadraticCurveTo(-24, 10, 0, -30); g.moveTo(-10, 12); g.lineTo(10, 12); }  // น้ำ
        else if (i === 2) { g.arc(0, 0, 20, 0.2, 5.2); g.moveTo(0, 0); g.arc(0, 0, 9, 0.2, 5); }                      // ลม
        else if (i === 3) { g.moveTo(-28, 22); g.lineTo(0, -26); g.lineTo(28, 22); g.closePath(); g.moveTo(-14, 0); g.lineTo(14, 0); }  // ดิน
        else { g.moveTo(8, -32); g.lineTo(-12, 4); g.lineTo(6, 4); g.lineTo(-8, 32); }                               // สายฟ้า
        g.stroke();
      }, -Math.PI / 2);
      around(g, c, c * 0.935, 40, (g, i) => { g.font = 'bold 30px serif'; g.textAlign = 'center'; g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ'[i % 20], 0, 10); });
    } else if (kind === 'hunter') {
      around(g, c, c * 0.935, 24, (g) => { g.lineWidth = 4; g.beginPath(); g.moveTo(0, -16); g.lineTo(0, 16); g.moveTo(-8, -6); g.lineTo(0, -16); g.lineTo(8, -6); g.stroke(); });
      around(g, c, c * 0.3, 4, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, -c * 0.52); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.4)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(c * 0.09, -c * 0.15, c * 0.07, -c * 0.4, 0, -c * 0.54); g.bezierCurveTo(-c * 0.07, -c * 0.4, -c * 0.09, -c * 0.15, 0, 0); g.fill();
      }, -Math.PI / 2);
      g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(c, c, c * (0.42 + i * 0.05), -2.4 + i * 2.1, -1.4 + i * 2.1); g.stroke(); }
      ring(g, c, c * 0.12, 6);
    } else if (kind === 'priest') {
      around(g, c, c * 0.935, 12, (g) => { g.lineWidth = 5; g.beginPath(); g.moveTo(0, -16); g.lineTo(0, 16); g.moveTo(-10, -5); g.lineTo(10, -5); g.stroke(); });
      around(g, c, c * 0.22, 6, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, -c * 0.6); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(-c * 0.05, 0); g.quadraticCurveTo(-c * 0.12, -c * 0.35, 0, -c * 0.62); g.quadraticCurveTo(c * 0.12, -c * 0.35, c * 0.05, 0); g.fill();
      });
      ring(g, c, c * 0.2, 6); g.fillStyle = radial(g, c, c, c * 0.18, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0.1)']]); g.beginPath(); g.arc(c, c, c * 0.18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; ticks(g, c, c * 0.62, c * 0.86, 48, 2);
    } else if (kind === 'clock') {
      ticks(g, c, c * 0.62, c * 0.8, 12, 8); ticks(g, c, c * 0.68, c * 0.76, 60, 2);
      around(g, c, c * 0.935, 12, (g, i) => { g.font = 'bold 44px serif'; g.textAlign = 'center'; g.fillText(['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i], 0, 14); }, -Math.PI / 2);
      g.lineWidth = 10; g.beginPath(); g.moveTo(c, c); g.lineTo(c, c - c * 0.45); g.moveTo(c, c); g.lineTo(c + c * 0.3, c + c * 0.1); g.stroke();
      ring(g, c, c * 0.06, 8);
    } else if (kind === 'galaxy') {
      g.shadowBlur = 0;
      for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 220; i++) { const t = i / 220, a = arm * 2.094 + t * 7.5, r = c * (0.08 + t * 0.82), j = (1 - t) * 18; g.globalAlpha = 0.25 + 0.75 * (1 - t); g.beginPath(); g.arc(c + Math.cos(a) * r + (Math.random() - 0.5) * j, c + Math.sin(a) * r + (Math.random() - 0.5) * j, 2 + 5 * (1 - t) * Math.random(), 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1; g.fillStyle = radial(g, c, c, c * 0.25, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, s, s);
    }
  }),
};

/* ================= วัสดุเชดเดอร์ ================= */
const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }`;
const C3 = (c) => new THREE.Color(c);
const U = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
const mat = (uniforms, vs, fs, side = THREE.DoubleSide) => new THREE.ShaderMaterial({ uniforms: U(uniforms), vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false, blending: ADD, side });
const VS_UV = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const VS_N = `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;

// วงเวทที่ "วาด" ตัวเองตามเข็มนาฬิกา แล้วเรืองแสงเป็นจังหวะ
export function sigilMat(map, cA, cB, gain = 1) {
  return mat({ map, cA: C3(cA).multiplyScalar(gain), cB: C3(cB).multiplyScalar(gain), progress: 0, opacity: 1, time: 0 }, VS_UV, `
    uniform sampler2D map; uniform vec3 cA, cB; uniform float progress, opacity, time; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float ang = atan(p.y, p.x) / 6.2831853 + 0.5;
      float a = texture2D(map, vUv).a; if (a < 0.01) discard;
      float m = smoothstep(ang - 0.02, ang + 0.01, progress * 1.04);
      float edge = exp(-abs(ang - progress) * 70.0) * step(progress, 0.999);
      float sh = 0.72 + 0.28 * sin(time * 5.0 - r * 16.0);
      vec3 col = mix(cB, cA, smoothstep(0.15, 0.95, r)) * sh + vec3(1.0) * edge * 1.4 + vec3(0.35) * pow(a, 3.0);
      gl_FragColor = vec4(col, a * (m + edge) * opacity); }`);
}

// ริบบิ้นแสง: แกนขาวกลาง ขอบสี หางจางนุ่ม
export function ribbonMat(color, core = '#ffffff', gain = 1) {
  return new THREE.ShaderMaterial({
    uniforms: U({ cA: C3(color).multiplyScalar(gain), cB: C3(core).multiplyScalar(gain), opacity: 1, time: 0 }),
    vertexShader: `attribute float aU; attribute float aS; varying float vU; varying float vS; void main(){ vU = aU; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 cA, cB; uniform float opacity, time; varying float vU; varying float vS;
      void main(){ float e = 1.0 - abs(vS); float core = pow(e, 6.0); float glow = pow(e, 1.6);
        float tail = smoothstep(0.0, 0.55, vU); float shimmer = 0.85 + 0.15 * sin(vU * 30.0 - time * 18.0);
        vec3 col = mix(cA, cB, core * (0.5 + 0.5 * vU)) * shimmer * 1.6;
        gl_FragColor = vec4(col, min(1.0, glow * 1.1 + core * 0.9) * tail * opacity); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: ADD, side: THREE.DoubleSide,
  });
}

// เปลวไฟเชดเดอร์บนทรงกระบอก/กรวย (uv.y = ความสูง)
export function flameMat(core, edge, gain = 1) {
  return mat({ cA: C3(core).multiplyScalar(gain), cB: C3(edge).multiplyScalar(gain), opacity: 1, time: 0, speed: 2.2 }, VS_N, `${NOISE}
    uniform vec3 cA, cB; uniform float opacity, time, speed; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float h = vUv.y; float n = fbm(vec2(vUv.x * 6.0, h * 2.6 - time * speed));
      float n2 = fbm(vec2(vUv.x * 11.0 + 3.0, h * 4.0 - time * speed * 1.6));
      float body = smoothstep(0.32, 0.78, n * 0.75 + n2 * 0.45 + (1.0 - h) * 0.55 - h * 0.25);
      float soft = pow(abs(dot(vN, vV)), 0.7) * smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.7, 1.0, h));
      vec3 col = mix(cB, cA, smoothstep(0.62, 1.0, body + (1.0 - h) * 0.15));
      gl_FragColor = vec4(col * (0.42 + body * 0.38), body * soft * opacity * 0.7); }`);
}

// โล่พลังงาน fresnel + ลายไหล (map = ลายรังผึ้ง/กางเขน)
export function energyMat(color, map, gain = 1, repeat = [6, 3]) {
  return mat({ cA: C3(color).multiplyScalar(gain), map, opacity: 1, time: 0, rep: new THREE.Vector2(...repeat), hit: 0 }, VS_N, `
    uniform vec3 cA; uniform sampler2D map; uniform float opacity, time, hit; uniform vec2 rep; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
      float pat = texture2D(map, vUv * rep + vec2(time * 0.05, -time * 0.08)).a;
      float wave = smoothstep(0.0, 0.15, sin(vUv.y * 18.0 - time * 6.0) * 0.5 + 0.5 - 0.7);
      float a = f * 0.7 + pat * (0.08 + f * 0.45) + wave * 0.12 + hit * 0.5;
      gl_FragColor = vec4(cA * (0.7 + f * 0.6), a * opacity * 0.85); }`);
}

// ลำแสงสวรรค์/เสาพลังงาน: กลางสว่าง ขอบนุ่ม มีลายไหลขึ้น
export function beamMat(color, gain = 1) {
  return mat({ cA: C3(color).multiplyScalar(gain), opacity: 1, time: 0, speed: 1.4 }, VS_N, `${NOISE}
    uniform vec3 cA; uniform float opacity, time, speed; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float c = pow(abs(dot(vN, vV)), 2.4);
      float s = fbm(vec2(vUv.x * 14.0, vUv.y * 2.0 - time * speed)) ;
      float hf = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
      gl_FragColor = vec4(cA * (0.6 + c * 0.6), c * (0.4 + s * 0.6) * hf * opacity); }`);
}

// ทรงกรวยพายุหมุน (ลายลมเกลียว)
export function vortexMat(color, gain = 1) {
  return mat({ cA: C3(color).multiplyScalar(gain), opacity: 1, time: 0 }, VS_N, `${NOISE}
    uniform vec3 cA; uniform float opacity, time; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float sp = vUv.x * 3.0 + vUv.y * 2.2 - time * 2.6;
      float n = fbm(vec2(sp * 4.0, vUv.y * 3.0 - time));
      float streak = smoothstep(0.55, 0.9, n);
      float soft = pow(abs(dot(vN, vV)), 0.8) * smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
      gl_FragColor = vec4(cA * (0.8 + streak), (streak * 0.9 + 0.12) * soft * opacity); }`);
}

/* ================= ริบบิ้น (แถบสามเหลี่ยมหันหากล้อง) ================= */
export class Ribbon {
  constructor(n, material) {
    this.n = n;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 6);
    const aU = new Float32Array(n * 2), aS = new Float32Array(n * 2), idx = [];
    for (let i = 0; i < n; i++) { aU[i * 2] = aU[i * 2 + 1] = i / (n - 1); aS[i * 2] = -1; aS[i * 2 + 1] = 1; if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1)); geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, material); this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    this.t = new THREE.Vector3(); this.side = new THREE.Vector3(); this.view = new THREE.Vector3();
  }
  // pts: อาร์เรย์ Vector3 (หาง → หัว) จำนวน n · width(u) · cam = ตำแหน่งกล้อง
  set(pts, width, cam) {
    const n = this.n, P = this.pos;
    for (let i = 0; i < n; i++) {
      const p = pts[Math.min(pts.length - 1, i)], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      this.t.subVectors(b, a); if (this.t.lengthSq() < 1e-10) this.t.set(1, 0, 0);
      this.view.subVectors(cam, p);
      this.side.crossVectors(this.t, this.view).normalize();
      const w = (typeof width === 'function' ? width(i / (n - 1)) : width) * 0.5;
      P[i * 6] = p.x - this.side.x * w; P[i * 6 + 1] = p.y - this.side.y * w; P[i * 6 + 2] = p.z - this.side.z * w;
      P[i * 6 + 3] = p.x + this.side.x * w; P[i * 6 + 4] = p.y + this.side.y * w; P[i * 6 + 5] = p.z + this.side.z * w;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
