// v0.34: เอฟเฟกต์สกิลภาพพิกเซลจาก PixelLab VFX Creator ("For a game (ZIP)")
// แต่ละเอฟเฟกต์อยู่ที่ assets/vfx/<ชื่อ>/ : manifest.json + behind.png + front.png (หรือ whole.png)
// วาดเป็นแผ่นป้ายหันหากล้อง 2 ชั้น: ชั้นหลังตัวละคร / ชั้นหน้าตัวละคร · จุดยึด = เท้าของเป้าหมาย
import { THREE } from './three.js?v=0.70.0';

const PXW = 3.55 / 96;   // หน่วยโลกต่อ 1 พิกเซล (เท่าตัวละครพิกเซล 8 ทิศ)

export class PixelVfx {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.defs = new Map();      // ชื่อ → Promise<def | null>
    this.live = [];
    this._v = new THREE.Vector3();
    this._p1 = new THREE.Vector3(); this._p2 = new THREE.Vector3();
    this._q = new THREE.Quaternion(); this._z = new THREE.Vector3(0, 0, 1);
  }

  // v0.65.2 หันชีตหาเป้าบนหน้าจอ: ชีตวาดให้ผู้ร่ายซ้าย เป้าขวา (แกน +x) → ฉายจุดผู้ร่าย/เป้าลงจอ แล้วหมุนแผ่นป้ายรอบแกนมองกล้อง
  // เป้าอยู่ซ้ายจอ = กลับด้านภาพแล้วหมุน (ภาพไม่คว่ำ) · จำกัดมุมเอียงด้วย aim.max (ชีตที่มีวงเวทบนพื้นไม่ตั้งฉากเกินไป)
  aimOf(e) {
    const A = e.aim, cam = this.camera;
    const from = typeof A.from === 'function' ? A.from() : A.from, to = typeof A.to === 'function' ? A.to() : A.to;
    if (!from || !to) return null;
    const p1 = this._p1.copy(from).project(cam), p2 = this._p2.copy(to).project(cam);
    const dx = (p2.x - p1.x) * (cam.aspect || 1), dy = p2.y - p1.y;
    if (dx * dx + dy * dy < 1e-6) return null;
    const flip = dx < 0, max = A.max ?? 1.2;
    const rot = Math.max(-max, Math.min(max, flip ? -Math.atan2(dy, -dx) : Math.atan2(dy, dx)));
    return { rot, flip };
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
  // aim = { from, to, max } (Vector3 หรือฟังก์ชันคืน Vector3) → หันชีตหาเป้าบนจอทุกเฟรม แทน flip
  play(name, pos, { scale = 1, delay = 0, life = 3, lift = 0, follow = null, flip = false, once = false, speed = 1, maxT = 0, behind = false, opacity = 1, aim = null } = {}) {
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
      h.e = { d, meshes, pos: at, t: -delay, speed, maxT, opacity, life: follow && !once ? Infinity : life, follow, up, hidden: false, flip, aim };
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
      let rot = 0, flip = e.flip;
      if (e.aim) { const a = this.aimOf(e); if (a) { rot = a.rot; flip = a.flip; } }
      for (const o of e.meshes) {
        const c = o.L.clip, sh = o.L.sh, lf = f - (c.start_frame || 0);
        const on = !e.hidden && e.t >= 0 && lf >= 0 && lf < c.frames;
        o.mesh.visible = on; if (!on) continue;
        const col = lf % sh.columns, row = Math.floor(lf / sh.columns);
        o.tex.offset.set(col / sh.columns, 1 - (row + 1) / sh.rows);
        const push = o.push;
        o.mesh.position.copy(e.pos).addScaledVector(toCam, push);
        o.mesh.quaternion.copy(cam.quaternion);
        if (rot) o.mesh.quaternion.multiply(this._q.setFromAxisAngle(this._z, rot));
        const k = (dist - push) / dist; o.mesh.scale.set(flip ? -k : k, k, 1);
        if (endT) o.mesh.material.opacity = e.opacity * Math.min(1, (endT - e.t) / 0.35);
      }
    }
  }
}

// สกิล → เอฟเฟกต์พิกเซล (at: 'target' ที่ตัวเป้าหมาย · 'self' ที่ตัวผู้เล่น)
export const SKILL_VFX = {
  // v0.54 Night Forge VFX (solo = ไม่วาดเอฟเฟกต์เดิมซ้อน · speed = เร่งให้จังหวะกระแทกตรงกับจังหวะตีจริง)
  // ดาบ (Swordsman) · v0.64 ชุดใหม่ (sprite sheet มุมข้าง 24 fps จากผู้พัฒนา · side = วางที่เท้าผู้ร่าย หันหาเป้า ย่อ/ขยายตามระยะ)
  // อัศวิน (Knight) · v0.64 ชุดใหม่
  // ธนู (Archer) · v0.60 ชุดใหม่ "ศรดารา"
  // v0.66 ชุดใหม่ "นักธนูแสงดาว" (sprite sheet มุมข้าง 24 fps จากผู้พัฒนา · fit 135 = ระยะผู้ร่าย→ศัตรูตัวแรกในภาพ ~5 ช่อง)
  // aimMax เล็ก = สกิลที่มีของบนฟ้า/วงบนพื้น (ไม่ให้เอียงตามเป้ามาก)
  // นักล่า (Hunter) · v0.60 ชุดใหม่ "เหยี่ยวเงา"
  // v0.66 ชุดใหม่ "พรานเงาจันทรา"
  // นักเวท (Mage) · v0.60 ชุดใหม่ "เวทพิศวงสีม่วง"
  // จอมเวท (Wizard) · v0.62 ชุดใหม่ "จอมเวทน้ำแข็ง" (sprite sheet 24 fps จากผู้พัฒนา)
  // นักบวช (Acolyte) · v0.63 ชุดใหม่ "นักบวชแสง" (sprite sheet 24 fps จากผู้พัฒนา)
  // นักบวชชั้นสูง (Priest) · v0.63 ชุดใหม่ "ผู้พิทักษ์ชีวิต"
};
