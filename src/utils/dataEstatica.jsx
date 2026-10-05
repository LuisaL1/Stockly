import { v } from "../styles/variables";
import { MODULOS } from "./permisos";

// Navegación lateral agrupada por área de trabajo.
export const NavGrupos = [
  {
    titulo: "General",
    enlaces: [
      { label: "Inicio", icon: <v.iconoinicio />, to: "/" },
      { label: "Inteligencia", icon: <v.iconointeligencia />, to: "/inteligencia" },
    ],
  },
  {
    titulo: "Operación",
    enlaces: [
      { label: "Vender", icon: <v.iconoventas />, to: "/ventas" },
      { label: "Facturas", icon: <v.iconofacturas />, to: "/ventas/facturas" },
      { label: "Compras", icon: <v.iconocompras />, to: "/compras" },
      { label: "Kardex", icon: <v.iconokardex />, to: "/kardex" },
      { label: "Informe contable", icon: <v.iconoexcel />, to: "/informe-contable", soloAdmin: true },
    ],
  },
  {
    titulo: "Inventario",
    enlaces: [
      { label: "Productos", icon: <v.iconostock />, to: "/configurar/productos" },
      { label: "Sucursales", icon: <v.iconosucursales />, to: "/sucursales" },
      { label: "Bodegas", icon: <v.iconobodegas />, to: "/bodegas" },
      { label: "Reportes", icon: <v.iconoreportes />, to: "/reportes" },
    ],
  },
  {
    titulo: "Contactos",
    enlaces: [
      { label: "Clientes", icon: <v.iconoclientes />, to: "/clientes" },
      { label: "Proveedores", icon: <v.iconoproveedores />, to: "/proveedores" },
    ],
  },
  {
    titulo: "Ajustes",
    enlaces: [
      { label: "Auditoría", icon: <v.iconoauditoria />, to: "/auditoria", soloAdmin: true },
      { label: "Notificaciones", icon: <v.icononotificaciones />, to: "/notificaciones" },
      { label: "Configuración", icon: <v.iconoconfiguracion />, to: "/configurar" },
      { label: "Centro de ayuda", icon: <v.iconoguia />, to: "/ayuda" },
    ],
  },
];

// Tarjetas de la página de configuración. "modulo" debe coincidir con la tabla "modulos".
export const DataModulosConfiguracion = [
  {
    title: "Plan y suscripción",
    subtitle: "Tu plan, límites de uso y cambio de plan",
    icono: <v.iconoplan />,
    link: "/configurar/plan",
    modulo: MODULOS.suscripcion,
    destacado: true,
  },
  {
    title: "Importar y exportar",
    subtitle: "Carga, descarga o elimina los datos de tu negocio",
    icono: <v.iconoexcel />,
    link: "/configurar/datos",
    soloAdmin: true,
  },
  {
    title: "Permisos de Novandra",
    subtitle: "Qué puede hacer tu asistente y quién puede usarla",
    icono: <v.icononovandra />,
    link: "/configurar/novandra",
    soloAdmin: true,
  },
  {
    title: "Facturación",
    subtitle: "Numeración, impuestos y factura electrónica DIAN",
    icono: <v.iconofacturas />,
    link: "/configurar/facturacion",
    modulo: MODULOS.facturacion,
  },
  {
    title: "Productos",
    subtitle: "Registra tus productos, precios y stock mínimo",
    icono: <v.iconostock />,
    link: "/configurar/productos",
    modulo: MODULOS.productos,
  },
  {
    title: "Personal",
    subtitle: "Gestiona tu equipo y sus permisos",
    icono: <v.iconoUsuarios />,
    link: "/configurar/usuarios",
    modulo: MODULOS.personal,
  },
  {
    title: "Tu empresa",
    subtitle: "Nombre y moneda de tu negocio",
    icono: <v.iconoempresa />,
    link: "/configurar/empresa",
    modulo: MODULOS.empresa,
  },
  {
    title: "Categorías",
    subtitle: "Agrupa tus productos por categoría",
    icono: <v.iconocategorias />,
    link: "/configurar/categorias",
    modulo: MODULOS.categorias,
  },
  {
    title: "Marcas",
    subtitle: "Gestiona las marcas de tus productos",
    icono: <v.iconomarca />,
    link: "/configurar/marca",
    modulo: MODULOS.marcas,
  },
];

export const TipouserData = [
  { id: "empleado", descripcion: "empleado", icono: <v.iconoUser /> },
  { id: "administrador", descripcion: "administrador", icono: <v.iconoplan /> },
];

export const TiposBodega = {
  principal: { etiqueta: "Principal", icono: v.iconobodegas },
  punto_venta: { etiqueta: "Punto de venta", icono: v.iconotienda },
  ecommerce: { etiqueta: "E-commerce", icono: v.iconoonline },
  satelite: { etiqueta: "Satélite", icono: v.iconosatelite },
};

// Medios de pago en el punto de venta. "tarjeta" y "mixto" solo se muestran en ventas registradas.
export const MetodosPago = [
  { id: "efectivo", descripcion: "Efectivo", icono: v.iconoefectivo },
  { id: "datafono", descripcion: "Datáfono", icono: v.iconotarjeta },
  { id: "bre_b", descripcion: "Bre-B", icono: v.iconobreb },
  { id: "nequi_qr", descripcion: "Nequi QR", icono: v.iconocodigobarras },
  { id: "nequi", descripcion: "Nequi", icono: v.iconocelular },
  { id: "daviplata", descripcion: "Daviplata", icono: v.iconocelular },
  { id: "link_pago", descripcion: "Link de pago", icono: v.iconoenviar },
  { id: "credito", descripcion: "Crédito", icono: v.iconofecha },
];

export const NombresMetodo = {
  ...Object.fromEntries(MetodosPago.map((m) => [m.id, m.descripcion])),
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Pago mixto",
};

// Tipos de llave Bre-B (sistema de pagos inmediatos del Banco de la República).
export const TiposLlaveBreB = [
  { id: "celular", descripcion: "Celular", placeholder: "3001234567" },
  { id: "documento", descripcion: "Cédula o NIT", placeholder: "900123456" },
  { id: "correo", descripcion: "Correo", placeholder: "pagos@minegocio.com" },
  { id: "alfanumerica", descripcion: "Alfanumérica", placeholder: "@minegocio" },
  { id: "comercio", descripcion: "Llave de comercio", placeholder: "0012345678" },
];

export const Franquicias = ["Visa", "Mastercard", "American Express", "Diners", "Débito Maestro", "Otra"];

export const Bancos = ["Bancolombia", "Davivienda", "Banco de Bogotá", "BBVA", "Banco de Occidente", "Banco Popular", "Banco Caja Social", "Nequi", "Daviplata", "Otro"];

export const Canales = [
  { id: "mostrador", descripcion: "Mostrador" },
  { id: "online", descripcion: "Tienda online" },
  { id: "telefono", descripcion: "Teléfono / WhatsApp" },
  { id: "otro", descripcion: "Otro" },
];

export const TiposDocumento = [
  { id: "CC", descripcion: "Cédula de ciudadanía" },
  { id: "NIT", descripcion: "NIT" },
  { id: "CE", descripcion: "Cédula de extranjería" },
  { id: "PAS", descripcion: "Pasaporte" },
  { id: "TI", descripcion: "Tarjeta de identidad" },
];

export const Sectores = [
  "Moda y accesorios",
  "Alimentos y bebidas",
  "Tecnología",
  "Ferretería y construcción",
  "Salud y belleza",
  "Hogar y decoración",
  "Papelería y oficina",
  "Mascotas",
  "Distribución mayorista",
  "Otro",
];

// Por ahora Stockly opera solo en pesos colombianos; las demás monedas se muestran como próximamente.
export const Monedas = [
  { id: "$", descripcion: "Peso colombiano (COP $)", disponible: true },
  { id: "US$", descripcion: "Dólar (US$)" },
  { id: "€", descripcion: "Euro (€)" },
  { id: "MX$", descripcion: "Peso mexicano (MX$)" },
  { id: "S/", descripcion: "Sol peruano (S/)" },
];
export const MONEDA_PREDETERMINADA = "$";
