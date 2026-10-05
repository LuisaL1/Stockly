// Cobro con QR dinámico de Nequi Negocios (API Nequi → Pagos con QR code, versión 2.0).
// Documentación: https://developer.nequi.com.co/documentacion/pagos-qr
//
//   POST { accion: "generar", id_venta }  → crea (o reutiliza) el QR por el valor pendiente con Nequi
//   POST { accion: "estado",  id_venta }  → consulta a Nequi; si el pago está aprobado (35) marca la venta
//
// Despliegue (con verificación de JWT: la llama la app con la sesión del usuario):
//   supabase functions deploy nequi-qr
// Las credenciales (Client ID, Client Secret, API Key) se guardan en Configuración → Facturación.
// Direcciones según developer.nequi.com.co → "Integrate con Nequi". Si Nequi te indica otras, defínelas
// como secretos: NEQUI_TOKEN_URL_PRUEBAS, NEQUI_TOKEN_URL_PRODUCCION, NEQUI_API_URL_PRUEBAS, NEQUI_API_URL_PRODUCCION
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TOKEN_URL = {
  pruebas: Deno.env.get("NEQUI_TOKEN_URL_PRUEBAS") ?? "https://oauth.sandbox.nequi.com/token",
  produccion: Deno.env.get("NEQUI_TOKEN_URL_PRODUCCION") ?? "https://oauth.nequi.com/token",
};
const API_URL = {
  pruebas: Deno.env.get("NEQUI_API_URL_PRUEBAS") ?? "https://api.sandbox.nequi.com",
  produccion: Deno.env.get("NEQUI_API_URL_PRODUCCION") ?? "https://api.nequi.com",
};
const CANAL_QR = "PQR03-C001";
const REGION = "C001";
const ESTADO_PAGADO = "35";
const ESTADO_PENDIENTE = "33";
const VIGENCIA_QR_MIN = 15;

type Credenciales = {
  nequi_client_id: string;
  nequi_client_secret: string;
  nequi_api_key: string;
  nequi_codigo_comercio: string;
  nequi_ambiente: "pruebas" | "produccion";
};

async function token(c: Credenciales) {
  const r = await fetch(`${TOKEN_URL[c.nequi_ambiente]}?grant_type=client_credentials`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${c.nequi_client_id}:${c.nequi_client_secret}`)}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok || !cuerpo?.access_token) {
    console.error("[nequi-qr] token", r.status, JSON.stringify(cuerpo));
    throw new Error("Nequi rechazó las credenciales. Revisa el Client ID y el Client Secret.");
  }
  return `${cuerpo.token_type ?? "Bearer"} ${cuerpo.access_token}`;
}

// Llamada a un servicio de Nequi con el sobre RequestMessage que exige su API.
// deno-lint-ignore no-explicit-any
async function servicio(c: Credenciales, auth: string, ruta: string, operacion: string, version: string, cuerpo: any) {
  const r = await fetch(`${API_URL[c.nequi_ambiente]}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: auth, "x-api-key": c.nequi_api_key },
    body: JSON.stringify({
      RequestMessage: {
        RequestHeader: {
          Channel: CANAL_QR,
          RequestDate: new Date().toISOString(),
          MessageID: crypto.randomUUID().replaceAll("-", "").slice(0, 10),
          ClientID: c.nequi_client_id,
          Destination: { ServiceName: "PaymentsService", ServiceOperation: operacion, ServiceRegion: REGION, ServiceVersion: version },
        },
        RequestBody: { any: cuerpo },
      },
    }),
  });
  const datos = await r.json().catch(() => null);
  const estado = datos?.ResponseMessage?.ResponseHeader?.Status;
  if (!r.ok || estado?.StatusCode !== "0") {
    console.error(`[nequi-qr] ${operacion}`, r.status, JSON.stringify(datos));
    throw new Error(`Nequi respondió: ${estado?.StatusDesc ?? `error ${r.status}`}`);
  }
  return datos.ResponseMessage.ResponseBody.any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { accion, id_venta } = await req.json().catch(() => ({}));
  const { data: venta } = await db
    .from("ventas")
    .select("id, id_empresa, prefijo, numero, total, estado, pagos_venta(id, metodo, monto, estado, qr_codigo, qr_valor, qr_expira)")
    .eq("id", Number(id_venta))
    .maybeSingle();
  if (!venta) return responder({ error: "Venta no encontrada" }, 404);

  // deno-lint-ignore no-explicit-any
  const pagos = (venta.pagos_venta ?? []) as any[];
  const pagoQR = pagos.find((p) => p.metodo === "nequi_qr" && p.estado === "pendiente");
  const yaPagado = pagos.find((p) => p.metodo === "nequi_qr" && p.estado === "aprobado");

  const { data: cred } = await admin
    .from("credenciales_pago")
    .select("nequi_client_id, nequi_client_secret, nequi_api_key, nequi_codigo_comercio, nequi_ambiente")
    .eq("id_empresa", venta.id_empresa)
    .maybeSingle();
  const { data: cfg } = await db.from("config_facturacion").select("nequi_activo").eq("id_empresa", venta.id_empresa).maybeSingle();
  if (!cfg?.nequi_activo || !cred?.nequi_client_id || !cred?.nequi_client_secret || !cred?.nequi_api_key || !cred?.nequi_codigo_comercio) {
    return responder({ error: "Nequi no está configurado. Actívalo en Configuración → Facturación." }, 422);
  }
  const c = cred as Credenciales;

  try {
    if (accion === "estado") {
      if (!pagoQR) return responder({ estado: yaPagado ? "pagado" : "sin_qr" });
      if (!pagoQR.qr_codigo) return responder({ estado: "sin_qr" });
      const auth = await token(c);
      // "Código del pago que se genera con el servicio de generación": el transactionId.
      // Si Nequi lo rechaza, se intenta con el texto completo del QR.
      const consultar = (codigo: string) =>
        servicio(c, auth, "/payments/v2/-services-paymentservice-getstatuspayment", "getStatusPayment", "1.0.0", {
          getStatusPaymentRQ: { qrValue: codigo },
        });
      let respuesta;
      try {
        respuesta = await consultar(pagoQR.qr_codigo);
      } catch (e) {
        if (!pagoQR.qr_valor) throw e;
        respuesta = await consultar(pagoQR.qr_valor);
      }
      const rs = respuesta?.getStatusPaymentRS;
      const estadoNequi = String(rs?.status ?? "");
      if (estadoNequi === ESTADO_PAGADO) {
        const { data, error } = await admin.rpc("stockly_confirmar_pago_nequi", {
          _id_pago: pagoQR.id,
          _transaccion: String(rs?.trnId ?? "").trim() || null,
          _valor: rs?.value != null ? Number(rs.value) : null,
        });
        if (error || data?.ok === false) {
          console.error("[nequi-qr] confirmar", error?.message ?? data?.motivo);
          return responder({ estado: "revisar", detalle: data?.motivo ?? "No se pudo registrar el pago" });
        }
        return responder({ estado: "pagado", transaccion: String(rs?.trnId ?? "").trim() || null });
      }
      const vencido = pagoQR.qr_expira && new Date(pagoQR.qr_expira).getTime() < Date.now();
      return responder({ estado: estadoNequi === ESTADO_PENDIENTE && !vencido ? "pendiente" : vencido ? "vencido" : "pendiente", codigo: estadoNequi });
    }

    // generar
    if (venta.estado === "anulada") return responder({ error: "La venta está anulada" }, 409);
    if (yaPagado && !pagoQR) return responder({ estado: "pagado" });
    const vigente = pagoQR?.qr_codigo && pagoQR.qr_expira && new Date(pagoQR.qr_expira).getTime() > Date.now() + 30_000;
    if (vigente && pagoQR.qr_valor) return responder({ qr: pagoQR.qr_valor, monto: Number(pagoQR.monto), expira: pagoQR.qr_expira });

    // Pago pendiente por Nequi (o por el saldo, si la venta era a crédito).
    let pago = pagoQR;
    if (!pago) {
      const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
      const saldo = Math.round((Number(venta.total) - pagado) * 100) / 100;
      if (saldo <= 0) return responder({ error: "La venta ya está pagada" }, 409);
      const { data: nuevo } = await admin
        .from("pagos_venta")
        .insert({ id_venta: venta.id, id_empresa: venta.id_empresa, metodo: "nequi_qr", monto: saldo, estado: "pendiente" })
        .select("id, monto")
        .single();
      pago = nuevo;
    }

    const auth = await token(c);
    // code: identificación del comercio o caja (la asigna Nequi). Nuestra referencia va en reference1.
    const rs = (await servicio(c, auth, "/payments/v2/-services-paymentservice-generatecodeqr", "generateCodeQR", "1.0.0", {
      generateCodeQRRQ: {
        code: c.nequi_codigo_comercio,
        value: String(Math.round(Number(pago.monto))),
        reference1: `STK${pago.id}`,
        reference2: `${venta.prefijo}-${venta.numero}`,
        reference3: "Stockly",
      },
    }))?.generateCodeQRRS;
    if (!rs?.qrValue || !rs?.transactionId) throw new Error("Nequi no devolvió el código QR");
    const expira = new Date(Date.now() + VIGENCIA_QR_MIN * 60_000).toISOString();
    await admin
      .from("pagos_venta")
      .update({ qr_codigo: rs.transactionId, qr_valor: rs.qrValue, qr_expira: expira })
      .eq("id", pago.id);
    return responder({ qr: rs.qrValue, monto: Number(pago.monto), expira });
  } catch (e) {
    return responder({ error: e instanceof Error ? e.message : "Error con Nequi" }, 502);
  }
});
