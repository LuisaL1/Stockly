// Registros que crea el sistema por defecto y no se deben editar ni eliminar.
const VALORES_POR_DEFECTO = ["generica", "genérica", "general"];

export function esValorPorDefecto(descripcion = "") {
  return VALORES_POR_DEFECTO.includes(descripcion.trim().toLowerCase());
}
