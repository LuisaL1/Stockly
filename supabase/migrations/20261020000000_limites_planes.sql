-- =====================================================================
-- Stockly: límites de todos los planes (nada ilimitado).
--
-- Cada plan tiene un tope en todo lo que genera costo en Supabase (filas en la base,
-- archivos, correos). Los topes se calcularon con ~6 KB por venta (venta, detalle,
-- pagos, kardex e índices) y los precios de Supabase Pro: 8 GB de base incluidos y
-- USD 0,125 por GB adicional; almacenamiento USD 0,021/GB; transferencia USD 0,09/GB.
-- Una empresa Enterprise al tope (30.000 ventas al mes) crece ~180 MB al mes.
--
-- Los límites se revisan en el servidor (triggers y políticas), no solo en la app.
-- Si una empresa baja de plan, conserva todo; solo no puede crear más por encima del tope.
-- Requiere 20261018000000_lanzamiento.sql y 20261015000000_facturas_proveedor.sql.
-- Se puede ejecutar varias veces.
-- =====================================================================

alter table public.stockly_planes add column if not exists limite_clientes int;
alter table public.stockly_planes add column if not exists limite_proveedores int;
alter table public.stockly_planes add column if not exists limite_archivos_mb int;
alter table public.stockly_planes add column if not exists limite_informes_mes int;
-- Tope de gasto mensual en la API de Anthropic por empresa (COP), además del número de consultas.
alter table public.stockly_planes add column if not exists presupuesto_ia_cop int;

update public.stockly_planes set
  descripcion = 'Para empezar a ordenar tu inventario y hacer tus primeras ventas.',
  limite_productos = 1000, limite_bodegas = 1, limite_sucursales = 1, limite_usuarios = 2,
  limite_ventas_mes = 300, limite_clientes = 200, limite_proveedores = 20,
  limite_archivos_mb = 50, limite_informes_mes = 2, limite_novandra_mes = 0, presupuesto_ia_cop = 0
where id = 'basico';

update public.stockly_planes set
  descripcion = 'Para tiendas con ventas todos los días, varias bodegas y un equipo pequeño.',
  limite_productos = 5000, limite_bodegas = 5, limite_sucursales = 3, limite_usuarios = 5,
  limite_ventas_mes = 5000, limite_clientes = 5000, limite_proveedores = 300,
  limite_archivos_mb = 2048, limite_informes_mes = 15, limite_novandra_mes = 80, presupuesto_ia_cop = 20000
where id = 'pro';

update public.stockly_planes set
  descripcion = 'Para negocios grandes con varias sedes, mucho movimiento y equipos amplios.',
  limite_productos = 50000, limite_bodegas = 30, limite_sucursales = 15, limite_usuarios = 20,
  limite_ventas_mes = 30000, limite_clientes = 50000, limite_proveedores = 3000,
  limite_archivos_mb = 10240, limite_informes_mes = 60, limite_novandra_mes = 250, presupuesto_ia_cop = 60000
where id = 'empresa';

-- Ningún plan puede quedar sin tope.
alter table public.stockly_planes
  alter column limite_productos set not null, alter column limite_bodegas set not null,
  alter column limite_sucursales set not null, alter column limite_usuarios set not null,
  alter column limite_ventas_mes set not null, alter column limite_clientes set not null,
  alter column limite_proveedores set not null, alter column limite_archivos_mb set not null,
  alter column limite_informes_mes set not null, alter column limite_novandra_mes set not null,
  alter column presupuesto_ia_cop set not null;

-- Plan efectivo (igual que en el lanzamiento): en el mes de prueba, Novandra Max con
-- pocas consultas y poco presupuesto para evitar abusos.
create or replace function public.stockly_plan(_id_empresa bigint)
returns public.stockly_planes
language plpgsql stable security definer set search_path = public
as $$
declare
  _s public.stockly_suscripciones;
  _p public.stockly_planes;
begin
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  if _s.id_plan is not null and _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then
    select * into _p from stockly_planes where id = _s.id_plan;
  elsif _s.prueba_hasta is not null and _s.prueba_hasta > now() then
    select * into _p from stockly_planes where id = 'empresa';
    _p.limite_novandra_mes := 20;
    _p.presupuesto_ia_cop := 5000;
    _p.nombre := 'Enterprise (prueba)';
  else
    select * into _p from stockly_planes where id = 'basico';
  end if;
  return _p;
end $$;

-- Índices para contar rápido por empresa (también aceleran la app).
create index if not exists productos_id_empresa on public.productos (id_empresa);
create index if not exists clientes_id_empresa on public.clientes (id_empresa);
create index if not exists asignarempresa_id_empresa on public.asignarempresa (id_empresa);

-- --------------------------------------------------------------- Topes al crear
create or replace function public.tg_limite_plan()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _plan public.stockly_planes := public.stockly_plan(new.id_empresa);
  _limite int;
  _usado bigint;
  _que text;
begin
  case tg_table_name
    when 'productos' then
      _limite := _plan.limite_productos; _que := 'productos';
      select count(*) into _usado from productos where id_empresa = new.id_empresa;
    when 'clientes' then
      _limite := _plan.limite_clientes; _que := 'clientes';
      select count(*) into _usado from clientes where id_empresa = new.id_empresa;
    when 'proveedores' then
      _limite := _plan.limite_proveedores; _que := 'proveedores';
      select count(*) into _usado from proveedores where id_empresa = new.id_empresa;
    when 'asignarempresa' then
      _limite := _plan.limite_usuarios; _que := 'usuarios';
      select count(*) into _usado from asignarempresa where id_empresa = new.id_empresa;
  end case;
  if _limite is not null and _usado >= _limite then
    raise exception 'Tu plan % permite hasta % %. Mejora tu plan para agregar más.', _plan.nombre, _limite, _que
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists productos_limite on public.productos;
create trigger productos_limite before insert on public.productos for each row execute function public.tg_limite_plan();
drop trigger if exists clientes_limite on public.clientes;
create trigger clientes_limite before insert on public.clientes for each row execute function public.tg_limite_plan();
drop trigger if exists proveedores_limite on public.proveedores;
create trigger proveedores_limite before insert on public.proveedores for each row execute function public.tg_limite_plan();
drop trigger if exists asignarempresa_limite on public.asignarempresa;
create trigger asignarempresa_limite before insert on public.asignarempresa for each row execute function public.tg_limite_plan();

-- --------------------------------------------------------------- Archivos
-- MB usados por la empresa (logo y facturas de proveedores; carpeta <id_empresa>/).
create or replace function public.stockly_archivos_mb(_id_empresa bigint)
returns numeric
language sql stable security definer set search_path = public, storage
as $$
  select round(coalesce(sum((o.metadata->>'size')::bigint), 0) / 1048576.0, 1)
    from storage.objects o
   where o.bucket_id in ('logos', 'facturas-proveedor')
     and (storage.foldername(o.name))[1] = _id_empresa::text
$$;
revoke execute on function public.stockly_archivos_mb(bigint) from public, anon;

create or replace function public.stockly_cuota_archivos_ok(_carpeta text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  if _carpeta is null or _carpeta !~ '^\d{1,18}$' then return false; end if;
  return public.stockly_archivos_mb(_carpeta::bigint) < (public.stockly_plan(_carpeta::bigint)).limite_archivos_mb;
end $$;
grant execute on function public.stockly_cuota_archivos_ok(text) to authenticated;

drop policy if exists "facturas proveedor: subir" on storage.objects;
create policy "facturas proveedor: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas-proveedor'
              and public.stockly_es_miembro_carpeta((storage.foldername(name))[1])
              and public.stockly_cuota_archivos_ok((storage.foldername(name))[1]));

-- --------------------------------------------------------------- Uso del plan
create or replace function public.stockly_uso_plan(_id_empresa bigint)
returns jsonb
language plpgsql stable security definer set search_path = public
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
    -- Gasto estimado del mes en la API de Anthropic (Sonnet 5.5: USD 2 / 10 por millón; 4.200 COP por USD).
    'ia_cop_mes', (select round(coalesce(sum(tokens_entrada * 2 + tokens_salida * 10), 0) / 1e6 * 4200)
                     from public.novandra_uso where id_empresa = _id_empresa and fecha >= _inicio_mes)
  );
end $$;

-- --------------------------------------------------------------- Bajar a Básico
-- Con un plan pagado vigente no se puede pasar al Básico (perdería lo que pagó, sin
-- reembolso). Al vencer, si no renueva, la empresa pasa sola al Básico.
create or replace function public.cambiar_plan(_id_empresa bigint, _id_plan text, _ciclo text default 'mensual')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _s public.stockly_suscripciones;
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede cambiar el plan';
  end if;
  if _id_plan <> 'basico' then
    raise exception 'Para activar el plan % debes pagarlo desde Plan y suscripción.', (select nombre from stockly_planes where id = _id_plan);
  end if;
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  if _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then
    raise exception 'Tu plan % está pagado hasta el %. Lo conservas hasta esa fecha; si no lo renuevas, pasas solo al Básico.',
      (select nombre from stockly_planes where id = _s.id_plan), to_char(_s.vence_en at time zone 'America/Bogota', 'DD/MM/YYYY');
  end if;
  update stockly_suscripciones set id_plan = 'basico', vence_en = null, prueba_hasta = least(prueba_hasta, now()), estado = 'activa'
   where id_empresa = _id_empresa;
  insert into historial_suscripcion (id_empresa, plan_anterior, plan_nuevo, ciclo, id_usuario)
  values (_id_empresa, _s.id_plan, 'basico', coalesce(_ciclo, 'mensual'), public.stockly_id_usuario());
  return jsonb_build_object('plan', 'basico');
end $$;

-- --------------------------------------------------------------- Renovar sin cobros de más
-- Con un plan pagado vigente:
--  * el mismo plan solo se puede renovar en los últimos 7 días antes de vencer;
--  * no se puede comprar un plan menor (perdería lo pagado del mayor);
--  * subir a un plan mayor sí se puede (empieza hoy).
create or replace function public.stockly_cotizar_plan(_id_empresa bigint, _id_plan text, _ciclo text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _p public.stockly_planes;
  _s public.stockly_suscripciones;
  _actual public.stockly_planes;
  _precio numeric;
  _pct int;
  _primera boolean;
  _descuento numeric := 0;
  _dias_renovar constant int := 7;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede comprar un plan'; end if;
  select * into _p from stockly_planes where id = _id_plan;
  if not found or _id_plan = 'basico' then raise exception 'Plan no válido'; end if;
  if _ciclo not in ('mensual', 'anual') then raise exception 'Ciclo no válido'; end if;

  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  if _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then
    select * into _actual from stockly_planes where id = _s.id_plan;
    if _s.id_plan = _id_plan and _s.vence_en > now() + make_interval(days => _dias_renovar) then
      raise exception 'Tu plan % está pagado hasta el %. Podrás renovarlo desde el %.',
        _actual.nombre, to_char(_s.vence_en at time zone 'America/Bogota', 'DD/MM/YYYY'),
        to_char((_s.vence_en - make_interval(days => _dias_renovar)) at time zone 'America/Bogota', 'DD/MM/YYYY');
    end if;
    if _s.id_plan <> _id_plan and _p.orden < _actual.orden then
      raise exception 'Tu plan % está pagado hasta el %. Podrás cambiar a % cuando venza.',
        _actual.nombre, to_char(_s.vence_en at time zone 'America/Bogota', 'DD/MM/YYYY'), _p.nombre;
    end if;
  end if;

  _precio := case when _ciclo = 'anual' then _p.precio_anual else _p.precio_mensual end;
  _primera := not exists (select 1 from pagos_suscripcion where id_empresa = _id_empresa and estado = 'aprobado');
  _pct := coalesce((public.stockly_ajuste('descuento_primera_compra'))::text::int, 0);
  if _primera and _pct > 0 then _descuento := round(_precio * _pct / 100.0); end if;
  return jsonb_build_object('plan', _p.id, 'nombre', _p.nombre, 'ciclo', _ciclo, 'precio', _precio,
                            'descuento', _descuento, 'descuento_pct', case when _descuento > 0 then _pct else 0 end,
                            'total', _precio - _descuento, 'primera_compra', _primera);
end $$;
grant execute on function public.stockly_cotizar_plan(bigint, text, text) to authenticated;
