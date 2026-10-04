import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { crearTablaContactos } from "../Components/organismos/tablas/TablaContactos";
import { RegistrarContacto } from "../Components/organismos/formularios/RegistrarContacto";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useClientesStore, useProveedoresStore } from "../store/ContactosStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";

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
        descripcion="Las personas y empresas a las que les vendes."
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
        descripcion="A quién le compras la mercancía."
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

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo={titulo}
      descripcion={descripcion}
      textoNuevo={textoNuevo}
      placeholderBusqueda={placeholder}
      setBuscador={setBuscador}
      data={data}
      Tabla={Tabla}
      Formulario={Formulario}
      volverA={null}
    />
  );
}
