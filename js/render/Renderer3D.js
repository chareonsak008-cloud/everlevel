// ตัววาดโลก 3 มิติ: แสงเงา, กล้อง, สร้างฉากจากข้อมูลแผนที่, ป้ายชื่อ
import { SheetSprite, liveSheet, screenDir, sheetOf, registerSheet } from './SheetChars.js?v=0.93.0-p3.34';
import { NPC_SHEETS, NPC_SPRITES, npcSheetDef } from '../data/npcSprites.js?v=0.93.0-p3.34';   // fix21 NPC ภาพพิกเซล
for (const [k, d] of Object.entries(NPC_SHEETS)) registerSheet(k, npcSheetDef(d));
import { PixelWingSprite } from './PixelWings.js?v=0.93.0-p3.34';
import { SeraphWings } from './SeraphWings.js?v=0.93.0-p3.34';   // v0.95 ปีกเทวทูต 6 ปีก (โมเดล 3 มิติ หมุนตามตัวแบบลื่น)
import { paintPlate } from '../ui/Nameplates.js?v=0.93.0-p3.34';
import { PixelVfx } from './PixelVfx.js?v=0.93.0-p3.34';
import { THREE } from './three.js?v=0.93.0-p3.34';
import { TILE } from '../config.js?v=0.93.0-p3.34';
import { T } from '../data/tileTypes.js?v=0.93.0-p3.34';
import { rng, lerp, lerpAngle, damp, clamp } from '../core/util.js?v=0.93.0-p3.34';
import { pumpkinHat, townDecor } from './Halloween.js?v=0.93.0-p3.34';   // fix15
import { PXAA } from './PixelGround.js?v=0.93.0-p3.34';
import { GrandPortal, GrandFx, setGrandViewport, screenFlash } from './GrandFx.js?v=0.93.0-p3.34';
import { groundTexture, skyTexture, glowTexture, blobShadowTexture, magicCircleTexture, beamTexture } from './Textures.js?v=0.93.0-p3.34';
import { batchStatic, mergeGeometries, std, lin } from './Geo.js?v=0.93.0-p3.34';
import {
  BUILDERS, cityWalls, bridges, setPixelModels, glowSprite, roundTreeGeometry, pineGeometry, treeMaterial, snowPineGeometry, snowTreeGeometry, deadTreeGeometry,
  grassTuftGeometry, flowerGeometry, rockGeometry,
} from './Models.js?v=0.93.0-p3.34';
import { CharacterView, CHAR_HEAD } from './Characters.js?v=0.93.0-p3.34';
import { iconCanvas } from './ItemIcons.js?v=0.93.0-p3.34';
import { ITEMS, RARITY } from '../data/items.js?v=0.93.0-p3.34';
import { MonsterView } from './Monsters.js?v=0.93.0-p3.34';
import { Water, FountainSpray, Portal, Motes, ClickMarker, Bursts, TargetRing, Campfire, MagicCircles, WarpCrystal, Projectiles, Strikes, Telegraphs, AutoZone } from './Effects.js?v=0.93.0-p3.34';
import { SkillFX } from './SkillFX.js?v=0.93.0-p3.34';
import { PostFX } from './PostFX.js?v=0.93.0-p3.34';
import { Weather } from './Weather.js?v=0.93.0-p3.34';   // v0.91 สภาพอากาศ
import { costumeLook, wearCostume } from './Costumes.js?v=0.93.0-p3.34';
import { TIER_RANK } from '../data/fashionBoxes.js?v=0.93.0-p3.34';
import { PetView } from './Pets.js?v=0.93.0-p3.34';
import { PixelSprites, PX_LAYER, PIXEL, PX } from './PixelSprites.js?v=0.93.0-p3.34';
import { pixelGround, PixelWater } from './PixelGround.js?v=0.93.0-p3.34';
import { roundTreePx, pinePx, snowTreePx, snowPinePx, deadTreePx, bushPx, grassTuftPx, flowerPx, rockPx, floraMaterial, vcToon } from './PixelFlora.js?v=0.93.0-p3.34';
import { gradientMap } from './Toon.js?v=0.93.0-p3.34';
import { paintHonor, injectTitleCss } from '../ui/TitleFx.js?v=0.93.0-p3.34';
// v0.86 กลางวัน · ตอนเย็น · กลางคืน · รุ่งสาง — ตัวคูณแสง (h=ฟ้า s=แดด e=exposure) + สีที่ผสมเข้าไป (mix)
const DAY_PRESETS = {
  day: { name: 'กลางวัน', icon: '☀', h: 1, s: 1, e: 1, mix: 0, glow: 1, tint: [0, 0, 0, 0] },
  evening: { name: 'ตอนเย็น', icon: '🌇', h: 0.86, s: 0.78, e: 0.99, mix: 0.5, sky: '#ffc08a', ground: '#7a5038', sun: '#ff9a52', fog: '#e8a878', glow: 1.1, tint: [255, 120, 40, 0.16] },
  night: { name: 'กลางคืน', icon: '🌙', h: 0.5, s: 0.28, e: 0.93, mix: 0.66, sky: '#6a7ec8', ground: '#283050', sun: '#9ab0ff', fog: '#1e2a4c', glow: 1.3, tint: [14, 24, 72, 0.48] },
  dawn: { name: 'รุ่งสาง', icon: '🌅', h: 0.84, s: 0.72, e: 0.98, mix: 0.42, sky: '#ffc8d8', ground: '#6a5060', sun: '#ffd0a8', fog: '#dcb8c8', glow: 1.1, tint: [255, 150, 170, 0.12] },
};
// รอบวันละ 0–1: กลางวัน 0–0.55 → เย็น 0.63–0.70 → กลางคืน 0.77–0.93 → รุ่งสาง 0.97 → กลางวัน
const DAY_KEYS = [[0, 'day'], [0.55, 'day'], [0.63, 'evening'], [0.7, 'evening'], [0.77, 'night'], [0.93, 'night'], [0.97, 'dawn'], [1, 'day']];
const _dayCol = new THREE.Color(), _dc1 = new THREE.Color(), _dc2 = new THREE.Color();
function dayPreset(f) {
  f = ((f % 1) + 1) % 1;
  let i = 0; while (i < DAY_KEYS.length - 2 && f >= DAY_KEYS[i + 1][0]) i++;
  const [f0, a] = DAY_KEYS[i], [f1, b] = DAY_KEYS[i + 1], A = DAY_PRESETS[a], B = DAY_PRESETS[b];
  const k = f1 > f0 ? (f - f0) / (f1 - f0) : 0, sm = k * k * (3 - 2 * k), L = (x, y) => x + (y - x) * sm;
  const col = (key) => { const ca = A[key], cb = B[key]; if (!ca && !cb) return null; _dc1.set(ca || cb); _dc2.set(cb || ca); return '#' + _dc1.lerp(_dc2, sm).getHexString(); };
  const ma = A.mix, mb = B.mix;
  return { name: sm < 0.5 ? A.name : B.name, icon: sm < 0.5 ? A.icon : B.icon, phase: sm < 0.5 ? a : b,
    h: L(A.h, B.h), s: L(A.s, B.s), e: L(A.e, B.e), mix: L(ma, mb), glow: L(A.glow, B.glow),
    tint: [0, 1, 2, 3].map((i) => L(A.tint[i], B.tint[i])),
    sky: col('sky'), ground: col('ground'), sun: col('sun'), fog: col('fog') };
}
export const dayPhaseOf = (f) => dayPreset(f);
const HONOR_FX_PAD = { legend: 6, mythic: 12, divine: 16 };   // v0.83 ลายประดับฉายาระดับสูงที่ยื่นเหนือกรอบ (px)
const HONOR_H = { common: 22, rare: 24, epic: 30, legend: 36, mythic: 46, divine: 54 };   // v0.76 ระยะซ้อนฉายาแต่ละระดับ (px)
const PX_BASE = (() => { const a = new THREE.Color('#dcefff'), b = new THREE.Color('#fff0d6'); return { r: a.r * 0.72 + b.r * 1.45 * 0.5, g: a.g * 0.72 + b.g * 1.45 * 0.5, b: a.b * 0.72 + b.b * 1.45 * 0.5 }; })();   // v0.17: สไปรต์พิกเซลอาร์ต   // v0.13: สัตว์เลี้ยงช่วยเก็บของ

// ความแรงแสงเรืองของแฟชั่นระดับล้ำค่าขึ้นไป (ตอนไม่มีเอฟเฟกต์สกิล)
const COSTUME_GLOW = 1.6;

const S = 1 / TILE; // พิกัดโลก (px) → หน่วย 3 มิติ
const isRareDrop = (it) => !!it && (it.type === 'card' || it.type === 'box' || ['rare', 'epic', 'legend', 'mythic', 'celestial', 'abyssal', 'divine', 'eternal'].includes(it.rarity));

// v0.16: คืนหน่วยความจำ GPU ของเท็กซ์เจอร์ที่ชุดแฟชั่นโคลนไว้ใช้เฉพาะตัว (เท็กซ์เจอร์ที่ใช้ร่วมกันไม่ถูกลบ)
// v0.16: เขียน DOM เฉพาะตอนค่าเปลี่ยน (ป้ายชื่อ/แถบเลือดขยับทุกเฟรม → ลดงาน layout บนมือถือ)
const setT = (el, v) => { if (el._t !== v) { el.style.transform = v; el._t = v; } };
const setH = (el, h) => { if (el.hidden !== h) el.hidden = h; };
const setV = (el, on) => { const v = on ? 'visible' : 'hidden'; if (el._v !== v) { el.style.visibility = v; el._v = v; } };
// ความละเอียดตามระดับคุณภาพ (มือถือเริ่ม 1.5 เท่า แทน 1.75)
const RATIOS = { mobile: [1.5, 1.25, 1, 0.85], desktop: [2, 1.25, 1, 0.8] };
const RATIOS_HD = { mobile: [2, 1.6, 1.25, 0.85], desktop: [2, 1.75, 1.25, 1] };   // v0.89 ภาพ HD ใช้ความละเอียดสูงกว่า
// v0.17.1: กล้องมองจากด้านบนแบบเกม RO (โหมดพิกเซล) — ก้ม 60° · มุมมองแคบ 15° (ภาพแทบไม่ลึก ตึกไม่เอียง) · ซูมออกได้ไกลขึ้น
// ระยะกล้อง (dist) เก็บเป็น "ระยะเทียบกล้องเดิม" (fov 32°) แล้วคูณ distScale ตอนวางกล้องจริง → กรอบภาพเท่าเดิมทุก fov
// ปรับมุมก้มเองได้ (คลิกขวาลากขึ้นลง / สองนิ้วลากขึ้นลง / PageUp PageDown)
const D2R = Math.PI / 180;
const CAM = {
  d3: { pitch: 0.8, pmin: 0.8, pmax: 0.8, fov: 32, fovP: 52, min: 7, max: 31, def: 13 },
  px: { pitch: 60 * D2R, pmin: 45 * D2R, pmax: 75 * D2R, fov: 15, fovP: 24, min: 6.5, max: 40, def: 17 },
};
const CAM_FAR = 1.3, CAM_FAR_P = 1.4;   // v0.88 ถอยกล้องออกจากขั้นพิกเซล 1:1 อีก 30%
const SPRITE_PITCH = 20 * D2R;   // มุมที่ "ช่างวาด" มองสไปรต์ (ดู PixelSprites.js)

function disposeOwned(root) {
  root.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m && m[k] && m[k].isOwned) { m[k].dispose(); m[k] = null; }
  });
}

const NPC_SCALE = 1.4;   // v0.41.1 NPC (โมเดล 3 มิติ) ขยายให้สูงพอ ๆ กับตัวละครผู้เล่นแบบพิกเซล

// v0.93 แผ่นพื้นหลังไอเทมบนพื้น (สี่เหลี่ยมมุมมน ขอบเข้ม) — ย้อมสีตามระดับ
let _plateTex = null;
function dropPlateTexture() {
  if (_plateTex) return _plateTex;
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = 'rgba(20,14,28,0.9)'; rr(1, 1, 30, 30, 7); g.fill();
  g.fillStyle = '#ffffff'; rr(3, 3, 26, 26, 6); g.fill();
  const gr = g.createLinearGradient(0, 3, 0, 29); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = gr; rr(3, 3, 26, 26, 6); g.fill();
  _plateTex = new THREE.CanvasTexture(c); _plateTex.magFilter = THREE.NearestFilter; _plateTex.minFilter = THREE.LinearFilter; _plateTex.generateMipmaps = false;
  return _plateTex;
}

export class Renderer3D {
  constructor(canvas, labelLayer) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    injectTitleCss();   // v0.30: เอฟเฟ็กฉายา
    this.mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    try { this.safe = localStorage.getItem('everlevel.safe') === '1'; } catch (e) { this.safe = false; }   // v0.93 fix14 โหมดภาพประหยัด

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.mobile, powerPreference: 'high-performance' });   // v0.27.1: มือถือไม่ใช้ MSAA (ภาพพิกเซลไม่ต้องใช้ · ประหยัดแบนด์วิดท์)
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = true;
    r.shadowMap.type = this.mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // v0.16: มือถืออัปเดตเงาเว้นเฟรม (ภาพแทบไม่ต่าง · งานเงาลดครึ่ง)
    r.shadowMap.autoUpdate = !this.mobile; this.frameN = 0;

    this.scene = new THREE.Scene();
    this.scene.autoUpdate = false;   // v0.27.1: อัปเดตเมทริกซ์เองครั้งเดียวต่อเฟรม (เดิมซ้ำ 2 รอบทั้งฉาก)
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog('#d9e4e6', 34, 80);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 220);
    this.rig = { target: new THREE.Vector3(), yaw: 0, targetYaw: 0, dist: 13, targetDist: 13, pitch: 0.8, targetPitch: 0.8 };
    this.vs = 1;   // v0.17.1: ตัวคูณความสูงของจุดบนตัว (มือ/อก/หัว) ให้ตรงกับภาพสไปรต์เมื่อกล้องก้มชันกว่ามุมวาดสไปรต์

    // แสง: ฟ้า + แดดบ่ายอุ่น ๆ ที่ทอดเงา
    this.hemi = new THREE.HemisphereLight('#dcefff', '#6d7f48', 0.72);
    this.scene.add(this.hemi);
    this.shakeAmp = 0;
    const sun = this.sun = new THREE.DirectionalLight('#fff0d6', 1.45);
    sun.castShadow = true;
    const sz = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(sz, sz);
    const sc = sun.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 70;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
    this.sunOffset = new THREE.Vector3(-10, 20, 12);
    this.scene.add(sun, sun.target);

    this.windTime = { value: 0 };
    this.characters = new Map();
    this.pxvfx = null;   // v0.34: เอฟเฟกต์สกิลพิกเซล (สร้างเมื่อใช้ครั้งแรก)
    // v0.17: สไปรต์พิกเซลอาร์ต (โมเดลจริงอยู่เลเยอร์ 1 ไม่วาดลงฉากหลัก แต่ยังทอดเงา)
    this.px = new PixelSprites(r, this.scene, this.camera, { mobile: this.mobile });
    this.sun.shadow.camera.layers.enable(PX_LAYER);
    this.hitboxes = [];
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.tmp = new THREE.Vector3();
    this.time = 0;
    this.floats = [];
    this.emotes = [];
    this.dropViews = new Map();   // ของที่ตกบนพื้น
    this.iconTex = new Map();
    this.dropLabel = document.createElement('div'); this.dropLabel.className = 'tag tag-item'; this.dropLabel.hidden = true;
    labelLayer.append(this.dropLabel);
    this.hover = null;
    this.target = null;

    // v0.8: เอฟเฟกต์สกิลชุดใหม่ + โพสต์โปรเซส (เรืองแสง · คลื่นกระแทก · แสงวาบ)
    this.fx = new SkillFX(this.scene, { pool: this.mobile ? 0.6 : 1, lights: this.mobile ? 2 : 3 });
    this.fx.camera = this.camera;   // v0.31.1: ริบบิ้น HD หันหากล้อง
    // v0.16: มือถือไม่ใช้ MSAA บนบัฟเฟอร์โพสต์ และใช้บัฟเฟอร์ 8 บิต sRGB (ไม่ต้องคอมไพล์เชดเดอร์ชุดที่สอง · ประหยัดแบนด์วิดท์)
    this.post = new PostFX(r, { msaa: this.mobile ? 0 : 4, strength: 1.0, linear: !this.mobile });
    this.post.pxOn = this.px.enabled;   // v0.17: ฉากแบบพิกเซลตามโหมดเดียวกัน
    this.camMode(true);                 // v0.17.1: กล้องตามโหมด
    document.body.classList.toggle('pxmode', this.px.enabled);
    // ไฟจริง 2 ดวงสำหรับกองไฟ/ปล่องลาวา/ประตูมิติที่ใกล้ที่สุด (แทนไฟดวงละจุด)
    this.propLights = [0, 1].map(() => { const l = new THREE.PointLight('#ff9a40', 0, 7, 2); this.scene.add(l); return l; });
    this.lightPickT = 0; this.lightPick = [];
    this.sky = { dark: 0, t: 0, dur: 0 };
    this.punchAmt = 0;
    this.baseLight = { hemi: this.hemi.intensity, sun: this.sun.intensity };
    // v0.9: อนุภาคของชุดแฟชั่น (ออร่า ปีก ผู้ติดตาม) อยู่ในพิกัดโลก แยกจากฉากแผนที่ ไม่ถูกล้างตอนวาร์ป
    this.costumeWorld = new THREE.Group(); this.costumeWorld.name = 'costumes';
    this.scene.add(this.costumeWorld);
    this.baseGlow = 0.7;
    // v0.13: สัตว์เลี้ยง (key = ออบเจ็กต์ตำแหน่งของสัตว์เลี้ยง) + ของที่ลอยเข้าหาสัตว์เลี้ยง/ผู้เล่น
    this.pets = new Map();
    this.flyDrops = [];
    this.rareBeam = false;
  }

  /* ---------- สร้างฉากจากแผนที่ ---------- */
  // ลบฉากเดิม + ตัวละครที่ไม่ใช่ผู้เล่น (คืนหน่วยความจำ GPU)
  clearWorld() {
    if (this.world) {
      this.scene.remove(this.world);
      this.world.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.isPoints || o.isSprite) o.material.dispose();
      });
      if (this.groundTex) { this.groundTex.dispose(); this.groundTex = null; }
      if (this.pground) { this.pground.dispose(); this.pground = null; }
      this.groundGroup = null;
      if (this.water) for (const m of [this.water.base, this.water.l1, this.water.l2]) { if (m.map) m.map.dispose(); m.dispose(); }
      this.world = null;
    }
    for (const [entity, c] of [...this.characters]) {
      if (c.kind === 'player') continue;
      this.removeActor(entity);
    }
    for (const f of this.floats) f.el.remove();
    for (const e of this.emotes) e.el.remove();
    this.dropViews.clear(); this.dropHits = []; this.hoverDrop = null; this.dropLabel.hidden = true;
    this.flyDrops = [];
    this.floats = []; this.emotes = [];
    this.hover = null; this.target = null;
  }

  buildWorld(map) {
    this.clearWorld();
    this.map = map;
    setPixelModels(this.px.enabled);   // v0.17: สิ่งปลูกสร้างใช้วัสดุพิกเซล
    const scene = this.scene, r = rng(99);
    const theme = map.def.theme || {};
    scene.fog.color.set(theme.fog || '#d9e4e6');
    // แสงตามธีมแผนที่ (ป่าทึบจะมืดและหมอกใกล้กว่า)
    const L = theme.light || {};
    scene.fog.near = theme.fogNear || 34; scene.fog.far = theme.fogFar || 80;
    this.fogBase = { near: scene.fog.near, far: scene.fog.far };   // v0.17.1: กล้องแบบ RO อยู่ไกลกว่า → หมอกนับจากจุดที่มอง (ดู updateCamera)
    this.hemi.intensity = L.hemi ?? 0.72;
    this.hemi.color.set(L.sky || '#dcefff'); this.hemi.groundColor.set(L.ground || '#6d7f48');
    this.sun.intensity = L.sun ?? 1.45; this.sun.color.set(L.sunColor || '#fff0d6');
    this.renderer.toneMappingExposure = L.exposure ?? 0.92;
    this.baseLight = { hemi: this.hemi.intensity, sun: this.sun.intensity };
    // v0.86 กลางวัน/ตอนเย็น/กลางคืน: จำค่าแสงของแผนที่ไว้เป็นค่ากลางวัน (ดันเจี้ยน/สนามประลอง = ในร่ม ไม่เปลี่ยน)
    this.themeLight = { hemi: this.hemi.intensity, sun: this.sun.intensity, exposure: this.renderer.toneMappingExposure,
      sky: this.hemi.color.clone(), ground: this.hemi.groundColor.clone(), sunColor: this.sun.color.clone(), fog: scene.fog.color.clone(), glow: null };
    this.dayIndoor = !!(map.def.instance || theme.indoor);
    this.applyDay(true);
    this.sky.dur = 0;
    this.fx.clear(); this.post.reset(); this.punchAmt = 0;
    // ความสว่างเอฟเฟกต์ตามแผนที่: กลางแจ้งสว่าง → ลดแสงบวก/เรืองลง ไม่ให้ขาวโพลน
    const FXL = theme.fx || {};
    this.fx.setGain(FXL.gain ?? 0.72);
    this.post.strength = this.baseGlow = FXL.glow ?? 0.7;
    this.post.flashScale = FXL.flash ?? 0.6;
    const world = this.world = new THREE.Group(); scene.add(world);
    this.chestObjs = new Map(); this.elites = [];   // fix17
    this.hwDecor = null;   // fix15 ของตกแต่งฮาโลวีน (อยู่ใน world → ลบไปพร้อมแผนที่)

    // พื้น
    this.makeGround(map);

    const statics = new THREE.Group();
    if (!theme.rockWall) statics.add(cityWalls(map, T.WALL));   // v0.32: ถ้ำใช้ผนังหินขรุขระแทนกำแพงเมือง
    statics.add(bridges(map, T.BRIDGE, T.WATER));

    this.water = this.px.enabled ? new PixelWater(theme.water || 'water') : new Water(theme.water || 'water');
    this.glows = []; this.flags = []; this.sprays = []; this.portals = []; this.fires = []; this.crystals = [];
    this.pools = [];   // v0.89 วงแสงบนพื้นตอนกลางคืน (ตะเกียง กองไฟ คริสตัล)
    const trees = { round: [], pine: [] };

    for (const o of map.objects) {
      if (o.kind === 'tree' || o.kind === 'pine') {
        trees[o.kind === 'tree' ? 'round' : 'pine'].push({ x: o.cx, z: o.cy, seed: o.def.seed || 1, vs: o.def.vs || 1 });
        continue;
      }
      const build = (this.px.enabled && this.pxBuilders()[o.kind]) || BUILDERS[o.kind]; if (!build) continue;
      const m = build(o.def), vs = o.def.vs || 1;   // v0.41.1 vs = ขยายโมเดล (เมืองขยาย)
      m.position.set(o.cx, 0, o.cy); if (vs !== 1) m.scale.setScalar(vs);
      if (o.def.rot) m.rotation.y = o.def.rot;
      statics.add(m);
      if (o.kind === 'lamp') {
        for (const sx of [-1, 1]) { const gl = glowSprite('#ffc970', 0.8 * vs, 0.3); gl.position.set(o.cx + sx * 0.32 * vs, 1.85 * vs, o.cy); world.add(gl); this.glows.push(gl); }
        this.addPool(world, o.cx, o.cy, 3.0 * vs, '#ffc070', 1);
      }
      if (o.kind === 'campfire' || o.kind === 'vent') this.addPool(world, o.cx, o.cy, 3.8 * vs, '#ff9a48', 1.1);
      if (o.kind === 'warpstone') this.addPool(world, o.cx, o.cy, 2.8 * vs, o.def.color || '#8fd8ff', 0.8);
      if (o.kind === 'campfire' || o.kind === 'vent') this.fires.push(new Campfire(world, o.cx, o.cy, vs));
      if (o.kind === 'warpstone') this.crystals.push(new WarpCrystal(world, o.cx, o.cy, o.def.color, vs));
      if (m.userData.glow) { const gl = glowSprite(m.userData.glow.color, 1.7 * vs, 0.32); gl.position.set(o.cx, m.userData.glow.y * vs, o.cy); world.add(gl); this.glows.push(gl); }
      if (o.kind === 'fountain') {
        this.water.add(world, new THREE.CircleGeometry(1.34 * vs, 48).rotateX(-Math.PI / 2).translate(o.cx, 0, o.cy), 0.55, 3);
        this.water.add(world, new THREE.CircleGeometry(0.5 * vs, 24).rotateX(-Math.PI / 2).translate(o.cx, 0, o.cy), 1.5 * vs, 1);
        this.sprays.push(new FountainSpray(world, o.cx, o.cy));
      }
    }
    statics.traverse((o) => { if (o.userData.flag) this.flags.push(o); });

    // บ่อน้ำจากช่อง WATER + หินริมบ่อ
    const waterQuads = [], rockSpots = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const tt = map.tileAt(x, y);
      if (tt !== T.WATER && tt !== T.BRIDGE) continue;
      waterQuads.push(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(x + 0.5, 0, y + 0.5));
      if (tt === T.BRIDGE) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nt = map.tileAt(x + dx, y + dy);
        if (nt === T.WATER || nt === T.BRIDGE || nt === -1) continue;
        for (let k = 0; k < 2; k++) {
          const t = r();
          rockSpots.push({ x: dx === 0 ? x + t : x + (dx > 0 ? 1.05 : -0.05), z: dy === 0 ? y + t : y + (dy > 0 ? 1.05 : -0.05) });
        }
      }
    }
    if (waterQuads.length) this.water.add(world, mergeGeometries(waterQuads), 0.06, 4);
    const rockTint = theme.water === 'lava' ? (c) => c.setRGB(0.32, 0.26, 0.26) : theme.water === 'ice' ? (c) => c.setRGB(1.05, 1.1, 1.18) : (c) => c.setRGB(1, 1, 1);   // v0.32: ย้อมสีเสมอ (วัสดุหินใช้ร่วมกันทุกแผนที่ — มี/ไม่มี instanceColor สลับกันทำให้เรนเดอร์ค้าง)
    const PXW = this.px.enabled;   // v0.17: โหมดพิกเซลใช้ต้นไม้/หิน/หญ้าชุดใหม่
    this.instanced(world, PXW ? rockPx(3) : rockGeometry(3), PXW ? vcToon() : std('rock', { vertexColors: true, roughness: 0.9 }), rockSpots.map((p) => ({ ...p, s: 0.8 + r() * 0.9, rot: r() * 6 })), { cast: true, tint: rockTint });

    // v0.32: ผนังถ้ำ — หินแหลมสูงเรียงตามขอบช่องผนังที่ติดพื้นเดินได้
    if (theme.rockWall) {
      const rr = rng(map.w * 31 + map.h), spots = [];
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        if (map.tileAt(x, y) !== T.WALL) continue;
        let edge = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = map.tileAt(x + dx, y + dy); if (t !== -1 && t !== T.WALL) edge++; }
        if (!edge) { if (rr() < 0.06) spots.push({ x: x + rr(), z: y + rr(), s: 3 + rr() * 2, rot: rr() * 6 }); continue; }
        spots.push({ x: x + 0.5 + (rr() - 0.5) * 0.3, z: y + 0.5 + (rr() - 0.5) * 0.3, s: 4.2 + rr() * 2.2, rot: rr() * 6 });
        if (rr() < 0.5) spots.push({ x: x + rr(), z: y + rr(), s: 2.6 + rr() * 1.6, rot: rr() * 6 });
      }
      const g0 = PXW ? rockPx(7) : rockGeometry(7), cg = g0.clone(); cg.scale(1, 3.4, 1); cg.computeBoundingSphere();
      const wc = new THREE.Color(theme.wallColor || '#2a2430').convertSRGBToLinear();
      // วัสดุแยกจากหินริมน้ำ: หินผนังถ้ำย้อมสีรายก้อน (instanceColor) — ใช้วัสดุร่วมกับหินที่ไม่ย้อมสีแล้ว three.js สลับโปรแกรมผิดจนค้าง
      const cmat = PXW ? (this._caveMat || (this._caveMat = vcToon().clone())) : std('caveRock', { vertexColors: true, roughness: 0.95 });
      this.instanced(world, cg, cmat, spots, { cast: true, tint: (c, v) => c.setRGB(wc.r * 3.2 + v * 0.12, wc.g * 3.2 + v * 0.12, wc.b * 3.2 + v * 0.14) });
    }

    // ต้นไม้ (รวมป่ารอบนอกแผนที่เพื่อความลึก)
    for (let i = 0; i < (theme.noOuterTrees ? 0 : 170); i++) {
      const side = i % 4; const t = r(); const d = 1 + r() * 9;
      const x = side === 0 ? -d : side === 1 ? map.w + d : t * (map.w + 16) - 8;
      const z = side === 2 ? -d : side === 3 ? map.h + d : t * (map.h + 16) - 8;
      (r() < 0.35 ? trees.pine : trees.round).push({ x, z, seed: i });
    }
    const tm = PXW ? floraMaterial() : treeMaterial(); this.addWind(tm, 0.035, 0.9, !PXW);   // v0.27.1: โหมดพิกเซลไม่เจาะตาข่ายต้นไม้ (เกิดเส้นขอบดำเป็นลายหมากรุก) → ใช้เงาทะลุของตัวละครแทน
    // v0.11: ต้นไม้ตามธีม — สนหิมะ / ต้นไม้ไหม้เกรียม
    const TT = theme.trees;
    const roundGeos = PXW
      ? (TT === 'snow' ? [snowTreePx(11), snowTreePx(23), snowTreePx(37)] : TT === 'dead' ? [deadTreePx(11), deadTreePx(23), deadTreePx(37)] : [roundTreePx(11), roundTreePx(23), roundTreePx(37), roundTreePx(51)])
      : (TT === 'snow' ? [snowTreeGeometry(11), snowTreeGeometry(23)] : TT === 'dead' ? [deadTreeGeometry(11), deadTreeGeometry(23), deadTreeGeometry(37)] : [roundTreeGeometry(11), roundTreeGeometry(23), roundTreeGeometry(37)]);
    const pineGeos = PXW
      ? (TT === 'snow' ? [snowPinePx(5), snowPinePx(9)] : TT === 'dead' ? [deadTreePx(5), deadTreePx(9)] : [pinePx(5), pinePx(9), pinePx(13)])
      : (TT === 'snow' ? [snowPineGeometry(5), snowPineGeometry(9)] : TT === 'dead' ? [deadTreeGeometry(5), deadTreeGeometry(9)] : [pineGeometry(5), pineGeometry(9)]);
    const tint = PXW ? (TT ? (c, v) => c.setRGB(0.94 + v * 0.1, 0.94 + v * 0.1, 0.95 + v * 0.1) : (c, v) => c.setRGB(0.9 + v * 0.18, 0.92 + v * 0.14, 0.88 + v * 0.16))
      : TT ? (c, v) => c.setRGB(0.9 + v * 0.15, 0.9 + v * 0.15, 0.92 + v * 0.15) : (c, v) => c.setRGB(0.82 + v * 0.3, 0.86 + v * 0.22, 0.8 + v * 0.25);
    roundGeos.forEach((geo, gi) => {
      const list = trees.round.filter((t) => t.seed % roundGeos.length === gi);
      this.instanced(world, geo, tm, list.map((t) => ({ ...t, s: (0.95 + ((t.seed * 37) % 10) / 22) * (t.vs || 1), rot: t.seed * 1.7 })), { cast: true, tint });
    });
    pineGeos.forEach((geo, gi) => {
      const list = trees.pine.filter((t) => t.seed % pineGeos.length === gi);
      this.instanced(world, geo, tm, list.map((t) => ({ ...t, s: (1.0 + ((t.seed * 13) % 10) / 20) * (t.vs || 1), rot: t.seed * 2.3 })), { cast: true, tint });
    });

    // หญ้าเป็นกอ + ดอกไม้ 3 มิติ (โยกตามลม)
    const gm = PXW ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), side: THREE.DoubleSide }) : std('grassTuft', { vertexColors: true, roughness: 1, side: THREE.DoubleSide }); this.addWind(gm, 0.25, 0);
    const tufts = [], flowers = [];
    const fcols = (theme.flowers || ['#ffe36b', '#ff8fb8', '#ffffff', '#a9c8ff', '#ffb36b', '#d59bff']).map(lin);
    const tuftOn = theme.tufts !== false;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tileAt(x, y); if (map.solid[map.idx(x, y)]) continue;
      if (t === T.GRASS && tuftOn && r() < 0.6) tufts.push({ x: x + r(), z: y + r(), s: 0.8 + r() * 0.8, rot: r() * 6 });
      if (t === T.FLOWERS) for (let k = 0; k < 6; k++) flowers.push({ x: x + r(), z: y + r(), s: 0.8 + r() * 0.5, rot: r() * 6, color: fcols[(r() * fcols.length) | 0] });
      if (t === T.FLOWERS && tuftOn && r() < 0.8) tufts.push({ x: x + r(), z: y + r(), s: 1, rot: r() * 6 });
    }
    this.grass = this.instanced(world, PXW ? grassTuftPx() : grassTuftGeometry(), gm, tufts, { cast: false });
    const fm = PXW ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap() }) : std('flowerMat', { vertexColors: true, roughness: 0.8 }); this.addWind(fm, 0.25, 0);
    this.flowers = this.instanced(world, PXW ? flowerPx() : flowerGeometry(), fm, flowers, { cast: false });

    // รวม mesh นิ่งทั้งหมด → draw call น้อย ลื่นไหล
    world.add(batchStatic(statics));
    world.add(statics); // ชิ้นที่ขยับได้ (ธง) ยังอยู่ในกลุ่มเดิม

    for (const p of map.portals) this.portals.push((this.safe ? new Portal(world, p.cx * S, p.cy * S, !!p.locked) : new GrandPortal(world, p.cx * S, p.cy * S, !!p.locked)));
    this.motes = new Motes(world, theme.motes || '#fff3c4', theme.moteCount || 90, theme.moteSize || 0.1, theme.motesMode || 'float');
    this.weather = new Weather(world, map.id, { mobile: this.mobile });   // v0.91 ฝน หิมะ ใบไม้ หิ่งห้อย เถ้าถ่าน
    this.weather.group.visible = (this.qualityLevel || 0) < 3 && this.weatherOn !== false;
    // ลำแสงแดดส่องลอดยอดไม้ (ธีมป่า)
    if (theme.sunbeams) {
      const br = rng(321), mat = new THREE.MeshBasicMaterial({ map: beamTexture(), color: theme.beamColor || '#fff2c0', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0, tries = 0; i < theme.sunbeams && tries < 400; tries++) {
        const tx = Math.floor(br() * map.w), ty = Math.floor(br() * map.h);
        if (map.isSolidTile(tx, ty)) continue;
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.2 + br() * 1.6, 10), mat);
        beam.position.set(tx + 0.5, 4.2, ty + 0.5); beam.rotation.set(0, br() * Math.PI, 0.38);
        world.add(beam); i++;
      }
    }
    this.marker = new ClickMarker(world);
    this.autoZone = new AutoZone(world);   // v0.14: วงเขตตีออโต้
    this.bursts = new Bursts(world);
    this.ring = new TargetRing(world);
    this.circles = new MagicCircles(world);
    this.grand = new GrandFx(world, this.camera, {   // v2: ต่อเข้ากับโพสต์โปรเซส (คลื่นบิดภาพ แสงวาบ กล้องสั่น เส้นความเร็ว)
      impact: (x, z, color, s, sh) => { this.post.flash(color, 0.5); this.post.aberrate(0.45); this.shockAt(new THREE.Vector3(x, 1, z), s); this.shake(sh); },
      pulse: (x, z, s) => this.shockAt(new THREE.Vector3(x, 1, z), s),
      lines: (x, z, a, d) => this.post.speedLines(a, d),
    });   // v0.93 fix7 วาร์ป/เลเวลอัปแบบอลังการ
    this.projectiles = new Projectiles(world, this.bursts);
    this.strikes = new Strikes(world);
    this.telegraphs = new Telegraphs(world);
    // วงเวทย์ใต้เท้าระหว่างร่ายสกิล
    this.castCircle = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color: '#8fd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.castCircle.rotation.x = -Math.PI / 2; this.castCircle.visible = false; world.add(this.castCircle);
    if (this.quality) this.setQuality(this.quality); // คงโหมดคุณภาพเดิมไว้
  }

  // พื้นแผนที่: โหมดพิกเซล = ลายพิกเซลจากเชดเดอร์ (v0.17) · โหมด 3D = เท็กซ์เจอร์วาดเนียนแบบเดิม
  makeGround(map) {
    if (this.groundGroup) {
      this.world.remove(this.groundGroup);
      this.groundGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      if (this.groundTex) { this.groundTex.dispose(); this.groundTex = null; }
      if (this.pground) { this.pground.dispose(); this.pground = null; }
    }
    const theme = map.def.theme || {}, gg = this.groundGroup = new THREE.Group();
    if (this.px.enabled) {
      this.pground = pixelGround(map, { aa: !this.mobile && !this.safe });   // v0.93 fix12 มือถือ: ไม่ใช้เชดเดอร์เกลี่ยขอบลายพื้น (หนักเกินไปสำหรับการ์ดจอมือถือบางรุ่น → แท็บค้าง/แครช)
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), this.pground.material);
      ground.rotation.x = -Math.PI / 2; ground.position.set(map.w / 2, 0, map.h / 2); ground.receiveShadow = true;
      gg.add(ground);
    } else {
      this.groundTex = groundTexture(map);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(map.w, map.h), new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(map.w / 2, 0, map.h / 2); ground.receiveShadow = true;
      gg.add(ground);
      const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std('outer' + (theme.outer || '#5c9a40'), { color: theme.outer || '#5c9a40', roughness: 1 }));
      outer.rotation.x = -Math.PI / 2; outer.position.set(map.w / 2, -0.02, map.h / 2); outer.receiveShadow = true;
      gg.add(outer);
    }
    this.world.add(gg);
  }

  // v0.17: ตัวสร้างของในแผนที่แบบพิกเซล (ทับของเดิมเฉพาะชนิดที่ออกแบบใหม่)
  pxBuilders() {
    if (this._pxb) return this._pxb;
    const one = (geo, mat) => { const g = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.userData.dynamic = true; g.add(m); return g; };
    this._pxb = { bush: (d) => one(bushPx(d.seed || 3), vcToon()) };
    return this._pxb;
  }

  // v0.16: แบ่งพืช/หินเป็นก้อนละ 20×20 ช่อง แต่ละก้อนมีขอบเขตของตัวเอง → กล้องและเงาตัดก้อนที่มองไม่เห็นทิ้ง
  // (เดิมรวมทั้งแผนที่เป็นชิ้นเดียว ต้องวาดต้นไม้ทุกต้นทุกเฟรมทั้งรอบภาพและรอบเงา) · คืนรายการ InstancedMesh
  instanced(parent, geo, mat, list, { cast = true, tint = null, chunk = 24 } = {}) {
    if (!list.length) return null;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const gs = geo.boundingSphere, gr = gs.radius + gs.center.length();
    const buckets = new Map();
    list.forEach((it, i) => {
      const k = Math.floor(it.x / chunk) + ',' + Math.floor(it.z / chunk);
      let b = buckets.get(k); if (!b) buckets.set(k, (b = []));
      b.push(i);
    });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const out = [];
    for (const idx of buckets.values()) {
      const g = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(geo.attributes)) g.setAttribute(name, attr);
      if (geo.index) g.setIndex(geo.index);
      let cx = 0, cz = 0;
      for (const i of idx) { cx += list[i].x; cz += list[i].z; }
      cx /= idx.length; cz /= idx.length;
      let rad = 0;
      for (const i of idx) rad = Math.max(rad, Math.hypot(list[i].x - cx, list[i].z - cz) + gr * (list[i].s || 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, gs.center.y, cz), rad + 0.5);
      const im = new THREE.InstancedMesh(g, mat, idx.length);
      idx.forEach((i, j) => {
        const it = list[i];
        e.set(0, it.rot || 0, 0); q.setFromEuler(e);
        v.set(it.x, 0, it.z); sc.setScalar(it.s || 1);
        m.compose(v, q, sc); im.setMatrixAt(j, m);
        if (it.color) im.setColorAt(j, it.color);
        else if (tint) im.setColorAt(j, tint(c, ((i * 7919) % 100) / 100));
      });
      im.frustumCulled = true;
      im.castShadow = cast; im.receiveShadow = true;
      parent.add(im);
      out.push(im);
    }
    return out;
  }

  // เพิ่มการโยกตามลมใน vertex shader (ไม่กิน CPU)
  addWind(material, amount, minY, seeThrough = false) {
    const time = this.windTime;
    if (!this.seeCam) { this.seeCam = { value: new THREE.Vector3() }; this.seeFocus = { value: new THREE.Vector3(0, -99, 0) }; }
    const cam = this.seeCam, focus = this.seeFocus;
    material.onBeforeCompile = (shader) => {
      if (material.userData.obc) material.userData.obc(shader);   // v0.17: เชดเดอร์เสริมของวัสดุ (จุดใบไม้พิกเซล)
      shader.uniforms.uTime = time;
      let vs = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float h = max(0.0, position.y - ${minY.toFixed(2)});
        float sway = sin(uTime * 1.7 + ip.x * 0.6 + ip.z * 0.45) + 0.35 * sin(uTime * 3.3 + ip.x * 1.4);
        transformed.x += sway * h * ${amount.toFixed(3)};
        transformed.z += sway * h * ${(amount * 0.5).toFixed(3)};` + (seeThrough ? `
        vec4 seeW = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          seeW = instanceMatrix * seeW;
        #endif
        vSeeWorld = (modelMatrix * seeW).xyz;` : ''));
      if (seeThrough) {
        // ต้นไม้ที่บังระหว่างกล้องกับผู้เล่นจะโปร่งแบบตาข่าย (มองทะลุเห็นตัวละคร)
        shader.uniforms.uSeeCam = cam; shader.uniforms.uSeeFocus = focus;
        vs = 'varying vec3 vSeeWorld;\n' + vs;
        shader.fragmentShader = 'uniform vec3 uSeeCam;\nuniform vec3 uSeeFocus;\nvarying vec3 vSeeWorld;\n' + shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          vec3 sSeg = uSeeFocus - uSeeCam;
          float sT = clamp(dot(vSeeWorld - uSeeCam, sSeg) / max(0.001, dot(sSeg, sSeg)), 0.0, 1.0);
          float sD = distance(vSeeWorld, uSeeCam + sSeg * sT);
          if (sT < 0.97 && sD < 2.1) {
            vec2 pp = mod(floor(gl_FragCoord.xy), 2.0);
            float th = pp.x * 0.5 + pp.y * 0.25;
            if (th < smoothstep(2.1, 1.1, sD) * 0.76) discard;
          }`);
      }
      shader.vertexShader = vs;
    };
    material.customProgramCacheKey = () => `wind${amount}_${minY}_${seeThrough ? 'see' : ''}`; // แยก shader ตามค่าลม
    material.needsUpdate = true;
  }

  /* ---------- v0.94 เอฟเฟกต์แฟชั่นของผู้เล่นคนอื่น: ปิดได้ในตั้งค่า · ปิดอัตโนมัติเมื่อคุณภาพภาพลดถึงระดับ 2 ขึ้นไป ---------- */
  othersFxOn() { return this.othersFx !== false && (this.qualityLevel || 0) < 2 && !this.crowdLow; }   // fix15 crowdLow = มือถือ + คนในแมพเยอะ/เฟรมตก
  refreshOthersFx() {
    const on = this.othersFxOn(); if (on === this._ofx) return; this._ofx = on;
    for (const [e, c] of this.characters) if (c.kind === 'remote') this.refreshLook(e);
  }

  /* ---------- ตัวละคร ---------- */
  // สร้างโมเดลตัวละคร + ชุดแฟชั่น (เฉพาะผู้เล่น) — คืน { view, costume, glow }
  buildView(entity, npc = false) {
    let items = !npc && entity.fashionItems ? entity.fashionItems() : null;
    if (items && entity.isRemote && !this.othersFxOn()) { items = { ...items }; delete items.aura; delete items.wings; }   // v0.94 ซ่อนออร่า/ปีกของคนอื่น (ลื่นขึ้นบนมือถือ)
    const has = !!items && Object.keys(items).length > 0;
    const look = has ? costumeLook(entity.look, items) : entity.look;
    const view = new CharacterView(look);
    let costume = null, glow = false;
    // v0.35: ชิ้นแฟชั่นภาพพิกเซล (ปีก/ออร่าจาก PixelLab) วาดแยกจากโมเดล
    const pk = (it) => (it && it.kind === 'pixel' ? it : null);
    const pxw = has ? { wings: pk(items.wings), aura: pk(items.aura), weapon: pk(items.weapon), outfit: pk(items.outfit) } : null;
    if (has) {
      costume = wearCostume(view, items, { world: this.costumeWorld, look });
      if (this.ch) costume.setViewport(this.fxVH || this.ch * this.renderer.getPixelRatio(), this.camera.fov);
      glow = Object.values(items).some((it) => (TIER_RANK[it.rarity] || 0) >= 3);
    }
    return { view, costume, glow, pxw };
  }

  // remote = ผู้เล่นคนอื่นในโหมดออนไลน์ (v0.11): ป้ายชื่อ + เลเวล/อาชีพ + แถบ HP + ข้อความแชต
  addCharacter(entity, { npc = false, remote = false } = {}) {
    const { view, costume, glow, pxw } = this.buildView(entity, npc);
    view.root.rotation.y = entity.angle;
    this.scene.add(view.root);
    const scale = ((entity.look && entity.look.scale) || 1) * (npc ? NPC_SCALE : 1);   // v0.41.1 NPC ใหญ่ขึ้นให้สูงเท่าตัวละครพิกเซล
    if (npc) view.root.scale.setScalar(NPC_SCALE);
    let hb = null;   // v0.88 เก็บไว้ใน c.hitbox — เปลี่ยนหน้าตา (refreshLook) แล้วกล่องคลิกต้องย้ายตามตัวใหม่
    if (npc) {
      hb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hb.position.y = 0.95; hb.userData.npc = entity; view.root.add(hb); this.hitboxes.push(hb);
    } else if (remote) {
      // v0.38: คลิกผู้เล่นคนอื่น → เมนู (เชิญปาร์ตี้ · กระซิบ · เพิ่มเพื่อน)
      hb = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false }));   // v0.88 กว้างขึ้น แตะบนมือถือง่าย
      hb.position.y = 0.95; hb.userData.actor = entity; view.root.add(hb); this.hitboxes.push(hb);
    }
    const label = document.createElement('div');
    label.className = npc ? 'tag tag-npc' : remote ? 'tag tag-remote' : 'tag tag-player';
    label.textContent = entity.name;
    if (npc && entity.title) { const s = document.createElement('small'); s.textContent = entity.title; label.prepend(s); }
    if (remote) { const s = document.createElement('small'); s.className = 'rt'; s.textContent = entity.title || ''; label.append(s); }
    if (!npc) paintPlate(label, entity.name, entity.baseLevel || 1, entity.guildTag, entity.inParty);   // v0.36: กรอบป้ายชื่อตามเลเวล
    this.labelLayer.append(label);
    const bubble = document.createElement('div'); bubble.className = 'bubble' + (npc ? '' : ' bubble-pc'); bubble.hidden = true; this.labelLayer.append(bubble);
    let hpbar = null;
    let castbar = null;
    if (!npc) {
      hpbar = document.createElement('div'); hpbar.className = remote ? 'hpbar hpbar-remote' : 'hpbar hpbar-player'; hpbar.innerHTML = '<i></i>'; this.labelLayer.append(hpbar);
    }
    if (!npc && !remote) {
      castbar = document.createElement('div'); castbar.className = 'castbar'; castbar.innerHTML = '<span></span><b><i></i></b>'; castbar.hidden = true; this.labelLayer.append(castbar);
    }
    this.characters.set(entity, { hitbox: hb, view, costume, glow, pxw, label, bubble, hpbar, castbar, npc, kind: npc ? 'npc' : remote ? 'remote' : 'player', head: CHAR_HEAD * 1.3 * scale, lastText: '', lastHp: -1, npcSheet: npc ? this.npcSheetOf(entity) : null });
    this.actorQuality(this.characters.get(entity));
    this.pxChar(entity, view);
    view.update(0, entity);
  }

  // v0.86 ตั้งเวลาในวันของเกม (0–1) · null = ปิดระบบ (กลางวันตลอด)
  setDayTime(f) { this.dayT = f; this.applyDay(); }
  applyDay(force = false) {
    const T = this.themeLight; if (!T) return;
    const f = this.dayT, P = this.dayIndoor || f == null ? DAY_PRESETS.day : dayPreset(f);
    const key = this.dayIndoor || f == null ? 'off' : Math.round(f * 2000);
    if (!force && key === this.dayKey) return;
    this.dayKey = key; this.dayInfo = P;
    const mix = (base, col, k) => (col ? base.clone().lerp(_dayCol.set(col), k) : base.clone());
    this.hemi.color.copy(mix(T.sky, P.sky, P.mix)); this.hemi.groundColor.copy(mix(T.ground, P.ground, P.mix * 0.8));
    this.sun.color.copy(mix(T.sunColor, P.sun, P.mix));
    this.scene.fog.color.copy(mix(T.fog, P.fog, P.mix));
    this.baseLight = { hemi: T.hemi * P.h, sun: T.sun * P.s };
    if (!(this.sky && this.sky.dur > 0)) { this.hemi.intensity = this.baseLight.hemi; this.sun.intensity = this.baseLight.sun; }
    this.renderer.toneMappingExposure = T.exposure * P.e;
    if (this.post && this.baseGlow != null) this.post.strength = this.baseGlow * (P.glow || 1);
    this.dayK = P;
    // v0.88 กลางคืนมืดเฉพาะฉาก (พื้น ต้นไม้ อาคาร) — ตัวละคร มอน ออร่า และเอฟเฟกต์สกิลวาดทีหลังจึงยังสว่างชัด
    // (เดิมใช้ชั้นสี DOM ทับทั้งจอ ทำให้ทุกอย่างมืดหมด)
    const el = this.dayTintEl || (this.dayTintEl = document.getElementById('dayTint'));
    if (el) el.style.background = 'transparent';
    const t = P.tint || [0, 0, 0, 0], q = this.nightQuadMesh();
    const lin = !!(this.post && this.post.linear);
    const mul = [0, 1, 2].map((i) => { const v = 1 + (t[i] / 255 - 1) * t[3]; return lin ? Math.pow(v, 2.2) : v; });
    q.material.uniforms.uMul.value.set(mul[0], mul[1], mul[2]);
    q.visible = t[3] > 0.002;
  }
  // แผ่นคูณสีเต็มจอ วาดหลังวัตถุทึบของฉาก (renderOrder 0) แต่ก่อนสไปรต์ตัวละคร (renderOrder 1) และวัตถุโปร่ง/เอฟเฟกต์
  nightQuadMesh() {
    let q = this.nightQuad;
    if (!q) {
      q = this.nightQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: { uMul: { value: new THREE.Vector3(1, 1, 1) } },
        vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform vec3 uMul; void main() { gl_FragColor = vec4(uMul, 1.0); }',
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
        depthTest: false, depthWrite: false, transparent: false, toneMapped: false, fog: false,
      }));
      q.frustumCulled = false; q.renderOrder = 0.5; q.visible = false; q.userData.nightQuad = true;
    }
    if (q.parent !== this.scene) this.scene.add(q);
    return q;
  }

  // v0.17: สีแสงของแผนที่ปัจจุบันเทียบกับเมือง (ป่ามืด/ภูเขาไฟแดง/ท้องฟ้ามืดตอนสกิลใหญ่) → คูณสีสไปรต์
  pxTint() {
    const h = this.hemi, s = this.sun, t = this.px.tint;
    // v0.88 ตัดผลของช่วงเวลากลางวัน/กลางคืนออก (ตัวละครไม่มืดตามฉาก) · กลางคืนเหลือโทนเย็นลงเล็กน้อย
    const D = this.dayK || { h: 1, s: 1, e: 1, mix: 0 }, T = this.themeLight;
    const hc = T && D.mix ? T.sky : h.color, sc = T && D.mix ? T.sunColor : s.color;
    const ex = this.renderer.toneMappingExposure / (D.e || 1) / 0.92;
    const night = Math.max(0, Math.min(1, (1 - (D.h || 1)) / 0.5));
    for (const k of ['r', 'g', 'b']) {
      const cur = hc[k] * h.intensity / (D.h || 1) + sc[k] * s.intensity / (D.s || 1) * 0.5;
      const base = PX_BASE[k];
      t[k] = Math.min(1.06, Math.max(0.5, 1 + (cur * ex / base - 1) * 0.65)) * (1 - night * (k === 'b' ? 0.04 : 0.12));
    }
  }

  // v0.17: สลับโหมดภาพพิกเซล 2D ↔ โมเดล 3D (ตั้งค่า → กราฟิก)
  setPixelMode(on) {
    if (this.px.enabled === on) return;
    this.px.enabled = on; PIXEL.on = on;
    if (!on) for (const k of [...this.px.list.keys()]) this.px.detach(k);
    for (const [entity, c] of this.characters) {
      if (on) { if (c.kind === 'mob') this.px.attach(entity, c.view, 'mob'); else this.pxChar(entity, c.view); }
      this.actorQuality(c);
    }
    for (const v of this.pets.values()) { if (on) this.px.attach(v, v, 'pet'); this.actorQuality({ view: v, kind: 'pet' }); }
    this.pxK = 0; this.post.pxOn = on;
    this.camMode(true);   // v0.17.1: พิกเซล = กล้องแบบ RO · 3 มิติ = กล้องเดิม
    document.body.classList.toggle('pxmode', on);
    if (on) this.pxSnapZoom(); else this.syncFxSize();
    if (this.world && this.map) this.makeGround(this.map);
  }

  /* ---------- v0.17: ฉากแบบพิกเซล ---------- */
  // ระยะกล้องที่ทำให้ 1 พิกเซลภาพ = PX หน่วยโลกพอดี (ตรงกับสไปรต์ตัวละคร) โดยขยายภาพเป็นจำนวนเต็มเท่า
  pxZoomSteps() {
    const H = this.post.size.y, t = Math.tan((this.camera.fov * Math.PI) / 360), ds = this.distScale || 1, out = [], C = this.camCfg();
    for (let k = 1; k <= 32; k++) { const d = ((H / k) * PX) / (2 * t) / ds; if (d >= C.min && d <= C.max) out.push(d); }
    return out;
  }
  pxSnapZoom() {
    const steps = this.pxZoomSteps(); if (!steps.length) return;
    const want = this.wantDist || this.rig.targetDist;
    // v0.88 มุมมองไกลขึ้น: ระยะไกลสุด = ขั้นพิกเซล 1:1 × CAM_FAR (ภาพพิกเซลย่อลงเล็กน้อย เห็นรอบตัวกว้างขึ้น)
    if (want >= this.camCfg().max - 0.01) {
      // ไม่ผูกกับความละเอียดเรนเดอร์ (มือถือที่ลดคุณภาพอัตโนมัติจะไม่ถูกดึงกล้องเข้าใกล้) · จอเล็ก/มือถือคิดเหมือนจอความละเอียด 2 เท่า
      const t = Math.tan((this.camera.fov * Math.PI) / 360), ds = this.distScale || 1, small = Math.min(this.cw || 0, this.ch || 0) < 600;
      const ref = ((this.ch || 0) * (small ? 2 : 1) * PX) / (2 * t) / ds;
      this.tagRef = Math.max(steps[0], ref);   // v0.88 ระยะอ้างอิงของขนาดป้ายชื่อ/ฉายา (ถอยกล้องออก → ป้ายเล็กลงตามตัวละคร)
      this.rig.targetDist = Math.min(95, this.tagRef * (this.cw < this.ch ? CAM_FAR_P : CAM_FAR));
      return;
    }
    this.rig.targetDist = steps.reduce((a, b) => (Math.abs(Math.log(b / want)) < Math.abs(Math.log(a / want)) ? b : a));
  }
  // ทุกเฟรม: เลือกตัวคูณขยาย k · เลื่อนกล้องให้ตรงตารางพิกเซล (กันภาพสั่นตอนเดิน) แล้วชดเชยเศษพิกเซลตอนขยายภาพ
  pxFrame() {
    const H = this.post.size.y; if (!H) return null;
    const cam = this.camera, t = Math.tan((cam.fov * Math.PI) / 360);
    const D = cam.position.distanceTo(this.rig.target);
    // v0.93 fix9 กันภาพพื้น/บ้าน "ยุบยับ" ตอนเดิน: เดิมปัด k เป็นจำนวนเต็ม → ระยะกล้องไกล (×1.3) ทำให้ 1 พิกเซลภาพ ≠ 1 พิกเซลลาย
    // (บางแถวลายถูกข้าม/ซ้ำ แล้วสลับไปมาเมื่อกล้องเลื่อน) → ใช้ k แบบเศษส่วน ให้ 1 พิกเซลภาพ = PX หน่วยโลกพอดีเสมอ
    // แล้วค่อยขยายขึ้นจอแบบ "คมแต่นุ่มขอบ" (sharp bilinear ใน PostFX) · คิด k จากระยะเป้าหมายของกล้อง (ไม่เปลี่ยนทุกเฟรมตอนกล้องกระตุก)
    const Dk = (this.rig.targetDist || this.rig.dist) * (this.distScale || 1);
    const k = Math.max(1, Math.round(((H * PX) / (2 * Dk * t)) * 32) / 32);
    const wpp = (2 * D * t) / (H / k);
    if (k !== this.pxK) { this.pxK = k; this.syncFxSize(); }
    cam.updateMatrixWorld();
    const R = (this.pxR = this.pxR || new THREE.Vector3()).setFromMatrixColumn(cam.matrixWorld, 0);
    const U = (this.pxU = this.pxU || new THREE.Vector3()).setFromMatrixColumn(cam.matrixWorld, 1);
    const cr = cam.position.dot(R) / wpp, cu = cam.position.dot(U) / wpp;
    const fr = cr - Math.round(cr), fu = cu - Math.round(cu);
    cam.position.addScaledVector(R, -fr * wpp).addScaledVector(U, -fu * wpp);
    cam.updateMatrixWorld();
    this.pxPoints(k);
    return { k, wpp, ox: fr, oy: fu, zo: D - 13 * (this.distScale0 || 1) };   // zo: v0.17.1 เกณฑ์เส้นขอบเทียบกล้องเดิม
  }
  // จุดอนุภาคแบบ PointsMaterial (ไฟ น้ำพุ ฝุ่นละออง) คิดขนาดจากความสูงจอ → ย่อตาม k ตอนวาดภาพความละเอียดต่ำ
  pxPoints(k) {
    if (!this.pointsList || (this.frameN2 = (this.frameN2 || 0) + 1) % 90 === 0 || this.pointsK !== k) {
      const list = []; this.scene.traverse((o) => { if (o.isPoints && o.material && o.material.isPointsMaterial) list.push(o.material); });
      this.pointsList = list; this.pointsK = -1;
    }
    for (const m of this.pointsList) { if (m.userData.size0 === undefined) m.userData.size0 = m.size; m.size = m.userData.size0 / k; }
    this.pointsK = k;
  }

  // v0.17: ผูกโมเดลตัวละครกับสไปรต์พิกเซล (ตา = จุดบนหัว)
  pxChar(entity, view) {
    if (!this.px.enabled) return;
    const eye = (entity.look && entity.look.eye) || '#3a2440';
    this.px.attach(entity, view, 'char', { eyes: PixelSprites.eyeMarkers(view), eyeColor: eye, face: view.face });
  }

  // v0.32: ประตูมิติที่เกิดกลางเกม (บันไดลงชั้นถัดไปในดันเจี้ยน) — คืนตัวที่สร้างไว้ลบภายหลัง
  addPortalFx(x, z, locked = false) { const p = this.safe ? new Portal(this.world, x, z, locked) : new GrandPortal(this.world, x, z, locked); this.portals.push(p); return p; }

  /* ---------- v0.93 fix17 แชมเปี้ยน / มอนทองคำ / หีบสมบัติ ---------- */
  // ย้อมสีทั้งตัวมอน (คัดลอกวัสดุเฉพาะตัวนี้ · เก็บของเดิมไว้คืนตอนเกิดใหม่เป็นตัวธรรมดา)
  tintMob(c, col, k) {
    c.view.root.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material) || o.userData.eliteSkip || o.material.blending === THREE.AdditiveBlending || o.material.transparent && !o.material.map && o.material.opacity < 0.5) return;
      if (!o.userData.matOrig) { o.userData.matOrig = o.material; o.material = o.material.clone(); }
      const src = o.userData.matOrig;
      if (o.material.color && src.color) o.material.color.copy(src.color).lerp(new THREE.Color(col), k);
      if (o.material.emissive) { o.material.emissive.set(col); o.material.emissiveIntensity = k * 0.55; }
    });
  }
  untintMob(c) { c.view.root.traverse((o) => { if (o.userData.matOrig) { o.material.dispose(); o.material = o.userData.matOrig; delete o.userData.matOrig; } }); }
  eliteFx(m) {
    const c = this.characters.get(m); if (!c) return;
    if (c.elite) { c.elite.g.parent && c.elite.g.parent.remove(c.elite.g); c.elite.g.traverse((o) => { if (o.material) o.material.dispose(); if (o.geometry) o.geometry.dispose(); }); c.elite = null; this.elites = (this.elites || []).filter((x) => x.m !== m); }
    const base = `${m.data.mvp ? 'MVP · ' : m.data.dgBoss ? 'BOSS · ' : ''}${m.name} Lv.${m.level}`;
    if (!m.champ && !m.golden) { if (c.tinted) { this.untintMob(c); c.tinted = false; if (this.px.enabled) { this.px.detach(m); this.px.attach(m, c.view, 'mob'); } } c.label.textContent = base; c.label.classList.remove('tag-champ', 'tag-gold'); return; }
    const col = m.golden ? '#ffd23a' : m.champ.color, h = (m.data.height || 1);
    this.tintMob(c, col, m.golden ? 0.85 : 0.5); c.tinted = true;
    if (this.px.enabled) { this.px.detach(m); this.px.attach(m, c.view, 'mob'); }   // วาดสไปรต์พิกเซลใหม่ด้วยสีที่ย้อม
    const g = new THREE.Group();
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#140818', transparent: true, opacity: 0.55, depthWrite: false }));
    dark.rotation.x = -Math.PI / 2; dark.position.y = 0.03; g.add(dark);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; const rs = Math.max(1.6, (m.data.radius || 0.55) * 3.2); ring.scale.set(rs, rs, 1); dark.scale.set(rs * 1.2, rs * 1.2, 1); g.add(ring);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(h * 2.4 + 1.0, h * 2.4 + 1.0, 1); glow.position.y = h * 0.55; g.add(glow);
    g.traverse((o) => { o.userData.eliteSkip = true; });
    this.world.add(g); g.position.set(m.x * S, 0, m.y * S);   // อยู่ในโลก (ไม่ใช่ในโมเดล) → ไม่ถูกแปลงเป็นสไปรต์พิกเซล · ตามตำแหน่งมอนทุกเฟรม
    c.elite = { g, ring, glow }; (this.elites = this.elites || []).push({ m, c, col });
    c.label.textContent = m.golden ? `✨ ${m.name} Lv.${m.level}` : `⭐ ${m.champ.name} · ${base}`;
    c.label.classList.toggle('tag-gold', !!m.golden); c.label.classList.toggle('tag-champ', !!m.champ && !m.golden);
  }
  updateElites(t, dt) {
    if (!this.elites || !this.elites.length) return;
    this.elites = this.elites.filter((e) => this.characters.get(e.m) === e.c && e.c.elite);
    for (const e of this.elites) {
      const E = e.c.elite, m = e.m; if (m.dead) { E.g.visible = false; continue; } E.g.visible = true; E.g.position.set(m.x * S, 0, m.y * S);
      E.ring.rotation.z = t * (m.golden ? 2.2 : 1.1); E.glow.material.opacity = 0.55 + 0.25 * Math.sin(t * 4 + m.id);
      if (m.golden && (e.sp = (e.sp || 0) - dt) <= 0) { e.sp = 0.25; this.bursts.spawn(m.x * S, 0.4 + Math.random() * 0.8, m.y * S, '#ffe27a', 3, 0.8, 1.2); }
    }
  }
  addChest(c) {
    this.chestObjs = this.chestObjs || new Map();
    const g = new THREE.Group(); g.position.set(c.x * S, 0, c.y * S); g.rotation.y = (c.tx * 7 + c.ty * 3) % 6.28;
    const build = (this.px.enabled && this.pxBuilders()['chest']) || BUILDERS.chest; const model = build({ kind: 'chest', seed: c.tx * 31 + c.ty }); model.scale.setScalar(0.85); g.add(model);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd86a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(1.6, 1.6, 1); glow.position.y = 0.4; g.add(glow);
    this.world.add(g); this.chestObjs.set(c.key, { g, glow, x: c.x, y: c.y, ph: c.tx });
  }
  removeChest(key, burst = true) {
    const o = this.chestObjs && this.chestObjs.get(key); if (!o) return;
    if (burst) { this.bursts.spawn(o.x * S, 0.5, o.y * S, '#ffd86a', 30, 1.6, 2.4); this.circles.spawn(o.x * S, o.y * S, { color: '#ffd86a', size: 1.8, life: 1.2, pillar: true }); }
    else this.bursts.spawn(o.x * S, 0.5, o.y * S, '#ff4a3a', 24, 1.4, 2);
    this.world.remove(o.g); this.chestObjs.delete(key);
  }
  updateChests(t) { if (!this.chestObjs) return; for (const o of this.chestObjs.values()) { o.glow.material.opacity = 0.35 + 0.2 * Math.sin(t * 3 + o.ph); o.glow.position.y = 0.4 + Math.sin(t * 2 + o.ph) * 0.06; } }

  // fix15 ฮาโลวีน: ฟักทองจุดเทียนรอบ NPC ในเมือง
  halloweenTown(npcs) {
    if (!this.world || !npcs || !npcs.length) return;
    const spots = [];
    npcs.forEach((n, i) => { const a = i * 2.39; spots.push({ x: n.x * S + Math.cos(a) * 1.1, z: n.y * S + Math.sin(a) * 1.1 }); });
    this.hwDecor = townDecor(this.world, spots.slice(0, 16));
  }
  addMonster(mob) {
    const view = new MonsterView(mob);
    view.root.rotation.y = mob.angle;
    if (mob.data.viewScale) view.root.scale.setScalar(mob.data.viewScale);   // v0.32.1: บอสหอคอยย่อขนาด
    const bossK = !mob.data.viewScale && mob.data.mvp ? (mob.data.worldBoss ? 1.5 : 1.35) : 1;   // v0.91 บอส MVP/บอสโลกตัวใหญ่ขึ้น
    if (bossK > 1) view.root.scale.setScalar(bossK);
    this.scene.add(view.root);
    if (this.halloween && !mob.data.fest && !mob.data.worldBoss && !mob.worldRun) view.root.add(pumpkinHat(mob.data.height || 1));   // fix15 ฮาโลวีน: มอนสวมหมวกฟักทอง
    if (this.px.enabled) this.px.attach(mob, view, 'mob');
    const h = mob.data.height;
    const rad = mob.data.radius || 0.55;
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h + 0.4, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.y = (h + 0.4) / 2; hb.userData.actor = mob; view.root.add(hb); this.hitboxes.push(hb);
    const label = document.createElement('div'); label.className = 'tag tag-mob' + (mob.data.mvp || mob.data.dgBoss ? ' tag-mvp' : ''); label.textContent = `${mob.data.mvp ? 'MVP · ' : mob.data.dgBoss ? 'BOSS · ' : ''}${mob.name} Lv.${mob.level}`; label.hidden = true;
    const hpbar = document.createElement('div'); hpbar.className = 'hpbar' + (mob.data.mvp || mob.data.dgBoss ? ' hpbar-mvp' : ''); hpbar.innerHTML = '<i></i>'; hpbar.hidden = true;
    this.labelLayer.append(label, hpbar);
    this.characters.set(mob, { view, label, hpbar, kind: 'mob', head: h * bossK, lastHp: -1, aura: bossK > 1 ? this.bossAura(mob, bossK) : null });
    if (mob.champ || mob.golden) this.eliteFx(mob);   // fix17
    this.actorQuality(this.characters.get(mob));
    view.update(0, mob);
  }

  pixelVfx() { return this.pxvfx || (this.pxvfx = new PixelVfx(this.scene, this.camera)); }
  // v0.54 เอฟเฟกต์สกิล "เงียบ": ใช้ตรรกะเดิม (จังหวะตี/ผลัก/สั่นจอ) แต่ไม่วาดภาพ — ให้ภาพจาก Night Forge แทน
  fxGhost() {
    if (this._fxGhost) return this._fxGhost;
    const stub = { emit() {}, update() {}, wasAlive: false, points: new THREE.Object3D(), mat: { uniforms: { scale: { value: 1 }, gain: { value: 1 } } } };
    const g = Object.create(this.fx);
    g.root = new THREE.Group();   // ไม่ได้ใส่ในฉาก = มองไม่เห็น
    g.fx = g.smoke = g.snow = g.feathers = g.stars = stub;
    g.hd = new THREE.Group(); g.hdFx = g.hdStars = g.hdFeathers = stub; g.hdSys = [];
    g.hdInit = function () {};
    g.light = function () {};
    return (this._fxGhost = g);
  }

  // v0.35: เงาตกค้างของตัวละครพิกเซล (ท่าสกิลแบบอนิเมะ) — สำเนาสไปรต์เฟรมปัจจุบัน ย้อมสี จางหายใน life วินาที
  afterimage(entity, { color = '#5aa8ff', life = 0.4, at = null, opacity = 0.75, grow = 0.08 } = {}) {
    const c = this.characters.get(entity), sh = c && c.sheet;
    if (!sh || !sh.tex || !this.fx) return;
    const tex = sh.tex.clone(); tex.needsUpdate = true; tex.offset.copy(sh.tex.offset); tex.repeat.copy(sh.tex.repeat);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, color, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, alphaTest: 0.3 });
    const m = new THREE.Mesh(sh.mesh.geometry, mat); m.renderOrder = 38; m.frustumCulled = false;
    m.scale.copy(sh.mesh.scale); m.position.copy(sh.mesh.position);
    const piv = new THREE.Group(); piv.add(m); this.scene.add(piv);
    piv.position.copy(sh.pivot.position); piv.quaternion.copy(sh.pivot.quaternion); piv.scale.copy(sh.pivot.scale);
    if (at) piv.position.add(new THREE.Vector3(at.x - entity.x / 16, (at.y || 0) - (entity.lift || 0), at.z - entity.y / 16));
    const s0 = m.scale.clone();
    this.fx.anim(life, (k) => { mat.opacity = opacity * (1 - k * k); m.scale.set(s0.x * (1 + grow * k), s0.y * (1 + grow * k), 1); }, () => { this.scene.remove(piv); mat.dispose(); tex.dispose(); });
    return piv;
  }


  // fix21 แผ่นภาพของ NPC: 'แผนที่:ไอดี' ก่อน แล้วค่อยไอดีอย่างเดียว
  npcSheetOf(n) { const k = NPC_SPRITES[`${n.mapId}:${n.id}`] || NPC_SPRITES[n.id]; return k && NPC_SHEETS[k] ? k : null; }

  // v0.33: ตัวละครพิกเซล 8 ทิศ (สไปรต์ชีต) แทนโมเดล สำหรับอาชีพที่มีภาพแล้ว
  sheetChar(c, entity, dt) {
    const job = c.npcSheet ? (this.spriteChars !== false ? c.npcSheet : null) : this.spriteChars !== false ? liveSheet(entity.jobId) : null;   // fix21 NPC ใช้แผ่นของตัวเอง
    const root = c.view.root;
    if (!job) {
      if (c.sheet) { c.sheet.dispose(); c.sheet = null; c.ent = entity; this.sheetBody(c, false); }
      return;
    }
    const O = c.pxw && c.pxw.outfit && c.pxw.outfit.p.sheets ? c.pxw.outfit.p.sheets[sheetOf(entity.jobId)] : null;   // v0.43 ชุดพิกเซล = แผ่นทั้งตัวตามสายอาชีพ
    const X = O || (c.pxw && c.pxw.weapon && c.pxw.weapon.p.sheet ? c.pxw.weapon.p.sheet : null);   // v0.39 สกินอาวุธ = แผ่นทั้งตัว
    if (!c.sheet) { c.sheet = new SheetSprite(this.scene, job); c.sheetScale = root.scale.x; }
    c.sheet.setJob(job, X);
    // ตัวโมเดลซ่อน · เหลือเฉพาะชิ้นแฟชั่น (ปีก/หมวก/ออร่า) ขยายให้เข้ากับความสูงสไปรต์
    c.ent = entity; this.sheetBody(c, true);
    c.sheet.pivot.visible = !entity.hidden && root.visible;
    c.sheet.update(dt, entity, c.view, this.camera, this.px && this.px.tint);
  }

  // v0.35: ปีก/ออร่าภาพพิกเซลจากชุดแฟชั่น — สร้าง/ถอดตามชิ้นที่สวม · ตามตำแหน่งและทิศของตัวละครทุกเฟรม
  pixelWear(c, entity, dt, off = false) {
    const W = !off && c.pxw ? c.pxw.wings : null, A = !off && c.pxw ? c.pxw.aura : null;
    if (c.pwing && (!W || c.pwing.p !== W.p)) { c.pwing.dispose(); c.pwing = null; }
    if (W && !c.pwing) c.pwing = W.p.model === 'seraph6' ? new SeraphWings(this.scene, W.p) : new PixelWingSprite(this.scene, W.p);
    if (c.paura && (!A || c.paura.name !== A.p.vfx)) { c.paura.stop(); c.paura = null; }
    if (A && !c.paura) c.paura = this.pixelVfx().play(A.p.vfx, null, { scale: A.p.scale || 1, follow: entity });
    const X = !off && c.pxw ? c.pxw.weapon : null;
    if (X && X.p.vfx && c.pxwLoaded !== X.p.vfx) { c.pxwLoaded = X.p.vfx; this.pixelVfx().load(X.p.vfx); }   // โหลดภาพเอฟเฟกต์อาวุธล่วงหน้า
    if (!c.pwing && !c.paura) return;
    const vis = !entity.hidden && c.view.root.visible;
    if (c.pwing) { c.pwing.liftK = c.sheet && c.sheet.S && c.sheet.S.wingK || 1; c.pwing.ax = c.sheet ? c.sheet.wdx || 0 : 0; c.pwing.ay = c.sheet ? c.sheet.wdy || 0 : 0; c.pwing.update(dt, entity, c.sheet ? c.sheet.dir : screenDir(entity.angle, this.camera), this.camera, vis); }   // v0.40.3 ตัวขาสั้น → ปีกต่ำลงตาม
    if (c.paura && c.paura.e) c.paura.e.hidden = !vis;
  }

  sheetBody(c, on) {
    const root = c.view.root;
    root.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      o.visible = !on || !!o.userData.costume;
      // ชิ้นแฟชั่นโปร่ง/เรืองแสง (วาดเป็น 3 มิติ) → ไม่เขียนความลึก และวาดก่อนตัวสไปรต์ → อยู่หลังตัวละคร
      const m = o.material; if (!o.userData.costume || !m || Array.isArray(m) || !m.transparent) return;
      if (o.userData.auraDepth) return;   // v0.41 ออร่ากระบี่: ใช้ความลึกจริง (หน้า/หลังตัวละคร)
      if (on && m.userData.shDW === undefined) { m.userData.shDW = m.depthWrite; m.depthWrite = false; o.userData.shRO = o.renderOrder; o.renderOrder = Math.min(o.renderOrder, 5); }
      else if (!on && m.userData.shDW !== undefined) { m.depthWrite = m.userData.shDW; delete m.userData.shDW; o.renderOrder = o.userData.shRO || 0; }
    });
    if (c.sheetScale) root.scale.setScalar(on ? c.sheetScale * 1.22 : c.sheetScale);
    const ps = this.px && this.px.list && this.px.list.get(c.ent || null);
    if (ps) ps.push = on ? 0.12 : undefined;
    if (!on) c.sheetScale = null;
  }

  removeActor(entity) {
    { const c0 = this.characters.get(entity); if (c0 && c0.elite) { c0.elite.g.parent && c0.elite.g.parent.remove(c0.elite.g); c0.elite = null; } }   // fix17
    const c = this.characters.get(entity); if (!c) return;
    if (c.sheet) { c.sheet.dispose(); c.sheet = null; }
    this.pixelWear(c, entity, 0, true);
    this.px.detach(entity);
    this.scene.remove(c.view.root);
    c.view.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const i = this.hitboxes.indexOf(o); if (i >= 0) this.hitboxes.splice(i, 1);
    });
    if (c.view.dispose) c.view.dispose();
    disposeOwned(c.view.root);
    if (c.costume) { c.costume.dispose(); c.costume = null; }
    if (c.aura) { this.scene.remove(c.aura); c.aura.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); c.aura = null; }
    for (const el of [c.label, c.bubble, c.hpbar, c.castbar, ...(c.honorEls || [])]) if (el) el.remove();
    this.characters.delete(entity);
  }

  /* ---------- เอฟเฟกต์การต่อสู้ ---------- */
  playAttack(entity, kind) {
    const c = this.characters.get(entity); if (!c) return;
    c.view.attack(kind);
    // v0.35: อาวุธแฟชั่นภาพพิกเซล = เอฟเฟกต์ฟันประจำตัวทุกครั้งที่โจมตี (กลับด้านเมื่อหันซ้าย)
    const W = c.pxw && c.pxw.weapon;
    if (W && W.p.vfx) { const d = c.sheet ? c.sheet.dir : screenDir(entity.angle, this.camera); this.pixelVfx().play(W.p.vfx, null, { scale: W.p.scale || 1, follow: entity, once: true, flip: d >= 5, delay: W.p.delay || 0 }); }
  }

  /* ---------- บอส (v0.7) ---------- */
  telegraph(x, y, radiusTiles, dur, color = '#ff3a3a') { this.telegraphs.spawn(x * S, y * S, radiusTiles, dur, color); }
  rootSpikes(x, y, radiusTiles) {
    this.strikes.spikes(x * S, y * S, radiusTiles);
    this.bursts.spawn(x * S, 0.2, y * S, '#8a6a3e', 18, 2.4, 2.2);
  }
  // v0.91 วงพลังใต้เท้าบอส MVP/บอสโลก (หมุนช้า · เลือดน้อยเต้นแรงขึ้น) + ประกายลอยขึ้น
  bossAura(mob, k) {
    const wb = !!mob.data.worldBoss, col = wb ? '#ff4a5a' : '#ffb347', size = (mob.data.radius || 1.2) * k * 4.2;
    const g = new THREE.Group(); g.userData.col = col;
    const mk = (tex, sz, op, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 2; m.userData.op = op; g.add(m); return m; };
    g.userData.glow = mk(glowTexture(), size * 1.25, 0.32, 0.04);
    g.userData.circ = mk(magicCircleTexture(), size, 0.55, 0.05);
    g.userData.circ2 = mk(magicCircleTexture(), size * 0.62, 0.35, 0.055);
    g.userData.t = Math.random() * 10; g.userData.ember = 0;
    g.position.set(mob.x * S, 0, mob.y * S);
    this.scene.add(g); return g;
  }
  updateBossAura(c, mob, dt) {
    const g = c.aura, U = g.userData, on = !mob.dead && c.view.root.visible && !mob.hidden;
    g.visible = on; if (!on) return;
    U.t += dt;
    g.position.set(mob.x * S, 0, mob.y * S);
    const low = mob.maxHp ? mob.hp / mob.maxHp < 0.3 : false, sp = low ? 2.4 : 1;
    U.circ.rotation.z += dt * 0.35 * sp; U.circ2.rotation.z -= dt * 0.7 * sp;
    const pulse = 0.8 + Math.sin(U.t * (low ? 7 : 2.2)) * 0.2;
    U.circ.material.opacity = U.circ.userData.op * pulse; U.circ2.material.opacity = U.circ2.userData.op * pulse; U.glow.material.opacity = U.glow.userData.op * (low ? 1.5 : 1) * pulse;
    if ((U.ember -= dt) <= 0) { U.ember = low ? 0.25 : 0.55; this.bursts.spawn(g.position.x + (Math.random() - 0.5) * 2, 0.15, g.position.z + (Math.random() - 0.5) * 2, U.col, 3, 0.5, 1.6); }
  }
  // v0.91 บอสง้างท่า: วงเวทหมุนเร็วใต้ตัว + แสงรวมพลัง (อ่านท่าออกชัด)
  bossWindup(mob, radiusTiles, dur, color = '#ff3a3a') {
    const pos = new THREE.Vector3(mob.x * S, 0, mob.y * S);
    this.fx.disc(pos, magicCircleTexture(), color, radiusTiles * 2.3, dur + 0.15, { spin: 3.2, y: 0.07, opacity: 0.9, fadeIn: 0.15, fadeOut: 0.2 });
    this.fx.light(pos.clone().setY(1.5), color, 3, dur, 10);
    for (let i = 0; i < 3; i++) this.fx.after(i * dur / 3, () => this.fx.ring(pos, color, radiusTiles * 1.3, 0.4, Math.max(0.25, dur / 3), { opacity: 0.8 }));
  }
  // v0.91 แรงกระแทกเพิ่ม (ทุกท่าทุบ/ท่าไกลของบอส)
  bossImpact(x, z, radiusTiles, color) {
    const pos = new THREE.Vector3(x, 0, z);
    this.fx.ring(pos, '#ffffff', 0.3, radiusTiles * 1.35, 0.35, { opacity: 0.9 });
    this.fx.ring(pos, color, 0.2, radiusTiles * 1.1, 0.6);
    this.fx.flash(pos.clone().setY(0.5), color, radiusTiles * 2.4, 0.3);
    this.fx.cracks(pos, color, radiusTiles * 1.6, 2.2);
    this.fx.debris(pos, { count: 14, color: '#6a5a48', speed: [4, 7] });
    this.shockAt(pos, Math.min(1.4, 0.5 + radiusTiles * 0.2)); this.punch(0.5);
  }
  // v0.91 บอส MVP/บอสโลกถูกล้ม: ลำแสงจากฟ้า + วงคลื่นซ้อน + ระเบิดประกาย
  bossDeath(mob) {
    const x = mob.x * S, z = mob.y * S, pos = new THREE.Vector3(x, 0, z), wb = !!mob.data.worldBoss, col = wb ? '#ff6a5a' : '#ffd36b', r = (mob.data.radius || 1.2) * 2;
    this.fx.flash(pos.clone().setY(1.6), '#ffffff', r * 4, 0.5);
    this.fx.pillar(pos, col, r * 0.55, 14, 1.6, { fromSky: true, opacity: 0.85 });
    for (let i = 0; i < 4; i++) this.fx.after(i * 0.18, () => this.fx.ring(pos, i % 2 ? '#ffffff' : col, 0.4, r * (2 + i * 0.8), 0.7));
    this.fx.light(pos.clone().setY(2), col, 6, 1.2, 16);
    this.bursts.spawn(x, 1.2, z, col, 90, 4.5, 3);
    this.fx.after(0.25, () => this.bursts.spawn(x, 0.6, z, '#ffffff', 50, 3.2, 3.5));
    this.fx.sparks(pos.clone().setY(1.5), col, 60, 9);
    this.shockAt(pos.clone().setY(1), 1.5); this.shake(0.7); this.punch(0.8);
  }
  bossSlam(mob, radiusTiles, fx) {
    const x = mob.x * S, z = mob.y * S;
    this.bossImpact(x, z, radiusTiles, fx === 'ice' ? '#9ae8ff' : fx === 'fire' ? '#ff8a2a' : '#ffb86a');
    if (fx === 'ice') {
      // v0.11 ราชินีหิมะ: คลื่นน้ำแข็ง + หนามผลึกพุ่งรอบตัว
      this.strikes.shockwave(x, z, '#9ae8ff', radiusTiles);
      this.strikes.spikes(x, z, radiusTiles * 0.85, '#cdefff', 1.3);
      this.fx.ring(new THREE.Vector3(x, 0, z), '#7fe0ff', 0.3, radiusTiles * 1.15, 0.6);
      this.fx.flash(new THREE.Vector3(x, 0.6, z), '#bff4ff', radiusTiles * 2, 0.4);
      this.bursts.spawn(x, 0.4, z, '#e8faff', 56, 3.8, 1.8);
    } else if (fx === 'fire') {
      // v0.11 มังกรเพลิง: ระเบิดลาวารอบตัว
      this.fx.explosion(new THREE.Vector3(x, 0.4, z), radiusTiles * 0.55, { color: '#ff6a1a', scorchSize: radiusTiles * 1.5 });
      this.strikes.shockwave(x, z, '#ff8a2a', radiusTiles);
    } else {
      this.strikes.shockwave(x, z, '#ffb86a', radiusTiles);
      this.strikes.spikes(x, z, radiusTiles * 0.8, '#5e4a30', 0.9);
      this.bursts.spawn(x, 0.3, z, '#c8a878', 40, 3.6, 1.6);
    }
    this.shake(0.55);
  }
  // v0.11: ท่าโจมตีระยะไกลของบอส — หนามน้ำแข็งถล่ม / อุกกาบาตเพลิง (x, y = พิกัดโลก)
  bossStrike(x, y, radiusTiles, fx) {
    const px = x * S, pz = y * S;
    this.bossImpact(px, pz, radiusTiles, fx === 'icefall' ? '#9ae8ff' : fx === 'meteor' ? '#ff7a1a' : '#c89a5a');
    if (fx === 'icefall') {
      this.strikes.spikes(px, pz, radiusTiles, '#cdefff', 1.6);
      this.fx.ring(new THREE.Vector3(px, 0, pz), '#9ae8ff', 0.2, radiusTiles * 1.1, 0.5);
      this.bursts.spawn(px, 0.3, pz, '#ffffff', 30, 2.6, 1.8);
    } else if (fx === 'meteor') {
      this.fx.explosion(new THREE.Vector3(px, 0.3, pz), radiusTiles * 0.6, { color: '#ff7a1a', scorchSize: radiusTiles * 1.4 });
      this.shake(0.3);
    } else this.rootSpikes(x, y, radiusTiles);
  }
  // อุกกาบาตตกจากฟ้า (ใช้ก่อนระเบิด 0.35 วินาที)
  meteorFall(x, y) {
    this.projectiles.spawn({ from: [x * S - 2, 10, y * S - 1.5], to: [x * S, 0.3, y * S], kind: 'orb', color: '#ff6a1a', dur: 0.35, size: 0.6 });
  }
  playSlam(mob, dur) { const c = this.characters.get(mob); if (c && c.view.slam) c.view.slam(dur); }
  shake(amount) { this.shakeAmp = Math.max(this.shakeAmp, amount * (this.shakeScale ?? 1)); }   // shakeScale = 0 เมื่อปิดกล้องสั่นในเมนูตั้งค่า
  // ตัวช่วยเอฟเฟกต์สกิล v0.8 (pos = Vector3 ในหน่วยฉาก)
  punch(a) { this.punchAmt = Math.max(this.punchAmt, a); }
  skyFx(dark, dur) { this.sky.dark = dark; this.sky.t = 0; this.sky.dur = dur; }
  shockAt(pos, s) { const v = this.tmp.copy(pos).project(this.camera); if (v.z < 1) this.post.shock(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5, s); }
  // ฉลอง MVP: วงเวทย์ทองซ้อน + ละอองแสง
  mvpFx(entity) {
    this.circles.spawn(entity.x * S, entity.y * S, { color: '#ffd36b', size: 5, life: 3, pillar: true });
    this.circles.spawn(entity.x * S, entity.y * S, { color: '#ffffff', size: 2.6, life: 2.4, pillar: true });
    this.bursts.spawn(entity.x * S, 1, entity.y * S, '#ffe08a', 70, 3, 4);
  }

  /* ---------- เอฟเฟกต์สกิล (v0.6) ---------- */
  aimHeight(entity) {
    const c = this.characters.get(entity);
    return (c && c.kind === 'mob' ? entity.data.height * 0.6 : 0.95) * this.vs;
  }
  // ยิงกระสุนจาก entity ไปหา target ใช้เวลา dur วินาที
  projectile(from, to, { kind = 'orb', color = '#ff7a2a', dur = 0.4, size, arc = 0 } = {}) {
    this.projectiles.spawn({
      from: [from.x * S, from.isMonster ? this.aimHeight(from) : 1.05 * this.vs, from.y * S],
      to: [to.x * S, this.aimHeight(to), to.y * S], kind, color, dur, size, arc,
    });
  }
  // ฝนลูกธนูตกรอบจุด (หน่วยพิกเซลโลก)
  arrowRain(x, y, radiusTiles, dur = 0.45) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radiusTiles;
      const tx = x * S + Math.cos(a) * r, tz = y * S + Math.sin(a) * r;
      const delay = Math.random() * 0.2;
      this.projectiles.spawn({ from: [tx - 0.6, 6, tz - 0.4], to: [tx, 0.05, tz], kind: 'arrow', dur: dur + delay, color: '#ffd27a' });
    }
    this.circles.spawn(x * S, y * S, { color: '#ffd27a', size: radiusTiles * 2, life: 1.0, pillar: false });
  }
  lightning(x, y, color) { this.strikes.lightning(x * S, y * S, color); this.bursts.spawn(x * S, 0.2, y * S, color, 10, 2.2, 1.5); }
  shockwave(entity, color, radiusTiles) {
    this.strikes.shockwave(entity.x * S, entity.y * S, color, radiusTiles);
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: radiusTiles * 2.2, life: 0.8, pillar: false });
    this.bursts.spawn(entity.x * S, 0.3, entity.y * S, color, 30, 3.2, 1.2);
  }
  strikeFx(target, color = '#ffb03a') {
    const h = this.aimHeight(target);
    this.bursts.spawn(target.x * S, h, target.y * S, color, 22, 3.4, 1.4);
    this.strikes.shockwave(target.x * S, target.y * S, color, 1.1);
  }
  healFx(entity, color = '#7aff9a') {
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: 1.6, life: 1.0, pillar: false });
    this.bursts.spawn(entity.x * S, 0.4, entity.y * S, color, 26, 1.0, 2.6);
  }
  buffFx(entity, color = '#ffe08a') {
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: 1.8, life: 1.3, pillar: true });
    this.bursts.spawn(entity.x * S, 0.6, entity.y * S, color, 24, 1.2, 2.2);
  }
  // เปลี่ยนอาชีพ: วงเวทย์ใหญ่ + ลำแสงสูง
  jobChangeFx(entity, color = '#ffe08a') {
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: 4.2, life: 2.6, pillar: true });
    this.circles.spawn(entity.x * S, entity.y * S, { color: '#ffffff', size: 2.2, life: 2.0, pillar: true });
    this.bursts.spawn(entity.x * S, 0.5, entity.y * S, color, 60, 2.4, 3.6);
  }
  playHurt(entity) {
    const c = this.characters.get(entity); if (!c) return;
    c.view.hurt();
    const h = (c.kind === 'mob' ? entity.data.height * 0.6 : 0.9) * this.vs;
    this.bursts.spawn(entity.x * S, h, entity.y * S, c.kind === 'mob' ? '#fff0a0' : '#ff7a6a', 10, 2.4, 1.2);
  }
  playDeath(mob) {
    const c = this.characters.get(mob); if (!c) return;
    c.view.die();
    if (c.aura) this.bossDeath(mob);
    this.bursts.spawn(mob.x * S, 0.4, mob.y * S, '#e8f6ff', 22, 1.6, 2.2);
  }
  playRespawn(mob) {
    const c = this.characters.get(mob); if (!c) return;
    c.view.respawn();
    this.bursts.spawn(mob.x * S, 0.2, mob.y * S, '#c8f0ff', 14, 1.2, 1.6);
    this.circles.spawn(mob.x * S, mob.y * S, { color: '#b48cff', size: 1.4, life: 1.1, pillar: false });
  }
  // วงเวทย์ + ลำแสงตอนวาร์ปมาถึง / ฟื้นคืนชีพ (v0.93 fix7: แบบอลังการ — วงเวท 3 ชั้น เสาแสงจากฟ้า คลื่นกระแทก อนุภาค)
  posOf(entity) { const o = { x: 0, z: 0 }; return () => { o.x = entity.x * S; o.z = entity.y * S; return o; }; }
  warpIn(entity, color = '#8fd8ff') {
    if (this.safe) { this.circles.spawn(entity.x * S, entity.y * S, { color, size: 2.4, life: 1.8, pillar: true }); this.bursts.spawn(entity.x * S, 0.3, entity.y * S, color, 24, 1.4, 3); return; }   // fix14 โหมดประหยัด
    this.grand.warp(this.posOf(entity), color);
    this.bursts.spawn(entity.x * S, 0.3, entity.y * S, color, 24, 1.4, 3);
    screenFlash(color, 0.5);   // เรียกเฉพาะตัวเราเอง (วาร์ป/ฟื้น)
  }
  // อีโมตลอยเหนือหัว (เช่น "!" ตอนมอนเห็นเรา)
  emote(entity, text) {
    const el = document.createElement('div'); el.className = 'emote'; el.textContent = text;
    this.labelLayer.append(el);
    this.emotes.push({ el, entity, t: 0 });
  }
  // ตัวเลขดาเมจลอยขึ้น (แบบเด้งโค้ง)
  floatText(entity, text, cls, { life = 1.1, rise = 1, h: hOverride, drift = true } = {}) {
    const el = document.createElement('div');
    el.className = 'dmg ' + cls; el.textContent = text;
    this.labelLayer.append(el);
    const c = this.characters.get(entity);
    const h = hOverride ?? (c && c.kind === 'mob' ? entity.data.height + 0.2 : 1.8);
    this.floats.push({ el, x: entity.x * S, z: entity.y * S, h, t: 0, life, rise, dx: drift ? (Math.random() - 0.5) * 40 : 0 });
  }
  // เลเวลอัป (v0.93 fix7): เสาแสงทอง วงเวท รังสีอาทิตย์ วงแหวนไต่ขึ้นรอบตัว เกลียวดาว น้ำพุประกาย
  levelUp(entity, job = false) {
    const color = job ? '#7fd8ff' : '#ffd36b';
    if (this.safe) this.circles.spawn(entity.x * S, entity.y * S, { color, size: job ? 2.2 : 3.0, life: 2.2, pillar: true });   // fix14 โหมดประหยัด
    else this.grand.levelUp(this.posOf(entity), job);
    this.bursts.spawn(entity.x * S, 0.4, entity.y * S, color, job ? 24 : 40, 1.8, 3.4);
    if (job) this.floatText(entity, 'JOB LEVEL UP!', 'lvup job', { life: 2.2, rise: 0.8, h: 2.1, drift: false });
    else screenFlash('#ffe39a', 0.45);
  }
  setHover(entity) { this.hover = entity; }

  /* ---------- ของตกบนพื้น ---------- */
  itemTexture(id) {
    if (!this.iconTex.has(id)) {
      const t = new THREE.CanvasTexture(iconCanvas(id)); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
      this.iconTex.set(id, t);
    }
    return this.iconTex.get(id);
  }

  addDrop(drop, fromX, fromY) {
    const it = ITEMS[drop.id], rar = RARITY[it.rarity || 'common'];
    const g = new THREE.Group(); this.world.add(g);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.itemTexture(drop.id), alphaTest: 0.4, transparent: true, toneMapped: false }));
    sp.scale.set(0.62, 0.62, 1); sp.userData.drop = drop; sp.renderOrder = 4; g.add(sp);
    // v0.93 ป้ายสีพื้นหลังตามระดับไอเทม (ธรรมดา = เทา · ดี = เขียว · หายาก = ฟ้า · ล้ำค่า = ม่วง · ตำนานขึ้นไป = ส้ม/ทอง/แดง…) มองแวบเดียวรู้ว่าของระดับไหน
    const plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropPlateTexture(), color: it.rarity && it.rarity !== 'common' ? rar.color : '#9a96a4', transparent: true, opacity: it.rarity && it.rarity !== 'common' ? 0.92 : 0.7, depthWrite: false, toneMapped: false }));
    plate.scale.set(0.84, 0.84, 1); plate.renderOrder = 3; g.add(plate); sp.userData.plate = plate;
    let glow = null;
    if (it.rarity && it.rarity !== 'common') {
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: rar.color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(1.1, 1.1, 1); g.add(glow);
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.7 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);
    // v0.9: กล่องแฟชั่นเงิน/ทองคำ มีลำแสงพุ่งขึ้นฟ้า มองเห็นได้จากไกล
    let beam = null;
    if (it.type === 'box' && it.tier >= 2) {
      beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 3.2, 14, 1, true), new THREE.MeshBasicMaterial({ map: beamTexture(), color: it.tier >= 3 ? '#ffd36b' : '#8ac8ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      beam.position.y = 1.6; g.add(beam);
    }
    // v0.13: จิ้งจอกโคมไฟ → ของหายาก/การ์ด/กล่องมีลำแสงชี้ตำแหน่ง
    let petBeam = false;
    if (!beam && this.rareBeam && isRareDrop(it)) { beam = this.makeBeam(rar.color || '#ffe08a'); g.add(beam); petBeam = true; }
    const v = { g, sp, glow, sh, beam, petBeam, t: 0, from: { x: (fromX ?? drop.x) * S, z: (fromY ?? drop.y) * S }, to: { x: drop.x * S, z: drop.y * S }, seed: Math.random() * 6 };
    this.dropViews.set(drop, v);
    this.dropHits = [...this.dropViews.values()].map((d) => d.sp);
  }

  makeBeam(color) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, 2.8, 12, 1, true), new THREE.MeshBasicMaterial({ map: beamTexture(), color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.y = 1.4;
    return beam;
  }

  // เปิด/ปิดลำแสงของหายาก (เมื่อเรียก/เก็บจิ้งจอกโคมไฟ)
  setRareBeam(on) {
    if (this.rareBeam === on) return;
    this.rareBeam = on;
    for (const [drop, v] of this.dropViews) {
      const it = ITEMS[drop.id];
      if (on && !v.beam && isRareDrop(it)) { v.beam = this.makeBeam((RARITY[it.rarity] || RARITY.rare).color); v.g.add(v.beam); v.petBeam = true; }
      else if (!on && v.petBeam && v.beam) { v.g.remove(v.beam); v.beam.geometry.dispose(); v.beam.material.dispose(); v.beam = null; v.petBeam = false; }
    }
  }

  // ของบนพื้นลอยเข้าหาเป้าหมาย (ปากสัตว์เลี้ยง/ตัวผู้เล่น) แล้วหายไป · to = ฟังก์ชันคืนตำแหน่งโลก THREE.Vector3
  collectDrop(drop, to, dur = 0.35, onDone = null) {
    const v = this.dropViews.get(drop);
    if (!v) { if (onDone) onDone(); return; }
    this.dropViews.delete(drop);
    this.dropHits = [...this.dropViews.values()].map((d) => d.sp);
    if (this.hoverDrop === drop) { this.hoverDrop = null; this.dropLabel.hidden = true; }
    if (v.beam) v.beam.visible = false;
    const from = new THREE.Vector3(v.g.position.x, v.sp.position.y, v.g.position.z);
    this.flyDrops.push({ v, from, to, t: 0, dur, onDone });
  }

  updateFlyDrops(dt) {
    if (!this.flyDrops.length) return;
    for (const f of this.flyDrops) {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k), to = f.to();
      f.v.g.position.set(f.from.x + (to.x - f.from.x) * e, 0, f.from.z + (to.z - f.from.z) * e);
      f.v.sp.position.y = f.from.y + (to.y - f.from.y) * e + Math.sin(k * Math.PI) * 0.6;
      if (f.v.glow) f.v.glow.position.y = f.v.sp.position.y;
      if (f.v.sp.userData.plate) f.v.sp.userData.plate.position.y = f.v.sp.position.y;
      const sc = Math.max(0.05, 1 - Math.max(0, k - 0.55) * 2.2);
      f.v.sp.scale.set(0.62 * sc, 0.62 * sc, 1);
      f.v.sh.visible = k < 0.3;
      if (k >= 1) {
        f.done = true;
        if (f.v.g.parent) f.v.g.parent.remove(f.v.g);
        f.v.sp.material.dispose(); if (f.v.sp.userData.plate) f.v.sp.userData.plate.material.dispose(); f.v.sh.geometry.dispose(); f.v.sh.material.dispose(); if (f.v.glow) f.v.glow.material.dispose();
        if (f.v.beam) { f.v.beam.geometry.dispose(); f.v.beam.material.dispose(); }
        if (f.onDone) f.onDone();
      }
    }
    this.flyDrops = this.flyDrops.filter((f) => !f.done);
  }

  // เปลี่ยนป้ายชื่อเหนือหัว (ใบเปลี่ยนชื่อ)
  setName(entity, name) { const c = this.characters.get(entity); if (!c || !c.label) return; if (c.npc) c.label.textContent = name; else paintPlate(c.label, name, entity.baseLevel || 1, entity.guildTag, entity.inParty, !!entity.vip); }

  /* ---------- สัตว์เลี้ยง (v0.13) ---------- */
  // ent = { x, y, angle, moving, speedK } (พิกัดพิกเซลโลกเหมือนตัวละคร)
  addPet(ent, petId, stars = 0) {
    this.removePet(ent);
    const view = new PetView(petId, { world: this.costumeWorld, stars });
    view.root.traverse((o) => { if (o.isMesh && !o.material.transparent && !o.userData.outline) o.castShadow = true; });
    view.root.position.set(ent.x * S, 0, ent.y * S);
    view.root.rotation.y = ent.angle || 0;
    this.scene.add(view.root);
    if (this.ch) view.setViewport(this.fxVH || this.ch * this.renderer.getPixelRatio(), this.camera.fov);
    this.pets.set(ent, view);
    this.actorQuality({ view, kind: 'pet' });
    if (this.px.enabled) this.px.attach(view, view, 'pet');
    return view;
  }

  removePet(ent) {
    const v = this.pets.get(ent); if (!v) return;
    this.px.detach(v);
    v.dispose();
    this.pets.delete(ent);
  }

  updatePets(dt) {
    for (const [ent, v] of this.pets) {
      v.root.position.set(ent.x * S, 0, ent.y * S);
      v.root.rotation.y = lerpAngle(v.root.rotation.y, ent.angle || 0, damp(10, dt));
      v.root.visible = !ent.hidden;
      v.update(dt, { moving: !!ent.moving, speed: ent.speedK || 1 });
    }
  }

  removeDrop(drop) {
    const v = this.dropViews.get(drop); if (!v) return;
    this.world.remove(v.g);
    v.sp.material.dispose(); if (v.sp.userData.plate) v.sp.userData.plate.material.dispose(); v.sh.geometry.dispose(); v.sh.material.dispose(); if (v.glow) v.glow.material.dispose();
    if (v.beam) { v.beam.geometry.dispose(); v.beam.material.dispose(); }
    this.dropViews.delete(drop);
    this.dropHits = [...this.dropViews.values()].map((d) => d.sp);
    if (this.hoverDrop === drop) { this.hoverDrop = null; this.dropLabel.hidden = true; }
  }

  pickDrop(cx, cy) {
    if (!this.dropHits || !this.dropHits.length) return null;
    this.raycaster.setFromCamera(this.ndc(cx, cy), this.camera);
    const hit = this.raycaster.intersectObjects(this.dropHits, false)[0];
    return hit ? hit.object.userData.drop : null;
  }

  setHoverDrop(drop) {
    this.hoverDrop = drop;
    if (!drop) { this.dropLabel.hidden = true; return; }
    const it = ITEMS[drop.id];
    this.dropLabel.textContent = it.name;
    this.dropLabel.style.color = RARITY[it.rarity || 'common'].color; this.dropLabel.dataset.r = it.rarity || 'common';   // v0.93 พื้นหลังสีตามระดับ (CSS)
    this.dropLabel.hidden = false;
  }

  updateDrops(dt, t) {
    for (const [drop, v] of this.dropViews) {
      v.t += dt;
      const k = Math.min(1, v.t / 0.45);
      const x = v.from.x + (v.to.x - v.from.x) * k, z = v.from.z + (v.to.z - v.from.z) * k;
      const arc = k < 1 ? Math.sin(k * Math.PI) * 0.9 : 0;
      const bob = 0.34 + Math.sin(t * 3 + v.seed) * 0.05;
      v.g.position.set(x, 0, z);
      v.sp.position.y = bob + arc; if (v.sp.userData.plate) v.sp.userData.plate.position.y = v.sp.position.y;
      if (v.glow) { v.glow.position.y = v.sp.position.y; v.glow.material.opacity = 0.5 + Math.sin(t * 4 + v.seed) * 0.2; }
      if (v.beam) { v.beam.material.opacity = (0.38 + Math.sin(t * 3 + v.seed) * 0.12) * Math.min(1, k * 2); v.beam.rotation.y = t * 0.8; }
      v.g.visible = !drop.blink || Math.sin(t * 20) > -0.3;
    }
    if (this.hoverDrop && this.dropViews.has(this.hoverDrop)) {
      const v = this.dropViews.get(this.hoverDrop);
      const p = this.project(v.g.position.x, 0.75, v.g.position.z);
      if (p) this.dropLabel.style.transform = `translate3d(${p[0]}px, ${p[1]}px, 0) translate(-50%, -100%)`;
    }
  }

  // เปลี่ยนหน้าตาตัวละคร (เช่น เปลี่ยนอาวุธ/ชุด)
  refreshLook(entity) {
    const c = this.characters.get(entity); if (!c || c.kind === 'mob') return;
    const old = c.view;
    this.scene.remove(old.root);
    if (c.hitbox) old.root.remove(c.hitbox);   // ถอดก่อน dispose ไม่ให้เรขาคณิตกล่องคลิกถูกทิ้ง
    old.root.traverse((o) => { if (o.geometry && !o.userData.outline) o.geometry.dispose(); });
    disposeOwned(old.root);
    if (c.costume) { c.costume.dispose(); c.costume = null; }
    const { view, costume, glow, pxw } = this.buildView(entity, c.kind === 'npc');
    view.root.rotation.y = entity.angle;
    if (c.kind === 'npc') view.root.scale.setScalar(NPC_SCALE);
    this.scene.add(view.root);
    if (c.hitbox) view.root.add(c.hitbox);
    c.view = view; c.costume = costume; c.glow = glow; c.pxw = pxw;
    this.actorQuality(c);
    this.pxChar(entity, view);
    view.update(0, entity);
  }
  setTarget(entity) { this.target = entity; if (!entity) this.ring.hide(); }

  /* ---------- กล้อง ---------- */
  snapCamera(entity) {
    this.rig.target.set(entity.x * S, 0.55, entity.y * S);
    this.rig.yaw = this.rig.targetYaw; this.rig.dist = this.rig.targetDist; this.rig.pitch = this.rig.targetPitch;
    this.updateCamera(0);
  }

  rotateCamera(delta) { this.rig.targetYaw += delta; }
  // v0.17.1: ปรับมุมก้ม (โหมดพิกเซลเท่านั้น)
  tiltCamera(delta) { const C = this.camCfg(); this.rig.targetPitch = clamp(this.rig.targetPitch + delta, C.pmin, C.pmax); }
  camCfg() { return this.px && this.px.enabled ? CAM.px : CAM.d3; }
  // ตั้งกล้องตามโหมด · reset = กลับมุม/ระยะเริ่มต้นของโหมดนั้น
  camMode(reset = true) {
    const C = this.camCfg(), g = this.rig;
    if (reset) { g.pitch = g.targetPitch = C.pitch; this.wantDist = C.max; g.dist = g.targetDist = C.max; }
    if (this.cw) this.applyFov();
  }
  applyFov() {
    const portrait = this.cw < this.ch, C = this.camCfg();
    const base = portrait ? 52 : 32, fov = portrait ? C.fovP : C.fov;
    this.camera.fov = fov;
    this.distScale0 = portrait ? 1.25 : 1;   // จอแนวตั้ง: ถอยกล้องออกให้เห็นกว้างพอ
    this.distScale = this.distScale0 * Math.tan((base * D2R) / 2) / Math.tan((fov * D2R) / 2);
    this.camera.updateProjectionMatrix();
  }
  zoomCamera(factor) {
    const C = this.camCfg();
    this.wantDist = C.max;   // v0.48: ล็อกกล้องไว้ที่ระยะไกลสุด (ซูมไม่ได้)
    if (this.px && this.px.enabled) this.pxSnapZoom(); else { this.tagRef = 24; this.rig.targetDist = this.wantDist; }
  }

  updateCamera(dt, focus) {
    const g = this.rig;
    if (focus) g.target.lerp(this.tmp.set(focus.x * S, 0.55, focus.y * S), damp(7, dt));
    g.yaw = dt ? lerpAngle(g.yaw, g.targetYaw, damp(9, dt)) : g.yaw;
    g.dist = dt ? lerp(g.dist, g.targetDist, damp(9, dt)) : g.dist;
    if (Math.abs(g.dist - g.targetDist) < 0.01) g.dist = g.targetDist;   // v0.17: ให้ถึงระยะพิกเซลพอดี
    g.pitch = dt ? lerp(g.pitch, g.targetPitch, damp(9, dt)) : g.pitch;
    if (Math.abs(g.pitch - g.targetPitch) < 0.0005) g.pitch = g.targetPitch;
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch), d = g.dist * (this.distScale || 1) * (1 - 0.07 * this.punchAmt);
    this.punchAmt *= Math.max(0, 1 - dt * 9);   // กล้องพุ่งเข้าเล็กน้อยตอนกระแทกแรง แล้วถอยกลับ
    this.camera.position.set(g.target.x + Math.sin(g.yaw) * cp * d, g.target.y + sp * d, g.target.z + Math.cos(g.yaw) * cp * d);
    this.camera.lookAt(g.target);
    this.camExtras(d);
    // กล้องสั่น (บอสทุบพื้น)
    if (this.shakeAmp > 0.001) {
      const a = this.shakeAmp;
      this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a; this.camera.position.z += (Math.random() - 0.5) * a;
      this.shakeAmp *= Math.max(0, 1 - dt * 6);
    }
    // ให้เงาตามกล้อง (คมชัดเฉพาะบริเวณที่มองเห็น) และขยับทีละ texel เพื่อลดเงาสั่น
    const ext = Math.round(clamp(g.dist * 1.05, 13, 26));
    if (ext !== this.shadowExt) {
      const sc = this.sun.shadow.camera; sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.updateProjectionMatrix();
      this.shadowExt = ext;
    }
    const texel = (ext * 2) / this.sun.shadow.mapSize.x;
    // v0.27.1: โหมดพิกเซลขยับจุดเงาเป็นช่วงละ ~1 หน่วย (จำนวนเต็มเท่าของ texel) → วาดแผนที่เงาใหม่เฉพาะตอนขยับ
    const snap = this.px && this.px.enabled ? texel * Math.max(1, Math.round(1.5 / texel)) : texel;
    const sx = Math.round(g.target.x / snap) * snap, sz = Math.round(g.target.z / snap) * snap;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunOffset.x, this.sunOffset.y, sz + this.sunOffset.z);
  }

  // v0.17.1: ค่าที่ขึ้นกับมุม/ระยะกล้อง
  // · vs: สไปรต์วาดจากมุมก้ม 20° แต่ฉากมองจากมุมก้มชันกว่า → จุดบนตัว (มือ อก หัว) ต้องยกสูงขึ้น vs เท่าจึงตรงกับภาพบนจอ
  //   ใช้กับกระสุน/จุดโดนสกิล ป้ายชื่อ ตัวเลขดาเมจ และกล่องคลิกตัวละคร
  // · หมอก: นับจากจุดที่กล้องมอง (กล้องแบบ RO อยู่ไกลกว่าเดิมมาก)
  camExtras(d) {
    const px = this.px && this.px.enabled;
    const vs = px ? clamp(Math.cos(SPRITE_PITCH) / Math.cos(this.rig.pitch), 1, 2.6) : 1;
    this.vs = vs; if (this.fx) this.fx.vs = vs;
    if (this.costumeWorld) this.costumeWorld.scale.y = vs;   // อนุภาคจากชุดแฟชั่น/สัตว์เลี้ยง (ปล่อยจากตำแหน่งชิ้นส่วนโมเดล 3 มิติ) ให้ตรงสไปรต์
    if (this.hitboxes) for (const hb of this.hitboxes) {
      if (hb.userData.y0 === undefined) hb.userData.y0 = hb.position.y;
      if (hb.scale.y !== vs) { hb.scale.y = vs; hb.position.y = hb.userData.y0 * vs; hb.updateMatrixWorld(); }
    }
    // v0.24.1: ระยะ near/far ของกล้องตามระยะกล้องจริง — มือถือ Android หลายรุ่นเก็บความลึกได้หยาบ (16 บิต)
    // กล้องแบบ RO อยู่ไกล (~30–110 หน่วย) ถ้า near = 0.5 ค่าความลึกเป็นขั้นบันได → เส้นขอบพิกเซลขึ้นเป็นขีดแนวนอนทั้งจอ
    const cam = this.camera, cn = px ? Math.max(0.5, Math.min(d * 0.6, d - 25)) : 0.5, cf = px ? d + 110 : 220;
    if (Math.abs(cam.near - cn) > 0.05 || Math.abs(cam.far - cf) > 0.5) { cam.near = cn; cam.far = cf; cam.updateProjectionMatrix(); }
    const f = this.scene.fog, fb = this.fogBase || { near: 34, far: 80 };
    if (px) { const off = d - 13 * (this.distScale0 || 1); f.near = fb.near + off; f.far = fb.far + off; }
    else { f.near = fb.near; f.far = fb.far; }
  }

  get yaw() { return this.rig.yaw; }

  /* ---------- การเลือกจุดบนจอ ---------- */
  ndc(cx, cy) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return new THREE.Vector2((cx / w) * 2 - 1, -(cy / h) * 2 + 1);
  }

  pickGround(cx, cy) {
    this.raycaster.setFromCamera(this.ndc(cx, cy), this.camera);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, p)) return null;
    return { x: p.x * TILE, y: p.z * TILE };
  }

  // คืนค่า NPC หรือมอนสเตอร์ (ที่ยังมีชีวิต) ใต้ตำแหน่งบนจอ
  pickActor(cx, cy) {
    this.raycaster.setFromCamera(this.ndc(cx, cy), this.camera);
    const hits = this.raycaster.intersectObjects(this.hitboxes, false);
    for (const h of hits) {
      const a = h.object.userData.npc || h.object.userData.actor;
      if (a && !a.dead) return a;
    }
    // v0.88 ไม่โดนกล่องคลิกตรง ๆ (นิ้วบนมือถือ) → เลือกผู้เล่นคนอื่นที่ใกล้จุดแตะบนจอที่สุด (ไม่เกิน 40px)
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight, v = this.tmpPick || (this.tmpPick = new THREE.Vector3());
    let best = null, bd = 40;
    for (const [e, c] of this.characters) {
      if (c.kind !== 'remote' || e.dead) continue;
      for (const yy of [0.3, 0.95, 1.6]) {
        v.set(e.x * S, yy * (this.vs || 1), e.y * S).project(this.camera);
        if (v.z > 1) continue;
        const d = Math.hypot((v.x + 1) / 2 * w - cx, (1 - v.y) / 2 * h - cy);
        if (d < bd) { bd = d; best = e; }
      }
    }
    return best;
  }

  showMarker(x, y) { this.marker.show(x * S, y * S); }
  hideMarker() { this.marker.hide(); }
  // v0.14: วงเขตตีออโต้ (x, y = พิกเซลโลก · r = ช่อง)
  setAutoZone(x, y, r) { if (this.autoZone) this.autoZone.show(x * S, y * S, r); }
  hideAutoZone() { if (this.autoZone) this.autoZone.hide(); }

  // v0.90 กันจอกระพริบดำ: ขนาดจอเปลี่ยนระหว่างเล่น (มือถือ: แถบที่อยู่เว็บหด/ขยาย · คีย์บอร์ด · ResizeObserver ทำงานหลังวาดภาพ)
  // → จดไว้ก่อน แล้วค่อยเปลี่ยนขนาดบัฟเฟอร์ตอนต้นเฟรมถัดไปแล้ววาดทันที (การตั้งขนาดผืนภาพจะล้างภาพเป็นสีดำ)
  resize(w, h) {
    if (!(w > 0 && h > 0)) return;   // v0.16: แอปถูกย่อ/กำลังหมุนจอ (ขนาด 0) → ข้าม ไม่ให้กล้องเป็น NaN
    if (this.started3d && !this.noDraw) { this.sizePending = [w, h]; return; }
    this.doResize(w, h);
  }
  doResize(w, h) {
    this.sizePending = null;
    this.ratioPending = null;
    this.renderer.setPixelRatio(this.ratioFor(this.quality || 0));   // DPR อาจเปลี่ยน (ซูมเบราว์เซอร์/ย้ายจอ)
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.cw = w; this.ch = h;
    this.applyFov();   // v0.17.1: fov/ระยะตามโหมดกล้องและแนวจอ
    this.syncFxSize();
    if (this.px && this.px.enabled) { this.pxK = 0; this.pxSnapZoom(); }
  }

  // ขนาดอนุภาคและบัฟเฟอร์โพสต์โปรเซสต้องตามความละเอียดจริงของจอ
  syncFxSize() {
    if (!this.ch) return;
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.post.setSize(db.x, db.y);
    // v0.17: โหมดพิกเซล วาดฉากที่ความละเอียด 1/k → ขนาดอนุภาคคิดจากความสูงภาพพิกเซล
    const vh = this.px && this.px.enabled && this.pxK ? db.y / this.pxK : this.ch * this.renderer.getPixelRatio();
    this.fx.setViewport(vh, this.camera.fov);
    setGrandViewport(vh, this.camera.fov);
    for (const c of this.characters.values()) if (c.costume) c.costume.setViewport(vh, this.camera.fov);
    for (const v of this.pets.values()) v.setViewport(vh, this.camera.fov);
    this.fxVH = vh;
  }

  /* ---------- ปรับคุณภาพอัตโนมัติ ให้ลื่นบนเครื่องสเปกต่ำ ---------- */
  // v0.89 วงแสงนุ่มบนพื้น (บวกแสง วาดหลังแผ่นมืดกลางคืน) — ความแรงตามความมืด · โหมด HD สว่างกว่า
  addPool(world, x, z, r, color, k = 1) {
    if (!this.poolTex) {   // ไล่สีนุ่มแบบวงกลม (ไม่ใช้ลายพิกเซล)
      const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d');
      const gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
      this.poolTex = new THREE.CanvasTexture(c); this.poolTex.encoding = THREE.sRGBEncoding;
    }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.poolTex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    this.poolMat = true;
    m.position.set(x, 0.04, z); m.renderOrder = 2; m.visible = false; m.userData.k = k;
    world.add(m); this.pools.push(m);
  }
  updatePools(t) {
    if (!this.pools || !this.pools.length) return;
    const D = this.dayK, night = D ? Math.max(0, Math.min(1, (1 - (D.h || 1)) / 0.5)) : 0;
    const base = night * (this.hd ? 0.55 : 0.32);
    this.pools.forEach((m, i) => {
      const a = base * m.userData.k * (0.92 + Math.sin(t * 3.1 + i * 1.7) * 0.05 + Math.sin(t * 7.3 + i) * 0.03);
      m.visible = a > 0.01; if (m.visible) m.material.opacity = a;
    });
  }

  // v0.89 โหมด HD: วาดเต็มความละเอียด (k = 1) · ไม่เลื่อนกล้องตามตารางพิกเซล → กล้องนุ่ม · ยังมีเส้นขอบจากความลึก
  hdFrame() {
    const cam = this.camera, D = cam.position.distanceTo(this.rig.target);
    if (this.pxK !== 1) { this.pxK = 1; this.syncFxSize(); }
    cam.updateMatrixWorld();
    this.pxPoints(1);
    return { k: 1, wpp: 0, ox: 0, oy: 0, zo: D - 13 * (this.distScale0 || 1), hd: true };
  }
  // v0.89 ภาพ HD-2D: ตัวละครยังเป็นพิกเซลอาร์ต · ฉากวาดเต็มความละเอียด ขอบเรียบ (MSAA) กล้องเลื่อนนุ่ม
  // + แสงเรืองจากจุดสว่าง · ฉากไกลเบลอ · ปรับโทนสี (ใน PostFX) · ปิด = ภาพพิกเซลแบบเดิม
  setHD(on) {
    on = !!on;
    if (this.hd === on && this.hdInit) return;
    this.hd = on; this.hdInit = true;
    this.post.hd = on;
    PXAA.value = on && !this.mobile && !this.safe ? 1 : 0;   // v0.93 fix12 มือถือปิด · v0.93 fix9 HD = กล้องนุ่ม → เกลี่ยขอบพิกเซลลาย · พิกเซล = กล้องล็อกตาราง → คมแบบเดิม
    this.post.tilt = on ? (this.mobile ? 0.7 : 1) : 0;
    this.pxK = 0;
    document.body.classList.toggle('gfx-hd', on);   // 
    if (this.quality != null) this.setQuality(this.quality); else this.syncFxSize();
  }

  applyRatio() {
    if (this.ratioPending == null) return;
    this.renderer.setPixelRatio(this.ratioPending); this.ratioPending = null;
    if (this.cw) this.renderer.setSize(this.cw, this.ch, false);
    this.syncFxSize();
    if (this.px && this.px.enabled) { this.pxK = 0; if (!this.hd) this.pxSnapZoom(); }
  }

  ratioFor(level) {
    const dpr = window.devicePixelRatio || 1;
    const R = this.hd ? RATIOS_HD : RATIOS;
    return Math.min(dpr, (this.mobile ? R.mobile : R.desktop)[level] ?? 1);
  }

  setQuality(level) {
    this.quality = level;
    // v0.90 กันจอกระพริบดำ (มือถือ): เปลี่ยนขนาดบัฟเฟอร์ภาพเฉพาะเมื่ออัตราความละเอียดเปลี่ยนจริง
    // และเลื่อนไปทำตอนต้นเฟรมถัดไปก่อนวาด — เดิมปรับคุณภาพอัตโนมัติหลังวาดเสร็จ ผืนภาพถูกล้างเป็นสีดำ 1 เฟรม
    const ratio = this.ratioFor(level);
    if (ratio !== this.renderer.getPixelRatio()) { this.ratioPending = ratio; if (!this.started3d) this.applyRatio(); }
    // โหมดประหยัด: ปิดแสงเรือง (ระดับ 2) และปิดโพสต์โปรเซสทั้งหมด (ระดับ 3)
    this.post.bloom = level < 2 && this.bloomPref !== false;   // v0.11: ปิดแสงเรืองได้จากเมนูตั้งค่า
    this.post.enabled = level < 3;
    this.syncFxSize();
    this.renderer.shadowMap.enabled = level < 3;
    this.sun.castShadow = level < 3;
    // v0.16: ขนาดแผนที่เงากลับมาเมื่อเลือกคุณภาพสูงอีกครั้ง
    const want = level >= 2 || this.mobile ? 1024 : 2048;
    if (this.sun.shadow.mapSize.x !== want) {
      this.sun.shadow.mapSize.set(want, want);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      this.shadowExt = 0;
    }
    if (this.grass) for (const g of this.grass) g.visible = level < (this.mobile ? 2 : 3);
    if (this.flowers) for (const g of this.flowers) g.visible = level < 3;
    if (this.px) { this.px.budget = Math.max(2, (this.mobile ? 5 : 10) - level * (this.mobile ? 1 : 2)); this.px.slow = level; }   // v0.27.1: งบวาดสไปรต์ตามระดับคุณภาพ
    if (this.motes) this.motes.points.visible = level < 2;
    this.qualityLevel = level; if (this._ofx !== undefined) this.refreshOthersFx(); if (this.weather) this.weather.group.visible = level < 3 && this.weatherOn !== false;
    for (const c of this.characters.values()) this.actorQuality(c);
    for (const v of this.pets.values()) this.actorQuality({ view: v, kind: 'pet' });
  }

  // v0.16: มือถือ — ตัวละครอื่น/มอน/สัตว์เลี้ยงใช้เงาวงกลม (ไม่ทอดเงาจริง) · ระดับ 1 ขึ้นไปซ่อนเส้นขอบของตัวที่ไม่ใช่ผู้เล่น
  actorQuality(c) {
    if (!c || !c.view || !c.view.root) return;
    const mob = this.mobile, other = c.kind !== 'player';
    const noOutline = other && ((mob && this.quality >= 1) || this.quality >= 3);
    const noCast = other && (mob || this.quality >= 2);
    c.view.root.traverse((o) => {
      if (o.userData.outline) { o.visible = !noOutline && !(this.px && this.px.enabled); return; }   // v0.17: โหมดพิกเซลวาดเส้นขอบเอง
      if (o.isMesh) { if (o.userData.cs === undefined) o.userData.cs = o.castShadow; o.castShadow = o.userData.cs && !noCast && !o.userData.pxAlign; }
    });
  }

  // เลือกจุดแสงที่ใกล้กล้องที่สุด 2 จุดใส่ไฟจริง
  updatePropLights(dt) {
    const spots = [];
    for (const f of this.fires) spots.push(f.light);
    for (const p of this.portals) spots.push(p.light);
    this.lightPickT -= dt;
    if (this.lightPickT <= 0 || this.lightPick.some((s) => !spots.includes(s))) {
      this.lightPickT = 0.3;
      const c = this.rig.target;
      this.lightPick = spots.filter((s) => s.position.distanceToSquared(c) < 26 * 26).sort((a, b) => a.position.distanceToSquared(c) - b.position.distanceToSquared(c)).slice(0, this.propLights.length);
    }
    this.propLights.forEach((l, i) => {
      const s = this.lightPick[i];
      if (!s) { l.intensity = 0; return; }
      l.position.copy(s.position); l.color.copy(s.color); l.distance = s.distance; l.intensity = s.intensity;
    });
  }

  /* ---------- วาดทุกเฟรม ---------- */
  // simDt = เวลาของโลก (เป็น 0 ระหว่างหยุดภาพชั่วขณะตอนโจมตีแรง) · dt = เวลาจริงของกล้อง/ตัวหนังสือ
  render(dt, focus, simDt = dt) {
    this.started3d = true;
    if (this.sizePending && !this.noDraw) this.doResize(this.sizePending[0], this.sizePending[1]);
    if (this.ratioPending != null && !this.noDraw) this.applyRatio();   // v0.90 เปลี่ยนความละเอียดตอนต้นเฟรม แล้ววาดทันที (ไม่ค้างจอดำ)
    this.time += dt; const t = this.time;
    this.windTime.value = t;
    this.updateCamera(dt, focus);
    const pxi = !this.px.enabled ? null : this.hd ? this.hdFrame() : this.pxFrame();   // v0.17: ฉากพิกเซล (เลื่อนกล้องตรงตาราง ก่อนวางสไปรต์) · v0.89 โหมด HD เต็มความละเอียด ไม่ล็อกตาราง
    this.px.snap = pxi;
    if (this.seeCam) {
      this.seeCam.value.copy(this.camera.position);
      if (focus) this.seeFocus.value.set(focus.x * S, 1.0, focus.y * S);
    }

    this.water.update(t);
    for (const s of this.sprays) s.update(dt, t);
    for (const p of this.portals) p.update(t, this.lowFx);
    if (this.hwDecor) this.hwDecor.update(t);
    this.updateElites(t, simDt); this.updateChests(t);   // fix17
    this.updatePropLights(dt);
    const sm = this.renderer.shadowMap;
    if (sm.enabled) {
      if (this.px.enabled) {
        // v0.27.1: ตัวละครเป็นสไปรต์ (ไม่ทอดเงาจริง) → เงาฉากนิ่ง วาดใหม่เมื่อจุดเงาขยับ หรือทุก ~0.5 วินาที
        sm.autoUpdate = false;
        const key = this.sun.position.x + ',' + this.sun.position.z + ',' + this.shadowExt;
        this.shadowAge = (this.shadowAge || 0) + 1;
        if (key !== this.shadowKey || this.shadowAge > 30) { sm.needsUpdate = true; this.shadowKey = key; this.shadowAge = 0; }
      } else {
        sm.autoUpdate = !this.mobile;
        if (this.mobile) sm.needsUpdate = (this.frameN++ & 1) === 0;
      }
    }
    this.motes.update(t, this.rig.target.x, this.rig.target.z);
    if (this.weather) { const D = this.dayK; this.weather.update(dt, this.rig.target.x, this.rig.target.z, D ? Math.max(0, Math.min(1, (1 - (D.h || 1)) / 0.5)) : 0, Date.now(), this.camera.quaternion); }
    this.marker.update(dt);
    this.autoZone.update(dt);
    // v0.89 โหมด HD: กลางคืนแสงตะเกียง/คริสตัลสว่างและกว้างขึ้น
    const nightK = this.hd && this.dayK ? Math.max(0, Math.min(1, (1 - (this.dayK.h || 1)) / 0.5)) : 0;
    this.updatePools(t);
    this.glows.forEach((g, i) => {
      const k = 0.3 + Math.sin(t * 7 + i * 3) * 0.03 + Math.sin(t * 13 + i) * 0.02;
      g.material.opacity = Math.min(0.85, k * (1 + nightK * 1.4));
      if (g.userData.s0 == null) g.userData.s0 = g.scale.x;
      const sc = g.userData.s0 * (1 + nightK * 0.9); if (g.scale.x !== sc) g.scale.set(sc, sc * (g.scale.y / g.scale.x), 1);
    });
    this.flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.4 + i) * 0.35; f.scale.x = 1 + Math.sin(t * 5 + i) * 0.06; });
    for (const f of this.fires) { if (Math.abs(f.x - this.rig.target.x) < 26 && Math.abs(f.z - this.rig.target.z) < 26) f.update(t); else f.light.intensity = 1.3; }   // ไกลกล้อง: ไม่ต้องขยับอนุภาค
    for (const c of this.crystals) c.update(t);
    this.bursts.update(simDt);
    this.circles.update(simDt);
    this.grand.update(simDt);
    this.projectiles.update(simDt);
    this.strikes.update(simDt);
    this.telegraphs.update(dt);
    this.fx.update(simDt);
    this.post.update(dt);
    // ท้องฟ้ามืดลงระหว่างสกิลใหญ่ (อุกกาบาต · พายุ · กางเขน)
    if (this.sky.dur > 0) {
      const s = this.sky; s.t += simDt;
      const k = Math.min(1, s.t / s.dur), dark = s.dark * (k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1);
      this.hemi.intensity = this.baseLight.hemi * (1 - dark);
      this.sun.intensity = this.baseLight.sun * Math.max(0, 1 - dark * 1.1);
      if (k >= 1) s.dur = 0;
    }
    // วงเวทย์ร่ายสกิล
    const cs = focus && focus.cast;
    if (cs && !focus.dead) {
      const cc = this.castCircle; cc.visible = true;
      cc.position.set(focus.x * S, 0.05, focus.y * S);
      cc.material.color.set(cs.color || '#8fd8ff');
      cc.material.opacity = Math.min(0.85, cc.material.opacity + dt * 4);
      cc.rotation.z += dt * 1.6;
      const k = cs.total > 0 ? cs.t / cs.total : 1;
      cc.scale.setScalar(0.8 + k * 0.5);
    } else if (this.castCircle.visible) {
      this.castCircle.material.opacity -= dt * 4;
      if (this.castCircle.material.opacity <= 0) this.castCircle.visible = false;
    }
    if (this.target && !this.target.dead) this.ring.follow(this.target.x * S, this.target.y * S, t); else this.ring.hide();

    let glowC = null;
    for (const [entity, c] of this.characters) {
      c.view.update(simDt, entity);
      if (c.aura) this.updateBossAura(c, entity, simDt);
      if (c.kind === 'player' || c.kind === 'remote') { this.sheetChar(c, entity, simDt); this.pixelWear(c, entity, simDt); }
      else if (c.npcSheet) this.sheetChar(c, entity, simDt);   // fix21
      if (c.costume) { c.costume.update(simDt, c.view); if (c.glow && c.kind === 'player' && !c.sheet) glowC = c; }
      this.placeLabel(entity, c);
    }
    this.updateFloats(dt);
    this.updateEmotes(dt);
    this.updateDrops(dt, t);
    this.updateFlyDrops(dt);
    this.updatePets(simDt);
    if (this.pxvfx) this.pxvfx.update(simDt);
    this.scene.updateMatrixWorld();
    this.pxTint();
    this.px.setFocus(focus);
    this.px.update(dt);                       // v0.24: ผู้เล่นได้ลำดับวาดก่อนและอนิเมชั่น 30 fps
    // v0.9: สวมแฟชั่นระดับล้ำค่าขึ้นไป → ตัวผู้เล่นและอนุภาคแฟชั่นเข้ารอบแสงเรือง (เฉพาะโหมดกราฟิกที่เปิดแสงเรือง)
    const busy = this.fx.busy();
    const glowOn = !!glowC && this.post.enabled && this.post.bloom;
    const goal = glowOn && !busy ? Math.max(this.baseGlow, COSTUME_GLOW) : this.baseGlow;
    this.post.strength += (goal - this.post.strength) * Math.min(1, dt * 4);
    const roots = glowOn ? [this.fx.root, this.costumeWorld, glowC.view.root] : this.fx.hd ? [this.fx.root, this.fx.hd] : this.fx.root;
    if (this.noDraw) return;   // v0.87 หน้าเกมถูกซ่อน: อัปเดตทุกอย่างแต่ไม่วาด (ประหยัดเครื่อง)
    const gk = pxi ? pxi.k : 1;   // รอบแสงเรืองวาดที่ครึ่งจอ ส่วนอนุภาคตั้งขนาดไว้สำหรับภาพพิกเซล → คูณกลับ
    this.post.render(this.scene, this.camera, roots, (k) => { const kk = k === 1 ? 1 : k * gk; this.fx.setPixelScale(kk); if (glowOn) glowC.costume.pixelScale(kk); }, busy || glowOn, pxi);
    this.fx.hdRender(this.renderer, this.camera);   // v0.31.1: เลเยอร์เอฟเฟกต์ HD (อาชีพขั้นที่ 2) วาดทับที่ความละเอียดเต็ม
  }

  project(x, y, z) {
    const v = this.tmp.set(x, y, z).project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.25 || Math.abs(v.y) > 1.25) return null;
    return [Math.round((v.x * 0.5 + 0.5) * this.cw), Math.round((-v.y * 0.5 + 0.5) * this.ch)];
  }

  // v0.88 ขนาดป้ายชื่อ/ฉายาตามระยะกล้อง (กล้องไกลขึ้น → ตัวละครเล็กลง → ป้ายเล็กลงในสัดส่วนเดียวกัน · ไม่เล็กกว่า 62%)
  tagScale() {
    const d = this.rig && this.rig.dist, r = this.tagRef;
    if (!d || !r) return 1;
    const k = Math.round(Math.max(0.62, Math.min(1, r / d)) * 50) / 50;   // ปัดเป็นขั้น 0.02 ไม่ให้ข้อความสั่นตอนกล้องเลื่อน
    return k;
  }

  placeLabel(entity, c) {
    const x = entity.x * S, z = entity.y * S;
    if (c.kind === 'mob') {
      const show = !entity.dead && c.view.root.visible;
      const p = show ? this.project(x, -0.05, z) : null;
      const labelOn = p && (this.hover === entity || this.target === entity);
      const barOn = p && (entity.hp < entity.maxHp || this.target === entity);
      setH(c.label, !labelOn); setH(c.hpbar, !barOn);
      const mk = this.tagScale(), msc = mk === 1 ? '' : ` scale(${mk})`;   // v0.88 ย่อตามระยะกล้อง
      if (labelOn) setT(c.label, `translate3d(${p[0]}px, ${p[1] + 14 * mk}px, 0) translate(-50%, 0)${msc}`);
      if (barOn) {
        setT(c.hpbar, `translate3d(${p[0]}px, ${p[1] + 6 * mk}px, 0) translate(-50%, 0)${msc}`);
        if (c.lastHp !== entity.hp) { c.hpbar.firstChild.style.width = `${Math.max(0, entity.hp / entity.maxHp) * 100}%`; c.lastHp = entity.hp; }
      }
      return;
    }
    // v0.10: เครื่องหมายเควสเหนือป้ายชื่อ NPC (! เควสใหม่ · ? ส่งเควสได้ · … กำลังทำ)
    if (c.npc && c.qm !== (entity.questMark || null)) {
      c.qm = entity.questMark || null;
      let el = c.label.querySelector('.qm');
      if (!el) { el = document.createElement('span'); el.className = 'qm'; el.setAttribute('aria-hidden', 'true'); c.label.append(el); }
      el.dataset.m = c.qm === '…' ? 'wait' : c.qm === '?' ? 'ready' : c.qm === 'd' ? 'daily' : c.qm ? 'new' : '';
      el.textContent = c.qm === 'd' ? '!' : c.qm || '';
      el.hidden = !c.qm;
    }
    const p = this.project(x, c.npc ? ((c.sheet ? c.sheet.headH - 0.35 : c.head) + 0.2) * this.vs : -0.05, z);
    const k = this.tagScale(), sc = k === 1 ? '' : ` scale(${k})`;
    setV(c.label, !!p);
    if (c.hpbar) setV(c.hpbar, !!p);
    if (!p) { if (c.bubble) setH(c.bubble, true); for (const el of c.honorEls || []) setH(el, true); return; }
    const [sx, sy] = p;
    // v0.18: ฉายาเหนือหัว (ตัวเราและผู้เล่นคนอื่น)
    // v0.76 ฉายาได้สูงสุด 3 อัน เรียงซ้อนขึ้นไปเป็นแนวตั้ง (อันแรกชิดหัว) · ระยะห่างตามความอลังการของแต่ละระดับ
    const hons = !c.npc && !entity.dead ? (entity.honors || (entity.honor ? [{ title: entity.honor, tier: entity.honorTier, fx: entity.honorFx }] : [])) : [];
    c.honorH = 0; c.honorTop = null;
    if (hons.length || (c.honorEls && c.honorEls.length)) {
      const els = c.honorEls || (c.honorEls = []);
      while (els.length < hons.length) { const el = document.createElement('div'); el.className = 'tag-honor'; el.hidden = true; this.labelLayer.append(el); els.push(el); }
      const hp2 = hons.length ? this.project(x, ((c.sheet ? c.sheet.headH : c.head) - 0.12) * this.vs, z) : null;
      let off = 0;
      for (let i = 0; i < els.length; i++) {
        const h = hons[i], el = els[i];
        if (!h || !hp2) { setH(el, true); continue; }
        paintHonor(el, h.title, h.tier || 'common', h.fx || '');   // v0.30: เอฟเฟ็กตามความหายาก
        setH(el, false);
        setT(el, `translate3d(${hp2[0]}px, ${hp2[1] - off}px, 0) translate(-50%, -100%)${sc}`);
        el.style.zIndex = String(1 + i);
        off += (HONOR_H[h.tier] || 20) * k;
        if (hp2) c.honorTop = hp2[1] - off - (HONOR_FX_PAD[h.tier] || 0) * k;   // v0.83 ขอบบนสุดของกองฉายา (รวมลายประดับที่ยื่นเกิน)
      }
      c.honorH = off;
    }
    if (c.npc) setT(c.label, `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)${sc}`);
    else {
      // v0.36: กรอบป้ายชื่อตามเลเวล — ช่องข้อความของกรอบอยู่ใต้เท้า · แถบ HP ใต้กรอบ (ปีก/มงกุฎของกรอบยื่นรอบ ๆ ได้)
      const g = paintPlate(c.label, entity.name, entity.baseLevel || 1, entity.guildTag, entity.inParty, !!entity.vip);
      setT(c.label, `translate3d(${sx}px, ${sy + (6 - g.top) * k}px, 0) translate(-50%, 0)${sc}`);
      setT(c.hpbar, `translate3d(${sx}px, ${sy + (6 + g.h + 4) * k}px, 0) translate(-50%, 0)${sc}`);
      // แถบร่ายสกิลเหนือหัว
      const cs = entity.cast;
      if (!c.castbar) { /* ผู้เล่นคนอื่น: ไม่มีแถบร่าย */ }
      else if (cs && cs.total > 0 && !entity.dead) {
        const hp = this.project(x, (c.head + 0.55) * this.vs, z);
        if (hp) {
          if (c.castbar.hidden) { c.castbar.hidden = false; }
          if (c.castName !== cs.name) { c.castbar.firstChild.textContent = cs.name; c.castName = cs.name; }
          c.castbar.querySelector('i').style.width = `${Math.min(1, cs.t / cs.total) * 100}%`;
          setT(c.castbar, `translate3d(${hp[0]}px, ${hp[1]}px, 0) translate(-50%, -100%)${sc}`);
        }
      } else if (!c.castbar.hidden) { c.castbar.hidden = true; c.castName = ''; }
      if (c.lastHp !== entity.hp) {
        const k = Math.max(0, entity.hp / entity.maxHp);
        c.hpbar.firstChild.style.width = `${k * 100}%`;
        c.hpbar.classList.toggle('low', k < 0.3);
        c.lastHp = entity.hp;
      }
    }
    if (c.bubble) {
      const b = entity.bubble;
      if (b) {
        if (c.lastText !== b.text) { c.bubble.textContent = this.mobile && !c.npc && b.text.length > 56 ? b.text.slice(0, 54) + '…' : b.text; c.lastText = b.text; }   // v0.13: มือถือย่อข้อความยาวในบอลลูน
        setH(c.bubble, false);
        const op = String(Math.min(1, Math.round(b.t * 20) / 10)); if (c.bubble._o !== op) { c.bubble.style.opacity = op; c.bubble._o = op; }
        // v0.83 บอลลูนแชทของผู้เล่นอยู่ข้างตัวละคร (ไม่ชนฉายาบนหัว) · ชิดขอบจอขวา → สลับไปด้านซ้าย
        if (c.npc) setT(c.bubble, `translate3d(${sx}px, ${sy - 34}px, 0) translate(-50%, -100%)`);
        else {
          if (!c.bubble.classList.contains('bubble-side')) c.bubble.classList.add('bubble-side');
          if (c.bubbleText !== c.lastText || !c.bubbleW) { if (c.bubbleMax) { c.bubble.style.maxWidth = ''; c.bubbleMax = 0; } c.bubbleW = c.bubble.offsetWidth; c.bubbleText = c.lastText; }
          const hy = (this.project(x, (c.sheet ? c.sheet.headH : c.head) * 0.58 * this.vs, z) || p)[1];   // ระดับไหล่
          const gap = this.mobile ? 20 : 26, vw = Math.min(this.labelLayer.clientWidth || 1e5, window.innerWidth), w = c.bubbleW || 160;
          const right = vw - 6 - (sx + gap), left = sx - gap - 6;
          const flip = right < w && left > right;                       // ด้านขวาไม่พอและด้านซ้ายกว้างกว่า → ไปซ้าย
          const room = Math.max(90, Math.floor(flip ? left : right));
          const mx = room < w ? room : 0;                               // สองข้างไม่พอ → บีบความกว้างให้พอดีจอ
          if (c.bubbleMax !== mx) { c.bubble.style.maxWidth = mx ? `${mx}px` : ''; c.bubbleMax = mx; }
          if (c.bubbleFlip !== flip) { c.bubble.classList.toggle('flip', flip); c.bubbleFlip = flip; }
          setT(c.bubble, flip ? `translate3d(${sx - gap}px, ${hy}px, 0) translate(-100%, -50%)` : `translate3d(${sx + gap}px, ${hy}px, 0) translate(0, -50%)`);
        }
      } else if (!c.bubble.hidden) { c.bubble.hidden = true; c.lastText = ''; }
    }
  }

  updateEmotes(dt) {
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i];
      e.t += dt;
      const c = this.characters.get(e.entity);
      if (e.t > 1.4 || !c || e.entity.dead) { e.el.remove(); this.emotes.splice(i, 1); continue; }
      const p = this.project(e.entity.x * S, ((c.head || 1.4) + 0.55) * this.vs, e.entity.y * S);
      if (!p) { e.el.style.visibility = 'hidden'; continue; }
      e.el.style.visibility = 'visible';
      const pop = e.t < 0.15 ? 0.4 + e.t * 4.5 : 1 + Math.sin(e.t * 12) * 0.04 * Math.max(0, 1 - e.t);
      e.el.style.transform = `translate3d(${p[0]}px, ${p[1]}px, 0) translate(-50%, -100%) scale(${pop})`;
      e.el.style.opacity = e.t > 1.1 ? (1.4 - e.t) / 0.3 : 1;
    }
  }

  updateFloats(dt) {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.t += dt;
      if (f.t > f.life) { f.el.remove(); this.floats.splice(i, 1); continue; }
      const p = this.project(f.x, f.h * this.vs, f.z);
      if (!p) { f.el.style.visibility = 'hidden'; continue; }
      f.el.style.visibility = 'visible';
      const k = f.t / f.life;
      const rise = (46 * Math.sin(Math.min(1, f.t / 0.55) * Math.PI * 0.5) + 30 * Math.max(0, f.t - 0.55)) * f.rise;
      const pop = f.t < 0.12 ? 1.5 - f.t * 4 : 1;
      f.el.style.transform = `translate3d(${p[0] + f.dx * k}px, ${p[1] - rise}px, 0) translate(-50%, -50%) scale(${pop})`;
      f.el.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
  }

}
