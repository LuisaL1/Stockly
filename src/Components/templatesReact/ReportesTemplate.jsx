import styled from "styled-components";
import { NavLink, Outlet } from "react-router-dom";
import { PaginaTemplate } from "./PaginaTemplate";
import { Device } from "../../styles/breackpoints";

const SECCIONES = [
  {
    titulo: "Stock actual",
    items: [
      { to: "stock-actual-todos", texto: "Todos los productos" },
      { to: "stock-actual-por-producto", texto: "Por producto" },
      { to: "stock-bajo-minimo", texto: "Bajo el mínimo" },
    ],
  },
  { titulo: "Movimientos", items: [{ to: "kardex-entradas-salidas", texto: "Entradas y salidas" }] },
  { titulo: "Valorizado", items: [{ to: "inventario-valorado", texto: "Inventario valorizado" }] },
];

export function ReportesTemplate() {
  return (
    <PaginaTemplate titulo="Reportes" descripcion="Genera, visualiza y descarga reportes en PDF.">
      <Contenedor>
        <nav aria-label="Reportes">
          {SECCIONES.map((s) => (
            <div key={s.titulo} className="seccion">
              <span className="titulo">{s.titulo}</span>
              {s.items.map((i) => (
                <NavLink key={i.to} to={i.to} className="item">
                  {i.texto}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="contenido">
          <Outlet />
        </div>
      </Contenedor>
    </PaginaTemplate>
  );
}

const Contenedor = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  align-items: start;
  @media ${Device.laptop} {
    grid-template-columns: 240px 1fr;
  }
  nav {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 16px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radius};
    @media ${Device.laptop} {
      flex-direction: column;
      position: sticky;
      top: 24px;
    }
  }
  .seccion {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: max-content;
  }
  .titulo {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.textMuted};
    padding: 0 10px 6px;
  }
  .item {
    padding: 8px 10px;
    border-radius: ${({ theme }) => theme.radiusSm};
    color: ${({ theme }) => theme.text};
    text-decoration: none;
    font-size: 0.9rem;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
    &.active {
      background: ${({ theme }) => theme.primarySoft};
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
  .contenido {
    min-width: 0;
    padding: 20px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radius};
    box-shadow: ${({ theme }) => theme.shadow};
  }
`;
