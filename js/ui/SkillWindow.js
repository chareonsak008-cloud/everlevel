// หน้าต่างสกิล (K หรือ Alt+S): เรียนสกิลด้วย Skill Point ดูผลแต่ละเลเวล ตั้งปุ่มลัด
import { SKILLS, jobSkills, skillTrees, skillSp, skillCast, KIND_NAME } from '../data/skills.js';
import { JOBS } from '../data/progression.js';
import { skillIconURL } from '../render/SkillIcons.js';

export class SkillWindow {
  constructor(root, player, { onLearn, onAssign, onUse } = {}) {
    this.player = player;
    this.onLearn = onLearn; this.onAssign = onAssign; this.onUse = onUse;
    this.el = root.querySelector('#skw');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = null;
    this.keysFor = null;      // สกิลที่กำลังเปิดแถวเลือกปุ่มลัด
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.defaultHint = touch ? 'แตะ + เพื่อเรียนสกิล · แตะ "ปุ่มลัด" เพื่อวางสกิลที่ใช้งานได้ลงแถบด้านล่าง'
      : 'กด + เพื่อเรียนสกิล · ลากไอคอนสกิลไปวางที่ปุ่มลัด หรือดับเบิลคลิกไอคอนเพื่อใช้';
    this.$('skwClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) { this.tab = this.player.jobId; this.keysFor = null; this.render(); }
  }

  render() {
    if (!this.open) return;
    const p = this.player;
    const trees = skillTrees(p.jobId);
    if (!trees.includes(this.tab)) this.tab = trees[trees.length - 1];
    this.$('skwSub').textContent = `${p.job} · Job Lv.${p.jobLevel}`;
    this.$('skwPoints').textContent = p.skillPoints;
    this.el.classList.toggle('has-points', p.skillPoints > 0);
    const jc = p.jobChangeStatus();
    this.$('skwJob').textContent = jc.novice ? `เปลี่ยนอาชีพ: Job Lv.${jc.jobLv}/${jc.needJob} · ทักษะพื้นฐาน Lv.${jc.basic}/9` : `${JOBS[p.jobId].thai}`;

    // แท็บสายสกิล
    const tabs = this.$('skwTabs'); tabs.innerHTML = '';
    for (const j of trees) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = JOBS[j].name;
      b.setAttribute('aria-selected', String(j === this.tab));
      b.addEventListener('click', () => { this.tab = j; this.keysFor = null; this.render(); });
      tabs.append(b);
    }

    const list = this.$('skwList');
    const scroll = list.scrollTop;
    list.innerHTML = '';
    for (const id of jobSkills(this.tab)) list.append(this.row(id));
    list.scrollTop = scroll;
    if (!this.hintLocked) this.$('skwHint').textContent = this.defaultHint;
  }

  row(id) {
    const p = this.player, sk = SKILLS[id], lv = p.skillLv(id);
    const why = p.learnCheck(id);
    const active = sk.kind === 'active';
    const row = document.createElement('div');
    row.className = `sk-row ${lv ? 'learned' : 'unlearned'}${active ? ' active' : ' passive'}`;
    const cur = lv ? sk.effect(lv, p) : '';
    const next = lv < sk.maxLv ? sk.effect(lv + 1, p) : '';
    const meta = [KIND_NAME[sk.kind]];
    if (active) {
      const useLv = Math.max(1, lv);
      meta.push(`SP ${skillSp(sk, useLv)}`);
      const ct = skillCast(sk, useLv);
      if (ct) meta.push(`ร่าย ${ct.toFixed(1)} วิ`);
      if (sk.range && sk.range !== 'weapon') meta.push(`ระยะ ${sk.range} ช่อง`);
      if (sk.bow) meta.push('ใช้ธนู');
    }
    const reqTxt = Object.entries(sk.req || {}).map(([rid, rlv]) => `${SKILLS[rid].name} Lv.${rlv}`).join(', ');
    const reqOk = Object.entries(sk.req || {}).every(([rid, rlv]) => p.skillLv(rid) >= rlv);
    row.innerHTML = `
      <img class="sk-ico" alt="" src="${skillIconURL(id)}">
      <div class="sk-info">
        <div class="sk-title"><b>${sk.name}</b><span class="sk-lv">Lv ${lv}/${sk.maxLv}</span></div>
        <div class="sk-meta">${meta.join(' · ')}</div>
        ${cur ? `<div class="sk-eff"><em>ตอนนี้</em> ${cur}</div>` : ''}
        ${next ? `<div class="sk-next"><em>${lv ? 'Lv ถัดไป' : 'Lv 1'}</em> ${next}</div>` : '<div class="sk-next max">ฝึกถึงขั้นสูงสุดแล้ว</div>'}
        ${reqTxt ? `<div class="sk-req ${reqOk ? 'ok' : 'bad'}">ต้องการ ${reqTxt}</div>` : ''}
      </div>
      <div class="sk-act"></div>`;
    const act = row.querySelector('.sk-act');
    if (!sk.free) {
      const plus = document.createElement('button');
      plus.type = 'button'; plus.className = 'sk-plus'; plus.textContent = '+';
      plus.setAttribute('aria-label', `เรียน ${sk.name}`);
      plus.disabled = !!why;
      plus.title = why || `ใช้ 1 Skill Point เพื่ออัป ${sk.name}`;
      plus.addEventListener('click', () => { this.onLearn(id); });
      act.append(plus);
    } else {
      const f = document.createElement('span'); f.className = 'sk-free'; f.textContent = 'ฟรี'; act.append(f);
    }
    if (active && lv > 0) {
      const kb = document.createElement('button');
      kb.type = 'button'; kb.className = 'sk-key'; kb.textContent = 'ปุ่มลัด';
      kb.addEventListener('click', () => { this.keysFor = this.keysFor === id ? null : id; this.render(); });
      act.append(kb);
      const ico = row.querySelector('.sk-ico');
      ico.draggable = true;
      ico.title = 'ลากไปวางที่ปุ่มลัด · ดับเบิลคลิกเพื่อใช้';
      ico.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', 'skill:' + id); e.dataTransfer.effectAllowed = 'copy'; });
      ico.addEventListener('dblclick', () => this.onUse(id));
      if (this.keysFor === id) {
        const keys = document.createElement('div'); keys.className = 'd-keys sk-keys';
        for (let i = 0; i < 9; i++) {
          const k = document.createElement('button'); k.type = 'button'; k.textContent = `F${i + 1}`;
          if (p.hotbar[i] === 'skill:' + id) k.classList.add('on');
          k.addEventListener('click', () => { this.onAssign(i, 'skill:' + id); this.keysFor = null; this.render(); });
          keys.append(k);
        }
        row.append(keys);
      }
    }
    const hint = () => { this.$('skwHint').textContent = `${sk.name}: ${sk.desc}`; };
    row.addEventListener('pointerenter', hint);
    row.addEventListener('focusin', hint);
    row.addEventListener('pointerleave', () => { this.$('skwHint').textContent = this.defaultHint; });
    return row;
  }
}
