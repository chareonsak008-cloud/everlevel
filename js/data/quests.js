// เควส (v0.10) — เนื้อเรื่องหลัก · เควสสอนระบบ · เควสรายวันจากกระดานเควส
// kind: main เนื้อเรื่อง | side เควสเสริม | daily รายวัน (ทำได้วันละครั้ง รีเซ็ตเที่ยงคืนตามเวลาเครื่อง)
// giver / turnIn = id ของ NPC · req = เควสที่ต้องส่งก่อน · minLevel = Base Lv. ขั้นต่ำ
// goals: kill {mob, n} · collect {item, n} (ส่งแล้วไอเทมหายไป) · visit {map} · job (เปลี่ยนเป็นอาชีพขั้นที่ 1)
//        refine {n} ตีบวกสำเร็จ · socket {n} ใส่การ์ด · level {n}
// give = ไอเทมที่ได้ทันทีตอนรับเควส · rewards = { exp: [base, job], zeny, items: [[id, จำนวน]] }

export const QUEST_KIND = {
  main: { name: 'เนื้อเรื่อง', color: '#ffd27a' },
  side: { name: 'เควสเสริม', color: '#9adcff' },
  daily: { name: 'รายวัน', color: '#9affb8' },
};

export const QUESTS = {
  /* ---------- เนื้อเรื่องบทที่ 1: นักผจญภัยแห่ง Asteria ---------- */
  m1_first_steps: {
    kind: 'main', name: 'ก้าวแรกของนักผจญภัย', giver: 'mira', turnIn: 'mira', minLevel: 1,
    intro: 'นักผจญภัยหน้าใหม่ใช่ไหม? ก่อนอื่นต้องพิสูจน์ฝีมือกันก่อน! ออกประตูตะวันออกไปยัง Beginner Field แล้วกำจัดบล็อบเล็ตให้ได้ 5 ตัว',
    wait: 'บล็อบเล็ตตัวสีฟ้าใส ๆ อยู่ฝั่งตะวันตกของทุ่ง มันจะไม่สู้ถ้าเราไม่ตีก่อนนะ',
    done: 'เยี่ยมมาก! เจ้ามีแววนะ นี่รางวัลสำหรับก้าวแรก ต่อไปไปหาลีน่าผู้พิทักษ์ทุ่ง ข้างกองไฟทางตะวันตกของ Beginner Field นางมีงานให้เจ้า',
    goals: [{ type: 'kill', mob: 'bloblet', n: 5 }],
    rewards: { exp: [120, 80], zeny: 300, items: [['red_potion', 5]] },
  },
  m2_spores: {
    kind: 'main', name: 'สปอร์ปริศนา', giver: 'lena', turnIn: 'lena', req: ['m1_first_steps'], minLevel: 2,
    intro: 'มีร่าส่งเจ้ามาสินะ แคปปลิงทางใต้ปล่อยสปอร์สีฟ้าออกมามากผิดปกติ ช่วยกำจัดพวกมัน 6 ตัว แล้วเก็บสปอร์มาให้ข้าตรวจสัก 4 ชิ้น',
    wait: 'แคปปลิงอยู่ทางแยกใต้ของทุ่ง สปอร์จะตกจากตัวมันเอง',
    done: 'สปอร์พวกนี้... มีพลังเวทย์ปนอยู่จริง ๆ ด้วย ขอบใจมาก! ช่วยข้าอีกเรื่องได้ไหม?',
    goals: [{ type: 'kill', mob: 'capling', n: 6 }, { type: 'collect', item: 'cap_spore', n: 4 }],
    rewards: { exp: [320, 220], zeny: 600, items: [['orange_potion', 5]] },
  },
  m3_stingers: {
    kind: 'main', name: 'ฝูงผึ้งที่ลานซากโบราณ', giver: 'lena', turnIn: 'lena', req: ['m2_spores'], minLevel: 5,
    intro: 'สติงเล็ตที่ลานซากโบราณทางตะวันออกเฉียงเหนือดุร้ายขึ้นทุกวัน มันบินเข้าหาคนเดินทางเอง ช่วยลดจำนวนมัน 8 ตัว และเก็บเหล็กไนมา 3 อันเป็นหลักฐาน',
    wait: 'ระวังนะ สติงเล็ตจะบินเข้าหาเจ้าทันทีที่เห็น',
    done: 'เจ้าทำได้! ทุ่งปลอดภัยขึ้นเยอะ เจ้าแข็งแกร่งพอจะเลือกเส้นทางของตัวเองแล้ว กลับไปหาออเรลที่สมาคมนักผจญภัยในเมืองเถอะ',
    goals: [{ type: 'kill', mob: 'stinglet', n: 8 }, { type: 'collect', item: 'stinger', n: 3 }],
    rewards: { exp: [900, 500], zeny: 1200, items: [['box_wood', 1]] },
  },
  m4_new_path: {
    kind: 'main', name: 'เส้นทางของตัวเอง', giver: 'aurel', turnIn: 'aurel', req: ['m3_stingers'], minLevel: 1,
    intro: 'ลีน่าเล่าเรื่องเจ้าให้ข้าฟังแล้ว ถึงเวลาเลือกอาชีพแล้ว — ฝึกจนถึง Job Lv.10 อัปทักษะพื้นฐานครบ Lv.9 แล้วเปลี่ยนเป็นอาชีพขั้นที่ 1 กับข้า',
    wait: 'เงื่อนไขคือ Job Lv.10 และทักษะพื้นฐาน Lv.9 พร้อมเมื่อไหร่คุยกับข้าแล้วเลือก "เปลี่ยนอาชีพ" ได้เลย',
    done: 'ยินดีด้วย! ตอนนี้เจ้าเป็นสมาชิกเต็มตัวของสมาคมแล้ว แวะไปหาการ์ธช่างตีเหล็กเพื่อเรียนการตีบวก แล้วกลับมาหาข้า มีงานสำคัญรออยู่',
    goals: [{ type: 'job' }],
    rewards: { exp: [1500, 0], zeny: 2000, items: [['blue_potion', 5], ['box_wood', 1]] },
  },
  m5_whisperwood: {
    kind: 'main', name: 'เสียงกระซิบจากป่า', giver: 'aurel', turnIn: 'fern', req: ['m4_new_path'], minLevel: 8,
    intro: 'มีรายงานว่าป่า Whisperwood ทางตะวันออกสุดของทุ่งกำลังกระสับกระส่าย ไปพบเฟิร์น พรานป่าที่ทางเข้าป่า แล้วช่วยนางสืบเรื่องนี้',
    wait: 'Whisperwood Forest อยู่ทางตะวันออกสุดของ Beginner Field หรือให้เซเลสวาร์ปไปก็ได้',
    done: 'ออเรลส่งเจ้ามาเหรอ? ดีเลย ป่ากำลังป่วย และข้าคิดว่าข้ารู้สาเหตุ...',
    goals: [{ type: 'visit', map: 'whisper_forest' }],
    rewards: { exp: [1500, 1000], zeny: 1500 },
  },
  m6_fang_thorn: {
    kind: 'main', name: 'เขี้ยวและหนาม', giver: 'fern', turnIn: 'fern', req: ['m5_whisperwood'], minLevel: 9,
    intro: 'ธอร์นแบ็กกับบาร์กวูล์ฟคลุ้มคลั่งเพราะพลังของต้นไม้เฒ่ารั่วไหล ช่วยข้าสยบพวกมันอย่างละ 6 ตัว แล้วเอาเขี้ยวบาร์กวูล์ฟมา 3 อัน ข้าจะใช้ทำเครื่องราง',
    wait: 'บาร์กวูล์ฟจะพุ่งเข้าหาเจ้าทันที ส่วนธอร์นแบ็กใจเย็นกว่า',
    done: 'เขี้ยวพวกนี้มีกลิ่นเปลือกไม้โบราณ... ต้นไม้เฒ่ากนาร์ลรูทตื่นแล้วจริง ๆ',
    goals: [{ type: 'kill', mob: 'thornback', n: 6 }, { type: 'kill', mob: 'barkwolf', n: 6 }, { type: 'collect', item: 'wolf_fang', n: 3 }],
    rewards: { exp: [4500, 2800], zeny: 3000, items: [['box_silver', 1]] },
  },
  m7_ancient_tree: {
    kind: 'main', name: 'ต้นไม้เฒ่าพันปี', giver: 'fern', turnIn: 'aurel', req: ['m6_fang_thorn'], minLevel: 12,
    intro: 'กนาร์ลรูทตื่นขึ้นที่ลานหินทางขวาล่างของป่า มันแข็งแกร่งมาก — เมื่อพื้นใต้เท้าเป็นวงแดงให้รีบหลบ! ถ้าเจ้าสยบมันได้ ป่าจะสงบ ไปรายงานออเรลที่เมืองด้วยนะ',
    wait: 'กนาร์ลรูทตื่นทุกไม่กี่นาที ชวนเพื่อนหรือเตรียมยาไปให้พร้อม',
    done: 'เจ้าสยบกนาร์ลรูทได้จริง ๆ! ตำนานบทแรกของเจ้าจบลงแล้ว แต่ดินแดนที่อยู่ไกลออกไปยังรอเจ้าอยู่... (ติดตามบทต่อไปในเวอร์ชันหน้า)',
    goals: [{ type: 'kill', mob: 'gnarlroot', n: 1 }],
    rewards: { exp: [14000, 9000], zeny: 15000, items: [['box_gold', 1], ['refine_guard', 1]] },
  },

  /* ---------- เควสเสริม: สอนระบบตีบวกและการ์ด ---------- */
  s1_smith: {
    kind: 'side', name: 'ฝีมือช่างตีเหล็ก', giver: 'garth', turnIn: 'garth', req: ['m4_new_path'], minLevel: 1,
    intro: 'ออเรลส่งมาเรียนวิชาเหรอ? อุปกรณ์ตีบวกได้ถึง +10 ยิ่งสูงยิ่งแรง แต่ตั้งแต่ +5 อาจล้มเหลวแล้วระดับลด และตั้งแต่ +8 อาจแตก! เอาผลึกนี่ไปลองตีบวกอุปกรณ์สักชิ้นให้สำเร็จ 1 ครั้ง',
    wait: 'คุยกับข้าแล้วเลือก "ตีบวกอุปกรณ์" ได้เลย +1 ถึง +4 สำเร็จแน่นอน',
    done: 'เห็นไหม ง่ายนิดเดียว! จำไว้ว่าเกิน +4 คือการเสี่ยงดวง เอาผลึกพวกนี้ไปใช้ต่อเถอะ',
    give: [['refine_w', 1], ['refine_a', 1]],
    goals: [{ type: 'refine', n: 1 }],
    rewards: { exp: [600, 400], zeny: 1500, items: [['refine_w', 3], ['refine_a', 3]] },
  },
  s2_first_card: {
    kind: 'side', name: 'การ์ดใบแรก', giver: 'garth', turnIn: 'garth', req: ['s1_smith'], minLevel: 1,
    intro: 'มอนสเตอร์บางตัวทิ้งการ์ดไว้ หายากมาก! การ์ดใส่ในช่องการ์ดของอุปกรณ์เพื่อเพิ่มพลังถาวร ข้าให้การ์ดบล็อบเล็ตใบนี้ ลองใส่ในรองเท้าดู (รองเท้าแตะร้านข้ามีช่องการ์ด 1 ช่อง) — เลือกการ์ดในกระเป๋าแล้วกด "ใส่การ์ด"',
    wait: 'เปิดกระเป๋า (I) เลือกการ์ดบล็อบเล็ต แล้วกด "ใส่การ์ด" ใส่แล้วถอดออกไม่ได้นะ',
    done: 'รองเท้าคู่นั้นเบาขึ้นเยอะเลยใช่ไหมล่ะ! ล่าการ์ดหายาก ๆ ต่อไปให้ได้นะ',
    give: [['card_bloblet', 1]],
    goals: [{ type: 'socket', n: 1 }],
    rewards: { exp: [800, 500], zeny: 2000, items: [['refine_a', 2]] },
  },

  /* ---------- เควสรายวัน: กระดานเควสของนีน่า ---------- */
  d_bloblet: {
    kind: 'daily', name: 'กำจัดเยลลี่ในทุ่ง', giver: 'nina', turnIn: 'nina', minLevel: 1,
    intro: 'บล็อบเล็ตขยายพันธุ์เร็วมาก ช่วยลดจำนวนสัก 10 ตัวนะคะ', wait: 'บล็อบเล็ตอยู่ฝั่งตะวันตกของ Beginner Field ค่ะ', done: 'ขอบคุณค่ะ! พรุ่งนี้มาใหม่นะคะ',
    goals: [{ type: 'kill', mob: 'bloblet', n: 10 }], rewards: { exp: [160, 110], zeny: 500 },
  },
  d_jelly: {
    kind: 'daily', name: 'เมือกเยลลี่สำหรับช่างกาว', giver: 'nina', turnIn: 'nina', minLevel: 1,
    intro: 'ช่างทำกาวในเมืองต้องการเมือกเยลลี่ 10 ชิ้นค่ะ', wait: 'เมือกเยลลี่ได้จากบล็อบเล็ตค่ะ', done: 'ช่างฝากขอบคุณมาด้วยค่ะ',
    goals: [{ type: 'collect', item: 'jelly_drop', n: 10 }], rewards: { exp: [120, 80], zeny: 800, items: [['red_potion', 5]] },
  },
  d_capling: {
    kind: 'daily', name: 'ล่าแคปปลิง', giver: 'nina', turnIn: 'nina', minLevel: 3,
    intro: 'แคปปลิงกำลังกินพืชผลของชาวนา ช่วยกำจัด 12 ตัวค่ะ', wait: 'แคปปลิงอยู่ทางแยกใต้ของทุ่งค่ะ', done: 'ชาวนาดีใจมากเลยค่ะ!',
    goals: [{ type: 'kill', mob: 'capling', n: 12 }], rewards: { exp: [520, 320], zeny: 900 },
  },
  d_stinglet: {
    kind: 'daily', name: 'ผึ้งดุที่ลานซาก', giver: 'nina', turnIn: 'nina', minLevel: 5,
    intro: 'คาราวานพ่อค้าถูกสติงเล็ตไล่ต่อย ช่วยกำจัด 10 ตัวค่ะ', wait: 'ลานซากโบราณทางตะวันออกเฉียงเหนือของทุ่งค่ะ', done: 'คาราวานผ่านไปได้แล้วค่ะ ขอบคุณมาก!',
    goals: [{ type: 'kill', mob: 'stinglet', n: 10 }], rewards: { exp: [1100, 650], zeny: 1200, items: [['box_wood', 1]] },
  },
  d_thornback: {
    kind: 'daily', name: 'ตัดหนามธอร์นแบ็ก', giver: 'nina', turnIn: 'nina', minLevel: 8,
    intro: 'ช่างทำโล่ต้องการให้ลดจำนวนธอร์นแบ็กในป่า 10 ตัวค่ะ', wait: 'ธอร์นแบ็กอยู่ใน Whisperwood Forest ค่ะ', done: 'เรียบร้อยค่ะ เก่งมาก!',
    goals: [{ type: 'kill', mob: 'thornback', n: 10 }], rewards: { exp: [2200, 1300], zeny: 2000, items: [['box_wood', 1]] },
  },
  d_wolf_fang: {
    kind: 'daily', name: 'เขี้ยวหมาป่าสำหรับช่างตีเหล็ก', giver: 'nina', turnIn: 'nina', minLevel: 10,
    intro: 'การ์ธอยากได้เขี้ยวบาร์กวูล์ฟ 5 อันไปทำด้ามมีดค่ะ', wait: 'บาร์กวูล์ฟอยู่ลึกเข้าไปใน Whisperwood Forest ค่ะ', done: 'การ์ธฝากผลึกมาให้ด้วยค่ะ',
    goals: [{ type: 'collect', item: 'wolf_fang', n: 5 }], rewards: { exp: [2600, 1600], zeny: 2500, items: [['refine_w', 1]] },
  },
  d_wisp_dust: {
    kind: 'daily', name: 'ผงแสงวิญญาณ', giver: 'nina', turnIn: 'nina', minLevel: 10,
    intro: 'นักเวทย์ของเมืองต้องการผงแสงวิสป์ 6 ขวดค่ะ', wait: 'วิสป์ลอยอยู่ใน Whisperwood Forest หลบเก่งมากนะคะ', done: 'แสงสวยมากเลยค่ะ ขอบคุณนะคะ',
    goals: [{ type: 'collect', item: 'wisp_dust', n: 6 }], rewards: { exp: [2600, 1600], zeny: 2500, items: [['refine_a', 1]] },
  },

  /* ---------- เนื้อเรื่องบทที่ 2: ยอดเขาหิมะ (v0.11) ---------- */
  m8_frostveil: {
    kind: 'main', name: 'สู่ยอดเขาหิมะ', giver: 'aurel', turnIn: 'bjorn', req: ['m7_ancient_tree'], minLevel: 20,
    intro: 'เมื่อกนาร์ลรูทสงบลง หิมะกลับตกหนักผิดฤดูทางเหนือ... ไปที่ Frostveil Peaks ผ่านทางเหนือสุดของป่า Whisperwood แล้วพบบยอร์น พรานหิมะที่ค่ายนักสำรวจ',
    wait: 'ทางขึ้นยอดเขาอยู่ทางเหนือสุดของ Whisperwood Forest หรือให้เซเลสวาร์ปไปก็ได้',
    done: 'ออเรลส่งเจ้ามาเหรอ? มาถูกเวลาแล้ว พายุหิมะครั้งนี้ไม่ธรรมดา',
    goals: [{ type: 'visit', map: 'frostveil' }],
    rewards: { exp: [6000, 4200], zeny: 5000, items: [['white_potion', 5]] },
  },
  m9_frost_hunt: {
    kind: 'main', name: 'นักล่าแห่งพายุหิมะ', giver: 'bjorn', turnIn: 'bjorn', req: ['m8_frostveil'], minLevel: 22,
    intro: 'ฟรอสต์ฟ็อกซ์กับฟรอสต์แบทลงมาใกล้ค่ายมากขึ้นทุกวัน ช่วยไล่พวกมันอย่างละ 8 ตัว และเก็บขนจิ้งจอกหิมะมา 5 ผืน ข้าจะทำเสื้อกันหนาวให้คนในค่าย',
    wait: 'จิ้งจอกอยู่ทุ่งหิมะทางตะวันตก ค้างคาวอยู่แถวหน้าผาทางตะวันออก',
    done: 'ขนนุ่มดีจริง ๆ ค่ายของเราจะอุ่นขึ้นเยอะ! แต่ข้ายังมีงานที่ยากกว่านี้...',
    goals: [{ type: 'kill', mob: 'frostfox', n: 8 }, { type: 'kill', mob: 'frostbat', n: 8 }, { type: 'collect', item: 'frost_fur', n: 5 }],
    rewards: { exp: [14000, 10000], zeny: 8000, items: [['white_potion', 10], ['box_wood', 2]] },
  },
  m10_yeti_golem: {
    kind: 'main', name: 'ยักษ์แห่งธารน้ำแข็ง', giver: 'bjorn', turnIn: 'bjorn', req: ['m9_frost_hunt'], minLevel: 32,
    intro: 'เยติทางตะวันตกเฉียงเหนือกับไอซ์โกเลมที่ธารน้ำแข็งตะวันออกเฉียงเหนือคลุ้มคลั่ง สยบพวกมันอย่างละ 6 ตัว แล้วนำแกนน้ำแข็งนิรันดร์มา 3 ก้อน ข้าอยากรู้ว่าอะไรปลุกพวกมัน',
    wait: 'ไอซ์โกเลมดุมาก มันจะเดินเข้าหาเจ้าทันทีที่เห็น',
    done: 'แกนน้ำแข็งพวกนี้... มีพลังของราชินีหิมะอยู่ข้างใน นางตื่นแล้วจริง ๆ',
    goals: [{ type: 'kill', mob: 'yeti', n: 6 }, { type: 'kill', mob: 'icegolem', n: 6 }, { type: 'collect', item: 'ice_core', n: 3 }],
    rewards: { exp: [38000, 27000], zeny: 15000, items: [['box_silver', 1], ['refine_w', 3], ['refine_a', 3]] },
  },
  m11_glacia: {
    kind: 'main', name: 'บัลลังก์น้ำแข็ง', giver: 'bjorn', turnIn: 'bjorn', req: ['m10_yeti_golem'], minLevel: 40,
    intro: 'กลาเซีย ราชินีหิมะ ประทับอยู่ที่บัลลังก์น้ำแข็งทางเหนือสุด ถ้าไม่หยุดนาง พายุจะกลืนทั้งอาณาจักร! ระวังวงสีฟ้าบนพื้น — โดนแล้วจะถูกแช่แข็ง',
    wait: 'กลาเซียฟื้นคืนชีพทุกไม่กี่นาที เตรียมยาขาวไปให้พอ',
    done: 'พายุหยุดแล้ว! เจ้าคือวีรบุรุษแห่งยอดเขา... แต่ลมร้อนที่พัดมาจากทางตะวันออก ข้าว่ามันแปลก ๆ',
    goals: [{ type: 'kill', mob: 'glacia', n: 1 }],
    rewards: { exp: [80000, 58000], zeny: 40000, items: [['box_gold', 1], ['refine_guard', 2]] },
  },

  /* ---------- เนื้อเรื่องบทที่ 3: ภูเขาไฟ (v0.11) ---------- */
  m12_caldera: {
    kind: 'main', name: 'ลมร้อนจากตะวันออก', giver: 'bjorn', turnIn: 'kael', req: ['m11_glacia'], minLevel: 48,
    intro: 'ทางตะวันออกของยอดเขามีประตูสู่ Ember Caldera ปล่องภูเขาไฟที่ตื่นขึ้นหลังราชินีหิมะล้ม ไปพบเคล อัศวินเพลิงที่ค่ายผู้กล้า',
    wait: 'ประตูอยู่สุดทางแยกตะวันออกของยอดเขา',
    done: 'นักผจญภัยจากยอดเขาหิมะเหรอ? ดีมาก ข้าต้องการคนกล้าแบบเจ้า',
    goals: [{ type: 'visit', map: 'ember_caldera' }],
    rewards: { exp: [40000, 28000], zeny: 20000, items: [['white_potion', 10]] },
  },
  m13_fire_trial: {
    kind: 'main', name: 'บททดสอบแห่งเปลวไฟ', giver: 'kael', turnIn: 'kael', req: ['m12_caldera'], minLevel: 50,
    intro: 'จะสู้กับมังกรได้ ต้องผ่านเปลวไฟเล็ก ๆ ก่อน กำจัดแมกม่าสไลม์และเอมเบอร์อิมป์อย่างละ 10 ตัว แล้วเก็บเขาอิมป์เพลิงมา 5 อัน',
    wait: 'สไลม์อยู่ฝั่งตะวันตก อิมป์อยู่ทางเหนือเลยแม่น้ำลาวา',
    done: 'ไม่เลวเลย! เจ้าทนความร้อนได้ดีกว่าที่คิด',
    goals: [{ type: 'kill', mob: 'magmaslime', n: 10 }, { type: 'kill', mob: 'emberimp', n: 10 }, { type: 'collect', item: 'imp_horn', n: 5 }],
    rewards: { exp: [120000, 85000], zeny: 30000, items: [['royal_jelly', 5], ['box_silver', 1]] },
  },
  m14_scales: {
    kind: 'main', name: 'เกล็ดและหินดำ', giver: 'kael', turnIn: 'kael', req: ['m13_fire_trial'], minLevel: 65,
    intro: 'ซาลาแมนเดอร์ริมลาวาและออบซิเดียนโกเลมทางใต้คือองครักษ์ของมังกร สยบพวกมันอย่างละ 8 ตัว และนำเศษออบซิเดียนมา 4 ชิ้น ข้าจะตีอาวุธที่ทนไฟมังกรได้',
    wait: 'โกเลมอยู่ที่ราบทางใต้ ข้ามสะพานลาวาไป',
    done: 'เศษหินพวกนี้ร้อนจนมือข้าแทบพอง... ถึงเวลาแล้ว',
    goals: [{ type: 'kill', mob: 'salamander', n: 8 }, { type: 'kill', mob: 'obsidiangolem', n: 8 }, { type: 'collect', item: 'obsidian_shard', n: 4 }],
    rewards: { exp: [300000, 210000], zeny: 60000, items: [['box_silver', 2], ['refine_guard', 1]] },
  },
  m15_ignarok: {
    kind: 'main', name: 'มังกรเพลิงอิกนารอก', giver: 'kael', turnIn: 'aurel', req: ['m14_scales'], minLevel: 80,
    intro: 'อิกนารอกตื่นขึ้นในปากปล่องทางตะวันออก มันคือต้นเหตุของทุกสิ่ง! เมื่อพื้นเป็นวงสีส้ม คืออุกกาบาตเพลิง หลบให้ทัน แล้วกลับไปรายงานออเรลที่เมืองหลังมันพ่าย',
    wait: 'อิกนารอกแข็งแกร่งเกินกว่าใคร ชวนเพื่อน หรือฝึกให้ถึงเลเวลสูงสุดก่อน',
    done: 'เจ้าปราบมังกรเพลิงได้... ชื่อของเจ้าจะถูกจารึกไว้ในประวัติศาสตร์ของ Everlevel ตลอดไป! (จบบทที่ 3 — ติดตามบทต่อไปในเวอร์ชันหน้า)',
    goals: [{ type: 'kill', mob: 'ignarok', n: 1 }],
    rewards: { exp: [600000, 420000], zeny: 200000, items: [['box_gold', 2], ['refine_guard', 3]] },
  },

  /* ---------- เควสรายวันระดับสูง (v0.11) ---------- */
  d_frostfox: {
    kind: 'daily', name: 'จิ้งจอกบุกค่าย', giver: 'nina', turnIn: 'nina', minLevel: 22,
    intro: 'ค่ายบนยอดเขาขอความช่วยเหลือ ฟรอสต์ฟ็อกซ์ขโมยเสบียง ช่วยกำจัด 12 ตัวค่ะ', wait: 'อยู่ทุ่งหิมะทางตะวันตกของ Frostveil Peaks ค่ะ', done: 'ค่ายฝากขอบคุณมาค่ะ!',
    goals: [{ type: 'kill', mob: 'frostfox', n: 12 }], rewards: { exp: [9000, 6500], zeny: 5000, items: [['white_potion', 3]] },
  },
  d_yeti_fur: {
    kind: 'daily', name: 'ขนเยติสำหรับช่างตัดเสื้อ', giver: 'nina', turnIn: 'nina', minLevel: 32,
    intro: 'ช่างตัดเสื้อในเมืองต้องการขนเยติ 6 ผืนค่ะ', wait: 'เยติอยู่หุบเขาทางตะวันตกเฉียงเหนือของยอดเขาค่ะ', done: 'ขนหนานุ่มมากเลยค่ะ!',
    goals: [{ type: 'collect', item: 'yeti_fur', n: 6 }], rewards: { exp: [22000, 16000], zeny: 9000, items: [['box_wood', 1]] },
  },
  d_emberimp: {
    kind: 'daily', name: 'ปราบอิมป์เพลิง', giver: 'nina', turnIn: 'nina', minLevel: 55,
    intro: 'เอมเบอร์อิมป์ก่อไฟป่าลามมาถึงยอดเขา ช่วยกำจัด 12 ตัวค่ะ', wait: 'อิมป์อยู่ทางเหนือของ Ember Caldera ค่ะ', done: 'ไฟสงบแล้วค่ะ เก่งมาก!',
    goals: [{ type: 'kill', mob: 'emberimp', n: 12 }], rewards: { exp: [70000, 50000], zeny: 20000, items: [['refine_w', 1], ['refine_a', 1]] },
  },
  d_obsidian: {
    kind: 'daily', name: 'หินดำสำหรับการ์ธ', giver: 'nina', turnIn: 'nina', minLevel: 75,
    intro: 'การ์ธอยากได้เศษออบซิเดียน 5 ชิ้นไปทดลองตีอาวุธค่ะ', wait: 'ออบซิเดียนโกเลมอยู่ที่ราบทางใต้ของภูเขาไฟค่ะ', done: 'การ์ธฝากคริสตัลมาให้ด้วยค่ะ!',
    goals: [{ type: 'collect', item: 'obsidian_shard', n: 5 }], rewards: { exp: [160000, 115000], zeny: 40000, items: [['refine_guard', 1]] },
  },
};

export const QUEST_IDS = Object.keys(QUESTS);
