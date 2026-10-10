-- =====================================================================
-- Stockly v3.4: importación masiva desde Excel.
--
-- stockly_importar(_id_empresa, _datos) recibe lo que la app leyó del archivo
-- y lo organiza en la empresa: datos de la empresa y facturación, categorías,
-- marcas, sucursales, bodegas, productos, inventario por bodega, clientes y
-- proveedores. Crea lo nuevo y actualiza lo que ya existe (nunca borra).
--
--  * Productos: se reconocen por código interno, luego código de barras y
--    luego nombre. Una celda vacía no borra el dato que ya había.
--  * Stock: es la cantidad que debe quedar. La diferencia se registra en el
--    kardex como "Inventario inicial (importación)" o "Ajuste por importación",
--    así queda en la auditoría y en los reportes.
--  * Respeta los límites del plan (productos, bodegas, sucursales).
--  * Todo o nada: si una fila falla, no se aplica nada de esa llamada. La app
--    envía los archivos grandes por partes.
-- Solo dueño o administradores. Requiere 20261007000000_medios_pago.sql.
-- =====================================================================

create or replace function public.stockly_norm(_t text)
returns text
language sql immutable
as $$
  select nullif(lower(btrim(regexp_replace(translate(coalesce(_t, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '\s+', ' ', 'g'))), '')
$$;

create or replace function public.stockly_importar(_id_empresa bigint, _datos jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _unidad text;
  _usuario bigint := public.stockly_id_usuario();
  _plan public.stockly_planes;
  _res jsonb := '{}'::jsonb;
  _f jsonb;
  _e jsonb;
  _id bigint;
  _creados int;
  _actualizados int;
  _nombre text;
  _texto text;
  _tipo text;
  _cb text;
  _ci text;
  -- Tipos reales de las columnas de códigos (según la versión de la base pueden ser texto o número).
  _tipo_cb text := (select format_type(atttypid, atttypmod) from pg_attribute
                     where attrelid = 'public.productos'::regclass and attname = 'codigobarras');
  _tipo_ci text := (select format_type(atttypid, atttypmod) from pg_attribute
                     where attrelid = 'public.productos'::regclass and attname = 'codigointerno');
  _cat bigint;
  _marca bigint;
  _sucursal bigint;
  _bodega bigint;
  _principal bigint;
  _actual numeric;
  _meta numeric;
  _diff numeric;
  _movs int := 0;
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede importar datos';
  end if;
  perform public.stockly_inicializar_empresa(_id_empresa);
  _plan := public.stockly_plan(_id_empresa);
  _principal := public.stockly_bodega_principal(_id_empresa);

  -- ----------------------------------------------------------- Empresa
  _e := _datos->'empresa';
  if jsonb_typeof(_e) = 'object' then
    update "Empresa"
       set nombre = coalesce(nullif(btrim(_e->>'nombre'), ''), nombre),
           simbolomoneda = coalesce(nullif(btrim(_e->>'moneda'), ''), simbolomoneda),
           nit = coalesce(nullif(btrim(_e->>'nit'), ''), nit),
           sector = coalesce(nullif(btrim(_e->>'sector'), ''), sector),
           ciudad = coalesce(nullif(btrim(_e->>'ciudad'), ''), ciudad),
           telefono = coalesce(nullif(btrim(_e->>'telefono'), ''), telefono)
     where id = _id_empresa;
    update config_facturacion
       set razon_social = coalesce(nullif(btrim(_e->>'razon_social'), ''), razon_social),
           nit = coalesce(nullif(btrim(_e->>'nit'), ''), nit),
           regimen = coalesce(nullif(btrim(_e->>'regimen'), ''), regimen),
           direccion = coalesce(nullif(btrim(_e->>'direccion'), ''), direccion),
           telefono = coalesce(nullif(btrim(_e->>'telefono'), ''), telefono),
           email = coalesce(nullif(btrim(_e->>'email'), ''), email),
           prefijo = coalesce(upper(nullif(btrim(_e->>'prefijo'), '')), prefijo),
           iva_defecto = coalesce(nullif(_e->>'iva', '')::numeric, iva_defecto),
           nota_pie = coalesce(nullif(btrim(_e->>'nota_pie'), ''), nota_pie),
           breb_llave = coalesce(nullif(btrim(_e->>'breb_llave'), ''), breb_llave),
           breb_tipo_llave = coalesce(nullif(btrim(_e->>'breb_tipo_llave'), ''), breb_tipo_llave),
           updated_at = now()
     where id_empresa = _id_empresa;
    _res := _res || jsonb_build_object('empresa', jsonb_build_object('actualizados', 1));
  end if;

  -- ----------------------------------------------------------- Categorías
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'categorias', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    select id into _id from categorias where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_nombre) limit 1;
    if _id is null then
      execute format('select public.insertarcategorias(_descripcion := %L, _idempresa := %L, _color := %L)',
                     _nombre, _id_empresa, coalesce(nullif(btrim(_f->>'color'), ''), '#3B82F6'));
      _creados := _creados + 1;
    elsif nullif(btrim(_f->>'color'), '') is not null then
      update categorias set color = btrim(_f->>'color') where id = _id;
      _actualizados := _actualizados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'categorias', '[]')) > 0 then
    _res := _res || jsonb_build_object('categorias', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Marcas
  _creados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'marcas', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    if not exists (select 1 from marca where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_nombre)) then
      execute format('select public.insertarmarca(_descripcion := %L, _idempresa := %L)', _nombre, _id_empresa);
      _creados := _creados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'marcas', '[]')) > 0 then
    _res := _res || jsonb_build_object('marcas', jsonb_build_object('creados', _creados, 'actualizados', 0));
  end if;

  -- ----------------------------------------------------------- Sucursales
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'sucursales', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    select id into _id from sucursales where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_nombre);
    if _id is null then
      insert into sucursales (id_empresa, nombre, ciudad, direccion, telefono, responsable)
      values (_id_empresa, _nombre, nullif(btrim(_f->>'ciudad'), ''), nullif(btrim(_f->>'direccion'), ''),
              nullif(btrim(_f->>'telefono'), ''), nullif(btrim(_f->>'responsable'), ''));
      _creados := _creados + 1;
    else
      update sucursales
         set ciudad = coalesce(nullif(btrim(_f->>'ciudad'), ''), ciudad),
             direccion = coalesce(nullif(btrim(_f->>'direccion'), ''), direccion),
             telefono = coalesce(nullif(btrim(_f->>'telefono'), ''), telefono),
             responsable = coalesce(nullif(btrim(_f->>'responsable'), ''), responsable)
       where id = _id;
      _actualizados := _actualizados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'sucursales', '[]')) > 0 then
    _res := _res || jsonb_build_object('sucursales', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Bodegas
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'bodegas', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    _tipo := coalesce(nullif(_f->>'tipo', ''), 'satelite');
    if _tipo not in ('principal', 'punto_venta', 'ecommerce', 'satelite') then
      raise exception 'Bodega "%": tipo "%" no válido', _nombre, _tipo;
    end if;
    _sucursal := null;
    if nullif(btrim(_f->>'sucursal'), '') is not null then
      select id into _sucursal from sucursales
       where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_f->>'sucursal');
      if _sucursal is null then
        raise exception 'Bodega "%": la sucursal "%" no existe. Agrégala en la hoja Sucursales.', _nombre, _f->>'sucursal';
      end if;
    end if;
    -- La bodega principal ya existe: la fila "principal" la renombra y completa.
    if _tipo = 'principal' then
      _id := _principal;
    else
      select id into _id from bodegas where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_nombre);
    end if;
    if _id is null then
      insert into bodegas (id_empresa, nombre, tipo, direccion, responsable, id_sucursal)
      values (_id_empresa, _nombre, _tipo, nullif(btrim(_f->>'direccion'), ''), nullif(btrim(_f->>'responsable'), ''), _sucursal);
      _creados := _creados + 1;
    else
      update bodegas
         set nombre = _nombre,
             tipo = case when tipo = 'principal' then tipo else _tipo end,
             direccion = coalesce(nullif(btrim(_f->>'direccion'), ''), direccion),
             responsable = coalesce(nullif(btrim(_f->>'responsable'), ''), responsable),
             id_sucursal = coalesce(_sucursal, id_sucursal)
       where id = _id;
      _actualizados := _actualizados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'bodegas', '[]')) > 0 then
    _res := _res || jsonb_build_object('bodegas', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Productos
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'productos', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    _ci := nullif(btrim(_f->>'codigo_interno'), '');
    _cb := nullif(regexp_replace(coalesce(_f->>'codigo_barras', ''), '\D', '', 'g'), '');
    _unidad := public.stockly_unidad_id(_f->>'unidad');
    if nullif(btrim(_f->>'unidad'), '') is not null and _unidad is null then
      raise exception 'Producto "%": la unidad "%" no existe. Usa una de las unidades de Stockly (und, par, caja, g, kg, ml, l, m...).', _nombre, _f->>'unidad';
    end if;

    _cat := null;
    if nullif(btrim(_f->>'categoria'), '') is not null then
      select id into _cat from categorias where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_f->>'categoria') limit 1;
      if _cat is null then
        execute format('select public.insertarcategorias(_descripcion := %L, _idempresa := %L, _color := %L)',
                       btrim(_f->>'categoria'), _id_empresa, '#3B82F6');
        select id into _cat from categorias where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_f->>'categoria') limit 1;
      end if;
    end if;
    _marca := null;
    if nullif(btrim(_f->>'marca'), '') is not null then
      select id into _marca from marca where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_f->>'marca') limit 1;
      if _marca is null then
        execute format('select public.insertarmarca(_descripcion := %L, _idempresa := %L)', btrim(_f->>'marca'), _id_empresa);
        select id into _marca from marca where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_f->>'marca') limit 1;
      end if;
    end if;

    _id := null;
    if _ci is not null then
      select id into _id from productos where id_empresa = _id_empresa and stockly_norm(codigointerno::text) = stockly_norm(_ci) limit 1;
    end if;
    if _id is null and _cb is not null then
      select id into _id from productos where id_empresa = _id_empresa and codigobarras::text = _cb limit 1;
    end if;
    if _id is null then
      select id into _id from productos where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_nombre) limit 1;
    end if;

    if _id is null then
      if _plan.limite_productos is not null
         and (select count(*) from productos where id_empresa = _id_empresa) >= _plan.limite_productos then
        raise exception 'Tu plan % permite % productos. Mejora tu plan para importar más.', _plan.nombre, _plan.limite_productos;
      end if;
      execute format(
        'select public.insertarproductos(_descripcion := %L, _idmarca := %L, _stock := 0, _stock_minimo := %L,
           _codigobarras := %L, _codigointerno := %L, _precioventa := %L, _preciocompra := %L,
           _id_categoria := %L, _id_empresa := %L, _unidad := %L)',
        _nombre, _marca, coalesce(nullif(_f->>'stock_minimo', '')::numeric, 0), _cb, _ci,
        coalesce(nullif(_f->>'precio_venta', '')::numeric, 0), coalesce(nullif(_f->>'precio_compra', '')::numeric, 0),
        _cat, _id_empresa, _unidad);
      select id into _id from productos where id_empresa = _id_empresa and stockly_norm(descripcion) = stockly_norm(_nombre)
       order by id desc limit 1;
      _creados := _creados + 1;
    else
      execute format('update productos set codigointerno = coalesce(%L::%s, codigointerno), codigobarras = coalesce(%L::%s, codigobarras) where id = %s',
                     _ci, _tipo_ci, _cb, _tipo_cb, _id);
      update productos
         set descripcion = _nombre,
             id_categoria = coalesce(_cat, id_categoria),
             idmarca = coalesce(_marca, idmarca),
             precioventa = coalesce(nullif(_f->>'precio_venta', '')::numeric, precioventa),
             preciocompra = coalesce(nullif(_f->>'precio_compra', '')::numeric, preciocompra),
             stock_minimo = coalesce(nullif(_f->>'stock_minimo', '')::numeric, stock_minimo),
             unidad = coalesce(_unidad, unidad)
       where id = _id;
      _actualizados := _actualizados + 1;
    end if;

    -- Stock en la bodega principal: deja la cantidad indicada.
    _meta := nullif(_f->>'stock', '')::numeric;
    if _meta is not null then
      if _meta < 0 then raise exception 'Producto "%": el stock no puede ser negativo', _nombre; end if;
      _actual := public.stockly_disponible(_principal, _id);
      _diff := _meta - _actual;
      if _diff <> 0 then
        insert into kardex (fecha, tipo, id_usuario, cantidad, detalle, id_empresa, id_producto, id_bodega)
        values (now(), case when _diff > 0 then 'Entrada' else 'Salida' end, _usuario, abs(_diff),
                case when _actual = 0 then 'Inventario inicial (importación)' else 'Ajuste por importación' end,
                _id_empresa, _id, _principal);
        _movs := _movs + 1;
      end if;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'productos', '[]')) > 0 then
    _res := _res || jsonb_build_object('productos', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Inventario por bodega
  _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'inventario', '[]')) loop
    _texto := nullif(btrim(_f->>'producto'), '');
    continue when _texto is null;
    _id := null;
    select id into _id from productos
     where id_empresa = _id_empresa
       and (stockly_norm(codigointerno::text) = stockly_norm(_texto)
            or codigobarras::text = nullif(regexp_replace(_texto, '\D', '', 'g'), '')
            or stockly_norm(descripcion) = stockly_norm(_texto))
     order by (stockly_norm(codigointerno::text) = stockly_norm(_texto)) desc nulls last limit 1;
    if _id is null then raise exception 'Inventario: el producto "%" no existe', _texto; end if;
    _bodega := null;
    select id into _bodega from bodegas
     where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_f->>'bodega');
    if _bodega is null then raise exception 'Inventario: la bodega "%" no existe', coalesce(_f->>'bodega', ''); end if;
    _meta := nullif(_f->>'cantidad', '')::numeric;
    continue when _meta is null;
    if _meta < 0 then raise exception 'Inventario de "%": la cantidad no puede ser negativa', _texto; end if;

    _actual := public.stockly_disponible(_bodega, _id);
    _diff := _meta - _actual;
    if _diff <> 0 then
      insert into kardex (fecha, tipo, id_usuario, cantidad, detalle, id_empresa, id_producto, id_bodega)
      values (now(), case when _diff > 0 then 'Entrada' else 'Salida' end, _usuario, abs(_diff),
              case when _actual = 0 then 'Inventario inicial (importación)' else 'Ajuste por importación' end,
              _id_empresa, _id, _bodega);
      _movs := _movs + 1;
    end if;
    _actualizados := _actualizados + 1;
  end loop;
  if jsonb_array_length(coalesce(_datos->'inventario', '[]')) > 0 then
    _res := _res || jsonb_build_object('inventario', jsonb_build_object('creados', 0, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Clientes
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'clientes', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    _tipo := coalesce(upper(nullif(btrim(_f->>'tipo_documento'), '')), 'CC');
    if _tipo not in ('CC', 'NIT', 'CE', 'PAS', 'TI') then
      raise exception 'Cliente "%": tipo de documento "%" no válido (CC, NIT, CE, PAS o TI)', _nombre, _tipo;
    end if;
    _texto := nullif(btrim(_f->>'documento'), '');
    _id := null;
    if _texto is not null then
      select id into _id from clientes where id_empresa = _id_empresa and tipo_documento = _tipo and documento = _texto;
    else
      select id into _id from clientes where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_nombre) limit 1;
    end if;
    if _id is null then
      insert into clientes (id_empresa, nombre, tipo_documento, documento, email, telefono, direccion)
      values (_id_empresa, _nombre, _tipo, _texto, nullif(btrim(_f->>'email'), ''), nullif(btrim(_f->>'telefono'), ''),
              nullif(btrim(_f->>'direccion'), ''));
      _creados := _creados + 1;
    else
      update clientes
         set nombre = _nombre,
             email = coalesce(nullif(btrim(_f->>'email'), ''), email),
             telefono = coalesce(nullif(btrim(_f->>'telefono'), ''), telefono),
             direccion = coalesce(nullif(btrim(_f->>'direccion'), ''), direccion)
       where id = _id;
      _actualizados := _actualizados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'clientes', '[]')) > 0 then
    _res := _res || jsonb_build_object('clientes', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  -- ----------------------------------------------------------- Proveedores
  _creados := 0; _actualizados := 0;
  for _f in select * from jsonb_array_elements(coalesce(_datos->'proveedores', '[]')) loop
    _nombre := nullif(btrim(_f->>'nombre'), '');
    continue when _nombre is null;
    select id into _id from proveedores where id_empresa = _id_empresa and stockly_norm(nombre) = stockly_norm(_nombre);
    if _id is null then
      insert into proveedores (id_empresa, nombre, nit, contacto, email, telefono, direccion)
      values (_id_empresa, _nombre, nullif(btrim(_f->>'nit'), ''), nullif(btrim(_f->>'contacto'), ''),
              nullif(btrim(_f->>'email'), ''), nullif(btrim(_f->>'telefono'), ''), nullif(btrim(_f->>'direccion'), ''));
      _creados := _creados + 1;
    else
      update proveedores
         set nit = coalesce(nullif(btrim(_f->>'nit'), ''), nit),
             contacto = coalesce(nullif(btrim(_f->>'contacto'), ''), contacto),
             email = coalesce(nullif(btrim(_f->>'email'), ''), email),
             telefono = coalesce(nullif(btrim(_f->>'telefono'), ''), telefono),
             direccion = coalesce(nullif(btrim(_f->>'direccion'), ''), direccion)
       where id = _id;
      _actualizados := _actualizados + 1;
    end if;
  end loop;
  if jsonb_array_length(coalesce(_datos->'proveedores', '[]')) > 0 then
    _res := _res || jsonb_build_object('proveedores', jsonb_build_object('creados', _creados, 'actualizados', _actualizados));
  end if;

  return _res || jsonb_build_object('movimientos_kardex', _movs);
end $$;

grant execute on function public.stockly_importar(bigint, jsonb) to authenticated;
revoke execute on function public.stockly_importar(bigint, jsonb) from anon;

-- Aviso en la campana cuando termina una importación (la app la llama al final).
create or replace function public.stockly_importacion_terminada(_id_empresa bigint, _resumen text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.stockly_es_admin(_id_empresa) then raise exception 'Sin permiso'; end if;
  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace)
  values (_id_empresa, 'sistema', 'Importación completada', left(_resumen, 300), '/configurar/productos');
end $$;
grant execute on function public.stockly_importacion_terminada(bigint, text) to authenticated;

-- Exportación: todo lo que se puede importar, en el mismo formato, más el historial de ventas.
create or replace function public.stockly_exportar(_id_empresa bigint)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  _principal bigint := public.stockly_bodega_principal(_id_empresa);
begin
  if not public.stockly_es_admin(_id_empresa) then
    raise exception 'Solo el dueño o un administrador puede exportar los datos';
  end if;
  return jsonb_build_object(
    'empresa', (select jsonb_build_object(
        'nombre', e.nombre, 'nit', coalesce(e.nit, c.nit), 'sector', e.sector, 'ciudad', e.ciudad, 'telefono', coalesce(e.telefono, c.telefono),
        'moneda', e.simbolomoneda, 'razon_social', c.razon_social, 'direccion', c.direccion, 'email', c.email,
        'regimen', c.regimen, 'prefijo', c.prefijo, 'iva', c.iva_defecto, 'nota_pie', c.nota_pie,
        'breb_tipo_llave', c.breb_tipo_llave, 'breb_llave', c.breb_llave)
      from "Empresa" e left join config_facturacion c on c.id_empresa = e.id where e.id = _id_empresa),
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('nombre', descripcion, 'color', color) order by descripcion)
                              from categorias where id_empresa = _id_empresa), '[]'),
    'marcas', coalesce((select jsonb_agg(jsonb_build_object('nombre', descripcion) order by descripcion)
                          from marca where id_empresa = _id_empresa), '[]'),
    'sucursales', coalesce((select jsonb_agg(jsonb_build_object('nombre', nombre, 'ciudad', ciudad, 'direccion', direccion,
                                                                'telefono', telefono, 'responsable', responsable) order by id)
                              from sucursales where id_empresa = _id_empresa), '[]'),
    'bodegas', coalesce((select jsonb_agg(jsonb_build_object('nombre', b.nombre, 'tipo', b.tipo, 'sucursal', s.nombre,
                                                             'direccion', b.direccion, 'responsable', b.responsable) order by b.tipo <> 'principal', b.id)
                           from bodegas b left join sucursales s on s.id = b.id_sucursal where b.id_empresa = _id_empresa), '[]'),
    'productos', coalesce((select jsonb_agg(jsonb_build_object(
                             'nombre', p.descripcion, 'codigo_interno', p.codigointerno, 'codigo_barras', p.codigobarras::text, 'unidad', p.unidad,
                             'categoria', c.descripcion, 'marca', m.descripcion, 'precio_compra', p.preciocompra,
                             'precio_venta', p.precioventa, 'stock_minimo', p.stock_minimo,
                             'stock', public.stockly_disponible(_principal, p.id), 'stock_total', p.stock) order by p.descripcion)
                             from productos p
                             left join categorias c on c.id = p.id_categoria
                             left join marca m on m.id = p.idmarca
                            where p.id_empresa = _id_empresa), '[]'),
    'inventario', coalesce((select jsonb_agg(jsonb_build_object(
                              'producto', coalesce(nullif(p.codigointerno::text, ''), p.descripcion), 'bodega', b.nombre,
                              'cantidad', sb.cantidad) order by b.nombre, p.descripcion)
                              from stock_bodega sb
                              join bodegas b on b.id = sb.id_bodega and b.tipo <> 'principal'
                              join productos p on p.id = sb.id_producto
                             where b.id_empresa = _id_empresa and sb.cantidad > 0), '[]'),
    'clientes', coalesce((select jsonb_agg(jsonb_build_object('nombre', nombre, 'tipo_documento', tipo_documento,
                            'documento', documento, 'email', email, 'telefono', telefono, 'direccion', direccion) order by nombre)
                            from clientes where id_empresa = _id_empresa), '[]'),
    'proveedores', coalesce((select jsonb_agg(jsonb_build_object('nombre', nombre, 'nit', nit, 'contacto', contacto,
                               'email', email, 'telefono', telefono, 'direccion', direccion) order by nombre)
                               from proveedores where id_empresa = _id_empresa), '[]'),
    'ventas', coalesce((select jsonb_agg(x order by x->>'fecha' desc) from (
                          select jsonb_build_object('factura', v.prefijo || '-' || v.numero, 'fecha', v.fecha,
                                   'cliente', c.nombre, 'bodega', b.nombre, 'medio', v.metodo_pago, 'estado', v.estado,
                                   'subtotal', v.subtotal, 'descuento', v.descuento, 'impuesto', v.impuesto, 'total', v.total) x
                            from ventas v
                            left join clientes c on c.id = v.id_cliente
                            left join bodegas b on b.id = v.id_bodega
                           where v.id_empresa = _id_empresa
                           order by v.fecha desc limit 20000) t), '[]'));
end $$;
grant execute on function public.stockly_exportar(bigint) to authenticated;
revoke execute on function public.stockly_exportar(bigint) from anon;
