import { getAdapter } from "./dataSource";
import type { Call } from "@/lib/types";

export const callsService = {
  async getAll(): Promise<Call[]> {
    return getAdapter().getCalls();
  },
  async getById(id: string): Promise<Call | null> {
    return getAdapter().getCallById(id);
  },
  async getByLeadId(leadId: string): Promise<Call[]> {
    const calls = await getAdapter().getCallsByLeadId(leadId);
    return calls.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
  },
};
