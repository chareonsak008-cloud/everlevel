// v0.37 ช่อง Realtime เสริม (ปาร์ตี้ / กิลด์) — presence = รายชื่อสมาชิกที่ออนไลน์ · broadcast = แชต / แชร์ EXP / เตะ
// เฝ้าสถานะเอง: หลุด/ค้างเกิน 7 วินาทีสร้างใหม่ (หน่วงเพิ่มทีละเท่าถึง 15 วินาที) · ปิดแล้วไม่เชื่อมใหม่
const WATCHDOG_MS = 7000;
const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), new Promise((r) => setTimeout(() => r(null), ms))]);

export class SideChannel {
  constructor(sb, name, key, { events = [], onEvent, onSync, onReady } = {}) {
    this.sb = sb; this.name = name; this.key = key;
    this.events = events; this.onEvent = onEvent; this.onSync = onSync; this.onReady = onReady;
    this.ch = null; this.ready = false; this.closed = false; this.at = 0; this.back = 0; this.busy = false;
    this.state = null; this.sig = ''; this.members = new Map();
    this.open();
  }

  open() {
    if (this.closed) return;
    try { if (typeof this.sb.getChannels === 'function') for (const c of this.sb.getChannels()) if (c && c.topic === 'realtime:' + this.name) this.sb.removeChannel(c); } catch (e) { /* ไม่เป็นไร */ }
    let ch;
    try { ch = this.sb.channel(this.name, { config: { presence: { key: this.key }, broadcast: { self: false } } }); } catch (e) { this.ch = null; this.at = Date.now(); return; }
    this.ch = ch; this.ready = false; this.at = Date.now(); this.sig = '';
    const mine = () => ch === this.ch && !this.closed;
    try {
      for (const ev of this.events) ch.on('broadcast', { event: ev }, ({ payload }) => { if (mine() && payload && typeof payload === 'object' && payload.k !== this.key) this.onEvent && this.onEvent(ev, payload); });
      ch.on('presence', { event: 'sync' }, () => { if (!mine()) return; this.members = this.read(ch); this.onSync && this.onSync(this.members); });
      ch.subscribe((status) => {
        if (!mine()) return;
        if (status === 'SUBSCRIBED') { this.ready = true; this.back = 0; this.sig = ''; this.push(); this.onReady && this.onReady(); }
        else { this.ready = false; this.at = Date.now(); }
      });
    } catch (e) { this.ch = null; }
  }

  read(ch) {
    const out = new Map();
    let st = {};
    try { st = ch.presenceState() || {}; } catch (e) { st = {}; }
    for (const [k, metas] of Object.entries(st)) {
      const last = Array.isArray(metas) && metas.length ? metas[metas.length - 1] : null;
      if (last && typeof last === 'object') { const { presence_ref, ...rest } = last; out.set(k, rest); }
    }
    return out;
  }

  track(state) { this.state = state; this.push(); }
  push() {
    if (!this.ready || !this.ch || !this.state) return;
    const sig = JSON.stringify(this.state);
    if (sig === this.sig) return;
    this.sig = sig;
    const ch = this.ch;
    Promise.resolve(ch.track(this.state)).then((r) => { if (r !== 'ok' && ch === this.ch) this.sig = ''; }, () => { if (ch === this.ch) this.sig = ''; });
  }

  send(event, payload) {
    if (!this.ready || !this.ch) return Promise.resolve('error');
    try { return Promise.resolve(this.ch.send({ type: 'broadcast', event, payload: { ...payload, k: this.key } })).catch(() => 'error'); } catch (e) { return Promise.resolve('error'); }
  }

  // เรียกทุก ~1 วินาที
  tick() {
    if (this.closed || this.busy) return;
    if (this.ready) { if (!this.sig) this.push(); return; }
    if (Date.now() - this.at < WATCHDOG_MS + this.back) return;
    this.back = Math.min(15000, (this.back || 1000) * 2);
    this.reopen();
  }

  async reopen() {
    this.busy = true;
    const old = this.ch; this.ch = null; this.ready = false;
    try { if (old) await withTimeout(this.sb.removeChannel(old), 2500); } catch (e) { /* ปิดไปแล้ว */ }
    this.busy = false;
    if (!this.closed) this.open();
  }

  close() {
    this.closed = true; this.ready = false;
    const ch = this.ch; this.ch = null; this.members = new Map();
    if (ch) { try { Promise.resolve(ch.untrack()).catch(() => {}); } catch (e) { /* */ } try { Promise.resolve(this.sb.removeChannel(ch)).catch(() => {}); } catch (e) { /* */ } }
  }
}
