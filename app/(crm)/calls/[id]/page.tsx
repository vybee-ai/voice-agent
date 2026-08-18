import Link from "next/link";
import { notFound } from "next/navigation";
import { callsService } from "@/services/callsService";
import { leadsService } from "@/services/leadsService";
import { TemperatureBadge, CallStatusBadge } from "@/components/status-badge/StatusBadge";
import CallPlayer from "@/components/call-player/CallPlayer";
import TranscriptViewer from "@/components/transcript/TranscriptViewer";
import AnalysisPanel from "@/components/analysis/AnalysisPanel";
import { InfoField } from "@/components/lead-card/InfoField";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dubai" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
}
function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function CallDetailsPage({ params }: { params: { id: string } }) {
  const call = await callsService.getById(params.id);
  if (!call) notFound();
  const lead = await leadsService.getById(call.leadId);

  return (
    <div className="space-y-6">
      <Link href={lead ? `/leads/${lead.id}` : "/calls"} className="focus-ring text-sm text-ink-700/60 hover:text-ink-900">
        ← Back to {lead ? lead.buyerName : "Calls"}
      </Link>

      <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">Call Analysis</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">{lead?.buyerName ?? "Unknown lead"}</h1>
          {call.temperature && <TemperatureBadge temperature={call.temperature} />}
          {call.score !== null && <span className="text-sm font-medium text-ink-700/70">Score: {call.score}</span>}
        </div>
        <p className="mt-1 text-sm text-ink-700/60">
          Call ID: {call.callId} {call.analysisId && `· Analysis ID: ${call.analysisId}`}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <CallStatusBadge status={call.status} />
          <span className="text-sm text-ink-700/70">{formatTime(call.startedAt)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
        <h3 className="font-display text-base text-ink-950">Call Metadata</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoField label="Call ID" value={call.callId} />
          <InfoField label="Analysis ID" value={call.analysisId} />
          <InfoField label="Lead ID" value={lead?.leadId} />
          <InfoField label="Date" value={formatDateTime(call.startedAt)} />
          <InfoField label="Time" value={formatTime(call.startedAt)} />
          <InfoField label="Duration" value={formatDuration(call.durationSeconds)} />
          <InfoField label="Caller" value={call.callerRole} />
          <InfoField label="Agent" value={call.agentName} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-display text-base text-ink-950">Call Recording</h3>
            <CallPlayer
              recordingUrl={call.recordingUrl}
              transcript={call.transcript}
              durationSeconds={call.durationSeconds}
            />
          </div>
          <div>
            <h3 className="mb-3 font-display text-base text-ink-950">Call Transcript</h3>
            <TranscriptViewer transcript={call.transcript} />
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-display text-base text-ink-950">AI Analysis</h3>
          <AnalysisPanel call={call} />
        </div>
      </div>
    </div>
  );
}
