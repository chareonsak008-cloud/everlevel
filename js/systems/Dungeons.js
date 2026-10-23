// v0.32: ระบบดันเจี้ยนถ้ำ (เป็นชั้น · บอสท้ายชั้น · จำกัดรอบต่อวัน) + หอคอยไต่ชั้นไม่รู้จบ (อันดับชั้นสูงสุด)
// แต่ละรอบเป็นแผนที่ส่วนตัว (instance) สร้างใหม่ทุกชั้น · มอนปรับเลเวลตามผู้เล่น/ชั้น · ไม่เกิดใหม่
import { TILE } from '../config.js?v=0.93.0-p2.14';
import { ITEMS } from '../data/items.js?v=0.93.0-p2.14';
import { MONSTERS } from '../data/monsters.js?v=0.93.0-p2.14';
import { JOBS } from '../data/progression.js?v=0.93.0-p2.14';
import { START_MAP } from '../data/maps/index.js?v=0.93.0-p2.14';
import {
  CAVE, TOWER, todayKey, rngOf, pickRoster, scaledData, refHp, refExp, BOSS_MOBS,
  caveFloorDef, towerFloorDef, towerFloorPlan, towerFloorReward, towerLevel,
  CAVE_MOB_DROPS, CAVE_BOSS_DROPS, CAVE_FINAL_DROPS, TOWER_MOB_DROPS, caveChest, normDungeon,
} from '../data/dungeons.js?v=0.93.0-p2.14';
export { normDungeon };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtZ = (n) => n.toLocaleString('en-US') + ' z';

export class Dungeons {
  constructor(game) {
    this.g = game;
    this.run = null;
    this.hudEl = null;
    this.seq = 0;
  }

  // สถานะประจำตัวละคร (รีเซ็ตรอบรายวันเมื่อข้ามวัน)
  get st() {
    const pl = this.g.player;
    if (!pl.dg) pl.dg = normDungeon(null);
    const today = todayKey();
    if (pl.dg.day !== today) { pl.dg.day = today; pl.dg.cave = 0; pl.dg.tPaid = 0; pl.dg.tToday = 0; }
    return pl.dg;
  }
  get caveLeft() { return Math.max(0, CAVE.daily - this.st.cave); }
  get active() { return !!this.run; }
  caveLevel() { return Math.max(CAVE.minLv, Math.min(150, this.g.player.baseLevel)); }

  /* ---------- เมนู NPC ---------- */
  caveMenu(npc, greet) {
    const g = this.g, pl = g.player, st = this.st, left = this.caveLeft, L = this.caveLevel();
    const lowLv = pl.baseLevel < CAVE.minLv;
    const info = `${greet}\n\nรอบวันนี้เหลือ ${left}/${CAVE.daily} · ผ่านมาแล้ว ${st.clears} ครั้ง${st.caveTime ? ` · เวลาดีที่สุด ${fmtT(st.caveTime)}` : ''}`;
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => g.endService() };
    g.dialog.show(npc, info, [
      { label: `เข้า${CAVE.name}`, sub: lowLv ? `ต้องมี Base Lv.${CAVE.minLv} ขึ้นไป` : `${CAVE.floors} ชั้น · บอสท้ายทุกชั้น · มอนระดับ Lv.${L}–${L + CAVE.floors - 1}`, right: `เหลือ ${left}/${CAVE.daily}`,
        disabled: lowLv || left <= 0 || g.player.dead, onSelect: () => this.startCave() },
      { label: 'ดันเจี้ยนปาร์ตี้ · วิหารผนึกจันทรา', sub: 'เล่นร่วมกัน 2–6 คน · สัปดาห์ละ 2 รอบ · แลกเหรียญผนึก', keepOpen: true, onSelect: () => g.pd && g.pd.menu(npc, greet) },   // v0.75
      { label: 'ดันเจี้ยนคืออะไร?', keepOpen: true, onSelect: () => g.dialog.show(npc,
        `ถ้ำมี ${CAVE.floors} ชั้น กำจัดมอนในชั้นให้ได้ ${Math.round(CAVE.clearPct * 100)}% แล้วบอสท้ายชั้นจะปรากฏในห้องลึกสุด\nปราบบอสแล้วบันไดลงชั้นถัดไปจะเปิด · ชั้น ${CAVE.floors} มีบอสใหญ่และหีบสมบัติ\n\nมอนแรงกว่าในทุ่ง (ปรับตามเลเวลเจ้า) แต่ให้ EXP มากกว่า · ดรอปผลึกตีบวกบ่อย\nเข้าได้วันละ ${CAVE.daily} รอบ (รีเซ็ตเที่ยงคืน) · หมดสติหรือออกกลางทาง = เสียรอบนั้น\nใช้ขนนกคืนชีพฟื้นในถ้ำได้`, [
          { label: `เข้า${CAVE.name}`, disabled: lowLv || left <= 0, onSelect: () => this.startCave() }, bye]) },
      bye,
    ]);
  }

  towerMenu(npc, greet) {
    const g = this.g, pl = g.player, st = this.st, cp = this.checkpoint();
    const lowLv = pl.baseLevel < TOWER.minLv;
    const info = `${greet}\n\nชั้นสูงสุดที่ผ่าน ${st.best || '—'} · วันนี้ไปถึงชั้น ${st.tToday || '—'} · รับรางวัลวันนี้ถึงชั้น ${st.tPaid || '—'}`;
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => g.endService() };
    g.dialog.show(npc, info, [
      { label: 'เริ่มไต่จากชั้น 1', sub: lowLv ? `ต้องมี Base Lv.${TOWER.minLv} ขึ้นไป` : 'ได้รางวัลทุกชั้นที่ยังไม่รับวันนี้', disabled: lowLv || pl.dead, onSelect: () => this.startTower(1) },
      ...(cp > 1 ? [{ label: `เริ่มจากเช็กพอยต์ชั้น ${cp}`, sub: `ข้ามชั้น 1–${cp - 1} (ไม่ได้รางวัลชั้นที่ข้าม) · มอน Lv.${towerLevel(cp)}`, disabled: lowLv || pl.dead, onSelect: () => this.startTower(cp) }] : []),
      { label: 'อันดับหอคอย', sub: 'ชั้นสูงสุดของผู้เล่นทั้งเซิร์ฟเวอร์', keepOpen: true, onSelect: () => { g.dialog.hide(); this.openRanking(); } },
      { label: 'กติกาและรางวัล', keepOpen: true, onSelect: () => g.dialog.show(npc,
        `หอคอยไม่มีชั้นสุดท้าย · ยิ่งสูงมอนยิ่งแรง (ชั้น N = มอน Lv.N+4 · เกิน Lv.150 แรงขึ้นทวีคูณ)\nกำจัดมอนทุกตัวในเวลาที่กำหนดเพื่อขึ้นชั้นถัดไป · ทุก 5 ชั้นมีบอส · ทุก 10 ชั้นมีบอสใหญ่\nผ่านชั้นแล้วฟื้น HP/SP ${Math.round(TOWER.heal * 100)}%\n\nรางวัล: Zeny ทุกชั้น · ผลึกตีบวกทุก 5 ชั้น · กล่องแฟชั่น + ใบคูณ EXP ทุก 10 ชั้น (รับได้ครั้งเดียวต่อชั้นต่อวัน)\nเริ่มใหม่จากเช็กพอยต์ได้ทุก ${TOWER.checkpoint} ชั้น · ชั้นสูงสุดขึ้นกระดานอันดับ\nเข้าได้ไม่จำกัดรอบ`, [
          { label: 'เริ่มไต่จากชั้น 1', disabled: lowLv, onSelect: () => this.startTower(1) }, bye]) },
      bye,
    ]);
  }

  checkpoint() { const b = this.st.best; return b >= TOWER.checkpoint ? Math.floor(b / TOWER.checkpoint) * TOWER.checkpoint + 1 : 1; }

  /* ---------- เริ่มรอบ ---------- */
  startCave() {
    const g = this.g, st = this.st;
    if (this.run || this.caveLeft <= 0) return;
    g.closeServices();
    st.cave++; st.runs++;
    const id = (Date.now() % 1e7).toString(36) + (++this.seq);
    this.run = { kind: 'cave', id, floor: 1, L0: this.caveLevel(), seed: Math.floor(Math.random() * 1e6), t: 0, mobs: [], killed: 0, total: 0, boss: null, bossDown: false, cleared: false };
    g.hud.log(`เข้าสู่${CAVE.name} (รอบวันนี้เหลือ ${this.caveLeft}/${CAVE.daily})`, 'sys');
    g.dirty = true;
    this.goFloor();
  }

  startTower(floor = 1) {
    const g = this.g;
    if (this.run) return;
    g.closeServices();
    this.st.runs++;
    const id = (Date.now() % 1e7).toString(36) + (++this.seq);
    this.run = { kind: 'tower', id, floor, startFloor: floor, t: 0, mobs: [], killed: 0, total: 0, boss: null, timeLeft: 0, cleared: false, topCleared: floor - 1 };
    g.hud.log(`เข้าสู่${TOWER.name} เริ่มที่ชั้น ${floor}`, 'sys');
    this.goFloor();
  }

  goFloor() {
    const R = this.run, g = this.g; if (!R) return;
    if (g.warping) { setTimeout(() => this.run === R && this.goFloor(), 250); return; }   // กำลังวาร์ปอยู่ (เช่น เพิ่งกลับเมือง) → รอให้เสร็จก่อน
    R.def = R.kind === 'cave' ? caveFloorDef(R.id, R.floor, R.seed) : towerFloorDef(R.id, R.floor);
    R.mobs = []; R.killed = 0; R.total = 0; R.boss = null; R.bossDown = false; R.cleared = false; R.stairs = null; R.floorT = 0;
    // ประตูออก (กลับเมือง) ใกล้จุดเกิด
    const sp = R.def.spawn;
    R.def.portals = [{ x: Math.floor(sp.x) - 3, y: Math.floor(sp.y) + (R.kind === 'tower' ? 1 : 2), w: 2, h: 2, exit: true, label: 'ออกจากดันเจี้ยน' }];
    g.warp(R.def, null, () => this.spawnFloor());
  }

  /* ---------- มอนสเตอร์ในชั้น ---------- */
  // v0.32.1: ช่องที่เดินถึงได้จากจุดเกิด (กันมอนเกิดในซอกที่ถูกน้ำ/หินปิด)
  reach() {
    const map = this.g.map, pl = this.g.player, seen = new Uint8Array(map.w * map.h), q = [];
    const sx = Math.floor(pl.x / TILE), sy = Math.floor(pl.y / TILE);
    if (map.isSolidTile(sx, sy)) return null;
    seen[map.idx(sx, sy)] = 1; q.push(sx, sy);
    for (let i = 0; i < q.length; i += 2) {
      const x = q[i], y = q[i + 1];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (map.isSolidTile(nx, ny) || seen[map.idx(nx, ny)]) continue;
        seen[map.idx(nx, ny)] = 1; q.push(nx, ny);
      }
    }
    return seen;
  }

  spot(cx, cy, rad, avoid) {
    const map = this.g.map, ok = this.reachable;
    for (let k = 0; k < 60; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * rad;
      const tx = Math.floor(cx + Math.cos(a) * d), ty = Math.floor(cy + Math.sin(a) * d);
      if (map.isSolidTile(tx, ty) || (ok && !ok[map.idx(tx, ty)])) continue;
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r) continue;
      return { x, y };
    }
    return null;
  }

  addMob(type, data, x, y, boss = false) {
    const g = this.g, R = this.run;
    const m = g.mobs.spawnAt(type, x, y);
    m.data = data; m.level = data.level; m.name = data.name; m.maxHp = data.hp; m.hp = data.hp;
    m.stats = { atk: data.atk, def: data.def, mdef: data.mdef || 0, hit: data.hit, flee: data.flee, crit: data.crit };
    m.speed = data.speed; m.dgRun = R.id; m.dgBoss = boss;
    if (boss) { m.noCard = true; m.noBook = true; }
    g.gfx.addMonster(m);
    R.mobs.push(m);
    return m;
  }

  spawnFloor() {
    const R = this.run, g = this.g; if (!R || !g.mobs) return;
    const def = R.def, pl = g.player, rnd = rngOf(R.id.length * 97 + R.floor * 31 + Date.now() % 997);
    for (const p of g.map.portals) if (p.exit) p.onEnter = () => this.leaveConfirm();
    this.reachable = this.reach();
    if (R.kind === 'cave') {
      const L = Math.min(105, R.L0 + R.floor - 1), roster = pickRoster(L, 3, rnd);
      const n = 10 + R.floor * 2, rooms = def.rooms.mids;
      for (let i = 0; i < n; i++) {
        const c = rooms[i % rooms.length], t = roster[Math.floor(rnd() * roster.length)];
        const d = scaledData(t, L, CAVE.elite); d.name = MONSTERS[t].name; d.drops = [...d.drops, ...CAVE_MOB_DROPS];
        const p = this.spot(c.x, c.y, c.r - 1.2); if (p) this.addMob(t, d, p.x, p.y);
      }
      R.total = R.mobs.length; R.L = L;
      g.hud.levelBanner(`${CAVE.name} · B${R.floor}`, R.floor === CAVE.floors ? 'ชั้นสุดท้าย — บอสใหญ่รออยู่!' : `กำจัดมอน ${Math.round(CAVE.clearPct * 100)}% เพื่อเรียกบอสท้ายชั้น`);
    } else {
      const plan = towerFloorPlan(R.floor, rnd), A = def.arena;
      for (let i = 0; i < plan.count; i++) {
        const t = plan.roster[i % plan.roster.length], d = scaledData(t, plan.L, TOWER.mob); d.name = MONSTERS[t].name; d.drops = [...d.drops, ...TOWER_MOB_DROPS];
        const p = this.spot(A.cx, A.cy - 1, A.R - 2.5, { x: pl.x, y: pl.y, r: 5 * TILE }); if (p) this.addMob(t, d, p.x, p.y);
      }
      if (plan.boss) {
        const big = plan.boss === 'big', d = scaledData(plan.bossType, plan.L + (big ? 2 : 1), { hpAbs: refHp(plan.L) * (big ? 16 : 8) * (TOWER.bossHp || 1), atk: big ? 1.35 : 1.2, expAbs: refExp(plan.L) * (big ? 16 : 8) });
        d.viewScale = big ? 0.72 : 0.6; d.height = (d.height || 3) * d.viewScale; d.radius = (d.radius || 1) * d.viewScale;   // v0.32.1: ลานหอคอยแคบ → ย่อขนาดบอสไม่ให้บังจอ
        d.name = `${big ? 'ผู้พิทักษ์หอคอย' : 'ยามหอคอย'} · ${MONSTERS[plan.bossType].name.split(' ')[0]}`; d.dgBoss = true; d.leash = 30;
        d.drops = big ? [['refine_w', 0.8], ['refine_a', 0.8], ['refine_guard', 0.05]] : [['refine_w', 0.35], ['refine_a', 0.35]];
        const b = this.addMob(plan.bossType, d, A.cx * TILE + 8, (A.cy - 3) * TILE + 8, true); R.boss = b;
      }
      R.total = R.mobs.length; R.timeLeft = plan.time; R.L = plan.L;
      g.hud.levelBanner(`${TOWER.name} · ชั้น ${R.floor}`, plan.boss === 'big' ? 'ชั้นบอสใหญ่!' : plan.boss ? 'ชั้นบอส' : `กำจัดมอนทั้งหมดใน ${fmtT(plan.time)}`);
    }
    this.renderHud(true);
  }

  spawnCaveBoss() {
    const R = this.run, g = this.g, c = R.def.rooms.boss, final = R.floor === CAVE.floors;
    const pool = final ? BOSS_MOBS : BOSS_MOBS.filter((b) => b !== 'nocthar');
    const type = pool[(R.seed + R.floor * 3) % pool.length], L = R.L + (final ? 3 : 1), M = final ? CAVE.finalBoss : CAVE.boss;
    const d = scaledData(type, L, { hpAbs: refHp(L) * M.hp, atk: M.atk, expAbs: refExp(L) * M.exp });
    d.name = `${final ? 'จ้าวถ้ำ' : 'ผู้เฝ้าชั้น'} · ${MONSTERS[type].name.split(' ')[0]}`; d.dgBoss = true; d.leash = 30;
    d.drops = final ? CAVE_FINAL_DROPS : CAVE_BOSS_DROPS;
    const bp = this.spot(c.x, c.y, 2.5) || this.spot(c.x, c.y, c.r - 1) || { x: c.x * TILE, y: c.y * TILE };
    R.boss = this.addMob(type, d, bp.x, bp.y, true);
    g.gfx.bursts.spawn(c.x, 0.6, c.y, '#ff5a6a', 40, 2, 3);
    g.gfx.shake(0.35);
    g.hud.levelBanner('บอสปรากฏ!', `${d.name} Lv.${L} ตื่นขึ้นในห้องลึกสุด`);
    g.hud.log(`⚠ ${d.name} ปรากฏตัวในห้องลึกสุดของชั้น B${R.floor}!`, 'r-epic');
    g.sfx('mvp', { gap: 0 });
    this.renderHud(true);
  }

  onKill(m) {
    const R = this.run; if (!R || m.dgRun !== R.id) return;
    R.killed++;
    if (m === R.boss) R.bossDown = true;
    if (R.kind === 'cave') {
      if (!R.boss && R.killed >= Math.ceil(R.total * CAVE.clearPct)) this.g.schedule(1.2, () => { if (this.run === R && !R.boss) this.spawnCaveBoss(); });
      if (R.bossDown && !R.cleared) { R.cleared = true; this.g.schedule(1.4, () => this.run === R && this.caveFloorClear()); }
    } else if (R.killed >= R.total && !R.cleared) { R.cleared = true; this.g.schedule(0.9, () => this.run === R && this.towerFloorClear()); }
    this.renderHud(true);
  }

  // วางประตูมิติกลางเกม (บันได/ทางออก)
  openPortal(tx, ty, label, onEnter) {
    const g = this.g, p = { x: Math.floor(tx) - 1, y: Math.floor(ty) - 1, w: 2, h: 2, label, inside: false, onEnter };
    p.rect = [p.x * TILE, p.y * TILE, (p.x + 2) * TILE, (p.y + 2) * TILE]; p.cx = (p.x + 1) * TILE; p.cy = (p.y + 1) * TILE;
    p.inside = g.inRect(g.player, p.rect);
    g.map.portals.push(p);
    g.gfx.addPortalFx(p.cx / TILE, p.cy / TILE);
    return p;
  }

  caveFloorClear() {
    const R = this.run, g = this.g, c = R.def.rooms.boss, pl = g.player;
    g.daily && g.daily.bump('floor');   // v0.74
    if (R.floor < CAVE.floors) {
      this.openPortal(c.x, c.y, `ลงสู่ชั้น B${R.floor + 1}`, () => { R.floor++; this.goFloor(); });
      g.hud.levelBanner(`ผ่านชั้น B${R.floor}!`, 'บันไดลงชั้นถัดไปเปิดแล้ว (ประตูแสงในห้องบอส)');
      g.hud.log(`ผ่านชั้น B${R.floor} · บันไดลงชั้น B${R.floor + 1} เปิดแล้วที่ห้องบอส`, 'lv');
      g.sfx('levelUp', { gap: 0 });
    } else {
      // ผ่านครบ: หีบรางวัล + สถิติ
      const st = this.st, ch = caveChest(R.L0), got = [];
      pl.addZeny(ch.zeny);
      for (const [id, n] of ch.items) { if (!ITEMS[id]) continue; const add = pl.inventory.add(id, n); if (add < n) for (let k = 0; k < n - add; k++) g.spawnDrop(id, pl.x, pl.y); got.push(`${ITEMS[id].name} ×${n}`); }
      st.clears++; const tm = Math.round(R.t);
      const record = !st.caveTime || tm < st.caveTime; if (record) st.caveTime = tm;
      R.done = true;
      g.gfx.mvpFx(pl);
      g.hud.levelBanner('พิชิตถ้ำสำเร็จ!', `เวลา ${fmtT(tm)}${record ? ' · สถิติใหม่!' : ''}`);
      g.hud.log(`🏆 พิชิต${CAVE.name}ใน ${fmtT(tm)}${record ? ' (สถิติใหม่!)' : ''} · หีบสมบัติ: ${fmtZ(ch.zeny)} · ${got.join(' · ')}`, 'r-legend');
      g.sfx('mvp', { gap: 0 });
      this.openPortal(c.x, c.y, 'กลับ Asteria Town', () => this.finish('clear'));
      g.refreshItemsUI(); g.hud.setPlayer(pl); g.collection?.evaluate?.();
      g.dirty = true;
    }
    this.renderHud(true);
  }

  towerFloorClear() {
    const R = this.run, g = this.g, pl = g.player, st = this.st, A = R.def.arena;
    g.daily && g.daily.bump('floor');   // v0.74
    R.topCleared = R.floor;
    g.seasonTower && g.seasonTower(R.floor);   // v0.76 อันดับฤดูกาล
    const newBest = R.floor > st.best; if (newBest) { st.best = R.floor; st.bestAt = Date.now(); }
    if (R.floor > st.tToday) st.tToday = R.floor;
    let msg = '';
    if (R.floor > st.tPaid && R.floor >= R.startFloor) {
      const rw = towerFloorReward(R.floor), got = [];
      pl.addZeny(rw.zeny);
      for (const [id, n] of rw.items) { if (!ITEMS[id]) continue; const add = pl.inventory.add(id, n); if (add < n) for (let k = 0; k < n - add; k++) g.spawnDrop(id, pl.x, pl.y); got.push(`${ITEMS[id].name} ×${n}`); }
      st.tPaid = R.floor;
      msg = ` · รางวัล ${fmtZ(rw.zeny)}${got.length ? ' · ' + got.join(' · ') : ''}`;
      g.refreshItemsUI();
    }
    // ฟื้นพลังเล็กน้อยก่อนขึ้นชั้นถัดไป
    pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * TOWER.heal); pl.sp = Math.min(pl.maxSp, pl.sp + pl.maxSp * TOWER.heal);
    g.gfx.healFx(pl, '#8fd8ff'); g.hud.setPlayer(pl);
    g.hud.levelBanner(`ผ่านชั้น ${R.floor}!`, newBest ? 'สถิติชั้นสูงสุดใหม่!' : 'ประตูขึ้นชั้นถัดไปเปิดแล้ว');
    g.hud.log(`ผ่าน${TOWER.name}ชั้น ${R.floor} ในเวลา ${fmtT(R.floorT)}${newBest ? ' · สถิติใหม่!' : ''}${msg}`, newBest ? 'r-legend' : 'lv');
    g.sfx('levelUp', { gap: 0 });
    this.openPortal(A.cx + 0.5, A.cy + 0.5, `ขึ้นชั้น ${R.floor + 1}`, () => { R.floor++; this.goFloor(); });
    if (newBest) { this.submit(); g.collection?.evaluate?.(); }
    g.dirty = true;
    this.renderHud(true);
  }

  /* ---------- จบรอบ ---------- */
  leaveConfirm() {
    const R = this.run, g = this.g; if (!R) return;
    if (R.done) return this.finish('clear');
    const keeper = { name: R.kind === 'cave' ? CAVE.name : TOWER.name, title: 'ประตูทางออก' };
    g.dialog.show(keeper, R.kind === 'cave' ? `ออกจากถ้ำตอนนี้? รอบนี้จะนับว่าใช้ไปแล้ว (เหลือวันนี้ ${this.caveLeft}/${CAVE.daily})` : `ออกจากหอคอย? สถิติชั้นที่ผ่านแล้ว (${R.topCleared || 0}) ยังถูกบันทึกไว้`, [
      { label: 'ออกและกลับเมือง', onSelect: () => this.finish('leave') },
      { label: 'อยู่ต่อ', cls: 'ghost', onSelect: () => {} },
    ]);
  }

  finish(result, reason = '') {
    const R = this.run, g = this.g; if (!R) return;
    this.run = null;
    this.renderHud(true);
    if (R.kind === 'tower') {
      if (result !== 'clear') g.hud.log(`จบการไต่${TOWER.name}${reason ? ` (${reason})` : ''} · รอบนี้ผ่านถึงชั้น ${R.topCleared || '—'} · สถิติสูงสุด ${this.st.best || '—'}`, 'sys');
      this.submit();
    } else if (result !== 'clear') g.hud.log(`${reason || 'ออกจาก'}${CAVE.name} — ไปถึงชั้น B${R.floor} (รอบนี้ถูกใช้ไปแล้ว)`, 'sys');
    g.dirty = true;
    if (g.map && g.map.def.instance) g.warp(START_MAP, null);
  }

  // เรียกจาก Game.loadMap — ออกจากแผนที่ของรอบนี้ด้วยวิธีอื่น (หมดสติกลับเมือง/ใบวาร์ป) = จบรอบ
  onMapLoaded(def) {
    const R = this.run;
    if (R && R.def && def !== R.def) {
      const dead = this.g.player.dead || this.g.reviveAt;
      this.run = null;
      if (R.kind === 'tower') { this.g.hud.log(`การไต่${TOWER.name}จบลง${dead ? ' (หมดสติ)' : ''} · รอบนี้ผ่านถึงชั้น ${R.topCleared || '—'} · สถิติสูงสุด ${this.st.best || '—'}`, 'sys'); this.submit(); }
      else if (!R.done) this.g.hud.log(`${CAVE.name} ล้มเหลว${dead ? ' (หมดสติ)' : ''} — ไปถึงชั้น B${R.floor}`, 'sys');
    }
    this.renderHud(true);
  }

  update(dt) {
    const R = this.run; if (!R) return;
    R.t += dt; R.floorT += dt;
    const g = this.g;
    if (R.kind === 'tower' && !R.cleared && R.timeLeft > 0 && !g.warping) {
      R.timeLeft -= dt;
      if (R.timeLeft <= 0) {
        g.hud.levelBanner('หมดเวลา!', `${TOWER.name} ชั้น ${R.floor}`);
        g.sfx('refineFail');
        g.schedule(1.6, () => this.run === R && this.finish('fail', 'หมดเวลา'));
      }
    }
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.hudT = 0.25; this.renderHud(); }
  }

  /* ---------- แถบสถานะบนจอ ---------- */
  renderHud(force) {
    const R = this.run, g = this.g;
    if (!R) { if (this.hudEl) this.hudEl.hidden = true; document.body.classList.remove('in-dg'); return; }
    if (!this.hudEl) {
      const el = this.hudEl = document.createElement('div');
      el.className = 'panel dg-hud'; el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<b class="dg-t"></b><span class="dg-o"></span><span class="dg-m"></span><div class="dg-hp" hidden><i></i></div><button type="button" class="ghost dg-x" title="ออกจากดันเจี้ยน">ออก</button>';
      el.querySelector('.dg-x').addEventListener('click', () => this.leaveConfirm());
      for (const ev of ['pointerdown', 'touchstart', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      g.root.append(el);
    }
    const el = this.hudEl; el.hidden = false;
    let t, o, m;
    if (R.kind === 'cave') {
      t = `${CAVE.name} · B${R.floor}/${CAVE.floors}`;
      const need = Math.ceil(R.total * CAVE.clearPct);
      o = R.done ? '🏆 พิชิตแล้ว! เข้าประตูแสงเพื่อกลับเมือง' : R.cleared ? '⬇ ไปที่ประตูแสงในห้องบอส' : R.boss ? `⚔ ปราบบอส: ${R.boss.name} (${Math.max(0, Math.ceil(R.boss.hp / R.boss.maxHp * 100))}%)` : `กำจัดมอน ${Math.min(R.killed, need)}/${need} → บอสท้ายชั้น`;
      m = `⏱ ${fmtT(R.t)} · Lv.${R.L || '-'}`;
    } else {
      t = `${TOWER.name} · ชั้น ${R.floor}`;
      const left = Math.max(0, R.total - R.killed);
      o = R.cleared ? '⬆ เข้าประตูแสงกลางลานเพื่อขึ้นชั้นถัดไป' : `มอนที่เหลือ ${left}${R.boss && !R.bossDown ? ' · มีบอส!' : ''}`;
      m = R.cleared ? `สถิติ ${this.st.best}` : `⏱ ${fmtT(R.timeLeft)} · Lv.${R.L || '-'}`;
      el.classList.toggle('dg-hurry', !R.cleared && R.timeLeft < 20);
    }
    // v0.32.1: เลือดบอสเป็นแถบบางในกล่องนี้ (แทนแถบบอสใหญ่ที่บังจอ)
    const B = R.boss && !R.boss.dead ? R.boss : null, hp = el.querySelector('.dg-hp');
    hp.hidden = !B; if (B) hp.firstChild.style.width = Math.max(0, B.hp / B.maxHp * 100).toFixed(1) + '%';
    document.body.classList.add('in-dg');
    const key = t + o + m;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    el.querySelector('.dg-t').textContent = t; el.querySelector('.dg-o').textContent = o; el.querySelector('.dg-m').textContent = m;
  }

  /* ---------- อันดับ ---------- */
  async submit() {
    const g = this.g, st = this.st, on = g.online;
    if (!st.best || g.mode !== 'online' || !on || !on.towerSubmit || st.best <= (this.sentBest || 0)) return;
    try { await on.towerSubmit(st.best, g.player); this.sentBest = st.best; } catch (e) { /* ส่งไม่ได้ไม่เป็นไร — ส่งใหม่รอบหน้า */ }
  }

  async openRanking() {
    const g = this.g;
    if (!this.rankEl) {
      const el = this.rankEl = document.createElement('section');
      el.className = 'panel dg-rank'; el.hidden = true; el.setAttribute('aria-label', 'อันดับหอคอย');
      el.innerHTML = `<header class="dg-rh"><b>🏯 อันดับ${TOWER.name}</b><button type="button" class="close" aria-label="ปิด">✕</button></header><div class="dg-rb"></div>`;
      el.querySelector('.close').addEventListener('click', () => { el.hidden = true; });
      for (const ev of ['pointerdown', 'touchstart', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      g.root.append(el);
    }
    const el = this.rankEl, body = el.querySelector('.dg-rb'), st = this.st, pl = g.player;
    el.hidden = false;
    const mine = `<p class="dg-me">ของเจ้า: ชั้นสูงสุด <b>${st.best || '—'}</b> · วันนี้ ${st.tToday || '—'}</p>`;
    if (g.mode !== 'online' || !g.online || !g.online.towerBoard) {
      body.innerHTML = mine + '<p class="dg-note">กระดานอันดับรวมใช้ได้เมื่อเล่นแบบออนไลน์ — ตอนนี้แสดงเฉพาะสถิติของเจ้า</p>';
      return;
    }
    body.innerHTML = mine + '<p class="dg-note">กำลังโหลดอันดับ…</p>';
    await this.submit();
    let rows = [];
    try { rows = await g.online.towerBoard(50); } catch (e) { rows = null; }
    if (el.hidden) return;
    if (!rows) { body.innerHTML = mine + '<p class="dg-note">โหลดอันดับไม่สำเร็จ (ผู้ดูแลต้องรัน supabase/tower.sql ก่อน)</p>'; return; }
    if (!rows.length) { body.innerHTML = mine + '<p class="dg-note">ยังไม่มีใครขึ้นกระดาน — เป็นคนแรกเลย!</p>'; return; }
    body.innerHTML = mine + `<ol class="dg-list">${rows.map((r, i) => `<li class="${r.mine ? 'me' : ''}${i < 3 ? ' top' + (i + 1) : ''}"><span class="rk">${i + 1}</span><span class="nm">${esc(r.name)}</span><span class="jb">${esc((JOBS[r.job] && JOBS[r.job].name) || r.job || '')}</span><b class="fl">ชั้น ${r.floor}</b></li>`).join('')}</ol>`;
    void pl;
  }
}
