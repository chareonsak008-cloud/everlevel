// v0.24 — cosmetics only; the existing fashion boxes and saves own acquisition.
export const FASHION_THEMES = [
  { key:'dragon', name:'อัศวินมังกรทมิฬ', en:'Obsidian Dragon', color:'#252330', trim:'#b64a49', glow:'#ff654d', rarity:'mythic' },
  { key:'lunar', name:'จอมเวทจันทรา', en:'Lunar Arcanist', color:'#443366', trim:'#c4b9e7', glow:'#bd8bff', rarity:'legend' },
  { key:'raven', name:'นักล่าอีกาเงา', en:'Raven Warden', color:'#233139', trim:'#639593', glow:'#6fe0d2', rarity:'legend' },
  { key:'celestial', name:'ผู้พิทักษ์สวรรค์', en:'Celestial Guardian', color:'#e7e3d5', trim:'#cca453', glow:'#fff0a3', rarity:'celestial' },
];
export const FASHION_COLLECTION = FASHION_THEMES.flatMap(t => [
  ['outfit','เกราะและชุด','Rig-bound armor'], ['head','เครื่องประดับศีรษะ','Headpiece'],
  [(t.key==='dragon'||t.key==='celestial')?'wings':'back','ประดับหลัง','Animated back ornament'],
].map(([slot,label,en]) => ({ id:`f24_${t.key}_${slot}`, slot, kind:'fashion24', name:`${t.name} · ${label}`, en:`${t.en} ${en}`, rarity:t.rarity,
  desc:'แฟชั่นทับอุปกรณ์ ไม่เพิ่มค่าสถานะ ขยับตามโครงตัวละคร พร้อมประดับหลังเคลื่อนไหว', p:{...t,look:{tunic:t.color,pants:t.color,boot:t.color,belt:t.trim,scarf:null}}, tight:slot==='head' })));
export const FASHION_SETS = FASHION_THEMES.map(t => ({id:`s_f24_${t.key}`, name:t.name, en:t.en, rarity:t.rarity, batch:4,
  desc:'คอลเลกชันใหม่ v0.24 · ชุด ศีรษะ และประดับหลังเคลื่อนไหว',items:['outfit','head',(t.key==='dragon'||t.key==='celestial')?'wings':'back'].map(slot=>`f24_${t.key}_${slot}`)}));
