import { eventRate, localBossRuns, WORLD_BOSSES, weekKey } from '../data/events.js';
import { TILE } from '../config.js';
export class EventService {
 constructor(game) {
  this.storagePrefix=window.__contentPreview?'everlevel-preview':'everlevel-local';
  this.g=game; this.state=null; this.error=''; this.timer=0; this.busy=false; this.hits=new Map(); this.seen=new Set(); this.initial=false; this.localRuns=new Map();
  try { this.localEvents=JSON.parse(localStorage.getItem(this.storagePrefix+'-events')||'{}'); } catch {this.localEvents={};}
  try {this.localRuns=new Map(JSON.parse(localStorage.getItem(this.storagePrefix+'-bosses')||'[]'));}catch{}
 }
 get online() {return this.g.mode==='online';}
 now() {return this.online&&this.serverAt ? this.serverAt+(performance.now()-this.receivedAt) : Date.now();}
 get fresh() {return !this.online || (this.state && performance.now()-this.receivedAt<30000);}
 rate(kind) {return this.fresh ? eventRate(this.state?.rates?.[kind],this.now()) : 1;}
 update(dt) {
  this.timer-=dt;
  if(this.timer<=0&&!this.busy){this.timer=this.online?5:1;void this.refresh();}
  this.syncBosses();
 }
 async refresh() {
  if(this.busy)return; this.busy=true;
  try {
   let s;
   if(this.online) {
    if(!this.g.online?.eventSnapshot) throw new Error('ระบบนี้ต้องใช้เซิร์ฟเวอร์ Supabase และติดตั้ง events.sql');
    s=await this.g.online.eventSnapshot();
    this.serverAt=Date.parse(s.server_time); this.receivedAt=performance.now();
   } else {
    const now=this.now(); const runs=localBossRuns(now).map(r=>{const old=this.localRuns.get(r.id);if(old){r.hp=old.hp;if(r.status==='active'&&old.status==='defeated')r.status='defeated';r.participated=old.participated;r.defeated_at=old.defeated_at;}this.localRuns.set(r.id,r);return r;});
    this.localRuns=new Map(runs.map(r=>[r.id,r]));
    s={server_time:new Date(now).toISOString(),admin:true,rates:this.localEvents,runs,notices:[]};
   }
   for(const n of s.notices||[]) {
    if(!this.seen.has(n.id)&&(this.initial||Date.parse(n.created_at)>this.now()-60000)) this.g.hud.log('📣 '+n.message,'r-epic');
    this.seen.add(n.id);
   }
   for(const r of s.runs||[]) {const prev=this.state?.runs?.find(x=>x.id===r.id);if(prev){r.hp=Math.min(r.hp,prev.hp);if(prev.status==='defeated'&&r.status==='active')r.status='defeated';}}
   if(!this.online) for(const r of s.runs) if(r.status==='active'&&!this.seen.has(r.id)){this.seen.add(r.id);this.g.hud.log(`📣 ${WORLD_BOSSES[r.type].name} เกิดแล้ว! เปิดเมนูอีเวนต์ดูตำแหน่ง`,'r-epic');}
   this.state=s;this.initial=true;this.error='';
   for(const r of s.runs||[]) if(r.status==='defeated'&&r.participated) this.credit(r.id,r.defeated_at||r.ends_at,r.starts_at);
   this.syncBosses();this.g.eventWin?.render();
  } catch(e) {this.error=e.message||'เชื่อมต่ออีเวนต์ไม่ได้';this.g.eventWin?.render();}
  finally {this.busy=false;}
 }
 credit(id,at=new Date(this.now()).toISOString(),starts=at) {
  const q=this.g.player.quests, key=weekKey(this.now());q.worldRuns ||= {};
  if(weekKey(Date.parse(at))!==key)return;
  // Bounded save metadata; each completed run counts once even after reconnect.
  for(const k of Object.keys(q.worldRuns))if(q.worldRuns[k]!==key)delete q.worldRuns[k];
  if(q.worldRuns[id])return;q.worldRuns[id]=key;
  if(this.online)void this.g.mailbox?.refresh?.();
  if(q.active.w_world&&q.active.w_world.at<=Date.parse(at))this.g.questEvents(this.g.questLog.onWorldBoss());this.g.dirty=true;void this.g.saveNow(false);
 }
 async setRate(kind,rate,minutes) {
  if(!this.state?.admin)throw new Error('บัญชีนี้ไม่มีสิทธิ์ GM');
  if(this.online) await this.g.online.setEventRate(kind,rate,minutes);
  else {
   this.localEvents[kind]={rate,starts_at:new Date(this.now()).toISOString(),ends_at:minutes===null?null:new Date(this.now()+minutes*60000).toISOString()};
   localStorage.setItem(this.storagePrefix+'-events',JSON.stringify(this.localEvents));
   this.g.hud.log(`📣 อีเวนต์ทดสอบ ${kind.toUpperCase()} ×${rate}`,'r-epic');
  }
  await this.refresh();
 }
 syncBosses() {
  const g=this.g;if(!g.mobs||!g.started)return;
  const valid=(this.fresh?this.state?.runs||[]:[]).filter(r=>r.map_id===g.map.def.id&&r.status==='active'&&Date.parse(r.ends_at)>this.now());
  const ids=new Set(valid.map(r=>r.id));
  for(const m of [...g.mobs.list])if(m.worldRun&&!ids.has(m.worldRun)){if(g.player.target===m)g.clearTarget();g.gfx.removeActor(m);g.mobs.remove(m);}
  for(const r of valid){let m=g.mobs.list.find(m=>m.worldRun===r.id);if(!m){m=g.mobs.spawnAt(r.type,r.tx*TILE+8,r.ty*TILE+8);m.worldRun=r.id;m.name=WORLD_BOSSES[r.type].name;m.maxHp=r.max_hp;g.gfx.addMonster(m);g.gfx.playRespawn(m);}m.hp=Math.min(m.hp,r.hp);}
 }
 async hit(m,r,magic) {
  if(!this.fresh)return;
  if(this.hits.has(m.worldRun)){this.hits.set(m.worldRun,Math.min(15000,this.hits.get(m.worldRun)+r.amount));return;}
  this.hits.set(m.worldRun,0);
  try {
   let result;
   if(this.online){await new Promise(resolve=>setTimeout(resolve,220));result=await this.g.online.hitWorldBoss(m.worldRun,Math.max(1,Math.floor(r.amount)),this.g.slot);}
   else {const b=this.localRuns.get(m.worldRun);if(!b||b.status!=='active')return;b.hp=Math.max(0,b.hp-r.amount);b.participated=true;if(!b.hp){b.status='defeated';b.defeated_at=new Date(this.now()).toISOString();}localStorage.setItem(this.storagePrefix+'-bosses',JSON.stringify([...this.localRuns]));result=b;}
   m.hp=result.hp;if(this.g.mobs?.list.includes(m)){this.g.gfx.playHurt(m);this.g.gfx.floatText(m,String(result.damage??r.amount),magic?'hit magic':'hit');this.g.sfx('hit');}
   const b=this.state?.runs?.find(x=>x.id===m.worldRun);if(b)Object.assign(b,result);
   if(result.status==='defeated'){
    this.g.hud.log('🏆 บอสโลกถูกกำจัด! ผู้ร่วมต่อสู้รับรางวัลทางจดหมาย','r-epic');
    if(!this.online){this.g.player.addZeny(30000);this.g.player.inventory.add('royal_jelly',5);this.credit(m.worldRun,result.defeated_at);this.g.hud.log('โหมดทดสอบ: ได้รับ 30,000 Zeny และรอยัลเจลลี่ 5 ชิ้น','sys');}
    await this.refresh();
   }
  }catch(e){this.error=e.message;this.g.eventWin?.render();}
  finally{const queued=this.hits.get(m.worldRun);this.hits.delete(m.worldRun);if(queued>0&&m.hp>0&&this.g.mobs?.list.includes(m))void this.hit(m,{amount:queued},magic);}
 }
}
