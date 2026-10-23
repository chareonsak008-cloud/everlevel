-- Everlevel v0.93.0 — ออร่าฮาโลวีน "ราชันย์ฟักทองราตรี" (a_hw_pumpking)
-- แฟชั่นเทศกาล: ไม่มีขายในร้านเพชร · ไม่สุ่มจากกล่อง · ได้จากจดหมาย GM เท่านั้น
--
-- ขั้นที่ 1 (รันครั้งเดียว · รันซ้ำได้): ใส่ออร่านี้ในรายการ "ห้ามได้มาเอง" ของระบบกันโกง
--   → ถ้ามีใครแก้เซฟให้ตัวเองมีออร่านี้โดยไม่ได้รับจากจดหมาย GM จะถูกระงับบัญชีอัตโนมัติ
--   (ผู้เล่นที่กดรับจากจดหมาย GM ผ่านได้ตามปกติ — ระบบเช็กประวัติรับจดหมาย)

-- กันพลาด: ถ้าเคยรันไฟล์รุ่นก่อนที่ใส่ไว้ในร้าน → ปิดขาย
update public.cash_products set active = false where ref = 'a_hw_pumpking';

create or replace function public._cash_only_fashion()
returns text[] language sql immutable as $$
  select array['a_wx_iron', 'a_wx_jade', 'a_wx_qi', 'a_wx_soulscythe', 'a_wx_sunfire', 'a_wx_bloodscythe', 'a_wx_heaven', 'a_wx_ascend', 'o_px_dragon',
               'a_cs_galaxy', 'a_cs_nebula', 'a_cs_blackhole', 'a_cs_solar', 'a_cs_guardian',
               'a_rp_reaper', 'a_hw_pumpking']
$$;
revoke all on function public._cash_only_fashion() from public, anon, authenticated;


-- ขั้นที่ 2 (ตอนจะแจกช่วงเทศกาล): ส่งจดหมาย GM ให้ทุกคน — ผู้เล่นกดเลือกรับออร่าในหน้าจดหมาย (บัญชีละครั้ง)
-- ** อย่ารันส่วนนี้จนกว่าจะถึงวันแจก ** ลบเครื่องหมาย -- หน้าบรรทัด insert … ออกเมื่อพร้อม
-- ปรับวันหมดอายุ (expires_at) ได้ตามต้องการ · ถ้าจะแจกเฉพาะคน ใส่ชื่อตัวละครแทน null ที่ to_name

-- insert into public.mails (to_name, sender, title, body, picks, per, expires_at) values (
--   null, 'GM', '🎃 ของขวัญเทศกาลฮาโลวีน',
--   'สุขสันต์วันฮาโลวีน! รับออร่าพิเศษ "ราชันย์ฟักทองราตรี" — แฟชั่นเทศกาลที่ไม่มีขายและหาไม่ได้อีก กดเลือกออร่าแล้วกดรับได้เลย',
--   '[{"kind":"fashion","options":["a_hw_pumpking"]}]'::jsonb, 'account', '2026-11-07 23:59:00+07'
-- );

-- ตรวจดูจดหมายที่ส่งแล้ว
-- select id, to_name, title, picks, expires_at from public.mails where picks::text like '%a_hw_pumpking%' order by id desc;
