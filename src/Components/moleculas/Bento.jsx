import styled, { css } from "styled-components";
import { Device } from "../../styles/breackpoints";

// Rejilla bento: 12 columnas en escritorio, 6 en tablet y 1 en móvil.
export const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-flow: row dense;
  gap: 14px;
  @media ${Device.tablet} {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  @media ${Device.laptop} {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
  }
`;

// Tarjeta bento.
// variante: "superficie" (blanca), "tinta" (oscura), "acento" (lila suave), "morado" (color de marca)
// col / colTablet: columnas que ocupa en escritorio (de 12) y en tablet (de 6). fila: filas que ocupa.
export function Tarjeta({
  variante = "superficie",
  col = 12,
  colTablet,
  fila = 1,
  titulo,
  subtitulo,
  icono,
  accion,
  // eslint-disable-next-line no-unused-vars -- se acepta por compatibilidad; ya no dibuja nada
  decoracion = false,
  className,
  children,
  as,
  ...rest
}) {
  const conEncabezado = titulo || icono || accion;
  return (
    <Contenedor
      as={as}
      className={className}
      $variante={variante}
      $col={col}
      $colTablet={colTablet ?? Math.min(6, Math.max(3, Math.round(col / 2)))}
      $fila={fila}
      {...rest}
    >
      {conEncabezado && (
        <header className="tarjeta-encabezado">
          {icono && <span className="tarjeta-icono">{icono}</span>}
          <div className="tarjeta-titulos">
            {titulo && <h2>{titulo}</h2>}
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          {accion && <div className="tarjeta-accion">{accion}</div>}
        </header>
      )}
      {children}
    </Contenedor>
  );
}

const variantes = {
  superficie: css`
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.border};
    --muted: ${({ theme }) => theme.textMuted};
    --icono-bg: ${({ theme }) => theme.primarySoft};
    --icono-fg: ${({ theme }) => theme.primary};
    --linea: ${({ theme }) => theme.border};
    --panel: ${({ theme }) => theme.surfaceAlt};
  `,
  tinta: css`
    background: ${({ theme }) => theme.inkCard};
    color: ${({ theme }) => theme.inkText};
    border-color: ${({ theme }) => theme.inkBorder};
    --muted: ${({ theme }) => theme.inkMuted};
    --icono-bg: rgba(226, 164, 255, 0.14);
    --icono-fg: ${({ theme }) => theme.accentLight};
    --linea: ${({ theme }) => theme.inkBorder};
    --panel: ${({ theme }) => theme.inkPanel};
  `,
  acento: css`
    background: ${({ theme }) => (theme.name === "dark" ? "rgba(226, 164, 255, 0.08)" : theme.brandSoft)};
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => (theme.name === "dark" ? "rgba(226, 164, 255, 0.16)" : "rgba(136, 0, 179, 0.12)")};
    --muted: ${({ theme }) => theme.textMuted};
    --icono-bg: ${({ theme }) => theme.surface};
    --icono-fg: ${({ theme }) => theme.primary};
    --linea: rgba(136, 0, 179, 0.12);
    --panel: ${({ theme }) => theme.surface};
  `,
  morado: css`
    background: #8800b3;
    color: #ffffff;
    border-color: transparent;
    --muted: rgba(255, 255, 255, 0.76);
    --icono-bg: rgba(255, 255, 255, 0.16);
    --icono-fg: #ffffff;
    --linea: rgba(255, 255, 255, 0.16);
    --panel: rgba(255, 255, 255, 0.1);
  `,
};

const Contenedor = styled.section`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 20px;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.radiusXl};
  overflow: hidden;
  ${({ $variante }) => variantes[$variante] ?? variantes.superficie}
  box-shadow: ${({ $variante, theme }) => ($variante === "superficie" ? theme.shadow : "none")};

  @media ${Device.tablet} {
    grid-column: span ${({ $colTablet }) => $colTablet};
    grid-row: span ${({ $fila }) => $fila};
  }
  @media ${Device.laptop} {
    grid-column: span ${({ $col }) => $col};
    padding: 22px;
  }


  .tarjeta-encabezado {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .tarjeta-icono {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 12px;
    font-size: 19px;
    background: var(--icono-bg);
    color: var(--icono-fg);
  }
  .tarjeta-titulos {
    flex: 1;
    min-width: 0;
    h2 {
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 0.8rem;
      color: var(--muted);
    }
  }
  .tarjeta-accion {
    flex-shrink: 0;
    a {
      font-size: 0.82rem;
      font-weight: 600;
      color: inherit;
      opacity: 0.85;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }
  }
  .muted {
    color: var(--muted);
  }
`;

// Cifra grande para KPIs dentro de una tarjeta.
export const Cifra = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  .valor {
    font-size: clamp(1.5rem, 3.2vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .detalle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82rem;
    color: var(--muted);
  }
  .sube {
    color: ${({ theme }) => theme.success};
  }
  .baja {
    color: ${({ theme }) => theme.danger};
  }
`;

// Lista con separadores para usar dentro de tarjetas.
export const ListaTarjeta = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 0;
    min-width: 0;
    & + li {
      border-top: 1px solid var(--linea);
    }
  }
  .principal {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    strong,
    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    strong {
      font-weight: 600;
      font-size: 0.92rem;
    }
    span {
      font-size: 0.8rem;
      color: var(--muted);
    }
  }
  .dato {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    &.peligro {
      color: ${({ theme }) => theme.danger};
    }
  }
  .ficha {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 50%;
    font-size: 17px;
    background: var(--panel);
    color: var(--icono-fg);
    font-weight: 700;
    &.destacada {
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
    }
  }
`;
