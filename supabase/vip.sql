-- =====================================================================
-- v0.45 ระบบ VIP (บัตร 7 วัน 100 เพชร · 30 วัน 150 เพชร)
-- ต้องรัน trade.sql และ cashshop.sql ไปแล้ว · รันไฟล์นี้ครั้งเดียว (รันซ้ำได้ ไม่เสียข้อมูล)
-- ถ้าวันหลังรัน trade.sql หรือ cashshop.sql ใหม่ ให้รันไฟล์นี้ตามอีกครั้ง
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run
--
-- สิทธิ์ที่เซิร์ฟเวอร์ตรวจ: ลงขายในตลาด (ทั่วไป 2 รายการ ค่าธรรมเนียม 7% · VIP 5 รายการ 3%)
--                       รางวัลรายวัน VIP (10 เพชร + ของ) · วันหมดอายุ VIP
-- สิทธิ์ฝั่งเกม (แสดงผล/ความสะดวก): ซื้อยาอัตโนมัติระหว่างบอท · วาร์ป/คลัง/ร้านทุกที่ · EXP/ดรอป +20% · ป้าย VIP · เช็กอินคูณ 2
-- =====================================================================

alter table public.accounts add column if not exists vip_until timestamptz;
alter table public.accounts add column if not exists vip_daily date;          -- วันที่ (เวลาไทย) ที่รับรางวัลรายวัน VIP ล่าสุด

-- สินค้า VIP ในร้านเพชร
alter table public.cash_products drop constraint if exists cash_products_kind_check;
alter table public.cash_products add constraint cash_products_kind_check check (kind in ('item', 'fashion', 'vip'));
insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('v_vip7',  'vip', 'vip',  7, 100, 'vip', 'ทดลอง', 1),
  ('v_vip30', 'vip', 'vip', 30, 150, 'vip', 'คุ้มสุด', 2)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price, cat = excluded.cat, tag = excluded.tag, active = true;

-- ตลาด: ค่าธรรมเนียมจำไว้ที่รายการตอนลงขาย (VIP หมดอายุทีหลัง รายการเดิมยังได้ 3%)
alter table public.market_listings add column if not exists tax_pct numeric;
insert into public.market_config (k, v) values ('tax_pct', 7), ('max_listings', 2), ('vip_tax_pct', 3), ('vip_max_listings', 5)
on conflict (k) do update set v = excluded.v;

-- ---------- ตัวช่วย ----------
create or replace function public._vip(p_user uuid)
returns boolean language sql stable set search_path = public as $$
  select coalesce((select vip_until > now() from accounts where user_id = p_user), false);
$$;
create or replace function public._bkk_today()
returns date language sql stable as $$ select (now() at time zone 'Asia/Bangkok')::date; $$;

-- ---------- สถานะร้านเพชร (+ VIP + เงื่อนไขตลาดของฉัน) ----------
create or replace function public.cash_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); out jsonb; vip boolean;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into accounts (user_id) values (uid) on conflict (user_id) do nothing;
  vip := public._vip(uid);
  out := jsonb_build_object(
    'gems', (select gems from accounts where user_id = uid),
    'admin', public.is_admin(),
    'now', extract(epoch from now()) * 1000,
    'vip_until', (select extract(epoch from vip_until) * 1000 from accounts where user_id = uid),
    'vip_claimed', coalesce((select vip_daily = public._bkk_today() from accounts where user_id = uid), false),
    'market', jsonb_build_object(
      'max', (select v from market_config where k = case when vip then 'vip_max_listings' else 'max_listings' end),
      'tax', (select v from market_config where k = case when vip then 'vip_tax_pct' else 'tax_pct' end)),
    'packs', coalesce((select jsonb_agg(jsonb_build_object('thb', thb, 'gems', gems) order by thb) from cash_packs where active), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'ref', ref, 'qty', qty, 'price', price, 'cat', cat, 'tag', tag) order by cat, sort, id)
                          from cash_products where active), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'thb', r.thb, 'gems', r.gems, 'status', r.status, 'reply', r.reply, 'new', not r.seen and r.status <> 'pending', 'at', r.created_at) order by r.id desc)
                          from (select * from topup_requests where user_id = uid order by id desc limit 10) r), '[]'::jsonb));
  update topup_requests set seen = true where user_id = uid and status <> 'pending' and not seen;
  return out;
end $$;

-- ---------- ซื้อของในร้านเพชร (+ บัตร VIP: ต่ออายุสะสม) ----------
create or replace function public.cash_buy(p_slot integer, p_product text, p_count integer default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pr cash_products%rowtype; cost bigint; g bigint; d jsonb; owned jsonb; r bigint; vu timestamptz;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_count is null or p_count < 1 or p_count > 10 then raise exception 'bad_qty'; end if;
  select * into pr from cash_products where id = p_product and active;
  if not found then raise exception 'no_product'; end if;
  if pr.kind = 'fashion' and p_count <> 1 then raise exception 'bad_qty'; end if;
  perform 1 from characters where user_id = uid and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select gems into g from accounts where user_id = uid for update;
  cost := pr.price::bigint * p_count;
  if coalesce(g, 0) < cost then raise exception 'not_enough_gems'; end if;
  if pr.kind = 'vip' then
    update accounts set vip_until = greatest(coalesce(vip_until, now()), now()) + make_interval(days => pr.qty * p_count)
     where user_id = uid returning vip_until into vu;
  elsif pr.kind = 'item' then
    perform public._apply(uid, p_slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(pr.ref, pr.qty * p_count)), 'zeny', 0, 'note', 'ซื้อจากร้านเพชร'));
  else
    select data into d from characters where user_id = uid and slot = p_slot;
    if d is null or jsonb_typeof(d->'player') is distinct from 'object' then raise exception 'no_save'; end if;
    owned := case when jsonb_typeof(d->'player'->'fashion'->'owned') = 'array' then d->'player'->'fashion'->'owned' else '[]'::jsonb end;
    if owned ? pr.ref then raise exception 'already_owned'; end if;
    d := jsonb_set(d, '{player,fashion}', coalesce(d->'player'->'fashion', '{}'::jsonb) || jsonb_build_object('owned', owned || to_jsonb(pr.ref)));
    update characters set data = d, rev = rev + 1, updated_at = now() where user_id = uid and slot = p_slot returning rev into r;
    insert into char_ledger (user_id, slot, rev, delta) values (uid, p_slot, r, jsonb_build_object('fashion', jsonb_build_array(pr.ref), 'note', 'ซื้อจากร้านเพชร'));
  end if;
  update accounts set gems = gems - cost where user_id = uid;
  insert into cash_purchases (user_id, slot, product, price) values (uid, p_slot, pr.id, cost);
  return jsonb_build_object('ok', true, 'gems', g - cost, 'vip_until', extract(epoch from vu) * 1000);
end $$;

-- ---------- รางวัลรายวัน VIP: 10 เพชร + กล่องไม้ 1 · ใบวาร์ป 3 · ลูกอมฟื้นฟู 2 (วันละครั้ง ตามเวลาไทย) ----------
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
  perform public._apply(uid, p_slot, jsonb_build_object('inv', '[["box_wood",1],["warp_leaf",3],["regen_candy",2]]'::jsonb, 'zeny', 0, 'note', 'รางวัลรายวัน VIP'));
  update accounts set gems = gems + 10, vip_daily = public._bkk_today() where user_id = uid;
  return jsonb_build_object('ok', true, 'gems', ac.gems + 10);
end $$;

-- ---------- ตลาด: ลงขาย (จำนวนรายการ + ค่าธรรมเนียมตาม VIP) ----------
create or replace function public.market_list(p_slot integer, p_item text, p_qty integer, p_price bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me characters%rowtype; lk text; n int; l market_listings%rowtype; vip boolean;
begin
  select * into me from characters where user_id = auth.uid() and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select trade_lock into lk from accounts where user_id = auth.uid();
  if lk is not null then raise exception 'trade_locked'; end if;
  perform public._offer_items(jsonb_build_array(jsonb_build_array(p_item, p_qty)));
  if p_price is null or p_price < 1 or p_price > 999999999 then raise exception 'bad_price'; end if;
  vip := public._vip(me.user_id);
  select count(*) into n from market_listings where seller_user = me.user_id and seller_slot = me.slot and status = 'active';
  if n >= (select v from market_config where k = case when vip then 'vip_max_listings' else 'max_listings' end) then
    raise exception 'too_many_listings:%', (select v from market_config where k = case when vip then 'vip_max_listings' else 'max_listings' end)::int;
  end if;
  perform public._apply(me.user_id, me.slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(p_item, -p_qty)), 'zeny', 0, 'note', 'ลงขายในตลาด'));
  insert into market_listings (seller_user, seller_slot, seller_name, item, qty, price, tax_pct)
  values (me.user_id, me.slot, me.name, p_item, p_qty, p_price, (select v from market_config where k = case when vip then 'vip_tax_pct' else 'tax_pct' end))
  returning * into l;
  return jsonb_build_object('ok', true, 'id', l.id, 'rev', (select rev from characters where user_id = me.user_id and slot = me.slot));
end $$;

-- ---------- ตลาด: ซื้อ (ค่าธรรมเนียมตามที่จำไว้ในรายการ) ----------
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
  tax := floor(cost * coalesce(l.tax_pct, (select v from market_config where k = 'tax_pct')) / 100);
  perform public._apply(me.user_id, me.slot, jsonb_build_object('inv', jsonb_build_array(jsonb_build_array(l.item, p_qty)), 'zeny', -cost, 'note', 'ซื้อจากตลาด'));
  if exists (select 1 from characters where user_id = l.seller_user and slot = l.seller_slot and name = l.seller_name) then
    begin
      perform public._apply(l.seller_user, l.seller_slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', cost - tax, 'note', format('ขาย %s ×%s ในตลาด', l.item, p_qty)));
    exception when others then null;
    end;
  end if;
  update market_listings set qty = qty - p_qty, sold = sold + p_qty, status = case when qty - p_qty <= 0 then 'closed' else status end where id = p_id;
  return jsonb_build_object('ok', true, 'cost', cost, 'rev', (select rev from characters where user_id = me.user_id and slot = me.slot));
end $$;

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------
revoke all on function public._vip(uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['cash_state()', 'cash_buy(integer,text,integer)', 'vip_daily(integer)',
                           'market_list(integer,text,integer,bigint)', 'market_buy(integer,bigint,integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
