import { cabecerasCors } from "../_shared/cors.ts";
import { leerSecreto } from "../_shared/env.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  try {
    const resendApiKey = leerSecreto("RESEND_API_KEY");
    const remitente = leerSecreto("RESEND_FROM_EMAIL");
    const cuerpo = await request.json();

    return Response.json(
      {
        ok: true,
        mensaje:
          "Base de envío de emails creada. Falta integrar el POST real a Resend con templates y datos del pedido.",
        configuracionDetectada: {
          resend: Boolean(resendApiKey),
          remitente,
        },
        payloadRecibido: cuerpo,
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
