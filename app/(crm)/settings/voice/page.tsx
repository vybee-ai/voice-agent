import { settingsService } from "@/services/settingsService";
import { ConnectionDot, SettingsRow } from "@/components/settings/SettingsField";

export default async function VoiceSettingsPage() {
  const settings = await settingsService.getSettings();
  return (
    <div className="max-w-xl rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink-950">Voice Provider</h2>
        <ConnectionDot connected={settings.integrations.voice.connected} />
      </div>
      <div className="mt-3">
        <SettingsRow label="Provider" value={settings.voice.provider} />
        <SettingsRow label="Phone Number" value={settings.voice.number ?? "Not configured"} />
        <SettingsRow label="AI Agent" value={settings.voice.agentName} />
        <SettingsRow label="Recording" value={settings.voice.recordingEnabled ? "Enabled" : "Disabled"} />
        <SettingsRow label="Transcript" value={settings.voice.transcriptEnabled ? "Enabled" : "Disabled"} />
      </div>
      <p className="mt-4 text-xs text-ink-700/50">Additional voice providers can be added alongside this one without changing the UI.</p>
    </div>
  );
}
