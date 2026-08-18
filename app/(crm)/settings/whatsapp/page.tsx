import { settingsService } from "@/services/settingsService";
import { ConnectionDot, SettingsRow } from "@/components/settings/SettingsField";

export default async function WhatsAppSettingsPage() {
  const settings = await settingsService.getSettings();
  return (
    <div className="max-w-xl rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink-950">WhatsApp Business</h2>
        <ConnectionDot connected={settings.integrations.whatsapp.connected} />
      </div>
      <div className="mt-3">
        <SettingsRow label="Provider" value={settings.whatsapp.provider} />
        <SettingsRow label="Number" value={settings.whatsapp.number ?? "Not configured"} />
      </div>
      <div className="mt-4 flex gap-2">
        <button className="focus-ring rounded-lg bg-ink-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-900">Send Test Message</button>
        <button className="focus-ring rounded-lg border border-ink-900/15 px-3 py-1.5 text-sm font-medium text-ink-800 hover:border-gold-400/60">Test Connection</button>
      </div>
      <p className="mt-4 text-xs text-ink-700/50">
        Provider credentials (Twilio auth token or Meta Cloud API token) are set via environment variables and never stored in the frontend — see .env.example.
      </p>
    </div>
  );
}
