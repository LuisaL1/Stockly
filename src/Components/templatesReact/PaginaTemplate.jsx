import styled from "styled-components";
import { Link } from "react-router-dom";
import { v } from "../../styles/variables";

// Encabezado común de página: migas, título, descripción y acciones.
export function PaginaTemplate({ titulo, descripcion, volverA, acciones, herramientas, children }) {
  return (
    <Container>
      <header className="encabezado">
        <div>
          {volverA && (
            <Link to={volverA.to} className="volver">
              <v.iconoflechaderecha style={{ transform: "rotate(180deg)" }} />
              {volverA.texto}
            </Link>
          )}
          <h1>{titulo}</h1>
          {descripcion && <p>{descripcion}</p>}
        </div>
        {acciones && <div className="acciones">{acciones}</div>}
      </header>
      {herramientas && <div className="herramientas">{herramientas}</div>}
      {children}
    </Container>
  );
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
  > .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p {
      color: ${({ theme }) => theme.textMuted};
      margin-top: 2px;
    }
  }
  > .encabezado .volver {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: ${({ theme }) => theme.textMuted};
    text-decoration: none;
    &:hover {
      color: ${({ theme }) => theme.primary};
    }
  }
  > .encabezado .acciones,
  > .herramientas {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
`;
