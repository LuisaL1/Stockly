import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { ColorContentTabla } from "../../atomos/ColorContenTabla";
import { useProductosStore } from "../../../store/ProductosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { confirmarEliminacion } from "../../../utils/notificaciones";
import { formatearMoneda } from "../../../utils/conversiones";
import { cantidadConUnidad, etiquetaPresentacion } from "../../../utils/unidades";

export function TablaProductos({ data, editar }) {
  const navigate = useNavigate();
  const { Eliminar } = useProductosStore();
  const { dataempresa } = useEmpresaStore();
  const moneda = dataempresa?.simbolomoneda ?? "$";

  const eliminar = async (fila) => {
    if (await confirmarEliminacion(`Se eliminará el producto "${fila.descripcion}".`)) {
      await Eliminar({ id: fila.id });
    }
  };

  const columns = [
    {
      accessorKey: "descripcion",
      header: "Producto",
      cell: ({ row }) => (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span>{row.original.descripcion}</span>
          {etiquetaPresentacion(row.original) && <small style={{ opacity: 0.65, fontWeight: 400 }}>{etiquetaPresentacion(row.original)}</small>}
        </span>
      ),
    },
    {
      accessorKey: "stock",
      header: "Stock",
      meta: { align: "right" },
      cell: ({ row }) => {
        const { stock, stock_minimo } = row.original;
        const bajo = Number(stock) <= Number(stock_minimo);
        return (
          <Stock $bajo={bajo} title={bajo ? `Mínimo: ${cantidadConUnidad(stock_minimo, row.original)}` : undefined}>
            {cantidadConUnidad(stock, row.original)}
          </Stock>
        );
      },
    },
    {
      accessorKey: "precioventa",
      header: "Precio venta",
      meta: { align: "right" },
      cell: (info) => formatearMoneda(info.getValue(), moneda),
    },
    {
      accessorKey: "preciocompra",
      header: "Precio compra",
      meta: { align: "right" },
      cell: (info) => formatearMoneda(info.getValue(), moneda),
    },
    {
      accessorKey: "categoria",
      header: "Categoría",
      cell: ({ row }) => (
        <ColorContentTabla $color={row.original.color ?? "#888"}>{row.original.categoria}</ColorContentTabla>
      ),
    },
    { accessorKey: "marca", header: "Marca" },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <ContentAccionesTabla
          funcionMovimientos={() => navigate(`/kardex?producto=${row.original.id}`)}
          funcionEditar={() => editar(row.original)}
          funcionEliminar={() => eliminar(row.original)}
        />
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      vacio={<EstadoVacio titulo="Aún no hay productos" mensaje="Registra tu primer producto con el botón “Nuevo producto”." />}
    />
  );
}

const Stock = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $bajo }) => ($bajo ? theme.danger : theme.text)};
`;
