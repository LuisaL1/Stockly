import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { confirmarEliminacion } from "../../../utils/notificaciones";
import { v } from "../../../styles/variables";

const conGuion = (valor) => valor || "—";

// Tabla de clientes o proveedores.
export function crearTablaContactos({ tipo, useStore }) {
  const esCliente = tipo === "cliente";
  return function TablaContactos({ data, editar }) {
    const { Eliminar } = useStore();
    const eliminar = async (fila) => {
      if (await confirmarEliminacion(`Se eliminará ${esCliente ? "el cliente" : "el proveedor"} "${fila.nombre}".`)) {
        await Eliminar({ id: fila.id });
      }
    };

    const columns = [
      { accessorKey: "nombre", header: "Nombre" },
      esCliente
        ? {
            id: "documento",
            header: "Documento",
            accessorFn: (f) => (f.documento ? `${f.tipo_documento} ${f.documento}` : ""),
            cell: (i) => conGuion(i.getValue()),
          }
        : { accessorKey: "nit", header: "NIT", cell: (i) => conGuion(i.getValue()) },
      ...(esCliente ? [] : [{ accessorKey: "contacto", header: "Contacto", cell: (i) => conGuion(i.getValue()) }]),
      { accessorKey: "telefono", header: "Teléfono", cell: (i) => conGuion(i.getValue()) },
      { accessorKey: "email", header: "Correo", cell: (i) => conGuion(i.getValue()) },
      {
        id: "acciones",
        header: "",
        enableSorting: false,
        meta: { align: "right" },
        cell: ({ row }) => (
          <ContentAccionesTabla funcionEditar={() => editar(row.original)} funcionEliminar={() => eliminar(row.original)} />
        ),
      },
    ];

    return (
      <DataTable
        data={data}
        columns={columns}
        vacio={
          <EstadoVacio
            titulo={esCliente ? "Aún no hay clientes" : "Aún no hay proveedores"}
            mensaje={
              esCliente
                ? "Registra clientes para facturarles con nombre y documento."
                : "Registra proveedores para crear órdenes de compra."
            }
            icono={esCliente ? <v.iconoclientes /> : <v.iconoproveedores />}
          />
        }
      />
    );
  };
}
