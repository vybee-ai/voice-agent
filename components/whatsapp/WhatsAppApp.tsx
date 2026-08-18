"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, CheckCheck, Clock, MessageSquareWarning, Send, Sparkles, PhoneCall, CalendarClock, UserRound } from "lucide-react";
import type { WhatsAppConversation, WhatsAppMessage } from "@/lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
}

const SCENARIO_LABEL: Record<WhatsAppConversation["scenario"], { title: string; step: string }> = {
  no_answer_recovery: { title: "AI Call: No Answer", step: "WhatsApp Recovery" },
  qualified_confirmation: { title: "Qualification Completed", step: "Confirmation WhatsApp" },
  specialist_no_answer: { title: "Specialist Call: No Answer", step: "WhatsApp Follow-up" },
  general: { title: "Conversation", step: "" },
};

function StatusIcon({ status }: { status: WhatsAppMessage["status"] }) {
  if (status === "pending") return <Clock size={12} className="text-ink-700/40" />;
  if (status === "sent") return <Check size={12} className="text-ink-700/40" />;
  if (status === "delivered") return <CheckCheck size={12} className="text-ink-700/40" />;
  if (status === "read" || status === "replied") return <CheckCheck size={12} className="text-cold" />;
  return <MessageSquareWarning size={12} className="text-hot" />;
}

export default function WhatsAppApp({
  conversations,
  initialConversationId,
}: {
  conversations: WhatsAppConversation[];
  initialConversationId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialConversationId ?? conversations[0]?.id);
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<Record<string, WhatsAppMessage[]>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);
  const messages = selected ? [...selected.messages, ...(localMessages[selected.id] ?? [])] : [];

  function sendText(text: string) {
    if (!selected || !text.trim()) return;
    const newMsg: WhatsAppMessage = {
      id: `local-${Date.now()}`,
      conversationId: selected.id,
      direction: "outgoing",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    setLocalMessages((prev) => ({ ...prev, [selected.id]: [...(prev[selected.id] ?? []), newMsg] }));
    setDraft("");
    setNotice("WhatsApp sending isn't connected yet — configure a provider in Settings → WhatsApp to send live messages.");
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div className="grid h-[calc(100vh-9.5rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className={clsx("overflow-y-auto rounded-xl border border-ink-900/10 bg-white shadow-card", selected && "hidden lg:block")}>
        {conversations.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-700/55">No WhatsApp conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={clsx(
                "focus-ring flex w-full flex-col gap-1 border-b border-ink-900/5 px-4 py-3 text-left transition",
                selectedId === c.id ? "bg-gold-400/10" : "hover:bg-sand-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink-950">{c.leadName}</span>
                <span className="text-xs text-ink-700/45">{formatTime(c.lastMessageAt)}</span>
              </div>
              <p className="truncate text-sm text-ink-700/60">{c.lastMessage}</p>
              {c.unread && <span className="mt-1 h-2 w-2 rounded-full bg-gold-500" />}
            </button>
          ))
        )}
      </div>

      {/* Conversation */}
      <div className={clsx("flex flex-col rounded-xl border border-ink-900/10 bg-white shadow-card", !selected && "hidden lg:flex")}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-700/50">Select a conversation</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-ink-900/10 p-4">
              <div>
                <button onClick={() => setSelectedId(undefined)} className="focus-ring mb-1 text-xs text-ink-700/50 lg:hidden">
                  ← All conversations
                </button>
                <p className="font-medium text-ink-950">{selected.leadName}</p>
                <p className="text-xs text-ink-700/50">{selected.phone ?? "Not provided"}</p>
              </div>
              <div className="hidden items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1 text-xs font-medium text-ink-700 sm:flex">
                <Sparkles size={12} className="text-gold-500" />
                {SCENARIO_LABEL[selected.scenario].title}
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={clsx("flex flex-col gap-0.5", m.direction === "outgoing" ? "items-end" : "items-start")}>
                  <div
                    className={clsx(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      m.direction === "outgoing" ? "bg-ink-950 text-white rounded-tr-sm" : "bg-sand-100 text-ink-900 rounded-tl-sm"
                    )}
                  >
                    {m.text}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-ink-700/40">
                    {formatTime(m.timestamp)}
                    {m.direction === "outgoing" && <StatusIcon status={m.status} />}
                  </div>
                </div>
              ))}
            </div>

            {notice && (
              <div className="mx-4 mb-2 rounded-lg border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-xs text-gold-700">
                {notice}
              </div>
            )}

            <div className="border-t border-ink-900/10 p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  onClick={() => sendText("Hi! Just confirming — everything discussed on the call has been noted. Your specialist will follow up shortly.")}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60"
                >
                  <Check size={12} /> Send confirmation
                </button>
                <button
                  onClick={() => sendText("We tried calling but couldn't reach you. Reply here whenever works for you.")}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60"
                >
                  <PhoneCall size={12} /> Missed-call message
                </button>
                <button
                  onClick={() => sendText("Would you like us to schedule a callback? Let us know a time that works.")}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60"
                >
                  <CalendarClock size={12} /> Request callback
                </button>
                <button
                  onClick={() => sendText("We'd like to schedule your next call with our property specialist.")}
                  className="focus-ring flex items-center gap-1.5 rounded-full border border-ink-900/15 px-3 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60"
                >
                  <UserRound size={12} /> Schedule call
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendText(draft)}
                  placeholder="Type a message..."
                  className="focus-ring flex-1 rounded-full border border-ink-900/15 bg-sand-50 px-4 py-2 text-sm"
                />
                <button
                  onClick={() => sendText(draft)}
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-ink-950 text-white hover:bg-ink-900"
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
