import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import styled from "styled-components";
import { LuChevronDown, LuChevronUp, LuChevronsUpDown } from "react-icons/lu";
import { Paginacion } from "./Paginacion";
import { EstadoVacio } from "../../moleculas/EstadoVacio";

// Tabla genérica: ordenamiento, paginación y vista de tarjetas en móvil.
// En las columnas, "cell" devuelve solo el contenido (sin <td>).
// meta.align: "left" | "center" | "right"
export function DataTable({ data, columns, vacio, tamanoPagina = 10 }) {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: tamanoPagina } },
  });

  if (!data?.length) {
    return <Container>{vacio ?? <EstadoVacio />}</Container>;
  }

  return (
    <Container>
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const puedeOrdenar = header.column.getCanSort();
                const orden = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`align-${header.column.columnDef.meta?.align ?? "left"}`}
                    aria-sort={orden ? (orden === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {puedeOrdenar ? (
                      <button type="button" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {orden === "asc" ? <LuChevronUp /> : orden === "desc" ? <LuChevronDown /> : <LuChevronsUpDown className="tenue" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const encabezado = cell.column.columnDef.header;
                return (
                  <td
                    key={cell.id}
                    data-title={typeof encabezado === "string" ? encabezado : ""}
                    className={`align-${cell.column.columnDef.meta?.align ?? "left"}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {table.getPageCount() > 1 && (
        <Paginacion
          table={table}
          pagina={table.getState().pagination.pageIndex + 1}
          maximo={table.getPageCount()}
          total={data.length}
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  box-shadow: ${({ theme }) => theme.shadow};
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 12px 16px;
    white-space: nowrap;
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: none;
      cursor: pointer;
      font: inherit;
      color: inherit;
      text-transform: inherit;
      letter-spacing: inherit;
    }
    .tenue {
      opacity: 0.4;
    }
  }
  td {
    padding: 12px 16px;
    border-top: 1px solid ${({ theme }) => theme.border};
    vertical-align: middle;
  }
  tbody tr {
    transition: background 0.1s;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  }
  .align-center {
    text-align: center;
  }
  .align-right {
    text-align: right;
  }

  /* Móvil: cada fila se convierte en una tarjeta */
  @media (max-width: 720px) {
    background: transparent;
    border: none;
    box-shadow: none;
    thead {
      display: none;
    }
    table,
    tbody,
    tr,
    td {
      display: block;
      width: 100%;
    }
    tbody tr {
      background: ${({ theme }) => theme.surface};
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radius};
      margin-bottom: 12px;
      padding: 6px 0;
      &:hover {
        background: ${({ theme }) => theme.surface};
      }
    }
    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border: none;
      padding: 8px 16px;
      text-align: right;
      &[data-title]:not([data-title=""])::before {
        content: attr(data-title);
        font-size: 0.8rem;
        font-weight: 600;
        color: ${({ theme }) => theme.textMuted};
        text-align: left;
      }
      &:first-child {
        justify-content: flex-start;
        text-align: left;
        font-weight: 600;
        font-size: 1rem;
        &::before {
          display: none;
        }
      }
      &[data-title=""] {
        justify-content: flex-end;
        border-top: 1px solid ${({ theme }) => theme.border};
        margin-top: 4px;
      }
    }
  }
`;
