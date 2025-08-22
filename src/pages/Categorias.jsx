import { useQuery } from "@tanstack/react-query";
import { CategoriaTemplate, SpinnerLoader, useEmpresaStore, useCategoriasStore } from "../index";

export function Categorias() {
    const { MostrarCategorias, datacategorias, BuscarCategorias, buscador } = useCategoriasStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar categorias", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarCategorias({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    const { data: buscardata } = useQuery({
        queryKey: [
          "buscar categorias", 
          { id_empresa: dataempresa?.id, descripcion: buscador }
        ],
        queryFn: () => BuscarCategorias({ id_empresa: dataempresa?.id, descripcion: buscador }),
        enabled: dataempresa?.id !=null,
    });
    if (isLoading){
      return <SpinnerLoader />;
    } 
    if (error) {
      return <span>Error: {error.message}</span>;
    }

    return <CategoriaTemplate data={datacategorias} />;
}