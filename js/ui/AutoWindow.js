// หน้าต่างตีมอนออโต้ (v0.14 · ปุ่ม H) + ปุ่ม AUTO ลอยบนจอ (กดเริ่ม/หยุดได้ทันที)
// ตั้งค่า: ยาเพิ่ม HP/SP อัตโนมัติ · ระยะการตี · ติ๊กมอนที่จะตี (มีรูปมอน) · ตีตัวที่โจมตีเราก่อน · สกิลที่ใช้ (v0.17.1: เอาเก็บของอัตโนมัติออก)
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';
import { SKILLS, skillSp } from '../data/skills.js';
import { iconURL } from '../render/ItemIcons.js';
import { skillIconURL } from '../render/SkillIcons.js';
import { monsterThumb } from '../render/MonsterThumbs.js';
import { AUTO_RANGE, HP_POTS, SP_POTS, potHeal, mapMonsters, autoSkillRole } from '../systems/AutoHunt.js';

const ROLE_LABEL = { attack: 'โจมตีเป้าหมาย', aoe: 'โจมตีรอบตัว', buff: 'บัฟ · ใช้ใหม่เมื่อหมดเวลา', heal: 'รักษา · ใช้เมื่อ HP ต่ำกว่าที่ตั้ง' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class AutoWindow {
  constructor(root, game) {
    this.g = game;
    this.open = false;
    const anchor = root.querySelector('#petw');
    const host = (anchor && anchor.parentElement) || root;

    // ปุ่ม AUTO ลอยบนจอ
    const dock = this.dock = document.createElement('div');
    dock.className = 'auto-dock';
    dock.innerHTML = `<button type="button" class="ad-go" aria-pressed="false" title="เริ่ม/หยุดตีมอนออโต้ (Z)"><i aria-hidden="true">⚔</i><b>AUTO</b></button>`
      + `<button type="button" class="ad-set" aria-label="ตั้งค่าตีมอนออโต้" title="ตั้งค่าตีมอนออโต้ (H)">⚙</button><span class="ad-st" aria-live="polite"></span>`;
    host.append(dock);
    dock.querySelector('.ad-go').addEventListener('click', () => this.g.auto.toggle());
    dock.querySelector('.ad-set').addEventListener('click', () => this.toggle());

    // หน้าต่างตั้งค่า
    const el = this.el = document.createElement('section');
    el.className = 'panel autow'; el.id = 'autow'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'awTitle');
    const pot = (k, label) => `<div class="aw-pot" data-pot="${k}">
        <label class="aw-chk"><input type="checkbox" data-k="${k}On"><span>${label} เมื่อต่ำกว่า</span></label>
        <div class="aw-slide"><input type="range" min="10" max="90" step="5" data-k="${k}Pct" aria-label="${label} เมื่อต่ำกว่ากี่เปอร์เซ็นต์"><output></output></div>
        <select data-k="${k}Item" aria-label="ยาที่ใช้${label}"></select></div>`;
    el.innerHTML = `
      <header class="st-head"><div><h2 id="awTitle">ตีมอนออโต้</h2><p class="aw-sub"></p></div>
        <button type="button" class="st-close aw-close" aria-label="ปิดหน้าต่างตีมอนออโต้">✕</button></header>
      <div class="aw-run"><button type="button" class="aw-go"></button>
        <p class="aw-tip"><kbd>Z</kbd> เริ่ม/หยุด · <kbd>H</kbd> เปิดหน้านี้ · เดินเองระหว่างออโต้ = ย้ายจุดตี · แตะมอนเอง = ตีตัวนั้นก่อน</p></div>
      <section class="aw-sec"><h3>ยาอัตโนมัติ</h3>
        ${pot('hp', 'เพิ่มเลือด (HP)')}
        ${pot('sp', 'เพิ่ม SP (MP)')}
        <label class="aw-chk aw-small"><input type="checkbox" data-k="potAlways"><span>ใช้ยาอัตโนมัติตลอดเวลา แม้ไม่ได้เปิดออโต้</span></label>
      </section>
      <section class="aw-sec"><h3>ระยะการตี <output class="aw-range-v"></output></h3>
        <div class="aw-slide"><input type="range" min="${AUTO_RANGE[0]}" max="${AUTO_RANGE[1]}" step="1" data-k="range" aria-label="ระยะการตี (ช่อง)"></div>
        <p class="aw-hint">นับจากจุดที่กดเริ่ม — มีวงเส้นประสีฟ้าบนพื้นบอกขอบเขต</p>
      </section>
      <section class="aw-sec"><h3>การต่อสู้</h3>
        <label class="aw-chk"><input type="checkbox" data-k="retaliate"><span>ตีมอนสเตอร์ที่โจมตีเราก่อน<small>สู้กลับทันที แม้ไม่ได้ติ๊กมอนตัวนั้นไว้ · ไม่ติ๊ก = สนใจเฉพาะมอนที่เลือก</small></span></label>
        <label class="aw-chk"><input type="checkbox" data-k="goHome"><span>ยาเลือดหมด / กระเป๋าเต็ม → ใช้ใบกลับเมืองแล้วหยุด<small class="aw-scroll"></small></span></label>
      </section>
      <section class="aw-sec"><div class="aw-h"><h3>มอนสเตอร์ที่จะตี</h3><span class="aw-allbtns"><button type="button" data-all="1">เลือกทั้งหมด</button><button type="button" data-all="0">ไม่เลือก</button></span></div>
        <p class="aw-hint aw-mapname"></p>
        <div class="aw-mobs"></div>
      </section>
      <section class="aw-sec"><h3>สกิลที่ใช้</h3><div class="aw-skills"></div></section>`;
    host.append(el);
    this.$ = (s) => el.querySelector(s);

    for (const n of [el, dock]) for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) n.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    this.$('.aw-close').addEventListener('click', () => this.toggle(false));
    this.$('.aw-go').addEventListener('click', () => {
      if (this.g.auto.on) this.g.auto.stop('กดหยุดเอง');
      else if (this.g.auto.start()) this.toggle(false);   // เริ่มแล้วปิดหน้าต่างให้เห็นจอเกม
    });
    el.addEventListener('input', (e) => this.onInput(e, false));
    el.addEventListener('change', (e) => this.onInput(e, true));
    for (const b of el.querySelectorAll('[data-all]')) b.addEventListener('click', () => this.pickAll(b.dataset.all === '1'));
  }

  get cfg() { return this.g.player.auto; }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.render();
  }

  onInput(e, commit) {
    const t = e.target, c = this.cfg, auto = this.g.auto;
    if (t.dataset.k) {
      const k = t.dataset.k;
      if (t.type === 'checkbox') { if (!commit) return; c[k] = t.checked; }
      else if (t.type === 'range') c[k] = +t.value;
      else if (commit) c[k] = t.value;
      else return;
      auto.changed(k);
      this.syncValues();
      return;
    }
    if (!commit) return;
    if (t.dataset.mob) {
      c.pick[t.dataset.mob] = t.checked;
      t.closest('.aw-mob').classList.toggle('off', !t.checked);
      this.g.dirty = true;
      this.syncSub();
    } else if (t.dataset.skill) {
      const id = t.dataset.skill;
      c.skills = c.skills.filter((s) => s !== id);
      if (t.checked) c.skills.push(id);
      // เรียงตามลำดับในรายการ (สกิลแรงอยู่ก่อนตามลำดับที่เรียน)
      const order = [...this.el.querySelectorAll('[data-skill]')].map((x) => x.dataset.skill);
      c.skills.sort((a, b) => order.indexOf(a) - order.indexOf(b));
      this.g.dirty = true;
    }
  }

  pickAll(v) {
    for (const cb of this.el.querySelectorAll('[data-mob]')) {
      cb.checked = v; this.cfg.pick[cb.dataset.mob] = v;
      cb.closest('.aw-mob').classList.toggle('off', !v);
    }
    this.g.dirty = true;
    this.syncSub();
  }

  // ปุ่ม AUTO + ข้อความสถานะ (เรียกทุกครั้งที่สถานะออโต้เปลี่ยน)
  sync() {
    const a = this.g.auto, on = a.on;
    const go = this.dock.querySelector('.ad-go');
    this.dock.classList.toggle('on', on);
    this.dock.classList.toggle('safe', !this.g.mobs);
    go.setAttribute('aria-pressed', String(on));
    go.querySelector('b').textContent = on ? 'หยุด' : 'AUTO';
    const st = this.dock.querySelector('.ad-st');
    st.textContent = on ? a.status || 'ออโต้ทำงาน' : '';
    st.hidden = !on;
    if (this.open) this.syncSub();
  }

  syncSub() {
    const a = this.g.auto, on = a.on;
    const n = this.el.querySelectorAll('[data-mob]:checked').length;
    this.$('.aw-sub').textContent = on ? `กำลังทำงาน · ${a.status || ''}` : !this.g.mobs ? 'อยู่ในเมือง — ตั้งค่าไว้ก่อนได้ แล้วไปกดเริ่มที่ทุ่ง/ดันเจี้ยน' : `พร้อม · เลือกมอนไว้ ${n} ชนิด`;
    const go = this.$('.aw-go');
    go.textContent = on ? '■ หยุดตีออโต้' : '▶ เริ่มตีออโต้ที่นี่';
    go.className = 'aw-go ' + (on ? 'ghost' : 'primary');
  }

  // ค่าในช่องตั้งค่า (ตัวเลข/ติ๊ก)
  syncValues() {
    const c = this.cfg;
    for (const inp of this.el.querySelectorAll('[data-k]')) {
      const k = inp.dataset.k;
      if (inp.type === 'checkbox') inp.checked = !!c[k];
      else if (document.activeElement !== inp || inp.type !== 'range') inp.value = c[k];
      if (inp.type === 'range' && inp.nextElementSibling && inp.nextElementSibling.tagName === 'OUTPUT') inp.nextElementSibling.textContent = `${c[k]}%`;
    }
    this.$('.aw-range-v').textContent = `${c.range} ช่อง`;
    for (const k of ['hp', 'sp']) this.el.querySelector(`[data-pot="${k}"]`).classList.toggle('off', !c[k + 'On']);
    const sc = this.g.player.inventory.count('return_scroll');
    this.$('.aw-scroll').textContent = sc ? `มีใบกลับเมือง ${sc} ใบ` : 'ยังไม่มีใบกลับเมือง — ซื้อได้ที่ร้านของใช้ (ถ้าไม่มีจะหยุดอยู่กับที่)';
  }

  // รายการยาในช่องเลือก (จำนวนในกระเป๋าเปลี่ยนบ่อย)
  renderPots() {
    const inv = this.g.player.inventory, c = this.cfg;
    for (const [k, list] of [['hp', HP_POTS], ['sp', SP_POTS]]) {
      const sel = this.el.querySelector(`select[data-k="${k}Item"]`);
      const opts = [`<option value="auto">อัตโนมัติ — เลือกยาที่เหมาะเอง</option>`];
      for (const id of list) {
        const n = inv.count(id);
        opts.push(`<option value="${id}">${esc(ITEMS[id].name)} (+${potHeal(id, k)} ${k === 'hp' ? 'HP' : 'SP'}) · มี ${n}</option>`);
      }
      sel.innerHTML = opts.join('');
      sel.value = c[k + 'Item'];
    }
  }

  render() {
    if (!this.open) return;
    const g = this.g, c = this.cfg;
    this.renderPots();
    this.syncValues();

    // มอนสเตอร์: ของแผนที่นี้ (อยู่ในเมือง = แสดงทุกชนิด ตั้งล่วงหน้าได้)
    let types = mapMonsters(g.map.def, g.mobs);
    const all = !types.length;
    if (all) types = Object.keys(MONSTERS).sort((a, b) => (MONSTERS[a].mvp ? 1 : 0) - (MONSTERS[b].mvp ? 1 : 0) || MONSTERS[a].level - MONSTERS[b].level);
    this.$('.aw-mapname').textContent = all ? 'อยู่ในเมือง — แสดงมอนทุกแผนที่ (ติ๊กไว้ล่วงหน้าได้)' : `ในแผนที่ ${g.map.def.name} · แตะรูปเพื่อติ๊ก/ไม่ติ๊ก`;
    const box = this.$('.aw-mobs');
    box.innerHTML = types.map((t) => {
      const d = MONSTERS[t], on = g.auto.pickOk(t);
      const tags = [d.mvp ? '<em class="mvp">MVP</em>' : '', d.aggressive ? '<em class="agg">ดุ</em>' : ''].join('');
      return `<label class="aw-mob${on ? '' : ' off'}${d.mvp ? ' is-mvp' : ''}" title="${esc(d.name)} Lv.${d.level}${d.aggressive ? ' · เข้ามาตีเอง' : ''}">
        <input type="checkbox" data-mob="${t}"${on ? ' checked' : ''}><span class="aw-pic"><img alt="" data-thumb="${t}"></span>
        <span class="aw-nm">${esc(d.name)}</span><span class="aw-lv">Lv.${d.level}${tags}</span><i class="aw-ck" aria-hidden="true"></i></label>`;
    }).join('');
    this.loadThumbs();

    // สกิลที่เรียนแล้วและใช้กับออโต้ได้
    const pl = g.player;
    const ids = Object.keys(SKILLS).filter((id) => pl.skillLv(id) > 0 && autoSkillRole(SKILLS[id]));
    const sk = this.$('.aw-skills');
    sk.innerHTML = ids.length ? ids.map((id) => {
      const s = SKILLS[id], lv = pl.skillLv(id), role = autoSkillRole(s);
      return `<label class="aw-skill" data-role="${role}"><input type="checkbox" data-skill="${id}"${c.skills.includes(id) ? ' checked' : ''}>
        <img alt="" src="${skillIconURL(id)}"><span><b>${esc(s.name)} Lv.${lv}</b><small>${ROLE_LABEL[role]} · SP ${skillSp(s, lv)}${s.bow ? ' · ต้องใช้ธนู' : ''}</small></span></label>`;
    }).join('') : '<p class="aw-hint">ยังไม่มีสกิลที่ใช้ได้ — เรียนสกิลที่หน้าต่างสกิล (K) แล้วกลับมาติ๊กที่นี่</p>';
    this.syncSub();
  }

  // วาดรูปมอนทีละตัว (ไม่ให้หน้าจอค้างตอนเปิดหน้าต่าง)
  loadThumbs() {
    const imgs = [...this.el.querySelectorAll('img[data-thumb]')];
    const token = this.thumbToken = (this.thumbToken || 0) + 1;
    const next = () => {
      if (token !== this.thumbToken || !this.open) return;
      const img = imgs.shift();
      if (!img) return;
      const url = monsterThumb(img.dataset.thumb);
      if (url) img.src = url; else img.closest('.aw-pic').classList.add('noimg');
      setTimeout(next, 0);
    };
    setTimeout(next, 0);
  }

  // เรียกเมื่อของในกระเป๋าเปลี่ยน
  refresh() { if (this.open) { this.renderPots(); this.syncValues(); } }
}
