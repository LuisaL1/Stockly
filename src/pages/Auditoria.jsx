import { useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { BloqueoPagina } from "../Components/moleculas/BloqueoPagina";
import { BentoGrid, Tarjeta } from "../Components/moleculas/Bento";
import { DataTable } from "../Components/organismos/tablas/DataTable";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useNovandraStore } from "../store/NovandraStore";
import { MostrarAuditoria, MostrarResumenAuditoria } from "../supabase/crudInteligencia";
import { esAdmin } from "../utils/permisos";
import { formatearNumero, tiempoRelativo } from "../utils/conversiones";
import { v } from "../styles/variables";

const ACCIONES = {
  venta: "Registró una venta",
  venta_anulada: "Anuló una venta",
  venta_modificada: "Modificó una venta",
  descuento_alto: "Dio un descuento alto",
  salida_manual: "Salida manual de inventario",
  entrada_manual: "Entrada manual de inventario",
  movimiento_eliminado: "Eliminó un movimiento",
  stock_modificado_directo: "Cambió el stock directamente",
  producto_creado: "Creó un producto",
  producto_editado: "Editó un producto",
  producto_eliminado: "Eliminó un producto",
  traslado: "Trasladó mercancía",
  orden_creada: "Creó una orden de compra",
  orden_enviada: "Envió una orden de compra",
  orden_recibida: "Recibió una orden de compra",
  orden_cancelada: "Canceló una orden de compra",
  rol_cambiado: "Cambió un rol",
  usuario_eliminado: "Eliminó un usuario",
};

const nivel = (riesgo) =>
  riesgo >= 10 ? { tono: "danger", texto: "Revisar" } : riesgo >= 4 ? { tono: "warning", texto: "Atención" } : { tono: "success", texto: "Normal" };

// Resumen legible del detalle guardado en la auditoría.
function describir(r) {
  const d = r.detalle ?? {};
  const partes = [];
  if (d.producto) partes.push(d.producto);
  if (d.factura) partes.push(`Factura ${d.factura}`);
  if (d.orden) partes.push(d.orden);
  if (r.cantidad != null && ["salida_manual", "entrada_manual", "movimiento_eliminado", "traslado", "stock_modificado_directo"].includes(r.accion))
    partes.push(`${formatearNumero(r.cantidad)} und`);
  if (d.origen && d.destino) partes.push(`${d.origen} → ${d.destino}`);
  if (d.detalle) partes.push(`“${d.detalle}”`);
  if (d.precio_venta) partes.push(`Precio ${formatearNumero(d.precio_venta[0])} → ${formatearNumero(d.precio_venta[1])}`);
  if (d.antes != null && d.despues != null) partes.push(`${d.antes} → ${d.despues}`);
  if (d.porcentaje) partes.push(`${d.porcentaje}% de descuento`);
  if (d.vendedor) partes.push(`vendida por ${d.vendedor}`);
  return partes.join(" · ");
}

export function Auditoria() {
  const { datausuario } = useUsuariosStore();
  if (!esAdmin(datausuario)) return <BloqueoPagina modulo="Auditoría (solo dueño o administradores)" />;
  return <Contenido />;
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const idEmpresa = dataempresa?.id;
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const [dias, setDias] = useState(30);
  const [empleado, setEmpleado] = useState(null);
  const [soloAlertas, setSoloAlertas] = useState(false);

  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const resumen = useQuery({
    queryKey: ["auditoria resumen", idEmpresa, dias],
    queryFn: () => MostrarResumenAuditoria({ idEmpresa, dias }),
    enabled: !!idEmpresa,
  });
  const registro = useQuery({
    queryKey: ["auditoria", idEmpresa, dias, empleado?.id_usuario, soloAlertas],
    queryFn: () => MostrarAuditoria({ idEmpresa, idUsuario: empleado?.id_usuario, soloAlertas, desde }),
    enabled: !!idEmpresa,
    placeholderData: (previo) => previo,
  });

  if (resumen.isLoading) return <SpinnerLoader />;
  if (resumen.error) return <ErrorMolecula mensaje={resumen.error.message} reintentar={resumen.refetch} />;

  const personas = resumen.data ?? [];
  const totalAlertas = personas.reduce((a, p) => a + Number(p.alertas ?? 0), 0);

  const columns = [
    {
      accessorKey: "fecha",
      header: "Cuándo",
      cell: (i) => (
        <span title={new Date(i.getValue()).toLocaleString("es-CO")} style={{ whiteSpace: "nowrap" }}>
          {tiempoRelativo(i.getValue())}
        </span>
      ),
    },
    { accessorKey: "usuario_nombre", header: "Quién", cell: (i) => <strong>{i.getValue() ?? "Sistema"}</strong> },
    { accessorKey: "accion", header: "Qué hizo", cell: (i) => ACCIONES[i.getValue()] ?? i.getValue() },
    { id: "detalle", header: "Detalle", accessorFn: (r) => describir(r) },
    { id: "lugar", header: "Dónde", accessorFn: (r) => r.bodegas?.nombre ?? r.sucursales?.nombre ?? "—" },
    {
      accessorKey: "alerta",
      header: "Alerta",
      cell: (i) => (i.getValue() ? <Etiqueta tono={i.getValue() === "Fuera de horario" ? "warning" : "danger"}>{i.getValue()}</Etiqueta> : null),
    },
  ];

  return (
    <PaginaTemplate
      titulo="Auditoría"
      descripcion="Registro inalterable de cada movimiento: quién lo hizo realmente, cuándo y dónde. Solo lo ven el dueño y los administradores."
      acciones={
        <Boton
          icono={<v.icononovandra />}
          funcion={() => abrirNovandra("Revisa la auditoría de los últimos 7 días y dime si hay movimientos sospechosos de algún empleado")}
        >
          Revisar con Novandra
        </Boton>
      }
      herramientas={
        <>
          <Select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </Select>
          <label className="check">
            <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} /> Solo alertas
          </label>
        </>
      }
    >
      <BentoGrid>
        <Tarjeta variante="tinta" col={4} colTablet={6} titulo="Cómo funciona" icono={<v.iconoauditoria />}>
          <Explicacion>
            <li>Cada venta, anulación, salida manual, traslado y cambio de precio queda registrado con el usuario que realmente lo hizo.</li>
            <li>Si alguien registra un movimiento a nombre de otro, lo borra o cambia el stock sin kardex, se marca como alerta.</li>
            <li>Nadie puede editar ni borrar este registro, ni siquiera desde la base de datos de la app.</li>
          </Explicacion>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            {formatearNumero(totalAlertas)} alertas en los últimos {dias} días.
          </p>
        </Tarjeta>

        <Tarjeta col={8} colTablet={6} titulo="Equipo" subtitulo="Toca una persona para ver solo sus movimientos" icono={<v.iconoUsuarios />}>
          {personas.length ? (
            <Equipo>
              {personas.map((p) => {
                const n = nivel(Number(p.riesgo));
                const activo = empleado?.id_usuario === p.id_usuario;
                return (
                  <button key={p.id_usuario} type="button" aria-pressed={activo} onClick={() => setEmpleado(activo ? null : p)}>
                    <span className="avatar">{(p.nombre ?? "?").charAt(0).toUpperCase()}</span>
                    <span className="info">
                      <strong>{p.nombre}</strong>
                      <small>
                        {p.tipouser ? p.tipouser.charAt(0).toUpperCase() + p.tipouser.slice(1) : "Usuario"} ·{" "}
                        {formatearNumero(p.movimientos)} movimientos
                        {p.ultima_actividad ? ` · ${tiempoRelativo(p.ultima_actividad)}` : ""}
                      </small>
                      <span className="chips">
                        {Number(p.suplantaciones) > 0 && <Etiqueta tono="danger">{p.suplantaciones} a nombre de otro</Etiqueta>}
                        {Number(p.stock_directo) > 0 && <Etiqueta tono="danger">{p.stock_directo} stock sin kardex</Etiqueta>}
                        {Number(p.eliminados) > 0 && <Etiqueta tono="danger">{p.eliminados} eliminados</Etiqueta>}
                        {Number(p.anulaciones) > 0 && <Etiqueta tono="warning">{p.anulaciones} anulaciones</Etiqueta>}
                        {Number(p.descuentos_altos) > 0 && <Etiqueta tono="warning">{p.descuentos_altos} descuentos altos</Etiqueta>}
                        {Number(p.salidas_manuales) > 0 && <Etiqueta tono="neutro">{p.salidas_manuales} salidas manuales</Etiqueta>}
                        {Number(p.fuera_horario) > 0 && <Etiqueta tono="neutro">{p.fuera_horario} fuera de horario</Etiqueta>}
                      </span>
                    </span>
                    <Etiqueta tono={n.tono}>{n.texto}</Etiqueta>
                  </button>
                );
              })}
            </Equipo>
          ) : (
            <EstadoVacio titulo="Sin personal" />
          )}
        </Tarjeta>
      </BentoGrid>

      <Encabezado>
        <h2>{empleado ? `Movimientos de ${empleado.nombre}` : "Todos los movimientos"}</h2>
        {empleado && (
          <Boton variante="fantasma" tamano="sm" funcion={() => setEmpleado(null)}>
            Ver todos
          </Boton>
        )}
      </Encabezado>
      <DataTable
        data={registro.data ?? []}
        columns={columns}
        tamanoPagina={20}
        vacio={<EstadoVacio titulo="Sin movimientos registrados" mensaje="La actividad del equipo aparecerá aquí." icono={<v.iconolista />} />}
      />
    </PaginaTemplate>
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

const Explicacion = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 18px;
  font-size: 0.88rem;
  line-height: 1.45;
`;

const Equipo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  button {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    text-align: left;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.surface};
    color: inherit;
    cursor: pointer;
    &:hover {
      border-color: ${({ theme }) => theme.textMuted};
    }
    &[aria-pressed="true"] {
      border-color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.primarySoft};
    }
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 50%;
    background: ${({ theme }) => theme.ink};
    color: ${({ theme }) => theme.inkText};
    font-weight: 700;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
`;

const Encabezado = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  h2 {
    font-size: 1.1rem;
  }
`;
