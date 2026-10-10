// Opciones únicas a partir de una lista (por ejemplo, las categorías que existen en los productos).
export function opcionesDesde(lista, clave) {
  const vistos = new Map();
  for (const x of lista ?? []) {
    const v = x?.[clave];
    if (v && !vistos.has(v)) vistos.set(v, { id: v, descripcion: v });
  }
  return [...vistos.values()].sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
}
