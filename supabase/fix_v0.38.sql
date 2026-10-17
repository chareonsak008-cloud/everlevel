-- Everlevel v0.38: แก้ไขฐานข้อมูล v0.38 — (1) แก้บอสโลกตีไม่ตายตอนเลือดใกล้หมด (ตีครั้งสุดท้ายเกิด error "column reference is ambiguous" แล้วยกเลิกทั้งหมด)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run (รันซ้ำได้ ไม่มีคีย์ลับ)
-- (2) สถิติหอคอยติดไปกับตัวละครใหม่ในช่องเดิม · ต้องเคยรัน events.sql และ tower.sql แล้ว
create or replace function public.world_boss_hit(p_id text,p_damage integer,p_slot integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare b world_boss_runs; p world_boss_participants; c record; v_damage integer; mail bigint; w record;
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
  for w in select wp.user_id,ch.name from world_boss_participants wp join characters ch on ch.user_id=wp.user_id and ch.slot=wp.slot where wp.run_id=p_id and wp.damage>0 loop   -- v0.38: เดิมใช้ชื่อ p/c ซ้ำกับตัวแปร → error ตอนตีครั้งสุดท้าย บอสเลยไม่ตาย
   insert into world_boss_rewards(run_id,user_id) values(p_id,w.user_id) on conflict do nothing;
   if found then
    insert into mails(to_name,sender,title,body,items,zeny,per)
    values(w.name,'World Event','รางวัลบอสโลก','ขอบคุณที่ร่วมพิชิต '||b.type||' · รอบ '||p_id,'[["royal_jelly",5],["refine_w",2],["refine_a",2]]'::jsonb,30000,'account') returning id into mail;
    update world_boss_rewards set mail_id=mail where run_id=p_id and user_id=w.user_id;
   end if;
  end loop;
 end if;
 return jsonb_build_object('hp',b.hp,'status',b.status,'damage',v_damage,'defeated_at',b.defeated_at);
end $$;
revoke all on function public.world_boss_hit(text,integer,integer) from public,anon;
grant execute on function public.world_boss_hit(text,integer,integer) to authenticated;
-- v0.38: ลบตัวละคร = ลบสถิติหอคอยของช่องนั้นด้วย (ข้ามถ้ายังไม่เคยรัน tower.sql)
do $$
begin
  if to_regclass('public.tower_records') is not null then
    delete from public.tower_records t where not exists (select 1 from public.characters c where c.user_id = t.user_id and c.slot = t.slot);
    alter table public.tower_records drop constraint if exists tower_records_char_fk;
    alter table public.tower_records add constraint tower_records_char_fk foreign key (user_id, slot) references public.characters (user_id, slot) on delete cascade;
  end if;
end $$;
