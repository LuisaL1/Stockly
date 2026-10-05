// Intenciones que entiende Novandra esencial y cómo reconocerlas.
// claves: [expresión sobre el texto normalizado (sin tildes), peso].
// requiere: permiso necesario ("auditoria", "verCostos", "ordenes", "recordatorios").
import { normalizar, similitud } from "./texto";

export const INTENCIONES = [
  {
    id: "saludo",
    etiqueta: "Qué puedes hacer",
    claves: [
      [/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|holi)\b/, 4],
      [/(que (puedes|sabes) hacer|ayuda|como funcionas|que haces|para que sirves|como te uso)/, 6],
    ],
  },
  {
    id: "gracias",
    etiqueta: "Gracias",
    claves: [[/^(gracias|mil gracias|listo|perfecto|genial|vale|ok|super|excelente)\b/, 4]],
    soloCorta: true,
  },
  {
    id: "briefing",
    etiqueta: "Cómo va mi negocio",
    claves: [
      [/(como va (mi|el|nuestro) negocio|como estamos|como vamos en general|resumen general|que debo saber|novedades|panorama|estado del negocio|que hay de nuevo|reporte general|dame un resumen|como va todo|como amanecimos)/, 7],
      [/\b(resumen|briefing|balance)\b/, 3],
    ],
  },
  {
    id: "resumen_ventas",
    etiqueta: "Resumen de ventas",
    claves: [
      [/\b(ventas?|vend[ií]|vendi|vendimos|vendido|facture|facturamos|facturado|facturacion|ingresos?|ganancias?|recaudo)\b/, 3],
      [/(como (van|vamos|voy|vas|estoy|me fue|nos fue|fue)|cuanto (llevo|llevamos|hice|hicimos|vendi|vendimos|entro|ha entrado))/, 5],
    ],
  },
  {
    id: "reabastecer",
    etiqueta: "Qué debo reabastecer",
    claves: [
      [/(reabastec|reponer|repongo|reposicion|resurt|surtir|abastec|que (debo|tengo que|hay que|toca) (pedir|comprar)|que pido|que compro|se (va|van) a agotar|por agotarse|agotad|agotar|me falta|faltan|quedando sin|hacer pedido)/, 5],
      [/\b(pedir|comprar|pedido)\b/, 2],
    ],
  },
  {
    id: "crear_orden",
    etiqueta: "Preparar una orden de compra",
    requiere: "ordenes",
    claves: [
      [/(prepara|preparar|crea|crear|haz|hacer|genera|generar|arma|armar|monta)\w* (una |la |un )?(orden|pedido|borrador)/, 7],
      [/orden(es)? de compra/, 2],
    ],
  },
  {
    id: "bajo_minimo",
    etiqueta: "Productos bajo el mínimo",
    claves: [[/(bajo (el |su )?minimo|stock bajo|poco stock|por debajo del minimo|debajo del minimo|stock minimo|bajos? de stock)/, 6]],
  },
  {
    id: "stock_producto",
    etiqueta: "Stock de un producto",
    claves: [
      [/(cuant[oa]s? (hay|queda|quedan|tengo|tenemos|tienes|unidades)|stock de|existencias? de|inventario de|donde (esta|estan|hay|tengo)|hay de|me quedan|nos quedan|disponible)/, 4],
      [/\b(stock|existencias|unidades|inventario)\b/, 1],
    ],
    usaProducto: 4,
  },
  {
    id: "mas_vendidos",
    etiqueta: "Productos más vendidos",
    claves: [[/(mas vendid|top|lo que mas (se )?vend|estrella|mejores productos|mas se vende|mas salida|mas rota|mas exitos|mas piden|mas buscan|mejor se vende)/, 6]],
  },
  {
    id: "sin_movimiento",
    etiqueta: "Inventario quieto",
    claves: [
      [/(no se (vende|venden|mueve|mueven)|no (se )?ha(n)? vendido|quiet|sin movimiento|estancad|sobrestock|sobre stock|exceso|parad|no rota|baja rotacion|muert|lento|lentos|no sale|no salen|capital (quieto|inmovilizado|parado))/, 6],
    ],
  },
  {
    id: "pronostico",
    etiqueta: "Pronóstico de ventas",
    claves: [
      [/(pronostic|cuando se (agota|acaba|termina)|proyecc|prever|cuanto (voy a|vamos a|se va a|se van a) vender|demanda|predic|me alcanza|alcanza para|cuanto dura|cuantos dias)/, 6],
    ],
    usaProducto: 3,
  },
  {
    id: "patrones",
    etiqueta: "Días y horas fuertes",
    claves: [
      [/(mejor dia|dia mas|que dia|dias? (fuertes?|flojos?)|a que hora|que hora|horario|horas? (pico|fuertes?)|cuando vendo mas|cuando se vende mas|patron|patrones|temporada|ritmo|habitos)/, 6],
    ],
  },
  {
    id: "combos",
    etiqueta: "Productos que se venden juntos",
    claves: [[/(junto|juntos|combo|combos|combina|acompan|venta cruzada|cruzad|tambien (compran|llevan)|que mas (compran|llevan))/, 7]],
  },
  {
    id: "clientes",
    etiqueta: "Mis mejores clientes",
    claves: [[/\b(clientes?|compradores?|recurrentes?|fieles?|quien (me )?compra( mas)?)\b/, 5]],
  },
  {
    id: "valor_inventario",
    etiqueta: "Valor del inventario",
    requiere: "verCostos",
    claves: [[/(cuanto vale|valor (del |de mi |de nuestro )?inventario|inventario valorizado|inventario valorado|capital en inventario|plata (en|invertida)|dinero en inventario|margen|rentabilidad|ganancia potencial)/, 6]],
  },
  {
    id: "ordenes",
    etiqueta: "Órdenes de compra pendientes",
    claves: [
      [/(ordenes?( de compra)? (pendiente|abierta|enviada|en camino|por recibir)|estado de (las |mis )?orden|compras pendientes|que (he|hemos) pedido|pedidos pendientes|que (orden|ordenes) (hay|tengo))/, 6],
    ],
  },
  {
    id: "sucursales",
    etiqueta: "Ventas por sede",
    claves: [[/\b(sucursal|sucursales|sede|sedes|locales|cada tienda|por tienda|por local)\b/, 5]],
  },
  {
    id: "metodos_pago",
    etiqueta: "Cómo me pagan",
    claves: [
      [/(metodos? de pago|medios? de pago|formas? de pago|como (me |nos )?pagan|con que (me |nos )?pagan)/, 7],
      [/\b(efectivo|tarjeta|transferencia|bre b|nequi|daviplata|datafono)\b/, 4],
    ],
  },
  {
    id: "auditoria",
    etiqueta: "Actividad del equipo",
    requiere: "auditoria",
    claves: [
      [/(auditori|empleados?|equipo|trabajador|vendedor|cajer|sospech|robo|roban|robando|falta(nte)? (de )?mercancia|quien (hizo|registro|saco|movio|vendio|anulo|borro|elimino)|que hizo|alertas? del equipo|movimientos raros|irregular)/, 6],
    ],
  },
  {
    id: "ayuda_app",
    etiqueta: "Cómo usar Stockly",
    claves: [
      [/^(como|donde|en donde|de que forma|que pasos)\b.*\b(hago|hacer|puedo|se hace|se puede|configuro|configurar|registro|registrar|agrego|agregar|creo|crear|cambio|cambiar|elimino|eliminar|borro|borrar|anulo|anular|importo|importar|subo|subir|exporto|exportar|invito|agrego|activo|activar|conecto|conectar|cobro|cobrar|envio|enviar|veo|ver|traslado|trasladar|recibo|recibir|ajusto|ajustar|corrijo|corregir|descargo|descargar|pongo|poner|quito|quitar|uso|usar|funciona)\b/, 7],
      [/^(como|donde|en donde)\b/, 4],
      [/\b(anular|anulo|importar|importo|exportar|trasladar|invitar|configurar|conectar|excel|plantilla|tutorial)\b/, 4],
      [/\b(tutorial|guia|guias|paso a paso|instrucciones|manual|ayuda con)\b/, 5],
    ],
  },
  {
    id: "recordatorio",
    etiqueta: "Dejar un recordatorio",
    requiere: "recordatorios",
    claves: [[/(recuerda|recordatorio|recordar|avisa(le)? al equipo|nota para el equipo|deja(r)? (una )?nota|anota)/, 7]],
  },
];

const POR_ID = Object.fromEntries(INTENCIONES.map((i) => [i.id, i]));
export const intencion = (id) => POR_ID[id];

// Puntúa cada intención para la pregunta. aprendidas: [{ frase, intencion, usos }] de la empresa.
export function clasificar(pregunta, { aprendidas = [], hayProducto = false } = {}) {
  const t = normalizar(pregunta);
  const corta = t.split(" ").length <= 4;
  const puntajes = {};
  for (const i of INTENCIONES) {
    if (i.soloCorta && !corta) continue;
    let p = 0;
    for (const [re, peso] of i.claves) if (re.test(t)) p += peso;
    if (hayProducto && i.usaProducto && p > 0) p += i.usaProducto;
    if (p > 0) puntajes[i.id] = p;
  }
  // Lo aprendido de la empresa pesa más que las reglas generales.
  for (const a of aprendidas) {
    const s = a.frase === t ? 1 : similitud(a.frase, t);
    if (s >= 0.7 && POR_ID[a.intencion]) puntajes[a.intencion] = (puntajes[a.intencion] ?? 0) + 8 * s + Math.min(a.usos, 5) * 0.2;
  }
  // Un producto mencionado sin otra pista suele ser una pregunta de stock.
  if (hayProducto && !Object.keys(puntajes).length) puntajes.stock_producto = 3;

  return Object.entries(puntajes)
    .map(([id, puntaje]) => ({ id, puntaje }))
    .sort((a, b) => b.puntaje - a.puntaje);
}
