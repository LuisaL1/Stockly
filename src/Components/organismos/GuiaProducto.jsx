import { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { Modal } from "../moleculas/Modal";
import { Boton } from "../atomos/Boton";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { formatearMonedaCorta, formatearNumero } from "../../utils/conversiones";
import { COLOR_CATEGORIA_DEFECTO } from "../../utils/coloresCategoria";
import { v } from "../../styles/variables";
import { marcarGuiaProductoVista } from "../../utils/guiaProducto";

const EJEMPLO = {
  nombre: "Loción Brisa 120 ml",
  categoria: "Lociones",
  color: COLOR_CATEGORIA_DEFECTO,
  marca: "Nativa",
  codigo_interno: "LOC-001",
  codigo_barras: "7701234567890",
  precio_compra: 20000,
  precio_venta: 45000,
  stock: 30,
  stock_minimo: 5,
};

const PASOS = [
  {
    titulo: "Así se ve un producto bien registrado",
    texto:
      "Cada producto tiene una ficha. Con nombre y precio de venta ya puedes vender; lo demás hace que Stockly te avise, calcule tus ganancias y te sugiera qué comprar.",
    resalta: [],
  },
  {
    titulo: "1. Nombre claro y categoría",
    texto:
      "Usa un nombre que tu equipo reconozca al buscar (incluye tamaño o presentación). La categoría agrupa productos parecidos: así filtras en la caja y ves en reportes qué grupo vende más. La marca es opcional.",
    resalta: ["nombre", "categoria", "marca"],
    ir: { texto: "Ver categorías", a: "/configurar/categorias" },
  },
  {
    titulo: "2. Precio de compra y de venta",
    texto:
      "El precio de venta es lo que cobra la caja. El de compra (costo) es opcional, pero sin él Stockly no puede calcular tu margen ni el valor de tu inventario.",
    resalta: ["precio_compra", "precio_venta", "margen"],
  },
  {
    titulo: "3. Stock y stock mínimo",
    texto:
      "El stock es lo que tienes hoy. El mínimo es tu punto de alerta: cuando llegues ahí, la campana te avisa y Novandra lo incluye en sus sugerencias de compra. Después, el stock cambia solo con ventas, compras y movimientos del kardex.",
    resalta: ["stock", "stock_minimo"],
    ir: { texto: "Ver kardex", a: "/kardex" },
  },
  {
    titulo: "4. Códigos (opcionales)",
    texto:
      "El código de barras te deja vender con lector. El código interno (SKU) evita confusiones entre productos parecidos y es lo que usa Stockly para reconocer el producto cuando vuelves a importar tu Excel.",
    resalta: ["codigo_interno", "codigo_barras"],
  },
  {
    titulo: "¡Listo para vender!",
    texto:
      "Busca el producto en la caja, elige cómo te pagan y cobra. El stock se descuenta solo y la venta queda en tus reportes. Puedes volver a ver esta guía desde Productos.",
    resalta: [],
    ir: { texto: "Ir a vender", a: "/ventas" },
  },
];

export function GuiaProducto({ ejemplo, onClose }) {
  const navigate = useNavigate();
  const { dataempresa } = useEmpresaStore();
  const [paso, setPaso] = useState(0);
  const p = {
    ...EJEMPLO,
    ...Object.fromEntries(Object.entries(ejemplo ?? {}).filter(([, x]) => x != null && x !== "")),
  };
  // Si el ejemplo viene de tus datos sin algún campo, se muestra cómo quedaría (gris).
  const propio = (campo) => ejemplo?.[campo] != null && ejemplo?.[campo] !== "";
  const dinero = (n) => formatearMonedaCorta(n, dataempresa?.simbolomoneda ?? "$");
  const margen = p.precio_venta > 0 && p.precio_compra > 0 ? Math.round(((p.precio_venta - p.precio_compra) / p.precio_venta) * 100) : null;
  const actual = PASOS[paso];
  const ultimo = paso === PASOS.length - 1;

  function cerrar() {
    marcarGuiaProductoVista();
    onClose();
  }

  const Campo = ({ campo, etiqueta, children }) => (
    <div className={`campo ${actual.resalta.includes(campo) ? "resaltado" : ""} ${ejemplo && !propio(campo) ? "sugerido" : ""}`}>
      <span>{etiqueta}</span>
      <strong>{children}</strong>
    </div>
  );

  return (
    <Modal
      titulo="Guía: registrar un producto"
      subtitulo={ejemplo ? "Con uno de tus productos como ejemplo" : "Con un producto de ejemplo"}
      onClose={cerrar}
      ancho="620px"
      pie={
        <Pie>
          <div className="puntos" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
            {PASOS.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === paso ? "activo" : ""}
                onClick={() => setPaso(i)}
                aria-label={`Paso ${i + 1}`}
              />
            ))}
          </div>
          <div className="botones">
            {paso > 0 && (
              <Boton variante="fantasma" funcion={() => setPaso(paso - 1)}>
                Anterior
              </Boton>
            )}
            {ultimo ? (
              <Boton icono={<v.iconolisto />} funcion={cerrar}>
                Entendido
              </Boton>
            ) : (
              <Boton funcion={() => setPaso(paso + 1)}>{paso === 0 ? "Empezar" : "Siguiente"}</Boton>
            )}
          </div>
        </Pie>
      }
    >
      <Cuerpo>
        <Ficha $color={p.color ?? COLOR_CATEGORIA_DEFECTO}>
          <div className={`cabeza ${actual.resalta.includes("nombre") ? "resaltado" : ""}`}>
            <span className="inicial">{p.nombre?.[0]?.toUpperCase()}</span>
            <div>
              <strong>{p.nombre}</strong>
              <div className="chips">
                <span
                  className={`chip categoria ${actual.resalta.includes("categoria") ? "resaltado" : ""} ${ejemplo && !propio("categoria") ? "sugerido" : ""}`}
                >
                  {p.categoria}
                </span>
                <span
                  className={`chip ${actual.resalta.includes("marca") ? "resaltado" : ""} ${ejemplo && !propio("marca") ? "sugerido" : ""}`}
                >
                  {p.marca}
                </span>
              </div>
            </div>
          </div>
          <div className="grid">
            <Campo campo="precio_compra" etiqueta="Precio de compra">
              {dinero(p.precio_compra)}
            </Campo>
            <Campo campo="precio_venta" etiqueta="Precio de venta">
              {dinero(p.precio_venta)}
            </Campo>
            <div className={`campo ${actual.resalta.includes("margen") ? "resaltado" : ""}`}>
              <span>Margen</span>
              <strong>{margen != null ? `${margen}%` : "—"}</strong>
            </div>
            <Campo campo="stock" etiqueta="Stock">
              {formatearNumero(p.stock)}
            </Campo>
            <Campo campo="stock_minimo" etiqueta="Stock mínimo">
              {formatearNumero(p.stock_minimo)}
            </Campo>
            <Campo campo="codigo_interno" etiqueta="Código interno">
              {p.codigo_interno}
            </Campo>
            <Campo campo="codigo_barras" etiqueta="Código de barras">
              {p.codigo_barras}
            </Campo>
          </div>
        </Ficha>

        <div className="explicacion" aria-live="polite">
          <h3>{actual.titulo}</h3>
          <p>{actual.texto}</p>
          {ejemplo && actual.resalta.some((c) => c !== "margen" && !propio(c)) && (
            <small>Los datos en gris no estaban en tu archivo: son un ejemplo de cómo quedarían.</small>
          )}
          {actual.ir && (
            <button
              type="button"
              className="ir"
              onClick={() => {
                cerrar();
                navigate(actual.ir.a);
              }}
            >
              {actual.ir.texto} <v.iconoflechaderecha />
            </button>
          )}
        </div>
      </Cuerpo>
    </Modal>
  );
}

const Cuerpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  .explicacion {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 120px;
    h3 {
      font-size: 1.05rem;
    }
    p {
      font-size: 0.9rem;
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.5;
    }
    small {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.textMuted};
      font-style: italic;
    }
  }
  .ir {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    border: none;
    background: none;
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
  }
`;

const Ficha = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radiusLg};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surfaceAlt};
  .resaltado {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
    background: ${({ theme }) => theme.primarySoft} !important;
  }
  .sugerido strong,
  .chip.sugerido {
    opacity: 0.45;
  }
  .cabeza {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px;
    border-radius: ${({ theme }) => theme.radius};
    transition: background 0.2s;
    > div {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    strong {
      font-size: 1.05rem;
      overflow-wrap: anywhere;
    }
  }
  .inicial {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 14px;
    background: color-mix(in srgb, ${({ $color }) => $color} 16%, transparent);
    color: ${({ $color }) => $color};
    font-weight: 700;
    font-size: 1.1rem;
  }
  .chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .chip {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.textMuted};
    &.categoria {
      border-color: transparent;
      color: ${({ $color }) => $color};
      background: color-mix(in srgb, ${({ $color }) => $color} 14%, transparent);
    }
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .campo {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    transition: background 0.2s;
    min-width: 0;
    span {
      font-size: 0.7rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    strong {
      font-size: 0.92rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

const Pie = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  .puntos {
    display: flex;
    gap: 6px;
    button {
      width: 8px;
      height: 8px;
      padding: 0;
      border: none;
      border-radius: 999px;
      background: ${({ theme }) => theme.border};
      cursor: pointer;
      transition: width 0.2s;
      &.activo {
        width: 22px;
        background: ${({ theme }) => theme.primary};
      }
    }
  }
  .botones {
    display: flex;
    gap: 8px;
  }
`;
