import { EVENT_RATES, WORLD_BOSSES } from '../data/events.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>s?new Date(s).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false}):'ตลอด';
export class EventWindow {
 constructor(root,g){
  this.g=g;this.open=false;this.el=document.createElement('section');this.el.className='panel event-window';this.el.hidden=true;this.el.setAttribute('aria-label','อีเวนต์และกิจกรรม');root.append(this.el);
  for(const e of ['pointerdown','wheel','contextmenu'])this.el.addEventListener(e,x=>x.stopPropagation());
  this.el.addEventListener('click',e=>{if(e.target.closest('[data-close]'))this.toggle(false);if(e.target.closest('[data-refresh]'))void g.events.refresh();if(e.target.closest('[data-quests]')){this.toggle(false);g.questWin.tab='weekly';g.toggleQuests(true);}});
  this.el.addEventListener('submit',async e=>{
   e.preventDefault();const f=e.target;if(!f.matches('form'))return;const b=f.querySelector('button');b.disabled=true;
   const d=new FormData(f),minutes=d.get('duration')==='always'?null:Number(d.get('minutes'));
   try{if(minutes!==null&&(!Number.isFinite(minutes)||minutes<1||minutes>10080))throw new Error('เลือกเวลา 1–10,080 นาที');await g.events.setRate(d.get('kind'),Number(d.get('rate')),minutes);}catch(x){this.message=x.message;this.render(true);}finally{b.disabled=false;this.render(true);}
  });
 }
 toggle(force){this.open=typeof force==='boolean'?force:!this.open;this.el.hidden=!this.open;if(this.open){this.render();void this.g.events.refresh();}}
 render(force=false){
  if(!this.open)return;
  if(!force && this.el.querySelector('form')?.contains(document.activeElement))return;const s=this.g.events,state=s.state;
  this.el.innerHTML=`<header><h2>🎉 อีเวนต์และกิจกรรม</h2><button data-close type="button" aria-label="ปิด">✕</button></header>
  <p>${s.online?'กิจกรรมทั้งเซิร์ฟเวอร์':'โหมดออฟไลน์ · GM ทดสอบเฉพาะเครื่องนี้'}</p><p role="status">${esc(this.message||s.error)}</p>
  <div class="ev-rates"><strong>EXP ×${s.rate('exp')}</strong><strong>ดรอป ×${s.rate('drop')}</strong></div>
  <p>EXP มีผลต่อ Base และ Job จากมอน · ดรอปรวมการ์ด · โอกาสสูงสุด 100% · คูณร่วมกับบัฟไอเทม</p>
  ${['exp','drop'].map(k=>state?.rates?.[k]?`<p>${k.toUpperCase()} ×${state.rates[k].rate} สิ้นสุด: ${esc(time(state.rates[k].ends_at))}</p>`:'').join('')}
  <h3>บอสโลก · เวลาไทย · รอบละ 30 นาที</h3>${Object.entries(WORLD_BOSSES).map(([id,b])=>{const r=state?.runs?.find(x=>x.type===id);return `<article><b>${esc(b.name)} Lv.${b.level}</b><p>${esc(b.map==='ancient_ruins'?'Ancient Ruins':'Haunted Forest')} (${b.tx}, ${b.ty}) · ${b.hour}:00 น. ทุกวัน</p><p>${r?.status==='active'?`กำลังต่อสู้ · HP ${Number(r.hp).toLocaleString()} / ${Number(r.max_hp).toLocaleString()}`:r?.status==='defeated'?'ถูกกำจัดแล้ว':'รอรอบถัดไป'}</p></article>`;}).join('')}
  <button data-quests type="button">📜 ภารกิจรายสัปดาห์</button><p>รับและส่งที่ออเรลในเมือง · รีเซ็ตจันทร์ 00:00 น. เวลาไทย · ความคืบหน้ารอบเก่าจะหมดอายุ</p>
  ${state?.admin?`<h3>GM · ตั้งค่ากิจกรรม</h3><form><label>กิจกรรม<select name="kind"><option value="exp">EXP (Base + Job)</option><option value="drop">ดรอป + การ์ด</option></select></label><label>ตัวคูณ<select name="rate">${EVENT_RATES.map(r=>`<option value="${r}">${r===1?'ปิดกิจกรรม (×1)':'×'+r}</option>`).join('')}</select></label><label>ระยะเวลา<select name="duration"><option value="timed">กำหนดเวลา</option><option value="always">ตลอดจน GM ปิด</option></select></label><label>นาที<input name="minutes" type="number" min="1" max="10080" value="60"></label><button type="submit">เปิด / เปลี่ยนกิจกรรม</button></form>`:''}
  <button data-refresh type="button">ตรวจสถานะล่าสุด</button>`;
 }
}
