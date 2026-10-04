import styled from "styled-components";
import { DataTable } from "./DataTable";
import { ContentAccionesTabla } from "../ContentAccionesTabla";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { ColorContentTabla } from "../../atomos/ColorContenTabla";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { confirmarEliminacion, notificarAviso } from "../../../utils/notificaciones";

const esDueno = (u) => u.tipouser === "Dueño";

export function TablaUsuarios({ data, editar }) {
  const { Eliminar } = useUsuariosStore();

  const eliminar = async (fila) => {
    if (esDueno(fila)) {
      return notificarAviso("Registro protegido", "El dueño de la empresa no se puede eliminar.");
    }
    if (await confirmarEliminacion(`Se eliminará a "${fila.nombres}" del personal.`)) {
      await Eliminar({ id: fila.id });
    }
  };

  const columns = [
    {
      accessorKey: "nombres",
      header: "Nombre",
      cell: ({ row }) => (
        <Persona>
          <span className="avatar">{(row.original.nombres ?? "?").charAt(0).toUpperCase()}</span>
          <span>
            <strong>{row.original.nombres}</strong>
            {row.original.email && <small>{row.original.email}</small>}
          </span>
        </Persona>
      ),
    },
    {
      accessorKey: "tipouser",
      header: "Rol",
      cell: (info) => <span style={{ textTransform: "capitalize" }}>{info.getValue()}</span>,
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: (info) => (
        <ColorContentTabla $color={info.getValue() === "activo" ? "#16A34A" : "#9AA2B4"}>
          {info.getValue()}
        </ColorContentTabla>
      ),
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) =>
        esDueno(row.original) ? null : (
          <ContentAccionesTabla
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
      vacio={<EstadoVacio titulo="Aún no hay personal" mensaje="Agrega a tu equipo y asígnales permisos por módulo." />}
    />
  );
}

const Persona = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  .avatar {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-weight: 700;
    flex-shrink: 0;
  }
  span {
    display: flex;
    flex-direction: column;
  }
  small {
    color: ${({ theme }) => theme.textMuted};
  }
`;
