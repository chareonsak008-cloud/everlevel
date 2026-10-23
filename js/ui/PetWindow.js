// หน้าต่างสัตว์เลี้ยง (v0.13 · ปุ่ม P) — สัตว์ที่ฟักได้ · เรียกออกมา/เก็บกลับ · ตัวกรองการเก็บของ · ไข่ในกระเป๋า
import { PETS, PET_ORDER, PET_RARITY, PET_EGGS, petStats, STAR_MAX, fmtPct, petsOfTier } from '../data/pets.js?v=0.93.0-p1.6';
import { ITEMS } from '../data/items.js?v=0.93.0-p1.6';
import { PET_TICKETS } from '../data/consumables.js?v=0.93.0-p1.6';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.6';
import { petThumb } from '../render/PetThumbs.js?v=0.93.0-p1.6';
import { PICK_CATS, PICK_GRADES } from '../systems/PetPick.js?v=0.93.0-p1.6';
import { RARITY } from '../data/items.js?v=0.93.0-p1.6';

const EGGS = ['egg_spot', 'egg_moon', 'egg_galaxy', ...PET_TICKETS];   // v0.48: ไข่เก่า + ตั๋วสัตว์เลี้ยงจากร้านเพชร

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
    // v0.31.1: ตัวกรองแบบเดิม (ทุกอย่าง/ข้ามของธรรมดา/หายาก) ย้ายไปอยู่ในแผงตั้งค่าการเก็บของแทน
    const oldF = this.$('petFilter'); if (oldF) oldF.closest('label')?.remove();
    // v0.24.1: ตั้งค่าการเก็บของแบบละเอียด
    const foot = this.el.querySelector('.pet-foot');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ghost pet-pick-btn'; btn.textContent = '⚙ ตั้งค่าการเก็บของ';
    foot.prepend(btn);
    const pk = this.pickEl = document.createElement('section'); pk.className = 'pet-pick'; pk.hidden = true;
    foot.before(pk);
    btn.addEventListener('click', () => { pk.hidden = !pk.hidden; btn.setAttribute('aria-expanded', String(!pk.hidden)); this.renderPick(); });
    pk.addEventListener('change', (e) => {
      const t = e.target, P = this.p.pets.pick;
      if (t.dataset.cat) P[t.dataset.cat] = t.checked;
      this.act.pick(); this.renderPick();
    });
    pk.addEventListener('click', (e) => {
      const gr = e.target.closest('[data-eq]');
      if (gr) { this.p.pets.pick.eqMin = +gr.dataset.eq; this.p.pets.pick.equip = true; this.act.pick(); this.renderPick(); return; }
      const c = e.target.closest('[data-skip]'); if (!c) return;
      const P = this.p.pets.pick, id = c.dataset.skip, i = P.skip.indexOf(id);
      if (i >= 0) P.skip.splice(i, 1); else if (P.skip.length < 60) P.skip.push(id);
      this.act.pick(); this.renderPick();
    });
  }

  // แผงตั้งค่าการเก็บของ: หมวด · ระดับขั้นต่ำ · ไอเทมที่ไม่เก็บ (แตะของที่เพิ่งตกบนพื้นเพื่อสลับ)
  renderPick() {
    const pk = this.pickEl; if (!pk || pk.hidden) return;
    const P = this.p.pets.pick, seen = this.act.seenDrops ? this.act.seenDrops() : [];
    const ids = [...new Set([...P.skip, ...seen])].filter((id) => ITEMS[id]).slice(0, 40);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    pk.innerHTML = `<h3>สัตว์เลี้ยงจะเก็บ</h3>
      <div class="pp-cats">${PICK_CATS.map(([k, n]) => `<label><input type="checkbox" data-cat="${k}"${P[k] ? ' checked' : ''}> ${n}</label>`).join('')}</div>
      <div class="pp-eq${P.equip ? '' : ' off'}"><span>อุปกรณ์ เก็บตั้งแต่ระดับ</span>
        <div class="pp-grades">${PICK_GRADES.map(([k, n], i) => `<button type="button" data-eq="${i}" class="pp-g${i >= (P.eqMin || 0) ? ' on' : ''}${i === (P.eqMin || 0) ? ' cur' : ''}" style="--gc:${RARITY[k].color}" title="${n}${i ? 'ขึ้นไป' : ' (ทุกระดับ)'}">${n}</button>`).join('')}</div>
        <small>${P.equip ? `เก็บอุปกรณ์ระดับ <b style="color:${RARITY[PICK_GRADES[P.eqMin || 0][0]].color}">${PICK_GRADES[P.eqMin || 0][1]}</b>${(P.eqMin || 0) === 0 ? ' ขึ้นไป (ทุกระดับ)' : (P.eqMin || 0) === PICK_GRADES.length - 1 ? ' เท่านั้น' : ' ขึ้นไป'}` : 'ไม่เก็บอุปกรณ์ (ติ๊ก "อุปกรณ์" ด้านบนเพื่อเปิด)'}</small></div>
      <small class="pp-note">ของตีบวก ยา วัตถุดิบ การ์ด และกล่อง เก็บทั้งหมดตามหมวดที่ติ๊กไว้ — ไม่ต้องการชิ้นไหน แตะเลือกด้านล่าง</small>
      <h3>ไม่เก็บไอเทมเหล่านี้ <small>แตะเพื่อสลับ · มีขีดฆ่า = ไม่เก็บ</small></h3>
      <div class="pp-items">${ids.length ? ids.map((id) => `<button type="button" class="pp-item${P.skip.includes(id) ? ' off' : ''}" data-skip="${id}" title="${esc(ITEMS[id].name)}"><img alt="" src="${iconURL(id)}"><span>${esc(ITEMS[id].name)}</span></button>`).join('') : '<small class="pp-empty">ยังไม่มีของตกบนพื้น — ออกไปล่ามอนแล้วกลับมาเลือกได้</small>'}</div>`;
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
    this.renderPick();

    // ไข่ในกระเป๋า
    const eggs = EGGS.filter((e) => this.p.inventory.count(e) > 0);
    const eb = this.$('petEggs');
    eb.innerHTML = eggs.length ? '' : '<span class="pet-noegg">ยังไม่มีตั๋วสัตว์เลี้ยงในกระเป๋า — เลือกซื้อสัตว์เลี้ยงตัวที่ชอบได้ที่ร้านเพชร 💎</span>';
    for (const e of eggs) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pet-egg';
      b.innerHTML = `<img alt="" src="${iconURL(e)}"><span><b></b><small>มี ${this.p.inventory.count(e)} ใบ · กดเพื่อ${ITEMS[e].use && ITEMS[e].use.pet ? 'รับสัตว์เลี้ยง' : 'ฟัก'}</small></span>`;
      b.querySelector('b').textContent = ITEMS[e].name;
      b.addEventListener('click', () => (ITEMS[e].use && ITEMS[e].use.pet ? this.act.adopt(e) : this.act.hatch(e)));
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
    box.innerHTML = `
      <div class="d-head"><img alt="" src="${petThumb(id) || ''}" class="${has ? '' : 'locked'}"><div><b style="color:${col}"></b>
      <small>${PET_RARITY[d.tier].name} · ${d.en}${has ? ` · ${stars ? '★'.repeat(stars) : 'ยังไม่มีดาว'}${stars >= STAR_MAX ? ' (สูงสุด)' : ''}` : ' · ยังไม่มี'}</small></div></div>
      <p class="d-desc"></p>
      <p class="d-stats">รัศมีเก็บของ <b>${st.radius}</b> ช่อง · ความเร็ว <b>${st.speed}%</b> · ขนต่อรอบ <b>${st.carry || 'ไม่จำกัด'}</b><br><small>อาชีพตีไกล (นักธนู/นักเวทย์) วิ่งไปเก็บได้ไกลขึ้นอีก 9 ช่อง (สูงสุด 14 ช่อง)</small></p>
      <p class="d-skill"><b></b><br><span></span></p>
      ${has ? '' : '<p class="d-price">💎 ซื้อได้ที่ร้านเพชร (หมวดสัตว์เลี้ยง)</p>'}
      <div class="d-actions"></div>`;
    box.querySelector('.d-head b').textContent = has ? d.name : '???';
    box.querySelector('.d-desc').textContent = has ? d.flavor : 'ยังไม่มีตัวนี้ — เลือกซื้อได้ที่ร้านเพชร';
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
