import { supabase } from "./supabase.config";
import { manejarError, resultadoInsercion } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function InsertarCategorias(p) {
  const ok = resultadoInsercion(await supabase.rpc("insertarcategorias", p), "una categoría");
  if (ok) notificarExito("Categoría registrada");
  return ok;
}

export async function MostrarCategorias(p) {
  const { data, error } = await supabase
    .from("categorias")
    .select()
    .eq("id_empresa", p.id_empresa)
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function EliminarCategoria(p) {
  const { error } = await supabase.from("categorias").delete().eq("id", p.id);
  if (manejarError(error, "No se pudo eliminar la categoría")) return false;
  notificarExito("Categoría eliminada");
  return true;
}

export async function EditarCategorias(p) {
  const { error } = await supabase.from("categorias").update(p).eq("id", p.id);
  if (manejarError(error, "No se pudo editar la categoría")) return false;
  notificarExito("Categoría actualizada");
  return true;
}

export async function BuscarCategorias(p) {
  const { data, error } = await supabase
    .from("categorias")
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("descripcion", `%${p.descripcion}%`);
  if (error) throw error;
  return data ?? [];
}
