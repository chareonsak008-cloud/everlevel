// v0.25.0: รายละเอียดอาวุธชุดใหม่ในหน้าต่างกระเป๋า (ประเภท ธาตุ ค่าสุ่ม พาสซีฟ เซ็ต ตีบวก แหล่งดรอป)
import { describeBonus, bonusText, weaponTypeName } from '../data/items.js?v=0.93.0-p3.23';
import { TRAIT_TH, ELEMENT_COLOR, statToBonus, setInfo, statsToBonus, rollFits, rollScore, rollGrade } from '../data/affixes.js?v=0.93.0-p3.23';
import { REFINE_RATE } from '../data/refine.js?v=0.93.0-p3.23';
import { MONSTERS } from '../data/monsters.js?v=0.93.0-p3.23';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const one = (stat, v) => { const o = statToBonus(stat, v); const [k, x] = Object.entries(o)[0] || []; return k ? bonusText(k, x) : stat; };

// v0.52 บรรทัดค่าสุ่ม: สีเขียว = ดี · แดง = ติดลบ · ✦ ตรงสายอาวุธ · พร้อมเกรดรวม
export function rollLine(it) {
  if (!it.rolls) return '';
  if (!it.rolled) return `<span class="wi-roll">ค่าสุ่มพิเศษ: ได้ 1–3 ค่าตอนดรอป/ซื้อ (มีทั้งค่าดีและค่าติดลบ)</span>`;
  if (!it.rolled.length) return '<span class="wi-roll muted">ค่าสุ่ม: ไม่ได้สักค่า</span>';
  const [g, cls] = rollGrade(rollScore(it, it.rolled));
  return `<span class="wi-roll">ค่าสุ่ม <b class="rg ${cls}">${g}</b>: ${it.rolled.map((r) => `<span class="${r.value < 0 ? 'rbad' : 'rgood'}">${rollFits(it, r.stat) ? '✦' : ''}${esc(one(r.stat, r.value))}</span> <small>[${r.min}~${r.max}]</small>`).join(' · ')}</span>`;
}

export function weaponLines(it, player) {
  const L = [];
  const el = it.element || 'neutral';
  L.push(`<span class="wi-type">${esc(weaponTypeName(it))}${it.twoHand ? ' · สองมือ (ใส่โล่ไม่ได้)' : ''} · <b style="color:${ELEMENT_COLOR[el]}">ธาตุ${TRAIT_TH[el]}</b>${it.weight ? ` · น้ำหนัก ${it.weight}` : ''}</span>`);
  if (it.style) L.push(`<span class="wi-style">แนว: ${esc(it.style)}${it.tradeoff ? ` · <i>จุดแลก: ${esc(it.tradeoff)}</i>` : ''}</span>`);
  L.push(describeBonus(it.baseBonus || it.bonus));
  if (it.rolls) L.push(rollLine(it));
  if (it.passive) L.push(`<span class="wi-passive">✦ พาสซีฟ: ${esc(it.passive.text)}</span>`);
  if (it.set) {
    const s = setInfo(it, player?.equip) || { have: 0, total: it.set.pieces.length };
    L.push(`<span class="wi-set">◆ เซ็ต${esc(it.set.name)} (${s.have}/${s.total} ชิ้นเกราะ): ${Object.entries(it.set.tiers || it.set.bonus).map(([n, b]) => `<span class="${s.have >= +n ? 'on' : ''}">${n} ชิ้น: ${esc(describeBonus(statsToBonus(b)))}</span>`).join(' · ')}</span>`);
  }
  if (it.refinePer) L.push(`<span class="wi-ref">ตีบวกต่อขั้น: ${esc(describeBonus(it.refinePer))} (+8 ขึ้นไปได้ ×2) · โอกาส +5:${REFINE_RATE[5]}% +7:${REFINE_RATE[7]}% +10:${REFINE_RATE[10]}%</span>`);
  if (it.drops && it.drops.length) L.push(`<span class="wi-drop">ดรอป: ${it.drops.map((d) => `${esc(MONSTERS[d.monster]?.name || d.monster)} (${esc(d.map)}) ${+(d.rate * 100).toFixed(2)}%`).join(' · ')}</span>`);
  return L;
}
