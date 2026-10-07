// แถบปุ่มลัด F1–F9 (หรือเลข 1–9): ใช้ยา/สวมใส่อุปกรณ์/ใช้สกิลได้ทันที
import { ITEMS } from '../data/items.js';
import { SKILLS, skillSp } from '../data/skills.js';
import { iconURL } from '../render/ItemIcons.js';
import { skillIconURL } from '../render/SkillIcons.js';
import { isSkillKey, validHotkey } from '../entities/Player.js';

export class Hotbar {
  constructor(root, player, { onUse, onAssign }) {
    this.player = player;
    this.onUse = onUse; this.onAssign = onAssign;
    this.el = root.querySelector('#hotbar');
    this.arc = root.querySelector('#skillArc');   // v0.11: มือถือ — ปุ่มลัด 1–4 เรียงเป็นวงรอบปุ่มโจมตี
    this.touch = false;
    this.slots = [];
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hk';
      b.innerHTML = `<span class="key">F${i + 1}</span><img alt="" hidden><span class="qty"></span><i class="cd"></i><i class="cdw"></i>`;
      b.addEventListener('click', () => this.onUse(i));
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onAssign(i, null); });
      b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('over'); });
      b.addEventListener('dragleave', () => b.classList.remove('over'));
      b.addEventListener('drop', (e) => { e.preventDefault(); b.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (validHotkey(id)) this.onAssign(i, id); });
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.el.append(b);
      this.slots.push(b);
    }
  }

  // จอสัมผัส: ย้ายปุ่ม F1–F4 ไปวงรอบปุ่มโจมตี (ปุ่มใหญ่ กดง่าย) · ที่เหลืออยู่แถบล่าง
  layout(touch) {
    if (!this.arc || touch === this.touch) return;
    this.touch = touch;
    for (let i = 0; i < 4; i++) {
      const b = this.slots[i];
      if (touch) { b.style.setProperty('--i', i); this.arc.append(b); }
      else { b.style.removeProperty('--i'); this.el.insertBefore(b, this.slots[4]); }
    }
    this.arc.hidden = !touch;
  }

  render() {
    const p = this.player;
    this.slots.forEach((b, i) => {
      const id = p.hotbar[i];
      const img = b.querySelector('img'), q = b.querySelector('.qty');
      b.classList.remove('dim', 'eq', 'skill', 'nosp');
      if (isSkillKey(id) && SKILLS[id.slice(6)]) {
        const sid = id.slice(6), sk = SKILLS[sid], lv = p.skillLv(sid);
        img.hidden = false; img.src = skillIconURL(sid);
        q.textContent = lv ? `Lv${lv}` : '';
        b.classList.add('skill');
        b.classList.toggle('dim', !lv);
        b.title = `F${i + 1}: ${sk.name} Lv.${lv} · SP ${skillSp(sk, Math.max(1, lv))} · คลิกขวาเพื่อนำออก`;
        return;
      }
      const it = id && ITEMS[id];
      if (!it) { img.hidden = true; q.textContent = ''; b.title = `F${i + 1} ว่าง (ลากไอเทมหรือสกิลมาวาง)`; return; }
      img.hidden = false; img.src = iconURL(id);
      const n = it.type === 'equip' ? p.inventory.count(id) + (p.equip[it.slot] === id ? 1 : 0) : p.inventory.count(id);
      q.textContent = it.type === 'equip' ? '' : n;
      b.classList.toggle('dim', n <= 0);
      b.classList.toggle('eq', it.type === 'equip' && p.equip[it.slot] === id);
      b.title = `F${i + 1}: ${it.name}${it.type === 'equip' ? '' : ` (${n})`} · คลิกขวาเพื่อนำออก`;
    });
  }

  // อัปเดตคูลดาวน์และ SP ของปุ่มสกิล (เรียกถี่ ๆ จากลูปเกม)
  tick(time) {
    const p = this.player;
    this.slots.forEach((b, i) => {
      const id = p.hotbar[i];
      const w = b.lastChild;
      if (!isSkillKey(id) || !SKILLS[id.slice(6)]) { if (w.style.opacity !== '0') w.style.opacity = '0'; return; }
      const sid = id.slice(6), sk = SKILLS[sid], lv = p.skillLv(sid);
      const left = p.cooldowns[sid] != null ? p.cooldowns[sid] - time : 0;
      if (left > 0 && sk.cd) { w.style.opacity = '1'; w.style.setProperty('--k', String(Math.min(1, left / sk.cd))); } else if (w.style.opacity !== '0') w.style.opacity = '0';
      b.classList.toggle('nosp', !!lv && p.sp < skillSp(sk, lv));
      b.classList.toggle('casting', !!p.cast && p.cast.id === sid);
    });
  }

  flash(i) {
    const b = this.slots[i]; if (!b) return;
    b.classList.remove('used'); void b.offsetWidth; b.classList.add('used');
  }
}
