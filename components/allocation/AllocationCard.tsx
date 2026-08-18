"use client";

import { useState, useTransition } from "react";
import {
  UserCheck,
  UserPlus,
  Sparkles,
  CheckCircle2,
  XCircle,
  PhoneCall,
  History,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import type { Lead, Associate, ClientAllocation, MatchRecommendation } from "@/lib/types";
import {
  assignAssociateAction,
  acceptAllocationAction,
  declineAllocationAction,
  reassignAllocationAction,
  recordFirstContactAction,
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

export default function AllocationCard({
  lead,
  currentAllocation,
  recommendations,
  allAssociates,
  allocationHistory,
}: {
  lead: Lead;
  currentAllocation: ClientAllocation | null;
  recommendations: MatchRecommendation[];
  allAssociates: Associate[];
  allocationHistory: ClientAllocation[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedAssociateId, setSelectedAssociateId] = useState<string>("");
  const [reassignReason, setReassignReason] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const assignedAssociate = allAssociates.find((a) => a.id === lead.assignedAssociateId) ?? null;

  function showMessage(text: string, type: "success" | "error" = "success") {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  function handleAssign(associateId: string) {
    if (!associateId) return;
    startTransition(async () => {
      const res = await assignAssociateAction({
        leadId: lead.id,
        associateId,
        method: "RuleEngine",
      });
      if (res.success) {
        showMessage(`Lead successfully assigned to ${res.allocation?.associateName}`);
      } else {
        showMessage(res.error ?? "Failed to assign associate", "error");
      }
    });
  }

  function handleAccept() {
    if (!currentAllocation) return;
    startTransition(async () => {
      const res = await acceptAllocationAction(currentAllocation.id, lead.id);
      if (res.success) {
        showMessage("Assignment accepted by specialist");
      } else {
        showMessage(res.error ?? "Failed to accept", "error");
      }
    });
  }

  function handleDecline() {
    if (!currentAllocation || !declineReason.trim()) return;
    startTransition(async () => {
      const res = await declineAllocationAction(currentAllocation.id, declineReason, lead.id);
      setShowDeclineModal(false);
      setDeclineReason("");
      if (res.success) {
        showMessage("Assignment declined. Lead moved to unassigned queue.");
      } else {
        showMessage(res.error ?? "Failed to decline", "error");
      }
    });
  }

  function handleReassign() {
    if (!currentAllocation || !selectedAssociateId || !reassignReason.trim()) return;
    startTransition(async () => {
      const res = await reassignAllocationAction({
        currentAllocationId: currentAllocation.id,
        newAssociateId: selectedAssociateId,
        reason: reassignReason,
        leadId: lead.id,
      });
      setShowReassignModal(false);
      setReassignReason("");
      setSelectedAssociateId("");
      if (res.success) {
        showMessage(`Lead successfully reassigned to ${res.newAllocation?.associateName}`);
      } else {
        showMessage(res.error ?? "Failed to reassign", "error");
      }
    });
  }

  function handleFirstContact() {
    if (!currentAllocation) return;
    startTransition(async () => {
      const res = await recordFirstContactAction(currentAllocation.id, lead.id);
      if (res.success) {
        showMessage("First contact recorded successfully");
      } else {
        showMessage(res.error ?? "Failed to record contact", "error");
      }
    });
  }

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card space-y-5">
      <div className="flex items-center justify-between border-b border-ink-900/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-400/15 text-gold-600">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-display text-base text-ink-950">Associate Assignment & AI Matching</h3>
            <p className="text-xs text-ink-700/60">Automated candidate matching and client allocation history</p>
          </div>
        </div>
        {allocationHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="focus-ring flex items-center gap-1 text-xs font-medium text-ink-700/70 hover:text-ink-900"
          >
            <History size={13} />
            <span>History ({allocationHistory.length})</span>
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {notice && (
        <div
          className={clsx(
            "rounded-lg px-3 py-2 text-xs font-medium",
            notice.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-hot/10 text-hot border border-hot/20"
          )}
        >
          {notice.text}
        </div>
      )}

      {/* Current Allocation State */}
      <div className="rounded-xl border border-ink-900/10 bg-sand-50/60 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-700/50">Current Assignment</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-display text-lg font-medium text-ink-950">
                {assignedAssociate ? assignedAssociate.name : "Unassigned"}
              </span>
              {currentAllocation && (
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                    currentAllocation.status === "Accepted" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                    currentAllocation.status === "Assigned" && "bg-warm/10 text-warm border-warm/25 animate-pulse",
                    currentAllocation.status === "Contacted" && "bg-cold/10 text-cold border-cold/20",
                    currentAllocation.status === "Reassigned" && "bg-unqualified/10 text-unqualified border-unqualified/20"
                  )}
                >
                  {currentAllocation.status}
                </span>
              )}
            </div>
            {assignedAssociate && (
              <p className="mt-0.5 text-xs text-ink-700/60">
                {assignedAssociate.role} · {assignedAssociate.phone ?? "No phone"} · {assignedAssociate.currentActiveClients ?? 0}/
                {assignedAssociate.maxActiveCapacity ?? 15} Active Clients
              </p>
            )}
          </div>

          {/* Quick Actions for Current Allocation */}
          <div className="flex flex-wrap items-center gap-2">
            {currentAllocation?.status === "Assigned" && (
              <>
                <button
                  onClick={handleAccept}
                  disabled={isPending}
                  className="focus-ring flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 size={13} /> Accept
                </button>
                <button
                  onClick={() => setShowDeclineModal(true)}
                  disabled={isPending}
                  className="focus-ring flex items-center gap-1.5 rounded-lg border border-hot/30 bg-white px-2.5 py-1.5 text-xs font-medium text-hot hover:bg-hot/5 disabled:opacity-60"
                >
                  <XCircle size={13} /> Decline
                </button>
              </>
            )}

            {currentAllocation?.status === "Accepted" && (
              <button
                onClick={handleFirstContact}
                disabled={isPending}
                className="focus-ring flex items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-ink-900 disabled:opacity-60"
              >
                <PhoneCall size={13} /> Record First Contact
              </button>
            )}

            {currentAllocation && (
              <button
                onClick={() => setShowReassignModal(true)}
                disabled={isPending}
                className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 hover:border-gold-400/60 disabled:opacity-60"
              >
                <RefreshCw size={13} /> Reassign
              </button>
            )}
          </div>
        </div>

        {/* SLA and Timeline status */}
        {currentAllocation && (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-900/5 pt-2 sm:grid-cols-4 text-xs text-ink-700/60">
            <div>
              <span className="text-[10px] text-ink-700/40 uppercase font-medium">Assigned</span>
              <p className="text-ink-900 font-medium">{formatDateTime(currentAllocation.assignedAt)}</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-700/40 uppercase font-medium">Match Score</span>
              <p className="text-gold-600 font-semibold">{currentAllocation.matchScore}% Match</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-700/40 uppercase font-medium">Accepted At</span>
              <p className="text-ink-900">{formatDateTime(currentAllocation.acceptedAt)}</p>
            </div>
            <div>
              <span className="text-[10px] text-ink-700/40 uppercase font-medium">First Contact</span>
              <p className="text-ink-900">{formatDateTime(currentAllocation.firstContactAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="rounded-xl border border-hot/20 bg-hot/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-hot uppercase">Decline Lead Assignment</p>
          <input
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining (e.g. at capacity, out of area)..."
            className="focus-ring w-full rounded-lg border border-ink-900/15 bg-white px-3 py-1.5 text-xs text-ink-900"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeclineModal(false)}
              className="rounded px-2.5 py-1 text-xs text-ink-700/60 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              onClick={handleDecline}
              disabled={!declineReason.trim() || isPending}
              className="rounded bg-hot px-3 py-1 text-xs font-medium text-white hover:bg-hot/90 disabled:opacity-50"
            >
              Confirm Decline
            </button>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-ink-950 uppercase">Reassign Specialist</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-ink-700/70 flex flex-col gap-1">
              Select New Specialist
              <select
                value={selectedAssociateId}
                onChange={(e) => setSelectedAssociateId(e.target.value)}
                className="focus-ring rounded-lg border border-ink-900/15 bg-white px-2.5 py-1.5 text-xs text-ink-900"
              >
                <option value="">Choose an associate...</option>
                {allAssociates
                  .filter((a) => a.id !== lead.assignedAssociateId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currentActiveClients ?? 0}/{a.maxActiveCapacity ?? 15} Clients)
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs text-ink-700/70 flex flex-col gap-1">
              Reassignment Reason
              <input
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Reason (e.g. buyer preferred area specialist)..."
                className="focus-ring rounded-lg border border-ink-900/15 bg-white px-3 py-1.5 text-xs text-ink-900"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowReassignModal(false)}
              className="rounded px-2.5 py-1 text-xs text-ink-700/60 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              onClick={handleReassign}
              disabled={!selectedAssociateId || !reassignReason.trim() || isPending}
              className="rounded bg-ink-950 px-3 py-1 text-xs font-medium text-white hover:bg-ink-900 disabled:opacity-50"
            >
              Confirm Reassignment
            </button>
          </div>
        </div>
      )}

      {/* AI Recommendations List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
            Top Matching Specialists ({recommendations.filter((r) => r.eligible).length} Eligible)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendations.slice(0, 4).map((rec) => {
            const isAssigned = rec.associate.id === lead.assignedAssociateId;
            return (
              <div
                key={rec.associate.id}
                className={clsx(
                  "rounded-xl border p-4 transition",
                  isAssigned
                    ? "border-gold-400/50 bg-gold-400/5 shadow-sm"
                    : rec.eligible
                    ? "border-ink-900/10 bg-white hover:border-gold-400/40"
                    : "border-ink-900/5 bg-sand-50/40 opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-sm font-medium text-ink-950">{rec.associate.name}</p>
                    <p className="text-xs text-ink-700/60">{rec.associate.role}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                        rec.score >= 85
                          ? "bg-gold-400/20 text-gold-700"
                          : rec.score >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-ink-900/5 text-ink-700"
                      )}
                    >
                      {rec.score}% Match
                    </span>
                  </div>
                </div>

                {/* Match Factors Badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rec.factors
                    .filter((f) => f.matched)
                    .slice(0, 3)
                    .map((factor) => (
                      <span
                        key={factor.signal}
                        className="inline-flex items-center rounded-md bg-sand-100 px-2 py-0.5 text-[11px] text-ink-800"
                        title={factor.detail}
                      >
                        ✓ {factor.signal}: {factor.score}pts
                      </span>
                    ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-ink-900/5 pt-2 text-xs">
                  <span className="text-ink-700/50">
                    {rec.associate.currentActiveClients ?? 0}/{rec.associate.maxActiveCapacity ?? 15} Clients
                  </span>

                  {!isAssigned && rec.eligible && (
                    <button
                      onClick={() => handleAssign(rec.associate.id)}
                      disabled={isPending}
                      className="focus-ring flex items-center gap-1 rounded-md bg-ink-950 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-900 disabled:opacity-50"
                    >
                      <UserPlus size={12} /> Assign
                    </button>
                  )}

                  {isAssigned && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-600">
                      <UserCheck size={13} /> Active Specialist
                    </span>
                  )}

                  {!rec.eligible && (
                    <span className="text-xs text-hot flex items-center gap-1">
                      <AlertCircle size={11} /> {rec.ineligibilityReason ?? "Ineligible"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapsible Allocation History */}
      {showHistory && allocationHistory.length > 0 && (
        <div className="border-t border-ink-900/10 pt-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">Assignment Audit Log</p>
          <div className="divide-y divide-ink-900/5 rounded-lg border border-ink-900/10 bg-sand-50/40 text-xs">
            {allocationHistory.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-950">{item.associateName}</span>
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.2 text-[10px] font-medium border",
                        item.status === "Completed" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        item.status === "Reassigned" && "bg-unqualified/10 text-unqualified border-unqualified/20",
                        item.status === "Declined" && "bg-hot/10 text-hot border-hot/20",
                        item.status === "Accepted" && "bg-gold-400/10 text-gold-700 border-gold-400/20"
                      )}
                    >
                      {item.status}
                    </span>
                    <span className="text-ink-700/40 text-[11px]">{item.allocationMethod}</span>
                  </div>
                  {item.reassignmentReason && (
                    <p className="mt-1 text-ink-700/60 italic">Reassignment reason: {item.reassignmentReason}</p>
                  )}
                  {item.declineReason && (
                    <p className="mt-1 text-hot italic">Decline reason: {item.declineReason}</p>
                  )}
                  {item.outcomeNotes && (
                    <p className="mt-0.5 text-ink-700/50">{item.outcomeNotes}</p>
                  )}
                </div>
                <div className="text-right text-ink-700/45 shrink-0">
                  <p>{formatDateTime(item.assignedAt)}</p>
                  <p className="text-gold-600 font-medium">{item.matchScore}% Score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
