import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// Red de empresas (partners y franquicias). Todo pasa por funciones del servidor.
async function rpc(nombre, params) {
  const { data, error } = await supabase.rpc(nombre, params);
  if (error) throw error;
  return data;
}

export const MisVinculos = (idEmpresa) => rpc("stockly_red_mis_vinculos", { _id_empresa: idEmpresa });
export const EnviosRed = (idEmpresa) => rpc("stockly_red_envios", { _id_empresa: idEmpresa });
export const PedidosRed = (idEmpresa) => rpc("stockly_red_pedidos", { _id_empresa: idEmpresa });
export const ConsignacionRed = (idEmpresa) => rpc("stockly_red_consignacion", { _id_empresa: idEmpresa });
export const ReposicionRed = (idEmpresa, idVinculo) => rpc("stockly_red_reposicion", { _id_empresa: idEmpresa, _id_vinculo: idVinculo });
export const StockRed = (idVinculo, idEmpresa, texto = "") => rpc("stockly_red_stock", { _id_vinculo: idVinculo, _id_empresa: idEmpresa, _texto: texto || null });

export async function InvitarEmpresa(idEmpresa, nota) {
  const { data, error } = await supabase.rpc("stockly_red_invitar", { _id_empresa: idEmpresa, _nota: nota ?? null });
  if (manejarError(error, "No se pudo crear la invitación")) return null;
  return data;
}

export async function AceptarVinculo(idEmpresa, codigo) {
  const { data, error } = await supabase.rpc("stockly_red_aceptar", { _id_empresa: idEmpresa, _codigo: codigo });
  if (manejarError(error, "No se pudo aceptar el vínculo")) return null;
  notificarExito(`Ya estás vinculado con ${data?.matriz ?? "la empresa"}.`);
  return data;
}

export async function CancelarVinculo(idVinculo, idEmpresa) {
  const { error } = await supabase.rpc("stockly_red_cancelar", { _id_vinculo: idVinculo, _id_empresa: idEmpresa });
  if (manejarError(error, "No se pudo cancelar el vínculo")) return false;
  notificarExito("Vínculo cancelado");
  return true;
}

export async function ConfigurarVinculo(idVinculo, idEmpresa, config) {
  const { data, error } = await supabase.rpc("stockly_red_configurar", { _id_vinculo: idVinculo, _id_empresa: idEmpresa, _config: config });
  if (manejarError(error, "No se pudo guardar")) return null;
  return data;
}

export async function EnviarMercancia({ idVinculo, idEmpresa, idBodega, items, nota, idPedido, modalidad = "traslado" }) {
  const { data, error } = await supabase.rpc("stockly_red_enviar", {
    _id_vinculo: idVinculo,
    _id_empresa: idEmpresa,
    _id_bodega: idBodega ?? null,
    _items: items,
    _nota: nota ?? null,
    _id_pedido: idPedido ?? null,
    _modalidad: modalidad,
  });
  if (manejarError(error, "No se pudo registrar el envío")) return null;
  notificarExito(`Envío RED-${data.numero} registrado. Salió de tu inventario.`);
  return data;
}

export async function RecibirEnvio(idEnvio, idEmpresa, idBodega) {
  const { data, error } = await supabase.rpc("stockly_red_recibir", { _id_envio: idEnvio, _id_empresa: idEmpresa, _id_bodega: idBodega ?? null });
  if (manejarError(error, "No se pudo recibir el envío")) return null;
  notificarExito(`Recibido: ${data.unidades} unidades entraron a tu inventario${data.productos_creados ? ` (${data.productos_creados} producto(s) nuevos)` : ""}.`);
  return data;
}

export async function RechazarEnvio(idEnvio, idEmpresa, motivo) {
  const { error } = await supabase.rpc("stockly_red_rechazar", { _id_envio: idEnvio, _id_empresa: idEmpresa, _motivo: motivo ?? null });
  if (manejarError(error, "No se pudo rechazar el envío")) return false;
  notificarExito("Envío rechazado. La mercancía volvió al origen.");
  return true;
}

export async function PedirMercancia({ idEmpresa, idsVinculo, items, nota }) {
  const { data, error } = await supabase.rpc("stockly_red_pedir", { _id_empresa: idEmpresa, _ids_vinculo: idsVinculo, _items: items, _nota: nota ?? null });
  if (manejarError(error, "No se pudo enviar el pedido")) return null;
  notificarExito(data.pedidos > 1 ? `${data.pedidos} pedidos enviados` : "Pedido enviado");
  return data;
}

export async function ConfirmarPedido(idPedido, idEmpresa) {
  const { error } = await supabase.rpc("stockly_red_confirmar_pedido", { _id_pedido: idPedido, _id_empresa: idEmpresa });
  if (manejarError(error, "No se pudo confirmar el pedido")) return false;
  notificarExito("Pedido confirmado y enviado a la otra empresa");
  return true;
}

export async function LiquidarConsignacion(idVinculo, idEmpresa, nota) {
  const { data, error } = await supabase.rpc("stockly_red_liquidar", { _id_vinculo: idVinculo, _id_empresa: idEmpresa, _nota: nota ?? null });
  if (manejarError(error, "No se pudo liquidar")) return null;
  notificarExito(`Liquidación LIQ-${data.numero} enviada a la matriz`);
  return data;
}

export async function MarcarLiquidacionPagada(id, idEmpresa) {
  const { error } = await supabase.rpc("stockly_red_liquidacion_pagada", { _id: id, _id_empresa: idEmpresa });
  if (manejarError(error, "No se pudo confirmar el pago")) return false;
  notificarExito("Liquidación marcada como pagada");
  return true;
}

export async function ConfigurarReposicion({ idVinculo, idEmpresa, idProducto, activo, cantidad }) {
  const { error } = await supabase.rpc("stockly_red_reposicion_config", { _id_vinculo: idVinculo, _id_empresa: idEmpresa, _id_producto: idProducto, _activo: activo, _cantidad: cantidad });
  return !manejarError(error, "No se pudo guardar la reposición");
}

export async function CambiarPedido(idPedido, idEmpresa, estado, respuesta) {
  const { error } = await supabase.rpc("stockly_red_pedido_estado", { _id_pedido: idPedido, _id_empresa: idEmpresa, _estado: estado, _respuesta: respuesta ?? null });
  if (manejarError(error, "No se pudo actualizar el pedido")) return false;
  notificarExito(estado === "rechazado" ? "Pedido rechazado" : "Pedido cancelado");
  return true;
}
