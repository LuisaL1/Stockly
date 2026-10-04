import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { useMarcaStore } from "../../../store/MarcaStore";
import { confirmarEliminacion, notificarAviso } from "../../../utils/notificaciones";
import { esValorPorDefecto } from "./valoresPorDefecto";

export function TablaMarca({ data, editar }) {
  const { Eliminar } = useMarcaStore();

  const eliminar = async (fila) => {
    if (esValorPorDefecto(fila.descripcion)) {
      return notificarAviso("Registro protegido", "La marca por defecto no se puede eliminar.");
    }
    if (await confirmarEliminacion(`Se eliminará la marca "${fila.descripcion}".`)) {
      await Eliminar({ id: fila.id });
    }
  };

  const columns = [
    { accessorKey: "descripcion", header: "Descripción" },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <ContentAccionesTabla
          funcionEditar={() =>
            esValorPorDefecto(row.original.descripcion)
              ? notificarAviso("Registro protegido", "La marca por defecto no se puede editar.")
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
      vacio={<EstadoVacio titulo="Aún no hay marcas" mensaje="Crea tu primera marca con el botón “Nueva marca”." />}
    />
  );
}
