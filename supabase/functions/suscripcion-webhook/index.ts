// Recibe los eventos de Wompi (cuenta de MCCore) y activa el plan pagado.
//
// Despliegue SIN verificación de JWT (Wompi no envía la sesión de Supabase):
//   supabase functions deploy suscripcion-webhook --no-verify-jwt
// En el panel de Wompi de MCCore → Desarrolladores → URL de eventos:
//   https://<tu-proyecto>.supabase.co/functions/v1/suscripcion-webhook
// Secreto: WOMPI_STOCKLY_EVENTS_SECRET (test_events_... o prod_events_...).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { enviarRecibo } from "../_shared/recibo.ts";

const ok = (cuerpo: unknown = { ok: true }) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { "Content-Type": "application/json" } });

async function sha256(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
// deno-lint-ignore no-explicit-any
const leer = (obj: any, ruta: string) => ruta.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  const secreto = Deno.env.get("WOMPI_STOCKLY_EVENTS_SECRET") ?? Deno.env.get("WOMPIEVENT");
  if (!secreto) return new Response("Sin secreto de eventos", { status: 500 });

  // deno-lint-ignore no-explicit-any
  const evento: any = await req.json().catch(() => null);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const t = evento?.data?.transaction;
  // Registro de cada aviso (sin datos de tarjeta) para diagnosticar el webhook.
  const registrar = (firma_valida: boolean | null, resultado: string) =>
    admin.from("wompi_eventos").insert({
      evento: String(evento?.event ?? "").slice(0, 60) || null,
      referencia: t?.reference ? String(t.reference).slice(0, 120) : null,
      estado: t?.status ? String(t.status).slice(0, 30) : null,
      transaccion: t?.id ? String(t.id).slice(0, 80) : null,
      firma_valida,
      resultado: resultado.slice(0, 500),
    }).then(() => {}, () => {});

  // Una cuenta de Wompi tiene una sola URL de eventos. Si llega el pago de un link de venta
  // (no es una suscripción STK-), se pasa a wompi-webhook, que lo valida con el secreto de la empresa.
  if (t?.payment_link_id && !String(t?.reference ?? "").startsWith("STK-")) {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/wompi-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evento),
    }).catch(() => null);
    await registrar(null, `link de venta → wompi-webhook (${r?.status ?? "sin respuesta"})`);
    return new Response(r ? await r.text() : "Error", { status: r?.status ?? 502, headers: { "Content-Type": "application/json" } });
  }

  if (evento?.event !== "transaction.updated") {
    await registrar(null, "ignorado: no es transaction.updated");
    return ok({ ignorado: true });
  }

  // Firma: valores de signature.properties (en data) + timestamp + secreto, en SHA256.
  const propiedades: string[] = evento.signature?.properties ?? [];
  const cadena = propiedades.map((p) => String(leer(evento.data, p) ?? "")).join("") + String(evento.timestamp) + secreto;
  if (!evento.signature?.checksum || (await sha256(cadena)).toLowerCase() !== String(evento.signature.checksum).toLowerCase()) {
    console.error("[suscripcion-webhook] Firma inválida");
    await registrar(false, "firma inválida: revisa que el secreto de eventos sea el del mismo ambiente (Sandbox o Producción)");
    return new Response("Firma inválida", { status: 401 });
  }

  if (!t?.reference?.startsWith("STK-")) {
    await registrar(true, "ignorado: no es una suscripción de Stockly");
    return ok({ ignorado: "no es una suscripción" });
  }

  const { data, error } = await admin.rpc("stockly_aplicar_pago_suscripcion", {
    _referencia: t.reference,
    _estado: t.status,
    _transaccion: t.id,
    _monto_centavos: Number(t.amount_in_cents),
    _metodo: t.payment_method_type ?? null,
  });
  if (error) {
    console.error("[suscripcion-webhook]", error.message);
    await registrar(true, `error: ${error.message}`);
    return new Response("Error al registrar", { status: 500 });
  }
  const recibo = t.status === "APPROVED" ? await enviarRecibo(admin, t.reference) : null;
  await registrar(true, JSON.stringify({ ...data, recibo }));
  return ok(data);
});
