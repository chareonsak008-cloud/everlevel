// v0.76 อันดับประจำฤดูกาล (รีเซ็ตทุกเดือน) — หอคอย · บอสโลก · MVP · ดันเจี้ยนปาร์ตี้ · หอเกียรติยศ
import { JOBS } from '../data/progression.js?v=0.93.0-p1.10';
import { ITEMS } from '../data/items.js?v=0.93.0-p1.10';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.10';
import { setSeasonHolders, SEASON_TITLES } from '../data/seasonTitles.js?v=0.93.0-p1.10';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
export const SEASON_CATS = {
  tower: { name: 'หอคอย', icon: '🏯', unit: 'ชั้น', desc: 'ชั้นสูงสุดที่ผ่านในหอคอยนิรันดร์เดือนนี้' },
  wb:    { name: 'บอสโลก', icon: '🌍', unit: 'ดาเมจ', desc: 'ดาเมจรวมที่ทำใส่บอสโลกเดือนนี้' },
  mvp:   { name: 'MVP', icon: '👑', unit: 'ครั้ง', desc: 'จำนวนครั้งที่ได้ MVP (ดาเมจอันดับ 1) เดือนนี้' },
  pd:    { name: 'ดันปาร์ตี้', icon: '🌙', unit: 'รอบ', desc: 'จำนวนรอบที่ร่วมปราบวิหารผนึกจันทราสำเร็จเดือนนี้' },
  pvp:   { name: 'อารีน่า', icon: '⚔', unit: 'แต้ม', desc: 'แต้มอันดับอารีน่าสูงสุดที่ทำได้เดือนนี้ (1v1 หรือ 3v3)' },   // v0.78
};
const REWARDS = [
  { rk: 'อันดับ 1', items: [['box_gold', 1], ['refine_guard', 2], ['royal_jelly', 10]], zeny: 300000 },
  { rk: 'อันดับ 2–3', items: [['box_gold', 1], ['refine_guard', 1]], zeny: 150000 },
  { rk: 'อันดับ 4–10', items: [['box_silver', 1], ['refine_luck', 1]], zeny: 50000 },
];
const jobName = (j) => (JOBS[j] && JOBS[j].name) || j || '';
const left = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d} วัน ${h} ชม.` : `${h} ชม. ${m} นาที`; };

export class SeasonWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'tower'; this.data = {}; this.hall = null; this.busy = false;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm seasonw'; el.hidden = true; el.setAttribute('aria-label', 'อันดับประจำฤดูกาล');
    el.innerHTML = `<header class="st-head"><div><h2>🏆 อันดับประจำฤดูกาล</h2><p class="sn-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <nav class="sn-tabs inv-tabs">${Object.entries(SEASON_CATS).map(([k, c]) => `<button type="button" data-tab="${k}">${c.icon} ${c.name}</button>`).join('')}<button type="button" data-tab="hall">🏛 หอเกียรติยศ</button></nav>
      <div class="tm-body sn-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.querySelector('.sn-tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (!b) return; this.tab = b.dataset.tab; this.render(); void this.load(); });
    this.body = el.querySelector('.sn-body'); this.sub = el.querySelector('.sn-sub');
  }

  get open() { return !this.el.hidden; }
  get on() { const g = this.g; return g.mode === 'online' && !!(g.online && g.online.seasonRPC) && !this.off; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) { this.render(); void this.load(); } }
  update(dt) { if (!this.open) return; this.t = (this.t || 0) - dt; if (this.t <= 0) { this.t = 30; this.renderSub(); } }

  async load() {
    if (!this.on || this.busy) return;
    this.busy = true;
    const tab = this.tab;
    try {
      if (tab === 'hall') { this.hall = await this.g.online.seasonRPC('season_hall'); setSeasonHolders(this.hall); }
      else { const d = await this.g.online.seasonRPC('season_board', { p_cat: tab }); d.at = Date.now(); d.skew = Date.parse(d.now) - Date.now(); this.data[tab] = d; }
      this.err = '';
    } catch (e) { if (e.missing) this.off = true; this.err = e.missing ? 'เซิร์ฟเวอร์ยังไม่เปิดระบบอันดับฤดูกาล (ผู้ดูแลต้องรัน supabase/season_v0.76.sql)' : 'โหลดอันดับไม่สำเร็จ ลองใหม่อีกครั้ง'; }
    finally { this.busy = false; }
    if (this.open && this.tab === tab) this.render();
  }

  renderSub() {
    const d = Object.values(this.data).find(Boolean);
    this.sub.textContent = d ? `ฤดูกาล ${d.season} · จบในอีก ${left(Date.parse(d.ends_at) - (Date.now() + (d.skew || 0)))} (สิ้นเดือน เวลาไทย)` : 'รีเซ็ตทุกต้นเดือน เวลาไทย · อันดับ 1–10 ทุกหมวดได้รางวัลทางจดหมาย';
  }

  render() {
    if (!this.open) return;
    for (const b of this.el.querySelectorAll('.sn-tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === this.tab));
    this.renderSub();
    if (!this.on) { this.body.innerHTML = `<p class="sn-note">${esc(this.err || 'อันดับประจำฤดูกาลใช้ได้เมื่อเล่นแบบออนไลน์')}</p>`; return; }
    if (this.tab === 'hall') return this.renderHall();
    const C = SEASON_CATS[this.tab], d = this.data[this.tab];
    const rewards = `<details class="sn-rw" open><summary>รางวัลจบฤดูกาล</summary>${REWARDS.map((r, i) => `<p><b>${r.rk}</b> <span class="sn-title t-${SEASON_TITLES[`S_${this.tab}_${i + 1}`].tier}">「${esc(SEASON_TITLES[`S_${this.tab}_${i + 1}`].title)}」</span> ${fmt(r.zeny)} z ${r.items.filter(([id]) => ITEMS[id]).map(([id, n]) => `<span class="dq-rw dq-it"><img alt="" src="${iconURL(id)}">${esc(ITEMS[id].name)} ×${n}</span>`).join(' ')}</p>`).join('')}<p class="sn-note">ได้ฉายาไว้ใส่เหนือหัวตลอดฤดูกาลถัดไป (ใส่ได้ 3 อันพร้อมกันที่สมุดสะสม → ความสำเร็จ) · อันดับ 1–3 ถูกจารึกในหอเกียรติยศ</p></details>`;
    if (!d) { this.body.innerHTML = `<p class="sn-desc">${C.desc}</p>${rewards}<p class="sn-note">${esc(this.err || 'กำลังโหลด…')}</p>`; return; }
    const me = d.me ? `<p class="sn-me">อันดับของคุณ: <b>${d.me.rk}</b> · ${fmt(d.me.score)} ${C.unit}</p>` : `<p class="sn-me">คุณยังไม่มีคะแนนหมวดนี้ในฤดูกาลนี้</p>`;
    const rows = (d.rows || []).map((r) => `<li class="${r.mine ? 'me' : ''}${r.rk <= 3 ? ' top' + r.rk : ''}"><span class="rk">${r.rk}</span><span class="nm">${esc(r.name)}</span><span class="jb">${esc(jobName(r.job))}</span><b class="fl">${fmt(r.score)} ${C.unit}</b></li>`).join('');
    this.body.innerHTML = `<p class="sn-desc">${C.desc}</p>${me}${rewards}${rows ? `<ol class="dg-list sn-list">${rows}</ol>` : '<p class="sn-note">ยังไม่มีใครขึ้นกระดานหมวดนี้ — เป็นคนแรกเลย!</p>'}`;
  }

  renderHall() {
    const H = this.hall;
    if (!H) { this.body.innerHTML = `<p class="sn-note">${esc(this.err || 'กำลังโหลด…')}</p>`; return; }
    if (!H.length) { this.body.innerHTML = '<p class="sn-note">ยังไม่มีฤดูกาลที่จบ — แชมป์คนแรกจะถูกจารึกเมื่อจบเดือนนี้</p>'; return; }
    this.body.innerHTML = H.map((s) => `<section class="sn-hall"><h3>ฤดูกาล ${esc(s.season)}</h3>${Object.entries(SEASON_CATS).map(([k, c]) => {
      const w = ((s.winners || {})[k] || []).slice(0, 3);
      return `<p><b>${c.icon} ${c.name}</b> ${w.length ? w.map((x) => `<span class="sn-champ r${x.rk}">${['🥇', '🥈', '🥉'][x.rk - 1] || ''} ${esc(x.name)}</span>`).join(' ') : '<span class="sn-note">—</span>'}</p>`;
    }).join('')}</section>`).join('');
  }
}
