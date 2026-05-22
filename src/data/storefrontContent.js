import { DEFAULT_WHATSAPP } from "./constants";

const supportMessage = encodeURIComponent(
  "Hola Grizzly, necesito ayuda con una compra, un pedido o una consulta.",
);

export const STOREFRONT_CONTACT = {
  whatsappLabel: "+54 9 2284 123456",
  whatsappUrl: `https://wa.me/${DEFAULT_WHATSAPP}?text=${supportMessage}`,
  location: "Olavarria, Buenos Aires",
  hours: "Lunes a sabado de 9 a 20 hs",
};

export const STOREFRONT_PURCHASE_STEPS = [
  "Explora el catalogo, agrega productos al carrito y revisa el resumen final.",
  "Completa tus datos, elige entrega a domicilio o retiro por sucursal y confirma la compra.",
  "Paga online con Mercado Pago y recibe la confirmacion del pedido por email.",
  "Sigue el avance de la compra con tu numero de pedido y el telefono usado en checkout.",
];

export const STOREFRONT_SHIPPING_POINTS = [
  "Calculamos opciones de entrega segun tu codigo postal y tu localidad.",
  "Puedes elegir envio a domicilio o retiro por sucursal cuando haya disponibilidad.",
  "La sucursal elegida y el costo del envio quedan visibles antes de pagar.",
];

export const STOREFRONT_PAYMENT_POINTS = [
  "El checkout se finaliza online con Mercado Pago y tarjetas compatibles.",
  "Antes de pagar ves subtotal, costo de envio, descuentos y total final.",
  "Cuando el pago se aprueba, actualizamos el pedido y enviamos una confirmacion por email.",
];

export const STOREFRONT_POLICY_POINTS = [
  "Si necesitas cambiar un dato del pedido, escribenos antes de que salga a despacho.",
  "Las modificaciones dependen del estado de la compra y de la disponibilidad del producto.",
  "Para revisar un caso puntual, ten a mano tu numero de pedido y el telefono del checkout.",
];

export const STOREFRONT_SUPPORT_POINTS = [
  "WhatsApp funciona como canal de consultas, no como reemplazo del checkout.",
  "Te ayudamos con productos, seguimiento, cambios de datos y estado del pedido.",
  "Si ya compraste, la forma mas rapida de resolverlo es usar tu numero de pedido.",
];

export const STOREFRONT_FAQS = [
  {
    question: "Como compro en la tienda?",
    answer:
      "Elige tus productos, agregalos al carrito, completa tus datos y finaliza el pago desde el checkout online.",
  },
  {
    question: "Necesito crear una cuenta?",
    answer:
      "No. Puedes comprar sin registrarte y luego seguir el pedido con tu numero de orden y tu telefono.",
  },
  {
    question: "Que medio de pago usan?",
    answer:
      "Trabajamos con Mercado Pago para que puedas pagar de forma online y segura desde el checkout.",
  },
  {
    question: "Como funciona el envio?",
    answer:
      "Segun tu zona puedes ver opciones de entrega a domicilio o retiro por sucursal antes de pagar.",
  },
  {
    question: "Puedo retirar en una sucursal?",
    answer:
      "Si hay sucursales disponibles para tu direccion, podras elegir una en el checkout y confirmarla antes de pagar.",
  },
  {
    question: "Como sigo mi pedido?",
    answer:
      "En la seccion de seguimiento ingresas tu numero de pedido y el telefono usado en la compra para ver el estado actualizado.",
  },
];
