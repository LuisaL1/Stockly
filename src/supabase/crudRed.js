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

export async function ImportarCatalogoRed(idVinculo, idEmpresa, ids = null) {
  const { data, error } = await supabase.rpc("stockly_red_importar_catalogo", { _id_vinculo: idVinculo, _id_empresa: idEmpresa, _ids: ids });
  if (manejarError(error, "No se pudo importar el catálogo")) return null;
  notificarExito(data.creados ? `${data.creados} producto(s) agregados a tu catálogo` : "Ya tenías todos esos productos");
  return data;
}

export async function EnviarMercancia({ idVinculo, idEmpresa, idBodega, items, nota, idPedido }) {
  const { data, error } = await supabase.rpc("stockly_red_enviar", {
    _id_vinculo: idVinculo,
    _id_empresa: idEmpresa,
    _id_bodega: idBodega ?? null,
    _items: items,
    _nota: nota ?? null,
    _id_pedido: idPedido ?? null,
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

export async function CambiarPedido(idPedido, idEmpresa, estado, respuesta) {
  const { error } = await supabase.rpc("stockly_red_pedido_estado", { _id_pedido: idPedido, _id_empresa: idEmpresa, _estado: estado, _respuesta: respuesta ?? null });
  if (manejarError(error, "No se pudo actualizar el pedido")) return false;
  notificarExito(estado === "rechazado" ? "Pedido rechazado" : "Pedido cancelado");
  return true;
}
