import { ANCIENT_RUINS } from './ancient_ruins.js?v=0.72.0';
import { HAUNTED_FOREST } from './haunted_forest.js?v=0.72.0';
import { SUNKEN_COAST } from './sunken_coast.js?v=0.72.0';     // v0.46 Lv.100–117
import { CRYSTAL_VALLEY } from './crystal_valley.js?v=0.72.0'; // v0.46 Lv.118–134
import { SKY_CITADEL } from './sky_citadel.js?v=0.72.0';       // v0.46 Lv.135–150
// ทะเบียนแผนที่ทั้งหมด — เพิ่มแผนที่ใหม่ที่นี่
import { ASTERIA_TOWN } from './asteria_town.js?v=0.72.0';
import { BEGINNER_FIELD } from './beginner_field.js?v=0.72.0';
import { WHISPER_FOREST } from './whisper_forest.js?v=0.72.0';
import { FROSTVEIL_PEAKS } from './frostveil_peaks.js?v=0.72.0';
import { EMBER_CALDERA } from './ember_caldera.js?v=0.72.0';

export const MAPS = {
  ancient_ruins: ANCIENT_RUINS,
  haunted_forest: HAUNTED_FOREST,
  sunken_coast: SUNKEN_COAST,
  crystal_valley: CRYSTAL_VALLEY,
  sky_citadel: SKY_CITADEL,
  [ASTERIA_TOWN.id]: ASTERIA_TOWN,
  [BEGINNER_FIELD.id]: BEGINNER_FIELD,
  [WHISPER_FOREST.id]: WHISPER_FOREST,
  [FROSTVEIL_PEAKS.id]: FROSTVEIL_PEAKS,     // v0.11
  [EMBER_CALDERA.id]: EMBER_CALDERA,         // v0.11
};

export const START_MAP = ASTERIA_TOWN.id;

// v0.47 บอส MVP สุ่มจุดเกิด: นอกจากรังเดิม ยังเกิดได้ทุกโซนมอนของแผนที่นั้น (สุ่มใหม่ทุกครั้งที่เกิดตามเวลา)
import { MONSTERS } from '../monsters.js?v=0.72.0';
for (const def of Object.values(MAPS)) {
  const sp = def.spawns || [], zones = sp.filter((s) => MONSTERS[s.mob] && !MONSTERS[s.mob].mvp).flatMap((s) => s.areas);
  for (const s of sp) if (MONSTERS[s.mob] && MONSTERS[s.mob].mvp && zones.length) { s.lair = s.areas; s.areas = [...s.areas, ...zones]; }
}

// v0.72 ปรับอัตราดรอป: ของดี/ของหายาก (อุปกรณ์ระดับหายากขึ้นไป) และการ์ด ดรอปยากขึ้น · ของธรรมดา/ดี ยาใช้งาน หิน คงเดิม
// ปรับที่ข้อมูลโดยตรง จึงเห็นตรงกันทั้งตอนสุ่มดรอปจริง วิกิ และหน้าบอส · มอนเกิดเร็วขึ้น (SPAWN_MUL/RESPAWN_MUL ใน MonsterAI.js) ชดเชยจำนวนที่ฆ่าได้ต่อชั่วโมง
import { ITEMS } from '../items.js?v=0.72.0';
import { CARDS } from '../cards.js?v=0.72.0';
export const DROP_TUNE = {
  mob:  { rare: 0.7, epic: 0.4, legend: 0.3, mythic: 0.3, celestial: 0.3, abyssal: 0.35, divine: 0.35 },   // มอนธรรมดา
  boss: { epic: 0.7, legend: 0.5, mythic: 0.5, celestial: 0.5, abyssal: 0.5, divine: 0.5 },                  // MVP / บอส / บอสโลก
  card: { normal: 0.4, elite: 0.35, mvp: 0.5 },
};
for (const m of Object.values(MONSTERS)) {
  if (!m || !Array.isArray(m.drops) || m._dropTuned) continue;
  const t = m.mvp || m.boss || m.worldBoss || m.dgBoss ? DROP_TUNE.boss : DROP_TUNE.mob;
  m.drops = m.drops.map(([id, c]) => { const I = ITEMS[id], k = I && I.type === 'equip' ? t[I.rarity] || 1 : 1; return [id, k === 1 ? c : +(c * k).toPrecision(4)]; });
  m._dropTuned = true;
}
for (const c of Object.values(CARDS)) if (!c._dropTuned) { c.drop = +(c.drop * (DROP_TUNE.card[c.rank] || 1)).toPrecision(4); c._dropTuned = true; }
