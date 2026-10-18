-- =====================================================================
-- Everlevel v0.50 — ตลาดแลกเพชร (เพชร ↔ Zeny ระหว่างผู้เล่น) + ลด Zeny รางวัลบอสโลก
-- รันหลัง setup.sql · trade.sql · cashshop.sql · vip.sql (รันซ้ำได้ ไม่เสียข้อมูล · ไม่มีคีย์ลับ)
-- วิธีใช้: Supabase → SQL Editor → New query → วางทั้งไฟล์ → Run
--
-- หลักการ
--   * ตั้งซื้อ (bid): กัน Zeny ไว้ในคำสั่ง (ราคา × จำนวน + ค่าธรรมเนียม) · ตั้งขาย (ask): กันเพชรไว้ในคำสั่ง
--   * จับคู่ทันทีที่ราคาตรงกัน ใช้ราคาของคำสั่งที่รออยู่ก่อน · เหลือก็ค้างไว้จนจับคู่หรือยกเลิก (คืนของที่กันไว้)
--   * ค่าธรรมเนียมคิดจาก Zeny ที่ซื้อขาย ทั้งผู้ซื้อและผู้ขายจ่ายฝั่งละ: VIP 3% · ทั่วไป 7% (แก้ได้ใน gx_config)
--   * ทุกฟังก์ชันล็อกตลาดทีละรายการ (advisory lock) กันจับคู่ซ้อน
-- =====================================================================

create table if not exists public.gx_config (k text primary key, v int not null);
insert into public.gx_config (k, v) values ('fee_pct', 7), ('vip_fee_pct', 3), ('max_orders', 10) on conflict (k) do nothing;
alter table public.gx_config enable row level security;
revoke all on public.gx_config from anon, authenticated;

create table if not exists public.gx_orders (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  slot       int  not null,
  name       text not null,
  side       text not null check (side in ('buy', 'sell')),
  price      bigint not null check (price between 1 and 99999999),   -- Zeny ต่อเพชร 1 เม็ด
  qty        int  not null check (qty between 1 and 100000),
  filled     int  not null default 0,
  escrow     bigint not null default 0,                               -- Zeny ที่ยังกันไว้ (ฝั่งซื้อ)
  fee_pct    int  not null,
  status     text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists gx_orders_book on public.gx_orders (side, status, price, id);
create index if not exists gx_orders_mine on public.gx_orders (user_id, status);
alter table public.gx_orders enable row level security;
revoke all on public.gx_orders from anon, authenticated;

create table if not exists public.gx_trades (
  id      bigint generated always as identity primary key,
  price   bigint not null,
  qty     int    not null,
  buy_id  bigint,
  sell_id bigint,
  at      timestamptz not null default now()
);
create index if not exists gx_trades_at on public.gx_trades (at);
alter table public.gx_trades enable row level security;
revoke all on public.gx_trades from anon, authenticated;

-- ค่าธรรมเนียมของผู้เล่นคนนี้ (%)
create or replace function public._gx_fee(p_user uuid)
returns int language sql stable set search_path = public as $$
  select v from gx_config where k = case when public._vip(p_user) then 'vip_fee_pct' else 'fee_pct' end;
$$;
create or replace function public._gx_fee_of(z bigint, pct int)
returns bigint language sql immutable as $$ select ceil(z * pct / 100.0)::bigint $$;

-- ---------- สถานะตลาด: กราฟราคา · ความลึกตลาด · คำสั่งของฉัน ----------
create or replace function public.gx_state(p_slot integer, p_range text default '24h')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); bid bigint; ask bigint; span interval; step interval; pts jsonb; dep jsonb; mine jsonb; avg24 bigint; vol24 bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select max(price) into bid from gx_orders where side = 'buy' and status = 'open';
  select min(price) into ask from gx_orders where side = 'sell' and status = 'open';
  span := case p_range when '7d' then interval '7 days' when '4w' then interval '28 days' else interval '24 hours' end;
  step := case p_range when '7d' then interval '6 hours' when '4w' then interval '1 day' else interval '1 hour' end;
  select coalesce(jsonb_agg(jsonb_build_array(extract(epoch from b)::bigint * 1000, p, q) order by b), '[]'::jsonb) into pts from (
    select to_timestamp(floor(extract(epoch from at) / extract(epoch from step)) * extract(epoch from step)) b,
           round(sum(price * qty)::numeric / sum(qty))::bigint p, sum(qty)::bigint q
    from gx_trades where at > now() - span group by 1) s;
  select round(sum(price * qty)::numeric / nullif(sum(qty), 0))::bigint, coalesce(sum(qty), 0) into avg24, vol24 from gx_trades where at > now() - interval '24 hours';
  select jsonb_build_object(
    'bid', (select coalesce(jsonb_agg(jsonb_build_array(p, (select coalesce(sum(qty - filled), 0) from gx_orders where side = 'buy' and status = 'open' and price >= floor(bid * (100 - p) / 100.0)))), '[]'::jsonb) from unnest(array[5, 10, 15]) p),
    'ask', (select coalesce(jsonb_agg(jsonb_build_array(p, (select coalesce(sum(qty - filled), 0) from gx_orders where side = 'sell' and status = 'open' and price <= ceil(ask * (100 + p) / 100.0)))), '[]'::jsonb) from unnest(array[5, 10, 15]) p)
  ) into dep;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'side', side, 'price', price, 'qty', qty, 'filled', filled, 'fee', fee_pct, 'at', created_at) order by id desc), '[]'::jsonb)
    into mine from gx_orders where user_id = uid and slot = p_slot and status = 'open';
  return jsonb_build_object('bid', bid, 'ask', ask, 'points', pts, 'depth', dep, 'mine', mine, 'avg', avg24, 'vol', vol24,
    'gems', (select gems from accounts where user_id = uid), 'fee', public._gx_fee(uid),
    'fees', (select jsonb_object_agg(k, v) from gx_config));
end $$;

-- ---------- ส่งคำสั่ง ----------
-- p_side 'buy' | 'sell' · p_mode 'now' (ซื้อ/ขายทันทีตามราคาตลาด ไม่ค้าง) | 'order' (ตั้งราคาเอง เหลือค้างไว้)
create or replace function public.gx_place(p_slot integer, p_side text, p_qty integer, p_price bigint default null, p_mode text default 'order')
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me characters%rowtype; lk text; fee int; left_q int; o gx_orders%rowtype; q int;
        z bigint; got_gems int := 0; spent bigint := 0; earned bigint := 0; maker_fee bigint; new_id bigint; nmine int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_side not in ('buy', 'sell') or p_mode not in ('now', 'order') then raise exception 'bad_order'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 100000 then raise exception 'bad_qty'; end if;
  if p_mode = 'order' and (p_price is null or p_price < 1 or p_price > 99999999) then raise exception 'bad_price'; end if;
  perform pg_advisory_xact_lock(424242);
  select * into me from characters where user_id = uid and slot = p_slot for update;
  if not found then raise exception 'no_character'; end if;
  select trade_lock into lk from accounts where user_id = uid for update;
  if lk is not null then raise exception 'trade_locked'; end if;
  fee := public._gx_fee(uid);
  left_q := p_qty;

  if p_side = 'buy' then
    -- กินคำสั่งขายที่ถูกที่สุดก่อน (ไม่จับคู่กับคำสั่งของบัญชีตัวเอง)
    for o in select * from gx_orders where side = 'sell' and status = 'open' and user_id <> uid
             and (p_mode = 'now' or price <= p_price) order by price, id for update loop
      exit when left_q <= 0;
      q := least(left_q, o.qty - o.filled);
      z := o.price * q;
      spent := spent + z + public._gx_fee_of(z, fee);
      got_gems := got_gems + q; left_q := left_q - q;
      update gx_orders set filled = filled + q, status = case when filled + q >= qty then 'filled' else status end where id = o.id;
      insert into gx_trades (price, qty, buy_id, sell_id) values (o.price, q, null, o.id);
      maker_fee := z - floor(z * o.fee_pct / 100.0)::bigint;
      begin perform public._apply(o.user_id, o.slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', maker_fee, 'note', format('ขายเพชร %s เม็ด ในตลาดแลกเพชร', q)));
      exception when others then null; end;
    end loop;
    if p_mode = 'now' and got_gems = 0 then raise exception 'no_liquidity'; end if;
    if p_mode = 'order' and left_q > 0 then
      select count(*) into nmine from gx_orders where user_id = uid and status = 'open';
      if nmine >= (select v from gx_config where k = 'max_orders') then raise exception 'too_many_orders'; end if;
      z := p_price * left_q + public._gx_fee_of(p_price * left_q, fee);
      spent := spent + z;
      insert into gx_orders (user_id, slot, name, side, price, qty, escrow, fee_pct) values (uid, p_slot, me.name, 'buy', p_price, left_q, z, fee) returning id into new_id;
    end if;
    if spent > 0 then perform public._apply(uid, p_slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', -spent, 'note', 'ซื้อเพชรในตลาดแลกเพชร')); end if;
    if got_gems > 0 then update accounts set gems = gems + got_gems where user_id = uid; end if;
  else
    -- ขาย: กันเพชรก่อน แล้วกินคำสั่งซื้อที่แพงที่สุด
    update accounts set gems = gems - p_qty where user_id = uid and gems >= p_qty;
    if not found then raise exception 'not_enough_gems'; end if;
    for o in select * from gx_orders where side = 'buy' and status = 'open' and user_id <> uid
             and (p_mode = 'now' or price >= p_price) order by price desc, id for update loop
      exit when left_q <= 0;
      q := least(left_q, o.qty - o.filled);
      z := o.price * q;
      earned := earned + z - floor(z * fee / 100.0)::bigint;
      left_q := left_q - q;
      maker_fee := least(o.escrow, z + public._gx_fee_of(z, o.fee_pct));
      update gx_orders set filled = filled + q, escrow = escrow - maker_fee, status = case when filled + q >= qty then 'filled' else status end where id = o.id returning * into o;
      insert into gx_trades (price, qty, buy_id, sell_id) values (o.price, q, o.id, null);
      update accounts set gems = gems + q where user_id = o.user_id;
      if o.status = 'filled' and o.escrow > 0 then   -- เศษค่าธรรมเนียมที่กันไว้เกิน คืนผู้ตั้งซื้อ
        begin perform public._apply(o.user_id, o.slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', o.escrow, 'note', 'คืน Zeny ส่วนเกินจากตลาดแลกเพชร'));
        exception when others then null; end;
        update gx_orders set escrow = 0 where id = o.id;
      end if;
    end loop;
    if p_mode = 'now' and left_q = p_qty then raise exception 'no_liquidity'; end if;
    if left_q > 0 then
      if p_mode = 'now' then
        update accounts set gems = gems + left_q where user_id = uid;   -- ขายทันทีไม่ครบ → คืนเพชรที่เหลือ
      else
        select count(*) into nmine from gx_orders where user_id = uid and status = 'open';
        if nmine >= (select v from gx_config where k = 'max_orders') then raise exception 'too_many_orders'; end if;
        insert into gx_orders (user_id, slot, name, side, price, qty, fee_pct) values (uid, p_slot, me.name, 'sell', p_price, left_q, fee) returning id into new_id;
      end if;
    end if;
    if earned > 0 then perform public._apply(uid, p_slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', earned, 'note', 'ขายเพชรในตลาดแลกเพชร')); end if;
  end if;
  return jsonb_build_object('ok', true, 'filled', p_qty - left_q, 'rest', case when p_mode = 'order' then left_q else 0 end, 'order', new_id,
    'spent', spent, 'earned', earned, 'gems', (select gems from accounts where user_id = uid),
    'rev', (select rev from characters where user_id = uid and slot = p_slot));
end $$;

-- ---------- ยกเลิกคำสั่ง (คืนของที่กันไว้) ----------
create or replace function public.gx_cancel(p_slot integer, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o gx_orders%rowtype;
begin
  perform pg_advisory_xact_lock(424242);
  select * into o from gx_orders where id = p_id and user_id = uid for update;
  if not found or o.status <> 'open' then raise exception 'no_order'; end if;
  update gx_orders set status = 'cancelled', escrow = 0 where id = o.id;
  if o.side = 'buy' then
    if o.escrow > 0 then perform public._apply(o.user_id, o.slot, jsonb_build_object('inv', '[]'::jsonb, 'zeny', o.escrow, 'note', 'ยกเลิกคำสั่งซื้อเพชร')); end if;
  else
    update accounts set gems = gems + (o.qty - o.filled) where user_id = uid;
  end if;
  return jsonb_build_object('ok', true, 'gems', (select gems from accounts where user_id = uid), 'rev', (select rev from characters where user_id = o.user_id and slot = o.slot));
end $$;

revoke all on function public._gx_fee(uuid) from public, anon, authenticated;
revoke all on function public._gx_fee_of(bigint, int) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['gx_state(integer,text)', 'gx_place(integer,text,integer,bigint,text)', 'gx_cancel(integer,bigint)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- v0.50 ลด Zeny รางวัลบอสโลกเหลือ 1/3 ----------
create or replace function public.world_boss_hit(p_id text,p_damage integer,p_slot integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare b world_boss_runs; p world_boss_participants; c record; v_damage integer; mail bigint; w record; items jsonb; z bigint;
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501';end if;
 if p_damage is null or p_damage<=0 then raise exception 'Invalid damage';end if;
 select * into c from characters where user_id=auth.uid() and slot=p_slot;
 if not found then raise exception 'Character not found' using errcode='42501';end if;
 perform public.event_tick();
 select * into b from world_boss_runs where id=p_id for update;
 if not found then raise exception 'Boss round not found';end if;
 if b.status<>'active' or b.ends_at<=now() then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 if c.lv<60 then raise exception 'World bosses require Base Lv.60';end if;
 insert into world_boss_participants(run_id,user_id,slot) values(p_id,auth.uid(),p_slot) on conflict do nothing;
 select * into p from world_boss_participants where run_id=p_id and user_id=auth.uid() for update;
 if p.last_hit>now()-interval '200 milliseconds' then return jsonb_build_object('hp',b.hp,'status',b.status,'damage',0);end if;
 v_damage:=least(p_damage,15000,b.hp);
 update world_boss_participants set damage=damage+v_damage,last_hit=now(),slot=p_slot where run_id=p_id and user_id=auth.uid();
 update world_boss_runs set hp=hp-v_damage,defeated_at=case when hp-v_damage<=0 then now() else null end,status=case when hp-v_damage<=0 then 'defeated' else 'active' end where id=p_id returning * into b;
 if b.status='defeated' then
  insert into event_notices(message) values('บอสโลก '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' ถูกกำจัดแล้ว! ผู้ร่วมต่อสู้รับรางวัลทางจดหมาย');
  -- v0.47 รางวัลพิเศษของแต่ละบอสโลก + โบนัสอันดับดาเมจ 1–3 + โอกาสลุ้นอาวุธ
  for w in select wp.user_id,ch.name,row_number() over (order by wp.damage desc) as rk
           from world_boss_participants wp join characters ch on ch.user_id=wp.user_id and ch.slot=wp.slot
           where wp.run_id=p_id and wp.damage>0 loop
   insert into world_boss_rewards(run_id,user_id) values(p_id,w.user_id) on conflict do nothing;
   if found then
    if b.type='world_nocthar' then
     items:='[["royal_jelly",8],["refine_w",4],["refine_a",4],["refine_guard",2],["dread_crown",1],["refine_luck",2]]'::jsonb; z:=27000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['bloodmoon_sword','bloodmoon_staff','bloodmoon_bow','bloodmoon_mace','bloodmoon_knife'])[1+floor(random()*5)::int],1)); end if;
    else
     items:='[["royal_jelly",5],["refine_w",3],["refine_a",3],["refine_guard",1],["guardian_core",1],["refine_luck",2]]'::jsonb; z:=17000;
     if random()<0.15 then items:=items||jsonb_build_array(jsonb_build_array((array['spectral_sword','spectral_staff','spectral_bow','spectral_mace','spectral_knife'])[1+floor(random()*5)::int],1)); end if;
    end if;
    if w.rk<=3 then items:=items||'[["refine_luck",1],["refine_guard",1]]'::jsonb; z:=z+(4-w.rk)*7000; end if;
    select jsonb_agg(jsonb_build_array(k,q)) into items from (select e->>0 k,sum((e->>1)::int) q from jsonb_array_elements(items) e group by 1) t;   -- รวมของชนิดเดียวกัน
    insert into mails(to_name,sender,title,body,items,zeny,per)
    values(w.name,'World Event',case when w.rk<=3 then 'รางวัลบอสโลก · ดาเมจอันดับ '||w.rk else 'รางวัลบอสโลก' end,
           'ขอบคุณที่ร่วมพิชิต '||(case b.type when 'world_aurex' then 'ออเร็กซ์ จอมทัพโลก' else 'น็อคธาร์ ราชันคราสโลก' end)||' · รอบ '||p_id||case when w.rk<=3 then ' · คุณทำดาเมจอันดับ '||w.rk||' ได้โบนัสเพิ่ม' else '' end,
           items,z,'account') returning id into mail;
    update world_boss_rewards set mail_id=mail where run_id=p_id and user_id=w.user_id;
   end if;
  end loop;
 end if;
 return jsonb_build_object('hp',b.hp,'status',b.status,'damage',v_damage,'defeated_at',b.defeated_at);
end $$;
revoke all on function public.world_boss_hit(text,integer,integer) from public,anon;
grant execute on function public.world_boss_hit(text,integer,integer) to authenticated;
