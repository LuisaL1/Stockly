import { useState } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Boton } from "../Components/atomos/Boton";
import { CampoContrasena } from "../Components/organismos/auth/CampoContrasena";
import { Alerta, Encabezado, FormAuth } from "../Components/organismos/auth/EstilosAuth";
import { UserAuth } from "../context/contextoAuth";
import { CambiarContrasena } from "../supabase/crudRegistro";
import { ActivarInvitacion } from "../supabase/crudUsuarios";
import { notificarExito } from "../utils/notificaciones";
import { v } from "../styles/variables";

// Destino del enlace de "recuperar contraseña": Supabase abre la sesión desde la URL.
export function Restablecer() {
  const { user } = UserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Llega desde la invitación de su equipo: verifica el correo y crea su primera contraseña.
  const bienvenida = params.get("bienvenida") === "1" || user?.user_metadata?.invitado === true;
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  async function guardar({ pass }) {
    setError(null);
    try {
      await CambiarContrasena(pass);
      if (bienvenida) await ActivarInvitacion().catch(() => {});
      notificarExito(bienvenida ? "¡Listo! Tu cuenta está activa" : "Contraseña actualizada");
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Container>
      <div className="tarjeta">
        <Encabezado>
          <span className="icono">
            <v.iconopass />
          </span>
          <h1>{bienvenida ? "Te damos la bienvenida a Stockly" : "Crea una nueva contraseña"}</h1>
          <p>
            {user
              ? bienvenida
                ? `Tu correo ${user.email} quedó verificado. Crea tu contraseña para entrar.`
                : `Para ${user.email}`
              : "Abre esta página desde el enlace que te enviamos por correo."}
          </p>
        </Encabezado>
        {error && <Alerta role="alert">{error}</Alerta>}
        {user ? (
          <FormAuth onSubmit={handleSubmit(guardar)} noValidate>
            <CampoContrasena
              label={bienvenida ? "Tu contraseña" : "Nueva contraseña"}
              medidor
              valor={watch("pass")}
              autoComplete="new-password"
              error={errors.pass?.message}
              {...register("pass", {
                required: "Escribe la nueva contraseña",
                minLength: { value: 8, message: "Mínimo 8 caracteres" },
                validate: (t) => (/[A-Za-z]/.test(t) && /\d/.test(t)) || "Combina letras y números",
              })}
            />
            <CampoContrasena
              label="Confírmala"
              autoComplete="new-password"
              error={errors.confirmar?.message}
              {...register("confirmar", { validate: (t) => t === watch("pass") || "Las contraseñas no coinciden" })}
            />
            <Boton type="submit" tamano="lg" bloque cargando={isSubmitting} icono={<v.iconoguardar />}>
              {bienvenida ? "Crear contraseña y entrar" : "Guardar contraseña"}
            </Boton>
          </FormAuth>
        ) : (
          <Boton tamano="lg" bloque funcion={() => navigate("/login")}>
            Ir a iniciar sesión
          </Boton>
        )}
      </div>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: ${({ theme }) => theme.bg};
  .tarjeta {
    width: 100%;
    max-width: 420px;
    padding: 32px 28px;
    border-radius: ${({ theme }) => theme.radiusXl};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
`;
