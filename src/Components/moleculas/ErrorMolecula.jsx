import styled from "styled-components";
import { LuCircleAlert } from "react-icons/lu";
import { Boton } from "../atomos/Boton";

export function ErrorMolecula({ mensaje, reintentar }) {
  return (
    <Container role="alert">
      <LuCircleAlert className="icono" />
      <h3>Algo salió mal</h3>
      <p>{mensaje ?? "No pudimos cargar la información."}</p>
      {reintentar && (
        <Boton variante="secundario" funcion={reintentar}>
          Reintentar
        </Boton>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 64px 16px;
  .icono {
    font-size: 44px;
    color: ${({ theme }) => theme.danger};
  }
  h3 {
    font-size: 1.1rem;
  }
  p {
    color: ${({ theme }) => theme.textMuted};
    max-width: 420px;
    margin-bottom: 8px;
  }
`;
