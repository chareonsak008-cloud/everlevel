// v0.25.2: ของมือรองตามอาชีพ — ช่อง "shield" เดิม (เซฟเดิมใช้ได้) แต่แต่ละสายใส่ของต่างกัน
//   สายดาบ = โล่ · สายธนู = ซองลูกธนู · สายฮีล = สมุดเวท · สายเวท = ลูกแก้วเวท
const T = [
  // [ระดับ, เลเวล, เกรด, ตัวคูณ, ชื่อธีม, สี1, สี2, สีเรือง, ดรอป [[มอน, โอกาส]]]
  ['a', 1, 'common', 1, 'ผู้ฝึกหัด', '#a8794a', '#5e3f27', '#ffe9a8', [['capling', 0.02], ['bloblet', 0.015]]],
  ['b', 12, 'uncommon', 1.15, 'พงไพร', '#7aa85a', '#3a5a2a', '#9cff6a', [['wisp', 0.012], ['barkwolf', 0.01]]],
  ['c', 28, 'rare', 1.35, 'ธารน้ำแข็ง', '#bfe8ff', '#3a5a8a', '#7fe0ff', [['frostbat', 0.006], ['yeti', 0.005]]],
  ['d', 45, 'epic', 1.6, 'ถ่านเพลิง', '#ff9a5a', '#4a2a2a', '#ff7a2a', [['magmaslime', 0.003], ['emberimp', 0.0025]]],
  ['e', 62, 'legend', 1.8, 'รูนโบราณ', '#e8d8a8', '#4a3a6a', '#ab9cff', [['sand_basilisk', 0.0015], ['rune_sentinel', 0.0012]]],
  ['f', 80, 'mythic', 2.0, 'จันทร์นิรันดร์', '#cfe8f4', '#2a3a4a', '#8ffff1', [['ignarok', 0.009], ['hollow_wolf', 0.0003]]],
  ['g', 95, 'celestial', 2.5, 'จันทร์โลหิต', '#ffb0bc', '#2a1424', '#ff3a5a', [['nocthar', 0.001], ['aurex', 0.0005]]],
];
const KIND = {
  quiver: { job: 'archer', name: 'ซองลูกธนู', en: 'Quiver', shapes: ['strap', 'feather', 'crystal', 'ember', 'rune', 'moon', 'blood'],
    stat: (L, m) => ({ def: Math.round(1 + L * 0.08 * m), atk: Math.round((2 + L * 0.18) * m), dex: Math.round((1 + L / 20) * m), ...(L >= 28 ? { rangedPct: Math.round(1 + L / 30 * m) } : {}), ...(L >= 45 ? { critDmgPct: Math.round(L / 16 * m) } : {}), ...(L >= 80 ? { aspdPct: 3 } : {}) }),
    desc: (n) => `ซองลูกธนู${n} คาดหลังเฉียงไหล่ ดึงลูกธนูได้เร็ว` },
  tome: { job: 'acolyte', name: 'สมุดเวท', en: 'Prayer Tome', shapes: ['hymnal', 'codex', 'tome', 'tome', 'grimoire', 'grimoire', 'grimoire'],
    stat: (L, m) => ({ def: Math.round(1 + L * 0.06 * m), mdef: Math.round(1 + L * 0.1 * m), int: Math.round((1 + L / 20) * m), healPct: Math.round((2 + L / 22) * m), ...(L >= 28 ? { spRegenPct: Math.round((5 + L / 8) * m) } : {}), ...(L >= 62 ? { delayPct: Math.round(L / 30 * m) } : {}) }),
    desc: (n) => `สมุดเวท${n} ลอยอยู่ข้างไหล่ พลิกหน้าบทสวดให้เอง` },
  orbOff: { job: 'mage', name: 'ลูกแก้วเวท', en: 'Arcane Orb', shapes: ['bubble', 'wisp', 'bubble', 'sandstorm', 'wisp', 'galaxy', 'galaxy'],
    stat: (L, m) => ({ mdef: Math.round(1 + L * 0.1 * m), matk: Math.round((3 + L * 0.2) * m), int: Math.round((1 + L / 20) * m), ...(L >= 28 ? { maxSpPct: Math.round((2 + L / 30) * m) } : {}), ...(L >= 45 ? { castPct: Math.round(L / 22 * m) } : {}) }),
    desc: (n) => `ลูกแก้วเวท${n} ลอยวนรอบมือ รวมพลังเวทให้คม` },
};
const PREFIX = { quiver: 'qv', tome: 'tm', orbOff: 'ob' };
export const OFFHAND_ITEMS = {};
export const OFFHAND_DROPS = [];
for (const [form, K] of Object.entries(KIND)) {
  T.forEach(([tier, L, rarity, m, theme, c1, c2, glow, drops], i) => {
    const id = `${PREFIX[form]}_${tier}`;
    const theme2 = i === 0 ? '' : theme;
    OFFHAND_ITEMS[id] = {
      name: `${K.name}${theme2}`, en: K.en, type: 'equip', slot: 'shield', jobs: [K.job], offhand: form,
      icon: ['shield', c1, c2], look: { form, shape: K.shapes[i], c1: form === 'tome' && i === 0 ? '#8a5a32' : c1, c2, glow },
      bonus: K.stat(L, m), reqLevel: L, rarity, slots: rarity === 'celestial' ? 2 : 1,
      price: Math.round((60 + L * L * 9) * m), desc: K.desc(theme2 ? theme2 : 'มือใหม่'),
    };
    for (const [mob, rate] of drops) OFFHAND_DROPS.push([mob, id, rate]);
  });
}
export const OFFHAND_BLOODMOON = ['qv_g', 'tm_g', 'ob_g'];
export const OFFHAND_FORM_TH = { quiver: 'ซองลูกธนู', tome: 'สมุดเวท', orbOff: 'ลูกแก้วเวท' };
