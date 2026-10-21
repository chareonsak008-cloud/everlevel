-- =====================================================================
-- Everlevel v0.80 — ตรวจสลิปเติมเพชรอัตโนมัติ (ใช้คู่กับ Edge Function "topup-verify" + EasySlip)
-- ลำดับ: ผู้เล่นอัปสลิป → topup_request (คำขอ pending) → เกมเรียก Edge Function → ตรวจกับธนาคารผ่าน EasySlip
--   ผ่านครบ (ยอดตรง · บัญชีผู้รับตรง · เลขอ้างอิงไม่ซ้ำ · วันที่ถูก) = อนุมัติ + เพชรเข้าทันที
--   สลิปซ้ำ = ปฏิเสธอัตโนมัติ · อย่างอื่นที่ไม่ชัวร์ = ค้างไว้ให้แอดมินตรวจเหมือนเดิม (พร้อมเหตุผล)
-- ฟังก์ชันตัดสินเรียกได้เฉพาะ service_role (Edge Function) เท่านั้น ผู้เล่นเรียกตรงไม่ได้
-- รันใน Supabase SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ · ไม่มีคีย์ลับ · ต้องรันหลัง cashshop.sql
-- =====================================================================
alter table public.topup_requests add column if not exists auto_tries int not null default 0;
alter table public.topup_requests add column if not exists auto_note text;
alter table public.topup_requests add column if not exists trans_ref text;
create unique index if not exists topup_trans_ref on public.topup_requests (trans_ref) where trans_ref is not null;

create table if not exists public.topup_slips (
  trans_ref  text primary key,
  request_id bigint references public.topup_requests(id) on delete set null,
  user_id    uuid references auth.users(id) on delete set null,
  amount     numeric,
  created_at timestamptz not null default now()
);
alter table public.topup_slips enable row level security;
revoke all on public.topup_slips from anon, authenticated;

-- จองสิทธิ์ตรวจ (คำขอต้องเป็นของผู้เรียก · ยัง pending · ตรวจอัตโนมัติได้ไม่เกิน 2 ครั้งต่อคำขอ)
create or replace function public.topup_auto_claim(p_id bigint, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r topup_requests%rowtype;
begin
  select * into r from topup_requests where id = p_id for update;
  if not found or r.user_id <> p_user then return jsonb_build_object('ok', false, 'status', 'none', 'reason', 'not_found'); end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', false, 'status', r.status, 'reason', 'decided'); end if;
  if r.auto_tries >= 2 then return jsonb_build_object('ok', false, 'status', 'pending', 'reason', 'tries'); end if;
  update topup_requests set auto_tries = auto_tries + 1 where id = p_id;
  return jsonb_build_object('ok', true, 'thb', r.thb, 'gems', r.gems, 'slip_path', r.slip_path, 'created_at', r.created_at);
end $$;

-- ตัดสินผล: approve = เพชรเข้า · reject = ปฏิเสธ · manual = ค้างให้แอดมิน (บันทึกเหตุผล)
create or replace function public.topup_auto_decide(p_id bigint, p_result text, p_trans text, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r topup_requests%rowtype; t text := nullif(btrim(coalesce(p_trans, '')), '');
begin
  select * into r from topup_requests where id = p_id for update;
  if not found or r.status <> 'pending' then return jsonb_build_object('status', coalesce(r.status, 'none')); end if;
  if p_result = 'approve' then
    if t is null then p_result := 'manual'; p_note := 'ไม่มีเลขอ้างอิงสลิป';
    elsif exists (select 1 from topup_slips where trans_ref = t) then p_result := 'reject'; p_note := 'สลิปนี้เคยถูกใช้เติมแล้ว';
    end if;
  end if;
  if p_result = 'approve' then
    insert into topup_slips (trans_ref, request_id, user_id, amount) values (t, p_id, r.user_id, p_amount);
    update topup_requests set status = 'approved', trans_ref = t, reply = 'ตรวจสลิปอัตโนมัติ ✓', auto_note = left(p_note, 200),
           decided_at = now(), decided_by = null, seen = false where id = p_id;
    insert into accounts (user_id) values (r.user_id) on conflict (user_id) do nothing;
    update accounts set gems = gems + r.gems where user_id = r.user_id;
    return jsonb_build_object('status', 'approved', 'gems', r.gems);
  elsif p_result = 'reject' then
    update topup_requests set status = 'rejected', reply = left(coalesce(p_note, 'สลิปไม่ถูกต้อง'), 120), auto_note = left(p_note, 200),
           decided_at = now(), decided_by = null, seen = false where id = p_id;
    return jsonb_build_object('status', 'rejected', 'reason', p_note);
  end if;
  update topup_requests set auto_note = left(coalesce(p_note, 'รอแอดมินตรวจ'), 200) where id = p_id;
  return jsonb_build_object('status', 'pending', 'reason', p_note);
end $$;

-- หน้าแอดมิน: แสดงเหตุผลที่ตรวจอัตโนมัติไม่ผ่านด้วย
create or replace function public.gm_topups(p_status text default 'pending')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.char_name, 'thb', r.thb, 'gems', r.gems, 'slip', r.slip_path, 'note', r.note,
                                                         'status', r.status, 'reply', r.reply, 'at', r.created_at, 'decided', r.decided_at, 'auto', r.auto_note) order by r.id desc)
                   from (select * from topup_requests where status = coalesce(p_status, 'pending') order by id desc limit 100) r), '[]'::jsonb);
end $$;

revoke all on function public.topup_auto_claim(bigint, uuid) from public, anon, authenticated;
revoke all on function public.topup_auto_decide(bigint, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.topup_auto_claim(bigint, uuid) to service_role;
grant execute on function public.topup_auto_decide(bigint, text, text, numeric, text) to service_role;
revoke all on function public.gm_topups(text) from public, anon;
grant execute on function public.gm_topups(text) to authenticated;
