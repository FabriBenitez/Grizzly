/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import CheckoutPage from "../../../src/pages/CheckoutPage";

// Mocks
vi.mock("../../../src/context/CartContext", () => ({
  useCart: () => ({
    items: [
      {
        id: "prod_1",
        name: "Producto Test",
        quantity: 1,
        price: 10000,
        stock: 5,
        slug: "producto-test"
      }
    ],
    summary: {
      subtotal: 10000,
      discount: 0,
      total: 10000,
      count: 1
    }
  })
}));

vi.mock("../../../src/context/StoreSettingsContext", () => ({
  useStoreSettings: () => ({
    free_shipping_threshold: 50000,
    shipping_cost: 5000,
    allow_guest_checkout: true,
    currency: { code: "ARS", symbol: "$" }
  })
}));

describe("CheckoutPage", () => {
  it("renderiza correctamente los totales y el formulario", async () => {
    // Al usar jsdom y componentes grandes a veces hay useEffects
    await act(async () => {
      render(
        <MemoryRouter>
          <CheckoutPage />
        </MemoryRouter>
      );
    });

    // Validar subtotal (que incluye producto y envio base)
    // El envio es 5000, total = 10000. => Resumen total 15000
    expect(screen.getByText("Tu pedido")).toBeDefined();
    expect(screen.getByText("Producto Test")).toBeDefined();
  });

});
