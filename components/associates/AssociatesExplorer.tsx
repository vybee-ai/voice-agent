"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, MapPin, Building2, Globe, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import type { Associate, AssociateAvailability, Lead } from "@/lib/types";
import { updateAssociateAvailabilityAction } from "@/app/(crm)/actions/allocationActions";

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "No recent activity";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AssociatesExplorer({
  associates,
  leads,
}: {
  associates: Associate[];
  leads: Lead[];
}) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return associates.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter && a.availability !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = a.name.toLowerCase().includes(q);
        const roleMatch = a.role.toLowerCase().includes(q);
        const territoryMatch = (a.territories ?? []).some((t) => t.toLowerCase().includes(q));
        const langMatch = (a.languages ?? []).some((l) => l.toLowerCase().includes(q));
        return nameMatch || roleMatch || territoryMatch || langMatch;
      }
      return true;
    });
  }, [associates, search, statusFilter]);

  function handleAvailabilityChange(associateId: string, availability: AssociateAvailability) {
    startTransition(async () => {
      await updateAssociateAvailabilityAction(associateId, availability);
    });
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search specialists by name, territory (e.g. Marina), or language..."
            className="focus-ring w-full rounded-lg border border-ink-900/15 bg-sand-50 py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-700/40"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["all", "Active", "Available", "Away", "Offline"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={clsx(
                "focus-ring rounded-lg px-3 py-1.5 text-xs font-medium transition",
                statusFilter === filter
                  ? "bg-ink-950 text-white"
                  : "border border-ink-900/10 bg-white text-ink-700/70 hover:bg-sand-50"
              )}
            >
              {filter === "all" ? "All Specialists" : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Associates */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-700/55 shadow-card">
          No specialists match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const assignedLeads = leads.filter((l) => l.assignedAssociateId === a.id);
            const activeCount = a.currentActiveClients ?? assignedLeads.filter((l) => l.status !== "Closed").length;
            const maxCap = a.maxActiveCapacity ?? 15;
            const capRatio = activeCount / maxCap;

            return (
              <div key={a.id} className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg text-ink-950">{a.name}</p>
                    <p className="text-xs text-ink-700/60">{a.role} {a.employeeCode ? `· ${a.employeeCode}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <select
                      value={a.availability ?? (a.status === "Active" ? "Available" : a.status)}
                      onChange={(e) => handleAvailabilityChange(a.id, e.target.value as AssociateAvailability)}
                      disabled={isPending}
                      className={clsx(
                        "focus-ring rounded-full border px-2 py-0.5 text-[11px] font-medium appearance-none cursor-pointer text-center",
                        (a.availability === "Available" || a.status === "Active") && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        (a.availability === "Busy" || a.status === "Away") && "bg-warm/10 text-warm border-warm/20",
                        (a.availability === "Offline" || a.status === "Offline") && "bg-unqualified/10 text-unqualified border-unqualified/25"
                      )}
                    >
                      <option value="Available">● Available</option>
                      <option value="Busy">● Busy</option>
                      <option value="Away">● Away</option>
                      <option value="On Leave">● On Leave</option>
                      <option value="Offline">● Offline</option>
                    </select>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div>
                  <div className="flex justify-between text-xs text-ink-700/60 mb-1">
                    <span>Active Workload</span>
                    <span className="font-medium text-ink-900">
                      {activeCount} / {maxCap} Clients
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-900/8">
                    <div
                      className={clsx(
                        "h-2 rounded-full transition-all",
                        capRatio < 0.5 ? "bg-emerald-500" : capRatio < 0.85 ? "bg-gold-400" : "bg-hot"
                      )}
                      style={{ width: `${Math.min(100, Math.max(8, capRatio * 100))}%` }}
                    />
                  </div>
                </div>

                {/* KPI counters */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-sand-50 py-2">
                    <p className="font-display text-lg text-ink-950">{a.leadsAssigned}</p>
                    <p className="text-[10px] uppercase font-medium text-ink-700/50">Total Leads</p>
                  </div>
                  <div className="rounded-lg bg-hot/5 py-2">
                    <p className="font-display text-lg text-hot">{a.hotLeads}</p>
                    <p className="text-[10px] uppercase font-medium text-ink-700/50">HOT Deals</p>
                  </div>
                  <div className="rounded-lg bg-gold-400/10 py-2">
                    <p className="font-display text-lg text-gold-600">
                      {a.historicalConversionRate ?? 15}%
                    </p>
                    <p className="text-[10px] uppercase font-medium text-ink-700/50">Conversion</p>
                  </div>
                </div>

                {/* Territories & Languages */}
                <div className="space-y-1.5 text-xs">
                  {a.territories && a.territories.length > 0 && (
                    <div className="flex items-start gap-1.5 text-ink-700/70">
                      <MapPin size={13} className="shrink-0 mt-0.5 text-gold-500" />
                      <span className="truncate">{a.territories.join(", ")}</span>
                    </div>
                  )}
                  {a.propertyTypes && a.propertyTypes.length > 0 && (
                    <div className="flex items-start gap-1.5 text-ink-700/70">
                      <Building2 size={13} className="shrink-0 mt-0.5 text-ink-700/40" />
                      <span className="truncate">{a.propertyTypes.join(", ")}</span>
                    </div>
                  )}
                  {a.languages && a.languages.length > 0 && (
                    <div className="flex items-start gap-1.5 text-ink-700/70">
                      <Globe size={13} className="shrink-0 mt-0.5 text-ink-700/40" />
                      <span>{a.languages.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Leads preview */}
                {assignedLeads.length > 0 && (
                  <div className="border-t border-ink-900/8 pt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-700/45">
                      Active Assigned Clients
                    </p>
                    <ul className="space-y-1 text-xs text-ink-800">
                      {assignedLeads.slice(0, 3).map((l) => (
                        <li key={l.id} className="flex justify-between">
                          <Link href={`/leads/${l.id}`} className="hover:text-gold-600 truncate font-medium">
                            {l.buyerName}
                          </Link>
                          <span className="text-ink-700/40 shrink-0 ml-2">{l.temperature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-ink-700/45 pt-1">
                  <span>{timeAgo(a.lastActivityAt)}</span>
                  {a.averageResponseMinutes && <span>Avg. ~{a.averageResponseMinutes}m response</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
