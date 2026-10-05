// Comprobante de pago de la suscripción: PDF + correo al cliente (y copia a Stockly).
// Lo usan suscripcion-webhook y suscripcion-pago apenas un pago queda aprobado.
// Se envía una sola vez por pago (pagos_suscripcion.recibo_enviado_en).
//
// Datos del emisor (MCCore). Se pueden cambiar sin desplegar con estos secretos opcionales:
//   STOCKLY_EMISOR_RAZON_SOCIAL, STOCKLY_EMISOR_NIT, STOCKLY_EMISOR_DIRECCION
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
// deno-lint-ignore no-explicit-any
type Cliente = any;

const LOGO = "https://csiwkliqxivjkvogkfdi.supabase.co/storage/v1/object/public/marca/logo-correo.png";
const MORADO = rgb(0.533, 0, 0.702);
const GRIS = rgb(0.42, 0.39, 0.45);
const TINTA = rgb(0.09, 0.075, 0.11);

const cop = (n: number) => "$" + Math.round(Number(n)).toLocaleString("es-CO").replace(/,/g, ".");
const fecha = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "long", year: "numeric" });
const escapar = (t: unknown) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const METODOS: Record<string, string> = {
  CARD: "Tarjeta",
  PSE: "PSE",
  NEQUI: "Nequi",
  BANCOLOMBIA_TRANSFER: "Botón Bancolombia",
  BANCOLOMBIA_QR: "QR Bancolombia",
  DAVIPLATA: "Daviplata",
};

function emisor() {
  return {
    razonSocial: Deno.env.get("STOCKLY_EMISOR_RAZON_SOCIAL") ?? "MCCore",
    nit: Deno.env.get("STOCKLY_EMISOR_NIT") ?? "1005233408",
    direccion: Deno.env.get("STOCKLY_EMISOR_DIRECCION") ?? "Quimbaya, Quindío, Colombia",
    correo: Deno.env.get("SOPORTE_REMITENTE") ?? "equipo@appstockly.com",
  };
}

// deno-lint-ignore no-explicit-any
async function crearPdf(d: any) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Comprobante de pago ${d.numero}`);
  pdf.setAuthor("Stockly");
  const pag = pdf.addPage([595, 842]);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const texto = (t: string, x: number, y: number, o: { f?: typeof normal; s?: number; c?: ReturnType<typeof rgb> } = {}) =>
    pag.drawText(t, { x, y, font: o.f ?? normal, size: o.s ?? 10, color: o.c ?? TINTA });
  const derecha = (t: string, xFin: number, y: number, o: { f?: typeof normal; s?: number; c?: ReturnType<typeof rgb> } = {}) =>
    texto(t, xFin - (o.f ?? normal).widthOfTextAtSize(t, o.s ?? 10), y, o);
  const M = 50, ANCHO = 595 - 2 * M;

  // Encabezado
  try {
    const bytes = new Uint8Array(await (await fetch(LOGO)).arrayBuffer());
    const img = await pdf.embedPng(bytes);
    pag.drawImage(img, { x: M, y: 760, width: 34, height: 34 });
  } catch { /* sin logo */ }
  texto("Stockly", M + 42, 770, { f: negrita, s: 18 });
  derecha("COMPROBANTE DE PAGO", 595 - M, 778, { f: negrita, s: 12, c: MORADO });
  derecha(d.numero, 595 - M, 762, { f: negrita, s: 11 });
  derecha(fecha(d.fecha), 595 - M, 748, { s: 9, c: GRIS });

  // Emisor y cliente
  let y = 712;
  texto("EMITIDO POR", M, y, { f: negrita, s: 8, c: GRIS });
  texto("CLIENTE", M + ANCHO / 2, y, { f: negrita, s: 8, c: GRIS });
  const e = d.emisor;
  const izq = [e.razonSocial, e.nit ? `NIT ${e.nit}` : null, e.direccion, e.correo].filter(Boolean);
  const der = [d.cliente, d.empresa, d.nit ? `NIT ${d.nit}` : null, d.email].filter(Boolean);
  izq.forEach((t: string, i: number) => texto(t, M, y - 16 - i * 14, { f: i === 0 ? negrita : normal }));
  der.forEach((t: string, i: number) => texto(t, M + ANCHO / 2, y - 16 - i * 14, { f: i === 0 ? negrita : normal }));
  y -= 16 + Math.max(izq.length, der.length) * 14 + 18;

  // Detalle
  pag.drawRectangle({ x: M, y: y - 6, width: ANCHO, height: 22, color: rgb(0.95, 0.91, 0.97) });
  texto("Concepto", M + 10, y, { f: negrita, s: 9 });
  derecha("Valor", 595 - M - 10, y, { f: negrita, s: 9 });
  y -= 28;
  for (const l of d.lineas as { concepto: string; detalle?: string; valor: number }[]) {
    texto(l.concepto, M + 10, y, { f: negrita });
    derecha(l.valor < 0 ? `-${cop(-l.valor)}` : cop(l.valor), 595 - M - 10, y);
    y -= 14;
    if (l.detalle) {
      texto(l.detalle, M + 10, y, { s: 9, c: GRIS });
      y -= 14;
    }
    y -= 6;
  }
  pag.drawLine({ start: { x: M, y: y + 8 }, end: { x: 595 - M, y: y + 8 }, thickness: 0.7, color: rgb(0.88, 0.86, 0.84) });
  y -= 8;
  texto("Total pagado", M + 10, y, { f: negrita, s: 12 });
  derecha(cop(d.total), 595 - M - 10, y, { f: negrita, s: 12, c: MORADO });
  y -= 36;

  // Pago
  texto("PAGO", M, y, { f: negrita, s: 8, c: GRIS });
  const pago = [
    `Medio: ${METODOS[d.metodo] ?? d.metodo ?? "Wompi"} (Wompi)`,
    `Transacción Wompi: ${d.transaccion ?? "-"}`,
    `Referencia: ${d.referencia}`,
    `Estado: Aprobado`,
  ];
  pago.forEach((t, i) => texto(t, M, y - 16 - i * 14));
  y -= 16 + pago.length * 14 + 20;

  texto("Este documento es un comprobante de pago; no es una factura electrónica de venta.", M, y, { s: 8.5, c: GRIS });
  texto(`¿Dudas? Escríbenos a ${e.correo}.`, M, y - 12, { s: 8.5, c: GRIS });
  texto("Stockly · inventario, ventas y facturación", M, 40, { s: 8, c: GRIS });
  return await pdf.save();
}

function base64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Envía el comprobante si el pago está aprobado y aún no se ha enviado. Nunca lanza error.
export async function enviarRecibo(admin: Cliente, referencia: string) {
  try {
    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) return { ok: false, motivo: "sin BREVO_API_KEY" };

    // Se "reserva" el envío para que el webhook y la verificación no lo manden dos veces.
    const { data: pago } = await admin
      .from("pagos_suscripcion")
      .update({ recibo_enviado_en: new Date().toISOString() })
      .eq("referencia", referencia)
      .eq("estado", "aprobado")
      .is("recibo_enviado_en", null)
      .select()
      .maybeSingle();
    if (!pago) return { ok: true, repetido: true };

    const [{ data: empresa }, { data: plan }, { data: perfil }] = await Promise.all([
      admin.from("Empresa").select("nombre, nit").eq("id", pago.id_empresa).maybeSingle(),
      admin.from("stockly_planes").select("nombre").eq("id", pago.id_plan).maybeSingle(),
      pago.creado_por ? admin.from("Usuarios").select("nombres, email").eq("id", pago.creado_por).maybeSingle() : { data: null },
    ]);
    const email = pago.email ?? perfil?.email;
    if (!email) return { ok: false, motivo: "sin correo" };

    const e = emisor();
    const numero = `CP-${String(pago.numero_recibo ?? pago.id).padStart(6, "0")}`;
    const hasta = new Date(pago.periodo_hasta ?? Date.now());
    const desde = new Date(hasta);
    if (pago.ciclo === "anual") desde.setFullYear(desde.getFullYear() - 1);
    else desde.setMonth(desde.getMonth() - 1);
    // El cliente es la persona que pagó; el nombre de la empresa solo si es uno real
    // (no el automático "empresa de ..." que crean algunas cuentas).
    const nombreEmpresa = String(empresa?.nombre ?? "").trim();
    const empresaReal = nombreEmpresa && !/^empresa de\b/i.test(nombreEmpresa) ? nombreEmpresa : null;
    const cliente = String(perfil?.nombres ?? "").trim() || empresaReal || email;
    // deno-lint-ignore no-explicit-any
    const complementos: any[] = Array.isArray(pago.complementos) ? pago.complementos : [];
    const esComplemento = pago.tipo === "complemento";
    const periodo = `Periodo: ${fecha(esComplemento ? (pago.aprobado_en ?? new Date()) : desde)} al ${fecha(hasta)}`;
    const lineas = [
      ...(esComplemento
        ? []
        : [
            { concepto: `Suscripción Stockly · Plan ${plan?.nombre ?? pago.id_plan} ${pago.ciclo}`, detalle: periodo, valor: Number(pago.precio) },
            ...(Number(pago.descuento) > 0 ? [{ concepto: "Descuento primera compra", valor: -Number(pago.descuento) }] : []),
          ]),
      ...complementos.map((x) => ({
        concepto: `Complemento · ${x.cantidad} × ${x.nombre ?? x.id}`,
        detalle: esComplemento ? periodo : undefined,
        valor: Number(x.total),
      })),
    ];
    const datos = {
      lineas,
      numero, fecha: pago.aprobado_en ?? new Date(), emisor: e, cliente,
      empresa: empresaReal && empresaReal !== cliente ? empresaReal : null, nit: empresa?.nit,
      email, plan: plan?.nombre ?? pago.id_plan, ciclo: pago.ciclo, precio: pago.precio, descuento: pago.descuento,
      total: pago.total, desde, hasta, metodo: pago.metodo, transaccion: pago.transaccion, referencia: pago.referencia,
    };
    const pdf = await crearPdf(datos);
    const nombre = String(perfil?.nombres ?? "").split(" ")[0];

    const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px 12px;background:#F4F1EC;font-family:Helvetica,Arial,sans-serif;color:#17131D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;border:1px solid #E7E2DA;">
<tr><td style="padding:26px 30px 6px;font-size:19px;font-weight:700;"><img src="${LOGO}" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;width:30px;height:30px;border:0;margin-right:8px;">Stockly</td></tr>
<tr><td style="padding:14px 30px 8px;">
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">¡Gracias por tu compra${nombre ? `, ${escapar(nombre)}` : ""}!</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;">${
      esComplemento
        ? `Recibimos tu pago: ${complementos.map((x) => `<strong>${escapar(x.cantidad)} × ${escapar(x.nombre ?? x.id)}</strong>`).join(", ")} ya está activo en <strong>${escapar(datos.empresa ?? datos.cliente)}</strong> hasta el <strong>${fecha(hasta)}</strong>.`
        : `Recibimos tu pago y el plan <strong>${escapar(datos.plan)}</strong>${datos.empresa ? ` de <strong>${escapar(datos.empresa)}</strong>` : ""} ya está activo hasta el <strong>${fecha(hasta)}</strong>.`
    }</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border:1px solid #E7E2DA;border-radius:12px;">
<tr><td style="padding:12px 16px;color:#6B6472;">Comprobante</td><td style="padding:12px 16px;text-align:right;font-weight:600;">${numero}</td></tr>
${esComplemento ? "" : `<tr><td style="padding:0 16px 12px;color:#6B6472;">Plan</td><td style="padding:0 16px 12px;text-align:right;">${escapar(datos.plan)} ${escapar(pago.ciclo)}</td></tr>`}
${complementos.map((x) => `<tr><td style="padding:0 16px 12px;color:#6B6472;">${escapar(x.cantidad)} × ${escapar(x.nombre ?? x.id)}</td><td style="padding:0 16px 12px;text-align:right;">${cop(x.total)}</td></tr>`).join("")}
${Number(pago.descuento) > 0 ? `<tr><td style="padding:0 16px 12px;color:#6B6472;">Descuento primera compra</td><td style="padding:0 16px 12px;text-align:right;">-${cop(pago.descuento)}</td></tr>` : ""}
<tr><td style="padding:12px 16px;border-top:1px solid #E7E2DA;font-weight:700;">Total pagado</td><td style="padding:12px 16px;border-top:1px solid #E7E2DA;text-align:right;font-weight:700;color:#8800B3;">${cop(pago.total)}</td></tr>
</table>
<p style="margin:18px 0 8px;font-size:14px;line-height:1.6;">Adjuntamos tu comprobante de pago en PDF. Antes de que venza el plan te avisaremos para que lo renueves.</p>
</td></tr>
<tr><td style="padding:10px 30px 26px;font-size:13px;color:#6B6472;">¿Dudas? Responde este correo y te ayudamos. El equipo de Stockly.</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#6B6472;">Stockly · ${escapar(e.razonSocial)} · ${escapar(e.correo)}</p>
</td></tr></table></body></html>`;

    const envio = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "Stockly", email: e.correo },
        to: [{ email, name: perfil?.nombres ?? email }],
        bcc: [{ email: e.correo, name: "Ventas Stockly" }],
        replyTo: { email: e.correo, name: "Equipo Stockly" },
        subject: `Pago recibido · ${esComplemento ? "Complemento" : `Plan ${datos.plan}`} · ${numero}`,
        htmlContent: html,
        attachment: [{ name: `Comprobante-${numero}.pdf`, content: base64(pdf) }],
      }),
    });
    if (!envio.ok) {
      console.error("[recibo] Brevo", envio.status, (await envio.text()).slice(0, 300));
      // Se libera para reintentarlo en el próximo aviso o verificación.
      await admin.from("pagos_suscripcion").update({ recibo_enviado_en: null }).eq("id", pago.id);
      return { ok: false, motivo: "correo" };
    }
    return { ok: true, numero };
  } catch (err) {
    console.error("[recibo]", (err as Error).message);
    return { ok: false, motivo: "error" };
  }
}
