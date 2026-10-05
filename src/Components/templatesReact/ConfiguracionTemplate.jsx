import styled from "styled-components";
import { Link } from "react-router-dom";
import { LuLock } from "react-icons/lu";
import { PaginaTemplate } from "./PaginaTemplate";
import { DataModulosConfiguracion } from "../../utils/dataEstatica";
import { esAdmin, tienePermiso } from "../../utils/permisos";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { v } from "../../styles/variables";
import { BannerDemo } from "../moleculas/BannerDemo";

export function ConfiguracionTemplate() {
  const { datapermisos, datausuario } = useUsuariosStore();

  return (
    <PaginaTemplate titulo="Configuración" descripcion="Administra los catálogos y ajustes de tu empresa.">
      <BannerDemo />
      <Grid>
        {DataModulosConfiguracion.map((item) => {
          const habilitado = item.soloAdmin ? esAdmin(datausuario) : tienePermiso(datapermisos, item.modulo);
          const contenido = (
            <>
              <span className="icono">{item.icono}</span>
              <div className="texto">
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
              </div>
              <span className="estado">
                {habilitado ? <v.iconoflechaderecha /> : <LuLock title="Sin permiso" />}
              </span>
            </>
          );
          return habilitado ? (
            <Link key={item.link} to={item.link} className={`tarjeta ${item.destacado ? "destacada" : ""}`}>
              {contenido}
            </Link>
          ) : (
            <div key={item.link} className="tarjeta bloqueada" title="No tienes permiso para este módulo">
              {contenido}
            </div>
          );
        })}
      </Grid>
    </PaginaTemplate>
  );
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  .tarjeta {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 22px;
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusXl};
    box-shadow: ${({ theme }) => theme.shadow};
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  a.tarjeta:hover {
    border-color: ${({ theme }) => theme.primary};
    box-shadow: ${({ theme }) => theme.shadowLg};
    .estado {
      color: ${({ theme }) => theme.primary};
    }
  }
  .destacada {
    grid-column: 1 / -1;
    background: ${({ theme }) => theme.inkCard};
    border-color: ${({ theme }) => theme.inkBorder};
    color: ${({ theme }) => theme.inkText};
    .icono {
      background: ${({ theme }) => theme.accentLight};
      color: ${({ theme }) => theme.ink};
    }
    .texto p,
    .estado {
      color: ${({ theme }) => theme.inkMuted};
    }
    @media (min-width: 900px) {
      grid-column: span 2;
    }
  }
  a.destacada:hover {
    border-color: ${({ theme }) => theme.accentLight};
    .estado {
      color: ${({ theme }) => theme.accentLight};
    }
  }
  .icono {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    flex-shrink: 0;
    font-size: 22px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
  }
  .texto {
    flex: 1;
    min-width: 0;
    h3 {
      font-size: 1rem;
      font-weight: 600;
    }
    p {
      font-size: 0.85rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .estado {
    color: ${({ theme }) => theme.textMuted};
    font-size: 18px;
    display: flex;
  }
  .bloqueada {
    opacity: 0.6;
    cursor: not-allowed;
    .icono {
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;
