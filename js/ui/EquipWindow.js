// v0.89 หน้าดูตัวละคร — ช่องอุปกรณ์ซ้าย/ขวา ตัวละครยืนอยู่ตรงกลาง (หมุนดูได้ 8 ทิศ) · ความทนทาน · ค่าสถานะรวม
import { ITEMS, RARITY, itemMods, describeBonus } from '../data/items.js?v=0.93.0-p2.11';
import { JOBS } from '../data/progression.js?v=0.93.0-p2.11';
import { SHEETS, liveSheet } from '../render/SheetChars.js?v=0.93.0-p2.11';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p2.11';
import { duraOf, DURA_MAX, DURA_LOW } from '../data/durability.js?v=0.93.0-p2.11';
import { duraBar } from './SmithWindow.js?v=0.93.0-p2.11';
import { VERSION } from '../config.js?v=0.93.0-p2.11';
import { recolorPixels } from '../data/outfits.js?v=0.93.0-p2.11';   // v0.91 สีชุด

const LEFT = [['head', 'หัว', '⛑'], ['weapon', 'อาวุธ', '⚔'], ['garment', 'ผ้าคลุม', '🧣'], ['accessory', 'เครื่องประดับ', '💍']];
const RIGHT = [['body', 'ชุด', '🛡'], ['shield', 'มือรอง', '◈'], ['shoes', 'รองเท้า', '👢']];
const SLOT_NAME = Object.fromEntries([...LEFT, ...RIGHT].map(([id, n]) => [id, n]));
const ROW = { n: 0, ne: 1, e: 2, se: 3, s: 4, sw: 5, w: 6, nw: 7 };
const TURN = ['s', 'sw', 'w', 'nw', 'n', 'ne', 'e', 'se'];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const imgCache = new Map();
function sheetImg(src) {
  let im = imgCache.get(src);
  if (!im) { im = new Image(); im.src = `${src}?v=${VERSION}`; imgCache.set(src, im); }
  return im;
}

export class EquipWindow {
  constructor(root, game) {
    this.g = game; this.sel = 'weapon'; this.dir = 0; this.frame = 0; this.timer = null;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm equipw'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'eqwTitle');
    el.innerHTML = `<header class="st-head"><div><h2 id="eqwTitle">อุปกรณ์ที่สวมใส่</h2><p class="eqw-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="eqw-main">
        <div class="eqw-col eqw-left"></div>
        <div class="eqw-stage">
          <div class="eqw-name"></div>
          <div class="eqw-pedestal"><canvas width="192" height="224" aria-label="ตัวละครของคุณ"></canvas></div>
          <div class="eqw-turn"><button type="button" data-turn="-1" aria-label="หมุนซ้าย">⟲</button><span>หมุนดู</span><button type="button" data-turn="1" aria-label="หมุนขวา">⟳</button></div>
          <div class="eqw-stats"></div>
        </div>
        <div class="eqw-col eqw-right"></div>
      </div>
      <div class="eqw-detail"></div>`;
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.querySelectorAll('[data-turn]').forEach((b) => b.addEventListener('click', () => { this.dir = (this.dir + +b.dataset.turn + 8) % 8; this.draw(); }));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    this.cv = el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
  }

  get open() { return !this.el.hidden; }
  toggle(force) {
    const on = typeof force === 'boolean' ? force : this.el.hidden;
    this.el.hidden = !on;
    clearInterval(this.timer); this.timer = null;
    if (on) { this.dir = 0; this.render(); this.timer = setInterval(() => { this.frame++; this.draw(); }, 1000 / 6); }
  }

  sheet() {
    const p = this.g.player, c = this.g.gfx && this.g.gfx.characters && this.g.gfx.characters.get(p);
    if (c && c.sheet && c.sheet.S) return c.sheet.S;
    const k = liveSheet(p.jobId); return k ? SHEETS[k] : null;
  }

  // วาดท่ายืนของตัวละครจากแผ่นสไปรต์จริง (รวมสกินอาวุธ/ชุดมังกรที่ใส่อยู่)
  draw() {
    const S = this.sheet(), ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    ctx.clearRect(0, 0, W, H);
    if (!S) return;
    const im = sheetImg(S.src); if (!im.complete || !im.naturalWidth) { im.onload = () => this.draw(); return; }
    const rows = S.rows || 8, cw = im.naturalWidth / S.cols, ch = im.naturalHeight / rows;
    const frames = S.anim.idle || [0], col = frames[this.frame % frames.length];
    const row = ROW[TURN[this.dir]] * (S.rowsPerDir || 1) + ((S.row && S.row.idle) || 0);
    // ขยายให้ตัวละคร (เท้าถึงหัว) สูงราว 82% ของกรอบ · ปัดทีละครึ่งเท่าให้พิกเซลคมพอ
    const foot = S.foot || 0.9, head = S.head != null ? S.head : 0.2, bodyH = ch * Math.max(0.3, foot - head);
    const k = Math.max(1, Math.floor(((H * 0.82) / bodyH) * 2) / 2);
    const dw = cw * k, dh = ch * k, dx = (W - dw) / 2, dy = H - 12 - dh * foot;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, col * cw, row * ch, cw, ch, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    const oc = this.g.player.look && this.g.player.look.oc;   // v0.91 ย้อมสีชุดเหมือนในฉาก
    if (oc && oc !== 'def' && !String(S.src).includes('_dragon')) { try { const d = ctx.getImageData(0, 0, W, H); recolorPixels(d.data, oc, S.base || liveSheet(this.g.player.jobId)); ctx.putImageData(d, 0, 0); } catch (e) { /* แคนวาสติดข้อจำกัด */ } }
  }

  slotCard(id, name, glyph) {
    const p = this.g.player, key = p.equip[id], it = key && ITEMS[key];
    const b = document.createElement('button'); b.type = 'button';
    const d = key ? duraOf(p, key) : DURA_MAX;
    b.className = 'eqw-slot' + (this.sel === id ? ' sel' : '') + (key ? '' : ' empty') + (key && d <= 0 ? ' broken' : key && d <= DURA_LOW ? ' low' : '');
    const rc = it ? (RARITY[it.rarity || 'common'] || RARITY.common).color : '';
    const m = key ? itemMods(key) : null;
    b.innerHTML = `<span class="eqw-ic">${key ? `<img alt="" src="${iconURL(key)}">` : `<i aria-hidden="true">${glyph}</i>`}${key && d <= 0 ? '<em class="eqw-broken">พัง</em>' : ''}</span>
      <span class="eqw-txt"><small>◈ ${name}</small><b style="${rc ? `color:${rc}` : ''}">${key ? esc(it.name) : 'ว่าง'}</b>${m && m.slots ? `<span class="eqw-cards">${Array.from({ length: m.slots }, (_, i) => `<i class="${m.cards[i] ? 'on' : ''}"></i>`).join('')}</span>` : ''}${key ? duraBar(d) : ''}</span>`;
    b.setAttribute('aria-label', `${name}: ${key ? it.name : 'ว่าง'}`);
    b.addEventListener('click', () => { this.sel = id; this.render(); });
    b.addEventListener('dblclick', () => { if (key) this.g.unequipSlot(id); });
    return b;
  }

  render() {
    if (!this.open) return;
    const g = this.g, p = g.player, J = JOBS[p.jobId] || JOBS.novice;
    this.el.querySelector('.eqw-sub').textContent = `${J.thai || J.name} · Base Lv.${p.baseLevel} · Job Lv.${p.jobLevel}`;
    this.el.querySelector('.eqw-name').innerHTML = `<b>${esc(p.name)}</b>${g.vipActive ? '<span class="eqw-vip">VIP</span>' : ''}`;
    const L = this.el.querySelector('.eqw-left'), R = this.el.querySelector('.eqw-right');
    L.replaceChildren(...LEFT.map(([id, n, gl]) => this.slotCard(id, n, gl)));
    R.replaceChildren(...RIGHT.map(([id, n, gl]) => this.slotCard(id, n, gl)));
    const st = p.stats || {}, f = (v) => (Array.isArray(v) ? `${Math.round(v[0])}~${Math.round(v[1])}` : Math.round(+v || 0).toLocaleString('en-US'));
    this.el.querySelector('.eqw-stats').innerHTML = [['ATK', st.atk], ['MATK', st.matk], ['DEF', st.def], ['MDEF', st.mdef], ['HIT', st.hit], ['FLEE', st.flee]]
      .map(([k, v]) => `<span><small>${k}</small><b>${f(v)}</b></span>`).join('') + `<span class="w2"><small>CRIT</small><b>${((st.crit || 0) * 100).toFixed(1)}%</b></span><span class="w2"><small>HP / SP</small><b>${f(p.maxHp)} / ${f(p.maxSp)}</b></span>`;
    this.renderDetail();
    this.draw();
  }

  renderDetail() {
    const g = this.g, p = g.player, id = this.sel, key = p.equip[id], box = this.el.querySelector('.eqw-detail');
    if (!key) {
      box.innerHTML = `<div class="eqw-d-ic empty"></div><div class="eqw-d-txt"><b>${SLOT_NAME[id]} · ยังไม่ได้สวมใส่</b><small>เลือกของจากกระเป๋าเพื่อสวมใส่</small></div><div class="eqw-d-act"></div>`;
    } else {
      const it = ITEMS[key], d = duraOf(p, key), rc = (RARITY[it.rarity || 'common'] || RARITY.common).color, m = itemMods(key);
      const cards = m.cards.map((c) => esc(ITEMS[c].name)).join(' · ');
      box.innerHTML = `<div class="eqw-d-ic"><img alt="" src="${iconURL(key)}"></div><div class="eqw-d-txt"><b style="color:${rc}">${esc(it.name)}</b>
        <small>${esc(describeBonus(it.bonus || {}) || '—')}</small>${cards ? `<small class="card-line">การ์ด: ${cards}</small>` : ''}
        <small class="${d <= 0 ? 'bad' : d <= DURA_LOW ? 'warn' : ''}">ความทนทาน ${Math.ceil(d)}/${DURA_MAX}${d <= 0 ? ' — พังแล้ว! ไม่ให้ค่าสถานะ ซ่อมที่ช่างตีเหล็ก' : d <= DURA_LOW ? ' — ใกล้พัง ควรซ่อม' : ''}</small></div><div class="eqw-d-act"></div>`;
    }
    const act = box.querySelector('.eqw-d-act');
    const btn = (t, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.className = cls; b.addEventListener('click', fn); act.append(b); return b; };
    btn('เลือกของ', () => { this.toggle(false); g.inv.tab = 'equip'; g.inv.toggle(true); g.inv.render(); }, 'primary');
    if (key) btn('ถอด', () => { g.unequipSlot(id); this.render(); });
    if (key && duraOf(p, key) < DURA_MAX && g.vipActive) btn('🔧 ซ่อม (VIP)', () => g.vipService('repair'));
  }
}
