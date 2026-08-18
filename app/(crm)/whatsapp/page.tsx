import { whatsappService } from "@/services/whatsappService";
import WhatsAppApp from "@/components/whatsapp/WhatsAppApp";

export default async function WhatsAppPage() {
  const conversations = await whatsappService.getConversations();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-ink-950">WhatsApp</h1>
        <p className="mt-1 text-sm text-ink-700/65">Buyer conversations and automated follow-up flows.</p>
      </div>
      <WhatsAppApp conversations={conversations} />
    </div>
  );
}
