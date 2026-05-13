import { describe, expect, it } from "vitest";

import {
  hasLettersOnly,
  hasNumbersOnly,
  sanitizeDni,
  sanitizeLettersOnly,
  sanitizeNumbersOnly,
  sanitizeOrderNumber,
  sanitizePhoneNumber,
  sanitizePostalCode,
} from "../../../src/shared/forms/inputRules";

describe("shared/forms/inputRules", () => {
  it("limpia campos de solo letras sin mezclar numeros", () => {
    expect(sanitizeLettersOnly("Juan123 Perez##")).toBe("Juan Perez");
    expect(sanitizeLettersOnly("Maria-Jose O'Connor")).toBe("Maria-Jose O'Connor");
    expect(hasLettersOnly("Juan Perez")).toBe(true);
    expect(hasLettersOnly("Juan123")).toBe(false);
  });

  it("limpia campos numericos y rechaza letras", () => {
    expect(sanitizeNumbersOnly("11a22b33")).toBe("112233");
    expect(sanitizePhoneNumber("11-2345-6789abc")).toBe("1123456789");
    expect(sanitizePostalCode("17a44-xx")).toBe("1744");
    expect(sanitizeDni("40.123.456a")).toBe("40123456");
    expect(hasNumbersOnly("40123456")).toBe(true);
    expect(hasNumbersOnly("40A123")).toBe(false);
  });

  it("normaliza numeros de pedido al formato permitido", () => {
    expect(sanitizeOrderNumber("grz-abc123")).toBe("GRZ-ABC123");
    expect(sanitizeOrderNumber(" 000123 ")).toBe("000123");
    expect(sanitizeOrderNumber("grz@abc 123")).toBe("GRZABC123");
  });
});
