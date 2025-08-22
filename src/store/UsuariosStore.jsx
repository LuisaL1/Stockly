import { create } from "zustand";
import { InsertarUsuarios } from "../index";
import { supabase } from "../supabase/supabase.config";
import { MostrarUsuarios } from "../supabase/crudUsuarios";

export const useUsuariosStore = create((set, get) => ({
  insertarUsuarioAdmin: async (p) => {
    if (!p.email || !p.pass || p.pass.length < 6) {
      console.error("Email o contraseña inválidos");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: p.email,
      password: p.pass,
    });

    console.log("data del registro del userath", data);
    if (error) {
      console.error("Error al registrar usuario:", error.message);
      return;
    }

    const datauser = await InsertarUsuarios({
      idauth: data.user.id,
      fecharegistro: new Date(),
      tipouser: "admin",
    });

    return datauser;
  },
  idusuario :0,
  MostrarUsuarios: async()=>{
    const response = await MostrarUsuarios();
    set({idusuario:response.id});
    return response;
  }
}));

