import styled, { keyframes } from "styled-components";
import movil from "../assets/movil-inicio.webp";
import { GRIS, LINEA, MORADO, MORADO_CLARO, PAPEL, SUAVE, TINTA, TINTA2, VERDE } from "./tokens";

// Visuales animados de la página pública. Solo CSS (keyframes): funcionan prerenderizados
// y respetan "prefers-reduced-motion". Nada aquí es clicable, así que no hay estados hover.

const CICLO = "9s";

const aparecer = keyframes`
  0%, 100% { opacity: 0; transform: translateY(8px); }
  10%, 88% { opacity: 1; transform: translateY(0); }
  96% { opacity: 0; }
`;
const dibujar = keyframes`
  0% { stroke-dashoffset: 1; }
  35%, 88% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 1; }
`;
const rellenar = keyframes`
  0% { opacity: 0; }
  40%, 88% { opacity: 1; }
  100% { opacity: 0; }
`;
const sello = keyframes`
  0%, 58% { opacity: 0; transform: rotate(-6deg) scale(0.5); }
  64% { opacity: 1; transform: rotate(-6deg) scale(1.1); }
  69%, 92% { opacity: 1; transform: rotate(-6deg) scale(1); }
  100% { opacity: 0; transform: rotate(-6deg) scale(0.9); }
`;
const vaciar = keyframes`
  0%, 8% { width: 76%; background: ${MORADO}; }
  58%, 90% { width: 9%; background: #DC2626; }
  100% { width: 76%; background: ${MORADO}; }
`;
const alerta = keyframes`
  0%, 56% { opacity: 0; transform: translateY(6px); }
  64%, 92% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const puntos = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
`;
const escribir = keyframes`
  0%, 6% { width: 0; }
  34%, 100% { width: 100%; }
`;
const respuesta = keyframes`
  0%, 36% { opacity: 0; transform: translateY(8px); }
  42%, 96% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const pensar = keyframes`
  0%, 30% { opacity: 0; }
  32%, 38% { opacity: 1; }
  40%, 100% { opacity: 0; }
`;
const encender = keyframes`
  0%, 100% { background: #fff; color: ${TINTA}; border-color: ${LINEA}; }
  10%, 20% { background: ${SUAVE}; color: ${MORADO}; border-color: ${MORADO}; }
`;
const contar = keyframes`
  0%, 10% { opacity: 0.25; }
  30%, 100% { opacity: 1; }
`;

// --------------------------------------------------------------- Ventana de la app (hero)
export const VentanaApp = styled.div`
  width: 100%;
  border-radius: 22px;
  background: ${TINTA};
  border: 1px solid rgba(244, 241, 236, 0.1);
  box-shadow: 0 50px 120px -50px rgba(23, 19, 29, 0.6);
  overflow: hidden;
  color: ${PAPEL};
  font-size: 0.86rem;
  .barra {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(244, 241, 236, 0.08);
    i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(244, 241, 236, 0.18);
      display: inline-block;
    }
    span {
      margin-left: 10px;
      color: rgba(244, 241, 236, 0.55);
      font-size: 0.78rem;
    }
  }
  .cuerpo {
    display: grid;
    grid-template-columns: 1fr;
    @media (min-width: 720px) {
      grid-template-columns: 180px 1fr;
    }
  }
  .lateral {
    display: none;
    @media (min-width: 720px) {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 10px;
      border-right: 1px solid rgba(244, 241, 236, 0.08);
      font-size: 0.78rem;
      color: rgba(244, 241, 236, 0.7);
      b {
        display: block;
        font-size: 0.64rem;
        letter-spacing: 0.08em;
        color: rgba(244, 241, 236, 0.4);
        padding: 10px 10px 4px;
      }
      span {
        padding: 7px 10px;
        border-radius: 8px;
      }
      span.activo {
        background: rgba(226, 164, 255, 0.14);
        color: ${MORADO_CLARO};
        font-weight: 600;
      }
    }
  }
  .panel {
    padding: 16px;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    @media (min-width: 720px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    > * {
      min-width: 0;
    }
  }
  .saludo {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    strong {
      font-size: 1.05rem;
      font-weight: 800;
    }
    span {
      color: rgba(244, 241, 236, 0.55);
      font-size: 0.78rem;
    }
  }
  .ancha {
    grid-column: span 2;
  }
`;

const Tarjeta = styled.div`
  border-radius: 14px;
  padding: 14px;
  background: ${TINTA2};
  border: 1px solid rgba(244, 241, 236, 0.07);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  font-variant-numeric: tabular-nums;
  .titulo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.78rem;
    color: rgba(244, 241, 236, 0.75);
  }
  .titulo i {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    background: rgba(226, 164, 255, 0.14);
    color: ${MORADO_CLARO};
    font-style: normal;
    font-size: 0.72rem;
  }
  .muted {
    color: rgba(244, 241, 236, 0.55);
    font-size: 0.74rem;
  }
  &.morada {
    background: ${MORADO};
    color: #fff;
    .titulo,
    .muted {
      color: rgba(255, 255, 255, 0.85);
    }
    .titulo i {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
    }
  }
`;

// La curva es la real de la cuenta demo (trazada desde la captura), la misma que se ve en el móvil.
export function PanelVentas() {
  return (
    <Tarjeta className="ancha">
      <div className="titulo">
        <i>↗</i> Ventas del periodo · últimos 30 días
      </div>
      <Cifra>$ 17.740.282</Cifra>
      <span className="muted">54 ventas</span>
      <Grafica viewBox="0 0 320 70" aria-hidden="true">
        <defs>
          <linearGradient id="gv" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={MORADO_CLARO} stopOpacity="0.4" />
            <stop offset="1" stopColor={MORADO_CLARO} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d="M0.0 32.0 C 2.5 32.0, 2.5 32.5, 5.1 32.5 C 7.6 32.5, 7.6 33.1, 10.2 33.1 C 12.7 33.1, 12.7 32.8, 15.2 32.8 C 17.8 32.8, 17.8 31.2, 20.3 31.2 C 22.9 31.2, 22.9 34.3, 25.4 34.3 C 27.9 34.3, 27.9 44.5, 30.5 44.5 C 33.0 44.5, 33.0 49.2, 35.6 49.2 C 38.1 49.2, 38.1 42.3, 40.6 42.3 C 43.2 42.3, 43.2 36.3, 45.7 36.3 C 48.3 36.3, 48.3 38.4, 50.8 38.4 C 53.3 38.4, 53.3 42.6, 55.9 42.6 C 58.4 42.6, 58.4 45.2, 61.0 45.2 C 63.5 45.2, 63.5 46.3, 66.0 46.3 C 68.6 46.3, 68.6 42.5, 71.1 42.5 C 73.7 42.5, 73.7 34.9, 76.2 34.9 C 78.7 34.9, 78.7 23.4, 81.3 23.4 C 83.8 23.4, 83.8 8.6, 86.3 8.6 C 88.9 8.6, 88.9 13.8, 91.4 13.8 C 94.0 13.8, 94.0 39.1, 96.5 39.1 C 99.0 39.1, 99.0 53.3, 101.6 53.3 C 104.1 53.3, 104.1 49.6, 106.7 49.6 C 109.2 49.6, 109.2 42.0, 111.7 42.0 C 114.3 42.0, 114.3 31.6, 116.8 31.6 C 119.4 31.6, 119.4 24.7, 121.9 24.7 C 124.4 24.7, 124.4 30.0, 127.0 30.0 C 129.5 30.0, 129.5 38.6, 132.1 38.6 C 134.6 38.6, 134.6 43.8, 137.1 43.8 C 139.7 43.8, 139.7 47.2, 142.2 47.2 C 144.8 47.2, 144.8 46.7, 147.3 46.7 C 149.8 46.7, 149.8 43.1, 152.4 43.1 C 154.9 43.1, 154.9 37.5, 157.5 37.5 C 160.0 37.5, 160.0 30.7, 162.5 30.7 C 165.1 30.7, 165.1 33.1, 167.6 33.1 C 170.2 33.1, 170.2 45.1, 172.7 45.1 C 175.2 45.1, 175.2 53.9, 177.8 53.9 C 180.3 53.9, 180.3 56.7, 182.9 56.7 C 185.4 56.7, 185.4 56.6, 187.9 56.6 C 190.5 56.6, 190.5 50.9, 193.0 50.9 C 195.6 50.9, 195.6 44.0, 198.1 44.0 C 200.6 44.0, 200.6 35.9, 203.2 35.9 C 205.7 35.9, 205.7 31.2, 208.3 31.2 C 210.8 31.2, 210.8 38.5, 213.3 38.5 C 215.9 38.5, 215.9 48.9, 218.4 48.9 C 221.0 48.9, 221.0 46.3, 223.5 46.3 C 226.0 46.3, 226.0 37.5, 228.6 37.5 C 231.1 37.5, 231.1 38.8, 233.7 38.8 C 236.2 38.8, 236.2 48.1, 238.7 48.1 C 241.3 48.1, 241.3 51.2, 243.8 51.2 C 246.3 51.2, 246.3 47.5, 248.9 47.5 C 251.4 47.5, 251.4 45.2, 254.0 45.2 C 256.5 45.2, 256.5 45.6, 259.0 45.6 C 261.6 45.6, 261.6 47.1, 264.1 47.1 C 266.7 47.1, 266.7 50.0, 269.2 50.0 C 271.7 50.0, 271.7 52.6, 274.3 52.6 C 276.8 52.6, 276.8 53.2, 279.4 53.2 C 281.9 53.2, 281.9 53.4, 284.4 53.4 C 287.0 53.4, 287.0 54.6, 289.5 54.6 C 292.1 54.6, 292.1 56.2, 294.6 56.2 C 297.1 56.2, 297.1 56.9, 299.7 56.9 C 302.2 56.9, 302.2 57.1, 304.8 57.1 C 307.3 57.1, 307.3 51.7, 309.8 51.7 C 312.4 51.7, 312.4 37.9, 314.9 37.9 C 317.5 37.9, 317.5 30.2, 320.0 30.2 L 320 70 L 0 70 Z" fill="url(#gv)" />
        <path className="linea" d="M0.0 32.0 C 2.5 32.0, 2.5 32.5, 5.1 32.5 C 7.6 32.5, 7.6 33.1, 10.2 33.1 C 12.7 33.1, 12.7 32.8, 15.2 32.8 C 17.8 32.8, 17.8 31.2, 20.3 31.2 C 22.9 31.2, 22.9 34.3, 25.4 34.3 C 27.9 34.3, 27.9 44.5, 30.5 44.5 C 33.0 44.5, 33.0 49.2, 35.6 49.2 C 38.1 49.2, 38.1 42.3, 40.6 42.3 C 43.2 42.3, 43.2 36.3, 45.7 36.3 C 48.3 36.3, 48.3 38.4, 50.8 38.4 C 53.3 38.4, 53.3 42.6, 55.9 42.6 C 58.4 42.6, 58.4 45.2, 61.0 45.2 C 63.5 45.2, 63.5 46.3, 66.0 46.3 C 68.6 46.3, 68.6 42.5, 71.1 42.5 C 73.7 42.5, 73.7 34.9, 76.2 34.9 C 78.7 34.9, 78.7 23.4, 81.3 23.4 C 83.8 23.4, 83.8 8.6, 86.3 8.6 C 88.9 8.6, 88.9 13.8, 91.4 13.8 C 94.0 13.8, 94.0 39.1, 96.5 39.1 C 99.0 39.1, 99.0 53.3, 101.6 53.3 C 104.1 53.3, 104.1 49.6, 106.7 49.6 C 109.2 49.6, 109.2 42.0, 111.7 42.0 C 114.3 42.0, 114.3 31.6, 116.8 31.6 C 119.4 31.6, 119.4 24.7, 121.9 24.7 C 124.4 24.7, 124.4 30.0, 127.0 30.0 C 129.5 30.0, 129.5 38.6, 132.1 38.6 C 134.6 38.6, 134.6 43.8, 137.1 43.8 C 139.7 43.8, 139.7 47.2, 142.2 47.2 C 144.8 47.2, 144.8 46.7, 147.3 46.7 C 149.8 46.7, 149.8 43.1, 152.4 43.1 C 154.9 43.1, 154.9 37.5, 157.5 37.5 C 160.0 37.5, 160.0 30.7, 162.5 30.7 C 165.1 30.7, 165.1 33.1, 167.6 33.1 C 170.2 33.1, 170.2 45.1, 172.7 45.1 C 175.2 45.1, 175.2 53.9, 177.8 53.9 C 180.3 53.9, 180.3 56.7, 182.9 56.7 C 185.4 56.7, 185.4 56.6, 187.9 56.6 C 190.5 56.6, 190.5 50.9, 193.0 50.9 C 195.6 50.9, 195.6 44.0, 198.1 44.0 C 200.6 44.0, 200.6 35.9, 203.2 35.9 C 205.7 35.9, 205.7 31.2, 208.3 31.2 C 210.8 31.2, 210.8 38.5, 213.3 38.5 C 215.9 38.5, 215.9 48.9, 218.4 48.9 C 221.0 48.9, 221.0 46.3, 223.5 46.3 C 226.0 46.3, 226.0 37.5, 228.6 37.5 C 231.1 37.5, 231.1 38.8, 233.7 38.8 C 236.2 38.8, 236.2 48.1, 238.7 48.1 C 241.3 48.1, 241.3 51.2, 243.8 51.2 C 246.3 51.2, 246.3 47.5, 248.9 47.5 C 251.4 47.5, 251.4 45.2, 254.0 45.2 C 256.5 45.2, 256.5 45.6, 259.0 45.6 C 261.6 45.6, 261.6 47.1, 264.1 47.1 C 266.7 47.1, 266.7 50.0, 269.2 50.0 C 271.7 50.0, 271.7 52.6, 274.3 52.6 C 276.8 52.6, 276.8 53.2, 279.4 53.2 C 281.9 53.2, 281.9 53.4, 284.4 53.4 C 287.0 53.4, 287.0 54.6, 289.5 54.6 C 292.1 54.6, 292.1 56.2, 294.6 56.2 C 297.1 56.2, 297.1 56.9, 299.7 56.9 C 302.2 56.9, 302.2 57.1, 304.8 57.1 C 307.3 57.1, 307.3 51.7, 309.8 51.7 C 312.4 51.7, 312.4 37.9, 314.9 37.9 C 317.5 37.9, 317.5 30.2, 320.0 30.2" fill="none" stroke={MORADO_CLARO} strokeWidth="2.5" pathLength="1" />
      </Grafica>
    </Tarjeta>
  );
}
const Cifra = styled.strong`
  font-size: 1.9rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
  animation: ${contar} ${CICLO} ease-out infinite;
`;
const Grafica = styled.svg`
  width: 100%;
  height: 70px;
  .linea {
    stroke-dasharray: 1;
    animation: ${dibujar} ${CICLO} ease-in-out infinite;
  }
  .area {
    animation: ${rellenar} ${CICLO} ease-in-out infinite;
  }
`;

export function PanelHoy() {
  return (
    <Tarjeta className="morada">
      <div className="titulo">
        <i>▣</i> Ventas de hoy
      </div>
      <Cifra style={{ fontSize: "1.5rem" }}>$ 1.042.440</Cifra>
      <span className="muted">3 ventas registradas</span>
    </Tarjeta>
  );
}

export function PanelStock() {
  return (
    <Stock>
      <div className="titulo">
        <i>▤</i> Bodega principal
      </div>
      {[
        ["Camisetas", 70, false],
        ["Gorras", 0, true],
        ["Medias", 46, false],
      ].map(([n, w, anim]) => (
        <div className="fila" key={n}>
          <span>{n}</span>
          <div className="barra">
            <div className={anim ? "nivel vaciar" : "nivel"} style={anim ? undefined : { width: `${w}%` }} />
          </div>
        </div>
      ))}
      <div className="alerta">⚠ Quedan 4 gorras. Novandra sugiere pedir 30.</div>
    </Stock>
  );
}
const Stock = styled(Tarjeta)`
  .fila {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.76rem;
    span {
      width: 64px;
      color: rgba(244, 241, 236, 0.8);
    }
  }
  .barra {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: rgba(244, 241, 236, 0.1);
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
    padding: 7px 9px;
    border-radius: 9px;
    background: rgba(226, 164, 255, 0.14);
    color: ${PAPEL};
    font-size: 0.72rem;
    font-weight: 600;
    opacity: 0;
    animation: ${alerta} ${CICLO} ease-in-out infinite;
  }
`;

export function PanelTicket() {
  const items = [
    ["Camiseta básica algodón", "$ 35.000"],
    ["Gorra negra bordada", "$ 39.000"],
    ["Medias deportivas x3", "$ 24.000"],
  ];
  return (
    <TicketP>
      <div className="titulo">
        <i>▥</i> Ticket · Caja principal
      </div>
      <ul>
        {items.map(([n, p], i) => (
          <li key={n} style={{ animationDelay: `${i * 0.9}s` }}>
            <span className="nombre">{n}</span>
            <b>{p}</b>
          </li>
        ))}
      </ul>
      <div className="total">
        <span>Total</span>
        <b>$ 116.620</b>
      </div>
    </TicketP>
  );
}
const TicketP = styled(Tarjeta)`
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 72px;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.76rem;
    opacity: 0;
    animation: ${aparecer} ${CICLO} ease-in-out infinite;
    .nombre {
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: rgba(244, 241, 236, 0.85);
    }
  }
  .total {
    display: flex;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid rgba(244, 241, 236, 0.1);
    font-weight: 700;
    b {
      color: ${MORADO_CLARO};
      opacity: 0;
      animation: ${aparecer} ${CICLO} ease-in-out infinite;
      animation-delay: 2.7s;
    }
  }
`;

export function PanelPlan() {
  return (
    <Tarjeta>
      <div className="titulo">
        <i>♛</i> Plan Pro
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
        <span>Ventas del mes</span>
        <b>16 / 5.000</b>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(244,241,236,0.1)" }}>
        <div style={{ width: "2%", height: "100%", borderRadius: 999, background: MORADO_CLARO }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem" }}>
        <span>Productos</span>
        <b>14 / 5.000</b>
      </div>
    </Tarjeta>
  );
}

// --------------------------------------------------------------- Historias (un visual distinto por función)

// Caja: los medios de pago se encienden y cae el sello de cobrado.
export function VisualCaja() {
  const medios = ["Efectivo", "Datáfono", "Bre-B", "Nequi", "Daviplata", "Link de pago", "Crédito", "Pago mixto"];
  return (
    <Caja>
      <div className="medios">
        {medios.map((m, i) => (
          <span key={m} style={{ animationDelay: `${i * 0.7}s` }}>
            {m}
          </span>
        ))}
      </div>
      <div className="pie">
        <div>
          <span className="muted">Total</span>
          <strong>$ 116.620</strong>
        </div>
        <div className="sello">✓ Cobrada</div>
      </div>
    </Caja>
  );
}
const Caja = styled.div`
  background: #fff;
  border: 1px solid ${LINEA};
  border-radius: 20px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  .medios {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
    span {
      padding: 14px 10px;
      border-radius: 12px;
      border: 1.5px solid ${LINEA};
      font-weight: 600;
      font-size: 0.86rem;
      text-align: center;
      animation: ${encender} ${CICLO} ease-in-out infinite;
    }
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid ${LINEA};
    .muted {
      display: block;
      color: ${GRIS};
      font-size: 0.8rem;
    }
    strong {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  }
  .sello {
    background: #15803d;
    color: #fff;
    font-weight: 800;
    padding: 8px 16px;
    border-radius: 10px;
    opacity: 0;
    animation: ${sello} ${CICLO} ease-in-out infinite;
  }
`;

// Inventario: tres bodegas con sus unidades y una barra que se vacía.
export function VisualBodegas() {
  const bodegas = [
    ["Bodega principal", 369, "$ 11.737.000"],
    ["Tienda Calarcá", 87, "$ 2.195.000"],
    ["Tienda online", 32, "$ 768.000"],
  ];
  return (
    <Bodegas>
      {bodegas.map(([n, u, c]) => (
        <div className="bodega" key={n}>
          <span className="nombre">{n}</span>
          <strong>{u}</strong>
          <span className="muted">unidades</span>
          <span className="muted">{c} a costo</span>
        </div>
      ))}
      <div className="fila">
        <span>Gorra negra bordada</span>
        <div className="barra">
          <div className="nivel" />
        </div>
        <em>4 und</em>
      </div>
      <div className="alerta">⚠ Stock bajo. Novandra sugiere pedir 30 a Textiles del Eje.</div>
    </Bodegas>
  );
}
const Bodegas = styled.div`
  background: #fff;
  border: 1px solid ${LINEA};
  border-radius: 20px;
  padding: 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  font-variant-numeric: tabular-nums;
  .bodega {
    min-width: 0;
    padding: 14px;
    border-radius: 14px;
    background: ${PAPEL};
    display: flex;
    flex-direction: column;
    gap: 2px;
    .nombre {
      font-weight: 700;
      font-size: 0.86rem;
    }
    strong {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .muted {
      color: ${GRIS};
      font-size: 0.74rem;
      white-space: nowrap;
    }
  }
  .fila,
  .alerta {
    grid-column: 1 / -1;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: 6px;
    em {
      font-style: normal;
      color: #dc2626;
      font-weight: 700;
    }
  }
  .barra {
    flex: 1;
    height: 10px;
    border-radius: 999px;
    background: ${PAPEL};
    overflow: hidden;
  }
  .nivel {
    height: 100%;
    border-radius: 999px;
    animation: ${vaciar} ${CICLO} ease-in-out infinite;
  }
  .alerta {
    padding: 10px 14px;
    border-radius: 12px;
    background: ${SUAVE};
    font-size: 0.86rem;
    font-weight: 600;
    opacity: 0;
    animation: ${alerta} ${CICLO} ease-in-out infinite;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

// WhatsApp: un teléfono con el chat; la factura llega y queda pagada.
export function VisualTelefono() {
  return (
    <Telefono>
      <div className="pantalla">
        <div className="cabecera">
          <i /> María Fernanda
        </div>
        <div className="chat">
          <div className="burbuja mia">
            Hola María, te compartimos tu factura <b>FV-128</b>.
            <span className="pdf">PDF · factura-FV-128.pdf</span>
            <span className="link">Paga aquí: checkout.wompi.co/l/3Z0Cfi</span>
          </div>
          <div className="burbuja">¡Listo, ya pagué!</div>
          <div className="pagada">✓ Factura pagada</div>
        </div>
      </div>
    </Telefono>
  );
}
const Telefono = styled.div`
  width: min(100%, 320px);
  margin: 0 auto;
  border-radius: 36px;
  padding: 10px;
  background: ${TINTA};
  box-shadow: 0 40px 90px -40px rgba(23, 19, 29, 0.6);
  .pantalla {
    border-radius: 28px;
    overflow: hidden;
    background: #e5ddd5;
    min-height: 420px;
    display: flex;
    flex-direction: column;
  }
  .cabecera {
    background: #075e54;
    color: #fff;
    padding: 18px 14px 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    i {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #128c7e;
    }
  }
  .chat {
    position: relative;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .burbuja {
    background: #fff;
    border-radius: 12px;
    padding: 8px 11px;
    font-size: 0.84rem;
    line-height: 1.4;
    align-self: flex-start;
    max-width: 88%;
    opacity: 0;
    animation: ${aparecer} ${CICLO} ease-in-out infinite;
    animation-delay: 3s;
  }
  .burbuja.mia {
    background: #dcf8c6;
    align-self: flex-end;
    animation-delay: 0.4s;
  }
  .pdf,
  .link {
    display: block;
    margin-top: 6px;
    font-size: 0.76rem;
  }
  .pdf {
    background: #fff;
    border-radius: 8px;
    padding: 6px 8px;
    font-weight: 600;
  }
  .link {
    color: #0b57d0;
    text-decoration: underline;
    word-break: break-all;
  }
  .pagada {
    position: absolute;
    right: 14px;
    bottom: 16px;
    background: ${VERDE};
    color: #063d1e;
    font-weight: 800;
    padding: 8px 12px;
    border-radius: 10px;
    opacity: 0;
    animation: ${sello} ${CICLO} ease-in-out infinite;
  }
`;

// Novandra: la pregunta se escribe, piensa y responde con una tabla.
export function VisualNovandra() {
  const filas = [
    ["Cargador rápido USB-C", 3, "~23 oct", 6],
    ["Cojín decorativo", 7, "~27 oct", 8],
    ["Taza cerámica Stockly", 21, "~8 nov", 4],
  ];
  return (
    <Novandra>
      <div className="cab">
        <i>✦</i>
        <div>
          <b>Novandra</b>
          <span>Asistente de operaciones · aprende de tu negocio</span>
        </div>
      </div>
      <div className="pregunta">
        <span className="texto">¿Qué productos debo reabastecer esta semana?</span>
      </div>
      <div className="pensando" aria-hidden="true">
        <i /> <i /> <i />
      </div>
      <div className="respuesta">
        <b>Por reponer (6):</b>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Se agota</th>
              <th>Pedir</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(([n, s, a, p]) => (
              <tr key={n}>
                <td>{n}</td>
                <td>{s}</td>
                <td>{a}</td>
                <td>
                  <b>{p}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="boton">Crear borrador de orden (6 productos)</span>
      </div>
    </Novandra>
  );
}
const Novandra = styled.div`
  background: ${TINTA2};
  border: 1px solid rgba(244, 241, 236, 0.1);
  border-radius: 20px;
  padding: 20px;
  color: ${PAPEL};
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9rem;
  .cab {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(244, 241, 236, 0.1);
    i {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: ${MORADO_CLARO};
      color: ${TINTA};
      display: grid;
      place-items: center;
      font-style: normal;
      font-weight: 800;
    }
    b {
      display: block;
    }
    span {
      font-size: 0.78rem;
      color: rgba(244, 241, 236, 0.6);
    }
  }
  .pregunta {
    align-self: flex-end;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 14px 14px 4px 14px;
    padding: 9px 13px;
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
  }
  .texto {
    display: inline-block;
    vertical-align: bottom;
    @media (min-width: 640px) {
      white-space: nowrap;
      overflow: hidden;
      animation: ${escribir} ${CICLO} steps(42, end) infinite;
    }
  }
  .pensando {
    display: flex;
    gap: 5px;
    padding: 2px 4px;
    animation: ${pensar} ${CICLO} linear infinite;
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
    background: ${TINTA};
    border-radius: 14px 14px 14px 4px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    opacity: 0;
    animation: ${respuesta} ${CICLO} ease-in-out infinite;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    th,
    td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid rgba(244, 241, 236, 0.1);
    }
    th {
      color: rgba(244, 241, 236, 0.6);
      font-weight: 600;
    }
  }
  .boton {
    align-self: flex-start;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 10px;
    padding: 8px 12px;
    font-weight: 700;
    font-size: 0.82rem;
  }
`;

// --------------------------------------------------------------- Teléfono con la app y paneles flotantes (hero)
// Mismo lenguaje que la portada de MCCore: escenario con perspectiva, el dispositivo entra girando,
// los paneles aparecen escalonados y flotan apenas; las notificaciones entran una a una y Novandra responde.
const ESC_ANCHO = 560;
const ESC_ALTO = 620;
const NOTIFICACIONES = [
  ["▣", "Nueva venta #1042", "3 productos · $ 116.620 · Bre-B", ""],
  ["⚠", "Stock bajo: Gorra negra bordada", "Quedan 4 unidades", "aviso"],
  ["▤", "Llegó el pedido del proveedor", "120 unidades · Bodega principal", ""],
  ["✦", "Novandra sugiere reabastecer", "Gorra negra antes del viernes", ""],
];
export function Movil() {
  return (
    <Escena className="movil-escena" aria-hidden="true">
      <div className="lienzo">
        <div className="telefono">
          <div className="pantalla">
            <img src={movil} alt="" width="780" height="1688" fetchPriority="high" />
          </div>
        </div>

        <div className="panel notifs">
          <b className="titulo">Notificaciones</b>
          {NOTIFICACIONES.map(([ic, t, d, clase], i) => (
            <div className={`notif ${clase}`} key={t} style={{ "--i": i }}>
              <i>{ic}</i>
              <span>
                <b>{t}</b>
                <small>{d}</small>
              </span>
            </div>
          ))}
        </div>

        <div className="panel novandra">
          <div className="cab">
            <i>✦</i>
            <span>
              <b>Novandra</b>
              <small>Asistente de operaciones · ve tus datos en tiempo real</small>
            </span>
          </div>
          <div className="cuerpo">
            <p className="msg mia">¿Qué debo reabastecer?</p>
            <p className="escribiendo">
              <span />
              <span />
              <span />
            </p>
            <p className="msg bot">
              Repón <b>2 productos</b>. El más urgente: <b>Gorra negra bordada</b>, quedan 4 y se venden 6 por semana.
            </p>
            <div className="borrador">
              <i>▥</i>
              <span>
                <b>Orden de compra en borrador</b>
                <small>2 productos · lista para revisar</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Escena>
  );
}
const entrar = keyframes`
  from { opacity: 0; transform: rotateY(-40deg) rotateX(14deg) translateX(8%) translateY(6%); }
`;
const aparecer3d = keyframes`
  from { opacity: 0; translate: 0 30px; }
`;
const flotarSuave = keyframes`
  to { translate: 0 -12px; }
`;
const notifEntra = keyframes`
  from { opacity: 0; translate: 12px 0; }
`;
const msgEntra = keyframes`
  from { opacity: 0; translate: 0 10px; }
`;
const desplegar = keyframes`
  from { opacity: 0; max-height: 0; padding-block: 0; margin-top: -8px; border-width: 0; }
  to { opacity: 1; max-height: 160px; }
`;
const cajaEscribiendo = keyframes`
  0% { opacity: 0; max-height: 0; padding-block: 0; }
  15% { opacity: 1; max-height: 40px; padding-block: 9px; }
  85% { opacity: 1; max-height: 40px; padding-block: 9px; }
  100% { opacity: 0; max-height: 0; padding-block: 0; margin-top: -8px; }
`;
const punto = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-3px); opacity: 1; }
`;
const Escena = styled.div`
  --k: 1;
  position: relative;
  width: calc(${ESC_ANCHO}px * var(--k));
  height: calc(${ESC_ALTO}px * var(--k));
  pointer-events: none;
  .lienzo {
    position: absolute;
    inset: 0;
    width: ${ESC_ANCHO}px;
    height: ${ESC_ALTO}px;
    transform: scale(var(--k));
    transform-origin: 0 0;
    perspective: 1800px;
  }
  .telefono {
    position: absolute;
    left: 164px;
    top: 16px;
    width: 280px;
    height: 580px;
    padding: 10px;
    border-radius: 44px;
    background: ${TINTA};
    box-shadow: 0 50px 90px -40px rgba(23, 19, 29, 0.6), inset 0 0 0 1px rgba(244, 241, 236, 0.12);
    transform-style: preserve-3d;
    transform: rotateY(-16deg) rotateX(6deg) rotateZ(1deg);
    transform-origin: 40% 60%;
    animation: ${entrar} 1.4s cubic-bezier(0.2, 0.7, 0.1, 1) 0.2s backwards;
  }
  .pantalla {
    width: 100%;
    height: 100%;
    border-radius: 34px;
    overflow: hidden;
    background: #0e0b12;
    img {
      display: block;
      width: 100%;
      height: auto;
    }
  }
  .panel {
    position: absolute;
    border-radius: 16px;
    background: #fff;
    border: 1px solid ${LINEA};
    box-shadow: 0 30px 50px -28px rgba(23, 19, 29, 0.5);
    font-size: 0.78rem;
    line-height: 1.35;
  }
  /* Notificaciones: arriba a la derecha */
  .notifs {
    top: 0;
    right: -14px;
    width: 228px;
    padding: 12px 14px;
    transform: rotateY(-20deg) rotateX(6deg) rotateZ(-2deg);
    animation: ${aparecer3d} 1s cubic-bezier(0.2, 0.7, 0.1, 1) 0.9s backwards, ${flotarSuave} 8s ease-in-out 2.5s infinite alternate-reverse;
    .titulo {
      display: block;
      margin-bottom: 4px;
      font-size: 0.9rem;
    }
  }
  .notif {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 0;
    animation: ${notifEntra} 0.6s ease backwards;
    animation-delay: calc(1.4s + var(--i) * 0.25s);
    i {
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 9px;
      display: grid;
      place-items: center;
      font-style: normal;
      font-weight: 800;
      color: ${MORADO};
      background: ${SUAVE};
    }
    b {
      display: block;
      font-weight: 600;
    }
    small {
      color: ${GRIS};
    }
    &.aviso i {
      color: #b7791f;
      background: #fdf0d8;
    }
  }
  /* Novandra: abajo a la izquierda */
  .novandra {
    left: 0;
    bottom: -14px;
    width: 244px;
    overflow: hidden;
    transform: rotateY(-14deg) rotateX(6deg);
    animation: ${aparecer3d} 1s cubic-bezier(0.2, 0.7, 0.1, 1) 0.7s backwards, ${flotarSuave} 7s ease-in-out 2s infinite alternate;
    .cab {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 11px 13px;
      color: #fff;
      background: ${TINTA};
      i {
        flex: none;
        width: 32px;
        height: 32px;
        border-radius: 9px;
        display: grid;
        place-items: center;
        font-style: normal;
        font-weight: 800;
        color: ${TINTA};
        background: ${MORADO_CLARO};
      }
      b {
        display: block;
        font-size: 0.9rem;
      }
      small {
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.25;
        display: block;
      }
    }
    .cuerpo {
      display: grid;
      gap: 8px;
      padding: 12px;
      background: ${PAPEL};
    }
    .msg {
      max-width: 90%;
      padding: 8px 10px;
      border-radius: 11px;
    }
    .mia {
      justify-self: end;
      color: #fff;
      background: ${MORADO};
      border-bottom-right-radius: 3px;
      animation: ${msgEntra} 0.4s ease 1.6s backwards;
    }
    .bot {
      background: #fff;
      border: 1px solid rgba(23, 19, 29, 0.07);
      border-bottom-left-radius: 3px;
      animation: ${desplegar} 0.5s ease 3s backwards;
    }
    .escribiendo {
      display: flex;
      gap: 4px;
      width: max-content;
      padding: 9px 10px;
      border-radius: 11px;
      background: #fff;
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      animation: ${cajaEscribiendo} 1s ease 2s both;
      span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${GRIS};
        animation: ${punto} 0.9s ease-in-out infinite;
      }
      span:nth-child(2) {
        animation-delay: 0.15s;
      }
      span:nth-child(3) {
        animation-delay: 0.3s;
      }
    }
    .borrador {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 10px;
      border-radius: 11px;
      border: 1.5px dashed ${MORADO};
      background: ${SUAVE};
      animation: ${desplegar} 0.5s ease 3.6s backwards;
      i {
        font-style: normal;
        font-weight: 800;
        color: ${MORADO};
      }
      b {
        display: block;
      }
      small {
        color: ${GRIS};
      }
    }
  }
`;
