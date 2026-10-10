import { useMemo, useState } from "react";
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
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { Selector } from "../Components/organismos/Selector";
import { SelectorProducto } from "../Components/organismos/reportes/SelectorProducto";
import { Buscador } from "../Components/organismos/Buscador";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useProductosStore } from "../store/ProductosStore";
import { MostrarBodegas } from "../supabase/crudBodegas";
import {
  AceptarVinculo,
  CambiarPedido,
  CancelarVinculo,
  ConfigurarVinculo,
  EnviarMercancia,
  EnviosRed,
  ImportarCatalogoRed,
  InvitarEmpresa,
  MisVinculos,
  PedidosRed,
  PedirMercancia,
  RecibirEnvio,
  RechazarEnvio,
  StockRed,
} from "../supabase/crudRed";
import { MODULOS, esAdmin } from "../utils/permisos";
import { confirmarEliminacion } from "../utils/notificaciones";
import { formatearFechaHora, formatearMoneda, formatearNumero } from "../utils/conversiones";
import { v } from "../styles/variables";

// Red de empresas: partners y franquicias vinculados. Stock en tiempo real, catálogo, envíos y pedidos.
export function Red() {
  return (
    <ConPermiso modulo={MODULOS.red}>
      <Contenido />
    </ConPermiso>
  );
}

const ESTADO_ENVIO = { enviado: ["warning", "En camino"], recibido: ["success", "Recibido"], rechazado: ["danger", "Rechazado"] };
const ESTADO_PEDIDO = { pendiente: ["warning", "Pendiente"], despachado: ["success", "Despachado"], rechazado: ["danger", "Rechazado"], cancelado: ["neutro", "Cancelado"] };

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const { datausuario } = useUsuariosStore();
  const idEmpresa = dataempresa?.id;
  const admin = esAdmin(datausuario);
  const queryClient = useQueryClient();
  const [pestana, setPestana] = useState("vinculos");
  const [modal, setModal] = useState(null); // { tipo, ...datos }

  const red = useQuery({ queryKey: ["red vinculos", idEmpresa], queryFn: () => MisVinculos(idEmpresa), enabled: !!idEmpresa });
  const envios = useQuery({ queryKey: ["red envios", idEmpresa], queryFn: () => EnviosRed(idEmpresa), enabled: !!idEmpresa });
  const pedidos = useQuery({ queryKey: ["red pedidos", idEmpresa], queryFn: () => PedidosRed(idEmpresa), enabled: !!idEmpresa });
  const bodegas = useQuery({ queryKey: ["bodegas", idEmpresa], queryFn: () => MostrarBodegas(idEmpresa), enabled: !!idEmpresa });
  const recargar = () => {
    queryClient.invalidateQueries();
    useProductosStore.getState().recargar();
  };

  if (red.isLoading) return <SpinnerLoader />;
  if (red.error) return <ErrorMolecula mensaje={red.error.message} reintentar={red.refetch} />;

  const { limite = 0, usados = 0, vinculos = [] } = red.data ?? {};
  const activos = vinculos.filter((x) => x.estado === "activo");
  const porRecibir = (envios.data ?? []).filter((e) => e.direccion === "recibido" && e.estado === "enviado").length;
  const porAtender = (pedidos.data ?? []).filter((p) => p.direccion === "recibido" && p.estado === "pendiente").length;
  const opcionesBodega = (bodegas.data ?? []).map((b) => ({ ...b, descripcion: b.nombre }));

  const pestanas = [
    ["vinculos", "Empresas", activos.length],
    ["stock", "Stock de la red"],
    ["envios", "Envíos", porRecibir],
    ["pedidos", "Pedidos", porAtender],
  ];

  return (
    <PaginaTemplate
      titulo="Red de empresas"
      descripcion="Tus partners y franquicias: stock en tiempo real, envíos de mercancía y pedidos entre empresas."
      acciones={
        admin && (
          <>
            <Boton variante="secundario" icono={<v.iconolisto />} funcion={() => setModal({ tipo: "codigo" })}>
              Tengo un código
            </Boton>
            {limite > 0 ? (
              <Boton icono={<v.agregar />} funcion={() => setModal({ tipo: "invitar" })} disabled={usados >= limite}>
                Invitar empresa
              </Boton>
            ) : (
              <Link to="/configurar/plan" style={{ textDecoration: "none" }}>
                <Boton icono={<v.iconored />}>Plan Partner</Boton>
              </Link>
            )}
          </>
        )
      }
    >
      {limite > 0 && (
        <Aviso>
          <b>
            {usados} de {limite}
          </b>{" "}
          empresas vinculadas en tu plan.
          {usados >= limite && (
            <>
              {" "}
              ¿Necesitas más? Agrega el complemento <Link to="/configurar/plan">Empresa vinculada adicional</Link>.
            </>
          )}
        </Aviso>
      )}
      {limite === 0 && activos.length === 0 && (
        <Aviso>
          Con el <b>plan Partner</b> invitas a tus franquicias o socios y ves su stock en tiempo real. Si ya te invitaron, usa <b>Tengo un código</b>.
        </Aviso>
      )}

      <Pestanas role="tablist">
        {pestanas.map(([id, texto, n]) => (
          <button key={id} role="tab" aria-selected={pestana === id} className={pestana === id ? "activa" : ""} onClick={() => setPestana(id)}>
            {texto}
            {n > 0 && <em>{n}</em>}
          </button>
        ))}
      </Pestanas>

      {pestana === "vinculos" && (
        <Vinculos vinculos={vinculos} admin={admin} idEmpresa={idEmpresa} recargar={recargar} abrir={setModal} />
      )}
      {pestana === "stock" && <StockDeLaRed activos={activos} idEmpresa={idEmpresa} admin={admin} recargar={recargar} abrir={setModal} />}
      {pestana === "envios" && (
        <Envios lista={envios.data ?? []} idEmpresa={idEmpresa} opcionesBodega={opcionesBodega} recargar={recargar} abrir={setModal} />
      )}
      {pestana === "pedidos" && <Pedidos lista={pedidos.data ?? []} idEmpresa={idEmpresa} activos={activos} recargar={recargar} abrir={setModal} />}

      {modal?.tipo === "invitar" && <ModalInvitar idEmpresa={idEmpresa} onClose={() => setModal(null)} recargar={recargar} />}
      {modal?.tipo === "codigo" && <ModalCodigo idEmpresa={idEmpresa} onClose={() => setModal(null)} recargar={recargar} />}
      {modal?.tipo === "enviar" && (
        <ModalEnviar
          idEmpresa={idEmpresa}
          activos={activos}
          vinculoInicial={modal.vinculo}
          pedido={modal.pedido}
          opcionesBodega={opcionesBodega}
          onClose={() => setModal(null)}
          recargar={recargar}
        />
      )}
      {modal?.tipo === "pedir" && (
        <ModalPedir idEmpresa={idEmpresa} activos={activos} vinculoInicial={modal.vinculo} onClose={() => setModal(null)} recargar={recargar} />
      )}
      {modal?.tipo === "recibir" && (
        <ModalRecibir envio={modal.envio} idEmpresa={idEmpresa} opcionesBodega={opcionesBodega} onClose={() => setModal(null)} recargar={recargar} />
      )}
      {modal?.tipo === "items" && <ModalItems titulo={modal.titulo} items={modal.items} onClose={() => setModal(null)} />}
    </PaginaTemplate>
  );
}

// ------------------------------------------------------------------ Empresas vinculadas
function Vinculos({ vinculos, admin, idEmpresa, recargar, abrir }) {
  if (!vinculos.length) {
    return <EstadoVacio titulo="Aún no tienes empresas vinculadas" mensaje="Invita a una franquicia o socio, o acepta el código que te enviaron." icono={<v.iconored />} />;
  }
  const cancelar = async (x) => {
    if (await confirmarEliminacion(`Se cancelará el vínculo con ${x.otra ?? "esa empresa"}. Los envíos y pedidos ya hechos se conservan.`, "¿Cancelar vínculo?", "Sí, cancelar")) {
      if (await CancelarVinculo(x.id, idEmpresa)) recargar();
    }
  };
  const cambiar = async (x, clave, valor) => {
    const ok = await ConfigurarVinculo(x.id, idEmpresa, { ...x.comparto, [clave]: valor });
    if (ok) recargar();
  };
  return (
    <Tarjetas>
      {vinculos.map((x) => (
        <TarjetaVinculo key={x.id}>
          <header>
            <div>
              <strong>{x.otra ?? "Invitación pendiente"}</strong>
              <small>{x.estado === "activo" ? `${x.otra_ciudad ?? ""} · vinculada ${formatearFechaHora(x.aceptado_en)}` : `Vence ${formatearFechaHora(x.expira_en)}`}</small>
            </div>
            <span className="chips">
              <Etiqueta tono={x.mi_rol === "matriz" ? "primary" : "info"}>{x.mi_rol === "matriz" ? "Eres la matriz" : "Eres partner"}</Etiqueta>
              <Etiqueta tono={x.estado === "activo" ? "success" : "warning"}>{x.estado === "activo" ? "Activo" : "Pendiente"}</Etiqueta>
            </span>
          </header>

          {x.estado === "pendiente" ? (
            <Codigo>
              <span>Comparte este código con la empresa:</span>
              <b>{x.codigo}</b>
              <Boton variante="secundario" tamano="sm" funcion={() => navigator.clipboard?.writeText(x.codigo)}>
                Copiar
              </Boton>
              {x.nota && <small>{x.nota}</small>}
            </Codigo>
          ) : (
            <>
              <Comparte>
                <span className="titulo">Comparto con {x.otra}</span>
                {[
                  ["stock", "Mi stock en tiempo real"],
                  ["costos", "Mis costos de compra"],
                  ["catalogo", "Mi catálogo (para que lo importe)"],
                ].map(([clave, texto]) => (
                  <label key={clave}>
                    <input type="checkbox" checked={!!x.comparto?.[clave]} disabled={!admin} onChange={(e) => cambiar(x, clave, e.target.checked)} />
                    {texto}
                  </label>
                ))}
                <span className="titulo">{x.otra} comparte</span>
                <span className="resumen">
                  {[x.comparte?.stock && "stock", x.comparte?.costos && "costos", x.comparte?.catalogo && "catálogo"].filter(Boolean).join(" · ") || "nada por ahora"}
                </span>
              </Comparte>
              <Pendientes>
                {x.envios_por_recibir > 0 && <Etiqueta tono="warning">{x.envios_por_recibir} envío(s) por recibir</Etiqueta>}
                {x.pedidos_por_atender > 0 && <Etiqueta tono="warning">{x.pedidos_por_atender} pedido(s) por atender</Etiqueta>}
              </Pendientes>
              <footer>
                <Boton tamano="sm" icono={<v.iconoenviar />} funcion={() => abrir({ tipo: "enviar", vinculo: x })}>
                  Enviar mercancía
                </Boton>
                <Boton tamano="sm" variante="secundario" icono={<v.iconocompras />} funcion={() => abrir({ tipo: "pedir", vinculo: x })}>
                  Pedir
                </Boton>
                {admin && (
                  <Boton tamano="sm" variante="fantasma" funcion={() => cancelar(x)}>
                    Cancelar vínculo
                  </Boton>
                )}
              </footer>
            </>
          )}
          {x.estado === "pendiente" && admin && (
            <footer>
              <Boton tamano="sm" variante="fantasma" funcion={() => cancelar(x)}>
                Anular invitación
              </Boton>
            </footer>
          )}
        </TarjetaVinculo>
      ))}
    </Tarjetas>
  );
}

// ------------------------------------------------------------------ Stock de la red
function StockDeLaRed({ activos, idEmpresa, admin, recargar, abrir }) {
  const [vinculo, setVinculo] = useState(null);
  const [texto, setTexto] = useState("");
  const opciones = activos.map((x) => ({ ...x, descripcion: x.otra }));
  const actual = opciones.find((x) => x.id === vinculo?.id) ?? opciones[0] ?? null;
  const stock = useQuery({
    queryKey: ["red stock", idEmpresa, actual?.id, texto],
    queryFn: () => StockRed(actual.id, idEmpresa, texto),
    enabled: !!actual,
    placeholderData: (previo) => previo,
    refetchInterval: 30000,
  });
  if (!activos.length) return <EstadoVacio titulo="Sin empresas vinculadas" mensaje="Cuando tengas un vínculo activo verás aquí su inventario." icono={<v.iconored />} />;
  const datos = stock.data;
  const importar = async (ids) => {
    const r = await ImportarCatalogoRed(actual.id, idEmpresa, ids);
    if (r) recargar();
  };
  const columnas = [
    {
      accessorKey: "descripcion",
      header: "Producto",
      meta: { width: "220px" },
      cell: ({ row }) => (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong>{row.original.descripcion}</strong>
          <small style={{ opacity: 0.7 }}>{[row.original.codigointerno, row.original.categoria].filter(Boolean).join(" · ")}</small>
        </span>
      ),
    },
    { accessorKey: "stock", header: "Stock", meta: { align: "right" }, cell: (i) => <strong>{formatearNumero(i.getValue())}</strong> },
    {
      id: "bodegas",
      header: "Por bodega",
      cell: ({ row }) => (row.original.bodegas ?? []).map((b) => `${b.bodega}: ${formatearNumero(b.cantidad)}`).join(" · ") || "—",
    },
    { accessorKey: "precioventa", header: "Precio", meta: { align: "right" }, cell: (i) => formatearMoneda(i.getValue()) },
    ...(datos?.costos ? [{ accessorKey: "preciocompra", header: "Costo", meta: { align: "right" }, cell: (i) => formatearMoneda(i.getValue()) }] : []),
    {
      id: "mio",
      header: "En mi catálogo",
      cell: ({ row }) =>
        row.original.mi_producto ? (
          <Etiqueta tono="success">Lo tienes</Etiqueta>
        ) : datos?.catalogo && admin ? (
          <Boton tamano="sm" variante="fantasma" funcion={() => importar([row.original.id])}>
            Agregar
          </Boton>
        ) : (
          <Etiqueta tono="neutro">No</Etiqueta>
        ),
    },
  ];
  return (
    <>
      <Filtros>
        <Selector opciones={opciones} valor={actual} onChange={setVinculo} icono={<v.iconored />} />
        <Buscador setBuscador={setTexto} placeholder="Buscar en su inventario..." />
        <span className="acciones">
          <Boton tamano="sm" variante="secundario" icono={<v.iconocompras />} funcion={() => abrir({ tipo: "pedir", vinculo: actual })}>
            Pedir a {actual?.otra}
          </Boton>
          {datos?.catalogo && admin && (
            <Boton tamano="sm" variante="secundario" icono={<v.iconostock />} funcion={() => importar(null)}>
              Importar todo el catálogo
            </Boton>
          )}
        </span>
      </Filtros>
      {stock.isLoading ? (
        <SpinnerLoader />
      ) : datos && !datos.comparte ? (
        <EstadoVacio titulo={`${actual?.otra} no comparte su stock`} mensaje="Pídele que active “Mi stock en tiempo real” en su Red de empresas." icono={<v.iconored />} />
      ) : (
        <DataTable data={datos?.productos ?? []} columns={columnas} tamanoPagina={25} vacio={<EstadoVacio titulo="Sin productos" mensaje="Esa empresa aún no tiene productos con ese nombre." />} />
      )}
    </>
  );
}

// ------------------------------------------------------------------ Envíos
function Envios({ lista, idEmpresa, recargar, abrir }) {
  const rechazar = async (e) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `¿Rechazar el envío RED-${e.numero}?`,
      text: "La mercancía volverá al inventario de quien la envió.",
      input: "text",
      inputPlaceholder: "Motivo (opcional)",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Volver",
      confirmButtonColor: "#DC2626",
      reverseButtons: true,
    });
    if (isConfirmed && (await RechazarEnvio(e.id, idEmpresa, value))) recargar();
  };
  const columnas = [
    { accessorKey: "created_at", header: "Fecha", meta: { nowrap: true }, cell: (i) => formatearFechaHora(i.getValue()) },
    {
      id: "numero",
      header: "Envío",
      cell: ({ row }) => (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong>RED-{row.original.numero}</strong>
          <small style={{ opacity: 0.7 }}>{row.original.direccion === "enviado" ? `Para ${row.original.otra}` : `De ${row.original.otra}`}</small>
        </span>
      ),
    },
    { accessorKey: "unidades", header: "Unidades", meta: { align: "right" }, cell: (i) => formatearNumero(i.getValue()) },
    { id: "bodega", header: "Bodega", cell: ({ row }) => (row.original.direccion === "enviado" ? row.original.bodega_origen : row.original.bodega_destino) ?? "—" },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const [tono, texto] = ESTADO_ENVIO[row.original.estado] ?? ["neutro", row.original.estado];
        return (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
            <Etiqueta tono={tono}>{texto}</Etiqueta>
            {row.original.motivo_rechazo && <small style={{ opacity: 0.7 }}>{row.original.motivo_rechazo}</small>}
          </span>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const e = row.original;
        return (
          <Acciones>
            <Boton tamano="sm" variante="fantasma" funcion={() => abrir({ tipo: "items", titulo: `Envío RED-${e.numero}`, items: e.items })}>
              Ver
            </Boton>
            {e.direccion === "recibido" && e.estado === "enviado" && (
              <>
                <Boton tamano="sm" variante="exito" funcion={() => abrir({ tipo: "recibir", envio: e })}>
                  Recibir
                </Boton>
                <Boton tamano="sm" variante="fantasma" funcion={() => rechazar(e)}>
                  Rechazar
                </Boton>
              </>
            )}
          </Acciones>
        );
      },
    },
  ];
  return <DataTable data={lista} columns={columnas} tamanoPagina={20} vacio={<EstadoVacio titulo="Sin envíos" mensaje="Cuando envíes o recibas mercancía de tu red aparecerá aquí." icono={<v.iconoenviar />} />} />;
}

// ------------------------------------------------------------------ Pedidos
function Pedidos({ lista, idEmpresa, recargar, abrir }) {
  const responder = async (p, estado) => {
    const { value, isConfirmed } = await Swal.fire({
      title: estado === "rechazado" ? `¿Rechazar el pedido RED-${p.numero}?` : `¿Cancelar tu pedido RED-${p.numero}?`,
      input: estado === "rechazado" ? "text" : undefined,
      inputPlaceholder: "Respuesta (opcional)",
      showCancelButton: true,
      confirmButtonText: estado === "rechazado" ? "Rechazar" : "Cancelar pedido",
      cancelButtonText: "Volver",
      confirmButtonColor: "#DC2626",
      reverseButtons: true,
    });
    if (isConfirmed && (await CambiarPedido(p.id, idEmpresa, estado, value))) recargar();
  };
  const columnas = [
    { accessorKey: "created_at", header: "Fecha", meta: { nowrap: true }, cell: (i) => formatearFechaHora(i.getValue()) },
    {
      id: "numero",
      header: "Pedido",
      cell: ({ row }) => (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <strong>RED-{row.original.numero}</strong>
          <small style={{ opacity: 0.7 }}>{row.original.direccion === "hecho" ? `A ${row.original.otra}` : `De ${row.original.otra}`}</small>
        </span>
      ),
    },
    { accessorKey: "unidades", header: "Unidades", meta: { align: "right" }, cell: (i) => formatearNumero(i.getValue()) },
    { accessorKey: "nota", header: "Nota", cell: (i) => i.getValue() ?? "—" },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const [tono, texto] = ESTADO_PEDIDO[row.original.estado] ?? ["neutro", row.original.estado];
        return (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
            <Etiqueta tono={tono}>{texto}</Etiqueta>
            {row.original.respuesta && <small style={{ opacity: 0.7 }}>{row.original.respuesta}</small>}
          </span>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      enableSorting: false,
      meta: { align: "right" },
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Acciones>
            <Boton tamano="sm" variante="fantasma" funcion={() => abrir({ tipo: "items", titulo: `Pedido RED-${p.numero}`, items: p.items })}>
              Ver
            </Boton>
            {p.direccion === "recibido" && p.estado === "pendiente" && (
              <>
                <Boton tamano="sm" variante="exito" funcion={() => abrir({ tipo: "enviar", vinculo: { id: p.id_vinculo, otra: p.otra }, pedido: p })}>
                  Despachar
                </Boton>
                <Boton tamano="sm" variante="fantasma" funcion={() => responder(p, "rechazado")}>
                  Rechazar
                </Boton>
              </>
            )}
            {p.direccion === "hecho" && p.estado === "pendiente" && (
              <Boton tamano="sm" variante="fantasma" funcion={() => responder(p, "cancelado")}>
                Cancelar
              </Boton>
            )}
          </Acciones>
        );
      },
    },
  ];
  return <DataTable data={lista} columns={columnas} tamanoPagina={20} vacio={<EstadoVacio titulo="Sin pedidos" mensaje="Pide mercancía a tu red o atiende los pedidos que te hagan." icono={<v.iconocompras />} />} />;
}

// ------------------------------------------------------------------ Modales
function ModalInvitar({ idEmpresa, onClose, recargar }) {
  const [nota, setNota] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const crear = async () => {
    setCargando(true);
    const r = await InvitarEmpresa(idEmpresa, nota);
    setCargando(false);
    if (r) {
      setResultado(r);
      recargar();
    }
  };
  return (
    <Modal titulo="Invitar una empresa" subtitulo="Genera un código y compártelo con el dueño de la otra empresa. Vale 7 días." onClose={onClose} ancho="480px">
      {resultado ? (
        <Codigo>
          <span>Código de vínculo</span>
          <b>{resultado.codigo}</b>
          <Boton variante="secundario" tamano="sm" funcion={() => navigator.clipboard?.writeText(resultado.codigo)}>
            Copiar
          </Boton>
          <small>La otra empresa lo ingresa en Red de empresas → Tengo un código. Vence {formatearFechaHora(resultado.expira_en)}.</small>
          <Boton funcion={onClose}>Listo</Boton>
        </Codigo>
      ) : (
        <Formulario
          onSubmit={(e) => {
            e.preventDefault();
            crear();
          }}
        >
          <InputText label="Nota para ti (opcional)" icono={<v.iconotodos />}>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Franquicia Calarcá" maxLength={120} />
          </InputText>
          <div className="acciones">
            <Boton variante="secundario" funcion={onClose}>
              Cancelar
            </Boton>
            <Boton type="submit" cargando={cargando} icono={<v.agregar />}>
              Generar código
            </Boton>
          </div>
        </Formulario>
      )}
    </Modal>
  );
}

function ModalCodigo({ idEmpresa, onClose, recargar }) {
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const aceptar = async () => {
    setCargando(true);
    const r = await AceptarVinculo(idEmpresa, codigo.trim().toUpperCase());
    setCargando(false);
    if (r) {
      recargar();
      onClose();
    }
  };
  return (
    <Modal titulo="Tengo un código" subtitulo="Pega el código que te envió la empresa matriz." onClose={onClose} ancho="440px">
      <Formulario
        onSubmit={(e) => {
          e.preventDefault();
          aceptar();
        }}
      >
        <InputText label="Código" icono={<v.iconored />}>
          <input autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="RED-XXXXXX" style={{ textTransform: "uppercase" }} />
        </InputText>
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando} disabled={codigo.trim().length < 6}>
            Vincular
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

// Constructor de líneas (producto + cantidad). conTextoLibre permite pedir productos que no tengo.
function ListaItems({ items, setItems, conTextoLibre = false }) {
  const [producto, setProducto] = useState(null);
  const [texto, setTexto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const agregar = () => {
    const n = Number(cantidad);
    if (!(n > 0)) return;
    if (producto) {
      setItems([...items.filter((i) => i.id_producto !== producto.id), { id_producto: producto.id, descripcion: producto.descripcion, codigointerno: producto.codigointerno, codigobarras: producto.codigobarras, cantidad: n, disponible: producto.stock }]);
    } else if (conTextoLibre && texto.trim()) {
      setItems([...items, { descripcion: texto.trim(), cantidad: n }]);
    } else return;
    setProducto(null);
    setTexto("");
    setCantidad("");
  };
  return (
    <Items>
      <div className="fila">
        <div className="producto">
          <SelectorProducto valor={producto} onChange={setProducto} />
        </div>
        <input type="number" step="any" min="0" placeholder="Cant." value={cantidad} onChange={(e) => setCantidad(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())} />
        <Boton type="button" variante="secundario" funcion={agregar}>
          Agregar
        </Boton>
      </div>
      {conTextoLibre && (
        <input className="libre" placeholder="O escribe un producto que no tienes en tu catálogo..." value={texto} onChange={(e) => { setTexto(e.target.value); if (e.target.value) setProducto(null); }} />
      )}
      {items.length > 0 && (
        <ul>
          {items.map((i, k) => (
            <li key={k}>
              <span>
                {i.descripcion}
                {i.disponible != null && <small> · disponible {formatearNumero(i.disponible)}</small>}
              </span>
              <b>{formatearNumero(i.cantidad)}</b>
              <button type="button" aria-label="Quitar" onClick={() => setItems(items.filter((_, j) => j !== k))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Items>
  );
}

function ModalEnviar({ idEmpresa, activos, vinculoInicial, pedido, opcionesBodega, onClose, recargar }) {
  const opciones = activos.map((x) => ({ ...x, descripcion: x.otra }));
  const [vinculo, setVinculo] = useState(opciones.find((x) => x.id === vinculoInicial?.id) ?? opciones[0] ?? null);
  const [bodega, setBodega] = useState(opcionesBodega[0] ?? null);
  const [items, setItems] = useState(() =>
    (pedido?.items ?? []).filter((i) => i.id_producto).map((i) => ({ id_producto: i.id_producto, descripcion: i.descripcion, cantidad: Number(i.cantidad) }))
  );
  const [nota, setNota] = useState(pedido ? `Pedido RED-${pedido.numero}` : "");
  const [cargando, setCargando] = useState(false);
  const faltantes = (pedido?.items ?? []).filter((i) => !i.id_producto);
  const enviar = async () => {
    if (!vinculo || !items.length) return;
    setCargando(true);
    const r = await EnviarMercancia({
      idVinculo: vinculo.id,
      idEmpresa,
      idBodega: bodega?.id ?? null,
      items: items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
      nota,
      idPedido: pedido?.id ?? null,
    });
    setCargando(false);
    if (r) {
      recargar();
      onClose();
    }
  };
  return (
    <Modal titulo={pedido ? `Despachar pedido RED-${pedido.numero}` : "Enviar mercancía"} subtitulo="Sale de tu inventario ahora; entra al de la otra empresa cuando lo reciba." onClose={onClose} ancho="600px">
      <Formulario
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <div className="grid">
          <div>
            <span className="etiqueta">Para</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={opciones} valor={vinculo} onChange={setVinculo} icono={<v.iconored />} />
            </div>
          </div>
          <div>
            <span className="etiqueta">Desde la bodega</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={opcionesBodega} valor={bodega} onChange={setBodega} icono={<v.iconobodegas />} />
            </div>
          </div>
        </div>
        {faltantes.length > 0 && (
          <Aviso>
            Pidieron productos que no están en tu catálogo: {faltantes.map((i) => `${i.descripcion} (${formatearNumero(i.cantidad)})`).join(", ")}. Agrégalos si los tienes con otro nombre.
          </Aviso>
        )}
        <div>
          <span className="etiqueta">Productos</span>
          <ListaItems items={items} setItems={setItems} />
        </div>
        <InputText label="Nota (opcional)" icono={<v.iconotodos />}>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ej. Guía de transporte 12345" />
        </InputText>
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando} disabled={!items.length || !vinculo} icono={<v.iconoenviar />}>
            Enviar {items.length ? `${formatearNumero(items.reduce((s, i) => s + i.cantidad, 0))} und` : ""}
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

function ModalPedir({ idEmpresa, activos, vinculoInicial, onClose, recargar }) {
  const [elegidos, setElegidos] = useState(() => new Set(vinculoInicial ? [vinculoInicial.id] : activos.map((x) => x.id)));
  const [items, setItems] = useState([]);
  const [nota, setNota] = useState("");
  const [cargando, setCargando] = useState(false);
  const alternar = (id) => {
    const s = new Set(elegidos);
    s.has(id) ? s.delete(id) : s.add(id);
    setElegidos(s);
  };
  const pedir = async () => {
    if (!elegidos.size || !items.length) return;
    setCargando(true);
    const r = await PedirMercancia({
      idEmpresa,
      idsVinculo: [...elegidos],
      items: items.map((i) => ({ id_producto: i.id_producto ?? null, descripcion: i.descripcion, codigointerno: i.codigointerno ?? null, codigobarras: i.codigobarras ?? null, cantidad: i.cantidad })),
      nota,
    });
    setCargando(false);
    if (r) {
      recargar();
      onClose();
    }
  };
  return (
    <Modal titulo="Pedir mercancía" subtitulo="El pedido llega a cada empresa elegida; cuando lo despachen, lo recibes en Envíos." onClose={onClose} ancho="600px">
      <Formulario
        onSubmit={(e) => {
          e.preventDefault();
          pedir();
        }}
      >
        <div>
          <span className="etiqueta">A quién</span>
          <Elegir>
            {activos.map((x) => (
              <label key={x.id} className={elegidos.has(x.id) ? "si" : ""}>
                <input type="checkbox" checked={elegidos.has(x.id)} onChange={() => alternar(x.id)} />
                {x.otra}
              </label>
            ))}
            {activos.length > 1 && (
              <button type="button" className="todos" onClick={() => setElegidos(new Set(elegidos.size === activos.length ? [] : activos.map((x) => x.id)))}>
                {elegidos.size === activos.length ? "Ninguna" : "Todas"}
              </button>
            )}
          </Elegir>
        </div>
        <div>
          <span className="etiqueta">Productos</span>
          <ListaItems items={items} setItems={setItems} conTextoLibre />
        </div>
        <InputText label="Nota (opcional)" icono={<v.iconotodos />}>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ej. Para la temporada de diciembre" />
        </InputText>
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={cargando} disabled={!items.length || !elegidos.size} icono={<v.iconocompras />}>
            Pedir a {elegidos.size} empresa{elegidos.size === 1 ? "" : "s"}
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

function ModalRecibir({ envio, idEmpresa, opcionesBodega, onClose, recargar }) {
  const [bodega, setBodega] = useState(opcionesBodega[0] ?? null);
  const [cargando, setCargando] = useState(false);
  const recibir = async () => {
    setCargando(true);
    const r = await RecibirEnvio(envio.id, idEmpresa, bodega?.id ?? null);
    setCargando(false);
    if (r) {
      recargar();
      onClose();
    }
  };
  return (
    <Modal titulo={`Recibir envío RED-${envio.numero}`} subtitulo={`De ${envio.otra}. Las unidades entran a tu inventario; los productos que no tengas se crean.`} onClose={onClose} ancho="520px">
      <Formulario
        onSubmit={(e) => {
          e.preventDefault();
          recibir();
        }}
      >
        <ItemsLista items={envio.items} />
        {opcionesBodega.length > 1 && (
          <div>
            <span className="etiqueta">Recibir en</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={opcionesBodega} valor={bodega} onChange={setBodega} icono={<v.iconobodegas />} />
            </div>
          </div>
        )}
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="exito" cargando={cargando} icono={<v.iconolisto />}>
            Recibir {formatearNumero(envio.unidades)} und
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

function ModalItems({ titulo, items, onClose }) {
  return (
    <Modal titulo={titulo} onClose={onClose} ancho="520px">
      <ItemsLista items={items} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Boton funcion={onClose}>Cerrar</Boton>
      </div>
    </Modal>
  );
}

function ItemsLista({ items }) {
  const total = useMemo(() => (items ?? []).reduce((s, i) => s + Number(i.cantidad), 0), [items]);
  return (
    <Items>
      <ul>
        {(items ?? []).map((i, k) => (
          <li key={k}>
            <span>
              {i.descripcion}
              {i.codigointerno && <small> · {i.codigointerno}</small>}
            </span>
            <b>{formatearNumero(i.cantidad)}</b>
          </li>
        ))}
        <li className="total">
          <span>Total</span>
          <b>{formatearNumero(total)}</b>
        </li>
      </ul>
    </Items>
  );
}

// ------------------------------------------------------------------ Estilos
const Aviso = styled.div`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.primarySoft};
  color: ${({ theme }) => theme.text};
  font-size: 0.92rem;
  margin-bottom: 14px;
  a {
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
  }
`;
const Pestanas = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    &.activa {
      background: ${({ theme }) => theme.text};
      color: ${({ theme }) => theme.surface};
      border-color: ${({ theme }) => theme.text};
    }
    em {
      font-style: normal;
      font-size: 0.72rem;
      padding: 1px 7px;
      border-radius: 999px;
      background: ${({ theme }) => theme.warningSoft};
      color: ${({ theme }) => theme.warning};
    }
    &.activa em {
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
    }
  }
`;
const Tarjetas = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
`;
const TarjetaVinculo = styled.article`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  box-shadow: ${({ theme }) => theme.shadow};
  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
    strong {
      display: block;
      font-size: 1.05rem;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
    .chips {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid ${({ theme }) => theme.border};
  }
`;
const Codigo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.radiusSm};
  background: ${({ theme }) => theme.surfaceAlt};
  span,
  small {
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.86rem;
  }
  b {
    font-size: 1.5rem;
    letter-spacing: 0.12em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
`;
const Comparte = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  .titulo {
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.textMuted};
    margin-top: 4px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .resumen {
    color: ${({ theme }) => theme.text};
  }
`;
const Pendientes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  &:empty {
    display: none;
  }
`;
const Filtros = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 14px;
  align-items: center;
  @media (min-width: 900px) {
    grid-template-columns: 260px 1fr auto;
  }
  .acciones {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;
const Acciones = styled.span`
  display: inline-flex;
  gap: 4px;
  justify-content: flex-end;
  flex-wrap: wrap;
`;
const Elegir = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    cursor: pointer;
    font-size: 0.9rem;
    &.si {
      border-color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.primarySoft};
    }
  }
  .todos {
    border: none;
    background: none;
    color: ${({ theme }) => theme.primary};
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
`;
const Items = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
  .fila {
    display: grid;
    grid-template-columns: 1fr 90px auto;
    gap: 8px;
    align-items: center;
  }
  .producto {
    min-width: 0;
  }
  input {
    padding: 9px 10px;
    border-radius: 10px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font: inherit;
    width: 100%;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusSm};
    overflow: hidden;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    align-items: center;
    padding: 8px 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    font-size: 0.92rem;
    &:first-child {
      border-top: none;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
    b {
      font-variant-numeric: tabular-nums;
    }
    button {
      border: none;
      background: none;
      color: ${({ theme }) => theme.textMuted};
      font-size: 1.1rem;
      cursor: pointer;
      line-height: 1;
    }
    &.total {
      background: ${({ theme }) => theme.surfaceAlt};
      font-weight: 600;
    }
  }
`;
