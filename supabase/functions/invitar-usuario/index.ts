// Invita a una persona del equipo con su correo real.
//
//  accion "invitar": envía la invitación de Supabase (la persona verifica su correo y crea
//    su contraseña) y la registra en la empresa con su rol y sus permisos.
//  accion "reenviar": vuelve a enviar la invitación o, si ya la aceptó, un enlace para
//    restablecer la contraseña.
// Solo dueño o administradores, y respetando el límite de usuarios del plan.
//
// Despliegue (con verificación de JWT): supabase functions deploy invitar-usuario
// La plantilla del correo es "Invite user" (Authentication → Emails → Templates).
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (t: unknown, max = 200) => String(t ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return responder({ error: "Método no permitido" }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization) return responder({ error: "Falta la sesión" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const c = await req.json().catch(() => ({}));
  const idEmpresa = Number(c.id_empresa);
  const email = texto(c.email, 160).toLowerCase();
  if (!Number.isInteger(idEmpresa) || !EMAIL.test(email)) return responder({ error: "Revisa el correo de la persona" }, 400);

  // Quien invita debe ser dueño o administrador de la empresa (la consulta falla si no es miembro).
  const { data: uso, error: errorUso } = await db.rpc("stockly_uso_plan", { _id_empresa: idEmpresa });
  const { data: esAdmin } = await db.rpc("stockly_es_admin_actual");
  if (errorUso || esAdmin !== true) return responder({ error: "Solo el dueño o un administrador puede invitar personas" }, 403);

  // Destino del enlace del correo: la página para crear la contraseña.
  const origen = texto(c.origen, 200);
  const redirectTo = /^https?:\/\/[^\s/]+$/.test(origen) ? `${origen}/restablecer?bienvenida=1` : undefined;

  if (c.accion === "reenviar") {
    const { data: miembro } = await admin
      .from("Usuarios")
      .select("id, idauth, asignarempresa!inner(id_empresa)")
      .eq("email", email)
      .eq("asignarempresa.id_empresa", idEmpresa)
      .maybeSingle();
    if (!miembro) return responder({ error: "Esa persona no está en tu equipo" }, 404);
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!error) return responder({ ok: true, tipo: "invitacion" });
    // Ya aceptó la invitación: se le envía un enlace para restablecer la contraseña.
    const { error: errorReset } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo?.replace("?bienvenida=1", ""),
    });
    if (errorReset) return responder({ error: "No se pudo enviar el correo. Intenta en unos minutos." }, 502);
    return responder({ ok: true, tipo: "restablecer" });
  }

  // Límite de usuarios del plan.
  const { data: plan } = await db.rpc("stockly_plan", { _id_empresa: idEmpresa });
  if (plan?.limite_usuarios != null && Number(uso?.usuarios ?? 0) >= Number(plan.limite_usuarios)) {
    return responder({ error: `Tu plan ${plan.nombre ?? ""} permite ${plan.limite_usuarios} usuarios. Mejóralo para invitar a más personas.` }, 409);
  }

  const nombres = texto(c.nombres, 120);
  if (!nombres) return responder({ error: "Escribe el nombre de la persona" }, 400);
  const tipouser = c.tipouser === "administrador" ? "administrador" : "empleado";
  const modulos = Array.isArray(c.modulos) ? c.modulos.map(Number).filter(Number.isInteger) : [];

  const { data: existente } = await admin.from("Usuarios").select("id").eq("email", email).maybeSingle();
  if (existente) return responder({ error: "Ese correo ya tiene una cuenta en Stockly" }, 409);

  const { data: invitado, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { nombres, invitado: true },
  });
  if (errorInvitacion || !invitado?.user) {
    const yaExiste = /already|registered|exists/i.test(errorInvitacion?.message ?? "");
    return responder(
      { error: yaExiste ? "Ese correo ya tiene una cuenta en Stockly" : "No se pudo enviar la invitación. Revisa el correo e intenta de nuevo." },
      yaExiste ? 409 : 502,
    );
  }

  const { data: nuevo, error: errorUsuario } = await admin
    .from("Usuarios")
    .insert({
      nombres,
      email,
      nro_docum: texto(c.nro_docum, 30),
      telefono: texto(c.telefono, 30) || null,
      direccion: texto(c.direccion, 200) || null,
      fecharegistro: new Date().toISOString(),
      estado: "invitado",
      tipouser,
      idauth: invitado.user.id,
    })
    .select("id")
    .single();
  if (errorUsuario || !nuevo) {
    // Sin el registro en la empresa, la invitación no sirve: se deshace.
    await admin.auth.admin.deleteUser(invitado.user.id);
    console.error("[invitar-usuario]", errorUsuario);
    return responder({ error: "No se pudo registrar a la persona en tu empresa" }, 500);
  }
  await admin.from("asignarempresa").insert({ id_empresa: idEmpresa, id_usuario: nuevo.id });
  if (modulos.length) await admin.from("permisos").insert(modulos.map((idmodulo: number) => ({ id_usuario: nuevo.id, idmodulo })));

  return responder({ ok: true, id: nuevo.id });
});
