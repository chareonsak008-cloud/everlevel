// หน้าต่างกระเป๋า + อุปกรณ์ที่สวมใส่ (เปิดด้วย I หรือ Alt+E)
import { ITEMS, EQUIP_SLOTS, RARITY, describeBonus, canJobUse, itemMods, BASE_ITEMS } from '../data/items.js?v=0.93.0-p1.10';
import { duraOf, DURA_MAX, DURA_LOW } from '../data/durability.js?v=0.93.0-p1.10';   // v0.89
import { weaponLines, rollLine } from './WeaponInfo.js?v=0.93.0-p1.10';
import { refineBonus, canRefine } from '../data/refine.js?v=0.93.0-p1.10';
import { CARDS, cardSlotName } from '../data/cards.js?v=0.93.0-p1.10';
import { socketTargets } from '../systems/Forge.js?v=0.93.0-p1.10';
import { JOBS } from '../data/progression.js?v=0.93.0-p1.10';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.10';
import { sellPrice, fmtZ } from '../data/shops.js?v=0.93.0-p1.10';
import { BOX_ODDS, FASHION_RARITY, FASHION_TIERS, fmtPct } from '../data/fashionBoxes.js?v=0.93.0-p1.10';
import { fmtDur } from '../data/consumables.js?v=0.93.0-p1.10';
import { PET_EGGS, PET_RARITY, PET_TIERS } from '../data/pets.js?v=0.93.0-p1.10';

const TABS = [
  { id: 'all', name: 'ทั้งหมด', test: () => true },
  { id: 'usable', name: 'ใช้งาน', test: (it) => it.type === 'usable' || it.type === 'box' },
  { id: 'equip', name: 'อุปกรณ์', test: (it) => it.type === 'equip' },
  { id: 'mat', name: 'วัสดุ/การ์ด', test: (it) => (it.type === 'etc' && it.keep) || it.type === 'card' },   // v0.93 แยกวัสดุที่ใช้ได้ออกจากขยะ
  { id: 'junk', name: 'ขยะ', test: (it) => it.type === 'etc' && !it.keep },
];
const isJunk = (it) => it && it.type === 'etc' && !it.keep;
// v0.93 จัดเรียง: ของใช้ → กล่อง → อุปกรณ์ (หายากก่อน) → การ์ด → วัสดุ → ขยะ
const ORDER = (it) => (it.type === 'usable' ? 0 : it.type === 'box' ? 1 : it.type === 'equip' ? 2 : it.type === 'card' ? 3 : it.keep ? 4 : 5);
const RANK = (it) => { const k = Object.keys(RARITY).indexOf(it.rarity || 'common'); return k < 0 ? 0 : k; };
export function sortStacks(stacks) {
  stacks.sort((a, b) => { const A = ITEMS[a.id], B = ITEMS[b.id]; if (!A || !B) return !A - !B; return ORDER(A) - ORDER(B) || (A.type === 'equip' ? (A.slot || '').localeCompare(B.slot || '') : 0) || RANK(B) - RANK(A) || (B.reqLevel || 0) - (A.reqLevel || 0) || String(A.name).localeCompare(String(B.name), 'th') || String(a.id).localeCompare(String(b.id)); });
}
const TYPE_NAME = { usable: 'ไอเทมใช้งาน', etc: 'ของสะสม', equip: 'อุปกรณ์', box: 'กล่องสุ่มแฟชั่น', card: 'การ์ดมอนสเตอร์' };
const slotThai = (id) => (EQUIP_SLOTS.find((s) => s.id === id) || {}).name || id;

export class InventoryWindow {
  constructor(root, player, actions) {
    this.player = player;
    this.act = actions;           // { use, equip, unequip, drop, assign, open, socket }
    this.el = root.querySelector('#inv');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = 'all';
    this.sel = null;              // { from: 'bag' | 'equip', id, slot }
    this.confirmDrop = false;
    this.sockPick = null;         // การ์ด: แถวอุปกรณ์ที่กำลังรอยืนยันการใส่

    const tabs = this.$('invTabs');
    for (const t of TABS) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t.name; b.dataset.tab = t.id; b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { this.tab = t.id; this.render(); });
      tabs.append(b);
    }
    const so = document.createElement('button'); so.type = 'button'; so.className = 'inv-sort'; so.textContent = '⇅ จัดเรียง'; so.title = 'จัดระเบียบกระเป๋า: ของใช้ → อุปกรณ์ → การ์ด → วัสดุ → ขยะ';
    so.addEventListener('click', () => { sortStacks(this.player.inventory.stacks); if (this.act.sorted) this.act.sorted(); this.render(); });
    const foot = this.el.querySelector('.inv-foot'); if (foot) foot.prepend(so); else tabs.append(so);
    this.$('invClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (!this.open) { this.sel = null; this.confirmDrop = false; }
    this.render();
  }

  select(sel) { this.sel = sel; this.confirmDrop = false; this.sockPick = null; this.render(); }

  cell(id, qty, { equipped = false, slotName = '' } = {}) {
    const it = id && ITEMS[id];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot' + (it ? ' r-' + (it.rarity || 'common') : ' empty');
    if (it) {
      const m = it.type === 'equip' ? itemMods(id) : null;
      b.innerHTML = `<img alt="" src="${iconURL(id)}">` + (qty > 1 ? `<span class="qty">${qty}</span>` : '')
        + (m && m.refine ? `<span class="ref">+${m.refine}</span>` : '')
        + (m && m.slots ? `<span class="cslots">${Array.from({ length: m.slots }, (_, i) => `<i class="${m.cards[i] ? 'on' : ''}"></i>`).join('')}</span>` : '');
      if (it.type === 'card') b.classList.add('is-card');
      if (isJunk(it)) { b.classList.add('is-junk'); b.insertAdjacentHTML('beforeend', '<span class="junk-tag">ขยะ</span>'); }
      b.title = it.name + (qty > 1 ? ` x${qty}` : '');
      b.setAttribute('aria-label', b.title);
    } else {
      b.innerHTML = `<span class="slot-name">${slotName}</span>`;
      b.setAttribute('aria-label', `ช่อง${slotName}ว่าง`);
    }
    if (equipped) b.classList.add('eq');
    if (it && it.type === 'equip') { const d = duraOf(this.player, id); if (d <= 0) { b.classList.add('broken'); b.title += ' (พัง)'; } else if (d <= DURA_LOW) b.classList.add('dura-low'); }   // v0.89
    return b;
  }

  render() {
    if (!this.open) return;
    const p = this.player, inv = p.inventory;
    this.$('invCount').textContent = `${inv.stacks.length} / ${inv.capacity}`;
    this.$('invZeny').textContent = fmtZ(p.zeny);
    this.$('invTabs').querySelectorAll('button[data-tab]').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)); const t = TABS.find((x) => x.id === b.dataset.tab), n = t.id !== 'junk' ? 0 : inv.stacks.filter((x) => ITEMS[x.id] && t.test(ITEMS[x.id])).length; b.textContent = n ? `${t.name} ${n}` : t.name; });

    // ช่องสวมใส่
    const eq = this.$('invEquip'); eq.innerHTML = '';
    for (const sl of EQUIP_SLOTS) {
      const id = p.equip[sl.id];
      const row = document.createElement('div'); row.className = 'eq-row';
      const c = this.cell(id, 1, { slotName: sl.name, equipped: true });
      if (id) c.addEventListener('click', () => this.select({ from: 'equip', id, slot: sl.id }));
      if (id) c.addEventListener('dblclick', () => this.act.unequip(sl.id));
      if (this.sel && this.sel.from === 'equip' && this.sel.slot === sl.id) c.classList.add('sel');
      const lbl = document.createElement('span'); lbl.className = 'eq-label';
      lbl.innerHTML = `<small>${sl.name}</small>${id ? ITEMS[id].name : '<em>ว่าง</em>'}`;
      row.append(c, lbl); eq.append(row);
    }

    // ช่องกระเป๋า
    const grid = this.$('invGrid'); grid.innerHTML = '';
    const test = TABS.find((t) => t.id === this.tab).test;
    const list = inv.stacks.filter((s) => test(ITEMS[s.id]));
    for (const s of list) {
      const c = this.cell(s.id, s.qty);
      c.draggable = true;
      c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', s.id); e.dataTransfer.effectAllowed = 'copy'; });
      c.addEventListener('click', () => this.select({ from: 'bag', id: s.id }));
      c.addEventListener('dblclick', () => this.primary(s.id));
      if (this.sel && this.sel.from === 'bag' && this.sel.id === s.id) c.classList.add('sel');
      grid.append(c);
    }
    if (!list.length) grid.innerHTML = '<p class="inv-empty">ยังไม่มีไอเทมในหมวดนี้ ลองกำจัดมอนสเตอร์ใน Beginner Field ดูสิ</p>';

    this.renderDetail();
  }

  primary(id) {
    const it = ITEMS[id];
    if (it.type === 'usable' || it.type === 'box') this.act.use(id);
    else if (it.type === 'equip') this.act.equip(id);
  }

  renderDetail() {
    const box = this.$('invDetail');
    const sel = this.sel;
    const p = this.player;
    if (sel && sel.from === 'bag' && p.inventory.count(sel.id) <= 0) this.sel = null;
    if (sel && sel.from === 'equip' && p.equip[sel.slot] !== sel.id) this.sel = null;
    if (!this.sel) { box.innerHTML = '<p class="hint">เลือกไอเทมเพื่อดูรายละเอียด · ดับเบิลคลิกเพื่อใช้/สวมใส่ · ลากไปวางที่ปุ่มลัดด้านล่างได้</p>'; return; }

    const { id } = this.sel, it = ITEMS[id], rar = RARITY[it.rarity || 'common'];
    const lines = [];
    if (it.heal) {
      const h = [];
      if (it.heal.hp) h.push(`HP +${it.heal.hp[0]}~${it.heal.hp[1]}`);
      if (it.heal.sp) h.push(`SP +${it.heal.sp[0]}~${it.heal.sp[1]}`);
      lines.push(`ฟื้นฟู ${h.join(' · ')}`);
    }
    // v0.13: ไอเทมใช้งานชุดใหม่ — ผล + ระยะเวลา
    if (it.effect) lines.push(`<span class="eff-line">${it.effect}${it.dur ? ` · ${fmtDur(it.dur)}` : ''}</span>`);
    // อุปกรณ์: แยกโบนัสฐาน / ตีบวก / การ์ด
    const mods = it.type === 'equip' ? itemMods(id) : null;
    if (it.form) {   // v0.25: อาวุธชุดใหม่
      lines.push(...weaponLines(it, p));
      if (mods.refine) lines.push(`<span class="ref-line">ตีบวก +${mods.refine}: ${describeBonus(refineBonus(BASE_ITEMS[mods.base], mods.refine))}</span>`);
      for (const c of mods.cards) lines.push(`<span class="card-line">${ITEMS[c].name}: ${describeBonus(CARDS[c].bonus)}</span>`);
    } else if (mods && (mods.refine || mods.cards.length)) {
      if (Object.keys(it.baseBonus || {}).length) lines.push(describeBonus(it.baseBonus));
      if (mods.refine) lines.push(`<span class="ref-line">ตีบวก +${mods.refine}: ${describeBonus(refineBonus(BASE_ITEMS[mods.base], mods.refine))}</span>`);
      for (const c of mods.cards) lines.push(`<span class="card-line">${ITEMS[c].name}: ${describeBonus(CARDS[c].bonus)}</span>`);
    } else if (it.bonus) lines.push(it.type === 'card' ? `ใส่ได้กับ: ${cardSlotName(it.on)} · ${describeBonus(it.bonus)}` : describeBonus(it.rolled ? it.baseBonus : it.bonus));
    if (!it.form && it.rolls) lines.push(rollLine(it));   // v0.52/0.58 ค่าสุ่มพิเศษของอาวุธ + อุปกรณ์สวมใส่ทุกชิ้น
    if (mods && mods.slots) lines.push(`ช่องการ์ด: ${Array.from({ length: mods.slots }, (_, i) => (mods.cards[i] ? `[${ITEMS[mods.cards[i]].name}]` : '[ว่าง]')).join(' ')}`);
    if (mods && !canRefine(it) && it.slot === 'accessory') lines.push('<span class="muted">เครื่องประดับตีบวกไม่ได้</span>');
    // กล่องแฟชั่น: ตารางโอกาสสุ่มแต่ละระดับ
    const eggOdds = it.use && it.use.hatch && PET_EGGS[it.use.hatch] && PET_EGGS[it.use.hatch].odds;
    const odds = it.type === 'box' && BOX_ODDS[id]
      ? `<div class="d-odds">${FASHION_TIERS.filter((t) => BOX_ODDS[id][t] > 0).map((t) => `<span data-rarity="${t}" style="--rc:${FASHION_RARITY[t].color}"><b>${FASHION_RARITY[t].name}</b>${fmtPct(BOX_ODDS[id][t])}</span>`).join('')}</div>`
      : eggOdds ? `<div class="d-odds">${PET_TIERS.filter((t) => eggOdds[t] > 0).map((t) => `<span data-rarity="${t}" style="--rc:${PET_RARITY[t].color}"><b>${PET_RARITY[t].name}</b>${fmtPct(eggOdds[t])}</span>`).join('')}</div>` : '';
    if (it.type === 'equip') { const d = duraOf(p, id); lines.push(`<span class="${d <= 0 ? 'bad' : d <= DURA_LOW ? 'warn' : ''}">ความทนทาน ${Math.ceil(d)}/${DURA_MAX}${d <= 0 ? ' · พังแล้ว ไม่ให้ค่าสถานะ — ซ่อมที่ช่างตีเหล็ก' : ''}</span>`); }   // v0.89
    if (it.reqLevel) lines.push(`<span class="${p.baseLevel < it.reqLevel ? 'bad' : ''}">ต้องการ Base Lv.${it.reqLevel}</span>`);
    if (it.jobs) lines.push(`<span class="${canJobUse(it, p.jobId) ? '' : 'bad'}">อาชีพ: ${it.jobs.map((j) => JOBS[j].name).join(', ')}</span>`);
    const slotName = it.slot ? ' · ' + EQUIP_SLOTS.find((s) => s.id === it.slot).name : '';
    box.innerHTML = `
      <div class="d-head"><img alt="" src="${iconURL(id)}"><div><b style="color:${rar.color}">${it.name}</b>
      <small>${TYPE_NAME[it.type]}${slotName} · ${rar.name}${this.sel.from === 'bag' ? ` · มี ${p.inventory.count(id)} ชิ้น` : ' · กำลังสวมใส่'}</small></div></div>
      <p class="d-desc">${it.desc || ''}</p>
      <p class="d-price">ขายร้านได้ ${fmtZ(sellPrice(id))}${this.sel.from === 'bag' && p.inventory.count(id) > 1 ? ` · ทั้งหมด ${fmtZ(sellPrice(id) * p.inventory.count(id))}` : ''}</p>
      ${lines.length ? `<p class="d-stats">${lines.join('<br>')}</p>` : ''}
      ${odds}
      <div class="d-actions"></div>
      <div class="d-keys" hidden></div>`;
    const actions = box.querySelector('.d-actions');
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls; b.addEventListener('click', fn); actions.append(b); return b; };

    if (this.sel.from === 'equip') {
      btn('ถอดออก', () => this.act.unequip(this.sel.slot), 'primary');
    } else {
      if (it.type === 'usable') btn(it.use && it.use.hatch ? 'ฟักไข่' : 'ใช้', () => this.act.use(id), 'primary');
      if (it.type === 'card') {
        if (this.act.viewCard) btn('ดูการ์ด', () => this.act.viewCard(id));   // v0.29
        const targets = socketTargets(p, id);
        btn(this.sockPick === undefined || this.sockPick === null ? `ใส่การ์ด (${targets.length})` : 'ซ่อนรายการ', () => { this.sockPick = this.sockPick == null ? '' : null; this.renderDetail(); }, 'primary').disabled = !targets.length;
        if (this.sockPick != null) {
          const list = document.createElement('div'); list.className = 'd-sock';
          for (const t of targets) {
            const tit = ITEMS[t.key], m = itemMods(t.key), sure = this.sockPick === t.where + t.key + (t.slot || '');
            const b = document.createElement('button'); b.type = 'button'; b.className = 'sock-row' + (sure ? ' sure' : '');
            b.innerHTML = `<img alt="" src="${iconURL(t.key)}"><span><b></b><small>${t.where === 'equip' ? 'สวมอยู่' : 'ในกระเป๋า'} · ช่องว่าง ${m.slots - m.cards.length}/${m.slots}</small></span><em>${sure ? 'ยืนยัน? (ถอดคืนได้ที่ช่างตีเหล็ก ค่าบริการแพง)' : 'ใส่'}</em>`;
            b.querySelector('b').textContent = tit.name;
            b.addEventListener('click', () => {
              const k = t.where + t.key + (t.slot || '');
              if (this.sockPick !== k) { this.sockPick = k; this.renderDetail(); return; }
              this.sockPick = null;
              this.act.socket(id, t);
            });
            list.append(b);
          }
          box.querySelector('.d-actions').after(list);
        }
      }
      if (it.type === 'box') {
        btn('เปิดกล่อง', () => this.act.open(id, 1), 'primary');
        const n = Math.min(10, p.inventory.count(id));
        if (n > 1) btn(`เปิด ${n} กล่อง`, () => this.act.open(id, n), 'primary');
      }
      if (it.type === 'equip') btn('สวมใส่', () => this.act.equip(id), 'primary');
      if (it.type !== 'etc' && it.type !== 'card') {
        const keys = box.querySelector('.d-keys');
        btn('ตั้งปุ่มลัด', () => { keys.hidden = !keys.hidden; });
        for (let i = 0; i < 9; i++) {
          const k = document.createElement('button'); k.type = 'button'; k.textContent = `F${i + 1}`;
          if (p.hotbar[i] === id) k.classList.add('on');
          k.addEventListener('click', () => { this.act.assign(i, id); keys.hidden = true; this.render(); });
          keys.append(k);
        }
      }
      btn(this.confirmDrop ? 'ยืนยันทิ้ง 1 ชิ้น?' : 'ทิ้ง', () => {
        if (!this.confirmDrop) { this.confirmDrop = true; this.renderDetail(); return; }
        this.confirmDrop = false;
        this.act.drop(id);
      }, this.confirmDrop ? 'danger' : 'ghost');
    }
  }
}
