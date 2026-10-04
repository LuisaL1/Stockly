import { useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { usePlan } from "../hooks/usePlan";
import { CambiarPlan, MostrarHistorialSuscripcion } from "../supabase/crudSuscripcion";
import { MODULOS } from "../utils/permisos";
import { formatearFecha, formatearNumero } from "../utils/conversiones";
import { Device } from "../styles/breackpoints";
import { v } from "../styles/variables";

const cop = (n) => `$${formatearNumero(n)}`;
const limiteTexto = (n, unidad) => (n == null ? `${unidad} ilimitados` : `Hasta ${formatearNumero(n)} ${unidad}`);

function caracteristicas(p) {
  return [
    limiteTexto(p.limite_productos, "productos"),
    p.limite_bodegas == null ? "Bodegas ilimitadas" : `${formatearNumero(p.limite_bodegas)} bodega${p.limite_bodegas === 1 ? "" : "s"}`,
    limiteTexto(p.limite_usuarios, "usuarios"),
    p.limite_ventas_mes == null ? "Ventas ilimitadas" : `${formatearNumero(p.limite_ventas_mes)} ventas al mes`,
    `${formatearNumero(p.limite_novandra_mes)} consultas a Novandra al mes`,
    p.factura_electronica ? "Factura electrónica DIAN" : "Factura interna en PDF",
    p.reportes_avanzados ? "Reportes y dashboards avanzados" : "Reportes básicos",
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
  const queryClient = useQueryClient();
  const { cargando, error, planes, plan, suscripcion, usado, limite, recargar } = usePlan();
  const [ciclo, setCiclo] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const historial = useQuery({
    queryKey: ["historial suscripcion", dataempresa?.id],
    queryFn: () => MostrarHistorialSuscripcion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });

  if (cargando) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={recargar} />;

  const cicloActual = ciclo ?? suscripcion?.ciclo ?? "mensual";
  const anual = cicloActual === "anual";

  async function elegir(p) {
    const precio = anual ? p.precio_anual : p.precio_mensual;
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: `¿Cambiar al plan ${p.nombre}?`,
      html: `${precio ? `<b>${cop(precio)}</b> por ${anual ? "año" : "mes"}.` : "Plan gratuito."}<br/>Los nuevos límites se aplican de inmediato.`,
      showCancelButton: true,
      confirmButtonText: "Sí, cambiar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setCambiando(p.id);
    const ok = await CambiarPlan({ idEmpresa: dataempresa.id, idPlan: p.id, ciclo: cicloActual });
    setCambiando(null);
    if (ok) {
      await recargar();
      historial.refetch();
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
    }
  }

  return (
    <PaginaTemplate
      titulo="Plan y suscripción"
      descripcion="Elige el plan que se ajusta a tu negocio. Puedes cambiarlo cuando quieras."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={5} colTablet={6} decoracion titulo="Tu plan actual" icono={<v.iconoplan />}>
          <Actual>
            <strong>{plan?.nombre}</strong>
            <span>
              {suscripcion?.ciclo === "anual" ? "Facturación anual" : "Facturación mensual"} · renueva el{" "}
              {formatearFecha(suscripcion?.renovacion)}
            </span>
            <p>{plan?.descripcion}</p>
          </Actual>
        </Tarjeta>
        <Tarjeta col={7} colTablet={6} titulo="Uso de este mes" icono={<v.iconorayo />}>
          <Usos>
            <BarraUso etiqueta="Productos" usado={usado("productos")} limite={limite("productos")} />
            <BarraUso etiqueta="Bodegas" usado={usado("bodegas")} limite={limite("bodegas")} />
            <BarraUso etiqueta="Usuarios" usado={usado("usuarios")} limite={limite("usuarios")} />
            <BarraUso etiqueta="Ventas del mes" usado={usado("ventas_mes")} limite={limite("ventas_mes")} />
            <BarraUso etiqueta="Consultas a Novandra" usado={usado("novandra_mes")} limite={limite("novandra_mes")} />
          </Usos>
        </Tarjeta>
      </BentoGrid>

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
          const actual = p.id === plan?.id && cicloActual === suscripcion?.ciclo;
          const precio = anual ? p.precio_anual : p.precio_mensual;
          return (
            <article key={p.id} className={`${p.destacado ? "destacado" : ""} ${actual ? "actual" : ""}`}>
              {p.destacado && <span className="cinta">Más elegido</span>}
              <h2>{p.nombre}</h2>
              <p className="descripcion">{p.descripcion}</p>
              <div className="precio">
                {precio ? (
                  <>
                    <strong>{cop(precio)}</strong>
                    <span>COP / {anual ? "año" : "mes"}</span>
                  </>
                ) : (
                  <strong>Gratis</strong>
                )}
              </div>
              <ul>
                {caracteristicas(p).map((c) => (
                  <li key={c}>
                    <v.iconolisto /> {c}
                  </li>
                ))}
              </ul>
              <Boton
                bloque
                variante={actual ? "secundario" : p.destacado ? "primario" : "secundario"}
                disabled={actual}
                cargando={cambiando === p.id}
                funcion={() => elegir(p)}
              >
                {actual ? "Tu plan actual" : `Elegir ${p.nombre}`}
              </Boton>
            </article>
          );
        })}
      </Planes>

      <BentoGrid>
        <Tarjeta variante="acento" col={6} colTablet={6} titulo="Sobre los pagos" icono={<v.iconotarjeta />}>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            El cambio de plan se registra al instante. El cobro automático con pasarela de pagos todavía no está
            conectado: tu equipo de MCCore te enviará la factura del plan.
          </p>
        </Tarjeta>
        <Tarjeta col={6} colTablet={6} titulo="Historial" icono={<v.iconofecha />}>
          {historial.data?.length ? (
            <ListaTarjeta>
              {historial.data.map((h) => (
                <li key={h.id}>
                  <span className="principal">
                    <strong>
                      {planes.find((p) => p.id === h.plan_anterior)?.nombre ?? "—"} →{" "}
                      {planes.find((p) => p.id === h.plan_nuevo)?.nombre ?? h.plan_nuevo}
                    </strong>
                    <span>Facturación {h.ciclo}</span>
                  </span>
                  <span className="dato">{formatearFecha(h.fecha)}</span>
                </li>
              ))}
            </ListaTarjeta>
          ) : (
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Aún no has cambiado de plan.
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
    gap: 6px;
    strong {
      font-size: 2rem;
      letter-spacing: -0.03em;
    }
    span {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.85rem;
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
