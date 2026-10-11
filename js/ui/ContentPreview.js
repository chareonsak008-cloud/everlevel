// Only loaded by preview.html. No account login, cloud save or live-character data.
import { SKILLS } from '../data/skills.js';
import { ITEMS } from '../data/items.js';
const jobs={swordsman:['สายดาบ','sword'],mage:['สายเวท','staff'],archer:['สายธนู','bow'],acolyte:['สายซัพ','mace']};
const t=setInterval(()=>{const g=window.asteria;if(!g?.started)return;clearInterval(t);init(g);},50);
function init(g){
 const p=g.player;g.saver.adapter={load:async()=>null,save:async()=>true};p.mail.welcome=true;g.mailWin.toggle(false);
 g.settings.muted=true;g.applySettings();
 const panel=document.createElement('section');panel.id='contentPreview';
 panel.innerHTML=`<details open><summary>ทดลอง Lv.60–99 · v0.23</summary><p>แตะพื้นเดิน · แตะมอนตี · กด AUTO ล่าอัตโนมัติ</p><div class="jobs"></div><div class="zones"></div><div class="actions"></div><small class="state"></small><a href="equipment.html" target="_blank" rel="noopener">ห้องลองอาวุธและชุดใหม่ ↗</a><a href="content.html" target="_blank" rel="noopener">ดูมอนใหม่ อาวุธ ดรอป และการ์ด ↗</a><p class="note">ตัวละครทดลอง · ไม่บันทึกเข้าบัญชีจริง · ดรอปคูณตามกิจกรรมทดสอบ</p></details>`;
 document.body.append(panel);for(const ev of ['pointerdown','pointerup','click','wheel','touchstart','keydown'])panel.addEventListener(ev,e=>e.stopPropagation());
 let job='swordsman',level=70,zone='ancient_ruins';
 const btn=(group,text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;panel.querySelector('.'+group).append(b);return b;};
 function reset(){g.clearTarget();g.timeline=[];g.heroAnims=[];p.path=[];p.cast=null;p.pendingTalk=null;p.pendingSkill=null;p.lockUntil=p.skillDelayUntil=0;p.dead=false;p.hp=1;p.attackCd=0;p.cooldowns={};p.buffs=[];p.fashion.worn={};g.auto?.stop?.();g.root.querySelector('.death')?.classList.remove('open');}
 function equip(){
  reset();p.name=jobs[job][0]+' · ทดลอง';p.jobId=job;p.baseLevel=level;p.jobLevel=Math.min(90,level);p.baseExp=p.jobExp=0;p.statPoints=p.skillPoints=0;
  p.attr=job==='swordsman'?{str:75,agi:45,vit:65,int:15,dex:50,luk:20}:job==='mage'?{str:10,agi:30,vit:45,int:85,dex:65,luk:20}:job==='archer'?{str:20,agi:70,vit:45,int:20,dex:85,luk:25}:{str:40,agi:35,vit:65,int:80,dex:55,luk:20};
  const prefix=level>=95?'bloodmoon':level>=90?'moonveil':level>=80?'spectral':'astral';
  p.equip.weapon=prefix+'_'+jobs[job][1];for(const slot of ['body','head','shield','garment','shoes','accessory'])p.equip[slot]=(level>=95?'bloodmoon':level>=80?'spectral':'astral')+'_'+slot;
  p.skills={first_aid:1,basic:9};const active=[];for(const [id,sk] of Object.entries(SKILLS))if(sk.job===job){p.skills[id]=Math.min(sk.maxLv||1,5);if(sk.kind==='active')active.push('skill:'+id);}p.hotbar=[...active,'skill:first_aid'].slice(0,9);while(p.hotbar.length<9)p.hotbar.push(null);
  p.recalc();p.look=p.computeLook();p.hp=p.maxHp;p.sp=p.maxSp;
  g.gfx.refreshLook(p);g.hud.setPlayer(p);g.hotbar.render();g.skillWin.render();g.status.render();g.refreshItemsUI();
  panel.querySelectorAll('.jobs button').forEach(b=>b.classList.toggle('active',b.dataset.job===job));
 }
 function travel(map,lv,arrive){if(g.warping)return;zone=map;level=lv;equip();g.warp(map,arrive||null);}
 for(const [id,[name]] of Object.entries(jobs)){const b=btn('jobs',name,()=>{job=id;equip();});b.dataset.job=id;}
 btn('zones','ซากโบราณ · Lv.70',()=>travel('ancient_ruins',70));
 btn('zones','ป่าวิญญาณ · Lv.85',()=>travel('haunted_forest',85));
 btn('zones','เขตลึก · Lv.95',()=>travel('haunted_forest',95,{x:61.5,y:31.5,angle:Math.PI/2}));
 btn('zones','ท้าออเร็กซ์',()=>travel('ancient_ruins',80,{x:55.5,y:29.5,angle:0}));
 btn('zones','ท้าน็อคธาร์',()=>travel('haunted_forest',98,{x:61.5,y:50.5,angle:Math.PI/2}));
 btn('actions','เติม HP / SP',()=>{if(p.dead){travel(zone,level);return;}p.hp=p.maxHp;p.sp=p.maxSp;g.hud.setPlayer(p);});
 btn('actions','รับการ์ดทดลอง',()=>{const id=zone==='ancient_ruins'?'card_relic_knight':'card_nocthar';p.inventory.add(id,1);g.collection.scanCards(true);g.refreshItemsUI();g.hud.log('ของทดลอง: '+ITEMS[id].name+' · เปิดกระเป๋าเพื่อดูรูป/ใส่ช่องการ์ด','sys');});
 btn('actions','ลองดรอปจากการฆ่า',()=>{g.hud.log('แตะมอนสเตอร์แล้วตีจนหมด HP เพื่อสุ่มดรอปจริง · ไม่มีการเพิ่มเรทในหน้าทดลอง','sys');});
 const params=new URLSearchParams(location.search);const selected=params.get('zone');if(jobs[params.get('job')])job=params.get('job');
 if(selected==='haunted_forest')travel(selected,Math.min(98,Math.max(80,Number(params.get('level'))||85)));else equip();
 for(const [id,n] of [['white_potion',100],['mana_potion',100],['return_scroll',5]])p.inventory.add(id,n);p.zeny=300000;g.refreshItemsUI();
 const timer=setInterval(()=>{panel.querySelector('.state').textContent=`${g.map.name} · Lv.${p.baseLevel} · ${g.mobs?.list.filter(m=>!m.dead).length||0} มอนในแมพ`;},500);
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 if(window.matchMedia('(max-width:700px)').matches)panel.querySelector('details').open=false;
}
