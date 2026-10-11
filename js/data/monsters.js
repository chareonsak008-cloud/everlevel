// ข้อมูลมอนสเตอร์ (ออกแบบใหม่ทั้งหมด)
// atk = [ต่ำสุด, สูงสุด] | hit/flee = ความแม่น/หลบ (%) | speed = พิกเซลต่อวินาที
// attackDelay = วินาทีต่อการโจมตี 1 ครั้ง | respawn = [ต่ำสุด, สูงสุด] วินาที
// baseExp / jobExp = EXP ที่ผู้เล่นได้เมื่อกำจัด
// drops = [ไอเทม, โอกาสดรอป 0..1] สุ่มแยกกันทีละชิ้น
import { ENDGAME_MONSTERS } from './endgameMonsters.js';
import { BASE_ITEMS } from './items.js';
export const MONSTERS = {
  ...ENDGAME_MONSTERS,
  bloblet: {
    name: 'บล็อบเล็ต', level: 1, hp: 32, baseExp: 8, jobExp: 6, atk: [4, 6], def: 0, mdef: 0, hit: 76, flee: 3, crit: 0,
    speed: 32, attackDelay: 1.6, attackRange: 22, aggressive: false, respawn: [6, 9],
    model: 'bloblet', color: '#6fd8c8', height: 0.75,
    drops: [['jelly_drop', 0.7], ['herb', 0.22], ['red_potion', 0.08], ['bandana', 0.025], ['sandals', 0.02], ['jelly_ring', 0.008], ['refine_a', 0.004]],
  },
  capling: {
    name: 'แคปปลิง', level: 3, hp: 50, baseExp: 19, jobExp: 14, atk: [6, 9], def: 1, mdef: 2, hit: 82, flee: 4, crit: 0,
    speed: 36, attackDelay: 1.5, attackRange: 22, aggressive: false, respawn: [8, 12],
    model: 'capling', color: '#4a8fd8', height: 0.95,
    drops: [['cap_spore', 0.65], ['glowcap', 0.25], ['red_potion', 0.1], ['blue_potion', 0.04], ['flower_pin', 0.025], ['wooden_shield', 0.02], ['leather_vest', 0.012], ['cutter', 0.01], ['refine_a', 0.008]],
  },
  stinglet: {
    name: 'สติงเล็ต', level: 6, hp: 80, baseExp: 52, jobExp: 37, atk: [9, 12], def: 3, mdef: 2, hit: 90, flee: 12, crit: 0.03,
    speed: 56, attackDelay: 1.3, attackRange: 24, aggressive: true, aggroRange: 72, respawn: [10, 15],
    model: 'stinglet', color: '#f2b632', height: 1.35,
    drops: [['stinger', 0.6], ['honey', 0.22], ['orange_potion', 0.05], ['cutter', 0.03], ['traveler_cape', 0.02], ['iron_blade', 0.006], ['bee_brooch', 0.008], ['clover_charm', 0.004], ['refine_w', 0.012]],
  },

  /* ---------- Whisperwood Forest (v0.7) ---------- */
  thornback: {
    name: 'ธอร์นแบ็ก', level: 9, hp: 150, baseExp: 88, jobExp: 63, atk: [14, 18], def: 6, mdef: 2, hit: 92, flee: 9, crit: 0,
    speed: 30, attackDelay: 1.5, attackRange: 22, aggressive: false, respawn: [8, 12],
    model: 'thornback', color: '#7a6a3a', height: 0.8,
    drops: [['thorn_quill', 0.6], ['herb', 0.3], ['red_potion', 0.12], ['thorn_guard', 0.015], ['bark_mail', 0.008], ['refine_a', 0.03]],
  },
  wisp: {
    name: 'วิสป์', level: 12, hp: 141, baseExp: 135, jobExp: 97, atk: [34, 43], def: 2, mdef: 18, hit: 102, flee: 27, crit: 0.02,
    speed: 48, attackDelay: 1.4, attackRange: 24, aggressive: true, aggroRange: 80, respawn: [10, 14],
    model: 'wisp', color: '#8affc8', height: 1.3,
    drops: [['wisp_dust', 0.55], ['glowcap', 0.3], ['blue_potion', 0.06], ['wisp_lantern', 0.01], ['refine_w', 0.02], ['refine_a', 0.02]],
  },
  barkwolf: {
    name: 'บาร์กวูล์ฟ', level: 15, hp: 258, baseExp: 200, jobExp: 144, atk: [53, 67], def: 8, mdef: 4, hit: 105, flee: 21, crit: 0.05,
    speed: 66, attackDelay: 1.1, attackRange: 24, aggressive: true, aggroRange: 96, respawn: [12, 18],
    model: 'barkwolf', color: '#6e4e2e', height: 1.0,
    drops: [['wolf_fang', 0.55], ['red_potion', 0.15], ['orange_potion', 0.08], ['fang_dagger', 0.01], ['bark_mail', 0.012], ['refine_w', 0.03]],
  },
  // MVP: บอสใจกลางป่า — โจมตีพิเศษ (ทุบพื้น / รากหนาม) และเรียกวิสป์มาช่วย
  gnarlroot: {
    name: 'กนาร์ลรูท ต้นไม้เฒ่า', level: 20, hp: 7550, baseExp: 10900, jobExp: 7830, atk: [85, 109], def: 12, mdef: 14, hit: 114, flee: 17, crit: 0.05,
    speed: 30, attackDelay: 1.9, attackRange: 34, aggressive: true, aggroRange: 110, respawn: [240, 360],
    model: 'gnarlroot', color: '#5e4a30', height: 3.2, radius: 1.15, leash: 22, mvp: true,
    boss: {
      slam: { cd: [7, 10], radius: 3, windup: 1.3, mult: 1.5, knock: 2 },
      roots: { cd: [9, 13], radius: 1.6, windup: 1.1, mult: 1.2, secs: 1.8 },
      summon: { at: [0.7, 0.4], mob: 'wisp', count: 3 },
      enrage: 0.25,
    },
    drops: [['ancient_bark', 0.9], ['orange_potion', 0.6], ['blue_potion', 0.3], ['gnarl_crown', 0.06], ['heartwood_staff', 0.04], ['sylvan_bow', 0.04], ['rootcleaver', 0.04], ['refine_w', 0.6], ['refine_a', 0.6], ['refine_guard', 0.05]],
    // รางวัล MVP เข้ากระเป๋าโดยตรง (เลือกตามอาชีพของผู้ปราบ)
    mvpReward: { novice: 'gnarl_crown', swordsman: 'rootcleaver', mage: 'heartwood_staff', archer: 'sylvan_bow', acolyte: 'gnarl_crown' },
  },

  /* ---------- Frostveil Peaks (v0.11 · ปรับสมดุล v0.16) Lv.20–45 ---------- */
  frostfox: {
    name: 'ฟรอสต์ฟ็อกซ์', level: 20, hp: 326, baseExp: 272, jobExp: 196, atk: [53, 68], def: 6, mdef: 7, hit: 108, flee: 32, crit: 0.04,
    speed: 62, attackDelay: 1.2, attackRange: 24, aggressive: false, respawn: [10, 14],
    model: 'frostfox', color: '#e2eefa', height: 0.9,
    drops: [['frost_fur', 0.6], ['white_potion', 0.05], ['orange_potion', 0.12], ['frost_boots', 0.008], ['frost_dagger', 0.005], ['refine_a', 0.03]],
  },
  frostbat: {
    name: 'ฟรอสต์แบท', level: 25, hp: 339, baseExp: 424, jobExp: 305, atk: [67, 86], def: 5, mdef: 14, hit: 116, flee: 48, crit: 0.03,
    speed: 70, attackDelay: 1.15, attackRange: 26, aggressive: true, aggroRange: 90, respawn: [10, 14],
    model: 'frostbat', color: '#8ac8f0', height: 1.4,
    drops: [['bat_wing', 0.55], ['blue_potion', 0.08], ['white_potion', 0.05], ['glacier_bow', 0.006], ['refine_w', 0.03]],
  },
  yeti: {
    name: 'เยติ', level: 31, hp: 1140, baseExp: 622, jobExp: 448, atk: [89, 113], def: 20, mdef: 8, hit: 121, flee: 27, crit: 0.03,
    speed: 46, attackDelay: 1.5, attackRange: 30, aggressive: false, respawn: [12, 18],
    model: 'yeti', color: '#e8eef8', height: 1.9, radius: 0.75,
    drops: [['yeti_fur', 0.55], ['white_potion', 0.1], ['yeti_coat', 0.008], ['frost_mace', 0.006], ['refine_a', 0.04]],
  },
  icegolem: {
    name: 'ไอซ์โกเลม', level: 37, hp: 1370, baseExp: 859, jobExp: 619, atk: [115, 146], def: 30, mdef: 31, hit: 126, flee: 28, crit: 0.02,
    speed: 38, attackDelay: 1.7, attackRange: 32, aggressive: true, aggroRange: 80, respawn: [14, 20],
    model: 'icegolem', color: '#9ad8f0', height: 2.1, radius: 0.85,
    drops: [['ice_core', 0.45], ['white_potion', 0.12], ['mana_potion', 0.04], ['frost_saber', 0.006], ['icicle_staff', 0.006], ['refine_w', 0.05], ['refine_a', 0.05]],
  },
  // MVP: ราชินีหิมะ — ทุบพื้นเป็นวงน้ำแข็ง (Frost Nova) / หนามน้ำแข็งถล่ม (แช่แข็ง) / เรียกฟรอสต์แบท
  glacia: {
    name: 'กลาเซีย ราชินีหิมะ', level: 45, hp: 29800, baseExp: 68500, jobExp: 49300, atk: [186, 235], def: 34, mdef: 40, hit: 146, flee: 43, crit: 0.05,
    speed: 40, attackDelay: 1.7, attackRange: 40, aggressive: true, aggroRange: 120, respawn: [300, 420],
    model: 'glacia', color: '#7cc6f0', height: 3.8, radius: 1.5, leash: 22, mvp: true,
    boss: {
      slam: { cd: [7, 10], radius: 3.6, windup: 1.4, mult: 1.6, knock: 2, color: '#6ad8ff', fx: 'ice' },
      roots: { cd: [8, 12], radius: 2.0, windup: 1.2, mult: 1.3, secs: 1.6, color: '#9ae8ff', fx: 'icefall', effect: 'freeze' },
      summon: { at: [0.7, 0.4], mob: 'frostbat', count: 3 },
      enrage: 0.25,
    },
    drops: [['glacia_scale', 0.9], ['white_potion', 0.8], ['mana_potion', 0.4], ['glacia_crown', 0.08], ['glacia_mantle', 0.08], ['frost_saber', 0.15], ['icicle_staff', 0.15], ['glacier_bow', 0.15], ['frost_mace', 0.15], ['refine_w', 0.8], ['refine_a', 0.8], ['refine_guard', 0.12]],
    mvpReward: { novice: 'glacia_mantle', swordsman: 'frost_saber', mage: 'glacia_crown', archer: 'glacier_bow', acolyte: 'glacia_crown' },
  },

  /* ---------- Ember Caldera (v0.11) Lv.50–95 ---------- */
  magmaslime: {
    name: 'แมกม่าสไลม์', level: 42, hp: 1230, baseExp: 876, jobExp: 631, atk: [111, 141], def: 24, mdef: 23, hit: 132, flee: 39, crit: 0.02,
    speed: 34, attackDelay: 1.6, attackRange: 24, aggressive: false, respawn: [10, 14],
    model: 'magmaslime', color: '#ff6a1a', height: 0.95,
    drops: [['magma_gel', 0.6], ['white_potion', 0.15], ['cinder_dagger', 0.004], ['refine_a', 0.05]],
  },
  emberimp: {
    name: 'เอมเบอร์อิมป์', level: 50, hp: 1020, baseExp: 1210, jobExp: 874, atk: [140, 178], def: 17, mdef: 46, hit: 147, flee: 74, crit: 0.05,
    speed: 76, attackDelay: 1.1, attackRange: 26, aggressive: true, aggroRange: 96, respawn: [10, 15],
    model: 'emberimp', color: '#e8402a', height: 1.4,
    drops: [['imp_horn', 0.55], ['mana_potion', 0.08], ['white_potion', 0.12], ['inferno_staff', 0.004], ['ember_cloak', 0.005], ['refine_w', 0.05]],
  },
  salamander: {
    name: 'ซาลาแมนเดอร์', level: 58, hp: 2060, baseExp: 1610, jobExp: 1160, atk: [172, 218], def: 38, mdef: 26, hit: 150, flee: 60, crit: 0.04,
    speed: 58, attackDelay: 1.3, attackRange: 28, aggressive: true, aggroRange: 90, respawn: [12, 18],
    model: 'salamander', color: '#ff8a2a', height: 0.95, radius: 0.8,
    drops: [['salamander_scale', 0.5], ['royal_jelly', 0.04], ['white_potion', 0.15], ['ember_shield', 0.005], ['phoenix_bow', 0.004], ['flame_blade', 0.004], ['refine_w', 0.06], ['refine_a', 0.06]],
  },
  obsidiangolem: {
    name: 'ออบซิเดียนโกเลม', level: 66, hp: 3490, baseExp: 2250, jobExp: 1620, atk: [226, 288], def: 66, mdef: 48, hit: 158, flee: 53, crit: 0.03,
    speed: 36, attackDelay: 1.8, attackRange: 34, aggressive: true, aggroRange: 80, respawn: [14, 20],
    model: 'obsidiangolem', color: '#2e2436', height: 2.3, radius: 0.95,
    drops: [['obsidian_shard', 0.45], ['royal_jelly', 0.06], ['mana_potion', 0.08], ['obsidian_plate', 0.005], ['magma_hammer', 0.005], ['refine_w', 0.08], ['refine_a', 0.08], ['refine_guard', 0.004]],
  },
  // MVP: มังกรเพลิง — กระทืบพื้นลาวา / อุกกาบาตเพลิงตกใส่ (ไหม้) / เรียกเอมเบอร์อิมป์
  ignarok: {
    name: 'อิกนารอก มังกรเพลิง', level: 80, hp: 101900, baseExp: 342400, jobExp: 246600, atk: [430, 547], def: 74, mdef: 72, hit: 187, flee: 75, crit: 0.06,
    speed: 48, attackDelay: 1.6, attackRange: 44, aggressive: true, aggroRange: 130, respawn: [420, 600],
    model: 'ignarok', color: '#c83a1a', height: 4.2, radius: 1.8, leash: 24, mvp: true,
    boss: {
      slam: { cd: [6, 9], radius: 3.8, windup: 1.3, mult: 1.7, knock: 2.4, color: '#ff6a1a', fx: 'fire' },
      roots: { cd: [7, 10], radius: 2.3, windup: 1.2, mult: 1.4, secs: 3, color: '#ffb02a', fx: 'meteor', effect: 'burn' },
      summon: { at: [0.75, 0.5, 0.25], mob: 'emberimp', count: 4 },
      enrage: 0.3,
    },
    drops: [['dragon_flame', 0.9], ['royal_jelly', 0.9], ['mana_potion', 0.6], ['dragon_heart', 0.05], ['flame_blade', 0.15], ['inferno_staff', 0.15], ['phoenix_bow', 0.15], ['magma_hammer', 0.15], ['obsidian_plate', 0.12], ['refine_w', 1], ['refine_a', 1], ['refine_guard', 0.3]],
    mvpReward: { novice: 'cinder_dagger', swordsman: 'flame_blade', mage: 'inferno_staff', archer: 'phoenix_bow', acolyte: 'magma_hammer' },
  },
};

// World variants reuse boss models with larger HP; never appear in normal map spawns.
for (const [id, base, name, hp] of [['world_aurex','aurex','ออเร็กซ์ จอมทัพโลก',600000],['world_nocthar','nocthar','น็อคธาร์ ราชันคราสโลก',1000000]]) {
 MONSTERS[id] = {...MONSTERS[base], name, hp, worldBoss:true, drops:[], baseExp:0, jobExp:0, boss:{...MONSTERS[base].boss, summon:null}};
}

// Legacy weapon drops ×2.5, capped at 40%; only table probabilities change.
for (const [id, m] of Object.entries(MONSTERS)) {
  if (ENDGAME_MONSTERS[id]) continue;
  m.drops = m.drops.map(([item, p]) => [item, BASE_ITEMS[item]?.slot === 'weapon' ? Math.min(.4, p * 2.5) : p]);
}
// Starter white weapons are now obtainable from normal beginner mobs.
MONSTERS.bloblet.drops.push(['knife', .08], ['oak_staff', .04]);
MONSTERS.capling.drops.push(['hunter_bow', .06], ['chapel_mace', .05]);
