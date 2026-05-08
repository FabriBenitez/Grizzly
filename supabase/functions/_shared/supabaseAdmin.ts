import { createClient } from "npm:@supabase/supabase-js@2";
import { leerSecreto } from "./env.ts";

export function crearClienteAdminSupabase() {
  return createClient(leerSecreto("SUPABASE_URL"), leerSecreto("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
