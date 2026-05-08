import { createClient } from "@supabase/supabase-js";
import { estanVariablesPublicasSupabaseConfiguradas, obtenerVariablesPublicas } from "./env.publico";
import type { BaseDeDatos } from "./supabase.types";

const opcionesCliente = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

export const supabase = estanVariablesPublicasSupabaseConfiguradas()
  ? createClient<BaseDeDatos>(
      obtenerVariablesPublicas().supabaseUrl,
      obtenerVariablesPublicas().supabasePublicKey,
      opcionesCliente,
    )
  : null;

export function obtenerClienteSupabase() {
  if (!supabase) {
    throw new Error(
      "El cliente de Supabase todavía no está configurado. Completá VITE_SUPABASE_URL y una clave pública de Supabase en .env.local.",
    );
  }

  return supabase;
}
