-- =====================================================================
-- Everlevel v0.53 — MVP ร่วม (ผู้เล่นทุกคนในแผนที่เห็นและตี MVP ตัวเดียวกัน)
-- รันหลัง setup.sql (รันซ้ำได้ ไม่เสียข้อมูล · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
--
-- หลักการ
--   * เซิร์ฟเวอร์เก็บเลือด/สถานะ/ตำแหน่งเกิดของ MVP แต่ละแผนที่ · ผู้เล่นส่งดาเมจมาหักเลือดกลาง
--   * MVP ตาย → บันทึกดาเมจทุกคน · เกมให้รางวัลตามสัดส่วนดาเมจ (อันดับ 1 ได้รางวัล MVP)
--   * เกิดใหม่ตามเวลาที่ตั้ง (ผู้เล่นคนแรกที่เข้าแผนที่หลังครบเวลาเป็นคนสุ่มจุดเกิด)
-- =====================================================================

create table if not exists public.mvp_config (
  mob    text primary key,
  map    text not null,
  hp     bigint not null check (hp > 0),
  rmin   int not null,      -- เวลาเกิดใหม่ (วินาที)
  rmax   int not null
);
insert into public.mvp_config (mob, map, hp, rmin, rmax) values
  ('gnarlroot', 'whisper_forest', 7550, 240, 360),
  ('glacia', 'frostveil', 29800, 300, 420),
  ('ignarok', 'ember_caldera', 101900, 420, 600),
  ('aurex', 'ancient_ruins', 140000, 420, 600),
  ('nocthar', 'haunted_forest', 230000, 600, 840),
  ('tidalos', 'sunken_coast', 355110, 600, 840),
  ('crysthar', 'crystal_valley', 505300, 600, 840),
  ('aurelion', 'sky_citadel', 677510, 600, 840)
on conflict (mob) do update set map = excluded.map, hp = excluded.hp, rmin = excluded.rmin, rmax = excluded.rmax;
alter table public.mvp_config enable row level security;
revoke all on public.mvp_config from anon, authenticated;

create table if not exists public.mvp_runs (
  id          bigint generated always as identity primary key,
  mob         text not null references public.mvp_config (mob) on delete cascade,
  hp          bigint not null,
  max_hp      bigint not null,
  x           int not null default 0,
  y           int not null default 0,
  status      text not null default 'alive' check (status in ('alive', 'dead')),
  started_at  timestamptz not null default now(),
  killed_at   timestamptz,
  respawn_at  timestamptz,
  killer      text
);
create index if not exists mvp_runs_mob on public.mvp_runs (mob, id desc);
alter table public.mvp_runs enable row level security;
revoke all on public.mvp_runs from anon, authenticated;

create table if not exists public.mvp_hits (
  run_id   bigint not null references public.mvp_runs (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  slot     int not null,
  name     text not null,
  damage   bigint not null default 0,
  last_hit timestamptz not null default now(),
  primary key (run_id, user_id)
);
alter table public.mvp_hits enable row level security;
revoke all on public.mvp_hits from anon, authenticated;

-- แถวข้อมูลที่ส่งกลับให้เกม
create or replace function public._mvp_row(r mvp_runs, uid uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('mob', r.mob, 'run', r.id, 'hp', r.hp, 'max', r.max_hp, 'x', r.x, 'y', r.y, 'status', r.status,
    'respawn_at', r.respawn_at, 'killer', r.killer,
    'mine', coalesce((select damage from mvp_hits where run_id = r.id and user_id = uid), 0),
    'rank', (select rk from (select user_id, rank() over (order by damage desc) rk from mvp_hits where run_id = r.id) t where t.user_id = uid),
    'n', (select count(*) from mvp_hits where run_id = r.id),
    'top', coalesce((select jsonb_agg(jsonb_build_array(name, damage) order by damage desc) from (select name, damage from mvp_hits where run_id = r.id order by damage desc limit 3) t), '[]'::jsonb));
$$;

-- ---------- สถานะ MVP ในแผนที่ (เกิดใหม่ให้ถ้าครบเวลา) ----------
-- p_cand = {"aurex":[x,y], ...} จุดเกิดที่เกมสุ่มมาให้ (พิกเซลโลก) ใช้ตอนเกิดใหม่เท่านั้น
create or replace function public.mvp_state(p_map text, p_cand jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c mvp_config%rowtype; r mvp_runs%rowtype; out jsonb := '[]'::jsonb; cx int; cy int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  for c in select * from mvp_config where map = p_map loop
    select * into r from mvp_runs where mob = c.mob order by id desc limit 1 for update;
    if not found or (r.status = 'dead' and r.respawn_at <= now()) then
      cx := case when jsonb_typeof(p_cand->c.mob) = 'array' then least(100000, greatest(0, (p_cand->c.mob->>0)::numeric::int)) else 0 end;
      cy := case when jsonb_typeof(p_cand->c.mob) = 'array' then least(100000, greatest(0, (p_cand->c.mob->>1)::numeric::int)) else 0 end;
      insert into mvp_runs (mob, hp, max_hp, x, y) values (c.mob, c.hp, c.hp, cx, cy) returning * into r;
      delete from mvp_runs where mob = c.mob and id < r.id - 20;   -- เก็บประวัติไว้ 20 รอบ
    end if;
    out := out || jsonb_build_array(public._mvp_row(r, uid));
  end loop;
  return jsonb_build_object('server_time', now(), 'mvps', out);
end $$;

-- ---------- ตี MVP ----------
create or replace function public.mvp_hit(p_slot integer, p_mob text, p_run bigint, p_damage integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r mvp_runs%rowtype; c mvp_config%rowtype; nm text; dmg bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select name into nm from characters where user_id = uid and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  select * into r from mvp_runs where id = p_run and mob = p_mob for update;
  if not found then raise exception 'no_mvp'; end if;
  if r.status <> 'alive' then return public._mvp_row(r, uid); end if;
  select * into c from mvp_config where mob = p_mob;
  dmg := least(greatest(coalesce(p_damage, 0), 0), greatest(30000, r.max_hp / 10));   -- กันส่งดาเมจเกินจริงครั้งเดียว
  if dmg <= 0 then return public._mvp_row(r, uid); end if;
  dmg := least(dmg, r.hp);
  insert into mvp_hits (run_id, user_id, slot, name, damage) values (r.id, uid, p_slot, nm, dmg)
    on conflict (run_id, user_id) do update set damage = mvp_hits.damage + excluded.damage, slot = excluded.slot, name = excluded.name, last_hit = now();
  update mvp_runs set hp = hp - dmg where id = r.id returning * into r;
  if r.hp <= 0 then
    update mvp_runs set status = 'dead', hp = 0, killed_at = now(), killer = nm,
      respawn_at = now() + make_interval(secs => c.rmin + floor(random() * (c.rmax - c.rmin + 1)))
    where id = r.id returning * into r;
  end if;
  return public._mvp_row(r, uid) || jsonb_build_object('damage', dmg);
end $$;

revoke all on function public._mvp_row(mvp_runs, uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['mvp_state(text,jsonb)', 'mvp_hit(integer,text,bigint,integer)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
