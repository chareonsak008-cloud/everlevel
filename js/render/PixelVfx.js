// v0.34: เอฟเฟกต์สกิลภาพพิกเซลจาก PixelLab VFX Creator ("For a game (ZIP)")
// แต่ละเอฟเฟกต์อยู่ที่ assets/vfx/<ชื่อ>/ : manifest.json + behind.png + front.png (หรือ whole.png)
// วาดเป็นแผ่นป้ายหันหากล้อง 2 ชั้น: ชั้นหลังตัวละคร / ชั้นหน้าตัวละคร · จุดยึด = เท้าของเป้าหมาย
import { THREE } from './three.js?v=0.51.0';

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
  play(name, pos, { scale = 1, delay = 0, life = 3, lift = 0, follow = null, flip = false, once = false } = {}) {
    const h = { name, stopped: false, e: null, stop() { this.stopped = true; if (this.e) this.e.dead = true; } };
    h.ready = this.load(name).then((d) => {
      if (!d || h.stopped) return false;
      const meshes = d.layers.map((L) => {
        const c = L.clip, w = c.frame.w * PXW * scale, h = c.frame.h * PXW * scale;
        const geo = new THREE.PlaneGeometry(w, h);
        // วางให้จุดยึด (เท้า) ของเอฟเฟกต์อยู่ที่ pos: มุมซ้ายบนของเฟรม = anchor + offset
        geo.translate((c.offset.x + c.frame.w / 2) * PXW * scale, -(c.offset.y + c.frame.h / 2) * PXW * scale, 0);
        const tex = L.tex.clone(); tex.needsUpdate = true;
        tex.encoding = THREE.sRGBEncoding; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
        tex.repeat.set(1 / L.sh.columns, 1 / L.sh.rows);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.08, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = L.push > 0.5 ? 45 : 35; mesh.frustumCulled = false; mesh.visible = false;
        this.scene.add(mesh);
        return { mesh, tex, L };
      });
      const up = d.m.anchor && d.m.anchor.kind === 'origin' ? (lift || 1.0) : lift;
      const at = (pos || new THREE.Vector3()).clone(); at.y += up;
      h.e = { d, meshes, pos: at, t: -delay, life: follow && !once ? Infinity : life, follow, up, hidden: false, flip };
      this.live.push(h.e);
      return true;
    });
    return follow && !once ? h : h.ready;
  }

  update(dt) {
    if (!this.live.length) return;
    const cam = this.camera;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i], m = e.d.m; e.t += dt;
      const f0 = Math.floor(e.t * m.fps), f = m.loop ? ((f0 % m.frames) + m.frames) % m.frames : f0;
      if (e.dead || (m.loop ? e.t > (e.life || 3) : f >= m.frames)) { for (const o of e.meshes) { this.scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose(); o.tex.dispose(); } this.live.splice(i, 1); continue; }
      if (e.follow) { const F = e.follow; e.pos.set(F.x / 16, (F.lift || 0) + e.up, F.y / 16); }
      const toCam = this._v.copy(cam.position).sub(e.pos); const dist = toCam.length(); toCam.multiplyScalar(1 / dist);
      for (const o of e.meshes) {
        const c = o.L.clip, sh = o.L.sh, lf = f - (c.start_frame || 0);
        const on = !e.hidden && e.t >= 0 && lf >= 0 && lf < c.frames;
        o.mesh.visible = on; if (!on) continue;
        const col = lf % sh.columns, row = Math.floor(lf / sh.columns);
        o.tex.offset.set(col / sh.columns, 1 - (row + 1) / sh.rows);
        const push = o.L.push;
        o.mesh.position.copy(e.pos).addScaledVector(toCam, push);
        o.mesh.quaternion.copy(cam.quaternion);
        const k = (dist - push) / dist; o.mesh.scale.set(e.flip ? -k : k, k, 1);
      }
    }
  }
}

// สกิล → เอฟเฟกต์พิกเซล (at: 'target' ที่ตัวเป้าหมาย · 'self' ที่ตัวผู้เล่น)
export const SKILL_VFX = {
  power_slash: { name: 'impact_burst', at: 'target', scale: 2.2, delay: 0.13 },
  sky_cleave: { name: 'sky_cleave', at: 'target', scale: 1.25, delay: 0.3 },   // เสาแสงเริ่มเฟรม 4 (0.33 วิ) → ตรงจังหวะดาบฟาดที่ 0.62 วิ
  lance_pierce: { name: 'impact_burst', at: 'target', scale: 2.4, delay: 0.15 },
};
