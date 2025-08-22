import { create } from "zustand";
import { EditarCategorias,  
    MostrarCategorias, 
    InsertarCategorias, 
    EliminarCategoria, 
    BuscarCategorias} from "../supabase/crudCategorias";
export const useCategoriasStore = create ((set, get) =>({
    buscador: "",
    setBuscador: (p) =>{
        set ({buscador: p})
    },
    datacategorias: [],
    categoriasItemSelect: [],
    parametros: {},
    MostrarCategorias: async (p) =>{
        const response = await MostrarCategorias(p);
        set ({parametros:p})
        set ({datacategorias:response})
        set ({categoriasItemSelect: response [0]});
        return response;
    },

    selectMarca:(p) =>{
        set({categoriasItemSelect})
    },
    InsertarCategorias: async (p)=>{
        await InsertarCategorias(p)
        const {MostrarCategorias} =get();
        const {parametros} = get();
        set(MostrarCategorias(parametros));
    },
    EliminarCategoria: async (p) =>{
        await EliminarCategoria(p);
        const {MostrarCategorias} =get();
        const {parametros} = get();
        set(MostrarCategorias(parametros));
    },
    EditarCategorias: async (p) =>{
        await EditarCategorias(p);
        const {MostrarCategorias} =get();
        const {parametros} = get();
        set(MostrarCategorias(parametros));
    },
    BuscarCategorias: async (p) =>{
        const response = await BuscarCategorias(p);
        set({datacategorias: response});
        return response;
    },
}));