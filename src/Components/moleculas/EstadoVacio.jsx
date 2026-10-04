import styled from "styled-components";
import { LuInbox } from "react-icons/lu";

export function EstadoVacio({ titulo = "Sin registros", mensaje, icono = <LuInbox />, accion }) {
  return (
    <Container>
      <span className="icono">{icono}</span>
      <h3>{titulo}</h3>
      {mensaje && <p>{mensaje}</p>}
      {accion}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 48px 16px;
  color: ${({ theme }) => theme.textMuted};
  .icono {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: ${({ theme }) => theme.surfaceAlt};
    font-size: 26px;
    margin-bottom: 6px;
  }
  h3 {
    color: ${({ theme }) => theme.text};
    font-size: 1rem;
    font-weight: 600;
  }
  p {
    max-width: 360px;
    font-size: 0.9rem;
    margin-bottom: 8px;
  }
`;
