interface VariablesPublicasApp {
  supabaseUrl: string;
  supabasePublicKey: string;
}

function leerVariablePublica(
  nombreVariable:
    | "VITE_SUPABASE_URL"
    | "VITE_SUPABASE_ANON_KEY"
    | "VITE_SUPABASE_PUBLISHABLE_KEY",
) {
  return import.meta.env[nombreVariable]?.trim() ?? "";
}

export function estanVariablesPublicasSupabaseConfiguradas() {
  return Boolean(leerVariablePublica("VITE_SUPABASE_URL") && obtenerClavePublicaSupabase());
}

export function obtenerClaveAnonSupabase() {
  return leerVariablePublica("VITE_SUPABASE_ANON_KEY");
}

export function obtenerClavePublicableSupabase() {
  return leerVariablePublica("VITE_SUPABASE_PUBLISHABLE_KEY");
}

function obtenerClavePublicaSupabase() {
  return (
    // Preferimos la anon key JWT cuando existe para maximizar compatibilidad
    // con Edge Functions publicas en proyectos que todavia tengan verificacion JWT habilitada.
    obtenerClaveAnonSupabase() ||
    obtenerClavePublicableSupabase()
  );
}

export function obtenerVariablesPublicas(): VariablesPublicasApp {
  const supabaseUrl = leerVariablePublica("VITE_SUPABASE_URL");
  const supabasePublicKey = obtenerClavePublicaSupabase();

  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error(
      "Faltan VITE_SUPABASE_URL y una clave pública de Supabase. Configurá VITE_SUPABASE_PUBLISHABLE_KEY o VITE_SUPABASE_ANON_KEY en tu archivo .env.local.",
    );
  }

  return {
    supabaseUrl,
    supabasePublicKey,
  };
}
