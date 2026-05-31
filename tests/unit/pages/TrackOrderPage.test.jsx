// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TrackOrderPage from "../../../src/pages/TrackOrderPage";

describe("TrackOrderPage", () => {
  it("renders correctly and does not throw syntax errors", () => {
    render(
      <MemoryRouter>
        <TrackOrderPage />
      </MemoryRouter>
    );
    
    // Verifica que un texto clave se renderiza para asegurar que el componente carga bien
    expect(screen.getByText("Segui tu pedido")).toBeDefined();
  });
});
