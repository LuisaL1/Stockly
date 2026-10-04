import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function InsertarKardex(p) {
  const { error } = await supabase.from("kardex").insert(p);
  if (manejarError(error, "No se pudo registrar el movimiento")) return false;
  notificarExito(`${p.tipo} registrada`);
  return true;
}

export async function MostrarKardex(p) {
  const { data, error } = await supabase.rpc("mostrarkardexempresa", p);
  if (error) throw error;
  return data ?? [];
}

export async function EliminarKardex(p) {
  const { error } = await supabase.from("kardex").delete().eq("id", p.id);
  if (manejarError(error, "No se pudo anular el movimiento")) return false;
  notificarExito("Movimiento anulado");
  return true;
}

export async function EditarKardex(p) {
  const { error } = await supabase.from("kardex").update(p).eq("id", p.id);
  if (manejarError(error, "No se pudo editar el movimiento")) return false;
  return true;
}

export async function BuscarKardex(p) {
  const { data, error } = await supabase.rpc("buscarkardexempresa", p);
  if (error) throw error;
  return data ?? [];
}
