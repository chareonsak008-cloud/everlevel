-- v0.72 แก้คำเตือน Supabase Security Advisor: "Function Search Path Mutable" (5 ฟังก์ชันช่วย)
-- ล็อก search_path ให้ฟังก์ชันไม่ไปหยิบตาราง/ฟังก์ชันชื่อซ้ำจาก schema อื่น
-- ทั้ง 5 ตัวไม่ได้อ้างตารางแบบไม่ระบุ schema ในตัวฟังก์ชัน จึงตั้งเป็นค่าว่าง ('') ได้ปลอดภัย (pg_catalog ใช้ได้เสมอ)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run · รันซ้ำได้ ไม่มีผลกับข้อมูลผู้เล่น

alter function public._gx_fee_of(bigint, integer)      set search_path = '';
alter function public._rate(integer)                   set search_path = '';
alter function public._b36(text)                       set search_path = '';
alter function public._bkk_today()                     set search_path = '';
alter function public._trade_side(public.trades, integer) set search_path = '';

-- ตรวจผล: ทุกแถวต้องมี search_path=""
select p.proname, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('_gx_fee_of', '_rate', '_b36', '_bkk_today', '_trade_side');
