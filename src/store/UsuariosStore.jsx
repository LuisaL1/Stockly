import { create } from "zustand";
import { manejarError } from "../supabase/manejarError";
import { notificarExito } from "../utils/notificaciones";
import {
  BuscarUsuarios,
  EditarUsuarios,
  EliminarPermisos,
  EliminarUsuarios,
  InsertarPermisos,
  InvitarUsuario,
  MostrarModulos,
  MostrarPermisos,
  MostrarUsuarios,
  AsignarSede,
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

  // Invita a la persona con su correo real: recibe un correo para verificar su cuenta y crear
  // su contraseña. El servidor la registra en la empresa con su rol y sus permisos.
  Insertar: async (p, modulos) => {
    try {
      await InvitarUsuario({
        id_empresa: p.id_empresa,
        email: p.email,
        nombres: p.nombres,
        nro_docum: p.nro_docum,
        telefono: p.telefono,
        direccion: p.direccion,
        tipouser: p.tipouser,
        id_sucursal: p.id_sucursal ?? null,
        modulos: modulos.filter((m) => m.check).map((m) => m.id),
      });
    } catch (e) {
      manejarError(e, "No se pudo enviar la invitación");
      return false;
    }
    notificarExito(`Invitación enviada a ${p.email}`);
    await get().recargar();
    return true;
  },

  Editar: async ({ id_sucursal, id_empresa, ...p }, modulos) => {
    const ok = await EditarUsuarios(p);
    if (!ok) return false;
    if (id_empresa) await AsignarSede({ idEmpresa: id_empresa, idUsuario: p.id, idSucursal: id_sucursal ?? null });
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
