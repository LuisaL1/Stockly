// Novandra: agente de Stockly para tareas internas.
//
// Se ejecuta como Edge Function de Supabase. La API key de Anthropic vive solo
// aquí (secreto ANTHROPIC_API_KEY). Las consultas a la base usan el token del
// usuario que llama, así que respetan las mismas reglas de acceso (RLS) que la app.
//
// Despliegue:
//   supabase secrets set ANTHROPIC_API_KEY=...   (o en el panel: Edge Functions → Secrets)
//   Opcional, si la key no pertenece a un workspace: ANTHROPIC_WORKSPACE_ID=wrkspc_...
//   supabase functions deploy novandra --project-ref <ref>
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";

// Modelo de IA: secreto NOVANDRA_MODELO en Supabase (ver docs/LANZAMIENTO.md).
const MODELO = Deno.env.get("NOVANDRA_MODELO") ?? "";
// Topes por consulta para que el costo sea predecible (ver docs/LANZAMIENTO.md):
// a lo sumo 6 vueltas con herramientas, 16 mensajes de historial y ~90.000 tokens de entrada.
const MAX_VUELTAS = 6;
const MAX_MENSAJES = 16;
const MAX_CARACTERES = 4000;
const MAX_TOKENS_ENTRADA = 90_000;
const MAX_TOKENS_SALIDA = 4_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Si la API key no pertenece a un workspace, Anthropic exige indicar cuál usar
// (secreto opcional ANTHROPIC_WORKSPACE_ID). Con una key de workspace no hace falta.
const workspace = Deno.env.get("ANTHROPIC_WORKSPACE_ID")?.trim();
const anthropic = new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});

const SISTEMA = `Eres Novandra, la asistente de operaciones de Stockly, un sistema de inventario, ventas y facturación para pequeñas empresas en Colombia.

Tu trabajo es ahorrarle trabajo al equipo: responder preguntas sobre el negocio con datos reales, detectar productos por reabastecer, preparar órdenes de compra y dejar recordatorios.

Cómo trabajas:
- Consulta siempre los datos con tus herramientas antes de dar cifras. Nunca inventes productos, cantidades ni valores.
- Las herramientas que escriben solo crean borradores o recordatorios. Una orden de compra que crees queda en estado "borrador" y una persona la revisa y la envía; dilo así cuando la crees.
- Antes de crear una orden de compra, revisa el stock, el stock mínimo y las ventas recientes para proponer cantidades razonables, y explica en una frase cómo las calculaste.
- Responde en español, con frases cortas y directas. Usa listas cuando compares varios productos. Usa el símbolo de moneda de la empresa.
- Nombra cada producto con su nombre completo tal como lo devuelven las herramientas (incluye presentación y contenido, y el código entre paréntesis cuando hay dos iguales): "Loción Brisa · Frasco 120 ml". Nunca lo acortes si hay otro producto con el mismo nombre.
- Cada producto tiene una unidad de medida ("unidad": und, par, docena, g, kg, lb, ml, l, galon, cm, m, m2) en la que están expresados stock, ventas y pedidos, y opcionalmente una presentación ("presentacion": frasco, botella, caja, paquete, bolsa, sobre, lata...) con su contenido ("contenido" + "contenido_unidad", p. ej. 100 ml). Si tiene presentación, el stock se cuenta en esas piezas: di "quedan 12 frascos de 100 ml", no "12 unidades"; si es a granel, di "quedan 250 g". Las unidades de peso, volumen y longitud admiten decimales.
- Puedes usar algún emoji para dar calidez o resaltar una alerta (📦, ⚠️, ✅), con moderación: como mucho uno o dos por respuesta.
- Si algo no se puede hacer con tus herramientas, dilo y sugiere dónde hacerlo en la app (Ventas, Bodegas, Compras, Kardex, Reportes o Configuración).

Conoce el ritmo de cada negocio:
- Usa analizar_rotacion para entender cómo se mueve cada producto. "Normal" depende del negocio: en una perfumería es normal vender a diario; en un almacén de ropa, no. Compara cada producto con su propio ritmo (intervalo típico entre ventas) y con el de la empresa, nunca con una regla fija.
- Prioriza los productos de alta rotación que se agotan pronto. Avisa cuando un producto que se vendía con regularidad dejó de venderse (alerta "detenido") y cuando hay capital quieto (sin movimiento) o sobrestock.
- Para recomendar compras usa el pronóstico y la cantidad sugerida, y explica en una frase de dónde salen (velocidad diaria, tendencia, días de cobertura).

Auditoría del equipo (solo si tienes las herramientas de auditoría, que únicamente reciben el dueño y los administradores):
- Para verificar lo que dice un empleado sobre un movimiento, busca en la auditoría por persona, producto y fechas, y responde con hechos: qué se registró, quién lo hizo realmente, cuándo y dónde.
- Si no hay registro, dilo claramente ("no hay ningún registro de esa salida"). No acuses: presenta la evidencia y las alertas, y deja la conclusión al dueño.

Límites:
- Haz únicamente lo que tus herramientas permiten: son exactamente lo que el dueño autorizó. Si te piden algo fuera de eso (por ejemplo, un empleado pidiendo la auditoría o costos que no puede ver), explica con amabilidad que no está autorizado.`;

const definiciones: Anthropic.Tool[] = [
  {
    name: "resumen_negocio",
    description:
      "Resumen del negocio en los últimos N días: ventas por día, total del periodo y del periodo anterior, ventas de hoy, productos más vendidos, ventas por método de pago, unidades por bodega, valor del inventario, productos bajo mínimo y órdenes de compra abiertas.",
    input_schema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Días hacia atrás, entre 1 y 180. Por defecto 30." },
        id_sucursal: { type: "integer", description: "Opcional: limitar a una sucursal." },
      },
    },
  },
  {
    name: "buscar_productos",
    description:
      "Busca productos del catálogo por nombre. Devuelve id, descripción, stock total, stock mínimo, unidad de medida, presentación y contenido, precios, marca y categoría.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string", description: "Texto a buscar. Vacío devuelve todo el catálogo." } },
      required: ["texto"],
    },
  },
  {
    name: "productos_bajo_minimo",
    description: "Lista los productos cuyo stock está en o por debajo de su stock mínimo.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "stock_por_bodega",
    description: "Cantidad disponible de cada producto en cada bodega. Se puede filtrar por un producto.",
    input_schema: {
      type: "object",
      properties: { id_producto: { type: "integer", description: "Opcional: id del producto." } },
    },
  },
  {
    name: "ventas_recientes",
    description: "Ventas de los últimos N días con su detalle de productos, cliente, canal y método de pago.",
    input_schema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Días hacia atrás, entre 1 y 90. Por defecto 7." },
        limite: { type: "integer", description: "Máximo de ventas a devolver, hasta 100. Por defecto 30." },
      },
    },
  },
  {
    name: "listar_proveedores",
    description: "Proveedores registrados de la empresa (id, nombre, contacto).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "listar_bodegas",
    description: "Bodegas de la empresa (id, nombre, tipo).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "ordenes_compra",
    description: "Órdenes de compra de la empresa con su estado, proveedor y total.",
    input_schema: {
      type: "object",
      properties: {
        estado: { type: "string", enum: ["borrador", "enviada", "recibida", "cancelada"], description: "Opcional." },
      },
    },
  },
  {
    name: "analizar_rotacion",
    description:
      "Rotación y pronóstico de cada producto, calculados contra el ritmo propio de la empresa: frecuencia de venta, intervalo típico entre ventas, velocidad diaria ponderada, tendencia de las últimas 2 semanas, días de cobertura, fecha estimada de agotamiento, pronóstico de 7 y 30 días, cantidad sugerida para reponer y alerta (agotado, agotamiento_proximo, detenido, sin_movimiento, sobrestock). Incluye el perfil del negocio (día más fuerte, frecuencia típica).",
    input_schema: {
      type: "object",
      properties: {
        dias: { type: "integer", description: "Días de historia a analizar, entre 14 y 365. Por defecto 90." },
        id_sucursal: { type: "integer", description: "Opcional: limitar a una sucursal." },
        solo_alertas: { type: "boolean", description: "Si es true, devuelve solo productos con alerta o con reposición sugerida." },
      },
    },
  },
  {
    name: "listar_sucursales",
    description: "Sucursales de la empresa con sus ventas de los últimos 30 días.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "resumen_auditoria",
    description:
      "SOLO DUEÑO/ADMIN. Resumen por persona del equipo: movimientos, ventas, anulaciones, salidas manuales, movimientos eliminados, registros a nombre de otro, cambios de stock sin kardex, descuentos altos, actividad fuera de horario y puntaje de riesgo.",
    input_schema: {
      type: "object",
      properties: { dias: { type: "integer", description: "Días hacia atrás, entre 1 y 180. Por defecto 30." } },
    },
  },
  {
    name: "buscar_auditoria",
    description:
      "SOLO DUEÑO/ADMIN. Busca en el registro inalterable de movimientos: quién lo hizo realmente, qué, cuándo, dónde, cantidades y alertas. Úsalo para verificar lo que afirma un empleado.",
    input_schema: {
      type: "object",
      properties: {
        empleado: { type: "string", description: "Opcional: nombre (o parte) de la persona." },
        producto: { type: "string", description: "Opcional: nombre (o parte) del producto." },
        accion: {
          type: "string",
          description:
            "Opcional: venta, venta_anulada, salida_manual, entrada_manual, movimiento_eliminado, stock_modificado_directo, producto_editado, traslado, descuento_alto, orden_recibida.",
        },
        desde: { type: "string", description: "Opcional: fecha inicial AAAA-MM-DD." },
        hasta: { type: "string", description: "Opcional: fecha final AAAA-MM-DD (inclusive)." },
        solo_alertas: { type: "boolean" },
      },
    },
  },
  {
    name: "crear_borrador_orden_compra",
    description:
      "Crea una orden de compra en estado borrador para que una persona la revise y la envíe. No mueve inventario.",
    input_schema: {
      type: "object",
      properties: {
        id_proveedor: { type: "integer", description: "Opcional: id del proveedor." },
        id_bodega: { type: "integer", description: "Opcional: bodega que recibe. Por defecto la principal." },
        nota: { type: "string", description: "Por qué se propone esta orden, en una o dos frases." },
        items: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              id_producto: { type: "integer" },
              cantidad: { type: "number", description: "Unidades a pedir, mayor que cero." },
            },
            required: ["id_producto", "cantidad"],
          },
        },
      },
      required: ["items", "nota"],
    },
  },
  {
    name: "crear_recordatorio",
    description:
      "Deja una notificación para el equipo en la campana de Stockly (por ejemplo, una sugerencia o una tarea pendiente).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Máximo 80 caracteres." },
        mensaje: { type: "string", description: "Máximo 200 caracteres." },
        enlace: { type: "string", description: "Opcional: ruta de la app, por ejemplo /compras o /ventas." },
      },
      required: ["titulo", "mensaje"],
    },
  },
];

// Con streaming, los argumentos de las herramientas llegan a medida que se generan.
const herramientas = definiciones.map((h) => ({ ...h, eager_input_streaming: true }));

// Texto que ve el usuario mientras Novandra usa cada herramienta.
const ESTADOS: Record<string, string> = {
  resumen_negocio: "Revisando el resumen del negocio",
  buscar_productos: "Buscando productos",
  productos_bajo_minimo: "Revisando productos bajo mínimo",
  stock_por_bodega: "Consultando stock por bodega",
  ventas_recientes: "Revisando ventas recientes",
  listar_proveedores: "Consultando proveedores",
  listar_bodegas: "Consultando bodegas",
  ordenes_compra: "Revisando órdenes de compra",
  crear_borrador_orden_compra: "Preparando borrador de orden de compra",
  crear_recordatorio: "Dejando un recordatorio",
  analizar_rotacion: "Analizando la rotación de tus productos",
  listar_sucursales: "Consultando sucursales",
  resumen_auditoria: "Revisando la actividad del equipo",
  buscar_auditoria: "Buscando en la auditoría",
};

type Permisos = {
  admin: boolean;
  verCostos: boolean;
  ordenes: boolean;
  recordatorios: boolean;
  auditoria: boolean;
};

// Quita costos y márgenes de un resultado cuando el usuario no puede verlos.
const CLAVES_COSTO = ["preciocompra", "capital_inmovilizado", "valor_inventario", "costo_unitario"];
function sinCostos(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sinCostos);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([k]) => !CLAVES_COSTO.includes(k))
        .map(([k, v]) => [k, sinCostos(v)]),
    );
  }
  return valor;
}

// Supabase corta las funciones largas (~150 s en el plan gratuito): dejamos margen
// para que Novandra responda con lo que tenga en lugar de cortarse.
const PRESUPUESTO_MS = 100_000;

type Accion = { tipo: string; descripcion: string; enlace?: string };

const entero = (valor: unknown, defecto: number, min: number, max: number) => {
  const n = Number.isFinite(Number(valor)) ? Math.trunc(Number(valor)) : defecto;
  return Math.min(Math.max(n, min), max);
};

async function ejecutar(
  db: SupabaseClient,
  idEmpresa: number,
  nombre: string,
  entrada: Record<string, unknown>,
  acciones: Accion[],
  permisos: Permisos,
): Promise<unknown> {
  // Doble control: aunque el modelo pida una herramienta no autorizada, no se ejecuta.
  if (["resumen_auditoria", "buscar_auditoria"].includes(nombre) && !permisos.auditoria) {
    throw new Error("No autorizado: la auditoría es solo para el dueño o los administradores.");
  }
  if (nombre === "crear_borrador_orden_compra" && !permisos.ordenes) throw new Error("No autorizado por el dueño.");
  if (nombre === "crear_recordatorio" && !permisos.recordatorios) throw new Error("No autorizado por el dueño.");

  const sinError = <T>({ data, error }: { data: T; error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  switch (nombre) {
    case "resumen_negocio":
      return sinError(
        await db.rpc("stockly_dashboard", {
          _id_empresa: idEmpresa,
          _dias: entero(entrada.dias, 30, 1, 180),
          _id_sucursal: entrada.id_sucursal != null ? Number(entrada.id_sucursal) : null,
        }),
      );

    case "buscar_productos": {
      const productos = sinError(
        await db.rpc("buscarproductos", { _id_empresa: idEmpresa, buscador: String(entrada.texto ?? "") }),
      ) as unknown[];
      return productos.slice(0, 50);
    }

    case "productos_bajo_minimo":
      return sinError(await db.rpc("reportproductosbajominimo", { id_empresa: idEmpresa }));

    case "stock_por_bodega": {
      let q = db
        .from("v_stock_bodega")
        .select("id_bodega, bodega, tipo, id_producto, descripcion, cantidad, stock_minimo, unidad, presentacion, contenido, contenido_unidad")
        .eq("id_empresa", idEmpresa)
        .limit(300);
      if (entrada.id_producto != null) q = q.eq("id_producto", Number(entrada.id_producto));
      return sinError(await q);
    }

    case "ventas_recientes": {
      const desde = new Date(Date.now() - entero(entrada.dias, 7, 1, 90) * 86_400_000).toISOString();
      return sinError(
        await db
          .from("ventas")
          .select(
            "prefijo, numero, fecha, total, estado, canal, metodo_pago, clientes(nombre), bodegas(nombre), detalle_venta(descripcion, cantidad, total)",
          )
          .eq("id_empresa", idEmpresa)
          .gte("fecha", desde)
          .order("fecha", { ascending: false })
          .limit(entero(entrada.limite, 30, 1, 100)),
      );
    }

    case "listar_proveedores":
      return sinError(
        await db.from("proveedores").select("id, nombre, contacto, telefono, email").eq("id_empresa", idEmpresa),
      );

    case "listar_bodegas":
      return sinError(await db.from("bodegas").select("id, nombre, tipo, activa").eq("id_empresa", idEmpresa));

    case "ordenes_compra": {
      let q = db
        .from("ordenes_compra")
        .select("id, numero, estado, fecha, total, creada_por, proveedores(nombre), bodegas(nombre)")
        .eq("id_empresa", idEmpresa)
        .order("fecha", { ascending: false })
        .limit(50);
      if (typeof entrada.estado === "string") q = q.eq("estado", entrada.estado);
      return sinError(await q);
    }

    case "crear_borrador_orden_compra": {
      const items = Array.isArray(entrada.items) ? entrada.items : [];
      const limpios = items
        .map((i) => ({ id_producto: Number(i?.id_producto), cantidad: Number(i?.cantidad) }))
        .filter((i) => Number.isInteger(i.id_producto) && i.cantidad > 0);
      if (!limpios.length) throw new Error("La orden necesita al menos un producto con cantidad mayor que cero.");
      const orden = sinError(
        await db.rpc("crear_orden_compra", {
          _orden: {
            id_empresa: idEmpresa,
            id_proveedor: entrada.id_proveedor ?? null,
            id_bodega: entrada.id_bodega ?? null,
            nota: String(entrada.nota ?? "").slice(0, 500),
            creada_por: "novandra",
            items: limpios,
          },
        }),
      ) as { id: number; numero: number };
      acciones.push({ tipo: "orden_compra", descripcion: `Borrador OC-${orden.numero} creado`, enlace: "/compras" });
      return { ...orden, estado: "borrador" };
    }

    case "crear_recordatorio": {
      const enlace = typeof entrada.enlace === "string" && entrada.enlace.startsWith("/") ? entrada.enlace : null;
      sinError(
        await db.from("notificaciones").insert({
          id_empresa: idEmpresa,
          tipo: "novandra",
          titulo: String(entrada.titulo ?? "").slice(0, 80),
          mensaje: String(entrada.mensaje ?? "").slice(0, 200),
          enlace,
        }),
      );
      acciones.push({ tipo: "recordatorio", descripcion: String(entrada.titulo ?? ""), enlace: enlace ?? undefined });
      return { ok: true };
    }

    case "analizar_rotacion": {
      const datos = sinError(
        await db.rpc("stockly_rotacion", {
          _id_empresa: idEmpresa,
          _dias: entero(entrada.dias, 90, 14, 365),
          _id_sucursal: entrada.id_sucursal != null ? Number(entrada.id_sucursal) : null,
        }),
      ) as { perfil: unknown; productos: Record<string, unknown>[] };
      const productos = entrada.solo_alertas
        ? datos.productos.filter((p) => p.alerta || Number(p.sugerido_reponer) > 0)
        : datos.productos;
      return { perfil: datos.perfil, productos: productos.slice(0, 80) };
    }

    case "listar_sucursales": {
      const panel = sinError(await db.rpc("stockly_dashboard", { _id_empresa: idEmpresa, _dias: 30 })) as {
        por_sucursal?: unknown;
      };
      const sedes = sinError(
        await db.from("sucursales").select("id, nombre, ciudad, direccion, responsable, activa").eq("id_empresa", idEmpresa),
      );
      return { sucursales: sedes, ventas_30_dias: panel.por_sucursal ?? [] };
    }

    case "resumen_auditoria":
      return sinError(await db.rpc("stockly_auditoria_resumen", { _id_empresa: idEmpresa, _dias: entero(entrada.dias, 30, 1, 180) }));

    case "buscar_auditoria": {
      let q = db
        .from("auditoria")
        .select("fecha, usuario_nombre, accion, cantidad, detalle, alerta, bodegas(nombre), sucursales(nombre)")
        .eq("id_empresa", idEmpresa)
        .order("fecha", { ascending: false })
        .limit(60);
      const limpio = (t: unknown) => String(t ?? "").replace(/[%,()]/g, " ").trim();
      if (entrada.empleado) q = q.ilike("usuario_nombre", `%${limpio(entrada.empleado)}%`);
      if (entrada.producto) q = q.ilike("detalle->>producto", `%${limpio(entrada.producto)}%`);
      if (typeof entrada.accion === "string") q = q.eq("accion", entrada.accion);
      if (entrada.solo_alertas) q = q.not("alerta", "is", null);
      if (typeof entrada.desde === "string") q = q.gte("fecha", `${entrada.desde}T00:00:00-05:00`);
      if (typeof entrada.hasta === "string") q = q.lte("fecha", `${entrada.hasta}T23:59:59-05:00`);
      return sinError(await q);
    }

    default:
      throw new Error(`Herramienta desconocida: ${nombre}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });

  let cuerpo: { id_empresa?: number; mensajes?: { role: string; content: string }[]; empresa?: string; moneda?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return responder({ error: "Cuerpo no válido" }, 400);
  }

  const idEmpresa = Number(cuerpo.id_empresa);
  const historial = (cuerpo.mensajes ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CARACTERES) }));
  while (historial.length && historial[0].role !== "user") historial.shift();
  if (!Number.isInteger(idEmpresa) || !historial.length || historial.at(-1)!.role !== "user") {
    return responder({ error: "Solicitud incompleta" }, 400);
  }

  // Acceso a la empresa y límite mensual del plan.
  const { data: uso, error: errorUso } = await db.rpc("stockly_uso_plan", { _id_empresa: idEmpresa });
  if (errorUso) return responder({ error: "No tienes acceso a esta empresa" }, 403);
  const { data: plan } = await db.rpc("stockly_plan", { _id_empresa: idEmpresa });
  if (!MODELO) return responder({ error: "Novandra Max aún no está configurada (falta NOVANDRA_MODELO).", esencial: true }, 503);
  // Interruptor global: mientras la IA no esté disponible, la app usa Novandra esencial.
  const { data: iaDisponible } = await db.rpc("stockly_ajuste", { _clave: "novandra_ia_disponible" });
  if (iaDisponible === false) {
    return responder({ error: "Novandra Max llegará muy pronto.", esencial: true }, 403);
  }
  // Novandra Max (IA) es de los planes Pro y Enterprise; el Básico usa Novandra esencial en la app.
  if (plan && plan.novandra_ia === false) {
    return responder({ error: "Novandra Max está disponible en los planes Pro y Enterprise.", esencial: true }, 403);
  }
  const limite = plan?.limite_novandra_mes;
  if (limite != null && Number(uso?.novandra_mes ?? 0) >= limite) {
    return responder(
      {
        error: `Usaste las ${limite} consultas a Novandra Max de tu plan ${plan?.nombre ?? ""} este mes. Mientras tanto te respondo en modo esencial.`,
        limite: true,
        esencial: true,
      },
      429,
    );
  }
  // Tope de gasto del mes en la API (por si las consultas son muy largas).
  const presupuesto = Number(plan?.presupuesto_ia_cop ?? 0);
  if (presupuesto > 0 && Number(uso?.ia_cop_mes ?? 0) >= presupuesto) {
    return responder(
      { error: "Novandra Max llegó al tope de análisis de este mes. Mientras tanto te respondo en modo esencial.", limite: true, esencial: true },
      429,
    );
  }

  // Rol de quien pregunta y lo que el dueño autorizó (se aplica aquí, no en el navegador).
  const { data: esAdmin } = await db.rpc("stockly_es_admin_actual");
  const { data: cfg } = await db.from("novandra_config").select().eq("id_empresa", idEmpresa).maybeSingle();
  const admin = esAdmin === true;
  if (!admin && cfg && cfg.empleados_pueden_usar === false) {
    return responder({ error: "El dueño de tu empresa no ha habilitado Novandra para empleados." }, 403);
  }
  const permisos: Permisos = {
    admin,
    verCostos: admin || cfg?.empleados_ven_costos === true,
    ordenes: cfg?.puede_crear_ordenes !== false,
    recordatorios: cfg?.puede_crear_recordatorios !== false,
    auditoria: admin && cfg?.auditoria_activa !== false,
  };
  const herramientasPermitidas = herramientas.filter(
    (h) =>
      (!["resumen_auditoria", "buscar_auditoria"].includes(h.name) || permisos.auditoria) &&
      (h.name !== "crear_borrador_orden_compra" || permisos.ordenes) &&
      (h.name !== "crear_recordatorio" || permisos.recordatorios),
  );
  // Bloque estable (con caché: herramientas + instrucciones se reutilizan entre consultas)
  // + bloque con el rol y las reglas del dueño.
  const sistema = [
    { type: "text" as const, text: SISTEMA, cache_control: { type: "ephemeral" as const } },
    {
      type: "text" as const,
      text:
        `Quien te escribe es ${admin ? "el dueño o un administrador" : "un empleado"} de la empresa.` +
        (permisos.verCostos ? "" : " No reveles precios de compra, costos, márgenes ni valor del inventario.") +
        (cfg?.instrucciones ? `\n\nInstrucciones del dueño (respétalas siempre):\n${String(cfg.instrucciones).slice(0, 1500)}` : ""),
    },
  ];

  const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", dateStyle: "full" });
  const contexto = `Empresa: ${cuerpo.empresa ?? "sin nombre"} · Moneda: ${cuerpo.moneda ?? "$"} · Hoy: ${hoy}`;

  const mensajes: Anthropic.Beta.BetaMessageParam[] = historial.map((m, i) =>
    i === historial.length - 1 ? { role: "user", content: `${m.content}\n\n(${contexto})` } : m,
  );

  // Respuesta en streaming (Server-Sent Events) para que el usuario vea el avance:
  //   { tipo: "estado", texto }   qué está consultando
  //   { tipo: "texto", delta }    fragmento de la respuesta
  //   { tipo: "fin", acciones }   terminó (con los borradores/recordatorios creados)
  //   { tipo: "error", mensaje }  algo falló
  const codificador = new TextEncoder();
  const flujo = new ReadableStream({
    async start(controller) {
      const enviar = (evento: Record<string, unknown>) =>
        controller.enqueue(codificador.encode(`data: ${JSON.stringify(evento)}\n\n`));
      const acciones: Accion[] = [];
      const inicio = Date.now();
      let tokensEntrada = 0;
      let tokensSalida = 0;
      let escribioAlgo = false;
      // Si la cuenta no acepta el respaldo de modelo (beta), se reintenta sin él.
      let conRespaldo = true;

      try {
        enviar({ tipo: "estado", texto: "Pensando" });
        for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
          // Sin tiempo para más consultas: se pide la respuesta final sin herramientas.
          const ultima = vuelta === MAX_VUELTAS - 1 || Date.now() - inicio > PRESUPUESTO_MS || tokensEntrada > MAX_TOKENS_ENTRADA;
          if (ultima && vuelta > 0) {
            mensajes.push({
              role: "user",
              content: "Responde ahora con la información que ya consultaste, sin usar más herramientas.",
            });
          }

          const corriente = anthropic.beta.messages.stream({
            model: MODELO,
            max_tokens: MAX_TOKENS_SALIDA,
            ...(conRespaldo ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
            output_config: { effort: "medium" },
            system: sistema,
            tools: herramientasPermitidas,
            tool_choice: ultima ? { type: "none" } : { type: "auto" },
            messages: mensajes,
          });
          // Separa el texto de cada vuelta (p. ej. "Voy a revisar..." y la respuesta final).
          let primeraLetra = true;
          corriente.on("text", (delta) => {
            if (primeraLetra && escribioAlgo) enviar({ tipo: "texto", delta: "\n\n" });
            primeraLetra = false;
            escribioAlgo = true;
            enviar({ tipo: "texto", delta });
          });
          let r: Anthropic.Beta.BetaMessage;
          try {
            r = await corriente.finalMessage();
          } catch (e) {
            if (conRespaldo && !escribioAlgo && e instanceof Anthropic.BadRequestError && /fallback|beta/i.test(e.message)) {
              console.warn("[novandra] Respaldo de modelo no disponible, se reintenta sin él:", e.message);
              conRespaldo = false;
              vuelta--;
              continue;
            }
            throw e;
          }
          // Entrada equivalente en costo: la escritura en caché vale 1,25x y la lectura 0,1x.
          tokensEntrada += Math.round(
            r.usage.input_tokens + (r.usage.cache_creation_input_tokens ?? 0) * 1.25 + (r.usage.cache_read_input_tokens ?? 0) * 0.1,
          );
          tokensSalida += r.usage.output_tokens;

          if (r.stop_reason === "refusal") {
            enviar({ tipo: "texto", delta: "No puedo ayudarte con esa solicitud. Prueba a reformularla con una tarea del negocio." });
            break;
          }
          if (r.stop_reason === "pause_turn") {
            mensajes.push({ role: "assistant", content: r.content });
            continue;
          }
          // max_tokens o fin normal: no se ejecutan herramientas con argumentos posiblemente incompletos.
          if (r.stop_reason !== "tool_use") break;

          mensajes.push({ role: "assistant", content: r.content });
          const llamadas = r.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          enviar({ tipo: "estado", texto: llamadas.map((l) => ESTADOS[l.name] ?? "Consultando").join(" · ") });
          const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
            llamadas.map(async (llamada) => {
              const entrada = llamada.input;
              if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
                return { type: "tool_result", tool_use_id: llamada.id, content: "INVALID_JSON: argumentos no válidos", is_error: true };
              }
              try {
                const datos = await ejecutar(db, idEmpresa, llamada.name, entrada as Record<string, unknown>, acciones, permisos);
                const visibles = permisos.verCostos ? datos : sinCostos(datos);
                return { type: "tool_result", tool_use_id: llamada.id, content: JSON.stringify(visibles ?? null) };
              } catch (e) {
                return {
                  type: "tool_result",
                  tool_use_id: llamada.id,
                  content: e instanceof Error ? e.message : "Error al ejecutar la herramienta",
                  is_error: true,
                };
              }
            }),
          );
          mensajes.push({ role: "user", content: resultados });
          enviar({ tipo: "estado", texto: "Analizando" });
        }

        if (!escribioAlgo) enviar({ tipo: "texto", delta: "Listo." });
        enviar({ tipo: "fin", acciones });
      } catch (e) {
        let mensaje = "Novandra no pudo responder. Intenta de nuevo.";
        const detalle = e instanceof Error ? e.message : String(e);
        if (e instanceof Anthropic.APIError) console.error(`[novandra] Error ${e.status}:`, e.message);
        else console.error("[novandra]", e);
        if (e instanceof Anthropic.RateLimitError) mensaje = "Novandra está recibiendo muchas consultas. Intenta en un minuto.";
        else if (e instanceof Anthropic.AuthenticationError) {
          mensaje = "La API key de Anthropic no es válida. Revisa el secreto ANTHROPIC_API_KEY en Supabase (Edge Functions → Secrets).";
        } else if (e instanceof Anthropic.PermissionDeniedError) {
          mensaje = "La API key de Anthropic no tiene permiso para usar este modelo. Revisa tu cuenta en console.anthropic.com.";
        } else if (e instanceof Anthropic.NotFoundError) {
          mensaje = `El modelo ${MODELO} no está disponible para tu cuenta de Anthropic.`;
        } else if (e instanceof Anthropic.APIError && /workspace/i.test(e.message)) {
          mensaje =
            "La API key de Anthropic no pertenece a un workspace. Crea una key dentro de un workspace en console.anthropic.com " +
            "o guarda el ID del workspace en el secreto ANTHROPIC_WORKSPACE_ID de Supabase.";
        } else if (e instanceof Anthropic.APIError && /credit|balance|billing/i.test(e.message)) {
          mensaje = "La cuenta de Anthropic no tiene créditos. Recárgala en console.anthropic.com → Billing.";
        } else if (e instanceof Anthropic.InternalServerError || (e instanceof Anthropic.APIError && e.status === 529)) {
          mensaje = "El servicio de IA está saturado en este momento. Intenta en unos minutos.";
        } else if (e instanceof Anthropic.APIConnectionError) {
          mensaje = "No se pudo conectar con el servicio de IA. Intenta de nuevo.";
        }
        // El detalle técnico solo lo ve el dueño o un administrador.
        if (permisos.admin) mensaje += `\n\nDetalle técnico: ${detalle.slice(0, 300)}`;
        enviar({ tipo: "error", mensaje, acciones });
      } finally {
        if (tokensEntrada || tokensSalida) {
          await db.from("novandra_uso").insert({
            id_empresa: idEmpresa,
            tokens_entrada: tokensEntrada,
            tokens_salida: tokensSalida,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(flujo, {
    headers: { ...cors, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
  });
});
