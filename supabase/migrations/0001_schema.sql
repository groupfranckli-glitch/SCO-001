-- SCO PUFF — schéma initial (lot 1)
-- Rôles : customer, admin, courier. Montants en FCFA (entiers, pas de décimales).

-- ---------- Types ----------
create type public.app_role as enum ('customer', 'admin', 'courier');
create type public.order_status as enum ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
create type public.payment_provider as enum ('orange_money', 'wave', 'cash_on_delivery');
create type public.payment_status as enum ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.delivery_status as enum ('unassigned', 'assigned', 'picked_up', 'delivered', 'failed');
create type public.stock_movement_type as enum ('restock', 'reserve', 'release', 'sale', 'adjustment', 'return');

-- ---------- Profils ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  full_name text,
  phone text,
  birth_date date,
  age_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.current_role_name() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_courier() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'courier' from public.profiles where id = auth.uid()), false)
$$;

-- Création automatique du profil à l'inscription (toujours 'customer' : aucune élévation côté client)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, 'customer', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Empêche un utilisateur de modifier son propre rôle
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() est nul pour le service role / l'éditeur SQL : c'est ainsi qu'on nomme le premier admin.
  -- Tout utilisateur connecté non-admin est bloqué.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'role change not allowed';
  end if;
  return new;
end $$;

create trigger profiles_protect_role before update on public.profiles
for each row execute function public.protect_profile_role();

-- ---------- Catalogue ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  position int not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('nexpod_battery', 'nexpod_refill', 'nexpod_kit', 'nexbar')),
  description text,
  puffs int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt text,
  position int not null default 0
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  color text,
  flavor text,
  price_fcfa int not null check (price_fcfa >= 0),
  stock_on_hand int not null default 0 check (stock_on_hand >= 0),
  stock_reserved int not null default 0 check (stock_reserved >= 0),
  is_active boolean not null default true,
  constraint reserved_le_on_hand check (stock_reserved <= stock_on_hand)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id),
  movement_type public.stock_movement_type not null,
  quantity int not null,
  order_id uuid,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Commandes ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))),
  customer_id uuid not null references auth.users(id),
  idempotency_key text not null,
  status public.order_status not null default 'pending',
  subtotal_fcfa int not null check (subtotal_fcfa >= 0),
  delivery_fee_fcfa int not null default 0 check (delivery_fee_fcfa >= 0),
  total_fcfa int not null check (total_fcfa >= 0),
  delivery_name text not null,
  delivery_phone text not null,
  delivery_commune text not null,
  delivery_address text not null,
  delivery_notes text,
  age_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (customer_id, idempotency_key)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  variant_label text,
  unit_price_fcfa int not null,
  quantity int not null check (quantity > 0 and quantity <= 20)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_provider not null,
  status public.payment_status not null default 'initiated',
  amount_fcfa int not null,
  provider_reference text,
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now()
);
create unique index payments_provider_ref_uq on public.payments (provider, provider_reference) where provider_reference is not null;

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  courier_id uuid references auth.users(id),
  status public.delivery_status not null default 'unassigned',
  assigned_at timestamptz,
  delivered_at timestamptz,
  cash_collected_fcfa int
);

-- ---------- Contenu & paramètres ----------
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.home_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null,
  title text,
  body text,
  image_path text,
  cta_label text,
  cta_href text,
  position int not null default 0,
  is_active boolean not null default true
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Réservation atomique du stock ----------
create or replace function public.reserve_stock(p_variant uuid, p_qty int, p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare updated int;
begin
  update public.product_variants
     set stock_reserved = stock_reserved + p_qty
   where id = p_variant and is_active
     and stock_on_hand - stock_reserved >= p_qty;
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;
  insert into public.stock_movements (variant_id, movement_type, quantity, order_id)
  values (p_variant, 'reserve', p_qty, p_order);
end $$;

create or replace function public.release_stock(p_variant uuid, p_qty int, p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.product_variants
     set stock_reserved = greatest(stock_reserved - p_qty, 0)
   where id = p_variant;
  insert into public.stock_movements (variant_id, movement_type, quantity, order_id)
  values (p_variant, 'release', p_qty, p_order);
end $$;

-- Ces fonctions ne doivent être appelées que par le serveur (service role)
revoke execute on function public.reserve_stock(uuid, int, uuid) from public, anon, authenticated;
revoke execute on function public.release_stock(uuid, int, uuid) from public, anon, authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;
alter table public.site_settings enable row level security;
alter table public.home_sections enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- catalogue : lecture publique des éléments actifs, écriture admin
create policy categories_read on public.categories for select using (is_active or public.is_admin());
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy products_read on public.products for select using (is_active or public.is_admin());
create policy products_admin on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy images_read on public.product_images for select using (true);
create policy images_admin on public.product_images for all using (public.is_admin()) with check (public.is_admin());
create policy variants_read on public.product_variants for select using (is_active or public.is_admin());
create policy variants_admin on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

-- stock : admin uniquement
create policy movements_admin on public.stock_movements for select using (public.is_admin());

-- commandes : le client voit les siennes ; l'écriture passe par le serveur (service role)
create policy orders_owner_read on public.orders for select using (customer_id = auth.uid() or public.is_admin());
create policy orders_courier_read on public.orders for select using (
  public.is_courier() and exists (select 1 from public.deliveries d where d.order_id = orders.id and d.courier_id = auth.uid())
);
create policy orders_admin_update on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy items_read on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()
    or (public.is_courier() and exists (select 1 from public.deliveries d where d.order_id = o.id and d.courier_id = auth.uid()))))
);
create policy payments_read on public.payments for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);

-- livraisons
create policy deliveries_courier_read on public.deliveries for select using (courier_id = auth.uid() or public.is_admin());
create policy deliveries_courier_update on public.deliveries for update using (courier_id = auth.uid() or public.is_admin())
  with check (courier_id = auth.uid() or public.is_admin());
create policy deliveries_admin_insert on public.deliveries for insert with check (public.is_admin());

-- contenu
create policy settings_read on public.site_settings for select using (true);
create policy settings_admin on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
create policy home_read on public.home_sections for select using (is_active or public.is_admin());
create policy home_admin on public.home_sections for all using (public.is_admin()) with check (public.is_admin());

-- audit : lecture admin uniquement, écriture serveur (service role)
create policy audit_admin_read on public.audit_log for select using (public.is_admin());

-- ---------- Données initiales (catalogue) ----------
insert into public.categories (slug, name, position) values
  ('nexpod', 'NexPOD', 1),
  ('nexbar', 'NexBAR', 2);

insert into public.products (category_id, slug, name, kind, description, puffs)
select c.id, p.slug, p.name, p.kind, p.description, p.puffs
from public.categories c
join (values
  ('nexpod', 'nexpod-batterie', 'NexPOD — Batterie', 'nexpod_battery', 'Batterie rechargeable NexPOD.', null),
  ('nexpod', 'nexpod-recharge', 'NexPOD — Recharge', 'nexpod_refill', 'Recharge (pod) NexPOD, saveur au choix.', null),
  ('nexpod', 'nexpod-kit', 'NexPOD — Kit', 'nexpod_kit', 'Kit complet NexPOD : batterie + recharge.', null),
  ('nexbar', 'nexbar-10k', 'NexBAR 10K', 'nexbar', 'Puff jetable 10 000 puffs, saveur au choix.', 10000)
) as p(cat, slug, name, kind, description, puffs) on p.cat = c.slug;

insert into public.site_settings (key, value) values
  ('delivery_fee_fcfa', '1000'),
  ('min_age', '18'),
  ('whatsapp_number', '""');
