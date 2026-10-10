import { useEffect, useState } from "react";
import styled from "styled-components";
import { useQueryClient } from "@tanstack/react-query";
import { Boton } from "../atomos/Boton";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { useUnidades } from "../../hooks/useUnidades";
import { ConfigurarUnidades } from "../../supabase/crudUnidades";
import { UNIDADES } from "../../utils/unidades";
import { v } from "../../styles/variables";

// Unidades con las que trabaja el inventario de la empresa (preajustadas por sector) y la predeterminada.
export function UnidadesEmpresa() {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const { activas, predeterminada, personalizadas, cargando } = useUnidades();
  const [elegidas, setElegidas] = useState(new Set());
  const [pred, setPred] = useState("und");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setElegidas(new Set(activas.map((u) => u.id)));
    setPred(predeterminada);
  }, [activas, predeterminada]);

  const alternar = (id) => {
    const s = new Set(elegidas);
    s.has(id) ? s.delete(id) : s.add(id);
    if (!s.size) return;
    setElegidas(s);
    if (!s.has(pred)) setPred([...s][0]);
  };
  const guardar = async () => {
    setGuardando(true);
    const r = await ConfigurarUnidades(dataempresa.id, [...elegidas], pred);
    setGuardando(false);
    if (r) queryClient.invalidateQueries({ queryKey: ["unidades empresa"] });
  };
  const grupos = [
    ["Por piezas", UNIDADES.filter((u) => !u.decimales)],
    ["A granel: peso, volumen y medida (admiten decimales)", UNIDADES.filter((u) => u.decimales)],
  ];

  return (
    <Caja>
      <header>
        <v.iconostock />
        <div>
          <strong>Unidades de tu inventario</strong>
          <small>
            Elige cómo cuentas o mides lo que vendes: por unidad, par, docena o a granel en gramos, mililitros, metros... La presentación
            (frasco, caja, bolsa...) y su contenido se eligen en cada producto. Así se ve en la caja, el kardex, las facturas y Novandra.
            {!personalizadas && dataempresa?.sector ? ` Preajustadas para “${dataempresa.sector}”.` : ""}
          </small>
        </div>
      </header>
      {grupos.map(([titulo, lista]) => (
        <div className="grupo" key={titulo}>
          <span className="titulo">{titulo}</span>
          <div className="chips">
            {lista.map((u) => (
              <label key={u.id} className={elegidas.has(u.id) ? "si" : ""}>
                <input type="checkbox" checked={elegidas.has(u.id)} onChange={() => alternar(u.id)} disabled={cargando} />
                {u.plural} <em>{u.abrev}</em>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="pie">
        <label>
          Unidad para productos nuevos
          <select value={pred} onChange={(e) => setPred(e.target.value)}>
            {UNIDADES.filter((u) => elegidas.has(u.id)).map((u) => (
              <option key={u.id} value={u.id}>
                {u.plural} ({u.abrev})
              </option>
            ))}
          </select>
        </label>
        <Boton icono={<v.iconoguardar />} cargando={guardando} funcion={guardar}>
          Guardar unidades
        </Boton>
      </div>
    </Caja>
  );
}

const Caja = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  box-shadow: ${({ theme }) => theme.shadow};
  header {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    svg {
      flex: none;
      font-size: 22px;
      color: ${({ theme }) => theme.primary};
      margin-top: 2px;
    }
    strong {
      display: block;
      font-size: 1.02rem;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.45;
    }
  }
  .grupo .titulo {
    display: block;
    margin-bottom: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.textMuted};
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chips label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.border};
    font-size: 0.9rem;
    cursor: pointer;
    input {
      accent-color: ${({ theme }) => theme.primary};
    }
    em {
      font-style: normal;
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.8rem;
    }
    &.si {
      border-color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.primarySoft};
    }
  }
  .pie {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      color: ${({ theme }) => theme.textMuted};
    }
    select {
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid ${({ theme }) => theme.border};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font: inherit;
      min-width: 220px;
    }
  }
`;
