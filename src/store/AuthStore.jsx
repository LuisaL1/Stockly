import { create } from "zustand";
import{supabase} from "../index";
export const useAuthStore = create((set, get) => ({
  signInWithEmail: async (p) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: p.email,
      password: p.pass,
    });

    if (error) {
     console.error("Error en login:", error.message);
    }
    return data.user;
  },
  signOut: async () =>{
    const {error} = await
  supabase.auth.signOut()
  if (error)
    throw new Error("Se presentó un error durante el cierre de sesión"+error)
  }
}));
