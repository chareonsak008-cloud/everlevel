// Visual progression is independent of combat stats and existing save IDs.
// v0.25: แต่ละชิ้นมี "ทรง" ของตัวเอง (form + shape) และสีของตัวเอง — ไม่ได้เปลี่ยนแค่ตามเลเวล/เกรด
export const DESIGN_GRADES=['common','uncommon','rare','epic','legend','mythic','celestial','abyssal','divine'];
export const DESIGN_THEMES=[
 {name:'นักเดินทาง',metal:'#b9c0c7',cloth:'#56766b',dark:'#654935',gem:'#d9e2c9'},
 {name:'พงไพร',metal:'#b5cf94',cloth:'#426944',dark:'#503e2a',gem:'#98ef8e'},
 {name:'ธารน้ำแข็ง',metal:'#bde4f1',cloth:'#456c9b',dark:'#273d61',gem:'#77efff'},
 {name:'เตาหลอมเพลิง',metal:'#db9060',cloth:'#913f35',dark:'#37283d',gem:'#ffb14d'},
 {name:'อาณาจักรรูน',metal:'#d7c399',cloth:'#605580',dark:'#302b4e',gem:'#ab9cff'},
 {name:'วิญญาณจันทรา',metal:'#abd2dc',cloth:'#365e68',dark:'#273d46',gem:'#8ffff1'},
 {name:'จันทร์โลหิต',metal:'#e4c281',cloth:'#85324a',dark:'#302439',gem:'#ff607e'},
 {name:'ห้วงสมุทร',metal:'#9ef2e6',cloth:'#1f6a78',dark:'#123a4a',gem:'#3fe6d0'},   // v0.46 Lv.100–124
 {name:'เทพสวรรค์',metal:'#fff3d0',cloth:'#e8d8a8',dark:'#6a5a3a',gem:'#ffffff'}    // v0.46 Lv.125+
];
export const levelBand=level=>level<10?0:level<25?1:level<40?2:level<60?3:level<75?4:level<90?5:level<100?6:level<125?7:8;

// ทรงที่มีให้เลือกในแต่ละประเภท (ของเก่าที่ไม่ได้กำหนด look จะเลือกจากคีย์เวิร์ดในชื่อ แล้วสุ่มตาม id)
export const SHAPES={
 sword_1h:['leaf','saber','rapier','broad','jagged','flame','crescent'], sword_2h:['cleaver','jagged','flame','crescent'], spear:['pike','fang','glaive','halberd'],
 knife:['dagger','kris','tanto','fang'],
 rod:['twig','mushroom','icicle','star'], staff:['crook','roots','maw','crescent','orbcage'], orb:['bubble','wisp','sandstorm','galaxy'],
 mace:['cudgel','bell','maul','morningstar','flanged'], scepter:['candle','lotus','plume','seraph'], book:['hymnal','codex','tome','grimoire'],
 shortbow:['simple','wing','crescent','hawk'], longbow:['ranger','antler','feather','eclipse'], crossbow:['plank','fang','cog','star'],
 body:['tunic','vest','robe','scale','plate','coat'], head:['hood','cap','helm','circlet','horned','crown'], garment:['cloak','mantle','tattered','scarf','feather'],
 shoes:['sandal','boot','greave','winged','fur'], shield:['round','heater','kite','tower','buckler'], accessory:['ring','band','signet','pendant'],
};
const KEYS=[
 [/frost|ice|icicle|glac|yeti|snow/,{sword_1h:'jagged',knife:'kris',staff:'orbcage',mace:'flanged',shortbow:'crescent',body:'coat',head:'circlet',garment:'mantle',shoes:'fur',shield:'kite',accessory:'pendant'}],
 [/flame|inferno|cinder|magma|ember|phoenix|obsidian|dragon/,{sword_1h:'flame',knife:'kris',staff:'maw',mace:'morningstar',shortbow:'hawk',body:'scale',head:'horned',garment:'tattered',shoes:'greave',shield:'tower',accessory:'signet'}],
 [/root|heart|sylvan|oak|gnarl|bark|thorn|leaf|clover/,{sword_1h:'leaf',knife:'fang',staff:'roots',mace:'cudgel',shortbow:'simple',body:'vest',head:'crown',garment:'cloak',shoes:'boot',shield:'round',accessory:'band'}],
 [/spectral|moonveil|bloodmoon|shade|dread|spirit/,{sword_1h:'crescent',knife:'tanto',staff:'crescent',mace:'flanged',shortbow:'crescent',body:'robe',head:'hood',garment:'feather',shoes:'winged',shield:'kite',accessory:'pendant'}],
 [/astral|star/,{sword_1h:'rapier',knife:'dagger',staff:'orbcage',mace:'bell',shortbow:'hawk',body:'robe',head:'circlet',garment:'feather',shoes:'winged',shield:'heater',accessory:'signet'}],
 [/relic|runic|guardian|ruin|iron|knight/,{sword_1h:'broad',knife:'dagger',staff:'crook',mace:'maul',shortbow:'simple',body:'plate',head:'helm',garment:'mantle',shoes:'greave',shield:'tower',accessory:'band'}],
 [/fang|wolf|hunter/,{sword_1h:'saber',knife:'fang',shortbow:'simple',body:'vest',head:'cap',garment:'scarf',shoes:'boot',shield:'buckler'}],
 [/cotton|leather|traveler|sandal|trainee|cutter|chapel|wisp|jelly|bee/,{sword_1h:'saber',knife:'dagger',staff:'crook',mace:'bell',body:'tunic',head:'cap',garment:'scarf',shoes:'sandal',shield:'buckler',accessory:'ring'}],
];
const FORM_OF={sword:'sword_1h',knife:'knife',staff:'staff',mace:'mace',bow:'shortbow'};
export function equipmentDesign(id,item){
 const base=String(id).split('*')[0];let h=0;for(const c of base)h=(h*31+c.charCodeAt(0))>>>0;
 const band=levelBand(item.reqLevel||0),rank=Math.max(0,DESIGN_GRADES.indexOf(item.rarity||'common'));
 const look=item.look||{};
 const form=look.form||(item.slot==='weapon'?FORM_OF[item.wtype]||'knife':item.slot);
 let shape=look.shape;
 if(!shape){for(const [re,m] of KEYS)if(re.test(base)&&m[form]){shape=m[form];break;}}
 const list=SHAPES[form]||['x'];if(!shape)shape=list[h%list.length];
 const t=DESIGN_THEMES[band],ic=item.icon||[];
 const c1=look.c1||ic[1]||t.metal,c2=look.c2||ic[2]||t.dark,glow=look.glow||t.gem;
 return {id:base,kind:ic[0],slot:item.slot,type:item.wtype||item.slot,form,shape,c1,c2,glow,element:item.element,twoHand:!!item.twoHand,band,rank,variant:h%3,theme:t,level:item.reqLevel||1};
}
