-- =====================================================================
-- Everlevel v0.89 — แลกเปลี่ยนไอเทมกับผู้เล่น: เฉพาะ VIP กับ VIP ด้วยกัน
-- รันใน Supabase → SQL Editor (วางทั้งไฟล์ → Run) · รันหลัง update_v0.88.sql · รันซ้ำได้ · ไม่มีคีย์ลับ
-- ตรวจที่เซิร์ฟเวอร์ (กันแก้เกมฝั่งเครื่อง): ชวนแลก · ตอบรับ · ยืนยันแลก — ทั้งสองฝ่ายต้องมี VIP ที่ยังไม่หมดอายุ
-- ตลาดฝากขายใช้ได้ทุกคนตามเดิม
-- =====================================================================

create or replace function public._trade_vip_tg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public._vip(new.a_user) then raise exception 'vip_required'; end if;
    if not public._vip(new.b_user) then raise exception 'target_not_vip'; end if;
  elsif new.status is distinct from old.status and new.status in ('open', 'done') then
    if not (public._vip(new.a_user) and public._vip(new.b_user)) then
      raise exception '%', case when public._vip(auth.uid()) then 'peer_not_vip' else 'vip_required' end;
    end if;
  end if;
  return new;
end $$;
revoke all on function public._trade_vip_tg() from public, anon, authenticated;
drop trigger if exists trades_vip_only on public.trades;
create trigger trades_vip_only before insert or update on public.trades for each row execute function public._trade_vip_tg();

-- ตรวจผล
select tgname from pg_trigger where tgname = 'trades_vip_only';
