import { useQuery } from "@tanstack/react-query";
import { BloqueoPagina, SpinnerLoader, useCategoriasStore, useEmpresaStore, useMarcaStore, useProductosStore, useUsuariosStore } from "../index";
import { ProductosTemplate } from "../Components/templatesReact/ProductosTemplate";

export function Productos() {
    const {datapermisos} = useUsuariosStore();
    const statePermiso = datapermisos.some((objeto) => objeto.modulos.nombre.includes("Productos"))
    const {MostrarMarca} = useMarcaStore();
    const {MostrarCategorias} = useCategoriasStore();
    const { MostrarProductos, dataproductos, BuscarProductos, buscador } = useProductosStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar productos", { _id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarProductos({ _id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    const { data: buscardata } = useQuery({
        queryKey: [
          "buscar productos", 
          { id_empresa: dataempresa?.id, descripcion: buscador }
        ],
        queryFn: () => BuscarProductos({ _id_empresa: dataempresa?.id, buscador: buscador }),
        enabled: dataempresa?.id !=null,
    });
      const { data:datamarca } = useQuery({
  queryKey: ["mostrar marca", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarMarca({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    const { data:datacategorias } = useQuery({
  queryKey: ["mostrar categorias", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarCategorias({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    if (statePermiso == false){
      return <SpinnerLoader/>;
    }
    if (isLoading){
      return <SpinnerLoader />;
    } 
    if (error) {
      return <span>Error: {error.message}</span>;
    }

    return <ProductosTemplate data={dataproductos} />;
}
