-- Bucket public en lecture ; AUCUNE politique d'écriture : seul le serveur (service role) peut téléverser.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 4194304, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 4194304,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

alter table public.product_images
  add column if not exists variant_id uuid references public.product_variants(id) on delete cascade,
  add column if not exists bg text not null default '#ffffff',
  add column if not exists fit text not null default 'contain';
alter table public.product_images drop constraint if exists product_images_bg_check;
alter table public.product_images add constraint product_images_bg_check check (bg ~ '^#[0-9a-fA-F]{6}$');
alter table public.product_images drop constraint if exists product_images_fit_check;
alter table public.product_images add constraint product_images_fit_check check (fit in ('contain','cover'));
create unique index if not exists product_images_target_uq
  on public.product_images (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  alt text check (alt is null or char_length(alt) <= 160),
  image_path text not null,
  href text check (href is null or href ~ '^(/|https://)'),
  placement text not null check (placement in ('home','boutique')),
  position integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;
drop policy if exists banners_read on public.banners;
create policy banners_read on public.banners for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
drop policy if exists banners_admin_read on public.banners;
create policy banners_admin_read on public.banners for select to authenticated using ((select public.is_admin()));
revoke all on public.banners from anon, authenticated;
grant select on public.banners to anon, authenticated;
