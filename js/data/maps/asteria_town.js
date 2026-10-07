// ข้อมูลแผนที่ Asteria Town (เมืองเริ่มต้น)
import { borderTrees as _borderTrees } from './helpers.js';
// พิกัดทั้งหมดเป็นหน่วย "ช่อง" (tile) — วัตถุใช้มุมซ้ายบนของ footprint

const LOOK = {
  mira:  { hair: '#c4467c', skin: '#f6d6b8', eye: '#3a2440', tunic: '#f1e9d6', pants: '#7a5a9e', boot: '#5a3f60', belt: '#c9a24a', hairStyle: 'ponytail', accessory: 'ribbon' },
  toben: { hair: '#5e3f27', skin: '#e9bb90', eye: '#2a2030', tunic: '#5c8c3e', pants: '#5a4530', boot: '#33261c', belt: '#c9a24a', hairStyle: 'short', accessory: 'hat' },
  guard: { hair: '#4a3a2e', skin: '#efc49c', eye: '#2a2030', tunic: '#9aa1ae', pants: '#4c5260', boot: '#2c2f38', belt: '#8a3b3b', hairStyle: 'short', accessory: 'guard' },
  garth: { hair: '#3a2a20', skin: '#c98e62', eye: '#2a2030', tunic: '#7a4e3a', pants: '#4a3a2e', boot: '#2a2018', belt: '#5a3a26', hairStyle: 'short', accessory: 'smith', headgear: 'bandana', headColor: '#4a4f5a' },
  elsa:  { hair: '#e8d4a0', skin: '#f6d6b8', eye: '#2a5a4a', tunic: '#2f6a5a', pants: '#3a3a4a', boot: '#3a2a20', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'clerk', hatColor: '#2f6a5a' },
  celes: { hair: '#b8c8ff', skin: '#f3d3bb', eye: '#4a3a8a', tunic: '#4a3a8a', pants: '#2e2a4a', boot: '#2a2238', belt: '#e8c050', hairStyle: 'short', accessory: 'wizard', hatColor: '#4a3a8a', orbColor: '#7fe0ff', scarf: '#e8c050' },
  aurel: { hair: '#ece6da', skin: '#efc8a4', eye: '#3a2a4a', tunic: '#5a3a7a', pants: '#3a2a4a', boot: '#2a1e2a', belt: '#e8c050', hairStyle: 'short', accessory: 'none', jobGear: 'acolyte', scarf: '#e8c050' },
  nina:  { hair: '#9a5a3a', skin: '#f6d6b8', eye: '#3a2a20', tunic: '#a8423a', pants: '#3a2a3a', boot: '#2e2024', belt: '#e8c050', hairStyle: 'ponytail', accessory: 'clerk', hatColor: '#a8423a' },
  pip:   { hair: '#2e2a33', skin: '#f0c49a', eye: '#2a2030', tunic: '#e0a040', pants: '#3f6a8a', boot: '#2e2420', belt: '#7a5232', hairStyle: 'spiky', accessory: 'none', scale: 0.82 },
};

const W = 64, H = 48;

// ป่ารอบนอกกำแพง
const borderTrees = () => _borderTrees(W, H, 3, [{ x0: 61, x1: 63, y0: 20, y1: 27 }]);

const innerTrees = [
  [13, 6], [13, 12], [22, 13], [26, 8], [25, 13], [5, 18],
  [37, 7], [45, 7], [57, 12], [56, 17], [5, 28], [15, 28],
  [24, 38], [26, 34], [5, 41], [15, 42], [55, 29], [44, 39], [57, 40], [34, 37],
].map(([x, y], i) => ({ kind: i % 4 === 3 ? 'pine' : 'tree', x, y, seed: 500 + i * 7 }));

export const ASTERIA_TOWN = {
  id: 'asteria_town',
  name: 'Asteria Town',
  subtitle: 'เมืองแห่งการเริ่มต้น',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 31.5, y: 27.5 },
  music: 'town',
  safe: true, // เมือง: ไม่มีมอนสเตอร์
  theme: { cobble: 'gray', lamp: 'teal' },

  // ลำดับมีผล: อันหลังทับอันก่อน
  regions: [
    { tile: 'FLOWERS', rect: [6, 19, 6, 2] },
    { tile: 'FLOWERS', rect: [36, 40, 8, 2] },
    { tile: 'FLOWERS', rect: [52, 28, 5, 2] },
    { tile: 'FLOWERS', rect: [21, 32, 4, 2] },
    { tile: 'FLOWERS', rect: [6, 35, 9, 1] },
    { tile: 'DIRT', rect: [35, 12, 16, 4] },
    { tile: 'WALL', ring: [3, 3, 58, 42, 2] },
    { tile: 'PATH', rect: [5, 22, 59, 4] },   // ถนนตะวันตก–ตะวันออก (ทะลุประตู)
    { tile: 'PATH', rect: [30, 5, 4, 38] },   // ถนนเหนือ–ใต้
    { tile: 'PLAZA', rect: [24, 17, 16, 14] }, // ลานกลางเมือง
    { tile: 'WATER', rect: [7, 37, 7, 5] },   // บ่อน้ำ
  ],

  objects: [
    { kind: 'fountain', x: 30, y: 21 },
    { kind: 'house', x: 7, y: 8, w: 5, roof: '#b5473a', seed: 1 },
    { kind: 'house', x: 15, y: 8, w: 6, roof: '#6a5a94', seed: 2 },
    { kind: 'house', x: 7, y: 15, w: 5, roof: '#5a8a3c', wall: '#efe2c4', seed: 3 },
    { kind: 'house', x: 50, y: 7, w: 6, roof: '#5a4f86', seed: 4 },
    { kind: 'house', x: 48, y: 16, w: 5, roof: '#c9822f', wall: '#efe2c4', seed: 5 },
    { kind: 'house', x: 8, y: 30, w: 6, roof: '#4f6a9e', wall: '#efe2c4', seed: 6 },
    { kind: 'house', x: 17, y: 35, w: 5, roof: '#b5473a', seed: 7 },
    { kind: 'house', x: 38, y: 32, w: 6, roof: '#6a5a94', seed: 8 },
    { kind: 'house', x: 49, y: 34, w: 5, roof: '#c9822f', seed: 9 },
    { kind: 'stall', x: 36, y: 13, color: '#d84a4a', seed: 1 },
    { kind: 'stall', x: 40, y: 13, color: '#3f7fd8', seed: 2 },
    { kind: 'stall', x: 44, y: 13, color: '#e0b030', seed: 3 },
    { kind: 'crate', x: 35, y: 13 },
    { kind: 'barrel', x: 47, y: 12 },
    { kind: 'barrel', x: 47, y: 13 },
    { kind: 'well', x: 46, y: 28 },
    { kind: 'lamp', x: 28, y: 19 }, { kind: 'lamp', x: 35, y: 19 },
    { kind: 'lamp', x: 28, y: 28 }, { kind: 'lamp', x: 35, y: 28 },
    { kind: 'lamp', x: 57, y: 20 }, { kind: 'lamp', x: 57, y: 27 },
    { kind: 'bench', x: 25, y: 20 }, { kind: 'bench', x: 37, y: 20 },
    // v0.5: แท่นผลึกวาร์ปของเซเลส + หีบคลังของเอลซ่า
    { kind: 'warpstone', x: 24, y: 18 },
    { kind: 'chest', x: 39, y: 18 },
    { kind: 'crate', x: 39, y: 17 },
    // v0.6: ป้ายสมาคมนักผจญภัย (ออเรล — เปลี่ยนอาชีพ)
    { kind: 'sign', x: 28, y: 13, text: 'Adventurer Guild' },
    { kind: 'sign', x: 61, y: 21 },
    // หอคอยประตูเมืองและมุมกำแพง
    { kind: 'tower', x: 59, y: 20, roof: '#b5473a' }, { kind: 'tower', x: 59, y: 26, roof: '#b5473a' },
    { kind: 'tower', x: 3, y: 3, roof: '#3f6fb5' }, { kind: 'tower', x: 59, y: 3, roof: '#3f6fb5' },
    { kind: 'tower', x: 3, y: 43, roof: '#3f6fb5' }, { kind: 'tower', x: 59, y: 43, roof: '#3f6fb5' },
    ...innerTrees,
    ...borderTrees(),
  ],

  npcs: [
    { id: 'mira', name: 'มีร่า', title: 'ไกด์', x: 27, y: 26, dir: 'down', look: LOOK.mira, lines: [
      'ยินดีต้อนรับสู่ Asteria Town นักผจญภัยหน้าใหม่!',
      'คลิกที่พื้นเพื่อเดิน หรือกดเมาส์ค้างไว้ให้ตัวละครเดินตาม',
      'ประตูมิติทางตะวันออกพาไปยัง Beginner Field ลองไปฝึกฝีมือดูสิ',
      'คลิกที่มอนสเตอร์เพื่อโจมตี ตัวละครจะเดินเข้าไปตีให้เอง',
      'ทุกครั้งที่เลเวลอัปจะได้แต้มสเตตัส กด C หรือแตะกรอบตัวละครเพื่อเปิดหน้าต่างสถานะ',
      'อยากตีแรงอัป STR อยากหลบเก่งอัป AGI อยากอึดอัป VIT เลือกให้เข้ากับสไตล์เจ้าเลย',
      'ของที่เก็บได้จากมอนสเตอร์ เอาไปขายให้โทเบนหรือการ์ธที่ตลาดทางเหนือได้นะ',
      'ของที่ยังไม่ใช้ฝากไว้กับเอลซ่าได้ ส่วนเซเลสวาร์ปพาไปไกล ๆ ในทุ่งได้',
      'ถึง Job Lv.10 แล้วอัปสกิลทักษะพื้นฐานให้ครบ Lv.9 (กด K) จากนั้นไปหาออเรลทางเหนือของลานนี้เพื่อเปลี่ยนอาชีพ'
    ] },
    { id: 'toben', name: 'โทเบน', title: 'ร้านของใช้', x: 41, y: 14, dir: 'down', look: LOOK.toben,
      service: { type: 'shop', shop: 'tools' },
      greet: 'ยินดีต้อนรับ! ยาและสมุนไพรสดใหม่ทุกวัน ของที่เก็บมาจากทุ่งก็เอามาขายให้ข้าได้นะ',
      lines: ['เก็บเงินไว้ดี ๆ ล่ะ ของดีราคาไม่ถูกนะ'] },
    { id: 'garth', name: 'การ์ธ', title: 'ช่างตีเหล็ก', x: 37, y: 14, dir: 'down', look: LOOK.garth,
      service: { type: 'shop', shop: 'arms', refine: true },
      greet: 'อาวุธกับชุดเกราะฝีมือข้า รับรองว่าทนทาน! จะซื้อของ หรือให้ข้าตีบวกอุปกรณ์ให้ก็ได้',
      lines: ['ดาบดีต้องตีด้วยใจ'] },
    { id: 'elsa', name: 'เอลซ่า', title: 'ผู้ดูแลคลัง', x: 37, y: 18, dir: 'down', look: LOOK.elsa,
      service: { type: 'storage' },
      greet: 'สวัสดีค่ะ คลังเก็บของ Asteria ยินดีให้บริการ ฝากของไว้ที่นี่ได้ฟรีเลยนะคะ',
      lines: ['ของในคลังจะอยู่ครบทุกชิ้น ไม่ต้องห่วงค่ะ'] },
    { id: 'celes', name: 'เซเลส', title: 'นักเวทย์วาร์ป', x: 26, y: 18, dir: 'down', look: LOOK.celes,
      service: { type: 'warp', routes: 'town' },
      greet: 'อยากไปที่ไหนล่ะ? ข้าส่งเจ้าไปได้ในพริบตา แค่จ่ายค่าผลึกเวทย์นิดหน่อย',
      lines: ['ผลึกวาร์ปเชื่อมกับแท่นที่ลานซากโบราณในทุ่ง'] },
    { id: 'aurel', name: 'ออเรล', title: 'ประมุขสมาคมนักผจญภัย', x: 28, y: 15, dir: 'down', look: LOOK.aurel,
      service: { type: 'job' },
      greet: 'ข้าคือออเรล ผู้ดูแลการเปลี่ยนอาชีพของ Asteria เจ้าพร้อมจะเลือกเส้นทางของตัวเองแล้วหรือยัง?',
      lines: ['นักดาบ นักเวทย์ นักธนู นักบวช ทุกเส้นทางล้วนมีคุณค่า'] },
    { id: 'nina', name: 'นีน่า', title: 'กระดานเควสรายวัน', x: 31, y: 15, dir: 'down', look: LOOK.nina, lines: [
      'กระดานเควสมีงานใหม่ทุกวันนะคะ ทำได้วันละครั้ง รีเซ็ตตอนเที่ยงคืน',
      'เควสที่เลเวลยังไม่ถึงจะยังไม่แสดงนะคะ ฝึกเพิ่มอีกนิดแล้วกลับมาค่ะ',
      'วันนี้ทำเควสครบแล้วเหรอคะ? เก่งมากเลย พรุ่งนี้มาใหม่นะคะ',
    ] },
    { id: 'rowan', name: 'โรวัน', title: 'ทหารยาม', x: 58, y: 21, dir: 'left', look: LOOK.guard, lines: [
      'นอกกำแพงมีมอนสเตอร์ ระวังตัวด้วย',
      'ถ้าหมดสติในทุ่ง เจ้าจะฟื้นที่ลานน้ำพุนี่แหละ',
    ] },
    { id: 'brann', name: 'แบรนน์', title: 'ทหารยาม', x: 58, y: 26, dir: 'left', look: LOOK.guard, lines: [
      'ข้าเฝ้าประตูนี้มาสิบปีแล้ว',
    ] },
    { id: 'pip', name: 'พิป', title: 'เด็กชาวเมือง', x: 15, y: 39, dir: 'left', look: LOOK.pip, lines: [
      'ปลาในบ่อนี้ตัวใหญ่มากเลยนะ!',
      'โตขึ้นผมจะเป็นนักดาบให้ได้',
    ] },
  ],

  portals: [
    { x: 62, y: 23, w: 2, h: 2, to: 'beginner_field', arrive: { x: 5.5, y: 27.5, angle: Math.PI / 2 }, label: 'Beginner Field' },
  ],
};
