import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { Modal } from "../Components/moleculas/Modal";
import { ContentAccionesTabla } from "../Components/organismos/ContentAccionesTabla";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { EditarSucursal, EliminarSucursal, InsertarSucursal, MostrarSucursales } from "../supabase/crudSucursales";
import { MostrarBodegas } from "../supabase/crudBodegas";
import { MostrarDashboard } from "../supabase/crudDashboard";
import { MostrarPlanes, MostrarSuscripcion } from "../supabase/crudSuscripcion";
import { TiposBodega } from "../utils/dataEstatica";
import { esAdmin, MODULOS } from "../utils/permisos";
import { confirmarEliminacion } from "../utils/notificaciones";
import { formatearMonedaCorta, formatearNumero } from "../utils/conversiones";
import { v } from "../styles/variables";

export function Sucursales() {
  return (
    <ConPermiso modulo={MODULOS.sucursales}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const { datausuario } = useUsuariosStore();
  const admin = esAdmin(datausuario);
  const idEmpresa = dataempresa?.id;
  const dinero = (n) => formatearMonedaCorta(Math.round(n ?? 0), dataempresa?.simbolomoneda ?? "$");
  const queryClient = useQueryClient();
  const [registro, setRegistro] = useState(null);

  const sucursales = useQuery({ queryKey: ["sucursales", idEmpresa], queryFn: () => MostrarSucursales(idEmpresa), enabled: !!idEmpresa });
  const bodegas = useQuery({ queryKey: ["bodegas", idEmpresa], queryFn: () => MostrarBodegas(idEmpresa), enabled: !!idEmpresa });
  const dashboard = useQuery({ queryKey: ["dashboard", idEmpresa, 30, ""], queryFn: () => MostrarDashboard(idEmpresa, 30), enabled: !!idEmpresa });
  const planes = useQuery({ queryKey: ["planes"], queryFn: MostrarPlanes, staleTime: 3_600_000 });
  const suscripcion = useQuery({ queryKey: ["suscripcion", idEmpresa], queryFn: () => MostrarSuscripcion(idEmpresa), enabled: !!idEmpresa });

  if (sucursales.isLoading) return <SpinnerLoader />;
  if (sucursales.error) return <ErrorMolecula mensaje={sucursales.error.message} reintentar={sucursales.refetch} />;

  const lista = sucursales.data ?? [];
  const plan = planes.data?.find((p) => p.id === (suscripcion.data?.id_plan ?? "basico"));
  const limite = plan?.limite_sucursales ?? null;
  const sinCupo = limite != null && lista.length >= limite;
  const ventas = Object.fromEntries((dashboard.data?.por_sucursal ?? []).map((s) => [s.id, s]));

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["sucursales"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const bodegasPorId = Object.fromEntries((dashboard.data?.bodegas ?? []).map((b) => [b.id, b]));
  const totalVentas = (dashboard.data?.por_sucursal ?? []).reduce((a, x) => a + Number(x.total), 0);
  const totalFacturas = (dashboard.data?.por_sucursal ?? []).reduce((a, x) => a + Number(x.ventas), 0);
  const totalUnidades = (dashboard.data?.bodegas ?? []).reduce((a, b) => a + Number(b.unidades), 0);
  const restantes = limite == null ? null : Math.max(limite - lista.length, 0);

  return (
    <PaginaTemplate
      titulo="Sucursales"
      descripcion="Tus sedes. Cuánto vende cada una y qué bodegas maneja."
      acciones={
        admin && (
          <Boton
            icono={<v.agregar />}
            disabled={sinCupo}
            title={sinCupo ? "Llegaste al límite de sucursales de tu plan" : undefined}
            funcion={() => setRegistro({ accion: "Nuevo", dataSelect: {} })}
          >
            Nueva sucursal
          </Boton>
        )
      }
    >
      <Resumen>
        <div>
          <span>Sedes activas</span>
          <strong>
            {lista.filter((x) => x.activa).length}
            <small>{limite == null ? "" : ` de ${limite}`}</small>
          </strong>
        </div>
        <div>
          <span>Ventas 30 días</span>
          <strong>{dinero(totalVentas)}</strong>
        </div>
        <div>
          <span>Ticket promedio</span>
          <strong>{dinero(totalFacturas ? totalVentas / totalFacturas : 0)}</strong>
        </div>
        <div>
          <span>Unidades en bodegas</span>
          <strong>{formatearNumero(totalUnidades)}</strong>
        </div>
      </Resumen>

      <Rejilla>
        {lista.map((s, i) => {
          const propias = (bodegas.data ?? []).filter((b) => b.id_sucursal === s.id);
          const resumen = ventas[s.id];
          const total = Number(resumen?.total ?? 0);
          const facturas = Number(resumen?.ventas ?? 0);
          const participacion = totalVentas ? Math.round((total / totalVentas) * 100) : 0;
          const unidades = propias.reduce((a, b) => a + Number(bodegasPorId[b.id]?.unidades ?? 0), 0);
          return (
            <TarjetaSede key={s.id} $inactiva={!s.activa}>
              <header>
                <span className="icono">
                  <v.iconosucursales />
                </span>
                <div className="titulos">
                  <h2>
                    {s.nombre}
                    {i === 0 && <Etiqueta tono="primary">Principal</Etiqueta>}
                    {!s.activa && <Etiqueta tono="warning">Inactiva</Etiqueta>}
                  </h2>
                  <p>{[s.ciudad, s.direccion].filter(Boolean).join(" · ") || "Agrega la ciudad y la dirección"}</p>
                </div>
                {admin && (
                  <ContentAccionesTabla
                    funcionEditar={() => setRegistro({ accion: "Editar", dataSelect: s })}
                    funcionEliminar={
                      i === 0
                        ? undefined
                        : async () => {
                            if (await confirmarEliminacion(`Se eliminará "${s.nombre}". Sus bodegas quedarán sin sucursal.`)) {
                              if (await EliminarSucursal(s)) refrescar();
                            }
                          }
                    }
                  />
                )}
              </header>

              <div className="ventas">
                <span className="etiqueta">Ventas últimos 30 días</span>
                <strong>{dinero(total)}</strong>
                <div className="participacion">
                  <div className="pista">
                    <div style={{ width: `${participacion}%` }} />
                  </div>
                  <span>{participacion}% del total</span>
                </div>
              </div>

              <dl className="indicadores">
                <div>
                  <dt>Facturas</dt>
                  <dd>{formatearNumero(facturas)}</dd>
                </div>
                <div>
                  <dt>Ticket promedio</dt>
                  <dd>{dinero(facturas ? total / facturas : 0)}</dd>
                </div>
                <div>
                  <dt>Unidades</dt>
                  <dd>{formatearNumero(unidades)}</dd>
                </div>
              </dl>

              <div className="bodegas">
                <span className="etiqueta">Bodegas ({propias.length})</span>
                {propias.length ? (
                  <ul>
                    {propias.map((b) => {
                      const Icono = TiposBodega[b.tipo]?.icono ?? v.iconobodegas;
                      return (
                        <li key={b.id}>
                          <span className="ficha">
                            <Icono />
                          </span>
                          <span className="nombre">
                            <strong>{b.nombre}</strong>
                            <small>{TiposBodega[b.tipo]?.etiqueta}</small>
                          </span>
                          <span className="dato">{formatearNumero(bodegasPorId[b.id]?.unidades ?? 0)} und</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="vacio">
                    Sin bodegas. Asígnale una desde <Link to="/bodegas">Bodegas</Link>.
                  </p>
                )}
              </div>

              {(s.responsable || s.telefono) && (
                <footer>
                  {s.responsable && (
                    <span>
                      <v.iconoUser /> {s.responsable}
                    </span>
                  )}
                  {s.telefono && (
                    <span>
                      <v.iconotelefono /> {s.telefono}
                    </span>
                  )}
                </footer>
              )}
            </TarjetaSede>
          );
        })}

        {admin && (
          <NuevaSede
            type="button"
            disabled={sinCupo}
            onClick={() => !sinCupo && setRegistro({ accion: "Nuevo", dataSelect: {} })}
          >
            <span className="mas">{sinCupo ? <v.iconoplan /> : <v.agregar />}</span>
            <strong>{sinCupo ? "Llegaste al límite de tu plan" : "Abrir una nueva sede"}</strong>
            <small>
              {sinCupo ? (
                <>
                  Para más sucursales, <Link to="/configurar/plan">mejora tu plan</Link>.
                </>
              ) : restantes == null ? (
                "Tu plan te permite agregar más sucursales."
              ) : (
                `Te ${restantes === 1 ? "queda" : "quedan"} ${restantes} de ${limite} en tu plan.`
              )}
            </small>
          </NuevaSede>
        )}
      </Rejilla>

      {registro && (
        <RegistrarSucursal {...registro} idEmpresa={idEmpresa} onClose={() => setRegistro(null)} onGuardado={refrescar} />
      )}
    </PaginaTemplate>
  );
}

function RegistrarSucursal({ accion, dataSelect, idEmpresa, onClose, onGuardado }) {
  const editando = accion === "Editar";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { activa: true, ...dataSelect } });

  async function guardar(d) {
    const p = {
      nombre: d.nombre.trim(),
      ciudad: d.ciudad?.trim() || null,
      direccion: d.direccion?.trim() || null,
      telefono: d.telefono?.trim() || null,
      responsable: d.responsable?.trim() || null,
      activa: !!d.activa,
    };
    const ok = editando ? await EditarSucursal({ id: dataSelect.id, ...p }) : await InsertarSucursal({ ...p, id_empresa: idEmpresa });
    if (ok) {
      onGuardado();
      onClose();
    }
  }

  return (
    <Modal titulo={editando ? "Editar sucursal" : "Nueva sucursal"} onClose={onClose} ancho="600px">
      <Formulario onSubmit={handleSubmit(guardar)} noValidate>
        <div className="grid">
          <div className="completo">
            <InputText label="Nombre" icono={<v.icononombre />} error={errors.nombre?.message}>
              <input autoFocus placeholder="Ej. Sede Centro" {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre" })} />
            </InputText>
          </div>
          <InputText label="Ciudad" icono={<v.iconodireccion />}>
            <input {...register("ciudad")} />
          </InputText>
          <InputText label="Teléfono" icono={<v.iconotelefono />}>
            <input type="tel" {...register("telefono")} />
          </InputText>
          <div className="completo">
            <InputText label="Dirección" icono={<v.iconodireccion />}>
              <input {...register("direccion")} />
            </InputText>
          </div>
          <div className="completo">
            <InputText label="Responsable" icono={<v.iconoUser />}>
              <input {...register("responsable")} />
            </InputText>
          </div>
        </div>
        {editando && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.9rem" }}>
            <input type="checkbox" {...register("activa")} /> Sucursal activa
          </label>
        )}
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting}>
            Guardar
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

const Resumen = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.border};
  overflow: hidden;
  @media (min-width: 900px) {
    grid-template-columns: repeat(4, 1fr);
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 20px;
    background: ${({ theme }) => theme.surface};
  }
  span {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
  }
  strong {
    font-size: 1.35rem;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    small {
      font-size: 0.85rem;
      font-weight: 500;
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

const Rejilla = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
`;

const TarjetaSede = styled.article`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  opacity: ${({ $inactiva }) => ($inactiva ? 0.7 : 1)};
  header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .icono {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 12px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 20px;
  }
  .titulos {
    flex: 1;
    min-width: 0;
    h2 {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 1.05rem;
    }
    p {
      font-size: 0.82rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .etiqueta {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.textMuted};
  }
  .ventas {
    display: flex;
    flex-direction: column;
    gap: 4px;
    strong {
      font-size: 1.8rem;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
  }
  .participacion {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
    .pista {
      flex: 1;
      height: 6px;
      border-radius: 999px;
      background: ${({ theme }) => theme.surfaceAlt};
      div {
        height: 100%;
        border-radius: inherit;
        background: ${({ theme }) => theme.primary};
      }
    }
  }
  .indicadores {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-radius: 14px;
    background: ${({ theme }) => theme.surfaceAlt};
    div {
      padding: 10px 12px;
      & + div {
        border-left: 1px solid ${({ theme }) => theme.border};
      }
    }
    dt {
      font-size: 0.72rem;
      color: ${({ theme }) => theme.textMuted};
    }
    dd {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  }
  .bodegas {
    display: flex;
    flex-direction: column;
    gap: 8px;
    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
    }
    li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      & + li {
        border-top: 1px solid ${({ theme }) => theme.border};
      }
    }
    .ficha {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 10px;
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.primary};
      font-size: 16px;
    }
    .nombre {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      strong {
        font-size: 0.88rem;
        font-weight: 600;
      }
      small {
        font-size: 0.75rem;
        color: ${({ theme }) => theme.textMuted};
      }
    }
    .dato {
      font-size: 0.85rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .vacio {
      font-size: 0.85rem;
      color: ${({ theme }) => theme.textMuted};
      a {
        color: ${({ theme }) => theme.primary};
        font-weight: 600;
      }
    }
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    padding-top: 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    font-size: 0.82rem;
    color: ${({ theme }) => theme.textMuted};
    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }
`;

const NuevaSede = styled.button`
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1.5px dashed ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  .mas {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 22px;
  }
  small {
    max-width: 240px;
    color: ${({ theme }) => theme.textMuted};
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }
  &:disabled {
    cursor: default;
  }
`;
