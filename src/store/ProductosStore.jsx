import { create } from "zustand";
import { BuscarProductos, EditarProductos, EliminarProductos, InsertarProductos, MostrarProductos, ReportStockXProducto, ReportStockBajoMinimo, ReportKardexEntradaSalida, ReportInventarioValorado, ReportStockProductosTodos} from "../supabase/crudProductos";
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
        console.log("response productos ===>", response);
        set ({parametros:p})
        set ({dataproductos:response})
        set ({productosItemSelect: response [0]});
        return response;
    },

    selectProductos:(p) =>{
        set({productosItemSelect : p})
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
ReportStockProductosTodos: async (p) =>{
  const response = await ReportStockProductosTodos(p);
  return response;
},
ReportStockXProducto: async (p) =>{
  const response = await ReportStockXProducto(p);
  return response;
},
ReportStockBajoMinimo: async (p) =>{
  const response = await ReportStockBajoMinimo(p);
  return response;
},
ReportKardexEntradaSalida: async (p) =>{
  const response = await ReportKardexEntradaSalida(p);
  return response;
},
ReportInventarioValorado: async (p) =>{
  const response = await ReportInventarioValorado(p);
  return response;
}
}));