// Centro de ayuda: guías paso a paso de cada función de Stockly.
// rutas: pantallas donde la guía es relevante (se muestran primero en el panel de Soporte).
// claves: otras palabras con las que alguien buscaría la guía.
// soloAdmin: solo la ven el dueño y los administradores.

export const CATEGORIAS_GUIAS = [
  "Primeros pasos",
  "Ventas y cobros",
  "Facturación",
  "Inventario",
  "Compras y proveedores",
  "Clientes",
  "Inteligencia y Novandra",
  "Equipo y seguridad",
  "Cuenta, plan y datos",
];

export const GUIAS = [
  // ------------------------------------------------------------ Primeros pasos
  {
    id: "configurar-empresa",
    categoria: "Primeros pasos",
    titulo: "Configurar los datos de tu empresa",
    resumen: "Nombre, NIT, sector, ciudad, teléfono y moneda: aparecen en el panel, los reportes y las facturas.",
    rutas: ["/configurar/empresa", "/configurar"],
    claves: "nombre empresa nit cambiar nombre negocio moneda simbolo ciudad sector telefono datos empresa",
    pasos: [
      "Ve a Configuración → Tu empresa.",
      "Escribe el nombre de la empresa tal como quieres que salga en las facturas.",
      "Completa NIT, sector, ciudad, teléfono y el símbolo de moneda.",
      "Toca Guardar.",
    ],
    consejos: ["La razón social y la resolución de la DIAN se configuran aparte, en Configuración → Facturación."],
    ir: { texto: "Ir a Tu empresa", a: "/configurar/empresa" },
    soloAdmin: true,
  },
  {
    id: "logo-empresa",
    categoria: "Primeros pasos",
    titulo: "Poner el logo de tu empresa en las facturas",
    resumen: "Sube tu logo y aparecerá al lado del nombre en facturas, reportes y el menú.",
    rutas: ["/configurar/empresa", "/configurar/facturacion"],
    claves: "logo logotipo imagen marca factura pdf membrete subir logo",
    pasos: [
      "Ve a Configuración → Tu empresa.",
      "En Logo de tu empresa, toca Subir logo (o arrastra la imagen al recuadro).",
      "Listo: tus facturas y reportes en PDF lo muestran al lado del nombre.",
    ],
    consejos: [
      "Funciona mejor un PNG con fondo transparente. También sirven JPG, SVG o WebP: lo ajustamos y recortamos los bordes vacíos.",
      "Para cambiarlo, sube otro; para quitarlo, toca Quitar.",
    ],
    ir: { texto: "Ir a Tu empresa", a: "/configurar/empresa" },
    soloAdmin: true,
  },
  {
    id: "importar-productos",
    categoria: "Primeros pasos",
    titulo: "Subir tus productos desde Excel",
    resumen: "La forma más rápida de empezar: una plantilla de una hoja con nombre, precio, stock y categoría.",
    rutas: ["/configurar/datos", "/configurar/productos"],
    claves: "excel importar cargar masivo plantilla csv subir productos inventario inicial migrar",
    pasos: [
      "Ve a Configuración → Importar y exportar.",
      "Toca Plantilla de productos y ábrela en Excel o Google Sheets.",
      "Llena una fila por producto. Solo el nombre es obligatorio; con el precio de venta ya puedes vender.",
      "Arrastra el archivo al recuadro (o toca Elegir archivo).",
      "Revisa el resumen: cuántas filas están listas y los errores de cada fila.",
      "Toca Importar.",
    ],
    consejos: [
      "También sirve tu propio Excel: Stockly reconoce columnas como Precio, Costo, SKU o Existencias.",
      "Puedes subir el mismo archivo otra vez: lo que ya existe se actualiza, no se duplica.",
      "El stock del archivo es la cantidad que debe quedar; la diferencia queda en el kardex.",
    ],
    ir: { texto: "Ir a Importar y exportar", a: "/configurar/datos" },
    soloAdmin: true,
  },
  {
    id: "registrar-producto",
    categoria: "Primeros pasos",
    titulo: "Registrar un producto",
    resumen: "Crea un producto con su categoría, marca, precios, stock y stock mínimo.",
    rutas: ["/configurar/productos"],
    claves: "crear producto nuevo producto agregar articulo item precio costo codigo barras sku",
    pasos: [
      "Ve a Productos y toca Nuevo producto.",
      "Escribe la descripción (incluye tamaño o presentación).",
      "Elige la marca y la categoría. Con el botón + las creas sin salir del formulario.",
      "Escribe el stock inicial y el stock mínimo.",
      "Escribe el precio de compra (costo) y el de venta.",
      "Opcional: código de barras y código interno.",
      "Toca Guardar producto.",
    ],
    consejos: [
      "Después de crearlo, el stock ya no se edita en el producto: se ajusta con entradas y salidas en Kardex, para que quede el historial.",
      "En Productos tienes el botón Guía, que muestra una ficha de ejemplo campo por campo.",
    ],
    ir: { texto: "Ir a Productos", a: "/configurar/productos" },
  },
  {
    id: "categorias-marcas",
    categoria: "Primeros pasos",
    titulo: "Crear categorías y marcas",
    resumen: "Agrupa tus productos para encontrarlos rápido y ver qué grupo vende más.",
    rutas: ["/configurar/categorias", "/configurar/marca"],
    claves: "categoria categorias marca marcas grupo agrupar color clasificar",
    pasos: [
      "Ve a Configuración → Categorías (o Marcas).",
      "Toca Nueva categoría, escribe el nombre y elige un color.",
      "Guárdala. Ya puedes asignarla al crear o editar productos.",
    ],
    consejos: ["Si importas desde Excel, las categorías y marcas que escribas se crean solas."],
    ir: { texto: "Ir a Categorías", a: "/configurar/categorias" },
  },
  {
    id: "datos-ejemplo",
    categoria: "Primeros pasos",
    titulo: "Probar Stockly con datos de ejemplo",
    resumen: "Carga un negocio de ejemplo con productos, bodegas y un mes de ventas para explorar todo.",
    rutas: ["/configurar", "/"],
    claves: "demo ejemplo prueba probar explorar datos ficticios",
    pasos: [
      "Ve a Configuración (o al Inicio si tu empresa está vacía).",
      "Toca Cargar datos de ejemplo y confirma.",
    ],
    consejos: [
      "Solo funciona en una empresa sin ventas.",
      "Cuando termines de explorar, puedes borrar esos datos en Importar y exportar → Zona de peligro.",
    ],
    ir: { texto: "Ir a Configuración", a: "/configurar" },
    soloAdmin: true,
  },

  // ------------------------------------------------------------ Ventas y cobros
  {
    id: "hacer-venta",
    categoria: "Ventas y cobros",
    titulo: "Hacer una venta",
    resumen: "Agrega productos al ticket, elige cómo te pagan y cobra.",
    rutas: ["/ventas"],
    claves: "vender venta cobrar caja pos ticket facturar registrar venta punto de venta",
    pasos: [
      "Ve a Vender (o toca Nueva venta arriba).",
      "Elige la bodega desde la que sale la mercancía.",
      "Toca los productos para agregarlos al ticket, o búscalos por nombre.",
      "Opcional: elige el cliente (Consumidor final por defecto), el descuento y el IVA.",
      "En Cómo paga, elige el medio de pago y completa sus datos.",
      "Toca Cobrar.",
    ],
    consejos: [
      "En efectivo, escribe cuánto te entregan y Stockly calcula el cambio.",
      "Al terminar puedes descargar el PDF o enviar la factura por WhatsApp.",
    ],
    ir: { texto: "Ir a Vender", a: "/ventas" },
  },
  {
    id: "pago-mixto",
    categoria: "Ventas y cobros",
    titulo: "Cobrar con varios medios de pago",
    resumen: "Parte en efectivo y parte con tarjeta, Bre-B u otro medio.",
    rutas: ["/ventas"],
    claves: "pago mixto dividir pago dos medios parte efectivo parte tarjeta combinado",
    pasos: [
      "En Vender, con los productos en el ticket, toca Dividir el pago.",
      "Elige el medio y el valor de cada parte. Con + Otro medio agregas más.",
      "Cuando diga Pagos completos, toca Cobrar.",
    ],
    ir: { texto: "Ir a Vender", a: "/ventas" },
  },
  {
    id: "medios-pago",
    categoria: "Ventas y cobros",
    titulo: "Efectivo, datáfono, Bre-B, Nequi y Daviplata",
    resumen: "Qué pide cada medio de pago al cobrar.",
    rutas: ["/ventas", "/configurar/facturacion"],
    claves: "efectivo datafono tarjeta voucher aprobacion bre b breb llave transferencia nequi daviplata medio de pago cambio",
    pasos: [
      "Efectivo: escribe cuánto recibes; Stockly muestra el cambio.",
      "Datáfono: elige la franquicia y escribe el número de aprobación del voucher (obligatorio).",
      "Bre-B: el cliente paga desde cualquier banco o billetera a tu llave Bre-B; opcionalmente anota el banco de origen y la referencia.",
      "Nequi y Daviplata: anota la referencia si quieres.",
    ],
    consejos: [
      "Configura tu llave Bre-B en Configuración → Facturación → Cobro con Bre-B para que aparezca en la caja, el PDF y WhatsApp.",
      "En Bre-B, transferencias y billeteras confirma en tu app que el dinero llegó antes de entregar.",
    ],
    ir: { texto: "Configurar Bre-B", a: "/configurar/facturacion" },
  },
  {
    id: "link-pago",
    categoria: "Ventas y cobros",
    titulo: "Cobrar con link de pago (tarjeta, PSE, Nequi)",
    resumen: "Envía un link de Wompi por WhatsApp; la venta se marca pagada sola cuando el cliente paga.",
    rutas: ["/ventas", "/ventas/facturas", "/configurar/facturacion"],
    claves: "link de pago wompi pse tarjeta credito online pago en linea enlace cobrar a distancia",
    pasos: [
      "Primero conecta Wompi en Configuración → Facturación → Link de pago con Wompi.",
      "En Vender, elige Link de pago como medio y toca Cobrar.",
      "Copia el link o envíalo por WhatsApp al cliente.",
      "Cuando el cliente pague, Wompi lo confirma y la venta pasa a pagada.",
    ],
    consejos: ["Si una venta quedó pendiente, desde Facturas puedes crear el link para el saldo."],
    ir: { texto: "Configurar Wompi", a: "/configurar/facturacion" },
  },
  {
    id: "credito-abonos",
    categoria: "Ventas y cobros",
    titulo: "Vender a crédito y registrar abonos",
    resumen: "La venta queda pendiente y registras los pagos a medida que el cliente abona.",
    rutas: ["/ventas", "/ventas/facturas"],
    claves: "credito fiado abono abonar saldo pendiente deuda cuenta por cobrar pagar despues cartera",
    pasos: [
      "En Vender, elige Crédito como medio de pago y cobra (te conviene elegir el cliente).",
      "Cuando el cliente pague, ve a Facturas y abre la venta con Ver.",
      "Toca Registrar pago, elige el medio y el valor del abono, y guarda.",
      "Cuando el saldo llega a cero, la venta queda pagada.",
    ],
    consejos: ["En Facturas, el filtro Pendientes de pago te muestra todo lo que te deben."],
    ir: { texto: "Ir a Facturas", a: "/ventas/facturas" },
  },
  {
    id: "enviar-factura",
    categoria: "Ventas y cobros",
    titulo: "Enviar la factura por WhatsApp o en PDF",
    resumen: "Comparte la factura con el cliente con un toque.",
    rutas: ["/ventas", "/ventas/facturas"],
    claves: "whatsapp enviar factura pdf descargar compartir comprobante recibo imprimir",
    pasos: [
      "Al cobrar, en la ventana de venta registrada, o desde Facturas → Ver.",
      "Toca Descargar PDF para guardar o imprimir la factura.",
      "Para WhatsApp, revisa el número del cliente y toca Enviar PDF por WhatsApp.",
      "En el celular se abre el menú de compartir con el PDF adjunto: elige WhatsApp y el contacto.",
      "En el computador se abre el chat con el resumen y un enlace para descargar el PDF.",
    ],
    consejos: [
      "Si hay saldo pendiente, el mensaje incluye tu llave Bre-B, tus datos bancarios y el link de pago si lo creaste.",
      "El enlace del PDF funciona por 30 días. Si el cliente lo necesita después, vuelve a enviarlo.",
    ],
    ir: { texto: "Ir a Facturas", a: "/ventas/facturas" },
  },
  {
    id: "anular-venta",
    categoria: "Ventas y cobros",
    titulo: "Anular una venta",
    resumen: "Anula una venta equivocada: el inventario se devuelve a la bodega.",
    rutas: ["/ventas/facturas"],
    claves: "anular venta cancelar venta devolver devolucion error en venta reversar borrar venta",
    pasos: [
      "Ve a Facturas y busca la venta (por número, cliente o documento).",
      "Toca Ver y luego Anular.",
      "Escribe el motivo y confirma.",
    ],
    consejos: [
      "La venta no se borra: queda como anulada, con su motivo, en Facturas y en la Auditoría.",
      "Si ya era factura electrónica ante la DIAN, se requiere una nota crédito con tu proveedor tecnológico.",
    ],
    ir: { texto: "Ir a Facturas", a: "/ventas/facturas" },
  },
  {
    id: "consultar-ventas",
    categoria: "Ventas y cobros",
    titulo: "Consultar tus ventas y lo que te deben",
    resumen: "Historial de ventas con totales, estado de pago y filtros.",
    rutas: ["/ventas/facturas", "/"],
    claves: "historial ventas facturas consultar buscar venta cuanto vendi por cobrar pendientes filtrar periodo",
    pasos: [
      "Ve a Facturas.",
      "Usa los filtros de periodo y estado (Pagadas, Pendientes de pago, Anuladas).",
      "Busca por número, cliente o documento.",
      "Arriba ves lo facturado, lo que está por cobrar y el ticket promedio.",
    ],
    consejos: ["En el Inicio tienes el resumen del periodo y las ventas de hoy."],
    ir: { texto: "Ir a Facturas", a: "/ventas/facturas" },
  },

  // ------------------------------------------------------------ Facturación
  {
    id: "informe-contador",
    categoria: "Facturación",
    titulo: "Enviar un informe a tu contador",
    resumen: "Un Excel con ventas, IVA, cobros, cartera, compras e inventario del periodo, enviado por correo.",
    rutas: ["/informe-contable", "/reportes", "/ventas/facturas"],
    claves: "contador contabilidad informe contable iva declaracion bimestre libro de ventas cierre de mes excel enviar contador",
    pasos: [
      "Ve a Informe contable (en el menú, debajo de Kardex).",
      "Elige el periodo: mes anterior, este mes, bimestre anterior (para el IVA), año anterior o fechas personalizadas.",
      "Revisa el resumen y marca las secciones que quieres incluir.",
      "La primera vez, escribe el nombre y el correo de tu contador y toca Guardar contador.",
      "Toca Enviar a mi contador (o Descargar Excel si prefieres enviarlo tú).",
    ],
    consejos: [
      "El correo le llega a tu contador con copia para ti; si responde, la respuesta te llega a ti.",
      "Las ventas anuladas aparecen marcadas en el libro de ventas pero no suman en los totales.",
    ],
    ir: { texto: "Ir a Informe contable", a: "/informe-contable" },
    soloAdmin: true,
  },
  {
    id: "configurar-facturacion",
    categoria: "Facturación",
    titulo: "Configurar la numeración, el IVA y la nota de la factura",
    resumen: "Prefijo, consecutivo, IVA por defecto, datos fiscales y texto al pie.",
    rutas: ["/configurar/facturacion"],
    claves: "prefijo consecutivo numeracion iva impuesto razon social regimen nota al pie resolucion factura",
    pasos: [
      "Ve a Configuración → Facturación.",
      "Completa razón social, NIT, régimen, dirección, teléfono y correo.",
      "Define el prefijo (por ejemplo FV) y el IVA por defecto.",
      "Opcional: la nota al pie (por ejemplo, la política de cambios).",
      "Toca Guardar.",
    ],
    ir: { texto: "Ir a Facturación", a: "/configurar/facturacion" },
    soloAdmin: true,
  },
  {
    id: "factura-electronica",
    categoria: "Facturación",
    titulo: "Factura electrónica DIAN",
    resumen: "Stockly deja todo listo para emitir con un proveedor tecnológico autorizado.",
    rutas: ["/configurar/facturacion", "/ventas/facturas"],
    claves: "dian factura electronica cufe resolucion proveedor tecnologico alegra siigo electronica",
    pasos: [
      "Disponible en los planes Pro y Empresa.",
      "En Configuración → Facturación, activa Emitir mis facturas como electrónica.",
      "Elige tu proveedor tecnológico y el ambiente (pruebas o producción).",
      "Escribe la resolución de la DIAN, su fecha y el rango de numeración.",
      "Las ventas nuevas quedan pendientes de envío; en Facturas → Ver puedes usar Enviar a DIAN.",
    ],
    consejos: ["Si no la activas, Stockly emite factura interna en PDF."],
    ir: { texto: "Ir a Facturación", a: "/configurar/facturacion" },
    soloAdmin: true,
  },

  // ------------------------------------------------------------ Inventario
  {
    id: "entradas-salidas",
    categoria: "Inventario",
    titulo: "Kardex: el historial de tu inventario",
    resumen: "Cada entrada y salida con su origen y su saldo. Y los ajustes que no pasan por una venta o una compra.",
    rutas: ["/kardex", "/configurar/productos"],
    claves: "kardex entrada salida ajustar stock corregir inventario conteo perdida dañado vencido merma saldo historial movimientos",
    pasos: [
      "Ve a Kardex. Verás cada movimiento con su origen (venta, compra, traslado, importación o ajuste) y el saldo que dejó.",
      "Filtra por producto, bodega, tipo, origen o fechas. Desde Productos, Ver movimientos abre el kardex de ese producto.",
      "Para sumar o descontar unidades por algo que no es una venta ni una compra, toca Ajuste de inventario: elige Entrada o Salida, el producto, la bodega, el motivo (conteo, dañado, vencido, pérdida...) y la cantidad.",
      "Guarda. El stock se actualiza al instante y el ajuste queda en el historial con tu nombre.",
    ],
    consejos: [
      "Los movimientos no se borran. Si un ajuste quedó mal, usa Anular ajuste: se registra el movimiento contrario y ambos quedan en el historial.",
      "Las ventas, anulaciones, compras recibidas y traslados generan sus movimientos solos; se revierten desde donde se hicieron.",
      "Con Excel descargas el listado que tengas filtrado.",
    ],
    ir: { texto: "Ir a Kardex", a: "/kardex" },
  },
  {
    id: "red-empresas",
    categoria: "Inventario",
    titulo: "Red de empresas: partners y franquicias",
    resumen: "Vincula otra empresa de Stockly para ver su stock en tiempo real, enviarle mercancía y recibir pedidos.",
    rutas: ["/red", "/configurar/plan"],
    claves: "red partner franquicia vinculo vincular matriz sucursal independiente otra empresa enviar mercancia pedido codigo",
    pasos: [
      "Con el plan Partner, ve a Red de empresas y toca Invitar empresa: obtienes un código (vale 7 días).",
      "La otra empresa (con cualquier plan) entra a Red de empresas → Tengo un código y lo pega. Listo: quedan vinculadas.",
      "Cada una decide qué comparte: stock en tiempo real, costos y catálogo. Se cambia cuando quieras en la tarjeta del vínculo.",
      "Para enviar mercancía: Enviar mercancía, eliges bodega y productos. Sale de tu inventario; cuando la otra empresa la recibe, entra al suyo (y se crean los productos que no tenga).",
      "Para pedir: Pedir, eliges una o varias empresas y los productos. Quien recibe el pedido lo despacha con un clic.",
    ],
    consejos: [
      "Un partner no necesita el plan Partner: solo la matriz que invita.",
      "Si recibes un envío que no corresponde, recházalo: la mercancía vuelve al inventario de quien la envió.",
      "Todo queda en el kardex de ambas empresas con origen Red.",
    ],
    ir: { texto: "Ir a Red de empresas", a: "/red" },
  },
  {
    id: "bodegas-traslados",
    categoria: "Inventario",
    titulo: "Crear bodegas y trasladar stock",
    resumen: "Maneja inventario en varios lugares y mueve unidades entre ellos.",
    rutas: ["/bodegas"],
    claves: "bodega bodegas almacen traslado trasladar mover stock entre bodegas punto de venta tienda online satelite",
    pasos: [
      "Ve a Bodegas y toca Nueva bodega.",
      "Escribe el nombre, elige el tipo (punto de venta, e-commerce, satélite) y la sucursal.",
      "Para mover unidades, usa Trasladar stock: elige desde, hacia, el producto y la cantidad.",
    ],
    consejos: [
      "El traslado no cambia el total del producto, solo dónde está.",
      "Tu plan define cuántas bodegas puedes tener.",
    ],
    ir: { texto: "Ir a Bodegas", a: "/bodegas" },
  },
  {
    id: "sucursales",
    categoria: "Inventario",
    titulo: "Manejar varias sedes (sucursales)",
    resumen: "Registra tus sedes y mira cuánto vende cada una.",
    rutas: ["/sucursales", "/"],
    claves: "sucursal sucursales sede sedes local tienda ciudad varias sedes",
    pasos: [
      "Ve a Sucursales y toca Nueva sucursal.",
      "Escribe nombre, ciudad, dirección, teléfono y responsable.",
      "Asigna bodegas a cada sede desde Bodegas.",
      "En el Inicio y en Inteligencia puedes filtrar por sucursal.",
    ],
    ir: { texto: "Ir a Sucursales", a: "/sucursales" },
    soloAdmin: true,
  },
  {
    id: "stock-minimo",
    categoria: "Inventario",
    titulo: "Stock mínimo y alertas",
    resumen: "Recibe un aviso cuando un producto llega a su nivel mínimo.",
    rutas: ["/configurar/productos", "/reportes/stock-bajo-minimo", "/"],
    claves: "stock minimo alerta aviso agotado bajo minimo notificacion reponer",
    pasos: [
      "Edita el producto en Productos y escribe su stock mínimo.",
      "Cuando el stock llegue a ese nivel, verás el aviso en la campana.",
      "En Reportes → Stock bajo mínimo tienes la lista completa.",
    ],
    consejos: ["Para saber cuánto pedir según lo que realmente vendes, mira Inteligencia o pregúntale a Novandra."],
    ir: { texto: "Ver bajo mínimo", a: "/reportes/stock-bajo-minimo" },
  },
  {
    id: "reportes",
    categoria: "Inventario",
    titulo: "Reportes de inventario y PDF",
    resumen: "Stock actual, por producto, bajo mínimo, entradas y salidas, e inventario valorado.",
    rutas: ["/reportes"],
    claves: "reporte reportes pdf imprimir inventario valorado stock actual kardex por producto informe",
    pasos: [
      "Ve a Reportes y elige el reporte en el menú.",
      "En los reportes por producto, elige el producto.",
      "Descarga el PDF para imprimirlo o compartirlo.",
    ],
    ir: { texto: "Ir a Reportes", a: "/reportes" },
  },

  // ------------------------------------------------------------ Compras y proveedores
  {
    id: "proveedores",
    categoria: "Compras y proveedores",
    titulo: "Registrar proveedores",
    resumen: "Guarda a quién le compras la mercancía.",
    rutas: ["/proveedores", "/compras"],
    claves: "proveedor proveedores distribuidor nit contacto a quien le compro",
    pasos: ["Ve a Proveedores y toca Nuevo proveedor.", "Escribe nombre, NIT, contacto, correo, teléfono y dirección.", "Guarda."],
    ir: { texto: "Ir a Proveedores", a: "/proveedores" },
  },
  {
    id: "ordenes-compra",
    categoria: "Compras y proveedores",
    titulo: "Hacer una orden de compra y recibir la mercancía",
    resumen: "Pide a tu proveedor y, al recibir, el inventario se actualiza solo.",
    rutas: ["/compras"],
    claves: "orden de compra pedido pedir proveedor recibir mercancia llego pedido comprar borrador enviada",
    pasos: [
      "Ve a Compras y toca Nueva orden de compra.",
      "Elige el proveedor y la bodega que recibe.",
      "Agrega los productos con su cantidad y costo unitario. Queda en borrador.",
      "Cuando se la envíes al proveedor, toca Marcar como enviada.",
      "Cuando llegue, toca Recibir mercancía: el stock sube y queda en el kardex.",
    ],
    consejos: ["Novandra puede prepararte borradores con lo que debes reponer; aparecen en Borradores de Novandra."],
    ir: { texto: "Ir a Compras", a: "/compras" },
  },

  // ------------------------------------------------------------ Clientes
  {
    id: "clientes",
    categoria: "Clientes",
    titulo: "Registrar clientes",
    resumen: "Guarda a tus clientes para facturarles y saber quién vuelve a comprar.",
    rutas: ["/clientes", "/ventas"],
    claves: "cliente clientes comprador registrar cliente documento cedula nit telefono whatsapp",
    pasos: [
      "Ve a Clientes y toca Nuevo cliente (o usa el + junto a Consumidor final en Vender).",
      "Escribe nombre, tipo y número de documento, correo, teléfono y dirección.",
      "Guarda. Ya lo puedes elegir al vender.",
    ],
    consejos: ["Con el teléfono guardado, la factura se envía por WhatsApp sin escribir el número."],
    ir: { texto: "Ir a Clientes", a: "/clientes" },
  },

  // ------------------------------------------------------------ Inteligencia y Novandra
  {
    id: "inteligencia",
    categoria: "Inteligencia y Novandra",
    titulo: "Entender la inteligencia de inventario",
    resumen: "Qué reponer, qué se detuvo y qué está quieto, según el ritmo propio de tu negocio.",
    rutas: ["/inteligencia"],
    claves: "inteligencia rotacion reponer agotamiento detenido sin movimiento sobrestock pronostico sugerido",
    pasos: [
      "Ve a Inteligencia y elige el periodo (por defecto 90 días) y la sucursal.",
      "Reponer ahora: lo que se agota en menos de una semana. Puedes crear una orden con los sugeridos.",
      "Dejaron de venderse: productos que se vendían con regularidad y pararon.",
      "Capital quieto y sobrestock: inventario que no rota.",
      "La tabla muestra cada producto con su velocidad, tendencia y cuánto te alcanza.",
    ],
    consejos: ["Cada producto se compara con su propio ritmo de venta, no con una regla fija."],
    ir: { texto: "Ir a Inteligencia", a: "/inteligencia" },
  },
  {
    id: "novandra",
    categoria: "Inteligencia y Novandra",
    titulo: "Usar a Novandra, tu asistente",
    resumen: "Pregúntale en tus palabras por ventas, reposición, stock y patrones de tu negocio.",
    rutas: [],
    claves: "novandra asistente ia inteligencia artificial preguntar chat ayuda bot",
    pasos: [
      "Toca Pregúntale a Novandra en la barra superior.",
      "Escribe tu pregunta, por ejemplo: ¿Qué debo reabastecer?, ¿Cómo voy hoy? o ¿Qué se vende junto?",
      "Usa los botones de la respuesta para seguir o para crear un borrador de orden.",
    ],
    consejos: [
      "Si no te entiende, te ofrece opciones; al elegir una, aprende esa forma de preguntar para tu empresa.",
      "Novandra solo crea borradores y recordatorios: tú confirmas cada cambio.",
    ],
  },
  {
    id: "permisos-novandra",
    categoria: "Inteligencia y Novandra",
    titulo: "Decidir qué puede hacer Novandra",
    resumen: "Permite o bloquea a Novandra para empleados, costos, órdenes, recordatorios y auditoría.",
    rutas: ["/configurar/novandra"],
    claves: "permisos novandra empleados costos bloquear limitar instrucciones reglas",
    pasos: [
      "Ve a Configuración → Permisos de Novandra.",
      "Activa o desactiva cada permiso.",
      "Opcional: escribe instrucciones de tu negocio que siempre debe respetar.",
      "Toca Guardar permisos.",
    ],
    ir: { texto: "Ir a Permisos de Novandra", a: "/configurar/novandra" },
    soloAdmin: true,
  },

  // ------------------------------------------------------------ Equipo y seguridad
  {
    id: "personal",
    categoria: "Equipo y seguridad",
    titulo: "Agregar personas a tu equipo y darles permisos",
    resumen: "Crea usuarios para tu equipo y elige a qué módulos pueden entrar.",
    rutas: ["/configurar/usuarios"],
    claves: "usuario usuarios empleado equipo personal permisos acceso invitar vendedor cajero administrador rol",
    pasos: [
      "Ve a Configuración → Personal y toca Nuevo usuario.",
      "Escribe el correo real de la persona (personal o de trabajo), su nombre y documento.",
      "Elige si es empleado o administrador y marca los módulos a los que puede entrar.",
      "Toca Enviar invitación. Le llega un correo de Stockly.",
      "La persona abre el correo, toca Aceptar invitación (así verifica su correo) y crea su propia contraseña.",
    ],
    consejos: [
      "Mientras no acepte, aparece como invitado. Desde Editar puedes reenviarle la invitación.",
      "Si olvida su contraseña, desde Editar le envías un enlace para crear una nueva; también puede cambiarla en Mi perfil.",
      "Tu plan define cuántos usuarios puedes tener.",
    ],
    ir: { texto: "Ir a Personal", a: "/configurar/usuarios" },
    soloAdmin: true,
  },
  {
    id: "auditoria",
    categoria: "Equipo y seguridad",
    titulo: "Revisar la auditoría del equipo",
    resumen: "Un registro inalterable de quién hizo qué, cuándo y dónde, con alertas.",
    rutas: ["/auditoria"],
    claves: "auditoria empleados vigilar control robo faltante sospechoso quien hizo movimientos alertas seguridad",
    pasos: [
      "Ve a Auditoría y elige el periodo.",
      "Arriba ves a cada persona con sus alertas; tócala para ver solo sus movimientos.",
      "Las alertas marcan movimientos eliminados, registros a nombre de otro, stock cambiado sin kardex y actividad fuera de horario.",
    ],
    consejos: ["Nadie puede editar ni borrar la auditoría, ni siquiera el dueño."],
    ir: { texto: "Ir a Auditoría", a: "/auditoria" },
    soloAdmin: true,
  },
  {
    id: "perfil-contrasena",
    categoria: "Equipo y seguridad",
    titulo: "Cambiar tus datos personales o tu contraseña",
    resumen: "Actualiza tu nombre, cédula, celular, dirección y contraseña.",
    rutas: ["/perfil"],
    claves: "perfil mis datos contrasena clave cambiar contraseña nombre celular cuenta",
    pasos: [
      "Toca tu nombre en la parte de abajo del menú lateral (Mi perfil).",
      "Edita tus datos personales y guarda.",
      "En Cambiar contraseña, escribe la nueva dos veces (mínimo 8 caracteres con letras y números).",
    ],
    ir: { texto: "Ir a Mi perfil", a: "/perfil" },
  },
  {
    id: "olvide-contrasena",
    categoria: "Equipo y seguridad",
    titulo: "Recuperar el acceso si olvidaste la contraseña",
    resumen: "Te enviamos un enlace al correo para crear una nueva.",
    rutas: [],
    claves: "olvide contrasena recuperar clave no puedo entrar restablecer acceso",
    pasos: [
      "En la pantalla de ingreso, toca ¿Olvidaste tu contraseña?",
      "Escribe tu correo y revisa tu bandeja (y la de spam).",
      "Abre el enlace y crea tu nueva contraseña.",
    ],
  },

  // ------------------------------------------------------------ Cuenta, plan y datos
  {
    id: "plan",
    categoria: "Cuenta, plan y datos",
    titulo: "Ver tu plan y cambiarlo",
    resumen: "Límites de tu plan, cuánto has usado este mes y cómo mejorar.",
    rutas: ["/configurar/plan"],
    claves: "plan suscripcion limite mejorar plan pro enterprise empresa precio pagar cuota cambiar plan prueba renovar wompi descuento",
    pasos: [
      "Ve a Configuración → Plan y suscripción.",
      "Revisa tu estado: días de prueba que te quedan o hasta cuándo está pagado tu plan.",
      "Elige el ciclo (mensual o anual, con 2 meses gratis) y toca Comprar Pro o Comprar Enterprise.",
      "Paga en Wompi con tarjeta, PSE, Nequi o Bancolombia. Al volver, tu plan queda activo.",
    ],
    consejos: [
      "Tu primera compra tiene 50% de descuento. El precio que ves es el precio final, sin cargos adicionales.",
      "El plan no se cobra solo: antes de vencer te avisamos para renovar. Si no renuevas, pasas a Básico sin perder datos.",
    ],
    ir: { texto: "Ir a Plan", a: "/configurar/plan" },
    soloAdmin: true,
  },
  {
    id: "complementos",
    categoria: "Cuenta, plan y datos",
    titulo: "Agregar usuarios, sedes o productos sin cambiar de plan",
    resumen: "Compra solo la capacidad adicional que necesitas cuando llegas a un tope.",
    rutas: ["/configurar/plan"],
    claves: "complemento adicional extra agregar usuario sede bodega productos ventas clientes archivos tope limite licencia comprar mas",
    pasos: [
      "Ve a Configuración → Plan y suscripción y baja hasta Complementos.",
      "Elige el complemento (por ejemplo, Usuario adicional) y la cantidad con los botones − y +.",
      "Toca Agregar: verás el precio por los días que le quedan a tu plan.",
      "Paga en Wompi. El complemento queda activo apenas se confirme el pago.",
    ],
    consejos: [
      "Están disponibles con un plan Pro o Enterprise pagado y vencen junto con tu plan.",
      "Al renovar tu plan puedes renovar también tus complementos en el mismo pago.",
      "Si necesitas muchos complementos, compara con el plan siguiente: puede salirte más barato.",
    ],
    ir: { texto: "Ir a Complementos", a: "/configurar/plan" },
    soloAdmin: true,
  },
  {
    id: "exportar",
    categoria: "Cuenta, plan y datos",
    titulo: "Descargar una copia de tus datos",
    resumen: "Toda tu información en un Excel que puedes editar y volver a subir.",
    rutas: ["/configurar/datos"],
    claves: "exportar copia respaldo backup descargar excel datos",
    pasos: ["Ve a Configuración → Importar y exportar.", "Toca Exportar a Excel."],
    consejos: ["Incluye empresa, catálogos, productos con su stock, inventario por bodega, contactos e historial de ventas."],
    ir: { texto: "Ir a Importar y exportar", a: "/configurar/datos" },
    soloAdmin: true,
  },
  {
    id: "eliminar-datos",
    categoria: "Cuenta, plan y datos",
    titulo: "Eliminar datos de tu empresa",
    resumen: "Borra ventas, inventario u otros datos con verificación por correo.",
    rutas: ["/configurar/datos"],
    claves: "eliminar borrar datos limpiar reiniciar empezar de cero resetear empresa",
    pasos: [
      "Ve a Configuración → Importar y exportar → Zona de peligro.",
      "Toca Eliminar datos y elige qué borrar.",
      "Escribe el nombre exacto de tu empresa.",
      "Escribe el código que llega a tu correo y confirma.",
    ],
    consejos: ["Descarga una copia antes: no se puede deshacer. Nunca se borran tu cuenta, tu equipo, la configuración ni la auditoría."],
    ir: { texto: "Ir a Importar y exportar", a: "/configurar/datos" },
    soloAdmin: true,
  },
  {
    id: "notificaciones",
    categoria: "Cuenta, plan y datos",
    titulo: "Notificaciones",
    resumen: "Ventas, alertas de stock, compras recibidas y sugerencias de Novandra.",
    rutas: ["/notificaciones"],
    claves: "notificaciones campana avisos alertas leidas",
    pasos: [
      "Toca la campana para ver las últimas.",
      "Toca una notificación para ir a lo que trata.",
      "Usa Marcar todas como leídas para limpiar el contador.",
    ],
    ir: { texto: "Ver notificaciones", a: "/notificaciones" },
  },
  {
    id: "modo-oscuro",
    categoria: "Cuenta, plan y datos",
    titulo: "Cambiar a modo oscuro",
    resumen: "Elige el tema claro u oscuro de la app.",
    rutas: [],
    claves: "modo oscuro tema claro oscuro noche colores apariencia",
    pasos: ["En la parte de abajo del menú lateral, usa el interruptor de tema."],
  },
];

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bbre b\b/g, "breb")
    .trim();

const VACIAS = new Set("a al como con de del el en la las lo los mi mis me para por que se su un una y o es hay puedo hago hacer donde cual".split(" "));

// Busca guías por palabras (sin tildes, con raíces parecidas). Devuelve las más relevantes primero.
export function buscarGuias(texto, guias = GUIAS) {
  const q = normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 1 && !VACIAS.has(p));
  if (!q.length) return [];
  const raiz = (p) => p.slice(0, Math.max(4, p.length - 2));
  const textos = guias.map((g) => ({
    g,
    titulo: normalizar(g.titulo),
    claves: normalizar(g.claves),
    cuerpo: normalizar([g.resumen, ...(g.pasos ?? []), ...(g.consejos ?? [])].join(" ")),
  }));
  // Las palabras que aparecen en pocas guías ("abono") pesan más que las comunes ("registrar").
  const peso = Object.fromEntries(
    q.map((p) => {
      const r = raiz(p);
      const df = textos.filter((t) => t.titulo.includes(r) || t.claves.includes(r) || t.cuerpo.includes(r)).length;
      return [p, df ? Math.log(1 + guias.length / df) : 0];
    })
  );
  return textos
    .map(({ g, titulo, claves, cuerpo }) => {
      let puntaje = 0;
      for (const p of q) {
        const r = raiz(p);
        let base = 0;
        if (titulo.includes(r)) base += 3;
        if (claves.includes(r)) base += 2;
        if (cuerpo.includes(r)) base += 0.5;
        puntaje += base * peso[p];
      }
      return { g, puntaje: puntaje / Math.sqrt(q.length) };
    })
    .filter((x) => x.puntaje >= 2)
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((x) => x.g);
}

// Guías relevantes para la pantalla actual.
export const guiasDeRuta = (ruta, guias = GUIAS) =>
  guias.filter((g) => g.rutas?.some((r) => (r === "/" ? ruta === "/" : ruta === r || ruta.startsWith(`${r}/`))));
