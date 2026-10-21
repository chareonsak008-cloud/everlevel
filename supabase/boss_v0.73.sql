-- =====================================================================
-- Everlevel v0.73 — บอส MVP / บอสโลก อึดขึ้น + ของดีจากบอสโลกหายากขึ้น
-- รันใน Supabase Dashboard → SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ ไม่แตะข้อมูลผู้เล่น · ไม่มีคีย์ลับ
-- 1) เลือด MVP ร่วม ×3 (มีผลกับ MVP ที่เกิดรอบถัดไป)
-- 2) เลือดบอสโลก ออเร็กซ์ 600,000 → 3,000,000 · น็อคธาร์ 1,000,000 → 5,000,000 (มีผลรอบถัดไป)
-- 3) โอกาสลุ้นอาวุธจากรางวัลบอสโลก 15% → 5%
-- ค่าในเกม (js/data/maps/index.js · monsters.js · events.js) ตั้งให้ตรงกับไฟล์นี้แล้ว
-- =====================================================================

-- 1) MVP ร่วม
update public.mvp_config set hp = v.hp from (values
  ('gnarlroot', 22650), ('glacia', 89400), ('ignarok', 305700), ('aurex', 420000),
  ('nocthar', 690000), ('tidalos', 1065330), ('crysthar', 1515900), ('aurelion', 2032530)
) as v(mob, hp) where mvp_config.mob = v.mob;

-- 2) บอสโลก: เลือดตอนเกิด (event_tick จาก events.sql · เปลี่ยนแค่ค่า hp)
create or replace function public.event_tick()
returns void language plpgsql security definer set search_path=public as $$
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
  ('world_aurex','ancient_ruins',58,20,3000000,12,'ออเร็กซ์ จอมทัพโลก'),
  ('world_nocthar','haunted_forest',68,48,5000000,20,'น็อคธาร์ ราชันคราสโลก')
 ) as x(type,map_id,tx,ty,hp,hour,name) loop
  s := (d + make_time(b.hour,0,0)) at time zone 'Asia/Bangkok';
  if now()>=s and now()<s+interval '30 minutes' then
   rid:=b.type||':'||d::text;
   insert into world_boss_runs(id,type,map_id,tx,ty,hp,max_hp,starts_at,ends_at,status) values(rid,b.type,b.map_id,b.tx,b.ty,b.hp,b.hp,s,s+interval '30 minutes','active') on conflict do nothing;
   if found then insert into event_notices(message) values('บอสโลก '||b.name||' เกิดที่ '||b.map_id||' ('||b.tx||','||b.ty||')! มีเวลา 30 นาที');end if;
  end if;
 end loop;
 delete from event_notices where created_at<now()-interval '7 days';
end $$;
revoke all on function public.event_tick() from public,anon,authenticated;

-- 3) รางวัลบอสโลก (world_boss_hit จาก gem_exchange.sql v0.50 · เปลี่ยนแค่โอกาสอาวุธ 0.15 → 0.05)
create or replace function public.world_boss_hit(p_id text,p_damage integer,p_slot integer)
returns jsonb language plpgsql security definer set search_path=public as $$
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
     items:='[["royal_jelly",8],["refine_w",4],["refine_a",4],["refine_guard",2],["dread_crown",1],["refine_luck",2]]'::jsonb; z:=27000;
     if random()<0.05 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",5],["refine_w",3],["refine_a",3],["refine_guard",1],["guardian_core",1],["refine_luck",2]]'::jsonb; z:=17000;
     if random()<0.05 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["refine_luck",1],["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*7000; end if;
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
end $$;
revoke all on function public.world_boss_hit(text,integer,integer) from public,anon;
grant execute on function public.world_boss_hit(text,integer,integer) to authenticated;

-- ตรวจผล
select mob, hp from public.mvp_config order by hp;
