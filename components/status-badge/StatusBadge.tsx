import clsx from "clsx";
import type { LeadStatus, LeadTemperature, CallStatus, FollowUpStatus } from "@/lib/types";

export function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const styles: Record<LeadTemperature, string> = {
    HOT: "bg-hot/10 text-hot border-hot/25",
    WARM: "bg-warm/10 text-warm border-warm/25",
    COLD: "bg-cold/10 text-cold border-cold/25",
    UNQUALIFIED: "bg-unqualified/10 text-unqualified border-unqualified/25",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide", styles[temperature])}>
      {temperature}
    </span>
  );
}

export function StatusPill({ status }: { status: LeadStatus }) {
  const styles: Record<LeadStatus, string> = {
    New: "bg-ink-900/5 text-ink-800 border-ink-900/10",
    Contacted: "bg-cold/10 text-cold border-cold/20",
    Qualified: "bg-gold-400/15 text-gold-600 border-gold-400/30",
    "Follow-up": "bg-warm/10 text-warm border-warm/20",
    Closed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const styles: Record<CallStatus, string> = {
    Answered: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "No Answer": "bg-hot/10 text-hot border-hot/25",
    Voicemail: "bg-cold/10 text-cold border-cold/20",
    Busy: "bg-warm/10 text-warm border-warm/20",
    Failed: "bg-unqualified/10 text-unqualified border-unqualified/25",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}

export function FollowUpStatusBadge({ status }: { status: FollowUpStatus }) {
  const styles: Record<FollowUpStatus, string> = {
    Today: "bg-gold-400/15 text-gold-600 border-gold-400/30",
    Upcoming: "bg-cold/10 text-cold border-cold/20",
    Overdue: "bg-hot/10 text-hot border-hot/25",
    Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {status}
    </span>
  );
}
