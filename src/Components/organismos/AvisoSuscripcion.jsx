import { useState } from "react";
import styled from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { usePlan } from "../../hooks/usePlan";
import { esAdmin } from "../../utils/permisos";
import { v } from "../../styles/variables";

const hoy = () => new Date().toISOString().slice(0, 10);
const claveOculto = (tipo) => `stockly_aviso_plan_${tipo}_${hoy()}`;
const leer = (k) => {
  try {
    return localStorage.getItem(k) === "1";
  } catch {
    return false;
  }
};

// Aviso para el dueño cuando la prueba o el plan están por vencer o ya vencieron.
export function AvisoSuscripcion() {
  const { datausuario } = useUsuariosStore();
  const { estado } = usePlan();
  const { pathname } = useLocation();
  const [, refrescar] = useState(0);
  if (!esAdmin(datausuario) || !estado || pathname.startsWith("/configurar/plan")) return null;

  const descuento = estado.primera_compra ? Number(estado.descuento_primera_compra ?? 0) : 0;
  let aviso = null;
  if (estado.en_prueba && estado.dias_restantes <= 7) {
    aviso = {
      tipo: "prueba",
      tono: "advertencia",
      texto: `Tu prueba de Enterprise termina en ${estado.dias_restantes} día${estado.dias_restantes === 1 ? "" : "s"}. No te cobraremos nada.`,
      extra: `Al terminar pasas solo al plan Básico gratis. Puedes comprar Enterprise cuando quieras${descuento ? ` con ${descuento}% de descuento en tu primera compra` : ""}.`,
      boton: "Ver planes",
    };
  } else if (estado.promo && estado.dias_restantes <= 5) {
    aviso = {
      tipo: "promo",
      tono: "advertencia",
      texto: `Tu ${estado.plan_nombre ?? "plan"} gratis termina en ${estado.dias_restantes} día${estado.dias_restantes === 1 ? "" : "s"}. No se hará ningún cobro.`,
      extra: `Al terminar pasas solo al Básico gratis con todos tus datos. Puedes comprar tu plan cuando quieras${descuento ? ` con ${descuento}% de descuento en tu primera compra` : ""}.`,
      boton: "Ver planes",
    };
  } else if (estado.plan_pagado && estado.dias_restantes <= 5) {
    aviso = {
      tipo: "vence",
      tono: "advertencia",
      texto: `Tu plan vence en ${estado.dias_restantes} día${estado.dias_restantes === 1 ? "" : "s"}.`,
      extra: "Renuévalo para no pasar al plan Básico.",
      boton: "Renovar",
    };
  } else if (estado.vencido) {
    // Si viene de la prueba (sin plan pagado antes), se aclara que no hubo cobro.
    const terminoPrueba = !!estado.prueba_hasta && !estado.vence_en;
    aviso = {
      tipo: "vencido",
      tono: "info",
      texto: terminoPrueba ? "Tu prueba de Enterprise terminó y no se hizo ningún cobro. Estás en el plan Básico gratis." : "Estás en el plan Básico gratis.",
      extra: `Tus datos están intactos. Compra Enterprise o Pro cuando quieras${descuento ? ` con ${descuento}% de descuento en tu primera compra` : ""}.`,
      boton: "Elegir plan",
    };
  }
  if (!aviso || leer(claveOculto(aviso.tipo))) return null;

  const ocultar = () => {
    try {
      localStorage.setItem(claveOculto(aviso.tipo), "1");
    } catch {
      // Sin almacenamiento: se oculta hasta recargar.
    }
    refrescar((n) => n + 1);
  };

  return (
    <Container $tono={aviso.tono} role="status">
      <v.iconoplan className="icono" />
      <p>
        <strong>{aviso.texto}</strong> {aviso.extra}
      </p>
      <Link to="/configurar/plan">{aviso.boton}</Link>
      <button type="button" onClick={ocultar} aria-label="Ocultar aviso">
        <v.iconocerrar />
      </button>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radiusLg};
  background: ${({ theme, $tono }) => ($tono === "advertencia" ? theme.warningSoft : theme.primarySoft)};
  .icono {
    font-size: 20px;
    flex-shrink: 0;
    color: ${({ theme, $tono }) => ($tono === "advertencia" ? theme.warning : theme.primary)};
  }
  p {
    flex: 1 1 260px;
    font-size: 0.9rem;
  }
  a {
    padding: 8px 16px;
    border-radius: 999px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-weight: 600;
    font-size: 0.85rem;
    text-decoration: none;
    &:hover {
      background: ${({ theme }) => theme.primaryHover};
    }
  }
  button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
  }
`;
