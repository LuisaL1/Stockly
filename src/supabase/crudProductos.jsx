import { supabase } from "./supabase.config";
import { manejarError, resultadoInsercion } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function InsertarProductos(p) {
  const ok = resultadoInsercion(await supabase.rpc("insertarproductos", p), "un producto");
  if (ok) notificarExito("Producto registrado");
  return ok;
}

export async function MostrarProductos(p) {
  const { data, error } = await supabase.rpc("mostrarproductos", p);
  if (error) throw error;
  return data ?? [];
}

export async function EliminarProductos(p) {
  const { error } = await supabase.from("productos").delete().eq("id", p.id);
  if (manejarError(error, "No se pudo eliminar el producto")) return false;
  notificarExito("Producto eliminado");
  return true;
}

export async function EditarProductos(p) {
  const { error } = await supabase.from("productos").update(p).eq("id", p.id);
  if (manejarError(error, "No se pudo editar el producto")) return false;
  notificarExito("Producto actualizado");
  return true;
}

export async function BuscarProductos(p) {
  const { data, error } = await supabase.rpc("buscarproductos", {
    _id_empresa: p.id_empresa ?? p._id_empresa,
    buscador: p.descripcion ?? p.buscador ?? "",
  });
  if (error) throw error;
  return data ?? [];
}

// Reportes
export async function ReportStockProductosTodos(p) {
  const { data, error } = await supabase
    .from("productos")
    .select()
    .eq("id_empresa", p.id_empresa)
    .order("descripcion", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function ReportStockXProducto(p) {
  const { data, error } = await supabase
    .from("productos")
    .select()
    .eq("id_empresa", p.id_empresa)
    .eq("id", p.id);
  if (error) throw error;
  return data ?? [];
}

export async function ReportStockBajoMinimo(p) {
  const { data, error } = await supabase.rpc("reportproductosbajominimo", p);
  if (error) throw error;
  return data ?? [];
}

export async function ReportKardexEntradaSalida(p) {
  const { data, error } = await supabase.rpc("mostrarkardexempresa", p);
  if (error) throw error;
  return data ?? [];
}

export async function ReportInventarioValorado(p) {
  const { data, error } = await supabase.rpc("inventariovalorado", p);
  if (error) throw error;
  return data ?? [];
}
