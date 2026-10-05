import { supabase } from "./supabase.config";

// Guarda la solicitud y pide al servidor que la envíe por correo al equipo de Stockly.
// Devuelve el número de solicitud. Si el correo falla, la solicitud igual queda guardada.
export async function EnviarSolicitudSoporte({ idEmpresa, categoria, asunto, mensaje, contexto }) {
  const { data: id, error } = await supabase.rpc("crear_solicitud_soporte", {
    _id_empresa: idEmpresa,
    _categoria: categoria,
    _asunto: asunto,
    _mensaje: mensaje,
    _contexto: contexto,
  });
  if (error) throw error;
  const { error: errorCorreo } = await supabase.functions.invoke("soporte", { body: { id } });
  if (errorCorreo) console.warn("[Soporte] La solicitud quedó guardada, pero no se pudo enviar el correo:", errorCorreo.message);
  return id;
}
