import styled from "styled-components";
import { Link } from "react-router-dom";
import { Bancos, Franquicias, MetodosPago } from "../../../utils/dataEstatica";
import { normalizarPagos, pagoVacio } from "../../../utils/pagos";
import { v } from "../../../styles/variables";

// Cobro de la venta: un medio de pago o varios (pago mixto), con los datos de cada uno.
export function PanelPagos({ total, pagos, setPagos, wompiActivo, dinero }) {
  const mixto = pagos.length > 1;
  const lista = normalizarPagos(pagos, total);
  const asignado = lista.reduce((a, p) => a + p.monto, 0);
  const restante = Math.round((total - asignado) * 100) / 100;

  const cambiar = (i, cambios) => setPagos(pagos.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  const dividir = () =>
    setPagos([
      { ...pagos[0], monto: Math.round(total / 2) },
      { ...pagoVacio(pagos[0].metodo === "efectivo" ? "datafono" : "efectivo"), monto: total - Math.round(total / 2) },
    ]);
  const agregar = () => setPagos([...pagos, { ...pagoVacio("transferencia"), monto: Math.max(restante, 0) }]);
  const quitar = (i) => {
    const resto = pagos.filter((_, j) => j !== i);
    setPagos(resto.length ? resto : [pagoVacio()]);
  };

  return (
    <Container>
      <div className="encabezado">
        <span>Cómo paga</span>
        {!mixto ? (
          <button type="button" className="enlace" onClick={dividir} disabled={!(total > 0)}>
            Dividir el pago
          </button>
        ) : (
          <button type="button" className="enlace" onClick={() => setPagos([{ ...pagos[0], monto: total }])}>
            Un solo medio
          </button>
        )}
      </div>

      {lista.map((p, i) => {
        const cambio = p.metodo === "efectivo" && p.recibido !== "" ? Number(p.recibido) - p.monto : null;
        return (
          <div key={i} className={`pago ${mixto ? "mixto" : ""}`}>
            <div className="metodos" role="radiogroup" aria-label={`Medio de pago ${i + 1}`}>
              {MetodosPago.map((m) => {
                const bloqueado = m.id === "link_pago" && !wompiActivo;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={p.metodo === m.id}
                    disabled={bloqueado}
                    title={bloqueado ? "Configura Wompi en Configuración → Facturación" : undefined}
                    onClick={() => cambiar(i, { metodo: m.id })}
                  >
                    <m.icono />
                    {m.descripcion}
                  </button>
                );
              })}
            </div>

            <div className="campos">
              {mixto && (
                <label>
                  Valor
                  <input
                    type="number"
                    min="0"
                    value={pagos[i].monto}
                    onChange={(e) => cambiar(i, { monto: e.target.value })}
                  />
                </label>
              )}
              {p.metodo === "efectivo" && (
                <label>
                  Recibe
                  <input
                    type="number"
                    min="0"
                    placeholder={String(p.monto)}
                    value={p.recibido}
                    onChange={(e) => cambiar(i, { recibido: e.target.value })}
                  />
                </label>
              )}
              {p.metodo === "datafono" && (
                <>
                  <label>
                    Franquicia
                    <select value={p.franquicia} onChange={(e) => cambiar(i, { franquicia: e.target.value })}>
                      <option value="">Selecciona…</option>
                      {Franquicias.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    N.º aprobación
                    <input
                      inputMode="numeric"
                      placeholder="Del voucher"
                      value={p.referencia}
                      onChange={(e) => cambiar(i, { referencia: e.target.value })}
                    />
                  </label>
                </>
              )}
              {p.metodo === "transferencia" && (
                <label>
                  Banco
                  <select value={p.banco} onChange={(e) => cambiar(i, { banco: e.target.value })}>
                    <option value="">Selecciona…</option>
                    {Bancos.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
              )}
              {["transferencia", "nequi", "daviplata"].includes(p.metodo) && (
                <label>
                  Referencia
                  <input placeholder="Opcional" value={p.referencia} onChange={(e) => cambiar(i, { referencia: e.target.value })} />
                </label>
              )}
              {mixto && (
                <button type="button" className="quitar" onClick={() => quitar(i)} aria-label="Quitar este pago">
                  <v.iconocerrar />
                </button>
              )}
            </div>

            {cambio != null && (
              <p className={`nota ${cambio < 0 ? "error" : "exito"}`}>
                {cambio < 0 ? `Faltan ${dinero(-cambio)}` : `Cambio: ${dinero(cambio)}`}
              </p>
            )}
            {p.metodo === "link_pago" && (
              <p className="nota">Al cobrar se crea un link de Wompi (tarjeta, PSE, Nequi) para enviarlo por WhatsApp. La venta queda pendiente hasta que el cliente pague.</p>
            )}
            {p.metodo === "credito" && <p className="nota">La venta queda pendiente. Podrás registrar los abonos desde Facturas.</p>}
          </div>
        );
      })}

      {mixto && (
        <div className="pie">
          <span className={Math.abs(restante) > 1 ? "falta" : "listo"}>
            {Math.abs(restante) <= 1 ? "Pagos completos" : restante > 0 ? `Falta asignar ${dinero(restante)}` : `Sobran ${dinero(-restante)}`}
          </span>
          <button type="button" className="enlace" onClick={agregar}>
            + Otro medio
          </button>
        </div>
      )}
      {!wompiActivo && (
        <p className="ayuda">
          ¿Quieres cobrar con link de pago? <Link to="/configurar/facturacion">Conecta Wompi</Link>.
        </p>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    span {
      font-size: 0.75rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .enlace {
    border: none;
    background: none;
    padding: 0;
    color: ${({ theme }) => theme.primary};
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  .pago {
    display: flex;
    flex-direction: column;
    gap: 8px;
    &.mixto {
      padding: 10px;
      border-radius: ${({ theme }) => theme.radius};
      border: 1px solid ${({ theme }) => theme.border};
    }
  }
  .metodos {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 7px 2px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radius};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      line-height: 1.15;
      svg {
        font-size: 17px;
      }
      &[aria-checked="true"] {
        border-color: ${({ theme }) => theme.primary};
        background: ${({ theme }) => theme.primarySoft};
        color: ${({ theme }) => theme.primary};
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
  .campos {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 8px;
    &:empty {
      display: none;
    }
    label {
      flex: 1 1 120px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    input,
    select {
      height: 36px;
      padding: 0 10px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radiusSm};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.88rem;
    }
  }
  .quitar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.dangerSoft};
    color: ${({ theme }) => theme.danger};
    cursor: pointer;
  }
  .nota {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.textMuted};
    &.exito {
      color: ${({ theme }) => theme.success};
      font-weight: 700;
      font-size: 0.9rem;
    }
    &.error {
      color: ${({ theme }) => theme.danger};
      font-weight: 600;
    }
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 600;
    .falta {
      color: ${({ theme }) => theme.warning};
    }
    .listo {
      color: ${({ theme }) => theme.success};
    }
  }
  .ayuda {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.textMuted};
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
`;
