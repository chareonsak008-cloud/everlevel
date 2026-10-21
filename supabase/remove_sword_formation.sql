-- v0.44.4 เลิกขายแฟชั่นค่ายกลกระบี่วายุ + ค่ายกลหมื่นกระบี่ในร้านเพชร
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันครั้งเดียว)
update public.cash_products set active = false where id in ('f_wx_storm', 'f_wx_myriad');
