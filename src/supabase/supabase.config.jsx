import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_APP_SUPABASE_URL;
const anonKey = import.meta.env.VITE_APP_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Faltan VITE_APP_SUPABASE_URL y/o VITE_APP_SUPABASE_ANON_KEY. Copia .env.example a .env y complétalo."
  );
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing-key");

