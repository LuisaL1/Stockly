import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Unidades activas de la empresa (según su sector o lo que configuró) y la predeterminada.
export async function UnidadesEmpresa(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_unidades_empresa", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data;
}

export async function ConfigurarUnidades(idEmpresa, unidades, predeterminada) {
  const { data, error } = await supabase.rpc("stockly_config_unidades", { _id_empresa: idEmpresa, _unidades: unidades, _predeterminada: predeterminada ?? null });
  if (manejarError(error, "No se pudieron guardar las unidades")) return null;
  notificarExito("Unidades guardadas");
  return data;
}
