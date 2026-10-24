-- v0.94 ไอเทมชนิดเดียวกันมีได้หลายกอง (กองละไม่เกิน 999) — ให้การแลก/ตลาดบนเซิร์ฟเวอร์รองรับ
-- เดิม: รวมเป็นกองเดียว และเกิน 999 = error 'stack_full'
-- ใหม่: รวมยอดแล้วแบ่งเป็นกองละ 999 วางที่ตำแหน่งกองแรก · รวมทั้งหมดไม่เกิน 99,999 ชิ้นต่อชนิด
-- รันซ้ำได้
create or replace function public._inv_add(inv jsonb, p_id text, p_qty bigint)
returns jsonb language plpgsql immutable set search_path = public as $$
declare have bigint; total bigint; out jsonb := '[]'::jsonb; e jsonb; done boolean := false; n bigint;
begin
  if jsonb_typeof(inv) is distinct from 'array' then inv := '[]'::jsonb; end if;
  have := public._inv_count(inv, p_id);
  total := have + p_qty;
  if total < 0 then raise exception 'not_enough:%', p_id; end if;
  if total > 99999 then raise exception 'stack_full:%', p_id; end if;
  for e in select * from jsonb_array_elements(inv) loop
    if e->>0 = p_id then
      if not done then
        n := total;
        while n > 0 loop out := out || jsonb_build_array(jsonb_build_array(p_id, least(n, 999))); n := n - least(n, 999); end loop;
      end if;
      done := true;
    else out := out || jsonb_build_array(e); end if;
  end loop;
  if not done then
    n := total;
    while n > 0 loop out := out || jsonb_build_array(jsonb_build_array(p_id, least(n, 999))); n := n - least(n, 999); end loop;
  end if;
  return out;
end $$;
