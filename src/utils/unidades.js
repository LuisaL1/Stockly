import { formatearNumero } from "./conversiones";

// Unidades de medida: cómo se cuenta o mide el stock (deben coincidir con stockly_unidades).
export const UNIDADES = [
  { id: "und", nombre: "Unidad", plural: "Unidades", abrev: "und", decimales: false },
  { id: "par", nombre: "Par", plural: "Pares", abrev: "par", decimales: false },
  { id: "docena", nombre: "Docena", plural: "Docenas", abrev: "doc", decimales: false },
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

// Presentación: cómo viene el producto cuando se cuenta por piezas (deben coincidir con stockly_presentaciones).
export const PRESENTACIONES = [
  { id: "frasco", nombre: "Frasco", plural: "Frascos" },
  { id: "botella", nombre: "Botella", plural: "Botellas" },
  { id: "caja", nombre: "Caja", plural: "Cajas" },
  { id: "paquete", nombre: "Paquete", plural: "Paquetes" },
  { id: "bolsa", nombre: "Bolsa", plural: "Bolsas" },
  { id: "sobre", nombre: "Sobre", plural: "Sobres" },
  { id: "lata", nombre: "Lata", plural: "Latas" },
  { id: "tarro", nombre: "Tarro", plural: "Tarros" },
  { id: "tubo", nombre: "Tubo", plural: "Tubos" },
  { id: "blister", nombre: "Blíster", plural: "Blísters" },
  { id: "rollo", nombre: "Rollo", plural: "Rollos" },
  { id: "bulto", nombre: "Bulto", plural: "Bultos" },
  { id: "kit", nombre: "Kit", plural: "Kits" },
  { id: "pieza", nombre: "Pieza", plural: "Piezas" },
];

export const unidad = (id) => UNIDADES.find((u) => u.id === (id || "und")) ?? UNIDADES[0];
export const presentacion = (id) => PRESENTACIONES.find((p) => p.id === id) ?? null;
export const abrev = (id) => unidad(id).abrev;
export const permiteDecimales = (id) => unidad(id).decimales;
// Solo lo que se cuenta por piezas puede tener presentación.
export const admitePresentacion = (id) => !unidad(id).decimales;

const numero = (v, u) => formatearNumero(v, u.decimales && !Number.isInteger(v) ? 2 : 0);

// "14 und", "12 frascos", "250 g", "1,5 l". Acepta (n, unidad, presentacion) o (n, producto).
export function cantidadConUnidad(n, idUnidad, idPresentacion) {
  if (idUnidad && typeof idUnidad === "object") {
    idPresentacion = idUnidad.presentacion;
    idUnidad = idUnidad.unidad;
  }
  const v = Number(n ?? 0);
  const u = unidad(idUnidad);
  const p = !u.decimales ? presentacion(idPresentacion) : null;
  if (p) return `${numero(v, u)} ${v === 1 ? p.nombre.toLowerCase() : p.plural.toLowerCase()}`;
  return `${numero(v, u)} ${u.abrev}`;
}

// "3 frascos de 100 ml", "2 pares", "250 g" (para Novandra y mensajes)
export function cantidadEnPalabras(n, idUnidad, idPresentacion, contenido, contenidoUnidad) {
  if (idUnidad && typeof idUnidad === "object") {
    const p = idUnidad;
    return cantidadEnPalabras(n, p.unidad, p.presentacion, p.contenido, p.contenido_unidad);
  }
  const v = Number(n ?? 0);
  const u = unidad(idUnidad);
  const p = !u.decimales ? presentacion(idPresentacion) : null;
  if (p) {
    const base = `${numero(v, u)} ${v === 1 ? p.nombre.toLowerCase() : p.plural.toLowerCase()}`;
    return contenido ? `${base} de ${contenidoTexto(contenido, contenidoUnidad)}` : base;
  }
  if (u.decimales) return `${numero(v, u)} ${u.abrev}`;
  return `${numero(v, u)} ${v === 1 ? u.nombre.toLowerCase() : u.plural.toLowerCase()}`;
}

// "100 ml", "500 g", "12 und"
export function contenidoTexto(contenido, idUnidad) {
  if (contenido == null || contenido === "") return "";
  const u = unidad(idUnidad);
  return `${numero(Number(contenido), u)} ${u.abrev}`;
}

// Texto secundario del producto: "Frasco · 100 ml", "Caja · 12 und", "Por kg".
export function etiquetaPresentacion(p) {
  if (!p) return "";
  const pr = presentacion(p.presentacion);
  if (pr) return p.contenido ? `${pr.nombre} · ${contenidoTexto(p.contenido, p.contenido_unidad)}` : pr.nombre;
  const u = unidad(p.unidad);
  return u.id === "und" ? "" : `Por ${u.nombre.toLowerCase()}`;
}
