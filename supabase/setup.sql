-- =====================================================================
-- Everlevel v0.12–v0.15 — ตั้งค่าฐานข้อมูล Supabase
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → กด Run (รันซ้ำได้ ไม่เสียข้อมูล)
--
-- ตาราง
--   characters : ตัวละคร (บัญชีละ 3 ช่อง) + เซฟทั้งหมดของตัวละครใน data
--   accounts   : คลังเก็บของที่ใช้ร่วมกันทุกตัวละครในบัญชี
-- ความปลอดภัย
--   * รหัสผ่านเก็บโดยระบบ Auth ของ Supabase (เข้ารหัสแล้ว) — ตารางของเกมไม่มีรหัสผ่าน
--   * Row Level Security: ผู้เล่นอ่าน/เขียนได้เฉพาะแถวของตัวเอง
--   * อันดับผู้เล่นอ่านผ่านฟังก์ชัน leaderboard() ที่คืนเฉพาะ ชื่อ/อาชีพ/เลเวล
-- =====================================================================

-- ---------- ตัวละคร ----------
create table if not exists public.characters (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  slot       smallint    not null check (slot between 1 and 3),
  name       text        not null check (char_length(btrim(name)) between 2 and 16),
  job        text        not null default 'novice' check (char_length(job) <= 20),
  lv         smallint    not null default 1 check (lv between 1 and 99),
  jlv        smallint    not null default 1 check (jlv between 1 and 99),
  map        text        not null default 'asteria_town' check (char_length(map) <= 40),
  data       jsonb       not null default '{}'::jsonb check (pg_column_size(data) < 400000),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

-- ชื่อตัวละครห้ามซ้ำกันทั้งเซิร์ฟเวอร์ (ไม่สนตัวพิมพ์เล็ก/ใหญ่)
create unique index if not exists characters_name_unique on public.characters (lower(btrim(name)));
-- ใช้เรียงอันดับ
create index if not exists characters_rank on public.characters (lv desc, jlv desc);

-- ---------- บัญชี (คลังเก็บของใช้ร่วมกัน) ----------
create table if not exists public.accounts (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  storage    jsonb       not null default '[]'::jsonb check (pg_column_size(storage) < 200000),
  updated_at timestamptz not null default now()
);

-- ---------- สิทธิ์: เฉพาะเจ้าของ ----------
alter table public.characters enable row level security;
alter table public.accounts   enable row level security;

revoke all on public.characters from anon;
revoke all on public.accounts   from anon;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.accounts   to authenticated;

drop policy if exists "characters_select_own" on public.characters;
drop policy if exists "characters_insert_own" on public.characters;
drop policy if exists "characters_update_own" on public.characters;
drop policy if exists "characters_delete_own" on public.characters;
create policy "characters_select_own" on public.characters for select to authenticated using ((select auth.uid()) = user_id);
create policy "characters_insert_own" on public.characters for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "characters_update_own" on public.characters for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "characters_delete_own" on public.characters for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "accounts_select_own" on public.accounts;
drop policy if exists "accounts_insert_own" on public.accounts;
drop policy if exists "accounts_update_own" on public.accounts;
drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "accounts_insert_own" on public.accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "accounts_update_own" on public.accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "accounts_delete_own" on public.accounts for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- อันดับผู้เล่น (เปิดให้ทุกคนดูได้ เฉพาะข้อมูลที่ไม่เป็นความลับ) ----------
create or replace function public.leaderboard(n integer default 30)
returns table (name text, job text, lv smallint, jlv smallint, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, c.job, c.lv, c.jlv, (c.user_id = auth.uid()) as mine
  from public.characters c
  order by c.lv desc, c.jlv desc, c.updated_at asc
  limit least(greatest(coalesce(n, 30), 1), 100);
$$;
revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to anon, authenticated;

-- เช็กว่าชื่อว่างไหม (ใช้แสดงข้อความก่อนสร้างตัวละคร — การกันชื่อซ้ำจริงอยู่ที่ unique index ด้านบน)
create or replace function public.name_available(n text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.characters c where lower(btrim(c.name)) = lower(btrim(n)));
$$;
revoke all on function public.name_available(text) from public;
grant execute on function public.name_available(text) to authenticated;

-- =====================================================================
-- v0.15: ระบบจดหมายแจกของ (เหมือนไฟล์ mail.sql — ติดตั้งใหม่รันไฟล์นี้ไฟล์เดียวพอ)
-- =====================================================================

-- ---------- แอดมิน ----------
create table if not exists public.admins (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- จดหมาย ----------
create table if not exists public.mails (
  id         bigint      generated always as identity primary key,
  to_name    text        check (to_name is null or char_length(btrim(to_name)) between 2 and 16),   -- null = ทุกคน
  sender     text        not null default 'GM' check (char_length(sender) between 1 and 24),
  title      text        not null check (char_length(btrim(title)) between 1 and 60),
  body       text        not null default '' check (char_length(body) <= 600),
  items      jsonb       not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) < 4000),
  zeny       integer     not null default 0 check (zeny between 0 and 100000000),
  picks      jsonb       not null default '[]'::jsonb check (jsonb_typeof(picks) = 'array' and pg_column_size(picks) < 4000),
  per        text        not null default 'account' check (per in ('account', 'char')),   -- รับได้บัญชีละครั้ง / ตัวละครละครั้ง
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid        default auth.uid() references auth.users (id) on delete set null
);
create index if not exists mails_created on public.mails (created_at desc);
alter table public.mails enable row level security;
revoke all on public.mails from anon, authenticated;
grant select, insert, delete on public.mails to authenticated;

drop policy if exists "mails_select" on public.mails;
drop policy if exists "mails_insert_admin" on public.mails;
drop policy if exists "mails_delete_admin" on public.mails;
create policy "mails_select" on public.mails for select to authenticated using (
  public.is_admin()
  or (
    (expires_at is null or expires_at > now())
    and (to_name is null or lower(btrim(to_name)) in (select lower(btrim(c.name)) from public.characters c where c.user_id = (select auth.uid())))
  )
);
create policy "mails_insert_admin" on public.mails for insert to authenticated with check (public.is_admin());
create policy "mails_delete_admin" on public.mails for delete to authenticated using (public.is_admin());

-- ---------- การรับของ ----------
create table if not exists public.mail_claims (
  mail_id    bigint      not null references public.mails (id) on delete cascade,
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  cid        text        not null check (char_length(cid) between 3 and 24),   -- 'acct' = บัญชีละครั้ง · หรือรหัสตัวละคร
  claimed_at timestamptz not null default now(),
  primary key (mail_id, user_id, cid)
);
alter table public.mail_claims enable row level security;
revoke all on public.mail_claims from anon, authenticated;
grant select, insert on public.mail_claims to authenticated;
drop policy if exists "mail_claims_select_own" on public.mail_claims;
drop policy if exists "mail_claims_insert_own" on public.mail_claims;
create policy "mail_claims_select_own" on public.mail_claims for select to authenticated using (user_id = (select auth.uid()));
create policy "mail_claims_insert_own" on public.mail_claims for insert to authenticated with check (user_id = (select auth.uid()));

-- =====================================================================
-- ตั้งตัวเองเป็นแอดมิน: แก้อีเมลในบรรทัดล่างให้เป็นอีเมลที่ใช้สมัครเล่นเกม
-- แล้วลบเครื่องหมาย -- ข้างหน้าออก จากนั้นกด Run อีกครั้ง
-- =====================================================================
-- insert into public.admins (user_id, note) select id, 'เจ้าของเกม' from auth.users where email = 'อีเมลของคุณ@example.com' on conflict (user_id) do nothing;
