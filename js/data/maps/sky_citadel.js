// v0.46 Sky Citadel · ปราสาทลอยฟ้า Lv.135–150 · MVP ออเรลิออน เทพบุตรสวรรค์ (ปลายสุดของเกม)
// ลานหินขาวลอยเหนือเมฆ สวนลอยฟ้า สระสวรรค์ · ท้องพระโรงทางเหนือ
import { scatterTrees, scaleMap, FIELD_SCALE } from './helpers.js?v=0.76.0';
const W=80,H=64,lanes=[[0,30,80,4],[38,0,4,64],[14,14,52,4],[14,46,52,4],[14,14,4,36],[62,14,4,36]],camp=[2,25,11,15],court=[28,22,24,20],throne=[30,2,20,12];
const look={hair:'#fff1b0',skin:'#f6dcc8',eye:'#c8a24a',tunic:'#f4ecd8',pants:'#c8b88a',boot:'#8a7a5a',hairStyle:'long',accessory:'wizard',hatColor:'#e8d8a8',orbColor:'#fff1b0',weapon:'staff'};
const RAW = {
 id:'sky_citadel',name:'Sky Citadel',subtitle:'ปราสาทลอยฟ้า · Lv.135–150 · MVP ออเรลิออน',levelRange:[135,147],eliteRange:[147,150],width:W,height:H,fill:'GRASS',spawn:{x:5.5,y:31.5},music:'sky',
 theme:{fog:'#dceaff',fogNear:30,fogFar:84,outer:'#bcd8ff',noOuterTrees:true,light:{hemi:1.0,sky:'#ffffff',ground:'#c8d4e8',sun:1.3,sunColor:'#fff6e0',exposure:.98},
  grass:{base:'#a8d49a',blobs:['#b8e0a8','#9ccc8e','#c4e8b4','#a0d0a0'],blades:['#d0f0c0','#b8e8a8','#e8ffd8'],litter:['#ffffff','#fff1b0','#bfe4ff']},
  dirt:{base:'#e8e4d8',blobs:['#f0ece2','#dcd6c8','#f4f0e8'],pebble:'#ffffff',cracks:'#c8c0ae'},water:'water',tufts:true,flowers:['#ffffff','#fff1b0','#bfe4ff'],
  motes:'#fff6d0',moteCount:110,moteSize:.08,sunbeams:10,fx:{gain:.7,glow:.95,flash:.8},mini:{grass:'#a8d49a',dirt:'#e8e4d8',water:'#9ad0ff',flowers:'#fff1b0',bridge:'#d8c8a0'}},
 prune:true,
 regions:[
  // ขอบเกาะลอยฟ้า = ทะเลเมฆ (น้ำ)
  {tile:'WATER',rect:[0,0,80,2]},{tile:'WATER',rect:[0,62,80,2]},{tile:'WATER',rect:[0,0,2,28]},{tile:'WATER',rect:[0,36,2,28]},{tile:'WATER',rect:[78,0,2,64]},
  {tile:'WATER',circle:[4,4,5,4]},{tile:'WATER',circle:[76,4,5,4]},{tile:'WATER',circle:[4,60,5,4]},{tile:'WATER',circle:[76,60,5,4]},
  {tile:'WATER',circle:[22,32,3,2.4]},{tile:'WATER',circle:[58,32,3,2.4]},
  {tile:'FLOWERS',circle:[24,24,4,3]},{tile:'FLOWERS',circle:[56,24,4,3]},{tile:'FLOWERS',circle:[24,42,4,3]},{tile:'FLOWERS',circle:[56,42,4,3]},
  {tile:'PLAZA',rect:[28,22,24,20]},{tile:'PLAZA',rect:[30,3,20,11]},{tile:'PLAZA',circle:[7.5,32.5,5.5,6]},
  {tile:'PLAZA',rect:[0,30,28,4]},{tile:'PLAZA',rect:[52,30,26,4]},{tile:'PLAZA',rect:[38,14,4,8]},{tile:'PLAZA',rect:[38,42,4,20]},
  {tile:'DIRT',path:[[16,15],[40,15.5],[64,15]],w:3},{tile:'DIRT',path:[[16,48],[40,47.5],[64,48]],w:3},
  {tile:'DIRT',path:[[16,15],[15.5,32],[16,48]],w:3},{tile:'DIRT',path:[[64,15],[64.5,32],[64,48]],w:3},
 ],
 objects:[{kind:'tent',x:3,y:26,color:'#e8d8a8'},{kind:'campfire',x:8,y:36},{kind:'warpstone',x:4,y:37,color:'#fff1b0'},{kind:'sign',x:12,y:28,text:'Sky Citadel · Lv.135–147'},{kind:'sign',x:36,y:15,text:'⚠ ท้องพระโรงสวรรค์ · MVP Lv.150'},
  {kind:'fountain',x:38,y:30},
  ...[[29,23],[50,23],[29,40],[50,40],[34,23],[45,23],[34,40],[45,40]].map(([x,y],i)=>({kind:'pillar',x,y,seed:1700+i})),
  ...[[31,4],[48,4],[31,12],[48,12]].map(([x,y],i)=>({kind:'pillar',x,y,seed:1750+i})),
  {kind:'tower',x:24,y:18},{kind:'tower',x:54,y:18},{kind:'tower',x:24,y:44},{kind:'tower',x:54,y:44},
  ...[[20,31],[26,34],[54,31],[60,34],[37,20],[42,20],[37,44],[42,44],[36,50],[43,56]].map(([x,y])=>({kind:'lamp',x,y})),
  {kind:'bench',x:30,y:36},{kind:'bench',x:48,y:36},{kind:'chest',x:40,y:5},
  ...scatterTrees(W,H,40,[...lanes,camp,court,throne,[2,2,6,6],[72,2,6,6],[2,56,6,6],[72,56,6,6]],82913,4,.15)],
 npcs:[{id:'caelum',name:'ซีลัม',title:'ผู้เฝ้าประตูฟ้า',x:8,y:28,dir:'down',look,service:{type:'warp',routes:'sky'},greet:'ยินดีต้อนรับสู่จุดสูงสุดของโลก · ระวังลมแรงนะ',lines:['ออเรลิออนประทับในท้องพระโรงทางเหนือ · หลบวงแสงตอนมันยกหอกขึ้น','ไททันสวรรค์ดรอปชุดเทพสวรรค์ง่ายที่สุด แต่ตีเจ็บมาก']},
  {id:'sky_supply',name:'เซเลสต์',title:'เสบียงลอยฟ้า',x:7,y:34,dir:'down',look:{...look,tunic:'#bfe4ff',accessory:'clerk'},service:{type:'shop',shop:'endgame'},greet:'ขึ้นมาถึงนี่ได้ ต้องเก่งมากแล้วล่ะ'}],
 portals:[{x:0,y:30,w:2,h:4,to:'crystal_valley',arrive:{x:74.5,y:31.5,angle:-Math.PI/2},label:'Crystal Valley · Lv.118–134'}],
 spawns:[{mob:'cloud_sentinel',count:8,areas:[[4,4,10,20],[4,40,10,18]]},{mob:'storm_griffin',count:7,areas:[[18,4,10,9],[18,52,18,8]]},{mob:'seraph_knight',count:7,areas:[[52,4,14,9],[44,52,18,8]]},{mob:'tempest_shade',count:6,areas:[[66,18,10,10],[18,20,8,8]]},{mob:'celestial_titan',count:6,areas:[[66,36,10,14],[18,36,8,8]]},{mob:'aurelion',count:1,areas:[[39,7,2,2]]}],
 restSpots:[{x:7.5,y:35.5,r:3}]
};
export const SKY_CITADEL = scaleMap(RAW, FIELD_SCALE, { treeScale: FIELD_SCALE, mobMul: 1.5 });
