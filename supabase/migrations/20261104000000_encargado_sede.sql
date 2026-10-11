-- Encargado de sede: un usuario puede quedar asignado a una sucursal (asignarempresa.id_sucursal).
-- Para esa persona, toda la app queda acotada a las bodegas de su sede: caja, facturas, compras,
-- kardex, traslados, bodegas, inicio, inteligencia, auditoría y Novandra. El dueño y los usuarios
-- sin sede ven toda la empresa. Rol "encargado" = administrador dentro de su sede.
-- Se valida en el servidor (RLS + triggers), no solo en la pantalla. Idempotente.

alter table public.asignarempresa add column if not exists id_sucursal bigint references public.sucursales(id) on delete set null;
create index if not exists asignarempresa_usuario_idx on public.asignarempresa (id_usuario);

-- Sede del usuario en sesión dentro de la empresa (null = toda la empresa). El dueño nunca está acotado.
create or replace function public.stockly_mi_sucursal(_id_empresa bigint)
returns bigint language sql stable security definer set search_path = public
as $$
  select a.id_sucursal
    from asignarempresa a
    join "Usuarios" u on u.id = a.id_usuario
   where a.id_empresa = _id_empresa and a.id_usuario = public.stockly_id_usuario()
     and lower(coalesce(u.tipouser, '')) <> 'dueño'
     and not exists (select 1 from "Empresa" e where e.id = _id_empresa and e.iduseradmin = u.id)
   limit 1
$$;

-- ¿El usuario en sesión puede operar sobre esta bodega?
create or replace function public.stockly_bodega_permitida(_id_bodega bigint)
returns boolean language sql stable security definer set search_path = public
as $$
  select case when _id_bodega is null then true else exists (
    select 1 from bodegas b
     where b.id = _id_bodega
       and (public.stockly_mi_sucursal(b.id_empresa) is null or b.id_sucursal = public.stockly_mi_sucursal(b.id_empresa))
  ) end
$$;

create or replace function public.stockly_asignar_sede(_id_empresa bigint, _id_usuario bigint, _id_sucursal bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare _dueno boolean;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede asignar sedes'; end if;
  if public.stockly_mi_sucursal(_id_empresa) is not null then raise exception 'Un encargado de sede no puede cambiar las sedes del equipo'; end if;
  if not exists (select 1 from asignarempresa where id_empresa = _id_empresa and id_usuario = _id_usuario) then raise exception 'La persona no pertenece a esta empresa'; end if;
  select exists (select 1 from "Empresa" where id = _id_empresa and iduseradmin = _id_usuario)
      or exists (select 1 from "Usuarios" where id = _id_usuario and lower(coalesce(tipouser, '')) = 'dueño') into _dueno;
  if _dueno and _id_sucursal is not null then raise exception 'El dueño siempre ve toda la empresa'; end if;
  if _id_sucursal is not null and not exists (select 1 from sucursales where id = _id_sucursal and id_empresa = _id_empresa) then
    raise exception 'Sede no válida';
  end if;
  update asignarempresa set id_sucursal = _id_sucursal where id_empresa = _id_empresa and id_usuario = _id_usuario;
  return jsonb_build_object('id_usuario', _id_usuario, 'id_sucursal', _id_sucursal);
end $$;
grant execute on function public.stockly_asignar_sede(bigint, bigint, bigint) to authenticated;

-- Personal con su sede
drop function if exists public.mostrarpersonal(integer);
create or replace function public.mostrarpersonal(_id_empresa integer)
returns table (id integer, nombres text, tipouser text, estado text, email text, nro_docum text, telefono text, direccion text, id_sucursal bigint, sucursal text)
language sql stable security definer set search_path = public
as $$
  select u.id, u.nombres, u.tipouser, u.estado, u.email, u.nro_docum, u.telefono, u.direccion, a.id_sucursal, s.nombre
    from asignarempresa a
    join "Usuarios" u on u.id = a.id_usuario
    left join sucursales s on s.id = a.id_sucursal
   where a.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
   order by u.nombres
$$;
drop function if exists public.buscarpersonal(integer, text);
create or replace function public.buscarpersonal(_id_empresa integer, buscador text)
returns table (id integer, nombres text, tipouser text, estado text, email text, nro_docum text, telefono text, direccion text, id_sucursal bigint, sucursal text)
language sql stable security definer set search_path = public
as $$
  select u.id, u.nombres, u.tipouser, u.estado, u.email, u.nro_docum, u.telefono, u.direccion, a.id_sucursal, s.nombre
    from asignarempresa a
    join "Usuarios" u on u.id = a.id_usuario
    left join sucursales s on s.id = a.id_sucursal
   where a.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
     and (u.nombres ilike '%' || buscador || '%' or coalesce(u.email, '') ilike '%' || buscador || '%')
   order by u.nombres
$$;
grant execute on function public.mostrarpersonal(integer) to authenticated;
grant execute on function public.buscarpersonal(integer, text) to authenticated;

-- Mi sede (para la app)
create or replace function public.stockly_mi_sede(_id_empresa bigint)
returns jsonb language sql stable security definer set search_path = public
as $$
  select case when public.stockly_mi_sucursal(_id_empresa) is null then null
         else (select jsonb_build_object('id', s.id, 'nombre', s.nombre) from sucursales s where s.id = public.stockly_mi_sucursal(_id_empresa)) end
$$;
grant execute on function public.stockly_mi_sede(bigint) to authenticated;

-- ---------------------------------------------------------------- Permisos por sede (RLS)
-- Al crear o editar una bodega la fila aún no existe (o cambia), así que la sede se evalúa sobre la fila misma:
-- sin sede asignada se puede todo; con sede, solo bodegas de esa sede.
drop policy if exists "miembros bodegas" on public.bodegas;
create policy "miembros bodegas" on public.bodegas for all
  using (public.stockly_es_miembro(id_empresa) and (public.stockly_mi_sucursal(id_empresa) is null or id_sucursal = public.stockly_mi_sucursal(id_empresa)))
  with check (public.stockly_es_miembro(id_empresa) and (public.stockly_mi_sucursal(id_empresa) is null or id_sucursal = public.stockly_mi_sucursal(id_empresa)));
drop policy if exists "admins sucursales" on public.sucursales;
create policy "admins sucursales" on public.sucursales for all
  using (public.stockly_es_admin(id_empresa) and public.stockly_mi_sucursal(id_empresa) is null)
  with check (public.stockly_es_admin(id_empresa) and public.stockly_mi_sucursal(id_empresa) is null);
drop policy if exists "miembros sucursales" on public.sucursales;
create policy "miembros sucursales" on public.sucursales for select
  using (public.stockly_es_miembro(id_empresa) and (public.stockly_mi_sucursal(id_empresa) is null or id = public.stockly_mi_sucursal(id_empresa)));
drop policy if exists "miembros ventas" on public.ventas;
create policy "miembros ventas" on public.ventas for all
  using (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_bodega))
  with check (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_bodega));
drop policy if exists kardex_leer on public.kardex;
create policy kardex_leer on public.kardex for select to authenticated
  using (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_bodega));
drop policy if exists "miembros ordenes_compra" on public.ordenes_compra;
create policy "miembros ordenes_compra" on public.ordenes_compra for all
  using (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_bodega))
  with check (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_bodega));
drop policy if exists "miembros traslados" on public.traslados;
create policy "miembros traslados" on public.traslados for all
  using (public.stockly_es_miembro(id_empresa) and (public.stockly_bodega_permitida(id_origen) or public.stockly_bodega_permitida(id_destino)))
  with check (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_origen) and public.stockly_bodega_permitida(id_destino));
drop policy if exists "miembros stock_bodega" on public.stock_bodega;
create policy "miembros stock_bodega" on public.stock_bodega for all
  using (exists (select 1 from public.bodegas b where b.id = id_bodega and public.stockly_es_miembro(b.id_empresa)) and public.stockly_bodega_permitida(id_bodega))
  with check (exists (select 1 from public.bodegas b where b.id = id_bodega and public.stockly_es_miembro(b.id_empresa)) and public.stockly_bodega_permitida(id_bodega));
drop policy if exists "admins auditoria" on public.auditoria;
create policy "admins auditoria" on public.auditoria for select
  using (public.stockly_es_admin(id_empresa) and (id_bodega is null or public.stockly_bodega_permitida(id_bodega)));

-- Las funciones del servidor (ventas, kardex, compras, traslados, red) se ejecutan como definidor y no
-- pasan por RLS: estos triggers aplican la sede también ahí.
create or replace function public.tg_sede_bodega()
returns trigger language plpgsql security definer set search_path = public
as $$
declare _b bigint;
begin
  -- Cada tabla tiene sus propias columnas: se leen con if/elsif (una expresión CASE las evaluaría todas).
  if tg_table_name = 'traslados' then
    if not (public.stockly_bodega_permitida(new.id_origen) and public.stockly_bodega_permitida(new.id_destino)) then
      raise exception 'Solo puedes trasladar entre bodegas de tu sede';
    end if;
    return new;
  elsif tg_table_name = 'red_envios' then
    if tg_op = 'INSERT' then _b := new.id_bodega_origen; else _b := new.id_bodega_destino; end if;
  else
    _b := new.id_bodega;
  end if;
  if not public.stockly_bodega_permitida(_b) then
    raise exception 'Esa bodega no pertenece a tu sede';
  end if;
  return new;
end $$;
drop trigger if exists sede_ventas on public.ventas;
create trigger sede_ventas before insert on public.ventas for each row execute function public.tg_sede_bodega();
drop trigger if exists sede_kardex on public.kardex;
create trigger sede_kardex before insert on public.kardex for each row execute function public.tg_sede_bodega();
drop trigger if exists sede_ordenes on public.ordenes_compra;
create trigger sede_ordenes before insert or update of id_bodega on public.ordenes_compra for each row execute function public.tg_sede_bodega();
drop trigger if exists sede_traslados on public.traslados;
create trigger sede_traslados before insert on public.traslados for each row execute function public.tg_sede_bodega();
drop trigger if exists sede_red_envios on public.red_envios;
create trigger sede_red_envios before insert or update of id_bodega_destino on public.red_envios for each row execute function public.tg_sede_bodega();

-- El stock por bodega (vista) respeta la sede.
create or replace view public.v_stock_bodega as
 select b.id as id_bodega, b.id_empresa, b.nombre as bodega, b.tipo, p.id as id_producto, coalesce(p.nombre_completo, p.descripcion) as descripcion, p.stock_minimo,
        p.precioventa, p.preciocompra,
        case when b.tipo = 'principal'
             then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0::numeric), 0::numeric)
             else coalesce(sb.cantidad, 0::numeric) end as cantidad,
        p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
        c.descripcion as categoria, m.descripcion as marca, p.codigointerno::text as codigointerno, p.codigobarras::text as codigobarras
   from bodegas b
   join productos p on p.id_empresa = b.id_empresa
   left join categorias c on c.id = p.id_categoria
   left join marca m on m.id = p.idmarca
   left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id
  where public.stockly_bodega_permitida(b.id);

-- ---------------------------------------------------------------- Analítica, kardex y rol
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
  -- Un encargado de sede solo ve su sede.
  if public.stockly_mi_sucursal(_id_empresa) is not null then _id_sucursal := public.stockly_mi_sucursal(_id_empresa); end if;

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
    -- Con sede, el valor del inventario y el bajo mínimo son los de las bodegas de esa sede.
    'valor_inventario', case when _id_sucursal is null then (select coalesce(sum(stock * preciocompra), 0) from public.productos where id_empresa = _id_empresa)
                         else (select coalesce(sum(v.cantidad * v.preciocompra), 0) from public.v_stock_bodega v join public.bodegas b on b.id = v.id_bodega where v.id_empresa = _id_empresa and b.id_sucursal = _id_sucursal) end,
    'valor_venta_inventario', case when _id_sucursal is null then (select coalesce(sum(stock * precioventa), 0) from public.productos where id_empresa = _id_empresa)
                         else (select coalesce(sum(v.cantidad * v.precioventa), 0) from public.v_stock_bodega v join public.bodegas b on b.id = v.id_bodega where v.id_empresa = _id_empresa and b.id_sucursal = _id_sucursal) end,
    'bajo_minimo', case when _id_sucursal is null then (select count(*) from public.productos where id_empresa = _id_empresa and stock <= coalesce(stock_minimo, 0))
                         else (select count(*) from public.v_stock_bodega v join public.bodegas b on b.id = v.id_bodega where v.id_empresa = _id_empresa and b.id_sucursal = _id_sucursal and v.cantidad <= coalesce(v.stock_minimo, 0)) end,
    'ordenes_abiertas', (select count(*) from public.ordenes_compra where id_empresa = _id_empresa and estado in ('borrador', 'enviada'))
  );
end $function$;

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
  -- Un encargado de sede solo ve su sede.
  if public.stockly_mi_sucursal(_id_empresa) is not null then _id_sucursal := public.stockly_mi_sucursal(_id_empresa); end if;

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

CREATE OR REPLACE FUNCTION public.stockly_patrones(_id_empresa bigint, _dias integer DEFAULT 90, _id_sucursal bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _desde timestamptz := now() - make_interval(days => greatest(least(coalesce(_dias, 90), 365), 7));
  _num_ventas int;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin acceso a esta empresa'; end if;
  -- Un encargado de sede solo ve su sede.
  if public.stockly_mi_sucursal(_id_empresa) is not null then _id_sucursal := public.stockly_mi_sucursal(_id_empresa); end if;

  drop table if exists _v;
  create temp table _v on commit drop as
    select v.id, v.total, v.id_cliente, (v.fecha at time zone 'America/Bogota') as local
      from ventas v
      left join bodegas b on b.id = v.id_bodega
     where v.id_empresa = _id_empresa and v.estado <> 'anulada' and v.fecha >= _desde
       and (_id_sucursal is null or b.id_sucursal = _id_sucursal);
  select count(*) into _num_ventas from _v;

  return jsonb_build_object(
    'dias', greatest(least(coalesce(_dias, 90), 365), 7),
    'ventas', _num_ventas,
    'ticket_promedio', (select round(avg(total)) from _v),
    'unidades_por_venta', (select round(avg(u), 1) from (
        select sum(d.cantidad) u from detalle_venta d join _v on _v.id = d.id_venta group by d.id_venta) t),
    -- 0 = domingo … 6 = sábado
    'por_dia_semana', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'ventas', n, 'total', t) order by dia) from (
        select extract(dow from local)::int dia, count(*) n, sum(total) t from _v group by 1) x), '[]'),
    'por_hora', coalesce((select jsonb_agg(jsonb_build_object('hora', hora, 'ventas', n, 'total', t) order by hora) from (
        select extract(hour from local)::int hora, count(*) n, sum(total) t from _v group by 1) x), '[]'),
    -- Productos que se compran juntos: veces, confianza (A→B) y lift (>1 = más de lo esperado por azar).
    'combos', coalesce((select jsonb_agg(c order by (c->>'veces')::int desc, (c->>'lift')::numeric desc) from (
        select jsonb_build_object(
                 'a', pa.descripcion, 'b', pb.descripcion, 'veces', par.n,
                 'confianza', round(par.n::numeric / na.n, 2),
                 'lift', round((par.n::numeric * _num_ventas) / (na.n * nb.n), 2)) c
          from (select d1.id_producto a, d2.id_producto b, count(distinct d1.id_venta) n
                  from detalle_venta d1
                  join detalle_venta d2 on d2.id_venta = d1.id_venta and d2.id_producto > d1.id_producto
                  join _v on _v.id = d1.id_venta
                 group by 1, 2 having count(distinct d1.id_venta) >= 2) par
          join (select d.id_producto, count(distinct d.id_venta) n from detalle_venta d join _v on _v.id = d.id_venta group by 1) na on na.id_producto = par.a
          join (select d.id_producto, count(distinct d.id_venta) n from detalle_venta d join _v on _v.id = d.id_venta group by 1) nb on nb.id_producto = par.b
          join productos pa on pa.id = par.a
          join productos pb on pb.id = par.b
         order by par.n desc limit 10) t), '[]'),
    'clientes', jsonb_build_object(
        'con_compra', (select count(distinct id_cliente) from _v where id_cliente is not null),
        'recurrentes', (select count(*) from (select id_cliente from _v where id_cliente is not null group by 1 having count(*) > 1) r),
        'ventas_sin_cliente', (select count(*) from _v where id_cliente is null),
        'top', coalesce((select jsonb_agg(jsonb_build_object('nombre', c.nombre, 'compras', x.n, 'total', x.t) order by x.t desc) from (
            select id_cliente, count(*) n, sum(total) t from _v where id_cliente is not null group by 1 order by 3 desc limit 5) x
            join clientes c on c.id = x.id_cliente), '[]'))
  );
end $function$;

CREATE OR REPLACE FUNCTION public.stockly_kardex(_id_empresa bigint, _filtros jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
       and public.stockly_bodega_permitida(m.id_bodega)
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
end $function$;

CREATE OR REPLACE FUNCTION public.stockly_es_admin(_id_empresa bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.stockly_es_miembro(_id_empresa) and exists (
    select 1 from "Usuarios" u
    where u.id = public.stockly_id_usuario()
      and lower(coalesce(u.tipouser, '')) in ('dueño', 'administrador', 'admin', 'encargado')
  )
$function$;

-- El ajuste manual avisa primero si la bodega no es de la sede.
CREATE OR REPLACE FUNCTION public.stockly_registrar_ajuste(_id_empresa bigint, _id_producto bigint, _id_bodega bigint, _tipo text, _cantidad numeric, _motivo text, _nota text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _id bigint;
  _bodega bigint;
  _nombre text;
  _motivo_nombre text;
  _disponible numeric;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  select descripcion into _nombre from productos where id = _id_producto and id_empresa = _id_empresa;
  if _nombre is null then raise exception 'Producto no encontrado'; end if;
  _bodega := coalesce(_id_bodega, public.stockly_bodega_principal(_id_empresa));
  if not exists (select 1 from bodegas where id = _bodega and id_empresa = _id_empresa) then raise exception 'Bodega no válida'; end if;
  if not public.stockly_bodega_permitida(_bodega) then raise exception 'Esa bodega no pertenece a tu sede'; end if;
  if _cantidad is null or _cantidad <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if lower(coalesce(_tipo, '')) not in ('entrada', 'salida') then raise exception 'Indica si es entrada o salida'; end if;
  select m->>'nombre' into _motivo_nombre from jsonb_array_elements(public.stockly_motivos_ajuste()) m where m->>'id' = _motivo;
  if _motivo_nombre is null then raise exception 'Elige el motivo del ajuste'; end if;
  if lower(_tipo) = 'salida' then
    _disponible := public.stockly_disponible(_bodega, _id_producto);
    if _disponible < _cantidad then
      raise exception 'No hay stock suficiente de % en esta bodega (disponible: %)', _nombre, trim_scale(_disponible);
    end if;
  end if;

  insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, motivo, nota)
  values (initcap(lower(_tipo)), _cantidad, _motivo_nombre || coalesce(' · ' || nullif(btrim(_nota), ''), ''),
          _id_empresa, _id_producto, _bodega, 'ajuste', _motivo, nullif(btrim(_nota), ''))
  returning id into _id;

  return jsonb_build_object('id', _id, 'stock', (select stock from productos where id = _id_producto),
                            'disponible', public.stockly_disponible(_bodega, _id_producto));
end $function$;
