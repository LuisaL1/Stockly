import styled from "styled-components";
import { v } from "../../../index";

export function Paginacion({ table, pagina, maximo, irinicio }) {
  return (
    <Container>
      <button
        onClick={() => irinicio()}
        disabled={!table.getCanPreviousPage()}
      >
        <v.iconotodos />
      </button>

      <button
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <v.iconoflechaderecha style={{ transform: "rotate(180deg)" }} />
      </button>

      <span>{pagina}</span>
      <p>de {maximo}</p>

      <button
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <v.iconoflechaderecha />
      </button>
    </Container>
  );
}

const Container = styled.div` 
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  button {
    background-color: #cc803e;
    border: none;
    padding: 8px;
    border-radius: 5px;
    height: 40px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.3s;
    color: white;
    font-size: 18px;

    &:hover {
      box-shadow: 0px 10px 15px -3px ${(props) => props.$colorCategoria || "#cc803e"};
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }


span, p {
  color: ${({ theme }) => theme.textColor};
  font-size: 14px;
}


  
button:disabled {
  background-color: #646464;
  cursor: not-allowed;
  box-shadow: none;
}

`;

