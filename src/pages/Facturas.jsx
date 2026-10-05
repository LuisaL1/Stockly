import { lazy, Suspense, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { Modal } from "../Components/moleculas/Modal";
import { BentoGrid, Cifra, Tarjeta } from "../Components/moleculas/Bento";
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { Buscador } from "../Components/organismos/Buscador";
import { Boton } from "../Components/atomos/Boton";
import { EtiquetaEstado } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { AnularVenta, EnviarFacturaDian, MostrarVentas, RegistrarPago } from "../supabase/crudVentas";
import { MostrarConfigFacturacion } from "../supabase/crudFacturacion";
import { Bancos, Canales, Franquicias, NombresMetodo } from "../utils/dataEstatica";
import { EnviarFactura } from "../Components/organismos/ventas/EnviarFactura";
import { PagoNequiQR } from "../Components/organismos/ventas/PagoNequiQR";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { MODULOS } from "../utils/permisos";
import { notificarAviso, notificarExito } from "../utils/notificaciones";
import { formatearMonedaCorta, formatearNumero } from "../utils/conversiones";
import { v } from "../styles/variables";

const BotonFacturaPDF = lazy(() => import("../Components/organismos/ventas/FacturaPDF"));

const PERIODOS = [
  { id: 7, texto: "7 días" },
  { id: 30, texto: "30 días" },
  { id: 90, texto: "90 días" },
  { id: 365, texto: "1 año" },
];

const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const facturaDe = (venta) => (Array.isArray(venta.facturas) ? venta.facturas[0] : venta.facturas);

export function Facturas() {
  return (
    <ConPermiso modulo={MODULOS.ventas}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const dinero = (n) => formatearMonedaCorta(n, dataempresa?.simbolomoneda ?? "$");
  const [dias, setDias] = useState(30);
  const [estado, setEstado] = useState("");
  const [texto, setTexto] = useState("");
  const [detalle, setDetalle] = useState(null);

  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const ventas = useQuery({
    queryKey: ["ventas", idEmpresa, dias, estado, texto],
    queryFn: () => MostrarVentas({ idEmpresa, desde, estado: estado || undefined, texto }),
    enabled: !!idEmpresa,
    placeholderData: (previo) => previo,
  });

  if (ventas.isLoading) return <SpinnerLoader />;
  if (ventas.error) return <ErrorMolecula mensaje={ventas.error.message} reintentar={ventas.refetch} />;

  const filas = ventas.data ?? [];
  const validas = filas.filter((f) => f.estado !== "anulada");
  const facturado = validas.reduce((acc, f) => acc + Number(f.total), 0);
  const pendientes = filas.filter((f) => f.estado === "pendiente");

  const columns = [
    {
      id: "numero",
      header: "Factura",
      accessorFn: (f) => `${f.prefijo}-${f.numero}`,
      cell: ({ row }) => <strong>{`${row.original.prefijo}-${row.original.numero}`}</strong>,
    },
    { accessorKey: "fecha", header: "Fecha", cell: (i) => fechaHora(i.getValue()) },
    { id: "cliente", header: "Cliente", accessorFn: (f) => f.clientes?.nombre ?? "Consumidor final" },
    {
      accessorKey: "metodo_pago",
      header: "Pago",
      cell: (i) => NombresMetodo[i.getValue()] ?? i.getValue(),
    },
    { accessorKey: "total", header: "Total", meta: { align: "right" }, cell: (i) => <strong>{dinero(i.getValue())}</strong> },
    { accessorKey: "estado", header: "Estado", cell: (i) => <EtiquetaEstado estado={i.getValue()} /> },
    {
      id: "dian",
      header: "DIAN",
      accessorFn: (f) => facturaDe(f)?.estado_dian ?? "no_aplica",
      cell: (i) => <EtiquetaEstado estado={i.getValue()} />,
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => (
        <Boton variante="fantasma" tamano="sm" icono={<v.iconoabrir />} funcion={() => setDetalle(row.original)}>
          Ver
        </Boton>
      ),
    },
  ];

  return (
    <PaginaTemplate
      titulo="Facturas"
      descripcion="Historial de ventas con su factura, estado de pago y estado ante la DIAN."
      acciones={
        <Link to="/ventas" style={{ textDecoration: "none" }}>
          <Boton icono={<v.agregar />}>Nueva venta</Boton>
        </Link>
      }
      herramientas={
        <>
          <Buscador setBuscador={setTexto} placeholder="Número, cliente o documento…" />
          <Select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>
                Últimos {p.texto}
              </option>
            ))}
          </Select>
          <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="pagada">Pagadas</option>
            <option value="pendiente">Pendientes de pago</option>
            <option value="anulada">Anuladas</option>
          </Select>
        </>
      }
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={4} colTablet={2} decoracion titulo="Facturado" icono={<v.iconoprecioventa />}>
          <Cifra>
            <span className="valor">{dinero(facturado)}</span>
            <span className="detalle">{formatearNumero(validas.length)} facturas válidas</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={4} colTablet={2} titulo="Ticket promedio" icono={<v.iconofacturas />}>
          <Cifra>
            <span className="valor">{dinero(validas.length ? Math.round(facturado / validas.length) : 0)}</span>
            <span className="detalle">En el periodo</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta variante="acento" col={4} colTablet={2} titulo="Por cobrar" icono={<v.iconofecha />}>
          <Cifra>
            <span className="valor">{dinero(pendientes.reduce((acc, f) => acc + Number(f.total), 0))}</span>
            <span className="detalle">{formatearNumero(pendientes.length)} ventas a crédito</span>
          </Cifra>
        </Tarjeta>
      </BentoGrid>

      <DataTable
        data={filas}
        columns={columns}
        vacio={<EstadoVacio titulo="Sin facturas" mensaje="Las ventas que registres aparecerán aquí." icono={<v.iconofacturas />} />}
      />

      {detalle && (
        <DetalleVenta
          venta={detalle}
          dinero={dinero}
          onClose={() => setDetalle(null)}
          onCambio={(nueva) => {
            setDetalle(nueva);
            ventas.refetch();
          }}
        />
      )}
    </PaginaTemplate>
  );
}

function DetalleVenta({ venta, dinero, onClose, onCambio }) {
  const queryClient = useQueryClient();
  const { dataempresa } = useEmpresaStore();
  const [trabajando, setTrabajando] = useState(null);
  const [abono, setAbono] = useState(null);
  const [mostrarQR, setMostrarQR] = useState(false);
  const factura = facturaDe(venta);
  const pagos = venta.pagos_venta ?? [];
  const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
  const saldo = Math.max(Number(venta.total) - pagado, 0);

  async function guardarAbono() {
    setTrabajando("abono");
    const r = await RegistrarPago({
      idVenta: venta.id,
      pago: { ...abono, monto: Number(abono.monto), referencia: abono.referencia || null },
    });
    setTrabajando(null);
    if (r) {
      setAbono(null);
      queryClient.invalidateQueries();
      onCambio({
        ...venta,
        estado: r.estado,
        pagos_venta: [...pagos, { id: `nuevo-${Date.now()}`, ...abono, monto: Number(abono.monto), estado: "aprobado" }].map((p) =>
          r.estado === "pagada" && p.estado === "pendiente" ? { ...p, estado: "anulado" } : p
        ),
      });
    }
  }
  const cfg = useQuery({
    queryKey: ["config facturacion", dataempresa?.id],
    queryFn: () => MostrarConfigFacturacion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });

  async function anular() {
    const { isConfirmed, value } = await Swal.fire({
      icon: "warning",
      title: `¿Anular ${venta.prefijo}-${venta.numero}?`,
      text: "El stock vuelve a la bodega y la factura queda anulada. No se puede deshacer.",
      input: "text",
      inputPlaceholder: "Motivo (opcional)",
      showCancelButton: true,
      confirmButtonText: "Sí, anular",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#DC2626",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setTrabajando("anular");
    const ok = await AnularVenta({ id: venta.id, motivo: value });
    setTrabajando(null);
    if (ok) {
      queryClient.invalidateQueries();
      onCambio({ ...venta, estado: "anulada", facturas: { ...factura, estado: "anulada" } });
    }
  }

  async function enviarDian() {
    setTrabajando("dian");
    const r = await EnviarFacturaDian(factura.id);
    setTrabajando(null);
    if (r.ok) {
      notificarExito("Factura enviada a la DIAN");
      onCambio({ ...venta, facturas: { ...factura, estado_dian: r.data.estado, cufe: r.data.cufe } });
    } else {
      notificarAviso("Factura electrónica pendiente", r.mensaje);
    }
  }

  const puedeDian =
    cfg.data?.electronica_activa && venta.estado !== "anulada" && !["enviada", "aceptada"].includes(factura?.estado_dian);

  return (
    <Modal
      titulo={`Factura ${venta.prefijo}-${venta.numero}`}
      subtitulo={`${fechaHora(venta.fecha)} · ${venta.bodegas?.nombre ?? ""} · ${
        Canales.find((c) => c.id === venta.canal)?.descripcion ?? venta.canal
      }`}
      onClose={onClose}
      ancho="620px"
      pie={
        <>
          {venta.estado !== "anulada" && (
            <Boton variante="peligro" icono={<v.iconoanular />} cargando={trabajando === "anular"} funcion={anular}>
              Anular
            </Boton>
          )}
          {puedeDian && (
            <Boton variante="secundario" icono={<v.iconoenviar />} cargando={trabajando === "dian"} funcion={enviarDian}>
              Enviar a DIAN
            </Boton>
          )}
          <Suspense fallback={<Boton cargando disabled>Descargar PDF</Boton>}>
            <BotonFacturaPDF idVenta={venta.id} variante="primario" />
          </Suspense>
        </>
      }
    >
      <Detalle>
        <div className="estados">
          <EtiquetaEstado estado={venta.estado} />
          <EtiquetaEstado estado={factura?.estado_dian ?? "no_aplica"} />
          <span className="cliente">
            <v.iconoclientes /> {venta.clientes?.nombre ?? "Consumidor final"}
            {venta.clientes?.documento ? ` · ${venta.clientes.tipo_documento} ${venta.clientes.documento}` : ""}
          </span>
        </div>
        <ul>
          {venta.detalle_venta.map((d) => (
            <li key={d.id}>
              <span>
                <strong>{d.descripcion}</strong>
                <small>
                  {formatearNumero(d.cantidad)} × {dinero(d.precio_unitario)}
                  {Number(d.descuento) ? ` · desc. ${dinero(d.descuento)}` : ""} · IVA {formatearNumero(d.iva)}%
                </small>
              </span>
              <strong>{dinero(d.total)}</strong>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{dinero(venta.subtotal)}</dd>
          </div>
          {Number(venta.descuento) > 0 && (
            <div>
              <dt>Descuentos</dt>
              <dd>−{dinero(venta.descuento)}</dd>
            </div>
          )}
          <div>
            <dt>IVA</dt>
            <dd>{dinero(venta.impuesto)}</dd>
          </div>
          <div className="total">
            <dt>Total</dt>
            <dd>{dinero(venta.total)}</dd>
          </div>
        </dl>
        <div className="pagos">
          <h3>Pagos</h3>
          {pagos.length ? (
            <ul>
              {pagos.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{NombresMetodo[p.metodo] ?? p.metodo}</strong>
                    <small>
                      {[
                        p.franquicia,
                        p.banco,
                        p.referencia && `Ref. ${p.referencia}`,
                        p.recibido && `Recibió ${dinero(p.recibido)} · cambio ${dinero(p.cambio)}`,
                        new Date(p.confirmado_en ?? p.created_at).toLocaleDateString("es-CO"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <span className="monto">
                    {dinero(p.monto)}
                    <Etiqueta
                      tono={p.estado === "aprobado" ? "success" : p.estado === "pendiente" ? "warning" : "neutro"}
                    >
                      {p.estado === "aprobado"
                        ? "Recibido"
                        : p.estado === "pendiente"
                        ? "Pendiente"
                        : p.metodo === "credito" || p.metodo === "link_pago"
                        ? "Saldado"
                        : "Anulado"}
                    </Etiqueta>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="nota">Sin pagos registrados.</p>
          )}
          {pagos.some((p) => p.metodo === "nequi_qr" && p.estado === "pendiente") &&
            venta.estado !== "anulada" &&
            (mostrarQR ? (
              <PagoNequiQR idVenta={venta.id} dinero={dinero} onPagado={() => onCambio({ ...venta, estado: "pagada" })} />
            ) : (
              <Boton variante="secundario" tamano="sm" icono={<v.iconocodigobarras />} funcion={() => setMostrarQR(true)}>
                Mostrar QR de Nequi
              </Boton>
            ))}
          {saldo > 0 && venta.estado !== "anulada" && (
            abono ? (
              <div className="abono">
                <select value={abono.metodo} onChange={(e) => setAbono({ ...abono, metodo: e.target.value })} aria-label="Medio">
                  {["efectivo", "datafono", "bre_b", "nequi", "daviplata"].map((m) => (
                    <option key={m} value={m}>
                      {NombresMetodo[m]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  max={saldo}
                  value={abono.monto}
                  onChange={(e) => setAbono({ ...abono, monto: e.target.value })}
                  aria-label="Valor"
                />
                {abono.metodo === "datafono" && (
                  <select value={abono.franquicia ?? ""} onChange={(e) => setAbono({ ...abono, franquicia: e.target.value })} aria-label="Franquicia">
                    <option value="">Franquicia…</option>
                    {Franquicias.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                )}
                {abono.metodo === "bre_b" && (
                  <select value={abono.banco ?? ""} onChange={(e) => setAbono({ ...abono, banco: e.target.value })} aria-label="Banco de origen">
                    <option value="">Banco de origen…</option>
                    {Bancos.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                )}
                {abono.metodo !== "efectivo" && (
                  <input
                    placeholder={abono.metodo === "datafono" ? "N.º aprobación" : "Referencia"}
                    value={abono.referencia ?? ""}
                    onChange={(e) => setAbono({ ...abono, referencia: e.target.value })}
                  />
                )}
                <Boton tamano="sm" cargando={trabajando === "abono"} funcion={guardarAbono} disabled={!(Number(abono.monto) > 0)}>
                  Guardar
                </Boton>
                <Boton tamano="sm" variante="fantasma" funcion={() => setAbono(null)}>
                  Cancelar
                </Boton>
              </div>
            ) : (
              <Boton
                variante="secundario"
                tamano="sm"
                icono={<v.agregar />}
                funcion={() => setAbono({ metodo: "efectivo", monto: saldo, referencia: "" })}
              >
                Registrar pago · saldo {dinero(saldo)}
              </Boton>
            )
          )}
        </div>

        {venta.estado !== "anulada" && (
          <div className="enviar">
            <h3>Enviar al cliente</h3>
            <EnviarFactura idVenta={venta.id} />
          </div>
        )}

        {venta.nota && <p className="nota">{venta.nota}</p>}
        {factura?.cufe && <p className="nota">CUFE: {factura.cufe}</p>}
      </Detalle>
    </Modal>
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

const Detalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  .estados {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .cliente {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.textMuted};
  }
  ul {
    list-style: none;
    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid ${({ theme }) => theme.border};
      span {
        display: flex;
        flex-direction: column;
      }
      small {
        color: ${({ theme }) => theme.textMuted};
      }
    }
  }
  dl {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: auto;
    width: min(260px, 100%);
    div {
      display: flex;
      justify-content: space-between;
    }
    dt {
      color: ${({ theme }) => theme.textMuted};
    }
    .total {
      margin-top: 4px;
      padding-top: 6px;
      border-top: 2px solid ${({ theme }) => theme.primary};
      font-weight: 700;
      font-size: 1.1rem;
      dt {
        color: inherit;
      }
    }
  }
  .nota {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
    overflow-wrap: anywhere;
  }
  .pagos,
  .enviar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px solid ${({ theme }) => theme.border};
    h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${({ theme }) => theme.textMuted};
    }
    li {
      border-bottom: none;
      padding: 6px 0;
    }
    .monto {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      white-space: nowrap;
    }
  }
  .abono {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    select,
    input {
      height: 36px;
      padding: 0 10px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radiusSm};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      min-width: 0;
      flex: 1 1 110px;
    }
  }
`;
