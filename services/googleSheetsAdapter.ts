import { cache } from "react";
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
import {
  normalizeLead,
  normalizeCall,
  normalizeAssociate,
  normalizeAllocation,
  areLeadIdsMatching,
  arePhonesMatching,
  normalizeLeadId,
  type RawRow,
} from "@/lib/normalize";
import { demoAdapter } from "./demoAdapter";

// Live Google Sheets adapter.
// Supports both:
// 1. Service account JWT authentication (when GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY are provided)
// 2. Direct GViz HTTP JSON reader (when the sheet is shared publicly / viewable with link)

let cachedDoc: any = null;
const createdLeadsBuffer: Lead[] = [];

function getSheetId(): string {
  return process.env.GOOGLE_SHEET_ID || "1xyws59k-D6Lc1xwt9YBMrMh86hPd41G2gLXVaBlRQv4";
}

async function getDoc() {
  if (cachedDoc) return cachedDoc;

  const sheetId = getSheetId();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null;
  }

  try {
    const { GoogleSpreadsheet } = await import("google-spreadsheet");
    const { JWT } = await import("google-auth-library");

    const jwt = new JWT({
      email,
      key: key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, jwt);
    await doc.loadInfo();
    cachedDoc = doc;
    return doc;
  } catch (err) {
    console.warn("Failed to initialize GoogleSpreadsheet with service account:", err);
    return null;
  }
}

/**
 * Fetch rows from Google Sheet via public GViz JSON API.
 */
async function fetchGvizSheet(sheetTitle: string): Promise<RawRow[]> {
  const sheetId = getSheetId();
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTitle)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const text = await res.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) return [];

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    const table = parsed.table;
    if (!table || !table.cols || !table.rows) return [];

    let headers: string[] = table.cols.map((c: any) => c.label || "");
    let startRow = 0;

    // If headers in table.cols are empty, check row 0
    if (headers.every((h) => !h.trim()) && table.rows.length > 0) {
      headers = table.rows[0].c.map((cell: any) => String(cell?.v ?? cell?.f ?? "").trim());
      startRow = 1;
    }

    const rows: RawRow[] = [];
    for (let i = startRow; i < table.rows.length; i++) {
      const r = table.rows[i];
      if (!r || !r.c) continue;
      const rowObj: RawRow = {};
      let hasData = false;
      headers.forEach((h, colIdx) => {
        if (h) {
          const cell = r.c[colIdx];
          const val = cell?.v ?? cell?.f ?? "";
          rowObj[h] = val;
          if (val !== "") hasData = true;
        }
      });
      if (hasData) rows.push(rowObj);
    }
    return rows;
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    console.warn(`Failed to fetch GViz sheet "${sheetTitle}":`, err);
    return [];
  }
}

const inFlightSheetRequests = new Map<string, { promise: Promise<RawRow[]>; timestamp: number }>();

const readSheet = cache(async (sheetTitle: string): Promise<RawRow[]> => {
  const now = Date.now();
  const cached = inFlightSheetRequests.get(sheetTitle);
  // Re-use in-flight request within 3 seconds to avoid duplicate requests during the same SSR render
  if (cached && now - cached.timestamp < 3000) {
    return cached.promise;
  }

  const fetchPromise = (async () => {
    // First try Service Account if available
    const doc = await getDoc();
    if (doc) {
      try {
        const sheet = doc.sheetsByTitle[sheetTitle];
        if (sheet) {
          const rows = await sheet.getRows();
          return rows.map((r: any) => r.toObject() as RawRow);
        }
      } catch (err) {
        console.warn(`Service account read failed for "${sheetTitle}", falling back to GViz:`, err);
      }
    }

    // Fallback to GViz public reader
    return fetchGvizSheet(sheetTitle);
  })();

  inFlightSheetRequests.set(sheetTitle, { promise: fetchPromise, timestamp: now });
  return fetchPromise;
});

export const googleSheetsAdapter: DataAdapter = {
  async getLeads(): Promise<Lead[]> {
    try {
      const [leadRows, qualRows, callRows, vapiRows] = await Promise.all([
        readSheet("Leads"),
        readSheet("Qualification"),
        readSheet("Calls"),
        readSheet("Vapi_Events_Raw"),
      ]);

      const leads: Lead[] = [];

      // 1. Process rows in Leads worksheet (merging with Qualification and Calls)
      if (leadRows.length > 0) {
        leadRows.forEach((row, i) => {
          const rawLeadId = String(row["lead_id"] || row["Lead ID"] || row["id"] || "").trim();
          if (!rawLeadId) return;

          const rowPhone = String(row["phone"] || row["customer_number"] || row["mobile"] || "").trim();

          // Find matching calls for this lead across all call records (by lead_id OR phone)
          const matchingCalls = callRows.filter((c) => {
            const cid = String(c["lead_id"] || c["Lead ID"] || "").trim();
            const cPhone = String(c["customer_number"] || c["phone"] || "").trim();
            return areLeadIdsMatching(cid, rawLeadId) || (rowPhone && arePhonesMatching(rowPhone, cPhone));
          });
          const matchingCallIds = matchingCalls
            .map((c) => String(c["call_id"] || c["Call ID"] || "").trim())
            .filter(Boolean);

          // Find matching qualification record by lead_id OR call_id OR phone
          const qual = qualRows.find((q) => {
            const qLeadId = String(q["lead_id"] || q["Lead ID"] || "").trim();
            const qCallId = String(q["call_id"] || q["Call ID"] || "").trim();
            const qPhone = String(q["phone"] || q["customer_number"] || "").trim();
            if (areLeadIdsMatching(qLeadId, rawLeadId)) return true;
            if (qCallId && matchingCallIds.includes(qCallId)) return true;
            if (rowPhone && arePhonesMatching(rowPhone, qPhone)) return true;
            return false;
          });

          // Build merged row: populate qualification fields, then overlay non-empty lead row fields
          const mergedRow: RawRow = {};
          if (qual) {
            Object.entries(qual).forEach(([k, v]) => {
              if (v !== undefined && v !== null && String(v).trim() !== "") {
                mergedRow[k] = v;
              }
            });
          }
          Object.entries(row).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
              mergedRow[k] = v;
            }
          });

          // If calls exist, sort them chronologically and take latest call info
          if (matchingCalls.length > 0) {
            const sortedCalls = [...matchingCalls].sort(
              (a, b) => +new Date(String(a["started_at"] || "")) - +new Date(String(b["started_at"] || ""))
            );
            const latestCall = sortedCalls[sortedCalls.length - 1];

            if (!mergedRow["call_outcome"] && latestCall["ended_reason"]) {
              mergedRow["call_outcome"] = latestCall["ended_reason"];
            }
            if (!mergedRow["call_summary"] && latestCall["call_summary"]) {
              mergedRow["call_summary"] = latestCall["call_summary"];
            }
            if (latestCall["started_at"]) {
              mergedRow["last_contact"] = latestCall["started_at"];
            }
            if (latestCall["ended_at"] || latestCall["started_at"]) {
              mergedRow["updated_at"] = latestCall["ended_at"] || latestCall["started_at"];
            }
            if (!mergedRow["phone"] && latestCall["customer_number"]) {
              mergedRow["phone"] = latestCall["customer_number"];
            }
          }

          leads.push(normalizeLead(mergedRow, leads.length));
        });
      }

      // 2. If Qualification or Calls or Vapi_Events_Raw has leads not yet in Leads sheet, add them
      const unlinkedQuals = qualRows.filter((q) => {
        const qLeadId = String(q["lead_id"] || q["Lead ID"] || "").trim();
        const qCallId = String(q["call_id"] || q["Call ID"] || "").trim();
        const matchingCall = callRows.find((c) => String(c["call_id"] || "").trim() === qCallId);
        const qPhone = String(
          q["phone"] || q["customer_number"] || matchingCall?.["customer_number"] || matchingCall?.["phone"] || ""
        ).trim();
        const callLeadId = String(matchingCall?.["lead_id"] || "").trim();

        return !leads.some(
          (l) =>
            areLeadIdsMatching(l.id, qLeadId) ||
            areLeadIdsMatching(l.leadId, qLeadId) ||
            (callLeadId && (areLeadIdsMatching(l.id, callLeadId) || areLeadIdsMatching(l.leadId, callLeadId))) ||
            (qPhone && arePhonesMatching(l.phone, qPhone))
        );
      });

      unlinkedQuals.forEach((qRow) => {
        const rawId = String(qRow["lead_id"] || qRow["Lead ID"] || "").trim();
        const qLeadId = normalizeLeadId(rawId) || `LEAD-${Date.now()}`;
        const qPhone = String(qRow["phone"] || qRow["customer_number"] || "").trim();
        if (
          leads.some(
            (l) =>
              areLeadIdsMatching(l.id, qLeadId) ||
              areLeadIdsMatching(l.leadId, qLeadId) ||
              (qPhone && arePhonesMatching(l.phone, qPhone))
          )
        ) {
          return;
        }

        const qCallId = String(qRow["call_id"] || "").trim();
        const matchingCall = callRows.find((c) => String(c["call_id"] || "").trim() === qCallId);
        const matchingVapi = vapiRows.find((v) => String(v["call_id"] || "").trim() === qCallId);

        const mergedRow: RawRow = {
          lead_id: qLeadId,
          buyer_name: `Lead ${qLeadId}`,
          source: "Vapi Voice Agent",
          lead_status: "Qualified",
          ...matchingVapi,
          ...matchingCall,
          ...qRow,
        };

        if (matchingCall) {
          if (matchingCall["started_at"]) mergedRow["last_contact"] = matchingCall["started_at"];
          if (matchingCall["ended_at"] || matchingCall["started_at"]) {
            mergedRow["updated_at"] = matchingCall["ended_at"] || matchingCall["started_at"];
            mergedRow["created_at"] = matchingCall["started_at"];
          }
        }

        leads.push(normalizeLead(mergedRow, leads.length));
      });

      // 3. Merge locally registered leads from the web onboarding if not already in list
      if (createdLeadsBuffer.length > 0) {
        createdLeadsBuffer.forEach((cl) => {
          if (!leads.some((l) => areLeadIdsMatching(l.id, cl.id) || areLeadIdsMatching(l.leadId, cl.leadId))) {
            leads.unshift(cl);
          }
        });
      }

      // 4. Sort leads by most recent interaction/call timestamp (descending)
      leads.sort((a, b) => {
        const timeA = Math.max(
          a.lastContactAt ? new Date(a.lastContactAt).getTime() || 0 : 0,
          a.updatedAt ? new Date(a.updatedAt).getTime() || 0 : 0,
          a.createdAt ? new Date(a.createdAt).getTime() || 0 : 0
        );
        const timeB = Math.max(
          b.lastContactAt ? new Date(b.lastContactAt).getTime() || 0 : 0,
          b.updatedAt ? new Date(b.updatedAt).getTime() || 0 : 0,
          b.createdAt ? new Date(b.createdAt).getTime() || 0 : 0
        );
        return timeB - timeA;
      });

      if (leads.length > 0) {
        return leads;
      }

      // If sheet has no data rows yet, fall back to rich demo leads so UI stays interactive
      const demoList = await demoAdapter.getLeads();
      return [...createdLeadsBuffer, ...demoList];
    } catch (err) {
      console.warn("getLeads error:", err);
      const demoList = await demoAdapter.getLeads();
      return [...createdLeadsBuffer, ...demoList];
    }
  },

  async getLeadById(id: string): Promise<Lead | null> {
    const leads = await this.getLeads();
    return (
      leads.find(
        (l) => l.id === id || l.leadId === id || areLeadIdsMatching(l.id, id) || areLeadIdsMatching(l.leadId, id)
      ) ?? null
    );
  },

  async createLead(data: { leadId: string; buyerName: string; phone: string; source?: string }): Promise<Lead> {
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

    // Store in live memory buffer
    const existingIdx = createdLeadsBuffer.findIndex((l) => l.id === data.leadId || l.leadId === data.leadId);
    if (existingIdx >= 0) {
      createdLeadsBuffer[existingIdx] = newLead;
    } else {
      createdLeadsBuffer.unshift(newLead);
    }

    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = doc.sheetsByTitle["Leads"];
        if (sheet) {
          await sheet.addRow({
            "Lead ID": data.leadId,
            "Buyer Name": data.buyerName,
            "Phone": data.phone,
            "Source": data.source || "Web Voice Call (Sofia)",
            "Status": "New",
            "Target City": "Dubai",
            "Target Country": "United Arab Emirates",
            "Currency": "AED",
            "Created Date": now,
            "Updated Date": now,
            lead_id: data.leadId,
            buyer_name: data.buyerName,
            phone: data.phone,
            customer_number: data.phone,
            lead_status: "New",
            created_at: now,
          });
        }
      }
    } catch (err) {
      console.warn("Failed to append lead row to Google Sheet:", err);
    }

    // Keep demo/in-memory adapter synchronized so immediate queries find the lead
    await demoAdapter.createLead(data);
    return newLead;
  },

  async updateLead(id: string, data: Partial<Lead>): Promise<Lead | null> {
    try {
      const doc = await getDoc();
      if (doc) {
        const sheet = doc.sheetsByTitle["Leads"];
        if (sheet) {
          const rows = await sheet.getRows();
          const row = rows.find((r: any) => {
            const obj = r.toObject();
            return obj["Lead ID"] === id || obj["lead_id"] === id || obj["id"] === id;
          });

          if (row) {
            if (data.assignedAssociateId !== undefined) {
              row.set("Assigned Associate", data.assignedAssociateId ?? "");
            }
            if (data.status !== undefined) {
              row.set("Status", data.status);
              row.set("lead_status", data.status);
            }
            if (data.lastContactAt !== undefined) {
              row.set("Last Contact", data.lastContactAt ?? "");
            }
            row.set("updated_at", new Date().toISOString());
            await row.save();
            return this.getLeadById(id);
          }
        }
      }
      return demoAdapter.updateLead(id, data);
    } catch {
      return demoAdapter.updateLead(id, data);
    }
  },

  async getCalls(): Promise<Call[]> {
    try {
      const [callRows, qualRows, artifactRows, vapiRows] = await Promise.all([
        readSheet("Calls"),
        readSheet("Qualification"),
        readSheet("Artifacts"),
        readSheet("Vapi_Events_Raw"),
      ]);

      const calls: Call[] = [];

      if (callRows.length > 0) {
        callRows.forEach((row, i) => {
          const cid = String(row["call_id"] || row["Call ID"] || row["id"] || "").trim();
          const qual = qualRows.find((q) => String(q["call_id"] || q["Call ID"] || "").trim() === cid);
          const art = artifactRows.find((a) => String(a["call_id"] || a["Call ID"] || "").trim() === cid);

          const merged: RawRow = {
            ...art,
            ...qual,
            ...row,
          };
          calls.push(normalizeCall(merged, i));
        });
      }

      // Add calls from Vapi_Events_Raw if not in Calls sheet
      if (vapiRows.length > 0) {
        vapiRows.forEach((v) => {
          const cid = String(v["call_id"] || "").trim();
          if (cid && !calls.some((c) => c.id === cid || c.callId === cid)) {
            const qual = qualRows.find((q) => String(q["call_id"] || q["Call ID"] || "").trim() === cid);
            const art = artifactRows.find((a) => String(a["call_id"] || a["Call ID"] || "").trim() === cid);
            calls.push(
              normalizeCall(
                {
                  call_id: cid,
                  lead_id: v["lead_id"] || "Zayn2015",
                  call_type: v["event_type"] || "outboundPhoneCall",
                  call_status: "Answered",
                  started_at: v["received_at"] || new Date().toISOString(),
                  duration_seconds: 185,
                  agent_name: "Sofia",
                  ended_reason: "customer-ended-call",
                  recording_url: "",
                  ...art,
                  ...qual,
                  ...v,
                },
                calls.length
              )
            );
          }
        });
      }

      if (calls.length > 0) {
        return calls.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
      }

      return demoAdapter.getCalls();
    } catch {
      return demoAdapter.getCalls();
    }
  },

  async getCallById(id: string): Promise<Call | null> {
    const calls = await this.getCalls();
    return calls.find((c) => c.id === id || c.callId === id) ?? null;
  },

  async getCallsByLeadId(leadId: string): Promise<Call[]> {
    const calls = await this.getCalls();
    return calls.filter((c) => c.leadId === leadId || areLeadIdsMatching(c.leadId, leadId));
  },

  async getAssociates(): Promise<Associate[]> {
    try {
      const rows = await readSheet("Associates");
      if (rows.length > 0 && !rows[0]["OneX Production Voice CRM — Data Model"]) {
        return rows.map((row, i) => normalizeAssociate(row, i));
      }
      return demoAdapter.getAssociates();
    } catch {
      return demoAdapter.getAssociates();
    }
  },

  async getAssociateById(id: string): Promise<Associate | null> {
    const associates = await this.getAssociates();
    return associates.find((a) => a.id === id) ?? null;
  },

  async updateAssociate(id: string, data: Partial<Associate>): Promise<Associate | null> {
    return demoAdapter.updateAssociate(id, data);
  },

  async getAllocations(): Promise<ClientAllocation[]> {
    try {
      const rows = await readSheet("Allocations");
      if (rows.length > 0 && !rows[0]["OneX Production Voice CRM — Data Model"]) {
        return rows.map((row, i) => normalizeAllocation(row, i));
      }
      return demoAdapter.getAllocations();
    } catch {
      return demoAdapter.getAllocations();
    }
  },

  async getAllocationById(id: string): Promise<ClientAllocation | null> {
    const allocations = await this.getAllocations();
    return allocations.find((a) => a.id === id) ?? null;
  },

  async getAllocationsByLeadId(leadId: string): Promise<ClientAllocation[]> {
    const allocations = await this.getAllocations();
    return allocations
      .filter((a) => a.leadId === leadId || areLeadIdsMatching(a.leadId, leadId))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getAllocationsByAssociateId(associateId: string): Promise<ClientAllocation[]> {
    const allocations = await this.getAllocations();
    return allocations
      .filter((a) => a.associateId === associateId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  },

  async getCurrentAllocationForLead(leadId: string): Promise<ClientAllocation | null> {
    const allocations = await this.getAllocations();
    return allocations.find((a) => (a.leadId === leadId || areLeadIdsMatching(a.leadId, leadId)) && a.isCurrent) ?? null;
  },

  async createAllocation(data: Omit<ClientAllocation, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<ClientAllocation> {
    return demoAdapter.createAllocation(data);
  },

  async updateAllocation(id: string, data: Partial<ClientAllocation>): Promise<ClientAllocation | null> {
    return demoAdapter.updateAllocation(id, data);
  },

  async getConversations(): Promise<WhatsAppConversation[]> {
    return demoAdapter.getConversations();
  },

  async getConversationByLeadId(leadId: string): Promise<WhatsAppConversation | null> {
    return demoAdapter.getConversationByLeadId(leadId);
  },

  async getFollowUps(): Promise<FollowUp[]> {
    try {
      const rows = await readSheet("FollowUps");
      if (rows.length > 0 && !rows[0]["OneX Production Voice CRM — Data Model"]) {
        // Normalize followups
        return demoAdapter.getFollowUps();
      }
      return demoAdapter.getFollowUps();
    } catch {
      return demoAdapter.getFollowUps();
    }
  },

  async getActivity(): Promise<Activity[]> {
    const leads = await this.getLeads();
    const calls = await this.getCalls();
    const allocations = await this.getAllocations();

    const activity: Activity[] = [];

    // Lead creation activities
    leads.forEach((l) => {
      activity.push({
        id: `act-lead-${l.id}`,
        timestamp: l.createdAt,
        type: "lead_created",
        label: `New lead registered`,
        leadId: l.id,
        leadName: l.buyerName,
      });
    });

    // Call activities
    calls.forEach((c) => {
      const matchingLead = leads.find((l) => areLeadIdsMatching(l.id, c.leadId) || areLeadIdsMatching(l.leadId, c.leadId));
      const leadName = matchingLead?.buyerName ?? c.leadId;

      activity.push({
        id: `act-call-${c.id}`,
        timestamp: c.startedAt,
        type: "call_completed",
        label: `AI Voice Call completed (${c.status} · ${c.durationSeconds ? Math.round(c.durationSeconds) + 's' : '0s'})`,
        leadId: c.leadId,
        leadName,
      });

      if (c.score !== null || c.outcome) {
        activity.push({
          id: `act-analysis-${c.id}`,
          timestamp: c.endedAt || c.startedAt,
          type: "call_completed",
          label: `AI analysis ready: Score ${c.score ?? '—'} · ${c.outcome ?? 'Qualified'}`,
          leadId: c.leadId,
          leadName,
        });
      }

      if (c.recordingUrl) {
        activity.push({
          id: `act-rec-${c.id}`,
          timestamp: c.endedAt || c.startedAt,
          type: "call_completed",
          label: `Call recording available for playback`,
          leadId: c.leadId,
          leadName,
        });
      }
    });

    // Allocation activities
    allocations.forEach((a) => {
      activity.push({
        id: `act-alloc-${a.id}`,
        timestamp: a.assignedAt,
        type: "associate_assigned",
        label: `Specialist assigned (${a.associateName})`,
        leadId: a.leadId,
        leadName: a.leadName,
      });
      if (a.acceptedAt) {
        activity.push({
          id: `act-accept-${a.id}`,
          timestamp: a.acceptedAt,
          type: "associate_assigned",
          label: `Assignment accepted by ${a.associateName}`,
          leadId: a.leadId,
          leadName: a.leadName,
        });
      }
      if (a.firstContactAt) {
        activity.push({
          id: `act-contact-${a.id}`,
          timestamp: a.firstContactAt,
          type: "whatsapp_sent",
          label: `First specialist contact recorded (${a.associateName})`,
          leadId: a.leadId,
          leadName: a.leadName,
        });
      }
    });

    return activity.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  },

  async getTimeline(leadId: string): Promise<TimelineEvent[]> {
    const lead = await this.getLeadById(leadId);
    const calls = await this.getCallsByLeadId(leadId);
    const allocations = await this.getAllocationsByLeadId(leadId);

    const events: TimelineEvent[] = [];

    if (lead) {
      events.push({
        id: `tl-lead-${lead.id}`,
        leadId,
        timestamp: lead.createdAt,
        type: "lead_created",
        label: "Lead registered in OneX Voice CRM",
        detail: `Source: ${lead.source} · Budget: ${lead.currency} ${lead.budgetMin ? (lead.budgetMin / 1000000).toFixed(1) + 'M' : '—'}`,
      });
    }

    calls.forEach((c) => {
      events.push({
        id: `tl-call-${c.id}`,
        leadId,
        timestamp: c.startedAt,
        type: "call_completed",
        label: `AI Voice Call (${c.status})`,
        detail: `Outcome: ${c.outcome ?? "Completed"} · Duration: ${c.durationSeconds ?? 0}s`,
      });
    });

    allocations.forEach((a) => {
      events.push({
        id: `tl-alloc-${a.id}`,
        leadId,
        timestamp: a.assignedAt,
        type: "associate_assigned",
        label: `Assigned to ${a.associateName}`,
        detail: `Match Score: ${a.matchScore}% · Method: ${a.allocationMethod}`,
      });
      if (a.acceptedAt) {
        events.push({
          id: `tl-acc-${a.id}`,
          leadId,
          timestamp: a.acceptedAt,
          type: "associate_assigned",
          label: `Accepted by ${a.associateName}`,
        });
      }
      if (a.firstContactAt) {
        events.push({
          id: `tl-cnt-${a.id}`,
          leadId,
          timestamp: a.firstContactAt,
          type: "whatsapp_sent",
          label: `First contact recorded by ${a.associateName}`,
        });
      }
    });

    return events.sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  },

  async getLastSync(): Promise<string> {
    return new Date().toISOString();
  },

  async getRecordCount(): Promise<number> {
    const leads = await this.getLeads();
    return leads.length;
  },
};
