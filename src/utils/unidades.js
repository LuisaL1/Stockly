import { formatearNumero } from "./conversiones";

// Catálogo de unidades (debe coincidir con stockly_unidades en la base de datos).
export const UNIDADES = [
  { id: "und", nombre: "Unidad", plural: "Unidades", abrev: "und", decimales: false },
  { id: "par", nombre: "Par", plural: "Pares", abrev: "par", decimales: false },
  { id: "docena", nombre: "Docena", plural: "Docenas", abrev: "doc", decimales: false },
  { id: "paquete", nombre: "Paquete", plural: "Paquetes", abrev: "paq", decimales: false },
  { id: "caja", nombre: "Caja", plural: "Cajas", abrev: "caja", decimales: false },
  { id: "frasco", nombre: "Frasco", plural: "Frascos", abrev: "fco", decimales: false },
  { id: "botella", nombre: "Botella", plural: "Botellas", abrev: "bot", decimales: false },
  { id: "sobre", nombre: "Sobre", plural: "Sobres", abrev: "sob", decimales: false },
  { id: "rollo", nombre: "Rollo", plural: "Rollos", abrev: "rollo", decimales: false },
  { id: "g", nombre: "Gramo", plural: "Gramos", abrev: "g", decimales: true },
  { id: "kg", nombre: "Kilogramo", plural: "Kilogramos", abrev: "kg", decimales: true },
  { id: "lb", nombre: "Libra", plural: "Libras", abrev: "lb", decimales: true },
  { id: "ml", nombre: "Mililitro", plural: "Mililitros", abrev: "ml", decimales: true },
  { id: "l", nombre: "Litro", plural: "Litros", abrev: "l", decimales: true },
  { id: "galon", nombre: "Galón", plural: "Galones", abrev: "gal", decimales: true },
  { id: "cm", nombre: "Centímetro", plural: "Centímetros", abrev: "cm", decimales: true },
  { id: "m", nombre: "Metro", plural: "Metros", abrev: "m", decimales: true },
  { id: "m2", nombre: "Metro cuadrado", plural: "Metros cuadrados", abrev: "m²", decimales: true },
];

export const unidad = (id) => UNIDADES.find((u) => u.id === (id || "und")) ?? UNIDADES[0];
export const abrev = (id) => unidad(id).abrev;
export const permiteDecimales = (id) => unidad(id).decimales;

// "14 und", "250 g", "1,5 l"
export function cantidadConUnidad(n, id) {
  const u = unidad(id);
  const v = Number(n ?? 0);
  return `${formatearNumero(v, u.decimales && !Number.isInteger(v) ? 2 : 0)} ${u.abrev}`;
}

// "3 frascos", "1 par", "250 gramos" (para textos de Novandra y mensajes)
export function cantidadEnPalabras(n, id) {
  const u = unidad(id);
  const v = Number(n ?? 0);
  const texto = formatearNumero(v, u.decimales && !Number.isInteger(v) ? 2 : 0);
  if (u.decimales) return `${texto} ${u.abrev}`;
  return `${texto} ${v === 1 ? u.nombre.toLowerCase() : u.plural.toLowerCase()}`;
}
