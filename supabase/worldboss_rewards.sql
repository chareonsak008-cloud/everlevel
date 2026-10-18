-- v0.47 รางวัลพิเศษบอสโลก (รันครั้งเดียว · รันซ้ำได้)
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run
-- ออเร็กซ์: นมผึ้ง×5 ผลึกตีบวก×3/×3 คริสตัลพิทักษ์×1 แกนผู้พิทักษ์×1 กล่องเงิน×2 50,000z + 15% ลุ้นอาวุธสเปกตรัล
-- น็อคธาร์: นมผึ้ง×8 ผลึกตีบวก×4/×4 คริสตัลพิทักษ์×2 มงกุฎสยอง×1 กล่องทอง×1 80,000z + 15% ลุ้นอาวุธจันทร์โลหิต
-- ดาเมจอันดับ 1–3: + กล่องทอง×1 คริสตัลพิทักษ์×1 และ Zeny +60,000/+40,000/+20,000

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
     items:='[["royal_jelly",8],["refine_w",4],["refine_a",4],["refine_guard",2],["dread_crown",1],["box_gold",1]]'::jsonb; z:=80000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",5],["refine_w",3],["refine_a",3],["refine_guard",1],["guardian_core",1],["box_silver",2]]'::jsonb; z:=50000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["box_gold",1],["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*20000; end if;
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
