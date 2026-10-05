-- =====================================================================
-- Stockly v3.8: logo de la empresa (facturas, reportes y menú).
--
--  * config_facturacion.logo_url: dirección pública del logo.
--  * Bucket "logos" (público para que el PDF pueda leerlo): cada empresa
--    guarda su logo en "<id_empresa>/logo.png". Solo el dueño o un
--    administrador de esa empresa puede subirlo, cambiarlo o quitarlo.
-- =====================================================================

alter table public.config_facturacion add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- La carpeta del archivo es el id de la empresa.
create or replace function public.stockly_es_admin_carpeta(_carpeta text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  if _carpeta is null or _carpeta !~ '^\d{1,18}$' then return false; end if;
  return public.stockly_es_admin(_carpeta::bigint);
end $$;
grant execute on function public.stockly_es_admin_carpeta(text) to authenticated;

drop policy if exists "logos: subir el de mi empresa" on storage.objects;
create policy "logos: subir el de mi empresa" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.stockly_es_admin_carpeta((storage.foldername(name))[1]));

drop policy if exists "logos: cambiar el de mi empresa" on storage.objects;
create policy "logos: cambiar el de mi empresa" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.stockly_es_admin_carpeta((storage.foldername(name))[1]))
  with check (bucket_id = 'logos' and public.stockly_es_admin_carpeta((storage.foldername(name))[1]));

drop policy if exists "logos: quitar el de mi empresa" on storage.objects;
create policy "logos: quitar el de mi empresa" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.stockly_es_admin_carpeta((storage.foldername(name))[1]));

-- Para que "subir con reemplazo" funcione, quien sube debe poder ver su propio archivo.
drop policy if exists "logos: ver el de mi empresa" on storage.objects;
create policy "logos: ver el de mi empresa" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and public.stockly_es_admin_carpeta((storage.foldername(name))[1]));

-- Guarda (o quita) la dirección del logo. Solo dueño o administrador.
create or replace function public.guardar_logo_empresa(_id_empresa bigint, _url text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede cambiar el logo';
  end if;
  if _url is not null and _url !~ ('^https://[a-z0-9.-]+/storage/v1/object/public/logos/' || _id_empresa || '/') then
    raise exception 'Dirección de logo no válida';
  end if;
  perform public.stockly_inicializar_empresa(_id_empresa);
  update config_facturacion set logo_url = _url, updated_at = now() where id_empresa = _id_empresa;
end $$;
grant execute on function public.guardar_logo_empresa(bigint, text) to authenticated;
