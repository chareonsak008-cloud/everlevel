-- =====================================================================
-- Everlevel v0.81 — บัญชีชั่วคราว (เล่นแบบไม่สมัคร) + เข้าสู่ระบบด้วย Google
-- บัญชีชั่วคราว (Supabase anonymous) เติมเพชรไม่ได้ — กันเงินหายถ้าผู้เล่นล้างเบราว์เซอร์ก่อนผูกบัญชี
-- (ตั้งค่าเปิดระบบใน Dashboard: Authentication → Sign In / Providers → Allow anonymous sign-ins · Allow manual linking · Google)
-- รันใน SQL Editor · รันซ้ำได้ · ไม่มีคีย์ลับ · ต้องรันหลัง cashshop.sql
-- =====================================================================
create or replace function public._is_guest()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

create or replace function public.topup_request(p_slot integer, p_thb integer, p_slip text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pk cash_packs%rowtype; nm text; n int; r topup_requests%rowtype;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if public._is_guest() then raise exception 'guest_account'; end if;   -- v0.81
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

revoke all on function public._is_guest() from public, anon;
grant execute on function public._is_guest() to authenticated;
revoke all on function public.topup_request(integer, integer, text, text) from public, anon;
grant execute on function public.topup_request(integer, integer, text, text) to authenticated;
