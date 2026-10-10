-- Nombre completo del producto: en cualquier lista, reporte, kardex, factura o respuesta de Novandra
-- el producto se identifica sin ambigüedad.
--   "Loción Brisa · Frasco 120 ml"            (nombre + presentación y contenido)
--   "Loción Brisa · Frasco 120 ml (LOC-120)"  (si otro producto de la empresa tiene el mismo nombre completo)
-- La columna productos.nombre_completo la mantiene un trigger. "descripcion" sigue siendo el nombre que
-- escribe la persona (se edita en el formulario e importa desde Excel).
-- Idempotente.

alter table public.productos add column if not exists nombre_completo text;

create or replace function public.stockly_nombre_completo(_p public.productos)
returns text language sql stable
as $$
  select btrim(_p.descripcion)
    || case when _p.presentacion is not null then
         ' · ' || coalesce((select x->>'nombre' from jsonb_array_elements(public.stockly_presentaciones()) x where x->>'id' = _p.presentacion), initcap(_p.presentacion))
         || case when _p.contenido is not null then ' ' || trim_scale(_p.contenido)::text || ' '
              || coalesce((select u->>'abrev' from jsonb_array_elements(public.stockly_unidades()) u where u->>'id' = coalesce(_p.contenido_unidad, 'und')), coalesce(_p.contenido_unidad, 'und'))
            else '' end
       else '' end
$$;

-- Recalcula el nombre completo de los productos de la empresa que comparten nombre.
create or replace function public.stockly_recalcular_nombres(_id_empresa bigint, _descripcion text default null)
returns void language plpgsql security definer set search_path = public
as $$
begin
  with base as (
    select p.id, public.stockly_nombre_completo(p) as n, p.codigointerno, p.codigobarras
      from productos p
     where p.id_empresa = _id_empresa and (_descripcion is null or public.stockly_norm(p.descripcion) = public.stockly_norm(_descripcion))
  ), rep as (
    select b.*, count(*) over (partition by public.stockly_norm(b.n)) as veces from base b
  ), final as (
    select id, case when veces > 1 then n || ' (' || coalesce(nullif(btrim(codigointerno::text), ''), nullif(btrim(codigobarras::text), ''), '#' || id) || ')' else n end as n from rep
  )
  update productos p set nombre_completo = f.n from final f where f.id = p.id and p.nombre_completo is distinct from f.n;
end $$;

create or replace function public.tg_productos_nombre_completo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if pg_trigger_depth() > 2 then return null; end if;
  if tg_op in ('INSERT', 'UPDATE') then perform public.stockly_recalcular_nombres(new.id_empresa, new.descripcion); end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and public.stockly_norm(old.descripcion) <> public.stockly_norm(new.descripcion)) then
    perform public.stockly_recalcular_nombres(old.id_empresa, old.descripcion);
  end if;
  return null;
end $$;
drop trigger if exists productos_nombre_completo on public.productos;
create trigger productos_nombre_completo after insert or delete or update of descripcion, presentacion, contenido, contenido_unidad, codigointerno, codigobarras on public.productos
  for each row execute function public.tg_productos_nombre_completo();

-- Datos existentes
do $$
declare _e bigint;
begin
  for _e in select distinct id_empresa from productos loop perform public.stockly_recalcular_nombres(_e); end loop;
end $$;

-- La línea de venta guarda el nombre completo (así factura, WhatsApp y el panel de inicio son específicos).
create or replace function public.tg_detalle_venta_unidad()
returns trigger language plpgsql security definer set search_path = public
as $$
declare _p public.productos;
begin
  if new.id_producto is not null then
    select * into _p from productos where id = new.id_producto;
    if found then
      new.unidad := coalesce(new.unidad, _p.unidad);
      new.presentacion := coalesce(new.presentacion, _p.presentacion);
      if public.stockly_norm(new.descripcion) = public.stockly_norm(_p.descripcion) then new.descripcion := coalesce(_p.nombre_completo, _p.descripcion); end if;
    end if;
  end if;
  return new;
end $$;

-- Listas y reportes
drop function if exists public.mostrarproductos(integer);
create or replace function public.mostrarproductos(_id_empresa integer)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text,
  unidad text, presentacion text, contenido numeric, contenido_unidad text, nombre_completo text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
         coalesce(p.nombre_completo, p.descripcion)
    from productos p
    left join categorias c on c.id = p.id_categoria
    left join marca m on m.id = p.idmarca
   where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
   order by p.descripcion
$$;
drop function if exists public.buscarproductos(integer, text);
create or replace function public.buscarproductos(_id_empresa integer, buscador text)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text,
  unidad text, presentacion text, contenido numeric, contenido_unidad text, nombre_completo text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
         coalesce(p.nombre_completo, p.descripcion)
    from productos p
    left join categorias c on c.id = p.id_categoria
    left join marca m on m.id = p.idmarca
   where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
     and (coalesce(buscador, '') = '' or p.descripcion ilike '%' || buscador || '%' or coalesce(p.nombre_completo, '') ilike '%' || buscador || '%'
          or coalesce(p.codigointerno, '') ilike '%' || buscador || '%' or coalesce(p.codigobarras, '') = buscador)
   order by p.descripcion
$$;
grant execute on function public.mostrarproductos(integer) to authenticated;
grant execute on function public.buscarproductos(integer, text) to authenticated;

create or replace view public.v_stock_bodega as
 select b.id as id_bodega, b.id_empresa, b.nombre as bodega, b.tipo, p.id as id_producto, coalesce(p.nombre_completo, p.descripcion) as descripcion, p.stock_minimo,
        p.precioventa, p.preciocompra,
        case when b.tipo = 'principal'
             then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0::numeric), 0::numeric)
             else coalesce(sb.cantidad, 0::numeric) end as cantidad,
        p.unidad, p.presentacion, p.contenido, p.contenido_unidad
   from bodegas b
   join productos p on p.id_empresa = b.id_empresa
   left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id;

create or replace function public.inventariovalorado(_id_empresa integer)
returns table (id integer, descripcion text, stock numeric, preciocompra numeric, total numeric)
language sql stable security definer set search_path = public
as $$
  select p.id, coalesce(p.nombre_completo, p.descripcion), p.stock, p.preciocompra, (p.stock * p.preciocompra) as total
    from productos p where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa) order by p.descripcion
$$;
drop function if exists public.reportproductosbajominimo(bigint);
create or replace function public.reportproductosbajominimo(id_empresa bigint)
returns table (id bigint, descripcion text, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text, precioventa numeric, id_empresa bigint, unidad text, presentacion text)
language sql stable security definer set search_path = public
as $$
  select p.id::bigint, coalesce(p.nombre_completo, p.descripcion)::text, p.stock::numeric, p.stock_minimo::numeric,
         p.codigobarras::text, p.codigointerno::text, p.precioventa::numeric, p.id_empresa::bigint, p.unidad, p.presentacion
    from productos p
   where p.id_empresa = $1 and public.stockly_es_miembro($1)
     and coalesce(p.stock, 0) <= coalesce(p.stock_minimo, 0)
   order by p.descripcion
$$;
grant execute on function public.reportproductosbajominimo(bigint) to authenticated;

-- Kardex
create or replace function public.stockly_kardex(_id_empresa bigint, _filtros jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  _producto bigint := nullif(_filtros->>'id_producto', '')::bigint;
  _bodega bigint := nullif(_filtros->>'id_bodega', '')::bigint;
  _tipo text := nullif(_filtros->>'tipo', '');
  _origen text := nullif(_filtros->>'origen', '');
  _desde date := nullif(_filtros->>'desde', '')::date;
  _hasta date := nullif(_filtros->>'hasta', '')::date;
  _texto text := nullif(btrim(coalesce(_filtros->>'texto', '')), '');
  _limite int := least(greatest(coalesce(nullif(_filtros->>'limite', '')::int, 300), 1), 5000);
  _desplazamiento int := greatest(coalesce(nullif(_filtros->>'desplazamiento', '')::int, 0), 0);
  _zona text := 'America/Bogota';
  _res jsonb;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  with m as (
    select k.*,
           sum(case when k.tipo = 'Entrada' then k.cantidad else -k.cantidad end)
             over (partition by k.id_producto, k.id_bodega order by k.creado_en, k.id) as saldo
      from kardex k
     where k.id_empresa = _id_empresa
  ), f as (
    select m.id, m.creado_en, m.tipo, m.origen, m.referencia, m.detalle, m.motivo, m.nota, m.cantidad, m.saldo,
           m.estado, m.anula_a, m.id_producto, m.id_bodega,
           coalesce(p.nombre_completo, p.descripcion) as producto, p.codigointerno as codigo, p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
           b.nombre as bodega, u.nombres as usuario,
           case m.origen
             when 'venta' then (select v.prefijo || '-' || v.numero from ventas v where v.id = m.referencia)
             when 'anulacion' then (select v.prefijo || '-' || v.numero from ventas v where v.id = m.referencia)
             when 'compra' then (select 'OC-' || o.numero from ordenes_compra o where o.id = m.referencia)
           end as documento
      from m
      join productos p on p.id = m.id_producto
      left join bodegas b on b.id = m.id_bodega
      left join "Usuarios" u on u.id = m.id_usuario
     where (_producto is null or m.id_producto = _producto)
       and (_bodega is null or m.id_bodega = _bodega)
       and (_tipo is null or m.tipo = _tipo)
       and (_origen is null or m.origen = _origen)
       and (_desde is null or m.creado_en >= (_desde::timestamp at time zone _zona))
       and (_hasta is null or m.creado_en < ((_hasta + 1)::timestamp at time zone _zona))
       and (_texto is null or p.descripcion ilike '%' || _texto || '%' or coalesce(p.nombre_completo, '') ilike '%' || _texto || '%'
            or coalesce(m.detalle, '') ilike '%' || _texto || '%' or coalesce(p.codigointerno::text, '') ilike '%' || _texto || '%')
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'resumen', (select jsonb_build_object(
                  'entradas', coalesce(sum(cantidad) filter (where tipo = 'Entrada'), 0),
                  'salidas', coalesce(sum(cantidad) filter (where tipo = 'Salida'), 0)) from f),
    'filas', coalesce((select jsonb_agg(to_jsonb(x)) from (
                select * from f order by creado_en desc, id desc limit _limite offset _desplazamiento) x), '[]'::jsonb))
  into _res;
  return _res;
end $$;

-- Red: el emparejamiento también reconoce el nombre completo.
create or replace function public.stockly_red_buscar_producto(_id_empresa bigint, _codigointerno text, _codigobarras text, _descripcion text)
returns bigint language sql stable security definer set search_path = public
as $$
  select id from productos p
   where p.id_empresa = _id_empresa
     and ((nullif(btrim(_codigointerno), '') is not null and public.stockly_norm(p.codigointerno::text) = public.stockly_norm(_codigointerno))
          or (nullif(btrim(_codigobarras), '') is not null and p.codigobarras::text = _codigobarras)
          or public.stockly_norm(p.descripcion) = public.stockly_norm(_descripcion)
          or public.stockly_norm(coalesce(p.nombre_completo, '')) = public.stockly_norm(_descripcion))
   order by (nullif(btrim(_codigointerno), '') is not null and public.stockly_norm(p.codigointerno::text) = public.stockly_norm(_codigointerno)) desc,
            (nullif(btrim(_codigobarras), '') is not null and p.codigobarras::text = _codigobarras) desc
   limit 1
$$;

-- Rotación, panel de inicio y stock de la red con el nombre completo.
CREATE OR REPLACE FUNCTION public.stockly_rotacion(_id_empresa bigint, _dias integer DEFAULT 90, _id_sucursal bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _hoy date := (now() at time zone 'America/Bogota')::date;
  _desde date := _hoy - (_dias - 1);
  _resultado jsonb;
  _perfil jsonb;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin acceso a esta empresa'; end if;

  -- Solo se cuentan los días con historia: un negocio nuevo no se mide contra días sin datos.
  _dias := greatest(7, least(_dias, _hoy - coalesce(
    (select min((fecha at time zone 'America/Bogota')::date) from ventas
      where id_empresa = _id_empresa and estado <> 'anulada'), _hoy) + 1));
  _desde := _hoy - (_dias - 1);

  with ventas_dia as (
    select dv.id_producto, (v.fecha at time zone 'America/Bogota')::date as dia, sum(dv.cantidad) as unidades
      from detalle_venta dv
      join ventas v on v.id = dv.id_venta
      left join bodegas b on b.id = v.id_bodega
     where v.id_empresa = _id_empresa and v.estado <> 'anulada'
       and v.fecha >= _desde::timestamp at time zone 'America/Bogota'
       and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
     group by 1, 2
  ),
  stock as (
    select id_producto, sum(cantidad) as cantidad from v_stock_bodega
     where id_empresa = _id_empresa
       and (_id_sucursal is null or id_bodega in (select id from bodegas where id_sucursal = _id_sucursal))
     group by 1
  ),
  base as (
    select p.id, coalesce(p.nombre_completo, p.descripcion) as descripcion, c.descripcion as categoria, p.stock_minimo, p.precioventa, p.preciocompra,
           coalesce(s.cantidad, 0) as stock,
           coalesce(sum(vd.unidades), 0) as unidades,
           count(vd.dia) as dias_con_venta,
           coalesce(sum(vd.unidades) filter (where vd.dia > _hoy - 14), 0) as unidades_14,
           coalesce(sum(vd.unidades) filter (where vd.dia > _hoy - 28 and vd.dia <= _hoy - 14), 0) as unidades_14_previos,
           max(vd.dia) as ultima_venta,
           coalesce(stddev_pop(vd.unidades), 0) as desviacion
      from productos p
      left join categorias c on c.id = p.id_categoria
      left join stock s on s.id_producto = p.id
      left join ventas_dia vd on vd.id_producto = p.id
     where p.id_empresa = _id_empresa
     group by p.id, coalesce(p.nombre_completo, p.descripcion), c.descripcion, p.stock_minimo, p.precioventa, p.preciocompra, s.cantidad
  ),
  calculo as (
    select b.*,
           round(b.dias_con_venta::numeric / _dias, 3) as frecuencia,
           round(b.unidades::numeric / _dias, 3) as venta_diaria,
           -- Velocidad ponderada: pesa más lo reciente (aprende del cambio de ritmo).
           round(0.6 * (b.unidades_14::numeric / 14) + 0.4 * (b.unidades::numeric / _dias), 3) as velocidad,
           case when b.dias_con_venta > 0 then round(_dias::numeric / b.dias_con_venta, 1) end as intervalo_tipico,
           case when b.ultima_venta is not null then _hoy - b.ultima_venta end as dias_sin_venta,
           case when b.unidades_14_previos > 0
                then round((b.unidades_14 - b.unidades_14_previos) * 100.0 / b.unidades_14_previos)
                when b.unidades_14 > 0 then 100 end as tendencia
      from base b
  ),
  umbrales as (
    select percentile_cont(0.66) within group (order by frecuencia) as p66,
           percentile_cont(0.33) within group (order by frecuencia) as p33,
           percentile_cont(0.5) within group (order by frecuencia) as mediana
      from calculo where frecuencia > 0
  ),
  final as (
    select c.*,
           case when c.unidades = 0 then 'sin_movimiento'
                when c.frecuencia >= u.p66 then 'alta'
                when c.frecuencia >= u.p33 then 'media'
                else 'baja' end as rotacion,
           case when c.velocidad > 0 then round(c.stock / c.velocidad, 1) end as dias_cobertura,
           round(c.velocidad * 7, 1) as pronostico_7,
           round(c.velocidad * 30, 1) as pronostico_30,
           -- Reponer para cubrir 30 días + seguridad (la mitad de una semana de demanda + variabilidad).
           greatest(ceil(c.velocidad * 30 + c.velocidad * 3.5 + c.desviacion * 2 - c.stock), 0) as sugerido_reponer
      from calculo c cross join umbrales u
  )
  select jsonb_agg(jsonb_build_object(
           'id', f.id, 'descripcion', f.descripcion, 'categoria', f.categoria,
           'stock', f.stock, 'stock_minimo', f.stock_minimo, 'precioventa', f.precioventa, 'preciocompra', f.preciocompra,
           'unidades', f.unidades, 'dias_con_venta', f.dias_con_venta, 'frecuencia', f.frecuencia,
           'venta_diaria', f.venta_diaria, 'velocidad', f.velocidad, 'tendencia', f.tendencia,
           'intervalo_tipico', f.intervalo_tipico, 'dias_sin_venta', f.dias_sin_venta, 'ultima_venta', f.ultima_venta,
           'rotacion', f.rotacion, 'dias_cobertura', f.dias_cobertura,
           'fecha_agotamiento', case when f.dias_cobertura is not null then _hoy + floor(f.dias_cobertura)::int end,
           'pronostico_7', f.pronostico_7, 'pronostico_30', f.pronostico_30,
           'sugerido_reponer', case when f.rotacion = 'sin_movimiento' then 0 else f.sugerido_reponer end,
           'capital_inmovilizado', case when f.rotacion = 'sin_movimiento' then f.stock * coalesce(f.preciocompra, 0) else 0 end,
           'alerta', case
             when f.stock <= 0 and f.velocidad > 0 then 'agotado'
             when f.dias_cobertura is not null and f.dias_cobertura < 7 then 'agotamiento_proximo'
             when f.intervalo_tipico is not null and f.dias_con_venta >= 3
                  and f.dias_sin_venta > greatest(f.intervalo_tipico * 2.5, 3) then 'detenido'
             when f.rotacion = 'sin_movimiento' and f.stock > 0 then 'sin_movimiento'
             when f.dias_cobertura is not null and f.dias_cobertura > 120 then 'sobrestock'
           end
         ) order by f.velocidad desc, f.descripcion)
    into _resultado from final f;

  select jsonb_build_object(
           'dias_analizados', _dias,
           'productos', count(*),
           'frecuencia_mediana', (select mediana from (select percentile_cont(0.5) within group (order by (x->>'frecuencia')::numeric) as mediana
                                    from jsonb_array_elements(_resultado) x where (x->>'frecuencia')::numeric > 0) m),
           'dias_con_ventas', (select count(distinct (fecha at time zone 'America/Bogota')::date) from ventas
                                where id_empresa = _id_empresa and estado <> 'anulada'
                                  and fecha >= _desde::timestamp at time zone 'America/Bogota'),
           'dia_mas_fuerte', (select (array['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])
                                         [extract(isodow from fecha at time zone 'America/Bogota')::int]
                                from ventas
                               where id_empresa = _id_empresa and estado <> 'anulada'
                                 and fecha >= _desde::timestamp at time zone 'America/Bogota'
                               group by extract(isodow from fecha at time zone 'America/Bogota')
                               order by sum(total) desc limit 1))
    into _perfil from jsonb_array_elements(coalesce(_resultado, '[]'::jsonb));

  return jsonb_build_object('perfil', _perfil, 'productos', coalesce(_resultado, '[]'::jsonb));
end $function$;


CREATE OR REPLACE FUNCTION public.stockly_dashboard(_id_empresa bigint, _dias integer DEFAULT 30, _id_sucursal bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _hoy date := (now() at time zone 'America/Bogota')::date;
  _desde date := _hoy - (_dias - 1);
  _ventas jsonb;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin acceso a esta empresa'; end if;

  with dias as (select generate_series(_desde, _hoy, interval '1 day')::date as dia),
       v as (select (ve.fecha at time zone 'America/Bogota')::date as dia, ve.total
               from public.ventas ve left join public.bodegas b on b.id = ve.id_bodega
              where ve.id_empresa = _id_empresa and ve.estado <> 'anulada'
                and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
                and ve.fecha >= (_desde - _dias)::timestamp at time zone 'America/Bogota')
  select jsonb_build_object(
    'serie', (select jsonb_agg(jsonb_build_object('fecha', d.dia,
                'total', coalesce((select sum(total) from v where v.dia = d.dia), 0),
                'ventas', (select count(*) from v where v.dia = d.dia)) order by d.dia) from dias d),
    'total_periodo', (select coalesce(sum(total), 0) from v where dia >= _desde),
    'total_anterior', (select coalesce(sum(total), 0) from v where dia < _desde),
    'num_ventas', (select count(*) from v where dia >= _desde),
    'total_hoy', (select coalesce(sum(total), 0) from v where dia = _hoy),
    'ventas_hoy', (select count(*) from v where dia = _hoy)
  ) into _ventas;

  return _ventas || jsonb_build_object(
    'top_productos', coalesce((
      select jsonb_agg(t) from (
        select dv.id_producto, coalesce(p.nombre_completo, dv.descripcion) as descripcion, sum(dv.cantidad) as cantidad, sum(dv.total) as total
          from public.detalle_venta dv join public.ventas ve on ve.id = dv.id_venta
          left join public.bodegas b on b.id = ve.id_bodega
          left join public.productos p on p.id = dv.id_producto
         where ve.id_empresa = _id_empresa and ve.estado <> 'anulada'
           and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
           and ve.fecha >= _desde::timestamp at time zone 'America/Bogota'
         group by dv.id_producto, coalesce(p.nombre_completo, dv.descripcion) order by sum(dv.cantidad) desc limit 5) t), '[]'::jsonb),
    'por_metodo', coalesce((
      select jsonb_agg(t) from (
        select ve.metodo_pago as metodo, sum(ve.total) as total, count(*) as ventas
          from public.ventas ve left join public.bodegas b on b.id = ve.id_bodega
         where ve.id_empresa = _id_empresa and ve.estado <> 'anulada'
           and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
           and ve.fecha >= _desde::timestamp at time zone 'America/Bogota'
         group by ve.metodo_pago order by sum(ve.total) desc) t), '[]'::jsonb),
    'por_sucursal', coalesce((
      select jsonb_agg(t order by t.total desc) from (
        select s.id, s.nombre, coalesce(sum(ve.total), 0) as total, count(ve.id) as ventas
          from public.sucursales s
          left join public.bodegas b on b.id_sucursal = s.id
          left join public.ventas ve on ve.id_bodega = b.id and ve.estado <> 'anulada'
                                    and ve.fecha >= _desde::timestamp at time zone 'America/Bogota'
         where s.id_empresa = _id_empresa and s.activa
         group by s.id, s.nombre) t), '[]'::jsonb),
    'bodegas', coalesce((
      select jsonb_agg(t order by t.tipo = 'principal' desc, t.nombre) from (
        select b.id, b.nombre, b.tipo, coalesce(sum(s.cantidad), 0) as unidades
          from public.bodegas b left join public.v_stock_bodega s on s.id_bodega = b.id
         where b.id_empresa = _id_empresa and b.activa
           and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
         group by b.id, b.nombre, b.tipo) t), '[]'::jsonb),
    'recientes', coalesce((
      select jsonb_agg(t) from (
        select ve.id, ve.prefijo, ve.numero, ve.total, ve.estado, ve.fecha, ve.canal, c.nombre as cliente
          from public.ventas ve
          left join public.clientes c on c.id = ve.id_cliente
          left join public.bodegas b on b.id = ve.id_bodega
         where ve.id_empresa = _id_empresa and (_id_sucursal is null or b.id_sucursal = _id_sucursal)
         order by ve.fecha desc limit 5) t), '[]'::jsonb),
    'valor_inventario', (select coalesce(sum(stock * preciocompra), 0) from public.productos where id_empresa = _id_empresa),
    'valor_venta_inventario', (select coalesce(sum(stock * precioventa), 0) from public.productos where id_empresa = _id_empresa),
    'bajo_minimo', (select count(*) from public.productos where id_empresa = _id_empresa and stock <= coalesce(stock_minimo, 0)),
    'ordenes_abiertas', (select count(*) from public.ordenes_compra where id_empresa = _id_empresa and estado in ('borrador', 'enviada'))
  );
end $function$;


CREATE OR REPLACE FUNCTION public.stockly_red_stock(_id_vinculo bigint, _id_empresa bigint, _texto text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _v public.red_vinculos;
  _otra bigint;
  _cfg jsonb;
  _t text := nullif(btrim(coalesce(_texto, '')), '');
begin
  _v := public.stockly_red_vinculo(_id_vinculo, _id_empresa);
  _otra := public.stockly_red_otra(_v, _id_empresa);
  _cfg := public.stockly_red_config(_v, _otra);
  if coalesce((_cfg->>'stock')::boolean, false) is not true then
    return jsonb_build_object('comparte', false, 'productos', '[]'::jsonb);
  end if;
  return jsonb_build_object('comparte', true, 'costos', coalesce((_cfg->>'costos')::boolean, false),
    'catalogo', coalesce((_cfg->>'catalogo')::boolean, false),
    'productos', coalesce((select jsonb_agg(to_jsonb(x) order by x.descripcion) from (
      select p.id, coalesce(p.nombre_completo, p.descripcion) as descripcion, p.codigointerno, p.codigobarras, p.stock, p.stock_minimo, p.precioventa, p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
             case when coalesce((_cfg->>'costos')::boolean, false) then p.preciocompra end as preciocompra,
             c.descripcion as categoria, m.descripcion as marca,
             (select jsonb_agg(jsonb_build_object('bodega', vb.bodega, 'cantidad', vb.cantidad) order by vb.bodega)
                from v_stock_bodega vb where vb.id_producto = p.id and vb.cantidad > 0) as bodegas,
             public.stockly_red_buscar_producto(_id_empresa, p.codigointerno::text, p.codigobarras::text, p.descripcion) as mi_producto
        from productos p
        left join categorias c on c.id = p.id_categoria
        left join marca m on m.id = p.idmarca
       where p.id_empresa = _otra
         and (_t is null or p.descripcion ilike '%' || _t || '%' or coalesce(p.codigointerno::text, '') ilike '%' || _t || '%' or coalesce(p.codigobarras::text, '') = _t)
       limit 2000) x), '[]'::jsonb));
end $function$;


