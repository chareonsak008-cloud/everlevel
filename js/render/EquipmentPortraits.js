import {BASE_ITEMS} from '../data/items.js';
const images=new Map();let pending;
export const equipmentPortrait=id=>images.get(String(id).split('*')[0]);
export function preloadEquipmentPortraits(){
 if(pending)return pending;
 pending=Promise.all(Object.entries(BASE_ITEMS).filter(([,it])=>it.type==='equip').map(([id])=>new Promise(resolve=>{
  const im=new Image();let timer;const end=()=>{clearTimeout(timer);resolve();};
  im.onload=()=>{images.set(id,im);end();};im.onerror=end;timer=setTimeout(end,4000);
  im.src=new URL('../../assets/equipment/'+id+'.png',import.meta.url).href;
 })));return pending;
}
