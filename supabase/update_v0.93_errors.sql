-- Everlevel v0.93.0 (fix15) — ระบบรายงานปัญหาอัตโนมัติ: เกมส่ง error + ข้อมูลเครื่อง (รุ่น การ์ดจอ RAM เบราว์เซอร์) มาเก็บเอง
-- ใช้ไล่หาสาเหตุมือถือ Android แครช / จอขาว / เกมค้าง · รันใน SQL Editor ครั้งเดียว (รันซ้ำได้)
-- ไม่เก็บอีเมลหรือข้อมูลส่วนตัว: เก็บเฉพาะรหัสผู้ใช้ (ถ้าล็อกอินแล้ว) ชื่อตัวละคร ข้อความ error และสเปกเครื่องแบบกว้าง ๆ

create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  user_id    uuid        default auth.uid() references auth.users (id) on delete set null,
  char_name  text        check (char_name is null or char_length(char_name) <= 24),
  kind       text        not null check (char_length(kind) between 1 and 32),          -- error · promise · boot_crash · gl_lost · gl_fail
  msg        text        not null default '' check (char_length(msg) <= 500),
  stack      text        not null default '' check (char_length(stack) <= 2000),
  ver        text        not null default '' check (char_length(ver) <= 40),
  device     jsonb       not null default '{}'::jsonb check (pg_column_size(device) <= 2500),
  created_at timestamptz not null default now()
);
create index if not exists client_errors_at on public.client_errors (created_at desc);
create index if not exists client_errors_kind on public.client_errors (kind, created_at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;
grant select, delete on public.client_errors to authenticated;
drop policy if exists "client_errors_gm_read" on public.client_errors;
create policy "client_errors_gm_read" on public.client_errors for select to authenticated using ((select public.is_admin()));
drop policy if exists "client_errors_gm_delete" on public.client_errors;
create policy "client_errors_gm_delete" on public.client_errors for delete to authenticated using ((select public.is_admin()));

-- ส่งรายงาน (เรียกได้ทั้งก่อน/หลังล็อกอิน) · กันสแปม: ต่อผู้ใช้ 30 รายการ/ชั่วโมง · ทั้งระบบ 600 รายการ/10 นาที · เก็บย้อนหลัง 30 วัน
create or replace function public.report_client_error(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if p is null or jsonb_typeof(p) <> 'object' then return; end if;
  if uid is not null and (select count(*) from client_errors where user_id = uid and created_at > now() - interval '1 hour') >= 30 then return; end if;
  if (select count(*) from client_errors where created_at > now() - interval '10 minutes') >= 600 then return; end if;
  insert into client_errors (user_id, char_name, kind, msg, stack, ver, device)
  values (uid,
          nullif(left(coalesce(p->>'char', ''), 24), ''),
          left(coalesce(nullif(p->>'kind', ''), 'error'), 32),
          left(coalesce(p->>'msg', ''), 500),
          left(coalesce(p->>'stack', ''), 2000),
          left(coalesce(p->>'ver', ''), 40),
          case when jsonb_typeof(p->'device') = 'object' and pg_column_size(p->'device') <= 2500 then p->'device' else '{}'::jsonb end);
  delete from client_errors where created_at < now() - interval '30 days';
end $$;
revoke all on function public.report_client_error(jsonb) from public;
grant execute on function public.report_client_error(jsonb) to anon, authenticated;

-- ===== คำสั่งสำหรับ GM (ดูรายงาน) =====
-- สรุป 24 ชม.: ปัญหาไหนเกิดบ่อย บนการ์ดจอ/มือถือรุ่นไหน
-- select kind, left(msg, 80) msg, device->>'gpu' gpu, device->>'os' os, count(*) n, max(created_at) last
--   from client_errors where created_at > now() - interval '24 hours'
--   group by 1, 2, 3, 4 order by n desc limit 50;
-- ดูเฉพาะมือถือที่แครชตอนเข้าเกม
-- select created_at, char_name, device from client_errors where kind = 'boot_crash' order by id desc limit 30;
