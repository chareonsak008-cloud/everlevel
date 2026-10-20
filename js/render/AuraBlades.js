// v0.41: ออร่าสายยุทธ์ (กระบี่บินวน · เคียวยักษ์ลอยหลัง · ลำแสงปลดปล่อยพลัง)
// ชิ้นส่วนเป็นภาพพิกเซลวาดด้วยโค้ด (ออกแบบเอง) แปะเป็นสไปรต์หันหากล้อง · ใช้ความลึกจริง → ดาบที่วนไปด้านหลังถูกตัวละครบัง
// รับตัวช่วยจาก Costumes.js ผ่าน H (mesh, unlit, spriteOf, shockwaves, flashSprite, burstCycle, scatter, discPos, lin, TX)
import { THREE } from './three.js?v=0.70.0';

/* ---------------- ภาพพิกเซล ---------------- */
const texCache = new Map();
function pxTex(key, w, h, draw, outline = '#140f1e') {
  if (texCache.has(key)) return texCache.get(key);
  const W = w + 2, Hh = h + 2, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.save(); g.translate(1, 1); draw(g); g.restore();
  // ตัดขอบเบลอ → พิกเซลคม แล้วเติมเส้นขอบเข้ม 1 พิกเซล
  const im = g.getImageData(0, 0, W, Hh), d = im.data, solid = new Uint8Array(W * Hh);
  for (let i = 0; i < W * Hh; i++) { if (d[i * 4 + 3] >= 110) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
  const oc = new THREE.Color(outline), or = Math.round(oc.r * 255), og = Math.round(oc.g * 255), ob = Math.round(oc.b * 255);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (solid[i]) continue;
    if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < Hh - 1 && solid[i + W])) { d[i * 4] = or; d[i * 4 + 1] = og; d[i * 4 + 2] = ob; d[i * 4 + 3] = 255; }
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
  t.userData = { w: W, h: Hh }; texCache.set(key, t); return t;
}
const R = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// กระบี่จีนใบตรง ปลายแหลม กระบังกว้าง ด้ามพันเชือก มีพู่ห้อยท้ายด้าม (ปลายชี้ขึ้น)
export const PAL = {
  iron:   { blade: '#c8d0dc', ridge: '#ffffff', shade: '#7a8494', guard: '#9a7a44', grip: '#4a3020', gem: '#9ad8ff', tassel: null, glow: '#bfe0ff' },
  jade:   { blade: '#86e8b0', ridge: '#effff4', shade: '#2a9a6a', guard: '#e0b84a', grip: '#3a2a1a', gem: '#3affa8', tassel: '#e83a3a', glow: '#6affb0' },
  azure:  { blade: '#a8dcff', ridge: '#ffffff', shade: '#3a7ad8', guard: '#e8ecff', grip: '#2a3a6a', gem: '#ffffff', tassel: '#4ac8ff', glow: '#6ac8ff' },
  sun:    { blade: '#ffd88a', ridge: '#fff8d8', shade: '#e8701a', guard: '#c8281a', grip: '#5a1a0a', gem: '#ff3a1a', tassel: '#ff5a1a', glow: '#ff8a2a' },
  violet: { blade: '#e4d4ff', ridge: '#ffffff', shade: '#8a5ad8', guard: '#4a2a7a', grip: '#2a1a40', gem: '#ff6aff', tassel: '#b05aff', glow: '#b48cff' },
  gold:   { blade: '#fff0b0', ridge: '#ffffff', shade: '#d8a028', guard: '#ffffff', grip: '#b07a1a', gem: '#7fe8ff', tassel: '#ffd34d', glow: '#ffd86a' },
  blood:  { blade: '#ff6a78', ridge: '#ffe0e4', shade: '#a8102a', guard: '#2a0a12', grip: '#1a0608', gem: '#ff1a3a', tassel: '#ff1a3a', glow: '#ff3a5a' },
  soul:   { blade: '#a8fff0', ridge: '#ffffff', shade: '#2a9aa0', guard: '#3a2a50', grip: '#241c34', gem: '#5affe0', tassel: null, glow: '#5affe0' },
};
export function swordTex(pal) {
  const P = PAL[pal] || PAL.iron, T = P.tassel ? 7 : 0;
  return pxTex('sw' + pal, 11, 36 + T, (g) => {
    R(g, P.ridge, 5, 0); R(g, P.blade, 4, 1, 3, 2); R(g, P.ridge, 5, 1, 1, 2); R(g, P.shade, 3, 3); R(g, P.blade, 4, 3, 3); R(g, P.ridge, 5, 3); R(g, P.blade, 7, 3);
    for (let y = 4; y < 26; y++) { R(g, P.shade, 3, y); R(g, P.blade, 4, y); R(g, P.ridge, 5, y); R(g, P.blade, 6, y); R(g, y % 7 === 2 ? P.ridge : P.blade, 7, y); }
    R(g, P.guard, 0, 26, 11, 2); R(g, P.guard, 1, 25, 2); R(g, P.guard, 8, 25, 2); R(g, P.gem, 4, 26, 3, 2); R(g, P.ridge, 5, 26);
    for (let y = 28; y < 34; y++) { R(g, P.grip, 4, y, 3); if (y % 2) R(g, P.guard, 4, y, 3); }
    R(g, P.guard, 3, 34, 5); R(g, P.gem, 4, 35, 3);
    if (P.tassel) { R(g, P.tassel, 5, 36, 1, 2); R(g, P.tassel, 4, 38, 3, 4); R(g, P.ridge, 5, 38); R(g, P.tassel, 3, 41, 5, 2); }
  });
}
// เคียวยักษ์: ด้ามยาวเอียง ใบโค้งใหญ่ ตาอัญมณีที่โคน
export function scytheTex(pal, mirror = false) {
  const P = PAL[pal] || PAL.soul;
  return pxTex((mirror ? 'scm' : 'sc') + pal, 58, 76, (g) => {
    if (mirror) { g.translate(58, 0); g.scale(-1, 1); }   // v0.44.3 เคียวกลับด้าน (สไปรต์ไม่รองรับ scale ติดลบ)
    // ด้าม (ล่างขวา → บนกลาง)
    for (let i = 0; i <= 68; i++) { const x = Math.round(42 - i * 0.16), y = 74 - i; R(g, P.grip, x, y, 3); R(g, P.shade, x + 2, y); if (i % 9 === 4) R(g, P.guard, x - 1, y, 5, 2); }
    // ใบเคียว (โค้งไปทางซ้าย ปลายแหลมชี้ลง)
    g.fillStyle = P.blade; g.beginPath(); g.moveTo(33, 4); g.quadraticCurveTo(4, 2, 1, 34); g.quadraticCurveTo(9, 15, 34, 15); g.closePath(); g.fill();
    g.fillStyle = P.shade; g.beginPath(); g.moveTo(33, 4); g.quadraticCurveTo(10, 3, 4, 22); g.quadraticCurveTo(12, 8, 33, 8); g.closePath(); g.fill();
    g.strokeStyle = P.ridge; g.lineWidth = 1.6; g.beginPath(); g.moveTo(32, 14); g.quadraticCurveTo(9, 15, 2, 32); g.stroke();
    // คมหลัง + ปลอกโลหะ + อัญมณี
    g.fillStyle = P.guard; g.beginPath(); g.moveTo(33, 2); g.lineTo(44, 0); g.lineTo(40, 7); g.lineTo(35, 16); g.closePath(); g.fill();
    R(g, P.gem, 34, 8, 4, 4); R(g, P.ridge, 35, 9);
    R(g, P.guard, 32, 16, 6, 2); R(g, P.guard, 31, 71, 6, 3);
  });
}
// ลำแสงแผ่ออก (ฐานสว่าง ปลายจาง) — ไม่ใช่พิกเซล ใช้ผสมแสงแบบบวก
let rayT = null;
function rayTex() {
  if (rayT) return rayT;
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 128; const g = cv.getContext('2d');
  const id = g.createImageData(32, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
    const v = y / 127, u = Math.abs(x - 15.5) / 16, w = 1 - v * 0.7;
    const a = Math.max(0, 1 - Math.pow(u / w, 1.6)) * Math.pow(v, 0.9) * (1 - Math.pow(v, 6));
    const i = (y * 32 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(id, 0, 0);
  rayT = new THREE.CanvasTexture(cv); return rayT;
}

/* ---------------- ส่วนประกอบ ---------------- */
let CAM = null;
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function pxSprite(H, tex, height, { opacity = 1, color = '#ffffff' } = {}) {
  const m = new THREE.SpriteMaterial({ map: tex, color: H.lin(color), transparent: true, opacity, alphaTest: 0.5, depthWrite: false, depthTest: true, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(height * tex.userData.w / tex.userData.h, height, 1);
  s.renderOrder = 36; s.userData.auraDepth = true; s.frustumCulled = false;   // 36 = วาดก่อนตัวละคร (40) → อยู่หลังตัวเสมอ · 46 = หน้าตัว
  s.onBeforeRender = (r, sc, cam) => { CAM = cam; };
  return s;
}
const glowOf = (H, color, size, op) => { const s = H.spriteOf(H.TX.softDot(), color, size, op); s.renderOrder = 35; s.userData.auraDepth = true; return s; };
// มุมบนจอระหว่างจุดโลก a → b (เรเดียน, 0 = ชี้ขึ้น)
function screenAng(a, b) {
  if (!CAM) return 0;
  _a.copy(a).project(CAM); _b.copy(b).project(CAM);
  return Math.atan2(_b.y - _a.y, (_b.x - _a.x) * (CAM.aspect || 1)) - Math.PI / 2;
}
// ทิศหากล้องในพิกัดของ root (แนวราบ) + เวกเตอร์ขวาบนจอ
function camBasis(root, out) {
  if (!CAM) { out.f.set(0, 0, 1); out.r.set(1, 0, 0); return out; }
  root.updateWorldMatrix(true, false);
  _v.copy(CAM.position); root.worldToLocal(_v); _v.y = 0; if (_v.lengthSq() < 1e-6) _v.set(0, 0, 1); _v.normalize();
  out.f.copy(_v); out.r.set(_v.z, 0, -_v.x); return out;
}

// แผ่นหลังตัวละครหันเข้าหากล้องไหม (หลัง = -Z ของ root)
const backFront = (B) => B.f.z < -0.2;

// วงกระบี่บิน: n เล่ม รัศมี r สูง y หมุน sp · mode: up (ตั้งตรง) / chase (ไล่กันเป็นวง) / out (ชี้ออก)
function swordRing(H, g, rt, P, ring, st, root) {
  const BB = { f: new THREE.Vector3(), r: new THREE.Vector3() };
  const tex = swordTex(ring.pal || P.pal), pal = PAL[ring.pal || P.pal];
  const list = Array.from({ length: ring.n }, (_, i) => {
    const s = pxSprite(H, tex, ring.size || 0.5); g.add(s);
    const gl = ring.glow === false ? null : glowOf(H, pal.glow, (ring.size || 0.5) * 0.9, 0.35); if (gl) g.add(gl);
    return { s, gl, a0: (i / ring.n) * Math.PI * 2, ph: Math.random() * 6 };
  });
  const tmp = new THREE.Vector3();
  rt.on(({ t, dt }) => {
    camBasis(root, BB);
    const kick = st.kick || 0, rr = ring.r * (1 + kick * (ring.kickR ?? 0.35)), spd = ring.sp * (1 + kick * 2.5);
    ring.phase = (ring.phase || 0) + spd * dt;
    for (const o of list) {
      const a = o.a0 + ring.phase, tilt = ring.tilt || 0;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = ring.y + Math.sin(a) * tilt * rr + Math.sin(t * 2 + o.ph) * (ring.bob ?? 0.05);
      o.s.position.set(x, y, z); if (o.gl) o.gl.position.set(x, y, z);
      const front = x * BB.f.x + z * BB.f.z > 0; o.s.renderOrder = front ? 46 : 36; if (o.gl) o.gl.renderOrder = front ? 45 : 35;
      let rot = 0;
      if (ring.mode === 'chase' || ring.mode === 'out') {
        const wp = rt.worldPos(o.s);
        const a2 = a + (ring.mode === 'chase' ? Math.sign(spd || 1) * 0.15 : 0);
        tmp.set(ring.mode === 'chase' ? Math.cos(a2) * rr : x * 2, ring.mode === 'chase' ? ring.y + Math.sin(a2) * tilt * rr : y, ring.mode === 'chase' ? Math.sin(a2) * rr : z * 2);
        g.localToWorld(tmp); rot = screenAng(wp, tmp);
      } else rot = Math.sin(t * 1.5 + o.ph) * 0.08;
      o.s.material.rotation = rot;
      if (P.trail && Math.random() < dt * (ring.trail ?? 7)) rt.ps('dot').emit({ pos: rt.worldPos(o.s), count: 1, speed: 0.04, life: [0.25, 0.5], size: [0.05, 0.09], color: [pal.glow, '#ffffff'] });
    }
  });
}

/* ---------------- ตัวสร้างหลัก ----------------
 p = { pal, rings:[{n,r,y,sp,tilt,size,mode,bob}], crown:{size,y,pal}, fan:{n,R,y,size,pal},
       scythe:{pal,size,y,twin}, rays:{n,len,color,y,spin}, pillar:color, rune:{kind,color,size},
       moon:color, burst:{period,color}, motes:[colors], trail:true } */
export function wuxiaAura(rig, p, rt, H) {
  const g = H.group(rig.root), st = { kick: 0 }, B = { f: new THREE.Vector3(), r: new THREE.Vector3() };
  const P = { pal: p.pal || 'iron', trail: p.trail !== false };
  for (const ring of p.rings || []) swordRing(H, g, rt, P, { ...ring }, st, rig.root);

  // กระบี่ยักษ์เหนือศีรษะ ปลายชี้ลง หมุนช้า ๆ
  if (p.crown) {
    const c = p.crown, s = pxSprite(H, swordTex(c.pal || P.pal), c.size || 1.3); const _c = 0, gl = glowOf(H, PAL[c.pal || P.pal].glow, (c.size || 1.3) * 1.1, 0.5);
    g.add(gl); g.add(s);
    rt.on(({ t }) => { const y = (c.y || 2.6) + Math.sin(t * 1.4) * 0.07; s.position.set(0, y, 0); gl.position.set(0, y - 0.1, 0); s.material.rotation = Math.PI + Math.sin(t * 0.9) * 0.05; gl.material.opacity = 0.35 + 0.15 * Math.sin(t * 3); });
  }

  // พัดกระบี่หลังศีรษะ (เรียงเป็นรัศมีครึ่งวง ชี้ออก) — หันเข้าหากล้องเสมอ
  if (p.fan) {
    const f = p.fan, tex = swordTex(f.pal || P.pal);
    const list = Array.from({ length: f.n }, (_, i) => { const s = pxSprite(H, tex, f.size || 0.6); g.add(s); return { s, k: f.n === 1 ? 0.5 : i / (f.n - 1) }; });
    const halo = glowOf(H, PAL[f.pal || P.pal].glow, (f.R || 0.9) * 2.4, 0.3); g.add(halo);
    rt.on(({ t }) => {
      camBasis(rig.root, B); const br = 1 + 0.06 * Math.sin(t * 2) + st.kick * 0.25;
      const cx = 0, cz = -0.25, cy = f.y || 1.45, bk = backFront(B);   // v0.44.3 ติดหลังตัวละคร หันตามตัว
      halo.position.set(cx, cy, cz); halo.renderOrder = 35;
      for (const o of list) {
        o.s.renderOrder = bk ? 46 : 36;
        const th = THREE.MathUtils.lerp(f.from ?? 0.12, f.to ?? Math.PI - 0.12, o.k) + Math.sin(t * 0.8) * 0.04, rr = (f.R || 0.9) * br;
        o.s.position.set(cx + B.r.x * Math.cos(th) * rr, cy + Math.sin(th) * rr, cz + B.r.z * Math.cos(th) * rr);
        o.s.material.rotation = th - Math.PI / 2;
      }
    });
  }

  // เคียวยักษ์ลอยหลังตัว (โยกช้า ๆ) · twin = เคียวคู่ไขว้เป็นรูป X ใบเคียวคนละข้าง
  // v0.44.3 ติดอยู่ที่หลังตัวละคร (หันตามทิศตัว) · หันหลังให้กล้อง → เคียวอยู่หน้าแผ่นหลัง
  if (p.scythe) {
    const c = p.scythe, tex = scytheTex(c.pal || 'soul'), n = c.twin ? 2 : 1, S = c.size || 2.1;
    const list = Array.from({ length: n }, (_, i) => { const side = n === 1 ? 1 : (i ? -1 : 1), s = pxSprite(H, side < 0 ? scytheTex(c.pal || 'soul', true) : tex, S); g.add(s); return { s, side }; });
    const gl = glowOf(H, PAL[c.pal || 'soul'].glow, S * 1.1, 0.28); g.add(gl);
    // จุดกึ่งกลางด้ามในภาพ (จากกึ่งกลางสไปรต์) · ด้ามเอียงซ้ายเดิม ~0.16 เรเดียน
    const PX1 = S / tex.userData.h, DX = 9 * PX1, DY = -2 * PX1, LEAN = 0.16, X_ANG = 0.62;
    rt.on(({ t }) => {
      camBasis(rig.root, B); const y = (c.y || 1.35) + (n === 2 ? 0.15 : 0) + Math.sin(t * 1.1) * 0.08, bk = backFront(B), az = -0.3;
      for (const o of list) {
        let th, ox = 0, oy = 0;
        if (n === 1) { th = -0.25 + Math.sin(t * 0.9) * 0.06; ox = 0.12; }
        else {
          th = o.side * (X_ANG - LEAN + Math.sin(t * 0.9) * 0.05);         // สองเล่มเอียงสวนกันสมมาตร → ด้ามไขว้กลางหลัง
          const lx = o.side * DX, cs = Math.cos(th), sn = Math.sin(th);
          ox = -(lx * cs - DY * sn); oy = -(lx * sn + DY * cs);            // เลื่อนให้จุดกลางด้ามทับกันพอดี
        }
        o.s.material.rotation = th;
        o.s.position.set(B.r.x * ox, y + oy, az + B.r.z * ox);
        o.s.renderOrder = (bk ? 46 : 36) + (o.side < 0 ? 1 : 0);
      }
      gl.position.set(0, y + 0.25, az - 0.02); gl.renderOrder = 35; gl.material.opacity = 0.22 + 0.1 * Math.sin(t * 2.2);
    });
    // วิญญาณลอยวนรอบเคียว
    H.auraEmitter(rig, rt, 10, (b) => rt.ps('dot').emit({ pos: H.discPos(b, 0.7, 0.4, 2.4), count: 1, vel: () => H.V(0, H.rand(0.2, 0.5), 0), life: [0.8, 1.4], size: [0.06, 0.12], color: [PAL[c.pal || 'soul'].glow, '#ffffff'] }));
  }

  // จันทร์ลอยหลังศีรษะ
  if (p.moon) {
    const m = H.spriteOf(H.TX.crescent(), p.moon, 0.9, 0.85); m.renderOrder = 35; m.userData.auraDepth = true; g.add(m);
    const mg = glowOf(H, p.moon, 1.6, 0.25); g.add(mg);
    rt.on(({ t }) => { camBasis(rig.root, B); const y = 2.45 + Math.sin(t * 1.2) * 0.05; m.position.set(0, y, -0.4); mg.position.copy(m.position); m.material.rotation = 0.5 + Math.sin(t * 0.5) * 0.05; });
  }

  // ลำแสงแผ่ออกจากกลางตัว (ปลดปล่อยพลัง)
  if (p.rays) {
    const r = p.rays, tex = rayTex(), cols = [].concat(r.color || '#ffffff');
    const list = Array.from({ length: r.n || 10 }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: H.lin(cols[i % cols.length]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.center.set(0.5, 0); s.renderOrder = 34; s.userData.auraDepth = true; g.add(s);
      return { s, a: (i / (r.n || 10)) * Math.PI * 2 + Math.random() * 0.3, ph: Math.random() * 6, w: H.rand(0.7, 1.3) };
    });
    rt.on(({ t }) => {
      camBasis(rig.root, B); const y = r.y || 1.0, boost = 1 + st.kick * 1.4;
      for (const o of list) {
        const k = 0.5 + 0.5 * Math.sin(t * (r.pulse || 3) + o.ph), len = (r.len || 1.6) * (0.6 + 0.55 * k) * o.w * boost;
        o.s.position.set(-B.f.x * 0.12, y, -B.f.z * 0.12);
        o.s.scale.set((r.width || 0.32) * (0.8 + 0.4 * k) * boost, len, 1);
        o.s.material.rotation = o.a + t * (r.spin ?? 0.25);
        o.s.material.opacity = Math.min(1, (r.opacity || 0.55) * (0.45 + 0.55 * k) * boost);
      }
    });
  }

  // เสาแสงพุ่งขึ้นฟ้า
  if (p.pillar) {
    const vt = H.TX.vgrad().clone(); vt.needsUpdate = true; vt.isOwned = true; vt.repeat.set(2, 1);
    const beam = H.mesh(new THREE.CylinderGeometry(0.5, 0.62, 4.6, 28, 1, true), H.unlit(p.pillar, { map: vt, opacity: 0.2, add: true }), rig.root, 0, 2.3, 0, { keep: true, shadow: false });
    const core = H.mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.6, 16, 1, true), H.unlit('#ffffff', { map: vt, opacity: 0.18, add: true }), rig.root, 0, 2.3, 0, { keep: true, shadow: false });
    beam.renderOrder = core.renderOrder = 3;
    rt.on(({ t }) => { vt.offset.x = t * 0.08; beam.material.opacity = 0.16 + 0.05 * Math.sin(t * 2.4) + st.kick * 0.25; core.material.opacity = 0.14 + st.kick * 0.4; });
    H.auraEmitter(rig, rt, 16, (b) => rt.ps('star').emit({ pos: H.discPos(b, 0.5, 0.1, 1.0), count: 1, vel: () => H.V(0, H.rand(1.2, 2.4), 0), life: [0.8, 1.3], size: [0.06, 0.12], color: ['#ffffff', p.pillar] }));
  }

  // วงอักขระที่พื้น
  if (p.rune) {
    const r = p.rune, m = H.mesh(new THREE.PlaneGeometry(r.size || 2.0, r.size || 2.0), H.unlit(r.color, { map: H.TX.runeCircle(r.kind || 'star'), opacity: 0.7, add: true }), rig.root, 0, 0.026, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false });
    m.renderOrder = 2;
    const m2 = r.inner ? H.mesh(new THREE.PlaneGeometry((r.size || 2) * 0.62, (r.size || 2) * 0.62), H.unlit(r.inner, { map: H.TX.runeCircle('hex'), opacity: 0.6, add: true }), rig.root, 0, 0.028, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }) : null;
    if (m2) m2.renderOrder = 2;
    rt.on(({ t }) => { m.rotation.z = t * 0.25; if (m2) m2.rotation.z = -t * 0.5; m.material.opacity = 0.55 + 0.15 * Math.sin(t * 2) + st.kick * 0.3; });
  }

  // จังหวะปลดปล่อยพลัง: คลื่นกระแทก + แสงวาบ + ประกายกระจาย + ดาบกางออก
  if (p.burst) {
    const b = p.burst, wave = H.shockwaves(rig, rt, b.color, { n: 3, r1: b.r1 || 2.6, dur: 0.7 }), flash = H.flashSprite(rig, rt, b.color, { y: 1.0, size: b.flash || 2.4 });
    const cyc = H.burstCycle(rt, b.period || 3.2, () => {
      wave(); setTimeout(() => wave({ r1: (b.r1 || 2.6) * 0.7, opacity: 0.6 }), 140); flash();
      H.scatter(rt, 'star', rt.worldPos(rig.root).add(H.V(0, 1.0, 0)), b.sparks || 18, { color: [b.color, '#ffffff'], speed: [1.6, 3.2], up: [0.3, 1.8], life: [0.6, 1.0], size: [0.08, 0.15] });
    });
    rt.on(({ dt }) => { const ph = cyc.k; st.kick = ph < 0.18 ? 1 - ph / 0.18 : 0; });
  }

  // ละอองแสงลอยขึ้น
  if (p.motes) H.auraEmitter(rig, rt, p.moteRate || 10, (b) => rt.ps('dot').emit({ pos: H.discPos(b, 0.8, 0.05, 0.4), count: 1, vel: () => H.V(H.rand(-0.05, 0.05), H.rand(0.4, 0.9), H.rand(-0.05, 0.05)), life: [0.9, 1.5], size: [0.04, 0.09], color: p.motes }));
}
