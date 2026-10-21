-- =====================================================================
-- Everlevel v0.88 — บอส MVP และบอสโลกยากขึ้นอีก
-- รันใน Supabase → SQL Editor (วางทั้งไฟล์ → Run) · รันหลัง update_v0.86.sql · รันซ้ำได้ · ไม่มีคีย์ลับ
-- 1) MVP เลือด ×2 จากรอบ v0.85 (รวม ×10 จากค่าเดิม) · ตัวที่เกิดอยู่ตอนนี้ปรับตามด้วย
-- 2) บอสโลก ออเร็กซ์ 40,000,000 · น็อคธาร์ 70,000,000 (มีผลรอบถัดไป)
-- (ตีแรงขึ้น/ท่าพิเศษถี่ขึ้น อยู่ในไฟล์เกมแล้ว ไม่ต้องทำอะไรเพิ่ม)
-- =====================================================================

-- 1) MVP
update public.mvp_config set hp = v.hp from (values
  ('gnarlroot', 226500), ('glacia', 894000), ('ignarok', 3057000), ('aurex', 4200000),
  ('nocthar', 6900000), ('tidalos', 10653300), ('crysthar', 15159000), ('aurelion', 20325300)
) as v(mob, hp) where mvp_config.mob = v.mob;
update public.mvp_runs r set hp = r.hp * 2, max_hp = r.max_hp * 2
  from public.mvp_config c where c.mob = r.mob and r.status = 'alive' and r.max_hp * 2 <= c.hp;

-- 2) บอสโลก
CREATE OR REPLACE FUNCTION public.event_tick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
 d date := (now() at time zone 'Asia/Bangkok')::date;
 b record; r record; s timestamptz; rid text;
begin
 perform pg_advisory_xact_lock(230001);
 for r in update game_events set expired_notice=true
  where ends_at<=now() and rate>1 and not expired_notice returning * loop
  insert into event_notices(message) values(upper(r.kind)||' ×'||r.rate||' สิ้นสุดแล้ว');
 end loop;
 for r in update world_boss_runs set status='expired'
  where status='active' and ends_at<=now() returning * loop
  insert into event_notices(message) values('บอสโลก '||(case r.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' หมดเวลาต่อสู้แล้ว');
 end loop;
 for b in select * from (values
  ('world_aurex','ancient_ruins',58,20,40000000,12,'ออเร็กซ์ จอมทัพโลก'),
  ('world_nocthar','haunted_forest',68,48,70000000,20,'น็อคธาร์ ราชันคราสโลก')
 ) as x(type,map_id,tx,ty,hp,hour,name) loop
  s := (d + make_time(b.hour,0,0)) at time zone 'Asia/Bangkok';
  if now()>=s and now()<s+interval '30 minutes' then
   rid:=b.type||':'||d::text;
   insert into world_boss_runs(id,type,map_id,tx,ty,hp,max_hp,starts_at,ends_at,status) values(rid,b.type,b.map_id,b.tx,b.ty,b.hp,b.hp,s,s+interval '30 minutes','active') on conflict do nothing;
   if found then insert into event_notices(message) values('บอสโลก '||b.name||' เกิดที่ '||b.map_id||' ('||b.tx||','||b.ty||')! มีเวลา 30 นาที');end if;
  end if;
 end loop;
 delete from event_notices where created_at<now()-interval '7 days';
end $function$;
revoke all on function public.event_tick() from public, anon, authenticated;

-- ตรวจผล
select mob, hp from public.mvp_config order by hp;
