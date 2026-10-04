import { create } from "zustand";
import { PreguntarNovandra } from "../supabase/novandra";

export const SUGERENCIAS_NOVANDRA = [
  "¿Qué productos debo reabastecer esta semana?",
  "Resume mis ventas de los últimos 7 días",
  "¿Qué bodega tiene más inventario quieto?",
  "Prepara una orden de compra para lo que está bajo mínimo",
];

const bienvenida = {
  id: "bienvenida",
  role: "assistant",
  content:
    "Hola, soy Novandra. Puedo revisar tus ventas y tu inventario, decirte qué reabastecer, preparar órdenes de compra en borrador y dejar recordatorios al equipo. ¿Por dónde empezamos?",
};

let siguienteId = 1;
let controlador = null;

// Conversación con Novandra. Vive mientras la sesión esté abierta.
export const useNovandraStore = create((set, get) => ({
  abierto: false,
  mensajes: [bienvenida],
  pensando: false,
  abrir: (pregunta) => {
    set({ abierto: true });
    if (pregunta) get().enviar(pregunta);
  },
  cerrar: () => set({ abierto: false }),
  reiniciar: () => {
    controlador?.abort();
    set({ mensajes: [bienvenida], pensando: false });
  },
  detener: () => controlador?.abort(),

  // contexto: { idEmpresa, empresa, moneda }
  contexto: null,
  setContexto: (contexto) => set({ contexto }),

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

    const idRespuesta = `r${siguienteId++}`;
    // La bienvenida y las respuestas con error son solo de la interfaz: no se envían al modelo.
    const historial = [...mensajes, { id: `p${siguienteId++}`, role: "user", content: pregunta }];
    set({
      mensajes: [...historial, { id: idRespuesta, role: "assistant", content: "", estado: "Pensando", enCurso: true }],
      pensando: true,
    });

    const actualizar = (cambios) =>
      set((s) => ({
        mensajes: s.mensajes.map((m) => (m.id === idRespuesta ? { ...m, ...(typeof cambios === "function" ? cambios(m) : cambios) } : m)),
      }));

    controlador = new AbortController();
    let acciones = [];
    try {
      await PreguntarNovandra({
        ...contexto,
        senal: controlador.signal,
        mensajes: historial
          .filter((m) => m.id !== "bienvenida" && !m.error && m.content)
          .map(({ role, content }) => ({ role, content })),
        alEvento: (e) => {
          if (e.tipo === "estado") actualizar({ estado: e.texto });
          else if (e.tipo === "texto") actualizar((m) => ({ content: m.content + e.delta, estado: null }));
          else if (e.tipo === "fin") {
            acciones = e.acciones ?? [];
            actualizar({ acciones, enCurso: false, estado: null });
          } else if (e.tipo === "error") {
            acciones = e.acciones ?? [];
            actualizar((m) => ({
              enCurso: false,
              estado: null,
              acciones,
              // Si ya había texto, se conserva y se agrega el aviso.
              content: m.content ? `${m.content}\n\n_${e.mensaje}_` : e.mensaje,
              error: !m.content,
            }));
          }
        },
      });
    } catch (e) {
      if (e.name === "AbortError") {
        actualizar((m) => ({ enCurso: false, estado: null, content: m.content || "Respuesta detenida.", detenido: true }));
      } else {
        actualizar({ enCurso: false, estado: null, content: e.message, error: true });
      }
    } finally {
      controlador = null;
      set({ pensando: false });
    }
    return acciones;
  },
}));
