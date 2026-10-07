// ตู้แฟชั่น (v0.9): ดูชิ้นที่สะสมได้ สวม/ถอดแฟชั่น ดูชุดเซ็ต · เปิดด้วย O
// ชิ้นที่ยังไม่มีจะแสดงเป็นภาพสีเทาพร้อมแม่กุญแจ (ได้จากการเปิดกล่องแฟชั่นเท่านั้น)
import { COSTUMES, COSTUME_BY_ID, SETS } from '../data/costumes.js';
import { FASHION_RARITY, TIER_RANK, BOX_ODDS, BOX_ITEMS, fmtPct, poolSize } from '../data/fashionBoxes.js';
import { SLOT_INFO } from '../render/Costumes.js';
import { requestThumb, clearThumbQueue } from '../render/CostumeThumbs.js';
import { FASHION_SLOTS } from '../entities/Player.js';

const TABS = [...FASHION_SLOTS.map((s) => [s, SLOT_INFO[s].name]), ['set', 'ชุดเซ็ต']];
const WTYPE = { sword: 'ดาบ/มีด', dual: 'มีดคู่ (มีด/ดาบ)', staff: 'ไม้เท้า', mace: 'คทา/กระบอง', bow: 'ธนู' };
const byTier = (a, b) => (TIER_RANK[b.rarity] || 0) - (TIER_RANK[a.rarity] || 0);
const setTier = (s) => s.rarity || s.items.map((id) => COSTUME_BY_ID[id]).reduce((t, c) => (c && TIER_RANK[c.rarity] > TIER_RANK[t] ? c.rarity : t), 'common');

export class WardrobeWindow {
  constructor(root, player, actions) {
    this.player = player;
    this.act = actions;   // { wear(id), takeOff(slot), wearSet(ids), toggleHidden(), takeOffAll() }
    this.el = root.querySelector('#ward');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = 'wings';
    this.sel = null;          // id ชิ้นแฟชั่น หรือ id ชุดเซ็ต
    this.ownedOnly = false;

    const tabs = this.$('wardTabs');
    for (const [id, name] of TABS) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.textContent = name;
      b.addEventListener('click', () => { this.tab = id; this.sel = null; this.$('wardGrid').scrollTop = 0; this.render(); });
      tabs.append(b);
    }
    this.$('wardClose').addEventListener('click', () => this.toggle(false));
    this.$('wardOwned').addEventListener('change', (e) => { this.ownedOnly = e.target.checked; this.render(); });
    this.$('wardHide').addEventListener('click', () => this.act.toggleHidden());
    this.$('wardOff').addEventListener('click', () => this.act.takeOffAll());
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (!this.open) clearThumbQueue();
    this.render();
  }

  // เปิดตู้แล้วเลือกชิ้นนี้ทันที (จากหน้าต่างเปิดกล่อง)
  focus(id) {
    const it = id && COSTUME_BY_ID[id];
    if (it) { this.tab = it.slot; this.sel = id; }
    this.toggle(true);
    const cell = it && this.el.querySelector(`[data-id="${id}"]`);
    if (cell) cell.scrollIntoView({ block: 'nearest' });
  }

  thumb(it, img) { setTimeout(() => requestThumb(it, img), 0); }

  render() {
    if (!this.open) return;
    const p = this.player, F = p.fashion;
    this.$('wardSub').textContent = `สะสมแล้ว ${F.owned.size} / ${COSTUMES.length} ชิ้น · เปิดกล่องไปแล้ว ${F.opened.toLocaleString('en-US')} กล่อง`;
    this.$('wardHide').textContent = F.hidden ? 'แสดงแฟชั่น' : 'ซ่อนแฟชั่น';
    this.$('wardHide').setAttribute('aria-pressed', String(F.hidden));
    this.$('wardTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)));
    this.renderWorn();
    if (this.tab === 'set') this.renderSets(); else this.renderGrid();
    this.renderDetail();
  }

  renderWorn() {
    const p = this.player, box = this.$('wardWorn'); box.innerHTML = '';
    for (const slot of FASHION_SLOTS) {
      const id = p.fashion.worn[slot], it = id && COSTUME_BY_ID[id];
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'wslot' + (it ? '' : ' empty') + (it && !p.fashionFits(it) ? ' off' : '');
      if (it) {
        b.style.setProperty('--rc', FASHION_RARITY[it.rarity].color);
        b.innerHTML = '<img alt="">';
        b.title = `${SLOT_INFO[slot].name}: ${it.name}${p.fashionFits(it) ? '' : ' (ซ่อนอยู่ — อาวุธไม่ตรงประเภท)'} · ดับเบิลคลิกเพื่อถอด`;
        this.thumb(it, b.querySelector('img'));
        b.addEventListener('click', () => { this.tab = slot; this.sel = id; this.render(); });
        b.addEventListener('dblclick', () => this.act.takeOff(slot));
      } else {
        b.innerHTML = `<span>${SLOT_INFO[slot].name}</span>`;
        b.title = `ช่อง${SLOT_INFO[slot].name}ว่าง`;
        b.addEventListener('click', () => { this.tab = slot; this.sel = null; this.render(); });
      }
      b.setAttribute('aria-label', b.title);
      box.append(b);
    }
  }

  renderGrid() {
    const p = this.player, grid = this.$('wardGrid'); grid.innerHTML = '';
    const all = COSTUMES.filter((c) => c.slot === this.tab).sort(byTier);
    const own = all.filter((c) => p.fashion.owned.has(c.id)).length;
    this.$('wardCount').textContent = `${SLOT_INFO[this.tab].name} ${own}/${all.length}`;
    const list = this.ownedOnly ? all.filter((c) => p.fashion.owned.has(c.id)) : all;
    for (const it of list) {
      const owned = p.fashion.owned.has(it.id), worn = p.fashion.worn[it.slot] === it.id;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'wcell' + (owned ? '' : ' locked') + (worn ? ' worn' : '') + (this.sel === it.id ? ' sel' : '');
      b.dataset.rarity = it.rarity; b.dataset.id = it.id;
      b.style.setProperty('--rc', FASHION_RARITY[it.rarity].color);
      b.innerHTML = `<img alt=""><small>${FASHION_RARITY[it.rarity].name}</small><b></b>${worn ? '<i class="w-on">สวมอยู่</i>' : ''}${owned ? '' : '<i class="w-lock" aria-hidden="true"></i>'}`;
      b.querySelector('b').textContent = it.name;
      b.title = it.name + (owned ? '' : ' (ยังไม่มี)');
      this.thumb(it, b.querySelector('img'));
      b.addEventListener('click', () => { this.sel = it.id; this.render(); });
      b.addEventListener('dblclick', () => { if (owned) { if (worn) this.act.takeOff(it.slot); else this.act.wear(it.id); } });
      grid.append(b);
    }
    if (!list.length) grid.innerHTML = '<p class="inv-empty">ยังไม่มีชิ้นแฟชั่นในหมวดนี้ — กำจัดมอนสเตอร์เพื่อลุ้นกล่องแฟชั่น แล้วเปิดจากกระเป๋า</p>';
  }

  renderSets() {
    const p = this.player, grid = this.$('wardGrid'); grid.innerHTML = '';
    const sets = [...SETS].sort((a, b) => TIER_RANK[setTier(b)] - TIER_RANK[setTier(a)]);
    const done = sets.filter((s) => s.items.every((id) => p.fashion.owned.has(id))).length;
    this.$('wardCount').textContent = `ชุดเซ็ตครบ ${done}/${sets.length}`;
    for (const s of sets) {
      const have = s.items.filter((id) => p.fashion.owned.has(id)).length;
      if (this.ownedOnly && !have) continue;
      const tier = setTier(s);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'wcell set' + (have === s.items.length ? ' full' : have ? '' : ' locked') + (this.sel === s.id ? ' sel' : '');
      b.dataset.rarity = tier; b.dataset.id = s.id;
      b.style.setProperty('--rc', FASHION_RARITY[tier].color);
      b.innerHTML = `<img alt=""><small>${have}/${s.items.length} ชิ้น</small><b></b>`;
      b.querySelector('b').textContent = s.name;
      this.thumb({ ...s, rarity: tier }, b.querySelector('img'));
      b.addEventListener('click', () => { this.sel = s.id; this.render(); });
      grid.append(b);
    }
  }

  renderDetail() {
    const p = this.player, box = this.$('wardDetail');
    const set = this.tab === 'set' && SETS.find((s) => s.id === this.sel);
    const it = !set && this.sel && COSTUME_BY_ID[this.sel];
    if (!set && !it) {
      box.innerHTML = `<p class="hint">เลือกชิ้นแฟชั่นเพื่อดูรายละเอียด · ดับเบิลคลิกเพื่อสวม/ถอด · แฟชั่นเป็นชุดทับ ไม่เปลี่ยนค่าสถานะ<br>โอกาสต่อกล่อง: ${this.oddsLine()}</p>`;
      return;
    }
    if (set) return this.renderSetDetail(set);
    const R = FASHION_RARITY[it.rarity], owned = p.fashion.owned.has(it.id), worn = p.fashion.worn[it.slot] === it.id;
    const fit = p.fashionFits(it);
    const per = poolSize(it.rarity);
    box.innerHTML = `
      <div class="wd-head" style="--rc:${R.color}" data-rarity="${it.rarity}">
        <img alt="" class="${owned ? '' : 'locked'}">
        <div><b class="wd-name"></b><small class="wd-en"></small>
          <span class="wd-tags"><span class="g-rar" data-rarity="${it.rarity}">${R.name}</span> ${SLOT_INFO[it.slot].name}${it.wtype ? ' · ' + WTYPE[it.wtype] : ''}</span></div>
      </div>
      <p class="d-desc"></p>
      ${owned
        ? `<p class="wd-own">${worn ? (fit ? '✔ กำลังสวมใส่' : '⚠ สวมอยู่แต่ซ่อนไว้ — ต้องถืออาวุธประเภท' + WTYPE[it.wtype]) : '✔ อยู่ในตู้แฟชั่นแล้ว'}</p>`
        : `<p class="wd-lock">🔒 ยังไม่มี · ได้จากการเปิดกล่องแฟชั่น — โอกาสต่อกล่องที่จะได้ชิ้นนี้: ${this.chanceLine(it.rarity, per)}</p>`}
      ${it.slot === 'weapon' && owned && !worn ? `<p class="wd-note">แสดงเมื่อถืออาวุธประเภท${WTYPE[it.wtype]}</p>` : ''}
      <div class="d-actions"></div>`;
    box.querySelector('.wd-name').textContent = it.name;
    box.querySelector('.wd-en').textContent = it.en;
    box.querySelector('.d-desc').textContent = it.desc;
    this.thumb(it, box.querySelector('img'));
    const a = box.querySelector('.d-actions');
    const btn = (label, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls; b.addEventListener('click', fn); a.append(b); };
    if (owned && !worn) btn('สวมใส่', () => this.act.wear(it.id), 'primary');
    if (worn) btn('ถอดออก', () => this.act.takeOff(it.slot), 'primary');
  }

  renderSetDetail(s) {
    const p = this.player, box = this.$('wardDetail');
    const tier = setTier(s), R = FASHION_RARITY[tier];
    const have = s.items.filter((id) => p.fashion.owned.has(id));
    box.innerHTML = `
      <div class="wd-head" style="--rc:${R.color}" data-rarity="${tier}"><img alt="" class="${have.length ? '' : 'locked'}">
        <div><b class="wd-name"></b><small class="wd-en"></small><span class="wd-tags"><span class="g-rar" data-rarity="${tier}">${R.name}</span> สะสม ${have.length}/${s.items.length} ชิ้น</span></div></div>
      <p class="d-desc"></p>
      <ul class="wd-set"></ul>
      <div class="d-actions"></div>`;
    box.querySelector('.wd-name').textContent = s.name;
    box.querySelector('.wd-en').textContent = s.en;
    box.querySelector('.d-desc').textContent = s.desc;
    this.thumb({ ...s, rarity: tier }, box.querySelector('img'));
    const ul = box.querySelector('.wd-set');
    for (const id of s.items) {
      const c = COSTUME_BY_ID[id]; if (!c) continue;
      const li = document.createElement('li');
      const ok = p.fashion.owned.has(id);
      li.className = ok ? 'ok' : '';
      li.style.setProperty('--rc', FASHION_RARITY[c.rarity].color);
      li.innerHTML = `<i>${ok ? '✔' : '🔒'}</i><span></span><small>${SLOT_INFO[c.slot].name} · ${FASHION_RARITY[c.rarity].name}</small>`;
      li.querySelector('span').textContent = c.name;
      li.addEventListener('click', () => { this.tab = c.slot; this.sel = id; this.render(); });
      ul.append(li);
    }
    const a = box.querySelector('.d-actions');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'primary';
    b.textContent = have.length === s.items.length ? 'สวมทั้งเซ็ต' : `สวมชิ้นที่มี (${have.length})`;
    b.disabled = !have.length;
    b.addEventListener('click', () => this.act.wearSet(have));
    a.append(b);
  }

  // โอกาสได้ชิ้นนี้ชิ้นเดียว = โอกาสของระดับ ÷ จำนวนชิ้นในระดับ
  chanceLine(tier, per) {
    return Object.entries(BOX_ODDS).filter(([, o]) => o[tier] > 0).map(([id, o]) => `${BOX_ITEMS[id].name.replace('กล่องแฟชั่น', '')} ${fmtPct(o[tier] / per)}`).join(' · ');
  }

  oddsLine() {
    return ['legend', 'mythic', 'celestial'].map((t) => `${FASHION_RARITY[t].name} ${fmtPct(BOX_ODDS.box_wood[t])}–${fmtPct(BOX_ODDS.box_gold[t])}`).join(' · ');
  }
}
