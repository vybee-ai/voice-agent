"use client";

import { Loader2 } from "lucide-react";
import type { CallState } from "./SofiaWebCall";

interface Props {
  state: CallState;
  elapsedSeconds: number;
  volumeLevel: number; // 0-1 float from Vapi volume-level event
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getStateLabel(state: CallState) {
  switch (state) {
    case "CONNECTING": return "Connecting to Sofia…";
    case "CONNECTED":  return "Connected";
    case "LISTENING":  return "Listening…";
    case "SPEAKING":   return "Sofia is speaking";
    case "ENDING":     return "Ending conversation…";
    case "COMPLETED":  return "Conversation Completed";
    default:           return "";
  }
}

export default function CallStatus({ state, elapsedSeconds, volumeLevel }: Props) {
  const isActive = state === "CONNECTED" || state === "LISTENING" || state === "SPEAKING";
  const isConnecting = state === "CONNECTING" || state === "ENDING";
  const isCompleted = state === "COMPLETED";

  // Volume drives orb scale: 1.0 at rest → 1.35 at max volume
  const orbScale = 1 + volumeLevel * 0.35;
  // Glow intensity increases with volume
  const glowOpacity = 0.3 + volumeLevel * 0.7;

  return (
    <div className="sofia-status-content">
      {/* Orb */}
      <div
        className="sofia-status-orb-wrapper"
        style={{
          transform: `scale(${orbScale})`,
          transition: "transform 0.1s ease-out",
        }}
        aria-hidden="true"
      >
        <div
          className={[
            "sofia-status-orb",
            isConnecting ? "sofia-orb-pulse" : "",
            state === "SPEAKING" ? "sofia-orb-speaking" : "",
            isCompleted ? "sofia-orb-completed" : "",
          ].join(" ")}
        >
          {/* Outer glow ring */}
          <div
            className="sofia-orb-glow"
            style={{ opacity: glowOpacity }}
            aria-hidden="true"
          />
          {/* Inner rings */}
          <div className={`sofia-orb-ring sofia-orb-ring-1 ${state === "SPEAKING" ? "sofia-ring-active" : ""}`} />
          <div className={`sofia-orb-ring sofia-orb-ring-2 ${state === "SPEAKING" ? "sofia-ring-active" : ""}`} />

          {/* Core icon */}
          <div className="sofia-orb-core">
            {isConnecting ? (
              <Loader2 size={32} strokeWidth={1.5} className="animate-spin" />
            ) : isCompleted ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Sofia name + state */}
      <div className="sofia-status-text">
        <h1 className="sofia-hero-name">Sofia</h1>
        <p className="sofia-hero-subtitle">AI Property Consultant</p>

        {/* Live indicator */}
        {isActive && (
          <div className="sofia-live-indicator">
            <span className="sofia-live-dot" aria-hidden="true" />
            <span className="sofia-live-label">{getStateLabel(state)}</span>
          </div>
        )}

        {isConnecting && <p className="sofia-connecting-label">{getStateLabel(state)}</p>}
        {isCompleted && <p className="sofia-completed-label">{getStateLabel(state)}</p>}

        {/* Duration timer */}
        {isActive && (
          <div className="sofia-timer" aria-live="polite" aria-label={`Call duration: ${formatDuration(elapsedSeconds)}`}>
            {formatDuration(elapsedSeconds)}
          </div>
        )}
      </div>

      {/* Completed thank-you */}
      {isCompleted && (
        <div className="sofia-completed-message">
          <p className="font-semibold text-white">Thank you for speaking with Sofia.</p>
          <p className="sofia-completed-sub">
            A OneX property specialist will follow up with you shortly.
          </p>
        </div>
      )}
    </div>
  );
}
