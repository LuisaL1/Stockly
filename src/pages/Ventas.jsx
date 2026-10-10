import { lazy, Suspense, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { Modal } from "../Components/moleculas/Modal";
import { Selector } from "../Components/organismos/Selector";
import { RegistrarContacto } from "../Components/organismos/formularios/RegistrarContacto";
import { Boton } from "../Components/atomos/Boton";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MostrarBodegas, MostrarStockBodega } from "../supabase/crudBodegas";
import { crudClientes } from "../supabase/crudContactos";
import { MostrarConfigFacturacion } from "../supabase/crudFacturacion";
import { RegistrarVenta } from "../supabase/crudVentas";
import { abrev, cantidadConUnidad, permiteDecimales } from "../utils/unidades";
import { usePlan } from "../hooks/usePlan";
import { Canales, TiposBodega } from "../utils/dataEstatica";
import { normalizarPagos, pagoVacio, validarPagos } from "../utils/pagos";
import { PanelPagos } from "../Components/organismos/ventas/PanelPagos";
import { EnviarFactura } from "../Components/organismos/ventas/EnviarFactura";
import { PagoNequiQR } from "../Components/organismos/ventas/PagoNequiQR";
import { MODULOS } from "../utils/permisos";
import { formatearMonedaCorta, formatearNumero } from "../utils/conversiones";
import { Device } from "../styles/breackpoints";
import { v } from "../styles/variables";

const BotonFacturaPDF = lazy(() => import("../Components/organismos/ventas/FacturaPDF"));

const redondear = (n) => Math.round(n * 100) / 100;
const CONSUMIDOR_FINAL = { id: null, descripcion: "Consumidor final" };

export function Ventas() {
  return (
    <ConPermiso modulo={MODULOS.ventas}>
      <PuntoDeVenta />
    </ConPermiso>
  );
}

function PuntoDeVenta() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const moneda = dataempresa?.simbolomoneda ?? "$";
  const dinero = (n) => formatearMonedaCorta(redondear(n), moneda);
  const queryClient = useQueryClient();
  const { usado, limite, alcanzado } = usePlan();

  const [idBodega, setIdBodega] = useState(null);
  const [texto, setTexto] = useState("");
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState(CONSUMIDOR_FINAL);
  const [pagos, setPagos] = useState([pagoVacio()]);
  const [canal, setCanal] = useState("mostrador");
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [ivaPct, setIvaPct] = useState(null);
  const [registrando, setRegistrando] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [resultado, setResultado] = useState(null);

  const bodegas = useQuery({ queryKey: ["bodegas", idEmpresa], queryFn: () => MostrarBodegas(idEmpresa), enabled: !!idEmpresa });
  const bodegaActual = bodegas.data?.find((b) => b.id === idBodega) ?? bodegas.data?.find((b) => b.activa) ?? null;
  const stock = useQuery({
    queryKey: ["stock bodega", idEmpresa, bodegaActual?.id],
    queryFn: () => MostrarStockBodega({ idEmpresa, idBodega: bodegaActual.id }),
    enabled: !!bodegaActual,
  });
  const clientes = useQuery({ queryKey: ["clientes pos", idEmpresa], queryFn: () => crudClientes.mostrar(idEmpresa), enabled: !!idEmpresa });
  const cfg = useQuery({
    queryKey: ["config facturacion", idEmpresa],
    queryFn: () => MostrarConfigFacturacion(idEmpresa),
    enabled: !!idEmpresa,
  });
  const iva = ivaPct ?? Number(cfg.data?.iva_defecto ?? 0);

  const productos = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return (stock.data ?? []).filter((p) => !t || p.descripcion.toLowerCase().includes(t));
  }, [stock.data, texto]);

  const lineas = carrito.map((item) => {
    const bruto = item.cantidad * item.precio;
    const descuento = redondear((bruto * descuentoPct) / 100);
    const base = bruto - descuento;
    const impuesto = redondear((base * iva) / 100);
    return { ...item, bruto, descuento, impuesto, total: base + impuesto };
  });
  const totales = lineas.reduce(
    (acc, l) => ({
      subtotal: acc.subtotal + l.bruto,
      descuento: acc.descuento + l.descuento,
      impuesto: acc.impuesto + l.impuesto,
      total: acc.total + l.total,
    }),
    { subtotal: 0, descuento: 0, impuesto: 0, total: 0 }
  );
  const unidades = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  const agregar = (p) => {
    setCarrito((previo) => {
      const existe = previo.find((i) => i.id_producto === p.id_producto);
      if (existe) {
        return previo.map((i) =>
          i.id_producto === p.id_producto ? { ...i, cantidad: Math.min(i.cantidad + 1, i.disponible) } : i
        );
      }
      return [
        ...previo,
        {
          id_producto: p.id_producto,
          descripcion: p.descripcion,
          precio: Number(p.precioventa ?? 0),
          cantidad: 1,
          disponible: Number(p.cantidad),
          unidad: p.unidad,
        },
      ];
    });
  };

  const cambiarCantidad = (id, cantidad) =>
    setCarrito((previo) =>
      previo
        .map((i) => (i.id_producto === id ? { ...i, cantidad: Math.max(0, Math.min(cantidad, i.disponible)) } : i))
        .filter((i) => i.cantidad > 0)
    );

  const cambiarBodega = (b) => {
    setIdBodega(b.id);
    setCarrito([]);
  };

  const errorPagos = carrito.length ? validarPagos(pagos, redondear(totales.total)) : null;

  async function cobrar() {
    if (!carrito.length || !bodegaActual || errorPagos) return;
    setRegistrando(true);
    const venta = await RegistrarVenta({
      id_empresa: idEmpresa,
      id_bodega: bodegaActual.id,
      id_cliente: cliente?.id ?? null,
      canal,
      pagos: normalizarPagos(pagos, redondear(totales.total)).map((p) => ({
        metodo: p.metodo,
        monto: p.monto,
        recibido: p.metodo === "efectivo" && p.recibido !== "" ? Number(p.recibido) : null,
        referencia: p.referencia || null,
        franquicia: p.franquicia || null,
        banco: p.banco || null,
      })),
      items: lineas.map((l) => ({
        id_producto: l.id_producto,
        cantidad: l.cantidad,
        precio_unitario: l.precio,
        descuento: l.descuento,
        iva,
      })),
    });
    setRegistrando(false);
    if (!venta) return;
    setResultado(venta);
    setCarrito([]);
    setDescuentoPct(0);
    setPagos([pagoVacio()]);
    setCliente(CONSUMIDOR_FINAL);
    queryClient.invalidateQueries();
  }

  if (bodegas.isLoading) return <SpinnerLoader />;
  if (bodegas.error) return <ErrorMolecula mensaje={bodegas.error.message} reintentar={bodegas.refetch} />;

  const limiteVentas = alcanzado("ventas_mes");
  const opcionesClientes = [
    CONSUMIDOR_FINAL,
    ...(clientes.data ?? []).map((c) => ({ ...c, descripcion: c.documento ? `${c.nombre} · ${c.documento}` : c.nombre })),
  ];

  return (
    <PaginaTemplate
      titulo="Vender"
      descripcion="Agrega al ticket. Elige cómo te pagan. Cobra."
      acciones={
        <Link to="/ventas/facturas" style={{ textDecoration: "none" }}>
          <Boton variante="secundario" icono={<v.iconofacturas />}>
            Ver facturas
          </Boton>
        </Link>
      }
    >
      {limiteVentas && (
        <Aviso>
          <v.iconoplan />
          <span>
            Llegaste al límite de {formatearNumero(limite("ventas_mes"))} ventas del mes ({formatearNumero(usado("ventas_mes"))}{" "}
            registradas). <Link to="/configurar/plan">Mejora tu plan</Link> para seguir vendiendo.
          </span>
        </Aviso>
      )}

      <Layout>
        <section className="catalogo">
          <div className="filtros">
            <label className="buscar">
              <v.iconobuscar />
              <input
                type="search"
                placeholder="Buscar producto…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-label="Buscar producto"
              />
            </label>
            <div className="bodega">
              <Selector
                opciones={(bodegas.data ?? []).filter((b) => b.activa).map((b) => ({ ...b, descripcion: b.nombre }))}
                valor={bodegaActual ? { ...bodegaActual, descripcion: bodegaActual.nombre } : null}
                onChange={cambiarBodega}
                icono={<v.iconobodegas />}
                placeholder="Bodega"
              />
            </div>
          </div>

          {stock.isLoading ? (
            <SpinnerLoader />
          ) : productos.length ? (
            <div className="productos">
              {productos.map((p) => {
                const enCarrito = carrito.find((i) => i.id_producto === p.id_producto)?.cantidad ?? 0;
                const agotado = Number(p.cantidad) - enCarrito <= 0;
                const bajo = Number(p.cantidad) <= Number(p.stock_minimo ?? 0);
                return (
                  <button
                    key={p.id_producto}
                    type="button"
                    className={`producto ${enCarrito ? "seleccionado" : ""}`}
                    disabled={agotado}
                    onClick={() => agregar(p)}
                  >
                    <span className="inicial">{p.descripcion.charAt(0)}</span>
                    {enCarrito > 0 && <span className="en-carrito">{formatearNumero(enCarrito)}</span>}
                    <strong>{p.descripcion}</strong>
                    <span className="precio">{dinero(p.precioventa)}</span>
                    <span className={`stock ${bajo ? "bajo" : ""}`}>
                      {agotado && !enCarrito ? "Agotado" : `${cantidadConUnidad(p.cantidad, p.unidad)} disponibles`}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EstadoVacio
              titulo={texto ? "Sin resultados" : "Sin productos en esta bodega"}
              mensaje={texto ? "Prueba con otro nombre." : "Traslada stock desde otra bodega o registra productos."}
              icono={<v.iconostock />}
            />
          )}
        </section>

        <aside className="ticket">
          <header>
            <div>
              <h2>Ticket</h2>
              <span>
                {formatearNumero(unidades)} unidades · {TiposBodega[bodegaActual?.tipo]?.etiqueta ?? ""}
              </span>
            </div>
            {carrito.length > 0 && (
              <button type="button" className="vaciar" onClick={() => setCarrito([])}>
                Vaciar
              </button>
            )}
          </header>

          <div className="cliente">
            <Selector
              opciones={opcionesClientes}
              valor={cliente}
              onChange={setCliente}
              buscable
              icono={<v.iconoclientes />}
              placeholder="Cliente"
            />
            <button type="button" className="mas" onClick={() => setNuevoCliente(true)} aria-label="Nuevo cliente" title="Nuevo cliente">
              <v.agregar />
            </button>
          </div>

          {carrito.length ? (
            <ul className="lineas">
              {lineas.map((l) => (
                <li key={l.id_producto}>
                  <div className="info">
                    <strong>{l.descripcion}</strong>
                    <span>
                      {dinero(l.precio)} por {abrev(l.unidad)} · máx. {cantidadConUnidad(l.disponible, l.unidad)}
                    </span>
                  </div>
                  <div className="cantidad">
                    <button type="button" onClick={() => cambiarCantidad(l.id_producto, l.cantidad - 1)} aria-label="Quitar uno">
                      <v.quitar />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step={permiteDecimales(l.unidad) ? "any" : "1"}
                      value={l.cantidad}
                      onChange={(e) => cambiarCantidad(l.id_producto, Number(e.target.value))}
                      aria-label={`Cantidad de ${l.descripcion}`}
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(l.id_producto, l.cantidad + 1)}
                      disabled={l.cantidad >= l.disponible}
                      aria-label="Agregar uno"
                    >
                      <v.agregar />
                    </button>
                  </div>
                  <span className="total">{dinero(l.bruto)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="vacio">
              <v.iconoventas />
              <p>Toca un producto para agregarlo al ticket.</p>
            </div>
          )}

          <div className="ajustes">
            <label>
              Descuento %
              <input
                type="number"
                min="0"
                max="100"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </label>
            <label>
              IVA %
              <input type="number" min="0" max="100" value={iva} onChange={(e) => setIvaPct(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label>
              Canal
              <select value={canal} onChange={(e) => setCanal(e.target.value)}>
                {Canales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.descripcion}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <PanelPagos
            total={redondear(totales.total)}
            pagos={pagos}
            setPagos={setPagos}
            wompiActivo={!!cfg.data?.wompi_activo}
            nequiActivo={!!cfg.data?.nequi_activo}
            breb={{ llave: cfg.data?.breb_llave, tipo: cfg.data?.breb_tipo_llave }}
            dinero={dinero}
          />

          <dl className="totales">
            <div>
              <dt>Subtotal</dt>
              <dd>{dinero(totales.subtotal)}</dd>
            </div>
            {totales.descuento > 0 && (
              <div>
                <dt>Descuento</dt>
                <dd>−{dinero(totales.descuento)}</dd>
              </div>
            )}
            <div>
              <dt>IVA ({formatearNumero(iva)}%)</dt>
              <dd>{dinero(totales.impuesto)}</dd>
            </div>
            <div className="final">
              <dt>Total</dt>
              <dd>{dinero(totales.total)}</dd>
            </div>
          </dl>

          <Boton
            tamano="lg"
            bloque
            icono={<v.iconolisto />}
            cargando={registrando}
            disabled={!carrito.length || limiteVentas || !!errorPagos}
            funcion={cobrar}
          >
            Cobrar {carrito.length ? dinero(totales.total) : ""}
          </Boton>
          {errorPagos && <small className="error-pago">{errorPagos}</small>}
        </aside>
      </Layout>

      {nuevoCliente && (
        <RegistrarContacto
          tipo="cliente"
          onClose={() => setNuevoCliente(false)}
          onGuardado={async (p) => {
            const lista = (await clientes.refetch()).data ?? [];
            const nuevo = lista.find((c) => c.nombre === p.nombre && (c.documento ?? null) === p.documento);
            if (nuevo) setCliente({ ...nuevo, descripcion: nuevo.nombre });
          }}
        />
      )}

      {resultado && (
        <Modal
          titulo={resultado.pendiente ? "Venta registrada, pago pendiente" : "¡Venta registrada!"}
          subtitulo={`Factura ${resultado.prefijo}-${resultado.numero} · ${dinero(resultado.total)}`}
          onClose={() => setResultado(null)}
          ancho="500px"
          pie={
            <>
              <Suspense fallback={<Boton variante="secundario" cargando disabled>Descargar PDF</Boton>}>
                <BotonFacturaPDF idVenta={resultado.id} />
              </Suspense>
              <Boton icono={<v.agregar />} funcion={() => setResultado(null)}>
                Nueva venta
              </Boton>
            </>
          }
        >
          <Exito>
            {Number(resultado.cambio) > 0 && (
              <div className="cambio">
                <span>Cambio para el cliente</span>
                <strong>{dinero(resultado.cambio)}</strong>
              </div>
            )}
            {resultado.nequi_qr && (
              <PagoNequiQR
                idVenta={resultado.id}
                dinero={dinero}
                onPagado={() => setResultado((r) => (r ? { ...r, pendiente: false } : r))}
              />
            )}
            <EnviarFactura idVenta={resultado.id} generarAlCargar={resultado.link_pago} />
          </Exito>
        </Modal>
      )}
    </PaginaTemplate>
  );
}

const Aviso = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.warningSoft};
  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;
  svg {
    color: ${({ theme }) => theme.warning};
    font-size: 20px;
    flex-shrink: 0;
  }
  a {
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
  @media ${Device.laptop} {
    grid-template-columns: minmax(0, 1fr) 380px;
  }

  .catalogo {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .filtros {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .buscar {
    flex: 1 1 240px;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 46px;
    padding: 0 16px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    &:focus-within {
      border-color: ${({ theme }) => theme.primary};
    }
    input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.95rem;
    }
  }
  .bodega {
    flex: 0 1 240px;
    min-width: 200px;
  }
  .productos {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  .producto {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 14px;
    text-align: left;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.surface};
    color: inherit;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.primary};
      box-shadow: ${({ theme }) => theme.shadow};
    }
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    &.seleccionado {
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.primarySoft};
    }
    strong {
      font-size: 0.9rem;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.6em;
    }
    .precio {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .stock {
      font-size: 0.75rem;
      color: ${({ theme }) => theme.textMuted};
      &.bajo {
        color: ${({ theme }) => theme.warning};
      }
    }
  }
  .inicial {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-bottom: 6px;
    border-radius: 12px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-weight: 700;
    font-size: 1.05rem;
    text-transform: uppercase;
  }
  .en-carrito {
    position: absolute;
    top: 12px;
    right: 12px;
    min-width: 26px;
    height: 26px;
    padding: 0 7px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 0.78rem;
    font-weight: 700;
  }

  .ticket {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    border-radius: ${({ theme }) => theme.radiusXl};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: ${({ theme }) => theme.shadow};
    @media ${Device.laptop} {
      position: sticky;
      top: 20px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      h2 {
        font-size: 1.15rem;
      }
      span {
        font-size: 0.8rem;
        color: ${({ theme }) => theme.textMuted};
      }
    }
  }
  .vaciar {
    border: none;
    background: none;
    color: ${({ theme }) => theme.danger};
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .cliente {
    display: flex;
    gap: 8px;
    > div {
      flex: 1;
      min-width: 0;
    }
  }
  .mas {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border: 1px dashed ${({ theme }) => theme.primary};
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    cursor: pointer;
    font-size: 18px;
  }
  .lineas {
    list-style: none;
    display: flex;
    flex-direction: column;
    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: "info total" "cantidad cantidad";
      gap: 8px;
      padding: 10px 0;
      & + li {
        border-top: 1px solid ${({ theme }) => theme.border};
      }
    }
    .info {
      grid-area: info;
      display: flex;
      flex-direction: column;
      min-width: 0;
      strong {
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      span {
        font-size: 0.75rem;
        color: ${({ theme }) => theme.textMuted};
      }
    }
    .total {
      grid-area: total;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  }
  .cantidad {
    grid-area: cantidad;
    display: inline-flex;
    align-items: center;
    width: max-content;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 999px;
    overflow: hidden;
    button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 30px;
      border: none;
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.text};
      cursor: pointer;
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
    input {
      width: 52px;
      height: 30px;
      border: none;
      text-align: center;
      background: transparent;
      font-weight: 600;
      outline: none;
      -moz-appearance: textfield;
      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        -webkit-appearance: none;
      }
    }
  }
  .vacio {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px 12px;
    border: 1.5px dashed ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusLg};
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.85rem;
    text-align: center;
    svg {
      font-size: 26px;
      color: ${({ theme }) => theme.primary};
    }
  }
  .ajustes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
      &:last-child {
        grid-column: 1 / -1;
      }
    }
    input,
    select {
      height: 38px;
      padding: 0 10px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radiusSm};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.9rem;
    }
  }
  .metodos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 4px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radius};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      svg {
        font-size: 18px;
      }
      &[aria-checked="true"] {
        border-color: ${({ theme }) => theme.primary};
        background: ${({ theme }) => theme.primarySoft};
        color: ${({ theme }) => theme.primary};
      }
    }
  }
  .totales {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.inkCard};
    color: ${({ theme }) => theme.inkText};
    div {
      display: flex;
      justify-content: space-between;
      font-size: 0.88rem;
    }
    dt {
      color: ${({ theme }) => theme.inkMuted};
    }
    dd {
      font-variant-numeric: tabular-nums;
    }
    .final {
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid ${({ theme }) => theme.inkBorder};
      font-size: 1.2rem;
      font-weight: 700;
      dt {
        color: inherit;
      }
    }
  }
  .error-pago {
    text-align: center;
    color: ${({ theme }) => theme.warning};
    font-size: 0.8rem;
  }
`;

const Exito = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  .cambio {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.successSoft};
    color: ${({ theme }) => theme.success};
    span {
      font-weight: 600;
    }
    strong {
      font-size: 1.5rem;
    }
  }
`;
