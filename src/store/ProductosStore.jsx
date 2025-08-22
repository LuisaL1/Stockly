import { create } from "zustand";
import { BuscarProductos, EditarProductos, EliminarProductos, InsertarProductos, MostrarProductos } from "../supabase/crudProductos";
export const useProductosStore = create ((set, get) =>({
    buscador: "",
    setBuscador: (p) =>{
        set ({buscador: p})
    },
    dataproductos: [],
    productosItemSelect: [],
    parametros: {},
    MostrarProductos: async (p) =>{
        const response = await MostrarProductos(p);
        set ({parametros:p})
        set ({dataproductos:response})
        set ({productosItemSelect: response [0]});
        return response;
    },

    selectProductos:(p) =>{
        set({productosItemSelect})
    },
    insertarProductos: async (p)=>{
        await InsertarProductos(p)
        const {MostrarProductos} =get();
        const {parametros} = get();
        set(MostrarProductos(parametros));
    },
    EliminarProductos: async (p) =>{
        await EliminarProductos(p);
        const {MostrarProductos} =get();
        const {parametros} = get();
        set(MostrarProductos(parametros));
    },
    EditarProductos: async (p) =>{
        await EditarProductos(p);
        const {MostrarProductos} =get();
        const {parametros} = get();
        set(MostrarProductos(parametros));
    },
    BuscarProductos: async (p) =>{
        const response = await BuscarProductos(p);
        set({dataproductos: response});
        return response;
    },
}));