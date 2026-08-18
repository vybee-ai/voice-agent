import { settingsService } from "@/services/settingsService";
import { ConnectionDot, SettingsRow } from "@/components/settings/SettingsField";
import { RefreshCw, Zap } from "lucide-react";

function formatSync(iso: string | null | undefined) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });
}

export default async function IntegrationsPage() {
  const settings = await settingsService.getSettings();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-950">Google Sheets</h2>
          <ConnectionDot connected={settings.integrations.googleSheets.connected} />
        </div>
        <div className="mt-3">
          <SettingsRow label="Spreadsheet" value={settings.integrations.googleSheets.detail ?? "Not configured"} />
          <SettingsRow label="Last Sync" value={formatSync(settings.integrations.googleSheets.lastSync)} />
          <SettingsRow label="Records" value={settings.integrations.googleSheets.recordCount ?? "—"} />
        </div>
        <div className="mt-4 flex gap-2">
          <button className="focus-ring flex items-center gap-1.5 rounded-lg bg-ink-950 px-3 py-1.5 text-sm font-medium text-white hover:bg-ink-900">
            <RefreshCw size={14} /> Refresh Data
          </button>
          <button className="focus-ring flex items-center gap-1.5 rounded-lg border border-ink-900/15 px-3 py-1.5 text-sm font-medium text-ink-800 hover:border-gold-400/60">
            <Zap size={14} /> Test Connection
          </button>
        </div>
        {settings.appMode === "demo" && (
          <p className="mt-3 text-xs text-ink-700/50">
            Running in demo mode — set APP_MODE=live and provide GOOGLE_SHEET_ID / service account credentials to connect the real spreadsheet.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-950">WhatsApp</h2>
          <ConnectionDot connected={settings.integrations.whatsapp.connected} />
        </div>
        <div className="mt-3">
          <SettingsRow label="Provider" value={settings.whatsapp.provider} />
          <SettingsRow label="Number" value={settings.whatsapp.number ?? "Not configured"} />
        </div>
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-950">Voice Provider</h2>
          <ConnectionDot connected={settings.integrations.voice.connected} />
        </div>
        <div className="mt-3">
          <SettingsRow label="Provider" value={settings.voice.provider} />
          <SettingsRow label="Number" value={settings.voice.number ?? "Not configured"} />
          <SettingsRow label="AI Agent" value={settings.voice.agentName} />
        </div>
      </div>
    </div>
  );
}
