-- =====================================================================
-- Everlevel v0.76 — อันดับประจำฤดูกาล (รีเซ็ตทุกเดือน ตามเวลาไทย)
-- หมวด: หอคอย (ชั้นสูงสุดในเดือน) · ดาเมจบอสโลก · MVP (ดาเมจอันดับ 1) · ดันเจี้ยนปาร์ตี้ (ปราบสำเร็จ)
-- คะแนนบอสโลก/MVP/ดันปาร์ตี้ นับจากตารางของเซิร์ฟเวอร์เองด้วย trigger (ปลอมไม่ได้) · หอคอยส่งจากเกมเหมือนอันดับหอคอยเดิม
-- จบเดือน: อันดับ 1–10 ของแต่ละหมวดได้รางวัลทางจดหมาย + ขึ้นหอเกียรติยศ (ส่งครั้งเดียว ตอนมีคนเปิดหน้าอันดับครั้งแรกของเดือนใหม่)
-- รันใน Supabase Dashboard → SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ · ไม่มีคีย์ลับ
-- ต้องรันหลัง setup.sql · mail.sql · events.sql · mvp_shared.sql · tower.sql (party_dungeon_v0.75.sql ถ้ามีจะนับหมวดดันปาร์ตี้ให้ด้วย)
-- =====================================================================

create table if not exists public.season_scores (
  season  text not null,                    -- 'YYYY-MM' เวลาไทย
  user_id uuid not null references auth.users(id) on delete cascade,
  slot    int  not null default 1,
  name    text not null default '',
  job     text not null default 'novice',
  tower   int    not null default 0,
  wb      bigint not null default 0,
  mvp     int    not null default 0,
  pd      int    not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season, user_id)
);
create index if not exists season_scores_tower on public.season_scores (season, tower desc);
create index if not exists season_scores_wb on public.season_scores (season, wb desc);
create index if not exists season_scores_mvp on public.season_scores (season, mvp desc);
create index if not exists season_scores_pd on public.season_scores (season, pd desc);
create table if not exists public.season_done (
  season  text primary key,
  closed_at timestamptz not null default now(),
  winners jsonb not null default '{}'::jsonb
);
alter table public.season_scores enable row level security;
alter table public.season_done enable row level security;
revoke all on public.season_scores, public.season_done from anon, authenticated;

create or replace function public._season(ts timestamptz default now())
returns text language sql stable set search_path = '' as $$ select to_char(ts at time zone 'Asia/Bangkok', 'YYYY-MM') $$;

-- เพิ่มคะแนน (ชื่อ/อาชีพอ่านจากตัวละครในเซิร์ฟเวอร์)
create or replace function public._season_add(p_user uuid, p_slot int, p_tower int, p_wb bigint, p_mvp int, p_pd int)
returns void language plpgsql security definer set search_path = public as $$
declare c record; s text := public._season();
begin
  if p_user is null then return; end if;
  select name, job into c from characters where user_id = p_user and slot = p_slot;
  if not found then select name, job into c from characters where user_id = p_user order by updated_at desc limit 1; end if;
  if not found then return; end if;
  insert into season_scores (season, user_id, slot, name, job, tower, wb, mvp, pd)
  values (s, p_user, p_slot, c.name, c.job, greatest(0, p_tower), greatest(0, p_wb), greatest(0, p_mvp), greatest(0, p_pd))
  on conflict (season, user_id) do update set
    slot = excluded.slot, name = excluded.name, job = excluded.job,
    tower = greatest(season_scores.tower, excluded.tower),
    wb = season_scores.wb + excluded.wb, mvp = season_scores.mvp + excluded.mvp, pd = season_scores.pd + excluded.pd,
    updated_at = now();
end $$;

-- ดาเมจบอสโลก: นับส่วนที่เพิ่มขึ้น
create or replace function public._season_wb_tg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.damage > coalesce(case when tg_op = 'UPDATE' then old.damage end, 0) then
    perform public._season_add(new.user_id, new.slot, 0, new.damage - coalesce(case when tg_op = 'UPDATE' then old.damage end, 0), 0, 0);
  end if;
  return new;
end $$;
drop trigger if exists season_wb on public.world_boss_participants;
create trigger season_wb after insert or update of damage on public.world_boss_participants for each row execute function public._season_wb_tg();

-- MVP: ตอนบอสตาย คนดาเมจอันดับ 1 ได้ +1
create or replace function public._season_mvp_tg() returns trigger language plpgsql security definer set search_path = public as $$
declare h record;
begin
  if new.status = 'dead' and old.status is distinct from 'dead' then
    select user_id, slot into h from mvp_hits where run_id = new.id order by damage desc limit 1;
    if found then perform public._season_add(h.user_id, h.slot, 0, 0, 1, 0); end if;
  end if;
  return new;
end $$;
drop trigger if exists season_mvp on public.mvp_runs;
create trigger season_mvp after update of status on public.mvp_runs for each row execute function public._season_mvp_tg();

-- ดันเจี้ยนปาร์ตี้: ปราบสำเร็จ ทุกคนที่ทำดาเมจ +1 (ถ้ามีตารางนี้)
create or replace function public._season_pd_tg() returns trigger language plpgsql security definer set search_path = public as $$
declare m record;
begin
  if new.status = 'defeated' and old.status is distinct from 'defeated' then
    for m in execute 'select user_id, slot from pd_members where run_id = $1 and damage > 0' using new.id loop
      perform public._season_add(m.user_id, m.slot, 0, 0, 0, 1);
    end loop;
  end if;
  return new;
end $$;
do $$ begin
  if to_regclass('public.pd_runs') is not null then
    execute 'drop trigger if exists season_pd on public.pd_runs';
    execute 'create trigger season_pd after update of status on public.pd_runs for each row execute function public._season_pd_tg()';
  end if;
end $$;

-- หอคอย: เกมส่งชั้นที่ผ่าน (ชั้นสูงสุดของเดือน) · จำกัดไม่เกินสถิติตลอดกาล + 5 กันส่งเลขเว่อร์
create or replace function public.season_tower(p_slot integer, p_floor integer)
returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); best int;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_floor is null or p_floor <= 0 then return 0; end if;
  if not exists (select 1 from characters where user_id = uid and slot = p_slot) then return 0; end if;
  select coalesce(max(best_floor), 0) into best from tower_records where user_id = uid;
  p_floor := least(p_floor, best + 5, 9999);
  perform public._season_add(uid, p_slot, p_floor, 0, 0, 0);
  return p_floor;
end $$;

-- ปิดฤดูกาลที่จบแล้ว: ส่งรางวัล 1–10 ทุกหมวด (ครั้งเดียว)
create or replace function public._season_close(p_season text)
returns void language plpgsql security definer set search_path = public as $$
declare cat text; r record; w jsonb := '{}'::jsonb; lst jsonb; it jsonb; z int; title text;
begin
  insert into season_done (season) values (p_season) on conflict do nothing;
  if not found then return; end if;
  foreach cat in array array['tower', 'wb', 'mvp', 'pd'] loop
    lst := '[]'::jsonb;
    for r in execute format('select user_id, name, job, %1$I::bigint as score, row_number() over (order by %1$I desc, updated_at asc) as rk from season_scores where season = $1 and %1$I > 0 order by %1$I desc, updated_at asc limit 10', cat) using p_season loop
      lst := lst || jsonb_build_array(jsonb_build_object('rk', r.rk, 'name', r.name, 'job', r.job, 'score', r.score));
      if r.rk = 1 then it := '[["box_gold",1],["refine_guard",2],["royal_jelly",10]]'::jsonb; z := 300000;
      elsif r.rk <= 3 then it := '[["box_gold",1],["refine_guard",1]]'::jsonb; z := 150000;
      else it := '[["box_silver",1],["refine_luck",1]]'::jsonb; z := 50000; end if;
      title := 'รางวัลฤดูกาล ' || p_season || ' · ' || case cat when 'tower' then 'หอคอย' when 'wb' then 'บอสโลก' when 'mvp' then 'MVP' else 'ดันเจี้ยนปาร์ตี้' end || ' อันดับ ' || r.rk;
      insert into mails (to_name, sender, title, body, items, zeny, per)
      values (r.name, 'สมาคมนักผจญภัย', title, 'ยินดีด้วย! ชื่อของเจ้าถูกจารึกไว้ในหอเกียรติยศแห่ง Asteria', it, z, 'account');
    end loop;
    w := w || jsonb_build_object(cat, lst);
  end loop;
  update season_done set winners = w where season = p_season;
end $$;

-- กระดานอันดับ: p_cat = tower | wb | mvp | pd · คืน top 50 + อันดับของฉัน + เวลาจบฤดูกาล
create or replace function public.season_board(p_cat text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s text := public._season(); prev text; rows jsonb; me jsonb;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_cat not in ('tower', 'wb', 'mvp', 'pd') then raise exception 'bad_cat'; end if;
  -- ปิดฤดูกาลก่อนหน้าที่ยังไม่ได้ปิด (คนแรกที่เปิดหน้าอันดับในเดือนใหม่เป็นคนสั่ง)
  for prev in select distinct season from season_scores where season < s and season not in (select season from season_done) loop
    perform public._season_close(prev);
  end loop;
  execute format('select coalesce(jsonb_agg(x order by x.rk), ''[]''::jsonb) from (select row_number() over (order by %1$I desc, updated_at asc) as rk, name, job, %1$I::bigint as score, (user_id = $2) as mine from season_scores where season = $1 and %1$I > 0 order by %1$I desc, updated_at asc limit 50) x', p_cat)
    into rows using s, uid;
  execute format('select jsonb_build_object(''score'', t.score, ''rk'', t.rk) from (select user_id, %1$I::bigint as score, row_number() over (order by %1$I desc, updated_at asc) as rk from season_scores where season = $1 and %1$I > 0) t where t.user_id = $2', p_cat)
    into me using s, uid;
  return jsonb_build_object('season', s, 'cat', p_cat, 'rows', rows, 'me', me, 'now', now(),
    'ends_at', (date_trunc('month', now() at time zone 'Asia/Bangkok') + interval '1 month') at time zone 'Asia/Bangkok');
end $$;

-- หอเกียรติยศ: แชมป์ฤดูกาลที่ผ่านมา (ล่าสุด 6 ฤดูกาล)
create or replace function public.season_hall()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('season', season, 'winners', winners) order by season desc), '[]'::jsonb)
  from (select season, winners from season_done order by season desc limit 6) t
$$;

revoke all on function public._season(timestamptz) from public, anon, authenticated;
revoke all on function public._season_add(uuid, int, int, bigint, int, int) from public, anon, authenticated;
revoke all on function public._season_close(text) from public, anon, authenticated;
revoke all on function public._season_wb_tg() from public, anon, authenticated;
revoke all on function public._season_mvp_tg() from public, anon, authenticated;
revoke all on function public._season_pd_tg() from public, anon, authenticated;
revoke all on function public.season_tower(integer, integer) from public, anon;
revoke all on function public.season_board(text) from public, anon;
revoke all on function public.season_hall() from public, anon;
grant execute on function public.season_tower(integer, integer) to authenticated;
grant execute on function public.season_board(text) to authenticated;
grant execute on function public.season_hall() to authenticated;
