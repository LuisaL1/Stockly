# Lanzamiento de Stockly

Lista de lo que hay que hacer para publicar Stockly y empezar a cobrar. Sigue el orden.

## Qué incluye el lanzamiento

| | Básico | Pro | Enterprise |
|---|---|---|---|
| Precio mensual (precio final, sin IVA) | Gratis | $69.900 | $189.900 |
| Precio anual (2 meses gratis) | — | $699.000 | $1.899.000 |
| Primera compra (−50%) | — | $34.950 / $349.500 | $94.950 / $949.500 |
| Productos | 1.000 | 5.000 | 50.000 |
| Ventas al mes | 300 | 5.000 | 30.000 |
| Bodegas / sedes | 1 / 1 | 5 / 3 | 30 / 15 |
| Usuarios | 2 | 5 | 20 |
| Clientes / proveedores | 200 / 20 | 5.000 / 300 | 50.000 / 3.000 |
| Archivos (logo y facturas de proveedores) | 50 MB | 2 GB | 10 GB |
| Envíos del informe al contador | — | 15 al mes | 60 al mes |
| Novandra esencial | Sí | Sí | Sí |
| Novandra Max (IA) | — | 80 consultas al mes (próximamente) | 250 consultas al mes (próximamente) |
| Tope de gasto en IA por empresa | — | COP 20.000/mes | COP 60.000/mes |
| Factura electrónica DIAN | — | Próximamente | Próximamente |

- **Nada es ilimitado.** Los topes se revisan en el servidor. Están calculados para que, aun con una empresa al tope, el costo en Supabase sea mínimo frente al precio: unos 6 KB por venta, así que una empresa Enterprise al tope (30.000 ventas al mes) crece ~180 MB al mes, menos de USD 0,03 de base de datos adicional por mes.
- **Novandra Max:** cada consulta cuesta en promedio ~COP 160 con Sonnet 5.5 (USD 2 / 10 por millón de tokens). Cada consulta tiene tope de 6 vueltas, ~90.000 tokens de entrada y 4.000 de salida. Al tope de consultas, la IA cuesta como máximo ~COP 12.800 en Pro (≈19% del precio neto) y ~COP 40.000 en Enterprise (≈22%), y el tope de gasto mensual corta antes si las consultas son muy largas. Al llegar a cualquiera de los dos, Novandra sigue respondiendo en modo esencial.
- **Complementos:** con un plan pagado vigente se puede comprar capacidad adicional sin cambiar de plan. Se cobra proporcional a los días que le quedan al plan (mínimo $3.000) y vence con él; al renovar el plan se renuevan juntos (opcional). Cada uno tiene tope de unidades. Precios por unidad al mes, más caros que lo incluido en los planes:

  | Complemento | Precio/mes | Tope |
  |---|---|---|
  | Usuario adicional | $14.900 | 30 |
  | Sede adicional (con 2 bodegas) | $24.900 | 10 |
  | 2 bodegas adicionales | $9.900 | 15 |
  | 2.000 productos más | $14.900 | 25 |
  | 2.000 ventas más al mes | $19.900 | 25 |
  | 5.000 clientes y 200 proveedores más | $9.900 | 10 |
  | 5 GB de archivos | $9.900 | 10 |
  | 10 envíos al contador | $4.900 | 10 |
  | 50 consultas a Novandra Max (+COP 12.000 de tope de IA) | $19.900 | 10 (cuando la IA esté activa) |

  Los precios y topes se cambian en la tabla `stockly_complementos`.
- **Bajar de plan:** con un plan pagado vigente no se puede pasar al Básico (perdería lo pagado). Al vencer, si no renueva, pasa sola al Básico.
- **Prueba de Enterprise (7 días):** las empresas nuevas empiezan en Básico. Desde *Plan y suscripción* pueden probar Enterprise 7 días registrando una tarjeta o Nequi en Wompi (widget en modo tokenizar: se guarda como fuente de pago y **no se cobra nada**). Al terminar pasan solas a Básico, sin cobro automático. Una sola prueba por empresa, por cuenta y por tarjeta. Los días se cambian en `stockly_ajustes_globales` (`dias_prueba`). Requiere la llave privada de Wompi en los Secrets.
- **Al terminar** la prueba o el plan sin renovar, la empresa pasa sola al plan Básico. Sus datos se conservan.
- **Pagos:** con Wompi, a la cuenta de MCCore. No hay cobro automático: antes de vencer la app avisa y la persona paga con un clic.

## 1. Supabase (obligatorio)

- [ ] **Pasar el proyecto al plan Pro (USD 25/mes).** El plan gratis **pausa el proyecto tras 1 semana sin uso** y no tiene copias de seguridad diarias.
- [ ] **Ejecutar las migraciones pendientes** en el SQL Editor, en orden. Todas se pueden ejecutar varias veces sin problema. Están en `supabase/migrations/` (ver la lista en el README). Para el lanzamiento, la clave es `20261018000000_lanzamiento.sql`.
- [ ] **Verificar que todo quedó bien:**
  ```sql
  select id, nombre, precio_mensual, precio_anual from stockly_planes order by orden;
  -- Tablas sin protección (debe salir vacío o solo tablas sin datos de clientes):
  select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
  ```
- [ ] **Authentication → Sign In / Providers → Email:** activar **Confirm email**.
- [ ] **Authentication → URL Configuration:**
  - *Site URL*: la dirección final, por ejemplo `https://app.appstockly.com`.
  - *Redirect URLs*: esa misma dirección con `/**`, más `http://localhost:5173/**` para pruebas.
- [ ] **Authentication → Emails → Templates:** pegar las plantillas de `supabase/plantillas-correo/`:

  | Plantilla de Supabase | Archivo |
  |---|---|
  | Confirm signup | `confirmar-registro.html` |
  | Invite user | `invitacion.html` |
  | Magic Link | `codigo-verificacion.html` |
  | Reset Password | `restablecer-contrasena.html` |
  | Change Email Address | `cambio-correo.html` |

- [ ] **Authentication → Rate Limits:** subir el límite de correos por hora (por ejemplo, 100).
- [ ] **Edge Functions → Secrets:**
  - `BREVO_API_KEY`: Brevo → SMTP & API → API Keys.
  - `NOVANDRA_MODELO`: identificador del modelo de IA de Anthropic que usa Novandra Max (ya está configurado).
  - `WOMPI_STOCKLY_PUBLIC_KEY`, `WOMPI_STOCKLY_INTEGRITY_SECRET` y `WOMPI_STOCKLY_EVENTS_SECRET`: ver el paso 2.
  - (opcional) `STOCKLY_EMISOR_RAZON_SOCIAL`, `STOCKLY_EMISOR_NIT` y `STOCKLY_EMISOR_DIRECCION`: solo si cambian los datos de MCCore del comprobante de pago (hoy: MCCore, NIT 1005233408, Quimbaya, Quindío).

Las funciones ya están desplegadas: `novandra`, `soporte`, `informe-contador`, `invitar-usuario`, `bienvenida`, `suscripcion-pago` y `suscripcion-webhook`. Si las cambias, vuelve a desplegarlas:
```bash
supabase functions deploy suscripcion-pago --project-ref <ref> --use-api
supabase functions deploy suscripcion-webhook --no-verify-jwt --project-ref <ref> --use-api
```

## 2. Wompi (cuenta de MCCore, para recibir el dinero)

- [ ] **Crear la cuenta de comercio** en [comercios.wompi.co](https://comercios.wompi.co). Necesitas el RUT de MCCore (o el tuyo si cobras como persona natural), cédula del representante y la cuenta bancaria donde quieres recibir el dinero.
- [ ] **Copiar las llaves de pruebas** en Wompi → *Desarrolladores*:
  - llave pública `pub_test_...` → `WOMPI_STOCKLY_PUBLIC_KEY`
  - secreto de integridad `test_integrity_...` → `WOMPI_STOCKLY_INTEGRITY_SECRET`
  - secreto de eventos `test_events_...` → `WOMPI_STOCKLY_EVENTS_SECRET`
  - (opcional) llave privada `prv_test_...` → `WOMPI_STOCKLY_PRIVATE_KEY`: sirve para confirmar el pago apenas la persona vuelve de Wompi; sin ella, el plan se activa igual con el webhook de eventos, unos segundos después.

  Ubicación en el panel de Wompi: la llave pública y la privada están en *Desarrolladores → Llaves del API*; los secretos de integridad y de eventos, en *Desarrolladores → Secretos para integración técnica*. Copia primero todo con el selector en **Sandbox**.
- [ ] **Configurar la URL de eventos** en esa misma pantalla:
  `https://csiwkliqxivjkvogkfdi.supabase.co/functions/v1/suscripcion-webhook`
- [ ] **Hacer la prueba completa en modo pruebas** (ver el paso 5).
- [ ] **Pasar a producción:** cuando Wompi apruebe la cuenta, cambiar los tres secretos por los de producción (`pub_prod_...`, `prod_integrity_...`, `prod_events_...`) y configurar también la URL de eventos de producción.

> No compartas estas llaves por chat ni las pongas en el código: van solo en los *Secrets* de Supabase.

## 3. Publicar la app (hosting y dominio)

- [ ] **Subir el repositorio a Vercel o Netlify** (los dos tienen plan gratis). Los archivos `vercel.json` y `public/_redirects` ya están listos para que las rutas funcionen.
  - Comando de compilación: `npm run build` · Carpeta: `dist`
  - Variables de entorno: `VITE_APP_SUPABASE_URL` y `VITE_APP_SUPABASE_ANON_KEY` (las mismas del `.env`; nunca la llave `service_role`).
- [ ] **Conectar el dominio**, por ejemplo `app.appstockly.com`, en el panel del hosting y en el DNS del dominio.
- [ ] **Actualizar en Supabase** la *Site URL* y las *Redirect URLs* con el dominio final (paso 1).

## 4. Legal y tributario

- [x] **Datos de MCCore** (razón social, NIT, dirección) en `src/pages/Legal.jsx` y en el comprobante de pago.
- [ ] Hacer revisar con un abogado los **Términos** (`/terminos`) y la **Política de datos** (`/privacidad`).
- [ ] **Con tu contador:**
  - MCCore **no es responsable de IVA**: los precios son finales y no se cobra IVA. Si llegas a serlo (por ingresos o por decisión), avisa para ajustar los textos, informar el IVA a Wompi (`tax-in-cents:vat`) y decidir si el precio lo absorbe o se suma;
  - como no responsable de IVA, le entregas al cliente documento soporte o factura según te indique tu contador;
  - definir cómo vas a facturarle a tus clientes las suscripciones (con un software de facturación electrónica);
  - revisar el registro de la base de datos ante la SIC (RNBD), si aplica.
- [ ] **Revisar el derecho de retracto:** los términos ofrecen 5 días hábiles para reembolsos (Ley 1480). Los reembolsos se hacen desde el panel de Wompi.

## 5. Pruebas antes de abrir

En **modo pruebas de Wompi** (llaves `pub_test_`):

1. **Crear una cuenta nueva:** verificar que llega el correo de confirmación y, al entrar, el de bienvenida. La empresa debe quedar en **Básico**. Luego, en *Plan y suscripción → Empezar prueba gratis*, registra la tarjeta de prueba 4242 4242 4242 4242: debe quedar en **Enterprise (prueba)** por 7 días sin ningún cobro en Wompi.
2. **Invitar a una persona del equipo** con otro correo: verificar que recibe la invitación y crea su contraseña.
3. **Plan y suscripción → Comprar Pro → Ir a pagar:** en el checkout de Wompi usar una tarjeta de prueba. Según la documentación de Wompi, `4242 4242 4242 4242` resulta aprobada y `4111 1111 1111 1111` rechazada; cualquier fecha futura y cualquier CVC.
4. **Al volver a Stockly** (*Plan y suscripción*): debe decir "Plan Pro activo", con precio $34.950 (50%), llegar el aviso a la campana y el **comprobante de pago en PDF** al correo (con copia a equipo@appstockly.com).
   Si no se activa, revisa qué avisos llegaron de Wompi: `select * from wompi_eventos order by id desc limit 10;`. Si está vacía, la URL de eventos no está configurada en Wompi (en el ambiente Sandbox); si dice "firma inválida", el secreto de eventos no corresponde.
5. **Comprar de nuevo:** el precio ya debe ser $69.900, sin descuento.
6. **Probar con la tarjeta rechazada:** debe decir que el pago no se completó y el plan no cambia.
7. **Simular el vencimiento** en el SQL Editor y comprobar que la empresa queda en Básico con sus datos intactos:
   ```sql
   update stockly_suscripciones set vence_en = now() - interval '1 day', prueba_hasta = now() - interval '1 day' where id_empresa = <id>;
   ```

Después, con **llaves de producción**, haz **una compra real pequeña con tu propia tarjeta** para confirmar que el dinero llega a tu cuenta (puedes reembolsarla desde Wompi).

## 6. Activar funciones cuando estén listas

Cada una se enciende con una línea en el SQL Editor, sin publicar una nueva versión de la app:

```sql
-- Novandra Max (IA): cuando tengas créditos de Anthropic y el secreto ANTHROPIC_API_KEY.
update stockly_ajustes_globales set valor = 'true' where clave = 'novandra_ia_disponible';
-- Factura electrónica DIAN: cuando el conector con el proveedor tecnológico esté listo.
update stockly_ajustes_globales set valor = 'true' where clave = 'factura_electronica_disponible';
-- Nequi QR: cuando Nequi habilite la integración.
update stockly_ajustes_globales set valor = 'true' where clave = 'nequi_qr_disponible';
-- Cambiar el descuento de la primera compra (0 para quitarlo).
update stockly_ajustes_globales set valor = '50' where clave = 'descuento_primera_compra';
```

## 7. Después del lanzamiento (siguientes pasos)

- **Correos de recordatorio** de vencimiento (7, 3 y 1 día antes) con una tarea programada en Supabase. Hoy el aviso solo sale dentro de la app.
- **Cobro automático** con tarjeta guardada (Wompi *payment sources*).
- **Monitoreo de errores** (por ejemplo, Sentry) y analítica de uso.
- **Página pública de inicio** con precios y registro (landing).
- **Factura electrónica DIAN, Nequi QR y Novandra Max**, activándolos con el paso 6.

## Costos estimados de operación

| Concepto | USD/mes |
|---|---|
| Supabase Pro | 25 |
| Brevo (gratis hasta 300 correos/día) | 0–9 |
| Hosting (Vercel/Netlify) y dominio | 0–20 |
| Wompi | 2,65% + $700 + IVA por cobro (confirmar con Wompi) |
| Anthropic (cuando actives la IA) | ~COP 160 por consulta con Sonnet 5.5 |

Con unos 4 clientes Pro se cubren los costos fijos.
