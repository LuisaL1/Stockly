import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { BentoGrid, Cifra, ListaTarjeta, Tarjeta } from "../Components/moleculas/Bento";
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { useSede } from "../hooks/useSede";
import { Buscador } from "../Components/organismos/Buscador";
import { SelectFiltro } from "../Components/moleculas/Filtros";
import { opcionesDesde } from "../utils/filtros";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useNovandraStore } from "../store/NovandraStore";
import { MostrarRotacion } from "../supabase/crudInteligencia";
import { MostrarSucursales } from "../supabase/crudSucursales";
import { CrearOrdenCompra } from "../supabase/crudCompras";
import { MODULOS } from "../utils/permisos";
import { formatearFecha, formatearMonedaCorta, formatearNumero } from "../utils/conversiones";
import { v } from "../styles/variables";

const ROTACION = {
  alta: { tono: "success", texto: "Alta rotación" },
  media: { tono: "info", texto: "Rotación media" },
  baja: { tono: "warning", texto: "Baja rotación" },
  sin_movimiento: { tono: "neutro", texto: "Sin movimiento" },
};

const ALERTAS = {
  agotado: { tono: "danger", texto: "Agotado" },
  agotamiento_proximo: { tono: "danger", texto: "Se agota pronto" },
  detenido: { tono: "warning", texto: "Dejó de venderse" },
  sin_movimiento: { tono: "neutro", texto: "Capital quieto" },
  sobrestock: { tono: "info", texto: "Sobrestock" },
};

const cada = (dias) => (dias == null ? "—" : dias <= 1.2 ? "a diario" : `cada ${formatearNumero(dias, dias < 10 ? 1 : 0)} días`);

export function Inteligencia() {
  return (
    <ConPermiso modulo={MODULOS.inteligencia}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const dinero = (n) => formatearMonedaCorta(Math.round(n ?? 0), dataempresa?.simbolomoneda ?? "$");
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const queryClient = useQueryClient();
  const [dias, setDias] = useState(90);
  const [idSucursal, setIdSucursal] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [creando, setCreando] = useState(false);

  const sucursales = useQuery({ queryKey: ["sucursales", idEmpresa], queryFn: () => MostrarSucursales(idEmpresa), enabled: !!idEmpresa });
  const { sede } = useSede();
  const rotacion = useQuery({
    queryKey: ["rotacion", idEmpresa, dias, idSucursal],
    queryFn: () => MostrarRotacion({ idEmpresa, dias, idSucursal: idSucursal || null }),
    enabled: !!idEmpresa,
    placeholderData: (previo) => previo,
  });

  const productos = useMemo(() => rotacion.data?.productos ?? [], [rotacion.data]);
  const cuenta = (alerta) => productos.filter((p) => p.alerta === alerta).length;
  const urgentes = productos.filter((p) => ["agotado", "agotamiento_proximo"].includes(p.alerta));
  const detenidos = productos.filter((p) => p.alerta === "detenido");
  const quietos = productos.filter((p) => p.alerta === "sin_movimiento");
  const capitalQuieto = quietos.reduce((a, p) => a + Number(p.capital_inmovilizado ?? 0), 0);
  const aReponer = productos.filter((p) => Number(p.sugerido_reponer) > 0);
  const t = texto.trim().toLowerCase();
  const visibles = (filtro === "todas" ? productos : filtro === "reponer" ? aReponer : productos.filter((p) => p.alerta === filtro)).filter(
    (p) => (!categoria || p.categoria === categoria) && (!t || String(p.descripcion ?? "").toLowerCase().includes(t))
  );

  if (rotacion.isLoading) return <SpinnerLoader />;
  if (rotacion.error) return <ErrorMolecula mensaje={rotacion.error.message} reintentar={rotacion.refetch} />;

  const perfil = rotacion.data?.perfil ?? {};
  const intervaloNegocio = perfil.frecuencia_mediana ? 1 / Number(perfil.frecuencia_mediana) : null;

  async function crearOrden() {
    setCreando(true);
    const r = await CrearOrdenCompra({
      id_empresa: idEmpresa,
      nota: "Generada desde Inteligencia de inventario con las cantidades sugeridas por rotación.",
      items: aReponer.map((p) => ({ id_producto: p.id, cantidad: Number(p.sugerido_reponer) })),
    });
    setCreando(false);
    if (r) queryClient.invalidateQueries({ queryKey: ["ordenes compra"] });
  }

  const columns = [
    {
      accessorKey: "descripcion",
      header: "Producto",
      cell: ({ row }) => (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong>{row.original.descripcion}</strong>
          <small style={{ opacity: 0.65 }}>{row.original.categoria ?? "Sin categoría"}</small>
        </span>
      ),
    },
    {
      accessorKey: "rotacion",
      header: "Rotación",
      cell: (i) => <Etiqueta tono={ROTACION[i.getValue()]?.tono}>{ROTACION[i.getValue()]?.texto}</Etiqueta>,
    },
    { accessorKey: "intervalo_tipico", header: "Se vende", cell: (i) => cada(i.getValue()) },
    { accessorKey: "velocidad", header: "Und/día", meta: { align: "right" }, cell: (i) => formatearNumero(i.getValue(), 2) },
    {
      accessorKey: "tendencia",
      header: "Tendencia",
      meta: { align: "right" },
      cell: (i) =>
        i.getValue() == null ? (
          "—"
        ) : (
          <Tendencia $sube={i.getValue() >= 0}>
            {i.getValue() >= 0 ? <v.iconosube /> : <v.iconobaja />} {Math.abs(i.getValue())}%
          </Tendencia>
        ),
    },
    { accessorKey: "stock", header: "Stock", meta: { align: "right" }, cell: (i) => formatearNumero(i.getValue()) },
    {
      accessorKey: "dias_cobertura",
      header: "Alcanza para",
      meta: { align: "right" },
      cell: ({ row }) =>
        row.original.dias_cobertura == null ? "—" : (
          <span title={row.original.fecha_agotamiento ? `Se agota hacia el ${formatearFecha(`${row.original.fecha_agotamiento}T12:00:00`)}` : undefined}>
            {formatearNumero(row.original.dias_cobertura)} días
          </span>
        ),
    },
    { accessorKey: "pronostico_30", header: "Venta 30 d", meta: { align: "right" }, cell: (i) => formatearNumero(i.getValue()) },
    {
      accessorKey: "sugerido_reponer",
      header: "Reponer",
      meta: { align: "right" },
      cell: (i) => (Number(i.getValue()) > 0 ? <strong>{formatearNumero(i.getValue())}</strong> : "—"),
    },
    {
      accessorKey: "alerta",
      header: "Alerta",
      cell: (i) => (i.getValue() ? <Etiqueta tono={ALERTAS[i.getValue()]?.tono}>{ALERTAS[i.getValue()]?.texto}</Etiqueta> : null),
    },
  ];

  return (
    <PaginaTemplate
      titulo="Inteligencia de inventario"
      descripcion={sede ? `Sede ${sede.nombre}. Stockly aprende su ritmo y te dice qué reponer y qué está quieto.` : "Stockly aprende el ritmo de tu negocio. Te dice qué reponer y qué está quieto."}
      acciones={
        <Boton icono={<v.icononovandra />} funcion={() => abrirNovandra("Analiza la rotación de mis productos y dime qué priorizar esta semana")}>
          Analizar con Novandra
        </Boton>
      }
      herramientas={
        <>
          <Buscador setBuscador={setTexto} placeholder="Buscar producto…" />
          <SelectFiltro etiqueta="Categoría" todos="Todas las categorías" valor={categoria} onChange={setCategoria} opciones={opcionesDesde(productos, "categoria")} />
          <Select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 6 meses</option>
          </Select>
          {!sede && (sucursales.data?.length ?? 0) > 1 && (
            <Select value={idSucursal} onChange={(e) => setIdSucursal(e.target.value)} aria-label="Sucursal">
              <option value="">Todas las sucursales</option>
              {sucursales.data.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          )}
        </>
      }
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={5} colTablet={6} titulo="Así se mueve tu negocio" icono={<v.iconointeligencia />}>
          <Perfil>
            <p>
              {intervaloNegocio
                ? <>Un producto típico tuyo se vende <strong>{cada(intervaloNegocio)}</strong>. Stockly mide a cada producto contra ese ritmo, no contra una regla fija.</>
                : "Aún no hay ventas suficientes para conocer el ritmo de tu negocio."}
            </p>
            <dl>
              <div>
                <dt>Días analizados</dt>
                <dd>{formatearNumero(perfil.dias_analizados)}</dd>
              </div>
              <div>
                <dt>Días con ventas</dt>
                <dd>{formatearNumero(perfil.dias_con_ventas)}</dd>
              </div>
              <div>
                <dt>Día más fuerte</dt>
                <dd style={{ textTransform: "capitalize" }}>{perfil.dia_mas_fuerte ?? "—"}</dd>
              </div>
            </dl>
          </Perfil>
        </Tarjeta>

        <Tarjeta col={7} colTablet={6} titulo="Reponer ahora" subtitulo="Se agotan en menos de una semana" icono={<v.iconostockminimo />}
          accion={aReponer.length > 0 && (
            <Boton tamano="sm" icono={<v.iconocompras />} cargando={creando} funcion={crearOrden}>
              Crear orden con sugeridos ({aReponer.length})
            </Boton>
          )}
        >
          {urgentes.length ? (
            <ListaTarjeta>
              {urgentes.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <span className="principal">
                    <strong>{p.descripcion}</strong>
                    <span>
                      Vende {formatearNumero(p.velocidad, 1)}/día · quedan {formatearNumero(p.stock)}
                      {p.fecha_agotamiento ? ` · se agota hacia el ${formatearFecha(`${p.fecha_agotamiento}T12:00:00`)}` : ""}
                    </span>
                  </span>
                  <Etiqueta tono="danger">Reponer {formatearNumero(p.sugerido_reponer)}</Etiqueta>
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <EstadoVacio titulo="Nada urgente" mensaje="Ningún producto con movimiento se agota en los próximos 7 días." icono={<v.iconocheck />} />
          )}
        </Tarjeta>

        <Tarjeta col={4} colTablet={2} variante="acento" titulo="Dejaron de venderse" icono={<v.iconobaja />}>
          <Cifra>
            <span className="valor">{formatearNumero(detenidos.length)}</span>
            <span className="detalle">Llevan mucho más tiempo sin venderse de lo que es normal para ellos</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={4} colTablet={2} titulo="Capital quieto" icono={<v.iconoprecioventa />}>
          <Cifra>
            <span className="valor">{dinero(capitalQuieto)}</span>
            <span className="detalle">{formatearNumero(quietos.length)} productos sin ventas en el periodo</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={4} colTablet={2} titulo="Sobrestock" icono={<v.iconobodegas />}>
          <Cifra>
            <span className="valor">{formatearNumero(cuenta("sobrestock"))}</span>
            <span className="detalle">Tienen inventario para más de 4 meses</span>
          </Cifra>
        </Tarjeta>
      </BentoGrid>

      <Filtros role="tablist">
        {[
          ["todas", `Todos (${productos.length})`],
          ["reponer", `A reponer (${aReponer.length})`],
          ["agotamiento_proximo", `Se agotan (${cuenta("agotamiento_proximo") + cuenta("agotado")})`],
          ["detenido", `Detenidos (${detenidos.length})`],
          ["sin_movimiento", `Sin movimiento (${quietos.length})`],
          ["sobrestock", `Sobrestock (${cuenta("sobrestock")})`],
        ].map(([id, texto]) => (
          <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}>
            {texto}
          </button>
        ))}
      </Filtros>

      <DataTable
        data={filtro === "agotamiento_proximo" ? productos.filter((p) => ["agotado", "agotamiento_proximo"].includes(p.alerta)) : visibles}
        columns={columns}
        tamanoPagina={15}
        vacio={<EstadoVacio titulo="Sin productos en este grupo" icono={<v.iconostock />} />}
      />
    </PaginaTemplate>
  );
}

const Select = styled.select`
  height: 42px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusSm};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
`;

const Perfil = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  p {
    font-size: 1rem;
    line-height: 1.5;
    strong {
      color: ${({ theme }) => theme.accentLight};
    }
  }
  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    background: var(--panel);
    div {
      display: flex;
      flex-direction: column;
    }
    dt {
      font-size: 0.72rem;
      color: var(--muted);
    }
    dd {
      font-weight: 700;
      font-size: 1.05rem;
    }
  }
`;

const Tendencia = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
  color: ${({ theme, $sube }) => ($sube ? theme.success : theme.danger)};
`;

const Filtros = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  button {
    height: 36px;
    padding: 0 14px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    &[aria-selected="true"] {
      background: ${({ theme }) => theme.ink};
      border-color: ${({ theme }) => theme.ink};
      color: ${({ theme }) => theme.inkText};
    }
  }
`;
