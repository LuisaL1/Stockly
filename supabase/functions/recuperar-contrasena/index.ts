// Recuperar contraseña: genera el enlace seguro de Supabase y lo envía con la plantilla de
// Stockly por la API de Brevo (igual que los demás correos), en lugar del correo de Supabase.
//
// Despliegue SIN verificación de JWT (la usa la pantalla de inicio, sin sesión):
//   supabase functions deploy recuperar-contrasena --no-verify-jwt
// Responde siempre lo mismo, exista o no la cuenta, para no revelar qué correos están registrados.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { enviarCorreo, escapar, plantillaCorreo } from "../_shared/correo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const { email: crudo, origen } = await req.json().catch(() => ({}));
  const email = String(crudo ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return responder({ error: "Escribe un correo válido" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null;

  // Límite: 3 por correo y 10 por IP cada hora.
  const haceUnaHora = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count: porCorreo }, { count: porIp }] = await Promise.all([
    admin.from("recuperaciones_contrasena").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", haceUnaHora),
    ip
      ? admin.from("recuperaciones_contrasena").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", haceUnaHora)
      : Promise.resolve({ count: 0 }),
  ]);
  if ((porCorreo ?? 0) >= 3 || (porIp ?? 0) >= 10) {
    return responder({ error: "Ya pediste varios enlaces. Revisa tu correo (también Spam) o intenta en una hora." }, 429);
  }
  await admin.from("recuperaciones_contrasena").insert({ email, ip });

  const base = /^https?:\/\/[^\s/]+$/.test(String(origen ?? "")) ? String(origen) : "";
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: base ? { redirectTo: `${base}/restablecer` } : undefined,
  });
  // Si la cuenta no existe se responde igual (no se revela).
  const enlace = data?.properties?.action_link;
  if (error || !enlace) return responder({ ok: true });

  const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${t}</p>`;
  await enviarCorreo({
    para: email,
    asunto: "Restablece tu contraseña de Stockly",
    html: plantillaCorreo({
      titulo: "Restablece tu contraseña",
      cuerpo:
        p(`Recibimos una solicitud para cambiar la contraseña de tu cuenta de Stockly (${escapar(email)}).`) +
        p("Toca el botón para crear una nueva. El enlace sirve una sola vez y vence en 1 hora."),
      boton: { texto: "Crear nueva contraseña", url: enlace },
    }).replace(
      "¿Dudas? Responde este correo y te ayudamos. El equipo de Stockly.",
      "Si no pediste este cambio, ignora este correo: tu contraseña sigue igual.",
    ),
  });
  return responder({ ok: true });
});
