// Weekly boundaries use Thailand time, independent of the device timezone.
export const EVENT_RATES = [1, 2, 3, 5, 10, 20, 40];
export function weekKey(ms = Date.now()) {
 const d = new Date(ms + 7 * 3600000);
 d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay()+6)%7));
 return d.toISOString().slice(0,10);
}
export function eventRate(e, now = Date.now()) {
 return e && EVENT_RATES.includes(e.rate) && Date.parse(e.starts_at) <= now && (!e.ends_at || Date.parse(e.ends_at) > now) ? e.rate : 1;
}
export const WORLD_BOSSES = {
 // v0.47 reward = รางวัลทุกคนที่ร่วมพิชิต (ตรงกับ supabase/worldboss_rewards.sql) · chance = ลุ้นอาวุธ 1 ชิ้นแบบสุ่ม · top = โบนัสดาเมจอันดับ 1–3
 world_aurex: { name:'ออเร็กซ์ จอมทัพโลก', map:'ancient_ruins', tx:58, ty:20, hp:600000, hour:12, level:78, base:'aurex',
  reward:{ items:[['royal_jelly',5],['refine_w',3],['refine_a',3],['refine_guard',1],['guardian_core',1],['refine_luck',2]], zeny:17000, chance:{ p:0.15, items:['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'] } } },
 world_nocthar: { name:'น็อคธาร์ ราชันคราสโลก', map:'haunted_forest', tx:68, ty:48, hp:1000000, hour:20, level:99, base:'nocthar',
  reward:{ items:[['royal_jelly',8],['refine_w',4],['refine_a',4],['refine_guard',2],['dread_crown',1],['refine_luck',2]], zeny:27000, chance:{ p:0.15, items:['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'] } } },
};
export const WORLD_TOP_BONUS = { items:[['refine_luck',1],['refine_guard',1]], zeny:[21000,14000,7000] };
export function localBossRuns(now) {
 const d=new Date(now+7*3600000), day=d.toISOString().slice(0,10);
 return Object.entries(WORLD_BOSSES).map(([type,b])=>{
  const starts=Date.parse(`${day}T${String(b.hour).padStart(2,'0')}:00:00+07:00`);
  return {id:`${type}:${day}`,type,map_id:b.map,tx:b.tx,ty:b.ty,hp:b.hp,max_hp:b.hp,starts_at:new Date(starts).toISOString(),ends_at:new Date(starts+1800000).toISOString(),status:now>=starts&&now<starts+1800000?'active':'waiting'};
 });
}
export const WEEKLY_QUESTS = {
 w_hunt: {kind:'weekly',name:'นักล่าประจำสัปดาห์',giver:'aurel',turnIn:'aurel',minLevel:10,intro:'กำจัดมอนสเตอร์ปกติ 150 ตัว รับรางวัลได้สัปดาห์ละครั้ง',done:'ผลงานยอดเยี่ยม! กลับมารับภารกิจรอบใหม่วันจันทร์',wait:'ล่ามอนปกติในแผนที่ที่เหมาะกับเลเวลของคุณ',goals:[{type:'hunt',n:150}],rewards:{exp:[12000,8000],zeny:15000,items:[['orange_potion',20],['refine_w',2]]}},
 w_explore: {kind:'weekly',name:'สำรวจสามดินแดน',giver:'aurel',turnIn:'aurel',minLevel:20,intro:'เยี่ยมชมทุ่งเริ่มต้น ป่ากระซิบ และยอดเขาหิมะในสัปดาห์นี้',done:'ขอบคุณที่สำรวจดินแดน!',wait:'เดินทางผ่านประตูของแผนที่ทั้งสาม',goals:[{type:'visit',map:'beginner_field'},{type:'visit',map:'whisper_forest'},{type:'visit',map:'frostveil'}],rewards:{exp:[20000,12000],zeny:20000,items:[['refine_a',3]]}},
 w_world: {kind:'weekly',name:'ผู้ร่วมพิชิตบอสโลก',giver:'aurel',turnIn:'aurel',minLevel:60,intro:'ร่วมโจมตีบอสโลกจนบอสถูกกำจัด 2 รอบ · ทุกคนที่มีส่วนร่วมจะนับความคืบหน้า',done:'ขอบคุณที่ปกป้องโลก!',wait:'บอสเกิดเวลาไทย 12:00 และ 20:00 อยู่ได้ 30 นาที',goals:[{type:'world',n:2}],rewards:{exp:[100000,65000],zeny:60000,items:[['refine_guard',1],['royal_jelly',10]]}},
};
