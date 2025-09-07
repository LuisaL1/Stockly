import styled from "styled-components";
import { CiNoWaitingSign } from "react-icons/ci";

export function Mensaje({ state }) {
  return (
    <Container className={state ? "" : "visible"}>
      <span className="icono">
        <CiNoWaitingSign />
      </span>
      <span className="texto">No tienes permisos a este módulo</span>
    </Container>
  );
}

const Container = styled.div`
  position: absolute;
  z-index: 1;
  background: rgba(26, 9, 9, 0.9);
  border: 1px solid rgba(248, 42, 45, 0.5);
  border-radius: 10px;
  padding: 15px;
  display: flex;
  gap: 15px;
  width: 100%;
  height: 100%;
  opacity: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  z-index: 100; 

  .texto {
    color: #fff;
    font-size: 15px;
  }

  &:hover {
    &.visible {
      opacity: 1;
    }
  }

  .icono {
    font-size: 30px;
    color: #f5f5f5; /* color por defecto en dark */

    @media (prefers-color-scheme: light) {
      color: #222; /* color en tema claro */
    }
  }
`;
