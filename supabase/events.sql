-- Everlevel v0.23.0: run AFTER setup.sql and mail.sql. Idempotent, no secret keys.
-- Server timestamps, GM authorization, row locks and reward uniqueness live here.
create table if not exists public.game_events (
 kind text primary key check(kind in ('exp','drop')),
 rate integer not null check(rate in (1,2,3,5,10,20,40)),
 starts_at timestamptz not null default now(), ends_at timestamptz,
 expired_notice boolean not null default false
);
create table if not exists public.event_notices (
 id bigint generated always as identity primary key,
 message text not null, created_at timestamptz not null default now()
);
create table if not exists public.world_boss_runs (
 id text primary key, type text not null, map_id text not null,
 tx integer not null, ty integer not null, hp integer not null check(hp>=0),max_hp integer not null,
 starts_at timestamptz not null, ends_at timestamptz not null,
 defeated_at timestamptz,
 status text not null check(status in ('active','defeated','expired'))
);
create table if not exists public.world_boss_participants (
 run_id text not null references public.world_boss_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 slot integer not null, damage bigint not null default 0,
 last_hit timestamptz not null default '-infinity',
 primary key(run_id,user_id)
);
create table if not exists public.world_boss_rewards (
 run_id text not null references public.world_boss_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 mail_id bigint references public.mails(id) on delete set null,
 primary key(run_id,user_id)
);
alter table public.world_boss_runs add column if not exists defeated_at timestamptz;
alter table public.game_events enable row level security;
alter table public.event_notices enable row level security;
alter table public.world_boss_runs enable row level security;
alter table public.world_boss_participants enable row level security;
alter table public.world_boss_rewards enable row level security;
revoke all on public.game_events,public.event_notices,public.world_boss_runs,public.world_boss_participants,public.world_boss_rewards from anon,authenticated;

-- Called by snapshot and optional cron. Does nothing twice for the same round.
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
  ('world_aurex','ancient_ruins',58,20,600000,12,'ออเร็กซ์ จอมทัพโลก'),
  ('world_nocthar','haunted_forest',68,48,1000000,20,'น็อคธาร์ ราชันคราสโลก')
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

create or replace function public.event_snapshot(p_slot integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 perform public.event_tick();
 select jsonb_build_object('server_time',now(),'admin',public.is_admin(),
  'rates',coalesce((select jsonb_object_agg(kind,jsonb_build_object('rate',rate,'starts_at',starts_at,'ends_at',ends_at)) from game_events),'{}'::jsonb),
  'notices',coalesce((select jsonb_agg(n order by n.id) from (select id,message,created_at from event_notices where created_at>now()-interval '1 hour' order by id desc limit 60)n),'[]'::jsonb),
  'runs',coalesce((select jsonb_agg(x order by x.starts_at desc) from (
   select r.*,exists(select 1 from world_boss_participants p where p.run_id=r.id and p.user_id=auth.uid() and p.slot=p_slot) as participated
   from world_boss_runs r where r.starts_at>now()-interval '7 days'
  )x),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.event_snapshot(integer) from public,anon;
grant execute on function public.event_snapshot(integer) to authenticated;

create or replace function public.gm_event_rate(p_kind text,p_rate integer,p_minutes integer default null)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'GM only' using errcode='42501';end if;
 if p_kind not in ('exp','drop') or p_rate not in (1,2,3,5,10,20,40) or (p_minutes is not null and (p_minutes<1 or p_minutes>10080)) then raise exception 'Invalid event';end if;
 perform pg_advisory_xact_lock(230001);
 insert into game_events(kind,rate,starts_at,ends_at,expired_notice)
 values(p_kind,p_rate,now(),case when p_minutes is null or p_rate=1 then null else now()+make_interval(mins=>p_minutes) end,false)
 on conflict(kind) do update set rate=excluded.rate,starts_at=excluded.starts_at,ends_at=excluded.ends_at,expired_notice=false;
 insert into event_notices(message) values(case when p_rate=1 then 'GM ปิดกิจกรรม '||upper(p_kind) else 'GM เปิด '||upper(p_kind)||' ×'||p_rate||case when p_minutes is null then ' ตลอดจน GM ปิด' else ' เป็นเวลา '||p_minutes||' นาที' end end);
end $$;
revoke all on function public.gm_event_rate(text,integer,integer) from public,anon;
grant execute on function public.gm_event_rate(text,integer,integer) to authenticated;

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
  for w in select p.user_id,c.name from world_boss_participants p join characters c on c.user_id=p.user_id and c.slot=p.slot where p.run_id=p_id and p.damage>0 loop
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

-- Optional: Supabase pg_cron drives schedules even when no player is connected.
-- Enable pg_cron in Database > Extensions, then run separately:
-- select cron.schedule('everlevel-event-clock','* * * * *','select public.event_tick()');
-- Do not schedule again if a job with this name already exists.
-- Clients also call event_tick through event_snapshot every 5 seconds.
