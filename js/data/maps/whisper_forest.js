// ข้อมูลแผนที่ Whisperwood Forest — ป่าทึบทางตะวันออกของ Beginner Field (v0.7)
// มีมอนสเตอร์ระดับกลาง และ MVP "กนาร์ลรูท ต้นไม้เฒ่า" ที่ลานหินใจกลางป่า (มุมตะวันออกเฉียงใต้)
import { borderTrees, scatterTrees } from './helpers.js';

const W = 84, H = 64;

const SYLVA = { hair: '#9ad8a0', skin: '#f3d3bb', eye: '#2a5a3a', tunic: '#2f5a3a', pants: '#2a3a2a', boot: '#2a2018', belt: '#c9a24a', hairStyle: 'ponytail', accessory: 'wizard', hatColor: '#2f5a3a', orbColor: '#9affc8' };
const FERN = { hair: '#4a2e1e', skin: '#d9a47a', eye: '#2a2030', tunic: '#5a6a3a', pants: '#4a3a28', boot: '#2e2218', belt: '#8a5a30', hairStyle: 'short', accessory: 'quiver', jobGear: 'archer', scarf: '#8a5a30', weapon: 'bow' };

// ทางเดิน + ลานโล่ง + ลำธาร (ใช้ทั้งวาดพื้นและเว้นที่ไม่ให้ต้นไม้ขึ้น)
const PATHS = [
  [0, 27, 33, 3],    // ทางเข้าตะวันตก → ทางแยก
  [30, 9, 3, 21],    // ทางแยกขึ้นเหนือ
  [30, 9, 34, 3],    // ไปถ้ำหมาป่าทางตะวันออกเฉียงเหนือ
  [30, 28, 26, 3],   // ทางแยกไปตะวันออก
  [53, 28, 3, 17],   // ลงใต้
  [53, 42, 12, 3],   // เข้าลานต้นไม้เฒ่า
  [30, 0, 3, 10],    // v0.11: ทางขึ้นเหนือสู่ Frostveil Peaks
];
const DEN = [60, 5, 15, 15];          // ลานถ้ำบาร์กวูล์ฟ
const LAIR = [63, 39, 16, 17];        // ลานหินของกนาร์ลรูท
const CAMP = [2, 21, 12, 13];         // จุดพักริมทางเข้า
const STREAM = [[41, 0, 2, 12], [41, 12, 2, 6], [42, 17, 2, 14], [42, 31, 2, 12], [43, 42, 2, 22]];
const POND = [12, 18, 5, 3];

// เห็ดยักษ์เรืองแสง
const SHROOMS = [
  [9, 9, '#4ac8ff'], [18, 11, '#c86aff'], [24, 20, '#6aff9a'], [7, 40, '#4ac8ff'], [16, 47, '#c86aff'], [27, 37, '#6aff9a'],
  [36, 20, '#4ac8ff'], [37, 40, '#c86aff'], [48, 35, '#6aff9a'], [49, 51, '#4ac8ff'], [58, 24, '#c86aff'], [77, 26, '#6aff9a'],
  [60, 52, '#4ac8ff'], [26, 57, '#6aff9a'], [36, 5, '#c86aff'], [50, 15, '#4ac8ff'],
];
const shroomRects = SHROOMS.map(([x, y]) => [x, y, 1, 1]);

// เสาหินโบราณรอบลานบอส (เว้นช่องทางเข้าฝั่งตะวันตกเฉียงเหนือ)
const LC = { x: 70.5, y: 47.5 };
const lairPillars = [0, 45, 90, 135, 180, 270, 315].map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  return { kind: 'pillar', x: Math.round(LC.x + Math.cos(a) * 6.8 - 0.5), y: Math.round(LC.y + Math.sin(a) * 6.8 - 0.5), seed: 40 + i };
});

export const WHISPER_FOREST = {
  id: 'whisper_forest',
  name: 'Whisperwood Forest',
  subtitle: 'ป่ากระซิบ — ถิ่นของต้นไม้เฒ่า',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 5, y: 28.5 },
  music: 'forest',
  theme: {
    fog: '#8fae8a', fogNear: 18, fogFar: 58, outer: '#2c5426',
    light: { hemi: 0.52, sky: '#c8e8d0', ground: '#3a5a2a', sun: 1.1, sunColor: '#ffe2b0', exposure: 0.95 },
    grass: {
      base: '#3f7a35', blobs: ['#4c8a3c', '#36702e', '#5a9446', '#2f6528', '#467f37'],
      blades: ['#2e6a2a', '#3a7832', '#4a8a3e', '#356f2e'], litter: ['#a8742e', '#c88a3a', '#8a5a2a', '#6a8a2a'],
    },
    motes: '#d8ff8a', moteCount: 150, moteSize: 0.09,   // หิ่งห้อย
    fx: { gain: 0.82, glow: 0.85, flash: 0.8 },        // ป่ามืดกว่า → เอฟเฟกต์สกิลสว่างได้มากกว่า
    sunbeams: 12,
  },

  regions: [
    { tile: 'FLOWERS', rect: [6, 33, 6, 2] },
    { tile: 'FLOWERS', rect: [20, 14, 4, 2] },
    { tile: 'FLOWERS', rect: [35, 36, 4, 3] },
    { tile: 'FLOWERS', rect: [25, 52, 5, 2] },
    { tile: 'FLOWERS', rect: [76, 51, 3, 3] },
    ...PATHS.map((rect) => ({ tile: 'DIRT', rect })),
    { tile: 'DIRT', rect: DEN },
    { tile: 'DIRT', rect: [64, 41, 14, 13] },
    { tile: 'FLOWERS', rect: [64, 40, 3, 1] },
    { tile: 'WATER', rect: POND },
    ...STREAM.map((rect) => ({ tile: 'WATER', rect })),
    { tile: 'BRIDGE', rect: [41, 9, 2, 3] },
    { tile: 'BRIDGE', rect: [42, 28, 2, 3] },
  ],

  objects: [
    // จุดพักริมทางเข้า
    { kind: 'campfire', x: 7, y: 24 },
    { kind: 'bench', x: 4, y: 23 },
    { kind: 'stump', x: 10, y: 24 },
    { kind: 'warpstone', x: 4, y: 32 },
    { kind: 'sign', x: 3, y: 25, text: '⬅ Beginner Field' },
    { kind: 'sign', x: 29, y: 26, text: 'ต้นไม้เฒ่า ➘' },
    { kind: 'sign', x: 52, y: 41, text: '⚠ MVP' },
    // ลานบอส
    ...lairPillars,
    // ถ้ำหมาป่า
    { kind: 'boulder', x: 63, y: 6, w: 2, seed: 11 }, { kind: 'boulder', x: 71, y: 8, w: 2, seed: 12 },
    { kind: 'boulder', x: 66, y: 16, seed: 13 }, { kind: 'stump', x: 69, y: 13 }, { kind: 'stump', x: 62, y: 12 },
    // ของตกแต่งในป่า
    ...SHROOMS.map(([x, y, color], i) => ({ kind: 'bigshroom', x, y, color, seed: 100 + i })),
    { kind: 'boulder', x: 21, y: 33, w: 2, seed: 21 }, { kind: 'boulder', x: 35, y: 50, seed: 22 }, { kind: 'boulder', x: 14, y: 6, seed: 23 },
    { kind: 'bush', x: 19, y: 24, seed: 31 }, { kind: 'bush', x: 25, y: 44, seed: 32 }, { kind: 'bush', x: 47, y: 24, seed: 33 },
    { kind: 'bush', x: 57, y: 35, seed: 34 }, { kind: 'bush', x: 12, y: 52, seed: 35 }, { kind: 'bush', x: 74, y: 30, seed: 36 },
    { kind: 'stump', x: 23, y: 8 }, { kind: 'stump', x: 33, y: 45 }, { kind: 'stump', x: 47, y: 46 },
    ...scatterTrees(W, H, 150, [...PATHS, DEN, LAIR, CAMP, POND, ...STREAM, ...shroomRects, [20, 32, 3, 3], [34, 49, 3, 3], [13, 5, 3, 3]], 9091),
    ...borderTrees(W, H, 3, [{ x0: 0, x1: 2, y0: 26, y1: 31 }, { x0: 40, x1: 45, y0: 0, y1: H }, { x0: 29, x1: 33, y0: 0, y1: 3 }], 5150, 0.95),
    { kind: 'sign', x: 33, y: 4, text: '⬆ Frostveil Peaks (Lv.20+)' },
  ],

  npcs: [
    { id: 'sylva', name: 'ซิลวา', title: 'นักเวทย์วาร์ป', x: 6, y: 32, dir: 'right', look: SYLVA,
      service: { type: 'warp', routes: 'forest' },
      greet: 'ป่านี้มืดและลึกนัก ถ้าอยากกลับเมืองบอกข้าได้เลย',
      lines: ['วิสป์ชอบแสงสว่าง ระวังมันลอยตามมานะ'] },
    { id: 'fern', name: 'เฟิร์น', title: 'พรานป่า', x: 9, y: 26, dir: 'right', look: FERN, lines: [
      'ธอร์นแบ็กใจเย็น ถ้าไม่ไปแหย่มันก็ไม่ทำอะไร',
      'วิสป์กับบาร์กวูล์ฟจะพุ่งเข้าหาทันทีที่เห็นเจ้า ระวังให้ดี',
      'วิสป์หลบเก่งและทนเวทย์ ใช้อาวุธที่แม่น ๆ จะง่ายกว่า',
      'ทางแยกขวาล่างนำไปสู่ลานหินของกนาร์ลรูท ต้นไม้เฒ่าที่ตื่นทุกไม่กี่นาที',
      'เมื่อพื้นใต้เท้าเจ้าเป็นวงแดง ให้รีบเดินออกมา! นั่นคือท่าทุบพื้นและรากหนามของมัน',
      'เมื่อมันบาดเจ็บหนักจะเรียกวิสป์มาช่วย และจะโกรธจนตีเร็วขึ้น',
    ] },
  ],

  portals: [
    { x: 0, y: 27, w: 2, h: 3, to: 'beginner_field', arrive: { x: 66.5, y: 27.5, angle: -Math.PI / 2 }, label: 'Beginner Field' },
    { x: 30, y: 0, w: 3, h: 2, to: 'frostveil', arrive: { x: 42, y: 59.5, angle: Math.PI }, label: 'Frostveil Peaks' },
  ],

  spawns: [
    { mob: 'thornback', count: 10, areas: [[4, 4, 24, 18], [4, 35, 34, 25]] },
    { mob: 'wisp', count: 8, areas: [[34, 33, 16, 27], [33, 13, 7, 13]] },
    { mob: 'barkwolf', count: 8, areas: [[46, 2, 34, 22]] },
    { mob: 'gnarlroot', count: 1, areas: [[69, 46, 3, 3]] },
  ],

  restSpots: [{ x: 7.5, y: 24.5, r: 3 }],
};
