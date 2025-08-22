import { create } from "zustand";
import { supabase } from "../supabase/supabase.config";
import { ContarUsuariosXempresa, MostrarEmpresa } from "../supabase/crudEmpresa";

export const useEmpresaStore = create((set, get) => ({
  contadorusuarios: 0,
  dataempresa: null, 
  MostrarEmpresa: async (p) => {
    const empresa = await MostrarEmpresa(p); 
    set({ dataempresa: empresa });
    return empresa;
  },
  ContarUsuariosXempresa: async (p) => {
    const response = await ContarUsuariosXempresa(p);
    set({ contadorusuarios: response ?? 0 });
    return response ?? 0;
  }
}));