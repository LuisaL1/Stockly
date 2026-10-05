// Arma el Excel del informe contable a partir de stockly_informe_contable.
import { NombresMetodo } from "./dataEstatica";

const cargarXLSX = () => import("xlsx");
const MONEDA = "#,##0";
const n = (x) => Number(x ?? 0);

export const SECCIONES_INFORME = [
  { id: "ventas", titulo: "Libro de ventas", texto: "Cada factura con cliente, base, IVA y total." },
  { id: "iva", titulo: "IVA por tarifa", texto: "Base gravable e IVA generado por cada tarifa." },
  { id: "cobros", titulo: "Cobros por medio de pago", texto: "Lo que entró en efectivo, datáfono, Bre-B, etc." },
  { id: "por_cobrar", titulo: "Cartera (por cobrar)", texto: "Ventas a crédito o pendientes con su saldo." },
  { id: "compras", titulo: "Compras y facturas de proveedores", texto: "Compras recibidas, lo comprado y la factura de cada proveedor." },
  { id: "inventario", titulo: "Inventario valorizado", texto: "Stock, costo y valor de cada producto." },
  { id: "movimientos", titulo: "Movimientos de inventario", texto: "Entradas, salidas y ajustes del kardex." },
];

// filas: arreglo de arreglos; dinero: índices de columnas con formato de pesos.
function hoja(XLSX, encabezados, filas, { dinero = [], anchos = [], total } = {}) {
  const datos = [encabezados, ...filas];
  if (total) datos.push([], total);
  const ws = XLSX.utils.aoa_to_sheet(datos);
  const rango = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = 1; r <= rango.e.r; r++) {
    for (const c of dinero) {
      const celda = ws[XLSX.utils.encode_cell({ r, c })];
      if (celda && celda.t === "n") celda.z = MONEDA;
    }
  }
  ws["!cols"] = encabezados.map((e, i) => ({ wch: anchos[i] ?? Math.max(e.length + 3, 12) }));
  if (filas.length) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: filas.length, c: encabezados.length - 1 } }) };
  return ws;
}

const medio = (m) => NombresMetodo[m] ?? m;
const estado = (e) => ({ pagada: "Pagada", pendiente: "Pendiente", anulada: "Anulada" })[e] ?? e;
const estadoDian = (e) =>
  ({ no_aplica: "No aplica", pendiente: "Pendiente", enviada: "Enviada", aceptada: "Aceptada", rechazada: "Rechazada" })[e] ?? e ?? "";

// modo: "detallado" (cada factura, cada movimiento) o "general" (totales agrupados).
export async function construirInforme(d, secciones, modo = "detallado") {
  const XLSX = await cargarXLSX();
  const libro = XLSX.utils.book_new();
  const r = d.resumen ?? {};
  const porCobrar = (d.por_cobrar ?? []).reduce((a, x) => a + n(x.saldo), 0);
  const valorInventario = (d.inventario ?? []).reduce((a, x) => a + n(x.valor_costo), 0);

  // Resumen (siempre).
  const resumen = XLSX.utils.aoa_to_sheet([
    ["Informe contable"],
    ["Empresa", d.empresa?.razon_social || d.empresa?.nombre],
    ["NIT", d.empresa?.nit ?? ""],
    ["Régimen", d.empresa?.regimen ?? ""],
    ["Periodo", `${d.periodo.desde} a ${d.periodo.hasta}`],
    ["Generado", new Date().toLocaleString("es-CO")],
    [],
    ["Concepto", "Valor"],
    ["Facturas emitidas", n(r.facturas)],
    ["Facturas anuladas", n(r.anuladas)],
    ["Ventas brutas (subtotal)", n(r.subtotal)],
    ["Descuentos", n(r.descuentos)],
    ["Base gravable", n(r.base)],
    ["IVA generado", n(r.iva)],
    ["Total ventas", n(r.total)],
    ["Cobrado en el periodo", n(r.cobrado)],
    ["Cartera por cobrar (al cierre)", porCobrar],
    ["Compras recibidas", n(r.compras)],
    ["Inventario al costo (al generar)", valorInventario],
    [],
    ["Las ventas anuladas aparecen en el libro de ventas pero no suman en este resumen."],
  ]);
  for (let fila = 10; fila <= 18; fila++) {
    const c = resumen[XLSX.utils.encode_cell({ r: fila, c: 1 })];
    if (c) c.z = MONEDA;
  }
  resumen["!cols"] = [{ wch: 34 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(libro, resumen, "Resumen");

  const incluir = (id) => secciones.includes(id);
  if (modo === "general") return terminar(XLSX, libro, d, agregarGeneral(XLSX, libro, d, incluir), "general");

  if (incluir("ventas")) {
    const validas = (d.ventas ?? []).filter((v) => v.estado !== "anulada");
    const suma = (k) => validas.reduce((a, v) => a + n(v[k]), 0);
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Fecha", "Factura", "Tipo", "Estado", "Cliente", "Tipo doc.", "Documento", "Medio de pago", "Subtotal", "Descuento", "Base", "IVA", "Total", "Estado DIAN", "CUFE"],
        (d.ventas ?? []).map((v) => [
          v.fecha, v.factura, v.tipo === "electronica" ? "Electrónica" : "Interna", estado(v.estado), v.cliente, v.tipo_documento ?? "",
          v.documento ?? "", medio(v.medio_pago), n(v.subtotal), n(v.descuento), n(v.base), n(v.iva), n(v.total), estadoDian(v.estado_dian), v.cufe ?? "",
        ]),
        {
          dinero: [8, 9, 10, 11, 12],
          anchos: [17, 11, 11, 11, 28, 9, 15, 15, 13, 12, 13, 12, 13, 12, 20],
          total: ["Total (sin anuladas)", "", "", "", "", "", "", "", suma("subtotal"), suma("descuento"), suma("base"), suma("iva"), suma("total")],
        }
      ),
      "Ventas"
    );
  }

  if (incluir("iva")) {
    const iva = d.iva ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Tarifa IVA (%)", "Base gravable", "IVA", "Total"], iva.map((x) => [n(x.tarifa), n(x.base), n(x.iva), n(x.total)]), {
        dinero: [1, 2, 3],
        anchos: [16, 18, 16, 18],
        total: ["Total", iva.reduce((a, x) => a + n(x.base), 0), iva.reduce((a, x) => a + n(x.iva), 0), iva.reduce((a, x) => a + n(x.total), 0)],
      }),
      "IVA"
    );
  }

  if (incluir("cobros")) {
    const cobros = d.cobros ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Medio de pago", "Pagos", "Total"], cobros.map((x) => [medio(x.medio), n(x.pagos), n(x.total)]), {
        dinero: [2],
        anchos: [22, 10, 18],
        total: ["Total", cobros.reduce((a, x) => a + n(x.pagos), 0), cobros.reduce((a, x) => a + n(x.total), 0)],
      }),
      "Cobros"
    );
  }

  if (incluir("por_cobrar")) {
    const cartera = d.por_cobrar ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Factura", "Fecha", "Cliente", "Documento", "Teléfono", "Total", "Pagado", "Saldo", "Días"],
        cartera.map((x) => [x.factura, x.fecha, x.cliente, x.documento ?? "", x.telefono ?? "", n(x.total), n(x.pagado), n(x.saldo), n(x.dias)]),
        { dinero: [5, 6, 7], anchos: [11, 12, 28, 15, 14, 14, 14, 14, 7], total: ["Total", "", "", "", "", "", "", porCobrar] }
      ),
      "Cartera"
    );
  }

  if (incluir("compras")) {
    const compras = d.compras ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Orden", "Recibida", "Proveedor", "NIT", "Bodega", "Total orden", "Factura proveedor", "Fecha factura", "Valor factura", "Archivo", "Nota"],
        compras.map((x) => [
          x.orden, x.recibida, x.proveedor, x.nit ?? "", x.bodega ?? "", n(x.total), x.factura_numero ?? "Sin registrar",
          x.factura_fecha ?? "", x.factura_valor == null ? "" : n(x.factura_valor), x.factura_archivo ? "Adjunta" : "No", x.nota ?? "",
        ]),
        {
          dinero: [5, 8],
          anchos: [10, 12, 28, 15, 18, 15, 18, 13, 15, 10, 30],
          total: ["Total", "", "", "", "", compras.reduce((a, x) => a + n(x.total), 0), "", "", compras.reduce((a, x) => a + n(x.factura_valor), 0)],
        }
      ),
      "Compras"
    );
    const detalle = d.compras_detalle ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Orden", "Recibida", "Proveedor", "Factura proveedor", "Producto", "Cantidad", "Costo unitario", "Total"],
        detalle.map((x) => [x.orden, x.recibida, x.proveedor, x.factura_numero ?? "", x.producto, n(x.cantidad), n(x.costo_unitario), n(x.total)]),
        { dinero: [6, 7], anchos: [10, 12, 26, 18, 30, 10, 14, 14], total: ["Total", "", "", "", "", "", "", detalle.reduce((a, x) => a + n(x.total), 0)] }
      ),
      "Compras detalle"
    );
  }

  if (incluir("inventario")) {
    const inv = d.inventario ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Producto", "Código", "Categoría", "Stock", "Costo unitario", "Valor al costo", "Precio de venta", "Valor a precio de venta"],
        inv.map((x) => [x.producto, x.codigo ?? "", x.categoria ?? "", n(x.stock), n(x.costo), n(x.valor_costo), n(x.precio), n(x.valor_venta)]),
        {
          dinero: [4, 5, 6, 7],
          anchos: [30, 12, 16, 9, 14, 16, 15, 20],
          total: ["Total", "", "", "", "", valorInventario, "", inv.reduce((a, x) => a + n(x.valor_venta), 0)],
        }
      ),
      "Inventario"
    );
  }

  if (incluir("movimientos")) {
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Fecha", "Producto", "Tipo", "Cantidad", "Detalle", "Bodega", "Usuario"],
        (d.movimientos ?? []).map((x) => [x.fecha, x.producto, x.tipo, n(x.cantidad), x.detalle ?? "", x.bodega ?? "", x.usuario ?? ""]),
        { anchos: [17, 30, 9, 9, 34, 18, 20] }
      ),
      "Movimientos"
    );
  }

  return terminar(XLSX, libro, d, null, "detallado");
}

// Informe general: los mismos datos agrupados (sin el detalle línea por línea).
function agregarGeneral(XLSX, libro, d, incluir) {
  const suma = (lista, k) => lista.reduce((a, x) => a + n(x[k]), 0);
  const agrupar = (lista, clave) => {
    const m = new Map();
    for (const x of lista) {
      const k = clave(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return [...m.entries()];
  };

  if (incluir("ventas")) {
    const validas = (d.ventas ?? []).filter((v) => v.estado !== "anulada");
    const dias = (new Date(d.periodo.hasta) - new Date(d.periodo.desde)) / 86_400_000;
    const porMes = dias > 62;
    const grupos = agrupar(validas, (v) => (porMes ? v.fecha.slice(0, 7) : v.fecha.slice(0, 10))).sort(([a], [b]) => a.localeCompare(b));
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        [porMes ? "Mes" : "Día", "Facturas", "Subtotal", "Descuentos", "Base gravable", "IVA", "Total"],
        grupos.map(([k, vs]) => [k, vs.length, suma(vs, "subtotal"), suma(vs, "descuento"), suma(vs, "base"), suma(vs, "iva"), suma(vs, "total")]),
        {
          dinero: [2, 3, 4, 5, 6],
          anchos: [12, 10, 16, 14, 16, 14, 16],
          total: ["Total", validas.length, suma(validas, "subtotal"), suma(validas, "descuento"), suma(validas, "base"), suma(validas, "iva"), suma(validas, "total")],
        }
      ),
      porMes ? "Ventas por mes" : "Ventas por día"
    );
    const porMedio = agrupar(validas, (v) => medio(v.medio_pago));
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Medio de pago", "Facturas", "Total facturado"], porMedio.map(([k, vs]) => [k, vs.length, suma(vs, "total")]), {
        dinero: [2],
        anchos: [22, 10, 18],
      }),
      "Ventas por medio"
    );
  }

  if (incluir("iva")) {
    const iva = d.iva ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Tarifa IVA (%)", "Base gravable", "IVA", "Total"], iva.map((x) => [n(x.tarifa), n(x.base), n(x.iva), n(x.total)]), {
        dinero: [1, 2, 3],
        anchos: [16, 18, 16, 18],
        total: ["Total", suma(iva, "base"), suma(iva, "iva"), suma(iva, "total")],
      }),
      "IVA"
    );
  }

  if (incluir("cobros")) {
    const cobros = d.cobros ?? [];
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Medio de pago", "Pagos", "Total"], cobros.map((x) => [medio(x.medio), n(x.pagos), n(x.total)]), {
        dinero: [2],
        anchos: [22, 10, 18],
        total: ["Total", suma(cobros, "pagos"), suma(cobros, "total")],
      }),
      "Cobros"
    );
  }

  if (incluir("por_cobrar")) {
    const grupos = agrupar(d.por_cobrar ?? [], (x) => `${x.cliente}|${x.documento ?? ""}`).sort((a, b) => suma(b[1], "saldo") - suma(a[1], "saldo"));
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Cliente", "Documento", "Facturas", "Saldo", "Más antigua (días)"],
        grupos.map(([k, xs]) => [k.split("|")[0], k.split("|")[1], xs.length, suma(xs, "saldo"), Math.max(...xs.map((x) => n(x.dias)))]),
        { dinero: [3], anchos: [30, 16, 10, 16, 18], total: ["Total", "", (d.por_cobrar ?? []).length, suma(d.por_cobrar ?? [], "saldo")] }
      ),
      "Cartera por cliente"
    );
  }

  if (incluir("compras")) {
    const compras = d.compras ?? [];
    const grupos = agrupar(compras, (x) => `${x.proveedor}|${x.nit ?? ""}`).sort((a, b) => suma(b[1], "total") - suma(a[1], "total"));
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Proveedor", "NIT", "Compras", "Total", "Con factura registrada"],
        grupos.map(([k, xs]) => [k.split("|")[0], k.split("|")[1], xs.length, suma(xs, "total"), xs.filter((x) => x.factura_numero).length]),
        { dinero: [3], anchos: [30, 16, 10, 16, 22], total: ["Total", "", compras.length, suma(compras, "total"), compras.filter((x) => x.factura_numero).length] }
      ),
      "Compras por proveedor"
    );
  }

  if (incluir("inventario")) {
    const inv = d.inventario ?? [];
    const grupos = agrupar(inv, (x) => x.categoria ?? "Sin categoría").sort((a, b) => suma(b[1], "valor_costo") - suma(a[1], "valor_costo"));
    XLSX.utils.book_append_sheet(
      libro,
      hoja(
        XLSX,
        ["Categoría", "Productos", "Unidades", "Valor al costo", "Valor a precio de venta"],
        grupos.map(([k, xs]) => [k, xs.length, suma(xs, "stock"), suma(xs, "valor_costo"), suma(xs, "valor_venta")]),
        { dinero: [3, 4], anchos: [24, 10, 12, 18, 22], total: ["Total", inv.length, suma(inv, "stock"), suma(inv, "valor_costo"), suma(inv, "valor_venta")] }
      ),
      "Inventario por categoría"
    );
  }

  if (incluir("movimientos")) {
    const grupos = agrupar(d.movimientos ?? [], (x) => x.tipo);
    XLSX.utils.book_append_sheet(
      libro,
      hoja(XLSX, ["Tipo", "Movimientos", "Unidades"], grupos.map(([k, xs]) => [k, xs.length, suma(xs, "cantidad")]), { anchos: [14, 14, 12] }),
      "Movimientos"
    );
  }
  return null;
}

function terminar(XLSX, libro, d, _, modo) {
  const empresa = String(d.empresa?.nombre ?? "empresa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const nombre = `informe-contable${modo === "general" ? "-general" : ""}-${empresa}-${d.periodo.desde}-a-${d.periodo.hasta}.xlsx`;
  return {
    nombre,
    descargar: () => XLSX.writeFile(libro, nombre),
    base64: () => XLSX.write(libro, { type: "base64", bookType: "xlsx" }),
  };
}

// Periodos frecuentes (en Colombia el IVA suele declararse por bimestre).
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function periodosInforme(hoy = new Date()) {
  const a = hoy.getFullYear();
  const m = hoy.getMonth(); // 0-11
  const bim = Math.floor(m / 2);
  const bimAnt = bim === 0 ? { a: a - 1, m: 10 } : { a, m: (bim - 1) * 2 };
  return [
    { id: "mes_anterior", texto: "Mes anterior", desde: iso(new Date(a, m - 1, 1)), hasta: iso(new Date(a, m, 0)) },
    { id: "mes_actual", texto: "Este mes", desde: iso(new Date(a, m, 1)), hasta: iso(hoy) },
    { id: "bimestre", texto: "Bimestre anterior (IVA)", desde: iso(new Date(bimAnt.a, bimAnt.m, 1)), hasta: iso(new Date(bimAnt.a, bimAnt.m + 2, 0)) },
    { id: "anio_anterior", texto: "Año anterior", desde: `${a - 1}-01-01`, hasta: `${a - 1}-12-31` },
  ];
}
