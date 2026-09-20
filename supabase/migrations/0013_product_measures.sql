-- Medidas do produto (opcionais): largura e altura em cm, peso em kg.
alter table public.products
  add column width_cm numeric(8, 2) check (width_cm is null or width_cm > 0),
  add column height_cm numeric(8, 2) check (height_cm is null or height_cm > 0),
  add column weight_kg numeric(8, 3) check (weight_kg is null or weight_kg > 0);
