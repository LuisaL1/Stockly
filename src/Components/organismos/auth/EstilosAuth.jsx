import styled from "styled-components";

// Piezas visuales compartidas por las vistas de acceso.
export const Encabezado = styled.header`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 24px;
  .icono {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin-bottom: 8px;
    border-radius: 16px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 24px;
  }
  h1 {
    font-size: clamp(1.5rem, 3vw, 1.9rem);
    letter-spacing: -0.03em;
    line-height: 1.15;
  }
  p {
    color: ${({ theme }) => theme.textMuted};
    strong {
      color: ${({ theme }) => theme.text};
    }
  }
`;

export const Alerta = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  margin-bottom: 18px;
  border-radius: ${({ theme }) => theme.radius};
  font-size: 0.88rem;
  line-height: 1.4;
  background: ${({ theme, $tipo }) => ($tipo === "exito" ? theme.successSoft : theme.dangerSoft)};
  color: ${({ theme, $tipo }) => ($tipo === "exito" ? theme.success : theme.danger)};
  svg {
    flex-shrink: 0;
    font-size: 18px;
    margin-top: 1px;
  }
`;

export const FormAuth = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  .fila-extra {
    display: flex;
    justify-content: flex-end;
    margin-top: -6px;
  }
  .doble {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    @media (min-width: 520px) {
      grid-template-columns: 1fr 1fr;
    }
  }
`;

export const Enlace = styled.button`
  border: none;
  background: none;
  padding: 0;
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

export const Separador = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.8rem;
  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.border};
  }
`;

export const PieAuth = styled.p`
  margin-top: 22px;
  text-align: center;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.textMuted};
`;
