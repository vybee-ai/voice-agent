// Pure, side-effect-free lead helpers with zero server-only dependencies.
// This file must stay safe to import from client components: no adapters,
// no Google API clients, nothing that touches Node built-ins. Data-fetching
// lives in services/leadsService.ts instead, which re-exports these.

import type { Lead, LeadStatus } from "./types";

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "all";
  temperature?: string | "all";
  propertyType?: string | "all";
  purpose?: string | "all";
  timeline?: string | "all";
  associateId?: string | "all";
  callOutcome?: string | "all";
}

export type LeadSortKey = "date" | "score" | "name" | "status" | "followup";

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  let result = leads;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.buyerName.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
    );
  }
  if (filters.status && filters.status !== "all") result = result.filter((l) => l.status === filters.status);
  if (filters.temperature && filters.temperature !== "all") result = result.filter((l) => l.temperature === filters.temperature);
  if (filters.propertyType && filters.propertyType !== "all") result = result.filter((l) => l.propertyType === filters.propertyType);
  if (filters.purpose && filters.purpose !== "all") result = result.filter((l) => l.purchasePurpose === filters.purpose);
  if (filters.timeline && filters.timeline !== "all") result = result.filter((l) => l.purchaseTimeline === filters.timeline);
  if (filters.associateId && filters.associateId !== "all") result = result.filter((l) => l.assignedAssociateId === filters.associateId);
  if (filters.callOutcome && filters.callOutcome !== "all") result = result.filter((l) => l.callOutcome === filters.callOutcome);
  return result;
}

function getLeadTime(l: Lead): number {
  const contact = l.lastContactAt ? new Date(l.lastContactAt).getTime() : 0;
  const updated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
  const created = l.createdAt ? new Date(l.createdAt).getTime() : 0;
  const t = Math.max(
    Number.isFinite(contact) ? contact : 0,
    Number.isFinite(updated) ? updated : 0,
    Number.isFinite(created) ? created : 0
  );
  return Number.isFinite(t) ? t : 0;
}

export function sortLeads(leads: Lead[], key: LeadSortKey): Lead[] {
  const copy = [...leads];
  switch (key) {
    case "date":
      return copy.sort((a, b) => getLeadTime(b) - getLeadTime(a));
    case "score":
      return copy.sort((a, b) => (b.qualificationScore ?? -1) - (a.qualificationScore ?? -1));
    case "name":
      return copy.sort((a, b) => a.buyerName.localeCompare(b.buyerName));
    case "status":
      return copy.sort((a, b) => a.status.localeCompare(b.status));
    case "followup":
      return copy.sort((a, b) => {
        const timeA = a.lastContactAt ? new Date(a.lastContactAt).getTime() : 0;
        const timeB = b.lastContactAt ? new Date(b.lastContactAt).getTime() : 0;
        return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
      });
    default:
      return copy;
  }
}

export function nextActionLabel(lead: Lead): string {
  if (lead.callOutcome === "No Answer") return "Send WhatsApp";
  if (lead.callOutcome === "Callback Requested") return "View Schedule";
  if (lead.temperature === "HOT" && !lead.assignedAssociateId) return "Assign Associate";
  if (lead.status === "Follow-up") return "Call Today";
  if (lead.nextAction) return lead.nextAction;
  return "Review Lead";
}

/**
 * Authoritative lead qualification check consumed across Dashboard, Analytics, Leads, and Allocations.
 */
export function isLeadQualified(lead: Lead): boolean {
  if (lead.status === "Qualified" || lead.status === "Follow-up" || lead.status === "Closed") {
    return true;
  }
  if (lead.temperature === "HOT" || lead.temperature === "WARM") {
    return true;
  }
  if (lead.callOutcome && /qualified/i.test(lead.callOutcome)) {
    return true;
  }
  return false;
}

