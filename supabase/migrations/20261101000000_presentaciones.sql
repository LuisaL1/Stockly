-- Presentación ≠ unidad de medida.
--  - unidad: cómo se cuenta o mide el stock (und, par, docena, g, kg, lb, ml, l, galon, cm, m, m2).
--  - presentacion (opcional, para lo que se cuenta por piezas): frasco, botella, caja, paquete, bolsa,
--    sobre, lata, tarro, tubo, blister, rollo, bulto, kit... con su contenido (100 ml, 500 g, 12 und).
--  Lo que estaba guardado como "frasco", "caja", etc. en la unidad pasa a presentación.
-- Idempotente.

-- ---------------------------------------------------------------- 1. Catálogos
create or replace function public.stockly_unidades()
returns jsonb language sql immutable
as $$
  select '[
    {"id": "und",    "nombre": "Unidad",         "plural": "Unidades",         "abrev": "und", "decimales": false},
    {"id": "par",    "nombre": "Par",            "plural": "Pares",            "abrev": "par", "decimales": false},
    {"id": "docena", "nombre": "Docena",         "plural": "Docenas",          "abrev": "doc", "decimales": false},
    {"id": "g",      "nombre": "Gramo",          "plural": "Gramos",           "abrev": "g",   "decimales": true},
    {"id": "kg",     "nombre": "Kilogramo",      "plural": "Kilogramos",       "abrev": "kg",  "decimales": true},
    {"id": "lb",     "nombre": "Libra",          "plural": "Libras",           "abrev": "lb",  "decimales": true},
    {"id": "ml",     "nombre": "Mililitro",      "plural": "Mililitros",       "abrev": "ml",  "decimales": true},
    {"id": "l",      "nombre": "Litro",          "plural": "Litros",           "abrev": "l",   "decimales": true},
    {"id": "galon",  "nombre": "Galón",          "plural": "Galones",          "abrev": "gal", "decimales": true},
    {"id": "cm",     "nombre": "Centímetro",     "plural": "Centímetros",      "abrev": "cm",  "decimales": true},
    {"id": "m",      "nombre": "Metro",          "plural": "Metros",           "abrev": "m",   "decimales": true},
    {"id": "m2",     "nombre": "Metro cuadrado", "plural": "Metros cuadrados", "abrev": "m²",  "decimales": true}
  ]'::jsonb
$$;

create or replace function public.stockly_presentaciones()
returns jsonb language sql immutable
as $$
  select '[
    {"id": "frasco",  "nombre": "Frasco",  "plural": "Frascos"},
    {"id": "botella", "nombre": "Botella", "plural": "Botellas"},
    {"id": "caja",    "nombre": "Caja",    "plural": "Cajas"},
    {"id": "paquete", "nombre": "Paquete", "plural": "Paquetes"},
    {"id": "bolsa",   "nombre": "Bolsa",   "plural": "Bolsas"},
    {"id": "sobre",   "nombre": "Sobre",   "plural": "Sobres"},
    {"id": "lata",    "nombre": "Lata",    "plural": "Latas"},
    {"id": "tarro",   "nombre": "Tarro",   "plural": "Tarros"},
    {"id": "tubo",    "nombre": "Tubo",    "plural": "Tubos"},
    {"id": "blister", "nombre": "Blíster", "plural": "Blísters"},
    {"id": "rollo",   "nombre": "Rollo",   "plural": "Rollos"},
    {"id": "bulto",   "nombre": "Bulto",   "plural": "Bultos"},
    {"id": "kit",     "nombre": "Kit",     "plural": "Kits"},
    {"id": "pieza",   "nombre": "Pieza",   "plural": "Piezas"}
  ]'::jsonb
$$;

create or replace function public.stockly_unidades_sector(_sector text)
returns text[] language sql immutable
as $$
  select case
    when _sector ilike 'Moda%' then array['und', 'par', 'docena', 'm']
    when _sector ilike 'Alimentos%' then array['und', 'g', 'kg', 'lb', 'ml', 'l']
    when _sector ilike 'Tecnolog%' then array['und', 'm']
    when _sector ilike 'Ferreter%' then array['und', 'kg', 'g', 'lb', 'm', 'cm', 'm2', 'galon', 'l']
    when _sector ilike 'Salud%' then array['und', 'ml', 'l', 'g', 'kg']
    when _sector ilike 'Hogar%' then array['und', 'par', 'm', 'm2']
    when _sector ilike 'Papeler%' then array['und', 'docena', 'm']
    when _sector ilike 'Mascotas%' then array['und', 'kg', 'g', 'lb', 'l']
    else (select array_agg(u->>'id') from jsonb_array_elements(public.stockly_unidades()) u)
  end
$$;

create or replace function public.stockly_unidad_id(_texto text)
returns text language sql immutable
as $$
  with t as (select public.stockly_norm(coalesce(_texto, '')) as x)
  select coalesce(
    (select u->>'id' from jsonb_array_elements(public.stockly_unidades()) u, t
      where t.x <> '' and (public.stockly_norm(u->>'id') = t.x or public.stockly_norm(u->>'nombre') = t.x
                           or public.stockly_norm(u->>'plural') = t.x or public.stockly_norm(u->>'abrev') = t.x)
      limit 1),
    case (select x from t) when 'gr' then 'g' when 'grs' then 'g' when 'gramo' then 'g' when 'kilo' then 'kg' when 'kilos' then 'kg'
         when 'litro' then 'l' when 'lt' then 'l' when 'lts' then 'l' when 'mililitro' then 'ml' when 'unidad' then 'und'
         when 'unidades' then 'und' when 'u' then 'und' when 'pcs' then 'und' when 'pza' then 'und' when 'mts' then 'm' when 'mt' then 'm' end)
$$;

create or replace function public.stockly_presentacion_id(_texto text)
returns text language sql immutable
as $$
  with t as (select public.stockly_norm(coalesce(_texto, '')) as x)
  select (select p->>'id' from jsonb_array_elements(public.stockly_presentaciones()) p, t
           where t.x <> '' and (public.stockly_norm(p->>'id') = t.x or public.stockly_norm(p->>'nombre') = t.x or public.stockly_norm(p->>'plural') = t.x)
           limit 1)
$$;

-- "100 ml", "500g", "12 und" -> (cantidad, unidad)
create or replace function public.stockly_parsear_contenido(_texto text, out cantidad numeric, out unidad text)
language plpgsql immutable
as $$
declare _m text[];
begin
  _m := regexp_match(coalesce(_texto, ''), '^\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z²]*)');
  if _m is null or _m[1] is null then return; end if;
  cantidad := replace(_m[1], ',', '.')::numeric;
  unidad := coalesce(public.stockly_unidad_id(nullif(_m[2], '')), 'und');
end $$;

-- ---------------------------------------------------------------- 2. Columnas y datos existentes
alter table public.productos add column if not exists presentacion text;
alter table public.productos add column if not exists contenido numeric;
alter table public.productos add column if not exists contenido_unidad text;
alter table public.detalle_venta add column if not exists presentacion text;
alter table public.red_envios_detalle add column if not exists presentacion text;
alter table public.red_envios_detalle add column if not exists contenido numeric;
alter table public.red_envios_detalle add column if not exists contenido_unidad text;

-- Lo que estaba como unidad "frasco", "caja"... era la presentación.
update public.productos set presentacion = unidad, unidad = 'und'
 where unidad in ('frasco', 'botella', 'caja', 'paquete', 'sobre', 'rollo');
update public.detalle_venta set presentacion = unidad, unidad = 'und'
 where unidad in ('frasco', 'botella', 'caja', 'paquete', 'sobre', 'rollo');
update public.red_envios_detalle set presentacion = unidad, unidad = 'und'
 where unidad in ('frasco', 'botella', 'caja', 'paquete', 'sobre', 'rollo');
update public."Empresa"
   set unidades = (select array_agg(x) from unnest(unidades) x where x in ('und','par','docena','g','kg','lb','ml','l','galon','cm','m','m2')),
       unidad_predeterminada = case when unidad_predeterminada in ('und','par','docena','g','kg','lb','ml','l','galon','cm','m','m2') then unidad_predeterminada else 'und' end
 where unidades is not null or unidad_predeterminada not in ('und','par','docena','g','kg','lb','ml','l','galon','cm','m','m2');

alter table public.productos drop constraint if exists productos_unidad_chk;
alter table public.productos add constraint productos_unidad_chk
  check (unidad in ('und','par','docena','g','kg','lb','ml','l','galon','cm','m','m2')) not valid;
alter table public.productos drop constraint if exists productos_presentacion_chk;
alter table public.productos add constraint productos_presentacion_chk
  check (presentacion is null or presentacion in ('frasco','botella','caja','paquete','bolsa','sobre','lata','tarro','tubo','blister','rollo','bulto','kit','pieza')) not valid;

create or replace function public.tg_detalle_venta_unidad()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.id_producto is not null and (new.unidad is null or new.presentacion is null) then
    select coalesce(new.unidad, unidad), coalesce(new.presentacion, presentacion) into new.unidad, new.presentacion
      from productos where id = new.id_producto;
  end if;
  return new;
end $$;
update public.detalle_venta d set presentacion = p.presentacion from public.productos p where p.id = d.id_producto and d.presentacion is null and p.presentacion is not null;

-- ---------------------------------------------------------------- 3. Funciones de productos
create or replace function public.stockly_unidades_empresa(_id_empresa bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  _e public."Empresa";
  _activas text[];
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  select * into _e from "Empresa" where id = _id_empresa;
  _activas := coalesce(_e.unidades, public.stockly_unidades_sector(_e.sector));
  select array_agg(distinct x) into _activas
    from (select unnest(_activas) x union select unidad from productos where id_empresa = _id_empresa) t;
  return jsonb_build_object(
    'predeterminada', case when _e.unidad_predeterminada = any(_activas) then _e.unidad_predeterminada else coalesce(_activas[1], 'und') end,
    'personalizadas', _e.unidades is not null,
    'activas', (select coalesce(jsonb_agg(u), '[]'::jsonb) from jsonb_array_elements(public.stockly_unidades()) u where (u->>'id') = any(_activas)),
    'todas', public.stockly_unidades(),
    'presentaciones', public.stockly_presentaciones());
end $$;

drop function if exists public.insertarproductos(text, integer, numeric, numeric, text, text, numeric, numeric, integer, integer, text);
create or replace function public.insertarproductos(
  _descripcion text, _idmarca integer, _stock numeric, _stock_minimo numeric, _codigobarras text, _codigointerno text,
  _precioventa numeric, _preciocompra numeric, _id_categoria integer, _id_empresa integer, _unidad text default null,
  _presentacion text default null, _contenido numeric default null, _contenido_unidad text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  _id bigint;
  _u text := public.stockly_unidad_id(_unidad);
  _p text := coalesce(public.stockly_presentacion_id(_presentacion), public.stockly_presentacion_id(_unidad));
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  if _u is null then _u := coalesce((select unidad_predeterminada from "Empresa" where id = _id_empresa), 'und'); end if;
  -- Una presentación solo aplica a lo que se cuenta por piezas.
  if _p is not null and _u not in ('und', 'par', 'docena') then _u := 'und'; end if;
  if exists (select 1 from productos where descripcion = _descripcion and id_empresa = _id_empresa) then
    return 'duplicado';
  end if;
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa,
                         unidad, presentacion, contenido, contenido_unidad)
  values (_descripcion, _idmarca, 0, _stock_minimo, nullif(btrim(_codigobarras), ''), _codigointerno, _precioventa, _preciocompra, _id_categoria, _id_empresa,
          _u, _p, case when _p is not null then _contenido end, case when _p is not null and _contenido is not null then coalesce(public.stockly_unidad_id(_contenido_unidad), 'und') end)
  returning id into _id;
  if coalesce(_stock, 0) > 0 then
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, origen, motivo)
    values ('Entrada', _stock, 'Inventario inicial', _id_empresa, _id, 'ajuste', 'inventario_inicial');
  end if;
  return 'insertado';
end $$;
grant execute on function public.insertarproductos(text, integer, numeric, numeric, text, text, numeric, numeric, integer, integer, text, text, numeric, text) to authenticated;

drop function if exists public.mostrarproductos(integer);
create or replace function public.mostrarproductos(_id_empresa integer)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text,
  unidad text, presentacion text, contenido numeric, contenido_unidad text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad, p.presentacion, p.contenido, p.contenido_unidad
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
  unidad text, presentacion text, contenido numeric, contenido_unidad text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad, p.presentacion, p.contenido, p.contenido_unidad
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

create or replace view public.v_stock_bodega as
 select b.id as id_bodega, b.id_empresa, b.nombre as bodega, b.tipo, p.id as id_producto, p.descripcion, p.stock_minimo,
        p.precioventa, p.preciocompra,
        case when b.tipo = 'principal'
             then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0::numeric), 0::numeric)
             else coalesce(sb.cantidad, 0::numeric) end as cantidad,
        p.unidad, p.presentacion, p.contenido, p.contenido_unidad
   from bodegas b
   join productos p on p.id_empresa = b.id_empresa
   left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id;

-- Kardex: la fila lleva presentación y contenido del producto.
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
           p.descripcion as producto, p.codigointerno as codigo, p.unidad, p.presentacion, p.contenido, p.contenido_unidad,
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

-- Red: el producto creado al recibir conserva unidad, presentación y contenido.
create or replace function public.stockly_red_crear_producto(_id_empresa bigint, _descripcion text, _codigointerno text, _codigobarras text,
  _precioventa numeric, _preciocompra numeric, _categoria text, _marca text, _stock_minimo numeric default 0, _unidad text default null,
  _presentacion text default null, _contenido numeric default null, _contenido_unidad text default null)
returns bigint language plpgsql security definer set search_path = public
as $$
declare
  _cat bigint;
  _mar bigint;
  _id bigint;
  _desc text := btrim(_descripcion);
begin
  select id into _cat from categorias where id_empresa = _id_empresa and public.stockly_norm(descripcion) = public.stockly_norm(coalesce(nullif(btrim(_categoria), ''), 'General')) limit 1;
  if _cat is null then
    insert into categorias (descripcion, color, id_empresa) values (coalesce(nullif(btrim(_categoria), ''), 'General'), '#8800B3', _id_empresa) returning id into _cat;
  end if;
  select id into _mar from marca where id_empresa = _id_empresa and public.stockly_norm(descripcion) = public.stockly_norm(coalesce(nullif(btrim(_marca), ''), 'Genérica')) limit 1;
  if _mar is null then
    insert into marca (descripcion, id_empresa) values (coalesce(nullif(btrim(_marca), ''), 'Genérica'), _id_empresa) returning id into _mar;
  end if;
  if exists (select 1 from productos where id_empresa = _id_empresa and descripcion = _desc) then
    _desc := _desc || ' (' || coalesce(nullif(btrim(_codigointerno), ''), nullif(btrim(_codigobarras), ''), 'red') || ')';
  end if;
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa,
                         unidad, presentacion, contenido, contenido_unidad)
  values (_desc, _mar, 0, coalesce(_stock_minimo, 0), nullif(btrim(_codigobarras), ''), nullif(btrim(_codigointerno), ''),
          coalesce(_precioventa, 0), coalesce(_preciocompra, 0), _cat, _id_empresa,
          coalesce(public.stockly_unidad_id(_unidad), 'und'), public.stockly_presentacion_id(_presentacion), _contenido, public.stockly_unidad_id(_contenido_unidad))
  returning id into _id;
  return _id;
end $$;
drop function if exists public.stockly_red_crear_producto(bigint, text, text, text, numeric, numeric, text, text, numeric, text);

grant execute on function public.stockly_presentaciones() to authenticated;
