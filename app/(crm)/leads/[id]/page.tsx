import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, CalendarClock, UserRound, Pencil, MoreHorizontal } from "lucide-react";
import { leadsService } from "@/services/leadsService";
import { callsService } from "@/services/callsService";
import { associatesService } from "@/services/associatesService";
import { allocationsService } from "@/services/allocationsService";
import { activityService } from "@/services/activityService";
import { TemperatureBadge, StatusPill, CallStatusBadge } from "@/components/status-badge/StatusBadge";
import CallPlayer from "@/components/call-player/CallPlayer";
import TranscriptViewer from "@/components/transcript/TranscriptViewer";
import { InfoField, Section } from "@/components/lead-card/InfoField";
import Timeline from "@/components/timeline/Timeline";
import AllocationCard from "@/components/allocation/AllocationCard";
import { formatBudgetRange } from "@/lib/marketConfig";
import { EmptyState } from "@/components/common/States";

function formatDateTime(iso: string | null) {
  if (!iso) return "Not provided";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await leadsService.getById(params.id);
  if (!lead) notFound();

  const [calls, associates, timeline, currentAllocation, recommendations, allocationHistory] = await Promise.all([
    callsService.getByLeadId(lead.id),
    associatesService.getAll(),
    activityService.getTimelineForLead(lead.id),
    allocationsService.getCurrentForLead(lead.id),
    allocationsService.getRecommendations(lead.id),
    allocationsService.getByLeadId(lead.id),
  ]);

  const associate = associates.find((a) => a.id === lead.assignedAssociateId) ?? null;

  return (
    <div className="space-y-6">
      <Link href="/leads" className="focus-ring text-sm text-ink-700/60 hover:text-ink-900">
        ← Back to Leads
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl text-ink-950 sm:text-3xl">{lead.buyerName}</h1>
              <TemperatureBadge temperature={lead.temperature} />
              {lead.qualificationScore !== null && (
                <span className="text-sm font-medium text-ink-700/70">Score: {lead.qualificationScore}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-700/60">
              {lead.leadId} · {lead.phone ?? "Not provided"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={lead.phone ? `tel:${lead.phone.replace(/\s/g, "")}` : undefined}
              className="focus-ring flex items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-900"
            >
              <Phone size={15} /> Call
            </a>
            <Link
              href={`/whatsapp/${lead.id}`}
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-gold-400/60"
            >
              <MessageCircle size={15} /> WhatsApp
            </Link>
            <Link
              href="/follow-ups"
              className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-gold-400/60"
            >
              <CalendarClock size={15} /> Follow-up
            </Link>
            <button className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-gold-400/60">
              <UserRound size={15} /> Assign
            </button>
            <button className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm font-medium text-ink-800 hover:border-gold-400/60">
              <Pencil size={15} /> Edit
            </button>
            <button className="focus-ring flex items-center rounded-lg border border-ink-900/15 bg-white px-2.5 py-2 text-ink-800 hover:border-gold-400/60">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Associate Assignment & AI Matching */}
          <AllocationCard
            lead={lead}
            currentAllocation={currentAllocation}
            recommendations={recommendations}
            allAssociates={associates}
            allocationHistory={allocationHistory}
          />

          <Section title="Buyer">
            <InfoField label="Name" value={lead.buyerName} />
            <InfoField label="Phone" value={lead.phone} />
            <InfoField label="Lead ID" value={lead.leadId} />
            <InfoField label="Source" value={lead.source} />
            <InfoField label="Created" value={formatDateTime(lead.createdAt)} />
            <InfoField label="Assigned Associate" value={associate?.name ?? null} />
          </Section>

          <Section title="Property Requirement">
            <InfoField label="Target Country" value={lead.country} />
            <InfoField label="Target City" value={lead.city} />
            <InfoField label="Preferred Area" value={lead.preferredArea} />
            <InfoField label="Property Type" value={lead.propertyType} />
            <InfoField label="Bedrooms" value={lead.bedrooms} />
            <InfoField label="Purchase Purpose" value={lead.purchasePurpose} />
            <InfoField label="Budget" value={formatBudgetRange(lead.budgetMin, lead.budgetMax, lead.currency)} />
            <InfoField label="Timeline" value={lead.purchaseTimeline} />
            <InfoField label="Key Requirements" value={lead.keyRequirements} />
          </Section>

          <Section title="Qualification">
            <InfoField label="Temperature" value={lead.temperature} />
            <InfoField label="Score" value={lead.qualificationScore ?? null} />
            <InfoField label="Completeness" value={lead.qualificationCompleteness ? `${lead.qualificationCompleteness}%` : null} />
            <InfoField label="Broker Follow-up Requested" value={lead.brokerFollowupRequested ? "Yes" : "No"} />
            <InfoField label="Call Outcome" value={lead.callOutcome} />
            <InfoField label="Preferred Callback" value={lead.preferredCallbackTime} />
          </Section>

          {/* Call Intelligence & Recording */}
          <div className="space-y-6">
            <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-900/10 pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">Voice AI & Call Intelligence</p>
                  <h3 className="mt-0.5 font-display text-lg text-ink-950">Call Analysis & Recording</h3>
                </div>
                {lead.callOutcome && (
                  <span className="rounded-full bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-600">
                    {lead.callOutcome}
                  </span>
                )}
              </div>

              {/* Recording Player */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-700/50">Latest Call Recording</p>
                {(() => {
                  const latestCallWithAudio =
                    calls.find((c) => c.recordingUrl || (c.transcript && c.transcript.length > 0)) ?? calls[0];
                  return (
                    <CallPlayer
                      recordingUrl={latestCallWithAudio?.recordingUrl ?? null}
                      transcript={latestCallWithAudio?.transcript ?? null}
                      durationSeconds={latestCallWithAudio?.durationSeconds ?? null}
                    />
                  );
                })()}
              </div>

              {/* AI Summary */}
              <div className="mt-5 rounded-lg border border-ink-900/10 bg-sand-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">AI Qualification Summary</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-900">
                  {lead.callSummary || calls[0]?.summary || "No AI summary is available for this lead yet."}
                </p>
                {lead.nextAction && (
                  <div className="mt-3 border-t border-ink-900/5 pt-2 text-xs text-ink-700/70">
                    <span className="font-medium text-ink-900">Next Action: </span>
                    {lead.nextAction}
                  </div>
                )}
              </div>

              {/* Transcript Preview if available */}
              {calls.some((c) => c.transcript && c.transcript.length > 0) && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-700/50">Call Transcript</p>
                  <TranscriptViewer transcript={calls.find((c) => c.transcript)?.transcript ?? null} />
                </div>
              )}
            </div>

            {/* Call History */}
            <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
              <h3 className="font-display text-base text-ink-950">Call History ({calls.length})</h3>
              {calls.length === 0 ? (
                <p className="mt-3 text-sm text-ink-700/55">No calls recorded for this lead yet.</p>
              ) : (
                <div className="mt-4 divide-y divide-ink-900/5">
                  {calls.map((call) => (
                    <div key={call.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <Link href={`/calls/${call.id}`} className="font-medium text-ink-950 hover:text-gold-600">
                            {formatDateTime(call.startedAt)}
                          </Link>
                          <p className="text-xs text-ink-700/55">
                            Duration: {formatDuration(call.durationSeconds)} · Agent: {call.agentName} · Call ID: {call.callId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CallStatusBadge status={call.status} />
                          {call.outcome && <span className="text-xs font-medium text-ink-700/70">{call.outcome}</span>}
                          <Link
                            href={`/calls/${call.id}`}
                            className="focus-ring rounded border border-ink-900/15 px-2 py-1 text-xs font-medium text-ink-800 hover:border-gold-400/60"
                          >
                            View Analysis →
                          </Link>
                        </div>
                      </div>
                      {(call.recordingUrl || (call.transcript && call.transcript.length > 0)) && (
                        <div className="mt-3">
                          <CallPlayer
                            recordingUrl={call.recordingUrl}
                            transcript={call.transcript}
                            durationSeconds={call.durationSeconds}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
            <h3 className="font-display text-base text-ink-950">Status</h3>
            <div className="mt-3 flex items-center gap-2">
              <StatusPill status={lead.status} />
            </div>
            <p className="mt-3 text-sm text-ink-700/65">{lead.nextAction ?? "No action recommended yet."}</p>
          </div>

          <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
            <h3 className="font-display text-base text-ink-950">Timeline</h3>
            <div className="mt-4">
              <Timeline events={timeline} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
