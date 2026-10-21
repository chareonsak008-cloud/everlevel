-- =====================================================================
-- Everlevel v0.78 — สนามประลอง (อารีน่า PvP) 1v1 · 3v3 แบบสู้สดเรียลไทม์
-- · จับคู่จริงจากคิวบนเซิร์ฟเวอร์ (แต้มอันดับใกล้กัน · ยิ่งรอนานยิ่งขยายช่วง) · 3v3 ปาร์ตี้ที่ลงพร้อมกันอยู่ทีมเดียวกัน
-- · เลือดของทุกคนอยู่ที่เซิร์ฟเวอร์ · ดาเมจต่อครั้ง/ความถี่/การฟื้นเลือดถูกจำกัด · ตัดสินแพ้ชนะ + แต้มอันดับ (Elo) ที่เซิร์ฟเวอร์
-- · แต้มอารีน่าเก็บที่เซิร์ฟเวอร์ แลกของผ่าน arena_buy (ของส่งทางจดหมาย) · หมวด PvP ในอันดับฤดูกาล + รางวัลจบฤดูกาลตามขั้น
-- รันใน Supabase Dashboard → SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ · ไม่แตะข้อมูลผู้เล่นเดิม · ไม่มีคีย์ลับ
-- ต้องรันหลัง setup.sql · mail.sql · season_v0.76.sql
-- =====================================================================

create table if not exists public.arena_rating (
  season  text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot    int  not null default 1,
  name    text not null default '',
  job     text not null default 'novice',
  r1 int not null default 1000, w1 int not null default 0, l1 int not null default 0, d1 int not null default 0,
  r3 int not null default 1000, w3 int not null default 0, l3 int not null default 0, d3 int not null default 0,
  best int not null default 1000,
  updated_at timestamptz not null default now(),
  primary key (season, user_id)
);
create index if not exists arena_rating_r1 on public.arena_rating (season, r1 desc);
create index if not exists arena_rating_r3 on public.arena_rating (season, r3 desc);
create table if not exists public.arena_wallet (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points int not null default 0 check (points >= 0),
  day date, day_pts int not null default 0, day_wins int not null default 0,
  total int not null default 0
);
create table if not exists public.arena_buys (
  user_id uuid not null references auth.users(id) on delete cascade,
  week date not null, item text not null, n int not null default 0,
  primary key (user_id, week, item)
);
create table if not exists public.arena_matches (
  id bigserial primary key,
  mode text not null check (mode in ('1v1', '3v3')),
  seed int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'done')),
  winner smallint,                 -- 1 / 2 · 0 = เสมอ
  settled_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.arena_players (
  match_id bigint not null references public.arena_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot int not null, name text not null, job text not null default 'novice', lv int not null default 1,
  team smallint not null check (team in (1, 2)),
  rating int not null default 1000,
  ready boolean not null default false,
  hp bigint not null default 1, max_hp bigint not null default 1,
  stats jsonb not null default '{}'::jsonb,
  dmg bigint not null default 0, kills int not null default 0,
  alive boolean not null default true,
  last_hit timestamptz, last_heal timestamptz,
  delta int, pts int,
  primary key (match_id, user_id)
);
create index if not exists arena_players_user on public.arena_players (user_id);
create table if not exists public.arena_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slot int not null, name text not null, job text not null default 'novice', lv int not null,
  mode text not null check (mode in ('1v1', '3v3')),
  grp text,
  rating int not null,
  queued_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  match_id bigint
);
create table if not exists public.arena_season_done (season text primary key, closed_at timestamptz not null default now());
alter table public.arena_rating enable row level security;
alter table public.arena_wallet enable row level security;
alter table public.arena_buys enable row level security;
alter table public.arena_matches enable row level security;
alter table public.arena_players enable row level security;
alter table public.arena_queue enable row level security;
alter table public.arena_season_done enable row level security;
revoke all on public.arena_rating, public.arena_wallet, public.arena_buys, public.arena_matches, public.arena_players, public.arena_queue, public.arena_season_done from anon, authenticated;

-- หมวด PvP ในอันดับฤดูกาล (แต้มอันดับสูงสุดที่ทำได้ในเดือน)
alter table public.season_scores add column if not exists pvp int not null default 0;
create index if not exists season_scores_pvp on public.season_scores (season, pvp desc);

/* ---------------- ตัวช่วย ---------------- */
create or replace function public._ar_season() returns text language sql stable set search_path = '' as $$ select to_char(now() at time zone 'Asia/Bangkok', 'YYYY-MM') $$;
create or replace function public._ar_today() returns date language sql stable set search_path = '' as $$ select (now() at time zone 'Asia/Bangkok')::date $$;
create or replace function public._ar_week() returns date language sql stable set search_path = '' as $$ select date_trunc('week', now() at time zone 'Asia/Bangkok')::date $$;

-- แถวแต้มอันดับของฤดูกาลนี้ (สร้างถ้ายังไม่มี)
create or replace function public._ar_rat(p_user uuid, p_slot int)
returns public.arena_rating language plpgsql security definer set search_path = public as $$
declare r arena_rating; c record; s text := public._ar_season();
begin
  select * into r from arena_rating where season = s and user_id = p_user;
  if found then return r; end if;
  select name, job into c from characters where user_id = p_user and slot = p_slot;
  insert into arena_rating (season, user_id, slot, name, job) values (s, p_user, p_slot, coalesce(c.name, ''), coalesce(c.job, 'novice'))
  on conflict (season, user_id) do nothing;
  select * into r from arena_rating where season = s and user_id = p_user;
  return r;
end $$;

/* ---------------- จับคู่ ---------------- */
create or replace function public._ar_make(p_mode text, a uuid[], b uuid[])
returns bigint language plpgsql security definer set search_path = public as $$
declare mid bigint; q record; dur interval := case when p_mode = '1v1' then interval '180 seconds' else interval '300 seconds' end;
begin
  insert into arena_matches (mode, seed, starts_at, ends_at)
  values (p_mode, floor(random() * 2000000000)::int, now() + interval '12 seconds', now() + interval '12 seconds' + dur)
  returning id into mid;
  for q in select * from arena_queue where user_id = any(a || b) loop
    insert into arena_players (match_id, user_id, slot, name, job, lv, team, rating)
    values (mid, q.user_id, q.slot, q.name, q.job, q.lv, case when q.user_id = any(a) then 1 else 2 end, q.rating);
  end loop;
  update arena_queue set match_id = mid where user_id = any(a || b);
  return mid;
end $$;

create or replace function public._ar_try(p_mode text)
returns void language plpgsql security definer set search_path = public as $$
declare x record; y record; g record; anc record; ta uuid[]; tb uuid[]; na int; nb int; win int; tries int := 0;
begin
  perform pg_advisory_xact_lock(230078);
  delete from arena_queue where match_id is null and seen_at < now() - interval '15 seconds';
  delete from arena_queue q where q.match_id is not null and exists (select 1 from arena_matches m where m.id = q.match_id and (m.status = 'done' or m.created_at < now() - interval '15 minutes'));
  if p_mode = '1v1' then
    for x in select * from arena_queue where mode = '1v1' and match_id is null order by queued_at loop
      if exists (select 1 from arena_queue where user_id = x.user_id and match_id is not null) then continue; end if;
      win := least(2000, 150 + floor(extract(epoch from now() - x.queued_at) * 10)::int);
      select * into y from arena_queue where mode = '1v1' and match_id is null and user_id <> x.user_id and abs(rating - x.rating) <= win
        order by abs(rating - x.rating), queued_at limit 1;
      if found then perform public._ar_make('1v1', array[x.user_id], array[y.user_id]); end if;
    end loop;
    return;
  end if;
  -- 3v3: กลุ่ม = ปาร์ตี้ที่ลงพร้อมกัน (grp) หรือคนเดียว · หาทีมละ 3 คนแบบโลภ (คนรอนานสุดเป็นหลัก)
  for anc in select coalesce(grp, user_id::text) k, count(*) n, avg(rating) r, min(queued_at) t
             from arena_queue where mode = '3v3' and match_id is null group by 1 having count(*) <= 3 order by min(queued_at) loop
    tries := tries + 1; exit when tries > 6;
    win := least(2000, 200 + floor(extract(epoch from now() - anc.t) * 10)::int);
    ta := '{}'; tb := '{}'; na := 0; nb := 0;
    for g in select coalesce(grp, user_id::text) k, count(*) n, avg(rating) r, min(queued_at) t, array_agg(user_id) ids
             from arena_queue where mode = '3v3' and match_id is null group by 1 having count(*) <= 3
             order by (coalesce(grp, user_id::text) = anc.k) desc, min(queued_at) loop
      if abs(g.r - anc.r) > win then continue; end if;
      if na + g.n <= 3 then ta := ta || g.ids; na := na + g.n;
      elsif nb + g.n <= 3 then tb := tb || g.ids; nb := nb + g.n; end if;
      exit when na = 3 and nb = 3;
    end loop;
    if na = 3 and nb = 3 then perform public._ar_make('3v3', ta, tb); return; end if;
  end loop;
end $$;

-- เข้าคิว (p_grp = รหัสปาร์ตี้ ถ้าลง 3v3 พร้อมเพื่อน)
create or replace function public.arena_queue_join(p_slot integer, p_mode text, p_grp text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; r arena_rating;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_mode not in ('1v1', '3v3') then raise exception 'bad_mode'; end if;
  select * into c from characters where user_id = uid and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  if coalesce(c.lv, 1) < 30 then raise exception 'low_level'; end if;
  if exists (select 1 from arena_players p join arena_matches m on m.id = p.match_id where p.user_id = uid and m.status = 'active' and m.ends_at > now()) then raise exception 'in_match'; end if;
  r := public._ar_rat(uid, p_slot);
  if p_grp is not null and p_grp !~ '^[a-z0-9]{6,12}$' then p_grp := null; end if;
  if p_mode = '1v1' then p_grp := null; end if;
  insert into arena_queue (user_id, slot, name, job, lv, mode, grp, rating)
  values (uid, p_slot, c.name, coalesce(c.job, 'novice'), c.lv, p_mode, p_grp, case when p_mode = '1v1' then r.r1 else r.r3 end)
  on conflict (user_id) do update set slot = excluded.slot, name = excluded.name, job = excluded.job, lv = excluded.lv, mode = excluded.mode,
    grp = excluded.grp, rating = excluded.rating, queued_at = now(), seen_at = now(), match_id = null;
  perform public._ar_try(p_mode);
  return public.arena_queue_poll();
end $$;

create or replace function public.arena_queue_poll()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); q arena_queue; n int;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  update arena_queue set seen_at = now() where user_id = uid returning * into q;
  if not found then return jsonb_build_object('queued', false, 'now', now()); end if;
  if q.match_id is null then perform public._ar_try(q.mode); select * into q from arena_queue where user_id = uid; end if;
  select count(*) into n from arena_queue where mode = q.mode and match_id is null;
  return jsonb_build_object('queued', q.match_id is null, 'mode', q.mode, 'match', q.match_id, 'since', q.queued_at, 'waiting', n, 'rating', q.rating, 'now', now());
end $$;

create or replace function public.arena_queue_leave()
returns void language sql security definer set search_path = public as $$
  delete from arena_queue where user_id = auth.uid() and match_id is null;
$$;

/* ---------------- ในสนาม ---------------- */
create or replace function public._ar_row(p_match bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'mode', m.mode, 'seed', m.seed, 'starts_at', m.starts_at, 'ends_at', m.ends_at,
    'status', m.status, 'winner', m.winner, 'now', now(),
    'players', coalesce((select jsonb_agg(jsonb_build_object('name', p.name, 'job', p.job, 'lv', p.lv, 'team', p.team, 'rating', p.rating,
        'ready', p.ready, 'hp', p.hp, 'max', p.max_hp, 'st', p.stats, 'dmg', p.dmg, 'kills', p.kills, 'alive', p.alive,
        'delta', p.delta, 'pts', p.pts, 'me', p.user_id = auth.uid()) order by p.team, p.name)
      from arena_players p where p.match_id = m.id), '[]'::jsonb))
  from arena_matches m where m.id = p_match
$$;

-- ตัดสินผล (ทีมตายหมด / หมดเวลา) · แต้มอันดับ Elo + แต้มอารีน่า
create or replace function public._ar_settle(p_match bigint)
returns void language plpgsql security definer set search_path = public as $$
declare m arena_matches; a1 int; a2 int; f1 float; f2 float; r1 float; r2 float; e1 float; s1 float; dlt int; w smallint; p record; v_pts int; wl arena_wallet; col text; today date := public._ar_today(); best int;
begin
  select * into m from arena_matches where id = p_match for update;
  if not found or m.status <> 'active' then return; end if;
  -- ไม่เข้าสนามภายใน 15 วินาทีหลังเริ่ม = แพ้ (ตายทันที)
  if now() > m.starts_at + interval '15 seconds' then
    update arena_players set alive = false, hp = 0 where match_id = p_match and not ready and alive;
  end if;
  select count(*) filter (where team = 1 and alive), count(*) filter (where team = 2 and alive),
         coalesce(sum(hp::float / greatest(1, max_hp)) filter (where team = 1 and alive), 0), coalesce(sum(hp::float / greatest(1, max_hp)) filter (where team = 2 and alive), 0)
    into a1, a2, f1, f2 from arena_players where match_id = p_match;
  if a1 > 0 and a2 > 0 and now() < m.ends_at then return; end if;
  if a1 = 0 and a2 = 0 then w := 0;
  elsif a2 = 0 then w := 1; elsif a1 = 0 then w := 2;
  elsif abs(f1 - f2) < 0.02 then w := 0; elsif f1 > f2 then w := 1; else w := 2; end if;
  select avg(rating) filter (where team = 1), avg(rating) filter (where team = 2) into r1, r2 from arena_players where match_id = p_match;
  e1 := 1 / (1 + power(10, (r2 - r1) / 400));
  s1 := case w when 1 then 1 when 2 then 0 else 0.5 end;
  dlt := round(32 * (s1 - e1));
  update arena_matches set status = 'done', winner = w, settled_at = now() where id = p_match;
  col := case when m.mode = '1v1' then '1' else '3' end;
  for p in select * from arena_players where match_id = p_match loop
    perform public._ar_rat(p.user_id, p.slot);
    insert into arena_wallet (user_id) values (p.user_id) on conflict do nothing;
    select * into wl from arena_wallet where user_id = p.user_id for update;
    if wl.day is distinct from today then wl.day_pts := 0; wl.day_wins := 0; end if;
    v_pts := case when w = 0 then 12 when w = p.team then 30 else 10 end;
    if w = p.team and wl.day_wins = 0 then v_pts := v_pts + 20; end if;   -- ชนะครั้งแรกของวัน
    v_pts := greatest(0, least(v_pts, 300 - wl.day_pts));                 -- เพดานวันละ 300 แต้ม
    if not p.ready then v_pts := 0; end if;                              -- ไม่เข้าสนาม = ไม่ได้แต้ม
    update arena_wallet set day = today, day_pts = wl.day_pts + v_pts, day_wins = wl.day_wins + case when w = p.team and p.ready then 1 else 0 end,
      points = arena_wallet.points + v_pts, total = arena_wallet.total + v_pts where user_id = p.user_id;
    execute format('update arena_rating set r%1$s = greatest(0, r%1$s + $1), w%1$s = w%1$s + $2, l%1$s = l%1$s + $3, d%1$s = d%1$s + $4, best = greatest(best, r%1$s + $1), name = $5, job = $6, updated_at = now() where season = $7 and user_id = $8 returning best', col)
      into best
      using (case when not p.ready then -15 when p.team = 1 then dlt else -dlt end), (case when w = p.team and p.ready then 1 else 0 end), (case when (w <> 0 and w <> p.team) or not p.ready then 1 else 0 end), (case when w = 0 and p.ready then 1 else 0 end),
            p.name, p.job, public._ar_season(), p.user_id;
    update arena_players set delta = case when not p.ready then -15 when p.team = 1 then dlt else -dlt end, pts = v_pts where match_id = p_match and user_id = p.user_id;
    -- อันดับฤดูกาลหมวด PvP = แต้มอันดับสูงสุดของเดือน
    insert into season_scores (season, user_id, slot, name, job, pvp) values (public._ar_season(), p.user_id, p.slot, p.name, p.job, coalesce(best, 0))
    on conflict (season, user_id) do update set pvp = greatest(season_scores.pvp, excluded.pvp), name = excluded.name, job = excluded.job, updated_at = now();
  end loop;
  delete from arena_queue where match_id = p_match;
end $$;

-- เข้าสนาม: ส่งค่าต่อสู้ (ปรับเลเวลเป็น 150 แล้วในเกม) · เซิร์ฟเวอร์จำกัดค่าให้อยู่ในช่วงที่เป็นไปได้
create or replace function public.arena_ready(p_match bigint, p_stats jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m arena_matches; v_hp bigint; st jsonb;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into m from arena_matches where id = p_match;
  if not found or not exists (select 1 from arena_players where match_id = p_match and user_id = uid) then raise exception 'no_match'; end if;
  if m.status = 'active' and now() <= m.starts_at + interval '15 seconds' then
    v_hp := least(600000, greatest(3000, coalesce((p_stats->>'hp')::numeric, 0)::bigint * 3));
    st := jsonb_build_object(
      'def',  least(1500, greatest(0, coalesce((p_stats->>'def')::numeric, 0)))::int,
      'mdef', least(1500, greatest(0, coalesce((p_stats->>'mdef')::numeric, 0)))::int,
      'flee', least(700,  greatest(0, coalesce((p_stats->>'flee')::numeric, 0)))::int);
    update arena_players set ready = true, max_hp = v_hp, hp = case when arena_players.ready then least(arena_players.hp, v_hp) else v_hp end, stats = st
      where match_id = p_match and user_id = uid and alive;
  end if;
  delete from arena_queue where user_id = uid;
  return public._ar_row(p_match);
end $$;

create or replace function public.arena_state(p_match bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not exists (select 1 from arena_players where match_id = p_match and user_id = uid) then raise exception 'no_match'; end if;
  perform public._ar_settle(p_match);
  return public._ar_row(p_match);
end $$;

-- ส่งดาเมจใส่ศัตรู (ชื่อเป้าหมาย) · จำกัด 10% ของเลือดเป้าต่อครั้ง · ห่างกันอย่างน้อย 0.2 วินาที (โกงยังไงก็ล้มคนได้เร็วสุด ~2 วินาที)
create or replace function public.arena_hit(p_match bigint, p_target text, p_damage integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m arena_matches; me arena_players; t arena_players; v_dmg bigint;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_damage is null or p_damage <= 0 then raise exception 'bad_damage'; end if;
  select * into m from arena_matches where id = p_match for update;
  if not found then raise exception 'no_match'; end if;
  select * into me from arena_players where match_id = p_match and user_id = uid for update;
  if not found then raise exception 'no_match'; end if;
  if m.status <> 'active' or now() < m.starts_at or now() >= m.ends_at or not me.alive or not me.ready
     or (me.last_hit is not null and me.last_hit > now() - interval '200 milliseconds') then
    perform public._ar_settle(p_match);
    return public._ar_row(p_match) || jsonb_build_object('damage', 0);
  end if;
  select * into t from arena_players where match_id = p_match and name = p_target and team <> me.team for update;
  if not found or not t.alive then return public._ar_row(p_match) || jsonb_build_object('damage', 0); end if;
  v_dmg := least(p_damage, greatest(1, t.max_hp / 10), t.hp);
  update arena_players set hp = hp - v_dmg, alive = hp - v_dmg > 0 where match_id = p_match and user_id = t.user_id;
  update arena_players set dmg = arena_players.dmg + v_dmg, last_hit = now(), kills = kills + case when t.hp - v_dmg <= 0 then 1 else 0 end where match_id = p_match and user_id = uid;
  perform public._ar_settle(p_match);
  return public._ar_row(p_match) || jsonb_build_object('damage', v_dmg);
end $$;

-- ฟื้นเลือดตัวเอง (สกิลรักษา/ดูดเลือด/ฟื้นตามเวลา) · ไม่เกิน 8% ต่อครั้ง ห่างกันอย่างน้อย 1 วินาที
create or replace function public.arena_heal(p_match bigint, p_amount integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); m arena_matches; me arena_players; h bigint;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into m from arena_matches where id = p_match;
  if not found then raise exception 'no_match'; end if;
  select * into me from arena_players where match_id = p_match and user_id = uid for update;
  if not found then raise exception 'no_match'; end if;
  if m.status = 'active' and now() >= m.starts_at and now() < m.ends_at and me.alive and coalesce(p_amount, 0) > 0
     and (me.last_heal is null or me.last_heal <= now() - interval '1 second') then
    h := least(p_amount, greatest(1, me.max_hp * 8 / 100), me.max_hp - me.hp);
    if h > 0 then update arena_players set hp = hp + h, last_heal = now() where match_id = p_match and user_id = uid; end if;
  end if;
  return public._ar_row(p_match);
end $$;

-- ยอมแพ้/ออกจากสนาม
create or replace function public.arena_forfeit(p_match bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  update arena_players p set alive = false, hp = 0 from arena_matches m
    where p.match_id = p_match and p.user_id = uid and m.id = p.match_id and m.status = 'active';
  perform public._ar_settle(p_match);
  return public._ar_row(p_match);
end $$;

/* ---------------- จบฤดูกาล: รางวัลตามขั้น (เล่นอย่างน้อย 10 นัด) ---------------- */
create or replace function public._ar_close(p_season text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; it jsonb; z int; tier text;
begin
  insert into arena_season_done (season) values (p_season) on conflict do nothing;
  if not found then return; end if;
  for r in select * from arena_rating where season = p_season and (w1 + l1 + d1 + w3 + l3 + d3) >= 10 loop
    if r.best >= 2100 then tier := 'เทพสงคราม'; it := '[["box_gold",3],["eternal_shard",3],["refine_guard",3]]'; z := 500000;
    elsif r.best >= 1800 then tier := 'ไดมอนด์'; it := '[["box_gold",2],["eternal_shard",1],["refine_guard",2]]'; z := 300000;
    elsif r.best >= 1600 then tier := 'แพลตินัม'; it := '[["box_gold",1],["refine_guard",2]]'; z := 200000;
    elsif r.best >= 1400 then tier := 'โกลด์'; it := '[["box_gold",1],["refine_luck",1]]'; z := 120000;
    elsif r.best >= 1200 then tier := 'ซิลเวอร์'; it := '[["box_silver",2]]'; z := 60000;
    else tier := 'บรอนซ์'; it := '[["box_silver",1]]'; z := 30000; end if;
    insert into mails (to_name, sender, title, body, items, zeny, per)
    values (r.name, 'สนามประลอง', 'รางวัลจบฤดูกาลอารีน่า ' || p_season || ' · ' || tier,
            'ขอบคุณที่ร่วมประลองตลอดฤดูกาล แต้มอันดับสูงสุดของเจ้าคือ ' || r.best || ' (ขั้น' || tier || ')', it, z, 'account');
  end loop;
end $$;

-- ข้อมูลของฉัน: แต้มอันดับ · สถิติ · แต้มอารีน่า · โควตาร้าน · การแข่งที่ยังไม่จบ
create or replace function public.arena_me(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r arena_rating; w arena_wallet; s text := public._ar_season(); prev text; act bigint;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  for prev in select distinct season from arena_rating where season < s and season not in (select season from arena_season_done) loop
    perform public._ar_close(prev);
  end loop;
  r := public._ar_rat(uid, p_slot);
  select * into w from arena_wallet where user_id = uid;
  select p.match_id into act from arena_players p join arena_matches m on m.id = p.match_id
    where p.user_id = uid and m.status = 'active' and m.ends_at > now() order by m.id desc limit 1;
  return jsonb_build_object('season', s, 'r1', r.r1, 'w1', r.w1, 'l1', r.l1, 'd1', r.d1, 'r3', r.r3, 'w3', r.w3, 'l3', r.l3, 'd3', r.d3, 'best', r.best,
    'points', coalesce(w.points, 0), 'day_pts', case when w.day = public._ar_today() then w.day_pts else 0 end, 'day_cap', 300,
    'buys', coalesce((select jsonb_object_agg(item, n) from arena_buys where user_id = uid and week = public._ar_week()), '{}'::jsonb),
    'active', act, 'now', now(),
    'ends_at', (date_trunc('month', now() at time zone 'Asia/Bangkok') + interval '1 month') at time zone 'Asia/Bangkok');
end $$;

create or replace function public.arena_board(p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s text := public._ar_season(); c text;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_mode not in ('1v1', '3v3') then raise exception 'bad_mode'; end if;
  c := case when p_mode = '1v1' then '1' else '3' end;
  return (select coalesce(jsonb_agg(x order by x.rk), '[]'::jsonb) from (
    select row_number() over (order by (case when c = '1' then r1 else r3 end) desc, updated_at) rk, name, job,
      case when c = '1' then r1 else r3 end as rating, case when c = '1' then w1 else w3 end as w, case when c = '1' then l1 else l3 end as l, user_id = uid as mine
    from arena_rating where season = s and (case when c = '1' then w1 + l1 + d1 else w3 + l3 + d3 end) > 0
    order by 4 desc, updated_at limit 50) x);
end $$;

-- ร้านแต้มอารีน่า (ราคาตัดสินที่นี่ · ของส่งทางจดหมาย) · week = จำกัดต่อสัปดาห์ (0 = ไม่จำกัด)
create or replace function public.arena_buy(p_slot integer, p_item text, p_qty integer default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; s record; w arena_wallet; bought int; q int := least(10, greatest(1, coalesce(p_qty, 1)));
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select * into c from characters where user_id = uid and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  select * into s from (values
    ('refine_w', 2, 40, 0), ('refine_a', 2, 40, 0), ('royal_jelly', 1, 30, 0), ('box_silver', 1, 80, 0),
    ('refine_luck', 1, 300, 5), ('refine_guard', 1, 300, 5), ('box_gold', 1, 500, 3), ('egg_galaxy', 1, 900, 1), ('eternal_shard', 1, 600, 2)
  ) as x(id, n, cost, week) where id = p_item;
  if not found then raise exception 'bad_item'; end if;
  if s.week > 0 then
    select coalesce(n, 0) into bought from arena_buys where user_id = uid and week = public._ar_week() and item = p_item;
    if coalesce(bought, 0) + q > s.week then raise exception 'week_limit'; end if;
  end if;
  select * into w from arena_wallet where user_id = uid for update;
  if not found or w.points < s.cost * q then raise exception 'not_enough'; end if;
  update arena_wallet set points = points - s.cost * q where user_id = uid;
  insert into arena_buys (user_id, week, item, n) values (uid, public._ar_week(), p_item, q)
  on conflict (user_id, week, item) do update set n = arena_buys.n + q;
  insert into mails (to_name, sender, title, body, items, zeny, per)
  values (c.name, 'สนามประลอง', 'ของจากร้านแต้มอารีน่า', 'แลกด้วยแต้มอารีน่า ' || (s.cost * q) || ' แต้ม', jsonb_build_array(jsonb_build_array(p_item, s.n * q)), 0, 'account');
  return public.arena_me(p_slot);
end $$;

/* ---------------- อันดับฤดูกาล: เพิ่มหมวด PvP ---------------- */
create or replace function public._season_close(p_season text)
returns void language plpgsql security definer set search_path = public as $$
declare cat text; r record; w jsonb := '{}'::jsonb; lst jsonb; it jsonb; z int; title text;
begin
  insert into season_done (season) values (p_season) on conflict do nothing;
  if not found then return; end if;
  foreach cat in array array['tower', 'wb', 'mvp', 'pd', 'pvp'] loop
    lst := '[]'::jsonb;
    for r in execute format('select user_id, name, job, %1$I::bigint as score, row_number() over (order by %1$I desc, updated_at asc) as rk from season_scores where season = $1 and %1$I > 0 order by %1$I desc, updated_at asc limit 10', cat) using p_season loop
      lst := lst || jsonb_build_array(jsonb_build_object('rk', r.rk, 'name', r.name, 'job', r.job, 'score', r.score));
      if r.rk = 1 then it := '[["box_gold",1],["refine_guard",2],["royal_jelly",10]]'::jsonb; z := 300000;
      elsif r.rk <= 3 then it := '[["box_gold",1],["refine_guard",1]]'::jsonb; z := 150000;
      else it := '[["box_silver",1],["refine_luck",1]]'::jsonb; z := 50000; end if;
      title := 'รางวัลฤดูกาล ' || p_season || ' · ' || case cat when 'tower' then 'หอคอย' when 'wb' then 'บอสโลก' when 'mvp' then 'MVP' when 'pvp' then 'อารีน่า' else 'ดันเจี้ยนปาร์ตี้' end || ' อันดับ ' || r.rk;
      insert into mails (to_name, sender, title, body, items, zeny, per)
      values (r.name, 'สมาคมนักผจญภัย', title, 'ยินดีด้วย! ชื่อของเจ้าถูกจารึกไว้ในหอเกียรติยศแห่ง Asteria', it, z, 'account');
    end loop;
    w := w || jsonb_build_object(cat, lst);
  end loop;
  update season_done set winners = w where season = p_season;
end $$;

create or replace function public.season_board(p_cat text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s text := public._season(); prev text; rows jsonb; me jsonb;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if p_cat not in ('tower', 'wb', 'mvp', 'pd', 'pvp') then raise exception 'bad_cat'; end if;
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

/* ---------------- สิทธิ์ ---------------- */
revoke all on function public._ar_season() from public, anon, authenticated;
revoke all on function public._ar_today() from public, anon, authenticated;
revoke all on function public._ar_week() from public, anon, authenticated;
revoke all on function public._ar_rat(uuid, int) from public, anon, authenticated;
revoke all on function public._ar_make(text, uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public._ar_try(text) from public, anon, authenticated;
revoke all on function public._ar_row(bigint) from public, anon, authenticated;
revoke all on function public._ar_settle(bigint) from public, anon, authenticated;
revoke all on function public._ar_close(text) from public, anon, authenticated;
revoke all on function public._season_close(text) from public, anon, authenticated;
revoke all on function public.arena_queue_join(integer, text, text) from public, anon;
revoke all on function public.arena_queue_poll() from public, anon;
revoke all on function public.arena_queue_leave() from public, anon;
revoke all on function public.arena_ready(bigint, jsonb) from public, anon;
revoke all on function public.arena_state(bigint) from public, anon;
revoke all on function public.arena_hit(bigint, text, integer) from public, anon;
revoke all on function public.arena_heal(bigint, integer) from public, anon;
revoke all on function public.arena_forfeit(bigint) from public, anon;
revoke all on function public.arena_me(integer) from public, anon;
revoke all on function public.arena_board(text) from public, anon;
revoke all on function public.arena_buy(integer, text, integer) from public, anon;
revoke all on function public.season_board(text) from public, anon;
grant execute on function public.arena_queue_join(integer, text, text) to authenticated;
grant execute on function public.arena_queue_poll() to authenticated;
grant execute on function public.arena_queue_leave() to authenticated;
grant execute on function public.arena_ready(bigint, jsonb) to authenticated;
grant execute on function public.arena_state(bigint) to authenticated;
grant execute on function public.arena_hit(bigint, text, integer) to authenticated;
grant execute on function public.arena_heal(bigint, integer) to authenticated;
grant execute on function public.arena_forfeit(bigint) to authenticated;
grant execute on function public.arena_me(integer) to authenticated;
grant execute on function public.arena_board(text) to authenticated;
grant execute on function public.arena_buy(integer, text, integer) to authenticated;
grant execute on function public.season_board(text) to authenticated;
