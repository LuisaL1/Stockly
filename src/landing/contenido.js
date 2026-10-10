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
  titulo: "Stockly | Inventario, ventas y facturación para negocios en Colombia",
  descripcion:
    "Tu inventario, por fin en orden. Punto de venta, bodegas, facturas por WhatsApp, cobros con Bre-B y Wompi, y Novandra, tu asistente. Sin cuadernos. Sin Excel. Empieza gratis.",
};

export const HERO = {
  etiqueta: "Hecho en Colombia para tu negocio",
  titulo: "Tu inventario, por fin en orden.",
  texto: "Inventario, ventas y facturas en un solo lugar. Sin cuadernos. Sin Excel. Sin complicaciones. Desde el computador, la tablet o el celular.",
  ctaPrincipal: { texto: "Empezar gratis", href: "/login?registro=1" },
  ctaSecundario: { texto: "Ver planes", href: "#planes" },
};

export const FUNCIONES = [
  { titulo: "Caja ágil", texto: "Cobra en segundos. Efectivo, tarjeta, Bre-B o link de pago. Pago mixto y crédito, si lo necesitas." },
  { titulo: "Inventario al día", texto: "Productos, códigos de barras y stock mínimo. Te avisamos antes de que algo se agote." },
  { titulo: "Bodegas y sedes", texto: "Cada tienda con su stock. Traslada mercancía y todo se actualiza solo." },
  { titulo: "Facturas por WhatsApp", texto: "Con tu logo, en PDF y con el link de pago. Cuando el cliente paga, la factura se marca sola." },
  { titulo: "Compras sin enredos", texto: "Haz la orden, recibe la mercancía y el inventario se suma. La factura del proveedor queda guardada." },
  { titulo: "Listo para tu contador", texto: "El informe del mes, en Excel, en un clic. General o al detalle." },
  { titulo: "Inteligencia de inventario", texto: "Qué rota, qué está quieto y para cuántos días te alcanza. Con el ritmo real de tu negocio." },
  { titulo: "Novandra, tu asistente", texto: "Pregúntale a tu negocio. Te responde, y deja las órdenes de compra listas. Tú solo apruebas." },
  { titulo: "Tu equipo, con permisos", texto: "Cada persona entra con su correo y ve solo lo suyo. Y queda registro de cada cambio." },
];

export const PASOS = [
  { titulo: "Crea tu empresa", texto: "Con tu correo. Gratis y en un minuto." },
  { titulo: "Sube tus productos", texto: "Uno a uno o todos de una vez, desde Excel." },
  { titulo: "Empieza a vender", texto: "Cobra desde la caja. El inventario se cuida solo." },
];

export const PLANES = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 0,
    detalle: "Para empezar a ordenar tu negocio. Hoy mismo.",
    incluye: ["1.000 productos", "300 ventas al mes", "1 bodega y 1 sede", "2 usuarios", "Facturas en PDF", "Novandra esencial"],
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: 69900,
    precioAnual: 699000,
    destacado: true,
    detalle: "Para tiendas que venden todos los días y crecen.",
    incluye: ["5.000 productos", "5.000 ventas al mes", "5 bodegas y 3 sedes", "5 usuarios", "Informe contable e inteligencia", "Auditoría"],
  },
  {
    id: "empresa",
    nombre: "Enterprise",
    precio: 189900,
    precioAnual: 1899000,
    detalle: "Para negocios con varias sedes y equipos grandes.",
    incluye: ["50.000 productos", "30.000 ventas al mes", "30 bodegas y 15 sedes", "20 usuarios", "Todo lo de Pro", "Prueba gratis 7 días"],
  },
];

export const FAQ = [
  { p: "¿Stockly es gratis?", r: "Sí. El plan Básico es gratis para siempre: inventario, caja y facturas en PDF. Pro y Enterprise agregan más capacidad y funciones." },
  { p: "¿Necesito tarjeta para empezar?", r: "No. Creas tu empresa y listo. Solo la prueba de Enterprise pide un medio de pago, y no se cobra nada." },
  { p: "¿Me cobran automáticamente?", r: "Nunca. Antes de que venza tu plan te avisamos. Tú decides si renuevas." },
  { p: "¿Qué pasa con mis datos si dejo de pagar?", r: "Pasas al plan Básico y conservas todo. Nada se borra." },
  { p: "¿Cómo me pagan mis clientes?", r: "Como ellos quieran: efectivo, tarjeta, transferencia, Bre-B o un link de pago que envías por WhatsApp." },
  { p: "¿Funciona en el celular?", r: "Sí. En el navegador del computador, la tablet o el celular. Sin instalar nada." },
  { p: "¿Hace factura electrónica DIAN?", r: "Hoy genera facturas en PDF con tu logo. La factura electrónica llegará pronto a Pro y Enterprise." },
];

export const cop = (n) => "$" + Number(n).toLocaleString("es-CO").replace(/,/g, ".");

// Datos estructurados para Google (schema.org).
export function datosEstructurados() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITIO.nombre,
      alternateName: ["Stockly Colombia", "appstockly", "Stockly app"],
      url: SITIO.url,
      inLanguage: "es-CO",
      publisher: { "@type": "Organization", name: SITIO.empresa, url: SITIO.empresaUrl },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITIO.empresa,
      url: SITIO.empresaUrl,
      email: SITIO.correo,
      logo: `${SITIO.url}/favicon-512.png`,
      address: { "@type": "PostalAddress", addressLocality: "Quimbaya", addressRegion: "Quindío", addressCountry: "CO" },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITIO.nombre,
      alternateName: "Stockly Colombia",
      url: SITIO.url,
      image: `${SITIO.url}/og-stockly.png`,
      screenshot: `${SITIO.url}/og-stockly.png`,
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
