import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Llena la empresa con un negocio de ejemplo (solo si aún no tiene ventas).
export async function CargarDatosDemo() {
  const { data, error } = await supabase.rpc("stockly_cargar_demo");
  if (manejarError(error, "No se pudieron cargar los datos de ejemplo")) return null;
  notificarExito(`Listo: ${data.productos} productos y ${data.ventas} ventas de ejemplo`);
  return data;
}
