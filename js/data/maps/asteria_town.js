// ข้อมูลแผนที่ Asteria Town (เมืองเริ่มต้น) — v0.27 รีมาสเตอร์: ลานวงกลมกลางเมือง · คลองตะวันตก · 4 ย่าน
import { borderTrees as _borderTrees, scaleMap } from './helpers.js?v=0.43.2';
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
  brom:  { hair: '#6a4a30', skin: '#d9a87e', eye: '#2a2030', tunic: '#5a6a7a', pants: '#3a3a44', boot: '#2a2420', belt: '#8a6a3a', hairStyle: 'short', accessory: 'backpack', headgear: 'bandana', headColor: '#4a8ab8' },   // v0.32
  selva: { hair: '#e8e0f8', skin: '#f0d0c0', eye: '#5a3a9a', tunic: '#3a2e6a', pants: '#26203e', boot: '#1e1a30', belt: '#d8b45c', hairStyle: 'long', accessory: 'wizard', hatColor: '#3a2e6a', orbColor: '#c8a8ff', scarf: '#d8b45c' },
  pip:   { hair: '#2e2a33', skin: '#f0c49a', eye: '#2a2030', tunic: '#e0a040', pants: '#3f6a8a', boot: '#2e2420', belt: '#7a5232', hairStyle: 'spiky', accessory: 'none', scale: 0.82 },
};

const W = 72, H = 56;

// ป่ารอบนอกกำแพง (เว้นทางออกประตูตะวันออก)
const borderTrees = () => _borderTrees(W, H, 3, [{ x0: 66, x1: 71, y0: 24, y1: 31 }], 2027, 0.9);

// ต้นสนเรียงสองข้างถนนเหนือ–ใต้ + ต้นไม้ริมคลอง/ในย่าน
const T = (kind, list, s) => list.map(([x, y], i) => ({ kind, x, y, seed: s + i * 7 }));
const innerTrees = [
  ...T('pine', [[32, 6], [32, 9], [32, 12], [32, 15], [39, 6], [39, 9], [39, 12], [39, 15], [32, 39], [32, 42], [32, 45], [32, 48], [39, 39], [39, 42], [39, 45], [39, 48]], 300),
  ...T('tree', [[6, 7], [8, 10], [6, 14], [8, 18], [6, 22], [6, 33], [8, 36], [6, 39], [14, 6], [41, 6], [64, 13], [64, 20], [15, 30], [24, 30], [62, 34], [56, 49], [48, 49], [24, 50], [17, 50]], 500),
];

const RAW = {
  id: 'asteria_town',
  name: 'Asteria Town',
  subtitle: 'เมืองแห่งการเริ่มต้น',
  width: W,
  height: H,
  fill: 'GRASS',
  spawn: { x: 36, y: 31.5 },
  music: 'town',
  safe: true, // เมือง: ไม่มีมอนสเตอร์
  theme: { cobble: 'gray', lamp: 'teal' },
  // v0.27: ชื่อย่านสำหรับแผนที่เมือง (ป้ายบนแผนที่ใหญ่)
  districts: [
    { name: 'ย่านช่าง', x: 23, y: 15 }, { name: 'หอสมาคม', x: 52, y: 15 },
    { name: 'ลานน้ำพุ', x: 36, y: 24 }, { name: 'คลังสินค้า', x: 20, y: 40 }, { name: 'ตลาดนัด', x: 51, y: 40 },
  ],

  // ลำดับมีผล: อันหลังทับอันก่อน
  regions: [
    // แปลงดอกไม้
    { tile: 'FLOWERS', rect: [5, 30, 4, 3] }, { tile: 'FLOWERS', rect: [61, 36, 5, 8] },
    { tile: 'FLOWERS', circle: [24.5, 26, 2.2] }, { tile: 'FLOWERS', circle: [47.5, 26, 2.2] },
    { tile: 'FLOWERS', rect: [14, 28, 2, 2] }, { tile: 'FLOWERS', rect: [44, 10, 2, 2] },
    // กำแพงเมือง
    { tile: 'WALL', ring: [3, 3, 66, 50, 2] },
    // ลานย่าน
    { tile: 'DIRT', rect: [15, 13, 17, 11] },            // ลานย่านช่าง
    { tile: 'PLAZA', rect: [42, 13, 20, 10] },           // ลานหน้าหอสมาคม
    { tile: 'DIRT', rect: [42, 35, 18, 9] },             // ตลาดนัด
    { tile: 'PLAZA', rect: [16, 36, 10, 3] },            // ลานหน้าคลัง
    // ถนนหลัก (ทะลุประตูตะวันออก)
    { tile: 'PATH', rect: [5, 26, 67, 4] },
    { tile: 'PATH', rect: [34, 5, 4, 46] },
    // ทางเดินแยกเข้าย่าน
    { tile: 'PATH', path: [[18, 12], [18, 26]], w: 2 },
    { tile: 'PATH', path: [[27, 12], [27, 26]], w: 2 },
    { tile: 'PATH', path: [[51.5, 12], [51.5, 26]], w: 2 },
    { tile: 'PATH', path: [[20, 39], [20, 30]], w: 2 },
    { tile: 'PATH', path: [[51, 34], [51, 30]], w: 2 },
    { tile: 'PATH', path: [[22, 44], [30, 44], [34, 44]], w: 2 },
    { tile: 'PATH', path: [[38, 44], [42, 44]], w: 2 },
    // ลานน้ำพุวงกลม
    { tile: 'PLAZA', circle: [36, 28, 8.5] },
    { tile: 'FLOWERS', circle: [36, 28, 1.2] },
    // คลองฝั่งตะวันตก + สระ + สะพาน
    { tile: 'WATER', rect: [10, 5, 2, 38] },
    { tile: 'WATER', circle: [11, 45.5, 4.2, 3.8] },
    { tile: 'BRIDGE', rect: [10, 26, 2, 4] },
  ],

  objects: [
    { kind: 'fountain', x: 34, y: 26 },
    // ย่านช่าง (ตะวันตกเฉียงเหนือ)
    { kind: 'house', x: 15, y: 7, w: 6, roof: '#7a3a2a', wall: '#e4d2b0', seed: 11 },   // โรงตีเหล็ก
    { kind: 'house', x: 24, y: 7, w: 6, roof: '#5a8a3c', seed: 12 },                    // ร้านของใช้
    { kind: 'stall', x: 16, y: 16, color: '#d84a4a', seed: 1 },
    { kind: 'stall', x: 22, y: 19, color: '#3f7fd8', seed: 2 },
    { kind: 'stall', x: 28, y: 16, color: '#e0b030', seed: 3 },
    { kind: 'crate', x: 15, y: 21 }, { kind: 'barrel', x: 16, y: 21 }, { kind: 'barrel', x: 30, y: 13 }, { kind: 'crate', x: 30, y: 14 },
    { kind: 'barrel', x: 21, y: 11 }, { kind: 'crate', x: 22, y: 11 },
    { kind: 'sign', x: 20, y: 12, text: 'Forge' }, { kind: 'sign', x: 29, y: 11, text: 'Tools' },
    // หอสมาคมนักผจญภัย (ตะวันออกเฉียงเหนือ)
    { kind: 'house', x: 47, y: 7, w: 9, roof: '#3a4f9e', wall: '#efe6d0', seed: 13 },
    { kind: 'tower', x: 44, y: 7, roof: '#d8b45c' }, { kind: 'tower', x: 57, y: 7, roof: '#d8b45c' },
    { kind: 'house', x: 60, y: 7, w: 5, roof: '#6a5a94', seed: 14 },
    { kind: 'sign', x: 55, y: 11, text: 'Quest Board' }, { kind: 'sign', x: 48, y: 11, text: 'Adventurer Guild' },
    { kind: 'pillar', x: 43, y: 14, seed: 1 }, { kind: 'pillar', x: 43, y: 20, seed: 2 },
    { kind: 'pillar', x: 60, y: 14, seed: 3 }, { kind: 'pillar', x: 60, y: 20, seed: 4 },
    { kind: 'bench', x: 46, y: 18 }, { kind: 'bench', x: 56, y: 18 },
    { kind: 'sign', x: 44, y: 16, text: 'Crystal Cave' }, { kind: 'sign', x: 59, y: 16, text: 'Endless Spire' },   // v0.32
    // ลานน้ำพุ (กลางเมือง)
    { kind: 'warpstone', x: 30, y: 24 },
    { kind: 'lamp', x: 30, y: 21 }, { kind: 'lamp', x: 41, y: 21 }, { kind: 'lamp', x: 30, y: 34 }, { kind: 'lamp', x: 41, y: 34 },
    { kind: 'bench', x: 28, y: 25 }, { kind: 'bench', x: 42, y: 25 }, { kind: 'bench', x: 28, y: 31 }, { kind: 'bench', x: 42, y: 31 },
    { kind: 'lamp', x: 33, y: 8 }, { kind: 'lamp', x: 38, y: 47 }, { kind: 'lamp', x: 8, y: 25 }, { kind: 'lamp', x: 48, y: 25 }, { kind: 'lamp', x: 57, y: 25 }, { kind: 'lamp', x: 21, y: 25 },
    // คลังสินค้า + บ้านพัก (ตะวันตกเฉียงใต้)
    { kind: 'house', x: 16, y: 33, w: 8, roof: '#2f6a5a', wall: '#efe2c4', seed: 15 },
    { kind: 'chest', x: 22, y: 37 }, { kind: 'crate', x: 23, y: 37 }, { kind: 'barrel', x: 24, y: 37 },
    { kind: 'house', x: 26, y: 39, w: 5, roof: '#b5473a', seed: 16 },
    { kind: 'house', x: 18, y: 45, w: 5, roof: '#c9822f', wall: '#efe2c4', seed: 17 },
    { kind: 'house', x: 26, y: 46, w: 5, roof: '#4f6a9e', seed: 18 },
    { kind: 'bench', x: 16, y: 40 },
    // ตลาดนัด (ตะวันออกเฉียงใต้)
    { kind: 'stall', x: 43, y: 37, color: '#d84a4a', seed: 4 }, { kind: 'stall', x: 48, y: 37, color: '#4aa86a', seed: 5 }, { kind: 'stall', x: 53, y: 37, color: '#3f7fd8', seed: 6 },
    { kind: 'stall', x: 43, y: 41, color: '#e0b030', seed: 7 }, { kind: 'stall', x: 53, y: 41, color: '#a05ad8', seed: 8 },
    { kind: 'well', x: 49, y: 41 }, { kind: 'crate', x: 57, y: 37 }, { kind: 'barrel', x: 57, y: 38 },
    { kind: 'house', x: 45, y: 31, w: 5, roof: '#6a5a94', seed: 19 },
    { kind: 'house', x: 55, y: 31, w: 6, roof: '#c9822f', seed: 20 },
    { kind: 'house', x: 41, y: 46, w: 6, roof: '#b5473a', wall: '#efe2c4', seed: 21 },
    { kind: 'house', x: 50, y: 46, w: 5, roof: '#5a8a3c', seed: 22 },
    { kind: 'house', x: 58, y: 46, w: 6, roof: '#3a4f9e', seed: 23 },
    // ประตูตะวันออก + หอคอยมุมกำแพง
    { kind: 'tower', x: 67, y: 24, roof: '#b5473a' }, { kind: 'tower', x: 67, y: 30, roof: '#b5473a' },
    { kind: 'lamp', x: 64, y: 24 }, { kind: 'lamp', x: 64, y: 31 },
    { kind: 'sign', x: 66, y: 31, text: 'Beginner Field ➜' },
    { kind: 'tower', x: 3, y: 3, roof: '#3f6fb5' }, { kind: 'tower', x: 67, y: 3, roof: '#3f6fb5' },
    { kind: 'tower', x: 3, y: 51, roof: '#3f6fb5' }, { kind: 'tower', x: 67, y: 51, roof: '#3f6fb5' },
    { kind: 'tower', x: 34, y: 3, roof: '#3f6fb5' }, { kind: 'tower', x: 36, y: 51, roof: '#3f6fb5' }, { kind: 'tower', x: 3, y: 27, roof: '#3f6fb5' },
    ...innerTrees,
  ],

  npcs: [
    { id: 'mira', name: 'มีร่า', title: 'ไกด์', x: 33, y: 31, dir: 'down', look: LOOK.mira, lines: [
      'ยินดีต้อนรับสู่ Asteria Town นักผจญภัยหน้าใหม่!',
      'คลิกที่พื้นเพื่อเดิน หรือกดเมาส์ค้างไว้ให้ตัวละครเดินตาม',
      'ประตูมิติทางตะวันออกพาไปยัง Beginner Field ลองไปฝึกฝีมือดูสิ',
      'คลิกที่มอนสเตอร์เพื่อโจมตี ตัวละครจะเดินเข้าไปตีให้เอง',
      'ทุกครั้งที่เลเวลอัปจะได้แต้มสเตตัส กด C หรือแตะกรอบตัวละครเพื่อเปิดหน้าต่างสถานะ',
      'อยากตีแรงอัป STR อยากหลบเก่งอัป AGI อยากอึดอัป VIT เลือกให้เข้ากับสไตล์เจ้าเลย',
      'ของที่เก็บได้จากมอนสเตอร์ เอาไปขายให้โทเบนหรือการ์ธที่ย่านช่างฝั่งตะวันตกเฉียงเหนือได้นะ',
      'ของที่ยังไม่ใช้ฝากไว้กับเอลซ่าได้ ส่วนเซเลสวาร์ปพาไปไกล ๆ ในทุ่งได้',
      'ถึง Job Lv.10 แล้วอัปสกิลทักษะพื้นฐานให้ครบ Lv.9 (กด K) จากนั้นไปหาออเรลที่หอสมาคมฝั่งตะวันออกเฉียงเหนือเพื่อเปลี่ยนอาชีพ'
    ] },
    { id: 'toben', name: 'โทเบน', title: 'ร้านของใช้', x: 27, y: 11, dir: 'down', look: LOOK.toben,
      service: { type: 'shop', shop: 'tools' },
      greet: 'ยินดีต้อนรับ! ยาและสมุนไพรสดใหม่ทุกวัน ของที่เก็บมาจากทุ่งก็เอามาขายให้ข้าได้นะ',
      lines: ['เก็บเงินไว้ดี ๆ ล่ะ ของดีราคาไม่ถูกนะ'] },
    { id: 'garth', name: 'การ์ธ', title: 'ช่างตีเหล็ก', x: 18, y: 11, dir: 'down', look: LOOK.garth,
      service: { type: 'shop', shop: 'arms', refine: true },
      greet: 'อาวุธกับชุดเกราะฝีมือข้า รับรองว่าทนทาน! จะซื้อของ หรือให้ข้าตีบวกอุปกรณ์ให้ก็ได้',
      lines: ['ดาบดีต้องตีด้วยใจ'] },
    { id: 'elsa', name: 'เอลซ่า', title: 'ผู้ดูแลคลัง', x: 20, y: 37, dir: 'down', look: LOOK.elsa,
      service: { type: 'storage' },
      greet: 'สวัสดีค่ะ คลังเก็บของ Asteria ยินดีให้บริการ ฝากของไว้ที่นี่ได้ฟรีเลยนะคะ',
      lines: ['ของในคลังจะอยู่ครบทุกชิ้น ไม่ต้องห่วงค่ะ'] },
    // v0.42 ตลาดฝากขาย (ลานแผงลอย)
    { id: 'mercer', name: 'เมอร์เซอร์', title: 'นายตลาด', x: 48, y: 40, dir: 'down',
      look: { hair: '#3a2a20', skin: '#e8b98f', eye: '#2a2030', tunic: '#8a3a2a', pants: '#3a2e28', boot: '#2a1e18', belt: '#e8c050', hairStyle: 'short', accessory: 'hat', hatColor: '#5a2a1e' },
      service: { type: 'market' },
      greet: 'ตลาดนักผจญภัยมาแล้ว! จะหาของดี หรือฝากของขาย บอกข้ามาได้เลย',
      lines: ['ของทุกชิ้นในตลาดผ่านการตรวจของสมาคมแล้ว ซื้อได้สบายใจ'] },
    { id: 'celes', name: 'เซเลส', title: 'นักเวทย์วาร์ป', x: 31, y: 23, dir: 'down', look: LOOK.celes,
      service: { type: 'warp', routes: 'town' },
      greet: 'อยากไปที่ไหนล่ะ? ข้าส่งเจ้าไปได้ในพริบตา แค่จ่ายค่าผลึกเวทย์นิดหน่อย',
      lines: ['ผลึกวาร์ปเชื่อมกับแท่นที่ลานซากโบราณในทุ่ง', 'กดปุ่มแผนที่โลกเพื่อดูว่าแต่ละที่มีมอนสเตอร์อะไรบ้าง'] },
    { id: 'aurel', name: 'ออเรล', title: 'ประมุขสมาคมนักผจญภัย', x: 50, y: 11, dir: 'down', look: LOOK.aurel,
      service: { type: 'job' },
      greet: 'ข้าคือออเรล ผู้ดูแลการเปลี่ยนอาชีพของ Asteria เจ้าพร้อมจะเลือกเส้นทางของตัวเองแล้วหรือยัง?',
      lines: ['นักดาบ นักเวทย์ นักธนู นักบวช ทุกเส้นทางล้วนมีคุณค่า'] },
    // v0.32: ดันเจี้ยนถ้ำ + หอคอยไต่ชั้น
    { id: 'brom', name: 'บรอม', title: 'หัวหน้าหน่วยสำรวจถ้ำ', x: 46, y: 16, dir: 'down', look: LOOK.brom,
      service: { type: 'dungeon' },
      greet: 'ถ้ำผลึกก้องลึกเปิดให้สำรวจแล้ว! ลงไปทีละชั้น ปราบบอสท้ายชั้นให้ได้ แล้วหีบสมบัติก้นถ้ำเป็นของเจ้า',
      lines: ['ในถ้ำมอนแรงกว่าข้างนอก แต่ผลึกตีบวกก็ตกบ่อยกว่าเยอะ', 'เข้าได้วันละ 3 รอบ พรุ่งนี้ค่อยมาใหม่'] },
    { id: 'selva', name: 'เซลวา', title: 'ผู้เฝ้าหอคอยนิรันดร์', x: 57, y: 16, dir: 'down', look: LOOK.selva,
      service: { type: 'tower' },
      greet: 'หอคอยนี้ไม่มีชั้นบนสุด... ยิ่งขึ้นสูง ศัตรูยิ่งแข็งแกร่ง เจ้าจะไปได้ไกลแค่ไหนกัน?',
      lines: ['ชื่อของผู้ที่ไต่ได้สูงที่สุดจะถูกจารึกไว้บนกระดานอันดับ', 'ทุกสิบชั้นข้าจะจำทางให้ เริ่มใหม่จากตรงนั้นได้'] },
    { id: 'nina', name: 'นีน่า', title: 'กระดานเควสรายวัน', x: 53, y: 11, dir: 'down', look: LOOK.nina, lines: [
      'กระดานเควสมีงานใหม่ทุกวันนะคะ ทำได้วันละครั้ง รีเซ็ตตอนเที่ยงคืน',
      'เควสที่เลเวลยังไม่ถึงจะยังไม่แสดงนะคะ ฝึกเพิ่มอีกนิดแล้วกลับมาค่ะ',
      'วันนี้ทำเควสครบแล้วเหรอคะ? เก่งมากเลย พรุ่งนี้มาใหม่นะคะ',
    ] },
    { id: 'rowan', name: 'โรวัน', title: 'ทหารยาม', x: 65, y: 26, dir: 'left', look: LOOK.guard, lines: [
      'นอกกำแพงมีมอนสเตอร์ ระวังตัวด้วย',
      'ถ้าหมดสติในทุ่ง เจ้าจะฟื้นที่ลานน้ำพุนี่แหละ',
    ] },
    { id: 'brann', name: 'แบรนน์', title: 'ทหารยาม', x: 65, y: 29, dir: 'left', look: LOOK.guard, lines: [
      'ข้าเฝ้าประตูนี้มาสิบปีแล้ว',
    ] },
    { id: 'pip', name: 'พิป', title: 'เด็กชาวเมือง', x: 16, y: 42, dir: 'left', look: LOOK.pip, lines: [
      'ปลาในบ่อนี้ตัวใหญ่มากเลยนะ!',
      'โตขึ้นผมจะเป็นนักดาบให้ได้',
    ] },
  ],

  portals: [
    { x: 69, y: 27, w: 2, h: 2, to: 'beginner_field', arrive: { x: 5.5, y: 27.5, angle: Math.PI / 2 }, label: 'Beginner Field' },
  ],
};

// v0.41.1: ขยายเมืองทั้งเมือง 1.5 เท่า (บ้าน/หอคอย/ร้าน/ของตกแต่งใหญ่ขึ้นให้สมดุลกับตัวละครพิกเซล) · ป่ารอบนอกสร้างใหม่ตามขนาดใหม่
export const TOWN_SCALE = 1.5;
const SCALED = scaleMap(RAW, TOWN_SCALE);
SCALED.objects.push(...(() => { const w = SCALED.width, h = SCALED.height, p = SCALED.portals[0]; return _borderTrees(w, h, 4, [{ x0: p.x - 3, x1: w, y0: p.y - 3, y1: p.y + p.h + 2 }], 2027, 0.9).map((t) => ({ ...t, vs: 1.2 })); })());
export const ASTERIA_TOWN = SCALED;
