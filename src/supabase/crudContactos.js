import { supabase } from "./supabase.config";
import { manejarError } from "./manejarError";
import { notificarExito } from "../utils/notificaciones";

// CRUD genérico para las tablas de contactos (clientes y proveedores).
function crudTabla(tabla, { singular, columnasBusqueda }) {
  return {
    mostrar: async (idEmpresa) => {
      const { data, error } = await supabase.from(tabla).select().eq("id_empresa", idEmpresa).order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    buscar: async (idEmpresa, texto) => {
      const patron = `%${texto.replace(/[%,()]/g, " ").trim()}%`;
      const { data, error } = await supabase
        .from(tabla)
        .select()
        .eq("id_empresa", idEmpresa)
        .or(columnasBusqueda.map((c) => `${c}.ilike.${patron}`).join(","))
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    insertar: async (p) => {
      const { error } = await supabase.from(tabla).insert(p);
      if (manejarError(error, `No se pudo registrar el ${singular}`)) return false;
      notificarExito(`${singular[0].toUpperCase()}${singular.slice(1)} registrado`);
      return true;
    },
    editar: async ({ id, ...cambios }) => {
      const { error } = await supabase.from(tabla).update(cambios).eq("id", id);
      if (manejarError(error, `No se pudo editar el ${singular}`)) return false;
      notificarExito(`${singular[0].toUpperCase()}${singular.slice(1)} actualizado`);
      return true;
    },
    eliminar: async ({ id }) => {
      const { error } = await supabase.from(tabla).delete().eq("id", id);
      if (manejarError(error, `No se pudo eliminar el ${singular}`)) return false;
      notificarExito(`${singular[0].toUpperCase()}${singular.slice(1)} eliminado`);
      return true;
    },
  };
}

export const crudClientes = crudTabla("clientes", {
  singular: "cliente",
  columnasBusqueda: ["nombre", "documento", "email", "telefono"],
});

export const crudProveedores = crudTabla("proveedores", {
  singular: "proveedor",
  columnasBusqueda: ["nombre", "nit", "contacto", "email"],
});
