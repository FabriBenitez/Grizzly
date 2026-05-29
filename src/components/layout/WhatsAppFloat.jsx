import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "../../context/StoreSettingsContext";

function WhatsAppFloat() {
  const { whatsapp_number } = useStoreSettings();
  
  const defaultMessage = encodeURIComponent(
    "Hola Grizzly, necesito ayuda con una consulta, una compra o un pedido.",
  );

  if (!whatsapp_number) {
    return null;
  }

  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${whatsapp_number}?text=${defaultMessage}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Escribinos por WhatsApp para consultas"
    >
      <MessageCircle size={24} />
    </a>
  );
}

export default WhatsAppFloat;
