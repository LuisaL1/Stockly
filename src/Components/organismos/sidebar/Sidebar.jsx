import styled from "styled-components";
import { Link, NavLink } from "react-router-dom";
import { NavGrupos } from "../../../utils/dataEstatica";
import { ToggleTema } from "../ToggleTema";
import { useAuthStore } from "../../../store/AuthStore";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useNovandraStore } from "../../../store/NovandraStore";
import { UserAuth } from "../../../context/contextoAuth";
import { usePlan } from "../../../hooks/usePlan";
import { esAdmin } from "../../../utils/permisos";
import { v } from "../../../styles/variables";

// Barra lateral. En escritorio se puede colapsar; en móvil funciona como cajón.
export function Sidebar({ abierto, setAbierto, movil = false, onNavegar }) {
  const { signOut } = useAuthStore();
  const { datausuario } = useUsuariosStore();
  const { dataempresa } = useEmpresaStore();
  const abrirNovandra = useNovandraStore((s) => s.abrir);
  const { user } = UserAuth();
  const { plan } = usePlan();
  const expandido = movil || abierto;

  const enlace = ({ icon, label, to }) => (
    <NavLink
      key={to}
      to={to}
      // "/ventas" no debe quedar activo en "/ventas/facturas"; los reportes sí tienen subrutas.
      end={to !== "/reportes"}
      className="enlace"
      onClick={onNavegar}
      title={expandido ? undefined : label}
    >
      <span className="icono">{icon}</span>
      <span className="texto">{label}</span>
    </NavLink>
  );

  return (
    <Container $expandido={expandido} $movil={movil}>
      <div className="marca">
        <img src={v.logo} alt="" />
        <strong className="texto">Stockly</strong>
      </div>

      <Link to="/configurar/empresa" className="empresa" onClick={onNavegar} title={dataempresa?.nombre}>
        <span className="empresa-icono">
          <v.iconoempresa />
        </span>
        <span className="texto">
          <strong>{dataempresa?.nombre ?? "Mi empresa"}</strong>
          <small>Plan {plan?.nombre ?? "Básico"}</small>
        </span>
      </Link>

      {!movil && (
        <button
          type="button"
          className="colapsar"
          onClick={() => setAbierto(!abierto)}
          aria-label={abierto ? "Contraer menú" : "Expandir menú"}
        >
          <v.iconoflechaderecha />
        </button>
      )}

      <nav>
        {NavGrupos.map((grupo) => (
          <div key={grupo.titulo} className="grupo">
            <span className="seccion">{grupo.titulo}</span>
            {grupo.enlaces.filter((e) => !e.soloAdmin || esAdmin(datausuario)).map(enlace)}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="novandra"
        onClick={() => {
          onNavegar?.();
          abrirNovandra();
        }}
        title="Pregúntale a Novandra"
      >
        <span className="icono">
          <v.icononovandra />
        </span>
        <span className="texto">
          <strong>Novandra</strong>
          <small>Tu asistente de operaciones</small>
        </span>
      </button>

      {expandido && plan?.id === "basico" && (
        <Link to="/configurar/plan" className="mejorar" onClick={onNavegar}>
          <v.iconoplan />
          <span>
            <strong>Pásate a Pro</strong>
            <small>Más bodegas, ventas ilimitadas y factura electrónica.</small>
          </span>
        </Link>
      )}

      <div className="pie">
        <ToggleTema compacto={!expandido} />
        <div className="usuario">
          <NavLink to="/perfil" className="perfil" onClick={onNavegar} title="Mi perfil">
            <span className="avatar">{(datausuario?.nombres || user?.email || "?").charAt(0).toUpperCase()}</span>
            <span className="texto">
              <strong>{datausuario?.nombres || user?.email}</strong>
              <small>{datausuario?.tipouser ? `${datausuario.tipouser} · Mi perfil` : "Mi perfil"}</small>
            </span>
          </NavLink>
          <button type="button" className="salir" onClick={signOut} title="Cerrar sesión" aria-label="Cerrar sesión">
            <v.iconoCerrarSesion />
          </button>
        </div>
      </div>
    </Container>
  );
}

const Container = styled.aside`
  position: ${({ $movil }) => ($movil ? "relative" : "fixed")};
  top: 0;
  left: 0;
  z-index: 50;
  height: 100vh;
  width: ${({ $expandido }) => ($expandido ? "260px" : "80px")};
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 14px;
  background: ${({ theme }) => theme.surface};
  border-right: 1px solid ${({ theme }) => theme.border};
  transition: width 0.2s ease;
  overflow-x: hidden;
  overflow-y: auto;

  .texto {
    display: ${({ $expandido }) => ($expandido ? "flex" : "none")};
    flex-direction: column;
    min-width: 0;
    white-space: nowrap;
    strong,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.75rem;
      font-weight: 500;
    }
  }

  .marca {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 8px 4px;
    img {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
    }
    strong {
      font-size: 1.2rem;
      letter-spacing: -0.03em;
    }
  }

  .empresa {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.surfaceAlt};
    border: 1px solid ${({ theme }) => theme.border};
    color: inherit;
    text-decoration: none;
    strong {
      font-size: 0.9rem;
    }
    &:hover {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .empresa-icono {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 18px;
  }

  .colapsar {
    position: fixed;
    top: 26px;
    left: ${({ $expandido }) => ($expandido ? "246px" : "66px")};
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
    transition: left 0.2s ease, transform 0.2s;
    transform: rotate(${({ $expandido }) => ($expandido ? "180deg" : "0deg")});
    box-shadow: ${({ theme }) => theme.shadow};
    &:hover {
      color: ${({ theme }) => theme.primary};
    }
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .grupo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .seccion {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.textMuted};
    padding: 10px 12px 4px;
    display: ${({ $expandido }) => ($expandido ? "block" : "none")};
  }

  .enlace {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    height: 40px;
    padding: 0 12px;
    border-radius: ${({ theme }) => theme.radiusSm};
    color: ${({ theme }) => theme.textMuted};
    text-decoration: none;
    font-weight: 500;
    font-size: 0.92rem;
    white-space: nowrap;
    .icono {
      display: flex;
      font-size: 19px;
      flex-shrink: 0;
    }
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.text};
    }
    &.active {
      background: ${({ theme }) => theme.primarySoft};
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
      &::before {
        content: "";
        position: absolute;
        left: -14px;
        top: 8px;
        bottom: 8px;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: ${({ theme }) => theme.primary};
      }
    }
  }

  .novandra {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: none;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.inkCard};
    color: ${({ theme }) => theme.inkText};
    cursor: pointer;
    text-align: left;
    .icono {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 10px;
      background: rgba(226, 164, 255, 0.16);
      color: ${({ theme }) => theme.accentLight};
      font-size: 18px;
    }
    small {
      color: ${({ theme }) => theme.inkMuted};
    }
    &:hover .icono {
      background: ${({ theme }) => theme.accentLight};
      color: ${({ theme }) => theme.ink};
    }
  }

  .mejorar {
    display: flex;
    gap: 10px;
    padding: 12px;
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.text};
    text-decoration: none;
    font-size: 0.8rem;
    > svg {
      flex-shrink: 0;
      font-size: 18px;
      color: ${({ theme }) => theme.primary};
      margin-top: 1px;
    }
    span {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    strong {
      color: ${({ theme }) => theme.primary};
      font-size: 0.85rem;
    }
    small {
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.35;
    }
  }

  .pie {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 10px;
    border-top: 1px solid ${({ theme }) => theme.border};
  }
  .usuario {
    display: flex;
    flex-direction: ${({ $expandido }) => ($expandido ? "row" : "column")};
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }
  .perfil {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px;
    border-radius: ${({ theme }) => theme.radiusSm};
    color: inherit;
    text-decoration: none;
    &:hover,
    &.active {
      background: ${({ theme }) => theme.surfaceAlt};
    }
    &.active .avatar {
      box-shadow: 0 0 0 2px ${({ theme }) => theme.primary};
    }
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ theme }) => theme.ink};
    color: ${({ theme }) => theme.inkText};
    font-weight: 700;
  }
  .salir {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: ${({ theme }) => theme.radiusSm};
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    cursor: pointer;
    font-size: 18px;
    &:hover {
      background: ${({ theme }) => theme.dangerSoft};
      color: ${({ theme }) => theme.danger};
    }
  }
`;
