import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

export async function MostrarEmpresa(p) {
  const { data, error } = await supabase
    .from("asignarempresa")
    .select("Empresa(id,nombre,simbolomoneda,nit,sector,ciudad,telefono)")
    .eq("id_usuario", p.idusuario)
    .maybeSingle();
  if (error) throw error;
  return data?.Empresa ?? null;
}

// Guarda con la función del servidor (verifica que sea dueño o administrador).
// Devuelve los datos guardados o null. Nunca muestra "actualizado" si no se guardó nada.
export async function EditarEmpresa({ id, ...datos }) {
  const { data, error } = await supabase.rpc("actualizar_empresa", { _id_empresa: id, _datos: datos });
  if (error?.code === "PGRST202") {
    // La migración 20261006010000_empresa.sql aún no está aplicada: se intenta directo y se verifica.
    const directo = await supabase.from("Empresa").update(datos).eq("id", id).select("id");
    if (manejarError(directo.error, "No se pudo actualizar la empresa")) return null;
    if (!directo.data?.length) {
      manejarError(
        { message: "Tu base no permite editar la empresa desde la app. Ejecuta la migración 20261006010000_empresa.sql." },
        "Los cambios no se guardaron"
      );
      return null;
    }
    notificarExito("Datos de la empresa actualizados");
    return { id, ...datos };
  }
  if (manejarError(error, "No se pudo actualizar la empresa")) return null;
  notificarExito("Datos de la empresa actualizados");
  return data;
}

export async function ContarUsuariosXempresa(p) {
  const { data, error } = await supabase.rpc("contar_usuarios_por_empresa", {
    _id_empresa: p._id_empresa,
  });
  if (error) throw error;
  return data ?? 0;
}
