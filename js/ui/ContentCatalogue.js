import { MAPS } from '../data/maps/index.js';
import { MONSTERS } from '../data/monsters.js';
import { ENDGAME_ITEMS } from '../data/endgameItems.js';
import { ITEMS, RARITY, describeBonus } from '../data/items.js';
import { CARDS, cardSlotName } from '../data/cards.js';
import { GameMap } from '../world/GameMap.js';
import { T } from '../data/tileTypes.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors={common:'ขาว',uncommon:'เขียว',rare:'ฟ้า',epic:'ม่วง',legend:'ส้ม',mythic:'ทอง',celestial:'แดง'};
const pct=n=>(n*100).toLocaleString('th-TH',{maximumFractionDigits:3})+'%';
for(const id of ['ancient_ruins','haunted_forest']){
 const def=MAPS[id],node=document.createElement('article');node.className='map '+(id==='haunted_forest'?'haunted':'');
 node.innerHTML=`<div class="mapTop"><div><h3>${def.name}</h3><p>${def.subtitle}</p><a class="play" href="preview.html?zone=${id}&level=${id==='ancient_ruins'?70:85}">ทดลองล่าในแมพนี้ ↗</a><p class="note">${id==='ancient_ruins'?'ซากเสาศิลา บ่อน้ำและลานผู้พิทักษ์ · 39 มอนในแมพ':'หมอกจันทร์ สุสานและเขตคราส · 41 มอนในแมพ'}<br>จุดสีฟ้า = ค่าย / จุดสีแดง = MVP / จุดเหลือง = ประตู</p></div><canvas width="${def.width*3}" height="${def.height*3}" aria-label="แผนผัง ${def.name}"></canvas></div><div class="mons"></div>`;
 document.querySelector('#mapCards').append(node);
 const map=new GameMap(def),ctx=node.querySelector('canvas').getContext('2d');
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){const t=map.tileAt(x,y);ctx.fillStyle=map.isSolidTile(x,y)?'#33453e':t===T.DIRT?def.theme.mini.dirt:t===T.WATER?def.theme.mini.water:def.theme.mini.grass;ctx.fillRect(x*3,y*3,3,3);}
 ctx.fillStyle='#8ce7f1';ctx.fillRect(def.spawn.x*3-3,def.spawn.y*3-3,6,6);
 for(const p of def.portals){ctx.fillStyle='#ffe38c';ctx.fillRect(p.x*3,p.y*3,p.w*3,p.h*3);}
 const spawns=[...def.spawns].sort((a,b)=>MONSTERS[a.mob].level-MONSTERS[b.mob].level);
 for(const s of spawns){const m=MONSTERS[s.mob];if(m.mvp){const[a,b]=s.areas[0];ctx.fillStyle='#ff647a';ctx.fillRect((a+1)*3,(b+1)*3,7,7);}const weapons=m.drops.filter(([i])=>ITEMS[i]?.slot==='weapon');node.querySelector('.mons').insertAdjacentHTML('beforeend',`<div class="monster"><img src="assets/monsters/${s.mob}.png" alt="${esc(m.name)}" loading="lazy"><h4>${esc(m.name)}</h4><span class="badge ${m.mvp?'mvp':''}">Lv.${m.level}${m.mvp?' · MVP':''} · HP ${m.hp.toLocaleString()}</span><details><summary>อาวุธที่ดรอป (${weapons.length})</summary>${weapons.map(([i,c])=>`<p style="color:${RARITY[ITEMS[i].rarity||'common'].color}">${esc(ITEMS[i].name)} · ${pct(c)}</p>`).join('')}</details></div>`);}
}
function weapons(){const typ=document.querySelector('#weaponType').value;document.querySelector('#weaponCards').innerHTML=Object.entries(ENDGAME_ITEMS).filter(([,it])=>it.wtype===typ).map(([id,it])=>`<article class="item" style="--grade:${RARITY[it.rarity].color}"><img src="assets/items/${id}.png" alt="${esc(it.name)}"><div class="tier">${colors[it.rarity]} · Lv.${it.reqLevel}</div><h4>${esc(it.name)}</h4><small>${esc(describeBonus(it.bonus))}</small><small>${it.slots} ช่องการ์ด</small></article>`).join('');}
function cards(){const tier=document.querySelector('#cardTier').value;document.querySelector('#cardCards').innerHTML=Object.entries(CARDS).filter(([,c])=>tier==='all'||c.rarity===tier).sort((a,b)=>MONSTERS[a[1].mob].level-MONSTERS[b[1].mob].level).map(([id,c])=>`<article class="item" style="--grade:${RARITY[c.rarity].color}"><img src="assets/cards/${id}.png" alt="${esc(c.name)}" loading="lazy"><div class="tier">${colors[c.rarity]} · ดรอป ${pct(c.drop)}</div><h4>${esc(c.name)}</h4><small>ใส่${cardSlotName(c.on)}</small><small>${esc(describeBonus(c.bonus))}</small></article>`).join('');}
document.querySelector('#weaponType').addEventListener('change',weapons);document.querySelector('#cardTier').addEventListener('change',cards);weapons();cards();
