import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarPlanes() {
  const { data, error } = await supabase.from("stockly_planes").select().order("orden");
  if (error) throw error;
  return data ?? [];
}

export async function MostrarSuscripcion(idEmpresa) {
  const { data, error } = await supabase.from("stockly_suscripciones").select().eq("id_empresa", idEmpresa).maybeSingle();
  if (error) throw error;
  return data;
}

export async function MostrarUsoPlan(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_uso_plan", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data ?? {};
}

export async function MostrarHistorialSuscripcion(idEmpresa) {
  const { data, error } = await supabase
    .from("historial_suscripcion")
    .select()
    .eq("id_empresa", idEmpresa)
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function CambiarPlan({ idEmpresa, idPlan, ciclo }) {
  const { error } = await supabase.rpc("cambiar_plan", { _id_empresa: idEmpresa, _id_plan: idPlan, _ciclo: ciclo });
  if (manejarError(error, "No se pudo cambiar el plan")) return false;
  notificarExito("Plan actualizado");
  return true;
}

// ------------------------------------------------------------- Lanzamiento: prueba, pagos y ajustes

// Plan efectivo, mes de prueba, vencimiento y si aplica el descuento de primera compra.
// null si la migración de lanzamiento aún no está aplicada.
export async function EstadoSuscripcion(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_estado_suscripcion", { _id_empresa: idEmpresa });
  if (error) return null;
  return data;
}

// Interruptores globales (funciones que se activan con el tiempo).
export async function AjustesGlobales() {
  const { data, error } = await supabase.from("stockly_ajustes_globales").select("clave, valor");
  if (error) return {};
  return Object.fromEntries((data ?? []).map((a) => [a.clave, a.valor]));
}

// conComplementos: al renovar el mismo plan, incluye los complementos vigentes.
export async function CotizarPlan({ idEmpresa, idPlan, ciclo, conComplementos = true }) {
  const { data, error } = await supabase.rpc("stockly_cotizar_plan", {
    _id_empresa: idEmpresa,
    _id_plan: idPlan,
    _ciclo: ciclo,
    _con_complementos: conComplementos,
  });
  if (error) throw error;
  return data;
}

async function llamarPago(cuerpo) {
  const { data, error } = await supabase.functions.invoke("suscripcion-pago", { body: { ...cuerpo, origen: window.location.origin } });
  if (error) {
    const detalle = await error.context?.json?.().catch(() => null);
    throw new Error(detalle?.error ?? "No se pudo conectar con el servicio de pagos. Intenta de nuevo.");
  }
  return data;
}

// Devuelve { url } del checkout de Wompi.
export const CrearPagoPlan = ({ idEmpresa, idPlan, ciclo, conComplementos = true }) =>
  llamarPago({ accion: "crear", id_empresa: idEmpresa, id_plan: idPlan, ciclo, con_complementos: conComplementos });

// ------------------------------------------------------------- Complementos
// Plan que rige hoy con los complementos sumados (el mismo que usa el servidor para los topes).
export async function PlanEfectivo(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_plan", { _id_empresa: idEmpresa });
  if (error) return null;
  return data;
}

export async function MostrarComplementos() {
  const { data, error } = await supabase.from("stockly_complementos").select().eq("activo", true).order("orden");
  if (error) return [];
  return data ?? [];
}

export async function MisComplementos(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_mis_complementos", { _id_empresa: idEmpresa });
  if (error) return [];
  return data ?? [];
}

export async function CotizarComplemento({ idEmpresa, idComplemento, cantidad }) {
  const { data, error } = await supabase.rpc("stockly_cotizar_complemento", {
    _id_empresa: idEmpresa,
    _id_complemento: idComplemento,
    _cantidad: cantidad,
  });
  if (error) throw error;
  return data;
}

export const CrearPagoComplemento = ({ idEmpresa, idComplemento, cantidad }) =>
  llamarPago({ accion: "crear", tipo: "complemento", id_empresa: idEmpresa, id_complemento: idComplemento, cantidad });

// Con el id de la transacción (regreso desde Wompi) o con la referencia del pago.
export const VerificarPagoPlan = ({ idTransaccion, referencia }) =>
  llamarPago({ accion: "verificar", id_transaccion: idTransaccion, referencia });

export async function EstadoPagoPlan(referencia) {
  const { data, error } = await supabase.rpc("stockly_estado_pago_suscripcion", { _referencia: referencia });
  if (error) throw error;
  return data;
}

export async function MostrarPagosSuscripcion(idEmpresa) {
  const { data, error } = await supabase
    .from("pagos_suscripcion")
    .select("id, id_plan, ciclo, tipo, complementos, total, descuento, estado, metodo, created_at, aprobado_en, periodo_hasta")
    .eq("id_empresa", idEmpresa)
    .in("estado", ["aprobado", "rechazado"])
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  return data ?? [];
}

// Pagos iniciados en los últimos 2 días que siguen pendientes (para consultarlos en Wompi).
export async function MostrarPagosPendientes(idEmpresa) {
  const { data, error } = await supabase
    .from("pagos_suscripcion")
    .select("referencia, created_at")
    .eq("id_empresa", idEmpresa)
    .eq("estado", "pendiente")
    .gte("created_at", new Date(Date.now() - 2 * 864e5).toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return [];
  return data ?? [];
}

// ------------------------------------------------------------- Prueba de Enterprise (sin cobro)
export const DatosPrueba = (idEmpresa) => llamarPago({ accion: "datos_prueba", id_empresa: idEmpresa });

export const ActivarPrueba = ({ idEmpresa, token, tipo }) =>
  llamarPago({ accion: "activar_prueba", id_empresa: idEmpresa, token, tipo, acepta: true });

// ------------------------------------------------------------- Códigos promocionales
export async function CanjearCodigo({ idEmpresa, codigo }) {
  const { data, error } = await supabase.rpc("stockly_canjear_codigo", { _id_empresa: idEmpresa, _codigo: codigo });
  if (error) throw new Error(error.message);
  return data;
}
