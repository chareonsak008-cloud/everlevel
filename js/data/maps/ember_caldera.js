// ข้อมูลแผนที่ Ember Caldera — ปล่องภูเขาไฟทางตะวันออกของ Frostveil Peaks (v0.11)
// มอนสเตอร์ Lv.50–80 และ MVP "อิกนารอก มังกรเพลิง" ในปล่องลาวาทางตะวันออก
import { borderTrees, scatterTrees } from './helpers.js';

const W = 84, H = 64;

const IGNIS = { hair: '#ff8a3a', skin: '#e8b48a', eye: '#5a1a0a', tunic: '#8a2a1a', pants: '#3a1e1a', boot: '#2a1a14', belt: '#e8c050', hairStyle: 'short', accessory: 'wizard', hatColor: '#6a1a10', orbColor: '#ffb03a', scarf: '#e8c050' };
const KAEL = { hair: '#2a1a1a', skin: '#c88a62', eye: '#3a1a10', tunic: '#5a2a2a', pants: '#2a1e1e', boot: '#1e1414', belt: '#c8643a', hairStyle: 'spiky', accessory: 'none', jobGear: 'swordsman', scarf: '#c83a1a', weapon: 'sword' };
const ROZA = { hair: '#c83a5a', skin: '#e8c0a0', eye: '#3a1a2a', tunic: '#4a2a3a', pants: '#2a1e2a', boot: '#2a1a1a', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'clerk', hatColor: '#6a2a3a' };

// แม่น้ำลาวา + สะพาน
const RIVERS = [[24, 0, 3, 64], [27, 46, 57, 3]];
const LAVA_POOLS = [[8, 10, 5, 4], [44, 30, 4, 3], [12, 50, 4, 3]];
const BRIDGES = [[24, 30, 3, 3], [24, 12, 3, 3], [40, 46, 3, 3], [62, 46, 3, 3]];
// ทางเดินหินบะซอลต์
const PATHS = [
  [0, 30, 58, 3],    // ทางหลักตะวันตก → ปากปล่อง
  [56, 12, 3, 36],   // เหนือ–ใต้ ฝั่งตะวันออก
  [10, 12, 48, 3],   // เส้นเหนือ (อิมป์)
  [40, 33, 3, 26],   // ลงใต้ข้ามแม่น้ำลาวา → ที่ราบโกเลม
  [43, 56, 34, 3],   // ที่ราบโกเลม
];
const CAMP = [2, 24, 14, 14];
const CRATER = [60, 13, 22, 26];
const CC = { x: 70.5, y: 25.5 };
// เสาออบซิเดียนรอบปากปล่องมังกร (เว้นทางเข้าด้านตะวันตก)
const craterSpires = [20, 60, 100, 140, 220, 260, 300, 340].map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  return { kind: 'obsidian', x: Math.round(CC.x + Math.cos(a) * 9 - 0.5), y: Math.round(CC.y + Math.sin(a) * 9 - 0.5), seed: 400 + i };
});
const VENTS = [[14, 6], [34, 8], [48, 20], [32, 38], [10, 44], [50, 52], [72, 52], [78, 8], [36, 24], [18, 58]];
const SPIRES = [[6, 18], [20, 40], [30, 18], [46, 6], [52, 38], [34, 54], [66, 58], [80, 44], [20, 22]];
const deco = [...VENTS, ...SPIRES].map(([x, y]) => [x, y, 1, 1]);

export const EMBER_CALDERA = {
  id: 'ember_caldera',
  name: 'Ember Caldera',
  subtitle: 'ปล่องภูเขาไฟเอมเบอร์ — รังของมังกรเพลิง',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 3.5, y: 31.5 },
  music: 'lava',
  theme: {
    fog: '#3a1c16', fogNear: 18, fogFar: 58, outer: '#1c1212',
    light: { hemi: 0.55, sky: '#ffb890', ground: '#3a1a10', sun: 1.05, sunColor: '#ffb070', exposure: 1.0 },
    grass: {
      base: '#3a302e', blobs: ['#2e2624', '#463a36', '#342a28', '#4a3a32', '#2a2220'],
      blades: ['#4a3e3a', '#3a302c', '#5a463c', '#2e2422'], litter: ['#ff6a2a', '#ffaa3a', '#c84a1a', '#3a2a24'],
    },
    dirt: { base: '#544440', blobs: ['#4a3a36', '#5e4c46', '#3e322e'], pebble: '#241c1e', cracks: '#ff6a1a' },
    water: 'lava', trees: 'dead', tufts: false,
    flowers: ['#ff7a2a', '#ffb03a', '#ff4a1a', '#ffd23a'],
    motes: '#ff9a4a', moteCount: 220, moteSize: 0.08, motesMode: 'rise',
    fx: { gain: 0.85, glow: 0.9, flash: 0.8 },
    mini: { grass: '#3e3230', dirt: '#6a5650', water: '#ff6a1a', flowers: '#c85a2a', bridge: '#8a6a4a' },
  },

  regions: [
    ...PATHS.map((rect) => ({ tile: 'DIRT', rect })),
    { tile: 'DIRT', rect: CAMP },
    { tile: 'DIRT', rect: [61, 15, 20, 22] },
    { tile: 'FLOWERS', rect: [16, 44, 3, 2] }, { tile: 'FLOWERS', rect: [36, 16, 4, 2] }, { tile: 'FLOWERS', rect: [48, 40, 3, 2] }, { tile: 'FLOWERS', rect: [70, 54, 4, 2] },
    ...RIVERS.map((rect) => ({ tile: 'WATER', rect })),
    ...LAVA_POOLS.map((rect) => ({ tile: 'WATER', rect })),
    ...BRIDGES.map((rect) => ({ tile: 'BRIDGE', rect })),
  ],

  objects: [
    // ค่ายพักผู้กล้า
    { kind: 'campfire', x: 8, y: 28 },
    { kind: 'tent', x: 3, y: 25, color: '#8a2a1a' }, { kind: 'tent', x: 12, y: 25, color: '#5a3a2a' },
    { kind: 'bench', x: 5, y: 29 }, { kind: 'warpstone', x: 4, y: 35, color: '#ffb03a' },
    { kind: 'crate', x: 13, y: 35 }, { kind: 'barrel', x: 14, y: 35 }, { kind: 'barrel', x: 14, y: 34 },
    { kind: 'sign', x: 2, y: 33, text: '⬅ Frostveil Peaks' },
    { kind: 'sign', x: 22, y: 29, text: 'ปากปล่องมังกร ➡' },
    { kind: 'sign', x: 58, y: 29, text: '⚠ MVP อิกนารอก' },
    // ปากปล่องมังกร
    ...craterSpires,
    { kind: 'bones', x: 76, y: 31, seed: 1 }, { kind: 'bones', x: 63, y: 16, seed: 2 },
    // ปล่องไอร้อน + เสาหินออบซิเดียน
    ...VENTS.map(([x, y], i) => ({ kind: 'vent', x, y, seed: 500 + i })),
    ...SPIRES.map(([x, y], i) => ({ kind: 'obsidian', x, y, seed: 600 + i })),
    { kind: 'boulder', x: 30, y: 26, w: 2, seed: 81 }, { kind: 'boulder', x: 48, y: 60, w: 2, seed: 82 }, { kind: 'boulder', x: 16, y: 16, seed: 83 },
    ...scatterTrees(W, H, 60, [...PATHS, CAMP, CRATER, ...RIVERS, ...LAVA_POOLS, ...deco, [29, 25, 4, 3], [47, 59, 4, 3], [15, 15, 3, 3]], 6113, 3, 0.4),
    ...borderTrees(W, H, 3, [{ x0: 0, x1: 2, y0: 29, y1: 33 }, { x0: 24, x1: 26, y0: 0, y1: H }, { x0: 27, x1: W, y0: 46, y1: 48 }], 9417, 0.55),
  ],

  npcs: [
    { id: 'ignis', name: 'อิกนิส', title: 'นักเวทย์วาร์ป', x: 6, y: 34, dir: 'right', look: IGNIS,
      service: { type: 'warp', routes: 'ember' },
      greet: 'ร้อนจนผมไหม้แล้วล่ะ! จะกลับเมืองหรือไปยอดเขาหิมะก็บอกข้า',
      lines: ['ลาวาตรงนั้นแตะไม่ได้นะ ข้าเตือนแล้ว'] },
    { id: 'kael', name: 'เคล', title: 'อัศวินเพลิง', x: 10, y: 29, dir: 'right', look: KAEL, lines: [
      'แมกม่าสไลม์ใจเย็น แต่เอมเบอร์อิมป์กับซาลาแมนเดอร์จะพุ่งเข้าหาทันที',
      'ออบซิเดียนโกเลมทางใต้แข็งแกร่งที่สุดในภูเขาไฟนี้ อย่าประมาท',
      'อิกนารอกหลับอยู่ในปากปล่องทางตะวันออก เมื่อเห็นวงสีส้มบนพื้น นั่นคืออุกกาบาตเพลิง! หลบให้ทัน',
      'เลเวลสูงสุดของนักผจญภัยคือ 99 ทั้ง Base และ Job — ที่นี่แหละที่จะพาเจ้าไปถึง',
    ] },
    { id: 'roza', name: 'โรซ่า', title: 'ร้านเสบียงภูเขาไฟ', x: 11, y: 33, dir: 'down', look: ROZA,
      service: { type: 'shop', shop: 'ember' },
      greet: 'ยาทนร้อน ผลึกตีบวก มีครบ! ของที่เก็บจากภูเขาไฟเอามาขายข้าได้นะ',
      lines: ['คริสตัลพิทักษ์ขายดีที่สุดในร้านเลย'] },
  ],

  portals: [
    { x: 0, y: 30, w: 2, h: 3, to: 'frostveil', arrive: { x: 79.5, y: 41.5, angle: -Math.PI / 2 }, label: 'Frostveil Peaks' },
  ],

  spawns: [
    { mob: 'magmaslime', count: 10, areas: [[4, 40, 18, 20], [4, 3, 18, 7]] },
    { mob: 'emberimp', count: 9, areas: [[30, 2, 24, 9], [30, 15, 24, 9]] },
    { mob: 'salamander', count: 9, areas: [[30, 34, 8, 11], [44, 34, 10, 11], [30, 24, 22, 5]] },
    { mob: 'obsidiangolem', count: 8, areas: [[30, 50, 50, 11]] },
    { mob: 'ignarok', count: 1, areas: [[69, 24, 3, 3]] },
  ],

  restSpots: [{ x: 8.5, y: 28.5, r: 3 }],
};
