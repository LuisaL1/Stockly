import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarPlanes() {
  const { data, error } = await supabase.from("stockly_planes").select().order("orden");
  if (error) throw error;
  return data ?? [];
}

export async function MostrarSuscripcion(idEmpresa) {
  const { data, error } = await supabase.from("stockly_suscripciones").select().eq("id_empresa", idEmpresa).maybeSingle();
  if (error) throw error;
  return data;
}

export async function MostrarUsoPlan(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_uso_plan", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data ?? {};
}

export async function MostrarHistorialSuscripcion(idEmpresa) {
  const { data, error } = await supabase
    .from("historial_suscripcion")
    .select()
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function CambiarPlan({ idEmpresa, idPlan, ciclo }) {
  const { error } = await supabase.rpc("cambiar_plan", { _id_empresa: idEmpresa, _id_plan: idPlan, _ciclo: ciclo });
  if (manejarError(error, "No se pudo cambiar el plan")) return false;
  notificarExito("Plan actualizado");
  return true;
}
