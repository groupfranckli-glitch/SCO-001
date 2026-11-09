-- Variantes initiales. Tous les stocks démarrent à 0 : rien n'est vendable
-- tant que l'administrateur n'a pas saisi un stock réel (mouvement 'restock').
-- Les saveurs ci-dessous proviennent des visuels fournis ; elles sont modifiables en admin.

insert into public.product_variants (product_id, sku, color, price_fcfa)
select p.id, 'NP-BAT-' || upper(c.code), c.name, 10000
from public.products p, (values ('NOI','Noir'),('BLE','Bleu'),('VIO','Violet'),('ROU','Rouge')) as c(code, name)
where p.kind = 'nexpod_battery';

insert into public.product_variants (product_id, sku, color, price_fcfa)
select p.id, 'NP-KIT-' || upper(c.code), c.name, 11000
from public.products p, (values ('NOI','Noir'),('BLE','Bleu'),('VIO','Violet'),('ROU','Rouge')) as c(code, name)
where p.kind = 'nexpod_kit';

insert into public.product_variants (product_id, sku, flavor, price_fcfa)
select p.id, 'NP-REC-' || upper(f.code), f.name, 6000
from public.products p, (values ('MINT','Mint'),('3MEL','Three Melons')) as f(code, name)
where p.kind = 'nexpod_refill';

insert into public.product_variants (product_id, sku, flavor, price_fcfa)
select p.id, 'NB-10K-' || upper(f.code), f.name, 10000
from public.products p, (values
  ('STRKIWI','Strawberry Kiwi'),('BLUERASP','Blueberry Raspberry'),('ENERGYICE','Energy Ice'),
  ('DBLAPPLE','Double Apple'),('WMELICE','Watermelon Ice'),('PEACHICE','Peach Ice'),('GRAPAPPLE','Grape Apple')
) as f(code, name)
where p.kind = 'nexbar';
