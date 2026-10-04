import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { AuthContext } from "./contextoAuth";

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) return <SpinnerLoader pantallaCompleta />;

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
