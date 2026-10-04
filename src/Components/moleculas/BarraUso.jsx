import styled from "styled-components";
import { formatearNumero } from "../../utils/conversiones";

// Barra de uso frente a un límite del plan. limite null = ilimitado.
export function BarraUso({ etiqueta, usado = 0, limite }) {
  const ilimitado = limite == null;
  const pct = ilimitado ? 8 : Math.min(100, Math.round((usado / Math.max(limite, 1)) * 100));
  const tono = ilimitado ? "primary" : pct >= 100 ? "danger" : pct >= 80 ? "warning" : "primary";

  return (
    <Container $tono={tono}>
      <div className="fila">
        <span>{etiqueta}</span>
        <strong>
          {formatearNumero(usado)}
          <small> / {ilimitado ? "ilimitado" : formatearNumero(limite)}</small>
        </strong>
      </div>
      <div
        className="pista"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={ilimitado ? undefined : limite}
        aria-valuenow={usado}
      >
        <div className={`relleno ${ilimitado ? "ilimitado" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  .fila {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 0.85rem;
    span {
      color: var(--muted, ${({ theme }) => theme.textMuted});
    }
    strong {
      font-variant-numeric: tabular-nums;
    }
    small {
      font-weight: 500;
      color: var(--muted, ${({ theme }) => theme.textMuted});
    }
  }
  .pista {
    height: 8px;
    border-radius: 999px;
    background: var(--panel, ${({ theme }) => theme.surfaceAlt});
    overflow: hidden;
  }
  .relleno {
    height: 100%;
    border-radius: inherit;
    background: ${({ theme, $tono }) => theme[$tono]};
    transition: width 0.4s ease;
    &.ilimitado {
      width: 100% !important;
      background: ${({ theme }) => theme.primary};
      opacity: 0.35;
    }
  }
`;
