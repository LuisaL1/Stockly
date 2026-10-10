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
import { BotonLimpiar, SelectFiltro } from "../Components/moleculas/Filtros";
import { opcionesDesde } from "../utils/filtros";

const SIN_FILTROS = { categoria: "", marca: "", stock: "" };
const OPCIONES_STOCK = [
  { id: "bajo", descripcion: "Bajo el mínimo" },
  { id: "agotado", descripcion: "Agotados" },
  { id: "con", descripcion: "Con stock" },
];

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
  const [filtros, setFiltros] = useState(SIN_FILTROS);

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  // Ejemplo para la guía: el producto más completo del catálogo.
  const ejemplo = (data ?? []).find((p) => p.categoria && p.precioventa > 0 && p.preciocompra > 0) ?? data?.[0];
  const cambiar = (clave) => (valor) => setFiltros((f) => ({ ...f, [clave]: valor }));
  const filtrados = (data ?? []).filter((p) => {
    if (filtros.categoria && p.categoria !== filtros.categoria) return false;
    if (filtros.marca && p.marca !== filtros.marca) return false;
    const stock = Number(p.stock ?? 0);
    if (filtros.stock === "bajo" && !(stock <= Number(p.stock_minimo ?? 0))) return false;
    if (filtros.stock === "agotado" && stock > 0) return false;
    if (filtros.stock === "con" && stock <= 0) return false;
    return true;
  });
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <CrudTemplate
        titulo="Productos"
        descripcion="Tu catálogo. Precios y stock, al día."
        textoNuevo="Nuevo producto"
        placeholderBusqueda="Buscar producto..."
        setBuscador={setBuscador}
        data={filtrados}
        Tabla={TablaProductos}
        filtros={
          <>
            <SelectFiltro etiqueta="Categoría" todos="Todas las categorías" valor={filtros.categoria} onChange={cambiar("categoria")} opciones={opcionesDesde(data, "categoria")} />
            <SelectFiltro etiqueta="Marca" todos="Todas las marcas" valor={filtros.marca} onChange={cambiar("marca")} opciones={opcionesDesde(data, "marca")} />
            <SelectFiltro etiqueta="Stock" todos="Todo el stock" valor={filtros.stock} onChange={cambiar("stock")} opciones={OPCIONES_STOCK} />
            <BotonLimpiar visible={hayFiltros} onClick={() => setFiltros(SIN_FILTROS)} />
          </>
        }
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
