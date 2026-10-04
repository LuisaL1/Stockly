import { useEffect, useRef, useState } from "react";
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
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const filtradas =
    buscable && !onBuscar && texto
      ? opciones.filter((o) => o.descripcion?.toLowerCase().includes(texto.toLowerCase()))
      : opciones;

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
          type="button"
          className="disparador"
          onClick={() => setAbierto(!abierto)}
          aria-haspopup="listbox"
          aria-expanded={abierto}
        >
          {icono && <span className="icono">{icono}</span>}
          <span className={valor?.descripcion ? "valor" : "valor vacio"}>
            {valor?.descripcion ?? placeholder}
          </span>
          <v.iconoFlechabajo className={abierto ? "flecha abierta" : "flecha"} />
        </button>
        {accionExtra}
      </div>
      {error && <span className="error">{error}</span>}
      {abierto && (
        <div className="panel" role="listbox">
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
        </div>
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
  /* El panel va dentro del flujo para no recortarse en modales con scroll. */
  .panel {
    margin-top: 6px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radius};
    box-shadow: ${({ theme }) => theme.shadowLg};
    overflow: hidden;
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
    list-style: none;
    max-height: 200px;
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
