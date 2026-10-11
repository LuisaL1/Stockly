import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Stock de un producto en todas las bodegas y sedes de la empresa (solo lectura).
export async function StockEmpresa(idEmpresa, texto) {
  const { data, error } = await supabase.rpc("stockly_stock_empresa", { _id_empresa: idEmpresa, _texto: texto || null });
  if (error) throw error;
  return data ?? [];
}

// Todas las bodegas de la empresa como posibles destinos de un traslado (incluye las de otras sedes).
export async function MostrarBodegasDestino(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_bodegas_destino", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data ?? [];
}

export async function MostrarBodegas(idEmpresa) {
  const { data, error } = await supabase
    .from("bodegas")
    .select()
    .eq("id_empresa", idEmpresa)
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  // La principal siempre primero.
  return (data ?? []).sort((a, b) => (b.tipo === "principal") - (a.tipo === "principal"));
}

// Cantidad por producto en una bodega (o en todas si no se indica).
export async function MostrarStockBodega({ idEmpresa, idBodega, idProducto }) {
  let q = supabase
    .from("v_stock_bodega")
    .select("id_bodega, bodega, tipo, id_producto, descripcion, cantidad, stock_minimo, precioventa, preciocompra, unidad, presentacion, contenido, contenido_unidad, categoria, marca, codigointerno, codigobarras")
    .eq("id_empresa", idEmpresa)
    .order("descripcion");
  if (idBodega != null) q = q.eq("id_bodega", idBodega);
  if (idProducto != null) q = q.eq("id_producto", idProducto);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function InsertarBodega(p) {
  const { error } = await supabase.from("bodegas").insert(p);
  if (manejarError(error, "No se pudo crear la bodega")) return false;
  notificarExito("Bodega creada");
  return true;
}

export async function EditarBodega({ id, ...cambios }) {
  const { error } = await supabase.from("bodegas").update(cambios).eq("id", id);
  if (manejarError(error, "No se pudo editar la bodega")) return false;
  notificarExito("Bodega actualizada");
  return true;
}

export async function EliminarBodega({ id }) {
  const { error } = await supabase.from("bodegas").delete().eq("id", id);
  if (manejarError(error, "No se pudo eliminar la bodega (puede tener ventas u órdenes asociadas)")) return false;
  notificarExito("Bodega eliminada");
  return true;
}

export async function TrasladarStock({ idProducto, idOrigen, idDestino, cantidad, nota }) {
  const { error } = await supabase.rpc("trasladar_stock", {
    _id_producto: idProducto,
    _id_origen: idOrigen,
    _id_destino: idDestino,
    _cantidad: cantidad,
    _nota: nota || null,
  });
  if (manejarError(error, "No se pudo trasladar el stock")) return false;
  notificarExito("Traslado registrado");
  return true;
}

export async function MostrarTraslados(idEmpresa) {
  const { data, error } = await supabase
    .from("traslados")
    .select("id, cantidad, nota, fecha, productos(descripcion, nombre_completo), origen:bodegas!traslados_id_origen_fkey(nombre), destino:bodegas!traslados_id_destino_fkey(nombre)")
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
