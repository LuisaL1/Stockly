import { create } from "zustand";
import { InsertarKardex, MostrarKardex, BuscarKardex, EliminarKardex, EditarKardex } from "../supabase/crudKardex";
export const useKardexStore = create ((set, get) =>({
    buscador: "",
    setBuscador: (p) =>{
        set ({buscador: p})
    },
    datakardex: [],
    kardexItemSelect: [],
    parametros: {},
    MostrarKardex: async (p) =>{
        const response = await MostrarKardex(p);
        set ({parametros:p})
        set ({datakardex:response})
        set ({kardexItemSelect: response [0]});
        return response;
    },

    selectKardex:(p) =>{
        set({kardexItemSelect : p})
    },
    InsertarKardex: async (p)=>{
        await InsertarKardex(p)
        const {MostrarKardex} =get();
        const {parametros} = get();
        set(MostrarKardex(parametros));
    },
    EliminarKardex: async (p) =>{
        await EliminarKardex(p);
        const {MostrarKardex} =get();
        const {parametros} = get();
        set(MostrarKardex(parametros));
    },
    EditarKardex: async (p) =>{
        await EditarKardex(p);
        const {MostrarKardex} =get();
        const {parametros} = get();
        set(MostrarKardex(parametros));
    },
    BuscarKardex: async (p) =>{
        const response = await BuscarKardex(p);
        set({datakardex: response});
        return response;
    },
}));