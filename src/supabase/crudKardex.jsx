import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Movimientos con saldo acumulado. filtros: id_producto, id_bodega, tipo, origen, desde, hasta, texto, limite.
export async function MostrarKardex({ idEmpresa, ...filtros }) {
  const { data, error } = await supabase.rpc("stockly_kardex", { _id_empresa: idEmpresa, _filtros: filtros });
  if (error) throw error;
  return data ?? { filas: [], total: 0, resumen: { entradas: 0, salidas: 0 } };
}

export async function RegistrarAjuste({ idEmpresa, idProducto, idBodega, tipo, cantidad, motivo, nota }) {
  const { data, error } = await supabase.rpc("stockly_registrar_ajuste", {
    _id_empresa: idEmpresa,
    _id_producto: idProducto,
    _id_bodega: idBodega ?? null,
    _tipo: tipo,
    _cantidad: cantidad,
    _motivo: motivo,
    _nota: nota ?? null,
  });
  if (manejarError(error, "No se pudo registrar el ajuste")) return null;
  notificarExito(tipo === "Salida" ? "Salida registrada" : "Entrada registrada");
  return data;
}

export async function AnularMovimiento({ id, nota }) {
  const { error } = await supabase.rpc("stockly_anular_movimiento", { _id: id, _nota: nota ?? null });
  if (manejarError(error, "No se pudo anular el ajuste")) return false;
  notificarExito("Ajuste anulado. Quedó el movimiento contrario.");
  return true;
}
