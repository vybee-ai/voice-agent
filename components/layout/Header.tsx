"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu, RefreshCw } from "lucide-react";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Dubai",
      })
    );
  }, []);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
      setLastUpdated(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Dubai",
        })
      );
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-900/10 bg-sand-50/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="focus-ring rounded-md p-1.5 text-ink-800 hover:bg-ink-900/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="hidden text-sm text-ink-700/70 sm:block">
          Last updated:{" "}
          <span suppressHydrationWarning className="font-medium text-ink-900">
            {lastUpdated || "—"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="focus-ring flex items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-card transition hover:border-gold-400/60 disabled:opacity-60"
        >
          <RefreshCw size={15} className={isPending ? "animate-spin" : ""} />
          Refresh
        </button>
        <div className="flex items-center gap-2 rounded-full border border-ink-900/10 bg-white py-1 pl-1 pr-3 shadow-card">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-gold-400">
            A
          </div>
          <span className="text-sm font-medium text-ink-900">Admin</span>
        </div>
      </div>
    </header>
  );
}
