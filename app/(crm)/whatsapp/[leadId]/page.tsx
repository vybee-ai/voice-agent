import { whatsappService } from "@/services/whatsappService";
import { leadsService } from "@/services/leadsService";
import WhatsAppApp from "@/components/whatsapp/WhatsAppApp";
import { EmptyState } from "@/components/common/States";

export default async function WhatsAppLeadPage({ params }: { params: { leadId: string } }) {
  const [conversations, lead] = await Promise.all([
    whatsappService.getConversations(),
    leadsService.getById(params.leadId),
  ]);
  const existing = conversations.find((c) => c.leadId === params.leadId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-ink-950">WhatsApp</h1>
        <p className="mt-1 text-sm text-ink-700/65">
          {lead ? `Conversation with ${lead.buyerName}` : "Buyer conversations and automated follow-up flows."}
        </p>
      </div>
      {!existing && lead ? (
        <EmptyState
          title="No WhatsApp conversation yet"
          description={`Nothing has been sent to ${lead.buyerName} yet. Use the composer once a message is triggered.`}
        />
      ) : (
        <WhatsAppApp conversations={conversations} initialConversationId={existing?.id} />
      )}
    </div>
  );
}
