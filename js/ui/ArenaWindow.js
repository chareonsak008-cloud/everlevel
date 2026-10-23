// v0.78 หน้าต่างสนามประลอง — จับคู่ · อันดับ · ร้านแต้ม · กติกา
import { ITEMS } from '../data/items.js?v=0.93.0-p1.3';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.3';
import { JOBS } from '../data/progression.js?v=0.93.0-p1.3';
import { AR, AR_TIERS, AR_SHOP, AR_SEASON_REWARD, tierOf } from '../data/arena.js?v=0.93.0-p1.3';
import { arenaErr } from '../systems/Arena.js?v=0.93.0-p1.3';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const fmtT = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const left = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d} วัน ${h} ชม.` : `${h} ชม. ${m} นาที`; };
const jobName = (j) => (JOBS[j] && JOBS[j].name) || j || '';
const badge = (r) => { const t = tierOf(r); return `<span class="ar-tier" style="--c:${t.color}">${t.icon} ${esc(t.name)}</span>`; };
const itemTag = ([id, n]) => (ITEMS[id] ? `<span class="dq-rw dq-it"><img alt="" src="${iconURL(id)}">${esc(ITEMS[id].name)} ×${n}</span>` : '');

export class ArenaWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'play'; this.boardMode = '1v1'; this.board = {}; this.busy = false;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm arenaw'; el.hidden = true; el.setAttribute('aria-label', 'สนามประลอง');
    el.innerHTML = `<header class="st-head"><div><h2>⚔ สนามประลอง</h2><p class="ar-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <nav class="ar-tabs inv-tabs"><button type="button" data-tab="play">⚔ ประลอง</button><button type="button" data-tab="board">🏆 อันดับ</button><button type="button" data-tab="shop">🎖 ร้านแต้ม</button><button type="button" data-tab="rules">📜 กติกา</button></nav>
      <div class="tm-body ar-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.querySelector('.ar-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (!b) return; this.tab = b.dataset.tab; this.render(); if (this.tab === 'board') void this.loadBoard(); });
    el.addEventListener('click', (e) => {
      const A = this.g.arena; if (!A) return;
      const q = e.target.closest('[data-queue]'); if (q) { void A.queue(q.dataset.queue); return; }
      if (e.target.closest('[data-leave]')) { void A.leaveQueue(); return; }
      const rj = e.target.closest('[data-rejoin]'); if (rj) { void A.rejoin(+rj.dataset.rejoin); return; }
      const bm = e.target.closest('[data-bmode]'); if (bm) { this.boardMode = bm.dataset.bmode; this.render(); void this.loadBoard(); return; }
      const by = e.target.closest('[data-buy]'); if (by) { void A.buy(by.dataset.buy); }
    });
    this.body = el.querySelector('.ar-body'); this.sub = el.querySelector('.ar-sub');
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) {
    this.el.hidden = !on;
    if (on) { this.render(); if (this.g.arena) void this.g.arena.refreshMe(); if (this.tab === 'board') void this.loadBoard(); }
    if (this.g.arena) this.g.arena.renderChip();
  }
  update(dt) { if (!this.open) return; this.t = (this.t || 0) - dt; if (this.t <= 0) { this.t = 1; if (this.tab === 'play' && this.g.arena && this.g.arena.q) this.render(); } }

  async loadBoard() {
    const A = this.g.arena; if (!A || !A.on || this.busy) return;
    this.busy = true; const mode = this.boardMode;
    try { this.board[mode] = await A.rpc('arena_board', { p_mode: mode }); this.err = ''; }
    catch (e) { if (e.missing) A.off = true; this.err = arenaErr(e); }
    finally { this.busy = false; }
    if (this.open && this.tab === 'board') this.render();
  }

  render() {
    if (!this.open) return;
    const A = this.g.arena, me = A && A.me;
    for (const b of this.el.querySelectorAll('.ar-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === this.tab));
    this.sub.textContent = me ? `ฤดูกาล ${me.season} · จบในอีก ${left(Date.parse(me.ends_at) - A.now())} · แต้มอารีน่า ${fmt(me.points)}` : 'สู้สดกับผู้เล่นจริง · ทุกคนถูกปรับเป็น Lv.150 ในสนาม';
    if (this.tab === 'rules') return this.renderRules();
    if (!A || !A.on) { this.body.innerHTML = `<p class="sn-note">${esc(A && A.off ? 'เซิร์ฟเวอร์ยังไม่เปิดระบบนี้ (ผู้ดูแลต้องรัน supabase/arena_v0.78.sql)' : 'สนามประลองใช้ได้เมื่อเล่นแบบออนไลน์')}</p>`; return; }
    if (this.tab === 'board') return this.renderBoard();
    if (this.tab === 'shop') return this.renderShop();
    this.renderPlay();
  }

  renderPlay() {
    const A = this.g.arena, me = A.me, pl = this.g.player;
    if (!me) { this.body.innerHTML = `<p class="sn-note">${esc(A.err || 'กำลังโหลด…')}</p>`; return; }
    const card = (mode) => {
      const M = AR.modes[mode], r = me['r' + M.size], w = me['w' + M.size], l = me['l' + M.size], d = me['d' + M.size];
      const why = A.blockReason(mode), inQ = A.q && A.q.mode === mode;
      const btn = inQ ? `<button type="button" class="ghost" data-leave>ยกเลิกคิว</button>`
        : `<button type="button" class="dq-btn gold" data-queue="${mode}" ${why || A.q ? 'disabled' : ''}>เข้าคิว</button>`;
      const st = inQ ? `<p class="ar-q">🔎 กำลังหาคู่… ${fmtT((Date.now() - A.q.since) / 1000)} · ในคิว ${A.q.waiting || 1} คน${mode === '3v3' && this.g.social && this.g.social.pid ? ' · ปาร์ตี้ลงพร้อมกันอยู่ทีมเดียวกัน' : ''}</p>` : why ? `<p class="ar-why">${esc(why)}</p>` : '';
      return `<section class="ar-mode"><header><b>${M.icon} ${M.name}</b>${badge(r)}</header>
        <p class="ar-rate"><b>${fmt(r)}</b> แต้ม · ชนะ ${w} · แพ้ ${l}${d ? ` · เสมอ ${d}` : ''}</p>
        <p class="ar-desc">${mode === '1v1' ? 'ดวลตัวต่อตัว 3 นาที · ล้มอีกฝ่ายหรือมีเลือดเหลือมากกว่าเมื่อหมดเวลา' : 'ทีมละ 3 คน 5 นาที · ลงคนเดียวหรือลงพร้อมปาร์ตี้ (ไม่เกิน 3 คน)'}</p>
        ${st}<div class="ar-go">${btn}</div></section>`;
    };
    const active = me.active && !A.inMatch ? `<p class="ar-rejoin">มีการแข่งที่ยังไม่จบ <button type="button" class="dq-btn" data-rejoin="${me.active}">กลับเข้าสนาม</button></p>` : '';
    this.body.innerHTML = `${active}<div class="ar-modes">${card('1v1')}${card('3v3')}</div>
      <p class="ar-day">แต้มอารีน่าวันนี้ <b>${fmt(me.day_pts)} / ${fmt(me.day_cap || AR.dayCap)}</b> · ชนะ +${AR.points.win} · แพ้ +${AR.points.loss} · เสมอ +${AR.points.draw} · ชนะครั้งแรกของวัน +${AR.points.firstWin}</p>
      <p class="sn-note">${pl.baseLevel < AR.syncLv ? `ตัวละครของคุณ Lv.${pl.baseLevel} จะถูกปรับเป็น Lv.${AR.syncLv} ในสนาม (สเตตัสขยายตามสัดส่วน · อุปกรณ์และการ์ดใช้ของจริง)` : 'ในสนามใช้ไอเทม เปลี่ยนอุปกรณ์ และออโต้ไม่ได้ — ฝีมือล้วน ๆ'}</p>`;
  }

  renderBoard() {
    const d = this.board[this.boardMode];
    const tabs = `<div class="ar-bm">${Object.entries(AR.modes).map(([k, m]) => `<button type="button" class="ghost${k === this.boardMode ? ' on' : ''}" data-bmode="${k}">${m.icon} ${m.name}</button>`).join('')}</div>`;
    if (!d) { this.body.innerHTML = `${tabs}<p class="sn-note">${esc(this.err || 'กำลังโหลด…')}</p>`; return; }
    const rows = d.map((r) => `<li class="${r.mine ? 'me' : ''}${r.rk <= 3 ? ' top' + r.rk : ''}"><span class="rk">${r.rk}</span><span class="nm">${esc(r.name)}</span><span class="jb">${esc(jobName(r.job))}</span>${badge(r.rating)}<b class="fl">${fmt(r.rating)}</b><small>${r.w}-${r.l}</small></li>`).join('');
    this.body.innerHTML = `${tabs}${rows ? `<ol class="dg-list sn-list ar-list">${rows}</ol>` : '<p class="sn-note">ยังไม่มีใครแข่งในฤดูกาลนี้ — เป็นคนแรกเลย!</p>'}<p class="sn-note">หมวด "อารีน่า" ในหน้าอันดับฤดูกาลใช้แต้มสูงสุดที่ทำได้ในเดือน · อันดับ 1–10 ได้ฉายาประจำฤดูกาล</p>`;
  }

  renderShop() {
    const A = this.g.arena, me = A.me;
    if (!me) { this.body.innerHTML = `<p class="sn-note">${esc(A.err || 'กำลังโหลด…')}</p>`; return; }
    const buys = me.buys || {};
    const rows = AR_SHOP.filter((x) => ITEMS[x.id]).map((x) => {
      const used = +buys[x.id] || 0, full = x.week && used >= x.week, can = me.points >= x.cost && !full;
      return `<li><img alt="" src="${iconURL(x.id)}"><span><b class="r-${ITEMS[x.id].rarity || 'common'}">${esc(ITEMS[x.id].name)}</b> ×${x.n}${x.week ? `<small>สัปดาห์นี้ ${used}/${x.week}</small>` : ''}</span><b class="ar-cost">${fmt(x.cost)} แต้ม</b><button type="button" class="dq-btn" data-buy="${x.id}" ${can ? '' : 'disabled'}>แลก</button></li>`;
    }).join('');
    this.body.innerHTML = `<p class="ar-pts">แต้มอารีน่าของคุณ <b>${fmt(me.points)}</b></p><ul class="ar-shop">${rows}</ul><p class="sn-note">ของที่แลกส่งเข้าจดหมาย · ของจำกัดรีเซ็ตทุกวันจันทร์ 00:00 น. (เวลาไทย) · แต้มอารีน่าไม่หายเมื่อขึ้นฤดูกาลใหม่</p>`;
  }

  renderRules() {
    const tiers = AR_TIERS.map((t) => { const R = AR_SEASON_REWARD[t.id]; return `<li>${badge(t.min)} <small>${fmt(t.min)}+</small> ${fmt(R.zeny)} z ${R.items.map(itemTag).join(' ')}</li>`; }).join('');
    this.body.innerHTML = `<div class="ar-rules">
      <p>• กดเข้าคิว ระบบจะจับคู่กับผู้เล่นจริงที่มีแต้มอันดับใกล้กัน (ยิ่งรอนานยิ่งขยายช่วง) · เจอคู่แล้ววาร์ปเข้าสนามอัตโนมัติ</p>
      <p>• เตรียมตัว ${AR.prep} วินาที แล้วเริ่มสู้ · แตะตัวศัตรูเพื่อเลือกเป้า ใช้การโจมตีและสกิลได้ตามปกติ</p>
      <p>• ทุกคนถูกปรับเป็น Lv.${AR.syncLv} (สเตตัสขยายตามสัดส่วนเดิม · อุปกรณ์/การ์ด/ตีบวกใช้ของจริง) · เลือดในสนาม ×${AR.hpMul}</p>
      <p>• ห้ามใช้ไอเทม เปลี่ยนอุปกรณ์ หรือออโต้ · สกิลรักษา/ฮีลจากเพื่อนใช้ได้ (มีเพดานต่อวินาที)</p>
      <p>• ล้มทีมศัตรูหมด = ชนะ · หมดเวลา = ทีมที่เลือดรวมเหลือมากกว่าชนะ · ถูกล้มไม่เสีย EXP</p>
      <p>• ออกกลางคัน/ไม่เข้าสนาม = แพ้ · แต้มอารีน่าได้วันละไม่เกิน ${AR.dayCap} แต้ม</p>
      <h3>ขั้นและรางวัลจบฤดูกาล</h3><p class="sn-note">ใช้แต้มอันดับสูงสุดของเดือน · ต้องแข่งอย่างน้อย 10 นัด · ส่งทางจดหมายตอนขึ้นเดือนใหม่</p><ul class="ar-tiers">${tiers}</ul></div>`;
  }
}
