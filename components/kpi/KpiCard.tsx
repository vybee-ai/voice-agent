import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  accent?: "default" | "hot" | "gold" | "cold";
}) {
  const accentStyles: Record<string, string> = {
    default: "bg-ink-900/5 text-ink-800",
    hot: "bg-hot/10 text-hot",
    gold: "bg-gold-400/15 text-gold-600",
    cold: "bg-cold/10 text-cold",
  };

  const content = (
    <div className="group flex items-center justify-between rounded-xl border border-ink-900/10 bg-white p-4 shadow-card transition hover:border-gold-400/40 hover:shadow-panel">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-700/55">{label}</p>
        <p className="mt-1.5 font-display text-2xl text-ink-950">{value}</p>
      </div>
      <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", accentStyles[accent])}>
        <Icon size={19} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-ring block rounded-xl">
        {content}
      </Link>
    );
  }
  return content;
}
