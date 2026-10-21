-- =====================================================================
-- Everlevel v0.82 — กันโกงฝั่งเซิร์ฟเวอร์ (รันหลังไฟล์ทั้งหมดก่อนหน้า · รันซ้ำได้ · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
--
-- 1) ปิดช่องสร้างตัวละครพร้อมเลเวลปลอม (สร้างใหม่ = Novice Lv.1 เสมอ)
-- 2) ปิดช่องปั๊มโควตาด้วยการกดรับจดหมายซ้ำ/รับจดหมายของคนอื่น
-- 3) เซฟทุกครั้งตรวจ:
--      [ปฏิเสธเซฟ] แต้มสเตตัส/แต้มสกิลเกินที่เลเวลได้รับ · สเตตัสเกิน 130 · Job Lv เกินเพดานอาชีพ · ข้อมูลอาชีพผิด
--                  → ไม่บันทึก · ติดธงบัญชี (cheat) · ล็อกการแลก · ซ่อนจากอันดับ · ห้ามเข้าอารีน่า
--      [ติดธงให้ GM ดู] ของ/Zeny เพิ่มเร็วผิดปกติ · เลเวลขึ้นเร็วเกินจริง · ของที่ไม่มีในเกม · ชุดร้านเพชรที่ไม่มีประวัติซื้อ
--                  → บันทึกตามปกติแต่ล็อกการแลก + เก็บสำเนาเซฟก่อนหน้าไว้ให้ GM กด "ย้อนเซฟ" ได้
-- 4) หน้าแอดมิน (ร้านเพชร → แท็บ "กันโกง"): ดูรายการ · ย้อนเซฟ · ยืนยันว่าไม่ได้โกง (ปลดล็อก)
-- =====================================================================

-- ---------- คอลัมน์/ตาราง ----------
alter table public.accounts   add column if not exists cheat    text;          -- ธงโกงแบบชัดเจน (ซ่อนจากอันดับ/อารีน่า)
alter table public.accounts   add column if not exists cheat_at timestamptz;
alter table public.characters add column if not exists saved_at timestamptz;   -- เวลาเซฟผ่าน save_state ล่าสุด (ใช้วัดความเร็วเลเวล)

create table if not exists public.cheat_log (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  slot       smallint    not null,
  name       text,
  kind       text        not null check (kind in ('soft', 'hard')),
  reason     text        not null,
  detail     jsonb,
  snapshot   jsonb,                       -- เซฟก่อนหน้า (ใช้ย้อน)
  status     text        not null default 'open' check (status in ('open', 'ok', 'rollback')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists cheat_log_open on public.cheat_log (status, created_at desc);
create index if not exists cheat_log_user on public.cheat_log (user_id, slot, created_at desc);
alter table public.cheat_log enable row level security;
revoke all on public.cheat_log from anon, authenticated;

-- ---------- 1) สร้างตัวละครใหม่ = Novice Lv.1 เสมอ ----------
create or replace function public._char_bi()
returns trigger language plpgsql set search_path = public as $$
begin
  new.job := 'novice'; new.lv := 1; new.jlv := 1; new.data := '{}'::jsonb; new.rev := 0; new.saved_at := null;
  new.map := 'asteria_town'; new.updated_at := now();
  return new;
end $$;
drop trigger if exists characters_bi on public.characters;
create trigger characters_bi before insert on public.characters for each row execute function public._char_bi();
revoke insert, update on public.characters from authenticated;
grant insert (user_id, slot, name, job, lv, jlv) on public.characters to authenticated;   -- คงคอลัมน์เดิมไว้ให้เกมเวอร์ชันเก่าไม่พัง (ทริกเกอร์ทับค่าให้)
grant update (name, updated_at) on public.characters to authenticated;

-- ---------- 2) รับจดหมาย: ต้องเป็นจดหมายที่เห็นได้จริง · บัญชีละครั้ง / ตัวละครละครั้ง (ไม่เกินจำนวนตัวละคร) ----------
create or replace function public._mail_claim_ok(p_mail bigint, p_cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mails m
    where m.id = p_mail
      and (m.expires_at is null or m.expires_at > now())
      and (m.to_name is null or lower(btrim(m.to_name)) in (select lower(btrim(c.name)) from characters c where c.user_id = auth.uid()))
      and case when m.per = 'account' then p_cid = 'acct'
               else p_cid <> 'acct'
                    and (select count(*) from mail_claims x where x.mail_id = p_mail and x.user_id = auth.uid())
                        < (select count(*) from characters c where c.user_id = auth.uid()) end
  );
$$;
revoke all on function public._mail_claim_ok(bigint, text) from public, anon;
grant execute on function public._mail_claim_ok(bigint, text) to authenticated;
revoke insert on public.mail_claims from authenticated;
grant insert (mail_id, user_id, cid) on public.mail_claims to authenticated;   -- เวลารับ = เวลาเซิร์ฟเวอร์เสมอ
drop policy if exists "mail_claims_insert_own" on public.mail_claims;
create policy "mail_claims_insert_own" on public.mail_claims for insert to authenticated
  with check (user_id = (select auth.uid()) and public._mail_claim_ok(mail_id, cid));

-- ---------- 3) ตัวช่วยคำนวณ (ต้องตรงกับ js/data/progression.js) ----------
-- แต้มสเตตัสทั้งหมดที่ได้ถึงเลเวล lv = 24 + Σ(floor(L/5)+3) ของ L = 2..lv
create or replace function public._stat_budget(lv int)
returns int language sql immutable as $$
  select 24 + coalesce((select sum(floor(l / 5) + 3)::int from generate_series(2, greatest(1, least(150, lv))) l), 0)
$$;
-- แต้มที่ใช้ไปกับสเตตัส v (ราคาแต่ละขั้น = floor((u-1)/10)+2)
create or replace function public._stat_cost_to(v int)
returns int language sql immutable as $$
  select coalesce((select sum(floor((u - 1) / 10) + 2)::int from generate_series(1, greatest(1, v) - 1) u), 0)
$$;
create or replace function public._job_max(job text)
returns int language sql immutable as $$
  select case when job = 'novice' then 10
              when job in ('swordsman', 'mage', 'archer', 'acolyte') then 99
              when job in ('knight', 'wizard', 'hunter', 'priest') then 70 else 0 end
$$;
create or replace function public._job_tier(job text)
returns int language sql immutable as $$
  select case when job = 'novice' then 0 when job in ('knight', 'wizard', 'hunter', 'priest') then 2
              when job in ('swordsman', 'mage', 'archer', 'acolyte') then 1 else -1 end
$$;
-- แต้มสกิลทั้งหมดที่ได้: Novice Job Lv-1 · ขั้น 1 = 9 + (Job Lv-1) · ขั้น 2 = 9 + (Job Lv ขั้น 1 - 1) + (Job Lv-1)
create or replace function public._skill_budget(job text, jl int, jl1 int)
returns int language sql immutable as $$
  select case public._job_tier(job) when 0 then jl - 1 when 1 then 9 + jl - 1 when 2 then 9 + (jl1 - 1) + (jl - 1) else 0 end
$$;
-- จำนวนเต็มจาก jsonb (ค่าผิดรูปแบบ → null)
create or replace function public._ji(v jsonb)
returns bigint language sql immutable as $$
  select case when jsonb_typeof(v) = 'number' and (v #>> '{}') ~ '^-?[0-9]{1,12}(\.0+)?$' then floor((v #>> '{}')::numeric)::bigint end
$$;

-- ตรวจค่าตัวละคร → { hard: ข้อผิดพลาดที่เป็นไปไม่ได้, sx: แต้มสเตตัสเกิน, kx: แต้มสกิลเกิน }
create or replace function public._char_check(p jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
declare
  job text := p->>'job'; lv bigint := public._ji(p->'baseLevel'); jl bigint := public._ji(p->'jobLevel');
  jl1 bigint := coalesce(public._ji(p->'jobLv1'), 0); sp bigint := coalesce(public._ji(p->'statPoints'), 0);
  kp bigint := coalesce(public._ji(p->'skillPoints'), 0); hard text; spent bigint := 0; kspent bigint := 0;
  k text; v bigint; e record;
begin
  if lv is null or lv < 1 or lv > 150 then hard := 'baseLevel'; end if;
  if public._job_tier(job) < 0 then hard := coalesce(hard, 'job'); job := 'novice'; end if;
  if jl is null or jl < 1 or jl > public._job_max(job) then hard := coalesce(hard, 'jobLevel'); end if;
  if public._job_tier(job) = 2 and (jl1 < 40 or jl1 > 99) then hard := coalesce(hard, 'jobLv1'); end if;
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
    'kx', kspent + kp - public._skill_budget(job, jl::int, least(99, greatest(1, jl1))::int));
end $$;

-- วินาทีขั้นต่ำที่ต้องใช้อัปจาก lo → hi (ใจกว้าง: เท่ากับฆ่ามอนมาตรฐาน 12 ตัว/วินาที · ฟรี 3 เลเวลแรก · ต่ำกว่า Lv.30 ไม่นับ)
create or replace function public._lv_secs(lo int, hi int)
returns numeric language sql immutable as $$
  select coalesce(sum(4 + 1.5 * l + 0.03 * l * l) / 12.0, 0)
  from generate_series(greatest(30, lo + 3), hi - 1) l
$$;

-- ชุดแฟชั่นที่หาได้จากร้านเพชรเท่านั้น
create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon']
$$;

-- บันทึกรายการโกง (ไม่ซ้ำ: มีรายการ open ของตัวละครนี้ภายใน 1 ชม. แล้วไม่เพิ่ม — ยกเว้นแบบ hard)
create or replace function public._cheat_note(p_user uuid, p_slot int, p_kind text, p_reason text, p_detail jsonb, p_snap jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'soft' and exists (select 1 from cheat_log where user_id = p_user and slot = p_slot and status = 'open' and created_at > now() - interval '1 hour') then return; end if;
  insert into cheat_log (user_id, slot, name, kind, reason, detail, snapshot)
  values (p_user, p_slot, (select name from characters where user_id = p_user and slot = p_slot), p_kind, left(p_reason, 200), p_detail,
          case when p_snap ? 'player' then p_snap end);
end $$;
revoke all on function public._cheat_note(uuid, int, text, text, jsonb, jsonb) from public, anon, authenticated;

-- ---------- เซฟ (แทนของเดิมใน trade.sql) ----------
create or replace function public.save_state(p_slot integer, p_rev bigint, p_data jsonb, p_storage jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); ch characters%rowtype; ac accounts%rowtype;
  old_w record; new_w record; st jsonb; secs numeric; gain bigint; allow numeric;
  mail_bonus bigint := 0; lv_old int; lv_new int; reason text;
  chk_new jsonb; chk_old jsonb; hard text; since numeric; need numeric; cash_bad text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'player') is distinct from 'object' then raise exception 'bad_data'; end if;
  if pg_column_size(p_data) > 390000 then raise exception 'too_big'; end if;
  select * into ch from characters where user_id = uid and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  if coalesce(p_rev, -1) <> ch.rev then return jsonb_build_object('ok', false, 'reason', 'stale', 'rev', ch.rev); end if;

  insert into accounts (user_id) values (uid) on conflict (user_id) do nothing;
  select * into ac from accounts where user_id = uid for update;
  st := case when jsonb_typeof(p_storage) = 'array' then p_storage else ac.storage end;
  if pg_column_size(st) > 190000 then raise exception 'storage_too_big'; end if;

  -- [ปฏิเสธเซฟ] ค่าที่เป็นไปไม่ได้ · แต้มเกิน (เทียบกับเซฟเดิม — เซฟเก่าที่เคยเพี้ยนไม่โดนย้อนหลัง)
  chk_new := public._char_check(p_data->'player');
  chk_old := case when ch.data ? 'player' then public._char_check(ch.data->'player') else jsonb_build_object('sx', 0, 'kx', 0) end;
  hard := chk_new->>'hard';
  if hard is null and (chk_new->>'sx')::int > greatest(0, (chk_old->>'sx')::int) then hard := format('stat_points +%s', (chk_new->>'sx')::int - greatest(0, (chk_old->>'sx')::int)); end if;
  if hard is null and (chk_new->>'kx')::int > greatest(0, (chk_old->>'kx')::int) then hard := format('skill_points +%s', (chk_new->>'kx')::int - greatest(0, (chk_old->>'kx')::int)); end if;
  if hard is not null then
    perform public._cheat_note(uid, p_slot, 'hard', hard, jsonb_build_object('lv', p_data->'player'->'baseLevel', 'job', p_data->'player'->'job', 'check', chk_new), ch.data);
    update accounts set cheat = coalesce(cheat, left(hard, 120)), cheat_at = coalesce(cheat_at, now()) where user_id = uid;
    perform public._lock(uid, 'cheat: ' || hard);
    delete from season_scores where user_id = uid and season = public._season();
    delete from arena_queue where user_id = uid;
    return jsonb_build_object('ok', false, 'reason', 'rejected', 'issue', hard, 'rev', ch.rev);
  end if;

  select * into old_w from public._wealth(ch.data, ac.storage);
  select * into new_w from public._wealth(p_data, st);

  -- ถังโควตา: เติมตามเวลาที่เล่น (ช่วงห่างระหว่างเซฟคิดสูงสุด 15 นาที — ออฟไลน์นาน ๆ ไม่ได้โควตาเพิ่ม)
  lv_old := coalesce(ch.lv, 1);
  lv_new := greatest(1, least(150, coalesce(public._ji(p_data->'player'->'baseLevel'), 1)))::int;
  secs := least(900, greatest(0, extract(epoch from now() - coalesce(ac.budget_at, now() - interval '15 minutes'))));
  allow := least(ac.budget + secs * public._rate(least(lv_old, lv_new)), 1000000 + public._rate(lv_new) * 1800);
  -- ของจากจดหมาย GM ที่เพิ่งกดรับ ไม่นับเป็นการได้ของผิดปกติ
  select coalesce(sum(m.zeny + coalesce((select sum(coalesce(c.price, 0) * least(999, greatest(0, (e->>1)::bigint)))
                                         from jsonb_array_elements(m.items) e left join item_catalog c on c.id = split_part(e->>0, '*', 1)
                                         where (e->>1) ~ '^[0-9]+$'), 0)), 0)
    into mail_bonus
  from mail_claims mc join mails m on m.id = mc.mail_id
  where mc.user_id = uid and mc.claimed_at > coalesce(ac.budget_at, now() - interval '15 minutes');
  allow := allow + mail_bonus;

  -- ชุดร้านเพชรที่ไม่มีประวัติซื้อ (และไม่ได้มาจากจดหมาย GM)
  select string_agg(f, ',') into cash_bad
  from jsonb_array_elements_text(case when jsonb_typeof(p_data->'player'->'fashion'->'owned') = 'array' then p_data->'player'->'fashion'->'owned' else '[]'::jsonb end) f
  where f = any(public._cash_only_fashion())
    and not (case when jsonb_typeof(ch.data->'player'->'fashion'->'owned') = 'array' then ch.data->'player'->'fashion'->'owned' else '[]'::jsonb end) ? f
    and not exists (select 1 from cash_purchases cp join cash_products pr on pr.id = cp.product where cp.user_id = uid and pr.ref = f)
    and not exists (select 1 from mail_claims mc join mails m on m.id = mc.mail_id where mc.user_id = uid and (m.picks::text like '%' || f || '%' or m.items::text like '%' || f || '%'));

  -- ความเร็วเลเวล: เทียบเวลาตั้งแต่เซฟล่าสุด
  since := extract(epoch from now() - coalesce(ch.saved_at, now() - interval '15 minutes'));
  need := public._lv_secs(lv_old, lv_new);

  gain := new_w.wealth - old_w.wealth;
  reason := null;
  if new_w.unknown > 0 and new_w.unknown > old_w.unknown then reason := 'unknown_item'; end if;
  if new_w.bad > 0 then reason := coalesce(reason, 'bad_value'); end if;
  if gain > allow then reason := coalesce(reason, format('wealth +%s > %s', gain, floor(allow))); end if;
  if lv_new > lv_old and need > since then reason := coalesce(reason, format('level %s→%s ใน %s วิ (ต้องใช้ ≥ %s)', lv_old, lv_new, floor(since), ceil(need))); end if;
  if cash_bad is not null then reason := coalesce(reason, 'cash_fashion ' || cash_bad); end if;
  if reason is not null then
    perform public._lock(uid, reason);
    perform public._cheat_note(uid, p_slot, 'soft', reason, jsonb_build_object('gain', gain, 'allow', floor(allow), 'lv', jsonb_build_array(lv_old, lv_new)), ch.data);
  end if;

  update accounts set
    storage = st, updated_at = now(), wealth = new_w.wealth, budget_at = now(),
    budget = greatest(0, floor(allow - greatest(gain, 0)))::bigint
  where user_id = uid;
  update characters set
    data = p_data, updated_at = now(), saved_at = now(),
    job = left(coalesce(p_data->'player'->>'job', job), 20),
    lv = lv_new,
    jlv = greatest(1, least(99, coalesce(public._ji(p_data->'player'->'jobLevel'), 1)))::int,
    map = left(coalesce(p_data->'player'->>'map', map), 40)
  where user_id = uid and slot = p_slot;
  return jsonb_build_object('ok', true, 'rev', ch.rev, 'locked', (select trade_lock is not null from accounts where user_id = uid));
end $$;
revoke all on function public.save_state(integer, bigint, jsonb, jsonb) from public, anon;
grant execute on function public.save_state(integer, bigint, jsonb, jsonb) to authenticated;

-- ---------- บัญชีติดธง: ไม่เก็บแต้มฤดูกาล · เข้าคิวอารีน่าไม่ได้ · ไม่ขึ้นอันดับ ----------
create or replace function public._flagged(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where user_id = p_user and cheat is not null)
$$;
revoke all on function public._flagged(uuid) from public, anon, authenticated;

create or replace function public._season_flag_tg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public._flagged(new.user_id) then return null; end if;
  return new;
end $$;
drop trigger if exists season_scores_flag on public.season_scores;
create trigger season_scores_flag before insert or update on public.season_scores for each row execute function public._season_flag_tg();

create or replace function public._arena_flag_tg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public._flagged(new.user_id) then raise exception 'cheat_flag'; end if;
  return new;
end $$;
drop trigger if exists arena_queue_flag on public.arena_queue;
create trigger arena_queue_flag before insert on public.arena_queue for each row execute function public._arena_flag_tg();

create or replace function public.leaderboard(n integer default 30)
returns table (name text, job text, lv smallint, jlv smallint, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.job, c.lv, c.jlv, (c.user_id = auth.uid()) as mine
  from public.characters c
  where not exists (select 1 from public.accounts a where a.user_id = c.user_id and a.cheat is not null)
  order by c.lv desc, c.jlv desc, c.updated_at asc
  limit least(greatest(coalesce(n, 30), 1), 100);
$$;
revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to anon, authenticated;

-- ---------- 4) GM ----------
-- รายการตรวจ (open ก่อน แล้วล่าสุด)
create or replace function public.gm_cheat_log(p_status text default 'open')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'name', coalesce(c.name, l.name), 'slot', l.slot, 'kind', l.kind, 'reason', l.reason, 'detail', l.detail,
      'status', l.status, 'at', l.created_at, 'snap', l.snapshot is not null,
      'snap_lv', l.snapshot->'player'->'baseLevel', 'lv', c.lv, 'lock', a.trade_lock, 'cheat', a.cheat) order by l.created_at desc)
    from (select * from cheat_log where p_status = 'all' or status = p_status order by created_at desc limit 100) l
    left join characters c on c.user_id = l.user_id and c.slot = l.slot
    left join accounts a on a.user_id = l.user_id), '[]'::jsonb);
end $$;

-- ย้อนเซฟตัวละครกลับเป็นสำเนาก่อนโกง (เกมผู้เล่นจะโหลดใหม่เอง) · ธง/ล็อกยังอยู่จนกว่า GM จะกด "ปลดธง"
create or replace function public.gm_cheat_rollback(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l cheat_log; r bigint; d jsonb;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into l from cheat_log where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if l.snapshot is null then raise exception 'no_snapshot'; end if;
  d := l.snapshot;
  update characters set data = d, rev = rev + 1, updated_at = now(), saved_at = now(),
    lv = greatest(1, least(150, coalesce(public._ji(d->'player'->'baseLevel'), 1)))::int,
    jlv = greatest(1, least(99, coalesce(public._ji(d->'player'->'jobLevel'), 1)))::int,
    job = left(coalesce(d->'player'->>'job', job), 20)
   where user_id = l.user_id and slot = l.slot returning rev into r;
  if r is null then raise exception 'no_character'; end if;
  insert into char_ledger (user_id, slot, rev, delta) values (l.user_id, l.slot, r, jsonb_build_object('reload', true, 'note', 'GM ย้อนข้อมูลตัวละคร'));
  update cheat_log set status = 'rollback', handled_at = now() where id = p_id;
  -- รายการ open อื่นของตัวละครนี้ถือว่าจัดการแล้ว
  update cheat_log set status = 'rollback', handled_at = now() where user_id = l.user_id and slot = l.slot and status = 'open' and id > p_id;
  return jsonb_build_object('ok', true, 'rev', r);
end $$;

-- ปิดรายการ (ok = ไม่ได้โกง) · p_clear = ปลดธงโกง + ปลดล็อกการแลกด้วย
create or replace function public.gm_cheat_close(p_id bigint, p_clear boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l cheat_log;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into l from cheat_log where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if l.status = 'open' then update cheat_log set status = 'ok', handled_at = now() where id = p_id; end if;
  if p_clear then
    update accounts set cheat = null, cheat_at = null, trade_lock = null, lock_at = null, budget = 0, budget_at = now() where user_id = l.user_id;
    update cheat_log set status = 'ok', handled_at = now() where user_id = l.user_id and status = 'open';
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.gm_cheat_log(text) from public, anon;
revoke all on function public.gm_cheat_rollback(bigint) from public, anon;
revoke all on function public.gm_cheat_close(bigint, boolean) from public, anon;
grant execute on function public.gm_cheat_log(text) to authenticated;
grant execute on function public.gm_cheat_rollback(bigint) to authenticated;
grant execute on function public.gm_cheat_close(bigint, boolean) to authenticated;

-- helper ภายใน: ห้ามเรียกจากภายนอก
revoke all on function public._char_check(jsonb) from public, anon, authenticated;
revoke all on function public._stat_budget(int), public._stat_cost_to(int), public._job_max(text), public._job_tier(text),
              public._skill_budget(text, int, int), public._ji(jsonb), public._lv_secs(int, int), public._cash_only_fashion()
  from public, anon, authenticated;
revoke all on function public._char_bi(), public._season_flag_tg(), public._arena_flag_tg() from public, anon, authenticated;

-- ปลดล็อกที่เกิดจากการตรวจเลเวลแบบเก่า (เข้มเกินไปช่วงเลเวลต่ำ เช่น "level 16→20") — ระบบใหม่ใช้สูตรตามเวลาจริงแทน
update public.accounts set trade_lock = null, lock_at = null where trade_lock ~ '^level [0-9]+→[0-9]+$';

-- ตรวจผล: ตัวละครทุกตัวในเซิร์ฟเวอร์ตอนนี้ (แต้มเกิน = sx/kx มากกว่า 0)
select c.name, c.lv, c.job, public._char_check(c.data->'player') as check
from public.characters c where c.data ? 'player' order by c.lv desc;
