// Correos de Stockly con Brevo: plantilla con la marca y envío. Nunca lanza error.
export const LOGO_CORREO = "https://csiwkliqxivjkvogkfdi.supabase.co/storage/v1/object/public/marca/logo-correo.png";

export const escapar = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function plantillaCorreo({ titulo, cuerpo, boton }: { titulo: string; cuerpo: string; boton?: { texto: string; url: string } }) {
  const correo = Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com";
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#F4F1EC;font-family:Helvetica,Arial,sans-serif;color:#17131D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #E7E2DA;">
<tr><td style="padding:26px 30px 6px;font-size:19px;font-weight:700;"><img src="${LOGO_CORREO}" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;width:30px;height:30px;border:0;margin-right:8px;">Stockly</td></tr>
<tr><td style="padding:14px 30px 8px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">${titulo}</h1>
${cuerpo}
${boton ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td style="background:#8800B3;border-radius:12px;"><a href="${boton.url}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">${escapar(boton.texto)}</a></td></tr></table>` : ""}
</td></tr>
<tr><td style="padding:10px 30px 26px;font-size:13px;color:#6B6472;">¿Dudas? Responde este correo y te ayudamos. El equipo de Stockly.</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#6B6472;">Stockly · MCCore · ${escapar(correo)}</p>
</td></tr></table></body></html>`;
}

export async function enviarCorreo({ para, nombre, asunto, html }: { para: string; nombre?: string | null; asunto: string; html: string }) {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) return false;
    const remitente = Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com";
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Stockly", email: remitente },
        to: [{ email: para, name: nombre || para }],
        replyTo: { email: remitente, name: "Equipo Stockly" },
        subject: asunto,
        htmlContent: html,
      }),
    });
    if (!r.ok) console.error("[correo] Brevo", r.status, (await r.text()).slice(0, 300));
    return r.ok;
  } catch (e) {
    console.error("[correo]", (e as Error).message);
    return false;
  }
}
