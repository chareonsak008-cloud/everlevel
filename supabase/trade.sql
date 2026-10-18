-- =====================================================================
-- Everlevel v0.42 — เซฟผ่านเซิร์ฟเวอร์ + แลกของ + ตลาดฝากขาย
-- รันหลัง setup.sql (รันซ้ำได้ ไม่เสียข้อมูล · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ trade.sql → กด Run
--
-- หลักการ
--   * ผู้เล่นเขียนตาราง characters / accounts ตรง ๆ ไม่ได้อีกแล้ว (ยกเว้นสร้างตัว / เปลี่ยนชื่อ / ลบ)
--     เซฟทุกครั้งผ่านฟังก์ชัน save_state() ที่ตรวจว่า "ความมั่งคั่ง" (เงิน + ราคาไอเทมทั้งหมด)
--     ไม่เพิ่มเร็วเกินกว่าที่เล่นได้จริง (ถังโควตาตามเลเวล) · เกินเมื่อไหร่ = ล็อกการแลก/ตลาดของบัญชี
--     (เซฟยังผ่าน ผู้เล่นปกติไม่เสียของ) · แอดมินปลดล็อกได้ด้วย gm_trade_unlock()
--   * การแลกและตลาดย้ายของในเซฟบนเซิร์ฟเวอร์โดยตรง (ไม่เชื่อตัวเลขจากเครื่องผู้เล่น)
--     ทุกครั้งที่เซิร์ฟเวอร์แก้เซฟ → rev +1 และเขียนรายการ char_ledger ให้เกมนำไปปรับกระเป๋าในเครื่อง
--     เซฟที่ส่ง rev เก่ามา = ถูกปฏิเสธ (stale) เกมต้องดึง ledger มาปรับก่อนแล้วเซฟใหม่ → กันของซ้ำ
-- =====================================================================

-- ---------- ราคาไอเทม (ชุดข้อมูลจากเกม · สร้างอัตโนมัติท้ายไฟล์) ----------
create table if not exists public.item_catalog (
  id        text primary key,
  price     bigint  not null default 0 check (price >= 0),
  kind      text    not null default 'etc',
  tradable  boolean not null default true
);
alter table public.item_catalog enable row level security;
revoke all on public.item_catalog from anon, authenticated;

-- ---------- คอลัมน์ใหม่ ----------
alter table public.characters add column if not exists rev bigint not null default 0;
alter table public.accounts   add column if not exists budget     bigint      not null default 0;
alter table public.accounts   add column if not exists budget_at  timestamptz;
alter table public.accounts   add column if not exists wealth     bigint      not null default 0;
alter table public.accounts   add column if not exists trade_lock text;
alter table public.accounts   add column if not exists lock_at    timestamptz;

-- ---------- สิทธิ์: ปิดการเขียนตรง ----------
revoke insert, update on public.characters from authenticated;
grant insert (user_id, slot, name, job, lv, jlv) on public.characters to authenticated;
grant update (name, updated_at) on public.characters to authenticated;
revoke insert, update on public.accounts from authenticated;

-- ---------- รายการที่เซิร์ฟเวอร์แก้เซฟ (เกมดึงไปปรับในเครื่อง) ----------
create table if not exists public.char_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid     not null references auth.users (id) on delete cascade,
  slot       smallint not null,
  rev        bigint   not null,
  delta      jsonb    not null,   -- { inv: [[id, ±qty], ...], zeny: ±n, note: '...' }
  created_at timestamptz not null default now()
);
create index if not exists char_ledger_owner on public.char_ledger (user_id, slot, rev);
alter table public.char_ledger enable row level security;
revoke all on public.char_ledger from anon, authenticated;

-- =====================================================================
-- ตัวช่วยกระเป๋า (inventory = [[id, qty], ...])
-- =====================================================================
create or replace function public._inv_count(inv jsonb, p_id text)
returns bigint language sql immutable set search_path = public as $$
  select coalesce(sum(case when (e->>1) ~ '^[0-9]+$' then (e->>1)::bigint else 0 end), 0)
  from jsonb_array_elements(case when jsonb_typeof(inv) = 'array' then inv else '[]'::jsonb end) e
  where e->>0 = p_id;
$$;

-- เพิ่ม/ลด (qty ติดลบ = ลด) · ไม่พอ หรือเกิน 999 = error
create or replace function public._inv_add(inv jsonb, p_id text, p_qty bigint)
returns jsonb language plpgsql immutable set search_path = public as $$
declare have bigint; out jsonb := '[]'::jsonb; e jsonb; done boolean := false;
begin
  if jsonb_typeof(inv) is distinct from 'array' then inv := '[]'::jsonb; end if;
  have := public._inv_count(inv, p_id);
  if have + p_qty < 0 then raise exception 'not_enough:%', p_id; end if;
  if have + p_qty > 999 then raise exception 'stack_full:%', p_id; end if;
  for e in select * from jsonb_array_elements(inv) loop
    if e->>0 = p_id then
      if not done and have + p_qty > 0 then out := out || jsonb_build_array(jsonb_build_array(p_id, have + p_qty)); end if;
      done := true;
    else out := out || jsonb_build_array(e); end if;
  end loop;
  if not done and p_qty > 0 then out := out || jsonb_build_array(jsonb_build_array(p_id, p_qty)); end if;
  return out;
end $$;

create or replace function public._zeny(d jsonb)
returns bigint language sql immutable set search_path = public as $$
  select coalesce(case when (d->'player'->>'zeny') ~ '^[0-9]{1,12}$' then (d->'player'->>'zeny')::bigint end, 0);
$$;

-- มูลค่ารวม: เงิน + ไอเทมในกระเป๋า + ที่สวมใส่ + คลัง · คืน (wealth, unknown = จำนวนชนิดไอเทมที่ไม่รู้จัก, bad = ค่าผิดปกติ)
create or replace function public._wealth(d jsonb, st jsonb, out wealth bigint, out unknown int, out bad int)
language plpgsql stable set search_path = public as $$
declare items jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(d->'player'->'inventory') = 'array' then items := items || (d->'player'->'inventory'); end if;
  if jsonb_typeof(st) = 'array' then items := items || st; end if;
  if jsonb_typeof(d->'player'->'equip') = 'object' then
    items := items || coalesce((select jsonb_agg(jsonb_build_array(v, 1)) from jsonb_each_text(d->'player'->'equip') x(k, v) where v is not null and v <> ''), '[]'::jsonb);
  end if;
  select coalesce(sum(coalesce(c.price, 0) * x.q), 0),
         count(*) filter (where c.id is null),
         count(*) filter (where x.q < 0 or x.q > 999)
    into wealth, unknown, bad
  from (
    select split_part(e->>0, '*', 1) as b,
           case when (e->>1) ~ '^-?[0-9]{1,9}$' then (e->>1)::bigint else 0 end as q
    from jsonb_array_elements(items) e
    where jsonb_typeof(e) = 'array' and left(coalesce(e->>0, '_'), 1) <> '_'
  ) x left join item_catalog c on c.id = x.b;
  wealth := wealth + public._zeny(d);
  if public._zeny(d) > 999999999 then bad := bad + 1; end if;
end $$;

-- อัตราได้ของสูงสุดต่อวินาทีตามเลเวล (ใจกว้างพอให้ผู้เล่นปกติไม่โดน: Lv1 ≈ 1 แสน/ชม. · Lv50 ≈ 5.5 ล้าน/ชม. · Lv99 ≈ 21 ล้าน/ชม.)
create or replace function public._rate(lv int)
returns numeric language sql immutable as $$ select 30 + power(greatest(1, least(99, lv)), 2) * 0.6 $$;

-- ล็อกการแลกของบัญชี (เก็บเหตุผลแรกไว้)
create or replace function public._lock(p_user uuid, p_reason text)
returns void language sql set search_path = public as $$
  update accounts set trade_lock = coalesce(trade_lock, left(p_reason, 200)), lock_at = coalesce(lock_at, now()) where user_id = p_user;
$$;

-- =====================================================================
-- เซฟ
-- =====================================================================
-- คืน { ok, rev, locked } หรือ { ok:false, reason:'stale', rev }
create or replace function public.save_state(p_slot integer, p_rev bigint, p_data jsonb, p_storage jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); ch characters%rowtype; ac accounts%rowtype;
  old_w record; new_w record; st jsonb; secs numeric; gain bigint; allow numeric;
  mail_bonus bigint := 0; lv_old int; lv_new int; reason text;
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

  select * into old_w from public._wealth(ch.data, ac.storage);
  select * into new_w from public._wealth(p_data, st);

  -- ถังโควตา: เติมตามเวลาที่เล่น (ช่วงห่างระหว่างเซฟคิดสูงสุด 15 นาที — ออฟไลน์นาน ๆ ไม่ได้โควตาเพิ่ม)
  lv_old := coalesce(ch.lv, 1);
  lv_new := greatest(1, least(99, coalesce(case when (p_data->'player'->>'baseLevel') ~ '^[0-9]{1,3}$' then (p_data->'player'->>'baseLevel')::int end, 1)));
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

  gain := new_w.wealth - old_w.wealth;
  reason := null;
  if new_w.unknown > 0 and new_w.unknown > old_w.unknown then reason := 'unknown_item'; end if;
  if new_w.bad > 0 then reason := coalesce(reason, 'bad_value'); end if;
  if gain > allow then reason := coalesce(reason, format('wealth +%s > %s', gain, floor(allow))); end if;
  if lv_new > lv_old + 3 + floor(secs / 60) and ch.data ? 'player' then reason := coalesce(reason, format('level %s→%s', lv_old, lv_new)); end if;
  if reason is not null then perform public._lock(uid, reason); end if;

  update accounts set
    storage = st, updated_at = now(), wealth = new_w.wealth, budget_at = now(),
    budget = greatest(0, floor(allow - greatest(gain, 0)))::bigint
  where user_id = uid;
  update characters set
    data = p_data, updated_at = now(),
    job = left(coalesce(p_data->'player'->>'job', job), 20),
    lv = lv_new,
    jlv = greatest(1, least(99, coalesce(case when (p_data->'player'->>'jobLevel') ~ '^[0-9]{1,3}$' then (p_data->'player'->>'jobLevel')::int end, 1))),
    map = left(coalesce(p_data->'player'->>'map', map), 40)
  where user_id = uid and slot = p_slot;
  return jsonb_build_object('ok', true, 'rev', ch.rev, 'locked', (select trade_lock is not null from accounts where user_id = uid));
end $$;
revoke all on function public.save_state(integer, bigint, jsonb, jsonb) from public;
grant execute on function public.save_state(integer, bigint, jsonb, jsonb) to authenticated;

-- รายการที่เซิร์ฟเวอร์แก้เซฟหลัง rev ที่เกมรู้
create or replace function public.ledger_since(p_slot integer, p_rev bigint)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rev', (select rev from characters where user_id = auth.uid() and slot = p_slot),
    'items', coalesce((select jsonb_agg(jsonb_build_object('rev', l.rev, 'delta', l.delta) order by l.rev)
                       from char_ledger l where l.user_id = auth.uid() and l.slot = p_slot and l.rev > coalesce(p_rev, 0)), '[]'::jsonb));
$$;
revoke all on function public.ledger_since(integer, bigint) from public;
grant execute on function public.ledger_since(integer, bigint) to authenticated;

-- สถานะของฉัน (rev + ล็อกไหม)
create or replace function public.trade_status(p_slot integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('rev', c.rev, 'lock', a.trade_lock)
  from characters c left join accounts a on a.user_id = c.user_id
  where c.user_id = auth.uid() and c.slot = p_slot;
$$;
revoke all on function public.trade_status(integer) from public;
grant execute on function public.trade_status(integer) to authenticated;

-- ตัวช่วย: แก้เซฟบนเซิร์ฟเวอร์ (ต้องล็อกแถวไว้แล้ว) · delta = { inv: [[id, ±qty]], zeny: ±n, note }
create or replace function public._apply(p_user uuid, p_slot int, p_delta jsonb)
returns void language plpgsql set search_path = public as $$
declare d jsonb; inv jsonb; z bigint; e jsonb; r bigint;
begin
  select data into d from characters where user_id = p_user and slot = p_slot;
  if d is null or jsonb_typeof(d->'player') is distinct from 'object' then raise exception 'no_save'; end if;
  inv := coalesce(d->'player'->'inventory', '[]'::jsonb);
  for e in select * from jsonb_array_elements(coalesce(p_delta->'inv', '[]'::jsonb)) loop
    inv := public._inv_add(inv, e->>0, (e->>1)::bigint);
  end loop;
  z := public._zeny(d) + coalesce((p_delta->>'zeny')::bigint, 0);
  if z < 0 then raise exception 'not_enough_zeny'; end if;
  if z > 999999999 then raise exception 'zeny_full'; end if;
  d := jsonb_set(jsonb_set(d, '{player,inventory}', inv), '{player,zeny}', to_jsonb(z));
  update characters set data = d, rev = rev + 1, updated_at = now() where user_id = p_user and slot = p_slot returning rev into r;
  insert into char_ledger (user_id, slot, rev, delta) values (p_user, p_slot, r, p_delta);
end $$;

-- ตัวช่วย: ตรวจรายการของที่จะให้ [[id, qty], ...] → คืน delta ฝั่งลบ
create or replace function public._offer_items(p_items jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare e jsonb; out jsonb := '[]'::jsonb; q bigint; b text;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 10 then raise exception 'bad_items'; end if;
  for e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'array' or (e->>1) !~ '^[0-9]{1,3}$' then raise exception 'bad_items'; end if;
    q := (e->>1)::bigint; b := split_part(e->>0, '*', 1);
    if q < 1 or q > 999 then raise exception 'bad_items'; end if;
    if not exists (select 1 from item_catalog where id = b and tradable) then raise exception 'untradable:%', e->>0; end if;
    out := out || jsonb_build_array(jsonb_build_array(e->>0, q));
  end loop;
  return out;
end $$;

-- =====================================================================
-- แลกของตัวต่อตัว
-- =====================================================================
create table if not exists public.trades (
  id          bigint generated always as identity primary key,
  a_user uuid not null references auth.users (id) on delete cascade, a_slot smallint not null, a_name text not null,
  b_user uuid not null references auth.users (id) on delete cascade, b_slot smallint not null, b_name text not null,
  a_items jsonb not null default '[]'::jsonb, a_zeny bigint not null default 0 check (a_zeny between 0 and 999999999),
  b_items jsonb not null default '[]'::jsonb, b_zeny bigint not null default 0 check (b_zeny between 0 and 999999999),
  a_ok boolean not null default false, b_ok boolean not null default false,
  ver int not null default 0,                -- เพิ่มทุกครั้งที่ของบนโต๊ะเปลี่ยน
  status text not null default 'invite' check (status in ('invite', 'open', 'done', 'cancel')),
  note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists trades_a on public.trades (a_user, a_slot, status);
create index if not exists trades_b on public.trades (b_user, b_slot, status);
alter table public.trades enable row level security;
revoke all on public.trades from anon, authenticated;

-- ตัวช่วย: แถวของฉันในการแลก (ล็อกแถว) · คืน 'a' หรือ 'b'
create or replace function public._trade_side(t trades, p_slot int)
returns text language sql stable as $$
  select case when t.a_user = auth.uid() and t.a_slot = p_slot then 'a' when t.b_user = auth.uid() and t.b_slot = p_slot then 'b' end;
$$;

create or replace function public._trade_json(t trades, p_slot int)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('id', t.id, 'status', t.status, 'note', t.note, 'ver', t.ver,
    'me', public._trade_side(t, p_slot),
    'a', jsonb_build_object('name', t.a_name, 'items', t.a_items, 'zeny', t.a_zeny, 'ok', t.a_ok),
    'b', jsonb_build_object('name', t.b_name, 'items', t.b_items, 'zeny', t.b_zeny, 'ok', t.b_ok),
    'age', extract(epoch from now() - t.updated_at)::int);
$$;

-- ชวนแลก (ยกเลิกการแลกค้างอื่นของฉันอัตโนมัติ) · คืน trade json
create or replace function public.trade_invite(p_slot integer, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me characters%rowtype; you characters%rowtype; t trades%rowtype; lk text;
begin
  select * into me from characters where user_id = auth.uid() and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  select trade_lock into lk from accounts where user_id = auth.uid();
  if lk is not null then raise exception 'trade_locked'; end if;
  select * into you from characters where lower(btrim(name)) = lower(btrim(p_name));
  if not found then raise exception 'no_target'; end if;
  if you.user_id = me.user_id then raise exception 'self_trade'; end if;
  update trades set status = 'cancel', note = 'replaced', updated_at = now()
   where status in ('invite', 'open') and ((a_user = me.user_id and a_slot = me.slot) or (b_user = me.user_id and b_slot = me.slot));
  insert into trades (a_user, a_slot, a_name, b_user, b_slot, b_name) values (me.user_id, me.slot, me.name, you.user_id, you.slot, you.name) returning * into t;
  return public._trade_json(t, p_slot);
end $$;

-- การแลกที่ค้างอยู่ของฉัน (คำชวนที่ส่งมาหาฉัน / ที่กำลังแลก) · หมดอายุ: คำชวน 60 วิ · โต๊ะเงียบ 5 นาที
create or replace function public.trade_current(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype;
begin
  update trades set status = 'cancel', note = 'timeout', updated_at = now()
   where status in ('invite', 'open') and ((status = 'invite' and updated_at < now() - interval '60 seconds') or updated_at < now() - interval '5 minutes')
     and ((a_user = auth.uid() and a_slot = p_slot) or (b_user = auth.uid() and b_slot = p_slot));
  select * into t from trades
   where ((a_user = auth.uid() and a_slot = p_slot) or (b_user = auth.uid() and b_slot = p_slot))
     and (status in ('invite', 'open') or updated_at > now() - interval '20 seconds')
   order by id desc limit 1;
  if not found then return null; end if;
  return public._trade_json(t, p_slot);
end $$;

create or replace function public.trade_respond(p_slot integer, p_id bigint, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; lk text;
begin
  select * into t from trades where id = p_id for update;
  if not found or public._trade_side(t, p_slot) is distinct from 'b' or t.status <> 'invite' then raise exception 'no_trade'; end if;
  if p_accept then
    select trade_lock into lk from accounts where user_id = auth.uid();
    if lk is not null then raise exception 'trade_locked'; end if;
    update trades set status = 'open', updated_at = now() where id = p_id returning * into t;
  else
    update trades set status = 'cancel', note = 'declined', updated_at = now() where id = p_id returning * into t;
  end if;
  return public._trade_json(t, p_slot);
end $$;

-- วางของ/เงินบนโต๊ะ (ตรวจกับเซฟบนเซิร์ฟเวอร์ · เกมต้องเซฟก่อนเรียก) · การยืนยันของทั้งคู่รีเซ็ต
-- v0.44.5 ตรวจล่วงหน้าว่ากระเป๋าอีกฝ่ายรับไหว (ชนิดเดียวกันรวมไม่เกิน 999) → แจ้งตอนวางของ ไม่ต้องรอไปพังตอนยืนยัน
create or replace function public.trade_offer(p_slot integer, p_id bigint, p_items jsonb, p_zeny bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; side text; items jsonb; d jsonb; od jsonb; e jsonb;
begin
  select * into t from trades where id = p_id for update;
  side := public._trade_side(t, p_slot);
  if not found or side is null or t.status <> 'open' then raise exception 'no_trade'; end if;
  items := public._offer_items(p_items);
  if coalesce(p_zeny, 0) < 0 or p_zeny > 999999999 then raise exception 'bad_zeny'; end if;
  select data into d from characters where user_id = auth.uid() and slot = p_slot;
  if side = 'a' then select data into od from characters where user_id = t.b_user and slot = t.b_slot;
  else select data into od from characters where user_id = t.a_user and slot = t.a_slot; end if;
  for e in select * from jsonb_array_elements(items) loop
    if public._inv_count(d->'player'->'inventory', e->>0) < (e->>1)::bigint then raise exception 'not_enough:%', e->>0; end if;
    if public._inv_count(od->'player'->'inventory', e->>0) + (e->>1)::bigint > 999 then
      raise exception 'peer_full:%:%', e->>0, 999 - public._inv_count(od->'player'->'inventory', e->>0);
    end if;
  end loop;
  if public._zeny(d) < coalesce(p_zeny, 0) then raise exception 'not_enough_zeny'; end if;
  if public._zeny(od) + coalesce(p_zeny, 0) > 999999999 then raise exception 'peer_zeny_full'; end if;
  if side = 'a' then update trades set a_items = items, a_zeny = coalesce(p_zeny, 0), a_ok = false, b_ok = false, ver = ver + 1, note = null, updated_at = now() where id = p_id returning * into t;
  else update trades set b_items = items, b_zeny = coalesce(p_zeny, 0), a_ok = false, b_ok = false, ver = ver + 1, note = null, updated_at = now() where id = p_id returning * into t; end if;
  return public._trade_json(t, p_slot);
end $$;

-- ยืนยัน (ส่ง ver ที่เห็นมาด้วย กันกดยืนยันของที่อีกฝ่ายเพิ่งเปลี่ยน) · ยืนยันครบสองฝั่ง = ย้ายของทันที
-- แลกฝ่ายเดียวได้ (อีกฝ่ายไม่ต้องวางของ) · ต้องมีของหรือเงินอย่างน้อยหนึ่งฝั่ง
-- v0.44.5 ย้ายของไม่สำเร็จ → โต๊ะยังเปิดอยู่ (ไม่ยกเลิก) ยืนยันถูกรีเซ็ต + แจ้งสาเหตุใน note ให้แก้แล้วยืนยันใหม่
create or replace function public.trade_confirm(p_slot integer, p_id bigint, p_ver integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; side text; neg jsonb; pos jsonb; e jsonb; lk int;
begin
  select * into t from trades where id = p_id for update;
  side := public._trade_side(t, p_slot);
  if not found or side is null or t.status <> 'open' then raise exception 'no_trade'; end if;
  if t.ver <> p_ver then raise exception 'changed'; end if;
  if jsonb_array_length(t.a_items) = 0 and jsonb_array_length(t.b_items) = 0 and t.a_zeny = 0 and t.b_zeny = 0 then raise exception 'empty_trade'; end if;
  if side = 'a' then update trades set a_ok = true, note = null, updated_at = now() where id = p_id returning * into t;
  else update trades set b_ok = true, note = null, updated_at = now() where id = p_id returning * into t; end if;
  if not (t.a_ok and t.b_ok) then return public._trade_json(t, p_slot); end if;

  -- ล็อกแถวตัวละครทั้งคู่ตามลำดับ (กัน deadlock) แล้วตรวจซ้ำ
  perform 1 from characters where (user_id = t.a_user and slot = t.a_slot) or (user_id = t.b_user and slot = t.b_slot) order by user_id, slot for update;
  select count(*) into lk from accounts where user_id in (t.a_user, t.b_user) and trade_lock is not null;
  begin
    if lk > 0 then raise exception 'trade_locked'; end if;
    -- a ให้ b
    neg := coalesce((select jsonb_agg(jsonb_build_array(x->>0, -(x->>1)::bigint)) from jsonb_array_elements(t.a_items) x), '[]'::jsonb);
    pos := coalesce((select jsonb_agg(jsonb_build_array(x->>0, (x->>1)::bigint)) from jsonb_array_elements(t.b_items) x), '[]'::jsonb);
    perform public._apply(t.a_user, t.a_slot, jsonb_build_object('inv', neg || pos, 'zeny', t.b_zeny - t.a_zeny, 'note', 'แลกกับ ' || t.b_name));
    neg := coalesce((select jsonb_agg(jsonb_build_array(x->>0, -(x->>1)::bigint)) from jsonb_array_elements(t.b_items) x), '[]'::jsonb);
    pos := coalesce((select jsonb_agg(jsonb_build_array(x->>0, (x->>1)::bigint)) from jsonb_array_elements(t.a_items) x), '[]'::jsonb);
    perform public._apply(t.b_user, t.b_slot, jsonb_build_object('inv', neg || pos, 'zeny', t.a_zeny - t.b_zeny, 'note', 'แลกกับ ' || t.a_name));
    update trades set status = 'done', note = null, updated_at = now() where id = p_id returning * into t;
  exception when others then
    -- ของไม่พอ/เต็ม → ไม่ย้ายอะไรเลย (ย้อนกลับอัตโนมัติ) · โต๊ะยังเปิด ให้แก้ของแล้วยืนยันใหม่ · ระงับบัญชี = ปิดโต๊ะ
    if sqlerrm = 'trade_locked' then
      update trades set status = 'cancel', note = 'trade_locked', a_ok = false, b_ok = false, updated_at = now() where id = p_id returning * into t;
    else
      update trades set note = left(sqlerrm, 80), a_ok = false, b_ok = false, ver = ver + 1, updated_at = now() where id = p_id returning * into t;
    end if;
  end;
  return public._trade_json(t, p_slot);
end $$;

create or replace function public.trade_cancel(p_slot integer, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype;
begin
  select * into t from trades where id = p_id for update;
  if not found or public._trade_side(t, p_slot) is null then raise exception 'no_trade'; end if;
  if t.status in ('invite', 'open') then update trades set status = 'cancel', note = 'cancelled', updated_at = now() where id = p_id returning * into t; end if;
  return public._trade_json(t, p_slot);
end $$;

-- =====================================================================
-- ตลาดฝากขาย
-- =====================================================================
create table if not exists public.market_listings (
  id          bigint generated always as identity primary key,
  seller_user uuid not null references auth.users (id) on delete cascade,
  seller_slot smallint not null,
  seller_name text not null,
  item        text not null,
  qty         int  not null check (qty between 0 and 999),
  price       bigint not null check (price between 1 and 999999999),   -- ราคาต่อชิ้น
  sold        int  not null default 0,
  status      text not null default 'active' check (status in ('active', 'closed')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days'
);
create index if not exists market_active on public.market_listings (status, item, price);
create index if not exists market_seller on public.market_listings (seller_user, seller_slot, status);
alter table public.market_listings enable row level security;
revoke all on public.market_listings from anon, authenticated;

create table if not exists public.market_config (k text primary key, v numeric not null);
insert into public.market_config (k, v) values ('tax_pct', 3), ('max_listings', 10) on conflict (k) do nothing;
alter table public.market_config enable row level security;
revoke all on public.market_config from anon, authenticated;

-- ค้นหา · p_q = ข้อความ/รหัสไอเทม (ว่าง = ล่าสุด) · p_ids = รายการรหัสที่เกมแปลงจากชื่อไทยแล้ว (ไม่บังคับ)
create or replace function public.market_search(p_ids text[] default null, p_limit integer default 60, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'price_n'), '[]'::jsonb) from (
    select jsonb_build_object('id', l.id, 'item', l.item, 'qty', l.qty, 'price', l.price, 'price_n', lpad(l.price::text, 12, '0'),
                              'seller', l.seller_name, 'mine', l.seller_user = auth.uid(), 'left', extract(epoch from l.expires_at - now())::int) x
    from market_listings l
    where l.status = 'active' and l.qty > 0 and l.expires_at > now()
      and (p_ids is null or split_part(l.item, '*', 1) = any(p_ids) or l.item = any(p_ids))
    order by case when p_ids is null then 0 else l.price end, l.id desc
    limit least(greatest(coalesce(p_limit, 60), 1), 100) offset greatest(coalesce(p_offset, 0), 0)
  ) s;
$$;

-- รายการของฉัน (รวมที่หมดอายุแล้ว ยังไม่ปิด)
create or replace function public.market_mine(p_slot integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'item', l.item, 'qty', l.qty, 'price', l.price, 'sold', l.sold,
                                               'expired', l.expires_at <= now(), 'left', extract(epoch from l.expires_at - now())::int) order by l.id desc), '[]'::jsonb)
  from market_listings l where l.seller_user = auth.uid() and l.seller_slot = p_slot and l.status = 'active';
$$;

-- ลงขาย: ของออกจากกระเป๋าบนเซิร์ฟเวอร์ทันที (เกมต้องเซฟก่อนเรียก)
create or replace function public.market_list(p_slot integer, p_item text, p_qty integer, p_price bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me characters%rowtype; lk text; n int; l market_listings%rowtype;
begin
  select * into me from characters where user_id = auth.uid() and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select trade_lock into lk from accounts where user_id = auth.uid();
  if lk is not null then raise exception 'trade_locked'; end if;
  perform public._offer_items(jsonb_build_array(jsonb_build_array(p_item, p_qty)));
  if p_price is null or p_price < 1 or p_price > 999999999 then raise exception 'bad_price'; end if;
  select count(*) into n from market_listings where seller_user = me.user_id and seller_slot = me.slot and status = 'active';
  if n >= (select v from market_config where k = 'max_listings') then raise exception 'too_many_listings'; end if;
  perform public._apply(me.user_id, me.slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(p_item, -p_qty)), 'zeny', 0, 'note', 'ลงขายในตลาด'));
  insert into market_listings (seller_user, seller_slot, seller_name, item, qty, price) values (me.user_id, me.slot, me.name, p_item, p_qty, p_price) returning * into l;
  return jsonb_build_object('ok', true, 'id', l.id, 'rev', (select rev from characters where user_id = me.user_id and slot = me.slot));
end $$;

-- ซื้อ: หักเงินผู้ซื้อ · ของเข้ากระเป๋า · เงิน (หักภาษี) เข้าเซฟผู้ขายทันที
create or replace function public.market_buy(p_slot integer, p_id bigint, p_qty integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me characters%rowtype; lk text; l market_listings%rowtype; cost bigint; tax bigint;
begin
  if p_qty is null or p_qty < 1 or p_qty > 999 then raise exception 'bad_qty'; end if;
  select * into l from market_listings where id = p_id for update;
  if not found or l.status <> 'active' or l.expires_at <= now() or l.qty < p_qty then raise exception 'sold_out'; end if;
  if l.seller_user = auth.uid() then raise exception 'own_listing'; end if;
  perform 1 from characters where (user_id = auth.uid() and slot = p_slot) or (user_id = l.seller_user and slot = l.seller_slot) order by user_id, slot for update;
  select * into me from characters where user_id = auth.uid() and slot = p_slot;
  if not found then raise exception 'no_character'; end if;
  select trade_lock into lk from accounts where user_id = auth.uid();
  if lk is not null then raise exception 'trade_locked'; end if;
  cost := l.price * p_qty;
  tax := floor(cost * (select v from market_config where k = 'tax_pct') / 100);
  perform public._apply(me.user_id, me.slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(l.item, p_qty)), 'zeny', -cost, 'note', 'ซื้อจากตลาด'));
  -- ผู้ขาย: ถ้าลบตัวละครหรือชื่อไม่ตรงแล้ว เงินไม่เข้า (ของยังขายได้ตามปกติ)
  if exists (select 1 from characters where user_id = l.seller_user and slot = l.seller_slot and name = l.seller_name) then
    begin
      perform public._apply(l.seller_user, l.seller_slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', cost - tax, 'note', format('ขาย %s ×%s ในตลาด', l.item, p_qty)));
    exception when others then null;   -- เงินผู้ขายเต็มเพดาน → ไม่ให้การซื้อล้ม
    end;
  end if;
  update market_listings set qty = qty - p_qty, sold = sold + p_qty, status = case when qty - p_qty <= 0 then 'closed' else status end where id = p_id;
  return jsonb_build_object('ok', true, 'cost', cost, 'rev', (select rev from characters where user_id = me.user_id and slot = me.slot));
end $$;

-- ปิดรายการ: ของที่เหลือกลับเข้ากระเป๋า (ใช้กับรายการหมดอายุด้วย)
create or replace function public.market_cancel(p_slot integer, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l market_listings%rowtype;
begin
  select * into l from market_listings where id = p_id for update;
  if not found or l.status <> 'active' or l.seller_user <> auth.uid() or l.seller_slot <> p_slot then raise exception 'no_listing'; end if;
  perform 1 from characters where user_id = auth.uid() and slot = p_slot for update;
  if l.qty > 0 then perform public._apply(l.seller_user, l.seller_slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(l.item, l.qty)), 'zeny', 0, 'note', 'ปิดรายการตลาด')); end if;
  update market_listings set status = 'closed' where id = p_id;
  return jsonb_build_object('ok', true, 'rev', (select rev from characters where user_id = auth.uid() and slot = p_slot));
end $$;

-- =====================================================================
-- แอดมิน
-- =====================================================================
create or replace function public.gm_trade_locks()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('names', (select string_agg(c.name, ', ') from characters c where c.user_id = a.user_id),
                                                         'reason', a.trade_lock, 'at', a.lock_at, 'wealth', a.wealth) order by a.lock_at desc)
                   from accounts a where a.trade_lock is not null), '[]'::jsonb);
end $$;

create or replace function public.gm_trade_unlock(p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select user_id into u from characters where lower(btrim(name)) = lower(btrim(p_name));
  if u is null then return false; end if;
  update accounts set trade_lock = null, lock_at = null, budget = 0, budget_at = now() where user_id = u;
  return true;
end $$;

create or replace function public.gm_wealth_top(n integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('names', (select string_agg(c.name, ', ') from characters c where c.user_id = a.user_id),
                                                         'wealth', a.wealth, 'lock', a.trade_lock) order by a.wealth desc)
                   from (select * from accounts order by wealth desc limit least(greatest(coalesce(n, 30), 1), 200)) a), '[]'::jsonb);
end $$;

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------
do $$
declare f text;
begin
  foreach f in array array[
    'trade_invite(integer,text)', 'trade_current(integer)', 'trade_respond(integer,bigint,boolean)',
    'trade_offer(integer,bigint,jsonb,bigint)', 'trade_confirm(integer,bigint,integer)', 'trade_cancel(integer,bigint)',
    'market_search(text[],integer,integer)', 'market_mine(integer)', 'market_list(integer,text,integer,bigint)',
    'market_buy(integer,bigint,integer)', 'market_cancel(integer,bigint)',
    'gm_trade_locks()', 'gm_trade_unlock(text)', 'gm_wealth_top(integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['_inv_count(jsonb,text)', '_inv_add(jsonb,text,bigint)', '_zeny(jsonb)', '_wealth(jsonb,jsonb)', '_rate(integer)',
    '_lock(uuid,text)', '_apply(uuid,integer,jsonb)', '_offer_items(jsonb)', '_trade_side(trades,integer)', '_trade_json(trades,integer)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- =====================================================================
-- ราคาไอเทมจากเกม v0.42.0 (275 ชิ้น) · อัปเดตเกมที่เพิ่มไอเทมใหม่ = รันส่วนนี้ซ้ำ
-- =====================================================================
insert into public.item_catalog (id, price, kind) values
('red_potion',50,'usable'),
('orange_potion',200,'usable'),
('blue_potion',400,'usable'),
('herb',20,'usable'),
('glowcap',60,'usable'),
('honey',160,'usable'),
('thorn_quill',44,'etc'),
('wisp_dust',70,'etc'),
('wolf_fang',96,'etc'),
('ancient_bark',900,'etc'),
('jelly_drop',12,'etc'),
('cap_spore',28,'etc'),
('stinger',60,'etc'),
('knife',50,'equip'),
('cutter',600,'equip'),
('iron_blade',2400,'equip'),
('trainee_blade',300,'equip'),
('oak_staff',500,'equip'),
('hunter_bow',600,'equip'),
('chapel_mace',550,'equip'),
('fang_dagger',1400,'equip'),
('rootcleaver',9000,'equip'),
('heartwood_staff',9000,'equip'),
('sylvan_bow',9000,'equip'),
('bark_mail',1200,'equip'),
('thorn_guard',1000,'equip'),
('wisp_lantern',2400,'equip'),
('gnarl_crown',9000,'equip'),
('cotton_shirt',40,'equip'),
('leather_vest',500,'equip'),
('bandana',150,'equip'),
('flower_pin',600,'equip'),
('wooden_shield',400,'equip'),
('traveler_cape',1000,'equip'),
('sandals',160,'equip'),
('jelly_ring',1600,'equip'),
('bee_brooch',2400,'equip'),
('clover_charm',6000,'equip'),
('white_potion',1200,'usable'),
('royal_jelly',5000,'usable'),
('mana_potion',2600,'usable'),
('frost_fur',180,'etc'),
('bat_wing',240,'etc'),
('yeti_fur',420,'etc'),
('ice_core',900,'etc'),
('glacia_scale',6000,'etc'),
('magma_gel',520,'etc'),
('imp_horn',680,'etc'),
('salamander_scale',900,'etc'),
('obsidian_shard',1400,'etc'),
('dragon_flame',30000,'etc'),
('frost_saber',16000,'equip'),
('icicle_staff',16000,'equip'),
('glacier_bow',16000,'equip'),
('frost_mace',16000,'equip'),
('frost_dagger',12000,'equip'),
('yeti_coat',14000,'equip'),
('frost_boots',9000,'equip'),
('glacia_crown',60000,'equip'),
('glacia_mantle',50000,'equip'),
('flame_blade',60000,'equip'),
('inferno_staff',60000,'equip'),
('phoenix_bow',60000,'equip'),
('magma_hammer',60000,'equip'),
('cinder_dagger',42000,'equip'),
('obsidian_plate',70000,'equip'),
('ember_cloak',40000,'equip'),
('ember_shield',40000,'equip'),
('dragon_heart',200000,'equip'),
('relic_sword',70000,'equip'),
('relic_staff',70000,'equip'),
('relic_bow',70000,'equip'),
('relic_mace',70000,'equip'),
('relic_knife',70000,'equip'),
('runic_sword',84700,'equip'),
('runic_staff',84700,'equip'),
('runic_bow',84700,'equip'),
('runic_mace',84700,'equip'),
('runic_knife',84700,'equip'),
('astral_sword',104568,'equip'),
('astral_staff',104568,'equip'),
('astral_bow',104568,'equip'),
('astral_mace',104568,'equip'),
('astral_knife',104568,'equip'),
('guardian_sword',130744,'equip'),
('guardian_staff',130744,'equip'),
('guardian_bow',130744,'equip'),
('guardian_mace',130744,'equip'),
('guardian_knife',130744,'equip'),
('spectral_sword',174257,'equip'),
('spectral_staff',174257,'equip'),
('spectral_bow',174257,'equip'),
('spectral_mace',174257,'equip'),
('spectral_knife',174257,'equip'),
('moonveil_sword',226800,'equip'),
('moonveil_staff',226800,'equip'),
('moonveil_bow',226800,'equip'),
('moonveil_mace',226800,'equip'),
('moonveil_knife',226800,'equip'),
('bloodmoon_sword',292583,'equip'),
('bloodmoon_staff',292583,'equip'),
('bloodmoon_bow',292583,'equip'),
('bloodmoon_mace',292583,'equip'),
('bloodmoon_knife',292583,'equip'),
('astral_body',88000,'equip'),
('astral_shield',88000,'equip'),
('astral_head',88000,'equip'),
('astral_garment',88000,'equip'),
('astral_shoes',88000,'equip'),
('astral_accessory',88000,'equip'),
('spectral_body',113600,'equip'),
('spectral_shield',113600,'equip'),
('spectral_head',113600,'equip'),
('spectral_garment',113600,'equip'),
('spectral_shoes',113600,'equip'),
('spectral_accessory',113600,'equip'),
('bloodmoon_body',147200,'equip'),
('bloodmoon_shield',147200,'equip'),
('bloodmoon_head',147200,'equip'),
('bloodmoon_garment',147200,'equip'),
('bloodmoon_shoes',147200,'equip'),
('bloodmoon_accessory',147200,'equip'),
('ruin_fragment',1600,'etc'),
('spirit_thread',2200,'etc'),
('guardian_core',36000,'etc'),
('dread_crown',60000,'etc'),
('wpn_sword_001',74,'equip'),
('wpn_sword_002',6205,'equip'),
('wpn_sword_003',45456,'equip'),
('wpn_sword_004',179320,'equip'),
('wpn_gsword_001',1099,'equip'),
('wpn_gsword_002',23034,'equip'),
('wpn_gsword_003',84881,'equip'),
('wpn_gsword_004',316025,'equip'),
('wpn_spear_001',410,'equip'),
('wpn_spear_002',9229,'equip'),
('wpn_spear_003',60666,'equip'),
('wpn_spear_004',202420,'equip'),
('wpn_rod_001',74,'equip'),
('wpn_rod_002',3225,'equip'),
('wpn_rod_003',30321,'equip'),
('wpn_rod_004',170472,'equip'),
('wpn_staff_001',564,'equip'),
('wpn_staff_002',15238,'equip'),
('wpn_staff_003',90828,'equip'),
('wpn_staff_004',316025,'equip'),
('wpn_orb_001',1679,'equip'),
('wpn_orb_002',14899,'equip'),
('wpn_orb_003',67856,'equip'),
('wpn_orb_004',216952,'equip'),
('wpn_mace_001',74,'equip'),
('wpn_mace_002',7641,'equip'),
('wpn_mace_003',56096,'equip'),
('wpn_mace_004',188392,'equip'),
('wpn_scepter_001',284,'equip'),
('wpn_scepter_002',17091,'equip'),
('wpn_scepter_003',79135,'equip'),
('wpn_scepter_004',316025,'equip'),
('wpn_book_001',1099,'equip'),
('wpn_book_002',10967,'equip'),
('wpn_book_003',51706,'equip'),
('wpn_book_004',226920,'equip'),
('wpn_sbow_001',74,'equip'),
('wpn_sbow_002',2387,'equip'),
('wpn_sbow_003',43462,'equip'),
('wpn_sbow_004',179320,'equip'),
('wpn_lbow_001',1460,'equip'),
('wpn_lbow_002',21929,'equip'),
('wpn_lbow_003',90828,'equip'),
('wpn_lbow_004',316025,'equip'),
('wpn_xbow_001',564,'equip'),
('wpn_xbow_002',20256,'equip'),
('wpn_xbow_003',103327,'equip'),
('wpn_xbow_004',207208,'equip'),
('wpn_knight_lance',45456,'equip'),
('wpn_knight_greatsword',141858,'equip'),
('wpn_wizard_rod',45456,'equip'),
('wpn_wizard_staff',141858,'equip'),
('wpn_hunter_bow',45456,'equip'),
('wpn_hunter_xbow',141858,'equip'),
('wpn_priest_scepter',45456,'equip'),
('wpn_priest_book',141858,'equip'),
('qv_a',69,'equip'),
('qv_b',1559,'equip'),
('qv_c',9607,'equip'),
('qv_d',29256,'equip'),
('qv_e',62381,'equip'),
('qv_f',115320,'equip'),
('qv_g',203213,'equip'),
('tm_a',69,'equip'),
('tm_b',1559,'equip'),
('tm_c',9607,'equip'),
('tm_d',29256,'equip'),
('tm_e',62381,'equip'),
('tm_f',115320,'equip'),
('tm_g',203213,'equip'),
('ob_a',69,'equip'),
('ob_b',1559,'equip'),
('ob_c',9607,'equip'),
('ob_d',29256,'equip'),
('ob_e',62381,'equip'),
('ob_f',115320,'equip'),
('ob_g',203213,'equip'),
('box_wood',1000,'box'),
('box_silver',6000,'box'),
('box_gold',40000,'box'),
('card_bloblet',5000,'card'),
('card_capling',5000,'card'),
('card_stinglet',5000,'card'),
('card_thornback',5000,'card'),
('card_wisp',5000,'card'),
('card_barkwolf',25000,'card'),
('card_gnarlroot',120000,'card'),
('card_frostfox',5000,'card'),
('card_frostbat',5000,'card'),
('card_yeti',5000,'card'),
('card_icegolem',25000,'card'),
('card_glacia',120000,'card'),
('card_magmaslime',5000,'card'),
('card_emberimp',5000,'card'),
('card_salamander',5000,'card'),
('card_obsidiangolem',25000,'card'),
('card_ignarok',120000,'card'),
('card_ruin_scarab',5000,'card'),
('card_sand_basilisk',5000,'card'),
('card_rune_sentinel',5000,'card'),
('card_astral_wisp',5000,'card'),
('card_relic_knight',25000,'card'),
('card_aurex',120000,'card'),
('card_haunt_spider',5000,'card'),
('card_hollow_wolf',5000,'card'),
('card_mourning_shade',5000,'card'),
('card_cursed_stag',5000,'card'),
('card_eclipse_reaper',25000,'card'),
('card_bloodmoon_knight',25000,'card'),
('card_nocthar',120000,'card'),
('refine_w',600,'etc'),
('refine_a',900,'etc'),
('refine_guard',30000,'etc'),
('warp_leaf',60,'usable'),
('return_scroll',300,'usable'),
('waypoint_scroll',1500,'usable'),
('friend_scroll',2000,'usable'),
('exp_15',2000,'usable'),
('exp_2',6000,'usable'),
('exp_3',30000,'usable'),
('job_2',5000,'usable'),
('drop_15',3000,'usable'),
('drop_2',8000,'usable'),
('card_clover',20000,'usable'),
('power_elixir',800,'usable'),
('iron_elixir',800,'usable'),
('swift_potion',400,'usable'),
('haste_potion',1000,'usable'),
('hawk_eye',900,'usable'),
('sage_tea',900,'usable'),
('festival_cake',3000,'usable'),
('phoenix_feather',5000,'usable'),
('elixir',8000,'usable'),
('regen_candy',250,'usable'),
('frost_tonic',800,'usable'),
('flame_tonic',800,'usable'),
('bag_expand',10000,'usable'),
('storage_expand',10000,'usable'),
('stat_reset',20000,'usable'),
('skill_reset',20000,'usable'),
('name_change',100000,'usable'),
('megaphone',5000,'usable'),
('pet_snack',150,'usable'),
('dead_branch',1000,'usable'),
('blood_branch',50000,'usable'),
('adventurer_box',1000,'usable'),
('egg_spot',2000,'usable'),
('egg_moon',12000,'usable'),
('egg_galaxy',60000,'usable')
on conflict (id) do update set price = excluded.price, kind = excluded.kind;
