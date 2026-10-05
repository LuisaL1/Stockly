import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SUGERENCIAS_NOVANDRA, useNovandraStore } from "../../../store/NovandraStore";
import { TextoMarkdown } from "../../moleculas/TextoMarkdown";
import { v } from "../../../styles/variables";

export function PanelNovandra() {
  const { abierto, cerrar, mensajes, pensando, enviar, reiniciar, detener, reintentar, perfil, ejecutarAccion, aclarar } = useNovandraStore();
  const esMax = !!perfil?.plan?.novandra_ia;
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const listaRef = useRef(null);
  const entradaRef = useRef(null);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes, pensando]);

  useEffect(() => {
    if (!abierto) return;
    entradaRef.current?.focus();
    const esc = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [abierto, cerrar]);

  if (!abierto) return null;

  const refrescarSi = (acciones) => {
    // Novandra pudo crear borradores o recordatorios: refrescamos esas vistas.
    if (acciones?.length) {
      queryClient.invalidateQueries({ queryKey: ["ordenes compra"] });
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
    }
  };
  const mandar = async (pregunta) => {
    setTexto("");
    refrescarSi(await enviar(pregunta));
  };
  const ultimo = mensajes.at(-1);

  return createPortal(
    <Overlay onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <Panel role="dialog" aria-modal="true" aria-label="Novandra">
        <header>
          <span className="avatar">
            <v.icononovandra />
          </span>
          <div>
            <h2>
              Novandra <span className={`modo ${esMax ? "max" : ""}`}>{esMax ? "Max · IA" : "Esencial"}</span>
            </h2>
            <p>{esMax ? "Asistente con IA · ve tus datos en tiempo real" : "Asistente de operaciones · aprende de tu negocio"}</p>
          </div>
          <button type="button" onClick={reiniciar} title="Nueva conversación" aria-label="Nueva conversación">
            <v.iconoreiniciar />
          </button>
          <button type="button" onClick={cerrar} aria-label="Cerrar">
            <v.iconocerrar />
          </button>
        </header>

        <div className="mensajes" ref={listaRef} aria-live="polite">
          {mensajes.map((m) => (
            <div key={m.id} className={`mensaje ${m.role} ${m.error ? "error" : ""}`}>
              {m.content ? (
                m.role === "user" ? <p>{m.content}</p> : <TextoMarkdown contenido={m.content} />
              ) : null}
              {m.enCurso && (
                <span className="estado" aria-live="polite">
                  <span className="puntos" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  {m.estado ? `${m.estado}…` : "Escribiendo…"}
                </span>
              )}
              {m.acciones?.length > 0 && (
                <div className="acciones">
                  {m.acciones.map((a, j) =>
                    a.tipo === "boton" ? (
                      <button
                        key={j}
                        type="button"
                        className="boton-accion"
                        disabled={a.hecha || a.ejecutando}
                        onClick={async () => refrescarSi(await ejecutarAccion(m.id, j))}
                      >
                        {a.hecha ? <v.iconolisto /> : <v.iconocompras />} {a.ejecutando ? "Creando…" : a.descripcion}
                      </button>
                    ) : a.enlace ? (
                      <Link key={j} to={a.enlace} onClick={cerrar}>
                        <v.iconolisto /> {a.descripcion}
                      </Link>
                    ) : (
                      <span key={j}>
                        <v.iconolisto /> {a.descripcion}
                      </span>
                    )
                  )}
                </div>
              )}
              {m.aclaraciones?.length > 0 && m === ultimo && !pensando && (
                <div className="chips">
                  {m.aclaraciones.map((a) => (
                    <button key={a.intencion} type="button" onClick={async () => refrescarSi(await aclarar(m.id, a.intencion))}>
                      {a.descripcion}
                    </button>
                  ))}
                </div>
              )}
              {m.sugerencias?.length > 0 && m === ultimo && !pensando && (
                <div className="chips sugeridas">
                  {m.sugerencias.map((t) => (
                    <button key={t} type="button" onClick={() => mandar(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {(m.error || m.detenido) && m === ultimo && !pensando && (
                <button type="button" className="reintentar" onClick={async () => refrescarSi(await reintentar())}>
                  <v.iconokardex /> Reintentar
                </button>
              )}
            </div>
          ))}
          {mensajes.length === 1 && !pensando && (
            <div className="sugerencias">
              {SUGERENCIAS_NOVANDRA.map((s) => (
                <button key={s} type="button" onClick={() => mandar(s)}>
                  <v.icononovandra />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mandar(texto);
          }}
        >
          <textarea
            ref={entradaRef}
            rows={1}
            value={texto}
            maxLength={4000}
            placeholder="Pregúntale algo a Novandra…"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                mandar(texto);
              }
            }}
          />
          {pensando ? (
            <button type="button" className="detener" onClick={detener} aria-label="Detener respuesta" title="Detener">
              <span />
            </button>
          ) : (
            <button type="submit" disabled={!texto.trim()} aria-label="Enviar">
              <v.iconoenviar />
            </button>
          )}
        </form>
        <small className="aviso">
          Novandra solo crea borradores y recordatorios: tú confirmas cada cambio.
          {perfil?.iaDisponible && !esMax && (
            <>
              {" "}
              ¿Necesitas análisis más complejos?{" "}
              <Link to="/configurar/plan" onClick={cerrar}>
                Conoce Novandra Max
              </Link>
              .
            </>
          )}
        </small>
      </Panel>
    </Overlay>,
    document.body
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 900;
  background: ${({ theme }) => theme.overlay};
  display: flex;
  justify-content: flex-end;
  animation: aparecer 0.15s ease-out;
  @keyframes aparecer {
    from {
      opacity: 0;
    }
  }
`;

const Panel = styled.aside`
  width: min(440px, 100vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  box-shadow: ${({ theme }) => theme.shadowLg};
  animation: entrar 0.22s ease-out;
  @keyframes entrar {
    from {
      transform: translateX(40px);
      opacity: 0;
    }
  }

  header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px;
    background: ${({ theme }) => theme.inkCard};
    color: ${({ theme }) => theme.inkText};
    div {
      flex: 1;
      min-width: 0;
    }
    h2 {
      font-size: 1.1rem;
    }
    p {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.inkMuted};
    }
    button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 10px;
      background: rgba(244, 241, 236, 0.08);
      color: inherit;
      font-size: 17px;
      cursor: pointer;
      &:hover {
        background: rgba(244, 241, 236, 0.16);
      }
    }
  }
  .modo {
    display: inline-block;
    margin-left: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    vertical-align: middle;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    background: rgba(244, 241, 236, 0.12);
    color: ${({ theme }) => theme.inkText};
    &.max {
      background: ${({ theme }) => theme.accentLight};
      color: ${({ theme }) => theme.ink};
    }
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 4px;
    button {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.primary};
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      &:hover {
        background: ${({ theme }) => theme.primarySoft};
      }
    }
    &.sugeridas button {
      border-color: ${({ theme }) => theme.border};
      color: ${({ theme }) => theme.text};
      font-weight: 500;
    }
  }
  .boton-accion {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: none;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.primaryHover};
    }
    &:disabled {
      opacity: 0.7;
      cursor: default;
    }
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: ${({ theme }) => theme.accentLight};
    color: ${({ theme }) => theme.ink};
    font-size: 20px;
  }

  .mensajes {
    flex: 1;
    overflow-y: auto;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mensaje {
    max-width: 92%;
    min-width: 0;
    padding: 12px 14px;
    border-radius: 18px;
    font-size: 0.9rem;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 6px;
    ul,
    ol {
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    &.assistant {
      align-self: flex-start;
      background: ${({ theme }) => theme.surface};
      border: 1px solid ${({ theme }) => theme.border};
      border-bottom-left-radius: 6px;
    }
    &.user {
      align-self: flex-end;
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
      border-bottom-right-radius: 6px;
    }
    &.error {
      background: ${({ theme }) => theme.dangerSoft};
      color: ${({ theme }) => theme.danger};
      border-color: transparent;
    }
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 4px;
    a,
    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
      background: ${({ theme }) => theme.successSoft};
      color: ${({ theme }) => theme.success};
      text-decoration: none;
    }
  }
  .estado {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .puntos {
    display: inline-flex;
    gap: 4px;
    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${({ theme }) => theme.primary};
      animation: rebote 1s infinite ease-in-out;
      &:nth-child(2) {
        animation-delay: 0.15s;
      }
      &:nth-child(3) {
        animation-delay: 0.3s;
      }
    }
    @keyframes rebote {
      0%,
      80%,
      100% {
        opacity: 0.3;
        transform: translateY(0);
      }
      40% {
        opacity: 1;
        transform: translateY(-3px);
      }
    }
  }
  .reintentar {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    padding: 6px 12px;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }
  .sugerencias {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    button {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      text-align: left;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radius};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.86rem;
      cursor: pointer;
      svg {
        color: ${({ theme }) => theme.primary};
        flex-shrink: 0;
      }
      &:hover {
        border-color: ${({ theme }) => theme.primary};
      }
    }
  }

  form {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin: 0 14px;
    padding: 8px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 18px;
    background: ${({ theme }) => theme.surface};
    &:focus-within {
      border-color: ${({ theme }) => theme.primary};
    }
    textarea {
      flex: 1;
      max-height: 140px;
      padding: 8px;
      border: none;
      outline: none;
      resize: none;
      background: transparent;
      field-sizing: content;
    }
    button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border: none;
      border-radius: 12px;
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
      font-size: 17px;
      cursor: pointer;
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      &.detener {
        background: ${({ theme }) => theme.ink};
        span {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          background: ${({ theme }) => theme.inkText};
        }
      }
    }
  }
  .aviso {
    padding: 8px 18px 14px;
    font-size: 0.72rem;
    color: ${({ theme }) => theme.textMuted};
    text-align: center;
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
`;
