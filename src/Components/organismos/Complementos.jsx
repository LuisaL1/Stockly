import { useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { Boton } from "../atomos/Boton";
import { CotizarComplemento, CrearPagoComplemento, MisComplementos, MostrarComplementos } from "../../supabase/crudSuscripcion";
import { formatearFecha, formatearNumero } from "../../utils/conversiones";
import { notificarError } from "../../utils/notificaciones";
import { Device } from "../../styles/breackpoints";
import { v } from "../../styles/variables";

const ICONOS = {
  usuario: v.iconoUsuarios,
  sede: v.iconosucursales,
  bodegas: v.iconobodegas,
  productos: v.iconostock,
  ventas: v.iconoventas,
  clientes: v.iconoclientes,
  archivos: v.iconodocumento,
  informes: v.iconoreportes,
  novandra: v.icononovandra,
};
const cop = (n) => `$${formatearNumero(n)}`;

// Capacidad adicional sobre el plan pagado: se cobra proporcional a los días que le
// quedan al plan y vence con él. Al renovar el plan se pueden renovar juntos.
export function Complementos({ idEmpresa, estado, ajustes, admin, alActivar }) {
  const catalogo = useQuery({ queryKey: ["complementos"], queryFn: MostrarComplementos, staleTime: 60 * 60 * 1000 });
  const mios = useQuery({ queryKey: ["mis complementos", idEmpresa], queryFn: () => MisComplementos(idEmpresa), enabled: !!idEmpresa });
  const [cantidades, setCantidades] = useState({});
  const [trabajando, setTrabajando] = useState(null);

  const conPlanPagado = !!estado?.plan_pagado;
  const tengo = (id) => Number(mios.data?.find((m) => m.id === id)?.cantidad ?? 0);

  async function agregar(c) {
    const cantidad = cantidades[c.id] ?? 1;
    setTrabajando(c.id);
    try {
      const cot = await CotizarComplemento({ idEmpresa, idComplemento: c.id, cantidad });
      const { isConfirmed } = await Swal.fire({
        icon: "info",
        title: `${cantidad} × ${c.nombre}`,
        html:
          `<b style="font-size:1.4em">${cop(cot.total)}</b><br/><small>Por los ${cot.dias} días que le quedan a tu plan (${cop(c.precio_mensual)} al mes por unidad).</small>` +
          `<br/><br/>Queda activo apenas pagues y vence con tu plan, el ${formatearFecha(cot.hasta)}. Al renovar tu plan puedes renovarlo junto con él.` +
          `<br/><br/>Pagas con Wompi: tarjeta, PSE, Nequi o Bancolombia.`,
        showCancelButton: true,
        confirmButtonText: ajustes?.pagos_activos === false ? "Activar (modo pruebas)" : "Ir a pagar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#8800B3",
        reverseButtons: true,
      });
      if (!isConfirmed) return setTrabajando(null);
      const r = await CrearPagoComplemento({ idEmpresa, idComplemento: c.id, cantidad });
      if (r.aplicado) {
        // Modo pruebas: activo sin pasar por Wompi.
        await alActivar?.();
        setTrabajando(null);
        Swal.fire({ icon: "success", title: `${cantidad} × ${c.nombre} activo (modo pruebas)`, text: "No se hizo ningún cobro.", confirmButtonColor: "#8800B3" });
        return;
      }
      window.location.assign(r.url);
    } catch (e) {
      notificarError("No se pudo iniciar el pago", e.message);
      setTrabajando(null);
    }
  }

  const lista = catalogo.data ?? [];
  if (!lista.length) return null;

  return (
    <Seccion>
      <header>
        <h2>Complementos</h2>
        <p>
          {conPlanPagado
            ? "¿Llegaste a un tope? Agrega solo lo que necesitas sin cambiar de plan. Se cobra por los días que le quedan a tu plan."
            : "Con un plan Pro o Enterprise pagado puedes agregar solo lo que necesites, sin cambiar de plan."}
        </p>
      </header>
      <div className="grilla">
        {lista.map((c) => {
          const Icono = ICONOS[c.id] ?? v.iconorayo;
          const pronto = c.requiere && ajustes?.[c.requiere] !== true;
          const actuales = tengo(c.id);
          const disponibles = Math.max(0, c.max_unidades - actuales);
          const cantidad = Math.min(cantidades[c.id] ?? 1, Math.max(disponibles, 1));
          const cambiar = (d) => setCantidades((x) => ({ ...x, [c.id]: Math.min(Math.max(1, cantidad + d), Math.max(disponibles, 1)) }));
          const bloqueado = !conPlanPagado || pronto || !admin || disponibles === 0;
          return (
            <article key={c.id}>
              <div className="titulo">
                <span className="icono">
                  <Icono />
                </span>
                <div>
                  <h3>{c.nombre}</h3>
                  <small>{c.descripcion}</small>
                </div>
              </div>
              <div className="precio">
                <strong>{cop(c.precio_mensual)}</strong> <span>/ mes por unidad</span>
              </div>
              {actuales > 0 && (
                <small className="activo">
                  Tienes {actuales} activo{actuales === 1 ? "" : "s"}
                  {mios.data?.find((m) => m.id === c.id)?.hasta ? ` hasta el ${formatearFecha(mios.data.find((m) => m.id === c.id).hasta)}` : ""}
                </small>
              )}
              <div className="acciones">
                <div className="cantidad" aria-label="Cantidad">
                  <button type="button" onClick={() => cambiar(-1)} disabled={bloqueado || cantidad <= 1} aria-label="Menos">
                    −
                  </button>
                  <span>{cantidad}</span>
                  <button type="button" onClick={() => cambiar(1)} disabled={bloqueado || cantidad >= disponibles} aria-label="Más">
                    +
                  </button>
                </div>
                <Boton
                  variante="secundario"
                  disabled={bloqueado || (!!trabajando && trabajando !== c.id)}
                  cargando={trabajando === c.id}
                  funcion={() => agregar(c)}
                >
                  {pronto ? "Próximamente" : disponibles === 0 ? "Tope alcanzado" : "Agregar"}
                </Boton>
              </div>
            </article>
          );
        })}
      </div>
    </Seccion>
  );
}

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  header h2 {
    font-size: 1.2rem;
  }
  header p {
    margin-top: 4px;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.92rem;
  }
  .grilla {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    @media ${Device.tablet} {
      grid-template-columns: repeat(2, 1fr);
    }
    @media ${Device.laptop} {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  article {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border-radius: ${({ theme }) => theme.radiusXl};
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
  }
  .titulo {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    h3 {
      font-size: 0.98rem;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.45;
    }
  }
  .icono {
    flex: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 1.1rem;
  }
  .precio strong {
    font-size: 1.1rem;
  }
  .precio span {
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.85rem;
  }
  .activo {
    color: ${({ theme }) => theme.success};
    font-weight: 600;
  }
  .acciones {
    margin-top: auto;
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }
  .cantidad {
    display: flex;
    align-items: center;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 12px;
    overflow: hidden;
    button {
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: ${({ theme }) => theme.text};
      font-size: 1.1rem;
      cursor: pointer;
      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
    span {
      min-width: 28px;
      text-align: center;
      font-weight: 600;
    }
  }
`;
