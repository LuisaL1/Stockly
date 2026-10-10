import { useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { ItemNotificacion } from "../Components/moleculas/ItemNotificacion";
import { AccionTabla } from "../Components/atomos/AccionTabla";
import { Boton } from "../Components/atomos/Boton";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { EliminarNotificacion, MarcarLeidas } from "../supabase/crudNotificaciones";
import { v } from "../styles/variables";

const FILTROS = [
  { id: "todas", texto: "Todas" },
  { id: "sin_leer", texto: "Sin leer" },
  { id: "venta", texto: "Ventas" },
  { id: "stock_bajo", texto: "Stock" },
  { id: "compra", texto: "Compras" },
  { id: "novandra", texto: "Novandra" },
];

export function Notificaciones() {
  const queryClient = useQueryClient();
  const { lista, noLeidas, clave, isLoading, error, refetch } = useNotificaciones();
  const [filtro, setFiltro] = useState("todas");

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  const visibles = lista.filter((n) =>
    filtro === "todas" ? true : filtro === "sin_leer" ? !n.leida : n.tipo === filtro
  );

  const marcar = async (ids) => {
    if (await MarcarLeidas(ids)) {
      queryClient.setQueryData(clave, (previas = []) => previas.map((n) => (ids.includes(n.id) ? { ...n, leida: true } : n)));
    }
  };
  const eliminar = async (id) => {
    if (await EliminarNotificacion(id)) {
      queryClient.setQueryData(clave, (previas = []) => previas.filter((n) => n.id !== id));
    }
  };

  return (
    <PaginaTemplate
      titulo="Notificaciones"
      descripcion="Ventas, alertas de stock, compras y sugerencias de Novandra. Todo lo que pasa."
      acciones={
        noLeidas > 0 && (
          <Boton variante="secundario" icono={<v.iconolisto />} funcion={() => marcar(lista.filter((n) => !n.leida).map((n) => n.id))}>
            Marcar todas como leídas
          </Boton>
        )
      }
    >
      <Filtros role="tablist">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.texto}
            {f.id === "sin_leer" && noLeidas > 0 && <span>{noLeidas}</span>}
          </button>
        ))}
      </Filtros>
      <Lista>
        {visibles.length ? (
          <ul>
            {visibles.map((n) => (
              <ItemNotificacion
                key={n.id}
                notificacion={n}
                onAbrir={(item) => !item.leida && marcar([item.id])}
                accion={<AccionTabla etiqueta="Eliminar" tono="peligro" icono={<v.iconeliminarTabla />} funcion={() => eliminar(n.id)} />}
              />
            ))}
          </ul>
        ) : (
          <EstadoVacio titulo="Nada por aquí" mensaje="No hay notificaciones con este filtro." icono={<v.icononotificaciones />} />
        )}
      </Lista>
    </PaginaTemplate>
  );
}

const Filtros = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    span {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
      font-size: 0.7rem;
    }
    &[aria-selected="true"] {
      background: ${({ theme }) => theme.ink};
      border-color: ${({ theme }) => theme.ink};
      color: ${({ theme }) => theme.inkText};
    }
  }
`;

const Lista = styled.div`
  padding: 8px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  ul {
    display: flex;
    flex-direction: column;
  }
`;
