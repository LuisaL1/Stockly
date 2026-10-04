import { supabase } from "./supabase.config";
import { manejarError, resultadoInsercion } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function InsertarMarca(p) {
  const ok = resultadoInsercion(await supabase.rpc("insertarmarca", p), "una marca");
  if (ok) notificarExito("Marca registrada");
  return ok;
}

export async function MostrarMarca(p) {
  const { data, error } = await supabase
    .from("marca")
    .select()
    .eq("id_empresa", p.id_empresa)
    .order("id", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function EliminarMarca(p) {
  const { error } = await supabase.from("marca").delete().eq("id", p.id);
  if (manejarError(error, "No se pudo eliminar la marca")) return false;
  notificarExito("Marca eliminada");
  return true;
}

export async function EditarMarca(p) {
  const { error } = await supabase.from("marca").update(p).eq("id", p.id);
  if (manejarError(error, "No se pudo editar la marca")) return false;
  notificarExito("Marca actualizada");
  return true;
}

export async function BuscarMarca(p) {
  const { data, error } = await supabase
    .from("marca")
    .select()
    .eq("id_empresa", p.id_empresa)
    .ilike("descripcion", `%${p.descripcion}%`);
  if (error) throw error;
  return data ?? [];
}
