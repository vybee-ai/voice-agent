// Application-level data models.
// These are intentionally decoupled from the Google Sheet's raw column
// names — see services/normalize.ts for the mapping layer. When the data
// source moves to a real database, only the services/*Adapter files change;
// every UI component below this layer keeps working unchanged.

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Follow-up" | "Closed";
export type LeadTemperature = "HOT" | "WARM" | "COLD" | "UNQUALIFIED";
export type CallStatus = "Answered" | "No Answer" | "Voicemail" | "Busy" | "Failed";
export type CallOutcome =
  | "Qualified"
  | "Qualified — Specialist follow-up requested"
  | "No Answer"
  | "Not Interested"
  | "Callback Requested"
  | "Wrong Number"
  | "Unqualified";
export type CallerRole = "AI Agent" | "Specialist";
export type AssociateStatus = "Active" | "Away" | "Offline";
export type MessageDirection = "incoming" | "outgoing";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "replied" | "failed";
export type FollowUpStatus = "Today" | "Upcoming" | "Overdue" | "Completed";

export interface Lead {
  id: string;
  leadId: string;
  buyerName: string;
  phone: string | null;
  source: string | null;
  country: string;
  city: string;
  preferredArea: string | null;
  propertyType: string | null;
  bedrooms: string | null;
  purchasePurpose: "Investment" | "End-use" | "Not provided" | string;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  purchaseTimeline: string | null;
  keyRequirements: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  qualificationScore: number | null;
  qualificationCompleteness: number | null;
  brokerFollowupRequested: boolean;
  preferredCallbackTime: string | null;
  assignedAssociateId: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
  nextAction: string | null;
  callOutcome: CallOutcome | null;
  callSummary: string | null;
}

export interface ScoreBreakdownItem {
  label: string;
  score: number;
  max: number;
}

export interface TranscriptLine {
  speaker: string;
  role: CallerRole;
  text: string;
  timestamp?: string;
}

export interface Call {
  id: string;
  callId: string;
  analysisId: string | null;
  leadId: string;
  agentName: string;
  callerRole: CallerRole;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: CallStatus;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
  transcript: TranscriptLine[] | null;
  summary: string | null;
  temperature: LeadTemperature | null;
  score: number | null;
  scoreBreakdown: ScoreBreakdownItem[] | null;
  recommendedNextAction: string | null;
}

export interface TimelineEvent {
  id: string;
  leadId: string;
  timestamp: string;
  type:
    | "lead_created"
    | "call_started"
    | "call_completed"
    | "analysis_completed"
    | "lead_qualified"
    | "followup_requested"
    | "whatsapp_sent"
    | "whatsapp_replied"
    | "callback_scheduled"
    | "associate_assigned"
    | "specialist_call_attempted"
    | "specialist_call_unanswered";
  label: string;
  detail?: string;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  text: string;
  timestamp: string;
  status: MessageStatus;
}

export interface WhatsAppConversation {
  id: string;
  leadId: string;
  leadName: string;
  phone: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
  scenario: "no_answer_recovery" | "qualified_confirmation" | "specialist_no_answer" | "general";
  messages: WhatsAppMessage[];
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  temperature: LeadTemperature;
  associateId: string | null;
  scheduledAt: string;
  status: FollowUpStatus;
  notes: string | null;
}

export type AssociateTier = "Junior Specialist" | "Property Specialist" | "Senior Specialist" | "Partner";
export type AssociateAvailability = "Available" | "Busy" | "Away" | "On Leave" | "Offline";

export type AllocationStatus =
  | "Recommended"
  | "Assigned"
  | "Accepted"
  | "Contacted"
  | "FollowUpScheduled"
  | "Reassigned"
  | "Declined"
  | "Completed"
  | "Expired";

export type AllocationMethod = "RuleEngine" | "AdminManual" | "AssociateClaimed" | "Fallback";

export type AllocationSignal =
  | "Location"
  | "PropertyType"
  | "Budget"
  | "Language"
  | "Capacity"
  | "Performance"
  | "ResponseTime";

export interface AllocationMatchFactor {
  signal: AllocationSignal;
  score: number;
  maxScore: number;
  matched: boolean;
  detail: string;
}

export interface ClientAllocation {
  id: string;
  leadId: string;
  leadName: string;
  associateId: string;
  associateName: string;
  matchScore: number;
  matchFactors: AllocationMatchFactor[];
  allocationMethod: AllocationMethod;
  status: AllocationStatus;
  isCurrent: boolean;
  recommendedAt: string;
  assignedAt: string;
  acceptDeadlineAt?: string | null;
  acceptedAt?: string | null;
  firstContactDeadlineAt?: string | null;
  firstContactAt?: string | null;
  completedAt?: string | null;
  reassignedFromAssociateId?: string | null;
  reassignmentReason?: string | null;
  declineReason?: string | null;
  outcomeNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecommendation {
  associate: Associate;
  score: number;
  factors: AllocationMatchFactor[];
  eligible: boolean;
  ineligibilityReason?: string | null;
}

export interface Associate {
  id: string;
  employeeCode?: string | null;
  name: string;
  role: string;
  tier?: AssociateTier;
  status: AssociateStatus;
  availability?: AssociateAvailability;
  phone: string | null;
  email: string | null;
  avatarUrl?: string | null;
  territories?: string[];
  propertyTypes?: string[];
  purchasePurposes?: ("Investment" | "End-use" | string)[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  languages?: string[];
  maxActiveCapacity?: number | null;
  leadsAssigned: number;
  hotLeads: number;
  followUps: number;
  currentActiveClients?: number | null;
  pendingAcceptanceCount?: number | null;
  historicalConversionRate?: number | null;
  averageResponseMinutes?: number | null;
  totalAssignedAllTime?: number | null;
  totalClosedAllTime?: number | null;
  performanceScore?: number | null;
  joiningDate?: string | null;
  lastActivityAt: string | null;
  lastAssignedAt?: string | null;
  notes?: string | null;
}

export interface Activity {
  id: string;
  timestamp: string;
  type: TimelineEvent["type"];
  label: string;
  leadId?: string;
  leadName?: string;
}

export interface DashboardStats {
  newLeads: number;
  callsCompleted: number;
  callsAnswered: number;
  noAnswer: number;
  qualifiedLeads: number;
  unassignedQualifiedLeads?: number;
  pendingAllocations?: number;
  followUpsDue: number;
  pipeline: Record<LeadStatus, number>;
}

export interface AnalyticsData {
  totalLeads: number;
  answerRate: number;
  qualificationRate: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  noAnswerRate: number;
  followUpRate: number;
  avgCallDurationSeconds: number;
  funnel: { stage: string; count: number }[];
  allocationStats?: {
    totalAllocations: number;
    avgAssignmentMinutes: number;
    avgFirstContactMinutes: number;
    slaBreachRate: number;
  };
}

export interface IntegrationStatus {
  connected: boolean;
  label: string;
  detail?: string;
  lastSync?: string | null;
  recordCount?: number | null;
}

export interface AppSettings {
  company: {
    name: string;
    country: string;
    city: string;
    currency: string;
    timezone: string;
  };
  whatsapp: {
    provider: "Twilio" | "Meta WhatsApp Cloud API";
    number: string | null;
    connected: boolean;
  };
  voice: {
    provider: string;
    number: string | null;
    agentName: string;
    recordingEnabled: boolean;
    transcriptEnabled: boolean;
    connected: boolean;
  };
  aiAgent: {
    name: string;
    role: string;
    qualificationThreshold: number;
  };
  integrations: {
    googleSheets: IntegrationStatus;
    whatsapp: IntegrationStatus;
    voice: IntegrationStatus;
  };
  appMode: "demo" | "live";
}

// Data adapter / repository contract
export interface DataAdapter {
  getLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | null>;
  createLead(data: { leadId: string; buyerName: string; phone: string; source?: string }): Promise<Lead>;
  updateLead(id: string, data: Partial<Lead>): Promise<Lead | null>;
  getCalls(): Promise<Call[]>;
  getCallById(id: string): Promise<Call | null>;
  getCallsByLeadId(leadId: string): Promise<Call[]>;
  getAssociates(): Promise<Associate[]>;
  getAssociateById(id: string): Promise<Associate | null>;
  updateAssociate(id: string, data: Partial<Associate>): Promise<Associate | null>;
  getAllocations(): Promise<ClientAllocation[]>;
  getAllocationById(id: string): Promise<ClientAllocation | null>;
  getAllocationsByLeadId(leadId: string): Promise<ClientAllocation[]>;
  getAllocationsByAssociateId(associateId: string): Promise<ClientAllocation[]>;
  getCurrentAllocationForLead(leadId: string): Promise<ClientAllocation | null>;
  createAllocation(data: Omit<ClientAllocation, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<ClientAllocation>;
  updateAllocation(id: string, data: Partial<ClientAllocation>): Promise<ClientAllocation | null>;
  getConversations(): Promise<WhatsAppConversation[]>;
  getConversationByLeadId(leadId: string): Promise<WhatsAppConversation | null>;
  getFollowUps(): Promise<FollowUp[]>;
  getActivity(): Promise<Activity[]>;
  getTimeline(leadId: string): Promise<TimelineEvent[]>;
  getLastSync(): Promise<string>;
  getRecordCount(): Promise<number>;
}
