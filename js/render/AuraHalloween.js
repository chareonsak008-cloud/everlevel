// v0.93 fix11 ออร่าฮาโลวีน "ราชันย์ฟักทองราตรี" (ร้านเพชร)
// · เหนือศีรษะ: ราชันย์ฟักทองสวมหมวกแม่มด ใบหน้าแกะสลักเรืองแสงเทียน (กะพริบ) ลอยโยก
// · หลังตัว: พระจันทร์เก็บเกี่ยวสีส้มดวงใหญ่ + หมอกม่วง · ค้างคาวบินตัดหน้าพระจันทร์
// · รอบตัว: ฟักทองจิ๋ว 3 ลูกโคจรรอบเอว · ฝูงค้างคาว 8 ตัวกระพือปีกบินวน · ผีน้อย 4 ตัวลอยวนขึ้นเป็นเกลียว
// · พื้น: วงเวทแม่มดสีส้ม-ม่วง 2 ชั้น · รอยแยกพื้นเรืองไฟ · ป้ายหลุมศพ 4 หลักพร้อมเทียน · หมอกสุสาน
// · ทุก ~4.6 วิ: ราชันย์ฟักทองอ้าปากคำราม → ไฟผีระเบิดเป็นวงรอบตัว คลื่นส้ม/ม่วง ค้างคาวแตกฮือ ผีกรีดร้องพุ่งขึ้นฟ้า
// ภาพทั้งหมดวาดด้วยโค้ด (ออกแบบเอง ไม่ใช้ภาพจากที่อื่น) · ใช้ตัวช่วยชุดเดียวกับออร่ายมทูต (ส่งมาจาก Costumes.js)
import { THREE } from './three.js?v=0.93.0-p2.13';

const TAU = Math.PI * 2;
const CY = 1.05;            // กลางลำตัวตัวละครพิกเซล
const ORANGE = '#ff8a1a', ORANGE2 = '#ffc04a', PURPLE = '#9a4aff', GREEN = '#7aff6a';

export function halloweenAuras(H) {
  const { mesh, unlit, ctex, shockwaves, flashSprite, burstCycle, scatter, auraEmitter, NB, V, rand, lin, TX } = H;
  const ADD = THREE.AdditiveBlending;
  const stage = (rig, rt) => { const G = new THREE.Group(); rig.root.add(G); rt.on(() => { G.rotation.y = -rig.root.rotation.y; }); return G; };
  const flat = (G, size, mat, y, order = 2) => { const m = mesh(new THREE.PlaneGeometry(size, size), mat, G, 0, y, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }); m.renderOrder = order; return m; };
  const deep = (o, order = 46) => { o.userData.auraDepth = true; o.renderOrder = order; o.frustumCulled = false; return o; };
  const sprite = (map, color, sx, sy = sx, op = 1, add = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: lin(color), transparent: true, opacity: op, blending: add ? ADD : THREE.NormalBlending, depthWrite: false })); s.scale.set(sx, sy, 1); return s; };
  let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* ---------- ฟักทองแกะสลัก (ใช้ทั้งราชันย์และลูกจิ๋ว) ---------- */
  // หน้าแกะสลัก: path ของช่อง (ตา จมูก ปาก) · roar = อ้าปากคำราม ตาเฉียงดุ
  const facePath = (g, cx, cy, s, roar) => {
    g.beginPath();
    for (const d of [-1, 1]) {   // ตาสามเหลี่ยม
      const ex = cx + d * 34 * s, ey = cy - 22 * s;
      if (roar) { g.moveTo(ex - d * 22 * s, ey - 14 * s); g.lineTo(ex + d * 20 * s, ey + 2 * s); g.lineTo(ex - d * 12 * s, ey + 16 * s); }
      else { g.moveTo(ex - 18 * s, ey + 12 * s); g.lineTo(ex, ey - 18 * s); g.lineTo(ex + 18 * s, ey + 12 * s); }
      g.closePath();
    }
    g.moveTo(cx, cy - 4 * s); g.lineTo(cx - 9 * s, cy + 10 * s); g.lineTo(cx + 9 * s, cy + 10 * s); g.closePath();   // จมูก
    // ปากหยักฟันเลื่อย
    const my = cy + 26 * s, mw = 58 * s, mh = roar ? 40 * s : 18 * s;
    g.moveTo(cx - mw, my - 6 * s);
    const teeth = 6;
    for (let i = 0; i <= teeth; i++) { const x = cx - mw + (i / teeth) * mw * 2; g.lineTo(x, my + (i % 2 ? 8 * s : -2 * s)); }
    g.quadraticCurveTo(cx + mw * 0.6, my + mh + 6 * s, cx, my + mh);
    for (let i = teeth; i >= 0; i--) { const x = cx - mw + (i / teeth) * mw * 2; if (i % 2 && roar) g.lineTo(x, my + mh - 10 * s); }
    g.quadraticCurveTo(cx - mw * 0.6, my + mh + 6 * s, cx - mw, my - 6 * s); g.closePath();
  };
  const pumpkinBody = (g, cx, cy, rx, ry) => {
    const lobes = [[-0.62, 0.62], [0.62, 0.62], [-0.34, 0.82], [0.34, 0.82], [0, 0.9]];
    for (const [ox, w] of lobes) {
      const gr = g.createRadialGradient(cx + ox * rx * 0.6 - rx * 0.12, cy - ry * 0.35, rx * 0.08, cx + ox * rx * 0.6, cy, rx * w);
      gr.addColorStop(0, '#ffc45a'); gr.addColorStop(0.55, '#f07a1a'); gr.addColorStop(1, '#9a3a0a');
      g.fillStyle = gr; g.beginPath(); g.ellipse(cx + ox * rx * 0.6, cy, rx * w * 0.62, ry, 0, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(110,40,8,0.55)'; g.lineWidth = Math.max(2, rx * 0.03);
    for (const ox of [-0.62, -0.3, 0.3, 0.62]) { g.beginPath(); g.ellipse(cx + ox * rx * 0.55, cy, rx * 0.2, ry * 0.96, 0, -Math.PI * 0.45, Math.PI * 0.45); g.stroke(); }
  };
  const carve = (g, cx, cy, s, roar) => {
    g.save(); facePath(g, cx, cy, s, roar); g.clip();
    const fl = g.createRadialGradient(cx, cy + 10 * s, 4 * s, cx, cy, 90 * s); fl.addColorStop(0, '#fffbd0'); fl.addColorStop(0.35, '#ffd24a'); fl.addColorStop(0.8, '#ff7a10'); fl.addColorStop(1, '#a8300a');
    g.fillStyle = fl; g.fillRect(cx - 120 * s, cy - 80 * s, 240 * s, 180 * s); g.restore();
    g.strokeStyle = 'rgba(80,24,6,0.9)'; g.lineWidth = 3 * s; facePath(g, cx, cy, s, roar); g.stroke();
  };
  // ราชันย์ฟักทอง + หมวกแม่มด (320×340) · 2 เฟรม
  const kingTex = (roar) => ctex('hw_king' + (roar ? 1 : 0), 320, 340, (g) => {
    const cx = 160, cy = 232;
    // เถาวัลย์ม้วนสองข้าง
    g.strokeStyle = '#3a6a1a'; g.lineWidth = 6; g.lineCap = 'round';
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(cx + d * 30, cy - 92); g.bezierCurveTo(cx + d * 110, cy - 130, cx + d * 150, cy - 60, cx + d * 128, cy - 20); g.bezierCurveTo(cx + d * 116, cy - 2, cx + d * 98, cy - 22, cx + d * 112, cy - 34); g.stroke(); }
    g.fillStyle = '#4a8a2a'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(cx + d * 96, cy - 116, 18, 9, d * 0.6, 0, TAU); g.fill(); }
    pumpkinBody(g, cx, cy, 128, 98);
    // ก้าน
    g.fillStyle = '#4a3a1a'; g.beginPath(); g.moveTo(cx - 12, cy - 92); g.quadraticCurveTo(cx - 6, cy - 120, cx + 12, cy - 128); g.lineTo(cx + 18, cy - 118); g.quadraticCurveTo(cx + 8, cy - 108, cx + 12, cy - 90); g.closePath(); g.fill();
    carve(g, cx, cy + 8, 1.15, roar);
    // หมวกแม่มดเอียง
    g.save(); g.translate(cx + 6, cy - 96); g.rotate(-0.16);
    const hb = g.createLinearGradient(-90, 0, 90, 0); hb.addColorStop(0, '#1a0e2a'); hb.addColorStop(0.5, '#3a1e5a'); hb.addColorStop(1, '#140a20');
    g.fillStyle = hb; g.beginPath(); g.ellipse(0, 0, 112, 22, 0, 0, TAU); g.fill();   // ปีกหมวก
    g.beginPath(); g.moveTo(-58, -6); g.quadraticCurveTo(-40, -70, -10, -118); g.quadraticCurveTo(10, -150, 62, -160); g.quadraticCurveTo(24, -128, 24, -96); g.quadraticCurveTo(40, -50, 58, -6); g.closePath(); g.fill();
    g.fillStyle = '#ff8a1a'; g.fillRect(-56, -26, 114, 16);   // แถบหมวก
    g.strokeStyle = '#ffd24a'; g.lineWidth = 4; g.strokeRect(-12, -30, 24, 24);   // หัวเข็มขัด
    g.strokeStyle = 'rgba(180,120,255,0.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-58, -6); g.quadraticCurveTo(-40, -70, -10, -118); g.stroke();
    for (const [x, y] of [[-20, -70], [8, -104], [30, -136]]) { g.fillStyle = '#ffd24a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 3 : 8; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }   // ดาวบนหมวก
    g.restore();
  });
  // แสงจากช่องหน้า (ขาว ย้อมสี) — ซ้อนแบบบวกแสง กะพริบเหมือนเทียน
  const kingGlowTex = (roar) => ctex('hw_kglow' + (roar ? 1 : 0), 320, 340, (g) => {
    g.shadowColor = '#fff'; g.shadowBlur = 26; g.fillStyle = '#fff'; facePath(g, 160, 240, 1.15, roar); g.fill(); g.fill();
  });
  const miniTex = () => ctex('hw_mini', 128, 128, (g) => {
    pumpkinBody(g, 64, 72, 54, 42);
    g.fillStyle = '#4a3a1a'; g.fillRect(58, 22, 9, 14);
    carve(g, 64, 74, 0.5, false);
  });

  /* ---------- ค้างคาว / ผี / พระจันทร์ / หลุมศพ ---------- */
  const batTex = (up) => ctex('hw_bat' + (up ? 1 : 0), 128, 80, (g) => {
    const cx = 64, cy = 44;
    g.fillStyle = '#160c1e'; g.strokeStyle = 'rgba(170,110,255,0.7)'; g.lineWidth = 2;
    for (const d of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + d * 8, cy - 4);
      if (up) { g.quadraticCurveTo(cx + d * 30, cy - 38, cx + d * 60, cy - 30); g.lineTo(cx + d * 50, cy - 14); g.lineTo(cx + d * 40, cy - 20); g.lineTo(cx + d * 30, cy - 6); g.lineTo(cx + d * 20, cy - 10); }
      else { g.quadraticCurveTo(cx + d * 34, cy - 6, cx + d * 60, cy + 18); g.lineTo(cx + d * 46, cy + 14); g.lineTo(cx + d * 38, cy + 24); g.lineTo(cx + d * 26, cy + 12); g.lineTo(cx + d * 16, cy + 14); }
      g.lineTo(cx + d * 8, cy + 6); g.closePath(); g.fill(); g.stroke();
    }
    g.beginPath(); g.ellipse(cx, cy, 11, 14, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 9, cy - 10); g.lineTo(cx - 12, cy - 24); g.lineTo(cx - 3, cy - 13); g.moveTo(cx + 9, cy - 10); g.lineTo(cx + 12, cy - 24); g.lineTo(cx + 3, cy - 13); g.fill();   // หู
    g.fillStyle = '#ff5a2a'; g.shadowColor = '#ff5a2a'; g.shadowBlur = 6; for (const d of [-1, 1]) { g.beginPath(); g.arc(cx + d * 4.5, cy - 4, 2.6, 0, TAU); g.fill(); }
  });
  const ghostTex = () => ctex('hw_ghost', 128, 160, (g) => {
    const gr = g.createLinearGradient(0, 10, 0, 160); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.65, 'rgba(225,230,255,0.75)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(24, 70); g.bezierCurveTo(24, 20, 104, 20, 104, 70); g.lineTo(104, 120);
    for (let i = 0; i <= 4; i++) { const x = 104 - i * 20; g.quadraticCurveTo(x - 5, 156 - (i % 2) * 18, x - 10, 130 + (i % 2) * 16); }
    g.lineTo(24, 70); g.closePath(); g.fill();
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(64 + d * 30, 82); g.quadraticCurveTo(64 + d * 52, 92, 64 + d * 50, 108); g.lineWidth = 9; g.strokeStyle = 'rgba(240,242,255,0.8)'; g.stroke(); }   // แขนผี
    g.fillStyle = '#1a1030'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(64 + d * 15, 62, 7, 10, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(64, 86, 8, 11, 0, 0, TAU); g.fill();
  });
  const moonTex = () => ctex('hw_moon', 320, 320, (g) => {
    const c = 160;
    const halo = g.createRadialGradient(c, c, 90, c, c, 160); halo.addColorStop(0, 'rgba(255,220,150,0.5)'); halo.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = halo; g.fillRect(0, 0, 320, 320);
    const body = g.createRadialGradient(c - 30, c - 30, 10, c, c, 104); body.addColorStop(0, '#fffdf0'); body.addColorStop(0.55, '#ffe8b0'); body.addColorStop(1, '#f0b050');
    g.fillStyle = body; g.beginPath(); g.arc(c, c, 100, 0, TAU); g.fill();
    seed = 77; g.fillStyle = 'rgba(200,140,70,0.32)';
    for (let i = 0; i < 9; i++) { const a = rnd() * TAU, r = rnd() * 70, s = 8 + rnd() * 18; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, s, 0, TAU); g.fill(); }
    // กิ่งไม้แห้งพาดหน้าพระจันทร์
    g.strokeStyle = '#1a0e14'; g.lineCap = 'round';
    const branch = (x, y, a, len, w, d) => { if (d > 4 || len < 6) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); branch(x2, y2, a - 0.45 - rnd() * 0.3, len * 0.68, w * 0.65, d + 1); branch(x2, y2, a + 0.35 + rnd() * 0.3, len * 0.62, w * 0.65, d + 1); };
    branch(-10, 250, -0.55, 90, 12, 0);
  });
  const tombTex = () => ctex('hw_tomb', 112, 144, (g) => {
    const st = g.createLinearGradient(20, 0, 92, 0); st.addColorStop(0, '#6a6a7a'); st.addColorStop(0.5, '#9a9aaa'); st.addColorStop(1, '#4a4a5a');
    g.fillStyle = st; g.beginPath(); g.moveTo(20, 128); g.lineTo(20, 52); g.bezierCurveTo(20, 12, 92, 12, 92, 52); g.lineTo(92, 128); g.closePath(); g.fill();
    g.strokeStyle = '#2a2a36'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#3a3a4a'; g.fillRect(52, 38, 8, 46); g.fillRect(38, 52, 36, 8);   // กากบาทสลัก
    g.strokeStyle = 'rgba(30,30,40,0.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(80, 70); g.lineTo(72, 88); g.lineTo(78, 100); g.stroke();   // รอยร้าว
    g.fillStyle = '#4a7a3a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(26 + i * 12, 126, 9, 5, 0, 0, TAU); g.fill(); }   // ตะไคร่
    g.fillStyle = '#2a1a10'; g.fillRect(8, 128, 96, 10);   // ดิน
    g.fillStyle = '#efe4c8'; g.fillRect(90, 106, 9, 22);   // เทียน
    const fl = g.createRadialGradient(94.5, 100, 0, 94.5, 100, 14); fl.addColorStop(0, '#fffbd0'); fl.addColorStop(0.4, '#ffb03a'); fl.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = fl; g.fillRect(80, 86, 30, 30);
  });
  // วงเวทแม่มด: วงแหวนคู่ อักษรลึกลับ ค้างคาวจิ๋ว 6 ตัว ดาวแปดแฉก หน้าฟักทองตรงกลาง (ขาว ย้อมสี)
  const witchCircleTex = () => ctex('hw_circle', 512, 512, (g, s) => {
    const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
    const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); };
    ring(244, 6); ring(230, 2); ring(176, 4); ring(164, 1.5); ring(72, 3);
    seed = 13;
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; g.save(); g.translate(c + Math.cos(a) * 203, c + Math.sin(a) * 203); g.rotate(a + Math.PI / 2); g.lineWidth = 3; g.beginPath(); const k = (rnd() * 5) | 0;
      if (k === 0) { g.moveTo(-7, 8); g.lineTo(0, -9); g.lineTo(7, 8); } else if (k === 1) { g.arc(0, 0, 7, 0.3, TAU - 0.3); } else if (k === 2) { g.moveTo(-7, -7); g.lineTo(7, 7); g.moveTo(7, -7); g.lineTo(-7, 7); } else if (k === 3) { g.moveTo(0, -9); g.lineTo(0, 9); g.moveTo(-6, -3); g.lineTo(6, -3); } else { g.arc(0, 2, 6, Math.PI, TAU); g.moveTo(-6, 2); g.lineTo(6, 2); }
      g.stroke(); g.restore(); }
    for (let i = 0; i < 6; i++) {   // ค้างคาวจิ๋วระหว่างวง
      const a = i / 6 * TAU + 0.26, x = c + Math.cos(a) * 203, y = c + Math.sin(a) * 203;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.beginPath();
      for (const d of [-1, 1]) { g.moveTo(0, 0); g.quadraticCurveTo(d * 10, -10, d * 20, -4); g.lineTo(d * 14, 2); g.lineTo(d * 8, -1); g.lineTo(0, 4); }
      g.fill(); g.restore();
    }
    g.lineWidth = 3; g.beginPath();   // ดาวแปดแฉก
    for (let i = 0; i <= 8; i++) { const a = (i * 3 % 8) / 8 * TAU - Math.PI / 2; const x = c + Math.cos(a) * 164, y = c + Math.sin(a) * 164; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.save(); g.globalAlpha = 0.9; g.lineWidth = 4; facePath(g, c, c - 6, 0.82, false); g.fill(); g.restore();   // หน้าฟักทองกลางวง
    const gl = g.createRadialGradient(c, c, 0, c, c, 250); gl.addColorStop(0, 'rgba(255,255,255,0.25)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, s, s);
  });
  // รอยแยกพื้นเรืองไฟ
  const crackTex = () => ctex('hw_crack', 512, 512, (g, s) => {
    const c = s / 2; seed = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    const crack = (x, y, a, len, w, d) => { if (d > 3) return; let px = x, py = y; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); const n = 6; for (let i = 0; i < n; i++) { a += (rnd() - 0.5) * 0.7; px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; g.lineTo(px, py); if (rnd() < 0.3) crack(px, py, a + (rnd() < 0.5 ? -1 : 1) * 0.9, len * 0.45, w * 0.6, d + 1); } g.stroke(); };
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.shadowColor = '#fff'; g.shadowBlur = 14;
    for (let i = 0; i < 9; i++) crack(c + Math.cos(i / 9 * TAU) * 40, c + Math.sin(i / 9 * TAU) * 40, i / 9 * TAU, 200, 7, 0);
    g.strokeStyle = '#fff'; g.shadowBlur = 4; seed = 5;
    for (let i = 0; i < 9; i++) crack(c + Math.cos(i / 9 * TAU) * 40, c + Math.sin(i / 9 * TAU) * 40, i / 9 * TAU, 200, 3, 0);
  });
  const ringFireTex = () => ctex('hw_fire', 512, 512, (g, s) => {   // วงไฟผี (เปลวหยัก)
    const c = s / 2; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 64; i++) { const a = i / 64 * TAU, h = 40 + (i * 37 % 23) * 2.2; const gr = g.createLinearGradient(c + Math.cos(a) * 170, c + Math.sin(a) * 170, c + Math.cos(a) * (170 + h), c + Math.sin(a) * (170 + h)); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gr; g.lineWidth = 14; g.beginPath(); g.moveTo(c + Math.cos(a) * 168, c + Math.sin(a) * 168); g.lineTo(c + Math.cos(a + 0.03) * (170 + h), c + Math.sin(a + 0.03) * (170 + h)); g.stroke(); }
    const rg = g.createRadialGradient(c, c, 150, c, c, 200); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.3, 'rgba(255,255,255,0.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s);
  });

  // เปลวไฟผี (หยดน้ำตาคว่ำ ขาว ย้อมสี)
  const flameTex = () => ctex('hw_flame', 96, 192, (g) => {
    const gr = g.createRadialGradient(48, 150, 4, 48, 130, 80); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(48, 6); g.bezierCurveTo(70, 60, 92, 110, 84, 146); g.bezierCurveTo(78, 182, 18, 182, 12, 146); g.bezierCurveTo(4, 110, 26, 60, 48, 6); g.fill();
    const core = g.createRadialGradient(48, 152, 2, 48, 148, 26); core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = core; g.fillRect(0, 110, 96, 82);
  });
  // ใยแมงมุม (ขาว ย้อมสี) วางบนพื้น
  const webTex = () => ctex('hw_web', 512, 512, (g, s) => {
    const c = s / 2; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
    const n = 12; for (let i = 0; i < n; i++) { const a = i / n * TAU; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * 250, c + Math.sin(a) * 250); g.stroke(); }
    for (let r = 40; r < 250; r += 30) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, a2 = (i - 0.5) / n * TAU; const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; if (!i) g.moveTo(x, y); else g.quadraticCurveTo(c + Math.cos(a2) * r * 0.86, c + Math.sin(a2) * r * 0.86, x, y); } g.stroke(); }
  });
  // เทียนลอย
  const candleTex = () => ctex('hw_candle', 64, 128, (g) => {
    const w = g.createLinearGradient(20, 0, 44, 0); w.addColorStop(0, '#d8ccb0'); w.addColorStop(0.5, '#fff6e0'); w.addColorStop(1, '#bfb090'); g.fillStyle = w;
    g.beginPath(); g.moveTo(20, 60); g.lineTo(44, 60); g.lineTo(44, 124); g.lineTo(20, 124); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(26, 66, 4, 9, 0, 0, TAU); g.ellipse(39, 72, 3, 12, 0, 0, TAU); g.fill();   // น้ำตาเทียน
    g.fillStyle = '#2a1a10'; g.fillRect(31, 50, 2, 10);
    const f = g.createRadialGradient(32, 40, 0, 32, 40, 22); f.addColorStop(0, '#fffbe0'); f.addColorStop(0.35, '#ffc040'); f.addColorStop(1, 'rgba(255,120,20,0)'); g.fillStyle = f; g.beginPath(); g.ellipse(32, 38, 12, 22, 0, 0, TAU); g.fill();
  });
  // กะโหลกไฟผีเขียว
  const skullTex = () => ctex('hw_skull', 128, 160, (g) => {
    const fl = g.createRadialGradient(64, 70, 10, 64, 50, 70); fl.addColorStop(0, 'rgba(160,255,120,0.9)'); fl.addColorStop(1, 'rgba(60,200,80,0)'); g.fillStyle = fl;
    g.beginPath(); g.moveTo(64, 0); g.bezierCurveTo(100, 30, 118, 70, 104, 110); g.lineTo(24, 110); g.bezierCurveTo(10, 70, 28, 30, 64, 0); g.fill();
    g.fillStyle = '#f2ecd8'; g.beginPath(); g.arc(64, 96, 34, Math.PI * 0.9, Math.PI * 0.1); g.lineTo(88, 130); g.lineTo(40, 130); g.closePath(); g.fill();
    g.fillRect(46, 126, 36, 16);
    g.fillStyle = '#0a1a0a'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(64 + d * 14, 100, 9, 11, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#7aff6a'; for (const d of [-1, 1]) { g.beginPath(); g.arc(64 + d * 14, 101, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = '#0a1a0a'; g.beginPath(); g.moveTo(64, 108); g.lineTo(59, 118); g.lineTo(69, 118); g.closePath(); g.fill();
    for (let i = 0; i < 4; i++) g.fillRect(50 + i * 8, 130, 3, 10);
  });
  const KW = 2.45, KH = KW * 340 / 320;   // ขนาดราชันย์ฟักทอง (หน่วยโลก)
  const K_CY = -0.54;                     // ยกภาพขึ้นเหนือศีรษะ (center.y ติดลบ)

  return {
    hwPumpking(rig, p, rt) {
      const G = stage(rig, rt);
      /* --- พื้น --- */
      const dark = flat(G, 4.8, unlit('#12061a', { map: TX.softDot(), opacity: 0.6 }), 0.018); dark.material.depthWrite = false;
      const crack = flat(G, 4.6, unlit(ORANGE, { map: crackTex(), opacity: 0.55, add: true }), 0.024);
      const circle = flat(G, 4.2, unlit(ORANGE, { map: witchCircleTex(), opacity: 0.75, add: true }), 0.03);
      const circle2 = flat(G, 2.6, unlit(PURPLE, { map: TX.runeCircle('hex'), opacity: 0.5, add: true }), 0.034);
      const rim = flat(G, 4.6, unlit(PURPLE, { map: TX.softRing(), opacity: 0.45, add: true }), 0.026);
      const fireRing = flat(G, 1, unlit(ORANGE2, { map: ringFireTex(), opacity: 0, add: true }), 0.04, 3);
      // หลุมศพ 4 หลักรอบวง (หันหาจอเสมอ)
      const tombs = [0.35, 1.4, 2.45, 3.5, 4.55, 5.6].map((a, i) => { const s = deep(sprite(tombTex(), '#ffffff', 0.56, 0.72, 1, false), 37); s.center.set(0.5, 0.06); s.position.set(Math.cos(a) * 1.95, 0.02, Math.sin(a) * 1.95); G.add(s); const f = deep(sprite(TX.softDot(), ORANGE2, 0.4, 0.4, 0.7), 38); f.position.copy(s.position); f.center.set(0.1, 0.25); G.add(f); return { s, f, ph: i * 1.7 }; });
      /* --- หลังตัว: พระจันทร์ + หมอกม่วง --- */
      const mist = deep(sprite(TX.softDot(), '#6a2aaa', 4.6, 4.2, 0.5), 30); mist.position.y = CY + 0.3; G.add(mist);
      const moon = deep(sprite(moonTex(), '#ffffff', 3.9, 3.9, 0.95, false), 31); moon.position.y = CY; G.add(moon);
      const moonGlow = deep(sprite(TX.softDot(), '#ffc870', 5.0, 5.0, 0.32), 32); moonGlow.position.y = CY; G.add(moonGlow);
      const moonBats = Array.from({ length: 3 }, (_, i) => { const s = deep(sprite(batTex(true), '#ffffff', 0.32, 0.2, 0.95, false), 33); s.position.y = CY; G.add(s); return { s, ph: i * 0.33, sp: 0.09 + i * 0.03, y: 0.25 + i * 0.12 }; });
      /* --- ราชันย์ฟักทองเหนือศีรษะ --- */
      const kTex = [kingTex(false), kingTex(true)], gTex = [kingGlowTex(false), kingGlowTex(true)];
      const kAura = deep(sprite(TX.softDot(), '#ff8a2a', 3.2, 3.2, 0.4), 42); G.add(kAura);
      const king = deep(sprite(kTex[0], '#ffffff', KW, KH, 1, false), 44); G.add(king);
      const kGlow = deep(sprite(gTex[0], '#ffd25a', KW, KH, 0.9), 45); G.add(kGlow);
      const kFlame = deep(sprite(TX.softDot(), '#ffb03a', 1.2, 1.0, 0.0), 46); G.add(kFlame);   // ไฟพ่นจากปากตอนคำราม
      const lift = (spr, vFrame, cy) => { const off = (vFrame - cy) * KH; spr.center.set(0.5, 0.5 - off / spr.scale.y); };
      /* --- ฟักทองจิ๋วโคจร · ค้างคาว · ผี --- */
      const minis = Array.from({ length: 5 }, (_, i) => { const s = deep(sprite(miniTex(), '#ffffff', 0.52, 0.52, 1, false), 39); const gl = deep(sprite(TX.softDot(), ORANGE2, 0.7, 0.7, 0.55), 38); G.add(gl, s); return { s, gl, ph: i / 5 * TAU }; });
      const bt = [batTex(true), batTex(false)];
      const bats = Array.from({ length: 14 }, (_, i) => { const s = deep(sprite(bt[i % 2], '#ffffff', 0.5, 0.31, 1, false), 40); G.add(s); return { s, ph: i / 14 * TAU, r: 1.2 + (i % 3) * 0.3, y: 0.6 + (i * 0.37 % 1) * 1.4, sp: 0.9 + (i % 4) * 0.18, fl: i * 0.07, scat: 0 }; });
      const ghosts = Array.from({ length: 6 }, (_, i) => { const s = deep(sprite(ghostTex(), '#ffffff', 0.58, 0.72, 0.85, false), 39); const gl = deep(sprite(TX.softDot(), '#b8c8ff', 1.0, 1.0, 0.35), 38); G.add(gl, s); return { s, gl, ph: i / 6, a: i / 6 * TAU, fast: 0 }; });
      /* --- v2: คบไฟผี 6 ต้น · เทียนลอย 8 เล่ม · กะโหลกไฟเขียว 3 หัว · ใยแมงมุมบนพื้น --- */
      const web = flat(G, 4.4, unlit('#c8b8ff', { map: webTex(), opacity: 0.22, add: true }), 0.028);
      const torches = Array.from({ length: 6 }, (_, i) => { const a = i / 6 * TAU + 0.18, x = Math.cos(a) * 2.25, z = Math.sin(a) * 2.25;
        const f1 = deep(sprite(flameTex(), i % 2 ? GREEN : ORANGE, 0.42, 0.84, 0.9), 41); f1.center.set(0.5, 0.05); f1.position.set(x, 0.02, z);
        const f2 = deep(sprite(flameTex(), '#ffffff', 0.22, 0.44, 0.9), 42); f2.center.set(0.5, 0.05); f2.position.set(x, 0.02, z);
        const gl = deep(sprite(TX.softDot(), i % 2 ? GREEN : ORANGE, 0.9, 0.9, 0.4), 36); gl.position.set(x, 0.05, z);
        G.add(gl, f1, f2); return { f1, f2, gl, ph: i * 1.3 }; });
      const candles = Array.from({ length: 8 }, (_, i) => { const s = deep(sprite(candleTex(), '#ffffff', 0.18, 0.36, 1, false), 40); const gl = deep(sprite(TX.softDot(), ORANGE2, 0.4, 0.4, 0.5), 41); G.add(s, gl); return { s, gl, ph: i / 8 * TAU }; });
      const skulls = Array.from({ length: 3 }, (_, i) => { const s = deep(sprite(skullTex(), '#ffffff', 0.42, 0.52, 0.95, false), 40); const gl = deep(sprite(TX.softDot(), GREEN, 0.8, 0.8, 0.35), 39); G.add(gl, s); return { s, gl, ph: i / 3 * TAU }; });
      auraEmitter(rig, rt, 8, (b) => { const sk = skulls[(Math.random() * 3) | 0].s.position, sc = rig.root.scale.y; rt.ps('flame').emit({ pos: V(b.x + sk.x * sc, b.y + sk.y * sc, b.z + sk.z * sc), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.3, 0.6), rand(-0.1, 0.1)), life: [0.4, 0.7], size: [0.1, 0.16], sizeEnd: 0.1, color: [GREEN, '#c8ffb0'] }); });
      /* --- คำราม --- */
      const flash = flashSprite(rig, rt, '#ffb050', { y: CY + 0.3, size: 4.4 }), wave = shockwaves(rig, rt, ORANGE, { n: 4, r1: 4.4 });
      const roar = { t: -1, hit: false };
      burstCycle(rt, 4.6, () => { roar.t = 0; roar.hit = false; }, 0.6);
      /* --- อนุภาค --- */
      auraEmitter(rig, rt, 26, (b) => { const sc = rig.root.scale.y, a = rand(0, TAU), r = rand(0.5, 2.0) * sc; rt.ps('flame').emit({ pos: V(b.x + Math.cos(a) * r, b.y + 0.05, b.z + Math.sin(a) * r), count: 1, vel: () => V(rand(-0.1, 0.1), rand(0.5, 1.1), rand(-0.1, 0.1)), life: [0.7, 1.2], size: [0.08, 0.15], sizeEnd: 0.2, color: [ORANGE, ORANGE2, '#ff5a1a', PURPLE] }); });
      auraEmitter(rig, rt, 11, (b) => { const sc = rig.root.scale.y, a = rand(0, TAU), r = rand(0.8, 2.1) * sc; rt.ps('smoke', NB).emit({ pos: V(b.x + Math.cos(a) * r, b.y + 0.1, b.z + Math.sin(a) * r), count: 1, vel: () => V(rand(-0.2, 0.2), rand(0.05, 0.15), rand(-0.2, 0.2)), life: [1.4, 2.2], size: [0.3, 0.45], sizeEnd: 2, color: ['#3a1a5a', '#2a1440', '#1a3a2a'], alpha: 0.45 }); });
      auraEmitter(rig, rt, 12, (b) => { const sc = rig.root.scale.y, a = rand(0, TAU), r = rand(0.3, 1.6) * sc; rt.ps('star').emit({ pos: V(b.x + Math.cos(a) * r, b.y + rand(0.3, 1.8) * sc, b.z + Math.sin(a) * r), count: 1, speed: 0.05, life: [0.5, 0.9], size: [0.07, 0.13], color: [ORANGE2, '#ffffff', GREEN, '#d8a8ff'] }); });
      let kick = 0;
      rt.on(({ t, dt }) => {
        const sc = rig.root.scale.x || 1;
        // ราชันย์ลอยโยก
        const bob = Math.sin(t * 1.5) * 0.06, sway = Math.sin(t * 0.8) * 0.07;
        let open = 0;
        if (roar.t >= 0) {
          roar.t += dt; const T = roar.t;
          open = T < 0.25 ? T / 0.25 : T < 1.0 ? 1 : T < 1.3 ? 1 - (T - 1.0) / 0.3 : 0;
          if (!roar.hit && T > 0.22) {
            roar.hit = true; kick = 1; flash(); wave(); setTimeout(() => wave({ color: PURPLE, r1: 2.6 }), 140);
            fireRing.userData.t = 0;
            const b = rt.worldPos(rig.root);
            scatter(rt, 'flame', V(b.x, b.y + 0.15 * sc, b.z), 46, { color: [ORANGE, ORANGE2, '#ff4a1a', GREEN], speed: [2.4, 4.4], up: [0.1, 0.9], gravity: -0.6, drag: 1.3, life: [0.6, 1.1], size: [0.14, 0.26] });
            scatter(rt, 'flame', V(b.x, b.y + (CY + 1.3) * sc, b.z), 26, { color: [ORANGE2, '#fff0b0', ORANGE], speed: [1.2, 2.6], up: [0.4, 1.8], gravity: 1.2, drag: 1.2, life: [0.6, 1.0], size: [0.12, 0.22] });
            scatter(rt, 'smoke', V(b.x, b.y + 0.2 * sc, b.z), 16, { blend: NB, color: ['#2a1440', '#3a1a5a'], speed: [1, 2], up: [0, 0.4], gravity: 0, drag: 2, life: [0.9, 1.4], size: [0.35, 0.55], sizeEnd: 1.8, alpha: 0.55 });
            scatter(rt, 'star', V(b.x, b.y + (CY + 1.4) * sc, b.z), 40, { color: ['#ff8a1a', '#ffe14a', '#ffffff', '#b84aff', '#7aff6a', '#ff5ab0'], speed: [1.8, 3.6], up: [1.0, 2.6], gravity: 2.4, drag: 0.8, life: [0.9, 1.5], size: [0.12, 0.22] });   // ขนมลูกกวาดระเบิดจากปากฟักทอง
            for (const B of bats) B.scat = 1;
            for (const Gh of ghosts) Gh.fast = 1;
          }
          if (T > 1.4) roar.t = -1;
        }
        const fi = open > 0.4 ? 1 : 0;
        if (king.material.map !== kTex[fi]) { king.material.map = kTex[fi]; kGlow.material.map = gTex[fi]; }
        const kcy = K_CY - bob / KH;
        for (const s of [king, kGlow]) { s.position.set(0, CY, 0); s.center.set(0.5, kcy); s.material.rotation = sway * 0.6; }
        kAura.position.y = CY; lift(kAura, 0.42, kcy); kAura.material.opacity = 0.32 + 0.1 * Math.sin(t * 2.2) + kick * 0.5;
        // เทียนในฟักทองกะพริบ
        const flick = 0.75 + 0.15 * Math.sin(t * 17) + 0.1 * Math.sin(t * 29.7) + open * 0.4;
        kGlow.material.opacity = Math.min(1.3, flick);
        kFlame.position.y = CY; lift(kFlame, 0.2, kcy); kFlame.material.opacity = open * (0.7 + 0.3 * Math.sin(t * 40)); kFlame.scale.set(1.0 + open * 0.8, 0.8 + open * 0.6, 1);
        // พระจันทร์ + ค้างคาวบินตัดผ่าน
        lift(moon, 0.5, kcy); lift(moonGlow, 0.5, kcy);
        moon.material.rotation = Math.sin(t * 0.2) * 0.03; moonGlow.material.opacity = 0.3 + 0.08 * Math.sin(t * 1.3) + kick * 0.3;
        mist.material.opacity = 0.4 + 0.08 * Math.sin(t * 0.9);
        for (const M of moonBats) { const q = (t * M.sp + M.ph) % 1; M.s.center.set(0.5 + (0.5 - q) * 9, moon.center.y * moon.scale.y / M.s.scale.y + (0.5 - 0.5 * moon.scale.y / M.s.scale.y) - (M.y - 0.35) * 4 + Math.sin(q * 18) * 0.25); M.s.material.map = bt[Math.floor(t * 9 + M.ph * 10) % 2]; M.s.material.opacity = Math.sin(q * Math.PI) * 0.95; }
        // ฟักทองจิ๋วโคจรรอบเอว
        for (const m of minis) { const a = m.ph + t * 0.9, y = CY - 0.25 + Math.sin(t * 2.2 + m.ph) * 0.1; m.s.position.set(Math.cos(a) * 1.05, y, Math.sin(a) * 1.05); m.gl.position.copy(m.s.position); m.s.material.rotation = Math.sin(t * 2 + m.ph) * 0.2; m.gl.material.opacity = 0.45 + 0.15 * Math.sin(t * 13 + m.ph * 5); }
        // ค้างคาวบินวน (แตกฮือตอนคำราม)
        for (const B of bats) {
          B.scat = Math.max(0, B.scat - dt * 0.7);
          const a = B.ph + t * B.sp * (1 + B.scat * 1.5), r = B.r * (1 + B.scat * 0.9), y = B.y + Math.sin(t * 2.6 + B.ph * 3) * 0.12 + B.scat * 0.5;
          B.s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
          B.s.material.map = bt[Math.floor(t * (10 + B.scat * 8) + B.fl * 10) % 2];
          B.s.scale.set(0.5 * (1 + B.scat * 0.2), 0.31 * (1 + B.scat * 0.2), 1);
        }
        // ผีลอยวนขึ้นเป็นเกลียว (เร่งพุ่งตอนคำราม)
        for (const Gh of ghosts) {
          Gh.fast = Math.max(0, Gh.fast - dt * 0.8);
          Gh.ph = (Gh.ph + dt * (0.16 + Gh.fast * 0.5)) % 1;
          const q = Gh.ph, a = Gh.a + q * 7 + t * 0.4, r = 1.5 - q * 0.8;
          Gh.s.position.set(Math.cos(a) * r, 0.3 + q * 2.4, Math.sin(a) * r); Gh.gl.position.copy(Gh.s.position);
          const o = Math.sin(q * Math.PI); Gh.s.material.opacity = o * 0.85; Gh.gl.material.opacity = o * 0.35; Gh.s.material.rotation = Math.sin(t * 3 + Gh.a) * 0.25;
        }
        // หลุมศพ: เทียนกะพริบ
        for (const T of tombs) T.f.material.opacity = 0.5 + 0.2 * Math.sin(t * 15 + T.ph) + 0.1 * Math.sin(t * 23 + T.ph);
        // วงไฟผีแผ่ออกตอนคำราม
        if (fireRing.userData.t !== undefined && fireRing.userData.t >= 0) {
          fireRing.userData.t += dt; const k = fireRing.userData.t / 0.9;
          if (k >= 1) { fireRing.userData.t = -1; fireRing.material.opacity = 0; }
          else { fireRing.scale.setScalar(0.8 + k * 5.0); fireRing.material.opacity = (1 - k) * 0.95; fireRing.rotation.z = k * 0.6; }
        }
        for (const T of torches) { const f = 0.85 + 0.15 * Math.sin(t * 13 + T.ph) + 0.1 * Math.sin(t * 21 + T.ph) + kick * 0.6; T.f1.scale.set(0.42 * f, 0.84 * f * (1 + kick * 0.8), 1); T.f2.scale.set(0.22 * f, 0.44 * f, 1); T.gl.material.opacity = 0.35 + 0.15 * f + kick * 0.3; T.f1.material.rotation = Math.sin(t * 5 + T.ph) * 0.08; }
        for (const C of candles) { const a = C.ph - t * 0.45, y = CY + 0.7 + Math.sin(t * 1.7 + C.ph * 2) * 0.12; C.s.position.set(Math.cos(a) * 1.35, y, Math.sin(a) * 1.35); C.gl.position.copy(C.s.position); C.gl.center.set(0.5, 0.15); C.gl.material.opacity = 0.45 + 0.15 * Math.sin(t * 17 + C.ph * 4); }
        for (const K of skulls) { const a = K.ph + t * 1.3, y = CY + 0.1 + Math.sin(t * 2.4 + K.ph) * 0.25; K.s.position.set(Math.cos(a) * 1.6, y, Math.sin(a) * 1.6); K.gl.position.copy(K.s.position); K.s.material.rotation = Math.sin(t * 3 + K.ph) * 0.15; K.gl.material.opacity = 0.3 + 0.15 * Math.sin(t * 9 + K.ph) + kick * 0.4; }
        web.rotation.z = -t * 0.05; web.material.opacity = 0.18 + kick * 0.2;
        kick = Math.max(0, kick - dt * 1.4);
        circle.rotation.z = t * 0.22; circle2.rotation.z = -t * 0.5;
        circle.material.opacity = 0.65 + 0.1 * Math.sin(t * 2) + kick * 0.35; circle2.material.opacity = 0.45 + kick * 0.4;
        crack.material.opacity = 0.4 + 0.15 * Math.sin(t * 3.1) + kick * 0.5; rim.material.opacity = 0.4 + kick * 0.5;
      });
    },
  };
}
