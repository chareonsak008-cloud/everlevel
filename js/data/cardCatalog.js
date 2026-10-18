// v0.29: การ์ดมอนสเตอร์ชุดใหม่ (ทุกมอนในเกม 30 ใบ · 3 ระดับ Normal / Elite / MVP) + คอมโบการ์ด
// effects ใช้ schema ของเอกสารออกแบบ · toBonus() แปลงเป็นคีย์โบนัสในเกม · effectText() เป็นข้อความไทย
// v0.35.4: อัตราดรอปการ์ดปรับใหม่ — ธรรมดา 0.4% · Elite 0.15% · MVP 2% (เดิม 0.005–0.02% แทบไม่ดรอปแม้คูณ 10)
// การ์ดใบเดียวกันเสียบซ้ำได้ (stackable) แต่จำกัดจำนวนสูงสุดต่อชิ้นอุปกรณ์ด้วย max_stack

export const CARD_RANKS = {
  normal: { th: 'Normal', frame: 'silver', label: 'การ์ดทั่วไป' },
  elite: { th: 'Elite', frame: 'gold', label: 'การ์ดมินิบอส' },
  mvp: { th: 'MVP', frame: 'crimson', label: 'การ์ดบอสแผนที่' },
};
export const CARD_MAPS = {
  beginner_field: { code: 'BF', th: 'Beginner Field', tone: ['#9fe07a', '#3f8a38', '#1e3a1a'] },
  whisper_forest: { code: 'WW', th: 'Whisperwood Forest', tone: ['#8affc8', '#2f6a3a', '#0e2416'] },
  frostveil: { code: 'FV', th: 'Frostveil Peaks', tone: ['#bff4ff', '#4a7ac8', '#101e3a'] },
  ember_caldera: { code: 'EC', th: 'Ember Caldera', tone: ['#ffb05a', '#c8401a', '#2a0a06'] },
  ancient_ruins: { code: 'AR', th: 'Ancient Ruins', tone: ['#ffe2a0', '#a8844a', '#2a2010'] },
  haunted_forest: { code: 'HF', th: 'Haunted Forest', tone: ['#d8a8ff', '#5a2a8a', '#12061e'] },
  sunken_coast: { code: 'SC', th: 'Sunken Coast', tone: ['#9ef7ea', '#1f8a9a', '#06202a'] },      // v0.46
  crystal_valley: { code: 'CV', th: 'Crystal Valley', tone: ['#e0c8ff', '#6a4ab8', '#140e2a'] },
  sky_citadel: { code: 'SK', th: 'Sky Citadel', tone: ['#fff6d0', '#c8a24a', '#2a2412'] },
};
export const SLOT_TH = { weapon: 'อาวุธ', body: 'เสื้อ', shield: 'โล่', garment: 'ผ้าคลุม', shoes: 'รองเท้า', head: 'หมวก', accessory: 'เครื่องประดับ' };
export const CLASS_TH = { swordsman: 'สายดาบ', mage: 'สายเวท', acolyte: 'สายฮีล', archer: 'สายธนู', all: 'ทุกอาชีพ' };
export const ROLE_TH = { farm: 'ฟาร์ม', pvm: 'PvM', boss: 'PvP/บอส', build: 'สร้างบิลด์' };
const TR = { beast: 'สัตว์', plant: 'พืช', insect: 'แมลง', formless: 'ไร้รูป', undead: 'อันเดด', demon: 'ปีศาจ', dragon: 'มังกร', neutral: 'ไร้ธาตุ', earth: 'ดิน', water: 'น้ำ', fire: 'ไฟ', wind: 'ลม', holy: 'ศักดิ์สิทธิ์', shadow: 'มืด', small: 'เล็ก', medium: 'กลาง', large: 'ใหญ่' };

const E = (type, value, target = null, unit = '') => ({ type, ...(target ? { target } : {}), value, unit });
const M = (id, name, level, race, element, size, map) => ({ id, name, level, race, element, size, map });
const C = (o) => ({ condition: null, stackable: true, combo_id: null, ...o });

export const CARD_CATALOG = [
  /* ---------------- Beginner Field ---------------- */
  C({ id: 'card_bloblet', no: 'BF-01', name_th: 'การ์ดบล็อบเล็ต', name_en: 'Bloblet Card', monster: M('bloblet', 'บล็อบเล็ต', 1, 'formless', 'water', 'small', 'beginner_field'),
    slot: 'accessory', rank: 'normal', drop_rate: 0.004, role: 'farm', max_stack: 2, combo_id: 'cb_origin',
    effects: [E('drop_pct', 4, null, '%')], recommended_class: ['all'],
    flavor: 'วุ้นใสที่เก็บของมันวาวทุกชิ้นที่กลิ้งผ่าน ใครพกไว้มักเจอของดีกว่าคนอื่น',
    art_prompt: 'วุ้นทรงหยดน้ำสีฟ้าอมเขียวกระโดดกลางอากาศ แสงสะท้อนวาวบนผิว พื้นหลังทุ่งหญ้ายามเช้ามีหยดน้ำค้างลอย โทนเขียวมิ้นต์-ฟ้า' }),
  C({ id: 'card_capling', no: 'BF-02', name_th: 'การ์ดแคปปลิง', name_en: 'Capling Card', monster: M('capling', 'แคปปลิง', 3, 'plant', 'earth', 'small', 'beginner_field'),
    slot: 'head', rank: 'normal', drop_rate: 0.004, role: 'farm', max_stack: 1, combo_id: 'cb_origin',
    effects: [E('sp_on_kill', 3)], recommended_class: ['mage', 'acolyte'],
    flavor: 'สปอร์เรืองแสงจากหมวกเห็ดซึมเข้าสู่จิตใจ ทุกชัยชนะเติมพลังเวทกลับคืน',
    art_prompt: 'เห็ดตัวน้อยหมวกน้ำเงินจุดขาวยืนเอียงคอ ปล่อยสปอร์เรืองแสงสีฟ้ารอบตัว พื้นหลังโคนไม้ใหญ่ในทุ่ง โทนน้ำเงิน-เขียว' }),
  C({ id: 'card_stinglet', no: 'BF-03', name_th: 'การ์ดสติงเล็ต', name_en: 'Stinglet Card', monster: M('stinglet', 'สติงเล็ต', 6, 'insect', 'wind', 'small', 'beginner_field'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 3, combo_id: 'cb_origin',
    effects: [E('dmg_vs_race', 20, 'insect', '%')], recommended_class: ['swordsman', 'archer'],
    flavor: 'เหล็กไนเล็กจิ๋วแต่รู้จุดอ่อนของเปลือกแข็งทุกชนิด',
    art_prompt: 'ผึ้งตัวกลมสีเหลืองทองพุ่งเข้าหาผู้ชม เหล็กไนเรืองแสง ปีกพร่ามัวจากความเร็ว พื้นหลังดอกไม้ป่าสีส้ม โทนเหลือง-ส้ม' }),

  /* ---------------- Whisperwood Forest ---------------- */
  C({ id: 'card_thornback', no: 'WW-01', name_th: 'การ์ดธอร์นแบ็ก', name_en: 'Thornback Card', monster: M('thornback', 'ธอร์นแบ็ก', 9, 'beast', 'earth', 'small', 'whisper_forest'),
    slot: 'shield', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 3, combo_id: 'cb_grove',
    effects: [E('reduce_vs_race', 15, 'beast', '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'หนามบนหลังเคยหักเขี้ยวหมาป่ามานับไม่ถ้วน',
    art_prompt: 'เม่นป่าขดตัวโชว์หนามแหลมสีน้ำตาลทอง แววตาดุดัน พื้นหลังพุ่มไม้หนามในป่าลึก แสงลอดใบไม้ โทนน้ำตาล-เขียวมะกอก' }),
  C({ id: 'card_wisp', no: 'WW-02', name_th: 'การ์ดวิสป์', name_en: 'Wisp Card', monster: M('wisp', 'วิสป์', 12, 'formless', 'holy', 'medium', 'whisper_forest'),
    slot: 'accessory', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_grove',
    effects: [E('cast_pct', 6, null, '%')], recommended_class: ['mage', 'acolyte'],
    flavor: 'ดวงไฟวิญญาณกระซิบคาถาก่อนผู้ร่ายจะเปิดปาก',
    art_prompt: 'ลูกไฟวิญญาณสีเขียวมรกตลอยวน มีหางแสงเป็นเกลียว พื้นหลังป่ายามค่ำเต็มไปด้วยหิ่งห้อย โทนเขียวมรกต-ดำ' }),
  C({ id: 'card_barkwolf', no: 'WW-03', name_th: 'การ์ดบาร์กวูล์ฟ', name_en: 'Barkwolf Card', monster: M('barkwolf', 'บาร์กวูล์ฟ', 15, 'beast', 'earth', 'medium', 'whisper_forest'),
    slot: 'weapon', rank: 'elite', drop_rate: 0.0015, role: 'pvm', max_stack: 2, combo_id: 'cb_grove',
    effects: [E('dmg_vs_race', 15, 'beast', '%'), E('crit', 4)], recommended_class: ['swordsman', 'archer'],
    flavor: 'จ่าฝูงหมาป่าเปลือกไม้ ล่าเหยื่อด้วยการกัดครั้งเดียวที่คอ',
    art_prompt: 'หมาป่าขนเป็นเปลือกไม้กระโจนเขี้ยวกาง ดวงตาสีอำพัน ใบไม้ปลิว พื้นหลังถ้ำรากไม้ใต้แสงจันทร์ โทนน้ำตาลไหม้-อำพัน กรอบทอง' }),
  C({ id: 'card_gnarlroot', no: 'WW-MVP', name_th: 'การ์ดกนาร์ลรูท', name_en: 'Gnarlroot Card', monster: M('gnarlroot', 'กนาร์ลรูท ต้นไม้เฒ่า', 20, 'plant', 'earth', 'large', 'whisper_forest'),
    slot: 'body', rank: 'mvp', drop_rate: 0.02, role: 'boss', max_stack: 1, stackable: false, combo_id: 'cb_grove',
    effects: [E('maxhp_pct', 15, null, '%'), E('stat', 5, 'vit'), E('regen_pct', 50, null, '%'), E('dmg_taken', -5, null, '%'), E('aspd_pct', -8, null, '%')],
    condition: 'ข้อเสีย: ความเร็วโจมตี -8%', recommended_class: ['swordsman', 'acolyte'],
    flavor: 'รากของต้นไม้เฒ่าหยั่งลึกถึงหัวใจผืนป่า ผู้สวมใส่ล้มยากแต่ขยับช้าลงเหมือนไม้ใหญ่',
    art_prompt: 'ต้นไม้ยักษ์ใบหน้าแกะสลักบนลำต้น ยกแขนรากขึ้นฟ้า ดวงตาเรืองเขียว เศษใบไม้และสปอร์ทองลอยหมุน พื้นหลังลานหินโบราณกลางป่า โทนเขียวเข้ม-ทอง กรอบแดงมงกุฎ' }),

  /* ---------------- Frostveil Peaks ---------------- */
  C({ id: 'card_frostfox', no: 'FV-01', name_th: 'การ์ดฟรอสต์ฟ็อกซ์', name_en: 'Frostfox Card', monster: M('frostfox', 'ฟรอสต์ฟ็อกซ์', 20, 'beast', 'water', 'small', 'frostveil'),
    slot: 'shoes', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 1, combo_id: 'cb_frost',
    effects: [E('speed_pct', 6, null, '%')], recommended_class: ['all'],
    flavor: 'รอยเท้าของมันหายไปกับหิมะก่อนที่ใครจะทันเห็น',
    art_prompt: 'จิ้งจอกขาวหางฟูสามหางวิ่งบนสันหิมะ ละอองน้ำแข็งพุ่งตามหลัง พื้นหลังยอดเขาแสงออโรร่า โทนขาว-ฟ้าน้ำแข็ง' }),
  C({ id: 'card_frostbat', no: 'FV-02', name_th: 'การ์ดฟรอสต์แบท', name_en: 'Frostbat Card', monster: M('frostbat', 'ฟรอสต์แบท', 25, 'beast', 'water', 'medium', 'frostveil'),
    slot: 'garment', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 3, combo_id: 'cb_frost',
    effects: [E('flee', 10)], recommended_class: ['archer', 'swordsman'],
    flavor: 'ปีกบางใสราวแผ่นน้ำแข็ง ตีลังกาหลบได้ทุกทิศทาง',
    art_prompt: 'ค้างคาวปีกใสสีฟ้าคริสตัลกางปีกเต็มที่ ห้อยหัวในถ้ำน้ำแข็ง หินงอกน้ำแข็งเรืองแสง โทนฟ้า-คราม' }),
  C({ id: 'card_yeti', no: 'FV-03', name_th: 'การ์ดเยติ', name_en: 'Yeti Card', monster: M('yeti', 'เยติ', 31, 'beast', 'water', 'large', 'frostveil'),
    slot: 'body', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 2, combo_id: 'cb_frost',
    effects: [E('maxhp_pct', 6, null, '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'พายุหิมะร้อยวันไม่เคยทำให้เยติล้มลง',
    art_prompt: 'เยติขนขาวยืนทุบอก คำรามท่ามกลางพายุหิมะ เกล็ดน้ำแข็งเกาะขน พื้นหลังหน้าผาหิมะ โทนขาว-เทาฟ้า' }),
  C({ id: 'card_icegolem', no: 'FV-04', name_th: 'การ์ดไอซ์โกเลม', name_en: 'Ice Golem Card', monster: M('icegolem', 'ไอซ์โกเลม', 37, 'formless', 'water', 'large', 'frostveil'),
    slot: 'shield', rank: 'elite', drop_rate: 0.0015, role: 'boss', max_stack: 2, combo_id: 'cb_frost',
    effects: [E('reduce_vs_element', 20, 'water', '%'), E('mdef', 8)], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'ผู้พิทักษ์ธารน้ำแข็งที่สร้างจากเวทของราชินีหิมะ',
    art_prompt: 'โกเลมน้ำแข็งก้อนใหญ่ยกหมัดคริสตัล แกนกลางอกเรืองฟ้า รอยร้าวมีแสง พื้นหลังธารน้ำแข็งสีคราม โทนฟ้าเข้ม-ขาว กรอบทอง' }),
  C({ id: 'card_glacia', no: 'FV-MVP', name_th: 'การ์ดกลาเซีย', name_en: 'Glacia Card', monster: M('glacia', 'กลาเซีย ราชินีหิมะ', 45, 'demon', 'water', 'large', 'frostveil'),
    slot: 'head', rank: 'mvp', drop_rate: 0.02, role: 'build', max_stack: 1, stackable: false, combo_id: 'cb_frost',
    effects: [E('stat', 6, 'int'), E('matk_pct', 8, null, '%'), E('cast_pct', 10, null, '%'), E('maxsp_pct', 15, null, '%'), E('maxhp_pct', -10, null, '%')],
    condition: 'ข้อเสีย: MaxHP -10%', recommended_class: ['mage'],
    flavor: 'มงกุฎน้ำแข็งมอบปัญญาอันเยือกเย็น แต่ดูดความอบอุ่นของร่างกายไปทีละน้อย',
    art_prompt: 'ราชินีหิมะผมขาวนั่งบนบัลลังก์คริสตัล ยื่นมือปล่อยพายุเกล็ดน้ำแข็ง มงกุฎแหลม พื้นหลังห้องบัลลังก์น้ำแข็งแสงออโรร่า โทนฟ้าน้ำแข็ง-ม่วงอ่อน กรอบแดงมงกุฎ' }),

  /* ---------------- Ember Caldera ---------------- */
  C({ id: 'card_magmaslime', no: 'EC-01', name_th: 'การ์ดแมกม่าสไลม์', name_en: 'Magma Slime Card', monster: M('magmaslime', 'แมกม่าสไลม์', 42, 'formless', 'fire', 'small', 'ember_caldera'),
    slot: 'body', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 2, combo_id: 'cb_flame',
    effects: [E('reduce_vs_element', 20, 'fire', '%')], recommended_class: ['all'],
    flavor: 'เจลลาวาที่เย็นตัวแล้วกลายเป็นเกราะกันความร้อนชั้นดี',
    art_prompt: 'สไลม์ลาวาสีส้มแดงเดือดปุด ๆ มีหินดำลอยอยู่ข้างใน หยดไฟกระเด็น พื้นหลังบ่อลาวา โทนส้ม-แดงเข้ม' }),
  C({ id: 'card_emberimp', no: 'EC-02', name_th: 'การ์ดเอมเบอร์อิมป์', name_en: 'Ember Imp Card', monster: M('emberimp', 'เอมเบอร์อิมป์', 50, 'demon', 'fire', 'medium', 'ember_caldera'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 3, combo_id: 'cb_flame',
    effects: [E('dmg_vs_race', 20, 'demon', '%')], recommended_class: ['swordsman', 'archer', 'mage'],
    flavor: 'อิมป์ที่ทรยศเผ่าตัวเอง รู้ดีว่าปีศาจกลัวอะไรที่สุด',
    art_prompt: 'อิมป์ตัวเล็กเขาโค้ง หัวเราะเจ้าเล่ห์ ถือส้อมไฟ ประกายไฟรอบตัว พื้นหลังโพรงหินร้อนระอุ โทนแดง-ม่วงเข้ม' }),
  C({ id: 'card_salamander', no: 'EC-03', name_th: 'การ์ดซาลาแมนเดอร์', name_en: 'Salamander Card', monster: M('salamander', 'ซาลาแมนเดอร์', 58, 'dragon', 'fire', 'small', 'ember_caldera'),
    slot: 'accessory', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_flame',
    effects: [E('crit_dmg', 10, null, '%')], recommended_class: ['swordsman', 'archer'],
    flavor: 'ลิ้นไฟของมันลุกโชนที่สุดตอนพุ่งเข้าหาจุดตาย',
    art_prompt: 'ซาลาแมนเดอร์เกล็ดส้มทองพันรอบหินร้อน ลิ้นเป็นเปลวไฟ หางลุกไฟ พื้นหลังปล่องลาวาไหล โทนส้มทอง-ดำ' }),
  C({ id: 'card_obsidiangolem', no: 'EC-04', name_th: 'การ์ดออบซิเดียนโกเลม', name_en: 'Obsidian Golem Card', monster: M('obsidiangolem', 'ออบซิเดียนโกเลม', 66, 'formless', 'earth', 'large', 'ember_caldera'),
    slot: 'shield', rank: 'elite', drop_rate: 0.0015, role: 'boss', max_stack: 2, combo_id: 'cb_flame',
    effects: [E('def', 12), E('reduce_vs_size', 15, 'large', '%')], recommended_class: ['swordsman'],
    flavor: 'หินภูเขาไฟที่ผ่านความร้อนพันปี แข็งจนขวานยังบิ่น',
    art_prompt: 'โกเลมหินออบซิเดียนดำวาว รอยแตกเรืองลาวา ยกโล่หินขนาดใหญ่ พื้นหลังปากปล่องภูเขาไฟ ควันเทา โทนดำ-ส้มเรือง กรอบทอง' }),
  C({ id: 'card_ignarok', no: 'EC-MVP', name_th: 'การ์ดอิกนารอก', name_en: 'Ignarok Card', monster: M('ignarok', 'อิกนารอก มังกรเพลิง', 80, 'dragon', 'fire', 'large', 'ember_caldera'),
    slot: 'weapon', rank: 'mvp', drop_rate: 0.02, role: 'pvm', max_stack: 1, stackable: false, combo_id: 'cb_flame',
    effects: [E('atk_pct', 10, null, '%'), E('dmg_vs_size', 25, 'large', '%'), E('stat', 5, 'str'), E('crit', 5), E('dmg_taken', 10, null, '%')],
    condition: 'ข้อเสีย: รับดาเมจเพิ่ม +10%', recommended_class: ['swordsman', 'archer'],
    flavor: 'เพลิงของมังกรเผาผลาญทุกสิ่ง รวมถึงเกราะของผู้ถือการ์ดเอง',
    art_prompt: 'มังกรเพลิงกางปีกใหญ่เต็มกรอบ พ่นไฟลงมา เกล็ดแดงขอบทอง ดวงตาเหลือง พื้นหลังปากปล่องปะทุลาวาพุ่ง โทนแดงเพลิง-ทอง กรอบแดงมงกุฎ' }),

  /* ---------------- Ancient Ruins ---------------- */
  C({ id: 'card_ruin_scarab', no: 'AR-01', name_th: 'การ์ดสคารับอักขระ', name_en: 'Rune Scarab Card', monster: M('ruin_scarab', 'สคารับอักขระ', 60, 'insect', 'earth', 'small', 'ancient_ruins'),
    slot: 'shoes', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_ruins',
    effects: [E('maxsp_pct', 8, null, '%')], recommended_class: ['mage', 'acolyte'],
    flavor: 'อักขระบนกระดองยังจดจำมนต์ของนักบวชในวิหารที่ล่มสลาย',
    art_prompt: 'แมลงสคารับกระดองทองสลักอักขระเรืองฟ้า คลานบนแผ่นศิลา พื้นหลังเสาหินพัง แดดยามเย็น โทนทองทราย-ฟ้า' }),
  C({ id: 'card_sand_basilisk', no: 'AR-02', name_th: 'การ์ดบาซิลิสก์ทราย', name_en: 'Sand Basilisk Card', monster: M('sand_basilisk', 'บาซิลิสก์ทราย', 64, 'dragon', 'earth', 'medium', 'ancient_ruins'),
    slot: 'garment', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 3, combo_id: 'cb_ruins',
    effects: [E('reduce_vs_element', 15, 'earth', '%')], recommended_class: ['all'],
    flavor: 'เกล็ดทรายของบาซิลิสก์ปัดหินและดินออกไปเหมือนสายลม',
    art_prompt: 'กิ้งก่ายักษ์เกล็ดสีทรายชูคอขู่ ดวงตาเขียวเรือง ทรายปลิวรอบ พื้นหลังลานซากเมืองกลางพายุทราย โทนน้ำตาลทราย-เขียวหม่น' }),
  C({ id: 'card_rune_sentinel', no: 'AR-03', name_th: 'การ์ดยามศิลาอักขระ', name_en: 'Rune Sentinel Card', monster: M('rune_sentinel', 'ยามศิลาอักขระ', 68, 'formless', 'neutral', 'large', 'ancient_ruins'),
    slot: 'shield', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 3, combo_id: 'cb_ruins',
    effects: [E('reduce_vs_race', 20, 'formless', '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'ยามที่ไม่เคยหลับใหลในห้าร้อยปี รู้จังหวะของสิ่งไร้วิญญาณทุกชนิด',
    art_prompt: 'รูปปั้นหินยักษ์ถือหอก อักขระเขียวเรืองบนร่าง ยืนเฝ้าประตูวิหาร พื้นหลังซุ้มประตูหินมีเถาวัลย์ โทนเทาหิน-เขียวหยก' }),
  C({ id: 'card_astral_wisp', no: 'AR-04', name_th: 'การ์ดวิสป์ดารา', name_en: 'Astral Wisp Card', monster: M('astral_wisp', 'วิสป์ดารา', 72, 'formless', 'holy', 'medium', 'ancient_ruins'),
    slot: 'head', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_ruins',
    effects: [E('heal_pct', 12, null, '%')], recommended_class: ['acolyte'],
    flavor: 'แสงดาวที่ตกลงในวิหารยังคงรักษาผู้บาดเจ็บอยู่ทุกคืน',
    art_prompt: 'ดวงวิญญาณแสงดาวสีฟ้าขาวมีวงแหวนดาวหมุนรอบ ลอยเหนือแท่นบูชา พื้นหลังท้องฟ้ากลางคืนผ่านหลังคาที่พัง โทนฟ้า-ทองอ่อน' }),
  C({ id: 'card_relic_knight', no: 'AR-05', name_th: 'การ์ดอัศวินซากโบราณ', name_en: 'Relic Knight Card', monster: M('relic_knight', 'อัศวินซากโบราณ', 75, 'undead', 'shadow', 'large', 'ancient_ruins'),
    slot: 'accessory', rank: 'elite', drop_rate: 0.0015, role: 'pvm', max_stack: 2, combo_id: 'cb_ruins',
    effects: [E('atk_pct', 6, null, '%'), E('hit', 12)], recommended_class: ['swordsman', 'archer'],
    flavor: 'อัศวินที่สาบานจะปกป้องวิหารแม้หลังความตาย ดาบของเขายังไม่เคยพลาด',
    art_prompt: 'อัศวินเกราะทองหม่นสนิมเขียว ช่องหมวกเรืองม่วง ปักดาบลงพื้นหินแตก พื้นหลังห้องโถงวิหารมีแสงลอดหน้าต่าง โทนทองหม่น-ม่วงเงา กรอบทอง' }),
  C({ id: 'card_aurex', no: 'AR-MVP', name_th: 'การ์ดออเร็กซ์', name_en: 'Aurex Card', monster: M('aurex', 'ออเร็กซ์ ราชันผู้พิทักษ์', 78, 'formless', 'holy', 'large', 'ancient_ruins'),
    slot: 'garment', rank: 'mvp', drop_rate: 0.02, role: 'boss', max_stack: 1, stackable: false, combo_id: 'cb_ruins',
    effects: [E('dmg_taken', -10, null, '%'), E('mdef', 15), E('heal_pct', 15, null, '%'), E('reduce_vs_element', 15, 'shadow', '%'), E('atk_pct', -8, null, '%'), E('matk_pct', -8, null, '%')],
    condition: 'ข้อเสีย: ATK และ MATK -8%', recommended_class: ['acolyte', 'swordsman'],
    flavor: 'ราชันผู้พิทักษ์มอบโล่แห่งแสงให้แก่ผู้ที่ยอมวางคมดาบลง',
    art_prompt: 'ผู้พิทักษ์ศิลาทองคำร่างใหญ่มีรัศมีวงแหวนอักขระหลังศีรษะ กางแขนปล่อยลำแสง พื้นหลังห้องบัลลังก์วิหารโบราณมีแสงสวรรค์ โทนทอง-ขาวงาช้าง กรอบแดงมงกุฎ' }),

  /* ---------------- Haunted Forest ---------------- */
  C({ id: 'card_haunt_spider', no: 'HF-01', name_th: 'การ์ดแมงมุมเงามายา', name_en: 'Phantom Spider Card', monster: M('haunt_spider', 'แมงมุมเงามายา', 76, 'insect', 'shadow', 'small', 'haunted_forest'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 3, combo_id: 'cb_night',
    effects: [E('lifesteal', 2, null, '%')], recommended_class: ['swordsman', 'archer'],
    flavor: 'ใยเงาดูดพลังชีวิตจากทุกบาดแผลที่มันฝากไว้',
    art_prompt: 'แมงมุมดำแปดตาเรืองม่วงห้อยจากใยเงา ใยเปล่งประกายเหมือนเส้นด้ายจันทร์ พื้นหลังป่ามืดหมอกม่วง โทนดำ-ม่วงเรือง' }),
  C({ id: 'card_hollow_wolf', no: 'HF-02', name_th: 'การ์ดหมาป่าราตรีกลวง', name_en: 'Hollow Wolf Card', monster: M('hollow_wolf', 'หมาป่าราตรีกลวง', 80, 'undead', 'shadow', 'medium', 'haunted_forest'),
    slot: 'shoes', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_night',
    effects: [E('stat', 4, 'agi')], recommended_class: ['archer', 'swordsman'],
    flavor: 'เสียงหอนของมันมาถึงก่อนตัวเสมอ และมันมาเร็วมาก',
    art_prompt: 'หมาป่าโครงกระดูกครึ่งตัวมีขนเงาควันลอย ดวงตาฟ้าซีด หอนใต้จันทร์เต็มดวง พื้นหลังต้นไม้แห้งบิดเบี้ยว โทนน้ำเงินเทา-ดำ' }),
  C({ id: 'card_mourning_shade', no: 'HF-03', name_th: 'การ์ดภูตคร่ำครวญ', name_en: 'Mourning Shade Card', monster: M('mourning_shade', 'ภูตคร่ำครวญ', 84, 'undead', 'shadow', 'medium', 'haunted_forest'),
    slot: 'garment', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 3, combo_id: 'cb_night',
    effects: [E('reduce_vs_element', 20, 'shadow', '%')], recommended_class: ['all'],
    flavor: 'ผ้าคลุมของวิญญาณที่ร่ำไห้ ดูดซับความมืดไว้แทนผู้สวมใส่',
    art_prompt: 'วิญญาณหญิงในผ้าคลุมขาดวิ่น ผมยาวปลิว มือปิดหน้าร่ำไห้ น้ำตาเรืองฟ้า พื้นหลังสุสานหมอกหนา โทนม่วงหม่น-ขาวซีด' }),
  C({ id: 'card_cursed_stag', no: 'HF-04', name_th: 'การ์ดกวางต้องสาป', name_en: 'Cursed Stag Card', monster: M('cursed_stag', 'กวางต้องสาป', 88, 'beast', 'shadow', 'large', 'haunted_forest'),
    slot: 'body', rank: 'normal', drop_rate: 0.004, role: 'boss', max_stack: 2, combo_id: 'cb_night',
    effects: [E('regen_pct', 40, null, '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'คำสาปทำให้มันตายไม่ได้ บาดแผลจึงสมานกลับทุกครั้ง',
    art_prompt: 'กวางดำเขาใหญ่แตกกิ่งเหมือนต้นไม้ตาย มีดวงไฟวิญญาณห้อยจากเขา ยืนในลำธารหมอก พื้นหลังป่าราตรีจันทร์แดง โทนเขียวหม่น-ดำ' }),
  C({ id: 'card_eclipse_reaper', no: 'HF-05', name_th: 'การ์ดยมทูตคราส', name_en: 'Eclipse Reaper Card', monster: M('eclipse_reaper', 'ยมทูตคราส', 94, 'demon', 'shadow', 'large', 'haunted_forest'),
    slot: 'weapon', rank: 'elite', drop_rate: 0.0015, role: 'build', max_stack: 2, combo_id: 'cb_night',
    effects: [E('crit', 6), E('crit_dmg', 15, null, '%')], recommended_class: ['swordsman', 'archer'],
    flavor: 'เคียวที่เกี่ยวเงาสุริยะ ฟันครั้งเดียวคือพิพากษา',
    art_prompt: 'ยมทูตผ้าคลุมดำถือเคียวยักษ์ใบรูปจันทร์เสี้ยว วงสุริยคราสเรืองหลังศีรษะ พื้นหลังท้องฟ้ามืดมีคราส โทนดำ-ส้มทองขอบคราส กรอบทอง' }),
  C({ id: 'card_bloodmoon_knight', no: 'HF-06', name_th: 'การ์ดอัศวินจันทร์โลหิต', name_en: 'Bloodmoon Knight Card', monster: M('bloodmoon_knight', 'อัศวินจันทร์โลหิต', 98, 'undead', 'shadow', 'large', 'haunted_forest'),
    slot: 'accessory', rank: 'elite', drop_rate: 0.0015, role: 'pvm', max_stack: 2, combo_id: 'cb_night',
    effects: [E('stat', 4, 'str'), E('dmg_vs_race', 15, 'undead', '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'อัศวินที่ล่าผีดิบจนกลายเป็นหนึ่งในนั้น',
    art_prompt: 'อัศวินเกราะดำขอบแดงถือดาบใหญ่ร่องเลือดเรือง ผ้าคลุมขาดปลิว ยืนบนเนินศพ จันทร์โลหิตด้านหลัง โทนแดงเลือด-ดำ กรอบทอง' }),
  C({ id: 'card_nocthar', no: 'HF-MVP', name_th: 'การ์ดน็อคธาร์', name_en: 'Nocthar Card', monster: M('nocthar', 'น็อคธาร์ จอมภูตจันทร์โลหิต', 99, 'demon', 'shadow', 'large', 'haunted_forest'),
    slot: 'accessory', rank: 'mvp', drop_rate: 0.02, role: 'build', max_stack: 1, stackable: false, combo_id: 'cb_night',
    effects: [E('atk_pct', 8, null, '%'), E('matk_pct', 8, null, '%'), E('crit', 8), E('crit_dmg', 20, null, '%'), E('dmg_vs_element', 15, 'holy', '%'), E('maxhp_pct', -12, null, '%')],
    condition: 'ข้อเสีย: MaxHP -12%', recommended_class: ['swordsman', 'mage', 'archer'],
    flavor: 'จอมภูตแห่งราตรีมอบคมเขี้ยวที่ไม่มีใครต้านได้ แลกกับเลือดของผู้ถือในทุกการต่อสู้',
    art_prompt: 'จอมภูตเขาโค้งนั่งบนบัลลังก์กระดูกในปราสาทดำ ยื่นมือเปล่งผลึกเลือดแตกกระจาย ปีกเงาแผ่ จันทร์โลหิตยักษ์ด้านหลัง โทนแดงทับทิม-ดำ-ทอง กรอบแดงมงกุฎ' }),
  /* ---------------- v0.46 Sunken Coast (Lv.100–117) ---------------- */
  C({ id: 'card_reef_crab', no: 'SC-01', name_th: 'การ์ดแครบปะการัง', name_en: 'Reef Crab Card', monster: M('reef_crab', 'แครบปะการัง', 100, 'beast', 'water', 'medium', 'sunken_coast'),
    slot: 'shield', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, combo_id: 'cb_tide', effects: [E('def', 10), E('reduce_vs_element', 10, 'water', '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'กระดองที่ทนแรงคลื่นมาหลายร้อยปี', art_prompt: 'ปูแดงตัวใหญ่ก้ามยักษ์ ปะการังชมพูงอกบนหลัง หาดทรายขาวน้ำทะเลใส กรอบเงิน' }),
  C({ id: 'card_shell_turtle', no: 'SC-02', name_th: 'การ์ดเต่ากระดองหอย', name_en: 'Shellback Turtle Card', monster: M('shell_turtle', 'เต่ากระดองหอย', 104, 'beast', 'water', 'large', 'sunken_coast'),
    slot: 'body', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, effects: [E('maxhp_pct', 8, null, '%'), E('stat', 3, 'vit')], recommended_class: ['all'],
    flavor: 'เต่าที่แบกบ้านหอยสังข์ไว้บนหลัง ไม่เคยรีบร้อน', art_prompt: 'เต่าทะเลกระดองโดมเขียวมีหอยสังข์บิดเกลียวบนหลัง กรอบเงิน' }),
  C({ id: 'card_abyss_jelly', no: 'SC-03', name_th: 'การ์ดแมงกะพรุนห้วงลึก', name_en: 'Abyss Jelly Card', monster: M('abyss_jelly', 'แมงกะพรุนห้วงลึก', 107, 'formless', 'water', 'small', 'sunken_coast'),
    slot: 'head', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_tide', effects: [E('stat', 4, 'int'), E('maxsp_pct', 8, null, '%')], recommended_class: ['mage', 'acolyte'],
    flavor: 'แสงม่วงในห้วงลึกที่ไม่มีวันมืด', art_prompt: 'แมงกะพรุนม่วงโปร่งแสงเรืองแสง หนวดยาวพลิ้วใต้ทะเลลึก กรอบเงิน' }),
  C({ id: 'card_drowned_knight', no: 'SC-04', name_th: 'การ์ดอัศวินจมทะเล', name_en: 'Drowned Knight Card', monster: M('drowned_knight', 'อัศวินจมทะเล', 111, 'undead', 'water', 'large', 'sunken_coast'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, effects: [E('stat', 4, 'str'), E('dmg_vs_race', 12, 'undead', '%')], recommended_class: ['swordsman', 'archer'],
    flavor: 'ยังเฝ้าเรือที่จมไปนานแล้ว', art_prompt: 'อัศวินเกราะเขียวคราบตะไคร่ยืนข้างซากเรือ กรอบเงิน' }),
  C({ id: 'card_siren_eel', no: 'SC-05', name_th: 'การ์ดไซเรนอีล', name_en: 'Siren Eel Card', monster: M('siren_eel', 'ไซเรนอีล', 114, 'beast', 'water', 'medium', 'sunken_coast'),
    slot: 'shoes', rank: 'elite', drop_rate: 0.0015, role: 'build', max_stack: 2, combo_id: 'cb_tide', effects: [E('stat', 5, 'agi'), E('flee', 14), E('aspd_pct', 5, null, '%')], recommended_class: ['archer', 'swordsman'],
    flavor: 'เร็วจนเห็นแค่แสงวาบในคลื่น', art_prompt: 'งูทะเลฟ้าครามครีบโปร่งพุ่งออกจากคลื่น กรอบทอง' }),
  C({ id: 'card_tidalos', no: 'SC-MVP', name_th: 'การ์ดไทดาลอส', name_en: 'Tidalos Card', monster: M('tidalos', 'ไทดาลอส ราชันย์คลื่น', 117, 'dragon', 'water', 'large', 'sunken_coast'),
    slot: 'garment', rank: 'mvp', drop_rate: 0.02, role: 'boss', max_stack: 1, stackable: false, combo_id: 'cb_tide', effects: [E('maxhp_pct', 15, null, '%'), E('reduce_vs_element', 20, 'water', '%'), E('regen_pct', 40, null, '%'), E('flee', -10)],
    condition: 'ข้อเสีย: FLEE -10', recommended_class: ['all'], flavor: 'ราชันย์แห่งคลื่นยอมให้พรผู้ที่รอดจากพายุ', art_prompt: 'งูทะเลยักษ์สวมมงกุฎทอง ยืดตัวกลางพายุคลื่น กรอบแดงมงกุฎ' }),
  /* ---------------- v0.46 Crystal Valley (Lv.118–134) ---------------- */
  C({ id: 'card_shard_beetle', no: 'CV-01', name_th: 'การ์ดด้วงผลึก', name_en: 'Shard Beetle Card', monster: M('shard_beetle', 'ด้วงผลึก', 118, 'insect', 'earth', 'small', 'crystal_valley'),
    slot: 'shoes', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, effects: [E('def', 8), E('mdef', 8)], recommended_class: ['all'],
    flavor: 'ปีกแข็งที่สะท้อนแสงเจ็ดสี', art_prompt: 'ด้วงกระดองผลึกฟ้าใส บนหินคริสตัล กรอบเงิน' }),
  C({ id: 'card_prism_golem', no: 'CV-02', name_th: 'การ์ดโกเลมปริซึม', name_en: 'Prism Golem Card', monster: M('prism_golem', 'โกเลมปริซึม', 121, 'formless', 'earth', 'large', 'crystal_valley'),
    slot: 'shield', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, combo_id: 'cb_prism', effects: [E('def', 14), E('maxhp_pct', 6, null, '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'ร่างผลึกที่หักแสงจนตามองไม่ทัน', art_prompt: 'โกเลมผลึกม่วงตัวใหญ่ กำปั้นผลึก ในหุบเขาคริสตัล กรอบเงิน' }),
  C({ id: 'card_geode_wolf', no: 'CV-03', name_th: 'การ์ดหมาป่าจีโอด', name_en: 'Geode Wolf Card', monster: M('geode_wolf', 'หมาป่าจีโอด', 125, 'beast', 'earth', 'medium', 'crystal_valley'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, effects: [E('stat', 4, 'str'), E('crit', 5)], recommended_class: ['swordsman', 'archer'],
    flavor: 'เขี้ยวที่มีผลึกม่วงซ่อนอยู่ข้างใน', art_prompt: 'หมาป่าขนม่วงหินจีโอดกลางหุบเขาผลึก กรอบเงิน' }),
  C({ id: 'card_crystal_drake', no: 'CV-04', name_th: 'การ์ดดราคผลึก', name_en: 'Crystal Drake Card', monster: M('crystal_drake', 'ดราคผลึก', 129, 'dragon', 'earth', 'medium', 'crystal_valley'),
    slot: 'accessory', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_prism', effects: [E('atk_pct', 4, null, '%'), E('matk_pct', 4, null, '%')], recommended_class: ['all'],
    flavor: 'มังกรน้อยที่โตจากผลึกในถ้ำลึก', art_prompt: 'มังกรสี่ขาฟ้าใส หนามผลึกตามหลัง ปีกโปร่ง กรอบเงิน' }),
  C({ id: 'card_prism_wisp', no: 'CV-05', name_th: 'การ์ดวิญญาณปริซึม', name_en: 'Prism Wisp Card', monster: M('prism_wisp', 'วิญญาณปริซึม', 132, 'formless', 'holy', 'medium', 'crystal_valley'),
    slot: 'head', rank: 'elite', drop_rate: 0.0015, role: 'build', max_stack: 2, combo_id: 'cb_prism', effects: [E('stat', 6, 'int'), E('cast_pct', -8, null, '%'), E('matk_pct', 5, null, '%')], recommended_class: ['mage', 'acolyte'],
    flavor: 'วิญญาณที่หลงอยู่ในแสงเจ็ดสี', art_prompt: 'ภูตผ้าคลุมชมพูเรืองแสงในม่านแสงรุ้ง กรอบทอง' }),
  C({ id: 'card_crysthar', no: 'CV-MVP', name_th: 'การ์ดคริสธาร์', name_en: 'Crysthar Card', monster: M('crysthar', 'คริสธาร์ มังกรผลึก', 134, 'dragon', 'earth', 'large', 'crystal_valley'),
    slot: 'weapon', rank: 'mvp', drop_rate: 0.02, role: 'boss', max_stack: 1, stackable: false, combo_id: 'cb_prism', effects: [E('atk_pct', 10, null, '%'), E('matk_pct', 10, null, '%'), E('dmg_vs_race', 15, 'dragon', '%'), E('def', -15)],
    condition: 'ข้อเสีย: DEF -15', recommended_class: ['all'], flavor: 'หัวใจผลึกของมังกรเพิ่มพลังให้ทุกการโจมตี', art_prompt: 'มังกรผลึกยักษ์กางปีกบนยอดผลึก แสงรุ้งแตกกระจาย กรอบแดงมงกุฎ' }),
  /* ---------------- v0.46 Sky Citadel (Lv.135–150) ---------------- */
  C({ id: 'card_cloud_sentinel', no: 'SK-01', name_th: 'การ์ดผู้พิทักษ์เมฆา', name_en: 'Cloud Sentinel Card', monster: M('cloud_sentinel', 'ผู้พิทักษ์เมฆา', 136, 'formless', 'wind', 'large', 'sky_citadel'),
    slot: 'body', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, effects: [E('def', 12), E('stat', 4, 'vit')], recommended_class: ['all'],
    flavor: 'ยามศิลาที่ยืนบนเมฆมาก่อนประวัติศาสตร์', art_prompt: 'ยามศิลาขาวยืนบนสะพานเมฆ กรอบเงิน' }),
  C({ id: 'card_storm_griffin', no: 'SK-02', name_th: 'การ์ดกริฟฟินพายุ', name_en: 'Storm Griffin Card', monster: M('storm_griffin', 'กริฟฟินพายุ', 139, 'beast', 'wind', 'large', 'sky_citadel'),
    slot: 'garment', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, combo_id: 'cb_sky', effects: [E('flee', 16), E('speed_pct', 5, null, '%')], recommended_class: ['archer', 'swordsman'],
    flavor: 'ขนปีกที่เรียกลมได้ด้วยการกระพือครั้งเดียว', art_prompt: 'กริฟฟินหัวอินทรีตัวสิงโตกางปีกกลางพายุ กรอบเงิน' }),
  C({ id: 'card_seraph_knight', no: 'SK-03', name_th: 'การ์ดอัศวินเซราฟ', name_en: 'Seraph Knight Card', monster: M('seraph_knight', 'อัศวินเซราฟ', 143, 'formless', 'holy', 'medium', 'sky_citadel'),
    slot: 'weapon', rank: 'normal', drop_rate: 0.004, role: 'pvm', max_stack: 2, combo_id: 'cb_sky', effects: [E('stat', 4, 'dex'), E('dmg_vs_element', 12, 'shadow', '%')], recommended_class: ['all'],
    flavor: 'หอกแสงที่ไม่เคยพลาดเป้า', art_prompt: 'อัศวินเกราะขาวปีกขนนกถือหอกแสง วงรัศมี กรอบเงิน' }),
  C({ id: 'card_tempest_shade', no: 'SK-04', name_th: 'การ์ดวิญญาณพายุ', name_en: 'Tempest Shade Card', monster: M('tempest_shade', 'วิญญาณพายุ', 146, 'formless', 'wind', 'medium', 'sky_citadel'),
    slot: 'accessory', rank: 'normal', drop_rate: 0.004, role: 'build', max_stack: 2, effects: [E('stat', 4, 'int'), E('stat', 3, 'dex')], recommended_class: ['mage', 'acolyte'],
    flavor: 'เสียงฟ้าร้องที่ไร้ร่าง', art_prompt: 'ภูตผ้าคลุมฟ้าในเมฆพายุสายฟ้า กรอบเงิน' }),
  C({ id: 'card_celestial_titan', no: 'SK-05', name_th: 'การ์ดไททันสวรรค์', name_en: 'Celestial Titan Card', monster: M('celestial_titan', 'ไททันสวรรค์', 149, 'formless', 'holy', 'large', 'sky_citadel'),
    slot: 'shield', rank: 'elite', drop_rate: 0.0015, role: 'pvm', max_stack: 2, combo_id: 'cb_sky', effects: [E('def', 18), E('mdef', 12), E('dmg_taken', -5, null, '%')], recommended_class: ['swordsman', 'acolyte'],
    flavor: 'ยักษ์ผู้แบกฟ้าไว้บนบ่า', art_prompt: 'ยักษ์ศิลาทองขนาดมหึมายืนแบกปราสาทลอยฟ้า กรอบทอง' }),
  C({ id: 'card_aurelion', no: 'SK-MVP', name_th: 'การ์ดออเรลิออน', name_en: 'Aurelion Card', monster: M('aurelion', 'ออเรลิออน เทพบุตรสวรรค์', 150, 'formless', 'holy', 'large', 'sky_citadel'),
    slot: 'accessory', rank: 'mvp', drop_rate: 0.02, role: 'boss', max_stack: 1, stackable: false, combo_id: 'cb_sky', effects: [E('stat', 6, 'all'), E('exp_pct', 10, null, '%'), E('maxhp_pct', 8, null, '%'), E('maxsp_pct', -10, null, '%')],
    condition: 'ข้อเสีย: MaxSP -10%', recommended_class: ['all'], flavor: 'พรสุดท้ายจากเทพบุตรแห่งฟากฟ้า', art_prompt: 'เทพบุตรเกราะทองปีกสี่ปีกวงรัศมีสองชั้น ลอยเหนือปราสาทในเมฆ แสงทองส่อง กรอบแดงมงกุฎ' }),
];

export const CARD_COMBOS = [
  { combo_id: 'cb_origin', name_th: 'ต้นกำเนิดแห่งทุ่ง', name_en: 'Field Origins', cards: ['card_bloblet', 'card_capling', 'card_stinglet'],
    bonus: [E('exp_pct', 5, null, '%'), E('stat', 1, 'all')], note: 'คอมโบต้นเกมที่ยังให้ EXP เพิ่มตลอดเกม' },
  { combo_id: 'cb_grove', name_th: 'พันธสัญญาพงไพร', name_en: 'Pact of the Grove', cards: ['card_thornback', 'card_wisp', 'card_barkwolf', 'card_gnarlroot'],
    bonus: [E('maxhp_pct', 5, null, '%'), E('regen_pct', 30, null, '%'), E('aspd_pct', 8, null, '%')], note: 'ล้างข้อเสียความเร็วโจมตีของกนาร์ลรูท' },
  { combo_id: 'cb_frost', name_th: 'ราชสำนักน้ำแข็ง', name_en: 'Frost Court', cards: ['card_frostbat', 'card_icegolem', 'card_glacia'],
    bonus: [E('maxhp_pct', 10, null, '%'), E('reduce_vs_element', 10, 'water', '%'), E('matk_pct', 4, null, '%')], note: 'คืน MaxHP ที่กลาเซียหักไป' },
  { combo_id: 'cb_flame', name_th: 'เกล็ดมังกรเพลิง', name_en: 'Dragonfire Scales', cards: ['card_magmaslime', 'card_salamander', 'card_ignarok'],
    bonus: [E('dmg_taken', -6, null, '%'), E('crit_dmg', 10, null, '%')], note: 'ลดข้อเสียรับดาเมจของอิกนารอกเหลือ +4%' },
  { combo_id: 'cb_ruins', name_th: 'ผู้พิทักษ์วิหารโบราณ', name_en: 'Temple Wardens', cards: ['card_rune_sentinel', 'card_relic_knight', 'card_aurex'],
    bonus: [E('atk_pct', 5, null, '%'), E('matk_pct', 5, null, '%'), E('def', 8)], note: 'ชดเชย ATK/MATK ที่ออเร็กซ์หักไปบางส่วน' },
  { combo_id: 'cb_night', name_th: 'ราตรีจันทร์โลหิต', name_en: 'Bloodmoon Night', cards: ['card_haunt_spider', 'card_eclipse_reaper', 'card_bloodmoon_knight', 'card_nocthar'],
    bonus: [E('lifesteal', 2, null, '%'), E('maxhp_pct', 6, null, '%'), E('crit', 3)], note: 'ดูดเลือดรวมสูงสุดของบิลด์นี้ถูกจำกัดที่ 8%' },
  { combo_id: 'cb_tide', name_th: 'บุตรแห่งกระแสน้ำ', name_en: 'Children of the Tide', cards: ['card_reef_crab', 'card_abyss_jelly', 'card_siren_eel', 'card_tidalos'],
    bonus: [E('flee', 10), E('maxsp_pct', 6, null, '%'), E('regen_pct', 20, null, '%')], note: 'คืน FLEE ที่ไทดาลอสหักไป' },
  { combo_id: 'cb_prism', name_th: 'หัวใจปริซึม', name_en: 'Prism Heart', cards: ['card_prism_golem', 'card_crystal_drake', 'card_prism_wisp', 'card_crysthar'],
    bonus: [E('def', 15), E('atk_pct', 4, null, '%'), E('matk_pct', 4, null, '%')], note: 'คืน DEF ที่คริสธาร์หักไป' },
  { combo_id: 'cb_sky', name_th: 'ราชสำนักฟากฟ้า', name_en: 'Court of the Sky', cards: ['card_storm_griffin', 'card_seraph_knight', 'card_celestial_titan', 'card_aurelion'],
    bonus: [E('maxsp_pct', 10, null, '%'), E('stat', 3, 'all'), E('crit_dmg', 10, null, '%')], note: 'คืน MaxSP ที่ออเรลิออนหักไป' },
];

// ---------- แปลง effect → คีย์โบนัสในเกม และข้อความไทย ----------
const KEY = {
  atk_pct: 'atkPct', matk_pct: 'matkPct', crit_dmg: 'critDmgPct', maxhp_pct: 'maxHpPct', maxsp_pct: 'maxSpPct', aspd_pct: 'aspdPct', cast_pct: 'castPct',
  heal_pct: 'healPct', regen_pct: 'regenPct', speed_pct: 'speedPct', lifesteal: 'lifesteal', flee: 'flee', def: 'def', mdef: 'mdef', hit: 'hit',
  exp_pct: 'expPct', drop_pct: 'dropPct', sp_on_kill: 'spKill',
};
export function toBonus(effects, n = 1, out = {}) {
  const add = (k, v) => { out[k] = +(((out[k] || 0) + v * n).toFixed(4)); };
  for (const e of effects) {
    if (e.type === 'stat') { if (e.target === 'all') for (const s of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) add(s, e.value); else add(e.target, e.value); }
    else if (e.type === 'crit') add('crit', e.value / 100);
    else if (e.type === 'dmg_vs_race' || e.type === 'dmg_vs_element' || e.type === 'dmg_vs_size') add('vs_' + e.target, e.value);
    else if (e.type === 'reduce_vs_race' || e.type === 'reduce_vs_element' || e.type === 'reduce_vs_size') add('red_' + e.target, e.value);
    else if (e.type === 'dmg_taken') add('dmgReduce', -e.value);
    else if (KEY[e.type]) add(KEY[e.type], e.value);
  }
  return out;
}
const sg = (v) => (v > 0 ? '+' : '') + v;
export function effectText(e) {
  const t = TR[e.target] || e.target;
  switch (e.type) {
    case 'stat': return (e.target === 'all' ? 'ทุกสเตตัส' : e.target.toUpperCase()) + ' ' + sg(e.value);
    case 'atk_pct': return 'ATK ' + sg(e.value) + '%';
    case 'matk_pct': return 'MATK ' + sg(e.value) + '%';
    case 'crit': return 'CRIT ' + sg(e.value);
    case 'crit_dmg': return 'คริดาเมจ ' + sg(e.value) + '%';
    case 'dmg_vs_race': return `ดาเมจต่อเผ่า${t} ${sg(e.value)}%`;
    case 'dmg_vs_element': return `ดาเมจต่อธาตุ${t} ${sg(e.value)}%`;
    case 'dmg_vs_size': return `ดาเมจต่อขนาด${t} ${sg(e.value)}%`;
    case 'reduce_vs_race': return `ลดดาเมจจากเผ่า${t} ${e.value}%`;
    case 'reduce_vs_element': return `ลดดาเมจธาตุ${t} ${e.value}%`;
    case 'reduce_vs_size': return `ลดดาเมจจากขนาด${t} ${e.value}%`;
    case 'dmg_taken': return e.value < 0 ? `ลดดาเมจที่ได้รับ ${-e.value}%` : `รับดาเมจเพิ่ม +${e.value}%`;
    case 'maxhp_pct': return 'MaxHP ' + sg(e.value) + '%';
    case 'maxsp_pct': return 'MaxSP ' + sg(e.value) + '%';
    case 'aspd_pct': return 'ความเร็วโจมตี ' + sg(e.value) + '%';
    case 'cast_pct': return 'ร่ายเร็วขึ้น ' + e.value + '%';
    case 'heal_pct': return 'พลังฮีล ' + sg(e.value) + '%';
    case 'regen_pct': return 'ฟื้น HP ' + sg(e.value) + '%';
    case 'speed_pct': return 'ความเร็วเดิน ' + sg(e.value) + '%';
    case 'lifesteal': return 'ดูดเลือด ' + e.value + '% ของดาเมจ';
    case 'flee': return 'FLEE ' + sg(e.value);
    case 'def': return 'DEF ' + sg(e.value);
    case 'mdef': return 'MDEF ' + sg(e.value);
    case 'hit': return 'HIT ' + sg(e.value);
    case 'exp_pct': return 'EXP ที่ได้รับ ' + sg(e.value) + '%';
    case 'drop_pct': return 'โอกาสดรอปไอเทม ' + sg(e.value) + '%';
    case 'sp_on_kill': return 'กำจัดมอนสเตอร์ ฟื้น SP ' + e.value;
    default: return e.type + ' ' + e.value;
  }
}
export const isDrawback = (e) => e.value < 0 ? e.type !== 'dmg_taken' : e.type === 'dmg_taken';
export const CARD_BY_ID = Object.fromEntries(CARD_CATALOG.map((c) => [c.id, c]));
export const traitTH = (k) => TR[k] || k;
