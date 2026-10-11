// Visual progression is independent of combat stats and existing save IDs.
export const DESIGN_GRADES=['common','uncommon','rare','epic','legend','mythic','celestial'];
export const DESIGN_THEMES=[
 {name:'นักเดินทาง',metal:'#b9c0c7',cloth:'#56766b',dark:'#654935',gem:'#d9e2c9'},
 {name:'พงไพร',metal:'#b5cf94',cloth:'#426944',dark:'#503e2a',gem:'#98ef8e'},
 {name:'ธารน้ำแข็ง',metal:'#bde4f1',cloth:'#456c9b',dark:'#273d61',gem:'#77efff'},
 {name:'เตาหลอมเพลิง',metal:'#db9060',cloth:'#913f35',dark:'#37283d',gem:'#ffb14d'},
 {name:'อาณาจักรรูน',metal:'#d7c399',cloth:'#605580',dark:'#302b4e',gem:'#ab9cff'},
 {name:'วิญญาณจันทรา',metal:'#abd2dc',cloth:'#365e68',dark:'#273d46',gem:'#8ffff1'},
 {name:'จันทร์โลหิต',metal:'#e4c281',cloth:'#85324a',dark:'#302439',gem:'#ff607e'}
];
export const levelBand=level=>level<10?0:level<25?1:level<40?2:level<60?3:level<75?4:level<90?5:6;
export function equipmentDesign(id,item){
 const base=String(id).split('*')[0];let h=0;for(const c of base)h=(h*31+c.charCodeAt(0))>>>0;
 const band=levelBand(item.reqLevel||0),rank=Math.max(0,DESIGN_GRADES.indexOf(item.rarity||'common'));
 return {id:base,kind:item.icon?.[0],slot:item.slot,type:item.wtype||item.slot,band,rank,variant:h%3,theme:DESIGN_THEMES[band],level:item.reqLevel||1};
}
