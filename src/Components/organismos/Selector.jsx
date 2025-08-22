import styled from "styled-components";
import { v } from "../../index";

export function Selector({ color, state, funcion, texto1, texto2 }) {
  return (
    <Container $color={color} onClick={funcion}>
      <div className="texto">
        <span className="icon">{texto1}</span>
        <span className="descripcion">{texto2}</span>
      </div>
      <span className={state ? "open" : "close"}>
        <v.iconoFlechabajo />
      </span>
    </Container>
  );
}

export const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  cursor: pointer;
  border: 2px solid ${(props) => props.$color};
  border-radius: 10px;
  padding: 10px;
  gap: 10px;
  transition: 0.3s;
  font-weight: 600;
  box-shadow: 4px 9px 20px -12px ${(props) => props.$color};

  .texto {
    display: flex;
    align-items: center;
    gap: 6px; 
  }

  .icon {
    display: flex;
    align-items: center;
    font-size: 1.2rem; 
  }

.open{
  transition: 0.3s;
  transform: rotate(0deg);
}

.close{
  transition: 0.3s;
  transform: rotate(180deg);
}

&:hover{
  background-color: ${(props) => props.$color};
  color: #000
}
`;

