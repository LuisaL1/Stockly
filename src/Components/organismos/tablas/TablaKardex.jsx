import styled from "styled-components";
import { Link } from "react-router-dom";
import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { Etiqueta } from "../../atomos/Etiqueta";
import { AnularMovimiento } from "../../../supabase/crudKardex";
import { confirmarEliminacion } from "../../../utils/notificaciones";
import { ORIGENES, etiquetaOrigen } from "../../../utils/kardex";
import { formatearFechaHora, formatearNumero } from "../../../utils/conversiones";
import { cantidadConUnidad } from "../../../utils/unidades";

// Libro de movimientos. Solo los ajustes manuales activos se pueden anular (con el movimiento contrario);
// lo demás se revierte desde su origen (la venta, la compra, el traslado).
export function TablaKardex({ data, alCambiar }) {
  const anular = async (fila) => {
    if (await confirmarEliminacion(`Se registrará el movimiento contrario a "${fila.detalle}" (${formatearNumero(fila.cantidad)} und).`, "¿Anular ajuste?", "Sí, anular")) {
      if (await AnularMovimiento({ id: fila.id })) alCambiar?.();
    }
  };

  const columns = [
    {
      accessorKey: "creado_en",
      header: "Fecha",
      meta: { nowrap: true },
      cell: (info) => <Fecha>{formatearFechaHora(info.getValue())}</Fecha>,
    },
    {
      accessorKey: "producto",
      header: "Producto",
      meta: { width: "200px" },
      cell: ({ row }) => (
        <Producto $anulado={row.original.estado === "anulado"}>
          <strong>{row.original.producto}</strong>
          {row.original.bodega && <small>{row.original.bodega}</small>}
        </Producto>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Movimiento",
      cell: (info) => <Etiqueta tono={info.getValue() === "Salida" ? "danger" : "success"}>{info.getValue()}</Etiqueta>,
    },
    {
      accessorKey: "origen",
      header: "Origen",
      cell: ({ row }) => {
        const f = row.original;
        const o = ORIGENES[f.origen];
        const chip = <Etiqueta tono={o?.tono ?? "neutro"}>{etiquetaOrigen(f)}</Etiqueta>;
        const detalle = f.origen === "ajuste" ? f.nota : f.origen === "traslado" || f.origen === "red" ? f.detalle : null;
        return (
          <Origen>
            {o?.ruta ? <Link to={o.ruta}>{chip}</Link> : chip}
            {detalle && <small>{detalle}</small>}
            {f.estado === "anulado" && <small className="anulado">Anulado</small>}
            {f.anula_a && <small className="anulado">Anula el ajuste #{f.anula_a}</small>}
          </Origen>
        );
      },
    },
    {
      accessorKey: "cantidad",
      header: "Cantidad",
      meta: { align: "right" },
      cell: ({ row }) => (
        <Cantidad $salida={row.original.tipo === "Salida"}>
          {row.original.tipo === "Salida" ? "−" : "+"}
          {cantidadConUnidad(row.original.cantidad, row.original)}
        </Cantidad>
      ),
    },
    {
      accessorKey: "saldo",
      header: "Saldo",
      meta: { align: "right" },
      cell: ({ row }) => <strong>{cantidadConUnidad(row.original.saldo, row.original)}</strong>,
    },
    { accessorKey: "usuario", header: "Usuario" },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const f = row.original;
        if (f.origen !== "ajuste" || f.estado !== "activo" || f.anula_a) return null;
        return <ContentAccionesTabla funcionEliminar={() => anular(f)} etiquetaEliminar="Anular ajuste" />;
      },
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      tamanoPagina={25}
      vacio={<EstadoVacio titulo="Sin movimientos" mensaje="Las ventas, compras, traslados y ajustes irán quedando aquí, con su saldo." />}
    />
  );
}

const Fecha = styled.span`
  white-space: nowrap;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.86rem;
`;
const Producto = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: ${({ $anulado }) => ($anulado ? "line-through" : "none")};
  opacity: ${({ $anulado }) => ($anulado ? 0.6 : 1)};
  small {
    color: ${({ theme }) => theme.textMuted};
  }
`;
const Origen = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  a {
    text-decoration: none;
  }
  small {
    color: ${({ theme }) => theme.textMuted};
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .anulado {
    color: ${({ theme }) => theme.danger};
    font-weight: 600;
  }
`;
const Cantidad = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme, $salida }) => ($salida ? theme.danger : theme.success)};
`;
