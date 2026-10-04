import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";

export async function MostrarNotificaciones(idEmpresa, limite = 50) {
  const { data, error } = await supabase
    .from("notificaciones")
    .select()
    .eq("id_empresa", idEmpresa)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data ?? [];
}

export async function MarcarLeidas(ids) {
  if (!ids.length) return true;
  const { error } = await supabase.from("notificaciones").update({ leida: true }).in("id", ids);
  return !manejarError(error, "No se pudieron marcar las notificaciones");
}

export async function EliminarNotificacion(id) {
  const { error } = await supabase.from("notificaciones").delete().eq("id", id);
  return !manejarError(error, "No se pudo eliminar la notificación");
}

// Avisa en tiempo real cuando llega una notificación nueva. Devuelve la función para cancelar.
export function SuscribirNotificaciones(idEmpresa, alRecibir) {
  // Nombre único: la campana se monta en la barra de escritorio y en la móvil,
  // y Supabase no permite agregar escuchas a un canal ya suscrito con el mismo nombre.
  const canal = supabase
    .channel(`notificaciones-${idEmpresa}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notificaciones", filter: `id_empresa=eq.${idEmpresa}` },
      (payload) => alRecibir(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(canal);
}
