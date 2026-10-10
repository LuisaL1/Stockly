-- Unidades de medida: el inventario se adapta al negocio.
--  - Cada producto tiene una unidad (und, par, caja, frasco, g, kg, ml, l, m...). Las de peso,
--    volumen y longitud admiten decimales (250 g, 1,5 l).
--  - Cada empresa activa las unidades que usa (preajuste según su sector) y fija la predeterminada.
--  - La unidad viaja con el producto: lista, caja, kardex, factura, Excel, red de empresas y Novandra.
-- Idempotente.

-- ---------------------------------------------------------------- 1. Catálogo
create or replace function public.stockly_unidades()
returns jsonb language sql immutable
as $$
  select '[
    {"id": "und",     "nombre": "Unidad",    "plural": "Unidades",   "abrev": "und",  "decimales": false},
    {"id": "par",     "nombre": "Par",       "plural": "Pares",      "abrev": "par",  "decimales": false},
    {"id": "docena",  "nombre": "Docena",    "plural": "Docenas",    "abrev": "doc",  "decimales": false},
    {"id": "paquete", "nombre": "Paquete",   "plural": "Paquetes",   "abrev": "paq",  "decimales": false},
    {"id": "caja",    "nombre": "Caja",      "plural": "Cajas",      "abrev": "caja", "decimales": false},
    {"id": "frasco",  "nombre": "Frasco",    "plural": "Frascos",    "abrev": "fco",  "decimales": false},
    {"id": "botella", "nombre": "Botella",   "plural": "Botellas",   "abrev": "bot",  "decimales": false},
    {"id": "sobre",   "nombre": "Sobre",     "plural": "Sobres",     "abrev": "sob",  "decimales": false},
    {"id": "rollo",   "nombre": "Rollo",     "plural": "Rollos",     "abrev": "rollo","decimales": false},
    {"id": "g",       "nombre": "Gramo",     "plural": "Gramos",     "abrev": "g",    "decimales": true},
    {"id": "kg",      "nombre": "Kilogramo", "plural": "Kilogramos", "abrev": "kg",   "decimales": true},
    {"id": "lb",      "nombre": "Libra",     "plural": "Libras",     "abrev": "lb",   "decimales": true},
    {"id": "ml",      "nombre": "Mililitro", "plural": "Mililitros", "abrev": "ml",   "decimales": true},
    {"id": "l",       "nombre": "Litro",     "plural": "Litros",     "abrev": "l",    "decimales": true},
    {"id": "galon",   "nombre": "Galón",     "plural": "Galones",    "abrev": "gal",  "decimales": true},
    {"id": "cm",      "nombre": "Centímetro","plural": "Centímetros","abrev": "cm",   "decimales": true},
    {"id": "m",       "nombre": "Metro",     "plural": "Metros",     "abrev": "m",    "decimales": true},
    {"id": "m2",      "nombre": "Metro cuadrado", "plural": "Metros cuadrados", "abrev": "m²", "decimales": true}
  ]'::jsonb
$$;

-- Unidades típicas por sector (lo que activa una empresa nueva o al elegir "las de mi sector").
create or replace function public.stockly_unidades_sector(_sector text)
returns text[] language sql immutable
as $$
  select case
    when _sector ilike 'Moda%' then array['und', 'par', 'docena', 'paquete', 'm']
    when _sector ilike 'Alimentos%' then array['und', 'g', 'kg', 'lb', 'ml', 'l', 'paquete', 'caja', 'botella']
    when _sector ilike 'Tecnolog%' then array['und', 'caja', 'paquete', 'm']
    when _sector ilike 'Ferreter%' then array['und', 'kg', 'g', 'lb', 'm', 'cm', 'm2', 'rollo', 'galon', 'l', 'caja', 'paquete']
    when _sector ilike 'Salud%' then array['und', 'frasco', 'botella', 'ml', 'l', 'g', 'kg', 'sobre', 'paquete', 'caja']
    when _sector ilike 'Hogar%' then array['und', 'par', 'm', 'm2', 'paquete', 'caja', 'rollo']
    when _sector ilike 'Papeler%' then array['und', 'paquete', 'caja', 'docena', 'rollo', 'm']
    when _sector ilike 'Mascotas%' then array['und', 'kg', 'g', 'lb', 'paquete', 'sobre', 'l']
    else (select array_agg(u->>'id') from jsonb_array_elements(public.stockly_unidades()) u)
  end
$$;

-- Normaliza lo que escriba una persona ("Gramos", "gr", "KG", "frascos") al id de la unidad.
create or replace function public.stockly_unidad_id(_texto text)
returns text language sql immutable
as $$
  with t as (select public.stockly_norm(coalesce(_texto, '')) as x)
  select coalesce(
    (select u->>'id' from jsonb_array_elements(public.stockly_unidades()) u, t
      where t.x <> '' and (public.stockly_norm(u->>'id') = t.x or public.stockly_norm(u->>'nombre') = t.x
                           or public.stockly_norm(u->>'plural') = t.x or public.stockly_norm(u->>'abrev') = t.x)
      limit 1),
    case (select x from t) when 'gr' then 'g' when 'gramo' then 'g' when 'kilo' then 'kg' when 'kilos' then 'kg'
         when 'litro' then 'l' when 'lt' then 'l' when 'lts' then 'l' when 'mililitro' then 'ml' when 'unidad' then 'und'
         when 'unidades' then 'und' when 'u' then 'und' when 'pcs' then 'und' when 'pza' then 'und' when 'pieza' then 'und' end)
$$;

-- ---------------------------------------------------------------- 2. Columnas
alter table public.productos add column if not exists unidad text not null default 'und';
alter table public."Empresa" add column if not exists unidades text[];
alter table public."Empresa" add column if not exists unidad_predeterminada text not null default 'und';
alter table public.detalle_venta add column if not exists unidad text;
alter table public.red_envios_detalle add column if not exists unidad text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'productos_unidad_chk') then
    alter table public.productos add constraint productos_unidad_chk
      check (unidad in ('und','par','docena','paquete','caja','frasco','botella','sobre','rollo','g','kg','lb','ml','l','galon','cm','m','m2')) not valid;
  end if;
end $$;

-- La línea de venta recuerda la unidad del producto (para facturas y mensajes).
create or replace function public.tg_detalle_venta_unidad()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.unidad is null and new.id_producto is not null then
    select unidad into new.unidad from productos where id = new.id_producto;
  end if;
  return new;
end $$;
drop trigger if exists detalle_venta_unidad on public.detalle_venta;
create trigger detalle_venta_unidad before insert on public.detalle_venta
  for each row execute function public.tg_detalle_venta_unidad();
update public.detalle_venta d set unidad = p.unidad from public.productos p where p.id = d.id_producto and d.unidad is null;

-- ---------------------------------------------------------------- 3. Configuración por empresa
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
  -- Las unidades que ya usan los productos siempre están activas.
  select array_agg(distinct x) into _activas
    from (select unnest(_activas) x union select unidad from productos where id_empresa = _id_empresa) t;
  return jsonb_build_object(
    'predeterminada', case when _e.unidad_predeterminada = any(_activas) then _e.unidad_predeterminada else coalesce(_activas[1], 'und') end,
    'personalizadas', _e.unidades is not null,
    'activas', (select coalesce(jsonb_agg(u) , '[]'::jsonb) from jsonb_array_elements(public.stockly_unidades()) u where (u->>'id') = any(_activas)),
    'todas', public.stockly_unidades());
end $$;

create or replace function public.stockly_config_unidades(_id_empresa bigint, _unidades text[], _predeterminada text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _validas text[] := (select array_agg(u->>'id') from jsonb_array_elements(public.stockly_unidades()) u);
  _limpias text[];
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede configurar las unidades'; end if;
  select array_agg(distinct x) into _limpias from unnest(coalesce(_unidades, '{}')) x where x = any(_validas);
  if _limpias is null or cardinality(_limpias) = 0 then raise exception 'Activa al menos una unidad'; end if;
  if _predeterminada is not null and not (_predeterminada = any(_limpias)) then
    raise exception 'La unidad predeterminada debe estar activa';
  end if;
  update "Empresa" set unidades = _limpias, unidad_predeterminada = coalesce(_predeterminada, unidad_predeterminada) where id = _id_empresa;
  return public.stockly_unidades_empresa(_id_empresa);
end $$;

-- ---------------------------------------------------------------- 4. Productos con unidad
drop function if exists public.insertarproductos(text, integer, numeric, numeric, text, text, numeric, numeric, integer, integer);
create or replace function public.insertarproductos(
  _descripcion text, _idmarca integer, _stock numeric, _stock_minimo numeric, _codigobarras text, _codigointerno text,
  _precioventa numeric, _preciocompra numeric, _id_categoria integer, _id_empresa integer, _unidad text default null)
returns text language plpgsql security definer set search_path = public
as $$
declare
  _id bigint;
  _u text := coalesce(public.stockly_unidad_id(_unidad), (select unidad_predeterminada from "Empresa" where id = _id_empresa), 'und');
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  if exists (select 1 from productos where descripcion = _descripcion and id_empresa = _id_empresa) then
    return 'duplicado';
  end if;
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa, unidad)
  values (_descripcion, _idmarca, 0, _stock_minimo, nullif(btrim(_codigobarras), ''), _codigointerno, _precioventa, _preciocompra, _id_categoria, _id_empresa, _u)
  returning id into _id;
  if coalesce(_stock, 0) > 0 then
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, origen, motivo)
    values ('Entrada', _stock, 'Inventario inicial', _id_empresa, _id, 'ajuste', 'inventario_inicial');
  end if;
  return 'insertado';
end $$;
grant execute on function public.insertarproductos(text, integer, numeric, numeric, text, text, numeric, numeric, integer, integer, text) to authenticated;

drop function if exists public.mostrarproductos(integer);
create or replace function public.mostrarproductos(_id_empresa integer)
returns table (
  id integer, descripcion text, idmarca integer, stock numeric, stock_minimo numeric, codigobarras text, codigointerno text,
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text, unidad text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad
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
  precioventa numeric, preciocompra numeric, id_categoria integer, id_empresa integer, color text, marca text, categoria text, unidad text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.descripcion, p.idmarca::integer, p.stock, p.stock_minimo, p.codigobarras, p.codigointerno,
         p.precioventa, p.preciocompra, p.id_categoria::integer, p.id_empresa::integer,
         c.color, m.descripcion as marca, c.descripcion as categoria, p.unidad
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

-- Stock por bodega con la unidad (la vista conserva sus columnas y agrega la unidad al final).
create or replace view public.v_stock_bodega as
 select b.id as id_bodega, b.id_empresa, b.nombre as bodega, b.tipo, p.id as id_producto, p.descripcion, p.stock_minimo,
        p.precioventa, p.preciocompra,
        case when b.tipo = 'principal'
             then greatest(p.stock - coalesce((select sum(sb_1.cantidad) from stock_bodega sb_1 join bodegas o on o.id = sb_1.id_bodega
                                                where sb_1.id_producto = p.id and o.tipo <> 'principal'), 0::numeric), 0::numeric)
             else coalesce(sb.cantidad, 0::numeric) end as cantidad,
        p.unidad
   from bodegas b
   join productos p on p.id_empresa = b.id_empresa
   left join stock_bodega sb on sb.id_bodega = b.id and sb.id_producto = p.id;

-- ---------------------------------------------------------------- 5. Kardex y red con unidad
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
           p.descripcion as producto, p.codigointerno as codigo, p.unidad, b.nombre as bodega, u.nombres as usuario,
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

-- Red: el producto creado al recibir conserva la unidad.
create or replace function public.stockly_red_crear_producto(_id_empresa bigint, _descripcion text, _codigointerno text, _codigobarras text,
  _precioventa numeric, _preciocompra numeric, _categoria text, _marca text, _stock_minimo numeric default 0, _unidad text default null)
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
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa, unidad)
  values (_desc, _mar, 0, coalesce(_stock_minimo, 0), nullif(btrim(_codigobarras), ''), nullif(btrim(_codigointerno), ''),
          coalesce(_precioventa, 0), coalesce(_preciocompra, 0), _cat, _id_empresa, coalesce(public.stockly_unidad_id(_unidad), 'und'))
  returning id into _id;
  return _id;
end $$;

grant execute on function public.stockly_unidades() to authenticated;
grant execute on function public.stockly_unidades_empresa(bigint) to authenticated;
grant execute on function public.stockly_config_unidades(bigint, text[], text) to authenticated;
