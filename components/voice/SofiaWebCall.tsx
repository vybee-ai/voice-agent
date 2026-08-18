"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Vapi from "@vapi-ai/web";
import WebCallLanding from "./WebCallLanding";
import CallStatus from "./CallStatus";
import CallTranscript from "./CallTranscript";
import CallControls from "./CallControls";

// ─── Call state machine ────────────────────────────────────────────────────
export type CallState =
  | "IDLE"
  | "CONNECTING"
  | "CONNECTED"
  | "LISTENING"
  | "SPEAKING"
  | "ENDING"
  | "COMPLETED"
  | "ERROR";

export interface TranscriptMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface Props {
  publicKey: string;
  assistantId: string;
}

export default function SofiaWebCall({ publicKey, assistantId }: Props) {
  // Use a typed ref — Vapi extends EventEmitter so we cast to any where
  // TypeScript's strict overload resolution conflicts with the SDK's generic
  // on() definition layered over EventEmitter's broader signature.
  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [callState, setCallState] = useState<CallState>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ─── Friendly error mapping ──────────────────────────────────────────────
  function toFriendlyError(raw: string): string {
    if (/microphone|permission|NotAllowed/i.test(raw)) {
      return "Microphone access is required to speak with Sofia.";
    }
    if (/network|fetch|timeout/i.test(raw)) {
      return "Please check your connection and try again.";
    }
    if (/browser|MediaDevices/i.test(raw)) {
      return "This browser cannot start a voice conversation. Please try a supported modern browser.";
    }
    return "Unable to connect to Sofia. Please try again.";
  }

  // ─── Initialise Vapi once ────────────────────────────────────────────────
  const initVapiInstance = useCallback(() => {
    if (!publicKey) return null;
    if (vapiRef.current) return vapiRef.current;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    const v = vapi as unknown as {
      on(event: string, listener: (...args: unknown[]) => void): void;
      stop(): void;
    };

    v.on("call-start", () => {
      setCallState("CONNECTED");
      startTimeRef.current = Date.now();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    });

    v.on("call-end", () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCallState("COMPLETED");
      setVolumeLevel(0);
    });

    v.on("speech-start", () => {
      setCallState((prev) =>
        prev === "CONNECTED" || prev === "LISTENING" ? "SPEAKING" : prev
      );
    });

    v.on("speech-end", () => {
      setCallState((prev) => (prev === "SPEAKING" ? "LISTENING" : prev));
    });

    v.on("volume-level", (...args: unknown[]) => {
      const level = args[0] as number;
      setVolumeLevel(typeof level === "number" ? level : 0);
    });

    v.on("message", (...args: unknown[]) => {
      const msg = args[0] as Record<string, unknown>;
      if (!msg || msg.type !== "transcript") return;

      const role = (msg.role as string) === "assistant" ? "assistant" : "user";
      const text = (msg.transcript as string) ?? "";
      const isFinal = (msg.transcriptType as string) === "final";
      const id = `${role}-${msg.timestamp ?? Date.now()}`;

      setTranscript((prev) => {
        const lastIdx = prev.length - 1;
        if (
          lastIdx >= 0 &&
          !prev[lastIdx].isFinal &&
          prev[lastIdx].role === role
        ) {
          const updated = [...prev];
          updated[lastIdx] = { ...updated[lastIdx], text, isFinal };
          return updated;
        }
        return [...prev, { id, role, text, isFinal, timestamp: Date.now() }];
      });
    });

    v.on("error", (...args: unknown[]) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setVolumeLevel(0);

      const err = args[0];
      const raw =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : String(err ?? "Unknown error");

      setErrorMessage(toFriendlyError(raw));
      setCallState("ERROR");
    });

    return vapi;
  }, [publicKey]);

  useEffect(() => {
    initVapiInstance();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [initVapiInstance]);

  const [currentLead, setCurrentLead] = useState<{ leadId: string; buyerName: string; phone: string } | null>(null);

  // ─── Start call ─────────────────────────────────────────────────────────
  const startCall = useCallback(
    async (leadInfo?: { leadId: string; buyerName: string; phone: string }) => {
      if (!assistantId || !publicKey) {
        setErrorMessage("Vapi assistant configuration is missing.");
        setCallState("ERROR");
        return;
      }

      const lead = leadInfo || currentLead;
      if (leadInfo) {
        setCurrentLead(leadInfo);
      }

      // Check browser microphone support
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setErrorMessage(
          "This browser cannot start a voice conversation. Please try a modern browser like Chrome, Safari, or Edge."
        );
        setCallState("ERROR");
        return;
      }

      try {
        setCallState("CONNECTING");
        setErrorMessage(null);
        setTranscript([]);
        setElapsedSeconds(0);
        startTimeRef.current = null;

        // Step 1: Pre-request microphone access inside user gesture
        // This eliminates the race condition where Vapi connects WebRTC before mic permission is granted
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (micErr: any) {
          const msg = micErr?.message || String(micErr);
          setErrorMessage(toFriendlyError(msg));
          setCallState("ERROR");
          return;
        }

        // Step 2: Ensure Vapi instance is ready
        const vapi = initVapiInstance();
        if (!vapi) {
          setErrorMessage("Failed to initialize voice engine.");
          setCallState("ERROR");
          return;
        }

        // Step 3: Start conversation with full buyer variable payload
        await vapi.start(assistantId, {
          variableValues: {
            lead_id: lead?.leadId || "",
            buyer_name: lead?.buyerName || "",
            buyerName: lead?.buyerName || "",
            name: lead?.buyerName || "",
            customer_name: lead?.buyerName || "",
            user_name: lead?.buyerName || "",
            phone: lead?.phone || "",
            customer_number: lead?.phone || "",
            channel: "web",
            source: "web_demo",
          },
        });
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        setErrorMessage(toFriendlyError(raw));
        setCallState("ERROR");
      }
    },
    [assistantId, publicKey, currentLead, initVapiInstance]
  );

  // ─── End call ───────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallState("ENDING");
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  // ─── Reset to IDLE ───────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {
        // ignore
      }
    }
    setCallState("IDLE");
    setErrorMessage(null);
    setTranscript([]);
    setElapsedSeconds(0);
    setVolumeLevel(0);
    startTimeRef.current = null;
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────
  if (callState === "IDLE" || callState === "ERROR") {
    return (
      <WebCallLanding
        onStart={startCall}
        error={callState === "ERROR" ? (errorMessage ?? "An error occurred.") : null}
        onRetry={reset}
        notConfigured={!assistantId || !publicKey}
      />
    );
  }

  return (
    <div className="sofia-active-shell">
      {/* Background orbs */}
      <div className="sofia-bg-orb sofia-bg-orb-1" aria-hidden="true" />
      <div className="sofia-bg-orb sofia-bg-orb-2" aria-hidden="true" />

      {/* Top Header */}
      <header className="sofia-active-header">
        <div className="sofia-brand">
          <div className="sofia-brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="sofia-brand-name">OneX</span>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="sofia-active-main">
        <CallStatus
          state={callState}
          elapsedSeconds={elapsedSeconds}
          volumeLevel={volumeLevel}
        />
        <CallTranscript messages={transcript} />
      </main>

      {/* Footer Controls */}
      <footer className="sofia-active-footer">
        <CallControls state={callState} onEnd={endCall} onReset={reset} />
      </footer>
    </div>
  );
}
