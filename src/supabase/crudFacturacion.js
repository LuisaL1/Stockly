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

export async function MostrarEstadoNequi(idEmpresa) {
  const { data, error } = await supabase.rpc("estado_credenciales_nequi", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data ?? {};
}

export async function GuardarCredencialesNequi({ idEmpresa, clientId, clientSecret, apiKey, ambiente, codigoComercio }) {
  const { error } = await supabase.rpc("guardar_credenciales_nequi", {
    _id_empresa: idEmpresa,
    _client_id: clientId || null,
    _client_secret: clientSecret || null,
    _api_key: apiKey || null,
    _ambiente: ambiente,
    _codigo_comercio: codigoComercio || null,
  });
  return !manejarError(error, "No se pudieron guardar las credenciales de Nequi");
}

export async function GuardarConfigFacturacion(p) {
  const { error } = await supabase
    .from("config_facturacion")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "id_empresa" });
  if (manejarError(error, "No se pudo guardar la configuración de facturación")) return false;
  notificarExito("Configuración de facturación guardada");
  return true;
}

// ------------------------------------------------------------- Logo de la empresa

export async function SubirLogoEmpresa(idEmpresa, archivo) {
  const { prepararLogo } = await import("../utils/imagen");
  const { blob } = await prepararLogo(archivo);
  const ruta = `${idEmpresa}/logo.png`;
  const { error } = await supabase.storage
    .from("logos")
    .upload(ruta, blob, { upsert: true, contentType: "image/png", cacheControl: "60" });
  if (error) throw new Error(/bucket|not found/i.test(error.message) ? "Falta configurar el almacenamiento de logos en Supabase." : error.message);
  const { data } = supabase.storage.from("logos").getPublicUrl(ruta);
  // ?v= evita que el navegador muestre el logo anterior.
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: errorUrl } = await supabase.rpc("guardar_logo_empresa", { _id_empresa: idEmpresa, _url: url });
  if (errorUrl) throw errorUrl;
  return url;
}

export async function QuitarLogoEmpresa(idEmpresa) {
  await supabase.storage.from("logos").remove([`${idEmpresa}/logo.png`]);
  const { error } = await supabase.rpc("guardar_logo_empresa", { _id_empresa: idEmpresa, _url: null });
  if (error) throw error;
}
