// v0.76 ฉายาประจำฤดูกาล — มอบให้อันดับ 1–10 ของฤดูกาลที่จบล่าสุด (ถือไว้จนกว่าฤดูกาลถัดไปจะจบ)
// ใครถือฉายาไหน อ่านจากหอเกียรติยศบนเซิร์ฟเวอร์ (season_hall) → ผู้เล่นอื่นอ้างว่ามีฉายานี้เองไม่ได้ (เครื่องเราเช็กกับรายชื่อจริง)
import { ACH_BY_ID } from './collection.js?v=0.89.0';

export const MAX_TITLES = 3;
// band 1 = อันดับ 1 · 2 = อันดับ 2–3 · 3 = อันดับ 4–10
export const SEASON_TITLES = {
  S_tower_1: { title: 'ราชันหอคอยนิรันดร์', tier: 'divine', fx: 'celestial' },
  S_tower_2: { title: 'ผู้พิชิตยอดหอคอย', tier: 'mythic', fx: 'frost' },
  S_tower_3: { title: 'นักไต่หอคอยแห่งยุค', tier: 'legend', fx: 'gold' },
  S_wb_1:    { title: 'จ้าวผู้สยบมหันตภัย', tier: 'divine', fx: 'inferno' },
  S_wb_2:    { title: 'ผู้ปราบอสูรโลกันตร์', tier: 'mythic', fx: 'flame' },
  S_wb_3:    { title: 'นักรบแนวหน้า', tier: 'legend', fx: 'crimson' },
  S_mvp_1:   { title: 'จักรพรรดิแห่ง MVP', tier: 'divine', fx: 'genesis' },
  S_mvp_2:   { title: 'นักล่าบอสในตำนาน', tier: 'mythic', fx: 'storm' },
  S_mvp_3:   { title: 'นักล่าบอสระดับสูง', tier: 'legend', fx: 'storm' },
  S_pd_1:    { title: 'ผู้นำแห่งวิหารจันทรา', tier: 'divine', fx: 'astral' },
  S_pd_2:    { title: 'ผู้พิทักษ์ผนึกจันทรา', tier: 'mythic', fx: 'arcane' },
  S_pd_3:    { title: 'ผู้กล้าแห่งวิหาร', tier: 'legend', fx: 'arcane' },
  S_pvp_1:   { title: 'จอมราชันแห่งสังเวียน', tier: 'divine', fx: 'inferno' },   // v0.78 อารีน่า
  S_pvp_2:   { title: 'ขุนพลไร้พ่าย', tier: 'mythic', fx: 'crimson' },
  S_pvp_3:   { title: 'นักประลองระดับตำนาน', tier: 'legend', fx: 'storm' },
};
export const SEASON_CAT_NAME = { tower: 'หอคอย', wb: 'บอสโลก', mvp: 'MVP', pd: 'ดันเจี้ยนปาร์ตี้', pvp: 'อารีน่า' };
export const seasonTitleId = (cat, rk) => `S_${cat}_${rk === 1 ? 1 : rk <= 3 ? 2 : 3}`;

// ชื่อตัวละคร → ฉายาฤดูกาลที่ถืออยู่
export const SEASON_HOLDERS = new Map();
export const seasonInfo = { season: '' };
export function setSeasonHolders(hall) {
  const last = Array.isArray(hall) ? hall[0] : null;
  SEASON_HOLDERS.clear(); seasonInfo.season = last ? String(last.season || '') : '';
  if (!last || !last.winners) return;
  for (const [cat, list] of Object.entries(last.winners)) for (const w of Array.isArray(list) ? list : []) {
    const id = seasonTitleId(cat, +w.rk || 99); if (!SEASON_TITLES[id] || !w.name) continue;
    if (!SEASON_HOLDERS.has(w.name)) SEASON_HOLDERS.set(w.name, new Set());
    SEASON_HOLDERS.get(w.name).add(id);
  }
}
export const holderTitles = (name) => [...(SEASON_HOLDERS.get(name) || [])];

// รหัสฉายา → { id, title, tier, fx } (ฉายาฤดูกาลต้องเป็นของคนชื่อนี้จริง)
export function titleInfo(id, name) {
  const a = id && ACH_BY_ID[id];
  if (a) return { id, title: a.title, tier: a.tier, fx: a.fx || '' };
  const s = id && SEASON_TITLES[id];
  if (s && SEASON_HOLDERS.has(name) && SEASON_HOLDERS.get(name).has(id)) return { id, ...s, season: true };
  return null;
}
// รายการรหัสที่ใส่อยู่ (รองรับเซฟเก่าที่ใส่ได้อันเดียว)
export const titlesOf = (col) => (col && Array.isArray(col.titles) ? col.titles : col && col.title ? [col.title] : []).filter((x) => typeof x === 'string').slice(0, MAX_TITLES);
