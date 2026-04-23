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

## Rutas cliente

- `/` Inicio con hero de ofertas y productos.
- `/catalogo` Catalogo con filtros (busqueda, categoria, marca y precio).
- `/promos` Listado de productos en promocion.
- `/producto/:slug` Detalle de producto con galeria y carrito.
- `/checkout` Carrito + formulario + cierre por WhatsApp.
- `/seguimiento` Seguimiento por numero de pedido.
- `/cuenta` Login/registro y pedidos del cliente.

## Rutas admin (navbar separado)

- `/admin` Dashboard operativo integral.
- `/admin/pedidos` Gestion de pedidos y estados.
- `/admin/pagos` Control manual de pagos.
- `/admin/productos` ABM de productos y stock.
- `/admin/promociones` Gestion de promociones y prioridad.
- `/admin/clientes` Base de clientes e historial.
- `/admin/stock` Movimientos de inventario.
- `/admin/reportes` Metricas comerciales.

## Persistencia local

Se usa `localStorage` para:

- carrito,
- usuarios/sesion,
- pedidos y estados,
- movimientos de stock (demo).

No hay backend integrado en esta version.
