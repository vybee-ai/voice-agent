import Link from "next/link";
import {
  UserPlus,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  BadgeCheck,
  CalendarClock,
  ArrowRight,
  MessageCircle,
  UserRound,
  CalendarCheck,
} from "lucide-react";
import KpiCard from "@/components/kpi/KpiCard";
import { TemperatureBadge, StatusPill } from "@/components/status-badge/StatusBadge";
import { leadsService } from "@/services/leadsService";
import { activityService } from "@/services/activityService";
import { associatesService } from "@/services/associatesService";
import { EmptyState } from "@/components/common/States";
import type { LeadStatus } from "@/lib/types";

const PIPELINE_STAGES: LeadStatus[] = ["New", "Contacted", "Qualified", "Follow-up", "Closed"];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default async function DashboardPage() {
  const [stats, needsAttention, activity, associates] = await Promise.all([
    leadsService.getDashboardStats(),
    leadsService.getNeedsAttention(),
    activityService.getRecent(8),
    associatesService.getAll(),
  ]);

  const associateName = (id: string | null) => associates.find((a) => a.id === id)?.name ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Good morning, Admin</h1>
        <p className="mt-1 text-sm text-ink-700/65">Here&apos;s what&apos;s happening with your leads today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="New Leads" value={stats.newLeads} icon={UserPlus} href="/leads?status=New" />
        <KpiCard label="Calls Completed" value={stats.callsCompleted} icon={PhoneCall} href="/calls" accent="cold" />
        <KpiCard label="Calls Answered" value={stats.callsAnswered} icon={PhoneIncoming} href="/calls?status=Answered" accent="gold" />
        <KpiCard label="Qualified Leads" value={stats.qualifiedLeads} icon={BadgeCheck} href="/leads?status=Qualified" accent="gold" />
        <KpiCard label="Needs Allocation" value={stats.unassignedQualifiedLeads ?? 0} icon={UserRound} href="/allocations" accent="hot" />
        <KpiCard label="Follow-ups Due" value={stats.followUpsDue} icon={CalendarClock} href="/follow-ups" accent="hot" />
      </div>

      {/* Allocation Action Alert if unassigned leads exist */}
      {(stats.unassignedQualifiedLeads ?? 0) > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-hot/30 bg-hot/5 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hot/10 text-hot">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-950">
                {stats.unassignedQualifiedLeads} Qualified Lead{stats.unassignedQualifiedLeads === 1 ? "" : "s"} Awaiting Specialist Allocation
              </p>
              <p className="text-xs text-ink-700/60">
                AI voice agent completed qualification. Match and dispatch to property specialists.
              </p>
            </div>
          </div>
          <Link
            href="/allocations"
            className="focus-ring flex items-center justify-center gap-1.5 rounded-lg bg-ink-950 px-3.5 py-2 text-xs font-medium text-white shadow-card hover:bg-ink-900 shrink-0"
          >
            Dispatch Leads <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline */}
        <div className="lg:col-span-2 rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg text-ink-950">Lead Pipeline</h2>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {PIPELINE_STAGES.map((stage, i) => (
              <Link
                key={stage}
                href={`/leads?status=${encodeURIComponent(stage)}`}
                className="focus-ring group flex flex-col items-center gap-2 rounded-lg border border-ink-900/8 bg-sand-50 px-2 py-4 text-center transition hover:border-gold-400/50 hover:bg-gold-400/5"
              >
                <span className="font-display text-2xl text-ink-950">{stats.pipeline[stage] ?? 0}</span>
                <span className="text-xs font-medium text-ink-700/65">{stage}</span>
                {i < PIPELINE_STAGES.length - 1 && (
                  <ArrowRight size={12} className="mt-1 hidden text-ink-700/25 sm:block" />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-lg text-ink-950">Recent Activity</h2>
          <ul className="mt-4 space-y-3">
            {activity.length === 0 && <p className="text-sm text-ink-700/55">No recent activity.</p>}
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                <div>
                  <p className="text-ink-900">
                    {a.label}
                    {a.leadName && <span className="text-ink-700/60"> — {a.leadName}</span>}
                  </p>
                  <p className="text-xs text-ink-700/45">{timeAgo(a.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Needs attention */}
      <div>
        <h2 className="font-display text-lg text-ink-950">Needs Attention</h2>
        <p className="mb-4 text-sm text-ink-700/60">Leads that need action from your team right now.</p>
        {needsAttention.length === 0 ? (
          <EmptyState title="You're all caught up" description="No leads currently need attention." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {needsAttention.map((lead) => {
              const action = leadsService.nextActionLabel(lead);
              const actionHref =
                action === "Send WhatsApp"
                  ? `/whatsapp/${lead.id}`
                  : action === "View Schedule"
                  ? "/follow-ups"
                  : `/leads/${lead.id}`;
              const ActionIcon =
                action === "Send WhatsApp" ? MessageCircle : action === "Assign Associate" ? UserRound : action === "View Schedule" ? CalendarCheck : ArrowRight;
              return (
                <div key={lead.id} className="rounded-xl border border-ink-900/10 bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="focus-ring font-medium text-ink-950 hover:text-gold-600">
                        {lead.buyerName}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-700/55">{lead.leadId}</p>
                    </div>
                    <TemperatureBadge temperature={lead.temperature} />
                  </div>
                  <p className="mt-3 text-sm text-ink-700/70">
                    {lead.callOutcome ?? "Awaiting action"}
                    {lead.assignedAssociateId === null && lead.temperature === "HOT" && " · Unassigned"}
                  </p>
                  <Link
                    href={actionHref}
                    className="focus-ring mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-500"
                  >
                    <ActionIcon size={14} /> {action}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
