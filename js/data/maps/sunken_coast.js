// v0.46 Sunken Coast · หาดปะการังจม Lv.100–117 · MVP ไทดาลอส ราชันย์คลื่น
// หาดทรายขาวริมทะเลทางใต้-ตะวันออก · ทะเลสาบน้ำเค็มกลางแผนที่ · ซากเรือ · ซากวิหารจมทางเหนือ
import { borderTrees, scatterTrees, scaleMap, FIELD_SCALE } from './helpers.js?v=0.93.0-p2.18';
const W=80,H=64,lanes=[[0,30,70,4],[38,0,4,30],[22,30,4,20],[22,44,40,4],[56,30,4,18]],camp=[2,25,11,15],arena=[56,40,12,12],sea=[[0,54,80,10],[70,0,10,64]];
const look={hair:'#3fe6d0',skin:'#e8c4a8',eye:'#1f6a78',tunic:'#2a8a9a',pants:'#244a5a',boot:'#2a2a3a',hairStyle:'ponytail',accessory:'wizard',hatColor:'#1f6a78',orbColor:'#9afff0',weapon:'staff'};
const RAW = {
 id:'sunken_coast',name:'Sunken Coast',subtitle:'หาดปะการังจม · Lv.100–117 · MVP ไทดาลอส',levelRange:[100,114],eliteRange:[114,117],width:W,height:H,fill:'GRASS',spawn:{x:5.5,y:31.5},music:'coast',
 theme:{fog:'#a8dce4',fogNear:26,fogFar:74,outer:'#2a8aa8',light:{hemi:.95,sky:'#e8fbff',ground:'#c8b890',sun:1.25,sunColor:'#fff4dc',exposure:1.02},
  grass:{base:'#dccb9a',blobs:['#e8d8a8','#cfbd8a','#e2d3a6','#c8b680'],blades:['#9ab878','#b8c888','#c8d898'],litter:['#ff9ab0','#ffffff','#9afff0']},
  dirt:{base:'#c8b58a',blobs:['#b8a47a','#d4c296','#bfae82'],pebble:'#f4ecd8',cracks:'#a8946a'},water:'water',tufts:true,flowers:['#ff8a9a','#ffd0e0','#9afff0'],
  motes:'#ffffff',moteCount:70,moteSize:.07,sunbeams:6,fx:{gain:.7,glow:.75,flash:.7},mini:{grass:'#dccb9a',dirt:'#b8a47a',water:'#3a9ac8',flowers:'#ff9ab0',bridge:'#9b6b3e'}},
 prune:true,
 regions:[
  {tile:'WATER',rect:[0,55,80,9]},{tile:'WATER',rect:[71,0,9,64]},
  {tile:'WATER',circle:[71,55,6,5]},{tile:'WATER',circle:[22,55,6,3]},{tile:'WATER',circle:[48,56,8,3]},{tile:'WATER',circle:[71,20,3,6]},
  {tile:'WATER',circle:[40,30,6.5,4.6]},{tile:'BRIDGE',rect:[39,25,2,10]},
  {tile:'FLOWERS',circle:[16,16,4,3]},{tile:'FLOWERS',circle:[31,40,3,2]},{tile:'FLOWERS',circle:[62,12,3,2.5]},{tile:'FLOWERS',circle:[50,24,3,2]},
  {tile:'DIRT',circle:[7.5,32.5,6,7.4]},{tile:'DIRT',circle:[62,46,6.5,6]},{tile:'DIRT',circle:[52,12,7,6]},
  {tile:'DIRT',path:[[0,32],[12,32],[22,30.5],[30,32],[36,30],[44,30],[52,32],[60,31],[68,32]],w:3.4},
  {tile:'DIRT',path:[[40,0],[40,8],[44,14],[40,22],[40,26]],w:3.2},
  {tile:'DIRT',path:[[22,31],[22,40],[28,46],[40,46],[50,45],[58,46]],w:3.2},
  {tile:'DIRT',path:[[58,31],[57,38],[60,44]],w:3},
 ],
 objects:[{kind:'tent',x:3,y:26,color:'#2a8a9a'},{kind:'campfire',x:8,y:36},{kind:'warpstone',x:4,y:37,color:'#3fe6d0'},{kind:'sign',x:12,y:28,text:'Sunken Coast · Lv.100–114'},{kind:'sign',x:52,y:40,text:'⚠ ถ้ำราชันย์คลื่น · MVP Lv.117'},{kind:'sign',x:42,y:4,text:'↑ Crystal Valley · Lv.118+'},
  ...[[48,8],[56,8],[48,16],[56,16],[52,6]].map(([x,y],i)=>({kind:'pillar',x,y,seed:1200+i})),
  {kind:'bones',x:30,y:50},{kind:'bones',x:64,y:51},{kind:'crate',x:28,y:48},{kind:'barrel',x:33,y:49},{kind:'barrel',x:61,y:50},{kind:'crate',x:67,y:49},
  {kind:'bigshroom',x:18,y:44,color:'#ff8a9a'},{kind:'bigshroom',x:46,y:38,color:'#9afff0'},{kind:'bigshroom',x:64,y:24,color:'#ffb0d0'},
  ...[[14,22],[26,12],[34,40],[50,36],[64,8],[66,36],[12,48]].map(([x,y],i)=>({kind:'boulder',x,y,seed:1300+i})),
  ...scatterTrees(W,H,46,[...lanes,camp,arena,...sea,[33,24,15,13],[46,4,13,14]],80431,3,.1),
  ...borderTrees(W,H,2,[{x0:0,x1:2,y0:29,y1:35},{x0:36,x1:44,y0:0,y1:2}],80317,.5)],
 npcs:[{id:'marin',name:'มาริน',title:'ผู้นำทางกระแสน้ำ',x:8,y:28,dir:'down',look,service:{type:'warp',routes:'coast'},greet:'คลื่นวันนี้สงบดี · เหนือขึ้นไปคือหุบเขาคริสตัล',lines:['ไทดาลอสอยู่ถ้ำริมทะเลตะวันออกเฉียงใต้ · ระวังวงน้ำแข็งที่มันเรียกลงมา','ชุดห้วงสมุทรดรอปจากมอนแถวนี้ ยิ่งลึกยิ่งดรอปง่าย']},
  {id:'coast_supply',name:'ทาร่า',title:'เสบียงริมหาด',x:7,y:34,dir:'down',look:{...look,tunic:'#e8c87a',accessory:'clerk'},service:{type:'shop',shop:'endgame'},greet:'ยาครบ ผลึกตีบวกครบ ซื้อก่อนลงทะเลนะ'}],
 portals:[{x:37,y:0,w:6,h:2,to:'crystal_valley',arrive:{x:5.5,y:31.5,angle:Math.PI/2},label:'Crystal Valley · Lv.118–134'}],
 spawns:[{mob:'reef_crab',count:8,areas:[[12,38,10,12],[12,8,14,14]]},{mob:'shell_turtle',count:7,areas:[[26,36,14,7],[24,14,12,10]]},{mob:'abyss_jelly',count:7,areas:[[30,20,8,6],[44,22,10,8]]},{mob:'drowned_knight',count:6,areas:[[46,4,14,14]]},{mob:'siren_eel',count:6,areas:[[60,26,8,12],[46,40,8,8]]},{mob:'tidalos',count:1,areas:[[61,45,3,3]]}],
 restSpots:[{x:7.5,y:35.5,r:3}]
};
export const SUNKEN_COAST = scaleMap(RAW, FIELD_SCALE, { treeScale: FIELD_SCALE, mobMul: 1.5 });
