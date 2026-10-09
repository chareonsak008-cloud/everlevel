// โพสต์โปรเซสสำหรับเอฟเฟกต์สกิล (v0.8)
// - บลูมเฉพาะเอฟเฟกต์ (เรนเดอร์ราก SkillFX แยกอีกรอบที่ครึ่งความละเอียด แล้วเบลอแบบ dual-kawase)
// - คลื่นกระแทกบนจอ (บิดภาพเป็นวง), แสงวาบทั้งจอ, สีเหลื่อมตอนกระแทก, เส้นความเร็วตอนชาร์จพลัง
// ใช้: post.setSize(w,h) → ทุกเฟรม post.update(dt) แล้ว post.render(scene, camera, fx.root, (k) => fx.setPixelScale(k))
import { THREE } from './three.js';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const MAX_SHOCKS = 4;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

export class PostFX {
  constructor(renderer, { msaa = 4, strength = 1.0, linear = true } = {}) {
    this.r = renderer;
    this.enabled = true;
    this.bloom = true;      // ปิดได้บนเครื่องสเปกต่ำ (ยังมีคลื่นกระแทก/แสงวาบ)
    this.strength = strength;
    this.time = 0;
    const gl2 = renderer.capabilities.isWebGL2;
    // ถ้าเครื่องรองรับ เรนเดอร์ลงบัฟเฟอร์ half-float แบบ linear → การบวกแสงซ้อนกันนุ่มกว่า (ไม่ขาวโพลนเร็ว) สีอิ่มกว่า
    this.linear = linear && !!(gl2 && renderer.getContext().getExtension('EXT_color_buffer_float'));   // v0.16: มือถือใช้ 8 บิต sRGB
    const P = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false,
      encoding: this.linear ? THREE.LinearEncoding : THREE.sRGBEncoding, type: this.linear ? THREE.HalfFloatType : THREE.UnsignedByteType,
    };
    this.sceneRT = gl2 && msaa ? new THREE.WebGLMultisampleRenderTarget(4, 4, P) : new THREE.WebGLRenderTarget(4, 4, P);
    if (this.sceneRT.isWebGLMultisampleRenderTarget) this.sceneRT.samples = msaa;
    this.glowRT = new THREE.WebGLRenderTarget(4, 4, P);
    const Q = { ...P, encoding: THREE.LinearEncoding, depthBuffer: false };
    this.levels = 5; // ครึ่งจอ → 1/4 → 1/8 → 1/16 → 1/32
    this.down = [this.glowRT, ...Array.from({ length: this.levels - 1 }, () => new THREE.WebGLRenderTarget(4, 4, Q))];
    this.up = Array.from({ length: this.levels - 1 }, () => new THREE.WebGLRenderTarget(4, 4, Q));

    this.glowScene = new THREE.Scene();
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    const common = { vertexShader: VERT, depthTest: false, depthWrite: false, toneMapped: false };

    this.matDown = new THREE.ShaderMaterial({
      ...common,
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, knee: { value: new THREE.Vector2() } },
      fragmentShader: `uniform sampler2D src; uniform vec2 texel; uniform vec2 knee; varying vec2 vUv;
        void main() { vec2 o = texel;
          vec4 s = texture2D(src, vUv) * 4.0;
          s += texture2D(src, vUv - o); s += texture2D(src, vUv + o);
          s += texture2D(src, vUv + vec2(o.x, -o.y)); s += texture2D(src, vUv - vec2(o.x, -o.y));
          s /= 8.0;
          // รอบแรก: ตัดส่วนที่ไม่สว่างพอ (วงเวทย์จาง ๆ ไม่ต้องเรือง) เหลือแต่แกนสว่าง
          if (knee.y > 0.0) s.rgb *= smoothstep(knee.x, knee.y, max(s.r, max(s.g, s.b)));
          gl_FragColor = s; }`,
    });
    this.matUp = new THREE.ShaderMaterial({
      ...common,
      uniforms: { src: { value: null }, add: { value: null }, texel: { value: new THREE.Vector2() } },
      fragmentShader: `uniform sampler2D src; uniform sampler2D add; uniform vec2 texel; varying vec2 vUv;
        void main() { vec2 o = texel;
          vec4 s = texture2D(src, vUv + vec2(-o.x * 2.0, 0.0));
          s += texture2D(src, vUv + vec2(-o.x, o.y)) * 2.0;
          s += texture2D(src, vUv + vec2(0.0, o.y * 2.0));
          s += texture2D(src, vUv + vec2(o.x, o.y)) * 2.0;
          s += texture2D(src, vUv + vec2(o.x * 2.0, 0.0));
          s += texture2D(src, vUv + vec2(o.x, -o.y)) * 2.0;
          s += texture2D(src, vUv + vec2(0.0, -o.y * 2.0));
          s += texture2D(src, vUv + vec2(-o.x, -o.y)) * 2.0;
          gl_FragColor = s / 12.0 * 0.5 + texture2D(add, vUv); }`,
    });
    this.shockU = Array.from({ length: MAX_SHOCKS }, () => new THREE.Vector4());
    this.matComp = new THREE.ShaderMaterial({
      ...common,
      defines: { LINEAR: this.linear ? 1 : 0 },
      uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tGlow: { value: null },
        strength: { value: strength }, aspect: { value: 1 }, ca: { value: 0 },
        flashC: { value: new THREE.Color() }, flashA: { value: 0 },
        lines: { value: 0 }, time: { value: 0 }, shocks: { value: this.shockU },
        pxMap: { value: new THREE.Vector4(1, 1, 0, 0) },   // v0.17: ภาพพิกเซล (ย่อ/เลื่อนพิกัดก่อนอ่านภาพฉาก)
      },
      fragmentShader: `uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tGlow;
        uniform float strength; uniform float aspect; uniform float ca; uniform vec3 flashC; uniform float flashA;
        uniform float lines; uniform float time; uniform vec4 shocks[${MAX_SHOCKS}]; uniform vec4 pxMap;
        varying vec2 vUv;
        float hash(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
          vec2 uv = vUv; float ringLight = 0.0;
          for (int i = 0; i < ${MAX_SHOCKS}; i++) {
            vec4 s = shocks[i];
            if (s.w <= 0.0) continue;
            vec2 d = (uv - s.xy) * vec2(aspect, 1.0);
            float dist = length(d);
            float x = (dist - s.z) / (0.035 + s.z * 0.12);
            float ring = exp(-x * x) * s.w;
            uv -= (d / max(dist, 1e-4)) * ring * 0.03 / vec2(aspect, 1.0);
            ringLight += ring;
          }
          vec2 c = uv - 0.5;
          vec2 su = (uv - 0.5) * pxMap.xy + 0.5 + pxMap.zw;
          vec3 col;
          if (ca > 0.002) {
            vec2 off = c * ca * 0.014 * pxMap.xy;
            col = vec3(texture2D(tScene, su + off).r, texture2D(tScene, su).g, texture2D(tScene, su - off).b);
          } else col = texture2D(tScene, su).rgb;
          // เรืองแสง: เพิ่มความอิ่มสีให้ฮาโลเป็นสีของเอฟเฟกต์ ไม่ขาวโพลน
          vec3 glow = texture2D(tBloom, uv).rgb * 0.15 + texture2D(tGlow, uv).rgb * 0.03;
          glow = max(mix(vec3(dot(glow, vec3(0.299, 0.587, 0.114))), glow, 1.45), 0.0);
          col += glow * strength;
#if LINEAR
          // ไหล่นุ่มในพื้นที่ linear แล้วแปลงเป็น sRGB
          // (เข่าที่ 0.8 → ภาพปกติแทบเหมือนวาดตรงลงจอ สลับโหมดแล้วไม่กระพริบ)
          vec3 over = max(col - 0.8, 0.0);
          col = min(col, 0.8) + 0.2 * (1.0 - exp(-over / 0.2));
          col = max(col, 0.0);
          col = mix(1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, col * 12.92, step(col, vec3(0.0031308)));
#endif
          col += vec3(1.0, 0.96, 0.9) * ringLight * 0.03;
          if (lines > 0.002) {
            vec2 d = c * vec2(aspect, 1.0);
            float a = atan(d.y, d.x) / 6.28318 + 0.5, r = length(d);
            float N = 110.0, seg = floor(a * N);
            float h = hash(seg * 1.37 + floor(time * 16.0) * 7.13);
            float f = abs(fract(a * N) - 0.5);
            float start = 0.3 + hash(seg + 3.1) * 0.25;
            float ln = step(0.5, h) * (1.0 - smoothstep(0.06, 0.3, f)) * smoothstep(start, start + 0.22, r);
            col = mix(col, vec3(1.0, 0.98, 0.92), clamp(ln * lines * 0.6, 0.0, 1.0));
            col *= 1.0 - smoothstep(0.35, 0.95, r) * lines * 0.25;
          }
          col += flashC * flashA;
#if !LINEAR
          // ไหล่นุ่มช่วงสว่างจัด: ส่วนที่เกิน 0.8 ค่อย ๆ อิ่มตัว (สีส้ม/ทองยังเป็นสี ไม่ตัดเป็นขาว)
          vec3 over2 = max(col - 0.8, 0.0);
          col = min(col, 0.8) + 0.2 * (1.0 - exp(-over2 / 0.2));
#endif
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    // v0.17: ฉากแบบพิกเซล — เรนเดอร์ความละเอียดต่ำ แล้ววาดเส้นขอบจากความลึก + ลดสีแบบดิทเธอร์ ก่อนขยายแบบ nearest
    this.pxOn = false;
    const PN = { ...P, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.pxRT = new THREE.WebGLRenderTarget(4, 4, PN);
    this.pxRT.depthTexture = new THREE.DepthTexture(4, 4); this.pxRT.depthTexture.type = THREE.UnsignedIntType;
    this.pxOut = new THREE.WebGLRenderTarget(4, 4, { ...PN, depthBuffer: false });
    this.matPx = new THREE.ShaderMaterial({
      ...common,
      defines: { LINEAR: this.linear ? 1 : 0 },
      uniforms: { tCol: { value: null }, tDep: { value: null }, texel: { value: new THREE.Vector2() }, cn: { value: 0.5 }, cf: { value: 220 }, zo: { value: 0 }, ink: { value: new THREE.Color('#3a2a4a') } },
      fragmentShader: `uniform sampler2D tCol; uniform sampler2D tDep; uniform vec2 texel; uniform float cn; uniform float cf; uniform float zo; uniform vec3 ink;
        varying vec2 vUv;
        float lz(float d) { float z = d * 2.0 - 1.0; return 2.0 * cn * cf / (cf + cn - z * (cf - cn)); }
        float dz(vec2 o) { float d = texture2D(tDep, vUv + o * texel).x; return d >= 0.99999 ? 1e4 : lz(d); }
        float bayer(vec2 p) { p = mod(p, 4.0);
          float a = mod(p.x, 2.0), b = mod(p.y, 2.0), c = floor(p.x / 2.0), d = floor(p.y / 2.0);
          return (4.0 * (2.0 * a * (1.0 - b) + 3.0 * a * b + 1.0 * (1.0 - a) * b) + (2.0 * c * (1.0 - d) + 3.0 * c * d + 1.0 * (1.0 - c) * d)) / 16.0; }
        vec3 toS(vec3 c) { return mix(1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, c * 12.92, step(c, vec3(0.0031308))); }
        vec3 toL(vec3 c) { return mix(pow((c + 0.055) / 1.055, vec3(2.4)), c / 12.92, step(c, vec3(0.04045))); }
        void main() {
          vec4 src = texture2D(tCol, vUv);
          vec3 col = src.rgb;
#if LINEAR
          col = toS(col);
#endif
          float d0 = texture2D(tDep, vUv).x;
          if (d0 < 0.99999) {
            float z0 = lz(d0);
            float zl = dz(vec2(-1.0, 0.0)), zr = dz(vec2(1.0, 0.0)), zu = dz(vec2(0.0, 1.0)), zd = dz(vec2(0.0, -1.0));
            // v0.17.1: เกณฑ์นับจากระยะเทียบกล้องเดิม (กล้องแบบ RO อยู่ไกลกว่า แต่ขนาดพิกเซลที่จุดมองเท่าเดิม)
            float zq = max(z0 - zo, 4.0);
            float th = max(0.22, zq * 0.03);
            // เส้นขอบนอก: เพื่อนบ้านอยู่ไกลกว่ามาก → พิกเซลนี้คือขอบของวัตถุด้านหน้า
            float outer = step(th, max(max(zl, zr), max(zu, zd)) - z0);
            // รอยพับ/มุมตึก: ความลึกหักมุมกะทันหัน
            float tc = zq * 0.018 + 0.05;
            float crease = step(tc, abs(zl + zr - 2.0 * z0)) + step(tc, abs(zu + zd - 2.0 * z0));
            if (outer > 0.5) col = mix(col * vec3(0.42, 0.4, 0.5), ink, 0.25);
            else if (crease > 0.5) col *= 0.78;
          }
#if LINEAR
          col = toL(col);
#endif
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    this.shocks = [];
    this.flashA = 0; this.flashC = new THREE.Color();
    this.ca = 0;
    this.linesA = 0; this.linesT = 0; this.linesDur = 0;
    this.size = new THREE.Vector2(4, 4);
    this._cc = new THREE.Color();
  }

  setSize(w, h) {
    w = Math.max(1, Math.floor(w)); h = Math.max(1, Math.floor(h));
    this.size.set(w, h);
    this.sceneRT.setSize(w, h);
    let lw = Math.max(1, w >> 1), lh = Math.max(1, h >> 1);
    for (let i = 0; i < this.levels; i++) {
      this.down[i].setSize(lw, lh);
      if (i < this.levels - 1) this.up[i].setSize(lw, lh);
      lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1);
    }
    this.matComp.uniforms.aspect.value = w / h;
  }

  /* ---------- ตัวกระตุ้นจากสกิล ---------- */
  // คลื่นกระแทกที่ตำแหน่งจอ (u,v ช่วง 0..1) — strength 0.3..1.5
  shock(u, v, strength = 1) {
    if (u < -0.2 || u > 1.2 || v < -0.2 || v > 1.2) return;
    if (this.shocks.length >= MAX_SHOCKS) this.shocks.shift();
    this.shocks.push({ x: u, y: v, t: 0, dur: 0.45 + 0.25 * strength, amp: Math.min(1.6, strength), maxR: 0.16 + 0.22 * strength });
  }
  flash(color, amount) { amount *= this.flashScale ?? 1; if (amount > this.flashA) { this.flashC.set(color); this.flashA = amount; } }
  aberrate(a) { this.ca = Math.max(this.ca, a); }
  speedLines(a, dur) { this.linesA = a; this.linesT = 0; this.linesDur = dur; }
  reset() { this.shocks.length = 0; this.flashA = 0; this.ca = 0; this.linesDur = 0; }

  update(dt) {
    this.time += dt;
    for (let i = this.shocks.length - 1; i >= 0; i--) { const s = this.shocks[i]; s.t += dt; if (s.t >= s.dur) this.shocks.splice(i, 1); }
    this.flashA *= Math.exp(-dt * 7);
    this.ca *= Math.exp(-dt * 5);
    if (this.linesT < this.linesDur) this.linesT += dt;
  }

  /* ---------- เรนเดอร์ ---------- */
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.quadScene, this.quadCam); }

  // active = มีเอฟเฟกต์กำลังเล่นอยู่ไหม — ถ้าไม่มีอะไรเลยจะวาดตรงลงจอ (ประหยัดแบตบนมือถือ)
  // v0.17: ขนาดภาพพิกเซล — k = จำนวนพิกเซลจอต่อ 1 พิกเซลภาพ (จำนวนเต็ม) · คืน { w, h, sx, sy }
  pixelLayout(k) {
    const W = this.size.x, H = this.size.y;
    const w = Math.ceil(W / k) + 2, h = Math.ceil(H / k) + 2;   // เผื่อขอบ 1 พิกเซลรอบด้านสำหรับเลื่อนเศษพิกเซล
    if (this.pxRT.width !== w || this.pxRT.height !== h) { this.pxRT.setSize(w, h); this.pxOut.setSize(w, h); }
    return { w, h, sx: (W / k) / w, sy: (H / k) / h };
  }

  render(scene, camera, glowRoot = null, setPixelScale = null, active = true, px = null) {
    const r = this.r;
    const busy = active || this.shocks.length > 0 || this.flashA > 0.003 || this.ca > 0.003 || this.linesT < this.linesDur;
    if (busy) this.idleT = 0; else this.idleT = (this.idleT || 0) + 1;
    const C = this.matComp.uniforms;
    if (px) {
      // ภาพพิกเซล: ขยายมุมกล้องให้ครอบขอบเผื่อ → เรนเดอร์ความละเอียดต่ำ → เส้นขอบ/ดิทเธอร์ → ตัดกลางภาพมาขยาย
      const L = this.pixelLayout(px.k);
      const fov = camera.fov, asp = camera.aspect;
      camera.fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / L.sy) * 180) / Math.PI;
      camera.aspect = asp * (L.sy / L.sx); camera.updateProjectionMatrix();
      r.setRenderTarget(this.pxRT); r.render(scene, camera);
      camera.fov = fov; camera.aspect = asp; camera.updateProjectionMatrix();
      const U = this.matPx.uniforms;
      U.tCol.value = this.pxRT.texture; U.tDep.value = this.pxRT.depthTexture; U.texel.value.set(1 / L.w, 1 / L.h);
      U.cn.value = camera.near; U.cf.value = camera.far; U.zo.value = px.zo || 0;
      this.pass(this.matPx, this.pxOut);
      C.pxMap.value.set(L.sx, L.sy, (px.ox || 0) / L.w, (px.oy || 0) / L.h);
      C.tScene.value = this.pxOut.texture;
    } else {
      C.pxMap.value.set(1, 1, 0, 0);
      if (!this.enabled || this.idleT > 30) { r.setRenderTarget(null); r.render(scene, camera); return; }
      r.setRenderTarget(this.sceneRT);
      r.render(scene, camera);
      C.tScene.value = this.sceneRT.texture;
    }
    const glowOn = this.bloom && this.enabled && (!px || this.idleT <= 30);
    if (glowOn) this.renderGlow(camera, glowRoot, setPixelScale);
    C.strength.value = glowOn ? this.strength : 0;

    // รวมภาพ + เอฟเฟกต์บนจอ
    C.tBloom.value = this.up[0].texture; C.tGlow.value = this.glowRT.texture;
    C.ca.value = this.ca; C.time.value = this.time;
    C.flashA.value = this.flashA; C.flashC.value.copy(this.flashC);
    let la = 0;
    if (this.linesT < this.linesDur) { const k = this.linesT / this.linesDur; la = this.linesA * (k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1); }
    C.lines.value = la;
    for (let i = 0; i < MAX_SHOCKS; i++) {
      const s = this.shocks[i], u = this.shockU[i];
      if (!s) { u.set(0, 0, 0, 0); continue; }
      const k = s.t / s.dur;
      u.set(s.x, s.y, s.maxR * easeOut(k), s.amp * Math.pow(1 - k, 1.6));
    }
    this.pass(this.matComp, null);
  }

  renderGlow(camera, glowRoot, setPixelScale) {
    const r = this.r;
    // รอบเรืองแสง: ย้ายรากเอฟเฟกต์ไปฉากดำชั่วคราว (ไม่มีหมอก ไม่มีแสงรอบข้าง → เรืองเฉพาะส่วนที่สว่างเอง)
    r.getClearColor(this._cc); const ca = r.getClearAlpha();
    r.setClearColor(0x000000, 1);
    r.setRenderTarget(this.glowRT); r.clear();
    // v0.9: รับได้หลายราก (เอฟเฟกต์สกิล + ตัวละครที่สวมแฟชั่นเรืองแสง + อนุภาคแฟชั่น)
    const roots = (Array.isArray(glowRoot) ? glowRoot : [glowRoot]).filter((o) => o && o.parent);
    if (roots.length) {
      const parents = roots.map((o) => o.parent);
      for (const o of roots) this.glowScene.add(o);
      if (setPixelScale) setPixelScale(0.5);
      r.render(this.glowScene, camera);
      if (setPixelScale) setPixelScale(1);
      roots.forEach((o, i) => parents[i].add(o));
    }
    r.setClearColor(this._cc, ca);

    // เบลอแบบ dual-kawase: ย่อลงทีละครึ่ง แล้วขยายกลับพร้อมรวมทุกระดับ
    const D = this.matDown.uniforms, U = this.matUp.uniforms;
    for (let i = 1; i < this.levels; i++) {
      const src = this.down[i - 1];
      D.src.value = src.texture; D.texel.value.set(1 / src.width, 1 / src.height);
      if (i === 1) { if (this.linear) D.knee.value.set(0.1, 0.6); else D.knee.value.set(0.25, 0.8); } else D.knee.value.set(0, 0);
      this.pass(this.matDown, this.down[i]);
    }
    let prev = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      U.src.value = prev.texture; U.add.value = this.down[i].texture; U.texel.value.set(0.5 / prev.width, 0.5 / prev.height);
      this.pass(this.matUp, this.up[i]);
      prev = this.up[i];
    }
  }
}
