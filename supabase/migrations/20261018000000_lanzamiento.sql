-- =====================================================================
-- Stockly v5.0: lanzamiento comercial.
--
--  * Planes: Básico (gratis), Pro ($69.900/mes) y Enterprise ($189.900/mes),
--    con 2 meses gratis en el pago anual. Precios finales (MCCore no es responsable de IVA).
--  * Mes de prueba: cada empresa nueva tiene 30 días con todo (Enterprise).
--  * Plan efectivo: pagado y vigente → ese plan; en prueba → Enterprise;
--    si no → Básico (los datos se conservan).
--  * 50% de descuento en la primera compra de cada empresa.
--  * Pagos con Wompi (cuenta de MCCore): la Edge Function "suscripcion-pago"
--    crea el pago y lo verifica; "suscripcion-webhook" recibe la confirmación.
--  * cambiar_plan ya no permite pasar a un plan pago sin pagar.
--  * Funciones que llegarán después (IA, DIAN, Nequi QR) con interruptor global.
-- Requiere 20261010000000_novandra_esencial.sql.
-- =====================================================================

-- ----------------------------------------------------------- Planes
update public.stockly_planes set
  nombre = 'Básico', descripcion = 'Para empezar a ordenar tu inventario y vender.',
  precio_mensual = 0, precio_anual = 0,
  limite_productos = 100, limite_bodegas = 1, limite_usuarios = 2, limite_ventas_mes = 300,
  limite_sucursales = 1, limite_novandra_mes = 0, novandra_ia = false, orden = 1, destacado = false
 where id = 'basico';
update public.stockly_planes set
  nombre = 'Pro', descripcion = 'Para negocios con ventas diarias, varias bodegas y equipo.',
  precio_mensual = 69900, precio_anual = 699000,
  limite_productos = 3000, limite_bodegas = 5, limite_usuarios = 5, limite_ventas_mes = null,
  limite_sucursales = 3, limite_novandra_mes = 150, novandra_ia = true, orden = 2, destacado = true
 where id = 'pro';
-- El id sigue siendo "empresa" para no romper datos existentes; el nombre comercial es Enterprise.
update public.stockly_planes set
  nombre = 'Enterprise', descripcion = 'Sin límites de productos, bodegas ni sedes, para equipos grandes.',
  precio_mensual = 189900, precio_anual = 1899000,
  limite_productos = null, limite_bodegas = null, limite_usuarios = 15, limite_ventas_mes = null,
  limite_sucursales = null, limite_novandra_mes = 600, novandra_ia = true, orden = 3, destacado = false
 where id = 'empresa';

-- ----------------------------------------------------------- Interruptores globales
create table if not exists public.stockly_ajustes_globales (
  clave text primary key,
  valor jsonb not null,
  actualizado timestamptz not null default now()
);
alter table public.stockly_ajustes_globales enable row level security;
drop policy if exists "ajustes globales visibles" on public.stockly_ajustes_globales;
create policy "ajustes globales visibles" on public.stockly_ajustes_globales for select using (true);
-- Para activar una función: update stockly_ajustes_globales set valor = 'true' where clave = '...';
insert into public.stockly_ajustes_globales (clave, valor) values
  ('novandra_ia_disponible', 'false'),
  ('factura_electronica_disponible', 'false'),
  ('nequi_qr_disponible', 'false'),
  ('descuento_primera_compra', '50'),
  ('dias_prueba', '30')
on conflict (clave) do nothing;

create or replace function public.stockly_ajuste(_clave text)
returns jsonb
language sql stable security definer set search_path = public
as $$ select valor from stockly_ajustes_globales where clave = _clave $$;

-- ----------------------------------------------------------- Suscripciones
alter table public.stockly_suscripciones add column if not exists prueba_hasta timestamptz;
alter table public.stockly_suscripciones add column if not exists vence_en timestamptz;
alter table public.stockly_suscripciones alter column prueba_hasta set default (now() + interval '30 days');
-- Las empresas que ya existen (sin pagos) arrancan su mes de prueba ahora.
update public.stockly_suscripciones set prueba_hasta = now() + interval '30 days', id_plan = 'basico'
 where vence_en is null and prueba_hasta is null;

-- Plan que rige hoy para la empresa.
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
    -- Mes de prueba: todo Enterprise, con pocas consultas de IA para evitar abusos.
    select * into _p from stockly_planes where id = 'empresa';
    _p.limite_novandra_mes := 30;
    _p.nombre := 'Enterprise (prueba)';
  else
    select * into _p from stockly_planes where id = 'basico';
  end if;
  return _p;
end $$;

-- Estado de la suscripción para la app (plan efectivo, prueba, vencimiento, primera compra).
create or replace function public.stockly_estado_suscripcion(_id_empresa bigint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _s public.stockly_suscripciones;
  _p public.stockly_planes;
  _pagado boolean;
  _en_prueba boolean;
begin
  if not public.stockly_es_miembro(_id_empresa) then raise exception 'Sin acceso a esta empresa'; end if;
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  _p := public.stockly_plan(_id_empresa);
  _pagado := _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now();
  _en_prueba := not _pagado and _s.prueba_hasta is not null and _s.prueba_hasta > now();
  return jsonb_build_object(
    'plan_efectivo', _p.id,
    'plan_nombre', _p.nombre,
    'plan_pagado', case when _pagado then _s.id_plan end,
    'ciclo', _s.ciclo,
    'en_prueba', _en_prueba,
    'prueba_hasta', _s.prueba_hasta,
    'vence_en', _s.vence_en,
    'vencido', not _pagado and not _en_prueba and (_s.vence_en is not null or _s.prueba_hasta is not null),
    'dias_restantes', case
      when _pagado then greatest(0, ceil(extract(epoch from _s.vence_en - now()) / 86400))
      when _en_prueba then greatest(0, ceil(extract(epoch from _s.prueba_hasta - now()) / 86400)) end,
    'primera_compra', not exists (select 1 from pagos_suscripcion where id_empresa = _id_empresa and estado = 'aprobado'),
    'descuento_primera_compra', coalesce((public.stockly_ajuste('descuento_primera_compra'))::text::int, 0)
  );
end $$;

-- ----------------------------------------------------------- Pagos de suscripción
create table if not exists public.pagos_suscripcion (
  id bigint generated by default as identity primary key,
  id_empresa bigint not null references public."Empresa"(id) on delete cascade,
  id_plan text not null references public.stockly_planes(id),
  ciclo text not null check (ciclo in ('mensual', 'anual')),
  precio numeric(14, 2) not null,
  descuento numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  referencia text not null unique,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'anulado', 'error')),
  transaccion text,
  metodo text,
  email text,
  creado_por bigint,
  created_at timestamptz not null default now(),
  aprobado_en timestamptz,
  periodo_hasta timestamptz
);
create index if not exists pagos_suscripcion_empresa on public.pagos_suscripcion (id_empresa, created_at desc);
alter table public.pagos_suscripcion enable row level security;
drop policy if exists "admins ven pagos de suscripcion" on public.pagos_suscripcion;
create policy "admins ven pagos de suscripcion" on public.pagos_suscripcion for select using (public.stockly_es_admin(id_empresa));

-- Precio de un plan para la empresa (con el descuento de la primera compra).
create or replace function public.stockly_cotizar_plan(_id_empresa bigint, _id_plan text, _ciclo text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _p public.stockly_planes;
  _precio numeric;
  _pct int;
  _primera boolean;
  _descuento numeric := 0;
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Solo el dueño o un administrador puede comprar un plan'; end if;
  select * into _p from stockly_planes where id = _id_plan;
  if not found or _id_plan = 'basico' then raise exception 'Plan no válido'; end if;
  if _ciclo not in ('mensual', 'anual') then raise exception 'Ciclo no válido'; end if;
  _precio := case when _ciclo = 'anual' then _p.precio_anual else _p.precio_mensual end;
  _primera := not exists (select 1 from pagos_suscripcion where id_empresa = _id_empresa and estado = 'aprobado');
  _pct := coalesce((public.stockly_ajuste('descuento_primera_compra'))::text::int, 0);
  if _primera and _pct > 0 then _descuento := round(_precio * _pct / 100.0); end if;
  return jsonb_build_object('plan', _p.id, 'nombre', _p.nombre, 'ciclo', _ciclo, 'precio', _precio,
                            'descuento', _descuento, 'descuento_pct', case when _descuento > 0 then _pct else 0 end,
                            'total', _precio - _descuento, 'primera_compra', _primera);
end $$;
grant execute on function public.stockly_cotizar_plan(bigint, text, text) to authenticated;

-- Wompi confirmó (o rechazó) un pago. Solo la llaman las Edge Functions con la llave de servicio.
create or replace function public.stockly_aplicar_pago_suscripcion(
  _referencia text, _estado text, _transaccion text, _monto_centavos bigint, _metodo text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _pago public.pagos_suscripcion;
  _s public.stockly_suscripciones;
  _desde timestamptz;
  _hasta timestamptz;
  _plan_nombre text;
begin
  select * into _pago from pagos_suscripcion where referencia = _referencia for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'referencia desconocida'); end if;
  if _pago.estado = 'aprobado' then return jsonb_build_object('ok', true, 'repetido', true); end if;

  if _estado <> 'APPROVED' then
    update pagos_suscripcion set estado = case when _estado in ('DECLINED', 'VOIDED') then 'rechazado' when _estado = 'ERROR' then 'error' else estado end,
                                 transaccion = coalesce(_transaccion, transaccion), metodo = coalesce(_metodo, metodo)
     where id = _pago.id;
    return jsonb_build_object('ok', true, 'estado', _estado);
  end if;
  if _monto_centavos is distinct from round(_pago.total * 100)::bigint then
    return jsonb_build_object('ok', false, 'motivo', 'monto distinto');
  end if;

  select * into _s from stockly_suscripciones where id_empresa = _pago.id_empresa for update;
  -- Si renueva el mismo plan antes de vencer, se suma al tiempo que le queda; si cambia de plan, arranca hoy.
  _desde := case when _s.id_plan = _pago.id_plan and _s.vence_en > now() then _s.vence_en else now() end;
  _hasta := _desde + case when _pago.ciclo = 'anual' then interval '1 year' else interval '1 month' end;

  update stockly_suscripciones
     set id_plan = _pago.id_plan, ciclo = _pago.ciclo, estado = 'activa', vence_en = _hasta, renovacion = _hasta,
         inicio = case when id_plan = _pago.id_plan then inicio else now() end
   where id_empresa = _pago.id_empresa;
  update pagos_suscripcion set estado = 'aprobado', transaccion = _transaccion, metodo = _metodo,
                               aprobado_en = now(), periodo_hasta = _hasta
   where id = _pago.id;
  insert into historial_suscripcion (id_empresa, plan_anterior, plan_nuevo, ciclo, id_usuario)
  values (_pago.id_empresa, _s.id_plan, _pago.id_plan, _pago.ciclo, _pago.creado_por);

  select nombre into _plan_nombre from stockly_planes where id = _pago.id_plan;
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_pago.id_empresa, 'plan', 'Pago recibido: plan ' || _plan_nombre,
          'Tu plan está activo hasta el ' || to_char(_hasta at time zone 'America/Bogota', 'DD/MM/YYYY') || '. ¡Gracias!',
          '/configurar/plan');
  return jsonb_build_object('ok', true, 'vence_en', _hasta);
end $$;
revoke execute on function public.stockly_aplicar_pago_suscripcion(text, text, text, bigint, text) from public, anon, authenticated;

-- Estado de un pago (para la pantalla de regreso desde Wompi).
create or replace function public.stockly_estado_pago_suscripcion(_referencia text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('estado', p.estado, 'plan', pl.nombre, 'ciclo', p.ciclo, 'total', p.total, 'periodo_hasta', p.periodo_hasta)
    from pagos_suscripcion p join stockly_planes pl on pl.id = p.id_plan
   where p.referencia = _referencia and public.stockly_es_admin(p.id_empresa)
$$;
grant execute on function public.stockly_estado_pago_suscripcion(text) to authenticated;

-- ----------------------------------------------------------- Cambio de plan sin pago
-- Solo se puede bajar al plan Básico (gratis). Los planes pagos se activan al pagar.
create or replace function public.cambiar_plan(_id_empresa bigint, _id_plan text, _ciclo text default 'mensual')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _anterior text;
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede cambiar el plan';
  end if;
  if _id_plan <> 'basico' then
    raise exception 'Para activar el plan % debes pagarlo desde Plan y suscripción.', (select nombre from stockly_planes where id = _id_plan);
  end if;
  select id_plan into _anterior from stockly_suscripciones where id_empresa = _id_empresa;
  update stockly_suscripciones set id_plan = 'basico', vence_en = null, prueba_hasta = least(prueba_hasta, now()), estado = 'activa'
   where id_empresa = _id_empresa;
  insert into historial_suscripcion (id_empresa, plan_anterior, plan_nuevo, ciclo, id_usuario)
  values (_id_empresa, _anterior, 'basico', coalesce(_ciclo, 'mensual'), public.stockly_id_usuario());
  return jsonb_build_object('plan', 'basico');
end $$;

grant execute on function public.stockly_estado_suscripcion(bigint) to authenticated;
