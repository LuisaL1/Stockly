import styled from "styled-components";
import { AccionTabla } from "../atomos/AccionTabla";
import { v } from "../../styles/variables";

export function ContentAccionesTabla({ funcionEditar, funcionEliminar, etiquetaEliminar = "Eliminar" }) {
  return (
    <Container>
      {funcionEditar && (
        <AccionTabla funcion={funcionEditar} icono={<v.iconeditarTabla />} etiqueta="Editar" />
      )}
      {funcionEliminar && (
        <AccionTabla
          funcion={funcionEliminar}
          icono={<v.iconeliminarTabla />}
          etiqueta={etiquetaEliminar}
          tono="peligro"
        />
      )}
    </Container>
  );
}

const Container = styled.div`
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
`;
