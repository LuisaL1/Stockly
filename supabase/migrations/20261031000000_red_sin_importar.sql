-- Red de empresas: los productos de un partner no se agregan al instante. Entran al inventario
-- solo cuando se recibe un envío (o un pedido despachado). Se retira la importación de catálogo.
-- Idempotente.
drop function if exists public.stockly_red_importar_catalogo(bigint, bigint, bigint[]);
