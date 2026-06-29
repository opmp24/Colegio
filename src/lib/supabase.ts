import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient<Database, "Colegio">(supabaseUrl, supabaseAnonKey, {
  db: { schema: "Colegio" },
});
