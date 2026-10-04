import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarConfigFacturacion(idEmpresa) {
  const { data, error } = await supabase.from("config_facturacion").select().eq("id_empresa", idEmpresa).maybeSingle();
  if (error) throw error;
  return data;
}

// Las llaves privadas nunca se leen de vuelta: solo se sabe si están configuradas.
export async function MostrarEstadoWompi(idEmpresa) {
  const { data, error } = await supabase.rpc("estado_credenciales_wompi", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data ?? {};
}

export async function GuardarCredencialesWompi({ idEmpresa, llavePrivada, secretoEventos }) {
  const { error } = await supabase.rpc("guardar_credenciales_wompi", {
    _id_empresa: idEmpresa,
    _llave_privada: llavePrivada || null,
    _secreto_eventos: secretoEventos || null,
  });
  return !manejarError(error, "No se pudieron guardar las llaves de Wompi");
}

export async function GuardarConfigFacturacion(p) {
  const { error } = await supabase
    .from("config_facturacion")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "id_empresa" });
  if (manejarError(error, "No se pudo guardar la configuración de facturación")) return false;
  notificarExito("Configuración de facturación guardada");
  return true;
}
