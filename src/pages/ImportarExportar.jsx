import { useRef, useState } from "react";
import styled from "styled-components";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { BloqueoPagina } from "../Components/moleculas/BloqueoPagina";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { AvisarImportacion, ExportarDatos, ImportarDatos } from "../supabase/crudImportacion";
import { HOJAS, descargarExportacion, descargarPlantilla, descargarPlantillaProductos, leerArchivo } from "../utils/excelStockly";
import { GuiaProducto } from "../Components/organismos/GuiaProducto";
import { EliminarDatosModal } from "../Components/organismos/EliminarDatos";
import { ejemploDesdeProducto, guiaProductoVista } from "../utils/guiaProducto";
import { notificarError, notificarExito } from "../utils/notificaciones";
import { formatearNumero } from "../utils/conversiones";
import { esAdmin } from "../utils/permisos";
import { Device } from "../styles/breackpoints";
import { v } from "../styles/variables";

const NOMBRES = {
  empresa: "Empresa",
  ...Object.fromEntries(HOJAS.map((h) => [h.clave, h.hoja])),
};
const ENLACES = {
  productos: "/configurar/productos",
  categorias: "/configurar/categorias",
  marcas: "/configurar/marca",
  sucursales: "/sucursales",
  bodegas: "/bodegas",
  inventario: "/bodegas",
  clientes: "/clientes",
  proveedores: "/proveedores",
  empresa: "/configurar/empresa",
};

export function ImportarExportar() {
  const { datausuario } = useUsuariosStore();
  if (!esAdmin(datausuario)) return <BloqueoPagina modulo="Importar y exportar (solo dueño o administradores)" />;
  return <Contenido />;
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const entrada = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [analisis, setAnalisis] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [guia, setGuia] = useState(null); // { ejemplo } cuando está abierta
  const [eliminar, setEliminar] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const datos = await ExportarDatos(dataempresa.id);
      await descargarExportacion(datos, dataempresa?.nombre);
      notificarExito("Copia descargada");
    } catch (e) {
      notificarError("No se pudieron exportar los datos", e.message);
    }
    setExportando(false);
  }

  async function elegir(f) {
    if (!f) return;
    if (!/\.(xlsx|xlsm|xls|csv|ods)$/i.test(f.name))
      return notificarError("Formato no soportado", "Sube un archivo de Excel (.xlsx, .xls), .csv u .ods.");
    if (f.size > 15 * 1024 * 1024) return notificarError("Archivo muy grande", "El máximo es 15 MB.");
    setLeyendo(true);
    setResultado(null);
    try {
      const r = await leerArchivo(f);
      setArchivo(f);
      setAnalisis(r);
    } catch (e) {
      notificarError("No se pudo leer el archivo", e.message);
    }
    setLeyendo(false);
  }

  const totalFilas = analisis ? analisis.hojas.reduce((a, h) => a + h.validas, 0) : 0;
  const totalErrores = analisis ? analisis.hojas.reduce((a, h) => a + h.errores.filter((e) => !e.aviso).length, 0) : 0;

  async function importar() {
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: `¿Importar ${formatearNumero(totalFilas)} registros?`,
      html:
        "Lo nuevo se crea y lo que ya existe se actualiza. No se borra nada.<br/><br/>" +
        "Las cantidades de stock quedan como en el archivo: la diferencia se registra en el kardex." +
        (totalErrores ? `<br/><br/><b>${totalErrores} fila(s) con errores no se importarán.</b>` : ""),
      showCancelButton: true,
      confirmButtonText: "Sí, importar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;

    const datosImportados = analisis.datos;
    setProgreso({ hechas: 0, total: 1, etiqueta: "Preparando…" });
    const r = await ImportarDatos(dataempresa.id, analisis.datos, (hechas, total, etiqueta) => setProgreso({ hechas, total, etiqueta }));
    setProgreso(null);
    setResultado(r);
    await queryClient.invalidateQueries();
    if (!r.error) {
      const partes = Object.entries(r.resumen)
        .filter(([, x]) => typeof x === "object" && x.creados + x.actualizados > 0)
        .map(([k, x]) => `${NOMBRES[k]}: ${x.creados} nuevos, ${x.actualizados} actualizados`);
      await AvisarImportacion(dataempresa.id, `${archivo?.name ?? "Archivo"} · ${partes.join(" · ")}`);
      notificarExito("Importación completada");
      setAnalisis(null);
      setArchivo(null);
      // Primera importación con productos: guía con uno de sus productos como ejemplo.
      if (datosImportados.productos?.length && !guiaProductoVista()) setGuia({ ejemplo: elegirEjemplo(datosImportados) });
    }
  }

  function reiniciar() {
    setAnalisis(null);
    setArchivo(null);
    setResultado(null);
    if (entrada.current) entrada.current.value = "";
  }

  return (
    <PaginaTemplate
      titulo="Importar y exportar"
      descripcion="Sube tus productos desde Excel y empieza a vender. O descarga una copia de todo."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <Inicio>
        <div className="texto">
          <h2>Empieza con tus productos</h2>
          <p>Es lo único que necesitas para empezar a vender. Solo el nombre es obligatorio; con el precio ya puedes cobrar.</p>
        </div>
        <ol>
          <li>
            <span className="num">1</span>
            <div>
              <strong>Descarga la plantilla</strong>
              <small>Una hoja, 6 columnas: nombre, precio, stock, categoría, costo y código.</small>
            </div>
          </li>
          <li>
            <span className="num">2</span>
            <div>
              <strong>Llénala</strong>
              <small>O usa tu propio Excel: reconocemos columnas como Precio, Costo, SKU o Existencias.</small>
            </div>
          </li>
          <li>
            <span className="num">3</span>
            <div>
              <strong>Súbela aquí abajo</strong>
              <small>Revisas antes de guardar. Puedes subirla otra vez sin duplicar nada.</small>
            </div>
          </li>
        </ol>
        <div className="botones">
          <Boton icono={<v.iconodescargar />} funcion={() => descargarPlantillaProductos(dataempresa)}>
            Plantilla de productos
          </Boton>
          <Boton variante="fantasma" icono={<v.icononovandra />} funcion={() => setGuia({ ejemplo: null })}>
            ¿Cómo registro bien un producto?
          </Boton>
        </div>
      </Inicio>

      {progreso ? (
        <Panel>
          <div className="progreso">
            <strong>Importando… {progreso.etiqueta}</strong>
            <div className="barra" role="progressbar" aria-valuenow={progreso.hechas} aria-valuemax={progreso.total}>
              <span
                style={{
                  width: `${Math.round((progreso.hechas / Math.max(progreso.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <small>
              Parte {Math.min(progreso.hechas + 1, progreso.total)} de {progreso.total}. No cierres esta página.
            </small>
          </div>
        </Panel>
      ) : resultado ? (
        <Resultado resultado={resultado} onOtro={reiniciar} />
      ) : analisis ? (
        <Panel>
          <div className="cabecera">
            <div className="archivo">
              <v.iconoexcel />
              <div>
                <strong>{archivo?.name}</strong>
                <small>
                  {formatearNumero(totalFilas)} registros listos
                  {totalErrores ? ` · ${totalErrores} fila(s) con errores` : ""}
                </small>
              </div>
            </div>
            <Boton variante="fantasma" tamano="sm" funcion={reiniciar}>
              Cambiar archivo
            </Boton>
          </div>

          {analisis.hojas.length === 0 && (
            <p className="vacio">
              No encontré hojas que reconozca. Usa los nombres de la plantilla: Empresa, {HOJAS.map((h) => h.hoja).join(", ")}.
            </p>
          )}
          {analisis.hojas.map((h) => (
            <HojaAnalizada key={h.clave + h.titulo} hoja={h} />
          ))}
          {analisis.desconocidas.length > 0 && (
            <p className="nota">Hojas que no se importan (nombre no reconocido): {analisis.desconocidas.join(", ")}.</p>
          )}

          <div className="acciones">
            <Boton icono={<v.iconosubir />} funcion={importar} disabled={totalFilas === 0}>
              Importar {formatearNumero(totalFilas)} registros
            </Boton>
          </div>
        </Panel>
      ) : (
        <Zona
          $activa={arrastrando}
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            elegir(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="icono">
            <v.iconoexcel />
          </span>
          <strong>{leyendo ? "Leyendo archivo…" : "Arrastra aquí tu Excel de productos"}</strong>
          <small>.xlsx, .xls, .csv u .ods · máximo 15 MB · también acepta la plantilla completa</small>
          <Boton icono={<v.iconosubir />} cargando={leyendo} funcion={() => entrada.current?.click()}>
            Elegir archivo
          </Boton>
          <input
            ref={entrada}
            type="file"
            hidden
            accept=".xlsx,.xlsm,.xls,.csv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={(e) => elegir(e.target.files?.[0])}
          />
        </Zona>
      )}

      <Avanzado>
        <summary>
          <span>
            <strong>¿Tienes más datos? Importación completa</strong>
            <small>Opcional: bodegas, sucursales, clientes, proveedores, inventario por bodega y datos de facturación.</small>
          </span>
          <v.iconoFlechabajo className="flecha" />
        </summary>
        <div className="contenido">
          <p>
            Descarga la plantilla completa, llena solo las hojas que necesites y súbela en el mismo recuadro de arriba. Stockly reconoce
            cada hoja por su nombre y la organiza en el orden correcto.
          </p>
          <Boton variante="secundario" icono={<v.iconoexcel />} funcion={() => descargarPlantilla(dataempresa)}>
            Plantilla completa
          </Boton>
        </div>
      </Avanzado>

      <Exportar>
        <span className="icono">
          <v.iconodatos />
        </span>
        <div>
          <strong>Exportar mis datos</strong>
          <small>
            Copia completa en Excel: empresa, catálogos, productos con su stock, inventario por bodega, contactos e historial de ventas.
            Puedes editarla y volver a subirla.
          </small>
        </div>
        <Boton variante="secundario" icono={<v.iconodescargar />} cargando={exportando} funcion={exportar}>
          Exportar a Excel
        </Boton>
      </Exportar>
      <Peligro>
        <div>
          <strong>Zona de peligro</strong>
          <small>
            Elimina ventas, inventario, contactos u otros datos de tu empresa. Te pediremos el nombre de la empresa y un código enviado a tu
            correo. No se puede deshacer.
          </small>
        </div>
        <Boton variante="peligro" icono={<v.iconeliminarTabla />} funcion={() => setEliminar(true)}>
          Eliminar datos
        </Boton>
      </Peligro>

      {eliminar && <EliminarDatosModal onClose={() => setEliminar(false)} onExportar={exportar} />}
      {guia && <GuiaProducto ejemplo={guia.ejemplo} onClose={() => setGuia(null)} />}
    </PaginaTemplate>
  );
}

// Producto del archivo para la guía: el más completo.
function elegirEjemplo(datos) {
  const puntaje = (p) =>
    ["categoria", "precio_venta", "precio_compra", "stock", "codigo_interno", "marca", "stock_minimo"].filter(
      (k) => p[k] != null && p[k] !== "",
    ).length;
  const p = [...datos.productos].sort((a, b) => puntaje(b) - puntaje(a))[0];
  const color = datos.categorias?.find((c) => normalizarNombre(c.nombre) === normalizarNombre(p.categoria))?.color;
  return ejemploDesdeProducto({ ...p, color });
}
const normalizarNombre = (t) =>
  String(t ?? "")
    .trim()
    .toLowerCase();

function HojaAnalizada({ hoja }) {
  const errores = hoja.errores.filter((e) => !e.aviso);
  const avisos = hoja.errores.filter((e) => e.aviso);
  const [abierta, setAbierta] = useState(errores.length > 0);
  const columnas = hoja.clave === "empresa" ? [] : (hoja.columnas ?? []);
  return (
    <Hoja>
      <button type="button" className="fila" onClick={() => setAbierta(!abierta)} aria-expanded={abierta}>
        <strong>{hoja.titulo}</strong>
        <span className="cuenta">
          {formatearNumero(hoja.validas)} {hoja.clave === "empresa" ? "datos" : "filas"} listas
        </span>
        {errores.length > 0 && <Etiqueta tono="danger">{errores.length} con errores</Etiqueta>}
        {avisos.length > 0 && <Etiqueta tono="warning">{avisos.length} repetidas</Etiqueta>}
        {errores.length === 0 && hoja.validas > 0 && (
          <Etiqueta tono="success" icono={<v.iconolisto />}>
            Lista
          </Etiqueta>
        )}
        <v.iconoFlechabajo className={`flecha ${abierta ? "abierta" : ""}`} />
      </button>
      {abierta && (
        <div className="detalle">
          {hoja.ignoradas?.length > 0 && <p className="nota">Columnas que no se usan: {hoja.ignoradas.join(", ")}.</p>}
          {hoja.errores.length > 0 && (
            <ul className="errores">
              {hoja.errores.slice(0, 40).map((e, i) => (
                <li key={i} className={e.aviso ? "aviso" : ""}>
                  <b>Fila {e.fila}:</b> {e.mensaje}
                </li>
              ))}
              {hoja.errores.length > 40 && <li>…y {hoja.errores.length - 40} más.</li>}
            </ul>
          )}
          {columnas.length > 0 && hoja.muestra.length > 0 && (
            <div className="tabla">
              <table>
                <thead>
                  <tr>
                    {columnas.map((c) => (
                      <th key={c.clave}>{c.titulo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hoja.muestra.map((r, i) => (
                    <tr key={i}>
                      {columnas.map((c) => (
                        <td key={c.clave}>
                          {r[c.clave] == null ? "" : c.tipo === "numero" ? formatearNumero(r[c.clave]) : String(r[c.clave])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {hoja.validas > hoja.muestra.length && <small>Vista previa de las primeras {hoja.muestra.length} filas.</small>}
            </div>
          )}
          {hoja.clave === "empresa" && hoja.validas > 0 && (
            <p className="nota">Se actualizan los datos del negocio y de facturación que vengan llenos; los vacíos se conservan.</p>
          )}
        </div>
      )}
    </Hoja>
  );
}

function Resultado({ resultado, onOtro }) {
  const filas = Object.entries(resultado.resumen).filter(([, x]) => typeof x === "object");
  return (
    <Panel>
      {resultado.error ? (
        <div className="estado error">
          <v.iconostockminimo />
          <div>
            <strong>La importación se detuvo en “{resultado.parteFallida}”</strong>
            <p>{resultado.error}</p>
            <small>
              {resultado.aplicadas > 0
                ? `Se guardaron ${resultado.aplicadas} de ${resultado.total} partes. Corrige el archivo y súbelo otra vez: lo que ya se importó se actualiza, no se duplica.`
                : "No se guardó nada. Corrige el archivo y súbelo otra vez."}
            </small>
          </div>
        </div>
      ) : (
        <div className="estado ok">
          <v.iconocheck />
          <div>
            <strong>¡Listo! Tu negocio quedó cargado</strong>
            <p>
              {resultado.resumen.movimientos_kardex
                ? `${formatearNumero(resultado.resumen.movimientos_kardex)} movimientos de inventario registrados en el kardex.`
                : "Sin cambios de inventario."}
            </p>
          </div>
        </div>
      )}
      {filas.length > 0 && (
        <div className="tabla">
          <table>
            <thead>
              <tr>
                <th>Sección</th>
                <th>Nuevos</th>
                <th>Actualizados</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map(([k, x]) => (
                <tr key={k}>
                  <td>{NOMBRES[k] ?? k}</td>
                  <td>{formatearNumero(x.creados)}</td>
                  <td>{formatearNumero(x.actualizados)}</td>
                  <td>{ENLACES[k] && <Link to={ENLACES[k]}>Ver</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="acciones">
        <Boton variante="secundario" icono={<v.iconosubir />} funcion={onOtro}>
          Importar otro archivo
        </Boton>
      </div>
    </Panel>
  );
}

const Inicio = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  h2 {
    font-size: 1.2rem;
  }
  .texto p {
    margin-top: 4px;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.textMuted};
  }
  ol {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 0;
    list-style: none;
    @media ${Device.tablet} {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  li {
    display: flex;
    gap: 10px;
    div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    small {
      font-size: 0.82rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .num {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 9px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-weight: 700;
    font-size: 0.85rem;
  }
  .botones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const Avanzado = styled.details`
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    cursor: pointer;
    list-style: none;
    &::-webkit-details-marker {
      display: none;
    }
    span {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    small {
      font-size: 0.82rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .flecha {
    transition: transform 0.15s;
  }
  &[open] .flecha {
    transform: rotate(180deg);
  }
  .contenido {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 0 20px 18px;
    p {
      font-size: 0.86rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

const Zona = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 2px dashed ${({ theme, $activa }) => ($activa ? theme.primary : theme.border)};
  background: ${({ theme, $activa }) => ($activa ? theme.primarySoft : theme.surface)};
  transition:
    background 0.15s,
    border-color 0.15s;
  .icono {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 26px;
  }
  small {
    color: ${({ theme }) => theme.textMuted};
  }
`;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .archivo {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    > svg {
      font-size: 28px;
      color: ${({ theme }) => theme.success};
      flex-shrink: 0;
    }
    div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .nota,
  .vacio {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
  .progreso {
    display: flex;
    flex-direction: column;
    gap: 10px;
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .barra {
    height: 10px;
    border-radius: 999px;
    background: ${({ theme }) => theme.surfaceAlt};
    border: 1px solid ${({ theme }) => theme.border};
    overflow: hidden;
    span {
      display: block;
      height: 100%;
      background: ${({ theme }) => theme.primary};
      transition: width 0.3s;
    }
  }
  .estado {
    display: flex;
    gap: 14px;
    padding: 16px;
    border-radius: ${({ theme }) => theme.radiusLg};
    > svg {
      font-size: 26px;
      flex-shrink: 0;
    }
    p,
    small {
      font-size: 0.86rem;
    }
    small {
      display: block;
      margin-top: 4px;
      color: ${({ theme }) => theme.textMuted};
    }
    &.ok {
      background: ${({ theme }) => theme.successSoft};
      > svg {
        color: ${({ theme }) => theme.success};
      }
    }
    &.error {
      background: ${({ theme }) => theme.dangerSoft};
      > svg {
        color: ${({ theme }) => theme.danger};
      }
    }
  }
  .tabla {
    overflow-x: auto;
    small {
      display: block;
      margin-top: 6px;
      font-size: 0.75rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
    th,
    td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid ${({ theme }) => theme.border};
      white-space: nowrap;
    }
    th {
      font-size: 0.72rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
`;

const Hoja = styled.div`
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  overflow: hidden;
  .fila {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 14px;
    border: none;
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.text};
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  .cuenta {
    flex: 1;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .flecha {
    transition: transform 0.15s;
    &.abierta {
      transform: rotate(180deg);
    }
  }
  .detalle {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
  }
  .errores {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 220px;
    overflow-y: auto;
    padding-left: 0;
    list-style: none;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.danger};
    li.aviso {
      color: ${({ theme }) => theme.warning};
    }
  }
`;

const Peligro = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.danger};
  background: ${({ theme }) => theme.surface};
  > div {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    strong {
      color: ${({ theme }) => theme.danger};
    }
    small {
      font-size: 0.84rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

const Exportar = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  background: ${({ theme }) => theme.inkCard};
  color: ${({ theme }) => theme.inkText};
  .icono {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 14px;
    background: ${({ theme }) => theme.inkPanel};
    color: ${({ theme }) => theme.accentLight};
    font-size: 20px;
  }
  > div {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    small {
      font-size: 0.84rem;
      color: ${({ theme }) => theme.inkMuted};
    }
  }
`;
