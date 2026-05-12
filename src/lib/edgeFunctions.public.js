import {
  obtenerClaveAnonSupabase,
  obtenerClavePublicableSupabase,
  obtenerVariablesPublicas,
} from "./env.publico";

export class PublicEdgeFunctionError extends Error {
  constructor(message, status = 500, body = null) {
    super(message);
    this.name = "PublicEdgeFunctionError";
    this.status = status;
    this.body = body;
  }
}

function buildPublicFunctionHeaders() {
  const anonKey = obtenerClaveAnonSupabase();
  const publishableKey = obtenerClavePublicableSupabase();
  const publicKey = anonKey || publishableKey;

  if (!publicKey) {
    throw new Error(
      "Falta una clave publica de Supabase. Configura VITE_SUPABASE_ANON_KEY o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.",
    );
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: publicKey,
  };

  // Solo enviamos Authorization cuando tenemos una anon key JWT valida.
  // Si la unica clave disponible es la publishable key, omitimos Authorization
  // para no disparar rechazos 401 por token invalido en functions publicas.
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`;
  }

  return headers;
}

async function parseFunctionResponse(response) {
  const contentType = response.headers.get("Content-Type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function invokePublicEdgeFunction(functionName, payload, options = {}) {
  const { supabaseUrl } = obtenerVariablesPublicas();
  const method = options.method || "POST";
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`, {
    method,
    headers: {
      ...buildPublicFunctionHeaders(),
      ...(options.headers || {}),
    },
    body: payload == null ? undefined : JSON.stringify(payload),
  });

  const data = await parseFunctionResponse(response).catch(() => null);

  if (!response.ok) {
    const bodyMessage =
      data && typeof data === "object" && "error" in data ? String(data.error || "") : "";

    throw new PublicEdgeFunctionError(
      bodyMessage || `La funcion ${functionName} devolvio ${response.status}.`,
      response.status,
      data,
    );
  }

  return data;
}
