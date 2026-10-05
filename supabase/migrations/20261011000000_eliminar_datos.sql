-- =====================================================================
-- Stockly v3.7: eliminación de datos con verificación en dos pasos.
--
-- stockly_eliminar_datos borra lo que el dueño elija (ventas, compras,
-- inventario, bodegas extra, clientes, proveedores, notificaciones). Exige:
--   1. Ser dueño o administrador de la empresa.
--   2. Escribir el nombre exacto de la empresa.
--   3. Haber verificado un código enviado al correo en los últimos 10 minutos
--      (la sesión debe venir de ese código: se revisa el "amr" del token).
-- Se ejecuta todo o nada, y queda registrado en la auditoría (que no se borra).
-- Requiere 20261010000000_novandra_esencial.sql.
-- =====================================================================

-- Durante un borrado masivo no se auditan las filas una por una ni se avisa de stock bajo:
-- se registra un solo evento con el resumen.
create or replace function public.stockly_borrando()
returns boolean
language sql stable
as $$ select coalesce(current_setting('stockly.borrado', true), '') = 'on' $$;

create or replace function public.stockly_auditar(
  _id_empresa bigint, _accion text, _entidad text, _id_entidad bigint, _detalle jsonb,
  _id_producto bigint default null, _id_bodega bigint default null, _cantidad numeric default null, _alerta text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  _actor bigint := public.stockly_id_usuario();
  _hora int := extract(hour from now() at time zone 'America/Bogota');
begin
  if _id_empresa is null or public.stockly_borrando() then return; end if;
  -- Fuera de horario (antes de 6 a. m. o desde las 10 p. m.) se marca para revisión.
  if _alerta is null and _actor is not null and (_hora < 6 or _hora >= 22) then
    _alerta := 'Fuera de horario';
  end if;
  insert into auditoria (id_empresa, id_usuario, usuario_nombre, accion, entidad, id_entidad, id_producto, id_bodega,
                         id_sucursal, cantidad, detalle, alerta)
  values (_id_empresa, _actor, (select nullif(nombres, '') from "Usuarios" where id = _actor), _accion, _entidad,
          _id_entidad, _id_producto, _id_bodega, (select id_sucursal from bodegas where id = _id_bodega), _cantidad,
          coalesce(_detalle, '{}'::jsonb), _alerta);
end $$;
revoke execute on function public.stockly_auditar(bigint, text, text, bigint, jsonb, bigint, bigint, numeric, text) from public, anon, authenticated;

create or replace function public.tg_productos_stock_bajo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.stockly_borrando() then return new; end if;
  if new.stock <= coalesce(new.stock_minimo, 0) and old.stock > coalesce(old.stock_minimo, 0) then
    insert into public.notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
    values (new.id_empresa, 'stock_bajo', 'Stock bajo: ' || new.descripcion,
            'Quedan ' || trim_scale(new.stock) || ' unidades (mínimo ' || trim_scale(coalesce(new.stock_minimo, 0)) || ')',
            '/reportes/stock-bajo-minimo');
  end if;
  return new;
end $$;

-- Cuántos registros hay de cada tipo (para mostrar antes de borrar).
create or replace function public.stockly_conteo_datos(_id_empresa bigint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede ver esto'; end if;
  return jsonb_build_object(
    'ventas', (select count(*) from ventas where id_empresa = _id_empresa),
    'compras', (select count(*) from ordenes_compra where id_empresa = _id_empresa),
    'productos', (select count(*) from productos where id_empresa = _id_empresa),
    'movimientos', (select count(*) from kardex where id_empresa = _id_empresa),
    'categorias', (select count(*) from categorias where id_empresa = _id_empresa),
    'marcas', (select count(*) from marca where id_empresa = _id_empresa),
    'bodegas', (select count(*) from bodegas where id_empresa = _id_empresa and tipo <> 'principal'),
    'sucursales', (select count(*) from sucursales where id_empresa = _id_empresa)
                  - (case when exists (select 1 from sucursales where id_empresa = _id_empresa) then 1 else 0 end),
    'clientes', (select count(*) from clientes where id_empresa = _id_empresa),
    'proveedores', (select count(*) from proveedores where id_empresa = _id_empresa),
    'notificaciones', (select count(*) from notificaciones where id_empresa = _id_empresa));
end $$;
grant execute on function public.stockly_conteo_datos(bigint) to authenticated;

create or replace function public.stockly_eliminar_datos(_id_empresa bigint, _alcances text[], _confirmacion text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _validos text[] := array['ventas', 'compras', 'inventario', 'bodegas', 'clientes', 'proveedores', 'notificaciones'];
  _a text[] := coalesce(_alcances, '{}');
  _nombre text;
  _verificado boolean;
  _principal bigint;
  _sede_principal bigint;
  _res jsonb := '{}'::jsonb;
  _n int;
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede eliminar datos';
  end if;
  if not (_a <@ _validos) or cardinality(_a) = 0 then raise exception 'Elige qué datos eliminar'; end if;

  select nombre into _nombre from "Empresa" where id = _id_empresa;
  if public.stockly_norm(_confirmacion) is distinct from public.stockly_norm(_nombre) then
    raise exception 'El nombre de la empresa no coincide';
  end if;

  -- Segundo paso: la sesión debe venir de un código enviado al correo hace menos de 10 minutos.
  select exists (
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) e
     where e->>'method' in ('otp', 'magiclink', 'email')
       and (e->>'timestamp')::bigint >= extract(epoch from now())::bigint - 600
  ) into _verificado;
  if not _verificado then
    raise exception 'Verifica tu identidad con el código que enviamos a tu correo (válido por 10 minutos)';
  end if;

  -- Dependencias: las bodegas extra solo se borran sin ventas, compras ni inventario que las usen.
  if 'bodegas' = any(_a) then _a := array(select distinct unnest(_a || array['ventas', 'compras', 'inventario'])); end if;

  perform set_config('stockly.borrado', 'on', true);
  _principal := public.stockly_bodega_principal(_id_empresa);

  if 'ventas' = any(_a) then
    delete from ventas where id_empresa = _id_empresa;  -- detalle, pagos y facturas se borran en cascada
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('ventas', _n);
  end if;

  if 'compras' = any(_a) then
    delete from ordenes_compra where id_empresa = _id_empresa;
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('compras', _n);
  end if;

  if 'inventario' = any(_a) then
    delete from kardex where id_empresa = _id_empresa;
    delete from traslados where id_empresa = _id_empresa;
    delete from stock_bodega where id_bodega in (select id from bodegas where id_empresa = _id_empresa);
    delete from productos where id_empresa = _id_empresa;
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('productos', _n);
    delete from categorias where id_empresa = _id_empresa;
    delete from marca where id_empresa = _id_empresa;
    if to_regclass('public.novandra_aprendizaje') is not null then
      delete from novandra_aprendizaje where id_empresa = _id_empresa;
    end if;
  end if;

  if 'bodegas' = any(_a) then
    delete from bodegas where id_empresa = _id_empresa and tipo <> 'principal';
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('bodegas', _n);
    select id_sucursal into _sede_principal from bodegas where id = _principal;
    delete from sucursales where id_empresa = _id_empresa and id is distinct from _sede_principal;
  end if;

  if 'clientes' = any(_a) then
    delete from clientes where id_empresa = _id_empresa;
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('clientes', _n);
  end if;

  if 'proveedores' = any(_a) then
    delete from proveedores where id_empresa = _id_empresa;
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('proveedores', _n);
  end if;

  if 'notificaciones' = any(_a) then
    delete from notificaciones where id_empresa = _id_empresa;
    get diagnostics _n = row_count;
    _res := _res || jsonb_build_object('notificaciones', _n);
  end if;

  perform set_config('stockly.borrado', 'off', true);
  -- Un solo registro en la auditoría con lo que se borró (la auditoría nunca se borra).
  perform public.stockly_auditar(_id_empresa, 'datos_eliminados', 'empresa', _id_empresa,
                                 jsonb_build_object('alcances', to_jsonb(_a), 'eliminados', _res),
                                 null, null, null, 'Eliminación de datos');
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_id_empresa, 'sistema', 'Datos eliminados',
          'Se eliminaron: ' || array_to_string(_a, ', ') || '. Quedó registrado en la auditoría.', '/auditoria');
  return _res;
end $$;
revoke execute on function public.stockly_eliminar_datos(bigint, text[], text) from public, anon;
grant execute on function public.stockly_eliminar_datos(bigint, text[], text) to authenticated;
