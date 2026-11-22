-- Une page par univers : Kit NexPOD, Batteries, Recharges, NexBAR. La page « Kits » séparée disparaît (le kit est la page NexPOD).
insert into public.categories (slug, name, position, is_active) values
  ('batteries', 'Batteries NexPOD', 2, true),
  ('recharges', 'Recharges NexPOD', 3, true)
on conflict (slug) do update set name = excluded.name, position = excluded.position, is_active = true;

update public.categories set name = 'Kit NexPOD', position = 1 where slug = 'nexpod';
update public.categories set position = 4 where slug = 'nexbar';

update public.products set category_id = (select id from public.categories where slug = 'batteries'), name = 'Batterie NexPOD' where kind = 'nexpod_battery';
update public.products set category_id = (select id from public.categories where slug = 'recharges'), name = 'Recharges NexPOD' where kind = 'nexpod_refill';
update public.products set name = 'Kit NexPOD' where kind = 'nexpod_kit';
