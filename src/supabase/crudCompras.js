import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarOrdenesCompra(idEmpresa) {
  const { data, error } = await supabase
    .from("ordenes_compra")
    .select(
      "id, numero, estado, fecha, fecha_esperada, total, nota, creada_por, recibida_en, proveedores(id, nombre), bodegas(id, nombre), detalle_orden_compra(id, id_producto, descripcion, cantidad, costo_unitario, total)"
    )
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function CrearOrdenCompra(orden) {
  const { data, error } = await supabase.rpc("crear_orden_compra", { _orden: orden });
  if (manejarError(error, "No se pudo crear la orden de compra")) return null;
  notificarExito(`Orden OC-${data.numero} creada`);
  return data;
}

export async function CambiarEstadoOrden({ id, estado }) {
  const { error } = await supabase.from("ordenes_compra").update({ estado }).eq("id", id);
  if (manejarError(error, "No se pudo actualizar la orden")) return false;
  notificarExito(estado === "enviada" ? "Orden marcada como enviada" : "Orden cancelada");
  return true;
}

export async function RecibirOrdenCompra(id) {
  const { error } = await supabase.rpc("recibir_orden_compra", { _id_orden: id });
  if (manejarError(error, "No se pudo recibir la orden")) return false;
  notificarExito("Mercancía recibida e inventario actualizado");
  return true;
}

export async function EliminarOrdenCompra({ id }) {
  const { error } = await supabase.from("ordenes_compra").delete().eq("id", id);
  if (manejarError(error, "No se pudo eliminar la orden")) return false;
  notificarExito("Orden eliminada");
  return true;
}

// ------------------------------------------------------------- Factura del proveedor

const BUCKET_FACTURAS = "facturas-proveedor";

export async function MostrarFacturaProveedor(idOrden) {
  const { data, error } = await supabase
    .from("ordenes_compra")
    .select("factura_proveedor_numero, factura_proveedor_fecha, factura_proveedor_valor, factura_proveedor_archivo, factura_proveedor_nombre")
    .eq("id", idOrden)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Guarda número, fecha y valor; si viene archivo, lo sube y reemplaza el anterior.
export async function GuardarFacturaProveedor({ idEmpresa, idOrden, numero, fecha, valor, archivo, actual }) {
  let ruta = actual?.factura_proveedor_archivo ?? null;
  let nombre = actual?.factura_proveedor_nombre ?? null;
  if (archivo) {
    if (archivo.size > 10 * 1024 * 1024) throw new Error("El archivo pesa más de 10 MB.");
    const limpio = archivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
    const nueva = `${idEmpresa}/oc-${idOrden}/${Date.now()}-${limpio}`;
    const { error } = await supabase.storage.from(BUCKET_FACTURAS).upload(nueva, archivo, { contentType: archivo.type || undefined });
    if (error) throw new Error(/bucket|not found/i.test(error.message) ? "Falta configurar el almacenamiento de facturas en Supabase." : error.message);
    if (ruta) await supabase.storage.from(BUCKET_FACTURAS).remove([ruta]);
    ruta = nueva;
    nombre = archivo.name;
  }
  const { error } = await supabase.rpc("guardar_factura_proveedor", {
    _id_orden: idOrden,
    _numero: numero || null,
    _fecha: fecha || null,
    _valor: valor === "" || valor == null ? null : Number(valor),
    _archivo: ruta,
    _nombre_archivo: nombre,
  });
  if (error) throw error;
}

export async function QuitarArchivoFacturaProveedor({ idOrden, actual }) {
  if (actual?.factura_proveedor_archivo) await supabase.storage.from(BUCKET_FACTURAS).remove([actual.factura_proveedor_archivo]);
  const { error } = await supabase.rpc("guardar_factura_proveedor", {
    _id_orden: idOrden,
    _numero: actual?.factura_proveedor_numero ?? null,
    _fecha: actual?.factura_proveedor_fecha ?? null,
    _valor: actual?.factura_proveedor_valor ?? null,
    _archivo: null,
    _nombre_archivo: null,
  });
  if (error) throw error;
}

// Enlace temporal (10 minutos) para ver o descargar el archivo.
export async function EnlaceFacturaProveedor(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET_FACTURAS).createSignedUrl(ruta, 600);
  if (error) throw error;
  return data.signedUrl;
}
