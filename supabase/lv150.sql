-- v0.46 ขยายเพดานเลเวลเป็น 150 (รันครั้งเดียว · รันซ้ำได้)
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run
-- ต้องรันก่อนผู้เล่นคนแรกขึ้น Lv.100 ไม่งั้นเซฟเลเวลบนเซิร์ฟเวอร์ค้างที่ 99

alter table public.characters drop constraint if exists characters_lv_check;
alter table public.characters add constraint characters_lv_check check (lv between 1 and 150);

-- โควตาการได้ของตามเลเวล (ใช้ตรวจเซฟ) ขยายถึง Lv.150
create or replace function public._rate(lv int)
returns numeric language sql immutable as $$ select 30 + power(greatest(1, least(150, lv)), 2) * 0.6 $$;

-- เซฟผ่านฟังก์ชันตรวจ: รับเลเวลถึง 150
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
  lv_new := greatest(1, least(150, coalesce(case when (p_data->'player'->>'baseLevel') ~ '^[0-9]{1,3}$' then (p_data->'player'->>'baseLevel')::int end, 1)));
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

-- ไอเทมใหม่ Lv.100–150 (วัตถุดิบ · ชุดห้วงสมุทร/เทพสวรรค์ · การ์ด 18 ใบ) — ต้องมีในรายการ ไม่งั้นระบบตรวจเซฟจะนับเป็นของแปลกปลอม
insert into public.item_catalog (id, price, kind) values
('tide_pearl',2400,'etc'),
('coral_shard',3200,'etc'),
('leviathan_scale',80000,'etc'),
('prism_shard',3000,'etc'),
('geode_core',4000,'etc'),
('crystal_heart',100000,'etc'),
('sky_feather',3600,'etc'),
('storm_core',5000,'etc'),
('seraph_halo',140000,'etc'),
('abyssal_sword',420000,'equip'),
('abyssal_staff',420000,'equip'),
('abyssal_bow',420000,'equip'),
('abyssal_mace',420000,'equip'),
('abyssal_knife',420000,'equip'),
('abyssal_body',210000,'equip'),
('abyssal_shield',210000,'equip'),
('abyssal_head',210000,'equip'),
('abyssal_garment',210000,'equip'),
('abyssal_shoes',210000,'equip'),
('abyssal_accessory',210000,'equip'),
('divine_sword',700000,'equip'),
('divine_staff',700000,'equip'),
('divine_bow',700000,'equip'),
('divine_mace',700000,'equip'),
('divine_knife',700000,'equip'),
('divine_body',350000,'equip'),
('divine_shield',350000,'equip'),
('divine_head',350000,'equip'),
('divine_garment',350000,'equip'),
('divine_shoes',350000,'equip'),
('divine_accessory',350000,'equip'),
('card_reef_crab',5000,'card'),
('card_shell_turtle',5000,'card'),
('card_abyss_jelly',5000,'card'),
('card_drowned_knight',5000,'card'),
('card_siren_eel',25000,'card'),
('card_tidalos',120000,'card'),
('card_shard_beetle',5000,'card'),
('card_prism_golem',5000,'card'),
('card_geode_wolf',5000,'card'),
('card_crystal_drake',5000,'card'),
('card_prism_wisp',25000,'card'),
('card_crysthar',120000,'card'),
('card_cloud_sentinel',5000,'card'),
('card_storm_griffin',5000,'card'),
('card_seraph_knight',5000,'card'),
('card_tempest_shade',5000,'card'),
('card_celestial_titan',25000,'card'),
('card_aurelion',120000,'card')
on conflict (id) do update set price = excluded.price, kind = excluded.kind;
