import { MessageCircle } from "lucide-react";
import { DEFAULT_WHATSAPP } from "../../data/constants";

function WhatsAppFloat() {
  const defaultMessage = encodeURIComponent(
    "Hola Grizzly, quiero consultar por suplementos y promociones.",
  );

  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${DEFAULT_WHATSAPP}?text=${defaultMessage}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  );
}

export default WhatsAppFloat;
