// ไอเทมใช้งาน (v0.13 preview) — ใบวาร์ป · ใบคูณ EXP/ดรอป · ยาบัฟ · ฟื้นฟู/ป้องกัน · ระบบ · เรียกมอน/สุ่ม
// โครงสร้างเหมือน ITEMS ใน data/items.js (type: 'usable') + ข้อมูลเพิ่มสำหรับระบบใหม่
//   icon  = [ชนิดภาพใน render/UtilityIcons.js, สี, ตัวเลือก]
//   use   = สิ่งที่เกิดเมื่อกดใช้ (ระบบเกมจะอ่าน) · dur = ระยะเวลา (วินาที) · cd = คูลดาวน์ (วินาที)
//   group = บัฟกลุ่มเดียวกันใช้ซ้อนไม่ได้ (ตัวแรงกว่าแทนที่ · ตัวเดิมต่อเวลา)
//   price = ราคาของ (ขายคืนร้านได้ครึ่งราคา) · shop = ร้านที่ขาย (ไม่มี = ไม่ขายในร้าน หาได้จากดรอป/เควสต์เท่านั้น)
//   from  = แหล่งที่ได้ [ชนิด, รายละเอียด] ชนิด: shop / drop / mvp / quest

export const USE_CATS = {
  travel: { name: 'เดินทาง', en: 'Travel', color: '#6ad8ff' },
  boost: { name: 'ใบคูณ EXP / ดรอป', en: 'Boosters', color: '#ffb020' },
  buff: { name: 'ยาบัฟสถานะ', en: 'Buffs', color: '#ff6a7a' },
  recover: { name: 'ฟื้นฟู / ป้องกัน', en: 'Recovery', color: '#7dffb0' },
  system: { name: 'ระบบ / อำนวยความสะดวก', en: 'Utility', color: '#c8a0ff' },
  special: { name: 'เรียกมอน / สุ่ม', en: 'Special', color: '#ff8a5a' },
  pet: { name: 'สัตว์เลี้ยง', en: 'Pets', color: '#ffb8e8' },
};

// สีระดับ (ตรงกับ RARITY ใน data/items.js + legend สำหรับของหายากมาก)
export const USE_RARITY = {
  common: { name: 'ธรรมดา', color: '#f2ece0' },
  uncommon: { name: 'ดี', color: '#8fe08a' },
  rare: { name: 'หายาก', color: '#7fc4ff' },
  epic: { name: 'ล้ำค่า', color: '#d49bff' },
  legend: { name: 'ตำนาน', color: '#ffb347' },
};

const MIN = 60;

export const CONSUMABLES = {
  /* ================= เดินทาง ================= */
  warp_leaf: {
    name: 'ใบวาร์ปสุ่ม', en: 'Wander Leaf', cat: 'travel', rarity: 'common', icon: ['warpleaf', '#6ad8ff'],
    effect: 'วาร์ปไปจุดสุ่มในแผนที่เดิมทันที', use: { warp: 'random' }, cd: 1, price: 60, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 60 z'], ['drop', 'มอนสเตอร์ทุกตัว 2%']],
    desc: 'ใบไม้จากต้นไม้ที่ลมพัดไปทั่วทุกทิศ บีบแล้วจะถูกพัดไปที่ไหนสักแห่ง ใช้หนีหรือหามอนใหม่',
  },
  return_scroll: {
    name: 'ใบกลับเมือง', en: 'Homeward Scroll', cat: 'travel', rarity: 'common', icon: ['scroll', '#e8384f', 'home'],
    effect: 'วาร์ปกลับลานน้ำพุ Asteria Town', use: { warp: 'town' }, cast: 1.5, price: 300, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 300 z'], ['drop', 'มอนสเตอร์ทุกตัว 0.5%']],
    desc: 'ม้วนคาถาประทับตราเมือง อ่านจบเมื่อไหร่ก็ได้กลับบ้าน (ร่าย 1.5 วินาที โดนตีจะหยุดร่าย)',
  },
  waypoint_scroll: {
    name: 'ใบวาร์ปเลือกแผนที่', en: 'Waypoint Scroll', cat: 'travel', rarity: 'uncommon', icon: ['scroll', '#3a8ef0', 'map'],
    effect: 'เลือกวาร์ปไปแผนที่ใดก็ได้ที่เคยไปมาแล้ว', use: { warp: 'choose' }, cast: 1.5, price: 1500, shop: ['frost', 'ember'],
    from: [['shop', 'ร้านเสบียงของเฮลก้า / โรซ่า · 1,500 z'], ['quest', 'รางวัลเควสต์เนื้อเรื่อง']],
    desc: 'แผนที่วิเศษที่จำทุกที่ที่เจ้าของเคยเหยียบ แตะจุดไหนก็ไปที่นั่น',
  },
  friend_scroll: {
    name: 'ใบตามหาเพื่อน', en: 'Kindred Scroll', cat: 'travel', rarity: 'uncommon', icon: ['scroll', '#ff6a9a', 'friend'],
    effect: 'เลือกผู้เล่นที่ออนไลน์อยู่ แล้ววาร์ปไปแผนที่เดียวกับเขา (ถ้าเห็นตัวกันจะไปโผล่ข้าง ๆ)', use: { warp: 'friend' }, cast: 2, price: 2000, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 2,000 z']],
    desc: 'เขียนชื่อเพื่อนลงไป ม้วนจะพาไปหาเขาถึงที่ เล่นด้วยกันง่ายขึ้นมาก',
  },

  /* ================= ใบคูณ ================= */
  exp_15: {
    name: 'ใบคูณ EXP ×1.5', en: 'EXP Scroll ×1.5', cat: 'boost', rarity: 'uncommon', icon: ['booster', '#ffb020', 'EXP|×1.5'],
    effect: 'EXP จากมอนสเตอร์ ×1.5', use: { buff: { exp: 1.5 } }, group: 'exp', dur: 30 * MIN, price: 2000,
    from: [['quest', 'รางวัลเควสต์รายวัน'], ['drop', 'มอนสเตอร์ Lv.10 ขึ้นไป 0.1%'], ['mvp', 'MVP 30%']],
    desc: 'ใบประกาศเกียรติคุณจากสมาคมนักผจญภัย ใครถือไว้จะเรียนรู้จากการต่อสู้ได้เร็วขึ้น',
  },
  exp_2: {
    name: 'ใบคูณ EXP ×2', en: 'EXP Scroll ×2', cat: 'boost', rarity: 'rare', icon: ['booster', '#ff8a1a', 'EXP|×2'],
    effect: 'EXP จากมอนสเตอร์ ×2', use: { buff: { exp: 2 } }, group: 'exp', dur: 30 * MIN, price: 6000,
    from: [['quest', 'รางวัลเควสต์เนื้อเรื่องบางเควสต์'], ['drop', 'มอนสเตอร์ Lv.30 ขึ้นไป 0.03%'], ['mvp', 'MVP 15%']],
    desc: 'ใบคูณที่นักผจญภัยทุกคนอยากได้ เก็บไว้เปิดตอนจะฟาร์มยาว ๆ',
  },
  exp_3: {
    name: 'ใบคูณ EXP ×3', en: 'EXP Scroll ×3', cat: 'boost', rarity: 'legend', icon: ['booster', '#ff4a6a', 'EXP|×3'],
    effect: 'EXP จากมอนสเตอร์ ×3', use: { buff: { exp: 3 } }, group: 'exp', dur: 15 * MIN, price: 30000,
    from: [['mvp', 'MVP 2%'], ['quest', 'รางวัลกิจกรรมพิเศษ']],
    desc: 'ม้วนทองคำหายากมาก แสงของมันทำให้มอนสเตอร์ทุกตัวเหมือนครูฝึกชั้นยอด',
  },
  job_2: {
    name: 'ใบคูณ Job EXP ×2', en: 'Job Scroll ×2', cat: 'boost', rarity: 'rare', icon: ['booster', '#3ab8e8', 'JOB|×2'],
    effect: 'Job EXP ×2 (เลเวลอาชีพขึ้นไว ได้แต้มสกิลไว)', use: { buff: { jexp: 2 } }, group: 'jexp', dur: 30 * MIN, price: 5000,
    from: [['quest', 'รางวัลเควสต์รายวัน'], ['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.03%'], ['mvp', 'MVP 10%']],
    desc: 'ใบรับรองจากกิลด์อาชีพ ช่วยให้ฝึกวิชาเฉพาะทางได้เร็วเป็นสองเท่า',
  },
  drop_15: {
    name: 'ใบคูณดรอป ×1.5', en: 'Drop Scroll ×1.5', cat: 'boost', rarity: 'uncommon', icon: ['booster', '#4fb84a', 'DROP|×1.5'],
    effect: 'โอกาสดรอปไอเทม ×1.5 (ไม่รวมการ์ดและ MVP)', use: { buff: { drop: 1.5 } }, group: 'drop', dur: 30 * MIN, price: 3000,
    from: [['quest', 'รางวัลเควสต์รายวัน'], ['drop', 'มอนสเตอร์ Lv.10 ขึ้นไป 0.08%'], ['mvp', 'MVP 20%']],
    desc: 'ใบโชคดีของพ่อค้า มอนสเตอร์ที่ล้มจะทิ้งของไว้มากกว่าปกติ',
  },
  drop_2: {
    name: 'ใบคูณดรอป ×2', en: 'Drop Scroll ×2', cat: 'boost', rarity: 'rare', icon: ['booster', '#2a9a5a', 'DROP|×2'],
    effect: 'โอกาสดรอปไอเทม ×2 (ไม่รวมการ์ดและ MVP)', use: { buff: { drop: 2 } }, group: 'drop', dur: 30 * MIN, price: 8000,
    from: [['drop', 'มอนสเตอร์ Lv.40 ขึ้นไป 0.02%'], ['mvp', 'MVP 10%']],
    desc: 'เปิดคู่กับใบคูณ EXP ได้ ฟาร์มทีเดียวได้ทั้งเลเวลทั้งของ',
  },
  card_clover: {
    name: 'ใบโคลเวอร์การ์ด', en: 'Card Clover', cat: 'boost', rarity: 'epic', icon: ['cardclover', '#ffd36b'],
    effect: 'โอกาสดรอปการ์ดมอนสเตอร์ ×2', use: { buff: { card: 2 } }, group: 'card', dur: 15 * MIN, price: 20000,
    from: [['mvp', 'MVP 5%'], ['quest', 'เควสต์เสริม "การ์ดใบแรก" (ครั้งแรก)']],
    desc: 'โคลเวอร์สี่แฉกสีทองที่งอกบนการ์ดเก่า นักสะสมการ์ดยอมแลกด้วยทุกอย่าง',
  },

  /* ================= ยาบัฟ ================= */
  power_elixir: {
    name: 'ยาพลังยักษ์', en: 'Giant Tonic', cat: 'buff', rarity: 'uncommon', icon: ['flask_round', '#e8384f', 'sword'],
    effect: 'ATK +15%', use: { buff: { atkPct: 15 } }, group: 'atk', dur: 10 * MIN, price: 800, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 800 z'], ['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.3%']],
    desc: 'ดื่มแล้วแขนร้อนผ่าว ฟันทีเดียวรู้สึกได้ว่าแรงขึ้น',
  },
  iron_elixir: {
    name: 'ยาผิวเหล็ก', en: 'Ironskin Tonic', cat: 'buff', rarity: 'uncommon', icon: ['flask_square', '#7a9ad8', 'shield'],
    effect: 'DEF +20% · MDEF +10%', use: { buff: { defPct: 20, mdefPct: 10 } }, group: 'def', dur: 10 * MIN, price: 800, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 800 z'], ['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.3%']],
    desc: 'ผงแร่บดผสมน้ำพุร้อน ผิวจะแข็งขึ้นชั่วคราว เหมาะกับการตีบอส',
  },
  swift_potion: {
    name: 'ยาเร่งฝีเท้า', en: 'Swiftstep Potion', cat: 'buff', rarity: 'common', icon: ['flask_tall', '#4fd88a', 'wing'],
    effect: 'ความเร็วเดิน +25%', use: { buff: { speedPct: 25 } }, group: 'speed', dur: 5 * MIN, price: 400, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 400 z'], ['drop', 'มอนสเตอร์ทุกตัว 0.4%']],
    desc: 'ขวดเรียวยาวกลิ่นมิ้นต์ ดื่มแล้วเท้าเบาเหมือนมีปีก',
  },
  haste_potion: {
    name: 'ยาเร่งโจมตี', en: 'Haste Draught', cat: 'buff', rarity: 'uncommon', icon: ['flask_bulb', '#ff9a3a', 'clock'],
    effect: 'ความเร็วโจมตี +15%', use: { buff: { aspdPct: 15 } }, group: 'aspd', dur: 10 * MIN, price: 1000, shop: 'frost',
    from: [['shop', 'ร้านเสบียงของเฮลก้า · 1,000 z'], ['drop', 'มอนสเตอร์ Lv.30 ขึ้นไป 0.2%']],
    desc: 'ยาที่ทำให้เวลารอบตัวเหมือนช้าลงนิดหนึ่ง ทุกการโจมตีจึงต่อเนื่องขึ้น',
  },
  hawk_eye: {
    name: 'ยาตาเหยี่ยว', en: 'Hawkeye Drops', cat: 'buff', rarity: 'uncommon', icon: ['flask_tall', '#a86aff', 'eye'],
    effect: 'HIT +15 · คริติคอล +5%', use: { buff: { hit: 15, crit: 0.05 } }, group: 'hit', dur: 10 * MIN, price: 900, shop: 'frost',
    from: [['shop', 'ร้านเสบียงของเฮลก้า · 900 z'], ['drop', 'มอนสเตอร์ Lv.30 ขึ้นไป 0.2%']],
    desc: 'หยอดตาแล้วมองเห็นจุดอ่อนของศัตรูชัดเจน นักธนูชอบมาก',
  },
  sage_tea: {
    name: 'ชาปราชญ์', en: "Sage's Tea", cat: 'buff', rarity: 'uncommon', icon: ['teacup', '#7ac86a'],
    effect: 'MATK +15% · ฟื้น SP เร็วขึ้น 50%', use: { buff: { matkPct: 15, spRegenPct: 50 } }, group: 'matk', dur: 10 * MIN, price: 900, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 900 z'], ['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.2%']],
    desc: 'ชาเขียวสูตรลับของสมาคมนักเวทย์ สมองปลอดโปร่ง ร่ายเวทย์ได้ไม่หยุด',
  },
  festival_cake: {
    name: 'เค้กเทศกาล', en: 'Festival Cake', cat: 'buff', rarity: 'rare', icon: ['cake', '#ff8ab0'],
    effect: 'สถานะทุกตัว +3 (STR AGI VIT INT DEX LUK)', use: { buff: { str: 3, agi: 3, vit: 3, int: 3, dex: 3, luk: 3 } }, group: 'food', dur: 30 * MIN, price: 3000,
    from: [['quest', 'รางวัลเควสต์รายวันระดับสูง'], ['mvp', 'MVP 15%']],
    desc: 'เค้กที่ร้านขนมในเมืองทำแค่ช่วงเทศกาล อร่อยจนพลังเพิ่มทุกด้าน',
  },

  /* ================= ฟื้นฟู / ป้องกัน ================= */
  phoenix_feather: {
    name: 'ขนนกคืนชีพ', en: 'Phoenix Plume', cat: 'recover', rarity: 'rare', icon: ['phoenix', '#ff6a3a'],
    effect: 'ใช้ตอนหมดสติ: ฟื้นตรงจุดเดิมพร้อม HP/SP 50% (ไม่ต้องกลับเมือง)', use: { revive: 0.5 }, cd: 60, price: 5000, shop: 'ember',
    from: [['shop', 'ร้านเสบียงของโรซ่า · 5,000 z'], ['drop', 'มอนสเตอร์ Lv.40 ขึ้นไป 0.2%']],
    desc: 'ขนที่ร่วงจากนกเพลิงอมตะ ยังอุ่นอยู่เสมอ กดใช้ได้แม้ตอนล้มลงไปแล้ว',
  },
  elixir: {
    name: 'น้ำทิพย์', en: 'Ambrosia', cat: 'recover', rarity: 'epic', icon: ['elixir', '#ff6ad0'],
    effect: 'ฟื้น HP และ SP เต็ม 100% ทันที', use: { heal: { hpPct: 100, spPct: 100 } }, cd: 30, price: 8000,
    from: [['mvp', 'MVP 25%'], ['quest', 'รางวัลเควสต์เนื้อเรื่อง']],
    desc: 'หยดน้ำจากน้ำพุบนสวรรค์ เก็บไว้ใช้ตอนตีบอสใกล้ตาย',
  },
  regen_candy: {
    name: 'ลูกอมฟื้นพลัง', en: 'Vigor Candy', cat: 'recover', rarity: 'common', icon: ['candy', '#ff6a9a'],
    effect: 'ฟื้น HP/SP ตามเวลาเร็วขึ้น 2 เท่า (แม้ตอนต่อสู้)', use: { buff: { regenPct: 100, spRegenPct: 100, combatRegen: 1 } }, group: 'regen', dur: 10 * MIN, price: 250, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 250 z'], ['drop', 'มอนสเตอร์ทุกตัว 0.5%']],
    desc: 'ลูกอมหวานซ่า อมไว้แล้วรู้สึกสดชื่นตลอด ลดการกดยาบ่อย ๆ',
  },
  frost_tonic: {
    name: 'ยาต้านหนาว', en: 'Frostward Tonic', cat: 'recover', rarity: 'uncommon', icon: ['flask_tall', '#6ab8ff', 'snow'],
    effect: 'ในแผนที่หิมะ: รับดาเมจจากมอนสเตอร์ลดลง 20%', use: { buff: { dmgCutSnow: 20 } }, group: 'biome', dur: 15 * MIN, price: 800, shop: 'frost',
    from: [['shop', 'ร้านเสบียงของเฮลก้า · 800 z']],
    desc: 'ยาสีฟ้าอุ่นท้อง ทำให้ทนลมหนาวบนยอดเขาได้นานขึ้น',
  },
  flame_tonic: {
    name: 'ยาต้านร้อน', en: 'Flameward Tonic', cat: 'recover', rarity: 'uncommon', icon: ['flask_tall', '#ff7a2a', 'flame'],
    effect: 'ในแผนที่ภูเขาไฟ: รับดาเมจจากมอนสเตอร์ลดลง 20%', use: { buff: { dmgCutLava: 20 } }, group: 'biome', dur: 15 * MIN, price: 800, shop: 'ember',
    from: [['shop', 'ร้านเสบียงของโรซ่า · 800 z']],
    desc: 'ยาสีส้มเย็นเฉียบ ผิวไม่ไหม้แม้อยู่ใกล้ลาวา',
  },

  /* ================= ระบบ / อำนวยความสะดวก ================= */
  bag_expand: {
    name: 'กระเป๋าขยาย', en: 'Satchel Upgrade', cat: 'system', rarity: 'rare', icon: ['backpack', '#b0703a'],
    effect: 'กระเป๋าตัวละครนี้ +10 ช่องถาวร (ใช้ได้ 4 ครั้ง: 60 → 100 ช่อง)', use: { bag: 10, max: 4 }, price: 10000, stack: 10,
    from: [['quest', 'รางวัลเควสต์เนื้อเรื่อง 4 เควสต์'], ['mvp', 'MVP 3%']],
    desc: 'กระเป๋าหนังใบใหม่ที่ช่างตัดเย็บในเมืองทำให้ ใส่ของได้มากขึ้นทันที',
  },
  storage_expand: {
    name: 'ใบขยายคลัง', en: 'Vault Deed', cat: 'system', rarity: 'rare', icon: ['chest', '#a8642e'],
    effect: 'คลังเก็บของของบัญชี +20 ช่องถาวร (ใช้ได้ 5 ครั้ง: 100 → 200 ช่อง)', use: { storage: 20, max: 5 }, price: 10000, stack: 10,
    from: [['quest', 'รางวัลเควสต์เนื้อเรื่องบทหิมะและบทภูเขาไฟ'], ['mvp', 'MVP 2%']],
    desc: 'สัญญาเช่าห้องเก็บของเพิ่ม ใช้ร่วมกันทุกตัวละครในบัญชี',
  },
  stat_reset: {
    name: 'ใบรีเซ็ตสถานะ', en: 'Rebirth of Stats', cat: 'system', rarity: 'epic', icon: ['scroll', '#ffb020', 'stat'],
    effect: 'คืนแต้มสถานะทั้งหมด ให้จัดสรรใหม่', use: { reset: 'stats' }, price: 20000, stack: 10,
    from: [['quest', 'ฟรี 1 ใบ เมื่อเปลี่ยนอาชีพครั้งแรก'], ['mvp', 'MVP 1%']],
    desc: 'ลงแต้มผิดไม่ต้องกลัว อ่านม้วนนี้แล้วร่างกายจะกลับไปเหมือนเริ่มต้นใหม่',
  },
  skill_reset: {
    name: 'ใบรีเซ็ตสกิล', en: 'Rebirth of Skills', cat: 'system', rarity: 'epic', icon: ['scroll', '#8a6aff', 'skill'],
    effect: 'คืนแต้มสกิลทั้งหมด ให้เลือกสกิลใหม่', use: { reset: 'skills' }, price: 20000, stack: 10,
    from: [['quest', 'ฟรี 1 ใบ เมื่อเปลี่ยนอาชีพครั้งแรก'], ['mvp', 'MVP 1%']],
    desc: 'ลืมท่าเก่าแล้วฝึกท่าใหม่ ลองสายสกิลอื่นได้โดยไม่ต้องสร้างตัวใหม่',
  },
  name_change: {
    name: 'ใบเปลี่ยนชื่อ', en: 'Name Quill', cat: 'system', rarity: 'rare', icon: ['scroll', '#4fb8a8', 'name'],
    effect: 'เปลี่ยนชื่อตัวละคร 1 ครั้ง (ชื่อต้องไม่ซ้ำกับใคร)', use: { rename: true }, price: 100000, shop: 'tools', stack: 10,
    from: [['shop', 'ร้านของใช้โทเบน · 100,000 z']],
    desc: 'ขนนกที่เขียนทะเบียนนักผจญภัยใหม่ได้ ชื่อเดิมจะว่างให้คนอื่นใช้ทันที',
  },
  megaphone: {
    name: 'โทรโข่งประกาศ', en: 'Herald Horn', cat: 'system', rarity: 'uncommon', icon: ['megaphone', '#e8384f'],
    effect: 'ส่งข้อความถึงผู้เล่นทุกคนที่ออนไลน์ทุกแผนที่ (สีทอง เด่นกว่าแชตปกติ)', use: { shout: 80 }, cd: 30, price: 5000, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 5,000 z']],
    desc: 'หาปาร์ตี้ ขายของ หรือประกาศว่าเพิ่งได้การ์ดหายาก ให้ทั้งเซิร์ฟเวอร์รู้',
  },
  pet_snack: {
    name: 'ขนมสัตว์เลี้ยง', en: 'Pet Biscuit', cat: 'pet', rarity: 'common', icon: ['petsnack', '#e8a85a'],
    effect: 'สัตว์เลี้ยงที่เรียกอยู่: รัศมีเก็บของ +2 ช่อง และวิ่งเร็วขึ้น 20%', use: { buff: { petRadius: 2, petSpeedPct: 20 } }, group: 'pet', dur: 30 * MIN, price: 150, shop: 'tools',
    from: [['shop', 'ร้านของใช้โทเบน · 150 z'], ['drop', 'มอนสเตอร์ทุกตัว 0.5%']],
    desc: 'บิสกิตรูปกระดูกกลิ่นนมเนย สัตว์เลี้ยงทุกตัวชอบ (ใช้คู่กับระบบสัตว์เลี้ยงช่วยเก็บของ)',
  },

  /* ================= เรียกมอน / สุ่ม ================= */
  dead_branch: {
    name: 'กิ่งไม้ลึกลับ', en: 'Eerie Branch', cat: 'special', rarity: 'uncommon', icon: ['branch', '#a86aff'],
    effect: 'เรียกมอนสเตอร์สุ่ม 1 ตัวของแผนที่นี้มาข้างตัว (ไม่ใช่ MVP · ใช้ในเมืองไม่ได้)', use: { summon: 'normal' }, cd: 3, price: 1000,
    from: [['drop', 'มอนสเตอร์ทุกตัว 0.5%'], ['quest', 'รางวัลเควสต์รายวัน']],
    desc: 'กิ่งไม้มีดวงตาเรืองแสงจ้องกลับมา หักแล้วจะมีอะไรบางอย่างโผล่ออกมา',
  },
  blood_branch: {
    name: 'กิ่งไม้โลหิต', en: 'Crimson Branch', cat: 'special', rarity: 'legend', icon: ['branch_blood', '#ff3a4a'],
    effect: 'เรียก MVP สุ่ม 1 ตัวมาที่นี่ (ใช้ในเมืองไม่ได้ · ทุกคนในแผนที่เห็น)', use: { summon: 'mvp' }, cd: 60, price: 50000,
    from: [['mvp', 'MVP 3%']],
    desc: 'กิ่งไม้สีเลือดที่หยดไม่หยุด ตำนานว่ามันเคยเป็นของบอสที่แข็งแกร่งที่สุด ชวนเพื่อนมาก่อนหัก!',
  },
  adventurer_box: {
    name: 'กล่องสุ่มนักผจญภัย', en: "Adventurer's Box", cat: 'special', rarity: 'uncommon', icon: ['luckybox', '#8a5ad8'],
    effect: 'สุ่มได้ไอเทมใช้งาน 1 ชิ้น (มีโอกาสได้ใบคูณ ×2 และขนนกคืนชีพ)', use: { box: 'adventurer' }, price: 1000,
    from: [['quest', 'รางวัลเควสต์รายวัน'], ['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.1%']],
    desc: 'กล่องปิดผนึกจากสมาคมนักผจญภัย เขย่าแล้วมีเสียงกรุ๊งกริ๊ง ข้างในคืออะไรกันนะ',
  },
};

// ไข่สัตว์เลี้ยง (โอกาสฟักแต่ละระดับอยู่ใน data/pets.js · PET_EGGS)
Object.assign(CONSUMABLES, {
  egg_spot: {
    name: 'ไข่ลายจุด', en: 'Speckled Egg', cat: 'pet', rarity: 'uncommon', icon: ['egg', '#f6ead0', '#8ac86a'],
    effect: 'ฟักได้สัตว์เลี้ยงช่วยเก็บของ 1 ตัว (ส่วนใหญ่ระดับธรรมดา–หายาก)', use: { hatch: 'egg_spot' }, price: 2000,
    from: [['drop', 'มอนสเตอร์ทุกตัว 0.3%'], ['mvp', 'MVP 10%'], ['quest', 'รางวัลเควสต์ "สปอร์ปริศนา"']],
    desc: 'ไข่อุ่น ๆ ลายจุดสีเขียว ได้ยินเสียงเคาะเบา ๆ จากข้างใน',
  },
  egg_moon: {
    name: 'ไข่เงินแสงจันทร์', en: 'Moonsilver Egg', cat: 'pet', rarity: 'rare', icon: ['egg', '#e6ecf8', '#7fa8ff'],
    effect: 'ฟักได้สัตว์เลี้ยง 1 ตัว (โอกาสได้ระดับหายาก–ตำนานสูงขึ้น)', use: { hatch: 'egg_moon' }, price: 12000,
    from: [['drop', 'มอนสเตอร์ Lv.20 ขึ้นไป 0.08%'], ['mvp', 'MVP 5%']],
    desc: 'เปลือกสีเงินที่เรืองแสงอ่อน ๆ ยามค่ำคืน',
  },
  egg_galaxy: {
    name: 'ไข่ทองดาราจักร', en: 'Galaxy Gold Egg', cat: 'pet', rarity: 'epic', icon: ['egg', '#ffd36b', '#7a4aff'],
    effect: 'ฟักได้สัตว์เลี้ยง 1 ตัว (ไม่มีระดับธรรมดา · มีโอกาส Mythical / Celestial)', use: { hatch: 'egg_galaxy' }, price: 60000,
    from: [['drop', 'มอนสเตอร์ Lv.45 ขึ้นไป 0.02%'], ['mvp', 'MVP 2%'], ['quest', 'รางวัลเควสต์ "มังกรเพลิงอิกนารอก"']],
    desc: 'ไข่ทองคำที่มีดวงดาวหมุนวนอยู่ข้างใน ตำนานว่าสัตว์ในตำนานฟักจากไข่แบบนี้',
  },
});

// โอกาสดรอปไอเทมใช้งานจากมอนสเตอร์ (รวมกับตารางดรอปเดิมของมอนแต่ละตัว) — mob = ข้อมูลใน data/monsters.js
export function consumableDrops(mob) {
  const lv = mob.level || 1;
  if (mob.mvp) {
    return [
      ['exp_15', 0.3], ['exp_2', 0.15], ['exp_3', 0.02], ['job_2', 0.1], ['drop_15', 0.2], ['drop_2', 0.1], ['card_clover', 0.05],
      ['festival_cake', 0.15], ['elixir', 0.25], ['bag_expand', 0.03], ['storage_expand', 0.02], ['stat_reset', 0.01], ['skill_reset', 0.01],
      ['blood_branch', 0.03], ['egg_spot', 0.1], ['egg_moon', 0.05], ['egg_galaxy', 0.02],
    ];
  }
  const out = [['warp_leaf', 0.02], ['return_scroll', 0.005], ['swift_potion', 0.004], ['regen_candy', 0.005], ['pet_snack', 0.005], ['dead_branch', 0.005], ['egg_spot', 0.003]];
  if (lv >= 10) out.push(['exp_15', 0.001], ['drop_15', 0.0008]);
  if (lv >= 20) out.push(['job_2', 0.0003], ['power_elixir', 0.003], ['iron_elixir', 0.003], ['sage_tea', 0.002], ['adventurer_box', 0.001], ['egg_moon', 0.0008]);
  if (lv >= 30) out.push(['exp_2', 0.0003], ['haste_potion', 0.002], ['hawk_eye', 0.002]);
  if (lv >= 40) out.push(['drop_2', 0.0002], ['phoenix_feather', 0.002]);
  if (lv >= 45) out.push(['egg_galaxy', 0.0002]);
  return out;
}

// ของรางวัลเควสต์เพิ่มเติม (v0.13) — ต่อท้ายรางวัลเดิมใน data/quests.js
export const QUEST_EXTRA_REWARDS = {
  m2_spores: [['egg_spot', 1]],
  m3_stingers: [['warp_leaf', 10], ['return_scroll', 3]],
  m5_whisperwood: [['bag_expand', 1], ['waypoint_scroll', 2]],
  m7_ancient_tree: [['exp_2', 1], ['bag_expand', 1], ['elixir', 1]],
  m9_frost_hunt: [['frost_tonic', 3], ['exp_15', 2]],
  m10_yeti_golem: [['storage_expand', 1]],
  m11_glacia: [['bag_expand', 1], ['elixir', 2]],
  m13_fire_trial: [['flame_tonic', 3], ['exp_2', 1]],
  m14_scales: [['storage_expand', 1]],
  m15_ignarok: [['bag_expand', 1], ['card_clover', 1], ['egg_galaxy', 1]],
  s2_first_card: [['card_clover', 1]],
  d_bloblet: [['warp_leaf', 3]],
  d_jelly: [['regen_candy', 2]],
  d_capling: [['exp_15', 1]],
  d_stinglet: [['adventurer_box', 1]],
  d_thornback: [['drop_15', 1]],
  d_wolf_fang: [['job_2', 1]],
  d_wisp_dust: [['dead_branch', 1], ['adventurer_box', 1]],
  d_frostfox: [['exp_15', 1], ['adventurer_box', 1]],
  d_yeti_fur: [['drop_15', 1], ['job_2', 1]],
  d_emberimp: [['exp_2', 1], ['festival_cake', 1]],
  d_obsidian: [['job_2', 1], ['festival_cake', 1], ['adventurer_box', 2]],
};

// ของในกล่องสุ่มนักผจญภัย (เปอร์เซ็นต์ รวม = 100)
export const ADVENTURER_BOX = [
  ['warp_leaf', 22], ['regen_candy', 16], ['swift_potion', 14], ['return_scroll', 12], ['pet_snack', 8],
  ['power_elixir', 6], ['iron_elixir', 6], ['exp_15', 6], ['drop_15', 5], ['exp_2', 2.5], ['phoenix_feather', 1.5], ['dead_branch', 1],
];

// กติกาบัฟ (ระบบเกมจะใช้ตามนี้)
export const BUFF_RULES = [
  'ใบคูณ EXP, Job, ดรอป และการ์ด เปิดพร้อมกันได้ทุกแบบ (ต่างกลุ่มกัน)',
  'กลุ่มเดียวกันซ้อนไม่ได้: ใช้ตัวเดิมซ้ำ = ต่อเวลา (สูงสุด 3 ชั่วโมง) · ใช้ตัวแรงกว่า = แทนที่ · ตัวที่อ่อนกว่าใช้ไม่ได้ระหว่างตัวแรงยังอยู่',
  'เวลาของใบคูณนับเฉพาะตอนออนไลน์ ออกเกมแล้วเวลาหยุด ไม่เสียเปล่า และไม่หายตอนหมดสติ',
  'ยาบัฟสถานะหายเมื่อหมดสติ · ยาต่างชนิดดื่มพร้อมกันได้',
  'ขนนกคืนชีพใช้ได้ตอนหมดสติ (มีเวลา 8 วินาทีให้กดก่อนกลับเมืองอัตโนมัติ)',
];

export const CONS_ORDER = Object.keys(CONSUMABLES);
export const fmtDur = (s) => (!s ? '—' : s >= 3600 ? `${s / 3600} ชั่วโมง` : s >= 60 ? `${Math.round(s / 60)} นาที` : `${s} วินาที`);
