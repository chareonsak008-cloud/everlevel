// v0.37 ปาร์ตี้ + กิลด์ (โหมดบัญชี Everlevel / Supabase เท่านั้น)
// ปาร์ตี้ — ใช้ Realtime ล้วน ไม่ต้องมีตาราง:
//   · ห้อง everlevel-party-<pid>: presence = สมาชิก (ชื่อ อาชีพ เลเวล แผนที่ เลือด) · broadcast pc = แชตปาร์ตี้ · xp = แชร์ EXP · kick = เตะ
//   · เชิญผ่านห้องรวม (pi → pr) · หัวหน้า = คนที่เข้าปาร์ตี้ก่อนสุด · สูงสุด 6 คน
//   · แชร์ EXP: คนที่อยู่แมพเดียวกันแบ่ง EXP เท่ากัน + โบนัส 20% ต่อสมาชิกเพิ่ม 1 คน (มอนยังจำลองแยกเครื่อง — แชร์แค่ EXP)
// กิลด์ — ข้อมูลถาวรในฐานข้อมูล (supabase/guild.sql) · ห้อง everlevel-guild-<id> ไว้แชตกิลด์ + ดูว่าใครออนไลน์
import { emblemSvg, parseEmblem } from '../data/guildEmblems.js';

export const PARTY_MAX = 6;
export const PARTY_BONUS = 0.2;
export const GUILD_COST = 50000, GUILD_LV = 20;
const clean = (s, n = 16) => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').slice(0, n);
const num = (v, lo, hi, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const rid = () => Math.random().toString(36).slice(2, 12);

export class Social {
  constructor(game) {
    this.game = game;
    this.pid = null; this.party = null; this.jt = 0;      // ปาร์ตี้: รหัส · ช่อง · เวลาที่เราเข้า
    this.members = new Map();                            // key → สถานะสมาชิกที่ผ่านการกรองแล้ว
    this.guild = null; this.guildCh = null; this.guildOnline = new Map(); this.guildInvites = []; this.guildErr = '';
    this.tags = new Map(); this.tagWant = new Set(); this.tagBusy = false;   // รหัสกิลด์ → { name, emblem }
    this.prompts = []; this.seenXp = new Set(); this.invAt = new Map();
    this.t = 0; this.listeners = new Set();
    this.hooked = false;
  }

  get net() { return this.game.online; }
  get enabled() { const o = this.net; return !!o && this.game.mode === 'online' && o.kind === 'supabase' && !!o.social; }
  get myKey() { return this.net && this.net.key; }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  changed() { for (const fn of this.listeners) try { fn(); } catch (e) { console.warn(e); } }
  log(t, cls = 'party') { this.game.hud.log(t, cls); }

  // เรียกตอนเริ่มเชื่อมต่อออนไลน์ (Game.startNet)
  start() {
    if (!this.enabled) return;
    if (!this.hooked) {
      this.hooked = true;
      this.net.onLobby('pi', (p) => this.onPartyInvite(p));
      this.net.onLobby('pr', (p) => this.onPartyReply(p));
      this.net.onLobby('gi', (p) => this.onGuildInvite(p));
      this.net.onLobby('wh', (p) => this.onWhisper(p));          // v0.38 กระซิบ
      this.net.onLobby('fr', (p) => this.onFriendAdd(p));        // v0.38 มีคนเพิ่มเราเป็นเพื่อน
      this.net.onLobby('wc', (p) => this.onWorld(p), true);      // v0.38 แชตโลก (ทุกแผนที่)
    }
    const saved = this.loadPid();
    if (saved && !this.pid) this.joinParty(saved, true);
    this.guildNext = Date.now() + 90000;
    this.refreshGuild();
  }

  storeKey() { const o = this.net; return `everlevel-party-${(o.uid || '').slice(0, 8)}-${o.slot || 0}`; }
  loadPid() { try { const v = JSON.parse(localStorage.getItem(this.storeKey()) || 'null'); return v && Date.now() - v.t < 30 * 60000 && /^[a-z0-9]{6,12}$/.test(v.pid) ? v.pid : null; } catch (e) { return null; } }
  savePid() { try { if (this.pid) localStorage.setItem(this.storeKey(), JSON.stringify({ pid: this.pid, t: Date.now() })); else localStorage.removeItem(this.storeKey()); } catch (e) { /* */ } }

  /* ======================= v0.38 แชตโลก · กระซิบ · เพื่อน ======================= */
  needOnline() { if (this.enabled) return true; this.log('ใช้ได้เฉพาะตอนเล่นออนไลน์ด้วยบัญชี Everlevel', 'sys'); return false; }

  sendWorld(text) {
    if (!this.needOnline()) return false;
    const now = Date.now();
    if (now - (this.worldAt || 0) < 4000) { this.log('แชตโลกส่งได้ทุก 4 วินาที', 'sys'); return false; }
    this.worldAt = now;
    const pl = this.game.player;
    this.net.lobbySend('wc', { n: pl.name, m: text, t: now }).then((r) => { if (r !== 'ok') this.log('ส่งแชตโลกไม่สำเร็จ ลองใหม่อีกครั้ง', 'sys'); });
    this.game.hud.log(`[โลก] ${pl.name} : ${text}`, 'world me');
    return true;
  }
  onWorld(p) {
    const text = clean(p.m, 120), who = clean(p.n);
    if (!text || !Number.isFinite(p.t) || this.dupMsg('wc' + p.k + p.t) || this.isBlocked(who)) return;
    this.game.hud.log(`[โลก] ${who} : ${text}`, 'world');
  }

  whisper(name, text) {
    if (!this.needOnline()) return false;
    name = clean(name).trim();
    if (!name) { this.log('ใส่ชื่อผู้เล่นที่จะกระซิบก่อน', 'sys'); return false; }
    if (name === this.game.player.name) { this.log('กระซิบหาตัวเองไม่ได้', 'sys'); return false; }
    const key = this.net.keyByName(name);
    if (!key) { this.log(`${name} ไม่ได้ออนไลน์อยู่ (หรือพิมพ์ชื่อผิด)`, 'sys'); return false; }
    const pl = this.game.player, t = Date.now();
    this.net.lobbySend('wh', { to: key, n: pl.name, m: text, t }).then((r) => { if (r !== 'ok') this.log('ส่งข้อความกระซิบไม่สำเร็จ ลองใหม่อีกครั้ง', 'sys'); });
    this.game.hud.log(`[กระซิบถึง ${name}] ${text}`, 'whisper me');
    this.whisperTo = name; this.changed();
    return true;
  }
  onWhisper(p) {
    const g = this.game, text = clean(p.m, 120), who = clean(p.n);
    if (!text || !who || !Number.isFinite(p.t) || this.dupMsg('wh' + p.k + p.t) || this.isBlocked(who)) return;
    g.hud.log(`[กระซิบจาก ${who}] ${text}`, 'whisper');
    g.sfx('chat');
    this.replyTo = who;
    if (!this.whisperTo) this.whisperTo = who;
    this.changed();
  }

  get friends() { return this.game.player.friends || (this.game.player.friends = []); }
  isFriend(name) { const n = String(name || '').toLowerCase(); return this.friends.some((f) => f.toLowerCase() === n); }
  isBlocked() { return false; }
  addFriend(name, notify = true) {
    name = clean(name).trim();
    if (!name || name === this.game.player.name) return;
    if (this.isFriend(name)) { this.log(`${name} เป็นเพื่อนอยู่แล้ว`, 'sys'); return; }
    if (this.friends.length >= 100) { this.log('รายชื่อเพื่อนเต็มแล้ว (100 คน)', 'sys'); return; }
    this.friends.push(name);
    this.game.dirty = true;
    this.log(`เพิ่ม ${name} เป็นเพื่อนแล้ว · ดูว่าเพื่อนออนไลน์ไหมได้ที่แท็บ "เพื่อน" (👥)`, 'net');
    const key = notify && this.enabled ? this.net.keyByName(name) : null;
    if (key) this.net.lobbySend('fr', { to: key, n: this.game.player.name });
    this.changed();
  }
  removeFriend(name) {
    const n = String(name).toLowerCase();
    const before = this.friends.length;
    this.game.player.friends = this.friends.filter((f) => f.toLowerCase() !== n);
    if (before !== this.friends.length) { this.game.dirty = true; this.log(`ลบ ${name} ออกจากรายชื่อเพื่อนแล้ว`, 'sys'); }
    this.changed();
  }
  onFriendAdd(p) {
    const who = clean(p.n);
    if (!who) return;
    if (this.isFriend(who)) { this.log(`${who} เพิ่มคุณเป็นเพื่อนแล้ว 🤝`, 'net'); return; }
    this.prompt({ id: 'f' + who, kind: 'friend', text: `${who} เพิ่มคุณเป็นเพื่อน — เพิ่มกลับไหม?`, yes: () => this.addFriend(who, false), no: () => {} });
  }
  // สถานะเพื่อน: ออนไลน์อยู่ไหม แผนที่ไหน (จากห้องรวม)
  friendList() {
    const peers = this.enabled ? this.net.peers() : [];
    return this.friends.map((name) => {
      const n = name.toLowerCase();
      const p = peers.find((q) => !q.isMe && q.presence && typeof q.presence.n === 'string' && q.presence.n.toLowerCase() === n);
      return { name, online: !!p, key: p ? p.peer : null, m: p ? p.presence.m : '', lv: p ? p.presence.lv : 0, j: p ? p.presence.j : '' };
    }).sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
  }

  /* ======================= ปาร์ตี้ ======================= */
  get inParty() { return !!this.pid; }
  get leaderKey() {
    let best = null, bt = Infinity;
    for (const [k, m] of this.members) if (m.jt < bt || (m.jt === bt && k < best)) { bt = m.jt; best = k; }
    return best || this.myKey;
  }
  get isLeader() { return this.leaderKey === this.myKey; }
  memberList() {
    const out = [...this.members.entries()].map(([k, m]) => ({ key: k, ...m, me: k === this.myKey, leader: k === this.leaderKey }));
    if (this.pid && !this.members.has(this.myKey)) out.push({ key: this.myKey, ...this.myState(), me: true, leader: this.members.size === 0 });
    return out.sort((a, b) => a.jt - b.jt);
  }

  myState() {
    const g = this.game, pl = g.player;
    return { n: pl.name, j: pl.jobId, lv: pl.baseLevel, m: g.map ? g.map.id : '', h: Math.round((pl.hp / pl.maxHp) * 20) / 20, d: !!pl.dead, jt: this.jt, u: (this.net.uid || '').slice(0, 8) };
  }

  createParty() {
    if (!this.enabled) { this.log('ปาร์ตี้ใช้ได้เฉพาะตอนเล่นออนไลน์ด้วยบัญชี Everlevel', 'sys'); return false; }
    if (this.pid) return true;
    this.joinParty(rid());
    this.log('สร้างปาร์ตี้แล้ว — เชิญเพื่อนได้จากหน้าต่างผู้เล่นออนไลน์ (👥) · พิมพ์ /p ข้อความ เพื่อคุยในปาร์ตี้');
    return true;
  }

  joinParty(pid, rejoin = false) {
    if (this.party) this.party.close();
    this.pid = pid; this.jt = rejoin ? (this.jt || Date.now()) : Date.now();
    this.members = new Map();
    this.party = this.net.sideChannel('party-' + pid, {
      events: ['pc', 'xp', 'kick', 'bye'],
      onEvent: (ev, p) => this.onPartyEvent(ev, p),
      onSync: (m) => this.onPartySync(m),
    });
    this.party.track(this.myState());
    this.savePid();
    this.changed();
  }

  leaveParty(silent = false) {
    if (!this.pid) return;
    if (this.party) { this.party.send('bye', {}); const ch = this.party; setTimeout(() => ch.close(), 150); }
    this.party = null; this.pid = null; this.members = new Map();
    this.savePid();
    if (!silent) this.log('ออกจากปาร์ตี้แล้ว');
    this.syncTags(); this.changed();
  }

  kick(key) {
    if (!this.isLeader || key === this.myKey || !this.members.has(key)) return;
    const m = this.members.get(key);
    this.party.send('kick', { to: key });
    this.log(`เชิญ ${m.n} ออกจากปาร์ตี้แล้ว`);
  }

  onPartySync(raw) {
    const before = new Set(this.members.keys());
    const next = new Map();
    for (const [k, s] of raw) {
      if (!s || typeof s !== 'object') continue;
      next.set(k, { n: clean(s.n) || 'นักผจญภัย', j: clean(s.j, 16), lv: num(Math.floor(s.lv), 1, 99, 1), m: clean(s.m, 40), h: num(s.h, 0, 1, 1), d: !!s.d, jt: num(s.jt, 0, 9e15, Date.now()), u: clean(s.u, 8) });
    }
    // เกิน 6 คน: คนที่เข้ามาทีหลังสุดออกเอง
    if (next.size > PARTY_MAX && next.has(this.myKey)) {
      const order = [...next.entries()].sort((a, b) => a[1].jt - b[1].jt);
      if (order.findIndex(([k]) => k === this.myKey) >= PARTY_MAX) { this.log('ปาร์ตี้เต็มแล้ว (6 คน)', 'sys'); this.leaveParty(true); return; }
    }
    this.members = next;
    if (this.game.started) {
      for (const [k, m] of next) if (!before.has(k) && k !== this.myKey && before.size) this.log(`${m.n} เข้าร่วมปาร์ตี้`);
      for (const k of before) if (!next.has(k) && k !== this.myKey && this.lastNames && this.lastNames.get(k)) this.log(`${this.lastNames.get(k)} ออกจากปาร์ตี้`);
    }
    this.lastNames = new Map([...next].map(([k, m]) => [k, m.n]));
    this.syncTags(); this.changed();
  }

  onPartyEvent(ev, p) {
    const g = this.game;
    if (ev === 'pc') {
      const text = clean(p.m, 120), who = clean(p.n) || (this.members.get(p.k) || {}).n || '';
      if (!text || !Number.isFinite(p.t) || this.dupMsg('pc' + p.k + p.t)) return;
      g.hud.log(`[ปาร์ตี้] ${who} : ${text}`, 'party');
      if (g.settings.chatSound) g.sfx('chat');
      g.remote.say(p.k, text);
    } else if (ev === 'xp') this.onShareExp(p);
    else if (ev === 'kick') { if (p.to === this.myKey && p.k === this.leaderKey) { this.leaveParty(true); this.log('คุณถูกเชิญออกจากปาร์ตี้', 'sys'); } }
    else if (ev === 'bye') { /* presence sync จะลบให้เอง */ }
  }

  dupMsg(id) { if (this.seenXp.has(id)) return true; this.seenXp.add(id); if (this.seenXp.size > 300) this.seenXp.delete(this.seenXp.values().next().value); return false; }

  sendPartyChat(text) {
    if (!this.pid || !this.party) { this.log('ยังไม่ได้อยู่ในปาร์ตี้ — เชิญเพื่อนจากหน้าต่างผู้เล่นออนไลน์ (👥)', 'sys'); return false; }
    const pl = this.game.player, t = Date.now();
    this.party.send('pc', { n: pl.name, m: text, t });
    this.game.hud.log(`[ปาร์ตี้] ${pl.name} : ${text}`, 'party me');
    if (this.members.size <= 1) this.log('ยังไม่มีสมาชิกคนอื่นในปาร์ตี้', 'sys');
    return true;
  }

  // เชิญ (key = รหัสผู้เล่นในห้องออนไลน์)
  invite(key, name) {
    if (!this.enabled) return;
    if (key === this.myKey) return;
    if (this.pid && this.members.size >= PARTY_MAX) { this.log('ปาร์ตี้เต็มแล้ว (6 คน)', 'sys'); return; }
    if (this.pid && [...this.members.keys()].includes(key)) { this.log(`${name} อยู่ในปาร์ตี้แล้ว`, 'sys'); return; }
    const last = this.invAt.get(key) || 0;
    if (Date.now() - last < 8000) { this.log('เพิ่งเชิญไป รอคำตอบสักครู่', 'sys'); return; }
    this.invAt.set(key, Date.now());
    if (!this.pid) this.joinParty(rid());
    this.net.lobbySend('pi', { to: key, n: this.game.player.name, pid: this.pid }).then((r) => { if (r !== 'ok') this.log('ส่งคำเชิญไม่สำเร็จ ลองใหม่อีกครั้ง', 'sys'); });
    this.log(`ส่งคำเชิญเข้าปาร์ตี้ให้ ${name} แล้ว`);
  }

  onPartyInvite(p) {
    const from = clean(p.n) || 'ผู้เล่น', pid = String(p.pid || '');
    if (!/^[a-z0-9]{6,12}$/.test(pid)) return;
    if (this.pid === pid) return;
    if (this.game.settings.partyInvites === false) { this.net.lobbySend('pr', { to: p.k, ok: 0, why: 'off', n: this.game.player.name }); return; }
    this.prompt({
      id: 'p' + pid, kind: 'party', text: `${from} ชวนคุณเข้าปาร์ตี้${this.pid ? ' (จะออกจากปาร์ตี้ปัจจุบัน)' : ''}`,
      yes: () => { this.leaveParty(true); this.joinParty(pid); this.net.lobbySend('pr', { to: p.k, ok: 1, n: this.game.player.name }); this.log(`เข้าร่วมปาร์ตี้ของ ${from} แล้ว · พิมพ์ /p ข้อความ เพื่อคุยในปาร์ตี้`); },
      no: () => this.net.lobbySend('pr', { to: p.k, ok: 0, n: this.game.player.name }),
    });
  }

  onPartyReply(p) {
    const who = clean(p.n) || 'ผู้เล่น';
    if (!p.ok) this.log(p.why === 'off' ? `${who} ปิดรับคำเชิญปาร์ตี้อยู่` : `${who} ปฏิเสธคำเชิญปาร์ตี้`, 'sys');
  }

  // สมาชิกที่อยู่แมพเดียวกับเรา (รวมตัวเรา)
  sameMapCount() {
    if (!this.pid) return 1;
    const map = this.game.map && this.game.map.id;
    let n = 1;
    for (const [k, m] of this.members) if (k !== this.myKey && m.m === map) n++;
    return n;
  }

  // เรียกตอนเรากำจัดมอน: คืนส่วนแบ่ง EXP ดิบของเรา (ก่อนคูณบัฟ) แล้วส่งส่วนแบ่งให้เพื่อนในแมพเดียวกัน
  shareKill(rawB, rawJ, mobName) {
    const n = this.sameMapCount();
    if (n <= 1) return null;
    const k = (1 + PARTY_BONUS * (n - 1)) / n;
    const b = Math.max(1, Math.round(rawB * k)), j = Math.round(rawJ * k);
    this.party.send('xp', { id: rid(), b, j, m: this.game.map.id, n: this.game.player.name, mob: clean(mobName, 24) });
    return { b, j, n };
  }

  onShareExp(p) {
    const g = this.game;
    if (!g.started || !p || this.dupMsg('xp' + p.id)) return;
    if (!this.members.has(p.k) || p.m !== (g.map && g.map.id) || g.player.dead) return;
    const b = Math.floor(num(p.b, 0, 5e6)), j = Math.floor(num(p.j, 0, 5e6));
    if (!b && !j) return;
    g.partyExp(b, j, clean(p.n), clean(p.mob, 24));
  }

  /* ======================= กิลด์ ======================= */
  get guildId() { return this.guild ? this.guild.id : 0; }
  get myTag() { return this.guild ? { name: this.guild.name, emblem: this.guild.emblem } : null; }
  get isGuildLeader() { return !!this.guild && this.guild.role === 'leader'; }

  async refreshGuild() {
    if (!this.enabled) return;
    try {
      const d = await this.net.guildMine();
      this.guildErr = '';
      const g = d && d.guild;
      this.guildInvites = Array.isArray(d && d.invites) ? d.invites.filter((x) => x && Number.isFinite(+x.id)).map((x) => ({ id: +x.id, name: clean(x.name), emblem: parseEmblem(x.emblem) ? x.emblem : '0-0-0-9' })) : [];
      const prev = this.guildId;
      this.guild = g ? { id: +g.id, name: clean(g.name), emblem: parseEmblem(g.emblem) ? g.emblem : '0-0-0-9', role: g.role === 'leader' ? 'leader' : 'member', members: (g.members || []).map((m) => ({ name: clean(m.name), job: clean(m.job), lv: num(+m.lv, 1, 99, 1), role: m.role === 'leader' ? 'leader' : 'member' })) } : null;
      if (this.guild) this.tags.set(this.guild.id, { name: this.guild.name, emblem: this.guild.emblem });
      if (prev !== this.guildId) this.openGuildChannel();
      else if (this.guildCh) this.guildCh.track(this.guildState());
    } catch (e) { this.guildErr = e.message || String(e); }
    this.game.player.guildTag = this.myTag;
    this.changed();
  }

  guildState() { const pl = this.game.player; return { n: pl.name, j: pl.jobId, lv: pl.baseLevel, m: this.game.map ? this.game.map.id : '' }; }

  openGuildChannel() {
    if (this.guildCh) { this.guildCh.close(); this.guildCh = null; }
    this.guildOnline = new Map();
    if (!this.guild) return;
    this.guildCh = this.net.sideChannel('guild-' + this.guild.id, {
      events: ['gc', 'gu'],
      onEvent: (ev, p) => {
        if (ev === 'gc') {
          const text = clean(p.m, 120), who = clean(p.n);
          if (!text || !Number.isFinite(p.t) || this.dupMsg('gc' + p.k + p.t)) return;
          this.game.hud.log(`[กิลด์] ${who} : ${text}`, 'guild');
          if (this.game.settings.chatSound) this.game.sfx('chat');
        } else if (ev === 'gu') this.refreshGuild();   // มีคนเข้า/ออก/ถูกเตะ/เปลี่ยนตรา → โหลดข้อมูลใหม่จากเซิร์ฟเวอร์
      },
      onSync: (m) => { this.guildOnline = new Map([...m].map(([k, s]) => [k, { n: clean(s && s.n), lv: num(s && s.lv, 1, 99, 1), m: clean(s && s.m, 40) }])); this.changed(); },
    });
    this.guildCh.track(this.guildState());
  }

  guildNotify() { if (this.guildCh) this.guildCh.send('gu', {}); }

  sendGuildChat(text) {
    if (!this.guild || !this.guildCh) { this.log('ยังไม่ได้อยู่ในกิลด์', 'sys'); return false; }
    const pl = this.game.player, t = Date.now();
    this.guildCh.send('gc', { n: pl.name, m: text, t });
    this.game.hud.log(`[กิลด์] ${pl.name} : ${text}`, 'guild me');
    return true;
  }

  async createGuild(name, emblem) {
    const pl = this.game.player;
    if (pl.baseLevel < GUILD_LV) throw new Error(`ต้อง Base Lv ${GUILD_LV} ขึ้นไป`);
    if (pl.zeny < GUILD_COST) throw new Error(`Zeny ไม่พอ (ต้องมี ${GUILD_COST.toLocaleString()})`);
    await this.game.saveNow(false, true);
    await this.net.flush();
    await this.net.guildCreate(name, emblem);
    pl.spendZeny(GUILD_COST);
    this.game.hud.setPlayer(pl);
    this.game.saveNow(false, true);
    this.game.sfx('levelUp');
    await this.refreshGuild();
    this.log(`ก่อตั้งกิลด์ "${this.guild ? this.guild.name : name}" สำเร็จ! (-${GUILD_COST.toLocaleString()} Zeny)`, 'guild');
  }

  async inviteGuild(key, name) {
    if (!this.isGuildLeader) return;
    try {
      const real = await this.net.guildInvite(name);
      this.net.lobbySend('gi', { to: key, gid: this.guild.id, g: this.guild.name, n: this.game.player.name });
      this.log(`ส่งคำเชิญเข้ากิลด์ให้ ${real || name} แล้ว (คำเชิญอยู่ได้ 3 วัน ดูได้ในแท็บกิลด์)`, 'guild');
    } catch (e) { this.log('เชิญเข้ากิลด์ไม่สำเร็จ: ' + e.message, 'sys'); }
  }

  onGuildInvite(p) {
    const gid = Math.floor(+p.gid);
    if (!Number.isFinite(gid) || gid <= 0 || this.guildId) return;
    const gname = clean(p.g), from = clean(p.n);
    this.prompt({ id: 'g' + gid, kind: 'guild', text: `${from} ชวนคุณเข้ากิลด์ "${gname}"`, yes: () => this.acceptGuild(gid), no: () => this.declineGuild(gid) });
  }

  async acceptGuild(gid) {
    try { await this.net.guildJoin(gid); await this.refreshGuild(); this.guildNotify(); this.log(`เข้าร่วมกิลด์ "${this.guild ? this.guild.name : ''}" แล้ว · พิมพ์ /g ข้อความ เพื่อคุยในกิลด์`, 'guild'); }
    catch (e) { this.log('เข้ากิลด์ไม่สำเร็จ: ' + e.message, 'sys'); this.refreshGuild(); }
  }
  async declineGuild(gid) { try { await this.net.guildDecline(gid); } catch (e) { /* */ } this.guildInvites = this.guildInvites.filter((x) => x.id !== gid); this.changed(); }

  async leaveGuild() {
    if (!this.guild) return;
    const name = this.guild.name;
    this.guildNotify();
    try { await this.net.guildLeave(); this.log(`ออกจากกิลด์ "${name}" แล้ว`, 'guild'); } catch (e) { this.log('ออกจากกิลด์ไม่สำเร็จ: ' + e.message, 'sys'); }
    await this.refreshGuild();
  }

  async kickGuild(name) {
    try { await this.net.guildKick(name); this.guildNotify(); this.log(`เชิญ ${name} ออกจากกิลด์แล้ว`, 'guild'); } catch (e) { this.log('ไม่สำเร็จ: ' + e.message, 'sys'); }
    await this.refreshGuild();
  }

  async setEmblem(code) {
    try { await this.net.guildSetEmblem(code); this.tags.delete(this.guildId); await this.refreshGuild(); this.guildNotify(); this.log('เปลี่ยนตรากิลด์แล้ว', 'guild'); } catch (e) { this.log('เปลี่ยนตราไม่สำเร็จ: ' + e.message, 'sys'); }
  }

  // ป้ายกิลด์ของผู้เล่นคนอื่น (ดึงจากเซิร์ฟเวอร์ทีละชุด แคชไว้)
  tagFor(id) {
    if (!id) return null;
    const t = this.tags.get(id);
    if (t) return t.name ? t : null;
    this.tagWant.add(id);
    return null;
  }
  async fetchTags() {
    if (this.tagBusy || !this.tagWant.size || !this.enabled) return;
    this.tagBusy = true;
    const ids = [...this.tagWant].slice(0, 50);
    for (const id of ids) this.tagWant.delete(id);
    try {
      const rows = await this.net.guildPublic(ids);
      for (const id of ids) this.tags.set(id, { name: '', emblem: '' });   // ไม่มีกิลด์นี้ (ถูกยุบ) → ไม่แสดง
      for (const r of rows) if (r && parseEmblem(r.emblem)) this.tags.set(+r.id, { name: clean(r.name), emblem: r.emblem });
    } catch (e) { for (const id of ids) this.tags.set(id, { name: '', emblem: '', at: Date.now() }); }
    this.tagBusy = false;
    this.syncTags();
  }

  // ตั้งค่าป้ายให้ตัวละครที่เห็นบนจอ (ตัวเรา + ผู้เล่นคนอื่น)
  syncTags() {
    const g = this.game;
    if (g.player) g.player.guildTag = this.myTag;
    if (!g.remote) return;
    for (const r of g.remote.list.values()) {
      r.guildTag = this.tagFor(r.guildId);
      r.inParty = !!this.pid && !!r.peer && this.members.has(r.peer.peer);
    }
  }

  /* ======================= คำเชิญ (กล่องตอบรับมุมจอ) ======================= */
  prompt(p) {
    if (this.prompts.some((x) => x.id === p.id)) return;
    p.until = Date.now() + 30000;
    this.prompts.push(p);
    this.game.sfx('chat');
    this.changed();
  }
  answer(id, yes) {
    const p = this.prompts.find((x) => x.id === id);
    this.prompts = this.prompts.filter((x) => x.id !== id);
    if (p) (yes ? p.yes : p.no)();
    this.changed();
  }

  /* ======================= ทุกเฟรม (เรียกจาก Game.updateNet) ======================= */
  update(dt) {
    if (!this.enabled) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 1;
    if (this.party) { this.party.track(this.myState()); this.party.tick(); this.savePid(); }
    if (this.guildCh) { this.guildCh.track(this.guildState()); this.guildCh.tick(); }
    const now = Date.now(), before = this.prompts.length;
    this.prompts = this.prompts.filter((p) => { if (p.until > now) return true; p.no(); return false; });
    if (before !== this.prompts.length) this.changed();
    // ดึงป้ายกิลด์ที่ยังไม่รู้จัก · ข้อมูลกิลด์ที่ไม่มีอยู่ ลองใหม่ทุก 2 นาที
    for (const [id, t] of this.tags) if (!t.name && t.at && now - t.at > 120000) this.tags.delete(id);
    this.syncTags();
    this.fetchTags();
    if (now > (this.guildNext || 0)) { this.guildNext = now + 90000; this.refreshGuild(); }
  }

  stop() {
    if (this.party) this.party.close();
    if (this.guildCh) this.guildCh.close();
    this.party = null; this.guildCh = null; this.members = new Map(); this.guildOnline = new Map();
  }
}

export { emblemSvg };
