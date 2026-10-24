// v0.94 สกิลบอส MVP/บอสโลกชุดใหม่ — ทุกท่ามีสัญญาณเตือนบนพื้นให้หลบได้ · แบ่งเฟสตามเลือด (ปลดล็อกท่าใหม่ + เร็วขึ้น)
// ท่า (kind):
//   slam    วงรอบตัวบอส (ออกห่าง)            donut  วงแหวนรอบนอก (เข้าใกล้บอส)
//   cone    พ่นลม/ฟันเป็นรูปพัดหน้าตัว (หลบข้าง)  charge พุ่งชนเป็นแนวตรง (หลบออกจากแนว)
//   rain    วงตกต่อเนื่องรอบผู้เล่น (เดินไม่หยุด)  mark   ตราตามตัว แล้วล็อกระเบิด (ขยับหนี)
//   orbs    ลูกพลังไล่ตาม (วิ่งหนี/ล่อให้ตก)      pull   ดูดเข้าหาบอสแล้วระเบิด (เดินสวนออก)
//   cross   ลำแสงตามแนวกากบาท/ดาว (ยืนในช่องว่าง)  shield โล่ลดดาเมจ 75% ชั่วครู่ (หยุดตี/ใช้บัฟ)
//   adds    เรียกลูกน้อง                         cataclysm  ถล่มทั้งลาน เว้นวงปลอดภัย (บอสโลก)
// รายบอสอยู่ใน BOSS_KITS · ค่า mult เทียบกับพลังโจมตีบอส (ผ่าน rollSkill เดิม · หลบ Miss ได้)
import { TILE } from '../config.js?v=0.93.0-p4.2';
import { MONSTERS } from '../data/monsters.js?v=0.93.0-p4.2';
import { rollSkill } from './Combat.js?v=0.93.0-p4.2';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

// ธีมสี/เอฟเฟกต์ (BossFX ใช้ชื่อเดียวกัน)
export const THEMES = {
  nature: { color: '#8ad84a', warn: '#c8ff6a', fx: 'nature', name: 'พงไพร' },
  ice: { color: '#9ae8ff', warn: '#cdf4ff', fx: 'ice', name: 'น้ำแข็ง' },
  fire: { color: '#ff7a1a', warn: '#ffb04a', fx: 'fire', name: 'เพลิง' },
  holy: { color: '#ffd86a', warn: '#fff0a8', fx: 'holy', name: 'ศักดิ์สิทธิ์' },
  blood: { color: '#e0243c', warn: '#ff6a7a', fx: 'blood', name: 'โลหิต' },
  water: { color: '#3ab8ff', warn: '#8ae0ff', fx: 'water', name: 'สายน้ำ' },
  crystal: { color: '#c08aff', warn: '#e8c8ff', fx: 'crystal', name: 'ผลึก' },
  void: { color: '#7a3aff', warn: '#c8a8ff', fx: 'void', name: 'คราส' },
};

// ชุดท่าของบอสแต่ละตัว · phase = เฟสที่ปลดล็อก (0 เริ่ม · 1 เมื่อ HP ≤ phases[0] · 2 เมื่อ HP ≤ phases[1])
const K = (kind, o = {}) => ({ kind, cd: [8, 12], phase: 0, mult: 1.3, ...o });
export const BOSS_KITS = {
  gnarlroot: { theme: 'nature', phases: [0.6, 0.3], skills: [
    K('slam', { name: 'กระทืบรากไม้', radius: 3, windup: 1.2, mult: 1.4, knock: 2, cd: [7, 10] }),
    K('rain', { name: 'หนามรากพุ่ง', n: 5, radius: 1.4, gap: 0.35, windup: 0.9, mult: 1, effect: 'root', secs: 1.4, cd: [9, 13] }),
    K('cone', { name: 'พายุใบมีด', range: 6, arc: 1.2, windup: 1.1, mult: 1.3, cd: [10, 14], phase: 1 }),
    K('pull', { name: 'เถาวัลย์ลากรวม', radius: 7, dur: 1.6, blast: 2.6, mult: 1.6, cd: [16, 20], phase: 1 }),
    K('adds', { name: 'ปลุกวิญญาณป่า', mob: 'wisp', count: 3, cd: [22, 26], phase: 2 }),
  ] },
  glacia: { theme: 'ice', phases: [0.6, 0.3], skills: [
    K('slam', { name: 'คลื่นเยือกแข็ง', radius: 3.2, windup: 1.2, mult: 1.5, knock: 2, cd: [7, 10] }),
    K('cone', { name: 'ลมหายใจเหมันต์', range: 7, arc: 1.0, windup: 1.2, mult: 1.4, effect: 'freeze', secs: 1.2, cd: [9, 12] }),
    K('rain', { name: 'ผลึกน้ำแข็งถล่ม', n: 6, radius: 1.5, gap: 0.3, windup: 0.9, mult: 1.1, cd: [10, 14], phase: 1 }),
    K('mark', { name: 'ตราแช่แข็ง', follow: 2.2, lock: 0.8, radius: 2.4, mult: 1.6, effect: 'freeze', secs: 1.8, cd: [14, 18], phase: 1 }),
    K('donut', { name: 'พายุหิมะวงนอก', r0: 2.6, r1: 7.5, windup: 1.6, mult: 1.6, cd: [18, 22], phase: 2 }),
  ] },
  ignarok: { theme: 'fire', phases: [0.6, 0.3], skills: [
    K('cone', { name: 'ลมหายใจมังกรเพลิง', range: 8, arc: 1.1, windup: 1.2, mult: 1.6, effect: 'burn', secs: 4, cd: [8, 11] }),
    K('charge', { name: 'พุ่งชนเพลิง', len: 10, width: 1.8, windup: 1.1, mult: 1.6, knock: 3, cd: [10, 14] }),
    K('rain', { name: 'อุกกาบาตถล่ม', n: 6, radius: 1.8, gap: 0.32, windup: 1.0, mult: 1.3, effect: 'burn', secs: 3, cd: [11, 15], phase: 1 }),
    K('donut', { name: 'ทะเลลาวา', r0: 3, r1: 8, windup: 1.6, mult: 1.7, effect: 'burn', secs: 3, cd: [16, 20], phase: 1 }),
    K('slam', { name: 'ระเบิดแกนลาวา', radius: 3.8, windup: 1.4, mult: 2, knock: 3, cd: [14, 18], phase: 2 }),
  ] },
  aurex: { theme: 'holy', phases: [0.6, 0.3], skills: [
    K('slam', { name: 'โล่ผู้พิทักษ์กระแทก', radius: 3.2, windup: 1.2, mult: 1.6, knock: 2, cd: [7, 10] }),
    K('cross', { name: 'ดาบแสงกากบาท', arms: 4, len: 9, width: 1.4, windup: 1.3, mult: 1.6, cd: [10, 13] }),
    K('charge', { name: 'พุ่งทะลวงผู้พิทักษ์', len: 9, width: 2, windup: 1.0, mult: 1.6, knock: 3, cd: [12, 16], phase: 1 }),
    K('shield', { name: 'กำแพงศักดิ์สิทธิ์', dur: 6, cd: [24, 30], phase: 1 }),
    K('cross', { name: 'ดาบแสงแปดทิศ', arms: 8, len: 9, width: 1.2, windup: 1.4, mult: 1.8, rotate: 0.4, cd: [16, 20], phase: 2 }),
  ] },
  nocthar: { theme: 'blood', phases: [0.6, 0.3], skills: [
    K('cone', { name: 'เคียวจันทร์เสี้ยว', range: 5.5, arc: 2.2, windup: 1.0, mult: 1.7, cd: [7, 10] }),
    K('mark', { name: 'ตราโลหิต', follow: 2.4, lock: 0.7, radius: 2.4, mult: 1.8, cd: [11, 14] }),
    K('orbs', { name: 'ดวงวิญญาณไล่ล่า', n: 3, speed: 3.2, life: 5, radius: 1.2, mult: 1.2, cd: [14, 18], phase: 1 }),
    K('pull', { name: 'สุริยคราสดูดวิญญาณ', radius: 8, dur: 1.8, blast: 3, mult: 2, cd: [18, 22], phase: 1 }),
    K('rain', { name: 'ฝนจันทร์โลหิต', n: 8, radius: 1.6, gap: 0.24, windup: 0.9, mult: 1.2, effect: 'burn', secs: 3, cd: [14, 18], phase: 2 }),
  ] },
  tidalos: { theme: 'water', phases: [0.6, 0.3], skills: [
    K('charge', { name: 'กระแสน้ำพุ่ง', len: 11, width: 1.8, windup: 1.0, mult: 1.6, knock: 3, cd: [8, 11] }),
    K('donut', { name: 'น้ำวนมรณะ', r0: 2.6, r1: 7.5, windup: 1.5, mult: 1.6, cd: [12, 16] }),
    K('pull', { name: 'วังน้ำวนดูด', radius: 8, dur: 1.7, blast: 2.8, mult: 1.8, cd: [15, 19], phase: 1 }),
    K('rain', { name: 'เสาน้ำพุ่ง', n: 7, radius: 1.6, gap: 0.28, windup: 0.9, mult: 1.2, effect: 'root', secs: 1.2, cd: [12, 15], phase: 1 }),
    K('orbs', { name: 'ฟองคลื่นไล่ล่า', n: 4, speed: 2.8, life: 5, radius: 1.3, mult: 1.2, cd: [16, 20], phase: 2 }),
  ] },
  crysthar: { theme: 'crystal', phases: [0.6, 0.3], skills: [
    K('cone', { name: 'ลมหายใจผลึก', range: 8, arc: 0.9, windup: 1.2, mult: 1.6, effect: 'freeze', secs: 1, cd: [8, 11] }),
    K('cross', { name: 'แสงหักเหปริซึม', arms: 6, len: 9, width: 1.2, windup: 1.3, mult: 1.6, rotate: 0.5, cd: [11, 14] }),
    K('orbs', { name: 'ผลึกไล่ล่า', n: 3, speed: 3.4, life: 4.5, radius: 1.2, mult: 1.3, cd: [14, 18], phase: 1 }),
    K('shield', { name: 'เกราะผลึก', dur: 6, cd: [22, 28], phase: 1 }),
    K('rain', { name: 'ผลึกฟ้าถล่ม', n: 8, radius: 1.5, gap: 0.24, windup: 0.9, mult: 1.2, cd: [12, 16], phase: 2 }),
  ] },
  aurelion: { theme: 'holy', phases: [0.6, 0.3], skills: [
    K('rain', { name: 'ฝนแสงสวรรค์', n: 7, radius: 1.6, gap: 0.26, windup: 0.9, mult: 1.3, cd: [8, 11] }),
    K('cone', { name: 'ปีกแสงกวาด', range: 6.5, arc: 2.4, windup: 1.1, mult: 1.6, knock: 2, cd: [9, 12] }),
    K('mark', { name: 'ตราพิพากษา', follow: 2.2, lock: 0.7, radius: 2.6, mult: 1.9, cd: [12, 16], phase: 1 }),
    K('cross', { name: 'ดาวแปดแฉกพิพากษา', arms: 8, len: 10, width: 1.2, windup: 1.4, mult: 1.8, rotate: 0.35, cd: [14, 18], phase: 1 }),
    K('shield', { name: 'ม่านสวรรค์', dur: 5, cd: [24, 30], phase: 2 }),
  ] },
  world_aurex: { theme: 'holy', world: true, phases: [0.66, 0.33], skills: [
    K('slam', { name: 'ทุบแผ่นดินผู้พิทักษ์', radius: 4.4, windup: 1.4, mult: 1.8, knock: 3, cd: [7, 10] }),
    K('charge', { name: 'ยักษ์พุ่งทะลวง', len: 12, width: 2.6, windup: 1.2, mult: 1.8, knock: 3, cd: [10, 13] }),
    K('cross', { name: 'ดาบแสงแปดทิศ', arms: 8, len: 12, width: 1.6, windup: 1.4, mult: 1.8, rotate: 0.4, cd: [12, 16], phase: 1 }),
    K('rain', { name: 'ดาบสวรรค์ร่วง', n: 10, radius: 1.8, gap: 0.22, windup: 1.0, mult: 1.4, cd: [12, 16], phase: 1 }),
    K('shield', { name: 'ป้อมปราการทองคำ', dur: 7, cd: [26, 32], phase: 1 }),
    K('cataclysm', { name: 'วันพิพากษา', radius: 11, safe: 3, safeR: 1.8, windup: 3, mult: 4, cd: [30, 36], phase: 2 }),
  ] },
  world_nocthar: { theme: 'void', world: true, phases: [0.66, 0.33], skills: [
    K('cone', { name: 'ลมหายใจคราส', range: 10, arc: 1.2, windup: 1.3, mult: 1.8, effect: 'burn', secs: 4, cd: [8, 11] }),
    K('orbs', { name: 'ดาวคราสไล่ล่า', n: 5, speed: 3, life: 6, radius: 1.4, mult: 1.3, cd: [13, 17] }),
    K('donut', { name: 'วงแหวนสุริยคราส', r0: 3.2, r1: 10, windup: 1.7, mult: 1.9, cd: [14, 18], phase: 1 }),
    K('mark', { name: 'ตราคราสมรณะ', follow: 2.4, lock: 0.7, radius: 2.8, mult: 2, cd: [14, 18], phase: 1 }),
    K('pull', { name: 'หลุมดำกลืนกิน', radius: 10, dur: 2, blast: 3.4, mult: 2.2, cd: [20, 24], phase: 1 }),
    K('cataclysm', { name: 'สุริยคราสดับโลก', radius: 12, safe: 3, safeR: 1.8, windup: 3, mult: 4, cd: [30, 36], phase: 2 }),
  ] },
};

export class BossSkills {
  constructor(game) { this.g = game; this.orbs = []; }
  kitOf(m) { return BOSS_KITS[m.type] || null; }

  // ทุกเฟรมต่อบอส 1 ตัวที่กำลังสู้กับผู้เล่น · คืน true ถ้าจัดการแล้ว (ไม่ต้องใช้ท่าเดิม)
  update(m, dt) {
    const kit = this.kitOf(m); if (!kit) return false;
    const g = this.g, pl = g.player;
    if (!m.bk) m.bk = { phase: 0, cds: kit.skills.map((s) => rnd(s.cd[0], s.cd[1]) * (0.25 + Math.random() * 0.4)), gcd: 1.5 };
    const S = m.bk, frac = m.hp / m.maxHp;
    // เปลี่ยนเฟส
    while (S.phase < kit.phases.length && frac <= kit.phases[S.phase]) { S.phase++; this.phaseUp(m, kit, S.phase); }
    const speed = 1 + S.phase * 0.18 + (m.enraged ? 0.15 : 0);
    S.gcd -= dt; S.cds.forEach((v, i) => { S.cds[i] = v - dt * speed; });
    if (m.busyUntil > g.time || S.gcd > 0) return true;
    const d = Math.hypot(pl.x - m.x, pl.y - m.y) / TILE;
    // เลือกท่าที่พร้อมและเหมาะกับระยะ (ท่าระยะใกล้ใช้เมื่อผู้เล่นอยู่ใกล้)
    const ready = kit.skills.map((s, i) => [s, i]).filter(([s, i]) => s.phase <= S.phase && S.cds[i] <= 0 && this.inRange(s, d));
    if (!ready.length) return true;
    const [sk, i] = ready.sort((a, b) => S.cds[a[1]] - S.cds[b[1]])[0];
    S.cds[i] = rnd(sk.cd[0], sk.cd[1]); S.gcd = 1.2;
    this.cast(m, sk, kit);
    return true;
  }
  inRange(s, d) {
    if (s.kind === 'slam') return d < (s.radius || 3) * 0.95;
    if (s.kind === 'cone') return d < (s.range || 6) * 0.9;
    if (s.kind === 'charge') return d > 2 && d < (s.len || 10) * 0.9;
    if (s.kind === 'donut') return d > (s.r0 || 2.5) * 0.6 && d < (s.r1 || 7);
    if (s.kind === 'cross') return d < (s.len || 9);
    return d < 12;
  }

  /* ---------- ตัวช่วย ---------- */
  T(kit) { return THEMES[kit.theme] || THEMES.fire; }
  announce(m, sk, kit) {
    const g = this.g, th = this.T(kit);
    g.gfx.emote(m, '!!'); g.sfx('bossWindup');
    g.gfx.floatText(m, sk.name, 'boss-skill', { h: (m.data.height || 3) * 1.1 + 0.6, life: 1.6, rise: 0.3, drift: false });
    g.gfx.bossFx && g.gfx.bossFx.windupAura(m, th);
  }
  hitPlayer(m, sk, kit, { knockFrom = m, knock = sk.knock || 0 } = {}) {
    const g = this.g, pl = g.player; if (pl.dead) return;
    const r = rollSkill(m.stats, pl.stats, { mult: sk.mult, hitBonus: 60 });
    if (r.miss) { g.gfx.floatText(pl, 'Miss', 'miss'); return; }
    g.damagePlayer(r.amount, m, true);
    if (pl.dead) return;
    if (knock) g.knockPlayer(knockFrom, knock);
    this.status(m, sk);
  }
  status(m, sk) {
    const g = this.g, pl = g.player;
    if (sk.effect === 'burn') {
      g.gfx.floatText(pl, 'ไหม้!', 'status root', { h: 2.2, life: 1.2, rise: 0.5, drift: false });
      for (let k = 1; k <= (sk.secs || 3); k++) g.schedule(k, () => { if (!pl.dead) g.damagePlayer(Math.max(1, Math.round(pl.maxHp * 0.03)), m, false); });
    } else if (sk.effect === 'freeze' || sk.effect === 'root') {
      pl.rootedUntil = g.time + (sk.secs || 1.2); pl.path = [];
      g.gfx.floatText(pl, sk.effect === 'freeze' ? 'แช่แข็ง!' : 'ติดราก!', 'status root', { h: 2.2, life: 1.2, rise: 0.5, drift: false });
    }
  }
  sfxOf(kit) { const t = kit.theme; return t === 'ice' || t === 'crystal' ? 'iceBlast' : t === 'fire' || t === 'void' || t === 'blood' ? 'explosion' : 'slam'; }
  lock(m, secs) { const g = this.g; m.busyUntil = g.time + secs; m.attackCd = Math.max(m.attackCd || 0, secs + 0.3); m.path = []; }

  phaseUp(m, kit, n) {
    const g = this.g, th = this.T(kit);
    g.hud.log(`⚠ ${m.name} เข้าสู่เฟส ${n + 1}! ปลดปล่อยพลัง${th.name}`, 'r-epic');
    g.gfx.floatText(m, `PHASE ${n + 1}`, 'mvp', { h: (m.data.height || 3) * 1.15 + 0.8, life: 2, rise: 0.4, drift: false });
    g.gfx.shake(0.5); g.sfx('bossWindup');
    this.lock(m, 1.4);
    g.gfx.bossFx && g.gfx.bossFx.phaseUp(m, th, n);
    // คลื่นพลังผลักผู้เล่นที่อยู่ใกล้ออก (ไม่มีดาเมจ)
    const pl = g.player; if (!pl.dead && Math.hypot(pl.x - m.x, pl.y - m.y) < 3.2 * TILE) g.schedule(0.6, () => { if (!pl.dead) g.knockPlayer(m, 2.5); });
  }

  /* ---------- ร่ายท่า ---------- */
  cast(m, sk, kit) {
    const fn = this['k_' + sk.kind]; if (!fn) return;
    m.face(this.g.player.x - m.x, this.g.player.y - m.y);
    this.announce(m, sk, kit);
    fn.call(this, m, sk, kit);
  }

  k_slam(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player;
    this.lock(m, sk.windup + 0.4);
    g.gfx.telegraph(m.x, m.y, sk.radius, sk.windup, '#ff3a3a');
    g.gfx.playSlam(m, sk.windup + 0.25);
    g.gfx.bossWindup(m, sk.radius, sk.windup, th.color);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      g.gfx.bossFx.burst(m.x, m.y, sk.radius, th, true); g.sfx(this.sfxOf(kit));
      if (Math.hypot(pl.x - m.x, pl.y - m.y) <= sk.radius * TILE + 4) this.hitPlayer(m, sk, kit);
    });
  }
  k_donut(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, cx = m.x, cy = m.y;
    this.lock(m, sk.windup + 0.4);
    g.gfx.playSlam(m, sk.windup + 0.25);
    g.gfx.bossFx.tDonut(cx, cy, sk.r0, sk.r1, sk.windup, th);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      g.gfx.bossFx.donut(cx, cy, sk.r0, sk.r1, th); g.sfx(this.sfxOf(kit));
      const d = Math.hypot(pl.x - cx, pl.y - cy) / TILE;
      if (d >= sk.r0 && d <= sk.r1 + 0.3) this.hitPlayer(m, sk, kit);
    });
  }
  k_cone(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, cx = m.x, cy = m.y;
    const a = Math.atan2(pl.y - m.y, pl.x - m.x);
    this.lock(m, sk.windup + 0.8);
    g.gfx.playAttack(m);
    g.gfx.bossFx.tCone(cx, cy, a, sk.range, sk.arc, sk.windup, th);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      g.gfx.bossFx.breath(m, cx, cy, a, sk.range, sk.arc, th); g.sfx(this.sfxOf(kit));
      const dx = pl.x - cx, dy = pl.y - cy, d = Math.hypot(dx, dy) / TILE;
      let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (d <= sk.range && Math.abs(da) <= sk.arc / 2 + 0.06) this.hitPlayer(m, sk, kit);
    });
  }
  k_charge(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, sx = m.x, sy = m.y;
    const a = Math.atan2(pl.y - m.y, pl.x - m.x), ux = Math.cos(a), uy = Math.sin(a);
    // หยุดก่อนชนกำแพง
    let L = sk.len; for (let s = 1; s <= sk.len; s += 0.5) { if (g.map.isSolidTile(Math.floor((sx + ux * s * TILE) / TILE), Math.floor((sy + uy * s * TILE) / TILE))) { L = Math.max(2, s - 1); break; } }
    this.lock(m, sk.windup + 0.7);
    g.gfx.bossFx.tLine(sx, sy, a, L, sk.width, sk.windup, th);
    g.gfx.bossWindup(m, 1.6, sk.windup, th.color);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      const dur = 0.35, ex = sx + ux * L * TILE, ey = sy + uy * L * TILE;
      g.gfx.bossFx.chargeTrail(m, sx, sy, ex, ey, dur, th);
      let hit = false;
      const steps = 10; for (let i = 1; i <= steps; i++) g.schedule((i / steps) * dur, () => {
        if (m.dead) return; m.x = sx + (ex - sx) * (i / steps); m.y = sy + (ey - sy) * (i / steps);
        if (!hit && Math.hypot(pl.x - m.x, pl.y - m.y) < (sk.width * 0.5 + 0.6) * TILE) { hit = true; this.hitPlayer(m, sk, kit); }
      });
      g.schedule(dur, () => { if (m.dead) return; g.gfx.bossFx.burst(ex, ey, 2.2, th, false); g.sfx(this.sfxOf(kit)); g.gfx.shake(0.35); });
    });
  }
  k_rain(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player;
    this.lock(m, 0.9);
    g.gfx.playAttack(m); g.gfx.bossWindup(m, 1.8, 0.8, th.color);
    for (let i = 0; i < sk.n; i++) g.schedule(0.4 + i * sk.gap, () => {
      if (m.dead) return;
      // ครึ่งหนึ่งตกตรงผู้เล่น อีกครึ่งตกรอบ ๆ (บังคับให้เดินตลอด)
      const near = i % 2 === 0, a = Math.random() * TAU, r = near ? 0 : rnd(1.5, 3.5) * TILE;
      const tx = pl.x + Math.cos(a) * r + (near ? (pl.vx || 0) * 0.3 : 0), ty = pl.y + Math.sin(a) * r;
      g.gfx.telegraph(tx, ty, sk.radius, sk.windup, '#ff3a3a');
      g.gfx.bossFx.fallFrom(tx, ty, sk.windup, th);
      g.schedule(sk.windup, () => {
        if (m.dead) return;
        g.gfx.bossFx.burst(tx, ty, sk.radius, th, false); g.sfx(this.sfxOf(kit), { gap: 60 });
        if (Math.hypot(pl.x - tx, pl.y - ty) <= sk.radius * TILE + 4) this.hitPlayer(m, sk, kit);
      });
    });
  }
  k_mark(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player;
    this.lock(m, 0.8);
    g.gfx.playAttack(m);
    g.hud.log(`⚠ ${m.name} ประทับตราบนตัวคุณ — เดินหนีจุดที่ตราล็อก!`, 'sys');
    const H = g.gfx.bossFx.markFollow(pl, sk.radius, sk.follow, th);
    g.schedule(sk.follow, () => {
      const tx = pl.x, ty = pl.y;
      g.gfx.telegraph(tx, ty, sk.radius, sk.lock, '#ff3a3a');
      H.lockAt(tx, ty, sk.lock);
      g.schedule(sk.lock, () => {
        if (m.dead) return;
        g.gfx.bossFx.burst(tx, ty, sk.radius, th, true); g.sfx(this.sfxOf(kit)); g.gfx.shake(0.4);
        if (Math.hypot(pl.x - tx, pl.y - ty) <= sk.radius * TILE + 4) this.hitPlayer(m, sk, kit);
      });
    });
  }
  k_orbs(m, sk, kit) {
    const g = this.g, th = this.T(kit);
    this.lock(m, 1.0);
    g.gfx.playAttack(m);
    for (let i = 0; i < sk.n; i++) {
      const a = (i / sk.n) * TAU, o = { x: m.x + Math.cos(a) * 1.8 * TILE, y: m.y + Math.sin(a) * 1.8 * TILE, t: -0.5 - i * 0.15, sk, m, kit, th };
      o.view = g.gfx.bossFx.orb(o.x, o.y, th);
      this.orbs.push(o);
    }
  }
  updateOrbs(dt) {
    const g = this.g, pl = this.g.player;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i]; o.t += dt;
      if (o.t > 0 && !pl.dead) { const dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1, v = o.sk.speed * TILE * dt * Math.min(1, 0.4 + o.t * 0.4); o.x += (dx / d) * v; o.y += (dy / d) * v; }
      g.gfx.bossFx.orbMove(o.view, o.x, o.y);
      const hitNow = o.t > 0 && Math.hypot(pl.x - o.x, pl.y - o.y) < o.sk.radius * TILE * 0.6;
      if (hitNow || o.t > o.sk.life || o.m.dead) {
        g.gfx.bossFx.orbPop(o.view, o.x, o.y, o.sk.radius, o.th);
        if (!o.m.dead) { g.sfx(this.sfxOf(o.kit), { gap: 60 }); if (Math.hypot(pl.x - o.x, pl.y - o.y) <= o.sk.radius * TILE + 4) this.hitPlayer(o.m, o.sk, o.kit); }
        this.orbs.splice(i, 1);
      }
    }
  }
  k_pull(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, cx = m.x, cy = m.y;
    this.lock(m, sk.dur + 0.8);
    g.gfx.playSlam(m, sk.dur + 0.3);
    g.gfx.bossFx.vortex(cx, cy, sk.radius, sk.dur, th);
    g.gfx.telegraph(cx, cy, sk.blast, sk.dur, '#ff3a3a');
    const N = Math.round(sk.dur * 15);
    for (let i = 0; i < N; i++) g.schedule(i / 15, () => {
      if (m.dead || pl.dead) return;
      const dx = cx - pl.x, dy = cy - pl.y, d = Math.hypot(dx, dy);
      if (d > 0.8 * TILE && d < sk.radius * TILE) { const st = (4.6 * TILE) / 15; pl.moveBy((dx / d) * st, (dy / d) * st, g.map); }   // ดูด 4.6 ช่อง/วิ — เดินสวนเต็มที่ยังพอหนีได้
    });
    g.schedule(sk.dur, () => {
      if (m.dead) return;
      g.gfx.bossFx.burst(cx, cy, sk.blast, th, true); g.sfx(this.sfxOf(kit)); g.gfx.shake(0.5);
      if (Math.hypot(pl.x - cx, pl.y - cy) <= sk.blast * TILE + 4) this.hitPlayer(m, sk, kit, { knock: 2.5 });
    });
  }
  k_cross(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, cx = m.x, cy = m.y;
    const a0 = Math.atan2(pl.y - m.y, pl.x - m.x) + (Math.random() < 0.5 ? 0 : Math.PI / sk.arms);
    this.lock(m, sk.windup + 0.6);
    g.gfx.playSlam(m, sk.windup + 0.2);
    const angs = Array.from({ length: sk.arms }, (_, i) => a0 + (i / sk.arms) * TAU);
    for (const a of angs) g.gfx.bossFx.tLine(cx, cy, a, sk.len, sk.width, sk.windup, th);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      g.gfx.bossFx.beams(cx, cy, angs, sk.len, sk.width, th); g.sfx(this.sfxOf(kit)); g.gfx.shake(0.35);
      const dx = pl.x - cx, dy = pl.y - cy;
      const inBeam = angs.some((a) => { const along = dx * Math.cos(a) + dy * Math.sin(a), side = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); return along > -TILE && along <= sk.len * TILE && side <= (sk.width * 0.5) * TILE + 4; });
      if (inBeam) this.hitPlayer(m, sk, kit);
      // ระลอกที่สอง: หมุนแนวเล็กน้อย
      if (sk.rotate) {
        const angs2 = angs.map((a) => a + sk.rotate);
        for (const a of angs2) g.gfx.bossFx.tLine(cx, cy, a, sk.len, sk.width, 0.9, th);
        g.schedule(0.9, () => {
          if (m.dead) return;
          g.gfx.bossFx.beams(cx, cy, angs2, sk.len, sk.width, th); g.sfx(this.sfxOf(kit));
          const dx2 = pl.x - cx, dy2 = pl.y - cy;
          if (angs2.some((a) => { const al = dx2 * Math.cos(a) + dy2 * Math.sin(a), sd = Math.abs(-dx2 * Math.sin(a) + dy2 * Math.cos(a)); return al > -TILE && al <= sk.len * TILE && sd <= sk.width * 0.5 * TILE + 4; })) this.hitPlayer(m, sk, kit);
        });
      }
    });
  }
  k_shield(m, sk, kit) {
    const g = this.g, th = this.T(kit);
    this.lock(m, 0.8);
    m.bossShieldUntil = g.time + sk.dur;
    g.hud.log(`🛡 ${m.name} กางโล่${th.name}! ดาเมจที่ได้รับลดลง 75% เป็นเวลา ${sk.dur} วิ`, 'sys');
    g.gfx.bossFx.shield(m, sk.dur, th);
  }
  k_adds(m, sk, kit) {
    const g = this.g, th = this.T(kit);
    this.lock(m, 1);
    g.gfx.playSlam(m, 0.8);
    g.hud.log(`${m.name} เรียก${(MONSTERS[sk.mob] || {}).name || 'ลูกน้อง'}มาช่วย!`, 'sys');
    for (let i = 0; i < sk.count; i++) g.schedule(0.5 + i * 0.12, () => {
      if (m.dead) return;
      const a = (i / sk.count) * TAU + Math.random();
      let x = m.x + Math.cos(a) * 2.4 * TILE, y = m.y + Math.sin(a) * 2.4 * TILE;
      if (g.map.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE))) { x = m.x; y = m.y; }
      g.gfx.bossFx.burst(x, y, 1.2, th, false);
      const w = g.mobs.spawnAt(sk.mob, x, y); w.summoner = m; g.gfx.addMonster(w); g.gfx.playRespawn(w); g.mobs.aggro(w, g.player);
    });
  }
  // บอสโลก: ถล่มทั้งลาน เว้นวงปลอดภัย (วงทอง/ฟ้า) — ต้องวิ่งเข้าวงให้ทัน
  k_cataclysm(m, sk, kit) {
    const g = this.g, th = this.T(kit), pl = g.player, cx = m.x, cy = m.y;
    this.lock(m, sk.windup + 1);
    g.gfx.playSlam(m, sk.windup + 0.4);
    const safes = [];
    for (let i = 0; i < sk.safe; i++) {
      for (let k = 0; k < 20; k++) {
        const a = (i / sk.safe) * TAU + rnd(-0.5, 0.5), r = rnd(4, sk.radius - 2), x = cx + Math.cos(a) * r * TILE, y = cy + Math.sin(a) * r * TILE;
        if (!g.map.isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE))) { safes.push({ x, y }); break; }
      }
    }
    g.hud.log(`☠ ${m.name} กำลังใช้ "${sk.name}" — วิ่งเข้าวงแสงปลอดภัยให้ทัน!`, 'r-epic');
    g.gfx.skyFx(0.75, sk.windup + 1.2);
    g.gfx.bossFx.cataclysm(cx, cy, sk.radius, safes, sk.safeR, sk.windup, th);
    g.schedule(sk.windup, () => {
      if (m.dead) return;
      g.gfx.bossFx.cataclysmBlast(cx, cy, sk.radius, safes, sk.safeR, th); g.sfx('explosion', { gap: 0 }); g.gfx.shake(1);
      const d = Math.hypot(pl.x - cx, pl.y - cy) / TILE;
      const safe = safes.some((s) => Math.hypot(pl.x - s.x, pl.y - s.y) <= sk.safeR * TILE + 4);
      if (d <= sk.radius && !safe) this.hitPlayer(m, sk, kit, { knock: 3 });
    });
  }
}

// ลดดาเมจระหว่างโล่บอส (เรียกจาก damageMonster)
export const bossShieldMul = (m, time) => (m.bossShieldUntil && m.bossShieldUntil > time ? 0.25 : 1);
