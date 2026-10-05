// Herramientas de lenguaje de Novandra esencial: normalizar, comparar palabras y
// reconocer períodos, productos, personas y sedes dentro de una pregunta.

export const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const VACIAS = new Set(
  "a al ante con de del el en la las lo los mi mis me para por que se su sus te tu un una unos unas y o es son hay ya muy mas como cual cuales cuanto cuantos esta este estos estas ese esa eso le les nos yo".split(" ")
);

// Palabras con contenido (sin artículos ni preposiciones).
export const palabras = (t) => normalizar(t).split(" ").filter((p) => p && !VACIAS.has(p));

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const f = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) f[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      f[i][j] = Math.min(f[i - 1][j] + 1, f[i][j - 1] + 1, f[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return f[a.length][b.length];
}

// "locion" ≈ "lociones", "gora" ≈ "gorra": misma raíz o un error de tecleo.
export function parecidas(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) return true;
  return a.length >= 4 && b.length >= 4 && distancia(a, b) <= 1;
}

// Qué tan parecidas son dos frases (0 a 1), por sus palabras con contenido.
export function similitud(a, b) {
  const pa = palabras(a);
  const pb = palabras(b);
  if (!pa.length || !pb.length) return 0;
  const comunes = pa.filter((x) => pb.some((y) => parecidas(x, y))).length;
  return comunes / Math.max(pa.length, pb.length);
}

// Palabras de las preguntas que no sirven para reconocer un producto.
const GENERICAS = new Set(
  "producto productos venta ventas vendo vende venden vendi vendido vendidos stock inventario existencias unidades semana semanas mes meses dia dias hoy ayer cuanto cuantos cuanta cuantas queda quedan tengo tenemos debo comprar pedir reabastecer agota agotar mejor mejores clientes cliente bodega bodegas sede sedes precio precios orden ordenes compra compras".split(" ")
);

// Busca el elemento de la lista cuyo nombre aparece en la pregunta.
// Devuelve { item, puntaje, empatados } o null. empatados: otros con el mismo puntaje
// (p. ej. "camisetas" coincide con varias camisetas).
export function buscarNombre(pregunta, lista, campo = "nombre") {
  const pq = palabras(pregunta).filter((p) => !GENERICAS.has(p));
  const textoQ = ` ${normalizar(pregunta)} `;
  const candidatos = [];
  for (const item of lista ?? []) {
    const nombre = normalizar(item[campo]);
    if (!nombre) continue;
    let puntaje;
    if (nombre.length >= 3 && textoQ.includes(` ${nombre} `)) puntaje = 2 + nombre.length / 100;
    else {
      const pn = palabras(nombre).filter((p) => p.length > 2 && !/^\d+$/.test(p));
      if (!pn.length) continue;
      const encontradas = pn.filter((p) => pq.some((q) => parecidas(p, q)));
      // Al menos una palabra distintiva (4+ letras).
      if (!encontradas.some((p) => p.length >= 4)) continue;
      const nucleo = encontradas.includes(pn[0]); // en español, la primera palabra suele ser el sustantivo
      if (encontradas.length / pn.length < 0.5 && encontradas.length < 2 && !nucleo) continue;
      puntaje = encontradas.length / pn.length + (nucleo ? 0.1 : 0);
    }
    candidatos.push({ item, puntaje });
  }
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => b.puntaje - a.puntaje);
  const mejor = candidatos[0];
  return { ...mejor, empatados: candidatos.filter((c) => mejor.puntaje - c.puntaje < 0.01).map((c) => c.item) };
}

const NUMEROS = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, treinta: 30 };

// Período de la pregunta en días. { dias, etiqueta, hoy?, ayer? } o null si no menciona ninguno.
export function periodo(pregunta) {
  const t = normalizar(pregunta);
  if (/\bhoy\b/.test(t)) return { dias: 1, etiqueta: "hoy", hoy: true };
  if (/\bayer\b/.test(t)) return { dias: 2, etiqueta: "ayer", ayer: true };
  const m = t.match(/\b(ultim[oa]s?|pasad[oa]s?|hace)?\s*(\d+|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|treinta)\s+(dia|dias|semana|semanas|mes|meses|ano|anos)\b/);
  if (m) {
    const n = Number(m[2]) || NUMEROS[m[2]] || 1;
    const unidad = m[3].startsWith("dia") ? 1 : m[3].startsWith("semana") ? 7 : m[3].startsWith("mes") ? 30 : 365;
    const dias = Math.min(n * unidad, 365);
    return { dias, etiqueta: `los últimos ${dias} días` };
  }
  if (/\bsemanas?\b|\bsemanal\b/.test(t)) return { dias: 7, etiqueta: "los últimos 7 días" };
  if (/\bquincena\b/.test(t)) return { dias: 15, etiqueta: "los últimos 15 días" };
  if (/\bmes\b|\bmensual\b/.test(t)) return { dias: 30, etiqueta: "los últimos 30 días" };
  if (/\btrimestre\b/.test(t)) return { dias: 90, etiqueta: "los últimos 90 días" };
  if (/\bsemestre\b/.test(t)) return { dias: 180, etiqueta: "los últimos 180 días" };
  if (/\b(este|el|del|ultimo) ano\b|\banual\b/.test(t)) return { dias: 365, etiqueta: "el último año" };
  return null;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// "2026-11-10" → "10 nov"
export function fechaCorta(iso) {
  if (!iso) return "";
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!a) return "";
  return `${d} ${MESES[m - 1]}`;
}

export function diaSemana(iso) {
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
}

export const porcentaje = (actual, anterior) => (anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null);
