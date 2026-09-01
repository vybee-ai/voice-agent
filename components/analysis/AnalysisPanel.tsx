import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { TemperatureBadge } from "@/components/status-badge/StatusBadge";
import type { Call } from "@/lib/types";

export default function AnalysisPanel({ call }: { call: Call }) {
  const hasAnalysis = Boolean(call.summary || call.score !== null || call.analysisId);
  const isProcessing = call.status === "Answered" && !hasAnalysis;
  const isNoAnswer = call.status === "No Answer" || call.status === "Failed";

  return (
    <div className="space-y-4">
      {/* Explicit Analysis Pipeline Status Banner */}
      {isProcessing && (
        <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gold-700">
            <Loader2 size={16} className="animate-spin text-gold-500" />
            <span>AI Call Analysis in Progress</span>
          </div>
          <p className="mt-1 text-xs text-ink-700/60">
            Voice AI agent is extracting buyer requirements, qualification scores, and recommended actions.
          </p>
        </div>
      )}

      {isNoAnswer && !hasAnalysis && (
        <div className="rounded-xl border border-ink-900/10 bg-sand-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <AlertCircle size={16} className="text-ink-700/45" />
            <span>Analysis Unavailable</span>
          </div>
          <p className="mt-1 text-xs text-ink-700/55">
            Call was {call.status.toLowerCase()}. Analysis is generated for answered AI voice conversations.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base text-ink-950">Qualification Summary</h3>
          {hasAnalysis && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-600">
              <Sparkles size={13} /> Verified
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-800">
          {call.summary ?? (isProcessing ? "Extracting summary from voice recording..." : "No AI summary is available for this call.")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-ink-900/10 bg-white p-4 text-center shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">Buyer Intent</p>
          <div className="mt-2 flex justify-center">
            {call.temperature ? <TemperatureBadge temperature={call.temperature} /> : <span className="text-sm text-ink-700/40">Not provided</span>}
          </div>
        </div>
        <div className="rounded-xl border border-ink-900/10 bg-white p-4 text-center shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">Score</p>
          <p className="mt-1 font-display text-2xl text-ink-950">{call.score ?? "—"}<span className="text-sm text-ink-700/40">/100</span></p>
        </div>
        <div className="col-span-2 rounded-xl border border-ink-900/10 bg-white p-4 shadow-card sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">Call Outcome</p>
          <p className="mt-1 text-sm font-medium text-ink-950">{call.outcome ?? "Not provided"}</p>
        </div>
      </div>

      {call.scoreBreakdown && call.scoreBreakdown.length > 0 ? (
        <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
          <h3 className="font-display text-base text-ink-950">Score Breakdown</h3>
          <div className="mt-3 space-y-2.5">
            {call.scoreBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-ink-700/60">
                  <span>{item.label}</span>
                  <span>
                    {item.score} / {item.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-ink-900/8">
                  <div
                    className="h-1.5 rounded-full bg-gold-400"
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink-900/10 pt-2 text-sm font-semibold text-ink-950">
              <span>Total</span>
              <span>{call.score ?? "—"} / 100</span>
            </div>
          </div>
        </div>
      ) : (
        call.score !== null && (
          <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
            <h3 className="font-display text-base text-ink-950">Score Breakdown</h3>
            <p className="mt-2 text-sm text-ink-700/55">Component-level scoring isn&apos;t available for this call — showing total score only.</p>
            <p className="mt-2 font-display text-2xl text-ink-950">{call.score} / 100</p>
          </div>
        )
      )}

      <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-5">
        <h3 className="font-display text-base text-ink-950">Recommended Next Action</h3>
        <p className="mt-2 text-sm text-ink-800">{call.recommendedNextAction ?? "Not provided"}</p>
      </div>
    </div>
  );
}

