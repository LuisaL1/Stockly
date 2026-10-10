-- Kardex: libro único e inmutable del inventario.
--  - Cada movimiento tiene fecha y hora (creado_en), origen (venta, anulacion, compra, importacion,
--    traslado, ajuste), referencia al documento que lo originó y, en los ajustes, motivo y nota.
--  - Nada se borra: un ajuste se anula con el movimiento contrario, enlazado con anula_a. Los
--    movimientos automáticos solo se revierten desde su origen (anular la venta, etc.).
--  - Los traslados entre bodegas dejan salida en origen y entrada en destino sin cambiar el total.
--  - stockly_kardex: consulta con filtros y saldo acumulado por producto y bodega.
--  - Un solo trigger mueve el stock; los heredados de la plantilla original (que impedían anular)
--    se eliminan.
-- Idempotente.

-- ---------------------------------------------------------------- 1. Columnas y datos existentes
alter table public.kardex add column if not exists creado_en timestamptz;
alter table public.kardex add column if not exists origen text;
alter table public.kardex add column if not exists referencia bigint;
alter table public.kardex add column if not exists motivo text;
alter table public.kardex add column if not exists nota text;
alter table public.kardex add column if not exists anula_a bigint references public.kardex(id) on delete set null;
alter table public.kardex alter column fecha set default current_date;
alter table public.kardex alter column estado set default 'activo';

-- Los movimientos antiguos no tenían hora: se ordenan por su fecha y, dentro del día, por id.
update public.kardex
   set creado_en = ((fecha::timestamp + interval '12 hours') at time zone 'America/Bogota') + (id % 86400) * interval '1 millisecond'
 where creado_en is null;
alter table public.kardex alter column creado_en set default now();
alter table public.kardex alter column creado_en set not null;

update public.kardex set tipo = 'Entrada' where lower(tipo) = 'entrada' and tipo <> 'Entrada';
update public.kardex set tipo = 'Salida' where lower(tipo) = 'salida' and tipo <> 'Salida';
update public.kardex set estado = 'activo' where estado is null;
update public.kardex set id_bodega = public.stockly_bodega_principal(id_empresa) where id_bodega is null;

update public.kardex
   set origen = case
     when detalle ~ '^Venta ' then 'venta'
     when detalle ~ '^Anulación ' then 'anulacion'
     when detalle ~ '^Orden de compra ' then 'compra'
     when detalle ~* 'importación' then 'importacion'
     else 'ajuste' end
 where origen is null;
update public.kardex k
   set referencia = v.id
  from public.ventas v
 where k.referencia is null and k.origen in ('venta', 'anulacion') and v.id_empresa = k.id_empresa
   and k.detalle = (case when k.origen = 'venta' then 'Venta ' else 'Anulación ' end) || v.prefijo || '-' || v.numero;
update public.kardex k
   set referencia = o.id
  from public.ordenes_compra o
 where k.referencia is null and k.origen = 'compra' and o.id_empresa = k.id_empresa
   and k.detalle = 'Orden de compra OC-' || o.numero;
update public.kardex set motivo = 'otro' where origen = 'ajuste' and motivo is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kardex_tipo_chk') then
    alter table public.kardex add constraint kardex_tipo_chk check (tipo in ('Entrada', 'Salida')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kardex_origen_chk') then
    alter table public.kardex add constraint kardex_origen_chk
      check (origen in ('venta', 'anulacion', 'compra', 'importacion', 'traslado', 'ajuste')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kardex_estado_chk') then
    alter table public.kardex add constraint kardex_estado_chk check (estado in ('activo', 'anulado')) not valid;
  end if;
end $$;
create index if not exists kardex_empresa_creado_idx on public.kardex (id_empresa, creado_en desc, id desc);
create index if not exists kardex_producto_bodega_idx on public.kardex (id_producto, id_bodega, creado_en, id);

-- ---------------------------------------------------------------- 2. Triggers heredados fuera
drop trigger if exists eliminarkardextrigger on public.kardex;
drop function if exists public.eliminarkardexdisparado();
drop trigger if exists modificarstocktrigger on public.kardex;
drop function if exists public.modificarstock();

-- ---------------------------------------------------------------- 3. Motivos de ajuste
create or replace function public.stockly_motivos_ajuste()
returns jsonb language sql immutable
as $$
  select '[
    {"id": "conteo",             "nombre": "Conteo físico",          "tipos": ["Entrada", "Salida"]},
    {"id": "inventario_inicial", "nombre": "Inventario inicial",     "tipos": ["Entrada"]},
    {"id": "devolucion",         "nombre": "Devolución de cliente",  "tipos": ["Entrada"]},
    {"id": "danado",             "nombre": "Producto dañado",        "tipos": ["Salida"]},
    {"id": "vencido",            "nombre": "Producto vencido",       "tipos": ["Salida"]},
    {"id": "perdida",            "nombre": "Pérdida o robo",         "tipos": ["Salida"]},
    {"id": "muestra",            "nombre": "Muestra o regalo",       "tipos": ["Salida"]},
    {"id": "uso_interno",        "nombre": "Uso interno",            "tipos": ["Salida"]},
    {"id": "correccion",         "nombre": "Corrección",             "tipos": ["Entrada", "Salida"]},
    {"id": "otro",               "nombre": "Otro",                   "tipos": ["Entrada", "Salida"]}
  ]'::jsonb
$$;

-- ---------------------------------------------------------------- 4. Trigger único: completa y mueve el stock
create or replace function public.tg_kardex_registrar()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _stock numeric;
  _nombre text;
begin
  new.tipo := case lower(coalesce(new.tipo, '')) when 'entrada' then 'Entrada' when 'salida' then 'Salida' end;
  if new.tipo is null then raise exception 'Tipo de movimiento no válido'; end if;
  if new.cantidad is null or new.cantidad <= 0 then raise exception 'La cantidad debe ser mayor que cero'; end if;
  if new.id_producto is null then raise exception 'Falta el producto del movimiento'; end if;
  if new.id_empresa is null then select id_empresa into new.id_empresa from productos where id = new.id_producto; end if;
  if new.id_bodega is null then new.id_bodega := public.stockly_bodega_principal(new.id_empresa); end if;
  if new.id_usuario is null then new.id_usuario := public.stockly_id_usuario(); end if;
  new.fecha := coalesce(new.fecha, current_date);
  new.creado_en := coalesce(new.creado_en, now());
  new.estado := coalesce(new.estado, 'activo');

  -- Las funciones de ventas, compras e importación describen el movimiento en "detalle".
  if new.origen is null then
    new.origen := case
      when new.detalle ~ '^Venta ' then 'venta'
      when new.detalle ~ '^Anulación ' then 'anulacion'
      when new.detalle ~ '^Orden de compra ' then 'compra'
      when new.detalle ~* 'importación' then 'importacion'
      else 'ajuste' end;
  end if;
  if new.referencia is null and new.origen in ('venta', 'anulacion') then
    select v.id into new.referencia from ventas v
     where v.id_empresa = new.id_empresa
       and new.detalle = (case when new.origen = 'venta' then 'Venta ' else 'Anulación ' end) || v.prefijo || '-' || v.numero
     order by v.id desc limit 1;
  elsif new.referencia is null and new.origen = 'compra' then
    select o.id into new.referencia from ordenes_compra o
     where o.id_empresa = new.id_empresa and new.detalle = 'Orden de compra OC-' || o.numero
     order by o.id desc limit 1;
  end if;
  if new.origen = 'ajuste' and new.motivo is null then new.motivo := 'otro'; end if;

  -- Stock total del producto. Un traslado no lo cambia: solo mueve unidades entre bodegas.
  if new.origen <> 'traslado' then
    if new.tipo = 'Entrada' then
      update productos set stock = coalesce(stock, 0) + new.cantidad where id = new.id_producto;
    else
      select coalesce(stock, 0), descripcion into _stock, _nombre from productos where id = new.id_producto for update;
      if _stock < new.cantidad then
        raise exception 'Stock insuficiente de % (disponible: %)', _nombre, trim_scale(_stock);
      end if;
      update productos set stock = _stock - new.cantidad where id = new.id_producto;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists kardex_registrar on public.kardex;
create trigger kardex_registrar before insert on public.kardex
  for each row execute function public.tg_kardex_registrar();

-- Los movimientos no se borran (solo al eliminar todos los datos de la empresa).
create or replace function public.tg_kardex_no_borrar()
returns trigger language plpgsql
as $$
begin
  if public.stockly_borrando() then return old; end if;
  raise exception 'Los movimientos del kardex no se borran. Anula el ajuste y quedará el movimiento contrario.';
end $$;
drop trigger if exists kardex_no_borrar on public.kardex;
create trigger kardex_no_borrar before delete on public.kardex
  for each row execute function public.tg_kardex_no_borrar();

-- Auditoría: solo los ajustes manuales (ventas, compras y traslados se auditan en su origen).
create or replace function public.tg_auditar_kardex()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _actor bigint := public.stockly_id_usuario();
  _alerta text;
begin
  if tg_op <> 'INSERT' or new.origen <> 'ajuste' then return null; end if;
  if _actor is not null and new.id_usuario is distinct from _actor then
    _alerta := 'Registrado a nombre de otro usuario';
  end if;
  perform public.stockly_auditar(
    new.id_empresa,
    case when new.anula_a is not null then 'movimiento_eliminado'
         when new.tipo = 'Salida' then 'salida_manual' else 'entrada_manual' end,
    'kardex'::text, new.id::bigint,
    jsonb_build_object('tipo', new.tipo, 'detalle', new.detalle, 'motivo', new.motivo, 'nota', new.nota,
                       'fecha_movimiento', new.creado_en, 'usuario_declarado', new.id_usuario, 'anula_a', new.anula_a,
                       'producto', (select descripcion from productos where id = new.id_producto)),
    new.id_producto::bigint, new.id_bodega::bigint, new.cantidad::numeric, _alerta::text);
  return null;
end $$;
drop trigger if exists auditar_kardex on public.kardex;
create trigger auditar_kardex after insert on public.kardex
  for each row execute function public.tg_auditar_kardex();

-- ---------------------------------------------------------------- 5. Traslados: también pasan por el kardex
create or replace function public.trasladar_stock(_id_producto bigint, _id_origen bigint, _id_destino bigint, _cantidad numeric, _nota text default null)
returns void language plpgsql security definer set search_path = public
as $$
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
end $$;

-- Traslados hechos antes de esta versión: se registran en el kardex sin volver a mover stock.
alter table public.kardex disable trigger kardex_registrar;
alter table public.kardex disable trigger kardex_bodega_antes;
alter table public.kardex disable trigger kardex_bodega_despues;
alter table public.kardex disable trigger auditar_kardex;
insert into public.kardex (fecha, creado_en, tipo, id_usuario, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, referencia, nota, estado)
select (coalesce(t.fecha, now()) at time zone 'America/Bogota')::date, coalesce(t.fecha, now()), 'Salida', t.id_usuario, t.cantidad,
       'Traslado a ' || d.nombre, t.id_empresa, t.id_producto, t.id_origen, 'traslado', t.id, t.nota, 'activo'
  from public.traslados t join public.bodegas d on d.id = t.id_destino
 where t.cantidad > 0 and not exists (select 1 from public.kardex k where k.origen = 'traslado' and k.referencia = t.id)
union all
select (coalesce(t.fecha, now()) at time zone 'America/Bogota')::date, coalesce(t.fecha, now()), 'Entrada', t.id_usuario, t.cantidad,
       'Traslado desde ' || o.nombre, t.id_empresa, t.id_producto, t.id_destino, 'traslado', t.id, t.nota, 'activo'
  from public.traslados t join public.bodegas o on o.id = t.id_origen
 where t.cantidad > 0 and not exists (select 1 from public.kardex k where k.origen = 'traslado' and k.referencia = t.id);
alter table public.kardex enable trigger kardex_registrar;
alter table public.kardex enable trigger kardex_bodega_antes;
alter table public.kardex enable trigger kardex_bodega_despues;
alter table public.kardex enable trigger auditar_kardex;

-- ---------------------------------------------------------------- 6. Ajustes manuales y anulación
create or replace function public.stockly_registrar_ajuste(
  _id_empresa bigint, _id_producto bigint, _id_bodega bigint, _tipo text, _cantidad numeric, _motivo text, _nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
end $$;

create or replace function public.stockly_anular_movimiento(_id bigint, _nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _k public.kardex;
  _nuevo bigint;
  _disponible numeric;
begin
  select * into _k from kardex where id = _id for update;
  if not found or not public.stockly_es_miembro(_k.id_empresa) then raise exception 'Movimiento no encontrado'; end if;
  if _k.origen <> 'ajuste' then
    raise exception 'Este movimiento viene de %. Revísalo desde allí.',
      case _k.origen when 'venta' then 'una venta' when 'anulacion' then 'la anulación de una venta'
                     when 'compra' then 'una orden de compra' when 'importacion' then 'una importación'
                     when 'traslado' then 'un traslado' else _k.origen end;
  end if;
  if _k.anula_a is not null then raise exception 'Este movimiento ya es una anulación'; end if;
  if _k.estado <> 'activo' then raise exception 'El movimiento ya está anulado'; end if;
  if _k.tipo = 'Entrada' then
    _disponible := public.stockly_disponible(_k.id_bodega, _k.id_producto);
    if _disponible < _k.cantidad then
      raise exception 'No se puede anular: ya se usaron esas unidades (disponible: %)', trim_scale(_disponible);
    end if;
  end if;

  insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, motivo, nota, anula_a)
  values (case when _k.tipo = 'Entrada' then 'Salida' else 'Entrada' end, _k.cantidad,
          'Anulación del ajuste: ' || coalesce(_k.detalle, ''), _k.id_empresa, _k.id_producto, _k.id_bodega,
          'ajuste', 'anulacion', nullif(btrim(_nota), ''), _id)
  returning id into _nuevo;
  update kardex set estado = 'anulado' where id = _id;
  return jsonb_build_object('id', _nuevo);
end $$;

-- ---------------------------------------------------------------- 7. Consulta con saldo
-- _filtros: { id_producto?, id_bodega?, tipo?, origen?, desde? (YYYY-MM-DD), hasta?, texto?, limite?, desplazamiento? }
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
           p.descripcion as producto, p.codigointerno as codigo, b.nombre as bodega, u.nombres as usuario,
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
       and (_texto is null or p.descripcion ilike '%' || _texto || '%' or coalesce(m.detalle, '') ilike '%' || _texto || '%'
            or coalesce(p.codigointerno::text, '') ilike '%' || _texto || '%')
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

-- ---------------------------------------------------------------- 8. Permisos
-- Los movimientos se escriben solo con las funciones; se leen por empresa.
drop policy if exists "Enable delete for users based on user_id" on public.kardex;
drop policy if exists "Enable insert for authenticated users only" on public.kardex;
drop policy if exists "Enable read access for all users" on public.kardex;
drop policy if exists kardex_leer on public.kardex;
create policy kardex_leer on public.kardex for select to authenticated using (public.stockly_es_miembro(id_empresa));
alter table public.kardex enable row level security;

grant execute on function public.stockly_motivos_ajuste() to authenticated;
grant execute on function public.stockly_registrar_ajuste(bigint, bigint, bigint, text, numeric, text, text) to authenticated;
grant execute on function public.stockly_anular_movimiento(bigint, text) to authenticated;
grant execute on function public.stockly_kardex(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------- 9. Saldo de apertura
-- El stock con el que se creó cada producto no pasaba por el kardex, así que el saldo acumulado
-- no cuadraba con el stock real. De ahora en adelante el stock inicial entra como movimiento, y
-- para lo existente se registra un "Inventario inicial" por bodega con la diferencia.
create or replace function public.insertarproductos(
  _descripcion text, _idmarca integer, _stock numeric, _stock_minimo numeric, _codigobarras text, _codigointerno text,
  _precioventa numeric, _preciocompra numeric, _id_categoria integer, _id_empresa integer)
returns text language plpgsql security definer set search_path = public
as $$
declare
  _id bigint;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  if exists (select 1 from productos where descripcion = _descripcion and id_empresa = _id_empresa) then
    return 'duplicado';
  end if;
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa)
  values (_descripcion, _idmarca, 0, _stock_minimo, nullif(btrim(_codigobarras), ''), _codigointerno, _precioventa, _preciocompra, _id_categoria, _id_empresa)
  returning id into _id;
  if coalesce(_stock, 0) > 0 then
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, origen, motivo)
    values ('Entrada', _stock, 'Inventario inicial', _id_empresa, _id, 'ajuste', 'inventario_inicial');
  end if;
  return 'insertado';
end $$;

alter table public.kardex disable trigger kardex_registrar;
alter table public.kardex disable trigger kardex_bodega_antes;
alter table public.kardex disable trigger kardex_bodega_despues;
alter table public.kardex disable trigger auditar_kardex;
insert into public.kardex (fecha, creado_en, tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, motivo, estado)
select (d.inicio at time zone 'America/Bogota')::date, d.inicio, case when d.diferencia > 0 then 'Entrada' else 'Salida' end, abs(d.diferencia),
       'Inventario inicial', d.id_empresa, d.id_producto, d.id_bodega, 'ajuste', 'inventario_inicial', 'activo'
  from (
    select v.id_empresa, v.id_producto, v.id_bodega,
           v.cantidad - coalesce((select sum(case when k.tipo = 'Entrada' then k.cantidad else -k.cantidad end)
                                    from public.kardex k where k.id_producto = v.id_producto and k.id_bodega = v.id_bodega), 0) as diferencia,
           coalesce((select min(k.creado_en) from public.kardex k where k.id_producto = v.id_producto), now()) - interval '1 minute' as inicio
      from public.v_stock_bodega v
  ) d
 where d.diferencia <> 0;
alter table public.kardex enable trigger kardex_registrar;
alter table public.kardex enable trigger kardex_bodega_antes;
alter table public.kardex enable trigger kardex_bodega_despues;
alter table public.kardex enable trigger auditar_kardex;
