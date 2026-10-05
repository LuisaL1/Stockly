import { supabase } from "./supabase.config";

export async function InformeContable(idEmpresa, desde, hasta) {
  const { data, error } = await supabase.rpc("stockly_informe_contable", { _id_empresa: idEmpresa, _desde: desde, _hasta: hasta });
  if (error) throw error;
  return data;
}

export async function GuardarContador(idEmpresa, nombre, email) {
  const { error } = await supabase.rpc("guardar_contador", { _id_empresa: idEmpresa, _nombre: nombre, _email: email });
  if (error) throw error;
}

export async function HistorialInformes(idEmpresa) {
  const { data, error } = await supabase
    .from("informes_contador")
    .select("id, desde, hasta, email, enviado_por, created_at")
    .eq("id_empresa", idEmpresa)
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return data ?? [];
}

// Envía el Excel (en base64) al contador guardado en la configuración.
export async function EnviarInformeContador(p) {
  const { data, error } = await supabase.functions.invoke("informe-contador", { body: p });
  if (error) {
    // El servidor responde con un mensaje claro en el cuerpo del error.
    const detalle = await error.context?.json?.().catch(() => null);
    throw new Error(detalle?.error ?? "No se pudo enviar el informe. Intenta de nuevo.");
  }
  return data;
}
