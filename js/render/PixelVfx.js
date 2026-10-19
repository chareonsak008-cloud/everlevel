// v0.34: เอฟเฟกต์สกิลภาพพิกเซลจาก PixelLab VFX Creator ("For a game (ZIP)")
// แต่ละเอฟเฟกต์อยู่ที่ assets/vfx/<ชื่อ>/ : manifest.json + behind.png + front.png (หรือ whole.png)
// วาดเป็นแผ่นป้ายหันหากล้อง 2 ชั้น: ชั้นหลังตัวละคร / ชั้นหน้าตัวละคร · จุดยึด = เท้าของเป้าหมาย
import { THREE } from './three.js?v=0.56.0';

const PXW = 3.55 / 96;   // หน่วยโลกต่อ 1 พิกเซล (เท่าตัวละครพิกเซล 8 ทิศ)

export class PixelVfx {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.defs = new Map();      // ชื่อ → Promise<def | null>
    this.live = [];
    this._v = new THREE.Vector3();
  }

  load(name) {
    if (this.defs.has(name)) return this.defs.get(name);
    const base = `assets/vfx/${name}/`;
    const p = fetch(base + 'manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => {
      if (!m) return null;
      const pick = (n) => m.clips.find((c) => c.name === n);
      const layers = [];
      const add = (clip, push) => {
        if (!clip) return;
        const sh = clip.sheets[0];
        layers.push({ clip, sh, push, url: base + sh.file });
      };
      const behind = pick('behind'), front = pick('front');
      if (behind || front) { add(behind, 0.15); add(front, 0.9); } else add(pick('whole'), 0.9);
      // รอภาพโหลดครบก่อน (เอฟเฟกต์สั้น ๆ จะได้ไม่จบก่อนภาพมา) แล้วค่อยแจกสำเนาให้แต่ละครั้งที่เล่น
      return Promise.all(layers.map((L) => new Promise((ok) => new THREE.TextureLoader().load(L.url, (t) => { L.tex = t; ok(); }, undefined, () => ok())))).then(() => ({ m, layers: layers.filter((L) => L.tex) }));
    }).catch(() => null);
    this.defs.set(name, p);
    return p;
  }

  // เล่นเอฟเฟกต์ที่จุด pos (Vector3 โลก, ที่ระดับพื้น) · scale ขยายทั้งเอฟเฟกต์ · delay วินาที
  // follow = ตัวละคร (มี x,y เป็นพิกัดโลก/16) → เอฟเฟกต์วนตามตัวไม่จบจนกว่าจะ stop() (ออร่าแฟชั่น)
  play(name, pos, { scale = 1, delay = 0, life = 3, lift = 0, follow = null, flip = false, once = false, speed = 1, maxT = 0, behind = false, opacity = 1 } = {}) {
    const h = { name, stopped: false, e: null, stop() { this.stopped = true; if (this.e) this.e.dead = true; } };
    h.ready = this.load(name).then((d) => {
      if (!d || h.stopped) return false;
      const meshes = d.layers.map((L) => {
        const c = L.clip, w = c.frame.w * PXW * scale, h = c.frame.h * PXW * scale;
        const geo = new THREE.PlaneGeometry(w, h);
        // วางให้จุดยึด (เท้า) ของเอฟเฟกต์อยู่ที่ pos: มุมซ้ายบนของเฟรม = anchor + offset
        geo.translate((c.offset.x + c.frame.w / 2) * PXW * scale, -(c.offset.y + c.frame.h / 2) * PXW * scale, 0);
        const tex = L.tex.clone(); tex.needsUpdate = true;
        const sm = !!d.m.smooth;   // v0.54 ภาพเรืองแสงจาก Night Forge: กรองภาพแบบนุ่ม ไม่ตัดขอบโปร่ง
        tex.encoding = THREE.sRGBEncoding; tex.magFilter = sm ? THREE.LinearFilter : THREE.NearestFilter; tex.minFilter = sm ? THREE.LinearFilter : THREE.NearestFilter; tex.generateMipmaps = false;
        tex.repeat.set(1 / L.sh.columns, 1 / L.sh.rows);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, alphaTest: sm ? 0.01 : 0.08, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = L.push > 0.5 && !behind ? 45 : 35; mesh.frustumCulled = false; mesh.visible = false;
        this.scene.add(mesh);
        return { mesh, tex, L, push: behind ? 0.15 : L.push };   // behind = วาดหลังตัวละคร (บัฟรอบตัว ไม่ให้ตัวละครถูกแสงกลืน)
      });
      const up = d.m.anchor && d.m.anchor.kind === 'origin' ? (lift || 1.0) : lift;
      const at = (pos || new THREE.Vector3()).clone(); at.y += up;
      h.e = { d, meshes, pos: at, t: -delay, speed, maxT, opacity, life: follow && !once ? Infinity : life, follow, up, hidden: false, flip };
      this.live.push(h.e);
      return true;
    });
    return follow && !once ? h : h.ready;
  }

  update(dt) {
    if (!this.live.length) return;
    const cam = this.camera;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i], m = e.d.m; e.t += dt * (e.speed || 1);
      const f0 = Math.floor(e.t * m.fps), f = m.loop ? ((f0 % m.frames) + m.frames) % m.frames : f0;
      const endT = e.maxT && !m.loop ? Math.min(m.frames / m.fps, e.maxT) : 0;   // v0.54 ตัดหางยาวของเอฟเฟกต์ (เศษหินค้าง) แล้วค่อย ๆ จาง
      if (e.dead || (m.loop ? e.t > (e.life || 3) : f >= m.frames || (endT && e.t >= endT))) { for (const o of e.meshes) { this.scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); o.tex.dispose(); } this.live.splice(i, 1); continue; }
      if (e.follow) { const F = e.follow; e.pos.set(F.x / 16, (F.lift || 0) + e.up, F.y / 16); }
      const toCam = this._v.copy(cam.position).sub(e.pos); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
      for (const o of e.meshes) {
        const c = o.L.clip, sh = o.L.sh, lf = f - (c.start_frame || 0);
        const on = !e.hidden && e.t >= 0 && lf >= 0 && lf < c.frames;
        o.mesh.visible = on; if (!on) continue;
        const col = lf % sh.columns, row = Math.floor(lf / sh.columns);
        o.tex.offset.set(col / sh.columns, 1 - (row + 1) / sh.rows);
        const push = o.push;
        o.mesh.position.copy(e.pos).addScaledVector(toCam, push);
        o.mesh.quaternion.copy(cam.quaternion);
        const k = (dist - push) / dist; o.mesh.scale.set(e.flip ? -k : k, k, 1);
        if (endT) o.mesh.material.opacity = e.opacity * Math.min(1, (endT - e.t) / 0.35);
      }
    }
  }
}

// สกิล → เอฟเฟกต์พิกเซล (at: 'target' ที่ตัวเป้าหมาย · 'self' ที่ตัวผู้เล่น)
export const SKILL_VFX = {
  // v0.54 Night Forge VFX (solo = ไม่วาดเอฟเฟกต์เดิมซ้อน · speed = เร่งให้จังหวะกระแทกตรงกับจังหวะตีจริง)
  // ดาบ (Swordsman)
  power_slash: { name: 'nf_power_slash', at: 'target', scale: 1.6, delay: 0, speed: 1, solo: true },
  ground_burst: { name: 'nf_ground_burst', at: 'self', scale: 1.5, delay: 0.3, speed: 1.1, maxT: 1.7, solo: true },
  blade_cyclone: { name: 'nf_blade_cyclone', at: 'self', scale: 1.25, delay: 0, speed: 1.2, maxT: 1.5, solo: true },
  sky_cleave: { name: 'nf_sky_cleave', at: 'target', scale: 1.4, delay: 0, speed: 1.1, maxT: 1.9, solo: true },
  battle_cry: { name: 'nf_battle_cry', at: 'self', scale: 1.1, delay: 0, speed: 1.4, maxT: 1.6, behind: true, solo: true },
  iron_will: { name: 'nf_iron_will', at: 'self', scale: 1.05, delay: 0, speed: 1.4, maxT: 1.8, behind: true, solo: true },
  // อัศวิน (Knight)
  lance_pierce: { name: 'nf_lance_pierce', at: 'target', scale: 1.1, delay: 0, speed: 1.3, maxT: 1.2, solo: true },
  steel_charge: { name: 'nf_steel_charge', at: 'target', scale: 1.6, delay: 0, speed: 1.8, maxT: 1.3, solo: true },
  crescent_sweep: { name: 'nf_crescent_sweep', at: 'self', scale: 1.6, delay: 0, speed: 1.3, maxT: 1.3, solo: true },
  aegis_aura: { name: 'nf_aegis_aura', at: 'self', scale: 1.1, delay: 0, speed: 1, maxT: 2.1, behind: true, solo: true },
  heavens_lance: { name: 'nf_heavens_lance', at: 'target', scale: 1.2, delay: 0, speed: 1.6, solo: true },
  // ธนู (Archer) · สกิลยิงไกลไม่ใส่ solo เพื่อให้ลูกธนู/นกที่บินไปหาเป้ายังอยู่ แล้วซ้อนภาพ Night Forge ตอนโดน
  twin_shot: { name: 'nf_twin_shot', at: 'target', scale: 1.1, delay: 0.3 },
  arrow_rain: { name: 'nf_arrow_rain', at: 'target', scale: 1.25, delay: 0.33, opacity: 0.7, solo: true },
  gale_arrow: { name: 'nf_gale_arrow', at: 'target', scale: 1.3, delay: 1.2 },
  phoenix_shot: { name: 'nf_phoenix_shot', at: 'target', scale: 1.4, delay: 1.35 },
  frost_trap: { name: 'nf_frost_trap', at: 'target', scale: 1.3, delay: 0.62, solo: true },
  eagle_focus: { name: 'nf_eagle_focus', at: 'self', scale: 1.1, delay: 0, behind: true, solo: true },
  // นักล่า (Hunter)
  falcon_assault: { name: 'nf_falcon_assault', at: 'target', scale: 1.2, delay: 0.42 },
  blast_trap: { name: 'nf_blast_trap', at: 'target', scale: 1.4, delay: 0.33, solo: true },
  split_volley: { name: 'nf_split_volley', at: 'target', scale: 1.3, delay: 0.13 },
  predator_focus: { name: 'nf_predator_focus', at: 'self', scale: 1.1, delay: 0, behind: true, solo: true },
  talon_tempest: { name: 'nf_talon_tempest', at: 'target', scale: 1.2, delay: 0, opacity: 0.8, behind: true, solo: true },
  // นักเวท (Mage) · ลูกไฟ/หอกน้ำแข็ง/ไฟร์บอลไม่ใส่ solo (ยังเห็นกระสุนเวทบินไปหาเป้า แล้วซ้อนภาพตอนโดน)
  flame_bolt: { name: 'nf_flame_bolt', at: 'target', scale: 1.15, delay: 0.39, opacity: 0.85 },
  frost_lance: { name: 'nf_frost_lance', at: 'target', scale: 1.2, delay: 0.33 },
  fire_ball: { name: 'nf_fire_ball', at: 'target', scale: 1.3, delay: 0.99, opacity: 0.8 },
  meteor_storm: { name: 'nf_meteor_storm', at: 'target', scale: 1.6, delay: 0.07, opacity: 0.7, behind: true, solo: true },
  frost_storm: { name: 'nf_frost_storm', at: 'target', scale: 1.6, delay: 0.07, opacity: 0.7, behind: true, solo: true },
  thunder_storm: { name: 'nf_thunder_storm', at: 'target', scale: 1.6, delay: 0.07, opacity: 0.7, behind: true, solo: true },
  arcane_shield: { name: 'nf_arcane_shield', at: 'self', scale: 1.1, delay: 0, behind: true, solo: true },
  // จอมเวท (Wizard)
  arcane_blades: { name: 'nf_arcane_blades', at: 'target', scale: 1.15, delay: 0.22, opacity: 0.75 },
  gravity_well: { name: 'nf_gravity_well', at: 'target', scale: 1.5, delay: 0.07, behind: true, solo: true },
  chrono_rift: { name: 'nf_chrono_rift', at: 'target', scale: 1.4, delay: 0.07, opacity: 0.8, behind: true, solo: true },
  astral_form: { name: 'nf_astral_form', at: 'self', scale: 1.1, delay: 0, behind: true, solo: true },
  supernova: { name: 'nf_supernova', at: 'target', scale: 1.6, delay: 0.07, opacity: 0.75, behind: true, solo: true },
};
