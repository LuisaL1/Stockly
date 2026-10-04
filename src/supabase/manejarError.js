import { notificarError } from "../utils/notificaciones";

// Muestra el error de Supabase al usuario y lo deja en consola para depurar.
export function manejarError(error, mensaje) {
  if (!error) return false;
  console.error(`[Supabase] ${mensaje}:`, error);
  notificarError(mensaje, error.message);
  return true;
}

// Interpreta la respuesta de las funciones RPC "insertar*" que devuelven
// "insertado" o "duplicado".
export function resultadoInsercion({ data, error }, entidad) {
  if (manejarError(error, `No se pudo registrar ${entidad}`)) return false;
  if (data === "duplicado") {
    notificarError(`Ya existe ${entidad} con ese nombre`);
    return false;
  }
  return true;
}
