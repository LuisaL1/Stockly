import styled, { css } from "styled-components";

export function Boton({
  children,
  titulo,
  icono,
  variante = "primario",
  tamano = "md",
  type = "button",
  cargando = false,
  disabled,
  funcion,
  onClick,
  bloque = false,
  ...rest
}) {
  return (
    <Container
      type={type}
      $variante={variante}
      $tamano={tamano}
      $bloque={bloque}
      disabled={disabled || cargando}
      onClick={onClick ?? funcion}
      {...rest}
    >
      {cargando ? <span className="spinner" aria-hidden /> : icono}
      {(children ?? titulo) && <span>{children ?? titulo}</span>}
    </Container>
  );
}

const variantes = {
  primario: css`
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.primaryHover};
    }
  `,
  secundario: css`
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.border};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  `,
  fantasma: css`
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.text};
    }
  `,
  exito: css`
    background: ${({ theme }) => theme.successSoft};
    color: ${({ theme }) => theme.success};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.success};
      color: #fff;
    }
  `,
  peligro: css`
    background: ${({ theme }) => theme.dangerSoft};
    color: ${({ theme }) => theme.danger};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.danger};
      color: #fff;
    }
  `,
};

const tamanos = {
  sm: css`
    height: 34px;
    padding: 0 12px;
    font-size: 0.85rem;
  `,
  md: css`
    height: 42px;
    padding: 0 18px;
    font-size: 0.95rem;
  `,
  lg: css`
    height: 48px;
    padding: 0 22px;
    font-size: 1rem;
  `,
};

const Container = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radiusSm};
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, transform 0.05s;
  width: ${({ $bloque }) => ($bloque ? "100%" : "auto")};
  ${({ $variante }) => variantes[$variante] ?? variantes.primario}
  ${({ $tamano }) => tamanos[$tamano] ?? tamanos.md}

  svg {
    font-size: 1.15em;
    flex-shrink: 0;
  }
  &:active:not(:disabled) {
    filter: brightness(0.94);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .spinner {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: girar 0.7s linear infinite;
  }
  @keyframes girar {
    to {
      transform: rotate(360deg);
    }
  }
`;
