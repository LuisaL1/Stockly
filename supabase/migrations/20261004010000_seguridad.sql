-- =====================================================================
-- Stockly v2.2: cierra tablas que se podían leer sin iniciar sesión.
--
-- Antes de esta migración, con solo la clave pública se podían leer:
--   * "Usuarios": nombres, cédulas, teléfonos, direcciones y correos.
--   * "permisos": los módulos de cada usuario.
--   * "suscripciones" (tabla anterior, no la usa Stockly v2): empresa, plan y fechas.
--
-- Reglas nuevas:
--   * Usuarios: ves tu perfil y el de tus compañeros de empresa. Solo dueños y
--     administradores crean, editan o eliminan personal de su empresa.
--   * permisos: ves los tuyos y los de tu empresa; solo administradores los cambian.
--   * suscripciones / planes (tablas anteriores): lectura para miembros / pública;
--     sin escritura desde la app.
--
-- Se eliminan las políticas que existieran en estas tablas y se crean de nuevo.
-- Requiere 20261003000000_stockly_v2.sql.
-- =====================================================================

-- ¿El usuario en sesión es dueño o administrador de alguna empresa?
create or replace function public.stockly_es_admin_actual()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from "Usuarios" u
    where u.id = public.stockly_id_usuario()
      and lower(coalesce(u.tipouser, '')) in ('dueño', 'administrador', 'admin')
  )
$$;

-- ¿El usuario indicado comparte empresa con el usuario en sesión?
create or replace function public.stockly_comparte_empresa(_id_usuario bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from asignarempresa a
    join asignarempresa b on b.id_empresa = a.id_empresa
    where a.id_usuario = _id_usuario and b.id_usuario = public.stockly_id_usuario()
  )
$$;

-- ¿El usuario indicado todavía no está asignado a ninguna empresa?
-- (al crear un empleado, el perfil existe un instante antes de su asignación)
create or replace function public.stockly_sin_empresa(_id_usuario bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from asignarempresa where id_usuario = _id_usuario)
$$;

grant execute on function public.stockly_es_admin_actual(), public.stockly_comparte_empresa(bigint),
  public.stockly_sin_empresa(bigint) to authenticated;

-- Quita todas las políticas existentes de una tabla (para no dejar ninguna permisiva).
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('Usuarios', 'permisos', 'suscripciones', 'planes')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------
alter table public."Usuarios" enable row level security;

create policy "usuarios ver" on public."Usuarios" for select to authenticated
  using (
    idauth::text = auth.uid()::text
    or public.stockly_comparte_empresa(id)
    or (public.stockly_es_admin_actual() and public.stockly_sin_empresa(id))
  );

-- Un administrador crea perfiles de empleados (su cuenta de acceso ya existe en Auth).
create policy "usuarios crear" on public."Usuarios" for insert to authenticated
  with check (idauth::text = auth.uid()::text or public.stockly_es_admin_actual());

create policy "usuarios editar" on public."Usuarios" for update to authenticated
  using (
    idauth::text = auth.uid()::text
    or (public.stockly_es_admin_actual() and public.stockly_comparte_empresa(id))
  )
  with check (
    idauth::text = auth.uid()::text
    or (public.stockly_es_admin_actual() and public.stockly_comparte_empresa(id))
  );

create policy "usuarios eliminar" on public."Usuarios" for delete to authenticated
  using (
    idauth::text <> auth.uid()::text
    and public.stockly_es_admin_actual()
    and public.stockly_comparte_empresa(id)
  );

-- Un usuario no puede subirse de rango a sí mismo: solo un administrador cambia "tipouser".
create or replace function public.tg_usuarios_proteger_tipo()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.tipouser is distinct from old.tipouser
     and auth.uid() is not null
     and not public.stockly_es_admin_actual() then
    raise exception 'Solo un administrador puede cambiar el tipo de usuario';
  end if;
  if new.idauth is distinct from old.idauth and auth.uid() is not null then
    raise exception 'No se puede cambiar la cuenta de acceso de un usuario';
  end if;
  return new;
end $$;

drop trigger if exists usuarios_proteger_tipo on public."Usuarios";
create trigger usuarios_proteger_tipo before update on public."Usuarios"
  for each row execute function public.tg_usuarios_proteger_tipo();

-- ---------------------------------------------------------------------
-- permisos
-- ---------------------------------------------------------------------
alter table public.permisos enable row level security;

create policy "permisos ver" on public.permisos for select to authenticated
  using (id_usuario = public.stockly_id_usuario() or public.stockly_comparte_empresa(id_usuario));

create policy "permisos crear" on public.permisos for insert to authenticated
  with check (public.stockly_es_admin_actual() and public.stockly_comparte_empresa(id_usuario));

create policy "permisos eliminar" on public.permisos for delete to authenticated
  using (public.stockly_es_admin_actual() and public.stockly_comparte_empresa(id_usuario));

-- ---------------------------------------------------------------------
-- Tablas anteriores "suscripciones" y "planes" (no las usa Stockly v2)
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('public.suscripciones') is not null then
    execute 'alter table public.suscripciones enable row level security';
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'suscripciones' and column_name = 'id_empresa') then
      execute 'create policy "suscripciones ver" on public.suscripciones for select to authenticated
                 using (public.stockly_es_miembro(id_empresa::bigint))';
    end if;
  end if;
  if to_regclass('public.planes') is not null then
    execute 'alter table public.planes enable row level security';
    execute 'create policy "planes ver" on public.planes for select using (true)';
  end if;
end $$;
