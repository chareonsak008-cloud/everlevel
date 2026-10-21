-- =====================================================================
-- Everlevel v0.86 — GM แจกเพชรผ่านจดหมาย
-- รันใน Supabase → SQL Editor (วางทั้งไฟล์ → Run) · รันหลัง update_v0.85.sql · รันซ้ำได้ · ไม่มีคีย์ลับ
--
-- วิธีแจก: เข้าเกมด้วยบัญชีแอดมิน → ปุ่มจดหมาย → แท็บ GM → ใส่จำนวน "💎 เพชร" → ส่ง (ถึงคนเดียว หรือ ถึงทุกคน)
-- เพชรเข้าบัญชีผู้เล่นตอนกดรับจดหมาย · บัญชีละครั้งเสมอ (จดหมายแบบตัวละครละครั้งก็ได้เพชรแค่ครั้งแรกของบัญชี)
-- ทุกครั้งที่ได้เพชรจากจดหมาย บันทึกใน gem_log (ดูได้ใน Table Editor)
-- =====================================================================

alter table public.mails add column if not exists gems integer not null default 0;
do $$ begin
  alter table public.mails add constraint mails_gems_range check (gems between 0 and 100000);
exception when duplicate_object then null; end $$;
grant insert (gems) on public.mails to authenticated;   -- นโยบาย mails_insert_admin ยังจำกัดให้เฉพาะแอดมินส่งได้
grant select (gems) on public.mails to authenticated;

create table if not exists public.gem_log (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  delta      integer     not null,
  reason     text        not null,
  mail_id    bigint,
  created_at timestamptz not null default now()
);
create index if not exists gem_log_user on public.gem_log (user_id, created_at desc);
alter table public.gem_log enable row level security;
revoke all on public.gem_log from anon, authenticated;

-- กดรับจดหมายที่มีเพชร → เพิ่มเพชรให้บัญชี (ครั้งแรกของบัญชีต่อจดหมายเท่านั้น)
create or replace function public._mail_gems_tg()
returns trigger language plpgsql security definer set search_path = public as $$
declare g int;
begin
  select gems into g from mails where id = new.mail_id;
  if coalesce(g, 0) <= 0 then return null; end if;
  if (select count(*) from mail_claims where mail_id = new.mail_id and user_id = new.user_id) > 1 then return null; end if;
  insert into accounts (user_id) values (new.user_id) on conflict (user_id) do nothing;
  update accounts set gems = gems + g where user_id = new.user_id;
  insert into gem_log (user_id, delta, reason, mail_id) values (new.user_id, g, 'mail', new.mail_id);
  return null;
end $$;
revoke all on function public._mail_gems_tg() from public, anon, authenticated;
drop trigger if exists mail_claims_gems on public.mail_claims;
create trigger mail_claims_gems after insert on public.mail_claims for each row execute function public._mail_gems_tg();

-- ตรวจผล
select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'mails' and column_name = 'gems';
