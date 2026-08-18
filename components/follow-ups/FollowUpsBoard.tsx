"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Phone, MessageCircle, CalendarClock, UserRound, CheckCircle2 } from "lucide-react";
import { TemperatureBadge, FollowUpStatusBadge } from "@/components/status-badge/StatusBadge";
import { EmptyState } from "@/components/common/States";
import type { FollowUp, FollowUpStatus, Associate } from "@/lib/types";

const TABS: FollowUpStatus[] = ["Today", "Upcoming", "Overdue", "Completed"];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}

export default function FollowUpsBoard({ followUps, associates }: { followUps: FollowUp[]; associates: Associate[] }) {
  const [tab, setTab] = useState<FollowUpStatus>("Today");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const associateName = (id: string | null) => associates.find((a) => a.id === id)?.name ?? "Unassigned";

  const items = useMemo(
    () => followUps.filter((f) => (completed.has(f.id) ? tab === "Completed" : f.status === tab)),
    [followUps, tab, completed]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-ink-900/10 bg-white p-1 shadow-card w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "focus-ring rounded-md px-3.5 py-1.5 text-sm font-medium transition",
              tab === t ? "bg-ink-950 text-white" : "text-ink-700/65 hover:bg-sand-50"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState title={`No ${tab.toLowerCase()} follow-ups`} description="Nothing to show in this view right now." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div key={f.id} className="rounded-xl border border-ink-900/10 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <Link href={`/leads/${f.leadId}`} className="focus-ring font-medium text-ink-950 hover:text-gold-600">
                    {f.leadName}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-700/55">{formatDateTime(f.scheduledAt)}</p>
                </div>
                <TemperatureBadge temperature={f.temperature} />
              </div>
              <p className="mt-2 text-sm text-ink-700/65">{associateName(f.associateId)}</p>
              {f.notes && <p className="mt-1 text-sm text-ink-700/55">{f.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/leads/${f.leadId}`} className="focus-ring flex items-center gap-1 rounded-full border border-ink-900/15 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60">
                  <Phone size={12} /> Call
                </Link>
                <Link href={`/whatsapp/${f.leadId}`} className="focus-ring flex items-center gap-1 rounded-full border border-ink-900/15 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60">
                  <MessageCircle size={12} /> WhatsApp
                </Link>
                <button className="focus-ring flex items-center gap-1 rounded-full border border-ink-900/15 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60">
                  <CalendarClock size={12} /> Reschedule
                </button>
                <button className="focus-ring flex items-center gap-1 rounded-full border border-ink-900/15 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60">
                  <UserRound size={12} /> Reassign
                </button>
                {tab !== "Completed" && (
                  <button
                    onClick={() => setCompleted((prev) => new Set(prev).add(f.id))}
                    className="focus-ring flex items-center gap-1 rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-600/15"
                  >
                    <CheckCircle2 size={12} /> Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
