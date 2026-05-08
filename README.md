# Grizzly Suplementos - Frontend (React + Vite)

Frontend completo para e-commerce de suplementos inspirado en las referencias visuales enviadas.

## Ejecutar

```bash
npm install
npm run dev
```

Build de produccion:

```bash
npm run build
```

## Variables de entorno

Usa dos archivos separados para no mezclar variables publicas con secretos:

- `/.env.local`
  Variables del frontend, por ejemplo `VITE_SUPABASE_URL` y la clave publica de Supabase.
- `/supabase/functions/.env.local`
  Secrets server-side para Edge Functions, por ejemplo `SUPABASE_SERVICE_ROLE_KEY`,
  `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET`.

Ambos archivos estan ignorados por Git. Tienes una plantilla base en:

- [`.env.example`](./.env.example)
- [`supabase/functions/.env.local.example`](./supabase/functions/.env.local.example)

## Rutas cliente

- `/` Inicio con hero de ofertas y productos.
- `/catalogo` Catalogo con filtros (busqueda, categoria, marca y precio).
- `/promos` Listado de productos en promocion.
- `/producto/:slug` Detalle de producto con galeria y carrito.
- `/checkout` Carrito + formulario + creacion de pedido y pago.
- `/checkout/resultado` Retorno del flujo de pago.
- `/seguimiento` Seguimiento por numero de pedido.
- `/cuenta` Ayuda y acceso a seguimiento del pedido.

## Rutas admin (navbar separado)

- `/admin` Dashboard operativo integral.
- `/admin/pedidos` Gestion de pedidos y estados.
- `/admin/pagos` Control manual de pagos.
- `/admin/productos` ABM de productos y stock.
- `/admin/promociones` Gestion de promociones y prioridad.
- `/admin/clientes` Base de clientes e historial.
- `/admin/stock` Movimientos de inventario.
- `/admin/reportes` Metricas comerciales.

## Estado actual

El proyecto esta en transicion de `localStorage` a Supabase:

- `localStorage` sigue usandose para carrito y algunos fallbacks demo.
- `Supabase Auth` se usa para acceso admin.
- `Supabase Edge Functions` y base de datos ya soportan el checkout con Mercado Pago,
  tracking de pedidos y sincronizacion de pagos.
