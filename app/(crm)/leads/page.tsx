import { Suspense } from "react";
import { leadsService } from "@/services/leadsService";
import { associatesService } from "@/services/associatesService";
import LeadsExplorer from "@/components/leads/LeadsExplorer";
import { LoadingState } from "@/components/common/States";

export default async function LeadsPage() {
  const [leads, associates] = await Promise.all([leadsService.getAll(), associatesService.getAll()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Leads</h1>
        <p className="mt-1 text-sm text-ink-700/65">Search, filter, and manage every lead in the pipeline.</p>
      </div>
      <Suspense fallback={<LoadingState label="Loading leads..." />}>
        <LeadsExplorer leads={leads} associates={associates} />
      </Suspense>
    </div>
  );
}
