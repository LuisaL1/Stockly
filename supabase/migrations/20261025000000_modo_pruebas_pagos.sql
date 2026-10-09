-- =====================================================================
-- Stockly: interruptor de pagos (modo pruebas).
--
-- pagos_activos = false: comprar un plan, agregar un complemento o empezar la
-- prueba de Enterprise se activa al instante, sin Wompi ni tarjeta. Los pagos
-- quedan registrados con metodo = 'PRUEBAS' para poder limpiarlos después.
-- pagos_activos = true: todo pasa por Wompi como siempre.
--
-- Activar los pagos reales:
--   update stockly_ajustes_globales set valor = 'true' where clave = 'pagos_activos';
-- Se puede ejecutar varias veces (no cambia el valor si ya existe).
-- =====================================================================

insert into public.stockly_ajustes_globales (clave, valor) values ('pagos_activos', 'false')
on conflict (clave) do nothing;
