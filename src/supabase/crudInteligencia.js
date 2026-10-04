import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Rotación, pronóstico y alertas por producto (calculado contra la propia empresa).
export async function MostrarRotacion({ idEmpresa, dias = 90, idSucursal = null }) {
  const { data, error } = await supabase.rpc("stockly_rotacion", {
    _id_empresa: idEmpresa,
    _dias: dias,
    _id_sucursal: idSucursal,
  });
  if (error) throw error;
  return data;
}

// Solo dueño o administradores (la base lo exige).
export async function MostrarResumenAuditoria({ idEmpresa, dias = 30 }) {
  const { data, error } = await supabase.rpc("stockly_auditoria_resumen", { _id_empresa: idEmpresa, _dias: dias });
  if (error) throw error;
  return data ?? [];
}

export async function MostrarAuditoria({ idEmpresa, idUsuario, soloAlertas, desde, limite = 300 }) {
  let q = supabase
    .from("auditoria")
    .select("id, id_usuario, usuario_nombre, accion, entidad, id_entidad, cantidad, detalle, alerta, fecha, bodegas(nombre), sucursales(nombre)")
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false })
    .limit(limite);
  if (idUsuario) q = q.eq("id_usuario", idUsuario);
  if (soloAlertas) q = q.not("alerta", "is", null);
  if (desde) q = q.gte("fecha", desde);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function MostrarConfigNovandra(idEmpresa) {
  const { data, error } = await supabase.from("novandra_config").select().eq("id_empresa", idEmpresa).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GuardarConfigNovandra(p) {
  const { error } = await supabase
    .from("novandra_config")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "id_empresa" });
  if (manejarError(error, "No se pudo guardar la configuración de Novandra")) return false;
  notificarExito("Permisos de Novandra actualizados");
  return true;
}
