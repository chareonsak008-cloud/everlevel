// Pre-rendered portraits of the exact game models; no offscreen WebGL per card.
import { CARDS } from '../data/cards.js';
const portraits=new Map(),listeners=new Set();let pending;
export const CARD_FRAME_COLORS={common:'#f2ece0',uncommon:'#8fe08a',rare:'#7fc4ff',epic:'#d49bff',legend:'#ffb347',mythic:'#ffd85e',celestial:'#ff5266'};
export const monsterPortrait=mob=>portraits.get(mob);
export const onPortraitReady=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function preloadMonsterPortraits(){
 if(pending)return pending;
 pending=Promise.all([...new Set(Object.values(CARDS).map(c=>c.mob))].map(mob=>new Promise(resolve=>{
  const im=new Image();let done=false;let timeout;const finish=()=>{if(done)return;done=true;clearTimeout(timeout);resolve();};
  im.onload=()=>{portraits.set(mob,im);for(const fn of listeners)fn(mob);finish();};im.onerror=finish;
  timeout=setTimeout(finish,4000);
  im.src=new URL('../../assets/monsters/'+mob+'.png',import.meta.url).href;
 })));return pending;
}
export function drawMonsterCard(g,mob,rarity='common'){
 const color=CARD_FRAME_COLORS[rarity]||CARD_FRAME_COLORS.common;
 g.save();g.imageSmoothingEnabled=false;
 g.fillStyle='#251e32';g.fillRect(9,3,46,58);g.fillStyle=color;g.fillRect(11,5,42,54);
 g.fillStyle='#343346';g.fillRect(14,8,36,37);
 g.fillStyle='#555569';g.fillRect(16,10,32,3);
 const im=portraits.get(mob);
 if(im)g.drawImage(im,15,9,34,34);
 else{g.fillStyle=color;g.font='bold 20px sans-serif';g.textAlign='center';g.fillText('?',32,34);}
 g.fillStyle='#251e32';g.fillRect(15,48,34,2);g.fillRect(15,53,23,2);
 g.fillStyle='#fff5d5';for(const [x,y] of [[12,6],[49,6],[12,55],[49,55]])g.fillRect(x,y,3,3);
 if(rarity==='mythic'||rarity==='celestial'){g.fillStyle=color;g.fillRect(27,1,10,3);g.fillStyle='#fff2d1';g.fillRect(31,0,2,6);}
 g.restore();
}
