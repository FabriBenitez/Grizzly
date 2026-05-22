import { MessageCircle } from "lucide-react";
import { DEFAULT_WHATSAPP } from "../../data/constants";

function WhatsAppFloat() {
  const defaultMessage = encodeURIComponent(
    "Hola Grizzly, necesito ayuda con una consulta, una compra o un pedido.",
  );

  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${DEFAULT_WHATSAPP}?text=${defaultMessage}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp para consultas"
    >
      <MessageCircle size={24} />
    </a>
  );
}

export default WhatsAppFloat;
