// หน้าต่างสถานะตัวละคร: เลเวล, EXP, อัปสเตตัส 6 ค่า, ค่าต่อสู้ที่คำนวณได้
import { STAT_KEYS, STAT_INFO, statCost, MAX_STAT, statResetCost, STAT_RESET_FREE_LEVEL } from '../data/progression.js';

const fmt = (n) => n.toLocaleString('en-US');
const pct = (a, b) => (b === Infinity ? 'MAX' : `${((a / b) * 100).toFixed(1)}%`);

export class StatusWindow {
  constructor(root, player, { onChange, onReset } = {}) {
    this.player = player;
    this.onChange = onChange;
    this.onReset = onReset;
    this.confirmReset = false;
    this.el = root.querySelector('#status');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.defaultHint = touch ? 'แตะที่สเตตัสเพื่อดูคำอธิบาย · แตะ + เพื่ออัปทีละแต้ม' : 'ชี้ที่สเตตัสเพื่อดูคำอธิบาย · กด + เพื่ออัป (Shift + คลิก = +10)';

    // แถวสเตตัส
    const box = this.$('stStats');
    this.rows = {};
    for (const k of STAT_KEYS) {
      const info = STAT_INFO[k];
      const row = document.createElement('div');
      row.className = 'st-row';
      row.innerHTML = `<span class="st-key">${info.label}</span><span class="st-name">${info.name}</span><b class="st-val">1</b>`
        + `<button type="button" class="st-plus" aria-label="เพิ่ม ${info.label}">+</button><span class="st-cost" title="แต้มที่ใช้">2</span>`;
      const btn = row.querySelector('.st-plus');
      btn.addEventListener('click', (e) => {
        const n = this.player.raise(k, e.shiftKey ? 10 : 1);
        if (n) { row.classList.remove('bump'); void row.offsetWidth; row.classList.add('bump'); this.onChange && this.onChange(k, n); }
        this.render();
      });
      const hint = () => { this.$('stHint').textContent = `${info.label} (${info.name}): ${info.desc}`; };
      row.addEventListener('pointerenter', hint);
      row.addEventListener('focusin', hint);
      row.addEventListener('pointerleave', () => { this.$('stHint').textContent = this.defaultHint; });
      box.append(row);
      this.rows[k] = { row, val: row.querySelector('.st-val'), btn, cost: row.querySelector('.st-cost') };
    }
    this.$('stHint').textContent = this.defaultHint;
    this.$('stClose').addEventListener('click', () => this.toggle(false));
    // รีเซ็ตสเตตัส (v0.10): กดสองครั้งเพื่อยืนยัน
    this.$('stReset').addEventListener('click', () => {
      if (!this.confirmReset) { this.confirmReset = true; this.render(); clearTimeout(this.resetTimer); this.resetTimer = setTimeout(() => { this.confirmReset = false; this.render(); }, 4000); return; }
      this.confirmReset = false;
      if (this.onReset) this.onReset();
      this.render();
    });
    // กันคลิกทะลุไปที่ฉากเกม
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    this.confirmReset = false;
    if (this.open) this.render();
  }

  render() {
    if (!this.open) return;
    const p = this.player, d = p.derived;
    this.$('stSub').textContent = `${p.name} · ${p.job}`;
    this.$('stBase').textContent = p.baseLevel;
    this.$('stJob').textContent = p.jobLevel;
    const bn = p.baseNext, jn = p.jobNext;
    this.$('stBaseExp').textContent = bn === Infinity ? 'MAX' : `${fmt(p.baseExp)} / ${fmt(bn)} (${pct(p.baseExp, bn)})`;
    this.$('stJobExp').textContent = jn === Infinity ? 'MAX' : `${fmt(p.jobExp)} / ${fmt(jn)} (${pct(p.jobExp, jn)})`;
    this.$('stBaseBar').style.width = bn === Infinity ? '100%' : `${(p.baseExp / bn) * 100}%`;
    this.$('stJobBar').style.width = jn === Infinity ? '100%' : `${(p.jobExp / jn) * 100}%`;
    this.$('stPoints').textContent = p.statPoints;
    this.$('stSkill').textContent = p.skillPoints;
    this.el.classList.toggle('has-points', p.statPoints > 0);

    for (const k of STAT_KEYS) {
      const r = this.rows[k], v = p.attr[k];
      const extra = (d.total[k] || v) - v;   // โบนัสจากอาชีพ/อุปกรณ์/สกิล/บัฟ
      r.val.innerHTML = extra ? `${v}<small class="st-bonus">+${extra}</small>` : `${v}`;
      const cost = statCost(v);
      r.cost.textContent = v >= MAX_STAT ? '—' : cost;
      r.btn.disabled = !p.canRaise(k);
      r.row.classList.toggle('affordable', p.canRaise(k));
    }

    const items = [
      ['ATK', `${d.atk[0]} ~ ${d.atk[1]}`, `อาวุธ: ${d.weapon.name} (+${d.weapon.atk})`],
      ['MATK', `${d.matk[0]} ~ ${d.matk[1]}`, 'พลังเวทย์ (ใช้กับสกิลเวทย์)'],
      ['HIT', d.hit, 'ความแม่นยำ'],
      ['FLEE', d.flee, 'การหลบหลีก'],
      ['CRIT', `${(d.crit * 100).toFixed(1)}%`, 'โอกาสคริติคอล (ทะลุเกราะ x1.5)'],
      ['DEF', d.def, 'ลดดาเมจที่ได้รับ'],
      ['MDEF', d.mdef, 'ป้องกันเวทย์'],
      ['ASPD', d.aspd, `โจมตีทุก ${d.delay.toFixed(2)} วินาที`],
      ['Max HP', fmt(d.maxHp), ''],
      ['Max SP', fmt(d.maxSp), ''],
    ];
    // ปุ่มรีเซ็ตสเตตัส
    const cost = statResetCost(p.baseLevel), refund = p.statRefund(), rb = this.$('stReset');
    rb.disabled = !refund || (cost > 0 && p.zeny < cost);
    rb.classList.toggle('danger', this.confirmReset);
    rb.textContent = this.confirmReset ? `ยืนยันรีเซ็ต? คืน ${refund} แต้ม` : `รีเซ็ตสเตตัส · ${cost ? cost.toLocaleString('en-US') + ' z' : 'ฟรี'}`;
    rb.title = cost ? `Base Lv. เกิน ${STAT_RESET_FREE_LEVEL} เสียค่ารีเซ็ต ${cost.toLocaleString('en-US')} Zeny` : `รีเซ็ตฟรีจนถึง Base Lv.${STAT_RESET_FREE_LEVEL}`;
    this.$('stDerived').innerHTML = items.map(([k, v, t]) => `<div title="${t}"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
}
