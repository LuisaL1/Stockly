import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MostrarPlanes, MostrarSuscripcion, MostrarUsoPlan } from "../supabase/crudSuscripcion";

// Clave de uso -> columna de límite en la tabla "stockly_planes".
const LIMITES = {
  productos: "limite_productos",
  bodegas: "limite_bodegas",
  usuarios: "limite_usuarios",
  ventas_mes: "limite_ventas_mes",
  novandra_mes: "limite_novandra_mes",
};

// Plan actual de la empresa, uso del mes y ayudas para revisar límites.
export function usePlan() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const enabled = id != null;

  const planes = useQuery({ queryKey: ["planes"], queryFn: MostrarPlanes, staleTime: 60 * 60 * 1000 });
  const suscripcion = useQuery({ queryKey: ["suscripcion", id], queryFn: () => MostrarSuscripcion(id), enabled });
  const uso = useQuery({ queryKey: ["uso plan", id], queryFn: () => MostrarUsoPlan(id), enabled });

  const idPlan = suscripcion.data?.id_plan ?? "basico";
  const plan = planes.data?.find((p) => p.id === idPlan) ?? null;

  const limite = (clave) => (plan ? plan[LIMITES[clave]] : null);
  const usado = (clave) => Number(uso.data?.[clave] ?? 0);
  // true si ya no se puede crear otro registro de ese tipo.
  const alcanzado = (clave) => {
    const max = limite(clave);
    return max != null && usado(clave) >= max;
  };

  return {
    cargando: planes.isLoading || suscripcion.isLoading || uso.isLoading,
    error: planes.error ?? suscripcion.error ?? uso.error,
    planes: planes.data ?? [],
    suscripcion: suscripcion.data,
    plan,
    uso: uso.data ?? {},
    limite,
    usado,
    alcanzado,
    recargar: () => Promise.all([suscripcion.refetch(), uso.refetch()]),
  };
}
