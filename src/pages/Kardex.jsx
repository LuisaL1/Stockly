import { useQuery } from "@tanstack/react-query";
import { SpinnerLoader, useEmpresaStore, useMarcaStore, useUsuariosStore, BloqueoPagina, KardexTemplate, useKardexStore, useProductosStore } from "../index";

export function Kardex() {
  const {BuscarProductos, buscador: buscarproductos} = useProductosStore();
        const {datapermisos} = useUsuariosStore();
        const statePermiso = datapermisos.some((objeto) => objeto.modulos.nombre.includes("Marca de productos"))
    const { MostrarKardex, datakardex, BuscarKardex, buscador } = useKardexStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar kardex", { _id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarKardex({ _id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });

//buscar en la lista de kardex
    const { data: buscarkardexlista } = useQuery({
        queryKey: [
          "buscar kardex", 
          { _id_empresa: dataempresa?.id, buscador: buscador }
        ],
        queryFn: () => BuscarKardex({ _id_empresa: dataempresa?.id, buscador: buscador}),
        enabled: dataempresa?.id !=null,
    });

// buscamos en la lista de productos
const { data: buscardata } = useQuery({
        queryKey: [
          "buscar productos", 
          { id_empresa: dataempresa?.id, descripcion: buscarproductos }
        ],
        queryFn: () => BuscarProductos({ _id_empresa: dataempresa?.id, buscador: buscarproductos }),
        enabled: dataempresa?.id !=null,
    });
    
    if (statePermiso == false){
      return <BloqueoPagina/>;
    }
    if (isLoading){
      return <SpinnerLoader />;
    } 
    if (error) {
      return <span>Error: {error.message}</span>;
    }

    return <KardexTemplate data={datakardex} />;
}
