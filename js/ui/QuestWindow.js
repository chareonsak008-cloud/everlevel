// หน้าต่างเควส (v0.10, กด J) + แถบติดตามเควสบนจอ
import { QUESTS, QUEST_KIND } from '../data/quests.js';
import { npcWhere, rewardText } from '../systems/Quests.js';

const TABS = [['active', 'กำลังทำ'], ['available', 'รับได้'], ['daily', 'รายวัน'], ['weekly', 'รายสัปดาห์'], ['done', 'สำเร็จแล้ว']];

export class QuestWindow {
  constructor(root, player, log, actions) {
    this.player = player;
    this.log = log;
    this.act = actions;   // { abandon(id) }
    this.el = root.querySelector('#quest');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = 'active';
    this.confirmAbandon = null;
    // จอเตี้ย (มือถือแนวนอน) พับแถบติดตามไว้ก่อน ไม่ให้บังปุ่มโจมตี
    this.trackerOpen = !(window.innerHeight < 560 && window.innerWidth > window.innerHeight);
    const tabs = this.$('qTabs');
    for (const [id, name] of TABS) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.textContent = name;
      b.addEventListener('click', () => { this.tab = id; this.confirmAbandon = null; this.render(); });
      tabs.append(b);
    }
    this.$('qClose').addEventListener('click', () => this.toggle(false));
    this.$('qtHead').addEventListener('click', () => { this.trackerOpen = !this.trackerOpen; this.renderTracker(); });
    for (const el of [this.el, this.$('qtrack')]) for (const ev of ['pointerdown', 'wheel', 'contextmenu']) el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open && !this.log.activeIds().length && this.tab === 'active') this.tab = 'available';
    this.confirmAbandon = null;
    this.render();
  }

  ids(tab) {
    const L = this.log, all = Object.keys(QUESTS);
    const order = (a, b) => ['main', 'side', 'daily', 'weekly'].indexOf(QUESTS[a].kind) - ['main', 'side', 'daily', 'weekly'].indexOf(QUESTS[b].kind);
    if (tab === 'active') return L.activeIds().sort((a, b) => (L.status(b) === 'ready') - (L.status(a) === 'ready') || order(a, b));
    if (tab === 'available') return all.filter((id) => QUESTS[id].kind !== 'daily' && L.status(id) === 'available').sort(order);
    if (tab === 'weekly') return all.filter((id) => QUESTS[id].kind === 'weekly');
    if (tab === 'daily') return all.filter((id) => QUESTS[id].kind === 'daily');
    return all.filter((id) => QUESTS[id].kind !== 'daily' && L.status(id) === 'done');
  }

  goalsHTML(id) {
    return `<ul class="q-goals">${this.log.progress(id).map((g) => `<li class="${g.done ? 'ok' : ''}"><span>${g.done ? '✔' : '•'} ${g.text}</span>${g.type === 'kill' || g.type === 'collect' || g.n > 1 ? `<em>${g.cur}/${g.n}</em><i style="--k:${(g.cur / g.n) * 100}%"></i>` : ''}</li>`).join('')}</ul>`;
  }

  card(id, tab) {
    const q = QUESTS[id], L = this.log, st = L.status(id), K = QUEST_KIND[q.kind];
    const el = document.createElement('article');
    el.className = `q-card k-${q.kind} s-${st}`;
    el.style.setProperty('--kc', K.color);
    const where = st === 'ready' ? `ส่งเควสที่ ${npcWhere(q.turnIn)}` : st === 'active' ? (q.turnIn !== q.giver ? `ส่งที่ ${npcWhere(q.turnIn)}` : `ส่งที่ ${npcWhere(q.turnIn)}`) : st === 'locked' ? L.lockReason(id) : st === 'done' ? (q.kind === 'weekly' ? 'ทำแล้วสัปดาห์นี้ · รีเซ็ตจันทร์ 00:00 น. เวลาไทย' : q.kind === 'daily' ? 'ทำแล้ววันนี้ · กลับมาใหม่พรุ่งนี้' : 'สำเร็จแล้ว') : `รับได้ที่ ${npcWhere(q.giver)}`;
    el.innerHTML = `
      <header><span class="q-kind">${K.name}</span><b></b>${st === 'ready' ? '<span class="q-ready">ส่งได้!</span>' : st === 'done' ? '<span class="q-done">✔</span>' : ''}</header>
      <p class="q-where">${where}</p>
      ${st === 'active' || st === 'ready' ? this.goalsHTML(id) : ''}
      ${tab !== 'done' && st !== 'done' ? `<p class="q-desc"></p><p class="q-rew">รางวัล: ${rewardText(q.rewards).join(' · ')}</p>` : ''}
      <div class="q-act"></div>`;
    el.querySelector('b').textContent = q.name;
    const d = el.querySelector('.q-desc');
    if (d) d.textContent = st === 'active' ? q.wait || q.intro : q.intro;
    if (st === 'active' || st === 'ready') {
      const b = document.createElement('button'); b.type = 'button';
      const sure = this.confirmAbandon === id;
      b.className = sure ? 'danger' : 'ghost';
      b.textContent = sure ? 'ยืนยันยกเลิก? (ความคืบหน้าหาย)' : 'ยกเลิกเควส';
      b.addEventListener('click', () => {
        if (!sure) { this.confirmAbandon = id; this.render(); return; }
        this.confirmAbandon = null; this.act.abandon(id);
      });
      el.querySelector('.q-act').append(b);
    }
    return el;
  }

  render() {
    this.renderTracker();
    if (!this.open) return;
    const L = this.log;
    const act = L.activeIds().length, done = Object.keys(QUESTS).filter((id) => QUESTS[id].kind !== 'daily' && L.status(id) === 'done').length;
    this.$('qSub').textContent = `กำลังทำ ${act} · สำเร็จแล้ว ${done}/${Object.values(QUESTS).filter((q) => q.kind !== 'daily').length} · รายวันวันนี้ ${Object.keys(QUESTS).filter((id) => QUESTS[id].kind === 'daily' && L.status(id) === 'done').length}/${Object.values(QUESTS).filter((q) => q.kind === 'daily').length}`;
    this.$('qTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)));
    const list = this.$('qList'); list.innerHTML = '';
    const ids = this.ids(this.tab);
    for (const id of ids) list.append(this.card(id, this.tab));
    if (!ids.length) {
      const msg = { active: 'ยังไม่มีเควสที่กำลังทำ — คุยกับ NPC ที่มีเครื่องหมาย ! เหนือหัวเพื่อรับเควส', available: 'ไม่มีเควสใหม่ที่รับได้ตอนนี้ ลองเพิ่มเลเวลหรือทำเควสเนื้อเรื่องต่อ', done: 'ยังไม่มีเควสที่สำเร็จ' }[this.tab];
      list.innerHTML = `<p class="inv-empty">${msg}</p>`;
    }
    if (this.tab === 'available') {
      // บอกเควสเนื้อเรื่องถัดไปที่ยังล็อกอยู่
      const next = Object.keys(QUESTS).find((id) => QUESTS[id].kind === 'main' && L.status(id) === 'locked' && (QUESTS[id].req || []).every((r) => L.st.done[r]));
      if (next) { const c = this.card(next, 'available'); c.classList.add('locked'); list.append(c); }
    }
  }

  // แถบติดตามเควสใต้แผนที่ย่อ
  renderTracker() {
    const L = this.log, box = this.$('qtrack');
    const ids = L.activeIds().sort((a, b) => (L.status(b) === 'ready') - (L.status(a) === 'ready'));
    box.hidden = !ids.length;
    if (!ids.length) return;
    this.$('qtCount').textContent = ids.length;
    box.classList.toggle('closed', !this.trackerOpen);
    const list = this.$('qtList');
    if (!this.trackerOpen) { list.innerHTML = ''; return; }
    list.innerHTML = '';
    for (const id of ids.slice(0, 5)) {
      const q = QUESTS[id], ready = L.status(id) === 'ready';
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'qt-item' + (ready ? ' ready' : '');
      b.style.setProperty('--kc', QUEST_KIND[q.kind].color);
      b.innerHTML = `<b></b>${ready ? `<span class="qt-goal ok">✔ ส่งที่ ${npcWhere(q.turnIn)}</span>` : L.progress(id).map((g) => `<span class="qt-goal${g.done ? ' ok' : ''}">${g.text}${g.type === 'kill' || g.type === 'collect' ? ` ${g.cur}/${g.n}` : g.done ? ' ✔' : ''}</span>`).join('')}`;
      b.querySelector('b').textContent = q.name;
      b.addEventListener('click', () => { this.tab = 'active'; this.toggle(true); });
      list.append(b);
    }
  }
}
