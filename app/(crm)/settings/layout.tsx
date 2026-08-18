import SettingsNav from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink-950">Settings</h1>
        <p className="mt-1 text-sm text-ink-700/65">Configure your company details and connected integrations.</p>
      </div>
      <SettingsNav />
      {children}
    </div>
  );
}
