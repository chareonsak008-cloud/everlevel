-- =====================================================================
-- Everlevel v0.77 — อุปกรณ์นิรันดร์กาล (เกรดสูงสุด · หลอมที่การ์ธ) + เศษนิรันดร์กาล
-- เพิ่มไอเทมใหม่ 29 ชนิดเข้าแคตตาล็อกของเซิร์ฟเวอร์ (ถ้าไม่รัน คนที่มีของใหม่จะถูกระบบกันโกงล็อกการแลก)
-- อุปกรณ์นิรันดร์กาลไม่มีค่าสุ่ม จึงไม่ต้องเพิ่มช่วงค่าสุ่ม (item_rolls) · ซื้อขาย/ลงตลาดได้
-- รันใน Supabase Dashboard → SQL Editor (วางทั้งไฟล์ → Run) · รันซ้ำได้ · ไม่มีคีย์ลับ
-- =====================================================================
insert into public.item_catalog (id, price, kind, tradable) values
  ('et_blade_wpn', 3000000, 'equip', true),
  ('et_blade_off', 1500000, 'equip', true),
  ('et_blade_head', 1500000, 'equip', true),
  ('et_blade_body', 1500000, 'equip', true),
  ('et_blade_garment', 1500000, 'equip', true),
  ('et_blade_shoes', 1500000, 'equip', true),
  ('et_blade_acc', 1500000, 'equip', true),
  ('et_astral_wpn', 3000000, 'equip', true),
  ('et_astral_off', 1500000, 'equip', true),
  ('et_astral_head', 1500000, 'equip', true),
  ('et_astral_body', 1500000, 'equip', true),
  ('et_astral_garment', 1500000, 'equip', true),
  ('et_astral_shoes', 1500000, 'equip', true),
  ('et_astral_acc', 1500000, 'equip', true),
  ('et_gale_wpn', 3000000, 'equip', true),
  ('et_gale_off', 1500000, 'equip', true),
  ('et_gale_head', 1500000, 'equip', true),
  ('et_gale_body', 1500000, 'equip', true),
  ('et_gale_garment', 1500000, 'equip', true),
  ('et_gale_shoes', 1500000, 'equip', true),
  ('et_gale_acc', 1500000, 'equip', true),
  ('et_sanct_wpn', 3000000, 'equip', true),
  ('et_sanct_off', 1500000, 'equip', true),
  ('et_sanct_head', 1500000, 'equip', true),
  ('et_sanct_body', 1500000, 'equip', true),
  ('et_sanct_garment', 1500000, 'equip', true),
  ('et_sanct_shoes', 1500000, 'equip', true),
  ('et_sanct_acc', 1500000, 'equip', true),
  ('eternal_shard', 200000, 'etc', true)
on conflict (id) do update set price = excluded.price, kind = excluded.kind, tradable = excluded.tradable;

-- ตรวจผล: ต้องได้ 29
select count(*) as eternal_items from public.item_catalog where id like 'et\_%' escape '\' or id = 'eternal_shard';
