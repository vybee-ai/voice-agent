import { getAdapter } from "./dataSource";
import { allocationsService } from "./allocationsService";
import { isLeadQualified } from "@/lib/leadUtils";
import type { AnalyticsData } from "@/lib/types";

export const analyticsService = {
  async getAnalytics(): Promise<AnalyticsData> {
    const leads = await getAdapter().getLeads();
    const calls = await getAdapter().getCalls();
    const followUps = await getAdapter().getFollowUps();
    const allocationStats = await allocationsService.getAllocationStats();

    const totalLeads = leads.length;
    const answered = calls.filter((c) => c.status === "Answered").length;
    const noAnswer = calls.filter((c) => c.status === "No Answer").length;
    const qualified = leads.filter((l) => isLeadQualified(l)).length;
    const hot = leads.filter((l) => l.temperature === "HOT").length;
    const warm = leads.filter((l) => l.temperature === "WARM").length;
    const cold = leads.filter((l) => l.temperature === "COLD").length;
    const followUpCount = followUps.length;

    const durations = calls.map((c) => c.durationSeconds ?? 0).filter((d) => d > 0);
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalLeads,
      answerRate: calls.length ? Math.round((answered / calls.length) * 100) : 0,
      qualificationRate: totalLeads ? Math.round((qualified / totalLeads) * 100) : 0,
      hotLeads: hot,
      warmLeads: warm,
      coldLeads: cold,
      noAnswerRate: calls.length ? Math.round((noAnswer / calls.length) * 100) : 0,
      followUpRate: totalLeads ? Math.round((followUpCount / totalLeads) * 100) : 0,
      avgCallDurationSeconds: Math.round(avgDuration),
      funnel: [
        { stage: "Leads", count: totalLeads },
        { stage: "Calls", count: calls.length },
        { stage: "Answered", count: answered },
        { stage: "Qualified", count: qualified },
        { stage: "Follow-up", count: leads.filter((l) => l.status === "Follow-up").length },
        { stage: "Closed", count: leads.filter((l) => l.status === "Closed").length },
      ],
      allocationStats,
    };
  },
};
