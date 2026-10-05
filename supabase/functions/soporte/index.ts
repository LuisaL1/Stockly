// Envía por correo una solicitud de soporte creada desde la app:
//  - al equipo de Stockly (con "responder a" el correo de quien escribió),
//  - y una confirmación con el número de solicitud a quien escribió.
//
// Despliegue (con verificación de JWT, la llama la app con la sesión del usuario):
//   supabase functions deploy soporte
// Secretos: BREVO_API_KEY (Brevo → SMTP & API → API Keys).
// Opcionales: SOPORTE_CORREO (por defecto equipo@appstockly.com), SOPORTE_REMITENTE (igual).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const CATEGORIAS: Record<string, string> = {
  duda: "Duda de uso",
  error: "Algo no funciona",
  pagos: "Plan, pagos o facturación",
  sugerencia: "Sugerencia",
  otro: "Otro",
};

const escapar = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function plantilla(titulo: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#F4F1EC;font-family:Helvetica,Arial,sans-serif;color:#17131D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #E7E2DA;">
<tr><td style="padding:26px 30px 6px;font-size:19px;font-weight:700;"><img src="https://csiwkliqxivjkvogkfdi.supabase.co/storage/v1/object/public/marca/logo-correo.png" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;width:30px;height:30px;border:0;margin-right:8px;">Stockly</td></tr>
<tr><td style="padding:14px 30px 26px;"><h1 style="margin:0 0 14px;font-size:20px;">${titulo}</h1>${cuerpo}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#6B6472;">Stockly · MCCore</p>
</td></tr></table></body></html>`;
}

async function enviarCorreo(apiKey: string, correo: Record<string, unknown>) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(correo),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Cliente del usuario: solo puede leer solicitudes de su empresa.
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  // Cliente de servicio: solo para marcar la solicitud como enviada.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { id } = await req.json().catch(() => ({}));
  const { data: s } = await db
    .from("soporte_solicitudes")
    .select("id, categoria, asunto, mensaje, nombre, email, contexto, correo_enviado, created_at, Empresa(id, nombre)")
    .eq("id", Number(id))
    .maybeSingle();
  if (!s) return responder({ error: "Solicitud no encontrada" }, 404);
  if (s.correo_enviado) return responder({ ok: true, repetido: true });

  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) {
    console.warn("[soporte] Falta el secreto BREVO_API_KEY: la solicitud quedó guardada sin correo.");
    return responder({ ok: true, correo: false });
  }

  const destino = Deno.env.get("SOPORTE_CORREO") ?? "equipo@appstockly.com";
  const remitente = Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com";
  // deno-lint-ignore no-explicit-any
  const empresa = (s as any).Empresa ?? {};
  const ctx = (s.contexto ?? {}) as Record<string, string>;
  const numero = `#${s.id}`;
  const categoria = CATEGORIAS[s.categoria] ?? s.categoria;
  const mensajeHtml = escapar(s.mensaje).replace(/\n/g, "<br>");
  const fila = (k: string, v: unknown) =>
    v ? `<tr><td style="padding:3px 12px 3px 0;color:#6B6472;white-space:nowrap;">${k}</td><td style="padding:3px 0;">${escapar(v)}</td></tr>` : "";

  try {
    // 1. Al equipo de Stockly.
    await enviarCorreo(apiKey, {
      sender: { name: "Soporte Stockly", email: remitente },
      to: [{ email: destino, name: "Equipo Stockly" }],
      replyTo: s.email ? { email: s.email, name: s.nombre ?? s.email } : undefined,
      subject: `[Soporte ${numero}] ${categoria} · ${s.asunto}`,
      htmlContent: plantilla(
        `Solicitud ${numero}: ${escapar(s.asunto)}`,
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${mensajeHtml}</p>
         <table role="presentation" style="font-size:13px;border-top:1px solid #E7E2DA;padding-top:10px;margin-top:6px;">
           ${fila("Categoría", categoria)}${fila("Empresa", `${empresa.nombre ?? "—"} (id ${empresa.id ?? "—"})`)}
           ${fila("Persona", s.nombre)}${fila("Correo", s.email)}${fila("Plan", ctx.plan)}${fila("Pantalla", ctx.pantalla)}
           ${fila("Navegador", ctx.navegador)}${fila("Fecha", new Date(s.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}
         </table>
         <p style="margin:14px 0 0;font-size:13px;color:#6B6472;">Responde este correo para contestarle directamente.</p>`,
      ),
    });

    // 2. Confirmación a quien escribió.
    if (s.email) {
      await enviarCorreo(apiKey, {
        sender: { name: "Stockly", email: remitente },
        to: [{ email: s.email, name: s.nombre ?? s.email }],
        replyTo: { email: destino, name: "Equipo Stockly" },
        subject: `Recibimos tu solicitud ${numero} · Stockly`,
        htmlContent: plantilla(
          "Recibimos tu solicitud",
          `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Hola${s.nombre ? ` ${escapar(s.nombre.split(" ")[0])}` : ""}, gracias por escribirnos. Tu solicitud <strong>${numero}</strong> llegó al equipo de Stockly y te responderemos a este correo.</p>
           <p style="margin:0 0 6px;font-size:13px;color:#6B6472;">Tu mensaje:</p>
           <p style="margin:0;padding:12px 14px;background:#F2E7F8;border-radius:12px;font-size:14px;line-height:1.55;"><strong>${escapar(s.asunto)}</strong><br>${mensajeHtml}</p>`,
        ),
      });
    }
  } catch (e) {
    console.error("[soporte]", e);
    return responder({ ok: true, correo: false });
  }

  await admin.from("soporte_solicitudes").update({ correo_enviado: true }).eq("id", s.id);
  return responder({ ok: true, correo: true });
});
