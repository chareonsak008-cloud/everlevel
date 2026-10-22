// v0.89 ช่างตีเหล็ก — ซ่อมอุปกรณ์ (ความทนทาน) · ถอดการ์ดคืน (ค่าบริการแพงมาก)
// เปิดจาก NPC ช่างตีเหล็กในเมือง หรือหน้า VIP (ซ่อมได้ทุกที่ · ถอดการ์ดต้องมาที่ร้าน)
import { ITEMS, itemMods, EQUIP_SLOTS } from '../data/items.js?v=0.93.0-p1';
import { CARDS } from '../data/cards.js?v=0.93.0-p1';
import { duraOf, DURA_MAX, DURA_LOW, unsocketCost } from '../data/durability.js?v=0.93.0-p1';
import { iconURL } from '../render/ItemIcons.js?v=0.93.0-p1';
import { fmtZ } from '../data/shops.js?v=0.93.0-p1';

const slotName = (id) => (EQUIP_SLOTS.find((s) => s.id === id) || {}).name || id;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function duraBar(v) {
  const k = Math.max(0, Math.min(1, v / DURA_MAX)), cls = v <= 0 ? 'broken' : v <= DURA_LOW ? 'low' : '';
  return `<span class="dura ${cls}" title="ความทนทาน ${Math.ceil(v)}/${DURA_MAX}"><i style="width:${(k * 100).toFixed(1)}%"></i></span>`;
}

export class SmithWindow {
  constructor(root, game) {
    this.g = game; this.tab = 'repair'; this.vip = false; this.sure = null;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm smith'; el.hidden = true;
    el.setAttribute('aria-labelledby', 'smithTitle');
    el.innerHTML = `<header class="st-head"><div><h2 id="smithTitle">ช่างตีเหล็ก</h2><p class="sm-sub"></p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header>
      <div class="inv-tabs sm-tabs" role="tablist"><button type="button" data-t="repair" role="tab">🔧 ซ่อมอุปกรณ์</button><button type="button" data-t="cards" role="tab">🃏 ถอดการ์ด</button></div>
      <div class="sm-body"></div><footer class="sm-foot"><span>Zeny</span><b class="sm-zeny"></b></footer>`;
    el.querySelector('.st-close').addEventListener('click', () => this.close());
    el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; this.tab = b.dataset.t; this.sure = null; this.render(); }));
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
  }

  get open() { return !this.el.hidden; }
  show(tab = 'repair', vip = false) { this.tab = vip ? 'repair' : tab; this.vip = vip; this.sure = null; this.el.hidden = false; this.render(); }
  close() { if (this.el.hidden) return; this.el.hidden = true; if (!this.vip && this.g.endService) this.g.endService(); this.vip = false; }

  render() {
    if (!this.open) return;
    const g = this.g, p = g.player;
    this.el.querySelector('.sm-sub').textContent = this.vip ? '👑 สิทธิ์ VIP · ซ่อมได้ทุกที่ (ถอดการ์ดต้องมาที่ร้านช่างตีเหล็ก)' : 'ซ่อมของที่สึก/พัง · ถอดการ์ดออกจากอุปกรณ์';
    this.el.querySelectorAll('[data-t]').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.t === this.tab)); b.disabled = this.vip && b.dataset.t === 'cards'; });
    this.el.querySelector('.sm-zeny').textContent = fmtZ(p.zeny);
    const body = this.el.querySelector('.sm-body'); body.innerHTML = '';
    if (this.tab === 'repair') this.renderRepair(body); else this.renderCards(body);
  }

  renderRepair(body) {
    const g = this.g, p = g.player, list = g.repairList();
    const total = list.reduce((a, r) => a + r.cost, 0);
    const head = document.createElement('div'); head.className = 'sm-note';
    head.innerHTML = 'อาวุธสึกเมื่อโจมตี · ชุดเกราะสึกเมื่อถูกตี · หมดสติลดเพิ่ม 10% · <b>ความทนทาน 0 = พัง</b> ไม่ให้ค่าสถานะเหมือนไม่ได้สวม (อาวุธพัง = มือเปล่า)';
    body.append(head);
    if (!list.length) { body.insertAdjacentHTML('beforeend', '<p class="inv-empty">อุปกรณ์ทุกชิ้นสภาพดี ไม่ต้องซ่อม ✔</p>'); return; }
    const all = document.createElement('button'); all.type = 'button'; all.className = 'primary sm-all';
    all.innerHTML = `ซ่อมทั้งหมด ${list.length} ชิ้น · <b>${fmtZ(total)}</b>`;
    all.disabled = p.zeny < total;
    all.addEventListener('click', () => { g.repairItems(list); this.render(); });
    body.append(all);
    const ul = document.createElement('div'); ul.className = 'sm-list';
    for (const r of list) {
      const it = ITEMS[r.key], row = document.createElement('div'); row.className = 'sm-row' + (r.dura <= 0 ? ' broken' : '');
      row.innerHTML = `<img alt="" src="${iconURL(r.key)}"><span class="rn"><b>${esc(it.name)}</b><small>${r.where === 'equip' ? 'สวมอยู่ · ' + slotName(r.slot) : 'ในกระเป๋า'} · ${r.dura <= 0 ? '<em class="bad">พังแล้ว</em>' : `ความทนทาน ${Math.ceil(r.dura)}/${DURA_MAX}`}</small>${duraBar(r.dura)}</span>`;
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `ซ่อม<small>${fmtZ(r.cost)}</small>`;
      b.disabled = p.zeny < r.cost;
      b.addEventListener('click', () => { g.repairItems([r]); this.render(); });
      row.append(b); ul.append(row);
    }
    body.append(ul);
  }

  renderCards(body) {
    const g = this.g, p = g.player, rows = [];
    for (const [sl, key] of Object.entries(p.equip)) if (key && itemMods(key).cards.length) rows.push({ where: 'equip', slot: sl, key });
    for (const st of p.inventory.stacks) if (ITEMS[st.id] && ITEMS[st.id].type === 'equip' && itemMods(st.id).cards.length) rows.push({ where: 'bag', key: st.id });
    const head = document.createElement('div'); head.className = 'sm-note';
    head.innerHTML = 'การ์ดที่ถอดกลับเข้ากระเป๋า · อุปกรณ์ไม่เสีย ค่าตีบวกยังอยู่ · <b>ค่าถอด</b> การ์ดธรรมดา 500,000 · อีลิต 1,000,000 · MVP 1,500,000 Zeny';
    body.append(head);
    if (!rows.length) { body.insertAdjacentHTML('beforeend', '<p class="inv-empty">ไม่มีอุปกรณ์ที่ใส่การ์ดไว้</p>'); return; }
    const ul = document.createElement('div'); ul.className = 'sm-list';
    for (const r of rows) {
      const it = ITEMS[r.key], { cards } = itemMods(r.key);
      const row = document.createElement('div'); row.className = 'sm-row sm-card-row';
      row.innerHTML = `<img alt="" src="${iconURL(r.key)}"><span class="rn"><b>${esc(it.name)}</b><small>${r.where === 'equip' ? 'สวมอยู่ · ' + slotName(r.slot) : 'ในกระเป๋า'}</small></span>`;
      const cs = document.createElement('div'); cs.className = 'sm-cards';
      cards.forEach((c, i) => {
        const cost = unsocketCost(c), k = r.where + r.key + (r.slot || '') + ':' + i, sure = this.sure === k;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'sm-card' + (sure ? ' sure' : '');
        b.innerHTML = `<img alt="" src="${iconURL(c)}"><span><b>${esc(ITEMS[c].name)}</b><small>${sure ? 'กดอีกครั้งเพื่อยืนยัน' : 'ถอด · ' + fmtZ(cost)}</small></span>`;
        b.style.setProperty('--cc', (CARDS[c] && CARDS[c].color) || '#ccc');
        b.disabled = p.zeny < cost;
        b.addEventListener('click', () => {
          if (this.sure !== k) { this.sure = k; this.render(); return; }
          this.sure = null; g.unsocketCard({ ...r }, i); this.render();
        });
        cs.append(b);
      });
      row.append(cs); ul.append(row);
    }
    body.append(ul);
  }
}
