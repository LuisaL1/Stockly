import { supabase } from './supabase/supabase.config';

export { default as App } from './App';
export * from './context/AuthContext';
export * from './styles/breackpoints';
export * from './styles/themes';
export * from './styles/variables';
export * from './supabase/supabase.config';
export * from './utils/dataEstatica';
export { Icono } from './Components/atomos/icono.jsx';
export { Home } from './pages/Home';
export { Login } from './pages/Login.jsx'; 
export { ProtectedRoute } from './hooks/ProtectedRoute.jsx';
export { MyRoutes } from './routers/routes.jsx'; 
export { Sidebar } from './Components/organismos/sidebar/Sidebar.jsx';
export { HomeTemplate } from './Components/templatesReact/HomeTemplate.jsx';
export { SidebarCard } from './Components/organismos/sidebar/SidebarCard.jsx';
export { ToggleTema } from './Components/organismos/ToggleTema.jsx';
export { Btnsave } from './Components/moleculas/Btnsave.jsx';
export { AuthContext } from './context/AuthContext.jsx';
export { LoginTemplate } from './Components/templatesReact/LoginTemplate.jsx';
export {useUsuariosStore} from './store/UsuariosStore';
export {InsertarUsuarios} from './supabase/crudUsuarios.jsx'
export {supabase} from './supabase/supabase.config.jsx'
export {useAuthStore} from './store/AuthStore.jsx'
export {FooterLogin} from './Components/organismos/sidebar/FooterLogin.jsx'
export {InputText} from './Components/organismos/formularios/InputText.jsx'
export {Header} from './Components/organismos/Header.jsx'
export {BtnCircular } from './Components/moleculas/BtnCircular.jsx';
export {ListaMenuDesplegable} from './Components/organismos/sidebar/ListaMenuDesplegable.jsx'
export {Title} from './Components/atomos/Title.jsx'
export {BannerEmpresa} from './Components/organismos/BannerEmpresa.jsx'
export {CardDatosEmpresa} from './Components/moleculas/CardDatosEmpresa.jsx'
export {ObtenerIdAuthSupabase} from './supabase/globalSupabase.jsx'
export {SpinnerLoader} from './Components/moleculas/SpinnerLoader.jsx'
export {ErrorMolecula} from './Components/moleculas/ErrorMolecula.jsx'
export {useEmpresaStore} from './store/EmpresaStore.jsx'
export {Configuracion} from './pages/Configuracion.jsx'
export {ConfiguracionTemplate} from './Components/templatesReact/ConfiguracionTemplate.jsx'
export {Marca} from './pages/Marca.jsx'
export {MarcaTemplate} from './Components/templatesReact/MarcaTemplate.jsx'
export {useMarcaStore} from './store/MarcaStore.jsx'
export {TablaMarca} from './Components/organismos/tablas/TablaMarca.jsx'
export {ContentAccionesTabla} from './Components/organismos/ContentAccionesTabla.jsx'
export {AccionTabla} from './Components/atomos/AccionTabla.jsx'
export {RegistrarMarca} from './Components/organismos/formularios/RegistrarMarca.jsx'
export {Btnfiltro} from './Components/moleculas/Btnfiltro.jsx'
export {ContentFiltro} from './Components/atomos/ContentFiltro.jsx'
export {Buscador} from './Components/organismos/Buscador.jsx'
export {CovertirCapitalize} from './utils/Conversiones.jsx'
export {Paginacion} from './Components/organismos/tablas/Paginacion.jsx'
export {Categorias} from './pages/Categorias.jsx'
export {CategoriaTemplate} from './Components/templatesReact/CategoriaTemplate.jsx'
export {useCategoriasStore} from './store/CategoriasStore.jsx'
export {RegistrarCategorias} from './Components/organismos/formularios/RegistrarCategorias.jsx'
export {TablaCategorias} from './Components/organismos/tablas/TablaCategorias.jsx'
export {ColorContent} from './Components/atomos/ColorContent.jsx'
export {Productos} from './pages/Productos.jsx'
export {ProductosTemplate} from './Components/templatesReact/ProductosTemplate.jsx'
export {RegistrarProductos} from './Components/organismos/formularios/RegistrarProductos.jsx'
export {TablaProductos} from './Components/organismos/tablas/TablaProductos.jsx'
export {useProductosStore} from './store/ProductosStore.jsx'
export {ContainerSelector} from './Components/atomos/ContainerSelector.jsx'
export {Selector} from './Components/organismos/Selector.jsx'
export {BtnCerrar} from './Components/atomos/BtnCerrar.jsx'
export {ColorContentTabla} from './Components/atomos/ColorContenTabla.jsx'
export {Usuarios} from './pages/Usuarios.jsx'
export {UsuariosTemplate} from './Components/templatesReact/UsuariosTemplate.jsx'
export {RegistrarUsuarios} from './Components/organismos/formularios/RegistrarUsuarios.jsx'
export {ListaModulos} from './Components/organismos/ListaModulos.jsx'
export {TablaUsuarios} from './Components/organismos/tablas/TablaUsuarios.jsx'
export {Mensaje} from './Components/moleculas/Mensaje.jsx'
export {BloqueoPagina} from './Components/moleculas/BloqueoPagina.jsx'
export {Kardex} from './pages/Kardex.jsx'
export {KardexTemplate} from './Components/templatesReact/KardexTemplate.jsx'
export {Tabs} from './Components/organismos/Tabs.jsx'
export {TablaKardex} from './Components/organismos/tablas/TablaKardex.jsx'
export {useKardexStore} from './store/KardexStore.jsx'
export {RegistrarKardex} from './Components/organismos/formularios/RegistrarKardex.jsx'
export {CardProductoSelect} from './Components/moleculas/CardProductoSelect.jsx'
export {Reportes} from './pages/Reportes.jsx.jsx'
export {ReportesTemplate} from './Components/templatesReact/ReportesTemplate.jsx'
export { default as StockActualTodos } from './Components/organismos/reportes/StockActualTodos';
export { default as StockActualPorProducto } from './Components/organismos/reportes/StockActualPorProducto';
export { default as StockBajoMinimo } from './Components/organismos/reportes/StockBajoMinimo';
export { default as KardexEntradasSalidas } from './Components/organismos/reportes/KardexEntradasSalidas';
export { default as StockInventarioValorado } from './Components/organismos/reportes/StockInventarioValorado';

