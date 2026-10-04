import { create } from "zustand";
import { supabase } from "../supabase/supabase.config";

export const useAuthStore = create(() => ({
  signInWithEmail: async ({ email, pass }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error };
    return { user: data.user };
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error("No se pudo cerrar la sesión: " + error.message);
    // Recarga completa: limpia caché de consultas y stores del usuario anterior.
    window.location.replace("/login");
  },
}));
