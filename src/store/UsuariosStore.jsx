import { create } from "zustand";
import { supabaseRegistro } from "../supabase/supabase.config";
import { manejarError } from "../supabase/manejarError";
import { notificarExito } from "../utils/notificaciones";
import {
  BuscarUsuarios,
  EditarUsuarios,
  EliminarPermisos,
  EliminarUsuarios,
  InsertarAsignaciones,
  InsertarPermisos,
  InsertarUsuarios,
  MostrarModulos,
  MostrarPermisos,
  MostrarUsuarios,
  MostrarUsuariosTodos,
} from "../supabase/crudUsuarios";

const permisosSeleccionados = (idUsuario, modulos) =>
  modulos.filter((m) => m.check).map((m) => ({ id_usuario: idUsuario, idmodulo: m.id }));

export const useUsuariosStore = create((set, get) => ({
  // --- Usuario en sesión ---
  idusuario: 0,
  datausuario: null,
  datapermisos: [],
  permisosCargados: false,

  MostrarUsuarios: async () => {
    const usuario = await MostrarUsuarios();
    set({ idusuario: usuario?.id ?? 0, datausuario: usuario });
    return usuario;
  },

  // El usuario en sesión actualiza sus propios datos (no puede cambiar su rol).
  EditarPerfil: async (cambios) => {
    const { datausuario } = get();
    const ok = await EditarUsuarios({ id: datausuario.id, ...cambios });
    if (ok) set({ datausuario: { ...datausuario, ...cambios } });
    return ok;
  },

  MostrarPermisos: async (p) => {
    try {
      const permisos = await MostrarPermisos(p);
      set({ datapermisos: permisos, permisosCargados: true });
      return permisos;
    } catch (error) {
      // Sin permisos legibles se bloquean los módulos en lugar de quedar cargando.
      set({ datapermisos: [], permisosCargados: true });
      throw error;
    }
  },

  // --- Personal de la empresa ---
  data: [],
  buscador: "",
  idEmpresa: null,
  datamodulos: [],
  setBuscador: (texto) => set({ buscador: texto }),

  Cargar: async (idEmpresa, texto = "") => {
    const data = texto
      ? await BuscarUsuarios({ _id_empresa: idEmpresa, buscador: texto })
      : await MostrarUsuariosTodos({ _id_empresa: idEmpresa });
    set({ data, idEmpresa });
    return data;
  },
  recargar: async () => {
    const { idEmpresa, buscador, Cargar } = get();
    if (idEmpresa != null) await Cargar(idEmpresa, buscador);
  },

  MostrarModulos: async () => {
    const modulos = await MostrarModulos();
    set({ datamodulos: modulos });
    return modulos;
  },

  MostrarPermisosEdit: (p) => MostrarPermisos(p),

  // Crea la cuenta de acceso, el registro en Usuarios, la asignación a la
  // empresa y los permisos. Usa un cliente sin sesión para no cerrar la del admin.
  Insertar: async ({ email, pass }, p, modulos) => {
    const { data, error } = await supabaseRegistro.auth.signUp({ email, password: pass });
    if (manejarError(error, "No se pudo crear el acceso del usuario")) return false;

    const nuevo = await InsertarUsuarios({
      nombres: p.nombres,
      email: p.email,
      nro_docum: p.nro_docum,
      telefono: p.telefono,
      direccion: p.direccion,
      fecharegistro: new Date(),
      estado: "activo",
      idauth: data.user.id,
      tipouser: p.tipouser,
    });
    if (!nuevo) return false;

    await InsertarAsignaciones({ id_empresa: p.id_empresa, id_usuario: nuevo.id });
    const permisos = permisosSeleccionados(nuevo.id, modulos);
    if (permisos.length) await InsertarPermisos(permisos);

    notificarExito("Usuario registrado");
    await get().recargar();
    return true;
  },

  Editar: async (p, modulos) => {
    const ok = await EditarUsuarios(p);
    if (!ok) return false;
    await EliminarPermisos({ id_usuario: p.id });
    const permisos = permisosSeleccionados(p.id, modulos);
    if (permisos.length) await InsertarPermisos(permisos);
    await get().recargar();
    return true;
  },

  Eliminar: async (p) => {
    const ok = await EliminarUsuarios(p);
    if (ok) await get().recargar();
    return ok;
  },
}));
