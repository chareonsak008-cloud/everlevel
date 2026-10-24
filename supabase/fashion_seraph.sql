-- Everlevel — ปีก "เทวทูตหกปีก" ขึ้นร้านเพชร (แท็บแฟชั่น · ป้าย "ใหม่" · อยู่บนสุด)
-- ราคาระดับ Celestial 150 เพชร · รันใน SQL Editor ครั้งเดียว (รันซ้ำได้) · รันหลัง fashion_reaper.sql

insert into public.cash_products (id, kind, ref, qty, price, cat, tag, sort, active) values
  ('f_px_seraph6', 'fashion', 'w_px_seraph6', 1, 150, 'fashion', 'ใหม่', -1, true)
on conflict (id) do update set kind = excluded.kind, ref = excluded.ref, qty = excluded.qty, price = excluded.price,
  cat = excluded.cat, tag = excluded.tag, sort = excluded.sort, active = excluded.active;

-- ชุดแฟชั่นที่หาได้จากร้านเพชรเท่านั้น (ระบบกันโกงตรวจว่ามีประวัติซื้อ) — รายการเดิมทั้งหมด + ยมทูต + ปีกเทวทูต
create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon',
               'a_cs_galaxy', 'a_cs_nebula', 'a_cs_blackhole', 'a_cs_solar', 'a_cs_guardian',
               'a_rp_reaper', 'w_px_seraph6']
$$;
revoke all on function public._cash_only_fashion() from public, anon, authenticated;

select id, ref, price, tag, sort, active from public.cash_products where id = 'f_px_seraph6';
