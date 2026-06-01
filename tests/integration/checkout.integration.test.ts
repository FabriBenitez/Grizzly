import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokePublicEdgeFunction } from "../../src/lib/edgeFunctions.public";

describe("Integracion Checkout - Validacion de Stock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("debe propagar correctamente el error de validacion de stock desde la Edge Function", async () => {
    // Simulamos que el frontend (CheckoutPage) hace el POST a la Edge Function
    // y que Supabase Edge Function detecta un fallo de stock y responde con el error.
    
    const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => ({
        ok: false,
        error: "No hay stock suficiente para \"Creatina\". Solicitado: 3, Disponible: 1.",
      }),
    } as Response);

    // Act
    // Simulamos el payload del carrito
    const payload = {
      paymentMethod: "mercadopago",
      customerName: "Juan",
      items: [
        { productId: "prod_1", quantity: 3 }
      ]
    };

    let errorThrown: any = null;

    try {
      await invokePublicEdgeFunction("create-payment-preference", payload);
    } catch (err) {
      errorThrown = err;
    }

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/create-payment-preference"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload)
      })
    );
    
    // Verificamos que el error lanzado por la libreria cliente sea el que provino del backend
    expect(errorThrown).not.toBeNull();
    expect(errorThrown.message).toBe("No hay stock suficiente para \"Creatina\". Solicitado: 3, Disponible: 1.");
    expect(errorThrown.status).toBe(500);
  });
});
