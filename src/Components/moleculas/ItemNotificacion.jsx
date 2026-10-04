import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";
import { tiempoRelativo } from "../../utils/conversiones";

const TIPOS = {
  venta: { icono: v.iconoventas, tono: "primary" },
  stock_bajo: { icono: v.iconostockminimo, tono: "warning" },
  compra: { icono: v.iconocompras, tono: "info" },
  novandra: { icono: v.icononovandra, tono: "primary" },
  plan: { icono: v.iconoplan, tono: "primary" },
  sistema: { icono: v.icononotificaciones, tono: "info" },
};

// Fila de notificación usada en la campana y en la página de notificaciones.
export function ItemNotificacion({ notificacion: n, onAbrir, accion }) {
  const tipo = TIPOS[n.tipo] ?? TIPOS.sistema;
  const Icono = tipo.icono;
  const contenido = (
    <>
      <span className="icono">
        <Icono />
      </span>
      <span className="texto">
        <strong>{n.titulo}</strong>
        {n.mensaje && <span>{n.mensaje}</span>}
        <small>{tiempoRelativo(n.created_at)}</small>
      </span>
      {!n.leida && <span className="punto" aria-label="Sin leer" />}
    </>
  );

  return (
    <Container $tono={tipo.tono} $leida={n.leida}>
      {n.enlace ? (
        <Link to={n.enlace} className="cuerpo" onClick={() => onAbrir?.(n)}>
          {contenido}
        </Link>
      ) : (
        <div className="cuerpo" onClick={() => onAbrir?.(n)}>
          {contenido}
        </div>
      )}
      {accion}
    </Container>
  );
}

const Container = styled.li`
  display: flex;
  align-items: center;
  gap: 4px;
  list-style: none;
  .cuerpo {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px;
    border-radius: ${({ theme }) => theme.radius};
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  }
  .icono {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    font-size: 18px;
    color: ${({ theme, $tono }) => theme[$tono]};
    background: ${({ theme, $tono }) => theme[`${$tono}Soft`]};
  }
  .texto {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    strong {
      font-size: 0.9rem;
      font-weight: ${({ $leida }) => ($leida ? 500 : 650)};
    }
    span {
      font-size: 0.82rem;
      color: ${({ theme }) => theme.textMuted};
    }
    small {
      font-size: 0.72rem;
      color: ${({ theme }) => theme.textMuted};
      opacity: 0.8;
      margin-top: 2px;
    }
  }
  .punto {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${({ theme }) => theme.primary};
  }
`;
