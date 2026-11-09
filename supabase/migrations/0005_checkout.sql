-- Lot 3 : commande en une page — zones de livraison, codes promo, création de commande atomique.

-- ---------- Zones de livraison (frais modifiables par l'admin) ----------
create table if not exists public.delivery_zones (
  commune text primary key,
  fee_fcfa int not null check (fee_fcfa >= 0),
  is_active boolean not null default true,
  position int not null default 0
);

insert into public.delivery_zones (commune, fee_fcfa, position) values
  ('Cocody', 1000, 1), ('Plateau', 1000, 2), ('Marcory', 1000, 3), ('Treichville', 1000, 4),
  ('Koumassi', 1000, 5), ('Yopougon', 1000, 6), ('Abobo', 1000, 7), ('Adjamé', 1000, 8),
  ('Attécoubé', 1000, 9), ('Port-Bouët', 1000, 10), ('Bingerville', 1000, 11), ('Songon', 1000, 12)
on conflict (commune) do nothing;

alter table public.delivery_zones enable row level security;
drop policy if exists zones_read on public.delivery_zones;
drop policy if exists zones_admin on public.delivery_zones;
create policy zones_read on public.delivery_zones for select using (is_active or public.is_admin());
create policy zones_admin on public.delivery_zones for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Codes promo (jamais lisibles côté public : pas d'énumération) ----------
create table if not exists public.promo_codes (
  code text primary key check (code = upper(code) and length(code) between 3 and 30),
  kind text not null check (kind in ('percent', 'fixed')),
  value int not null check (value > 0),
  min_subtotal_fcfa int not null default 0 check (min_subtotal_fcfa >= 0),
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint percent_le_100 check (kind <> 'percent' or value <= 100)
);
alter table public.promo_codes enable row level security;
drop policy if exists promo_admin on public.promo_codes;
create policy promo_admin on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Colonnes de commande ----------
alter table public.orders
  add column if not exists delivery_quartier text,
  add column if not exists delivery_landmark text,
  add column if not exists discount_fcfa int not null default 0 check (discount_fcfa >= 0),
  add column if not exists promo_code text;

-- ---------- Création de commande : une seule transaction, prix et frais lus en base ----------
create or replace function public.create_order(
  p_customer uuid, p_key text, p_lines jsonb, p_name text, p_phone text,
  p_commune text, p_quartier text, p_address text, p_landmark text, p_notes text,
  p_provider public.payment_provider, p_promo text
) returns table (r_order_id uuid, r_order_number text, r_total int, r_replayed boolean)
language plpgsql security definer set search_path = public as $$
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
  -- Idempotence : un double clic ou un rejeu renvoie la même commande
  select * into v_existing from public.orders o where o.customer_id = p_customer and o.idempotency_key = p_key;
  if found then
    return query select v_existing.id, v_existing.order_number, v_existing.total_fcfa, true;
    return;
  end if;

  -- Anti-spam : 5 commandes maximum par client sur 10 minutes
  if (select count(*) from public.orders o where o.customer_id = p_customer and o.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'rate_limited';
  end if;

  select z.fee_fcfa into v_fee from public.delivery_zones z where z.commune = p_commune and z.is_active;
  if not found then raise exception 'zone_unavailable'; end if;

  -- 1re passe : validation et sous-total depuis les prix en base (jamais ceux du navigateur)
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

  -- 2e passe : lignes et réservation atomique du stock (échec => tout est annulé)
  for r in
    select (e->>'variant_id')::uuid as vid, sum((e->>'quantity')::int)::int as qty
    from jsonb_array_elements(p_lines) e group by 1 order by 1
  loop
    insert into public.order_items (order_id, variant_id, product_name, variant_label, unit_price_fcfa, quantity)
    select v_order, v.id, p.name, coalesce(v.color, v.flavor), v.price_fcfa, r.qty
      from public.product_variants v join public.products p on p.id = v.product_id where v.id = r.vid;
    perform public.reserve_stock(r.vid, r.qty, v_order);
  end loop;

  -- Paiement à la livraison : « à encaisser » (pending). Les autres moyens restent « initiated » jusqu'à vérification serveur.
  insert into public.payments (order_id, provider, status, amount_fcfa)
  values (v_order, p_provider, case p_provider when 'cash_on_delivery' then 'pending'::public.payment_status else 'initiated'::public.payment_status end, v_total);

  insert into public.deliveries (order_id) values (v_order);

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (p_customer, 'order.created', 'order', v_order::text,
          jsonb_build_object('number', v_number, 'total', v_total, 'provider', p_provider, 'promo', v_code));

  return query select v_order, v_number, v_total, false;
end $$;

revoke execute on function public.create_order(uuid, text, jsonb, text, text, text, text, text, text, text, public.payment_provider, text) from public, anon, authenticated;
