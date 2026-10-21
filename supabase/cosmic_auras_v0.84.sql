-- Everlevel v0.84 — ออร่าคอสมิก 5 แบบ ขึ้นร้านเพชร (แท็บแฟชั่น · ป้าย "ใหม่")
-- ราคาตามระดับเดียวกับ v0.80: แดง (Mythical) 120 · ฟ้า (Celestial) 150
-- รันใน SQL Editor หลัง cashshop.sql และ anticheat_v0.82.sql · รันซ้ำได้ (อัปเดตราคา/ป้าย/ลำดับให้ตรงไฟล์นี้)

insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort, active) values
  ('f_cs_galaxy',    'fashion', 'a_cs_galaxy',    1, 150, 'fashion', 'ใหม่', 2, true),
  ('f_cs_blackhole', 'fashion', 'a_cs_blackhole', 1, 150, 'fashion', 'ใหม่', 3, true),
  ('f_cs_guardian',  'fashion', 'a_cs_guardian',  1, 150, 'fashion', 'ใหม่', 4, true),
  ('f_cs_nebula',    'fashion', 'a_cs_nebula',    1, 120, 'fashion', 'ใหม่', 5, true),
  ('f_cs_solar',     'fashion', 'a_cs_solar',     1, 120, 'fashion', 'ใหม่', 6, true)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price,
  cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = excluded.active;

-- ชุดแฟชั่นที่หาได้จากร้านเพชรเท่านั้น (ระบบกันโกงตรวจว่ามีประวัติซื้อ) — เดิมจาก anticheat_v0.82.sql + ออร่าคอสมิก
create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon',
               'a_cs_galaxy', 'a_cs_nebula', 'a_cs_blackhole', 'a_cs_solar', 'a_cs_guardian']
$$;
revoke all on function public._cash_only_fashion() from public, anon, authenticated;

select id, ref, price, tag, sort from public.cash_products where id like 'f_cs_%' order by sort;
