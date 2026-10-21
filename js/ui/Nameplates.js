// v0.36 กรอบป้ายชื่อตัวละคร 7 ระดับตามเลเวล (ภาพพิกเซลจาก PixelLab · assets/ui/nameplate/tN.png)
// ป้ายเป็นภาพขนาดคงที่ · ชื่ออยู่ในช่องกลางกรอบ (ย่อตัวอักษรเองเมื่อชื่อยาว) · ระดับสูงมีปีก/มงกุฎ/เปลวไฟกินพื้นที่รอบกรอบ
import { emblemSvg } from '../data/guildEmblems.js?v=0.73.0';

export const PLATE_TIERS = [
  { t: 1, min: 1, name: 'ไม้', color: '#c9a27a' },
  { t: 2, min: 20, name: 'เหล็ก', color: '#c8d0dc' },
  { t: 3, min: 40, name: 'เงินขัดเงา', color: '#a8dcff' },
  { t: 4, min: 60, name: 'ทองคำ', color: '#ffcf5a' },
  { t: 5, min: 75, name: 'อเมทิสต์', color: '#d4a8ff' },
  { t: 6, min: 90, name: 'เพลิงมังกร', color: '#ff8a4a' },
  { t: 7, min: 99, name: 'นิรันดร์', color: '#fff2a8' },
];
// [กว้าง, สูง, ช่องข้อความ x, y, กว้าง, สูง] (หน่วย px บนจอ)
export const PLATE_GEO = { 1: [126, 33, 7, 6, 112, 20], 2: [140, 28, 14, 4, 112, 19], 3: [202, 29, 31, 6, 140, 16], 4: [195, 48, 41, 15, 112, 27], 5: [188, 37, 38, 9, 112, 22], 6: [168, 48, 28, 20, 112, 20], 7: [225, 108, 56, 44, 112, 22] };
// v0.37.1: ย่อขนาดที่แสดงในเกม (ป้ายระดับสูงมีปีก/มงกุฎ ใหญ่จนบังตัวละคร)
export const PLATE_SCALE = { 1: 0.9, 2: 0.9, 3: 0.82, 4: 0.78, 5: 0.8, 6: 0.78, 7: 0.65 };
export const plateTier = (lv) => { let t = 1; for (const p of PLATE_TIERS) if ((lv || 1) >= p.min) t = p.t; return t; };

const measure = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const fitSize = (text, maxW, base) => {
  if (!measure) return base;
  for (let s = base; s >= 7.5; s -= 0.5) { measure.font = `600 ${s}px Kanit, sans-serif`; if (measure.measureText(text).width <= maxW) return s; }
  return 7.5;
};

// วาด/อัปเดตป้ายชื่อบน element label (คืน true ถ้ามีการเปลี่ยนแปลง) · คืนค่าเรขาคณิตไว้ใช้วางแถบ HP
// v0.37: guild = { name, emblem } (ป้ายกิลด์เหนือกรอบ) · party = เพื่อนร่วมปาร์ตี้ (ชื่อสีเขียว)
// v0.58 มือถือจอเล็ก: ย่อป้ายชื่อลงอีก (ไม่บังตัวละคร)
const mobileK = () => (typeof document !== 'undefined' && document.body && document.body.classList.contains('touch') && Math.min(innerWidth, innerHeight) <= 520 ? 0.72 : 1);
export function paintPlate(el, name, lv, guild = null, party = false, vip = false) {
  const mk = mobileK(), t = plateTier(lv), sig = `${mk}|${t}|${name}|${lv}|${guild ? guild.name + guild.emblem : ''}|${party ? 1 : 0}|${vip ? 1 : 0}`;
  if (el._npSig === sig) return el._npGeo;
  el._npSig = sig;
  const k = (PLATE_SCALE[t] || 1) * mk, [W, H, ix, iy, iw, ih] = PLATE_GEO[t].map((v) => Math.round(v * k));
  el.classList.add('np'); el.classList.toggle('np-party', !!party); el.classList.toggle('np-vip', !!vip); for (let k = 1; k <= 7; k++) el.classList.toggle('np-t' + k, k === t);
  el.style.width = W + 'px'; el.style.height = H + 'px';
  const lvTxt = String(lv || 1), lvW = 6 + lvTxt.length * 6;
  const fs = fitSize(name, iw - lvW - 8, ih >= 18 ? 12 : ih >= 15 ? 11 : ih >= 12 ? 10 : 8.5);
  el.innerHTML = `<span class="np-in" style="left:${ix}px;top:${iy}px;width:${iw}px;height:${ih}px"><b class="np-lv${ih < 15 ? ' sm' : ''}">${lvTxt}</b><span class="np-name" style="font-size:${fs}px"></span></span>${vip ? `<b class="np-vipb" style="top:${iy + Math.round(ih / 2)}px">VIP</b>` : ''}${guild ? `<span class="np-guild" style="top:${iy + ih + 10}px"><i>${emblemSvg(guild.emblem)}</i><span></span></span>` : ''}${t === 7 ? '<i class="np-star" style="left:18%;top:20%"></i><i class="np-star" style="right:16%;top:34%;animation-delay:-.7s"></i><i class="np-star" style="left:48%;top:4%;animation-delay:-1.3s"></i>' : ''}`;
  el.querySelector('.np-name').textContent = name;
  if (guild) el.querySelector('.np-guild > span').textContent = guild.name;
  el._npGeo = { top: iy, h: ih };
  return el._npGeo;
}
