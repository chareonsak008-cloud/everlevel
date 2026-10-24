// v0.91 แจ้งอัปเดตในเกม
// · ปุ่ม "อัปเดต" บนแถบด้านบน → หน้าต่างข่าวอัปเดต (เวอร์ชัน + เวลาอัปเดต + รายการที่เปลี่ยน) · มีป้าย NEW เมื่อยังไม่ได้อ่าน
// · เปิดเกมครั้งแรกหลังอัปเดต → เปิดหน้าต่างข่าวให้อัตโนมัติ 1 ครั้ง
// · เปิดเกมค้างไว้แล้วเว็บมีเวอร์ชันใหม่ (เช็ก version.json ทุก 3 นาที) → แถบแจ้ง "มีอัปเดตใหม่" + ปุ่ม "อัปเดตเลย" (เซฟก่อนแล้วโหลดหน้าใหม่)
import { VERSION, PATCH } from '../config.js?v=0.93.0-p3.35';
import { BUILT } from '../build.js?v=0.93.0-p3.35';
import { PATCH_NOTES } from '../data/patchNotes.js?v=0.93.0-p3.35';

const SEEN = 'everlevel.notes.seen';
const CUR = `${VERSION}#${PATCH || 0}`;   // เวอร์ชัน + ครั้งที่แก้ไข
// ใหม่กว่า = เลขเวอร์ชันสูงกว่า หรือเวอร์ชันเดียวกันแต่แก้ไขครั้งใหม่กว่า
const newerThan = (j) => j && (cmp(j.version, VERSION) > 0 || (cmp(j.version, VERSION) === 0 && (+j.patch || 0) > (PATCH || 0)));
const POLL_MS = 3 * 60 * 1000;
const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.'; }
  catch (e) { return String(iso).slice(0, 16).replace('T', ' '); }
};
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ไม่มีที่เก็บ */ } } };

export class UpdateNotice {
  constructor(root, game) {
    this.g = game; this.root = root; this.remote = null; this.timer = null;
    const hud = root.querySelector('.hud') || root;
    // ปุ่มบนแถบด้านบน (หน้าปุ่มพับ/กาง)
    const bar = root.querySelector('#topBar');
    if (bar) {
      const b = this.btn = document.createElement('button');
      b.type = 'button'; b.className = 'tb-btn tb-news'; b.title = 'ข่าวอัปเดต';
      b.innerHTML = `<i class="tb-emo" aria-hidden="true">🔔</i><span>อัปเดต</span><b class="tb-badge tb-new" hidden>NEW</b>`;
      b.addEventListener('click', () => this.toggle());
      const tog = bar.querySelector('.tb-toggle'); bar.insertBefore(b, tog || null);
    }
    // หน้าต่างข่าวอัปเดต
    const w = this.el = document.createElement('section');
    w.className = 'panel tm newsw'; w.hidden = true; w.setAttribute('aria-labelledby', 'newsTitle');
    w.innerHTML = `<header class="st-head"><div><h2 id="newsTitle">ข่าวอัปเดต</h2><p class="nw-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="nw-body"></div>`;
    w.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) w.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    hud.append(w);
    // แถบแจ้งเวอร์ชันใหม่
    const bn = this.banner = document.createElement('div');
    bn.className = 'upd-banner'; bn.hidden = true; bn.setAttribute('role', 'status');
    bn.innerHTML = `<i aria-hidden="true">📢</i><span class="ub-t"></span><button type="button" class="ub-see">ดูว่ามีอะไรใหม่</button><button type="button" class="primary ub-go">อัปเดตเลย</button><button type="button" class="ub-x" aria-label="ซ่อน">✕</button>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) bn.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    bn.querySelector('.ub-see').addEventListener('click', () => this.toggle(true));
    bn.querySelector('.ub-go').addEventListener('click', () => this.reload());
    bn.querySelector('.ub-x').addEventListener('click', () => { bn.hidden = true; this.dismissed = this.remote && this.remote.version; });
    hud.append(bn);
  }

  get open() { return !this.el.hidden; }
  notes() { return PATCH_NOTES.map((n, i) => (i === 0 && n.v === VERSION && !n.date ? { ...n, date: BUILT } : n)); }
  isCur(n) { return n.v === VERSION && (n.fix || 0) === (PATCH || 0); }

  start() {
    const seen = store.get(SEEN);
    const unseen = !seen || seen !== CUR;
    if (this.btn) this.btn.querySelector('.tb-new').hidden = !unseen;
    if (unseen && seen) setTimeout(() => { if (!this.g.player || this.g.player.dead) return; this.toggle(true); }, 2500);   // อัปเดตแล้ว → เปิดข่าวให้ 1 ครั้ง
    else if (!seen) store.set(SEEN, CUR);   // ผู้เล่นใหม่ ไม่ต้องเด้งหน้าต่าง (ยังเห็นป้าย NEW จนกว่าจะเปิดดู)
    this.check();
    this.timer = setInterval(() => this.check(), POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (this.lastCheck || 0) > 60000) this.check(); });
  }

  async check() {
    this.lastCheck = Date.now();
    if (location.protocol === 'file:') return;
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      if (!j || typeof j.version !== 'string') return;
      this.remote = j;
      if (newerThan(j) && this.dismissed !== j.version + '#' + (j.patch || 0)) this.showBanner(j);
    } catch (e) { /* ออฟไลน์/ไม่มีไฟล์ ไม่เป็นไร */ }
  }

  showBanner(j) {
    const t = this.banner.querySelector('.ub-t');
    const fix = j.version === VERSION;
    t.textContent = fix ? `มีการแก้ไขใหม่${j.note ? `: ${j.note}` : ''}${j.built ? ` · ${fmtDate(j.built)}` : ''}` : `มีอัปเดตใหม่ v${j.version}${j.built ? ` · อัปเดตเมื่อ ${fmtDate(j.built)}` : ''} (ตอนนี้ v${VERSION})`;
    if (this.banner.hidden) { this.banner.hidden = false; this.g.hud && this.g.hud.log(`📢 มีอัปเดตใหม่ v${j.version} — กดปุ่ม "อัปเดตเลย" ด้านบนเพื่อโหลดเวอร์ชันใหม่ (เซฟให้อัตโนมัติ)`, 'sys'); this.g.sfx && this.g.sfx('chat'); }
  }

  async reload() {
    const b = this.banner.querySelector('.ub-go'); b.disabled = true; b.textContent = 'กำลังเซฟ…';
    try { await Promise.race([this.g.saveNow(false, true), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* เซฟไม่ได้ก็โหลดต่อ */ }
    // v0.93 fix13 โหลดหน้าใหม่แบบข้ามแคช (เดิม location.reload() ได้หน้าเว็บเก่าจากแคช → แถบแจ้งอัปเดตขึ้นซ้ำ)
    try { sessionStorage.setItem('everlevel.fresh', String(Date.now())); await fetch('index.html', { cache: 'reload' }); } catch (e) { /* ออฟไลน์ */ }
    const u = new URL(location.href); u.searchParams.set('u', Date.now().toString(36)); location.replace(u.toString());
  }

  toggle(force) {
    const on = typeof force === 'boolean' ? force : this.el.hidden;
    this.el.hidden = !on;
    if (!on) return;
    store.set(SEEN, CUR);
    if (this.btn) this.btn.querySelector('.tb-new').hidden = true;
    this.render();
  }

  render() {
    const newer = newerThan(this.remote) ? this.remote : null, nfix = newer && newer.version === VERSION;
    this.el.querySelector('.nw-sub').textContent = `เวอร์ชันที่เล่นอยู่ v${VERSION}${PATCH ? ` (แก้ไขครั้งที่ ${PATCH})` : ''}${newer ? (nfix ? ' · มีการแก้ไขใหม่แล้ว' : ` · มีเวอร์ชันใหม่ v${newer.version} แล้ว`) : ' · ล่าสุดแล้ว'}`;
    const body = this.el.querySelector('.nw-body');
    body.innerHTML = (newer ? `<div class="nw-new"><b>${nfix ? 'มีการแก้ไขใหม่' : `มีอัปเดตใหม่ v${newer.version}`}</b><span>อัปเดตเมื่อ ${fmtDate(newer.built)}</span><button type="button" class="primary nw-go">อัปเดตเลย</button></div>` : '')
      + this.notes().map((n) => `<article class="nw-item${this.isCur(n) ? ' cur' : ''}${n.fix ? ' fix' : ''}"><header><span class="nw-v">${n.fix ? `แก้ไข · v${n.v}` : `v${n.v}`}</span><b>${n.title || ''}</b>${this.isCur(n) ? '<em>ล่าสุด</em>' : ''}<time>${fmtDate(n.date)}</time></header><ul>${n.items.map((x) => `<li>${x}</li>`).join('')}</ul></article>`).join('');
    const go = body.querySelector('.nw-go'); if (go) go.addEventListener('click', () => this.reload());
  }
}
