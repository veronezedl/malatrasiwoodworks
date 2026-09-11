-- Catálogo inicial ilustrativo — substitua pelos produtos reais em
-- /admin/produtos assim que a loja estiver no ar.
insert into public.products (slug, name, category, price, image_url, description, wood_type, is_custom_order, featured) values
('mesa-de-centro-freijo', 'Mesa de Centro Freijó', 'Mesas', 1290.00, 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200', 'Mesa de centro em madeira maciça de freijó, acabamento em óleo natural. Pés torneados à mão.', 'Freijó', false, true),
('tabua-de-corte-artesanal', 'Tábua de Corte Artesanal', 'Utilidades', 180.00, 'https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?w=1200', 'Tábua de corte em peça única, ideal para cozinha e servir. Acabamento atóxico.', 'Cumaru', false, false),
('banco-rustico-dois-lugares', 'Banco Rústico Dois Lugares', 'Bancos e Assentos', 890.00, 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=1200', 'Banco rústico em madeira maciça, estrutura reforçada. Ótimo para varanda ou entrada.', 'Pinus', false, false),
('luminaria-de-mesa-madeira', 'Luminária de Mesa em Madeira', 'Iluminação', 240.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1200', 'Luminária artesanal em madeira torneada, base estável e acabamento fosco.', 'Freijó', false, false),
('mesa-de-jantar-sob-medida', 'Mesa de Jantar Sob Medida', 'Mesas', 0.00, 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=1200', 'Mesa de jantar personalizada — escolha o tamanho, a madeira e o acabamento. Solicite um orçamento sem compromisso.', null, true, true),
('estante-sob-medida', 'Estante Sob Medida', 'Sob Encomenda', 0.00, 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=1200', 'Estante planejada sob medida para o seu espaço. Solicite um orçamento com as dimensões desejadas.', null, true, false)
on conflict (slug) do nothing;

insert into public.shipping_methods (name, min_days, max_days, price, active) values
('Retirada na loja', 0, 2, 0, true),
('Entrega combinada (região metropolitana)', 2, 5, 80, true),
('Envio pelos Correios', 5, 12, 45, true)
on conflict do nothing;
