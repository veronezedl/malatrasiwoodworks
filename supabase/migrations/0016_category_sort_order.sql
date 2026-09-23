-- Ordem manual das categorias (destaques da home e catálogo completo:
-- filtros e agrupamento de produtos). Categoria nova entra no fim (100000)
-- até o admin reordená-la.
alter table public.categories add column sort_order integer not null default 100000;

-- Ordem inicial estável para as categorias já cadastradas (alfabética, igual
-- ao comportamento de hoje) até o admin reordenar manualmente.
with ranked as (
  select id, row_number() over (order by name asc) - 1 as rn
  from public.categories
)
update public.categories c set sort_order = ranked.rn
from ranked where ranked.id = c.id;
