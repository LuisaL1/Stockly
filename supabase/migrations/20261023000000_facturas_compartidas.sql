-- =====================================================================
-- Stockly: PDF de la factura para compartir por WhatsApp.
--
-- En celulares la app comparte el PDF directo (menú de compartir del teléfono).
-- En computador sube el PDF a este almacenamiento privado y envía por WhatsApp
-- un enlace firmado (válido 30 días) para descargarlo. Un archivo por venta:
-- <id_empresa>/<id_venta>.pdf (se reemplaza si se vuelve a enviar).
-- Requiere 20261015000000_facturas_proveedor.sql (stockly_es_miembro_carpeta).
-- Se puede ejecutar varias veces.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas-compartidas', 'facturas-compartidas', false, 3145728, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "facturas compartidas: ver" on storage.objects;
create policy "facturas compartidas: ver" on storage.objects for select to authenticated
  using (bucket_id = 'facturas-compartidas' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
drop policy if exists "facturas compartidas: subir" on storage.objects;
create policy "facturas compartidas: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas-compartidas' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
drop policy if exists "facturas compartidas: cambiar" on storage.objects;
create policy "facturas compartidas: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'facturas-compartidas' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]))
  with check (bucket_id = 'facturas-compartidas' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
