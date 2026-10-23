// v0.74 หน้าต่างกระดานภารกิจรายวัน
import { DAILY_TASKS, DAILY_STREAK_BIG } from '../data/daily.js?v=0.93.0-p2.18';
import { ITEMS } from '../data/items.js?v=0.93.0-p2.18';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p2.18';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 3600)} ชม. ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} นาที`; };
const rewardHtml = (r) => [
  r.exp && (r.exp[0] || r.exp[1]) ? `<span class="dq-rw">EXP ${fmt(r.exp[0])}${r.exp[1] ? ` / Job ${fmt(r.exp[1])}` : ''}</span>` : '',
  r.zeny ? `<span class="dq-rw">${fmt(r.zeny)} z</span>` : '',
  ...(r.items || []).filter(([id]) => ITEMS[id]).map(([id, n]) => `<span class="dq-rw dq-it"><img alt="" src="${iconURL(id)}">${esc(ITEMS[id].name)} ×${n}</span>`),
].join('');

export class DailyWindow {
  constructor(root, game) {
    this.g = game;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm dailyw'; el.hidden = true;
    el.setAttribute('aria-label', 'ภารกิจรายวัน');
    el.innerHTML = `<header class="st-head"><div><h2>📜 ภารกิจรายวัน</h2><p class="dq-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body dq-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    this.body = el.querySelector('.dq-body'); this.sub = el.querySelector('.dq-sub');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const i = +b.dataset.i, act = b.dataset.act;
      if (act === 'claim') this.g.claimDaily(i);
      else if (act === 'bonus') this.g.claimDaily(-1);
      else if (act === 'reroll') this.g.rerollDaily(i);
      this.render();
    });
    this.tick = 0;
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) this.render(); }
  update(dt) { if (!this.open) return; this.tick -= dt; if (this.tick <= 0) { this.tick = 1; this.sub.textContent = this.subText(); } }
  subText() { const D = this.g.daily; return `รีเซ็ตเที่ยงคืนเวลาไทย · อีก ${hms(D.msToReset())}`; }

  render() {
    if (!this.open) return;
    const D = this.g.daily, d = D.st, R = D.rewardOf('task'), B = D.rewardOf('bonus'), rr = D.rerollsLeft();
    this.sub.textContent = this.subText();
    const rows = d.tasks.map((t, i) => {
      const T = DAILY_TASKS[t.id], done = D.done(t), pct = Math.round((t.prog / t.n) * 100);
      const btn = t.claimed ? '<span class="dq-ok">✔ รับแล้ว</span>'
        : done ? `<button type="button" class="dq-btn gold" data-act="claim" data-i="${i}">รับรางวัล</button>`
        : rr ? `<button type="button" class="dq-btn ghost" data-act="reroll" data-i="${i}" title="เปลี่ยนเป็นภารกิจอื่น (วันละ ${rr} ครั้ง)">↻ เปลี่ยน</button>` : '';
      return `<article class="dq-row${t.claimed ? ' claimed' : done ? ' done' : ''}">
        <div class="dq-ic">${T.icon}</div>
        <div class="dq-main"><b>${esc(T.name)}</b><p>${esc(D.text(t))}</p>
          <div class="dq-bar"><i style="width:${pct}%"></i><span>${fmt(t.prog)} / ${fmt(t.n)}</span></div></div>
        <div class="dq-act">${btn}</div></article>`;
    }).join('');
    const doneN = d.tasks.filter((t) => t.claimed).length, ready = D.bonusReady(), nextStreak = (d.streak || 0) + (d.bonus ? 0 : 1);
    const big = nextStreak % DAILY_STREAK_BIG === 0 && !d.bonus;
    this.body.innerHTML = `
      <p class="dq-hint">รางวัลต่อภารกิจ: ${rewardHtml(R)}</p>
      <div class="dq-list">${rows}</div>
      <section class="dq-bonus${ready ? ' ready' : ''}${d.bonus ? ' claimed' : ''}">
        <div class="dq-chest">${d.bonus ? '🎁' : big ? '💝' : '🎁'}</div>
        <div class="dq-main"><b>${big ? `กล่องใหญ่วันที่ ${nextStreak}!` : 'กล่องรางวัลทำครบ'}</b><p>รับรางวัลครบ ${d.tasks.length} ภารกิจ (${doneN}/${d.tasks.length})</p><div class="dq-rws">${rewardHtml(B)}</div></div>
        <div class="dq-act">${d.bonus ? '<span class="dq-ok">✔ รับแล้ว</span>' : `<button type="button" class="dq-btn gold" data-act="bonus" ${ready ? '' : 'disabled'}>เปิดกล่อง</button>`}</div>
      </section>
      <p class="dq-streak">🔥 ทำครบต่อเนื่อง <b>${d.streak || 0}</b> วัน · ทุก ${DAILY_STREAK_BIG} วันได้กล่องใหญ่ (คริสตัลพิทักษ์ + หินนำโชค) · ขาดวันเดียวนับใหม่${rr ? ` · เปลี่ยนภารกิจได้อีก ${rr} ครั้งวันนี้` : ''}</p>`;
  }
}
