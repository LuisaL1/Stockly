import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ItemNotificacion } from "../moleculas/ItemNotificacion";
import { EstadoVacio } from "../moleculas/EstadoVacio";
import { useNotificaciones } from "../../hooks/useNotificaciones";
import { MarcarLeidas } from "../../supabase/crudNotificaciones";
import { v } from "../../styles/variables";

// Campana con contador y panel desplegable de las últimas notificaciones.
export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();
  const { lista, noLeidas, clave } = useNotificaciones();

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    const esc = (e) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const marcar = async (ids) => {
    if (await MarcarLeidas(ids)) {
      queryClient.setQueryData(clave, (previas = []) =>
        previas.map((n) => (ids.includes(n.id) ? { ...n, leida: true } : n))
      );
    }
  };

  return (
    <Container ref={ref}>
      <button
        type="button"
        className="campana"
        onClick={() => setAbierto(!abierto)}
        aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
        aria-expanded={abierto}
      >
        <v.icononotificaciones />
        {noLeidas > 0 && <span className="contador">{noLeidas > 9 ? "9+" : noLeidas}</span>}
      </button>

      {abierto && (
        <div className="panel" role="dialog" aria-label="Notificaciones">
          <header>
            <h2>Notificaciones</h2>
            {noLeidas > 0 && (
              <button type="button" onClick={() => marcar(lista.filter((n) => !n.leida).map((n) => n.id))}>
                Marcar todas como leídas
              </button>
            )}
          </header>
          {lista.length ? (
            <ul>
              {lista.slice(0, 8).map((n) => (
                <ItemNotificacion
                  key={n.id}
                  notificacion={n}
                  onAbrir={(item) => {
                    if (!item.leida) marcar([item.id]);
                    setAbierto(false);
                  }}
                />
              ))}
            </ul>
          ) : (
            <EstadoVacio titulo="Todo al día" mensaje="Aquí verás ventas, alertas de stock y avisos de Novandra." />
          )}
          <footer>
            <Link to="/notificaciones" onClick={() => setAbierto(false)}>
              Ver todas
            </Link>
          </footer>
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  .campana {
    position: relative;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-size: 19px;
    cursor: pointer;
    &:hover {
      border-color: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.primary};
    }
  }
  .contador {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 19px;
    height: 19px;
    padding: 0 5px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 2px solid ${({ theme }) => theme.bg};
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 0.66rem;
    font-weight: 700;
  }
  .panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 200;
    width: min(400px, calc(100vw - 24px));
    max-height: min(560px, calc(100vh - 100px));
    display: flex;
    flex-direction: column;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusXl};
    box-shadow: ${({ theme }) => theme.shadowLg};
    animation: bajar 0.15s ease-out;
    @keyframes bajar {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 16px 18px 8px;
      h2 {
        font-size: 1.05rem;
      }
      button {
        border: none;
        background: none;
        color: ${({ theme }) => theme.primary};
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }
    }
    ul {
      padding: 4px 8px;
      overflow-y: auto;
    }
    footer {
      padding: 10px 18px 14px;
      border-top: 1px solid ${({ theme }) => theme.border};
      text-align: center;
      a {
        font-size: 0.85rem;
        font-weight: 600;
        color: ${({ theme }) => theme.primary};
        text-decoration: none;
      }
    }
  }
`;
