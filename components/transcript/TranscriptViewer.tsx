"use client";

import { useMemo, useState } from "react";
import { Search, Copy, Check } from "lucide-react";
import clsx from "clsx";
import type { TranscriptLine } from "@/lib/types";

export default function TranscriptViewer({ transcript }: { transcript: TranscriptLine[] | null }) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!transcript) return [];
    if (!query) return transcript;
    return transcript.filter((line) => line.text.toLowerCase().includes(query.toLowerCase()));
  }, [transcript, query]);

  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-ink-900/15 bg-sand-50 py-10 text-sm text-ink-700/50">
        Transcript unavailable
      </div>
    );
  }

  function handleCopy() {
    if (!transcript) return;
    const text = transcript.map((l) => `${l.speaker}: ${l.text}`).join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-ink-900/10 p-3">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-700/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript..."
            className="focus-ring w-full rounded-md border border-ink-900/15 bg-sand-50 py-1.5 pl-8 pr-2 text-sm"
          />
        </div>
        <button
          onClick={handleCopy}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-ink-900/15 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-gold-400/60"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
        {filtered.length === 0 && <p className="text-sm text-ink-700/50">No matching lines.</p>}
        {filtered.map((line, i) => {
          const isAgent = line.role === "AI Agent";
          return (
            <div key={i} className={clsx("flex flex-col gap-0.5", isAgent ? "items-start" : "items-end")}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-700/45">
                {!isAgent && line.timestamp && <span>{line.timestamp}</span>}
                <span>{line.speaker}</span>
                {isAgent && line.timestamp && <span>{line.timestamp}</span>}
              </div>
              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                  isAgent ? "bg-ink-950 text-white rounded-tl-sm" : "bg-gold-400/15 text-ink-900 rounded-tr-sm"
                )}
              >
                {line.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
