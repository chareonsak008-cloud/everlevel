// หน้าต่างสัตว์เลี้ยง (v0.13 · ปุ่ม P) — สัตว์ที่ฟักได้ · เรียกออกมา/เก็บกลับ · ตัวกรองการเก็บของ · ไข่ในกระเป๋า
import { PETS, PET_ORDER, PET_RARITY, PET_EGGS, petStats, STAR_MAX, fmtPct, petsOfTier } from '../data/pets.js';
import { ITEMS } from '../data/items.js';
import { iconURL } from '../render/ItemIcons.js';
import { petThumb } from '../render/PetThumbs.js';
import { PET_FILTERS } from '../systems/PetSystem.js';

const EGGS = ['egg_spot', 'egg_moon', 'egg_galaxy'];

export class PetWindow {
  constructor(root, player, act) {
    this.p = player;
    this.act = act;           // { summon(id|null), hatch(eggId), filter(f), stats(id) }
    this.el = root.querySelector('#petw');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.sel = null;
    this.$('petClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
    const f = this.$('petFilter');
    for (const [k, label] of PET_FILTERS) { const o = document.createElement('option'); o.value = k; o.textContent = label; f.append(o); }
    f.addEventListener('change', () => this.act.filter(f.value));
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open && !this.sel) this.sel = this.p.pets.active || PET_ORDER.find((id) => this.p.pets.owned[id] != null) || PET_ORDER[0];
    this.render();
  }

  select(id) { this.sel = id; this.render(); }

  render() {
    if (!this.open) return;
    const P = this.p.pets, owned = Object.keys(P.owned).length;
    this.$('petSub').textContent = `ได้มาแล้ว ${owned} / ${PET_ORDER.length} ตัว · ${P.active ? `ออกมาอยู่: ${PETS[P.active].name}` : 'ยังไม่ได้เรียกตัวไหนออกมา'}`;
    this.$('petFilter').value = P.filter;

    // ไข่ในกระเป๋า
    const eggs = EGGS.filter((e) => this.p.inventory.count(e) > 0);
    const eb = this.$('petEggs');
    eb.innerHTML = eggs.length ? '' : '<span class="pet-noegg">ยังไม่มีไข่ในกระเป๋า — ไข่ดรอปจากมอนสเตอร์และ MVP</span>';
    for (const e of eggs) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pet-egg';
      b.innerHTML = `<img alt="" src="${iconURL(e)}"><span><b></b><small>มี ${this.p.inventory.count(e)} ใบ · กดเพื่อฟัก</small></span>`;
      b.querySelector('b').textContent = ITEMS[e].name;
      b.addEventListener('click', () => this.act.hatch(e));
      eb.append(b);
    }

    // รายชื่อ 12 ตัว
    const grid = this.$('petGrid'); grid.innerHTML = '';
    for (const id of PET_ORDER) {
      const d = PETS[id], has = P.owned[id] != null, col = PET_RARITY[d.tier].color;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'pet-cell' + (has ? '' : ' locked') + (id === this.sel ? ' sel' : '') + (id === P.active ? ' on' : '');
      b.style.setProperty('--tc', col);
      b.dataset.tier = d.tier;
      const url = petThumb(id);
      b.innerHTML = `${url ? `<img alt="" src="${url}">` : '<i class="pet-ph"></i>'}<span class="pet-nm"></span>${has ? `<span class="pet-st">${'★'.repeat(P.owned[id]) || '☆'}</span>` : '<span class="pet-q">?</span>'}${id === P.active ? '<span class="pet-on">ออกมาอยู่</span>' : ''}`;
      b.querySelector('.pet-nm').textContent = has ? d.name : '???';
      b.title = has ? `${d.name} · ${PET_RARITY[d.tier].name}` : `ยังไม่มี · ระดับ${PET_RARITY[d.tier].name}`;
      b.addEventListener('click', () => this.select(id));
      b.addEventListener('dblclick', () => { if (has) this.act.summon(P.active === id ? null : id); });
      grid.append(b);
    }
    this.renderDetail();
  }

  renderDetail() {
    const box = this.$('petDetail'), id = this.sel, d = PETS[id];
    if (!d) { box.innerHTML = ''; return; }
    const P = this.p.pets, has = P.owned[id] != null, stars = P.owned[id] || 0, col = PET_RARITY[d.tier].color;
    const st = has ? this.act.stats(id) : petStats(id, 0);
    const chance = PET_EGGS && Object.entries(PET_EGGS).map(([e, g]) => `${g.name} ${fmtPct((g.odds[d.tier] || 0) / petsOfTier(d.tier).length)}`).join(' · ');
    box.innerHTML = `
      <div class="d-head"><img alt="" src="${petThumb(id) || ''}" class="${has ? '' : 'locked'}"><div><b style="color:${col}"></b>
      <small>${PET_RARITY[d.tier].name} · ${d.en}${has ? ` · ${stars ? '★'.repeat(stars) : 'ยังไม่มีดาว'}${stars >= STAR_MAX ? ' (สูงสุด)' : ''}` : ' · ยังไม่มี'}</small></div></div>
      <p class="d-desc"></p>
      <p class="d-stats">รัศมีเก็บของ <b>${st.radius}</b> ช่อง · ความเร็ว <b>${st.speed}%</b> · ขนต่อรอบ <b>${st.carry || 'ไม่จำกัด'}</b></p>
      <p class="d-skill"><b></b><br><span></span></p>
      ${has ? '' : `<p class="d-price">ฟักได้จาก: ${chance}</p>`}
      <div class="d-actions"></div>`;
    box.querySelector('.d-head b').textContent = has ? d.name : '???';
    box.querySelector('.d-desc').textContent = has ? d.flavor : 'ยังไม่เคยฟักได้ตัวนี้ — ลองฟักไข่ดูนะ';
    box.querySelector('.d-skill b').textContent = `ความสามารถพิเศษ: ${d.skill.name}`;
    box.querySelector('.d-skill span').textContent = d.skill.desc;
    const actions = box.querySelector('.d-actions');
    if (has) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = P.active === id ? 'ghost' : 'primary';
      b.textContent = P.active === id ? 'เก็บกลับ' : 'เรียกออกมา';
      b.addEventListener('click', () => this.act.summon(P.active === id ? null : id));
      actions.append(b);
      if (d.mods.revive && P.active === id) {
        const left = this.act.reviveLeft();
        const s = document.createElement('small'); s.className = 'pet-cd';
        s.textContent = left > 0 ? `ชุบชีวิตได้อีกใน ${Math.ceil(left / 60)} นาที` : 'พร้อมชุบชีวิตเจ้าของ';
        actions.append(s);
      }
    }
  }
}
