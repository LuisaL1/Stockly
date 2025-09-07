import { useQuery } from "@tanstack/react-query";
import { SpinnerLoader, useEmpresaStore, useUsuariosStore, BloqueoPagina, ReportesTemplate, useKardexStore } from "../index";

export function Reportes() {
        const {datapermisos} = useUsuariosStore();
        const statePermiso = datapermisos.some((objeto) => objeto.modulos.nombre.includes("Marca de productos"))
    const { MostrarKardex } = useKardexStore();
    const { dataempresa } = useEmpresaStore();

  const { isLoading, error } = useQuery({
  queryKey: ["mostrar kardex", { _id_empresa: dataempresa?.id}],
  queryFn: () =>  MostrarKardex({ _id_empresa: dataempresa?.id }),
  enabled: dataempresa?.id != null,
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

    return <ReportesTemplate/>;
}
