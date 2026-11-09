-- Reconnecte la fidélité (conservée de la v1) au nouveau modèle de commandes.
-- Sans effet si les tables de fidélité n'existent pas (ex. base de test locale).

do $$
begin
  if to_regclass('public.loyalty_ledger') is null or to_regclass('public.app_settings') is null then
    raise notice 'fidélité absente : rien à reconnecter';
    return;
  end if;

  -- Lien ledger -> commande (supprimé avec l'ancienne table orders)
  if not exists (select 1 from pg_constraint where conname = 'loyalty_ledger_order_id_fkey') then
    alter table public.loyalty_ledger
      add constraint loyalty_ledger_order_id_fkey foreign key (order_id) references public.orders(id);
  end if;

  -- Points attribués à la livraison, annulés si le statut quitte 'delivered'
  create or replace function public.orders_loyalty() returns trigger
  language plpgsql security definer set search_path = '' as $f$
  declare pts integer; net integer;
  begin
    select coalesce(sum(points), 0) into net from public.loyalty_ledger
      where order_id = new.id and kind in ('earn', 'reversal');
    if new.status = 'delivered' and old.status is distinct from 'delivered' then
      select coalesce((value #>> '{}')::integer, 0) into pts from public.app_settings where key = 'points_per_order';
      if net = 0 and coalesce(pts, 0) > 0 then
        insert into public.loyalty_ledger (user_id, points, kind, order_id, note)
        values (new.customer_id, pts, 'earn', new.id, 'Commande n°' || new.order_number || ' livrée');
      end if;
    elsif old.status = 'delivered' and new.status is distinct from 'delivered' and net > 0 then
      insert into public.loyalty_ledger (user_id, points, kind, order_id, note)
      values (new.customer_id, -net, 'reversal', new.id, 'Commande n°' || new.order_number || ' : statut modifié');
    end if;
    return new;
  end $f$;

  drop trigger if exists orders_loyalty_trg on public.orders;
  create trigger orders_loyalty_trg after update of status on public.orders
    for each row execute function public.orders_loyalty();

  -- Liste clients pour l'administration (recréée sur le nouveau modèle)
  create or replace function public.admin_customers()
  returns table (user_id uuid, email text, full_name text, phone text, balance integer, orders_count bigint, created_at timestamptz)
  language plpgsql stable security definer set search_path = '' as $f$
  begin
    if not public.is_admin() then raise exception 'forbidden'; end if;
    return query
      select p.id, u.email::text, p.full_name, p.phone,
             coalesce((select sum(l.points) from public.loyalty_ledger l where l.user_id = p.id), 0)::integer,
             (select count(*) from public.orders o where o.customer_id = p.id),
             p.created_at
      from public.profiles p join auth.users u on u.id = p.id
      order by p.created_at desc;
  end $f$;

  revoke execute on function public.orders_loyalty() from public, anon, authenticated;
  revoke execute on function public.admin_customers() from public, anon;
end $$;
