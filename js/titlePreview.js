// v0.30 พรีวิวเอฟเฟ็กฉายา — ตัวละคร/สไปรต์พิกเซลเดียวกับในเกม + ป้ายฉายา CSS ชุดเดียวกับในเกม
import { THREE } from './render/three.js?v=0.40.5';
import { CharacterView } from './render/Characters.js?v=0.40.5';
import { PixelSprites } from './render/PixelSprites.js?v=0.40.5';
import { ACHIEVEMENTS } from './data/collection.js?v=0.40.5';
import { describeBonus } from './data/items.js?v=0.40.5';
import { paintHonor, honorInner, honorClass, injectTitleCss, TIER_ORDER, TIER_NAME, TIER_COLOR, FX_NAME } from './ui/TitleFx.js?v=0.40.5';

injectTitleCss();
const $ = (s) => document.querySelector(s);
const TCOL = TIER_COLOR;
const JOBS = {
  swordsman: { name: 'นักดาบ', look: { hair: '#e8a838', tunic: '#9a3a3a', pants: '#3a2e2a', jobGear: 'swordsman', weapon: 'sword', scarf: '#e8e2d8' } },
  mage: { name: 'นักเวทย์', look: { hair: '#6a4a8a', tunic: '#3e3a8a', pants: '#2e2a4a', jobGear: 'mage', accessory: 'wizard', hatColor: '#3e3a8a' } },
  archer: { name: 'นักธนู', look: { hair: '#e8c870', tunic: '#3a7a3a', pants: '#4a3a28', jobGear: 'archer', weapon: 'bow' } },
  acolyte: { name: 'นักบวช', look: { hair: '#c86a3a', tunic: '#f0ece0', pants: '#5a4a6a', jobGear: 'acolyte', weapon: 'mace' } },
};
const GROUNDS = {
  grass: { name: 'ทุ่งหญ้า', base: '#5aa84a', dots: ['#6cbc58', '#4c9440', '#7fcc62'], fog: '#cfe6c4', sky: '#9fd0e8' },
  night: { name: 'ราตรี', base: '#23304a', dots: ['#2c3c5a', '#1c2840', '#34466a'], fog: '#141c30', sky: '#0b1226' },
  snow: { name: 'หิมะ', base: '#e4edf6', dots: ['#f6f9fc', '#d0dcea', '#ffffff'], fog: '#e8f0f8', sky: '#cfe0f0' },
  town: { name: 'ลานเมือง', base: '#b8a68a', dots: ['#c8b89a', '#a8967a', '#d2c4a6'], fog: '#e8dcc4', sky: '#bcd8ec' },
};
const LIST = [...ACHIEVEMENTS].sort((a, b) => TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier));
const state = { id: LIST[0].id, job: 'swordsman', filter: 'all', yaw: 0.5, view: null };

/* ---------- ฉาก 3 มิติ ---------- */
const stage = $('#stage'), labels = $('#labels');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95; renderer.setPixelRatio(1);
stage.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(24, 1, 0.5, 120);
const hemi = new THREE.HemisphereLight('#f4f0ff', '#4a5a3a', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 1.1); sun.position.set(-4, 8, 6); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; scene.add(shadow);
function groundTex(G) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = G.base; g.fillRect(0, 0, 128, 128);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { g.fillStyle = G.dots[(r() * G.dots.length) | 0]; g.fillRect((r() * 64 | 0) * 2, (r() * 64 | 0) * 2, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.encoding = THREE.sRGBEncoding;
  return t;
}
function setGround(k) {
  const G = GROUNDS[k]; if (ground.material.map) ground.material.map.dispose(); ground.material.map = groundTex(G); ground.material.needsUpdate = true;
  scene.background = new THREE.Color(G.sky); scene.fog = new THREE.Fog(G.fog, 14, 34);
  hemi.intensity = k === 'night' ? 0.55 : 1.0; sun.intensity = k === 'night' ? 0.45 : 1.1;
  mark('#grounds', k);
}
const px = new PixelSprites(renderer, scene, camera);
const entity = { x: 0, y: 0, angle: 0.4, moving: false, speedFactor: 1, dead: false, castPose: false };
function buildChar() {
  if (state.view) { px.detach('me'); scene.remove(state.view.root); }
  const look = { skin: '#f6d6b8', eye: '#3a2440', boot: '#2e2420', belt: '#c9a24a', hairStyle: 'short', ...JOBS[state.job].look };
  const v = new CharacterView(look); v.phase = 0; v.time = 0; v.root.rotation.y = entity.angle; scene.add(v.root);
  state.view = v;
  px.attach('me', v, 'char', { eyes: PixelSprites.eyeMarkers(v), eyeColor: look.eye, face: v.face });
  px.setFocus('me');
  mark('#jobs', state.job);
}

const tag = document.createElement('div'); labels.append(tag);
const nameTag = document.createElement('div'); nameTag.className = 'name'; nameTag.textContent = 'นักผจญภัย'; labels.append(nameTag);
function pick(id) {
  state.id = id; const a = ACHIEVEMENTS.find((x) => x.id === id);
  paintHonor(tag, a.title, a.tier, a.fx);
  $('#name').textContent = a.title;
  $('#rar').textContent = TIER_NAME[a.tier] + (a.fx ? ' · ' + FX_NAME[a.fx] : ''); $('#rar').style.color = TCOL[a.tier]; $('#rar').style.borderColor = TCOL[a.tier];
  $('#desc').textContent = 'วิธีได้: ' + a.desc + (a.only ? ' · เฉพาะอาชีพนี้' : '') + ' · โบนัส: ' + describeBonus(a.bonus);
  document.querySelectorAll('#list button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
}

/* ---------- รายการ ---------- */
function mark(sel, id) { document.querySelectorAll(sel + ' button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === id))); }
function renderList() {
  const box = $('#list'); box.innerHTML = '';
  const items = LIST.filter((a) => state.filter === 'all' || a.tier === state.filter);
  $('#count').textContent = `${items.length} ฉายา`;
  for (const a of items) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = a.id;
    b.innerHTML = `<span style="color:${TCOL[a.tier]}">${a.title}</span><small>${TIER_NAME[a.tier]}</small>`;
    b.addEventListener('click', () => pick(a.id)); box.append(b);
  }
  mark('#list', state.id);
}
const fbox = $('#filters');
for (const k of ['all', ...[...TIER_ORDER].reverse()]) {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.id = k; b.textContent = k === 'all' ? 'ทั้งหมด' : TIER_NAME[k];
  if (k !== 'all') b.style.color = TCOL[k];
  b.addEventListener('click', () => { state.filter = k; mark('#filters', k); renderList(); }); fbox.append(b);
}
mark('#filters', 'all');
const add = (sel, obj, fn) => { for (const k of Object.keys(obj)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.id = k; b.textContent = obj[k].name; b.addEventListener('click', () => fn(k)); $(sel).append(b); } };
add('#grounds', GROUNDS, setGround);
add('#jobs', JOBS, (k) => { state.job = k; buildChar(); });

/* ---------- บันไดความหายาก + ธีม ---------- */
const LAYERS = {
  common: ['ป้ายเรียบ « »'],
  rare: ['ตัวอักษรฟ้า + ขอบเรืองเป็นจังหวะ', 'แสงวาบพาดผ่าน', 'ประกายดาว'],
  epic: ['ตัวอักษรไล่สีไหล + ขอบหมุนวน', 'ปีกเล็กขยับ', 'อัญมณีเต้น + ดาวโคจร', 'ประกาย 5 จุด'],
  legend: ['ตัวอักษรโลหะเงาวาบ + แฟลร์', 'ปีกใหญ่ 4 ขน + ริบบิ้น', 'รัศมีสองชั้นหมุนสวนกัน', 'คลื่นแสง + ประกายลอย', 'เอฟเฟ็กตามธีม (ไฟ หิมะ สายฟ้า ซากุระ…)'],
  mythic: ['ขอบพลังงานหมุน + ออโรร่า', 'วงเวทใต้ป้าย + เสาแสง', 'มงกุฎ + ดาวโคจร 3 ดวง', 'คลื่นกระแทก + เศษแสง 14 ชิ้น', 'ปีก 6 ขน + เอฟเฟ็กธีมเต็ม'],
  divine: ['ปีกเทวดา 3 ชั้น 9 ขน', 'วงเวทซ้อน 2 วงหมุนสวนกัน', 'วงแหวนเทวดา + มงกุฎ', 'ท้องฟ้าดาวในป้าย + ขอบแสงคู่', 'แสงสวรรค์ระเบิดทุก 5 วิ + ดาว 4 ดวง'],
};
const sample = { common: 'นักผจญภัยหน้าใหม่', rare: 'ผู้เลือกเส้นทาง', epic: 'ปรมาจารย์อาชีพ', legend: 'ตำนานนักล่า', mythic: 'ผู้เผาผลาญสมรภูมิ', divine: 'นิรันดร์แห่งเอเวอร์เลเวล' };
const sampleFx = { legend: 'crimson', mythic: 'inferno', divine: 'genesis' };
$('#tiers').innerHTML = TIER_ORDER.map((t) => `<div class="tier t-${t}"><div class="stage2"><span class="th-inline ${honorClass(t, sampleFx[t])}">${honorInner(sample[t], t, sampleFx[t])}</span></div><b style="color:${TCOL[t]}">${TIER_NAME[t]}</b><ul>${LAYERS[t].map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('');
const themes = {};
for (const a of ACHIEVEMENTS) if (a.fx && !themes[a.fx]) themes[a.fx] = a;
$('#themes').innerHTML = Object.values(themes).map((a) => `<figure><span class="th-inline ${honorClass(a.tier, a.fx)}">${honorInner(a.title, a.tier, a.fx)}</span><figcaption>${FX_NAME[a.fx]} · ${TIER_NAME[a.tier]}</figcaption></figure>`).join('');

/* ---------- กล้อง/ลูป ---------- */
let drag = null;
stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw: state.yaw }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => { if (drag) state.yaw = drag.yaw - (e.clientX - drag.x) * 0.008; });
stage.addEventListener('pointerup', () => { drag = null; });
const SCALE = 0.5;
function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(Math.round(w * SCALE), Math.round(h * SCALE), false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
const v3 = new THREE.Vector3();
function place(el, y, extra) {
  v3.set(entity.x, y, entity.y).project(camera);
  const sx = (v3.x * 0.5 + 0.5) * stage.clientWidth, sy = (-v3.y * 0.5 + 0.5) * stage.clientHeight;
  el.style.transform = `translate3d(${sx}px, ${sy}px, 0) ${extra}`;
}
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
  if (document.hidden || !state.view) return;
  if (!drag) state.yaw += dt * 0.12;
  const v = state.view; v.root.position.set(0, 0, 0); v.update(dt, entity);
  const pitch = 0.8, d = 6.4;
  camera.position.set(Math.sin(state.yaw) * Math.cos(pitch) * d, 1.1 + Math.sin(pitch) * d, Math.cos(state.yaw) * Math.cos(pitch) * d);
  camera.lookAt(0, 1.1, 0);
  scene.updateMatrixWorld(); px.update(dt);
  renderer.render(scene, camera);
  place(tag, 2.05, 'translate(-50%, -100%)');
  place(nameTag, -0.05, 'translate(-50%, 0)');
}
setGround('grass'); buildChar(); renderList(); pick(state.id); resize();
requestAnimationFrame(frame);
