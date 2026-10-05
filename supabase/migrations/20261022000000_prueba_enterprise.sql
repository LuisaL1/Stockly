-- =====================================================================
-- Stockly: prueba de Enterprise por 7 días registrando un medio de pago.
--
-- Reemplaza el mes de prueba automático: las empresas nuevas empiezan en el
-- plan Básico. Quien quiera probar Enterprise registra su tarjeta en Wompi
-- (se guarda como fuente de pago, SIN cobrar nada) y obtiene 7 días.
-- Al terminar, pasa sola al Básico: no hay cobro automático.
--  * Una sola prueba por empresa, por persona (cuenta) y por tarjeta.
--  * Las empresas que ya estaban en su mes de prueba lo conservan.
-- Requiere 20261021000000_complementos.sql. Se puede ejecutar varias veces.
-- =====================================================================

alter table public.stockly_suscripciones alter column prueba_hasta set default null;
alter table public.stockly_suscripciones add column if not exists prueba_usada_en timestamptz;
alter table public.stockly_suscripciones add column if not exists wompi_fuente_pago bigint;
alter table public.stockly_suscripciones add column if not exists medio_pago_resumen text;   -- p. ej. "VISA •••• 4242"

-- Las que ya tuvieron (o tienen) la prueba automática cuentan como usada.
update public.stockly_suscripciones set prueba_usada_en = coalesce(prueba_usada_en, now())
 where prueba_hasta is not null and prueba_usada_en is null;

insert into public.stockly_ajustes_globales (clave, valor) values ('dias_prueba', '7')
on conflict (clave) do update set valor = '7';

-- Huellas para no repetir la prueba: "cuenta:<uuid>" y "tarjeta:<hash>".
create table if not exists public.pruebas_usadas (
  huella text primary key,
  id_empresa bigint references public."Empresa"(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.pruebas_usadas enable row level security;
revoke all on public.pruebas_usadas from anon, authenticated;

-- ¿Puede esta empresa/cuenta empezar la prueba? (lo revisa la app antes de abrir Wompi)
create or replace function public.stockly_prueba_disponible(_id_empresa bigint)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare _s public.stockly_suscripciones;
begin
  if not public.stockly_es_admin(_id_empresa) then return false; end if;
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa;
  if _s.prueba_usada_en is not null then return false; end if;
  if _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then return false; end if;
  if exists (select 1 from pruebas_usadas where huella = 'cuenta:' || auth.uid()::text) then return false; end if;
  return true;
end $$;
grant execute on function public.stockly_prueba_disponible(bigint) to authenticated;

-- Activa la prueba. Solo la llama la Edge Function (llave de servicio) después de
-- guardar la tarjeta en Wompi. _huella_tarjeta puede ser null si Wompi no da datos.
create or replace function public.stockly_activar_prueba(
  _id_empresa bigint, _uid uuid, _fuente bigint, _resumen text, _huella_tarjeta text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _s public.stockly_suscripciones;
  _dias int := coalesce((public.stockly_ajuste('dias_prueba'))::text::int, 7);
  _hasta timestamptz;
begin
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa for update;
  if not found then raise exception 'Empresa no encontrada'; end if;
  if _s.prueba_usada_en is not null then raise exception 'Esta empresa ya usó su prueba de Enterprise.'; end if;
  if _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then
    raise exception 'Ya tienes un plan pagado activo.';
  end if;
  if exists (select 1 from pruebas_usadas where huella = 'cuenta:' || _uid::text) then
    raise exception 'Ya usaste la prueba de Enterprise con otra empresa.';
  end if;
  if _huella_tarjeta is not null and exists (select 1 from pruebas_usadas where huella = 'tarjeta:' || _huella_tarjeta) then
    raise exception 'Esta tarjeta ya se usó para una prueba. Usa otro medio de pago o compra un plan.';
  end if;

  _hasta := now() + make_interval(days => _dias);
  update stockly_suscripciones
     set prueba_hasta = _hasta, prueba_usada_en = now(), wompi_fuente_pago = _fuente, medio_pago_resumen = _resumen
   where id_empresa = _id_empresa;
  insert into pruebas_usadas (huella, id_empresa) values ('cuenta:' || _uid::text, _id_empresa) on conflict do nothing;
  if _huella_tarjeta is not null then
    insert into pruebas_usadas (huella, id_empresa) values ('tarjeta:' || _huella_tarjeta, _id_empresa) on conflict do nothing;
  end if;
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_id_empresa, 'plan', 'Prueba de Enterprise activa',
          'Tienes todo Enterprise hasta el ' || to_char(_hasta at time zone 'America/Bogota', 'DD/MM/YYYY')
          || '. No se hizo ningún cobro; al terminar pasas al Básico.', '/configurar/plan');
  return jsonb_build_object('ok', true, 'prueba_hasta', _hasta, 'dias', _dias);
end $$;
revoke execute on function public.stockly_activar_prueba(bigint, uuid, bigint, text, text) from public, anon, authenticated;

-- Estado de la suscripción para la app (ahora con la prueba disponible).
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
    'prueba_disponible', public.stockly_prueba_disponible(_id_empresa),
    'dias_prueba', coalesce((public.stockly_ajuste('dias_prueba'))::text::int, 7),
    'medio_pago', _s.medio_pago_resumen,
    'vence_en', _s.vence_en,
    'vencido', not _pagado and not _en_prueba and (_s.vence_en is not null or _s.prueba_hasta is not null),
    'dias_restantes', case
      when _pagado then greatest(0, ceil(extract(epoch from _s.vence_en - now()) / 86400))
      when _en_prueba then greatest(0, ceil(extract(epoch from _s.prueba_hasta - now()) / 86400)) end,
    'primera_compra', not exists (select 1 from pagos_suscripcion where id_empresa = _id_empresa and estado = 'aprobado'),
    'descuento_primera_compra', coalesce((public.stockly_ajuste('descuento_primera_compra'))::text::int, 0)
  );
end $$;

-- --------------------------------------------------------------- Sin cobros al terminar
-- GARANTÍA: la tarjeta guardada (wompi_fuente_pago) NUNCA se usa para cobrar. Ninguna
-- función de Stockly crea transacciones con ella; Wompi tampoco cobra por su cuenta.
-- Al terminar la prueba la empresa pasa sola al Básico (stockly_plan) y se le avisa.
comment on column public.stockly_suscripciones.wompi_fuente_pago is
  'Fuente de pago registrada en Wompi para la prueba. NO se usa para cobrar: solo valida el medio de pago.';
alter table public.stockly_suscripciones add column if not exists prueba_aviso_fin_en timestamptz;

update public.notificaciones set mensaje = replace(mensaje, 'No se hizo ningún cobro; al terminar pasas al Básico.',
  'No se hizo ni se hará ningún cobro: al terminar pasas al plan Básico gratis.')
 where titulo = 'Prueba de Enterprise activa';

create or replace function public.stockly_activar_prueba(
  _id_empresa bigint, _uid uuid, _fuente bigint, _resumen text, _huella_tarjeta text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _s public.stockly_suscripciones;
  _dias int := coalesce((public.stockly_ajuste('dias_prueba'))::text::int, 7);
  _hasta timestamptz;
begin
  select * into _s from stockly_suscripciones where id_empresa = _id_empresa for update;
  if not found then raise exception 'Empresa no encontrada'; end if;
  if _s.prueba_usada_en is not null then raise exception 'Esta empresa ya usó su prueba de Enterprise.'; end if;
  if _s.id_plan <> 'basico' and _s.vence_en is not null and _s.vence_en > now() then
    raise exception 'Ya tienes un plan pagado activo.';
  end if;
  if exists (select 1 from pruebas_usadas where huella = 'cuenta:' || _uid::text) then
    raise exception 'Ya usaste la prueba de Enterprise con otra empresa.';
  end if;
  if _huella_tarjeta is not null and exists (select 1 from pruebas_usadas where huella = 'tarjeta:' || _huella_tarjeta) then
    raise exception 'Esta tarjeta ya se usó para una prueba. Usa otro medio de pago o compra un plan.';
  end if;

  _hasta := now() + make_interval(days => _dias);
  update stockly_suscripciones
     set prueba_hasta = _hasta, prueba_usada_en = now(), wompi_fuente_pago = _fuente, medio_pago_resumen = _resumen
   where id_empresa = _id_empresa;
  insert into pruebas_usadas (huella, id_empresa) values ('cuenta:' || _uid::text, _id_empresa) on conflict do nothing;
  if _huella_tarjeta is not null then
    insert into pruebas_usadas (huella, id_empresa) values ('tarjeta:' || _huella_tarjeta, _id_empresa) on conflict do nothing;
  end if;
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_id_empresa, 'plan', 'Prueba de Enterprise activa',
          'Tienes todo Enterprise hasta el ' || to_char(_hasta at time zone 'America/Bogota', 'DD/MM/YYYY')
          || '. No se hizo ni se hará ningún cobro: al terminar pasas al plan Básico gratis.', '/configurar/plan');
  return jsonb_build_object('ok', true, 'prueba_hasta', _hasta, 'dias', _dias);
end $$;
revoke execute on function public.stockly_activar_prueba(bigint, uuid, bigint, text, text) from public, anon, authenticated;

-- Quien ya compró un plan durante la prueba no necesita el aviso.
update public.stockly_suscripciones set prueba_aviso_fin_en = now()
 where prueba_aviso_fin_en is null and id_plan <> 'basico' and vence_en is not null;

-- Aviso cuando termina la prueba (cada hora, con pg_cron).
create or replace function public.stockly_avisar_pruebas_terminadas()
returns int
language plpgsql security definer set search_path = public
as $$
declare _n int;
begin
  with terminadas as (
    update stockly_suscripciones s
       set prueba_aviso_fin_en = now()
     where s.prueba_usada_en is not null and s.prueba_hasta <= now() and s.prueba_aviso_fin_en is null
       and s.prueba_hasta > now() - interval '2 days'   -- solo pruebas recién terminadas
       and not (s.id_plan <> 'basico' and s.vence_en is not null and s.vence_en > now())
    returning s.id_empresa)
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  select id_empresa, 'plan', 'Tu prueba de Enterprise terminó',
         'No se hizo ningún cobro. Ahora estás en el plan Básico gratis y tus datos están intactos. '
         || 'Puedes comprar Enterprise cuando quieras desde Plan y suscripción.', '/configurar/plan'
    from terminadas;
  get diagnostics _n = row_count;
  return _n;
end $$;
revoke execute on function public.stockly_avisar_pruebas_terminadas() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'stockly avisar pruebas terminadas';
    perform cron.schedule('stockly avisar pruebas terminadas', '15 * * * *', 'select public.stockly_avisar_pruebas_terminadas();');
  end if;
end $$;
