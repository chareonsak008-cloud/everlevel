// v0.93 fix15 ของตกแต่งช่วงเทศกาลฮาโลวีน (เปิดเองตามปฏิทินเทศกาล 24 ต.ค. – 2 พ.ย.)
// · มอนทุกตัวในแผนที่ล่าสวมหมวกฟักทองจิ๋ว (เรืองแสงหน้าแกะสลัก)
// · ในเมือง: ฟักทองแกะสลักจุดเทียนวางรอบ NPC/ลานเมือง + แสงเทียนกะพริบ + ค้างคาวบินวนเหนือลาน
import { THREE } from './three.js?v=0.93.0-p2.18';
import { toon } from './Toon.js?v=0.93.0-p2.18';

const TAU = Math.PI * 2;
let glowTex = null;
const glow = () => {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); return glowTex;
};
let batTex = null;
const bat = () => {
  if (batTex) return batTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#1a0e22'; g.beginPath();
  for (const d of [-1, 1]) { g.moveTo(32, 16); g.quadraticCurveTo(32 + d * 14, 2, 32 + d * 30, 8); g.lineTo(32 + d * 24, 16); g.lineTo(32 + d * 18, 13); g.lineTo(32 + d * 12, 20); g.lineTo(32, 20); }
  g.fill(); g.beginPath(); g.ellipse(32, 17, 5, 7, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff6a2a'; g.fillRect(29, 14, 2, 2); g.fillRect(33, 14, 2, 2);
  batTex = new THREE.CanvasTexture(c); return batTex;
};

// ฟักทองแกะสลัก (ขนาด s = รัศมีโดยประมาณ) — โมเดล toon + ตา/ปากเรืองแสง
export function jackOLantern(s = 0.2) {
  const g = new THREE.Group();
  const body = toon('#f07a1a'), rib = toon('#c85a12'), stem = toon('#4a6a22'), lit = toon('#ffd24a', { emissive: '#ffb020', emissiveIntensity: 1.6 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), body); b.scale.set(1.2, 0.85, 1.2); b.position.y = s * 0.85; g.add(b);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(s * 0.98, 12, 8), rib); r.scale.set(0.42, 0.86, 1.18); r.rotation.y = i * Math.PI / 4; r.position.y = s * 0.85; g.add(r); }
  const st = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.1, s * 0.14, s * 0.4, 6), stem); st.position.set(0, s * 1.65, 0); st.rotation.z = 0.25; g.add(st);
  for (const d of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(s * 0.2, s * 0.28, 3), lit); e.position.set(d * s * 0.4, s * 1.0, s * 1.08); e.rotation.x = Math.PI / 2; e.scale.z = 0.35; g.add(e); }
  const m = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, s * 0.18, s * 0.1), lit); m.position.set(0, s * 0.62, s * 1.12); g.add(m);
  return g;
}

// หมวกฟักทองบนหัวมอน
export function pumpkinHat(mobHeight = 1) {
  const s = Math.max(0.17, Math.min(0.38, mobHeight * 0.24));
  const g = jackOLantern(s); g.position.y = mobHeight * 0.96; g.rotation.set(-0.12, 0.3, 0.18); g.userData.festHat = true;
  return g;
}

// ของตกแต่งในเมือง: spots = [{x,z}] (หน่วยโลก) · คืน { update(t) }
export function townDecor(world, spots) {
  const G = new THREE.Group(); world.add(G);
  const lights = [];
  spots.forEach((p, i) => {
    const j = jackOLantern(0.3 + (i % 3) * 0.06); j.position.set(p.x, 0, p.z); j.rotation.y = (i * 1.7) % TAU; G.add(j);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: '#ff9a2a', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.set(1.3, 1.3, 1); sp.position.set(p.x, 0.35, p.z); G.add(sp); lights.push({ sp, ph: i * 1.3 });
  });
  // ค้างคาวบินวนเหนือกลางเมือง
  const cx = spots.reduce((a, p) => a + p.x, 0) / Math.max(1, spots.length), cz = spots.reduce((a, p) => a + p.z, 0) / Math.max(1, spots.length);
  const bats = Array.from({ length: 7 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bat(), transparent: true, depthWrite: false })); s.scale.set(0.6, 0.3, 1); G.add(s); return { s, ph: i / 7 * TAU, r: 3 + (i % 3) * 1.5, y: 3.2 + (i % 4) * 0.5 }; });
  return {
    group: G,
    update(t) {
      for (const L of lights) L.sp.material.opacity = 0.45 + 0.15 * Math.sin(t * 13 + L.ph) + 0.08 * Math.sin(t * 21 + L.ph);
      for (const B of bats) { const a = B.ph + t * 0.5; B.s.position.set(cx + Math.cos(a) * B.r, B.y + Math.sin(t * 3 + B.ph) * 0.3, cz + Math.sin(a) * B.r * 0.7); B.s.scale.y = 0.3 * (0.6 + 0.4 * Math.abs(Math.sin(t * 9 + B.ph))); }
    },
  };
}
