// หน้าต่างฟักไข่ (v0.13) — ไข่สั่น → แตก → สัตว์เลี้ยงโผล่ออกมา (ฉาก 3 มิติเล็ก ๆ แยกจากโลกหลัก)
import { THREE } from '../render/three.js';
import { PetView, EggView } from '../render/Pets.js';
import { PETS, PET_RARITY, PET_DUP_ZENY } from '../data/pets.js';
import { ITEMS } from '../data/items.js';
import * as TX from '../render/FxTextures.js';

export class HatchWindow {
  constructor(root, act) {
    this.root = root;
    this.act = act;           // { again(eggId), summon(id), sound(name), closed() }
    this.open = false;
    const el = this.el = document.createElement('div');
    el.className = 'hatch-modal'; el.hidden = true;
    el.innerHTML = `<div class="panel hatch-card"><div class="hatch-stage"><canvas></canvas><div class="hatch-flash"></div></div>
      <div class="hatch-text" aria-live="polite"></div>
      <div class="hatch-btns"><button type="button" class="primary h-again"></button><button type="button" class="ghost h-summon">เรียกตัวนี้ออกมา</button><button type="button" class="ghost h-close">ปิด</button></div></div>`;
    root.append(el);
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.canvas = el.querySelector('canvas');
    el.querySelector('.h-close').addEventListener('click', () => this.close());
    el.querySelector('.h-again').addEventListener('click', () => { if (this.phase === 'done') this.act.again(this.eggId); });
    el.querySelector('.h-summon').addEventListener('click', () => { if (this.res) { this.act.summon(this.res.id); this.close(); } });
    el.addEventListener('click', (e) => { if (e.target === el && this.phase === 'done') this.close(); });
    this.keyFn = (e) => { if (!this.open) return; e.stopPropagation(); if (e.key === 'Escape' && this.phase === 'done') this.close(); };
    window.addEventListener('keydown', this.keyFn, true);
  }

  get busy() { return this.open && this.phase !== 'done'; }

  init() {
    if (this.R) return true;
    try { this.R = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true }); } catch (e) { this.R = null; return false; }
    const R = this.R;
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight('#e8f0ff', '#5a4a6a', 0.9));
    const key = new THREE.DirectionalLight('#fff0d6', 1.3); key.position.set(3, 7, 4.5); this.scene.add(key);
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshBasicMaterial({ map: TX.softDot(), color: '#6a4a8a', transparent: true, opacity: 0.6, depthWrite: false }));
    base.rotation.x = -Math.PI / 2; this.scene.add(base);
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.05, 50);
    return true;
  }

  // eggId = ไอเทมไข่ · r = { id, tier } · res = ผลจาก player.addPet · left = ไข่ชนิดนี้ที่เหลือ
  show(eggId, r, res, left) {
    this.eggId = eggId; this.res = { ...r, ...res }; this.left = left;
    this.open = true; this.el.hidden = false;
    this.el.querySelector('.hatch-text').innerHTML = `<div class="h-sub">${ITEMS[eggId].name} กำลังจะฟัก…</div>`;
    this.el.querySelector('.hatch-btns').hidden = true;
    if (!this.init()) { this.phase = 'done'; this.showText(); return; }
    if (this.egg) this.scene.remove(this.egg.root);
    if (this.pet) { this.pet.dispose(); this.pet = null; }
    this.egg = new EggView(eggId); this.scene.add(this.egg.root);
    this.phase = 'shake'; this.t = 0; this.bs = null; this.camState = null;
    const rc = this.canvas.getBoundingClientRect();
    this.R.setSize(Math.max(1, rc.width), Math.max(1, rc.height), false);
    this.cam.aspect = (rc.width || 1) / (rc.height || 1); this.cam.updateProjectionMatrix();
    this.act.sound('cast');
    this.last = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  loop(now) {
    this.raf = 0;
    if (!this.open || !this.R) return;
    this.raf = requestAnimationFrame((t) => this.loop(t));
    const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000)); this.last = now;
    this.t += dt;
    const e = this.egg;
    if (this.phase === 'shake') {
      e.shake = Math.min(1, this.t / 1.6) ** 1.5;
      if (this.t >= 1.6) {
        this.phase = 'open'; this.t = 0; e.hatch(); e.shake = 0;
        const f = this.el.querySelector('.hatch-flash'); f.style.transition = 'none'; f.style.opacity = 0.9;
        requestAnimationFrame(() => { f.style.transition = 'opacity 0.6s'; f.style.opacity = 0; });
        this.pet = new PetView(this.res.id, { world: this.scene, stars: this.res.stars });
        this.pet.setViewport(this.canvas.getBoundingClientRect().height * this.R.getPixelRatio(), this.cam.fov);
        this.pet.update(0.001); this.bs = this.pet.bounds();
        this.pet.root.scale.setScalar(0.001); this.scene.add(this.pet.root);
        this.act.sound(['mythic', 'celestial'].includes(this.res.tier) ? 'mvp' : ['legend', 'epic'].includes(this.res.tier) ? 'levelUp' : 'questDone');
        setTimeout(() => this.pet && this.pet.cheer(), 450);
        this.phase = 'done';
        this.showText();
      }
    }
    e.update(dt);
    let tgt = new THREE.Vector3(0, 0.33, 0), d = 1.9;
    if (this.pet) {
      const k = Math.min(1, this.t / 0.55), s = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k) : 1;
      this.pet.root.scale.setScalar(Math.max(0.001, k * s));
      this.pet.update(dt, { moving: false });
      this.pet.root.rotation.y = Math.sin(performance.now() / 1600) * 0.4;
      tgt = this.bs.center.clone(); d = Math.max(1.4, (this.bs.radius / Math.sin((this.cam.fov * Math.PI) / 360)) * 1.5);
    }
    const C = this.camState = this.camState || { tgt: tgt.clone(), d };
    C.tgt.lerp(tgt, 1 - Math.exp(-4 * dt)); C.d += (d - C.d) * (1 - Math.exp(-4 * dt));
    this.cam.position.set(C.tgt.x + Math.sin(0.35) * C.d, C.tgt.y + C.d * 0.25, C.tgt.z + Math.cos(0.35) * C.d);
    this.cam.lookAt(C.tgt);
    this.R.render(this.scene, this.cam);
  }

  showText() {
    const r = this.res, P = PETS[r.id], col = PET_RARITY[r.tier].color;
    const kind = r.kind === 'new' ? 'ตัวใหม่!' : r.kind === 'star' ? `ได้ตัวซ้ำ → ดาว +1 (★${r.stars})` : `ครบ ★5 แล้ว → รับ ${PET_DUP_ZENY[r.tier].toLocaleString('en-US')} Zeny`;
    const box = this.el.querySelector('.hatch-text');
    box.innerHTML = `<span class="h-badge" style="--tc:${col}">ระดับ ${PET_RARITY[r.tier].name}</span><div class="h-name" style="color:${col}"></div><div class="h-sub"></div><div class="h-skill"></div>`;
    box.querySelector('.h-name').textContent = `ได้ ${P.name}!`;
    box.querySelector('.h-sub').textContent = kind;
    box.querySelector('.h-skill').textContent = `${P.skill.name}: ${P.skill.desc}`;
    const btns = this.el.querySelector('.hatch-btns'); btns.hidden = false;
    const again = btns.querySelector('.h-again');
    again.textContent = this.left > 0 ? `ฟักอีก (เหลือ ${this.left})` : 'ไม่มีไข่ชนิดนี้แล้ว';
    again.disabled = this.left <= 0;
  }

  close() {
    if (!this.open) return;
    this.open = false; this.el.hidden = true;
    if (this.pet) { this.pet.dispose(); this.pet = null; }
    if (this.act.closed) this.act.closed();
  }
}
