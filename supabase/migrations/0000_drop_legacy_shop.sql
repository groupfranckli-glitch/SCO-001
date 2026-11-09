-- Remplacement de l'ancienne boutique SCO PUFF (toutes les tables étaient vides : 0 ligne).
-- CONSERVÉ : loyalty_ledger, rewards, reward_redemptions, app_settings, bucket de stockage product-images.
-- SUPPRIMÉ : tables boutique de la v1 + fonctions qui en dépendaient (recréées en 0003 / 0001).
-- Idempotent : sans effet sur une base qui n'a pas l'ancien schéma.

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.admin_customers();
drop function if exists public.orders_loyalty() cascade;
drop function if exists public.orders_before_update() cascade;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.product_colors cascade;
drop table if exists public.product_flavors cascade;
drop table if exists public.products cascade;
drop table if exists public.customers cascade;
drop table if exists public.admins cascade;
drop table if exists public.profiles cascade;
