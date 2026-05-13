# Testing con Vitest

## Estructura

- `tests/unit/payments`
  Logica pura de checkout, Mercado Pago y webhook.
- `tests/unit/orders`
  Normalizacion de pedidos, tracking y estados.
- `tests/unit/catalog`
  Filtros, stock, destacados, busqueda y transformaciones del catalogo.
- `tests/integration`
  Flujos que combinan varios modulos con mocks.
- `src/**/*.test.*`
  Solo para tests muy pegados a un modulo puntual.

## Regla practica

- Si no toca red, base de datos ni navegador, va en `unit`.
- Si necesita mocks de `fetch`, Supabase o functions, va en `integration`.
- Si prueba React renderizado, conviene agregarlo despues con `jsdom`.

## Comandos

- `npm test`
  Modo interactivo.
- `npm run test:run`
  Corre toda la suite una vez.
- `npm run test:payments`
  Corre solo pagos y Mercado Pago.

## Prioridad recomendada

1. Pagos y checkout.
2. Webhooks y estados.
3. Tracking de pedidos.
4. Catalogo y stock.
5. Admin y componentes de UI.
