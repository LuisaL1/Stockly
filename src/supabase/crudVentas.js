import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

const SELECT_VENTA =
  "id, prefijo, numero, fecha, canal, metodo_pago, subtotal, descuento, impuesto, total, estado, nota, " +
  "clientes(id, nombre, tipo_documento, documento, email, telefono, direccion), bodegas(id, nombre), " +
  "facturas(id, tipo, estado, estado_dian, cufe), detalle_venta(id, descripcion, cantidad, unidad, presentacion, precio_unitario, descuento, iva, total), " +
  "pagos_venta(id, metodo, monto, recibido, cambio, referencia, franquicia, banco, estado, link_url, created_at, confirmado_en)";

// Devuelve { id, prefijo, numero, total } o null si falló.
export async function RegistrarVenta(venta) {
  const { data, error } = await supabase.rpc("registrar_venta", { _venta: venta });
  if (manejarError(error, "No se pudo registrar la venta")) return null;
  notificarExito(`Venta ${data.prefijo}-${data.numero} registrada`);
  return data;
}

export async function MostrarVentas({ idEmpresa, desde, hasta, estado, texto }) {
  let q = supabase
    .from("ventas")
    .select(SELECT_VENTA)
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false })
    .limit(500);
  if (desde) q = q.gte("fecha", desde);
  if (hasta) q = q.lte("fecha", hasta);
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) throw error;
  const filas = data ?? [];
  if (!texto) return filas;
  const t = texto.toLowerCase();
  return filas.filter(
    (v) =>
      `${v.prefijo}-${v.numero}`.toLowerCase().includes(t) ||
      v.clientes?.nombre?.toLowerCase().includes(t) ||
      v.clientes?.documento?.toLowerCase().includes(t)
  );
}

export async function MostrarVenta(id) {
  const { data, error } = await supabase.from("ventas").select(SELECT_VENTA).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// Abono a una venta pendiente. pago: { metodo, monto, referencia?, franquicia?, banco? }
export async function RegistrarPago({ idVenta, pago }) {
  const { data, error } = await supabase.rpc("registrar_pago", { _id_venta: idVenta, _pago: pago });
  if (manejarError(error, "No se pudo registrar el pago")) return null;
  notificarExito(data.estado === "pagada" ? "Pago registrado: la venta quedó saldada" : "Abono registrado");
  return data;
}

// Crea (o reutiliza) el link de pago de Wompi para el saldo de la venta. Devuelve { url, monto } o { error }.
export async function GenerarLinkPago(idVenta) {
  const { data, error } = await supabase.functions.invoke("wompi-link", { body: { id_venta: idVenta } });
  if (error) {
    let mensaje = "No se pudo crear el link de pago.";
    try {
      mensaje = (await error.context?.json())?.error ?? mensaje;
    } catch {
      if (error.name === "FunctionsFetchError") mensaje = "La función “wompi-link” no está desplegada en Supabase.";
    }
    return { error: mensaje };
  }
  return data;
}

// Llama a la función "nequi-qr" y devuelve su respuesta o { error }.
async function funcionNequi(accion, idVenta) {
  const { data, error } = await supabase.functions.invoke("nequi-qr", { body: { accion, id_venta: idVenta } });
  if (error) {
    let mensaje = "No se pudo comunicar con Nequi.";
    try {
      mensaje = (await error.context?.json())?.error ?? mensaje;
    } catch {
      if (error.name === "FunctionsFetchError") mensaje = "La función “nequi-qr” no está desplegada en Supabase.";
    }
    return { error: mensaje };
  }
  return data;
}

// { qr, monto, expira } con el texto que va dentro del código QR.
export const GenerarQRNequi = (idVenta) => funcionNequi("generar", idVenta);
// { estado: "pendiente" | "pagado" | "vencido" | "sin_qr" | "revisar" }
export const EstadoQRNequi = (idVenta) => funcionNequi("estado", idVenta);

export async function AnularVenta({ id, motivo }) {
  const { error } = await supabase.rpc("anular_venta", { _id_venta: id, _motivo: motivo || null });
  if (manejarError(error, "No se pudo anular la venta")) return false;
  notificarExito("Venta anulada y stock devuelto");
  return true;
}

export async function EnviarFacturaDian(idFactura) {
  const { data, error } = await supabase.functions.invoke("factura-electronica", { body: { id_factura: idFactura } });
  if (error) {
    let detalle = error.message;
    try {
      detalle = (await error.context?.json())?.error ?? detalle;
    } catch {
      // respuesta sin cuerpo JSON
    }
    return { ok: false, mensaje: detalle };
  }
  return { ok: true, data };
}

// Sube el PDF de la factura (uno por venta, se reemplaza) y devuelve un enlace de descarga
// válido por 30 días para enviarlo por WhatsApp desde el computador.
export async function SubirFacturaCompartida({ idEmpresa, idVenta, archivo }) {
  const ruta = `${idEmpresa}/${idVenta}.pdf`;
  const almacen = supabase.storage.from("facturas-compartidas");
  const { error } = await almacen.upload(ruta, archivo, { upsert: true, contentType: "application/pdf" });
  if (error) throw new Error("No se pudo preparar el PDF para enviarlo. Intenta de nuevo.");
  const { data, error: errorEnlace } = await almacen.createSignedUrl(ruta, 60 * 60 * 24 * 30, { download: archivo.name });
  if (errorEnlace || !data?.signedUrl) throw new Error("No se pudo crear el enlace del PDF.");
  return data.signedUrl;
}
