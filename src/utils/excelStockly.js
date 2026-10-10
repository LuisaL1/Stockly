// Lectura y escritura del Excel de Stockly (plantilla, exportación e importación).
// La librería xlsx se carga solo cuando se usa.
import { COLORES_CATEGORIA } from "./coloresCategoria.js";

const cargarXLSX = () => import("xlsx");

// Normaliza textos para comparar encabezados y valores: sin tildes, minúsculas, sin símbolos.
export const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const TIPOS_BODEGA = {
  principal: "principal",
  "punto de venta": "punto_venta",
  "punto venta": "punto_venta",
  pdv: "punto_venta",
  tienda: "punto_venta",
  local: "punto_venta",
  ecommerce: "ecommerce",
  "e commerce": "ecommerce",
  online: "ecommerce",
  "tienda online": "ecommerce",
  satelite: "satelite",
  bodega: "satelite",
  almacen: "satelite",
};
const NOMBRE_TIPO_BODEGA = { principal: "Principal", punto_venta: "Punto de venta", ecommerce: "E-commerce", satelite: "Satélite" };

const TIPOS_DOCUMENTO = {
  cc: "CC",
  cedula: "CC",
  "cedula de ciudadania": "CC",
  nit: "NIT",
  ce: "CE",
  "cedula de extranjeria": "CE",
  pas: "PAS",
  pasaporte: "PAS",
  ti: "TI",
  "tarjeta de identidad": "TI",
};

const TIPOS_LLAVE = {
  celular: "celular",
  telefono: "celular",
  documento: "documento",
  cedula: "documento",
  "cedula o nit": "documento",
  nit: "documento",
  correo: "correo",
  email: "correo",
  alfanumerica: "alfanumerica",
  "llave de comercio": "comercio",
  comercio: "comercio",
};
// Color de categoría: se escribe el nombre ("Azul"); también se acepta un código #RRGGBB.
const LISTA_COLORES = COLORES_CATEGORIA.map((c) => c.nombre).join(", ");
const COLORES = Object.fromEntries(COLORES_CATEGORIA.map((c) => [normalizar(c.nombre), c.hex]));
const NOMBRE_COLOR = Object.fromEntries(COLORES_CATEGORIA.map((c) => [c.hex.toLowerCase(), c.nombre]));

const NOMBRE_TIPO_LLAVE = {
  celular: "Celular",
  documento: "Cédula o NIT",
  correo: "Correo",
  alfanumerica: "Alfanumérica",
  comercio: "Llave de comercio",
};

// Columnas de cada hoja. alias: otros encabezados que también se reconocen.
// tipo: texto | numero | entero | lista (con "valores": texto normalizado → valor guardado).
export const HOJAS = [
  {
    clave: "categorias",
    hoja: "Categorías",
    alias: ["categoria", "categorias"],
    descripcion: "Grupos para ordenar tus productos.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Lociones", alias: ["categoria", "descripcion"] },
      { clave: "color", titulo: "Color", tipo: "color", ejemplo: "Azul", ayuda: `Opcional. Escribe uno: ${LISTA_COLORES}. Vacío = Azul.` },
    ],
  },
  {
    clave: "marcas",
    hoja: "Marcas",
    alias: ["marca", "marcas"],
    descripcion: "Marcas de tus productos.",
    columnas: [{ clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Nativa", alias: ["marca", "descripcion"] }],
  },
  {
    clave: "sucursales",
    hoja: "Sucursales",
    alias: ["sucursal", "sucursales", "sedes", "sede"],
    descripcion: "Sedes del negocio. Tu plan define cuántas puedes tener.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Sede Norte", alias: ["sede", "sucursal"] },
      { clave: "ciudad", titulo: "Ciudad", ejemplo: "Armenia" },
      { clave: "direccion", titulo: "Dirección", ejemplo: "Cra. 14 #20-30" },
      { clave: "telefono", titulo: "Teléfono", ejemplo: "3001234567", alias: ["celular"] },
      { clave: "responsable", titulo: "Responsable", ejemplo: "Laura Gómez", alias: ["encargado"] },
    ],
  },
  {
    clave: "bodegas",
    hoja: "Bodegas",
    alias: ["bodega", "bodegas", "almacenes"],
    descripcion: "Lugares donde guardas inventario. La fila de tipo Principal renombra tu bodega principal.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Local centro", alias: ["bodega"] },
      {
        clave: "tipo",
        titulo: "Tipo",
        tipo: "lista",
        valores: TIPOS_BODEGA,
        ejemplo: "Punto de venta",
        ayuda: "Principal, Punto de venta, E-commerce o Satélite. Vacío = Satélite.",
      },
      { clave: "sucursal", titulo: "Sucursal", ejemplo: "Sede Norte", ayuda: "Debe existir o estar en la hoja Sucursales.", alias: ["sede"] },
      { clave: "direccion", titulo: "Dirección", ejemplo: "Cl. 10 #5-20" },
      { clave: "responsable", titulo: "Responsable", ejemplo: "Carlos Ruiz", alias: ["encargado"] },
    ],
  },
  {
    clave: "productos",
    hoja: "Productos",
    alias: ["producto", "productos", "inventario de productos", "articulos", "items", "catalogo"],
    descripcion: "Tu catálogo. Si el producto ya existe (mismo código o nombre) se actualiza.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Loción Brisa 120 ml", alias: ["producto", "descripcion", "articulo", "nombre del producto"] },
      { clave: "codigo_interno", titulo: "Código interno", ejemplo: "LOC-001", alias: ["codigo", "referencia", "ref", "sku"] },
      { clave: "codigo_barras", titulo: "Código de barras", ejemplo: "7701234567890", alias: ["ean", "codigo barras", "barras"], ayuda: "Solo números." },
      { clave: "categoria", titulo: "Categoría", ejemplo: "Lociones", ayuda: "Si no existe, se crea." },
      { clave: "marca", titulo: "Marca", ejemplo: "Nativa", ayuda: "Si no existe, se crea." },
      { clave: "unidad", titulo: "Unidad de medida", ejemplo: "und", alias: ["unidad", "medida", "um"], ayuda: "Cómo cuentas el stock: und, par, docena, g, kg, lb, ml, l, galon, cm, m, m2. Vacío = la predeterminada de tu empresa." },
      { clave: "presentacion", titulo: "Presentación", ejemplo: "frasco", alias: ["presentacion", "envase", "empaque"], ayuda: "Opcional, para lo que se cuenta por piezas: frasco, botella, caja, paquete, bolsa, sobre, lata, tarro, tubo, blister, rollo, bulto, kit." },
      { clave: "contenido", titulo: "Contenido", ejemplo: "100 ml", alias: ["contenido neto", "tamaño", "capacidad"], ayuda: "Opcional: lo que trae cada presentación, con su medida (100 ml, 500 g, 12 und)." },
      { clave: "precio_compra", titulo: "Precio de compra", tipo: "numero", ejemplo: 20000, alias: ["costo", "precio compra", "costo unitario"] },
      { clave: "precio_venta", titulo: "Precio de venta", tipo: "numero", ejemplo: 45000, alias: ["precio", "precio venta", "pvp", "valor"] },
      { clave: "stock_minimo", titulo: "Stock mínimo", tipo: "numero", ejemplo: 5, alias: ["minimo", "stock min"] },
      {
        clave: "stock",
        titulo: "Stock bodega principal",
        tipo: "numero",
        ejemplo: 30,
        alias: ["stock", "existencias", "cantidad", "unidades", "stock actual", "stock inicial"],
        ayuda: "Cantidad que debe quedar en la bodega principal. Vacío = no cambia.",
      },
    ],
  },
  {
    clave: "inventario",
    hoja: "Inventario por bodega",
    alias: ["inventario", "inventario por bodega", "stock por bodega", "existencias por bodega"],
    descripcion: "Cantidades en bodegas distintas a la principal.",
    columnas: [
      { clave: "producto", titulo: "Producto", requerido: true, ejemplo: "LOC-001", ayuda: "Código interno, código de barras o nombre.", alias: ["codigo", "nombre"] },
      { clave: "bodega", titulo: "Bodega", requerido: true, ejemplo: "Local centro" },
      { clave: "cantidad", titulo: "Cantidad", requerido: true, tipo: "numero", ejemplo: 8, alias: ["stock", "existencias", "unidades"] },
    ],
  },
  {
    clave: "clientes",
    hoja: "Clientes",
    alias: ["cliente", "clientes"],
    descripcion: "Se reconocen por tipo y número de documento.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Ana Pérez", alias: ["cliente", "razon social", "nombre completo"] },
      {
        clave: "tipo_documento",
        titulo: "Tipo de documento",
        tipo: "lista",
        valores: TIPOS_DOCUMENTO,
        ejemplo: "CC",
        ayuda: "CC, NIT, CE, PAS o TI. Vacío = CC.",
        alias: ["tipo doc", "tipo"],
      },
      { clave: "documento", titulo: "Documento", ejemplo: "1094123456", alias: ["numero de documento", "cedula", "nit", "identificacion"] },
      { clave: "email", titulo: "Correo", ejemplo: "ana@correo.co", alias: ["email", "correo electronico", "e mail"] },
      { clave: "telefono", titulo: "Teléfono", ejemplo: "3001234567", alias: ["celular", "whatsapp", "movil"] },
      { clave: "direccion", titulo: "Dirección", ejemplo: "Armenia" },
    ],
  },
  {
    clave: "proveedores",
    hoja: "Proveedores",
    alias: ["proveedor", "proveedores"],
    descripcion: "Se reconocen por nombre.",
    columnas: [
      { clave: "nombre", titulo: "Nombre", requerido: true, ejemplo: "Esencias del Eje SAS", alias: ["proveedor", "razon social", "empresa"] },
      { clave: "nit", titulo: "NIT", ejemplo: "900123456-7", alias: ["documento"] },
      { clave: "contacto", titulo: "Contacto", ejemplo: "Patricia Londoño", alias: ["asesor", "vendedor"] },
      { clave: "email", titulo: "Correo", ejemplo: "ventas@esencias.co", alias: ["email", "correo electronico"] },
      { clave: "telefono", titulo: "Teléfono", ejemplo: "6067331122", alias: ["celular", "whatsapp"] },
      { clave: "direccion", titulo: "Dirección", ejemplo: "Dosquebradas" },
    ],
  },
];

// Hoja "Empresa": dos columnas (Dato | Valor).
export const CAMPOS_EMPRESA = [
  { clave: "nombre", titulo: "Nombre del negocio", ejemplo: "Aroma Café", alias: ["nombre", "empresa", "negocio"] },
  { clave: "nit", titulo: "NIT", ejemplo: "900123456-7" },
  { clave: "sector", titulo: "Sector", ejemplo: "Alimentos y bebidas" },
  { clave: "ciudad", titulo: "Ciudad", ejemplo: "Armenia" },
  { clave: "telefono", titulo: "Teléfono", ejemplo: "3001234567" },
  { clave: "razon_social", titulo: "Razón social", ejemplo: "Aroma Café SAS" },
  { clave: "direccion", titulo: "Dirección", ejemplo: "Cra. 14 #20-30" },
  { clave: "email", titulo: "Correo", ejemplo: "hola@aroma.co", alias: ["email"] },
  { clave: "regimen", titulo: "Régimen", ejemplo: "No responsable de IVA" },
  { clave: "prefijo", titulo: "Prefijo de factura", ejemplo: "FV", alias: ["prefijo"] },
  { clave: "iva", titulo: "IVA por defecto (%)", tipo: "numero", ejemplo: 19, alias: ["iva"] },
  { clave: "nota_pie", titulo: "Nota al pie de factura", ejemplo: "Gracias por tu compra", alias: ["nota al pie", "nota"] },
  { clave: "breb_tipo_llave", titulo: "Tipo de llave Bre-B", tipo: "lista", valores: TIPOS_LLAVE, ejemplo: "Alfanumérica" },
  { clave: "breb_llave", titulo: "Llave Bre-B", ejemplo: "@aromacafe", alias: ["llave breb", "breb"] },
];

// Números escritos a la colombiana ("45.000", "$ 1.250,50") o con punto decimal.
export function leerNumero(valor) {
  if (valor === "" || valor == null) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
  let t = String(valor).replace(/[$\s]|cop/gi, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const texto = (v) => {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

function leerCelda(col, valor) {
  if (col.tipo === "numero") {
    const n = leerNumero(valor);
    if (Number.isNaN(n)) return { error: `"${texto(valor)}" no es un número` };
    if (n != null && n < 0) return { error: "no puede ser negativo" };
    return { valor: n };
  }
  const t = texto(valor);
  if (col.tipo === "color") {
    if (!t) return { valor: "" };
    if (/^#[0-9a-f]{6}$/i.test(t)) return { valor: t.toUpperCase() };
    const hex = COLORES[normalizar(t)];
    return hex ? { valor: hex } : { error: `"${t}" no es un color de la lista (${LISTA_COLORES})` };
  }
  if (col.tipo === "lista") {
    if (!t) return { valor: "" };
    const v = col.valores[normalizar(t)];
    return v ? { valor: v } : { error: `"${t}" no es válido (${col.ayuda ?? "revisa la lista"})` };
  }
  return { valor: t };
}

function buscarHoja(nombreHoja) {
  const n = normalizar(nombreHoja);
  if (["empresa", "negocio", "datos de la empresa", "mi empresa"].includes(n)) return "empresa";
  return HOJAS.find((h) => normalizar(h.hoja) === n || h.alias.some((a) => normalizar(a) === n))?.clave ?? null;
}

function mapaColumnas(definicion, encabezados) {
  const mapa = {};
  encabezados.forEach((e, i) => {
    const n = normalizar(e);
    if (!n) return;
    const col =
      definicion.columnas.find((c) => normalizar(c.titulo) === n) ??
      definicion.columnas.find((c) => normalizar(c.clave.replace(/_/g, " ")) === n || (c.alias ?? []).some((a) => normalizar(a) === n));
    if (col && !(col.clave in mapa)) mapa[col.clave] = i;
  });
  return mapa;
}

// Lee el archivo y devuelve { datos, hojas: [{clave, titulo, filas, validas, errores, ignoradas, columnas}], desconocidas }.
export async function leerArchivo(archivo) {
  const XLSX = await cargarXLSX();
  // En CSV se leen los valores como texto: así "22.000" no se convierte en 22.
  const csv = /\.csv$/i.test(archivo.name ?? "");
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: "array", cellDates: true, raw: csv });
  const datos = {};
  const hojas = [];
  const desconocidas = [];

  // Un CSV o un libro de una sola hoja sin nombre conocido se toma como Productos.
  const unaSola = libro.SheetNames.length === 1 && !buscarHoja(libro.SheetNames[0]);

  for (const nombre of libro.SheetNames) {
    const clave = unaSola ? "productos" : buscarHoja(nombre);
    const ws = libro.Sheets[nombre];
    // Con las filas vacías incluidas, el índice + desplazamiento es el número de fila en Excel.
    const filas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true, raw: true });
    const primera = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r + 1 : 1;
    const nFila = (i) => i + primera;
    if (!clave) {
      if (!["instrucciones", "ventas", "historial de ventas"].includes(normalizar(nombre))) desconocidas.push(nombre);
      continue;
    }

    if (clave === "empresa") {
      const empresa = {};
      const errores = [];
      for (const [i, fila] of filas.entries()) {
        const etiqueta = normalizar(fila[0]);
        if (!etiqueta || etiqueta === "dato" || etiqueta === "campo") continue;
        const campo = CAMPOS_EMPRESA.find(
          (c) => normalizar(c.titulo) === etiqueta || normalizar(c.clave.replace(/_/g, " ")) === etiqueta || (c.alias ?? []).some((a) => normalizar(a) === etiqueta)
        );
        if (!campo) continue;
        const r = leerCelda(campo, fila[1]);
        if (r.error) errores.push({ fila: nFila(i), mensaje: `${campo.titulo}: ${r.error}` });
        else if (r.valor !== "" && r.valor != null) empresa[campo.clave] = r.valor;
      }
      if (Object.keys(empresa).length) datos.empresa = empresa;
      hojas.push({ clave, titulo: "Empresa", filas: Object.keys(empresa).length, validas: Object.keys(empresa).length, errores, muestra: [] });
      continue;
    }

    const def = HOJAS.find((h) => h.clave === clave);
    // Encabezados: la primera fila que contenga la columna obligatoria.
    let inicio = filas.findIndex((f) => "nombre" in mapaColumnas(def, f) || Object.keys(mapaColumnas(def, f)).length >= 2);
    if (inicio < 0) {
      hojas.push({
        clave,
        titulo: def.hoja,
        filas: 0,
        validas: 0,
        errores: [{ fila: primera, mensaje: `No encontré los encabezados. Usa: ${def.columnas.map((c) => c.titulo).join(", ")}` }],
        muestra: [],
      });
      continue;
    }
    const mapa = mapaColumnas(def, filas[inicio]);
    const faltantes = def.columnas.filter((c) => c.requerido && !(c.clave in mapa));
    const errores = faltantes.map((c) => ({ fila: nFila(inicio), mensaje: `Falta la columna "${c.titulo}"` }));
    const validas = [];
    const vistos = new Map();
    let total = 0;

    if (!faltantes.length) {
      for (let i = inicio + 1; i < filas.length; i++) {
        const fila = filas[i];
        if (fila.every((c) => texto(c) === "")) continue;
        total++;
        const registro = {};
        const problemas = [];
        for (const col of def.columnas) {
          if (!(col.clave in mapa)) continue;
          const r = leerCelda(col, fila[mapa[col.clave]]);
          if (r.error) problemas.push(`${col.titulo}: ${r.error}`);
          else if (r.valor !== "" && r.valor != null) registro[col.clave] = r.valor;
          if (col.requerido && !r.error && (r.valor === "" || r.valor == null)) problemas.push(`${col.titulo} es obligatorio`);
        }
        // Repetidos dentro del mismo archivo: la última fila manda.
        const llave =
          clave === "inventario"
            ? `${normalizar(registro.producto)}|${normalizar(registro.bodega)}`
            : clave === "productos"
              ? normalizar(registro.codigo_interno || registro.codigo_barras || registro.nombre)
              : clave === "clientes" && registro.documento
                ? `${registro.tipo_documento ?? "CC"}|${registro.documento}`
                : normalizar(registro.nombre);
        if (problemas.length) {
          errores.push({ fila: nFila(i), mensaje: problemas.join(" · ") });
          continue;
        }
        if (vistos.has(llave)) {
          errores.push({ fila: nFila(i), mensaje: `Repetido con la fila ${vistos.get(llave).fila}: se usa esta fila`, aviso: true });
          validas.splice(validas.indexOf(vistos.get(llave).registro), 1);
        }
        vistos.set(llave, { fila: nFila(i), registro });
        validas.push(registro);
      }
    }

    if (validas.length) datos[clave] = [...(datos[clave] ?? []), ...validas];
    hojas.push({
      clave,
      titulo: def.hoja,
      filas: total,
      validas: validas.length,
      errores,
      columnas: def.columnas.filter((c) => c.clave in mapa),
      ignoradas: filas[inicio].filter((e, i) => texto(e) && !Object.values(mapa).includes(i)).map(texto),
      muestra: validas.slice(0, 5),
    });
  }

  const orden = ["empresa", ...HOJAS.map((h) => h.clave)];
  hojas.sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
  return { datos, hojas, desconocidas };
}

// ------------------------------------------------------------- Escritura

function hojaTabla(XLSX, def, registros = []) {
  const filas = [
    def.columnas.map((c) => c.titulo),
    ...registros.map((r) =>
      def.columnas.map((c) => {
        const v = r[c.clave];
        if (v == null) return "";
        if (c.clave === "tipo" && def.clave === "bodegas") return NOMBRE_TIPO_BODEGA[v] ?? v;
        if (c.tipo === "color") return NOMBRE_COLOR[String(v).toLowerCase()] ?? v;
        if (c.tipo === "numero") return Number(v);
        return v;
      })
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!cols"] = def.columnas.map((c) => ({ wch: Math.max(c.titulo.length + 4, 14) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(filas.length - 1, 1), c: def.columnas.length - 1 } }) };
  // Códigos como texto para que Excel no los convierta en notación científica.
  def.columnas.forEach((c, j) => {
    if (!["codigo_barras", "codigo_interno", "documento", "nit", "telefono", "producto"].includes(c.clave)) return;
    for (let i = 1; i < filas.length; i++) {
      const ref = XLSX.utils.encode_cell({ r: i, c: j });
      if (ws[ref]) ws[ref] = { t: "s", v: String(ws[ref].v) };
    }
  });
  return ws;
}

function hojaEmpresa(XLSX, empresa = {}) {
  const filas = [
    ["Dato", "Valor"],
    ...CAMPOS_EMPRESA.map((c) => {
      let v = empresa[c.clave] ?? "";
      if (c.clave === "breb_tipo_llave" && v) v = NOMBRE_TIPO_LLAVE[v] ?? v;
      return [c.titulo, v];
    }),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!cols"] = [{ wch: 26 }, { wch: 40 }];
  return ws;
}

function hojaInstrucciones(XLSX, exportacion) {
  const filas = [
    ["Stockly · Plantilla para cargar tu negocio"],
    [],
    ["Cómo usarla"],
    ["1. Llena las hojas que necesites. Puedes dejar hojas vacías o borrarlas."],
    ["2. No cambies los nombres de las hojas ni de los encabezados (la fila 1 de cada hoja)."],
    ["3. Sube el archivo en Configuración → Importar y exportar. Antes de guardar verás un resumen y los errores por fila."],
    ["4. Lo que ya existe se actualiza (mismo código, documento o nombre). Nunca se borra nada. Una celda vacía no borra el dato que ya tenías."],
    ["5. El stock es la cantidad que debe quedar. Stockly registra la diferencia en el kardex como entrada o salida, para que quede en la auditoría."],
    exportacion
      ? ["Este archivo es una copia de tus datos. Puedes editarlo y volver a subirlo. La hoja Ventas es solo de consulta: no se importa."]
      : [],
    [],
    ["Colores para las categorías (escribe el nombre en la columna Color)"],
    ...COLORES_CATEGORIA.map((c) => [c.nombre, c.hex]),
    [],
    ["Hoja", "Columna", "Obligatoria", "Qué poner", "Ejemplo"],
    ...CAMPOS_EMPRESA.map((c, i) => [i === 0 ? "Empresa" : "", c.titulo, "", c.ayuda ?? "", c.ejemplo ?? ""]),
    ...HOJAS.flatMap((h) =>
      h.columnas.map((c, i) => [i === 0 ? h.hoja : "", c.titulo, c.requerido ? "Sí" : "", i === 0 ? `${h.descripcion} ${c.ayuda ?? ""}`.trim() : (c.ayuda ?? ""), c.ejemplo ?? ""])
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 70 }, { wch: 22 }];
  return ws;
}

const COLUMNAS_VENTAS = [
  ["factura", "Factura"],
  ["fecha", "Fecha"],
  ["cliente", "Cliente"],
  ["bodega", "Bodega"],
  ["medio", "Medio de pago"],
  ["estado", "Estado"],
  ["subtotal", "Subtotal"],
  ["descuento", "Descuento"],
  ["impuesto", "Impuesto"],
  ["total", "Total"],
];

function nombreArchivo(base, empresa) {
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = normalizar(empresa ?? "").replace(/ /g, "-");
  return `${base}${nombre ? `-${nombre}` : ""}-${fecha}.xlsx`;
}

// Plantilla de inicio rápido: solo productos, con lo mínimo para empezar a vender.
const COLUMNAS_RAPIDAS = ["nombre", "precio_venta", "stock", "categoria", "precio_compra", "codigo_interno"];
const TITULOS_RAPIDOS = { stock: "Stock" };

export async function descargarPlantillaProductos(empresa) {
  const XLSX = await cargarXLSX();
  const def = HOJAS.find((h) => h.clave === "productos");
  const cols = COLUMNAS_RAPIDAS.map((k) => def.columnas.find((c) => c.clave === k));
  const titulos = cols.map((c) => TITULOS_RAPIDOS[c.clave] ?? c.titulo);
  const libro = XLSX.utils.book_new();

  const ws = XLSX.utils.aoa_to_sheet([titulos]);
  ws["!cols"] = titulos.map((t) => ({ wch: Math.max(t.length + 6, 16) }));
  ws["!cols"][0] = { wch: 34 };
  XLSX.utils.book_append_sheet(libro, ws, "Productos");

  const ayuda = {
    nombre: "Obligatorio. Incluye tamaño o presentación.",
    precio_venta: "Lo que cobras. Puedes escribir 45000 o 45.000.",
    stock: "Unidades que tienes hoy.",
    categoria: "Agrupa productos parecidos. Si no existe, se crea.",
    precio_compra: "Lo que te cuesta. Sirve para calcular tu ganancia.",
    codigo_interno: "Tu referencia o SKU, si tienes.",
  };
  const ins = XLSX.utils.aoa_to_sheet([
    ["Plantilla de productos · Stockly"],
    [],
    ["Llena la hoja Productos: una fila por producto. Solo el nombre es obligatorio; con el precio de venta ya puedes vender."],
    ["Lo demás (bodegas, clientes, proveedores) lo puedes agregar después desde la app."],
    [],
    ["Columna", "Qué poner", "Ejemplo"],
    ...cols.map((c, i) => [titulos[i], ayuda[c.clave], c.ejemplo]),
  ]);
  ins["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(libro, ins, "Instrucciones");
  XLSX.writeFile(libro, nombreArchivo("productos-stockly", empresa?.nombre));
}

export async function descargarPlantilla(empresa) {
  const XLSX = await cargarXLSX();
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaInstrucciones(XLSX, false), "Instrucciones");
  XLSX.utils.book_append_sheet(libro, hojaEmpresa(XLSX, { nombre: empresa?.nombre, moneda: empresa?.simbolomoneda }), "Empresa");
  for (const h of HOJAS) XLSX.utils.book_append_sheet(libro, hojaTabla(XLSX, h), h.hoja);
  XLSX.writeFile(libro, nombreArchivo("plantilla-stockly", empresa?.nombre));
}

// datos: lo que devuelve stockly_exportar.
export async function descargarExportacion(datos, nombreEmpresa) {
  const XLSX = await cargarXLSX();
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaInstrucciones(XLSX, true), "Instrucciones");
  XLSX.utils.book_append_sheet(libro, hojaEmpresa(XLSX, datos.empresa ?? {}), "Empresa");
  for (const h of HOJAS) XLSX.utils.book_append_sheet(libro, hojaTabla(XLSX, h, datos[h.clave] ?? []), h.hoja);
  const ventas = (datos.ventas ?? []).map((v) => COLUMNAS_VENTAS.map(([k]) => (k === "fecha" ? new Date(v.fecha) : (v[k] ?? ""))));
  const ws = XLSX.utils.aoa_to_sheet([COLUMNAS_VENTAS.map(([, t]) => t), ...ventas], { cellDates: true, dateNF: "yyyy-mm-dd hh:mm" });
  ws["!cols"] = COLUMNAS_VENTAS.map(([, t]) => ({ wch: Math.max(t.length + 4, 14) }));
  XLSX.utils.book_append_sheet(libro, ws, "Ventas");
  XLSX.writeFile(libro, nombreArchivo("stockly", nombreEmpresa));
}
