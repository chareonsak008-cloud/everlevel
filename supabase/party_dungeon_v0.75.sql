-- =====================================================================
-- Everlevel v0.75 — ดันเจี้ยนปาร์ตี้ "วิหารผนึกจันทรา"
-- เซิร์ฟเวอร์ถือเลือดบอสกลาง · นับดาเมจทุกคน · จำกัดสัปดาห์ละ 2 รอบต่อบัญชี · ส่งรางวัลทางจดหมาย
-- รันใน Supabase Dashboard → SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ ไม่แตะข้อมูลผู้เล่นเดิม · ไม่มีคีย์ลับ
-- ต้องรันหลัง setup.sql · trade.sql · mail.sql
-- =====================================================================

-- เหรียญผนึก (ไอเทมใหม่ ต้องอยู่ในแคตตาล็อก ไม่งั้นระบบตรวจของผิดปกติจะล็อกการแลก) · แลกเปลี่ยนให้คนอื่นไม่ได้
insert into public.item_catalog (id, price, kind, tradable) values ('pd_coin', 10000, 'etc', false)
on conflict (id) do update set price = excluded.price, kind = excluded.kind, tradable = excluded.tradable;

create table if not exists public.pd_runs (
  id          bigserial primary key,
  pid         text not null,
  owner       uuid not null references auth.users(id) on delete cascade,
  level       int not null,
  boss        text not null,
  seed        int not null,
  per_hp      bigint not null,
  hp          bigint not null check (hp >= 0),
  max_hp      bigint not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'active' check (status in ('active', 'defeated', 'failed')),
  defeated_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists pd_runs_pid on public.pd_runs (pid, created_at desc);
create table if not exists public.pd_members (
  run_id   bigint not null references public.pd_runs(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  slot     int not null,
  name     text not null,
  damage   bigint not null default 0,
  last_hit timestamptz,
  primary key (run_id, user_id)
);
create index if not exists pd_members_user on public.pd_members (user_id);
create table if not exists public.pd_week (
  user_id uuid not null references auth.users(id) on delete cascade,
  week    date not null,
  n       int not null default 0,
  primary key (user_id, week)
);
alter table public.pd_runs enable row level security;
alter table public.pd_members enable row level security;
alter table public.pd_week enable row level security;
revoke all on public.pd_runs, public.pd_members, public.pd_week from anon, authenticated;

-- สัปดาห์ตามเวลาไทย (เริ่มวันจันทร์)
create or replace function public._pd_week()
returns date language sql stable set search_path = '' as $$ select date_trunc('week', now() at time zone 'Asia/Bangkok')::date $$;

create or replace function public._pd_left(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select greatest(0, 2 - coalesce((select n from pd_week where user_id = p_user and week = public._pd_week()), 0))
$$;

create or replace function public._pd_row(r pd_runs)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', r.id, 'pid', r.pid, 'level', r.level, 'boss', r.boss, 'seed', r.seed,
    'hp', r.hp, 'max', r.max_hp, 'starts_at', r.starts_at, 'ends_at', r.ends_at, 'status', r.status, 'now', now(),
    'week_left', public._pd_left(auth.uid()),
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'dmg', m.damage) order by m.name) from pd_members m where m.run_id = r.id), '[]'::jsonb))
$$;

-- หมดเวลา → ล้มเหลว
create or replace function public._pd_expire(p_run bigint)
returns void language sql security definer set search_path = public as $$
  update pd_runs set status = 'failed' where id = p_run and status = 'active' and now() > ends_at;
$$;

-- เปิดรอบใหม่ (หัวหน้าปาร์ตี้) · เลเวลบอสอ่านจากตัวละครฝั่งเซิร์ฟเวอร์ ปลอมไม่ได้
create or replace function public.pd_open(p_slot integer, p_pid text, p_boss text)
returns jsonb language plpgsql security definer set search_path = public as $$
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
  per := 20000 + lv * lv * 60;
  insert into pd_runs (pid, owner, level, boss, seed, per_hp, hp, max_hp, starts_at, ends_at)
  values (p_pid, uid, lv, case when p_boss in ('aurex', 'nocthar', 'ignarok', 'glacia') then p_boss else 'aurex' end,
          floor(random() * 2000000000)::int, per, per, per, now() + interval '10 seconds', now() + interval '10 seconds' + interval '15 minutes')
  returning * into r;
  insert into pd_members (run_id, user_id, slot, name) values (r.id, uid, p_slot, c.name);
  return public._pd_row(r);
end $$;

-- เข้าร่วมรอบที่หัวหน้าเปิด · บอสเลือดเพิ่มตามจำนวนคน (ก่อนมีใครตี)
create or replace function public.pd_join(p_slot integer, p_run bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; r pd_runs; n int;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into c from characters where user_id = uid and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  perform public._pd_expire(p_run);
  select * into r from pd_runs where id = p_run for update;
  if not found then raise exception 'no_run'; end if;
  if exists (select 1 from pd_members where run_id = r.id and user_id = uid) then return public._pd_row(r); end if;
  if r.status <> 'active' then raise exception 'run_over'; end if;
  if coalesce(c.lv, 1) < 30 then raise exception 'low_level'; end if;
  if public._pd_left(uid) <= 0 then raise exception 'weekly_limit'; end if;
  if now() > r.starts_at + interval '60 seconds' or r.hp < r.max_hp then raise exception 'join_closed'; end if;
  select count(*) into n from pd_members where run_id = r.id;
  if n >= 6 then raise exception 'full'; end if;
  insert into pd_members (run_id, user_id, slot, name) values (r.id, uid, p_slot, c.name);
  update pd_runs set hp = hp + per_hp, max_hp = max_hp + per_hp where id = r.id returning * into r;
  return public._pd_row(r);
end $$;

create or replace function public.pd_state(p_run bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r pd_runs;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  perform public._pd_expire(p_run);
  select * into r from pd_runs where id = p_run;
  if not found or not exists (select 1 from pd_members where run_id = p_run and user_id = uid) then raise exception 'no_run'; end if;
  return public._pd_row(r);
end $$;

-- ส่งดาเมจ · บอสตาย → รางวัลทางจดหมาย (ต้องมีผู้ทำดาเมจ ≥ 2 คน · นับโควตาสัปดาห์ละ 2 รอบ)
create or replace function public.pd_hit(p_slot integer, p_run bigint, p_damage integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r pd_runs; m pd_members; dmg bigint; w record; nd int; top uuid; coins int; mail bigint;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_damage is null or p_damage <= 0 then raise exception 'bad_damage'; end if;
  perform public._pd_expire(p_run);
  select * into r from pd_runs where id = p_run for update;
  if not found then raise exception 'no_run'; end if;
  select * into m from pd_members where run_id = p_run and user_id = uid for update;
  if not found then raise exception 'not_member'; end if;
  if r.status <> 'active' or now() < r.starts_at then return public._pd_row(r) || jsonb_build_object('damage', 0); end if;
  if m.last_hit > now() - interval '150 milliseconds' then return public._pd_row(r) || jsonb_build_object('damage', 0); end if;
  dmg := least(p_damage, greatest(20000, r.max_hp / 20), r.hp);
  update pd_members set damage = damage + dmg, last_hit = now(), slot = p_slot where run_id = p_run and user_id = uid;
  update pd_runs set hp = hp - dmg,
    status = case when hp - dmg <= 0 then 'defeated' else 'active' end,
    defeated_at = case when hp - dmg <= 0 then now() else null end
  where id = p_run returning * into r;
  if r.status = 'defeated' then
    select count(*) into nd from pd_members where run_id = p_run and damage > 0;
    select user_id into top from pd_members where run_id = p_run order by damage desc limit 1;
    if nd >= 2 then
      for w in select pm.user_id, pm.name from pd_members pm where pm.run_id = p_run and pm.damage > 0 loop
        if public._pd_left(w.user_id) > 0 then
          insert into pd_week (user_id, week, n) values (w.user_id, public._pd_week(), 1)
          on conflict (user_id, week) do update set n = pd_week.n + 1;
          coins := 4 + case when w.user_id = top then 1 else 0 end;
          insert into mails (to_name, sender, title, body, items, zeny, per)
          values (w.name, 'วิหารผนึกจันทรา', 'รางวัลดันเจี้ยนปาร์ตี้' || case when w.user_id = top then ' · ดาเมจอันดับ 1' else '' end,
                  'ขอบคุณที่ร่วมผนึกผู้คุมแห่งวิหารจันทรา (Lv.' || r.level || ') นำเหรียญผนึกไปแลกของที่บรอมในเมืองได้',
                  jsonb_build_array(jsonb_build_array('pd_coin', coins), jsonb_build_array('refine_w', 1), jsonb_build_array('refine_a', 1)),
                  r.level * 200, 'account') returning id into mail;
        end if;
      end loop;
    end if;
  end if;
  return public._pd_row(r) || jsonb_build_object('damage', dmg, 'rewarded', coalesce(nd, 0) >= 2);
end $$;

create or replace function public.pd_week_left()
returns int language sql stable security definer set search_path = public as $$ select public._pd_left(auth.uid()) $$;

revoke all on function public._pd_week() from public, anon, authenticated;
revoke all on function public._pd_left(uuid) from public, anon, authenticated;
revoke all on function public._pd_row(pd_runs) from public, anon, authenticated;
revoke all on function public._pd_expire(bigint) from public, anon, authenticated;
revoke all on function public.pd_open(integer, text, text) from public, anon;
revoke all on function public.pd_join(integer, bigint) from public, anon;
revoke all on function public.pd_state(bigint) from public, anon;
revoke all on function public.pd_hit(integer, bigint, integer) from public, anon;
revoke all on function public.pd_week_left() from public, anon;
grant execute on function public.pd_open(integer, text, text) to authenticated;
grant execute on function public.pd_join(integer, bigint) to authenticated;
grant execute on function public.pd_state(bigint) to authenticated;
grant execute on function public.pd_hit(integer, bigint, integer) to authenticated;
grant execute on function public.pd_week_left() to authenticated;
