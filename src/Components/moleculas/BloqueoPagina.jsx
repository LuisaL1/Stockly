import styled from "styled-components";
import { Link } from "react-router-dom";
import { LuLock } from "react-icons/lu";

export function BloqueoPagina({ modulo }) {
  return (
    <Container>
      <span className="icono">
        <LuLock />
      </span>
      <h2>No tienes acceso a este módulo</h2>
      <p>
        {modulo ? `El módulo "${modulo}" no está habilitado para tu usuario. ` : ""}
        Pide al administrador de tu empresa que te asigne el permiso.
      </p>
      <Link to="/">Volver al inicio</Link>
    </Container>
  );
}

const Container = styled.div`
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
  padding: 24px;
  .icono {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: ${({ theme }) => theme.warningSoft};
    color: ${({ theme }) => theme.warning};
    font-size: 30px;
    margin-bottom: 6px;
  }
  h2 {
    font-size: 1.25rem;
  }
  p {
    color: ${({ theme }) => theme.textMuted};
    max-width: 420px;
  }
  a {
    margin-top: 8px;
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    text-decoration: none;
  }
`;
