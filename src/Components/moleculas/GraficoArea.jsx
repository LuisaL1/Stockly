import { useMemo, useRef, useState } from "react";
import styled from "styled-components";

const ANCHO = 600;
const ALTO = 200;
const MARGEN = { arriba: 12, abajo: 26, lados: 4 };

// Curva suave (Catmull-Rom a Bézier) que pasa por todos los puntos.
function trazo(puntos) {
  if (puntos.length < 2) return puntos.length ? `M${puntos[0].x},${puntos[0].y}` : "";
  let d = `M${puntos[0].x},${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = Math.min(ALTO - MARGEN.abajo, p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = Math.min(ALTO - MARGEN.abajo, p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// Gráfico de área para series diarias. datos: [{ etiqueta, valor }]
// formatear: (valor) => texto del tooltip. tono: "claro" sobre fondo oscuro.
export function GraficoArea({ datos = [], formatear = String, etiquetaEje = (d) => d.etiqueta, tono = "normal" }) {
  const ref = useRef(null);
  const [activo, setActivo] = useState(null);

  const { puntos, linea, area } = useMemo(() => {
    const max = Math.max(1, ...datos.map((d) => Number(d.valor) || 0));
    const util = ALTO - MARGEN.arriba - MARGEN.abajo;
    const paso = datos.length > 1 ? (ANCHO - MARGEN.lados * 2) / (datos.length - 1) : 0;
    const puntos = datos.map((d, i) => ({
      x: MARGEN.lados + i * paso,
      y: MARGEN.arriba + util - ((Number(d.valor) || 0) / max) * util,
      dato: d,
    }));
    const linea = trazo(puntos);
    const base = ALTO - MARGEN.abajo;
    const area = puntos.length
      ? `${linea} L${puntos.at(-1).x},${base} L${puntos[0].x},${base} Z`
      : "";
    return { puntos, linea, area };
  }, [datos]);

  const mover = (e) => {
    const caja = ref.current?.getBoundingClientRect();
    if (!caja || !puntos.length) return;
    const x = ((e.clientX - caja.left) / caja.width) * ANCHO;
    let cercano = 0;
    puntos.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(puntos[cercano].x - x)) cercano = i;
    });
    setActivo(cercano);
  };

  // Etiquetas del eje: unas cinco repartidas.
  const cadaCuanto = Math.max(1, Math.ceil(datos.length / 5));
  const p = activo != null ? puntos[activo] : null;

  return (
    <Contenedor $tono={tono}>
      <svg
        ref={ref}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Gráfico de ventas por día"
        onPointerMove={mover}
        onPointerLeave={() => setActivo(null)}
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={ANCHO}
            y1={MARGEN.arriba + (ALTO - MARGEN.arriba - MARGEN.abajo) * f}
            y2={MARGEN.arriba + (ALTO - MARGEN.arriba - MARGEN.abajo) * f}
            className="guia"
          />
        ))}
        <path d={area} className="area" />
        <path d={linea} className="linea" fill="none" vectorEffect="non-scaling-stroke" />
        {p && (
          <line x1={p.x} x2={p.x} y1={MARGEN.arriba} y2={ALTO - MARGEN.abajo} className="cursor" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {p && (
        <span
          className="punto"
          style={{ left: `${(p.x / ANCHO) * 100}%`, top: `${(p.y / ALTO) * 100}%` }}
          aria-hidden
        />
      )}
      {p && (
        <div className="tooltip" style={{ left: `clamp(60px, ${(p.x / ANCHO) * 100}%, calc(100% - 60px))` }}>
          <strong>{formatear(p.dato.valor)}</strong>
          <span>{etiquetaEje(p.dato)}</span>
        </div>
      )}
      <div className="eje">
        {datos.map((d, i) =>
          i % cadaCuanto === 0 || i === datos.length - 1 ? (
            <span key={i} style={{ left: `${(puntos[i]?.x / ANCHO) * 100}%` }}>
              {etiquetaEje(d)}
            </span>
          ) : null
        )}
      </div>
    </Contenedor>
  );
}

const Contenedor = styled.div`
  --grafico-linea: ${({ theme, $tono }) => ($tono === "claro" ? theme.accentLight : theme.primary)};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 180px;
  padding-bottom: 22px;
  svg {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 160px;
    overflow: visible;
    touch-action: pan-y;
  }
  .guia {
    stroke: currentColor;
    opacity: 0.08;
    stroke-dasharray: 4 6;
  }
  .area {
    fill: var(--grafico-linea);
    opacity: 0.16;
  }
  .linea {
    stroke: var(--grafico-linea);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .cursor {
    stroke: var(--grafico-linea);
    stroke-width: 1;
    opacity: 0.5;
  }
  .punto {
    position: absolute;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    border-radius: 50%;
    background: var(--grafico-linea);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--grafico-linea) 25%, transparent);
    pointer-events: none;
  }
  .tooltip {
    position: absolute;
    top: -6px;
    transform: translate(-50%, -100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 10px;
    border-radius: 10px;
    background: ${({ theme }) => theme.ink};
    color: #fff;
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: ${({ theme }) => theme.shadowLg};
    strong {
      font-size: 0.85rem;
    }
    span {
      opacity: 0.7;
    }
  }
  .eje {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 18px;
    font-size: 0.72rem;
    color: var(--muted);
    span {
      position: absolute;
      transform: translateX(-50%);
      white-space: nowrap;
      &:first-child {
        transform: none;
      }
      &:last-child {
        transform: translateX(-100%);
      }
    }
  }
`;
