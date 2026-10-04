import { supabase } from "./supabase.config";

const URL_FUNCION = `${import.meta.env.VITE_APP_SUPABASE_URL}/functions/v1/novandra`;

// Conversa con Novandra leyendo la respuesta en streaming.
// alEvento recibe { tipo: "estado" | "texto" | "fin" | "error", ... } a medida que llegan.
export async function PreguntarNovandra({ idEmpresa, empresa, moneda, mensajes, alEvento, senal }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

  let respuesta;
  try {
    respuesta = await fetch(URL_FUNCION, {
      method: "POST",
      signal: senal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_APP_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ id_empresa: idEmpresa, empresa, moneda, mensajes }),
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    // Si la función no está desplegada, el navegador bloquea la respuesta (CORS) y llega aquí.
    throw new Error(
      navigator.onLine === false
        ? "No hay conexión a internet. Revisa tu red e intenta de nuevo."
        : "No se pudo contactar a Novandra. Lo más probable es que la función “novandra” no esté desplegada en Supabase (Edge Functions)."
    );
  }

  if (!respuesta.ok) {
    if (respuesta.status === 404) {
      throw new Error("Novandra aún no está instalada en el servidor. Pide a tu administrador que despliegue la función.");
    }
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.error ?? "Novandra no está disponible en este momento.");
  }

  // Lectura de eventos "data: {...}\n\n".
  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = "";
  let terminado = false;
  while (true) {
    const { value, done } = await lector.read();
    if (done) break;
    pendiente += decodificador.decode(value, { stream: true });
    const bloques = pendiente.split("\n\n");
    pendiente = bloques.pop();
    for (const bloque of bloques) {
      const linea = bloque.split("\n").find((l) => l.startsWith("data: "));
      if (!linea) continue;
      try {
        const evento = JSON.parse(linea.slice(6));
        if (evento.tipo === "fin" || evento.tipo === "error") terminado = true;
        alEvento(evento);
      } catch {
        // fragmento incompleto o no JSON: se ignora
      }
    }
  }
  if (!terminado) {
    alEvento({ tipo: "error", mensaje: "La respuesta se interrumpió. Intenta de nuevo con una pregunta más concreta." });
  }
}
