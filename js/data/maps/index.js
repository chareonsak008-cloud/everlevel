import { ANCIENT_RUINS } from './ancient_ruins.js?v=0.68.0';
import { HAUNTED_FOREST } from './haunted_forest.js?v=0.68.0';
import { SUNKEN_COAST } from './sunken_coast.js?v=0.68.0';     // v0.46 Lv.100–117
import { CRYSTAL_VALLEY } from './crystal_valley.js?v=0.68.0'; // v0.46 Lv.118–134
import { SKY_CITADEL } from './sky_citadel.js?v=0.68.0';       // v0.46 Lv.135–150
// ทะเบียนแผนที่ทั้งหมด — เพิ่มแผนที่ใหม่ที่นี่
import { ASTERIA_TOWN } from './asteria_town.js?v=0.68.0';
import { BEGINNER_FIELD } from './beginner_field.js?v=0.68.0';
import { WHISPER_FOREST } from './whisper_forest.js?v=0.68.0';
import { FROSTVEIL_PEAKS } from './frostveil_peaks.js?v=0.68.0';
import { EMBER_CALDERA } from './ember_caldera.js?v=0.68.0';

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
import { MONSTERS } from '../monsters.js?v=0.68.0';
for (const def of Object.values(MAPS)) {
  const sp = def.spawns || [], zones = sp.filter((s) => MONSTERS[s.mob] && !MONSTERS[s.mob].mvp).flatMap((s) => s.areas);
  for (const s of sp) if (MONSTERS[s.mob] && MONSTERS[s.mob].mvp && zones.length) { s.lair = s.areas; s.areas = [...s.areas, ...zones]; }
}
