import { getAdapter } from "./dataSource";
import { rankAssociateRecommendations, scoreAssociateMatch } from "@/lib/allocationEngine";
import { isLeadQualified } from "@/lib/leadUtils";
import type {
  ClientAllocation,
  Lead,
  Associate,
  MatchRecommendation,
  AllocationMethod,
  AllocationStatus,
} from "@/lib/types";

export const allocationsService = {
  async getAll(): Promise<ClientAllocation[]> {
    return getAdapter().getAllocations();
  },

  async getById(id: string): Promise<ClientAllocation | null> {
    return getAdapter().getAllocationById(id);
  },

  async getByLeadId(leadId: string): Promise<ClientAllocation[]> {
    return getAdapter().getAllocationsByLeadId(leadId);
  },

  async getByAssociateId(associateId: string): Promise<ClientAllocation[]> {
    return getAdapter().getAllocationsByAssociateId(associateId);
  },

  async getCurrentForLead(leadId: string): Promise<ClientAllocation | null> {
    return getAdapter().getCurrentAllocationForLead(leadId);
  },

  async getUnassignedQualifiedLeads(): Promise<Lead[]> {
    const leads = await getAdapter().getLeads();
    return leads.filter((l) => isLeadQualified(l) && !l.assignedAssociateId);
  },

  async getRecommendations(leadId: string): Promise<MatchRecommendation[]> {
    const lead = await getAdapter().getLeadById(leadId);
    if (!lead) return [];

    const associates = await getAdapter().getAssociates();
    return rankAssociateRecommendations(lead, associates);
  },

  /**
   * Creates a new associate assignment for a lead.
   */
  async assignAssociate(params: {
    leadId: string;
    associateId: string;
    method?: AllocationMethod;
    outcomeNotes?: string;
  }): Promise<{ success: boolean; allocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const lead = await adapter.getLeadById(params.leadId);
    if (!lead) return { success: false, error: "Lead not found" };

    const associate = await adapter.getAssociateById(params.associateId);
    if (!associate) return { success: false, error: "Associate not found" };

    // Calculate match factors
    const match = scoreAssociateMatch(lead, associate);

    const now = new Date();
    const acceptDeadline = new Date(now.getTime() + 30 * 60000).toISOString(); // 30 mins
    const firstContactDeadline = new Date(now.getTime() + 120 * 60000).toISOString(); // 2 hours

    // Deactivate previous current allocation if any
    const existing = await adapter.getCurrentAllocationForLead(params.leadId);
    if (existing) {
      await adapter.updateAllocation(existing.id, { isCurrent: false });
    }

    const allocation = await adapter.createAllocation({
      leadId: lead.id,
      leadName: lead.buyerName,
      associateId: associate.id,
      associateName: associate.name,
      matchScore: match.score,
      matchFactors: match.factors,
      allocationMethod: params.method ?? "AdminManual",
      status: "Assigned",
      isCurrent: true,
      recommendedAt: now.toISOString(),
      assignedAt: now.toISOString(),
      acceptDeadlineAt: acceptDeadline,
      acceptedAt: null,
      firstContactDeadlineAt: firstContactDeadline,
      firstContactAt: null,
      completedAt: null,
      reassignedFromAssociateId: existing ? existing.associateId : null,
      reassignmentReason: null,
      declineReason: null,
      outcomeNotes: params.outcomeNotes ?? null,
    });

    // Update lead's assignedAssociateId
    await adapter.updateLead(lead.id, {
      assignedAssociateId: associate.id,
      nextAction: `Awaiting acceptance from ${associate.name}`,
    });

    return { success: true, allocation };
  },

  /**
   * Associate acknowledges and accepts assignment.
   */
  async acceptAllocation(allocationId: string): Promise<{ success: boolean; allocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const alloc = await adapter.getAllocationById(allocationId);
    if (!alloc) return { success: false, error: "Allocation not found" };

    const now = new Date().toISOString();
    const updated = await adapter.updateAllocation(allocationId, {
      status: "Accepted",
      acceptedAt: now,
    });

    if (updated) {
      await adapter.updateLead(alloc.leadId, {
        nextAction: `Specialist outreach scheduled (${alloc.associateName})`,
      });
    }

    return { success: true, allocation: updated ?? undefined };
  },

  /**
   * Associate declines assignment. Automatically flags for reassignment.
   */
  async declineAllocation(
    allocationId: string,
    reason: string
  ): Promise<{ success: boolean; allocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const alloc = await adapter.getAllocationById(allocationId);
    if (!alloc) return { success: false, error: "Allocation not found" };

    const updated = await adapter.updateAllocation(allocationId, {
      status: "Declined",
      isCurrent: false,
      declineReason: reason,
    });

    // Clear associate from lead so it re-enters unassigned queue
    await adapter.updateLead(alloc.leadId, {
      assignedAssociateId: null,
      nextAction: "Declined by specialist — Reassignment required",
    });

    return { success: true, allocation: updated ?? undefined };
  },

  /**
   * Reassigns a lead from current associate to another.
   */
  async reassignAllocation(params: {
    currentAllocationId: string;
    newAssociateId: string;
    reason: string;
  }): Promise<{ success: boolean; newAllocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const oldAlloc = await adapter.getAllocationById(params.currentAllocationId);
    if (!oldAlloc) return { success: false, error: "Current allocation not found" };

    const lead = await adapter.getLeadById(oldAlloc.leadId);
    if (!lead) return { success: false, error: "Lead not found" };

    const newAssociate = await adapter.getAssociateById(params.newAssociateId);
    if (!newAssociate) return { success: false, error: "New associate not found" };

    // Mark previous allocation as Reassigned
    await adapter.updateAllocation(oldAlloc.id, {
      status: "Reassigned",
      isCurrent: false,
      reassignmentReason: params.reason,
    });

    // Score and create new allocation
    const match = scoreAssociateMatch(lead, newAssociate);
    const now = new Date();

    const newAlloc = await adapter.createAllocation({
      leadId: lead.id,
      leadName: lead.buyerName,
      associateId: newAssociate.id,
      associateName: newAssociate.name,
      matchScore: match.score,
      matchFactors: match.factors,
      allocationMethod: "AdminManual",
      status: "Assigned",
      isCurrent: true,
      recommendedAt: now.toISOString(),
      assignedAt: now.toISOString(),
      acceptDeadlineAt: new Date(now.getTime() + 30 * 60000).toISOString(),
      acceptedAt: null,
      firstContactDeadlineAt: new Date(now.getTime() + 120 * 60000).toISOString(),
      firstContactAt: null,
      completedAt: null,
      reassignedFromAssociateId: oldAlloc.associateId,
      reassignmentReason: params.reason,
      declineReason: null,
      outcomeNotes: `Reassigned from ${oldAlloc.associateName}: ${params.reason}`,
    });

    await adapter.updateLead(lead.id, {
      assignedAssociateId: newAssociate.id,
      nextAction: `Reassigned to ${newAssociate.name}`,
    });

    return { success: true, newAllocation: newAlloc };
  },

  /**
   * Records that the associate has made first contact with the lead.
   */
  async recordFirstContact(allocationId: string): Promise<{ success: boolean; allocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const alloc = await adapter.getAllocationById(allocationId);
    if (!alloc) return { success: false, error: "Allocation not found" };

    const now = new Date().toISOString();
    const updated = await adapter.updateAllocation(allocationId, {
      status: "Contacted",
      firstContactAt: now,
    });

    if (updated) {
      await adapter.updateLead(alloc.leadId, {
        status: "Contacted",
        lastContactAt: now,
        nextAction: "Follow up on property shortlist",
      });
    }

    return { success: true, allocation: updated ?? undefined };
  },

  /**
   * Finalizes allocation upon deal close or conclusion.
   */
  async completeAllocation(
    allocationId: string,
    outcomeNotes?: string
  ): Promise<{ success: boolean; allocation?: ClientAllocation; error?: string }> {
    const adapter = getAdapter();
    const alloc = await adapter.getAllocationById(allocationId);
    if (!alloc) return { success: false, error: "Allocation not found" };

    const now = new Date().toISOString();
    const updated = await adapter.updateAllocation(allocationId, {
      status: "Completed",
      completedAt: now,
      outcomeNotes: outcomeNotes ?? alloc.outcomeNotes,
    });

    return { success: true, allocation: updated ?? undefined };
  },

  /**
   * Aggregate statistics for analytics.
   */
  async getAllocationStats(): Promise<{
    totalAllocations: number;
    avgAssignmentMinutes: number;
    avgFirstContactMinutes: number;
    slaBreachRate: number;
  }> {
    const allocations = await getAdapter().getAllocations();
    if (!allocations.length) {
      return { totalAllocations: 0, avgAssignmentMinutes: 0, avgFirstContactMinutes: 0, slaBreachRate: 0 };
    }

    let totalAssignmentTime = 0;
    let assignmentCount = 0;
    let totalFirstContactTime = 0;
    let firstContactCount = 0;
    let breaches = 0;

    for (const a of allocations) {
      if (a.assignedAt && a.recommendedAt) {
        const diff = (+new Date(a.assignedAt) - +new Date(a.recommendedAt)) / 60000;
        if (diff >= 0) {
          totalAssignmentTime += diff;
          assignmentCount++;
        }
      }
      if (a.firstContactAt && a.assignedAt) {
        const diff = (+new Date(a.firstContactAt) - +new Date(a.assignedAt)) / 60000;
        if (diff >= 0) {
          totalFirstContactTime += diff;
          firstContactCount++;
        }
      }
      if (a.status === "Expired" || a.status === "Declined") {
        breaches++;
      }
    }

    return {
      totalAllocations: allocations.length,
      avgAssignmentMinutes: assignmentCount ? Math.round(totalAssignmentTime / assignmentCount) : 12,
      avgFirstContactMinutes: firstContactCount ? Math.round(totalFirstContactTime / firstContactCount) : 45,
      slaBreachRate: allocations.length ? Math.round((breaches / allocations.length) * 100) : 5,
    };
  },
};
