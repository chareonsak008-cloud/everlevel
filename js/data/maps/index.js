import { ANCIENT_RUINS } from './ancient_ruins.js?v=0.44.0';
import { HAUNTED_FOREST } from './haunted_forest.js?v=0.44.0';
// ทะเบียนแผนที่ทั้งหมด — เพิ่มแผนที่ใหม่ที่นี่
import { ASTERIA_TOWN } from './asteria_town.js?v=0.44.0';
import { BEGINNER_FIELD } from './beginner_field.js?v=0.44.0';
import { WHISPER_FOREST } from './whisper_forest.js?v=0.44.0';
import { FROSTVEIL_PEAKS } from './frostveil_peaks.js?v=0.44.0';
import { EMBER_CALDERA } from './ember_caldera.js?v=0.44.0';

export const MAPS = {
  ancient_ruins: ANCIENT_RUINS,
  haunted_forest: HAUNTED_FOREST,
  [ASTERIA_TOWN.id]: ASTERIA_TOWN,
  [BEGINNER_FIELD.id]: BEGINNER_FIELD,
  [WHISPER_FOREST.id]: WHISPER_FOREST,
  [FROSTVEIL_PEAKS.id]: FROSTVEIL_PEAKS,     // v0.11
  [EMBER_CALDERA.id]: EMBER_CALDERA,         // v0.11
};

export const START_MAP = ASTERIA_TOWN.id;
