// ระบบออนไลน์ผ่านเซิร์ฟเวอร์ Supabase (v0.12) — เล่นได้บนเบราว์เซอร์ทั่วไป สมัครด้วยอีเมล + รหัสผ่าน
// หน้าตาเหมือน net/Online.js ทุกอย่าง (เกม/หน้าเข้าเกมเรียกใช้แบบเดียวกัน) ต่างกันแค่ที่เก็บข้อมูล:
//   · บัญชี: Supabase Auth (รหัสผ่านถูกเข้ารหัสโดยเซิร์ฟเวอร์ เกมไม่เคยเก็บรหัสผ่านเอง)
//   · เซฟ: ตาราง characters / accounts (ดู supabase/setup.sql — ผู้เล่นแก้ได้เฉพาะของตัวเอง)
//   · ผู้เล่นพร้อมกัน: Realtime — ห้องรวม "lobby" (ใครออนไลน์อยู่แผนที่ไหน) + ห้องแยกต่อแผนที่ (ตำแหน่ง ท่าทาง แชต)
import { Online, MAX_CHARS } from './Online.js';

// v0.16.1: เขียนระบบผู้เล่นพร้อมกันใหม่ (ดูคำอธิบายที่หัวส่วน "ผู้เล่นพร้อมกัน" ด้านล่าง)
const LOBBY_KEYS = ['n', 'j', 'lv', 'm', 'u'];                       // ห้องรวม (presence): ชื่อ อาชีพ เลเวล แผนที่ — เปลี่ยนนาน ๆ ครั้ง
const SLOW_KEYS = ['n', 'j', 'lv', 'm', 'u', 'lk', 'fw', 'pt', 'ps']; // ข้อมูลเต็มของตัวละคร (ส่งตอนเข้าห้อง/เปลี่ยน/ทุกครั้งที่เต้นหัวใจ)
const FAST_KEYS = ['x', 'y', 'a', 'mv', 'h', 'dead', 'at', 'ak'];     // ตำแหน่ง/ท่าทาง (ส่งเมื่อเปลี่ยน)
const PEER_TTL = 20000;     // ไม่ได้ยินจากผู้เล่นเกินนี้ (มิลลิวินาที) = ถือว่าออกจากแมพไปแล้ว
const WATCHDOG_MS = 7000;   // ช่องที่ไม่พร้อมเกินนี้ → สร้างใหม่

const clampN = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined);
const cutS = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n) : undefined);
const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((r) => setTimeout(() => r(null), ms))]);

// ข้อมูลจากผู้เล่นอื่นเชื่อถือไม่ได้: คัดเฉพาะช่องที่รู้จัก ตรวจชนิด/ขนาดก่อนเก็บ
function pickState(p, full) {
  const o = {}, set = (k, v) => { if (v !== undefined) o[k] = v; };
  set('x', clampN(p.x, -1e5, 1e5)); set('y', clampN(p.y, -1e5, 1e5)); set('a', clampN(p.a, -10, 10)); set('h', clampN(p.h, 0, 1));
  if (typeof p.mv === 'boolean') o.mv = p.mv;
  if (typeof p.dead === 'boolean') o.dead = p.dead;
  set('at', clampN(p.at, 0, 1e9)); set('ak', cutS(p.ak, 8)); set('s', clampN(p.s, 0, 1e13));
  set('vx', clampN(p.vx, -400, 400)); set('vy', clampN(p.vy, -400, 400)); set('tp', clampN(p.tp, 0, 65535)); set('e', clampN(p.e, 0, 20000));   // ความเร็ว (px/วินาที) — ฝั่งรับเดินต่อเองระหว่างแพ็กเก็ต
  if (full) {
    set('n', cutS(p.n, 16)); set('j', cutS(p.j, 16)); set('lv', clampN(p.lv, 1, 999)); set('m', cutS(p.m, 40)); set('u', cutS(p.u, 8));
    set('pt', cutS(p.pt, 24)); set('ps', clampN(p.ps, 0, 9));
    if (p.lk && typeof p.lk === 'object' && !Array.isArray(p.lk) && JSON.stringify(p.lk).length < 1200) o.lk = p.lk;
    if (Array.isArray(p.fw)) o.fw = p.fw.filter((x) => typeof x === 'string').slice(0, 8).map((x) => x.slice(0, 40));
  }
  return o;
}

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
    this.t0 = performance.now();        // เวลาเริ่มของแท็บนี้ — ใช้ติดเวลาในแพ็กเก็ตตำแหน่ง ให้ฝั่งรับเล่นย้อนหลังอย่างต่อเนื่อง
    this.roomOn = false; this.hooked = false; this.timer = null;
    this.lobby = null; this.lobbyReady = false; this.lobbyAt = 0; this.lobbyBack = 0; this.lobbyRetryAt = 0; this.lobbyBusy = false; this.lobbySig = '';
    this.mapCh = null; this.mapId = null; this.mapReady = false; this.mapAt = 0; this.mapBack = 0; this.mapRetryAt = 0; this.mapSeq = 0; this.mapOpening = 0;
    this.lobbyState = new Map();        // key → { n, j, lv, m, u } จากห้องรวม
    this.mapPeers = new Map();          // key → { st: สถานะล่าสุด, seen: เวลาที่ได้ยินล่าสุด } จากห้องแมพ (broadcast)
    this.peerCache = new Map();         // key → Peer (เก็บออบเจ็กต์เดิมถ้าไม่เปลี่ยน)
    this.mine = {};
    this.lastAny = 0; this.lastFast = 0; this.lastHi = 0; this.fastPending = false; this.fullTimer = null;
    this.vel = { vx: 0, vy: 0 }; this.sentK = null; this.tp = 0; this.dupTimer = null; this.lobbyNext = 0; this.hbJit = 1 + Math.random() * 0.5;   // ความเร็ว · สถานะที่ส่งล่าสุด (ไว้เทียบว่าต้องส่งใหม่ไหม) · ตัวนับวาร์ปในแมพ
    this.sayQ = []; this.shQ = []; this.seenMsg = new Set();
    this.lastStorage = null;
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

  /* ---------- ผู้เล่นพร้อมกัน (Realtime) · เขียนใหม่ v0.16.1 ----------
     · ห้องรวม "lobby" ใช้ presence: ใครออนไลน์ · แผนที่ไหน (เปลี่ยนนาน ๆ ครั้ง) + โทรโข่ง
     · ห้องแผนที่ ใช้ broadcast ล้วน (ไม่ใช้ presence): m = ตำแหน่ง (ถี่) · f = ข้อมูลเต็ม (เต้นหัวใจ/ตอนเปลี่ยน/ตอบ hi)
       · hi = ขอให้ทุกคนส่งข้อมูลเต็ม (ตอนเพิ่งเข้าห้อง) · bye = ออกจากห้อง · say = แชต (ไม่พึ่งรายชื่อ ส่งซ้ำได้ถ้าพลาด)
     · แพ็กเกจฟรีจำกัด 100 ข้อความ/วินาที (presence 20) → ไม่มีใครในแมพ = ไม่ส่งตำแหน่ง · คนเยอะ = ส่งห่างขึ้น (ฝั่งรับเกลี่ยการเดินเอง)
     · เฝ้าสถานะช่อง: ไม่พร้อมเกิน 7 วินาทีสร้างใหม่เอง · กลับจากพื้นหลัง/เน็ตกลับมา = เชื่อมใหม่ */
  get key() { return `${(this.uid || 'x').slice(0, 8)}-${this.tabKey}`; }
  uid8() { return (this.uid || '').slice(0, 8); }
  sNow() { return Math.round(performance.now() - this.t0); }
  fastMs() { return Math.min(1200, 120 + 100 * Math.max(0, this.mapPeers.size - 2)); }   // ช่วงห่างขั้นต่ำระหว่างแพ็กเก็ตตำแหน่ง: คนเยอะ = ห่างขึ้น
  hbMs() { const n = this.mapPeers.size; return (n === 0 ? 10000 : n <= 4 ? 4000 : 6000) * this.hbJit; }   // คนละจังหวะกัน (ไม่ให้ทุกคนเต้นหัวใจพร้อมกัน)
  keepMs() { return 1500 + 250 * this.mapPeers.size; }                    // เดินอยู่: ส่งซ้ำอย่างน้อยทุกกี่ ms

  connectRoom(onPeers, handlers = {}) {
    if (!this.online) return false;
    this.peersHandler = onPeers;
    this.sayHandler = handlers.onSay || null; this.shoutHandler = handlers.onShout || null;
    if (this.roomOn) { this.emitPeers(); return true; }
    this.roomOn = true;
    this.openLobby();
    if (this.mapId && !this.mapCh) this.joinMap(this.mapId);
    this.timer = setInterval(() => this.tick(), 1000);
    this.hook();
    return true;
  }

  hook() {
    if (this.hooked || typeof document === 'undefined' || typeof window === 'undefined') return;
    this.hooked = true;
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.hiddenAt = Date.now(); else this.resume(); });
    window.addEventListener('online', () => this.resume(true));
    window.addEventListener('pageshow', (e) => { if (e && e.persisted) this.resume(true); });
    window.addEventListener('pagehide', () => this.bye());
  }

  // กลับมาจากพื้นหลัง / เน็ตกลับมา: เว็บซ็อกเก็ตบนมือถืออาจตายเงียบ ๆ ตอนอยู่พื้นหลัง → ถ้าไปนานเกิน 8 วินาทีสร้างช่องใหม่ทั้งหมด
  resume(hard = false) {
    if (!this.roomOn) return;
    const away = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
    this.hiddenAt = 0;
    if (!hard && away < 8000 && this.lobbyReady && this.mapReady) { this.sendFull(); return; }
    this.lobbyBack = 0; this.reopenLobby(true);
    if (this.mapId) this.joinMap(this.mapId);
  }

  leaveRoom() {
    this.bye();
    this.roomOn = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const chs = [this.lobby, this.mapCh];
    this.lobby = null; this.mapCh = null; this.lobbyReady = false; this.mapReady = false; this.mapSeq++;
    for (const ch of chs) if (ch) this.dropChannel(ch);
    this.lobbyState = new Map(); this.mapPeers = new Map(); this.mapId = null; this.emitPeers();
  }

  dropChannel(ch) {
    try { Promise.resolve(this.sb.removeChannel(ch)).catch(() => {}); } catch (e) { /* ปิดไปแล้ว */ }
  }

  // ปิดช่องแล้วรอให้ปิดจริง (สูงสุด 2.5 วินาที) — ถ้าสร้างช่องชื่อเดิมก่อนปิดเสร็จ ไลบรารีจะคืนช่องเก่ามาให้ (เข้าห้องไม่ได้)
  async closeCh(ch) {
    if (!ch) return;
    try { await withTimeout(this.sb.removeChannel(ch), 2500); } catch (e) { /* ปิดไปแล้ว */ }
  }

  // เก็บกวาดช่องชื่อเดียวกันที่ค้างอยู่
  purge(name) {
    try { if (typeof this.sb.getChannels === 'function') for (const c of this.sb.getChannels()) if (c && c.topic === 'realtime:' + name) this.dropChannel(c); } catch (e) { /* ไม่เป็นไร */ }
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

  raw(ch, event, payload) {
    try { return Promise.resolve(ch.send({ type: 'broadcast', event, payload })).catch(() => 'error'); } catch (e) { return Promise.resolve('error'); }
  }

  /* ----- ห้องรวม ----- */
  openLobby() {
    const name = 'everlevel-lobby';
    this.purge(name);
    let ch;
    try { ch = this.sb.channel(name, { config: { presence: { key: this.key }, broadcast: { self: false } } }); } catch (e) { return this.lobbyFail(); }
    if (ch.state && ch.state !== 'closed') return this.lobbyFail();   // ช่องเดิมยังปิดไม่เสร็จ — รอบหน้าลองใหม่
    this.lobby = ch; this.lobbyReady = false; this.lobbyAt = Date.now(); this.lobbySig = '';
    try {
      ch.on('broadcast', { event: 'sh' }, ({ payload }) => { if (ch === this.lobby) this.onShout(payload); });
      ch.on('presence', { event: 'sync' }, () => { if (ch !== this.lobby) return; this.lobbyState = this.readPresence(ch); this.prune(); this.emitPeers(); });
      ch.subscribe((status) => {
        if (ch !== this.lobby) return;
        this.status = status;
        if (status === 'SUBSCRIBED') { this.lobbyReady = true; this.lobbyBack = 0; this.lobbySig = ''; this.trackLobby(); this.flushShouts(); this.emitPeers(); }
        else { this.lobbyReady = false; this.lobbyAt = Date.now(); }
      });
    } catch (e) { this.lobby = null; this.lobbyFail(); }
  }

  lobbyFail() {
    this.lobby = null; this.lobbyReady = false;
    this.lobbyBack = Math.min(15000, (this.lobbyBack || 1000) * 2);
    this.lobbyRetryAt = Date.now() + this.lobbyBack;
  }

  async reopenLobby(force = false) {
    if (this.lobbyBusy) return;
    this.lobbyBusy = true;
    const old = this.lobby; this.lobby = null; this.lobbyReady = false;
    if (!force) this.lobbyBack = Math.min(15000, (this.lobbyBack || 1000) * 2);
    try { await this.closeCh(old); } finally { this.lobbyBusy = false; }
    if (!this.roomOn || this.lobby) return;
    this.openLobby();
  }

  trackLobby() {
    if (!this.lobby || !this.lobbyReady) return;
    const L = {}; for (const k of LOBBY_KEYS) if (this.mine[k] !== undefined) L[k] = this.mine[k];
    const sig = JSON.stringify(L);
    if (sig === this.lobbySig || !L.n) return;
    this.lobbySig = sig; this.lobbyNext = Date.now() + 40000 + Math.random() * 20000;
    const ch = this.lobby;
    Promise.resolve(ch.track(L)).then((r) => { if (r !== 'ok' && ch === this.lobby) this.lobbySig = ''; }, () => { if (ch === this.lobby) this.lobbySig = ''; });   // พลาด → วินาทีถัดไป tick() ลองใหม่
  }

  /* ----- ห้องแผนที่ ----- */
  joinMap(mapId, back = 0) {
    this.mapId = mapId;
    const old = this.mapCh, seq = ++this.mapSeq;
    if (old && this.mapReady) this.bye();
    this.mapCh = null; this.mapReady = false; this.mapPeers = new Map(); this.sayQ = []; this.lastAny = 0; this.mapBack = back;
    this.mapOpening = seq;
    this.emitPeers();
    (async () => {
      try {
        if (old) await this.closeCh(old);
        if (seq !== this.mapSeq || !this.roomOn) return;
        if (!this.openMap(mapId)) this.mapRetryAt = Date.now() + 1500;
      } finally { if (this.mapOpening === seq) this.mapOpening = 0; }
    })();
  }

  openMap(mapId) {
    const name = 'everlevel-map-' + mapId;
    this.purge(name);
    let ch;
    try { ch = this.sb.channel(name, { config: { broadcast: { self: false } } }); } catch (e) { return false; }
    if (ch.state && ch.state !== 'closed') return false;
    this.mapCh = ch; this.mapReady = false; this.mapAt = Date.now();
    try {
      const mine = () => ch === this.mapCh;
      ch.on('broadcast', { event: 'm' }, ({ payload }) => { if (mine()) this.onFast(payload); });
      ch.on('broadcast', { event: 'f' }, ({ payload }) => { if (mine()) this.onFull(payload); });
      ch.on('broadcast', { event: 'hi' }, ({ payload }) => { if (mine()) this.onHi(payload); });
      ch.on('broadcast', { event: 'bye' }, ({ payload }) => { if (mine()) this.onBye(payload); });
      ch.on('broadcast', { event: 'say' }, ({ payload }) => { if (mine()) this.onSay(payload); });
      ch.subscribe((status) => {
        if (!mine()) return;
        if (status === 'SUBSCRIBED') { this.mapReady = true; this.mapBack = 0; this.sendFull(); this.sendHi(); this.flushSays(); this.emitPeers(); }
        else { this.mapReady = false; this.mapAt = Date.now(); }
      });
    } catch (e) { this.mapCh = null; return false; }
    return true;
  }

  bye() { if (this.mapCh && this.mapReady) this.raw(this.mapCh, 'bye', { k: this.key }); }
  sendHi() { if (!this.mapReady || !this.mapCh) return; this.lastHi = Date.now(); this.raw(this.mapCh, 'hi', { k: this.key }); }

  sendFull() {
    if (!this.mapReady || !this.mapCh || !this.mine.n) return;
    this.lastAny = Date.now();
    const P = { k: this.key, s: this.sNow() };
    for (const k of SLOW_KEYS) if (this.mine[k] !== undefined) P[k] = this.mine[k];
    for (const k of FAST_KEYS) if (this.mine[k] !== undefined) P[k] = this.mine[k];
    this.fillVel(P);
    this.markSent();
    this.raw(this.mapCh, 'f', P);
  }

  markSent() { const m = this.mine; this.sentK = { x: m.x, y: m.y, vx: this.vel.vx, vy: this.vel.vy, t: Date.now(), mv: m.mv, dead: m.dead, at: m.at, h: m.h, a: m.a, tp: this.tp }; }

  // ตอบ hi / ข้อมูลเปลี่ยน: หน่วงสุ่มกระจายตามจำนวนคน (คนเยอะ = กระจายกว้างขึ้น กันทุกคนตอบพร้อมกันจนเกินโควตา) แล้วรวมเป็นครั้งเดียว
  queueFull(maxDelay) {
    if (this.fullTimer) return;
    const span = maxDelay !== undefined ? maxDelay : Math.min(2000, 100 + 130 * this.mapPeers.size);
    this.fullTimer = setTimeout(() => { this.fullTimer = null; this.sendFull(); }, Math.random() * span);
  }

  // ความเร็ว = ความเร็วเดิน (sp, ค่าเริ่มต้น 80 px/วินาที) × ทิศที่หันหน้า (มุม a: 0 = ลงใต้ ตามที่เกมใช้) ตอนกำลังเดินเท่านั้น
  updateVel() {
    const m = this.mine;
    if (!m.mv || typeof m.a !== 'number') { this.vel = { vx: 0, vy: 0 }; return; }
    const sp = clampN(m.sp, 20, 400) || 80;
    this.vel = { vx: Math.round(Math.sin(m.a) * sp * 10) / 10, vy: Math.round(Math.cos(m.a) * sp * 10) / 10 };
  }
  fillVel(P) { P.vx = this.vel.vx; P.vy = this.vel.vy; P.tp = this.tp; if (this.vel.vx || this.vel.vy) P.e = this.keepMs(); }   // e = สัญญาว่าจะมีแพ็กเก็ตใหม่ภายในกี่ ms (ฝั่งรับเดินต่อได้นานเท่านี้)

  // ฝั่งรับเดินต่อด้วยความเร็วที่เราบอก — ส่งใหม่เมื่อ "ตำแหน่งจริงเริ่มต่างจากที่เขาคาดไว้" หรือท่าทาง/เลือดเปลี่ยน หรือเลี้ยวมุม
  wantFast(now) {
    const m = this.mine, k = this.sentK;
    if (!k) return true;
    const dt = Math.min((now - k.t) / 1000, 8);
    const px = k.x + k.vx * dt, py = k.y + k.vy * dt;
    if (m.mv !== k.mv || m.dead !== k.dead || m.at !== k.at || Math.abs((m.h || 0) - (k.h || 0)) > 0.01 || this.tp !== k.tp) return true;
    if (Math.hypot(m.x - px, m.y - py) > 10) return true;
    const da = Math.abs((m.a || 0) - (k.a || 0)), turn = Math.min(da, Math.PI * 2 - da);
    if (turn > (m.mv ? 0.35 : 0.6)) return true;
    return !!m.mv && now - k.t >= this.keepMs();   // เดินอยู่: ส่งซ้ำเป็นระยะกันพลาด
  }

  fastCheck() {
    if (!this.mapReady || !this.mapCh || !this.mapPeers.size || !this.mine.n) return;   // ไม่มีใครในแมพ = ไม่ต้องส่ง (ประหยัดโควตา) คนใหม่จะขอ hi เอง
    const now = Date.now();
    this.updateVel();
    const wait = this.fastMs() - (now - this.lastFast);
    if (wait > 0) {                                         // ถี่เกินไป: ตรวจใหม่ตอนถึงเวลา (ปลายทางของการเดิน/ท่าทางสุดท้ายต้องไปถึงแน่)
      if (!this.fastPending) { this.fastPending = true; setTimeout(() => { this.fastPending = false; this.fastCheck(); }, wait + 5); }
      return;
    }
    if (!this.wantFast(now)) return;
    const k = this.sentK, m = this.mine;
    const da = k ? Math.abs((m.a || 0) - (k.a || 0)) : 0, turned = !!k && !!m.mv && Math.min(da, Math.PI * 2 - da) > 0.35 && this.mapPeers.size <= 4;
    const edge = !k || m.mv !== k.mv || turned;   // เริ่มเดิน/หยุดเดิน/เลี้ยว (คนน้อย) = จังหวะสำคัญ → ส่งซ้ำอีกครั้งใน 0.25 วินาที กันแพ็กเก็ตหาย
    this.sendFast(now);
    if (edge && !this.dupTimer) this.dupTimer = setTimeout(() => { this.dupTimer = null; if (this.mapReady && this.mapCh && this.mapPeers.size) this.sendFast(Date.now()); }, 250);
  }

  sendFast(now) {
    this.lastFast = this.lastAny = now;
    this.updateVel();
    const P = { k: this.key, s: this.sNow() };
    for (const k of FAST_KEYS) if (this.mine[k] !== undefined) P[k] = this.mine[k];
    this.fillVel(P);
    this.markSent();
    this.raw(this.mapCh, 'm', P);
  }

  onFast(p) {
    if (!p || typeof p.k !== 'string' || p.k === this.key) return;
    const now = Date.now(), e = this.mapPeers.get(p.k);
    if (!e) {                       // ไม่รู้จักคนนี้ (พลาดข้อมูลเต็ม) → ขอ hi
      this.mapPeers.set(p.k, { st: pickState(p, false), seen: now });
      if (now - this.lastHi > 3000) this.sendHi();
    } else { Object.assign(e.st, pickState(p, false)); e.seen = now; }
    this.emitPeers();
  }

  onFull(p) {
    if (!p || typeof p.k !== 'string' || p.k === this.key) return;
    const st = pickState(p, true);
    if (st.m && st.m !== this.mapId) return;           // ข้อความค้างจากแผนที่เก่า
    const now = Date.now(), e = this.mapPeers.get(p.k);
    if (e) { Object.assign(e.st, st); e.seen = now; }
    else { this.mapPeers.set(p.k, { st, seen: now }); this.queueFull(); }   // คนใหม่ → บอกข้อมูลเราให้เขาด้วย (กันต่างคนต่างไม่เห็นกัน)
    this.emitPeers();
  }

  onHi(p) { if (p && typeof p.k === 'string' && p.k !== this.key) this.queueFull(); }
  onBye(p) { if (p && typeof p.k === 'string' && this.mapPeers.delete(p.k)) this.emitPeers(); }

  /* ----- แชต + โทรโข่ง (ไม่พึ่งรายชื่อผู้เล่น: ข้อความมาถึงก็แสดงเลย) ----- */
  dup(id) { if (this.seenMsg.has(id)) return true; this.seenMsg.add(id); if (this.seenMsg.size > 200) this.seenMsg.delete(this.seenMsg.values().next().value); return false; }

  onSay(p) {
    if (!p || typeof p.k !== 'string' || p.k === this.key) return;
    const text = cutS(p.m, 120), t = clampN(p.t, 0, 9e15);
    if (!text || t === undefined || this.dup(p.k + '|' + t)) return;
    const now = Date.now(), e = this.mapPeers.get(p.k);
    if (e) e.seen = now; else if (now - this.lastHi > 1500) this.sendHi();
    if (this.sayHandler) this.sayHandler({ peer: p.k, name: cutS(p.n, 16) || (e && e.st.n) || '', text, t });
  }

  onShout(p) {
    if (!p || typeof p.k !== 'string' || p.k === this.key) return;
    const text = cutS(p.m, 80), t = clampN(p.t, 0, 9e15);
    if (!text || t === undefined || this.dup('sh' + p.k + '|' + t)) return;
    if (this.shoutHandler) this.shoutHandler({ peer: p.k, name: cutS(p.n, 16) || '', text, t });
  }

  sendSay(say) { this.sayQ.push({ say, at: Date.now(), tries: 0 }); this.flushSays(); }
  flushSays() {
    if (!this.mapReady || !this.mapCh) return;
    const now = Date.now(), q = this.sayQ; this.sayQ = [];
    for (const it of q) {
      if (now - it.at > 20000 || it.tries >= 5) continue;
      it.tries++;
      const ch = this.mapCh;
      this.raw(ch, 'say', { k: this.key, n: this.mine.n, t: it.say.t, m: it.say.m }).then((r) => {
        if (r !== 'ok' && ch === this.mapCh && it.tries < 5) { this.sayQ.push(it); setTimeout(() => this.flushSays(), 500 * it.tries); }
      });
    }
  }

  sendShout(sh) { this.shQ.push({ sh, at: Date.now(), tries: 0 }); this.flushShouts(); }
  flushShouts() {
    if (!this.lobbyReady || !this.lobby) return;
    const now = Date.now(), q = this.shQ; this.shQ = [];
    for (const it of q) {
      if (now - it.at > 20000 || it.tries >= 5) continue;
      it.tries++;
      const ch = this.lobby;
      this.raw(ch, 'sh', { k: this.key, n: this.mine.n, t: it.sh.t, m: it.sh.m }).then((r) => {
        if (r !== 'ok' && ch === this.lobby && it.tries < 5) { this.shQ.push(it); setTimeout(() => this.flushShouts(), 500 * it.tries); }
      });
    }
  }

  /* ----- เฝ้าระบบ (ทุก 1 วินาที) ----- */
  tick() {
    if (!this.roomOn) return;
    const now = Date.now();
    // 1) ช่องที่หลุด/ค้าง → สร้างใหม่
    if (!this.lobby) { if (now >= this.lobbyRetryAt) this.reopenLobby(true); }
    else if (!this.lobbyReady && now - this.lobbyAt > WATCHDOG_MS + this.lobbyBack) this.reopenLobby();
    else if (this.lobbyReady) { if (now >= this.lobbyNext) this.lobbySig = ''; if (!this.lobbySig) this.trackLobby(); }   // ส่งสถานะห้องรวมซ้ำทุก ~50 วินาที (กันข้อความ presence หล่น)
    if (this.mapId && !this.mapOpening) {
      if (!this.mapCh) { if (now >= this.mapRetryAt) this.joinMap(this.mapId, this.mapBack); }
      else if (!this.mapReady && now - this.mapAt > WATCHDOG_MS + this.mapBack) this.joinMap(this.mapId, Math.min(15000, (this.mapBack || 1000) * 2));
    }
    // 2) เต้นหัวใจ: ให้คนอื่นรู้ว่ายังอยู่ (และคนที่พลาดข้อมูลเต็มได้รับซ้ำ)
    if (this.mapReady && now - this.lastAny >= this.hbMs()) this.sendFull();
    // 3) คนที่ห้องรวมบอกว่าอยู่แมพเดียวกัน แต่ยังไม่เคยได้ยิน → ขอ hi
    let ask = false;
    if (this.mapReady && now - this.lastHi > 4000) for (const [k, l] of this.lobbyState) if (k !== this.key && l.m === this.mapId && !this.mapPeers.has(k)) { ask = true; break; }
    if (!ask && this.mapReady && now - this.lastHi > 4000) for (const [k, e] of this.mapPeers) { const l = this.lobbyState.get(k); if (!e.st.n && !(l && l.n)) { ask = true; break; } }   // เห็นแต่ตำแหน่ง ยังไม่รู้ชื่อ
    if (ask) this.sendHi();
    // 4) คนที่หายไป
    if (this.prune(now)) this.emitPeers();
  }

  prune(now = Date.now()) {
    let changed = false;
    for (const [k, e] of this.mapPeers) {
      const l = this.lobbyState.get(k);
      const gone = now - e.seen > PEER_TTL || (l && l.m && l.m !== this.mapId && now - e.seen > 1500);   // ห้องรวมบอกว่าย้ายแมพแล้ว + เงียบไปแล้ว
      if (gone) { this.mapPeers.delete(k); changed = true; }
    }
    return changed;
  }

  // เกมเรียกทุก ~0.12 วินาทีด้วยช่องที่เปลี่ยน (รูปแบบเดียวกับ room.presence ของ claude.ai)
  presence(patch) {
    if (!this.online || !patch) return;
    this.mine.u = this.uid8();
    const mapChanged = patch.m !== undefined && patch.m !== this.mine.m;
    let slow = false, fast = false;
    if ((patch.x !== undefined || patch.y !== undefined) && typeof this.mine.x === 'number' && typeof this.mine.y === 'number') {
      const nx = patch.x !== undefined ? patch.x : this.mine.x, ny = patch.y !== undefined ? patch.y : this.mine.y;
      if (Math.hypot(nx - this.mine.x, ny - this.mine.y) > 64) this.tp = (this.tp + 1) & 0xffff;   // กระโดดไกลผิดปกติ = วาร์ป: ให้ฝั่งรับย้ายตามทันทีไม่ไถล
    }
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'say' || k === 'sh') continue;
      this.mine[k] = v;
      if (FAST_KEYS.includes(k)) fast = true; else slow = true;
    }
    if (mapChanged) { if (this.roomOn) this.joinMap(this.mine.m); else this.mapId = this.mine.m; }
    if (slow) { this.trackLobby(); if (!mapChanged) this.queueFull(350); }
    if (fast) this.fastCheck();
    if (patch.say) this.sendSay(patch.say);
    if (patch.sh) this.sendShout(patch.sh);   // โทรโข่ง: ส่งผ่านห้องรวม ทุกแผนที่ได้ยิน
  }

  // รวมข้อมูลจากห้องรวม + ห้องแผนที่ → รายชื่อแบบเดียวกับ room.peers()
  buildPeers() {
    const myU = this.uid8();
    const keys = new Set([...this.lobbyState.keys(), ...this.mapPeers.keys()]);
    const out = [];
    for (const k of keys) {
      const ent = this.mapPeers.get(k);
      // ห้องรวมให้ชื่อ/อาชีพ/เลเวล (เป็น "สถานะ" ไม่หายแม้ข้อความหล่น) · ห้องแมพให้ตำแหน่ง/หน้าตา · เห็นผ่านห้องแมพ = อยู่แมพนี้แน่นอน
      const P = { ...(this.lobbyState.get(k) || {}) };
      if (ent) { Object.assign(P, ent.st); P.m = this.mapId; }
      if (!P.n) continue;
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
  connected() { return this.lobbyReady && (!this.mapId || this.mapReady); }
}
