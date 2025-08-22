import { useQuery } from "@tanstack/react-query";
import { SpinnerLoader, useEmpresaStore, useMarcaStore, useProductosStore } from "../index";
import { ProductosTemplate } from "../Components/templatesReact/ProductosTemplate";
import { MostrarMarca } from "../supabase/crudMarca";

export function Productos() {
    const {MostrarMarca} = useMarcaStore()
    const { MostrarProductos, dataproductos, BuscarProductos, buscador } = useProductosStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar productos", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarProductos({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    const { data: buscardata } = useQuery({
        queryKey: [
          "buscar productos", 
          { id_empresa: dataempresa?.id, descripcion: buscador }
        ],
        queryFn: () => BuscarProductos({ id_empresa: dataempresa?.id, descripcion: buscador }),
        enabled: dataempresa?.id !=null,
    });
      const { data:datamarca } = useQuery({
  queryKey: ["mostrar marca", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarMarca({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    if (isLoading){
      return <SpinnerLoader />;
    } 
    if (error) {
      return <span>Error: {error.message}</span>;
    }

    return <ProductosTemplate data={dataproductos} />;
}
