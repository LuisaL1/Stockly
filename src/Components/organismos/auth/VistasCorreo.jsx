import { useState } from "react";
import { useForm } from "react-hook-form";
import { InputText } from "../formularios/InputText";
import { Boton } from "../../atomos/Boton";
import { Alerta, Encabezado, Enlace, FormAuth, PieAuth } from "./EstilosAuth";
import { EnviarRecuperacion, ReenviarConfirmacion } from "../../../supabase/crudRegistro";
import { v } from "../../../styles/variables";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Después de registrarse, cuando el proyecto exige confirmar el correo.
export function VistaVerificar({ email, irA }) {
  const [estado, setEstado] = useState(null); // { tipo, texto }
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    try {
      await ReenviarConfirmacion(email);
      setEstado({ tipo: "exito", texto: "Te enviamos un nuevo correo de confirmación." });
    } catch (e) {
      setEstado({ tipo: "error", texto: e.message });
    }
    setEnviando(false);
  }

  return (
    <>
      <Encabezado>
        <span className="icono">
          <v.iconoemail />
        </span>
        <h1>Revisa tu correo</h1>
        <p>
          Enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo para activar tu cuenta; tu empresa
          quedará lista apenas ingreses.
        </p>
      </Encabezado>
      {estado && <Alerta $tipo={estado.tipo}>{estado.texto}</Alerta>}
      <Boton tamano="lg" bloque funcion={() => irA("ingresar", email)} icono={<v.iconoflechaderecha />}>
        Ya confirmé, ingresar
      </Boton>
      <PieAuth>
        ¿No te llegó? Revisa la carpeta de spam o{" "}
        <Enlace type="button" onClick={reenviar} disabled={enviando}>
          {enviando ? "reenviando…" : "reenvía el correo"}
        </Enlace>
        .
      </PieAuth>
    </>
  );
}

// Solicitud del enlace para restablecer la contraseña.
export function FormRecuperar({ irA, emailInicial = "" }) {
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: emailInicial } });

  async function enviar({ email }) {
    setError(null);
    const correo = email.trim().toLowerCase();
    try {
      await EnviarRecuperacion(correo);
      setEnviado(correo);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <>
      <Encabezado>
        <span className="icono">
          <v.iconopass />
        </span>
        <h1>Recupera tu contraseña</h1>
        <p>Te enviaremos un enlace para crear una nueva.</p>
      </Encabezado>
      {enviado ? (
        <Alerta $tipo="exito">
          <v.iconocheck />
          Si existe una cuenta con {enviado}, en unos minutos te llegará el enlace.
        </Alerta>
      ) : (
        error && <Alerta role="alert">{error}</Alerta>
      )}
      <FormAuth onSubmit={handleSubmit(enviar)} noValidate>
        <InputText label="Correo electrónico" icono={<v.iconoemail />} error={errors.email?.message}>
          <input
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="tu@empresa.com"
            {...register("email", {
              required: "Escribe tu correo",
              pattern: { value: EMAIL, message: "El correo no es válido" },
            })}
          />
        </InputText>
        <Boton type="submit" tamano="lg" bloque cargando={isSubmitting} icono={<v.iconoenviar />}>
          Enviar enlace
        </Boton>
      </FormAuth>
      <PieAuth>
        <Enlace type="button" onClick={() => irA("ingresar")}>
          ← Volver a iniciar sesión
        </Enlace>
      </PieAuth>
    </>
  );
}
