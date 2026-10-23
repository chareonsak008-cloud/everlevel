// This module is loaded only by fashion-play.html. It never opens a real save.
import { FASHION_COLLECTION, FASHION_SETS } from '../data/fashionCollection.js?v=0.93.0-p2.13';
import { JOBS } from '../data/progression.js?v=0.93.0-p2.13';
import { SKILLS } from '../data/skills.js?v=0.93.0-p2.13';
if(window.__contentPreview){
 const timer=setInterval(()=>{const g=window.asteria;if(!g?.started)return;clearInterval(timer);init(g);},50);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
function init(g){
 const p=g.player;p.mail.welcome=true;g.mailWin.toggle(false);g.settings.muted=true;g.applySettings();
 for(const it of FASHION_COLLECTION)p.addFashion(it.id);
 const panel=document.createElement('section');panel.id='fashionDemo';panel.innerHTML='<details open><summary>ลองแฟชั่น v0.24</summary><p>แตะพื้นเดิน · แตะมอนโจมตี · เลือกสกิลร่ายเวท</p><div class="sets"></div><div class="jobs"></div><a href="fashion-preview.html">ห้องดูอนิเมชั่น ↗</a><p>ตัวละครทดลอง ไม่บันทึกลงเซฟจริง</p></details>';document.body.append(panel);
 for(const ev of ['pointerdown','pointerup','click','wheel','touchstart','keydown'])panel.addEventListener(ev,e=>e.stopPropagation());
 let selected=FASHION_SETS[0];
 function dress(set){selected=set;p.fashion.worn={};g.wearFashionSet(set.items);panel.querySelectorAll('.sets button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===set.id)));}
 for(const set of FASHION_SETS){const b=document.createElement('button');b.textContent=set.name;b.dataset.id=set.id;b.onclick=()=>dress(set);panel.querySelector('.sets').append(b);}
 for(const [id,name]of [['swordsman','สายดาบ'],['mage','สายเวท'],['archer','สายธนู'],['acolyte','สายซัพ']]){
   const b=document.createElement('button');b.textContent=name;b.onclick=()=>{
     g.clearTarget();p.cast=null;p.path=[];p.pendingSkill=null;p.cooldowns={};p.jobId=id;p.baseLevel=40;p.jobLevel=40;p.skills={first_aid:1,basic:9};
     p.equip.weapon=JOBS[id].gift;const active=[];for(const [key,sk]of Object.entries(SKILLS))if(sk.job===id){p.skills[key]=Math.min(5,sk.maxLv||1);if(sk.kind==='active')active.push('skill:'+key);}
     p.hotbar=[...active,'skill:first_aid'].slice(0,9);while(p.hotbar.length<9)p.hotbar.push(null);p.recalc();p.hp=p.maxHp;p.sp=p.maxSp;p.look=p.computeLook();dress(selected);g.hud.setPlayer(p);g.hotbar.render();g.skillWin.render();g.status.render();
   };panel.querySelector('.jobs').append(b);
 }
 panel.querySelector('.jobs button').click();
 for(const [id,n]of [['white_potion',100],['mana_potion',100]])p.inventory.add(id,n);g.refreshItemsUI();
}
