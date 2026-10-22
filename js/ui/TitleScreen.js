// หน้าจอเข้าเกม (v0.11): เข้าสู่ระบบ → เลือก/สร้างตัวละคร (สูงสุด 3 ตัว)
// v0.17.1: เอาโหมดออฟไลน์ออก — ต่อเซิร์ฟเวอร์ไม่ได้ = แจ้งเตือน + ปุ่มลองใหม่ (ไม่มีทางเลือกเล่นออฟไลน์)
import { MAX_CHARS, validName } from '../net/Online.js?v=0.90.0';
import { BETA } from '../data/beta.js?v=0.90.0';
import { MAPS } from '../data/maps/index.js?v=0.90.0';
import { JOBS } from '../data/progression.js?v=0.90.0';
import { VERSION, ALLOW_OFFLINE } from '../config.js?v=0.90.0';

const HAIR = ['#e8a838', '#5e3f27', '#2a2430', '#c4467c', '#b8c8ff', '#e8e2d0', '#d8433a', '#4a8a5a'];
const STYLES = [['spiky', 'ผมชี้'], ['short', 'ผมสั้น'], ['ponytail', 'หางม้า']];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class TitleScreen {
  constructor(root, { online, audio, localSave }) {
    this.root = root; this.online = online; this.audio = audio; this.localSave = localSave;
    const el = this.el = document.createElement('div');
    el.className = 'title-screen';
    el.innerHTML = `
      <div class="tt-sky" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="tt-box">
        <h1 class="tt-logo"><img src="assets/brand/logo.png" alt="Everlevel" draggable="false"></h1>
        <p class="tt-sub">MMORPG แฟนตาซี — ผจญภัยไปกับเพื่อน ๆ</p>${BETA.on ? `<p class="tt-beta">${BETA.badge}</p>` : ''}
        <div class="tt-panel" aria-live="polite"></div>
        <p class="tt-foot">v${VERSION} · เสียงจะเริ่มเล่นเมื่อแตะหน้าจอครั้งแรก · <a href="equipment.html" target="_blank" rel="noopener">ลองอุปกรณ์ใหม่</a> · <a href="content.html" target="_blank" rel="noopener">ดูเนื้อหา Lv.60–99</a></p>
      </div>`;
    root.append(el);
    this.panel = el.querySelector('.tt-panel');
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    el.addEventListener('pointerdown', () => { this.audio.unlock(); this.audio.music('title'); }, { passive: true });
  }

  // คืน { mode: 'online', slot, save, account } หรือ { mode: 'offline', save, create }
  run() {
    return new Promise((resolve) => {
      this.resolve = (v) => { this.el.classList.add('out'); setTimeout(() => this.el.remove(), 600); resolve(v); };
      this.connecting();
      this.online.onRecovery = () => this.newPassword();   // กดลิงก์ตั้งรหัสผ่านใหม่จากอีเมล
      // เชื่อมต่อนานเกิน 20 วินาที → แจ้งว่าต่อไม่ได้ (เดิมกดเล่นออฟไลน์ได้ ตอนนี้ไม่มีแล้ว)
      const late = new Promise((r) => setTimeout(() => r('late'), 20000));
      Promise.race([this.online.init(), late]).then((ok) => {
        if (ok === 'late') return this.unavailable('เชื่อมต่อนานเกินไป (อินเทอร์เน็ตช้า หรือเซิร์ฟเวอร์ไม่ตอบ)');
        if (ok && this.online.recovery) return this.newPassword();
        if (ok) return this.select();
        if (this.online.needsLogin) return this.login();
        return this.unavailable(this.online.serverDown ? 'เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้ (ตรวจอินเทอร์เน็ต หรือเซิร์ฟเวอร์อาจปิดปรับปรุง)' : this.online.kind === 'supabase' ? (this.online.reason || 'เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้') : `ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์เกม (js/net/server-config.js)${this.online.reason ? ' · ' + this.online.reason : ''}`);
      }, () => this.unavailable('เชื่อมต่อเซิร์ฟเวอร์เกมไม่ได้'));
    });
  }

  connecting() {
    const sv = this.online.kind === 'supabase';
    this.panel.innerHTML = `<div class="tt-wait"><i class="spin"></i><b>กำลังเชื่อมต่อ...</b><small>${sv ? 'กำลังตรวจสอบการเข้าสู่ระบบ' : 'กำลังตรวจสอบบัญชีของคุณ'}</small></div>${ALLOW_OFFLINE ? '<div class="tt-actions"><button type="button" class="ghost" data-a="off">เล่นแบบออฟไลน์ (ทดสอบ)</button></div>' : ''}`;
    const off = this.panel.querySelector('[data-a=off]');
    if (off) off.addEventListener('click', () => this.offline());
  }

  // v0.17.1: ต่อเซิร์ฟเวอร์ไม่ได้ → แจ้ง + ลองใหม่ (เกมเล่นออนไลน์เท่านั้น)
  unavailable(reason = '') {
    if (ALLOW_OFFLINE) return this.offline(reason);
    this.panel.innerHTML = `
      <div class="tt-acc"><div><b>เชื่อมต่อไม่ได้</b><small></small></div><span class="tt-dot">ออฟไลน์</span></div>
      <p class="tt-note">Everlevel เล่นได้แบบออนไลน์เท่านั้น — ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วกดลองใหม่ ถ้ายังไม่ได้ เซิร์ฟเวอร์อาจปิดปรับปรุงชั่วคราว</p>
      <div class="tt-actions"><button type="button" class="primary" data-a="retry">ลองใหม่</button></div>`;
    this.panel.querySelector('.tt-acc small').textContent = reason || 'ไม่ได้เชื่อมต่อเซิร์ฟเวอร์';
    this.panel.querySelector('[data-a=retry]').addEventListener('click', () => location.reload());
  }

  /* ---------- v0.12: สมัครสมาชิก / เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน (เซิร์ฟเวอร์ Supabase) ---------- */

  authForm({ title, fields, ok, links = [], msg = '', note = '' }) {
    this.forceOffline = false;
    this.panel.innerHTML = `
      <h2 class="tt-h">${esc(title)}</h2>
      ${msg ? `<p class="tt-warn">${esc(msg)}</p>` : ''}
      <form class="tt-form" novalidate>
        ${fields.map((f) => `<label class="tt-field"><span>${esc(f.label)}</span><input name="${f.name}" type="${f.type}" autocomplete="${f.auto}" ${f.type === 'email' ? 'inputmode="email" autocapitalize="off" spellcheck="false"' : ''} maxlength="${f.type === 'email' ? 120 : 72}" required></label>`).join('')}
        ${note ? `<p class="tt-note">${esc(note)}</p>` : ''}
        <p class="tt-err" aria-live="polite"></p>
        <div class="tt-actions">${links.map((l, i) => `<button type="button" class="ghost" data-l="${i}">${esc(l.label)}</button>`).join('')}<button type="submit" class="primary">${esc(ok.label)}</button></div>
      </form>`;
    const form = this.panel.querySelector('form'), err = this.panel.querySelector('.tt-err'), btn = form.querySelector('[type=submit]');
    form.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => e.stopPropagation()));
    links.forEach((l, i) => this.panel.querySelector(`[data-l="${i}"]`).addEventListener('click', l.fn));
    setTimeout(() => { const f = form.querySelector('input'); if (f && !document.body.classList.contains('touch')) f.focus(); }, 50);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(form).entries());
      for (const k of Object.keys(v)) v[k] = String(v[k]);
      if (v.email !== undefined) v.email = v.email.trim();
      btn.disabled = true; err.textContent = 'กำลังดำเนินการ...';
      let res = null;
      try { res = await ok.fn(v); } catch (x) { res = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'; }
      if (res) { err.textContent = res; btn.disabled = false; }
    });
  }

  login(msg = '') {
    this.authForm({
      title: 'เข้าสู่ระบบ', msg,
      fields: [{ name: 'email', label: 'อีเมล', type: 'email', auto: 'email username' }, { name: 'password', label: 'รหัสผ่าน', type: 'password', auto: 'current-password' }],
      ok: { label: 'เข้าสู่ระบบ', fn: async ({ email, password }) => {
        if (!/^\S+@\S+\.\S+$/.test(email)) return 'กรอกอีเมลให้ถูกต้อง';
        if (!password) return 'กรอกรหัสผ่าน';
        const e = await this.online.signIn(email, password);
        if (e) return e;
        this.select();
        return null;
      } },
      links: [
        { label: 'สมัครสมาชิก', fn: () => this.register() },
        { label: 'ลืมรหัสผ่าน', fn: () => this.forgot() },
        ...(ALLOW_OFFLINE ? [{ label: 'เล่นออฟไลน์ (ทดสอบ)', fn: () => this.offline() }] : []),
      ],
    });
    if (this.online.signInGoogle) this.socialButtons();
  }

  // v0.81 ปุ่มเข้าด้วย Google + เล่นทันทีไม่ต้องสมัคร (อยู่บนสุดของหน้าเข้าสู่ระบบ)
  socialButtons() {
    const form = this.panel.querySelector('.tt-form'); if (!form) return;
    const box = document.createElement('div'); box.className = 'tt-social';
    box.innerHTML = `<button type="button" class="tt-google" data-s="google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg><span>เข้าสู่ระบบด้วย Google</span></button>
      <button type="button" class="tt-guest" data-s="guest">⚡ เล่นทันที ไม่ต้องสมัคร</button>
      <p class="tt-or"><span>หรือใช้อีเมล</span></p>`;
    form.before(box);
    const legal = document.createElement('p'); legal.className = 'tt-legal';
    legal.innerHTML = 'การเข้าเล่นถือว่ายอมรับ <a href="terms.html" target="_blank" rel="noopener">ข้อกำหนด</a> และ <a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a>';
    form.after(legal);
    const err = this.panel.querySelector('.tt-err');
    box.querySelector('[data-s=google]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true; err.textContent = 'กำลังไปหน้า Google...';
      const x = await this.online.signInGoogle();
      if (x) { err.textContent = x; e.currentTarget.disabled = false; }
    });
    box.querySelector('[data-s=guest]').addEventListener('click', () => this.guestConfirm());
  }

  guestConfirm() {
    this.panel.innerHTML = `
      <h2 class="tt-h">เล่นแบบไม่สมัครบัญชี</h2>
      <p class="tt-note">เข้าเล่นได้ทันทีด้วย<b>บัญชีชั่วคราว</b> ตัวละครบันทึกบนเซิร์ฟเวอร์ตามปกติ แต่บัญชีผูกกับ<b>เบราว์เซอร์เครื่องนี้</b>เท่านั้น</p>
      <p class="tt-warn">⚠ ถ้าล้างข้อมูลเบราว์เซอร์ ออกจากระบบ หรือเปลี่ยนเครื่อง ก่อนผูกบัญชี — ตัวละครจะเข้าไม่ได้อีก<br>ผูกกับ Google หรืออีเมลได้ทุกเมื่อที่หน้าเลือกตัวละคร (ตัวละครอยู่ครบ) · บัญชีชั่วคราวเติมเพชรไม่ได้</p>
      <p class="tt-err" aria-live="polite"></p>
      <div class="tt-actions"><button type="button" class="ghost" data-a="back">ย้อนกลับ</button><button type="button" class="primary" data-a="go">เข้าใจแล้ว เล่นเลย</button></div>`;
    const err = this.panel.querySelector('.tt-err'), go = this.panel.querySelector('[data-a=go]');
    this.panel.querySelector('[data-a=back]').addEventListener('click', () => this.login());
    go.addEventListener('click', async () => {
      go.disabled = true; err.textContent = 'กำลังสร้างบัญชีชั่วคราว...';
      const e = await this.online.signInGuest();
      if (e) { err.textContent = e; go.disabled = false; return; }
      this.select();
    });
  }

  // v0.81 ผูกบัญชีชั่วคราวให้เป็นบัญชีถาวร
  linkAccount(msg = '') {
    this.panel.innerHTML = `
      <h2 class="tt-h">ผูกบัญชี (เก็บตัวละครถาวร)</h2>
      ${msg ? `<p class="tt-warn">${esc(msg)}</p>` : ''}
      <p class="tt-note">ผูกแล้วตัวละคร ของ และเพชรทั้งหมดอยู่ครบ เข้าเล่นได้ทุกเครื่อง</p>
      <div class="tt-social"><button type="button" class="tt-google" data-s="google"><span>ผูกกับบัญชี Google</span></button></div>
      <p class="tt-or"><span>หรือตั้งอีเมล + รหัสผ่าน</span></p>
      <form class="tt-form" novalidate>
        <label class="tt-field"><span>อีเมล</span><input name="email" type="email" autocomplete="email username" inputmode="email" autocapitalize="off" spellcheck="false" maxlength="120"></label>
        <label class="tt-field"><span>รหัสผ่าน</span><input name="password" type="password" autocomplete="new-password" maxlength="72"></label>
        <p class="tt-err" aria-live="polite"></p>
        <div class="tt-actions"><button type="button" class="ghost" data-a="back">ไว้ทีหลัง</button><button type="submit" class="primary">ผูกด้วยอีเมล</button></div>
      </form>`;
    const err = this.panel.querySelector('.tt-err'), form = this.panel.querySelector('form');
    form.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => e.stopPropagation()));
    this.panel.querySelector('[data-a=back]').addEventListener('click', () => this.select());
    this.panel.querySelector('[data-s=google]').addEventListener('click', async (e) => {
      e.currentTarget.disabled = true; err.textContent = 'กำลังไปหน้า Google...';
      const x = await this.online.linkGoogle();
      if (x) { err.textContent = x; e.currentTarget.disabled = false; }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = String(form.email.value || '').trim(), password = String(form.password.value || '');
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'กรอกอีเมลให้ถูกต้อง'; return; }
      if (password.length < 8 || !/[A-Za-z\u0E00-\u0E7F]/.test(password) || !/\d/.test(password)) { err.textContent = 'รหัสผ่านอย่างน้อย 8 ตัว ผสมตัวอักษรกับตัวเลข'; return; }
      err.textContent = 'กำลังดำเนินการ...';
      const x = await this.online.linkEmail(email, password);
      if (x) { err.textContent = x; return; }
      this.select(`ส่งอีเมลยืนยันไปที่ ${email} แล้ว — กดลิงก์ในอีเมลเพื่อผูกบัญชีให้เสร็จ (ระหว่างนี้เล่นต่อได้ตามปกติ)`);
    });
  }

  register() {
    this.authForm({
      title: 'สมัครสมาชิก Everlevel',
      note: 'ใช้อีเมลจริง (ไว้กู้รหัสผ่าน) · รหัสผ่านอย่างน้อย 8 ตัว ห้ามใช้ซ้ำกับเว็บอื่น · รหัสผ่านถูกเข้ารหัสบนเซิร์ฟเวอร์ ไม่มีใครเห็น',
      fields: [
        { name: 'email', label: 'อีเมล', type: 'email', auto: 'email username' },
        { name: 'password', label: 'รหัสผ่าน', type: 'password', auto: 'new-password' },
        { name: 'password2', label: 'ยืนยันรหัสผ่าน', type: 'password', auto: 'new-password' },
      ],
      ok: { label: 'สมัครสมาชิก', fn: async ({ email, password, password2 }) => {
        if (!/^\S+@\S+\.\S+$/.test(email)) return 'กรอกอีเมลให้ถูกต้อง';
        if (password.length < 8) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว';
        if (!/[A-Za-z\u0E00-\u0E7F]/.test(password) || !/\d/.test(password)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
        if (password !== password2) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
        const r = await this.online.signUp(email, password);
        if (r.error) return r.error;
        if (r.session) { this.select(); return null; }
        this.login(`สมัครสำเร็จ! เราส่งอีเมลยืนยันไปที่ ${email} แล้ว กดลิงก์ในอีเมล จากนั้นกลับมาเข้าสู่ระบบ`);
        return null;
      } },
      links: [{ label: 'มีบัญชีแล้ว', fn: () => this.login() }],
    });
  }

  forgot() {
    this.authForm({
      title: 'ลืมรหัสผ่าน',
      note: 'กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้ (ดูในกล่องจดหมายขยะด้วย)',
      fields: [{ name: 'email', label: 'อีเมล', type: 'email', auto: 'email username' }],
      ok: { label: 'ส่งลิงก์ตั้งรหัสใหม่', fn: async ({ email }) => {
        if (!/^\S+@\S+\.\S+$/.test(email)) return 'กรอกอีเมลให้ถูกต้อง';
        const e = await this.online.resetPassword(email);
        if (e) return e;
        this.login('ถ้าอีเมลนี้มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว เปิดอีเมลแล้วกดลิงก์ได้เลย');
        return null;
      } },
      links: [{ label: 'กลับ', fn: () => this.login() }],
    });
  }

  newPassword() {
    this.authForm({
      title: 'ตั้งรหัสผ่านใหม่',
      fields: [
        { name: 'password', label: 'รหัสผ่านใหม่', type: 'password', auto: 'new-password' },
        { name: 'password2', label: 'ยืนยันรหัสผ่านใหม่', type: 'password', auto: 'new-password' },
      ],
      ok: { label: 'บันทึกรหัสผ่านใหม่', fn: async ({ password, password2 }) => {
        if (password.length < 8) return 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว';
        if (!/[A-Za-z\u0E00-\u0E7F]/.test(password) || !/\d/.test(password)) return 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
        if (password !== password2) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
        const e = await this.online.updatePassword(password);
        if (e) return e;
        this.select('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
        return null;
      } },
    });
  }

  async logout() {
    this.panel.innerHTML = '<div class="tt-wait"><i class="spin"></i><b>กำลังออกจากระบบ...</b></div>';
    await this.online.signOut();
    this.login('ออกจากระบบแล้ว');
  }

  async select(msg = '') {
    this.forceOffline = false;
    this.panel.innerHTML = '<div class="tt-wait"><i class="spin"></i><b>กำลังโหลดตัวละคร...</b></div>';
    let acc;
    try { acc = await this.online.account(); } catch (e) { return this.unavailable('โหลดข้อมูลบัญชีไม่สำเร็จ'); }
    this.acc = acc;
    const me = this.online.me || {};
    const ro = this.online.canWrite === false;
    this.panel.innerHTML = `
      <div class="tt-acc"><img alt="" src="${esc(me.avatarUrl || '')}"><div><b>${esc(me.name || 'นักผจญภัย')}</b><small>${esc(this.online.label)} · ${ro ? 'เซฟในเครื่อง' : 'เซฟบนคลาวด์'}</small></div>${this.online.kind === 'supabase' ? '<button type="button" class="ghost tt-out" data-a="logout">ออกจากระบบ</button>' : '<span class="tt-dot on">ออนไลน์</span>'}</div>
      ${ro ? '<p class="tt-warn">บัญชีนี้ยังบันทึกบนคลาวด์ไม่ได้ (สิทธิ์ดูอย่างเดียว) — ยังเล่นกับเพื่อนในแผนที่เดียวกันได้ โดยเซฟไว้ในเครื่องนี้ หรือขอให้เจ้าของเกมเชิญด้วยอีเมลเป็น "ผู้แก้ไข"</p>' : ''}
      ${msg ? `<p class="tt-warn">${esc(msg)}</p>` : ''}
      ${this.online.guest ? '<div class="tt-guestbar"><span>⚠ บัญชีชั่วคราว — ผูกกับ Google หรืออีเมล เพื่อไม่ให้ตัวละครหาย</span><button type="button" class="primary" data-a="link">ผูกบัญชี</button></div>' : ''}
      <h2 class="tt-h">เลือกตัวละคร</h2>
      <div class="tt-slots"></div>
      <div class="tt-actions">${ro && this.online.room ? '<button type="button" class="primary" data-a="netlocal">เล่นกับเพื่อน (เซฟในเครื่องนี้)</button>' : ''}${ALLOW_OFFLINE ? '<button type="button" class="ghost" data-a="off">เล่นแบบออฟไลน์ (ทดสอบ)</button>' : ''}</div>`;
    const lo = this.panel.querySelector('[data-a=logout]');
    if (lo) lo.addEventListener('click', () => {
      if (this.online.guest && !lo.classList.contains('sure')) { lo.classList.add('sure'); lo.textContent = 'ยืนยัน? บัญชีชั่วคราวจะเข้าไม่ได้อีก'; return; }   // v0.81
      this.logout();
    });
    const lk = this.panel.querySelector('[data-a=link]');
    if (lk) lk.addEventListener('click', () => this.linkAccount());
    const nl = this.panel.querySelector('[data-a=netlocal]');
    if (nl) nl.addEventListener('click', () => this.offline('', true));
    const box = this.panel.querySelector('.tt-slots');
    for (let i = 1; i <= MAX_CHARS; i++) {
      const c = acc.chars[i - 1];
      const card = document.createElement('div'); card.className = 'tt-slot' + (c ? '' : ' empty');
      if (c) {
        card.innerHTML = `<div class="ts-crest">${esc((JOBS[c.job] || JOBS.novice).crest)}</div><div class="ts-info"><b></b><small>${esc((JOBS[c.job] || JOBS.novice).name)} · Base Lv.${+c.lv || 1} · Job Lv.${+c.jlv || 1}</small><small>${esc((MAPS[c.map] || {}).name || '')}</small></div>
          <div class="ts-btns"><button type="button" class="primary" data-a="play">เข้าเกม</button><button type="button" class="ghost del" data-a="del">ลบ</button></div>`;
        card.querySelector('b').textContent = c.name || '???';
        card.querySelector('[data-a=play]').addEventListener('click', () => this.play(i));
        const del = card.querySelector('[data-a=del]');
        del.addEventListener('click', () => {
          if (!del.classList.contains('sure')) { del.classList.add('sure'); del.textContent = 'ยืนยันลบ?'; return; }
          this.panel.innerHTML = '<div class="tt-wait"><i class="spin"></i><b>กำลังลบตัวละคร...</b></div>';
          this.online.deleteChar(i, c.name).then(() => this.select(), () => this.select('ลบตัวละครไม่สำเร็จ'));
        });
      } else {
        card.innerHTML = `<div class="ts-crest">+</div><div class="ts-info"><b>ช่องว่าง</b><small>ช่องตัวละครที่ ${i}</small></div><div class="ts-btns"><button type="button" class="primary" data-a="new">สร้างตัวละคร</button>${this.localSave ? '<button type="button" class="ghost" data-a="import">ใช้เซฟในเครื่อง</button>' : ''}</div>`;
        card.querySelector('[data-a=new]').addEventListener('click', () => this.create(i));
        const imp = card.querySelector('[data-a=import]');
        if (imp) imp.addEventListener('click', () => this.importLocal(i));
      }
      if (ro) card.querySelectorAll('button').forEach((b) => { if (b.dataset.a !== 'play') b.disabled = true; });
      box.append(card);
    }
    const off = this.panel.querySelector('[data-a=off]');
    if (off) off.addEventListener('click', () => this.offline());
  }

  async play(slot) {
    this.panel.innerHTML = '<div class="tt-wait"><i class="spin"></i><b>กำลังเข้าสู่โลก Everlevel...</b></div>';
    let save = null;
    try { save = await this.online.loadChar(slot); } catch (e) { return this.select('โหลดตัวละครไม่สำเร็จ ลองใหม่อีกครั้ง'); }
    this.online.slot = slot;
    if (save && Array.isArray(this.acc.storage)) save.storage = this.acc.storage;   // คลังใช้ร่วมกันทั้งบัญชี
    this.resolve({ mode: 'online', slot, save });
  }

  async importLocal(slot) {
    const s = this.localSave;
    const name = (s.player && s.player.name) || '';
    if (validName(name) || name === 'Novice') return this.create(slot, 'ตั้งชื่อตัวละครก่อนย้ายเซฟในเครื่องขึ้นคลาวด์', s);
    const err = await this.online.claimName(name, slot);
    if (err) return this.create(slot, err + ' — ตั้งชื่อใหม่ก่อนย้ายเซฟ', s);
    this.online.slot = slot;
    this.resolve({ mode: 'online', slot, save: s, migrated: true });
  }

  // สร้างตัวละคร: ตั้งชื่ออย่างเดียว (online = จองชื่อกับเซิร์ฟเวอร์) · v0.86 เอาตัวเลือกสีผม/ทรงผมออก (ใช้ค่ามาตรฐาน — ตัวละครเป็นภาพพิกเซลตามอาชีพ)
  create(slot, msg = '', fromSave = null) {
    let hair = HAIR[0], style = 'spiky';
    const on = this.online.online && !this.forceOffline;   // เลือกเล่นออฟไลน์ทั้งที่เชื่อมต่อได้ → ไม่จองชื่อ
    this.panel.innerHTML = `
      <h2 class="tt-h">${fromSave ? 'ตั้งชื่อให้ตัวละครในเครื่อง' : 'สร้างตัวละครใหม่'}</h2>
      ${msg ? `<p class="tt-warn">${esc(msg)}</p>` : ''}
      <label class="tt-field"><span>ชื่อตัวละคร</span><input type="text" maxlength="16" autocomplete="off" placeholder="2–16 ตัวอักษร"></label>
      <p class="tt-err"></p>
      <div class="tt-actions"><button type="button" class="ghost" data-a="back">ย้อนกลับ</button><button type="button" class="primary" data-a="ok">${fromSave ? 'ย้ายเซฟขึ้นคลาวด์' : 'เริ่มการผจญภัย'}</button></div>`;
    const inp = this.panel.querySelector('input'), err = this.panel.querySelector('.tt-err');
    setTimeout(() => inp.focus(), 50);
    this.panel.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { hair = b.dataset.c; this.panel.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    this.panel.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => { style = b.dataset.s; this.panel.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
    this.panel.querySelector('[data-a=back]').addEventListener('click', () => (on ? this.select() : this.offline('', this.netLocal)));
    const ok = this.panel.querySelector('[data-a=ok]');
    const submit = async () => {
      const name = inp.value.trim(), bad = validName(name);
      if (bad) { err.textContent = bad; return; }
      ok.disabled = true; err.textContent = 'กำลังตรวจสอบชื่อ...';
      if (on) {
        const e = await this.online.claimName(name, slot);
        if (e) { err.textContent = e; ok.disabled = false; return; }
        this.online.slot = slot;
      }
      const mode = on || this.netLocal ? 'online' : 'offline', localOnly = !on && !!this.netLocal;
      if (fromSave) { fromSave.player = { ...fromSave.player, name }; this.resolve({ mode, localOnly, slot, save: fromSave, migrated: true }); return; }
      const storage = on && this.acc && Array.isArray(this.acc.storage) ? this.acc.storage : null;
      this.resolve({ mode, localOnly, slot, save: null, create: { name, appearance: { hair, hairStyle: style } }, storage });
    };
    ok.addEventListener('click', submit);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); e.stopPropagation(); });
  }

  // net = เล่นออนไลน์ (เห็นเพื่อน/แชตได้) แต่เซฟในเครื่อง — สำหรับบัญชีที่บันทึกบนคลาวด์ไม่ได้
  offline(reason = '', net = false) {
    this.forceOffline = true;
    this.netLocal = net;
    const why = reason || (net ? 'เห็นและคุยกับเพื่อนในแผนที่เดียวกันได้' : this.online.reason || 'ไม่ได้เชื่อมต่อบัญชี');
    const s = this.localSave, p = s && s.player, sv = this.online.kind === 'supabase';
    this.panel.innerHTML = `
      <div class="tt-acc"><div><b>${net ? 'ออนไลน์ · เซฟในเครื่อง' : 'โหมดออฟไลน์'}</b><small>${esc(why)} · บันทึกในเครื่องนี้เท่านั้น</small></div><span class="tt-dot${net ? ' on' : ''}">${net ? 'ออนไลน์' : 'ออฟไลน์'}</span></div>
      ${p ? `<div class="tt-slot"><div class="ts-crest">${esc((JOBS[p.job] || JOBS.novice).crest)}</div><div class="ts-info"><b></b><small>${esc((JOBS[p.job] || JOBS.novice).name)} · Base Lv.${+p.baseLevel || 1}</small><small>${esc((MAPS[p.map] || {}).name || '')}</small></div><div class="ts-btns"><button type="button" class="primary" data-a="cont">เล่นต่อ</button></div></div>` : ''}
      <div class="tt-actions"><button type="button" class="${p ? 'ghost' : 'primary'}" data-a="new">${p ? 'สร้างตัวละครใหม่ (แทนที่เซฟเดิม)' : 'สร้างตัวละคร'}</button>${this.online.online ? '<button type="button" class="ghost" data-a="back">กลับไปโหมดออนไลน์</button>' : ''}${sv && !this.online.online ? '<button type="button" class="ghost" data-a="login">เข้าสู่ระบบ / สมัครสมาชิก</button>' : ''}</div>
      ${net ? '' : `<p class="tt-note">${sv ? 'เข้าสู่ระบบเพื่อเล่นออนไลน์กับเพื่อน — ผู้เล่นในแผนที่เดียวกันจะเห็นกัน คุยแชตกันได้ และเซฟอยู่บนเซิร์ฟเวอร์ เล่นต่อได้ทุกเครื่อง' : this.online.serverDown ? 'ลองรีเฟรชหน้าอีกครั้งภายหลัง — ระหว่างนี้เล่นแบบออฟไลน์ได้ เซฟจะอยู่ในเครื่องนี้' : 'เล่นออนไลน์กับเพื่อนได้เมื่อเปิดเกมผ่าน claude.ai — ผู้เล่นในแผนที่เดียวกันจะเห็นกัน คุยแชตกันได้ และถ้าบัญชีมีสิทธิ์แก้ไข เซฟจะอยู่บนคลาวด์'}</p>`}`;
    if (p) this.panel.querySelector('.ts-info b').textContent = p.name || 'Novice';
    const cont = this.panel.querySelector('[data-a=cont]');
    if (cont) cont.addEventListener('click', () => this.resolve({ mode: net ? 'online' : 'offline', localOnly: net, save: s }));
    const nw = this.panel.querySelector('[data-a=new]');
    nw.addEventListener('click', () => {
      if (p && !nw.classList.contains('sure')) { nw.classList.add('sure'); nw.textContent = 'ยืนยัน? เซฟเดิมในเครื่องจะถูกแทนที่'; return; }
      this.create(0);
    });
    const back = this.panel.querySelector('[data-a=back]');
    if (back) back.addEventListener('click', () => this.select());
    const li = this.panel.querySelector('[data-a=login]');
    if (li) li.addEventListener('click', () => this.login());
  }
}
