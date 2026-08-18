import { getAdapter } from "./dataSource";
import type { Lead, LeadStatus, DashboardStats } from "@/lib/types";
import { filterLeads, sortLeads, nextActionLabel, type LeadFilters, type LeadSortKey } from "@/lib/leadUtils";

// Server-side data-fetching service. Pure helpers (filter/sort/next-action
// label) live in lib/leadUtils.ts so client components can import just
// those without pulling the Google Sheets adapter (and its Node-only
// dependencies) into the browser bundle.
export type { LeadFilters, LeadSortKey };

export const leadsService = {
  async getAll(): Promise<Lead[]> {
    return getAdapter().getLeads();
  },

  async getById(id: string): Promise<Lead | null> {
    return getAdapter().getLeadById(id);
  },

  async create(data: { leadId?: string; buyerName: string; phone: string; source?: string }): Promise<Lead> {
    const leadId = data.leadId || `ONX-${Math.floor(100000 + Math.random() * 900000)}`;
    return getAdapter().createLead({
      leadId,
      buyerName: data.buyerName,
      phone: data.phone,
      source: data.source || "Web Voice Call (Sofia)",
    });
  },

  filter: filterLeads,
  sort: sortLeads,
  nextActionLabel,

  async getDashboardStats(): Promise<DashboardStats> {
    const leads = await this.getAll();
    const calls = await getAdapter().getCalls();
    const followUps = await getAdapter().getFollowUps();
    const allocations = await getAdapter().getAllocations();

    const pipeline: Record<LeadStatus, number> = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      "Follow-up": 0,
      Closed: 0,
    };
    leads.forEach((l) => (pipeline[l.status] = (pipeline[l.status] ?? 0) + 1));

    const qualifiedLeads = leads.filter((l) => l.status === "Qualified" || l.temperature === "HOT" || l.temperature === "WARM");
    const unassignedQualifiedLeads = qualifiedLeads.filter((l) => !l.assignedAssociateId).length;
    const pendingAllocations = allocations.filter((a) => a.status === "Assigned" && a.isCurrent).length;

    return {
      newLeads: leads.filter((l) => l.status === "New").length,
      callsCompleted: calls.length,
      callsAnswered: calls.filter((c) => c.status === "Answered").length,
      noAnswer: calls.filter((c) => c.status === "No Answer").length,
      qualifiedLeads: qualifiedLeads.length,
      unassignedQualifiedLeads,
      pendingAllocations,
      followUpsDue: followUps.filter((f) => f.status === "Today" || f.status === "Overdue").length,
      pipeline,
    };
  },

  async getNeedsAttention(): Promise<Lead[]> {
    const leads = await this.getAll();
    return leads.filter(
      (l) =>
        l.callOutcome === "No Answer" ||
        (l.status === "Follow-up" && l.brokerFollowupRequested) ||
        (l.temperature === "HOT" && !l.assignedAssociateId) ||
        l.callOutcome === "Callback Requested"
    );
  },
};
