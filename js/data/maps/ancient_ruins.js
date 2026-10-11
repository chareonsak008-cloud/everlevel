// Ancient Ruins Lv.60–75; broad, connected lanes with a safe western camp.
import { borderTrees, scatterTrees } from './helpers.js';
const W=76,H=60;
const lanes=[[0,28,W,4],[14,6,4,48],[38,8,4,44],[56,8,4,43],[14,8,48,4],[14,48,50,4]];
const camp=[2,24,10,14],arena=[51,12,18,15];
const look={hair:'#d7c5a0',skin:'#e8bd99',eye:'#32534d',tunic:'#5a8275',pants:'#423e45',boot:'#2a2a34',hairStyle:'short',accessory:'wizard',hatColor:'#405d53',orbColor:'#8addc9',weapon:'staff'};
export const ANCIENT_RUINS={
 id:'ancient_ruins',name:'Ancient Ruins',subtitle:'ซากอารยธรรมอักขระ · Lv.60–75 · MVP ออเร็กซ์ Lv.78',levelRange:[60,75],width:W,height:H,fill:'GRASS',spawn:{x:5.5,y:29.5},music:'ruins',
 theme:{fog:'#71817b',fogNear:25,fogFar:70,outer:'#27382f',light:{hemi:.8,sky:'#dce8d2',ground:'#384936',sun:1.1,sunColor:'#ffe4b0',exposure:1.03},grass:{base:'#79835d',blobs:['#68754e','#89966c','#76815b'],blades:['#9caa76','#6c7e52','#b0b48c'],litter:['#cfba87','#d9d1ac','#ac956b']},dirt:{base:'#a99e84',blobs:['#b5aa91','#978e76','#c0b59a'],pebble:'#7e7e71',cracks:'#79745d'},trees:'normal',tufts:true,flowers:['#d6c499','#91dbcb','#a8c57b'],motes:'#8fe6db',moteCount:75,moteSize:.05,fx:{gain:.8,glow:.75,flash:.8},mini:{grass:'#76815b',dirt:'#b3a787',water:'#538e91',flowers:'#92c9b2',bridge:'#9a8a6b'}},
 regions:[...lanes.map(rect=>({tile:'DIRT',rect})),{tile:'DIRT',rect:camp},{tile:'DIRT',rect:arena},{tile:'WATER',rect:[25,17,8,7]},{tile:'WATER',rect:[44,38,7,6]},{tile:'FLOWERS',rect:[20,38,4,3]},{tile:'FLOWERS',rect:[64,35,4,3]}],
 objects:[{kind:'tent',x:3,y:25,color:'#617b66'},{kind:'campfire',x:8,y:34},{kind:'warpstone',x:4,y:35,color:'#8de6d5'},{kind:'sign',x:11,y:27,text:'Ancient Ruins · Lv.60–75'},{kind:'sign',x:68,y:27,text:'Haunted Forest ➜ Lv.75–99'},{kind:'sign',x:51,y:27,text:'⚠ ออเร็กซ์ MVP Lv.78'},
 ...[[21,12],[29,12],[45,14],[50,18],[66,18],[50,23],[66,23],[21,42],[32,43],[61,42]].map(([x,y],i)=>({kind:'pillar',x,y,seed:700+i})),
 {kind:'chest',x:65,y:14},{kind:'bones',x:25,y:35},{kind:'boulder',x:32,y:8,w:2},
 ...scatterTrees(W,H,48,[...lanes,camp,arena,[24,16,10,9],[43,37,9,8],[24,34,5,5]],73119,3,.1),
 ...borderTrees(W,H,2,[{x0:0,x1:2,y0:27,y1:33},{x0:73,x1:75,y0:27,y1:33}],3917,.55)],
 npcs:[{id:'lyra',name:'ไลรา',title:'นักสำรวจซากโบราณ',x:8,y:27,dir:'down',look,service:{type:'warp',routes:'ancient'},greet:'ถ้าเจ้าเลเวล 60 แล้ว เริ่มจากสคารับแถวใต้ค่าย! ออเร็กซ์อยู่ลานเสาทางตะวันออก',lines:['ยามศิลาแข็ง แต่ทนเวทย์น้อยกว่าวิสป์ดารา','ป่าวิญญาณอยู่ปลายทางด้านตะวันออก · เขตลึกมีมอน Lv.94–98']},
 {id:'ruin_supply',name:'มีรา',title:'เสบียงนักสำรวจ',x:7,y:32,dir:'down',look:{...look,tunic:'#9b7854',accessory:'clerk'},service:{type:'shop',shop:'endgame'},greet:'ยาขาว ยามานา และใบกลับเมืองพร้อมแล้ว'}],
 portals:[{x:0,y:28,w:2,h:4,to:'ember_caldera',arrive:{x:79.5,y:41.5,angle:-Math.PI/2},label:'Ember Caldera'},{x:74,y:28,w:2,h:4,to:'haunted_forest',arrive:{x:5.5,y:31.5,angle:Math.PI/2},label:'Haunted Forest · Lv.75–99'}],
 spawns:[{mob:'ruin_scarab',count:8,areas:[[5,40,16,14],[5,5,10,16]]},{mob:'sand_basilisk',count:8,areas:[[20,4,16,10],[20,33,16,13]]},{mob:'rune_sentinel',count:8,areas:[[34,14,15,12],[34,34,9,12]]},{mob:'astral_wisp',count:7,areas:[[45,4,22,7],[52,33,18,11]]},{mob:'relic_knight',count:7,areas:[[51,46,20,9]]},{mob:'aurex',count:1,areas:[[57,18,3,3]]}],
 restSpots:[{x:7.5,y:33.5,r:3}]
};
