-- Ordem manual dos produtos dentro de cada categoria (usada na vitrine de
-- destaques da home e no catálogo completo). Produtos novos entram no fim
-- (100000) até o admin reordená-los na tela "Ordenar Produtos".
alter table public.products add column sort_order integer not null default 100000;

-- Dá aos produtos já cadastrados uma ordem inicial estável (por categoria,
-- na ordem em que foram criados) em vez de deixar todos empatados em 0.
with ranked as (
  select id, row_number() over (partition by category_id order by created_at asc) - 1 as rn
  from public.products
)
update public.products p set sort_order = ranked.rn
from ranked where ranked.id = p.id;
