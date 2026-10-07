// หน้าต่างผู้เล่นออนไลน์ (v0.11): ใครอยู่ในแผนที่เดียวกัน · ใครออนไลน์ทั้งหมด · อันดับเลเวล
import { MAPS } from '../data/maps/index.js';
import { JOBS } from '../data/progression.js';

const clean = (s, n = 16) => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').slice(0, n);
const TABS = [['here', 'แผนที่นี้'], ['all', 'ออนไลน์ทั้งหมด'], ['rank', 'อันดับ']];

export class OnlineWindow {
  constructor(root, game) {
    this.game = game;
    this.el = root.querySelector('#online');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = 'here';
    this.rank = null; this.rankAt = 0;
    this.$('onClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
    const tabs = this.$('onTabs');
    for (const [id, label] of TABS) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = id; b.textContent = label;
      b.addEventListener('click', () => { this.tab = id; this.render(); });
      tabs.append(b);
    }
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.render();
  }

  render() {
    if (!this.open) return;
    const g = this.game, on = g.online && g.online.online && g.mode === 'online';
    this.$('onTabs').querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === this.tab)));
    const sub = this.$('onSub'), list = this.$('onList');
    list.innerHTML = '';
    if (!on) {
      sub.textContent = 'โหมดออฟไลน์';
      const sv = g.online && g.online.kind === 'supabase';
      list.innerHTML = `<div class="on-empty"><b>ตอนนี้เล่นแบบออฟไลน์</b><p>${sv ? 'เข้าสู่ระบบเพื่อเล่นกับเพื่อน: เปิดเมนูตั้งค่า → "เปลี่ยนตัวละคร" แล้วเลือก "เข้าสู่ระบบ / สมัครสมาชิก"' : 'เล่นออนไลน์กับเพื่อนได้เมื่อเปิดเกมผ่าน claude.ai ด้วยบัญชีที่เจ้าของเกมแชร์ให้แบบ "แก้ไขได้" แล้วเลือก "เปลี่ยนตัวละคร" ในเมนูตั้งค่า'}</p></div>`;
      return;
    }
    const peers = g.online.peers().filter((p) => p.kind === 'viewer' && p.presence && p.presence.n);
    const others = peers.filter((p) => !p.isMe);
    sub.textContent = g.online.connected() ? `ออนไลน์อยู่ ${peers.length || 1} คน` : 'กำลังเชื่อมต่อห้องผู้เล่น...';
    if (this.tab === 'rank') return this.renderRank(list);
    const mapId = g.map && g.map.id;
    const rows = this.tab === 'here' ? others.filter((p) => p.presence.m === mapId) : others;
    const me = { isMe: true, presence: { n: g.player.name, j: g.player.jobId, lv: g.player.baseLevel, m: mapId } };
    for (const p of [me, ...rows]) list.append(this.row(p.presence, p.isMe, p.guest));
    if (!rows.length) {
      const e = document.createElement('p'); e.className = 'on-note';
      e.textContent = this.tab === 'here' ? 'ยังไม่มีผู้เล่นคนอื่นในแผนที่นี้ ชวนเพื่อนมาเล่นด้วยกันสิ!' : 'ยังไม่มีผู้เล่นคนอื่นออนไลน์ แชร์ลิงก์เกมให้เพื่อน (สิทธิ์แก้ไขได้) เพื่อผจญภัยด้วยกัน';
      list.append(e);
    }
  }

  row(P, isMe, guest) {
    const r = document.createElement('div'); r.className = 'on-row' + (isMe ? ' me' : '');
    const J = JOBS[P.j] || JOBS.novice;
    const lv = Math.max(1, Math.min(99, Math.floor(+P.lv) || 1));
    r.innerHTML = '<span class="on-crest"></span><div class="on-info"><b></b><small></small></div><span class="on-map"></span>';
    r.querySelector('.on-crest').textContent = J.crest;
    r.querySelector('.on-crest').style.setProperty('--jc', J.color);
    r.querySelector('b').textContent = clean(P.n) + (isMe ? ' (คุณ)' : '') + (guest ? ' · แขก' : '');
    r.querySelector('small').textContent = `Lv.${lv} ${J.name}`;
    r.querySelector('.on-map').textContent = (MAPS[P.m] || {}).name || '';
    return r;
  }

  async renderRank(list) {
    const g = this.game;
    if (!this.rank || performance.now() - this.rankAt > 20000) {
      list.innerHTML = '<p class="on-note">กำลังโหลดอันดับ...</p>';
      this.rank = await g.online.leaderboard(30);
      this.rankAt = performance.now();
      if (this.tab !== 'rank' || !this.open) return;
      list.innerHTML = '';
    }
    if (!this.rank.length) { list.innerHTML = '<p class="on-note">ยังไม่มีข้อมูลอันดับ</p>'; return; }
    this.rank.forEach((d, i) => {
      const r = document.createElement('div'); r.className = 'on-row rank' + (d.id === g.online.uid ? ' me' : '');
      const J = JOBS[d.job] || JOBS.novice;
      r.innerHTML = '<span class="on-no"></span><div class="on-info"><b></b><small></small></div>';
      r.querySelector('.on-no').textContent = i + 1;
      r.querySelector('b').textContent = clean(d.name) || '???';
      r.querySelector('small').textContent = `Base Lv.${Math.max(1, Math.min(99, +d.lv || 1))} · Job Lv.${Math.max(1, Math.min(99, +d.jlv || 1))} · ${J.name}`;
      list.append(r);
    });
  }
}
