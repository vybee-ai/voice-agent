import Link from "next/link";
import { leadsService } from "@/services/leadsService";
import { associatesService } from "@/services/associatesService";
import { allocationsService } from "@/services/allocationsService";
import AllocationsQueue from "@/components/allocation/AllocationsQueue";

export default async function AllocationsPage() {
  const [leads, associates, allocations] = await Promise.all([
    leadsService.getAll(),
    associatesService.getAll(),
    allocationsService.getAll(),
  ]);

  const unassignedQualified = leads.filter(
    (l) => (l.status === "Qualified" || l.temperature === "HOT" || l.temperature === "WARM") && !l.assignedAssociateId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Client Allocations & Triage</h1>
        <p className="mt-1 text-sm text-ink-700/65">
          AI-driven lead matching, automated routing, specialist acceptance tracking, and SLA management.
        </p>
      </div>

      <AllocationsQueue
        unassignedLeads={unassignedQualified}
        allLeads={leads}
        associates={associates}
        allocations={allocations}
      />
    </div>
  );
}
