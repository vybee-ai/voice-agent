"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import LeadsTable from "@/components/tables/LeadsTable";
import { filterLeads, sortLeads, type LeadSortKey } from "@/lib/leadUtils";
import type { Lead, Associate, LeadStatus } from "@/lib/types";

const STATUSES: (LeadStatus | "all")[] = ["all", "New", "Contacted", "Qualified", "Follow-up", "Closed"];
const TEMPS = ["all", "HOT", "WARM", "COLD", "UNQUALIFIED"];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-700/60">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring rounded-lg border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LeadsExplorer({ leads, associates }: { leads: Lead[]; associates: Associate[] }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [temperature, setTemperature] = useState<string>(searchParams.get("temperature") ?? "all");
  const [propertyType, setPropertyType] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [timeline, setTimeline] = useState("all");
  const [associateId, setAssociateId] = useState("all");
  const [sortKey, setSortKey] = useState<LeadSortKey>("date");

  const propertyTypes = useMemo(
    () => ["all", ...Array.from(new Set(leads.map((l) => l.propertyType).filter(Boolean) as string[]))],
    [leads]
  );
  const purposes = useMemo(
    () => ["all", ...Array.from(new Set(leads.map((l) => l.purchasePurpose).filter(Boolean) as string[]))],
    [leads]
  );
  const timelines = useMemo(
    () => ["all", ...Array.from(new Set(leads.map((l) => l.purchaseTimeline).filter(Boolean) as string[]))],
    [leads]
  );

  const filtered = useMemo(() => {
    const result = filterLeads(leads, {
      search,
      status: status as any,
      temperature,
      propertyType,
      purpose,
      timeline,
      associateId,
    });
    return sortLeads(result, sortKey);
  }, [leads, search, status, temperature, propertyType, purpose, timeline, associateId, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-white p-4 shadow-card">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or lead ID..."
            className="focus-ring w-full rounded-lg border border-ink-900/15 bg-sand-50 py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-700/40"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
          <Select label="Temperature" value={temperature} onChange={setTemperature} options={TEMPS} />
          <Select label="Property Type" value={propertyType} onChange={setPropertyType} options={propertyTypes} />
          <Select label="Purpose" value={purpose} onChange={setPurpose} options={purposes} />
          <Select label="Timeline" value={timeline} onChange={setTimeline} options={timelines} />
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-700/60">
            Assigned To
            <select
              value={associateId}
              onChange={(e) => setAssociateId(e.target.value)}
              className="focus-ring rounded-lg border border-ink-900/15 bg-white px-2.5 py-1.5 text-sm text-ink-900"
            >
              <option value="all">All</option>
              {associates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(v) => setSortKey(v as LeadSortKey)}
            options={["date", "score", "name", "status", "followup"]}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-700/60">
          {filtered.length} lead{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <LeadsTable leads={filtered} associates={associates} />
    </div>
  );
}
