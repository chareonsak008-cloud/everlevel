-- =====================================================================
-- Everlevel v0.79 — อีเวนต์ตามเทศกาล (ฮาโลวีน · ลอยกระทง · สงกรานต์ · ปีใหม่)
-- เพิ่มของสะสมเทศกาล 4 ชนิดเข้าแคตตาล็อกของเซิร์ฟเวอร์ (ถ้าไม่รัน คนที่เก็บของสะสมได้จะถูกระบบกันโกงล็อกการแลก)
-- ของสะสมแลกเปลี่ยน/ลงตลาดไม่ได้ · ไม่มีค่าสุ่ม · รันใน Supabase SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ · ไม่มีคีย์ลับ
-- =====================================================================
insert into public.item_catalog (id, price, kind, tradable) values
  ('fest_candy', 1000, 'etc', false),
  ('fest_lotus', 1000, 'etc', false),
  ('fest_bowl', 1000, 'etc', false),
  ('fest_gift', 1000, 'etc', false)
on conflict (id) do update set price = excluded.price, kind = excluded.kind, tradable = excluded.tradable;

-- ตรวจผล: ต้องได้ 4
select count(*) as festival_items from public.item_catalog where id in ('fest_candy', 'fest_lotus', 'fest_bowl', 'fest_gift');
