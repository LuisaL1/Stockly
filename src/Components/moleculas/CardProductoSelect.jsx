import styled from "styled-components";

export function CardProductoSelect({ text1, text2, alerta }) {
  return (
    <Container $alerta={alerta}>
      <span className="descripcion">{text1}</span>
      <span className="stock">
        Stock actual: <strong>{text2}</strong>
      </span>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radiusSm};
  background: ${({ theme, $alerta }) => ($alerta ? theme.warningSoft : theme.successSoft)};
  .descripcion {
    font-weight: 600;
  }
  .stock {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.textMuted};
    strong {
      color: ${({ theme, $alerta }) => ($alerta ? theme.warning : theme.success)};
    }
  }
`;
