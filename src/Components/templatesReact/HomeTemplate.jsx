import styled from "styled-components";
import { Link } from "react-router-dom";
import { PaginaTemplate } from "./PaginaTemplate";
import { BentoGrid, Cifra, ListaTarjeta, Tarjeta } from "../moleculas/Bento";
import { GraficoArea } from "../moleculas/GraficoArea";
import { BarraUso } from "../moleculas/BarraUso";
import { EstadoVacio } from "../moleculas/EstadoVacio";
import { ErrorMolecula } from "../moleculas/ErrorMolecula";
import { BannerDemo } from "../moleculas/BannerDemo";
import { PrimerosPasos } from "../organismos/PrimerosPasos";
import { EtiquetaEstado } from "../atomos/Etiqueta";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { SUGERENCIAS_NOVANDRA, useNovandraStore } from "../../store/NovandraStore";
import { usePlan } from "../../hooks/usePlan";
import { NombresMetodo, TiposBodega } from "../../utils/dataEstatica";
import { formatearMonedaCorta, formatearNumero, tiempoRelativo } from "../../utils/conversiones";
import { v } from "../../styles/variables";

const saludo = () => {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
};

const PERIODOS = [7, 30, 90];

const fechaCorta = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

export function HomeTemplate({ empresa, dashboard, bajoMinimo, dias, setDias, sucursales, idSucursal, setIdSucursal, sede }) {
  const { datausuario } = useUsuariosStore();
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const { plan, usado, limite } = usePlan();
  const moneda = empresa?.simbolomoneda ?? "$";
  const dinero = (n) => formatearMonedaCorta(n, moneda);
  const nombre = datausuario?.nombres?.split(" ")[0];
  const d = dashboard.data;
  const cargando = dashboard.isLoading;
  const valor = (fn) => (cargando ? "…" : fn());

  const variacion =
    d && Number(d.total_anterior) > 0
      ? Math.round(((Number(d.total_periodo) - Number(d.total_anterior)) / Number(d.total_anterior)) * 100)
      : null;
  const ticket = d?.num_ventas ? Number(d.total_periodo) / Number(d.num_ventas) : 0;
  const criticos = (bajoMinimo.data ?? []).slice(0, 5);
  const totalMetodos = (d?.por_metodo ?? []).reduce((acc, m) => acc + Number(m.total), 0);

  return (
    <PaginaTemplate
      titulo={`${saludo()}${nombre ? `, ${nombre}` : ""}`}
      descripcion={sede ? `Así va la sede ${sede.nombre} hoy.` : `Así va ${empresa?.nombre ?? "tu negocio"} hoy.`}
      acciones={
        <>
        {sucursales.length > 1 && (
          <SelectorSede value={idSucursal} onChange={(e) => setIdSucursal(e.target.value)} aria-label="Sucursal">
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </SelectorSede>
        )}
        <Periodo role="group" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <button key={p} type="button" aria-pressed={dias === p} onClick={() => setDias(p)}>
              {p} días
            </button>
          ))}
        </Periodo>
        </>
      }
    >
      {dashboard.error && <ErrorMolecula mensaje={dashboard.error.message} reintentar={dashboard.refetch} />}
      {/^empresa de/i.test(empresa?.nombre ?? "") && (
        <AvisoNombre to="/configurar/empresa">
          <v.iconoempresa />
          <span>
            <strong>Ponle nombre a tu empresa.</strong> Ahora aparece como “{empresa.nombre}” en tus reportes y facturas.
          </span>
          <v.iconoflechaderecha />
        </AvisoNombre>
      )}
      {d && !d.recientes?.length && <BannerDemo />}
      <PrimerosPasos tieneVentas={!!d?.recientes?.length} />

      <BentoGrid>
        {/* Ventas del periodo con gráfico */}
        <Tarjeta
          variante="tinta"
          col={8}
          colTablet={6}
          fila={2}
          decoracion
          titulo="Ventas del periodo"
          subtitulo={`Últimos ${dias} días`}
          icono={<v.iconosube />}
          accion={<Link to="/ventas/facturas">Ver facturas <v.iconoabrir /></Link>}
        >
          <Cifra>
            <span className="valor">{valor(() => dinero(d?.total_periodo))}</span>
            <span className="detalle">
              {variacion != null && (
                <span className={variacion >= 0 ? "sube" : "baja"}>
                  {variacion >= 0 ? <v.iconosube /> : <v.iconobaja />} {Math.abs(variacion)}%
                </span>
              )}
              {variacion != null ? "frente al periodo anterior" : `${formatearNumero(d?.num_ventas)} ventas`}
            </span>
          </Cifra>
          <ContenedorGrafico>
            <GraficoArea
              tono="claro"
              datos={(d?.serie ?? []).map((s) => ({ etiqueta: s.fecha, valor: Number(s.total) }))}
              formatear={dinero}
              etiquetaEje={(p) => fechaCorta(p.etiqueta)}
            />
          </ContenedorGrafico>
        </Tarjeta>

        {/* Hoy */}
        <Tarjeta variante="morado" col={4} colTablet={3} decoracion titulo="Ventas de hoy" icono={<v.iconoventas />}>
          <Cifra>
            <span className="valor">{valor(() => dinero(d?.total_hoy))}</span>
            <span className="detalle">{formatearNumero(d?.ventas_hoy)} ventas registradas</span>
          </Cifra>
          <BotonClaro to="/ventas">
            <v.agregar /> Registrar venta
          </BotonClaro>
        </Tarjeta>

        {/* Valor del inventario */}
        <Tarjeta col={4} colTablet={3} titulo="Valor del inventario" icono={<v.iconoprecioventa />}>
          <Cifra>
            <span className="valor">{valor(() => dinero(d?.valor_inventario))}</span>
            <span className="detalle">A costo · {dinero(d?.valor_venta_inventario)} a precio de venta</span>
          </Cifra>
        </Tarjeta>

        {/* KPIs pequeños */}
        <Tarjeta variante="acento" col={3} colTablet={3} titulo="Bajo mínimo" icono={<v.iconostockminimo />}>
          <Cifra>
            <span className="valor">{valor(() => formatearNumero(d?.bajo_minimo))}</span>
            <span className="detalle">{d?.bajo_minimo ? "productos por reponer" : "Todo en orden"}</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={3} colTablet={3} titulo="Ticket promedio" icono={<v.iconofacturas />}>
          <Cifra>
            <span className="valor">{valor(() => dinero(Math.round(ticket)))}</span>
            <span className="detalle">{formatearNumero(d?.num_ventas)} ventas en el periodo</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={3} colTablet={3} titulo="Órdenes abiertas" icono={<v.iconocompras />}>
          <Cifra>
            <span className="valor">{valor(() => formatearNumero(d?.ordenes_abiertas))}</span>
            <span className="detalle">
              <Link to="/compras">Ver compras</Link>
            </span>
          </Cifra>
        </Tarjeta>
        <Tarjeta
          col={3}
          colTablet={3}
          titulo={`Plan ${plan?.nombre ?? ""}`}
          icono={<v.iconoplan />}
          accion={<Link to="/configurar/plan">Gestionar</Link>}
        >
          <BarraUso etiqueta="Ventas del mes" usado={usado("ventas_mes")} limite={limite("ventas_mes")} />
          <BarraUso etiqueta="Productos" usado={usado("productos")} limite={limite("productos")} />
        </Tarjeta>

        {/* Más vendidos */}
        <Tarjeta col={4} colTablet={3} titulo="Más vendidos" icono={<v.iconostock />}>
          {d?.top_productos?.length ? (
            <ListaTarjeta>
              {d.top_productos.map((p, i) => (
                <li key={p.id_producto ?? p.descripcion}>
                  <span className="ficha">{i + 1}</span>
                  <span className="principal">
                    <strong>{p.descripcion}</strong>
                    <span>{dinero(p.total)}</span>
                  </span>
                  <span className="dato">{formatearNumero(p.cantidad)} und</span>
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <EstadoVacio titulo="Sin ventas aún" mensaje="Tus productos estrella aparecerán aquí." icono={<v.iconoventas />} />
          )}
        </Tarjeta>

        {/* Ventas recientes */}
        <Tarjeta
          col={4}
          colTablet={3}
          titulo="Ventas recientes"
          icono={<v.iconofacturas />}
          accion={<Link to="/ventas/facturas">Ver todas</Link>}
        >
          {d?.recientes?.length ? (
            <ListaTarjeta>
              {d.recientes.map((r) => (
                <li key={r.id}>
                  <span className="principal">
                    <strong>
                      {r.prefijo}-{r.numero}
                    </strong>
                    <span>
                      {r.cliente ?? "Consumidor final"} · {tiempoRelativo(r.fecha)}
                    </span>
                  </span>
                  <span className="dato">{dinero(r.total)}</span>
                  {r.estado !== "pagada" && <EtiquetaEstado estado={r.estado} />}
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <EstadoVacio titulo="Sin ventas recientes" mensaje="Registra tu primera venta desde “Vender”." />
          )}
        </Tarjeta>

        {/* Bodegas */}
        <Tarjeta
          col={4}
          colTablet={6}
          titulo="Bodegas conectadas"
          icono={<v.iconobodegas />}
          accion={<Link to="/bodegas">Gestionar</Link>}
        >
          <ListaTarjeta>
            {(d?.bodegas ?? []).map((b) => {
              const Icono = TiposBodega[b.tipo]?.icono ?? v.iconobodegas;
              return (
                <li key={b.id}>
                  <span className={`ficha ${b.tipo === "principal" ? "destacada" : ""}`}>
                    <Icono />
                  </span>
                  <span className="principal">
                    <strong>{b.nombre}</strong>
                    <span>{TiposBodega[b.tipo]?.etiqueta}</span>
                  </span>
                  <span className="dato">{formatearNumero(b.unidades)} und</span>
                </li>
              );
            })}
          </ListaTarjeta>
        </Tarjeta>

        {/* Novandra */}
        <Tarjeta
          variante="tinta"
          col={5}
          colTablet={6}
          decoracion
          titulo="Novandra"
          subtitulo="Tu asistente de operaciones"
          icono={<v.icononovandra />}
        >
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Pídele un análisis o que prepare el trabajo repetitivo por ti.
          </p>
          <Sugerencias>
            {SUGERENCIAS_NOVANDRA.slice(0, 3).map((s) => (
              <button key={s} type="button" onClick={() => abrirNovandra(s)}>
                <v.icononovandra />
                <span>{s}</span>
                <v.iconoflechaderecha />
              </button>
            ))}
          </Sugerencias>
        </Tarjeta>

        {/* Por reponer */}
        <Tarjeta
          col={4}
          colTablet={3}
          titulo="Por reponer"
          icono={<v.iconostockminimo />}
          accion={<Link to="/reportes/stock-bajo-minimo">Reporte</Link>}
        >
          {criticos.length ? (
            <ListaTarjeta>
              {criticos.map((p) => (
                <li key={p.id ?? p.descripcion}>
                  <span className="principal">
                    <strong>{p.descripcion}</strong>
                    <span>Mínimo {formatearNumero(p.stock_minimo)}</span>
                  </span>
                  <span className="dato peligro">{formatearNumero(p.stock)} und</span>
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <EstadoVacio titulo="Sin alertas" mensaje="Ningún producto está bajo su mínimo." icono={<v.iconocheck />} />
          )}
        </Tarjeta>

        {/* Comparación de sucursales */}
        {(d?.por_sucursal?.length ?? 0) > 1 && !idSucursal && (
          <Tarjeta col={12} titulo="Ventas por sucursal" subtitulo={`Últimos ${dias} días`} icono={<v.iconosucursales />}
            accion={<Link to="/sucursales">Ver sucursales</Link>}>
            <Barras>
              {d.por_sucursal.map((s) => {
                const max = Math.max(...d.por_sucursal.map((x) => Number(x.total)), 1);
                return (
                  <li key={s.id}>
                    <div className="fila">
                      <span>{s.nombre} · {formatearNumero(s.ventas)} ventas</span>
                      <strong>{dinero(s.total)}</strong>
                    </div>
                    <div className="pista">
                      <div style={{ width: `${Math.round((Number(s.total) / max) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </Barras>
          </Tarjeta>
        )}

        {/* Métodos de pago */}
        <Tarjeta col={3} colTablet={3} titulo="Cómo te pagan" icono={<v.iconoefectivo />}>
          {d?.por_metodo?.length ? (
            <Barras>
              {d.por_metodo.map((m) => {
                const pct = totalMetodos ? Math.round((Number(m.total) / totalMetodos) * 100) : 0;
                return (
                  <li key={m.metodo}>
                    <div className="fila">
                      <span>{NombresMetodo[m.metodo] ?? m.metodo}</span>
                      <strong>{pct}%</strong>
                    </div>
                    <div className="pista">
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </Barras>
          ) : (
            <EstadoVacio titulo="Sin datos" mensaje="Aparecerá con tus primeras ventas." />
          )}
        </Tarjeta>
      </BentoGrid>
    </PaginaTemplate>
  );
}

const AvisoNombre = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radiusXl};
  background: ${({ theme }) => theme.warningSoft};
  color: ${({ theme }) => theme.text};
  text-decoration: none;
  font-size: 0.9rem;
  > svg:first-child {
    font-size: 20px;
    color: ${({ theme }) => theme.warning};
    flex-shrink: 0;
  }
  span {
    flex: 1;
  }
  &:hover {
    outline: 1px solid ${({ theme }) => theme.warning};
  }
`;

const SelectorSede = styled.select`
  height: 42px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font-weight: 600;
  font-size: 0.85rem;
`;

const Periodo = styled.div`
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  button {
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    &[aria-pressed="true"] {
      background: ${({ theme }) => theme.ink};
      color: ${({ theme }) => theme.inkText};
    }
  }
`;

const ContenedorGrafico = styled.div`
  flex: 1;
  display: flex;
  min-height: 200px;
  margin-top: 6px;
`;

const BotonClaro = styled(Link)`
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  border-radius: 999px;
  background: #ffffff;
  color: #6d0090;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  &:hover {
    background: #f2e7f8;
  }
`;

const Sugerencias = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid ${({ theme }) => theme.inkBorder};
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.inkPanel};
    color: ${({ theme }) => theme.inkText};
    text-align: left;
    font-size: 0.86rem;
    cursor: pointer;
    span {
      flex: 1;
    }
    svg:first-child {
      color: ${({ theme }) => theme.accentLight};
    }
    svg:last-child {
      opacity: 0.5;
    }
    &:hover {
      border-color: ${({ theme }) => theme.accentLight};
      svg:last-child {
        opacity: 1;
      }
    }
  }
`;

const Barras = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .fila {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-bottom: 5px;
    span {
      color: var(--muted);
    }
  }
  .pista {
    height: 8px;
    border-radius: 999px;
    background: var(--panel);
    div {
      height: 100%;
      border-radius: inherit;
      background: ${({ theme }) => theme.primary};
    }
  }
`;
