-- =====================================================================
-- Everlevel v0.43 — ร้านเพชร + ระบบเติมเพชร (โอน + แอดมินอนุมัติ)
-- รันหลัง setup.sql และ trade.sql (รันซ้ำได้ ไม่เสียข้อมูล · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → กด Run
--
-- หลักการ
--   * เพชรเก็บที่บัญชี (accounts.gems) ใช้ร่วมทุกตัวละคร · ผู้เล่นแก้เองไม่ได้ (เปลี่ยนได้ผ่านฟังก์ชันด้านล่างเท่านั้น)
--   * เติมเพชร: ผู้เล่นโอนตามแพ็ก → อัปโหลดสลิป (Storage bucket "slips" แบบส่วนตัว) → ส่งคำขอ
--     → แอดมินตรวจยอดเงินเข้าในแอปธนาคารจริง แล้วกดอนุมัติในเกม → เพชรเข้าบัญชี
--   * ซื้อของ: ตัดเพชรและใส่ของในเซฟบนเซิร์ฟเวอร์ในคราวเดียว (char_ledger → เกมดึงไปปรับกระเป๋า)
--   * ราคาสินค้าและแพ็กอยู่ในตาราง cash_products / cash_packs แก้ใน Table Editor ได้ทันที ไม่ต้องอัปเดตเกม
-- =====================================================================

alter table public.accounts add column if not exists gems bigint not null default 0 check (gems >= 0);

-- ---------- แพ็กเติมเพชร (บาท → เพชร) ----------
create table if not exists public.cash_packs (
  thb    int primary key check (thb between 1 and 100000),
  gems   int not null check (gems > 0),
  active boolean not null default true
);
insert into public.cash_packs (thb, gems) values (50, 50), (100, 100), (300, 315), (500, 550), (1000, 1150), (2000, 2400)
on conflict (thb) do nothing;

-- ---------- สินค้าในร้านเพชร ----------
create table if not exists public.cash_products (
  id     text primary key,
  kind   text not null check (kind in ('item', 'fashion')),   -- item = ไอเทมเข้ากระเป๋า · fashion = ชิ้นแฟชั่นเข้าตู้
  ref    text not null,                                        -- รหัสไอเทม / รหัสชิ้นแฟชั่นในเกม
  qty    int  not null default 1 check (qty between 1 and 999),
  price  int  not null check (price between 1 and 1000000),    -- ราคาเป็นเพชร
  cat    text not null default 'misc',                         -- fashion · box · convenience · boost
  tag    text,                                                 -- ป้าย เช่น ใหม่ / ขายดี / คุ้ม
  sort   int  not null default 100,
  active boolean not null default true
);
insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort) values
  ('f_dragon',        'fashion', 'o_px_dragon',      1, 299, 'fashion', 'ใหม่', 1),
  ('f_wx_ascend',     'fashion', 'a_wx_ascend',      1, 499, 'fashion', null, 10),
  ('f_wx_heaven',     'fashion', 'a_wx_heaven',      1, 499, 'fashion', null, 11),
  ('f_wx_bloodscythe','fashion', 'a_wx_bloodscythe', 1, 299, 'fashion', null, 12),
  ('f_wx_myriad',     'fashion', 'a_wx_myriad',      1, 299, 'fashion', null, 13),
  ('f_wx_soulscythe', 'fashion', 'a_wx_soulscythe',  1, 199, 'fashion', null, 14),
  ('f_wx_sunfire',    'fashion', 'a_wx_sunfire',     1, 199, 'fashion', null, 15),
  ('f_wx_storm',      'fashion', 'a_wx_storm',       1, 129, 'fashion', null, 16),
  ('f_wx_qi',         'fashion', 'a_wx_qi',          1, 129, 'fashion', null, 17),
  ('f_wx_jade',       'fashion', 'a_wx_jade',        1,  79, 'fashion', null, 18),
  ('f_wx_iron',       'fashion', 'a_wx_iron',        1,  49, 'fashion', null, 19),
  ('b_gold',          'item', 'box_gold',            1,  49, 'box', 'ขายดี', 1),
  ('b_gold11',        'item', 'box_gold',           11, 490, 'box', 'แถม 1', 2),
  ('b_silver',        'item', 'box_silver',          1,  15, 'box', null, 3),
  ('b_silver11',      'item', 'box_silver',         11, 150, 'box', 'แถม 1', 4),
  ('e_galaxy',        'item', 'egg_galaxy',          1,  99, 'box', null, 10),
  ('e_moon',          'item', 'egg_moon',            1,  59, 'box', null, 11),
  ('e_spot',          'item', 'egg_spot',            1,  29, 'box', null, 12),
  ('c_bag',           'item', 'bag_expand',          1,  59, 'convenience', null, 1),
  ('c_storage',       'item', 'storage_expand',      1,  59, 'convenience', null, 2),
  ('c_name',          'item', 'name_change',         1,  99, 'convenience', null, 3),
  ('c_stat',          'item', 'stat_reset',          1,  49, 'convenience', null, 4),
  ('c_skill',         'item', 'skill_reset',         1,  49, 'convenience', null, 5),
  ('c_mega10',        'item', 'megaphone',          10,  39, 'convenience', null, 6),
  ('x_exp15',         'item', 'exp_15',              1,  15, 'boost', null, 1),
  ('x_exp2',          'item', 'exp_2',               1,  29, 'boost', 'ขายดี', 2),
  ('x_exp3',          'item', 'exp_3',               1,  59, 'boost', null, 3),
  ('x_job2',          'item', 'job_2',               1,  29, 'boost', null, 4),
  ('x_drop15',        'item', 'drop_15',             1,  15, 'boost', null, 5),
  ('x_drop2',         'item', 'drop_2',              1,  29, 'boost', null, 6),
  ('x_clover',        'item', 'card_clover',         1,  49, 'boost', null, 7)
on conflict (id) do nothing;

-- ---------- คำขอเติมเพชร ----------
create table if not exists public.topup_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  char_name  text not null,
  thb        int  not null,
  gems       int  not null,
  slip_path  text not null check (char_length(slip_path) between 5 and 200),
  note       text check (note is null or char_length(note) <= 120),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reply      text check (reply is null or char_length(reply) <= 120),
  seen       boolean not null default false,   -- ผู้เล่นเห็นผลแล้วหรือยัง
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);
create index if not exists topup_status on public.topup_requests (status, created_at);
create index if not exists topup_user on public.topup_requests (user_id, created_at desc);

-- ---------- ประวัติการซื้อ ----------
create table if not exists public.cash_purchases (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot       smallint not null,
  product    text not null,
  price      int  not null,
  created_at timestamptz not null default now()
);
create index if not exists cash_purchases_user on public.cash_purchases (user_id, created_at desc);

alter table public.cash_packs     enable row level security;
alter table public.cash_products  enable row level security;
alter table public.topup_requests enable row level security;
alter table public.cash_purchases enable row level security;
revoke all on public.cash_packs, public.cash_products, public.topup_requests, public.cash_purchases from anon, authenticated;

-- ---------- ที่เก็บสลิป (ส่วนตัว · เจ้าของอัปโหลดในโฟลเดอร์ของตัวเอง · แอดมินดูได้) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slips', 'slips', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
drop policy if exists "slips_insert_own" on storage.objects;
drop policy if exists "slips_select_own_or_admin" on storage.objects;
create policy "slips_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "slips_select_own_or_admin" on storage.objects for select to authenticated
  using (bucket_id = 'slips' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- =====================================================================
-- ฟังก์ชันผู้เล่น
-- =====================================================================
-- เพชร + แพ็ก + สินค้า + คำขอเติมล่าสุด (ผลที่เพิ่งอนุมัติ/ปฏิเสธถูกทำเครื่องหมายว่าเห็นแล้ว)
create or replace function public.cash_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); out jsonb;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  insert into accounts (user_id) values (uid) on conflict (user_id) do nothing;
  out := jsonb_build_object(
    'gems', (select gems from accounts where user_id = uid),
    'admin', public.is_admin(),
    'packs', coalesce((select jsonb_agg(jsonb_build_object('thb', thb, 'gems', gems) order by thb) from cash_packs where active), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'ref', ref, 'qty', qty, 'price', price, 'cat', cat, 'tag', tag) order by cat, sort, id)
                          from cash_products where active), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'thb', r.thb, 'gems', r.gems, 'status', r.status, 'reply', r.reply, 'new', not r.seen and r.status <> 'pending', 'at', r.created_at) order by r.id desc)
                          from (select * from topup_requests where user_id = uid order by id desc limit 10) r), '[]'::jsonb));
  update topup_requests set seen = true where user_id = uid and status <> 'pending' and not seen;
  return out;
end $$;

-- ส่งคำขอเติม (หลังอัปโหลดสลิปแล้ว) · ค้างได้สูงสุด 3 คำขอ
create or replace function public.topup_request(p_slot integer, p_thb integer, p_slip text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pk cash_packs%rowtype; nm text; n int; r topup_requests%rowtype;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into pk from cash_packs where thb = p_thb and active;
  if not found then raise exception 'bad_pack'; end if;
  if p_slip is null or split_part(p_slip, '/', 1) <> uid::text or p_slip !~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{3,80}$' then raise exception 'bad_slip'; end if;
  select name into nm from characters where user_id = uid and slot = p_slot;
  if nm is null then raise exception 'no_character'; end if;
  select count(*) into n from topup_requests where user_id = uid and status = 'pending';
  if n >= 3 then raise exception 'too_many_pending'; end if;
  insert into topup_requests (user_id, char_name, thb, gems, slip_path, note) values (uid, nm, pk.thb, pk.gems, p_slip, left(nullif(btrim(coalesce(p_note, '')), ''), 120)) returning * into r;
  return jsonb_build_object('ok', true, 'id', r.id, 'gems', r.gems);
end $$;

-- ซื้อของด้วยเพชร
create or replace function public.cash_buy(p_slot integer, p_product text, p_count integer default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pr cash_products%rowtype; cost bigint; g bigint; d jsonb; owned jsonb; r bigint;
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
  if pr.kind = 'item' then
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
  return jsonb_build_object('ok', true, 'gems', g - cost);
end $$;

-- =====================================================================
-- ฟังก์ชันแอดมิน
-- =====================================================================
create or replace function public.gm_topups(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.char_name, 'thb', r.thb, 'gems', r.gems, 'slip', r.slip_path, 'note', r.note,
                                                         'status', r.status, 'reply', r.reply, 'at', r.created_at, 'decided', r.decided_at) order by r.id desc)
                   from (select * from topup_requests where status = coalesce(p_status, 'pending') order by id desc limit 100) r), '[]'::jsonb);
end $$;

-- อนุมัติ/ปฏิเสธ (อนุมัติแล้วเพชรเข้าบัญชีทันที · ตัดสินซ้ำไม่ได้)
create or replace function public.gm_topup_decide(p_id bigint, p_approve boolean, p_reply text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r topup_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into r from topup_requests where id = p_id for update;
  if not found or r.status <> 'pending' then raise exception 'already_decided'; end if;
  update topup_requests set status = case when p_approve then 'approved' else 'rejected' end, reply = left(nullif(btrim(coalesce(p_reply, '')), ''), 120),
         decided_at = now(), decided_by = auth.uid(), seen = false where id = p_id;
  if p_approve then
    insert into accounts (user_id) values (r.user_id) on conflict (user_id) do nothing;
    update accounts set gems = gems + r.gems where user_id = r.user_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ปรับเพชรด้วยมือ (ชดเชย/แจกกิจกรรม/แก้ผิด) · p_delta ติดลบ = หัก
create or replace function public.gm_gems_adjust(p_name text, p_delta integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid; g bigint;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select user_id into u from characters where lower(btrim(name)) = lower(btrim(p_name));
  if u is null then raise exception 'no_target'; end if;
  insert into accounts (user_id) values (u) on conflict (user_id) do nothing;
  update accounts set gems = greatest(0, gems + p_delta) where user_id = u returning gems into g;
  return jsonb_build_object('ok', true, 'gems', g);
end $$;

-- ---------- สิทธิ์เรียกฟังก์ชัน ----------
do $$
declare f text;
begin
  foreach f in array array['cash_state()', 'topup_request(integer,integer,text,text)', 'cash_buy(integer,text,integer)',
                           'gm_topups(text)', 'gm_topup_decide(bigint,boolean,text)', 'gm_gems_adjust(text,integer)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
