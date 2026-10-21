-- Everlevel v0.80 — ปรับราคาออร่าในร้านเพชรตามระดับ: ม่วง (ล้ำค่า) 60 · ส้ม (ตำนาน) 100 · แดง (Mythical) 120 · ฟ้า (Celestial) 150
-- เกราะมังกรเพลิง (ชุด) 199 · ระดับธรรมดา/หายาก (19/29/49) คงเดิม · รันใน SQL Editor · รันซ้ำได้
update public.cash_products set price = 60  where id in ('f_butterflies','f_circle','f_fire','f_fish','f_lightning','f_pixels','f_shadow','f_sparks','f_wx_qi');
update public.cash_products set price = 100 where id in ('f_coins','f_fireworks','f_soulfire','f_wx_soulscythe','f_wx_sunfire');
update public.cash_products set price = 120 where id in ('f_bloodring','f_inferno','f_prism','f_thundergod','f_voidrift','f_wx_bloodscythe');
update public.cash_products set price = 199 where id = 'f_dragon';   -- เกราะมังกรเพลิง (ชุดพิกเซลทั้งตัว) ราคาพิเศษ
update public.cash_products set price = 150 where id in ('f_blossomstorm','f_constellation','f_heavenlight','f_supernova','f_wx_ascend','f_wx_heaven');
select price, count(*) as items, string_agg(id, ', ' order by id) from public.cash_products where kind = 'fashion' and active group by price order by price;
