import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MostrarNotificaciones, SuscribirNotificaciones } from "../supabase/crudNotificaciones";

// Notificaciones de la empresa con actualización en tiempo real
// (y una consulta cada minuto por si el tiempo real no está habilitado).
export function useNotificaciones() {
  const { dataempresa } = useEmpresaStore();
  const id = dataempresa?.id;
  const queryClient = useQueryClient();
  const clave = ["notificaciones", id];

  const query = useQuery({
    queryKey: clave,
    queryFn: () => MostrarNotificaciones(id),
    enabled: id != null,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (id == null) return;
    return SuscribirNotificaciones(id, (nueva) => {
      queryClient.setQueryData(["notificaciones", id], (previas = []) =>
        previas.some((n) => n.id === nueva.id) ? previas : [nueva, ...previas]
      );
      // Una venta o una recepción cambia los indicadores del inicio.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
  }, [id, queryClient]);

  const lista = query.data ?? [];
  return { ...query, lista, noLeidas: lista.filter((n) => !n.leida).length, clave };
}
