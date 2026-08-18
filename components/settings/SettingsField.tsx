export function SettingsRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-900/8 py-3 last:border-0">
      <span className="text-sm text-ink-700/65">{label}</span>
      <span className="text-sm font-medium text-ink-950">{value}</span>
    </div>
  );
}

export function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      <span className={connected ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-ink-700/30"} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
