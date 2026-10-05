import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { useNovandraStore } from "../../store/NovandraStore";
import { UserAuth } from "../../context/contextoAuth";
import { usePlan } from "../../hooks/usePlan";
import { CORREO_STOCKLY } from "../../utils/marca";
import { GUIAS, buscarGuias, guiasDeRuta } from "../../utils/guias";
import { esAdmin } from "../../utils/permisos";
import { notificarExito } from "../../utils/notificaciones";
import { EnviarSolicitudSoporte } from "../../supabase/crudSoporte";

const TIPOS = [
  { id: "duda", texto: "Tengo una duda" },
  { id: "error", texto: "Algo no funciona" },
  { id: "pagos", texto: "Plan, pagos o facturación" },
  { id: "sugerencia", texto: "Tengo una sugerencia" },
  { id: "otro", texto: "Otro" },
];
import { v } from "../../styles/variables";

// Botón de soporte de la barra superior: contacto con el equipo de Stockly y ayudas rápidas.
export function BotonSoporte() {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState("inicio"); // inicio | formulario | enviado
  const [formulario, setFormulario] = useState({ categoria: "duda", asunto: "", mensaje: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [numero, setNumero] = useState(null);
  const navigate = useNavigate();
  const ref = useRef(null);
  const { pathname } = useLocation();
  const { dataempresa } = useEmpresaStore();
  const { datausuario } = useUsuariosStore();
  const { user } = UserAuth();
  const { plan } = usePlan();
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const guiasPermitidas = GUIAS.filter((g) => !g.soloAdmin || esAdmin(datausuario));
  const guias = (busqueda.trim() ? buscarGuias(busqueda, guiasPermitidas) : guiasDeRuta(pathname, guiasPermitidas)).slice(0, 4);
  const abrirGuia = (id) => {
    setAbierto(false);
    setBusqueda("");
    navigate(`/ayuda?guia=${id}`);
  };

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    const esc = (e) => e.key === "Escape" && setAbierto(false);
    // Al cerrar, el panel vuelve al inicio (lo escrito en el formulario se conserva).
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  // Datos que acompañan la solicitud para ayudar sin pedir más información.
  const contexto = {
    plan: plan?.nombre ?? null,
    pantalla: pathname,
    navegador: navigator.userAgent,
  };

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const id = await EnviarSolicitudSoporte({ idEmpresa: dataempresa.id, ...formulario, contexto });
      setNumero(id);
      setVista("enviado");
      setFormulario({ categoria: "duda", asunto: "", mensaje: "" });
    } catch (err) {
      setError(err.message ?? "No pudimos enviar tu mensaje. Intenta de nuevo.");
    }
    setEnviando(false);
  }

  const cerrarPanel = () => {
    setAbierto(false);
    setVista("inicio");
    setError(null);
  };

  async function copiar() {
    try {
      await navigator.clipboard.writeText(CORREO_STOCKLY);
      notificarExito("Correo de soporte copiado");
    } catch {
      // Sin permiso de portapapeles: el correo sigue visible en el panel.
    }
  }

  return (
    <Container ref={ref}>
      <button
        type="button"
        className="boton"
        onClick={() => (abierto ? cerrarPanel() : setAbierto(true))}
        aria-label="Soporte"
        title="Soporte"
        aria-expanded={abierto}
      >
        <v.iconosoporte />
      </button>

      {abierto && (
        <div className="panel" role="dialog" aria-label="Soporte">
          <header>
            <span className="icono">
              <v.iconosoporte />
            </span>
            <div>
              <h2>¿Necesitas ayuda?</h2>
              <p>El equipo de Stockly te acompaña.</p>
            </div>
          </header>

          {vista === "formulario" && (
            <form className="formulario" onSubmit={enviar}>
              <button type="button" className="volver" onClick={() => setVista("inicio")}>
                <v.iconoflechaderecha style={{ transform: "rotate(180deg)" }} /> Volver
              </button>
              <label>
                ¿Sobre qué es?
                <select value={formulario.categoria} onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}>
                  {TIPOS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.texto}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Asunto
                <input
                  value={formulario.asunto}
                  maxLength={150}
                  placeholder="Ej.: No me aparece una venta"
                  onChange={(e) => setFormulario({ ...formulario, asunto: e.target.value })}
                  autoFocus
                />
              </label>
              <label>
                Mensaje
                <textarea
                  rows={5}
                  value={formulario.mensaje}
                  maxLength={5000}
                  placeholder="Cuéntanos qué pasó o qué necesitas. Si es un error, dinos qué estabas haciendo."
                  onChange={(e) => setFormulario({ ...formulario, mensaje: e.target.value })}
                />
              </label>
              <small className="nota">Incluimos tu empresa, tu plan y la pantalla donde estás para ayudarte más rápido.</small>
              {error && <p className="error">{error}</p>}
              <button
                type="submit"
                className="enviar"
                disabled={enviando || formulario.asunto.trim().length < 3 || formulario.mensaje.trim().length < 10}
              >
                <v.iconoenviar /> {enviando ? "Enviando…" : "Enviar mensaje"}
              </button>
            </form>
          )}

          {vista === "enviado" && (
            <div className="enviado">
              <v.iconocheck />
              <strong>¡Recibimos tu mensaje!</strong>
              <p>
                Tu solicitud es la <b>#{numero}</b>. Te responderemos a {user?.email ?? "tu correo"}.
              </p>
              <button type="button" className="volver" onClick={() => setVista("inicio")}>
                Volver al inicio
              </button>
            </div>
          )}

          {vista === "inicio" && (
            <>
              <button type="button" className="principal" onClick={() => setVista("formulario")}>
                <v.iconoenviar />
                <span>
                  <strong>Escribir al equipo de soporte</strong>
                  <small>Envíanos tu mensaje desde aquí y te respondemos por correo.</small>
                </span>
              </button>

              <div className="correo">
                <span>{CORREO_STOCKLY}</span>
                <button type="button" onClick={copiar} aria-label="Copiar correo de soporte" title="Copiar">
                  <v.iconocopiar />
                </button>
              </div>

              <div className="separador">Guías</div>
              <label className="buscar">
                <v.iconobuscar />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="¿Qué necesitas hacer?"
                  aria-label="Buscar en las guías"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && busqueda.trim()) {
                      setAbierto(false);
                      navigate(`/ayuda?q=${encodeURIComponent(busqueda.trim())}`);
                    }
                  }}
                />
              </label>
              {guias.length > 0 ? (
                <ul className="guias">
                  {guias.map((g) => (
                    <li key={g.id}>
                      <button type="button" onClick={() => abrirGuia(g.id)}>
                        <v.iconoguia />
                        {g.titulo}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                busqueda.trim() && <p className="vacio">Sin guías para esa búsqueda.</p>
              )}
              <div className="pie">
                <Link to="/ayuda" onClick={() => setAbierto(false)}>
                  Ver todas las guías
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAbierto(false);
                    abrirNovandra(busqueda.trim() || undefined);
                  }}
                >
                  <v.icononovandra /> Preguntarle a Novandra
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  .boton {
    position: relative;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-size: 19px;
    cursor: pointer;
    &:hover,
    &[aria-expanded="true"] {
      border-color: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.primary};
    }
  }
  .panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 200;
    width: min(340px, calc(100vw - 24px));
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusXl};
    box-shadow: ${({ theme }) => theme.shadowLg};
    animation: aparecerSoporte 0.15s ease-out;
    /* En el celular el botón no está en el borde: el panel ocupa el ancho de la pantalla. */
    @media (max-width: 640px) {
      position: fixed;
      top: 64px;
      left: 12px;
      right: 12px;
      width: auto;
    }
    @keyframes aparecerSoporte {
      from {
        opacity: 0;
      }
    }
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    h2 {
      font-size: 1rem;
    }
    p {
      font-size: 0.8rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .icono {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 19px;
  }
  .principal {
    border: none;
    font: inherit;
  }
  .principal,
  .opcion {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px;
    border-radius: ${({ theme }) => theme.radius};
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    > svg {
      font-size: 18px;
      flex-shrink: 0;
    }
    span {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    strong {
      font-size: 0.88rem;
    }
    small {
      font-size: 0.76rem;
    }
  }
  .principal {
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    small {
      opacity: 0.85;
    }
    &:hover {
      background: ${({ theme }) => theme.primaryHover};
    }
  }
  .opcion {
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    > svg {
      color: ${({ theme }) => theme.primary};
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
    &:hover {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .correo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.surfaceAlt};
    font-size: 0.84rem;
    font-weight: 600;
    button {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: ${({ theme }) => theme.textMuted};
      cursor: pointer;
      &:hover {
        background: ${({ theme }) => theme.primarySoft};
        color: ${({ theme }) => theme.primary};
      }
    }
  }
  .buscar {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 38px;
    padding: 0 12px;
    border-radius: ${({ theme }) => theme.radiusSm};
    border: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.textMuted};
    input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.86rem;
      color: ${({ theme }) => theme.text};
    }
    &:focus-within {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .guias {
    list-style: none;
    display: flex;
    flex-direction: column;
    button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 6px;
      border: none;
      border-radius: ${({ theme }) => theme.radiusSm};
      background: none;
      color: ${({ theme }) => theme.text};
      font-size: 0.86rem;
      text-align: left;
      cursor: pointer;
      svg {
        color: ${({ theme }) => theme.primary};
        flex-shrink: 0;
      }
      &:hover {
        background: ${({ theme }) => theme.surfaceAlt};
      }
    }
  }
  .vacio {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid ${({ theme }) => theme.border};
    a,
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: none;
      background: none;
      padding: 0;
      color: ${({ theme }) => theme.primary};
      font-size: 0.82rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
  }
  .formulario {
    display: flex;
    flex-direction: column;
    gap: 10px;
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.78rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    input,
    select,
    textarea {
      padding: 9px 12px;
      border-radius: ${({ theme }) => theme.radiusSm};
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.88rem;
      font-weight: 400;
      &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.primary};
      }
    }
    textarea {
      resize: vertical;
      min-height: 96px;
      line-height: 1.45;
    }
    .nota {
      font-size: 0.74rem;
      color: ${({ theme }) => theme.textMuted};
    }
    .error {
      font-size: 0.8rem;
      color: ${({ theme }) => theme.danger};
      font-weight: 600;
    }
  }
  .volver {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    color: ${({ theme }) => theme.primary};
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .enviar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 42px;
    border: none;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-weight: 600;
    cursor: pointer;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.primaryHover};
    }
    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }
  .enviado {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 4px;
    text-align: center;
    > svg {
      font-size: 34px;
      color: ${({ theme }) => theme.success};
    }
    p {
      font-size: 0.86rem;
      color: ${({ theme }) => theme.textMuted};
    }
    .volver {
      align-self: center;
      margin-top: 6px;
    }
  }
  .separador {
    margin-top: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textMuted};
  }
`;
