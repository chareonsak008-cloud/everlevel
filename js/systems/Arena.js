// v0.78 สนามประลอง (อารีน่า PvP) 1v1 · 3v3 — สู้สดกับผู้เล่นจริง
// · คิวจับคู่อยู่ที่เซิร์ฟเวอร์ (แต้มอันดับใกล้กัน) · เจอคู่แล้วทุกคนวาร์ปเข้าแผนที่เดียวกัน (ar_<id>) เห็นกันผ่านห้องแผนที่
// · ศัตรูแต่ละคนมี "ร่างเป้า" (proxy) อยู่ในรายการมอนของเรา → ระบบตี/สกิล/เลือกเป้าเดิมใช้ได้ทันที
//   ดาเมจที่ทำใส่ร่างเป้าถูกส่งไปหักเลือดจริงที่เซิร์ฟเวอร์ (arena_hit) · เลือดของเราก็อ่านจากเซิร์ฟเวอร์ (โดนตีจริงตามที่เซิร์ฟเวอร์บอก)
// · การฟื้นเลือดในเครื่อง (สกิลรักษา/ดูดเลือด/ฟื้นตามเวลา/เพื่อนฮีล) ส่งไปให้เซิร์ฟเวอร์ตัดสิน (จำกัดต่อวินาที)
// · ในสนามทุกคนถูกปรับเป็น Lv.150 (Player.arenaSync) · ห้ามใช้ไอเทม/เปลี่ยนอุปกรณ์/ออโต้
import { TILE } from '../config.js?v=0.81.0';
import { ITEMS } from '../data/items.js?v=0.81.0';
import { START_MAP } from '../data/maps/index.js?v=0.81.0';
import { AR, AR_SHOP, arMapDef, tierOf, TEAM_COLOR, TEAM_NAME } from '../data/arena.js?v=0.81.0';

const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ERR = {
  low_level: `ต้องมี Base Lv.${AR.minLv} ขึ้นไป`, in_match: 'คุณยังมีการแข่งที่ยังไม่จบ', bad_mode: 'โหมดไม่ถูกต้อง', no_match: 'ไม่พบการแข่งนี้',
  not_enough: 'แต้มอารีน่าไม่พอ', week_limit: 'แลกครบจำนวนของสัปดาห์นี้แล้ว (รีเซ็ตวันจันทร์)', bad_item: 'ไม่มีของชิ้นนี้ในร้าน', no_character: 'ไม่พบตัวละคร',
};
export const arenaErr = (e) => { const m = String((e && (e.code || e.message)) || ''); for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k]; return m || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'; };
const NPC = { name: AR.name, title: 'อารีน่า PvP' };

export class Arena {
  constructor(game) {
    this.g = game; this.off = false;
    this.q = null;          // คิวที่กำลังรอ { mode, since, waiting, rating }
    this.M = null;          // แถวการแข่งล่าสุดจากเซิร์ฟเวอร์
    this.me = null;         // arena_me
    this.proxies = new Map();   // ชื่อศัตรู → ร่างเป้า
    this.hq = new Map();        // ชื่อศัตรู → ดาเมจที่รอส่ง
    this.healQ = 0; this.skew = 0; this.pollT = 0; this.sending = false; this.healing = false; this.polling = false;
    this.down = false; this.ended = false; this.hudEl = null; this.chipEl = null; this.srvHp = null; this.lastHp = null;
  }

  get on() { return !this.off && this.g.mode === 'online' && !!(this.g.online && this.g.online.arenaRPC); }
  get inMatch() { return !!this.M && !!this.g.map && this.g.map.def.id === `ar_${this.M.id}`; }
  get live() { return this.inMatch && !this.ended && this.M.status === 'active' && this.t() >= 0; }
  rpc(name, args) { return this.g.online.arenaRPC(name, args); }
  now() { return Date.now() + this.skew; }
  t() { return this.M ? (this.now() - Date.parse(this.M.starts_at)) / 1000 : 0; }
  mine() { return this.M ? (this.M.players || []).find((p) => p.me) : null; }
  changed() { if (this.g.arenaWin) this.g.arenaWin.render(); this.renderChip(); }

  blockReason(mode) {
    const g = this.g, pl = g.player, s = g.social;
    if (!this.on) return this.off ? 'เซิร์ฟเวอร์ยังไม่เปิดระบบนี้ (ผู้ดูแลต้องรัน supabase/arena_v0.78.sql)' : 'ต้องเล่นแบบออนไลน์';
    if (pl.baseLevel < AR.minLv) return `ต้องมี Base Lv.${AR.minLv} ขึ้นไป`;
    if (this.inMatch) return 'กำลังแข่งอยู่';
    if (g.dungeon && g.dungeon.active) return 'ออกจากดันเจี้ยนก่อน';
    if (g.pd && g.pd.active) return 'ออกจากดันเจี้ยนปาร์ตี้ก่อน';
    if (g.map && g.map.def.instance) return 'ออกจากดันเจี้ยนก่อน';
    if (mode === '3v3' && s && s.pid && s.memberList().length > 3) return 'ปาร์ตี้ลง 3v3 ได้ไม่เกิน 3 คน';
    return '';
  }

  /* ---------- ข้อมูลของฉัน ---------- */
  async refreshMe() {
    if (!this.on) return null;
    try {
      this.me = await this.rpc('arena_me');
      const sk = Date.parse(this.me.now) - Date.now(); if (Number.isFinite(sk)) this.skew = sk;
    } catch (e) { if (e.missing) this.off = true; this.err = arenaErr(e); }
    this.changed();
    return this.me;
  }

  /* ---------- คิว ---------- */
  async queue(mode) {
    const g = this.g, why = this.blockReason(mode);
    if (why) { g.hud.log(why, 'sys'); return; }
    const s = g.social, grp = mode === '3v3' && s && s.pid ? s.pid : null;
    let r;
    try { r = await this.rpc('arena_queue_join', { p_mode: mode, p_grp: grp }); } catch (e) { if (e.missing) this.off = true; g.hud.log(`เข้าคิวไม่ได้: ${arenaErr(e)}`, 'sys'); this.changed(); return; }
    this.q = { mode, since: Date.now(), waiting: 1, rating: r && r.rating };
    g.hud.log(`⚔ เข้าคิว${AR.modes[mode].name}แล้ว — กำลังหาคู่ต่อสู้…`, 'r-epic');
    g.sfx('questDone');
    if (grp && s.party) s.party.send('arq', { mode, n: g.player.name });
    this.pollT = 2;
    this.applyQ(r);
  }

  // เพื่อนในปาร์ตี้ลงคิว 3v3 → ชวนลงด้วย (อยู่ทีมเดียวกัน)
  onPartyQueue(p, who) {
    const g = this.g;
    if (p.mode !== '3v3' || !g.started || this.inMatch || (this.q && this.q.mode === '3v3')) return;
    if (this.blockReason('3v3')) return;
    g.hud.log(`⚔ ${who} ลงคิวอารีน่า 3v3 — ลงคิวพร้อมกันจะได้อยู่ทีมเดียวกัน`, 'party');
    g.dialog.show({ name: AR.name, title: `คำชวนจาก ${who}` }, `${who} ลงคิวอารีน่า 3v3\nลงคิวด้วยไหม? (ปาร์ตี้ที่ลงพร้อมกันจะถูกจับอยู่ทีมเดียวกัน)`, [
      { label: 'ลงคิวด้วย', onSelect: () => this.queue('3v3') },
      { label: 'ไม่ลง', cls: 'ghost', onSelect: () => {} },
    ]);
  }

  async leaveQueue() {
    const g = this.g; if (!this.q) return;
    this.q = null; this.changed();
    try { await this.rpc('arena_queue_leave'); } catch (e) { /* หมดอายุเองใน 15 วินาที */ }
    g.hud.log('ออกจากคิวอารีน่าแล้ว', 'info');
  }

  applyQ(r) {
    if (!r) return;
    const sk = Date.parse(r.now) - Date.now(); if (Number.isFinite(sk)) this.skew = this.skew * 0.5 + sk * 0.5;
    if (r.match) { this.q = null; void this.found(r.match); }
    else if (!r.queued) this.q = null;
    else if (this.q) Object.assign(this.q, { waiting: +r.waiting || 1, rating: r.rating, since: Date.parse(r.since) - this.skew || this.q.since });
    this.changed();
  }

  async found(id) {
    const g = this.g;
    g.sfx('mvp', { gap: 0 });
    g.hud.levelBanner('พบคู่ต่อสู้!', 'กำลังเข้าสนามประลอง…');
    let row;
    try { row = await this.rpc('arena_state', { p_match: id }); } catch (e) { g.hud.log(`เข้าสนามไม่ได้: ${arenaErr(e)}`, 'sys'); return; }
    this.enter(row);
  }

  // กลับเข้าการแข่งที่ยังไม่จบ (เช่น รีเฟรชหน้า)
  async rejoin(id) {
    const g = this.g;
    try { const row = await this.rpc('arena_state', { p_match: id }); if (row.status === 'active') this.enter(row); else g.hud.log('การแข่งนี้จบไปแล้ว', 'sys'); }
    catch (e) { g.hud.log(`เข้าสนามไม่ได้: ${arenaErr(e)}`, 'sys'); }
  }

  /* ---------- เข้าสนาม ---------- */
  enter(row) {
    const g = this.g;
    if (!row || !row.id) return;
    g.closeServices();
    if (g.arenaWin) g.arenaWin.toggle(false);
    if (g.auto && g.auto.on) g.auto.stop('เข้าสนามประลอง', { silent: true });
    this.clearProxies();
    this.M = null; this.apply(row, true, true);
    const me = this.mine(); if (!me) return;
    this.team = me.team;
    const mates = (row.players || []).filter((p) => p.team === me.team).map((p) => p.name).sort();
    const def = arMapDef(row.id, row.mode, me.team, Math.max(0, mates.indexOf(me.name)));
    this.def = def; this.ended = false; this.down = false; this.srvHp = null; this.lastHp = null; this.healQ = 0; this.hq.clear(); this.result = null;
    g.warp(def, null, () => this.onEnter());
  }

  async onEnter() {
    const g = this.g, pl = g.player; if (!this.M) return;
    pl.arenaSync = true; pl.recalc();
    pl.dead = false; pl.hp = pl.maxHp; pl.sp = pl.maxSp; pl.target = null;
    g.hud.setPlayer(pl); g.status && g.status.render && g.status.render();
    const m = AR.modes[this.M.mode];
    g.hud.levelBanner(`${m.icon} ${m.name}`, `${TEAM_NAME[this.team]} · เริ่มใน ${Math.max(0, Math.ceil(-this.t()))} วินาที · ทุกคนถูกปรับเป็น Lv.${AR.syncLv}`);
    g.hud.log(`⚔ เข้าสนามประลอง (${m.name}) · ${TEAM_NAME[this.team]} · แตะศัตรูเพื่อเลือกเป้า · ในสนามใช้ไอเทม/เปลี่ยนอุปกรณ์/ออโต้ไม่ได้`, 'r-epic');
    try {
      const row = await this.rpc('arena_ready', { p_match: this.M.id, p_stats: { hp: pl.maxHp, def: pl.stats.def, mdef: pl.stats.mdef, flee: pl.stats.flee } });
      this.apply(row);
    } catch (e) { g.hud.log(`ส่งข้อมูลเข้าสนามไม่สำเร็จ: ${arenaErr(e)}`, 'sys'); }
    this.renderHud(true);
  }

  // ปรับสถานะจากเซิร์ฟเวอร์
  apply(row, first = false, noSync = false) {
    if (!row || !row.id || (this.M && this.M.id !== row.id)) return;
    const sk = Date.parse(row.now) - Date.now();
    if (Number.isFinite(sk)) this.skew = first || !this.M ? sk : this.skew * 0.7 + sk * 0.3;
    this.M = row;
    if (noSync || !this.inMatch) return;
    this.syncSelf(this.mine());
    this.syncProxies();
    if (row.status === 'done') this.end(row);
  }

  /* ---------- เลือดของเรา (เซิร์ฟเวอร์เป็นคนถือ) ---------- */
  hpK(P) { const pl = this.g.player; return P && P.max > 0 && pl.maxHp > 0 ? P.max / pl.maxHp : AR.hpMul; }
  syncSelf(P) {
    const g = this.g, pl = g.player;
    if (!P || !P.ready || this.ended) return;
    const k = this.hpK(P);
    if (this.srvHp != null && P.hp < this.srvHp) {
      const lost = Math.max(1, Math.round((this.srvHp - P.hp) / k));
      g.gfx.floatText(pl, `${lost}`, lost > pl.maxHp * 0.15 ? 'taken big' : 'taken');
      g.gfx.playHurt(pl); g.hud.flashHurt(); g.sfx('hurt');
      pl.lastHitAt = g.time;
      if (pl.cast && pl.cast.item) pl.cast = null;
    }
    this.srvHp = P.hp;
    pl.hp = Math.max(P.alive ? 1 : 0, Math.min(pl.maxHp, Math.round(P.hp / k)));
    this.lastHp = pl.hp;
    g.hud.setPlayer(pl);
    if (!P.alive && !this.down) this.knockedOut();
  }

  knockedOut() {
    const g = this.g, pl = g.player;
    this.down = true;
    g.closeServices();
    pl.cast = null; pl.pendingSkill = null; pl.lockUntil = 0; pl.path = []; pl.moving = false;
    pl.dead = true; pl.hp = 0;
    g.clearTarget();
    g.reviveAt = 0;
    g.sfx('refineFail');
    g.hud.setPlayer(pl);
    if (!this.ended) { g.hud.levelBanner('คุณถูกล้ม!', this.M.mode === '3v3' ? 'ดูเพื่อนร่วมทีมสู้ต่อ…' : 'รอผลการแข่ง…'); g.hud.log('💀 คุณถูกล้มในสนามประลอง (ไม่เสีย EXP)', 'sys'); }
  }

  /* ---------- ร่างเป้าของศัตรู ---------- */
  remoteOf(name) { for (const r of (this.g.remote && this.g.remote.list && this.g.remote.list.values()) || []) if (r.name === name) return r; return null; }
  proxyFor(remote) { const m = remote && this.proxies.get(remote.name); return m && !m.dead ? m : null; }
  isEnemy(remote) { return !!(remote && this.proxies.has(remote.name)); }

  makeProxy(P) {
    const p = {
      isMonster: true, arenaProxy: true, summoned: true, noCard: true, noBook: true,
      type: 'arena_pc', name: P.name, level: AR.syncLv, x: -9999, y: -9999, hp: P.hp, maxHp: P.max, dead: !P.alive,
      stats: { atk: [1, 1], def: 0, mdef: 0, hit: 0, flee: 0, crit: 0 },
      data: { name: P.name, level: AR.syncLv, height: 1.7, radius: 0.45, mvp: false, aggroRange: 0, attackRange: 0, attackDelay: 99, respawn: [999, 999], drops: [] },
      target: null, state: 'idle', path: [], moving: false, attackCd: 99, home: { x: 0, y: 0 }, respawnAt: Infinity, frozenUntil: 0, stunUntil: 0, slowUntil: 0, pulledUntil: 0,
      face() {}, reset() {}, moveBy() { return false; }, box() { return [this.x - 6, this.y - 6, this.x + 6, this.y + 6]; },
    };
    return p;
  }

  syncProxies() {
    const g = this.g, me = this.mine(); if (!me || !g.mobs) return;
    for (const P of this.M.players || []) {
      if (P.team === me.team) continue;
      let m = this.proxies.get(P.name);
      if (!m) { m = this.makeProxy(P); this.proxies.set(P.name, m); g.mobs.list.push(m); }
      m.maxHp = Math.max(1, +P.max || 1);
      const pend = this.hq.get(P.name) || 0;
      m.hp = Math.max(P.alive ? 1 : 0, Math.min(+P.hp, pend ? m.hp : +P.hp));
      const st = P.st || {};
      m.stats.def = +st.def || 0; m.stats.mdef = +st.mdef || 0; m.stats.flee = +st.flee || 0;
      m.gone = !P.alive || !P.ready;
      if (!P.alive && !m.dead) { m.dead = true; m.hp = 0; if (g.player.target === m) g.clearTarget(); const r = this.remoteOf(P.name); if (r) { g.gfx.emote(r, '💀'); g.hud.log(`💀 ${P.name} ถูกล้ม!`, 'r-epic'); } }
    }
  }

  clearProxies() {
    const g = this.g;
    for (const m of this.proxies.values()) { if (g.player.target === m) g.clearTarget(); if (g.mobs) g.mobs.remove(m); }
    this.proxies.clear(); this.hq.clear();
  }

  // ตามตำแหน่งตัวละครจริงของศัตรู (ไม่เห็นตัว = เลือกเป้าไม่ได้)
  followProxies() {
    const g = this.g;
    for (const [name, m] of this.proxies) {
      if (m.gone && m.dead) continue;
      const r = this.remoteOf(name);
      if (r && !m.gone) { m.x = r.x; m.y = r.y; m.dead = false; }
      else { m.dead = true; if (g.player.target === m) g.clearTarget(); }
    }
  }

  /* ---------- ดาเมจ ---------- */
  scale(amount) { return Math.max(1, Math.round(amount * AR.dmgMul)); }
  hit(m, amount) {
    if (!this.live || this.down || !m.arenaProxy) return;
    this.hq.set(m.name, (this.hq.get(m.name) || 0) + amount);
    if (!this.sending) void this.flush();
  }

  async flush() {
    this.sending = true;
    try {
      while (this.hq.size && this.live && !this.down) {
        const [name, amt] = [...this.hq.entries()].sort((a, b) => b[1] - a[1])[0];
        const m = this.proxies.get(name), cap = Math.max(1, Math.floor(((m && m.maxHp) || 1) / 10)), send = Math.min(amt, cap);
        if (amt - send > 0) this.hq.set(name, amt - send); else this.hq.delete(name);
        try {
          const row = await this.rpc('arena_hit', { p_match: this.M.id, p_target: name, p_damage: send });
          if (row && +row.damage === 0 && row.status === 'active') {   // โดนจำกัดความถี่/เป้าตายแล้ว
            const P = (row.players || []).find((p) => p.name === name);
            if (P && P.alive) this.hq.set(name, Math.min((this.hq.get(name) || 0) + send, cap * 3));
          }
          this.apply(row);
        } catch (e) { if (e.missing) this.off = true; break; }
        await new Promise((r) => setTimeout(r, 210));
      }
    } finally { this.sending = false; }
  }

  async sendHeal() {
    if (this.healing || this.healQ <= 0 || !this.live || this.down) return;
    this.healing = true;
    const amt = Math.round(this.healQ); this.healQ = 0;
    try { const row = await this.rpc('arena_heal', { p_match: this.M.id, p_amount: amt }); this.apply(row); }
    catch (e) { /* ช่างมัน */ }
    finally { setTimeout(() => { this.healing = false; }, 1000); }
  }

  /* ---------- จบการแข่ง ---------- */
  end(row) {
    if (this.ended) return;
    this.ended = true;
    const g = this.g, me = (row.players || []).find((p) => p.me) || {};
    const win = row.winner === me.team, draw = +row.winner === 0;
    this.result = { win, draw, delta: +me.delta || 0, pts: +me.pts || 0 };
    const d = this.result.delta;
    g.hud.levelBanner(draw ? 'เสมอ!' : win ? 'ชนะ!' : 'แพ้…', `แต้มอันดับ ${d >= 0 ? '+' : ''}${d} · แต้มอารีน่า +${this.result.pts}`);
    g.hud.log(`${draw ? '🤝 เสมอ' : win ? '🏆 ชนะ' : '💢 แพ้'} ${AR.modes[row.mode].name} · แต้มอันดับ ${d >= 0 ? '+' : ''}${d} · แต้มอารีน่า +${this.result.pts}`, win ? 'r-epic' : 'sys');
    g.sfx(win ? 'mvp' : draw ? 'questDone' : 'refineFail', { gap: 0 });
    if (g.daily) g.daily.bump('arena');
    if (g.player.target && g.player.target.arenaProxy) g.clearTarget();
    const id = row.id; setTimeout(() => { if (this.ended && this.inMatch && this.M && this.M.id === id) this.finish(); }, 7000);
    this.renderHud(true);
  }

  leaveConfirm() {
    const g = this.g; if (!this.M) return;
    if (this.ended || this.M.status !== 'active') return this.finish();
    g.dialog.show(NPC, 'ยอมแพ้และออกจากสนาม? (นับเป็นแพ้)', [
      { label: 'ยอมแพ้', onSelect: () => this.forfeit() },
      { label: 'สู้ต่อ', cls: 'ghost', onSelect: () => {} },
    ]);
  }

  async forfeit() {
    const id = this.M && this.M.id; if (!id) return;
    try { const row = await this.rpc('arena_forfeit', { p_match: id }); this.apply(row); } catch (e) { /* */ }
    this.finish();
  }

  finish() {
    const g = this.g, inside = this.inMatch;
    this.restore();
    if (inside) g.warp(START_MAP, null, () => { g.player.dead = false; g.player.hp = g.player.maxHp; g.player.sp = g.player.maxSp; g.hud.setPlayer(g.player); });
    void this.refreshMe();
  }

  // คืนค่าตัวละครเดิม (เลิกปรับเลเวล · ลบร่างเป้า)
  restore() {
    const g = this.g, pl = g.player;
    this.clearProxies();
    if (pl.arenaSync) { pl.arenaSync = false; pl.recalc(); }
    if (this.down) { pl.dead = false; pl.hp = pl.maxHp; }
    this.down = false; this.M = null; this.srvHp = null; this.lastHp = null; this.healQ = 0;
    this.renderHud(true);
  }

  // ออกจากแผนที่สนามด้วยวิธีอื่น → ยอมแพ้ (ถ้ายังแข่งอยู่) + คืนค่าตัวละคร
  onMapLoaded(def) {
    if (!this.M || (def && def.id === `ar_${this.M.id}`)) return;
    const id = this.M.id, active = !this.ended && this.M.status === 'active';
    this.restore();
    if (active && this.on) { this.rpc('arena_forfeit', { p_match: id }).catch(() => {}); this.g.hud.log('ออกจากสนามประลอง (นับเป็นแพ้)', 'sys'); }
  }

  /* ---------- ทุกเฟรม ---------- */
  update(dt) {
    const g = this.g;
    if (this.q && this.on) {
      this.pollT -= dt;
      if (this.pollT <= 0 && !this.polling) {
        this.pollT = 2; this.polling = true;
        this.rpc('arena_queue_poll').then((r) => this.applyQ(r)).catch((e) => { if (e.missing) { this.off = true; this.q = null; } }).finally(() => { this.polling = false; });
      }
      this.chipT = (this.chipT || 0) - dt; if (this.chipT <= 0) { this.chipT = 1; this.renderChip(); }
    }
    if (!this.M || !this.inMatch) return;
    const pl = g.player;
    // ฟื้นเลือดในเครื่อง → ส่งให้เซิร์ฟเวอร์
    if (this.lastHp != null && !this.down && !this.ended) {
      if (pl.hp > this.lastHp + 0.5) { const P = this.mine(); this.healQ += (pl.hp - this.lastHp) * this.hpK(P); pl.hp = this.lastHp; }
      else if (pl.hp < this.lastHp) pl.hp = this.lastHp;   // ไม่มีอะไรในเครื่องทำดาเมจเราได้ (เซิร์ฟเวอร์เท่านั้น)
      if (this.healQ > 0) void this.sendHeal();
    }
    if (pl.dead && !this.down && !this.ended) { pl.dead = false; pl.hp = Math.max(1, this.lastHp || 1); g.reviveAt = 0; }
    this.followProxies();
    this.pollT -= dt;
    if (this.pollT <= 0 && !this.polling && !this.ended) {
      this.pollT = this.t() < 0 ? 1.5 : 0.6; this.polling = true;
      this.rpc('arena_state', { p_match: this.M.id }).then((row) => this.apply(row)).catch(() => {}).finally(() => { this.polling = false; });
    }
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) { this.hudT = 0.25; this.renderHud(); }
  }

  /* ---------- แถบสถานะในสนาม ---------- */
  renderHud(force) {
    const g = this.g, R = this.M;
    if (!R || !this.inMatch) { if (this.hudEl) this.hudEl.hidden = true; return; }
    if (!this.hudEl) {
      const el = this.hudEl = document.createElement('div');
      el.className = 'panel dg-hud ar-hud'; el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<b class="dg-t"></b><span class="dg-o"></span><span class="dg-m"></span><div class="ar-teams"></div><button type="button" class="ghost dg-x" title="ออกจากสนาม">ออก</button>';
      el.querySelector('.dg-x').addEventListener('click', () => this.leaveConfirm());
      for (const ev of ['pointerdown', 'touchstart', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      g.root.append(el);
    }
    const el = this.hudEl, t = this.t(), mode = AR.modes[R.mode]; el.hidden = false;
    const r = this.result;
    const o = this.ended ? (r ? (r.draw ? '🤝 เสมอ' : r.win ? '🏆 ชนะ!' : '💢 แพ้') + ` · แต้ม ${r.delta >= 0 ? '+' : ''}${r.delta} · กลับเมืองอัตโนมัติ` : 'จบการแข่ง')
      : t < 0 ? `เริ่มใน ${Math.ceil(-t)} วินาที — เตรียมตัว!` : this.down ? '💀 คุณถูกล้ม — รอผล' : '⚔ ล้มทีมศัตรูให้หมด!';
    const mm = `⏱ ${fmtT(t < 0 ? mode.time : Math.max(0, (Date.parse(R.ends_at) - this.now()) / 1000))} · ${TEAM_NAME[this.team] || ''}`;
    const team = (n) => (R.players || []).filter((p) => p.team === n).map((p) => {
      const pct = p.max > 0 ? Math.max(0, p.hp / p.max * 100) : 0;
      return `<li class="${p.alive ? '' : 'dead'}${p.me ? ' me' : ''}"><span>${esc(p.name)}</span><i style="--w:${pct.toFixed(0)}%;--c:${TEAM_COLOR[n]}"></i></li>`;
    }).join('');
    const tm = `<ol class="ar-t1">${team(1)}</ol><b class="ar-vs">VS</b><ol class="ar-t2">${team(2)}</ol>`;
    const key = o + mm + tm;
    if (!force && key === this.hudKey) return;
    this.hudKey = key;
    el.querySelector('.dg-t').textContent = `${mode.icon} ${AR.name} · ${mode.name}`;
    el.querySelector('.dg-o').textContent = o; el.querySelector('.dg-m').textContent = mm;
    el.querySelector('.ar-teams').innerHTML = tm;
  }

  // ป้ายคิวลอย (ตอนปิดหน้าต่างอารีน่า)
  renderChip() {
    const g = this.g;
    const show = !!this.q && !(g.arenaWin && g.arenaWin.open);
    if (!show) { if (this.chipEl) this.chipEl.hidden = true; return; }
    if (!this.chipEl) {
      const el = this.chipEl = document.createElement('div');
      el.className = 'panel ar-chip';
      el.innerHTML = '<span></span><button type="button" class="ghost">ยกเลิก</button>';
      el.querySelector('button').addEventListener('click', () => this.leaveQueue());
      el.querySelector('span').addEventListener('click', () => g.arenaWin && g.arenaWin.toggle(true));
      for (const ev of ['pointerdown', 'touchstart', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
      g.root.append(el);
    }
    this.chipEl.hidden = false;
    this.chipEl.querySelector('span').textContent = `⚔ หาคู่ ${AR.modes[this.q.mode].name} · ${fmtT((Date.now() - this.q.since) / 1000)} · ในคิว ${this.q.waiting || 1} คน`;
  }

  /* ---------- ร้านแต้ม ---------- */
  async buy(id) {
    const g = this.g, it = AR_SHOP.find((x) => x.id === id);
    if (!it || !this.on) return;
    try {
      this.me = await this.rpc('arena_buy', { p_item: id, p_qty: 1 });
      g.hud.log(`🎖 แลก ${ITEMS[id] ? ITEMS[id].name : id} ×${it.n} (ใช้ ${it.cost} แต้มอารีน่า) · ของส่งเข้าจดหมายแล้ว`, 'r-' + ((ITEMS[id] && ITEMS[id].rarity) || 'common'));
      g.sfx('coin');
      if (g.mailbox && g.mailbox.refresh) void g.mailbox.refresh();
    } catch (e) { g.hud.log(`แลกไม่ได้: ${arenaErr(e)}`, 'sys'); }
    this.changed();
  }
}
export { tierOf };
void TILE;
