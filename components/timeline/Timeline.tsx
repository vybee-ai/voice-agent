import {
  UserPlus2,
  PhoneCall,
  PhoneOff,
  Sparkles,
  BadgeCheck,
  CalendarClock,
  MessageCircle,
  MessageCircleReply,
  UserRound,
  CalendarCheck2,
} from "lucide-react";
import type { TimelineEvent } from "@/lib/types";

const ICONS: Record<TimelineEvent["type"], any> = {
  lead_created: UserPlus2,
  call_started: PhoneCall,
  call_completed: PhoneCall,
  analysis_completed: Sparkles,
  lead_qualified: BadgeCheck,
  followup_requested: CalendarClock,
  whatsapp_sent: MessageCircle,
  whatsapp_replied: MessageCircleReply,
  callback_scheduled: CalendarCheck2,
  associate_assigned: UserRound,
  specialist_call_attempted: PhoneCall,
  specialist_call_unanswered: PhoneOff,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dubai" });
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-ink-700/55">No timeline events yet.</p>;
  }

  let lastDay = "";

  return (
    <ol className="relative border-l border-ink-900/10 pl-5">
      {events.map((event) => {
        const Icon = ICONS[event.type] ?? Sparkles;
        const day = formatDay(event.timestamp);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <li key={event.id} className="mb-5 last:mb-0">
            {showDay && <p className="mb-2 -ml-5 pl-5 text-xs font-semibold uppercase tracking-wide text-ink-700/45">{day}</p>}
            <span className="absolute -ml-[27px] mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-gold-400/60">
              <Icon size={11} className="text-gold-600" />
            </span>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-ink-950">{event.label}</span>
                <span className="text-xs text-ink-700/40">{formatTime(event.timestamp)}</span>
              </div>
              {event.detail && <span className="text-sm text-ink-700/60">{event.detail}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
