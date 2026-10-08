// ข้อมูลแผนที่ Frostveil Peaks — ยอดเขาหิมะทางเหนือของ Whisperwood Forest (v0.11)
// มอนสเตอร์ Lv.20–37 และ MVP Lv.45 "กลาเซีย ราชินีหิมะ" ที่บัลลังก์น้ำแข็งทางเหนือสุด
import { borderTrees, scatterTrees } from './helpers.js';

const W = 84, H = 64;

const YUKI = { hair: '#e8f4ff', skin: '#f6dcc8', eye: '#3a5a8a', tunic: '#5a8ac8', pants: '#2e3a5a', boot: '#2a2a3a', belt: '#e8f0ff', hairStyle: 'ponytail', accessory: 'wizard', hatColor: '#3a6aa8', orbColor: '#bff4ff', scarf: '#e8f0ff' };
const BJORN = { hair: '#c8743a', skin: '#e8b890', eye: '#2a2030', tunic: '#8a6a4a', pants: '#4a3a2e', boot: '#3a2a20', belt: '#e8e2d8', hairStyle: 'short', accessory: 'none', jobGear: 'swordsman', scarf: '#e8e2d8', weapon: 'sword' };
const HELGA = { hair: '#f2e2b0', skin: '#f6d6b8', eye: '#3a4a6a', tunic: '#a8423a', pants: '#3a3a4a', boot: '#3a2a20', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'clerk', hatColor: '#e8eef8' };

// ทางเดินหิมะอัดแน่น (ใช้วาดพื้นและเว้นไม่ให้ต้นไม้ขึ้น)
const PATHS = [
  [41, 14, 3, 50],   // ทางหลักจากทางเข้าใต้ → บัลลังก์ทางเหนือ
  [10, 34, 32, 3],   // ทางแยกตะวันตก (ทุ่งจิ้งจอก)
  [44, 40, 40, 3],   // ทางแยกตะวันออก → ประตูสู่ภูเขาไฟ
  [16, 14, 26, 3],   // หุบเยติ
  [44, 14, 26, 3],   // ธารน้ำแข็งโกเลม
];
const CAMP = [33, 49, 18, 12];
const THRONE = [32, 1, 19, 12];
const LAKE = [15, 21, 14, 9];
const POOLS = [[60, 50, 6, 4], [8, 47, 4, 3]];
const CLIFFS = [[54, 24, 4, 2], [70, 28, 3, 3], [62, 33, 2, 2], [76, 22, 2, 2]];

// คริสตัลน้ำแข็งเรืองแสงประดับทั่วแผนที่
const CRYSTALS = [
  [8, 9, '#7fe0ff'], [24, 6, '#9ab8ff'], [30, 18, '#7fe0ff'], [6, 30, '#c8a8ff'], [36, 30, '#7fe0ff'], [12, 56, '#9ab8ff'],
  [54, 8, '#7fe0ff'], [66, 6, '#c8a8ff'], [77, 12, '#7fe0ff'], [58, 18, '#9ab8ff'], [74, 34, '#7fe0ff'], [52, 56, '#c8a8ff'],
  [28, 44, '#7fe0ff'], [78, 52, '#9ab8ff'],
];
const crystalRects = CRYSTALS.map(([x, y]) => [x, y, 1, 1]);

// วงคริสตัลรอบบัลลังก์ราชินีหิมะ (เว้นทางเข้าด้านใต้)
const TC = { x: 41.5, y: 6.5 };
const thronePillars = [0, 40, 80, 140, 180, 220, 260, 300, 330].map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  return { kind: 'icecrystal', x: Math.round(TC.x + Math.cos(a) * 7 - 0.5), y: Math.round(TC.y + Math.sin(a) * 5 - 0.5), seed: 300 + i, color: '#bff4ff' };
}).filter((o) => !(o.y > 9 && Math.abs(o.x - 41.5) < 3));

export const FROSTVEIL_PEAKS = {
  id: 'frostveil',
  name: 'Frostveil Peaks',
  subtitle: 'ยอดเขาฟรอสต์เวล — อาณาจักรของราชินีหิมะ',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 42, y: 59.5 },
  music: 'snow',
  theme: {
    fog: '#d6e4f0', fogNear: 20, fogFar: 64, outer: '#e4edf6',
    light: { hemi: 0.78, sky: '#eaf4ff', ground: '#9ab0c8', sun: 1.2, sunColor: '#fff4ea', exposure: 0.9 },
    grass: {
      base: '#e8eff6', blobs: ['#f6f9fc', '#dbe6f1', '#e2ecf6', '#cfdcea', '#f0f5fa'],
      blades: ['#d6e2ee', '#ccd9e7', '#e4ecf5', '#f8fbfe'],
    },
    dirt: { base: '#c4d0dc', blobs: ['#b4c2d0', '#d2dce6', '#bcc8d4'], pebble: '#8a98a8' },
    water: 'ice', trees: 'snow', tufts: false,
    flowers: ['#bfe8ff', '#ffffff', '#9ad8ff', '#d8c8ff'],
    motes: '#ffffff', moteCount: 280, moteSize: 0.11, motesMode: 'snow',
    fx: { gain: 0.6, glow: 0.62, flash: 0.5 },
    mini: { grass: '#e2ebf4', dirt: '#b2c0ce', water: '#9ad0f0', flowers: '#d0e0f4', bridge: '#9b6b3e' },
  },

  regions: [
    ...PATHS.map((rect) => ({ tile: 'DIRT', rect })),
    { tile: 'DIRT', rect: CAMP },
    { tile: 'DIRT', rect: [35, 2, 13, 10] },
    { tile: 'FLOWERS', rect: [6, 40, 4, 2] }, { tile: 'FLOWERS', rect: [22, 50, 5, 2] }, { tile: 'FLOWERS', rect: [66, 44, 4, 2] },
    { tile: 'FLOWERS', rect: [12, 8, 3, 2] }, { tile: 'FLOWERS', rect: [60, 12, 4, 2] },
    { tile: 'WATER', rect: LAKE },
    ...POOLS.map((rect) => ({ tile: 'WATER', rect })),
  ],

  objects: [
    // ค่ายพักนักสำรวจ
    { kind: 'campfire', x: 41, y: 54 },
    { kind: 'tent', x: 35, y: 51, snow: true, color: '#c8643a' },
    { kind: 'tent', x: 47, y: 51, snow: true, color: '#3a6aa8' },
    { kind: 'bench', x: 37, y: 55 }, { kind: 'bench', x: 45, y: 55 },
    { kind: 'warpstone', x: 36, y: 58, color: '#9ad8ff' },
    { kind: 'snowman', x: 49, y: 57, color: '#d8433a' }, { kind: 'snowman', x: 33, y: 47, color: '#3a8ac8' },
    { kind: 'crate', x: 48, y: 54 }, { kind: 'barrel', x: 49, y: 54 },
    { kind: 'sign', x: 40, y: 60, text: '⬇ Whisperwood' },
    { kind: 'sign', x: 40, y: 37, text: '⬅ ทุ่งจิ้งจอก · ภูเขาไฟ ➡' },
    { kind: 'sign', x: 40, y: 16, text: '⚠ MVP บัลลังก์น้ำแข็ง' },
    { kind: 'sign', x: 81, y: 39, text: 'Ember Caldera ➡' },
    // บัลลังก์ราชินีหิมะ
    ...thronePillars,
    // หน้าผาหินของค้างคาว
    ...CLIFFS.map(([x, y, w, h], i) => ({ kind: 'boulder', x, y, w, h, seed: 60 + i })),
    { kind: 'boulder', x: 8, y: 16, w: 2, seed: 71 }, { kind: 'boulder', x: 26, y: 9, seed: 72 }, { kind: 'boulder', x: 68, y: 16, w: 2, seed: 73 },
    // คริสตัลน้ำแข็ง
    ...CRYSTALS.map(([x, y, color], i) => ({ kind: 'icecrystal', x, y, color, seed: 200 + i })),
    { kind: 'snowman', x: 20, y: 44, color: '#3ab86a' },
    ...scatterTrees(W, H, 130, [...PATHS, CAMP, THRONE, LAKE, ...POOLS, ...CLIFFS, ...crystalRects, [7, 15, 4, 3], [25, 8, 3, 3], [67, 15, 4, 3], [19, 43, 3, 3]], 7317, 3, 0.75),
    ...borderTrees(W, H, 3, [{ x0: 39, x1: 45, y0: H - 3, y1: H }, { x0: W - 3, x1: W, y0: 39, y1: 43 }], 8231, 0.92),
  ],

  npcs: [
    { id: 'yuki', name: 'ยูกิ', title: 'นักเวทย์วาร์ป', x: 38, y: 57, dir: 'down', look: YUKI,
      service: { type: 'warp', routes: 'frost' },
      greet: 'หนาวไหม? ข้าส่งเจ้ากลับไปที่อุ่น ๆ ได้นะ หรือจะไปภูเขาไฟก็ได้',
      lines: ['ผลึกวาร์ปที่นี่เย็นจนมือข้าแทบชา'] },
    { id: 'bjorn', name: 'บยอร์น', title: 'พรานหิมะ', x: 44, y: 56, dir: 'down', look: BJORN, lines: [
      'ฟรอสต์ฟ็อกซ์ใจเย็น ถ้าไม่แหย่มันก็ไม่สู้',
      'ระวังฟรอสต์แบทแถวหน้าผาตะวันออก พวกมันพุ่งเข้าหาทันที',
      'เยติแรงเยอะแต่ช้า ส่วนไอซ์โกเลมทั้งแข็งทั้งดุ เตรียมยาไปให้พอ',
      'ราชินีหิมะกลาเซียประทับอยู่ที่บัลลังก์น้ำแข็งทางเหนือสุด เมื่อพื้นเป็นวงฟ้า รีบหนี! ไม่งั้นจะโดนแช่แข็ง',
    ] },
    { id: 'helga', name: 'เฮลก้า', title: 'ร้านเสบียงยอดเขา', x: 47, y: 58, dir: 'down', look: HELGA,
      service: { type: 'shop', shop: 'frost' },
      greet: 'ยินดีต้อนรับสู่ร้านเสบียงที่สูงที่สุดในอาณาจักร! ยาขาวช่วยชีวิตบนยอดเขาได้นะ',
      lines: ['ของบนนี้แพงหน่อย เพราะแบกขึ้นมาลำบาก'] },
  ],

  portals: [
    { x: 40, y: H - 2, w: 4, h: 2, to: 'whisper_forest', arrive: { x: 31.5, y: 3.5, angle: 0 }, label: 'Whisperwood Forest' },
    { x: W - 2, y: 40, w: 2, h: 3, to: 'ember_caldera', arrive: { x: 3.5, y: 31.5, angle: Math.PI / 2 }, label: 'Ember Caldera' },
  ],

  spawns: [
    { mob: 'frostfox', count: 11, areas: [[4, 38, 28, 20], [4, 24, 10, 9]] },
    { mob: 'frostbat', count: 9, areas: [[52, 24, 28, 14], [56, 44, 24, 14]] },
    { mob: 'yeti', count: 8, areas: [[4, 4, 28, 16]] },
    { mob: 'icegolem', count: 8, areas: [[51, 4, 28, 17]] },
    { mob: 'glacia', count: 1, areas: [[40, 5, 3, 3]] },
  ],

  restSpots: [{ x: 41.5, y: 54.5, r: 3 }],
};
