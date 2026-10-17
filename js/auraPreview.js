// v0.28 พรีวิวออร่าระเบิดกระจาย — ใช้โมเดล สไปรต์พิกเซล และระบบอนุภาคเดียวกับในเกม
import { THREE } from './render/three.js?v=0.40.6';
import { CharacterView } from './render/Characters.js?v=0.40.6';
import { costumeLook, wearCostume } from './render/Costumes.js?v=0.40.6';
import { PixelSprites } from './render/PixelSprites.js?v=0.40.6';
import { COSTUME_BY_ID } from './data/costumes.js?v=0.40.6';

const $ = (s) => document.querySelector(s);
const AURAS = ['a_supernova', 'a_thunderGod', 'a_prism', 'a_voidRift', 'a_blossomStorm'];
const OLD = ['a_inferno', 'a_heavenLight', 'a_constellation', 'a_bloodRing'];
const RAR = { mythic: ['Mythical', '#ff6a5a'], celestial: ['Celestial', '#8ae8ff'] };
const JOBS = {
  swordsman: { name: 'นักดาบ', look: { hair: '#e8a838', tunic: '#9a3a3a', pants: '#3a2e2a', jobGear: 'swordsman', weapon: 'sword', scarf: '#e8e2d8' } },
  mage: { name: 'นักเวทย์', look: { hair: '#6a4a8a', tunic: '#3e3a8a', pants: '#2e2a4a', jobGear: 'mage', accessory: 'wizard', hatColor: '#3e3a8a' } },
  archer: { name: 'นักธนู', look: { hair: '#e8c870', tunic: '#3a7a3a', pants: '#4a3a28', jobGear: 'archer', weapon: 'bow' } },
  acolyte: { name: 'นักบวช', look: { hair: '#c86a3a', tunic: '#f0ece0', pants: '#5a4a6a', jobGear: 'acolyte', weapon: 'mace' } },
};
const GROUNDS = {
  grass: { name: 'ทุ่งหญ้า', base: '#5aa84a', dots: ['#6cbc58', '#4c9440', '#7fcc62', '#3f8a38'], fog: '#cfe6c4', sky: '#9fd0e8' },
  night: { name: 'ราตรี', base: '#23304a', dots: ['#2c3c5a', '#1c2840', '#34466a', '#18223a'], fog: '#141c30', sky: '#0b1226' },
  snow: { name: 'หิมะ', base: '#e4edf6', dots: ['#f6f9fc', '#d0dcea', '#ffffff', '#c4d2e2'], fog: '#e8f0f8', sky: '#cfe0f0' },
  lava: { name: 'ภูเขาไฟ', base: '#3a2622', dots: ['#4a2e28', '#2a1a18', '#5a3228', '#ff6a2a'], fog: '#2a1a16', sky: '#1a0e0c' },
};

const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
renderer.setPixelRatio(1);
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 120);
const hemi = new THREE.HemisphereLight('#f4f0ff', '#4a5a3a', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 1.1); sun.position.set(-4, 8, 6); scene.add(sun);

// พื้นพิกเซล (ลายจุดสุ่มแบบในเกม)
function groundTex(G) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = G.base; g.fillRect(0, 0, 128, 128);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.fillStyle = G.dots[(r() * (G.dots.length - 1)) | 0]; g.fillRect((r() * 64 | 0) * 2, (r() * 64 | 0) * 2, 2, 2); }
  if (G.dots[3] && G === GROUNDS.lava) for (let i = 0; i < 26; i++) { g.fillStyle = G.dots[3]; g.fillRect((r() * 64 | 0) * 2, (r() * 64 | 0) * 2, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.encoding = THREE.sRGBEncoding;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; scene.add(shadow);
function setGround(key) {
  const G = GROUNDS[key]; ground.material.map && ground.material.map.dispose(); ground.material.map = groundTex(G); ground.material.needsUpdate = true;
  scene.background = new THREE.Color(G.sky); scene.fog = new THREE.Fog(G.fog, 14, 34);
  hemi.intensity = key === 'night' || key === 'lava' ? 0.55 : 1.0; sun.intensity = key === 'night' ? 0.45 : 1.1;
  state.ground = key; mark('#grounds', key);
}

const px = new PixelSprites(renderer, scene, camera);
const entity = { x: 0, y: 0, angle: 0.4, moving: false, speedFactor: 1, dead: false, castPose: false };
const state = { aura: AURAS[0], job: 'mage', ground: 'grass', walk: false, orbit: true, yaw: 0.6, view: null, rt: null, t: 0 };

function build() {
  if (state.rt) state.rt.dispose();
  if (state.view) { px.detach('me'); scene.remove(state.view.root); }
  const it = COSTUME_BY_ID[state.aura];
  const items = { aura: it };
  const look = costumeLook({ skin: '#f6d6b8', eye: '#3a2440', boot: '#2e2420', belt: '#c9a24a', hairStyle: 'short', ...JOBS[state.job].look }, items);
  const view = new CharacterView(look); view.phase = 0; view.time = 0;
  view.root.rotation.y = entity.angle; scene.add(view.root);
  state.view = view;
  state.rt = wearCostume(view, items, { world: scene, look });
  px.attach('me', view, 'char', { eyes: PixelSprites.eyeMarkers(view), eyeColor: look.eye, face: view.face });
  px.setFocus('me');
  resize();
  const R = RAR[it.rarity] || ['Legend', '#ffd27a'];
  $('#name').textContent = it.name; $('#en').textContent = it.en;
  $('#rar').textContent = R[0]; $('#rar').style.color = R[1]; $('#rar').style.borderColor = R[1];
  $('#desc').textContent = it.desc;
  mark('#auras', state.aura); mark('#olds', state.aura); mark('#jobs', state.job);
}
function mark(sel, id) { document.querySelectorAll(sel + ' button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id))); }

function addButtons(sel, list, label, onPick) {
  const box = $(sel);
  for (const id of list) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.innerHTML = label(id);
    b.addEventListener('click', () => onPick(id)); box.append(b);
  }
}
addButtons('#auras', AURAS, (id) => { const it = COSTUME_BY_ID[id], R = RAR[it.rarity]; return `<i style="background:${R[1]}"></i><b>${it.name}</b><small>${it.en}</small>`; }, (id) => { state.aura = id; build(); });
addButtons('#olds', OLD.filter((id) => COSTUME_BY_ID[id]), (id) => COSTUME_BY_ID[id].name, (id) => { state.aura = id; build(); });
addButtons('#jobs', Object.keys(JOBS), (id) => JOBS[id].name, (id) => { state.job = id; build(); });
addButtons('#grounds', Object.keys(GROUNDS), (id) => GROUNDS[id].name, (id) => setGround(id));
$('#walk').addEventListener('click', (e) => { state.walk = !state.walk; e.currentTarget.setAttribute('aria-pressed', String(state.walk)); });
$('#orbit').addEventListener('click', (e) => { state.orbit = !state.orbit; e.currentTarget.setAttribute('aria-pressed', String(state.orbit)); });

// ลากเพื่อหมุนกล้อง
let drag = null;
stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw: state.yaw }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => { if (drag) { state.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; } });
stage.addEventListener('pointerup', () => { drag = null; });

const SCALE = 0.5;   // วาดครึ่งความละเอียดแล้วขยายแบบพิกเซล (เหมือนในเกม)
function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  const rw = Math.max(1, Math.round(w * SCALE)), rh = Math.max(1, Math.round(h * SCALE));
  renderer.setSize(rw, rh, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (state.rt) state.rt.setViewport(rh, camera.fov);
}
new ResizeObserver(resize).observe(stage);

let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
  if (document.hidden || !state.view) return;
  state.t += dt;
  if (state.orbit && !drag) state.yaw += dt * 0.25;
  // เดินวนเป็นวงกลมเล็ก ๆ หรือยืนนิ่ง
  entity.moving = state.walk;
  if (state.walk) { const a = state.t * 0.7; entity.x = Math.cos(a) * 1.2; entity.y = Math.sin(a) * 1.2; entity.angle = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI / 2; }
  else { entity.x += (0 - entity.x) * Math.min(1, dt * 4); entity.y += (0 - entity.y) * Math.min(1, dt * 4); }
  const v = state.view;
  v.root.position.set(entity.x, 0, entity.y);
  v.root.rotation.y = entity.angle;
  v.update(dt, entity);
  shadow.position.set(entity.x, 0.012, entity.y);
  const pitch = 0.8, d = 7.6, tx = entity.x * 0.6, tz = entity.y * 0.6;
  camera.position.set(tx + Math.sin(state.yaw) * Math.cos(pitch) * d, 0.9 + Math.sin(pitch) * d, tz + Math.cos(state.yaw) * Math.cos(pitch) * d);
  camera.lookAt(tx, 0.9, tz);
  scene.updateMatrixWorld();
  state.rt.update(dt, v);
  px.update(dt);
  renderer.render(scene, camera);
}
setGround('grass');
build();
requestAnimationFrame(frame);
