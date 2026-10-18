-- v0.44.5 แก้ระบบแลกเปลี่ยน: ยืนยันแล้วไม่ถูกยกเลิก · แจ้งล่วงหน้าเมื่อกระเป๋าอีกฝ่ายเต็ม · แลกฝ่ายเดียวได้
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันครั้งเดียว)

-- วางของ/เงินบนโต๊ะ (ตรวจกับเซฟบนเซิร์ฟเวอร์ · เกมต้องเซฟก่อนเรียก) · การยืนยันของทั้งคู่รีเซ็ต
-- v0.44.5 ตรวจล่วงหน้าว่ากระเป๋าอีกฝ่ายรับไหว (ชนิดเดียวกันรวมไม่เกิน 999) → แจ้งตอนวางของ ไม่ต้องรอไปพังตอนยืนยัน
create or replace function public.trade_offer(p_slot integer, p_id bigint, p_items jsonb, p_zeny bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; side text; items jsonb; d jsonb; od jsonb; e jsonb;
begin
  select * into t from trades where id = p_id for update;
  side := public._trade_side(t, p_slot);
  if not found or side is null or t.status <> 'open' then raise exception 'no_trade'; end if;
  items := public._offer_items(p_items);
  if coalesce(p_zeny, 0) < 0 or p_zeny > 999999999 then raise exception 'bad_zeny'; end if;
  select data into d from characters where user_id = auth.uid() and slot = p_slot;
  if side = 'a' then select data into od from characters where user_id = t.b_user and slot = t.b_slot;
  else select data into od from characters where user_id = t.a_user and slot = t.a_slot; end if;
  for e in select * from jsonb_array_elements(items) loop
    if public._inv_count(d->'player'->'inventory', e->>0) < (e->>1)::bigint then raise exception 'not_enough:%', e->>0; end if;
    if public._inv_count(od->'player'->'inventory', e->>0) + (e->>1)::bigint > 999 then
      raise exception 'peer_full:%:%', e->>0, 999 - public._inv_count(od->'player'->'inventory', e->>0);
    end if;
  end loop;
  if public._zeny(d) < coalesce(p_zeny, 0) then raise exception 'not_enough_zeny'; end if;
  if public._zeny(od) + coalesce(p_zeny, 0) > 999999999 then raise exception 'peer_zeny_full'; end if;
  if side = 'a' then update trades set a_items = items, a_zeny = coalesce(p_zeny, 0), a_ok = false, b_ok = false, ver = ver + 1, note = null, updated_at = now() where id = p_id returning * into t;
  else update trades set b_items = items, b_zeny = coalesce(p_zeny, 0), a_ok = false, b_ok = false, ver = ver + 1, note = null, updated_at = now() where id = p_id returning * into t; end if;
  return public._trade_json(t, p_slot);
end $$;

-- ยืนยัน (ส่ง ver ที่เห็นมาด้วย กันกดยืนยันของที่อีกฝ่ายเพิ่งเปลี่ยน) · ยืนยันครบสองฝั่ง = ย้ายของทันที
-- แลกฝ่ายเดียวได้ (อีกฝ่ายไม่ต้องวางของ) · ต้องมีของหรือเงินอย่างน้อยหนึ่งฝั่ง
-- v0.44.5 ย้ายของไม่สำเร็จ → โต๊ะยังเปิดอยู่ (ไม่ยกเลิก) ยืนยันถูกรีเซ็ต + แจ้งสาเหตุใน note ให้แก้แล้วยืนยันใหม่
create or replace function public.trade_confirm(p_slot integer, p_id bigint, p_ver integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t trades%rowtype; side text; neg jsonb; pos jsonb; e jsonb; lk int;
begin
  select * into t from trades where id = p_id for update;
  side := public._trade_side(t, p_slot);
  if not found or side is null or t.status <> 'open' then raise exception 'no_trade'; end if;
  if t.ver <> p_ver then raise exception 'changed'; end if;
  if jsonb_array_length(t.a_items) = 0 and jsonb_array_length(t.b_items) = 0 and t.a_zeny = 0 and t.b_zeny = 0 then raise exception 'empty_trade'; end if;
  if side = 'a' then update trades set a_ok = true, note = null, updated_at = now() where id = p_id returning * into t;
  else update trades set b_ok = true, note = null, updated_at = now() where id = p_id returning * into t; end if;
  if not (t.a_ok and t.b_ok) then return public._trade_json(t, p_slot); end if;

  -- ล็อกแถวตัวละครทั้งคู่ตามลำดับ (กัน deadlock) แล้วตรวจซ้ำ
  perform 1 from characters where (user_id = t.a_user and slot = t.a_slot) or (user_id = t.b_user and slot = t.b_slot) order by user_id, slot for update;
  select count(*) into lk from accounts where user_id in (t.a_user, t.b_user) and trade_lock is not null;
  begin
    if lk > 0 then raise exception 'trade_locked'; end if;
    -- a ให้ b
    neg := coalesce((select jsonb_agg(jsonb_build_array(x->>0, -(x->>1)::bigint)) from jsonb_array_elements(t.a_items) x), '[]'::jsonb);
    pos := coalesce((select jsonb_agg(jsonb_build_array(x->>0, (x->>1)::bigint)) from jsonb_array_elements(t.b_items) x), '[]'::jsonb);
    perform public._apply(t.a_user, t.a_slot, jsonb_build_object('inv', neg || pos, 'zeny', t.b_zeny - t.a_zeny, 'note', 'แลกกับ ' || t.b_name));
    neg := coalesce((select jsonb_agg(jsonb_build_array(x->>0, -(x->>1)::bigint)) from jsonb_array_elements(t.b_items) x), '[]'::jsonb);
    pos := coalesce((select jsonb_agg(jsonb_build_array(x->>0, (x->>1)::bigint)) from jsonb_array_elements(t.a_items) x), '[]'::jsonb);
    perform public._apply(t.b_user, t.b_slot, jsonb_build_object('inv', neg || pos, 'zeny', t.a_zeny - t.b_zeny, 'note', 'แลกกับ ' || t.a_name));
    update trades set status = 'done', note = null, updated_at = now() where id = p_id returning * into t;
  exception when others then
    -- ของไม่พอ/เต็ม → ไม่ย้ายอะไรเลย (ย้อนกลับอัตโนมัติ) · โต๊ะยังเปิด ให้แก้ของแล้วยืนยันใหม่ · ระงับบัญชี = ปิดโต๊ะ
    if sqlerrm = 'trade_locked' then
      update trades set status = 'cancel', note = 'trade_locked', a_ok = false, b_ok = false, updated_at = now() where id = p_id returning * into t;
    else
      update trades set note = left(sqlerrm, 80), a_ok = false, b_ok = false, ver = ver + 1, updated_at = now() where id = p_id returning * into t;
    end if;
  end;
  return public._trade_json(t, p_slot);
end $$;

