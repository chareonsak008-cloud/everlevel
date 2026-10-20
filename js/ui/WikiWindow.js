// v0.49 วิกิในเกม — คู่มือผู้เล่นใหม่ + ฐานข้อมูลทุกอย่างในเกม (สร้างจากข้อมูลเกมจริง อัปเดตตามเกมอัตโนมัติ)
// หมวด: คู่มือ · อุปกรณ์ · การ์ด · มอนสเตอร์ · แผนที่ · ไอเทม · สัตว์เลี้ยง · อาชีพ & สกิล
import { ITEMS, BASE_ITEMS, RARITY, EQUIP_SLOTS, describeBonus, weaponTypeName } from '../data/items.js?v=0.65.0';
import { MONSTERS } from '../data/monsters.js?v=0.65.0';
import { MAPS } from '../data/maps/index.js?v=0.65.0';
import { CARDS, cardSlotName } from '../data/cards.js?v=0.65.0';
import { CARD_SETS } from '../data/collection.js?v=0.65.0';
import { JOBS, STAT_INFO, START_STAT_POINTS, MAX_STAT, MAX_BASE_LEVEL, JOB_CHANGE_JOB_LEVEL, JOB2_JOB_LEVEL, STAT_RESET_FREE_LEVEL, baseExpToNext, statPointsForLevel, statCost } from '../data/progression.js?v=0.65.0';
import { SKILLS, KIND_NAME, skillSp } from '../data/skills.js?v=0.65.0';
import { REFINE_RATE, REFINE_MAX, SAFE_LIMIT, BREAK_FROM, LUCK_BONUS, canRefine, refineBonus, refineFee } from '../data/refine.js?v=0.65.0';
import { PETS, PET_ORDER, PET_RARITY, TIER_STATS, STAR_MAX, STAR_BONUS } from '../data/pets.js?v=0.65.0';
import { CONSUMABLES, USE_CATS } from '../data/consumables.js?v=0.65.0';
import { SHOPS, SELL_RATE, STORAGE_CAPACITY } from '../data/shops.js?v=0.65.0';
import { WORLD_BOSSES } from '../data/events.js?v=0.65.0';
import { CAVE, TOWER } from '../data/dungeons.js?v=0.65.0';
import { RESPAWN_MUL, SPAWN_MUL } from '../systems/MonsterAI.js?v=0.65.0';
import { rollFits } from '../data/affixes.js?v=0.65.0';
import { statsToBonus } from '../data/affixes.js?v=0.65.0';
import { VIP_PERKS } from './CashShop.js?v=0.65.0';
import { iconURL } from '../render/ItemIcons.js?v=0.65.0';
import { monsterThumb } from '../render/MonsterThumbs.js?v=0.65.0';
import { petThumb } from '../render/PetThumbs.js?v=0.65.0';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const pct = (p) => { const v = p * 100; return v >= 10 ? `${Math.round(v)}%` : v >= 1 ? `${+v.toFixed(1)}%` : v >= 0.01 ? `${+v.toFixed(2)}%` : `${+v.toPrecision(2)}%`; };
const rcol = (r) => (RARITY[r || 'common'] || RARITY.common).color;
const rname = (r) => (RARITY[r || 'common'] || RARITY.common).name || r;
const SLOT_TH = Object.fromEntries(EQUIP_SLOTS.map((s) => [s.id, s.name]));
const WPN_TH = { knife: 'มีด', sword: 'ดาบ', mace: 'กระบอง', staff: 'ไม้เท้า', bow: 'ธนู', spear: 'หอก', axe: 'ขวาน' };
const mapMinLv = (m) => (m.level ? m.level[0] : Math.min(999, ...(m.spawns || []).map((s) => (MONSTERS[s.mob] || {}).level || 999)) % 999);
const jobTh = (j) => (JOBS[j] ? JOBS[j].thai : j);

const SECTIONS = [
  ['guide', '📖 คู่มือ'], ['equip', '⚔ อุปกรณ์'], ['card', '🃏 การ์ด'], ['mob', '👾 มอนสเตอร์'], ['map', '🗺 แผนที่'],
  ['item', '🧪 ไอเทม'], ['pet', '🐾 สัตว์เลี้ยง'], ['job', '🧬 อาชีพ & สกิล'],
];

// ---------- ดัชนีแหล่งที่มา (สร้างครั้งแรกที่เปิดวิกิ) ----------
let IDX = null;
function index() {
  if (IDX) return IDX;
  const mobMaps = {}, dropBy = {}, shopBy = {};
  for (const [mid, def] of Object.entries(MAPS)) for (const s of def.spawns || []) (mobMaps[s.mob] ||= []).includes(mid) || mobMaps[s.mob].push(mid);
  for (const [id, m] of Object.entries(MONSTERS)) {
    if (m.worldBoss) continue;
    for (const [it, r] of m.drops || []) (dropBy[it] ||= []).push({ mob: id, rate: r });
  }
  for (const wb of Object.values(WORLD_BOSSES)) for (const [it] of (wb.reward && wb.reward.items) || []) (dropBy[it] ||= []).push({ boss: wb.name });
  for (const [sid, sh] of Object.entries(SHOPS)) for (const it of sh.items || []) (shopBy[it] ||= []).includes(sh.name) || shopBy[it].push(sh.name);
  const cardOf = {};
  for (const [cid, c] of Object.entries(CARDS)) cardOf[c.mob] = cid;
  IDX = { mobMaps, dropBy, shopBy, cardOf };
  return IDX;
}
const equipList = () => Object.entries(BASE_ITEMS).filter(([id, it]) => it.type === 'equip' && !id.includes('*')).sort((a, b) => (a[1].reqLevel || 0) - (b[1].reqLevel || 0) || a[1].name.localeCompare(b[1].name, 'th'));
const mobList = () => Object.entries(MONSTERS).filter(([, m]) => !m.worldBoss || true).sort((a, b) => a[1].level - b[1].level);
const mapList = () => Object.entries(MAPS).sort((a, b) => mapMinLv(a[1]) - mapMinLv(b[1]));
const itemList = () => Object.entries(ITEMS).filter(([id, it]) => (it.type === 'usable' || it.type === 'etc' || it.type === 'box') && !id.includes('*'));

export class WikiWindow {
  constructor(root, game) {
    this.g = game; this.sec = 'guide'; this.sel = 'start'; this.q = ''; this.f = { slot: 'all', job: 'all', cat: 'all' }; this.hist = [];
    const el = this.el = document.createElement('section');
    el.className = 'panel tm wikiw'; el.hidden = true;
    el.innerHTML = `<header class="st-head"><div><h2>📖 วิกิ Everlevel</h2><p>คู่มือผู้เล่นใหม่ · ข้อมูลอุปกรณ์ การ์ด มอนสเตอร์ แผนที่ และระบบทั้งหมดในเกม</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="wk-top"><div class="inv-tabs tm-tabs wk-tabs" role="tablist"></div><input type="search" class="wk-q" placeholder="🔍 ค้นหาทุกอย่าง… (ชื่อไอเทม มอน การ์ด แผนที่)" maxlength="40"></div>
      <div class="wk-body"><nav class="wk-list"></nav><article class="wk-page"></article></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart', 'keydown']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev !== 'keydown' });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    this.tabsEl = el.querySelector('.wk-tabs'); this.listEl = el.querySelector('.wk-list'); this.pageEl = el.querySelector('.wk-page');
    const q = el.querySelector('.wk-q');
    q.addEventListener('input', () => { this.q = q.value.trim(); this.renderList(); });
    this.pageEl.addEventListener('click', (e) => { const a = e.target.closest('[data-go]'); if (!a) return; const [s, id] = a.dataset.go.split(':'); this.go(s, id); });
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) { index(); this.render(); } }

  go(sec, id) {
    if (this.q) { this.q = ''; this.el.querySelector('.wk-q').value = ''; }
    this.sec = sec; this.sel = id; this.render();
    const cur = this.listEl.querySelector('.sel'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  render() {
    this.tabsEl.innerHTML = SECTIONS.map(([k, n]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${this.sec === k && !this.q}">${n}</button>`).join('');
    for (const b of this.tabsEl.querySelectorAll('[data-t]')) b.addEventListener('click', () => { this.sec = b.dataset.t; this.sel = this.sec === 'guide' ? 'start' : null; this.q = ''; this.el.querySelector('.wk-q').value = ''; this.render(); });
    this.renderList(); this.renderPage();
  }

  // ---------- รายการซ้ายมือ ----------
  entries() {
    const s = this.sec;
    if (s === 'guide') return GUIDES.map((g) => ({ id: g.id, name: g.title, sub: g.sub }));
    if (s === 'equip') return equipList().filter(([, it]) => (this.f.slot === 'all' || it.slot === this.f.slot) && (this.f.job === 'all' || !it.jobs || it.jobs.includes(this.f.job) || it.jobs.includes(JOBS[this.f.job]?.parent)))
      .map(([id, it]) => ({ id, name: it.name, sub: `Lv.${it.reqLevel || 1} · ${SLOT_TH[it.slot] || ''}${it.wtype ? ' · ' + (weaponTypeName(it) || '') : ''}`, icon: iconURL(id), color: rcol(it.rarity) }));
    if (s === 'card') return Object.entries(CARDS).sort((a, b) => ((MONSTERS[a[1].mob] || {}).level || 0) - ((MONSTERS[b[1].mob] || {}).level || 0))
      .map(([id, c]) => ({ id, name: c.name, sub: `${cardSlotName(c.on)} · ${describeBonus(c.bonus)}`, icon: iconURL(id), color: rcol(c.rarity) }));
    if (s === 'mob') return mobList().map(([id, m]) => ({ id, name: m.name, sub: `Lv.${m.level}${m.worldBoss ? ' · บอสโลก' : m.mvp ? ' · MVP' : ''} · HP ${fmt(m.hp)}`, color: m.worldBoss ? '#ff6a4a' : m.mvp ? '#ffb347' : '' }));
    if (s === 'map') return mapList().map(([id, m]) => ({ id, name: m.name, sub: m.level ? `Lv.${m.level[0]}–${m.level[1]}` : (m.spawns && m.spawns.length ? `Lv.${mapMinLv(m)}+ · ${m.subtitle || ''}` : (m.subtitle || '')) }));
    if (s === 'item') return itemList().filter(([, it]) => this.f.cat === 'all' || (it.cat || it.type) === this.f.cat)
      .map(([id, it]) => ({ id, name: it.name, sub: it.effect || (it.heal ? 'ฟื้นฟู' : it.type === 'etc' ? 'วัตถุดิบ / ของตีบวก' : ''), icon: iconURL(id), color: rcol(it.rarity) }));
    if (s === 'pet') return PET_ORDER.map((id) => ({ id, name: PETS[id].name, sub: PET_RARITY[PETS[id].tier].name, color: PET_RARITY[PETS[id].tier].color }));
    if (s === 'job') return Object.entries(JOBS).map(([id, j]) => ({ id, name: `${j.thai} (${j.name})`, sub: j.parent ? `อาชีพขั้น 2 ต่อจาก${jobTh(j.parent)}` : id === 'novice' ? 'อาชีพเริ่มต้น' : 'อาชีพขั้น 1', color: j.color }));
    return [];
  }

  // ค้นหาข้ามทุกหมวด
  searchAll(q) {
    const t = q.toLowerCase(), out = [];
    const hit = (s) => String(s || '').toLowerCase().includes(t);
    for (const g of GUIDES) if (hit(g.title)) out.push({ sec: 'guide', id: g.id, name: g.title, sub: 'คู่มือ' });
    for (const [id, it] of equipList()) if (hit(it.name) || hit(it.en)) out.push({ sec: 'equip', id, name: it.name, sub: `อุปกรณ์ · Lv.${it.reqLevel || 1}`, icon: iconURL(id), color: rcol(it.rarity) });
    for (const [id, c] of Object.entries(CARDS)) if (hit(c.name)) out.push({ sec: 'card', id, name: c.name, sub: 'การ์ด', icon: iconURL(id), color: rcol(c.rarity) });
    for (const [id, m] of mobList()) if (hit(m.name)) out.push({ sec: 'mob', id, name: m.name, sub: `มอนสเตอร์ · Lv.${m.level}` });
    for (const [id, m] of mapList()) if (hit(m.name) || hit(m.subtitle)) out.push({ sec: 'map', id, name: m.name, sub: 'แผนที่' });
    for (const [id, it] of itemList()) if (hit(it.name)) out.push({ sec: 'item', id, name: it.name, sub: 'ไอเทม', icon: iconURL(id), color: rcol(it.rarity) });
    for (const id of PET_ORDER) if (hit(PETS[id].name)) out.push({ sec: 'pet', id, name: PETS[id].name, sub: 'สัตว์เลี้ยง' });
    for (const [id, s] of Object.entries(SKILLS)) if (hit(s.name)) out.push({ sec: 'job', id: s.job, name: s.name, sub: `สกิล${jobTh(s.job)}` });
    return out.slice(0, 120);
  }

  renderList() {
    const L = this.listEl; L.innerHTML = '';
    const searching = !!this.q;
    for (const b of this.tabsEl.querySelectorAll('[data-t]')) b.setAttribute('aria-selected', String(!searching && b.dataset.t === this.sec));
    if (!searching) L.append(...this.filters());
    const list = searching ? this.searchAll(this.q) : this.entries();
    if (!searching && this.sel == null && list.length) { this.sel = list[0].id; this.renderPage(); }
    const box = document.createElement('div'); box.className = 'wk-items';
    if (!list.length) box.innerHTML = '<p class="tm-empty">ไม่พบข้อมูล</p>';
    for (const e of list) {
      const b = document.createElement('button'); b.type = 'button';
      const sec = e.sec || this.sec;
      b.className = 'wk-it' + (sec === this.sec && e.id === this.sel ? ' sel' : '');
      b.innerHTML = `${e.icon ? `<img alt="" src="${e.icon}">` : ''}<span><b></b><small></small></span>`;
      const nb = b.querySelector('b'); nb.textContent = e.name; if (e.color) nb.style.color = e.color;
      b.querySelector('small').textContent = e.sub || '';
      b.addEventListener('click', () => { if (searching) this.go(sec, e.id); else { this.sel = e.id; for (const x of box.querySelectorAll('.sel')) x.classList.remove('sel'); b.classList.add('sel'); this.renderPage(); } });
      box.append(b);
    }
    L.append(box);
  }

  filters() {
    const mk = (key, opts) => {
      const s = document.createElement('select'); s.className = 'wk-f';
      s.innerHTML = opts.map(([v, n]) => `<option value="${v}"${this.f[key] === v ? ' selected' : ''}>${esc(n)}</option>`).join('');
      s.addEventListener('change', () => { this.f[key] = s.value; this.sel = null; this.renderList(); });
      return s;
    };
    if (this.sec === 'equip') {
      const wrap = document.createElement('div'); wrap.className = 'wk-fs';
      wrap.append(mk('slot', [['all', 'ทุกช่อง'], ...EQUIP_SLOTS.map((s) => [s.id, s.name])]), mk('job', [['all', 'ทุกอาชีพ'], ...Object.entries(JOBS).map(([k, j]) => [k, j.thai])]));
      return [wrap];
    }
    if (this.sec === 'item') {
      const cats = [['all', 'ทุกประเภท'], ...Object.entries(USE_CATS).map(([k, c]) => [k, c.name]), ['etc', 'วัตถุดิบ / ของตีบวก'], ['box', 'กล่อง (ของเก่า)']];
      const wrap = document.createElement('div'); wrap.className = 'wk-fs'; wrap.append(mk('cat', cats)); return [wrap];
    }
    return [];
  }

  // ---------- หน้ารายละเอียด ----------
  renderPage() {
    const P = this.pageEl, id = this.sel;
    P.scrollTop = 0;
    try {
      const fn = { guide: () => guidePage(id, this), equip: () => equipPage(id), card: () => cardPage(id), mob: () => mobPage(id), map: () => mapPage(id), item: () => itemPage(id), pet: () => petPage(id), job: () => jobPage(id) }[this.sec];
      P.innerHTML = (id != null && fn && fn()) || '<p class="tm-empty">เลือกหัวข้อทางซ้าย</p>';
    } catch (e) { console.warn('wiki', e); P.innerHTML = '<p class="tm-empty">แสดงข้อมูลนี้ไม่ได้</p>'; }
    // รูปมอนสเตอร์: ใช้ภาพการ์ดก่อน ถ้าไม่มีค่อยเรนเดอร์โมเดล
    for (const img of P.querySelectorAll('img[data-mob]')) {
      const mid = img.dataset.mob;
      img.addEventListener('error', () => { img.onerror = null; const u = monsterThumb(mid, 112); if (u) img.src = u; else img.remove(); }, { once: true });
      img.src = `assets/monsters/${mid}.png`;
    }
    for (const img of P.querySelectorAll('img[data-pet]')) { const u = petThumb(img.dataset.pet); if (u) img.src = u; }
  }
}

// ---------- ชิ้นส่วนหน้า ----------
const link = (sec, id, text, color) => `<a class="wk-a" data-go="${sec}:${esc(id)}"${color ? ` style="color:${color}"` : ''}>${esc(text)}</a>`;
const itemLink = (id) => { const it = ITEMS[id]; if (!it) return esc(id); const sec = it.type === 'equip' ? 'equip' : it.type === 'card' ? 'card' : 'item'; return `<span class="wk-chip"><img alt="" src="${iconURL(id)}">${link(sec, id, it.name, rcol(it.rarity))}</span>`; };
const mobLink = (id) => (MONSTERS[id] ? link('mob', id, `${MONSTERS[id].name} (Lv.${MONSTERS[id].level})`) : esc(id));
const mapLink = (id) => (MAPS[id] ? link('map', id, MAPS[id].name) : esc(id));
const stats = (pairs) => `<div class="wk-stats">${pairs.filter(Boolean).map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join('')}</div>`;
const table = (head, rows, cls = '') => `<table class="wk-tb ${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const head = (icon, name, color, sub) => `<div class="wk-head">${icon ? `<div class="wk-pic">${icon}</div>` : ''}<div><h3 style="color:${color || '#ffe8a8'}">${esc(name)}</h3><p>${sub}</p></div></div>`;
const statsBonusText = (b) => describeBonus(statsToBonus(b, {})) || Object.entries(b).map(([k, v]) => `${k} +${v}`).join(' · ');

function sources(id) {
  const I = index(), out = [];
  const drops = (I.dropBy[id] || []).slice().sort((a, b) => (b.rate || 0) - (a.rate || 0));
  if (drops.length) out.push(`<h4>ดรอปจาก</h4><div class="wk-chips">${drops.slice(0, 40).map((d) => (d.boss ? `<span class="wk-chip">🌍 บอสโลก ${esc(d.boss)} (รางวัล)</span>` : `<span class="wk-chip">${mobLink(d.mob)} <em>${pct(d.rate)}</em></span>`)).join('')}${drops.length > 40 ? `<span class="wk-chip">และอีก ${drops.length - 40} ตัว</span>` : ''}</div>`);
  if (I.shopBy[id]) out.push(`<h4>ขายที่ร้าน</h4><p>${I.shopBy[id].map(esc).join(' · ')}</p>`);
  const it = ITEMS[id];
  if (it && it.from && it.from.length) out.push(`<h4>หาได้จาก</h4><ul class="wk-ul">${it.from.map(([, t]) => `<li>${esc(t)}</li>`).join('')}</ul>`);
  return out.join('') || '<p class="wk-muted">ได้จากกิจกรรม / เควสต์ / ร้านเพชร หรือการแลกเปลี่ยนกับผู้เล่น</p>';
}

function equipPage(id) {
  const it = BASE_ITEMS[id]; if (!it) return '';
  const sub = [rname(it.rarity), SLOT_TH[it.slot], it.wtype ? weaponTypeName(it) : '', `ต้องการ Lv.${it.reqLevel || 1}`].filter(Boolean).join(' · ');
  let h = head(`<img alt="" src="${iconURL(id)}">`, it.name, rcol(it.rarity), esc(sub));
  h += stats([
    ['ค่าพื้นฐาน', esc(describeBonus(it.bonus) || '-')],
    ['ช่องการ์ด', it.slots || 0],
    ['อาชีพที่ใช้ได้', it.jobs ? esc(it.jobs.filter((j) => j !== 'novice' || it.jobs.length === 1).map(jobTh).join(', ')) : 'ทุกอาชีพ'],
    it.element && it.element !== 'neutral' ? ['ธาตุ', esc(it.element)] : null,
    it.twoHand ? ['ถือ', 'สองมือ'] : null,
    ['ราคาขายร้าน', fmt((it.price || 0) * SELL_RATE) + ' z'],
  ]);
  if (it.desc) h += `<p class="wk-desc">${esc(it.desc)}</p>`;
  if (it.style || it.tradeoff) h += `<p class="wk-muted">${esc([it.style, it.tradeoff && 'จุดด้อย: ' + it.tradeoff].filter(Boolean).join(' · '))}</p>`;
  if (it.passive && it.passive.text) h += `<h4>ความสามารถพิเศษ</h4><p>✨ ${esc(it.passive.text)}</p>`;
  if (it.rolls && it.rolls.pool && it.rolls.pool.length) {
    const [a, b] = it.rolls.count || [0, 1];
    h += `<h4>ค่าสุ่มพิเศษ (ได้ ${a}–${b} ค่าตอนดรอป/ซื้อ · ✦ = ตรงสายของชิ้นนี้)</h4><div class="wk-chips">${it.rolls.pool.map((r) => `<span class="wk-chip">${rollFits(it, r.stat) ? '✦ ' : ''}${esc(r.stat)} <span class="${r.min < 0 ? 'wk-bad' : 'wk-good'}">${r.min}</span>~<span class="wk-good">+${r.max}</span></span>`).join('')}</div><p class="wk-muted">ค่าติดลบ = ค่าสุ่มไม่ดี · ดูหัวข้อ "ค่าสุ่มอาวุธ" ในคู่มือ</p>`;
  }
  if (it.set) h += `<h4>ชุดเซ็ต: ${esc(it.set.name)}</h4><p>${Object.entries(it.set.bonus).map(([n, b]) => `สวม ${n} ชิ้น: <b>${esc(statsBonusText(b))}</b>`).join('<br>')}</p><div class="wk-chips">${it.set.pieces.map((p) => (ITEMS[p] ? itemLink(p) : '')).join('')}</div>`;
  if (canRefine(it)) {
    const rows = [];
    for (let n = 1; n <= REFINE_MAX; n++) rows.push([`+${n}`, `${REFINE_RATE[n]}%`, esc(describeBonus(refineBonus(it, n)) || '-'), fmt(refineFee(n)) + ' z', n <= SAFE_LIMIT ? 'ไม่เสียอะไร' : n >= BREAK_FROM ? '<span class="wk-bad">แตก!</span>' : 'ลด 1 ขั้น']);
    h += `<h4>ตีบวก +1 ถึง +10 (โบนัสรวมที่ได้)</h4>${table(['ขั้น', 'โอกาส', 'โบนัสรวม', 'ค่าตี', 'ถ้าพลาด'], rows)}`;
  } else if (it.slot === 'accessory') h += '<p class="wk-muted">เครื่องประดับตีบวกไม่ได้</p>';
  h += sources(id);
  return h;
}

function cardPage(id) {
  const c = CARDS[id]; if (!c) return '';
  const m = MONSTERS[c.mob];
  let h = head(`<img alt="" src="${iconURL(id)}">`, c.name, rcol(c.rarity), esc(`${rname(c.rarity)} · ใส่ในช่อง${cardSlotName(c.on)}`));
  h += stats([['ความสามารถ', esc(describeBonus(c.bonus) || '-')], ['ใส่ซ้ำได้สูงสุด', `${c.maxStack || 1} ใบ`], ['โอกาสดรอป', pct(c.drop || 0)], ['ราคาขายร้าน', fmt((c.price || 0) * SELL_RATE) + ' z']]);
  if (c.desc) h += `<p class="wk-desc">${esc(c.desc)}</p>`;
  if (m) h += `<h4>ดรอปจาก</h4><p><img class="wk-mini" alt="" data-mob="${esc(c.mob)}"> ${mobLink(c.mob)}${(index().mobMaps[c.mob] || []).length ? ' · ' + index().mobMaps[c.mob].map(mapLink).join(', ') : ''}</p>`;
  const set = Object.values(CARD_SETS || {}).find((s) => s.cards.includes(id));
  if (set) h += `<h4>ชุดสะสมการ์ด: ${esc(set.name)}</h4><p>สะสมครบทั้งชุดในสมุดสะสม (B) ได้โบนัสถาวร <b>${esc(describeBonus(set.bonus))}</b></p><div class="wk-chips">${set.cards.map((x) => (ITEMS[x] ? itemLink(x) : '')).join('')}</div>`;
  h += '<p class="wk-muted">วิธีใส่การ์ด: เปิดกระเป๋า (I) → เลือกการ์ด → กด "ใส่การ์ด" แล้วเลือกอุปกรณ์ที่มีช่องว่าง · ใส่แล้วถอดคืนไม่ได้</p>';
  return h;
}

function mobPage(id) {
  const m = MONSTERS[id]; if (!m) return '';
  const I = index();
  const tag = m.worldBoss ? 'บอสโลก' : m.mvp ? 'บอส MVP' : m.aggressive ? 'มอนดุ (โจมตีก่อน)' : 'มอนเฉย (ไม่โจมตีก่อน)';
  let h = head(`<img alt="" data-mob="${esc(id)}">`, m.name, m.mvp || m.worldBoss ? '#ffb347' : '#ffe8a8', esc(`Lv.${m.level} · ${tag}`));
  const atk = Array.isArray(m.atk) ? `${fmt(m.atk[0])}–${fmt(m.atk[1])}` : fmt(m.atk);
  h += stats([['HP', fmt(m.hp)], ['ATK', atk], ['DEF', m.def ?? '-'], ['MDEF', m.mdef ?? '-'], ['HIT', m.hit ?? '-'], ['FLEE', m.flee ?? '-'], ['Base EXP', fmt(m.baseExp)], ['Job EXP', fmt(m.jobExp)]]);
  if (m.respawn) h += `<p class="wk-muted">เกิดใหม่ทุก ${(Array.isArray(m.respawn) ? m.respawn : [m.respawn]).map((x) => Math.max(2, Math.round(x * (m.mvp || m.worldBoss || m.boss ? 1 : RESPAWN_MUL)))).join('–')} วินาที${m.mvp ? ' (MVP สุ่มจุดเกิดทั่วแผนที่)' : ''}</p>`;
  const maps = I.mobMaps[id] || [];
  if (m.worldBoss) { const wb = Object.values(WORLD_BOSSES).find((b) => b.base && id.includes(b.base)) || Object.values(WORLD_BOSSES).find((b) => b.name === m.name); if (wb) h += `<p>🌍 เกิดทุกวันเวลา <b>${wb.hour}:00 น.</b> (เวลาไทย) ที่ ${mapLink(wb.map)} · อยู่ 30 นาที · ดูรางวัลที่ปุ่ม "บอส"</p>`; }
  if (maps.length) h += `<h4>พบได้ที่</h4><p>${maps.map(mapLink).join(' · ')}</p>`;
  const drops = (m.drops || []).filter(([it]) => ITEMS[it]).slice().sort((a, b) => b[1] - a[1]);
  if (drops.length) h += `<h4>ของดรอป</h4><div class="wk-chips">${drops.map(([it, r]) => `${itemLink(it).replace('</span>', ` <em>${pct(r)}</em></span>`)}`).join('')}</div>`;
  if (I.cardOf[id]) h += `<h4>การ์ด</h4><div class="wk-chips">${itemLink(I.cardOf[id]).replace('</span>', ` <em>${pct(CARDS[I.cardOf[id]].drop || 0)}</em></span>`)}</div>`;
  if (!m.worldBoss) h += `<p class="wk-muted">ทุกตัวมีโอกาสดรอปคริสตัลพิทักษ์และหินนำโชคเล็กน้อย${m.mvp ? ' (MVP 6%)' : ''} · ใบคูณดรอป / VIP / อีเวนต์ เพิ่มโอกาสดรอปได้</p>`;
  return h;
}

function mapPage(id) {
  const d = MAPS[id]; if (!d) return '';
  let h = head('', d.name, '#ffe8a8', esc(d.subtitle || ''));
  if (d.level) h += stats([['เลเวลแนะนำ', `Lv.${d.level[0]}–${d.level[1]}`], ['มอนสเตอร์', `${(d.spawns || []).length} ชนิด`]]);
  const mobs = [...new Set((d.spawns || []).map((s) => s.mob))].filter((x) => MONSTERS[x]).sort((a, b) => MONSTERS[a].level - MONSTERS[b].level);
  if (mobs.length) h += `<h4>มอนสเตอร์ในแผนที่</h4><div class="wk-mobs">${mobs.map((x) => `<a class="wk-mob" data-go="mob:${esc(x)}"><img alt="" data-mob="${esc(x)}"><b${MONSTERS[x].mvp ? ' class="mvp"' : ''}>${esc(MONSTERS[x].name)}</b><small>Lv.${MONSTERS[x].level}${MONSTERS[x].mvp ? ' · MVP' : ''}</small></a>`).join('')}</div>`;
  else h += '<p class="wk-muted">เขตปลอดภัย ไม่มีมอนสเตอร์ · มี NPC ร้านค้า คลังเก็บของ ช่างตีเหล็ก ตลาด และจุดวาร์ป</p>';
  const wbs = Object.values(WORLD_BOSSES).filter((b) => b.map === id);
  for (const b of wbs) h += `<p>🌍 บอสโลก <b>${esc(b.name)}</b> เกิดทุกวัน ${b.hour}:00 น.</p>`;
  return h;
}

function itemPage(id) {
  const it = ITEMS[id]; if (!it) return '';
  const cat = (USE_CATS[it.cat] && USE_CATS[it.cat].name) || (it.type === 'etc' ? 'วัตถุดิบ / ของตีบวก' : it.type === 'box' ? 'กล่อง (ของเก่า)' : 'ไอเทมใช้งาน');
  let h = head(`<img alt="" src="${iconURL(id)}">`, it.name, rcol(it.rarity), esc(cat));
  const heal = it.heal ? Object.entries(it.heal).map(([k, [a, b]]) => `${k.toUpperCase()} +${a}–${b}`).join(' · ') : '';
  h += stats([(it.effect || heal) ? ['ผล', esc(it.effect || heal)] : null, it.dur ? ['ระยะเวลา', `${Math.round(it.dur / 60)} นาที`] : null, it.price ? ['ราคาร้าน', fmt(it.price) + ' z'] : null, it.price ? ['ขายคืน', fmt(it.price * SELL_RATE) + ' z'] : null]);
  if (it.desc) h += `<p class="wk-desc">${esc(it.desc)}</p>`;
  h += sources(id);
  return h;
}

function petPage(id) {
  const d = PETS[id]; if (!d) return '';
  const T = TIER_STATS[d.tier];
  let h = head(`<img alt="" data-pet="${esc(id)}">`, d.name, PET_RARITY[d.tier].color, esc(`${PET_RARITY[d.tier].name} · ${d.en}`));
  h += stats([['รัศมีเก็บของ', `${T.radius} ช่อง`], ['ความเร็ว', `${T.speed}%`], ['ขนต่อรอบ', T.carry || 'ไม่จำกัด'], ['ดาวสูงสุด', `★${STAR_MAX}`]]);
  h += `<p class="wk-desc">${esc(d.flavor)}</p><h4>ความสามารถพิเศษ: ${esc(d.skill.name)}</h4><p>${esc(d.skill.desc)}</p>`;
  h += `<p class="wk-muted">ซื้อได้ที่ร้านเพชร → แท็บสัตว์เลี้ยง · ซื้อซ้ำได้ดาว +1 (แต่ละดาว รัศมี +${STAR_BONUS.radius * 100}% ความเร็ว +${STAR_BONUS.speed * 100}%) · กด P เพื่อเรียกออกมาและตั้งค่าว่าจะให้เก็บอะไร</p>`;
  return h;
}

function jobPage(id) {
  const j = JOBS[id]; if (!j) return '';
  let h = head(`<span class="wk-crest" style="background:${j.color}">${esc(j.crest)}</span>`, `${j.thai} (${j.name})`, j.color, esc(j.role || (id === 'novice' ? 'อาชีพเริ่มต้นของทุกคน' : '')));
  if (j.desc) h += `<p class="wk-desc">${esc(j.desc)}</p>`;
  const js = Object.entries(j.jobStats || {}).map(([k, r]) => `${k.toUpperCase()} +${Math.floor(r * j.maxJobLevel)}`).join(' · ');
  h += stats([['Job Lv. สูงสุด', j.maxJobLevel], ['HP', `×${j.hp}`], ['SP', `×${j.sp}`], ['อาวุธ', esc((j.weapons || []).filter((w) => w !== 'none').map((w) => WPN_TH[w] || w).join(', ') || '-')], js ? [`โบนัสสเตตัสที่ Job Lv.${j.maxJobLevel}`, esc(js)] : null]);
  if (id === 'novice') h += `<p>เมื่อถึง <b>Job Lv.${JOB_CHANGE_JOB_LEVEL}</b> และอัปสกิลทักษะพื้นฐานครบ Lv.9 ไปหา <b>ออเรล</b> ที่หอสมาคมในเมืองเพื่อเปลี่ยนอาชีพขั้น 1</p>`;
  else if (!j.parent) h += `<p>ถึง <b>Job Lv.${JOB2_JOB_LEVEL}</b> และทำเควสต์เลื่อนขั้นสำเร็จ จะเปลี่ยนเป็นอาชีพขั้น 2 ได้: ${Object.entries(JOBS).filter(([, x]) => x.parent === id).map(([k, x]) => link('job', k, x.thai, x.color)).join(', ')}</p>`;
  const sk = Object.entries(SKILLS).filter(([, s]) => s.job === id);
  if (sk.length) h += `<h4>สกิล (${sk.length})</h4>` + table(['สกิล', 'ประเภท', 'Lv.', 'SP', 'รายละเอียด'], sk.map(([, s]) => [`<b>${esc(s.name)}</b>${s.req ? `<br><small class="wk-muted">ต้องมี ${Object.entries(s.req).map(([r, l]) => `${esc(SKILLS[r] ? SKILLS[r].name : r)} Lv.${l}`).join(', ')}</small>` : ''}`, KIND_NAME[s.kind] || s.kind || '', s.maxLv || 1, (() => { const a = skillSp(s, 1), b = skillSp(s, s.maxLv || 1); return !a && !b ? '-' : a === b ? a : `${a}–${b}`; })(), esc(s.desc || '')]), 'wk-skill');
  return h;
}

// ---------- คู่มือ ----------
function guidePage(id, w) {
  const g = GUIDES.find((x) => x.id === id) || GUIDES[0];
  return `<h3 class="wk-gt">${esc(g.title)}</h3>${g.html(w)}`;
}
const P = (s) => `<p>${s}</p>`;
const UL = (a) => `<ul class="wk-ul">${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
const K = (k) => `<kbd>${k}</kbd>`;

const GUIDES = [
  { id: 'start', title: '🌱 เริ่มต้นเล่น', sub: 'สิ่งแรกที่ควรทำ', html: () =>
    P('ยินดีต้อนรับสู่ <b>Everlevel</b> — เกมออนไลน์แนว RO เล่นสบาย ๆ ล่ามอน เก็บเลเวล ตีบวกอุปกรณ์ สะสมการ์ด และผจญภัยกับเพื่อน') +
    `<h4>ลำดับแนะนำสำหรับผู้เล่นใหม่</h4>` + UL([
      'ทำเควสต์เนื้อเรื่อง (กด ' + K('J') + ') — มีลูกศรนำทางไปหา NPC ได้รางวัลเยอะ เป็นทางเก็บเลเวลที่ง่ายที่สุด',
      'ออกไป <b>Beginner Field</b> ล่ามอน Lv.1–15 กด ' + K('Space') + ' เพื่อตีตัวที่ใกล้ที่สุด',
      'อัปสเตตัส (' + K('C') + ') และสกิล (' + K('K') + ') ทุกครั้งที่เลเวลขึ้น',
      `ถึง <b>Job Lv.${JOB_CHANGE_JOB_LEVEL}</b> + ทักษะพื้นฐาน Lv.9 → เปลี่ยนอาชีพที่ออเรล (หอสมาคมในเมือง)`,
      'เปิดล่าอัตโนมัติ (' + K('Z') + ') ตั้งค่าได้ที่ ' + K('H') + ' — ให้บอทใช้ยาและสกิลให้',
      'เช็กอินทุกวันในหน้ากิจกรรม และดูจดหมาย (' + K('M') + ') รับของรางวัล',
      'ไปแผนที่ใหม่ตามเลเวล (ดูหัวข้อ "เส้นทางเก็บเลเวล")',
    ]) },
  { id: 'controls', title: '🎮 การควบคุม', sub: 'ปุ่มลัดทั้งหมด', html: () =>
    table(['ปุ่ม', 'ทำอะไร'], [
      ['คลิกพื้น / ' + K('W') + K('A') + K('S') + K('D'), 'เดิน'], ['คลิกมอนสเตอร์ / ' + K('Space'), 'โจมตี / ตีตัวใกล้สุด'], [K('F1') + '–' + K('F9'), 'ปุ่มลัดสกิล/ไอเทม (ลากจากหน้าต่างสกิลหรือกระเป๋ามาวาง)'],
      [K('C'), 'สถานะ / อัปสเตตัส'], [K('I'), 'กระเป๋า'], [K('K'), 'สกิล'], [K('O'), 'ตู้แฟชั่น'], [K('J'), 'เควสต์'], [K('P'), 'สัตว์เลี้ยง'],
      [K('Z') + ' / ' + K('H'), 'เริ่ม-หยุดล่าอัตโนมัติ / ตั้งค่าออโต้'], [K('M'), 'จดหมาย'], [K('B'), 'สมุดสะสม'], [K('N'), 'แผนที่โลก'], [K('Enter'), 'แชต'],
      [K('Q') + ' ' + K('E'), 'หมุนกล้อง'], ['คลิกขวาลาก / ' + K('PgUp') + K('PgDn'), 'ปรับมุมก้มกล้อง'], ['คลิก NPC', 'ซื้อขาย · ฝากของ · วาร์ป · ตีบวก · รับเควสต์'], ['คลิกผู้เล่น', 'แลกเปลี่ยน · ชวนปาร์ตี้ · กระซิบ'],
    ]) + P('บนมือถือ: แตะพื้นเพื่อเดิน แตะมอนหรือปุ่ม ⚔ เพื่อโจมตี ใช้สองนิ้วหมุนกล้อง') },
  { id: 'level', title: '📈 เลเวล & สเตตัส', sub: 'EXP · แต้มสเตตัส · สูตร', html: () => {
    const lv = [1, 10, 20, 30, 50, 70, 99, 120, 149].map((l) => [`Lv.${l} → ${l + 1}`, fmt(baseExpToNext(l)), `+${statPointsForLevel(l + 1)}`]);
    return P(`เลเวลมี 2 แบบ: <b>Base Lv.</b> (สูงสุด ${MAX_BASE_LEVEL}) ได้แต้มสเตตัส · <b>Job Lv.</b> ได้แต้มสกิลและโบนัสสเตตัสตามอาชีพ · กำจัดมอนได้ EXP ทั้งสองแบบ`) +
      P(`เริ่มต้นมีแต้มสเตตัส ${START_STAT_POINTS} แต้ม · เลเวลขึ้นได้แต้ม = เลเวลใหม่ ÷ 5 + 3 · สเตตัสแต่ละตัวสูงสุด ${MAX_STAT} · อัปสเตตัสที่ค่าสูงจะใช้แต้มมากขึ้น (ค่าที่ 1–10 ใช้ ${statCost(1)} แต้ม, 91–100 ใช้ ${statCost(91)} แต้ม)`) +
      table(['เลเวล', 'EXP ที่ต้องใช้', 'แต้มที่ได้'], lv) +
      `<h4>สเตตัสหลัก</h4>` + table(['สเตตัส', 'ชื่อ', 'ผล'], Object.entries(STAT_INFO).map(([, s]) => [`<b>${s.label}</b>`, s.name, s.desc])) +
      `<h4>สูตรคร่าว ๆ</h4>` + UL(['ATK = STR + (STR÷10)² + DEX÷5 + LUK÷5 + ATK อาวุธ (นักธนูใช้ DEX แทน STR)', 'MATK = INT + (INT÷7)² ถึง INT + (INT÷5)² + MATK อุปกรณ์', 'DEF = VIT÷2 + Lv÷10 + DEF อุปกรณ์ · MDEF = INT÷2 + VIT÷5', 'HIT = 90 + DEX + Lv÷2 · FLEE = 5 + AGI + Lv÷2', 'คริติคอล 3% + LUK × 0.4% · AGI/DEX ทำให้ตีเร็วขึ้น']) +
      P(`รีเซ็ตสเตตัสฟรีจนถึง Lv.${STAT_RESET_FREE_LEVEL} หลังจากนั้นเสียค่ารีเซ็ต (หรือใช้ไอเทมรีเซ็ตจากร้านเพชร)`);
  } },
  { id: 'build', title: '🛠 แนะนำการอัปสเตตัส', sub: 'บิลด์พื้นฐานแต่ละอาชีพ', html: () =>
    table(['อาชีพ', 'สเตตัสหลัก', 'รอง', 'หมายเหตุ'], [
      ['นักดาบ / อัศวิน', 'STR', 'VIT · DEX', 'อึด ตีแรง เหมาะยืนแนวหน้า'], ['นักเวทย์ / จอมเวท', 'INT', 'DEX · VIT', 'DEX ลดเวลาร่าย · VIT กันตายง่าย'],
      ['นักธนู / นักล่า', 'DEX', 'AGI · LUK', 'DEX = ดาเมจ + ความแม่น ยิงจากระยะไกล'], ['นักบวช / นักบวชชั้นสูง', 'INT', 'VIT · DEX', 'ฮีลแรงตาม INT เหมาะเล่นปาร์ตี้'],
    ]) + P('ไม่ต้องกลัวอัปผิด — รีเซ็ตฟรีจนถึง Lv.' + STAT_RESET_FREE_LEVEL) },
  { id: 'jobs', title: '🧬 อาชีพ', sub: 'เปลี่ยนอาชีพขั้น 1 / 2', html: () =>
    P(`ทุกคนเริ่มเป็น <b>Novice</b> · Job Lv.${JOB_CHANGE_JOB_LEVEL} เปลี่ยนอาชีพขั้น 1 · Job Lv.${JOB2_JOB_LEVEL} + เควสต์เลื่อนขั้น เปลี่ยนอาชีพขั้น 2 (ได้โบนัสสเตตัสจาก Job Lv. ขั้น 1 ติดไปด้วย)`) +
    table(['อาชีพ', 'แนวทาง', 'ขั้น 2'], Object.entries(JOBS).filter(([k, j]) => k !== 'novice' && !j.parent).map(([k, j]) => [link('job', k, j.thai, j.color), esc(j.role || ''), Object.entries(JOBS).filter(([, x]) => x.parent === k).map(([kk, x]) => link('job', kk, x.thai, x.color)).join(', ')])) +
    P('ดูสกิลทั้งหมดของแต่ละอาชีพได้ที่แท็บ "อาชีพ & สกิล"') },
  { id: 'refine', title: '🔨 การตีบวก', sub: '+1 ถึง +10 · หินกันแตก · หินนำโชค', html: () =>
    P('ตีบวกได้ที่ <b>ช่างตีเหล็ก</b> (โรงตีเหล็กการ์ธในเมือง) · ใช้ <b>ผลึกตีบวกอาวุธ</b> สำหรับอาวุธ และ <b>ผลึกตีบวกเกราะ</b> สำหรับหมวก/ชุด/โล่/ผ้าคลุม/รองเท้า ครั้งละ 1 ก้อน + ค่าตี · เครื่องประดับตีไม่ได้') +
    table(['ขั้น', 'โอกาสสำเร็จ', 'ค่าตี', 'ถ้าล้มเหลว'], Array.from({ length: REFINE_MAX }, (_, i) => { const n = i + 1; return [`+${n}`, `${REFINE_RATE[n]}%${n > SAFE_LIMIT ? ` <small class="wk-good">(${Math.min(100, REFINE_RATE[n] + LUCK_BONUS)}% ด้วยหินนำโชค)</small>` : ''}`, fmt(refineFee(n)) + ' z', n <= SAFE_LIMIT ? 'ไม่เสียอะไร (สำเร็จแน่นอน)' : n >= BREAK_FROM ? '<span class="wk-bad">อุปกรณ์แตกหาย!</span>' : 'ระดับลดลง 1']; })) +
    `<h4>หินช่วยตีบวก</h4>` + UL([
      `${itemLink('refine_guard')} — ใช้ตอนตี +${BREAK_FROM} ขึ้นไป ถ้าล้มเหลวของ <b>ไม่แตก</b> (แต่ระดับยังลด 1)`,
      `${itemLink('refine_luck')} — ใช้ตอนตี +${SAFE_LIMIT + 1} ขึ้นไป โอกาสสำเร็จ <b>+${LUCK_BONUS}%</b>`,
      'ใช้ทั้งสองอย่างพร้อมกันได้ · หาได้จากร้านเพชร, ดรอปจากมอนทุกตัว (โอกาสต่ำ), MVP, บอสโลก, ดันเจี้ยน และเควสต์',
      'สัตว์เลี้ยงกิเลน "เทียนหยุน" เพิ่มโอกาสตี +5 ขึ้นไปอีก 5%',
    ]) +
    `<h4>โบนัสจากการตีบวก</h4>` + UL(['อาวุธ: ATK เพิ่มทุกขั้น (ยิ่งหายากยิ่งเพิ่มมาก) และตั้งแต่ +8 ได้เพิ่มเป็นสองเท่าต่อขั้น · ไม้เท้าได้ MATK ด้วย', 'ชุดเกราะ: DEF +1 ต่อขั้น · ชุดตั้งแต่ +5 ได้ MDEF · ตั้งแต่ +8 ได้ Max HP เพิ่ม', 'ดูตารางโบนัส +1~+10 ของอุปกรณ์แต่ละชิ้นได้ในแท็บ "อุปกรณ์"']) +
    P('💡 เคล็ดลับ: ตี +1~+4 ได้ฟรีไม่มีความเสี่ยง · +5~+7 เตรียมผลึกสำรอง · +8 ขึ้นไปควรใช้คริสตัลพิทักษ์ทุกครั้ง') },
  { id: 'cards', title: '🃏 การ์ด', sub: 'ดรอป · ใส่การ์ด · ชุดสะสม', html: () =>
    P(`มอนสเตอร์ทุกชนิดมีการ์ดของตัวเอง (${Object.keys(CARDS).length} ใบ) · ดรอปยากมาก — มอนปกติประมาณ 0.2% · ตัวเก่ง 0.075% · MVP 1%`) +
    UL(['การ์ดใส่ได้เฉพาะอุปกรณ์ที่มี <b>ช่องการ์ด</b> และต้องตรงประเภท (เช่น การ์ดอาวุธใส่อาวุธ การ์ดรองเท้าใส่รองเท้า)', 'บางการ์ดใส่ซ้ำได้หลายใบ (ดู "ใส่ซ้ำได้สูงสุด")', 'ใส่แล้วถอดไม่ได้ — เลือกอุปกรณ์ให้ดีก่อน', 'ใช้ <b>ใบโคลเวอร์</b> เพิ่มโอกาสดรอปการ์ด · สัตว์เลี้ยงเทียนหยุนเพิ่มโอกาสการ์ด ×1.5', 'ได้การ์ดครั้งแรกจะถูกบันทึกในสมุดสะสม (B) · สะสมครบชุดได้โบนัสถาวร']) +
    `<h4>ชุดสะสมการ์ด</h4>` + table(['ชุด', 'การ์ด', 'โบนัสถาวร'], Object.values(CARD_SETS || {}).map((s) => [esc(s.name), s.cards.map((c) => (CARDS[c] ? link('card', c, CARDS[c].name.replace('การ์ด', ''), rcol(CARDS[c].rarity)) : '')).join(', '), esc(describeBonus(s.bonus))])) },
  { id: 'route', title: '🗺 เส้นทางเก็บเลเวล', sub: 'ควรไปแผนที่ไหนเลเวลเท่าไหร่', html: () =>
    table(['แผนที่', 'เลเวล', 'มอนเด่น'], mapList().filter(([, m]) => m.spawns && m.spawns.length).map(([id, m]) => {
      const mobs = [...new Set(m.spawns.map((s) => s.mob))].filter((x) => MONSTERS[x]);
      const mvp = mobs.filter((x) => MONSTERS[x].mvp);
      const lv = m.level ? `Lv.${m.level[0]}–${m.level[1]}` : (() => { const ls = mobs.filter((x) => !MONSTERS[x].mvp).map((x) => MONSTERS[x].level); return ls.length ? `Lv.${Math.min(...ls)}–${Math.max(...ls)}` : '-'; })();
      return [link('map', id, m.name), lv, mvp.length ? 'MVP: ' + mvp.map((x) => link('mob', x, MONSTERS[x].name)).join(', ') : `${mobs.length} ชนิด`];
    })) + UL(['ล่ามอนที่เลเวลใกล้เคียงตัวเองได้ EXP คุ้มที่สุด', 'ใช้ใบคูณ EXP + ทำเควสต์รายวัน/รายสัปดาห์ เร่งเลเวลได้มาก', 'วาร์ปไปแผนที่ไกล ๆ ได้ที่ NPC นักเวทย์วาร์ป (เสีย Zeny) หรือใบวาร์ป']) },
  { id: 'rolls', title: '🎲 ค่าสุ่มอาวุธ & อุปกรณ์', sub: 'สุ่มดี/ไม่ดี · ตรงสาย · เกรด', html: () =>
    P('อาวุธ<b>และอุปกรณ์สวมใส่ทุกชิ้นทุกระดับ</b> (หัว · ชุด · มือรอง · ผ้าคลุม · รองเท้า · เครื่องประดับ) ได้ค่าสุ่มพิเศษ <b>1–3 ค่า</b> ตอนดรอปจากมอนหรือซื้อจากร้าน — ชื่อเดียวกันแต่ละชิ้นจึงเก่งไม่เท่ากัน เลือกเก็บชิ้นที่เข้ากับบิลด์ แล้วเอาชิ้นที่ไม่ใช้ไปขายในตลาดได้') +
    UL(['<span class="wk-good">ค่าบวก</span> = ค่าสุ่มดี · <span class="wk-bad">ค่าติดลบ</span> = ค่าสุ่มไม่ดี (ประมาณ 3 ใน 10 บรรทัดออกติดลบ)', 'สุ่มได้จาก STR · AGI · VIT · INT · DEX · LUK · ATK · MATK · HIT · FLEE · DEF · CRIT · Max HP · Max SP · ASPD% · Cast Time', 'ยิ่งเลเวลอาวุธสูงและหายาก ค่าสุ่มยิ่งมาก และมีโอกาสได้ 2–3 ค่าบ่อยขึ้น',
      '<b>✦ ตรงสาย</b> = สเตตัสที่อาวุธประเภทนั้นใช้ได้ดี เช่น ดาบ/มีด/กระบอง → STR AGI DEX ATK CRIT ASPD · ไม้เท้า → INT DEX MATK Cast Time Max SP · ธนู → DEX AGI LUK ATK HIT CRIT', '<b>อุปกรณ์สวมใส่</b>: ค่าสุ่มเล็กกว่าอาวุธเล็กน้อย เน้นสายป้องกัน (DEF · FLEE · Max HP/SP · ฟื้น HP/SP%) แต่มี ATK/MATK/CRIT/ASPD ให้ลุ้นด้วย · ✦ ตรงสาย: หัว → INT DEX DEF Max SP · ชุด → VIT STR DEF Max HP · มือรอง → VIT DEF Max HP · ผ้าคลุม → AGI LUK FLEE CRIT · รองเท้า → AGI DEX FLEE ASPD · เครื่องประดับ → ทุกค่า', 'อุปกรณ์ที่มีอยู่ก่อนอัปเดตยังไม่มีค่าสุ่ม ใช้งานได้ปกติ · ชิ้นใหม่ที่ได้หลังอัปเดตจะสุ่มให้เอง', 'ค่าที่ไม่ตรงสายยังใช้ได้กับบิลด์แปลก ๆ หรืออาชีพอื่น ลองจัดสเตตัสให้เข้ากัน']) +
    table(['เกรดค่าสุ่ม', 'ความหมาย'], [['<b class="rgx g4">ยอดเยี่ยม</b>', 'หลายค่า ค่าสูง ตรงสาย — ของหายาก ราคาดี'], ['<b class="rgx g3">ดีมาก</b>', 'ค่าดีเกือบเต็ม'], ['<b class="rgx g2">ดี</b>', 'ค่าบวกพอใช้'], ['<b class="rgx g1">ธรรมดา</b>', 'บวกน้อยหรือหักลบกันพอดี'], ['<b class="rgx g0">แย่</b>', 'ติดลบรวม — ขาย NPC หรือเก็บไว้ตีบวกทดลอง']]) +
    P('ดูค่าสุ่มของชิ้นที่มีได้ในกระเป๋า (สีเขียว/แดง + เกรด) · ในตลาดฝากขายจะแสดงเกรดค่าสุ่มต่อท้ายชื่อด้วย · ดูช่วงค่าที่สุ่มได้ของอาวุธ/อุปกรณ์แต่ละชิ้นในแท็บ "อุปกรณ์"') },
  { id: 'spawn', title: '👾 การเกิดของมอนสเตอร์', sub: 'จำนวน · เวลาเกิดใหม่', html: () =>
    UL([`มอนปกติในทุกแผนที่เกิดมากขึ้น ×${SPAWN_MUL} และเกิดใหม่เร็วขึ้น (ใช้เวลาเหลือราว ${Math.round(RESPAWN_MUL * 100)}% ของเดิม)`, 'มอนแต่ละตัวเกิดใหม่สุ่มจุดในโซนของมัน · MVP สุ่มจุดเกิดทั่วแผนที่และเกิดตามเวลาเดิม', 'ดูเวลาเกิดใหม่ของมอนแต่ละตัวได้ในแท็บ "มอนสเตอร์"']) },
  { id: 'equipguide', title: '⚔ อุปกรณ์ & ระดับความหายาก', sub: 'เกรดสี · ช่องสวมใส่ · ค่าสุ่ม', html: () =>
    P(`อุปกรณ์มี 7 ช่อง: ${EQUIP_SLOTS.map((s) => s.name).join(' · ')} · แต่ละชิ้นมีเลเวลที่ต้องการและอาชีพที่ใช้ได้`) +
    table(['เกรด', 'สี'], Object.entries(RARITY).map(([k, r]) => [`<b style="color:${r.color}">${esc(r.name || k)}</b>`, `<span class="wk-sw" style="background:${r.color}"></span>`])) +
    UL(['อาวุธและอุปกรณ์สวมใส่ทุกชิ้นมี <b>ค่าสุ่ม</b> เพิ่ม 1–3 ค่า (เช่น STR +2, DEF +3) — ชิ้นเดียวกันอาจเก่งไม่เท่ากัน', 'บางชิ้นเป็นชุดเซ็ต สวมครบตามจำนวนได้โบนัสเพิ่ม', 'ยิ่งเกรดสูง โบนัสตีบวกยิ่งมาก', 'ดูรายชื่ออุปกรณ์ทั้งหมด ค่าสถานะ ดรอปจากไหน และโบนัส +1~+10 ได้ในแท็บ "อุปกรณ์"']) },
  { id: 'pets', title: '🐾 สัตว์เลี้ยง', sub: 'ช่วยเก็บของอัตโนมัติ', html: () =>
    P(`สัตว์เลี้ยง ${PET_ORDER.length} ตัว ซื้อได้ที่ <b>ร้านเพชร → สัตว์เลี้ยง</b> (เลือกตัวเองได้ ไม่ต้องสุ่ม) · เรียกออกมาแล้วจะวิ่งเก็บของที่ดรอปให้อัตโนมัติ · ไม่ต่อสู้ ไม่ตาย`) +
    table(['ระดับ', 'รัศมี', 'ความเร็ว', 'ขนต่อรอบ', 'ตัว'], Object.entries(TIER_STATS).map(([t, s]) => [`<b style="color:${PET_RARITY[t].color}">${PET_RARITY[t].name}</b>`, `${s.radius} ช่อง`, `${s.speed}%`, s.carry || 'ไม่จำกัด', PET_ORDER.filter((p) => PETS[p].tier === t).map((p) => link('pet', p, PETS[p].name)).join(', ')])) +
    UL([`ซื้อซ้ำตัวเดิมได้ดาว +1 (สูงสุด ★${STAR_MAX}) เก็บได้ไกลและเร็วขึ้น`, 'กด ' + K('P') + ' → ⚙ ตั้งค่าการเก็บของ: เลือกหมวดที่จะเก็บ และเลือกเกรดอุปกรณ์ขั้นต่ำ (ขาว → ขาวทอง)', 'แต่ละตัวมีความสามารถพิเศษไม่ซ้ำกัน']) },
  { id: 'auto', title: '🤖 ล่าอัตโนมัติ', sub: 'บอทในตัวเกม', html: () =>
    UL(['กด ' + K('Z') + ' เริ่ม/หยุด · ' + K('H') + ' ตั้งค่า', 'เลือกมอนที่จะล่า ระยะการล่า สกิลที่ใช้ และใช้ยาเมื่อ HP/SP ต่ำกว่ากี่ %', 'บอทจะหยุดเองเมื่อยาหมดหรือกระเป๋าเต็ม (VIP: ซื้อยาเติมให้อัตโนมัติ)', 'ใช้คู่กับสัตว์เลี้ยงเก็บของ จะเก็บเลเวลได้สบายมาก']) },
  { id: 'economy', title: '💰 Zeny · ร้านค้า · ตลาด · เทรด', sub: 'หาเงิน ซื้อขาย แลกของ', html: () =>
    UL([`ขายของให้ร้านค้า NPC ได้ ${Math.round(SELL_RATE * 100)}% ของราคา`, `คลังเก็บของ (NPC) เก็บได้ ${STORAGE_CAPACITY} ช่อง ใช้ร่วมได้`, '<b>ตลาด</b> (นายตลาดในเมือง): ฝากขายได้แม้ออฟไลน์ อยู่ 7 วัน มีคนซื้อเงินเข้าทันที · คนทั่วไปลงได้ 2 รายการ ค่าธรรมเนียม 7% · VIP 5 รายการ 3%', '<b>แลกเปลี่ยน</b>: คลิกผู้เล่น → แลกเปลี่ยน วางของ/Zeny แล้วทั้งคู่กดยืนยัน · ให้ของฝ่ายเดียวได้', 'ของจากร้านเพชรบางชิ้นซื้อขายในตลาดได้ — หาเพชรได้โดยไม่ต้องเติมเงิน', '<b>ตลาดแลกเพชร</b> (ปุ่ม "แลกเพชร" ด้านบน): ซื้อ/ขายเพชรกับผู้เล่นด้วย Zeny ได้ทุกที่ · ซื้อขายทันทีหรือตั้งราคารอ · มีกราฟราคาและความลึกตลาด · ค่าธรรมเนียมฝั่งละ 7% (VIP 3%)', 'Zeny หายาก: ขายของให้ NPC ได้น้อย — ของดีควรขายผ่านตลาดให้ผู้เล่น']) },
  { id: 'boss', title: '👹 บอสโลก & MVP', sub: 'เวลาเกิด · รางวัล', html: () =>
    `<h4>บอสโลก</h4>` + table(['บอส', 'เวลาเกิด (ไทย)', 'แผนที่', 'HP'], Object.values(WORLD_BOSSES).map((b) => [esc(b.name), `${b.hour}:00 น. (อยู่ 30 นาที)`, mapLink(b.map), fmt(b.hp)])) +
    UL(['ทุกคนที่ตีโดนได้รางวัลทางจดหมาย · ดาเมจอันดับ 1–3 ได้โบนัสเพิ่ม · มีโอกาส 15% ได้อาวุธพิเศษ', 'กดปุ่ม "บอส" ด้านบนเพื่อดูเวลาที่เหลือและรางวัล']) +
    `<h4>บอส MVP</h4>` + UL(['<b>MVP ร่วม:</b> ทุกคนในแผนที่เห็นและตี MVP ตัวเดียวกัน เลือดลดพร้อมกัน — ชวนเพื่อนมารุมได้', 'แต่ละแผนที่มี MVP ประจำ 1 ตัว สุ่มจุดเกิดทั่วแผนที่ · ยืนประจำจุดที่เกิด · เกิดใหม่ตามเวลา (ดูเวลาที่ปุ่ม "บอส")', 'ปราบแล้ว: ทุกคนที่ทำดาเมจ ≥1% ได้ EXP ตามสัดส่วนดาเมจ (ขั้นต่ำ 30% ของ EXP เต็ม) และสุ่มของดรอปของตัวเอง', 'ดาเมจ <b>อันดับ 1</b> = MVP ได้รางวัล MVP ประจำอาชีพ + โอกาสดรอปเต็ม · อันดับอื่นได้โอกาสดรอปครึ่งหนึ่ง', 'MVP ดรอปของดี การ์ด MVP และหินตีบวกบ่อยกว่ามอนปกติ']) },
  { id: 'dungeon', title: '🏰 ดันเจี้ยน & หอคอย', sub: 'เนื้อหาท้าทาย', html: () =>
    UL([`<b>${esc(CAVE.name)}</b> — ${CAVE.floors} ชั้น · เข้าได้วันละ ${CAVE.daily} รอบ · Lv.${CAVE.minLv}+ · มอนและบอสปรับเลเวลตามผู้เล่น ชั้นสุดท้ายมีหีบรางวัล`, `<b>${esc(TOWER.name)}</b> — Lv.${TOWER.minLv}+ ไต่ขึ้นไปเรื่อย ๆ ไม่มีที่สิ้นสุด · มีเวลาจำกัดต่อชั้น · จุดเซฟทุก ${TOWER.checkpoint} ชั้น · ทุก 5/10/25 ชั้นได้รางวัลพิเศษ`, 'เข้าได้จาก NPC ในเมือง']) },
  { id: 'social', title: '👥 ปาร์ตี้ · แชต · เพื่อน', sub: 'เล่นกับคนอื่น', html: () =>
    UL(['คลิกผู้เล่น → เชิญเข้าปาร์ตี้ (สูงสุด 6 คน) · สมาชิกแผนที่เดียวกันแบ่ง EXP และได้โบนัส +20% ต่อเพื่อน 1 คน', 'แชตมีช่อง ทั่วไป · โลก · ปาร์ตี้ · กิลด์ · กระซิบ', 'โทรโข่ง (ร้านเพชร) ประกาศถึงทุกคนทุกแผนที่', 'กดชื่อผู้เล่นในแชตเพื่อกระซิบหรือเพิ่มเพื่อน']) },
  { id: 'collect', title: '📚 สมุดสะสม · ความสำเร็จ · กิจกรรม', sub: 'รางวัลระยะยาว', html: () =>
    UL(['<b>สมุดมอนสเตอร์</b> (' + K('B') + '): ล่ามอนแต่ละชนิดครบจำนวนได้โบนัสถาวร', '<b>ความสำเร็จ</b>: ทำภารกิจต่าง ๆ ได้ฉายาและโบนัส', '<b>เช็กอินรายวัน</b>: เข้าเกมทุกวันรับของรางวัล 7 วันวนรอบ', '<b>เควสต์รายวัน/รายสัปดาห์</b>: รีเซ็ตทุกวัน/ทุกวันจันทร์', '<b>อีเวนต์</b>: บางช่วงมี EXP/ดรอปเพิ่ม ดูที่ปุ่ม "กิจกรรม"']) },
  { id: 'vip', title: '💎 VIP & ร้านเพชร', sub: 'สิทธิพิเศษ', html: () =>
    `<h4>สิทธิ์ VIP</h4>` + table(['', 'สิทธิ์', 'รายละเอียด'], VIP_PERKS.map(([i, t, d]) => [i, `<b>${esc(t)}</b>`, esc(d)])) +
    `<h4>ร้านเพชร</h4>` + UL(['แฟชั่นและออร่า (เปลี่ยนรูปลักษณ์ ไม่เพิ่มค่าสถานะ)', 'สัตว์เลี้ยงทุกตัว', 'หินกันแตก / หินนำโชค', 'ขยายกระเป๋า/คลัง · เปลี่ยนชื่อ · รีเซ็ตสเตตัส/สกิล · โทรโข่ง', 'ใบคูณ EXP / ดรอป / ใบโคลเวอร์']) + P('เกมนี้ออกแบบให้เล่นฟรีได้สบาย — ของทุกชิ้นที่มีผลต่อการเล่นหาได้จากในเกมด้วย') },
  { id: 'tips', title: '💡 เคล็ดลับ', sub: 'รู้ไว้เล่นง่ายขึ้น', html: () =>
    UL(['นั่งพักข้างกองไฟ HP/SP ฟื้นเร็วขึ้น', 'ลากสกิลและยาไปวางที่ปุ่มลัด F1–F9', 'หมดสติ: กลับไปฟื้นที่จุดเซฟ — ถ้ามี ' + itemLink('phoenix_feather') + ' ฟื้นตรงจุดเดิมได้', 'ของในกระเป๋าซ้อนได้ ช่องเต็มแล้วเก็บของไม่ได้ — ขยายกระเป๋าหรือฝากคลัง', 'กด ' + K('N') + ' ดูแผนที่โลก กดเลือกแผนที่ดูมอนและเลเวล', 'ใช้ช่องค้นหาด้านบนของวิกินี้หาข้อมูลได้ทุกอย่าง']) },
];
