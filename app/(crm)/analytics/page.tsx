import { analyticsService } from "@/services/analyticsService";
import KpiCard from "@/components/kpi/KpiCard";
import { Percent, Flame, ThermometerSun, Snowflake, PhoneMissed, CalendarClock, Timer, Users, UserCheck, ShieldCheck, Zap } from "lucide-react";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default async function AnalyticsPage() {
  const data = await analyticsService.getAnalytics();
  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1);
  const alloc = data.allocationStats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Analytics</h1>
        <p className="mt-1 text-sm text-ink-700/65">How leads move through qualification, allocation, and follow-up.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total Leads" value={data.totalLeads} icon={Users} />
        <KpiCard label="Answer Rate" value={`${data.answerRate}%`} icon={Percent} accent="cold" />
        <KpiCard label="Qualification Rate" value={`${data.qualificationRate}%`} icon={Percent} accent="gold" />
        <KpiCard label="No-Answer Rate" value={`${data.noAnswerRate}%`} icon={PhoneMissed} accent="hot" />
        <KpiCard label="HOT Leads" value={data.hotLeads} icon={Flame} accent="hot" />
        <KpiCard label="WARM Leads" value={data.warmLeads} icon={ThermometerSun} accent="gold" />
        <KpiCard label="COLD Leads" value={data.coldLeads} icon={Snowflake} accent="cold" />
        <KpiCard label="Avg. Call Duration" value={formatDuration(data.avgCallDurationSeconds)} icon={Timer} />
      </div>

      {/* Allocation SLA & Velocity */}
      {alloc && (
        <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card space-y-4">
          <div>
            <h2 className="font-display text-lg text-ink-950">Allocation Velocity & SLA Benchmarks</h2>
            <p className="text-xs text-ink-700/60 mt-0.5">Response times and specialist outreach efficiency</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-sand-50/70 p-4 border border-ink-900/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-700/60 uppercase">
                <Zap size={14} className="text-gold-500" /> Avg. Time to Assignment
              </div>
              <p className="font-display text-2xl text-ink-950 mt-2">{alloc.avgAssignmentMinutes} mins</p>
              <p className="text-xs text-ink-700/50 mt-1">From qualification completion to specialist dispatch</p>
            </div>
            <div className="rounded-xl bg-sand-50/70 p-4 border border-ink-900/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-700/60 uppercase">
                <Timer size={14} className="text-cold" /> Avg. Time to First Contact
              </div>
              <p className="font-display text-2xl text-ink-950 mt-2">{alloc.avgFirstContactMinutes} mins</p>
              <p className="text-xs text-ink-700/50 mt-1">From assignment acceptance to specialist outreach</p>
            </div>
            <div className="rounded-xl bg-sand-50/70 p-4 border border-ink-900/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-700/60 uppercase">
                <ShieldCheck size={14} className="text-emerald-600" /> SLA Breach Rate
              </div>
              <p className="font-display text-2xl text-emerald-700 mt-2">{alloc.slaBreachRate}%</p>
              <p className="text-xs text-ink-700/50 mt-1">Assignments breaching 30-minute acceptance SLA</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
        <h2 className="font-display text-lg text-ink-950">Funnel</h2>
        <div className="mt-5 space-y-3">
          {data.funnel.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-ink-700/65">{stage.stage}</span>
              <div className="h-6 flex-1 rounded-md bg-ink-900/5">
                <div
                  className="flex h-6 items-center rounded-md bg-gold-400 px-2 text-xs font-semibold text-ink-950"
                  style={{ width: `${Math.max((stage.count / maxFunnel) * 100, 6)}%` }}
                >
                  {stage.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
        <h2 className="font-display text-lg text-ink-950">Follow-up Rate</h2>
        <p className="mt-2 text-sm text-ink-700/65">
          <span className="font-display text-2xl text-ink-950">{data.followUpRate}%</span> of leads currently have a follow-up scheduled or overdue.
        </p>
      </div>
    </div>
  );
}
