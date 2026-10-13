// v0.30 เอฟเฟ็กฉายา — ยิ่งหายากยิ่งอลังการ (ใช้ร่วมกันทั้งเหนือหัวตัวละคร สมุดสะสม และหน้าพรีวิว)
// ธรรมดา: ป้ายเรียบ · หายาก: แสงวาบ + ประกาย · ระดับตำนาน: ไล่สี + อัญมณี + ปีกเล็ก + ดาวโคจร
// ในตำนาน: ทองเงา + ปีกใหญ่ + รัศมีสองชั้น + ริบบิ้น + คลื่นแสง + เอฟเฟ็กธีม
// เหนือตำนาน: ขอบพลังงานหมุน + ออโรร่า + วงเวท + เสาแสง + มงกุฎ + ดาวโคจร 3 ดวง + ระเบิดคลื่น + เอฟเฟ็กธีมเต็มรูปแบบ
// เทพนิรันดร์: ทุกอย่างของเหนือตำนาน + ปีกเทวดา 3 ชั้น + วงเวทซ้อนสองวงหมุนสวนกัน + วงแหวนเทวดา + ท้องฟ้าดาวในป้าย + แสงสวรรค์ระเบิดเป็นจังหวะ
// ทำด้วย CSS ล้วน (transform/opacity) — ไม่แตะ WebGL · ไม่แยกตัวอักษร (สระ/วรรณยุกต์ไทยไม่เพี้ยน)

export const TIER_ORDER = ['common', 'rare', 'epic', 'legend', 'mythic', 'divine'];
export const TIER_NAME = { common: 'ธรรมดา', rare: 'หายาก', epic: 'ระดับตำนาน', legend: 'ในตำนาน', mythic: 'เหนือตำนาน', divine: 'เทพนิรันดร์' };
export const TIER_COLOR = { common: '#cfd8e4', rare: '#7fc4ff', epic: '#d49bff', legend: '#ffb347', mythic: '#ff9ae6', divine: '#fff2a8' };
export const FX_NAME = {
  gold: 'ทองคำ', frost: 'น้ำแข็ง', flame: 'เปลวเพลิง', arcane: 'มนตรามรกต', crimson: 'โลหิต', storm: 'อสนี', sakura: 'ซากุระ', shadow: 'เงามืด',
  prism: 'ปริซึมรุ้ง', celestial: 'สรวงสวรรค์', void: 'ห้วงสุญตา', inferno: 'นรกันต์', genesis: 'ปฐมกาล', abyss: 'อเวจี', astral: 'ดาราจักร',
};
const DEFAULT_FX = { legend: 'gold', mythic: 'prism', divine: 'genesis' };
const HIGH = new Set(['legend', 'mythic', 'divine']);

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };   // สุ่มแบบคงที่
const N = (n) => Math.max(1, Math.round(coarse ? n * 0.6 : n));   // มือถือลดจำนวนอนุภาค

const CROWN = '<svg viewBox="0 0 24 14" aria-hidden="true"><path class="c1" d="M2 12 L3.5 3 L8 8 L12 1 L16 8 L20.5 3 L22 12 Z"/><path class="c2" d="M3 12 L22 12 L21.6 10 L3.4 10 Z"/><circle cx="12" cy="1.6" r="1.4"/><circle cx="3.5" cy="3" r="1.1"/><circle cx="20.5" cy="3" r="1.1"/></svg>';
const CIRCLE = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" class="m1"/><circle cx="50" cy="50" r="41" class="m2"/><circle cx="50" cy="50" r="30" class="m3"/><path class="m4" d="M50 9 L85.5 70.5 L14.5 70.5 Z M50 91 L14.5 29.5 L85.5 29.5 Z"/></svg>';
const BOLT = '<svg viewBox="0 0 10 24" aria-hidden="true"><path d="M6 0 L1 13 L5 13 L3 24 L9 9 L5 9 L8 0 Z"/></svg>';
const feathers = (n) => '<i class="th-f"></i>'.repeat(n);

function particles(n, cls) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<i class="${cls}" style="--x:${(r(i, 1) * 100).toFixed(1)}%;--d:${(-r(i, 2) * 3.4).toFixed(2)}s;--s:${(0.6 + r(i, 3) * 0.9).toFixed(2)};--dx:${((r(i, 4) - 0.5) * 22).toFixed(1)}px;--h:${Math.round(r(i, 5) * 360)};--rz:${Math.round(r(i, 7) * 360)}deg"></i>`;
  return s;
}
function shards(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<i class="th-sh" style="--ang:${Math.round((360 / n) * i + r(i, 6) * 20)}deg;--h:${Math.round((360 / n) * i)};--len:${(40 + r(i, 8) * 34).toFixed(0)}px"></i>`;
  return s;
}
const orbit = (k, cls = '') => `<i class="th-o ${cls}" style="--od:${(-k * 0.87).toFixed(2)}s"><i class="th-oy"><i class="th-star"></i></i></i>`;

// เอฟเฟ็กเฉพาะธีม (ในตำนานขึ้นไป) — m = ตัวคูณจำนวน
function themeFx(f, m) {
  switch (f) {
    case 'flame': case 'inferno': return particles(N(5 * m), 'th-fl');
    case 'frost': case 'celestial': case 'gold': return particles(N(5 * m), 'th-sn');
    case 'sakura': return particles(N(6 * m), 'th-pe');
    case 'storm': return `<i class="th-bolt l">${BOLT}</i><i class="th-bolt r">${BOLT}</i>${m > 1 ? `<i class="th-bolt t">${BOLT}</i>` : ''}`;
    case 'void': case 'shadow': case 'abyss': return '<i class="th-vx"></i>' + particles(N(4 * m), 'th-sm');
    case 'arcane': return particles(N(5 * m), 'th-rn');
    case 'crimson': return '<i class="th-mist"></i>' + particles(N(4 * m), 'th-fl');
    case 'prism': case 'genesis': return '<i class="th-arc"></i>' + particles(N(4 * m), 'th-sn');
    case 'astral': return '<i class="th-vx"></i>' + particles(N(7 * m), 'th-sn');
    default: return '';
  }
}

// HTML ภายในของป้ายฉายา (ใส่ใน .tag-honor หรือ .th-inline)
export function honorInner(title, tier = 'common', fx = '') {
  const t = TIER_ORDER.includes(tier) ? tier : 'common';
  const f = HIGH.has(t) ? fx || DEFAULT_FX[t] : '';
  const text = `<span class="th-t">${esc(title)}</span>`;
  const gem = '<i class="th-gem"></i>';
  let back = '', front = '', pre = '', post = '', frame = '';
  if (t === 'rare') {
    back = '<i class="th-tw s" style="--x:2%;--y:-30%;--d:-.4s"></i><i class="th-tw s" style="--x:92%;--y:70%;--d:-1.6s"></i>';
  } else if (t === 'epic') {
    pre = gem; post = gem;
    back = `<i class="th-w l sm">${feathers(2)}</i><i class="th-w r sm">${feathers(2)}</i>`
      + '<i class="th-tw" style="--x:4%;--y:-45%;--d:0s"></i><i class="th-tw" style="--x:90%;--y:-35%;--d:-1.1s"></i><i class="th-tw" style="--x:48%;--y:95%;--d:-2.1s"></i><i class="th-tw" style="--x:25%;--y:-55%;--d:-1.6s"></i><i class="th-tw" style="--x:72%;--y:100%;--d:-.6s"></i>';
    front = orbit(0, 'sm');
  } else if (t === 'legend') {
    pre = gem; post = gem;
    back = `<i class="th-ray"></i><i class="th-ray b"></i><i class="th-rib l"></i><i class="th-rib r"></i><i class="th-w l">${feathers(4)}</i><i class="th-w r">${feathers(4)}</i>`
      + `<i class="th-ring soft"></i>${themeFx(f, 1)}${particles(N(9), 'th-p')}`;
    front = '<i class="th-flare"></i>';
  } else if (t === 'mythic' || t === 'divine') {
    const D = t === 'divine';
    pre = gem; post = gem;
    frame = `<i class="th-bd"><i class="th-spin"></i>${D ? '<i class="th-spin b"></i>' : ''}</i><i class="th-aur"></i>${D ? '<i class="th-sf"></i>' : ''}`;
    back = `<i class="th-pil"></i><i class="th-mc"><i class="th-mci">${CIRCLE}</i></i>${D ? `<i class="th-mc b"><i class="th-mci">${CIRCLE}</i></i>` : ''}<i class="th-halo"></i>${D ? '<i class="th-halo b"></i>' : ''}`
      + `<i class="th-rib l"></i><i class="th-rib r"></i>`
      + `<i class="th-w l big">${feathers(D ? 9 : 6)}</i><i class="th-w r big">${feathers(D ? 9 : 6)}</i>`
      + `<i class="th-ring"></i><i class="th-ring b"></i>${D ? '<i class="th-ring c"></i>' : ''}${shards(N(D ? 18 : 14))}${themeFx(f, D ? 2 : 1.5)}${particles(N(D ? 16 : 12), 'th-p')}`;
    front = orbit(0) + orbit(1) + orbit(2) + (D ? orbit(1.5, 'wide') : '') + `<i class="th-cr">${CROWN}</i>` + (D ? '<i class="th-hl"></i>' : '') + '<i class="th-flare"></i>';
  }
  return `${back}<span class="th t-${t}${f ? ' fx-' + f : ''}">${frame}${pre}${text}${post}</span>${front}`;
}

// ใส่/อัปเดตป้ายฉายาให้ element (คืน true เมื่อเปลี่ยนจริง)
export function paintHonor(el, title, tier, fx) {
  const t = TIER_ORDER.includes(tier) ? tier : 'common', f = HIGH.has(t) ? fx || DEFAULT_FX[t] : '';
  const sig = `${title}|${t}|${f}`;
  if (el._thSig === sig) return false;
  el._thSig = sig;
  el.className = `tag-honor h-${t}${f ? ' hf-' + f : ''}`;
  el.innerHTML = title ? honorInner(title, t, f) : '';
  return true;
}
export const honorClass = (tier, fx) => { const f = HIGH.has(tier) ? fx || DEFAULT_FX[tier] : ''; return `h-${tier}${f ? ' hf-' + f : ''}`; };

let injected = false;
export function injectTitleCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const st = document.createElement('style');
  st.id = 'title-fx-css';
  st.textContent = CSS;
  document.head.append(st);
}

const CSS = `
.tag-honor{position:absolute;left:0;top:0;pointer-events:none;white-space:nowrap;will-change:transform;line-height:1.2;font-size:11.5px;font-weight:600;letter-spacing:.02em}
.th-inline{position:relative;display:inline-block;white-space:nowrap;line-height:1.2;font-size:11.5px;font-weight:600;letter-spacing:.02em;vertical-align:middle}
.th-inline > i, .tag-honor > i{position:absolute;pointer-events:none}
.th{position:relative;z-index:2;display:inline-flex;align-items:center;gap:5px;padding:1px 9px;border-radius:999px;background:rgba(20,12,30,.62);border:1px solid rgba(255,214,140,.25);color:#dfe8f4;text-shadow:0 1px 2px rgba(0,0,0,.85);isolation:isolate}
.th > i{position:relative}
.th-t{position:relative;z-index:3}
.th.t-common .th-t::before{content:'« ';opacity:.6}.th.t-common .th-t::after{content:' »';opacity:.6}

/* ---------- ธีมสี ---------- */
.hf-gold,.fx-gold{--a:#e8a52a;--b:#fff1b8;--c:#8a5212;--g:255,190,70;--gem:#ffd36a}
.hf-frost,.fx-frost{--a:#5cc8ff;--b:#f2fbff;--c:#1f5c9a;--g:120,210,255;--gem:#bff0ff}
.hf-flame,.fx-flame{--a:#ff7a2a;--b:#fff0a8;--c:#9a2208;--g:255,120,40;--gem:#ffb35a}
.hf-arcane,.fx-arcane{--a:#3fe0a0;--b:#eafff4;--c:#0e6a52;--g:70,240,170;--gem:#9effd6}
.hf-crimson,.fx-crimson{--a:#ff3a52;--b:#ffd6dc;--c:#6e0a1c;--g:255,60,90;--gem:#ff8a9a}
.hf-storm,.fx-storm{--a:#ffe14a;--b:#f4fdff;--c:#2a5ab8;--g:140,220,255;--gem:#fff27a}
.hf-sakura,.fx-sakura{--a:#ff8fc8;--b:#fff0f7;--c:#a83a78;--g:255,150,205;--gem:#ffd0e8}
.hf-shadow,.fx-shadow{--a:#a070ff;--b:#efe4ff;--c:#2a0e52;--g:150,100,255;--gem:#c8a8ff}
.hf-prism,.fx-prism{--a:#c58bff;--b:#ffffff;--c:#4a2a8a;--g:200,160,255;--gem:#fff}
.hf-celestial,.fx-celestial{--a:#ffd36a;--b:#ffffff;--c:#6a7ac8;--g:255,236,170;--gem:#fff6c8}
.hf-void,.fx-void{--a:#8a5cff;--b:#d8fbff;--c:#12052e;--g:130,90,255;--gem:#5ef2ff}
.hf-inferno,.fx-inferno{--a:#ff4a1a;--b:#fff3b0;--c:#4a0800;--g:255,90,30;--gem:#ffd040}
.hf-genesis,.fx-genesis{--a:#ffd76a;--b:#ffffff;--c:#b07a20;--g:255,240,190;--gem:#ffffff}
.hf-abyss,.fx-abyss{--a:#e0284a;--b:#ffe0e8;--c:#0a0010;--g:200,20,70;--gem:#ff5a7a}
.hf-astral,.fx-astral{--a:#6aa8ff;--b:#ffffff;--c:#140a50;--g:120,170,255;--gem:#bfe0ff}

/* ---------- หายาก ---------- */
.th.t-rare{color:#9ad6ff;border-color:rgba(127,196,255,.65);box-shadow:0 0 8px rgba(80,160,255,.4),inset 0 0 6px rgba(80,160,255,.2);overflow:hidden;animation:th-glowB 2.6s ease-in-out infinite}
.th.t-rare::after{content:'';position:absolute;inset:-2px;background:linear-gradient(105deg,transparent 38%,rgba(220,240,255,.8) 50%,transparent 62%);background-size:260% 100%;background-position:160% 0;animation:th-sweep 3s ease-in-out infinite;z-index:4;mix-blend-mode:screen}
.th.t-rare .th-t::before{content:'✧ ';color:#cfeaff}.th.t-rare .th-t::after{content:' ✧';color:#cfeaff}
@keyframes th-sweep{0%{background-position:160% 0}55%,100%{background-position:-60% 0}}
@keyframes th-glowB{0%,100%{box-shadow:0 0 6px rgba(80,160,255,.35),inset 0 0 6px rgba(80,160,255,.2)}50%{box-shadow:0 0 13px rgba(80,170,255,.7),inset 0 0 8px rgba(120,190,255,.35)}}

/* ---------- ระดับตำนาน ---------- */
.th.t-epic{font-size:12px;border:1px solid transparent;background:linear-gradient(rgba(30,12,44,.8),rgba(30,12,44,.8)) padding-box,linear-gradient(90deg,#b46cff,#ff7ad9,#7a8cff,#b46cff) border-box;background-size:100% 100%,300% 100%;animation:th-bd 3s linear infinite,th-glowE 2.4s ease-in-out infinite}
.th.t-epic .th-t{background:linear-gradient(90deg,#f0c8ff,#ff9ade,#b2c0ff,#f0c8ff);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.8)) drop-shadow(0 0 3px rgba(220,130,255,.6));animation:th-flow 2.4s linear infinite}
.h-epic{--a:#c87aff;--b:#ffe0ff;--g:210,130,255}
.th-gem{z-index:3;width:5px;height:5px;transform:rotate(45deg);background:linear-gradient(135deg,#fff,var(--gem,#d79bff));box-shadow:0 0 6px var(--gem,#d79bff);animation:th-gem 1.8s ease-in-out infinite;flex:none}
.th-gem:last-child{animation-delay:-.9s}
.th-tw{left:var(--x);top:var(--y);width:9px;height:9px;z-index:3;background:radial-gradient(circle,#fff 0 18%,transparent 22%),linear-gradient(0deg,transparent 44%,#fff 48% 52%,transparent 56%),linear-gradient(90deg,transparent 44%,#fff 48% 52%,transparent 56%);filter:drop-shadow(0 0 3px #e4a8ff);animation:th-tw 2.4s ease-in-out infinite;animation-delay:var(--d);opacity:0}
.th-tw.s{width:7px;height:7px;filter:drop-shadow(0 0 3px #8fd0ff)}
@keyframes th-bd{to{background-position:0 0,300% 0}}
@keyframes th-flow{to{background-position:200% 0}}
@keyframes th-glowE{0%,100%{box-shadow:0 0 8px rgba(190,110,255,.35)}50%{box-shadow:0 0 16px rgba(220,120,255,.75)}}
@keyframes th-gem{0%,100%{transform:rotate(45deg) scale(.8);opacity:.75}50%{transform:rotate(45deg) scale(1.3);opacity:1}}
@keyframes th-tw{0%,100%{transform:scale(0) rotate(0);opacity:0}45%{transform:scale(1) rotate(45deg);opacity:1}70%{transform:scale(.6) rotate(80deg);opacity:.5}}

/* ---------- ในตำนาน ---------- */
.th.t-legend{font-size:13px;padding:2px 12px;background:linear-gradient(180deg,rgba(40,24,8,.85),rgba(14,8,4,.9));border:1px solid rgba(var(--g),.95);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 0 2px rgba(var(--g),.4),0 0 16px rgba(var(--g),.55),inset 0 0 9px rgba(var(--g),.3);animation:th-bob 3s ease-in-out infinite,th-glowL 2.2s ease-in-out infinite}
@keyframes th-glowL{0%,100%{box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 0 2px rgba(var(--g),.4),0 0 12px rgba(var(--g),.45),inset 0 0 9px rgba(var(--g),.3)}50%{box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 0 2px rgba(var(--g),.7),0 0 24px rgba(var(--g),.85),inset 0 0 12px rgba(var(--g),.45)}}
.th.t-legend .th-t,.th.t-mythic .th-t,.th.t-divine .th-t{background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.95) 50%,transparent 70%),linear-gradient(180deg,var(--b) 0%,var(--b) 30%,var(--a) 58%,var(--c) 100%);background-size:260% 100%,100% 100%;background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;filter:drop-shadow(0 1px 0 rgba(0,0,0,.9)) drop-shadow(0 0 4px rgba(var(--g),.7));animation:th-shine 2.6s ease-in-out infinite}
@keyframes th-shine{0%{background-position:170% 0,0 0}60%,100%{background-position:-70% 0,0 0}}
.th-ray,.th-halo{left:50%;top:50%;width:170%;aspect-ratio:1;max-width:170px;min-width:120px;translate:-50% -50%;border-radius:50%;z-index:0;background:repeating-conic-gradient(rgba(var(--g),.6) 0 6deg,transparent 6deg 22deg);-webkit-mask:radial-gradient(circle,#000 0 16%,rgba(0,0,0,.5) 34%,transparent 62%);mask:radial-gradient(circle,#000 0 16%,rgba(0,0,0,.5) 34%,transparent 62%);animation:th-rot 14s linear infinite;opacity:.6}
.th-ray.b{background:repeating-conic-gradient(rgba(255,255,255,.4) 0 2deg,transparent 2deg 13deg);animation-duration:22s;animation-direction:reverse;opacity:.5;max-width:130px}
@keyframes th-rot{to{rotate:360deg}}
.th-w{top:50%;width:30px;height:24px;z-index:1;translate:0 -58%}
.th-w.l{right:calc(100% - 6px);transform-origin:100% 60%;animation:th-flapL 2.2s ease-in-out infinite}
.th-w.r{left:calc(100% - 6px);transform-origin:0 60%;animation:th-flapR 2.2s ease-in-out infinite;--k:-1}
.th-f{position:absolute;right:0;top:50%;height:6px;width:var(--fw,24px);border-radius:6px 0 0 6px;background:linear-gradient(90deg,transparent,rgba(var(--g),.4) 18%,var(--b) 72%,var(--a));box-shadow:0 0 6px rgba(var(--g),.7);transform-origin:100% 50%;rotate:calc(var(--k,1)*var(--fr,0deg));translate:0 var(--fy,0)}
.th-w.r .th-f{right:auto;left:0;transform-origin:0 50%;border-radius:0 6px 6px 0;background:linear-gradient(270deg,transparent,rgba(var(--g),.4) 18%,var(--b) 72%,var(--a))}
.th-f:nth-child(1){--fw:28px;--fr:30deg;--fy:-12px}.th-f:nth-child(2){--fw:25px;--fr:16deg;--fy:-7px}.th-f:nth-child(3){--fw:21px;--fr:3deg;--fy:-2px}.th-f:nth-child(4){--fw:15px;--fr:-12deg;--fy:3px}
.th-f:nth-child(5){--fw:34px;--fr:42deg;--fy:-17px;opacity:.75}.th-f:nth-child(6){--fw:11px;--fr:-24deg;--fy:6px}
.th-f:nth-child(7){--fw:40px;--fr:54deg;--fy:-22px;opacity:.6;filter:blur(.5px)}.th-f:nth-child(8){--fw:36px;--fr:24deg;--fy:-14px;opacity:.55;filter:blur(.6px)}.th-f:nth-child(9){--fw:30px;--fr:6deg;--fy:-6px;opacity:.5;filter:blur(.7px)}
.th-w.sm{width:20px;height:16px}.th-w.sm .th-f{height:4px}.th-w.sm .th-f:nth-child(1){--fw:16px;--fr:22deg;--fy:-5px}.th-w.sm .th-f:nth-child(2){--fw:12px;--fr:2deg;--fy:0}
.h-epic .th-w .th-f{background:linear-gradient(90deg,transparent,rgba(210,130,255,.4),#ffe0ff);box-shadow:0 0 4px rgba(210,130,255,.7)}
.h-epic .th-w.r .th-f{background:linear-gradient(270deg,transparent,rgba(210,130,255,.4),#ffe0ff)}
.th-w.big{width:40px;height:30px}
@keyframes th-flapL{0%,100%{transform:rotate(0)}50%{transform:rotate(-16deg)}}
@keyframes th-flapR{0%,100%{transform:rotate(0)}50%{transform:rotate(16deg)}}
.th-rib{top:62%;width:16px;height:12px;z-index:1;background:linear-gradient(180deg,var(--a),var(--c));box-shadow:0 0 5px rgba(var(--g),.6)}
.th-rib.l{left:2px;clip-path:polygon(100% 0,0 0,30% 50%,0 100%,100% 100%);transform-origin:100% 0;animation:th-ribL 2.6s ease-in-out infinite}
.th-rib.r{right:2px;clip-path:polygon(0 0,100% 0,70% 50%,100% 100%,0 100%);transform-origin:0 0;animation:th-ribR 2.6s ease-in-out infinite}
@keyframes th-ribL{0%,100%{transform:rotate(18deg) translateY(2px)}50%{transform:rotate(26deg) translateY(4px)}}
@keyframes th-ribR{0%,100%{transform:rotate(-18deg) translateY(2px)}50%{transform:rotate(-26deg) translateY(4px)}}
.th-p{left:var(--x);bottom:20%;width:3px;height:3px;border-radius:50%;z-index:1;background:var(--b);box-shadow:0 0 5px 1px rgba(var(--g),.95);animation:th-rise 3.2s linear infinite;animation-delay:var(--d);scale:var(--s);opacity:0}
@keyframes th-rise{0%{transform:translate(0,0);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),-36px);opacity:0}}
.th-flare{right:-4px;top:50%;width:22px;height:22px;translate:0 -50%;z-index:5;background:radial-gradient(circle,#fff 0 8%,transparent 14%),linear-gradient(0deg,transparent 47%,rgba(255,255,255,.95) 50%,transparent 53%),linear-gradient(90deg,transparent 46%,rgba(255,255,255,.9) 50%,transparent 54%);filter:drop-shadow(0 0 4px rgba(var(--g),1));animation:th-flare 2.6s ease-in-out infinite;opacity:0}
@keyframes th-flare{0%,40%{transform:scale(0) rotate(0);opacity:0}52%{transform:scale(1.2) rotate(45deg);opacity:1}70%,100%{transform:scale(0) rotate(90deg);opacity:0}}
.th-ring{left:50%;top:50%;width:76px;height:28px;border-radius:50%;translate:-50% -50%;border:2px solid var(--b);box-shadow:0 0 9px rgba(var(--g),.95),inset 0 0 7px rgba(var(--g),.85);z-index:1;opacity:0;animation:th-ring 3.6s cubic-bezier(.2,.7,.3,1) infinite}
.th-ring.b{animation-delay:.18s;border-width:1px}
.th-ring.c{animation-delay:.36s;border-width:3px;filter:blur(1px)}
.th-ring.soft{border-width:1px;animation-duration:4.2s}
@keyframes th-ring{0%,62%{transform:scale(.4);opacity:0}64%{opacity:1}100%{transform:scale(2.8);opacity:0}}
.h-legend .th,.h-mythic .th,.h-divine .th{animation-name:th-bob}

/* ---------- เอฟเฟ็กธีม ---------- */
.th-fl{left:var(--x);bottom:30%;width:8px;height:14px;z-index:0;border-radius:50% 50% 35% 35%/65% 65% 35% 35%;background:linear-gradient(0deg,var(--a),var(--b) 70%,transparent);filter:blur(.4px);box-shadow:0 0 6px rgba(var(--g),.9);transform-origin:50% 100%;animation:th-flame 1.4s ease-out infinite;animation-delay:calc(var(--d) * .45);opacity:0;scale:var(--s)}
@keyframes th-flame{0%{transform:translate(0,4px) scale(.5,.4);opacity:0}25%{opacity:.95}100%{transform:translate(calc(var(--dx)*.4),-26px) scale(.2,1.2);opacity:0}}
.th-sn{left:var(--x);top:-12px;width:4px;height:4px;z-index:1;background:radial-gradient(circle,#fff 0 30%,var(--b) 45%,transparent 70%);box-shadow:0 0 5px rgba(var(--g),.9);border-radius:50%;animation:th-fall 3.4s linear infinite;animation-delay:var(--d);opacity:0;scale:var(--s)}
@keyframes th-fall{0%{transform:translate(0,-10px);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),40px);opacity:0}}
.th-pe{left:var(--x);top:-10px;width:6px;height:4px;z-index:3;border-radius:80% 0 80% 0;background:linear-gradient(135deg,#fff,var(--a));box-shadow:0 0 3px rgba(var(--g),.7);animation:th-petal 3.6s linear infinite;animation-delay:var(--d);opacity:0;scale:var(--s)}
@keyframes th-petal{0%{transform:translate(0,-8px) rotate(var(--rz));opacity:0}15%{opacity:1}100%{transform:translate(calc(var(--dx)*1.8),44px) rotate(calc(var(--rz) + 400deg));opacity:0}}
.th-rn{left:var(--x);bottom:10%;width:7px;height:7px;z-index:1;border:1.5px solid var(--b);box-shadow:0 0 5px rgba(var(--g),1);rotate:45deg;animation:th-rune 3s ease-out infinite;animation-delay:var(--d);opacity:0}
.th-rn:nth-of-type(2n){border-radius:50%}.th-rn:nth-of-type(3n){rotate:0deg;clip-path:polygon(50% 0,100% 100%,0 100%);background:var(--b);border:0}
@keyframes th-rune{0%{transform:translateY(0) scale(.4);opacity:0}25%{opacity:1}100%{transform:translateY(-34px) scale(1.1);opacity:0}}
.th-bolt{top:50%;width:10px;height:24px;z-index:4;translate:0 -50%;filter:drop-shadow(0 0 4px rgba(var(--g),1)) drop-shadow(0 0 2px #fff);opacity:0;animation:th-bolt 2.2s steps(1) infinite}
.th-bolt svg{width:100%;height:100%;display:block}.th-bolt path{fill:var(--a);stroke:#fff;stroke-width:.8}
.th-bolt.l{left:-16px;rotate:-20deg}.th-bolt.r{right:-16px;rotate:20deg;animation-delay:-1.1s}.th-bolt.t{left:50%;top:-14px;rotate:8deg;animation-delay:-.5s}
@keyframes th-bolt{0%,70%{opacity:0}72%{opacity:1}76%{opacity:.2}78%{opacity:1}84%,100%{opacity:0}}
.th-vx{left:50%;top:50%;width:120px;height:46px;translate:-50% -50%;border-radius:50%;z-index:0;background:conic-gradient(from 0deg,transparent,rgba(var(--g),.7),transparent 30%,rgba(var(--g),.55),transparent 60%,rgba(var(--g),.7),transparent);-webkit-mask:radial-gradient(closest-side,transparent 30%,#000 50%,transparent 100%);mask:radial-gradient(closest-side,transparent 30%,#000 50%,transparent 100%);animation:th-rot 3s linear infinite reverse;opacity:.85}
.th-sm{left:var(--x);top:-6px;width:5px;height:5px;border-radius:50%;z-index:1;background:var(--b);box-shadow:0 0 6px 2px rgba(var(--g),.95);animation:th-sink 2.8s ease-in infinite;animation-delay:var(--d);opacity:0}
@keyframes th-sink{0%{transform:translate(var(--dx),-22px);opacity:0}30%{opacity:1}100%{transform:translate(0,16px) scale(.2);opacity:0}}
.th-mist{left:50%;top:50%;width:140%;height:240%;translate:-50% -50%;z-index:0;border-radius:50%;background:radial-gradient(closest-side,rgba(var(--g),.55),transparent);animation:th-mist 2s ease-in-out infinite}
@keyframes th-mist{0%,100%{transform:scale(.85);opacity:.5}50%{transform:scale(1.1);opacity:.95}}
.th-arc{left:50%;bottom:30%;width:150px;height:75px;translate:-50% 0;z-index:0;border-radius:150px 150px 0 0;background:radial-gradient(circle at 50% 100%,transparent 55%,#ff6b6b 56%,#ffd36b 61%,#7dff8a 66%,#6be4ff 71%,#a78bff 76%,transparent 80%);opacity:.5;-webkit-mask:linear-gradient(0deg,transparent,#000 60%);mask:linear-gradient(0deg,transparent,#000 60%);animation:th-arc 4s ease-in-out infinite}
@keyframes th-arc{0%,100%{opacity:.3;filter:hue-rotate(0)}50%{opacity:.65;filter:hue-rotate(60deg)}}

/* ---------- เหนือตำนาน / เทพนิรันดร์ ---------- */
.th.t-mythic,.th.t-divine{font-size:14px;padding:3px 14px;border:0;background:transparent;box-shadow:0 0 18px rgba(var(--g),.6),0 0 38px rgba(var(--g),.3);gap:6px;animation:th-bob 3s ease-in-out infinite}
.th.t-divine{font-size:15px;padding:4px 16px;animation:th-bob 3s ease-in-out infinite,th-pop 5s ease-in-out infinite}
@keyframes th-pop{0%,80%,100%{transform:scale(1);filter:brightness(1)}84%{transform:scale(1.1);filter:brightness(1.6)}90%{transform:scale(.98);filter:brightness(1.1)}}
@keyframes th-bob{0%,100%{translate:0 0}50%{translate:0 -1.5px}}
.th-bd{position:absolute!important;inset:0;border-radius:inherit;overflow:hidden;z-index:-2}
.th-spin{position:absolute!important;left:50%;top:50%;width:260%;aspect-ratio:1;translate:-50% -50%;background:conic-gradient(from 0deg,var(--c),var(--a),var(--b),var(--a),var(--c),var(--a),var(--b),var(--a),var(--c));animation:th-rot 2.8s linear infinite}
.th-spin.b{background:conic-gradient(transparent 0 70%,rgba(255,255,255,.95) 80%,transparent 90%);animation-duration:1.6s;animation-direction:reverse}
.th-aur{position:absolute!important;inset:1.5px;border-radius:inherit;z-index:-1;overflow:hidden;background:radial-gradient(120% 140% at 20% 120%,rgba(var(--g),.5),transparent 55%),radial-gradient(120% 140% at 85% -30%,rgba(255,255,255,.2),transparent 55%),linear-gradient(180deg,#140a26,#06030f);background-size:200% 100%,200% 100%,100% 100%;animation:th-aur 5s ease-in-out infinite alternate}
.t-divine .th-aur{inset:2px}
@keyframes th-aur{0%{background-position:0 0,100% 0,0 0}100%{background-position:100% 0,0 0,0 0}}
.th-sf{position:absolute!important;inset:2px;border-radius:inherit;z-index:-1;background-image:radial-gradient(1px 1px at 10% 30%,#fff,transparent),radial-gradient(1px 1px at 30% 70%,#fff,transparent),radial-gradient(1.5px 1.5px at 55% 25%,#fff,transparent),radial-gradient(1px 1px at 75% 65%,#fff,transparent),radial-gradient(1px 1px at 90% 35%,#fff,transparent),radial-gradient(1px 1px at 42% 50%,#fff,transparent);background-size:60px 100%;animation:th-sf 6s linear infinite;opacity:.85}
@keyframes th-sf{to{background-position:60px 0}}
.th-halo{max-width:200px;min-width:150px;opacity:.75;animation-duration:9s}
.th-halo.b{background:repeating-conic-gradient(rgba(255,255,255,.55) 0 3deg,transparent 3deg 15deg);animation-direction:reverse;animation-duration:16s;max-width:240px;min-width:180px;opacity:.6}
.th-pil{left:50%;bottom:40%;width:46px;height:110px;translate:-50% 0;z-index:0;background:linear-gradient(0deg,rgba(var(--g),.75),rgba(var(--g),.25) 55%,transparent);-webkit-mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent);mask:linear-gradient(90deg,transparent,#000 35%,#000 65%,transparent);animation:th-pil 3s ease-in-out infinite;transform-origin:50% 100%}
.h-divine .th-pil{width:64px;height:150px}
@keyframes th-pil{0%,100%{opacity:.45;transform:scaleX(.8)}50%{opacity:.95;transform:scaleX(1.15)}}
.th-mc{left:50%;top:62%;width:150px;height:150px;translate:-50% -50%;z-index:0;transform:scaleY(.3)}
.th-mc.b{width:200px;height:200px}
.th-mci{position:absolute;inset:0;animation:th-rot 12s linear infinite;filter:drop-shadow(0 0 3px rgba(var(--g),1))}
.th-mc.b .th-mci{animation-duration:18s;animation-direction:reverse;opacity:.7}
.th-mci svg{width:100%;height:100%;display:block;overflow:visible}
.th-mci .m1{fill:none;stroke:var(--b);stroke-width:1.5}
.th-mci .m2{fill:none;stroke:var(--a);stroke-width:2.5;stroke-dasharray:3 4}
.th-mci .m3{fill:rgba(var(--g),.12);stroke:var(--b);stroke-width:1}
.th-mci .m4{fill:none;stroke:var(--a);stroke-width:1.2;opacity:.9}
.th-sh{left:50%;top:50%;width:8px;height:2px;border-radius:2px;z-index:1;background:linear-gradient(90deg,transparent,var(--b));box-shadow:0 0 5px rgba(var(--g),1);transform:rotate(var(--ang)) translateX(6px);opacity:0;animation:th-shard 3.6s cubic-bezier(.15,.8,.3,1) infinite}
@keyframes th-shard{0%,62%{transform:rotate(var(--ang)) translateX(6px) scaleX(.4);opacity:0}64%{opacity:1}100%{transform:rotate(var(--ang)) translateX(var(--len)) scaleX(1.6);opacity:0}}
.hf-prism .th-sh,.hf-prism .th-p,.hf-genesis .th-sh{background:hsl(var(--h) 100% 74%);box-shadow:0 0 5px hsl(var(--h) 100% 60%)}
.th-o{left:50%;top:50%;width:0;height:0;z-index:4;animation:th-ox 2.6s ease-in-out infinite alternate;animation-delay:var(--od)}
.th-oy{position:absolute!important;animation:th-oy 2.6s ease-in-out infinite alternate;animation-delay:calc(var(--od) - 1.3s)}
.th-star{position:absolute!important;width:7px;height:7px;border-radius:50%;translate:-50% -50%;background:radial-gradient(circle,#fff 0 25%,var(--b) 35%,transparent 70%);box-shadow:0 0 7px 2px rgba(var(--g),.95)}
.th-o.sm .th-star{width:5px;height:5px}
.th-o.sm{animation-name:th-oxs}.th-o.sm .th-oy{animation-name:th-oys}
.th-o.wide{animation-name:th-oxw}.th-o.wide .th-oy{animation-name:th-oyw}
@keyframes th-ox{from{transform:translateX(-64px)}to{transform:translateX(64px)}}
@keyframes th-oy{from{transform:translateY(-15px)}to{transform:translateY(15px)}}
@keyframes th-oxs{from{transform:translateX(-50px)}to{transform:translateX(50px)}}
@keyframes th-oys{from{transform:translateY(-11px)}to{transform:translateY(11px)}}
@keyframes th-oxw{from{transform:translateX(-88px)}to{transform:translateX(88px)}}
@keyframes th-oyw{from{transform:translateY(-22px)}to{transform:translateY(22px)}}
.th-cr{left:50%;bottom:calc(100% - 3px);width:24px;height:14px;translate:-50% 0;z-index:5;filter:drop-shadow(0 0 5px rgba(var(--g),1));animation:th-crown 2.4s ease-in-out infinite}
.h-divine .th-cr{width:28px;height:16px;bottom:calc(100% - 1px)}
.th-cr svg{display:block;width:100%;height:100%;overflow:visible}.th-cr .c1{fill:var(--a);stroke:rgba(20,8,2,.9);stroke-width:1}.th-cr .c2{fill:var(--b)}.th-cr circle{fill:#fff}
@keyframes th-crown{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.th-hl{left:50%;bottom:calc(100% + 13px);width:40px;height:9px;translate:-50% 0;z-index:4;border-radius:50%;border:2.5px solid var(--b);box-shadow:0 0 8px rgba(var(--g),1),0 0 3px #fff,inset 0 0 5px rgba(var(--g),1);animation:th-crown 2.4s ease-in-out infinite;animation-delay:-.4s}
.th.t-mythic .th-t,.th.t-divine .th-t{animation:th-shine 2.4s ease-in-out infinite,th-glitch 5s steps(1) infinite}
@keyframes th-glitch{0%,93%,100%{filter:drop-shadow(0 1px 0 rgba(0,0,0,.9)) drop-shadow(0 0 5px rgba(var(--g),.85))}94%{filter:drop-shadow(-1.5px 0 0 rgba(255,60,200,.9)) drop-shadow(1.5px 0 0 rgba(60,240,255,.9))}96%{filter:drop-shadow(1px 0 0 rgba(255,60,200,.9)) drop-shadow(-1px 0 0 rgba(60,240,255,.9))}}
.fx-prism .th-t,.fx-genesis .th-t{background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.95) 50%,transparent 70%),linear-gradient(90deg,#ff8b8b,#ffe07b,#9bffaa,#7beaff,#b49bff,#ff8be0,#ff8b8b)!important;background-size:260% 100%,300% 100%!important;-webkit-background-clip:text!important;background-clip:text!important;animation:th-hue 4s linear infinite,th-glitch 5s steps(1) infinite!important}
.fx-genesis .th-t{background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,1) 50%,transparent 70%),linear-gradient(90deg,#fff6d0,#ffd76a,#ffffff,#bfe8ff,#ffd76a,#fff6d0)!important;background-size:260% 100%,300% 100%!important;-webkit-background-clip:text!important;background-clip:text!important}
@keyframes th-hue{0%{background-position:170% 0,0 0}60%{background-position:-70% 0,180% 0}100%{background-position:-70% 0,300% 0}}
.fx-prism .th-spin:not(.b){background:conic-gradient(#ff6b6b,#ffd36b,#7dff8a,#6be4ff,#a78bff,#ff7bd5,#ff6b6b)}
.fx-genesis .th-spin:not(.b){background:conic-gradient(#fff,#ffd76a,#ff9ae6,#fff,#7beaff,#ffd76a,#fff)}
.hf-prism .th-halo:not(.b){background:repeating-conic-gradient(rgba(255,120,120,.5) 0 6deg,transparent 6deg 15deg,rgba(120,220,255,.5) 15deg 21deg,transparent 21deg 30deg,rgba(200,140,255,.5) 30deg 36deg,transparent 36deg 45deg)}
.hf-void .th-halo,.hf-abyss .th-halo:not(.b){animation-direction:reverse}
.hf-void .th-p,.hf-abyss .th-p{animation-name:th-sink}
.hf-inferno .th-p,.hf-flame .th-p,.hf-abyss .th-p{border-radius:50% 50% 50% 0;background:linear-gradient(var(--b),var(--a))}
.hf-abyss .th-aur{background:radial-gradient(120% 140% at 50% 130%,rgba(var(--g),.65),transparent 60%),linear-gradient(180deg,#1a0006,#000);animation:none}

/* สมุดสะสม: ชื่อฉายาแบบนิ่ง */
.cw-honor.t-mythic,.cw-honor.t-legend,.cw-honor.t-divine{background:linear-gradient(180deg,var(--b,#fff1b8),var(--a,#e8a52a));-webkit-background-clip:text;background-clip:text;color:transparent}
.cw-honor.hf-prism,.cw-honor.hf-genesis{background:linear-gradient(90deg,#ff7b7b,#ffd76b,#8bff9a,#6be4ff,#a78bff,#ff7bd5);-webkit-background-clip:text;background-clip:text}
.cw-honor.t-epic{background:linear-gradient(90deg,#f0c8ff,#ff9ade,#b2c0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.cw-ach:not(.done) .cw-honor{background:none;color:var(--muted,#8a8a9a)}
.cw-tier{display:inline-block;margin-left:4px;padding:0 6px;border-radius:8px;font-size:10px;border:1px solid currentColor;opacity:.85}
.cw-tier.t-divine{color:#fff2a8;box-shadow:0 0 6px #fff2a8}.cw-tier.t-mythic{color:#ff9ae6}.cw-tier.t-legend{color:#ffb347}.cw-tier.t-epic{color:#d49bff}.cw-tier.t-rare{color:#7fc4ff}.cw-tier.t-common{color:#cfd8e4}

@media (prefers-reduced-motion: reduce){
  .tag-honor *,.th-inline *{animation-duration:0s!important;animation-iteration-count:1!important}
  .th-p,.th-sh,.th-ring,.th-tw,.th-fl,.th-sn,.th-pe,.th-rn,.th-sm,.th-bolt{display:none}
}
`;
