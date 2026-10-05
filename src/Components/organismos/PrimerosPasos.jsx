import { useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { usePlan } from "../../hooks/usePlan";
import { MostrarConfigFacturacion } from "../../supabase/crudFacturacion";
import { esAdmin } from "../../utils/permisos";
import { v } from "../../styles/variables";

const clave = (id) => `stockly_primeros_pasos_${id}`;
const leerOculto = (id) => {
  try {
    return localStorage.getItem(clave(id)) === "1";
  } catch {
    return false;
  }
};

// Lista de primeros pasos de una empresa nueva; cada paso se marca solo con los datos reales.
export function PrimerosPasos({ tieneVentas }) {
  const { dataempresa } = useEmpresaStore();
  const { datausuario } = useUsuariosStore();
  const { uso, cargando } = usePlan();
  const id = dataempresa?.id;
  const [oculto, setOculto] = useState(() => leerOculto(id));
  const cfg = useQuery({ queryKey: ["config facturacion", id], queryFn: () => MostrarConfigFacturacion(id), enabled: !!id });

  if (!esAdmin(datausuario) || oculto || cargando || cfg.isLoading) return null;
  const c = cfg.data ?? {};
  const pasos = [
    { texto: "Sube tus productos", hecho: Number(uso.productos) > 0, a: "/configurar/datos" },
    { texto: "Pon tu logo y tus datos", hecho: !!c.logo_url || !!dataempresa?.nit, a: "/configurar/empresa" },
    { texto: "Configura cómo te pagan", hecho: !!c.nit || !!c.breb_llave, a: "/configurar/facturacion" },
    { texto: "Haz tu primera venta", hecho: tieneVentas || Number(uso.ventas_mes) > 0, a: "/ventas" },
    { texto: "Invita a tu equipo", hecho: Number(uso.usuarios) > 1, a: "/configurar/usuarios" },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;

  const ocultar = () => {
    try {
      localStorage.setItem(clave(id), "1");
    } catch {
      // Sin almacenamiento: se oculta solo en esta visita.
    }
    setOculto(true);
  };

  return (
    <Container aria-label="Primeros pasos">
      <header>
        <div>
          <strong>Deja tu negocio listo</strong>
          <span>
            {hechos} de {pasos.length} pasos
          </span>
        </div>
        <div className="barra" aria-hidden>
          <span style={{ width: `${(hechos / pasos.length) * 100}%` }} />
        </div>
        <button type="button" className="cerrar" onClick={ocultar} aria-label="Ocultar primeros pasos" title="Ocultar">
          <v.iconocerrar />
        </button>
      </header>
      <ol>
        {pasos.map((p, i) => (
          <li key={p.texto} className={p.hecho ? "hecho" : ""}>
            <Link to={p.a}>
              <span className="marca">{p.hecho ? <v.iconolisto /> : i + 1}</span>
              <span className="texto">{p.texto}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Container>
  );
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    > div:first-child {
      display: flex;
      flex-direction: column;
      span {
        font-size: 0.8rem;
        color: ${({ theme }) => theme.textMuted};
      }
    }
  }
  .barra {
    flex: 1;
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.surfaceAlt};
    border: 1px solid ${({ theme }) => theme.border};
    overflow: hidden;
    span {
      display: block;
      height: 100%;
      background: ${({ theme }) => theme.primary};
      transition: width 0.3s;
    }
  }
  .cerrar {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  }
  ol {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 8px;
  }
  li a {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 100%;
    padding: 12px;
    border-radius: ${({ theme }) => theme.radius};
    border: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.text};
    text-decoration: none;
    font-size: 0.86rem;
    font-weight: 600;
    &:hover {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .marca {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 8px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 0.78rem;
    font-weight: 700;
  }
  li.hecho a {
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.textMuted};
    .texto {
      text-decoration: line-through;
    }
    .marca {
      background: ${({ theme }) => theme.success};
      color: #ffffff;
    }
  }
`;
