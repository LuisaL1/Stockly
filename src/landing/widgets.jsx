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

export function PanelVentas() {
  return (
    <Tarjeta className="ancha">
      <div className="titulo">
        <i>↗</i> Ventas del periodo · últimos 30 días
      </div>
      <Cifra>$ 18.972.051</Cifra>
      <span className="muted">57 ventas</span>
      <Grafica viewBox="0 0 320 70" aria-hidden="true">
        <defs>
          <linearGradient id="gv" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={MORADO_CLARO} stopOpacity="0.4" />
            <stop offset="1" stopColor={MORADO_CLARO} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="area" d="M0 52 C 25 44, 40 50, 58 46 S 86 8, 110 22 S 148 52, 172 38 S 212 16, 236 32 S 280 56, 300 26 L 320 16 L 320 70 L 0 70 Z" fill="url(#gv)" />
        <path className="linea" d="M0 52 C 25 44, 40 50, 58 46 S 86 8, 110 22 S 148 52, 172 38 S 212 16, 236 32 S 280 56, 300 26 L 320 16" fill="none" stroke={MORADO_CLARO} strokeWidth="2.5" pathLength="1" />
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

// --------------------------------------------------------------- Teléfono con la app y avisos flotantes (hero)
const MOVIL_ANCHO = 460;
const MOVIL_ALTO = 600;
export function Movil() {
  return (
    <MovilEscena className="movil-escena" aria-hidden="true">
      <div className="lienzo">
        <div className="telefono">
          <div className="pantalla">
            <img src={movil} alt="" width="780" height="1688" fetchPriority="high" />
          </div>
        </div>
        <div className="flot aviso">
          <i>⚠</i>
          <div>
            <b>Stock bajo</b>
            <span>Gorra negra bordada · quedan 4</span>
          </div>
        </div>
        <div className="flot novandra">
          <i>✦</i>
          <div>
            <b>Novandra</b>
            <span>Pide 30 gorras a Textiles del Eje antes del viernes.</span>
            <em>Crear orden</em>
          </div>
        </div>
        <div className="flot venta">
          <i>✓</i>
          <div>
            <b>Venta registrada</b>
            <span>$ 116.620 · Bre-B</span>
          </div>
        </div>
      </div>
    </MovilEscena>
  );
}
const MovilEscena = styled.div`
  --k: 1;
  position: relative;
  width: calc(${MOVIL_ANCHO}px * var(--k));
  height: calc(${MOVIL_ALTO}px * var(--k));
  .lienzo {
    position: absolute;
    inset: 0;
    width: ${MOVIL_ANCHO}px;
    height: ${MOVIL_ALTO}px;
    transform: scale(var(--k));
    transform-origin: 0 0;
  }
  .telefono {
    position: absolute;
    left: 88px;
    top: 0;
    width: 284px;
    height: ${MOVIL_ALTO}px;
    padding: 10px;
    border-radius: 44px;
    background: ${TINTA};
    box-shadow: 0 40px 90px -40px rgba(23, 19, 29, 0.6), inset 0 0 0 1px rgba(244, 241, 236, 0.12);
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
  .flot {
    position: absolute;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    background: #fff;
    border: 1px solid ${LINEA};
    box-shadow: 0 24px 50px -28px rgba(23, 19, 29, 0.45);
    font-size: 0.8rem;
    line-height: 1.35;
    width: 230px;
    i {
      flex: none;
      width: 30px;
      height: 30px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-style: normal;
      font-weight: 800;
    }
    b {
      display: block;
      font-size: 0.84rem;
    }
    span {
      color: ${GRIS};
    }
    em {
      display: inline-block;
      margin-top: 8px;
      padding: 5px 10px;
      border-radius: 8px;
      background: ${MORADO};
      color: #fff;
      font-style: normal;
      font-weight: 700;
      font-size: 0.76rem;
    }
  }
  .aviso {
    left: -44px;
    top: 150px;
    i {
      background: #fde8e8;
      color: #b91c1c;
    }
  }
  .novandra {
    right: -36px;
    top: 300px;
    width: 236px;
    background: ${TINTA2};
    border-color: rgba(244, 241, 236, 0.1);
    color: ${PAPEL};
    span {
      color: rgba(244, 241, 236, 0.7);
    }
    i {
      background: ${MORADO_CLARO};
      color: ${TINTA};
    }
    em {
      background: ${MORADO_CLARO};
      color: ${TINTA};
    }
  }
  .venta {
    left: -30px;
    bottom: 70px;
    width: 214px;
    i {
      background: #dcfce7;
      color: #15803d;
    }
  }
`;
