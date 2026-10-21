-- =====================================================================
-- Everlevel v0.85 — อาชีพคลาส 3 · บอส/ดันเจี้ยนยากขึ้น · MVP เกิดทุก 2 ชั่วโมง · หินนำโชคหายากขึ้น · VIP รายวันใหม่
-- รันใน Supabase → SQL Editor (วางทั้งไฟล์ → Run) · รันหลัง anticheat_v0.82.sql · รันซ้ำได้ · ไม่มีคีย์ลับ
-- =====================================================================

-- 1) อาชีพคลาส 3 ในระบบกันโกง (ถ้าไม่รัน เซฟของผู้เล่นคลาส 3 จะถูกปฏิเสธ)
create or replace function public._job_max(job text)
returns int language sql immutable as $$
  select case when job = 'novice' then 10
              when job in ('swordsman', 'mage', 'archer', 'acolyte') then 99
              when job in ('knight', 'wizard', 'hunter', 'priest') then 70
              when job in ('heroking', 'archmage', 'bladearcher', 'goddess') then 50 else 0 end
$$;
create or replace function public._job_tier(job text)
returns int language sql immutable as $$
  select case when job = 'novice' then 0 when job in ('heroking', 'archmage', 'bladearcher', 'goddess') then 3
              when job in ('knight', 'wizard', 'hunter', 'priest') then 2
              when job in ('swordsman', 'mage', 'archer', 'acolyte') then 1 else -1 end
$$;
-- แต้มสกิลทั้งหมด: Novice Job Lv-1 · ขั้น 1 = 9 + (Job Lv-1) · ขั้น 2 = 9 + (ขั้น1-1) + (Job Lv-1) · คลาส 3 = 9 + (ขั้น1-1) + (ขั้น2-1) + (Job Lv-1)
create or replace function public._skill_budget(job text, jl int, jl1 int, jl2 int)
returns int language sql immutable as $$
  select case public._job_tier(job) when 0 then jl - 1 when 1 then 9 + jl - 1 when 2 then 9 + (jl1 - 1) + (jl - 1)
              when 3 then 9 + (jl1 - 1) + (jl2 - 1) + (jl - 1) else 0 end
$$;
revoke all on function public._job_max(text), public._job_tier(text), public._skill_budget(text, int, int, int) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._char_check(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  job text := p->>'job'; lv bigint := public._ji(p->'baseLevel'); jl bigint := public._ji(p->'jobLevel');
  jl1 bigint := coalesce(public._ji(p->'jobLv1'), 0); jl2 bigint := coalesce(public._ji(p->'jobLv2'), 0); sp bigint := coalesce(public._ji(p->'statPoints'), 0);
  kp bigint := coalesce(public._ji(p->'skillPoints'), 0); hard text; spent bigint := 0; kspent bigint := 0;
  k text; v bigint; e record;
begin
  if lv is null or lv < 1 or lv > 150 then hard := 'baseLevel'; end if;
  if public._job_tier(job) < 0 then hard := coalesce(hard, 'job'); job := 'novice'; end if;
  if jl is null or jl < 1 or jl > public._job_max(job) then hard := coalesce(hard, 'jobLevel'); end if;
  if public._job_tier(job) >= 2 and (jl1 < 40 or jl1 > 99) then hard := coalesce(hard, 'jobLv1'); end if;
  if public._job_tier(job) = 3 and (jl2 < 50 or jl2 > 70) then hard := coalesce(hard, 'jobLv2'); end if;
  if sp < 0 or kp < 0 then hard := coalesce(hard, 'points'); end if;
  foreach k in array array['str', 'agi', 'vit', 'int', 'dex', 'luk'] loop
    v := coalesce(public._ji(p->'attr'->k), 1);
    if v < 1 or v > 130 then hard := coalesce(hard, 'attr_' || k); v := least(130, greatest(1, v)); end if;
    spent := spent + public._stat_cost_to(v::int);
  end loop;
  if jsonb_typeof(p->'skills') = 'object' then
    for e in select key, value from jsonb_each(p->'skills') loop
      v := public._ji(e.value);
      if v is null or v < 0 or v > 10 then hard := coalesce(hard, 'skill_' || left(e.key, 20)); continue; end if;
      if e.key <> 'first_aid' then kspent := kspent + v; end if;
    end loop;
  end if;
  lv := least(150, greatest(1, coalesce(lv, 1))); jl := least(99, greatest(1, coalesce(jl, 1)));
  return jsonb_build_object('hard', hard,
    'sx', spent + sp - public._stat_budget(lv::int),
    'kx', kspent + kp - public._skill_budget(job, jl::int, least(99, greatest(1, jl1))::int, least(70, greatest(1, jl2))::int));
end $function$;
revoke all on function public._char_check(jsonb) from public, anon, authenticated;

-- 2) MVP: เลือด ×5 · เกิดใหม่ทุก 2 ชั่วโมงหลังถูกล้ม
update public.mvp_config set hp = v.hp, rmin = 7200, rmax = 7200 from (values
  ('gnarlroot', 113250), ('glacia', 447000), ('ignarok', 1528500), ('aurex', 2100000),
  ('nocthar', 3450000), ('tidalos', 5326650), ('crysthar', 7579500), ('aurelion', 10162650)
) as v(mob, hp) where mvp_config.mob = v.mob;
-- MVP ที่เกิดอยู่ตอนนี้ปรับเลือดตามไปด้วย (ตัวที่ยังเป็นค่าเก่า) · ตัวที่ตายอยู่ นับเวลาเกิดใหม่ 2 ชั่วโมงจากตอนตาย
update public.mvp_runs r set hp = r.hp * 5, max_hp = r.max_hp * 5
  from public.mvp_config c where c.mob = r.mob and r.status = 'alive' and r.max_hp * 5 <= c.hp;
update public.mvp_runs set respawn_at = killed_at + interval '2 hours' where status = 'dead' and killed_at is not null and respawn_at < killed_at + interval '2 hours';

-- 3) บอสโลก: เลือด ×5 (ออเร็กซ์ 15,000,000 · น็อคธาร์ 25,000,000 — มีผลรอบถัดไป)
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
  ('world_aurex','ancient_ruins',58,20,15000000,12,'ออเร็กซ์ จอมทัพโลก'),
  ('world_nocthar','haunted_forest',68,48,25000000,20,'น็อคธาร์ ราชันคราสโลก')
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

-- 4) รางวัลบอสโลกลดลง · หินนำโชคเฉพาะดาเมจอันดับ 1
CREATE OR REPLACE FUNCTION public.world_boss_hit(p_id text, p_damage integer, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b world_boss_runs; p world_boss_participants; c record; v_damage integer; mail bigint; w record; items jsonb; z bigint;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 if p_damage is null or p_damage<=0 then raise exception 'Invalid damage';end if;
 select * into c from characters where user_id=auth.uid() and slot=p_slot;
 if not found then raise exception 'Character not found' using errcode='42501';end if;
 perform public.event_tick();
 select * into b from world_boss_runs where id=p_id for update;
 if not found then raise exception 'Boss round not found';end if;
 if b.status<>'active' or b.ends_at<=now() then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 if c.lv<60 then raise exception 'World bosses require Base Lv.60';end if;
 insert into world_boss_participants(run_id,user_id,slot) values(p_id,auth.uid(),p_slot) on conflict do nothing;
 select * into p from world_boss_participants where run_id=p_id and user_id=auth.uid() for update;
 if p.last_hit>now()-interval '200 milliseconds' then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 v_damage:=least(p_damage,15000,b.hp);
 update world_boss_participants set damage=damage+v_damage,last_hit=now(),slot=p_slot where run_id=p_id and user_id=auth.uid();
 update world_boss_runs set hp=hp-v_damage,defeated_at=case when hp-v_damage<=0 then now() else null end,status=case when hp-v_damage<=0 then 'defeated' else 'active' end where id=p_id returning * into b;
 if b.status='defeated' then
  insert into event_notices(message) values('บอสโลก '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' ถูกกำจัดแล้ว! ผู้ร่วมต่อสู้รับรางวัลทางจดหมาย');
  -- v0.47 รางวัลพิเศษของแต่ละบอสโลก + โบนัสอันดับดาเมจ 1–3 + โอกาสลุ้นอาวุธ
  for w in select wp.user_id,ch.name,row_number() over (order by wp.damage desc) as rk
           from world_boss_participants wp join characters ch on ch.user_id=wp.user_id and ch.slot=wp.slot
           where wp.run_id=p_id and wp.damage>0 loop
   insert into world_boss_rewards(run_id,user_id) values(p_id,w.user_id) on conflict do nothing;
   if found then
    if b.type='world_nocthar' then
     items:='[["royal_jelly",4],["refine_w",2],["refine_a",2],["refine_guard",1],["dread_crown",1]]'::jsonb; z:=18000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",3],["refine_w",2],["refine_a",2],["guardian_core",1]]'::jsonb; z:=12000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*7000; end if;
    if w.rk=1 then items:=items||'[["refine_luck",1]]'::jsonb; end if;   -- v0.85 หินนำโชคเฉพาะดาเมจอันดับ 1
    select jsonb_agg(jsonb_build_array(k,q)) into items from (select e->>0 k,sum((e->>1)::int) q from jsonb_array_elements(items) e group by 1) t;   -- รวมของชนิดเดียวกัน
    insert into mails(to_name,sender,title,body,items,zeny,per)
    values(w.name,'World Event',case when w.rk<=3 then 'รางวัลบอสโลก · ดาเมจอันดับ '||w.rk else 'รางวัลบอสโลก' end,
           'ขอบคุณที่ร่วมพิชิต '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' · รอบ '||p_id||case when w.rk<=3 then ' · คุณทำดาเมจอันดับ '||w.rk||' ได้โบนัสเพิ่ม' else '' end,
           items,z,'account') returning id into mail;
    update world_boss_rewards set mail_id=mail where run_id=p_id and user_id=w.user_id;
   end if;
  end loop;
 end if;
 return jsonb_build_object('hp',b.hp,'status',b.status,'damage',v_damage,'defeated_at',b.defeated_at);
end $function$;

-- 5) ดันเจี้ยนปาร์ตี้: เลือดบอส ×5
CREATE OR REPLACE FUNCTION public.pd_open(p_slot integer, p_pid text, p_boss text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); c record; r pd_runs; lv int; per bigint;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_pid is null or p_pid !~ '^[a-z0-9]{6,12}$' then raise exception 'bad_party'; end if;
  select * into c from characters where user_id = uid and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  if coalesce(c.lv, 1) < 30 then raise exception 'low_level'; end if;
  if public._pd_left(uid) <= 0 then raise exception 'weekly_limit'; end if;
  if exists (select 1 from pd_runs where pid = p_pid and status = 'active' and now() < ends_at and created_at > now() - interval '20 minutes') then raise exception 'already_open'; end if;
  lv := least(150, greatest(30, coalesce(c.lv, 30)));
  per := (20000 + lv * lv * 60) * 5;   -- v0.85 บอสดันเจี้ยนปาร์ตี้ เลือด ×5
  insert into pd_runs (pid, owner, level, boss, seed, per_hp, hp, max_hp, starts_at, ends_at)
  values (p_pid, uid, lv, case when p_boss in ('aurex', 'nocthar', 'ignarok', 'glacia') then p_boss else 'aurex' end,
          floor(random() * 2000000000)::int, per, per, per, now() + interval '10 seconds', now() + interval '10 seconds' + interval '15 minutes')
  returning * into r;
  insert into pd_members (run_id, user_id, slot, name) values (r.id, uid, p_slot, c.name);
  return public._pd_row(r);
end $function$;

-- 6) VIP รายวัน: ไม่แจกเพชรแล้ว · ได้ขนนกคืนชีพ ×5
CREATE OR REPLACE FUNCTION public.vip_daily(p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); ac accounts%rowtype;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform 1 from characters where user_id = uid and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select * into ac from accounts where user_id = uid for update;
  if not found or ac.vip_until is null or ac.vip_until <= now() then raise exception 'not_vip'; end if;
  if ac.vip_daily = public._bkk_today() then raise exception 'already_claimed'; end if;
  perform public._apply(uid, p_slot, jsonb_build_object('inv', '[["phoenix_feather",5]]'::jsonb, 'zeny', 0, 'note', 'รางวัลรายวัน VIP'));
  update accounts set vip_daily = public._bkk_today() where user_id = uid;
  return jsonb_build_object('ok', true, 'gems', ac.gems);
end $function$;

-- ตรวจผล
select mob, hp, rmin, rmax from public.mvp_config order by hp;
