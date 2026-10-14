-- Everlevel v0.32: อันดับหอคอยนิรันดร์ — รันหลัง setup.sql (รันซ้ำได้ ไม่มีคีย์ลับ)
-- ผู้เล่นส่งได้เฉพาะ "ชั้นสูงสุด" ของตัวละครตัวเอง · ชื่อ/อาชีพดึงจากตาราง characters ฝั่งเซิร์ฟเวอร์ (ปลอมชื่อไม่ได้)
create table if not exists public.tower_records (
  user_id    uuid     not null references auth.users (id) on delete cascade,
  slot       smallint not null check (slot between 1 and 3),
  best_floor integer  not null default 0 check (best_floor between 0 and 9999),
  best_at    timestamptz not null default now(),
  primary key (user_id, slot)
);
create index if not exists tower_records_rank on public.tower_records (best_floor desc, best_at asc);
alter table public.tower_records enable row level security;
revoke all on public.tower_records from anon, authenticated;

-- ส่งสถิติ: เก็บค่าที่สูงกว่าเดิมเท่านั้น · ขึ้นได้ไม่เกินครั้งละ 200 ชั้น (กันค่าผิดปกติ)
create or replace function public.tower_submit(p_slot integer, p_floor integer)
returns integer language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not exists (select 1 from characters c where c.user_id = auth.uid() and c.slot = p_slot) then return 0; end if;
  select best_floor into cur from tower_records where user_id = auth.uid() and slot = p_slot;
  cur := coalesce(cur, 0);
  if p_floor is null or p_floor <= cur then return cur; end if;
  p_floor := least(p_floor, cur + 200, 9999);
  insert into tower_records (user_id, slot, best_floor, best_at) values (auth.uid(), p_slot, p_floor, now())
  on conflict (user_id, slot) do update set best_floor = excluded.best_floor, best_at = now();
  return p_floor;
end $$;
revoke all on function public.tower_submit(integer, integer) from public;
grant execute on function public.tower_submit(integer, integer) to authenticated;

-- กระดานอันดับ: คืนเฉพาะ ชื่อ / อาชีพ / ชั้นสูงสุด / เป็นของเราไหม
create or replace function public.tower_board(n integer default 50)
returns table (name text, job text, best_floor integer, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.job, t.best_floor, (t.user_id = auth.uid()) as mine
  from tower_records t join characters c on c.user_id = t.user_id and c.slot = t.slot
  where t.best_floor > 0
  order by t.best_floor desc, t.best_at asc
  limit least(greatest(coalesce(n, 50), 1), 100);
$$;
revoke all on function public.tower_board(integer) from public;
grant execute on function public.tower_board(integer) to anon, authenticated;
