import styled from "styled-components";
import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { ColorContentTabla } from "../../atomos/ColorContenTabla";
import { useKardexStore } from "../../../store/KardexStore";
import { confirmarEliminacion, notificarAviso } from "../../../utils/notificaciones";
import { formatearFecha, formatearNumero } from "../../../utils/conversiones";

export function TablaKardex({ data }) {
  const { Eliminar } = useKardexStore();

  const anular = async (fila) => {
    if (fila.estado && fila.estado !== "activo") {
      return notificarAviso("Movimiento ya anulado");
    }
    if (await confirmarEliminacion(`Se anulará la ${fila.tipo?.toLowerCase()} de "${fila.descripcion}".`)) {
      await Eliminar({ id: fila.id });
    }
  };

  const columns = [
    {
      accessorKey: "descripcion",
      header: "Producto",
      cell: ({ row }) => (
        <Producto $anulado={row.original.estado && row.original.estado !== "activo"}>
          {row.original.descripcion}
        </Producto>
      ),
    },
    { accessorKey: "fecha", header: "Fecha", cell: (info) => formatearFecha(info.getValue()) },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: (info) => {
        const salida = info.getValue()?.toLowerCase() === "salida";
        return (
          <ColorContentTabla $color={salida ? "#DC2626" : "#16A34A"}>
            {salida ? "↓" : "↑"} {info.getValue()}
          </ColorContentTabla>
        );
      },
    },
    { accessorKey: "detalle", header: "Detalle" },
    { accessorKey: "nombres", header: "Usuario" },
    {
      accessorKey: "cantidad",
      header: "Cantidad",
      meta: { align: "right" },
      cell: (info) => formatearNumero(info.getValue()),
    },
    {
      accessorKey: "stock",
      header: "Stock",
      meta: { align: "right" },
      cell: (info) => <strong>{formatearNumero(info.getValue())}</strong>,
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <ContentAccionesTabla funcionEliminar={() => anular(row.original)} etiquetaEliminar="Anular movimiento" />
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      vacio={<EstadoVacio titulo="Sin movimientos" mensaje="Registra entradas y salidas para ver el historial de inventario." />}
    />
  );
}

const Producto = styled.span`
  font-weight: 500;
  text-decoration: ${({ $anulado }) => ($anulado ? "line-through" : "none")};
  opacity: ${({ $anulado }) => ($anulado ? 0.55 : 1)};
`;
