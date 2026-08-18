import {
  demoLeads,
  demoCalls,
  demoAssociates,
  demoAllocations,
  demoConversations,
  demoFollowUps,
  demoActivity,
  buildDemoTimeline,
} from "./demoData";
import type {
  Lead,
  Call,
  Associate,
  ClientAllocation,
  WhatsAppConversation,
  FollowUp,
  Activity,
  TimelineEvent,
  DataAdapter,
} from "@/lib/types";

// In-memory working copies for demo mode to support interactive mutations (e.g. assigning, accepting, reassigning)
let inMemoryLeads: Lead[] = JSON.parse(JSON.stringify(demoLeads));
let inMemoryAssociates: Associate[] = JSON.parse(JSON.stringify(demoAssociates));
let inMemoryAllocations: ClientAllocation[] = JSON.parse(JSON.stringify(demoAllocations));
let inMemoryActivity: Activity[] = JSON.parse(JSON.stringify(demoActivity));

export const demoAdapter: DataAdapter = {
  async getLeads(): Promise<Lead[]> {
    return inMemoryLeads;
  },

  async getLeadById(id: string): Promise<Lead | null> {
    return inMemoryLeads.find((l) => l.id === id || l.leadId === id) ?? null;
  },

  async createLead(data: { leadId: string; buyerName: string; phone: string; source?: string }): Promise<Lead> {
    const existingIdx = inMemoryLeads.findIndex((l) => l.id === data.leadId || l.leadId === data.leadId);
    if (existingIdx >= 0) {
      inMemoryLeads[existingIdx] = {
        ...inMemoryLeads[existingIdx],
        buyerName: data.buyerName,
        phone: data.phone,
        updatedAt: new Date().toISOString(),
      };
      return inMemoryLeads[existingIdx];
    }

    const now = new Date().toISOString();
    const newLead: Lead = {
      id: data.leadId,
      leadId: data.leadId,
      buyerName: data.buyerName,
      phone: data.phone,
      source: data.source || "Web Voice Call (Sofia)",
      country: "United Arab Emirates",
      city: "Dubai",
      preferredArea: null,
      propertyType: null,
      bedrooms: null,
      purchasePurpose: "Not provided",
      budgetMin: null,
      budgetMax: null,
      currency: "AED",
      purchaseTimeline: null,
      keyRequirements: null,
      status: "New",
      temperature: "WARM",
      qualificationScore: null,
      qualificationCompleteness: 0,
      brokerFollowupRequested: false,
      preferredCallbackTime: null,
      assignedAssociateId: null,
      createdAt: now,
      updatedAt: now,
      lastContactAt: now,
      nextAction: "Talk to Sofia in progress",
      callOutcome: null,
      callSummary: null,
    };

    inMemoryLeads.unshift(newLead);
    return newLead;
  },

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | null> {
    const index = inMemoryLeads.findIndex((l) => l.id === id || l.leadId === id);
    if (index === -1) return null;
    inMemoryLeads[index] = {
      ...inMemoryLeads[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return inMemoryLeads[index];
  },

  async getCalls(): Promise<Call[]> {
    return demoCalls;
  },

  async getCallById(id: string): Promise<Call | null> {
    return demoCalls.find((c) => c.id === id || c.callId === id) ?? null;
  },

  async getCallsByLeadId(leadId: string): Promise<Call[]> {
    return demoCalls.filter((c) => c.leadId === leadId);
  },

  async getAssociates(): Promise<Associate[]> {
    return inMemoryAssociates;
  },

  async getAssociateById(id: string): Promise<Associate | null> {
    return inMemoryAssociates.find((a) => a.id === id) ?? null;
  },

  async updateAssociate(id: string, data: Partial<Associate>): Promise<Associate | null> {
    const index = inMemoryAssociates.findIndex((a) => a.id === id);
    if (index === -1) return null;
    inMemoryAssociates[index] = {
      ...inMemoryAssociates[index],
      ...data,
    };
    return inMemoryAssociates[index];
  },

  async getAllocations(): Promise<ClientAllocation[]> {
    return inMemoryAllocations;
  },

  async getAllocationById(id: string): Promise<ClientAllocation | null> {
    return inMemoryAllocations.find((a) => a.id === id) ?? null;
  },

  async getAllocationsByLeadId(leadId: string): Promise<ClientAllocation[]> {
    return inMemoryAllocations
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getAllocationsByAssociateId(associateId: string): Promise<ClientAllocation[]> {
    return inMemoryAllocations
      .filter((a) => a.associateId === associateId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getCurrentAllocationForLead(leadId: string): Promise<ClientAllocation | null> {
    return inMemoryAllocations.find((a) => a.leadId === leadId && a.isCurrent) ?? null;
  },

  async createAllocation(data: Omit<ClientAllocation, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<ClientAllocation> {
    const now = new Date().toISOString();
    const newAlloc: ClientAllocation = {
      ...data,
      id: data.id ?? `alloc-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    // If marked as current, ensure previous allocations for this lead have isCurrent = false
    if (newAlloc.isCurrent) {
      inMemoryAllocations = inMemoryAllocations.map((a) => (a.leadId === newAlloc.leadId ? { ...a, isCurrent: false } : a));
    }

    inMemoryAllocations.unshift(newAlloc);

    // Record activity
    inMemoryActivity.unshift({
      id: `act-${Date.now()}`,
      timestamp: now,
      type: "associate_assigned",
      label: `Associate assigned (${newAlloc.associateName})`,
      leadId: newAlloc.leadId,
      leadName: newAlloc.leadName,
    });

    return newAlloc;
  },

  async updateAllocation(id: string, data: Partial<ClientAllocation>): Promise<ClientAllocation | null> {
    const index = inMemoryAllocations.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const updated = {
      ...inMemoryAllocations[index],
      ...data,
      updatedAt: now,
    };

    // If updated to isCurrent = true, unset other allocations for this lead
    if (data.isCurrent) {
      inMemoryAllocations = inMemoryAllocations.map((a) => (a.leadId === updated.leadId && a.id !== id ? { ...a, isCurrent: false } : a));
    }

    inMemoryAllocations[index] = updated;
    return updated;
  },

  async getConversations(): Promise<WhatsAppConversation[]> {
    return demoConversations;
  },

  async getConversationByLeadId(leadId: string): Promise<WhatsAppConversation | null> {
    return demoConversations.find((c) => c.leadId === leadId) ?? null;
  },

  async getFollowUps(): Promise<FollowUp[]> {
    return demoFollowUps;
  },

  async getActivity(): Promise<Activity[]> {
    return inMemoryActivity;
  },

  async getTimeline(leadId: string): Promise<TimelineEvent[]> {
    return buildDemoTimeline(leadId);
  },

  async getLastSync(): Promise<string> {
    return new Date().toISOString();
  },

  async getRecordCount(): Promise<number> {
    return inMemoryLeads.length;
  },
};
