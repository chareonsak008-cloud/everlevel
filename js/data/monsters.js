// ข้อมูลมอนสเตอร์ (ออกแบบใหม่ทั้งหมด)
// atk = [ต่ำสุด, สูงสุด] | hit/flee = ความแม่น/หลบ (%) | speed = พิกเซลต่อวินาที
// attackDelay = วินาทีต่อการโจมตี 1 ครั้ง | respawn = [ต่ำสุด, สูงสุด] วินาที
// baseExp / jobExp = EXP ที่ผู้เล่นได้เมื่อกำจัด
// drops = [ไอเทม, โอกาสดรอป 0..1] สุ่มแยกกันทีละชิ้น
export const MONSTERS = {
  bloblet: {
    name: 'บล็อบเล็ต', level: 1, hp: 30, baseExp: 8, jobExp: 5, atk: [3, 5], def: 0, mdef: 0, hit: 70, flee: 5, crit: 0,
    speed: 32, attackDelay: 1.6, attackRange: 22, aggressive: false, respawn: [6, 9],
    model: 'bloblet', color: '#6fd8c8', height: 0.75,
    drops: [['jelly_drop', 0.7], ['herb', 0.22], ['red_potion', 0.08], ['bandana', 0.025], ['sandals', 0.02], ['jelly_ring', 0.008], ['refine_a', 0.004]],
  },
  capling: {
    name: 'แคปปลิง', level: 3, hp: 60, baseExp: 20, jobExp: 12, atk: [5, 8], def: 2, mdef: 3, hit: 75, flee: 8, crit: 0,
    speed: 36, attackDelay: 1.5, attackRange: 22, aggressive: false, respawn: [8, 12],
    model: 'capling', color: '#4a8fd8', height: 0.95,
    drops: [['cap_spore', 0.65], ['glowcap', 0.25], ['red_potion', 0.1], ['blue_potion', 0.04], ['flower_pin', 0.025], ['wooden_shield', 0.02], ['leather_vest', 0.012], ['cutter', 0.01], ['refine_a', 0.008]],
  },
  stinglet: {
    name: 'สติงเล็ต', level: 5, hp: 85, baseExp: 42, jobExp: 26, atk: [6, 9], def: 3, mdef: 2, hit: 80, flee: 15, crit: 0.03,
    speed: 56, attackDelay: 1.3, attackRange: 24, aggressive: true, aggroRange: 72, respawn: [10, 15],
    model: 'stinglet', color: '#f2b632', height: 1.35,
    drops: [['stinger', 0.6], ['honey', 0.22], ['orange_potion', 0.05], ['cutter', 0.03], ['traveler_cape', 0.02], ['iron_blade', 0.006], ['bee_brooch', 0.008], ['clover_charm', 0.004], ['refine_w', 0.012]],
  },

  /* ---------- Whisperwood Forest (v0.7) ---------- */
  thornback: {
    name: 'ธอร์นแบ็ก', level: 8, hp: 190, baseExp: 85, jobExp: 60, atk: [11, 15], def: 7, mdef: 2, hit: 88, flee: 12, crit: 0,
    speed: 30, attackDelay: 1.5, attackRange: 22, aggressive: false, respawn: [8, 12],
    model: 'thornback', color: '#7a6a3a', height: 0.8,
    drops: [['thorn_quill', 0.6], ['herb', 0.3], ['red_potion', 0.12], ['thorn_guard', 0.015], ['bark_mail', 0.008], ['refine_a', 0.03]],
  },
  wisp: {
    name: 'วิสป์', level: 10, hp: 150, baseExp: 120, jobExp: 85, atk: [13, 18], def: 1, mdef: 18, hit: 95, flee: 32, crit: 0.02,
    speed: 48, attackDelay: 1.4, attackRange: 24, aggressive: true, aggroRange: 80, respawn: [10, 14],
    model: 'wisp', color: '#8affc8', height: 1.3,
    drops: [['wisp_dust', 0.55], ['glowcap', 0.3], ['blue_potion', 0.06], ['wisp_lantern', 0.01], ['refine_w', 0.02], ['refine_a', 0.02]],
  },
  barkwolf: {
    name: 'บาร์กวูล์ฟ', level: 12, hp: 300, baseExp: 190, jobExp: 130, atk: [17, 23], def: 9, mdef: 4, hit: 100, flee: 22, crit: 0.05,
    speed: 66, attackDelay: 1.1, attackRange: 24, aggressive: true, aggroRange: 96, respawn: [12, 18],
    model: 'barkwolf', color: '#6e4e2e', height: 1.0,
    drops: [['wolf_fang', 0.55], ['red_potion', 0.15], ['orange_potion', 0.08], ['fang_dagger', 0.01], ['bark_mail', 0.012], ['refine_w', 0.03]],
  },
  // MVP: บอสใจกลางป่า — โจมตีพิเศษ (ทุบพื้น / รากหนาม) และเรียกวิสป์มาช่วย
  gnarlroot: {
    name: 'กนาร์ลรูท ต้นไม้เฒ่า', level: 18, hp: 4200, baseExp: 2800, jobExp: 2000, atk: [34, 46], def: 16, mdef: 12, hit: 115, flee: 8, crit: 0.05,
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

  /* ---------- Frostveil Peaks (v0.11) Lv.20–48 ---------- */
  frostfox: {
    name: 'ฟรอสต์ฟ็อกซ์', level: 22, hp: 620, baseExp: 420, jobExp: 300, atk: [40, 52], def: 12, mdef: 6, hit: 120, flee: 40, crit: 0.04,
    speed: 62, attackDelay: 1.2, attackRange: 24, aggressive: false, respawn: [10, 14],
    model: 'frostfox', color: '#e2eefa', height: 0.9,
    drops: [['frost_fur', 0.6], ['white_potion', 0.05], ['orange_potion', 0.12], ['frost_boots', 0.008], ['frost_dagger', 0.005], ['refine_a', 0.03]],
  },
  frostbat: {
    name: 'ฟรอสต์แบท', level: 27, hp: 760, baseExp: 620, jobExp: 440, atk: [52, 66], def: 8, mdef: 14, hit: 135, flee: 62, crit: 0.03,
    speed: 70, attackDelay: 1.15, attackRange: 26, aggressive: true, aggroRange: 90, respawn: [10, 14],
    model: 'frostbat', color: '#8ac8f0', height: 1.4,
    drops: [['bat_wing', 0.55], ['blue_potion', 0.08], ['white_potion', 0.05], ['glacier_bow', 0.006], ['refine_w', 0.03]],
  },
  yeti: {
    name: 'เยติ', level: 34, hp: 1500, baseExp: 1150, jobExp: 820, atk: [74, 96], def: 20, mdef: 8, hit: 140, flee: 30, crit: 0.03,
    speed: 46, attackDelay: 1.5, attackRange: 30, aggressive: false, respawn: [12, 18],
    model: 'yeti', color: '#e8eef8', height: 1.9, radius: 0.75,
    drops: [['yeti_fur', 0.55], ['white_potion', 0.1], ['yeti_coat', 0.008], ['frost_mace', 0.006], ['refine_a', 0.04]],
  },
  icegolem: {
    name: 'ไอซ์โกเลม', level: 41, hp: 2300, baseExp: 1800, jobExp: 1300, atk: [96, 124], def: 32, mdef: 24, hit: 150, flee: 20, crit: 0.02,
    speed: 38, attackDelay: 1.7, attackRange: 32, aggressive: true, aggroRange: 80, respawn: [14, 20],
    model: 'icegolem', color: '#9ad8f0', height: 2.1, radius: 0.85,
    drops: [['ice_core', 0.45], ['white_potion', 0.12], ['mana_potion', 0.04], ['frost_saber', 0.006], ['icicle_staff', 0.006], ['refine_w', 0.05], ['refine_a', 0.05]],
  },
  // MVP: ราชินีหิมะ — ทุบพื้นเป็นวงน้ำแข็ง (Frost Nova) / หนามน้ำแข็งถล่ม (แช่แข็ง) / เรียกฟรอสต์แบท
  glacia: {
    name: 'กลาเซีย ราชินีหิมะ', level: 48, hp: 42000, baseExp: 36000, jobExp: 26000, atk: [170, 230], def: 40, mdef: 40, hit: 190, flee: 40, crit: 0.05,
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
    name: 'แมกม่าสไลม์', level: 50, hp: 2600, baseExp: 2600, jobExp: 1850, atk: [120, 155], def: 30, mdef: 20, hit: 165, flee: 40, crit: 0.02,
    speed: 34, attackDelay: 1.6, attackRange: 24, aggressive: false, respawn: [10, 14],
    model: 'magmaslime', color: '#ff6a1a', height: 0.95,
    drops: [['magma_gel', 0.6], ['white_potion', 0.15], ['cinder_dagger', 0.004], ['refine_a', 0.05]],
  },
  emberimp: {
    name: 'เอมเบอร์อิมป์', level: 58, hp: 3100, baseExp: 3400, jobExp: 2400, atk: [150, 190], def: 26, mdef: 40, hit: 185, flee: 80, crit: 0.05,
    speed: 76, attackDelay: 1.1, attackRange: 26, aggressive: true, aggroRange: 96, respawn: [10, 15],
    model: 'emberimp', color: '#e8402a', height: 1.4,
    drops: [['imp_horn', 0.55], ['mana_potion', 0.08], ['white_potion', 0.12], ['inferno_staff', 0.004], ['ember_cloak', 0.005], ['refine_w', 0.05]],
  },
  salamander: {
    name: 'ซาลาแมนเดอร์', level: 67, hp: 4600, baseExp: 4700, jobExp: 3400, atk: [190, 240], def: 40, mdef: 30, hit: 195, flee: 55, crit: 0.04,
    speed: 58, attackDelay: 1.3, attackRange: 28, aggressive: true, aggroRange: 90, respawn: [12, 18],
    model: 'salamander', color: '#ff8a2a', height: 0.95, radius: 0.8,
    drops: [['salamander_scale', 0.5], ['royal_jelly', 0.04], ['white_potion', 0.15], ['ember_shield', 0.005], ['phoenix_bow', 0.004], ['flame_blade', 0.004], ['refine_w', 0.06], ['refine_a', 0.06]],
  },
  obsidiangolem: {
    name: 'ออบซิเดียนโกเลม', level: 78, hp: 7200, baseExp: 7000, jobExp: 5000, atk: [250, 320], def: 60, mdef: 50, hit: 210, flee: 30, crit: 0.03,
    speed: 36, attackDelay: 1.8, attackRange: 34, aggressive: true, aggroRange: 80, respawn: [14, 20],
    model: 'obsidiangolem', color: '#2e2436', height: 2.3, radius: 0.95,
    drops: [['obsidian_shard', 0.45], ['royal_jelly', 0.06], ['mana_potion', 0.08], ['obsidian_plate', 0.005], ['magma_hammer', 0.005], ['refine_w', 0.08], ['refine_a', 0.08], ['refine_guard', 0.004]],
  },
  // MVP: มังกรเพลิง — กระทืบพื้นลาวา / อุกกาบาตเพลิงตกใส่ (ไหม้) / เรียกเอมเบอร์อิมป์
  ignarok: {
    name: 'อิกนารอก มังกรเพลิง', level: 95, hp: 260000, baseExp: 240000, jobExp: 170000, atk: [520, 680], def: 80, mdef: 70, hit: 260, flee: 60, crit: 0.06,
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
