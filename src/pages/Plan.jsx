import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { BentoGrid, ListaTarjeta, Tarjeta } from "../Components/moleculas/Bento";
import { BarraUso } from "../Components/moleculas/BarraUso";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { usePlan } from "../hooks/usePlan";
import { Complementos } from "../Components/organismos/Complementos";
import { PruebaEnterprise } from "../Components/organismos/PruebaEnterprise";
import { CodigoPromo } from "../Components/organismos/CodigoPromo";
import {
  CambiarPlan,
  CotizarPlan,
  CrearPagoPlan,
  MostrarPagosPendientes,
  EstadoPagoPlan,
  MostrarPagosSuscripcion,
  VerificarPagoPlan,
} from "../supabase/crudSuscripcion";
import { MODULOS, esAdmin } from "../utils/permisos";
import { CORREO_STOCKLY } from "../utils/marca";
import { formatearFecha, formatearNumero } from "../utils/conversiones";
import { notificarError } from "../utils/notificaciones";
import { Device } from "../styles/breackpoints";
import { v } from "../styles/variables";

const DIAS_RENOVAR = 7;
const tituloPago = (pago) =>
  pago.tipo === "complemento"
    ? `¡Listo! ${(pago.complementos ?? []).map((x) => `${x.cantidad} × ${x.nombre}`).join(", ") || "Complemento"} activo`
    : `¡Listo! Plan ${pago.plan} activo`;
const cop = (n) => `$${formatearNumero(n)}`;
const n = (x) => formatearNumero(x);
const plural = (x, uno, varios) => `${n(x)} ${Number(x) === 1 ? uno : varios}`;
const espacio = (mb) => (mb >= 1024 ? `${n(Math.round(mb / 102.4) / 10)} GB` : `${n(mb)} MB`);
const pronto = (activo, texto) => (activo ? texto : `${texto} (próximamente)`);

function caracteristicas(p, ajustes) {
  const ia = ajustes?.novandra_ia_disponible === true;
  const dian = ajustes?.factura_electronica_disponible === true;
  return [
    `Hasta ${plural(p.limite_productos, "producto", "productos")}`,
    `${n(p.limite_ventas_mes)} ventas al mes`,
    `${plural(p.limite_bodegas, "bodega", "bodegas")} y ${plural(p.limite_sucursales, "sede", "sedes")}`,
    `${plural(p.limite_usuarios, "usuario", "usuarios")} del equipo`,
    `${n(p.limite_clientes)} clientes y ${n(p.limite_proveedores)} proveedores`,
    `${espacio(p.limite_archivos_mb)} para logo y facturas de proveedores`,
    "Novandra esencial: asistente que aprende de tu negocio",
    ...(p.novandra_ia
      ? [pronto(ia, `Novandra Max: tu agente de IA completo para consultas complejas, analíticas e inteligentes (${n(p.limite_novandra_mes)} consultas al mes)`)]
      : []),
    p.factura_electronica ? pronto(dian, "Factura electrónica DIAN") : "Factura en PDF y por WhatsApp",
    p.reportes_avanzados
      ? `Informe contable (${n(p.limite_informes_mes)} envíos al mes), inteligencia y auditoría`
      : "Reportes básicos",
  ];
}

export function Plan() {
  return (
    <ConPermiso modulo={MODULOS.suscripcion}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const { datausuario } = useUsuariosStore();
  const queryClient = useQueryClient();
  const { cargando, error, planes, plan, estado, ajustes, usado, limite, recargar } = usePlan();
  const [ciclo, setCiclo] = useState(null);
  const [trabajando, setTrabajando] = useState(null);
  const [params, setParams] = useSearchParams();
  const admin = esAdmin(datausuario);
  const pagos = useQuery({
    queryKey: ["pagos suscripcion", dataempresa?.id],
    queryFn: () => MostrarPagosSuscripcion(dataempresa.id),
    enabled: !!dataempresa?.id && admin,
  });

  // Regreso desde Wompi: ?pago=<referencia>&id=<transacción>.
  const verificado = useRef(false);
  useEffect(() => {
    const referencia = params.get("pago");
    if (!referencia || verificado.current) return;
    verificado.current = true;
    (async () => {
      Swal.fire({ title: "Confirmando tu pago…", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const idTransaccion = params.get("id");
        let resultado = await VerificarPagoPlan(idTransaccion ? { idTransaccion } : { referencia }).catch(() => null);
        let pago = resultado?.pago ?? (await EstadoPagoPlan(referencia));
        // Si Wompi aún no confirma, se espera unos segundos (el webhook también lo activa).
        for (let i = 0; i < 8 && pago?.estado === "pendiente"; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          pago = await EstadoPagoPlan(referencia);
        }
        await recargar();
        queryClient.invalidateQueries();
        if (pago?.estado === "aprobado") {
          Swal.fire({
            icon: "success",
            title: tituloPago(pago),
            html: `Pagaste <b>${cop(pago.total)}</b>. ${pago.tipo === "complemento" ? "Tu complemento" : "Tu plan"} está activo hasta el <b>${formatearFecha(pago.periodo_hasta)}</b>.<br/>Te enviamos el comprobante de pago a tu correo.`,
            confirmButtonColor: "#8800B3",
          });
        } else if (pago?.estado === "pendiente") {
          Swal.fire({
            icon: "info",
            title: "Tu pago está en proceso",
            text: "Apenas Wompi lo confirme, tu plan se activa solo y te avisamos en la campana.",
            confirmButtonColor: "#8800B3",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "El pago no se completó",
            text: "No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.",
            confirmButtonColor: "#8800B3",
          });
        }
      } catch (e) {
        Swal.fire({ icon: "error", title: "No pudimos confirmar el pago", text: e.message, confirmButtonColor: "#8800B3" });
      }
      setParams({}, { replace: true });
    })();
  }, [params, setParams, recargar, queryClient]);

  // Pagos que quedaron pendientes (Wompi no devolvió a la app o el aviso no llegó): se consultan
  // en Wompi al abrir esta pantalla y, si alguno quedó aprobado, se activa el plan.
  const revisados = useRef(false);
  useEffect(() => {
    if (revisados.current || !admin || !dataempresa?.id || params.get("pago")) return;
    revisados.current = true;
    (async () => {
      const pendientes = await MostrarPagosPendientes(dataempresa.id);
      if (!pendientes.length) return;
      let aprobado = null;
      for (const x of pendientes) {
        const r = await VerificarPagoPlan({ referencia: x.referencia }).catch(() => null);
        if (r?.pago?.estado === "aprobado") aprobado = r.pago;
      }
      await recargar();
      queryClient.invalidateQueries();
      if (aprobado) {
        Swal.fire({
          icon: "success",
          title: tituloPago(aprobado),
          html: `Pagaste <b>${cop(aprobado.total)}</b>. ${aprobado.tipo === "complemento" ? "Tu complemento" : "Tu plan"} está activo hasta el <b>${formatearFecha(aprobado.periodo_hasta)}</b>.<br/>Te enviamos el comprobante de pago a tu correo.`,
          confirmButtonColor: "#8800B3",
        });
      }
    })();
  }, [admin, dataempresa?.id, params, recargar, queryClient]);

  // Viene del registro con un plan de pago elegido: ?comprar=<plan>&ciclo=<ciclo>.
  const comprarRef = useRef(null);
  const compraIniciada = useRef(false);
  useEffect(() => {
    const idPlan = params.get("comprar");
    if (!idPlan || cargando || compraIniciada.current || !comprarRef.current) return;
    compraIniciada.current = true;
    const ciclo = params.get("ciclo") === "anual" ? "anual" : "mensual";
    setParams({}, { replace: true });
    const elegido = (planes ?? []).find((p) => p.id === idPlan);
    if (elegido && admin && estado?.plan_pagado !== idPlan) {
      setCiclo(ciclo);
      comprarRef.current(elegido, ciclo);
    }
  }, [params, setParams, cargando, planes, admin, estado]);

  if (cargando) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={recargar} />;

  const cicloActual = ciclo ?? (estado?.plan_pagado ? estado.ciclo : "mensual");
  const anual = cicloActual === "anual";
  const descuentoPct = estado?.primera_compra ? Number(estado?.descuento_primera_compra ?? 0) : 0;

  // Igual que en el servidor (stockly_cotizar_plan): con un plan pagado vigente, el mismo plan se
  // renueva solo en los últimos DIAS_RENOVAR días y no se puede comprar un plan menor.
  const planPagado = planes.find((x) => x.id === estado?.plan_pagado);
  // Pagos apagados (stockly_ajustes_globales.pagos_activos = false): las compras se activan sin Wompi.
  const modoPruebas = ajustes?.pagos_activos === false;
  function bloqueoCompra(p) {
    if (!planPagado || !estado?.vence_en) return null;
    const vence = new Date(estado.vence_en);
    // Mismo plan, pero de mensual a anual: se permite siempre (el año se suma).
    const aAnual = p.id === planPagado.id && estado.ciclo === "mensual" && anual;
    if (p.id === planPagado.id && !aAnual) {
      const desde = new Date(vence.getTime() - DIAS_RENOVAR * 864e5);
      if (Date.now() < desde.getTime()) {
        return estado.promo
          ? {
              boton: `Comprar desde el ${formatearFecha(desde)}`,
              nota: `Tienes ${planPagado.nombre} gratis hasta el ${formatearFecha(vence)}. Podrás comprarlo ${DIAS_RENOVAR} días antes y el tiempo se suma.`,
            }
          : {
              boton: `Renovar desde el ${formatearFecha(desde)}`,
              nota: `Tu plan está pagado hasta el ${formatearFecha(vence)}. Podrás renovarlo ${DIAS_RENOVAR} días antes y el tiempo se suma.`,
            };
      }
      return null;
    }
    if (Number(p.orden) < Number(planPagado.orden)) {
      return { boton: `Disponible al vencer tu plan`, nota: `Tu plan ${planPagado.nombre} está pagado hasta el ${formatearFecha(vence)}.` };
    }
    return null;
  }

  async function comprar(p, cicloElegido = cicloActual) {
    setTrabajando(p.id);
    try {
      const cot = await CotizarPlan({ idEmpresa: dataempresa.id, idPlan: p.id, ciclo: cicloElegido });
      const extras = cot.complementos ?? [];
      const { isConfirmed, value } = await Swal.fire({
        icon: "info",
        title: `Plan ${cot.nombre} ${cot.ciclo}`,
        html:
          (cot.descuento > 0
            ? `<s>${cop(cot.precio)}</s> &nbsp;<b style="font-size:1.4em">${cop(cot.precio - cot.descuento)}</b><br/><small>${cot.descuento_pct}% de descuento en tu primera compra</small>`
            : `<b style="font-size:1.4em">${cop(cot.precio)}</b>`) +
          (extras.length
            ? `<br/><br/><div style="text-align:left;font-size:.92em">Tus complementos para el nuevo periodo:<br/>${extras
                .map((x) => `· ${x.cantidad} × ${x.nombre}: <b>${cop(x.total)}</b>`)
                .join("<br/>")}<br/><br/>Total con complementos: <b>${cop(cot.total)}</b></div>`
            : "") +
          `<br/><br/>Pagas con Wompi: tarjeta, PSE, Nequi o Bancolombia. Es el precio final, sin cargos adicionales.` +
          (estado?.plan_pagado === p.id
            ? cicloElegido !== estado.ciclo
              ? `<br/>El año empieza cuando termine lo que ya pagaste (${formatearFecha(estado.vence_en)}), así no pierdes días.`
              : "<br/>El tiempo se suma al que te queda."
            : "") +
          (estado?.plan_pagado && estado.plan_pagado !== p.id
            ? `<br/><br/><b>Ojo:</b> tu plan actual está pagado hasta el ${formatearFecha(estado.vence_en)}. Al pagar, el plan ${cot.nombre} empieza hoy y reemplaza al actual.`
            : ""),
        ...(extras.length ? { input: "checkbox", inputValue: 1, inputPlaceholder: "Renovar también mis complementos" } : {}),
        showCancelButton: true,
        confirmButtonText: modoPruebas ? "Activar (modo pruebas)" : "Ir a pagar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#8800B3",
        reverseButtons: true,
      });
      if (!isConfirmed) return setTrabajando(null);
      const conComplementos = !extras.length || value === 1;
      const r = await CrearPagoPlan({ idEmpresa: dataempresa.id, idPlan: p.id, ciclo: cicloElegido, conComplementos });
      if (r.aplicado) {
        // Modo pruebas: se activó sin pasar por Wompi.
        await recargar();
        queryClient.invalidateQueries();
        setTrabajando(null);
        Swal.fire({
          icon: "success",
          title: `Plan ${cot.nombre} activo (modo pruebas)`,
          html: `Activo hasta el <b>${formatearFecha(r.pago?.periodo_hasta)}</b>. No se hizo ningún cobro.`,
          confirmButtonColor: "#8800B3",
        });
        return;
      }
      window.location.assign(r.url);
    } catch (e) {
      notificarError("No se pudo iniciar el pago", e.message);
      setTrabajando(null);
    }
  }

  comprarRef.current = comprar;

  async function bajarABasico() {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      title: "¿Pasar al plan Básico?",
      html: "Terminará tu prueba de Enterprise y tendrás los límites del plan Básico. Tus datos se conservan.",
      showCancelButton: true,
      confirmButtonText: "Sí, pasar a Básico",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setTrabajando("basico");
    if (await CambiarPlan({ idEmpresa: dataempresa.id, idPlan: "basico", ciclo: "mensual" })) await recargar();
    setTrabajando(null);
  }

  const estadoTexto = estado?.promo
    ? `Gratis con código promocional hasta el ${formatearFecha(estado.vence_en)} · ${estado.dias_restantes} días. Sin cobros: al terminar pasas al Básico.`
    : estado?.plan_pagado
    ? `Pagado hasta el ${formatearFecha(estado.vence_en)} · ${estado.dias_restantes} días`
    : estado?.en_prueba
      ? `Prueba de Enterprise · te quedan ${estado.dias_restantes} día${estado.dias_restantes === 1 ? "" : "s"}. Sin cobros: al terminar pasas al Básico gratis.`
      : estado?.vencido
        ? "Tu prueba o tu plan terminaron: estás en el plan Básico gratis"
        : "Plan gratuito";

  return (
    <PaginaTemplate
      titulo="Plan y suscripción"
      descripcion="Paga solo cuando quieras más. Tus datos, siempre contigo."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={5} colTablet={6} titulo="Tu plan" icono={<v.iconoplan />}>
          <Actual>
            <strong>{plan?.nombre}</strong>
            <span>{estadoTexto}</span>
            {descuentoPct > 0 && (
              <p>
                <Etiqueta tono="success">{descuentoPct}% de descuento</Etiqueta> en tu primera compra de Pro o Enterprise.
              </p>
            )}
          </Actual>
        </Tarjeta>
        <Tarjeta col={7} colTablet={6} titulo="Uso de este mes" icono={<v.iconorayo />}>
          <Usos>
            <BarraUso etiqueta="Productos" usado={usado("productos")} limite={limite("productos")} />
            <BarraUso etiqueta="Bodegas" usado={usado("bodegas")} limite={limite("bodegas")} />
            <BarraUso etiqueta="Sedes" usado={usado("sucursales")} limite={limite("sucursales")} />
            <BarraUso etiqueta="Usuarios" usado={usado("usuarios")} limite={limite("usuarios")} />
            <BarraUso etiqueta="Ventas del mes" usado={usado("ventas_mes")} limite={limite("ventas_mes")} />
            <BarraUso etiqueta="Clientes" usado={usado("clientes")} limite={limite("clientes")} />
            <BarraUso etiqueta="Proveedores" usado={usado("proveedores")} limite={limite("proveedores")} />
            <BarraUso etiqueta="Archivos (MB)" usado={usado("archivos_mb")} limite={limite("archivos_mb")} />
            {plan?.novandra_ia && ajustes?.novandra_ia_disponible === true && (
              <BarraUso etiqueta="Consultas a Novandra Max" usado={usado("novandra_mes")} limite={limite("novandra_mes")} />
            )}
          </Usos>
        </Tarjeta>
      </BentoGrid>

      {modoPruebas && admin && (
        <ModoPruebas>
          <strong>Modo pruebas:</strong> los pagos están desactivados. Comprar un plan, agregar complementos o empezar la prueba de
          Enterprise se activa al instante, sin Wompi y sin cobro.
        </ModoPruebas>
      )}
      {admin && (
        <PruebaEnterprise
          idEmpresa={dataempresa?.id}
          estado={estado}
          abrirAlCargar={params.get("prueba") === "1"}
          alAbrir={() => setParams({}, { replace: true })}
          alActivar={() => Promise.all([recargar(), queryClient.invalidateQueries()])}
        />
      )}
      {admin && (
        <CodigoPromo
          idEmpresa={dataempresa?.id}
          estado={estado}
          codigoInicial={params.get("codigo")}
          alUsarCodigoInicial={() => setParams({}, { replace: true })}
          alCanjear={() => Promise.all([recargar(), queryClient.invalidateQueries()])}
        />
      )}

      <Ciclo role="group" aria-label="Ciclo de facturación">
        <button type="button" aria-pressed={!anual} onClick={() => setCiclo("mensual")}>
          Mensual
        </button>
        <button type="button" aria-pressed={anual} onClick={() => setCiclo("anual")}>
          Anual <Etiqueta tono="success">2 meses gratis</Etiqueta>
        </button>
      </Ciclo>

      <Planes>
        {planes.map((p) => {
          const precio = anual ? Number(p.precio_anual) : Number(p.precio_mensual);
          const conDescuento = precio > 0 && descuentoPct > 0 ? Math.round(precio * (1 - descuentoPct / 100)) : null;
          // El plan comprado solo se marca en el ciclo con que se compró.
          const pagadoEste = estado?.plan_pagado === p.id && estado?.ciclo === cicloActual;
          const pasarAAnual = estado?.plan_pagado === p.id && estado?.ciclo === "mensual" && anual;
          const esBasico = p.id === "basico";
          const actualBasico = esBasico && plan?.id === "basico";
          const bloqueo = esBasico ? null : bloqueoCompra(p);
          return (
            <article key={p.id} className={`${p.destacado ? "destacado" : ""} ${pagadoEste || actualBasico ? "actual" : ""}`}>
              {p.destacado && <span className="cinta">Más elegido</span>}
              <h2>{p.nombre}</h2>
              <p className="descripcion">{p.descripcion}</p>
              <div className="precio">
                {precio ? (
                  <>
                    {conDescuento != null && <s>{cop(precio)}</s>}
                    <strong>{cop(conDescuento ?? precio)}</strong>
                    <span>/ {anual ? "año" : "mes"}</span>
                  </>
                ) : (
                  <strong>Gratis</strong>
                )}
              </div>
              {conDescuento != null && <small className="nota-precio">Primer {anual ? "año" : "mes"} con {descuentoPct}% de descuento · luego {cop(precio)}</small>}
              <ul>
                {caracteristicas(p, ajustes).map((c) => (
                  <li key={c} className={c.endsWith("(próximamente)") ? "pronto" : ""}>
                    <v.iconolisto /> {c}
                  </li>
                ))}
              </ul>
              {!admin ? (
                <Boton bloque variante="secundario" disabled>
                  Solo el dueño puede cambiar el plan
                </Boton>
              ) : esBasico ? (
                estado?.plan_pagado ? (
                  // Con un plan pagado vigente no se baja a Básico: se perdería lo pagado.
                  <>
                    <Boton bloque variante="secundario" disabled>
                      Pasas a Básico solo si no renuevas
                    </Boton>
                    <small className="nota-precio">Tu plan pagado sigue activo hasta el {formatearFecha(estado.vence_en)}.</small>
                  </>
                ) : (
                  <Boton bloque variante="secundario" disabled={actualBasico} cargando={trabajando === "basico"} funcion={bajarABasico}>
                    {actualBasico ? "Tu plan actual" : "Pasar a Básico"}
                  </Boton>
                )
              ) : bloqueo ? (
                // Plan pagado vigente: no se deja pagar de nuevo antes de tiempo ni bajar de plan.
                <>
                  <Boton bloque variante="secundario" disabled>
                    {bloqueo.boton}
                  </Boton>
                  <small className="nota-precio">{bloqueo.nota}</small>
                </>
              ) : (
                <Boton
                  bloque
                  variante={p.destacado ? "primario" : "secundario"}
                  icono={<v.iconotarjeta />}
                  cargando={trabajando === p.id}
                  disabled={!!trabajando && trabajando !== p.id}
                  funcion={() => comprar(p)}
                >
                  {pagadoEste && !estado?.promo ? `Renovar ${p.nombre}` : pagadoEste ? `Comprar ${p.nombre}` : pasarAAnual ? `Pasar a ${p.nombre} anual` : `Comprar ${p.nombre}`}
                </Boton>
              )}
            </article>
          );
        })}
      </Planes>

      <Complementos
        idEmpresa={dataempresa?.id}
        estado={estado}
        ajustes={ajustes}
        admin={admin}
        alActivar={() => Promise.all([recargar(), queryClient.invalidateQueries()])}
      />

      <BentoGrid>
        <Tarjeta variante="acento" col={6} colTablet={6} titulo="Pagos seguros con Wompi" icono={<v.iconotarjeta />}>
          <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.55 }}>
            Paga con tarjeta, PSE, Nequi o Bancolombia. Los precios son finales, sin cargos adicionales. No guardamos los datos de tu tarjeta. Antes de que
            venza tu plan te avisamos para renovarlo; si no renuevas, pasas al plan Básico sin perder tus datos. ¿Dudas? Escríbenos a{" "}
            <a href={`mailto:${CORREO_STOCKLY}`}>{CORREO_STOCKLY}</a>.
          </p>
        </Tarjeta>
        <Tarjeta col={6} colTablet={6} titulo="Tus pagos" icono={<v.iconofecha />}>
          {pagos.data?.length ? (
            <ListaTarjeta>
              {pagos.data.map((h) => (
                <li key={h.id}>
                  <span className="principal">
                    <strong>
                      {h.tipo === "complemento"
                        ? (h.complementos ?? []).map((x) => `${x.cantidad} × ${x.nombre}`).join(", ") || "Complemento"
                        : `${planes.find((p) => p.id === h.id_plan)?.nombre ?? h.id_plan} · ${h.ciclo}${h.complementos?.length ? " + complementos" : ""}`}
                    </strong>
                    <span>
                      {h.estado === "aprobado" ? `Hasta el ${formatearFecha(h.periodo_hasta)}` : "Rechazado"}
                      {h.metodo ? ` · ${h.metodo}` : ""}
                    </span>
                  </span>
                  <span className="dato">{cop(h.total)}</span>
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Aún no tienes pagos.
            </p>
          )}
        </Tarjeta>
      </BentoGrid>
    </PaginaTemplate>
  );
}

const Actual = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  strong {
    font-size: 2.2rem;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  span {
    color: var(--muted);
    font-size: 0.88rem;
  }
  p {
    margin-top: 6px;
    font-size: 0.92rem;
  }
`;

const ModoPruebas = styled.p`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radiusLg};
  border: 1px dashed ${({ theme }) => theme.warning ?? theme.primary};
  background: ${({ theme }) => theme.surface};
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Usos = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  @media ${Device.tablet} {
    grid-template-columns: 1fr 1fr;
  }
`;

const Ciclo = styled.div`
  align-self: center;
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 18px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    font-weight: 600;
    cursor: pointer;
    &[aria-pressed="true"] {
      background: ${({ theme }) => theme.ink};
      color: ${({ theme }) => theme.inkText};
    }
  }
`;

const Planes = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media ${Device.laptop} {
    grid-template-columns: repeat(3, 1fr);
  }
  article {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 26px 22px 22px;
    border-radius: ${({ theme }) => theme.radiusXl};
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    box-shadow: ${({ theme }) => theme.shadow};
    &.destacado {
      border: 2px solid ${({ theme }) => theme.primary};
    }
    &.actual {
      outline: 3px solid ${({ theme }) => theme.primarySoft};
    }
  }
  .cinta {
    position: absolute;
    top: -12px;
    left: 22px;
    padding: 4px 12px;
    border-radius: 999px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 0.75rem;
    font-weight: 700;
  }
  h2 {
    font-size: 1.3rem;
  }
  .descripcion {
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.9rem;
    min-height: 2.6em;
  }
  .precio {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    s {
      color: ${({ theme }) => theme.textMuted};
      font-size: 1rem;
    }
    strong {
      font-size: 2rem;
      letter-spacing: -0.03em;
    }
    span {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.85rem;
    }
  }
  .nota-precio {
    margin-top: -8px;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.success};
    font-weight: 600;
  }
  li.pronto {
    color: ${({ theme }) => theme.textMuted};
    svg {
      color: ${({ theme }) => theme.textMuted} !important;
    }
  }
  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      svg {
        flex-shrink: 0;
        color: ${({ theme }) => theme.primary};
      }
    }
  }
`;
