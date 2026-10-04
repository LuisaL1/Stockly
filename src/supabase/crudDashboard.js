import { supabase } from "./supabase.config";

export async function MostrarDashboard(idEmpresa, dias = 30, idSucursal = null) {
  // El filtro de sucursal solo se envía si se eligió una: así también funciona con la
  // versión anterior de la función (antes de la migración de inteligencia).
  const parametros = { _id_empresa: idEmpresa, _dias: dias };
  if (idSucursal) parametros._id_sucursal = idSucursal;
  const { data, error } = await supabase.rpc("stockly_dashboard", parametros);
  if (error) throw error;
  return data;
}
