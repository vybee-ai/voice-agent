import { settingsService } from "@/services/settingsService";
import { SettingsRow } from "@/components/settings/SettingsField";

export default async function SettingsCompanyPage() {
  const settings = await settingsService.getSettings();
  return (
    <div className="max-w-xl rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
      <h2 className="font-display text-lg text-ink-950">Company</h2>
      <div className="mt-3">
        <SettingsRow label="Company Name" value={settings.company.name} />
        <SettingsRow label="Country" value={settings.company.country} />
        <SettingsRow label="Market" value={settings.company.city} />
        <SettingsRow label="Currency" value={settings.company.currency} />
        <SettingsRow label="Timezone" value={settings.company.timezone} />
        <SettingsRow label="Application Mode" value={settings.appMode === "demo" ? "Demo" : "Live"} />
      </div>
      <p className="mt-4 text-xs text-ink-700/50">
        Market defaults come from environment configuration and can be changed without touching the UI — see marketConfig in the codebase.
      </p>
    </div>
  );
}
