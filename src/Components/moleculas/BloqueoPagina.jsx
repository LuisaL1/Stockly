import styled from "styled-components";
import { CiNoWaitingSign } from "react-icons/ci";

export function BloqueoPagina({ state }) {
   if (!state) return null;
  return (
    <Container>
      <span className="icono">
        <CiNoWaitingSign />
      </span>
      <span className="texto">No tienes permisos a este módulo</span>
    </Container>
  );
}

const Container = styled.div`
  position: absolute;
  z-index: 10;
  background: rgba(26, 9, 9, 0.9);
  border: 1px solid rgba(248, 42, 45, 0.5);
  padding: 15px;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  opacity: 1;
  z-index: 100000;

  /* Texto e icono siempre en blanco */
  color: #fff;

  .icono {
    font-size: 50px;
    color: #fff; /* forzado blanco */
    margin-bottom: 10px;
  }

  .texto {
    font-size: 18px;
    font-weight: 500;
    text-align: center;
  }
`;
