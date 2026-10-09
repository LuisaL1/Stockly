// Contenido de la página pública de Stockly (appstockly.com).
// Una sola fuente para la página (Landing.jsx), el HTML prerenderizado que lee Google
// y los datos estructurados (JSON-LD). Si cambian los precios o los topes de los planes
// en la base de datos, actualízalos también aquí.

export const SITIO = {
  url: "https://appstockly.com",
  nombre: "Stockly",
  empresa: "MCCore",
  empresaUrl: "https://www.mccore.com.co",
  correo: "equipo@appstockly.com",
  ciudad: "Quimbaya, Quindío",
  titulo: "Stockly | Software de inventario, ventas y facturación para negocios en Colombia",
  descripcion:
    "Controla tu inventario, vende rápido y factura desde un solo lugar. Punto de venta, varias bodegas, cobros con Bre-B y Wompi, y asistente inteligente. Empieza gratis.",
};

export const HERO = {
  etiqueta: "Software para negocios en Colombia",
  titulo: "Inventario, ventas y facturación en un solo lugar",
  texto:
    "Stockly es el programa en la nube para tiendas, distribuidoras y emprendimientos que quieren vender más rápido, saber exactamente qué tienen en bodega y dejar los cuadernos y las hojas de Excel. Funciona en el computador, la tablet y el celular.",
  ctaPrincipal: { texto: "Crear mi empresa gratis", href: "/login?registro=1" },
  ctaSecundario: { texto: "Ver planes", href: "#planes" },
  notas: ["Plan gratis para siempre", "Prueba Enterprise 7 días sin costo", "Sin tarjeta para empezar"],
};

export const FUNCIONES = [
  {
    titulo: "Punto de venta rápido",
    texto:
      "Cobra en segundos en efectivo con cálculo del cambio, tarjeta, Bre-B, transferencia o link de pago con Wompi. Acepta pagos mixtos y ventas a crédito.",
  },
  {
    titulo: "Control de inventario",
    texto:
      "Productos con código de barras, categorías, marcas y stock mínimo. Alertas cuando algo se está acabando y kardex automático de cada entrada y salida.",
  },
  {
    titulo: "Varias bodegas y sedes",
    texto: "Maneja el stock de cada tienda, bodega o tienda online por separado y traslada mercancía entre ellas.",
  },
  {
    titulo: "Facturas en PDF por WhatsApp",
    texto: "Cada venta genera su factura con tu logo. Envíala por WhatsApp con el link de pago y Stockly la marca pagada sola.",
  },
  {
    titulo: "Compras y proveedores",
    texto: "Órdenes de compra que suman el stock al recibir, con la factura del proveedor adjunta (PDF o XML).",
  },
  {
    titulo: "Informe para tu contador",
    texto: "Envía por correo el informe general o detallado del periodo en Excel, con las facturas de tus proveedores.",
  },
  {
    titulo: "Inteligencia de inventario",
    texto: "Rotación de productos, días de cobertura y productos más vendidos, calculados con el ritmo real de tu negocio.",
  },
  {
    titulo: "Novandra, tu asistente",
    texto:
      "Pregúntale cuánto vendiste o qué se está agotando. Aprende cómo habla tu negocio y prepara borradores de órdenes de compra.",
  },
  {
    titulo: "Equipo con permisos",
    texto: "Invita a tu equipo con su propio correo y decide qué puede ver y hacer cada persona. Auditoría de cada cambio.",
  },
];

export const PASOS = [
  { titulo: "Crea tu empresa", texto: "Regístrate gratis en minutos con tu correo." },
  { titulo: "Sube tus productos", texto: "Cárgalos uno a uno o todos de una vez con la plantilla de Excel." },
  { titulo: "Empieza a vender", texto: "Cobra desde la caja y mira tu inventario actualizarse solo." },
];

export const PLANES = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 0,
    detalle: "Para empezar a ordenar tu inventario y hacer tus primeras ventas.",
    incluye: ["1.000 productos", "300 ventas al mes", "1 bodega y 1 sede", "2 usuarios", "Facturas en PDF", "Novandra esencial"],
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: 69900,
    precioAnual: 699000,
    destacado: true,
    detalle: "Para tiendas con ventas todos los días, varias bodegas y un equipo pequeño.",
    incluye: ["5.000 productos", "5.000 ventas al mes", "5 bodegas y 3 sedes", "5 usuarios", "Informe contable e inteligencia", "Auditoría"],
  },
  {
    id: "empresa",
    nombre: "Enterprise",
    precio: 189900,
    precioAnual: 1899000,
    detalle: "Para negocios grandes con varias sedes, mucho movimiento y equipos amplios.",
    incluye: ["50.000 productos", "30.000 ventas al mes", "30 bodegas y 15 sedes", "20 usuarios", "Todo lo de Pro", "Prueba gratis 7 días"],
  },
];

export const FAQ = [
  {
    p: "¿Stockly es gratis?",
    r: "Sí. El plan Básico es gratis para siempre e incluye inventario, punto de venta y facturas en PDF. Los planes Pro y Enterprise agregan más capacidad y funciones.",
  },
  {
    p: "¿Necesito tarjeta para empezar?",
    r: "No. Creas tu empresa gratis sin tarjeta. Solo la prueba de Enterprise pide registrar un medio de pago para validarlo, sin cobrar nada.",
  },
  {
    p: "¿Me cobran automáticamente?",
    r: "No. Stockly no hace cobros automáticos. Antes de que venza tu plan te avisamos y tú decides si renuevas.",
  },
  {
    p: "¿Qué pasa con mis datos si dejo de pagar?",
    r: "Pasas al plan Básico gratis y conservas toda tu información. Nada se borra.",
  },
  {
    p: "¿Cómo me pagan mis clientes?",
    r: "En efectivo, tarjeta, transferencia, Bre-B desde cualquier banco o con un link de pago de Wompi (tarjeta, PSE o Nequi) que envías por WhatsApp.",
  },
  {
    p: "¿Funciona en el celular?",
    r: "Sí. Stockly funciona en el navegador del computador, la tablet y el celular, sin instalar nada.",
  },
  {
    p: "¿Stockly hace factura electrónica DIAN?",
    r: "Hoy Stockly genera facturas en PDF con tu logo. La factura electrónica DIAN llegará próximamente a los planes Pro y Enterprise.",
  },
];

export const cop = (n) => "$" + Number(n).toLocaleString("es-CO").replace(/,/g, ".");

// Datos estructurados para Google (schema.org).
export function datosEstructurados() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITIO.empresa,
      url: SITIO.empresaUrl,
      email: SITIO.correo,
      logo: `${SITIO.url}/favicon.png`,
      address: { "@type": "PostalAddress", addressLocality: "Quimbaya", addressRegion: "Quindío", addressCountry: "CO" },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITIO.nombre,
      url: SITIO.url,
      description: SITIO.descripcion,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS, Windows, macOS",
      inLanguage: "es-CO",
      publisher: { "@type": "Organization", name: SITIO.empresa, url: SITIO.empresaUrl },
      offers: PLANES.map((p) => ({
        "@type": "Offer",
        name: `Plan ${p.nombre}`,
        price: String(p.precio),
        priceCurrency: "COP",
        ...(p.precio ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.precio, priceCurrency: "COP", unitText: "MONTH" } } : {}),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })),
    },
  ];
}
