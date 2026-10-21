// v0.47 หน้าต่างเช็กบอส: บอสโลก (เวลาเกิด · สถานะ · HP · รางวัล) + บอส MVP ทุกแผนที่ (สถานะเกิด · เวลาเกิดใหม่ · ของดรอป)
import { MONSTERS } from '../data/monsters.js?v=0.86.0';
import { ITEMS, RARITY } from '../data/items.js?v=0.86.0';
import { MAPS } from '../data/maps/index.js?v=0.86.0';
import { WORLD_BOSSES, WORLD_TOP_BONUS } from '../data/events.js?v=0.86.0';
import { cardDrops } from '../data/cards.js?v=0.86.0';
import { iconURL } from '../render/ItemIcons.js?v=0.86.0';
import { monsterThumb } from '../render/MonsterThumbs.js?v=0.86.0';
import { TILE } from '../config.js?v=0.86.0';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const pct = (p) => (p >= 1 ? '100%' : p >= 0.1 ? `${Math.round(p * 100)}%` : p >= 0.01 ? `${(p * 100).toFixed(1)}%` : `${(p * 100).toFixed(2)}%`);
const mmss = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h} ชม. ${m} นาที` : `${m}:${String(x).padStart(2, '0')}`; };
// บอส MVP ทุกตัว + แผนที่ที่เกิด
function mvpList() {
  const out = [];
  for (const def of Object.values(MAPS)) for (const s of def.spawns || []) {
    const m = MONSTERS[s.mob];
    if (m && m.mvp && !m.worldBoss && !out.some((x) => x.id === s.mob)) out.push({ id: s.mob, m, map: def });
  }
  return out.sort((a, b) => a.m.level - b.m.level);
}

export class BossWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'world'; this.sel = null;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm bossw'; el.hidden = true;
    el.innerHTML = `<header class="st-head"><div><h2>ข้อมูลบอส</h2><p>บอสโลก · บอส MVP ทุกแผนที่ · เวลาเกิด · ของดรอป</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    this.body = el.querySelector('.tm-body');
    this.tick = 0;
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) this.render(); }
  update(dt) { if (!this.open) return; this.tick -= dt; if (this.tick <= 0) { this.tick = 1; this.renderStatus(); } }

  // สถานะบอสโลกจากระบบอีเวนต์ (เซิร์ฟเวอร์ หรือโหมดออฟไลน์)
  worldRun(type) {
    const runs = (this.g.events && this.g.events.state && this.g.events.state.runs) || [];
    const now = this.g.events ? this.g.events.now() : Date.now();
    const list = runs.filter((r) => r.type === type).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
    const r = list.find((x) => x.status === 'active') || list[0];
    const b = WORLD_BOSSES[type], d = new Date(now + 7 * 3600000);
    let next = Date.parse(`${d.toISOString().slice(0, 10)}T${String(b.hour).padStart(2, '0')}:00:00+07:00`);
    if (next + 1800000 <= now) next += 86400000;
    return { r, now, next };
  }
  worldStatus(type) {
    const { r, now, next } = this.worldRun(type);
    if (r && r.status === 'active' && Date.parse(r.ends_at) > now) return { cls: 'on', text: `🔥 กำลังเกิด! เหลือเวลา ${mmss((Date.parse(r.ends_at) - now) / 1000)}`, hp: r.hp, max: r.max_hp };
    if (r && r.status === 'defeated' && now - Date.parse(r.defeated_at || r.ends_at) < 3 * 3600000) return { cls: 'done', text: `✔ ถูกกำจัดแล้ว · รอบถัดไปอีก ${mmss((next - now) / 1000)}` };
    return { cls: 'wait', text: `⏳ เกิดในอีก ${mmss((next - now) / 1000)}` };
  }
  mvpStatus(id) {
    const g = this.g;
    if (!g.mobs || !(g.map.def.spawns || []).some((s) => s.mob === id)) return { cls: 'far', text: 'อยู่แผนที่อื่น · ไปที่แผนที่นั้นเพื่อดูสถานะ' };
    const m = g.mobs.list.find((x) => x.type === id && !x.summoned);
    if (!m) return { cls: 'far', text: '—' };
    const row = m.shared && g.mvp && g.mvp.rows.get(id);   // v0.53 MVP ร่วม: เวลาเกิดจากเซิร์ฟเวอร์
    if (m.dead) return { cls: 'wait', text: row && row.respawn_at ? `⏳ เกิดใหม่ในอีก ${mmss((Date.parse(row.respawn_at) - Date.now()) / 1000)} · ปราบโดย ${row.killer || '-'}` : `⏳ เกิดใหม่ในอีก ${mmss(m.respawnAt - g.time)} · สุ่มจุดเกิด` };
    if (row) return { cls: 'on', text: `🔥 MVP ร่วม ที่ (${Math.floor(m.x / TILE)}, ${Math.floor(m.y / TILE)}) · HP ${Math.round((m.hp / m.maxHp) * 100)}% · ผู้ร่วมตี ${row.n || 0} คน` };
    return { cls: 'on', text: `🔥 อยู่ในแผนที่นี้ที่ (${Math.floor(m.x / TILE)}, ${Math.floor(m.y / TILE)}) · HP ${Math.round((m.hp / m.maxHp) * 100)}%` };
  }

  render() {
    if (!this.open) return;
    const tabs = [['world', '🌍 บอสโลก'], ['mvp', '👑 บอส MVP']];
    this.body.innerHTML = `<div class="inv-tabs tm-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.tab === k}">${n}</button>`).join('')}</div><div class="tm-pane bw-pane"></div>`;
    for (const b of this.body.querySelectorAll('[data-t]')) b.addEventListener('click', () => { this.tab = b.dataset.t; this.sel = null; this.render(); });
    const pane = this.body.querySelector('.bw-pane');
    if (this.sel) return this.renderDetail(pane);
    if (this.tab === 'world') this.renderWorld(pane); else this.renderMvp(pane);
  }

  card(id, m, title, sub, statusKey) {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'bw-card'; c.dataset.status = statusKey;
    c.innerHTML = `<span class="bw-pic"><img alt=""></span><span class="bw-info"><b></b><small></small><em class="bw-st"></em></span><i class="bw-go">›</i>`;
    const url = monsterThumb(id, 112); if (url) c.querySelector('img').src = url;
    c.querySelector('b').textContent = title; c.querySelector('small').textContent = sub;
    c.addEventListener('click', () => { this.sel = id; this.render(); });
    return c;
  }

  renderWorld(pane) {
    pane.innerHTML = '<p class="tm-hint">บอสโลกเกิดวันละครั้งตามเวลาไทย อยู่ได้ 30 นาที · ผู้เล่นทุกคนตีตัวเดียวกัน (HP รวมทั้งเซิร์ฟเวอร์) · ต้อง Base Lv.60+ · ทุกคนที่ร่วมตีจนบอสถูกกำจัดได้รางวัลทางจดหมาย</p><div class="bw-list"></div>';
    const list = pane.querySelector('.bw-list');
    for (const [id, b] of Object.entries(WORLD_BOSSES)) {
      const m = MONSTERS[id], map = MAPS[b.map];
      list.append(this.card(id, m, `${b.name} · Lv.${b.level}`, `ทุกวัน ${String(b.hour).padStart(2, '0')}:00 น. · ${map ? map.name : b.map} (${Math.round(b.tx * (map?.scaled || 1))}, ${Math.round(b.ty * (map?.scaled || 1))}) · HP ${fmt(b.hp)}`, 'w:' + id));
    }
    this.renderStatus();
  }

  renderMvp(pane) {
    pane.innerHTML = '<p class="tm-hint">บอส MVP เกิดใหม่ตามเวลา และสุ่มจุดเกิดทั่วแผนที่ทุกครั้ง · เกิดแล้วจะมีประกาศในแชตพร้อมพิกัด · แตะเพื่อดูของดรอป</p><div class="bw-list"></div>';
    const list = pane.querySelector('.bw-list');
    for (const { id, m, map } of mvpList()) {
      const [a, b] = m.respawn || [600, 840];
      list.append(this.card(id, m, `${m.name} · Lv.${m.level}`, `${map.name} · เกิดใหม่ทุก ${Math.round(a / 60)}–${Math.round(b / 60)} นาที · HP ${fmt(m.hp)}`, 'm:' + id));
    }
    this.renderStatus();
  }

  renderStatus() {
    if (!this.open) return;
    for (const el of this.body.querySelectorAll('[data-status]')) {
      const [k, id] = el.dataset.status.split(':'), st = k === 'w' ? this.worldStatus(id) : this.mvpStatus(id);
      const e = el.querySelector('.bw-st'); e.textContent = st.text; e.className = 'bw-st ' + st.cls;
      const hb = el.querySelector('.bw-hp'); if (hb) { hb.hidden = !st.max; if (st.max) hb.querySelector('i').style.width = `${(st.hp / st.max) * 100}%`; }
    }
  }

  renderDetail(pane) {
    const id = this.sel, m = MONSTERS[id], world = !!WORLD_BOSSES[id];
    const map = world ? MAPS[WORLD_BOSSES[id].map] : (mvpList().find((x) => x.id === id) || {}).map;
    pane.innerHTML = `<button type="button" class="ghost bw-back">‹ กลับ</button>
      <div class="bw-head" data-status="${world ? 'w' : 'm'}:${id}"><span class="bw-pic big"><img alt=""></span><div class="bw-info"><b></b><small></small><em class="bw-st"></em>${world ? '<div class="bw-hp"><i></i></div>' : ''}</div></div>
      <div class="bw-stats"></div><h3></h3><div class="bw-drops"></div><p class="tm-hint bw-note"></p>`;
    pane.querySelector('.bw-back').addEventListener('click', () => { this.sel = null; this.render(); });
    const url = monsterThumb(id, 160); if (url) pane.querySelector('.bw-head img').src = url;
    pane.querySelector('.bw-head b').textContent = `${world ? WORLD_BOSSES[id].name : m.name} · Lv.${world ? WORLD_BOSSES[id].level : m.level}`;
    pane.querySelector('.bw-head small').textContent = map ? `${map.name} · ${map.subtitle || ''}` : '';
    const S = [['HP', fmt(world ? WORLD_BOSSES[id].hp : m.hp)], ['ATK', `${fmt(m.atk[0])}–${fmt(m.atk[1])}`], ['DEF', m.def], ['MDEF', m.mdef], ['HIT', m.hit], ['FLEE', m.flee]];
    if (!world) S.push(['EXP', fmt(m.baseExp)], ['เกิดใหม่', `${Math.round(m.respawn[0] / 60)}–${Math.round(m.respawn[1] / 60)} นาที`]);
    else S.push(['เวลาเกิด', `ทุกวัน ${String(WORLD_BOSSES[id].hour).padStart(2, '0')}:00 น.`], ['อยู่ได้', '30 นาที']);
    pane.querySelector('.bw-stats').innerHTML = S.map(([k, v]) => `<span><small>${k}</small><b>${esc(v)}</b></span>`).join('');
    const drops = pane.querySelector('.bw-drops'), row = (iid, txt, qty) => {
      const it = ITEMS[iid]; if (!it) return;
      const r = document.createElement('div'); r.className = 'bw-drop';
      r.innerHTML = `<span class="slot r-${it.rarity || 'common'}"><img alt="" src="${iconURL(iid)}"></span><span class="bw-dn"><b></b><small></small></span><em></em>`;
      r.querySelector('b').textContent = it.name + (qty > 1 ? ` ×${qty}` : ''); r.querySelector('b').style.color = (RARITY[it.rarity] || {}).color || '';
      r.querySelector('small').textContent = it.slot ? `${it.reqLevel ? 'Lv.' + it.reqLevel + ' · ' : ''}${(RARITY[it.rarity] || {}).name || ''}` : it.type === 'card' ? 'การ์ด' : (RARITY[it.rarity] || {}).name || '';
      r.querySelector('em').textContent = txt; drops.append(r);
    };
    if (world) {
      const RW = WORLD_BOSSES[id].reward;
      pane.querySelector('h3').textContent = 'รางวัลผู้ร่วมพิชิต (ส่งทางจดหมาย)';
      const zrow = (n, txt) => { const z = document.createElement('div'); z.className = 'bw-drop'; z.innerHTML = `<span class="slot r-mythic"><b class="bw-z">Z</b></span><span class="bw-dn"><b>${n} Zeny</b><small>เงิน</small></span><em>${txt}</em>`; drops.append(z); };
      for (const [iid, q] of RW.items) row(iid, 'ได้แน่นอน', q);
      zrow(fmt(RW.zeny), 'ได้แน่นอน');
      for (const iid of RW.chance.items) row(iid, `ลุ้น ${pct(RW.chance.p / RW.chance.items.length)}`);
      const h4 = document.createElement('h3'); h4.className = 'bw-sub'; h4.textContent = '🏆 โบนัสดาเมจอันดับ 1–3'; drops.after(h4);
      const top = document.createElement('div'); top.className = 'bw-drops'; h4.after(top);
      const keep = drops; const tmp = top; 
      for (const [iid, q] of WORLD_TOP_BONUS.items) { const it = ITEMS[iid]; if (!it) continue; const r = document.createElement('div'); r.className = 'bw-drop'; r.innerHTML = `<span class="slot r-${it.rarity || 'common'}"><img alt="" src="${iconURL(iid)}"></span><span class="bw-dn"><b></b><small>เพิ่มจากรางวัลปกติ</small></span><em>อันดับ 1–3</em>`; r.querySelector('b').textContent = `${it.name} ×${q}`; tmp.append(r); }
      { const z = document.createElement('div'); z.className = 'bw-drop'; z.innerHTML = `<span class="slot r-mythic"><b class="bw-z">Z</b></span><span class="bw-dn"><b>+${WORLD_TOP_BONUS.zeny.map(fmt).join(' / ')} Zeny</b><small>อันดับ 1 / 2 / 3</small></span><em>อันดับ 1–3</em>`; tmp.append(z); }
      void keep;
      pane.querySelector('.bw-note').textContent = `ต้องตีให้ดาเมจเข้าอย่างน้อย 1 ครั้ง และบอสต้องถูกกำจัดภายใน 30 นาที · รับได้ 1 ครั้งต่อรอบต่อบัญชี · ลุ้นอาวุธ 1 ชิ้นแบบสุ่ม (รวม ${Math.round(RW.chance.p * 100)}%) · นับเป็นเควสประจำสัปดาห์ "ผู้ร่วมพิชิตบอสโลก"`;
    } else {
      pane.querySelector('h3').textContent = 'ของดรอป';
      const list = [...cardDrops(id), ...(m.drops || [])].filter(([iid]) => ITEMS[iid]).sort((a, b) => b[1] - a[1]);
      for (const [iid, p] of list) row(iid, pct(p));
      const rw = m.mvpReward ? Object.values(m.mvpReward).filter((x, i, a) => ITEMS[x] && a.indexOf(x) === i) : [];
      pane.querySelector('.bw-note').textContent = rw.length ? `รางวัล MVP: คนที่ปราบมีโอกาส 25% ได้ของตามอาชีพ 1 ชิ้น: ${rw.map((x) => ITEMS[x].name).join(' · ')}` : '';
    }
    this.renderStatus();
  }
}
