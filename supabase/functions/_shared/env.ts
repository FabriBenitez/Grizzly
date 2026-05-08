export function leerSecreto(nombreVariable: string) {
  const valor = Deno.env.get(nombreVariable);

  if (!valor) {
    throw new Error(`Falta la variable de entorno requerida: ${nombreVariable}`);
  }

  return valor;
}
