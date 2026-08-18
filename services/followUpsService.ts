import { getAdapter } from "./dataSource";
import type { FollowUp, FollowUpStatus } from "@/lib/types";

export const followUpsService = {
  async getAll(): Promise<FollowUp[]> {
    return getAdapter().getFollowUps();
  },
  async getByStatus(status: FollowUpStatus): Promise<FollowUp[]> {
    const all = await this.getAll();
    return all.filter((f) => f.status === status);
  },
};
