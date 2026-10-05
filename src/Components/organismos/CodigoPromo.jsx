import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Swal from "sweetalert2";
import { Boton } from "../atomos/Boton";
import { CanjearCodigo } from "../../supabase/crudSuscripcion";
import { formatearFecha } from "../../utils/conversiones";
import { v } from "../../styles/variables";

// Canje de un código promocional (p. ej. Pro gratis por un mes). Una vez por empresa.
// codigoInicial: viene del registro; se canjea solo al cargar (si falla, queda escrito con el error).
export function CodigoPromo({ idEmpresa, estado, alCanjear, codigoInicial, alUsarCodigoInicial }) {
  const [codigo, setCodigo] = useState(codigoInicial?.toUpperCase() ?? "");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const canjearRef = useRef(null);
  const automatico = useRef(false);
  const visible = !!estado && !estado.promo_usada && !estado.plan_pagado;

  useEffect(() => {
    if (!codigoInicial || automatico.current || !estado || !idEmpresa) return;
    automatico.current = true;
    alUsarCodigoInicial?.();
    if (visible) canjearRef.current?.(codigoInicial);
    else
      Swal.fire({
        icon: "info",
        title: "No se activó el código",
        text: estado.promo_usada ? "Tu empresa ya usó un código promocional." : "Ya tienes un plan pagado activo. Puedes usar el código cuando termine.",
        confirmButtonColor: "#8800B3",
      });
  }, [codigoInicial, estado, idEmpresa, visible, alUsarCodigoInicial]);

  if (!visible) return null;

  async function canjear(e) {
    e?.preventDefault?.();
    await canjearCodigo(codigo);
  }

  async function canjearCodigo(valor) {
    if (!valor?.trim()) return;
    setTrabajando(true);
    setError(null);
    try {
      const r = await CanjearCodigo({ idEmpresa, codigo: valor });
      await alCanjear?.();
      setCodigo("");
      Swal.fire({
        icon: "success",
        title: `¡Tienes el plan ${r.plan} gratis!`,
        html: `Activo hasta el <b>${formatearFecha(r.hasta)}</b>.<br/><b>No se hará ningún cobro.</b> Al terminar pasas al plan Básico gratis con todos tus datos, y puedes comprar ${r.plan} cuando quieras.`,
        confirmButtonColor: "#8800B3",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  }

  canjearRef.current = canjearCodigo;

  return (
    <Formulario onSubmit={canjear}>
      <span className="icono">
        <v.iconoplan />
      </span>
      <label>
        ¿Tienes un código promocional?
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="STK-PRO-XXXXXX"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
        />
        {error && <small className="error">{error}</small>}
      </label>
      <Boton type="submit" variante="secundario" cargando={trabajando} disabled={!codigo.trim()}>
        Canjear
      </Boton>
    </Formulario>
  );
}

const Formulario = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px dashed ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  .icono {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
  }
  label {
    flex: 1 1 220px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  input {
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusSm};
    background: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    font-family: ui-monospace, monospace;
    letter-spacing: 0.04em;
  }
  .error {
    color: ${({ theme }) => theme.danger};
    font-weight: 500;
  }
`;
