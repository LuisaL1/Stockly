import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { UnidadesEmpresa } from "../supabase/crudUnidades";
import { PRESENTACIONES, UNIDADES } from "../utils/unidades";

// Unidades que la empresa usa en su inventario y la predeterminada para productos nuevos.
export function useUnidades() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const q = useQuery({ queryKey: ["unidades empresa", id], queryFn: () => UnidadesEmpresa(id), enabled: id != null, staleTime: 5 * 60 * 1000 });
  const activas = q.data?.activas?.length ? q.data.activas : UNIDADES.slice(0, 1);
  return {
    cargando: q.isLoading,
    activas: activas.map((u) => ({ ...u, descripcion: `${u.nombre} (${u.abrev})` })),
    predeterminada: q.data?.predeterminada ?? "und",
    presentaciones: PRESENTACIONES.map((p) => ({ ...p, descripcion: p.nombre })),
    personalizadas: q.data?.personalizadas ?? false,
    recargar: q.refetch,
  };
}
