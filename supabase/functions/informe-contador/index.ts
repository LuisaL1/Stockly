// Envía al contador de la empresa el informe contable en Excel (generado en la app).
//
//  - El destinatario es el contador guardado en Configuración (no lo decide el navegador).
//  - Va con copia a quien lo envía y con "responder a" esa persona.
//  - Solo dueño o administradores; máximo 20 envíos al día por empresa.
//
// Despliegue (con verificación de JWT): supabase functions deploy informe-contador
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
const dinero = (n: unknown) => `$ ${Math.round(Number(n ?? 0)).toLocaleString("es-CO")}`;
const MAX_ADJUNTO = 12 * 1024 * 1024; // total de adjuntos en base64 (Brevo admite hasta ~20 MB por correo)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const cuerpo = await req.json().catch(() => ({}));
  const idEmpresa = Number(cuerpo.id_empresa);
  const { desde, hasta, archivo, nombre_archivo, nota, resumen } = cuerpo as Record<string, string & Record<string, number>>;
  const adjuntarFacturas = cuerpo.adjuntar_facturas === true;
  if (!Number.isInteger(idEmpresa) || !/^\d{4}-\d{2}-\d{2}$/.test(desde ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(hasta ?? "")) {
    return responder({ error: "Solicitud incompleta" }, 400);
  }
  if (typeof archivo !== "string" || !archivo.length || archivo.length > MAX_ADJUNTO) {
    return responder({ error: "El archivo del informe no es válido o es demasiado grande" }, 400);
  }

  // Quién envía y si es dueño o administrador de esa empresa.
  const { data: usuario } = await db.auth.getUser();
  const { data: esAdmin } = await db.rpc("stockly_es_admin_actual");
  const { data: cfg } = await db
    .from("config_facturacion")
    .select("contador_nombre, contador_email, Empresa(nombre)")
    .eq("id_empresa", idEmpresa)
    .maybeSingle();
  if (!usuario?.user || esAdmin !== true || !cfg) return responder({ error: "Solo el dueño o un administrador puede enviar informes" }, 403);
  if (!cfg.contador_email) return responder({ error: "Primero guarda el correo de tu contador" }, 422);

  const { count } = await admin
    .from("informes_contador")
    .select("id", { count: "exact", head: true })
    .eq("id_empresa", idEmpresa)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 10) return responder({ error: "Llegaste al límite de 10 informes por día. Intenta mañana." }, 429);
  // Envíos del mes según el plan.
  const { data: plan } = await db.rpc("stockly_plan", { _id_empresa: idEmpresa });
  const inicioMes = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const { count: delMes } = await admin
    .from("informes_contador")
    .select("id", { count: "exact", head: true })
    .eq("id_empresa", idEmpresa)
    .gte("created_at", new Date(inicioMes.getTime() + 5 * 3_600_000).toISOString());
  const limiteMes = Number(plan?.limite_informes_mes ?? 0);
  if (plan?.limite_informes_mes != null && (delMes ?? 0) >= limiteMes) {
    return responder({ error: `Tu plan ${plan.nombre ?? ""} permite ${limiteMes} envíos al contador por mes. Mejora tu plan para enviar más.` }, 429);
  }

  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) return responder({ error: "El envío de correos no está configurado en el servidor (falta BREVO_API_KEY)" }, 503);

  // Facturas de proveedores de las compras recibidas en el periodo: adjuntas mientras quepan,
  // y como enlaces (7 días) si el correo se haría muy pesado.
  const adjuntos: { name: string; content: string }[] = [];
  const enlaces: { nombre: string; url: string }[] = [];
  if (adjuntarFacturas) {
    const ini = new Date(`${desde}T00:00:00-05:00`).toISOString();
    const fin = new Date(new Date(`${hasta}T00:00:00-05:00`).getTime() + 86_400_000).toISOString();
    const { data: compras } = await db
      .from("ordenes_compra")
      .select("numero, factura_proveedor_numero, factura_proveedor_archivo, factura_proveedor_nombre, proveedores(nombre)")
      .eq("id_empresa", idEmpresa)
      .eq("estado", "recibida")
      .gte("recibida_en", ini)
      .lt("recibida_en", fin)
      .not("factura_proveedor_archivo", "is", null)
      .limit(200);
    let peso = archivo.length;
    for (const c of compras ?? []) {
      // deno-lint-ignore no-explicit-any
      const proveedor = (c as any).proveedores?.nombre ?? "proveedor";
      const extension = (c.factura_proveedor_nombre ?? c.factura_proveedor_archivo ?? "").split(".").pop() ?? "pdf";
      const nombre = `OC-${c.numero} ${proveedor} ${c.factura_proveedor_numero ?? ""}`.trim().replace(/[^\w.\- ]/g, "_") + `.${extension}`;
      const { data: blob } = await db.storage.from("facturas-proveedor").download(c.factura_proveedor_archivo!);
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binario = "";
        for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        const b64 = btoa(binario);
        if (peso + b64.length <= MAX_ADJUNTO) {
          adjuntos.push({ name: nombre, content: b64 });
          peso += b64.length;
          continue;
        }
      }
      const { data: firmado } = await db.storage.from("facturas-proveedor").createSignedUrl(c.factura_proveedor_archivo!, 7 * 86_400);
      if (firmado?.signedUrl) enlaces.push({ nombre, url: firmado.signedUrl });
    }
  }

  // deno-lint-ignore no-explicit-any
  const empresa = (cfg as any).Empresa?.nombre ?? "tu empresa";
  const remitente = Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com";
  const quien = usuario.user.email!;
  const r = (resumen ?? {}) as Record<string, number>;
  const fila = (k: string, v: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#6B6472;">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600;">${v}</td></tr>`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#F4F1EC;font-family:Helvetica,Arial,sans-serif;color:#17131D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #E7E2DA;">
<tr><td style="padding:26px 30px 8px;font-size:19px;font-weight:700;">Informe contable · ${escapar(empresa)}</td></tr>
<tr><td style="padding:6px 30px 26px;">
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hola${cfg.contador_nombre ? ` ${escapar(String(cfg.contador_nombre).split(" ")[0])}` : ""}, adjunto el informe de <strong>${escapar(empresa)}</strong> del <strong>${desde}</strong> al <strong>${hasta}</strong> en Excel.</p>
${nota ? `<p style="margin:0 0 14px;padding:12px 14px;background:#F2E7F8;border-radius:12px;font-size:14px;line-height:1.55;">${escapar(nota).replace(/\n/g, "<br>")}</p>` : ""}
<table role="presentation" style="font-size:14px;width:100%;border-top:1px solid #E7E2DA;margin-top:4px;">
${fila("Facturas emitidas", String(r.facturas ?? 0))}${fila("Base gravable", dinero(r.base))}${fila("IVA", dinero(r.iva))}${fila("Total ventas", dinero(r.total))}${fila("Cobrado en el periodo", dinero(r.cobrado))}${fila("Compras recibidas", dinero(r.compras))}
</table>
${adjuntos.length ? `<p style="margin:16px 0 0;font-size:14px;">También van adjuntas <strong>${adjuntos.length}</strong> factura(s) de proveedores.</p>` : ""}
${enlaces.length ? `<p style="margin:12px 0 6px;font-size:14px;">Facturas de proveedores para descargar (enlaces válidos por 7 días):</p><ul style="margin:0;padding-left:18px;font-size:13px;">${enlaces.map((e) => `<li><a href="${escapar(e.url)}" style="color:#8800B3;">${escapar(e.nombre)}</a></li>`).join("")}</ul>` : ""}
<p style="margin:16px 0 0;font-size:13px;color:#6B6472;">El Excel trae una hoja por sección (resumen, ventas, IVA, cobros, cartera, compras, inventario y movimientos). Para dudas, responde este correo y le llegará a ${escapar(quien)}.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#6B6472;">Enviado con Stockly · MCCore</p>
</td></tr></table></body></html>`;

  const envio = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: `${empresa} vía Stockly`, email: remitente },
      to: [{ email: cfg.contador_email, name: cfg.contador_nombre ?? cfg.contador_email }],
      cc: [{ email: quien }],
      replyTo: { email: quien },
      subject: `Informe contable ${empresa} · ${desde} a ${hasta}`,
      htmlContent: html,
      attachment: [{ name: String(nombre_archivo || "informe-contable.xlsx").replace(/[^\w.\- ]/g, "_"), content: archivo }, ...adjuntos],
    }),
  });
  if (!envio.ok) {
    console.error("[informe-contador] Brevo", envio.status, (await envio.text()).slice(0, 300));
    return responder({ error: "No se pudo enviar el correo. Intenta de nuevo en unos minutos." }, 502);
  }

  await admin.from("informes_contador").insert({ id_empresa: idEmpresa, desde, hasta, email: cfg.contador_email, enviado_por: quien });
  return responder({ ok: true, email: cfg.contador_email, adjuntas: adjuntos.length, enlaces: enlaces.length });
});
