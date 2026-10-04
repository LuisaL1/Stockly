import styled from "styled-components";
import { Device } from "../../../styles/breackpoints";

// Contenedor de formularios dentro de modales.
// .grid: dos columnas en pantallas medianas; .completo: ocupa toda la fila.
export const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    @media ${Device.tablet} {
      grid-template-columns: 1fr 1fr;
    }
    .completo {
      grid-column: 1 / -1;
    }
  }
  .columna {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .titulo-seccion {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.textMuted};
    padding-top: 4px;
  }
  .etiqueta {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 6px;
  }
`;
