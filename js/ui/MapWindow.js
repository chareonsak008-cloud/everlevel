// v0.27: หน้าต่างแผนที่ (N) — แท็บ "แผนที่นี้" (ผังเมือง/ทุ่ง + ป้ายชื่อ NPC/ทางออก) และ "แผนที่โลก" (ภูมิภาค · เลเวล · มอนสเตอร์)
import { TILE } from '../config.js?v=0.88.0';
import { TILE_INFO } from '../data/tileTypes.js?v=0.88.0';
import { MAPS } from '../data/maps/index.js?v=0.88.0';
import { MONSTERS } from '../data/monsters.js?v=0.88.0';
import { GameMap } from '../world/GameMap.js?v=0.88.0';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SVC = { shop: ['#ff9a3a', 'ร้านค้า'], storage: ['#5ae0a8', 'คลัง'], warp: ['#7fe0ff', 'วาร์ป'], job: ['#d49bff', 'เปลี่ยนอาชีพ'] };
const svcColor = (n) => (SVC[n.service?.type] || ['#ffd34d'])[0];

// ตำแหน่งภูมิภาคบนแผนที่โลก (พิกัดผืนผ้าใบ 680×500) — เรียงตามเส้นทางประตูมิติจริง
const WORLD = {
  asteria_town: { x: 120, y: 330, land: '#86b85e', icon: 'town' },
  beginner_field: { x: 245, y: 345, land: '#9ccc62' },
  whisper_forest: { x: 365, y: 318, land: '#3f7a3a' },
  frostveil: { x: 372, y: 160, land: '#e6eef6' },
  ember_caldera: { x: 520, y: 150, land: '#6a3f36' },
  ancient_ruins: { x: 590, y: 280, land: '#cbb98a' },
  haunted_forest: { x: 560, y: 420, land: '#4f4866' },
  // v0.46 หมู่เกาะเหนือขีดจำกัด (ทะเลตะวันออก)
  sunken_coast: { x: 785, y: 425, land: '#dccb9a' },
  crystal_valley: { x: 880, y: 270, land: '#8a7ab8' },
  sky_citadel: { x: 790, y: 105, land: '#eef6ff', sky: true },
};
const WW = 980, WH = 500;   // v0.46 ขยายผืนผ้าใบให้มีที่สำหรับหมู่เกาะ
const SEA_LINKS = [['haunted_forest', 'sunken_coast']];   // เส้นทางเรือ/วาร์ป (ไม่มีประตูมิติตรง)

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ข้อมูลสรุปภูมิภาค (เลเวล/มอนสเตอร์/MVP/ทางเชื่อม)
export function regionInfo(id) {
  const def = MAPS[id]; if (!def) return null;
  const mobs = (def.spawns || []).map((s) => ({ id: s.mob, count: s.count, areas: s.areas, m: MONSTERS[s.mob] })).filter((x) => x.m);
  const normal = mobs.filter((x) => !x.m.mvp), boss = mobs.filter((x) => x.m.mvp);
  const lv = normal.map((x) => x.m.level);
  const links = [...new Set((def.portals || []).map((p) => p.to))].filter((t) => MAPS[t]);
  return { id, def, mobs, normal, boss, links, min: lv.length ? Math.min(...lv) : 0, max: lv.length ? Math.max(...lv) : 0 };
}

export class MapWindow {
  constructor(root, game) {
    this.g = game;
    this.el = root.querySelector('#mapWin');
    this.$ = (s) => this.el.querySelector(s);
    this.open = false; this.tab = 'local'; this.sel = null; this.selMob = null;
    this.cache = new Map();
    this.cv = this.$('#mwCanvas'); this.ctx = this.cv.getContext('2d');
    this.wcv = this.$('#wmCanvas'); this.wctx = this.wcv.getContext('2d');
    this.wcv.width = WW; this.wcv.height = WH;
    for (const b of this.el.querySelectorAll('[data-tab]')) b.addEventListener('click', () => this.show(b.dataset.tab));
    this.$('#mapClose').addEventListener('click', () => this.toggle(false));
    this.wcv.addEventListener('click', (e) => {
      const r = this.wcv.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * WW, y = ((e.clientY - r.top) / r.height) * WH;
      let best = null, bd = 46;
      for (const [id, p] of Object.entries(WORLD)) { if (!MAPS[id]) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = id; } }
      if (best) { this.sel = best; this.selMob = null; this.renderInfo(); this.drawWorld(); }
    });
    this.$('#wmInfo').addEventListener('click', (e) => {
      const m = e.target.closest('[data-mob]'); if (m) { this.selMob = this.selMob === m.dataset.mob ? null : m.dataset.mob; this.renderInfo(); }
      const l = e.target.closest('[data-region]'); if (l) { this.sel = l.dataset.region; this.selMob = null; this.renderInfo(); this.drawWorld(); }
    });
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
  }

  toggle(force, tab) {
    this.open = typeof force === 'boolean' ? force : !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.show(tab || this.tab);
  }

  show(tab) {
    this.tab = tab;
    for (const b of this.el.querySelectorAll('[data-tab]')) { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
    this.$('#mwLocal').hidden = tab !== 'local';
    this.$('#mwWorld').hidden = tab !== 'world';
    if (tab === 'world') { this.sel = this.sel && MAPS[this.sel] ? this.sel : this.g.map.id; this.renderInfo(); this.drawWorld(); }
    else this.drawLocal();
  }

  // เรียกจากลูปเกม ~5 ครั้ง/วินาที
  update() { if (!this.open) return; if (this.tab === 'local') this.drawLocal(); else this.drawWorld(); }

  /* ---------- แผนที่นี้ ---------- */
  base(map, npcs) {
    const key = map.id + ':' + map.w;
    if (this.cache.has(key)) return this.cache.get(key);
    const S = Math.max(6, Math.min(12, Math.floor(860 / map.w)));
    const c = document.createElement('canvas'); c.width = map.w * S; c.height = map.h * S;
    const g = c.getContext('2d'); const r = rng(map.w * 131 + map.h);
    const mini = (map.def.theme || {}).mini || {};
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const ti = TILE_INFO[map.ground[map.idx(x, y)]], col = mini[ti.key] || ti.mini;
      g.fillStyle = col; g.fillRect(x * S, y * S, S, S);
      g.fillStyle = shade(col, r() < 0.5 ? -0.06 : 0.06); g.fillRect(x * S + ((r() * S) | 0), y * S + ((r() * S) | 0), 2, 2);
      if (ti.key === 'plaza' || ti.key === 'path') { g.fillStyle = shade(col, -0.12); g.fillRect(x * S, y * S + S - 1, S, 1); g.fillRect(x * S + S - 1, y * S, 1, S); }
      if (ti.key === 'wall') { g.fillStyle = shade(col, -0.3); g.fillRect(x * S, y * S + S - 2, S, 2); }
    }
    const circ = (cx, cy, rr, fill, stroke) => { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); } };
    for (const o of map.objects) {
      const x = o.def.x * S, y = o.def.y * S, w = o.fw * S, h = o.fh * S, cx = x + w / 2, cy = y + h / 2;
      switch (o.kind) {
        case 'house': {
          const roof = o.def.roof || '#b5473a';
          g.fillStyle = '#0006'; g.fillRect(x + 2, y + 3, w, h);
          g.fillStyle = o.def.wall || '#ecdcb8'; g.fillRect(x, y + h * 0.55, w, h * 0.45);
          g.fillStyle = roof; g.fillRect(x, y, w, h * 0.62);
          g.fillStyle = shade(roof, 0.18); g.fillRect(x, y, w, h * 0.12);
          g.fillStyle = shade(roof, -0.3); g.fillRect(x, y + h * 0.58, w, 2); g.fillRect(x + w / 2 - 1, y, 2, h * 0.6);
          g.fillStyle = '#5a3a24'; g.fillRect(cx - S * 0.3, y + h - S * 0.7, S * 0.6, S * 0.7);
          break;
        }
        case 'tower': circ(cx + 1, cy + 2, w * 0.5, '#0005'); circ(cx, cy, w * 0.48, '#cfc6b2', '#6a6470'); circ(cx, cy, w * 0.26, o.def.roof || '#3f6fb5'); break;
        case 'fountain': circ(cx, cy, Math.min(w, h) * 0.55, '#cfd6dc', '#8a9098'); circ(cx, cy, Math.min(w, h) * 0.4, '#6ab8f0'); circ(cx, cy, S * 0.3, '#e8f6ff'); break;
        case 'tree': case 'pine': circ(cx + 1, cy + 2, S * 0.62, '#0004'); circ(cx, cy, S * 0.6, o.kind === 'pine' ? '#2a5e3a' : '#357a3a', '#1e4a26'); circ(cx - S * 0.18, cy - S * 0.18, S * 0.22, o.kind === 'pine' ? '#3a7a4a' : '#4a9a48'); break;
        case 'bigshroom': circ(cx, cy, S * 0.5, o.def.color || '#c86aff', '#0006'); break;
        case 'bush': circ(cx, cy, S * 0.42, '#4a8a3c'); break;
        case 'stall': g.fillStyle = o.def.color || '#d0904a'; g.fillRect(x, y, w, h * 0.7); g.fillStyle = '#fff8'; for (let i = 0; i < w; i += S) g.fillRect(x + i, y, S / 2, h * 0.7); break;
        case 'lamp': circ(cx, cy, S * 0.22, '#ffe08a', '#7a5a20'); break;
        case 'warpstone': g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = '#7fe0ff'; g.fillRect(-S * 0.32, -S * 0.32, S * 0.64, S * 0.64); g.restore(); break;
        case 'well': circ(cx, cy, S * 0.55, '#9a958a', '#5a564e'); circ(cx, cy, S * 0.3, '#3a5a8a'); break;
        case 'boulder': case 'pillar': case 'obsidian': case 'icecrystal': circ(cx, cy, Math.min(w, h) * 0.45, o.kind === 'icecrystal' ? '#bff4ff' : o.kind === 'obsidian' ? '#2a2030' : '#9a948a', '#0005'); break;
        case 'tent': g.fillStyle = o.def.color || '#c8643a'; g.beginPath(); g.moveTo(cx, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fill(); break;
        case 'bench': case 'fence': case 'crate': case 'barrel': case 'chest': g.fillStyle = '#8a5a32'; g.fillRect(x + 1, y + h * 0.3, w - 2, h * 0.4); break;
        default: break;
      }
    }
    const out = { c, S };
    this.cache.set(key, out);
    return out;
  }

  drawLocal() {
    const map = this.g.map, npcs = this.g.npcs || [], pl = this.g.player; if (!map) return;
    const { c, S } = this.base(map, npcs);
    const cv = this.cv, g = this.ctx;
    if (cv.width !== c.width || cv.height !== c.height) { cv.width = c.width; cv.height = c.height; }
    g.drawImage(c, 0, 0);
    const placed = [];
    const label = (text, x, y, col = '#f5ecd2', bg = 'rgba(7,13,34,.78)', size = 12, bold = false) => {
      g.font = `${bold ? 700 : 500} ${size}px Mitr, Kanit, sans-serif`;
      const w = g.measureText(text).width + 10, hh = size + 8;
      // กันป้ายทับกัน: เลื่อนขึ้น/ลงสลับจนกว่าจะว่าง
      for (let k = 0, y0 = y; k < 8; k++) {
        if (!placed.some((r) => Math.abs(r.x - x) < (r.w + w) / 2 && Math.abs(r.y - y) < hh)) break;
        y = y0 + (k % 2 ? 1 : -1) * Math.ceil((k + 1) / 2) * (hh + 1);
      }
      placed.push({ x, y, w });
      g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - size / 2 - 4, w, size + 8, 5) : g.rect(x - w / 2, y - size / 2 - 4, w, size + 8); g.fill();
      g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1);
    };
    // ชื่อย่าน
    for (const d of map.def.districts || []) {
      g.font = '700 15px Cinzel, Mitr, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = 'rgba(7,13,34,.75)'; g.strokeText(d.name, d.x * S, d.y * S); g.fillStyle = '#f3dc95'; g.fillText(d.name, d.x * S, d.y * S);
    }
    // ทางออก/ประตูมิติ
    const t = performance.now() / 1000;
    for (const p of map.portals) {
      const cx = (p.x + p.w / 2) * S, cy = (p.y + p.h / 2) * S;
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
      g.fillStyle = `rgba(200,107,255,${0.35 + 0.25 * Math.sin(t * 3)})`; g.fillRect(-S * 1.1, -S * 1.1, S * 2.2, S * 2.2);
      g.fillStyle = '#e8b8ff'; g.strokeStyle = '#3a1a5a'; g.lineWidth = 2; g.fillRect(-S * 0.55, -S * 0.55, S * 1.1, S * 1.1); g.strokeRect(-S * 0.55, -S * 0.55, S * 1.1, S * 1.1);
      g.restore();
      const lx = Math.max(60, Math.min(cv.width - 60, cx)), ly = cy + (cy > cv.height - 30 ? -S * 1.8 : S * 1.8);
      label('➜ ' + (p.label || MAPS[p.to]?.name || p.to), lx, ly, '#f0d0ff', 'rgba(40,14,60,.85)', 11);
    }
    // NPC
    for (const n of npcs) {
      const x = n.x / TILE * S, y = n.y / TILE * S, col = svcColor(n);
      g.beginPath(); g.arc(x, y, S * 0.5, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.lineWidth = 2; g.strokeStyle = '#070d22'; g.stroke();
      const sv = SVC[n.service?.type];
      label(n.name + (sv ? ` · ${sv[1]}` : n.title ? ` · ${n.title}` : ''), x, y - S * 1.15, col === '#ffd34d' ? '#fff3c4' : col, 'rgba(7,13,34,.8)', 11);
    }
    // MVP
    const bosses = this.g.mobs ? this.g.mobs.list.filter((m) => m.data.mvp && !m.dead) : [];
    for (const b of bosses) { const x = b.x / TILE * S, y = b.y / TILE * S, k = t % 1; g.strokeStyle = `rgba(255,70,70,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6 + k * 14, 0, 7); g.stroke(); g.fillStyle = '#ff4646'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
    // ผู้เล่น
    const px = pl.x / TILE * S, py = pl.y / TILE * S;
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(px, py, S * 1.6 + Math.sin(t * 4) * 2, 0, 7); g.fill();
    g.save(); g.translate(px, py); g.rotate(-pl.angle); g.scale(S / 6, S / 6);
    g.fillStyle = '#e8384f'; g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(0, 6); g.lineTo(4.5, -4.5); g.lineTo(0, -2); g.lineTo(-4.5, -4.5); g.closePath(); g.fill(); g.stroke(); g.restore();
    this.$('#mwName').textContent = map.name;
    this.$('#mwSub').textContent = `${map.subtitle || ''} · ${Math.floor(pl.x / TILE)}, ${Math.floor(pl.y / TILE)}`;
  }

  /* ---------- แผนที่โลก ---------- */
  worldBase() {
    if (this.wbase) return this.wbase;
    const c = document.createElement('canvas'); c.width = WW; c.height = WH; const g = c.getContext('2d'); const r = rng(20261013);
    const sea = g.createLinearGradient(0, 0, 0, WH); sea.addColorStop(0, '#1d5a8c'); sea.addColorStop(1, '#123e6a'); g.fillStyle = sea; g.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.05})`; g.fillRect(r() * WW, r() * WH, 6 + r() * 14, 1); }
    // ผืนแผ่นดิน: ขอบชายหาด → สีตามภูมิภาค
    const ids = Object.keys(WORLD).filter((id) => MAPS[id]);
    const blob = (x, y, rr, col) => { for (let k = 0; k < 9; k++) { const a = r() * 6.28, d = r() * rr * 0.55; g.fillStyle = col; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * (0.55 + r() * 0.35), 0, 7); g.fill(); } };
    const r0 = r;
    for (const id of ids) { const p = WORLD[id]; if (p.sky) { g.fillStyle = 'rgba(0,10,30,.35)'; g.beginPath(); g.ellipse(p.x + 10, p.y + 70, 70, 18, 0, 0, 7); g.fill(); blob(p.x, p.y + 30, 70, '#ffffff'); } else blob(p.x, p.y, 92, '#e8d8a8'); }
    for (const id of ids) { const p = WORLD[id]; blob(p.x, p.y, p.sky ? 62 : 80, shade(p.land, -0.12)); }
    for (const id of ids) { const p = WORLD[id]; blob(p.x, p.y, p.sky ? 50 : 66, p.land); }
    void r0;
    // ภูเขา/ต้นไม้ประดับตามธีม
    for (const id of ids) {
      const p = WORLD[id];
      for (let i = 0; i < 16; i++) {
        const a = r() * 6.28, d = 18 + r() * 44, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.8;
        if (id === 'frostveil' || id === 'ember_caldera') { g.fillStyle = shade(p.land, -0.25); g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 8, y + 5); g.lineTo(x - 8, y + 5); g.fill(); g.fillStyle = id === 'frostveil' ? '#fff' : '#ff8a3a'; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x + 3, y - 5); g.lineTo(x - 3, y - 5); g.fill(); }
        else if (id === 'ancient_ruins') { g.fillStyle = '#8a7a5a'; g.fillRect(x - 2, y - 6, 4, 9); }
        else if (id === 'crystal_valley') { g.fillStyle = ['#e0c8ff', '#7fe0ff', '#ff9ae8'][i % 3]; g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 4, y + 3); g.lineTo(x - 4, y + 3); g.fill(); }
        else if (id === 'sky_citadel') { if (i < 6) { g.fillStyle = '#d8d0b8'; g.fillRect(x - 2, y - 8, 4, 10); g.fillStyle = '#fff1b0'; g.fillRect(x - 3, y - 10, 6, 2); } }
        else if (id === 'sunken_coast') { if (d > 40) continue; g.fillStyle = '#3f9a6a'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.fillStyle = '#7a5a3a'; g.fillRect(x - 1, y, 2, 5); }
        else if (id !== 'asteria_town') { g.fillStyle = shade(p.land, -0.3); g.beginPath(); g.arc(x, y, 4 + r() * 2, 0, 7); g.fill(); }
      }
    }
    this.wbase = c; return c;
  }

  drawWorld() {
    const g = this.wctx; g.drawImage(this.worldBase(), 0, 0);
    const t = performance.now() / 1000, cur = this.g.map.id;
    // เส้นทางเชื่อม (จากประตูมิติจริง)
    const seen = new Set();
    g.setLineDash([6, 5]); g.lineDashOffset = -t * 12; g.lineWidth = 2.5;
    for (const id of Object.keys(WORLD)) {
      const info = regionInfo(id); if (!info) continue;
      for (const to of info.links) {
        const k = [id, to].sort().join('|'); if (seen.has(k) || !WORLD[to]) continue; seen.add(k);
        const a = WORLD[id], b = WORLD[to];
        g.strokeStyle = 'rgba(7,13,34,.55)'; g.beginPath(); g.moveTo(a.x, a.y + 2); g.lineTo(b.x, b.y + 2); g.stroke();
        g.strokeStyle = '#f3dc95'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      }
    }
    // v0.46 เส้นทางเรือ (เส้นประฟ้า)
    g.strokeStyle = '#9adcff'; g.setLineDash([3, 6]);
    for (const [a1, b1] of SEA_LINKS) { const a = WORLD[a1], b = WORLD[b1]; if (!MAPS[a1] || !MAPS[b1]) continue; g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2, Math.max(a.y, b.y) + 40, b.x, b.y); g.stroke(); }
    g.setLineDash([]);
    for (const id of Object.keys(WORLD)) {
      const info = regionInfo(id); if (!info) continue;
      const p = WORLD[id], sel = id === this.sel;
      if (id === cur) { const k = t % 1.4 / 1.4; g.strokeStyle = `rgba(255,90,110,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 20 + k * 22, 0, 7); g.stroke(); }
      g.beginPath(); g.arc(p.x, p.y, sel ? 18 : 15, 0, 7); g.fillStyle = '#0e1836'; g.fill(); g.lineWidth = sel ? 4 : 3; g.strokeStyle = sel ? '#f3dc95' : '#d8b45c'; g.stroke();
      g.font = '700 11px "Pixelify Sans", Mitr, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f3dc95';
      g.fillText(info.def.safe ? '⌂' : info.max ? String(info.min) : '?', p.x, p.y + 1);
      const name = info.def.name, lv = info.def.safe ? 'เมือง · ปลอดภัย' : `Lv.${info.min}–${info.max}${info.boss.length ? ' · MVP' : ''}`;
      g.font = '700 14px Cinzel, Mitr, serif'; const w = Math.max(g.measureText(name).width, 80) + 16;
      g.fillStyle = 'rgba(7,13,34,.82)'; g.fillRect(p.x - w / 2, p.y + 22, w, 34); g.strokeStyle = sel ? '#f3dc95' : '#8a6a2a'; g.lineWidth = 1; g.strokeRect(p.x - w / 2 + 0.5, p.y + 22.5, w - 1, 33);
      g.fillStyle = '#f5ecd2'; g.fillText(name, p.x, p.y + 32);
      g.font = '500 11px Mitr, sans-serif'; g.fillStyle = info.boss.length ? '#ffb07a' : '#9fb0d6'; g.fillText(lv, p.x, p.y + 47);
      if (id === cur) { g.font = '600 11px Mitr, sans-serif'; g.fillStyle = '#ff8a9a'; g.fillText('▼ คุณอยู่ที่นี่', p.x, p.y - 28); }
    }
    // เข็มทิศ
    g.save(); g.translate(WW - 40, 46); g.fillStyle = '#0e1836cc'; g.beginPath(); g.arc(0, 0, 24, 0, 7); g.fill(); g.strokeStyle = '#d8b45c'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#f3dc95'; g.beginPath(); g.moveTo(0, -18); g.lineTo(5, 0); g.lineTo(-5, 0); g.fill(); g.fillStyle = '#9fb0d6'; g.beginPath(); g.moveTo(0, 18); g.lineTo(5, 0); g.lineTo(-5, 0); g.fill();
    g.font = '700 10px Cinzel, serif'; g.fillStyle = '#070d22'; g.fillText('N', 0, -8); g.restore();
  }

  regionMini(info) {
    const key = 'mini:' + info.id;
    let m = this.cache.get(key);
    if (!m) {
      const gm = info.id === this.g.map.id ? this.g.map : new GameMap(info.def);
      const S = 2, c = document.createElement('canvas'); c.width = gm.w * S; c.height = gm.h * S; const g = c.getContext('2d');
      const mini = (info.def.theme || {}).mini || {};
      for (let y = 0; y < gm.h; y++) for (let x = 0; x < gm.w; x++) { const ti = TILE_INFO[gm.ground[gm.idx(x, y)]]; g.fillStyle = mini[ti.key] || ti.mini; g.fillRect(x * S, y * S, S, S); }
      for (const o of gm.objects) if (o.kind === 'tree' || o.kind === 'pine' || o.kind === 'house') { g.fillStyle = o.kind === 'house' ? '#9a5f3e' : '#2a5e32'; g.fillRect(o.def.x * S, o.def.y * S, o.fw * S, o.fh * S); }
      for (const p of gm.portals) { g.fillStyle = '#c86bff'; g.fillRect(p.x * S, p.y * S, p.w * S, p.h * S); }
      m = { c, S }; this.cache.set(key, m);
    }
    const out = document.createElement('canvas'); out.width = m.c.width; out.height = m.c.height; out.className = 'wm-mini';
    const g = out.getContext('2d'); g.drawImage(m.c, 0, 0);
    const r = rng(info.id.length * 97);
    for (const s of info.mobs) {
      const on = !this.selMob || this.selMob === s.id;
      g.fillStyle = on ? (s.m.color || '#fff') : 'rgba(255,255,255,.15)';
      for (const [x, y, w, h] of s.areas) {
        if (on && this.selMob) { g.strokeStyle = '#f3dc95'; g.lineWidth = 1; g.strokeRect(x * m.S + 0.5, y * m.S + 0.5, w * m.S, h * m.S); }
        const n = s.m.mvp ? 1 : Math.max(2, Math.round(s.count / s.areas.length));
        for (let i = 0; i < n; i++) { const px = (x + r() * w) * m.S, py = (y + r() * h) * m.S; g.beginPath(); g.arc(px, py, s.m.mvp ? 4 : 2.2, 0, 7); g.fill(); if (s.m.mvp && on) { g.strokeStyle = '#ff4646'; g.lineWidth = 1.5; g.stroke(); } }
      }
    }
    return out;
  }

  renderInfo() {
    const info = regionInfo(this.sel); if (!info) return;
    const el = this.$('#wmInfo'), d = info.def, cur = d.id === this.g.map.id;
    const npcs = (d.npcs || []).filter((n) => n.service);
    const mobRow = (s) => `<button type="button" class="wm-mob${s.m.mvp ? ' boss' : ''}${this.selMob === s.id ? ' on' : ''}" data-mob="${s.id}"><i style="background:${s.m.color || '#fff'}"></i><b>${esc(s.m.name)}</b><small>Lv.${s.m.level}${s.m.mvp ? ' · MVP' : s.m.aggressive ? ' · ดุ' : ''}</small></button>`;
    el.innerHTML = `
      <div class="wm-head"><span class="wm-badge">${d.safe ? '⌂' : info.min}</span><div><h3>${esc(d.name)}</h3><small>${esc(d.subtitle || '')}</small></div>
        <div class="wm-tags"><span>เลเวล</span><b>${d.safe ? '—' : `${info.min}–${info.max}`}</b><span>มอนสเตอร์</span><b>${info.mobs.length}</b></div></div>
      <div class="wm-split"><div class="wm-mobs"><h4>${d.safe ? 'บริการในเมือง' : 'มอนสเตอร์ที่พบ'}${cur ? '<em>คุณอยู่ที่นี่</em>' : ''}</h4>
        ${d.safe ? npcs.map((n) => `<div class="wm-mob"><i style="background:${(SVC[n.service.type] || ['#ffd34d'])[0]}"></i><b>${esc(n.name)}</b><small>${esc((SVC[n.service.type] || ['', n.title])[1])}</small></div>`).join('') : [...info.normal, ...info.boss].map(mobRow).join('')}
      </div><div class="wm-minibox"></div></div>
      <p class="wm-links">เชื่อมต่อกับ: ${info.links.map((t) => `<button type="button" data-region="${t}">${esc(MAPS[t].name)}</button>`).join(' ') || '—'}</p>
      <p class="wm-note">เดินทางผ่านประตูมิติที่ขอบแผนที่ หรือใช้บริการ NPC วาร์ป · แตะชื่อมอนสเตอร์เพื่อดูจุดเกิดบนแผนที่</p>`;
    el.querySelector('.wm-minibox').append(this.regionMini(info));
  }
}
