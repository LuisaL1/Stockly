import { useForm } from "react-hook-form";
import { useState } from "react";
import { InputText } from "../formularios/InputText";
import { Boton } from "../../atomos/Boton";
import { CampoContrasena } from "./CampoContrasena";
import { Alerta, Encabezado, Enlace, FormAuth, PieAuth, Separador } from "./EstilosAuth";
import { useAuthStore } from "../../../store/AuthStore";
import { traducirErrorAuth } from "../../../supabase/crudRegistro";
import { v } from "../../../styles/variables";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormIngresar({ irA, emailInicial = "" }) {
  const { signInWithEmail } = useAuthStore();
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: emailInicial } });

  async function ingresar({ email, pass }) {
    setError(null);
    const r = await signInWithEmail({ email: email.trim().toLowerCase(), pass });
    if (r.error) setError(traducirErrorAuth(r.error));
    // Si entra, AuthContext actualiza la sesión y la ruta redirige sola.
  }

  return (
    <>
      <Encabezado>
        <h1>Hola de nuevo.</h1>
        <p>Entra y mira cómo va tu negocio hoy.</p>
      </Encabezado>

      {error && (
        <Alerta role="alert">
          <v.iconostockminimo />
          {error}
        </Alerta>
      )}

      <FormAuth onSubmit={handleSubmit(ingresar)} noValidate>
        <InputText label="Correo electrónico" icono={<v.iconoemail />} error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="tu@empresa.com"
            {...register("email", {
              required: "Escribe tu correo",
              pattern: { value: EMAIL, message: "El correo no es válido" },
            })}
          />
        </InputText>
        <CampoContrasena
          autoComplete="current-password"
          error={errors.pass?.message}
          valor={watch("pass")}
          {...register("pass", { required: "Escribe tu contraseña" })}
        />
        <div className="fila-extra">
          <Enlace type="button" onClick={() => irA("recuperar", getValues("email"))}>
            ¿Olvidaste tu contraseña?
          </Enlace>
        </div>
        <Boton type="submit" tamano="lg" bloque cargando={isSubmitting} icono={<v.iconoflechaderecha />}>
          Ingresar
        </Boton>
      </FormAuth>

      <Separador>¿Nuevo en Stockly?</Separador>
      <Boton variante="secundario" tamano="lg" bloque icono={<v.iconoempresa />} funcion={() => irA("registrar")}>
        Crea tu empresa gratis
      </Boton>
      <PieAuth>¿Trabajas en una empresa que ya usa Stockly? Pide a tu administrador que te cree un usuario.</PieAuth>
    </>
  );
}
