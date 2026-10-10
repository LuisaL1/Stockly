import { useState } from "react";
import { PaginaTemplate } from "./PaginaTemplate";
import { Buscador } from "../organismos/Buscador";
import { Boton } from "../atomos/Boton";
import { v } from "../../styles/variables";

// Plantilla para catálogos (marcas, categorías, productos, personal):
// encabezado + buscador + tabla + modal de registro/edición.
export function CrudTemplate({
  titulo,
  descripcion,
  textoNuevo,
  setBuscador,
  placeholderBusqueda,
  Tabla,
  Formulario,
  data,
  volverA = { to: "/configurar", texto: "Configuración" },
  accionesExtra,
  bloqueoNuevo,
  filtros,
}) {
  const [registro, setRegistro] = useState(null); // { accion, dataSelect }

  return (
    <PaginaTemplate
      titulo={titulo}
      descripcion={descripcion}
      volverA={volverA}
      acciones={
        <>
          {accionesExtra}
          <Boton
            icono={<v.agregar />}
            disabled={!!bloqueoNuevo}
            title={bloqueoNuevo || undefined}
            funcion={() => setRegistro({ accion: "Nuevo", dataSelect: {} })}
          >
            {textoNuevo}
          </Boton>
        </>
      }
      herramientas={
        <>
          <Buscador setBuscador={setBuscador} placeholder={placeholderBusqueda} />
          {filtros}
        </>
      }
    >
      <Tabla data={data} editar={(fila) => setRegistro({ accion: "Editar", dataSelect: fila })} />
      {registro && (
        <Formulario
          accion={registro.accion}
          dataSelect={registro.dataSelect}
          onClose={() => setRegistro(null)}
        />
      )}
    </PaginaTemplate>
  );
}
