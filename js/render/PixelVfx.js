// v0.34: เอฟเฟกต์สกิลภาพพิกเซลจาก PixelLab VFX Creator ("For a game (ZIP)")
// แต่ละเอฟเฟกต์อยู่ที่ assets/vfx/<ชื่อ>/ : manifest.json + behind.png + front.png (หรือ whole.png)
// วาดเป็นแผ่นป้ายหันหากล้อง 2 ชั้น: ชั้นหลังตัวละคร / ชั้นหน้าตัวละคร · จุดยึด = เท้าของเป้าหมาย
import { THREE } from './three.js?v=0.61.0';

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
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, alphaTest: sm ? 0.01 : 0.08, depthWrite: false, depthTest: !sm, toneMapped: false, side: THREE.DoubleSide });
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
  // ดาบ (Swordsman) · v0.60 ชุดใหม่ "เพลิงชาด"
  crimson_cleave: { name: 'nf_crimson_cleave', at: 'target', scale: 1.15, delay: 0.07, solo: true },
  flame_dash: { name: 'nf_flame_dash', at: 'target', scale: 1.35, delay: 0, behind: true, solo: true },
  inferno_spin: { name: 'nf_inferno_spin', at: 'self', scale: 1.4, delay: 0.07, behind: true, solo: true },
  war_cry: { name: 'nf_war_cry', at: 'self', scale: 1.15, delay: 0.07, behind: true, solo: true },
  iron_bastion: { name: 'nf_iron_bastion', at: 'self', scale: 1.15, delay: 0.07, behind: true, solo: true },
  meteor_blade: { name: 'nf_meteor_blade', at: 'target', scale: 1.6, delay: 0.07, behind: true, solo: true },
  // อัศวิน (Knight) · v0.60 ชุดใหม่ "อัสนีราชันย์"
  thunder_thrust: { name: 'nf_thunder_thrust', at: 'target', scale: 1.15, delay: 0.07, solo: true },
  storm_rush: { name: 'nf_storm_rush', at: 'target', scale: 1.35, delay: 0, behind: true, solo: true },
  judgement_wheel: { name: 'nf_judgement_wheel', at: 'self', scale: 1.55, delay: 0.07, behind: true, solo: true },
  aegis_crown: { name: 'nf_aegis_crown', at: 'self', scale: 1.15, delay: 0.07, behind: true, solo: true },
  sky_dragon_lance: { name: 'nf_sky_dragon_lance', at: 'target', scale: 1.6, delay: 0.07, behind: true, solo: true },
  // ธนู (Archer) · v0.60 ชุดใหม่ "ศรดารา"
  quick_shot: { name: 'nf_quick_shot', at: 'target', scale: 1.45, delay: 0, solo: true, flipToCaster: true },
  piercing_shot: { name: 'nf_piercing_shot', at: 'target', scale: 1.55, delay: 0, solo: true, flipToCaster: true },
  scatter_shot: { name: 'nf_scatter_shot', at: 'self', scale: 1.6, delay: 0, solo: true },
  eagle_eye: { name: 'nf_eagle_eye', at: 'self', scale: 1.4, delay: 0, behind: true, solo: true },
  arrow_storm: { name: 'nf_arrow_storm', at: 'target', scale: 1.8, delay: 0, behind: true, solo: true },
  // นักล่า (Hunter) · v0.60 ชุดใหม่ "เหยี่ยวเงา"
  double_shot: { name: 'nf_double_shot', at: 'target', scale: 1.45, delay: 0, solo: true, flipToCaster: true },
  gale_rift_arrow: { name: 'nf_gale_rift_arrow', at: 'target', scale: 1.5, delay: 0, solo: true, flipToCaster: true },
  cyclone_trap: { name: 'nf_cyclone_trap', at: 'target', scale: 1.5, delay: 0, behind: true, solo: true },
  tailwind_step: { name: 'nf_tailwind_step', at: 'self', scale: 1.4, delay: 0, behind: true, solo: true },
  storm_king_volley: { name: 'nf_storm_king_volley', at: 'target', scale: 1.85, delay: 0, behind: true, solo: true },
  // นักเวท (Mage) · v0.60 ชุดใหม่ "เวทพิศวงสีม่วง"
  violet_flare: { name: 'nf_violet_flare', at: 'target', scale: 1.15, delay: 0, solo: true },
  glacial_spikes: { name: 'nf_glacial_spikes', at: 'target', scale: 1.35, delay: 0.07, behind: true, solo: true },
  chain_lightning: { name: 'nf_chain_lightning', at: 'target', scale: 1.4, delay: 0.07, behind: true, solo: true },
  blizzard: { name: 'nf_blizzard', at: 'target', scale: 1.6, delay: 0.07, behind: true, solo: true },
  arcane_ward: { name: 'nf_arcane_ward', at: 'self', scale: 1.15, delay: 0, behind: true, solo: true },
  void_meteor: { name: 'nf_void_meteor', at: 'target', scale: 1.6, delay: 0.07, behind: true, solo: true },
  // จอมเวท (Wizard) · v0.60 ชุดใหม่ "วันสิ้นดารา"
  comet_strike: { name: 'nf_comet_strike', at: 'target', scale: 1.2, delay: 0, solo: true },
  black_hole: { name: 'nf_black_hole', at: 'target', scale: 1.55, delay: 0.07, behind: true, solo: true },
  astral_blades: { name: 'nf_astral_blades', at: 'target', scale: 1.3, delay: 0.07, behind: true, solo: true },
  astral_ascension: { name: 'nf_astral_ascension', at: 'self', scale: 1.2, delay: 0, behind: true, solo: true },
  starfall_cataclysm: { name: 'nf_starfall_cataclysm', at: 'target', scale: 1.7, delay: 0.07, behind: true, solo: true },
  // นักบวช (Acolyte) · v0.60 ชุดใหม่ "แสงศรัทธา"
  lumen_heal: { name: 'nf_lumen_heal', at: 'self', scale: 1.15, delay: 0, behind: true, solo: true },
  radiant_lance: { name: 'nf_radiant_lance', at: 'target', scale: 1.2, delay: 0, solo: true, maxT: 1.6 },
  star_blessing: { name: 'nf_star_blessing', at: 'self', scale: 1.2, delay: 0, behind: true, solo: true },
  holy_ground: { name: 'nf_holy_ground', at: 'self', scale: 1.6, delay: 0.07, behind: true, solo: true },
  sacred_chains: { name: 'nf_sacred_chains', at: 'target', scale: 1.3, delay: 0.07, behind: true, solo: true },
  heavens_cross: { name: 'nf_heavens_cross', at: 'target', scale: 1.6, delay: 0.07, behind: true, solo: true },
  // นักบวชชั้นสูง (Priest) · v0.60 ชุดใหม่ "เทวทูตทองคำ"
  lotus_renewal: { name: 'nf_lotus_renewal', at: 'self', scale: 1.4, delay: 0, behind: true, solo: true },
  aegis_of_light: { name: 'nf_aegis_of_light', at: 'self', scale: 1.2, delay: 0, behind: true, solo: true },
  judgement_blades: { name: 'nf_judgement_blades', at: 'target', scale: 1.4, delay: 0.07, behind: true, solo: true },
  purifying_dawn: { name: 'nf_purifying_dawn', at: 'self', scale: 1.6, delay: 0.07, behind: true, solo: true },
  seraph_judgement: { name: 'nf_seraph_judgement', at: 'self', scale: 1.8, delay: 0.07, behind: true, solo: true },
};
