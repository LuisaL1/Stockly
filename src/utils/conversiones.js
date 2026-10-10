export function CovertirCapitalize(input = "") {
  const texto = input.trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

export function formatearNumero(valor, decimales = 0) {
  const numero = Number(valor ?? 0);
  if (!Number.isInteger(decimales)) decimales = 0;
  return numero.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function formatearMoneda(valor, simbolo = "$") {
  return `${simbolo}\u00A0${formatearNumero(valor, 2)}`;
}

export function formatearFecha(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// "10 oct, 14:32"
export function formatearFechaHora(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}

const relativo = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });

// "hace 5 minutos", "ayer"...
export function tiempoRelativo(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const segundos = Math.round((fecha.getTime() - Date.now()) / 1000);
  const unidades = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unidad, s] of unidades) {
    if (Math.abs(segundos) >= s) return relativo.format(Math.round(segundos / s), unidad);
  }
  return "hace un momento";
}

// Moneda sin decimales cuando el valor es entero (más legible en tarjetas).
export function formatearMonedaCorta(valor, simbolo = "$") {
  const n = Number(valor ?? 0);
  return `${simbolo}\u00A0${formatearNumero(n, Number.isInteger(n) ? 0 : 2)}`;
}
