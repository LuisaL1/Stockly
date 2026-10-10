import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { AjustesGlobales, EstadoSuscripcion, MostrarPlanes, MostrarSuscripcion, MostrarUsoPlan, PlanEfectivo } from "../supabase/crudSuscripcion";

// Clave de uso -> columna de límite en la tabla "stockly_planes".
const LIMITES = {
  productos: "limite_productos",
  bodegas: "limite_bodegas",
  sucursales: "limite_sucursales",
  usuarios: "limite_usuarios",
  clientes: "limite_clientes",
  proveedores: "limite_proveedores",
  archivos_mb: "limite_archivos_mb",
  informes_mes: "limite_informes_mes",
  ventas_mes: "limite_ventas_mes",
  novandra_mes: "limite_novandra_mes",
  vinculos: "limite_vinculos",
};

// Plan que rige hoy (pagado, mes de prueba o Básico), uso del mes y ayudas para revisar límites.
export function usePlan() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const enabled = id != null;

  const planes = useQuery({ queryKey: ["planes"], queryFn: MostrarPlanes, staleTime: 60 * 60 * 1000 });
  const suscripcion = useQuery({ queryKey: ["suscripcion", id], queryFn: () => MostrarSuscripcion(id), enabled });
  const estado = useQuery({ queryKey: ["estado suscripcion", id], queryFn: () => EstadoSuscripcion(id), enabled });
  const uso = useQuery({ queryKey: ["uso plan", id], queryFn: () => MostrarUsoPlan(id), enabled });
  // Límites que rigen hoy, con los complementos comprados sumados.
  const efectivo = useQuery({ queryKey: ["plan efectivo", id], queryFn: () => PlanEfectivo(id), enabled });
  const ajustes = useQuery({ queryKey: ["ajustes globales"], queryFn: AjustesGlobales, staleTime: 10 * 60 * 1000 });

  // Sin la migración de lanzamiento se usa el plan guardado, como antes.
  const idPlan = estado.data?.plan_efectivo ?? suscripcion.data?.id_plan ?? "basico";
  let plan = planes.data?.find((p) => p.id === idPlan) ?? null;
  if (plan && efectivo.data?.id === plan.id) plan = { ...plan, ...efectivo.data };
  else if (plan && estado.data?.en_prueba) plan = { ...plan, nombre: estado.data.plan_nombre ?? plan.nombre, limite_novandra_mes: 20 };

  const limite = (clave) => (plan ? plan[LIMITES[clave]] : null);
  const usado = (clave) => Number(uso.data?.[clave] ?? 0);
  // true si ya no se puede crear otro registro de ese tipo.
  const alcanzado = (clave) => {
    const max = limite(clave);
    return max != null && usado(clave) >= max;
  };

  return {
    cargando: planes.isLoading || suscripcion.isLoading || uso.isLoading || estado.isLoading,
    error: planes.error ?? suscripcion.error ?? uso.error,
    planes: planes.data ?? [],
    suscripcion: suscripcion.data,
    estado: estado.data,
    ajustes: ajustes.data ?? {},
    plan,
    uso: uso.data ?? {},
    limite,
    usado,
    alcanzado,
    recargar: () => Promise.all([suscripcion.refetch(), uso.refetch(), estado.refetch(), efectivo.refetch()]),
  };
}
