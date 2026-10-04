// Crea (o reutiliza) el link de pago de Wompi para el saldo pendiente de una venta.
//
// Despliegue (con verificación de JWT, la llama la app con la sesión del usuario):
//   supabase functions deploy wompi-link
// Las llaves de Wompi se guardan desde Configuración → Facturación (tabla credenciales_pago).
import { createClient } from "npm:@supabase/supabase-js@2";

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
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  // Cliente del usuario: las reglas de acceso (RLS) garantizan que la venta sea de su empresa.
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  // Cliente de servicio: solo para leer las llaves y guardar el link.
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { id_venta } = await req.json().catch(() => ({}));
  const { data: venta } = await db
    .from("ventas")
    .select("id, id_empresa, prefijo, numero, total, estado, Empresa(nombre), pagos_venta(id, metodo, monto, estado, link_id, link_url)")
    .eq("id", Number(id_venta))
    .maybeSingle();
  if (!venta) return responder({ error: "Venta no encontrada" }, 404);
  if (venta.estado === "anulada") return responder({ error: "La venta está anulada" }, 409);

  // deno-lint-ignore no-explicit-any
  const pagos = (venta.pagos_venta ?? []) as any[];
  const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
  const saldo = Math.round((Number(venta.total) - pagado) * 100) / 100;
  if (saldo <= 0) return responder({ error: "La venta ya está pagada" }, 409);

  // Si ya hay un link vigente por ese saldo, se reutiliza.
  const existente = pagos.find((p) => p.metodo === "link_pago" && p.estado === "pendiente" && p.link_url);
  if (existente && Number(existente.monto) === saldo) return responder({ url: existente.link_url, monto: saldo, reutilizado: true });

  const { data: cfg } = await db.from("config_facturacion").select("wompi_activo").eq("id_empresa", venta.id_empresa).maybeSingle();
  const { data: cred } = await admin
    .from("credenciales_pago")
    .select("wompi_llave_privada")
    .eq("id_empresa", venta.id_empresa)
    .maybeSingle();
  if (!cfg?.wompi_activo || !cred?.wompi_llave_privada) {
    return responder({ error: "Wompi no está configurado. Actívalo en Configuración → Facturación." }, 422);
  }
  const llave: string = cred.wompi_llave_privada;
  const base = llave.startsWith("prv_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
  const factura = `${venta.prefijo}-${venta.numero}`;
  // deno-lint-ignore no-explicit-any
  const empresa = (venta as any).Empresa?.nombre ?? "Stockly";

  const respuesta = await fetch(`${base}/payment_links`, {
    method: "POST",
    headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Factura ${factura}`,
      description: `Pago de la factura ${factura} de ${empresa}`.slice(0, 200),
      single_use: true,
      collect_shipping: false,
      currency: "COP",
      amount_in_cents: Math.round(saldo * 100),
      sku: `venta-${venta.id}`.slice(0, 36),
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    }),
  });
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !cuerpo?.data?.id) {
    console.error("[wompi-link]", respuesta.status, JSON.stringify(cuerpo));
    const detalle = cuerpo?.error?.messages ? JSON.stringify(cuerpo.error.messages) : cuerpo?.error?.reason;
    return responder({ error: `Wompi no creó el link${detalle ? `: ${detalle}` : ""}` }, 502);
  }
  const linkUrl = `https://checkout.wompi.co/l/${cuerpo.data.id}`;

  // Guarda el link en el pago pendiente (o crea el pago si la venta era a crédito / saldo).
  const pendiente = pagos.find((p) => p.metodo === "link_pago" && p.estado === "pendiente");
  if (pendiente) {
    await admin.from("pagos_venta").update({ link_id: cuerpo.data.id, link_url: linkUrl, monto: saldo }).eq("id", pendiente.id);
  } else {
    await admin.from("pagos_venta").insert({
      id_venta: venta.id,
      id_empresa: venta.id_empresa,
      metodo: "link_pago",
      monto: saldo,
      estado: "pendiente",
      link_id: cuerpo.data.id,
      link_url: linkUrl,
    });
  }
  return responder({ url: linkUrl, monto: saldo });
});
