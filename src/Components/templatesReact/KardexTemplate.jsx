import { useCallback, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { PaginaTemplate } from "./PaginaTemplate";
import { Buscador } from "../organismos/Buscador";
import { Selector } from "../organismos/Selector";
import { SelectorProducto } from "../organismos/reportes/SelectorProducto";
import { TablaKardex } from "../organismos/tablas/TablaKardex";
import { RegistrarAjuste } from "../organismos/formularios/RegistrarAjuste";
import { SpinnerLoader } from "../moleculas/SpinnerLoader";
import { Boton } from "../atomos/Boton";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { MostrarBodegas } from "../../supabase/crudBodegas";
import { OPCIONES_ORIGEN, OPCIONES_TIPO, exportarKardexExcel } from "../../utils/kardex";
import { formatearNumero } from "../../utils/conversiones";
import { Device } from "../../styles/breackpoints";
import { v } from "../../styles/variables";

export function KardexTemplate({ data, cargando, producto, setProducto, filtros, setFiltros, limpiar, recargar }) {
  const { dataempresa } = useEmpresaStore();
  const [ajuste, setAjuste] = useState(false);
  const bodegas = useQuery({
    queryKey: ["bodegas", dataempresa?.id],
    queryFn: () => MostrarBodegas(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const opcionesBodega = [{ id: "", descripcion: "Todas las bodegas" }, ...(bodegas.data ?? []).map((b) => ({ id: b.id, descripcion: b.nombre }))];
  // Manejadores estables: el Buscador limpia el texto al desmontarse y no debe disparar renders en cadena.
  const cambiar = useCallback((campo) => (valor) => setFiltros((f) => (f[campo] === valor ? f : { ...f, [campo]: valor })), [setFiltros]);
  const setTexto = useCallback((t) => cambiar("texto")(t), [cambiar]);
  const filas = data?.filas ?? [];
  const hayFiltros = producto || Object.values(filtros).some(Boolean);

  return (
    <PaginaTemplate
      titulo="Kardex"
      descripcion="Cada movimiento de tu inventario, con su origen y su saldo."
      acciones={
        <>
          <Boton variante="secundario" icono={<v.iconoexcel />} funcion={() => exportarKardexExcel(filas, `kardex-${dataempresa?.nombre ?? "stockly"}.xlsx`)} disabled={!filas.length}>
            Excel
          </Boton>
          <Boton icono={<v.iconokardex />} funcion={() => setAjuste(true)}>
            Ajuste de inventario
          </Boton>
        </>
      }
      herramientas={
        <Filtros>
          <Buscador setBuscador={setTexto} placeholder="Buscar por producto, código o detalle..." />
          <SelectorProducto valor={producto} onChange={setProducto} />
          {opcionesBodega.length > 2 && (
            <Selector opciones={opcionesBodega} valor={opcionesBodega.find((o) => String(o.id) === String(filtros.id_bodega)) ?? opcionesBodega[0]} onChange={(o) => cambiar("id_bodega")(o.id)} icono={<v.iconobodegas />} />
          )}
          <Selector opciones={OPCIONES_TIPO} valor={OPCIONES_TIPO.find((o) => o.id === filtros.tipo) ?? OPCIONES_TIPO[0]} onChange={(o) => cambiar("tipo")(o.id)} icono={<v.iconokardex />} />
          <Selector opciones={OPCIONES_ORIGEN} valor={OPCIONES_ORIGEN.find((o) => o.id === filtros.origen) ?? OPCIONES_ORIGEN[0]} onChange={(o) => cambiar("origen")(o.id)} icono={<v.iconotodos />} />
          <label className="fecha">
            Desde
            <input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar("desde")(e.target.value)} />
          </label>
          <label className="fecha">
            Hasta
            <input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar("hasta")(e.target.value)} />
          </label>
          {hayFiltros && (
            <Boton variante="secundario" tamano="sm" funcion={limpiar}>
              Limpiar filtros
            </Boton>
          )}
        </Filtros>
      }
    >
      {data && (
        <Resumen>
          <span>
            <b>{formatearNumero(data.total)}</b> movimientos
          </span>
          <span className="entrada">
            <b>+{formatearNumero(data.resumen?.entradas)}</b> entradas
          </span>
          <span className="salida">
            <b>−{formatearNumero(data.resumen?.salidas)}</b> salidas
          </span>
          {producto && (
            <span>
              Saldo actual de <b>{producto.descripcion}</b>: <b>{formatearNumero(producto.stock)}</b>
            </span>
          )}
        </Resumen>
      )}
      {cargando && !data ? <SpinnerLoader /> : <TablaKardex data={filas} alCambiar={recargar} />}
      {ajuste && (
        <RegistrarAjuste
          productoInicial={producto}
          onClose={() => setAjuste(false)}
          onGuardado={() => {
            setAjuste(false);
            recargar();
          }}
        />
      )}
    </PaginaTemplate>
  );
}

const Filtros = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  width: 100%;
  align-items: end;
  @media ${Device.tablet} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media ${Device.laptop} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  > * {
    min-width: 0;
  }
  .fecha {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
    input {
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font: inherit;
    }
  }
`;

const Resumen = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textMuted};
  b {
    color: ${({ theme }) => theme.text};
  }
  .entrada b {
    color: ${({ theme }) => theme.success};
  }
  .salida b {
    color: ${({ theme }) => theme.danger};
  }
`;
