import { leerSecreto } from "./env.ts";

export async function invocarFuncionInterna(nombreFuncion: string, payload: unknown) {
  const supabaseUrl = leerSecreto("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = leerSecreto("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${supabaseUrl}/functions/v1/${nombreFuncion}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
        `No pudimos invocar la funcion interna ${nombreFuncion}.`,
    );
  }

  return data;
}
