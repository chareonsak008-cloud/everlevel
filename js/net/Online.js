// ระบบออนไลน์ (v0.11) — บัญชีผู้เล่นผูกกับบัญชี Claude ของผู้เปิดหน้าเกม (ไม่ต้องตั้งรหัสผ่าน ปลอดภัยกว่า)
// · เซฟบนคลาวด์: data/users/<id>/ (ส่วนตัว อ่านได้เฉพาะเจ้าของ) — ตัวละครสูงสุด 3 ตัว + คลังของบัญชี
// · ทะเบียนชื่อ: names/<รหัสชื่อ> (กันชื่อซ้ำ) · อันดับ: players/<id> (ทุกคนอ่านได้ เขียนได้เฉพาะของตัวเอง)
// · ผู้เล่นในแผนที่เดียวกัน: room presence (ตำแหน่ง หน้าตา ข้อความแชต) — ไม่เก็บถาวร
// ถ้าเปิดนอก claude.ai หรือไม่มีสิทธิ์ → ทำงานแบบออฟไลน์ (เซฟในเครื่อง) เหมือนเดิม
export const MAX_CHARS = 3;

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
// ชื่อภาษาไทยใช้เป็น path ตรง ๆ ไม่ได้ → เข้ารหัสเป็นเลขฐานสิบหกของ UTF-8
export function nameKey(name) {
  const bytes = new TextEncoder().encode(name.trim().toLowerCase());
  return 'n' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function validName(name) {
  const n = (name || '').trim();
  if (n.length < 2 || n.length > 16) return 'ชื่อต้องยาว 2–16 ตัวอักษร';
  if (!/^[\p{L}\p{M}\p{N} _\-.]+$/u.test(n)) return 'ใช้ได้เฉพาะตัวอักษร ตัวเลข เว้นวรรค และ _ - .';
  return null;
}

export class Online {
  constructor() {
    this.kind = 'claude';       // claude (เปิดผ่าน claude.ai) | supabase (net/SupabaseOnline.js)
    this.label = 'เข้าสู่ระบบด้วยบัญชี Claude';
    this.mode = 'offline';      // offline | online
    this.reason = '';
    this.db = null; this.user = null; this.room = null; this.uid = null; this.me = null;
    this.canWrite = null;
    this.slot = 0;
    this.saveBusy = false; this.pending = null; this.lastWrite = 0;
    this.peersHandler = null;
    this.lastPlayersDoc = '';
  }

  get online() { return this.mode === 'online'; }

  async init() {
    if (!window.claude || typeof window.claude.use !== 'function') { this.reason = 'เปิดเกมนอก claude.ai'; return false; }
    const [user, db, room] = await withTimeout(Promise.all([window.claude.use('user'), window.claude.use('db'), window.claude.use('room')]), 12000) || [];
    this.user = user || null; this.db = db || null; this.room = room || null;
    if (!user || !db) { this.reason = 'ไม่ได้ลงชื่อเข้าใช้ หรือหน้านี้ไม่ได้เปิดผ่าน claude.ai'; return false; }
    this.uid = await user.id();
    if (!this.uid) { this.reason = 'บัญชีนี้ไม่มีสิทธิ์เล่นออนไลน์'; return false; }
    this.me = await user.me();
    this.canWrite = await user.can('data.write');
    this.mode = 'online';
    return true;
  }

  userDoc(name) { return this.db.doc(`data/users/${this.uid}/${name}`); }

  // บัญชี: รายชื่อตัวละคร + คลังเก็บของ (ใช้ร่วมทุกตัวละคร)
  async account() {
    const snap = await this.userDoc('account').get();
    const a = snap.exists ? { ...snap.data() } : {};
    a.chars = Array.isArray(a.chars) ? a.chars.slice(0, MAX_CHARS) : [];
    while (a.chars.length < MAX_CHARS) a.chars.push(null);
    return a;
  }

  async loadChar(slot) {
    const snap = await this.userDoc('c' + slot).get();
    return snap.exists ? snap.data() : null;
  }

  // จองชื่อ (กันชื่อซ้ำกับผู้เล่นคนอื่น) — คืน null ถ้าสำเร็จ หรือข้อความผิดพลาด
  async claimName(name, slot) {
    const ref = this.db.doc('names/' + nameKey(name));
    try {
      const lease = await ref.acquire({ holder: this.uid, ttlMs: 5000 });
      if (!lease.acquired) return 'มีคนกำลังใช้ชื่อนี้อยู่ ลองใหม่อีกครั้ง';
      const snap = await ref.get();
      const d = snap.exists ? snap.data() : null;
      if (d && d.uid && d.uid !== this.uid) return 'ชื่อนี้มีผู้เล่นคนอื่นใช้แล้ว';
      await ref.set({ uid: this.uid, slot, t: Date.now() });
      return null;
    } catch (e) {
      if (e && e.code === 'invalid_argument') { this.canWrite = false; return 'บัญชีนี้บันทึกบนคลาวด์ไม่ได้ — กด "ย้อนกลับ" แล้วเลือก "เล่นกับเพื่อน (เซฟในเครื่องนี้)"'; }
      return 'จองชื่อไม่สำเร็จ ลองใหม่อีกครั้ง';
    }
  }

  async releaseName(name) {
    try {
      const ref = this.db.doc('names/' + nameKey(name));
      const snap = await ref.get();
      if (snap.exists && snap.data().uid === this.uid) await ref.delete();
    } catch (e) { /* ไม่เป็นไร */ }
  }

  async deleteChar(slot, name) {
    const a = await this.account();
    a.chars[slot - 1] = null;
    await this.userDoc('account').set({ chars: a.chars, storage: a.storage || [], t: Date.now() });
    await this.userDoc('c' + slot).delete();
    if (name) await this.releaseName(name);
  }

  // บันทึกตัวละคร (เขียนทีละครั้ง ไม่ถี่เกิน 1 ครั้งต่อ 4 วินาที — ครั้งที่ขอระหว่างรอจะเขียนตามหลัง)
  save(state, force = false) {
    if (!this.online || !this.slot) return Promise.resolve(false);
    this.pending = state;
    if (this.saveBusy) return Promise.resolve(true);
    const wait = force ? 0 : Math.max(0, 4000 - (Date.now() - this.lastWrite));
    this.saveBusy = true;
    return new Promise((res) => setTimeout(async () => {
      let ok = true;
      while (this.pending) {
        const s = this.pending; this.pending = null;
        try { await this.writeState(s); this.lastWrite = Date.now(); this.lastError = null; } catch (e) { ok = false; this.lastError = e; console.warn('บันทึกออนไลน์ไม่สำเร็จ', e); break; }
      }
      this.saveBusy = false;
      res(ok);
    }, wait));
  }

  // รอให้การบันทึกที่ค้างอยู่เขียนเสร็จ (ก่อนเปลี่ยนตัวละคร/โหลดหน้าใหม่)
  async flush(ms = 8000) {
    const t0 = Date.now();
    while ((this.saveBusy || this.pending) && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100));
    return !this.saveBusy && !this.pending;
  }

  async writeState(s) {
    const p = s.player || {};
    await this.userDoc('c' + this.slot).set({ ...s, savedAt: Date.now() });
    const summary = { name: p.name, job: p.job, lv: p.baseLevel || 1, jlv: p.jobLevel || 1, map: p.map, t: Date.now() };
    const a = await this.account();
    const old = a.chars[this.slot - 1] || {};
    const storageStr = JSON.stringify(s.storage || []);
    if (JSON.stringify({ ...old, t: 0 }) !== JSON.stringify({ ...summary, t: 0 }) || JSON.stringify(a.storage || []) !== storageStr) {
      a.chars[this.slot - 1] = summary;
      await this.userDoc('account').set({ chars: a.chars, storage: s.storage || [], t: Date.now() });
    }
    // อันดับสาธารณะ: เขียนเมื่อเลเวล/อาชีพ/ชื่อเปลี่ยนเท่านั้น
    const pub = JSON.stringify({ n: p.name, j: p.job, lv: summary.lv, jlv: summary.jlv });
    if (pub !== this.lastPlayersDoc) {
      try { await this.db.doc('players/' + this.uid).set({ name: p.name, job: p.job, lv: summary.lv, jlv: summary.jlv, t: Date.now() }); this.lastPlayersDoc = pub; } catch (e) { /* อันดับไม่สำคัญเท่าเซฟ */ }
    }
  }

  async leaderboard(n = 20) {
    try {
      const snap = await this.db.collection('players').orderBy('lv', 'desc').limit(n).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  /* ---------- ผู้เล่นพร้อมกัน (room presence) ---------- */
  connectRoom(onPeers) {
    if (!this.room) return false;
    this.peersHandler = onPeers;
    try { this.unsubPeers = this.room.onPeers((ch) => this.peersHandler && this.peersHandler(ch), () => { this.roomDead = true; }); } catch (e) { return false; }
    return true;
  }

  presence(patch) {
    if (!this.room || this.roomDead) return;
    this.room.presence(patch).catch(() => { /* ส่งไม่ได้ชั่วคราว ไม่เป็นไร */ });
  }

  peers() { try { return this.room && !this.roomDead ? this.room.peers() : []; } catch (e) { return []; } }
  connected() { try { return !!this.room && !this.roomDead && this.room.connected(); } catch (e) { return false; } }
}
