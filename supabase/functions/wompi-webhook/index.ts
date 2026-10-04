// Recibe los eventos de Wompi (transaction.updated) y marca el pago del link.
//
// Despliegue SIN verificación de JWT (Wompi no envía la sesión de Supabase):
//   supabase functions deploy wompi-webhook --no-verify-jwt
// En el Dashboard de Comercios de Wompi, configura como URL de eventos:
//   https://<tu-proyecto>.supabase.co/functions/v1/wompi-webhook
// Cada evento se valida con el secreto de eventos de la empresa (firma SHA256).
import { createClient } from "npm:@supabase/supabase-js@2";

const ok = (cuerpo: unknown = { ok: true }) =>
  new Response(JSON.stringify(cuerpo), { status: 200, headers: { "Content-Type": "application/json" } });

async function sha256(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Valor de "transaction.id" dentro de data.
// deno-lint-ignore no-explicit-any
const leer = (obj: any, ruta: string) => ruta.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  // deno-lint-ignore no-explicit-any
  const evento: any = await req.json().catch(() => null);
  if (evento?.event !== "transaction.updated") return ok({ ignorado: true });

  const transaccion = evento.data?.transaction;
  const linkId: string | undefined = transaccion?.payment_link_id;
  if (!linkId) return ok({ ignorado: "sin link" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pago } = await admin.from("pagos_venta").select("id_empresa, monto").eq("link_id", linkId).maybeSingle();
  if (!pago) return ok({ ignorado: "link desconocido" });

  const { data: cred } = await admin
    .from("credenciales_pago")
    .select("wompi_secreto_eventos")
    .eq("id_empresa", pago.id_empresa)
    .maybeSingle();
  if (!cred?.wompi_secreto_eventos) {
    console.error("[wompi-webhook] La empresa no tiene secreto de eventos configurado");
    return new Response("Sin secreto de eventos", { status: 401 });
  }

  // Firma: valores de signature.properties (en data) + timestamp + secreto, en SHA256.
  const propiedades: string[] = evento.signature?.properties ?? [];
  const cadena = propiedades.map((p) => String(leer(evento.data, p) ?? "")).join("") + String(evento.timestamp) + cred.wompi_secreto_eventos;
  const firma = await sha256(cadena);
  if (!evento.signature?.checksum || firma.toLowerCase() !== String(evento.signature.checksum).toLowerCase()) {
    console.error("[wompi-webhook] Firma inválida para el link", linkId);
    return new Response("Firma inválida", { status: 401 });
  }

  // El monto debe coincidir con el del pago (evita confirmar un pago parcial manipulado).
  if (transaccion.status === "APPROVED" && Number(transaccion.amount_in_cents) !== Math.round(Number(pago.monto) * 100)) {
    console.error("[wompi-webhook] Monto distinto al esperado", linkId, transaccion.amount_in_cents, pago.monto);
    return ok({ ignorado: "monto distinto" });
  }

  const { data, error } = await admin.rpc("stockly_confirmar_pago_link", {
    _link_id: linkId,
    _estado: transaccion.status,
    _transaccion: transaccion.id,
    _medio: transaccion.payment_method_type ?? null,
  });
  if (error) {
    console.error("[wompi-webhook]", error.message);
    return new Response("Error al registrar", { status: 500 });
  }
  return ok(data);
});
