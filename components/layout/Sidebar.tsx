"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  MessageCircle,
  CalendarClock,
  BarChart3,
  UserRound,
  UserCheck,
  Settings,
  Building2,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/allocations", label: "Allocations", icon: UserCheck },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/associates", label: "Associates", icon: UserRound },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-ink-950 text-sand-100">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-ink-950">
          <Building2 size={18} strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display text-lg leading-none tracking-wide text-white">OneX</div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-sand-200/50">Lead Management</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-ink-800 text-white shadow-inner"
                  : "text-sand-200/70 hover:bg-ink-900 hover:text-sand-100"
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.4 : 2} className={active ? "text-gold-400" : ""} />
              <span>{item.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={clsx(
            "focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            pathname?.startsWith("/settings")
              ? "bg-ink-800 text-white"
              : "text-sand-200/70 hover:bg-ink-900 hover:text-sand-100"
          )}
        >
          <Settings size={17} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}
