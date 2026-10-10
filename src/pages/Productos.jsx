import { useState } from "react";
import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { TablaProductos } from "../Components/organismos/tablas/TablaProductos";
import { RegistrarProductos } from "../Components/organismos/formularios/RegistrarProductos";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useProductosStore } from "../store/ProductosStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS, esAdmin } from "../utils/permisos";
import { usePlan } from "../hooks/usePlan";
import { useNavigate } from "react-router-dom";
import { Boton } from "../Components/atomos/Boton";
import { GuiaProducto } from "../Components/organismos/GuiaProducto";
import { ejemploDesdeProducto } from "../utils/guiaProducto";
import { useUsuariosStore } from "../store/UsuariosStore";
import { v } from "../styles/variables";

export function Productos() {
  return (
    <ConPermiso modulo={MODULOS.productos}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { setBuscador } = useProductosStore();
  const { data, isLoading, error, refetch } = usePaginaCrud("productos", useProductosStore);

  const { alcanzado, limite, plan } = usePlan();
  const { datausuario } = useUsuariosStore();
  const navigate = useNavigate();
  const [guia, setGuia] = useState(false);

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  // Ejemplo para la guía: el producto más completo del catálogo.
  const ejemplo = (data ?? []).find((p) => p.categoria && p.precioventa > 0 && p.preciocompra > 0) ?? data?.[0];

  return (
    <>
      <CrudTemplate
        titulo="Productos"
        descripcion="Tu catálogo. Precios y stock, al día."
        textoNuevo="Nuevo producto"
        placeholderBusqueda="Buscar producto..."
        setBuscador={setBuscador}
        data={data}
        Tabla={TablaProductos}
        bloqueoNuevo={
          alcanzado("productos") &&
          `Tu plan ${plan?.nombre ?? ""} permite ${limite("productos")} productos. Mejóralo en Configuración → Plan.`
        }
        Formulario={RegistrarProductos}
        accionesExtra={
          <>
            <Boton variante="fantasma" icono={<v.icononovandra />} funcion={() => setGuia(true)}>
              Guía
            </Boton>
            {esAdmin(datausuario) && (
              <Boton variante="secundario" icono={<v.iconoexcel />} funcion={() => navigate("/configurar/datos")}>
                Importar desde Excel
              </Boton>
            )}
          </>
        }
      />
      {guia && <GuiaProducto ejemplo={ejemploDesdeProducto(ejemplo)} onClose={() => setGuia(false)} />}
    </>
  );
}
