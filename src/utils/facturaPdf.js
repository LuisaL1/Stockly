import { createElement } from "react";

// Genera el PDF de la factura como archivo (el mismo del botón "Descargar PDF").
// Carga @react-pdf solo cuando se necesita, porque es pesado.
export async function crearArchivoFactura({ venta, cfg, empresa, logoEmpresa }) {
  const [{ pdf }, { DocumentoFactura }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("../Components/organismos/ventas/FacturaPDF"),
  ]);
  const blob = await pdf(createElement(DocumentoFactura, { venta, cfg, empresa, logoEmpresa })).toBlob();
  return new File([blob], `factura-${venta.prefijo}-${venta.numero}.pdf`, { type: "application/pdf" });
}
