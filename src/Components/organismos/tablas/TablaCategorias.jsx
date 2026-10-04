import styled from "styled-components";
import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { ColorContent } from "../../atomos/ColorContent";
import { useCategoriasStore } from "../../../store/CategoriasStore";
import { confirmarEliminacion, notificarAviso } from "../../../utils/notificaciones";
import { esValorPorDefecto } from "./valoresPorDefecto";

export function TablaCategorias({ data, editar }) {
  const { Eliminar } = useCategoriasStore();

  const eliminar = async (fila) => {
    if (esValorPorDefecto(fila.descripcion)) {
      return notificarAviso("Registro protegido", "La categoría por defecto no se puede eliminar.");
    }
    if (await confirmarEliminacion(`Se eliminará la categoría "${fila.descripcion}".`)) {
      await Eliminar({ id: fila.id });
    }
  };

  const columns = [
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => (
        <Nombre>
          <ColorContent $color={row.original.color} $alto="14px" $ancho="14px" />
          {row.original.descripcion}
        </Nombre>
      ),
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <ContentAccionesTabla
          funcionEditar={() =>
            esValorPorDefecto(row.original.descripcion)
              ? notificarAviso("Registro protegido", "La categoría por defecto no se puede editar.")
              : editar(row.original)
          }
          funcionEliminar={() => eliminar(row.original)}
        />
      ),
    },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      vacio={<EstadoVacio titulo="Aún no hay categorías" mensaje="Crea categorías para organizar tus productos." />}
    />
  );
}

const Nombre = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
`;
