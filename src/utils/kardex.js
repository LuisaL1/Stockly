// Catálogos y utilidades del kardex (deben coincidir con stockly_motivos_ajuste y stockly_kardex).

export const MOTIVOS_AJUSTE = [
  { id: "conteo", descripcion: "Conteo físico", tipos: ["Entrada", "Salida"] },
  { id: "inventario_inicial", descripcion: "Inventario inicial", tipos: ["Entrada"] },
  { id: "devolucion", descripcion: "Devolución de cliente", tipos: ["Entrada"] },
  { id: "danado", descripcion: "Producto dañado", tipos: ["Salida"] },
  { id: "vencido", descripcion: "Producto vencido", tipos: ["Salida"] },
  { id: "perdida", descripcion: "Pérdida o robo", tipos: ["Salida"] },
  { id: "muestra", descripcion: "Muestra o regalo", tipos: ["Salida"] },
  { id: "uso_interno", descripcion: "Uso interno", tipos: ["Salida"] },
  { id: "correccion", descripcion: "Corrección", tipos: ["Entrada", "Salida"] },
  { id: "otro", descripcion: "Otro", tipos: ["Entrada", "Salida"] },
];

// Origen de cada movimiento: etiqueta, color y a dónde lleva.
export const ORIGENES = {
  venta: { descripcion: "Venta", tono: "info", ruta: "/ventas/facturas" },
  anulacion: { descripcion: "Anulación", tono: "warning", ruta: "/ventas/facturas" },
  compra: { descripcion: "Compra", tono: "success", ruta: "/compras" },
  importacion: { descripcion: "Importación", tono: "neutro", ruta: "/configurar/importar-exportar" },
  traslado: { descripcion: "Traslado", tono: "neutro", ruta: "/bodegas" },
  ajuste: { descripcion: "Ajuste", tono: "primary", ruta: null },
};

export const OPCIONES_ORIGEN = [
  { id: "", descripcion: "Todos los orígenes" },
  ...Object.entries(ORIGENES).map(([id, o]) => ({ id, descripcion: o.descripcion })),
];
export const OPCIONES_TIPO = [
  { id: "", descripcion: "Entradas y salidas" },
  { id: "Entrada", descripcion: "Solo entradas" },
  { id: "Salida", descripcion: "Solo salidas" },
];

// Texto del origen para una fila: "Venta FV-12", "Ajuste · Conteo físico", "Traslado"...
export function etiquetaOrigen(fila) {
  const base = ORIGENES[fila.origen]?.descripcion ?? fila.origen ?? "";
  if (fila.origen === "ajuste") {
    const motivo = MOTIVOS_AJUSTE.find((m) => m.id === fila.motivo)?.descripcion ?? (fila.motivo === "anulacion" ? "Anulación" : null);
    return motivo ? `${base} · ${motivo}` : base;
  }
  return fila.documento ? `${base} ${fila.documento}` : base;
}

// Descarga el listado actual en Excel.
export async function exportarKardexExcel(filas, archivo = "kardex.xlsx") {
  const XLSX = await import("xlsx");
  const datos = [
    ["Fecha", "Producto", "Código", "Bodega", "Movimiento", "Origen", "Detalle", "Cantidad", "Saldo", "Usuario", "Estado"],
    ...filas.map((f) => [
      new Date(f.creado_en),
      f.producto,
      f.codigo ?? "",
      f.bodega ?? "",
      f.tipo,
      etiquetaOrigen(f),
      f.origen === "ajuste" ? f.nota ?? "" : f.detalle ?? "",
      Number(f.tipo === "Salida" ? -f.cantidad : f.cantidad),
      Number(f.saldo),
      f.usuario ?? "",
      f.estado === "anulado" ? "Anulado" : "",
    ]),
  ];
  const hoja = XLSX.utils.aoa_to_sheet(datos, { cellDates: true });
  hoja["!cols"] = [{ wch: 18 }, { wch: 34 }, { wch: 12 }, { wch: 18 }, { wch: 11 }, { wch: 26 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 10 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Kardex");
  XLSX.writeFile(libro, archivo);
}
