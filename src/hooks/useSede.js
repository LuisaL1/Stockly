import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { supabase } from "../supabase/supabase.config";

// Sede a la que está acotado el usuario en sesión (null = ve toda la empresa).
export function useSede() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const q = useQuery({
    queryKey: ["mi sede", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("stockly_mi_sede", { _id_empresa: id });
      if (error) throw error;
      return data ?? null;
    },
    enabled: id != null,
    staleTime: 5 * 60 * 1000,
  });
  return { sede: q.data ?? null, acotado: !!q.data, cargando: q.isLoading };
}
