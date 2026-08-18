import { getAdapter } from "./dataSource";
import type { Activity, TimelineEvent } from "@/lib/types";

export const activityService = {
  async getRecent(limit = 10): Promise<Activity[]> {
    const activity = await getAdapter().getActivity();
    return [...activity].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, limit);
  },
  async getTimelineForLead(leadId: string): Promise<TimelineEvent[]> {
    const timeline = await getAdapter().getTimeline(leadId);
    return [...timeline].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  },
};
