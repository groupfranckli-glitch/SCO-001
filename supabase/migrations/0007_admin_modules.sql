-- Lot 5 : livreurs, rôles, remise par le livreur. Fonctions réservées au serveur (service role).

-- Un livreur doit être attribué avant la remise de la commande.
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

  if p_status = 'out_for_delivery'
     and not exists (select 1 from public.deliveries where order_id = p_order and courier_id is not null) then
    raise exception 'courier_required';
  end if;

  if p_status = 'cancelled' then
    for it in select variant_id, quantity from public.order_items where order_id = p_order order by variant_id loop
      perform public.release_stock(it.variant_id, it.quantity, p_order);
    end loop;
    update public.payments set status = 'cancelled' where order_id = p_order and status in ('initiated', 'pending');
  elsif p_status = 'out_for_delivery' then
    update public.deliveries set status = 'picked_up' where order_id = p_order and status = 'assigned';
  elsif p_status = 'delivered' then
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

create or replace function public.admin_assign_courier(p_order uuid, p_courier uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_courier is not null and not exists (select 1 from public.profiles where id = p_courier and role = 'courier') then
    raise exception 'not_a_courier';
  end if;
  update public.deliveries
     set courier_id = p_courier,
         status = case when p_courier is null then 'unassigned'::public.delivery_status else 'assigned'::public.delivery_status end,
         assigned_at = case when p_courier is null then null else now() end
   where order_id = p_order and status in ('unassigned', 'assigned');
  if not found then raise exception 'delivery_locked'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_actor, 'delivery.assign', 'order', p_order::text, jsonb_build_object('courier', p_courier));
end $$;

-- Remise par le livreur : seulement sa propre livraison, en cours, et montant exact pour le paiement en espèces.
create or replace function public.courier_deliver(p_order uuid, p_courier uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_courier and role in ('courier', 'admin')) then
    raise exception 'not_a_courier';
  end if;
  if not exists (select 1 from public.deliveries where order_id = p_order and courier_id = p_courier) then
    raise exception 'not_your_delivery';
  end if;
  select * into o from public.orders where id = p_order;
  if o.status <> 'out_for_delivery' then raise exception 'order_not_ready'; end if;
  if exists (select 1 from public.payments where order_id = p_order and provider = 'cash_on_delivery')
     and p_amount is distinct from o.total_fcfa then
    raise exception 'amount_mismatch';
  end if;
  perform public.admin_set_order_status(p_order, 'delivered', p_courier);
end $$;

create or replace function public.admin_set_role(p_email text, p_role public.app_role, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if not found then raise exception 'user_not_found'; end if;
  if v_id = p_actor and p_role <> 'admin' then raise exception 'cannot_demote_self'; end if;
  update public.profiles set role = p_role where id = v_id;
  if not found then raise exception 'user_not_found'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_actor, 'team.role', 'profile', v_id::text, jsonb_build_object('role', p_role));
end $$;

revoke execute on function public.admin_set_order_status(uuid, public.order_status, uuid) from public, anon, authenticated;
revoke execute on function public.admin_assign_courier(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.courier_deliver(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.admin_set_role(text, public.app_role, uuid) from public, anon, authenticated;

-- Réglages de la page d'accueil (modifiables depuis l'admin)
insert into public.site_settings (key, value) values
  ('home_title', '"Une sélection de puffs pour des pauses qui vous ressemblent"'),
  ('home_text', '"NexPOD et NexBAR : des produits d''origine, un choix clair, livrés chez vous. Réservé aux adultes."'),
  ('home_cta', '"Découvrir la boutique"')
on conflict (key) do nothing;
