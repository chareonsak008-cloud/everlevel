-- =====================================================================
-- Everlevel v0.15 — ระบบจดหมายแจกของ (เพิ่มจาก setup.sql)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → กด Run (รันซ้ำได้ ไม่เสียข้อมูล)
--
-- ตาราง
--   admins      : บัญชีแอดมิน (ส่ง/ลบจดหมายได้) — เพิ่มแอดมินด้วยคำสั่งท้ายไฟล์
--   mails       : จดหมาย (ส่งถึงทุกคน หรือระบุชื่อตัวละคร) + ไอเทม/Zeny/ตัวเลือกชุดแฟชั่น/สัตว์เลี้ยง
--   mail_claims : ใครรับของจากจดหมายไหนไปแล้ว (คีย์หลักกันรับซ้ำ)
-- ความปลอดภัย
--   * ผู้เล่นอ่านได้เฉพาะจดหมายถึงทุกคน/ถึงตัวละครของตัวเอง ที่ยังไม่หมดอายุ
--   * ส่ง/ลบจดหมายได้เฉพาะบัญชีที่อยู่ในตาราง admins (ตรวจที่ฐานข้อมูล ไม่ใช่ในเกม)
--   * ตาราง admins แก้ได้จากหน้า Supabase เท่านั้น (ในเกมเพิ่มตัวเองเป็นแอดมินไม่ได้)
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
