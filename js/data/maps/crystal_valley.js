// v0.46 Crystal Valley · หุบเขาคริสตัล Lv.118–134 · MVP คริสธาร์ มังกรผลึก
// หุบเขาผลึกเจ็ดสี ทะเลสาบน้ำแข็งใส · ทางขึ้นปราสาทลอยฟ้าทางตะวันออก
import { borderTrees, scatterTrees, scaleMap, FIELD_SCALE } from './helpers.js?v=0.54.0';
const W=80,H=64,lanes=[[0,30,80,4],[18,8,4,46],[40,6,4,48],[60,8,4,44],[18,8,46,4],[18,50,46,4]],camp=[2,25,11,15],arena=[62,40,14,16],lakes=[[24,14,12,8],[46,40,10,8]];
const look={hair:'#e0c8ff',skin:'#f0d4c4',eye:'#6a4ab8',tunic:'#8a6ac8',pants:'#3a2a5a',boot:'#2a2238',hairStyle:'long',accessory:'wizard',hatColor:'#6a4ab8',orbColor:'#e0c8ff',weapon:'staff'};
const CRY=['#c8a8ff','#7fe0ff','#ff9ae8','#9affe0'];
const RAW = {
 id:'crystal_valley',name:'Crystal Valley',subtitle:'หุบเขาคริสตัล · Lv.118–134 · MVP คริสธาร์',levelRange:[118,131],eliteRange:[131,134],width:W,height:H,fill:'GRASS',spawn:{x:5.5,y:31.5},music:'crystal',
 theme:{fog:'#8a7ab8',fogNear:24,fogFar:70,outer:'#241a3e',light:{hemi:.9,sky:'#e8dcff',ground:'#4a3a6a',sun:1.1,sunColor:'#f0e4ff',exposure:1.05},
  grass:{base:'#6a6a9a',blobs:['#5e5e8e','#7676a8','#6a7aa8','#7a6aa0'],blades:['#9a9ad8','#8ab4e0','#b8a0e8'],litter:['#e0c8ff','#7fe0ff','#ffffff']},
  dirt:{base:'#8a82a8',blobs:['#9a92b8','#7a7298','#a49cc0'],pebble:'#e8e0ff',cracks:'#5a527a'},water:'ice',trees:'dead',tufts:true,flowers:['#e0c8ff','#9affe0','#ffb0e8'],
  motes:'#e0d0ff',moteCount:120,moteSize:.07,fx:{gain:.8,glow:.9,flash:.75},mini:{grass:'#6a6a9a',dirt:'#9a92b8',water:'#9ad0f0',flowers:'#e0c8ff',bridge:'#a894b4'}},
 prune:true,
 regions:[
  {tile:'WATER',circle:[30,18,5.5,3.6]},{tile:'WATER',circle:[51,44,4.6,3.6]},{tile:'WATER',circle:[10,52,2.4,1.8]},{tile:'WATER',circle:[72,12,3,2.4]},
  {tile:'FLOWERS',circle:[30,24.5,6,2]},{tile:'FLOWERS',circle:[66,24,3,2]},{tile:'FLOWERS',circle:[30,44,3.4,2.4]},
  {tile:'DIRT',circle:[7.5,32.5,6,7.4]},{tile:'DIRT',circle:[69,48,7,8.4]},
  {tile:'DIRT',path:[[0,32],[10,32],[19,33],[30,31],[42,32.5],[52,30.5],[62,32.5],[80,32]],w:3.6},
  {tile:'DIRT',path:[[19.5,9],[18,20],[20,32],[19,44],[20,53]],w:3.2},
  {tile:'DIRT',path:[[42,7],[43,18],[41.5,32],[43,44],[42,54]],w:3.2},
  {tile:'DIRT',path:[[61.5,9],[60,20],[62,32],[61,42]],w:3.2},
  {tile:'DIRT',path:[[18,10],[30,9],[42,11],[54,9],[62,10]],w:3.2},
  {tile:'DIRT',path:[[18,52],[30,53],[42,51.5],[56,53],[66,50]],w:3.2},
 ],
 objects:[{kind:'tent',x:3,y:26,color:'#8a6ac8'},{kind:'campfire',x:8,y:36},{kind:'warpstone',x:4,y:37,color:'#d8b0ff'},{kind:'sign',x:12,y:28,text:'Crystal Valley · Lv.118–131'},{kind:'sign',x:58,y:40,text:'⚠ รังมังกรผลึก · MVP Lv.134'},{kind:'sign',x:74,y:28,text:'→ Sky Citadel · Lv.135+'},
  ...[[12,14],[26,6],[36,22],[48,14],[56,24],[68,18],[26,40],[36,48],[52,26],[66,36],[12,46],[74,40],[30,58],[50,58],[8,8],[72,56]].map(([x,y],i)=>({kind:'icecrystal',x,y,seed:1400+i,color:CRY[i%4]})),
  ...[[24,28],[46,22],[56,46],[14,40],[34,36],[64,14]].map(([x,y],i)=>({kind:'boulder',x,y,seed:1500+i})),
  ...[[64,42],[74,44],[64,54],[74,54]].map(([x,y],i)=>({kind:'pillar',x,y,seed:1600+i})),
  ...scatterTrees(W,H,56,[...lanes,camp,arena,...lakes],81731,3,.2),
  ...borderTrees(W,H,2,[{x0:0,x1:2,y0:29,y1:35},{x0:78,x1:80,y0:29,y1:35}],81919,.6)],
 npcs:[{id:'lyra',name:'ไลรา',title:'ผู้อ่านผลึก',x:8,y:28,dir:'down',look,service:{type:'warp',routes:'crystal'},greet:'ผลึกที่นี่บอกทางให้คนที่ฟังเป็น · ตะวันออกสุดคือทางขึ้นฟ้า',lines:['คริสธาร์นอนอยู่รังตะวันออกเฉียงใต้ ระวังผลึกที่มันเรียกตกลงมา','ชุดเทพสวรรค์เริ่มดรอปตั้งแต่หมาป่าจีโอดขึ้นไป']},
  {id:'valley_supply',name:'โอนิกซ์',title:'เสบียงหุบผลึก',x:7,y:34,dir:'down',look:{...look,tunic:'#c8a8ff',accessory:'clerk'},service:{type:'shop',shop:'endgame'},greet:'ของครบก่อนเข้าหุบลึก'}],
 portals:[{x:0,y:30,w:2,h:4,to:'sunken_coast',arrive:{x:40,y:4.5,angle:0},label:'Sunken Coast · Lv.100–117'},{x:78,y:30,w:2,h:4,to:'sky_citadel',arrive:{x:5.5,y:31.5,angle:Math.PI/2},label:'Sky Citadel · Lv.135–150'}],
 spawns:[{mob:'shard_beetle',count:8,areas:[[5,42,13,13],[5,6,12,17]]},{mob:'prism_golem',count:7,areas:[[22,4,16,6],[22,44,16,8]]},{mob:'geode_wolf',count:7,areas:[[24,24,14,6],[45,4,14,10]]},{mob:'crystal_drake',count:7,areas:[[45,14,14,14],[45,34,12,4]]},{mob:'prism_wisp',count:6,areas:[[64,4,12,20]]},{mob:'crysthar',count:1,areas:[[68,47,3,3]]}],
 restSpots:[{x:7.5,y:35.5,r:3}]
};
export const CRYSTAL_VALLEY = scaleMap(RAW, FIELD_SCALE, { treeScale: FIELD_SCALE, mobMul: 1.5 });
