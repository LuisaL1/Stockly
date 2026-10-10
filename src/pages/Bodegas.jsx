import { useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { Modal } from "../Components/moleculas/Modal";
import { BentoGrid, ListaTarjeta, Tarjeta } from "../Components/moleculas/Bento";
import { BarraUso } from "../Components/moleculas/BarraUso";
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { Selector } from "../Components/organismos/Selector";
import { ContentAccionesTabla } from "../Components/organismos/ContentAccionesTabla";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import {
  EditarBodega,
  EliminarBodega,
  InsertarBodega,
  MostrarBodegas,
  MostrarStockBodega,
  MostrarTraslados,
  TrasladarStock,
} from "../supabase/crudBodegas";
import { usePlan } from "../hooks/usePlan";
import { MostrarSucursales } from "../supabase/crudSucursales";
import { TiposBodega } from "../utils/dataEstatica";
import { MODULOS } from "../utils/permisos";
import { confirmarEliminacion } from "../utils/notificaciones";
import { formatearMonedaCorta, formatearNumero, tiempoRelativo } from "../utils/conversiones";
import { v } from "../styles/variables";

export function Bodegas() {
  return (
    <ConPermiso modulo={MODULOS.bodegas}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const dinero = (n) => formatearMonedaCorta(Math.round(n), dataempresa?.simbolomoneda ?? "$");
  const queryClient = useQueryClient();
  const { usado, limite, alcanzado, recargar } = usePlan();
  const [seleccion, setSeleccion] = useState(null);
  const [registro, setRegistro] = useState(null);
  const [traslado, setTraslado] = useState(false);

  const bodegas = useQuery({ queryKey: ["bodegas", idEmpresa], queryFn: () => MostrarBodegas(idEmpresa), enabled: !!idEmpresa });
  const stock = useQuery({
    queryKey: ["stock bodega", idEmpresa, "todas"],
    queryFn: () => MostrarStockBodega({ idEmpresa }),
    enabled: !!idEmpresa,
  });
  const sucursales = useQuery({ queryKey: ["sucursales", idEmpresa], queryFn: () => MostrarSucursales(idEmpresa), enabled: !!idEmpresa });
  const nombreSucursal = (id) => sucursales.data?.find((s) => s.id === id)?.nombre;
  const traslados = useQuery({ queryKey: ["traslados", idEmpresa], queryFn: () => MostrarTraslados(idEmpresa), enabled: !!idEmpresa });

  const resumen = useMemo(() => {
    const r = {};
    for (const s of stock.data ?? []) {
      const b = (r[s.id_bodega] ??= { unidades: 0, valor: 0, productos: 0, bajos: 0 });
      const c = Number(s.cantidad);
      b.unidades += c;
      b.valor += c * Number(s.preciocompra ?? 0);
      if (c > 0) b.productos += 1;
    }
    return r;
  }, [stock.data]);

  const recargarTodo = () => {
    queryClient.invalidateQueries({ queryKey: ["bodegas"] });
    queryClient.invalidateQueries({ queryKey: ["stock bodega"] });
    queryClient.invalidateQueries({ queryKey: ["traslados"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    recargar();
  };

  if (bodegas.isLoading || stock.isLoading) return <SpinnerLoader />;
  const error = bodegas.error ?? stock.error;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={() => bodegas.refetch() && stock.refetch()} />;

  const lista = bodegas.data ?? [];
  const actual = lista.find((b) => b.id === seleccion) ?? lista[0];
  const filasActual = (stock.data ?? []).filter((s) => s.id_bodega === actual?.id);
  const sinCupo = alcanzado("bodegas");

  const eliminar = async (b) => {
    if (await confirmarEliminacion(`Se eliminará la bodega "${b.nombre}". Su stock debe estar en cero.`)) {
      if (await EliminarBodega(b)) {
        setSeleccion(null);
        recargarTodo();
      }
    }
  };

  const columns = [
    { accessorKey: "descripcion", header: "Producto" },
    {
      accessorKey: "cantidad",
      header: "Disponible",
      meta: { align: "right" },
      cell: ({ row }) => {
        const c = Number(row.original.cantidad);
        return <Cantidad $cero={c <= 0}>{formatearNumero(c)}</Cantidad>;
      },
    },
    {
      id: "valor",
      header: "Valor a costo",
      meta: { align: "right" },
      accessorFn: (r) => Number(r.cantidad) * Number(r.preciocompra ?? 0),
      cell: (i) => dinero(i.getValue()),
    },
  ];

  return (
    <PaginaTemplate
      titulo="Bodegas"
      descripcion="Dónde está cada cosa. Bodegas, tiendas y tienda online."
      acciones={
        <>
          <Boton variante="secundario" icono={<v.iconokardex />} funcion={() => setTraslado(true)} disabled={lista.length < 2}>
            Trasladar stock
          </Boton>
          <Boton
            icono={<v.agregar />}
            disabled={sinCupo}
            title={sinCupo ? "Llegaste al límite de bodegas de tu plan" : undefined}
            funcion={() => setRegistro({ accion: "Nuevo", dataSelect: {} })}
          >
            Nueva bodega
          </Boton>
        </>
      }
    >
      <BentoGrid>
        {lista.map((b) => {
          const r = resumen[b.id] ?? { unidades: 0, valor: 0, productos: 0 };
          const tipo = TiposBodega[b.tipo] ?? TiposBodega.satelite;
          const Icono = tipo.icono;
          const activa = actual?.id === b.id;
          return (
            <Tarjeta
              key={b.id}
              as="button"
              type="button"
              onClick={() => setSeleccion(b.id)}
              variante={b.tipo === "principal" ? "tinta" : activa ? "acento" : "superficie"}
              decoracion={b.tipo === "principal"}
              col={4}
              colTablet={3}
              aria-pressed={activa}
              style={{ textAlign: "left", cursor: "pointer", font: "inherit", outline: activa ? "2px solid #8800B3" : undefined }}
            >
              <TarjetaBodega>
                <span className="icono">
                  <Icono />
                </span>
                <div className="titulos">
                  <strong>{b.nombre}</strong>
                  <span>
                    {tipo.etiqueta}
                    {nombreSucursal(b.id_sucursal) && ` · ${nombreSucursal(b.id_sucursal)}`}
                    {!b.activa && " · inactiva"}
                  </span>
                </div>
                <div className="cifras">
                  <div>
                    <strong>{formatearNumero(r.unidades)}</strong>
                    <span>unidades</span>
                  </div>
                  <div>
                    <strong>{formatearNumero(r.productos)}</strong>
                    <span>productos</span>
                  </div>
                  <div>
                    <strong>{dinero(r.valor)}</strong>
                    <span>a costo</span>
                  </div>
                </div>
              </TarjetaBodega>
            </Tarjeta>
          );
        })}

        <Tarjeta variante="acento" col={4} colTablet={3} titulo="Capacidad del plan" icono={<v.iconoplan />}>
          <BarraUso etiqueta="Bodegas" usado={usado("bodegas")} limite={limite("bodegas")} />
          {sinCupo && (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Para conectar más bodegas, <Link to="/configurar/plan">mejora tu plan</Link>.
            </p>
          )}
        </Tarjeta>
      </BentoGrid>

      {actual && (
        <Detalle>
          <div className="tabla">
            <div className="titulo">
              <div>
                <h2>{actual.nombre}</h2>
                <p>
                  {actual.tipo === "principal"
                    ? "La bodega principal recibe todo lo que no esté asignado a otra bodega."
                    : actual.direccion || "Sin dirección registrada"}
                </p>
              </div>
              <ContentAccionesTabla
                funcionEditar={() => setRegistro({ accion: "Editar", dataSelect: actual })}
                funcionEliminar={actual.tipo === "principal" ? undefined : () => eliminar(actual)}
              />
            </div>
            <DataTable
              data={filasActual}
              columns={columns}
              vacio={<EstadoVacio titulo="Sin productos" mensaje="Esta bodega no tiene productos registrados." />}
            />
          </div>

          <Tarjeta col={12} titulo="Últimos traslados" icono={<v.iconokardex />}>
            {traslados.data?.length ? (
              <ListaTarjeta>
                {traslados.data.map((t) => (
                  <li key={t.id}>
                    <span className="ficha">
                      <v.iconokardex />
                    </span>
                    <span className="principal">
                      <strong>{t.productos?.descripcion}</strong>
                      <span>
                        {t.origen?.nombre} → {t.destino?.nombre} · {tiempoRelativo(t.fecha)}
                      </span>
                    </span>
                    <Etiqueta tono="primary">{formatearNumero(t.cantidad)} und</Etiqueta>
                  </li>
                ))}
              </ListaTarjeta>
            ) : (
              <EstadoVacio titulo="Sin traslados" mensaje="Mueve stock entre bodegas con “Trasladar stock”." />
            )}
          </Tarjeta>
        </Detalle>
      )}

      {registro && (
        <RegistrarBodega
          {...registro}
          idEmpresa={idEmpresa}
          sucursales={sucursales.data ?? []}
          onClose={() => setRegistro(null)}
          onGuardado={recargarTodo}
        />
      )}
      {traslado && (
        <ModalTraslado
          bodegas={lista}
          stock={stock.data ?? []}
          origenInicial={actual}
          onClose={() => setTraslado(false)}
          onGuardado={recargarTodo}
        />
      )}
    </PaginaTemplate>
  );
}

function RegistrarBodega({ accion, dataSelect, idEmpresa, sucursales, onClose, onGuardado }) {
  const editando = accion === "Editar";
  const principal = dataSelect.tipo === "principal";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { tipo: "punto_venta", activa: true, ...dataSelect, id_sucursal: dataSelect.id_sucursal ?? sucursales[0]?.id ?? "" },
  });

  async function guardar(data) {
    const p = {
      nombre: data.nombre.trim(),
      direccion: data.direccion?.trim() || null,
      responsable: data.responsable?.trim() || null,
      id_sucursal: data.id_sucursal ? Number(data.id_sucursal) : null,
      ...(principal ? {} : { tipo: data.tipo, activa: !!data.activa }),
    };
    const ok = editando ? await EditarBodega({ id: dataSelect.id, ...p }) : await InsertarBodega({ ...p, id_empresa: idEmpresa });
    if (ok) {
      onGuardado();
      onClose();
    }
  }

  return (
    <Modal titulo={editando ? "Editar bodega" : "Nueva bodega"} onClose={onClose} ancho="560px">
      <Formulario onSubmit={handleSubmit(guardar)}>
        <InputText label="Nombre" icono={<v.icononombre />} error={errors.nombre?.message}>
          <input autoFocus placeholder="Ej. Tienda Calarcá" {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre" })} />
        </InputText>
        {!principal && (
          <InputText label="Tipo" icono={<v.iconobodegas />}>
            <select {...register("tipo")}>
              {Object.entries(TiposBodega)
                .filter(([id]) => id !== "principal")
                .map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.etiqueta}
                  </option>
                ))}
            </select>
          </InputText>
        )}
        {sucursales.length > 0 && (
          <InputText label="Sucursal" icono={<v.iconosucursales />}>
            <select {...register("id_sucursal")}>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </InputText>
        )}
        <InputText label="Dirección" icono={<v.iconodireccion />}>
          <input {...register("direccion")} />
        </InputText>
        <InputText label="Responsable" icono={<v.iconoUser />}>
          <input {...register("responsable")} />
        </InputText>
        {!principal && editando && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.9rem" }}>
            <input type="checkbox" {...register("activa")} /> Bodega activa (aparece en el punto de venta)
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

function ModalTraslado({ bodegas, stock, origenInicial, onClose, onGuardado }) {
  const opciones = bodegas.map((b) => ({ ...b, descripcion: b.nombre }));
  const [origen, setOrigen] = useState(opciones.find((b) => b.id === origenInicial?.id) ?? opciones[0]);
  const [destino, setDestino] = useState(opciones.find((b) => b.id !== (origenInicial?.id ?? opciones[0]?.id)));
  const [producto, setProducto] = useState(null);
  const [intento, setIntento] = useState(false);
  const productos = stock
    .filter((s) => s.id_bodega === origen?.id && Number(s.cantidad) > 0)
    .map((s) => ({ ...s, id: s.id_producto }));
  const disponible = Number(productos.find((p) => p.id === producto?.id)?.cantidad ?? 0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function guardar(data) {
    if (!producto || !origen || !destino) return;
    const ok = await TrasladarStock({
      idProducto: producto.id,
      idOrigen: origen.id,
      idDestino: destino.id,
      cantidad: data.cantidad,
      nota: data.nota?.trim(),
    });
    if (ok) {
      onGuardado();
      onClose();
    }
  }

  return (
    <Modal titulo="Trasladar stock" subtitulo="Mueve unidades entre bodegas sin cambiar el total." onClose={onClose} ancho="560px">
      <Formulario
        onSubmit={(e) => {
          setIntento(true);
          return handleSubmit(guardar)(e);
        }}
      >
        <div className="grid">
          <div>
            <span className="etiqueta">Desde</span>
            <div style={{ marginTop: 6 }}>
              <Selector
                opciones={opciones}
                valor={origen}
                onChange={(b) => {
                  setOrigen(b);
                  setProducto(null);
                }}
                icono={<v.iconobodegas />}
              />
            </div>
          </div>
          <div>
            <span className="etiqueta">Hacia</span>
            <div style={{ marginTop: 6 }}>
              <Selector
                opciones={opciones.filter((b) => b.id !== origen?.id)}
                valor={destino?.id === origen?.id ? null : destino}
                onChange={setDestino}
                icono={<v.iconobodegas />}
                error={intento && (!destino || destino.id === origen?.id) ? "Elige otra bodega" : undefined}
              />
            </div>
          </div>
          <div className="completo">
            <span className="etiqueta">Producto</span>
            <div style={{ marginTop: 6 }}>
              <Selector
                opciones={productos}
                valor={producto}
                onChange={setProducto}
                buscable
                icono={<v.iconostock />}
                placeholder="Busca un producto con stock en el origen"
                error={intento && !producto ? "Selecciona un producto" : undefined}
                renderOpcion={(o) => (
                  <span style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
                    <span>{o.descripcion}</span>
                    <small style={{ opacity: 0.7 }}>{formatearNumero(o.cantidad)} und</small>
                  </span>
                )}
              />
            </div>
          </div>
          <InputText
            label="Cantidad"
            icono={<v.iconocalculadora />}
            error={errors.cantidad?.message}
            ayuda={producto ? `Disponible en origen: ${formatearNumero(disponible)}` : undefined}
          >
            <input
              type="number"
              step="any"
              {...register("cantidad", {
                valueAsNumber: true,
                validate: (n) => (n > 0 ? (n <= disponible || !producto ? true : "No hay tantas unidades en el origen") : "Debe ser mayor que cero"),
              })}
            />
          </InputText>
          <InputText label="Nota" icono={<v.iconolista />}>
            <input placeholder="Opcional" {...register("nota")} />
          </InputText>
        </div>
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={<v.iconokardex />} cargando={isSubmitting}>
            Trasladar
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

const TarjetaBodega = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  color: inherit;
  .icono {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    font-size: 22px;
    background: var(--icono-bg);
    color: var(--icono-fg);
  }
  .titulos {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    strong {
      font-size: 1.02rem;
    }
    span {
      font-size: 0.8rem;
      color: var(--muted);
    }
  }
  .cifras {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    background: var(--panel);
    div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    strong {
      font-size: 0.98rem;
      font-variant-numeric: tabular-nums;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    span {
      font-size: 0.72rem;
      color: var(--muted);
    }
  }
`;

const Detalle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  .tabla {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .titulo {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    h2 {
      font-size: 1.2rem;
    }
    p {
      font-size: 0.85rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

const Cantidad = styled.span`
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $cero }) => ($cero ? theme.textMuted : theme.text)};
`;
