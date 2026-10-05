import { AvisoSuscripcion } from "../organismos/AvisoSuscripcion";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Outlet, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "../organismos/sidebar/Sidebar";
import { MenuHambur } from "../organismos/MenuHambur";
import { BarraSuperior } from "../organismos/BarraSuperior";
import { PanelNovandra } from "../organismos/novandra/PanelNovandra";
import { useNovandraStore } from "../../store/NovandraStore";
import { SpinnerLoader } from "../moleculas/SpinnerLoader";
import { ErrorMolecula } from "../moleculas/ErrorMolecula";
import { UserAuth } from "../../context/contextoAuth";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { Boton } from "../atomos/Boton";
import { useAuthStore } from "../../store/AuthStore";
import { Device } from "../../styles/breackpoints";
import { CompletarEmpresa } from "../organismos/auth/CompletarEmpresa";
import { CompletarRegistro } from "../../supabase/crudRegistro";
import { supabase } from "../../supabase/supabase.config";

// Estructura de la app autenticada: carga usuario, empresa y permisos una sola vez.
export function Layout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(true);
  const { user } = UserAuth();
  const { MostrarUsuarios, MostrarPermisos } = useUsuariosStore();
  const { MostrarEmpresa } = useEmpresaStore();
  const { signOut } = useAuthStore();
  const setContextoNovandra = useNovandraStore((s) => s.setContexto);
  const queryClient = useQueryClient();

  // Datos del registro guardados en la cuenta: si el proyecto exige confirmar el correo,
  // la empresa se crea aquí, en el primer ingreso.
  const registroPendiente = user?.user_metadata?.registro;
  // Si el registro automático falla (p. ej. falta un dato), se muestra el formulario para completarlo.
  const intentarRegistro = async () => {
    try {
      await CompletarRegistro(registroPendiente);
    } catch (e) {
      console.warn("[Registro] No se pudo completar automáticamente:", e.message);
    }
  };

  const usuario = useQuery({
    queryKey: ["usuario actual", user?.id],
    queryFn: async () => {
      let perfil = await MostrarUsuarios();
      if (!perfil && registroPendiente) {
        await intentarRegistro();
        perfil = await MostrarUsuarios();
      }
      return perfil ?? null;
    },
  });
  const idusuario = usuario.data?.id;

  const empresa = useQuery({
    queryKey: ["empresa", idusuario],
    queryFn: async () => {
      let datos = await MostrarEmpresa({ idusuario });
      if (!datos && registroPendiente) {
        await intentarRegistro();
        datos = await MostrarEmpresa({ idusuario });
      }
      return datos ?? null;
    },
    enabled: !!idusuario,
  });
  useQuery({
    queryKey: ["permisos", idusuario],
    queryFn: () => MostrarPermisos({ id_usuario: idusuario }),
    // Después de la empresa: si el registro se completó aquí, los permisos ya existen.
    enabled: !!empresa.data,
  });

  const datosEmpresa = empresa.data;
  useEffect(() => {
    if (datosEmpresa) {
      setContextoNovandra({
        idEmpresa: datosEmpresa.id,
        empresa: datosEmpresa.nombre,
        moneda: datosEmpresa.simbolomoneda,
      });
    }
  }, [datosEmpresa, setContextoNovandra]);

  // Si al registrarse eligió un plan de pago (o la prueba de Enterprise), al entrar por primera vez se le lleva a pagarlo.
  const navigate = useNavigate();
  const planRegistro = registroPendiente?.plan;
  const codigoRegistro = registroPendiente?.codigo;
  const pagoPendiente =
    !!datosEmpresa && (codigoRegistro || (planRegistro && planRegistro !== "basico")) && !user?.user_metadata?.pago_inicial;
  useEffect(() => {
    if (!pagoPendiente) return;
    // Se marca primero en la cuenta para no volver a redirigir aunque cancele el pago.
    supabase.auth.updateUser({ data: { pago_inicial: "ofrecido" } }).finally(() => {
      const ciclo = registroPendiente?.ciclo === "anual" ? "anual" : "mensual";
      // "prueba_enterprise": abre el registro de la tarjeta para la prueba de 7 días (sin cobro).
      // Código promocional del registro: se activa en Plan y suscripción (tiene prioridad).
      if (codigoRegistro) navigate(`/configurar/plan?codigo=${encodeURIComponent(codigoRegistro)}`, { replace: true });
      else if (planRegistro === "prueba_enterprise") navigate("/configurar/plan?prueba=1", { replace: true });
      else navigate(`/configurar/plan?comprar=${encodeURIComponent(planRegistro)}&ciclo=${ciclo}`, { replace: true });
    });
  }, [pagoPendiente, planRegistro, codigoRegistro, registroPendiente?.ciclo, navigate]);

  if (usuario.isLoading || (idusuario && empresa.isLoading)) return <SpinnerLoader pantallaCompleta />;

  // Cuenta sin perfil o sin empresa: se completa aquí en lugar de mostrar un error.
  if (!usuario.error && !empresa.error && (!usuario.data || !empresa.data)) {
    return (
      <CompletarEmpresa
        email={user?.email}
        nombres={usuario.data?.nombres ?? user?.user_metadata?.nombres}
        onSalir={signOut}
        onListo={() => queryClient.invalidateQueries()}
      />
    );
  }

  const error = usuario.error ?? empresa.error;
  if (error) {
    return (
      <Centro>
        <ErrorMolecula mensaje={error.message} reintentar={() => window.location.reload()} />
        <Boton variante="fantasma" funcion={signOut}>
          Cerrar sesión
        </Boton>
      </Centro>
    );
  }

  return (
    <Container $abierto={sidebarAbierto}>
      <div className="lateral">
        <Sidebar abierto={sidebarAbierto} setAbierto={setSidebarAbierto} />
      </div>
      <div className="movil">
        <MenuHambur />
      </div>
      <main>
        <div className="superior">
          <BarraSuperior />
        </div>
        <AvisoSuscripcion />
        <Outlet />
      </main>
      <PanelNovandra />
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  .lateral,
  .superior {
    display: none;
  }
  main {
    padding: 20px 16px 40px;
    max-width: 1360px;
    margin: 0 auto;
  }
  @media ${Device.laptop} {
    padding-left: ${({ $abierto }) => ($abierto ? "260px" : "80px")};
    transition: padding-left 0.2s ease;
    .lateral,
    .superior {
      display: block;
    }
    .movil {
      display: none;
    }
    main {
      padding: 22px 40px 48px;
    }
  }
`;

const Centro = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
