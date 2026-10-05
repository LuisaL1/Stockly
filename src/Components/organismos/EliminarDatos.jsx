import { useEffect, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../moleculas/Modal";
import { Boton } from "../atomos/Boton";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { UserAuth } from "../../context/contextoAuth";
import { ConteoDatos, EliminarDatos, EnviarCodigoCorreo, VerificarCodigoCorreo } from "../../supabase/crudImportacion";
import { normalizar } from "../../utils/excelStockly";
import { formatearNumero } from "../../utils/conversiones";
import { notificarExito } from "../../utils/notificaciones";
import { v } from "../../styles/variables";
import { CORREO_STOCKLY } from "../../utils/marca";

const cant = (n, singular, plural = `${singular}s`) => `${formatearNumero(n)} ${Number(n) === 1 ? singular : plural}`;

// Qué se puede eliminar. requiere: lo que se borra junto (por dependencias).
const OPCIONES = [
  {
    id: "ventas",
    titulo: "Ventas y facturas",
    texto: "Historial de ventas, pagos y facturas. El stock no se devuelve.",
    cuenta: (c) => cant(c.ventas, "venta"),
  },
  {
    id: "compras",
    titulo: "Órdenes de compra",
    texto: "Borradores, enviadas y recibidas.",
    cuenta: (c) => cant(c.compras, "orden", "órdenes"),
  },
  {
    id: "inventario",
    titulo: "Productos e inventario",
    texto: "Productos, movimientos de kardex, stock en bodegas, categorías y marcas.",
    cuenta: (c) => `${cant(c.productos, "producto")} · ${cant(c.movimientos, "movimiento")}`,
  },
  {
    id: "bodegas",
    titulo: "Bodegas y sedes adicionales",
    texto: "Se conservan la bodega y la sede principal. Incluye ventas, compras e inventario, que dependen de ellas.",
    cuenta: (c) => `${cant(c.bodegas, "bodega")} · ${cant(c.sucursales, "sede")}`,
    requiere: ["ventas", "compras", "inventario"],
  },
  {
    id: "clientes",
    titulo: "Clientes",
    texto: "Las ventas se conservan, sin el cliente.",
    cuenta: (c) => cant(c.clientes, "cliente"),
  },
  {
    id: "proveedores",
    titulo: "Proveedores",
    texto: "Las órdenes se conservan, sin el proveedor.",
    cuenta: (c) => cant(c.proveedores, "proveedor", "proveedores"),
  },
  {
    id: "notificaciones",
    titulo: "Notificaciones",
    texto: "Avisos de la campana.",
    cuenta: (c) => cant(c.notificaciones, "aviso"),
  },
];

const ocultarCorreo = (email = "") => {
  const [u, d] = email.split("@");
  return d ? `${u.slice(0, 2)}${"•".repeat(Math.max(u.length - 2, 1))}@${d}` : email;
};

// Eliminación de datos en 3 pasos: elegir, confirmar con el nombre de la empresa y código por correo.
export function EliminarDatosModal({ onClose, onExportar }) {
  const { dataempresa } = useEmpresaStore();
  const { user } = UserAuth();
  const queryClient = useQueryClient();
  const email = user?.email ?? "";
  const nombreEmpresa = dataempresa?.nombre ?? "";

  const [paso, setPaso] = useState(1);
  const [elegidos, setElegidos] = useState([]);
  const [confirmacion, setConfirmacion] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);

  const conteo = useQuery({
    queryKey: ["conteo datos", dataempresa?.id],
    queryFn: () => ConteoDatos(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const c = conteo.data ?? {};

  // Opciones que quedan incluidas por dependencia.
  const incluidos = new Set(elegidos.flatMap((id) => [id, ...(OPCIONES.find((o) => o.id === id)?.requiere ?? [])]));
  const alcances = OPCIONES.filter((o) => incluidos.has(o.id)).map((o) => o.id);
  const nombreOk = normalizar(confirmacion) === normalizar(nombreEmpresa) && !!nombreEmpresa;

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera(espera - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const alternar = (id) => setElegidos((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const todo = () => setElegidos(alcances.length === OPCIONES.length ? [] : OPCIONES.map((o) => o.id));

  async function enviarCodigo() {
    setError(null);
    setEnviando(true);
    try {
      await EnviarCodigoCorreo(email);
      setEspera(60);
      setPaso(3);
    } catch (e) {
      setError(
        /rate|seconds|too many/i.test(e.message) ? "Pediste muchos códigos seguidos. Espera un minuto e intenta de nuevo." : e.message,
      );
    }
    setEnviando(false);
  }

  async function eliminar() {
    setError(null);
    setTrabajando(true);
    try {
      await VerificarCodigoCorreo(email, codigo.trim());
    } catch {
      setError("El código no es válido o ya venció. Revisa tu correo o pide uno nuevo.");
      setTrabajando(false);
      return;
    }
    try {
      const r = await EliminarDatos(dataempresa.id, alcances, confirmacion);
      setResultado(r ?? {});
      setPaso(4);
      notificarExito("Datos eliminados");
      await queryClient.invalidateQueries();
    } catch (e) {
      setError(e.message);
    }
    setTrabajando(false);
  }

  const pie =
    paso === 4 ? (
      <Boton funcion={onClose}>Cerrar</Boton>
    ) : (
      <>
        {paso > 1 && (
          <Boton
            variante="fantasma"
            funcion={() => {
              setError(null);
              setPaso(paso - 1);
            }}
            disabled={trabajando}
          >
            Atrás
          </Boton>
        )}
        {paso === 1 && (
          <Boton variante="peligro" funcion={() => setPaso(2)} disabled={!alcances.length}>
            Continuar
          </Boton>
        )}
        {paso === 2 && (
          <Boton variante="peligro" icono={<v.iconoenviar />} cargando={enviando} funcion={enviarCodigo} disabled={!nombreOk || !email}>
            Enviar código a mi correo
          </Boton>
        )}
        {paso === 3 && (
          <Boton
            variante="peligro"
            icono={<v.iconeliminarTabla />}
            cargando={trabajando}
            funcion={eliminar}
            disabled={!/^\d{6,10}$/.test(codigo.trim())}
          >
            Eliminar definitivamente
          </Boton>
        )}
      </>
    );

  return (
    <Modal
      titulo="Eliminar datos"
      subtitulo={paso < 4 ? `Paso ${paso} de 3` : "Listo"}
      onClose={trabajando ? undefined : onClose}
      ancho="600px"
      pie={pie}
    >
      <Cuerpo>
        {paso === 1 && (
          <>
            <div className="alerta">
              <v.iconostockminimo />
              <p>
                Esto <strong>no se puede deshacer</strong>. Antes de continuar, descarga una copia de tus datos.{" "}
                <button type="button" className="enlace" onClick={onExportar}>
                  Descargar copia en Excel
                </button>
              </p>
            </div>
            <div className="cabecera">
              <strong>¿Qué quieres eliminar?</strong>
              <button type="button" className="enlace" onClick={todo}>
                {alcances.length === OPCIONES.length ? "Quitar todo" : "Seleccionar todo"}
              </button>
            </div>
            <ul className="opciones">
              {OPCIONES.map((o) => {
                const porDependencia = incluidos.has(o.id) && !elegidos.includes(o.id);
                return (
                  <li key={o.id}>
                    <label className={incluidos.has(o.id) ? "activa" : ""}>
                      <input type="checkbox" checked={incluidos.has(o.id)} disabled={porDependencia} onChange={() => alternar(o.id)} />
                      <span>
                        <strong>{o.titulo}</strong>
                        <small>{porDependencia ? "Incluido por las bodegas y sedes." : o.texto}</small>
                      </span>
                      <em>{conteo.data ? o.cuenta(c) : "…"}</em>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="nota">Nunca se borran: tu cuenta, tu equipo, la configuración, el plan ni la auditoría.</p>
          </>
        )}

        {paso === 2 && (
          <>
            <p>Vas a eliminar:</p>
            <ul className="resumen">
              {OPCIONES.filter((o) => incluidos.has(o.id)).map((o) => (
                <li key={o.id}>
                  <strong>{o.titulo}</strong> · {o.cuenta(c)}
                </li>
              ))}
            </ul>
            <label className="campo">
              Para confirmar, escribe el nombre de tu empresa: <strong>{nombreEmpresa}</strong>
              <input
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="off"
                placeholder={nombreEmpresa}
              />
            </label>
            <p className="nota">Después te enviaremos un código a {ocultarCorreo(email)} para verificar que eres tú.</p>
          </>
        )}

        {paso === 3 && (
          <>
            <p>
              Enviamos un código a <strong>{ocultarCorreo(email)}</strong>. Escríbelo para eliminar los datos. Vence en unos minutos.
            </p>
            <label className="campo">
              Código de verificación
              <input
                className="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                autoFocus
              />
            </label>
            <button type="button" className="enlace" disabled={espera > 0 || enviando} onClick={enviarCodigo}>
              {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
            </button>
            <p className="nota">
              ¿No llega? Revisa la carpeta de spam o escríbenos a <a href={`mailto:${CORREO_STOCKLY}`}>{CORREO_STOCKLY}</a>.
            </p>
          </>
        )}

        {paso === 4 && (
          <div className="listo">
            <v.iconocheck />
            <div>
              <strong>Datos eliminados</strong>
              <ul>
                {Object.entries(resultado ?? {}).map(([k, n]) => (
                  <li key={k}>
                    {k}: {formatearNumero(n)}
                  </li>
                ))}
              </ul>
              <small>Quedó registrado en la auditoría.</small>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </Cuerpo>
    </Modal>
  );
}

const Cuerpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 0.9rem;
  .alerta {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.dangerSoft};
    color: ${({ theme }) => theme.text};
    > svg {
      color: ${({ theme }) => theme.danger};
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 1px;
    }
  }
  .enlace {
    border: none;
    background: none;
    padding: 0;
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    cursor: pointer;
    &:disabled {
      color: ${({ theme }) => theme.textMuted};
      cursor: default;
    }
  }
  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .opciones {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    label {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: ${({ theme }) => theme.radius};
      border: 1px solid ${({ theme }) => theme.border};
      cursor: pointer;
      &.activa {
        border-color: ${({ theme }) => theme.danger};
        background: ${({ theme }) => theme.dangerSoft};
      }
    }
    input {
      width: 18px;
      height: 18px;
      accent-color: ${({ theme }) => theme.danger};
      flex-shrink: 0;
    }
    span {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
    em {
      font-style: normal;
      font-size: 0.78rem;
      color: ${({ theme }) => theme.textMuted};
      text-align: right;
    }
  }
  .resumen {
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 6px;
    input {
      height: 44px;
      padding: 0 14px;
      border-radius: ${({ theme }) => theme.radiusSm};
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      font-size: 0.95rem;
    }
    .codigo {
      font-size: 1.4rem;
      letter-spacing: 0.4em;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
  }
  .nota {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
  .error {
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.dangerSoft};
    color: ${({ theme }) => theme.danger};
    font-weight: 600;
  }
  .listo {
    display: flex;
    gap: 12px;
    > svg {
      font-size: 28px;
      color: ${({ theme }) => theme.success};
      flex-shrink: 0;
    }
    ul {
      margin: 6px 0;
      padding-left: 18px;
      text-transform: capitalize;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;
