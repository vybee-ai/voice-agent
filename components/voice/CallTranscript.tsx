"use client";

import { useEffect, useRef } from "react";
import type { TranscriptMessage } from "./SofiaWebCall";

interface Props {
  messages: TranscriptMessage[];
}

export default function CallTranscript({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="sofia-transcript" role="log" aria-label="Live conversation transcript" aria-live="polite">
      <div className="sofia-transcript-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`sofia-transcript-row sofia-transcript-${msg.role}`}
          >
            <div className="sofia-transcript-speaker">
              {msg.role === "assistant" ? "Sofia" : "You"}
            </div>
            <div className="sofia-transcript-bubble">
              <p className={msg.isFinal ? "" : "sofia-transcript-partial"}>
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
