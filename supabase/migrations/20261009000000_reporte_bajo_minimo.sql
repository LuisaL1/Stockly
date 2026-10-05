-- =====================================================================
-- Stockly v3.5: corrección de seguridad en el reporte de stock bajo mínimo.
--
-- La función anterior reportproductosbajominimo respondía sin sesión y
-- devolvía productos de todas las empresas. Ahora solo responde a miembros de
-- la empresa y solo con sus productos. Conserva el nombre y el parámetro
-- (id_empresa) que usan la app y Novandra.
-- =====================================================================

do $$
declare _f regprocedure;
begin
  for _f in select oid::regprocedure from pg_proc
             where proname = 'reportproductosbajominimo' and pronamespace = 'public'::regnamespace
  loop
    execute format('drop function %s', _f);
  end loop;
end $$;

create function public.reportproductosbajominimo(id_empresa bigint)
returns table (
  id bigint,
  descripcion text,
  stock numeric,
  stock_minimo numeric,
  codigobarras text,
  codigointerno text,
  precioventa numeric,
  id_empresa bigint
)
language sql stable security definer set search_path = public
as $$
  select p.id::bigint, p.descripcion::text, p.stock::numeric, p.stock_minimo::numeric,
         p.codigobarras::text, p.codigointerno::text, p.precioventa::numeric, p.id_empresa::bigint
    from productos p
   where p.id_empresa = $1
     and public.stockly_es_miembro($1)
     and coalesce(p.stock, 0) <= coalesce(p.stock_minimo, 0)
   order by p.descripcion
$$;

revoke execute on function public.reportproductosbajominimo(bigint) from public, anon;
grant execute on function public.reportproductosbajominimo(bigint) to authenticated;
