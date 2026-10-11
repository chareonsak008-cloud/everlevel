// เพลงประกอบ (v0.11) — แต่งใหม่ทั้งหมด เล่นด้วยเครื่องสังเคราะห์เสียงใน audio/AudioEngine.js
// root = โน้ต MIDI ของคีย์ · scale = บันไดเสียง · chords = ดีกรีของคอร์ดต่อห้อง (0 = คอร์ดหลัก)
// melody = ทำนองห้องละ 8 จังหวะ (เขบ็ตหนึ่งชั้น): ตัวเลข = ดีกรีในบันไดเสียง · '-' = ลากเสียงต่อ · '.' = เงียบ
// drums = รูปแบบกลอง 8 จังหวะ ('1' = ตี)
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const HARM = [0, 2, 3, 5, 7, 8, 11];

export const SONGS = {
  // เมือง Asteria: อบอุ่น สดใส
  town: {
    bpm: 96, root: 60, scale: MAJOR, lead: 'pluck', leadVol: 0.2, pad: true, padVol: 0.045, bass: 'walk', arp: null,
    chords: [0, 4, 5, 3, 0, 4, 3, 4],
    melody: ['4 - 2 4 7 - 4 -', '6 - 4 6 8 - 6 -', '5 - 7 5 4 - 2 -', '3 - 5 7 5 - . .', '4 - 2 4 7 - 9 -', '8 - 6 4 6 - 8 -', '7 - 5 3 5 4 3 2', '1 - 4 - 0 - . .'],
    drums: { kick: '1...1...', snare: '....1...', hat: '..1...1.', kickVol: 0.5, snareVol: 0.2, hatVol: 0.08 },
  },
  // ทุ่งหญ้า: ผจญภัย คึกคัก
  field: {
    bpm: 116, root: 55, scale: MAJOR, lead: 'square', leadVol: 0.16, pad: true, padVol: 0.04, bass: 'walk',
    chords: [0, 3, 4, 0, 5, 3, 4, 4],
    melody: ['0 . 2 4 7 - 6 5', '3 - 5 3 7 - 5 -', '4 - 6 8 7 6 4 -', '0 - 4 - 7 - . .', '5 - 7 9 8 7 5 -', '3 - 5 7 8 - 7 -', '4 5 6 7 8 - 6 -', '4 - - - 6 - 8 -'],
    drums: { kick: '1..1..1.', snare: '..1...1.', hat: '11111111', kickVol: 0.6, snareVol: 0.28, hatVol: 0.06 },
  },
  // ป่ากระซิบ: ลึกลับ เงียบสงบ
  forest: {
    bpm: 84, root: 62, scale: DORIAN, lead: 'flute', leadVol: 0.18, pad: true, padVol: 0.05, bass: 'walk', arp: 'pluck', arpVol: 0.05,
    chords: [0, 3, 0, 6, 0, 3, 4, 0],
    melody: ['4 - - 3 2 - 0 -', '. . 5 - 3 - 2 -', '4 - 6 - 7 - 6 4', '3 - - - . . . .', '4 - - 7 6 - 4 -', '5 - 3 - 2 - 3 -', '4 - 2 - 1 - 0 -', '0 - - - . . . .'],
    drums: { kick: '1.......', hat: '..1...1.', kickVol: 0.4, hatVol: 0.05 },
  },
  // ยอดเขาหิมะ: ระฆังใสเย็น ช้า ๆ
  snow: {
    bpm: 72, root: 64, scale: MINOR, lead: 'bell', leadVol: 0.2, pad: true, padVol: 0.055, bass: 'walk', bassVol: 0.22, arp: 'bell', arpVol: 0.045,
    chords: [0, 5, 2, 6, 0, 5, 3, 4],
    melody: ['7 . 9 . 10 . 9 7', '8 . 7 . 5 . 4 .', '9 . 7 . 4 . 5 7', '6 . . . 4 . . .', '7 . 9 . 11 . 10 9', '8 . 10 . 9 . 7 .', '5 . 7 . 8 . 5 3', '4 . . . . . . .'],
    drums: {},
  },
  // ภูเขาไฟ: หนักแน่น เร้าใจ
  lava: {
    bpm: 136, root: 50, scale: HARM, lead: 'brass', leadVol: 0.2, pad: false, bass: 'drive', bassVol: 0.26,
    chords: [0, 5, 0, 4, 0, 5, 3, 4],
    melody: ['0 0 3 0 4 - 3 2', '5 - 4 3 4 - . .', '0 0 3 0 4 - 7 6', '7 - 6 4 6 - . .', '7 - 7 8 7 6 4 -', '5 - 4 3 5 - 3 -', '3 - 2 0 2 - 3 4', '6 - - - 4 - - -'],
    drums: { kick: '1.1.1.1.', snare: '..1...1.', hat: '11111111', kickVol: 0.75, snareVol: 0.35, hatVol: 0.08 },
  },
  // ต่อสู้บอส MVP
  boss: {
    bpm: 152, root: 48, scale: MINOR, lead: 'brass', leadVol: 0.22, pad: true, padVol: 0.04, bass: 'drive', bassVol: 0.28,
    chords: [0, 5, 6, 4, 0, 3, 4, 4],
    melody: ['7 - 7 - 6 7 8 -', '8 - 7 5 7 - . .', '6 - 6 - 5 6 7 -', '4 - 2 4 6 - . .', '7 - 9 - 10 9 7 -', '8 - 10 - 8 7 5 -', '4 5 6 7 8 - 9 -', '11 - - - 7 - - -'],
    drums: { kick: '1.11.11.', snare: '..1...1.', hat: '11111111', hat16: true, kickVol: 0.8, snareVol: 0.4, hatVol: 0.07 },
  },
  // หน้าจอเข้าเกม
  title: {
    bpm: 80, root: 57, scale: MINOR, lead: 'flute', leadVol: 0.18, pad: true, padVol: 0.06, bass: 'walk', bassVol: 0.2, arp: 'bell', arpVol: 0.05,
    chords: [0, 5, 2, 6, 0, 3, 4, 4],
    melody: ['4 - - 7 6 - 4 -', '5 - 4 2 0 - - -', '2 - 4 6 7 - 9 -', '8 - 7 6 4 - - -', '4 - - 7 9 - 11 -', '10 - 9 7 5 - - -', '6 - 7 8 9 - 8 6', '7 - - - - - . .'],
    drums: {},
  },
};

// Two newly arranged variations share the supported synth instruments.
SONGS.ruins={...SONGS.forest,bpm:92,root:57,chords:[0,5,3,4,0,3,5,4],melody:['0 - 4 - 6 - 4 -','3 - 5 - 7 - . .','5 - 4 2 0 - . .','4 - - - 2 - 0 -']};
SONGS.haunted={...SONGS.snow,bpm:76,root:53,chords:[0,6,3,4,0,5,6,4],melody:['0 . 4 . 7 - 6 -','6 - 4 . 2 . . .','3 . 5 . 8 - 5 -','4 - 2 - 0 - . .']};
