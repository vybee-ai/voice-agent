export function InfoField({ label, value }: { label: string; value: string | null | undefined | number }) {
  const display = value === null || value === undefined || value === "" ? "Not provided" : value;
  const isMissing = display === "Not provided";
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-700/45">{label}</p>
      <p className={isMissing ? "mt-0.5 text-sm italic text-ink-700/40" : "mt-0.5 text-sm text-ink-900"}>{display}</p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-5 shadow-card">
      <h3 className="font-display text-base text-ink-950">{title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}
