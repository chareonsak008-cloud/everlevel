// หน้าต่างตีบวกอุปกรณ์ (v0.10) — เปิดจากการ์ธ ช่างตีเหล็ก
import { ITEMS, BASE_ITEMS, itemMods, describeBonus, EQUIP_SLOTS } from '../data/items.js';
import { REFINE_RATE, REFINE_MAX, BREAK_FROM, SAFE_LIMIT, refineBonus } from '../data/refine.js';
import { refineTargets, refineCheck } from '../systems/Forge.js';
import { iconURL } from '../render/ItemIcons.js';
import { fmtZ } from '../data/shops.js';

const HAMMER = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30 30 L52 52" stroke="#8a5a32" stroke-width="7" stroke-linecap="round"/><path d="M14 14 l18 -6 l10 10 l-6 18 z" fill="#c8d0dc" stroke="#2a1d2c" stroke-width="3" stroke-linejoin="round"/><path d="M18 16 l12 -4" stroke="#fff" stroke-width="2" opacity=".7"/></svg>';
const slotName = (id) => (EQUIP_SLOTS.find((s) => s.id === id) || {}).name || id;

export class RefineWindow {
  constructor(root, player, actions) {
    this.player = player;
    this.act = actions;    // { refine(ref, guard) → result, onClose }
    this.el = root.querySelector('#refine');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.sel = null;
    this.guard = false;
    this.confirm = false;
    this.busy = false;
    this.$('refClose').addEventListener('click', () => this.close());
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  show() { this.open = true; this.el.hidden = false; this.sel = null; this.guard = false; this.confirm = false; this.$('refResult').innerHTML = ''; this.render(); }

  close() {
    if (!this.open) return;
    this.open = false; this.el.hidden = true; this.busy = false;
    if (this.act.onClose) this.act.onClose();
  }

  same(a, b) { return a && b && a.where === b.where && a.key === b.key && a.slot === b.slot; }

  render() {
    if (!this.open) return;
    const p = this.player;
    const list = refineTargets(p);
    if (this.sel && !list.some((r) => this.same(r, this.sel))) this.sel = null;
    if (!this.sel && list.length) this.sel = list[0];
    const box = this.$('refList'); box.innerHTML = '';
    for (const r of list) {
      const it = ITEMS[r.key], { refine } = itemMods(r.key);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'ref-row' + (this.same(r, this.sel) ? ' sel' : '');
      const next = refine >= REFINE_MAX ? 'MAX' : `${REFINE_RATE[refine + 1]}%`;
      b.innerHTML = `<img alt="" src="${iconURL(r.key)}"><span class="rn"><b></b><small>${r.where === 'equip' ? 'สวมอยู่ · ' + slotName(r.slot) : 'ในกระเป๋า' + (r.qty > 1 ? ` x${r.qty}` : '')}</small></span><em class="${refine >= BREAK_FROM - 1 ? 'risk' : refine >= SAFE_LIMIT ? 'warn' : ''}">${next}</em>`;
      b.querySelector('b').textContent = it.name;
      b.addEventListener('click', () => { if (this.busy) return; this.sel = r; this.confirm = false; this.$('refResult').innerHTML = ''; this.render(); });
      box.append(b);
    }
    if (!list.length) box.innerHTML = '<p class="inv-empty">ไม่มีอุปกรณ์ที่ตีบวกได้ (เครื่องประดับตีบวกไม่ได้)</p>';
    this.$('refZeny').textContent = fmtZ(p.zeny);
    this.$('refMats').textContent = `ผลึกอาวุธ ${p.inventory.count('refine_w')} · ผลึกเกราะ ${p.inventory.count('refine_a')} · คริสตัลพิทักษ์ ${p.inventory.count('refine_guard')}`;
    this.renderDetail();
  }

  renderDetail() {
    const box = this.$('refDetail'), p = this.player, r = this.sel;
    if (!r) { box.innerHTML = '<p class="hint">เลือกอุปกรณ์ที่ต้องการตีบวก</p>'; return; }
    const it = ITEMS[r.key], { base, refine } = itemMods(r.key), B = BASE_ITEMS[base];
    const chk = refineCheck(p, r, this.guard);
    const max = refine >= REFINE_MAX;
    const failTxt = { none: 'ล้มเหลว: ไม่เสียอะไร', down: 'ล้มเหลว: ระดับลดลง 1', break: 'ล้มเหลว: อุปกรณ์แตกหาย!' }[chk.fail] || '';
    const now = describeBonus(refineBonus(B, refine)) || '-', after = max ? '' : describeBonus(refineBonus(B, refine + 1));
    box.innerHTML = `
      <div class="ref-stage${max ? ' max' : ''}">
        <div class="ref-anvil"><img alt="" src="${iconURL(r.key)}"><span class="ref-lv">${refine ? '+' + refine : '+0'}</span></div>
        <div class="ref-hammer">${HAMMER}</div>
      </div>
      <div class="ref-info">
        <b class="ref-name"></b>
        ${max ? '<p class="ref-max">ตีบวกถึงระดับสูงสุด +10 แล้ว!</p>' : `
        <p class="ref-up"><span>+${refine}</span> → <b>+${refine + 1}</b> <i class="ref-rate" style="--k:${chk.rate}%">${chk.rate}%</i></p>
        <p class="ref-bonus">ตีบวกตอนนี้: ${now}<br>หลังตีบวก: <b>${after}</b></p>
        <p class="ref-fail ${chk.fail}">${failTxt}</p>
        <p class="ref-cost"><img alt="" src="${iconURL(chk.mat)}"> ${ITEMS[chk.mat].name} x1 <small>(มี ${p.inventory.count(chk.mat)})</small> · ค่าตีบวก ${fmtZ(chk.fee)}</p>
        ${chk.target >= BREAK_FROM ? `<label class="ref-guard"><input type="checkbox" ${this.guard ? 'checked' : ''}> ใช้คริสตัลพิทักษ์กันแตก <small>(มี ${p.inventory.count('refine_guard')})</small></label>` : ''}`}
        <div class="d-actions"></div>
        <p class="ref-msg">${!max && !chk.ok ? chk.reason : ''}</p>
      </div>`;
    box.querySelector('.ref-name').textContent = it.name;
    const g = box.querySelector('.ref-guard input');
    if (g) g.addEventListener('change', (e) => { this.guard = e.target.checked; this.confirm = false; this.renderDetail(); });
    if (max) return;
    const a = box.querySelector('.d-actions');
    const btn = document.createElement('button'); btn.type = 'button';
    const risky = chk.fail === 'break';
    btn.className = this.confirm ? 'danger' : 'primary';
    btn.textContent = this.confirm ? `ยืนยัน! เสี่ยงแตก (${chk.rate}%)` : `ตีบวก +${chk.target}`;
    btn.disabled = !chk.ok || this.busy;
    btn.addEventListener('click', () => {
      if (risky && !this.confirm) { this.confirm = true; this.renderDetail(); return; }
      this.confirm = false;
      this.strike();
    });
    a.append(btn);
  }

  // แอนิเมชันค้อนทุบ 3 ครั้ง แล้วประกาศผล
  strike() {
    if (this.busy || !this.sel) return;
    this.busy = true;
    const stage = this.$('refDetail').querySelector('.ref-stage');
    stage.classList.add('hit');
    if (this.act.sound) [0, 300, 600].forEach((ms) => setTimeout(() => this.act.sound('anvil'), ms + 120));
    this.$('refResult').innerHTML = '';
    this.renderButtonsDisabled();
    setTimeout(() => {
      const res = this.act.refine(this.sel, this.guard);
      this.busy = false;
      if (!res || res.error) { this.$('refResult').innerHTML = `<p class="bad">${res ? res.error : 'ตีบวกไม่สำเร็จ'}</p>`; this.render(); return; }
      if (res.newKey) this.sel = { ...this.sel, key: res.newKey };
      else this.sel = null;
      if (this.guard && res.guarded) this.guard = this.player.inventory.count('refine_guard') > 0 && this.guard;
      this.render();
      const out = this.$('refResult');
      const msg = res.result === 'success' ? `<p class="ok">สำเร็จ! ได้ ${ITEMS[res.newKey].name}</p>`
        : res.result === 'break' ? '<p class="broke">ล้มเหลว... อุปกรณ์แตกละเอียด!</p>'
          : `<p class="down">ล้มเหลว... ระดับลดเหลือ +${res.to}${res.guarded ? ' (คริสตัลพิทักษ์กันแตกไว้ได้)' : ''}</p>`;
      out.innerHTML = msg;
      const st = this.$('refDetail').querySelector('.ref-stage');
      if (st) st.classList.add(res.result === 'success' ? 'win' : 'lose');
    }, 900);
  }

  renderButtonsDisabled() { this.$('refDetail').querySelectorAll('.d-actions button').forEach((b) => { b.disabled = true; }); }
}
