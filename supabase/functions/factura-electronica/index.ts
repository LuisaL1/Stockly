// Envío de facturas electrónicas a la DIAN a través de un proveedor tecnológico.
//
// Estado: PREPARADA, SIN CONECTAR. La función valida la configuración de la
// empresa, arma el documento normalizado y lo entrega al adaptador del
// proveedor elegido (Alegra, Siigo, Facture...). Los adaptadores todavía no
// llaman a ninguna API: para conectar uno, implementa su función `enviar` con
// la documentación del proveedor y guarda sus credenciales como secretos:
//   supabase secrets set DIAN_ALEGRA_TOKEN=... (o el que corresponda)
//   supabase functions deploy factura-electronica
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Documento = ReturnType<typeof armarDocumento>;
type Resultado = { estado: "enviada" | "aceptada" | "rechazada"; cufe?: string; respuesta: unknown };
type Adaptador = { secreto: string; enviar: (doc: Documento, token: string) => Promise<Resultado> };

const pendiente = (nombre: string) => async (): Promise<Resultado> => {
  throw new Error(`La integración con ${nombre} aún no está implementada. Completa su adaptador en supabase/functions/factura-electronica.`);
};

const adaptadores: Record<string, Adaptador> = {
  alegra: { secreto: "DIAN_ALEGRA_TOKEN", enviar: pendiente("Alegra") },
  siigo: { secreto: "DIAN_SIIGO_TOKEN", enviar: pendiente("Siigo") },
  facture: { secreto: "DIAN_FACTURE_TOKEN", enviar: pendiente("Facture") },
  otro: { secreto: "DIAN_OTRO_TOKEN", enviar: pendiente("el proveedor configurado") },
};

// deno-lint-ignore no-explicit-any
function armarDocumento(cfg: any, factura: any) {
  const venta = factura.ventas;
  return {
    ambiente: cfg.ambiente,
    resolucion: {
      numero: cfg.resolucion_numero,
      fecha: cfg.resolucion_fecha,
      prefijo: factura.prefijo,
      desde: cfg.rango_desde,
      hasta: cfg.rango_hasta,
    },
    numero: factura.numero,
    fecha: venta.fecha,
    emisor: {
      razon_social: cfg.razon_social,
      nit: cfg.nit,
      regimen: cfg.regimen,
      direccion: cfg.direccion,
      telefono: cfg.telefono,
      email: cfg.email,
    },
    adquiriente: venta.clientes
      ? {
          nombre: venta.clientes.nombre,
          tipo_documento: venta.clientes.tipo_documento,
          documento: venta.clientes.documento,
          email: venta.clientes.email,
          direccion: venta.clientes.direccion,
        }
      : { nombre: "Consumidor final", tipo_documento: "CC", documento: "222222222222" },
    medio_pago: venta.metodo_pago,
    // deno-lint-ignore no-explicit-any
    lineas: venta.detalle_venta.map((d: any) => ({
      descripcion: d.descripcion,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      descuento: Number(d.descuento),
      iva: Number(d.iva),
      total: Number(d.total),
    })),
    totales: {
      subtotal: Number(venta.subtotal),
      descuento: Number(venta.descuento),
      impuesto: Number(venta.impuesto),
      total: Number(venta.total),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });

  const { id_factura } = await req.json().catch(() => ({}));
  const { data: factura, error } = await db
    .from("facturas")
    .select(
      "id, id_empresa, prefijo, numero, estado, estado_dian, ventas(fecha, metodo_pago, subtotal, descuento, impuesto, total, clientes(nombre, tipo_documento, documento, email, direccion), detalle_venta(descripcion, cantidad, precio_unitario, descuento, iva, total))",
    )
    .eq("id", Number(id_factura))
    .maybeSingle();
  if (error || !factura) return responder({ error: "Factura no encontrada" }, 404);
  if (factura.estado === "anulada") return responder({ error: "La factura está anulada" }, 409);
  if (["enviada", "aceptada"].includes(factura.estado_dian)) {
    return responder({ error: "La factura ya fue enviada a la DIAN" }, 409);
  }

  const { data: cfg } = await db.from("config_facturacion").select().eq("id_empresa", factura.id_empresa).maybeSingle();
  const faltantes = [
    !cfg?.electronica_activa && "activar la facturación electrónica",
    !cfg?.proveedor_dian && "elegir un proveedor tecnológico",
    !cfg?.nit && "NIT",
    !cfg?.razon_social && "razón social",
    !cfg?.resolucion_numero && "número de resolución",
    !cfg?.resolucion_fecha && "fecha de resolución",
    (cfg?.rango_desde == null || cfg?.rango_hasta == null) && "rango de numeración",
  ].filter(Boolean);
  if (faltantes.length) {
    return responder({ error: `Falta configurar: ${faltantes.join(", ")}.`, faltantes }, 422);
  }

  const adaptador = adaptadores[cfg.proveedor_dian];
  const token = Deno.env.get(adaptador.secreto);
  if (!token) {
    return responder(
      { error: `El servidor no tiene las credenciales del proveedor (${adaptador.secreto}).`, pendiente: true },
      501,
    );
  }

  try {
    const resultado = await adaptador.enviar(armarDocumento(cfg, factura), token);
    await db
      .from("facturas")
      .update({ tipo: "electronica", estado_dian: resultado.estado, cufe: resultado.cufe ?? null, respuesta_dian: resultado.respuesta })
      .eq("id", factura.id);
    return responder(resultado);
  } catch (e) {
    await db.from("facturas").update({ tipo: "electronica", estado_dian: "pendiente" }).eq("id", factura.id);
    return responder({ error: e instanceof Error ? e.message : "No se pudo enviar", pendiente: true }, 501);
  }
});
