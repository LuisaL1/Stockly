-- =====================================================================
-- Stockly v2.1: registro completo de una empresa nueva.
--
-- stockly_completar_registro crea, en una sola transacción, el perfil del
-- usuario (Usuarios), la empresa, la asignación, todos los permisos y el plan
-- elegido. Es idempotente: si el usuario ya tiene perfil o empresa, los reutiliza.
-- La app la llama justo después de crear la cuenta o, si el proyecto exige
-- confirmar el correo, en el primer ingreso (con los datos guardados en la cuenta).
-- Requiere la migración 20261003000000_stockly_v2.sql.
-- =====================================================================

-- Datos del negocio que se piden al registrarse.
alter table public."Empresa" add column if not exists nit text;
alter table public."Empresa" add column if not exists sector text;
alter table public."Empresa" add column if not exists ciudad text;
alter table public."Empresa" add column if not exists telefono text;

-- _datos: { nombres, documento, telefono?, empresa, nit?, sector?, ciudad?, moneda?, plan?, ciclo? }
create or replace function public.stockly_completar_registro(_datos jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _email text;
  _id_usuario bigint;
  _id_empresa bigint;
  _plan text := coalesce(nullif(_datos->>'plan', ''), 'basico');
  _ciclo text := coalesce(nullif(_datos->>'ciclo', ''), 'mensual');
  _nombre_empresa text := nullif(btrim(_datos->>'empresa'), '');
begin
  if _uid is null then raise exception 'Debes iniciar sesión para completar el registro'; end if;
  select email into _email from auth.users where id = _uid;

  -- Un solo registro a la vez por usuario (evita duplicados si se llama dos veces seguidas).
  perform pg_advisory_xact_lock(hashtext('registro_' || _uid::text));

  select id into _id_usuario from public."Usuarios" where idauth::text = _uid::text limit 1;
  if _id_usuario is null then
    -- Texto vacío en lugar de null: la tabla puede exigir estos campos (p. ej. nro_docum).
    insert into public."Usuarios" (nombres, email, nro_docum, telefono, direccion, fecharegistro, estado, idauth, tipouser)
    values (coalesce(btrim(_datos->>'nombres'), ''), coalesce(_email, ''), coalesce(btrim(_datos->>'documento'), ''),
            coalesce(btrim(_datos->>'telefono'), ''), coalesce(btrim(_datos->>'ciudad'), ''),
            now(), 'activo', _uid::text, 'Dueño')
    returning id into _id_usuario;
  end if;

  -- Si ya tiene empresa (por un registro previo o un trigger existente) no se crea otra.
  select id_empresa into _id_empresa from public.asignarempresa where id_usuario = _id_usuario limit 1;

  -- Una base anterior crea sola una empresa "empresa de <correo>" al registrar el usuario:
  -- se adopta y se le ponen los datos reales del registro.
  if _id_empresa is not null and _nombre_empresa is not null
     and exists (select 1 from public."Empresa" where id = _id_empresa and nombre ilike 'empresa de%') then
    update public."Empresa"
       set nombre = _nombre_empresa,
           simbolomoneda = coalesce(nullif(btrim(_datos->>'moneda'), ''), simbolomoneda),
           nit = coalesce(nullif(btrim(_datos->>'nit'), ''), nit),
           sector = coalesce(nullif(btrim(_datos->>'sector'), ''), sector),
           ciudad = coalesce(nullif(btrim(_datos->>'ciudad'), ''), ciudad),
           telefono = coalesce(nullif(btrim(_datos->>'telefono'), ''), telefono)
     where id = _id_empresa;
    perform public.stockly_inicializar_empresa(_id_empresa);
    update public.config_facturacion
       set razon_social = _nombre_empresa, nit = coalesce(nullif(btrim(_datos->>'nit'), ''), nit), email = coalesce(email, _email)
     where id_empresa = _id_empresa;
  end if;

  if _id_empresa is null then
    if _nombre_empresa is null then raise exception 'Escribe el nombre de tu empresa'; end if;

    insert into public."Empresa" (nombre, simbolomoneda, nit, sector, ciudad, telefono)
    values (_nombre_empresa, coalesce(nullif(btrim(_datos->>'moneda'), ''), '$'),
            nullif(btrim(_datos->>'nit'), ''), nullif(btrim(_datos->>'sector'), ''),
            nullif(btrim(_datos->>'ciudad'), ''), nullif(btrim(_datos->>'telefono'), ''))
    returning id into _id_empresa;

    insert into public.asignarempresa (id_empresa, id_usuario) values (_id_empresa, _id_usuario);

    -- La bodega principal, la suscripción y la facturación las crea el trigger de Empresa;
    -- aquí se completan con los datos del registro.
    perform public.stockly_inicializar_empresa(_id_empresa);
    update public.config_facturacion
       set razon_social = _nombre_empresa, nit = nullif(btrim(_datos->>'nit'), ''),
           telefono = nullif(btrim(_datos->>'telefono'), ''), email = _email,
           direccion = nullif(btrim(_datos->>'ciudad'), '')
     where id_empresa = _id_empresa;

    if exists (select 1 from public.stockly_planes where id = _plan) and _ciclo in ('mensual', 'anual') then
      update public.stockly_suscripciones
         set id_plan = _plan, ciclo = _ciclo,
             renovacion = now() + case when _ciclo = 'anual' then interval '1 year' else interval '1 month' end
       where id_empresa = _id_empresa;
      insert into public.historial_suscripcion (id_empresa, plan_anterior, plan_nuevo, ciclo, id_usuario)
      values (_id_empresa, null, _plan, _ciclo, _id_usuario);
    end if;

    insert into public.notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
    values (_id_empresa, 'sistema', '¡Bienvenido a Stockly!',
            'Empieza registrando tus productos o pídele a Novandra que te guíe.', '/configurar/productos');
  end if;

  -- El dueño tiene acceso a todos los módulos.
  insert into public.permisos (id_usuario, idmodulo)
  select _id_usuario, m.id from public.modulos m
  where not exists (select 1 from public.permisos p where p.id_usuario = _id_usuario and p.idmodulo = m.id);

  return jsonb_build_object('id_usuario', _id_usuario, 'id_empresa', _id_empresa);
end $$;

revoke execute on function public.stockly_completar_registro(jsonb) from public, anon;
grant execute on function public.stockly_completar_registro(jsonb) to authenticated;

-- Si cambia el nombre de la empresa, la razón social de las facturas lo sigue
-- (salvo que se haya escrito una distinta a propósito).
create or replace function public.tg_empresa_nombre_facturacion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.nombre is distinct from old.nombre then
    update public.config_facturacion
       set razon_social = new.nombre
     where id_empresa = new.id and (razon_social is null or razon_social = old.nombre or razon_social ilike 'empresa de%');
  end if;
  return new;
end $$;

drop trigger if exists empresa_nombre_facturacion on public."Empresa";
create trigger empresa_nombre_facturacion after update of nombre on public."Empresa"
  for each row execute function public.tg_empresa_nombre_facturacion();
