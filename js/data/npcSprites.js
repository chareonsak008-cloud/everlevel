// v0.93 fix21 NPC ภาพพิกเซล (PixelLab) — แทนโมเดล 3 มิติของ NPC ด้วยแผ่นภาพ 8 ทิศ (ใช้ระบบเดียวกับตัวผู้เล่น)
// แผ่นภาพ: แถว = ทิศ N · NE · E · SE · S · SW · W · NW · คอลัมน์ = ท่ายืน (idle) ตามด้วยท่าเดิน (walk)
// cell = ขนาดช่อง (px) · head/foot = แถวพิกเซลปลายผม/ฝ่าเท้าในช่อง · ขนาดในเกม = พิกเซล × NPC_PX (ทุกตัวสเกลเดียวกัน)
// เพิ่ม NPC ใหม่: วางไฟล์ใน assets/npcs/ → ใส่ใน NPC_SHEETS → จับคู่ไอดี NPC ใน NPC_SPRITES (ไม่มีในรายการ = ใช้โมเดลเดิม)
const R = (a, n) => Array.from({ length: n }, (_, i) => a + i);

export const NPC_PX = 0.0185;   // หน่วยโลกต่อ 1 พิกเซลของภาพ NPC (ภาพ PixelLab 128px → สูงราวเท่าตัวผู้เล่น)
export const NPC_SHEETS = {
  npc_garth: { src: 'assets/npcs/garth.png', cell: 180, foot: 156, head: 19 },
  npc_mira: { src: 'assets/npcs/mira.png', cell: 180, foot: 168, head: 12 },
  npc_celes: { src: 'assets/npcs/celes.png', cell: 180, foot: 166, head: 6 },
  npc_toben: { src: 'assets/npcs/toben.png', cell: 180, foot: 157, head: 15 },
  npc_elsa: { src: 'assets/npcs/elsa.png', cell: 180, foot: 157, head: 22 },
  npc_mercer: { src: 'assets/npcs/mercer.png', cell: 180, foot: 157, head: 11 },
  npc_aurel: { src: 'assets/npcs/aurel.png', cell: 180, foot: 157, head: 23 },
  npc_brom: { src: 'assets/npcs/brom.png', cell: 180, foot: 155, head: 22 },
  npc_selva: { src: 'assets/npcs/selva.png', cell: 180, foot: 161, head: 12 },
  npc_nina: { src: 'assets/npcs/nina.png', cell: 180, foot: 156, head: 18 },
  npc_guard: { src: 'assets/npcs/guard.png', cell: 180, foot: 152, head: 24 },
  npc_pip: { src: 'assets/npcs/pip.png', cell: 136, foot: 109, head: 14 },
  npc_iris: { src: 'assets/npcs/iris.png', cell: 180, foot: 158, head: 12 },
  npc_lena: { src: 'assets/npcs/lena.png', cell: 180, foot: 158, head: 14 },
  npc_sylva: { src: 'assets/npcs/sylva.png', cell: 180, foot: 161, head: 10 },
  npc_fern: { src: 'assets/npcs/fern.png', cell: 180, foot: 158, head: 17 },
  npc_yuki: { src: 'assets/npcs/yuki.png', cell: 180, foot: 153, head: 16 },
  npc_bjorn: { src: 'assets/npcs/bjorn.png', cell: 180, foot: 155, head: 19 },
  npc_helga: { src: 'assets/npcs/helga.png', cell: 180, foot: 157, head: 16 },
  npc_ignis: { src: 'assets/npcs/ignis.png', cell: 180, foot: 153, head: 5 },
  npc_kael: { src: 'assets/npcs/kael.png', cell: 180, foot: 165, head: 14 },
  npc_roza: { src: 'assets/npcs/roza.png', cell: 180, foot: 159, head: 18 },
  npc_lyra_ruins: { src: 'assets/npcs/lyra_ruins.png', cell: 180, foot: 165, head: 13 },
};

// ไอดี NPC → แผ่นภาพ ('แผนที่:ไอดี' ใช้เมื่อไอดีซ้ำกันข้ามแผนที่)
export const NPC_SPRITES = {
  'garth': 'npc_garth',
  'mira': 'npc_mira',
  'celes': 'npc_celes',
  'toben': 'npc_toben',
  'elsa': 'npc_elsa',
  'mercer': 'npc_mercer',
  'aurel': 'npc_aurel',
  'brom': 'npc_brom',
  'selva': 'npc_selva',
  'nina': 'npc_nina',
  'rowan': 'npc_guard',
  'brann': 'npc_guard',
  'pip': 'npc_pip',
  'iris': 'npc_iris',
  'lena': 'npc_lena',
  'sylva': 'npc_sylva',
  'fern': 'npc_fern',
  'yuki': 'npc_yuki',
  'bjorn': 'npc_bjorn',
  'helga': 'npc_helga',
  'ignis': 'npc_ignis',
  'kael': 'npc_kael',
  'roza': 'npc_roza',
  'ancient_ruins:lyra': 'npc_lyra_ruins',
};

// แปลงเป็นรูปแบบแผ่นของ SheetChars
export function npcSheetDef(d) {
  const cols = d.cols || 1, idle = d.idle || 1;
  const size = d.height ? d.height * d.cell / (d.foot - d.head) : d.cell * NPC_PX;
  return {
    src: d.src, cols, rows: 8, rowsPerDir: 1, pixel: true, anch: null, npc: true,
    size, foot: d.foot / d.cell, head: Math.min(d.foot - 4, d.head + 10) / d.cell,
    anim: { idle: R(0, idle), walk: d.walk ? R(idle, d.walk) : R(0, idle), attack: R(0, idle), skill: R(0, idle) }, row: {},
    fps: { idle: { fps: 6, loop: true }, walk: { fps: 10, loop: true }, attack: { fps: 8, loop: false }, skill: { fps: 8, loop: false } },
  };
}
