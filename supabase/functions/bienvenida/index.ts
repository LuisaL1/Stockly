// Correo de bienvenida con los próximos pasos, al dueño que acaba de crear su empresa.
// Se envía una sola vez por empresa (Empresa.bienvenida_enviada_en).
//
// Despliegue (con verificación de JWT): supabase functions deploy bienvenida
// Secretos: BREVO_API_KEY. Opcional: SOPORTE_REMITENTE (por defecto equipo@appstockly.com).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
const escapar = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const PASOS = [
  ["Sube tus productos", "Con la plantilla de Excel cargas todo tu catálogo en minutos.", "/configurar/datos", "Importar productos"],
  ["Pon tu logo y tus datos", "Aparecen en tus facturas, reportes y en el menú.", "/configurar/empresa", "Configurar empresa"],
  ["Configura cómo te pagan", "Numeración de facturas, IVA y tu llave Bre-B para cobrar desde cualquier banco.", "/configurar/facturacion", "Ir a facturación"],
  ["Haz tu primera venta", "Agrega productos al ticket, elige el medio de pago y envía la factura por WhatsApp.", "/ventas", "Vender"],
  ["Invita a tu equipo", "Cada persona entra con su propio correo y los permisos que tú decidas.", "/configurar/usuarios", "Invitar"],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: sesion } = await db.auth.getUser();
  const usuario = sesion?.user;
  if (!usuario?.email) return responder({ error: "Falta la sesión" }, 401);

  // Empresa del dueño que está en sesión.
  const { data: perfil } = await admin
    .from("Usuarios")
    .select("id, nombres, tipouser, asignarempresa(Empresa(id, nombre, bienvenida_enviada_en))")
    .eq("idauth", usuario.id)
    .maybeSingle();
  // deno-lint-ignore no-explicit-any
  const empresa = (perfil as any)?.asignarempresa?.[0]?.Empresa;
  if (!perfil || !empresa) return responder({ ok: false, motivo: "sin empresa" });
  if (!/^(dueño|dueno|administrador|admin)$/i.test(String(perfil.tipouser ?? ""))) return responder({ ok: false, motivo: "no es dueño" });
  if (empresa.bienvenida_enviada_en) return responder({ ok: true, repetido: true });

  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return responder({ ok: false, motivo: "sin BREVO_API_KEY" });

  // Se "reserva" el envío en una sola operación: si llegan dos llamadas a la vez (la app
  // completa el registro desde dos lugares al entrar), solo la primera envía el correo.
  const { data: reservada } = await admin
    .from("Empresa")
    .update({ bienvenida_enviada_en: new Date().toISOString() })
    .eq("id", empresa.id)
    .is("bienvenida_enviada_en", null)
    .select("id")
    .maybeSingle();
  if (!reservada) return responder({ ok: true, repetido: true });

  const { origen } = await req.json().catch(() => ({}));
  const base = /^https?:\/\/[^\s/]+$/.test(String(origen ?? "")) ? String(origen) : "";
  const nombre = String(perfil.nombres ?? "").split(" ")[0];
  const remitente = Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com";

  const pasos = PASOS.map(
    ([titulo, texto, ruta, boton], i) => `<tr>
      <td style="vertical-align:top;padding:0 12px 18px 0;"><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:9px;background:#F2E7F8;color:#8800B3;font-weight:700;">${i + 1}</span></td>
      <td style="vertical-align:top;padding:0 0 18px;">
        <strong style="font-size:15px;">${titulo}</strong><br>
        <span style="font-size:14px;line-height:1.5;color:#6B6472;">${texto}</span><br>
        ${base ? `<a href="${base}${ruta}" style="font-size:14px;font-weight:600;color:#8800B3;text-decoration:none;">${boton} →</a>` : ""}
      </td></tr>`,
  ).join("");

  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#F4F1EC;font-family:Helvetica,Arial,sans-serif;color:#17131D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #E7E2DA;">
<tr><td style="padding:26px 30px 6px;font-size:19px;font-weight:700;"><img src="https://csiwkliqxivjkvogkfdi.supabase.co/storage/v1/object/public/marca/logo-correo.png" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;width:30px;height:30px;border:0;margin-right:8px;">Stockly</td></tr>
<tr><td style="padding:14px 30px 8px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">¡Te damos la bienvenida${nombre ? `, ${escapar(nombre)}` : ""}!</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;"><strong>${escapar(empresa.nombre)}</strong> ya está en Stockly. Estos son tus primeros pasos para dejar todo listo:</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${pasos}</table>
${base ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;"><tr><td style="background:#8800B3;border-radius:12px;"><a href="${base}/" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">Entrar a Stockly</a></td></tr></table>` : ""}
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;">¿Dudas? Pregúntale a <strong>Novandra</strong>, tu asistente dentro de la app, o revisa el ${base ? `<a href="${base}/ayuda" style="color:#8800B3;">Centro de ayuda</a>` : "Centro de ayuda"}. También puedes responder este correo y el equipo de Stockly te ayuda.</p>
</td></tr>
<tr><td style="padding:10px 30px 26px;font-size:13px;color:#6B6472;">Con cariño, el equipo de Stockly.</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#6B6472;">Stockly · MCCore · equipo@appstockly.com</p>
</td></tr></table></body></html>`;

  const envio = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Stockly", email: remitente },
      to: [{ email: usuario.email, name: perfil.nombres ?? usuario.email }],
      replyTo: { email: remitente, name: "Equipo Stockly" },
      subject: `Te damos la bienvenida a Stockly · ${empresa.nombre}`,
      htmlContent: html,
    }),
  });
  if (!envio.ok) {
    console.error("[bienvenida] Brevo", envio.status, (await envio.text()).slice(0, 300));
    // Se libera para reintentarlo en el próximo ingreso.
    await admin.from("Empresa").update({ bienvenida_enviada_en: null }).eq("id", empresa.id);
    return responder({ ok: false, motivo: "correo" });
  }
  return responder({ ok: true });
});
