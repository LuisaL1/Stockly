import styled, { keyframes } from "styled-components";
import { GRIS, LINEA, MORADO, MORADO_CLARO, PAPEL, SUAVE, TINTA, TINTA2, VERDE } from "./tokens";

// Mini-widgets animados de la interfaz de Stockly para la página pública.
// Todo es CSS (keyframes): funciona prerenderizado y respeta "prefers-reduced-motion".

// Ciclo común de 8 s para que los widgets "respiren" al mismo ritmo.
const CICLO = "8s";

const aparecer = keyframes`
  0%, 100% { opacity: 0; transform: translateY(10px); }
  12%, 85% { opacity: 1; transform: translateY(0); }
  95% { opacity: 0; }
`;
const dibujar = keyframes`
  0% { stroke-dashoffset: 1; }
  40%, 85% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 1; }
`;
const rellenar = keyframes`
  0% { opacity: 0; }
  45%, 85% { opacity: 1; }
  100% { opacity: 0; }
`;
const latir = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
`;
const brotar = keyframes`
  0%, 55% { opacity: 0; transform: scale(0.4); }
  62% { opacity: 1; transform: scale(1.15); }
  68%, 90% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
`;
const vaciar = keyframes`
  0%, 10% { width: 78%; background: ${MORADO}; }
  60%, 90% { width: 9%; background: #DC2626; }
  100% { width: 78%; background: ${MORADO}; }
`;
const alerta = keyframes`
  0%, 55% { opacity: 0; transform: translateY(6px); }
  65%, 92% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const puntos = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
`;
const escribir = keyframes`
  0%, 8% { width: 0; }
  38%, 100% { width: 100%; }
`;
const respuesta = keyframes`
  0%, 46% { opacity: 0; transform: translateY(8px); }
  54%, 92% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const flotar = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-14px) rotate(1.5deg); }
`;
const deriva = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(60px, -40px) scale(1.08); }
  66% { transform: translate(-40px, 50px) scale(0.96); }
  100% { transform: translate(0, 0) scale(1); }
`;
const desplazar = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;
const girarBorde = keyframes`
  to { --angulo: 360deg; }
`;
const resaltarChip = keyframes`
  0%, 100% { background: transparent; color: ${TINTA}; border-color: ${LINEA}; }
  12%, 24% { background: ${SUAVE}; color: ${MORADO}; border-color: ${MORADO}; }
`;

// --------------------------------------------------------------- Fondo con formas que derivan
export const Formas = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  span {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.55;
    animation: ${deriva} 26s ease-in-out infinite;
  }
  span:nth-child(1) {
    width: 520px;
    height: 520px;
    left: -140px;
    top: -120px;
    background: ${SUAVE};
  }
  span:nth-child(2) {
    width: 460px;
    height: 460px;
    right: -120px;
    top: 120px;
    background: rgba(226, 164, 255, 0.5);
    animation-delay: -9s;
  }
  span:nth-child(3) {
    width: 380px;
    height: 380px;
    left: 38%;
    bottom: -160px;
    background: rgba(136, 0, 179, 0.18);
    animation-delay: -17s;
  }
`;

// --------------------------------------------------------------- Base de los widgets
const Base = styled.div`
  position: relative;
  border-radius: 20px;
  padding: 18px;
  font-size: 0.86rem;
  line-height: 1.35;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  font-variant-numeric: tabular-nums;
  background: ${({ $tinta }) => ($tinta ? TINTA : "#fff")};
  color: ${({ $tinta }) => ($tinta ? PAPEL : TINTA)};
  border: 1px solid ${({ $tinta }) => ($tinta ? "rgba(244,241,236,0.08)" : LINEA)};
  box-shadow: 0 18px 50px -30px rgba(23, 19, 29, 0.35);
  .titulo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.82rem;
  }
  .titulo i {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    background: ${({ $tinta }) => ($tinta ? "rgba(226,164,255,0.16)" : SUAVE)};
    color: ${({ $tinta }) => ($tinta ? MORADO_CLARO : MORADO)};
    font-style: normal;
    font-size: 0.8rem;
  }
  .muted {
    color: ${({ $tinta }) => ($tinta ? "rgba(244,241,236,0.65)" : GRIS)};
    font-size: 0.76rem;
  }
`;

// Ventas de hoy: cifra que late y gráfica que se dibuja sola.
export function WidgetVentas() {
  return (
    <Ventas $tinta>
      <div className="titulo">
        <i>↗</i> Ventas de hoy
      </div>
      <strong className="cifra">$ 1.042.440</strong>
      <span className="muted">3 ventas registradas · 30 días: $ 18.972.051</span>
      <svg viewBox="0 0 260 70" aria-hidden="true">
        <defs>
          <linearGradient id="gv" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={MORADO_CLARO} stopOpacity="0.45" />
            <stop offset="1" stopColor={MORADO_CLARO} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d="M0 50 C 20 40, 30 46, 45 44 S 70 10, 90 20 S 120 48, 140 36 S 170 18, 190 30 S 225 52, 245 26 L 260 18 L 260 70 L 0 70 Z" fill="url(#gv)" />
        <path className="linea" d="M0 50 C 20 40, 30 46, 45 44 S 70 10, 90 20 S 120 48, 140 36 S 170 18, 190 30 S 225 52, 245 26 L 260 18" fill="none" stroke={MORADO_CLARO} strokeWidth="2.5" pathLength="1" />
      </svg>
    </Ventas>
  );
}
const Ventas = styled(Base)`
  .cifra {
    font-size: 1.7rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: inline-block;
    transform-origin: left center;
    animation: ${latir} 4s ease-in-out infinite;
  }
  svg {
    width: 100%;
    height: 70px;
    margin-top: 2px;
  }
  .linea {
    stroke-dasharray: 1;
    animation: ${dibujar} ${CICLO} ease-in-out infinite;
  }
  .area {
    animation: ${rellenar} ${CICLO} ease-in-out infinite;
  }
`;

// Ticket de la caja: los productos entran uno a uno y el total aparece.
export function WidgetTicket() {
  const items = [
    ["Camiseta básica algodón", "$ 35.000"],
    ["Gorra negra bordada", "$ 39.000"],
    ["Medias deportivas x3", "$ 24.000"],
  ];
  return (
    <Ticket>
      <div className="titulo">
        <i>▣</i> Ticket · Caja principal
      </div>
      <ul>
        {items.map(([n, p], i) => (
          <li key={n} style={{ animationDelay: `${i * 0.9}s` }}>
            <span className="n">1</span>
            <span className="nombre">{n}</span>
            <b>{p}</b>
          </li>
        ))}
      </ul>
      <div className="total">
        <span>Total</span>
        <b>$ 116.620</b>
      </div>
      <div className="pagos">
        {["Efectivo", "Bre-B", "Link de pago"].map((p, i) => (
          <span key={p} style={{ animationDelay: `${i * 2.6}s` }}>
            {p}
          </span>
        ))}
      </div>
    </Ticket>
  );
}
const Ticket = styled(Base)`
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 96px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 9px;
    background: ${PAPEL};
    opacity: 0;
    animation: ${aparecer} ${CICLO} ease-in-out infinite;
    .n {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      background: ${SUAVE};
      color: ${MORADO};
      font-weight: 700;
      font-size: 0.7rem;
      display: grid;
      place-items: center;
      flex: none;
    }
    .nombre {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  .total {
    display: flex;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid ${LINEA};
    font-weight: 700;
    b {
      color: ${MORADO};
      font-size: 1.05rem;
      opacity: 0;
      animation: ${aparecer} ${CICLO} ease-in-out infinite;
      animation-delay: 2.6s;
    }
  }
  .pagos {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    span {
      padding: 4px 9px;
      border-radius: 999px;
      border: 1px solid ${LINEA};
      font-size: 0.72rem;
      font-weight: 600;
      animation: ${resaltarChip} ${CICLO} ease-in-out infinite;
    }
  }
`;

// WhatsApp: la factura llega y se marca pagada.
export function WidgetWhatsApp() {
  return (
    <Wa>
      <div className="titulo">
        <i>✆</i> WhatsApp del cliente
      </div>
      <div className="chat">
        <div className="burbuja mia">
          Tu factura <b>FV-128</b> y el link de pago 👇
          <span className="pdf">PDF · factura-FV-128.pdf</span>
        </div>
        <div className="burbuja">¡Listo, ya pagué!</div>
        <div className="pagada">✓ Factura pagada</div>
      </div>
    </Wa>
  );
}
const Wa = styled(Base)`
  .chat {
    position: relative;
    background: #e5ddd5;
    border-radius: 14px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 128px;
  }
  .burbuja {
    background: #fff;
    border-radius: 10px;
    padding: 7px 10px;
    font-size: 0.78rem;
    align-self: flex-start;
    max-width: 90%;
    opacity: 0;
    animation: ${aparecer} ${CICLO} ease-in-out infinite;
    animation-delay: 2.2s;
  }
  .burbuja.mia {
    background: #dcf8c6;
    align-self: flex-end;
    animation-delay: 0.3s;
  }
  .pdf {
    display: block;
    margin-top: 6px;
    background: #fff;
    border-radius: 7px;
    padding: 5px 8px;
    font-weight: 600;
    font-size: 0.72rem;
  }
  .pagada {
    position: absolute;
    right: 10px;
    bottom: 10px;
    background: ${VERDE};
    color: #063d1e;
    font-weight: 800;
    padding: 6px 10px;
    border-radius: 9px;
    transform: rotate(-4deg);
    box-shadow: 0 10px 24px rgba(37, 211, 102, 0.45);
    opacity: 0;
    animation: ${brotar} ${CICLO} ease-in-out infinite;
  }
`;

// Inventario: una barra se vacía con las ventas y salta la alerta.
export function WidgetStock() {
  return (
    <Stock>
      <div className="titulo">
        <i>▤</i> Bodega principal
      </div>
      {[
        ["Camisetas", 72, false],
        ["Gorras", 0, true],
        ["Medias", 48, false],
      ].map(([n, w, anim]) => (
        <div className="fila" key={n}>
          <span>{n}</span>
          <div className="barra">
            <div className={anim ? "nivel vaciar" : "nivel"} style={anim ? undefined : { width: `${w}%` }} />
          </div>
        </div>
      ))}
      <div className="alerta">⚠ Quedan 4 gorras · Novandra sugiere pedir 30</div>
    </Stock>
  );
}
const Stock = styled(Base)`
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 0.78rem;
    span {
      width: 68px;
    }
  }
  .barra {
    flex: 1;
    height: 9px;
    border-radius: 999px;
    background: ${PAPEL};
    overflow: hidden;
  }
  .nivel {
    height: 100%;
    border-radius: 999px;
    background: ${MORADO};
  }
  .vaciar {
    animation: ${vaciar} ${CICLO} ease-in-out infinite;
  }
  .alerta {
    margin-top: 2px;
    padding: 8px 10px;
    border-radius: 10px;
    background: ${SUAVE};
    color: ${TINTA};
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0;
    animation: ${alerta} ${CICLO} ease-in-out infinite;
  }
`;

// Novandra: la pregunta se escribe, piensa y responde.
export function WidgetNovandra() {
  return (
    <Nov $tinta>
      <div className="titulo">
        <i>✦</i> Novandra · tu asistente
      </div>
      <div className="pregunta">
        <span className="texto">¿Qué se me está acabando?</span>
      </div>
      <div className="pensando" aria-hidden="true">
        <i /> <i /> <i />
      </div>
      <div className="respuesta">
        Dos productos están por debajo del mínimo: <b>gorras</b> (quedan 4) y <b>medias</b> (quedan 9).
        <span className="boton">+ Crear orden de compra</span>
      </div>
    </Nov>
  );
}
const Nov = styled(Base)`
  min-height: 190px;
  .pregunta {
    align-self: flex-end;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 12px 12px 4px 12px;
    padding: 7px 11px;
    font-weight: 600;
    font-size: 0.8rem;
    max-width: 100%;
  }
  .texto {
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    vertical-align: bottom;
    animation: ${escribir} ${CICLO} steps(24, end) infinite;
  }
  .pensando {
    display: flex;
    gap: 5px;
    padding: 2px 4px;
    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${MORADO_CLARO};
      animation: ${puntos} 1.2s ease-in-out infinite;
    }
    i:nth-child(2) {
      animation-delay: 0.15s;
    }
    i:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
  .respuesta {
    background: ${TINTA2};
    border-radius: 12px 12px 12px 4px;
    padding: 9px 11px;
    font-size: 0.78rem;
    opacity: 0;
    animation: ${respuesta} ${CICLO} ease-in-out infinite;
  }
  .boton {
    display: inline-block;
    margin-top: 8px;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 8px;
    padding: 5px 9px;
    font-weight: 700;
    font-size: 0.74rem;
  }
`;

// Medios de pago: los chips se encienden en secuencia.
export function WidgetPagos() {
  const medios = ["Efectivo", "Datáfono", "Bre-B", "Nequi", "Daviplata", "Link Wompi", "Crédito"];
  return (
    <Pagos>
      <div className="titulo">
        <i>$</i> Como tu cliente quiera pagar
      </div>
      <div className="chips">
        {medios.map((m, i) => (
          <span key={m} style={{ animationDelay: `${i * 1.1}s` }}>
            {m}
          </span>
        ))}
      </div>
      <span className="muted">Pago mixto y ventas a crédito incluidos.</span>
    </Pagos>
  );
}
const Pagos = styled(Base)`
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    span {
      padding: 6px 10px;
      border-radius: 10px;
      border: 1px solid ${LINEA};
      font-weight: 600;
      font-size: 0.76rem;
      animation: ${resaltarChip} ${CICLO} ease-in-out infinite;
    }
  }
`;

// Cinta deslizante con lo que incluye Stockly.
export function Cinta({ items }) {
  const lista = [...items, ...items];
  return (
    <CintaBase aria-hidden="true">
      <div className="pista">
        {lista.map((t, i) => (
          <span key={i}>
            <b>•</b> {t}
          </span>
        ))}
      </div>
    </CintaBase>
  );
}
const CintaBase = styled.div`
  overflow: hidden;
  border-top: 1px solid ${LINEA};
  border-bottom: 1px solid ${LINEA};
  padding: 12px 0;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  .pista {
    display: flex;
    gap: 36px;
    width: max-content;
    animation: ${desplazar} 38s linear infinite;
  }
  span {
    white-space: nowrap;
    font-weight: 600;
    color: ${GRIS};
    font-size: 0.92rem;
  }
  b {
    color: ${MORADO};
    margin-right: 6px;
  }
`;

// Ilustración que flota suavemente.
export const Flotante = styled.img`
  animation: ${flotar} 7s ease-in-out infinite;
  will-change: transform;
`;

// Borde con degradado que gira (para la tarjeta destacada).
export const BordeVivo = styled.div`
  position: relative;
  border-radius: 20px;
  padding: 2px;
  background: conic-gradient(from var(--angulo, 0deg), ${MORADO}, ${MORADO_CLARO}, #fff, ${MORADO});
  animation: ${girarBorde} 6s linear infinite;
  @property --angulo {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  > div {
    border-radius: 18px;
    background: #fff;
    height: 100%;
  }
`;
