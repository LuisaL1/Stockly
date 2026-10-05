# Stockly

Aplicación web para pequeñas empresas: inventario en varias bodegas, punto de venta con facturación, órdenes de compra, clientes y proveedores, notificaciones en tiempo real, dashboards, planes de suscripción y **Novandra**, un agente con IA que ayuda en las tareas internas.

Desarrollada por **MCCore**.

## Stack

- **React 19** + **Vite 7**
- **styled-components** (temas claro/oscuro con tokens de diseño)
- **Supabase** (autenticación y base de datos Postgres)
- **TanStack Query** (carga de datos) y **Zustand** (estado)
- **TanStack Table**, **react-hook-form**, **@react-pdf/renderer**, **SweetAlert2**

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completa la URL y la anon key de Supabase
npm run dev
```

| Script            | Descripción                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Servidor de desarrollo              |
| `npm run build`   | Compilación de producción en `dist` |
| `npm run preview` | Sirve la compilación localmente     |
| `npm run lint`    | Revisión de código con ESLint       |

### Backend (Supabase)

1. Ejecuta las migraciones de `supabase/migrations/` **en orden** en el editor SQL de Supabase (o con `supabase db push`). Todas son idempotentes:
   1. `20261003000000_stockly_v2.sql`: ventas, bodegas, planes, notificaciones.
   2. `20261004000000_registro.sql`: registro de empresa en un paso.
   3. `20261004010000_seguridad.sql`: cierra `Usuarios` y `permisos`.
   4. `20261004020000_demo.sql`: botón de datos de ejemplo.
   5. `20261005000000_inteligencia.sql`: sucursales, auditoría, rotación y permisos de Novandra.
   6. `20261006000000_pagos.sql`: pagos por venta (mixto, datáfono, transferencia, efectivo con cambio, crédito) y Wompi.
   7. `20261006010000_empresa.sql`: edición de los datos de la empresa.
   8. `20261007000000_medios_pago.sql`: Bre-B (llave del negocio) y QR dinámico de Nequi Negocios.
   9. `20261008000000_importacion.sql`: importación masiva desde Excel y exportación de los datos de la empresa.
   10. `20261009000000_reporte_bajo_minimo.sql`: corrección de seguridad del reporte de stock bajo mínimo.
   11. `20261010000000_novandra_esencial.sql`: Novandra esencial (sin API), patrones del negocio, aprendizaje y Novandra Max en planes Pro/Empresa.
   12. `20261011000000_eliminar_datos.sql`: eliminación de datos con confirmación y código por correo.
   13. `20261012000000_logo_empresa.sql`: logo de la empresa (almacenamiento y facturas).
   14. `20261013000000_soporte.sql`: solicitudes de soporte desde la app (Edge Function `soporte`, secreto `BREVO_API_KEY`).
   15. `20261014000000_informe_contable.sql`: informe para el contador (Edge Function `informe-contador`, secreto `BREVO_API_KEY`).
   16. `20261015000000_facturas_proveedor.sql`: facturas de proveedores en las compras e informe contable con detalle de compras.
   17. `20261016000000_invitaciones.sql`: invitaciones al equipo por correo (Edge Function `invitar-usuario`).
   18. `20261017000000_bienvenida.sql`: correo de bienvenida al crear la empresa (Edge Function `bienvenida`).
   19. `20261018000000_lanzamiento.sql`: planes comerciales, mes de prueba, pagos con Wompi y funciones "próximamente". Ver `docs/LANZAMIENTO.md`.
   20. `20261019000000_recibos_suscripcion.sql`: número de comprobante de pago de la suscripción y registro de los avisos de Wompi.
   21. `20261020000000_limites_planes.sql`: topes de todos los planes (nada ilimitado), revisados en el servidor, y protección para no bajar a Básico con un plan pagado vigente.
   22. `20261021000000_complementos.sql`: complementos (usuarios, sedes, productos, etc. adicionales) que se compran sobre el plan pagado y vencen con él.
   23. `20261022000000_prueba_enterprise.sql`: prueba de Enterprise por 7 días registrando un medio de pago en Wompi (sin cobro); reemplaza el mes de prueba automático.
   24. `20261023000000_facturas_compartidas.sql`: almacenamiento privado del PDF de la factura para enviarlo por WhatsApp con un enlace de 30 días.
   25. `20261024000000_codigos_promo.sql`: códigos promocionales (por ejemplo, Pro gratis un mes) con topes de seguridad. Los códigos se crean en el SQL Editor, no en el repositorio.
2. Despliega las Edge Functions y guarda la API key de Anthropic para Novandra:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy novandra
supabase functions deploy factura-electronica
supabase functions deploy wompi-link
supabase functions deploy wompi-webhook --no-verify-jwt   # Wompi no envía la sesión de Supabase
```

Para el link de pago, guarda las llaves de Wompi en **Configuración → Facturación** y pega en Wompi
(Desarrolladores → URL de eventos) la dirección `https://<tu-proyecto>.supabase.co/functions/v1/wompi-webhook`.

3. La factura electrónica DIAN queda preparada pero sin conectar: para activarla, implementa el adaptador del proveedor tecnológico en `supabase/functions/factura-electronica/index.ts` y guarda su token (`DIAN_ALEGRA_TOKEN`, `DIAN_SIIGO_TOKEN`...).

## Estructura

```
src/
├── Components/
│   ├── atomos/          Botón, acciones de tabla, etiquetas de color
│   ├── moleculas/       Modal, estados vacío/error/carga, tarjetas, ConPermiso
│   ├── organismos/      Sidebar, selector, buscador, formularios, tablas, reportes
│   │   ├── novandra/    Panel de chat del agente
│   │   └── ventas/      Factura en PDF
│   └── templatesReact/  Layout, plantilla de página, plantilla CRUD, inicio, login...
├── context/             Sesión (AuthContext) y tema
├── hooks/               ProtectedRoute, usePaginaCrud
├── pages/               Una página por ruta
├── routers/             Rutas (los reportes se cargan bajo demanda)
├── store/               Stores de Zustand (crearStoreCrud para catálogos)
├── styles/              Tokens de tema, estilos globales, breakpoints, íconos
├── supabase/            Cliente, funciones CRUD por entidad y llamadas a Edge Functions
└── utils/               Formatos, notificaciones, permisos, datos estáticos

supabase/
├── migrations/          Esquema v2 (ventas, bodegas, planes, notificaciones...)
└── functions/
    ├── novandra/              Agente con IA (herramientas de solo lectura + borradores)
    ├── factura-electronica/   Envío a la DIAN vía proveedor tecnológico (preparado)
    ├── wompi-link/            Crea el link de pago de Wompi para el saldo de una venta
    └── wompi-webhook/         Recibe la confirmación de Wompi (firma SHA256) y marca el pago
```

## Base de datos (Supabase)

La app espera estos objetos en Supabase:

- **Tablas:** `Usuarios`, `Empresa`, `asignarempresa`, `modulos`, `permisos`, `marca`, `categorias`, `productos`, `kardex`.
- **Tablas nuevas (migración v2):** `planes`, `suscripciones`, `historial_suscripcion`, `bodegas`, `stock_bodega`, `traslados`, `clientes`, `proveedores`, `config_facturacion`, `ventas`, `detalle_venta`, `facturas`, `ordenes_compra`, `detalle_orden_compra`, `notificaciones`, `novandra_uso`, y la vista `v_stock_bodega`.
- **Funciones nuevas:** `registrar_venta`, `anular_venta`, `crear_orden_compra`, `recibir_orden_compra`, `trasladar_stock`, `cambiar_plan`, `stockly_dashboard`, `stockly_uso_plan`.
- El stock total de cada producto lo sigue actualizando el trigger existente sobre `kardex`; la migración solo agrega la distribución por bodega (la bodega principal se calcula como el total menos lo que está en las demás).
- **Funciones RPC:** `insertarmarca`, `insertarcategorias`, `insertarproductos` (devuelven `"insertado"` o `"duplicado"`), `mostrarproductos`, `buscarproductos`, `mostrarkardexempresa`, `buscarkardexempresa`, `mostrarpersonal`, `buscarpersonal`, `contar_usuarios_por_empresa`, `reportproductosbajominimo`, `inventariovalorado`.
- Los nombres de la tabla `modulos` deben coincidir con `src/utils/permisos.js`.
