/**
 * Calcula la distancia aproximada desde Burzaco.
 * En una fase real, esto consultaría Google Matrix API o similar.
 */
export const calcularDistanciaDesdeBurzaco = async (direccion, localidad, cp) => {
  // MOCK LOGIC: Si el CP empieza con "18" (Zona Sur cercana), simulamos que está cerca.
  // Si el CP es "1852" (Burzaco), distancia 0.
  return new Promise((resolve) => {
    setTimeout(() => {
      if (cp === "1852") resolve(0);
      if (cp.startsWith("18")) resolve(8); // Dentro de los 10km
      resolve(25); // Fuera de los 10km
    }, 600);
  });
};

/**
 * Determina el tipo de envío basado en la distancia.
 * Punto base: Burzaco. Radio: 10km.
 */
export const determinarTipoEnvioPorDireccion = async (datos) => {
  const { address, locality, postalCode } = datos;
  if (!address || !locality || !postalCode) return null;

  const distancia = await calcularDistanciaDesdeBurzaco(address, locality, postalCode);
  
  return distancia <= 10 
    ? { type: 'moto', label: 'Moto mensajería', cost: 3500 }
    : { type: 'correo', label: 'Correo Argentino a sucursal', cost: 5500 };
};