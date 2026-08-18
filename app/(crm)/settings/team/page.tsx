import { associatesService } from "@/services/associatesService";

export default async function TeamSettingsPage() {
  const associates = await associatesService.getAll();
  return (
    <div className="max-w-2xl rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
      <h2 className="font-display text-lg text-ink-950">Team</h2>
      <div className="mt-3 divide-y divide-ink-900/8">
        {associates.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-ink-950">{a.name}</p>
              <p className="text-xs text-ink-700/55">{a.role}</p>
            </div>
            <span className="text-xs font-medium text-ink-700/65">{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
