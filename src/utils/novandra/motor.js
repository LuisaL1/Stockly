// Motor de Novandra esencial: entiende la pregunta, decide qué consultar y responde
// con los datos de la empresa, sin API externa. Recuerda el tema de la conversación
// (para preguntas como "¿y el mes pasado?") y aprende las frases de cada empresa.
import { formatearMonedaCorta } from "../conversiones";
import { INTENCIONES, clasificar, intencion } from "./intenciones";
import { RESPUESTAS } from "./respuestas";
import { buscarNombre, normalizar, periodo } from "./texto";

const ESTADOS = {
  briefing: "Revisando tu negocio",
  resumen_ventas: "Revisando tus ventas",
  reabastecer: "Analizando la rotación de tus productos",
  crear_orden: "Calculando qué pedir",
  bajo_minimo: "Revisando productos bajo mínimo",
  stock_producto: "Consultando el stock",
  mas_vendidos: "Buscando los más vendidos",
  sin_movimiento: "Buscando inventario quieto",
  pronostico: "Proyectando la demanda",
  patrones: "Buscando los patrones de tu negocio",
  combos: "Buscando productos que se venden juntos",
  clientes: "Revisando tus clientes",
  valor_inventario: "Calculando el valor del inventario",
  ordenes: "Revisando órdenes de compra",
  sucursales: "Comparando sedes",
  metodos_pago: "Revisando medios de pago",
  auditoria: "Revisando la auditoría",
  recordatorio: "Dejando el recordatorio",
  ayuda_app: "Buscando en las guías",
};

const SUGERENCIAS_BASE = ["briefing", "reabastecer", "resumen_ventas", "combos"];

// Qué puede hacer quien pregunta, según su rol y lo que autorizó el dueño.
export function permisosDe(perfil) {
  const admin = !!perfil?.admin;
  const cfg = perfil?.config;
  return {
    admin,
    usar: admin || cfg?.empleados_pueden_usar !== false,
    verCostos: admin || cfg?.empleados_ven_costos === true,
    ordenes: cfg?.puede_crear_ordenes !== false,
    recordatorios: cfg?.puede_crear_recordatorios !== false,
    auditoria: admin && cfg?.auditoria_activa !== false,
  };
}

const permitida = (id, permisos) => {
  const req = intencion(id)?.requiere;
  return !req || permisos[req];
};

const NO_AUTORIZADO = {
  auditoria: "La auditoría del equipo solo la puede consultar el dueño o un administrador.",
  verCostos: "Los costos y el valor del inventario no están habilitados para tu usuario. El dueño puede activarlo en Permisos de Novandra.",
  ordenes: "El dueño no ha autorizado a Novandra a preparar órdenes de compra. Puedes crearla en Compras.",
  recordatorios: "El dueño no ha autorizado a Novandra a dejar recordatorios.",
};

/**
 * Responde una pregunta.
 * @returns {Promise<{ memoria, acciones, sugerencias, aclaraciones }>}
 *   memoria: estado de la conversación para la siguiente pregunta.
 */
export async function responderEsencial({ pregunta, contexto, perfil, catalogo, memoria = {}, forzar, alEvento }) {
  const permisos = permisosDe(perfil);
  const emitir = (texto) => alEvento({ tipo: "texto", delta: texto });

  if (!permisos.usar) {
    emitir("El dueño de tu empresa no ha habilitado Novandra para empleados.");
    return { memoria };
  }

  const t = normalizar(pregunta);
  const coincidencia = buscarNombre(pregunta, catalogo);
  const porCodigo = catalogo?.find((p) => p.codigointerno && ` ${t} `.includes(` ${normalizar(p.codigointerno)} `));
  const entidades = {
    periodo: periodo(pregunta),
    producto: porCodigo ?? coincidencia?.item ?? null,
    productos: porCodigo ? [porCodigo] : (coincidencia?.empatados ?? []),
    sucursal: (perfil?.sucursales?.length ?? 0) > 1 ? (buscarNombre(pregunta, perfil.sucursales)?.item ?? null) : null,
  };

  let id = forzar;
  if (!id) {
    // Respuesta a "¿de qué producto?".
    if (memoria.esperaProducto && entidades.producto) id = memoria.ultima;
  }
  if (!id) {
    const candidatos = clasificar(pregunta, { aprendidas: perfil?.aprendidas, hayProducto: !!entidades.producto });
    const mejor = candidatos[0];
    const seguimiento = /^(y|e|tambien|ahora|igual|lo mismo)\b/.test(t) || t.split(" ").length <= 4;
    const hayDato = entidades.periodo || entidades.producto || entidades.sucursal;
    if ((!mejor || mejor.puntaje < 3) && memoria.ultima && hayDato && seguimiento) {
      // "¿Y la semana pasada?", "¿y en la sede norte?": mismo tema, otro dato.
      id = memoria.ultima;
      if (!entidades.periodo) entidades.periodo = memoria.entidades?.periodo ?? null;
      if (!entidades.sucursal) entidades.sucursal = memoria.entidades?.sucursal ?? null;
    } else if (!mejor || mejor.puntaje < 3) {
      // No entendí: pido que aclare y lo aprendo cuando elija.
      const opciones = [...candidatos.map((c) => c.id), ...SUGERENCIAS_BASE]
        .filter((x, i, arr) => arr.indexOf(x) === i && !["saludo", "gracias"].includes(x) && permitida(x, permisos))
        .slice(0, 4);
      emitir(
        "No estoy segura de qué necesitas. ¿Te refieres a alguna de estas opciones? Elige una y la recordaré para la próxima vez que preguntes así."
      );
      return {
        memoria: { ...memoria, pendienteAclarar: pregunta },
        aclaraciones: opciones.map((x) => ({ intencion: x, descripcion: intencion(x).etiqueta })),
      };
    } else id = mejor.id;
  }

  if (!permitida(id, permisos)) {
    emitir(NO_AUTORIZADO[intencion(id).requiere] ?? "Esa consulta no está autorizada para tu usuario.");
    return { memoria: { ...memoria, ultima: id, entidades, esperaProducto: false } };
  }

  alEvento({ tipo: "estado", texto: ESTADOS[id] ?? "Consultando" });
  const ctx = {
    ...contexto,
    pregunta,
    preguntaNormal: t,
    entidades,
    permisos,
    esMax: !!perfil?.plan?.novandra_ia,
    dinero: (x) => formatearMonedaCorta(Math.round(Number(x ?? 0)), contexto.moneda ?? "$"),
  };
  const r = await RESPUESTAS[id](ctx);
  emitir(r.texto);
  return {
    memoria: { ultima: id, entidades, esperaProducto: !!r.esperaProducto },
    acciones: r.acciones ?? [],
    sugerencias: (r.sugerencias ?? []).slice(0, 3),
  };
}

export const OPCIONES_NOVANDRA = INTENCIONES.filter((i) => !["saludo", "gracias"].includes(i.id));
