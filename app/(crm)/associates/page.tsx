import { associatesService } from "@/services/associatesService";
import { leadsService } from "@/services/leadsService";
import AssociatesExplorer from "@/components/associates/AssociatesExplorer";

export default async function AssociatesPage() {
  const [associates, leads] = await Promise.all([associatesService.getAll(), leadsService.getAll()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Associates</h1>
        <p className="mt-1 text-sm text-ink-700/65">
          Your property specialists, territories, live capacity, and client assignments.
        </p>
      </div>

      <AssociatesExplorer associates={associates} leads={leads} />
    </div>
  );
}
