import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { crearTablaContactos } from "../Components/organismos/tablas/TablaContactos";
import { RegistrarContacto } from "../Components/organismos/formularios/RegistrarContacto";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useClientesStore, useProveedoresStore } from "../store/ContactosStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { useState } from "react";
import { MODULOS } from "../utils/permisos";
import { BotonLimpiar, SelectFiltro } from "../Components/moleculas/Filtros";
import { opcionesDesde } from "../utils/filtros";

const TablaClientes = crearTablaContactos({ tipo: "cliente", useStore: useClientesStore });
const TablaProveedores = crearTablaContactos({ tipo: "proveedor", useStore: useProveedoresStore });
const FormularioCliente = (props) => <RegistrarContacto tipo="cliente" {...props} />;
const FormularioProveedor = (props) => <RegistrarContacto tipo="proveedor" {...props} />;

export function Clientes() {
  return (
    <ConPermiso modulo={MODULOS.clientes}>
      <Pagina
        clave="clientes"
        useStore={useClientesStore}
        titulo="Clientes"
        descripcion="A quienes les vendes."
        textoNuevo="Nuevo cliente"
        placeholder="Buscar por nombre, documento o correo…"
        Tabla={TablaClientes}
        Formulario={FormularioCliente}
      />
    </ConPermiso>
  );
}

export function Proveedores() {
  return (
    <ConPermiso modulo={MODULOS.proveedores}>
      <Pagina
        clave="proveedores"
        useStore={useProveedoresStore}
        titulo="Proveedores"
        descripcion="A quienes les compras."
        textoNuevo="Nuevo proveedor"
        placeholder="Buscar por nombre, NIT o contacto…"
        Tabla={TablaProveedores}
        Formulario={FormularioProveedor}
      />
    </ConPermiso>
  );
}

function Pagina({ clave, useStore, titulo, descripcion, textoNuevo, placeholder, Tabla, Formulario }) {
  const { setBuscador } = useStore();
  const { data, isLoading, error, refetch } = usePaginaCrud(clave, useStore);
  const [tipoDoc, setTipoDoc] = useState("");
  const [datos, setDatos] = useState("");

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  const esCliente = clave === "clientes";
  const filtrados = (data ?? []).filter((c) => {
    if (tipoDoc && c.tipo_documento !== tipoDoc) return false;
    if (datos === "sin_correo" && c.email) return false;
    if (datos === "con_correo" && !c.email) return false;
    if (datos === "sin_telefono" && c.telefono) return false;
    return true;
  });

  return (
    <CrudTemplate
      titulo={titulo}
      descripcion={descripcion}
      textoNuevo={textoNuevo}
      placeholderBusqueda={placeholder}
      setBuscador={setBuscador}
      data={filtrados}
      Tabla={Tabla}
      Formulario={Formulario}
      volverA={null}
      filtros={
        <>
          {esCliente && <SelectFiltro etiqueta="Tipo de documento" todos="Todos los documentos" valor={tipoDoc} onChange={setTipoDoc} opciones={opcionesDesde(data, "tipo_documento")} />}
          <SelectFiltro
            etiqueta="Datos de contacto"
            todos="Con o sin datos de contacto"
            valor={datos}
            onChange={setDatos}
            opciones={[
              { id: "con_correo", descripcion: "Con correo" },
              { id: "sin_correo", descripcion: "Sin correo" },
              { id: "sin_telefono", descripcion: "Sin teléfono" },
            ]}
          />
          <BotonLimpiar visible={!!(tipoDoc || datos)} onClick={() => { setTipoDoc(""); setDatos(""); }} />
        </>
      }
    />
  );
}
