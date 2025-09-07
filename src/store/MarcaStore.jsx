import { create } from "zustand";
import { BuscarMarca, EditarMarca, EliminarMarca, InsertarMarca, MostrarMarca } from "../supabase/crudMarca";
export const useMarcaStore = create ((set, get) =>({
    buscador: "",
    setBuscador: (p) =>{
        set ({buscador: p})
    },
    datamarca: [],
    marcaItemSelect: [],
    parametros: {},
    MostrarMarca: async (p) =>{
        const response = await MostrarMarca(p);
        set ({parametros:p})
        set ({datamarca:response})
        set ({marcaItemSelect: response [0]});
        return response;
    },

    selectMarca:(p) =>{
        set({marcaItemSelect : p})
    },
    insertarMarca: async (p)=>{
        await InsertarMarca(p)
        const {MostrarMarca} =get();
        const {parametros} = get();
        set(MostrarMarca(parametros));
    },
    EliminarMarca: async (p) =>{
        await EliminarMarca(p);
        const {MostrarMarca} =get();
        const {parametros} = get();
        set(MostrarMarca(parametros));
    },
    EditarMarca: async (p) =>{
        await EditarMarca(p);
        const {MostrarMarca} =get();
        const {parametros} = get();
        set(MostrarMarca(parametros));
    },
    BuscarMarca: async (p) =>{
        const response = await BuscarMarca(p);
        set({datamarca: response});
        return response;
    },
}));