"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  UserCheck,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import clsx from "clsx";
import type { Lead, Associate, ClientAllocation } from "@/lib/types";
import { rankAssociateRecommendations } from "@/lib/allocationEngine";
import { formatBudgetRange } from "@/lib/marketConfig";
import { TemperatureBadge, StatusPill } from "@/components/status-badge/StatusBadge";
import {
  assignAssociateAction,
  acceptAllocationAction,
  declineAllocationAction,
  reassignAllocationAction,
} from "@/app/(crm)/actions/allocationActions";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  });
}

export default function AllocationsQueue({
  unassignedLeads,
  allLeads,
  associates,
  allocations,
}: {
  unassignedLeads: Lead[];
  allLeads: Lead[];
  associates: Associate[];
  allocations: ClientAllocation[];
}) {
  const [tab, setTab] = useState<"unassigned" | "pending" | "all">("unassigned");
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const pendingAllocations = useMemo(
    () => allocations.filter((a) => a.status === "Assigned" && a.isCurrent),
    [allocations]
  );

  function showMessage(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(null), 4000);
  }

  function handleAssign(leadId: string, associateId: string) {
    startTransition(async () => {
      const res = await assignAssociateAction({ leadId, associateId, method: "RuleEngine" });
      if (res.success) {
        showMessage(`Lead successfully assigned to ${res.allocation?.associateName}`);
      } else {
        showMessage(res.error ?? "Failed to assign lead");
      }
    });
  }

  function handleAccept(allocationId: string, leadId: string) {
    startTransition(async () => {
      const res = await acceptAllocationAction(allocationId, leadId);
      if (res.success) {
        showMessage("Assignment accepted by specialist");
      }
    });
  }

  function handleDecline(allocationId: string, leadId: string) {
    startTransition(async () => {
      const res = await declineAllocationAction(allocationId, "Declined from triage queue", leadId);
      if (res.success) {
        showMessage("Assignment declined. Lead moved to unassigned pool.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-4 py-2.5 text-sm font-medium text-gold-800 shadow-sm">
          {notice}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-ink-900/10 bg-white p-1 shadow-card">
          <button
            onClick={() => setTab("unassigned")}
            className={clsx(
              "focus-ring rounded-md px-3.5 py-1.5 text-xs font-medium transition flex items-center gap-1.5",
              tab === "unassigned" ? "bg-ink-950 text-white" : "text-ink-700/65 hover:bg-sand-50"
            )}
          >
            <span>Unassigned Qualified</span>
            <span className="rounded-full bg-hot/20 px-1.5 py-0.2 text-[10px] text-hot font-semibold">
              {unassignedLeads.length}
            </span>
          </button>
          <button
            onClick={() => setTab("pending")}
            className={clsx(
              "focus-ring rounded-md px-3.5 py-1.5 text-xs font-medium transition flex items-center gap-1.5",
              tab === "pending" ? "bg-ink-950 text-white" : "text-ink-700/65 hover:bg-sand-50"
            )}
          >
            <span>Pending Acceptance</span>
            <span className="rounded-full bg-warm/20 px-1.5 py-0.2 text-[10px] text-warm font-semibold">
              {pendingAllocations.length}
            </span>
          </button>
          <button
            onClick={() => setTab("all")}
            className={clsx(
              "focus-ring rounded-md px-3.5 py-1.5 text-xs font-medium transition",
              tab === "all" ? "bg-ink-950 text-white" : "text-ink-700/65 hover:bg-sand-50"
            )}
          >
            All Allocation Records ({allocations.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Unassigned Qualified Leads */}
      {tab === "unassigned" && (
        <div className="space-y-4">
          {unassignedLeads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-700/55 shadow-card">
              All qualified leads have been assigned to property specialists!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {unassignedLeads.map((lead) => {
                const recommendations = rankAssociateRecommendations(lead, associates);
                const topRec = recommendations.find((r) => r.eligible);

                return (
                  <div
                    key={lead.id}
                    className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card space-y-4 hover:border-gold-400/40 transition"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-display text-lg text-ink-950 hover:text-gold-600 font-medium"
                          >
                            {lead.buyerName}
                          </Link>
                          <TemperatureBadge temperature={lead.temperature} />
                          <span className="text-xs font-medium text-ink-700/60">Score: {lead.qualificationScore ?? "—"}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-700/60">
                          {lead.leadId} · {lead.preferredArea ?? lead.city} · {lead.propertyType ?? "Property"} ·{" "}
                          {formatBudgetRange(lead.budgetMin, lead.budgetMax)}
                        </p>
                        {lead.callSummary && (
                          <p className="mt-2 text-xs text-ink-800 leading-relaxed max-w-3xl">
                            &ldquo;{lead.callSummary}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Top Match recommendation badge */}
                      {topRec ? (
                        <div className="rounded-xl border border-gold-400/40 bg-gold-400/5 p-3 sm:min-w-[280px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-gold-700 flex items-center gap-1">
                              <Sparkles size={13} /> Recommended Match
                            </span>
                            <span className="font-bold text-ink-950">{topRec.score}%</span>
                          </div>
                          <p className="font-display text-sm font-medium text-ink-950">{topRec.associate.name}</p>
                          <p className="text-[11px] text-ink-700/60">
                            {topRec.associate.role} · {topRec.associate.currentActiveClients ?? 0}/{topRec.associate.maxActiveCapacity ?? 15} Clients
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {topRec.factors
                              .filter((f) => f.matched)
                              .slice(0, 2)
                              .map((f) => (
                                <span key={f.signal} className="rounded bg-sand-100 px-1.5 py-0.5 text-[10px] text-ink-800">
                                  ✓ {f.signal}
                                </span>
                              ))}
                          </div>
                          <button
                            onClick={() => handleAssign(lead.id, topRec.associate.id)}
                            disabled={isPending}
                            className="focus-ring mt-3 w-full rounded-lg bg-ink-950 py-1.5 text-xs font-medium text-white hover:bg-ink-900 disabled:opacity-50"
                          >
                            Assign to {topRec.associate.name}
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-hot flex items-center gap-1">
                          No specialists currently available below capacity
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Acceptance */}
      {tab === "pending" && (
        <div className="space-y-4">
          {pendingAllocations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-700/55 shadow-card">
              No pending allocations waiting for specialist acceptance.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pendingAllocations.map((alloc) => (
                <div key={alloc.id} className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/leads/${alloc.leadId}`} className="font-display text-base text-ink-950 hover:text-gold-600 font-medium">
                        {alloc.leadName}
                      </Link>
                      <p className="text-xs text-ink-700/60">Assigned to: <span className="font-medium text-ink-950">{alloc.associateName}</span></p>
                    </div>
                    <span className="rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm border border-warm/20 animate-pulse">
                      Pending Acceptance
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-ink-700/60 border-y border-ink-900/5 py-2">
                    <div>
                      <span className="text-[10px] text-ink-700/40 uppercase">Assigned At</span>
                      <p className="text-ink-900">{formatDateTime(alloc.assignedAt)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-700/40 uppercase">Accept Deadline</span>
                      <p className="text-hot font-medium">{formatDateTime(alloc.acceptDeadlineAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleAccept(alloc.id, alloc.leadId)}
                      disabled={isPending}
                      className="focus-ring flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={13} /> Accept on Behalf
                    </button>
                    <button
                      onClick={() => handleDecline(alloc.id, alloc.leadId)}
                      disabled={isPending}
                      className="focus-ring flex items-center gap-1 rounded-lg border border-hot/30 bg-white px-2.5 py-1.5 text-xs font-medium text-hot hover:bg-hot/5"
                    >
                      <XCircle size={13} /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: All Allocation Records Table */}
      {tab === "all" && (
        <div className="overflow-x-auto rounded-xl border border-ink-900/10 bg-white shadow-card">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wide text-ink-700/50">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Specialist</th>
                <th className="px-4 py-3 font-medium">Match Score</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned At</th>
                <th className="px-4 py-3 font-medium">Accepted At</th>
                <th className="px-4 py-3 font-medium">First Contact</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => (
                <tr key={alloc.id} className="border-b border-ink-900/5 last:border-0 hover:bg-sand-50 text-xs">
                  <td className="px-4 py-3 font-medium text-ink-950">
                    <Link href={`/leads/${alloc.leadId}`} className="hover:text-gold-600">
                      {alloc.leadName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-900 font-medium">{alloc.associateName}</td>
                  <td className="px-4 py-3 text-gold-600 font-semibold">{alloc.matchScore}%</td>
                  <td className="px-4 py-3 text-ink-700/60">{alloc.allocationMethod}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "rounded px-2 py-0.5 text-[11px] font-medium border",
                        alloc.status === "Completed" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        alloc.status === "Accepted" && "bg-gold-400/10 text-gold-700 border-gold-400/20",
                        alloc.status === "Assigned" && "bg-warm/10 text-warm border-warm/20",
                        alloc.status === "Contacted" && "bg-cold/10 text-cold border-cold/20",
                        alloc.status === "Declined" && "bg-hot/10 text-hot border-hot/20",
                        alloc.status === "Reassigned" && "bg-unqualified/10 text-unqualified border-unqualified/20"
                      )}
                    >
                      {alloc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-700/60">{formatDateTime(alloc.assignedAt)}</td>
                  <td className="px-4 py-3 text-ink-700/60">{formatDateTime(alloc.acceptedAt)}</td>
                  <td className="px-4 py-3 text-ink-700/60">{formatDateTime(alloc.firstContactAt)}</td>
                  <td className="px-4 py-3 text-ink-700/50 max-w-[200px] truncate">
                    {alloc.outcomeNotes || alloc.reassignmentReason || alloc.declineReason || "—"}
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
