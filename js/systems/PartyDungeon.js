// v0.75 ดันเจี้ยนปาร์ตี้ "วิหารผนึกจันทรา" — เล่นร่วมกันจริง 2–6 คน
// · หัวหน้าเปิดรอบ (เซิร์ฟเวอร์สร้างรอบ + เลือดบอสกลาง) → ส่งคำเชิญทางช่องปาร์ตี้ → ทุกคนเข้าแผนที่เดียวกัน (pd_<id>) เห็นกันผ่านห้องแผนที่
// · ดาเมจทุกคนส่งไปหักเลือดกลางที่เซิร์ฟเวอร์ (pd_hit) · บอสตายจริงตามเซิร์ฟเวอร์ · รางวัล/โควตาสัปดาห์ส่งทางจดหมาย
// · กลไกบอส (วงอัญเชิญ · ตราแยก · ตราแบ่งรับ) คำนวณจากเวลาเซิร์ฟเวอร์ + seed ของรอบ → ทุกเครื่องเห็นตรงกันโดยไม่ต้องส่งข้อมูลเพิ่ม
import { TILE } from '../config.js?v=0.76.0';
import { ITEMS } from '../data/items.js?v=0.76.0';
import { MONSTERS } from '../data/monsters.js?v=0.76.0';
import { START_MAP } from '../data/maps/index.js?v=0.76.0';
import { scaledData, refExp } from '../data/dungeons.js?v=0.76.0';
import { PD, PD_BOSS_NAME, PD_SHOP, PD_REWARD_TEXT, pdMapDef, pdRng, pdBossOk } from '../data/partyDungeon.js?v=0.76.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const ERR = {
  weekly_limit: 'สัปดาห์นี้เข้าครบ 2 รอบแล้ว (รีเซ็ตวันจันทร์ 00:00 น. เวลาไทย)', low_level: `ต้องมี Base Lv.${PD.minLv} ขึ้นไป`,
  already_open: 'ปาร์ตี้นี้มีรอบที่เปิดอยู่แล้ว', join_closed: 'รอบนี้ปิดรับคนเพิ่มแล้ว (บอสโดนตีไปแล้วหรือเกิน 1 นาที)', full: 'วิหารเต็มแล้ว (6 คน)',
  run_over: 'รอบนี้จบไปแล้ว', no_run: 'ไม่พบรอบนี้', bad_party: 'รหัสปาร์ตี้ไม่ถูกต้อง', not_member: 'คุณไม่ได้อยู่ในรอบนี้',
};
const errText = (e) => { const m = String((e && (e.code || e.message)) || ''); for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k]; return m || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'; };
const NPC = { name: PD.name, title: 'ดันเจี้ยนปาร์ตี้' };

export class PartyDungeon {
  constructor(game) {
    this.g = game; this.run = null; this.boss = null; this.skew = 0; this.pollT = 0; this.queue = 0; this.sending = false;
    this.fired = null; this.won = false; this.over = false; this.weekLeft = null; this.off = false; this.lastRun = null; this.hudEl = null;
  }

  get on() { return !this.off && this.g.mode === 'online' && !!(this.g.online && this.g.online.pdRPC); }
  get active() { return !!this.run && !!this.g.map && this.g.map.def.id === `pd_${this.run.id}`; }
  rpc(name, args) { return this.g.online.pdRPC(name, args); }
  now() { return Date.now() + this.skew; }
  t() { return this.run ? (this.now() - Date.parse(this.run.starts_at)) / 1000 : 0; }
  coins() { return this.g.player.inventory.count(PD.coin); }

  /* ---------- เมนู (เรียกจาก NPC บรอม) ---------- */
  async menu(npc, greet) {
    const g = this.g;
    if (this.on && this.weekLeft == null) { try { this.weekLeft = await this.rpc('pd_week_left'); } catch (e) { if (e.missing) this.off = true; } }
    const s = g.social, pl = g.player, why = this.blockReason();
    const left = this.weekLeft == null ? '—' : this.weekLeft;
    const info = `${PD.name} — ดันเจี้ยนปาร์ตี้ ${PD.minPlayers}–${PD.maxPlayers} คน\nบอสเลือดกลางร่วมกัน · ต้องช่วยกันหลบวงและยืนตามตรา\nรอบสัปดาห์นี้เหลือ ${left}/${PD.weekly} · เหรียญผนึกของเจ้า ${fmt(this.coins())}`;
    const bye = { label: 'ไว้คราวหลัง', cls: 'ghost', onSelect: () => g.endService() };
    const back = this.lastRun && this.lastRun.status === 'active' && Date.parse(this.lastRun.ends_at) > this.now()
      ? [{ label: 'กลับเข้าวิหาร', sub: 'รอบที่เจ้าเข้าร่วมยังไม่จบ', onSelect: () => this.join(this.lastRun.id) }] : [];
    g.dialog.show(npc || NPC, info, [
      ...back,
      { label: 'เปิดวิหาร (หัวหน้าปาร์ตี้)', sub: why || `ชวนเพื่อนในปาร์ตี้ที่อยู่แผนที่เดียวกันเข้าพร้อมกัน · บอส Lv.${Math.max(PD.minLv, Math.min(150, pl.baseLevel))}`, disabled: !!why, onSelect: () => this.open() },
      { label: 'แลกเหรียญผนึก', sub: `มีอยู่ ${fmt(this.coins())} เหรียญ`, keepOpen: true, onSelect: () => this.shop(npc, greet) },
      { label: 'กติกาและรางวัล', keepOpen: true, onSelect: () => g.dialog.show(npc || NPC,
        `• หัวหน้าปาร์ตี้เปิดวิหาร เพื่อนในปาร์ตี้จะได้คำเชิญ กดเข้าร่วมได้ภายใน 1 นาทีหลังบอสตื่น\n• บอสเลือดเพิ่มตามจำนวนคน · ทุกคนตีบอสตัวเดียวกัน\n• วงม่วงกระจาย = หลบออก · ตราม่วงบนหัวเพื่อน = อยู่ห่างคนนั้น · ตราทองบนหัวเพื่อน = ทุกคนเข้าไปยืนรวม (ยิ่งหลายคนยิ่งเบา)\n• ${fmtT(PD.enrage)} นาทีขึ้นไปบอสคลั่ง · ครบ ${fmtT(PD.time)} นาทีถือว่าล้มเหลว\n• ต้องมีผู้ทำดาเมจอย่างน้อย ${PD.minPlayers} คนจึงได้รางวัล · สัปดาห์ละ ${PD.weekly} รอบต่อบัญชี\n\nรางวัล (ทางจดหมาย): ${PD_REWARD_TEXT} + EXP บอส`, [bye]) },
      bye,
    ]);
    void s;
  }

  blockReason() {
    const g = this.g, s = g.social, pl = g.player;
    if (!this.on) return this.off ? 'เซิร์ฟเวอร์ยังไม่เปิดระบบนี้ (ผู้ดูแลต้องรัน SQL)' : 'ต้องเล่นแบบออนไลน์';
    if (pl.baseLevel < PD.minLv) return `ต้องมี Base Lv.${PD.minLv} ขึ้นไป`;
    if (!s || !s.pid) return 'ต้องอยู่ในปาร์ตี้ก่อน (เชิญเพื่อนจากหน้าต่างผู้เล่นออนไลน์)';
    if (!s.isLeader) return 'หัวหน้าปาร์ตี้เป็นคนเปิด';
    if (s.sameMapCount() < PD.minPlayers) return `ต้องมีเพื่อนในปาร์ตี้อยู่แผนที่เดียวกันอย่างน้อย ${PD.minPlayers} คน`;
    if (this.weekLeft === 0) return ERR.weekly_limit;
    if (g.dungeon && g.dungeon.active) return 'ออกจากดันเจี้ยนอื่นก่อน';
    return '';
  }

  shop(npc, greet) {
    const g = this.g, pl = g.player, have = this.coins();
    g.dialog.show(npc || NPC, `แลกของด้วยเหรียญผนึกจันทรา · มีอยู่ ${fmt(have)} เหรียญ`, [
      ...PD_SHOP.filter((x) => ITEMS[x.id]).map((x) => ({
        label: `${ITEMS[x.id].name} ×${x.n}`, right: `${x.cost} เหรียญ`, disabled: have < x.cost, keepOpen: true,
        onSelect: () => {
          if (this.coins() < x.cost) return;
          if (!pl.inventory.fits([[x.id, x.n]])) { g.hud.log('กระเป๋าเต็ม ทำช่องว่างก่อนแลกของ', 'sys'); return; }
          pl.inventory.remove(PD.coin, x.cost); pl.inventory.add(x.id, x.n);
          g.hud.log(`🪙 แลก ${ITEMS[x.id].name} ×${x.n} (ใช้ ${x.cost} เหรียญผนึก)`, 'r-' + (ITEMS[x.id].rarity || 'common'));
          g.sfx('coin'); g.refreshItemsUI(); g.saveNow(false);
          this.shop(npc, greet);
        },
      })),
      { label: 'กลับ', cls: 'ghost', keepOpen: true, onSelect: () => this.menu(npc, greet) },
    ]);
  }

  /* ---------- เปิด/เข้าร่วม ---------- */
  async open() {
    const g = this.g, s = g.social, why = this.blockReason();
    if (why) { g.hud.log(why, 'sys'); return; }
    const boss = PD.bosses[Math.floor(Math.random() * PD.bosses.length)];
    let row;
    try { row = await this.rpc('pd_open', { p_pid: s.pid, p_boss: boss }); } catch (e) { if (e.missing) this.off = true; g.hud.log(`เปิดวิหารไม่ได้: ${errText(e)}`, 'sys'); g.endService(); return; }
    s.party && s.party.send('pd', { run: row.id, lv: row.level, boss: row.boss, n: g.player.name });
    g.hud.log(`🌙 เปิด${PD.name}แล้ว! ส่งคำเชิญถึงเพื่อนในปาร์ตี้ · บอสตื่นใน ${PD.prep} วินาที`, 'r-epic');
    this.enter(row);
  }

  // คำเชิญจากหัวหน้า (ผ่านช่องปาร์ตี้)
  onInvite(p, who) {
    const g = this.g, id = Math.floor(+p.run);
    if (!Number.isFinite(id) || id <= 0 || !g.started || (this.run && this.run.id === id)) return;
    if (g.player.baseLevel < PD.minLv) { g.hud.log(`${who} เปิด${PD.name} (ต้อง Base Lv.${PD.minLv} ขึ้นไปจึงเข้าร่วมได้)`, 'party'); return; }
    g.hud.log(`🌙 ${who} เปิด${PD.name} — เปิดคำเชิญเพื่อเข้าร่วม (ภายใน 1 นาทีหลังบอสตื่น)`, 'party');
    g.sfx('questDone');
    g.dialog.show({ name: PD.name, title: `คำเชิญจาก ${who}` }, `${who} เปิด${PD.name} (บอส Lv.${Math.floor(+p.lv) || '?'})\nเข้าร่วมเลยไหม? · ใช้โควตา 1 ใน ${PD.weekly} รอบของสัปดาห์เมื่อปราบสำเร็จ`, [
      { label: 'เข้าร่วม', onSelect: () => this.join(id) },
      { label: 'ไม่เข้า', cls: 'ghost', onSelect: () => {} },
    ]);
  }

  async join(id) {
    const g = this.g;
    if (!this.on) { g.hud.log('ต้องเล่นแบบออนไลน์', 'sys'); return; }
    if (g.dungeon && g.dungeon.active) { g.hud.log('ออกจากดันเจี้ยนอื่นก่อน', 'sys'); return; }
    let row;
    try { row = await this.rpc('pd_join', { p_run: id }); } catch (e) { if (e.missing) this.off = true; g.hud.log(`เข้าร่วมไม่ได้: ${errText(e)}`, 'sys'); return; }
    this.enter(row);
  }

  enter(row) {
    const g = this.g;
    g.closeServices();
    this.apply(row, true);
    this.won = false; this.over = false; this.boss = null; this.enraged = false; this.queue = 0;
    const def = pdMapDef(row.id, row.boss), sp = def.spawn;
    def.portals = [{ x: Math.floor(sp.x) - 1, y: Math.floor(sp.y) + 1, w: 2, h: 2, exit: true, label: 'ออกจากวิหาร' }];
    this.def = def;
    g.warp(def, null, () => this.spawnBoss());
  }

  // ปรับสถานะจากเซิร์ฟเวอร์
  apply(row, first = false) {
    if (!row || !row.id) return;
    const sk = Date.parse(row.now) - Date.now();
    if (Number.isFinite(sk)) this.skew = first || !this.run ? sk : this.skew * 0.7 + sk * 0.3;
    this.run = { ...(this.run && this.run.id === row.id ? this.run : {}), ...row };
    this.lastRun = this.run;
    if (Number.isFinite(+row.week_left)) this.weekLeft = +row.week_left;
    const m = this.boss;
    if (m && !m.dead) {
      m.maxHp = +row.max;
      if (!this.sending && !this.queue) m.hp = Math.max(1, Math.min(m.hp, +row.hp));
      else m.hp = Math.max(1, Math.min(m.hp, +row.hp));
    }
    if (row.status === 'defeated') this.win(row);
    else if (row.status === 'failed') this.fail();
  }

  spawnBoss() {
    const g = this.g, R = this.run; if (!R || !g.mobs || !this.active) return;
    for (const p of g.map.portals) if (p.exit) p.onEnter = () => this.leaveConfirm();
    const type = pdBossOk(R.boss) ? R.boss : 'aurex', L = R.level, A = this.def.arena;
    const d = scaledData(type, L, { hpAbs: +R.max, atk: 1.5, expAbs: refExp(L) * 25 });
    d.name = `${PD_BOSS_NAME[type] || 'ผู้คุมผนึก'} Lv.${L}`; d.mvp = false; d.dgBoss = true; d.leash = 40; d.drops = [];
    d.viewScale = 0.85; d.height = (d.height || 3) * d.viewScale; d.radius = (d.radius || 1) * d.viewScale;
    const m = g.mobs.spawnAt(type, A.cx * TILE + 8, (A.cy - 2) * TILE + 8);
    m.data = d; m.level = L; m.name = d.name; m.maxHp = +R.max; m.hp = Math.max(1, +R.hp);
    m.stats = { atk: d.atk, def: d.def, mdef: d.mdef || 0, hit: d.hit, flee: d.flee, crit: d.crit };
    m.speed = d.speed; m.pdRun = R.id; m.noCard = true; m.noBook = true; m.respawnAt = Infinity;
    const wait = Math.max(0, -this.t()); m.busyUntil = g.time + wait;
    g.gfx.addMonster(m);
    this.boss = m;
    // กลไกที่ผ่านไปแล้ว (เข้าทีหลัง/กลับเข้ามาใหม่) ไม่ยิงย้อนหลัง
    const t = this.t(), idx = (c) => (t < c.first ? -1 : Math.floor((t - c.first) / c.every));
    this.fired = { rain: idx(PD.rain), spread: idx(PD.spread), stack: idx(PD.stack) };
    g.hud.levelBanner(PD.name, wait > 0 ? `บอสตื่นใน ${Math.ceil(wait)} วินาที — เตรียมตัว!` : `${d.name} · ช่วยกันปราบ!`);
    if (R.status === 'defeated') this.win(R);
    this.renderHud(true);
  }

  /* ---------- ดาเมจ ---------- */
  hit(m, amount) {
    if (!this.run || m.pdRun !== this.run.id || this.won) return;
    this.queue += Math.max(1, Math.floor(amount));
    if (!this.sending) void this.flush();
  }

  async flush() {
    this.sending = true;
    try {
      while (this.queue > 0 && this.run && !this.won && !this.over) {
        const cap = Math.max(20000, Math.floor((+this.run.max || 0) / 20)), amt = Math.min(this.queue, cap);
        this.queue -= amt;
        try {
          const row = await this.rpc('pd_hit', { p_run: this.run.id, p_damage: amt });
          if (row && +row.damage === 0 && row.status === 'active' && this.t() >= 0) this.queue = Math.min(this.queue + amt, cap * 3);   // โดนจำกัดความถี่ → ส่งใหม่
          this.apply(row);
          if (row && row.rewarded === false && row.status === 'defeated') this.noReward = true;
        } catch (e) { if (e.missing) this.off = true; break; }
        await new Promise((r) => setTimeout(r, 170));
      }
    } finally { this.sending = false; }
  }

  win(row) {
    const g = this.g, m = this.boss;
    if (this.won) return; this.won = true;
    if (m && !m.dead && g.mobs && g.mobs.list.includes(m)) { m.hp = 0; g.killMonster(m, { shared: true, dropMul: 0, mvpTop: false }); }
    const many = ((row && row.members) || []).filter((x) => +x.dmg > 0).length >= PD.minPlayers;
    g.hud.levelBanner('ผนึกสำเร็จ!', many ? 'รางวัลส่งเข้าจดหมายแล้ว (เหรียญผนึก 4 เหรียญ + ผลึกตีบวก)' : `ต้องมีผู้ทำดาเมจอย่างน้อย ${PD.minPlayers} คนจึงได้รางวัล`);
    g.hud.log(many ? `🏆 พิชิต${PD.name}! รางวัลส่งเข้าจดหมาย (ถ้ายังมีโควตาสัปดาห์นี้)` : `พิชิต${PD.name} แต่มีผู้ทำดาเมจไม่ถึง ${PD.minPlayers} คน — ไม่ได้รางวัล`, 'r-epic');
    g.sfx('mvp', { gap: 0 });
    if (g.mailbox && g.mailbox.refresh) void g.mailbox.refresh();
    this.exitPortal('กลับเมือง');
    this.renderHud(true);
  }

  fail() {
    const g = this.g;
    if (this.over || this.won) return; this.over = true;
    const m = this.boss; if (m && !m.dead && g.mobs) { g.mobs.remove(m); g.gfx.removeActor(m); }
    g.hud.levelBanner('หมดเวลา!', 'ผู้คุมผนึกหลุดพ้น — ลองใหม่สัปดาห์นี้ (รอบที่ล้มเหลวไม่เสียโควตา)');
    g.sfx('refineFail');
    this.exitPortal('กลับเมือง');
    this.renderHud(true);
  }

  exitPortal(label) {
    const g = this.g, A = this.def && this.def.arena; if (!A || !this.active || this.portalOpen) return;
    this.portalOpen = true;
    const p = { x: A.cx - 1, y: A.cy - 1, w: 2, h: 2, label, inside: false, onEnter: () => this.finish() };
    p.rect = [p.x * TILE, p.y * TILE, (p.x + 2) * TILE, (p.y + 2) * TILE]; p.cx = (p.x + 1) * TILE; p.cy = (p.y + 1) * TILE;
    p.inside = g.inRect(g.player, p.rect);
    g.map.portals.push(p); g.gfx.addPortalFx(p.cx / TILE, p.cy / TILE);
  }

  leaveConfirm() {
    const g = this.g; if (!this.run) return;
    if (this.won || this.over) return this.finish();
    g.dialog.show(NPC, `ออกจากวิหารตอนนี้? กลับเข้ามาใหม่ได้ที่บรอมในเมือง (ถ้ารอบยังไม่จบ)`, [
      { label: 'ออกและกลับเมือง', onSelect: () => this.finish() },
      { label: 'อยู่ต่อ', cls: 'ghost', onSelect: () => {} },
    ]);
  }

  finish() { const g = this.g; this.cleanup(); if (g.map && g.map.def.instance) g.warp(START_MAP, null); }
  cleanup() { this.run = null; this.boss = null; this.portalOpen = false; this.queue = 0; this.renderHud(true); }

  // ออกจากแผนที่วิหารด้วยวิธีอื่น (หมดสติ/ใบวาร์ป) → จบฝั่งเรา (กลับเข้าใหม่ได้ที่บรอมถ้ารอบยังไม่จบ)
  onMapLoaded(def) {
    if (this.run && def && def.id !== `pd_${this.run.id}`) { this.g.hud.log(`ออกจาก${PD.name} · กลับเข้าได้ที่บรอมถ้ารอบยังไม่จบ`, 'sys'); this.cleanup(); }
    this.portalOpen = false;
  }

  /* ---------- ทุกเฟรม ---------- */
  update(dt) {
    if (!this.run || !this.active) return;
    const g = this.g;
    this.pollT -= dt;
    if (this.pollT <= 0 && !this.polling) {
      this.pollT = 2; this.polling = true;
      this.rpc('pd_state', { p_run: this.run.id }).then((row) => this.apply(row)).catch(() => {}).finally(() => { this.polling = false; });
    }
    const t = this.t(), m = this.boss;
    if (m && !m.dead && !this.won && !this.over) {
      if (t >= PD.time) this.fail();
      else if (t >= 0) {
        if (t >= PD.enrage && !this.enraged) {
          this.enraged = true; m.attackDelay = (m.data.attackDelay || 1.5) * 0.6; m.stats.atk = m.stats.atk.map((v) => Math.round(v * 1.5));
          g.hud.levelBanner('ผู้คุมผนึกคลั่ง!', 'โจมตีแรงและเร็วขึ้น — รีบปราบให้ได้'); g.gfx.shake(0.4); g.sfx('bossWindup');
        }
        this.mechanics(t);
      }
    }
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.hudT = 0.25; this.renderHud(); }
  }

  /* ---------- กลไกบอส ---------- */
  mechanics(t) {
    const F = this.fired; if (!F) return;
    for (const key of ['rain', 'spread', 'stack']) {
      const c = PD[key]; if (t < c.first) continue;
      const k = Math.floor((t - c.first) / c.every);
      if (k > F[key]) { F[key] = k; this[key](k); }
    }
  }

  // วงอัญเชิญกระจาย 5 วง (ตำแหน่งเดียวกันทุกเครื่อง)
  rain(k) {
    const g = this.g, c = PD.rain, A = this.def.arena, r = pdRng((this.run.seed ^ (k * 7919 + 1)) >>> 0), pts = [];
    for (let i = 0; i < c.count; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (A.R - 2); pts.push({ x: (A.cx + Math.cos(a) * d) * TILE + 8, y: (A.cy + Math.sin(a) * d) * TILE + 8 }); }
    for (const p of pts) g.gfx.telegraph(p.x, p.y, c.radius, c.windup, '#a46bff');
    g.sfx('bossWindup');
    g.schedule(c.windup, () => {
      if (!this.active || this.won || this.over) return;
      const pl = g.player;
      for (const p of pts) {
        g.gfx.bossStrike(p.x, p.y, c.radius, 'icefall');
        if (!pl.dead && Math.hypot(pl.x - p.x, pl.y - p.y) <= c.radius * TILE + 4) this.hurt(c.dmg, 'วงอัญเชิญ');
      }
      g.sfx('iceBlast');
    });
  }

  // ผู้เล่นในรอบ (เรียงชื่อ → ทุกเครื่องเลือกเป้าหมายตรงกัน)
  pick(k, salt) {
    const names = ((this.run && this.run.members) || []).map((x) => x.name).sort();
    if (!names.length) return null;
    const r = pdRng((this.run.seed ^ (k * 104729 + salt)) >>> 0);
    return names[Math.floor(r() * names.length)];
  }
  actorOf(name) {
    const g = this.g;
    if (g.player.name === name) return g.player.dead ? null : g.player;
    for (const rp of (g.remote && g.remote.list && g.remote.list.values()) || []) if (rp.name === name && !rp.dead) return rp;
    return null;
  }
  // ผู้เล่นที่อยู่ในวง (เรา + คนอื่นในแผนที่)
  countNear(x, y, rad) {
    const g = this.g; let n = 0;
    if (!g.player.dead && Math.hypot(g.player.x - x, g.player.y - y) <= rad) n++;
    for (const rp of (g.remote && g.remote.list && g.remote.list.values()) || []) if (!rp.dead && Math.hypot(rp.x - x, rp.y - y) <= rad) n++;
    return n;
  }
  follow(actor, rad, dur, color) {
    const g = this.g;
    for (let s = 0; s < dur; s += 0.5) g.schedule(s, () => { if (this.active && !this.won && !this.over) g.gfx.telegraph(actor.x, actor.y, rad, 0.55, color); });
  }

  // ตราแยก: คนโดนตราต้องเดินออกห่างเพื่อน
  spread(k) {
    const g = this.g, c = PD.spread, name = this.pick(k, 7), actor = name && this.actorOf(name); if (!actor) return;
    const me = actor === g.player;
    g.hud.log(me ? '⚠ คุณโดน "ตราแยก"! เดินออกห่างเพื่อนภายใน 4 วินาที' : `⚠ ${name} โดน "ตราแยก" — อยู่ห่างจากเขา!`, 'r-epic');
    if (me) g.hud.levelBanner('ตราแยก!', 'เดินออกห่างเพื่อน');
    g.gfx.emote(actor, '☾');
    this.follow(actor, c.radius, c.windup, '#c04bff');
    g.schedule(c.windup, () => {
      if (!this.active || this.won || this.over) return;
      const pl = g.player; g.gfx.bossStrike(actor.x, actor.y, c.radius, 'ice'); g.sfx('explosion');
      if (pl.dead) return;
      if (me) this.hurt(c.dmgSelf, 'ตราแยก');
      else if (Math.hypot(pl.x - actor.x, pl.y - actor.y) <= c.radius * TILE) this.hurt(c.dmgOthers, 'ตราแยก');
    });
  }

  // ตราแบ่งรับ: ทุกคนเข้าไปยืนรวม ดาเมจหารตามจำนวนคนในวง
  stack(k) {
    const g = this.g, c = PD.stack, name = this.pick(k, 13), actor = name && this.actorOf(name); if (!actor) return;
    const me = actor === g.player;
    g.hud.log(me ? '⚠ คุณโดน "ตราแบ่งรับ"! ให้เพื่อนเข้ามายืนรวมกับคุณ' : `⚠ ${name} โดน "ตราแบ่งรับ" — ทุกคนเข้าไปยืนรวม!`, 'r-epic');
    g.hud.levelBanner('ตราแบ่งรับ!', me ? 'เรียกเพื่อนมายืนรวม' : `ไปยืนรวมกับ ${name}`); g.gfx.emote(actor, '☀');
    this.follow(actor, c.radius, c.windup, '#ffc94a');
    g.schedule(c.windup, () => {
      if (!this.active || this.won || this.over) return;
      const pl = g.player, rad = c.radius * TILE; g.gfx.bossStrike(actor.x, actor.y, c.radius, 'fire'); g.sfx('explosion');
      if (pl.dead || Math.hypot(pl.x - actor.x, pl.y - actor.y) > rad) return;
      const n = Math.max(1, this.countNear(actor.x, actor.y, rad));
      this.hurt(Math.max(c.min, c.total / n), `ตราแบ่งรับ (${n} คน)`);
    });
  }

  hurt(frac, what) {
    const g = this.g, pl = g.player; if (pl.dead) return;
    const amount = Math.max(1, Math.round(pl.maxHp * frac));
    g.damagePlayer(amount, this.boss || null, true);
    g.gfx.shake(0.2);
    void what;
  }

  /* ---------- แถบสถานะ ---------- */
  renderHud(force) {
    const g = this.g, R = this.run;
    if (!R || !this.active) { if (this.hudEl) this.hudEl.hidden = true; return; }
    if (!this.hudEl) {
      const el = this.hudEl = document.createElement('div');
      el.className = 'panel dg-hud pd-hud'; el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<b class="dg-t"></b><span class="dg-o"></span><span class="dg-m"></span><div class="dg-hp"><i></i></div><ol class="pd-dmg"></ol><button type="button" class="ghost dg-x" title="ออกจากวิหาร">ออก</button>';
      el.querySelector('.dg-x').addEventListener('click', () => this.leaveConfirm());
      for (const ev of ['pointerdown', 'touchstart', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      g.root.append(el);
    }
    const el = this.hudEl, t = this.t(), m = this.boss; el.hidden = false;
    const hpPct = m && !m.dead ? Math.max(0, m.hp / m.maxHp * 100) : this.won ? 0 : 100;
    el.querySelector('.dg-hp i').style.width = hpPct.toFixed(1) + '%';
    const o = this.won ? '🏆 ผนึกสำเร็จ! เข้าประตูแสงกลางลานเพื่อกลับเมือง' : this.over ? '⌛ หมดเวลา — เข้าประตูแสงเพื่อกลับเมือง'
      : t < 0 ? `บอสตื่นใน ${Math.ceil(-t)} วินาที · รอเพื่อนเข้าวิหาร` : `⚔ ${m ? m.name : 'ผู้คุมผนึก'} (${Math.ceil(hpPct)}%)${this.enraged ? ' · คลั่ง!' : ''}`;
    const mm = `⏱ ${fmtT(Math.max(0, PD.time - Math.max(0, t)))} · ${(R.members || []).length} คน`;
    const list = (R.members || []).slice().sort((a, b) => +b.dmg - +a.dmg).map((x) => `<li><span>${String(x.name).replace(/[&<>"]/g, '')}</span><b>${fmt(x.dmg)}</b></li>`).join('');
    const key = o + mm + list;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    el.querySelector('.dg-t').textContent = PD.name;
    el.querySelector('.dg-o').textContent = o; el.querySelector('.dg-m').textContent = mm;
    el.querySelector('.pd-dmg').innerHTML = list;
  }
}
void MONSTERS;
