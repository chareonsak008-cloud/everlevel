// ข้อมูลแผนที่ Beginner Field — ทุ่งหญ้าฝึกฝีมือนอกเมือง
import { borderTrees, treesAt } from './helpers.js';

const W = 72, H = 56;

const IRIS = { hair: '#ff9a6a', skin: '#f6d2b0', eye: '#5a2a3a', tunic: '#7a2f4a', pants: '#3a2a3a', boot: '#2a1e24', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'wizard', hatColor: '#7a2f4a', orbColor: '#7fe0ff' };
const RANGER = { hair: '#7a4a2a', skin: '#eab993', eye: '#2a2030', tunic: '#4f7a3a', pants: '#5a4630', boot: '#3a2a1c', belt: '#a07a3a', hairStyle: 'ponytail', accessory: 'hat' };

export const BEGINNER_FIELD = {
  id: 'beginner_field',
  name: 'Beginner Field',
  subtitle: 'ทุ่งหญ้าฝึกฝีมือ',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 5.5, y: 27.5 },
  music: 'field',
  theme: { fog: '#e3e7d8', outer: '#5a9a3e' },

  regions: [
    { tile: 'FLOWERS', rect: [8, 30, 6, 2] },
    { tile: 'FLOWERS', rect: [25, 18, 5, 3] },
    { tile: 'FLOWERS', rect: [44, 24, 4, 2] },
    { tile: 'FLOWERS', rect: [60, 44, 6, 2] },
    { tile: 'FLOWERS', rect: [15, 48, 5, 2] },
    { tile: 'FLOWERS', rect: [50, 12, 3, 2] },
    { tile: 'DIRT', rect: [0, 26, 72, 3] },   // เส้นทางหลัก ตะวันตก–ตะวันออก
    { tile: 'DIRT', rect: [19, 6, 3, 20] },   // ทางแยกขึ้นเหนือ
    { tile: 'DIRT', rect: [52, 29, 3, 21] },  // ทางแยกลงใต้
    { tile: 'DIRT', rect: [53, 9, 8, 6] },    // ลานซากปรักหักพัง
    { tile: 'WATER', rect: [9, 9, 6, 4] },    // บึงเล็ก
    // ลำธารคดเคี้ยวผ่ากลางทุ่ง
    { tile: 'WATER', rect: [37, 0, 2, 14] },
    { tile: 'WATER', rect: [38, 13, 2, 17] },
    { tile: 'WATER', rect: [39, 29, 2, 13] },
    { tile: 'WATER', rect: [38, 41, 2, 15] },
    { tile: 'BRIDGE', rect: [38, 26, 2, 3] },
  ],

  objects: [
    // จุดพักริมทางเข้า
    { kind: 'campfire', x: 8, y: 23 },
    { kind: 'bench', x: 5, y: 22 },
    { kind: 'stump', x: 11, y: 23 },
    { kind: 'sign', x: 4, y: 25, text: '⬅ Asteria Town' },
    { kind: 'sign', x: 66, y: 25, text: 'Whisperwood ➜' },
    { kind: 'fence', x: 12, y: 25, w: 6 },
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
    { x: 1, y: 26, w: 2, h: 2, to: 'asteria_town', arrive: { x: 59.5, y: 24, angle: -Math.PI / 2 }, label: 'Asteria Town' },
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
