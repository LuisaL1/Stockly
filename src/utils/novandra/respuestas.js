// Respuestas de Novandra esencial: consultan los datos de la empresa y redactan
// el análisis con reglas (sin modelo de lenguaje). Cada una devuelve
// { texto, acciones?, sugerencias? }.
import {
  AuditoriaPersona,
  BajoMinimo,
  CrearRecordatorio,
  Dashboard,
  OrdenesAbiertas,
  Patrones,
  ResumenAuditoria,
  Rotacion,
  StockProducto,
} from "../../supabase/crudNovandraEsencial";
import { formatearNumero } from "../conversiones";
import { NombresMetodo } from "../dataEstatica";
import { DIAS_SEMANA, buscarNombre, diaSemana, fechaCorta, porcentaje } from "./texto";
import { GUIAS, buscarGuias } from "../guias";

const n = (x, d = 0) => formatearNumero(Number(x ?? 0), d);
const lista = (items) => items.map((i) => `- ${i}`).join("\n");
const tabla = (encabezados, filas) =>
  [`| ${encabezados.join(" | ")} |`, `| ${encabezados.map(() => "---").join(" | ")} |`, ...filas.map((f) => `| ${f.join(" | ")} |`)].join("\n");
const variacion = (pct, comparado) =>
  pct == null ? "" : pct === 0 ? ` Igual que ${comparado}.` : ` **${pct > 0 ? "+" : ""}${pct}%** frente a ${comparado}.`;
const dondeSede = (ctx) => (ctx.entidades.sucursal ? ` en **${ctx.entidades.sucursal.nombre}**` : "");

// Las consultas pesadas se reutilizan durante la conversación (2 minutos).
const cache = new Map();
function memo(clave, fn) {
  const e = cache.get(clave);
  if (e && Date.now() - e.t < 120_000) return e.p;
  const p = fn().catch((err) => {
    cache.delete(clave);
    throw err;
  });
  cache.set(clave, { t: Date.now(), p });
  return p;
}
export const limpiarCache = () => cache.clear();
const rotacion = (ctx) => memo(`rot-${ctx.idEmpresa}-${ctx.entidades.sucursal?.id ?? ""}`, () => Rotacion(ctx.idEmpresa, 90, ctx.entidades.sucursal?.id ?? null));
const panel = (ctx, dias) => memo(`dash-${ctx.idEmpresa}-${dias}-${ctx.entidades.sucursal?.id ?? ""}`, () => Dashboard(ctx.idEmpresa, dias, ctx.entidades.sucursal?.id));
const patrones = (ctx) => memo(`pat-${ctx.idEmpresa}-${ctx.entidades.sucursal?.id ?? ""}`, () => Patrones(ctx.idEmpresa, 90, ctx.entidades.sucursal?.id ?? null));

// Urgencia de reposición: agotados primero, luego lo que se acaba antes.
const URGENCIA = { agotado: 0, agotamiento_proximo: 1 };
function porReponer(productos) {
  return productos
    .filter((p) => p.alerta === "agotado" || p.alerta === "agotamiento_proximo" || Number(p.sugerido_reponer) > 0)
    .sort((a, b) => (URGENCIA[a.alerta] ?? 2) - (URGENCIA[b.alerta] ?? 2) || Number(a.dias_cobertura ?? 999) - Number(b.dias_cobertura ?? 999));
}
const cuandoSeAgota = (p) =>
  p.alerta === "agotado" || Number(p.stock) <= 0 ? "Agotado" : p.fecha_agotamiento ? `~${fechaCorta(p.fecha_agotamiento)}` : "—";

// ------------------------------------------------------------------ respuestas

export const RESPUESTAS = {
  async saludo(ctx) {
    const nombre = ctx.esMax ? "Novandra Max" : "Novandra";
    return {
      texto:
        `¡Hola! Soy ${nombre}, tu asistente de operaciones. Reviso tus datos en tiempo real y te ayudo con:\n\n` +
        lista([
          "**Ventas:** cómo vas hoy, esta semana o el mes, y contra el período anterior.",
          "**Reposición:** qué se va a agotar, cuánto pedir y borradores de órdenes de compra.",
          "**Inventario:** stock de cualquier producto, lo que está quieto y lo que más rota.",
          "**Patrones de tu negocio:** días y horas fuertes, productos que se venden juntos y clientes recurrentes.",
          ...(ctx.permisos.auditoria ? ["**Equipo:** actividad y alertas de la auditoría."] : []),
        ]) +
        "\n\nPregúntame con tus palabras. Si no te entiendo, te pido que me aclares y lo aprendo para la próxima.",
      sugerencias: ["¿Cómo va mi negocio?", "¿Qué debo reabastecer?", "¿Qué se vende junto?", "¿Cuál es mi mejor día?"],
    };
  },

  async gracias() {
    return { texto: "¡Con gusto! Aquí estoy cuando me necesites.", sugerencias: ["¿Cómo va mi negocio?"] };
  },

  async briefing(ctx) {
    const [semana, mes, rot] = await Promise.all([panel(ctx, 7), panel(ctx, 30), rotacion(ctx)]);
    const reponer = porReponer(rot.productos ?? []);
    const agotados = reponer.filter((p) => p.alerta === "agotado").length;
    const detenidos = (rot.productos ?? []).filter((p) => p.alerta === "detenido");
    const promedioDia = Number(mes.total_periodo ?? 0) / 30;
    const pct = porcentaje(Number(semana.total_periodo), Number(semana.total_anterior));
    const puntos = [
      `**Hoy:** ${ctx.dinero(semana.total_hoy)} en ${n(semana.ventas_hoy)} venta(s)` +
        (promedioDia > 0 ? ` (un día típico para ti es ${ctx.dinero(Math.round(promedioDia))}).` : "."),
      `**Últimos 7 días:** ${ctx.dinero(semana.total_periodo)} en ${n(semana.num_ventas)} ventas.${variacion(pct, "la semana anterior")}`,
    ];
    if (reponer.length) {
      puntos.push(
        `**Reposición:** ${reponer.length} producto(s) por reponer` +
          (agotados ? `, ${agotados} ya agotado(s)` : "") +
          `. El más urgente: ${reponer[0].descripcion} (${cuandoSeAgota(reponer[0]).toLowerCase()}).`
      );
    } else puntos.push("**Reposición:** nada urgente por ahora.");
    if (detenidos.length) puntos.push(`**Atención:** ${detenidos.length} producto(s) que se vendían con regularidad dejaron de venderse (p. ej. ${detenidos[0].descripcion}).`);
    if (Number(semana.ordenes_abiertas) > 0) puntos.push(`**Compras:** ${n(semana.ordenes_abiertas)} orden(es) de compra abiertas.`);
    if (ctx.permisos.auditoria) {
      try {
        const equipo = await ResumenAuditoria(ctx.idEmpresa, 7);
        const conAlertas = (equipo ?? []).filter((e) => Number(e.alertas) > 0);
        if (conAlertas.length) puntos.push(`**Equipo:** ${conAlertas.length} persona(s) con alertas en la auditoría esta semana.`);
      } catch {
        // La auditoría es opcional en el resumen.
      }
    }
    return {
      texto: `**Así va ${ctx.empresa ?? "tu negocio"}${dondeSede(ctx)}:**\n\n${lista(puntos)}`,
      sugerencias: [reponer.length ? "¿Qué debo reabastecer?" : "¿Qué productos están quietos?", "¿Cuáles son los más vendidos?", "¿Cuál es mi mejor día?"],
    };
  },

  async resumen_ventas(ctx) {
    const per = ctx.entidades.periodo ?? { dias: 7, etiqueta: "los últimos 7 días" };
    if (per.hoy || per.ayer) {
      const d = await panel(ctx, 30);
      const promedio = Number(d.total_periodo ?? 0) / 30;
      if (per.hoy) {
        const pct = porcentaje(Number(d.total_hoy), promedio);
        return {
          texto:
            `**Hoy${dondeSede(ctx)}** llevas **${ctx.dinero(d.total_hoy)}** en ${n(d.ventas_hoy)} venta(s).` +
            (promedio > 0 ? ` Tu promedio diario del último mes es ${ctx.dinero(Math.round(promedio))}${pct != null ? ` (${pct >= 0 ? "+" : ""}${pct}%)` : ""}.` : ""),
          sugerencias: ["Resume mis ventas de la semana", "¿A qué hora vendo más?"],
        };
      }
      const serie = d.serie ?? [];
      const ayer = serie.at(-2);
      return {
        texto: ayer
          ? `**Ayer (${diaSemana(ayer.fecha)} ${fechaCorta(ayer.fecha)})** vendiste **${ctx.dinero(ayer.total)}** en ${n(ayer.ventas)} venta(s). Tu promedio diario del último mes es ${ctx.dinero(Math.round(promedio))}.`
          : "No encontré ventas de ayer.",
        sugerencias: ["¿Cómo voy hoy?", "Resume mis ventas de la semana"],
      };
    }
    const d = await panel(ctx, per.dias);
    if (!Number(d.num_ventas)) return { texto: `No hay ventas registradas en ${per.etiqueta}${dondeSede(ctx)}.`, sugerencias: ["¿Cómo va mi negocio?"] };
    const pct = porcentaje(Number(d.total_periodo), Number(d.total_anterior));
    const mejor = [...(d.serie ?? [])].sort((a, b) => Number(b.total) - Number(a.total))[0];
    const top = (d.top_productos ?? []).slice(0, 3);
    const metodo = [...(d.por_metodo ?? [])].sort((a, b) => Number(b.total) - Number(a.total))[0];
    const partes = [
      `**Ventas de ${per.etiqueta}${dondeSede(ctx)}:** ${ctx.dinero(d.total_periodo)} en ${n(d.num_ventas)} ventas (ticket promedio ${ctx.dinero(Math.round(Number(d.total_periodo) / Number(d.num_ventas)))}).${variacion(pct, `los ${per.dias} días anteriores`)}`,
    ];
    if (mejor && per.dias > 1) partes.push(`Tu mejor día fue el **${diaSemana(mejor.fecha)} ${fechaCorta(mejor.fecha)}** con ${ctx.dinero(mejor.total)}.`);
    if (top.length) partes.push(`**Lo que más se vendió:**\n${lista(top.map((p) => `${p.descripcion}: ${n(p.cantidad)} und · ${ctx.dinero(p.total)}`))}`);
    if (metodo) partes.push(`La mayoría te paga con **${(NombresMetodo[metodo.metodo] ?? metodo.metodo).toLowerCase()}** (${ctx.dinero(metodo.total)}).`);
    if (pct != null && pct <= -20) partes.push("Las ventas bajaron bastante: revisa si hay productos estrella agotados o detenidos.");
    return {
      texto: partes.join("\n\n"),
      sugerencias: pct != null && pct <= -20 ? ["¿Qué productos están detenidos?", "¿Qué debo reabastecer?"] : ["¿Cuál es mi mejor día?", "¿Qué se vende junto?"],
    };
  },

  async reabastecer(ctx) {
    const rot = await rotacion(ctx);
    const reponer = porReponer(rot.productos ?? []);
    const detenidos = (rot.productos ?? []).filter((p) => p.alerta === "detenido");
    if (!reponer.length) {
      const menor = [...(rot.productos ?? [])].filter((p) => Number(p.dias_cobertura) > 0).sort((a, b) => a.dias_cobertura - b.dias_cobertura)[0];
      return {
        texto:
          `No hay nada urgente por reponer${dondeSede(ctx)}. ` +
          (menor ? `El producto con menos cobertura es **${menor.descripcion}**: te alcanza para ~${n(menor.dias_cobertura)} días al ritmo actual.` : ""),
        sugerencias: ["¿Qué productos están quietos?", "¿Cuáles son los más vendidos?"],
      };
    }
    const filas = reponer.slice(0, 12).map((p) => [p.descripcion, n(p.stock), cuandoSeAgota(p), Number(p.sugerido_reponer) > 0 ? n(p.sugerido_reponer) : "—"]);
    const items = reponer.filter((p) => Number(p.sugerido_reponer) > 0).map((p) => ({ id_producto: p.id, cantidad: Number(p.sugerido_reponer) }));
    const texto = [
      `**Por reponer${dondeSede(ctx)} (${reponer.length}):**`,
      tabla(["Producto", "Stock", "Se agota", "Pedir"], filas),
      reponer.length > 12 ? `…y ${reponer.length - 12} más.` : "",
      "Calculé lo sugerido con tu velocidad de venta de los últimos 90 días (más peso a las últimas 2 semanas) para cubrir unas semanas, comparando cada producto con su propio ritmo.",
      detenidos.length ? `Ojo: ${detenidos.map((p) => p.descripcion).slice(0, 3).join(", ")} dejó de venderse; revísalo antes de pedir más.` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const acciones = [];
    if (items.length && ctx.permisos.ordenes) {
      acciones.push({
        tipo: "boton",
        accion: "crear_orden",
        descripcion: `Crear borrador de orden (${items.length} producto${items.length > 1 ? "s" : ""})`,
        datos: { items, nota: "Propuesta de Novandra según la rotación de los últimos 90 días." },
      });
    }
    return { texto, acciones, sugerencias: ["¿Qué productos están quietos?", "¿Qué órdenes tengo pendientes?"] };
  },

  async crear_orden(ctx) {
    const r = await RESPUESTAS.reabastecer(ctx);
    if (!r.acciones?.length) return r;
    return { ...r, texto: `${r.texto}\n\nRevisa las cantidades y toca **Crear borrador** para guardarla. Queda como borrador: tú la revisas y la envías desde Compras.` };
  },

  async bajo_minimo(ctx) {
    const lista_ = await BajoMinimo(ctx.idEmpresa);
    if (!lista_?.length) return { texto: "Ningún producto está por debajo de su stock mínimo.", sugerencias: ["¿Qué se va a agotar pronto?"] };
    const filas = lista_.slice(0, 15).map((p) => [p.descripcion, n(p.stock), n(p.stock_minimo), n(Math.max(Number(p.stock_minimo) - Number(p.stock), 0))]);
    return {
      texto: [
        `**${lista_.length} producto(s) en o por debajo del mínimo:**`,
        tabla(["Producto", "Stock", "Mínimo", "Faltan"], filas),
        lista_.length > 15 ? `…y ${lista_.length - 15} más.` : "",
        "El mínimo es el que definiste en cada producto. Si quieres saber cuánto pedir según lo que realmente vendes, pregúntame qué reabastecer.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      sugerencias: ["¿Qué debo reabastecer?", "Prepara una orden de compra"],
    };
  },

  async stock_producto(ctx) {
    const prod = ctx.entidades.producto;
    if (!prod) return { texto: "¿De qué producto? Escríbeme su nombre o código.", esperaProducto: true };
    // Varios productos coinciden ("camisetas"): stock de cada uno.
    if (ctx.entidades.productos?.length > 1) {
      const varios = ctx.entidades.productos.slice(0, 15);
      const total = varios.reduce((a, p) => a + Number(p.stock ?? 0), 0);
      return {
        texto: [
          `Encontré ${ctx.entidades.productos.length} productos que coinciden (${n(total)} unidades en total):`,
          tabla(["Producto", "Stock", "Mínimo"], varios.map((p) => [p.descripcion, n(p.stock), n(p.stock_minimo)])),
        ].join("\n\n"),
        sugerencias: varios.slice(0, 2).map((p) => `¿Cuánto hay de ${p.descripcion}?`),
      };
    }
    const [bodegas, rot] = await Promise.all([StockProducto(ctx.idEmpresa, prod.id), rotacion(ctx).catch(() => null)]);
    const total = (bodegas ?? []).reduce((a, b) => a + Number(b.cantidad), 0);
    const r = rot?.productos?.find((p) => p.id === prod.id);
    const partes = [`**${prod.descripcion}:** ${n(total)} unidades en total.`];
    const conStock = (bodegas ?? []).filter((b) => Number(b.cantidad) > 0);
    if (conStock.length > 1 || (conStock.length === 1 && conStock[0].tipo !== "principal")) {
      partes.push(lista(conStock.map((b) => `${b.bodega}: ${n(b.cantidad)}`)));
    }
    if (r && Number(r.venta_diaria) > 0) {
      partes.push(
        `Vendes ~${n(r.venta_diaria, 1)} por día` +
          (r.dias_cobertura ? `: te alcanza para ~${n(r.dias_cobertura)} días${r.fecha_agotamiento ? ` (hasta el ${fechaCorta(r.fecha_agotamiento)})` : ""}.` : ".")
      );
    } else if (r) partes.push("No ha tenido ventas recientes.");
    if (Number(prod.stock_minimo) > 0 && total <= Number(prod.stock_minimo)) partes.push(`Está en o por debajo de su mínimo (${n(prod.stock_minimo)}).`);
    return { texto: partes.join("\n\n"), sugerencias: [`¿Cuándo se agota ${prod.descripcion}?`, "¿Qué debo reabastecer?"] };
  },

  async mas_vendidos(ctx) {
    const per = ctx.entidades.periodo ?? { dias: 30, etiqueta: "los últimos 30 días" };
    const d = await panel(ctx, per.dias);
    const top = (d.top_productos ?? []).slice(0, 5);
    if (!top.length) return { texto: `No hay ventas en ${per.etiqueta}${dondeSede(ctx)}.` };
    const total = Number(d.total_periodo) || 1;
    const participacion = top.reduce((a, p) => a + Number(p.total), 0) / total;
    return {
      texto: [
        `**Más vendidos de ${per.etiqueta}${dondeSede(ctx)}:**`,
        tabla(["Producto", "Unidades", "Ventas"], top.map((p) => [p.descripcion, n(p.cantidad), ctx.dinero(p.total)])),
        `Estos ${top.length} productos son el **${Math.round(participacion * 100)}%** de tus ventas: cuida que nunca se agoten.`,
      ].join("\n\n"),
      sugerencias: ["¿Qué se vende junto?", "¿Qué debo reabastecer?"],
    };
  },

  async sin_movimiento(ctx) {
    const rot = await rotacion(ctx);
    const quietos = (rot.productos ?? []).filter((p) => ["sin_movimiento", "detenido", "sobrestock"].includes(p.alerta));
    if (!quietos.length) return { texto: "No tienes inventario quieto: todo se está moviendo a buen ritmo.", sugerencias: ["¿Cuáles son los más vendidos?"] };
    const etiqueta = { sin_movimiento: "Sin ventas", detenido: "Dejó de venderse", sobrestock: "Sobrestock" };
    quietos.sort((a, b) => Number(b.capital_inmovilizado ?? 0) - Number(a.capital_inmovilizado ?? 0));
    const capital = quietos.reduce((a, p) => a + Number(p.capital_inmovilizado ?? 0), 0);
    const conCapital = ctx.permisos.verCostos && capital > 0;
    const cols = conCapital ? ["Producto", "Stock", "Situación", "Capital quieto"] : ["Producto", "Stock", "Situación"];
    const filas = quietos.slice(0, 12).map((p) => {
      const f = [p.descripcion, n(p.stock), etiqueta[p.alerta]];
      if (conCapital) f.push(ctx.dinero(p.capital_inmovilizado ?? 0));
      return f;
    });
    return {
      texto: [
        `**Inventario quieto${dondeSede(ctx)} (${quietos.length}):**`,
        tabla(cols, filas),
        conCapital ? `En total hay **${ctx.dinero(capital)}** de capital quieto.` : "",
        "Ideas: arma un combo con un producto estrella, haz una promoción corta o deja de reponerlo. Los que *dejaron de venderse* se vendían con regularidad: revisa si están bien exhibidos o si cambió el precio.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      sugerencias: ["¿Qué se vende junto?", "¿Cuáles son los más vendidos?"],
    };
  },

  async pronostico(ctx) {
    const rot = await rotacion(ctx);
    const prod = ctx.entidades.producto;
    if (prod) {
      const r = rot.productos?.find((p) => p.id === prod.id);
      if (!r || !Number(r.venta_diaria)) return { texto: `**${prod.descripcion}** no ha tenido ventas recientes, así que no puedo proyectar cuándo se agota.` };
      const tendencia = Number(r.tendencia);
      return {
        texto: [
          `**${prod.descripcion}:** ${n(r.stock)} unidades. Vendes ~${n(r.venta_diaria, 1)} por día.`,
          lista([
            `Próximos 7 días: ~${n(r.pronostico_7)} unidades.`,
            `Próximos 30 días: ~${n(r.pronostico_30)} unidades.`,
            r.fecha_agotamiento ? `Al ritmo actual se agota hacia el **${fechaCorta(r.fecha_agotamiento)}** (~${n(r.dias_cobertura)} días).` : "",
            tendencia ? `Tendencia de las últimas 2 semanas: **${tendencia > 0 ? "+" : ""}${n(tendencia)}%**.` : "",
          ].filter(Boolean)),
          Number(r.sugerido_reponer) > 0 ? `Te sugiero pedir **${n(r.sugerido_reponer)}** unidades.` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        sugerencias: ["¿Qué debo reabastecer?"],
      };
    }
    const top = [...(rot.productos ?? [])].filter((p) => Number(p.pronostico_7) > 0).sort((a, b) => b.pronostico_7 - a.pronostico_7).slice(0, 8);
    if (!top.length) return { texto: "Aún no hay suficientes ventas para proyectar la demanda." };
    return {
      texto: [
        `**Demanda esperada para los próximos 7 días${dondeSede(ctx)}:**`,
        tabla(["Producto", "7 días", "Stock", "Alcanza"], top.map((p) => [p.descripcion, `~${n(p.pronostico_7)}`, n(p.stock), Number(p.stock) >= Number(p.pronostico_7) ? "Sí" : "**No**"])),
        "La proyección usa tu ritmo propio de venta y la tendencia de las últimas 2 semanas.",
      ].join("\n\n"),
      sugerencias: ["¿Qué debo reabastecer?"],
    };
  },

  async patrones(ctx) {
    const p = await patrones(ctx);
    if (!Number(p.ventas)) return { texto: "Aún no tengo ventas suficientes para encontrar patrones. Vuelve a preguntarme cuando tengas algunas semanas de ventas." };
    const dias = [...(p.por_dia_semana ?? [])].sort((a, b) => Number(b.total) - Number(a.total));
    const horas = [...(p.por_hora ?? [])].sort((a, b) => Number(b.total) - Number(a.total));
    const pide = (re) => re.test(ctx.preguntaNormal);
    const partes = [];
    if (!pide(/hora|horario/) || pide(/dia/)) {
      partes.push(
        `**Días fuertes${dondeSede(ctx)}:** ${dias.slice(0, 2).map((d) => `${DIAS_SEMANA[d.dia]} (${ctx.dinero(d.total)})`).join(" y ")}.` +
          (dias.length > 2 ? ` El más flojo es el ${DIAS_SEMANA[dias.at(-1).dia]}.` : "")
      );
    }
    if (horas.length) {
      const pico = horas.slice(0, 3).map((h) => h.hora).sort((a, b) => a - b);
      partes.push(`**Horas pico:** ${pico.map((h) => `${h}:00–${h + 1}:00`).join(", ")}. Ten la caja y el personal listos en esas franjas.`);
    }
    partes.push(`**Ticket promedio:** ${ctx.dinero(p.ticket_promedio)} con ${n(p.unidades_por_venta, 1)} unidades por venta (últimos ${p.dias} días, ${n(p.ventas)} ventas).`);
    if (dias.length > 1) partes.push(`Idea: lanza promociones el ${DIAS_SEMANA[dias.at(-1).dia]} para mover más el día más flojo.`);
    return { texto: partes.join("\n\n"), sugerencias: ["¿Qué se vende junto?", "¿Quiénes son mis mejores clientes?"] };
  },

  async combos(ctx) {
    const p = await patrones(ctx);
    const combos = (p.combos ?? []).filter((c) => Number(c.lift) >= 1).slice(0, 5);
    if (!combos.length) {
      return { texto: "Todavía no veo productos que se compren juntos con frecuencia. Lo detecto cuando una misma pareja aparece en al menos 2 ventas." };
    }
    const mejor = combos[0];
    return {
      texto: [
        `**Productos que tus clientes compran juntos${dondeSede(ctx)}:**`,
        tabla(["Combinación", "Veces", "Afinidad"], combos.map((c) => [`${c.a} + ${c.b}`, n(c.veces), `${n(c.lift, 1)}×`])),
        `Cuando alguien lleva **${mejor.a}**, en el ${Math.round(Number(mejor.confianza) * 100)}% de los casos también lleva **${mejor.b}**.`,
        "La *afinidad* indica cuántas veces más se compran juntos de lo que pasaría por azar. Úsalo para exhibirlos juntos, armar combos o sugerirlos en la caja.",
      ].join("\n\n"),
      sugerencias: ["¿Qué productos están quietos?", "¿Cuál es mi mejor día?"],
    };
  },

  async clientes(ctx) {
    const p = await patrones(ctx);
    const c = p.clientes ?? {};
    const total = Number(p.ventas) || 0;
    const sinCliente = Number(c.ventas_sin_cliente ?? 0);
    const partes = [];
    if (c.top?.length) {
      partes.push(`**Tus mejores clientes (últimos ${p.dias} días):**`, tabla(["Cliente", "Compras", "Total"], c.top.map((x) => [x.nombre, n(x.compras), ctx.dinero(x.total)])));
    }
    partes.push(`${n(c.recurrentes)} de ${n(c.con_compra)} cliente(s) con nombre volvieron a comprar.`);
    if (total && sinCliente / total > 0.5) {
      partes.push(`El ${Math.round((sinCliente / total) * 100)}% de tus ventas no tiene cliente asociado. Registrarlo en la caja te deja ver quién vuelve y enviarle la factura por WhatsApp.`);
    }
    return { texto: partes.join("\n\n"), sugerencias: ["¿Qué se vende junto?", "Resume mis ventas del mes"] };
  },

  async valor_inventario(ctx) {
    const d = await panel(ctx, 30);
    const costo = Number(d.valor_inventario ?? 0);
    const venta = Number(d.valor_venta_inventario ?? 0);
    const margen = venta > 0 ? Math.round(((venta - costo) / venta) * 100) : null;
    return {
      texto: [
        `**Tu inventario${dondeSede(ctx)} vale ${ctx.dinero(costo)} al costo** y ${ctx.dinero(venta)} a precio de venta.`,
        margen != null ? `Si lo vendes todo, la ganancia bruta sería de ${ctx.dinero(venta - costo)} (margen del ${margen}%).` : "",
        (d.bodegas ?? []).length > 1 ? `**Unidades por bodega:**\n${lista(d.bodegas.map((b) => `${b.nombre}: ${n(b.unidades)}`))}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      sugerencias: ["¿Qué productos están quietos?"],
    };
  },

  async ordenes(ctx) {
    const ordenes = await OrdenesAbiertas(ctx.idEmpresa);
    if (!ordenes?.length) return { texto: "No tienes órdenes de compra abiertas.", sugerencias: ["¿Qué debo reabastecer?"] };
    return {
      texto: [
        `**Órdenes abiertas (${ordenes.length}):**`,
        tabla(
          ["Orden", "Proveedor", "Estado", "Total"],
          ordenes.map((o) => [`OC-${o.numero}`, o.proveedores?.nombre ?? "—", o.estado === "borrador" ? "Borrador" : "Enviada", ctx.dinero(o.total)])
        ),
        ordenes.some((o) => o.estado === "borrador") ? "Los borradores están esperando tu revisión en Compras." : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      acciones: [{ tipo: "enlace", descripcion: "Ir a Compras", enlace: "/compras" }],
    };
  },

  async sucursales(ctx) {
    const per = ctx.entidades.periodo ?? { dias: 30, etiqueta: "los últimos 30 días" };
    const d = await Dashboard(ctx.idEmpresa, per.dias);
    const sedes = [...(d.por_sucursal ?? [])].sort((a, b) => Number(b.total) - Number(a.total));
    if (sedes.length <= 1) return { texto: `Tienes una sola sede${sedes[0] ? ` (${sedes[0].nombre})` : ""}. Sus ventas de ${per.etiqueta} son ${ctx.dinero(d.total_periodo)}.` };
    const total = sedes.reduce((a, s) => a + Number(s.total), 0) || 1;
    return {
      texto: [
        `**Ventas por sede (${per.etiqueta}):**`,
        tabla(["Sede", "Ventas", "Total", "Participación"], sedes.map((s) => [s.nombre, n(s.ventas), ctx.dinero(s.total), `${Math.round((Number(s.total) / total) * 100)}%`])),
      ].join("\n\n"),
      sugerencias: sedes.slice(0, 2).map((s) => `¿Qué debo reabastecer en ${s.nombre}?`),
    };
  },

  async metodos_pago(ctx) {
    const per = ctx.entidades.periodo ?? { dias: 30, etiqueta: "los últimos 30 días" };
    const d = await panel(ctx, per.dias);
    const metodos = [...(d.por_metodo ?? [])].sort((a, b) => Number(b.total) - Number(a.total));
    if (!metodos.length) return { texto: `No hay ventas en ${per.etiqueta}.` };
    const total = metodos.reduce((a, m) => a + Number(m.total), 0) || 1;
    return {
      texto: [
        `**Cómo te pagaron en ${per.etiqueta}${dondeSede(ctx)}:**`,
        tabla(["Medio", "Ventas", "Total", "%"], metodos.map((m) => [NombresMetodo[m.metodo] ?? m.metodo, n(m.ventas), ctx.dinero(m.total), `${Math.round((Number(m.total) / total) * 100)}%`])),
      ].join("\n\n"),
    };
  },

  async auditoria(ctx) {
    const resumen = await ResumenAuditoria(ctx.idEmpresa, ctx.entidades.periodo?.dias ?? 30);
    const dias = ctx.entidades.periodo?.dias ?? 30;
    // La persona se reconoce por su nombre (o parte de él) dentro de la pregunta.
    const persona = buscarNombre(ctx.pregunta, resumen ?? [], "nombre")?.item ?? null;
    if (persona) {
      const movs = await AuditoriaPersona(ctx.idEmpresa, persona.id_usuario, dias);
      const alertas = movs.filter((m) => m.alerta);
      return {
        texto: [
          `**${persona.nombre} (últimos ${dias} días):** ${n(persona.movimientos)} movimientos, ${n(persona.ventas)} ventas, ${n(persona.salidas_manuales)} salidas manuales y ${n(persona.anulaciones)} anulaciones.`,
          alertas.length
            ? `**Alertas (${alertas.length}):**\n${lista(alertas.slice(0, 8).map((m) => `${fechaCorta(m.fecha)}: ${m.alerta}${m.detalle?.producto ? ` · ${m.detalle.producto}` : ""}${m.cantidad ? ` (${n(m.cantidad)} und)` : ""}`))}`
            : "Sin alertas en este período.",
          "Te muestro lo que quedó registrado; la conclusión es tuya.",
        ].join("\n\n"),
        acciones: [{ tipo: "enlace", descripcion: "Abrir auditoría", enlace: "/auditoria" }],
      };
    }
    const conRiesgo = resumen.filter((r) => Number(r.riesgo) > 0).sort((a, b) => b.riesgo - a.riesgo);
    if (!conRiesgo.length) return { texto: `Sin alertas en el equipo en los últimos ${dias} días.`, acciones: [{ tipo: "enlace", descripcion: "Abrir auditoría", enlace: "/auditoria" }] };
    return {
      texto: [
        `**Actividad del equipo con alertas (últimos ${dias} días):**`,
        tabla(
          ["Persona", "Alertas", "Salidas manuales", "Eliminados", "A nombre de otro"],
          conRiesgo.map((r) => [r.nombre, n(r.alertas), n(r.salidas_manuales), n(r.eliminados), n(r.suplantaciones)])
        ),
        "Pregúntame por una persona (por ejemplo, “¿qué hizo Juan esta semana?”) para ver el detalle. Te muestro hechos registrados; la conclusión es tuya.",
      ].join("\n\n"),
      acciones: [{ tipo: "enlace", descripcion: "Abrir auditoría", enlace: "/auditoria" }],
    };
  },

  async ayuda_app(ctx) {
    const permitidas = GUIAS.filter((g) => !g.soloAdmin || ctx.permisos.admin);
    const [guia, ...otras] = buscarGuias(ctx.pregunta, permitidas);
    if (!guia) {
      return {
        texto: "No encontré una guía para eso. En el Centro de ayuda puedes buscar con otras palabras, o escribirle al equipo de Stockly desde el botón de Soporte.",
        acciones: [{ tipo: "enlace", descripcion: "Abrir el Centro de ayuda", enlace: "/ayuda" }],
      };
    }
    const pasos = guia.pasos.map((p, i) => `${i + 1}. ${p}`).join("\n");
    return {
      texto: [`**${guia.titulo}**`, pasos, guia.consejos?.length ? `_${guia.consejos[0]}_` : ""].filter(Boolean).join("\n\n"),
      acciones: [
        ...(guia.ir ? [{ tipo: "enlace", descripcion: guia.ir.texto, enlace: guia.ir.a }] : []),
        { tipo: "enlace", descripcion: "Ver la guía completa", enlace: `/ayuda?guia=${guia.id}` },
      ],
      sugerencias: otras.slice(0, 2).map((g) => `¿Cómo ${g.titulo.charAt(0).toLowerCase()}${g.titulo.slice(1)}?`),
    };
  },

  async recordatorio(ctx) {
    const texto = ctx.pregunta
      .replace(/^.*?(recu[eé]rda(le|nos|me)?( al equipo)?( que)?|recordatorio( para el equipo)?:?|deja(r)? (una )?nota( para el equipo)?:?|avisa(le)? al equipo( que)?|anota:?)\s*/i, "")
      .trim();
    if (texto.length < 4) return { texto: "¿Qué quieres que le recuerde al equipo? Escríbelo así: “recuérdale al equipo revisar la vitrina el viernes”." };
    const titulo = texto.length > 80 ? `${texto.slice(0, 77)}…` : texto.charAt(0).toUpperCase() + texto.slice(1);
    await CrearRecordatorio(ctx.idEmpresa, titulo, texto.slice(0, 200));
    return {
      texto: `Listo, dejé el recordatorio en la campana: “${titulo}”.`,
      acciones: [{ tipo: "recordatorio", descripcion: titulo }],
    };
  },
};
