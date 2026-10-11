// สมุดสะสม (v0.18 · ปุ่ม B / 📖) — เป้าหมาย · สมุดมอนสเตอร์ · ความสำเร็จและฉายา · อัลบั้มการ์ด · เช็กอินรายวัน
import { MONSTERS } from '../data/monsters.js';
import { ITEMS, describeBonus } from '../data/items.js';
import { CARDS } from '../data/cards.js';
import { BOOK, BOOK_ORDER, bookTier, bookTiers, CARD_SETS, CARD_TOTAL, ACHIEVEMENTS, ACH_CATS, TIER_LABEL, loginReward, LOGIN_DAYS } from '../data/collection.js';
import { iconURL } from '../render/ItemIcons.js';
import { monsterThumb } from '../render/MonsterThumbs.js';
import { localDay } from '../systems/Collection.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Math.floor(n).toLocaleString('en-US');
const bar = (cur, goal) => `<span class="cw-bar"><i style="width:${Math.min(100, (cur / goal) * 100).toFixed(1)}%"></i></span>`;
const TABS = [['goal', '🎯', 'เป้าหมาย'], ['book', '📖', 'สมุดมอน'], ['ach', '🏆', 'ความสำเร็จ'], ['card', '🃏', 'อัลบั้มการ์ด'], ['daily', '📅', 'เช็กอิน']];

export class CollectionWindow {
  constructor(root, game) {
    this.g = game;
    this.open = false;
    this.tab = 'goal';
    const anchor = root.querySelector('#petw');
    const host = (anchor && anchor.parentElement) || root;
    const el = this.el = document.createElement('section');
    el.className = 'panel colw'; el.id = 'colw'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'cwTitle');
    el.innerHTML = `
      <header class="st-head"><div><h2 id="cwTitle">สมุดสะสม</h2><p class="cw-sub"></p></div>
        <button type="button" class="st-close" aria-label="ปิดสมุดสะสม">✕</button></header>
      <nav class="cw-tabs" role="tablist">${TABS.map(([k, i, n]) => `<button type="button" role="tab" data-tab="${k}"><span aria-hidden="true">${i}</span> ${n}</button>`).join('')}</nav>
      <div class="cw-body"></div>`;
    host.append(el);
    this.$ = (s) => el.querySelector(s);
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.$('.st-close').addEventListener('click', () => this.toggle(false));
    for (const b of el.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); this.$('.cw-body').scrollTop = 0; });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-title]');
      if (t) { this.g.collection.setTitle(t.dataset.title || null); this.g.hud.log(t.dataset.title ? `ใส่ฉายา "${this.g.collection.titleOf(t.dataset.title)}" แล้ว` : 'ถอดฉายาแล้ว', 'sys'); this.render(); }
      const m = e.target.closest('[data-mail]');
      if (m) { this.toggle(false); this.g.mailWin.toggle(true); }
    });
    this.renderT = 0;
    game.collection.onChange = () => { if (this.open) this.dirty = true; };
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.render();
  }

  // วาดใหม่เมื่อข้อมูลเปลี่ยน (ไม่เกินวินาทีละครั้ง กันกระตุกตอนตีมอนรัว ๆ)
  update(dt) {
    if (!this.open || !this.dirty) return;
    this.renderT -= dt;
    if (this.renderT > 0) return;
    this.renderT = 1; this.dirty = false;
    const body = this.$('.cw-body'), st = body.scrollTop;
    this.render(); body.scrollTop = st;
  }

  render() {
    if (!this.open) return;
    const col = this.g.collection, c = this.g.player.col;
    const done = Object.keys(c.ach).length;
    this.$('.cw-sub').textContent = `ความสำเร็จ ${done}/${ACHIEVEMENTS.length} · การ์ด ${c.cards.length}/${CARD_TOTAL} · กำจัดมอนรวม ${num(c.total)} ตัว · เช็กอิน ${c.ci.count} วัน`;
    for (const b of this.el.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === this.tab));
    const body = this.$('.cw-body');
    body.innerHTML = this['tab_' + this.tab](col, c);
    if (this.tab === 'book') this.loadThumbs();
  }

  /* ---------- เป้าหมาย ---------- */
  tab_goal(col) {
    const P = col.bonusParts(), pl = this.g.player;
    const part = (label, b) => `<div class="cw-sum"><b>${label}</b><span>${Object.keys(b).length ? esc(describeBonus(b)) : '<em>ยังไม่มี</em>'}</span></div>`;
    const goals = col.goals(7);
    return `
      <section class="cw-sec"><h3>โบนัสถาวรที่ได้แล้ว</h3>
        ${part('📖 สมุดมอนสเตอร์', P.book)}${part('🏆 ความสำเร็จ', P.ach)}${part('🃏 ชุดการ์ด', P.cards)}
        <p class="cw-hint">โบนัสทั้งหมดรวมอยู่ในค่าสถานะแล้ว (กด C ดูค่ารวม) · ฉายาที่ใส่: <b class="cw-honor t-${pl.honorTier || 'none'}">${esc(pl.honor || 'ไม่มี')}</b></p></section>
      <section class="cw-sec"><h3>เป้าหมายถัดไป <small>เลือกจากแผนที่ที่อยู่และเลเวลของคุณ</small></h3>
        ${goals.map((g) => `<div class="cw-goal"><span class="cw-gi" aria-hidden="true">${g.kind === 'book' ? '📖' : '🏆'}</span><div><b>${esc(g.label)}</b><small>${num(g.cur)} / ${num(g.goal)} · ${esc(g.reward)}</small>${bar(g.cur, g.goal)}</div></div>`).join('') || '<p class="cw-hint">ทำครบทุกอย่างแล้ว! สุดยอดมาก</p>'}
      </section>`;
  }

  /* ---------- สมุดมอนสเตอร์ ---------- */
  tab_book(col, c) {
    const rows = BOOK_ORDER.map((t) => {
      const m = MONSTERS[t], k = c.kills[t] || 0, tiers = bookTiers(t), tier = bookTier(t, k), seen = k > 0;
      const next = tier < 3 ? `ขั้น ${tier + 1}: ${num(k)}/${num(tiers[tier])} → ${esc(describeBonus(BOOK[t][tier]))}` : 'ครบทุกขั้นแล้ว ✦';
      const pips = tiers.map((n, i) => `<i class="${i < tier ? 'on' : ''}" title="ขั้น ${i + 1}: ${num(n)} ตัว · ${esc(describeBonus(BOOK[t][i]))}"></i>`).join('');
      return `<div class="cw-mob${seen ? '' : ' unseen'}${tier >= 3 ? ' full' : ''}${m.mvp ? ' mvp' : ''}">
        <span class="cw-pic"><img alt="" data-thumb="${t}"></span>
        <div class="cw-mi"><b>${seen ? esc(m.name) : '???'} <small>Lv.${m.level}${m.mvp ? ' · MVP' : ''}</small></b>
          <small>กำจัดแล้ว ${num(k)} ตัว</small><span class="cw-pips">${pips}</span>
          <small class="cw-next">${next}</small>${tier < 3 ? bar(k, tiers[tier]) : ''}</div></div>`;
    }).join('');
    return `<p class="cw-hint">กำจัดครบ 100 / 500 / 1,000 ตัว (บอส MVP 5 / 20 / 50 ตัว) ได้ค่าสถานะถาวรทีละขั้น</p><div class="cw-mobs">${rows}</div>`;
  }

  loadThumbs() {
    const imgs = [...this.el.querySelectorAll('img[data-thumb]')];
    const token = this.thumbToken = (this.thumbToken || 0) + 1;
    const next = () => {
      if (token !== this.thumbToken || !this.open) return;
      const img = imgs.shift(); if (!img) return;
      const url = monsterThumb(img.dataset.thumb);
      if (url) img.src = url;
      setTimeout(next, 0);
    };
    setTimeout(next, 0);
  }

  /* ---------- ความสำเร็จ + ฉายา ---------- */
  tab_ach(col, c) {
    const S = col.state();
    const cur = c.title;
    const groups = ACH_CATS.map(([cat, name]) => {
      const list = ACHIEVEMENTS.filter((a) => a.cat === cat).map((a) => {
        const p = col.progress(a, S), on = cur === a.id;
        return `<div class="cw-ach${p.done ? ' done' : ''}${on ? ' worn' : ''}">
          <div class="cw-at"><b class="cw-honor t-${a.tier}">${esc(a.title)}</b><small>${esc(a.desc)} · ${TIER_LABEL[a.tier]}</small>
            <small class="cw-bonus">${esc(describeBonus(a.bonus))}</small>${p.done ? '' : bar(p.cur, p.goal)}</div>
          ${p.done ? (on ? '<span class="cw-on">ใส่อยู่</span>' : `<button type="button" class="ghost" data-title="${a.id}">ใส่ฉายา</button>`) : `<span class="cw-cnt">${num(p.cur)}/${num(p.goal)}</span>`}</div>`;
      }).join('');
      return `<section class="cw-sec"><h3>${name}</h3>${list}</section>`;
    }).join('');
    return `<p class="cw-hint">ทำครบแล้วได้โบนัสทันที (ทุกอันรวมกัน) · เลือกใส่ฉายาได้ 1 อัน แสดงเหนือหัวให้ผู้เล่นอื่นเห็น${cur ? ` · <button type="button" class="ghost cw-off" data-title="">ถอดฉายา</button>` : ''}</p>${groups}`;
  }

  /* ---------- อัลบั้มการ์ด ---------- */
  tab_card(col, c) {
    const have = new Set(c.cards);
    const sets = CARD_SETS.map((s) => {
      const n = s.cards.filter((id) => have.has(id)).length, full = n === s.cards.length;
      const cards = s.cards.map((id) => `<span class="cw-card${have.has(id) ? ' got' : ''}" title="${esc(ITEMS[id].name)} · ${esc(describeBonus(CARDS[id].bonus))}"><img alt="" src="${iconURL(id)}"><small>${have.has(id) ? esc(ITEMS[id].name.replace('การ์ด', '')) : '???'}</small></span>`).join('');
      return `<section class="cw-sec${full ? ' full' : ''}"><div class="cw-sh"><h3>${esc(s.name)} <small>${n}/${s.cards.length}</small></h3><span class="cw-bonus${full ? ' on' : ''}">${full ? '✔ ' : ''}${esc(describeBonus(s.bonus))}</span></div><div class="cw-cards">${cards}</div></section>`;
    }).join('');
    return `<p class="cw-hint">ได้การ์ดมาเมื่อไหร่ (เก็บจากพื้น ซื้อ รับจดหมาย หรือใส่อุปกรณ์อยู่) บันทึกลงอัลบั้มอัตโนมัติ ไม่เสียการ์ด · ครบชุดได้โบนัสชุดถาวร</p>${sets}`;
  }

  /* ---------- เช็กอินรายวัน ---------- */
  tab_daily(col, c) {
    const ci = c.ci, pl = this.g.player, today = localDay(), checked = ci.last === today;
    const cells = Array.from({ length: LOGIN_DAYS }, (_, i) => {
      const d = i + 1, r = loginReward(d, pl.baseLevel);
      const got = d <= ci.day && ci.day > 0, now = checked && d === ci.day;
      const items = r.items.map(([id, q]) => `<span title="${esc(ITEMS[id].name)} x${q}"><img alt="" src="${iconURL(id)}"><small>x${q}</small></span>`).join('');
      return `<div class="cw-day${got ? ' got' : ''}${now ? ' now' : ''}${d === LOGIN_DAYS ? ' big' : ''}"><b>วันที่ ${d}</b><div class="cw-dr">${items}</div>${r.zeny ? `<small>${num(r.zeny)} Z</small>` : ''}${got ? '<i aria-label="รับแล้ว">✔</i>' : ''}</div>`;
    }).join('');
    const unread = this.g.mailbox.list().filter((m) => m.sys && !this.g.mailbox.isClaimed(m)).length;
    return `<section class="cw-sec"><h3>รางวัลเข้าเกม 7 วัน</h3>
      <p class="cw-hint">เข้าเกมวันละครั้งนับเป็น 1 วัน (ไม่ต้องติดกัน) · วันที่ 7 รางวัลใหญ่แล้วเริ่มรอบใหม่ · ของส่งเข้ากล่องจดหมาย 📬</p>
      <div class="cw-days">${cells}</div>
      <p class="cw-today">${checked ? `✔ วันนี้เช็กอินแล้ว (วันที่ ${ci.day}/${LOGIN_DAYS})` : 'วันนี้ยังไม่ได้เช็กอิน'}${unread ? ` · มีรางวัลรอรับ ${unread} ฉบับ <button type="button" class="primary" data-mail="1">เปิดกล่องจดหมาย</button>` : ''}</p></section>
      <section class="cw-sec"><h3>สถิติ</h3><div class="cw-stats"><span><b>${ci.count}</b>เช็กอินรวม (วัน)</span><span><b>${ci.streak}</b>ติดต่อกันตอนนี้</span><span><b>${ci.best}</b>ติดต่อกันสูงสุด</span></div>
      <p class="cw-hint">เช็กอินรวม 7 / 30 / 100 วัน และติดต่อกัน 7 วัน ได้ฉายาในหน้าความสำเร็จ</p></section>`;
  }
}
