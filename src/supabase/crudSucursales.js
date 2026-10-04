import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarSucursales(idEmpresa) {
  const { data, error } = await supabase.from("sucursales").select().eq("id_empresa", idEmpresa).order("id");
  if (error) throw error;
  return data ?? [];
}

export async function InsertarSucursal(p) {
  const { error } = await supabase.from("sucursales").insert(p);
  if (manejarError(error, "No se pudo crear la sucursal")) return false;
  notificarExito("Sucursal creada");
  return true;
}

export async function EditarSucursal({ id, ...cambios }) {
  const { error } = await supabase.from("sucursales").update(cambios).eq("id", id);
  if (manejarError(error, "No se pudo editar la sucursal")) return false;
  notificarExito("Sucursal actualizada");
  return true;
}

export async function EliminarSucursal({ id }) {
  const { error } = await supabase.from("sucursales").delete().eq("id", id);
  if (manejarError(error, "No se pudo eliminar la sucursal")) return false;
  notificarExito("Sucursal eliminada");
  return true;
}
