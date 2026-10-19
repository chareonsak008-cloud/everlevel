// v0.37 กรอบปาร์ตี้ใต้แผงตัวละคร (ชื่อ เลเวล เลือดเพื่อน · อยู่แมพไหน) + กล่องคำเชิญปาร์ตี้/กิลด์
import { JOBS } from '../data/progression.js?v=0.55.1';
import { MAPS } from '../data/maps/index.js?v=0.55.1';

export class PartyFrame {
  constructor(root, game) {
    this.game = game; this.root = root;
    this.el = document.createElement('div'); this.el.className = 'party-frame'; this.el.id = 'partyFrame'; this.el.hidden = true;
    this.el.setAttribute('aria-label', 'สมาชิกปาร์ตี้');
    const host = root.querySelector('.panel.char') || root.querySelector('.hud');
    host.append(this.el);
    this.pr = document.createElement('div'); this.pr.className = 'social-prompts'; this.pr.setAttribute('aria-live', 'polite');
    (root.querySelector('.hud') || root).append(this.pr);
    for (const el of [this.el, this.pr]) for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.rows = new Map(); this.promptSig = '';
    game.social.onChange(() => this.render());
    setInterval(() => this.render(), 500);
  }

  render() {
    const g = this.game, S = g.social;
    this.renderPrompts(S);
    const list = S.inParty ? S.memberList().filter((m) => !m.me) : [];
    const show = S.inParty;
    this.el.hidden = !show;
    if (this.el.parentNode) this.el.parentNode.classList.toggle('pf-on', show);
    if (!show) { if (this.rows.size) { this.el.innerHTML = ''; this.rows.clear(); } return; }
    const map = g.map && g.map.id;
    if (!this.head) {
      this.head = document.createElement('div'); this.head.className = 'pf-head';
      this.head.innerHTML = '<b>ปาร์ตี้</b><small></small>';
    }
    if (this.head.parentNode !== this.el) this.el.prepend(this.head);
    const n = S.sameMapCount();
    this.head.querySelector('small').textContent = list.length ? (n > 1 ? `แชร์ EXP ${n} คน · +${Math.round((n - 1) * 20)}%` : 'ไม่มีเพื่อนในแมพนี้') : 'รอเพื่อนเข้าร่วม…';
    const seen = new Set();
    for (const m of list) {
      seen.add(m.key);
      let r = this.rows.get(m.key);
      if (!r) {
        r = document.createElement('div'); r.className = 'pf-row';
        r.innerHTML = '<span class="pf-crest"></span><div class="pf-info"><div class="pf-top"><b></b><span class="pf-lv"></span></div><div class="bar hp pf-hp"><i></i></div><small class="pf-map"></small></div>';
        this.rows.set(m.key, r); this.el.append(r);
      }
      const J = JOBS[m.j] || JOBS.novice;
      const remote = g.remote.list.get(m.key);
      const here = m.m === map;
      const h = here && remote ? Math.max(0, remote.hp / 100) : m.h;
      const dead = here && remote ? remote.dead : m.d;
      const crest = r.querySelector('.pf-crest');
      if (crest.textContent !== J.crest) crest.textContent = J.crest;
      crest.style.setProperty('--jc', J.color);
      r.querySelector('b').textContent = (m.leader ? '👑 ' : '') + m.n;
      r.querySelector('.pf-lv').textContent = `Lv.${m.lv}`;
      r.querySelector('.pf-hp i').style.width = `${Math.round(h * 100)}%`;
      r.classList.toggle('low', h < 0.3); r.classList.toggle('dead', !!dead); r.classList.toggle('away', !here);
      r.querySelector('.pf-map').textContent = dead ? 'หมดสติ' : here ? '' : `อยู่ที่ ${(MAPS[m.m] || {}).name || 'แผนที่อื่น'}`;
    }
    for (const [k, r] of this.rows) if (!seen.has(k)) { r.remove(); this.rows.delete(k); }
  }

  renderPrompts(S) {
    const sig = S.prompts.map((p) => p.id).join(',');
    if (sig === this.promptSig) return;
    this.promptSig = sig;
    this.pr.innerHTML = '';
    for (const p of S.prompts) {
      const d = document.createElement('div'); d.className = 'sp-card ' + p.kind;
      d.innerHTML = `<span class="sp-ic">${p.kind === 'guild' ? '🛡️' : p.kind === 'friend' ? '💛' : '🤝'}</span><p></p><div class="sp-btns"><button type="button" class="yes">ตกลง</button><button type="button" class="no">ไม่</button></div>`;
      d.querySelector('p').textContent = p.text;
      d.querySelector('.yes').addEventListener('click', () => S.answer(p.id, true));
      d.querySelector('.no').addEventListener('click', () => S.answer(p.id, false));
      this.pr.append(d);
    }
  }
}
