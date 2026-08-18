// Normalization layer.
//
//   raw Google Sheet row  →  normalizeLead()/normalizeCall()  →  app model  →  UI
//
// The Sheet is treated as an untrusted, loosely-typed source: columns may be
// blank, mis-cased, or formatted inconsistently (phone numbers, dates,
// currency). This layer is the only place that should ever read a raw
// column name — everything downstream works off the typed models in
// lib/types.ts. Nothing here invents data: unknown/blank fields are passed
// through as null and rendered as "Not provided" by the UI, never guessed.

import { marketConfig } from "./marketConfig";
import type {
  Lead,
  Call,
  Associate,
  AssociateTier,
  AssociateAvailability,
  AssociateStatus,
  ClientAllocation,
  AllocationStatus,
  AllocationMethod,
  AllocationMatchFactor,
  LeadStatus,
  LeadTemperature,
  CallStatus,
  CallOutcome,
  TranscriptLine,
  ScoreBreakdownItem,
} from "./types";

// Raw row shape as it plausibly arrives from the Sheet — keys are whatever
// the spreadsheet columns happen to be named. Treat everything as unknown.
export type RawRow = Record<string, string | number | boolean | null | undefined>;

export function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (
    !s ||
    s === "[]" ||
    s === "{}" ||
    s === "null" ||
    s === "undefined" ||
    s === "NaN" ||
    s === "N/A" ||
    s === "NA" ||
    s === "#NAME?" ||
    s === "#VALUE!" ||
    s === "#REF!" ||
    s === "#N/A" ||
    s === "Not provided"
  ) {
    return null;
  }
  // Strip trailing "|| ..." delimiters (e.g. "|| assistant-ended-call")
  if (s.includes("||")) {
    s = s.split("||")[0].trim();
  }
  // Strip appended call status suffixes
  s = s.replace(/\s*(?:assistant-ended-call|customer-ended-call|call\.in-progress[^\s]*)\s*$/gi, "").trim();
  s = s.replace(/(?:assistant-ended-call|customer-ended-call)/gi, "").trim();
  return s.length ? s : null;
}

export function normalizeLeadId(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  // Strip trailing status words (e.g. "ONX-151332 assistant-ended-call")
  const firstToken = s.split(/\s+/)[0];
  if (firstToken) s = firstToken;
  // If doubled like "ONX-151332ONX-151332", extract original ID
  const half = Math.floor(s.length / 2);
  if (half >= 4 && s.slice(0, half) === s.slice(half)) {
    return s.slice(0, half);
  }
  return s;
}

export function areLeadIdsMatching(id1: unknown, id2: unknown): boolean {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const n1 = normalizeLeadId(s1).toLowerCase();
  const n2 = normalizeLeadId(s2).toLowerCase();
  if (n1 && n2 && n1 === n2) return true;
  if (n1 && n2 && (n1.includes(n2) || n2.includes(n1))) return true;
  if (s1.toLowerCase().includes(n2) || s2.toLowerCase().includes(n1)) return true;
  return false;
}

export function arePhonesMatching(p1: unknown, p2: unknown): boolean {
  if (!p1 || !p2) return false;
  const d1 = String(p1).replace(/\D/g, "");
  const d2 = String(p2).replace(/\D/g, "");
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 7 && d2.length >= 7) {
    if (d1.endsWith(d2.slice(-7)) || d2.endsWith(d1.slice(-7))) return true;
  }
  return false;
}

function str(v: unknown): string | null {
  return cleanText(v);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return ["true", "yes", "y", "1", "requested"].includes(s);
}

export function normalizeList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean);
  if (typeof raw === "string") {
    const cleaned = cleanText(raw);
    if (!cleaned) return [];
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return cleaned
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function normalizePhone(raw: unknown): string | null {
  const s = cleanText(raw);
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("971")) return `+${digits}`;
  if (digits.startsWith("0")) return `${marketConfig.phoneCountryCode}${digits.slice(1)}`;
  return `${marketConfig.phoneCountryCode}${digits}`;
}

export function normalizeDate(raw: unknown): string | null {
  const s = cleanText(raw);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const STATUS_MAP: Record<string, LeadStatus> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  "follow-up": "Follow-up",
  followup: "Follow-up",
  closed: "Closed",
  open: "New",
};

export function normalizeStatus(raw: unknown): LeadStatus {
  const s = cleanText(raw)?.toLowerCase();
  if (s && STATUS_MAP[s]) return STATUS_MAP[s];
  return "New";
}

const TEMP_MAP: Record<string, LeadTemperature> = {
  hot: "HOT",
  warm: "WARM",
  cold: "COLD",
  unqualified: "UNQUALIFIED",
};

export function normalizeTemperature(raw: unknown): LeadTemperature {
  const s = cleanText(raw)?.toLowerCase();
  if (s && TEMP_MAP[s]) return TEMP_MAP[s];
  if (s?.includes("hot")) return "HOT";
  if (s?.includes("warm")) return "WARM";
  if (s?.includes("cold")) return "COLD";
  return "UNQUALIFIED";
}

export function normalizeCallStatus(raw: unknown): CallStatus {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("answer") && !s.includes("no")) return "Answered";
  if (s.includes("no answer") || s === "noanswer" || s.includes("missed")) return "No Answer";
  if (s.includes("ended") || s.includes("completed")) return "Answered";
  if (s.includes("voicemail")) return "Voicemail";
  if (s.includes("busy")) return "Busy";
  if (s.includes("fail")) return "Failed";
  return "Answered";
}

export function normalizeCallOutcome(raw: unknown): CallOutcome | null {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (!s) return null;
  if (
    s.includes("specialist") ||
    s.includes("qualified_follow_up") ||
    s.includes("follow_up") ||
    s.includes("followup") ||
    s.includes("follow-up")
  ) {
    return "Qualified — Specialist follow-up requested";
  }
  if (s.includes("qualified")) return "Qualified";
  if (s.includes("no_answer") || s.includes("no answer") || s.includes("missed")) return "No Answer";
  if (s.includes("callback")) return "Callback Requested";
  if (s.includes("not_interested") || s.includes("not interested")) return "Not Interested";
  if (s.includes("wrong_number") || s.includes("wrong number")) return "Wrong Number";
  if (s.includes("unqualified")) return "Unqualified";
  return cleanText(raw) as CallOutcome;
}

export function normalizeScore(raw: unknown): number | null {
  const n = num(raw);
  if (n === null) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function normalizePropertyType(raw: unknown): string | null {
  const s = cleanText(raw)?.toLowerCase();
  if (!s) return null;
  if (s.includes("villa")) return "Villa";
  if (s.includes("apartment") || s.includes("flat")) return "Apartment";
  if (s.includes("townhouse")) return "Townhouse";
  if (s.includes("penthouse")) return "Penthouse";
  if (s.includes("duplex")) return "Duplex";
  if (s.includes("mansion")) return "Mansion";
  if (s.includes("plot") || s.includes("land")) return "Plot";
  if (s.includes("commercial") || s.includes("office")) return "Commercial";
  return cleanText(raw);
}

export function normalizePurchasePurpose(raw: unknown): string {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("end") || s.includes("use") || s.includes("self") || s.includes("live") || s.includes("residential")) {
    return "End-use";
  }
  if (s.includes("invest") || s.includes("rental") || s.includes("roi")) {
    return "Investment";
  }
  if (!s) return "Not provided";
  return cleanText(raw) ?? "Not provided";
}

export function normalizePurchaseTimeline(raw: unknown): string | null {
  const s = cleanText(raw)?.toLowerCase();
  if (!s) return null;
  if (s.includes("within_1_month") || s.includes("immediate") || s.includes("1 month")) return "Within 1 month";
  if (s.includes("1_3_months") || s.includes("1-3") || s.includes("3 months")) return "1–3 months";
  if (s.includes("3_6_months") || s.includes("3-6") || s.includes("6 months")) return "3–6 months";
  if (s.includes("more_than_6") || s.includes(">6") || s.includes("year")) return "> 6 months";
  return cleanText(raw)?.replace(/_/g, " ") ?? null;
}

export function normalizeKeyRequirements(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const items = raw.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  }
  const s = String(raw).trim();
  if (!s || s === "[]" || s === "{}" || s === "null") return null;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const items = parsed.map((item) => String(item).trim()).filter(Boolean);
      return items.length > 0 ? items.join(", ") : null;
    }
  } catch {
    // not JSON
  }
  return cleanText(s);
}

export function normalizeCountry(raw: unknown): string {
  const s = cleanText(raw);
  if (!s) return marketConfig.country;
  const l = s.toLowerCase();
  if (l.includes("uae") || l.includes("emirates") || l.includes("united arab")) return "United Arab Emirates";
  if (l.includes("saudi") || l.includes("ksa")) return "Saudi Arabia";
  if (l.includes("qatar")) return "Qatar";
  if (l.includes("kuwait")) return "Kuwait";
  if (l.includes("oman")) return "Oman";
  if (l.includes("india")) return "India";
  if (l.includes("uk") || l.includes("united kingdom")) return "United Kingdom";
  if (l.includes("usa") || l.includes("united states")) return "United States";
  return s;
}

export function normalizeCity(raw: unknown): string {
  const s = cleanText(raw);
  if (!s) return marketConfig.city;
  const l = s.toLowerCase();
  if (l.includes("dubai")) return "Dubai";
  if (l.includes("abu dhabi")) return "Abu Dhabi";
  if (l.includes("sharjah")) return "Sharjah";
  if (l.includes("riyadh")) return "Riyadh";
  if (l.includes("doha")) return "Doha";
  return s;
}

export function normalizeTranscript(raw: unknown): TranscriptLine[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as TranscriptLine[];
  const s = cleanText(raw);
  if (!s) return null;
  // Support a plain "SPEAKER: text" per-line format as commonly exported.
  const lines = s.split(/\n+/).filter(Boolean);
  const parsed: TranscriptLine[] = [];
  for (const line of lines) {
    const match = line.match(/^([A-Za-z][\w .]{0,30}):\s*(.*)$/);
    if (match) {
      const speaker = match[1].trim();
      parsed.push({
        speaker,
        role: /sofia|agent|ai/i.test(speaker) ? "AI Agent" : "Specialist",
        text: match[2].trim(),
      });
    }
  }
  return parsed.length ? parsed : null;
}

export function normalizeScoreBreakdown(raw: unknown): ScoreBreakdownItem[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as ScoreBreakdownItem[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed as ScoreBreakdownItem[];
  } catch {
    return null;
  }
  return null;
}

export function normalizeAllocationStatus(raw: unknown): AllocationStatus {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("recommend")) return "Recommended";
  if (s.includes("accept")) return "Accepted";
  if (s.includes("contact")) return "Contacted";
  if (s.includes("followup") || s.includes("follow-up") || s.includes("schedule")) return "FollowUpScheduled";
  if (s.includes("reassign")) return "Reassigned";
  if (s.includes("decline") || s.includes("reject")) return "Declined";
  if (s.includes("close") || s.includes("complete")) return "Completed";
  if (s.includes("expire")) return "Expired";
  if (s.includes("assign")) return "Assigned";
  return "Recommended";
}

export function normalizeAllocationMethod(raw: unknown): AllocationMethod {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("rule") || s.includes("engine") || s.includes("auto")) return "RuleEngine";
  if (s.includes("claim")) return "AssociateClaimed";
  if (s.includes("fall")) return "Fallback";
  return "AdminManual";
}

export function normalizeAssociateTier(raw: unknown): AssociateTier {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("senior") || s.includes("sr")) return "Senior Specialist";
  if (s.includes("junior") || s.includes("jr")) return "Junior Specialist";
  if (s.includes("partner")) return "Partner";
  return "Property Specialist";
}

export function normalizeAssociateAvailability(raw: unknown): AssociateAvailability {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("busy")) return "Busy";
  if (s.includes("away")) return "Away";
  if (s.includes("leave")) return "On Leave";
  if (s.includes("offline")) return "Offline";
  return "Available";
}

export function normalizeAssociateStatus(raw: unknown): AssociateStatus {
  const s = cleanText(raw)?.toLowerCase() ?? "";
  if (s.includes("away")) return "Away";
  if (s.includes("offline")) return "Offline";
  return "Active";
}

export function normalizeMatchFactors(raw: unknown): AllocationMatchFactor[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as AllocationMatchFactor[];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed as AllocationMatchFactor[];
  } catch {
    return [];
  }
  return [];
}

/**
 * Normalize a single raw Google Sheet "leads" row into the application Lead model.
 */
export function normalizeLead(row: RawRow, index: number): Lead {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return row[k];
    }
    return null;
  };

  const rawLeadId = get("Lead ID", "leadId", "lead_id", "id");
  const leadIdVal = normalizeLeadId(rawLeadId) || str(rawLeadId) || `lead-${index}`;

  const rawCreated = get("Created Date", "createdAt", "Created", "created_at");
  const rawStarted = get("Started At", "started_at", "startedAt");
  const createdAt = normalizeDate(rawCreated) ?? normalizeDate(rawStarted) ?? "2026-08-01T00:00:00.000Z";
  const updatedAt = normalizeDate(get("Updated Date", "updatedAt", "updated_at")) ?? normalizeDate(rawStarted) ?? createdAt;

  return {
    id: leadIdVal,
    leadId: leadIdVal,
    buyerName: cleanText(get("Buyer Name", "Name", "buyerName", "buyer_name")) ?? "Unknown Buyer",
    phone: normalizePhone(get("Phone", "phone", "Phone Number", "customer_number", "mobile")),
    source: cleanText(get("Source", "source", "initial_enquiry")) ?? "Voice CRM",
    country: normalizeCountry(get("Target Country", "country", "target_country")),
    city: normalizeCity(get("Target City", "city", "target_city")),
    preferredArea: cleanText(get("Preferred Area", "preferredArea", "Area", "preferred_area")),
    propertyType: normalizePropertyType(get("Property Type", "propertyType", "property_type")),
    bedrooms: cleanText(get("Bedrooms", "bedrooms", "bedroom_count")),
    purchasePurpose: normalizePurchasePurpose(get("Purchase Purpose", "purpose", "purchase_purpose")),
    budgetMin: num(get("Budget Min", "budgetMin", "budget_min")),
    budgetMax: num(get("Budget Max", "budgetMax", "budget_max")),
    currency: cleanText(get("Currency", "currency")) ?? marketConfig.currency,
    purchaseTimeline: normalizePurchaseTimeline(get("Timeline", "purchaseTimeline", "purchase_timeline")),
    keyRequirements: normalizeKeyRequirements(get("Key Requirements", "keyRequirements", "Requirements", "key_requirements")),
    status: normalizeStatus(get("Status", "status", "lead_status")),
    temperature: normalizeTemperature(get("Temperature", "temperature", "Lead Temperature", "lead_temperature")),
    qualificationScore: normalizeScore(get("Score", "qualificationScore", "Qualification Score", "qualification_score")),
    qualificationCompleteness: num(get("Qualification Completeness", "completeness", "qualification_completion_pct")),
    brokerFollowupRequested: bool(get("Broker Followup Requested", "brokerFollowupRequested", "Follow-up Requested", "broker_followup_requested")),
    preferredCallbackTime: cleanText(get("Preferred Callback Time", "preferredCallbackTime", "Callback Time", "preferred_callback_time")),
    assignedAssociateId: cleanText(get("Assigned Associate", "assignedAssociateId", "Assigned To", "assigned_associate")),
    createdAt,
    updatedAt,
    lastContactAt: normalizeDate(get("Last Contact", "lastContactAt", "last_contact")) ?? normalizeDate(rawStarted),
    nextAction: cleanText(get("Next Action", "nextAction", "next_action")),
    callOutcome: normalizeCallOutcome(get("Call Outcome", "callOutcome", "call_outcome")),
    callSummary: cleanText(get("Call Summary", "callSummary", "Summary", "call_summary")),
  };
}

/**
 * Normalize a single raw Google Sheet "calls" row into the application Call model.
 */
export function normalizeCall(row: RawRow, index: number): Call {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return null;
  };

  const callIdVal = str(get("Call ID", "callId", "call_id", "id")) ?? `call-${index}`;
  const leadIdVal = str(get("Lead ID", "leadId", "lead_id")) ?? "";
  const rawAgent = str(get("Agent", "agentName", "assistant_name", "agent_name"));
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAgent ?? "");
  const agentName = rawAgent && !isUUID ? rawAgent : "Sofia";

  return {
    id: callIdVal,
    callId: callIdVal,
    analysisId: str(get("Analysis ID", "analysisId", "analysis_id")),
    leadId: leadIdVal,
    agentName,
    callerRole: /specialist/i.test(str(get("Caller Role", "callerRole")) ?? "") ? "Specialist" : "AI Agent",
    startedAt: normalizeDate(get("Date", "startedAt", "Started", "started_at")) ?? new Date().toISOString(),
    endedAt: normalizeDate(get("End Time", "endedAt", "ended_at")),
    durationSeconds: num(get("Duration", "durationSeconds", "duration_seconds")),
    status: normalizeCallStatus(get("Status", "status", "call_status")),
    outcome: normalizeCallOutcome(get("Outcome", "outcome", "ended_reason", "call_outcome")),
    recordingUrl: str(get("Recording URL", "recordingUrl", "recording_url")),
    transcript: normalizeTranscript(get("Transcript", "transcript")),
    summary: str(get("Summary", "summary", "call_summary", "next_action")),
    temperature: get("Temperature", "temperature", "lead_temperature") ? normalizeTemperature(get("Temperature", "temperature", "lead_temperature")) : null,
    score: normalizeScore(get("Qualification Score", "qualificationScore", "qualification_score", "score")),
    scoreBreakdown: normalizeScoreBreakdown(get("Score Breakdown", "scoreBreakdown")),
    recommendedNextAction: str(get("Recommended Next Action", "recommendedNextAction", "next_action")),
  };
}

/**
 * Normalize a raw Google Sheet row into the Associate model.
 */
export function normalizeAssociate(row: RawRow, index: number): Associate {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return null;
  };

  const id = str(get("Associate ID", "associateId", "id")) ?? `assoc-${index + 1}`;
  const name = str(get("Name", "Associate Name", "name")) ?? `Specialist ${index + 1}`;

  return {
    id,
    employeeCode: str(get("Employee Code", "employeeCode", "Code")),
    name,
    role: str(get("Role", "role")) ?? "Property Specialist",
    tier: normalizeAssociateTier(get("Tier", "tier")),
    status: normalizeAssociateStatus(get("Status", "status")),
    availability: normalizeAssociateAvailability(get("Availability", "availability")),
    phone: normalizePhone(get("Phone", "phone", "Mobile")),
    email: str(get("Email", "email")),
    avatarUrl: str(get("Avatar", "avatarUrl", "Photo")),
    territories: normalizeList(get("Territories", "territories", "Areas")),
    propertyTypes: normalizeList(get("Property Types", "propertyTypes", "Types")),
    purchasePurposes: normalizeList(get("Purchase Purposes", "purposes", "Purchase Purpose")),
    budgetMin: num(get("Budget Min", "budgetMin")),
    budgetMax: num(get("Budget Max", "budgetMax")),
    languages: normalizeList(get("Languages", "languages")),
    maxActiveCapacity: num(get("Max Capacity", "maxCapacity", "maxActiveCapacity")) ?? 15,
    leadsAssigned: num(get("Leads Assigned", "leadsAssigned")) ?? 0,
    hotLeads: num(get("Hot Leads", "hotLeads")) ?? 0,
    followUps: num(get("Follow Ups", "followUps")) ?? 0,
    currentActiveClients: num(get("Active Clients", "currentActiveClients")),
    pendingAcceptanceCount: num(get("Pending Acceptance", "pendingAcceptanceCount")),
    historicalConversionRate: num(get("Conversion Rate", "historicalConversionRate")),
    averageResponseMinutes: num(get("Avg Response Time", "averageResponseMinutes")),
    totalAssignedAllTime: num(get("Total Assigned", "totalAssignedAllTime")),
    totalClosedAllTime: num(get("Total Closed", "totalClosedAllTime")),
    performanceScore: num(get("Performance Score", "performanceScore")),
    joiningDate: normalizeDate(get("Joining Date", "joiningDate")),
    lastActivityAt: normalizeDate(get("Last Activity", "lastActivityAt")),
    lastAssignedAt: normalizeDate(get("Last Assigned", "lastAssignedAt")),
    notes: str(get("Notes", "notes")),
  };
}

/**
 * Normalize a raw Google Sheet row into the ClientAllocation model.
 */
export function normalizeAllocation(row: RawRow, index: number): ClientAllocation {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return null;
  };

  const createdAt = normalizeDate(get("Created At", "createdAt", "Created")) ?? new Date().toISOString();

  return {
    id: str(get("Allocation ID", "allocationId", "id")) ?? `alloc-${index + 1}`,
    leadId: str(get("Lead ID", "leadId")) ?? "",
    leadName: str(get("Lead Name", "leadName")) ?? "Unknown Lead",
    associateId: str(get("Associate ID", "associateId")) ?? "",
    associateName: str(get("Associate Name", "associateName")) ?? "Unknown Associate",
    matchScore: num(get("Match Score", "matchScore", "score")) ?? 0,
    matchFactors: normalizeMatchFactors(get("Match Factors", "matchFactors", "factors")),
    allocationMethod: normalizeAllocationMethod(get("Allocation Method", "allocationMethod", "method")),
    status: normalizeAllocationStatus(get("Status", "status")),
    isCurrent: bool(get("Is Current", "isCurrent", "current")),
    recommendedAt: normalizeDate(get("Recommended At", "recommendedAt")) ?? createdAt,
    assignedAt: normalizeDate(get("Assigned At", "assignedAt")) ?? createdAt,
    acceptDeadlineAt: normalizeDate(get("Accept Deadline", "acceptDeadlineAt")),
    acceptedAt: normalizeDate(get("Accepted At", "acceptedAt")),
    firstContactDeadlineAt: normalizeDate(get("First Contact Deadline", "firstContactDeadlineAt")),
    firstContactAt: normalizeDate(get("First Contact At", "firstContactAt")),
    completedAt: normalizeDate(get("Completed At", "completedAt")),
    reassignedFromAssociateId: str(get("Reassigned From", "reassignedFromAssociateId")),
    reassignmentReason: str(get("Reassignment Reason", "reassignmentReason")),
    declineReason: str(get("Decline Reason", "declineReason")),
    outcomeNotes: str(get("Outcome Notes", "outcomeNotes", "Notes")),
    createdAt,
    updatedAt: normalizeDate(get("Updated At", "updatedAt")) ?? createdAt,
  };
}
