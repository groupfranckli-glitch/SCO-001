-- Destinataires internes (patron, admin) et file d'envoi des messages (WhatsApp, e-mail).
create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 60),
  role text not null check (role in ('ceo','admin')),
  phone text not null check (phone ~ '^[0-9+ ().-]{8,20}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.outbox (
  id bigint generated always as identity primary key,
  channel text not null check (channel in ('whatsapp','email')),
  recipient text not null,
  recipient_label text,
  template text not null check (template in ('order_created','delivery_assigned','out_for_delivery','order_delivered','order_cancelled','receipt')),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (order_id, template, channel, recipient)
);
create index if not exists outbox_status_idx on public.outbox (status, created_at);

alter table public.notification_recipients enable row level security;
alter table public.outbox enable row level security;
drop policy if exists recipients_admin_read on public.notification_recipients;
create policy recipients_admin_read on public.notification_recipients for select to authenticated using ((select public.is_admin()));
drop policy if exists outbox_admin_read on public.outbox;
create policy outbox_admin_read on public.outbox for select to authenticated using ((select public.is_admin()));
revoke all on public.notification_recipients, public.outbox from anon, authenticated;
grant select on public.notification_recipients, public.outbox to authenticated;

-- Mise en file (idempotente grâce à la contrainte unique).
create or replace function public.enqueue_outbox(p_channel text, p_recipient text, p_label text, p_template text, p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null or btrim(p_recipient) = '' then return; end if;
  insert into public.outbox (channel, recipient, recipient_label, template, order_id)
  values (p_channel, btrim(p_recipient), p_label, p_template, p_order)
  on conflict do nothing;
end $$;

create or replace function public.enqueue_staff(p_template text, p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select label, phone from public.notification_recipients where is_active loop
    perform public.enqueue_outbox('whatsapp', r.phone, r.label, p_template, p_order);
  end loop;
end $$;

create or replace function public.trg_orders_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_staff('order_created', new.id);
  return new;
end $$;

create or replace function public.trg_orders_status() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare c record; mail text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'cancelled' then
    perform public.enqueue_staff('order_cancelled', new.id);
  elsif new.status = 'out_for_delivery' then
    select p.full_name, p.phone into c from public.deliveries d join public.profiles p on p.id = d.courier_id where d.order_id = new.id;
    if found then perform public.enqueue_outbox('whatsapp', c.phone, c.full_name, 'out_for_delivery', new.id); end if;
  elsif new.status = 'delivered' then
    perform public.enqueue_staff('order_delivered', new.id);
    select u.email into mail from auth.users u where u.id = new.customer_id;
    perform public.enqueue_outbox('email', mail, new.delivery_name, 'receipt', new.id);
  end if;
  return new;
end $$;

create or replace function public.trg_deliveries_assign() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if new.courier_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.courier_id is not distinct from new.courier_id then return new; end if;
  select full_name, phone into c from public.profiles where id = new.courier_id;
  if found then perform public.enqueue_outbox('whatsapp', c.phone, c.full_name, 'delivery_assigned', new.order_id); end if;
  return new;
end $$;

drop trigger if exists orders_notify_insert on public.orders;
create trigger orders_notify_insert after insert on public.orders for each row execute function public.trg_orders_insert();
drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status after update of status on public.orders for each row execute function public.trg_orders_status();
drop trigger if exists deliveries_notify_assign on public.deliveries;
create trigger deliveries_notify_assign after insert or update of courier_id on public.deliveries for each row execute function public.trg_deliveries_assign();

revoke execute on function public.enqueue_outbox(text,text,text,text,uuid), public.enqueue_staff(text,uuid),
  public.trg_orders_insert(), public.trg_orders_status(), public.trg_deliveries_assign() from public, anon, authenticated;
