import { useEffect, useState } from "react";
import styled from "styled-components";
import Swal from "sweetalert2";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { BloqueoPagina } from "../Components/moleculas/BloqueoPagina";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { BentoGrid, Cifra, Tarjeta } from "../Components/moleculas/Bento";
import { Boton } from "../Components/atomos/Boton";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { MostrarConfigFacturacion } from "../supabase/crudFacturacion";
import { EnviarInformeContador, GuardarContador, HistorialInformes, InformeContable as ConsultarInforme } from "../supabase/crudInforme";
import { SECCIONES_INFORME, construirInforme, periodosInforme } from "../utils/informeContable";
import { formatearMonedaCorta, formatearNumero, tiempoRelativo } from "../utils/conversiones";
import { notificarError, notificarExito } from "../utils/notificaciones";
import { esAdmin } from "../utils/permisos";
import { v } from "../styles/variables";

export function InformeContable() {
  const { datausuario } = useUsuariosStore();
  if (!esAdmin(datausuario)) return <BloqueoPagina modulo="Informe para el contador (solo dueño o administradores)" />;
  return <Contenido />;
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const id = dataempresa?.id;
  const dinero = (x) => formatearMonedaCorta(Math.round(Number(x ?? 0)), dataempresa?.simbolomoneda ?? "$");

  const periodos = periodosInforme();
  const [periodo, setPeriodo] = useState(periodos[0]);
  const [secciones, setSecciones] = useState(SECCIONES_INFORME.map((s) => s.id));
  const [nota, setNota] = useState("");
  const [modo, setModo] = useState("detallado"); // detallado | general
  const [adjuntarFacturas, setAdjuntarFacturas] = useState(true);
  const [trabajando, setTrabajando] = useState(null); // "descargar" | "enviar"

  const cfg = useQuery({ queryKey: ["config facturacion", id], queryFn: () => MostrarConfigFacturacion(id), enabled: !!id });
  const [contador, setContador] = useState({ nombre: "", email: "" });
  useEffect(() => {
    if (cfg.data) setContador({ nombre: cfg.data.contador_nombre ?? "", email: cfg.data.contador_email ?? "" });
  }, [cfg.data]);
  const contadorGuardado = cfg.data?.contador_email ?? "";
  const contadorCambio = contador.email.trim().toLowerCase() !== contadorGuardado || contador.nombre.trim() !== (cfg.data?.contador_nombre ?? "");

  const informe = useQuery({
    queryKey: ["informe contable", id, periodo.desde, periodo.hasta],
    queryFn: () => ConsultarInforme(id, periodo.desde, periodo.hasta),
    enabled: !!id && periodo.desde <= periodo.hasta,
  });
  const historial = useQuery({ queryKey: ["informes contador", id], queryFn: () => HistorialInformes(id), enabled: !!id });

  const r = informe.data?.resumen ?? {};
  const porCobrar = (informe.data?.por_cobrar ?? []).reduce((a, x) => a + Number(x.saldo), 0);
  const facturasProveedor = (informe.data?.compras ?? []).filter((c) => c.factura_archivo).length;

  async function guardarContador() {
    try {
      await GuardarContador(id, contador.nombre, contador.email);
      await queryClient.invalidateQueries({ queryKey: ["config facturacion", id] });
      notificarExito("Datos del contador guardados");
    } catch (e) {
      notificarError("No se pudo guardar", e.message);
    }
  }

  async function descargar() {
    setTrabajando("descargar");
    try {
      const archivo = await construirInforme(informe.data, secciones, modo);
      archivo.descargar();
    } catch (e) {
      notificarError("No se pudo generar el Excel", e.message);
    }
    setTrabajando(null);
  }

  async function enviar() {
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "¿Enviar el informe a tu contador?",
      html: `Se enviará a <b>${contadorGuardado}</b> con copia a tu correo.<br/>Periodo: ${periodo.desde} a ${periodo.hasta}.`,
      showCancelButton: true,
      confirmButtonText: "Sí, enviar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setTrabajando("enviar");
    try {
      const archivo = await construirInforme(informe.data, secciones, modo);
      const res = await EnviarInformeContador({
        id_empresa: id,
        desde: periodo.desde,
        hasta: periodo.hasta,
        archivo: archivo.base64(),
        nombre_archivo: archivo.nombre,
        nota: nota.trim() || null,
        resumen: { ...r, por_cobrar: porCobrar },
        adjuntar_facturas: secciones.includes("compras") && adjuntarFacturas && facturasProveedor > 0,
      });
      const extra = res.adjuntas ? ` con ${res.adjuntas} factura(s) de proveedores` : res.enlaces ? " con enlaces a las facturas de proveedores" : "";
      notificarExito(`Informe enviado a ${res.email}${extra}`);
      setNota("");
      historial.refetch();
    } catch (e) {
      notificarError("No se pudo enviar el informe", e.message);
    }
    setTrabajando(null);
  }

  const elegirPeriodo = (p) => setPeriodo(p);
  const alternar = (s) => setSecciones((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));
  const listo = informe.data && !informe.isFetching;

  return (
    <PaginaTemplate
      titulo="Informe para el contador"
      descripcion="Elige el periodo y envía a tu contador un Excel con ventas, IVA, cobros, cartera, compras e inventario."
    >
      <Periodo>
        <div className="chips" role="group" aria-label="Periodo">
          {periodos.map((p) => (
            <button key={p.id} type="button" aria-pressed={periodo.id === p.id} onClick={() => elegirPeriodo(p)}>
              {p.texto}
            </button>
          ))}
          <button type="button" aria-pressed={periodo.id === "personalizado"} onClick={() => setPeriodo({ ...periodo, id: "personalizado" })}>
            Personalizado
          </button>
        </div>
        <div className="fechas">
          <label>
            Desde
            <input type="date" value={periodo.desde} max={periodo.hasta} onChange={(e) => setPeriodo({ ...periodo, id: "personalizado", desde: e.target.value })} />
          </label>
          <label>
            Hasta
            <input type="date" value={periodo.hasta} min={periodo.desde} onChange={(e) => setPeriodo({ ...periodo, id: "personalizado", hasta: e.target.value })} />
          </label>
        </div>
      </Periodo>

      {informe.error ? (
        <ErrorMolecula mensaje={informe.error.message} reintentar={informe.refetch} />
      ) : (
        <BentoGrid>
          <Tarjeta col={4} colTablet={3} variante="tinta" titulo="Total ventas" icono={<v.iconoventas />}>
            <Cifra>
              <span className="valor">{listo ? dinero(r.total) : "…"}</span>
              <span className="detalle">
                {formatearNumero(r.facturas)} facturas{r.anuladas ? ` · ${formatearNumero(r.anuladas)} anuladas` : ""}
              </span>
            </Cifra>
          </Tarjeta>
          <Tarjeta col={4} colTablet={3} titulo="IVA generado" icono={<v.iconoporcentaje />}>
            <Cifra>
              <span className="valor">{listo ? dinero(r.iva) : "…"}</span>
              <span className="detalle">Base gravable {listo ? dinero(r.base) : "…"}</span>
            </Cifra>
          </Tarjeta>
          <Tarjeta col={4} colTablet={6} titulo="Cobrado en el periodo" icono={<v.iconoefectivo />}>
            <Cifra>
              <span className="valor">{listo ? dinero(r.cobrado) : "…"}</span>
              <span className="detalle">
                Por cobrar {listo ? dinero(porCobrar) : "…"} · Compras {listo ? dinero(r.compras) : "…"}
              </span>
            </Cifra>
          </Tarjeta>
        </BentoGrid>
      )}

      <Columnas>
        <Bloque>
          <h2>Tipo de informe</h2>
          <div className="modos" role="radiogroup" aria-label="Tipo de informe">
            <button type="button" role="radio" aria-checked={modo === "general"} onClick={() => setModo("general")}>
              <strong>General</strong>
              <small>Totales agrupados: ventas por día o mes, cartera por cliente, compras por proveedor, inventario por categoría.</small>
            </button>
            <button type="button" role="radio" aria-checked={modo === "detallado"} onClick={() => setModo("detallado")}>
              <strong>Detallado</strong>
              <small>Línea por línea: cada factura, cada compra con lo comprado, cada producto y cada movimiento.</small>
            </button>
          </div>
          <h2>Qué incluir</h2>
          <p className="ayuda">El resumen siempre va. Las ventas anuladas aparecen marcadas y no suman.</p>
          <ul className="secciones">
            {SECCIONES_INFORME.map((s) => (
              <li key={s.id}>
                <label className={secciones.includes(s.id) ? "activa" : ""}>
                  <input type="checkbox" checked={secciones.includes(s.id)} onChange={() => alternar(s.id)} />
                  <span>
                    <strong>{s.titulo}</strong>
                    <small>{s.texto}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {secciones.includes("compras") && (
            <label className={`adjuntar ${facturasProveedor ? "" : "inactivo"}`}>
              <input
                type="checkbox"
                checked={adjuntarFacturas && facturasProveedor > 0}
                disabled={!facturasProveedor}
                onChange={(e) => setAdjuntarFacturas(e.target.checked)}
              />
              <span>
                <strong>Adjuntar facturas de proveedores al correo</strong>
                <small>
                  {facturasProveedor
                    ? `${facturasProveedor} factura(s) adjunta(s) en las compras recibidas de este periodo.`
                    : "Ninguna compra de este periodo tiene la factura del proveedor adjunta. Puedes subirla desde Compras."}
                </small>
              </span>
            </label>
          )}
        </Bloque>

        <Bloque>
          <h2>Tu contador</h2>
          <div className="campos">
            <label>
              Nombre
              <input value={contador.nombre} onChange={(e) => setContador({ ...contador, nombre: e.target.value })} placeholder="Ej.: Ana Gómez" />
            </label>
            <label>
              Correo
              <input
                type="email"
                value={contador.email}
                onChange={(e) => setContador({ ...contador, email: e.target.value })}
                placeholder="contador@correo.com"
              />
            </label>
            {contadorCambio && (
              <Boton variante="secundario" tamano="sm" icono={<v.iconoguardar />} funcion={guardarContador} disabled={!contador.email.trim()}>
                Guardar contador
              </Boton>
            )}
          </div>

          <label className="nota">
            Nota para tu contador (opcional)
            <textarea rows={3} value={nota} maxLength={1000} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: Este mes hubo una devolución a un cliente." />
          </label>

          <div className="acciones">
            <Boton variante="secundario" icono={<v.iconoexcel />} cargando={trabajando === "descargar"} disabled={!listo || !!trabajando} funcion={descargar}>
              Descargar Excel
            </Boton>
            <Boton
              icono={<v.iconoenviar />}
              cargando={trabajando === "enviar"}
              disabled={!listo || !!trabajando || !contadorGuardado || contadorCambio}
              funcion={enviar}
              title={!contadorGuardado ? "Guarda primero el correo de tu contador" : undefined}
            >
              Enviar a mi contador
            </Boton>
          </div>
          {!contadorGuardado && <small className="ayuda">Guarda el correo de tu contador para enviarle el informe.</small>}

          {historial.data?.length > 0 && (
            <div className="historial">
              <span>Últimos envíos</span>
              <ul>
                {historial.data.map((h) => (
                  <li key={h.id}>
                    <strong>
                      {h.desde} a {h.hasta}
                    </strong>
                    <small>
                      a {h.email} · {tiempoRelativo(h.created_at)}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Bloque>
      </Columnas>
    </PaginaTemplate>
  );
}

const Periodo = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    button {
      height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      &[aria-pressed="true"] {
        background: ${({ theme }) => theme.ink};
        border-color: ${({ theme }) => theme.ink};
        color: ${({ theme }) => theme.inkText};
      }
    }
  }
  .fechas {
    display: flex;
    gap: 10px;
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.74rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    input {
      height: 38px;
      padding: 0 10px;
      border-radius: ${({ theme }) => theme.radiusSm};
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
    }
  }
`;

const Columnas = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media (min-width: 1000px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Bloque = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  h2 {
    font-size: 1.05rem;
  }
  .ayuda {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .modos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    button {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border-radius: ${({ theme }) => theme.radius};
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      text-align: left;
      cursor: pointer;
      small {
        font-size: 0.76rem;
        color: ${({ theme }) => theme.textMuted};
        line-height: 1.4;
      }
      &[aria-checked="true"] {
        border-color: ${({ theme }) => theme.primary};
        background: ${({ theme }) => theme.primarySoft};
        strong {
          color: ${({ theme }) => theme.primary};
        }
      }
    }
  }
  .adjuntar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radius};
    border: 1px dashed ${({ theme }) => theme.primary};
    cursor: pointer;
    &.inactivo {
      border-color: ${({ theme }) => theme.border};
      cursor: default;
      opacity: 0.8;
    }
    input {
      width: 18px;
      height: 18px;
      accent-color: ${({ theme }) => theme.primary};
      flex-shrink: 0;
    }
    span {
      display: flex;
      flex-direction: column;
    }
    small {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .secciones {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    label {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: ${({ theme }) => theme.radius};
      border: 1px solid ${({ theme }) => theme.border};
      cursor: pointer;
      &.activa {
        border-color: ${({ theme }) => theme.primary};
        background: ${({ theme }) => theme.primarySoft};
      }
    }
    input {
      width: 18px;
      height: 18px;
      accent-color: ${({ theme }) => theme.primary};
      flex-shrink: 0;
    }
    span {
      display: flex;
      flex-direction: column;
    }
    small {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .campos {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    align-items: end;
    > button {
      grid-column: 1 / -1;
      justify-self: start;
    }
  }
  .campos label,
  .nota {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${({ theme }) => theme.textMuted};
    input,
    textarea {
      padding: 10px 12px;
      border-radius: ${({ theme }) => theme.radiusSm};
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.9rem;
      font-weight: 400;
    }
    textarea {
      resize: vertical;
    }
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }
  .historial {
    padding-top: 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    > span {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${({ theme }) => theme.textMuted};
    }
    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 0.84rem;
      small {
        color: ${({ theme }) => theme.textMuted};
      }
    }
  }
`;
