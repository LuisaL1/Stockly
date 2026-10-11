-- Traslados entre sedes: un encargado puede enviar stock desde su sede a cualquier bodega de la empresa
-- (por ejemplo, devolver a la bodega principal). Lo que sigue bloqueado es mover stock que no es suyo:
-- el origen debe ser una bodega de su sede. Idempotente.

create or replace function public.tg_sede_bodega()
returns trigger language plpgsql security definer set search_path = public
as $$
declare _b bigint;
begin
  if tg_table_name = 'traslados' then
    if not public.stockly_bodega_permitida(new.id_origen) then
      raise exception 'Solo puedes trasladar desde las bodegas de tu sede';
    end if;
    return new;
  elsif tg_table_name = 'kardex' then
    -- El traslado ya se validó en su origen; la entrada en la bodega destino (de otra sede) debe registrarse.
    if new.origen = 'traslado' then return new; end if;
    _b := new.id_bodega;
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

drop policy if exists "miembros traslados" on public.traslados;
create policy "miembros traslados" on public.traslados for all
  using (public.stockly_es_miembro(id_empresa) and (public.stockly_bodega_permitida(id_origen) or public.stockly_bodega_permitida(id_destino)))
  with check (public.stockly_es_miembro(id_empresa) and public.stockly_bodega_permitida(id_origen));

-- Destinos posibles para un traslado: todas las bodegas de la empresa (solo nombre, tipo y sede), sin importar la sede del usuario.
create or replace function public.stockly_bodegas_destino(_id_empresa bigint)
returns table (id bigint, nombre text, tipo text, id_sucursal bigint, sucursal text, activa boolean)
language sql stable security definer set search_path = public
as $$
  select b.id, b.nombre, b.tipo, b.id_sucursal, s.nombre, b.activa
    from bodegas b left join sucursales s on s.id = b.id_sucursal
   where b.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
   order by (b.tipo = 'principal') desc, b.nombre
$$;
grant execute on function public.stockly_bodegas_destino(bigint) to authenticated;

-- El traslado avisa primero si el origen no es de la sede.
CREATE OR REPLACE FUNCTION public.trasladar_stock(_id_producto bigint, _id_origen bigint, _id_destino bigint, _cantidad numeric, _nota text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _empresa bigint;
  _nombre_origen text;
  _nombre_destino text;
  _id bigint;
begin
  select id_empresa, nombre into _empresa, _nombre_origen from public.bodegas where id = _id_origen;
  select nombre into _nombre_destino from public.bodegas where id = _id_destino and id_empresa = _empresa;
  if _empresa is null or _nombre_destino is null or not public.stockly_es_miembro(_empresa) then
    raise exception 'Bodegas no válidas';
  end if;
  if not public.stockly_bodega_permitida(_id_origen) then raise exception 'Solo puedes trasladar desde las bodegas de tu sede'; end if;
  if _id_origen = _id_destino then raise exception 'Elige dos bodegas distintas'; end if;
  if _cantidad is null or _cantidad <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if not exists (select 1 from productos where id = _id_producto and id_empresa = _empresa) then
    raise exception 'Producto no encontrado';
  end if;
  if public.stockly_disponible(_id_origen, _id_producto) < _cantidad then
    raise exception 'No hay stock suficiente en la bodega de origen (disponible: %)',
      trim_scale(public.stockly_disponible(_id_origen, _id_producto));
  end if;

  insert into public.traslados (id_empresa, id_producto, id_origen, id_destino, cantidad, id_usuario, nota)
  values (_empresa, _id_producto, _id_origen, _id_destino, _cantidad, public.stockly_id_usuario(), _nota)
  returning id into _id;

  -- El trigger de bodegas mueve stock_bodega; el total del producto no cambia.
  insert into public.kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, referencia, nota)
  values ('Salida', _cantidad, 'Traslado a ' || _nombre_destino, _empresa, _id_producto, _id_origen, 'traslado', _id, nullif(btrim(_nota), '')),
         ('Entrada', _cantidad, 'Traslado desde ' || _nombre_origen, _empresa, _id_producto, _id_destino, 'traslado', _id, nullif(btrim(_nota), ''));
end $function$;

-- Consulta de stock en toda la empresa (solo lectura), por bodega y sede, sin importar la sede del usuario.
create or replace function public.stockly_stock_empresa(_id_empresa bigint, _texto text default null)
returns table (id_producto bigint, producto text, unidad text, presentacion text, id_bodega bigint, bodega text, sucursal text, mia boolean, cantidad numeric)
language sql stable security definer set search_path = public
as $$
  with t as (select nullif(btrim(coalesce(_texto, '')), '') as x)
  select p.id, coalesce(p.nombre_completo, p.descripcion), p.unidad, p.presentacion, b.id, b.nombre, s.nombre,
         (public.stockly_mi_sucursal(_id_empresa) is not null and b.id_sucursal = public.stockly_mi_sucursal(_id_empresa)),
         case when b.tipo = 'principal'
              then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                 where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0), 0)
              else coalesce(sb.cantidad, 0) end
    from productos p
    join bodegas b on b.id_empresa = p.id_empresa
    left join sucursales s on s.id = b.id_sucursal
    left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id
    cross join t
   where p.id_empresa = _id_empresa and public.stockly_es_miembro(_id_empresa)
     and (t.x is null or p.descripcion ilike '%' || t.x || '%' or coalesce(p.nombre_completo, '') ilike '%' || t.x || '%'
          or coalesce(p.codigointerno::text, '') ilike '%' || t.x || '%' or coalesce(p.codigobarras::text, '') = t.x)
   order by p.descripcion, (b.tipo = 'principal') desc, b.nombre
   limit 600
$$;
grant execute on function public.stockly_stock_empresa(bigint, text) to authenticated;
