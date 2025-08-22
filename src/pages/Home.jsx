import { useQuery } from "@tanstack/react-query";
import {HomeTemplate, useEmpresaStore} from "../index";
export function Home() {
  const { ContarUsuariosXempresa, dataempresa } = useEmpresaStore();
  const empresaId = dataempresa?.id;

  const { data } = useQuery({
    queryKey: ["contar usuarios por empresa", { idempresa: empresaId }],
    queryFn: () => ContarUsuariosXempresa({ _id_empresa: empresaId }),
    enabled: !!empresaId, 
  });

  return (<HomeTemplate />);
}
