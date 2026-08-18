"use client";

import Link from "next/link";
import { TemperatureBadge, StatusPill } from "@/components/status-badge/StatusBadge";
import { formatBudgetRange } from "@/lib/marketConfig";
import { nextActionLabel } from "@/lib/leadUtils";
import type { Lead, Associate } from "@/lib/types";

function formatDate(iso: string | null) {
  if (!iso) return "Not provided";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dubai" });
}

export default function LeadsTable({ leads, associates }: { leads: Lead[]; associates: Associate[] }) {
  const associateName = (id: string | null) => associates.find((a) => a.id === id)?.name ?? "Unassigned";

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-700/55 shadow-card">
        No leads match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-900/10 bg-white shadow-card">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-wide text-ink-700/50">
            <th className="px-4 py-3 font-medium">Lead</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Property</th>
            <th className="px-4 py-3 font-medium">Purpose</th>
            <th className="px-4 py-3 font-medium">Budget</th>
            <th className="px-4 py-3 font-medium">Timeline</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Temp</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
            <th className="px-4 py-3 font-medium">Last Contact</th>
            <th className="px-4 py-3 font-medium">Next Action</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-ink-900/5 last:border-0 hover:bg-sand-50">
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="focus-ring font-medium text-ink-950 hover:text-gold-600">
                  {lead.buyerName}
                </Link>
                <p className="text-xs text-ink-700/50">{lead.leadId}</p>
              </td>
              <td className="px-4 py-3 text-ink-800">{lead.phone ?? "Not provided"}</td>
              <td className="px-4 py-3 text-ink-800">{lead.preferredArea ?? lead.city}</td>
              <td className="px-4 py-3 text-ink-800">
                {lead.propertyType ?? "Not provided"}
                {lead.bedrooms ? ` · ${lead.bedrooms}` : ""}
              </td>
              <td className="px-4 py-3 text-ink-800">{lead.purchasePurpose}</td>
              <td className="px-4 py-3 text-ink-800">{formatBudgetRange(lead.budgetMin, lead.budgetMax, lead.currency)}</td>
              <td className="px-4 py-3 text-ink-800">{lead.purchaseTimeline ?? "Not provided"}</td>
              <td className="px-4 py-3">
                <StatusPill status={lead.status} />
              </td>
              <td className="px-4 py-3">
                <TemperatureBadge temperature={lead.temperature} />
              </td>
              <td className="px-4 py-3 text-ink-800">{lead.qualificationScore ?? "—"}</td>
              <td className="px-4 py-3 text-ink-800">{associateName(lead.assignedAssociateId)}</td>
              <td className="px-4 py-3 text-ink-800">{formatDate(lead.lastContactAt)}</td>
              <td className="px-4 py-3">
                <span className="text-gold-600">{nextActionLabel(lead)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
