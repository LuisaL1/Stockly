import { useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { Modal } from "../Components/moleculas/Modal";
import { BentoGrid, Cifra, Tarjeta } from "../Components/moleculas/Bento";
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { Selector } from "../Components/organismos/Selector";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta, EtiquetaEstado } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useNovandraStore } from "../store/NovandraStore";
import {
  CambiarEstadoOrden,
  CrearOrdenCompra,
  EliminarOrdenCompra,
  MostrarOrdenesCompra,
  RecibirOrdenCompra,
} from "../supabase/crudCompras";
import { MostrarBodegas } from "../supabase/crudBodegas";
import { crudProveedores } from "../supabase/crudContactos";
import { BuscarProductos } from "../supabase/crudProductos";
import { MODULOS } from "../utils/permisos";
import { confirmarEliminacion } from "../utils/notificaciones";
import { formatearFecha, formatearMonedaCorta, formatearNumero } from "../utils/conversiones";
import { v } from "../styles/variables";

export function Compras() {
  return (
    <ConPermiso modulo={MODULOS.compras}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const dinero = (n) => formatearMonedaCorta(n, dataempresa?.simbolomoneda ?? "$");
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const queryClient = useQueryClient();
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const ordenes = useQuery({
    queryKey: ["ordenes compra", idEmpresa],
    queryFn: () => MostrarOrdenesCompra(idEmpresa),
    enabled: !!idEmpresa,
  });

  if (ordenes.isLoading) return <SpinnerLoader />;
  if (ordenes.error) return <ErrorMolecula mensaje={ordenes.error.message} reintentar={ordenes.refetch} />;

  const lista = ordenes.data ?? [];
  const abiertas = lista.filter((o) => ["borrador", "enviada"].includes(o.estado));
  const deNovandra = lista.filter((o) => o.creada_por === "novandra" && o.estado === "borrador");

  const refrescar = () => {
    queryClient.invalidateQueries({ queryKey: ["ordenes compra"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["stock bodega"] });
  };

  const columns = [
    { accessorKey: "numero", header: "Orden", cell: (i) => <strong>OC-{i.getValue()}</strong> },
    { accessorKey: "fecha", header: "Fecha", cell: (i) => formatearFecha(i.getValue()) },
    { id: "proveedor", header: "Proveedor", accessorFn: (o) => o.proveedores?.nombre ?? "Sin proveedor" },
    { id: "bodega", header: "Recibe en", accessorFn: (o) => o.bodegas?.nombre },
    { accessorKey: "total", header: "Total", meta: { align: "right" }, cell: (i) => dinero(i.getValue()) },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <span style={{ display: "inline-flex", gap: 6 }}>
          <EtiquetaEstado estado={row.original.estado} />
          {row.original.creada_por === "novandra" && (
            <Etiqueta tono="primary" icono={<v.icononovandra />}>
              Novandra
            </Etiqueta>
          )}
        </span>
      ),
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
      titulo="Compras"
      descripcion="Órdenes de compra a tus proveedores. Al recibirlas, el inventario se actualiza solo."
      acciones={
        <>
          <Boton
            variante="secundario"
            icono={<v.icononovandra />}
            funcion={() => abrirNovandra("Prepara una orden de compra para los productos que están bajo mínimo")}
          >
            Sugerir con Novandra
          </Boton>
          <Boton icono={<v.agregar />} funcion={() => setNueva(true)}>
            Nueva orden
          </Boton>
        </>
      }
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={4} colTablet={2} decoracion titulo="Abiertas" icono={<v.iconocompras />}>
          <Cifra>
            <span className="valor">{formatearNumero(abiertas.length)}</span>
            <span className="detalle">{dinero(abiertas.reduce((a, o) => a + Number(o.total), 0))} por recibir</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta variante="acento" col={4} colTablet={2} titulo="Borradores de Novandra" icono={<v.icononovandra />}>
          <Cifra>
            <span className="valor">{formatearNumero(deNovandra.length)}</span>
            <span className="detalle">Esperan tu revisión</span>
          </Cifra>
        </Tarjeta>
        <Tarjeta col={4} colTablet={2} titulo="Recibidas" icono={<v.iconoproveedores />}>
          <Cifra>
            <span className="valor">{formatearNumero(lista.filter((o) => o.estado === "recibida").length)}</span>
            <span className="detalle">En total</span>
          </Cifra>
        </Tarjeta>
      </BentoGrid>

      <DataTable
        data={lista}
        columns={columns}
        vacio={
          <EstadoVacio
            titulo="Sin órdenes de compra"
            mensaje="Crea una orden o pídele a Novandra que prepare una con lo que está por agotarse."
            icono={<v.iconocompras />}
          />
        }
      />

      {nueva && <NuevaOrden idEmpresa={idEmpresa} dinero={dinero} onClose={() => setNueva(false)} onGuardado={refrescar} />}
      {detalle && (
        <DetalleOrden
          orden={detalle}
          dinero={dinero}
          onClose={() => setDetalle(null)}
          onCambio={() => {
            refrescar();
            setDetalle(null);
          }}
        />
      )}
    </PaginaTemplate>
  );
}

function NuevaOrden({ idEmpresa, dinero, onClose, onGuardado }) {
  const [proveedor, setProveedor] = useState(null);
  const [bodega, setBodega] = useState(null);
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState([]);
  const [nota, setNota] = useState("");
  const [fecha, setFecha] = useState("");
  const [guardando, setGuardando] = useState(false);

  const proveedores = useQuery({ queryKey: ["proveedores", idEmpresa, ""], queryFn: () => crudProveedores.mostrar(idEmpresa) });
  const bodegas = useQuery({ queryKey: ["bodegas", idEmpresa], queryFn: () => MostrarBodegas(idEmpresa) });
  const productos = useQuery({
    queryKey: ["buscar productos compra", idEmpresa, texto],
    queryFn: () => BuscarProductos({ _id_empresa: idEmpresa, buscador: texto }),
    placeholderData: (previo) => previo,
  });
  const bodegaActual = bodega ?? (bodegas.data?.[0] ? { ...bodegas.data[0], descripcion: bodegas.data[0].nombre } : null);

  const agregar = (p) => {
    if (items.some((i) => i.id_producto === p.id)) return;
    setItems([
      ...items,
      {
        id_producto: p.id,
        descripcion: p.descripcion,
        cantidad: Math.max(1, Number(p.stock_minimo ?? 0) * 2 - Number(p.stock ?? 0)),
        costo_unitario: Number(p.preciocompra ?? 0),
      },
    ]);
  };
  const cambiar = (id, campo, valor) =>
    setItems(items.map((i) => (i.id_producto === id ? { ...i, [campo]: Math.max(0, Number(valor) || 0) } : i)));
  const total = items.reduce((a, i) => a + i.cantidad * i.costo_unitario, 0);

  async function guardar() {
    const validos = items.filter((i) => i.cantidad > 0);
    if (!validos.length) return;
    setGuardando(true);
    const r = await CrearOrdenCompra({
      id_empresa: idEmpresa,
      id_proveedor: proveedor?.id ?? null,
      id_bodega: bodegaActual?.id ?? null,
      fecha_esperada: fecha || null,
      nota: nota.trim() || null,
      items: validos,
    });
    setGuardando(false);
    if (r) {
      onGuardado();
      onClose();
    }
  }

  return (
    <Modal
      titulo="Nueva orden de compra"
      subtitulo="Queda en borrador hasta que la marques como enviada."
      onClose={onClose}
      ancho="760px"
      pie={
        <>
          <span style={{ marginRight: "auto", fontWeight: 700 }}>Total: {dinero(total)}</span>
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton icono={<v.iconoguardar />} cargando={guardando} disabled={!items.some((i) => i.cantidad > 0)} funcion={guardar}>
            Crear orden
          </Boton>
        </>
      }
    >
      <FormOrden>
        <div className="fila">
          <label>
            Proveedor
            <Selector
              opciones={[{ id: null, descripcion: "Sin proveedor" }, ...(proveedores.data ?? []).map((p) => ({ ...p, descripcion: p.nombre }))]}
              valor={proveedor ?? { id: null, descripcion: "Sin proveedor" }}
              onChange={setProveedor}
              buscable
              icono={<v.iconoproveedores />}
            />
          </label>
          <label>
            Recibe en
            <Selector
              opciones={(bodegas.data ?? []).map((b) => ({ ...b, descripcion: b.nombre }))}
              valor={bodegaActual}
              onChange={setBodega}
              icono={<v.iconobodegas />}
            />
          </label>
          <label>
            Fecha esperada
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>

        <label>
          Agregar producto
          <Selector
            opciones={productos.data ?? []}
            valor={null}
            onChange={agregar}
            buscable
            onBuscar={setTexto}
            icono={<v.iconostock />}
            placeholder="Busca un producto"
            renderOpcion={(o) => (
              <span style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
                <span>{o.descripcion}</span>
                <small style={{ opacity: 0.7 }}>
                  Stock {formatearNumero(o.stock)} · mín. {formatearNumero(o.stock_minimo)}
                </small>
              </span>
            )}
          />
        </label>

        {items.length ? (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Costo unitario</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id_producto}>
                  <td>{i.descripcion}</td>
                  <td>
                    <input type="number" min="0" step="any" value={i.cantidad} onChange={(e) => cambiar(i.id_producto, "cantidad", e.target.value)} />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={i.costo_unitario}
                      onChange={(e) => cambiar(i.id_producto, "costo_unitario", e.target.value)}
                    />
                  </td>
                  <td>{dinero(i.cantidad * i.costo_unitario)}</td>
                  <td>
                    <button type="button" className="quitar" onClick={() => setItems(items.filter((x) => x !== i))} aria-label="Quitar">
                      <v.iconocerrar />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EstadoVacio titulo="Agrega productos" mensaje="La cantidad sugerida repone hasta el doble del stock mínimo." />
        )}

        <label>
          Nota
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Opcional" />
        </label>
      </FormOrden>
    </Modal>
  );
}

function DetalleOrden({ orden, dinero, onClose, onCambio }) {
  const [trabajando, setTrabajando] = useState(null);
  const ejecutar = async (clave, fn) => {
    setTrabajando(clave);
    const ok = await fn();
    setTrabajando(null);
    if (ok) onCambio();
  };

  return (
    <Modal
      titulo={`Orden OC-${orden.numero}`}
      subtitulo={`${orden.proveedores?.nombre ?? "Sin proveedor"} · recibe en ${orden.bodegas?.nombre ?? ""}`}
      onClose={onClose}
      ancho="600px"
      pie={
        <>
          {orden.estado === "borrador" && (
            <Boton
              variante="peligro"
              icono={<v.iconeliminarTabla />}
              cargando={trabajando === "eliminar"}
              funcion={async () => {
                if (await confirmarEliminacion(`Se eliminará el borrador OC-${orden.numero}.`)) {
                  ejecutar("eliminar", () => EliminarOrdenCompra(orden));
                }
              }}
            >
              Eliminar
            </Boton>
          )}
          {orden.estado === "enviada" && (
            <Boton
              variante="peligro"
              icono={<v.iconoanular />}
              cargando={trabajando === "cancelar"}
              funcion={() => ejecutar("cancelar", () => CambiarEstadoOrden({ id: orden.id, estado: "cancelada" }))}
            >
              Cancelar orden
            </Boton>
          )}
          {orden.estado === "borrador" && (
            <Boton
              variante="secundario"
              icono={<v.iconoenviar />}
              cargando={trabajando === "enviar"}
              funcion={() => ejecutar("enviar", () => CambiarEstadoOrden({ id: orden.id, estado: "enviada" }))}
            >
              Marcar como enviada
            </Boton>
          )}
          {["borrador", "enviada"].includes(orden.estado) && (
            <Boton
              icono={<v.iconoproveedores />}
              cargando={trabajando === "recibir"}
              funcion={() => ejecutar("recibir", () => RecibirOrdenCompra(orden.id))}
            >
              Recibir mercancía
            </Boton>
          )}
        </>
      }
    >
      <DetalleLista>
        <div className="estado">
          <EtiquetaEstado estado={orden.estado} />
          {orden.creada_por === "novandra" && (
            <Etiqueta tono="primary" icono={<v.icononovandra />}>
              Propuesta por Novandra
            </Etiqueta>
          )}
          {orden.fecha_esperada && <span>Llega el {formatearFecha(`${orden.fecha_esperada}T12:00:00`)}</span>}
        </div>
        {orden.nota && <p className="nota">{orden.nota}</p>}
        <ul>
          {orden.detalle_orden_compra.map((d) => (
            <li key={d.id}>
              <span>
                <strong>{d.descripcion}</strong>
                <small>
                  {formatearNumero(d.cantidad)} × {dinero(d.costo_unitario)}
                </small>
              </span>
              <strong>{dinero(d.total)}</strong>
            </li>
          ))}
        </ul>
        <p className="total">Total {dinero(orden.total)}</p>
      </DetalleLista>
    </Modal>
  );
}

const FormOrden = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .fila {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  input {
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-weight: 400;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
    th {
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: ${({ theme }) => theme.textMuted};
      padding: 6px;
    }
    td {
      padding: 6px;
      border-top: 1px solid ${({ theme }) => theme.border};
    }
    input {
      width: 110px;
      height: 36px;
    }
  }
  .quitar {
    border: none;
    background: none;
    color: ${({ theme }) => theme.danger};
    cursor: pointer;
    font-size: 16px;
  }
`;

const DetalleLista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  .estado {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .nota {
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.primarySoft};
    font-size: 0.88rem;
  }
  ul {
    list-style: none;
    li {
      display: flex;
      justify-content: space-between;
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
  .total {
    text-align: right;
    font-weight: 700;
    font-size: 1.1rem;
  }
`;
