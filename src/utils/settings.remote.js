import { supabase } from "../lib/supabase";

export async function fetchStoreSettings() {
  if (!supabase) throw new Error("Supabase no esta configurado");
  
  const { data, error } = await supabase.from("store_settings").select("*");
  if (error) throw new Error(error.message || "Error al cargar configuraciones");
  
  return (data || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function saveStoreSetting(key, value, description = null) {
  if (!supabase) throw new Error("Supabase no esta configurado");

  const { error } = await supabase.from("store_settings").upsert({
    key,
    value,
    description
  });
  
  if (error) throw new Error(error.message || `Error al guardar configuracion ${key}`);
}
