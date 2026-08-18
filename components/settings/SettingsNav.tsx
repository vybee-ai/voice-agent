"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/settings", label: "Company" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/whatsapp", label: "WhatsApp" },
  { href: "/settings/voice", label: "Voice" },
  { href: "/settings/ai-agent", label: "AI Agent" },
  { href: "/settings/team", label: "Team" },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg border border-ink-900/10 bg-white p-1 shadow-card">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "focus-ring shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition",
              active ? "bg-ink-950 text-white" : "text-ink-700/65 hover:bg-sand-50"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
