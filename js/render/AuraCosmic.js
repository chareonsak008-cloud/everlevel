// v0.84 ออร่าคอสมิก (ร้านเพชร): ทางช้างเผือก · ม่านเนบิวลา · หลุมดำ · ระบบสุริยะ · เทพกลุ่มดาว
// หลักการจัดวาง (สมดุลกลางตัว):
//   ทุกชิ้นสมมาตรรอบแกนลำตัว · จุดศูนย์กลางพลังอยู่กลางลำตัว (CY) · ชั้นทั้งหมดอยู่ในกลุ่มที่ "ไม่หมุนตามทิศที่ตัวละครหัน"
//   → หันซ้าย/ขวา/หลัง ออร่าก็ยังอยู่กึ่งกลางตัวเท่าเดิม ลายบนพื้นไม่สะบัดตาม
// รับตัวช่วยจาก Costumes.js ผ่าน H (แบบเดียวกับ wuxiaAura)
import { THREE } from './three.js?v=0.93.0-p2.18';

const TAU = Math.PI * 2;
const CY = 1.05;   // กลางลำตัวตัวละครพิกเซล (พิกัดของโครงออร่า)

export function cosmicAuras(H) {
  const { mesh, unlit, ctex, shockwaves, flashSprite, burstCycle, scatter, implode, auraEmitter, NB, V, rand, lin, TX } = H;
  const ADD = THREE.AdditiveBlending;
  // กลุ่มหลักของออร่า: หักล้างการหมุนของตัวละคร (ทิศคงที่ตามโลก)
  const stage = (rig, rt) => {
    const G = new THREE.Group(); rig.root.add(G);
    rt.on(() => { G.rotation.y = -rig.root.rotation.y; });
    return G;
  };
  const flat = (G, size, mat, y, order = 2) => { const m = mesh(new THREE.PlaneGeometry(size, size), mat, G, 0, y, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }); m.renderOrder = order; return m; };
  const deep = (o, order = 46) => { o.userData.auraDepth = true; o.renderOrder = order; o.frustumCulled = false; return o; };
  const sprite = (map, color, scale, op = 1, add = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: lin(color), transparent: true, opacity: op, blending: add ? ADD : THREE.NormalBlending, depthWrite: false })); s.scale.setScalar(scale); return s; };
  // ชิ้นโปร่งที่มี map จะคงเป็น 3 มิติในระบบตัวละครพิกเซล (ไม่ถูกแปลงเป็นสีเรียบ) → วงแหวนทุกวงใช้ map ขาวนี้
  const WHITE = ctex('cs_white', 4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); });
  // ชิ้นที่อยู่หลังตัวละครเสมอ (บนแกนลำตัว วาดก่อนตัวละคร)
  const behind = (G, s, y, order = 35) => { s.position.set(0, y, 0); deep(s, order); G.add(s); return s; };

  /* ---------- เท็กซ์เจอร์อวกาศ (วาดสีจริง) ---------- */
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dot = (g, x, y, r, c, a = 1) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; };
  // หน้าต่างอวกาศบนพื้น: ฟ้าดำน้ำเงินมีเนบิวลาและดาว ขอบจางกลืนพื้น
  const spaceTex = (key, tints) => ctex('cs_space' + key, 512, 512, (g, s) => {
    seed = 11; const c = s / 2;
    const bg = g.createRadialGradient(c, c, 0, c, c, c); bg.addColorStop(0, 'rgba(10,8,34,1)'); bg.addColorStop(0.72, 'rgba(14,10,46,0.95)'); bg.addColorStop(1, 'rgba(14,10,46,0)'); g.fillStyle = bg; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) { const a = rnd() * TAU, d = rnd() * c * 0.6; dot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, c * (0.15 + rnd() * 0.22), tints[i % tints.length], 0.22); }
    for (let i = 0; i < 420; i++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * c * 0.88, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, b = rnd(); g.fillStyle = b > 0.93 ? '#ffffff' : b > 0.6 ? '#cfd8ff' : '#8a90c8'; g.fillRect(x, y, b > 0.93 ? 3 : 2, b > 0.93 ? 3 : 2); if (b > 0.97) dot(g, x, y, 10, '#ffffff', 0.7); }
  });
  // กาแล็กซีกังหัน: แขนก้นหอยสองแขน เม็ดดาวหลากสี แกนกลางสว่าง
  const galaxyTex = () => ctex('cs_galaxy', 512, 512, (g, s) => {
    seed = 23; const c = s / 2; g.globalCompositeOperation = 'lighter';
    dot(g, c, c, c * 0.32, 'rgba(255,230,250,1)', 0.9); dot(g, c, c, c * 0.12, '#ffffff', 1);
    const cols = ['#ff8ad8', '#9ab8ff', '#c08aff', '#ffffff', '#7ae8ff'];
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 1400; i++) {
      const u = rnd(), r = c * (0.08 + u * 0.86), a = arm * Math.PI + u * 3.6 * Math.PI + (rnd() - 0.5) * (0.5 - u * 0.25), j = (rnd() - 0.5) * c * 0.07 * (1 + u);
      const x = c + Math.cos(a) * r + j, y = c + Math.sin(a) * r + j;
      if (i % 9 === 0) dot(g, x, y, 14 + rnd() * 18, cols[(i / 9 | 0) % 3], 0.18);
      g.fillStyle = cols[(rnd() * cols.length) | 0]; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(x, y, 2, 2); g.globalAlpha = 1;
    }
  });
  // ก้อนเนบิวลา (ขาว ย้อมสีทีหลัง) แบบปุยหลายก้อนซ้อน
  const cloudTex = (k) => ctex('cs_cloud' + k, 256, 256, (g, s) => {
    seed = 31 + k * 7; const c = s / 2;
    for (let i = 0; i < 14; i++) { const a = rnd() * TAU, d = rnd() * c * 0.45; dot(g, c + Math.cos(a) * d, c + Math.sin(a) * d, c * (0.25 + rnd() * 0.3), 'rgba(255,255,255,1)', 0.35); }
    for (let i = 0; i < 30; i++) { const x = c + (rnd() - 0.5) * c, y = c + (rnd() - 0.5) * c; g.fillStyle = '#ffffff'; g.fillRect(x, y, 2, 2); }
  });
  // จานพอกพูนของหลุมดำ: ขาวร้อนด้านใน → ส้ม → ม่วงด้านนอก มีริ้วหมุน
  const accretionTex = () => ctex('cs_accretion', 512, 512, (g, s) => {
    seed = 41; const c = s / 2;
    const gr = g.createRadialGradient(c, c, c * 0.3, c, c, c); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.08, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,190,90,0.95)'); gr.addColorStop(0.55, 'rgba(255,90,60,0.7)'); gr.addColorStop(0.8, 'rgba(150,60,220,0.45)'); gr.addColorStop(1, 'rgba(60,20,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 2;
    for (let i = 0; i < 120; i++) { const r = c * (0.34 + rnd() * 0.6), a0 = rnd() * TAU, len = 0.4 + rnd() * 0.9; g.strokeStyle = `rgba(255,${180 + (rnd() * 70) | 0},${120 + (rnd() * 100) | 0},${0.25 + rnd() * 0.3})`; g.beginPath(); g.arc(c, c, r, a0, a0 + len); g.stroke(); }
  });
  // วงโคจรบนพื้น (วงกลมซ้อน + ขีดบอกมุม)
  const orbitTex = () => ctex('cs_orbits', 512, 512, (g, s) => {
    const c = s / 2; g.strokeStyle = '#fff';
    for (const [r, w] of [[0.96, 5], [0.8, 2], [0.62, 2], [0.44, 2], [0.26, 3]]) { g.lineWidth = w; g.beginPath(); g.arc(c, c, c * r, 0, TAU); g.stroke(); }
    for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; g.lineWidth = i % 4 ? 1.5 : 3; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9); g.lineTo(c + Math.cos(a) * c * 0.96, c + Math.sin(a) * c * 0.96); g.stroke(); }
  });
  // ร่างกลุ่มดาวเทพผู้พิทักษ์ (สมมาตรซ้ายขวา): ปีกดาว + รัศมี + เส้นเชื่อม
  const guardianTex = () => ctex('cs_guardian', 512, 512, (g, s) => {
    const c = s / 2, P = [];
    const node = (x, y) => { P.push([x, y]); };
    for (const sx of [-1, 1]) {
      node(c + sx * 40, 250); node(c + sx * 110, 180); node(c + sx * 190, 120); node(c + sx * 235, 170); node(c + sx * 215, 250); node(c + sx * 160, 300); node(c + sx * 90, 330);
      node(c + sx * 170, 200); node(c + sx * 130, 260);
    }
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 3; g.lineJoin = 'round';
    for (const off of [0, 9]) { g.beginPath(); for (let i = 0; i < 7; i++) { const [x, y] = P[off + i]; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.beginPath(); g.moveTo(...P[off + 1]); g.lineTo(...P[off + 7]); g.lineTo(...P[off + 4]); g.moveTo(...P[off + 7]); g.lineTo(...P[off + 8]); g.lineTo(...P[off + 5]); g.stroke(); }
    g.beginPath(); g.moveTo(...P[0]); g.lineTo(...P[9]); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.arc(c, 140, 70, 0, TAU); g.stroke();   // รัศมีเหนือศีรษะ
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; node(c + Math.cos(a) * 70, 140 + Math.sin(a) * 70); }
    for (const [x, y] of P) { dot(g, x, y, 16, 'rgba(255,255,255,1)', 0.8); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  });

  // ฐานร่วม: หน้าต่างอวกาศบนพื้น + ขอบแสง (กึ่งกลางเท้าพอดี)
  function spaceFloor(G, size, tints, rim) {
    const sp = flat(G, size, unlit('#ffffff', { map: spaceTex(tints.join(), tints), opacity: 0.92 }), 0.022); sp.material.depthWrite = false;
    const ring = flat(G, size * 1.02, unlit(rim, { map: TX.softRing(), opacity: 0.7, add: true }), 0.026);
    return { sp, ring };
  }
  // ฉากหลังจักรวาลหลังตัว: วงฟ้าดาวสีเข้ม (ผสมปกติ) กึ่งกลางเหนือกลางลำตัวเล็กน้อย → แสงสีต่าง ๆ เด่นบนพื้นสว่าง
  const backdrop = (G, key, tints, size, y = CY + 0.35, op = 0.8) => behind(G, sprite(spaceTex(key, tints), '#ffffff', size, op, false), y, 31);
  // เสาแสงบาง (หลังตัวละคร) สำหรับไคลแมกซ์
  const beamTex = () => ctex('cs_beam', 64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.5, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gx; g.fillRect(0, 0, w, h); });
  function beam(G, rt, color, { w = 0.9, h = 5.5, dur = 0.9, down = false } = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamTex(), color: lin(color), transparent: true, opacity: 0, blending: ADD, depthWrite: false })); s.center.set(0.5, 0); s.position.y = down ? 0 : 0.1; deep(s, 35); G.add(s); s.visible = false;
    const u = { t: -1 };
    rt.on(({ dt }) => { if (u.t < 0) return; u.t += dt; const k = u.t / dur; if (k >= 1) { u.t = -1; s.visible = false; return; } s.scale.set(w * (1 - k * 0.6), h * Math.min(1, k / 0.12), 1); s.material.opacity = 0.85 * (k < 0.3 ? 1 : 1 - (k - 0.3) / 0.7); });
    return () => { u.t = 0; s.visible = true; };
  }
  const centerPos = (rt, rig, y = CY) => { const b = rt.worldPos(rig.root); return V(b.x, b.y + y * rig.root.scale.y, b.z); };

  return {
    /* ===== 1 · ทางช้างเผือกหมุนวน: กาแล็กซีกังหันหมุนใต้เท้าบนหน้าต่างอวกาศ ดาวลอยเป็นเกลียวตามแขนกาแล็กซี วงดาวโคจรรอบเอว แกนดาราเรืองกลางอก · ไคลแมกซ์ซูเปอร์โนวากลางตัว ===== */
    cosGalaxy(rig, p, rt) {
      const G = stage(rig, rt), pink = '#ff8ad8', blue = '#8ab8ff';
      const F = spaceFloor(G, 3.2, ['#ff6ac8', '#6a8aff', '#a86aff'], '#c08aff');
      const gal = flat(G, 3.0, unlit('#ffffff', { map: galaxyTex(), opacity: 0.95, add: true }), 0.03);
      const bd = backdrop(G, 'galb', ['#ff6ac8', '#6a8aff', '#a86aff'], 2.7);
      const vgal = behind(G, sprite(galaxyTex(), '#ffffff', 2.5, 0.95), CY + 0.35, 32);   // กาแล็กซีตั้งหลังตัว (รัศมีจักรวาล)
      const core = behind(G, sprite(TX.softDot(), '#ffd0f0', 1.7, 0.5), CY), coreStar = behind(G, sprite(TX.star4(), '#ffffff', 1.1, 0.8), CY, 36);
      const ringStars = Array.from({ length: 14 }, (_, i) => { const s = deep(sprite(TX.star4(), i % 2 ? pink : blue, 0.22, 1)); G.add(s); return s; });
      const ringGlow = deep(mesh(new THREE.TorusGeometry(0.88, 0.035, 6, 96), unlit(blue, { map: WHITE, opacity: 0.45, add: true }), G, 0, CY - 0.2, 0, { r: [Math.PI / 2, 0, 0], keep: true, shadow: false }));
      const fire = beam(G, rt, '#e8c8ff'), flash = flashSprite(rig, rt, '#ffe8ff', { y: CY, size: 3.4 }), wave = shockwaves(rig, rt, pink, { n: 3, r1: 3.2 });
      let kick = 0;
      const cyc = burstCycle(rt, 3.4, () => {
        kick = 1; fire(); flash(); wave(); setTimeout(() => wave({ color: blue, r1: 2.4 }), 140);
        const P = centerPos(rt, rig);
        scatter(rt, 'star', P, 40, { color: ['#ffffff', pink, blue, '#c08aff'], speed: [2.2, 4.4], up: [-1, 1.8], gravity: 0, drag: 1.4, life: [0.9, 1.4], size: [0.14, 0.26] });
        scatter(rt, 'dot', P, 36, { color: ['#ffffff', '#ffd0f0'], speed: [3, 5], up: [-1, 1.4], gravity: 0, drag: 1.6, life: [0.6, 1], size: [0.08, 0.14] });
      }, 0.3);
      let charged = false;
      auraEmitter(rig, rt, 34, (b, c) => {   // ดาวลอยเป็นเกลียวตามแขนกาแล็กซี
        const arm = Math.random() < 0.5 ? 0 : Math.PI, u = Math.random(), a = arm + u * 3 + c.t * 0.6, r = 1.25 * (1 - u * 0.75), sc = rig.root.scale.x;
        rt.ps('star').emit({ pos: V(b.x + Math.cos(a) * r * sc, b.y + 0.05, b.z + Math.sin(a) * r * sc), count: 1, vel: () => V(-Math.sin(a) * 0.5, rand(0.7, 1.4), Math.cos(a) * 0.5), drag: 0.3, life: [0.9, 1.4], size: [0.08, 0.15], color: ['#ffffff', pink, blue, '#c08aff'] });
      });
      rt.on(({ t, dt }) => {
        kick = Math.max(0, kick - dt * 1.4);
        const k = cyc.k;
        if (k > 0.8 && !charged) { charged = true; implode(rt, 'dot', rt.worldPos(rig.root), 34, { y: CY * rig.root.scale.y, color: ['#ffffff', pink], size: [0.08, 0.13] }); }
        if (k < 0.5) charged = false;
        gal.rotation.z = t * 0.4; gal.material.opacity = 0.85 + kick * 0.15; gal.scale.setScalar(1 + kick * 0.12);
        vgal.material.rotation = -t * 0.35; vgal.scale.setScalar(2.5 + kick * 0.5); bd.scale.setScalar(2.7 + kick * 0.4);
        F.ring.material.opacity = 0.55 + 0.2 * Math.sin(t * 2) + kick * 0.3;
        core.scale.setScalar(1.6 + 0.15 * Math.sin(t * 2.5) + (k > 0.8 ? (k - 0.8) * 3 : 0) + kick); core.material.opacity = 0.4 + kick * 0.5; coreStar.material.rotation = t * 0.8;
        ringStars.forEach((s, i) => { const a = (i / ringStars.length) * TAU + t * 0.9, R = 0.88 * (1 + kick * 0.5); s.position.set(Math.cos(a) * R, CY - 0.2 + Math.sin(t * 2 + i) * 0.06, Math.sin(a) * R); s.scale.setScalar(0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 4 + i * 2))); s.material.rotation = t * 2 + i; });
        ringGlow.scale.setScalar(1 + kick * 0.5); ringGlow.material.opacity = 0.35 + kick * 0.5;
      });
    },

    /* ===== 2 · ม่านเนบิวลา: ก้อนเนบิวลาชมพู-ฟ้า-ม่วงหมุนวนเป็นเสารอบตัว ดาวระยิบในหมอกจักรวาล ฝุ่นดาวลอยขึ้น · ไคลแมกซ์หมอกพองออก ดาวระเบิด ===== */
    cosNebula(rig, p, rt) {
      const G = stage(rig, rt), cols = ['#ff5ac8', '#5ac8ff', '#a85aff', '#ff8a6a'];
      const F = spaceFloor(G, 3.2, ['#ff5ac8', '#5ac8ff', '#a85aff'], '#7a8aff');
      const neb = flat(G, 2.8, unlit('#ffffff', { map: spaceTex('neb2', ['#ff3ab8', '#3ab8ff', '#8a3aff', '#ff8a3a']), opacity: 0.5, add: true }), 0.03);
      const bd = backdrop(G, 'nebb', ['#ff3ab8', '#3ab8ff', '#8a3aff', '#ff8a3a'], 2.8, CY + 0.3, 0.85);
      // ก้อนเนบิวลา: สีทึบโปร่ง (ผสมปกติ) + ไฮไลต์เรืองแสง → เห็นชัดทั้งพื้นสว่างและมืด
      const clouds = Array.from({ length: 12 }, (_, i) => { const s = deep(sprite(cloudTex(i % 4), cols[i % 4], 1.0, 0.5, false)), h = deep(sprite(cloudTex((i + 1) % 4), cols[(i + 1) % 4], 0.7, 0.45)); G.add(s, h); return { s, h, a: (i / 12) * TAU, y: 0.25 + (i % 6) * 0.38, r: 0.75 + (i % 3) * 0.12, sp: 0.35 + (i % 4) * 0.08 }; });
      const twinkles = Array.from({ length: 18 }, (_, i) => { const s = deep(sprite(TX.star4(), '#ffffff', 0.2, 1)); G.add(s); return { s, a: rand(0, TAU), y: rand(0.2, 2.3), r: rand(0.45, 1.05), ph: rand(0, TAU) }; });
      const core = behind(G, sprite(TX.softDot(), '#c8a0ff', 1.9, 0.35), CY);
      const flash = flashSprite(rig, rt, '#f0d8ff', { y: CY, size: 3.4 }), wave = shockwaves(rig, rt, '#c08aff', { n: 3, r1: 3.2 });
      let kick = 0;
      burstCycle(rt, 3.2, () => {
        kick = 1; flash(); wave(); setTimeout(() => wave({ color: '#5ac8ff', r1: 2.4 }), 130); setTimeout(() => wave({ color: '#ff5ac8', r1: 1.8 }), 260);
        const P = centerPos(rt, rig);
        scatter(rt, 'star', P, 40, { color: ['#ffffff', ...cols], speed: [2, 4], up: [-1, 2], gravity: 0, drag: 1.3, life: [0.9, 1.4], size: [0.14, 0.26] });
        scatter(rt, 'smoke', P, 18, { blend: ADD, color: cols, speed: [1.6, 3], up: [-0.6, 1.2], gravity: 0, drag: 1.6, life: [0.9, 1.3], size: [0.5, 0.7], sizeEnd: 2, alpha: 0.35 });
      }, 0.3);
      auraEmitter(rig, rt, 20, (b) => { const a = rand(0, TAU), r = rand(0.2, 1.2) * rig.root.scale.x; rt.ps('dot').emit({ pos: V(b.x + Math.cos(a) * r, b.y + 0.05, b.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(0.5, 1.1), 0), life: [1, 1.6], size: [0.05, 0.1], color: ['#ffffff', ...cols] }); });
      rt.on(({ t, dt }) => {
        kick = Math.max(0, kick - dt * 1.2);
        for (const C of clouds) { const a = C.a + t * C.sp, R = C.r * (1 + kick * 0.7); C.s.position.set(Math.cos(a) * R, C.y + Math.sin(t + C.a) * 0.08, Math.sin(a) * R); C.h.position.copy(C.s.position); C.s.material.rotation = t * 0.3 + C.a; C.h.material.rotation = -t * 0.4 + C.a; const sc = 0.95 + 0.15 * Math.sin(t * 1.5 + C.a) + kick * 0.5; C.s.scale.setScalar(sc); C.h.scale.setScalar(sc * 0.7); C.s.material.opacity = 0.42 * (1 - kick * 0.5); }
        bd.scale.setScalar(2.8 + kick * 0.6);
        for (const T of twinkles) { const a = T.a + t * 0.5; T.s.position.set(Math.cos(a) * T.r, T.y, Math.sin(a) * T.r); T.s.scale.setScalar(0.08 + 0.16 * Math.max(0, Math.sin(t * 3 + T.ph))); T.s.material.rotation = t + T.ph; }
        neb.rotation.z = -t * 0.15; core.material.opacity = 0.3 + kick * 0.5; F.ring.material.opacity = 0.55 + kick * 0.35;
      });
    },

    /* ===== 3 · หลุมดำมหาบรรลัย: จานพอกพูนร้อนแรงหมุนรอบเอว หลุมดำลอยเหนือศีรษะ อนุภาคถูกดูดเป็นเกลียว เลนส์แสงบนพื้น · ไคลแมกซ์ดูดกลืนแล้วพ่นลำแสงขึ้นฟ้า ===== */
    cosBlackhole(rig, p, rt) {
      const G = stage(rig, rt), hot = '#ffb05a', purple = '#a85aff';
      const F = spaceFloor(G, 3.2, ['#6a2aff', '#ff6a3a'], hot);
      const horizon = flat(G, 1.25, unlit('#000000', { map: TX.softDot(), opacity: 0.85 }), 0.028); horizon.material.depthWrite = false;
      const lens = flat(G, 1.7, unlit(hot, { map: TX.softRing(), opacity: 0.8, add: true }), 0.032);
      const disk = deep(mesh(new THREE.PlaneGeometry(2.3, 2.3), unlit('#ffffff', { map: accretionTex(), opacity: 0.95, add: true }), G, 0, CY - 0.35, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }));
      disk.material.side = THREE.DoubleSide;
      const disk2 = deep(mesh(new THREE.PlaneGeometry(1.7, 1.7), unlit('#ffffff', { map: accretionTex(), opacity: 0.6, add: true }), G, 0, CY - 0.35, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }));
      disk2.material.side = THREE.DoubleSide;
      // หลุมดำเหนือศีรษะ: แกนดำ + วงแสงเลนส์
      const top = CY + 1.45;
      const hBack = behind(G, sprite(spaceTex('bhb', ['#6a2aff', '#ff6a3a']), '#ffffff', 1.9, 0.85, false), top, 33);
      const hGlow = behind(G, sprite(TX.softDot(), purple, 1.9, 0.6), top), hRing = behind(G, sprite(TX.softRing(), hot, 1.3, 1), top, 36), hCore = behind(G, sprite(TX.softDot(), '#000000', 0.9, 1, false), top, 37);
      const hDisk = behind(G, sprite(accretionTex(), '#ffffff', 1.7, 0.95), top, 36); hDisk.scale.set(1.7, 0.5, 1);   // จานพอกพูนมองเฉียงของหลุมดำ
      const fire = beam(G, rt, '#ffd8a0', { w: 0.7, h: 6 }), flash = flashSprite(rig, rt, '#ffe8c8', { y: CY, size: 3.2 }), wave = shockwaves(rig, rt, hot, { n: 3, r1: 3.2 });
      let kick = 0, charged = false;
      const cyc = burstCycle(rt, 3.4, () => {
        kick = 1; fire(); flash(); wave(); setTimeout(() => wave({ color: purple, r1: 2.4 }), 140);
        const P = centerPos(rt, rig);
        scatter(rt, 'spark', P, 34, { color: ['#ffffff', hot, '#ff6a3a'], speed: [2.6, 4.8], up: [-0.4, 0.6], gravity: 0, drag: 1.2, life: [0.6, 1], size: [0.16, 0.28] });
        scatter(rt, 'smoke', P, 14, { blend: NB, color: ['#1a0a2a', '#2a0a3a'], speed: [1.6, 3], up: [-0.3, 0.8], gravity: 0, drag: 1.6, life: [0.8, 1.2], size: [0.45, 0.6], sizeEnd: 2, alpha: 0.6 });
      }, 0.3);
      auraEmitter(rig, rt, 40, (b) => {   // อนุภาคถูกดูดเข้าจานเป็นเกลียว
        const a = rand(0, TAU), r = rand(1.2, 1.6) * rig.root.scale.x, y = b.y + (CY - 0.35 + rand(-0.15, 0.15)) * rig.root.scale.y, life = rand(0.7, 1.1);
        const P = V(b.x + Math.cos(a) * r, y, b.z + Math.sin(a) * r), inward = V(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(r * 0.8 / life), swirl = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(1.4);
        rt.ps('dot').emit({ pos: P, count: 1, vel: () => inward.clone().add(swirl), life: [life, life], size: [0.06, 0.11], sizeEnd: 0.4, color: ['#ffffff', hot, purple] });
      });
      rt.on(({ t, dt }) => {
        kick = Math.max(0, kick - dt * 1.3);
        const k = cyc.k;
        if (k > 0.78 && !charged) { charged = true; implode(rt, 'dot', rt.worldPos(rig.root), 40, { y: CY * rig.root.scale.y, r: [1.2, 1.8], color: ['#ffffff', hot, purple], size: [0.08, 0.14] }); }
        if (k < 0.5) charged = false;
        const squeeze = k > 0.78 ? 1 - (k - 0.78) * 2 : 1;
        disk.rotation.z = t * 1.6; disk2.rotation.z = -t * 2.4; disk.scale.setScalar(squeeze * (1 + kick * 0.35)); disk2.scale.setScalar(squeeze * (1 + kick * 0.25));
        disk.material.opacity = 0.8 + kick * 0.2;
        hRing.material.rotation = t * 2; hRing.scale.setScalar(1.3 + 0.08 * Math.sin(t * 4) + kick * 0.6); hGlow.material.opacity = 0.5 + kick * 0.4;
        hDisk.material.rotation = Math.sin(t * 0.5) * 0.06; hDisk.scale.set(1.7 * (1 + kick * 0.3), 0.5 * (1 + kick * 0.3), 1); hBack.material.rotation = t * 0.2;
        lens.rotation.z = t * 0.5; lens.material.opacity = 0.6 + 0.2 * Math.sin(t * 3) + kick * 0.3; F.sp.rotation.z = t * 0.08;
      });
    },

    /* ===== 4 · ระบบสุริยะ: ดวงอาทิตย์แผ่รัศมีหลังตัว ดาวเคราะห์ห้าดวงโคจรรอบตัวบนวงโคจรเรือง แถบดาวเคราะห์น้อย วงโคจรบนพื้น · ไคลแมกซ์ดาวเรียงตัว เปลวสุริยะ ===== */
    cosSolar(rig, p, rt) {
      const G = stage(rig, rt), sun = '#ffb84a';
      const F = spaceFloor(G, 3.2, ['#ff8a3a', '#3a6aff'], sun);
      const orbitFloor = flat(G, 3.0, unlit('#ffd890', { map: orbitTex(), opacity: 0.55, add: true }), 0.03);
      // ดวงอาทิตย์หลังตัว: จานทึบไล่สีส้ม-ทอง (ผสมปกติ เห็นชัดบนพื้นสว่าง) + โคโรนาเรืองแสง
      const sunTex = ctex('cs_sun', 256, 256, (g, s) => { const c = s / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.35, '#ffc84a'); gr.addColorStop(0.62, '#ff7a1a'); gr.addColorStop(0.75, 'rgba(220,60,20,0.85)'); gr.addColorStop(1, 'rgba(200,40,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
      const sunDisk = behind(G, sprite(sunTex, '#ffffff', 2.0, 0.95, false), CY + 0.3, 32);
      const corona = behind(G, sprite(TX.runeCircle('star'), sun, 3.0, 0.6), CY + 0.3, 34), sunGlow = behind(G, sprite(TX.softDot(), '#ff8a2a', 2.8, 0.55), CY + 0.3, 33), sunCore = behind(G, sprite(TX.softDot(), '#fff0c0', 1.1, 0.9), CY + 0.3, 36);
      const P = [[0.62, 0.11, '#c8b8a8', 1.6], [0.82, 0.14, '#ffc87a', 1.2], [1.02, 0.15, '#5aa8ff', 0.95], [1.22, 0.12, '#ff6a4a', 0.75], [1.45, 0.2, '#e8c890', 0.5]].map(([R, size, col, sp], i) => {
        const orbit = deep(mesh(new THREE.TorusGeometry(R, 0.008, 4, 128), unlit(col, { map: WHITE, opacity: 0.55, add: true }), G, 0, CY - 0.25, 0, { r: [Math.PI / 2, 0, 0], keep: true, shadow: false }));
        const body = deep(sprite(TX.softDot(), col, size * 2.6, 1, false)), glowS = deep(sprite(TX.softDot(), col, size * 4, 0.5));
        G.add(glowS, body);
        let ring = null; if (i === 4) { ring = deep(sprite(TX.softRing(), '#f0d8a8', size * 4.2, 0.9)); ring.scale.set(size * 4.2, size * 1.4, 1); G.add(ring); }
        return { R, sp, body, glowS, ring, orbit, a: i * 1.3 };
      });
      const fire = beam(G, rt, '#ffd890'), flash = flashSprite(rig, rt, '#fff2c8', { y: CY, size: 3.6 }), wave = shockwaves(rig, rt, sun, { n: 3, r1: 3.2 });
      let kick = 0;
      const cyc = burstCycle(rt, 3.6, () => {
        kick = 1; fire(); flash(); wave(); setTimeout(() => wave({ color: '#ff6a2a', r1: 2.4 }), 140);
        const C = centerPos(rt, rig, CY + 0.1);
        scatter(rt, 'flame', C, 34, { color: ['#fff0c0', sun, '#ff6a2a'], colorEnd: '#c8281a', speed: [2.2, 4], up: [-0.6, 1.6], gravity: 0, drag: 1.4, life: [0.6, 1], size: [0.26, 0.42], sizeEnd: 0.2 });
        scatter(rt, 'spark', C, 24, { color: ['#ffffff', sun], speed: [2.6, 4.6], up: [-0.6, 1.6], size: [0.14, 0.24] });
      }, 0.3);
      auraEmitter(rig, rt, 30, (b, c) => {   // แถบดาวเคราะห์น้อย
        const a = rand(0, TAU), R = rand(1.3, 1.6) * rig.root.scale.x, y = b.y + (CY - 0.25 + rand(-0.05, 0.05)) * rig.root.scale.y;
        rt.ps('dot').emit({ pos: V(b.x + Math.cos(a) * R, y, b.z + Math.sin(a) * R), count: 1, vel: () => V(-Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6), life: [0.8, 1.2], size: [0.04, 0.07], color: ['#c8b8a8', '#e8d8c8', '#ffffff'] });
      });
      auraEmitter(rig, rt, 12, (b) => rt.ps('flame').emit({ pos: V(b.x, b.y + (CY + 0.1) * rig.root.scale.y, b.z), count: 1, speed: [0.5, 1], life: [0.4, 0.7], size: [0.2, 0.32], sizeEnd: 0.2, color: [sun, '#ff8a2a'], colorEnd: '#c8281a' }));
      rt.on(({ t, dt }) => {
        kick = Math.max(0, kick - dt * 1.3);
        const k = cyc.k, align = k > 0.8 ? (k - 0.8) / 0.2 : k < 0.12 ? 1 - k / 0.12 : 0;
        for (const Q of P) {
          Q.a += dt * Q.sp * (1 - align * 0.8);
          const a = Q.a * (1 - align) + (Q.a > 0 ? Math.round(Q.a / Math.PI) * Math.PI : 0) * align;   // เรียงตัวบนเส้นเดียวกันช่วงไคลแมกซ์
          const x = Math.cos(a) * Q.R * (1 + kick * 0.25), z = Math.sin(a) * Q.R * (1 + kick * 0.25), y = CY - 0.25;
          Q.body.position.set(x, y, z); Q.glowS.position.set(x, y, z); if (Q.ring) Q.ring.position.set(x, y, z);
          Q.orbit.scale.setScalar(1 + kick * 0.25); Q.orbit.material.opacity = 0.4 + kick * 0.4;
        }
        corona.material.rotation = t * 0.25; corona.scale.setScalar(3.0 + 0.15 * Math.sin(t * 2) + kick * 1.4); corona.material.opacity = 0.5 + kick * 0.5;
        sunGlow.scale.setScalar(2.7 + 0.2 * Math.sin(t * 3)); sunDisk.scale.setScalar(2.0 + 0.05 * Math.sin(t * 2.4) + kick * 0.4); orbitFloor.rotation.z = t * 0.05; F.ring.material.opacity = 0.5 + kick * 0.4;
      });
    },

    /* ===== 5 · เทพกลุ่มดาว: ร่างกลุ่มดาวปีกเทพผู้พิทักษ์ขนาดใหญ่ส่องแสงหลังตัว วงดาวเหนือศีรษะ ฝุ่นดาวลอยขึ้น · ไคลแมกซ์เส้นดาวสว่างวาบ ฝนดาวตกรอบตัว ===== */
    cosGuardian(rig, p, rt) {
      const G = stage(rig, rt), cyan = '#8ae8ff', gold = '#ffe08a';
      const F = spaceFloor(G, 3.2, ['#3a6aff', '#3affd8', '#8a5aff'], cyan);
      const chart = flat(G, 2.9, unlit(cyan, { map: TX.runeCircle('star'), opacity: 0.6, add: true }), 0.03);
      const bd = backdrop(G, 'guab', ['#3a6aff', '#3affd8', '#8a5aff'], 3.3, CY + 0.55, 0.85);
      const figGlow = behind(G, sprite(guardianTex(), '#3a8aff', 3.6, 0.55), CY + 0.55, 33), fig = behind(G, sprite(guardianTex(), '#e8fbff', 3.4, 0.95), CY + 0.55, 34);
      const aura = behind(G, sprite(TX.softDot(), '#3a6aff', 2.6, 0.35), CY + 0.3, 32);
      const halo = Array.from({ length: 10 }, (_, i) => { const s = deep(sprite(TX.star4(), i % 2 ? gold : '#ffffff', 0.22, 1)); G.add(s); return s; });
      const fire = beam(G, rt, cyan), flash = flashSprite(rig, rt, '#e8fbff', { y: CY + 0.4, size: 3.6 }), wave = shockwaves(rig, rt, cyan, { n: 3, r1: 3.2 });
      let kick = 0, rain = 0;
      burstCycle(rt, 3.4, () => {
        kick = 1; rain = 1.2; fire(); flash(); wave(); setTimeout(() => wave({ color: gold, r1: 2.4 }), 140);
        scatter(rt, 'star', centerPos(rt, rig, CY + 0.5), 36, { color: ['#ffffff', cyan, gold], speed: [2, 4], up: [-0.6, 2], gravity: 0, drag: 1.3, life: [0.9, 1.4], size: [0.14, 0.26] });
      }, 0.3);
      auraEmitter(rig, rt, 18, (b) => { const a = rand(0, TAU), r = rand(0.3, 1.3) * rig.root.scale.x; rt.ps('star').emit({ pos: V(b.x + Math.cos(a) * r, b.y + 0.05, b.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(0.6, 1.2), 0), life: [1, 1.5], size: [0.07, 0.13], color: ['#ffffff', cyan, gold] }); });
      rt.on(({ t, dt }) => {
        kick = Math.max(0, kick - dt * 1.3);
        if (rain > 0) {   // ฝนดาวตกรอบตัว (สมมาตรรอบวง)
          rain -= dt; const b = rt.worldPos(rig.root), sc = rig.root.scale.x;
          for (let n = 0; n < 3; n++) { const a = rand(0, TAU), r = rand(0.5, 1.5) * sc; rt.ps('spark').emit({ pos: V(b.x + Math.cos(a) * r + 0.6, b.y + 3.4, b.z + Math.sin(a) * r), count: 1, vel: () => V(-1.2, -6, 0), life: [0.45, 0.6], size: [0.12, 0.2], sizeEnd: 0.4, color: ['#ffffff', cyan, gold] }); }
        }
        fig.material.opacity = 0.75 + 0.2 * Math.sin(t * 2) + kick * 0.25; figGlow.material.opacity = 0.4 + kick * 0.5; fig.scale.setScalar(3.4 + kick * 0.4); figGlow.scale.setScalar(3.6 + kick * 0.6);
        halo.forEach((s, i) => { const a = (i / halo.length) * TAU + t * 0.7; s.position.set(Math.cos(a) * 0.42, CY + 1.4, Math.sin(a) * 0.42); s.scale.setScalar(0.14 + 0.1 * (0.5 + 0.5 * Math.sin(t * 4 + i))); s.material.rotation = t * 2 + i; });
        chart.rotation.z = t * 0.15; aura.material.opacity = 0.3 + kick * 0.3; F.ring.material.opacity = 0.5 + kick * 0.4; bd.scale.setScalar(3.3 + kick * 0.4);
      });
    },
  };
}
