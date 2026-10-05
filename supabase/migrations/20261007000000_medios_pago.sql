-- =====================================================================
-- Stockly v3.3: Bre-B y cobro con QR dinámico de Nequi Negocios.
--
--  * Nuevo medio de pago "bre_b" (reemplaza a "Transferencia" en la caja): el
--    cliente paga desde cualquier banco o billetera a la llave Bre-B del negocio.
--    Las ventas antiguas con "transferencia" se conservan.
--  * Nuevo medio de pago "nequi_qr": la venta queda pendiente hasta que Nequi
--    confirma el pago (estado 35). La confirmación viene de Nequi, no de un
--    pantallazo.
--  * Credenciales de Nequi Conecta en credenciales_pago (la app no las lee).
--  * La Edge Function "nequi-qr" genera el QR y consulta el estado. Mientras no
--    se configure, Nequi QR queda desactivado y no afecta nada.
-- Requiere 20261006000000_pagos.sql.
-- =====================================================================

-- Medios de pago con "bre_b" y "nequi_qr".
do $$
declare _c record;
begin
  for _c in
    select conname, conrelid::regclass::text as tabla from pg_constraint
     where conrelid in ('public.ventas'::regclass, 'public.pagos_venta'::regclass) and contype = 'c'
       and (pg_get_constraintdef(oid) ilike '%metodo_pago%' or pg_get_constraintdef(oid) ilike '%(metodo %')
  loop
    execute format('alter table %s drop constraint %I', _c.tabla, _c.conname);
  end loop;
end $$;
alter table public.ventas add constraint ventas_metodo_pago_check check (metodo_pago in
  ('efectivo', 'tarjeta', 'datafono', 'transferencia', 'nequi', 'daviplata', 'link_pago', 'credito', 'mixto', 'nequi_qr', 'bre_b'));
alter table public.pagos_venta add constraint pagos_venta_metodo_check check (metodo in
  ('efectivo', 'tarjeta', 'datafono', 'transferencia', 'nequi', 'daviplata', 'link_pago', 'credito', 'nequi_qr', 'bre_b'));

-- Llave Bre-B del negocio (se muestra en la caja, la factura y el mensaje de WhatsApp).
alter table public.config_facturacion add column if not exists breb_llave text;
alter table public.config_facturacion add column if not exists breb_tipo_llave text;

-- Datos del QR en el pago.
alter table public.pagos_venta add column if not exists qr_codigo text;      -- transactionId que devuelve Nequi
alter table public.pagos_venta add column if not exists qr_valor text;       -- texto que va dentro del QR (qrValue)
alter table public.pagos_venta add column if not exists qr_expira timestamptz;
create unique index if not exists pagos_venta_qr on public.pagos_venta (qr_codigo) where qr_codigo is not null;

-- Activación (visible) y credenciales (privadas).
alter table public.config_facturacion add column if not exists nequi_activo boolean not null default false;
alter table public.credenciales_pago add column if not exists nequi_client_id text;
alter table public.credenciales_pago add column if not exists nequi_client_secret text;
alter table public.credenciales_pago add column if not exists nequi_api_key text;
-- Tipo y número de identificación del comercio (o de la caja) que Nequi asigna al habilitar la integración.
alter table public.credenciales_pago add column if not exists nequi_codigo_comercio text;
alter table public.credenciales_pago add column if not exists nequi_ambiente text not null default 'pruebas'
  check (nequi_ambiente in ('pruebas', 'produccion'));

drop function if exists public.guardar_credenciales_nequi(bigint, text, text, text, text);
create or replace function public.guardar_credenciales_nequi(
  _id_empresa bigint, _client_id text, _client_secret text, _api_key text, _ambiente text, _codigo_comercio text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede configurar Nequi';
  end if;
  if _ambiente not in ('pruebas', 'produccion') then raise exception 'Ambiente no válido'; end if;
  insert into credenciales_pago (id_empresa, nequi_client_id, nequi_client_secret, nequi_api_key, nequi_ambiente, nequi_codigo_comercio)
  values (_id_empresa, nullif(btrim(_client_id), ''), nullif(btrim(_client_secret), ''), nullif(btrim(_api_key), ''), _ambiente,
          nullif(btrim(_codigo_comercio), ''))
  on conflict (id_empresa) do update set
    nequi_codigo_comercio = coalesce(excluded.nequi_codigo_comercio, credenciales_pago.nequi_codigo_comercio),
    nequi_client_id = coalesce(excluded.nequi_client_id, credenciales_pago.nequi_client_id),
    nequi_client_secret = coalesce(excluded.nequi_client_secret, credenciales_pago.nequi_client_secret),
    nequi_api_key = coalesce(excluded.nequi_api_key, credenciales_pago.nequi_api_key),
    nequi_ambiente = excluded.nequi_ambiente,
    updated_at = now();
end $$;

create or replace function public.estado_credenciales_nequi(_id_empresa bigint)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case when public.stockly_es_miembro(_id_empresa) then jsonb_build_object(
    'configurado', coalesce((select nequi_client_id is not null and nequi_client_secret is not null and nequi_api_key is not null
                                    and nequi_codigo_comercio is not null
                               from credenciales_pago where id_empresa = _id_empresa), false),
    'codigo_comercio', (select nequi_codigo_comercio from credenciales_pago where id_empresa = _id_empresa),
    'ambiente', coalesce((select nequi_ambiente from credenciales_pago where id_empresa = _id_empresa), 'pruebas'))
  end
$$;

-- registrar_venta acepta "bre_b" y "nequi_qr" (este último queda pendiente como el link de pago).
create or replace function public.registrar_venta(_venta jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _empresa bigint := (_venta->>'id_empresa')::bigint;
  _bodega bigint := (_venta->>'id_bodega')::bigint;
  _usuario bigint := public.stockly_id_usuario();
  _plan public.stockly_planes;
  _cfg public.config_facturacion;
  _item jsonb;
  _pago jsonb;
  _producto record;
  _cantidad numeric;
  _precio numeric;
  _desc numeric;
  _iva numeric;
  _base numeric;
  _subtotal numeric := 0;
  _descuento numeric := 0;
  _impuesto numeric := 0;
  _total numeric;
  _id_venta bigint;
  _numero int;
  _ventas_mes int;
  _pagos jsonb;
  _suma numeric := 0;
  _metodo text;
  _monto numeric;
  _recibido numeric;
  _cambio numeric := 0;
  _pendiente boolean := false;
  _metodos text[] := '{}';
begin
  if not public.stockly_es_miembro(_empresa) then raise exception 'Sin acceso a esta empresa'; end if;
  if not exists (select 1 from public.bodegas where id = _bodega and id_empresa = _empresa and activa) then
    raise exception 'Bodega no válida';
  end if;
  if jsonb_array_length(coalesce(_venta->'items', '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  _plan := public.stockly_plan(_empresa);
  if _plan.limite_ventas_mes is not null then
    _ventas_mes := (public.stockly_uso_plan(_empresa)->>'ventas_mes')::int;
    if _ventas_mes >= _plan.limite_ventas_mes then
      raise exception 'Llegaste al límite de % ventas del mes de tu plan %. Mejora tu plan para seguir vendiendo.',
        _plan.limite_ventas_mes, _plan.nombre;
    end if;
  end if;

  -- Consecutivo: bloquea la fila para que dos cajas no tomen el mismo número.
  select * into _cfg from public.config_facturacion where id_empresa = _empresa for update;
  if not found then
    perform public.stockly_inicializar_empresa(_empresa);
    select * into _cfg from public.config_facturacion where id_empresa = _empresa for update;
  end if;
  _numero := _cfg.consecutivo + 1;
  if _cfg.rango_hasta is not null and _numero > _cfg.rango_hasta then
    raise exception 'Se agotó el rango de numeración autorizado (%-%)', _cfg.rango_desde, _cfg.rango_hasta;
  end if;
  update public.config_facturacion set consecutivo = _numero, updated_at = now() where id_empresa = _empresa;

  insert into public.ventas (id_empresa, id_bodega, id_cliente, id_usuario, prefijo, numero, canal, metodo_pago, estado, nota)
  values (_empresa, _bodega, nullif(_venta->>'id_cliente', '')::bigint, _usuario, _cfg.prefijo, _numero,
          coalesce(_venta->>'canal', 'mostrador'), 'efectivo', 'pagada', _venta->>'nota')
  returning id into _id_venta;

  for _item in select * from jsonb_array_elements(_venta->'items') loop
    select id, descripcion into _producto from public.productos
     where id = (_item->>'id_producto')::bigint and id_empresa = _empresa;
    if not found then raise exception 'Producto no válido'; end if;

    _cantidad := (_item->>'cantidad')::numeric;
    _precio := (_item->>'precio_unitario')::numeric;
    _desc := coalesce((_item->>'descuento')::numeric, 0);
    _iva := coalesce((_item->>'iva')::numeric, 0);
    if _cantidad is null or _cantidad <= 0 then raise exception 'Cantidad no válida para %', _producto.descripcion; end if;
    if _precio is null or _precio < 0 or _desc < 0 or _iva < 0 then
      raise exception 'Precio o descuento no válido para %', _producto.descripcion;
    end if;
    if public.stockly_disponible(_bodega, _producto.id) < _cantidad then
      raise exception 'Stock insuficiente de % en esta bodega (disponible: %)',
        _producto.descripcion, trim_scale(public.stockly_disponible(_bodega, _producto.id));
    end if;

    _base := round(_cantidad * _precio - _desc, 2);
    if _base < 0 then raise exception 'El descuento de % supera el valor del producto', _producto.descripcion; end if;
    _subtotal := _subtotal + _cantidad * _precio;
    _descuento := _descuento + _desc;
    _impuesto := _impuesto + round(_base * _iva / 100, 2);

    insert into public.detalle_venta (id_venta, id_producto, descripcion, cantidad, precio_unitario, descuento, iva, total)
    values (_id_venta, _producto.id, _producto.descripcion, _cantidad, _precio, _desc, _iva,
            _base + round(_base * _iva / 100, 2));

    insert into public.kardex (fecha, tipo, id_usuario, cantidad, detalle, id_empresa, id_producto, id_bodega)
    values (now(), 'Salida', _usuario, _cantidad, 'Venta ' || _cfg.prefijo || '-' || _numero, _empresa, _producto.id, _bodega);
  end loop;

  _total := round(_subtotal - _descuento + _impuesto, 2);

  -- Pagos: si no vienen, uno solo por el total con el método indicado.
  _pagos := coalesce(nullif(_venta->'pagos', '[]'::jsonb),
                     jsonb_build_array(jsonb_build_object('metodo', coalesce(_venta->>'metodo_pago', 'efectivo'), 'monto', _total)));
  for _pago in select * from jsonb_array_elements(_pagos) loop
    _metodo := _pago->>'metodo';
    _monto := round((_pago->>'monto')::numeric, 2);
    _recibido := nullif(_pago->>'recibido', '')::numeric;
    if _metodo not in ('efectivo', 'tarjeta', 'datafono', 'transferencia', 'nequi', 'daviplata', 'link_pago', 'credito', 'nequi_qr', 'bre_b') then
      raise exception 'Medio de pago no válido: %', _metodo;
    end if;
    if _monto is null or _monto <= 0 then raise exception 'El valor de cada pago debe ser mayor que cero'; end if;
    if _metodo = 'efectivo' and _recibido is not null then
      if _recibido < _monto then raise exception 'El efectivo recibido es menor que el valor a pagar en efectivo'; end if;
      _cambio := _cambio + (_recibido - _monto);
    end if;
    if _metodo = 'datafono' and nullif(btrim(_pago->>'referencia'), '') is null then
      raise exception 'Escribe el número de aprobación del datáfono';
    end if;
    _pendiente := _pendiente or _metodo in ('link_pago', 'credito', 'nequi_qr');
    _metodos := array_append(_metodos, _metodo);
    _suma := _suma + _monto;

    insert into public.pagos_venta (id_venta, id_empresa, metodo, monto, recibido, cambio, referencia, franquicia, banco, estado,
                                    id_usuario, confirmado_en)
    values (_id_venta, _empresa, _metodo, _monto, _recibido,
            case when _metodo = 'efectivo' and _recibido is not null then _recibido - _monto end,
            nullif(btrim(_pago->>'referencia'), ''), nullif(btrim(_pago->>'franquicia'), ''), nullif(btrim(_pago->>'banco'), ''),
            case when _metodo in ('link_pago', 'credito', 'nequi_qr') then 'pendiente' else 'aprobado' end,
            _usuario, case when _metodo in ('link_pago', 'credito', 'nequi_qr') then null else now() end);
  end loop;
  if abs(_suma - _total) > 1 then
    raise exception 'Los pagos (%) no suman el total de la venta (%)', trim_scale(_suma), trim_scale(_total);
  end if;

  update public.ventas
     set subtotal = round(_subtotal, 2), descuento = round(_descuento, 2), impuesto = round(_impuesto, 2), total = _total,
         metodo_pago = case when array_length(_metodos, 1) = 1 then _metodos[1] else 'mixto' end,
         estado = case when _pendiente then 'pendiente' else 'pagada' end
   where id = _id_venta;

  insert into public.facturas (id_venta, id_empresa, prefijo, numero, tipo, estado_dian)
  values (_id_venta, _empresa, _cfg.prefijo, _numero,
          case when _cfg.electronica_activa then 'electronica' else 'interna' end,
          case when _cfg.electronica_activa then 'pendiente' else 'no_aplica' end);

  insert into public.notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_empresa, 'venta', 'Nueva venta ' || _cfg.prefijo || '-' || _numero,
          jsonb_array_length(_venta->'items') || ' producto(s) · ' || coalesce(_venta->>'canal', 'mostrador'),
          '/ventas/facturas');

  return jsonb_build_object('id', _id_venta, 'prefijo', _cfg.prefijo, 'numero', _numero, 'total', _total,
                            'cambio', _cambio, 'pendiente', _pendiente,
                            'link_pago', 'link_pago' = any(_metodos), 'nequi_qr', 'nequi_qr' = any(_metodos));
end $$;

-- Abono a una venta pendiente: acepta Bre-B.
create or replace function public.registrar_pago(_id_venta bigint, _pago jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _v public.ventas;
  _metodo text := _pago->>'metodo';
  _monto numeric := round((_pago->>'monto')::numeric, 2);
  _pagado numeric;
begin
  select * into _v from ventas where id = _id_venta for update;
  if not found or not public.stockly_es_miembro(_v.id_empresa) then raise exception 'Venta no encontrada'; end if;
  if _v.estado = 'anulada' then raise exception 'La venta está anulada'; end if;
  if _metodo not in ('efectivo', 'datafono', 'bre_b', 'transferencia', 'nequi', 'daviplata') then
    raise exception 'Medio de pago no válido para un abono';
  end if;
  if _monto is null or _monto <= 0 then raise exception 'El valor debe ser mayor que cero'; end if;
  if _metodo = 'datafono' and nullif(btrim(_pago->>'referencia'), '') is null then
    raise exception 'Escribe el número de aprobación del datáfono';
  end if;

  select coalesce(sum(monto), 0) into _pagado from pagos_venta where id_venta = _id_venta and estado = 'aprobado';
  if _pagado + _monto > _v.total + 1 then
    raise exception 'El abono supera el saldo pendiente (%)', trim_scale(_v.total - _pagado);
  end if;

  insert into pagos_venta (id_venta, id_empresa, metodo, monto, referencia, franquicia, banco, estado, id_usuario, confirmado_en)
  values (_id_venta, _v.id_empresa, _metodo, _monto, nullif(btrim(_pago->>'referencia'), ''),
          nullif(btrim(_pago->>'franquicia'), ''), nullif(btrim(_pago->>'banco'), ''), 'aprobado', public.stockly_id_usuario(), now());

  _pagado := _pagado + _monto;
  if _pagado >= _v.total - 1 then
    update ventas set estado = 'pagada' where id = _id_venta;
    -- Lo que quedaba pendiente (crédito, link o QR sin pagar) ya se cubrió.
    update pagos_venta set estado = 'anulado' where id_venta = _id_venta and estado = 'pendiente';
  end if;
  return jsonb_build_object('pagado', _pagado, 'saldo', greatest(_v.total - _pagado, 0), 'estado',
                            case when _pagado >= _v.total - 1 then 'pagada' else 'pendiente' end);
end $$;

-- Nequi confirma el pago del QR. Solo la llama la Edge Function con la llave de servicio.
create or replace function public.stockly_confirmar_pago_nequi(_id_pago bigint, _transaccion text, _valor numeric)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _p public.pagos_venta;
  _v public.ventas;
  _pagado numeric;
begin
  select * into _p from pagos_venta where id = _id_pago and metodo = 'nequi_qr' for update;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'pago desconocido'); end if;
  if _p.estado = 'aprobado' then return jsonb_build_object('ok', true, 'repetido', true); end if;
  if _valor is not null and abs(_valor - _p.monto) > 1 then
    return jsonb_build_object('ok', false, 'motivo', 'valor distinto');
  end if;
  select * into _v from ventas where id = _p.id_venta;

  update pagos_venta set estado = 'aprobado', referencia = _transaccion, confirmado_en = now() where id = _p.id;
  select coalesce(sum(monto), 0) into _pagado from pagos_venta where id_venta = _p.id_venta and estado = 'aprobado';
  if _pagado >= _v.total - 1 and _v.estado = 'pendiente' then
    update ventas set estado = 'pagada' where id = _p.id_venta;
  end if;
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_p.id_empresa, 'venta', 'Pago Nequi recibido ' || _v.prefijo || '-' || _v.numero,
          'Confirmado por Nequi · ' || trim_scale(_p.monto) || ' · transacción ' || coalesce(_transaccion, ''), '/ventas/facturas');
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.stockly_confirmar_pago_nequi(bigint, text, numeric) from public, anon, authenticated;

grant execute on function public.guardar_credenciales_nequi(bigint, text, text, text, text, text),
  public.estado_credenciales_nequi(bigint), public.registrar_venta(jsonb), public.registrar_pago(bigint, jsonb) to authenticated;
