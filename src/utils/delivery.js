/**
 * Calcula la distancia aproximada desde Burzaco.
 * En una fase real, esto consultaria Google Matrix API o similar.
 */
export const calcularDistanciaDesdeBurzaco = async (direccion, localidad, cp) => {
  // Mock simple para pruebas locales de checkout.
  return new Promise((resolve) => {
    setTimeout(() => {
      if (cp === "1852") resolve(0);
      if (cp.startsWith("18")) resolve(8);
      resolve(25);
    }, 600);
  });
};

/**
 * Determina el tipo de envio basado en la distancia.
 * Punto base: Burzaco. Radio: 10km.
 */
export const determinarTipoEnvioPorDireccion = async (datos) => {
  const { address, locality, postalCode } = datos;
  if (!address || !locality || !postalCode) return null;

  const distancia = await calcularDistanciaDesdeBurzaco(address, locality, postalCode);

  return distancia <= 10
    ? { type: "moto", label: "Moto mensajeria", cost: 10 }
    : { type: "correo", label: "Correo Argentino a sucursal", cost: 20 };
};
