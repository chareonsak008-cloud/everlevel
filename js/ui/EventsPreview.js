// Offline demo only. Never imported by the production entry point.
import { WORLD_BOSSES } from '../data/events.js';
const timer=setInterval(()=>{const g=window.asteria;if(!g?.started||!document.querySelector('#contentPreview'))return;clearInterval(timer);init(g);},100);
function init(g){
 const p=g.player,events=g.events;let fakeTime=Date.parse('2026-10-11T12:05:00+07:00'),anchor=performance.now();
 events.now=()=>fakeTime+(performance.now()-anchor);events.localEvents={};events.localRuns.clear();events.state=null;events.initial=false;
 const bar=document.createElement('section');bar.className='event-demo';bar.innerHTML='<b>ทดลองอีเวนต์ · ออฟไลน์</b><p>จำลองเวลาต่อสู้ · ไม่มีผลกับเซิร์ฟเวอร์จริง</p>';document.querySelector('#contentPreview details').append(bar);
 const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.type='button';b.onclick=fn;bar.append(b);};
 button('เปิดหน้า GM',()=>g.eventWin.toggle(true));
 for(const [id,b]of Object.entries(WORLD_BOSSES))button('ทดสอบ '+b.name,()=>{
  fakeTime=Date.parse(`2026-10-11T${b.hour}:05:00+07:00`);anchor=performance.now();events.localRuns.clear();events.state=null;g.eventWin.toggle(false);
  g.warp(b.map,{x:b.tx-5,y:b.ty},()=>{void events.refresh();});
 });
 button('รับเควสรายสัปดาห์',()=>{for(const id of ['w_hunt','w_explore','w_world']){const x=g.questLog.accept(id);if(x.ok)g.hud.log('รับภารกิจ '+id,'sys');}g.questWin.tab='weekly';g.toggleQuests(true);});
 void events.refresh();
}
