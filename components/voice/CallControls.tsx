"use client";

import { PhoneOff, RefreshCw } from "lucide-react";
import type { CallState } from "./SofiaWebCall";

interface Props {
  state: CallState;
  onEnd: () => void;
  onReset: () => void;
}

export default function CallControls({ state, onEnd, onReset }: Props) {
  const isActive = state === "CONNECTED" || state === "LISTENING" || state === "SPEAKING";
  const isEnding = state === "ENDING";
  const isCompleted = state === "COMPLETED";

  if (isCompleted) {
    return (
      <div className="sofia-controls">
        <button
          id="sofia-restart-btn"
          className="sofia-btn sofia-btn-outline"
          onClick={onReset}
          aria-label="Start another conversation with Sofia"
        >
          <RefreshCw size={16} strokeWidth={2} />
          Start Another Conversation
        </button>
      </div>
    );
  }

  if (isActive || isEnding) {
    return (
      <div className="sofia-controls">
        <button
          id="sofia-end-btn"
          className="sofia-btn sofia-btn-end"
          onClick={onEnd}
          disabled={isEnding}
          aria-label="End the conversation with Sofia"
        >
          <PhoneOff size={18} strokeWidth={2} />
          {isEnding ? "Ending…" : "End Conversation"}
        </button>
      </div>
    );
  }

  return null;
}
