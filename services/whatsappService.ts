import { getAdapter } from "./dataSource";
import type { WhatsAppConversation } from "@/lib/types";

export const whatsappService = {
  async getConversations(): Promise<WhatsAppConversation[]> {
    const convos = await getAdapter().getConversations();
    return [...convos].sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
  },
  async getByLeadId(leadId: string): Promise<WhatsAppConversation | null> {
    return getAdapter().getConversationByLeadId(leadId);
  },
  // In live mode this would call the configured provider (Twilio / Meta
  // Cloud API) via a server route. Kept as a clearly-labelled stub here so
  // the demo never silently pretends a message was actually delivered.
  async sendMessage(_conversationId: string, _text: string): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "WhatsApp sending is not connected in this environment. Configure a provider in Settings → WhatsApp." };
  },
};
