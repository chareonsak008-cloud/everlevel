// v0.94 ออร่ายมทูตเคียวมรณะ (ร้านเพชร) — ยมทูตคลุมผ้าขาดรุ่งริ่งลอยอยู่เหนือศีรษะ ถือเคียวยักษ์ใบเรืองวิญญาณ
// · ยมทูต: ฮู้ดดำ หน้ากะโหลกในเงามืด ตาเรืองเขียววิญญาณ มือกระดูกกำด้ามเคียว · ชายผ้าขาดปลิวเป็นควันดำ
// · ดวงวิญญาณ 3 ดวงโคจรรอบเอว · วงอักขระมรณะบนพื้น · หมอกวิญญาณลอยต่ำ
// · ทุก ~4.2 วิ: ยมทูตง้างเคียว → ฟาดลงเป็นวงพระจันทร์เสี้ยวรอบตัว คลื่นวิญญาณบนพื้น ดวงวิญญาณถูกดูดขึ้นไปหาเคียว
// ภาพทั้งหมดวาดขึ้นใหม่ด้วยโค้ด (ไม่ใช้ภาพจากที่อื่น) · ใช้ตัวช่วยชุดเดียวกับออร่าคอสมิก (ส่งมาจาก Costumes.js)
import { THREE } from './three.js?v=0.93.0-p1.3';

const TAU = Math.PI * 2;
const CY = 1.05;          // กลางลำตัวตัวละครพิกเซล
// ระบบตัวละครพิกเซลจัดชิ้น 3 มิติที่ลอยเหนือพื้นให้แนบแผ่นตัวละคร (ความสูงตำแหน่ง y ถูกบีบ) → วางจุดยึดที่กลางลำตัว
// แล้วยกภาพยมทูตขึ้นเหนือศีรษะด้วย sprite.center (เลื่อนบนจอ) — ใช้ได้ตรงทุกระยะกล้อง
const RY = CY;
const FIG_H = 2.1, FIG_W = FIG_H * 0.8;
const FIG_CY = -0.5;      // center.y ของเฟรมยมทูต (ค่าลบ = ยกภาพขึ้นเหนือจุดยึด)
const SOUL = '#5affc8', SOUL2 = '#9af0ff', BONE = '#ece6d6';

export function reaperAuras(H) {
  const { mesh, unlit, ctex, shockwaves, flashSprite, burstCycle, scatter, implode, auraEmitter, NB, V, rand, lin, TX } = H;
  const ADD = THREE.AdditiveBlending;
  const stage = (rig, rt) => { const G = new THREE.Group(); rig.root.add(G); rt.on(() => { G.rotation.y = -rig.root.rotation.y; }); return G; };
  const flat = (G, size, mat, y, order = 2) => { const m = mesh(new THREE.PlaneGeometry(size, size), mat, G, 0, y, 0, { r: [-Math.PI / 2, 0, 0], keep: true, shadow: false }); m.renderOrder = order; return m; };
  const deep = (o, order = 46) => { o.userData.auraDepth = true; o.renderOrder = order; o.frustumCulled = false; return o; };
  const sprite = (map, color, sx, sy = sx, op = 1, add = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: lin(color), transparent: true, opacity: op, blending: add ? ADD : THREE.NormalBlending, depthWrite: false })); s.scale.set(sx, sy, 1); return s; };

  /* ---------- เท็กซ์เจอร์ ---------- */
  // ร่างยมทูต 256×320: ฮู้ดแหลม เสื้อคลุมบานลงล่างชายขาด แขนเสื้อขวายื่นออก มือกระดูกกำ (ด้ามเคียวลอดหลังมือ)
  const figTex = () => ctex('rp_fig', 256, 320, (g) => {
    const cloak = g.createLinearGradient(0, 20, 0, 310); cloak.addColorStop(0, '#2c2638'); cloak.addColorStop(0.55, '#1a1624'); cloak.addColorStop(1, '#0d0b14');
    // ชายผ้าขาดรุ่งริ่ง (ซิกแซกไม่สม่ำเสมอ)
    g.fillStyle = cloak; g.beginPath(); g.moveTo(128, 18);
    g.bezierCurveTo(170, 30, 182, 70, 176, 104);   // ไหล่ขวา
    g.bezierCurveTo(196, 150, 214, 220, 222, 268);
    const hem = [[222, 268], [208, 300], [196, 276], [182, 312], [168, 282], [152, 306], [138, 284], [124, 314], [110, 286], [94, 308], [82, 280], [66, 304], [54, 274], [40, 296], [34, 264]];
    for (const [x, y] of hem) g.lineTo(x, y);
    g.bezierCurveTo(42, 210, 60, 150, 80, 104); g.bezierCurveTo(74, 70, 86, 30, 128, 18); g.closePath(); g.fill();
    // เส้นพับผ้า
    g.strokeStyle = 'rgba(120,108,150,0.35)'; g.lineWidth = 3;
    for (const [x0, x1] of [[100, 84], [128, 124], [152, 168], [116, 96]]) { g.beginPath(); g.moveTo(x0, 130); g.quadraticCurveTo((x0 + x1) / 2 + 8, 210, x1, 290); g.stroke(); }
    // ขอบผ้าเรืองวิญญาณจาง ๆ
    g.strokeStyle = 'rgba(90,255,200,0.35)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(222, 268); for (const [x, y] of hem) g.lineTo(x, y); g.stroke();
    // แขนเสื้อขวา (ยื่นไปจับเคียว)
    g.fillStyle = '#221d2e'; g.beginPath(); g.moveTo(168, 112); g.quadraticCurveTo(206, 128, 214, 162); g.lineTo(194, 176); g.quadraticCurveTo(184, 150, 160, 146); g.closePath(); g.fill();
    // ฮู้ด: ช่องหน้ามืดสนิท
    g.fillStyle = '#060509'; g.beginPath(); g.moveTo(128, 46); g.bezierCurveTo(156, 52, 160, 96, 150, 118); g.quadraticCurveTo(128, 132, 106, 118); g.bezierCurveTo(96, 96, 100, 52, 128, 46); g.fill();
    // ขอบฮู้ดสว่าง
    g.strokeStyle = 'rgba(160,150,190,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(106, 118); g.bezierCurveTo(96, 96, 100, 52, 128, 46); g.bezierCurveTo(156, 52, 160, 96, 150, 118); g.stroke();
    // กะโหลกในเงา (เห็นครึ่งล่าง)
    const sk = g.createRadialGradient(128, 92, 4, 128, 96, 26); sk.addColorStop(0, 'rgba(236,230,214,0.95)'); sk.addColorStop(0.7, 'rgba(180,170,160,0.6)'); sk.addColorStop(1, 'rgba(60,56,70,0)');
    g.fillStyle = sk; g.beginPath(); g.ellipse(128, 96, 20, 24, 0, 0, TAU); g.fill();
    g.fillStyle = '#060509'; for (const x of [119, 137]) { g.beginPath(); g.ellipse(x, 90, 6, 7, 0, 0, TAU); g.fill(); }   // เบ้าตา
    g.beginPath(); g.moveTo(128, 98); g.lineTo(124, 106); g.lineTo(132, 106); g.closePath(); g.fill();   // จมูก
    g.fillStyle = 'rgba(236,230,214,0.85)'; for (let i = 0; i < 6; i++) g.fillRect(117 + i * 4, 110, 3, 6);   // ฟัน
    // ตาเรือง
    for (const x of [119, 137]) { const e = g.createRadialGradient(x, 90, 0, x, 90, 9); e.addColorStop(0, '#eafff6'); e.addColorStop(0.4, SOUL); e.addColorStop(1, 'rgba(90,255,200,0)'); g.fillStyle = e; g.fillRect(x - 9, 81, 18, 18); }
    // มือกระดูกกำด้าม (วาดทับด้าม)
    g.fillStyle = BONE; g.strokeStyle = '#6a6458'; g.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect ? g.roundRect(190, 150 + i * 7, 22, 5, 2.5) : g.rect(190, 150 + i * 7, 22, 5); g.fill(); g.stroke(); }
    g.beginPath(); g.ellipse(196, 146, 7, 5, -0.5, 0, TAU); g.fill(); g.stroke();   // นิ้วโป้ง
  });
  // เคียว 256×320: ด้ามไม้ดำพันผ้า ใบเคียวโค้งไปทางซ้าย ขอบคมเรืองวิญญาณ · จุดหมุน (มือ) ที่ (200,166)
  const GRIP = [200, 166];
  const scytheTex = () => ctex('rp_scythe', 256, 320, (g) => {
    // ด้าม
    g.lineCap = 'round'; g.strokeStyle = '#2a2018'; g.lineWidth = 11; g.beginPath(); g.moveTo(212, 312); g.lineTo(190, 34); g.stroke();
    g.strokeStyle = '#8a6a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(209, 312); g.lineTo(187, 36); g.stroke();
    g.strokeStyle = '#6a5a7a'; g.lineWidth = 2; for (let y = 200; y < 300; y += 12) { g.beginPath(); g.moveTo(198, y); g.lineTo(214, y + 6); g.stroke(); }   // ผ้าพัน
    // คอเคียว (ปลอกโลหะ + กะโหลกเล็ก)
    g.fillStyle = '#5a5a6a'; g.fillRect(180, 34, 22, 14);
    g.fillStyle = BONE; g.beginPath(); g.arc(191, 58, 8, 0, TAU); g.fill(); g.fillStyle = '#060509'; g.fillRect(186, 55, 3, 3); g.fillRect(193, 55, 3, 3);
    // ใบเคียว
    const bl = g.createLinearGradient(30, 30, 190, 120); bl.addColorStop(0, '#cfe8e4'); bl.addColorStop(0.5, '#7a8a94'); bl.addColorStop(1, '#3a4250');
    g.fillStyle = bl; g.beginPath(); g.moveTo(186, 36);
    g.bezierCurveTo(120, 0, 40, 6, 6, 112);        // สันใบด้านบน
    g.bezierCurveTo(52, 62, 118, 58, 184, 62);     // คมด้านล่าง
    g.closePath(); g.fill();
    // คมเรือง
    g.strokeStyle = SOUL; g.lineWidth = 3; g.shadowColor = SOUL; g.shadowBlur = 12; g.beginPath(); g.moveTo(6, 112); g.bezierCurveTo(52, 62, 118, 58, 184, 62); g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(186, 36); g.bezierCurveTo(120, 0, 40, 6, 6, 112); g.stroke(); g.shadowBlur = 0;
    // อักขระสลักบนใบ
    g.fillStyle = 'rgba(90,255,200,0.75)'; for (let i = 0; i < 5; i++) { const t = 0.2 + i * 0.14, x = 186 - t * 150, y = 40 - Math.sin(t * Math.PI) * 10; g.fillRect(x, y, 4, 4); }
  });
  // คมเคียวฟาด: พระจันทร์เสี้ยวกว้าง (ขาว ย้อมสีทีหลัง)
  const slashTex = () => ctex('rp_slash', 512, 512, (g, s) => {
    const c = s / 2; g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) { const k = i / 25; g.strokeStyle = `rgba(255,255,255,${0.06 + 0.5 * Math.sin(k * Math.PI)})`; g.lineWidth = 3 + 20 * Math.sin(k * Math.PI); g.beginPath(); g.arc(c, c, c * (0.62 + k * 0.3), Math.PI * 0.95 - k * 0.2, Math.PI * 2.05 + k * 0.1); g.stroke(); }
  });
  // เฟรมรวม "ยมทูต + เคียว" ตามมุมเคียว (วาดล่วงหน้า) — เคียวหมุนรอบมือจริง ๆ ในภาพ ไม่ต้องจัดตำแหน่งชิ้นแยกในระบบตัวละครพิกเซล
  // กรอบ 448×448: ร่างยมทูตวางที่ (96, 64) · จุดกำ = (96+196, 64+162) · เคียวขยาย 1.2 เท่า
  const NF = 12, FS = 448, OX = 96, OY = 64, A0 = -0.97, A1 = 1.53;
  const ANG = Array.from({ length: NF }, (_, i) => A0 + (i / (NF - 1)) * (A1 - A0));
  const frameTex = (i) => ctex('rp_frame' + i, FS, FS, (g) => {
    const fig = figTex().image, sc = scytheTex().image;
    g.save(); g.translate(OX + 196, OY + 162); g.rotate(ANG[i]); g.scale(1.2, 1.2); g.drawImage(sc, -GRIP[0], -GRIP[1]); g.restore();
    g.drawImage(fig, OX, OY);
    g.drawImage(fig, 182, 140, 40, 44, OX + 182, OY + 140, 40, 44);   // มือกระดูกทับด้ามอีกครั้ง (กำอยู่ทุกมุม)
  });
  const FR = FIG_W / 256 * FS;   // ขนาดสไปรต์เฟรม (หน่วยโลก) — กึ่งกลางกรอบ = กึ่งกลางร่าง

  return {
    /* ===== ยมทูตเคียวมรณะ ===== */
    reaper(rig, p, rt) {
      const G = stage(rig, rt);
      // พื้น: วงมืด + วงอักขระวิญญาณ 2 ชั้นหมุนสวน
      const dark = flat(G, 2.8, unlit('#0a0612', { map: TX.softDot(), opacity: 0.55 }), 0.02); dark.material.depthWrite = false;
      const rune = flat(G, 2.6, unlit(SOUL, { map: TX.runeCircle('star'), opacity: 0.6, add: true }), 0.03);
      const rune2 = flat(G, 1.7, unlit(SOUL2, { map: TX.runeCircle('hex'), opacity: 0.45, add: true }), 0.034);
      const rim = flat(G, 2.9, unlit(SOUL, { map: TX.softRing(), opacity: 0.5, add: true }), 0.026);
      // ยมทูตเหนือศีรษะ
      const glow = deep(sprite(TX.softDot(), '#1affa0', 2.1, 2.1, 0.35), 40); G.add(glow);
      const shade = deep(sprite(TX.softDot(), '#000000', 1.6, 1.8, 0.45, false), 41); G.add(shade);
      const frames = ANG.map((_, i) => frameTex(i));
      const fig = deep(sprite(frames[2], '#ffffff', FR, FR, 1, false), 44); G.add(fig);
      const edge = deep(sprite(frames[2], SOUL, FR, FR, 0, true), 45); G.add(edge);   // แสงวิญญาณวาบทั้งร่างตอนฟาด
      // เลื่อนสไปรต์ให้จุด v ของเฟรม (0 = ล่าง) อยู่ตรงจุดยึด: center.y = v_frame_rel → สำหรับสไปรต์ขนาดอื่นแปลงสเกล
      // วางสไปรต์อื่นให้กึ่งกลางตรงจุด v (0 = ล่าง) ของเฟรมยมทูต
      const lift = (spr, vFrame, cy) => { const off = (vFrame - cy) * FR; spr.center.set(0.5, 0.5 - off / spr.scale.y); };
      fig.center.set(0.5, FIG_CY); edge.center.set(0.5, FIG_CY);
      // ดวงวิญญาณโคจร
      const souls = Array.from({ length: 3 }, (_, i) => { const s = deep(sprite(TX.softDot(), i === 1 ? SOUL2 : SOUL, 0.32, 0.32, 0.9), 38); const c = deep(sprite(TX.star4(), '#ffffff', 0.12, 0.12, 0.9), 39); G.add(s, c); return { s, c, ph: (i / 3) * TAU, pull: 0 }; });
      // ฟาดเคียว: เสี้ยวจันทร์รอบตัว
      const slash = deep(sprite(slashTex(), SOUL, 3.4, 3.4, 0), 37); slash.position.y = CY + 0.2; slash.visible = false; G.add(slash);
      const slash2 = deep(sprite(slashTex(), '#ffffff', 3.0, 3.0, 0), 37); slash2.position.y = CY + 0.2; slash2.visible = false; G.add(slash2);
      const flash = flashSprite(rig, rt, '#c8fff0', { y: CY + 0.3, size: 3.0 }), wave = shockwaves(rig, rt, SOUL, { n: 3, r1: 3.0 });
      // ระยะของท่า: 0 = นิ่ง · ง้าง 0.45 วิ · ฟาด 0.16 วิ · ค้าง 0.25 · คืน 0.6
      const sw = { t: -1 };
      burstCycle(rt, 4.2, () => { sw.t = 0; }, 0.4);
      // ชายผ้าเป็นควันดำ + ประกายวิญญาณลอยจากชายผ้า
      auraEmitter(rig, rt, 10, (b) => { const sc = rig.root.scale.y; rt.ps('smoke', NB).emit({ pos: V(b.x + rand(-0.3, 0.3) * sc, b.y + (CY + 1.7) * sc, b.z + rand(-0.2, 0.2) * sc), count: 1, vel: () => V(rand(-0.15, 0.15), rand(-0.35, -0.15), rand(-0.1, 0.1)), life: [0.9, 1.4], size: [0.16, 0.24], sizeEnd: 1.8, color: ['#120e1a', '#1c1628'], alpha: 0.7 }); });
      auraEmitter(rig, rt, 9, (b) => { const sc = rig.root.scale.y, a = rand(0, TAU), r = rand(0.4, 1.2) * sc; rt.ps('flame').emit({ pos: V(b.x + Math.cos(a) * r, b.y + 0.05, b.z + Math.sin(a) * r), count: 1, vel: () => V(0, rand(0.5, 1.0), 0), life: [0.8, 1.2], size: [0.1, 0.16], sizeEnd: 0.2, color: [SOUL, SOUL2, '#c8fff0'] }); });
      let kick = 0;
      rt.on(({ t, dt }) => {
        const sc = rig.root.scale.x || 1;
        // ลอยขึ้นลง + เอนตามจังหวะหายใจ
        const bob = Math.sin(t * 1.6) * 0.06, sway = Math.sin(t * 0.9) * 0.05;
        // กึ่งกลางเฟรม = กึ่งกลางร่างยมทูต
        const fcy = FIG_CY - bob / FR;
        fig.position.set(0, RY, 0); edge.position.copy(fig.position); fig.center.y = edge.center.y = fcy;
        glow.position.y = RY; shade.position.y = RY; lift(glow, 0.5, fcy); lift(shade, 0.47, fcy);
        glow.material.opacity = 0.3 + 0.08 * Math.sin(t * 2.4) + kick * 0.4;
        // ตาเรือง (ตามตำแหน่งบนภาพ · กะพริบช้า)
        // ทุกชิ้นวางบนแกนกลางตัว (x = z = 0) แล้วเลื่อนบนจอด้วย sprite.center — ระบบตัวละครพิกเซลจัดตำแหน่งชิ้น 3 มิติตามแกนกลาง
        // ท่าฟาดเคียว
        let rot = -0.12 + sway * 0.6, eo = 0;
        if (sw.t >= 0) {
          sw.t += dt; const T = sw.t;
          if (T < 0.45) { const k = T / 0.45; rot = -0.12 - 0.85 * (1 - Math.pow(1 - k, 2)); eo = k * 0.5; }   // ง้างไปด้านหลัง
          else if (T < 0.61) {                                                                            // ฟาดลง
            const k = (T - 0.45) / 0.16; rot = -0.97 + 2.5 * k * k; eo = 1;
            if (!sw.hit && k > 0.55) {
              sw.hit = true; kick = 1; flash(); wave(); setTimeout(() => wave({ color: SOUL2, r1: 2.3 }), 120);
              slash.visible = slash2.visible = true; slash.userData.t = 0;
              const b = rt.worldPos(rig.root);
              scatter(rt, 'flame', V(b.x, b.y + CY * sc, b.z), 30, { color: [SOUL, SOUL2, '#ffffff'], speed: [2.2, 4], up: [0.2, 1.6], gravity: -1, drag: 1.4, life: [0.6, 1.0], size: [0.12, 0.22] });
              scatter(rt, 'smoke', V(b.x, b.y + 0.2 * sc, b.z), 14, { blend: NB, color: ['#120e1a', '#241c34'], speed: [1.2, 2.2], up: [0, 0.4], gravity: 0, drag: 2, life: [0.8, 1.2], size: [0.3, 0.5], sizeEnd: 1.6, alpha: 0.6 });
              for (const S of souls) S.pull = 1;
            }
          } else if (T < 0.86) { rot = 1.53; eo = 1 - (T - 0.61) / 0.25 * 0.6; }
          else if (T < 1.46) { const k = (T - 0.86) / 0.6; rot = 1.53 + (-0.12 - 1.53) * (1 - Math.pow(1 - k, 3)); eo = 0.4 * (1 - k); }
          else { sw.t = -1; sw.hit = false; }
        }
        // เลือกเฟรมตามมุมเคียว (canvas หมุนตามเข็ม = ฟาดไปข้างหน้า)
        let fi = Math.round((rot - A0) / (A1 - A0) * (NF - 1)); fi = Math.max(0, Math.min(NF - 1, fi));
        if (fig.material.map !== frames[fi]) { fig.material.map = frames[fi]; edge.material.map = frames[fi]; }
        edge.material.opacity = eo * 0.45;
        // เสี้ยวจันทร์หมุนกวาดแล้วจาง
        if (slash.visible) {
          slash.userData.t += dt; const k = slash.userData.t / 0.5;
          if (k >= 1) { slash.visible = slash2.visible = false; }
          else { slash.material.rotation = 0.9 - k * 2.6; slash2.material.rotation = slash.material.rotation + 0.2; slash.material.opacity = (1 - k) * 0.95; slash2.material.opacity = (1 - k) * 0.6; slash.scale.setScalar(3.0 + k * 0.8); slash2.scale.setScalar(2.6 + k * 0.6); }
        }
        // ดวงวิญญาณ: โคจรรอบเอว → ถูกดูดขึ้นไปหาเคียวหลังฟาด แล้วค่อยกลับ
        for (const S of souls) {
          S.pull = Math.max(0, S.pull - dt * 0.9);
          const a = S.ph + t * 1.1, r = 0.72 * (1 - S.pull * 0.8), y = CY - 0.15 + Math.sin(t * 2 + S.ph) * 0.12 + S.pull * 1.3;
          S.s.position.set(Math.cos(a) * r, y, Math.sin(a) * r); S.c.position.copy(S.s.position);
          S.s.scale.setScalar(0.3 + 0.06 * Math.sin(t * 5 + S.ph)); S.c.material.rotation = t * 3;
        }
        kick = Math.max(0, kick - dt * 1.6);
        rune.rotation.z = t * 0.25; rune2.rotation.z = -t * 0.45;
        rune.material.opacity = 0.5 + 0.1 * Math.sin(t * 2) + kick * 0.4; rim.material.opacity = 0.4 + kick * 0.5; rune2.material.opacity = 0.4 + kick * 0.5;
              });
    },
  };
}
