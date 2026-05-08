import { cabecerasCors } from "../_shared/cors.ts";
import { leerSecreto } from "../_shared/env.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  try {
    const accessTokenMercadoPago = leerSecreto("MERCADOPAGO_ACCESS_TOKEN");
    const cuerpo = await request.json();

    return Response.json(
      {
        ok: true,
        mensaje:
          "Base de create-payment-preference creada. Falta conectar la lógica real de órdenes, stock y preferencia de Mercado Pago.",
        configuracionDetectada: {
          mercadopago: Boolean(accessTokenMercadoPago),
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
