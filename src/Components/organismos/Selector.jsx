import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { LuSearch } from "react-icons/lu";
import { v } from "../../styles/variables";

// Selector desplegable con búsqueda opcional.
// - opciones: arreglo de objetos con "descripcion" (y opcionalmente "icono")
// - valor: opción seleccionada
// - onBuscar: si se pasa, la búsqueda se delega (p. ej. a Supabase); si no, filtra localmente
export function Selector({
  opciones = [],
  valor,
  onChange,
  placeholder = "Seleccionar...",
  buscable = false,
  onBuscar,
  icono,
  accionExtra,
  error,
  renderOpcion,
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [posicion, setPosicion] = useState(null);
  const ref = useRef(null);
  const disparadorRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => !ref.current?.contains(e.target) && !panelRef.current?.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  // El panel flota sobre la página (no empuja el contenido ni se recorta en modales):
  // se ubica bajo el botón, o encima si no cabe, y sigue al botón al hacer scroll.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      const r = disparadorRef.current?.getBoundingClientRect();
      if (!r) return;
      const abajo = window.innerHeight - r.bottom - 12;
      const arriba = r.top - 12;
      const haciaArriba = abajo < 240 && arriba > abajo;
      setPosicion({
        left: r.left,
        width: r.width,
        top: haciaArriba ? undefined : r.bottom + 6,
        bottom: haciaArriba ? window.innerHeight - r.top + 6 : undefined,
        alto: Math.max(Math.min(320, haciaArriba ? arriba : abajo), 140),
      });
    };
    ubicar();
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true);
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto]);

  const filtradas =
    buscable && !onBuscar && texto ? opciones.filter((o) => o.descripcion?.toLowerCase().includes(texto.toLowerCase())) : opciones;

  const buscar = (e) => {
    setTexto(e.target.value);
    onBuscar?.(e.target.value);
  };

  const elegir = (opcion) => {
    onChange?.(opcion);
    setAbierto(false);
    setTexto("");
    onBuscar?.("");
  };

  return (
    <Container
      ref={ref}
      $error={!!error}
      onKeyDown={(e) => {
        // Cierra solo el desplegable (no el modal que lo contiene).
        if (e.key === "Escape" && abierto) {
          e.preventDefault();
          setAbierto(false);
        }
      }}
    >
      <div className="fila">
        <button
          ref={disparadorRef}
          type="button"
          className="disparador"
          onClick={() => setAbierto(!abierto)}
          aria-haspopup="listbox"
          aria-expanded={abierto}
        >
          {icono && <span className="icono">{icono}</span>}
          <span className={valor?.descripcion ? "valor" : "valor vacio"}>{valor?.descripcion ?? placeholder}</span>
          <v.iconoFlechabajo className={abierto ? "flecha abierta" : "flecha"} />
        </button>
        {accionExtra}
      </div>
      {error && <span className="error">{error}</span>}
      {abierto &&
        posicion &&
        createPortal(
          <Panel
            ref={panelRef}
            role="listbox"
            style={{ left: posicion.left, width: posicion.width, top: posicion.top, bottom: posicion.bottom, maxHeight: posicion.alto }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setAbierto(false);
              }
            }}
          >
            {buscable && (
              <div className="busqueda">
                <LuSearch />
                <input autoFocus value={texto} onChange={buscar} placeholder="Buscar..." />
              </div>
            )}
            <ul>
              {filtradas?.length ? (
                filtradas.map((opcion, i) => (
                  <li
                    key={opcion.id ?? i}
                    role="option"
                    aria-selected={valor?.id === opcion.id}
                    className={valor?.id != null && valor?.id === opcion.id ? "activa" : ""}
                    onClick={() => elegir(opcion)}
                  >
                    {renderOpcion ? (
                      renderOpcion(opcion)
                    ) : (
                      <>
                        {opcion.icono && <span>{opcion.icono}</span>}
                        <span>{opcion.descripcion}</span>
                      </>
                    )}
                  </li>
                ))
              ) : (
                <li className="sin-resultados">Sin resultados</li>
              )}
            </ul>
          </Panel>,
          document.body,
        )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  width: 100%;
  .fila {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .disparador {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 42px;
    padding: 0 12px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme, $error }) => ($error ? theme.danger : theme.border)};
    border-radius: ${({ theme }) => theme.radiusSm};
    cursor: pointer;
    text-align: left;
    &:hover {
      border-color: ${({ theme }) => theme.textMuted};
    }
    &[aria-expanded="true"] {
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.primarySoft};
    }
  }
  .icono {
    display: flex;
    color: ${({ theme }) => theme.textMuted};
  }
  .valor {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    &.vacio {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .flecha {
    color: ${({ theme }) => theme.textMuted};
    transition: transform 0.2s;
    &.abierta {
      transform: rotate(180deg);
    }
  }
  .error {
    display: block;
    margin-top: 6px;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.danger};
  }
`;

// Panel flotante (se dibuja en el body para quedar por encima de modales y tarjetas).
const Panel = styled.div`
  position: fixed;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  box-shadow: ${({ theme }) => theme.shadowLg};
  overflow: hidden;
  animation: aparecerPanel 0.12s ease-out;
  @keyframes aparecerPanel {
    from {
      opacity: 0;
    }
  }
  .busqueda {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.textMuted};
    input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: ${({ theme }) => theme.text};
    }
  }
  ul {
    flex: 1;
    min-height: 0;
    list-style: none;
    overflow-y: auto;
    padding: 6px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: ${({ theme }) => theme.radiusSm};
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
    &.activa {
      background: ${({ theme }) => theme.primarySoft};
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
    &.sin-resultados {
      cursor: default;
      color: ${({ theme }) => theme.textMuted};
      justify-content: center;
      &:hover {
        background: none;
      }
    }
  }
`;
