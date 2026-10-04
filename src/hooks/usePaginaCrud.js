import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";

// Carga la lista de una entidad para la empresa activa, respetando el buscador.
export function usePaginaCrud(clave, useStore) {
  const { dataempresa } = useEmpresaStore();
  const { Cargar, buscador, data } = useStore();
  const idEmpresa = dataempresa?.id;

  const query = useQuery({
    queryKey: [clave, idEmpresa, buscador],
    queryFn: () => Cargar(idEmpresa, buscador),
    enabled: idEmpresa != null,
    placeholderData: (previo) => previo,
  });

  return { ...query, data, idEmpresa };
}
