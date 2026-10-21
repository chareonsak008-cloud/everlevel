// ข้อมูลแผนที่ Beginner Field — ทุ่งหญ้าฝึกฝีมือนอกเมือง
import { borderTrees, treesAt, scaleMap, FIELD_SCALE } from './helpers.js?v=0.80.0';

const W = 72, H = 56;

const IRIS = { hair: '#ff9a6a', skin: '#f6d2b0', eye: '#5a2a3a', tunic: '#7a2f4a', pants: '#3a2a3a', boot: '#2a1e24', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'wizard', hatColor: '#7a2f4a', orbColor: '#7fe0ff' };
const RANGER = { hair: '#7a4a2a', skin: '#eab993', eye: '#2a2030', tunic: '#4f7a3a', pants: '#5a4630', boot: '#3a2a1c', belt: '#a07a3a', hairStyle: 'ponytail', accessory: 'hat' };

const RAW = {
  id: 'beginner_field',
  name: 'Beginner Field',
  subtitle: 'ทุ่งหญ้าฝึกฝีมือ',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 5.5, y: 27.5 },
  music: 'field',
  theme: { fog: '#e3e7d8', outer: '#5a9a3e' },

  prune: true,   // v0.27: ต้นไม้/หินที่ทับทางเดินถูกตัดออกอัตโนมัติ

  // v0.27 รีมาสเตอร์: ทางเดินโค้งตามธรรมชาติ · ลำธารคดเคี้ยว · บึงดอกไม้ · ลานซากโบราณวงกลม
  regions: [
    // ทุ่งดอกไม้
    { tile: 'FLOWERS', circle: [12, 11, 6, 4.8] },
    { tile: 'FLOWERS', circle: [24, 8, 4.5, 3.5] },
    { tile: 'FLOWERS', circle: [27, 19, 3, 2] },
    { tile: 'FLOWERS', circle: [47, 22, 3, 1.8] },
    { tile: 'FLOWERS', circle: [62, 44, 4, 2.4] },
    { tile: 'FLOWERS', circle: [17, 48, 4, 2.2] },
    { tile: 'FLOWERS', circle: [9, 32, 4, 1.6] },
    // ลานกองไฟริมทางเข้า + ลานซากโบราณ + ลานโล่งทางใต้
    { tile: 'DIRT', circle: [8, 24, 4.6, 3] },
    { tile: 'DIRT', circle: [56.5, 12, 5.8, 4.6] },
    { tile: 'DIRT', circle: [55, 47, 4.5, 3.4] },
    // ทางเดินหลัก ตะวันตก–ตะวันออก (โค้งไปมา)
    { tile: 'DIRT', path: [[0, 27.5], [10, 27.5], [19, 25.5], [29, 27], [39, 27.5], [47, 28.5], [56, 26], [64, 27.5], [72, 27.5]], w: 3 },
    // ทางแยกขึ้นเหนือ → ทุ่งดอกไม้ · ทางไปซากโบราณ · ทางลงใต้
    { tile: 'DIRT', path: [[19, 25.5], [18, 17], [22, 10], [24, 8]], w: 2.4 },
    { tile: 'DIRT', path: [[56, 26], [58, 19], [56.5, 15]], w: 2.2 },
    { tile: 'DIRT', path: [[47, 28.5], [52, 36], [54, 44]], w: 2.4 },
    { tile: 'DIRT', path: [[29, 27], [27, 36], [22, 44], [17, 48]], w: 2 },
    // บึงเล็ก
    { tile: 'WATER', circle: [12, 11, 3.6, 2.6] },
    { tile: 'WATER', circle: [64, 41, 1.8, 1.4] },
    // ลำธารคดเคี้ยวผ่ากลางทุ่ง (ช่วงใต้สะพานตรงแนวตั้ง)
    { tile: 'WATER', path: [[37, 0], [37, 7], [40, 14], [39, 20], [39, 34], [41, 41], [39, 49], [39, 56]], w: 2 },
    { tile: 'BRIDGE', rect: [38, 26, 2, 3] },
  ],

  objects: [
    // จุดพักริมทางเข้า
    { kind: 'campfire', x: 8, y: 23 },
    { kind: 'bench', x: 5, y: 22 },
    { kind: 'stump', x: 11, y: 23 },
    { kind: 'sign', x: 4, y: 25, text: '⬅ Asteria Town' },
    { kind: 'sign', x: 66, y: 25, text: 'Whisperwood ➜' },
    { kind: 'fence', x: 13, y: 21, w: 4 },
    { kind: 'fence', x: 4, y: 29, w: 10 },
    { kind: 'fence', x: 44, y: 25, w: 5 },
    // ซากเสาโบราณ
    { kind: 'pillar', x: 54, y: 9, seed: 1 }, { kind: 'pillar', x: 59, y: 9, seed: 2 },
    { kind: 'pillar', x: 61, y: 12, seed: 3 }, { kind: 'pillar', x: 59, y: 15, seed: 4 },
    { kind: 'pillar', x: 54, y: 15, seed: 5 }, { kind: 'pillar', x: 52, y: 12, seed: 6 },
    { kind: 'warpstone', x: 56, y: 11 }, // แท่นผลึกวาร์ปกลางซากโบราณ (v0.5)
    // หินใหญ่ พุ่มไม้ ตอไม้
    { kind: 'boulder', x: 26, y: 13, w: 2, seed: 1 }, { kind: 'boulder', x: 31, y: 40, w: 2, seed: 2 },
    { kind: 'boulder', x: 47, y: 8, seed: 3 }, { kind: 'boulder', x: 62, y: 39, w: 2, seed: 4 },
    { kind: 'boulder', x: 14, y: 44, seed: 5 }, { kind: 'boulder', x: 58, y: 21, seed: 6 },
    { kind: 'boulder', x: 44, y: 35, seed: 7 }, { kind: 'boulder', x: 6, y: 16, seed: 8 },
    { kind: 'bush', x: 24, y: 31, seed: 1 }, { kind: 'bush', x: 28, y: 35, seed: 2 }, { kind: 'bush', x: 16, y: 18, seed: 3 },
    { kind: 'bush', x: 45, y: 20, seed: 4 }, { kind: 'bush', x: 60, y: 33, seed: 5 }, { kind: 'bush', x: 33, y: 9, seed: 6 },
    { kind: 'bush', x: 12, y: 37, seed: 7 }, { kind: 'bush', x: 66, y: 46, seed: 8 }, { kind: 'bush', x: 48, y: 46, seed: 9 },
    { kind: 'stump', x: 30, y: 21 }, { kind: 'stump', x: 56, y: 38 }, { kind: 'stump', x: 22, y: 46 },
    ...treesAt([
      [7, 6], [14, 5], [27, 7], [31, 15], [6, 34], [17, 40], [26, 44], [33, 48], [9, 47],
      [44, 5], [50, 4], [64, 6], [66, 18], [47, 16], [63, 22], [46, 41], [58, 47], [67, 36],
      [24, 22], [34, 32], [43, 30], [57, 31], [13, 15], [29, 50], [64, 51],
    ], 900),
    ...borderTrees(W, H, 3, [
      { x0: 0, x1: 2, y0: 24, y1: 30 }, { x0: 69, x1: 71, y0: 24, y1: 30 }, { x0: 36, x1: 41, y0: 0, y1: H },
    ], 777),
  ],

  npcs: [
    { id: 'iris', name: 'ไอริส', title: 'นักเวทย์วาร์ป', x: 58, y: 12, dir: 'down', look: IRIS,
      service: { type: 'warp', routes: 'ruins' },
      greet: 'เหนื่อยแล้วเหรอ? ข้าพากลับเมืองให้ได้นะ ระวังสติงเล็ตแถวนี้ด้วยล่ะ',
      lines: ['ผลึกนี้เชื่อมกับแท่นที่ลานน้ำพุใน Asteria Town'] },
    { id: 'lena', name: 'ลีน่า', title: 'ผู้พิทักษ์ทุ่ง', x: 7, y: 24, dir: 'right', look: RANGER, lines: [
      'มอนสเตอร์ฝั่งตะวันตกนิสัยดี มันจะสู้ก็ต่อเมื่อถูกโจมตีก่อน',
      'ข้ามสะพานไปฝั่งตะวันออกต้องระวังสติงเล็ต มันจะบินเข้าหาเองเลย',
      'ถ้าเจ็บหนักก็มานั่งพักข้างกองไฟนี่ เลือดจะฟื้นเร็วขึ้น',
      'Novice หมดสติแล้วไม่เสีย EXP ฝึกได้เต็มที่เลย',
      'ถึง Job Lv.10 เมื่อไหร่ ก็พร้อมเปลี่ยนอาชีพแล้วล่ะ',
      'ทางตะวันออกสุดคือ Whisperwood Forest มอนที่นั่นแข็งแกร่ง ควรเปลี่ยนอาชีพและ Lv.9 ขึ้นไปก่อน',
    ] },
  ],

  portals: [
    { x: 1, y: 26, w: 2, h: 2, to: 'asteria_town', arrive: { x: 65.5, y: 28, angle: -Math.PI / 2 }, label: 'Asteria Town' },
    { x: 69, y: 26, w: 2, h: 2, to: 'whisper_forest', arrive: { x: 5, y: 28.5, angle: Math.PI / 2 }, label: 'Whisperwood Forest' },
  ],

  // จุดเกิดมอนสเตอร์: areas = [x, y, w, h] หน่วยช่อง
  spawns: [
    { mob: 'bloblet', count: 10, areas: [[4, 4, 30, 20], [4, 31, 30, 21]] },
    { mob: 'capling', count: 7, areas: [[22, 31, 14, 20], [42, 30, 24, 20]] },
    { mob: 'stinglet', count: 6, areas: [[42, 4, 26, 20]] },
  ],

  // จุดพักฟื้น (เลือดฟื้นเร็วขึ้นเมื่ออยู่ใกล้)
  restSpots: [{ x: 8.5, y: 23.5, r: 3 }],
};

// v0.41.2: ขยายทั้งแผนที่ 1.5 เท่า (เหมือนเมือง) · ต้นไม้/สิ่งของใหญ่ตาม · มอนเพิ่ม 1.5 เท่าให้ความหนาแน่นใกล้เดิม
export const BEGINNER_FIELD = scaleMap(RAW, FIELD_SCALE, { treeScale: FIELD_SCALE, mobMul: 1.5 });
