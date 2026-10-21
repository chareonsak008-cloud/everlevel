-- =====================================================================
-- Everlevel v0.48 — ร้านเพชรใหม่ (รันครั้งเดียว · รันซ้ำได้ · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
--   * เพิ่มหินนำโชค (refine_luck) + ตั๋วสัตว์เลี้ยง 12 ตัว ในรายการไอเทม
--   * ร้านเพชร: ขายสัตว์เลี้ยงรายตัว · หินกันแตก/หินนำโชค · ออร่าทุกชิ้น · ลดราคาทั้งร้าน (VIP คงเดิม)
--   * เลิกขายกล่องแฟชั่นสุ่ม/ไข่สุ่ม · รางวัล VIP รายวันและบอสโลกเปลี่ยนจากกล่องเป็นหินตีบวก
-- =====================================================================

insert into public.item_catalog (id, price, kind) values
('refine_luck',30000,'etc'),
('pet_hamster',0,'usable'),
('pet_squirrel',0,'usable'),
('pet_turtle',0,'usable'),
('pet_finch',0,'usable'),
('pet_golem',0,'usable'),
('pet_fox',0,'usable'),
('pet_wyrm',0,'usable'),
('pet_fawn',0,'usable'),
('pet_phoenix',0,'usable'),
('pet_kraken',0,'usable'),
('pet_whale',0,'usable'),
('pet_qilin',0,'usable')
on conflict (id) do update set price = excluded.price, kind = excluded.kind;

insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('f_dragon', 'fashion', 'o_px_dragon', 1, 199, 'fashion', 'ใหม่', 1),
  ('f_wx_ascend', 'fashion', 'a_wx_ascend', 1, 150, 'fashion', null, 10),
  ('f_wx_heaven', 'fashion', 'a_wx_heaven', 1, 150, 'fashion', null, 11),
  ('f_wx_bloodscythe', 'fashion', 'a_wx_bloodscythe', 1, 120, 'fashion', null, 12),
  ('f_wx_soulscythe', 'fashion', 'a_wx_soulscythe', 1, 100, 'fashion', null, 14),
  ('f_wx_sunfire', 'fashion', 'a_wx_sunfire', 1, 100, 'fashion', null, 15),
  ('f_wx_qi', 'fashion', 'a_wx_qi', 1, 60, 'fashion', null, 17),
  ('f_wx_jade', 'fashion', 'a_wx_jade', 1, 49, 'fashion', null, 18),
  ('f_wx_iron', 'fashion', 'a_wx_iron', 1, 29, 'fashion', null, 19),
  ('f_constellation', 'fashion', 'a_constellation', 1, 150, 'fashion', null, 30),
  ('f_heavenlight', 'fashion', 'a_heavenLight', 1, 150, 'fashion', null, 31),
  ('f_supernova', 'fashion', 'a_supernova', 1, 150, 'fashion', null, 32),
  ('f_blossomstorm', 'fashion', 'a_blossomStorm', 1, 150, 'fashion', null, 33),
  ('f_inferno', 'fashion', 'a_inferno', 1, 120, 'fashion', null, 34),
  ('f_bloodring', 'fashion', 'a_bloodRing', 1, 120, 'fashion', null, 35),
  ('f_thundergod', 'fashion', 'a_thunderGod', 1, 120, 'fashion', null, 36),
  ('f_prism', 'fashion', 'a_prism', 1, 120, 'fashion', null, 37),
  ('f_voidrift', 'fashion', 'a_voidRift', 1, 120, 'fashion', null, 38),
  ('f_soulfire', 'fashion', 'a_soulfire', 1, 100, 'fashion', null, 39),
  ('f_coins', 'fashion', 'a_coins', 1, 100, 'fashion', null, 40),
  ('f_fireworks', 'fashion', 'a_fireworks', 1, 100, 'fashion', null, 41),
  ('f_fire', 'fashion', 'a_fire', 1, 60, 'fashion', null, 42),
  ('f_sparks', 'fashion', 'a_sparks', 1, 60, 'fashion', null, 43),
  ('f_butterflies', 'fashion', 'a_butterflies', 1, 60, 'fashion', null, 44),
  ('f_circle', 'fashion', 'a_circle', 1, 60, 'fashion', null, 45),
  ('f_shadow', 'fashion', 'a_shadow', 1, 60, 'fashion', null, 46),
  ('f_pixels', 'fashion', 'a_pixels', 1, 60, 'fashion', null, 47),
  ('f_fish', 'fashion', 'a_fish', 1, 60, 'fashion', null, 48),
  ('f_lightning', 'fashion', 'a_lightning', 1, 60, 'fashion', null, 49),
  ('f_sakura', 'fashion', 'a_sakura', 1, 29, 'fashion', null, 50),
  ('f_snow', 'fashion', 'a_snow', 1, 29, 'fashion', null, 51),
  ('f_stars', 'fashion', 'a_stars', 1, 29, 'fashion', null, 52),
  ('f_maple', 'fashion', 'a_maple', 1, 29, 'fashion', null, 53),
  ('f_sprinkles', 'fashion', 'a_sprinkles', 1, 29, 'fashion', null, 54),
  ('f_roses', 'fashion', 'a_roses', 1, 29, 'fashion', null, 55),
  ('f_goldleaf', 'fashion', 'a_goldleaf', 1, 29, 'fashion', null, 56),
  ('f_hearts', 'fashion', 'a_hearts', 1, 19, 'fashion', null, 57),
  ('f_notes', 'fashion', 'a_notes', 1, 19, 'fashion', null, 58),
  ('f_bubbles', 'fashion', 'a_bubbles', 1, 19, 'fashion', null, 59),
  ('p_hamster', 'item', 'pet_hamster', 1, 19, 'pet', null, 1),
  ('p_squirrel', 'item', 'pet_squirrel', 1, 19, 'pet', null, 2),
  ('p_turtle', 'item', 'pet_turtle', 1, 39, 'pet', null, 3),
  ('p_finch', 'item', 'pet_finch', 1, 39, 'pet', null, 4),
  ('p_golem', 'item', 'pet_golem', 1, 69, 'pet', null, 5),
  ('p_fox', 'item', 'pet_fox', 1, 69, 'pet', null, 6),
  ('p_wyrm', 'item', 'pet_wyrm', 1, 99, 'pet', null, 7),
  ('p_fawn', 'item', 'pet_fawn', 1, 99, 'pet', null, 8),
  ('p_phoenix', 'item', 'pet_phoenix', 1, 149, 'pet', null, 9),
  ('p_kraken', 'item', 'pet_kraken', 1, 149, 'pet', null, 10),
  ('p_whale', 'item', 'pet_whale', 1, 199, 'pet', 'ใหม่', 11),
  ('p_qilin', 'item', 'pet_qilin', 1, 199, 'pet', 'ใหม่', 12),
  ('r_guard', 'item', 'refine_guard', 1, 15, 'refine', null, 1),
  ('r_guard5', 'item', 'refine_guard', 5, 65, 'refine', 'คุ้ม', 2),
  ('r_luck', 'item', 'refine_luck', 1, 15, 'refine', 'ใหม่', 3),
  ('r_luck5', 'item', 'refine_luck', 5, 65, 'refine', 'คุ้ม', 4),
  ('c_bag', 'item', 'bag_expand', 1, 39, 'convenience', null, 1),
  ('c_storage', 'item', 'storage_expand', 1, 39, 'convenience', null, 2),
  ('c_name', 'item', 'name_change', 1, 59, 'convenience', null, 3),
  ('c_stat', 'item', 'stat_reset', 1, 29, 'convenience', null, 4),
  ('c_skill', 'item', 'skill_reset', 1, 29, 'convenience', null, 5),
  ('c_mega10', 'item', 'megaphone', 10, 25, 'convenience', null, 6),
  ('x_exp15', 'item', 'exp_15', 1, 9, 'boost', null, 1),
  ('x_exp2', 'item', 'exp_2', 1, 19, 'boost', 'ขายดี', 2),
  ('x_exp3', 'item', 'exp_3', 1, 39, 'boost', null, 3),
  ('x_job2', 'item', 'job_2', 1, 19, 'boost', null, 4),
  ('x_drop15', 'item', 'drop_15', 1, 9, 'boost', null, 5),
  ('x_drop2', 'item', 'drop_2', 1, 19, 'boost', null, 6),
  ('x_clover', 'item', 'card_clover', 1, 29, 'boost', null, 7)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price, cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = true;
-- เลิกขายกล่องแฟชั่นสุ่ม / ไข่สุ่ม
update public.cash_products set active = false where id in ('b_gold', 'b_gold11', 'b_silver', 'b_silver11', 'e_galaxy', 'e_moon', 'e_spot', 'f_wx_storm', 'f_wx_myriad');

-- ---------- รางวัล VIP รายวัน (กล่องไม้ → ผลึกตีบวก) ----------
create or replace function public.vip_daily(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ac accounts%rowtype;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform 1 from characters where user_id = uid and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select * into ac from accounts where user_id = uid for update;
  if not found or ac.vip_until is null or ac.vip_until <= now() then raise exception 'not_vip'; end if;
  if ac.vip_daily = public._bkk_today() then raise exception 'already_claimed'; end if;
  perform public._apply(uid, p_slot, jsonb_build_object('inv', '[["refine_w",1],["refine_a",1],["warp_leaf",3],["regen_candy",2]]'::jsonb, 'zeny', 0, 'note', 'รางวัลรายวัน VIP'));
  update accounts set gems = gems + 10, vip_daily = public._bkk_today() where user_id = uid;
  return jsonb_build_object('ok', true, 'gems', ac.gems + 10);
end $$;
revoke all on function public.vip_daily(integer) from public, anon;
grant execute on function public.vip_daily(integer) to authenticated;

-- ---------- รางวัลบอสโลก (กล่อง → หินนำโชค) ----------
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
     items:='[["royal_jelly",8],["refine_w",4],["refine_a",4],["refine_guard",2],["dread_crown",1],["refine_luck",2]]'::jsonb; z:=80000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",5],["refine_w",3],["refine_a",3],["refine_guard",1],["guardian_core",1],["refine_luck",2]]'::jsonb; z:=50000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["refine_luck",1],["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*20000; end if;
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
