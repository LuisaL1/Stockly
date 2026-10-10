-- Lista de productos con su categoría y su marca.
-- mostrarproductos devolvía la tabla sin uniones (la lista nunca mostraba categoría ni marca) y
-- buscarproductos usaba INNER JOIN (un producto sin categoría o sin marca desaparecía de la búsqueda).
-- Ambas devuelven ahora la misma forma, con LEFT JOIN, solo para miembros de la empresa.
-- Idempotente.

drop function if exists public.mostrarproductos(integer);
create or replace function public.mostrarproductos(_id_empresa integer)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria
    from productos p
    left join categorias c on c.id = p.id_categoria
    left join marca m on m.id = p.idmarca
   where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
   order by p.descripcion
$$;

create or replace function public.buscarproductos(_id_empresa integer, buscador text)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria
    from productos p
    left join categorias c on c.id = p.id_categoria
    left join marca m on m.id = p.idmarca
   where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
     and (coalesce(buscador, '') = '' or p.descripcion ilike '%' || buscador || '%'
          or coalesce(p.codigointerno, '') ilike '%' || buscador || '%' or coalesce(p.codigobarras, '') = buscador)
   order by p.descripcion
$$;

grant execute on function public.mostrarproductos(integer) to authenticated;
grant execute on function public.buscarproductos(integer, text) to authenticated;
