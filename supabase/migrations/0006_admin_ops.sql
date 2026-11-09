-- Lot 4 : opérations d'administration atomiques (service role uniquement).

create or replace function public.admin_set_order_status(p_order uuid, p_status public.order_status, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  it record;
  v_cod boolean;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.status in ('delivered', 'cancelled') then raise exception 'order_closed'; end if;

  if not (
       (o.status = 'pending'          and p_status in ('confirmed', 'cancelled'))
    or (o.status = 'confirmed'        and p_status in ('preparing', 'cancelled'))
    or (o.status = 'preparing'        and p_status in ('out_for_delivery', 'cancelled'))
    or (o.status = 'out_for_delivery' and p_status in ('delivered', 'cancelled'))
  ) then raise exception 'invalid_transition'; end if;

  if p_status = 'cancelled' then
    for it in select variant_id, quantity from public.order_items where order_id = p_order order by variant_id loop
      perform public.release_stock(it.variant_id, it.quantity, p_order);
    end loop;
    update public.payments set status = 'cancelled' where order_id = p_order and status in ('initiated', 'pending');
  elsif p_status = 'delivered' then
    -- Un paiement Wave / Orange Money doit être vérifié (paid) avant la remise ; le paiement à la livraison est encaissé ici.
    if exists (select 1 from public.payments where order_id = p_order and provider <> 'cash_on_delivery' and status <> 'paid') then
      raise exception 'payment_required';
    end if;
    for it in select variant_id, quantity from public.order_items where order_id = p_order order by variant_id loop
      update public.product_variants
         set stock_on_hand = stock_on_hand - it.quantity, stock_reserved = stock_reserved - it.quantity
       where id = it.variant_id;
      insert into public.stock_movements (variant_id, movement_type, quantity, order_id, created_by)
      values (it.variant_id, 'sale', it.quantity, p_order, p_actor);
    end loop;
    select exists (select 1 from public.payments where order_id = p_order and provider = 'cash_on_delivery') into v_cod;
    update public.payments set status = 'paid', verified_at = now()
     where order_id = p_order and provider = 'cash_on_delivery' and status = 'pending';
    update public.deliveries
       set status = 'delivered', delivered_at = now(), cash_collected_fcfa = case when v_cod then o.total_fcfa end
     where order_id = p_order;
  end if;

  update public.orders set status = p_status where id = p_order;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_actor, 'order.status', 'order', p_order::text, jsonb_build_object('from', o.status, 'to', p_status));
end $$;

create or replace function public.admin_adjust_stock(p_variant uuid, p_delta int, p_note text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_delta = 0 or abs(p_delta) > 100000 then raise exception 'invalid_delta'; end if;
  update public.product_variants set stock_on_hand = stock_on_hand + p_delta where id = p_variant;
  if not found then raise exception 'variant_not_found'; end if;
  insert into public.stock_movements (variant_id, movement_type, quantity, note, created_by)
  values (p_variant, case when p_delta > 0 then 'restock' else 'adjustment' end::public.stock_movement_type, p_delta, nullif(trim(p_note), ''), p_actor);
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_actor, 'stock.adjust', 'variant', p_variant::text, jsonb_build_object('delta', p_delta, 'note', p_note));
end $$;

revoke execute on function public.admin_set_order_status(uuid, public.order_status, uuid) from public, anon, authenticated;
revoke execute on function public.admin_adjust_stock(uuid, int, text, uuid) from public, anon, authenticated;
