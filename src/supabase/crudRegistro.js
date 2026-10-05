import { supabase } from "./supabase.config";

// Mensajes de Supabase Auth en español.
export function traducirErrorAuth(error) {
  const msg = error?.message?.toLowerCase() ?? "";
  if (msg.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (msg.includes("email not confirmed")) return "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  if (msg.includes("password should be") || msg.includes("weak password"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
  if (msg.includes("fetch") || msg.includes("network")) return "No hay conexión con el servidor. Intenta de nuevo.";
  return error?.message ?? "Algo salió mal. Intenta de nuevo.";
}

let bienvenidaPedida = false;

// Crea (o completa) el perfil, la empresa, los permisos y el plan del usuario en sesión.
export async function CompletarRegistro(datos) {
  const { data, error } = await supabase.rpc("stockly_completar_registro", { _datos: datos });
  if (error) throw new Error(error.message);
  // Correo de bienvenida con los próximos pasos (el servidor lo envía una sola vez por empresa;
  // aquí también se pide una sola vez por sesión, aunque el registro se complete desde dos lugares).
  if (!bienvenidaPedida) {
    bienvenidaPedida = true;
    supabase.functions.invoke("bienvenida", { body: { origen: window.location.origin } }).catch(() => {});
  }
  return data;
}

// Crea la cuenta. Los datos del negocio viajan en la cuenta para completar el
// registro en el primer ingreso si el proyecto exige confirmar el correo.
// Devuelve { confirmarCorreo: boolean }.
export async function RegistrarCuenta({ email, pass, registro }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: { nombres: registro.nombres, registro },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw new Error(traducirErrorAuth(error));
  // Supabase no avisa si el correo ya existe (por privacidad): devuelve un usuario sin identidades.
  if (data.user && !data.user.identities?.length) {
    throw new Error(traducirErrorAuth({ message: "already registered" }));
  }
  if (!data.session) return { confirmarCorreo: true };
  await CompletarRegistro(registro);
  return { confirmarCorreo: false };
}

export async function ReenviarConfirmacion(email) {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw new Error(traducirErrorAuth(error));
}

export async function EnviarRecuperacion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/restablecer`,
  });
  if (error) throw new Error(traducirErrorAuth(error));
}

export async function CambiarContrasena(pass) {
  const { error } = await supabase.auth.updateUser({ password: pass });
  if (error) throw new Error(traducirErrorAuth(error));
}

export async function MostrarPlanesPublicos() {
  const { data, error } = await supabase.from("stockly_planes").select().order("orden");
  if (error) throw error;
  return data ?? [];
}
