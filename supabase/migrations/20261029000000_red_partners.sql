-- Red de empresas (partners / franquicias) y plan Partner.
--  - Plan "Partner": todo lo de Enterprise + 5 empresas vinculadas; complemento "vinculo" para más.
--  - Vínculo: la matriz (con plan Partner) genera un código; el partner (cualquier plan) lo acepta.
--    Cada parte decide qué comparte: stock, costos y catálogo.
--  - Con el vínculo activo: stock en tiempo real de la otra empresa, importar su catálogo,
--    envíos de mercancía (salida en el kardex de quien envía; el que recibe acepta y entra a su
--    kardex, o rechaza y vuelve al origen) y pedidos (a uno o a varios vínculos a la vez).
-- Idempotente.

-- ---------------------------------------------------------------- 1. Plan Partner y complemento
alter table public.stockly_planes add column if not exists limite_vinculos integer not null default 0;
insert into public.stockly_planes (id, nombre, descripcion, precio_mensual, precio_anual, limite_productos, limite_bodegas, limite_usuarios,
  limite_ventas_mes, limite_novandra_mes, factura_electronica, reportes_avanzados, orden, destacado, limite_sucursales, novandra_ia,
  limite_clientes, limite_proveedores, limite_archivos_mb, limite_informes_mes, presupuesto_ia_cop, limite_vinculos)
values ('partner', 'Partner', 'Para matrices y franquicias: todo lo de Enterprise más una red de empresas vinculadas con stock en tiempo real, envíos y pedidos.',
  249900, 2499000, 50000, 30, 20, 30000, 250, true, true, 4, false, 15, true, 50000, 3000, 10240, 60, 60000, 5)
on conflict (id) do update set
  nombre = excluded.nombre, descripcion = excluded.descripcion, precio_mensual = excluded.precio_mensual, precio_anual = excluded.precio_anual,
  limite_productos = excluded.limite_productos, limite_bodegas = excluded.limite_bodegas, limite_usuarios = excluded.limite_usuarios,
  limite_ventas_mes = excluded.limite_ventas_mes, limite_novandra_mes = excluded.limite_novandra_mes, factura_electronica = excluded.factura_electronica,
  reportes_avanzados = excluded.reportes_avanzados, orden = excluded.orden, limite_sucursales = excluded.limite_sucursales, novandra_ia = excluded.novandra_ia,
  limite_clientes = excluded.limite_clientes, limite_proveedores = excluded.limite_proveedores, limite_archivos_mb = excluded.limite_archivos_mb,
  limite_informes_mes = excluded.limite_informes_mes, presupuesto_ia_cop = excluded.presupuesto_ia_cop, limite_vinculos = excluded.limite_vinculos;

insert into public.stockly_complementos (id, nombre, descripcion, precio_mensual, incrementos, max_unidades, orden, activo)
values ('vinculo', 'Empresa vinculada adicional', '1 empresa más en tu red de partners.', 19900, '{"limite_vinculos": 1}', 30, 10, true)
on conflict (id) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, precio_mensual = excluded.precio_mensual,
  incrementos = excluded.incrementos, max_unidades = excluded.max_unidades, orden = excluded.orden, activo = excluded.activo;

-- El complemento de vínculos solo aplica al plan Partner.
create or replace function public.stockly_cotizar_complemento(_id_empresa bigint, _id_complemento text, _cantidad integer)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  _c public.stockly_complementos;
  _s public.stockly_suscripciones;
  _vigentes bigint;
  _dias numeric;
  _total numeric;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede comprar complementos'; end if;
  select * into _c from stockly_complementos where id = _id_complemento and activo;
  if not found then raise exception 'Complemento no válido'; end if;
  if _c.requiere is not null and coalesce((public.stockly_ajuste(_c.requiere))::text, 'false') <> 'true' then
    raise exception '% estará disponible muy pronto.', _c.nombre;
  end if;
  if _cantidad is null or _cantidad < 1 or _cantidad > _c.max_unidades then raise exception 'Cantidad no válida'; end if;

  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  if _s.id_plan = 'basico' or _s.vence_en is null or _s.vence_en <= now() then
    raise exception 'Los complementos están disponibles con un plan Pro, Enterprise o Partner pagado.';
  end if;
  if _s.vence_en < now() + interval '1 day' then
    raise exception 'Tu plan vence en menos de un día. Renuévalo primero y luego agrega complementos.';
  end if;
  if (_c.incrementos ? 'limite_vinculos') and coalesce((select limite_vinculos from stockly_planes where id = _s.id_plan), 0) = 0 then
    raise exception 'Las empresas vinculadas adicionales están disponibles con el plan Partner.';
  end if;

  select coalesce(sum(cantidad), 0) into _vigentes from public.stockly_complementos_vigentes(_id_empresa) where id_complemento = _id_complemento;
  if _vigentes + _cantidad > _c.max_unidades then
    raise exception 'Puedes tener hasta % unidades de "%". Ya tienes %.', _c.max_unidades, _c.nombre, _vigentes;
  end if;

  _dias := ceil(extract(epoch from _s.vence_en - now()) / 86400);
  _total := greatest(3000, round(_c.precio_mensual * _cantidad * _dias / 30 / 100) * 100);
  return jsonb_build_object('id', _c.id, 'nombre', _c.nombre, 'cantidad', _cantidad, 'precio_mensual', _c.precio_mensual,
                            'dias', _dias, 'hasta', _s.vence_en, 'total', _total, 'plan', _s.id_plan, 'ciclo', _s.ciclo);
end $$;

-- Módulo "Red" para los permisos; los dueños y administradores lo reciben de una vez.
insert into public.modulos (nombre, "check") select 'Red', false where not exists (select 1 from public.modulos where nombre = 'Red');
insert into public.permisos (id_usuario, idmodulo)
select u.id, m.id from public."Usuarios" u cross join public.modulos m
 where m.nombre = 'Red' and lower(coalesce(u.tipouser, '')) in ('dueño', 'administrador', 'admin')
   and not exists (select 1 from public.permisos p where p.id_usuario = u.id and p.idmodulo = m.id);

-- ---------------------------------------------------------------- 2. Tablas
create table if not exists public.red_vinculos (
  id bigint generated by default as identity primary key,
  id_matriz bigint not null references public."Empresa"(id) on delete cascade,
  id_partner bigint references public."Empresa"(id) on delete cascade,
  codigo text not null unique,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo', 'cancelado')),
  nota text,
  config_matriz jsonb not null default '{"stock": true, "costos": false, "catalogo": true}',
  config_partner jsonb not null default '{"stock": true, "costos": false, "catalogo": false}',
  creado_por bigint,
  aceptado_por bigint,
  created_at timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '7 days',
  aceptado_en timestamptz,
  cancelado_en timestamptz
);
create index if not exists red_vinculos_matriz_idx on public.red_vinculos (id_matriz, estado);
create index if not exists red_vinculos_partner_idx on public.red_vinculos (id_partner, estado);

create table if not exists public.red_envios (
  id bigint generated by default as identity primary key,
  id_vinculo bigint not null references public.red_vinculos(id) on delete cascade,
  id_origen bigint not null references public."Empresa"(id) on delete cascade,
  id_destino bigint not null references public."Empresa"(id) on delete cascade,
  numero integer not null,
  id_bodega_origen bigint,
  id_bodega_destino bigint,
  id_pedido bigint,
  estado text not null default 'enviado' check (estado in ('enviado', 'recibido', 'rechazado')),
  nota text,
  motivo_rechazo text,
  creado_por bigint,
  recibido_por bigint,
  created_at timestamptz not null default now(),
  recibido_en timestamptz
);
create table if not exists public.red_envios_detalle (
  id bigint generated by default as identity primary key,
  id_envio bigint not null references public.red_envios(id) on delete cascade,
  id_producto_origen bigint,
  id_producto_destino bigint,
  descripcion text not null,
  codigointerno text,
  codigobarras text,
  cantidad numeric(14, 3) not null check (cantidad > 0),
  costo_unitario numeric,
  precio_venta numeric
);
create index if not exists red_envios_detalle_envio_idx on public.red_envios_detalle (id_envio);

create table if not exists public.red_pedidos (
  id bigint generated by default as identity primary key,
  id_vinculo bigint not null references public.red_vinculos(id) on delete cascade,
  id_solicitante bigint not null references public."Empresa"(id) on delete cascade,
  id_proveedor bigint not null references public."Empresa"(id) on delete cascade,
  numero integer not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'despachado', 'rechazado', 'cancelado')),
  nota text,
  respuesta text,
  creado_por bigint,
  created_at timestamptz not null default now(),
  atendido_en timestamptz
);
create table if not exists public.red_pedidos_detalle (
  id bigint generated by default as identity primary key,
  id_pedido bigint not null references public.red_pedidos(id) on delete cascade,
  id_producto_solicitante bigint,
  descripcion text not null,
  codigointerno text,
  codigobarras text,
  cantidad numeric(14, 3) not null check (cantidad > 0)
);
create index if not exists red_pedidos_detalle_pedido_idx on public.red_pedidos_detalle (id_pedido);

alter table public.red_vinculos enable row level security;
alter table public.red_envios enable row level security;
alter table public.red_envios_detalle enable row level security;
alter table public.red_pedidos enable row level security;
alter table public.red_pedidos_detalle enable row level security;
drop policy if exists red_vinculos_leer on public.red_vinculos;
create policy red_vinculos_leer on public.red_vinculos for select to authenticated
  using (public.stockly_es_miembro(id_matriz) or public.stockly_es_miembro(id_partner));
drop policy if exists red_envios_leer on public.red_envios;
create policy red_envios_leer on public.red_envios for select to authenticated
  using (public.stockly_es_miembro(id_origen) or public.stockly_es_miembro(id_destino));
drop policy if exists red_envios_detalle_leer on public.red_envios_detalle;
create policy red_envios_detalle_leer on public.red_envios_detalle for select to authenticated
  using (exists (select 1 from public.red_envios e where e.id = id_envio and (public.stockly_es_miembro(e.id_origen) or public.stockly_es_miembro(e.id_destino))));
drop policy if exists red_pedidos_leer on public.red_pedidos;
create policy red_pedidos_leer on public.red_pedidos for select to authenticated
  using (public.stockly_es_miembro(id_solicitante) or public.stockly_es_miembro(id_proveedor));
drop policy if exists red_pedidos_detalle_leer on public.red_pedidos_detalle;
create policy red_pedidos_detalle_leer on public.red_pedidos_detalle for select to authenticated
  using (exists (select 1 from public.red_pedidos p where p.id = id_pedido and (public.stockly_es_miembro(p.id_solicitante) or public.stockly_es_miembro(p.id_proveedor))));

-- Las notificaciones de la red tienen su propio tipo.
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in ('venta', 'stock_bajo', 'compra', 'sistema', 'novandra', 'plan', 'red'));

-- El kardex reconoce los movimientos de la red.
alter table public.kardex drop constraint if exists kardex_origen_chk;
alter table public.kardex add constraint kardex_origen_chk
  check (origen in ('venta', 'anulacion', 'compra', 'importacion', 'traslado', 'ajuste', 'red')) not valid;

-- ---------------------------------------------------------------- 3. Ayudas
create or replace function public.stockly_red_limite(_id_empresa bigint)
returns integer language sql stable security definer set search_path = public
as $$ select coalesce((public.stockly_plan(_id_empresa)).limite_vinculos, 0) $$;

-- Vínculo activo en el que participa la empresa (falla si no existe o no es miembro).
create or replace function public.stockly_red_vinculo(_id_vinculo bigint, _id_empresa bigint)
returns public.red_vinculos language plpgsql stable security definer set search_path = public
as $$
declare _v public.red_vinculos;
begin
  select * into _v from red_vinculos where id = _id_vinculo;
  if not found or _v.estado <> 'activo' or not public.stockly_es_miembro(_id_empresa)
     or _id_empresa not in (_v.id_matriz, _v.id_partner) then
    raise exception 'Vínculo no encontrado o inactivo';
  end if;
  return _v;
end $$;

-- La otra empresa del vínculo.
create or replace function public.stockly_red_otra(_v public.red_vinculos, _id_empresa bigint)
returns bigint language sql immutable
as $$ select case when _v.id_matriz = _id_empresa then _v.id_partner else _v.id_matriz end $$;

-- Qué comparte la empresa _quien dentro del vínculo.
create or replace function public.stockly_red_config(_v public.red_vinculos, _quien bigint)
returns jsonb language sql immutable
as $$ select case when _v.id_matriz = _quien then _v.config_matriz else _v.config_partner end $$;

create or replace function public.stockly_red_notificar(_id_empresa bigint, _titulo text, _mensaje text)
returns void language sql security definer set search_path = public
as $$
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace) values (_id_empresa, 'red', _titulo, _mensaje, '/red')
$$;

-- Busca un producto de la empresa por código interno, código de barras o nombre.
create or replace function public.stockly_red_buscar_producto(_id_empresa bigint, _codigointerno text, _codigobarras text, _descripcion text)
returns bigint language sql stable security definer set search_path = public
as $$
  select id from productos p
   where p.id_empresa = _id_empresa
     and ((nullif(btrim(_codigointerno), '') is not null and public.stockly_norm(p.codigointerno::text) = public.stockly_norm(_codigointerno))
          or (nullif(btrim(_codigobarras), '') is not null and p.codigobarras::text = _codigobarras)
          or public.stockly_norm(p.descripcion) = public.stockly_norm(_descripcion))
   order by (nullif(btrim(_codigointerno), '') is not null and public.stockly_norm(p.codigointerno::text) = public.stockly_norm(_codigointerno)) desc,
            (nullif(btrim(_codigobarras), '') is not null and p.codigobarras::text = _codigobarras) desc
   limit 1
$$;

-- Crea el producto en la empresa (stock 0) con categoría y marca por nombre; devuelve su id.
create or replace function public.stockly_red_crear_producto(_id_empresa bigint, _descripcion text, _codigointerno text, _codigobarras text,
  _precioventa numeric, _preciocompra numeric, _categoria text, _marca text, _stock_minimo numeric default 0)
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
  -- Si el nombre ya existe con otro código, se distingue con el código.
  if exists (select 1 from productos where id_empresa = _id_empresa and descripcion = _desc) then
    _desc := _desc || ' (' || coalesce(nullif(btrim(_codigointerno), ''), nullif(btrim(_codigobarras), ''), 'red') || ')';
  end if;
  insert into productos (descripcion, idmarca, stock, stock_minimo, codigobarras, codigointerno, precioventa, preciocompra, id_categoria, id_empresa)
  values (_desc, _mar, 0, coalesce(_stock_minimo, 0), nullif(btrim(_codigobarras), ''), nullif(btrim(_codigointerno), ''),
          coalesce(_precioventa, 0), coalesce(_preciocompra, 0), _cat, _id_empresa)
  returning id into _id;
  return _id;
end $$;

-- ---------------------------------------------------------------- 4. Vínculos
create or replace function public.stockly_red_invitar(_id_empresa bigint, _nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _limite int := public.stockly_red_limite(_id_empresa);
  _usados int;
  _codigo text;
  _v public.red_vinculos;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede invitar empresas'; end if;
  if _limite <= 0 then raise exception 'La red de empresas está disponible con el plan Partner.'; end if;
  select count(*) into _usados from red_vinculos where id_matriz = _id_empresa and estado in ('pendiente', 'activo');
  if _usados >= _limite then
    raise exception 'Tu plan permite % empresas vinculadas y ya tienes %. Agrega el complemento "Empresa vinculada adicional".', _limite, _usados;
  end if;
  loop
    _codigo := 'RED-' || upper(substr(translate(md5(random()::text || clock_timestamp()::text), '0123456789', 'ABCDEFGHJK'), 1, 6));
    exit when not exists (select 1 from red_vinculos where codigo = _codigo);
  end loop;
  insert into red_vinculos (id_matriz, codigo, nota, creado_por)
  values (_id_empresa, _codigo, nullif(btrim(_nota), ''), public.stockly_id_usuario())
  returning * into _v;
  return jsonb_build_object('id', _v.id, 'codigo', _v.codigo, 'expira_en', _v.expira_en);
end $$;

create or replace function public.stockly_red_aceptar(_id_empresa bigint, _codigo text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _v public.red_vinculos;
  _matriz text;
  _partner text;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede aceptar un vínculo'; end if;
  select * into _v from red_vinculos where upper(btrim(_codigo)) = codigo for update;
  if not found then raise exception 'El código no existe. Revísalo con la empresa que te invitó.'; end if;
  if _v.estado <> 'pendiente' then raise exception 'Este código ya fue usado o cancelado'; end if;
  if _v.expira_en < now() then raise exception 'El código venció. Pide uno nuevo a la empresa que te invitó.'; end if;
  if _v.id_matriz = _id_empresa then raise exception 'No puedes vincular tu empresa consigo misma'; end if;
  if exists (select 1 from red_vinculos where estado = 'activo'
              and ((id_matriz = _v.id_matriz and id_partner = _id_empresa) or (id_matriz = _id_empresa and id_partner = _v.id_matriz))) then
    raise exception 'Estas dos empresas ya están vinculadas';
  end if;
  update red_vinculos set id_partner = _id_empresa, estado = 'activo', aceptado_por = public.stockly_id_usuario(), aceptado_en = now()
   where id = _v.id;
  select nombre into _matriz from "Empresa" where id = _v.id_matriz;
  select nombre into _partner from "Empresa" where id = _id_empresa;
  perform public.stockly_red_notificar(_v.id_matriz, 'Nueva empresa en tu red', _partner || ' aceptó el vínculo.');
  perform public.stockly_red_notificar(_id_empresa, 'Vínculo activo', 'Ya estás vinculado con ' || _matriz || '.');
  return jsonb_build_object('id', _v.id, 'matriz', _matriz);
end $$;

create or replace function public.stockly_red_cancelar(_id_vinculo bigint, _id_empresa bigint)
returns void language plpgsql security definer set search_path = public
as $$
declare
  _v public.red_vinculos;
  _otra bigint;
  _nombre text;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede cancelar un vínculo'; end if;
  select * into _v from red_vinculos where id = _id_vinculo and _id_empresa in (id_matriz, id_partner) for update;
  if not found or _v.estado = 'cancelado' then raise exception 'Vínculo no encontrado'; end if;
  update red_vinculos set estado = 'cancelado', cancelado_en = now() where id = _id_vinculo;
  _otra := case when _v.id_matriz = _id_empresa then _v.id_partner else _v.id_matriz end;
  if _otra is not null then
    select nombre into _nombre from "Empresa" where id = _id_empresa;
    perform public.stockly_red_notificar(_otra, 'Vínculo cancelado', _nombre || ' canceló el vínculo con tu empresa.');
  end if;
end $$;

create or replace function public.stockly_red_configurar(_id_vinculo bigint, _id_empresa bigint, _config jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _v public.red_vinculos;
  _nuevo jsonb;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede cambiar lo que se comparte'; end if;
  select * into _v from red_vinculos where id = _id_vinculo and _id_empresa in (id_matriz, id_partner) for update;
  if not found then raise exception 'Vínculo no encontrado'; end if;
  _nuevo := jsonb_build_object('stock', coalesce((_config->>'stock')::boolean, true),
                               'costos', coalesce((_config->>'costos')::boolean, false),
                               'catalogo', coalesce((_config->>'catalogo')::boolean, false));
  if _v.id_matriz = _id_empresa then
    update red_vinculos set config_matriz = _nuevo where id = _id_vinculo;
  else
    update red_vinculos set config_partner = _nuevo where id = _id_vinculo;
  end if;
  return _nuevo;
end $$;

create or replace function public.stockly_red_mis_vinculos(_id_empresa bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  return jsonb_build_object(
    'limite', public.stockly_red_limite(_id_empresa),
    'usados', (select count(*) from red_vinculos where id_matriz = _id_empresa and estado in ('pendiente', 'activo')),
    'vinculos', coalesce((select jsonb_agg(to_jsonb(x) order by x.estado = 'activo' desc, x.created_at desc) from (
      select v.id, v.codigo, v.estado, v.nota, v.created_at, v.expira_en, v.aceptado_en,
             case when v.id_matriz = _id_empresa then 'matriz' else 'partner' end as mi_rol,
             e.id as id_otra, e.nombre as otra, e.ciudad as otra_ciudad,
             public.stockly_red_config(v, _id_empresa) as comparto,
             public.stockly_red_config(v, case when v.id_matriz = _id_empresa then v.id_partner else v.id_matriz end) as comparte,
             (select count(*) from red_envios n where n.id_vinculo = v.id and n.id_destino = _id_empresa and n.estado = 'enviado') as envios_por_recibir,
             (select count(*) from red_pedidos p where p.id_vinculo = v.id and p.id_proveedor = _id_empresa and p.estado = 'pendiente') as pedidos_por_atender
        from red_vinculos v
        left join "Empresa" e on e.id = case when v.id_matriz = _id_empresa then v.id_partner else v.id_matriz end
       where _id_empresa in (v.id_matriz, v.id_partner) and v.estado <> 'cancelado') x), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- 5. Stock y catálogo de la otra empresa
create or replace function public.stockly_red_stock(_id_vinculo bigint, _id_empresa bigint, _texto text default null)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
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
      select p.id, p.descripcion, p.codigointerno, p.codigobarras, p.stock, p.stock_minimo, p.precioventa,
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
end $$;

create or replace function public.stockly_red_importar_catalogo(_id_vinculo bigint, _id_empresa bigint, _ids bigint[] default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _v public.red_vinculos;
  _otra bigint;
  _cfg jsonb;
  _p record;
  _creados int := 0;
  _existentes int := 0;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede importar el catálogo'; end if;
  _v := public.stockly_red_vinculo(_id_vinculo, _id_empresa);
  _otra := public.stockly_red_otra(_v, _id_empresa);
  _cfg := public.stockly_red_config(_v, _otra);
  if coalesce((_cfg->>'catalogo')::boolean, false) is not true then raise exception 'Esa empresa no comparte su catálogo'; end if;
  for _p in
    select p.*, c.descripcion as categoria, m.descripcion as marca
      from productos p left join categorias c on c.id = p.id_categoria left join marca m on m.id = p.idmarca
     where p.id_empresa = _otra and (_ids is null or p.id = any(_ids))
  loop
    if public.stockly_red_buscar_producto(_id_empresa, _p.codigointerno::text, _p.codigobarras::text, _p.descripcion) is not null then
      _existentes := _existentes + 1;
    else
      perform public.stockly_red_crear_producto(_id_empresa, _p.descripcion, _p.codigointerno::text, _p.codigobarras::text, _p.precioventa,
        case when coalesce((_cfg->>'costos')::boolean, false) then _p.preciocompra end, _p.categoria, _p.marca, _p.stock_minimo);
      _creados := _creados + 1;
    end if;
  end loop;
  return jsonb_build_object('creados', _creados, 'existentes', _existentes);
end $$;

-- ---------------------------------------------------------------- 6. Envíos de mercancía
-- _items: [{ id_producto, cantidad }]
create or replace function public.stockly_red_enviar(_id_vinculo bigint, _id_empresa bigint, _id_bodega bigint, _items jsonb, _nota text default null, _id_pedido bigint default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _v public.red_vinculos;
  _otra bigint;
  _cfg jsonb;
  _bodega bigint;
  _it jsonb;
  _p public.productos;
  _cant numeric;
  _id bigint;
  _numero int;
  _unidades numeric := 0;
  _mi_nombre text;
  _otro_nombre text;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  _v := public.stockly_red_vinculo(_id_vinculo, _id_empresa);
  _otra := public.stockly_red_otra(_v, _id_empresa);
  _cfg := public.stockly_red_config(_v, _id_empresa);
  _bodega := coalesce(_id_bodega, public.stockly_bodega_principal(_id_empresa));
  if not exists (select 1 from bodegas where id = _bodega and id_empresa = _id_empresa) then raise exception 'Bodega no válida'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then raise exception 'Agrega al menos un producto'; end if;
  if _id_pedido is not null and not exists (select 1 from red_pedidos where id = _id_pedido and id_proveedor = _id_empresa and id_vinculo = _id_vinculo and estado = 'pendiente') then
    raise exception 'Pedido no encontrado o ya atendido';
  end if;
  select nombre into _mi_nombre from "Empresa" where id = _id_empresa;
  select nombre into _otro_nombre from "Empresa" where id = _otra;
  select coalesce(max(numero), 0) + 1 into _numero from red_envios where id_origen = _id_empresa;

  insert into red_envios (id_vinculo, id_origen, id_destino, numero, id_bodega_origen, id_pedido, nota, creado_por)
  values (_id_vinculo, _id_empresa, _otra, _numero, _bodega, _id_pedido, nullif(btrim(_nota), ''), public.stockly_id_usuario())
  returning id into _id;

  for _it in select * from jsonb_array_elements(_items) loop
    select * into _p from productos where id = (_it->>'id_producto')::bigint and id_empresa = _id_empresa;
    if not found then raise exception 'Producto no encontrado'; end if;
    _cant := (_it->>'cantidad')::numeric;
    if _cant is null or _cant <= 0 then raise exception 'Cantidad no válida para %', _p.descripcion; end if;
    if public.stockly_disponible(_bodega, _p.id) < _cant then
      raise exception 'Stock insuficiente de % en esta bodega (disponible: %)', _p.descripcion, trim_scale(public.stockly_disponible(_bodega, _p.id));
    end if;
    insert into red_envios_detalle (id_envio, id_producto_origen, descripcion, codigointerno, codigobarras, cantidad, costo_unitario, precio_venta)
    values (_id, _p.id, _p.descripcion, _p.codigointerno::text, _p.codigobarras::text, _cant,
            case when coalesce((_cfg->>'costos')::boolean, false) then _p.preciocompra end, _p.precioventa);
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, referencia, nota)
    values ('Salida', _cant, 'Envío a ' || _otro_nombre || ' RED-' || _numero, _id_empresa, _p.id, _bodega, 'red', _id, nullif(btrim(_nota), ''));
    _unidades := _unidades + _cant;
  end loop;

  if _id_pedido is not null then
    update red_pedidos set estado = 'despachado', atendido_en = now() where id = _id_pedido;
  end if;
  perform public.stockly_red_notificar(_otra, 'Mercancía en camino de ' || _mi_nombre,
    trim_scale(_unidades) || ' unidades · envío RED-' || _numero || '. Recíbelo en Red de empresas.');
  perform public.stockly_auditar(_id_empresa, 'envio_red', 'red_envios', _id,
    jsonb_build_object('destino', _otro_nombre, 'numero', _numero, 'unidades', _unidades, 'nota', _nota), null, _bodega, _unidades, null);
  return jsonb_build_object('id', _id, 'numero', _numero, 'unidades', _unidades);
end $$;

create or replace function public.stockly_red_recibir(_id_envio bigint, _id_empresa bigint, _id_bodega bigint default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _e public.red_envios;
  _d record;
  _bodega bigint;
  _idp bigint;
  _creados int := 0;
  _unidades numeric := 0;
  _origen_nombre text;
  _mi_nombre text;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  select * into _e from red_envios where id = _id_envio and id_destino = _id_empresa for update;
  if not found then raise exception 'Envío no encontrado'; end if;
  if _e.estado <> 'enviado' then raise exception 'Este envío ya fue %', _e.estado; end if;
  _bodega := coalesce(_id_bodega, public.stockly_bodega_principal(_id_empresa));
  if not exists (select 1 from bodegas where id = _bodega and id_empresa = _id_empresa) then raise exception 'Bodega no válida'; end if;
  select nombre into _origen_nombre from "Empresa" where id = _e.id_origen;
  select nombre into _mi_nombre from "Empresa" where id = _id_empresa;

  for _d in select * from red_envios_detalle where id_envio = _id_envio loop
    _idp := public.stockly_red_buscar_producto(_id_empresa, _d.codigointerno, _d.codigobarras, _d.descripcion);
    if _idp is null then
      _idp := public.stockly_red_crear_producto(_id_empresa, _d.descripcion, _d.codigointerno, _d.codigobarras, _d.precio_venta, _d.costo_unitario, null, null, 0);
      _creados := _creados + 1;
    end if;
    update red_envios_detalle set id_producto_destino = _idp where id = _d.id;
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, referencia, nota)
    values ('Entrada', _d.cantidad, 'Recibido de ' || _origen_nombre || ' RED-' || _e.numero, _id_empresa, _idp, _bodega, 'red', _e.id, _e.nota);
    _unidades := _unidades + _d.cantidad;
  end loop;
  update red_envios set estado = 'recibido', id_bodega_destino = _bodega, recibido_por = public.stockly_id_usuario(), recibido_en = now() where id = _id_envio;
  perform public.stockly_red_notificar(_e.id_origen, _mi_nombre || ' recibió tu envío RED-' || _e.numero, trim_scale(_unidades) || ' unidades entraron a su inventario.');
  perform public.stockly_auditar(_id_empresa, 'recepcion_red', 'red_envios', _id_envio,
    jsonb_build_object('origen', _origen_nombre, 'numero', _e.numero, 'unidades', _unidades, 'productos_creados', _creados), null, _bodega, _unidades, null);
  return jsonb_build_object('id', _id_envio, 'unidades', _unidades, 'productos_creados', _creados);
end $$;

create or replace function public.stockly_red_rechazar(_id_envio bigint, _id_empresa bigint, _motivo text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  _e public.red_envios;
  _d record;
  _destino_nombre text;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  select * into _e from red_envios where id = _id_envio and id_destino = _id_empresa for update;
  if not found then raise exception 'Envío no encontrado'; end if;
  if _e.estado <> 'enviado' then raise exception 'Este envío ya fue %', _e.estado; end if;
  select nombre into _destino_nombre from "Empresa" where id = _id_empresa;
  -- La mercancía vuelve a la bodega de origen.
  for _d in select * from red_envios_detalle where id_envio = _id_envio loop
    insert into kardex (tipo, cantidad, detalle, id_empresa, id_producto, id_bodega, origen, referencia, nota)
    values ('Entrada', _d.cantidad, 'Devuelto por ' || _destino_nombre || ' RED-' || _e.numero, _e.id_origen, _d.id_producto_origen, _e.id_bodega_origen, 'red', _e.id, nullif(btrim(_motivo), ''));
  end loop;
  update red_envios set estado = 'rechazado', motivo_rechazo = nullif(btrim(_motivo), ''), recibido_por = public.stockly_id_usuario(), recibido_en = now() where id = _id_envio;
  perform public.stockly_red_notificar(_e.id_origen, _destino_nombre || ' rechazó tu envío RED-' || _e.numero, coalesce(nullif(btrim(_motivo), ''), 'La mercancía volvió a tu inventario.'));
end $$;

create or replace function public.stockly_red_envios(_id_empresa bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
    select e.id, e.numero, e.estado, e.nota, e.motivo_rechazo, e.created_at, e.recibido_en, e.id_vinculo, e.id_pedido,
           case when e.id_origen = _id_empresa then 'enviado' else 'recibido' end as direccion,
           case when e.id_origen = _id_empresa then d.nombre else o.nombre end as otra,
           bo.nombre as bodega_origen, bd.nombre as bodega_destino, u.nombres as usuario,
           (select coalesce(sum(cantidad), 0) from red_envios_detalle x where x.id_envio = e.id) as unidades,
           (select jsonb_agg(jsonb_build_object('descripcion', x.descripcion, 'codigointerno', x.codigointerno, 'cantidad', x.cantidad, 'precio_venta', x.precio_venta, 'costo_unitario', x.costo_unitario) order by x.id)
              from red_envios_detalle x where x.id_envio = e.id) as items
      from red_envios e
      join "Empresa" o on o.id = e.id_origen
      join "Empresa" d on d.id = e.id_destino
      left join bodegas bo on bo.id = e.id_bodega_origen
      left join bodegas bd on bd.id = e.id_bodega_destino
      left join "Usuarios" u on u.id = e.creado_por
     where _id_empresa in (e.id_origen, e.id_destino)
     limit 500) x), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- 7. Pedidos (a uno o varios vínculos)
-- _items: [{ id_producto?, descripcion, codigointerno?, codigobarras?, cantidad }]
create or replace function public.stockly_red_pedir(_id_empresa bigint, _ids_vinculo bigint[], _items jsonb, _nota text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  _idv bigint;
  _v public.red_vinculos;
  _otra bigint;
  _it jsonb;
  _id bigint;
  _numero int;
  _ids bigint[] := '{}';
  _mi_nombre text;
  _n int := 0;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  if _ids_vinculo is null or cardinality(_ids_vinculo) = 0 then raise exception 'Elige al menos una empresa'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then raise exception 'Agrega al menos un producto'; end if;
  select nombre into _mi_nombre from "Empresa" where id = _id_empresa;
  foreach _idv in array _ids_vinculo loop
    _v := public.stockly_red_vinculo(_idv, _id_empresa);
    _otra := public.stockly_red_otra(_v, _id_empresa);
    select coalesce(max(numero), 0) + 1 into _numero from red_pedidos where id_solicitante = _id_empresa;
    insert into red_pedidos (id_vinculo, id_solicitante, id_proveedor, numero, nota, creado_por)
    values (_idv, _id_empresa, _otra, _numero, nullif(btrim(_nota), ''), public.stockly_id_usuario())
    returning id into _id;
    for _it in select * from jsonb_array_elements(_items) loop
      if coalesce((_it->>'cantidad')::numeric, 0) <= 0 then raise exception 'Cantidad no válida para %', _it->>'descripcion'; end if;
      insert into red_pedidos_detalle (id_pedido, id_producto_solicitante, descripcion, codigointerno, codigobarras, cantidad)
      values (_id, nullif(_it->>'id_producto', '')::bigint, coalesce(nullif(btrim(_it->>'descripcion'), ''), 'Producto'),
              nullif(btrim(_it->>'codigointerno'), ''), nullif(btrim(_it->>'codigobarras'), ''), (_it->>'cantidad')::numeric);
      _n := _n + 1;
    end loop;
    _ids := _ids || _id;
    perform public.stockly_red_notificar(_otra, 'Pedido de ' || _mi_nombre, 'Pedido RED-' || _numero || ' con ' || jsonb_array_length(_items) || ' producto(s). Atiéndelo en Red de empresas.');
  end loop;
  return jsonb_build_object('ids', to_jsonb(_ids), 'pedidos', cardinality(_ids));
end $$;

create or replace function public.stockly_red_pedido_estado(_id_pedido bigint, _id_empresa bigint, _estado text, _respuesta text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  _p public.red_pedidos;
  _nombre text;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  select * into _p from red_pedidos where id = _id_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if _p.estado <> 'pendiente' then raise exception 'El pedido ya está %', _p.estado; end if;
  select nombre into _nombre from "Empresa" where id = _id_empresa;
  if _estado = 'rechazado' and _p.id_proveedor = _id_empresa then
    update red_pedidos set estado = 'rechazado', respuesta = nullif(btrim(_respuesta), ''), atendido_en = now() where id = _id_pedido;
    perform public.stockly_red_notificar(_p.id_solicitante, _nombre || ' no puede atender tu pedido RED-' || _p.numero, coalesce(nullif(btrim(_respuesta), ''), 'Pedido rechazado.'));
  elsif _estado = 'cancelado' and _p.id_solicitante = _id_empresa then
    update red_pedidos set estado = 'cancelado', atendido_en = now() where id = _id_pedido;
    perform public.stockly_red_notificar(_p.id_proveedor, _nombre || ' canceló el pedido RED-' || _p.numero, 'Ya no es necesario atenderlo.');
  else
    raise exception 'Acción no permitida';
  end if;
end $$;

create or replace function public.stockly_red_pedidos(_id_empresa bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin permiso'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.estado = 'pendiente' desc, x.created_at desc) from (
    select p.id, p.numero, p.estado, p.nota, p.respuesta, p.created_at, p.atendido_en, p.id_vinculo,
           case when p.id_solicitante = _id_empresa then 'hecho' else 'recibido' end as direccion,
           case when p.id_solicitante = _id_empresa then pr.nombre else s.nombre end as otra,
           u.nombres as usuario,
           (select coalesce(sum(cantidad), 0) from red_pedidos_detalle x where x.id_pedido = p.id) as unidades,
           (select jsonb_agg(jsonb_build_object('descripcion', x.descripcion, 'codigointerno', x.codigointerno, 'codigobarras', x.codigobarras, 'cantidad', x.cantidad,
                   'id_producto', case when p.id_proveedor = _id_empresa then public.stockly_red_buscar_producto(_id_empresa, x.codigointerno, x.codigobarras, x.descripcion) else x.id_producto_solicitante end) order by x.id)
              from red_pedidos_detalle x where x.id_pedido = p.id) as items
      from red_pedidos p
      join "Empresa" s on s.id = p.id_solicitante
      join "Empresa" pr on pr.id = p.id_proveedor
      left join "Usuarios" u on u.id = p.creado_por
     where _id_empresa in (p.id_solicitante, p.id_proveedor)
     limit 500) x), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------- 8. Uso del plan
create or replace function public.stockly_uso_plan(_id_empresa bigint)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare _inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Bogota') at time zone 'America/Bogota';
begin
  if not public.stockly_es_miembro(_id_empresa) then
    raise exception 'Sin acceso a esta empresa';
  end if;
  return jsonb_build_object(
    'productos', (select count(*) from public.productos where id_empresa = _id_empresa),
    'bodegas', (select count(*) from public.bodegas where id_empresa = _id_empresa),
    'sucursales', (select count(*) from public.sucursales where id_empresa = _id_empresa),
    'usuarios', (select count(*) from public.asignarempresa where id_empresa = _id_empresa),
    'clientes', (select count(*) from public.clientes where id_empresa = _id_empresa),
    'proveedores', (select count(*) from public.proveedores where id_empresa = _id_empresa),
    'archivos_mb', public.stockly_archivos_mb(_id_empresa),
    'informes_mes', (select count(*) from public.informes_contador where id_empresa = _id_empresa and created_at >= _inicio_mes),
    'ventas_mes', (select count(*) from public.ventas where id_empresa = _id_empresa
                     and fecha >= _inicio_mes and estado <> 'anulada'),
    'novandra_mes', (select count(*) from public.novandra_uso where id_empresa = _id_empresa and fecha >= _inicio_mes),
    'vinculos', (select count(*) from public.red_vinculos where id_matriz = _id_empresa and estado in ('pendiente', 'activo')),
    -- Gasto estimado del mes en la API de Anthropic (Sonnet 5.5: USD 2 / 10 por millón; 4.200 COP por USD).
    'ia_cop_mes', (select round(coalesce(sum(tokens_entrada * 2 + tokens_salida * 10), 0) / 1e6 * 4200)
                     from public.novandra_uso where id_empresa = _id_empresa and fecha >= _inicio_mes)
  );
end $$;

grant execute on function public.stockly_red_limite(bigint) to authenticated;
grant execute on function public.stockly_red_invitar(bigint, text) to authenticated;
grant execute on function public.stockly_red_aceptar(bigint, text) to authenticated;
grant execute on function public.stockly_red_cancelar(bigint, bigint) to authenticated;
grant execute on function public.stockly_red_configurar(bigint, bigint, jsonb) to authenticated;
grant execute on function public.stockly_red_mis_vinculos(bigint) to authenticated;
grant execute on function public.stockly_red_stock(bigint, bigint, text) to authenticated;
grant execute on function public.stockly_red_importar_catalogo(bigint, bigint, bigint[]) to authenticated;
grant execute on function public.stockly_red_enviar(bigint, bigint, bigint, jsonb, text, bigint) to authenticated;
grant execute on function public.stockly_red_recibir(bigint, bigint, bigint) to authenticated;
grant execute on function public.stockly_red_rechazar(bigint, bigint, text) to authenticated;
grant execute on function public.stockly_red_envios(bigint) to authenticated;
grant execute on function public.stockly_red_pedir(bigint, bigint[], jsonb, text) to authenticated;
grant execute on function public.stockly_red_pedido_estado(bigint, bigint, text, text) to authenticated;
grant execute on function public.stockly_red_pedidos(bigint) to authenticated;
