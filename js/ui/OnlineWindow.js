// หน้าต่างผู้เล่นออนไลน์ (v0.11): ใครอยู่ในแผนที่เดียวกัน · ใครออนไลน์ทั้งหมด · อันดับเลเวล
import { MAPS } from '../data/maps/index.js?v=0.40.6';
import { JOBS } from '../data/progression.js?v=0.40.6';
import { EMBLEM_SHAPES, EMBLEM_ICONS, EMBLEM_COLORS, emblemSvg, parseEmblem, emblemCode, randomEmblem } from '../data/guildEmblems.js?v=0.40.6';
import { GUILD_COST, GUILD_LV, PARTY_MAX } from '../systems/Social.js?v=0.40.6';

const clean = (s, n = 16) => String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').slice(0, n);
const TABS = [['here', 'แผนที่นี้'], ['all', 'ออนไลน์'], ['friends', 'เพื่อน'], ['party', 'ปาร์ตี้'], ['guild', 'กิลด์'], ['rank', 'อันดับ']];

export class OnlineWindow {
  constructor(root, game) {
    this.game = game;
    this.el = root.querySelector('#online');
    this.$ = (id) => root.querySelector('#' + id);
    this.open = false;
    this.tab = 'here';
    this.rank = null; this.rankAt = 0;
    this.emb = randomEmblem(); this.gname = ''; this.busy = false;
    game.social.onChange(() => { const typing = document.activeElement && document.activeElement.tagName === 'INPUT' && this.el.contains(document.activeElement); if (this.open && !typing && !this.el.querySelector('details[open]')) this.render(); });
    this.$('onClose').addEventListener('click', () => this.toggle(false));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
    const tabs = this.$('onTabs');
    for (const [id, label] of TABS) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = id; b.textContent = label;
      b.addEventListener('click', () => { this.tab = id; this.lastSig = null; this.render(); });
      tabs.append(b);
    }
  }

  toggle(force) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    this.lastSig = null;
    if (this.open) this.render();
  }

  // v0.37: สร้างใหม่เฉพาะเมื่อข้อมูลที่แสดงเปลี่ยนจริง (รายชื่อผู้เล่นอัปเดตทุกครั้งที่มีคนขยับ — ไม่งั้นปุ่มจะหายใต้นิ้ว)
  sig() {
    const g = this.game, S = g.social, o = g.online;
    const base = [this.tab, g.mode, o && o.online, o && o.connected && o.connected(), S.pid, S.guildId, S.isGuildLeader, S.isLeader, g.map && g.map.id];
    if (this.tab === 'here' || this.tab === 'all') base.push((o && o.online ? o.peers() : []).map((p) => { const P = p.presence || {}; return [p.peer, p.isMe, P.n, P.j, P.lv, P.m, P.gd, S.members.has(p.peer)]; }));
    else if (this.tab === 'friends') base.push(S.friendList());
    else if (this.tab === 'party') base.push(S.memberList().map((m) => [m.key, m.n, m.j, m.lv, m.m, Math.round(m.h * 20), m.leader]));
    else if (this.tab === 'guild') base.push(S.guild, S.guildInvites, [...S.guildOnline.values()], S.guildErr, this.busy, g.player.baseLevel >= GUILD_LV, g.player.zeny >= GUILD_COST);
    else base.push(this.rankAt);
    return JSON.stringify(base);
  }

  render() {
    if (!this.open) return;
    const sig = this.sig();
    if (sig === this.lastSig) return;
    this.lastSig = sig;
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
    if (this.tab === 'party') return this.renderParty(list);
    if (this.tab === 'friends') return this.renderFriends(list);
    if (this.tab === 'guild') return this.renderGuild(list);
    const mapId = g.map && g.map.id;
    const rows = this.tab === 'here' ? others.filter((p) => p.presence.m === mapId) : others;
    const me = { isMe: true, presence: { n: g.player.name, j: g.player.jobId, lv: g.player.baseLevel, m: mapId } };
    for (const p of [me, ...rows]) list.append(this.row(p.presence, p.isMe, p.guest, p.peer));
    if (!rows.length) {
      const e = document.createElement('p'); e.className = 'on-note';
      e.textContent = this.tab === 'here' ? 'ยังไม่มีผู้เล่นคนอื่นในแผนที่นี้ ชวนเพื่อนมาเล่นด้วยกันสิ!' : 'ยังไม่มีผู้เล่นคนอื่นออนไลน์ แชร์ลิงก์เกมให้เพื่อน (สิทธิ์แก้ไขได้) เพื่อผจญภัยด้วยกัน';
      list.append(e);
    }
  }

  row(P, isMe, guest, peer) {
    const r = document.createElement('div'); r.className = 'on-row' + (isMe ? ' me' : '');
    const S = this.game.social;
    const J = JOBS[P.j] || JOBS.novice;
    const lv = Math.max(1, Math.min(99, Math.floor(+P.lv) || 1));
    r.innerHTML = '<span class="on-crest"></span><div class="on-info"><b></b><small></small></div><span class="on-map"></span>';
    r.querySelector('.on-crest').textContent = J.crest;
    r.querySelector('.on-crest').style.setProperty('--jc', J.color);
    r.querySelector('b').textContent = clean(P.n) + (isMe ? ' (คุณ)' : '') + (guest ? ' · แขก' : '');
    r.querySelector('small').textContent = `Lv.${lv} ${J.name}`;
    r.querySelector('.on-map').textContent = (MAPS[P.m] || {}).name || '';
    // v0.37: ปุ่มเชิญปาร์ตี้ / กิลด์
    if (!isMe && peer && S.enabled) {
      const box = document.createElement('div'); box.className = 'on-acts';
      const inP = S.inParty && S.members.has(peer);
      const bp = document.createElement('button'); bp.type = 'button'; bp.className = 'on-act';
      bp.textContent = inP ? 'ในปาร์ตี้' : '+ปาร์ตี้'; bp.disabled = inP;
      bp.title = 'ชวนเข้าปาร์ตี้ (แชร์ EXP เมื่ออยู่แมพเดียวกัน)';
      bp.addEventListener('click', () => S.invite(peer, clean(P.n)));
      box.append(bp);
      if (S.isGuildLeader && !(P.gd && P.gd === S.guildId)) {
        const bg = document.createElement('button'); bg.type = 'button'; bg.className = 'on-act g'; bg.textContent = '+กิลด์';
        bg.title = 'ชวนเข้ากิลด์ของคุณ';
        bg.addEventListener('click', () => S.inviteGuild(peer, clean(P.n)));
        box.append(bg);
      }
      r.append(box);
    }
    return r;
  }

  /* ---------- v0.38 เพื่อน ---------- */
  renderFriends(list) {
    const g = this.game, S = g.social;
    const fl = S.friendList();
    const info = document.createElement('p'); info.className = 'on-note';
    info.textContent = fl.length ? `เพื่อน ${fl.length} คน · ออนไลน์ ${fl.filter((f) => f.online).length} คน` : 'ยังไม่มีเพื่อน — คลิก/แตะที่ตัวผู้เล่นคนอื่นแล้วกด "เพิ่มเพื่อน" หรือพิมพ์ชื่อด้านล่าง';
    list.append(info);
    const addRow = document.createElement('div'); addRow.className = 'g-preview';
    addRow.innerHTML = '<input class="g-name" maxlength="16" placeholder="ชื่อตัวละครที่จะเพิ่ม" aria-label="ชื่อเพื่อน"><button type="button" class="on-act">เพิ่ม</button>';
    const inp = addRow.querySelector('input');
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') addRow.querySelector('button').click(); });
    addRow.querySelector('button').addEventListener('click', () => { const n = inp.value.trim(); if (n.length >= 2) { S.addFriend(n); inp.value = ''; this.lastSig = null; this.render(); } });
    list.append(addRow);
    for (const f of fl) {
      const r = document.createElement('div'); r.className = 'on-row' + (f.online ? ' on' : ' off');
      const J = JOBS[f.j] || JOBS.novice;
      r.innerHTML = '<span class="on-crest"></span><div class="on-info"><b></b><small></small></div>';
      r.querySelector('.on-crest').textContent = f.online ? J.crest : '·'; r.querySelector('.on-crest').style.setProperty('--jc', f.online ? J.color : '#555');
      r.querySelector('b').textContent = f.name;
      r.querySelector('small').textContent = f.online ? `● Lv.${f.lv} ${J.name} · ${(MAPS[f.m] || {}).name || ''}` : 'ออฟไลน์';
      const box = document.createElement('div'); box.className = 'on-acts';
      if (f.online && S.enabled) {
        const w = document.createElement('button'); w.type = 'button'; w.className = 'on-act'; w.textContent = 'กระซิบ';
        w.addEventListener('click', () => { this.toggle(false); g.chat.setChannel('t'); g.chat.setWhisperTo(f.name, true); g.chat.focus(); });
        const p = document.createElement('button'); p.type = 'button'; p.className = 'on-act'; p.textContent = '+ปาร์ตี้';
        p.disabled = S.inParty && S.members.has(f.key);
        p.addEventListener('click', () => S.invite(f.key, f.name));
        box.append(w, p);
      }
      const d = document.createElement('button'); d.type = 'button'; d.className = 'on-act no'; d.textContent = 'ลบ';
      d.addEventListener('click', () => { if (d.dataset.sure) S.removeFriend(f.name); else { d.dataset.sure = '1'; d.textContent = 'ยืนยัน?'; } });
      box.append(d); r.append(box); list.append(r);
    }
  }

  /* ---------- v0.37 ปาร์ตี้ ---------- */
  renderParty(list) {
    const g = this.game, S = g.social;
    if (!S.enabled) { list.innerHTML = '<p class="on-note">ปาร์ตี้ใช้ได้เฉพาะตอนเล่นออนไลน์ด้วยบัญชี Everlevel</p>'; return; }
    const info = document.createElement('div'); info.className = 'on-empty';
    info.innerHTML = `<b>ปาร์ตี้ (สูงสุด ${PARTY_MAX} คน)</b><p>สมาชิกที่อยู่แผนที่เดียวกันแบ่ง EXP เท่ากัน และได้โบนัส +20% ต่อเพื่อนเพิ่ม 1 คน · เห็นเลือดเพื่อนใต้แผงตัวละคร · พิมพ์ <b>/p ข้อความ</b> หรือกดปุ่มช่องแชตเพื่อคุยในปาร์ตี้</p>`;
    list.append(info);
    if (!S.inParty) {
      const p = document.createElement('p'); p.className = 'on-note'; p.textContent = 'ยังไม่ได้อยู่ในปาร์ตี้ — กด "+ปาร์ตี้" ที่ชื่อเพื่อนในแท็บ "แผนที่นี้" หรือ "ออนไลน์" เพื่อชวน (สร้างปาร์ตี้ให้อัตโนมัติ)';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'on-wide'; b.textContent = 'สร้างปาร์ตี้';
      b.addEventListener('click', () => { S.createParty(); this.render(); });
      list.append(p, b);
      return;
    }
    const map = g.map && g.map.id;
    for (const m of S.memberList()) {
      const r = document.createElement('div'); r.className = 'on-row' + (m.me ? ' me' : '');
      const J = JOBS[m.j] || JOBS.novice;
      r.innerHTML = '<span class="on-crest"></span><div class="on-info"><b></b><small></small></div><span class="on-map"></span>';
      r.querySelector('.on-crest').textContent = J.crest; r.querySelector('.on-crest').style.setProperty('--jc', J.color);
      r.querySelector('b').textContent = (m.leader ? '👑 ' : '') + m.n + (m.me ? ' (คุณ)' : '');
      r.querySelector('small').textContent = `Lv.${m.lv} ${J.name} · HP ${Math.round(m.h * 100)}%`;
      r.querySelector('.on-map').textContent = m.m === map ? 'แมพเดียวกัน' : (MAPS[m.m] || {}).name || '';
      if (!m.me && S.isLeader) {
        const k = document.createElement('button'); k.type = 'button'; k.className = 'on-act no'; k.textContent = 'เตะ';
        k.addEventListener('click', () => S.kick(m.key));
        r.append(k);
      }
      list.append(r);
    }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'on-wide no'; b.textContent = 'ออกจากปาร์ตี้';
    b.addEventListener('click', () => { S.leaveParty(); this.render(); });
    list.append(b);
  }

  /* ---------- v0.37 กิลด์ ---------- */
  renderGuild(list) {
    const g = this.game, S = g.social;
    if (!S.enabled) { list.innerHTML = '<p class="on-note">กิลด์ใช้ได้เฉพาะตอนเล่นออนไลน์ด้วยบัญชี Everlevel</p>'; return; }
    if (S.guildErr && !S.guild) { const p = document.createElement('div'); p.className = 'on-empty'; p.innerHTML = '<b>ยังใช้ระบบกิลด์ไม่ได้</b><p></p>'; p.querySelector('p').textContent = S.guildErr; list.append(p); }
    for (const inv of S.guildInvites) {
      const r = document.createElement('div'); r.className = 'on-row inv';
      r.innerHTML = `<span class="g-emb">${emblemSvg(inv.emblem)}</span><div class="on-info"><b></b><small>เชิญคุณเข้ากิลด์</small></div>`;
      r.querySelector('b').textContent = inv.name;
      const y = document.createElement('button'); y.type = 'button'; y.className = 'on-act'; y.textContent = 'เข้าร่วม';
      y.addEventListener('click', () => S.acceptGuild(inv.id));
      const n = document.createElement('button'); n.type = 'button'; n.className = 'on-act no'; n.textContent = 'ปฏิเสธ';
      n.addEventListener('click', () => S.declineGuild(inv.id));
      r.append(y, n); list.append(r);
    }
    if (!S.guild) return this.renderGuildCreate(list);
    const G = S.guild;
    const head = document.createElement('div'); head.className = 'g-head';
    head.innerHTML = `<span class="g-emb big">${emblemSvg(G.emblem)}</span><div><b></b><small></small></div>`;
    head.querySelector('b').textContent = G.name;
    const online = new Set([...S.guildOnline.values()].map((m) => m.n));
    head.querySelector('small').textContent = `สมาชิก ${G.members.length}/30 · ออนไลน์ ${online.size} · ${G.role === 'leader' ? 'คุณเป็นหัวหน้ากิลด์' : 'สมาชิก'} · พิมพ์ /g ข้อความ เพื่อคุยในกิลด์`;
    list.append(head);
    if (G.role === 'leader') {
      const ed = document.createElement('details'); ed.className = 'g-edit';
      ed.innerHTML = '<summary>เปลี่ยนตรากิลด์</summary>';
      const cur = { code: G.emblem };
      ed.append(this.emblemEditor(cur, () => {}));
      const sv = document.createElement('button'); sv.type = 'button'; sv.className = 'on-wide'; sv.textContent = 'บันทึกตราใหม่';
      sv.addEventListener('click', () => S.setEmblem(cur.code));
      ed.append(sv); list.append(ed);
    }
    for (const m of G.members) {
      const r = document.createElement('div'); r.className = 'on-row' + (m.name === g.player.name ? ' me' : '') + (online.has(m.name) ? ' on' : ' off');
      const J = JOBS[m.job] || JOBS.novice;
      r.innerHTML = '<span class="on-crest"></span><div class="on-info"><b></b><small></small></div><span class="on-map"></span>';
      r.querySelector('.on-crest').textContent = J.crest; r.querySelector('.on-crest').style.setProperty('--jc', J.color);
      r.querySelector('b').textContent = (m.role === 'leader' ? '👑 ' : '') + m.name;
      r.querySelector('small').textContent = `Lv.${m.lv} ${J.name}`;
      const om = [...S.guildOnline.values()].find((x) => x.n === m.name);
      r.querySelector('.on-map').textContent = om ? '● ' + ((MAPS[om.m] || {}).name || 'ออนไลน์') : 'ออฟไลน์';
      if (G.role === 'leader' && m.name !== g.player.name) {
        const k = document.createElement('button'); k.type = 'button'; k.className = 'on-act no'; k.textContent = 'เตะ';
        k.addEventListener('click', () => { if (k.dataset.sure) S.kickGuild(m.name); else { k.dataset.sure = '1'; k.textContent = 'ยืนยัน?'; } });
        r.append(k);
      }
      list.append(r);
    }
    const note = document.createElement('p'); note.className = 'on-note';
    note.textContent = G.role === 'leader' ? 'ชวนสมาชิกใหม่: กด "+กิลด์" ที่ชื่อผู้เล่นในแท็บ "แผนที่นี้" หรือ "ออนไลน์" · ถ้าหัวหน้าออก สมาชิกที่อยู่นานที่สุดจะเป็นหัวหน้าแทน' : 'ถ้าคุณเป็นคนสุดท้ายที่ออก กิลด์จะถูกยุบ';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'on-wide no'; b.textContent = 'ออกจากกิลด์';
    b.addEventListener('click', () => { if (b.dataset.sure) S.leaveGuild(); else { b.dataset.sure = '1'; b.textContent = 'กดอีกครั้งเพื่อยืนยันออกจากกิลด์'; } });
    list.append(note, b);
  }

  renderGuildCreate(list) {
    const g = this.game, S = g.social, pl = g.player;
    const box = document.createElement('div'); box.className = 'g-create';
    const okLv = pl.baseLevel >= GUILD_LV, okZ = pl.zeny >= GUILD_COST;
    box.innerHTML = `<b>ก่อตั้งกิลด์</b><p>ต้องมี Base Lv ${GUILD_LV}+ ${okLv ? '✔' : '✘'} · Zeny ${GUILD_COST.toLocaleString()} ${okZ ? '✔' : '✘'} · สมาชิกสูงสุด 30 คน</p>
      <div class="g-preview"><span class="g-emb big"></span><input class="g-name" maxlength="16" placeholder="ชื่อกิลด์ (2–16 ตัว)" aria-label="ชื่อกิลด์"></div>`;
    const prev = box.querySelector('.g-emb'), inp = box.querySelector('.g-name');
    inp.value = this.gname;
    inp.addEventListener('input', () => { this.gname = inp.value; });
    inp.addEventListener('keydown', (e) => e.stopPropagation());
    const cur = { code: this.emb };
    const draw = () => { prev.innerHTML = emblemSvg(cur.code); this.emb = cur.code; };
    draw();
    box.append(this.emblemEditor(cur, draw));
    const msg = document.createElement('p'); msg.className = 'g-msg'; msg.textContent = this.gmsg || '';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'on-wide'; b.textContent = `ก่อตั้งกิลด์ (${GUILD_COST.toLocaleString()} Zeny)`;
    b.disabled = !okLv || !okZ || this.busy;
    b.addEventListener('click', async () => {
      const name = inp.value.replace(/\s+/g, ' ').trim();
      if (name.length < 2) { msg.textContent = 'ตั้งชื่อกิลด์ 2–16 ตัวอักษร'; return; }
      this.busy = true; b.disabled = true; msg.textContent = this.gmsg = 'กำลังก่อตั้ง…';
      try { await S.createGuild(name, cur.code); this.gname = ''; this.gmsg = ''; this.emb = randomEmblem(); this.busy = false; this.lastSig = null; this.render(); }
      catch (e) { this.busy = false; this.gmsg = e.message || String(e); this.lastSig = null; this.render(); }
    });
    box.append(b, msg);
    list.append(box);
  }

  // ตัวเลือกตรา: ทรงโล่ · สัญลักษณ์ · สีพื้น · สีสัญลักษณ์ (cur.code ถูกแก้ตรง ๆ แล้วเรียก onPick)
  emblemEditor(cur, onPick) {
    const wrap = document.createElement('div'); wrap.className = 'g-ed';
    const parts = [['s', 'ทรง', EMBLEM_SHAPES.length], ['i', 'สัญลักษณ์', EMBLEM_ICONS.length], ['b', 'สีพื้น', EMBLEM_COLORS.length], ['f', 'สีลาย', EMBLEM_COLORS.length]];
    const rows = [];
    const paint = () => {
      const e = parseEmblem(cur.code);
      for (const { key, btns } of rows) btns.forEach((bt, i) => bt.setAttribute('aria-pressed', String(e[key] === i)));
    };
    for (const [key, label, n] of parts) {
      const row = document.createElement('div'); row.className = 'g-ed-row';
      const l = document.createElement('span'); l.textContent = label; row.append(l);
      const btns = [];
      for (let i = 0; i < n; i++) {
        const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'g-opt';
        if (key === 'b' || key === 'f') { bt.style.setProperty('--c', EMBLEM_COLORS[i]); bt.classList.add('col'); bt.setAttribute('aria-label', `${label} ${i + 1}`); }
        else {
          const e = parseEmblem(cur.code) || { s: 0, i: 0, b: 5, f: 9 };
          const sample = key === 's' ? emblemCode({ ...e, s: i }) : emblemCode({ ...e, i });
          bt.innerHTML = emblemSvg(sample); bt.title = (key === 's' ? EMBLEM_SHAPES : EMBLEM_ICONS)[i].name;
        }
        bt.addEventListener('click', () => { const e = parseEmblem(cur.code); e[key] = i; cur.code = emblemCode(e); paint(); onPick(); refreshSamples(); });
        btns.push(bt); row.append(bt);
      }
      rows.push({ key, btns }); wrap.append(row);
    }
    const refreshSamples = () => {
      const e = parseEmblem(cur.code);
      rows[0].btns.forEach((bt, i) => { bt.innerHTML = emblemSvg(emblemCode({ ...e, s: i })); });
      rows[1].btns.forEach((bt, i) => { bt.innerHTML = emblemSvg(emblemCode({ ...e, i })); });
    };
    const rnd = document.createElement('button'); rnd.type = 'button'; rnd.className = 'g-rnd'; rnd.textContent = '🎲 สุ่ม';
    rnd.addEventListener('click', () => { cur.code = randomEmblem(); paint(); onPick(); refreshSamples(); });
    wrap.append(rnd);
    refreshSamples(); paint();
    return wrap;
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
