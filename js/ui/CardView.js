// v0.29: การ์ดมอนสเตอร์แบบใหญ่ (หน้าการ์ดเต็ม + เอียงตามนิ้ว/เมาส์) · หน้าจอได้รับการ์ด
import { CARD_COMBOS, CARD_MAPS, CARD_RANKS, SLOT_TH, CLASS_TH, ROLE_TH, effectText, isDrawback, traitTH, CARD_BY_ID } from '../data/cardCatalog.js?v=0.77.0';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (r) => (r * 100).toFixed(r * 100 < 0.01 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '') + '%';
const CSS = `/* ---------- การ์ด ---------- */
.ec{--w:230px;--c1:#cfd8e6;--c2:#7c8aa6;--c3:#e9eef7;--glow:#9fc4ff;--tone1:#9fe07a;--tone2:#3f8a38;--tone3:#1e3a1a;
  position:relative;width:100%;aspect-ratio:5/7;border-radius:14px;padding:7px;isolation:isolate;
  background:linear-gradient(145deg,var(--c3),var(--c1) 30%,var(--c2) 55%,var(--c3) 75%,var(--c2));
  box-shadow:0 0 0 1px #0008,0 14px 30px #0009,0 0 26px -6px var(--glow);container-type:inline-size}
.ec.elite{--c1:#f2d27a;--c2:#9a6a1e;--c3:#fff3c4;--glow:#ffcf6a}
.ec.mvp{--c1:#ffde8a;--c2:#7a1420;--c3:#fff1c8;--glow:#ff3a5a;background:linear-gradient(145deg,#ffe8a8,#c8962e 18%,#5a0c16 40%,#2a0408 60%,#c8962e 82%,#fff0c0)}
.ec-in{position:relative;height:100%;border-radius:9px;overflow:hidden;background:#0b0d18;display:flex;flex-direction:column;
  box-shadow:inset 0 0 0 2px #0009,inset 0 0 0 3px color-mix(in srgb,var(--c1) 70%,transparent)}
.ec.mvp .ec-in{box-shadow:inset 0 0 0 2px #000,inset 0 0 0 3px #e6c372}
.ec-head{position:relative;z-index:3;display:flex;justify-content:space-between;align-items:center;padding:5cqw 6cqw 0;font:700 3.4cqw 'Cinzel',Georgia,serif;letter-spacing:.12em;color:var(--c3)}
.ec-head .no{font-family:'Kanit','Noto Sans Thai',sans-serif;font-weight:500;letter-spacing:.04em;opacity:.85}
.ec-head .tier{padding:.4cqw 2.4cqw;border:1px solid color-mix(in srgb,var(--c1) 70%,transparent);border-radius:20px;background:#0008}
.ec.mvp .ec-head .tier{color:#fff0c0;background:linear-gradient(90deg,#5a0c16,#a8182c,#5a0c16);border-color:#e6c372}
.ec-crown{position:absolute;left:50%;top:-1.5cqw;transform:translateX(-50%);width:26cqw;z-index:4;filter:drop-shadow(0 2px 4px #000)}
.ec-art{position:relative;flex:1;margin:3cqw 4cqw 0;border-radius:6px;overflow:hidden;min-height:0;
  background:radial-gradient(120% 80% at 50% 70%,var(--tone2),var(--tone3) 70%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c1) 60%,transparent),inset 0 0 30px #000a}
.ec-art canvas{position:absolute;inset:0;width:100%;height:100%}
.ec-art img{position:absolute;left:50%;bottom:4%;height:86%;max-width:86%;object-fit:contain;transform:translateX(-50%);image-rendering:pixelated;filter:drop-shadow(0 0 6px color-mix(in srgb,var(--tone1) 60%,transparent)) drop-shadow(0 6px 4px #000a);z-index:2}
.ec.mvp .ec-art img{height:94%;max-width:94%;bottom:1%}
.ec-foil{position:absolute;inset:0;z-index:5;pointer-events:none;border-radius:inherit;mix-blend-mode:color-dodge;opacity:0;
  background:linear-gradient(115deg,transparent 40%,#ff9ad888 46%,#9ae8ff88 50%,#fff2a888 54%,transparent 60%);background-size:300% 300%;background-position:var(--fx,50%) var(--fy,50%)}
.ec.elite .ec-foil{opacity:.22}
.ec.mvp .ec-foil{opacity:.32;animation:sweep 5s linear infinite}
@keyframes sweep{from{background-position:120% 0}to{background-position:-20% 100%}}
.ec-title{position:relative;z-index:3;text-align:center;margin-top:-6cqw;padding:0 4cqw}
.ec-title .big{display:block;font:900 9cqw/1 'Cinzel',Georgia,serif;letter-spacing:.04em;color:var(--c3);text-shadow:0 2px 0 #000,0 0 10px color-mix(in srgb,var(--glow) 70%,transparent)}
.ec.mvp .ec-title .big{background:linear-gradient(180deg,#fff6d6,#ffcf6a 50%,#b06a12);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 6px #ff3a5a)}
.ec-title .th{display:inline-block;margin-top:1.2cqw;font:600 5.2cqw 'Kanit','Noto Sans Thai',sans-serif;color:#fff;padding:.4cqw 5cqw;background:linear-gradient(90deg,transparent,#000c 20%,#000c 80%,transparent)}
.ec-title .quote{display:block;margin-top:1cqw;font:italic 300 3.3cqw/1.35 'Kanit','Noto Sans Thai',sans-serif;color:#d8d0e8;padding:0 2cqw;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ec-stats{position:relative;z-index:3;display:flex;gap:2.4cqw;margin:2.4cqw 4cqw 4.4cqw;padding:2.4cqw;border-radius:6px;background:linear-gradient(180deg,#141a33ee,#0b0f22ee);border:1px solid color-mix(in srgb,var(--c1) 55%,transparent)}
.ec-slot{flex:none;width:12cqw;height:12cqw;border-radius:50%;display:grid;place-items:center;border:1px solid var(--c1);background:radial-gradient(circle at 50% 35%,#2a3260,#0a0d1c);font-size:6cqw}
.ec-slot svg{width:62%;height:62%}
.ec-lines{min-width:0;display:flex;flex-direction:column;gap:.6cqw;font:500 3.5cqw/1.3 'Kanit','Noto Sans Thai',sans-serif}
.ec-lines .s{color:#fff0c0;font-size:3cqw;letter-spacing:.04em}
.ec-lines .e{color:#eef2ff}
.ec-lines .e.bad{color:#ff7d86}


.ecm{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:16px;background:radial-gradient(circle at 50% 45%,#2a1a48cc,#03050ef0 70%);overflow:auto;pointer-events:auto;font-family:'Kanit','Noto Sans Thai',sans-serif;color:#f3ecda}
.ecm[hidden]{display:none}
.ecm-box{display:grid;grid-template-columns:minmax(0,380px) minmax(0,420px);gap:22px;align-items:center;max-width:860px;width:100%}
.ecm.reveal .ecm-box{grid-template-columns:minmax(0,380px);justify-items:center}
@media (max-width:760px){.ecm-box{grid-template-columns:1fr;justify-items:center}}
.ecm-stage{perspective:1000px;width:min(380px,82vw,calc((100vh - 120px) * 0.714))}\n.ecm.reveal .ecm-stage{width:min(380px,82vw,calc((100vh - 210px) * 0.714))}
@media (max-height:560px){.ecm-stage{width:min(250px,40vh * 0.72 + 60px)}}
.ecm-stage .ec{transition:transform .08s linear;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))}
.ecm-stage .ec .ec-foil{opacity:.36;animation:none}
.ecm.reveal .ecm-stage{animation:ecPop .7s cubic-bezier(.2,1.4,.4,1) both}
@keyframes ecPop{0%{transform:scale(.3) rotateY(180deg);opacity:0}60%{opacity:1}100%{transform:none}}
.ecm-rays{position:fixed;inset:-50%;z-index:-1;background:repeating-conic-gradient(from 0deg,#ffe9a018 0 6deg,transparent 6deg 18deg);animation:ecSpin 18s linear infinite;pointer-events:none}
.ecm:not(.reveal) .ecm-rays{display:none}
@keyframes ecSpin{to{transform:rotate(360deg)}}
.ecm-cap{text-align:center;margin-top:10px}
.ecm-cap b{display:block;font:700 22px 'Kanit',sans-serif;color:#e8d4ff;text-shadow:0 2px 8px #000}
.ecm-cap span{display:inline-block;margin-top:8px;padding:8px 16px;border-radius:10px;background:linear-gradient(180deg,#1d2c5c,#0e1836);border:2px solid #d8b45c;font-size:14px;line-height:1.5;max-width:min(560px,90vw)}
.ecm-cap small{display:block;margin-top:8px;color:#9ba8cf;font-size:12px}
.ecm:not(.reveal) .ecm-cap{display:none}
.ecm-info{background:linear-gradient(180deg,#1f3268f2,#0e1836f2);border:2px solid #d8b45c;border-radius:10px;padding:14px 16px;min-width:0;width:100%;max-height:min(80vh,620px);overflow:auto}
.ecm.reveal .ecm-info{display:none}
.ecm-info h2{margin:0;font:600 20px 'Kanit',sans-serif}
.ecm-info .en{color:#9ba8cf;font-size:12px}
.ecm-info h3{margin:12px 0 4px;font:600 12px 'Kanit',sans-serif;color:#e6c372;letter-spacing:.05em}
.ecm-info p{margin:0;font-size:13px;line-height:1.6;color:#d6dcf0}
.ecm-info ul{margin:0;padding:0;list-style:none;display:grid;gap:3px}
.ecm-info li{background:#0b1229;border-radius:6px;padding:4px 9px;font-size:13.5px}
.ecm-info li.bad{color:#ff7d86}
.ecm-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ecm-tags span{font-size:11.5px;padding:1px 8px;border-radius:10px;border:1px solid #2a3560;background:#121a38;color:#c8d0ea}
.ecm-x{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));right:12px;width:38px;height:38px;border-radius:50%;border:2px solid #d8b45c;background:#7a1f22;color:#fff;font-size:17px;cursor:pointer;z-index:2}
.ecm.locked .ec{filter:grayscale(1) brightness(.45)}
.ecm-lock{display:none;text-align:center;color:#ffd0d8;font-size:13px;margin-top:6px}
.ecm.locked .ecm-lock{display:block}
`;
let styled = false;
function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }

const ICON = {
  weapon: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9M14 4l6 0 0 6-8 8-6-6z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  body: '<svg viewBox="0 0 24 24"><path d="M8 3l4 2 4-2 4 4-3 3v10H7V10L4 7z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  garment: '<svg viewBox="0 0 24 24"><path d="M7 3h10l3 18-8-3-8 3z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  shoes: '<svg viewBox="0 0 24 24"><path d="M6 4h5v9l8 3v4H5z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  head: '<svg viewBox="0 0 24 24"><path d="M4 16c0-5 4-10 8-10s8 5 8 10zM3 16h18v3H3z" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
  accessory: '<svg viewBox="0 0 24 24"><circle cx="12" cy="14" r="6" fill="none" stroke="#f3dc95" stroke-width="2"/><path d="M9 5l3 3 3-3" fill="none" stroke="#f3dc95" stroke-width="2"/></svg>',
};
const CROWN = '<svg class="ec-crown" viewBox="0 0 120 50" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c8"/><stop offset=".5" stop-color="#e6b24a"/><stop offset="1" stop-color="#7a4a10"/></linearGradient></defs><path d="M8 44 L16 14 L36 32 L60 4 L84 32 L104 14 L112 44 Z" fill="url(#cg)" stroke="#2a0a06" stroke-width="2.5"/><circle cx="60" cy="24" r="6" fill="#ff2a4a" stroke="#2a0a06" stroke-width="2"/><circle cx="34" cy="38" r="3.5" fill="#ff2a4a"/><circle cx="86" cy="38" r="3.5" fill="#ff2a4a"/><path d="M0 44 C20 36 40 42 60 40 C80 42 100 36 120 44" fill="none" stroke="#e6b24a" stroke-width="3"/></svg>';
const WINGS = '<svg class="ec-crown" viewBox="0 0 120 40" aria-hidden="true" style="width:30cqw;top:-1cqw"><path d="M60 30 C50 10 30 6 6 10 C24 16 30 22 34 30 C26 28 18 30 12 34 C30 36 44 36 60 34 C76 36 90 36 108 34 C102 30 94 28 86 30 C90 22 96 16 114 10 C90 6 70 10 60 30Z" fill="#f2d27a" stroke="#4a2a06" stroke-width="2"/><path d="M54 20 L60 8 L66 20 L60 28Z" fill="#fff3c4" stroke="#4a2a06" stroke-width="2"/></svg>';

// ฉากหลังของการ์ด: ลายตามแผนที่ (คริสตัล/ใบไม้/หิมะ/ลาวา/อักขระ/หมอก) วาดครั้งเดียวด้วย canvas
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function paintArt(cv, card) {
  const W = cv.width = 300, H = cv.height = 260, g = cv.getContext('2d'), M = CARD_MAPS[card.monster.map], [t1, t2, t3] = M.tone;
  const r = rng([...card.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const bg = g.createRadialGradient(W / 2, H * 0.7, 10, W / 2, H * 0.6, W * 0.8); bg.addColorStop(0, t2); bg.addColorStop(1, t3); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // ลำแสงจากหลังมอนสเตอร์
  g.save(); g.translate(W / 2, H * 0.62); g.globalCompositeOperation = 'lighter';
  const rays = card.rank === 'mvp' ? 22 : card.rank === 'elite' ? 14 : 9;
  for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2 + r() * 0.2, w = 0.04 + r() * 0.06; g.fillStyle = `rgba(255,255,255,${card.rank === 'mvp' ? 0.07 : 0.045})`; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, W, a - w, a + w); g.closePath(); g.fill(); }
  g.restore();
  const map = card.monster.map;
  g.globalCompositeOperation = 'source-over';
  // ทิวทัศน์ด้านล่าง
  g.fillStyle = t3; g.beginPath(); g.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) g.lineTo(x, H * (0.78 + Math.sin(x * 0.03 + r() * 2) * 0.04));
  g.lineTo(W, H); g.fill();
  if (map === 'haunted_forest' || map === 'whisper_forest') for (let i = 0; i < 9; i++) { const x = r() * W, h = H * (0.35 + r() * 0.35); g.fillStyle = '#00000088'; g.fillRect(x, H - h, 4 + r() * 5, h); g.beginPath(); g.arc(x + 3, H - h, 14 + r() * 18, 0, 7); g.fill(); }
  if (map === 'ancient_ruins') for (let i = 0; i < 6; i++) { const x = r() * W, h = H * (0.25 + r() * 0.35); g.fillStyle = '#00000066'; g.fillRect(x, H - h, 14, h); g.fillRect(x - 4, H - h, 22, 6); }
  if (map === 'frostveil' || map === 'ember_caldera') { g.fillStyle = '#00000066'; g.beginPath(); g.moveTo(0, H * 0.8); for (let x = 0; x <= W; x += 30) g.lineTo(x, H * (0.45 + r() * 0.25)); g.lineTo(W, H); g.lineTo(0, H); g.fill(); }
  if (card.monster.id === 'nocthar' || card.monster.id === 'bloodmoon_knight') { g.fillStyle = '#ff2a3a'; g.globalAlpha = 0.55; g.beginPath(); g.arc(W * 0.72, H * 0.25, 40, 0, 7); g.fill(); g.globalAlpha = 1; for (let i = 0; i < 5; i++) { const x = W * 0.15 + i * 18; g.fillStyle = '#0a0006'; g.fillRect(x, H * 0.18 + (i % 2) * 14, 10, H * 0.6); g.beginPath(); g.moveTo(x - 2, H * 0.18 + (i % 2) * 14); g.lineTo(x + 5, H * 0.08 + (i % 2) * 14); g.lineTo(x + 12, H * 0.18 + (i % 2) * 14); g.fill(); } }
  // เศษผลึก/อนุภาคตามธีม
  const n = card.rank === 'mvp' ? 70 : card.rank === 'elite' ? 45 : 28;
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, s = 1 + r() * (card.rank === 'mvp' ? 5 : 3);
    g.globalAlpha = 0.35 + r() * 0.6;
    if (map === 'frostveil') { g.fillStyle = '#ffffff'; g.fillRect(x, y, s, s); }
    else if (map === 'ember_caldera') { g.fillStyle = r() < 0.5 ? '#ffb05a' : '#ff5a2a'; g.fillRect(x, y, s, s * 1.6); }
    else { g.fillStyle = r() < 0.6 ? t1 : '#ffffff'; g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s, y); g.lineTo(x, y + s * 2); g.lineTo(x - s, y); g.fill(); }
  }
  g.globalAlpha = 1;
  // ผลึกใหญ่สะท้อนแสง (MVP / Elite) แบบในตัวอย่าง
  if (card.rank !== 'normal') for (let i = 0; i < (card.rank === 'mvp' ? 7 : 4); i++) {
    const x = r() < 0.5 ? r() * W * 0.25 : W - r() * W * 0.25, y = H * (0.2 + r() * 0.7), s = 14 + r() * 26, a = r() * 3;
    g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = 0.75;
    const cg = g.createLinearGradient(-s, -s, s, s); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.4, t1); cg.addColorStop(1, t2);
    g.fillStyle = cg; g.beginPath(); g.moveTo(0, -s * 1.6); g.lineTo(s * 0.55, 0); g.lineTo(0, s * 1.6); g.lineTo(-s * 0.55, 0); g.closePath(); g.fill();
    g.strokeStyle = '#ffffffaa'; g.lineWidth = 1; g.stroke(); g.restore();
  }
  // ขอบมืด
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.65)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

export function cardElement(c) {
  style();
  const M = CARD_MAPS[c.monster.map], R = CARD_RANKS[c.rank];
  const el = document.createElement('div');
  el.className = 'ec ' + c.rank;
  el.style.setProperty('--tone1', M.tone[0]); el.style.setProperty('--tone2', M.tone[1]); el.style.setProperty('--tone3', M.tone[2]);
  const top = c.rank === 'mvp' ? CROWN : c.rank === 'elite' ? WINGS : '';
  const tier = c.rank === 'mvp' ? 'MVP CARD' : c.rank === 'elite' ? 'ELITE CARD' : 'MONSTER CARD';
  const big = c.monster.name.split(' ')[0];
  el.innerHTML = `${top}<div class="ec-in">
    <div class="ec-head"><span class="no">${c.no}</span><span class="tier">${tier}</span></div>
    <div class="ec-art"><canvas></canvas><img alt="" src="assets/monsters/${c.monster.id}.png"></div>
    <div class="ec-title"><span class="big">${esc(c.name_en.replace(' Card', '').toUpperCase())}</span><span class="th">${esc(big)}</span><span class="quote">“${esc(c.flavor)}”</span></div>
    <div class="ec-stats"><span class="ec-slot" title="${SLOT_TH[c.slot]}">${ICON[c.slot]}</span><div class="ec-lines"><span class="s">${SLOT_TH[c.slot]} · ${c.rank === 'mvp' ? 'เสียบได้ 1 ใบ' : 'ซ้อนได้ ' + c.max_stack + ' ใบ'}</span>${c.effects.map((e) => `<span class="e${isDrawback(e) ? ' bad' : ''}">${esc(effectText(e))}</span>`).join('')}</div></div>
  </div><span class="ec-foil"></span>`;
  paintArt(el.querySelector('canvas'), c);
  return el;
}


const cardEl = cardElement;

export class CardModal {
  constructor(root) {
    style();
    this.el = document.createElement('div'); this.el.className = 'ecm'; this.el.hidden = true;
    this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-label', 'การ์ดมอนสเตอร์');
    this.el.innerHTML = '<div class="ecm-rays"></div><button type="button" class="ecm-x" aria-label="ปิด">✕</button><div class="ecm-box"><div><div class="ecm-stage"></div><p class="ecm-lock">ยังไม่ได้สะสมการ์ดใบนี้</p><div class="ecm-cap"></div></div><div class="ecm-info"></div></div>';
    (root.querySelector('.hud') || root).append(this.el);
    this.el.querySelector('.ecm-x').addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    this.el.addEventListener('click', (e) => { if (this.mode === 'reveal' || e.target === this.el || e.target.classList.contains('ecm-box')) this.close(); });
    for (const ev of ['pointerdown', 'wheel', 'contextmenu']) this.el.addEventListener(ev, (e) => e.stopPropagation());
    addEventListener('keydown', (e) => { if (!this.el.hidden && e.key === 'Escape') { e.stopPropagation(); this.close(); } }, true);
    this.queue = [];
  }
  get open() { return !this.el.hidden; }
  // mode: 'view' (รายละเอียด) · 'reveal' (เพิ่งได้รับ — แตะที่ใดก็ได้เพื่อปิด) · locked = ยังไม่มี
  show(id, { mode = 'view', locked = false } = {}) {
    const c = CARD_BY_ID[id]; if (!c) return;
    if (mode === 'reveal' && this.open && this.mode === 'reveal') { this.queue.push(id); return; }
    this.mode = mode;
    this.el.classList.toggle('reveal', mode === 'reveal'); this.el.classList.toggle('locked', !!locked);
    const stage = this.el.querySelector('.ecm-stage'); stage.textContent = '';
    const card = cardEl(c); stage.append(card);
    stage.style.animation = 'none'; void stage.offsetWidth; stage.style.animation = '';
    const tilt = (x, y) => { card.style.setProperty('--ry', (x - 0.5) * 22 + 'deg'); card.style.setProperty('--rx', (0.5 - y) * 18 + 'deg'); card.style.setProperty('--fx', x * 100 + '%'); card.style.setProperty('--fy', y * 100 + '%'); };
    stage.onpointermove = (e) => { const r = card.getBoundingClientRect(); tilt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); };
    stage.onpointerleave = () => tilt(0.5, 0.5);
    const R = CARD_RANKS[c.rank], M = CARD_MAPS[c.monster.map], combo = CARD_COMBOS.find((x) => x.combo_id === c.combo_id);
    this.el.querySelector('.ecm-cap').innerHTML = `<b>${esc(c.name_th)}</b><span>${c.effects.map((e) => esc(effectText(e))).join(' · ')}</span><small>แตะที่ใดก็ได้เพื่อปิด</small>`;
    this.el.querySelector('.ecm-info').innerHTML = `<h2>${esc(c.name_th)}</h2><div class="en">${esc(c.name_en)} · ${c.no} · ${R.th}</div>
      <div class="ecm-tags"><span>ตำแหน่ง ${SLOT_TH[c.slot]}</span><span>ดรอป ${pct(c.drop_rate * 0.5)}</span><span>แนว ${ROLE_TH[c.role]}</span><span>${c.stackable ? 'ซ้อนได้ ' + c.max_stack + ' ใบ' : 'ไม่ซ้อน'}</span></div>
      <h3>เอฟเฟกต์</h3><ul>${c.effects.map((e) => `<li class="${isDrawback(e) ? 'bad' : ''}">${esc(effectText(e))}</li>`).join('')}</ul>
      <h3>มอนสเตอร์</h3><p>${esc(c.monster.name)} · Lv.${c.monster.level} · เผ่า${traitTH(c.monster.race)} · ธาตุ${traitTH(c.monster.element)} · ขนาด${traitTH(c.monster.size)} · ${M.th}</p>
      <h3>เหมาะกับ</h3><p>${c.recommended_class.map((k) => CLASS_TH[k]).join(' · ')}</p>
      ${combo ? `<h3>คอมโบ: ${esc(combo.name_th)}</h3><p>${combo.cards.map((x) => esc(CARD_BY_ID[x].name_th.replace('การ์ด', ''))).join(' + ')}</p><ul>${combo.bonus.map((e) => `<li>${esc(effectText(e))}</li>`).join('')}</ul>` : ''}
      <h3>ตำนาน</h3><p>“${esc(c.flavor)}”</p>`;
    this.el.hidden = false;
  }
  close() { this.el.hidden = true; if (this.queue.length) { const id = this.queue.shift(); setTimeout(() => this.show(id, { mode: 'reveal' }), 120); } }
}
