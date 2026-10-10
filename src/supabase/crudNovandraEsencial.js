import { supabase } from "./supabase.config";

// Datos que consulta Novandra esencial. Todo pasa por las mismas funciones y reglas de
// acceso que el resto de la app: cada usuario solo ve lo de su empresa.

const datos = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function PerfilNovandra(idEmpresa) {
  const [plan, admin, config, sucursales, aprendidas, ia] = await Promise.all([
    supabase.rpc("stockly_plan", { _id_empresa: idEmpresa }),
    supabase.rpc("stockly_es_admin_actual"),
    supabase.from("novandra_config").select().eq("id_empresa", idEmpresa).maybeSingle(),
    supabase.from("sucursales").select("id, nombre").eq("id_empresa", idEmpresa),
    supabase.from("novandra_aprendizaje").select("frase, intencion, usos").eq("id_empresa", idEmpresa).limit(500),
    supabase.from("stockly_ajustes_globales").select("valor").eq("clave", "novandra_ia_disponible").maybeSingle(),
  ]);
  // Novandra Max (IA) solo cuando está disponible para todos (interruptor global) y el plan la incluye.
  const iaDisponible = ia.error || !ia.data ? true : ia.data.valor === true;
  return {
    plan: plan.data ? { ...plan.data, novandra_ia: !!plan.data.novandra_ia && iaDisponible } : null,
    iaDisponible,
    admin: admin.data === true,
    config: config.data ?? null,
    sucursales: sucursales.data ?? [],
    // Sin la migración de Novandra esencial, la tabla no existe: se sigue sin aprendizaje.
    aprendidas: aprendidas.error ? [] : (aprendidas.data ?? []),
  };
}

export async function CatalogoNovandra(idEmpresa) {
  const { data, error } = await supabase
    .from("productos")
    .select("id, descripcion, nombre_completo, stock, stock_minimo, precioventa, preciocompra, codigointerno, unidad, presentacion, contenido, contenido_unidad")
    .eq("id_empresa", idEmpresa)
    .limit(5000);
  if (error) throw error;
  // "nombre" es el nombre completo (con presentación y, si hace falta, código): así Novandra siempre es específica.
  return (data ?? []).map((p) => ({ ...p, nombre: p.nombre_completo ?? p.descripcion, descripcion: p.nombre_completo ?? p.descripcion }));
}

export const Dashboard = (idEmpresa, dias, idSucursal) =>
  supabase.rpc("stockly_dashboard", { _id_empresa: idEmpresa, _dias: dias, ...(idSucursal ? { _id_sucursal: idSucursal } : {}) }).then(datos);

export const Rotacion = (idEmpresa, dias = 90, idSucursal = null) =>
  supabase.rpc("stockly_rotacion", { _id_empresa: idEmpresa, _dias: dias, _id_sucursal: idSucursal }).then(datos);

export const Patrones = (idEmpresa, dias = 90, idSucursal = null) =>
  supabase.rpc("stockly_patrones", { _id_empresa: idEmpresa, _dias: dias, _id_sucursal: idSucursal }).then(datos);

export const BajoMinimo = (idEmpresa) => supabase.rpc("reportproductosbajominimo", { id_empresa: idEmpresa }).then(datos);

export const StockProducto = (idEmpresa, idProducto) =>
  supabase
    .from("v_stock_bodega")
    .select("bodega, tipo, cantidad")
    .eq("id_empresa", idEmpresa)
    .eq("id_producto", idProducto)
    .then(datos);

export const OrdenesAbiertas = (idEmpresa) =>
  supabase
    .from("ordenes_compra")
    .select("id, numero, estado, fecha, total, creada_por, proveedores(nombre)")
    .eq("id_empresa", idEmpresa)
    .in("estado", ["borrador", "enviada"])
    .order("fecha", { ascending: false })
    .limit(20)
    .then(datos);

export const ResumenAuditoria = (idEmpresa, dias = 30) =>
  supabase.rpc("stockly_auditoria_resumen", { _id_empresa: idEmpresa, _dias: dias }).then(datos);

export const AuditoriaPersona = (idEmpresa, idUsuario, dias = 30) =>
  supabase
    .from("auditoria")
    .select("fecha, accion, cantidad, detalle, alerta")
    .eq("id_empresa", idEmpresa)
    .eq("id_usuario", idUsuario)
    .gte("fecha", new Date(Date.now() - dias * 86_400_000).toISOString())
    .order("fecha", { ascending: false })
    .limit(40)
    .then(datos);

export const CrearBorradorOrden = (idEmpresa, items, nota) =>
  supabase
    .rpc("crear_orden_compra", { _orden: { id_empresa: idEmpresa, nota, creada_por: "novandra", items } })
    .then(datos);

export const CrearRecordatorio = (idEmpresa, titulo, mensaje) =>
  supabase.from("notificaciones").insert({ id_empresa: idEmpresa, tipo: "novandra", titulo, mensaje }).then(datos);

export async function AprenderFrase(idEmpresa, frase, intencion) {
  // Si falla (p. ej. sin la migración), no interrumpe la conversación.
  await supabase.rpc("stockly_novandra_aprender", { _id_empresa: idEmpresa, _frase: frase, _intencion: intencion });
}
