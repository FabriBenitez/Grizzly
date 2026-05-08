insert into public.categories (name, slug, description)
values
  ('Combos', 'combos', 'Packs armados para objetivos especificos.'),
  ('Creatina', 'creatina', 'Linea de creatinas y monohidrato.'),
  ('Proteina', 'proteina', 'Proteinas whey y blends.'),
  ('Vitaminas', 'vitaminas', 'Micronutrientes y soporte general.'),
  ('Accesorios', 'accesorios', 'Complementos y accesorios deportivos.')
on conflict (slug) do nothing;

insert into public.brands (name, slug)
values
  ('Grizzly Labs', 'grizzly-labs'),
  ('Star Nutrition', 'star-nutrition'),
  ('One Fit', 'one-fit')
on conflict (slug) do nothing;
