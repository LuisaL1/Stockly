-- =====================================================================
-- Stockly v3.2: edición de los datos de la empresa.
--
-- La tabla "Empresa" tiene reglas de acceso anteriores que no permiten
-- actualizarla desde la app: el cambio se descartaba sin error y el nombre
-- automático ("empresa de …") seguía apareciendo. Ahora se edita con
-- actualizar_empresa, que verifica que quien guarda sea dueño o administrador.
-- También se reparan los nombres automáticos con el nombre que el dueño
-- escribió al registrarse.
-- =====================================================================

create or replace function public.actualizar_empresa(_id_empresa bigint, _datos jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _nombre text := nullif(btrim(_datos->>'nombre'), '');
  _fila public."Empresa";
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede editar los datos de la empresa';
  end if;
  if _datos ? 'nombre' and _nombre is null then raise exception 'Escribe el nombre de la empresa'; end if;

  update public."Empresa"
     set nombre = coalesce(_nombre, nombre),
         simbolomoneda = coalesce(nullif(btrim(_datos->>'simbolomoneda'), ''), simbolomoneda),
         nit = case when _datos ? 'nit' then nullif(btrim(_datos->>'nit'), '') else nit end,
         sector = case when _datos ? 'sector' then nullif(btrim(_datos->>'sector'), '') else sector end,
         ciudad = case when _datos ? 'ciudad' then nullif(btrim(_datos->>'ciudad'), '') else ciudad end,
         telefono = case when _datos ? 'telefono' then nullif(btrim(_datos->>'telefono'), '') else telefono end
   where id = _id_empresa
  returning * into _fila;
  if not found then raise exception 'Empresa no encontrada'; end if;

  -- El NIT también se usa en la facturación (si allí estaba vacío).
  update public.config_facturacion set nit = _fila.nit
   where id_empresa = _id_empresa and nit is null and _fila.nit is not null;

  return jsonb_build_object('id', _fila.id, 'nombre', _fila.nombre, 'simbolomoneda', _fila.simbolomoneda,
                            'nit', _fila.nit, 'sector', _fila.sector, 'ciudad', _fila.ciudad, 'telefono', _fila.telefono);
end $$;
grant execute on function public.actualizar_empresa(bigint, jsonb) to authenticated;

-- Reparación: empresas con nombre automático cuyo dueño escribió un nombre al registrarse.
update public."Empresa" e
   set nombre = btrim(au.raw_user_meta_data->'registro'->>'empresa'),
       sector = coalesce(e.sector, nullif(btrim(au.raw_user_meta_data->'registro'->>'sector'), '')),
       ciudad = coalesce(e.ciudad, nullif(btrim(au.raw_user_meta_data->'registro'->>'ciudad'), '')),
       nit = coalesce(e.nit, nullif(btrim(au.raw_user_meta_data->'registro'->>'nit'), ''))
  from public.asignarempresa a
  join public."Usuarios" u on u.id = a.id_usuario
  join auth.users au on au.id::text = u.idauth::text
 where a.id_empresa = e.id
   and e.nombre ilike 'empresa de%'
   and lower(coalesce(u.tipouser, '')) in ('dueño', 'administrador', 'admin')
   and nullif(btrim(au.raw_user_meta_data->'registro'->>'empresa'), '') is not null;

-- La razón social de las facturas sigue al nombre (trigger de la migración de registro).
update public.config_facturacion f
   set razon_social = e.nombre
  from public."Empresa" e
 where f.id_empresa = e.id and (f.razon_social is null or f.razon_social ilike 'empresa de%');

-- La sede principal toma la ciudad de la empresa si no tenía.
update public.sucursales s
   set ciudad = e.ciudad
  from public."Empresa" e
 where s.id_empresa = e.id and s.ciudad is null and e.ciudad is not null;
