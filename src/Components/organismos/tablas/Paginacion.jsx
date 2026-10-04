import styled from "styled-components";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { AccionTabla } from "../../atomos/AccionTabla";

export function Paginacion({ table, pagina, maximo, total }) {
  return (
    <Container>
      <span className="info">
        Página {pagina} de {maximo}
        {total != null && ` · ${total} registros`}
      </span>
      <div className="botones">
        <AccionTabla
          etiqueta="Página anterior"
          icono={<LuChevronLeft />}
          funcion={() => table.getCanPreviousPage() && table.previousPage()}
        />
        <AccionTabla
          etiqueta="Página siguiente"
          icono={<LuChevronRight />}
          funcion={() => table.getCanNextPage() && table.nextPage()}
        />
      </div>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid ${({ theme }) => theme.border};
  .info {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .botones {
    display: flex;
    gap: 4px;
  }
  svg path {
    stroke: currentColor;
  }
  @media (max-width: 720px) {
    border-top: none;
    padding: 4px 0;
  }
`;
