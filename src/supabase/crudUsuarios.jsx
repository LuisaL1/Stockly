import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";
import { ObtenerIdAuthSupabase } from "./globalSupabase";

export async function InsertarUsuarios(p) {
  const { data, error } = await supabase.from("Usuarios").insert(p).select().maybeSingle();
  if (manejarError(error, "No se pudo registrar el usuario")) return null;
  return data;
}

export async function MostrarUsuarios() {
  const idAuthSupabase = await ObtenerIdAuthSupabase();
  if (!idAuthSupabase) return null;
  const { data, error } = await supabase
    .from("Usuarios")
    .select()
    .eq("idauth", idAuthSupabase)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function MostrarUsuariosTodos(p) {
  const { data, error } = await supabase.rpc("mostrarpersonal", p);
  if (error) throw error;
  return data ?? [];
}

export async function EliminarUsuarios(p) {
  const { error } = await supabase.from("Usuarios").delete().eq("id", p.id);
  if (manejarError(error, "No se pudo eliminar el usuario")) return false;
  notificarExito("Usuario eliminado");
  return true;
}

export async function EditarUsuarios(p) {
  const { error } = await supabase.from("Usuarios").update(p).eq("id", p.id);
  if (manejarError(error, "No se pudo editar el usuario")) return false;
  notificarExito("Usuario actualizado");
  return true;
}

export async function BuscarUsuarios(p) {
  const { data, error } = await supabase.rpc("buscarpersonal", p);
  if (error) throw error;
  return data ?? [];
}

// tabla asignarempresa
export async function InsertarAsignaciones(p) {
  const { error } = await supabase.from("asignarempresa").insert(p);
  return !manejarError(error, "No se pudo asignar el usuario a la empresa");
}

// tabla permisos
export async function InsertarPermisos(p) {
  const { error } = await supabase.from("permisos").insert(p);
  return !manejarError(error, "No se pudieron guardar los permisos");
}

export async function MostrarPermisos(p) {
  const { data, error } = await supabase
    .from("permisos")
    .select("id, id_usuario, idmodulo, modulos(nombre)")
    .eq("id_usuario", p.id_usuario);
  if (error) throw error;
  return data ?? [];
}

export async function EliminarPermisos(p) {
  const { error } = await supabase.from("permisos").delete().eq("id_usuario", p.id_usuario);
  return !manejarError(error, "No se pudieron actualizar los permisos");
}

export async function MostrarModulos() {
  const { data, error } = await supabase.from("modulos").select();
  if (error) throw error;
  return data ?? [];
}
