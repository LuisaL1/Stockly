import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useNovandraStore } from "../store/NovandraStore";
import { CATEGORIAS_GUIAS, GUIAS, buscarGuias } from "../utils/guias";
import { CORREO_STOCKLY } from "../utils/marca";
import { esAdmin } from "../utils/permisos";
import { v } from "../styles/variables";

// Centro de ayuda: todas las guías, con buscador y filtro por tema. ?guia=<id> abre una guía.
export function Ayuda() {
  const { datausuario } = useUsuariosStore();
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const [categoria, setCategoria] = useState(null);
  const abierta = params.get("guia");
  const refAbierta = useRef(null);

  const disponibles = useMemo(() => GUIAS.filter((g) => !g.soloAdmin || esAdmin(datausuario)), [datausuario]);
  const resultados = texto.trim() ? buscarGuias(texto, disponibles) : disponibles;
  const visibles = categoria ? resultados.filter((g) => g.categoria === categoria) : resultados;

  useEffect(() => {
    if (abierta) refAbierta.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [abierta]);

  const alternar = (id) => {
    const nuevos = new URLSearchParams(params);
    if (abierta === id) nuevos.delete("guia");
    else nuevos.set("guia", id);
    setParams(nuevos, { replace: true });
  };

  const grupos = texto.trim()
    ? [[null, visibles]]
    : CATEGORIAS_GUIAS.map((c) => [c, visibles.filter((g) => g.categoria === c)]).filter(([, gs]) => gs.length);

  return (
    <PaginaTemplate titulo="Centro de ayuda" descripcion="Todo lo que puedes hacer en Stockly, paso a paso.">
      <Buscador>
        <v.iconobuscar />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Qué necesitas hacer? Ej.: anular una venta, cobrar con Bre-B, subir productos…"
          aria-label="Buscar en las guías"
          autoFocus
        />
        {texto && (
          <button type="button" onClick={() => setTexto("")} aria-label="Borrar búsqueda">
            <v.iconocerrar />
          </button>
        )}
      </Buscador>

      {!texto.trim() && (
        <Chips role="group" aria-label="Temas">
          <button type="button" aria-pressed={!categoria} onClick={() => setCategoria(null)}>
            Todas
          </button>
          {CATEGORIAS_GUIAS.filter((c) => disponibles.some((g) => g.categoria === c)).map((c) => (
            <button key={c} type="button" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>
              {c}
            </button>
          ))}
        </Chips>
      )}

      {visibles.length === 0 ? (
        <SinResultados>
          <strong>No encontramos una guía para “{texto}”.</strong>
          <p>Prueba con otras palabras o pregúntanos directamente.</p>
          <div className="botones">
            <button type="button" onClick={() => abrirNovandra(texto)}>
              <v.icononovandra /> Preguntarle a Novandra
            </button>
            <a href={`mailto:${CORREO_STOCKLY}?subject=${encodeURIComponent(`Ayuda: ${texto}`)}`}>
              <v.iconosoporte /> Escribir a soporte
            </a>
          </div>
        </SinResultados>
      ) : (
        grupos.map(([cat, gs]) => (
          <Grupo key={cat ?? "resultados"}>
            <h2>{cat ?? `${gs.length} resultado${gs.length === 1 ? "" : "s"}`}</h2>
            <div className="lista">
              {gs.map((g) => {
                const abiertaEsta = abierta === g.id;
                return (
                  <article key={g.id} className={abiertaEsta ? "abierta" : ""} ref={abiertaEsta ? refAbierta : null}>
                    <button type="button" className="titulo" onClick={() => alternar(g.id)} aria-expanded={abiertaEsta}>
                      <span>
                        <strong>{g.titulo}</strong>
                        <small>{g.resumen}</small>
                      </span>
                      <v.iconoFlechabajo className="flecha" />
                    </button>
                    {abiertaEsta && (
                      <div className="detalle">
                        <ol>
                          {g.pasos.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ol>
                        {g.consejos?.length > 0 && (
                          <div className="consejos">
                            {g.consejos.map((c) => (
                              <p key={c}>
                                <v.iconorayo /> {c}
                              </p>
                            ))}
                          </div>
                        )}
                        {g.ir && (
                          <Link className="ir" to={g.ir.a}>
                            {g.ir.texto} <v.iconoflechaderecha />
                          </Link>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </Grupo>
        ))
      )}

      <Contacto>
        <span className="icono">
          <v.iconosoporte />
        </span>
        <div>
          <strong>¿Sigues con dudas?</strong>
          <small>Escríbenos y el equipo de Stockly te ayuda.</small>
        </div>
        <a href={`mailto:${CORREO_STOCKLY}?subject=${encodeURIComponent("Soporte Stockly")}`}>{CORREO_STOCKLY}</a>
      </Contacto>
    </PaginaTemplate>
  );
}

const Buscador = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 54px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  > svg {
    font-size: 20px;
    color: ${({ theme }) => theme.primary};
    flex-shrink: 0;
  }
  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
  }
  button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
  }
  &:focus-within {
    border-color: ${({ theme }) => theme.primary};
  }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  button {
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    &[aria-pressed="true"] {
      background: ${({ theme }) => theme.ink};
      border-color: ${({ theme }) => theme.ink};
      color: ${({ theme }) => theme.inkText};
    }
  }
`;

const Grupo = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  h2 {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textMuted};
  }
  .lista {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  article {
    border-radius: ${({ theme }) => theme.radiusLg};
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    &.abierta {
      border-color: ${({ theme }) => theme.primary};
      .flecha {
        transform: rotate(180deg);
      }
    }
  }
  .titulo {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    span {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    small {
      font-size: 0.82rem;
      color: ${({ theme }) => theme.textMuted};
    }
    .flecha {
      color: ${({ theme }) => theme.textMuted};
      transition: transform 0.15s;
      flex-shrink: 0;
    }
  }
  .detalle {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 18px 18px;
    ol {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-left: 20px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }
  .consejos {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.primarySoft};
    p {
      display: flex;
      gap: 8px;
      font-size: 0.84rem;
      line-height: 1.45;
      svg {
        color: ${({ theme }) => theme.primary};
        flex-shrink: 0;
        margin-top: 3px;
      }
    }
  }
  .ir {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    font-size: 0.88rem;
    color: ${({ theme }) => theme.primary};
    text-decoration: none;
  }
`;

const SinResultados = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 20px;
  text-align: center;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px dashed ${({ theme }) => theme.border};
  p {
    color: ${({ theme }) => theme.textMuted};
  }
  .botones {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
  }
  button,
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    font-size: 0.86rem;
    text-decoration: none;
    cursor: pointer;
  }
`;

const Contacto = styled.section`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  background: ${({ theme }) => theme.inkCard};
  color: ${({ theme }) => theme.inkText};
  .icono {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: ${({ theme }) => theme.inkPanel};
    color: ${({ theme }) => theme.accentLight};
    font-size: 20px;
  }
  > div {
    flex: 1 1 200px;
    display: flex;
    flex-direction: column;
    small {
      color: ${({ theme }) => theme.inkMuted};
    }
  }
  a {
    color: ${({ theme }) => theme.accentLight};
    font-weight: 600;
    text-decoration: none;
  }
`;
