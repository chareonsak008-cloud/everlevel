// v0.38 ลูกศรนำทางเควส — ชี้ไปยังเป้าหมายของเควสที่ติดตามอยู่
// · ส่งเควสได้แล้ว → NPC ที่รับส่ง · ล่ามอน → จุดเกิด/ตัวที่ใกล้ที่สุด · เก็บของ → มอนที่ดรอปของนั้น · ไปแผนที่ → แผนที่นั้น
// · เป้าหมายอยู่แผนที่อื่น → ชี้ประตูวาร์ปที่พาไปทางนั้น (หาเส้นทางสั้นสุดผ่านประตูของแต่ละแผนที่)
// · ไม่มีเควสที่ทำอยู่ → ไม่แสดงลูกศร (v0.40.1) · เปิด/ปิดได้ที่ปุ่ม 🧭 บนแถบติดตามเควส
import { QUESTS } from '../data/quests.js?v=0.63.0';
import { MAPS } from '../data/maps/index.js?v=0.63.0';
import { MONSTERS } from '../data/monsters.js?v=0.63.0';
import { THREE } from '../render/three.js?v=0.63.0';
import { TILE } from '../config.js?v=0.63.0';

let IDX = null;
function index() {
  if (IDX) return IDX;
  const npc = {}, mob = {}, drop = {};
  for (const [mid, M] of Object.entries(MAPS)) {
    for (const n of M.npcs || []) npc[n.id] = { map: mid, x: (n.x + 0.5) * TILE, y: (n.y + 0.5) * TILE, name: n.name };
    for (const s of M.spawns || []) {
      const a = (s.areas || [])[0];
      if (!a) continue;
      (mob[s.mob] ||= []).push({ map: mid, areas: s.areas });
    }
  }
  for (const [id, m] of Object.entries(MONSTERS)) for (const [it] of m.drops || []) (drop[it] ||= []).push(id);
  IDX = { npc, mob, drop };
  return IDX;
}

// เส้นทางผ่านประตู: คืนประตูแรกบนแผนที่ปัจจุบันที่พาไปสู่แผนที่เป้าหมาย (หรือ null)
function firstPortal(from, to) {
  if (from === to) return null;
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const cur = q.shift();
    for (const p of (MAPS[cur] && MAPS[cur].portals) || []) {
      if (!MAPS[p.to] || p.to in prev) continue;
      prev[p.to] = { from: cur, portal: p };
      if (p.to === to) {
        let step = prev[to];
        while (step.from !== from) step = prev[step.from];
        return step.portal;
      }
      q.push(p.to);
    }
  }
  return null;
}
function hops(from, to) {
  if (from === to) return 0;
  const seen = new Set([from]); let fr = [from], d = 0;
  while (fr.length) {
    d++; const nx = [];
    for (const m of fr) for (const p of (MAPS[m] && MAPS[m].portals) || []) if (MAPS[p.to] && !seen.has(p.to)) { if (p.to === to) return d; seen.add(p.to); nx.push(p.to); }
    fr = nx;
  }
  return 99;
}

export class QuestNav {
  constructor(root, game) {
    this.game = game;
    this.el = document.createElement('div'); this.el.className = 'qnav'; this.el.hidden = true;
    this.el.innerHTML = '<div class="qnav-arrow"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><path d="M20 3 33 22h-8v14H15V22H7z"/></svg></div><div class="qnav-tip"><b></b><small></small></div>';
    (root.querySelector('#labels') || root).append(this.el);
    this.arrow = this.el.querySelector('.qnav-arrow'); this.tipB = this.el.querySelector('.qnav-tip b'); this.tipS = this.el.querySelector('.qnav-tip small');
    this.pick = null;           // เควสที่ผู้เล่นเลือกติดตาม (null = อัตโนมัติ)
    this.t = 0; this.goal = null;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.ang = null;
  }

  get enabled() { return this.game.settings.questNav !== false; }

  // เควสที่จะนำทาง: ที่ผู้เล่นเลือก → ส่งได้แล้ว → ที่กำลังทำ → เควสเนื้อเรื่องที่รับได้
  questId() {
    const L = this.game.questLog;
    const act = L.activeIds();
    if (this.pick && act.includes(this.pick)) return this.pick;
    const ready = act.find((id) => L.status(id) === 'ready');
    if (ready) return ready;
    const main = act.find((id) => QUESTS[id].kind === 'main');
    if (main) return main;
    return act[0] || null;   // v0.40.1: ไม่ได้รับเควส = ไม่มีลูกศร
  }

  // เป้าหมายจริง { map, x, y, label, sub } (x, y = พิกเซลโลก) หรือ null
  resolve() {
    const g = this.game, L = g.questLog, I = index();
    const id = this.questId();
    if (!id) return null;
    const q = QUESTS[id], st = L.status(id), here = g.map && g.map.id;
    const npcGoal = (nid, sub) => { const n = I.npc[nid]; return n ? { map: n.map, x: n.x, y: n.y, label: q.name, sub: `${sub} ${n.name}` } : null; };
    if (st === 'available') return npcGoal(q.giver, 'รับเควสที่');
    if (st === 'ready') return npcGoal(q.turnIn, 'ส่งเควสที่');
    if (st !== 'active') return null;
    const prog = L.progress(id);
    for (let i = 0; i < q.goals.length; i++) {
      const goal = q.goals[i];
      if (prog[i] && prog[i].done) continue;
      if (goal.type === 'visit' && MAPS[goal.map]) { const M = MAPS[goal.map]; return { map: goal.map, x: M.width * TILE / 2, y: M.height * TILE / 2, label: q.name, sub: `ไปที่ ${M.name || goal.map}`, area: true }; }
      let mobs = null, verb = '';
      if (goal.type === 'kill') { mobs = [goal.mob]; verb = `กำจัด ${(MONSTERS[goal.mob] || {}).name || goal.mob} ${prog[i].cur}/${prog[i].n}`; }
      else if (goal.type === 'collect') { mobs = I.drop[goal.item] || []; verb = `${prog[i].text} ${prog[i].cur}/${prog[i].n}`; }
      if (mobs && mobs.length) {
        // มอนในแผนที่นี้ที่ใกล้สุด
        const pl = g.player;
        let best = null, bd = Infinity;
        for (const m of g.mobs ? g.mobs.list : []) if (!m.dead && mobs.includes(m.type)) { const d = Math.hypot(m.x - pl.x, m.y - pl.y); if (d < bd) { bd = d; best = m; } }
        if (best) return { map: here, x: best.x, y: best.y, label: q.name, sub: verb, mob: true };
        // จุดเกิดที่ใกล้ที่สุด (นับจำนวนประตูที่ต้องผ่าน)
        let sp = null, sh = 99;
        for (const mid of mobs) for (const s of I.mob[mid] || []) { const h = hops(here, s.map); if (h < sh) { sh = h; sp = s; } }
        if (sp) { const [ax, ay, aw, ah] = sp.areas[0]; return { map: sp.map, x: (ax + aw / 2) * TILE, y: (ay + ah / 2) * TILE, label: q.name, sub: verb, area: true }; }
      }
    }
    return null;   // เป้าหมายแบบเลเวล/ตีบวก/เปลี่ยนอาชีพ — ไม่มีจุดให้ชี้
  }

  update(dt) {
    const g = this.game;
    if (!g.started || !this.enabled || !g.map || g.warping || g.player.dead) { this.el.hidden = true; return; }
    this.t -= dt;
    if (this.t <= 0) { this.t = 0.4; this.goal = this.resolve(); this.step = null; }
    const G = this.goal;
    if (!G) { this.el.hidden = true; return; }
    const here = g.map.id, pl = g.player;
    let tx = G.x, ty = G.y, sub = G.sub;
    if (G.map !== here) {
      if (!this.step) this.step = firstPortal(here, G.map) || 'none';
      const p = this.step;
      if (p === 'none') { this.el.hidden = true; return; }
      tx = (p.x + p.w / 2) * TILE; ty = (p.y + p.h / 2) * TILE;
      sub = `${G.sub} → ${MAPS[G.map].name || G.map} (ประตู ${p.label || MAPS[p.to].name || p.to})`;
    }
    const dist = Math.hypot(tx - pl.x, ty - pl.y);
    const near = G.map === here && dist < (G.area ? 6 : 2.2) * TILE;
    if (near) { this.el.hidden = true; return; }
    // ฉายตำแหน่งตัวเรา + เป้าหมายลงจอ แล้วหมุนลูกศรตามทิศบนจอ (กล้องหมุนก็ยังชี้ถูก)
    const cam = g.gfx.camera, cw = g.gfx.cw || innerWidth, ch = g.gfx.ch || innerHeight;
    const a = this._v.set(pl.x / TILE, 0.15, pl.y / TILE).project(cam), b = this._w.set(tx / TILE, 0.15, ty / TILE).project(cam);
    const ax = (a.x + 1) / 2 * cw, ay = (1 - a.y) / 2 * ch;
    let bx = (b.x + 1) / 2 * cw, by = (1 - b.y) / 2 * ch;
    if (b.z > 1) { bx = 2 * ax - bx; by = 2 * ay - by; }   // อยู่หลังกล้อง
    const target = Math.atan2(by - ay, bx - ax);
    if (this.ang === null) this.ang = target;
    this.ang += Math.atan2(Math.sin(target - this.ang), Math.cos(target - this.ang)) * Math.min(1, dt * 10);
    const R = Math.min(cw, ch) * 0.13 + 30;
    const px = ax + Math.cos(this.ang) * R, py = ay + Math.sin(this.ang) * R;
    this.el.hidden = false;
    this.el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    this.arrow.style.transform = `translate(-50%, -50%) rotate(${this.ang + Math.PI / 2}rad)`;
    this.el.classList.toggle('left', px > cw * 0.62 || (Math.cos(this.ang) < -0.2 && px > cw * 0.3));
    const m = Math.round(dist / TILE);
    if (this.tipB.textContent !== G.label) this.tipB.textContent = G.label;
    const s2 = `${sub} · ${m} ช่อง`;
    if (this.tipS.textContent !== s2) this.tipS.textContent = s2;
  }
}
