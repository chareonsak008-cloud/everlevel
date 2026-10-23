// v0.92 แจ้งปัญหา / ข้อเสนอแนะถึง GM
// · ผู้เล่น: เลือกหมวด → เขียนรายละเอียด → ส่ง (แนบเวอร์ชัน แผนที่ ตำแหน่ง อุปกรณ์ และ error ล่าสุดให้อัตโนมัติ) · ดูสถานะเรื่องของตัวเอง + คำตอบจาก GM
// · GM (บัญชีในตาราง admins): ดูทุกเรื่อง กรองตามสถานะ เปลี่ยนสถานะ ตอบกลับ ลบ · มีตัวเลขเรื่องใหม่บนปุ่ม
import { VERSION } from '../config.js?v=0.93.0-p3.28';

export const FB_KINDS = [['bug', 'บั๊ก / เกมพัง'], ['balance', 'ความสมดุล'], ['idea', 'ข้อเสนอแนะ'], ['cheat', 'แจ้งผู้เล่นโกง'], ['other', 'อื่น ๆ']];
const KIND = Object.fromEntries(FB_KINDS);
const STATUS = { new: ['ใหม่', 'st-new'], doing: ['กำลังแก้', 'st-doing'], done: ['แก้แล้ว', 'st-done'], wontfix: ['ไม่แก้ / ปิด', 'st-wont'] };
const HINT = {
  bug: 'เกิดอะไรขึ้น · ทำอะไรก่อนเกิด · เกิดทุกครั้งไหม (เช่น "กดสกิล X ตอนขี่ม้าแล้วตัวละครค้าง")',
  balance: 'อะไรง่าย/ยากเกินไป · มอน/สกิล/ไอเทมตัวไหน · อยากให้ปรับยังไง',
  idea: 'อยากให้เพิ่มหรือเปลี่ยนอะไร · ทำไมถึงคิดว่าดี',
  cheat: 'ชื่อผู้เล่น · เห็นอะไร · ที่ไหน เวลาไหน (ห้ามใส่ข้อมูลส่วนตัวของใคร)',
  other: 'เขียนรายละเอียดถึง GM',
};
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = (iso) => { try { return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

// เก็บ error ล่าสุด 5 รายการ (แนบไปกับเรื่องบั๊กช่วยให้ GM หาสาเหตุได้เร็ว)
const ERRS = [];
const pushErr = (m) => { const s = String(m || '').replace(/https?:\/\/\S+\//g, '').slice(0, 160); if (!s || ERRS.includes(s)) return; ERRS.push(s); if (ERRS.length > 5) ERRS.shift(); };
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => pushErr(e.message + (e.filename ? ` @${String(e.filename).split('/').pop().split('?')[0]}:${e.lineno}` : '')));
  window.addEventListener('unhandledrejection', (e) => pushErr('promise: ' + ((e.reason && (e.reason.message || e.reason)) || '')));
}
function device() {
  const ua = navigator.userAgent || '';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'อื่น ๆ';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'อื่น ๆ';
  return `${os} · ${br}`;
}

export class FeedbackWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'send'; this.kind = 'bug'; this.gmFilter = 'new'; this.newCount = 0;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm fbw'; el.hidden = true; el.setAttribute('aria-labelledby', 'fbTitle');
    el.innerHTML = `<header class="st-head"><div><h2 id="fbTitle">แจ้งปัญหา / ข้อเสนอแนะ</h2><p>ส่งถึงทีม GM โดยตรง · ช่วยให้เกมดีขึ้น</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="inv-tabs tm-tabs fb-tabs" role="tablist"></div><div class="fb-body"></div>`;
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.addEventListener('keydown', (e) => e.stopPropagation());   // พิมพ์แล้วไม่ไปกดปุ่มลัดในเกม
    (root.querySelector('.hud') || root).append(el);
    this.body = el.querySelector('.fb-body');
  }

  get open() { return !this.el.hidden; }
  get net() { const o = this.g.online; return this.g.mode === 'online' && o && typeof o.sendFeedback === 'function' ? o : null; }
  get gm() { return !!(this.g.mailbox && this.g.mailbox.admin); }

  toggle(force) {
    const on = typeof force === 'boolean' ? force : this.el.hidden;
    this.el.hidden = !on;
    if (on) this.render();
  }
  show(tab) { if (tab) this.tab = tab; this.toggle(true); }

  // GM: นับเรื่องใหม่เป็นระยะ → ตัวเลขบนปุ่ม
  async poll() {
    if (!this.gm || !this.net) { this.setBadge(0); return; }
    try { this.setBadge(await this.net.countNewFeedback()); } catch (e) { /* ไม่เป็นไร */ }
  }
  // ผู้เล่น: GM เปลี่ยนสถานะ/ตอบเรื่องที่เคยแจ้ง → แจ้งในแชตระบบ (ครั้งเดียวต่อการเปลี่ยนแปลง)
  async checkReplies() {
    if (!this.net) return;
    const KEY = 'everlevel.fb.seen';
    let seen = 0; try { seen = +localStorage.getItem(KEY) || 0; } catch (e) { /* */ }
    let rows; try { rows = await this.net.listFeedback({ mine: true, limit: 30 }); } catch (e) { return; }
    const fresh = rows.filter((r) => r.status !== 'new' && Date.parse(r.updated_at) > seen && Date.parse(r.updated_at) > Date.parse(r.created_at) + 1000);
    const top = rows.reduce((m, r) => Math.max(m, Date.parse(r.updated_at) || 0), seen);
    try { localStorage.setItem(KEY, String(top)); } catch (e) { /* */ }
    if (!seen || !fresh.length) return;   // ครั้งแรกในเครื่องนี้ = จำไว้เฉย ๆ
    for (const r of fresh.slice(0, 3)) this.g.hud && this.g.hud.log(`📮 GM อัปเดตเรื่องที่คุณแจ้ง: "${String(r.body).slice(0, 40)}${r.body.length > 40 ? '…' : ''}" → ${(STATUS[r.status] || STATUS.new)[0]}${r.gm_note ? ` · ${r.gm_note}` : ''}`, 'sys');
  }
  setBadge(n) { this.newCount = n; if (this.onBadge) this.onBadge(n); }

  info() {
    const g = this.g, p = g.player, set = g.settings || {};
    return {
      v: VERSION, map: g.map && g.map.id, x: p ? Math.floor(p.x / 16) : null, y: p ? Math.floor(p.y / 16) : null,
      job: p && p.jobId, lv: p && p.baseLevel, dev: device(), scr: `${innerWidth}x${innerHeight}@${(devicePixelRatio || 1).toFixed(1)}`,
      touch: document.body.classList.contains('touch'), fps: g.lastFps || null, hd: set.hd !== false, q: set.quality,
      t: new Date().toISOString(), err: ERRS.slice(),
    };
  }

  render() {
    if (!this.open) return;
    const tabs = [['send', 'ส่งเรื่อง'], ['mine', 'เรื่องของฉัน'], ...(this.gm ? [['gm', `GM: ทุกเรื่อง${this.newCount ? ` (${this.newCount})` : ''}`]] : [])];
    if (!tabs.some(([k]) => k === this.tab)) this.tab = 'send';
    const T = this.el.querySelector('.fb-tabs');
    T.innerHTML = tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.tab === k}">${n}</button>`).join('');
    T.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.t; this.render(); }));
    if (!this.net) { this.body.innerHTML = '<p class="fb-off">ระบบแจ้งปัญหาใช้ได้เมื่อเล่นออนไลน์ — เข้าสู่ระบบแล้วลองใหม่</p>'; return; }
    if (this.tab === 'send') this.renderSend(); else this.renderList(this.tab === 'gm');
  }

  renderSend() {
    const I = this.info();
    this.body.innerHTML = `
      <div class="fb-kinds" role="radiogroup" aria-label="หมวด">${FB_KINDS.map(([k, n]) => `<button type="button" role="radio" data-k="${k}" aria-checked="${this.kind === k}"${this.kind === k ? ' class="primary"' : ''}>${n}</button>`).join('')}</div>
      <label class="fb-field"><span>รายละเอียด</span><textarea maxlength="1000" rows="5" placeholder="${esc(HINT[this.kind])}">${esc(this.draft || '')}</textarea><small class="fb-cnt">0/1000</small></label>
      <label class="fb-attach"><input type="checkbox" checked> แนบข้อมูลช่วยตรวจสอบ</label>
      <p class="fb-info">v${esc(I.v)} · ${esc(I.map)} (${I.x}, ${I.y}) · ${esc(I.job)} Lv.${I.lv} · ${esc(I.dev)} · จอ ${esc(I.scr)} · ${I.fps || '-'} FPS${I.err.length ? ` · error ล่าสุด ${I.err.length} รายการ` : ''}</p>
      <p class="fb-msg" role="status"></p>
      <div class="fb-act"><button type="button" class="primary fb-send">ส่งถึง GM</button></div>`;
    const ta = this.body.querySelector('textarea'), cnt = this.body.querySelector('.fb-cnt'), msg = this.body.querySelector('.fb-msg');
    const upd = () => { cnt.textContent = `${ta.value.length}/1000`; this.draft = ta.value; };
    ta.addEventListener('input', upd); upd();
    this.body.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { this.kind = b.dataset.k; this.renderSend(); }));
    const send = this.body.querySelector('.fb-send');
    send.addEventListener('click', async () => {
      const body = ta.value.trim();
      if (body.length < 5) { msg.textContent = 'เขียนรายละเอียดอย่างน้อย 5 ตัวอักษร'; msg.className = 'fb-msg bad'; return; }
      send.disabled = true; msg.className = 'fb-msg'; msg.textContent = 'กำลังส่ง…';
      const att = this.body.querySelector('.fb-attach input').checked;
      const err = await this.net.sendFeedback({ kind: this.kind, body, char: this.g.player && this.g.player.name, info: att ? this.info() : { v: VERSION } });
      send.disabled = false;
      if (err) { msg.textContent = err; msg.className = 'fb-msg bad'; return; }
      this.draft = ''; this.g.hud && this.g.hud.log('ส่งเรื่องถึง GM แล้ว ขอบคุณที่ช่วยแจ้ง — ดูสถานะได้ที่แท็บ "เรื่องของฉัน"', 'sys');
      this.g.sfx && this.g.sfx('chat');
      this.tab = 'mine'; this.render();
      if (this.gm) this.poll();
    });
  }

  async renderList(gm) {
    const tok = (this.tok = (this.tok || 0) + 1);
    this.body.innerHTML = `${gm ? `<div class="fb-filter">${[['new', 'ใหม่'], ['doing', 'กำลังแก้'], ['done', 'แก้แล้ว'], ['wontfix', 'ปิด'], ['', 'ทั้งหมด']].map(([k, n]) => `<button type="button" data-f="${k}" aria-pressed="${this.gmFilter === k}"${this.gmFilter === k ? ' class="primary"' : ''}>${n}</button>`).join('')}<button type="button" class="fb-reload" title="โหลดใหม่">↻</button></div>` : ''}<div class="fb-list"><p class="fb-off">กำลังโหลด…</p></div>`;
    if (gm) {
      this.body.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { this.gmFilter = b.dataset.f; this.renderList(true); }));
      this.body.querySelector('.fb-reload').addEventListener('click', () => { this.renderList(true); this.poll(); });
    }
    let rows;
    try { rows = await this.net.listFeedback({ mine: !gm, status: gm ? this.gmFilter || null : null }); } catch (e) { if (tok === this.tok) this.body.querySelector('.fb-list').innerHTML = `<p class="fb-off">${esc(e.message)}</p>`; return; }
    if (tok !== this.tok || !this.open) return;
    const L = this.body.querySelector('.fb-list');
    if (!rows.length) { L.innerHTML = `<p class="fb-off">${gm ? 'ไม่มีเรื่องในหมวดนี้' : 'ยังไม่เคยส่งเรื่อง — แท็บ "ส่งเรื่อง" เพื่อแจ้งปัญหาหรือเสนอไอเดีย'}</p>`; return; }
    L.innerHTML = rows.map((r) => {
      const [sn, sc] = STATUS[r.status] || STATUS.new, I = r.info || {};
      const meta = gm ? `<small class="fb-meta">${esc(r.char_name || '?')} · v${esc(I.v || '?')}${I.map ? ` · ${esc(I.map)} (${I.x}, ${I.y})` : ''}${I.job ? ` · ${esc(I.job)} Lv.${esc(I.lv)}` : ''}${I.dev ? ` · ${esc(I.dev)} · ${esc(I.scr)} · ${esc(I.fps || '-')} FPS${I.hd ? ' · HD' : ''}` : ''}</small>${I.err && I.err.length ? `<details class="fb-err"><summary>error ${I.err.length} รายการ</summary><pre>${esc(I.err.join('\n'))}</pre></details>` : ''}` : '';
      const gmBox = gm ? `<div class="fb-gm"><select aria-label="สถานะ">${Object.entries(STATUS).map(([k, [n]]) => `<option value="${k}"${k === r.status ? ' selected' : ''}>${n}</option>`).join('')}</select><input type="text" maxlength="500" placeholder="ตอบกลับผู้เล่น (ไม่บังคับ)" value="${esc(r.gm_note || '')}"><button type="button" class="primary fb-save">บันทึก</button><button type="button" class="fb-del" title="ลบเรื่องนี้">🗑</button></div>` : r.gm_note ? `<p class="fb-reply"><b>GM ตอบ:</b> ${esc(r.gm_note)}</p>` : '';
      return `<article class="fb-item" data-id="${r.id}"><header><span class="fb-kind k-${esc(r.kind)}">${esc(KIND[r.kind] || r.kind)}</span><span class="fb-st ${sc}">${sn}</span><time>${when(r.created_at)}</time></header><p class="fb-text">${esc(r.body)}</p>${meta}${gmBox}</article>`;
    }).join('');
    if (!gm) return;
    L.querySelectorAll('.fb-item').forEach((it) => {
      const id = +it.dataset.id, st = it.querySelector('select'), note = it.querySelector('input');
      it.querySelector('.fb-save').addEventListener('click', async (e) => {
        e.target.disabled = true;
        const err = await this.net.updateFeedback(id, { status: st.value, gm_note: note.value.trim() });
        e.target.disabled = false;
        if (err) { this.g.hud && this.g.hud.log(err, 'sys'); return; }
        this.g.hud && this.g.hud.log(`อัปเดตเรื่อง #${id} แล้ว`, 'sys'); this.poll(); this.renderList(true);
      });
      it.querySelector('.fb-del').addEventListener('click', async () => {
        if (it.dataset.confirm !== '1') { it.dataset.confirm = '1'; it.querySelector('.fb-del').classList.add('warn'); it.querySelector('.fb-del').title = 'กดอีกครั้งเพื่อยืนยันการลบ'; return; }
        const err = await this.net.deleteFeedback(id);
        if (err) { this.g.hud && this.g.hud.log(err, 'sys'); return; }
        this.poll(); this.renderList(true);
      });
    });
  }
}
