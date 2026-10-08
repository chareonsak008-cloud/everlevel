// ตัววาดโลก 3 มิติ: แสงเงา, กล้อง, สร้างฉากจากข้อมูลแผนที่, ป้ายชื่อ
import { THREE } from './three.js';
import { TILE } from '../config.js';
import { T } from '../data/tileTypes.js';
import { rng, lerp, lerpAngle, damp, clamp } from '../core/util.js';
import { groundTexture, skyTexture, glowTexture, blobShadowTexture, magicCircleTexture, beamTexture } from './Textures.js';
import { batchStatic, mergeGeometries, std, lin } from './Geo.js';
import {
  BUILDERS, cityWalls, bridges, glowSprite, roundTreeGeometry, pineGeometry, treeMaterial, snowPineGeometry, snowTreeGeometry, deadTreeGeometry,
  grassTuftGeometry, flowerGeometry, rockGeometry,
} from './Models.js';
import { CharacterView } from './Characters.js';
import { iconCanvas } from './ItemIcons.js';
import { ITEMS, RARITY } from '../data/items.js';
import { MonsterView } from './Monsters.js';
import { Water, FountainSpray, Portal, Motes, ClickMarker, Bursts, TargetRing, Campfire, MagicCircles, WarpCrystal, Projectiles, Strikes, Telegraphs, AutoZone } from './Effects.js';
import { SkillFX } from './SkillFX.js';
import { PostFX } from './PostFX.js';
import { costumeLook, wearCostume } from './Costumes.js';
import { TIER_RANK } from '../data/fashionBoxes.js';
import { PetView } from './Pets.js';   // v0.13: สัตว์เลี้ยงช่วยเก็บของ

// ความแรงแสงเรืองของแฟชั่นระดับล้ำค่าขึ้นไป (ตอนไม่มีเอฟเฟกต์สกิล)
const COSTUME_GLOW = 1.6;

const S = 1 / TILE; // พิกัดโลก (px) → หน่วย 3 มิติ
const isRareDrop = (it) => !!it && (it.type === 'card' || it.type === 'box' || ['rare', 'epic', 'legend'].includes(it.rarity));

export class Renderer3D {
  constructor(canvas, labelLayer) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.75 : 2));
    r.outputEncoding = THREE.sRGBEncoding;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog('#d9e4e6', 34, 80);

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.5, 220);
    this.rig = { target: new THREE.Vector3(), yaw: 0, targetYaw: 0, dist: 13, targetDist: 13, pitch: 0.8 };

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
    this.post = new PostFX(r, { msaa: 4, strength: 1.0 });
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
      if (this.groundTex) this.groundTex.dispose();
      if (this.water) for (const m of [this.water.base, this.water.l1, this.water.l2]) m.dispose();
      this.world = null;
    }
    for (const [entity, c] of [...this.characters]) {
      if (c.kind === 'player') continue;
      this.removeActor(entity);
    }
    for (const f of this.floats) f.el.remove();
    for (const e of this.emotes) e.el.remove();
    this.dropViews.clear(); this.hoverDrop = null; this.dropLabel.hidden = true;
    this.flyDrops = [];
    this.floats = []; this.emotes = [];
    this.hover = null; this.target = null;
  }

  buildWorld(map) {
    this.clearWorld();
    this.map = map;
    const scene = this.scene, r = rng(99);
    const theme = map.def.theme || {};
    scene.fog.color.set(theme.fog || '#d9e4e6');
    // แสงตามธีมแผนที่ (ป่าทึบจะมืดและหมอกใกล้กว่า)
    const L = theme.light || {};
    scene.fog.near = theme.fogNear || 34; scene.fog.far = theme.fogFar || 80;
    this.hemi.intensity = L.hemi ?? 0.72;
    this.hemi.color.set(L.sky || '#dcefff'); this.hemi.groundColor.set(L.ground || '#6d7f48');
    this.sun.intensity = L.sun ?? 1.45; this.sun.color.set(L.sunColor || '#fff0d6');
    this.renderer.toneMappingExposure = L.exposure ?? 0.92;
    this.baseLight = { hemi: this.hemi.intensity, sun: this.sun.intensity };
    this.sky.dur = 0;
    this.fx.clear(); this.post.reset(); this.punchAmt = 0;
    // ความสว่างเอฟเฟกต์ตามแผนที่: กลางแจ้งสว่าง → ลดแสงบวก/เรืองลง ไม่ให้ขาวโพลน
    const FXL = theme.fx || {};
    this.fx.setGain(FXL.gain ?? 0.72);
    this.post.strength = this.baseGlow = FXL.glow ?? 0.7;
    this.post.flashScale = FXL.flash ?? 0.6;
    const world = this.world = new THREE.Group(); scene.add(world);

    // พื้น
    this.groundTex = groundTexture(map);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(map.w, map.h), new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(map.w / 2, 0, map.h / 2); ground.receiveShadow = true;
    world.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std('outer' + (theme.outer || '#5c9a40'), { color: theme.outer || '#5c9a40', roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(map.w / 2, -0.02, map.h / 2); outer.receiveShadow = true;
    world.add(outer);

    const statics = new THREE.Group();
    statics.add(cityWalls(map, T.WALL));
    statics.add(bridges(map, T.BRIDGE, T.WATER));

    this.water = new Water(theme.water || 'water');
    this.glows = []; this.flags = []; this.sprays = []; this.portals = []; this.fires = []; this.crystals = [];
    const trees = { round: [], pine: [] };

    for (const o of map.objects) {
      if (o.kind === 'tree' || o.kind === 'pine') {
        trees[o.kind === 'tree' ? 'round' : 'pine'].push({ x: o.cx, z: o.cy, seed: o.def.seed || 1 });
        continue;
      }
      const build = BUILDERS[o.kind]; if (!build) continue;
      const m = build(o.def);
      m.position.set(o.cx, 0, o.cy);
      if (o.def.rot) m.rotation.y = o.def.rot;
      statics.add(m);
      if (o.kind === 'lamp') {
        for (const sx of [-1, 1]) { const gl = glowSprite('#ffc970', 0.8, 0.3); gl.position.set(o.cx + sx * 0.32, 1.85, o.cy); world.add(gl); this.glows.push(gl); }
      }
      if (o.kind === 'campfire' || o.kind === 'vent') this.fires.push(new Campfire(world, o.cx, o.cy));
      if (o.kind === 'warpstone') this.crystals.push(new WarpCrystal(world, o.cx, o.cy, o.def.color));
      if (m.userData.glow) { const gl = glowSprite(m.userData.glow.color, 1.7, 0.32); gl.position.set(o.cx, m.userData.glow.y, o.cy); world.add(gl); this.glows.push(gl); }
      if (o.kind === 'fountain') {
        this.water.add(world, new THREE.CircleGeometry(1.34, 48).rotateX(-Math.PI / 2).translate(o.cx, 0, o.cy), 0.55, 3);
        this.water.add(world, new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2).translate(o.cx, 0, o.cy), 1.5, 1);
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
    const rockTint = theme.water === 'lava' ? (c) => c.setRGB(0.32, 0.26, 0.26) : theme.water === 'ice' ? (c) => c.setRGB(1.05, 1.1, 1.18) : null;
    this.instanced(world, rockGeometry(3), std('rock', { vertexColors: true, roughness: 0.9 }), rockSpots.map((p) => ({ ...p, s: 0.8 + r() * 0.9, rot: r() * 6 })), { cast: true, tint: rockTint });

    // ต้นไม้ (รวมป่ารอบนอกแผนที่เพื่อความลึก)
    for (let i = 0; i < 170; i++) {
      const side = i % 4; const t = r(); const d = 1 + r() * 9;
      const x = side === 0 ? -d : side === 1 ? map.w + d : t * (map.w + 16) - 8;
      const z = side === 2 ? -d : side === 3 ? map.h + d : t * (map.h + 16) - 8;
      (r() < 0.35 ? trees.pine : trees.round).push({ x, z, seed: i });
    }
    const tm = treeMaterial(); this.addWind(tm, 0.035, 0.9, true);
    // v0.11: ต้นไม้ตามธีม — สนหิมะ / ต้นไม้ไหม้เกรียม
    const TT = theme.trees;
    const roundGeos = TT === 'snow' ? [snowTreeGeometry(11), snowTreeGeometry(23)] : TT === 'dead' ? [deadTreeGeometry(11), deadTreeGeometry(23), deadTreeGeometry(37)] : [roundTreeGeometry(11), roundTreeGeometry(23), roundTreeGeometry(37)];
    const pineGeos = TT === 'snow' ? [snowPineGeometry(5), snowPineGeometry(9)] : TT === 'dead' ? [deadTreeGeometry(5), deadTreeGeometry(9)] : [pineGeometry(5), pineGeometry(9)];
    const tint = TT ? (c, v) => c.setRGB(0.9 + v * 0.15, 0.9 + v * 0.15, 0.92 + v * 0.15) : (c, v) => c.setRGB(0.82 + v * 0.3, 0.86 + v * 0.22, 0.8 + v * 0.25);
    roundGeos.forEach((geo, gi) => {
      const list = trees.round.filter((t) => t.seed % roundGeos.length === gi);
      this.instanced(world, geo, tm, list.map((t) => ({ ...t, s: 0.95 + ((t.seed * 37) % 10) / 22, rot: t.seed * 1.7 })), { cast: true, tint });
    });
    pineGeos.forEach((geo, gi) => {
      const list = trees.pine.filter((t) => t.seed % pineGeos.length === gi);
      this.instanced(world, geo, tm, list.map((t) => ({ ...t, s: 1.0 + ((t.seed * 13) % 10) / 20, rot: t.seed * 2.3 })), { cast: true, tint });
    });

    // หญ้าเป็นกอ + ดอกไม้ 3 มิติ (โยกตามลม)
    const gm = std('grassTuft', { vertexColors: true, roughness: 1, side: THREE.DoubleSide }); this.addWind(gm, 0.25, 0);
    const tufts = [], flowers = [];
    const fcols = (theme.flowers || ['#ffe36b', '#ff8fb8', '#ffffff', '#a9c8ff', '#ffb36b', '#d59bff']).map(lin);
    const tuftOn = theme.tufts !== false;
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tileAt(x, y); if (map.solid[map.idx(x, y)]) continue;
      if (t === T.GRASS && tuftOn && r() < 0.6) tufts.push({ x: x + r(), z: y + r(), s: 0.8 + r() * 0.8, rot: r() * 6 });
      if (t === T.FLOWERS) for (let k = 0; k < 6; k++) flowers.push({ x: x + r(), z: y + r(), s: 0.8 + r() * 0.5, rot: r() * 6, color: fcols[(r() * fcols.length) | 0] });
      if (t === T.FLOWERS && tuftOn && r() < 0.8) tufts.push({ x: x + r(), z: y + r(), s: 1, rot: r() * 6 });
    }
    this.grass = this.instanced(world, grassTuftGeometry(), gm, tufts, { cast: false });
    const fm = std('flowerMat', { vertexColors: true, roughness: 0.8 }); this.addWind(fm, 0.25, 0);
    this.instanced(world, flowerGeometry(), fm, flowers, { cast: false });

    // รวม mesh นิ่งทั้งหมด → draw call น้อย ลื่นไหล
    world.add(batchStatic(statics));
    world.add(statics); // ชิ้นที่ขยับได้ (ธง) ยังอยู่ในกลุ่มเดิม

    for (const p of map.portals) this.portals.push(new Portal(world, p.cx * S, p.cy * S, !!p.locked));
    this.motes = new Motes(world, theme.motes || '#fff3c4', theme.moteCount || 90, theme.moteSize || 0.1, theme.motesMode || 'float');
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
    this.projectiles = new Projectiles(world, this.bursts);
    this.strikes = new Strikes(world);
    this.telegraphs = new Telegraphs(world);
    // วงเวทย์ใต้เท้าระหว่างร่ายสกิล
    this.castCircle = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: magicCircleTexture(), color: '#8fd8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.castCircle.rotation.x = -Math.PI / 2; this.castCircle.visible = false; world.add(this.castCircle);
    if (this.quality) this.setQuality(this.quality); // คงโหมดคุณภาพเดิมไว้
  }

  instanced(parent, geo, mat, list, { cast = true, tint = null } = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((it, i) => {
      e.set(0, it.rot || 0, 0); q.setFromEuler(e);
      v.set(it.x, 0, it.z); sc.setScalar(it.s || 1);
      m.compose(v, q, sc); im.setMatrixAt(i, m);
      if (it.color) im.setColorAt(i, it.color);
      else if (tint) im.setColorAt(i, tint(c, ((i * 7919) % 100) / 100));
    });
    im.castShadow = cast; im.receiveShadow = true;
    parent.add(im);
    return im;
  }

  // เพิ่มการโยกตามลมใน vertex shader (ไม่กิน CPU)
  addWind(material, amount, minY, seeThrough = false) {
    const time = this.windTime;
    if (!this.seeCam) { this.seeCam = { value: new THREE.Vector3() }; this.seeFocus = { value: new THREE.Vector3(0, -99, 0) }; }
    const cam = this.seeCam, focus = this.seeFocus;
    material.onBeforeCompile = (shader) => {
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

  /* ---------- ตัวละคร ---------- */
  // สร้างโมเดลตัวละคร + ชุดแฟชั่น (เฉพาะผู้เล่น) — คืน { view, costume, glow }
  buildView(entity, npc = false) {
    const items = !npc && entity.fashionItems ? entity.fashionItems() : null;
    const has = !!items && Object.keys(items).length > 0;
    const look = has ? costumeLook(entity.look, items) : entity.look;
    const view = new CharacterView(look);
    let costume = null, glow = false;
    if (has) {
      costume = wearCostume(view, items, { world: this.costumeWorld, look });
      if (this.ch) costume.setViewport(this.ch * this.renderer.getPixelRatio(), this.camera.fov);
      glow = Object.values(items).some((it) => (TIER_RANK[it.rarity] || 0) >= 3);
    }
    return { view, costume, glow };
  }

  // remote = ผู้เล่นคนอื่นในโหมดออนไลน์ (v0.11): ป้ายชื่อ + เลเวล/อาชีพ + แถบ HP + ข้อความแชต
  addCharacter(entity, { npc = false, remote = false } = {}) {
    const { view, costume, glow } = this.buildView(entity, npc);
    view.root.rotation.y = entity.angle;
    this.scene.add(view.root);
    const scale = (entity.look && entity.look.scale) || 1;
    if (npc) {
      const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hb.position.y = 0.95; hb.userData.npc = entity; view.root.add(hb); this.hitboxes.push(hb);
    }
    const label = document.createElement('div');
    label.className = npc ? 'tag tag-npc' : remote ? 'tag tag-remote' : 'tag tag-player';
    label.textContent = entity.name;
    if (npc && entity.title) { const s = document.createElement('small'); s.textContent = entity.title; label.prepend(s); }
    if (remote) { const s = document.createElement('small'); s.className = 'rt'; s.textContent = entity.title || ''; label.append(s); }
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
    this.characters.set(entity, { view, costume, glow, label, bubble, hpbar, castbar, npc, kind: npc ? 'npc' : remote ? 'remote' : 'player', head: 1.38 * 1.3 * scale, lastText: '', lastHp: -1 });
    view.update(0, entity);
  }

  addMonster(mob) {
    const view = new MonsterView(mob);
    view.root.rotation.y = mob.angle;
    this.scene.add(view.root);
    const h = mob.data.height;
    const rad = mob.data.radius || 0.55;
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h + 0.4, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hb.position.y = (h + 0.4) / 2; hb.userData.actor = mob; view.root.add(hb); this.hitboxes.push(hb);
    const label = document.createElement('div'); label.className = 'tag tag-mob' + (mob.data.mvp ? ' tag-mvp' : ''); label.textContent = `${mob.data.mvp ? 'MVP · ' : ''}${mob.name} Lv.${mob.level}`; label.hidden = true;
    const hpbar = document.createElement('div'); hpbar.className = 'hpbar' + (mob.data.mvp ? ' hpbar-mvp' : ''); hpbar.innerHTML = '<i></i>'; hpbar.hidden = true;
    this.labelLayer.append(label, hpbar);
    this.characters.set(mob, { view, label, hpbar, kind: 'mob', head: h, lastHp: -1 });
    view.update(0, mob);
  }

  removeActor(entity) {
    const c = this.characters.get(entity); if (!c) return;
    this.scene.remove(c.view.root);
    c.view.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const i = this.hitboxes.indexOf(o); if (i >= 0) this.hitboxes.splice(i, 1);
    });
    if (c.view.dispose) c.view.dispose();
    if (c.costume) { c.costume.dispose(); c.costume = null; }
    for (const el of [c.label, c.bubble, c.hpbar, c.castbar]) if (el) el.remove();
    this.characters.delete(entity);
  }

  /* ---------- เอฟเฟกต์การต่อสู้ ---------- */
  playAttack(entity, kind) { const c = this.characters.get(entity); if (c) c.view.attack(kind); }

  /* ---------- บอส (v0.7) ---------- */
  telegraph(x, y, radiusTiles, dur, color = '#ff3a3a') { this.telegraphs.spawn(x * S, y * S, radiusTiles, dur, color); }
  rootSpikes(x, y, radiusTiles) {
    this.strikes.spikes(x * S, y * S, radiusTiles);
    this.bursts.spawn(x * S, 0.2, y * S, '#8a6a3e', 18, 2.4, 2.2);
  }
  bossSlam(mob, radiusTiles, fx) {
    const x = mob.x * S, z = mob.y * S;
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
    return c && c.kind === 'mob' ? entity.data.height * 0.6 : 0.95;
  }
  // ยิงกระสุนจาก entity ไปหา target ใช้เวลา dur วินาที
  projectile(from, to, { kind = 'orb', color = '#ff7a2a', dur = 0.4, size, arc = 0 } = {}) {
    this.projectiles.spawn({
      from: [from.x * S, from.isMonster ? this.aimHeight(from) : 1.05, from.y * S],
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
    const h = c.kind === 'mob' ? entity.data.height * 0.6 : 0.9;
    this.bursts.spawn(entity.x * S, h, entity.y * S, c.kind === 'mob' ? '#fff0a0' : '#ff7a6a', 10, 2.4, 1.2);
  }
  playDeath(mob) {
    const c = this.characters.get(mob); if (!c) return;
    c.view.die();
    this.bursts.spawn(mob.x * S, 0.4, mob.y * S, '#e8f6ff', 22, 1.6, 2.2);
  }
  playRespawn(mob) {
    const c = this.characters.get(mob); if (!c) return;
    c.view.respawn();
    this.bursts.spawn(mob.x * S, 0.2, mob.y * S, '#c8f0ff', 14, 1.2, 1.6);
    this.circles.spawn(mob.x * S, mob.y * S, { color: '#b48cff', size: 1.4, life: 1.1, pillar: false });
  }
  // วงเวทย์ + ลำแสงตอนวาร์ปมาถึง / ฟื้นคืนชีพ
  warpIn(entity, color = '#8fd8ff') {
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: 2.4, life: 1.8, pillar: true });
    this.bursts.spawn(entity.x * S, 0.3, entity.y * S, color, 24, 1.4, 3);
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
  // เลเวลอัป: วงเวทย์ทอง + ลำแสง + ตัวอักษรใหญ่
  levelUp(entity, job = false) {
    const color = job ? '#7fd8ff' : '#ffd36b';
    this.circles.spawn(entity.x * S, entity.y * S, { color, size: job ? 2.2 : 3.0, life: 2.2, pillar: true });
    this.bursts.spawn(entity.x * S, 0.4, entity.y * S, color, job ? 24 : 40, 1.8, 3.4);
    this.floatText(entity, job ? 'JOB LEVEL UP!' : 'LEVEL UP!', job ? 'lvup job' : 'lvup', { life: 2.2, rise: 0.8, h: job ? 2.1 : 2.4, drift: false });
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
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.itemTexture(drop.id), alphaTest: 0.4, toneMapped: false }));
    sp.scale.set(0.62, 0.62, 1); sp.userData.drop = drop; g.add(sp);
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
      const sc = Math.max(0.05, 1 - Math.max(0, k - 0.55) * 2.2);
      f.v.sp.scale.set(0.62 * sc, 0.62 * sc, 1);
      f.v.sh.visible = k < 0.3;
      if (k >= 1) {
        f.done = true;
        if (f.v.g.parent) f.v.g.parent.remove(f.v.g);
        f.v.sp.material.dispose(); f.v.sh.geometry.dispose(); f.v.sh.material.dispose(); if (f.v.glow) f.v.glow.material.dispose();
        if (f.v.beam) { f.v.beam.geometry.dispose(); f.v.beam.material.dispose(); }
        if (f.onDone) f.onDone();
      }
    }
    this.flyDrops = this.flyDrops.filter((f) => !f.done);
  }

  // เปลี่ยนป้ายชื่อเหนือหัว (ใบเปลี่ยนชื่อ)
  setName(entity, name) { const c = this.characters.get(entity); if (c && c.label) c.label.textContent = name; }

  /* ---------- สัตว์เลี้ยง (v0.13) ---------- */
  // ent = { x, y, angle, moving, speedK } (พิกัดพิกเซลโลกเหมือนตัวละคร)
  addPet(ent, petId, stars = 0) {
    this.removePet(ent);
    const view = new PetView(petId, { world: this.costumeWorld, stars });
    view.root.traverse((o) => { if (o.isMesh && !o.material.transparent && !o.userData.outline) o.castShadow = true; });
    view.root.position.set(ent.x * S, 0, ent.y * S);
    view.root.rotation.y = ent.angle || 0;
    this.scene.add(view.root);
    if (this.ch) view.setViewport(this.ch * this.renderer.getPixelRatio(), this.camera.fov);
    this.pets.set(ent, view);
    return view;
  }

  removePet(ent) {
    const v = this.pets.get(ent); if (!v) return;
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
    v.sp.material.dispose(); v.sh.geometry.dispose(); v.sh.material.dispose(); if (v.glow) v.glow.material.dispose();
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
    this.dropLabel.style.color = RARITY[it.rarity || 'common'].color;
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
      v.sp.position.y = bob + arc;
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
    if (c.hitbox) old.root.remove(c.hitbox);
    old.root.traverse((o) => { if (o.geometry && !o.userData.outline) o.geometry.dispose(); });
    if (c.costume) { c.costume.dispose(); c.costume = null; }
    const { view, costume, glow } = this.buildView(entity, c.kind === 'npc');
    view.root.rotation.y = entity.angle;
    this.scene.add(view.root);
    if (c.hitbox) view.root.add(c.hitbox);
    c.view = view; c.costume = costume; c.glow = glow;
    view.update(0, entity);
  }
  setTarget(entity) { this.target = entity; if (!entity) this.ring.hide(); }

  /* ---------- กล้อง ---------- */
  snapCamera(entity) {
    this.rig.target.set(entity.x * S, 0.55, entity.y * S);
    this.rig.yaw = this.rig.targetYaw; this.rig.dist = this.rig.targetDist;
    this.updateCamera(0);
  }

  rotateCamera(delta) { this.rig.targetYaw += delta; }
  zoomCamera(factor) { this.rig.targetDist = clamp(this.rig.targetDist * factor, 7, 24); }

  updateCamera(dt, focus) {
    const g = this.rig;
    if (focus) g.target.lerp(this.tmp.set(focus.x * S, 0.55, focus.y * S), damp(7, dt));
    g.yaw = dt ? lerpAngle(g.yaw, g.targetYaw, damp(9, dt)) : g.yaw;
    g.dist = dt ? lerp(g.dist, g.targetDist, damp(9, dt)) : g.dist;
    const cp = Math.cos(g.pitch), sp = Math.sin(g.pitch), d = g.dist * (this.distScale || 1) * (1 - 0.07 * this.punchAmt);
    this.punchAmt *= Math.max(0, 1 - dt * 9);   // กล้องพุ่งเข้าเล็กน้อยตอนกระแทกแรง แล้วถอยกลับ
    this.camera.position.set(g.target.x + Math.sin(g.yaw) * cp * d, g.target.y + sp * d, g.target.z + Math.cos(g.yaw) * cp * d);
    this.camera.lookAt(g.target);
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
    const sx = Math.round(g.target.x / texel) * texel, sz = Math.round(g.target.z / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunOffset.x, this.sunOffset.y, sz + this.sunOffset.z);
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
    return null;
  }

  showMarker(x, y) { this.marker.show(x * S, y * S); }
  hideMarker() { this.marker.hide(); }
  // v0.14: วงเขตตีออโต้ (x, y = พิกเซลโลก · r = ช่อง)
  setAutoZone(x, y, r) { if (this.autoZone) this.autoZone.show(x * S, y * S, r); }
  hideAutoZone() { if (this.autoZone) this.autoZone.hide(); }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // จอแนวตั้ง: ถอยกล้องออกให้เห็นกว้างพอ
    const portrait = w < h;
    this.camera.fov = portrait ? 52 : 32;
    this.distScale = portrait ? 1.25 : 1;
    this.camera.updateProjectionMatrix();
    this.cw = w; this.ch = h;
    this.syncFxSize();
  }

  // ขนาดอนุภาคและบัฟเฟอร์โพสต์โปรเซสต้องตามความละเอียดจริงของจอ
  syncFxSize() {
    if (!this.ch) return;
    this.fx.setViewport(this.ch * this.renderer.getPixelRatio(), this.camera.fov);
    for (const c of this.characters.values()) if (c.costume) c.costume.setViewport(this.ch * this.renderer.getPixelRatio(), this.camera.fov);
    for (const v of this.pets.values()) v.setViewport(this.ch * this.renderer.getPixelRatio(), this.camera.fov);
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.post.setSize(db.x, db.y);
  }

  /* ---------- ปรับคุณภาพอัตโนมัติ ให้ลื่นบนเครื่องสเปกต่ำ ---------- */
  setQuality(level) {
    this.quality = level;
    const dpr = window.devicePixelRatio || 1;
    const ratio = [Math.min(dpr, this.mobile ? 1.75 : 2), Math.min(dpr, 1.25), 1, 0.8][level];
    this.renderer.setPixelRatio(ratio);
    if (this.cw) this.renderer.setSize(this.cw, this.ch, false);
    // โหมดประหยัด: ปิดแสงเรือง (ระดับ 2) และปิดโพสต์โปรเซสทั้งหมด (ระดับ 3)
    this.post.bloom = level < 2 && this.bloomPref !== false;   // v0.11: ปิดแสงเรืองได้จากเมนูตั้งค่า
    this.post.enabled = level < 3;
    this.syncFxSize();
    this.renderer.shadowMap.enabled = level < 3;
    this.sun.castShadow = level < 3;
    if (level >= 2 && this.sun.shadow.mapSize.x > 1024) {
      this.sun.shadow.mapSize.set(1024, 1024);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      this.shadowExt = 0;
    }
    if (this.grass) this.grass.visible = level < 3;
    if (this.motes) this.motes.points.visible = level < 2;
  }

  /* ---------- วาดทุกเฟรม ---------- */
  // simDt = เวลาของโลก (เป็น 0 ระหว่างหยุดภาพชั่วขณะตอนโจมตีแรง) · dt = เวลาจริงของกล้อง/ตัวหนังสือ
  render(dt, focus, simDt = dt) {
    this.time += dt; const t = this.time;
    this.windTime.value = t;
    this.updateCamera(dt, focus);
    if (this.seeCam) {
      this.seeCam.value.copy(this.camera.position);
      if (focus) this.seeFocus.value.set(focus.x * S, 1.0, focus.y * S);
    }

    this.water.update(t);
    for (const s of this.sprays) s.update(dt, t);
    for (const p of this.portals) p.update(t);
    this.motes.update(t, this.rig.target.x, this.rig.target.z);
    this.marker.update(dt);
    this.autoZone.update(dt);
    this.glows.forEach((g, i) => { const k = 0.3 + Math.sin(t * 7 + i * 3) * 0.03 + Math.sin(t * 13 + i) * 0.02; g.material.opacity = k; });
    this.flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2.4 + i) * 0.35; f.scale.x = 1 + Math.sin(t * 5 + i) * 0.06; });
    for (const f of this.fires) f.update(t);
    for (const c of this.crystals) c.update(t);
    this.bursts.update(simDt);
    this.circles.update(simDt);
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
      if (c.costume) { c.costume.update(simDt, c.view); if (c.glow && c.kind === 'player') glowC = c; }
      this.placeLabel(entity, c);
    }
    this.updateFloats(dt);
    this.updateEmotes(dt);
    this.updateDrops(dt, t);
    this.updateFlyDrops(dt);
    this.updatePets(simDt);
    // v0.9: สวมแฟชั่นระดับล้ำค่าขึ้นไป → ตัวผู้เล่นและอนุภาคแฟชั่นเข้ารอบแสงเรือง (เฉพาะโหมดกราฟิกที่เปิดแสงเรือง)
    const busy = this.fx.busy();
    const glowOn = !!glowC && this.post.enabled && this.post.bloom;
    const goal = glowOn && !busy ? Math.max(this.baseGlow, COSTUME_GLOW) : this.baseGlow;
    this.post.strength += (goal - this.post.strength) * Math.min(1, dt * 4);
    const roots = glowOn ? [this.fx.root, this.costumeWorld, glowC.view.root] : this.fx.root;
    this.post.render(this.scene, this.camera, roots, (k) => { this.fx.setPixelScale(k); if (glowOn) glowC.costume.pixelScale(k); }, busy || glowOn);
  }

  project(x, y, z) {
    const v = this.tmp.set(x, y, z).project(this.camera);
    if (v.z > 1 || Math.abs(v.x) > 1.25 || Math.abs(v.y) > 1.25) return null;
    return [Math.round((v.x * 0.5 + 0.5) * this.cw), Math.round((-v.y * 0.5 + 0.5) * this.ch)];
  }

  placeLabel(entity, c) {
    const x = entity.x * S, z = entity.y * S;
    if (c.kind === 'mob') {
      const show = !entity.dead && c.view.root.visible;
      const p = show ? this.project(x, -0.05, z) : null;
      const labelOn = p && (this.hover === entity || this.target === entity);
      const barOn = p && (entity.hp < entity.maxHp || this.target === entity);
      c.label.hidden = !labelOn; c.hpbar.hidden = !barOn;
      if (labelOn) c.label.style.transform = `translate3d(${p[0]}px, ${p[1] + 14}px, 0) translate(-50%, 0)`;
      if (barOn) {
        c.hpbar.style.transform = `translate3d(${p[0]}px, ${p[1] + 6}px, 0) translate(-50%, 0)`;
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
    const p = this.project(x, c.npc ? c.head + 0.2 : -0.05, z);
    c.label.style.visibility = p ? 'visible' : 'hidden';
    if (c.hpbar) c.hpbar.style.visibility = p ? 'visible' : 'hidden';
    if (!p) { if (c.bubble) c.bubble.hidden = true; return; }
    const [sx, sy] = p;
    if (c.npc) c.label.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
    else {
      c.label.style.transform = `translate3d(${sx}px, ${sy + 6}px, 0) translate(-50%, 0)`;
      c.hpbar.style.transform = `translate3d(${sx}px, ${sy + (c.kind === 'remote' ? 37 : 26)}px, 0) translate(-50%, 0)`;
      if (c.kind === 'player' && c.lastName !== entity.name) { c.label.textContent = entity.name; c.lastName = entity.name; }   // ชื่อตัวละครที่ตั้งตอนสร้าง
      if (c.kind === 'remote' && c.lastTitle !== entity.title) { const t = c.label.querySelector('.rt'); if (t) t.textContent = entity.title; c.lastTitle = entity.title; }
      // แถบร่ายสกิลเหนือหัว
      const cs = entity.cast;
      if (!c.castbar) { /* ผู้เล่นคนอื่น: ไม่มีแถบร่าย */ }
      else if (cs && cs.total > 0 && !entity.dead) {
        const hp = this.project(x, c.head + 0.55, z);
        if (hp) {
          if (c.castbar.hidden) { c.castbar.hidden = false; }
          if (c.castName !== cs.name) { c.castbar.firstChild.textContent = cs.name; c.castName = cs.name; }
          c.castbar.querySelector('i').style.width = `${Math.min(1, cs.t / cs.total) * 100}%`;
          c.castbar.style.transform = `translate3d(${hp[0]}px, ${hp[1]}px, 0) translate(-50%, -100%)`;
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
        c.bubble.hidden = false;
        c.bubble.style.opacity = Math.min(1, b.t * 2);
        c.bubble.style.transform = c.npc ? `translate3d(${sx}px, ${sy - 34}px, 0) translate(-50%, -100%)` : `translate3d(${sx}px, ${(this.project(x, c.head + 0.35, z) || p)[1]}px, 0) translate(-50%, -100%)`;
      } else if (!c.bubble.hidden) { c.bubble.hidden = true; c.lastText = ''; }
    }
  }

  updateEmotes(dt) {
    for (let i = this.emotes.length - 1; i >= 0; i--) {
      const e = this.emotes[i];
      e.t += dt;
      const c = this.characters.get(e.entity);
      if (e.t > 1.4 || !c || e.entity.dead) { e.el.remove(); this.emotes.splice(i, 1); continue; }
      const p = this.project(e.entity.x * S, (c.head || 1.4) + 0.55, e.entity.y * S);
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
      const p = this.project(f.x, f.h, f.z);
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
