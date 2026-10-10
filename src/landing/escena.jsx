import styled, { keyframes } from "styled-components";
import personaje from "../assets/personaje-stockly.webp";
import { MORADO_CLARO, VERDE } from "./tokens";

// Escena del hero: el personaje de la marca recibe cajas por una banda que nace al final del titular,
// las registra (destello del lector y ✓) y las cajas entran a la ventana de la app.
// Todo es CSS: funciona prerenderizado y se detiene con "prefers-reduced-motion".

const ANCHO = 620;
const ALTO = 640;
// Banda transportadora: arranca junto a "orden.", pasa detrás del personaje y baja hacia la app.
const BANDA = "M 92 268 C 170 240, 210 300, 290 270 S 430 240, 480 270 C 530 295, 566 300, 584 340 C 612 400, 600 470, 594 540 S 590 566, 590 574";
// Onda de piso, detrás de las piernas.
const ONDA = "M -20 470 C 80 430, 140 510, 230 470 S 380 430, 460 470 S 580 510, 640 470";
const CICLO = 9; // s por caja (tres cajas en la banda, una cada 3 s)

export function Escena() {
  return (
    <Marco className="escena-marco" aria-hidden="true">
      <Lienzo>
        <svg className="ondas" viewBox={`0 0 ${ANCHO} ${ALTO}`} width={ANCHO} height={ALTO}>
          <defs>
            <linearGradient id="lila" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#e9c9ff" />
              <stop offset="1" stopColor="#f5ebff" />
            </linearGradient>
          </defs>
          <path className="onda" d={ONDA} />
          <path className="onda" d={BANDA} />
          <path className="pulso" d={ONDA} pathLength="100" />
          <path className="pulso banda" d={BANDA} pathLength="100" />
        </svg>

        {[0, 1, 2].map((i) => (
          <Caja key={i} style={{ animationDelay: `${-i * 3}s` }} $base={30 + i * 30}>
            {/* el retraso se repite en el ✓ porque el svg intermedio no lo hereda */}
            <svg viewBox="0 0 64 74" width="64" height="74">
              <path className="cara" d="M14 22 L46 15 L62 25 L30 33 Z" fill="#f3e7fd" />
              <path className="cara" d="M30 33 L62 25 L60 61 L30 71 Z" fill="#dcb5fb" />
              <path className="cara" d="M14 22 L30 33 L30 71 L12 60 Z" fill="#f8f0fe" />
              <path d="M24 26 L36 23.5 L37 39 L25 42 Z" fill="#7a02ac" />
              <path d="M17 48 l3.5 -4.5 l3.5 4.5 M20.5 44 v10 M24 46 l3.5 -4.5 l3.5 4.5 M27.5 42 v10" stroke="#7a02ac" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <g className="ok" style={{ animationDelay: `${-i * 3}s` }}>
                <circle cx="51" cy="13" r="10" fill={VERDE} stroke="#1d0b2b" strokeWidth="2" />
                <path d="M46 13 l3.5 3.5 l6.5 -7.5" stroke="#063d1e" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </Caja>
        ))}

        <Personaje src={personaje} alt="" width="1000" height="1382" fetchPriority="high" />
        <Parpado className="parpado" style={{ left: 393, top: 80 }} />
        <Parpado className="parpado" style={{ left: 428, top: 102 }} />
        <Anillo style={{ left: 261, top: 8 }} />
        <Anillo className="tarde" style={{ left: 261, top: 8 }} />
      </Lienzo>
    </Marco>
  );
}

const pulso = keyframes`
  from { stroke-dashoffset: 112; }
  to { stroke-dashoffset: -12; }
`;
const recorrer = keyframes`
  0% { offset-distance: 0%; opacity: 0; transform: scale(0.85); }
  7% { opacity: 1; transform: scale(1); }
  88% { opacity: 1; transform: scale(1); }
  100% { offset-distance: 100%; opacity: 0; transform: scale(0.6); }
`;
const chequear = keyframes`
  0%, 60% { opacity: 0; transform: scale(0.3); }
  64% { opacity: 1; transform: scale(1.2); }
  68%, 100% { opacity: 1; transform: scale(1); }
`;
const anillo = keyframes`
  0% { transform: scale(0.3); opacity: 0.9; }
  30% { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
`;
const retroceso = keyframes`
  0%, 100% { transform: scaleX(-1) rotate(0deg); }
  3% { transform: scaleX(-1) rotate(2.2deg); }
  8% { transform: scaleX(-1) rotate(-0.6deg); }
  12% { transform: scaleX(-1) rotate(0deg); }
`;
const parpadeo = keyframes`
  0%, 93% { transform: scaleY(0); }
  95.5%, 97% { transform: scaleY(1); }
  100% { transform: scaleY(0); }
`;

const Marco = styled.div`
  --k: 1;
  position: relative;
  width: calc(${ANCHO}px * var(--k));
  height: calc(${ALTO}px * var(--k));
`;

const Lienzo = styled.div`
  position: absolute;
  inset: 0;
  width: ${ANCHO}px;
  height: ${ALTO}px;
  transform: scale(var(--k));
  transform-origin: 0 0;
  .ondas {
    position: absolute;
    inset: 0;
    overflow: visible;
  }
  .onda {
    fill: none;
    stroke: url(#lila);
    stroke-width: 22;
    stroke-linecap: round;
  }
  .pulso {
    fill: none;
    stroke: #fff;
    stroke-width: 10;
    stroke-linecap: round;
    stroke-dasharray: 12 100;
    opacity: 0.85;
    animation: ${pulso} 5s linear infinite;
  }
  .pulso.banda {
    animation-duration: 3s;
  }
`;

const Caja = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 64px;
  height: 74px;
  z-index: 1;
  offset-path: path("${BANDA}");
  offset-rotate: 0deg;
  offset-anchor: 50% 65%;
  offset-distance: ${(p) => p.$base}%;
  animation: ${recorrer} ${CICLO}s linear infinite;
  svg {
    overflow: visible;
  }
  .cara {
    stroke: #1d0b2b;
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .ok {
    transform-origin: 51px 13px;
    animation: ${chequear} ${CICLO}s linear infinite;
  }
`;

const Personaje = styled.img`
  position: absolute;
  left: 100px;
  top: 10px;
  height: 600px;
  width: auto;
  z-index: 2;
  transform: scaleX(-1);
  transform-origin: 50% 92%;
  animation: ${retroceso} 3s ease-out infinite;
  animation-delay: -0.6s;
`;

// Párpados sobre los ojos (color de piel) que bajan un instante.
const Parpado = styled.span`
  position: absolute;
  z-index: 3;
  width: 22px;
  height: 24px;
  border-radius: 50%;
  background: #fbe6d2;
  transform: scaleY(0);
  transform-origin: 50% 0;
  animation: ${parpadeo} 4.6s linear infinite;
`;

// Destello del lector de códigos.
const Anillo = styled.span`
  position: absolute;
  z-index: 3;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid ${MORADO_CLARO};
  opacity: 0;
  animation: ${anillo} 3s ease-out infinite;
  animation-delay: -0.6s;
  &.tarde {
    animation-delay: -0.35s;
    border-color: #fff;
  }
`;
