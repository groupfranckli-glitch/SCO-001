-- Libellé complet (couleur · saveur) sur les lignes de commande + saveurs des recharges et du kit.
create or replace function public.create_order(p_customer uuid, p_key text, p_lines jsonb, p_name text, p_phone text, p_commune text, p_quartier text, p_address text, p_landmark text, p_notes text, p_provider payment_provider, p_promo text)
 returns table(r_order_id uuid, r_order_number text, r_total integer, r_replayed boolean)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_existing public.orders%rowtype;
  v_fee int;
  v_subtotal int := 0;
  v_discount int := 0;
  v_price int;
  v_order uuid;
  v_number text;
  v_total int;
  v_code text := nullif(upper(trim(coalesce(p_promo, ''))), '');
  v_promo public.promo_codes%rowtype;
  r record;
begin
  select * into v_existing from public.orders o where o.customer_id = p_customer and o.idempotency_key = p_key;
  if found then
    return query select v_existing.id, v_existing.order_number, v_existing.total_fcfa, true;
    return;
  end if;

  if (select count(*) from public.orders o where o.customer_id = p_customer and o.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited';
  end if;

  select z.fee_fcfa into v_fee from public.delivery_zones z where z.commune = p_commune and z.is_active;
  if not found then raise exception 'zone_unavailable'; end if;

  for r in
    select (e->>'variant_id')::uuid as vid, sum((e->>'quantity')::int)::int as qty
    from jsonb_array_elements(p_lines) e group by 1 order by 1
  loop
    if r.qty < 1 or r.qty > 20 then raise exception 'invalid_quantity'; end if;
    select v.price_fcfa into v_price
      from public.product_variants v join public.products p on p.id = v.product_id
     where v.id = r.vid and v.is_active and p.is_active;
    if not found then raise exception 'variant_unavailable'; end if;
    v_subtotal := v_subtotal + v_price * r.qty;
  end loop;
  if v_subtotal = 0 then raise exception 'empty_cart'; end if;

  if v_code is not null then
    select * into v_promo from public.promo_codes c where c.code = v_code for update;
    if not found or not v_promo.is_active
       or (v_promo.expires_at is not null and v_promo.expires_at < now())
       or (v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses)
       or v_subtotal < v_promo.min_subtotal_fcfa then
      raise exception 'promo_invalid';
    end if;
    v_discount := case v_promo.kind when 'percent' then (v_subtotal * v_promo.value) / 100 else least(v_promo.value, v_subtotal) end;
    update public.promo_codes set used_count = used_count + 1 where code = v_code;
  end if;

  v_total := v_subtotal - v_discount + v_fee;

  insert into public.orders (customer_id, idempotency_key, subtotal_fcfa, delivery_fee_fcfa, discount_fcfa, promo_code, total_fcfa,
                             delivery_name, delivery_phone, delivery_commune, delivery_quartier, delivery_address,
                             delivery_landmark, delivery_notes, age_confirmed)
  values (p_customer, p_key, v_subtotal, v_fee, v_discount, v_code, v_total,
          p_name, p_phone, p_commune, nullif(trim(p_quartier), ''), p_address,
          nullif(trim(p_landmark), ''), nullif(trim(p_notes), ''), true)
  returning id, order_number into v_order, v_number;

  for r in
    select (e->>'variant_id')::uuid as vid, sum((e->>'quantity')::int)::int as qty
    from jsonb_array_elements(p_lines) e group by 1 order by 1
  loop
    insert into public.order_items (order_id, variant_id, product_name, variant_label, unit_price_fcfa, quantity)
    select v_order, v.id, p.name, nullif(concat_ws(' · ', v.color, v.flavor), ''), v.price_fcfa, r.qty
      from public.product_variants v join public.products p on p.id = v.product_id where v.id = r.vid;
    perform public.reserve_stock(r.vid, r.qty, v_order);
  end loop;

  insert into public.payments (order_id, provider, status, amount_fcfa)
  values (v_order, p_provider, case p_provider when 'cash_on_delivery' then 'pending'::public.payment_status else 'initiated'::public.payment_status end, v_total);

  insert into public.deliveries (order_id) values (v_order);

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_customer, 'order.created', 'order', v_order::text,
          jsonb_build_object('number', v_number, 'total', v_total, 'provider', p_provider, 'promo', v_code));

  return query select v_order, v_number, v_total, false;
end $function$;

-- Les saveurs NexBAR deviennent aussi des recharges, et le kit se compose d'une couleur + d'une saveur.
with f(code, name) as (values
  ('BLUERASP','Blueberry Raspberry'),('DBLAPPLE','Double Apple'),('ENERGYICE','Energy Ice'),('GRAPAPPLE','Grape Apple'),
  ('PEACHICE','Peach Ice'),('STRKIWI','Strawberry Kiwi'),('WMELICE','Watermelon Ice'))
insert into public.product_variants (product_id, sku, flavor, price_fcfa, stock_on_hand)
select p.id, 'NP-REC-' || f.code, f.name, 6000, 0 from f, public.products p where p.slug = 'nexpod-recharge'
on conflict (sku) do nothing;

with c(code, name) as (values ('BLE','Bleu'),('NOI','Noir'),('ROU','Rouge'),('VIO','Violet')),
     f(code, name) as (values
  ('BLUERASP','Blueberry Raspberry'),('DBLAPPLE','Double Apple'),('ENERGYICE','Energy Ice'),('GRAPAPPLE','Grape Apple'),
  ('PEACHICE','Peach Ice'),('STRKIWI','Strawberry Kiwi'),('WMELICE','Watermelon Ice'))
insert into public.product_variants (product_id, sku, color, flavor, price_fcfa, stock_on_hand)
select p.id, 'NP-KIT-' || c.code || '-' || f.code, c.name, f.name, 11000, 0 from c, f, public.products p where p.slug = 'nexpod-kit'
on conflict (sku) do nothing;

-- Anciennes variantes du kit (couleur seule) : retirées de la boutique, historique conservé.
update public.product_variants set is_active = false
 where product_id = (select id from public.products where slug = 'nexpod-kit') and flavor is null;
