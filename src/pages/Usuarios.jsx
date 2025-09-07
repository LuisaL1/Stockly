import { useQuery } from "@tanstack/react-query";
import {
  UsuariosTemplate,
  SpinnerLoader,
  useEmpresaStore,
  useUsuariosStore,
  BloqueoPagina
} from "../index";

export function Usuarios() {
  const {
    MostrarModulos,
    MostrarUsuariosTodos,
    datausuarios,
    BuscarUsuarios,
    buscador, datapermisos
  } = useUsuariosStore();
      const statePermiso = datapermisos.some((objeto) => objeto.modulos.nombre.includes("Personal"))
  const { dataempresa } = useEmpresaStore();
  const { isLoading, error } = useQuery({
    queryKey: ["mostrar usuarios", { _id_empresa: dataempresa?.id }],
    queryFn: ()=> MostrarUsuariosTodos({ _id_empresa: dataempresa?.id }),
    enabled: dataempresa?.id != null,
  });
  const { data: buscardata } = useQuery({
    queryKey: [
      "buscar usuarios",
      { _id_empresa: dataempresa?.id, buscador: buscador },
    ],
    queryFn: () =>
      BuscarUsuarios({ _id_empresa: dataempresa?.id, buscador: buscador }),
    enabled: dataempresa?.id != null,
  });
  const { data: datamodulos } = useQuery({
    queryKey: ["mostrar modulos"],
    queryFn: MostrarModulos,
  });
    if (statePermiso == false){
      return <BloqueoPagina/>;
    }
  if (isLoading) {
    return <SpinnerLoader />;
  }
  if (error) {
    return <span>Error...</span>;
  }

  return <UsuariosTemplate data={datausuarios} />;
}

