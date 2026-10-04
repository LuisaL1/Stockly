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
