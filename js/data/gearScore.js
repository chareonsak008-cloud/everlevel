// v0.94 เทียบอุปกรณ์: คะแนนรวมจากค่าโบนัส (ถ่วงน้ำหนักตามสายอาชีพ) → บอกว่าชิ้นไหนดีกว่าที่ใส่อยู่
import { ITEMS, canJobUse } from './items.js?v=0.93.0-p4.6';

const MAGIC = new Set(['mage', 'wizard', 'archmage', 'acolyte', 'priest', 'goddess']);
const W = { def: 2, mdef: 1.5, maxHp: 0.06, maxSp: 0.06, str: 3, agi: 3, vit: 3, int: 3, dex: 3, luk: 3, hit: 1, flee: 1.2, crit: 120, aspd: 40,
  maxHpPct: 18, maxSpPct: 10, atkPct: 14, matkPct: 14, defPct: 6, healPct: 6, castPct: 6, meleePct: 8, rangedPct: 8, expPct: 4 };

export function gearScore(id, jobId) {
  const it = id && ITEMS[id];
  if (!it || it.type !== 'equip') return 0;
  const magic = MAGIC.has(jobId), b = it.bonus || {};
  let s = 0;
  for (const [k, v] of Object.entries(b)) {
    if (typeof v !== 'number') continue;
    if (k === 'atk') s += v * (magic ? 0.35 : 1);
    else if (k === 'matk') s += v * (magic ? 1 : 0.15);
    else if (k.startsWith('vs_')) s += v * 2;
    else s += v * (W[k] ?? 1);
  }
  return s;
}

// ชิ้นนี้ดีกว่าที่ใส่ในช่องเดียวกันไหม (เฉพาะของที่อาชีพ/เลเวลนี้ใส่ได้) → { better, pct, cur } หรือ null
export function upgradeInfo(player, id) {
  const it = id && ITEMS[id];
  if (!it || it.type !== 'equip' || !player || !player.equip) return null;
  if (!canJobUse(it, player.jobId) || (it.reqLevel || 0) > (player.baseLevel || 1)) return null;
  const curId = player.equip[it.slot] || null;
  if (curId === id) return null;
  const a = gearScore(id, player.jobId), c = curId ? gearScore(curId, player.jobId) : 0;
  if (a <= c * 1.02 || a - c < 1) return null;   // ต่างกันน้อยมาก = ไม่นับ
  return { better: true, pct: c > 0 ? Math.round(((a - c) / c) * 100) : 100, cur: curId };
}
