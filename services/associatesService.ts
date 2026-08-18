import { getAdapter } from "./dataSource";
import type { Associate, AssociateAvailability, AssociateStatus } from "@/lib/types";

export const associatesService = {
  async getAll(): Promise<Associate[]> {
    const adapter = getAdapter();
    const associates = await adapter.getAssociates();
    const leads = await adapter.getLeads();
    const allocations = await adapter.getAllocations();
    const followUps = await adapter.getFollowUps();

    return associates.map((a) => {
      const assignedLeads = leads.filter((l) => l.assignedAssociateId === a.id);
      const activeLeads = assignedLeads.filter((l) => l.status !== "Closed");
      const hotLeads = assignedLeads.filter((l) => l.temperature === "HOT" && l.status !== "Closed");
      const assignedFollowUps = followUps.filter((f) => f.associateId === a.id);
      const pendingAllocations = allocations.filter((al) => al.associateId === a.id && al.status === "Assigned" && al.isCurrent);
      const closedDeals = assignedLeads.filter((l) => l.status === "Closed");

      const conversionRate = assignedLeads.length
        ? Math.round((closedDeals.length / assignedLeads.length) * 100)
        : a.historicalConversionRate ?? 15;

      return {
        ...a,
        leadsAssigned: assignedLeads.length,
        hotLeads: hotLeads.length,
        followUps: assignedFollowUps.length,
        currentActiveClients: activeLeads.length,
        pendingAcceptanceCount: pendingAllocations.length,
        historicalConversionRate: conversionRate,
        maxActiveCapacity: a.maxActiveCapacity ?? 15,
        availability: a.availability ?? "Available",
      };
    });
  },

  async getById(id: string): Promise<Associate | null> {
    const associates = await this.getAll();
    return associates.find((a) => a.id === id) ?? null;
  },

  async getAvailable(): Promise<Associate[]> {
    const associates = await this.getAll();
    return associates.filter(
      (a) => a.status === "Active" && a.availability === "Available" && (a.currentActiveClients ?? 0) < (a.maxActiveCapacity ?? 15)
    );
  },

  async updateAvailability(
    id: string,
    availability: AssociateAvailability,
    status?: AssociateStatus
  ): Promise<Associate | null> {
    const adapter = getAdapter();
    const now = new Date().toISOString();
    return adapter.updateAssociate(id, {
      availability,
      status: status ?? (availability === "Offline" ? "Offline" : availability === "Away" ? "Away" : "Active"),
      lastActivityAt: now,
    });
  },
};
