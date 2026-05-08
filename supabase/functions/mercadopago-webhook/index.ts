import { cabecerasCors } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  try {
    const payload = await request.json();

    console.log("Webhook Mercado Pago recibido", payload);

    return Response.json(
      {
        ok: true,
        mensaje:
          "Base de webhook creada. Falta validar firma, consultar pago y sincronizar estado en la base.",
      },
      { headers: cabecerasCors },
    );
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";

    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      {
        status: 500,
        headers: cabecerasCors,
      },
    );
  }
});
