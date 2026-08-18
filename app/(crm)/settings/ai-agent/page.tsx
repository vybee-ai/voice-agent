import { settingsService } from "@/services/settingsService";
import { SettingsRow } from "@/components/settings/SettingsField";

export default async function AiAgentSettingsPage() {
  const settings = await settingsService.getSettings();
  return (
    <div className="max-w-xl rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
      <h2 className="font-display text-lg text-ink-950">AI Agent</h2>
      <div className="mt-3">
        <SettingsRow label="Agent Name" value={settings.aiAgent.name} />
        <SettingsRow label="Role" value={settings.aiAgent.role} />
        <SettingsRow label="Qualification Threshold" value={`${settings.aiAgent.qualificationThreshold} / 100`} />
      </div>
      <p className="mt-4 text-xs text-ink-700/50">
        Leads scoring at or above the threshold are surfaced as qualified across the dashboard and analytics.
      </p>
    </div>
  );
}
