-- v0.93 fix22 · กันเปิดตัวละครเดียวกันซ้อน 2 ที่ (เซฟทับกันสลับไปมา = ข้อมูลย้อน)
--             · ตีราคาอุปกรณ์ (kind='equip') 20% ตอนเช็คความมั่งคั่ง — ของดรอป MVP ไม่ติดธงอีก
-- รันซ้ำได้

alter table public.characters add column if not exists sess uuid;

-- เรียกตอนโหลดตัวละคร: ออกรหัสประจำครั้งใหม่ → แท็บ/เครื่องที่เปิดไว้ก่อนจะเซฟไม่ได้อีก
create or replace function public.claim_session(p_slot integer)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare s uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update characters set sess = s where user_id = auth.uid() and slot = p_slot;
  if not found then return null; end if;
  return s;
end $$;
revoke all on function public.claim_session(integer) from public, anon;
grant execute on function public.claim_session(integer) to authenticated;

create or replace function public._wealth(d jsonb, st jsonb, OUT wealth bigint, OUT unknown integer, OUT bad integer)
returns record language plpgsql stable set search_path to 'public' as $function$
declare items jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(d->'player'->'inventory') = 'array' then items := items || (d->'player'->'inventory'); end if;
  if jsonb_typeof(st) = 'array' then items := items || st; end if;
  if jsonb_typeof(d->'player'->'equip') = 'object' then
    items := items || coalesce((select jsonb_agg(jsonb_build_array(v, 1)) from jsonb_each_text(d->'player'->'equip') x(k, v) where v is not null and v <> ''), '[]'::jsonb);
  end if;
  select coalesce(sum(case when c.kind = 'equip' then coalesce(c.price, 0) / 5 else coalesce(c.price, 0) end * x.q), 0),
         count(*) filter (where c.id is null),
         count(*) filter (where x.q < 0 or x.q > 999 or not public._key_ok(x.k))
    into wealth, unknown, bad
  from (
    select e->>0 as k, split_part(e->>0, '*', 1) as b,
           case when (e->>1) ~ '^-?[0-9]{1,9}$' then (e->>1)::bigint else 0 end as q
    from jsonb_array_elements(items) e
    where jsonb_typeof(e) = 'array' and left(coalesce(e->>0, '_'), 1) <> '_'
  ) x left join item_catalog c on c.id = x.b;
  wealth := wealth + public._zeny(d);
  if public._zeny(d) > 999999999 then bad := bad + 1; end if;
end $function$;

drop function if exists public.save_state(integer, bigint, jsonb, jsonb);
create or replace function public.save_state(p_slot integer, p_rev bigint, p_data jsonb, p_storage jsonb default null, p_sess uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
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
  -- fix22 ตัวละครนี้ถูกเปิดจากที่อื่นหลังจากนี้ → ไม่รับเซฟจากที่เก่า
  if p_sess is not null and ch.sess is not null and ch.sess <> p_sess then return jsonb_build_object('ok', false, 'reason', 'dup', 'rev', ch.rev); end if;
  if coalesce(p_rev, -1) <> ch.rev then return jsonb_build_object('ok', false, 'reason', 'stale', 'rev', ch.rev); end if;

  insert into accounts (user_id) values (uid) on conflict (user_id) do nothing;
  select * into ac from accounts where user_id = uid for update;
  st := case when jsonb_typeof(p_storage) = 'array' then p_storage else ac.storage end;
  if pg_column_size(st) > 190000 then raise exception 'storage_too_big'; end if;

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

  lv_old := coalesce(ch.lv, 1);
  lv_new := greatest(1, least(150, coalesce(public._ji(p_data->'player'->'baseLevel'), 1)))::int;
  secs := least(900, greatest(0, extract(epoch from now() - coalesce(ac.budget_at, now() - interval '15 minutes'))));
  allow := least(ac.budget + secs * public._rate(least(lv_old, lv_new)), 1000000 + public._rate(lv_new) * 1800);
  select coalesce(sum(m.zeny + coalesce((select sum(coalesce(c.price, 0) * least(999, greatest(0, (e->>1)::bigint)))
                                         from jsonb_array_elements(m.items) e left join item_catalog c on c.id = split_part(e->>0, '*', 1)
                                         where (e->>1) ~ '^[0-9]+$'), 0)), 0)
    into mail_bonus
  from mail_claims mc join mails m on m.id = mc.mail_id
  where mc.user_id = uid and mc.claimed_at > coalesce(ac.budget_at, now() - interval '15 minutes');
  allow := allow + mail_bonus;

  select string_agg(f, ',') into cash_bad
  from jsonb_array_elements_text(case when jsonb_typeof(p_data->'player'->'fashion'->'owned') = 'array' then p_data->'player'->'fashion'->'owned' else '[]'::jsonb end) f
  where f = any(public._cash_only_fashion())
    and not (case when jsonb_typeof(ch.data->'player'->'fashion'->'owned') = 'array' then ch.data->'player'->'fashion'->'owned' else '[]'::jsonb end) ? f
    and not exists (select 1 from cash_purchases cp join cash_products pr on pr.id = cp.product where cp.user_id = uid and pr.ref = f)
    and not exists (select 1 from mail_claims mc join mails m on m.id = mc.mail_id where mc.user_id = uid and (m.picks::text like '%' || f || '%' or m.items::text like '%' || f || '%'));

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
end $function$;
revoke all on function public.save_state(integer, bigint, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.save_state(integer, bigint, jsonb, jsonb, uuid) to authenticated;
