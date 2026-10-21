// v0.79 หน้าต่างอีเวนต์เทศกาล — เทศกาลที่เปิดอยู่ · มอน/บอสเทศกาล · แลกออร่าและของ · ปฏิทินเทศกาลถัดไป
import { ITEMS } from '../data/items.js?v=0.81.0';
import { MONSTERS } from '../data/monsters.js?v=0.81.0';
import { COSTUME_BY_ID } from '../data/costumes.js?v=0.81.0';
import { iconURL } from '../render/ItemIcons.js?v=0.81.0';
import { requestThumb } from '../render/CostumeThumbs.js?v=0.81.0';
import { FEST_SHOP, FEST_AURA_COST, FEST_GRACE } from '../data/festivals.js?v=0.81.0';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.floor(+n || 0).toLocaleString('en-US');
const left = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d} วัน ${h} ชม.` : `${h} ชม. ${m} นาที`; };
const day = (ms) => new Date(ms).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' });

export class FestivalWindow {
  constructor(root, game) {
    this.g = game; this.sel = null;
    const el = this.el = document.createElement('section');
    el.className = 'panel tm festw'; el.hidden = true; el.setAttribute('aria-label', 'อีเวนต์เทศกาล');
    el.innerHTML = `<header class="st-head"><div><h2>🎉 อีเวนต์เทศกาล</h2><p class="fw-sub">เปิดเองตามปฏิทินเทศกาล (เวลาไทย)</p></div><button type="button" class="st-close" aria-label="ปิด">✕</button></header><div class="tm-body fw-body"></div>`;
    for (const ev of ['pointerdown', 'wheel', 'contextmenu', 'touchstart']) el.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    (root.querySelector('.hud') || root).append(el);
    el.querySelector('.st-close').addEventListener('click', () => this.toggle(false));
    el.addEventListener('click', (e) => {
      const F = this.g.festival; if (!F) return;
      const s = e.target.closest('[data-fsel]'); if (s) { this.sel = s.dataset.fsel; this.render(); return; }
      const a = e.target.closest('[data-aura]'); if (a) { F.buyAura(a.dataset.aura); return; }
      const x = e.target.closest('[data-ex]'); if (x) F.exchange(x.dataset.tok, x.dataset.ex);
    });
    this.body = el.querySelector('.fw-body');
  }

  get open() { return !this.el.hidden; }
  toggle(on = !this.open) { this.el.hidden = !on; if (on) this.render(); }

  render() {
    if (!this.open) return;
    const F = this.g.festival, pl = this.g.player, now = F.now();
    const open = F.shopOpen(), act = F.active();
    // ของสะสมที่มีในกระเป๋า (ใช้แลกของได้ทุกเมื่อ แม้เทศกาลจบแล้ว)
    const toks = Object.keys(ITEMS).filter((id) => ITEMS[id].fest && F.count(id) > 0);
    const list = [...open];
    if (!this.sel || !list.some((f) => f.id === this.sel)) this.sel = (list[0] && list[0].id) || null;
    const tabs = list.length > 1 ? `<nav class="fw-tabs inv-tabs">${list.map((f) => `<button type="button" data-fsel="${f.id}" aria-selected="${f.id === this.sel}">${f.icon} ${esc(f.name)}</button>`).join('')}</nav>` : '';
    const cur = list.find((f) => f.id === this.sel);
    let main = '';
    if (cur) {
      const on = act.some((f) => f.id === cur.id), aura = COSTUME_BY_ID[cur.aura], owned = pl.fashion.owned.has(cur.aura), have = F.count(cur.token);
      const mob = MONSTERS[cur.mob], boss = MONSTERS[cur.boss];
      main = `<section class="fw-cur" style="--fc:${cur.color}">
        <header><b>${cur.icon} ${esc(cur.name)}</b><span>${on ? `เหลือเวลา ${left(cur.end - now)}` : `เทศกาลจบแล้ว · แลกออร่าได้อีก ${left(cur.end + FEST_GRACE - now)}`}</span></header>
        <p class="fw-desc">${esc(cur.desc)}</p>
        <div class="fw-row"><div class="fw-mobs"><p>🗺 ทุกแผนที่ล่า (ปรับเลเวลตามแผนที่)</p><p>• <b>${esc(mob.name)}</b> — ดรอป ${esc(ITEMS[cur.token].name)}</p><p>• บอส <b>${esc(boss.name)}</b> แผนที่ละ 1 ตัว (เกิดใหม่ 10–15 นาที) — ดรอป ${esc(ITEMS[cur.token].name)} 12–20 ชิ้น</p></div>
        <div class="fw-tok"><img alt="" src="${iconURL(cur.token)}"><b>${fmt(have)}</b><small>${esc(ITEMS[cur.token].name)}</small></div></div>
        <div class="fw-aura"><img class="fw-thumb" alt="" data-thumb="${cur.aura}"><div><b class="r-legend">${esc(aura.name)}</b><small>ออร่าเทศกาล · ได้ถาวร · หาได้เฉพาะช่วงเทศกาล</small><p>${esc(aura.desc)}</p></div>
          ${owned ? '<span class="fw-own">✔ มีแล้ว</span>' : `<button type="button" class="dq-btn gold" data-aura="${cur.id}" ${have >= FEST_AURA_COST ? '' : 'disabled'}>แลก ${FEST_AURA_COST}</button>`}</div>
      </section>`;
    } else {
      main = `<p class="sn-note">ตอนนี้ยังไม่มีเทศกาล — ดูปฏิทินด้านล่าง ระหว่างนี้ของสะสมที่เหลือยังแลกของได้</p>`;
    }
    // แลกของทั่วไป: ใช้ของสะสมชนิดไหนก็ได้ที่มี
    const payTok = cur ? cur.token : toks[0];
    const shop = payTok ? `<h3>แลกของด้วย${esc(ITEMS[payTok].name)} <small>(มี ${fmt(F.count(payTok))})</small></h3><ul class="fw-shop">${FEST_SHOP.filter((x) => ITEMS[x.id]).map((x) => `<li><img alt="" src="${iconURL(x.id)}"><span>${esc(ITEMS[x.id].name)} ×${x.n}</span><b>${x.cost}</b><button type="button" class="dq-btn" data-tok="${payTok}" data-ex="${x.id}" ${F.count(payTok) >= x.cost ? '' : 'disabled'}>แลก</button></li>`).join('')}</ul>` : '';
    const others = toks.filter((t) => t !== payTok);
    const otherTok = others.length ? `<p class="sn-note">ยังมีของสะสมเทศกาลอื่น: ${others.map((t) => `<img class="fw-mini" alt="" src="${iconURL(t)}">${esc(ITEMS[t].name)} ×${fmt(F.count(t))}`).join(' · ')} — จะแลกได้ตอนเลือกเทศกาลนั้น หรือเมื่อไม่มีเทศกาล</p>` : '';
    const cal = F.upcoming().map((f) => `<li style="--fc:${f.color}"><span>${f.icon} <b>${esc(f.name)}</b></span><small>${f.start <= now ? 'กำลังจัด · จบ ' + day(f.end - 1) : day(f.start) + ' – ' + day(f.end - 1)}</small></li>`).join('');
    this.body.innerHTML = `${tabs}${main}${shop}${otherTok}<h3>ปฏิทินเทศกาล</h3><ul class="fw-cal">${cal}</ul>`;
    for (const img of this.body.querySelectorAll('[data-thumb]')) { const it = COSTUME_BY_ID[img.dataset.thumb]; if (it) requestThumb(it, img, 96); }
  }
}
