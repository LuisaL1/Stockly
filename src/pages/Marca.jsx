import { useQuery } from "@tanstack/react-query";
import { MarcaTemplate, SpinnerLoader, useEmpresaStore, useMarcaStore, useUsuariosStore, BloqueoPagina } from "../index";

export function Marca() {
        const {datapermisos} = useUsuariosStore();
        const statePermiso = datapermisos.some((objeto) => objeto.modulos.nombre.includes("Marca de productos"))
    const { MostrarMarca, datamarca, BuscarMarca, buscador } = useMarcaStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar marca", { id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarMarca({ id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
    });
    const { data: buscardata } = useQuery({
        queryKey: [
          "buscar marca", 
          { id_empresa: dataempresa?.id, descripcion: buscador }
        ],
        queryFn: () => BuscarMarca({ id_empresa: dataempresa?.id, descripcion: buscador }),
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

    return <MarcaTemplate data={datamarca} />;
}
