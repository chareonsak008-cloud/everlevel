-- =====================================================================
-- Everlevel v0.37: ระบบกิลด์ — รันหลัง setup.sql (รันซ้ำได้ ไม่เสียข้อมูล · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → กด Run
--
-- ตาราง (ผู้เล่นแตะตรงไม่ได้ ทุกอย่างผ่านฟังก์ชันด้านล่างที่ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์)
--   guilds         : กิลด์ (ชื่อห้ามซ้ำ · ตรา = รหัสตัวเลข 4 ช่อง)
--   guild_members  : สมาชิก (ต่อตัวละคร) — ลบตัวละคร = ออกจากกิลด์อัตโนมัติ
--   guild_invites  : คำเชิญที่ค้างอยู่ (หมดอายุ 3 วัน)
-- เงื่อนไขสร้างกิลด์: Base Lv 20 ขึ้นไป + Zeny 50,000 (ตรวจจากเซฟบนเซิร์ฟเวอร์ แล้วเกมหักเงิน)
-- ปาร์ตี้ไม่ต้องใช้ตาราง (ใช้ Realtime อย่างเดียว)
-- =====================================================================

create table if not exists public.guilds (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(btrim(name)) between 2 and 16),
  emblem     text not null default '0-0-0-9' check (emblem ~ '^[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists guilds_name_unique on public.guilds (lower(btrim(name)));

create table if not exists public.guild_members (
  user_id   uuid     not null,
  slot      smallint not null,
  guild_id  bigint   not null references public.guilds (id) on delete cascade,
  role      text     not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (user_id, slot),
  foreign key (user_id, slot) references public.characters (user_id, slot) on delete cascade
);
create index if not exists guild_members_guild on public.guild_members (guild_id, joined_at);

create table if not exists public.guild_invites (
  guild_id   bigint not null references public.guilds (id) on delete cascade,
  name_key   text   not null,
  created_at timestamptz not null default now(),
  primary key (guild_id, name_key)
);

alter table public.guilds        enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_invites enable row level security;
revoke all on public.guilds        from anon, authenticated;
revoke all on public.guild_members from anon, authenticated;
revoke all on public.guild_invites from anon, authenticated;

-- สมาชิกออก/ถูกเตะ/ลบตัวละคร: ไม่เหลือใคร = ลบกิลด์ · หัวหน้าหาย = ให้สมาชิกที่อยู่นานที่สุดเป็นหัวหน้า
create or replace function public.guild_after_leave() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from guild_members where guild_id = old.guild_id) then
    delete from guilds where id = old.guild_id;
  elsif not exists (select 1 from guild_members where guild_id = old.guild_id and role = 'leader') then
    update guild_members set role = 'leader'
    where (user_id, slot) = (select user_id, slot from guild_members where guild_id = old.guild_id order by joined_at asc limit 1);
  end if;
  return null;
end $$;
drop trigger if exists guild_members_after_delete on public.guild_members;
create trigger guild_members_after_delete after delete on public.guild_members for each row execute function public.guild_after_leave();

-- ตัวช่วย: ตัวละครของผู้เรียก
create or replace function public.guild_me(p_slot integer)
returns table (name text, lv smallint, zeny bigint, guild_id bigint, role text)
language sql stable security definer set search_path = public as $$
  select c.name, c.lv,
         coalesce(case when (c.data->'player'->>'zeny') ~ '^[0-9]+$' then (c.data->'player'->>'zeny')::bigint end, 0),
         m.guild_id, m.role
  from characters c left join guild_members m on m.user_id = c.user_id and m.slot = c.slot
  where c.user_id = auth.uid() and c.slot = p_slot;
$$;
revoke all on function public.guild_me(integer) from public;

-- กิลด์ของฉัน + สมาชิก + คำเชิญที่รออยู่
create or replace function public.guild_mine(p_slot integer)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me record; g record; res jsonb;
begin
  if auth.uid() is null then raise exception 'ยังไม่ได้เข้าสู่ระบบ' using errcode = '42501'; end if;
  select * into me from guild_me(p_slot);
  if me.name is null then return jsonb_build_object('guild', null, 'invites', '[]'::jsonb); end if;
  res := jsonb_build_object('invites', coalesce((
    select jsonb_agg(jsonb_build_object('id', g2.id, 'name', g2.name, 'emblem', g2.emblem) order by i.created_at desc)
    from guild_invites i join guilds g2 on g2.id = i.guild_id
    where i.name_key = lower(btrim(me.name)) and i.created_at > now() - interval '3 days'), '[]'::jsonb));
  if me.guild_id is null then return res || jsonb_build_object('guild', null); end if;
  select * into g from guilds where id = me.guild_id;
  return res || jsonb_build_object('guild', jsonb_build_object(
    'id', g.id, 'name', g.name, 'emblem', g.emblem, 'role', me.role,
    'members', coalesce((select jsonb_agg(jsonb_build_object('name', c.name, 'job', c.job, 'lv', c.lv, 'role', m.role) order by (m.role = 'leader') desc, m.joined_at)
                         from guild_members m join characters c on c.user_id = m.user_id and c.slot = m.slot
                         where m.guild_id = g.id), '[]'::jsonb)));
end $$;

create or replace function public.guild_create(p_slot integer, p_name text, p_emblem text)
returns bigint language plpgsql security definer set search_path = public as $$
declare me record; gid bigint;
begin
  if auth.uid() is null then raise exception 'ยังไม่ได้เข้าสู่ระบบ' using errcode = '42501'; end if;
  select * into me from guild_me(p_slot);
  if me.name is null then raise exception 'ไม่พบตัวละคร'; end if;
  if me.guild_id is not null then raise exception 'อยู่ในกิลด์อื่นแล้ว ต้องออกก่อน'; end if;
  if me.lv < 20 then raise exception 'ต้อง Base Lv 20 ขึ้นไป'; end if;
  if me.zeny < 50000 then raise exception 'Zeny ไม่พอ (ต้องมี 50,000 — ถ้าเพิ่งได้เงิน รอเซฟสักครู่แล้วลองใหม่)'; end if;
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) not between 2 and 16 or p_name !~ '^[[:alnum:][:space:]_.ก-๛-]+$' then raise exception 'ชื่อกิลด์ยาว 2–16 ตัว ใช้ตัวอักษร ตัวเลข เว้นวรรค _ - . ได้'; end if;
  if p_emblem !~ '^[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}$' then p_emblem := '0-0-0-9'; end if;
  insert into guilds (name, emblem) values (p_name, p_emblem) returning id into gid;
  insert into guild_members (user_id, slot, guild_id, role) values (auth.uid(), p_slot, gid, 'leader');
  return gid;
end $$;

create or replace function public.guild_invite(p_slot integer, p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare me record; tgt record; n integer;
begin
  select * into me from guild_me(p_slot);
  if me.role is distinct from 'leader' then raise exception 'เฉพาะหัวหน้ากิลด์เชิญได้'; end if;
  select c.name, m.guild_id into tgt from characters c left join guild_members m on m.user_id = c.user_id and m.slot = c.slot
  where lower(btrim(c.name)) = lower(btrim(p_name)) limit 1;
  if tgt.name is null then raise exception 'ไม่พบตัวละครชื่อนี้'; end if;
  if tgt.guild_id is not null then raise exception '% อยู่ในกิลด์อยู่แล้ว', tgt.name; end if;
  select count(*) into n from guild_members where guild_id = me.guild_id;
  if n >= 30 then raise exception 'กิลด์เต็มแล้ว (30 คน)'; end if;
  insert into guild_invites (guild_id, name_key) values (me.guild_id, lower(btrim(tgt.name)))
  on conflict (guild_id, name_key) do update set created_at = now();
  return tgt.name;
end $$;

create or replace function public.guild_join(p_slot integer, p_guild bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare me record; n integer;
begin
  select * into me from guild_me(p_slot);
  if me.name is null then raise exception 'ไม่พบตัวละคร'; end if;
  if me.guild_id is not null then raise exception 'อยู่ในกิลด์อื่นแล้ว'; end if;
  if not exists (select 1 from guild_invites where guild_id = p_guild and name_key = lower(btrim(me.name)) and created_at > now() - interval '3 days')
    then raise exception 'คำเชิญหมดอายุหรือไม่มีอยู่'; end if;
  select count(*) into n from guild_members where guild_id = p_guild;
  if n >= 30 then raise exception 'กิลด์เต็มแล้ว (30 คน)'; end if;
  insert into guild_members (user_id, slot, guild_id, role) values (auth.uid(), p_slot, p_guild, 'member');
  delete from guild_invites where name_key = lower(btrim(me.name));
  return p_guild;
end $$;

create or replace function public.guild_decline(p_slot integer, p_guild bigint)
returns void language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from guild_me(p_slot);
  delete from guild_invites where guild_id = p_guild and name_key = lower(btrim(me.name));
end $$;

create or replace function public.guild_leave(p_slot integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from guild_members where user_id = auth.uid() and slot = p_slot;
end $$;

create or replace function public.guild_kick(p_slot integer, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from guild_me(p_slot);
  if me.role is distinct from 'leader' then raise exception 'เฉพาะหัวหน้ากิลด์'; end if;
  delete from guild_members m using characters c
  where c.user_id = m.user_id and c.slot = m.slot and m.guild_id = me.guild_id
    and lower(btrim(c.name)) = lower(btrim(p_name)) and not (m.user_id = auth.uid() and m.slot = p_slot);
end $$;

create or replace function public.guild_set_emblem(p_slot integer, p_emblem text)
returns void language plpgsql security definer set search_path = public as $$
declare me record;
begin
  select * into me from guild_me(p_slot);
  if me.role is distinct from 'leader' then raise exception 'เฉพาะหัวหน้ากิลด์'; end if;
  if p_emblem !~ '^[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}$' then raise exception 'ตราไม่ถูกต้อง'; end if;
  update guilds set emblem = p_emblem where id = me.guild_id;
end $$;

-- ชื่อ + ตรากิลด์ (ไว้แสดงเหนือหัวผู้เล่นคนอื่น) — เปิดให้ทุกคนอ่าน เฉพาะข้อมูลที่ไม่เป็นความลับ
create or replace function public.guild_public(p_ids bigint[])
returns table (id bigint, name text, emblem text)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.emblem from guilds g where g.id = any (p_ids[1:50]);
$$;

do $$
declare f text;
begin
  foreach f in array array['guild_mine(integer)', 'guild_create(integer,text,text)', 'guild_invite(integer,text)', 'guild_join(integer,bigint)',
                           'guild_decline(integer,bigint)', 'guild_leave(integer)', 'guild_kick(integer,text)', 'guild_set_emblem(integer,text)', 'guild_public(bigint[])'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
