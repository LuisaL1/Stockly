import styled from "styled-components";
import { Link } from "react-router-dom";
import { CampanaNotificaciones } from "./CampanaNotificaciones";
import { useNovandraStore } from "../../store/NovandraStore";
import { v } from "../../styles/variables";

const fechaHoy = () =>
  new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

// Barra superior de escritorio: fecha, acceso a Novandra, venta rápida y notificaciones.
export function BarraSuperior() {
  const abrirNovandra = useNovandraStore((s) => s.abrir);

  return (
    <Container>
      <span className="fecha">{fechaHoy()}</span>
      <button type="button" className="preguntar" onClick={() => abrirNovandra()}>
        <v.icononovandra />
        <span>Pregúntale a Novandra…</span>
        <kbd>IA</kbd>
      </button>
      <div className="acciones">
        <Link to="/ventas" className="vender">
          <v.agregar /> Nueva venta
        </Link>
        <CampanaNotificaciones />
      </div>
    </Container>
  );
}

const Container = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  .fecha {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 500;
    color: ${({ theme }) => theme.textMuted};
    text-transform: capitalize;
  }
  .preguntar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: min(380px, 40vw);
    height: 42px;
    padding: 0 8px 0 14px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
    text-align: left;
    > svg {
      color: ${({ theme }) => theme.primary};
      font-size: 17px;
    }
    span {
      flex: 1;
    }
    kbd {
      font: inherit;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      background: ${({ theme }) => theme.primarySoft};
      color: ${({ theme }) => theme.primary};
    }
    &:hover {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .acciones {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .vender {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 42px;
    padding: 0 18px;
    border-radius: 999px;
    background: ${({ theme }) => theme.ink};
    color: ${({ theme }) => theme.inkText};
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    &:hover {
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
    }
  }
`;
