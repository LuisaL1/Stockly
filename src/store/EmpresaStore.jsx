import { create } from "zustand";
import { ContarUsuariosXempresa, EditarEmpresa, MostrarEmpresa } from "../supabase/crudEmpresa";

export const useEmpresaStore = create((set, get) => ({
  dataempresa: null,
  contadorusuarios: 0,
  MostrarEmpresa: async (p) => {
    const empresa = await MostrarEmpresa(p);
    set({ dataempresa: empresa });
    return empresa;
  },
  EditarEmpresa: async (p) => {
    const guardado = await EditarEmpresa(p);
    if (guardado) set({ dataempresa: { ...get().dataempresa, ...guardado } });
    return !!guardado;
  },
  ContarUsuariosXempresa: async (p) => {
    const total = await ContarUsuariosXempresa(p);
    set({ contadorusuarios: total });
    return total;
  },
}));
