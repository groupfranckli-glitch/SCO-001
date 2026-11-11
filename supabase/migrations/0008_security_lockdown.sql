-- Verrouillage : toutes les écritures passent par le serveur (service role).
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
revoke select on public.audit_log, public.orders, public.order_items, public.payments, public.deliveries,
                 public.stock_movements, public.profiles, public.promo_codes from anon;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists deliveries_courier_update on public.deliveries;
drop policy if exists deliveries_admin_insert on public.deliveries;
drop policy if exists orders_admin_update on public.orders;
