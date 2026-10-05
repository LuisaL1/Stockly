-- =====================================================================
-- Stockly v4.1: facturas de proveedores en las compras.
--
--  * Cada orden de compra puede guardar la factura del proveedor: número,
--    fecha, valor y el archivo (PDF, imagen, XML o ZIP de la factura
--    electrónica) en el almacenamiento privado "facturas-proveedor"
--    (carpeta <id_empresa>/). Solo miembros de la empresa la ven o cambian.
--  * El informe contable incluye la factura del proveedor y el detalle de lo
--    comprado (compras_detalle).
-- Requiere 20261014000000_informe_contable.sql.
-- =====================================================================

alter table public.ordenes_compra add column if not exists factura_proveedor_numero text;
alter table public.ordenes_compra add column if not exists factura_proveedor_fecha date;
alter table public.ordenes_compra add column if not exists factura_proveedor_valor numeric(14, 2);
alter table public.ordenes_compra add column if not exists factura_proveedor_archivo text;  -- ruta en el almacenamiento
alter table public.ordenes_compra add column if not exists factura_proveedor_nombre text;   -- nombre original del archivo

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas-proveedor', 'facturas-proveedor', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/xml', 'text/xml',
              'application/zip', 'application/x-zip-compressed'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.stockly_es_miembro_carpeta(_carpeta text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
begin
  if _carpeta is null or _carpeta !~ '^\d{1,18}$' then return false; end if;
  return public.stockly_es_miembro(_carpeta::bigint);
end $$;
grant execute on function public.stockly_es_miembro_carpeta(text) to authenticated;

drop policy if exists "facturas proveedor: ver" on storage.objects;
create policy "facturas proveedor: ver" on storage.objects for select to authenticated
  using (bucket_id = 'facturas-proveedor' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
drop policy if exists "facturas proveedor: subir" on storage.objects;
create policy "facturas proveedor: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'facturas-proveedor' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
drop policy if exists "facturas proveedor: cambiar" on storage.objects;
create policy "facturas proveedor: cambiar" on storage.objects for update to authenticated
  using (bucket_id = 'facturas-proveedor' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]))
  with check (bucket_id = 'facturas-proveedor' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));
drop policy if exists "facturas proveedor: quitar" on storage.objects;
create policy "facturas proveedor: quitar" on storage.objects for delete to authenticated
  using (bucket_id = 'facturas-proveedor' and public.stockly_es_miembro_carpeta((storage.foldername(name))[1]));

-- Guarda los datos de la factura del proveedor en la orden. _archivo: ruta "<id_empresa>/..." o null para quitarlo.
create or replace function public.guardar_factura_proveedor(
  _id_orden bigint, _numero text, _fecha date, _valor numeric, _archivo text, _nombre_archivo text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  _empresa bigint;
begin
  select id_empresa into _empresa from ordenes_compra where id = _id_orden;
  if _empresa is null or not public.stockly_es_miembro(_empresa) then raise exception 'Orden no encontrada'; end if;
  if _archivo is not null and _archivo !~ ('^' || _empresa || '/') then raise exception 'Archivo no válido'; end if;
  if _valor is not null and _valor < 0 then raise exception 'El valor no puede ser negativo'; end if;
  update ordenes_compra
     set factura_proveedor_numero = nullif(btrim(_numero), ''),
         factura_proveedor_fecha = _fecha,
         factura_proveedor_valor = _valor,
         factura_proveedor_archivo = _archivo,
         factura_proveedor_nombre = case when _archivo is null then null else left(nullif(btrim(_nombre_archivo), ''), 200) end
   where id = _id_orden;
end $$;
grant execute on function public.guardar_factura_proveedor(bigint, text, date, numeric, text, text) to authenticated;

-- Informe contable con facturas de proveedores y detalle de compras.
create or replace function public.stockly_informe_contable(_id_empresa bigint, _desde date, _hasta date)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _ini timestamptz := (_desde::timestamp at time zone 'America/Bogota');
  _fin timestamptz := ((_hasta + 1)::timestamp at time zone 'America/Bogota');
  _local constant text := 'America/Bogota';
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede generar el informe contable';
  end if;
  if _desde is null or _hasta is null or _hasta < _desde then raise exception 'Periodo no válido'; end if;
  if _hasta - _desde > 400 then raise exception 'El periodo máximo es de 13 meses'; end if;

  return jsonb_build_object(
    'periodo', jsonb_build_object('desde', _desde, 'hasta', _hasta),
    'empresa', (select jsonb_build_object('nombre', e.nombre, 'nit', coalesce(c.nit, e.nit), 'razon_social', c.razon_social,
                                          'regimen', c.regimen, 'ciudad', e.ciudad, 'moneda', e.simbolomoneda)
                  from "Empresa" e left join config_facturacion c on c.id_empresa = e.id where e.id = _id_empresa),

    -- Libro de ventas: todas las facturas del periodo (las anuladas se marcan, no suman en el resumen).
    'ventas', coalesce((select jsonb_agg(x order by x->>'fecha', (x->>'numero')::int) from (
        select jsonb_build_object(
                 'fecha', to_char(v.fecha at time zone _local, 'YYYY-MM-DD HH24:MI'),
                 'factura', v.prefijo || '-' || v.numero, 'numero', v.numero,
                 'tipo', coalesce(f.tipo, 'interna'), 'estado_dian', f.estado_dian, 'cufe', f.cufe,
                 'cliente', coalesce(c.nombre, 'Consumidor final'), 'tipo_documento', c.tipo_documento, 'documento', c.documento,
                 'medio_pago', v.metodo_pago, 'estado', v.estado,
                 'subtotal', v.subtotal, 'descuento', v.descuento, 'base', v.subtotal - v.descuento,
                 'iva', v.impuesto, 'total', v.total) x
          from ventas v
          left join facturas f on f.id_venta = v.id
          left join clientes c on c.id = v.id_cliente
         where v.id_empresa = _id_empresa and v.fecha >= _ini and v.fecha < _fin
         limit 20000) t), '[]'),

    -- IVA por tarifa (solo ventas no anuladas).
    'iva', coalesce((select jsonb_agg(jsonb_build_object('tarifa', tarifa, 'base', base, 'iva', iva, 'total', base + iva) order by tarifa) from (
        select d.iva tarifa,
               round(sum(d.cantidad * d.precio_unitario - d.descuento), 2) base,
               round(sum(d.total - (d.cantidad * d.precio_unitario - d.descuento)), 2) iva
          from detalle_venta d join ventas v on v.id = d.id_venta
         where v.id_empresa = _id_empresa and v.estado <> 'anulada' and v.fecha >= _ini and v.fecha < _fin
         group by d.iva) t), '[]'),

    -- Dinero recibido en el periodo, por medio de pago.
    'cobros', coalesce((select jsonb_agg(jsonb_build_object('medio', metodo, 'pagos', n, 'total', t) order by t desc) from (
        select p.metodo, count(*) n, sum(p.monto) t
          from pagos_venta p
         where p.id_empresa = _id_empresa and p.estado = 'aprobado'
           and coalesce(p.confirmado_en, p.created_at) >= _ini and coalesce(p.confirmado_en, p.created_at) < _fin
         group by p.metodo) t), '[]'),

    -- Cartera al cierre del periodo: ventas pendientes con saldo.
    'por_cobrar', coalesce((select jsonb_agg(x order by x->>'fecha') from (
        select jsonb_build_object(
                 'factura', v.prefijo || '-' || v.numero, 'fecha', to_char(v.fecha at time zone _local, 'YYYY-MM-DD'),
                 'cliente', coalesce(c.nombre, 'Consumidor final'), 'documento', c.documento, 'telefono', c.telefono,
                 'total', v.total, 'pagado', coalesce(pg.pagado, 0), 'saldo', v.total - coalesce(pg.pagado, 0),
                 'dias', (_hasta - (v.fecha at time zone _local)::date)) x
          from ventas v
          left join clientes c on c.id = v.id_cliente
          left join lateral (select sum(monto) pagado from pagos_venta where id_venta = v.id and estado = 'aprobado') pg on true
         where v.id_empresa = _id_empresa and v.estado = 'pendiente' and v.fecha < _fin
           and v.total - coalesce(pg.pagado, 0) > 0
         limit 20000) t), '[]'),

    -- Compras recibidas en el periodo, con la factura del proveedor.
    'compras', coalesce((select jsonb_agg(x order by x->>'recibida') from (
        select jsonb_build_object(
                 'id', o.id, 'orden', 'OC-' || o.numero, 'recibida', to_char(o.recibida_en at time zone _local, 'YYYY-MM-DD'),
                 'proveedor', coalesce(p.nombre, '—'), 'nit', p.nit, 'bodega', b.nombre, 'total', o.total, 'nota', o.nota,
                 'factura_numero', o.factura_proveedor_numero, 'factura_fecha', o.factura_proveedor_fecha,
                 'factura_valor', o.factura_proveedor_valor, 'factura_archivo', o.factura_proveedor_archivo is not null) x
          from ordenes_compra o
          left join proveedores p on p.id = o.id_proveedor
          left join bodegas b on b.id = o.id_bodega
         where o.id_empresa = _id_empresa and o.estado = 'recibida' and o.recibida_en >= _ini and o.recibida_en < _fin) t), '[]'),

    -- Detalle de lo comprado (producto por producto) en las compras recibidas del periodo.
    'compras_detalle', coalesce((select jsonb_agg(x order by x->>'recibida', x->>'orden') from (
        select jsonb_build_object(
                 'orden', 'OC-' || o.numero, 'recibida', to_char(o.recibida_en at time zone _local, 'YYYY-MM-DD'),
                 'proveedor', coalesce(p.nombre, '—'), 'factura_numero', o.factura_proveedor_numero,
                 'producto', d.descripcion, 'cantidad', d.cantidad, 'costo_unitario', d.costo_unitario, 'total', d.total) x
          from detalle_orden_compra d
          join ordenes_compra o on o.id = d.id_orden
          left join proveedores p on p.id = o.id_proveedor
         where o.id_empresa = _id_empresa and o.estado = 'recibida' and o.recibida_en >= _ini and o.recibida_en < _fin
         limit 20000) t), '[]'),

    -- Inventario valorizado (al momento de generar el informe).
    'inventario', coalesce((select jsonb_agg(x order by x->>'producto') from (
        select jsonb_build_object(
                 'producto', p.descripcion, 'codigo', p.codigointerno::text, 'categoria', c.descripcion,
                 'stock', p.stock, 'costo', p.preciocompra, 'valor_costo', round(p.stock * coalesce(p.preciocompra, 0), 2),
                 'precio', p.precioventa, 'valor_venta', round(p.stock * coalesce(p.precioventa, 0), 2)) x
          from productos p left join categorias c on c.id = p.id_categoria
         where p.id_empresa = _id_empresa
         limit 20000) t), '[]'),

    -- Movimientos de inventario del periodo (entradas, salidas, ajustes).
    'movimientos', coalesce((select jsonb_agg(x order by x->>'fecha') from (
        select jsonb_build_object(
                 'fecha', to_char(k.fecha at time zone _local, 'YYYY-MM-DD HH24:MI'), 'producto', p.descripcion,
                 'tipo', k.tipo, 'cantidad', k.cantidad, 'detalle', k.detalle, 'bodega', b.nombre,
                 'usuario', u.nombres) x
          from kardex k
          join productos p on p.id = k.id_producto
          left join bodegas b on b.id = k.id_bodega
          left join "Usuarios" u on u.id = k.id_usuario
         where k.id_empresa = _id_empresa and k.fecha >= _ini and k.fecha < _fin
         limit 20000) t), '[]'),

    'resumen', (select jsonb_build_object(
        'facturas', count(*) filter (where v.estado <> 'anulada'),
        'anuladas', count(*) filter (where v.estado = 'anulada'),
        'subtotal', coalesce(sum(v.subtotal) filter (where v.estado <> 'anulada'), 0),
        'descuentos', coalesce(sum(v.descuento) filter (where v.estado <> 'anulada'), 0),
        'base', coalesce(sum(v.subtotal - v.descuento) filter (where v.estado <> 'anulada'), 0),
        'iva', coalesce(sum(v.impuesto) filter (where v.estado <> 'anulada'), 0),
        'total', coalesce(sum(v.total) filter (where v.estado <> 'anulada'), 0),
        'cobrado', (select coalesce(sum(monto), 0) from pagos_venta
                     where id_empresa = _id_empresa and estado = 'aprobado'
                       and coalesce(confirmado_en, created_at) >= _ini and coalesce(confirmado_en, created_at) < _fin),
        'compras', (select coalesce(sum(total), 0) from ordenes_compra
                     where id_empresa = _id_empresa and estado = 'recibida' and recibida_en >= _ini and recibida_en < _fin))
      from ventas v where v.id_empresa = _id_empresa and v.fecha >= _ini and v.fecha < _fin)
  );
end $$;
grant execute on function public.stockly_informe_contable(bigint, date, date) to authenticated;
