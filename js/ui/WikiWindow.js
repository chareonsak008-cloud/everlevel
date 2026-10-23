// v0.49 วิกิในเกม — คู่มือผู้เล่นใหม่ + ฐานข้อมูลทุกอย่างในเกม (สร้างจากข้อมูลเกมจริง อัปเดตตามเกมอัตโนมัติ)
// หมวด: คู่มือ · อุปกรณ์ · การ์ด · มอนสเตอร์ · แผนที่ · ไอเทม · สัตว์เลี้ยง · อาชีพ & สกิล
import { ITEMS, BASE_ITEMS, RARITY, EQUIP_SLOTS, describeBonus, weaponTypeName } from '../data/items.js?v=0.93.0-p1.8';
import { MONSTERS } from '../data/monsters.js?v=0.93.0-p1.8';
import { MAPS } from '../data/maps/index.js?v=0.93.0-p1.8';
import { CARDS, cardSlotName } from '../data/cards.js?v=0.93.0-p1.8';
import { CARD_SETS } from '../data/collection.js?v=0.93.0-p1.8';
import { JOBS, STAT_INFO, START_STAT_POINTS, MAX_STAT, MAX_BASE_LEVEL, JOB_CHANGE_JOB_LEVEL, JOB2_JOB_LEVEL, JOB3_JOB_LEVEL, JOB3_BASE_LEVEL, jobTier, STAT_RESET_FREE_LEVEL, baseExpToNext, statPointsForLevel, statCost } from '../data/progression.js?v=0.93.0-p1.8';
import { SKILLS, KIND_NAME, skillSp } from '../data/skills.js?v=0.93.0-p1.8';
import { REFINE_RATE, REFINE_MAX, SAFE_LIMIT, BREAK_FROM, LUCK_BONUS, LUCK_CAP, boostedRate, canRefine, refineBonus, refineFee } from '../data/refine.js?v=0.93.0-p1.8';
import { PETS, PET_ORDER, PET_RARITY, TIER_STATS, STAR_MAX, STAR_BONUS } from '../data/pets.js?v=0.93.0-p1.8';
import { CONSUMABLES, USE_CATS } from '../data/consumables.js?v=0.93.0-p1.8';
import { SHOPS, SELL_RATE, SELL_RATE_EQUIP, STORAGE_CAPACITY, sellPrice } from '../data/shops.js?v=0.93.0-p1.8';
import { WORLD_BOSSES } from '../data/events.js?v=0.93.0-p1.8';
import { CAVE, TOWER } from '../data/dungeons.js?v=0.93.0-p1.8';
import { RESPAWN_MUL, SPAWN_MUL } from '../systems/MonsterAI.js?v=0.93.0-p1.8';
import { rollFits } from '../data/affixes.js?v=0.93.0-p1.8';
import { statsToBonus } from '../data/affixes.js?v=0.93.0-p1.8';
import { VIP_PERKS } from './CashShop.js?v=0.93.0-p1.8';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1.8';
import { monsterThumb } from '../render/MonsterThumbs.js?v=0.93.0-p1.8';
import { petThumb } from '../render/PetThumbs.js?v=0.93.0-p1.8';
// v0.77 คู่มือระบบใหม่ (ภารกิจรายวัน · ดันเจี้ยนปาร์ตี้ · อันดับฤดูกาล · ฉายา · หลอมนิรันดร์กาล)
import { DAILY_TASKS, DAILY_COUNT, DAILY_REROLLS, DAILY_STREAK_BIG } from '../data/daily.js?v=0.93.0-p1.8';
import { PD, PD_SHOP, PD_REWARD_TEXT } from '../data/partyDungeon.js?v=0.93.0-p1.8';
import { SEASON_TITLES, SEASON_CAT_NAME, MAX_TITLES } from '../data/seasonTitles.js?v=0.93.0-p1.8';
import { ETERNAL_LINES, ETERNAL_SLOTS, ETERNAL_RECIPE, eternalId, LUCK_STEP, LUCK_MAX, SHARD_DROPS } from '../data/eternal.js?v=0.93.0-p1.8';
import { AR, AR_TIERS, AR_SHOP, AR_SEASON_REWARD } from '../data/arena.js?v=0.93.0-p1.8';   // v0.78
import { FESTIVALS, FEST_SHOP, FEST_AURA_COST } from '../data/festivals.js?v=0.93.0-p1.8';   // v0.79
import { COSTUME_BY_ID } from '../data/costumes.js?v=0.93.0-p1.8';

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
const mobList = () => Object.entries(MONSTERS).filter(([, m]) => !m.fest).sort((a, b) => a[1].level - b[1].level);
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
    if (s === 'job') return Object.entries(JOBS).map(([id, j]) => ({ id, name: `${j.thai} (${j.name})`, sub: j.tier === 3 ? `อาชีพคลาส 3 ต่อจาก${jobTh(j.parent)}` : j.parent ? `อาชีพขั้น 2 ต่อจาก${jobTh(j.parent)}` : id === 'novice' ? 'อาชีพเริ่มต้น' : 'อาชีพขั้น 1', color: j.color }));
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
    ['ราคาขายร้าน', fmt(sellPrice(id)) + ' z'],
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
  if (m.worldBoss) { /* บอสโลกเกิดตามเวลาในตารางด้านล่าง */ }
  else if (m.mvp) h += `<p class="wk-muted">เกิดใหม่ 2 ชั่วโมงหลังถูกปราบ (MVP สุ่มจุดเกิดทั่วแผนที่)</p>`;   // v0.85
  else if (m.respawn) h += `<p class="wk-muted">เกิดใหม่ทุก ${(Array.isArray(m.respawn) ? m.respawn : [m.respawn]).map((x) => Math.max(2, Math.round(x * (m.boss ? 1 : RESPAWN_MUL)))).join('–')} วินาที</p>`;
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
  else h += '<p class="wk-muted">เขตปลอดภัย ไม่มีมอนสเตอร์ · มี NPC ร้านค้า คลังเก็บของ ช่างตีเหล็ก (ตีบวก · ซ่อม · ถอดการ์ด) ตลาด และจุดวาร์ป</p>';
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
  else if (jobTier(id) === 2) h += `<p>ถึง <b>Base Lv.${JOB3_BASE_LEVEL}</b> + <b>Job Lv.${JOB3_JOB_LEVEL}</b> และผ่านเควสต์บททดสอบจาก <b>ออเรล</b> จะเลื่อนเป็นอาชีพคลาส 3 ได้: ${Object.entries(JOBS).filter(([, x]) => x.parent === id).map(([k, x]) => link('job', k, x.thai, x.color)).join(', ')}</p>`;   // v0.85
  else if (jobTier(id) === 3) h += `<p>อาชีพคลาส 3 ต่อจาก ${link('job', j.parent, JOBS[j.parent].thai, JOBS[j.parent].color)} · เงื่อนไข Base Lv.${JOB3_BASE_LEVEL} + Job Lv.${JOB3_JOB_LEVEL} ของ${JOBS[j.parent].thai} + เควสต์บททดสอบจากออเรล · เรียนสกิลของขั้น 1 และขั้น 2 ต่อได้ และได้โบนัสสเตตัสจากทุกขั้นที่ฝึกมา</p>`;
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
      [K('C'), 'สถานะ / อัปสเตตัส'], [K('I'), 'กระเป๋า'], [K('G') + ' / แตะเหรียญอาชีพ', 'ดูตัวละคร + อุปกรณ์ที่สวมใส่'], [K('K'), 'สกิล'], [K('O'), 'ตู้แฟชั่น'], [K('J'), 'เควสต์'], [K('P'), 'สัตว์เลี้ยง'],
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
  { id: 'jobs', title: '🧬 อาชีพ', sub: 'เปลี่ยนอาชีพขั้น 1 / 2 / คลาส 3', html: () =>
    P(`ทุกคนเริ่มเป็น <b>Novice</b> · Job Lv.${JOB_CHANGE_JOB_LEVEL} เปลี่ยนอาชีพขั้น 1 · Job Lv.${JOB2_JOB_LEVEL} + เควสต์เลื่อนขั้น เปลี่ยนอาชีพขั้น 2 (ได้โบนัสสเตตัสจาก Job Lv. ขั้น 1 ติดไปด้วย) · <b>Base Lv.${JOB3_BASE_LEVEL} + Job Lv.${JOB3_JOB_LEVEL}</b> ของขั้น 2 + เควสต์บททดสอบ เลื่อนเป็น <b>อาชีพคลาส 3</b> (Job Lv. สูงสุด 50 · สกิลใหม่ 5 อย่าง)`) +
    table(['อาชีพ', 'แนวทาง', 'ขั้น 2', 'คลาส 3'], Object.entries(JOBS).filter(([k, j]) => k !== 'novice' && !j.parent).map(([k, j]) => { const sub = Object.entries(JOBS).filter(([, x]) => x.parent === k); return [link('job', k, j.thai, j.color), esc(j.role || ''), sub.map(([kk, x]) => link('job', kk, x.thai, x.color)).join(', '), sub.flatMap(([kk]) => Object.entries(JOBS).filter(([, y]) => y.parent === kk)).map(([k3, y]) => link('job', k3, y.thai, y.color)).join(', ') || '-']; })) +
    P('ดูสกิลทั้งหมดของแต่ละอาชีพได้ที่แท็บ "อาชีพ & สกิล"') },
  { id: 'refine', title: '🔨 การตีบวก', sub: '+1 ถึง +10 · หินกันแตก · หินนำโชค', html: () =>
    P('ตีบวกได้ที่ <b>ช่างตีเหล็ก</b> (โรงตีเหล็กการ์ธในเมือง) · ใช้ <b>ผลึกตีบวกอาวุธ</b> สำหรับอาวุธ และ <b>ผลึกตีบวกเกราะ</b> สำหรับหมวก/ชุด/โล่/ผ้าคลุม/รองเท้า ครั้งละ 1 ก้อน + ค่าตี · เครื่องประดับตีไม่ได้') +
    table(['ขั้น', 'โอกาสสำเร็จ', 'ค่าตี', 'ถ้าล้มเหลว'], Array.from({ length: REFINE_MAX }, (_, i) => { const n = i + 1; return [`+${n}`, `${REFINE_RATE[n]}%${n > SAFE_LIMIT ? ` <small class="wk-good">(${boostedRate(REFINE_RATE[n], LUCK_BONUS)}% ด้วยหินนำโชค)</small>` : ''}`, fmt(refineFee(n)) + ' z', n <= SAFE_LIMIT ? 'ไม่เสียอะไร (สำเร็จแน่นอน)' : n >= BREAK_FROM ? '<span class="wk-bad">อุปกรณ์แตกหาย!</span>' : 'ระดับลดลง 1']; })) +
    `<h4>หินช่วยตีบวก</h4>` + UL([
      `${itemLink('refine_guard')} — ใช้ตอนตี +${BREAK_FROM} ขึ้นไป ถ้าล้มเหลวของ <b>ไม่แตก</b> (แต่ระดับยังลด 1)`,
      `${itemLink('refine_luck')} — ใช้ตอนตี +${SAFE_LIMIT + 1} ขึ้นไป โอกาสสำเร็จ <b>+${LUCK_BONUS}%</b> (รวมแล้วไม่เกิน ${LUCK_CAP}%)`,
      'ใช้ทั้งสองอย่างพร้อมกันได้ · หาได้จากร้านเพชร, ดรอปจากมอนทุกตัว (โอกาสต่ำมาก), MVP (2–3%), บอสโลก (หินนำโชคเฉพาะดาเมจอันดับ 1), ดันเจี้ยน และเควสต์',
      'สัตว์เลี้ยงกิเลน "เทียนหยุน" เพิ่มโอกาสตี +5 ขึ้นไปอีก 5%',
    ]) +
    `<h4>โบนัสจากการตีบวก</h4>` + UL(['อาวุธ: ATK เพิ่มทุกขั้น (ยิ่งหายากยิ่งเพิ่มมาก) และตั้งแต่ +8 ได้เพิ่มเป็นสองเท่าต่อขั้น · ไม้เท้าได้ MATK ด้วย', 'ชุดเกราะ: DEF +1 ต่อขั้น · ชุดตั้งแต่ +5 ได้ MDEF · ตั้งแต่ +8 ได้ Max HP เพิ่ม', 'ดูตารางโบนัส +1~+10 ของอุปกรณ์แต่ละชิ้นได้ในแท็บ "อุปกรณ์"']) +
    P('💡 เคล็ดลับ: ตี +1~+4 ได้ฟรีไม่มีความเสี่ยง · +5~+7 เตรียมผลึกสำรอง · +8 ขึ้นไปควรใช้คริสตัลพิทักษ์ทุกครั้ง') },
  { id: 'cards', title: '🃏 การ์ด', sub: 'ดรอป · ใส่การ์ด · ถอดการ์ด · ชุดสะสม', html: () =>
    P(`มอนสเตอร์ทุกชนิดมีการ์ดของตัวเอง (${Object.keys(CARDS).length} ใบ) · ดรอปยากมาก — มอนปกติประมาณ 0.2% · ตัวเก่ง 0.075% · MVP 1%`) +
    P('<b>ถอดการ์ด</b> (ช่างตีเหล็กในเมือง → ถอดการ์ด): การ์ดกลับเข้ากระเป๋า อุปกรณ์ไม่เสีย · ค่าบริการ การ์ดธรรมดา 500,000 · อีลิต 1,000,000 · MVP 1,500,000 Zeny') +
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
    UL([`มอนปกติในทุกแผนที่เกิดมากขึ้น ×${SPAWN_MUL} และเกิดใหม่เร็วขึ้น (ใช้เวลาเหลือราว ${Math.round(RESPAWN_MUL * 100)}% ของเดิม)`, 'มอนที่ตายมีโอกาส 70% เกิดใหม่ใกล้จุดที่คุณล่าอยู่ (เปิดออโต้ = ในวงออโต้ · ไม่เปิด = 12 ช่องรอบตัว) ถ้าอยู่ในโซนเกิดของมัน · ไม่เกิดชิดตัว (ห่าง ≥3 ช่อง)', 'MVP / บอส สุ่มจุดเกิดทั่วแผนที่และเกิดตามเวลา', 'ดูเวลาเกิดใหม่ของมอนแต่ละตัวได้ในแท็บ "มอนสเตอร์"']) },
  { id: 'equipguide', title: '⚔ อุปกรณ์ & ระดับความหายาก', sub: 'เกรดสี · ช่องสวมใส่ · ค่าสุ่ม', html: () =>
    P(`อุปกรณ์มี 7 ช่อง: ${EQUIP_SLOTS.map((s) => s.name).join(' · ')} · แต่ละชิ้นมีเลเวลที่ต้องการและอาชีพที่ใช้ได้`) +
    table(['เกรด', 'สี'], Object.entries(RARITY).map(([k, r]) => [`<b style="color:${r.color}">${esc(r.name || k)}</b>`, `<span class="wk-sw" style="background:${r.color}"></span>`])) +
    UL(['อาวุธและอุปกรณ์สวมใส่ทุกชิ้นมี <b>ค่าสุ่ม</b> เพิ่ม 1–3 ค่า (เช่น STR +2, DEF +3) — ชิ้นเดียวกันอาจเก่งไม่เท่ากัน', 'บางชิ้นเป็นชุดเซ็ต สวมครบตามจำนวนได้โบนัสเพิ่ม', 'ยิ่งเกรดสูง โบนัสตีบวกยิ่งมาก', 'ดูรายชื่ออุปกรณ์ทั้งหมด ค่าสถานะ ดรอปจากไหน และโบนัส +1~+10 ได้ในแท็บ "อุปกรณ์"']) },
  { id: 'outfitcolor', title: '🎨 สีชุด', sub: 'เลือกสีชุดให้ไม่ซ้ำใคร', html: () =>
    UL(['เลือกสีชุดได้ตอน <b>สร้างตัวละคร</b> และเปลี่ยนได้ <b>ฟรีไม่จำกัด</b> ที่ตู้แฟชั่น ' + K('O') + ' → แท็บ "สีชุด"', 'มี 12 แบบ: สีเดิม แดง ส้ม เหลืองทอง เขียว เขียวมรกต ฟ้า น้ำเงิน ม่วง ชมพู ดำ ขาว', 'ย้อมเฉพาะสีหลักของชุดตามอาชีพ — ผิว ผม และอาวุธคงเดิม · ผู้เล่นคนอื่นเห็นสีนี้ด้วย', 'ชุดเกราะมังกร (ร้านเพชร) ใช้สีของชุดเองเสมอ']) },
  { id: 'weather', title: '✨ หิ่งห้อยกลางคืน', sub: 'บรรยากาศตอนกลางคืน', html: () =>
    UL(['ตอนเย็นและกลางคืนมีหิ่งห้อยลอยในเมือง Asteria · Beginner Field · Whisper Forest · Haunted Forest (สีม่วง) · Crystal Valley (สีม่วงอ่อน)', 'ปิดได้ที่ตั้งค่า → กราฟิก → หิ่งห้อยกลางคืน']) },
  { id: 'report', title: '🐞 แจ้งปัญหาถึง GM', sub: 'บั๊ก · ข้อเสนอแนะ · ผู้เล่นโกง', html: () =>
    UL(['กดปุ่มรูปแมลงมุมล่างขวา หรือเมนู → <b>แจ้งปัญหา</b>', 'เลือกหมวด (บั๊ก · ความสมดุล · ข้อเสนอแนะ · แจ้งผู้เล่นโกง · อื่น ๆ) แล้วเขียนรายละเอียด — ยิ่งบอกว่า "ทำอะไรแล้วเกิดอะไร" ยิ่งแก้ได้เร็ว', 'เกมแนบเวอร์ชัน แผนที่ ตำแหน่ง อุปกรณ์ และ error ล่าสุดให้เอง (เอาติ๊กออกได้) · ห้ามใส่รหัสผ่านหรือข้อมูลส่วนตัว', 'ส่งได้ 3 เรื่องต่อ 10 นาที · ดูสถานะและคำตอบจาก GM ได้ที่แท็บ "เรื่องของฉัน"']) },
  { id: 'updates', title: '📢 ข่าวอัปเดต', sub: 'ดูว่ามีอะไรใหม่', html: () =>
    UL(['กดปุ่ม <b>อัปเดต</b> (รูปกระดิ่ง) บนแถบด้านบน หรือเมนู → ข่าวอัปเดต เพื่อดูรายการเปลี่ยนแปลงทุกเวอร์ชันพร้อมเวลาอัปเดต', 'ถ้าเปิดเกมค้างไว้แล้วมีเวอร์ชันใหม่ จะมีแถบแจ้งเตือนขึ้นด้านบน — กด <b>อัปเดตเลย</b> เกมจะเซฟให้ก่อนแล้วโหลดเวอร์ชันใหม่', 'บอส MVP และบอสโลกตัวใหญ่ขึ้น มีวงพลังใต้เท้า (วงหมุนเร็วและเต้นแรงเมื่อเลือดต่ำกว่า 30%) และวงเวทหมุนใต้ตัวตอนง้างท่าทุบ — เห็นแล้วรีบถอยออกจากวงแดง']) },
  { id: 'durability', title: '🔧 ความทนทาน & ซ่อมอุปกรณ์', sub: 'ของสึก · ของพัง · ช่างตีเหล็ก', html: () =>
    UL(['อุปกรณ์ทุกชิ้นมีความทนทาน 100 — <b>อาวุธ</b>สึกเมื่อโจมตี/ใช้สกิลโจมตี · <b>ชิ้นอื่น</b>สึกเมื่อถูกตี · หมดสติ ลดทุกชิ้นเพิ่ม 10', 'เหลือต่ำกว่า 20 ระบบเตือน · ถึง 0 = <b>พัง</b> ไม่ให้ค่าสถานะเลยเหมือนไม่ได้สวม (อาวุธพัง = ตีด้วยมือเปล่า ใช้สกิลที่ต้องใช้อาวุธไม่ได้)', 'ซ่อมที่ <b>การ์ธ ช่างตีเหล็ก</b> (เมือง Asteria ฝั่งบนซ้าย ใกล้ร้านของใช้ · บนแผนที่เป็นจุดสีเงิน) → ซ่อมอุปกรณ์ จ่าย Zeny ตามราคาของ × ส่วนที่เสีย (ของที่พังแล้วค่าซ่อม ×2) · ซ่อมทีละชิ้นหรือทั้งหมดได้', '👑 VIP ซ่อมได้ทุกที่จากหน้า VIP', 'ดูความทนทานได้ที่หน้าดูตัวละคร ' + K('G') + ' และรายละเอียดไอเทมในกระเป๋า · สนามประลอง (อารีน่า) ไม่ทำให้ของสึก']) },
  { id: 'pets', title: '🐾 สัตว์เลี้ยง', sub: 'ช่วยเก็บของอัตโนมัติ', html: () =>
    P(`สัตว์เลี้ยง ${PET_ORDER.length} ตัว ซื้อได้ที่ <b>ร้านเพชร → สัตว์เลี้ยง</b> (เลือกตัวเองได้ ไม่ต้องสุ่ม) · เรียกออกมาแล้วจะวิ่งเก็บของที่ดรอปให้อัตโนมัติ · ไม่ต่อสู้ ไม่ตาย`) +
    table(['ระดับ', 'รัศมี', 'ความเร็ว', 'ขนต่อรอบ', 'ตัว'], Object.entries(TIER_STATS).map(([t, s]) => [`<b style="color:${PET_RARITY[t].color}">${PET_RARITY[t].name}</b>`, `${s.radius} ช่อง`, `${s.speed}%`, s.carry || 'ไม่จำกัด', PET_ORDER.filter((p) => PETS[p].tier === t).map((p) => link('pet', p, PETS[p].name)).join(', ')])) +
    UL([`ซื้อซ้ำตัวเดิมได้ดาว +1 (สูงสุด ★${STAR_MAX}) เก็บได้ไกลและเร็วขึ้น`, 'กด ' + K('P') + ' → ⚙ ตั้งค่าการเก็บของ: เลือกหมวดที่จะเก็บ และเลือกเกรดอุปกรณ์ขั้นต่ำ (ขาว → ขาวทอง)', 'แต่ละตัวมีความสามารถพิเศษไม่ซ้ำกัน']) },
  { id: 'auto', title: '🤖 ล่าอัตโนมัติ', sub: 'บอทในตัวเกม', html: () =>
    UL(['กด ' + K('Z') + ' เริ่ม/หยุด · ' + K('H') + ' ตั้งค่า', 'เลือกมอนที่จะล่า ระยะการล่า สกิลที่ใช้ และใช้ยาเมื่อ HP/SP ต่ำกว่ากี่ %', 'บอทจะหยุดเองเมื่อยาหมดหรือกระเป๋าเต็ม (VIP: ซื้อยาเติมให้อัตโนมัติ)', 'ใช้คู่กับสัตว์เลี้ยงเก็บของ จะเก็บเลเวลได้สบายมาก']) },
  { id: 'economy', title: '💰 Zeny · ร้านค้า · ตลาด · เทรด', sub: 'หาเงิน ซื้อขาย แลกของ', html: () =>
    UL([`ขายของให้ร้านค้า NPC ได้ ${Math.round(SELL_RATE * 100)}% ของราคา (อุปกรณ์/อาวุธ ${Math.round(SELL_RATE_EQUIP * 100)}%)`, `คลังเก็บของ (NPC) เก็บได้ ${STORAGE_CAPACITY} ช่อง ใช้ร่วมได้`, '<b>ตลาด</b> (นายตลาดในเมือง): ฝากขายได้แม้ออฟไลน์ อยู่ 7 วัน มีคนซื้อเงินเข้าทันที · คนทั่วไปลงได้ 2 รายการ ค่าธรรมเนียม 7% · VIP 5 รายการ 3%', '<b>แลกเปลี่ยน</b> (เฉพาะ VIP กับ VIP): คลิกผู้เล่น → แลกเปลี่ยน วางของ/Zeny แล้วทั้งคู่กดยืนยัน · ให้ของฝ่ายเดียวได้ · ไม่มี VIP ใช้ตลาดฝากขายแทนได้', 'ของจากร้านเพชรบางชิ้นซื้อขายในตลาดได้ — หาเพชรได้โดยไม่ต้องเติมเงิน', '<b>ตลาดแลกเพชร</b> (ปุ่ม "แลกเพชร" ด้านบน): ซื้อ/ขายเพชรกับผู้เล่นด้วย Zeny ได้ทุกที่ · ซื้อขายทันทีหรือตั้งราคารอ · มีกราฟราคาและความลึกตลาด · ค่าธรรมเนียมฝั่งละ 7% (VIP 3%)', 'Zeny หายาก: ขายของให้ NPC ได้น้อย — ของดีควรขายผ่านตลาดให้ผู้เล่น']) },
  { id: 'boss', title: '👹 บอสโลก & MVP', sub: 'เวลาเกิด · รางวัล', html: () =>
    `<h4>บอสโลก</h4>` + table(['บอส', 'เวลาเกิด (ไทย)', 'แผนที่', 'HP'], Object.values(WORLD_BOSSES).map((b) => [esc(b.name), `${b.hour}:00 น. (อยู่ 30 นาที)`, mapLink(b.map), fmt(b.hp)])) +
    UL([`ทุกคนที่ตีโดนได้รางวัลทางจดหมาย · ดาเมจอันดับ 1–3 ได้โบนัสเพิ่ม (หินนำโชคเฉพาะอันดับ 1) · เลือดเยอะและตีแรงมาก ต้องรวมกลุ่มตี · มีโอกาส ${Math.round(((Object.values(WORLD_BOSSES)[0] || {}).reward?.chance?.p || 0) * 100)}% ได้อาวุธพิเศษ · เซิร์ฟเวอร์รับดาเมจไม่เกิน 15,000 ต่อครั้ง ต้องช่วยกันหลายคน`, 'กดปุ่ม "บอส" ด้านบนเพื่อดูเวลาที่เหลือและรางวัล']) +
    `<h4>บอส MVP</h4>` + UL(['<b>MVP ร่วม:</b> ทุกคนในแผนที่เห็นและตี MVP ตัวเดียวกัน เลือดลดพร้อมกัน — ชวนเพื่อนมารุมได้', 'แต่ละแผนที่มี MVP ประจำ 1 ตัว สุ่มจุดเกิดทั่วแผนที่ · ยืนประจำจุดที่เกิด · <b>เกิดใหม่ 2 ชั่วโมงหลังถูกปราบ</b> (ดูเวลาที่ปุ่ม "บอส")', '<b>MVP อึดและตีแรงมาก</b> — แนะนำให้ไปเป็นปาร์ตี้ พกยาและ ' + itemLink('phoenix_feather') + ' ไปด้วย', 'ปราบแล้ว: ทุกคนที่ทำดาเมจ ≥1% ได้ EXP ตามสัดส่วนดาเมจ (ขั้นต่ำ 30% ของ EXP เต็ม) และสุ่มของดรอปของตัวเอง', 'ดาเมจ <b>อันดับ 1</b> = MVP ลุ้นรางวัล MVP ประจำอาชีพ 25% + โอกาสดรอปเต็ม · อันดับอื่นได้โอกาสดรอปครึ่งหนึ่ง', 'MVP ดรอปของดีและหินตีบวกบ่อยกว่ามอนปกติ (หินนำโชค 2% · คริสตัลพิทักษ์ 3%)', '<b>การ์ด MVP</b> หายากมาก (0.02% ต่อการปราบ) ลุ้นได้เฉพาะคนที่ได้ MVP · ซื้อขายกันได้ในตลาด']) },
  { id: 'dungeon', title: '🏰 ดันเจี้ยน & หอคอย', sub: 'เนื้อหาท้าทาย', html: () =>
    UL([`<b>${esc(CAVE.name)}</b> — ${CAVE.floors} ชั้น · เข้าได้วันละ ${CAVE.daily} รอบ · Lv.${CAVE.minLv}+ · มอนและบอสปรับเลเวลตามผู้เล่น ชั้นสุดท้ายมีหีบรางวัล`, `<b>${esc(TOWER.name)}</b> — Lv.${TOWER.minLv}+ ไต่ขึ้นไปเรื่อย ๆ ไม่มีที่สิ้นสุด · มีเวลาจำกัดต่อชั้น (${Math.round(TOWER.time / 60)} นาที · ชั้นบอส ${Math.round(TOWER.bossTime / 60)} นาที) · จุดเซฟทุก ${TOWER.checkpoint} ชั้น · ทุก 5/10/25 ชั้นได้รางวัลพิเศษ`, '<b>ความยาก:</b> มอนในถ้ำและหอคอยเลือด ×5 ตีแรง ×2 · บอสท้ายชั้นอึดกว่ามอนธรรมดาหลายเท่า — อัปอุปกรณ์และพกยาให้พร้อม', 'เข้าได้จาก NPC ในเมือง']) },
  { id: 'daily', title: '📜 ภารกิจรายวัน', sub: 'ปุ่ม "ภารกิจ" แถบบน · รีเซ็ตทุกเที่ยงคืน', html: () =>
    `<h4>วิธีเล่น</h4>` + UL([`กดปุ่ม <b>ภารกิจ</b> (ม้วนคัมภีร์) ที่แถบไอคอนด้านบน · ได้ภารกิจวันละ <b>${DAILY_COUNT}</b> อย่าง สุ่มตามเลเวล (ข้อแรกเป็นงานล่ามอนเสมอ)`, 'ทำไปเรื่อย ๆ ความคืบหน้านับเอง · ทำเสร็จกด <b>รับรางวัล</b> ทีละข้อ · ตัวเลขแดงบนปุ่มบอกว่ามีรางวัลรอรับ', `ไม่ชอบภารกิจไหน กด <b>↻ เปลี่ยน</b> ได้วันละ ${DAILY_REROLLS} ครั้ง (เฉพาะข้อที่ยังไม่เสร็จ)`, 'รีเซ็ตเที่ยงคืนเวลาไทย (ใช้เวลาเซิร์ฟเวอร์ เลื่อนนาฬิกาเครื่องไม่ได้ผล)']) +
    `<h4>ภารกิจที่สุ่มได้</h4>` + table(['', 'ภารกิจ', 'เลเวล'], Object.values(DAILY_TASKS).map((t) => [t.icon, `<b>${esc(t.name)}</b>`, t.minLv ? `Lv.${t.minLv}+${t.online ? ' · ออนไลน์' : ''}` : 'ทุกเลเวล'])) +
    `<h4>รางวัล</h4>` + UL(['ต่อข้อ: EXP 3% ของหลอดเลเวล + Zeny', 'ทำครบทุกข้อ เปิด <b>กล่องรางวัล</b>: EXP 6% + Zeny + ผลึกตีบวกอาวุธ/เกราะ + ยา (Lv.60+ ได้นมผึ้งหลวง)', `ทำครบต่อเนื่องทุก ${DAILY_STREAK_BIG} วัน ได้ <b>กล่องใหญ่</b> เพิ่มคริสตัลพิทักษ์ · ขาดวันเดียวนับใหม่`]) },
  { id: 'partydg', title: `🌙 ดันเจี้ยนปาร์ตี้ · ${PD.name}`, sub: `เล่นร่วมกัน ${PD.minPlayers}–${PD.maxPlayers} คน · สัปดาห์ละ ${PD.weekly} รอบ`, html: () =>
    `<h4>วิธีเข้า</h4>` + UL(['ตั้งปาร์ตี้ (คลิกผู้เล่น → ชวนเข้าปาร์ตี้ หรือหน้าต่างผู้เล่นออนไลน์ 👥)', `ให้เพื่อนในปาร์ตี้อยู่แผนที่เดียวกันอย่างน้อย ${PD.minPlayers} คน · ทุกคน Base Lv.${PD.minLv}+`, '<b>หัวหน้าปาร์ตี้</b> คุยกับ <b>บรอม</b> ในเมือง → "ดันเจี้ยนปาร์ตี้ · วิหารผนึกจันทรา" → <b>เปิดวิหาร</b>', `เพื่อนจะเด้งคำเชิญ กด <b>เข้าร่วม</b> ภายใน ${PD.joinWindow} วินาทีหลังบอสตื่น (มีเวลาเตรียมตัว ${PD.prep} วินาที)`, 'หลุด/หมดสติ กลับเข้าได้ที่บรอม → "กลับเข้าวิหาร" ถ้ารอบยังไม่จบ']) +
    `<h4>การต่อสู้</h4>` + UL(['ทุกคนตีบอสตัวเดียวกัน เลือดบอสเก็บที่เซิร์ฟเวอร์ · เลือดเพิ่มตามจำนวนคน · เลเวลบอส = เลเวลหัวหน้า · <b>บอสอึดและตีแรงมาก</b> ต้องช่วยกันจริงจัง', '<b>วงม่วงกระจาย</b> (ทุก 10 วิ): เดินออกจากวงก่อนระเบิด', '<b>ตราแยก</b> (ตราม่วงบนหัวใครสักคน): คนนั้นต้องเดินออกห่าง คนอื่นอย่ายืนใกล้', '<b>ตราแบ่งรับ</b> (ตราทอง): ทุกคนเข้าไปยืนรวมกับคนที่โดน ดาเมจหารตามจำนวนคน — ยืนคนเดียวเจ็บมาก', `${Math.round(PD.enrage / 60)} นาทีขึ้นไปบอสคลั่ง · ครบ ${Math.round(PD.time / 60)} นาทีถือว่าล้มเหลว (ไม่เสียโควตา)`, 'สายฮีลช่วยได้มาก — ฮีล/บัฟถึงเพื่อนในปาร์ตี้']) +
    `<h4>รางวัล</h4>` + UL([`${esc(PD_REWARD_TEXT)} + EXP บอส · ส่งทางจดหมาย`, `ต้องมีผู้ทำดาเมจอย่างน้อย ${PD.minPlayers} คน · ได้รางวัลสัปดาห์ละ ${PD.weekly} รอบต่อบัญชี (รีเซ็ตวันจันทร์)`, 'เหรียญผนึกแลกเปลี่ยน/ลงตลาดไม่ได้']) +
    `<h4>ร้านแลกเหรียญผนึก (บรอม)</h4>` + table(['ของ', 'จำนวน', 'เหรียญ'], PD_SHOP.filter((x) => ITEMS[x.id]).map((x) => [itemLink(x.id), '×' + x.n, x.cost])) },
  { id: 'season', title: '🏆 อันดับประจำฤดูกาล', sub: 'ปุ่ม "อันดับ" · รีเซ็ตทุกเดือน', html: () =>
    UL(['กดปุ่ม <b>อันดับ</b> (ถ้วยรางวัล) แถบบน · มี 5 หมวด + หอเกียรติยศ', '<b>หอคอย</b>: ชั้นสูงสุดที่ผ่านในเดือนนี้ · <b>บอสโลก</b>: ดาเมจรวม · <b>MVP</b>: จำนวนครั้งที่ได้ดาเมจอันดับ 1 · <b>ดันปาร์ตี้</b>: จำนวนรอบที่ปราบสำเร็จ · <b>อารีน่า</b>: แต้มอันดับสูงสุดของเดือน', 'คะแนนบอสโลก/MVP/ดันปาร์ตี้/อารีน่า เซิร์ฟเวอร์นับเอง (ปลอมไม่ได้)', 'จบเดือน (เวลาไทย) อันดับ 1–10 ทุกหมวดได้รางวัลทางจดหมาย + ฉายาประจำฤดูกาล · อันดับ 1–3 ขึ้นหอเกียรติยศ']) +
    `<h4>รางวัลจบฤดูกาล (ทุกหมวด)</h4>` + table(['อันดับ', 'รางวัล'], [['1', 'กล่องแฟชั่นทอง · คริสตัลพิทักษ์ ×2 · นมผึ้งหลวง ×10 · 300,000 z'], ['2–3', 'กล่องแฟชั่นทอง · คริสตัลพิทักษ์ · 150,000 z'], ['4–10', 'กล่องแฟชั่นเงิน · หินนำโชค · 50,000 z']]) +
    `<h4>ฉายาประจำฤดูกาล</h4>` + table(['หมวด', 'อันดับ 1', 'อันดับ 2–3', 'อันดับ 4–10'], Object.entries(SEASON_CAT_NAME).map(([k, n]) => [esc(n), ...[1, 2, 3].map((b) => esc(SEASON_TITLES[`S_${k}_${b}`].title))])) +
    UL(['ถือฉายาไว้ใช้ตลอดเดือนถัดไป จนกว่าฤดูกาลใหม่จะจบ', 'ใส่ได้ที่ สมุดสะสม (' + K('B') + ') → ความสำเร็จ → ส่วน "ฉายาประจำฤดูกาล"']) },
  { id: 'titles', title: '🎖 ฉายาเหนือหัว', sub: `ใส่ได้ ${MAX_TITLES} อันพร้อมกัน`, html: () =>
    UL([`ได้ฉายาจาก <b>ความสำเร็จ</b> และ <b>อันดับฤดูกาล</b> · ใส่ได้สูงสุด <b>${MAX_TITLES} อัน</b> เรียงซ้อนเหนือหัวเป็นแนวตั้ง`, 'ตั้งค่าที่ สมุดสะสม (' + K('B') + ') → ความสำเร็จ: <b>ใส่ฉายา</b> · <b>ถอด</b> · <b>⇩ ชิดหัว</b> (ย้ายเป็นอันที่ 1 อยู่ใกล้หัวที่สุด)', 'ยิ่งหายาก เอฟเฟ็กยิ่งอลังการ: ธรรมดา → หายาก → ระดับตำนาน → ในตำนาน → เหนือตำนาน → <b>เทพนิรันดร์</b> (ปีก วงเวท มงกุฎ ดาวโคจร)', 'ผู้เล่นอื่นเห็นฉายาทุกอัน · ฉายาฤดูกาลแสดงเฉพาะคนที่ติดอันดับจริง']) },
  { id: 'eternal', title: '✦ หลอมอุปกรณ์นิรันดร์กาล', sub: 'เกรดสูงสุดของเกม · การ์ธ ช่างตีเหล็ก', html: () => {
    const W = ETERNAL_RECIPE.weapon, A = ETERNAL_RECIPE.armor, nm = (id) => (ITEMS[id] ? ITEMS[id].name : id);
    return UL(['<b>นิรันดร์กาล · รุ้งสุริยา</b> = เกรดสูงสุดในเกม (เหนือเทพสวรรค์) · <b>ได้จากการหลอมเท่านั้น</b>', 'ใส่ได้ Base Lv.145+ · ชุดละ 7 ชิ้นต่อสายอาชีพ (อาวุธ มือรอง หัว ชุด ผ้าคลุม รองเท้า แหวน) · อาชีพขั้น 2 ใช้ชุดสายตัวเองได้', 'ค่าพลังตายตัวสูงสุด (ไม่มีค่าสุ่ม) · ตีบวก/ใส่การ์ดได้ · โบนัสเซ็ต 2/4/6 ชิ้น', 'หลอมที่ <b>การ์ธ</b> (ช่างตีเหล็ก) → "✦ หลอมอุปกรณ์นิรันดร์กาล" · ซื้อขายในตลาดได้']) +
      `<h4>4 เซ็ตประจำสาย</h4>` + table(['สาย', 'เซ็ต', 'อาวุธ'], Object.entries(ETERNAL_LINES).map(([k, L]) => [`${L.icon} ${esc((JOBS[L.job] || {}).name || L.job)} / ${esc((JOBS[L.job2] || {}).name || L.job2)}`, `<b>${esc(L.name)}</b>`, itemLink(eternalId(k, 'weapon'))])) +
      `<h4>สูตรหลอม</h4>` + table(['', 'อาวุธ', 'เกราะ/มือรอง 1 ชิ้น'], [['ฐาน', 'อาวุธเทพสวรรค์ของสาย', 'อุปกรณ์เทพสวรรค์ช่องเดียวกัน'], ...W.mats.map(([id, n], i) => [itemLink(id), '×' + n, '×' + A.mats[i][1]]), ['Zeny', fmt(W.zeny), fmt(A.zeny)], ['<b>โอกาสสำเร็จ</b>', `<b>${Math.round(W.rate * 100)}%</b>`, `<b>${Math.round(A.rate * 100)}%</b>`]]) +
      UL([`ใช้ ${nm('refine_luck')} เพิ่มโอกาสได้ก้อนละ +${Math.round(LUCK_STEP * 100)}% (สูงสุด ${LUCK_MAX} ก้อน · รวมแล้วไม่เกิน 80%)`, '<b>ล้มเหลว</b> = เสียวัตถุดิบและ Zeny ทั้งหมด (อุปกรณ์ฐานยังอยู่) · <b>สำเร็จ</b> = ฐานถูกใช้ไป (ระดับตีบวก/การ์ดของฐานหาย · เลือกชิ้นที่ตีบวกน้อยสุดให้อัตโนมัติ)']) +
      `<h4>หา${esc(nm('eternal_shard'))}</h4>` + UL([`มอนปกติใน ${mapLink(SHARD_DROPS.mapMobs)} (หายากมาก)`, ...Object.entries(SHARD_DROPS.mvp).map(([m, p]) => `MVP ${MONSTERS[m] ? esc(MONSTERS[m].name) : m} ${Math.round(p * 100)}% (ดาเมจอันดับ 1 ได้โอกาสเต็ม)`), `ร้านเหรียญผนึก (บรอม) ${(PD_SHOP.find((x) => x.id === 'eternal_shard') || {}).cost || '-'} เหรียญ`]);
  } },
  { id: 'arena', title: `⚔ ${AR.name} (อารีน่า PvP)`, sub: 'ปุ่ม "อารีน่า" แถบบน · ดวล 1v1 · ทีม 3v3', html: () =>
    `<h4>วิธีเล่น</h4>` + UL([`กดปุ่ม <b>อารีน่า</b> (ดาบไขว้) ที่แถบบน → เลือก <b>${AR.modes['1v1'].name}</b> หรือ <b>${AR.modes['3v3'].name}</b> → <b>เข้าคิว</b> · ต้อง Base Lv.${AR.minLv}+ และเล่นออนไลน์`, 'ระบบจับคู่กับ<b>ผู้เล่นจริง</b>ที่แต้มอันดับใกล้กัน (รอนานจะขยายช่วงให้) · ระหว่างรอเดินเล่นหรือล่ามอนต่อได้ มีป้ายบอกเวลารอด้านบน', '3v3: ลงคนเดียวก็ได้ หรือลงพร้อมปาร์ตี้ (ไม่เกิน 3 คน) — เพื่อนจะเด้งคำชวนให้ลงคิวพร้อมกัน แล้วได้อยู่ทีมเดียวกัน', `เจอคู่แล้ววาร์ปเข้าสนามอัตโนมัติ · เตรียมตัว ${AR.prep} วินาทีแล้วเริ่ม · 1v1 ${AR.modes['1v1'].time / 60} นาที · 3v3 ${AR.modes['3v3'].time / 60} นาที`, 'หลุด/รีเฟรช: เปิดหน้าต่างอารีน่า → "กลับเข้าสนาม" ถ้ายังไม่จบ']) +
    `<h4>การต่อสู้</h4>` + UL(['<b>แตะตัวศัตรู</b>เพื่อเลือกเป้า แล้วโจมตี/ใช้สกิลตามปกติ (สกิลวงกว้างโดนศัตรูหลายคนได้)', `ทุกคนถูก<b>ปรับเป็น Lv.${AR.syncLv}</b> — สเตตัสขยายตามสัดส่วนที่ลงไว้ · อุปกรณ์ ตีบวก การ์ด ใช้ของจริง (ของดียังได้เปรียบ)`, `เลือดในสนาม ×${AR.hpMul} · ดาเมจใส่ผู้เล่นลดลง ให้สู้กันได้นานขึ้น · เลือดทุกคนเก็บที่เซิร์ฟเวอร์ (โกงไม่ได้)`, '<b>ห้าม</b>ใช้ไอเทม เปลี่ยนอุปกรณ์ หรือออโต้ · สกิลรักษาตัวเอง/ฮีลจากเพื่อนร่วมทีมใช้ได้ (มีเพดานต่อวินาที)', 'ล้มทีมศัตรูหมด = ชนะ · หมดเวลา = ทีมที่เลือดรวมเหลือมากกว่าชนะ · ถูกล้มในสนาม<b>ไม่เสีย EXP</b>', 'ออกกลางคัน / ไม่เข้าสนาม = แพ้']) +
    `<h4>แต้มอันดับ · ขั้น</h4>` + UL(['เริ่มฤดูกาลที่ 1,000 แต้ม · ชนะคนแต้มสูงกว่าได้มากกว่า (แบบ Elo) · แยกแต้ม 1v1 กับ 3v3', 'รีเซ็ตทุกต้นเดือน (เวลาไทย) พร้อมอันดับฤดูกาล', 'หมวด <b>อารีน่า</b> ในหน้าอันดับฤดูกาล ใช้แต้มสูงสุดของเดือน · อันดับ 1–10 ได้รางวัล + ฉายาประจำฤดูกาล']) +
      table(['ขั้น', 'แต้ม', 'รางวัลจบฤดูกาล (ต้องแข่ง 10 นัดขึ้นไป)'], AR_TIERS.map((t) => { const R = AR_SEASON_REWARD[t.id]; return [`<b style="color:${t.color}">${t.icon} ${esc(t.name)}</b>`, fmt(t.min) + '+', `${fmt(R.zeny)} z · ` + R.items.filter(([id]) => ITEMS[id]).map(([id, n]) => itemLink(id) + ' ×' + n).join(' · ')]; })) +
    `<h4>แต้มอารีน่า & ร้านแต้ม</h4>` + UL([`ชนะ +${AR.points.win} · แพ้ +${AR.points.loss} · เสมอ +${AR.points.draw} · ชนะครั้งแรกของวัน +${AR.points.firstWin} · ได้วันละไม่เกิน ${AR.dayCap} แต้ม`, 'แต้มอารีน่าไม่หายตอนขึ้นฤดูกาลใหม่ · แลกของที่แท็บ <b>ร้านแต้ม</b> ของส่งเข้าจดหมาย']) +
      table(['ของ', 'จำนวน', 'แต้ม', 'จำกัด/สัปดาห์'], AR_SHOP.filter((x) => ITEMS[x.id]).map((x) => [itemLink(x.id), '×' + x.n, fmt(x.cost), x.week || '-'])) },
  { id: 'festival', title: '🎉 อีเวนต์ตามเทศกาล', sub: 'ฮาโลวีน · ลอยกระทง · สงกรานต์ · ปีใหม่ · เปิดเองตามปฏิทิน', html: () =>
    UL(['เปิด/ปิด<b>อัตโนมัติ</b>ตามวันเทศกาล (เวลาไทยจากเซิร์ฟเวอร์) · กดปุ่ม <b>กิจกรรม</b> → <b>อีเวนต์เทศกาล</b> ดูเวลาที่เหลือ ของที่มี และปฏิทิน', 'ช่วงเทศกาล <b>ทุกแผนที่ล่า</b> (ไม่ใช่เมือง/ดันเจี้ยน) มีมอนเทศกาลเพิ่ม เลเวลปรับตามแผนที่ · EXP มากกว่ามอนปกติ', '<b>บอสเทศกาล</b> แผนที่ละ 1 ตัว เกิดใหม่ทุก 10–15 นาที ดรอปของสะสม 12–20 ชิ้น + ผลึกตีบวก', 'ย้ายแผนที่ (หรือเข้าใหม่) เพื่อให้มอนเทศกาลปรากฏหลังเทศกาลเริ่ม']) +
    table(['เทศกาล', 'ช่วงเวลา', 'มอน / บอส', 'ของสะสม', 'ออร่า (ถาวร)'], Object.values(FESTIVALS).map((F) => [`<b style="color:${F.color}">${F.icon} ${esc(F.name)}</b>`, esc(F.when), `${esc(MONSTERS[F.mob].name)} / ${esc(MONSTERS[F.boss].name)}`, itemLink(F.token), esc((COSTUME_BY_ID[F.aura] || {}).name || '')])) +
    `<h4>แลกของ</h4>` + UL([`<b>ออร่าเทศกาล</b> ใช้ของสะสม ${FEST_AURA_COST} ชิ้น · แลกได้เฉพาะช่วงเทศกาล (+3 วันหลังจบ) · ได้แล้วเป็นของเราถาวร ปีหน้ากลับมาอีก`, 'ของสะสมแลกของด้านล่างได้ทุกเมื่อ แม้เทศกาลจบแล้ว · แลกเปลี่ยน/ลงตลาดไม่ได้']) +
      table(['ของ', 'จำนวน', 'ของสะสม'], FEST_SHOP.filter((x) => ITEMS[x.id]).map((x) => [itemLink(x.id), '×' + x.n, x.cost])) },
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
