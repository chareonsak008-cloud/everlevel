// v0.77 หน้าต่างหลอมอุปกรณ์นิรันดร์กาล (การ์ธ ช่างตีเหล็ก)
import { ITEMS, describeBonus } from '../data/items.js?v=0.93.0-p3.34';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p3.34';
import { statsToBonus } from '../data/affixes.js?v=0.93.0-p3.34';
import { ETERNAL_LINES, ETERNAL_SLOTS, eternalId, baseOf, LUCK_MAX, LUCK_STEP } from '../data/eternal.js?v=0.93.0-p3.34';
import { forgeCheck, invHave } from '../systems/EternalForge.js?v=0.93.0-p3.34';
import { parentJob, JOBS } from '../data/progression.js?v=0.93.0-p3.34';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const SLOT_TH = { weapon: 'อาวุธ', shield: 'มือรอง', head: 'หัว', body: 'ชุด', garment: 'ผ้าคลุม', shoes: 'รองเท้า', accessory: 'เครื่องประดับ' };

export class EternalWindow {
  constructor(root, game) {
    this.g = game; this.line = 'blade'; this.slot = 'weapon'; this.luck = 0;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm eternalw'; el.hidden = true; el.setAttribute('aria-label', 'หลอมอุปกรณ์นิรันดร์กาล');
    el.innerHTML = `<header class="st-head"><div><h2 class="r-eternal-text">✦ หลอมอุปกรณ์นิรันดร์กาล</h2><p>เกรดสูงสุดของเกม · หลอมจากอุปกรณ์เทพสวรรค์ · มีโอกาสล้มเหลว</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <nav class="et-lines inv-tabs">${Object.entries(ETERNAL_LINES).map(([k, L]) => `<button type="button" data-line="${k}">${L.icon} ${esc(L.name)}</button>`).join('')}</nav>
      <div class="tm-body et-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => {
      const L = e.target.closest('[data-line]'); if (L) { this.line = L.dataset.line; this.render(); return; }
      const S = e.target.closest('[data-slot]'); if (S) { this.slot = S.dataset.slot; this.render(); return; }
      const K = e.target.closest('[data-luck]'); if (K) { this.luck = +K.dataset.luck; this.render(); return; }
      if (e.target.closest('[data-forge]')) this.g.forgeEternal(this.line, this.slot, this.luck);
    });
    this.body = el.querySelector('.et-body');
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) {
    this.el.hidden = !on;
    if (on) { const j = parentJob(this.g.player.jobId) || this.g.player.jobId; const mine = Object.entries(ETERNAL_LINES).find(([, L]) => L.job === j); if (mine && !this.picked) this.line = mine[0]; this.picked = true; this.render(); }
  }

  render() {
    if (!this.open) return;
    const pl = this.g.player, Ln = ETERNAL_LINES[this.line];
    for (const b of this.el.querySelectorAll('[data-line]')) b.setAttribute('aria-selected', String(b.dataset.line === this.line));
    const id = eternalId(this.line, this.slot), it = ITEMS[id], c = forgeCheck(pl, this.line, this.slot, this.luck);
    const slots = ETERNAL_SLOTS.map((s) => { const x = eternalId(this.line, s), has = invHave(pl.inventory, x) || Object.values(pl.equip).some((k) => k && String(k).split('*')[0] === x);
      return `<button type="button" class="slot r-eternal et-slot${s === this.slot ? ' on' : ''}" data-slot="${s}" title="${esc(ITEMS[x].name)}"><img alt="" src="${iconURL(x)}">${has ? '<i class="et-own">✔</i>' : ''}<small>${SLOT_TH[s]}</small></button>`; }).join('');
    const set = ITEMS[eternalId(this.line, 'weapon')].set;
    const setTxt = Object.entries(set.bonus).map(([n, b]) => `<p><b>${n} ชิ้น</b> ${esc(describeBonus(statsToBonus(b)))}</p>`).join('');
    const baseId = baseOf(this.line, this.slot), baseName = ITEMS[baseId] ? ITEMS[baseId].name : baseId;
    const matRow = (iid, need, have) => `<li class="${have >= need ? 'ok' : 'no'}"><img alt="" src="${iconURL(iid)}"><span>${esc(ITEMS[iid] ? ITEMS[iid].name : iid)}</span><b>${fmt(have)} / ${fmt(need)}</b></li>`;
    const luckHave = invHave(pl.inventory, 'refine_luck');
    this.body.innerHTML = `
      <div class="et-slots">${slots}</div>
      <section class="et-item">
        <div class="et-head"><span class="slot r-eternal et-big"><img alt="" src="${iconURL(id)}"></span>
          <div><b class="r-eternal-text et-name">${esc(it.name)}</b><small>นิรันดร์กาล · ${SLOT_TH[this.slot]} · Lv.${it.reqLevel} · ${esc(Ln.name)} (${esc((JOBS[Ln.job] || {}).name || Ln.job)} / ${esc((JOBS[Ln.job2] || {}).name || Ln.job2)})</small>
          <p class="et-stats">${esc(describeBonus(it.bonus))}</p></div></div>
        <details class="et-set"><summary>โบนัสเซ็ต${esc(Ln.name)} (สวมอาวุธ + เกราะในเซ็ต)</summary>${setTxt}</details>
      </section>
      <section class="et-recipe"><h3>วัตถุดิบ</h3><ul class="et-mats">
        <li class="${c.base ? 'ok' : 'no'}"><img alt="" src="${iconURL(baseId)}"><span>${esc(baseName)} <em>(ฐาน · ใช้ชิ้นที่ตีบวกน้อยสุด ระดับตีบวก/การ์ดของฐานจะหายไป)</em></span><b>${c.base ? '✔' : '✗'}</b></li>
        ${c.mats.map((m) => matRow(m.id, m.n, m.have)).join('')}
        <li class="${pl.zeny >= c.zeny ? 'ok' : 'no'}"><span class="et-z">Z</span><span>Zeny</span><b>${fmt(pl.zeny)} / ${fmt(c.zeny)}</b></li>
      </ul>
      <div class="et-luck">หินนำโชค (+${Math.round(LUCK_STEP * 100)}% ต่อก้อน · มี ${luckHave}): ${[0, 1, 2].slice(0, LUCK_MAX + 1).map((n) => `<button type="button" class="ghost${this.luck === n ? ' on' : ''}" data-luck="${n}" ${n > luckHave ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      <div class="et-go"><span>โอกาสสำเร็จ <b>${Math.round(c.rate * 100)}%</b></span><button type="button" class="dq-btn gold" data-forge ${c.ok ? '' : 'disabled'}>หลอม</button></div>
      <p class="et-note">${!c.lvOk ? `ต้องมี Base Lv.${it.reqLevel} ขึ้นไป · ` : ''}ล้มเหลว = เสียวัตถุดิบและ Zeny ทั้งหมด (อุปกรณ์ฐานไม่หาย) · เศษนิรันดร์กาลดรอปจากมอน Sky Citadel / MVP Lv.117+ และแลกได้ที่ร้านเหรียญผนึก</p></section>`;
  }
}
