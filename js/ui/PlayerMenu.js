// v0.38 เมนูเมื่อคลิก/แตะผู้เล่นคนอื่น: เชิญเข้าปาร์ตี้ · กระซิบ · เพิ่มเพื่อน · ชวนเข้ากิลด์ · ดูข้อมูล
import { JOBS } from '../data/progression.js?v=0.93.0-p4.6';
import { emblemSvg } from '../data/guildEmblems.js?v=0.93.0-p4.6';

export class PlayerMenu {
  constructor(root, game) {
    this.game = game; this.root = root;
    this.el = document.createElement('div'); this.el.className = 'player-menu panel'; this.el.hidden = true;
    this.el.setAttribute('role', 'menu');
    (root.querySelector('.hud') || root).append(this.el);
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) this.el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    // แตะที่อื่น = ปิด
    root.addEventListener('pointerdown', (e) => { if (!this.el.hidden && !this.el.contains(e.target)) this.close(); }, true);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
    this.target = null;
  }

  close() { this.el.hidden = true; this.target = null; }

  open(r, at) {
    const g = this.game, S = g.social, on = S.enabled;
    this.target = r;
    const key = r.peer && r.peer.peer, name = r.name;
    const J = JOBS[r.jobId] || JOBS.novice;
    const inParty = S.inParty && S.members.has(key);
    const tag = r.guildTag;
    this.el.innerHTML = `<header class="pm-head"><span class="on-crest"></span><div><b></b><small></small></div></header><div class="pm-list"></div>`;
    const crest = this.el.querySelector('.on-crest'); crest.textContent = J.crest; crest.style.setProperty('--jc', J.color);
    this.el.querySelector('b').textContent = name;
    this.el.querySelector('small').innerHTML = '';
    const sm = this.el.querySelector('small');
    sm.append(document.createTextNode(`Lv.${r.baseLevel || 1} ${J.name}`));
    if (tag) { const t = document.createElement('span'); t.className = 'pm-guild'; t.innerHTML = `<i>${emblemSvg(tag.emblem)}</i>`; t.append(document.createTextNode(tag.name)); sm.append(t); }
    const list = this.el.querySelector('.pm-list');
    const add = (icon, label, fn, disabled = false, sub = '') => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pm-item'; b.disabled = disabled; b.setAttribute('role', 'menuitem');
      b.innerHTML = `<span class="pm-ic">${icon}</span><span class="pm-l"></span>`;
      b.querySelector('.pm-l').textContent = label;
      if (sub) { const s = document.createElement('small'); s.textContent = sub; b.querySelector('.pm-l').append(s); }
      b.addEventListener('click', () => { this.close(); fn(); });
      list.append(b);
    };
    if (!on) {
      const p = document.createElement('p'); p.className = 'pm-note'; p.textContent = 'ปาร์ตี้ · กระซิบ · เพื่อน ใช้ได้เมื่อเล่นออนไลน์ด้วยบัญชี Everlevel';
      list.append(p);
    } else {
      if (inParty) add('🤝', 'อยู่ในปาร์ตี้เดียวกัน', () => {}, true);
      else add('🤝', 'เชิญเข้าปาร์ตี้', () => S.invite(key, name), S.inParty && S.members.size >= 6, S.inParty && S.members.size >= 6 ? 'ปาร์ตี้เต็มแล้ว' : 'แบ่ง EXP เมื่ออยู่แมพเดียวกัน');
      add('🔁', 'ขอแลกเปลี่ยน', () => g.trade.invite(name), false, g.vipActive ? (r.vip ? 'วางของ/Zeny แล้วยืนยันทั้งสองฝ่าย' : 'อีกฝ่ายต้องมี VIP ด้วย') : '👑 เฉพาะ VIP ทั้งสองฝ่าย');   // v0.89
      add('💬', 'กระซิบ', () => { g.chat.setChannel('t'); g.chat.setWhisperTo(name, true); g.chat.focus(); });
      if (S.isFriend(name)) add('💛', 'ลบเพื่อน', () => S.removeFriend(name));
      else add('💛', 'เพิ่มเพื่อน', () => S.addFriend(name));
      if (S.isGuildLeader && !(r.guildId && r.guildId === S.guildId)) add('🛡️', 'ชวนเข้ากิลด์', () => S.inviteGuild(key, name), false, S.guild ? S.guild.name : '');
      if (inParty && S.isLeader) add('🚪', 'เชิญออกจากปาร์ตี้', () => S.kick(key));
    }
    add('✕', 'ปิด', () => {});
    this.el.hidden = false;
    // วางใกล้จุดที่แตะ ไม่ล้นจอ
    const host = this.el.parentNode.getBoundingClientRect(), w = this.el.offsetWidth, h = this.el.offsetHeight;
    const x = Math.min(host.width - w - 8, Math.max(8, (at ? at.x : host.width / 2) - host.left + 12));
    const y = Math.min(host.height - h - 8, Math.max(8, (at ? at.y : host.height / 2) - host.top - h / 2));
    this.el.style.left = `${x}px`; this.el.style.top = `${y}px`;
    g.sfx('pickup', { gap: 80 });
  }
}
