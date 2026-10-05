// Pagos de suscripción de Stockly con Wompi (cuenta de MCCore).
//
//  accion "crear": calcula el precio en el servidor (con el 50% de la primera compra),
//    registra el pago pendiente y devuelve la URL del checkout de Wompi con firma de integridad.
//  accion "verificar": al volver de Wompi, consulta la transacción en Wompi y activa el plan
//    si quedó aprobada (además del webhook, por si la persona cierra la ventana o el webhook tarda).
//
// Despliegue (con verificación de JWT): supabase functions deploy suscripcion-pago
// Secretos (Wompi → Desarrolladores, de la cuenta de MCCore):
//   WOMPI_STOCKLY_PUBLIC_KEY       pub_test_... (pruebas) o pub_prod_... (producción)
//   WOMPI_STOCKLY_INTEGRITY_SECRET test_integrity_... o prod_integrity_...
//   WOMPI_STOCKLY_PRIVATE_KEY      (opcional) prv_test_... o prv_prod_..., para consultar la transacción al volver.
//                                  Sin ella, el plan igual se activa con el webhook de eventos.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { enviarRecibo } from "../_shared/recibo.ts";
import { enviarCorreo, escapar, plantillaCorreo } from "../_shared/correo.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(texto: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  // Se aceptan los nombres largos o los cortos (WOMPIPUBLIC, WOMPIINTEGR, WOMPIPRIV).
  const llavePublica = Deno.env.get("WOMPI_STOCKLY_PUBLIC_KEY") ?? Deno.env.get("WOMPIPUBLIC");
  const integridad = Deno.env.get("WOMPI_STOCKLY_INTEGRITY_SECRET") ?? Deno.env.get("WOMPIINTEGR");
  if (!llavePublica || !integridad) return responder({ error: "Los pagos aún no están configurados. Escríbenos a equipo@appstockly.com." }, 503);
  const apiWompi = llavePublica.startsWith("pub_prod_") ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const c = await req.json().catch(() => ({}));

  // ------------------------------------------------------------- Prueba de Enterprise (sin cobro)
  // "datos_prueba": llave pública y enlaces de aceptación de Wompi para abrir el widget en modo tokenizar.
  // "activar_prueba": guarda la tarjeta como fuente de pago en Wompi (no cobra nada) y activa los 7 días.
  if (c.accion === "datos_prueba" || c.accion === "activar_prueba") {
    const idEmpresa = Number(c.id_empresa);
    const { data: disponible } = await db.rpc("stockly_prueba_disponible", { _id_empresa: idEmpresa });
    if (disponible !== true) return responder({ error: "La prueba de Enterprise no está disponible para esta empresa." }, 403);
    const comercio = await fetch(`${apiWompi}/merchants/${llavePublica}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const aceptacion = comercio?.data?.presigned_acceptance;
    const datosPersonales = comercio?.data?.presigned_personal_data_auth;
    if (!aceptacion?.acceptance_token) return responder({ error: "No se pudo conectar con Wompi. Intenta de nuevo." }, 502);
    if (c.accion === "datos_prueba") {
      return responder({ llave_publica: llavePublica, terminos: aceptacion.permalink, datos_personales: datosPersonales?.permalink ?? null });
    }

    if (c.acepta !== true) return responder({ error: "Debes aceptar los términos de Wompi para registrar tu medio de pago." }, 400);
    const token = String(c.token ?? "");
    const tipo = c.tipo === "NEQUI" ? "NEQUI" : "CARD";
    if (!/^[\w-]{6,120}$/.test(token)) return responder({ error: "Medio de pago no válido" }, 400);
    const llavePrivada = Deno.env.get("WOMPI_STOCKLY_PRIVATE_KEY") ?? Deno.env.get("WOMPIPRIV");
    if (!llavePrivada) return responder({ error: "Los pagos aún no están configurados. Escríbenos a equipo@appstockly.com." }, 503);
    const { data: sesion } = await db.auth.getUser();
    const usuario = sesion?.user;
    if (!usuario?.email) return responder({ error: "Falta la sesión" }, 401);

    const r = await fetch(`${apiWompi}/payment_sources`, {
      method: "POST",
      headers: { Authorization: `Bearer ${llavePrivada}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: tipo,
        token,
        customer_email: usuario.email,
        acceptance_token: aceptacion.acceptance_token,
        ...(datosPersonales?.acceptance_token ? { accept_personal_auth: datosPersonales.acceptance_token } : {}),
      }),
    });
    const fuente = (await r.json().catch(() => null))?.data;
    if (!r.ok || !fuente?.id || ["DECLINED", "ERROR"].includes(String(fuente.status))) {
      console.error("[prueba] Wompi payment_sources", r.status, JSON.stringify(fuente ?? {}).slice(0, 300));
      return responder({ error: "Wompi no aceptó el medio de pago. Revisa los datos o prueba con otra tarjeta." }, 402);
    }
    // Resumen y huella de la tarjeta con lo que Wompi devuelva (nunca el número completo).
    const pub = fuente.public_data ?? {};
    const marca = String(pub.brand ?? pub.type ?? tipo).toUpperCase();
    const ultimos = pub.last_four ? ` •••• ${pub.last_four}` : "";
    const resumen = tipo === "NEQUI" ? `Nequi${pub.phone_number ? ` •••• ${String(pub.phone_number).slice(-4)}` : ""}` : `${marca}${ultimos}`;
    const partes = [pub.bin, pub.last_four, pub.exp_month, pub.exp_year, pub.card_holder ?? pub.name, pub.phone_number].filter(Boolean);
    const huella = partes.length >= 2 ? await sha256(partes.join("|").toLowerCase()) : null;

    const { data, error } = await admin.rpc("stockly_activar_prueba", {
      _id_empresa: idEmpresa,
      _uid: usuario.id,
      _fuente: Number(fuente.id),
      _resumen: resumen,
      _huella_tarjeta: huella,
    });
    if (error) return responder({ error: error.message }, 409);

    // Correo de confirmación de la prueba (aclara que no se cobra nada).
    const { data: perfil } = await admin
      .from("Usuarios")
      .select("nombres, asignarempresa(Empresa(nombre))")
      .eq("idauth", usuario.id)
      .maybeSingle();
    const nombre = String(perfil?.nombres ?? "").split(" ")[0];
    // deno-lint-ignore no-explicit-any
    const empresa = (perfil as any)?.asignarempresa?.[0]?.Empresa?.nombre ?? "tu empresa";
    const hasta = new Date(data.prueba_hasta).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" });
    const origen = String(c.origen ?? "");
    const base = /^https?:\/\/[^\s/]+$/.test(origen) ? origen : "";
    const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${t}</p>`;
    await enviarCorreo({
      para: usuario.email,
      nombre: perfil?.nombres,
      asunto: `Tu prueba de Enterprise está activa hasta el ${hasta}`,
      html: plantillaCorreo({
        titulo: `¡Tu prueba de Enterprise está activa${nombre ? `, ${escapar(nombre)}` : ""}!`,
        cuerpo:
          p(`<strong>${escapar(empresa)}</strong> tiene todas las funciones y la capacidad del plan Enterprise hasta el <strong>${hasta}</strong>.`) +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background:#E9F8EF;border-radius:12px;"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#14532D;">
            <strong>No se ha hecho ni se hará ningún cobro.</strong> Registraste ${escapar(resumen)} solo para validarla. Al terminar la prueba no se debita nada.
          </td></tr></table>` +
          p(`Cuando termine, ${escapar(empresa)} pasa sola al plan <strong>Básico gratis</strong> y conserva todos sus datos. Si quieres seguir con Enterprise, lo compras cuando quieras desde <em>Plan y suscripción</em>.`) +
          p("Aprovecha estos días: crea tus bodegas y sedes, invita a tu equipo, revisa la inteligencia de inventario y envía el informe a tu contador."),
        boton: base ? { texto: "Entrar a Stockly", url: `${base}/` } : undefined,
      }),
    });
    return responder({ ...data, medio_pago: resumen });
  }

  // ------------------------------------------------------------- Verificar al volver de Wompi
  // Con id_transaccion (regreso desde Wompi) o con referencia (si Wompi no devolvió a la app:
  // se busca la transacción por referencia, lo que requiere la llave privada).
  if (c.accion === "verificar") {
    const idTransaccion = String(c.id_transaccion ?? "").trim();
    const referencia = String(c.referencia ?? "").trim();
    const llavePrivada = Deno.env.get("WOMPI_STOCKLY_PRIVATE_KEY") ?? Deno.env.get("WOMPIPRIV");
    // deno-lint-ignore no-explicit-any
    let t: any = null;
    if (idTransaccion) {
      if (!/^[\w-]{6,80}$/.test(idTransaccion)) return responder({ error: "Transacción no válida" }, 400);
      const r = await fetch(`${apiWompi}/transactions/${idTransaccion}`, {
        headers: llavePrivada ? { Authorization: `Bearer ${llavePrivada}` } : {},
      });
      // Si Wompi no permite la consulta, la app espera la confirmación del webhook.
      if (!r.ok) return responder({ ok: false, pendiente: true, motivo: "consulta no disponible" });
      t = (await r.json())?.data;
    } else {
      if (!/^STK-[\w-]{4,80}$/.test(referencia)) return responder({ error: "Referencia no válida" }, 400);
      // Solo el administrador de esa empresa puede consultar su pago.
      const { data: previo } = await db.rpc("stockly_estado_pago_suscripcion", { _referencia: referencia });
      if (!previo) return responder({ error: "Pago no encontrado" }, 404);
      if (previo.estado !== "pendiente") return responder({ ok: true, pago: previo, referencia });
      if (!llavePrivada) return responder({ ok: false, pendiente: true, motivo: "sin llave privada" });
      const r = await fetch(`${apiWompi}/transactions?reference=${encodeURIComponent(referencia)}`, {
        headers: { Authorization: `Bearer ${llavePrivada}` },
      });
      if (!r.ok) return responder({ ok: false, pendiente: true, motivo: `consulta no disponible (${r.status})` });
      // deno-lint-ignore no-explicit-any
      const lista: any[] = (await r.json())?.data ?? [];
      t = lista.find((x) => x.status === "APPROVED") ?? lista.find((x) => x.status !== "PENDING") ?? null;
      if (!t) return responder({ ok: false, pendiente: true, pago: previo, referencia });
    }
    if (!t?.reference?.startsWith("STK-")) return responder({ error: "Pago no reconocido" }, 404);
    if (referencia && t.reference !== referencia) return responder({ error: "Pago no reconocido" }, 404);
    // Solo el administrador de esa empresa puede ver su pago.
    const { data: estadoPrevio } = await db.rpc("stockly_estado_pago_suscripcion", { _referencia: t.reference });
    if (!estadoPrevio) return responder({ error: "Pago no encontrado" }, 404);
    const { data, error } = await admin.rpc("stockly_aplicar_pago_suscripcion", {
      _referencia: t.reference,
      _estado: t.status,
      _transaccion: t.id,
      _monto_centavos: Number(t.amount_in_cents),
      _metodo: t.payment_method_type ?? null,
    });
    if (error) return responder({ error: error.message }, 500);
    const recibo = t.status === "APPROVED" ? await enviarRecibo(admin, t.reference) : null;
    const { data: estado } = await db.rpc("stockly_estado_pago_suscripcion", { _referencia: t.reference });
    return responder({ ...data, wompi: t.status, pago: estado, referencia: t.reference, recibo });
  }

  // ------------------------------------------------------------- Crear el pago
  const idEmpresa = Number(c.id_empresa);
  // tipo "complemento": capacidad adicional sobre el plan pagado; si no, un plan (con sus complementos al renovar).
  const esComplemento = c.tipo === "complemento";
  // deno-lint-ignore no-explicit-any
  let cotizacion: any;
  let idPlan: string;
  let ciclo: string;
  if (esComplemento) {
    const { data, error } = await db.rpc("stockly_cotizar_complemento", {
      _id_empresa: idEmpresa,
      _id_complemento: String(c.id_complemento ?? ""),
      _cantidad: Number(c.cantidad),
    });
    if (error || !data) return responder({ error: error?.message ?? "No se pudo calcular el precio" }, 403);
    cotizacion = data;
    idPlan = data.plan;
    ciclo = data.ciclo;
  } else {
    idPlan = String(c.id_plan ?? "");
    ciclo = c.ciclo === "anual" ? "anual" : "mensual";
    const { data, error } = await db.rpc("stockly_cotizar_plan", {
      _id_empresa: idEmpresa,
      _id_plan: idPlan,
      _ciclo: ciclo,
      _con_complementos: c.con_complementos !== false,
    });
    if (error || !data) return responder({ error: error?.message ?? "No se pudo calcular el precio" }, 403);
    cotizacion = data;
  }

  const { data: sesion } = await db.auth.getUser();
  const email = sesion?.user?.email ?? null;
  const { data: perfil } = await admin.from("Usuarios").select("id, nombres").eq("idauth", sesion?.user?.id ?? "").maybeSingle();

  const referencia = `STK-${idEmpresa}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const centavos = Math.round(Number(cotizacion.total) * 100);
  const { error: errorPago } = await admin.from("pagos_suscripcion").insert({
    id_empresa: idEmpresa,
    id_plan: idPlan,
    ciclo,
    tipo: esComplemento ? "complemento" : "plan",
    precio: esComplemento ? cotizacion.total : cotizacion.precio,
    descuento: esComplemento ? 0 : cotizacion.descuento,
    total: cotizacion.total,
    complementos: esComplemento
      ? [{ id: cotizacion.id, nombre: cotizacion.nombre, cantidad: cotizacion.cantidad, total: cotizacion.total }]
      : cotizacion.complementos?.length
        ? cotizacion.complementos
        : null,
    periodo_hasta: esComplemento ? cotizacion.hasta : null,
    referencia,
    email,
    creado_por: perfil?.id ?? null,
  });
  if (errorPago) return responder({ error: "No se pudo registrar el pago" }, 500);

  const origen = String(c.origen ?? "");
  // Wompi bloquea (403) las direcciones de regreso locales: en pruebas locales no se envía y el
  // plan se activa con el webhook; la app revisa el pago al volver a "Plan y suscripción".
  const local = /^https?:\/\/(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(origen);
  const regreso = /^https?:\/\/[^\s/]+$/.test(origen) && !local ? `${origen}/configurar/plan?pago=${referencia}` : undefined;
  const firma = await sha256(`${referencia}${centavos}COP${integridad}`);
  const params = new URLSearchParams({
    "public-key": llavePublica,
    currency: "COP",
    "amount-in-cents": String(centavos),
    reference: referencia,
    "signature:integrity": firma,
  });
  if (regreso) params.set("redirect-url", regreso);
  if (email) params.set("customer-data:email", email);
  if (perfil?.nombres) params.set("customer-data:full-name", perfil.nombres);

  return responder({ url: `https://checkout.wompi.co/p/?${params.toString()}`, referencia, cotizacion });
});
