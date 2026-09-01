import Link from "next/link";
import { callsService } from "@/services/callsService";
import { leadsService } from "@/services/leadsService";
import { CallStatusBadge } from "@/components/status-badge/StatusBadge";
import { EmptyState } from "@/components/common/States";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}
function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function CallsPage() {
  const [calls, leads] = await Promise.all([callsService.getAll(), leadsService.getAll()]);
  const leadName = (id: string) => leads.find((l) => l.id === id)?.buyerName ?? "Unknown lead";

  const sorted = [...calls].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Calls</h1>
        <p className="mt-1 text-sm text-ink-700/65">Every AI and specialist call, with outcome and analysis status.</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No calls yet" description="Calls will appear here once the voice agent starts qualifying leads." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-900/10 bg-white shadow-card">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wide text-ink-700/50">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Call ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium">Recording</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Analysis</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((call) => (
                <tr key={call.id} className="border-b border-ink-900/5 last:border-0 hover:bg-sand-50">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${call.leadId}`} className="focus-ring font-medium text-ink-950 hover:text-gold-600">
                      {leadName(call.leadId)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-700/70">{call.callId}</td>
                  <td className="px-4 py-3 text-ink-800">{formatDateTime(call.startedAt)}</td>
                  <td className="px-4 py-3 text-ink-800">{formatDuration(call.durationSeconds)}</td>
                  <td className="px-4 py-3">
                    <CallStatusBadge status={call.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-800">{call.outcome ?? "Not provided"}</td>
                  <td className="px-4 py-3">
                    {call.recordingUrl || (call.transcript && call.transcript.length > 0) ? (
                      <Link
                        href={`/calls/${call.id}`}
                        className="inline-flex items-center gap-1 rounded bg-ink-900/5 px-2 py-0.5 text-xs font-medium text-ink-900 hover:bg-gold-400/20 hover:text-gold-700"
                      >
                        ▶ Available
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-700/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-800">{call.agentName}</td>
                  <td className="px-4 py-3">
                    <Link href={`/calls/${call.id}`} className="focus-ring text-xs font-medium text-gold-600 hover:text-gold-500">
                      View Analysis →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
