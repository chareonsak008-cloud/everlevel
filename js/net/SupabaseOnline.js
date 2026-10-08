// ระบบออนไลน์ผ่านเซิร์ฟเวอร์ Supabase (v0.12) — เล่นได้บนเบราว์เซอร์ทั่วไป สมัครด้วยอีเมล + รหัสผ่าน
// หน้าตาเหมือน net/Online.js ทุกอย่าง (เกม/หน้าเข้าเกมเรียกใช้แบบเดียวกัน) ต่างกันแค่ที่เก็บข้อมูล:
//   · บัญชี: Supabase Auth (รหัสผ่านถูกเข้ารหัสโดยเซิร์ฟเวอร์ เกมไม่เคยเก็บรหัสผ่านเอง)
//   · เซฟ: ตาราง characters / accounts (ดู supabase/setup.sql — ผู้เล่นแก้ได้เฉพาะของตัวเอง)
//   · ผู้เล่นพร้อมกัน: Realtime — ห้องรวม "lobby" (ใครออนไลน์อยู่แผนที่ไหน) + ห้องแยกต่อแผนที่ (ตำแหน่ง ท่าทาง แชต)
import { Online, MAX_CHARS } from './Online.js';

const LOBBY_KEYS = ['n', 'j', 'lv', 'm', 'u'];
const FAST_KEYS = ['x', 'y', 'a', 'mv', 'h', 'dead', 'at', 'ak'];
const FAST_MS = 250;        // ส่งตำแหน่ง/ท่าทางไม่ถี่เกิน 4 ครั้งต่อวินาที (ประหยัดโควตาข้อความของแพ็กเกจฟรี · ฝั่งรับเกลี่ยการเดินให้ลื่นเอง)
const RETRACK_MS = 2500;    // ส่งสถานะเต็มซ้ำเป็นระยะ ให้คนที่เพิ่งเข้าแผนที่เห็นตำแหน่งล่าสุด

// แปลงข้อผิดพลาดจากเซิร์ฟเวอร์เป็นข้อความภาษาไทย
export function authMessage(err) {
  if (!err) return '';
  const code = err.code || '', msg = String(err.message || '').toLowerCase(), st = err.status || 0;
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'ยังไม่ได้ยืนยันอีเมล — เปิดอีเมลแล้วกดลิงก์ยืนยันก่อน แล้วกลับมาเข้าสู่ระบบ';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบ หรือกด "ลืมรหัสผ่าน"';
  if (code === 'weak_password' || msg.includes('password should')) return 'รหัสผ่านง่ายเกินไป ใช้อย่างน้อย 8 ตัว ผสมตัวอักษรกับตัวเลข';
  if (code === 'same_password') return 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
  if (code.startsWith('over_') || st === 429 || msg.includes('rate limit')) return 'ทำรายการบ่อยเกินไป รอสักครู่แล้วลองใหม่';
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) return 'ตอนนี้ปิดรับสมัครสมาชิกใหม่';
  if (code === 'email_address_invalid' || msg.includes('invalid format') || msg.includes('invalid email')) return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  return 'เกิดข้อผิดพลาด: ' + (err.message || code || 'ไม่ทราบสาเหตุ');
}

export class SupabaseOnline extends Online {
  constructor(client) {
    super();
    this.kind = 'supabase';
    this.label = 'บัญชี Everlevel';
    this.sb = client;
    this.needsLogin = false;
    this.recovery = /type=recovery/.test(location.hash);
    this.room = true;                   // มีห้องผู้เล่นเสมอเมื่อเข้าสู่ระบบ
    this.tabKey = Math.random().toString(36).slice(2, 10);
    this.lobby = null; this.mapCh = null; this.mapId = null;
    this.lobbyState = new Map();        // key → { n, j, lv, m, u }
    this.shoutState = new Map();        // v0.13: key → { t, m } ข้อความโทรโข่งล่าสุด
    this.mapState = new Map();          // key → สถานะเต็มจากห้องแผนที่
    this.fastState = new Map();         // key → ตำแหน่ง/ท่าทางล่าสุด (broadcast)
    this.peerCache = new Map();         // key → Peer (เก็บออบเจ็กต์เดิมถ้าไม่เปลี่ยน)
    this.mine = {};
    this.fastPending = false; this.lastFast = 0; this.lastTrack = 0; this.trackTimer = null;
    this.lobbySig = ''; this.lastStorage = null;
    this.status = 'idle';
    this.sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { this.recovery = true; if (this.onRecovery) this.onRecovery(); }
    });
  }

  /* ---------- บัญชี ---------- */
  async init() {
    let session = null;
    try { ({ data: { session } } = await this.sb.auth.getSession()); } catch (e) { session = null; }
    if (!session || !session.user) { this.needsLogin = true; this.reason = 'ยังไม่ได้เข้าสู่ระบบ'; this.mode = 'offline'; return false; }
    this.useSession(session);
    return true;
  }

  useSession(session) {
    const u = session.user;
    this.uid = u.id;
    this.me = { id: u.id, name: u.email || 'ผู้เล่น', avatarUrl: '' };
    this.canWrite = true; this.needsLogin = false;
    this.mode = 'online';
  }

  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) return authMessage(error);
    this.useSession(data.session);
    return null;
  }

  // คืน { error } | { session: true } | { confirm: true } (ต้องยืนยันอีเมลก่อน)
  async signUp(email, password) {
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return { error: authMessage(error) };
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { error: authMessage({ code: 'user_already_exists' }) };
    if (data.session) { this.useSession(data.session); return { session: true }; }
    return { confirm: true };
  }

  async resetPassword(email) {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    return error ? authMessage(error) : null;
  }

  async updatePassword(password) {
    const { data, error } = await this.sb.auth.updateUser({ password });
    if (error) return authMessage(error);
    this.recovery = false;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    const { data: s } = await this.sb.auth.getSession();
    if (s && s.session) this.useSession(s.session); else if (data && data.user) this.uid = data.user.id;
    return null;
  }

  async signOut() {
    this.leaveRoom();
    try { await this.sb.auth.signOut(); } catch (e) { /* ออกจากระบบในเครื่องอยู่ดี */ }
    this.mode = 'offline'; this.uid = null;
  }

  /* ---------- ตัวละคร + เซฟ ---------- */
  async account() {
    const [c, a] = await Promise.all([
      this.sb.from('characters').select('slot,name,job,lv,jlv,map').order('slot', { ascending: true }),
      this.sb.from('accounts').select('storage').maybeSingle(),
    ]);
    if (c.error) throw c.error;
    const chars = Array(MAX_CHARS).fill(null);
    for (const r of c.data || []) if (r.slot >= 1 && r.slot <= MAX_CHARS) chars[r.slot - 1] = { name: r.name, job: r.job, lv: r.lv, jlv: r.jlv, map: r.map };
    const storage = a.data && Array.isArray(a.data.storage) ? a.data.storage : [];
    this.lastStorage = JSON.stringify(storage);
    return { chars, storage };
  }

  async loadChar(slot) {
    const { data, error } = await this.sb.from('characters').select('name,data').eq('slot', slot).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data.data && typeof data.data === 'object' ? data.data : {};
    // ตัวละครที่จองชื่อแล้วแต่ยังไม่เคยเซฟ → เริ่มใหม่ด้วยชื่อนั้น
    if (!d.player) return { schema: 1, player: { name: data.name } };
    d.player.name = data.name;
    return d;
  }

  // สร้างแถวตัวละคร (= จองชื่อ) — ชื่อซ้ำทั้งเซิร์ฟเวอร์ถูกกันด้วย unique index ในฐานข้อมูล
  async claimName(name, slot) {
    const { error } = await this.sb.from('characters').insert({ user_id: this.uid, slot, name: name.trim(), job: 'novice', lv: 1, jlv: 1 });
    if (!error) return null;
    const m = String(error.message || '') + ' ' + String(error.details || '');
    if (error.code === '23505' && m.includes('name')) return 'ชื่อนี้มีผู้เล่นคนอื่นใช้แล้ว';
    if (error.code === '23505') return 'ช่องนี้มีตัวละครอยู่แล้ว';
    if (error.code === '42501') return 'ไม่มีสิทธิ์บันทึก ลองออกจากระบบแล้วเข้าใหม่';
    return 'สร้างตัวละครไม่สำเร็จ: ' + (error.message || error.code);
  }

  async releaseName() { /* ลบแถวตัวละคร = คืนชื่ออัตโนมัติ */ }

  // v0.13: ใบเปลี่ยนชื่อ — เปลี่ยนชื่อในแถวตัวละคร (ชื่อซ้ำถูกกันด้วย unique index) · คืน null หรือข้อความผิดพลาด
  async renameChar(name) {
    if (!this.slot) return 'ยังไม่ได้เลือกตัวละคร';
    const { error } = await this.sb.from('characters').update({ name: name.trim() }).eq('slot', this.slot);
    if (!error) return null;
    if (error.code === '23505') return 'ชื่อนี้มีผู้เล่นคนอื่นใช้แล้ว';
    return 'เปลี่ยนชื่อไม่สำเร็จ: ' + (error.message || error.code);
  }

  async deleteChar(slot) {
    const { error } = await this.sb.from('characters').delete().eq('slot', slot);
    if (error) throw error;
  }

  async writeState(s) {
    const p = s.player || {};
    const { storage, ...rest } = s;   // คลังเก็บแยกไว้ในตาราง accounts (ใช้ร่วมทุกตัวละคร)
    const row = {
      user_id: this.uid, slot: this.slot, name: p.name, job: p.job || 'novice',
      lv: Math.max(1, Math.min(99, p.baseLevel || 1)), jlv: Math.max(1, Math.min(99, p.jobLevel || 1)),
      map: p.map || 'asteria_town', data: rest, updated_at: new Date().toISOString(),
    };
    const r1 = await this.sb.from('characters').upsert(row, { onConflict: 'user_id,slot' });
    if (r1.error) throw r1.error;
    const st = JSON.stringify(storage || []);
    if (st !== this.lastStorage) {
      const r2 = await this.sb.from('accounts').upsert({ user_id: this.uid, storage: storage || [], updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (r2.error) throw r2.error;
      this.lastStorage = st;
    }
  }

  /* ---------- v0.15: จดหมาย (ตาราง mails / mail_claims / admins จาก supabase/mail.sql) ---------- */
  // คืน { mails, claims, admin } · โยน error ถ้าเซิร์ฟเวอร์ยังไม่มีตาราง
  async fetchMail() {
    const [m, c, a] = await Promise.all([
      this.sb.from('mails').select('id,to_name,sender,title,body,items,zeny,picks,per,created_at,expires_at').order('created_at', { ascending: false }).limit(60),
      this.sb.from('mail_claims').select('mail_id,cid').limit(1000),
      this.sb.from('admins').select('user_id').limit(1),
    ]);
    if (m.error) throw m.error;
    if (c.error) throw c.error;
    return { mails: m.data || [], claims: c.data || [], admin: !a.error && Array.isArray(a.data) && a.data.length > 0 };
  }

  // บันทึกว่ารับแล้ว (คีย์หลักกันรับซ้ำ) · คืน null = สำเร็จ · 'claimed' = เคยรับแล้ว · หรือข้อความผิดพลาด
  async claimMail(id, cid) {
    const { error } = await this.sb.from('mail_claims').insert({ mail_id: id, cid });
    if (!error) return null;
    if (error.code === '23505') return 'claimed';
    return error.message || error.code || 'ผิดพลาด';
  }

  // แอดมินส่งจดหมาย (สิทธิ์ตรวจที่ฐานข้อมูล: เฉพาะบัญชีในตาราง admins)
  async sendMail(m) {
    const { error } = await this.sb.from('mails').insert({
      to_name: m.to || null, sender: m.sender || 'GM', title: m.title, body: m.body || '',
      items: m.items || [], zeny: m.zeny || 0, picks: m.picks || [], per: m.per === 'char' ? 'char' : 'account',
      expires_at: m.expires ? new Date(m.expires).toISOString() : null,
    });
    if (!error) return null;
    if (error.code === '42501') return 'บัญชีนี้ไม่ใช่แอดมิน';
    return error.message || error.code || 'ผิดพลาด';
  }

  async deleteMail(id) {
    const { error } = await this.sb.from('mails').delete().eq('id', id);
    return error ? error.message || error.code : null;
  }

  async leaderboard(n = 20) {
    const { data, error } = await this.sb.rpc('leaderboard', { n });
    if (error || !Array.isArray(data)) return [];
    return data.map((d, i) => ({ id: d.mine ? this.uid : 'r' + i, name: d.name, job: d.job, lv: d.lv, jlv: d.jlv }));
  }

  /* ---------- ผู้เล่นพร้อมกัน (Realtime) ---------- */
  get key() { return `${(this.uid || 'x').slice(0, 8)}-${this.tabKey}`; }

  connectRoom(onPeers) {
    if (!this.online) return false;
    this.peersHandler = onPeers;
    const ch = this.lobby = this.sb.channel('everlevel-lobby', { config: { presence: { key: this.key }, broadcast: { self: false } } });
    ch.on('broadcast', { event: 'sh' }, ({ payload }) => {
      if (ch !== this.lobby || !payload || typeof payload.k !== 'string') return;
      this.shoutState.set(payload.k, { t: payload.t, m: String(payload.m || '').slice(0, 80) });
      this.emitPeers();
    });
    ch.on('presence', { event: 'sync' }, () => {
      this.lobbyState = this.readPresence(ch);
      this.emitPeers();
    });
    ch.subscribe((status) => {
      this.status = status;
      if (status === 'SUBSCRIBED') { this.lobbySig = ''; this.trackLobby(); }
    });
    return true;
  }

  leaveRoom() {
    for (const ch of [this.lobby, this.mapCh]) if (ch) this.dropChannel(ch);
    this.lobby = null; this.mapCh = null; this.mapId = null;
  }

  dropChannel(ch) {
    try { Promise.resolve(this.sb.removeChannel(ch)).catch(() => {}); } catch (e) { /* ปิดไปแล้ว */ }
  }

  readPresence(ch) {
    const out = new Map();
    let st = {};
    try { st = ch.presenceState() || {}; } catch (e) { st = {}; }
    for (const [k, metas] of Object.entries(st)) {
      const last = Array.isArray(metas) && metas.length ? metas[metas.length - 1] : null;
      if (last && typeof last === 'object') { const { presence_ref, ...rest } = last; out.set(k, rest); }
    }
    return out;
  }

  joinMap(mapId) {
    if (this.mapCh) this.dropChannel(this.mapCh);
    this.mapState = new Map(); this.fastState = new Map();
    this.mapId = mapId;
    const ch = this.mapCh = this.sb.channel('everlevel-map-' + mapId, { config: { presence: { key: this.key }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      if (ch !== this.mapCh) return;
      this.mapState = this.readPresence(ch);
      for (const k of [...this.fastState.keys()]) if (!this.mapState.has(k)) this.fastState.delete(k);
      this.emitPeers();
    });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => {
      if (ch !== this.mapCh || !payload || typeof payload !== 'object' || typeof payload.k !== 'string') return;
      const { k, ...fast } = payload;
      this.fastState.set(k, { ...(this.fastState.get(k) || {}), ...fast });
      this.emitPeers();
    });
    ch.on('broadcast', { event: 'say' }, ({ payload }) => {
      if (ch !== this.mapCh || !payload || typeof payload.k !== 'string') return;
      this.fastState.set(payload.k, { ...(this.fastState.get(payload.k) || {}), say: { t: payload.t, m: payload.m } });
      this.emitPeers();
    });
    ch.subscribe((status) => { if (status === 'SUBSCRIBED' && ch === this.mapCh) this.trackMap(true); });
    this.emitPeers();
  }

  trackLobby() {
    if (!this.lobby) return;
    const L = {}; for (const k of LOBBY_KEYS) if (this.mine[k] !== undefined) L[k] = this.mine[k];
    const sig = JSON.stringify(L);
    if (sig === this.lobbySig || !L.n) return;
    this.lobbySig = sig;
    this.lobby.track(L).catch(() => { this.lobbySig = ''; });
  }

  trackMap(now = false) {
    if (!this.mapCh) return;
    const wait = now ? 0 : Math.max(0, 1000 - (Date.now() - this.lastTrack));
    if (this.trackTimer) return;
    this.trackTimer = setTimeout(() => {
      this.trackTimer = null;
      if (!this.mapCh) return;
      this.lastTrack = Date.now();
      const { say, ...full } = this.mine;
      this.mapCh.track(full).catch(() => { /* ส่งใหม่รอบหน้า */ });
    }, wait);
  }

  // เกมเรียกทุก ~0.12 วินาทีด้วยช่องที่เปลี่ยน (รูปแบบเดียวกับ room.presence ของ claude.ai)
  presence(patch) {
    if (!this.online || !patch) return;
    this.mine.u = (this.uid || '').slice(0, 8);
    const mapChanged = patch.m !== undefined && patch.m !== this.mine.m;
    let slow = false, fast = false;
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'say' || k === 'sh') continue;
      this.mine[k] = v;
      if (FAST_KEYS.includes(k)) fast = true; else slow = true;
    }
    if (mapChanged) this.joinMap(this.mine.m);
    if (slow) { this.trackLobby(); this.trackMap(); }
    else if (Date.now() - this.lastTrack > RETRACK_MS) this.trackMap();
    if (fast) this.queueFast();
    if (patch.say && this.mapCh) this.mapCh.send({ type: 'broadcast', event: 'say', payload: { k: this.key, t: patch.say.t, m: patch.say.m } }).catch(() => {});
    // v0.13: โทรโข่งประกาศ — ส่งผ่านห้องรวม ทุกแผนที่ได้ยิน
    if (patch.sh && this.lobby) this.lobby.send({ type: 'broadcast', event: 'sh', payload: { k: this.key, t: patch.sh.t, m: patch.sh.m } }).catch(() => {});
  }

  queueFast() {
    if (this.fastPending) return;
    this.fastPending = true;
    setTimeout(() => {
      this.fastPending = false;
      if (!this.mapCh) return;
      const P = { k: this.key }; for (const k of FAST_KEYS) if (this.mine[k] !== undefined) P[k] = this.mine[k];
      this.lastFast = Date.now();
      this.mapCh.send({ type: 'broadcast', event: 'm', payload: P }).catch(() => {});
    }, Math.max(0, FAST_MS - (Date.now() - this.lastFast)));
  }

  // รวมข้อมูลจากห้องรวม + ห้องแผนที่ + ข้อความล่าสุด → รายชื่อแบบเดียวกับ room.peers()
  buildPeers() {
    const keys = new Set([...this.lobbyState.keys(), ...this.mapState.keys()]);
    const out = [];
    const myU = (this.uid || '').slice(0, 8);
    for (const k of keys) {
      const P = { ...(this.lobbyState.get(k) || {}), ...(this.mapState.get(k) || {}), ...(this.fastState.get(k) || {}) };
      if (!this.mapState.has(k)) { for (const f of ['x', 'y', 'lk', 'fw', 'say', 'pt', 'ps', ...FAST_KEYS]) delete P[f]; }
      if (this.shoutState.has(k)) P.sh = this.shoutState.get(k);
      const sameTab = k === this.key;
      const isMe = sameTab || (!!P.u && P.u === myU);
      const sig = JSON.stringify(P) + isMe;
      let peer = this.peerCache.get(k);
      if (!peer || peer.sig !== sig) {
        peer = Object.freeze({ peer: k, by: null, isMe, sameTab, kind: 'viewer', guest: false, presence: Object.freeze(P), updatedAt: Date.now(), sig });
        this.peerCache.set(k, peer);
      }
      out.push(peer);
    }
    for (const k of [...this.peerCache.keys()]) if (!keys.has(k)) this.peerCache.delete(k);
    return out;
  }

  emitPeers() {
    if (this.emitQueued) return;
    this.emitQueued = true;
    queueMicrotask(() => { this.emitQueued = false; this.lastPeers = this.buildPeers(); if (this.peersHandler) this.peersHandler({ peers: this.lastPeers }); });
  }

  peers() { return this.lastPeers || this.buildPeers(); }
  connected() { return this.status === 'SUBSCRIBED'; }
}
