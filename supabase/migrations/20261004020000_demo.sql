-- =====================================================================
-- Stockly: datos de demostración.
--
-- stockly_cargar_demo() llena la empresa del usuario en sesión con un negocio de
-- ejemplo: categorías, marcas, productos, bodegas, traslados, clientes,
-- proveedores, ~45 ventas de los últimos 30 días y órdenes de compra.
-- Las ventas pasan por registrar_venta (stock, facturas y kardex reales).
-- Pasa la empresa al plan Pro (sin cobro) para poder tener varias bodegas.
-- Solo funciona si la empresa aún no tiene ventas. La app la llama desde
-- Configuración. Requiere las migraciones v2 y de registro.
-- =====================================================================

create or replace function public.stockly_cargar_demo()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  _usuario bigint := public.stockly_id_usuario();
  _empresa bigint;
  _principal bigint;
  _tienda bigint;
  _online bigint;
  _satelite bigint;
  _p record;
  _c record;
  _ids bigint[];
  _clientes bigint[];
  _proveedores bigint[];
  _bodegas bigint[];
  _dia int;
  _n int;
  _items jsonb;
  _prod bigint;
  _cant numeric;
  _bodega bigint;
  _venta jsonb;
  _ventas int := 0;
  _fecha timestamptz;
  _orden jsonb;
begin
  select id_empresa into _empresa from asignarempresa where id_usuario = _usuario limit 1;
  if _empresa is null then raise exception 'Tu usuario no tiene empresa'; end if;
  if not public.stockly_es_admin(_empresa) then raise exception 'Solo el dueño o un administrador puede cargar datos de demostración'; end if;
  if exists (select 1 from ventas where id_empresa = _empresa) then
    raise exception 'Tu empresa ya tiene ventas registradas: los datos de demostración solo se cargan en una empresa nueva';
  end if;

  perform setseed(0.42);
  perform public.stockly_inicializar_empresa(_empresa);
  _principal := public.stockly_bodega_principal(_empresa);

  -- Plan Pro para poder mostrar varias bodegas.
  update stockly_suscripciones set id_plan = 'pro', ciclo = 'mensual', renovacion = now() + interval '1 month'
   where id_empresa = _empresa and id_plan = 'basico';

  -- Categorías y marcas, con las funciones que ya usa la app.
  for _c in select * from (values
      ('Camisetas', '#8800B3'), ('Pantalones', '#6366F1'), ('Calzado', '#0EA5E9'),
      ('Accesorios', '#EC4899'), ('Hogar', '#F59E0B'), ('Tecnología', '#10B981')) as t(nombre, color)
  loop
    if not exists (select 1 from categorias where id_empresa = _empresa and descripcion = _c.nombre) then
      execute format('select public.insertarcategorias(_descripcion := %L, _idempresa := %L, _color := %L)',
                     _c.nombre, _empresa, _c.color);
    end if;
  end loop;
  for _c in select * from (values ('Urbano'), ('Andina'), ('Kairos'), ('Nómada'), ('Volt')) as t(nombre)
  loop
    if not exists (select 1 from marca where id_empresa = _empresa and descripcion = _c.nombre) then
      execute format('select public.insertarmarca(_descripcion := %L, _idempresa := %L)', _c.nombre, _empresa);
    end if;
  end loop;

  -- Productos: descripción, categoría, marca, stock inicial, mínimo, compra, venta, código.
  for _p in select * from (values
      ('Camiseta básica algodón', 'Camisetas', 'Urbano', 120, 20, 18000, 35000, '7701001000011'),
      ('Camiseta oversize estampada', 'Camisetas', 'Kairos', 60, 15, 26000, 55000, '7701001000028'),
      ('Polo piqué clásico', 'Camisetas', 'Andina', 45, 10, 32000, 65000, '7701001000035'),
      ('Jean slim azul', 'Pantalones', 'Andina', 50, 12, 55000, 119000, '7701001000042'),
      ('Jogger cargo', 'Pantalones', 'Urbano', 38, 10, 48000, 99000, '7701001000059'),
      ('Tenis urbanos blancos', 'Calzado', 'Nómada', 30, 10, 95000, 189000, '7701001000066'),
      ('Botas de cuero café', 'Calzado', 'Nómada', 18, 6, 140000, 279000, '7701001000073'),
      ('Gorra negra bordada', 'Accesorios', 'Urbano', 70, 15, 15000, 39000, '7701001000080'),
      ('Morral clásico', 'Accesorios', 'Nómada', 25, 8, 70000, 149000, '7701001000097'),
      ('Medias deportivas x3', 'Accesorios', 'Kairos', 90, 25, 9000, 24000, '7701001000103'),
      ('Taza cerámica Stockly', 'Hogar', 'Andina', 40, 10, 8000, 22000, '7701001000110'),
      ('Cojín decorativo', 'Hogar', 'Andina', 22, 8, 21000, 49000, '7701001000127'),
      ('Audífonos inalámbricos', 'Tecnología', 'Volt', 28, 8, 85000, 169000, '7701001000134'),
      ('Cargador rápido USB-C', 'Tecnología', 'Volt', 9, 12, 25000, 59000, '7701001000141')
    ) as t(nombre, categoria, marca, stock, minimo, compra, venta, codigo)
  loop
    if not exists (select 1 from productos where id_empresa = _empresa and descripcion = _p.nombre) then
      execute format(
        'select public.insertarproductos(_descripcion := %L, _idmarca := %L, _stock := %L, _stock_minimo := %L,
           _codigobarras := %L, _codigointerno := %L, _precioventa := %L, _preciocompra := %L,
           _id_categoria := %L, _id_empresa := %L)',
        _p.nombre,
        (select id from marca where id_empresa = _empresa and descripcion = _p.marca limit 1),
        _p.stock, _p.minimo, _p.codigo, 'DEMO-' || right(_p.codigo, 3), _p.venta, _p.compra,
        (select id from categorias where id_empresa = _empresa and descripcion = _p.categoria limit 1),
        _empresa);
    end if;
  end loop;
  select array_agg(id order by id) into _ids from productos where id_empresa = _empresa;

  -- Bodegas y traslados desde la principal.
  insert into bodegas (id_empresa, nombre, tipo, direccion, responsable) values
    (_empresa, 'Tienda Calarcá', 'punto_venta', 'Cra. 25 #40-12, Calarcá', 'Andrea Gómez'),
    (_empresa, 'Tienda online', 'ecommerce', null, 'Equipo digital'),
    (_empresa, 'Bodega Montenegro', 'satelite', 'Vía Montenegro km 2', 'Carlos Ruiz')
  on conflict (id_empresa, nombre) do nothing;
  select id into _tienda from bodegas where id_empresa = _empresa and nombre = 'Tienda Calarcá';
  select id into _online from bodegas where id_empresa = _empresa and nombre = 'Tienda online';
  select id into _satelite from bodegas where id_empresa = _empresa and nombre = 'Bodega Montenegro';

  foreach _prod in array _ids loop
    _cant := floor(public.stockly_disponible(_principal, _prod) * 0.25);
    if _cant > 0 then perform public.trasladar_stock(_prod, _principal, _tienda, _cant, 'Surtido inicial'); end if;
    _cant := floor(public.stockly_disponible(_principal, _prod) * 0.2);
    if _cant > 0 then perform public.trasladar_stock(_prod, _principal, _online, _cant, 'Surtido tienda online'); end if;
    _cant := floor(public.stockly_disponible(_principal, _prod) * 0.15);
    if _cant > 0 then perform public.trasladar_stock(_prod, _principal, _satelite, _cant, 'Respaldo'); end if;
  end loop;
  update traslados set fecha = now() - interval '31 days' where id_empresa = _empresa;
  _bodegas := array[_principal, _tienda, _tienda, _online, _online, _satelite];

  -- Contactos.
  insert into clientes (id_empresa, nombre, tipo_documento, documento, email, telefono, direccion) values
    (_empresa, 'María Fernanda Ríos', 'CC', '1094887766', 'mafe.rios@correo.co', '3104567890', 'Armenia'),
    (_empresa, 'Julián Ospina', 'CC', '1094221133', 'julian.ospina@correo.co', '3157894561', 'Calarcá'),
    (_empresa, 'Distribuciones El Café SAS', 'NIT', '900456789-1', 'compras@elcafe.co', '6067451234', 'Pereira'),
    (_empresa, 'Laura Valencia', 'CC', '41933221', 'laura.v@correo.co', '3001239876', 'Armenia'),
    (_empresa, 'Santiago Mejía', 'CE', 'E1234567', 'santiago.mejia@correo.co', '3209876543', 'Montenegro'),
    (_empresa, 'Hotel Bosques del Quindío', 'NIT', '901223344-5', 'admin@bosqueshotel.co', '6067409988', 'Salento')
  on conflict do nothing;
  select array_agg(id) into _clientes from clientes where id_empresa = _empresa;

  insert into proveedores (id_empresa, nombre, nit, contacto, email, telefono, direccion) values
    (_empresa, 'Textiles del Eje SAS', '900111222-3', 'Patricia Londoño', 'ventas@textileseje.co', '6067331122', 'Dosquebradas'),
    (_empresa, 'Calzado Nómada Ltda.', '800333444-5', 'Felipe Arango', 'pedidos@nomada.co', '6043445566', 'Medellín'),
    (_empresa, 'Volt Importaciones', '901555666-7', 'Diana Castro', 'comercial@voltimport.co', '6015557788', 'Bogotá')
  on conflict (id_empresa, nombre) do nothing;
  select array_agg(id) into _proveedores from proveedores where id_empresa = _empresa;

  -- Ventas de los últimos 30 días (más los fines de semana).
  for _dia in reverse 29..0 loop
    _n := 1 + floor(random() * 2)::int
          + case when extract(isodow from now() - make_interval(days => _dia)) >= 5 then 1 else 0 end;
    for _i in 1.._n loop
      _bodega := _bodegas[1 + floor(random() * array_length(_bodegas, 1))::int];
      _items := '[]'::jsonb;
      for _j in 1..(1 + floor(random() * 3)::int) loop
        _prod := _ids[1 + floor(random() * array_length(_ids, 1))::int];
        _cant := least(1 + floor(random() * 3), public.stockly_disponible(_bodega, _prod)
                   - coalesce((select sum((x->>'cantidad')::numeric) from jsonb_array_elements(_items) x
                               where (x->>'id_producto')::bigint = _prod), 0));
        if _cant > 0 then
          _items := _items || jsonb_build_object(
            'id_producto', _prod, 'cantidad', _cant, 'iva', 19,
            'precio_unitario', (select precioventa from productos where id = _prod),
            'descuento', case when random() < 0.15 then round((select precioventa from productos where id = _prod) * _cant * 0.1) else 0 end);
        end if;
      end loop;
      continue when jsonb_array_length(_items) = 0;

      _venta := public.registrar_venta(jsonb_build_object(
        'id_empresa', _empresa,
        'id_bodega', _bodega,
        'id_cliente', case when random() < 0.45 then _clientes[1 + floor(random() * array_length(_clientes, 1))::int] end,
        'canal', case when _bodega = _online then 'online' when random() < 0.1 then 'telefono' else 'mostrador' end,
        'metodo_pago', (array['efectivo', 'efectivo', 'tarjeta', 'tarjeta', 'nequi', 'transferencia', 'daviplata', 'credito'])
                         [1 + floor(random() * 8)::int],
        'items', _items));
      update ventas set estado = 'pendiente' where id = (_venta->>'id')::bigint and metodo_pago = 'credito';

      -- Fecha en el pasado, en horario comercial.
      _fecha := date_trunc('day', now() at time zone 'America/Bogota') at time zone 'America/Bogota'
                - make_interval(days => _dia) + make_interval(hours => 9 + floor(random() * 10)::int, mins => floor(random() * 60)::int);
      if _fecha > now() then _fecha := now() - make_interval(mins => floor(random() * 120)::int); end if;
      update ventas set fecha = _fecha, created_at = _fecha where id = (_venta->>'id')::bigint;
      update facturas set emitida_en = _fecha where id_venta = (_venta->>'id')::bigint;
      update kardex set fecha = _fecha
       where id_empresa = _empresa and detalle = 'Venta ' || (_venta->>'prefijo') || '-' || (_venta->>'numero');
      _ventas := _ventas + 1;
    end loop;
  end loop;

  -- Una venta anulada para ver el flujo completo.
  perform public.anular_venta(
    (select id from ventas where id_empresa = _empresa and estado = 'pagada' order by fecha desc offset 3 limit 1),
    'Cliente cambió de talla');

  -- Órdenes de compra: una recibida, una enviada y un borrador propuesto por Novandra.
  _orden := public.crear_orden_compra(jsonb_build_object('id_empresa', _empresa, 'id_proveedor', _proveedores[1],
    'nota', 'Reposición de camisetas para temporada',
    'items', jsonb_build_array(jsonb_build_object('id_producto', _ids[1], 'cantidad', 40),
                               jsonb_build_object('id_producto', _ids[2], 'cantidad', 20))));
  perform public.recibir_orden_compra((_orden->>'id')::bigint);
  update ordenes_compra set fecha = now() - interval '12 days', recibida_en = now() - interval '9 days'
   where id = (_orden->>'id')::bigint;

  perform public.crear_orden_compra(jsonb_build_object('id_empresa', _empresa, 'id_proveedor', _proveedores[2],
    'id_bodega', _tienda, 'fecha_esperada', (current_date + 4)::text, 'nota', 'Pedido de calzado para la tienda',
    'items', jsonb_build_array(jsonb_build_object('id_producto', _ids[6], 'cantidad', 12),
                               jsonb_build_object('id_producto', _ids[7], 'cantidad', 6))));
  update ordenes_compra set estado = 'enviada' where id_empresa = _empresa and id_proveedor = _proveedores[2];

  perform public.crear_orden_compra(jsonb_build_object('id_empresa', _empresa, 'id_proveedor', _proveedores[3],
    'creada_por', 'novandra',
    'nota', 'El cargador USB-C está bajo su mínimo y se vende ~1 unidad diaria: propongo 30 unidades para cubrir el mes.',
    'items', jsonb_build_array(jsonb_build_object('id_producto', _ids[14], 'cantidad', 30))));

  -- Solo las 3 ventas más recientes en la campana (una por venta sería demasiado ruido).
  delete from notificaciones
   where id_empresa = _empresa and tipo = 'venta'
     and id not in (select id from notificaciones where id_empresa = _empresa and tipo = 'venta'
                    order by id desc limit 3);

  insert into notificaciones (id_empresa, tipo, titulo, mensaje, enlace) values
    (_empresa, 'novandra', 'Novandra sugiere reabastecer', 'Cargador rápido USB-C antes del viernes', '/compras');

  -- La carga de ejemplo no es actividad real del usuario: se quita de la auditoría (si existe).
  if to_regclass('public.auditoria') is not null then
    execute 'delete from public.auditoria where id_empresa = $1' using _empresa;
  end if;

  return jsonb_build_object('productos', array_length(_ids, 1), 'ventas', _ventas,
                            'clientes', array_length(_clientes, 1), 'proveedores', array_length(_proveedores, 1));
end $$;

revoke execute on function public.stockly_cargar_demo() from public, anon;
grant execute on function public.stockly_cargar_demo() to authenticated;
