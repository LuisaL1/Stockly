import { create } from "zustand";
import { PreguntarNovandra } from "../supabase/novandra";
import { AprenderFrase, CatalogoNovandra, CrearBorradorOrden, PerfilNovandra } from "../supabase/crudNovandraEsencial";
import { responderEsencial } from "../utils/novandra/motor";
import { limpiarCache } from "../utils/novandra/respuestas";
import { normalizar } from "../utils/novandra/texto";

export const SUGERENCIAS_NOVANDRA = [
  "¿Cómo va mi negocio?",
  "¿Qué productos debo reabastecer esta semana?",
  "¿Qué productos se venden juntos?",
  "¿Cuál es mi mejor día y a qué hora vendo más?",
];

const bienvenida = {
  id: "bienvenida",
  role: "assistant",
  content:
    "Hola, soy Novandra. Reviso tus ventas y tu inventario en tiempo real: te digo qué reabastecer, qué está quieto, cuáles son tus días y productos fuertes, y preparo órdenes de compra en borrador. ¿Por dónde empezamos?",
};

const VIGENCIA_PERFIL = 5 * 60 * 1000;

let siguienteId = 1;
let controlador = null;

// Conversación con Novandra. Vive mientras la sesión esté abierta.
//  - Novandra esencial (plan Básico): responde en la app con reglas y aprende de la empresa.
//  - Novandra Max (planes con IA): responde con IA; si no está disponible, responde la esencial.
export const useNovandraStore = create((set, get) => ({
  abierto: false,
  mensajes: [bienvenida],
  pensando: false,
  memoria: {},
  perfil: null, // { plan, admin, config, sucursales, aprendidas, catalogo, t, idEmpresa }
  // Si la IA falla, se usa el modo esencial sin volver a intentarla durante un rato.
  iaPausadaHasta: 0,

  abrir: (pregunta) => {
    set({ abierto: true });
    get().cargarPerfil();
    if (pregunta) get().enviar(pregunta);
  },
  cerrar: () => set({ abierto: false }),
  reiniciar: () => {
    controlador?.abort();
    limpiarCache();
    set({ mensajes: [bienvenida], pensando: false, memoria: {}, iaPausadaHasta: 0 });
  },
  detener: () => controlador?.abort(),

  // contexto: { idEmpresa, empresa, moneda }
  contexto: null,
  setContexto: (contexto) => {
    if (get().contexto?.idEmpresa !== contexto?.idEmpresa) set({ perfil: null, memoria: {} });
    set({ contexto });
  },

  // Plan, rol, permisos, sedes, frases aprendidas y catálogo (se renuevan cada 5 minutos).
  cargarPerfil: async (forzar = false) => {
    const { contexto, perfil } = get();
    if (!contexto?.idEmpresa) return null;
    if (!forzar && perfil?.idEmpresa === contexto.idEmpresa && Date.now() - perfil.t < VIGENCIA_PERFIL) return perfil;
    try {
      const [datos, catalogo] = await Promise.all([PerfilNovandra(contexto.idEmpresa), CatalogoNovandra(contexto.idEmpresa)]);
      const nuevo = { ...datos, catalogo, t: Date.now(), idEmpresa: contexto.idEmpresa };
      set({ perfil: nuevo });
      return nuevo;
    } catch (e) {
      console.warn("[Novandra] No se pudo cargar el perfil:", e.message);
      return perfil;
    }
  },

  // Vuelve a enviar la última pregunta (después de un error).
  reintentar: () => {
    const { mensajes } = get();
    const ultimaPregunta = [...mensajes].reverse().find((m) => m.role === "user");
    if (!ultimaPregunta) return;
    const indice = mensajes.lastIndexOf(ultimaPregunta);
    set({ mensajes: mensajes.slice(0, indice) });
    return get().enviar(ultimaPregunta.content);
  },

  // Devuelve las acciones que Novandra haya realizado (borradores, recordatorios).
  enviar: async (texto) => {
    const { contexto, mensajes, pensando } = get();
    const pregunta = texto.trim();
    if (!pregunta || pensando || !contexto?.idEmpresa) return;
    set({ mensajes: [...mensajes, { id: `p${siguienteId++}`, role: "user", content: pregunta }] });
    return get().responder(pregunta);
  },

  // Responde una pregunta (ya agregada a la conversación). forzar: intención elegida al aclarar.
  responder: async (pregunta, { forzar } = {}) => {
    const idRespuesta = `r${siguienteId++}`;
    set((s) => ({
      mensajes: [...s.mensajes, { id: idRespuesta, role: "assistant", content: "", estado: "Pensando", enCurso: true }],
      pensando: true,
    }));
    const actualizar = (cambios) =>
      set((s) => ({
        mensajes: s.mensajes.map((m) => (m.id === idRespuesta ? { ...m, ...(typeof cambios === "function" ? cambios(m) : cambios) } : m)),
      }));

    controlador = new AbortController();
    let acciones = [];
    try {
      const perfil = await get().cargarPerfil();

      // Novandra Max: primero la IA.
      if (perfil?.plan?.novandra_ia && !forzar && Date.now() >= get().iaPausadaHasta) {
        const remoto = await get().preguntarIA(actualizar);
        if (remoto.ok) {
          acciones = remoto.acciones;
          return acciones;
        }
        // Sin respuesta de la IA: responde el modo esencial sin interrumpir al usuario.
        set({ iaPausadaHasta: Date.now() + 10 * 60 * 1000 });
        actualizar({ content: "", error: false, estado: "Pensando", enCurso: true });
      }

      // Novandra esencial.
      const r = await responderEsencial({
        pregunta,
        forzar,
        contexto: get().contexto,
        perfil,
        catalogo: perfil?.catalogo ?? [],
        memoria: get().memoria,
        alEvento: (e) => {
          if (e.tipo === "estado") actualizar({ estado: e.texto });
          else if (e.tipo === "texto") actualizar((m) => ({ content: m.content + e.delta, estado: null }));
        },
      });
      if (controlador?.signal.aborted) throw Object.assign(new Error("detenido"), { name: "AbortError" });
      acciones = r.acciones ?? [];
      set({ memoria: r.memoria ?? {} });
      actualizar({
        acciones,
        sugerencias: r.sugerencias ?? [],
        aclaraciones: r.aclaraciones ?? [],
        enCurso: false,
        estado: null,
        modo: "esencial",
      });
    } catch (e) {
      if (e.name === "AbortError") {
        actualizar((m) => ({ enCurso: false, estado: null, content: m.content || "Respuesta detenida.", detenido: true }));
      } else {
        console.error("[Novandra]", e);
        actualizar({ enCurso: false, estado: null, content: `No pude consultar tus datos: ${e.message ?? "error desconocido"}`, error: true });
      }
    } finally {
      controlador = null;
      set({ pensando: false });
    }
    return acciones;
  },

  // Novandra Max (Edge Function con IA). { ok, acciones }: ok = false si no respondió nada.
  preguntarIA: async (actualizar) => {
    const { contexto, mensajes } = get();
    let acciones = [];
    let escribio = false;
    let fallo = null;
    try {
      await PreguntarNovandra({
        ...contexto,
        senal: controlador?.signal,
        // La bienvenida, los errores y las respuestas esenciales no se envían al modelo como contexto inválido.
        mensajes: mensajes
          .filter((m) => m.id !== "bienvenida" && !m.error && m.content && !m.enCurso)
          .map(({ role, content }) => ({ role, content })),
        alEvento: (e) => {
          if (e.tipo === "estado") actualizar({ estado: e.texto });
          else if (e.tipo === "texto") {
            escribio = true;
            actualizar((m) => ({ content: m.content + e.delta, estado: null, modo: "max" }));
          } else if (e.tipo === "fin") {
            acciones = e.acciones ?? [];
            actualizar({ acciones, enCurso: false, estado: null });
          } else if (e.tipo === "error") {
            acciones = e.acciones ?? [];
            if (escribio) actualizar((m) => ({ enCurso: false, estado: null, acciones, content: `${m.content}\n\n_${e.mensaje}_` }));
            else fallo = e.mensaje;
          }
        },
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      fallo = e.message;
    }
    if (fallo && !escribio) {
      console.warn("[Novandra Max] Sin respuesta, se usa el modo esencial:", fallo);
      return { ok: false };
    }
    return { ok: true, acciones };
  },

  // Botones dentro de una respuesta (p. ej. crear el borrador de orden de compra).
  ejecutarAccion: async (idMensaje, indice) => {
    const { contexto, mensajes } = get();
    const mensaje = mensajes.find((m) => m.id === idMensaje);
    const accion = mensaje?.acciones?.[indice];
    if (!accion || accion.hecha || accion.ejecutando) return [];
    const marcar = (cambios) =>
      set((s) => ({
        mensajes: s.mensajes.map((m) => (m.id === idMensaje ? { ...m, acciones: m.acciones.map((a, i) => (i === indice ? { ...a, ...cambios } : a)) } : m)),
      }));
    if (accion.accion === "crear_orden") {
      marcar({ ejecutando: true });
      try {
        const orden = await CrearBorradorOrden(contexto.idEmpresa, accion.datos.items, accion.datos.nota);
        marcar({ ejecutando: false, hecha: true, descripcion: `Borrador OC-${orden.numero} creado` });
        set((s) => ({
          mensajes: [
            ...s.mensajes,
            {
              id: `r${siguienteId++}`,
              role: "assistant",
              content: `Listo: creé el borrador **OC-${orden.numero}**. Revisa cantidades y proveedor, y envíalo desde Compras.`,
              acciones: [{ tipo: "orden_compra", descripcion: "Abrir Compras", enlace: "/compras" }],
            },
          ],
        }));
        return [{ tipo: "orden_compra" }];
      } catch (e) {
        marcar({ ejecutando: false });
        set((s) => ({
          mensajes: [...s.mensajes, { id: `r${siguienteId++}`, role: "assistant", content: `No pude crear el borrador: ${e.message}`, error: true }],
        }));
      }
    }
    return [];
  },

  // El usuario aclaró qué quería decir: se aprende la frase y se responde.
  aclarar: async (idMensaje, idIntencion) => {
    const { contexto, memoria, pensando } = get();
    const frase = memoria.pendienteAclarar;
    if (!frase || pensando) return;
    set((s) => ({
      mensajes: s.mensajes.map((m) => (m.id === idMensaje ? { ...m, aclaraciones: [], elegida: idIntencion } : m)),
      memoria: { ...s.memoria, pendienteAclarar: null },
      // Se aprende de inmediato en esta sesión y se guarda para la empresa.
      perfil: s.perfil ? { ...s.perfil, aprendidas: [...(s.perfil.aprendidas ?? []), { frase: normalizar(frase), intencion: idIntencion, usos: 1 }] } : s.perfil,
    }));
    AprenderFrase(contexto.idEmpresa, normalizar(frase), idIntencion).catch(() => {});
    return get().responder(frase, { forzar: idIntencion });
  },
}));
